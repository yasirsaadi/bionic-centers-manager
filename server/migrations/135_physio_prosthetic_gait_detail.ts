// Migration 135: التدريبُ على المشي بالطرف الصناعيّ السفليّ — البروتوكولُ الثامن مفصَّلاً (§4.dt — ٢٠٢٦-١٠-١٢).
//
// **بقرار المالك تتقدّم بروتوكولاتُ الأطراف** («نعم انت محق فالاطراف مهمة ايضا» — ٢٠٢٦-١٠-١٢): المشيُ بالطرف أوّلاً، ثمّ ما قبل الطرف، ثمّ بترُ الطرف العلويّ.
// `lower-limb-prosthetic-gait-adult` **بالقالب كاملاً** (§4.dd): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة لمبتور تحت الركبة، **و٣٦ لمبتور فوق الركبة أو قاصر الدوران أو
// مستوى K1–K2** (يعدّله الأخصائيُّ لمريضه)، وثلاثُ مراحل بنطاقاتٍ (١–٦ · ٧–١٨ · ١٩–٢٤) ومعايير انتقالٍ رقمية، وإحدى عشرةَ بطاقةً جديدة (خمسَ عشرةَ صورةً مطلوبة)
// وستُّ بطاقاتٍ معادة بصورها (الجلوسُ والقيام، الجسر، رفعُ الساق جانباً، صعودُ الدرجة، تمرينُ البطن المعدَّل، المشيُ بين العوائق) — بقاعدة المالك «لا تطلب صوراً مكرّرة»،
// والأجهزةُ الأحدَ عشر بدرجة دليلها و«استعمال المركز»، والمقاييسُ كما زُرعت (AMPPRO · المشيُ ٦ دقائق · TUG · مستوى K). كلُّه مسوّدة حتى يعتمده المشرفُ العام.
//
// **ما يخصّ المبتور**: التمرينُ وتدريبُ المشي وحدهما بدليلٍ من التجارب — ودليلُهما ضعيف (VA/DoD 2024 «ضعيفةٌ لصالحه» بثقةٍ منخفضةٍ جدّاً)، **ولا دليلَ على عدد
// الجلسات** (BACPAR 2020 «بقدر حاجة المريض» — إجماع) — فالعددُ اختيارُ خدمةٍ مكتوبٌ صريحاً والانتقالُ بالمعيار لا بالعدد. والأجهزةُ: لا دليلَ لأيٍّ منها في المشي بالطرف،
// **والحرارةُ ممنوعةٌ على جلدٍ ضعيف الإحساس أو ناقص التروية** (Houghton 2010) — ومرضى السكّري وقصور الشرايين كثيرون بين المبتورين؛ فالتحفيزُ (للألم الشبحيّ)
// والمغناطيسُ والتيكارُ مساعدةٌ بقاعدة سليم بشروطها، والباقي «لا يُستخدم» بسببه.
//
// المصادرُ ثلاثةٌ وثلاثون، عناوينُها ومعرّفاتُها من سجلّ Europe PMC (وأربعةُ أدلّةٍ من مواقع جهاتها). القواعدُ في `physio_content.ts` كما في ما قبله.
import { exercisesSql, openPlansPhasesSql, protocolContentSql, type ExerciseSeed, type ProtocolContentSeed } from "./physio_content";

/** **البطاقاتُ الجديدة** — إحدى عشرة؛ والمعادةُ الستّ (بطاقاتٌ زُرعت في ١١٩ و١٢٦ و١٢٩) تُربط برموزها وصورها، وما يخصّ الطرفَ فيها في ملاحظة المرحلة. */
export const EXERCISES: ExerciseSeed[] = [
  // ═══ المرحلة ١ ═══
  {
    code: "prosthesis-donning-skin-check", nameAr: "لبس الطرف وخلعه وفحص الجلد وجوارب الجذع", nameEn: "Donning and doffing the prosthesis, skin check and sock ply",
    kind: "functional", region: "whole_body", sets: 1, reps: 1,
    purpose: ["يمنع جروحَ الجذع وتقرّحَه — أشيعَ ما يوقف المشيَ بالطرف — ويجعل المريضَ مستقلّاً في لبس طرفه وفي إحكام القالب بالجوارب كلّما تغيّر حجمُ الجذع خلال اليوم.",
      "Prevents residual-limb wounds and breakdown — the commonest reason walking with a prosthesis stops — and makes the patient independent in putting the prosthesis on and in keeping the socket snug with socks as the limb volume changes through the day."],
    start: ["جالسٌ على كرسيٍّ ثابت أو حافّة السرير، والجذعُ نظيفٌ جافّ، وأمامه البطانةُ (Liner) وجواربُ الجذع والطرفُ ومرآةٌ صغيرة.",
      "Sitting on a stable chair or the edge of the bed with the residual limb clean and dry, and the liner, residual-limb socks, prosthesis and a small mirror in front of you."],
    steps: [[
      "افحص الجذعَ قبل اللبس: لا جرحَ ولا فقاعةَ ولا احمرارَ باقٍ من المرّة السابقة.",
      "اقلب البطانةَ على نفسها ثمّ لُفَّها على الجذع لفّاً من طرفه إلى الأعلى — لا تسحبها سحباً — بلا هواءٍ ولا تجاعيد.",
      "البس عددَ الجوارب الذي يُحكم القالب (Sock ply)، ثمّ أدخل الجذعَ في القالب وقِف وحمّل الوزنَ حتى تسمع «طقّة» القفل أو يُحكم الشفط.",
      "امشِ خطواتٍ قليلة: القالبُ مريحٌ بلا ألمٍ في نقطةٍ واحدة ولا انزلاقٍ إلى الأعلى والأسفل.",
      "بعد الخلع افحص الجلدَ كلَّه بالمرآة (طرفَ الجذع وخلفَه خاصّةً) — والاحمرارُ يجب أن يزول خلال ١٠–٢٠ دقيقة.",
      "اغسل البطانةَ والجذعَ بالماء والصابون الخفيف كلَّ يوم، وجفّفهما جيداً قبل اللبس التالي.",
    ], [
      "Check the residual limb before donning: no wound, no blister and no redness left over from last time.",
      "Turn the liner inside out and roll it onto the limb from the tip upwards — do not pull it on — with no trapped air and no wrinkles.",
      "Put on the number of socks that makes the socket snug (sock ply), then place the limb in the socket, stand and load it until the pin clicks or the suction seals.",
      "Take a few steps: the socket is comfortable, with no pain at a single point and no pumping up and down.",
      "After removing it, inspect all the skin with the mirror (especially the tip and the back of the limb) — any redness should fade within 10–20 minutes.",
      "Wash the liner and the limb every day with water and mild soap, and dry both well before the next donning.",
    ]],
    cues: [[
      "سحبُ البطانة بقوّة ⟵ لفُّها على الجذع، فالسحبُ يشدّ الجلدَ ويجرحه.",
      "القالبُ واسع (الجذعُ ينزل فيه أو يتحرّك) ⟵ أضف جورباً واحداً في كلّ مرّة، لا عدّةَ جوارب معاً.",
      "احمرارٌ لا يزول بعد ٢٠ دقيقة، أو في المكان نفسِه كلَّ يوم ⟵ قلّل مدّةَ اللبس وأخبر المعالج أو فنّيَّ الأطراف قبل الجلسة التالية.",
      "الحاجةُ إلى ٨–١٠ طبقاتٍ من الجوارب باستمرار ⟵ القالبُ صار واسعاً ويحتاج تعديلاً عند فنّيّ الأطراف.",
    ], [
      "Pulling the liner on hard → roll it onto the limb; pulling stretches the skin and injures it.",
      "A loose socket (the limb sinks or moves in it) → add one sock at a time, not several at once.",
      "Redness that does not fade after 20 minutes, or in the same place every day → shorten wearing time and tell the therapist or prosthetist before the next session.",
      "Needing 8–10 ply of socks all the time → the socket has become too big and needs adjusting by the prosthetist.",
    ]],
    easier: ["بمساعدة شخصٍ أو المعالج، وفحصُ الجلد بالمرآة بيد شخصٍ آخر.", "With help from another person or the therapist, and the mirror skin check done by someone else."],
    harder: ["اللبسُ واقفاً، وضبطُ الجوارب وحده خلال اليوم بحسب إحساسه بالقالب.", "Donning while standing, and adjusting the socks alone through the day by how the socket feels."],
    stopIf: ["جرحٌ أو فقاعةٌ أو احمرارٌ لا يزول خلال ٢٠ دقيقة، أو ألمٌ في نقطةٍ من القالب — لا يُلبس الطرفُ حتى يراه المعالج.",
      "A wound, a blister or redness that does not fade within 20 minutes, or pain at one point in the socket — do not wear the prosthesis until the therapist has seen it."],
    equipment: ["البطانة، وجواربُ الجذع بسماكاتٍ مختلفة، ومرآةٌ صغيرة، وكرسيٌّ ثابت.", "The liner, residual-limb socks of different thicknesses, a small mirror and a stable chair."],
    doseNote: ["عند كلّ لبسٍ وخلع، وفحصُ الجلد بعد كلّ خلع.", "Every time the prosthesis goes on and off, with a skin check after every removal."],
    images: [
      { key: "prosthesis-donning-1", ar: "لفُّ البطانة على الجذع من طرفه إلى الأعلى", en: "Rolling the liner onto the residual limb from the tip upwards", search: "prosthetic liner donning roll on residual limb" },
      { key: "residual-limb-skin-check-1", ar: "فحصُ جلد الجذع بمرآةٍ صغيرة بعد خلع الطرف", en: "Checking the residual-limb skin with a small mirror after removing the prosthesis", search: "residual limb skin inspection mirror amputee" },
    ],
  },
  {
    code: "prosthetic-weight-shift-scales", nameAr: "نقل الوزن إلى الطرف بين القضبان المتوازية (بميزانين)", nameEn: "Weight shifting onto the prosthesis in the parallel bars (with two scales)",
    kind: "balance", region: "whole_body", sets: 3, reps: 10, hold: 5,
    purpose: ["يعلّم الثقةَ بالطرف وتحميلَه الوزن — والمبتورُ يحمّل الساقَ السليمة أكثر بطبعه فيعرج ويتعب ويُجهد ظهرَه. والميزانان يُريانه كم يحمّل كلَّ ساق؛ وتحميلُ الطرف تحسّن في تجربتين عشوائيّتين (Yiğiter 2002 · Rau 2007).",
      "Teaches trust in the prosthesis and loading it — amputees naturally load the sound leg more, so they limp, tire and strain the back. The two scales show how much each leg carries; prosthetic loading improved in two randomised trials (Yiğiter 2002 · Rau 2007)."],
    start: ["واقفٌ بين القضبان المتوازية والقدمان بعرض الورك، كلُّ قدمٍ على ميزانٍ منزليّ، واليدان على القضبان برفق.",
      "Standing in the parallel bars with the feet hip-width apart, each foot on a bathroom scale, and the hands resting lightly on the bars."],
    steps: [[
      "قِف معتدلاً وانظر إلى الميزانين: كم على كلّ ساق؟",
      "انقل الحوضَ ببطءٍ فوق قدم الطرف حتى يقرأ ميزانُه أكثرَ ما تستطيع بلا ألم.",
      "اثبت ٣–٥ ثوانٍ والجذعُ مستقيمٌ فوق الحوض، ثمّ عُد إلى الوسط.",
      "كرّر إلى الجهة السليمة، ثمّ إلى الأمام والخلف وقدمٌ أمام الأخرى.",
      "خفّف الاعتمادَ على اليدين تدريجياً: يدان، ثمّ يد، ثمّ أطرافُ الأصابع.",
    ], [
      "Stand upright and look at the scales: how much is on each leg?",
      "Slowly move the pelvis over the prosthetic foot until its scale reads as much as you can manage without pain.",
      "Hold 3–5 seconds with the trunk upright over the pelvis, then return to the middle.",
      "Repeat towards the sound side, then forwards and backwards with one foot in front of the other.",
      "Gradually rely less on the hands: two hands, then one, then fingertips.",
    ]],
    cues: [[
      "ميلُ الجذع نحو الطرف بدل نقل الحوض ⟵ الحوضُ ينتقل والكتفان فوقه.",
      "الضغطُ على القضبان باليدين ⟵ لمسٌ خفيف، فاليدان للأمان لا للحمل.",
      "انثناءُ الورك أو ركبة الطرف عند التحميل ⟵ الوركُ ممدودٌ إلى الأمام (وعند مبتور فوق الركبة يثبّت بسطُ الورك الركبةَ الصناعية).",
    ], [
      "Leaning the trunk towards the prosthesis instead of moving the pelvis → the pelvis moves and the shoulders stay over it.",
      "Pressing down on the bars → a light touch only; the hands are for safety, not for carrying weight.",
      "The hip or prosthetic knee bending as you load → push the hip forwards (above the knee, hip extension is what keeps the prosthetic knee stable).",
    ]],
    easier: ["نقلٌ أقلّ مدىً، أو باليدين على القضبان، أو نقلُ الوزن جالساً على كرسيٍّ عالٍ أوّلاً.", "A smaller shift, both hands on the bars, or shifting weight while sitting on a high chair first."],
    harder: ["بلا يدين، ثمّ بعينين مغلقتين، ثمّ واقفاً على وسادةٍ إسفنجية.", "No hands, then eyes closed, then standing on a foam cushion."],
    stopIf: ["ألمٌ في القالب أو على عظم الجذع، أو دوخة، أو فقدانُ التوازن المتكرّر.", "Pain in the socket or over the bone of the residual limb, dizziness, or repeated loss of balance."],
    equipment: ["القضبانُ المتوازية وميزانان منزليّان؛ وفي البيت طاولةُ المطبخ الثابتة بعد أن يأذن المعالج.",
      "The parallel bars and two bathroom scales; at home, a solid kitchen counter once the therapist allows it."],
    doseNote: ["٣ × ١٠ لكلّ اتّجاه بثباتٍ ٣–٥ ثوانٍ.", "3 × 10 in each direction with 3–5 second holds."],
    images: [{ key: "prosthetic-weight-shift-1", ar: "مبتورٌ بين القضبان المتوازية ينقل وزنه إلى الطرف وتحت كلّ قدمٍ ميزان", en: "An amputee in the parallel bars shifting weight onto the prosthesis with a scale under each foot", search: "amputee weight shifting parallel bars prosthesis scales" }],
  },
  {
    code: "prosthetic-stance-stool-tap", nameAr: "الوقوف على الطرف ولمس كرسيٍّ صغير بالقدم السليمة", nameEn: "Standing on the prosthesis with sound-foot stool taps",
    kind: "balance", region: "whole_body", sets: 3, reps: 10,
    purpose: ["يدرّب مرحلةَ الوقوف على الطرف — حين تكون الساقُ السليمة في الهواء أثناء الخطوة — والحوضُ مستوٍ؛ وهو من مكوّنات تدريب المشي في التجارب (Yiğiter 2002).",
      "Trains the stance phase on the prosthesis — when the sound leg is in the air during a step — with a level pelvis; it is part of gait training in the trials (Yiğiter 2002)."],
    start: ["واقفٌ بين القضبان أو بجانب طاولةٍ ثابتة، وأمام القدم السليمة كرسيٌّ صغير أو درجةٌ بارتفاع ١٠–١٥ سم.",
      "Standing in the parallel bars or beside a solid table, with a small stool or a 10–15 cm step in front of the sound foot."],
    steps: [[
      "حمّل الطرفَ والجذعُ مستقيم.",
      "ارفع القدمَ السليمة والمس بها سطحَ الكرسيّ الصغير برفق.",
      "أعِدها إلى الأرض، والحوضُ مستوٍ طوالَ الحركة.",
      "كرّر بإيقاعٍ هادئ، ثمّ اثبت على الطرف والقدمُ السليمة فوق الكرسيّ ١٠–٣٠ ثانية.",
    ], [
      "Load the prosthesis with the trunk upright.",
      "Lift the sound foot and touch the top of the stool lightly.",
      "Bring it back to the floor, keeping the pelvis level throughout.",
      "Repeat at a calm rhythm, then hold on the prosthesis with the sound foot on the stool for 10–30 seconds.",
    ]],
    cues: [[
      "هبوطُ الحوض في الجهة السليمة أو ميلُ الجذع نحو الطرف ⟵ شدّ الألويةَ في جهة الطرف وأبقِ الحوضَ مستوياً.",
      "النظرُ إلى القدمين ⟵ النظرُ إلى الأمام.",
      "ضربٌ قويّ على الكرسيّ ⟵ لمسٌ خفيفٌ متحكَّمٌ به.",
    ], [
      "The pelvis dropping on the sound side or the trunk leaning towards the prosthesis → squeeze the buttock on the prosthetic side and keep the pelvis level.",
      "Looking down at the feet → look ahead.",
      "Stamping on the stool → a light, controlled touch.",
    ]],
    easier: ["باليدين على القضبان، أو بكرسيٍّ أقلّ ارتفاعاً.", "Both hands on the bars, or a lower stool."],
    harder: ["بلا يدين، أو باللمس أماماً وجانباً وخلفاً، أو واقفاً على سطحٍ إسفنجيّ.", "No hands, touches to the front, side and back, or standing on a foam surface."],
    stopIf: ["ألمٌ في القالب، أو ركبةُ الطرف تنثني فجأة، أو فقدانُ التوازن المتكرّر.", "Pain in the socket, the prosthetic knee buckling, or repeated loss of balance."],
    equipment: ["القضبانُ المتوازية أو طاولةٌ ثابتة، وكرسيٌّ صغير أو درجةٌ ١٠–١٥ سم.", "The parallel bars or a solid table, and a small stool or a 10–15 cm step."],
    images: [{ key: "prosthetic-stool-tap-1", ar: "مبتورٌ واقفٌ على طرفه يلمس كرسيّاً صغيراً بقدمه السليمة", en: "An amputee standing on the prosthesis touching a small stool with the sound foot", search: "amputee stool stepping sound limb balance prosthesis" }],
  },
  {
    code: "prone-lying-hip-extension", nameAr: "الانبطاح وبسط الورك (منعُ تيبّس ثني الورك)", nameEn: "Prone lying and prone hip extension (preventing hip flexion contracture)",
    kind: "stretch", region: "hip", perSide: true, sets: 3, reps: 10, hold: 5,
    purpose: ["الجلوسُ الطويل يُقصّر عضلاتِ مقدّمة الورك، وتيبّسُ ثني الورك يمنع الطرفَ من الاستقامة تحت الجسم فيقصر الخطوةَ ويُميل الجذع — وأشدُّه عند مبتور فوق الركبة. والانبطاحُ يمطّها، ورفعُ الساق للخلف يقوّي الألويةَ التي تثبّت الطرف.",
      "Long sitting shortens the muscles at the front of the hip, and a hip flexion contracture stops the prosthesis lining up under the body, shortening the step and tilting the trunk — worst above the knee. Prone lying stretches them, and lifting the leg backwards strengthens the gluteals that stabilise the prosthesis."],
    start: ["منبطحٌ على سريرٍ ثابت أو على فرشةٍ على الأرض، والجذعُ ممدود، ولا وسادةَ تحت البطن ولا تحت الجذع.",
      "Lying face down on a firm bed or on a mattress on the floor, with the residual limb straight and no pillow under the stomach or the residual limb."],
    steps: [[
      "استلقِ منبطحاً والوجهُ إلى الجانب والذراعان مريحتان — وابقَ هكذا ١٥–٢٠ دقيقة إن أذن المعالج.",
      "شدّ البطنَ قليلاً، ثمّ ارفع الجذعَ للخلف بضعةَ سنتيمتراتٍ من السرير.",
      "اثبت ٥ ثوانٍ بلا تقويسٍ في أسفل الظهر، ثمّ أنزله ببطء.",
      "كرّر ١٠ مرّات، ثمّ الساقَ السليمة بالطريقة نفسِها والركبةُ مستقيمة.",
    ], [
      "Lie face down with the face to the side and the arms comfortable — stay like this for 15–20 minutes if the therapist allows it.",
      "Tighten the stomach slightly, then lift the residual limb a few centimetres back off the bed.",
      "Hold 5 seconds without arching the lower back, then lower it slowly.",
      "Repeat 10 times, then do the sound leg the same way with the knee straight.",
    ]],
    cues: [[
      "تقويسُ الظهر ورفعُ الحوض ⟵ الحركةُ صغيرةٌ من الورك والحوضُ على السرير.",
      "وسادةٌ تحت الجذع أو بين الفخذين ⟵ لا وسادة، فهي تُبقي الوركَ مثنياً.",
      "الجلوسُ بقيّةَ اليوم والجذعُ على حافّة الكرسيّ مثنيّاً ⟵ قلّل الجلوسَ الطويل، ولا وسادةَ تحت الجذع ولا تحت ركبة مبتور تحت الركبة.",
    ], [
      "Arching the back and lifting the pelvis → a small movement from the hip with the pelvis on the bed.",
      "A pillow under the residual limb or between the thighs → no pillow; it keeps the hip bent.",
      "Sitting the rest of the day with the residual limb bent over the edge of the chair → cut down long sitting, and no pillow under the residual limb or under the knee after a below-knee amputation.",
    ]],
    easier: ["الانبطاحُ دقائقَ أقلّ ثمّ زيادتُها، أو الاستلقاءُ على الظهر والركبةُ السليمة مضمومةٌ إلى الصدر والجذعُ ممدودٌ على السرير.",
      "Fewer minutes of prone lying, building up, or lying on the back with the sound knee held to the chest and the residual limb flat on the bed."],
    harder: ["رفعٌ أعلى بثقلٍ خفيف على الفخذ، أو بمطّاطٍ حول الفخذين.", "A higher lift with a light weight on the thigh, or with a band around the thighs."],
    stopIf: ["ألمٌ في أسفل الظهر، أو ضيقُ نفسٍ في الانبطاح (أمراضُ القلب والرئة — بإذن الطبيب).", "Low back pain, or breathlessness lying face down (heart and lung disease — only with the doctor's permission)."],
    equipment: ["سريرٌ ثابت أو فرشةٌ على الأرض.", "A firm bed or a mattress on the floor."],
    doseNote: ["الانبطاحُ ١٥–٢٠ دقيقة مرّتين أو ثلاثاً يومياً لمن أذن له المعالج، والرفعُ ٣ × ١٠ بثباتٍ ٥ ثوانٍ.",
      "Prone lying 15–20 minutes two or three times a day if the therapist allows it, and the lift 3 × 10 with 5-second holds."],
    images: [
      { key: "prone-lying-1", ar: "مبتورٌ فوق الركبة منبطحٌ والجذعُ ممدودٌ بلا وسادة", en: "A transfemoral amputee lying face down with the residual limb flat and no pillow", search: "prone lying amputee hip flexion contracture prevention" },
      { key: "prone-hip-extension-1", ar: "رفعُ الجذع للخلف في الانبطاح والحوضُ على السرير", en: "Lifting the residual limb backwards lying face down with the pelvis on the bed", search: "prone hip extension residual limb amputee exercise" },
    ],
  },
  // ═══ المرحلة ٢ ═══
  {
    code: "prosthetic-gait-drills", nameAr: "تدريب خطوات المشي بالطرف (تساوي الخطوتين وضربة الكعب والإيقاع)", nameEn: "Prosthetic gait drills (equal steps, heel strike and cadence)",
    kind: "functional", region: "whole_body", homeSuitable: false, sets: 4, reps: 1, rest: 60,
    purpose: ["المبتورُ يقصّر خطوةَ الساق السليمة ويقضي وقتاً أقلّ على الطرف — فيعرج ويتعب. والتدريبُ الماهر على المشي يحسّنه (ثقةٌ عالية)، والإرشادُ اللفظيّ واليدويّ مع تمرين أجزاء الخطوة قبل المشي كاملاً يحسّن المشيَ والدرج (ثقةٌ متوسّطة — Highsmith 2016).",
      "Amputees shorten the sound-side step and spend less time on the prosthesis — so they limp and tire. Skilled gait training improves walking (high confidence), and verbal and manual cues with part-practice before the whole step improve walking and stairs (moderate confidence — Highsmith 2016)."],
    start: ["واقفٌ عند بداية ممرٍّ طوله ١٠ أمتار (أو بين القضبان أوّلاً) بالمساعِد الذي يحتاجه، والمعالجُ بجانبه.",
      "Standing at the start of a 10-metre walkway (or in the parallel bars first) with whatever walking aid is needed, and the therapist alongside."],
    steps: [[
      "جزءٌ أوّل: خطوةٌ بالساق السليمة إلى الأمام والعودة، والوزنُ يبقى على الطرف — ١٠ مرّات.",
      "جزءٌ ثانٍ: خطوةٌ بالطرف تبدأ بالكعب، ثمّ نقلُ الوزن فوقه حتى مقدّمة القدم — ١٠ مرّات.",
      "ثمّ امشِ ١٠ أمتار بخطوتين متساويتين في الطول والزمن، والجذعُ مستقيم، والذراعان تتأرجحان.",
      "على إيقاع المترونوم (عدٌّ ثابت) إن كان الإيقاعُ غيرَ منتظم.",
      "٣–٤ مرّات، والمعالجُ يصحّح خطأً واحداً في كلّ مرّة.",
    ], [
      "Part one: a step forwards and back with the sound leg while the weight stays on the prosthesis — 10 times.",
      "Part two: a step with the prosthesis landing on the heel, then moving the weight over it to the front of the foot — 10 times.",
      "Then walk 10 metres with two steps equal in length and timing, the trunk upright and the arms swinging.",
      "To a metronome (a steady count) if the rhythm is uneven.",
      "3–4 times, with the therapist correcting one fault each time.",
    ]],
    cues: [[
      "الخطوةُ السليمة أقصر ⟵ «ابقَ على الطرف أطول، واجعل الخطوةَ السليمة طويلةً مثلها».",
      "ميلُ الجذع نحو الطرف عند الوقوف عليه ⟵ «الكتفان مستويان والحوضُ فوق القدم».",
      "إبعادُ الطرف إلى الجانب أو رفعُ الحوض لتمريره ⟵ مراجعةُ طول الطرف وضبطِه مع فنّيّ الأطراف قبل أن يُعدّ خطأً في المشي.",
    ], [
      "A shorter sound-side step → 'stay on the prosthesis longer, and make the sound step as long'.",
      "The trunk leaning towards the prosthesis in stance → 'shoulders level and pelvis over the foot'.",
      "Swinging the prosthesis out to the side or hitching the pelvis to clear it → check the prosthesis length and alignment with the prosthetist before treating it as a walking fault.",
    ]],
    easier: ["بين القضبان، أو بمساعِدٍ أكبر (مشّاية)، ومسافةٌ أقصر.", "In the parallel bars, with a bigger aid (a walking frame), and a shorter distance."],
    harder: ["بأقلّ مساعِد ثمّ بلا مساعِد، وبسرعاتٍ مختلفة.", "With the least aid and then none, and at different speeds."],
    stopIf: ["ألمٌ في القالب، أو تعبٌ يُفسد المشي (استرح ثمّ أعِد)، أو دوخةٌ أو ضيقُ نفسٍ غيرُ معتاد.", "Pain in the socket, fatigue that spoils the walking pattern (rest, then repeat), or dizziness or unusual breathlessness."],
    equipment: ["ممرٌّ مستوٍ معلَّمٌ بالأمتار، ومترونوم أو تطبيقٌ في الهاتف، ومرآةٌ طويلة إن وُجدت.", "A level walkway marked in metres, a metronome or phone app, and a long mirror if available."],
    images: [{ key: "prosthetic-gait-drill-1", ar: "معالجٌ يرشد مبتوراً يمشي بطرفه في ممرٍّ إلى خطوتين متساويتين", en: "A therapist cueing an amputee walking with a prosthesis in a corridor towards equal steps", search: "prosthetic gait training physiotherapist amputee walking" }],
  },
  {
    code: "resisted-gait-pnf", nameAr: "المشي ضدّ مقاومة المعالج على الحوض (التسهيل العصبيّ العضليّ)", nameEn: "Resisted gait with pelvic resistance (PNF)",
    kind: "functional", region: "whole_body", homeSuitable: false, sets: 3, reps: 1, rest: 60,
    purpose: ["مقاومةٌ يدويةٌ خفيفة على الحوض تُشعر المريضَ بتحميل الطرف وتقدّمِ الحوض فوقه — وفاقت التدريبَ التقليديّ في تجربةٍ عشوائية عند مبتوري فوق الركبة (Yiğiter 2002)، والمشيُ بالمقاومة والتدريبُ الوظيفيّ أنفعُ من المشي المشرَف عليه وحده (Wong 2016).",
      "Light manual resistance at the pelvis helps the patient feel the prosthesis taking load and the pelvis moving over it — it beat traditional training in a randomised trial above the knee (Yiğiter 2002), and resisted gait and functional training worked better than supervised walking alone (Wong 2016)."],
    start: ["واقفٌ بين القضبان أو في الممرّ، والمعالجُ خلفه أو أمامه ويداه على عظمَي الحوض.",
      "Standing in the parallel bars or the walkway, with the therapist behind or in front and both hands on the pelvic bones."],
    steps: [[
      "المعالجُ يضغط ضغطاً خفيفاً على الحوض للأسفل والخلف، والمريضُ يدفع حوضَه نحو اليدين.",
      "خطوةٌ بالساق السليمة والمعالجُ يقاوم تقدّمَ الحوض فوق الطرف، فيحمّله المريضُ أكثر.",
      "ثمّ خطواتٌ متتابعة والمقاومةُ تخفّ تدريجياً حتى يمشي بلا مقاومةٍ بالنمط نفسِه.",
      "٣ مرّات × ١٠ أمتار تقريباً.",
    ], [
      "The therapist presses lightly down and back on the pelvis, and the patient pushes the pelvis into the hands.",
      "A step with the sound leg while the therapist resists the pelvis moving over the prosthesis, so the patient loads it more.",
      "Then consecutive steps, with the resistance fading until the patient walks with the same pattern and no resistance.",
      "3 times × about 10 metres.",
    ]],
    cues: [[
      "مقاومةٌ قويّة تكسر المشي ⟵ مقاومةٌ تُحسّ ولا توقف الخطوة.",
      "الدفعُ بالجذع بدل الحوض ⟵ «ادفع بحوضك نحو يديّ».",
      "حبسُ النفس ⟵ تنفّس طوال الخطوات.",
    ], [
      "Resistance so strong it breaks the walking pattern → resistance that is felt but does not stop the step.",
      "Pushing with the trunk instead of the pelvis → 'push your pelvis into my hands'.",
      "Holding the breath → keep breathing throughout.",
    ]],
    easier: ["مقاومةٌ أخفّ، أو في نقل الوزن واقفاً قبل الخطوة.", "Lighter resistance, or applied to standing weight shifts before stepping."],
    harder: ["مقاومةٌ أكبر، أو مع تغيير الاتّجاه.", "More resistance, or with changes of direction."],
    stopIf: ["ألمٌ في القالب أو في الظهر، أو فقدانُ التوازن.", "Pain in the socket or the back, or loss of balance."],
    equipment: ["القضبانُ المتوازية أو ممرٌّ مستوٍ.", "The parallel bars or a level walkway."],
    doseNote: ["نحو ١٠ دقائق من الجلسة، بيد المعالج.", "About 10 minutes of the session, by the therapist."],
    images: [{ key: "resisted-gait-pnf-1", ar: "المعالجُ يقاوم حوضَ المريض بيديه وهو يخطو على طرفه", en: "The therapist resisting the patient's pelvis with both hands as they step onto the prosthesis", search: "PNF resisted gait pelvis amputee physiotherapy" }],
  },
  {
    code: "prosthetic-turning-directions", nameAr: "الاستدارة وتغيير الاتّجاه والمشي جانباً وللخلف", nameEn: "Turning, changing direction, side-stepping and walking backwards",
    kind: "balance", region: "whole_body", sets: 2, reps: 5,
    purpose: ["الاستدارةُ من لحظات السقوط الشائعة عند المبتور: الاستدارةُ نصفَ دورةٍ في ٣٫٧ ثانيةٍ فأكثر أو بستّ خطواتٍ فأكثر علامةُ خطر سقوطٍ متكرّر بعد بتر تحت الركبة (Dite 2007). والمشيُ جانباً وللخلف يدرّب التحكّمَ بالحوض في كلّ الاتّجاهات.",
      "Turning is a common moment for falls after amputation: a half turn taking 3.7 seconds or more, or six steps or more, marks a risk of repeated falls after a below-knee amputation (Dite 2007). Side-stepping and walking backwards train pelvic control in every direction."],
    start: ["في ممرٍّ أو بين القضبان، بالمساعِد إن لزم، والمعالجُ بجانبه.", "In a walkway or the parallel bars, with a walking aid if needed and the therapist alongside."],
    steps: [[
      "استدر إلى جهة الطرف بخطواتٍ صغيرةٍ متعدّدة لا بدورانٍ على قدمٍ واحدة — ٥ مرّات، ثمّ إلى الجهة السليمة.",
      "امشِ جانباً ٥ خطواتٍ إلى كلّ جهة، والقدمان لا تتقاطعان.",
      "امشِ للخلف ٥ خطواتٍ قصيرة والجذعُ مستقيم.",
      "ثمّ امشِ على شكل الرقم ٨ حول كرسيّين.",
    ], [
      "Turn towards the prosthetic side with several small steps, not by pivoting on one foot — 5 times, then towards the sound side.",
      "Side-step 5 steps each way without crossing the feet.",
      "Walk backwards 5 short steps with the trunk upright.",
      "Then walk a figure of eight around two chairs.",
    ]],
    cues: [[
      "الدورانُ على قدم الطرف وهي ثابتةٌ على الأرض ⟵ خطواتٌ صغيرة ترفع القدمَ وتنقلها.",
      "تقاطعُ القدمين في المشي جانباً ⟵ القدمان تتباعدان ثمّ تتقاربان.",
      "النظرُ إلى الأرض ⟵ النظرُ إلى حيث تذهب.",
    ], [
      "Pivoting on the prosthetic foot while it stays planted → small steps that lift and place the foot.",
      "Crossing the feet when side-stepping → the feet step apart and then together.",
      "Looking at the floor → look where you are going.",
    ]],
    easier: ["بين القضبان، أو بزاويةٍ أصغر (ربعُ دورة).", "In the parallel bars, or a smaller turn (a quarter turn)."],
    harder: ["أسرع، أو في مكانٍ أضيق، أو مع حمل شيء.", "Faster, in a narrower space, or carrying something."],
    stopIf: ["دوخة، أو ألمٌ في القالب، أو فقدانُ التوازن المتكرّر.", "Dizziness, pain in the socket, or repeated loss of balance."],
    equipment: ["كرسيّان وممرٌّ آمن، والمساعِدُ إن لزم.", "Two chairs and a safe walkway, plus a walking aid if needed."],
    images: [{ key: "prosthetic-turning-1", ar: "مبتورٌ يستدير بخطواتٍ صغيرة حول كرسيّ", en: "An amputee turning with small steps around a chair", search: "amputee turning practice figure of eight walking" }],
  },
  {
    code: "prosthetic-stairs", nameAr: "صعود الدرج ونزوله بالطرف", nameEn: "Stairs with a prosthesis",
    kind: "functional", region: "whole_body", sets: 2, reps: 1,
    purpose: ["الدرجُ في البيت والشارع يحدّد استقلالَ المريض. البدايةُ «درجةٌ بدرجة»: الصعودُ بالساق السليمة أوّلاً والنزولُ بالطرف أوّلاً مع الدرابزين؛ وتبادلُ الساقين يأتي بعد ذلك بحسب القوّة ونوع الركبة والقدم (والركبةُ الإلكترونية تسمح به أكثر — VA/DoD 2024).",
      "Stairs at home and in the street decide independence. Start 'one step at a time': up with the sound leg first and down with the prosthesis first, holding the rail; alternating legs comes later, depending on strength and on the knee and foot (a microprocessor knee allows it more — VA/DoD 2024)."],
    start: ["أمام درجٍ بدرابزين (أو درجاتِ التدريب في المركز)، والمساعِدُ في اليد الأخرى إن لزم، والمعالجُ خلفه في الصعود وأمامه في النزول.",
      "Facing stairs with a rail (or the training steps in the centre), the walking aid in the other hand if needed, and the therapist behind on the way up and in front on the way down."],
    steps: [[
      "الصعود: أمسك الدرابزين وارفع الساقَ السليمة إلى الدرجة.",
      "ادفع بها، وارفع الطرفَ إلى الدرجة نفسِها.",
      "النزول: أنزل الطرفَ أوّلاً إلى الدرجة التي تحت، ثمّ الساقَ السليمة.",
      "بعد أن يُتقَن: تبادلُ الساقين إن سمحت القوّةُ والركبةُ والقدم، بقرار المعالج.",
    ], [
      "Going up: hold the rail and lift the sound leg onto the step.",
      "Push up through it and bring the prosthesis onto the same step.",
      "Going down: lower the prosthesis first to the step below, then the sound leg.",
      "Once mastered: alternate the legs if strength, knee and foot allow, as the therapist decides.",
    ]],
    cues: [[
      "الصعودُ بالطرف أوّلاً ⟵ السليمةُ تصعد أوّلاً، والطرفُ ينزل أوّلاً.",
      "كعبُ الطرف خارج حافّة الدرجة في النزول ⟵ القدمُ كلُّها على الدرجة.",
      "الاستعجال ⟵ درجةٌ بدرجة بلا عجلة.",
    ], [
      "Going up with the prosthesis first → the sound leg goes up first and the prosthesis comes down first.",
      "The prosthetic heel over the edge of the step on the way down → the whole foot on the step.",
      "Rushing → one step at a time, no hurry.",
    ]],
    easier: ["درجاتٌ أقلّ ارتفاعاً، أو درجتان فقط مع الدرابزين من الجهتين.", "Lower steps, or just two steps with rails on both sides."],
    harder: ["تبادلُ الساقين صعوداً ثمّ نزولاً (لمن تسمح ركبتُه وقدمُه)، أو حملُ كيسٍ خفيف.", "Alternating legs going up and then down (if the knee and foot allow), or carrying a light bag."],
    stopIf: ["ألمٌ في القالب، أو ركبةُ الطرف تنثني فجأة (توقّف وراجع فنّيّ الأطراف)، أو دوخة.", "Pain in the socket, the prosthetic knee giving way (stop and see the prosthetist), or dizziness."],
    equipment: ["درجٌ بدرابزين.", "Stairs with a rail."],
    images: [
      { key: "prosthetic-stairs-up-1", ar: "مبتورٌ يصعد الدرجَ بالساق السليمة أوّلاً ممسكاً بالدرابزين", en: "An amputee climbing stairs sound leg first, holding the rail", search: "amputee climbing stairs sound leg first handrail" },
      { key: "prosthetic-stairs-down-1", ar: "مبتورٌ ينزل الدرجَ بالطرف أوّلاً ممسكاً بالدرابزين", en: "An amputee going down stairs prosthesis first, holding the rail", search: "amputee descending stairs prosthesis first handrail" },
    ],
  },
  {
    code: "floor-to-stand-recovery", nameAr: "النهوض من الأرض وخطّة السقوط", nameEn: "Getting up from the floor and the fall plan",
    kind: "functional", region: "whole_body", sets: 1, reps: 2,
    purpose: ["السقوطُ شائعٌ بعد البتر — حتى ٥٨٪ في المجتمع، وأكثرُ من نصف السقطات قد تُحدث إصابة (Hunter 2017). ومَن يعرف كيف ينهض، أو ماذا يفعل إن لم يستطع، يقلّ خوفُه ويعود إلى المشي أسرع (BACPAR 2020).",
      "Falls are common after amputation — up to 58% in the community, and many cause injury (Hunter 2017). Knowing how to get up, or what to do if you cannot, reduces fear and speeds the return to walking (BACPAR 2020)."],
    start: ["على فرشةٍ في المركز بجانب كرسيٍّ ثابت، والمعالجُ بجانبه — بالطرف أو بدونه.", "On a mat in the centre beside a stable chair, with the therapist alongside — with or without the prosthesis."],
    steps: [[
      "بعد السقوط: توقّف وتنفّس، وتحقّق من الألم أو الإصابة قبل أن تتحرّك.",
      "تدحرج إلى جنبك ثمّ اجلس، ثمّ اركع على ركبة الساق السليمة.",
      "اقترب من الكرسيّ وضع يديك عليه، ثمّ قدّم الساقَ السليمة وادفع بها وباليدين لتقوم.",
      "اجلس على الكرسيّ واسترح.",
      "خطّةُ «لا أستطيع النهوض»: الهاتفُ معك دائماً، وازحف إلى الهاتف أو الباب، وغطِّ نفسك لتبقى دافئاً، وانتظر المساعدة.",
    ], [
      "After a fall: stop, breathe, and check for pain or injury before moving.",
      "Roll onto your side and sit up, then kneel on the sound knee.",
      "Get close to the chair and place both hands on it, then bring the sound leg forward and push up through it and the hands to stand.",
      "Sit on the chair and rest.",
      "The 'I can't get up' plan: always carry your phone, crawl to the phone or the door, cover yourself to keep warm, and wait for help.",
    ]],
    cues: [[
      "النهوضُ سريعاً بعد السقوط ⟵ توقّفٌ وفحصٌ أوّلاً.",
      "الاعتمادُ على ركبة الطرف ⟵ الركوعُ على السليمة، والطرفُ يتبعها.",
      "كرسيٌّ يتحرّك ⟵ كرسيٌّ ثابتٌ مستندٌ إلى الحائط.",
    ], [
      "Getting up quickly after a fall → stop and check first.",
      "Relying on the prosthetic knee → kneel on the sound side and let the prosthesis follow.",
      "A chair that slides → a stable chair backed against the wall.",
    ]],
    easier: ["النهوضُ من مقعدٍ منخفض أوّلاً، أو بمساعدة شخص.", "Rising from a low seat first, or with someone's help."],
    harder: ["النهوضُ بلا كرسيّ، أو من الأرض والطرفُ ملبوسٌ ثمّ بدونه.", "Rising without a chair, or from the floor with the prosthesis on and then off."],
    stopIf: ["ألمٌ حادّ، أو دوخة، أو ضيقُ نفس — والسقوطُ مع إصابةٍ يُعرض على الطبيب.", "Sharp pain, dizziness or breathlessness — and a fall with an injury is seen by the doctor."],
    equipment: ["فرشة، وكرسيٌّ ثابتٌ مستندٌ إلى الحائط، وهاتف.", "A mat, a stable chair against the wall, and a phone."],
    doseNote: ["مرّتين أو ثلاثاً في الجلسة في المرحلة الثانية، وفي البيت بحضور شخص.", "Two or three rehearsals per session in phase 2, and at home with someone present."],
    images: [
      { key: "floor-rise-kneel-1", ar: "مبتورٌ يركع على ركبة ساقه السليمة بجانب كرسيّ", en: "An amputee kneeling on the sound knee beside a chair", search: "amputee getting up from floor kneeling chair" },
      { key: "floor-rise-chair-1", ar: "مبتورٌ يدفع بيديه على كرسيّ وبساقه السليمة ليقوم من الأرض", en: "An amputee pushing on a chair with both hands and the sound leg to rise from the floor", search: "floor to stand transfer chair amputee fall recovery" },
    ],
  },
  // ═══ المرحلة ٣ ═══
  {
    code: "prosthetic-ramps-kerbs-uneven", nameAr: "المنحدر والرصيف والأرض غير المستوية وتخطّي العوائق", nameEn: "Ramps, kerbs, uneven ground and stepping over obstacles",
    kind: "functional", region: "whole_body", homeSuitable: false, sets: 2, reps: 5,
    purpose: ["الفرقُ بين المشي في البيت والمشي في الشارع: المنحدرُ والرصيفُ والحصى والعشبُ والعوائق — وهي ما يفصل المستوى K2 عن K3 (CMS L33787). وتخطّي العوائق مهارةٌ تُدرَّب (BACPAR 2020).",
      "The difference between walking at home and in the street: ramps, kerbs, gravel, grass and obstacles — exactly what separates K2 from K3 (CMS L33787). Crossing obstacles is a skill that is trained (BACPAR 2020)."],
    start: ["في المركز أوّلاً (منحدرٌ ودرجةُ رصيفٍ ومعيقٌ بارتفاع ١٠ سم وسطحٌ إسفنجيّ)، ثمّ خارجَه مع المعالج.",
      "In the centre first (a ramp, a kerb step, a 10 cm obstacle and a foam surface), then outside with the therapist."],
    steps: [[
      "المنحدر صعوداً: خطوةُ السليمة أطولُ قليلاً، والجذعُ مائلٌ للأمام قليلاً.",
      "المنحدر نزولاً: خطواتٌ قصيرة والطرفُ أوّلاً؛ والمنحدرُ الحادّ بخطواتٍ جانبية.",
      "الرصيف: صعوداً بالسليمة أوّلاً ونزولاً بالطرف أوّلاً — كالدرج.",
      "المعيق (١٠ سم): اقترب منه وتخطَّه بالساق التي يعلّمك المعالجُ أن تبدأ بها لركبتك.",
      "ثمّ امشِ على سطحٍ ليّنٍ أو غير مستوٍ ١٠ أمتار.",
    ], [
      "Up a ramp: a slightly longer sound-side step, leaning the trunk a little forwards.",
      "Down a ramp: short steps with the prosthesis first; a steep ramp sideways.",
      "Kerbs: up with the sound leg first and down with the prosthesis first — like stairs.",
      "The obstacle (10 cm): approach it and step over it leading with the leg the therapist teaches for your knee.",
      "Then walk 10 metres on a soft or uneven surface.",
    ]],
    cues: [[
      "النظرُ إلى القدم طوالَ الوقت ⟵ نظرةٌ إلى الأرض قبل العائق ثمّ إلى الأمام.",
      "خطواتٌ طويلة في النزول ⟵ خطواتٌ قصيرةٌ متحكَّمٌ بها.",
      "الاستعجالُ عند الرصيف ⟵ توقّفٌ قصير، ثمّ الخطوة.",
    ], [
      "Watching the foot all the time → glance at the ground before the obstacle, then look ahead.",
      "Long steps going down → short, controlled steps.",
      "Rushing at the kerb → a brief pause, then the step.",
    ]],
    easier: ["منحدرٌ أقلّ ميلاً، أو معيقٌ أقلّ ارتفاعاً، أو مع يدٍ على الدرابزين.", "A gentler ramp, a lower obstacle, or a hand on a rail."],
    harder: ["منحدرٌ أطول، وأرضٌ أوعر، ومعيقاتٌ متتالية، أو مع حمل شيء.", "A longer ramp, rougher ground, several obstacles in a row, or carrying something."],
    stopIf: ["تعثّرٌ متكرّر، أو ألمٌ في القالب، أو ركبةُ الطرف تنثني فجأة.", "Repeated tripping, pain in the socket, or the prosthetic knee giving way."],
    equipment: ["منحدرٌ ودرجةُ رصيفٍ ومعيقٌ ١٠ سم وسطحٌ إسفنجيّ؛ وفي الخارج مرافق.", "A ramp, a kerb step, a 10 cm obstacle and a foam surface; outside, a companion."],
    images: [{ key: "prosthetic-ramp-1", ar: "مبتورٌ ينزل منحدراً بخطواتٍ قصيرة بطرفه", en: "An amputee walking down a ramp with short steps on the prosthesis", search: "amputee walking ramp slope prosthesis training" }],
  },
  {
    code: "treadmill-interval-walking", nameAr: "المشي على السير المتحرّك بفتراتٍ من ثلاث سرعات", nameEn: "Treadmill interval walking at three speeds",
    kind: "endurance", region: "whole_body", homeSuitable: false, sets: 5, reps: 1,
    purpose: ["المشيُ بالطرف أكثرُ كلفةً للطاقة من المشي الطبيعيّ، وكلّما ارتفع البترُ زادت (BACPAR 2020) — فالتحمّلُ هدفٌ بذاته. وبرنامجٌ بثلاث سرعات ٣٠ دقيقة ثلاثَ مرّاتٍ أسبوعياً ثمانيةَ أسابيع رفع سرعةَ المشي ومسافتَه وخفّض كلفتَه عند مبتوري فوق الركبة (Darter 2013 — دراسةٌ صغيرة بلا مجموعة ضابطة).",
      "Walking with a prosthesis costs more energy than normal walking, and more the higher the amputation (BACPAR 2020) — so endurance is a goal in itself. A three-speed programme of 30 minutes three times a week for eight weeks raised walking speed and distance and lowered its energy cost above the knee (Darter 2013 — a small study without a control group)."],
    start: ["واقفٌ على السير المتحرّك ويداه على المسندين وحزامُ الأمان موصول، وقياسُ النبض والضغط (والأكسجين لمرضى القلب والأوعية) قبل البدء.",
      "Standing on the treadmill with the hands on the rails and the safety clip attached, with pulse and blood pressure (and oxygen saturation in cardiovascular patients) measured before starting."],
    steps: [[
      "إحماءٌ دقيقتين بالسرعة المريحة.",
      "دقيقتان بالسرعة المريحة، ثمّ دقيقتان أسرع قليلاً، ثمّ دقيقتان أبطأ قليلاً — هذه دورةٌ واحدة.",
      "كرّر خمسَ دورات (نحو ٣٠ دقيقة)، أو أقلّ في البداية.",
      "خفّف الاعتمادَ على المسندين تدريجياً.",
      "تهدئةٌ دقيقتين، ثمّ أعِد قياسَ النبض.",
    ], [
      "Warm up for two minutes at a comfortable speed.",
      "Two minutes at the comfortable speed, then two minutes slightly faster, then two minutes slightly slower — that is one cycle.",
      "Repeat five cycles (about 30 minutes), or fewer at first.",
      "Gradually rely less on the rails.",
      "Cool down for two minutes, then recheck the pulse.",
    ]],
    cues: [[
      "التعلّقُ بالمسندين ⟵ لمسٌ خفيف، فالتعلّقُ يغيّر المشيَ ويخفي التعب.",
      "خطوةٌ سليمة أقصر ⟵ خطوتان متساويتان كما في الممرّ.",
      "النبضُ يقترب من ٨٥٪ من الأقصى للعمر ⟵ أبطئ — والمبتورُ يبلغ ٧٢–٨٧٪ منه في اختبار المشي ستّ دقائق (Sions 2020).",
    ], [
      "Hanging on the rails → a light touch; hanging on changes the gait and hides fatigue.",
      "A shorter sound-side step → two equal steps, as in the walkway.",
      "Heart rate nearing 85% of the age-predicted maximum → slow down — amputees reach 72–87% of it during a six-minute walk test (Sions 2020).",
    ]],
    easier: ["سرعاتٌ أبطأ ودوراتٌ أقلّ، أو المشيُ في الممرّ بدل السير.", "Slower speeds and fewer cycles, or walking in the corridor instead of on the treadmill."],
    harder: ["ميلٌ خفيف، أو فتراتٌ أسرع، أو دوراتٌ أكثر.", "A slight incline, faster intervals, or more cycles."],
    stopIf: ["ألمٌ في الصدر، أو ضيقُ نفسٍ غيرُ معتاد، أو دوخة، أو انخفاضٌ واضح في الأكسجين (والاختبارُ يتوقّف تحت ٨٠٪ — Sions 2020)، أو أعراضُ هبوط السكّر، أو ألمٌ في القالب.",
      "Chest pain, unusual breathlessness, dizziness, a clear fall in oxygen saturation (the test stops below 80% — Sions 2020), symptoms of low blood sugar, or pain in the socket."],
    equipment: ["سيرٌ متحرّكٌ بحزام أمان، وجهازُ قياس النبض والأكسجين.", "A treadmill with a safety clip, and a pulse and oxygen meter."],
    images: [{ key: "treadmill-walking-amputee-1", ar: "مبتورٌ يمشي على السير المتحرّك بطرفه ويداه على المسندين بخفّة", en: "An amputee walking on a treadmill with the prosthesis, hands lightly on the rails", search: "amputee treadmill walking prosthesis rehabilitation" }],
  },
];

const TF_RANGES_AR = "ولمبتور فوق الركبة أو قاصر الدوران أو مستوى K1–K2: ٣٦ جلسة بنطاقات ١–٩ · ١٠–٢٧ · ٢٨–٣٦ (يعدّلها الأخصائيُّ في خطّة المريض).";
const TF_RANGES_EN = "Above the knee, with poor circulation, or at K1–K2: 36 sessions with ranges 1–9 · 10–27 · 28–36 (the specialist adjusts them in the patient's plan).";

export const PROTOCOL: ProtocolContentSeed = {
  code: "lower-limb-prosthetic-gait-adult",
  summary: [
    "التدريبُ على المشي بالطرف الصناعيّ السفليّ عند البالغين (Lower limb prosthetic gait training) — بعد بترٍ تحت الركبة (Transtibial) أو فوقها (Transfemoral)، من استلام الطرف إلى المشي المستقلّ في البيت والمجتمع. " +
    "يبدأ خلال خمسة أيّام عملٍ من استلام الطرف (BACPAR 2020)، والأساسُ التمرينُ وتدريبُ المشي — وهما وحدهما بدليلٍ من التجارب، ودليلُهما منخفض اليقين (VA/DoD 2024)؛ والأجهزةُ لا دليلَ لها في المشي بالطرف. " +
    "ثلاثُ مراحل بنطاقات جلساتٍ ومعايير انتقالٍ مكتوبة: اللبسُ والتحمّلُ والوقوف، ثمّ المشيُ بالمساعِد إلى المشي المستقلّ في البيت، ثمّ المجتمعُ والمهاراتُ العليا والخروج. " +
    "الجلدُ والقالبُ أوّلاً في كلّ جلسة؛ والمريضُ قاصرُ الدوران أو السكّريّ يحتاج حذراً خاصّاً مع الجهد والجلد والقدم السليمة؛ ومصابُ الانفجار يُفحص لإصاباته الأخرى.",
    "Lower limb prosthetic gait training in adults — after a below-knee (transtibial) or above-knee (transfemoral) amputation, from receiving the prosthesis to independent walking at home and in the community. " +
    "It starts within five working days of receiving the prosthesis (BACPAR 2020); the core is exercise and gait training — the only interventions with trial evidence, and that evidence is of low certainty (VA/DoD 2024); devices have no evidence for prosthetic gait. " +
    "Three phases with session ranges and written progression criteria: donning, tolerance and standing; then walking with an aid to independent walking at home; then the community, higher-level skills and discharge. " +
    "Skin and socket come first in every session; patients with poor circulation or diabetes need particular care with effort, skin and the sound foot; and blast-injured patients are screened for their other injuries.",
  ],
  goals: [
    "• لبسٌ وخلعٌ مستقلّ وصحيح، وضبطُ الجوارب، وفحصُ الجلد يومياً — بلا جروحٍ في الجذع.\n" +
    "• مشيٌ متناظرٌ بأقلّ مساعِدٍ ممكن، والمستوى الوظيفيّ المستهدف (K) يتحقّق.\n" +
    "• تحسّنٌ يتجاوز الخطأ في القياس: AMPPRO ٣٫٤ نقطةٍ فأكثر، والمشيُ ستّ دقائق ٤٥ متراً فأكثر، وTUG ٣٫٦ ثانيةٍ فأكثر (Resnik 2011).\n" +
    "• للمشي في المجتمع: ٣٠٠ مترٍ فأكثر في ستّ دقائق (Reid 2015)، وHoughton ٩ فأكثر.\n" +
    "• خطرُ السقوط أقلّ: TUG أقلّ من ١٩ ثانية واختبارُ المربّعات الأربعة أقلّ من ٢٤ ثانية (Dite 2007 — لمبتور تحت الركبة)، ونهوضٌ من الأرض أو خطّةٌ إن لم يستطع.\n" +
    "• الدرجُ والمنحدرُ والرصيف، والعودةُ إلى العمل والأدوار، وبرنامجٌ منزليٌّ ونشاطٌ دائم (١٥٠ دقيقة أسبوعياً).",
    "• Independent, correct donning and doffing, sock adjustment and daily skin checks — with no residual-limb wounds.\n" +
    "• Symmetrical walking with the least possible aid, reaching the target functional level (K).\n" +
    "• Change beyond measurement error: AMPPRO 3.4 points or more, six-minute walk 45 m or more, TUG 3.6 s or more (Resnik 2011).\n" +
    "• For community walking: 300 m or more in six minutes (Reid 2015), and a Houghton score of 9 or more.\n" +
    "• Lower fall risk: TUG under 19 s and Four Square Step Test under 24 s (Dite 2007 — below-knee), and able to get up from the floor or with a plan if not.\n" +
    "• Stairs, ramps and kerbs, a return to work and roles, and a home programme and lifelong activity (150 minutes a week).",
  ],
  assessment: [
    "التقييمُ الأوّل:\n" +
    "• القصّة: سببُ البتر (حادثٌ أو انفجار، أو قصورُ الشرايين والسكّري) ومستواه وجهتُه وتاريخُه، وبترُ الطرفين، ومكوّناتُ الطرف (القالب، البطانة، القفل أو الشفط، الركبة، القدم)، والمستوى الوظيفيّ قبل البتر والمستهدفُ بعده، والعملُ والبيت (الدرج، المرحاض) ومَن يساعد.\n" +
    "• الجذع: الجلدُ والجروحُ والندبات والحجمُ والشكل، والإحساس، والألمُ في الجذع (ورمٌ عصبيّ؟) والألمُ والإحساسُ الشبحيّان؛ وملاءمةُ القالب قبل التحميل وبعده.\n" +
    "• المفاصل والقوّة: تيبّسُ ثني الورك (اختبارُ توماس) وثني الركبة عند مبتور تحت الركبة، وقوّةُ مبعدات الورك وباسطاته وباسطات الركبة والجذع.\n" +
    "• القدمُ السليمة عند السكّريّ وقاصر الدوران: الجلدُ والإحساسُ والحذاء.\n" +
    "• القلبُ والجهد: الضغطُ والنبض (والأكسجين لمرضى القلب والأوعية) قبل الجهد وبعده؛ وسكّرُ الدم قبل التمرين عند مريض السكّري.\n" +
    "• السقوط: عددُ السقطات والخوفُ منها، والأدوية، والإدراك؛ ومصابُ الانفجار يُسأل عن إصابات الرأس والتعظّم حول المفاصل والضغط النفسيّ.\n" +
    "المقاييسُ (في الأوّل، وعند كلّ انتقالٍ بين المراحل، وعند الخروج، وبعد ٣ و٦ و١٢ شهراً — BACPAR 2020):\n" +
    "• AMPPRO (٠–٤٧): أدنى تغيّرٍ حقيقيّ ٣٫٤ (Resnik 2011)؛ ومتوسّطاتُه للمستويات: K0–1 نحو ٢٥، K2 نحو ٣٥، K3 نحو ٤١، K4 نحو ٤٥ (Gailey 2002) — يُعين قرارَ المستوى ولا يحكمه وحده (Dillon 2018).\n" +
    "• المشيُ ستّ دقائق: أدنى تغيّرٍ حقيقيّ ٤٥ متراً؛ و٣٠٠ مترٍ فأكثر مشيٌ في المجتمع (Reid 2015)؛ والنبضُ والأكسجين يُراقبان.\n" +
    "• TUG: أدنى تغيّرٍ حقيقيّ ٣٫٦ ثانية؛ و١٩ ثانيةً فأكثر خطرُ سقوطٍ متكرّر بعد بتر تحت الركبة (Dite 2007).\n" +
    "• مستوى K (CMS L33787): K0 لا يمشي ولا ينتقل بأمان · K1 مشيٌ في البيت على أرضٍ مستوية · K2 يتخطّى الرصيفَ والدرجَ والأرضَ غيرَ المستوية · K3 يغيّر سرعتَه في المجتمع · K4 نشاطٌ عالي الجهد.\n" +
    "• وإضافاتٌ يختارها الأخصائيّ: سرعةُ المشي ١٠ أمتار (أدنى فرقٍ يشعر به المريض ٠٫٢١ م/ث لمبتور فوق الركبة — Carse 2021)، واختبارُ L، واختبارُ المربّعات الأربعة (٢٤ ثانيةً فأكثر خطر سقوط — Dite 2007)، واستبيانُ PEQ-MS (أدنى فرقٍ يشعر به المريض ٨ — Franchignoni 2020)، ومقياسُ Houghton (٩ فأكثر مشيٌ في المجتمع — Wong 2016).",
    "Initial assessment:\n" +
    "• History: cause of amputation (trauma or blast, or arterial disease and diabetes), level, side and date, bilateral amputation, prosthetic components (socket, liner, pin or suction, knee, foot), functional level before amputation and the target after it, work and home (stairs, toilet) and who helps.\n" +
    "• Residual limb: skin, wounds, scars, volume and shape, sensation, residual-limb pain (neuroma?) and phantom pain and sensation; socket fit before and after loading.\n" +
    "• Joints and strength: hip flexion contracture (Thomas test) and knee flexion contracture below the knee, and strength of the hip abductors and extensors, knee extensors and trunk.\n" +
    "• The sound foot in diabetes and poor circulation: skin, sensation and footwear.\n" +
    "• Heart and effort: blood pressure and pulse (and oxygen saturation in cardiovascular patients) before and after effort; blood glucose before exercise in diabetes.\n" +
    "• Falls: number of falls and fear of falling, medications and cognition; blast-injured patients are asked about head injury, heterotopic ossification and psychological stress.\n" +
    "Measures (at baseline, at each phase change, at discharge, and at 3, 6 and 12 months — BACPAR 2020):\n" +
    "• AMPPRO (0–47): minimal detectable change 3.4 (Resnik 2011); mean scores by level: K0–1 about 25, K2 about 35, K3 about 41, K4 about 45 (Gailey 2002) — it informs the K-level decision and does not decide it alone (Dillon 2018).\n" +
    "• Six-minute walk: minimal detectable change 45 m; 300 m or more is community walking (Reid 2015); pulse and oxygen saturation are monitored.\n" +
    "• TUG: minimal detectable change 3.6 s; 19 s or more marks a risk of repeated falls after below-knee amputation (Dite 2007).\n" +
    "• K-level (CMS L33787): K0 cannot walk or transfer safely · K1 household walking on level ground · K2 crosses kerbs, stairs and uneven ground · K3 varies speed in the community · K4 high-energy activity.\n" +
    "• Optional additions chosen by the specialist: 10-metre walk speed (minimal clinically important difference 0.21 m/s above the knee — Carse 2021), the L Test, the Four Square Step Test (24 s or more marks fall risk — Dite 2007), the PEQ Mobility Scale (MCID 8 — Franchignoni 2020) and the Houghton Scale (9 or more is community walking — Wong 2016).",
  ],
  exercises: [
    "البرنامجُ في ثلاث مراحل (التفاصيلُ وبطاقاتُ التمارين بصورها في «البرنامج على مراحل»):\n" +
    "المرحلة ١ — اللبسُ والتحمّلُ والوقوف (الجلسات ١–٦): لبسُ الطرف وخلعُه وفحصُ الجلد والجوارب، ونقلُ الوزن بين القضبان بميزانين، والوقوفُ على الطرف ولمسُ الكرسيّ بالسليمة، والجلوسُ والقيامُ متساويَي الحمل، والجسرُ، ورفعُ الساق جانباً للجهتين، والانبطاحُ وبسطُ الورك.\n" +
    "المرحلة ٢ — المشيُ بالمساعِد إلى المشي المستقلّ في البيت (الجلسات ٧–١٨): تدريبُ خطوات المشي بالإرشاد وأجزاء الخطوة، والمشيُ ضدّ مقاومة الحوض، والاستدارةُ وتغييرُ الاتّجاه، وصعودُ الدرجة بالطرف، والدرجُ درجةً بدرجة، والنهوضُ من الأرض، وتقويةُ الورك بثقل، وتمرينُ البطن.\n" +
    "المرحلة ٣ — المجتمعُ والمهاراتُ العليا والخروج (الجلسات ١٩–٢٤): المنحدرُ والرصيفُ والأرضُ غيرُ المستوية والعوائق، والمشيُ مع مهمّةٍ ثانية، والسيرُ المتحرّك بثلاث سرعات، والدرجُ بتبادل الساقين لمن تسمح ركبتُه، وصعودُ درجةٍ أعلى.\n" +
    "الجرعة: ٢٤ جلسةً لمبتور تحت الركبة، ستّاً في الأسبوع × ٥٠ دقيقة. " + TF_RANGES_AR + " والعددُ اختيارُ خدمة: لا دليلَ على عددٍ بعينه ولا على أثر الجرعة (BACPAR 2020 «بقدر حاجة المريض»؛ Madou 2024: البرامجُ بين ٢ و١٦ أسبوعاً و١–٧ جلساتٍ أسبوعياً)، والانتقالُ والخروجُ بالمعايير لا بالعدد. ولقاصر الدوران الجلسةُ مقسّمةٌ بفترات راحة.\n" +
    "البرنامجُ المنزليّ: يوميّاً — فحصُ الجلد بعد كلّ خلع، وجواربُ الجذع، وغسلُ البطانة، ورباطُ الجذع الضاغط (Shrinker) كلّما خُلع الطرفُ وفي الليل، وزيادةُ مدّة اللبس تدريجياً، وتمارينُ البطاقات المعلَّمة «للبيت»، وفحصُ القدم السليمة عند السكّريّ. وزيادةُ خطوات اليوم ببرنامجٍ مكتوب (Christiansen 2018).\n" +
    "المتابعة: مراجعةٌ بالمقاييس خلال السنة الأولى بعد الخروج — ٣ و٦ و١٢ شهراً (BACPAR 2020) — وبابُ عودةٍ مفتوح عند جرحٍ أو احمرارٍ باقٍ أو حاجةٍ إلى ٨–١٠ طبقاتٍ من الجوارب أو سقوطٍ أو ألمٍ جديد أو تراجعٍ في المشي.",
    "The programme runs in three phases (details and illustrated exercise cards under 'Programme by phase'):\n" +
    "Phase 1 — Donning, tolerance and standing (sessions 1–6): donning and doffing, skin and sock checks, weight shifting in the bars on two scales, standing on the prosthesis with sound-foot stool taps, evenly loaded sit-to-stand, bridging, side-lying hip abduction on both sides, and prone lying with hip extension.\n" +
    "Phase 2 — Walking with an aid to independent walking at home (sessions 7–18): gait drills with cues and part-practice, resisted gait at the pelvis, turning and changes of direction, step-ups onto the prosthesis, stairs one step at a time, getting up from the floor, loaded hip strengthening, and trunk work.\n" +
    "Phase 3 — Community, higher-level skills and discharge (sessions 19–24): ramps, kerbs, uneven ground and obstacles, dual-task walking, three-speed treadmill intervals, step-over-step stairs where the knee allows, and higher step-ups.\n" +
    "Dose: 24 sessions below the knee, six a week × 50 minutes. " + TF_RANGES_EN + " The number is a service choice: there is no evidence for a particular number or for dose–response (BACPAR 2020 'as often as needs dictate'; Madou 2024: programmes of 2–16 weeks and 1–7 sessions a week), and progression and discharge follow the criteria, not the count. With poor circulation the session is split with rest breaks.\n" +
    "Home programme: daily — a skin check after every removal, residual-limb socks, washing the liner, the shrinker whenever the prosthesis is off and at night, gradually longer wearing time, the cards marked 'home', and a daily check of the sound foot in diabetes. Plus a written plan to increase daily steps (Christiansen 2018).\n" +
    "Follow-up: a review with measures during the first year after discharge — at 3, 6 and 12 months (BACPAR 2020) — and an open route back for a wound, persistent redness, needing 8–10 ply of socks, a fall, new pain or declining walking.",
  ],
  contraindications: [
    "• جرحٌ أو قرحةٌ لم تلتئم على الجذع، أو احمرارٌ لا يزول، أو ألمٌ في نقطةٍ من القالب — لا يُلبس الطرفُ حتى يُعالَج أو يُعدَّل القالب، ويُعطى المريضُ طريقةَ تنقّلٍ آمنة بديلة (VA/DoD 2024).\n" +
    "• التهابٌ أو حرارةٌ في الجذع، أو اشتباهٌ بجلطةٍ في الوريد العميق — يُحال إلى الطبيب.\n" +
    "• ذبحةٌ غيرُ مستقرّة، أو ضغطٌ غيرُ منضبط، أو أعراضٌ قلبيةٌ جديدة — لا تمرينَ بجهدٍ حتى يأذن الطبيب.\n" +
    "• هبوطُ السكّر أو سكّرٌ غيرُ منضبط قبل التمرين (أقلّ من ٩٠ ملغ/دل يحتاج ١٥–٣٠ غراماً من السكّر السريع أوّلاً — ADA 2016).\n" +
    "• الحرارةُ السطحية والتيكارُ الحراريّ على جلدٍ ضعيف الإحساس أو ناقص التروية — خطرُ حرق (Houghton 2010).",
    "• An unhealed wound or ulcer on the residual limb, redness that does not fade, or pain at one point in the socket — the prosthesis is not worn until it is treated or the socket adjusted, and the patient is given a safe alternative way to get around (VA/DoD 2024).\n" +
    "• Infection or heat in the residual limb, or suspected deep vein thrombosis — refer to the doctor.\n" +
    "• Unstable angina, uncontrolled blood pressure or new cardiac symptoms — no effortful exercise until the doctor permits it.\n" +
    "• Hypoglycaemia or uncontrolled glucose before exercise (below 90 mg/dL needs 15–30 g of fast-acting carbohydrate first — ADA 2016).\n" +
    "• Superficial heat and thermal Tecar over skin with poor sensation or poor blood supply — risk of burns (Houghton 2010).",
  ],
  precautions: [
    "• الجلدُ والقالبُ قبل كلّ جلسةٍ وبعدها حتى يتقنه المريض (BACPAR 2020)، ويُحال إلى فنّيّ الأطراف عند انزلاق الجذع في القالب، أو تغيّر لون طرف الجذع أو تورّمه («الخنق»)، أو الحاجة إلى ٨–١٠ طبقات جوارب، أو بطانةٍ تالفة.\n" +
    "• قاصرُ الدوران والسكّريّ: المشيُ بالطرف يرفع كلفةَ الطاقة (BACPAR 2020) والنبضَ إلى ٧٢–٨٧٪ من أقصاه في اختبار المشي ٦ دقائق (Sions 2020) — جلسةٌ بفترات راحة، والضغطُ والنبضُ قبل الجهد، وتجنّبُ النهوض السريع (هبوطُ الضغط)، وسكّرُ الدم قبل التمرين ووجبةٌ خفيفةٌ قريبة.\n" +
    "• القدمُ السليمة: فحصٌ يوميّ عند السكّريّ والاعتلال العصبيّ، وحذاءٌ مناسب؛ فخسارتُها أصعبُ ما يقع.\n" +
    "• السقوط: شائعٌ بعد البتر وكثيرٌ منه يُحدث إصابة (Hunter 2017)؛ يُفحص خطرُه في التقييم، ويُدرَّب النهوضُ وخطّةُ «لا أستطيع النهوض».\n" +
    "• الألمُ الشبحيّ ليس مانعاً — يُعالَج مع التدريب (العلاجُ بالمرآة ٥ دقائق صباحاً ومساءً لمن يرغب — Ol 2018).\n" +
    "• مصابُ الانفجار: إصاباتُ الرأس والتعظّمُ حول المفاصل والضغطُ النفسيّ تؤثّر في التدريب، ويُسأل عنها (VA/DoD 2024).\n" +
    "• الصيفُ العراقيّ: لا تمرينَ خارجيّاً في الحرّ الشديد لمرضى السكّري وكبار السنّ (ADA 2016)، والجذعُ يتعرّق فيتغيّر حجمُه.\n" +
    "• المكوّنات: نوعُ الركبة والقدم يحدّد ما يمكن تدريبه (الدرجُ بتبادل الساقين، والمنحدر) — والتنسيقُ مع فنّيّ الأطراف قبل عدّ أيّ انحرافٍ خطأً في المشي.",
    "• Skin and socket before and after every session until the patient can do it (BACPAR 2020), with referral to the prosthetist for pistoning, discolouration or swelling at the end of the limb ('choking'), needing 8–10 ply of socks, or a damaged liner.\n" +
    "• Poor circulation and diabetes: walking with a prosthesis raises energy cost (BACPAR 2020) and heart rate to 72–87% of maximum in a six-minute walk test (Sions 2020) — sessions with rest breaks, blood pressure and pulse before effort, avoiding rapid standing (postural hypotension), and blood glucose before exercise with a light snack close by.\n" +
    "• The sound foot: a daily check in diabetes and neuropathy, and suitable footwear; losing it is the worst outcome.\n" +
    "• Falls: common after amputation and many cause injury (Hunter 2017); screen the risk at assessment, and train getting up and the 'I can't get up' plan.\n" +
    "• Phantom pain is not a barrier — it is managed alongside training (mirror therapy 5 minutes morning and evening for those who wish — Ol 2018).\n" +
    "• Blast injuries: head injury, heterotopic ossification and psychological stress affect training and are asked about (VA/DoD 2024).\n" +
    "• The Iraqi summer: no outdoor exercise in extreme heat for patients with diabetes and older adults (ADA 2016), and sweating changes the residual-limb volume.\n" +
    "• Components: the knee and foot determine what can be trained (step-over-step stairs, ramps) — coordinate with the prosthetist before treating any deviation as a walking fault.",
  ],
  spw: 6, weeks: 4, minutes: 50, totalSessions: 24,
  refs: [
    { title: "VA/DoD Clinical Practice Guideline for the Rehabilitation of Individuals with Lower Limb Amputation (version 3.0)", org: "U.S. Department of Veterans Affairs and Department of Defense", year: 2024, url: "https://www.healthquality.va.gov/guidelines/Rehab/amp/" },
    { title: "Evidence based clinical guidelines for the physiotherapy management of adults with lower limb prostheses (3rd edition)", org: "British Association of Chartered Physiotherapists in Limb Absence Rehabilitation (BACPAR)", year: 2020, url: "https://www.bacpar.org/resources/healthcare-professionals-resources/prosthetic-guidelines/" },
    { title: "Toolbox of Outcome Measures", org: "British Association of Chartered Physiotherapists in Limb Absence Rehabilitation (BACPAR)", year: 2014, url: "https://www.bacpar.org/Data/Resource_Downloads/ToolboxofOutcomeMeasures.pdf" },
    { title: "Local Coverage Determination: Lower Limb Prostheses (L33787)", org: "Centers for Medicare & Medicaid Services", year: 2015, url: "https://www.cms.gov/medicare-coverage-database/view/lcd.aspx?lcdid=33787" },
    { title: "Gait Training Interventions for Lower Extremity Amputees: A Systematic Literature Review", org: "Technology and Innovation (Highsmith et al.)", year: 2016, url: "https://doi.org/10.21300/18.2-3.2016.99" },
    { title: "The Effectiveness of Exercise Interventions to Improve Gait and Balance in Individuals with Lower Limb Amputations: A Systematic Review and Meta-analysis", org: "Clinical Rehabilitation (Abou et al.)", year: 2022, url: "https://doi.org/10.1177/02692155221086204" },
    { title: "The effect of exercise interventions on gait outcomes in subacute and chronic rehabilitation from lower-limb amputation: A systematic review and meta-analysis", org: "Prosthetics and Orthotics International (Madou et al.)", year: 2024, url: "https://doi.org/10.1097/pxr.0000000000000255" },
    { title: "Interventions for motor rehabilitation in people with transtibial amputation due to peripheral arterial disease or diabetes", org: "Cochrane Database of Systematic Reviews (Aledi et al.)", year: 2023, url: "https://doi.org/10.1002/14651858.cd013711.pub2" },
    { title: "Exercise programs to improve gait performance in people with lower limb amputation: A systematic review", org: "Prosthetics and Orthotics International (Wong et al.)", year: 2016, url: "https://doi.org/10.1177/0309364614546926" },
    { title: "Prosthetic rehabilitation for older dysvascular people following a unilateral transfemoral amputation", org: "Cochrane Database of Systematic Reviews (Barr & Howe)", year: 2018, url: "https://doi.org/10.1002/14651858.cd005260.pub4" },
    { title: "Effects of Resistance Training in Individuals with Lower Limb Amputation: A Systematic Review", org: "Journal of Functional Morphology and Kinesiology (Rosario et al.)", year: 2023, url: "https://doi.org/10.3390/jfmk8010023" },
    { title: "A single-blind, cross-over trial of hip abductor strength training to improve Timed Up & Go performance in patients with unilateral, transfemoral amputation", org: "Journal of Rehabilitation Medicine (Pauley et al.)", year: 2014, url: "https://doi.org/10.2340/16501977-1270" },
    { title: "A comparison of traditional prosthetic training versus proprioceptive neuromuscular facilitation resistive gait training with trans-femoral amputees", org: "Prosthetics and Orthotics International (Yiğiter et al.)", year: 2002, url: "https://doi.org/10.1080/03093640208726650" },
    { title: "Short-term effect of physiotherapy rehabilitation on functional performance of lower limb amputees", org: "Prosthetics and Orthotics International (Rau et al.)", year: 2007, url: "https://doi.org/10.1080/03093640600994615" },
    { title: "Home-based treadmill training to improve gait performance in persons with a chronic transfemoral amputation", org: "Archives of Physical Medicine and Rehabilitation (Darter et al.)", year: 2013, url: "https://doi.org/10.1016/j.apmr.2013.08.001" },
    { title: "A personalised exercise programme for individuals with lower limb amputation reduces falls and improves gait biomechanics: A block randomised controlled trial", org: "Gait & Posture (Schafer et al.)", year: 2018, url: "https://doi.org/10.1016/j.gaitpost.2018.04.030" },
    { title: "Behavior-Change Intervention Targeting Physical Function, Walking, and Disability After Dysvascular Amputation: A Randomized Controlled Pilot Trial", org: "Archives of Physical Medicine and Rehabilitation (Christiansen et al.)", year: 2018, url: "https://doi.org/10.1016/j.apmr.2018.04.011" },
    { title: "Risk Factors for Falls in People With a Lower Limb Amputation: A Systematic Review", org: "PM&R (Hunter et al.)", year: 2017, url: "https://doi.org/10.1016/j.pmrj.2016.07.531" },
    { title: "The amputee mobility predictor: an instrument to assess determinants of the lower-limb amputee's ability to ambulate", org: "Archives of Physical Medicine and Rehabilitation (Gailey et al.)", year: 2002, url: "https://doi.org/10.1053/apmr.2002.32309" },
    { title: "Predict the Medicare Functional Classification Level (K-level) using the Amputee Mobility Predictor in people with unilateral transfemoral and transtibial amputation: A pilot study", org: "Prosthetics and Orthotics International (Dillon et al.)", year: 2018, url: "https://doi.org/10.1177/0309364617706748" },
    { title: "Reliability of outcome measures for people with lower-limb amputations: distinguishing true change from statistical error", org: "Physical Therapy (Resnik & Borgia)", year: 2011, url: "https://doi.org/10.2522/ptj.20100287" },
    { title: "Selecting, Administering, and Interpreting Outcome Measures among Adults with Lower-Limb Loss: An Update for Clinicians", org: "Current Physical Medicine and Rehabilitation Reports (Sions et al.)", year: 2020, url: "https://doi.org/10.1007/s40141-020-00274-4" },
    { title: "Clinical identification of multiple fall risk early after unilateral transtibial amputation", org: "Archives of Physical Medicine and Rehabilitation (Dite et al.)", year: 2007, url: "https://doi.org/10.1016/j.apmr.2006.10.015" },
    { title: "The minimal clinically-important difference of the Prosthesis Evaluation Questionnaire - Mobility Scale in subjects undergoing lower limb prosthetic rehabilitation training", org: "European Journal of Physical and Rehabilitation Medicine (Franchignoni et al.)", year: 2020, url: "https://doi.org/10.23736/s1973-9087.19.05799-x" },
    { title: "Minimal clinically important difference in walking velocity, gait profile score and two minute walk test for individuals with lower limb amputation", org: "Gait & Posture (Carse et al.)", year: 2021, url: "https://doi.org/10.1016/j.gaitpost.2021.06.001" },
    { title: "Going places: Does the two-minute walk test predict the six-minute walk test in lower extremity amputees?", org: "Journal of Rehabilitation Medicine (Reid et al.)", year: 2015, url: "https://doi.org/10.2340/16501977-1916" },
    { title: "Use of the Houghton Scale to Classify Community and Household Walking Ability in People With Lower-Limb Amputation: Criterion-Related Validity", org: "Archives of Physical Medicine and Rehabilitation (Wong et al.)", year: 2016, url: "https://doi.org/10.1016/j.apmr.2016.01.022" },
    { title: "Physical Activity/Exercise and Diabetes: A Position Statement of the American Diabetes Association", org: "Diabetes Care (Colberg et al.)", year: 2016, url: "https://doi.org/10.2337/dc16-1728" },
    { title: "Electrophysical Agents — Contraindications and Precautions: An Evidence-Based Approach to Clinical Decision Making in Physical Therapy", org: "Physiotherapy Canada (Houghton, Nussbaum & Hoens)", year: 2010, url: "https://doi.org/10.3138/ptc.62.5" },
    { title: "Transcutaneous electrical nerve stimulation (TENS) for phantom pain and stump pain following amputation in adults", org: "Cochrane Database of Systematic Reviews (Johnson et al.)", year: 2015, url: "https://doi.org/10.1002/14651858.cd007264.pub3" },
    { title: "Transcutaneous electrical nerve stimulation for phantom pain and stump pain in adult amputees", org: "Pain Practice (Mulvey et al.)", year: 2013, url: "https://doi.org/10.1111/j.1533-2500.2012.00593.x" },
    { title: "Mirror therapy for phantom limb and stump pain: a randomized controlled clinical trial in landmine amputees in Cambodia", org: "Scandinavian Journal of Pain (Ol et al.)", year: 2018, url: "https://doi.org/10.1515/sjpain-2018-0042" },
    { title: "Rigid dressings versus soft dressings for transtibial amputations", org: "Cochrane Database of Systematic Reviews (Kwah et al.)", year: 2019, url: "https://doi.org/10.1002/14651858.cd012427.pub2" },
  ],
  devices: [
    { code: "exercise", centreUse: "core", evidence: "recommended", minutes: 40,
      parameters: ["البرنامجُ بمراحله وبطاقاته في «البرنامج على مراحل»: نحو ٤٠ دقيقة من الجلسة — تدريبُ المشي والتوازن في كلّ جلسة، وتقويةُ الورك والجذع، والتحمّلُ في المرحلة الثالثة؛ وبفتراتِ راحةٍ لقاصر الدوران.",
        "The phased programme and its cards under 'Programme by phase': about 40 minutes of the session — gait and balance training every session, hip and trunk strengthening, and endurance in phase 3; with rest breaks for patients with poor circulation."],
      note: ["أساسيٌّ في كلّ جلسة — التمرينُ وتدريبُ المشي وحدهما بدليلٍ من التجارب (VA/DoD 2024 توصيةٌ ضعيفةٌ لصالحه بيقينٍ منخفضٍ جدّاً · Abou 2022 · Madou 2024 · Highsmith 2016)، والمكاسبُ في المجموعات متواضعة (المشيُ دقيقتين +٨ أمتار، والسرعةُ +٠٫١ م/ث) — فالقياسُ لكلّ مريضٍ هو الذي يحكم.",
        "Core in every session — exercise and gait training are the only interventions with trial evidence (VA/DoD 2024 weak recommendation for, very low certainty · Abou 2022 · Madou 2024 · Highsmith 2016), and group gains are modest (two-minute walk +8 m, speed +0.1 m/s) — so each patient's own measures decide."] },
    { code: "electro", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { currentType: "TENS", frequencyHz: "80–100", pulseWidthUs: "50–100", intensity: "Strong, comfortable", durationMin: "15–20" },
      parameters: ["للألم الشبحيّ أو ألم الجذع حين يحدّ من التدريب: قطبان على موضع الألم في الجذع أو فوق مسار العصب المقطوع في الفخذ، بوخزٍ قويٍّ مريحٍ بلا انقباض، قبل التمارين — ولا على جلدٍ ضعيف الإحساس أو جرح.",
        "For phantom or residual-limb pain that limits training: two electrodes over the painful area of the limb or over the course of the cut nerve in the thigh, at a strong but comfortable tingling without contraction, before exercise — never over skin with poor sensation or a wound."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم)، وللألم وحده: لا تجاربَ عشوائية في الألم الشبحيّ (Cochrane — Johnson 2015)، وتجربةٌ أوّليةٌ صغيرة خفّفت الألمَ في الراحة والحركة (Mulvey 2013)، ويذكره دليلُ VA خياراً. ممنوعٌ حيث يمنع ضعفُ الإحساس الشعورَ بالشدّة، ومع منظّم ضربات القلب.",
        "Rotating adjunct — used by the centre (Saleem), and for pain only: there are no randomised trials in phantom pain (Cochrane — Johnson 2015), a small pilot reduced pain at rest and on movement (Mulvey 2013), and the VA tool lists it as an option. Contraindicated where poor sensation prevents feeling the intensity, and with a pacemaker."] },
    { code: "megnatik", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { frequencyHz: "10–50", intensityMt: "2–10", durationMin: "15–20" },
      parameters: ["المجالُ المغناطيسيّ النابض (PEMF) حول الجذع أو الفخذ قبل التمارين — بلا حرارة، لألم الجذع.",
        "Pulsed electromagnetic field (PEMF) around the residual limb or thigh before exercise — non-thermal, for residual-limb pain."],
      note: ["مساعدٌ بالتناوب — يستعمله المركزُ بنتائج جيّدة (سليم). ولا دليلَ له في تأهيل المبتور (لم تُعثر على تجربةٍ في المجال المغناطيسيّ الطرفيّ)؛ لا يُعطى بدل التمرين، وممنوعٌ مع منظّم ضربات القلب.",
        "Rotating adjunct — used by the centre with good results (Saleem). There is no evidence for it in amputee rehabilitation (no trial of peripheral magnetic field therapy was found); never instead of exercise, and contraindicated with a pacemaker."] },
    { code: "tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
      params: { mode: "CAP", powerPct: "10–30", durationMin: "10–15" },
      parameters: ["على عضلات مقدّمة الورك والفخذ قبل تمطيط الورك — نمطٌ سعويّ بدفءٍ خفيف؛ ولا على جلد الجذع إن ضعف إحساسُه أو دورتُه الدموية، ولا على ندبةٍ حديثة.",
        "Over the muscles at the front of the hip and thigh before hip stretching — capacitive mode at gentle warmth; never over residual-limb skin with poor sensation or blood supply, or over a recent scar."],
      note: ["مساعدٌ بالتناوب — يستعمله المركز (سليم). ولا دليلَ له في تأهيل المبتور، وهو جهازٌ حراريّ: الحرارةُ ممنوعةٌ على جلدٍ ضعيف الإحساس أو ناقص التروية (Houghton 2010) — فلا يُعطى على جذع مريض السكّري أو قاصر الشرايين.",
        "Rotating adjunct — used by the centre (Saleem). There is no evidence for it in amputee rehabilitation, and it heats: heat is contraindicated over skin with poor sensation or blood supply (Houghton 2010) — so it is never applied to the residual limb in diabetes or arterial disease."] },
    { code: "compression", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم في الجلسة — رباطُ الجذع الضاغط (Shrinker) في البيت هو الأساس كلّما خُلع الطرفُ وفي الليل (VA)، ودليلُ التضميد بعد العملية ضعيف (Kwah 2019). والضغطُ الهوائيّ على الجذع قبل اللبس بقرار سليم لمن يتغيّر حجمُ جذعه كثيراً.",
        "Not used in the session — the shrinker at home is the routine whenever the prosthesis is off and at night (VA), and the evidence for dressings after surgery is weak (Kwah 2019). Pneumatic compression of the limb before donning is Saleem's decision for patients whose volume changes a lot."] },
    { code: "robotik", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم حتى يقرّر سليم — لا تجربةَ عشوائية للمبتورين (حالتان منشورتان فقط)، ويحتاج توافقاً مع الطرف الصناعيّ؛ ويُنظر فيه لمن لا يستطيع حمل المساعِد (بترُ الطرفين العلويّين).",
        "Not used until Saleem decides — there is no randomised trial in amputees (only two published cases), and it needs compatibility with the prosthesis; it may be considered for patients who cannot hold a walking aid (bilateral upper-limb loss)."] },
    { code: "laser", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم (لم يذكره سليم) — لا دليلَ له في الجذع أو المشي؛ وأدبيّاتُه في قرح القدم السكّرية، وتلك لفريق الجروح.",
        "Not used (not mentioned by Saleem) — there is no evidence for it on the residual limb or for walking; its literature is in diabetic foot ulcers, which belong to the wound team."] },
    { code: "ultrasound", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم (لم يذكره سليم) — لا دليلَ له؛ ويُتجنّب المستمرّ منه مع ضعف الإحساس أو قصور الشرايين الشديد (Houghton 2010).",
        "Not used (not mentioned by Saleem) — there is no evidence for it, and continuous ultrasound is avoided with poor sensation or severe arterial disease (Houghton 2010)."] },
    { code: "hot_pack", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم على الجذع ولا على القدم السليمة عند السكّريّ وقاصر الدوران — خطرُ حرقٍ على جلدٍ ضعيف الإحساس أو ناقص التروية (Houghton 2010)، ولا دليلَ له في المشي.",
        "Not used on the residual limb or on the sound foot in diabetes or poor circulation — risk of burns on skin with poor sensation or blood supply (Houghton 2010), and no evidence for walking."] },
    { code: "infrared", centreUse: "not_used", evidence: "not_recommended",
      note: ["لا يُستخدم للسبب نفسِه — حرارةٌ سطحية على جلدٍ قد يضعف إحساسُه أو ترويتُه (Houghton 2010)، بلا دليلٍ في المشي.",
        "Not used for the same reason — superficial heat on skin that may have poor sensation or blood supply (Houghton 2010), with no evidence for walking."] },
    { code: "shockwaves", centreUse: "not_used", evidence: "optional",
      note: ["لا يُستخدم — لا دليلَ له في تأهيل المبتور ولا في المشي (أدبيّاتُه في قرح القدم السكّرية).",
        "Not used — there is no evidence for it in amputee rehabilitation or walking (its literature is in diabetic foot ulcers)."] },
  ],
  phases: [
    {
      name: ["اللبس والتحمّل والوقوف وتحميلُ الطرف", "Donning, tolerance, standing and loading the prosthesis"],
      sessionFrom: 1, sessionTo: 6,
      timeframe: ["الأسبوعُ الأوّل بعد استلام الطرف — ولمبتور فوق الركبة وقاصر الدوران الجلسات ١–٩", "The first week after receiving the prosthesis — sessions 1–9 above the knee or with poor circulation"],
      goals: [
        "لبسٌ وخلعٌ وضبطُ جواربٍ مستقلّ وصحيح، ولبسُ الطرف جلسةً كاملة بلا جرح والاحمرارُ يزول خلال ١٠–٢٠ دقيقة، وقيامٌ من الكرسيّ مستقلّ، وتحميلُ الطرف بنصف الوزن على الأقلّ على الميزان، ومشيٌ بين القضبان بيدٍ واحدة، وبرنامجٌ منزليٌّ يوميّ يؤدّى صحيحاً.",
        "Independent, correct donning, doffing and sock adjustment; wearing the prosthesis for a whole session without a wound and with redness fading within 10–20 minutes; independent sit-to-stand; at least half of body weight on the prosthesis on the scale; walking in the bars with one hand; and a daily home programme done correctly.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• الطرفُ يُلبس مدداً قصيرةً أوّلاً وتزيد يوماً بعد يوم بقدر ما يتحمّل الجلد (BACPAR 2020) — والاحمرارُ الذي لا يزول خلال ٢٠ دقيقة يعني «أبطئ».\n" +
        "• فحصُ الجذع بالمرآة بعد كلّ خلع، وغسلُ البطانة والجذع كلَّ يوم.\n" +
        "• رباطُ الجذع الضاغط (Shrinker) كلّما خُلع الطرف، وفي الليل خاصّةً — يحفظ حجمَ الجذع فيبقى القالبُ مريحاً.\n" +
        "• الجواربُ تُضاف واحداً واحداً حين يتّسع القالب خلال اليوم.\n" +
        "• الحذاءُ نفسُه الذي ضُبط عليه الطرف — فارتفاعُ الكعب يغيّر وقفةَ الطرف.\n" +
        "• لا وسادةَ تحت الجذع ولا تحت ركبة مبتور تحت الركبة، والانبطاحُ يومياً لمن أذن له المعالج.\n" +
        "• الإحساسُ بالساق المبتورة (الإحساسُ الشبحيّ) طبيعيّ، وألمُها يُعالج — أخبر المعالج.\n" +
        "• مريضُ السكّري: افحص قدمَك السليمة كلَّ يوم، وقِس سكّرك قبل التمرين واحمل شيئاً حلواً.",
        "Key messages — in plain language:\n" +
        "• Wear the prosthesis for short spells at first, longer each day as the skin allows (BACPAR 2020) — redness that does not fade within 20 minutes means 'slow down'.\n" +
        "• Check the limb with a mirror after every removal, and wash the liner and the limb every day.\n" +
        "• The shrinker whenever the prosthesis is off, and especially at night — it keeps the limb volume steady so the socket stays comfortable.\n" +
        "• Add socks one at a time when the socket loosens during the day.\n" +
        "• The same shoes the prosthesis was set up with — a different heel height changes how it stands.\n" +
        "• No pillow under the residual limb or under the knee after a below-knee amputation, and lie face down daily if the therapist allows it.\n" +
        "• Feeling the missing leg (phantom sensation) is normal, and phantom pain can be treated — tell the therapist.\n" +
        "• If you have diabetes: check the sound foot every day, check your sugar before exercise and carry something sweet.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٢ حين تتحقّق كلُّها:\n" +
        "• يلبس الطرفَ ويخلعه ويضبط الجواربَ وحده صحيحاً أمام المعالج (BACPAR 2020).\n" +
        "• يلبسه جلسةً كاملة والاحمرارُ يزول خلال ١٠–٢٠ دقيقة، بلا جرحٍ ولا فقاعة.\n" +
        "• يقوم من الكرسيّ وحده.\n" +
        "• يمشي طولَ القضبان بيدٍ واحدةٍ أو أقلّ.",
        "Moves to phase 2 when all of these are met:\n" +
        "• Puts the prosthesis on and off and adjusts the socks alone and correctly in front of the therapist (BACPAR 2020).\n" +
        "• Wears it for a whole session with redness fading within 10–20 minutes, and no wound or blister.\n" +
        "• Rises from a chair independently.\n" +
        "• Walks the length of the bars with one hand or less.",
      ],
      notes: [
        "• افحص القالبَ والجلدَ قبل كلّ جلسةٍ وبعدها حتى يتقنه المريض، وسجّل مدّةَ اللبس اليومية (BACPAR 2020).\n" +
        "• تدريبُ المشي يبدأ بين القضبان (BACPAR 2020 — إجماع).\n" +
        "• أحِل إلى فنّيّ الأطراف عند انزلاق الجذع في القالب، أو تغيّر لون طرف الجذع أو تورّمه، أو الحاجة إلى ٨–١٠ طبقات جوارب، أو بطانةٍ تالفة — قبل أن يُعدّ ما يظهر في المشي خطأً من المريض.\n" +
        "• قاصرُ الدوران: الضغطُ والنبضُ قبل الجهد، والجلسةُ بفترات راحة.\n" +
        "• " + TF_RANGES_AR,
        "• Check the socket and skin before and after every session until the patient can, and record daily wearing time (BACPAR 2020).\n" +
        "• Gait training starts in the parallel bars (BACPAR 2020 — consensus).\n" +
        "• Refer to the prosthetist for pistoning, discolouration or swelling at the end of the limb, needing 8–10 ply of socks, or a damaged liner — before treating what shows in the gait as the patient's fault.\n" +
        "• Poor circulation: blood pressure and pulse before effort, and the session split with rests.\n" +
        "• " + TF_RANGES_EN,
      ],
      exercises: [
        { code: "prosthesis-donning-skin-check", note: ["يؤدّيه المريضُ بنفسه في أوّل كلّ جلسةٍ وآخرها والمعالجُ يراقب، حتى يُتقنه.", "The patient does it at the start and end of every session with the therapist watching, until mastered."] },
        { code: "prosthetic-weight-shift-scales", sets: 3, reps: 10, hold: 5 },
        { code: "prosthetic-stance-stool-tap", sets: 3, reps: 10 },
        { code: "sit-to-stand", sets: 3, reps: 8,
          note: ["بحملٍ متساوٍ على الساقين — القدمان للخلف قليلاً والأنفُ فوق أصابع القدمين؛ ومن كرسيٍّ عالٍ بمسندين أوّلاً. وتوقّف عند ألمٍ في القالب.",
            "With weight even on both legs — feet slightly back and nose over the toes; from a high chair with armrests at first. Stop for pain in the socket."] },
        { code: "glute-bridge", sets: 2, reps: 15, hold: 5,
          doseNote: ["بالساقين معاً، ثمّ الجذعُ وحده فوق منشفةٍ ملفوفة — ثباتٌ ٥ ثوانٍ، حتى ٣٠ مرّة مرّةً أو مرّتين يومياً (VA).", "Both legs, then the residual limb alone over a rolled towel — 5-second holds, up to 30 repetitions once or twice a day (VA)."] },
        { code: "side-lying-hip-abduction", sets: 3, reps: 10,
          note: ["للجهتين — وقوّتُها في جهة الطرف تمنع ميلَ الجذع في المشي (Pauley 2014). بلا ثقلٍ أوّلاً.", "Both sides — strength on the prosthetic side stops the trunk leaning when walking (Pauley 2014). No weight at first."] },
        { code: "prone-lying-hip-extension",
          note: ["لمبتور فوق الركبة خاصّةً؛ ولمبتور تحت الركبة الركبةُ ممدودةٌ في الانبطاح ولا وسادةَ تحتها.", "Above the knee especially; below the knee, keep the knee straight lying face down with no pillow under it."] },
      ],
    },
    {
      name: ["المشي بالمساعِد إلى المشي المستقلّ في البيت", "Walking with an aid to independent walking at home"],
      sessionFrom: 7, sessionTo: 18,
      timeframe: ["نحو الأسبوعين الثاني والثالث — ولمبتور فوق الركبة الجلسات ١٠–٢٧", "About weeks 2–3 — sessions 10–27 above the knee"],
      goals: [
        "مشيٌ متناظرٌ خارج القضبان بأقلّ مساعِد (BACPAR 2020)، واستدارةٌ وتغييرُ اتّجاهٍ بأمان، ودرجٌ درجةً بدرجة بالدرابزين، ونهوضٌ من الأرض أو خطّةٌ مُتقَنة، وTUG أقلّ من ١٩ ثانية، ومشيٌ مستقلٌّ في البيت.",
        "Symmetrical walking outside the bars with the least aid (BACPAR 2020), safe turning and changes of direction, stairs one step at a time with a rail, getting up from the floor or a rehearsed plan, TUG under 19 s, and independent walking at home.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• السقوطُ أشيعُ بعد البتر: اعرف كيف تنهض، واحمل هاتفك دائماً، وإن لم تستطع النهوضَ فازحف إلى الهاتف أو الباب وابقَ دافئاً (BACPAR 2020).\n" +
        "• البيتُ الآمن: لا سجّادَ صغيراً ينزلق، وإضاءةٌ ليلاً في الطريق إلى الحمّام، والطرفُ قريبٌ من السرير.\n" +
        "• حجمُ الجذع يتغيّر خلال اليوم ومع الحرّ — الجواربُ تضبط القالب.\n" +
        "• الألمُ الشبحيّ: التدليكُ والرباطُ الضاغط ولبسُ الطرف تخفّفه، والعلاجُ بالمرآة ٥ دقائق صباحاً ومساءً لمن يرغب (Ol 2018).\n" +
        "• المشيُ أكثرَ كلَّ يوم بقدرٍ صغير — والتعبُ الشديد يُفسد المشي ويزيد السقوط.",
        "Key messages — in plain language:\n" +
        "• Falls are more common after amputation: know how to get up, always carry your phone, and if you cannot get up crawl to the phone or the door and keep warm (BACPAR 2020).\n" +
        "• A safe home: no small rugs that slip, a night light on the way to the toilet, and the prosthesis within reach of the bed.\n" +
        "• The limb volume changes through the day and in the heat — socks keep the socket snug.\n" +
        "• Phantom pain: massage, the shrinker and wearing the prosthesis ease it, and mirror therapy 5 minutes morning and evening for those who wish (Ol 2018).\n" +
        "• Walk a little more each day — exhaustion spoils the walking and increases falls.",
      ],
      criteria: [
        "ينتقل إلى المرحلة ٣ حين تتحقّق كلُّها:\n" +
        "• يمشي في البيت مستقلّاً (بمساعِدٍ أو بدونه).\n" +
        "• TUG أقلّ من ١٩ ثانية، واختبارُ المربّعات الأربعة أقلّ من ٢٤ ثانية (Dite 2007 — لمبتور تحت الركبة، ودليلٌ استرشاديّ لمبتور فوق الركبة).\n" +
        "• ينهض من الأرض، أو يؤدّي خطّةَ «لا أستطيع النهوض» صحيحاً.\n" +
        "• يصعد الدرجَ وينزله درجةً بدرجةٍ بالدرابزين.",
        "Moves to phase 3 when all of these are met:\n" +
        "• Walks independently at home (with or without an aid).\n" +
        "• TUG under 19 s and Four Square Step Test under 24 s (Dite 2007 — below the knee; a guide only above the knee).\n" +
        "• Gets up from the floor, or performs the 'I can't get up' plan correctly.\n" +
        "• Goes up and down stairs one step at a time with a rail.",
      ],
      notes: [
        "• التدريبُ الماهر على المشي: إرشادٌ لفظيٌّ ويدويّ وتمرينُ أجزاء الخطوة قبل المشي كاملاً (Highsmith 2016)، وخطأٌ واحد في كلّ مرّة.\n" +
        "• المساعِدُ يتدرّج من الأكبر إلى الأصغر (BACPAR 2020) — والقرارُ بالأمان لا بالرغبة.\n" +
        "• تقويةُ الورك بثقل: تبدأ نحو ٤٠–٥٠٪ من أقصى ما يُرفع مرّةً واحدة (يُقدَّر من أقصى ما يُرفع عشرَ مرّات — Rosario 2023)، ومبعداتُ الورك تحسّن TUG لمبتور فوق الركبة (Pauley 2014).\n" +
        "• انحرافاتُ المشي (الإبعاد، ورفعُ الحوض، وقِصَرُ خطوة السليمة) تُراجع مع فنّيّ الأطراف في جلسةٍ مشتركة قبل علاجها تمريناً.\n" +
        "• سجّل TUG واختبارَ المربّعات الأربعة عند الانتقال.",
        "• Skilled gait training: verbal and manual cues and part-practice before the whole step (Highsmith 2016), one fault at a time.\n" +
        "• Walking aids progress from larger to smaller (BACPAR 2020) — decided by safety, not by wish.\n" +
        "• Loaded hip strengthening: start at about 40–50% of the one-repetition maximum (estimated from the ten-repetition maximum — Rosario 2023); hip abductor training improves TUG above the knee (Pauley 2014).\n" +
        "• Gait deviations (abduction, hip hiking, a short sound-side step) are reviewed with the prosthetist in a joint session before being treated with exercise.\n" +
        "• Record TUG and the Four Square Step Test at the phase change.",
      ],
      exercises: [
        { code: "prosthetic-gait-drills" },
        { code: "resisted-gait-pnf" },
        { code: "prosthetic-turning-directions" },
        { code: "step-up", sets: 2, reps: 10,
          note: ["الطرفُ على الدرجة والصعودُ عليه بدفع الورك، ثمّ السليمةُ على الدرجة — درجةٌ ٥ سم ثمّ ١٥ سم، والدرابزينُ أوّلاً.", "The prosthesis on the step and stepping up onto it by driving the hip, then the sound leg — a 5 cm step then 15 cm, with the rail at first."] },
        { code: "prosthetic-stairs" },
        { code: "floor-to-stand-recovery" },
        { code: "side-lying-hip-abduction", sets: 3, reps: 10,
          note: ["بثقلٍ على الكاحل أو مطّاطٍ حول الفخذين — يبدأ نحو نصف أقصى ما يُرفع (Rosario 2023)، وللجهتين.", "With an ankle weight or a band around the thighs — starting at about half of the maximum lift (Rosario 2023), on both sides."] },
        { code: "mcgill-curl-up", sets: 2, reps: 6,
          note: ["لثبات الجذع — وألمُ الظهر شائعٌ عند المبتور (BACPAR 2020)؛ يؤدّى بلا الطرف.", "For trunk stability — low back pain is common after amputation (BACPAR 2020); done without the prosthesis."] },
      ],
    },
    {
      name: ["المجتمع والمهارات العليا والخروج", "Community, higher-level skills and discharge"],
      sessionFrom: 19, sessionTo: 24,
      timeframe: ["نحو الأسبوع الرابع — ولمبتور فوق الركبة الجلسات ٢٨–٣٦", "About week 4 — sessions 28–36 above the knee"],
      goals: [
        "المشيُ على المنحدر والرصيف والأرض غير المستوية وبين الناس، وتغييرُ السرعة والاتّجاه، وحملُ الأغراض، والمشيُ مع مهمّةٍ ثانية، والدخولُ إلى السيّارة والنزولُ منها، و٣٠٠ مترٍ فأكثر في ستّ دقائق لمن هدفُه المجتمع (Reid 2015)، وبرنامجٌ منزليٌّ ونشاطٌ دائم، والعودةُ إلى العمل.",
        "Walking on ramps, kerbs, uneven ground and among people, changing speed and direction, carrying things, dual-task walking, getting in and out of a car, 300 m or more in six minutes when the goal is the community (Reid 2015), a home programme and lifelong activity, and a return to work.",
      ],
      education: [
        "الرسائلُ الأساسية — بلغةٍ بسيطة:\n" +
        "• النشاطُ مدى الحياة: ١٥٠ دقيقةً أسبوعياً من الجهد المعتدل، وتقويةٌ يومين في الأسبوع — كغيرك تماماً (BACPAR 2020).\n" +
        "• عُد إلينا قبل موعدك عند: جرحٍ أو احمرارٍ لا يزول، أو حاجةٍ إلى ٨–١٠ طبقات جوارب، أو سقوطٍ، أو ألمٍ جديد، أو مشيٍ صار أصعب.\n" +
        "• موعدُ المتابعة بعد ٣ و٦ و١٢ شهراً للقياس (BACPAR 2020).\n" +
        "• الحرُّ الشديد: لا مشيَ طويلاً في الظهيرة، واشرب الماء، وراقب الجذعَ لأنّ العرق يغيّر حجمَه.\n" +
        "• الطرفُ يحتاج صيانةً كالسيّارة: القدمُ والبطانةُ والجوارب تبلى — لا تنتظر حتى تتألّم.",
        "Key messages — in plain language:\n" +
        "• Lifelong activity: 150 minutes a week of moderate effort and strengthening two days a week — the same as everyone else (BACPAR 2020).\n" +
        "• Come back before your appointment for: a wound or redness that does not fade, needing 8–10 ply of socks, a fall, new pain, or walking that has become harder.\n" +
        "• Follow-up visits at 3, 6 and 12 months for measurement (BACPAR 2020).\n" +
        "• Extreme heat: no long walks at midday, drink water, and watch the limb because sweat changes its volume.\n" +
        "• The prosthesis needs servicing like a car: the foot, liner and socks wear out — do not wait until it hurts.",
      ],
      criteria: [
        "الخروجُ من البرنامج حين:\n" +
        "• تتحقّق الأهدافُ، أو تثبت المقاييس (تغيّرٌ أصغر من أدنى تغيّرٍ حقيقيّ في قياسين متتاليين).\n" +
        "• ولمن هدفُه المجتمع: ٣٠٠ مترٍ فأكثر في ستّ دقائق (Reid 2015) وHoughton ٩ فأكثر.\n" +
        "• ويؤدّي برنامجَه المنزليّ وحده، ويعرف متى يعود.",
        "Discharge from the programme when:\n" +
        "• The goals are met, or the measures plateau (change smaller than the minimal detectable change on two consecutive tests).\n" +
        "• For a community goal: 300 m or more in six minutes (Reid 2015) and a Houghton score of 9 or more.\n" +
        "• The patient does the home programme independently and knows when to come back.",
      ],
      notes: [
        "• المشيُ مع مهمّةٍ ثانية وبرنامجٌ شخصيٌّ متدرّج قلّلا السقوطَ بعد سنة (Schafer 2018 — تجربةٌ صغيرة).\n" +
        "• السيرُ المتحرّك: ثلاثُ سرعات ٣٠ دقيقة (Darter 2013)، والنبضُ والأكسجين يُراقبان عند مرضى القلب والأوعية.\n" +
        "• إعادةُ تقدير المستوى K بـ AMPPRO عند الخروج — يُعين القرارَ ولا يحكمه وحده (Dillon 2018)، ومنه تُقترح مكوّناتٌ أنسب مع فنّيّ الأطراف (الركبةُ الإلكترونية والقدمُ المخزّنة للطاقة — VA/DoD 2024).\n" +
        "• خطّةُ المتابعة مكتوبة: ٣ و٦ و١٢ شهراً، وبابُ عودةٍ مفتوح.",
        "• Dual-task walking and a personalised progressive programme reduced falls at one year (Schafer 2018 — a small trial).\n" +
        "• Treadmill: three speeds for 30 minutes (Darter 2013), with pulse and oxygen saturation monitored in cardiovascular patients.\n" +
        "• Reassess the K-level with AMPPRO at discharge — it informs the decision and does not decide it alone (Dillon 2018) — and use it to discuss more suitable components with the prosthetist (microprocessor knee, energy-storing foot — VA/DoD 2024).\n" +
        "• A written follow-up plan: 3, 6 and 12 months, with an open route back.",
      ],
      exercises: [
        { code: "prosthetic-ramps-kerbs-uneven" },
        { code: "obstacle-dual-task-walking",
          note: ["بالطرف — مع العدّ للخلف بثلاثاتٍ أو حمل صينية، ثمّ في مكانٍ مزدحم؛ والبرنامجُ بمهمّتين قلّل السقوطَ بعد البتر (Schafer 2018).",
            "With the prosthesis — counting backwards in threes or carrying a tray, then in a crowded place; the dual-task programme reduced falls after amputation (Schafer 2018)."] },
        { code: "treadmill-interval-walking" },
        { code: "prosthetic-stairs",
          note: ["تبادلُ الساقين لمن تسمح ركبتُه وقدمُه وقوّتُه، بقرار المعالج.", "Step-over-step for those whose knee, foot and strength allow it, as the therapist decides."] },
        { code: "step-up", sets: 3, reps: 10,
          note: ["درجةٌ أعلى أو بحمل ثقلٍ في اليدين.", "A higher step or holding weights in the hands."] },
        { code: "prosthetic-turning-directions",
          note: ["أسرع، وفي أماكن ضيّقةٍ ومزدحمة.", "Faster, and in narrow and crowded spaces."] },
      ],
    },
  ],
};

export const name = "135_physio_prosthetic_gait_detail";
export const sql = [exercisesSql(EXERCISES), protocolContentSql(PROTOCOL), openPlansPhasesSql(PROTOCOL.code)].join("\n\n");
