// Migration 140: ما بعد استبدال مفصل الورك الكلّيّ — البروتوكولُ الثاني عشر مفصَّلاً (§4.dz — ٢٠٢٦-١٠-١٣).
//
// المالك (٢٠٢٦-١٠-١٣): «نعم نكمل البروتوكول التالي» — والتالي بالترتيب المكتوب في القسم ٠: ما بعد الاستبدال الكلّيّ للورك (`tha-geriatric`).
// **بالقالب كاملاً** (§4.dd): ١٨ جلسة × ستّ في الأسبوع × ٥٠ دقيقة (ثلاثة أسابيع) وتمديدٌ واحد بستٍّ بمعيارٍ مكتوب، وثلاثُ مراحل بنطاقات
// (١–٦ · ٧–١٢ · ١٣–١٨) ومعايير رقمية: الحمايةُ والمشيُ والاستقلالُ اليوميّ، ثمّ التقويةُ المتدرّجة وتخفيفُ أداة المشي، ثمّ الوظيفةُ والتحمّلُ والعودة؛
// وثلاثَ عشرةَ بطاقةً جديدة (إحدى عشرةَ صورةً مطلوبة، واثنتان منسوختان من بطاقتَي الدرج والسيارة للركبة لأنّهما تُظهران الحركةَ نفسَها) وثماني عشرةَ
// معادة بصورها من ١١٩ و١٢٦ و١٢٩ و١٣٨؛ والأجهزةُ الثلاثة عشر بدرجة دليلها و«استعمال المركز»، والمقاييسُ كما زُرعت (TUG والجلوسُ والوقوف والمشيُ ستّ
// دقائق وHOOS-JR) ومقياسٌ عربيّ للورك والوقوفُ على ساقٍ إضافةً للمشرف؛ وبنودُ «اضغطه يا سليم» الستّة بـ`checklistSql`. كلُّه مسوّدة حتى يعتمده.
//
// **ما يخصّ الورك**: الدليلُ أضعفُ منه في الركبة — لا دليلَ إرشاديّ لـ APTA، وAAOS 2023: العلاجُ الرسميّ أو التمرينُ المنزليّ («ميلٌ طفيف» للرسميّ)،
// وNICE NG157: الذاتيُّ لأكثر المرضى؛ **فالإشرافُ يفيد بما لا يعطيه المريضُ لنفسه** — التقويةُ الثقيلة وتدريبُ المشي والوظيفة. **ولم تختبر تجربةٌ ستَّ
// جلساتٍ في الأسبوع** — فالعددُ ١٨ اختيارُ خدمةٍ مكتوبٌ صريحاً داخل ما نفع (١٢–٣٦ جلسة)، أقلُّ من الركبة لأنّ الورك يتعافى أسرع (Judd 2019).
// **وقيودُ الحركة**: الصارمةُ لم تمنع الخلع (Korfitsen 2023 · Yadav 2026) — فتعليماتُ الجرّاح تحكم، وإن لم تُكتب فأوضاعٌ مركّبة بحسب المدخل ستّةَ أسابيع
// والوقايةُ من السقوط (سببُ ربع الخلوع — Reimert 2022). **والتحفيزُ مساعدٌ بقاعدة المركز** (الدليلُ متضارب) **والمغناطيسُ مساعدٌ** والدليلُ ضعيفٌ جدّاً،
// **والشدُّ والموجاتُ الصادمة والتيكارُ والإبرُ حول الورك «لا يُستخدم» بسببٍ مكتوب.**
// **وما يخصّ العراق**: مدخلُ هاردنج في بغداد، والوزنُ المتنبّئُ الوحيد بنتيجةٍ أسوأ في دراسةٍ عراقية، والمرحاضُ العربيّ، والصلاةُ على الكرسيّ أوّلاً —
// ولا دراسةَ تأهيلٍ عراقية ولا عن الصلاة بعد الاستبدال (بحثٌ صفريّ مكتوب).
//
// المصادرُ واحدٌ وتسعون — كلُّ معرّفٍ منها طوبق آلياً مع سجلّ Europe PMC (ومقياسُ أكسفورد بالعربية مع Crossref لأنّ مجلّتَه غيرُ مفهرسة، والإرشاداتُ بلا معرّف من صفحات
// جهاتها). القواعدُ في `physio_content.ts` كما في ما قبله.
import { checklistSql, exercisesSql, openPlansPhasesSql, protocolContentSql, type ChecklistSeed, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — ثلاثَ عشرة؛ والمعادةُ (زُرعت في ١١٩ و١٢٦ و١٢٩ و١٣٨) تُربط برموزها وصورها، وما يخصّ الورك في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "gluteal-sets", nameAr: "شدّ عضلات الألوية (عضلات المقعدة)", nameEn: "Gluteal sets",
    kind: "strength", region: "hip", sets: 1, reps: 10, hold: 5,
    purpose: ["ألويةُ الورك المعمول تضعف وتتثبّط بعد الجراحة — والمبعِّدةُ أكثرُ ما يبقى ضعيفاً (نقصُ قوّة التبعيد ٢٦٪ بعد شهر — Judd 2014)؛ وشدُّها بلا حركةٍ أوّلُ خطوةٍ آمنة بعد كلّ مدخلٍ جراحيّ، قبل التقوية بالحركة والحمل.",
      "The gluteal muscles of the operated hip weaken and are inhibited after surgery — the abductors stay weakest longest (abduction strength down 26% at one month — Judd 2014); squeezing them without movement is the first safe step after any surgical approach, before strengthening with movement and load."],
    start: ["مستلقٍ على الظهر والساقان ممدودتان ومتباعدتان قليلاً لا تتقاطعان، أو واقفٌ ممسكاً بالمشّاية.",
      "Lying on the back with the legs straight and slightly apart, never crossed, or standing holding the frame."],
    steps: [[
      "اعصر عضلتي المقعدة معاً كأنّك تمسك شيئاً بينهما.",
      "اثبت ٥ ثوانٍ (حتى ١٠ مع الأيّام) وتنفّس طبيعياً.",
      "أرخِ تماماً ٥ ثوانٍ.",
      "كرّر ١٠ مرّات.",
    ], [
      "Squeeze both buttocks together as if holding something between them.",
      "Hold 5 seconds (up to 10 as the days go by) and breathe normally.",
      "Relax completely for 5 seconds.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "حبسُ النفس ⟵ عدٌّ بصوتٍ مسموع.",
      "شدُّ البطن أو رفعُ الظهر بدل الألوية ⟵ الحوضُ والظهرُ ثابتان والشدُّ في المقعدة وحدها.",
      "ضمُّ الركبتين أو تدويرُهما للداخل ⟵ الساقان متباعدتان قليلاً وأصابعُ القدمين للأعلى.",
    ], [
      "Holding the breath → count out loud.",
      "Tightening the abdomen or arching the back instead → pelvis and back still, the squeeze in the buttocks alone.",
      "Pressing the knees together or turning them in → legs slightly apart, toes pointing up.",
    ]],
    easier: ["بلا ثبات — شدٌّ وإرخاءٌ بإيقاعٍ هادئ.", "Without a hold — squeeze and relax at a calm rhythm."],
    harder: ["مع شدّ الفخذ في الوقت نفسِه، أو واقفاً ممسكاً بالمشّاية.", "Together with a thigh squeeze, or standing holding the frame."],
    stopIf: ["ألمٌ حادّ في الورك أو الأربية، أو ألمٌ وتورّمٌ في بطن الساق.", "Sharp pain in the hip or groin, or pain and swelling in the calf."],
    equipment: ["سريرٌ أو فرشة.", "A bed or mat."],
    doseNote: ["١٠ مرّات × ثباتُ ٥–١٠ ثوانٍ، ثلاثَ مرّاتٍ يومياً.", "10 times × a 5–10 second hold, three times daily."],
    images: [{ key: "gluteal-sets-1", ar: "مستلقٍ على ظهره والساقان ممدودتان وهو يشدّ عضلتي المقعدة", en: "Lying on the back with the legs straight, squeezing the buttocks", search: "gluteal sets exercise lying down" }],
  },
  {
    code: "supine-hip-abduction-slide", nameAr: "تبعيد الورك في الاستلقاء بالانزلاق", nameEn: "Supine hip abduction slide",
    kind: "mobility", region: "hip", perSide: true, sets: 2, reps: 10,
    purpose: ["يحرّك الوركَ إلى الجانب ويوقظ الألويةَ الوسطى بلا وزن الساق ضدّ الجاذبية — والساقُ تعود إلى الوسط لا أبعد منه، فلا ضمَّ عبر خطّ الجسم (وضعٌ يُتجنّب بعد المدخل الخلفيّ) ولا مقاومة (بعد المدخل الجانبيّ لا تبعيدَ ضدّ مقاومةٍ نحو ستّة أسابيع).",
      "Moves the hip out to the side and wakes the gluteus medius without lifting the leg against gravity — the leg returns to the midline and no further, so there is no adduction across the body (avoided after a posterior approach) and no resistance (after a direct lateral approach, no resisted abduction for about six weeks)."],
    start: ["مستلقٍ على الظهر والساقان ممدودتان، وكيسٌ بلاستيكيّ أو منشفةٌ تحت كعب الساق المعمولة ليسهل الانزلاق، وأصابعُ القدم تشير إلى السقف.",
      "Lying on the back with the legs straight, a plastic bag or towel under the heel of the operated leg so it slides easily, toes pointing at the ceiling."],
    steps: [[
      "شدّ الفخذ والمقعدة قليلاً والقدمُ إلى الأعلى.",
      "انزلق بالساق إلى الجانب نحو ٣٠ سم أو ما يسمح به الألم.",
      "أعدها ببطء إلى الوسط — ولا تتجاوز خطَّ الجسم.",
      "كرّر ١٠ مرّات.",
    ], [
      "Tighten the thigh and buttock a little, foot pointing up.",
      "Slide the leg out to the side about 30 cm, or as far as pain allows.",
      "Bring it slowly back to the middle — never past the midline.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "دورانُ القدم للخارج أو للداخل ⟵ أصابعُ القدم إلى السقف طوالَ الحركة.",
      "عبورُ الساق خطَّ الوسط عند العودة ⟵ تقف عند الوسط (ووسادةٌ بين الساقين علامةٌ للحدّ).",
      "رفعُ الحوض أو ميلُ الجذع ⟵ الحوضُ مستوٍ والحركةُ من الورك وحده.",
    ], [
      "The foot turning out or in → toes to the ceiling throughout.",
      "The leg crossing the midline on the way back → stop at the middle (a pillow between the legs marks the limit).",
      "Hitching the pelvis or leaning the trunk → pelvis level, the movement from the hip alone.",
    ]],
    easier: ["المعالجُ أو المريضُ برباطٍ يساعد الحركة.", "The therapist, or the patient with a strap, assists the movement."],
    harder: ["ثباتُ ٣ ثوانٍ في آخر المدى، ثمّ يُنقل التبعيدُ إلى الوقوف.", "A 3-second hold at the end of range, then abduction moves to standing."],
    stopIf: ["ألمٌ حادّ أو «طقّة» في الورك، أو ألمٌ جديد في الأربية.", "Sharp pain or a clunk in the hip, or new groin pain."],
    equipment: ["سرير، وكيسٌ بلاستيكيّ أو منشفة.", "A bed, and a plastic bag or towel."],
    doseNote: ["٢ × ١٠ مرّتين يومياً في الأسابيع الأولى.", "2 × 10 twice daily in the first weeks."],
    images: [{ key: "supine-hip-abduction-slide-1", ar: "مستلقٍ على ظهره يحرّك الساقَ الممدودة إلى الجانب على السرير", en: "Lying on the back sliding the straight leg out to the side on the bed", search: "supine hip abduction exercise after hip replacement" }],
  },
  {
    code: "standing-hip-three-way", nameAr: "تقوية الورك واقفاً في ثلاثة اتّجاهات (للأمام وللجانب وللخلف)", nameEn: "Standing hip flexion, abduction and extension",
    kind: "strength", region: "hip", perSide: true, sets: 2, reps: 10,
    purpose: ["يقوّي عضلاتِ الورك الثلاث التي تُضعفها العملية — الثانيةَ والمبعِّدةَ والباسطة — واقفاً كما يُستعمل الورك في المشي؛ وهي «رفعُ الركبة والساقِ جانباً وللخلف» في برنامج Monaghan 2017 الذي حسّن الوظيفةَ وسرعةَ المشي، وتُثقَّل لاحقاً بالمطّاط أو الكابل من ١٢ تكراراً متعباً إلى ٨ (Mikkelsen 2014).",
      "Strengthens the three hip muscle groups that surgery weakens — flexors, abductors and extensors — standing, as the hip is used in walking; these are the 'knee raises and side and back leg raises' of the Monaghan 2017 programme that improved function and walking speed, later loaded with a band or cable from a tiring 12 repetitions to 8 (Mikkelsen 2014)."],
    start: ["واقفٌ مستقيماً ممسكاً بظهر كرسيٍّ ثابت أو بطاولةٍ بكلتا اليدين، والوزنُ على الساق السليمة، والساقُ المعمولة هي التي تتحرّك.",
      "Standing tall holding a firm chair back or a table with both hands, weight on the good leg, the operated leg doing the movement."],
    steps: [[
      "للأمام: ارفع الركبةَ ببطء حتى يبقى الفخذُ أدنى من مستوى الورك (لا فوق ٩٠°)، ثمّ أنزلها.",
      "للجانب: حرّك الساقَ المستقيمة إلى الجانب نحو ٢٠–٣٠ سم والقدمُ للأمام، ثمّ أعدها إلى الوسط.",
      "للخلف: حرّك الساقَ المستقيمة إلى الخلف قليلاً والجذعُ منتصب، ثمّ أعدها.",
      "كرّر كلَّ اتّجاهٍ ١٠ مرّات.",
    ], [
      "Forwards: lift the knee slowly while the thigh stays below hip level (not past 90°), then lower it.",
      "Sideways: move the straight leg out about 20–30 cm with the foot facing forward, then back to the middle.",
      "Backwards: move the straight leg back a little with the trunk upright, then return it.",
      "Repeat each direction 10 times.",
    ]],
    cues: [[
      "ميلُ الجذع للجانب أو للأمام لترتفع الساق ⟵ الجذعُ منتصب والحركةُ صغيرة من الورك.",
      "رفعُ الركبة فوق مستوى الورك ⟵ تحته دائماً في الأسابيع الأولى (وخاصّةً بعد المدخل الخلفيّ).",
      "تدويرُ القدم للخارج في الحركة للجانب أو للخلف ⟵ أصابعُ القدم للأمام.",
    ], [
      "Leaning the trunk sideways or forwards to lift the leg → trunk upright, a small movement from the hip.",
      "Lifting the knee above hip level → always below it in the early weeks (especially after a posterior approach).",
      "Turning the foot out when moving sideways or backwards → toes facing forward.",
    ]],
    easier: ["مدىً أصغر، ورفعُ الركبة جالساً.", "A smaller range, and the knee raise done seated."],
    harder: ["مطّاطٌ حول الكاحل أو ثقلُ كاحلٍ أو كابل، من ١٢ تكراراً متعباً إلى ٨ (Mikkelsen 2014) — والتبعيدُ ضدّ مقاومةٍ بعد ستّة أسابيع إن كان المدخلُ جانبياً.",
      "A band around the ankle, an ankle weight or a cable, from a tiring 12 repetitions to 8 (Mikkelsen 2014) — resisted abduction only after six weeks if the approach was direct lateral."],
    stopIf: ["ألمٌ حادّ أو «طقّة» أو إحساسٌ بخروج المفصل، أو ألمٌ في بطن الساق.", "Sharp pain, a clunk or a feeling of the joint slipping, or calf pain."],
    equipment: ["كرسيٌّ ثابت أو طاولة، ولاحقاً مطّاطٌ أو ثقلُ كاحل.", "A firm chair or table, later a band or ankle weight."],
    doseNote: ["٢ × ١٠ لكلّ اتّجاه يومياً، ثمّ بثقلٍ متدرّج في أيّام القوّة الثلاثة.", "2 × 10 each direction daily, then with progressive load on the three strength days."],
    images: [{ key: "standing-hip-three-way-1", ar: "واقفٌ ممسكاً بظهر كرسيّ ويحرّك ساقَه المستقيمة إلى الجانب", en: "Standing holding a chair back, moving the straight leg out to the side", search: "standing hip abduction flexion extension exercise holding chair" }],
  },
  {
    code: "hip-safe-movement", nameAr: "الحركة الآمنة بعد استبدال الورك بحسب مدخل العملية", nameEn: "Safe movement after hip replacement by surgical approach",
    kind: "functional", region: "hip",
    purpose: ["الخلعُ نادر (نحو ١٫٤٪ بعد المدخل الخلفيّ الجانبيّ وأقلّ بعد غيره — van Steenbergen 2023)، والتجاربُ لم تجد أنّ القيودَ الصارمة تمنعه (Korfitsen 2023 · Yadav 2026) بل أبطأت العودة؛ لكنّ أوضاعاً مركّبةً بعينها تُخرج المفصل، والسقطةُ سببُ ربع الخلوع (Reimert 2022). فيتعلّم المريضُ تعليماتِ جرّاحه أوّلاً — وإن لم تُكتب: الأوضاعَ التي يتجنّبها بحسب مدخل عمليته ستّةَ أسابيع، والوقايةَ من السقوط.",
      "Dislocation is rare (about 1.4% after a posterolateral approach and less after others — van Steenbergen 2023), and trials found that strict restrictions did not prevent it (Korfitsen 2023 · Yadav 2026) but slowed the return to activity; yet certain combined positions do dislocate the joint, and falls cause a quarter of dislocations (Reimert 2022). So the patient learns the surgeon's instructions first — and, if none are written, the positions to avoid for six weeks according to the approach, and fall prevention."],
    start: ["المعالجُ والمريضُ وأحدُ أفراد الأسرة، وورقةُ الجرّاح أو تقريرُ العملية: المدخل (خلفيّ، جانبيّ «هاردنج»، أماميّ جانبيّ، أماميّ) ومدّةُ القيود.",
      "The therapist, the patient and a family member, with the surgeon's note or operation report: the approach (posterior, direct lateral 'Hardinge', anterolateral, direct anterior) and how long any restrictions last."],
    steps: [[
      "اعرف مدخلَ عمليتك وتعليماتِ جرّاحك المكتوبة — وهي التي تحكم؛ وإن لم تُعرف يُسأل الجرّاح.",
      "المدخلُ الخلفيّ: تجنّب اجتماعَ ثني الورك فوق ٩٠° مع ضمّ الركبة عبر الوسط وتدويرها للداخل — الكرسيُّ والمرحاضُ الواطئان والركبتان متلاصقتان، وتقاطعُ الساقين، والالتفاتُ بالجذع نحو الجهة المعمولة جالساً، والتقاطُ شيءٍ عن الأرض والركبةُ للداخل.",
      "المدخلُ الأماميّ أو الأماميّ الجانبيّ: تجنّب اجتماعَ بسط الورك للخلف مع تدوير القدم للخارج — كالخطوة الواسعة للخلف والقدمُ للخارج، والدورانِ على الساق المعمولة للخارج — وتجنّب الثنيَ العميق مع التدوير للداخل في البداية أيضاً.",
      "المدخلُ الجانبيّ (هاردنج): الخلعُ أقلّ، لكنّ العضلةَ المبعِّدة خِيطت — فلا تبعيدَ ضدّ مقاومةٍ ولا ضمَّ قسرياً للساق نحو ستّة أسابيع إلّا بإذن الجرّاح.",
      "في كلّ المداخل: وسادةٌ بين الركبتين في النوم على الجنب، وكرسيٌّ ثابتٌ مرتفع بمسندين، ومقعدُ مرحاضٍ مرتفع، وإزالةُ السجّاد والعوائق، وإنارةٌ ليلية، والأداةُ حتى يأمن المشي — فالسقطةُ أخطرُ من أيّ وضع.",
      "تُراجَع هذه القيودُ مع الجرّاح في زيارة الأسبوع السادس — ولا تُترك ولا تُمدَّد بلا كلمته.",
    ], [
      "Know your approach and your surgeon's written instructions — they govern; if unknown, ask the surgeon.",
      "Posterior approach: avoid combining hip flexion past 90° with the knee crossing the midline and turning in — low chairs and toilets with the knees together, crossing the legs, twisting the trunk towards the operated side while seated, and picking things off the floor with the knee turned in.",
      "Direct anterior or anterolateral approach: avoid combining hip extension with the foot turned out — such as a long step back with the foot turned out, or pivoting outwards on the operated leg — and avoid deep flexion with inward rotation early on as well.",
      "Direct lateral approach (Hardinge): dislocation is less common, but the abductor muscle has been repaired — so no resisted abduction and no forced adduction of the leg for about six weeks unless the surgeon allows it.",
      "With every approach: a pillow between the knees when sleeping on the side, a firm high chair with armrests, a raised toilet seat, rugs and clutter removed, a night light, and the walking aid until walking is safe — a fall is more dangerous than any position.",
      "These restrictions are reviewed with the surgeon at the six-week visit — neither dropped nor extended without their word.",
    ]],
    cues: [[
      "خوفٌ يمنع الحركةَ كلَّها ⟵ الممنوعُ أوضاعٌ مركّبة قليلة، والمشيُ والتمارينُ آمنة.",
      "الانحناءُ لالتقاط شيءٍ عن الأرض بالركبة للداخل ⟵ الملقطُ الطويل.",
      "الجلوسُ على كنبةٍ واطئة طرية ⟵ كرسيٌّ ثابت ركبتاه بمستوى الوركين أو أدنى.",
    ], [
      "Fear that stops all movement → only a few combined positions are avoided; walking and exercise are safe.",
      "Bending to pick something off the floor with the knee turned in → use the long reacher.",
      "Sitting on a low soft sofa → a firm chair with the knees level with the hips or lower.",
    ]],
    easier: ["ورقةٌ مصوّرة بالأوضاع تُعلَّق في البيت، ويشرحها المعالجُ للأسرة.", "An illustrated sheet of the positions hung at home, explained to the family by the therapist."],
    harder: ["التدرّبُ على الأوضاع اليومية أمام المعالج: النهوضُ من السرير، والجلوسُ والقيام، والالتفات، ولبسُ الحذاء.", "Practising daily positions in front of the therapist: getting out of bed, sitting and standing, turning, and putting on shoes."],
    stopIf: ["ألمٌ شديدٌ مفاجئ في الورك أو الأربية مع «طقّة» أو عجزٍ عن الوقوف أو قِصَرٍ ظاهر في الساق ودورانها — خلعٌ محتمل: لا تُحرَّك الساقُ ولا يُحاوَل ردُّها، ويُنقل إلى الطوارئ أو الجرّاح فوراً.",
      "Sudden severe hip or groin pain with a clunk, inability to stand, or a visibly shortened and rotated leg — a possible dislocation: do not move the leg or try to put it back; transfer to the emergency department or surgeon at once."],
    equipment: ["ورقةُ تعليمات الجرّاح، ووسادة، وكرسيٌّ مرتفع، ومقعدُ مرحاضٍ مرتفع، وملقطٌ طويل.", "The surgeon's instructions, a pillow, a high chair, a raised toilet seat and a long reacher."],
    doseNote: ["في الجلسة الأولى، ويُراجَع في كلّ جلسة حتى زيارة الأسبوع السادس.", "At the first session, reviewed every session until the six-week visit."],
    images: [{ key: "hip-safe-movement-1", ar: "رسمٌ للأوضاع التي تُتجنّب بعد استبدال الورك: الانحناءُ فوق ٩٠° وتقاطعُ الساقين وتدويرُ الركبة للداخل", en: "Drawing of the positions to avoid after hip replacement: bending past 90°, crossing the legs and turning the knee inwards", search: "hip precautions after hip replacement illustration" }],
  },
  {
    code: "bed-mobility-hip", nameAr: "النهوض من السرير والعودة إليه بعد استبدال الورك", nameEn: "Getting into and out of bed after hip replacement",
    kind: "functional", region: "whole_body",
    purpose: ["أوّلُ ما يحتاجه المريضُ في البيت، والنهوضُ الخاطئ يجمع الثنيَ والضمَّ والتدويرَ معاً؛ فيُعلَّم بطريقةٍ ثابتة لكلّ مدخل: الساقُ المعمولة لا تعبر الوسط، والجذعُ والساقان يدوران معاً كقطعةٍ واحدة.",
      "The first thing the patient needs at home, and getting up the wrong way combines flexion, adduction and rotation at once; so a fixed method is taught for every approach: the operated leg does not cross the midline, and the trunk and legs turn together as one piece."],
    start: ["سريرٌ ثابت بارتفاعٍ تكون فيه الركبتان بمستوى الوركين أو أدنى عند الجلوس على حافّته، والمشّايةُ بجانبه، والنزولُ من الجهة التي يحدّدها الجرّاحُ أو المعالج.",
      "A firm bed at a height where the knees are level with the hips or lower when sitting on its edge, the frame beside it, getting out on the side the surgeon or therapist advises."],
    steps: [[
      "النهوض: مستلقياً على ظهرك، اسحب نفسك بالمرفقين نحو حافّة السرير.",
      "حرّك الساقين معاً إلى الحافّة — والسليمةُ تسند المعمولةَ من تحتها إن احتاجت — بلا ضمّ الركبتين.",
      "ادفع بالمرفقين واليدين لتجلس، والساقان تنزلان معاً، وجذعُك وساقاك يدوران كقطعةٍ واحدة.",
      "اجلس على الحافّة دقيقةً وقدماك على الأرض، ثمّ قُم بالمشّاية والساقُ المعمولة قليلاً إلى الأمام.",
      "العودة بالعكس: اجلس على الحافّة، ثمّ ارفع الساقين معاً إلى السرير وأنت تستلقي، ووسادةٌ بين الركبتين إن نمتَ على جنبك.",
    ], [
      "Getting up: lying on your back, shuffle towards the edge of the bed on your elbows.",
      "Move both legs together to the edge — the good leg supporting the operated one from underneath if needed — without bringing the knees together.",
      "Push up on your elbows and hands to sit as the legs come down together, trunk and legs turning as one piece.",
      "Sit on the edge for a minute with your feet on the floor, then stand with the frame, the operated leg slightly forward.",
      "Getting back in, in reverse: sit on the edge, then lift both legs onto the bed together as you lie down, with a pillow between the knees if you sleep on your side.",
    ]],
    cues: [[
      "لفُّ الجذع وحده والساقان في مكانهما ⟵ الجذعُ والساقان يتحرّكان معاً.",
      "ضمُّ الساق المعمولة عبر الوسط عند الدوران ⟵ الركبتان متباعدتان (ووسادةٌ بينهما لمن يحتاج).",
      "النهوضُ السريع ثمّ الدوخة ⟵ الجلوسُ على الحافّة دقيقةً قبل الوقوف.",
    ], [
      "Twisting the trunk alone with the legs left behind → trunk and legs move together.",
      "The operated leg crossing the midline while turning → knees apart (a pillow between them if needed).",
      "Getting up fast, then dizziness → sit on the edge for a minute before standing.",
    ]],
    easier: ["رباطٌ حول القدم يرفع به الساقَ المعمولة، ومساعدةُ أحد الأسرة.", "A strap around the foot to lift the operated leg, and help from a family member."],
    harder: ["بلا مساعدة وبلا رباط، ثمّ من سريرٍ أوطأ قليلاً بعد إذن الجرّاح.", "Without help or a strap, then from a slightly lower bed once the surgeon allows."],
    stopIf: ["دوخةٌ شديدة أو ضيقُ نفس أو ألمٌ في الصدر، أو ألمٌ مفاجئ في الورك مع «طقّة».", "Marked dizziness, breathlessness or chest pain, or sudden hip pain with a clunk."],
    equipment: ["سريرٌ ثابت، ومشّاية، ووسادة، ورباطٌ للساق عند الحاجة.", "A firm bed, a frame, a pillow, and a leg strap if needed."],
    doseNote: ["يُتدرَّب عليه في الجلسات الأولى حتى يستقلّ، ثمّ في كلّ نهوضٍ في البيت.", "Practised in the first sessions until independent, then every time the patient gets up at home."],
    images: [{ key: "bed-mobility-hip-1", ar: "مريضٌ يجلس على حافّة السرير والساقان تنزلان معاً بعد استبدال الورك", en: "A patient sitting up at the edge of the bed with both legs lowering together after hip replacement", search: "getting out of bed after hip replacement" }],
  },
  {
    code: "raised-seat-transfer-hip", nameAr: "الجلوس على الكرسيّ والمرحاض المرتفع والقيام منهما بعد استبدال الورك", nameEn: "Chair and raised-toilet transfers after hip replacement",
    kind: "functional", region: "whole_body",
    purpose: ["الكرسيُّ الواطئ والمرحاضُ العربيّ أكثرُ وضعين يجمعان الثنيَ العميق مع ضمّ الركبتين — واثنان من أربعة خلوعٍ في سلسلةٍ كبيرة وقعا على المرحاض (Restrepo 2011)؛ فالمقعدُ المرتفع والكرسيُّ الثابت بمسندين في البيت من أوّل يوم، والطريقةُ تُعلَّم.",
      "A low chair and a squat toilet are the two positions that most combine deep flexion with the knees together — two of four dislocations in a large series happened on the toilet (Restrepo 2011); so a raised seat and a firm chair with armrests are in the home from day one, and the method is taught."],
    start: ["كرسيٌّ ثابت بمسندين ومقعدُه أعلى من الركبة (أو بوسادةٍ صلبة)، أو مقعدُ مرحاضٍ مرتفع أو كرسيُّ حمّام فوق المرحاض العربيّ، والمشّايةُ أمامه.",
      "A firm chair with armrests and a seat higher than the knee (or a firm cushion), or a raised toilet seat or commode frame over a squat toilet, with the frame in front."],
    steps: [[
      "الجلوس: ارجع بخطواتٍ صغيرة حتى تلمس الكرسيَّ خلف ساقيك.",
      "مدّ الساقَ المعمولة قليلاً إلى الأمام، وانقل يديك من المشّاية إلى المسندين واحدةً بعد الأخرى.",
      "اجلس ببطء والجذعُ أقربُ إلى المنتصب، والركبتان متباعدتان لا متلاصقتان.",
      "القيام: تقدّم إلى حافّة المقعد والساقُ المعمولة قليلاً إلى الأمام، وادفع بيديك على المسندين، ثمّ أمسك المشّاية.",
      "على المرحاض: الطريقةُ نفسُها على المقعد المرتفع، بلا انحناءٍ عميق للأمام ولا التفاتٍ بالجذع.",
    ], [
      "Sitting: step back in small steps until you feel the chair behind your legs.",
      "Slide the operated leg a little forward, and move your hands from the frame to the armrests one at a time.",
      "Sit down slowly with the trunk close to upright and the knees apart, not together.",
      "Standing: shuffle to the front of the seat with the operated leg slightly forward, push on the armrests, then take hold of the frame.",
      "On the toilet: the same method on the raised seat, with no deep forward bend and no twisting of the trunk.",
    ]],
    cues: [[
      "الجلوسُ بإسقاط الجسم دفعةً ⟵ نزولٌ بطيء بالتحكّم على المسندين.",
      "الانحناءُ الكثير للأمام عند القيام أو الجلوس ⟵ الساقُ المعمولة للأمام والجذعُ أقربُ إلى المنتصب (وخاصّةً بعد المدخل الخلفيّ).",
      "الركبتان تتلاصقان ⟵ متباعدتان بعرض الورك.",
    ], [
      "Dropping into the seat → a slow, controlled descent on the armrests.",
      "Bending far forward to stand or sit → operated leg forward and the trunk closer to upright (especially after a posterior approach).",
      "The knees coming together → hip-width apart.",
    ]],
    easier: ["مقعدٌ أعلى، ومساعدةٌ خفيفة على الحزام.", "A higher seat, and light help at the belt."],
    harder: ["مقعدٌ بالارتفاع المعتاد ثمّ بلا يدين — حين يأذن الجرّاحُ بالثني فوق ٩٠°.", "A standard-height seat, then without hands — once the surgeon allows flexion past 90°."],
    stopIf: ["ألمٌ مفاجئ في الورك أو «طقّة» أو إحساسٌ بخروج المفصل، أو دوخة.", "Sudden hip pain, a clunk or a feeling of the joint slipping, or dizziness."],
    equipment: ["كرسيٌّ ثابت بمسندين، ومقعدُ مرحاضٍ مرتفع أو كرسيُّ حمّام، ومشّاية.", "A firm chair with armrests, a raised toilet seat or commode frame, and a frame."],
    doseNote: ["يُتدرَّب عليه في المرحلة الأولى حتى يستقلّ، ويبقى المقعدُ المرتفع في البيت حتى يأذن الجرّاح.", "Practised in phase 1 until independent; the raised seat stays at home until the surgeon allows otherwise."],
    images: [{ key: "raised-seat-transfer-hip-1", ar: "مقعدُ مرحاضٍ مرتفع بمسندين، ومريضٌ يجلس عليه والساقُ المعمولة إلى الأمام", en: "A raised toilet seat with armrests, a patient sitting down with the operated leg forward", search: "raised toilet seat with armrests after hip replacement" }],
  },
  {
    code: "dressing-aids-hip", nameAr: "لبس الجوارب والحذاء والملابس بالأدوات المساعدة", nameEn: "Dressing with aids — sock aid, reacher and long shoehorn",
    kind: "functional", region: "whole_body",
    purpose: ["لبسُ الجوارب والحذاء يجمع الثنيَ العميق مع التدوير — وهو ما يُتجنّب في الأسابيع الأولى بعد المدخل الخلفيّ؛ والأدواتُ البسيطة تحفظ الاستقلالَ بلا انحناء. ودليلُ تقديمها للجميع ضعيفٌ جدّاً (Smith 2016)، فتُعطى لمن يحتاجها.",
      "Putting on socks and shoes combines deep flexion with rotation — what is avoided in the early weeks after a posterior approach; simple aids keep the patient independent without bending. The evidence for giving them to everyone is very weak (Smith 2016), so they are given to those who need them."],
    start: ["جالسٌ على كرسيٍّ ثابتٍ مرتفع، والأدواتُ بجانبه: مُلبِسُ الجوارب، والملقطُ الطويل، وقرنُ الحذاء الطويل؛ والحذاءُ بلا رباطٍ أو برباطٍ مطّاطيّ.",
      "Sitting on a firm high chair with the aids beside it: a sock aid, a long reacher and a long shoehorn; shoes without laces or with elastic laces."],
    steps: [[
      "السروال: ابدأ بالساق المعمولة — التقط السروالَ بالملقط وأنزله إلى القدم وأدخلها، ثمّ الساقَ السليمة.",
      "الجورب: ألبسه على مُلبِس الجوارب، وأنزل الأداةَ بحبليها أمام القدم، وأدخل القدمَ واسحب.",
      "الحذاء: أدخل القدمَ بقرن الحذاء الطويل وأنت جالس، بلا انحناءٍ نحو القدم.",
      "الخلع بالعكس: الساقُ السليمة أوّلاً، والملقطُ أو قرنُ الحذاء يدفع الجوربَ والحذاء.",
    ], [
      "Trousers: start with the operated leg — catch the trousers with the reacher, lower them to the foot and step in, then the good leg.",
      "Socks: load the sock onto the sock aid, lower the aid by its cords in front of the foot, put the foot in and pull.",
      "Shoes: slide the foot in with the long shoehorn while seated, without bending towards the foot.",
      "Undressing in reverse: the good leg first, with the reacher or shoehorn pushing off socks and shoes.",
    ]],
    cues: [[
      "الانحناءُ إلى القدم «مرّةً واحدة فقط» ⟵ الأداةُ في كلّ مرّة حتى يأذن الجرّاح.",
      "رفعُ القدم فوق الركبة الأخرى (تقاطعُ الساقين) ⟵ القدمُ على الأرض أمامك.",
      "البدءُ بالساق السليمة في اللبس ⟵ المعمولةُ أوّلاً في اللبس وآخراً في الخلع.",
    ], [
      "Bending to the foot 'just this once' → the aid every time until the surgeon allows otherwise.",
      "Lifting the foot over the other knee (crossing the legs) → the foot on the floor in front of you.",
      "Starting with the good leg when dressing → the operated leg first when dressing and last when undressing.",
    ]],
    easier: ["أحدُ الأسرة يساعد في الجوارب في الأيّام الأولى، والحذاءُ بلا رباط.", "A family member helps with socks in the first days, and shoes without laces."],
    harder: ["بلا أدوات بعد زيارة الأسبوع السادس وإذن الجرّاح، جالساً والقدمُ إلى الجانب.", "Without aids after the six-week visit and the surgeon's agreement, seated with the foot to the side."],
    stopIf: ["ألمٌ مفاجئ في الورك أو «طقّة»، أو دوخةٌ عند الانحناء.", "Sudden hip pain or a clunk, or dizziness when bending."],
    equipment: ["مُلبِسُ جوارب، وملقطٌ طويل، وقرنُ حذاءٍ طويل، وحذاءٌ بلا رباط.", "A sock aid, a long reacher, a long shoehorn and slip-on shoes."],
    doseNote: ["يُعلَّم في الجلسات الأولى لمن يحتاجه، ويُمارَس كلَّ يوم.", "Taught in the first sessions to those who need it, and practised daily."],
    images: [{ key: "dressing-aids-hip-1", ar: "يدان تُنزلان مُلبِسَ الجوارب بحبليه أمام القدم والمريضُ جالس", en: "Hands lowering a sock aid by its cords in front of the foot while seated", search: "sock aid reacher long shoehorn hip replacement" }],
  },
  {
    code: "walking-aid-gait-hip", nameAr: "المشي بالمشّاية ثمّ العكّازين ثمّ العصا بعد جراحة الورك", nameEn: "Walking with a frame, crutches, then a cane after hip surgery",
    kind: "functional", region: "whole_body",
    purpose: ["الحملُ بقدر ما يحتمل آمنٌ بعد أكثر عمليات الورك بالإسمنت وبدونه (Hol 2010 · Wolf 2010) إلّا إن قيّده الجرّاح؛ والعرجُ وميلُ الجذع نحو الجهة المعمولة (مشيةُ ترندلنبرغ) علامةُ ضعف الألوية الوسطى — فتُنزَل الأداةُ خطوةً بعد خطوة حين يمشي بلا عرج، لا بالتاريخ وحده (Hol 2010).",
      "Weight bearing as tolerated is safe after most cemented and uncemented hip replacements (Hol 2010 · Wolf 2010) unless the surgeon restricts it; a limp with the trunk leaning towards the operated side (Trendelenburg gait) signals gluteus medius weakness — so the aid is stepped down when the patient walks without a limp, not by date alone (Hol 2010)."],
    start: ["واقفٌ داخل المشّاية بطولٍ يجعل المرفقين مثنيّين قليلاً (نحو ٢٠°) والمقبضُ عند ثنية الرسغ، والحملُ على الساق المعمولة كما يأذن الجرّاح.",
      "Standing inside the frame, set so the elbows bend slightly (about 20°) with the handle at the wrist crease, weight on the operated leg as the surgeon allows."],
    steps: [[
      "بالمشّاية: قدّمها خطوةً، ثمّ الساقَ المعمولة إلى منتصفها، ثمّ السليمةَ أبعدَ منها قليلاً.",
      "بالعكّازين: العكّازان مع الساق المعمولة معاً، ثمّ السليمة — إيقاعٌ متناوب بخطوتين متساويتين.",
      "بعكّازٍ واحد أو عصا: في اليد المقابلة للورك المعمول، تتقدّم مع الساق المعمولة.",
      "في كلّ خطوة: الكعبُ أوّلاً، والجذعُ منتصب، والحوضُ مستوٍ لا يسقط ولا يميل.",
      "تنزل الأداةُ درجةً حين يمشي ١٠ أمتار بالأخفّ بلا عرجٍ ولا ميل، والألمُ في المشي ٣ من ١٠ أو أقلّ، ويقف على الساق المعمولة ثانيتين (للانتقال إلى العكّازين) ثمّ خمسَ ثوانٍ (للمشي بلا أداة) بلا سقوط الحوض.",
    ], [
      "With the frame: move it one step, then the operated leg to its middle, then the good leg slightly beyond.",
      "With crutches: both crutches with the operated leg together, then the good leg — an alternating rhythm with equal steps.",
      "With one crutch or a cane: in the hand opposite the operated hip, moving forward with the operated leg.",
      "With every step: heel first, trunk upright, the pelvis level — not dropping or tilting.",
      "Step the aid down when the patient walks 10 m with the lighter aid without a limp or lean, walking pain is 3/10 or less, and they stand on the operated leg for 2 seconds (to move to crutches) and then 5 seconds (to walk without an aid) without the pelvis dropping.",
    ]],
    cues: [[
      "ميلُ الجذع نحو الساق المعمولة عند الوقوف عليها ⟵ الجذعُ منتصب، والأداةُ الأثقل حتى تقوى الألوية.",
      "العصا في يد الجهة المعمولة ⟵ في اليد المقابلة.",
      "خطوةٌ قصيرة على الساق المعمولة ⟵ خطوتان متساويتان وإيقاعٌ منتظم.",
    ], [
      "Leaning the trunk over the operated leg when standing on it → trunk upright, and the heavier aid until the glutes are stronger.",
      "The cane in the hand on the operated side → in the opposite hand.",
      "A short step onto the operated leg → two equal steps and a steady rhythm.",
    ]],
    easier: ["مشّايةٌ بعجلاتٍ أمامية، ومسافاتٌ قصيرة متكرّرة.", "A frame with front wheels, and short frequent distances."],
    harder: ["المشيُ بلا أداة داخلَ البيت، ثمّ في الشارع، مع الاستدارة والتوقّف.", "Walking without an aid indoors, then outdoors, with turning and stopping."],
    stopIf: ["ألمٌ مفاجئ في الورك مع عجزٍ عن الحمل، أو دوخة، أو ألمٌ وتورّمٌ في بطن الساق، أو ضيقُ نفس.", "Sudden hip pain with inability to bear weight, dizziness, calf pain and swelling, or breathlessness."],
    equipment: ["مشّاية، وعكّازان، وعصا بطولٍ مناسب، وحذاءٌ مغلق.", "A frame, two crutches, a cane of the right height and closed shoes."],
    doseNote: ["في كلّ جلسة، ومشيٌ قصير متكرّر في البيت كلَّ ساعةٍ أو ساعتين يطول يوماً بعد يوم.", "Every session, with short frequent walks at home every hour or two, lengthening day by day."],
    images: [{ key: "walking-aid-gait-hip-1", ar: "مريضٌ بعد استبدال الورك يمشي بعكّازين والجذعُ منتصب", en: "A patient after hip replacement walking with two crutches, trunk upright", search: "walking with crutches after hip replacement" }],
  },
  {
    code: "stairs-after-hip-surgery", nameAr: "صعود الدرج ونزوله بعد جراحة الورك (بالدرابزين والعكّاز)", nameEn: "Stairs after hip surgery (rail and crutch)",
    kind: "functional", region: "whole_body",
    purpose: ["يعيد الاستقلالَ على الدرج قبل الخروج إلى البيت والشارع بقاعدةٍ واحدة: الصعودُ بالسليمة والنزولُ بالمعمولة؛ وفي الأسابيع الأولى يُصعد الدرجُ بحملٍ محميّ لأنّ قوى الالتواء على جذع المفصل فيه أعلى (Hol 2010)، ثمّ درجةً بعد درجة حين تقوى الألوية.",
      "Restores safe independence on stairs before going home and outdoors with one rule: up with the good leg, down with the operated one; in the first weeks stairs are climbed with protected weight bearing because torsional loads on the stem are higher there (Hol 2010), then step over step as the glutes strengthen."],
    start: ["أمامَ درجٍ بدرابزين، اليدُ على الدرابزين والعكّازُ في اليد الأخرى، والمعالجُ خلفه في الصعود وأمامه في النزول.",
      "Facing stairs with a rail, one hand on the rail and the crutch in the other, the therapist behind on the way up and in front on the way down."],
    steps: [[
      "في الصعود: اصعد بالساق السليمة أوّلاً.",
      "ثمّ الساقُ المعمولة والعكّازُ معاً إلى الدرجة نفسِها.",
      "في النزول: أنزل العكّازَ أوّلاً، ثمّ الساقَ المعمولة.",
      "ثمّ الساقُ السليمة إلى الدرجة نفسِها.",
      "حين تتحقّق معاييرُ المرحلة الثالثة: درجةٌ بعد درجة بالتناوب، صعوداً ثمّ نزولاً، بالدرابزين وحده.",
    ], [
      "Going up: step up with the good leg first.",
      "Then the operated leg and the crutch together onto the same step.",
      "Going down: lower the crutch first, then the operated leg.",
      "Then the good leg onto the same step.",
      "When the phase 3 criteria are met: step over step, up and then down, with the rail alone.",
    ]],
    cues: [[
      "الانحناءُ الكثير إلى الأمام في الصعود ⟵ الجذعُ منتصبٌ فوق القدمين (وبعد المدخل الخلفيّ لا ثنيَ عميق).",
      "الساقُ المعمولة أوّلاً في الصعود ⟵ «السليمةُ تصعد والمعمولةُ تنزل».",
      "الدورانُ على الساق المعمولة عند منعطف الدرج ⟵ خطواتٌ صغيرة يدور بها، لا التفافٌ على القدم.",
    ], [
      "Leaning far forward going up → trunk upright over the feet (and no deep flexion after a posterior approach).",
      "The operated leg first going up → 'up with the good, down with the operated'.",
      "Pivoting on the operated leg at the turn of the stairs → small steps to turn, never twisting on the foot.",
    ]],
    easier: ["درجةٌ واحدة منخفضة (١٠ سم) في القاعة.", "A single low step (10 cm) in the gym."],
    harder: ["درجٌ كامل بلا عكّاز، ثمّ درجةً بعد درجة، ثمّ حملُ كيسٍ خفيف.", "A full flight without a crutch, then step over step, then carrying a light bag."],
    stopIf: ["دوخةٌ أو ألمٌ في الصدر أو ضيقُ نفس، أو ألمٌ مفاجئ في الورك أو عجزٌ عن الحمل.", "Dizziness, chest pain or breathlessness, or sudden hip pain or inability to bear weight."],
    equipment: ["درجٌ بدرابزين أو درجةُ تمرين، وعكّاز.", "Stairs with a rail or an exercise step, and a crutch."],
    doseNote: ["في كلّ جلسةٍ من المرحلة الأولى حتى يستقلّ، ثمّ كلّ يومٍ في البيت.", "Every phase 1 session until independent, then daily at home."],
    images: [{ key: "stairs-after-hip-surgery-1", ar: "مريضٌ يصعد درجةً بالساق السليمة أوّلاً ويدُه على الدرابزين والعكّازُ في اليد الأخرى", en: "A patient stepping up with the good leg first, one hand on the rail and a crutch in the other", search: "stairs with crutch after hip replacement up with good leg" }],
  },
  {
    code: "car-transfer-hip", nameAr: "الدخول إلى السيارة والخروج منها بعد استبدال الورك", nameEn: "Getting in and out of a car after hip replacement",
    kind: "functional", region: "whole_body",
    purpose: ["يتيح العودةَ إلى المركز والمراجعات بأمان؛ ومقعدُ السيارة الواطئ مع إدخال الساق المعمولة وحدها ملتويةً يجمع الثنيَ العميق والتدويرَ — فيجلس أوّلاً ثمّ تدخل الساقان معاً والجذعُ مائلٌ للخلف.",
      "Allows safe travel to the centre and appointments; a low car seat with the operated leg brought in alone and twisted combines deep flexion and rotation — so the patient sits first, then both legs come in together with the trunk leaning back."],
    start: ["المقعدُ الأماميّ مرجَعٌ إلى الخلف ومائلٌ للخلف، ووسادةٌ صلبة ترفعه إن كان واطئاً، وكيسٌ بلاستيكيّ عليه ليسهل الدوران، والسيارةُ بعيدةٌ عن الرصيف أو بمحاذاته بحيث يكون المقعدُ بارتفاعٍ مناسب.",
      "The front seat pushed back and reclined, a firm cushion to raise it if low, a plastic bag on it to ease turning, and the car parked so the seat is at a suitable height."],
    steps: [[
      "قِف وظهرُك إلى المقعد، والساقُ المعمولة قليلاً إلى الأمام.",
      "أمسك هيكلَ السيارة أو المقعد (لا الباب)، واجلس ببطء والرأسُ منحنٍ قليلاً.",
      "ازحف إلى الخلف على المقعد والجذعُ مائلٌ للخلف.",
      "أدخل الساقين معاً وأنت تدور بالجذع والساقين كقطعةٍ واحدة — ويدُك أو أحدُ الأسرة يسند الساقَ المعمولة.",
      "الخروج بالعكس: الساقان معاً إلى الخارج، ثمّ القيامُ والساقُ المعمولة إلى الأمام.",
    ], [
      "Stand with your back to the seat, the operated leg slightly forward.",
      "Hold the car frame or the seat (not the door) and sit down slowly with the head slightly bowed.",
      "Shuffle back on the seat with the trunk leaning back.",
      "Bring both legs in together, turning trunk and legs as one piece — your hand or a family member supporting the operated leg.",
      "Getting out in reverse: both legs out together, then stand with the operated leg forward.",
    ]],
    cues: [[
      "إدخالُ الساق المعمولة أوّلاً ثمّ الجلوس ⟵ الجلوسُ أوّلاً ثمّ الساقان معاً.",
      "الانحناءُ إلى الأمام نحو لوحة السيارة ⟵ الجذعُ مائلٌ للخلف.",
      "ضمُّ الركبتين أو التفافُ الساق وحدها ⟵ الركبتان متباعدتان والدورانُ بالجسم كلّه.",
    ], [
      "Putting the operated leg in first, then sitting → sit first, then both legs together.",
      "Leaning forward towards the dashboard → trunk leaning back.",
      "Knees coming together or the leg twisting alone → knees apart, turning the whole body.",
    ]],
    easier: ["مقعدٌ أعلى (سيارةٌ عالية أو وسادةٌ صلبة)، ومساعدٌ يسند الساق.", "A higher seat (a tall car or a firm cushion), and a helper supporting the leg."],
    harder: ["بلا مساعدة، ثمّ سيارةٌ أوطأ بعد إذن الجرّاح.", "Without help, then a lower car once the surgeon allows."],
    stopIf: ["ألمٌ مفاجئ في الورك أو «طقّة»، أو دوخة.", "Sudden hip pain or a clunk, or dizziness."],
    equipment: ["سيارة، ووسادةٌ صلبة، وكيسٌ بلاستيكيّ.", "A car, a firm cushion and a plastic bag."],
    doseNote: ["يُتدرَّب عليه مرّةً أو مرّتين قبل أوّل رحلةٍ طويلة، والقيادةُ بإذن الجرّاح.", "Practised once or twice before the first long journey; driving only with the surgeon's agreement."],
    images: [{ key: "car-transfer-hip-1", ar: "مريضٌ جالسٌ على مقعد السيارة الأماميّ يُدخل ساقيه إلى الداخل", en: "A patient seated on the front car seat bringing the legs in", search: "car transfer after hip replacement" }],
  },
  {
    code: "prayer-progression-hip", nameAr: "الصلاة بعد استبدال الورك: على الكرسيّ أوّلاً ثمّ العودة المتدرّجة", nameEn: "Prayer after hip replacement: on a chair first, then a graded return",
    kind: "functional", region: "whole_body",
    purpose: ["الصلاةُ خمسَ مرّاتٍ في اليوم فيها ركوعٌ وسجودٌ وجلوس — والجلسةُ الأخيرة بالساقين في وضعين مختلفين أبعدُ مداها وأقربُه إلى الاصطدام في محاكاةٍ حاسوبية (Jamari 2017)؛ ولا دراسةَ على مرضى بعد الاستبدال. فيصلّي على الكرسيّ حتى يأذن الجرّاح، ثمّ يعود بالتدريج بحسب مدخل عمليته — والحكمُ الشرعيّ للمريض ومرجعه.",
      "The five daily prayers include bowing, prostration and sitting — and the final sitting with the legs in two different positions is the most extreme range and the closest to impingement in a computer simulation (Jamari 2017); there is no study in patients after replacement. So the patient prays on a chair until the surgeon allows, then returns gradually according to the approach — the religious ruling belongs to the patient and their scholar."],
    start: ["كرسيٌّ ثابت بلا عجلات بارتفاعٍ تكون فيه الركبتان بمستوى الوركين أو أدنى، وسجّادةُ الصلاة أمامه؛ والوضوءُ جالساً بإناءٍ أو إسفنجةٍ بمقبضٍ طويل للقدمين.",
      "A firm chair without wheels at a height where the knees are level with the hips or lower, with the prayer mat in front; ablution seated, with a jug or a long-handled sponge for the feet."],
    steps: [[
      "في الأسابيع الستّة الأولى (أو حتى يأذن الجرّاح): القيامُ واقفاً ممسكاً بظهر الكرسيّ أو جالساً، والركوعُ والسجودُ إيماءً أو بانحناءٍ صغير — لا أرضَ ولا قرفصاءَ ولا سجودَ على الأرض.",
      "الوضوءُ جالساً، ولا تُرفع القدمُ المعمولة إلى المغسلة.",
      "بعد إذن الجرّاح، وحين يبلغ ثنيُ الورك ١٠٠–١١٠° بلا ألم: الركوعُ واقفاً أوّلاً والركبتان مستقيمتان (نحو ٩٠° في الورك).",
      "ثمّ السجودُ من الركوع على الركبتين بإسنادٍ على كرسيٍّ أو طاولة والركبتان متباعدتان — وبعد المدخل الخلفيّ لا تعبر الركبةُ المعمولة الوسط.",
      "ثمّ الجلوس: جلسةٌ متناظرة أو على وسادةٍ منخفضة؛ والجلسةُ التي تختلف فيها الساقان أبعدُ مدىً فتأتي آخراً، والتربّعُ آخرُ خطوةٍ وقد لا يُنصح به لبعض المرضى.",
    ], [
      "In the first six weeks (or until the surgeon allows): stand holding the chair back or sit, and bow and prostrate by gesture or a small forward lean — no floor, no squatting, no prostration on the floor.",
      "Ablution seated, without lifting the operated foot to the sink.",
      "After the surgeon's agreement, once hip flexion of 100–110° is pain-free: standing bowing first, with the knees straight (about 90° at the hip).",
      "Then prostration from kneeling, supported on a chair or table, knees apart — and after a posterior approach the operated knee does not cross the midline.",
      "Then sitting: a symmetrical sitting position or a low cushion; the sitting with the legs in different positions has the greatest range and comes last, and cross-legged sitting is the final step and may never be advised for some patients.",
    ]],
    cues: [[
      "السجودُ على الأرض في الأسابيع الأولى لأنّ الألم خفّ ⟵ الكرسيُّ حتى زيارة الجرّاح، فالخطرُ في الوضع لا في الألم.",
      "النهوضُ من السجود بدفع الساق المعمولة للخلف والقدمُ للخارج (المدخلُ الأماميّ والجانبيّ) ⟵ النهوضُ بالإسناد والقدمُ للأمام.",
      "ضمُّ الركبتين وتدويرُهما للداخل عند السجود (المدخلُ الخلفيّ) ⟵ الركبتان متباعدتان.",
    ], [
      "Prostrating on the floor in the early weeks because the pain has eased → the chair until the surgeon's review; the risk is in the position, not the pain.",
      "Rising from prostration by pushing the operated leg back with the foot turned out (anterior and lateral approaches) → rise with support and the foot facing forward.",
      "Knees together and turned in during prostration (posterior approach) → knees apart.",
    ]],
    easier: ["الصلاةُ كلُّها جالساً على الكرسيّ.", "The whole prayer seated on the chair."],
    harder: ["الصلاةُ كاملةً على الأرض بإسنادٍ قريب، ثمّ بلا إسناد — بإذن الجرّاح.", "The full prayer on the floor with support nearby, then without — with the surgeon's agreement."],
    stopIf: ["ألمٌ مفاجئ في الورك أو الأربية مع «طقّة» أو إحساسٌ بخروج المفصل — يتوقّف ويُبلَّغ الجرّاح، ولا يُحاوَل الوضعُ ثانيةً.", "Sudden hip or groin pain with a clunk or a feeling of the joint slipping — stop and tell the surgeon, and do not try the position again."],
    equipment: ["كرسيٌّ ثابت، وسجّادة، ووسادةٌ منخفضة، وكرسيٌّ أو طاولةٌ للإسناد.", "A firm chair, a prayer mat, a low cushion, and a chair or table for support."],
    doseNote: ["على الكرسيّ من أوّل يوم؛ والتدرّجُ إلى الأرض بعد زيارة الأسبوع السادس وإذن الجرّاح.", "On a chair from day one; the graded return to the floor after the six-week visit and the surgeon's agreement."],
    images: [{ key: "prayer-progression-hip-1", ar: "رجلٌ مسنّ يصلّي جالساً على كرسيٍّ ويومئ بالسجود", en: "An older man praying seated on a chair, bowing for prostration", search: "praying on a chair elderly muslim" }],
  },
  // ═══ المرحلتان ٢ و٣ ═══
  {
    code: "pelvic-drop-step", nameAr: "رفع الحوض وخفضه واقفاً على درجة (تقوية الألوية الوسطى)", nameEn: "Pelvic drop and raise on a step (gluteus medius)",
    kind: "strength", region: "hip", perSide: true, sets: 2, reps: 10, hold: 2,
    purpose: ["الألويةُ الوسطى تحمل الحوضَ مستوياً حين يقف المريضُ على ساقٍ واحدة في كلّ خطوة، وضعفُها يبقى أشهراً بعد العملية (Rasch 2010 · Ismailidis 2021) فيسبّب العرج؛ و«رفعُ الحوض وخفضُه واقفاً» محطّةٌ في برنامج Monaghan 2017، وتمارينُ الحمل في الوقوف رفعت قوّةَ التبعيد ٤١٪ (Trudelle-Jackson 2004).",
      "The gluteus medius holds the pelvis level each time the patient stands on one leg in a step, and its weakness lasts months after surgery (Rasch 2010 · Ismailidis 2021), causing a limp; 'pelvic raise and lower in standing' is a station of the Monaghan 2017 programme, and weight-bearing exercise raised abductor strength by 41% (Trudelle-Jackson 2004)."],
    start: ["واقفٌ جانباً على درجةٍ ثابتة (١٠ سم) على الساق المعمولة، والساقُ السليمة معلّقةٌ بجانب الدرجة، واليدان على الدرابزين أو الحائط، والركبتان مستقيمتان.",
      "Standing sideways on a firm step (10 cm) on the operated leg, the good leg hanging beside the step, hands on the rail or wall, both knees straight."],
    steps: [[
      "دع حوضَ الجهة السليمة ينزل ببطء نحو الأرض قليلاً (٢–٣ سم) والركبتان مستقيمتان.",
      "ارفعه بشدّ ألوية الساق التي تقف عليها حتى يصير أعلى من المستوى قليلاً.",
      "اثبت ثانيتين، ثمّ عد إلى المستوى.",
      "كرّر ١٠ مرّات.",
    ], [
      "Let the pelvis on the good side drop slowly towards the floor a little (2–3 cm), both knees straight.",
      "Lift it by tightening the glutes of the leg you stand on until it is slightly above level.",
      "Hold 2 seconds, then return to level.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "ثنيُ الركبة التي يقف عليها لينزل ⟵ الركبتان مستقيمتان والحركةُ من الحوض.",
      "ميلُ الجذع إلى الجانب ⟵ الكتفان مستويان والجذعُ منتصب.",
      "دورانُ الحوض للأمام أو للخلف ⟵ الحوضُ يتحرّك للأعلى والأسفل وحده.",
    ], [
      "Bending the standing knee to drop → both knees straight, the movement from the pelvis.",
      "Leaning the trunk sideways → shoulders level, trunk upright.",
      "Rotating the pelvis forwards or backwards → the pelvis moves up and down only.",
    ]],
    easier: ["على الأرض بلا درجة: الوقوفُ على الساق المعمولة ورفعُ الحوض المقابل قليلاً، واليدان على الطاولة.", "On the floor without a step: stand on the operated leg and lift the opposite side of the pelvis a little, hands on the table."],
    harder: ["بيدٍ واحدة ثمّ بإصبعٍ للتوازن، وثباتٌ أطول (٥ ثوانٍ).", "One hand, then one finger for balance, and a longer hold (5 seconds)."],
    stopIf: ["ألمٌ حادّ في الورك أو الأربية أو جانب الفخذ، أو عدمُ ثباتٍ يخيف من السقوط.", "Sharp pain in the hip, groin or side of the thigh, or unsteadiness that risks a fall."],
    equipment: ["درجةٌ ثابتة (١٠ سم) أو أوّلُ درجات السلّم، ودرابزين.", "A firm step (10 cm) or the bottom stair, and a rail."],
    doseNote: ["٢ × ١٠ من المرحلة الثانية، يومياً أو في أيّام القوّة.", "2 × 10 from phase 2, daily or on the strength days."],
    images: [{ key: "pelvic-drop-step-1", ar: "واقفٌ جانباً على درجة على ساقٍ واحدة والساقُ الأخرى معلّقة ويرفع حوضَ جهتها", en: "Standing sideways on a step on one leg, the other leg hanging, raising that side of the pelvis", search: "pelvic drop hip hike exercise on step" }],
  },
  {
    code: "clamshell", nameAr: "تمرين الصدفة في الاستلقاء على الجنب", nameEn: "Clamshell",
    kind: "strength", region: "hip", perSide: true, sets: 2, reps: 10, hold: 2,
    purpose: ["يقوّي الألويةَ الوسطى والمدوِّراتِ الخارجية للورك بلا حملٍ كامل للساق؛ ولم تختبر تجربةٌ أمانَه بعد الاستبدال، فيُبدأ به بعد المدخل الأماميّ من المرحلة الثانية، وبعد المدخل الخلفيّ بإذن الجرّاح، وبعد المدخل الجانبيّ بعد ستّة أسابيع — والوركُ المعمول إلى الأعلى ووسادةٌ بين الركبتين.",
      "Strengthens the gluteus medius and the hip external rotators without the full weight of the leg; no trial has tested its safety after replacement, so it starts from phase 2 after an anterior approach, with the surgeon's agreement after a posterior approach, and after six weeks after a direct lateral approach — with the operated hip uppermost and a pillow between the knees."],
    start: ["مستلقٍ على الجنب السليم والوركُ المعمول إلى الأعلى، والوركان والركبتان مثنيّان قليلاً (الوركان نحو ٤٥° لا أكثر)، ووسادةٌ بين الركبتين، والقدمان متلاصقتان.",
      "Lying on the good side with the operated hip uppermost, hips and knees slightly bent (hips about 45°, no more), a pillow between the knees and the feet together."],
    steps: [[
      "شدّ البطن قليلاً وثبّت الحوضَ بيدك على عظم الورك.",
      "افتح الركبةَ العليا إلى الأعلى قليلاً والقدمان متلاصقتان، بلا أن يدور الحوضُ للخلف.",
      "اثبت ثانيتين، ثمّ أنزلها ببطء إلى الوسادة.",
      "كرّر ١٠ مرّات.",
    ], [
      "Brace the abdomen lightly and steady the pelvis with your hand on the hip bone.",
      "Open the top knee upwards a little, feet together, without the pelvis rolling back.",
      "Hold 2 seconds, then lower slowly to the pillow.",
      "Repeat 10 times.",
    ]],
    cues: [[
      "دورانُ الحوض للخلف لترتفع الركبة ⟵ الحوضُ ثابتٌ عمودياً والحركةُ صغيرة.",
      "نزولُ الركبة العليا تحت مستوى الوسادة (ضمٌّ عبر الوسط) ⟵ تعود إلى الوسادة وحدها.",
      "ثنيُ الوركين كثيراً ⟵ نحو ٤٥° فقط.",
    ], [
      "Rolling the pelvis back to lift the knee → pelvis stacked vertically, a small movement.",
      "The top knee dropping below the pillow (adduction across the midline) → back to the pillow only.",
      "Bending the hips too far → about 45° only.",
    ]],
    easier: ["مدىً أصغر بلا ثبات.", "A smaller range without a hold."],
    harder: ["مطّاطٌ خفيف حول الفخذين فوق الركبتين — لا بعد المدخل الجانبيّ قبل ستّة أسابيع.", "A light band around the thighs above the knees — not before six weeks after a direct lateral approach."],
    stopIf: ["ألمٌ حادّ في الورك أو «طقّة» أو إحساسٌ بخروج المفصل، أو ألمٌ في الجرح عند الاستلقاء.", "Sharp hip pain, a clunk or a feeling of the joint slipping, or wound pain when lying down."],
    equipment: ["سريرٌ أو فرشة، ووسادة، ولاحقاً مطّاطٌ خفيف.", "A bed or mat, a pillow, and later a light band."],
    doseNote: ["٢ × ١٠ يومياً حين يُسمح به، ثمّ بالمطّاط.", "2 × 10 daily once allowed, then with the band."],
    images: [{ key: "clamshell-1", ar: "مستلقٍ على جنبه والركبتان مثنيّتان ويفتح الركبةَ العليا والقدمان متلاصقتان", en: "Lying on the side with the knees bent, opening the top knee with the feet together", search: "clamshell exercise hip side lying" }],
  },
];

const PAIN_HOLD_AR = "قاعدةُ التوقّف (اقتراحٌ على نمط Bade 2011 في الركبة ومراقبة الألم في Mikkelsen 2017): ألمٌ يبقى ساعتين فأكثر بعد الجلسة، أو ألمُ الراحة يزيد نقطتين، أو عرجٌ جديد أو أشدّ ⟵ لا تُزاد الشدّة؛ واثنتان منها ⟵ تُخفَّف في الجلسة التالية؛ والألمُ المتصاعد يوماً بعد يوم أو ألمُ الليل الجديد ⟵ الجرّاح.";
const PAIN_HOLD_EN = "Hold rule (a proposal modelled on Bade 2011 in the knee and the pain monitoring of Mikkelsen 2017): soreness lasting 2 hours or more after the session, resting pain up 2 points, or a new or worse limp → do not progress; two of them → reduce intensity next session; pain rising day by day or new night pain → the surgeon.";
const EXTEND_AR = "وفي الجلسة ١٨: تمديدٌ واحد بستّ جلسات (حتى ٢٤) إن لم يتحقّق واحدٌ أو أكثر من معايير الخروج وكان ما يزال يتحسّن — تحسّنٌ منذ الجلسة ١٢ فوق أدنى تغيّرٍ حقيقيّ في واحدٍ من: «النهوض والمشي» (٢٫٥ ثانية) أو المشي ستّ دقائق (٦١ متراً) أو «الجلوس والوقوف ٣٠ ثانية» (مرّتان) — أو بقي عجزٌ في الأنشطة اليومية أو ضعفٌ إدراكيّ (NICE NG157)؛ ولا تمديدَ لمن ثبت بلا تغيّرٍ ستَّ جلسات — بل مراجعةُ الجرّاح.";
const EXTEND_EN = "At session 18: one extension of six sessions (to 24) if one or more discharge criteria are unmet and the patient is still improving — a gain since session 12 beyond the minimal detectable change in one of Timed Up and Go (2.5 s), the six-minute walk (61 m) or the 30-second chair stand (2 repetitions) — or if difficulty with daily activities or cognitive impairment remains (NICE NG157); no extension for a patient with no change over six sessions — refer to the surgeon instead.";

export const PROTOCOL: ProtocolContentSeed = {
  code: "tha-geriatric",
  summary: [
    "التأهيلُ بعد استبدال مفصل الورك الكلّيّ (Total hip arthroplasty — THA) عند البالغين وكبار السنّ — من وصول المريض إلى المركز (غالباً في الأسبوع الأوّل إلى الثالث بعد العملية) إلى المشي بلا أداةٍ ولا عرج، والدرجِ، والاستقلالِ في البيت، والعودةِ إلى الصلاة. " +
    "والدليلُ هنا أقلُّ منه في الركبة: لا دليلَ إرشاديّ لجمعية المعالجين الأمريكية (APTA) للورك، وتقول AAOS 2023: العلاجُ الطبيعيّ الرسميّ أو التمرينُ المنزليّ بلا إشراف (دليلٌ عالي الجودة وتوصيةٌ متوسّطة) مع «ميلٍ طفيف» للعلاج الرسميّ، وتقول NICE NG157 بالتأهيل الذاتيّ لأكثر المرضى والإشرافِ لمن يعجز عن أنشطته اليومية أو لم ينفعه البرنامجُ الذاتيّ. " +
    "فالإشرافُ وحده ليس هو الفائدة: يفيد حين يعطي ما لا يعطيه المريضُ لنفسه — التقويةَ الثقيلة المتدرّجة (Husby 2009 · Winther 2018 · Mikkelsen 2014) وتدريبَ المشي والوظيفة (Heiberg 2012 · Monaghan 2017) — والتمارينُ الخفيفة المعتادة أضعفُها دليلاً. " +
    "وسؤالُ الورك الخاصّ — قيودُ الحركة بعد العملية: التجاربُ لم تجد أنّ القيودَ الصارمة تمنع الخلع (Korfitsen 2023 · Yadav 2026) بل أبطأت العودة؛ فتعليماتُ الجرّاح المكتوبة تحكم، وإن لم تُكتب يتجنّب المريضُ أوضاعاً مركّبةً بعينها بحسب مدخل عمليته ستّةَ أسابيع ويتّقي السقوطَ — سببَ ربع الخلوع (Reimert 2022). " +
    "ثلاثُ مراحل بنطاقات جلساتٍ ومعايير رقمية تحكم الانتقالَ لا التاريخ: الحمايةُ والمشيُ والاستقلالُ اليوميّ، ثمّ التقويةُ المتدرّجة وتخفيفُ أداة المشي، ثمّ الوظيفةُ والتحمّلُ والعودة.",
    "Rehabilitation after total hip arthroplasty (THA) in adults and older adults — from arrival at the centre (usually in post-op weeks 1–3) to walking without an aid or a limp, stairs, independence at home, and return to prayer. " +
    "The evidence is thinner than for the knee: there is no American Physical Therapy Association (APTA) guideline for the hip; AAOS 2023 supports either formal physical therapy or unsupervised home exercise (high-quality evidence, moderate recommendation) with a 'slight favor' for formal therapy; and NICE NG157 advises self-directed rehabilitation for most patients and supervised rehabilitation for those who struggle with daily activities or whose self-directed programme is not working. " +
    "So supervision alone is not the benefit: it helps when it delivers what patients cannot give themselves — heavy progressive strengthening (Husby 2009 · Winther 2018 · Mikkelsen 2014) and walking and functional training (Heiberg 2012 · Monaghan 2017) — while light conventional exercise has the weakest support. " +
    "The hip-specific question — movement restrictions after surgery: trials found that strict restrictions do not prevent dislocation (Korfitsen 2023 · Yadav 2026) and slow the return to activity; so the surgeon's written instructions govern, and if none are written the patient avoids specific combined positions for six weeks according to the approach and guards against falls — the cause of a quarter of dislocations (Reimert 2022). " +
    "Three phases with session ranges and numeric criteria that govern progression, not the calendar: protection, walking and daily independence; then progressive strengthening and stepping down the walking aid; then function, endurance and return.",
  ],
  goals: [
    "• جرحٌ ملتئمٌ بلا علامات التهاب، وألمٌ تحت السيطرة، ولا خلعَ ولا سقوط.\n" +
    "• مشيٌ في البيت بلا أداة (والعصا في الشارع اختيارٌ لا حاجة) بلا عرجٍ ولا ميلٍ للجذع (مشيةُ ترندلنبرغ)، ودرجٌ درجةً بعد درجة بالدرابزين.\n" +
    "• قوّةُ الألوية والفخذ تزيد بالأثقال أسبوعاً بعد أسبوع، والوقوفُ على الساق المعمولة ٥ ثوانٍ فأكثر بلا سقوط الحوض.\n" +
    "• «النهوض والمشي» (TUG) ضمن حدّ عمره، و«الجلوس والوقوف ٣٠ ثانية» يتحسّن فوق أدنى تغيّرٍ حقيقيّ، ونتائجُ الورك المختصر (HOOS-JR) ٧٧ فأكثر أو تحسّنٌ مهمّ.\n" +
    "• استقلالٌ آمن في السرير والكرسيّ والمرحاض والسيارة واللبس بحسب مدخل العملية، وبرنامجٌ منزليٌّ يؤدّيه وحده حتى الأسبوع الثاني عشر، وخطّةٌ للعودة إلى الصلاة على الأرض بإذن الجرّاح.\n" +
    "(الحدودُ الرقمية اقتراحٌ مبنيّ على Hol 2010 وBohannon 2006 وUnver 2015 وKunze 2022 لا دليلٌ مباشر — يقرّرها المشرف.)",
    "• A healed wound without signs of infection, pain under control, and no dislocation or fall.\n" +
    "• Walking at home without an aid (a cane outdoors by choice, not need) with no limp or trunk lean (Trendelenburg gait), and step-over-step stairs with the rail.\n" +
    "• Glute and thigh strength increasing with load week by week, and standing on the operated leg for 5 seconds or more without the pelvis dropping.\n" +
    "• Timed Up and Go (TUG) within the limit for age, the 30-second chair stand improved beyond the minimal detectable change, and the HOOS-JR at 77 or more or an important improvement.\n" +
    "• Safe independence in bed, chair, toilet, car and dressing according to the approach, a home programme done alone until week 12, and a plan for returning to prayer on the floor with the surgeon's agreement.\n" +
    "(The numeric limits are proposals built on Hol 2010, Bohannon 2006, Unver 2015 and Kunze 2022, not direct evidence — the supervisor decides them.)",
  ],
  assessment: [
    "في الجلسة الأولى، وعند كلّ انتقالٍ بين المراحل، وفي الخروج (الجلسات ١ و٦ و١٢ و١٨):\n" +
    "• العملية: تاريخُها، ومدخلُها (خلفيّ، جانبيّ «هاردنج»، أماميّ جانبيّ، أماميّ)، وحجمُ رأس المفصل إن عُرف، وأيُّ عدمِ ثباتٍ أثناء العملية أو قطعٍ للمدوِّر الكبير، وتعليماتُ الجرّاح في الحمل والقيود ومدّتها، ومميّعُ الدم ومدّتُه — وإن لم يعرف المريضُ المدخلَ يُسأل الجرّاح.\n" +
    "• الجرحُ والخطر: الإفراز، والاحمرارُ الممتدّ، والحمّى، وألمُ بطن الساق أو الفخذ وتورّمُه، وسقوطُ القدم أو تنميلُ ظهرها (العصبُ الوركيّ)، وضعفُ الفخذ وانثناءُ الركبة (العصبُ الفخذيّ).\n" +
    "• الألم (NPRS) في الراحة وفي المشي.\n" +
    "• المشي: الأداة، والعرجُ وميلُ الجذع (ترندلنبرغ)، وطولُ الخطوتين؛ والوقوفُ على الساق المعمولة بالثواني بلا سقوط الحوض.\n" +
    "• المقاييسُ في القائمة: «النهوض والمشي» (TUG — أدنى تغيّرٍ حقيقيّ ٢٫٥ ثانية — Kennedy 2005؛ ومتوسّطُ العمر ٨٫١ ثوانٍ في الستّينات و٩٫٢ في السبعينات و١١٫٣ بعد الثمانين — Bohannon 2006)، و«الجلوس والوقوف ٣٠ ثانية» (تغيّرٌ حقيقيّ ١٫٢ مرّة بعد الاستبدال — Unver 2015)، والمشيُ ستّ دقائق من الجلسة السادسة (٦١ متراً — Kennedy 2005)، ونتائجُ الورك المختصر (HOOS-JR — موثّقٌ بعد الاستبدال، Lyman 2016؛ والتحسّنُ المهمّ ٢٣ نقطة والحالُ المقبولة ٧٧–٨١ فأكثر — Dekhne 2024 · Kunze 2022).\n" +
    "• ولا نسخةَ عربيةً موثّقةً من HOOS-JR؛ ومقياسُ أكسفورد للورك بالعربية موجود (Khaja 2020 — من ٤٨، وثباتُه بين مرّتين متوسّط) والتغيّرُ المهمّ للفرد ٨ نقاط (Beard 2015)، ومقياسُ هاريس للورك بالعربية موثّق (Alshaygy 2023) — يضيف المشرفُ أحدَهما، ومعه الوقوفَ على ساقٍ واحدة بالثواني، إلى مقاييس البروتوكول.\n" +
    "• اختياريّ: قوّةُ التبعيد بمقياس القوّة اليدويّ نسبةً إلى الساق السليمة (لا قبل ستّة أسابيع بعد المدخل الجانبيّ)، واختبارُ الدرج (٥٫٥ ثانية — Kennedy 2005)، ومدى الورك بالمقيِّم نفسِه كلَّ مرّة (Holm 2000).\n" +
    "• طولُ الساق: الإحساسُ بطولها شائعٌ في الأسابيع الأولى وأكثرُه من ميل الحوض — لا يُرفع الحذاءُ قبل ستّة أسابيع إلّا بقول الجرّاح.\n" +
    "• البيت: الدرج، ونوعُ المرحاض، وارتفاعُ السرير والكرسيّ، والجلوسُ على الأرض، والصلاة، والسجّاد، ومَن يساعده.",
    "At the first session, at every phase change, and at discharge (sessions 1, 6, 12 and 18):\n" +
    "• The operation: date, approach (posterior, direct lateral 'Hardinge', anterolateral, direct anterior), femoral head size if known, any intraoperative instability or trochanteric osteotomy, the surgeon's instructions on weight bearing, restrictions and their duration, and the blood thinner and its duration — if the patient does not know the approach, ask the surgeon.\n" +
    "• The wound and red flags: discharge, spreading redness, fever, calf or thigh pain and swelling, foot drop or numbness of the top of the foot (sciatic nerve), and thigh weakness with the knee buckling (femoral nerve).\n" +
    "• Pain (NPRS) at rest and when walking.\n" +
    "• Gait: the aid, the limp and trunk lean (Trendelenburg), step lengths; and standing on the operated leg in seconds without the pelvis dropping.\n" +
    "• Listed measures: Timed Up and Go (TUG — minimal detectable change 2.5 s — Kennedy 2005; age means 8.1 s in the sixties, 9.2 in the seventies and 11.3 after eighty — Bohannon 2006), the 30-second chair stand (a real change is 1.2 repetitions after replacement — Unver 2015), the six-minute walk from session 6 (61 m — Kennedy 2005), and the HOOS-JR (validated after replacement, Lyman 2016; the important improvement is 23 points and the acceptable state 77–81 or more — Dekhne 2024 · Kunze 2022).\n" +
    "• There is no validated Arabic HOOS-JR; an Arabic Oxford Hip Score exists (Khaja 2020 — out of 48, with only fair test–retest reliability), with 8 points the important change for the individual (Beard 2015), and the Arabic Harris Hip Score is validated (Alshaygy 2023) — the supervisor adds one of them, together with single-leg stance in seconds, to the protocol measures.\n" +
    "• Optional: abductor strength with a handheld dynamometer as a percentage of the other leg (not before six weeks after a direct lateral approach), the stair climb test (5.5 s — Kennedy 2005), and hip range by the same assessor each time (Holm 2000).\n" +
    "• Leg length: feeling the leg is longer is common in the early weeks and mostly comes from pelvic tilt — no shoe raise before six weeks unless the surgeon says so.\n" +
    "• Home: stairs, the type of toilet, bed and chair height, floor sitting, prayer, rugs, and who helps.",
  ],
  exercises: [
    "البرنامجُ على ثلاث مراحل بالبطاقات في «البرنامج على مراحل»؛ والجلسةُ ٥٠ دقيقة نحو:\n" +
    "• ٥ دقائق: الجرحُ والألمُ والمشي، والأوضاعُ الآمنة لمدخله، وقاعدةُ التوقّف.\n" +
    "• ١٠–١٥ دقيقة: جهازٌ مساعدٌ واحد بالتناوب لمن يحتاجه (التحفيزُ لعضلة الفخذ الضعيفة، أو المغناطيس) — قبل التمارين لا بدلها، وإلّا يذهب وقتُه إلى التمارين.\n" +
    "• ٢٥–٣٠ دقيقة: في ثلاثة أيّامٍ غير متتالية «أيّامُ القوّة» — التقويةُ المتدرّجة من ١٢ تكراراً متعباً نحو ٨ (Mikkelsen 2014)؛ وفي الثلاثة الأخرى المشيُ والتوازنُ والوظيفةُ والدرّاجة.\n" +
    "• ٥–١٠ دقائق: المشيُ والدرجُ والانتقالات، والبرنامجُ المنزليّ.\n" +
    "العدد: ١٨ جلسة × ستّ في الأسبوع (ثلاثةُ أسابيع). التجاربُ التي نفعت أعطت ١٢–٣٦ جلسةً مشرَفاً عليها، جلستين إلى خمسٍ في الأسبوع أربعةً إلى اثني عشر أسبوعاً (Monaghan 2017 · Heiberg 2012: ١٢، Husby 2009 · Mikkelsen 2014: نحو ٢٠، Winther 2018: ٢٤، Suetta 2004: ٣٦)، ولم تختبر تجربةٌ ستَّ جلساتٍ في الأسبوع — فهذا نموذجُ المركز لا دليل. " +
    "والعددُ ١٨ لا ٢٤ كالركبة لأنّ الورك يتعافى أسرع (Judd 2019)، ولأنّ أكثرَ المرضى يتحسّنون ببرنامجٍ منزليٍّ منظَّم (AAOS 2023 · NICE NG157 · Coulter 2013) — فالإشرافُ لما لا يعطيه المريضُ لنفسه، والبرنامجُ المنزليّ يستمرّ حتى الأسبوع الثاني عشر، ومتابعتُه عن بُعد تعادل الحضورَ لمن يسكن بعيداً (Nelson 2020).\n" +
    "والمراجعات: لا فرقَ واضحاً بين الإشراف والبرنامج المنزليّ المنظَّم، والفرقُ إن وُجد صغيرٌ قصيرُ المدى لصالح الإشراف (Hansen 2019 · Chaudhry 2022)، وتجربتان لم تجدا فرقاً (Coulter 2017 · Austin 2017)، والدليلُ لا يكفي لبناء بروتوكولٍ مفصَّل (Minns Lowe 2009 · Di Monaco 2013 · Wijnen 2018). والدليلُ الهولنديّ يحيل المعرَّضين لتعافٍ بطيء إلى تقويةٍ وتمرينٍ هوائيٍّ ووظيفيّ مشرَفٍ عليه ويكتفي لغيرهم بتعليم التمارين ومتابعتها (Swierstra 2011 · van Doormaal 2020)، وإجماعُ خبراء كندا والولايات المتّحدة يرى تأهيلاً مشرَفاً عليه مبكّراً بعد الخروج (Westby 2014) — فالمعرَّضون أوّلى بالدورة كاملة (وتعريفُهم اقتراح): فوق ٧٥ عاماً، أو مؤشّرُ كتلةٍ ٣٥ فأكثر، أو السكّريّ، أو وظيفةٌ ضعيفة قبل العملية، أو خلعُ الورك الولاديّ، أو العمليةُ في الوركين، أو مَن يعيش وحده.\n" +
    EXTEND_AR + "\n" +
    "ومَن يصل في الأسبوع الأوّل تكون جلساتُه الأولى للمشي والانتقالات واليوميّات وتمارينَ بلا ثقل؛ ومَن يصل في الأسبوع الثالث ويحقّق معيارَ الأولى في التقييم يبدأ بالثانية (يختار الأخصائيُّ المرحلةَ في الجلسة). وأكثرُ الدورة يقع داخل الأسابيع الستّة التي يُبقي فيها الجرّاحون قيودَهم — فالأرضُ والسجودُ بعد زيارة الجرّاح، في التمديد أو في البيت.\n" +
    "وفي الأسبوع الثاني عشر مراجعة («النهوض والمشي» و«الجلوس والوقوف» وHOOS-JR وقوّةُ التبعيد)؛ ومَن بقي عرجُه أو ضعفُه تفيده دورةٌ متأخّرة من ١٢ جلسة جلستين في الأسبوع (Monaghan 2017 · Heiberg 2012).\n" +
    "ومَن يأتي قبل العملية: جلسةُ تعليمٍ واحدة — التمارين، والمشّاية أو العكّازان، وتهيئةُ البيت (المرحاضُ المرتفع، والكرسيّ، وإزالةُ السجّاد)، والوزنُ والسكّر، والصلاة؛ وفائدةُ التمرين قبل العملية صغيرةٌ مبكّرة تزول بعد سنة (Holsgaard-Larsen 2020 · Konnyu 2023)، فدورةٌ قصيرة من ٦–١٠ جلسات لمن ضعفت وظيفتُه وحدهم.",
    "The programme runs in three phases with the cards under 'Programme by phase'; a 50-minute session is roughly:\n" +
    "• 5 minutes: wound, pain and gait, the safe positions for the approach, and the hold rule.\n" +
    "• 10–15 minutes: one adjunct device in rotation for those who need it (NMES for a weak quadriceps, or magnetic therapy) — before exercise, never instead of it; otherwise the time goes to exercise.\n" +
    "• 25–30 minutes: on three non-consecutive 'strength days', progressive strengthening from a tiring 12 repetitions towards 8 (Mikkelsen 2014); on the other three, walking, balance, function and cycling.\n" +
    "• 5–10 minutes: walking, stairs and transfers, and the home programme.\n" +
    "The number: 18 sessions × six a week (three weeks). Trials that helped gave 12–36 supervised sessions, two to five a week over four to twelve weeks (Monaghan 2017 · Heiberg 2012: 12, Husby 2009 · Mikkelsen 2014: about 20, Winther 2018: 24, Suetta 2004: 36), and no trial tested six sessions a week — that is the centre's format, not evidence. " +
    "Eighteen rather than the knee's 24 because the hip recovers faster (Judd 2019), and because most patients improve with a structured home programme (AAOS 2023 · NICE NG157 · Coulter 2013) — supervision is for what patients cannot give themselves, the home programme continues to week 12, and remote follow-up matches in-person care for those who live far away (Nelson 2020).\n" +
    "The reviews: no clear difference between supervision and a structured home programme, any difference small, short-term and favouring supervision (Hansen 2019 · Chaudhry 2022), two trials found none (Coulter 2017 · Austin 2017), and the evidence is not enough to build a detailed protocol (Minns Lowe 2009 · Di Monaco 2013 · Wijnen 2018). The Dutch guideline refers patients at risk of slow recovery to supervised strength, aerobic and functional training and, for the rest, teaches and monitors the exercises (Swierstra 2011 · van Doormaal 2020), and a Canada–United States expert consensus favours early supervised rehabilitation after discharge (Westby 2014) — so patients at risk come first for the full course (a proposed definition): over 75, a body mass index of 35 or more, diabetes, poor function before surgery, developmental dysplasia, both hips operated, or living alone.\n" +
    EXTEND_EN + "\n" +
    "A patient arriving in week 1 spends the first sessions on walking, transfers, daily activities and unloaded exercise; one arriving in week 3 who meets the phase 1 criteria at assessment starts phase 2 (the specialist chooses the phase in the session). Most of the course falls inside the six weeks during which surgeons keep their restrictions — so floor sitting and prostration come after the surgeon's review, in the extension or at home.\n" +
    "At week 12 a review (Timed Up and Go, the chair stand, the HOOS-JR and abductor strength); a patient with a persisting limp or weakness benefits from a late course of 12 sessions, two a week (Monaghan 2017 · Heiberg 2012).\n" +
    "A patient seen before surgery: one teaching session — exercises, the frame or crutches, preparing the home (a raised toilet, a chair, rugs removed), weight and blood sugar, and prayer; the benefit of exercise before surgery is small, early and gone by one year (Holsgaard-Larsen 2020 · Konnyu 2023), so a short course of 6–10 sessions is only for those with poor function.",
  ],
  contraindications: [
    "• خلعٌ محتمل: ألمٌ شديدٌ مفاجئ في الورك أو الأربية — غالباً مع «طقّة» بعد وضعٍ خطر أو سقطة — وعجزٌ عن الحمل، وقِصَرٌ ظاهر في الساق (تدور للداخل بعد المدخل الخلفيّ وللخارج بعد الأماميّ) ⟵ يُوقف كلُّ شيء، ولا تُحرَّك الساقُ ولا يُحاوَل ردُّها، ويُنقل إلى الطوارئ أو الجرّاح فوراً، ويُكتب الوضعُ الذي حدث فيه.\n" +
    "• ألمٌ أو تورّمٌ أو سخونةٌ في بطن الساق أو الفخذ من جهةٍ واحدة يزيد على تورّم العملية المعتاد (جلطةٌ وريدية محتملة) ⟵ لا تمارينَ ولا تحفيز، وإحالةٌ في اليوم نفسِه؛ وضيقُ نفسٍ مفاجئ أو ألمٌ في الصدر أو سعالٌ بدم ⟵ إسعافٌ فوراً.\n" +
    "• علاماتُ التهاب المفصل الصناعيّ: إفرازٌ من الجرح بعد الأيّام الأولى، واحمرارٌ ينتشر، وانفتاحُ الجرح، وحمّى، وألمٌ جديد أو متزايد في الراحة بعد تحسّن، أو فتحةٌ تُفرز ⟵ إلى الجرّاح في اليوم نفسِه، ولا تمرينَ فوق جرحٍ يُفرز (Parvizi 2018).\n" +
    "• كسرٌ حول المفصل: ألمٌ مفاجئ وعجزٌ عن الحمل بعد سقطةٍ أو التواء ⟵ صورةٌ شعاعية.\n" +
    "• الأعصاب: سقوطُ القدم أو تنميلُ ظهرها (العصبُ الوركيّ — ٠٫١٧–٠٫٣٦٪، وأكثرُ مع خلع الورك الولاديّ والمدخل الخلفيّ وتطويل الساق — Farrell 2005 · Alturki 2026)، أو ضعفُ الفخذ وانثناءُ الركبة وتنميلُ مقدّمه (العصبُ الفخذيّ بعد المدخل الأماميّ — Zeiman 2025) ⟵ إلى الجرّاح، والجديدُ أو المتزايد عاجل (قد يكون ورماً دموياً)، وجبيرةُ القدم ووقايةُ السقوط.\n" +
    "• التكلّسُ حول المفصل (Heterotopic ossification): نقصٌ متزايد في المدى بين الأسبوع الثالث والثاني عشر مع ألمٍ عميق — وأكثرُه بعد المداخل الجانبية (Herzberg 2024) ⟵ صورةٌ شعاعية، ولا يُجبَر المدى.\n" +
    "• الأجهزة: لا شدَّ يعبر الورك المستبدل؛ ولا موجاتٍ قصيرةً ولا تيكارَ مقاوِماً أو ثنائيَّ القطب يعبر تيارُه المفصلَ المعدنيّ (Almalty 2023 · García-Marín 2021)؛ ولا موجاتٍ صادمة قربَ المفصل؛ ولا حرارةَ فوق الورك المعمول في الأسابيع الستّة الأولى أو والجرحُ لم يلتئم (Houghton 2010)؛ ولا إبرَ جافة حول الورك (Cornette 2024)؛ والتحفيزُ الكهربائيّ لا على الجرح ولا مع جلطةٍ أو شكٍّ فيها ولا مع منظّم ضربات القلب.",
    "• Possible dislocation: sudden severe hip or groin pain — often with a clunk after a risky position or a fall — inability to bear weight, and a visibly shortened leg (turned in after a posterior approach, out after an anterior one) → stop everything, do not move the leg or try to put it back, transfer to the emergency department or the surgeon at once, and record the position in which it happened.\n" +
    "• Pain, swelling or warmth in one calf or thigh beyond the usual post-operative swelling (possible venous thrombosis) → no exercise or stimulation, and same-day referral; sudden breathlessness, chest pain or coughing blood → emergency at once.\n" +
    "• Signs of periprosthetic infection: wound discharge after the first days, spreading redness, wound breakdown, fever, new or rising pain at rest after improving, or a discharging opening → to the surgeon the same day, and no exercise over a draining wound (Parvizi 2018).\n" +
    "• Periprosthetic fracture: sudden pain and inability to bear weight after a fall or twist → radiograph.\n" +
    "• Nerves: foot drop or numbness of the top of the foot (sciatic nerve — 0.17–0.36%, more with developmental dysplasia, a posterior approach and lengthening — Farrell 2005 · Alturki 2026), or thigh weakness with the knee buckling and front-of-thigh numbness (femoral nerve after an anterior approach — Zeiman 2025) → to the surgeon; a new or worsening deficit is urgent (possible haematoma), with a foot splint and fall prevention.\n" +
    "• Heterotopic ossification: progressive loss of range between weeks 3 and 12 with deep pain — most common after lateral approaches (Herzberg 2024) → radiograph, and range is not forced.\n" +
    "• Devices: no traction across the replaced hip; no shortwave, and no resistive or bipolar Tecar with current crossing the metal implant (Almalty 2023 · García-Marín 2021); no shockwave near the implant; no heat over the operated hip in the first six weeks or while the wound is unhealed (Houghton 2010); no dry needling around the hip (Cornette 2024); and electrical stimulation not over the wound, not with a known or suspected clot, and not with a pacemaker.",
  ],
  precautions: [
    "• القيودُ بحسب المدخل: تعليماتُ الجرّاح المكتوبة تحكم؛ وإن لم تُكتب فستّةُ أسابيع لا يجتمع فيها الثنيُ فوق ٩٠° مع الضمّ والتدوير للداخل (الخلفيّ)، ولا البسطُ مع التدوير للخارج (الأماميّ — وأكثرُ خلوعه خلفيةٌ مع ذلك: Christensen 2023)، ولا تبعيدٌ ضدّ مقاومة (الجانبيّ — رأيُ خبراء). والقيودُ الصارمة لم تقلّل الخلعَ في التجارب (Peak 2005 · Gromov 2015 · Dietz 2019 · Tetreault 2020 · Korfitsen 2023 · Yadav 2026) ولا في Cochrane (Smith 2016) — فلا تُخترع قيودٌ لم يكتبها الجرّاح؛ لكنّ المرضى بلا قيود لم يعرفوا كيف يتقدّمون (Lightfoot 2021)، فيُعلَّمون الحركةَ الآمنة. والخلعُ قد يتأخّر (متوسّطُه ٩ أشهر في Yadav 2026).\n" +
    "• السقطةُ سببُ ربع الخلوع (Reimert 2022): فحصُ السقوط بـ«النهوض والمشي» والوقوفِ على ساق، وتأمينُ البيت.\n" +
    "• " + PAIN_HOLD_AR + "\n" +
    "• الحمل: بقدر ما يحتمل بعد المفصل الإسمنتيّ وأكثر غير الإسمنتيّ (Hol 2010 · Wolf 2010) — إلّا مع كسرٍ أثناء العملية أو قطعِ المدوِّر أو طُعمٍ عظميّ أو إعادةِ استبدال: قيدُ الجرّاح يحكم.\n" +
    "• مميّعُ الدم (NICE NG89 — نحو ٢٨–٣٨ يوماً بعد استبدال الورك): الكدماتُ أسهل — حذرٌ مع العمل العميق على الأنسجة.\n" +
    "• الألويةُ الوسطى: ضعفُها أكبرُه بعد المدخل الجانبيّ في الأيّام الأولى (Winther 2016) ويبقى أشهراً بعد كلّ مدخل (Judd 2014 · Rasch 2010) — فالعرجُ يُعالَج بالقوّة لا بالانتظار.\n" +
    "• العراق: مؤشّرُ الكتلة كان المتنبّئَ الوحيد بنتيجةٍ أسوأ في دراسةٍ عراقية (Yaseen 2019)، ومدخلُ هاردنج مستعمَلٌ في بغداد (Abbas 2024)، وخلعُ الورك الولاديّ شائعٌ في المرضى العرب (٤٠٪ في الأردن — Alswerki 2024) ويرفع خطرَ أذى العصب ويعقّد العملية — فيُعامَل بحذرٍ أكبر حتى يقول الجرّاحُ غيرَ ذلك.\n" +
    "• السكّريّ: ٨٫٩٪ من البالغين في العراق مشخَّصون و٨٫١٪ غيرُ مشخَّصين (Pengpid 2022)، والسمنةُ ٣٣٫٩٪ (Pengpid 2021) — ويرفعان المضاعفات (AAOS 2023): مراقبةُ الجرح، وكراسٍ أمتن وأعلى، وأداةٌ أطولُ مدّة عند الحاجة.\n" +
    "• الصلاةُ والأرض: لا دراسةَ عن الصلاة بعد الاستبدال؛ وعاد إلى القرفصاء نحو ٧٠٪ في اليابان (Harada 2022)، وإلى الجلوس على الأرض ٢١٫٧٪ فقط بعد المدخل الخلفيّ الجانبيّ في تايلاند (Nawatthakul 2022) — فالتوقّعاتُ تُقال من الجلسة الأولى، والكرسيُّ أوّلاً، والحكمُ الشرعيّ للمريض ومرجعه.\n" +
    "• المرحاضُ العربيّ: مقعدٌ مرتفع أو كرسيُّ حمّام من أوّل يوم لكلّ مدخل — اثنان من أربعة خلوعٍ في سلسلةٍ كبيرة وقعا على المرحاض (Restrepo 2011).\n" +
    "• الأسرة: يُعلَّم أحدُهم الأوضاعَ الآمنة والبرنامجَ المنزليّ.",
    "• Restrictions by approach: the surgeon's written instructions govern; if none are written, for six weeks flexion past 90° is not combined with adduction and inward rotation (posterior), extension is not combined with outward rotation (anterior — though most of its dislocations are still posterior: Christensen 2023), and there is no resisted abduction (direct lateral — expert opinion). Strict restrictions did not reduce dislocation in trials (Peak 2005 · Gromov 2015 · Dietz 2019 · Tetreault 2020 · Korfitsen 2023 · Yadav 2026) or in Cochrane (Smith 2016) — so restrictions the surgeon has not written are not invented; yet patients without restrictions were unsure how to progress (Lightfoot 2021), so safe movement is taught. Dislocation can come late (a mean of 9 months in Yadav 2026).\n" +
    "• Falls cause a quarter of dislocations (Reimert 2022): screen for falls with Timed Up and Go and single-leg stance, and make the home safe.\n" +
    "• " + PAIN_HOLD_EN + "\n" +
    "• Weight bearing: as tolerated after a cemented and most uncemented implants (Hol 2010 · Wolf 2010) — except with an intraoperative fracture, trochanteric osteotomy, bone graft or revision: the surgeon's restriction governs.\n" +
    "• Blood thinners (NICE NG89 — about 28–38 days after hip replacement): bruising comes more easily — care with deep soft-tissue work.\n" +
    "• Gluteus medius: its weakness is greatest in the first days after a direct lateral approach (Winther 2016) and lasts months after every approach (Judd 2014 · Rasch 2010) — so a limp is treated with strength, not waiting.\n" +
    "• Iraq: body mass index was the only predictor of a worse result in an Iraqi study (Yaseen 2019), the Hardinge approach is used in Baghdad (Abbas 2024), and developmental dysplasia is common among Arab patients (40% in Jordan — Alswerki 2024), raising nerve risk and surgical complexity — so it is treated with extra caution until the surgeon says otherwise.\n" +
    "• Diabetes: 8.9% of adults in Iraq are diagnosed and 8.1% undiagnosed (Pengpid 2022), and obesity is 33.9% (Pengpid 2021) — both raise complications (AAOS 2023): watch the wound, use sturdier and higher seats, and keep the aid longer when needed.\n" +
    "• Prayer and the floor: there is no study of prayer after replacement; about 70% returned to squatting in Japan (Harada 2022), but only 21.7% to floor sitting after a posterolateral approach in Thailand (Nawatthakul 2022) — so expectations are set from the first session, the chair comes first, and the religious ruling belongs to the patient and their scholar.\n" +
    "• Squat toilets: a raised seat or commode frame from day one for every approach — two of four dislocations in a large series happened on the toilet (Restrepo 2011).\n" +
    "• Family: one of them is taught the safe positions and the home programme.",
  ],
  totalSessions: 18, spw: 6, weeks: 3, minutes: 50,
  refs: [
    { title: "Management of Osteoarthritis of the Hip — Evidence-Based Clinical Practice Guideline (2023 update)", org: "American Academy of Orthopaedic Surgeons (AAOS)", year: 2023, url: "https://www.aaos.org/globalassets/quality-and-practice-resources/osteoarthritis-of-the-hip/oah-cpg.pdf" },
    { title: "American Academy of Orthopaedic Surgeons Clinical Practice Guideline Summary Management of Osteoarthritis of the Hip", org: "Journal of the American Academy of Orthopaedic Surgeons — AAOS 2023 guideline summary (Hannon et al.)", year: 2024, url: "https://doi.org/10.5435/jaaos-d-24-00420" },
    { title: "Management of Osteoarthritis of the Hip — Evidence-Based Clinical Practice Guideline", org: "American Academy of Orthopaedic Surgeons (AAOS)", year: 2017, url: "https://www.aaos.org/oahcpg" },
    { title: "Joint replacement (primary): hip, knee and shoulder (NG157)", org: "National Institute for Health and Care Excellence (NICE)", year: 2020, url: "https://www.nice.org.uk/guidance/ng157" },
    { title: "Venous thromboembolism in over 16s: reducing the risk of hospital-acquired deep vein thrombosis or pulmonary embolism (NG89)", org: "National Institute for Health and Care Excellence (NICE)", year: 2018, url: "https://www.nice.org.uk/guidance/ng89" },
    { title: "Total hip prosthesis (THP) — Post-operative physical therapy THA", org: "Nederlandse Orthopaedische Vereniging — authorised by the Royal Dutch Society for Physical Therapy (KNGF)", year: 2019, url: "https://richtlijnendatabase.nl/richtlijn/total_hip_prosthesis_thp/pre-_and_postoperative_physical_therapy_tha/post-operative_physical_therapy_tha.html" },
    { title: "A clinical practice guideline for physical therapy in patients with hip or knee osteoarthritis", org: "Musculoskeletal Care (van Doormaal et al.)", year: 2020, url: "https://doi.org/10.1002/msc.1492" },
    { title: "Dutch guideline on total hip prosthesis", org: "Acta Orthopaedica (Swierstra et al.)", year: 2011, url: "https://doi.org/10.3109/17453674.2011.623575" },
    { title: "Expert consensus on best practices for post-acute rehabilitation after total hip and knee arthroplasty: a Canada and United States Delphi study", org: "Arthritis Care & Research (Westby et al.)", year: 2014, url: "https://doi.org/10.1002/acr.22164" },
    { title: "Physical Therapist Management of Total Knee Arthroplasty", org: "Physical Therapy — APTA clinical practice guideline (Jette et al.)", year: 2020, url: "https://doi.org/10.1093/ptj/pzaa099" },
    { title: "Early high-intensity rehabilitation following total knee arthroplasty improves outcomes", org: "Journal of Orthopaedic & Sports Physical Therapy (Bade & Stevens-Lapsley)", year: 2011, url: "https://doi.org/10.2519/jospt.2011.3734" },
    { title: "Physiotherapist-directed rehabilitation exercises in the outpatient or home setting improve strength, gait speed and cadence after elective total hip replacement: a systematic review", org: "Journal of Physiotherapy (Coulter et al.)", year: 2013, url: "https://doi.org/10.1016/s1836-9553(13)70198-x" },
    { title: "Supervised or Unsupervised Rehabilitation After Total Hip Replacement Provides Similar Improvements for Patients: A Randomized Controlled Trial", org: "Archives of Physical Medicine and Rehabilitation (Coulter et al.)", year: 2017, url: "https://doi.org/10.1016/j.apmr.2017.03.032" },
    { title: "Formal Physical Therapy After Total Hip Arthroplasty Is Not Required: A Randomized Controlled Trial", org: "Journal of Bone and Joint Surgery (Austin et al.)", year: 2017, url: "https://doi.org/10.2106/jbjs.16.00674" },
    { title: "Effectiveness of physiotherapy exercise following hip arthroplasty for osteoarthritis: a systematic review of clinical trials", org: "BMC Musculoskeletal Disorders (Minns Lowe et al.)", year: 2009, url: "https://doi.org/10.1186/1471-2474-10-98" },
    { title: "Which type of exercise therapy is effective after hip arthroplasty? A systematic review of randomized controlled trials", org: "European Journal of Physical and Rehabilitation Medicine (Di Monaco et al.)", year: 2013, url: "https://europepmc.org/abstract/MED/24172644" },
    { title: "The therapeutic validity and effectiveness of physiotherapeutic exercise following total hip arthroplasty for osteoarthritis: A systematic review", org: "PLoS One (Wijnen et al.)", year: 2018, url: "https://doi.org/10.1371/journal.pone.0194517" },
    { title: "Effects of supervised exercise compared to non-supervised exercise early after total hip replacement on patient-reported function, pain, health-related quality of life and performance-based function - a systematic review and meta-analysis of randomized controlled trials", org: "Clinical Rehabilitation (Hansen et al.)", year: 2019, url: "https://doi.org/10.1177/0269215518791213" },
    { title: "Unsupervised Home Exercises Versus Formal Physical Therapy After Primary Total Hip Arthroplasty: A Systematic Review", org: "Cureus (Chaudhry et al.)", year: 2022, url: "https://doi.org/10.7759/cureus.29322" },
    { title: "Rehabilitation for Total Hip Arthroplasty: A Systematic Review", org: "American Journal of Physical Medicine & Rehabilitation (Konnyu et al.)", year: 2023, url: "https://doi.org/10.1097/phm.0000000000002007" },
    { title: "Effect of early supervised progressive resistance training compared to unsupervised home-based exercise after fast-track total hip replacement applied to patients with preoperative functional limitations. A single-blinded randomised controlled trial", org: "Osteoarthritis and Cartilage (Mikkelsen et al.)", year: 2014, url: "https://doi.org/10.1016/j.joca.2014.09.025" },
    { title: "Description of load progression and pain response during progressive resistance training early after total hip arthroplasty: secondary analyses from a randomized controlled trial", org: "Clinical Rehabilitation (Mikkelsen et al.)", year: 2017, url: "https://doi.org/10.1177/0269215516628305" },
    { title: "Early maximal strength training is an efficient treatment for patients operated with total hip arthroplasty", org: "Archives of Physical Medicine and Rehabilitation (Husby et al.)", year: 2009, url: "https://doi.org/10.1016/j.apmr.2009.04.018" },
    { title: "A randomized controlled trial on maximal strength training in 60 patients undergoing total hip arthroplasty", org: "Acta Orthopaedica (Winther et al.)", year: 2018, url: "https://doi.org/10.1080/17453674.2018.1441362" },
    { title: "Resistance training in the early postoperative phase reduces hospitalization and leads to muscle hypertrophy in elderly hip surgery patients--a controlled, randomized study", org: "Journal of the American Geriatrics Society (Suetta et al.)", year: 2004, url: "https://doi.org/10.1111/j.1532-5415.2004.52557.x" },
    { title: "Resistance training induces qualitative changes in muscle morphology, muscle architecture, and muscle function in elderly postoperative patients", org: "Journal of Applied Physiology (Suetta et al.)", year: 2008, url: "https://doi.org/10.1152/japplphysiol.01354.2007" },
    { title: "Effect of a walking skill training program in patients who have undergone total hip arthroplasty: Followup one year after surgery", org: "Arthritis Care & Research (Heiberg et al.)", year: 2012, url: "https://doi.org/10.1002/acr.20681" },
    { title: "Randomised controlled trial to evaluate a physiotherapy-led functional exercise programme after total hip replacement", org: "Physiotherapy (Monaghan et al.)", year: 2017, url: "https://doi.org/10.1016/j.physio.2016.01.003" },
    { title: "Ergometer cycling after hip or knee replacement surgery: a randomized controlled trial", org: "Journal of Bone and Joint Surgery (Liebs et al.)", year: 2010, url: "https://doi.org/10.2106/jbjs.h.01359" },
    { title: "Physiotherapy exercise after fast-track total hip and knee arthroplasty: time for reconsideration?", org: "Archives of Physical Medicine and Rehabilitation (Bandholm & Kehlet)", year: 2012, url: "https://doi.org/10.1016/j.apmr.2012.02.014" },
    { title: "Telerehabilitation is non-inferior to usual care following total hip replacement - a randomized controlled non-inferiority trial", org: "Physiotherapy (Nelson et al.)", year: 2020, url: "https://doi.org/10.1016/j.physio.2019.06.006" },
    { title: "Progressive resistance training before and after total hip and knee arthroplasty: a systematic review", org: "Clinical Rehabilitation (Skoffer et al.)", year: 2015, url: "https://doi.org/10.1177/0269215514537093" },
    { title: "Effects of progressive resistance training for early postoperative fast-track total hip or knee arthroplasty: A systematic review and meta-analysis", org: "Asian Journal of Surgery (Chen et al.)", year: 2021, url: "https://doi.org/10.1016/j.asjsur.2021.02.007" },
    { title: "Effects of a late-phase exercise program after total hip arthroplasty: a randomized controlled trial", org: "Archives of Physical Medicine and Rehabilitation (Trudelle-Jackson & Smith)", year: 2004, url: "https://doi.org/10.1016/j.apmr.2003.11.022" },
    { title: "Trajectories of functional performance and muscle strength recovery differ after total knee and total hip replacement: a performance-based, longitudinal study", org: "International Journal of Rehabilitation Research (Judd et al.)", year: 2019, url: "https://doi.org/10.1097/mrr.0000000000000344" },
    { title: "Assistive devices, hip precautions, environmental modifications and training to prevent dislocation and improve function after hip arthroplasty", org: "Cochrane Database of Systematic Reviews (Smith et al.)", year: 2016, url: "https://doi.org/10.1002/14651858.cd010815.pub2" },
    { title: "The role of patient restrictions in reducing the prevalence of early dislocation following total hip arthroplasty. A randomized, prospective study", org: "Journal of Bone and Joint Surgery (Peak et al.)", year: 2005, url: "https://doi.org/10.2106/jbjs.c.01513" },
    { title: "Hip dislocation: are hip precautions necessary in anterior approaches?", org: "Clinical Orthopaedics and Related Research (Restrepo et al.)", year: 2011, url: "https://doi.org/10.1007/s11999-010-1668-y" },
    { title: "Removal of restrictions following primary THA with posterolateral approach does not increase the risk of early dislocation", org: "Acta Orthopaedica (Gromov et al.)", year: 2015, url: "https://doi.org/10.3109/17453674.2015.1028009" },
    { title: "Posterior Hip Precautions Do Not Impact Early Recovery in Total Hip Arthroplasty: A Multicenter, Randomized, Controlled Study", org: "Journal of Arthroplasty (Dietz et al.)", year: 2019, url: "https://doi.org/10.1016/j.arth.2019.02.057" },
    { title: "Are Postoperative Hip Precautions Necessary After Primary Total Hip Arthroplasty Using a Posterior Approach? Preliminary Results of a Prospective Randomized Trial", org: "Journal of Arthroplasty (Tetreault et al.)", year: 2020, url: "https://doi.org/10.1016/j.arth.2020.02.019" },
    { title: "Hip precautions after posterior-approach total hip arthroplasty among patients with primary hip osteoarthritis do not influence early recovery: a systematic review and meta-analysis of randomized and non-randomized studies with 8,835 patients", org: "Acta Orthopaedica (Korfitsen et al.)", year: 2023, url: "https://doi.org/10.2340/17453674.2023.11958" },
    { title: "Are hip movement precautions effective in preventing prosthesis dislocation post hip arthroplasty using a posterior surgical approach? A systematic review and meta-analysis", org: "Disability and Rehabilitation (Reimert et al.)", year: 2022, url: "https://doi.org/10.1080/09638288.2020.1845404" },
    { title: "Do Hip Precautions Matter After Posterior Approach Total Hip Arthroplasty With Capsular Repair? A Randomized Control Trial", org: "Journal of Arthroplasty (Yadav et al.)", year: 2026, url: "https://doi.org/10.1016/j.arth.2026.04.080" },
    { title: "Hip precautions after total hip replacement and their discontinuation from practice: patient perceptions and experiences", org: "Disability and Rehabilitation (Lightfoot et al.)", year: 2021, url: "https://doi.org/10.1080/09638288.2020.1722262" },
    { title: "Femoral head size and surgical approach affect dislocation and overall revision rates in total hip arthroplasty: up to 9-year follow-up data of 269,280 procedures in the Dutch Arthroplasty Register (LROI)", org: "Hip International (van Steenbergen et al.)", year: 2023, url: "https://doi.org/10.1177/11207000231160223" },
    { title: "How Does Surgical Approach Affect Characteristics of Dislocation After Primary Total Hip Arthroplasty?", org: "Journal of Arthroplasty (Christensen et al.)", year: 2023, url: "https://doi.org/10.1016/j.arth.2023.05.034" },
    { title: "Partial versus unrestricted weight bearing after an uncemented femoral stem in total hip arthroplasty: recommendation of a concise rehabilitation protocol from a systematic review of the literature", org: "Archives of Orthopaedic and Trauma Surgery (Hol et al.)", year: 2010, url: "https://doi.org/10.1007/s00402-009-1017-3" },
    { title: "Periprosthetic bone mineral density and fixation of the uncemented CLS stem related to different weight bearing regimes: A randomized study using DXA and RSA in 38 patients followed for 5 years", org: "Acta Orthopaedica (Wolf et al.)", year: 2010, url: "https://doi.org/10.3109/17453674.2010.487238" },
    { title: "Muscle strength and functional recovery during the first year after THA", org: "Clinical Orthopaedics and Related Research (Judd et al.)", year: 2014, url: "https://doi.org/10.1007/s11999-013-3136-y" },
    { title: "Muscle strength, gait, and balance in 20 patients with hip osteoarthritis followed for 2 years after THA", org: "Acta Orthopaedica (Rasch et al.)", year: 2010, url: "https://doi.org/10.3109/17453671003793204" },
    { title: "Abductor Muscle Strength Deficit in Patients After Total Hip Arthroplasty: A Systematic Review and Meta-Analysis", org: "Journal of Arthroplasty (Ismailidis et al.)", year: 2021, url: "https://doi.org/10.1016/j.arth.2021.03.042" },
    { title: "Muscular strength after total hip arthroplasty. A prospective comparison of 3 surgical approaches", org: "Acta Orthopaedica (Winther et al.)", year: 2016, url: "https://doi.org/10.3109/17453674.2015.1068032" },
    { title: "The 2018 Definition of Periprosthetic Hip and Knee Infection: An Evidence-Based and Validated Criteria", org: "Journal of Arthroplasty (Parvizi et al.)", year: 2018, url: "https://doi.org/10.1016/j.arth.2018.02.078" },
    { title: "Motor nerve palsy following primary total hip arthroplasty", org: "Journal of Bone and Joint Surgery (Farrell et al.)", year: 2005, url: "https://doi.org/10.2106/jbjs.c.01564" },
    { title: "Nerve Injuries After Total Hip Arthroplasty: A Systematic Review and Meta-Analysis", org: "Orthopedic Reviews (Alturki et al.)", year: 2026, url: "https://doi.org/10.52965/001c.160594" },
    { title: "Femoral Nerve Palsy After Anterior Total Hip Arthroplasty: A Systematic Review", org: "Arthroplasty Today (Zeiman et al.)", year: 2025, url: "https://doi.org/10.1016/j.artd.2025.101889" },
    { title: "Incidence of heterotopic ossification following total hip arthroplasty by approach: a systematic review", org: "European Journal of Orthopaedic Surgery & Traumatology (Herzberg et al.)", year: 2024, url: "https://doi.org/10.1007/s00590-024-03896-9" },
    { title: "Low-frequency electric muscle stimulation combined with physical therapy after total hip arthroplasty for hip osteoarthritis in elderly patients: a randomized controlled trial", org: "Archives of Physical Medicine and Rehabilitation (Gremeaux et al.)", year: 2008, url: "https://doi.org/10.1016/j.apmr.2008.05.024" },
    { title: "A Randomized, Double-Blind, Placebo-Controlled Study of Neuromuscular Electrical Stimulation (NMES) use for Recovery after Elective Total Hip Replacement Surgery", org: "Bulletin of the Hospital for Joint Diseases (Castellano et al.)", year: 2016, url: "https://europepmc.org/abstract/MED/27815950" },
    { title: "Early neuromuscular electrical stimulation to improve quadriceps muscle strength after total knee arthroplasty: a randomized controlled trial", org: "Physical Therapy (Stevens-Lapsley et al.)", year: 2012, url: "https://doi.org/10.2522/ptj.20110124" },
    { title: "The Effect of TENS on Pain and Analgesic Consumption After Total Hip Replacement", org: "Pain Management Nursing (Türkmen et al.)", year: 2026, url: "https://doi.org/10.1016/j.pmn.2026.06.008" },
    { title: "Effects of pulsed electromagnetic stimulation on patients undergoing hip revision prostheses: a randomized prospective double-blind study", org: "Bioelectromagnetics (Dallari et al.)", year: 2009, url: "https://doi.org/10.1002/bem.20492" },
    { title: "[The effects of pulsed low frequency magnetic field in early rehabilitation of patients with cementless total hip arthroplasty]", org: "Srpski Arhiv za Celokupno Lekarstvo (Djurović et al.)", year: 2006, url: "https://doi.org/10.2298/sarh0610414d" },
    { title: "Photobiomodulation therapy (PBMT) on acute pain and inflammation in patients who underwent total hip arthroplasty-a randomized, triple-blind, placebo-controlled clinical trial", org: "Lasers in Medical Science (Langella et al.)", year: 2018, url: "https://doi.org/10.1007/s10103-018-2558-x" },
    { title: "Systematic Review on the Effectiveness of Photobiomodulation Therapy on Enhancing Musculoskeletal Rehabilitation Outcomes after Total Knee and Hip Arthroplasty", org: "Photobiomodulation, Photomedicine, and Laser Surgery (Eladl et al.)", year: 2026, url: "https://doi.org/10.1177/25785478261475529" },
    { title: "Efficacy of Non-Invasive Radiofrequency-Based Diathermy in the Postoperative Phase of Knee Arthroplasty: A Double-Blind Randomized Clinical Trial", org: "Journal of Clinical Medicine (García-Marín et al.)", year: 2021, url: "https://doi.org/10.3390/jcm10081611" },
    { title: "Physiotherapists' Understanding of Shortwave Diathermy Contraindications: A Questionnaire Survey", org: "Risk Management and Healthcare Policy (Almalty et al.)", year: 2023, url: "https://doi.org/10.2147/rmhp.s413806" },
    { title: "Dry Needling: A Possible Detrimental Treatment After Total Hip Arthroplasty", org: "Cureus (Cornette et al.)", year: 2024, url: "https://doi.org/10.7759/cureus.72053" },
    { title: "Weight-shifting-based robot control system improves the weight-bearing rate and balance ability of the static standing position in hip osteoarthritis patients: a randomized controlled trial focusing on outcomes after total hip arthroplasty", org: "PeerJ (Miyazaki et al.)", year: 2023, url: "https://doi.org/10.7717/peerj.15397" },
    { title: "Electrophysical Agents — Contraindications and Precautions: An Evidence-Based Approach to Clinical Decision Making in Physical Therapy", org: "Physiotherapy Canada (Houghton, Nussbaum & Hoens)", year: 2010, url: "https://doi.org/10.3138/ptc.62.5" },
    { title: "Validation of the HOOS, JR: A Short-form Hip Replacement Survey", org: "Clinical Orthopaedics and Related Research (Lyman et al.)", year: 2016, url: "https://doi.org/10.1007/s11999-016-4718-2" },
    { title: "Defining Patient-relevant Thresholds and Change Scores for the HOOS JR and KOOS JR Anchored on the Patient-acceptable Symptom State Question", org: "Clinical Orthopaedics and Related Research (Dekhne et al.)", year: 2024, url: "https://doi.org/10.1097/corr.0000000000002857" },
    { title: "Defining the Patient Acceptable Symptom State for the HOOS JR and KOOS JR After Primary Total Joint Arthroplasty", org: "Journal of Bone and Joint Surgery (Kunze et al.)", year: 2022, url: "https://doi.org/10.2106/jbjs.21.00550" },
    { title: "Meaningful changes for the Oxford hip and knee scores after joint replacement surgery", org: "Journal of Clinical Epidemiology (Beard et al.)", year: 2015, url: "https://doi.org/10.1016/j.jclinepi.2014.08.009" },
    { title: "Translation, adaptation and validation of the 12-item Oxford hip score into Arabic", org: "Journal of Research and Practice on the Musculoskeletal System (Khaja et al.)", year: 2020, url: "https://doi.org/10.22540/JRPMS-04-052" },
    { title: "Cross-Cultural Adaptation and Validation of the Arabic Version of the Harris Hip Score", org: "Arthroplasty Today (Alshaygy et al.)", year: 2023, url: "https://doi.org/10.1016/j.artd.2022.07.006" },
    { title: "Assessing stability and change of four performance measures: a longitudinal study evaluating outcome following total hip and knee arthroplasty", org: "BMC Musculoskeletal Disorders (Kennedy et al.)", year: 2005, url: "https://doi.org/10.1186/1471-2474-6-3" },
    { title: "Test-retest reliability of the 50-foot timed walk and 30-second chair stand test in patients with total hip arthroplasty", org: "Acta Orthopaedica Belgica (Unver et al.)", year: 2015, url: "https://europepmc.org/abstract/MED/26435238" },
    { title: "Reference values for the timed up and go test: a descriptive meta-analysis", org: "Journal of Geriatric Physical Therapy (Bohannon)", year: 2006, url: "https://doi.org/10.1519/00139143-200608000-00004" },
    { title: "Reliability of goniometric measurements and visual estimates of hip ROM in patients with osteoarthrosis", org: "Physiotherapy Research International (Holm et al.)", year: 2000, url: "https://doi.org/10.1002/pri.204" },
    { title: "Range of Motion Simulation of Hip Joint Movement During Salat Activity", org: "Journal of Arthroplasty (Jamari et al.)", year: 2017, url: "https://doi.org/10.1016/j.arth.2017.03.056" },
    { title: "Squatting After Total Hip Arthroplasty: Patient-Reported Outcomes and In Vivo Three-Dimensional Kinematic Study", org: "Journal of Arthroplasty (Harada et al.)", year: 2022, url: "https://doi.org/10.1016/j.arth.2021.12.028" },
    { title: "The ability and factors related with floor sitting after total hip arthroplasty with a posterolateral approach", org: "Orthopedic Reviews (Nawatthakul et al.)", year: 2022, url: "https://doi.org/10.52965/001c.37072" },
    { title: "An observational descriptive cross sectional multicenter study of health related quality of life among Iraqi patients after total hip replacement", org: "Annals of Medicine and Surgery (Yaseen et al.)", year: 2019, url: "https://doi.org/10.1016/j.amsu.2019.10.031" },
    { title: "Post-operative short-term clinical evaluation of direct lateral (Harding) approach in primary total hip replacement", org: "Journal of the Pakistan Medical Association (Abbas et al.)", year: 2024, url: "https://doi.org/10.47391/jpma-bagh-16-31" },
    { title: "Total hip arthroplasty for adult patients with hip arthritis in Jordan: clinical profiles and patient characteristics", org: "International Orthopaedics (Alswerki et al.)", year: 2024, url: "https://doi.org/10.1007/s00264-023-06053-9" },
    { title: "Overweight and Obesity among Adults in Iraq: Prevalence and Correlates from a National Survey in 2015", org: "International Journal of Environmental Research and Public Health (Pengpid & Peltzer)", year: 2021, url: "https://doi.org/10.3390/ijerph18084198" },
    { title: "Prevalence and factors associated with undiagnosed type 2 diabetes among adults in Iraq: analysis of cross-sectional data from the 2015 STEPS survey", org: "BMJ Open (Pengpid & Peltzer)", year: 2022, url: "https://doi.org/10.1136/bmjopen-2022-064293" },
    { title: "Effects of progressive resistance training prior to total HIP arthroplasty - a secondary analysis of a randomized controlled trial", org: "Osteoarthritis and Cartilage (Holsgaard-Larsen et al.)", year: 2020, url: "https://doi.org/10.1016/j.joca.2020.04.010" },
    { title: "Prehabilitation for Total Knee or Total Hip Arthroplasty: A Systematic Review", org: "American Journal of Physical Medicine & Rehabilitation (Konnyu et al.)", year: 2023, url: "https://doi.org/10.1097/phm.0000000000002006" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٠ دقيقة في الجلسة — في ثلاثة أيّامٍ غير متتالية التقويةُ المتدرّجة بالأثقال (من ١٢ تكراراً متعباً نحو ٨)، وفي الثلاثة الأخرى المشيُ والتوازنُ والوظيفةُ والدرّاجة؛ والبرنامجُ المنزليّ يوميّ حتى الأسبوع الثاني عشر.",
        "The phased programme and its cards under 'Programme by phase': about 40 minutes per session — progressive loaded strengthening on three non-consecutive days (from a tiring 12 repetitions towards 8), and walking, balance, function and cycling on the other three; the home programme is daily until week 12."],
      note: ["أساسيٌّ في كلّ جلسة — AAOS 2023: دليلٌ عالي الجودة للعلاج الطبيعيّ الرسميّ أو التمرين المنزليّ بعد الاستبدال، وAAOS 2017: العلاجُ بعد العملية يحسّن الوظيفةَ المبكّرة (متوسّط)؛ والإشرافُ يفيد بما لا يعطيه المريضُ لنفسه: التقويةُ الثقيلة (Husby 2009 · Winther 2018 · Mikkelsen 2014) وتدريبُ المشي والوظيفة (Heiberg 2012 · Monaghan 2017)، والتمارينُ الخفيفة وحدها أضعفُها (Suetta 2004 · Bandholm 2012).",
        "Core in every session — AAOS 2023: high-quality evidence for formal physical therapy or home exercise after replacement, and AAOS 2017: therapy after surgery improves early function (moderate); supervision helps by delivering what patients cannot give themselves: heavy strengthening (Husby 2009 · Winther 2018 · Mikkelsen 2014) and walking and functional training (Heiberg 2012 · Monaghan 2017), while light exercise alone has the weakest support (Suetta 2004 · Bandholm 2012)."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { currentType: "NMES — biphasic symmetrical", frequencyHz: "50", pulseWidthUs: "250", intensity: "Maximal tolerated", onOff: "15 / 45 (3 s ramp)", durationMin: "15" },
      parameters: ["التحفيزُ الكهربائيّ العصبيّ العضليّ (NMES) لعضلة الفخذ — والإعداداتُ من تجربة الركبة (Stevens-Lapsley 2012) لأنّ إعداداتِ تجارب الورك في نصوصها الكاملة لم تُقرأ: قطبان كبيران على مقدّم الفخذ بعيداً عن الجرح، والمريضُ جالس، و١٥ انقباضاً بأقصى شدّةٍ يحتملها. وللألم في المرحلة الأولى بديلٌ: التحفيزُ عبر الجلد (TENS) ٣٠ دقيقة بالبرنامج المعتاد للجهاز (Türkmen 2026).",
        "Neuromuscular electrical stimulation (NMES) of the quadriceps — the settings come from the knee trial (Stevens-Lapsley 2012) because the settings of the hip trials, in their full texts, could not be read: two large electrodes on the front of the thigh away from the wound, the patient seated, 15 contractions at the maximal tolerated intensity. For pain in phase 1 there is an alternative: transcutaneous stimulation (TENS) for 30 minutes on the device's usual programme (Türkmen 2026)."],
      note: ["مساعدٌ بقاعدة المركز — لكبير السنّ أو ضعيف الفخذ أو مَن تأخّر بسطُ ركبته، ولا تُبدَّل به التقويةُ بالأثقال: Gremeaux 2008 (٢٩ مريضاً متوسّطُ عمرهم ٧٧، ساعةٌ خمسةَ أيّامٍ في الأسبوع خمسةَ أسابيع مع العلاج) زاد قوّةَ الفخذ ٧٧٪ مقابل ٢٣٪، وSuetta 2004 · 2008 لم يجدا فائدةً للتحفيز وحده والتقويةُ أنفع، وCastellano 2016 لم يجد أثراً على الألم أو مدّة البقاء. ولا آثارَ ضارّة في تجارب الورك.",
        "Adjunct by the centre's rule — for older patients, a weak quadriceps or an extensor lag, never replacing loaded strengthening: Gremeaux 2008 (29 patients with a mean age of 77, one hour five days a week for five weeks with therapy) raised quadriceps strength by 77% against 23%, Suetta 2004 · 2008 found no benefit from stimulation alone with strengthening better, and Castellano 2016 found no effect on pain or length of stay. No harms were reported in the hip trials."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول الورك قبل التمارين، بلا حرارة — ببرنامج الجهاز في المركز؛ وقيمُ التجربتين (الشدّةُ والتردّد) في نصّيهما الكاملين لم تُقرأ، فيكتبها المشرفُ من جهازه.",
        "Pulsed electromagnetic field (PEMF) around the hip before exercise, non-thermal — on the centre device's programme; the two trials' values (intensity and frequency) are in full texts that could not be read, so the supervisor enters them from the device."],
      note: ["مساعدٌ بقاعدة المركز (سليم)، والدليلُ ضعيفٌ جدّاً: Dallari 2009 على إعادة استبدال الورك لا على الأوّليّ، بجهازٍ ستَّ ساعاتٍ يومياً حتى ٩٠ يوماً — حسّن مقياسَ الوظيفة ولم يغيّر متوسّطَ كثافة العظم؛ وDjurović 2006 (مقالةٌ صربية) خفّف الألمَ بجرعةٍ عالية منخفضة التردّد ثلاثةَ أسابيع بعد الاستبدال بلا إسمنت. وهو بلا حرارة واستُعمل فوق الجذع المعدنيّ بلا أذىً مُبلَّغ — فلا يُقدَّم على التمرين.",
        "Adjunct by the centre's rule (Saleem), with very weak evidence: Dallari 2009 was in revision hip replacement, not primary, with a device worn six hours a day for up to 90 days — it improved a function score without changing mean bone density; Djurović 2006 (a Serbian paper) reduced pain with a high-dose low-frequency field for three weeks after uncemented replacement. It is non-thermal and was used over metal stems without reported harm — but it never comes before exercise."] },
    { code: "hot_pack", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم فوق الورك المعمول في الأسابيع الستّة الأولى أو والجرحُ لم يلتئم — والدورةُ كلُّها تقريباً داخل هذه الأسابيع؛ ولا تجربةَ للحرارة بعد استبدال الورك (والموانعُ في Houghton 2010). ويجوز لأسفل الظهر أو لعضلاتٍ بعيدة إن احتاجها المريض.",
        "Not used over the operated hip in the first six weeks or while the wound is unhealed — and nearly the whole course falls within those weeks; there is no trial of heat after hip replacement (contraindications in Houghton 2010). It may be used for the lower back or distant muscles if the patient needs it."] },
    { code: "tecar", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ للتيكار بعد استبدال الورك، وهو جهازٌ حراريّ فوق جرحٍ حديث ومفصلٍ معدنيٍّ كبير؛ وأصحابُ التجربة الوحيدة بالموجات الراديوية (على الركبة) كتبوا أنّ الوضعَ ثنائيَّ القطب لا يُنصح به مع المعدن المزروع (García-Marín 2021). ولا وضعَ مقاوِماً أو ثنائيَّ القطب يعبر فيه التيارُ المفصلَ أبداً.",
        "Not used — there is no trial of Tecar after hip replacement, and it is a thermal device over a fresh wound and a large metal implant; the authors of the only radiofrequency trial (in the knee) wrote that bipolar application is not recommended with implanted metal (García-Marín 2021). Never a resistive or bipolar mode with current crossing the joint."] },
    { code: "cpm", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا تجربةَ له بعد استبدال الورك، وفي الركبة: لا يستعمله المعالجون بعد الاستبدال الأوّليّ غير المعقّد (APTA — Jette 2020).",
        "Not used — there is no trial after hip replacement, and for the knee therapists should not use it after primary uncomplicated replacement (APTA — Jette 2020)."] },
    { code: "compression", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم في العيادة — لا تذكره NICE NG89 بعد استبدال الورك (تذكر الجواربَ الضاغطة حتى الخروج من المستشفى ومميّعَ الدم)، ولا تجربةَ له على التورّم بعد الخروج؛ والجواربُ ومميّعُ الدم كما وصف الجرّاح.",
        "Not used in the clinic — NICE NG89 does not name it after hip replacement (it names anti-embolism stockings until discharge and blood thinners), and there is no trial for swelling after discharge; stockings and blood thinners as the surgeon prescribed."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — تجربةٌ صغيرة واحدة (١٨ مريضاً) جلسةً واحدة في المستشفى بعد العملية بساعات (Langella 2018: ٩٠٥ نانومتر نبضيّ مع ثنائياتٍ ضوئية ٨٧٥ و٦٤٠، و٤٠٫٣ جول لكلّ نقطة على ٥ نقاطٍ بمحاذاة الجرح) خفّفت الألمَ والالتهاب؛ والمراجعةُ المنهجية: الدليلُ غيرُ كافٍ (Eladl 2026). ولا على جرحٍ مفتوحٍ أو ملتهب.",
        "Not used until Saleem decides — a single small trial (18 patients) of one session in hospital hours after surgery (Langella 2018: super-pulsed 905 nm with 875 and 640 nm diodes, 40.3 J per point at 5 points along the incision) reduced pain and inflammation; the systematic review found the evidence insufficient (Eladl 2026). Never over an open or inflamed wound."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا تجربةَ له بعد استبدال الورك، والحذرُ التقليديّ فوق الإسمنت والبلاستيك (البولي إيثيلين) والجرحِ الحديث.",
        "Not used — there is no trial after hip replacement, and there is traditional caution over cement, plastic (polyethylene) components and a fresh wound."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم قربَ المفصل الصناعيّ أو الورك المعمول — لا تجربةَ له بعد الاستبدال، واستعمالُه للتكلّس حالاتٌ في التكلّس العصبيّ المنشأ لا بعد الاستبدال، وأثرُه على التحام العظم بالمفصل مجهول (ولا إعداداتَ تُطلب له هنا).",
        "Not used near the implant or the operated hip — there is no trial after replacement, its use for ossification is limited to case reports in neurogenic ossification rather than after replacement, and its effect on the bone–implant interface is unknown (no settings are required for it here)."] },
    { code: "traction", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم — لا شدَّ يعبر الورك المستبدل: قوّةُ إبعادٍ على مفصلٍ حديث فيها خطرُ خلعٍ بلا فائدة، ولا دراسةَ له بعد الاستبدال.",
        "Not used — no traction across the replaced hip: a distraction force on a new joint carries a dislocation risk with no benefit, and there is no study of it after replacement."] },
    { code: "needle", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم حول الورك المعمول في الدورة — لا تجربة، والمفصلُ الصناعيّ قريب (خطرُ الالتهاب)، وحالةٌ مُبلَّغة لمضاعفةٍ جلديةٍ خطيرة قرب الندبة بعد الإبر في تأهيل الورك (Cornette 2024)؛ والنقاطُ البعيدة (الظهرُ أو الجهةُ الأخرى) بقواعد الإبر في المركز وبتعقيمٍ كامل.",
        "Not used around the operated hip during the course — there is no trial, the implant is close (infection risk), and a serious skin complication near the scar was reported after needling during hip rehabilitation (Cornette 2024); distant points (the back or the other side) follow the centre's needling rules with full asepsis."] },
    { code: "robotik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — لا تجربةَ لروبوت المشي بعد استبدال الورك؛ والتجربةُ الوحيدة (Miyazaki 2023، ٢٠ مريضاً) روبوتٌ لنقل الوزن واقفاً حسّن نسبةَ الحمل على الساق؛ والمريضُ يمشي مبكّراً بالحمل الذي يحتمله، فالتدريبُ على الأرض أوّلى.",
        "Not used until Saleem decides — there is no trial of a gait robot after hip replacement; the only trial (Miyazaki 2023, 20 patients) used a robot for weight shifting while standing and improved the weight-bearing ratio; patients walk early with weight bearing as tolerated, so overground training comes first."] },
  ],
  phases: [
    {
      name: ["الحماية والمشي والاستقلال اليومي", "Protection, walking and daily independence"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["نحو الأسابيع ١–٣ بعد العملية", "About post-op weeks 1–3"],
      goals: [
        "جرحٌ نظيفٌ يلتئم وألمٌ تحت السيطرة؛ مشيٌ آمن بالمشّاية أو العكّازين بالحمل الذي يأذن به الجرّاح وبخطوتين متساويتين؛ انتقالٌ مستقلّ (السريرُ والكرسيّ والمرحاضُ المرتفع والسيارة) بالأوضاع الآمنة لمدخل عمليته؛ ألويةٌ وفخذٌ ينقبضان جيّداً؛ ومدىً في حدود القيود؛ وبرنامجٌ منزليٌّ يوميّ وبيتٌ مهيّأ (مقعدٌ مرتفع، وكرسيٌّ ثابت، ولا سجّاد).",
        "A clean, healing wound and pain under control; safe walking with a frame or crutches at the weight bearing the surgeon allows, with equal steps; independent transfers (bed, chair, raised toilet and car) in the safe positions for the approach; good glute and quadriceps contractions; range within the restrictions; and a daily home programme in a prepared home (a raised seat, a firm chair, no rugs).",
      ],
      education: [
        "• علاماتُ الخطر تُبلَّغ فوراً: ألمٌ مفاجئ في الورك مع «طقّة» أو عجزٌ عن الوقوف (خلع)، وألمُ بطن الساق أو الفخذ وتورّمُه، وضيقُ النفس، وإفرازُ الجرح أو احمرارُه الممتدّ، والحمّى.\n" +
        "• مميّعُ الدم كما وصفه الجرّاح حتى آخر يوم.\n" +
        "• الحملُ بقدر ما يحتمل إلّا إن قيّده الجرّاح.\n" +
        "• الأوضاعُ الآمنة لمدخل عمليته (بطاقة «الحركة الآمنة»): وسادةٌ بين الركبتين، ولا كرسيَّ واطئاً ولا تقاطعَ ساقين ولا التفافَ — ستّةَ أسابيع أو كما يقول الجرّاح.\n" +
        "• السقطةُ سببُ ربع الخلوع: إنارةٌ ليلية، ولا سجّادَ ولا أسلاك، والأداةُ حتى يأمن المشي.\n" +
        "• الألمُ المقبول: حتى ٤ من ١٠ أثناء التمرين إن هدأ في ساعتين؛ ومسكّنُ الجرّاح قبل الجلسة بوقتٍ كافٍ؛ والثلجُ ١٥–٢٠ دقيقة بقطعة قماشٍ بعد التمارين لمن يريحه، والجرحُ جافّ.\n" +
        "• الدرج: الصعودُ بالسليمة والنزولُ بالمعمولة؛ والعصا في اليد المقابلة.\n" +
        "• الصلاةُ على الكرسيّ، والوضوءُ جالساً، والمرحاضُ المرتفع.\n" +
        "• البرنامجُ المنزليّ مرّتين يومياً — والتمارينُ في البيت نصفُ العلاج.",
        "• Warning signs reported at once: sudden hip pain with a clunk or inability to stand (dislocation), calf or thigh pain and swelling, breathlessness, wound discharge or spreading redness, and fever.\n" +
        "• The blood thinner is taken as the surgeon prescribed, to the last day.\n" +
        "• Weight bearing as tolerated unless the surgeon restricts it.\n" +
        "• The safe positions for the approach (the 'Safe movement' card): a pillow between the knees, no low chairs, no crossed legs and no twisting — for six weeks or as the surgeon says.\n" +
        "• Falls cause a quarter of dislocations: a night light, no rugs or cables, and the aid until walking is safe.\n" +
        "• Acceptable pain: up to 4/10 during exercise if it settles within two hours; take the surgeon's painkiller in good time before the session; ice for 15–20 minutes through a cloth after exercise for those it helps, keeping the wound dry.\n" +
        "• Stairs: up with the good leg, down with the operated one; the cane in the opposite hand.\n" +
        "• Pray on a chair, do ablution seated, and use the raised toilet.\n" +
        "• The home programme twice a day — exercise at home is half the treatment.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• الجرحُ مغلقٌ جافّ بلا علامات خطر.\n" +
        "• انتقالٌ مستقلّ، ومشيٌ ٥٠ متراً فأكثر بالأداة.\n" +
        "• الألمُ ٤ من ١٠ أو أقلّ أثناء التمرين.\n" +
        "• رفعُ الساق مستقيمةً بلا تأخّر بسط — أو شدٌّ جيّدٌ للفخذ إن آلم الرفع.\n" +
        "• يؤدّي برنامجَه المنزليّ وحده، ويعرف أوضاعَ مدخله الآمنة.\n" +
        "(اقتراحٌ مبنيّ على التجارب — Mikkelsen 2014 · Monaghan 2017 — لا معيارٌ مجرَّب.) وإن لم يتحقّق ذلك بعد الجلسة الثامنة ⟵ يُراجَع مع الجرّاح.",
        "Progress to phase 2 when all are met:\n" +
        "• The wound is closed and dry without warning signs.\n" +
        "• Independent transfers, and walking 50 m or more with the aid.\n" +
        "• Pain 4/10 or less during exercise.\n" +
        "• A straight-leg raise without extensor lag — or a good quadriceps contraction if lifting is painful.\n" +
        "• Does the home programme alone and knows the safe positions for the approach.\n" +
        "(A proposal built on the trials — Mikkelsen 2014 · Monaghan 2017 — not a tested criterion.) If not achieved by session 8 → review with the surgeon.",
      ],
      notes: [
        "• مَن يصل في الأسبوع الأوّل: الجلساتُ الأولى للمشي والانتقالات واليوميّات وتمارينَ بلا ثقل.\n" +
        "• التحفيزُ الكهربائيّ (مساعد — إعداداتُه في «الأجهزة») لكبير السنّ أو ضعيف الفخذ أو مَن تأخّر بسطُ ركبته: ١٥ انقباضاً بأقصى شدّةٍ محتملة والأقطابُ بعيدةٌ عن الجرح — وليس بديلاً عن التقوية (Suetta 2004).\n" +
        "• المدخلُ الخلفيّ: سحبُ الكعب حتى ثني الورك ٩٠° لا أكثر، والتبعيدُ إلى الوسط لا عبره، ولا تمرينَ على الجنب قبل إذن الجرّاح. المدخلُ الأماميّ: الجسرُ بلا بسطٍ قسريّ في آخره والقدمان للأمام. المدخلُ الجانبيّ: التبعيدُ بلا مقاومة ستّةَ أسابيع.\n" +
        "• التقويةُ المبكّرة آمنة (Skoffer 2015 · Chen 2021) — والأثقالُ من الجلسة السابعة.\n" +
        "• المشي: تناظرُ الخطوتين، والحوضُ مستوٍ، ونقلُ الوزن بالتساوي أمام المرآة.\n" +
        "• جهازٌ مساعدٌ واحد في الجلسة بالتناوب (المؤشَّرُ لهذا المريض)، قبل التمارين لا بدلها.",
        "• A patient arriving in week 1: the first sessions are for walking, transfers, daily activities and unloaded exercise.\n" +
        "• NMES (adjunct — settings under 'Devices') for older patients, a weak quadriceps or an extensor lag: 15 contractions at the maximal tolerated intensity with electrodes away from the wound — not a substitute for strengthening (Suetta 2004).\n" +
        "• Posterior approach: heel slides to 90° of hip flexion and no further, abduction back to the midline and not across it, and no side-lying exercise before the surgeon allows. Anterior approach: bridging without forced end-range extension, feet facing forward. Direct lateral approach: abduction without resistance for six weeks.\n" +
        "• Early strengthening is safe (Skoffer 2015 · Chen 2021) — loads from session 7.\n" +
        "• Walking: equal steps, a level pelvis, and even weight shifting in front of a mirror.\n" +
        "• One adjunct device per session in rotation (those ticked for this patient), before exercise and never instead of it.",
      ],
      exercises: [
        { code: "ankle-pumps" },
        { code: "quad-set", note: ["قبل رفع الساق، ومع التحفيز لمن تأخّر بسطُ ركبته.", "Before the straight-leg raise, and alongside NMES for those with an extensor lag."] },
        { code: "gluteal-sets" },
        { code: "heel-slide", note: ["بعد المدخل الخلفيّ حتى ثني الورك ٩٠° لا أكثر — الكعبُ لا يقترب كثيراً من المقعدة.", "After a posterior approach, to 90° of hip flexion and no further — the heel does not come close to the buttock."] },
        { code: "supine-hip-abduction-slide" },
        { code: "glute-bridge", sets: 2, reps: 10, doseNote: ["٢ × ١٠ بالساقين ومدىً صغير، يومياً.", "2 × 10 with both legs and a small range, daily."],
          note: ["بعد المدخل الأماميّ: بلا بسطٍ قسريّ في آخر الرفع، والقدمان للأمام.", "After an anterior approach: no forced extension at the top, feet facing forward."] },
        { code: "standing-hip-three-way", doseNote: ["٢ × ١٠ لكلّ اتّجاه بلا ثقل، يومياً.", "2 × 10 each direction without load, daily."],
          note: ["بعد المدخل الجانبيّ: التبعيدُ بلا مقاومة.", "After a direct lateral approach: abduction without resistance."] },
        { code: "sit-to-stand", sets: 2, reps: 8, doseNote: ["٢ × ٨ من مقعدٍ عالٍ، واليدان على المسندين عند الحاجة.", "2 × 8 from a high seat, hands on the armrests when needed."],
          note: ["الوزنُ على الساقين بالتساوي، والركبتان متباعدتان، والجذعُ لا ينحني كثيراً — والمقعدُ يُخفَّض مع الأيّام.", "Weight evenly on both legs, knees apart, the trunk not bending far — and the seat lowered as the days go by."] },
        { code: "standing-weight-shift", note: ["إلى الساق المعمولة أمام المرآة، حتى يتساوى الحمل.", "Onto the operated leg in front of a mirror, until weight is equal."] },
        { code: "hip-safe-movement" },
        { code: "bed-mobility-hip" },
        { code: "raised-seat-transfer-hip" },
        { code: "dressing-aids-hip", note: ["لمن يحتاجه.", "For those who need it."] },
        { code: "walking-aid-gait-hip" },
        { code: "stairs-after-hip-surgery" },
        { code: "car-transfer-hip" },
        { code: "prayer-progression-hip", note: ["في هذه المرحلة: الصلاةُ على الكرسيّ والوضوءُ جالساً.", "In this phase: prayer on a chair and ablution seated."] },
      ],
    },
    {
      name: ["التقوية المتدرّجة وتخفيف أداة المشي", "Progressive strengthening and stepping down the walking aid"],
      sessionFrom: 7, sessionTo: 12,
      timeframe: ["نحو الأسابيع ٢–٥ بعد العملية", "About post-op weeks 2–5"],
      goals: [
        "تقويةٌ متدرّجة بالأثقال للمبعِّدات والباسطات والفخذ والساق — من ١٢ تكراراً متعباً نحو ٨؛ وإنزالُ الأداة درجةً بعد درجة بالمعايير لا بالتاريخ؛ والدرّاجةُ الثابتة؛ وتوازنٌ ثابتٌ ثمّ متحرّك؛ والجلوسُ والقيامُ من كرسيٍّ عاديّ بلا يدين.",
        "Progressive loaded strengthening of the abductors, extensors, quadriceps and calves — from a tiring 12 repetitions towards 8; stepping the aid down by criteria, not by date; stationary cycling; static then dynamic balance; and sit-to-stand from an ordinary chair without hands.",
      ],
      education: [
        "• أيّامُ القوّة ثلاثةٌ غيرُ متتالية في الأسبوع، والأيّامُ الأخرى للمشي والتوازن والدرّاجة — والتعبُ العضليّ يومين بعد أيّام القوّة طبيعيّ.\n" +
        "• الأوضاعُ الآمنة مستمرّة حتى زيارة الجرّاح في الأسبوع السادس.\n" +
        "• العصا في اليد المقابلة للورك المعمول، وتُترك حين يمشي بلا عرج.\n" +
        "• الإحساسُ بطول الساق شائعٌ في الأسابيع الأولى — لا يُرفع الحذاءُ إلّا بقول الجرّاح.\n" +
        "• المقعدُ المرتفع والكرسيُّ الثابت ما زالا في البيت.\n" +
        "• البرنامجُ المنزليّ يومياً، والمشيُ يطول يوماً بعد يوم.",
        "• Three non-consecutive strength days a week, with the other days for walking, balance and cycling — muscle tiredness for two days after strength days is normal.\n" +
        "• The safe positions continue until the surgeon's review at week 6.\n" +
        "• The cane in the hand opposite the operated hip, left aside once walking is limp-free.\n" +
        "• Feeling the leg is longer is common in the early weeks — no shoe raise unless the surgeon says so.\n" +
        "• The raised seat and the firm chair stay at home.\n" +
        "• The home programme daily, with walking lengthening day by day.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• عكّازٌ واحد أو عصا أو بلا أداة داخلَ البيت، بلا عرجٍ ولا ميلٍ للجذع (ترندلنبرغ).\n" +
        "• الجلوسُ والقيامُ من كرسيٍّ عاديّ بلا يدين.\n" +
        "• الدرجُ درجةً درجة بالدرابزين.\n" +
        "• «الجلوس والوقوف ٣٠ ثانية» يزيد مرّتين فأكثر عن أوّل قياس (فوق خطأ القياس ١٫٢ — Unver 2015).\n" +
        "• الوقوفُ على الساق المعمولة ٥ ثوانٍ فأكثر بلا سقوط الحوض.\n" +
        "• الألمُ في المشي ٣ من ١٠ أو أقلّ.\n" +
        "(اقتراحٌ مبنيّ على Hol 2010 وUnver 2015 — يقرّره المشرف.)",
        "Progress to phase 3 when all are met:\n" +
        "• One crutch, a cane or no aid indoors, without a limp or trunk lean (Trendelenburg).\n" +
        "• Sit-to-stand from an ordinary chair without hands.\n" +
        "• Stairs one step at a time with the rail.\n" +
        "• The 30-second chair stand up by 2 or more from the first measurement (beyond the 1.2 measurement error — Unver 2015).\n" +
        "• Standing on the operated leg for 5 seconds or more without the pelvis dropping.\n" +
        "• Walking pain 3/10 or less.\n" +
        "(A proposal built on Hol 2010 and Unver 2015 — the supervisor decides.)",
      ],
      notes: [
        "• أيّامُ القوّة (Mikkelsen 2014 · Mikkelsen 2017): ضغطُ الساقين، والتبعيدُ واقفاً بالمطّاط أو الكابل، وبسطُ الورك، ومدُّ الركبة — من ١٢ تكراراً متعباً نحو ٨، والثقلُ يُزاد بقاعدة التوقّف؛ وارتفع الثقلُ في تلك التجربة كثيراً بلا ألمٍ عامّ زائد.\n" +
        "• ضغطُ الساقين بعد المدخل الخلفيّ: المقعدُ مرجَعٌ فلا يتجاوز ثنيُ الورك ٩٠° في أوّل الحركة.\n" +
        "• بعد المدخل الجانبيّ: لا تبعيدَ ضدّ مقاومةٍ قبل الأسبوع السادس — يبقى التبعيدُ بلا ثقل، وتُقوّى الباسطاتُ والفخذ.\n" +
        "• الدرّاجةُ الثابتة من نحو الأسبوع الثاني والمقعدُ مرتفع فلا يتجاوز ثنيُ الورك ٩٠° في أعلى الدورة (Liebs 2010 — حسّنت الوظيفةَ بعد ثلاثة أشهر وسنتين).\n" +
        "• الأداةُ تنزل بمعايير بطاقة المشي (١٠ أمتار بلا عرج، والألمُ ٣ أو أقلّ، والوقوفُ على الساق ثانيتين ثمّ خمساً).\n" +
        "• جهازٌ مساعدٌ واحد بالتناوب قبل التمارين لمن يحتاجه.",
        "• Strength days (Mikkelsen 2014 · Mikkelsen 2017): leg press, standing abduction with a band or cable, hip extension and knee extension — from a tiring 12 repetitions towards 8, with load raised by the hold rule; in that trial load rose substantially without an overall flare of pain.\n" +
        "• Leg press after a posterior approach: the seat set back so hip flexion does not pass 90° at the start of the movement.\n" +
        "• After a direct lateral approach: no resisted abduction before week 6 — abduction stays unloaded while the extensors and quadriceps are strengthened.\n" +
        "• The stationary bike from about week 2 with the seat raised so hip flexion stays under 90° at the top of the stroke (Liebs 2010 — it improved function at three months and two years).\n" +
        "• The aid steps down by the walking card's criteria (10 m without a limp, pain 3 or less, standing on the leg for 2 then 5 seconds).\n" +
        "• One adjunct device in rotation before exercise for those who need it.",
      ],
      exercises: [
        { code: "standing-hip-three-way", sets: 3, reps: 12, doseNote: ["أيّامُ القوّة: ٣ × ١٢ بالمطّاط أو الكابل نحو ٨ متعبة؛ وفي الأيّام الأخرى ٢ × ١٠ بلا ثقل.", "Strength days: 3 × 12 with a band or cable, towards a tiring 8; on other days 2 × 10 without load."],
          note: ["التبعيدُ ضدّ مقاومةٍ بعد الأسبوع السادس للمدخل الجانبيّ.", "Resisted abduction after week 6 for a direct lateral approach."] },
        { code: "seated-knee-extension", sets: 3, reps: 12, doseNote: ["أيّامُ القوّة: ٣ × ١٢ بثقل كاحلٍ يتعب في ١٢ ثمّ نحو ٨ (Mikkelsen 2014).", "Strength days: 3 × 12 with an ankle weight that tires at 12, then towards 8 (Mikkelsen 2014)."] },
        { code: "leg-press-progressive", sets: 3, reps: 12, doseNote: ["أيّامُ القوّة: ٣ × ١٢ ثمّ نحو ٨ بثقلٍ متعب.", "Strength days: 3 × 12, then towards 8 at a tiring load."],
          note: ["بعد المدخل الخلفيّ: المقعدُ مرجَعٌ فلا يتجاوز ثنيُ الورك ٩٠°؛ وإن لم يتوفّر الجهاز فالجلوسُ والقيامُ بثقلٍ أو صعودُ الدرجة.", "After a posterior approach: the seat set back so hip flexion stays under 90°; without the machine, loaded sit-to-stand or step-ups."] },
        { code: "sit-to-stand", sets: 3, reps: 10, doseNote: ["٣ × ١٠ من كرسيٍّ عاديّ، وبلا يدين حين يستطيع.", "3 × 10 from an ordinary chair, without hands when able."] },
        { code: "step-up", sets: 2, reps: 10, doseNote: ["٢ × ١٠ على درجة ١٠ سم ثمّ ١٥ سم.", "2 × 10 on a 10 cm step, then 15 cm."] },
        { code: "calf-raise", sets: 2, reps: 10 },
        { code: "side-stepping", note: ["بمحاذاة الطاولة بلا مطّاطٍ في هذه المرحلة.", "Along the table without a band in this phase."] },
        { code: "single-leg-balance", note: ["على الساق المعمولة بإسنادٍ قريب حتى ٥ ثوانٍ بلا سقوط الحوض، ثمّ أطول.", "On the operated leg with support nearby, up to 5 seconds without the pelvis dropping, then longer."] },
        { code: "pelvic-drop-step" },
        { code: "stationary-cycling", note: ["المقعدُ مرتفع: ثنيُ الورك أقلّ من ٩٠° في أعلى الدورة؛ ١٠–١٥ دقيقة بمقاومةٍ خفيفة.", "The seat high: hip flexion under 90° at the top of the stroke; 10–15 minutes at light resistance."] },
        { code: "walking-aid-gait-hip", note: ["إنزالُ الأداة بمعايير البطاقة.", "Stepping the aid down by the card's criteria."] },
        { code: "glute-bridge", sets: 3, reps: 10, doseNote: ["٣ × ١٠ بثباتٍ ثانيتين في الأعلى.", "3 × 10 with a 2-second hold at the top."] },
        { code: "graded-walking", doseNote: ["مشيٌ يوميّ يزيد ٥ دقائق كلَّ يومين أو ثلاثة حتى ٢٠–٣٠ دقيقة.", "Daily walking, adding 5 minutes every two or three days up to 20–30 minutes."] },
      ],
    },
    {
      name: ["الوظيفة والتحمّل والعودة إلى الحياة اليومية", "Function, endurance and return to daily life"],
      sessionFrom: 13, sessionTo: 18,
      timeframe: ["نحو الأسابيع ٣–٦ بعد العملية", "About post-op weeks 3–6"],
      goals: [
        "مشيٌ بلا أداة في البيت والشارع (والعصا في الشارع اختيار) بلا عرج، ودرجٌ درجةً بعد درجة، وقوّةٌ ثقيلة متدرّجة، وتوازنٌ على ساقٍ مع الالتفات، ومشيٌ بين العوائق ومع مهمّةٍ ثانية؛ واستقلالٌ في البيت والسيارة؛ وخطّةٌ منزلية حتى الأسبوع الثاني عشر، وخطّةٌ للصلاة على الأرض بإذن الجرّاح.",
        "Walking without an aid at home and outdoors (a cane outdoors by choice) without a limp, step-over-step stairs, heavy progressive strength, single-leg balance with head turns, and walking around obstacles and with a second task; independence at home and in the car; a home plan to week 12, and a plan for prayer on the floor with the surgeon's agreement.",
      ],
      education: [
        "• القيودُ تنتهي بكلمة الجرّاح في زيارة الأسبوع السادس لا قبلها — والأرضُ والسجودُ والتربّعُ بعد إذنه وبالتدريج.\n" +
        "• البرنامجُ المنزليّ ٣–٥ مرّاتٍ في الأسبوع حتى الأسبوع الثاني عشر، ومراجعةٌ عندها.\n" +
        "• المشيُ ٣٠ دقيقة متّصلة هدفٌ يوميّ.\n" +
        "• القيادةُ والعودةُ إلى العمل بإذن الجرّاح.\n" +
        "• العرجُ الباقي يُعالَج بالقوّة لا بالانتظار — ودورةٌ متأخّرة تفيد مَن بقي ضعفُه.",
        "• Restrictions end with the surgeon's word at the six-week visit, not before — floor sitting, prostration and cross-legged sitting come after their agreement, step by step.\n" +
        "• The home programme 3–5 times a week until week 12, with a review then.\n" +
        "• 30 minutes of continuous walking is a daily goal.\n" +
        "• Driving and returning to work with the surgeon's agreement.\n" +
        "• A remaining limp is treated with strength, not waiting — a late course helps those who stay weak.",
      ],
      criteria: [
        "الخروجُ إلى البرنامج المنزليّ حين تتحقّق كلُّها:\n" +
        "• مشيٌ بلا أداة داخلَ البيت (والعصا في الشارع اختيارٌ لا حاجة) بلا عرجٍ ولا ميل.\n" +
        "• «النهوض والمشي» ضمن حدّ عمره (Bohannon 2006: ٩٫٠ ثوانٍ أو أقلّ في الستّينات، و١٠٫٢ في السبعينات، و١٢٫٧ بعد الثمانين).\n" +
        "• درجٌ درجةً بعد درجة بالدرابزين.\n" +
        "• انتقالٌ مستقلّ آمن: السريرُ والكرسيّ والمرحاضُ والسيارة.\n" +
        "• نتائجُ الورك المختصر (HOOS-JR) ٧٧ فأكثر (Kunze 2022) أو تحسّنٌ ٢٣ نقطة فأكثر (Dekhne 2024).\n" +
        "• يذكر برنامجَه المنزليّ ويؤدّيه.\n" +
        EXTEND_AR,
        "Discharge to the home programme when all are met:\n" +
        "• Walking without an aid indoors (a cane outdoors by choice, not need) without a limp or lean.\n" +
        "• Timed Up and Go within the limit for age (Bohannon 2006: 9.0 s or less in the sixties, 10.2 in the seventies and 12.7 after eighty).\n" +
        "• Step-over-step stairs with the rail.\n" +
        "• Safe independent transfers: bed, chair, toilet and car.\n" +
        "• HOOS-JR of 77 or more (Kunze 2022) or an improvement of 23 points or more (Dekhne 2024).\n" +
        "• States and performs the home programme.\n" +
        EXTEND_EN,
      ],
      notes: [
        "• دائرةُ Monaghan 2017 (جلستان في الأسبوع ٣٠ دقيقة، نحو ١٠ تكرارات لكلّ محطّة): الجلوسُ والقيام، ورفعُ الكعبين، ورفعُ الركبة، ورفعُ الساق جانباً وللخلف، وثنيُ الركبتين حتى ٣٠°، وثنيُ الساق الواحدة حتى ٣٠°، والوقوفُ على ساقٍ ١٠ ثوانٍ، ورفعُ الحوض وخفضُه — وتدريبُ مهارات المشي في Heiberg 2012 زاد المشيَ ستّ دقائق ٥٢ متراً.\n" +
        "• التقويةُ القصوى لمن هو دون السبعين وبلا قيد: ضغطُ الساقين والتبعيدُ ٤ × ٥ بثقلٍ ٨٥–٩٠٪ من الأقصى، ويُزاد الثقلُ حين يؤدّي ٦ (Husby 2009 · Winther 2018 — بعد المدخل الخلفيّ، وكانت مقبولة)؛ ولا تبعيدَ ضدّ مقاومةٍ قبل الأسبوع السادس بعد المدخل الجانبيّ.\n" +
        "• الصدفةُ والتبعيدُ على الجنب: بعد المدخل الأماميّ؛ وبعد الخلفيّ بإذن الجرّاح ووسادةٌ بين الركبتين؛ وبعد الجانبيّ بعد ستّة أسابيع.\n" +
        "• الأرضُ والسجود: بعد زيارة الجرّاح فقط — وإن لم تأتِ قبل الجلسة ١٨ فهي في التمديد أو في البيت بالبطاقة.\n" +
        "• مَن يبقى عرجُه أو ضعفُه في الأسبوع الثاني عشر: دورةٌ متأخّرة ١٢ جلسة جلستين في الأسبوع (Monaghan 2017 · Heiberg 2012).\n" +
        "• جهازٌ مساعدٌ واحد بالتناوب قبل التمارين لمن يحتاجه — والحرارةُ لا فوق الورك قبل الأسبوع السادس.",
        "• The Monaghan 2017 circuit (twice a week for 30 minutes, about 10 repetitions per station): sit-to-stand, heel raises, knee raises, side and back leg raises, knee bends to 30°, single-leg knee bends to 30°, single-leg stance for 10 seconds, and pelvic raise and lower — and the walking-skill training of Heiberg 2012 added 52 m to the six-minute walk.\n" +
        "• Maximal strength training for those under seventy with no restriction: leg press and abduction 4 × 5 at 85–90% of maximum, raising the load when 6 are achieved (Husby 2009 · Winther 2018 — after a posterior approach, and it was well tolerated); no resisted abduction before week 6 after a direct lateral approach.\n" +
        "• Clamshell and side-lying abduction: after an anterior approach; after a posterior approach with the surgeon's agreement and a pillow between the knees; after a direct lateral approach after six weeks.\n" +
        "• Floor sitting and prostration: only after the surgeon's review — if it does not come before session 18, it belongs to the extension or to home practice with the card.\n" +
        "• A patient whose limp or weakness persists at week 12: a late course of 12 sessions, two a week (Monaghan 2017 · Heiberg 2012).\n" +
        "• One adjunct device in rotation before exercise for those who need it — and no heat over the hip before week 6.",
      ],
      exercises: [
        { code: "leg-press-progressive", sets: 3, reps: 8, doseNote: ["أيّامُ القوّة: ٣ × ٨ متعبة؛ ولمن هو دون السبعين وبلا قيد ٤ × ٥ بثقلٍ ثقيل (Husby 2009 · Winther 2018).", "Strength days: 3 × 8 tiring; for those under seventy with no restriction, 4 × 5 heavy (Husby 2009 · Winther 2018)."] },
        { code: "standing-hip-three-way", sets: 3, reps: 8, doseNote: ["أيّامُ القوّة: ٣ × ٨ بالمطّاط أو الكابل.", "Strength days: 3 × 8 with a band or cable."] },
        { code: "step-up", sets: 3, reps: 10, doseNote: ["٣ × ١٠ على ١٥ ثمّ ٢٠ سم.", "3 × 10 on 15, then 20 cm."] },
        { code: "lateral-step-down", sets: 2, reps: 10, note: ["حتى ثني الركبة نحو ٣٠° والحوضُ مستوٍ — «ثنيُ الساق الواحدة» في دائرة Monaghan 2017.", "To about 30° of knee bend with the pelvis level — the 'single-leg knee bend' of the Monaghan 2017 circuit."] },
        { code: "wall-squat", sets: 2, reps: 10, note: ["إلى ٣٠° من ثني الركبة لا أعمق، والركبتان متباعدتان.", "To 30° of knee bend and no deeper, knees apart."] },
        { code: "pelvic-drop-step", sets: 3, reps: 10 },
        { code: "side-stepping", note: ["بمطّاطٍ فوق الركبتين — بعد الأسبوع السادس للمدخل الجانبيّ.", "With a band above the knees — after week 6 for a direct lateral approach."] },
        { code: "clamshell" },
        { code: "side-lying-hip-abduction", note: ["بعد المدخل الأماميّ؛ وبعد الخلفيّ بإذن الجرّاح ووسادةٌ بين الركبتين؛ وبعد الجانبيّ بعد ستّة أسابيع.", "After an anterior approach; after a posterior approach with the surgeon's agreement and a pillow between the knees; after a direct lateral approach after six weeks."] },
        { code: "single-leg-balance", note: ["مع الالتفات بالرأس، ثمّ على أرضٍ أطرى.", "With head turns, then on a softer surface."] },
        { code: "obstacle-dual-task-walking" },
        { code: "graded-walking", doseNote: ["٣٠ دقيقةً متّصلة يومياً هدفُ الخروج.", "30 continuous minutes daily is the discharge goal."] },
        { code: "stationary-cycling", doseNote: ["١٥–٢٠ دقيقة بمقاومةٍ متوسّطة في الأيّام الخفيفة.", "15–20 minutes at moderate resistance on the light days."] },
        { code: "car-transfer-hip", note: ["قبل الرحلات الطويلة، والسيارةُ الواطئة بإذن الجرّاح.", "Before long journeys; a low car only with the surgeon's agreement."] },
        { code: "prayer-progression-hip", note: ["مرحلةُ التدرّج إلى الأرض: بعد زيارة الجرّاح وإذنه فقط.", "The graded return to the floor: only after the surgeon's review and agreement."] },
      ],
    },
  ],
};

/** **«اضغطه يا سليم»** (§4.dy) — أسئلةُ هذا البروتوكول للمشرف العام، تُزرع بـ`checklistSql` ولا تكتب فوق ما علّمه. */
export const CHECKLIST: ChecklistSeed[] = [
  { key: "dose", topic: "dose",
    ar: "العدد ١٨ وتمديدٌ واحد بستّ بمعيار — أقلّ من الركبة لأنّ الورك يتعافى أسرع، ولم تختبر تجربةٌ ستَّ جلساتٍ في الأسبوع: أبقِه أو عدّله.",
    en: "18 sessions with one criteria-based extension of six — fewer than the knee because the hip recovers faster, and no trial tested six sessions a week: keep or adjust." },
  { key: "limits", topic: "limits",
    ar: "الحدود: الوقوفُ على الساق ثانيتان ثمّ خمسٌ لإنزال الأداة، و«الجلوس والوقوف» يزيد مرّتين، و«النهوض والمشي» بحدّ العمر، ونتائجُ الورك المختصر ٧٧ — اقتراحٌ مبنيّ على الدراسات المكتوبة في معايير المراحل: أبقِها أو عدّلها.",
    en: "Limits: single-leg stance of 2 then 5 seconds to step the aid down, chair stand +2, TUG within the age limit, HOOS-JR 77 — proposals built on Hol 2010, Bohannon 2006, Unver 2015 and Kunze 2022: keep or adjust." },
  { key: "precautions", topic: "content",
    ar: "القيودُ الافتراضية بحسب المدخل حين لا يكتب الجرّاحُ شيئاً (الخلفيّ والأماميّ والجانبيّ ستّةَ أسابيع) — والدليلُ لا يرى قيوداً صارمة: أبقِها كما كُتبت أو عدّلها لما يكتبه جرّاحو مرضاك.",
    en: "The default restrictions by approach when the surgeon writes none (posterior, anterior and direct lateral, six weeks) — the evidence does not support strict restrictions: keep them as written or adjust them to what your patients' surgeons write." },
  { key: "device-electro", topic: "devices",
    ar: "التحفيزُ مساعدٌ بقاعدتك والدليلُ متضارب (تجربةٌ نفعت وأخرى لم تنفع)، وإعداداتُه من تجربة الركبة لأنّ إعداداتِ تجارب الورك لم تُقرأ — أبقِها أو عدّلها من جهازك.",
    en: "NMES is an adjunct by your rule (the evidence conflicts: Gremeaux 2008 helped, Suetta 2004 did not), and its settings come from the knee trial because the hip trials' settings could not be read — keep or adjust them from your device." },
  { key: "device-magnet", topic: "devices",
    ar: "المغناطيسُ مساعدٌ بقاعدتك والدليلُ ضعيفٌ جدّاً (تجربةٌ على إعادة الاستبدال)، وبلا إعدادات — املأها من جهاز المركز، أو اجعله «لا يُستخدم».",
    en: "Magnetic therapy is an adjunct by your rule with very weak evidence (a trial in revision surgery), and has no settings — fill them in from the centre's device, or set it to 'Not used'." },
  { key: "measures-add", topic: "measures",
    ar: "أضف من «المقاييس» ← مقياسٌ خاص: أكسفورد للورك بالعربية (من ٠ إلى ٤٨، الأعلى أفضل، والتغيّرُ المهمّ ٨) أو هاريس للورك بالعربية (من ١٠٠)، والوقوفَ على الساق المعمولة بالثواني — ومصادرُهما في «التقييم».",
    en: "Add under 'Measures' → custom measure: the Arabic Oxford Hip Score (0 to 48, higher is better — Khaja 2020, important change 8) or the Arabic Harris Hip Score (out of 100 — Alshaygy 2023), and single-leg stance on the operated leg in seconds." },
];

export const name = "140_physio_tha_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code), checklistSql(PROTOCOL.code, CHECKLIST)].join("\n\n");
