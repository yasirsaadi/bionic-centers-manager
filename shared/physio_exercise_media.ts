// **صورُ بطاقات التمارين التي وصلت** (§4.cx). المالكُ يجمعها من الإنترنت بكلمات البحث المكتوبة في كلّ بطاقة، فتُضغَط وتوضع في
// `client/public/physio-exercises/` باسم رمزها، ويُسجَّل هنا مصدرُها. **صورةٌ لا سطرَ لها هنا تُعرض «صورة منتظرة» برمزها وكلمات بحثها**
// — فلا رابطَ مكسور، ولا ترحيلَ لكلّ دفعة صور: البطاقةُ في القاعدة تقول ما يجب أن تُظهره الصورة، وهذا الملفُّ يقول أين هي.

export interface ExerciseImageFile {
  /** اسمُ الملفّ تحت `/physio-exercises/` — رمزُ الصورة نفسُه بامتداده. */
  file: string;
  /** المصدرُ كما وجده المالك (اسمُ الموقع)، ورابطُه إن عُرف. */
  credit?: string | null;
  sourceUrl?: string | null;
}

export const EXERCISE_IMAGE_BASE = "/physio-exercises/";

//  **الدفعةُ الأولى — صورُ «ألم أسفل الظهر المزمن» السبعُ والعشرون** (٢٠٢٦-١٠-٠٩، §4.cx): جمعها المالكُ من الإنترنت بكلمات البحث في
//  مجلّد Drive، فضُغطت WebP (أطولُ ضلعٍ ١٠٠٠ نقطة) وقُصّ منها ما احتاج: «رفعُ الكيتل بيل» وصلت صورةً واحدة بثلاث مراحل لخانتين ⟵ «البداية»
//  للأولى و«الوقوف» للثانية؛ ومن «الطائر والكلب» وضعيةُ البداية، ومن «إمالة الحوض» الوضعُ المحايد، ومن «رفع الصدر» الوضعُ المرفوع.
//  **والمصدرُ اسمُ الموقع المكتوب على الصورة نفسِها** — وما لم يُكتب عليه موقعٌ بلا مصدر، ولا رابطَ لأيٍّ منها (لم يصل).
export const EXERCISE_IMAGE_FILES: Record<string, ExerciseImageFile> = {
  "abdominal-bracing-1": { file: "abdominal-bracing-1.webp", credit: "Fitness Programer" },
  "bird-dog-1": { file: "bird-dog-1.webp" },
  "bird-dog-2": { file: "bird-dog-2.webp", credit: "Verywell Fit" },
  "cat-camel-1": { file: "cat-camel-1.webp" },
  "cat-camel-2": { file: "cat-camel-2.webp" },
  "diaphragmatic-breathing-1": { file: "diaphragmatic-breathing-1.webp", credit: "Shutterstock" },
  "front-plank-1": { file: "front-plank-1.webp", credit: "MyFitnessPal" },
  "glute-bridge-1": { file: "glute-bridge-1.webp", credit: "Adobe Stock" },
  "glute-bridge-2": { file: "glute-bridge-2.webp" },
  "graded-walking-1": { file: "graded-walking-1.webp", credit: "PIXTA" },
  "hip-hinge-1": { file: "hip-hinge-1.webp", credit: "Shakti Physio Wellness" },
  "hip-hinge-2": { file: "hip-hinge-2.webp" },
  "kettlebell-deadlift-1": { file: "kettlebell-deadlift-1.webp" },
  "kettlebell-deadlift-2": { file: "kettlebell-deadlift-2.webp" },
  "knee-to-chest-1": { file: "knee-to-chest-1.webp", credit: "Healthline" },
  "lower-trunk-rotation-1": { file: "lower-trunk-rotation-1.webp" },
  "mcgill-curl-up-1": { file: "mcgill-curl-up-1.webp", credit: "VectorStock" },
  "pelvic-tilt-1": { file: "pelvic-tilt-1.webp" },
  "pelvic-tilt-2": { file: "pelvic-tilt-2.webp", credit: "Tummee" },
  "prone-press-up-1": { file: "prone-press-up-1.webp" },
  "prone-press-up-2": { file: "prone-press-up-2.webp" },
  "side-plank-1": { file: "side-plank-1.webp" },
  "side-plank-2": { file: "side-plank-2.webp", credit: "Fitwirr" },
  "sit-to-stand-1": { file: "sit-to-stand-1.webp" },
  "sit-to-stand-2": { file: "sit-to-stand-2.webp" },
  "split-squat-1": { file: "split-squat-1.webp" },
  "suitcase-carry-1": { file: "suitcase-carry-1.webp", credit: "Kettlebell Workouts" },
  //  **الدفعةُ الثانية — صورُ «ألم أسفل الظهر الحادّ» الستّ** (٢٠٢٦-١٠-١٠، §4.dg): المجلّدُ نفسُه. «التدحرج ١» لوحُ النهوض وحده (C) من ثلاثة،
  //  فالثانيةُ تحمل التسلسلَ كلَّه؛ و«البسط من الوقوف» بوضعيّتَيه (البطاقةُ لها صورةٌ واحدة) بلا شريط العنوان الإنكليزيّ تحتهما؛
  //  و«الرقم ٤ جالساً» الصورةُ داخل إطارها الزخرفيّ.
  "figure-4-stretch-1": { file: "figure-4-stretch-1.webp", credit: "Web Exercises" },
  "figure-4-stretch-2": { file: "figure-4-stretch-2.webp" },
  "hook-lying-march-1": { file: "hook-lying-march-1.webp" },
  "log-roll-1": { file: "log-roll-1.webp" },
  "log-roll-2": { file: "log-roll-2.webp" },
  "standing-extension-1": { file: "standing-extension-1.webp" },
  //  **الدفعةُ الثالثة — صورُ «ألم الرقبة الميكانيكيّ»: خمسَ عشرةَ من سبعَ عشرة** (٢٠٢٦-١٠-١١، §4.dh): المجلّدُ نفسُه. «الدوران» صفُّه من لوحةٍ بستّة
  //  صفوف و«الميل الجانبيّ» لوحتُه من عشر؛ و«السحب للخلف» الوضعُ الصحيح وحده؛ و«تثبيت اللوحين» لوحتا «للأسفل» و«للخلف» من ستّ؛ و«السناغ» صورتا
  //  الدوران (٣ و٤) بلا رقميهما؛ و«الرفع الجانبيّ للوح» بلا عنوانه؛ و«الانقباض الثابت» ملفٌّ واحد لخانتين: الجبهةُ للأولى والجانبان للثانية؛
  //  و«التجديف» الشكلُ الكامل وحده. **و«نهايةُ التجديف» و«Y منبطحاً» لم تصلا** — الملفّان أظهرا البدايةَ و«T» — فبقيتا «صورة منتظرة»
  //  (ووصلت «نهايةُ التجديف» في الدفعة الرابعة أدناه).
  "band-row-1": { file: "band-row-1.webp" },
  "cervical-isometrics-1": { file: "cervical-isometrics-1.webp" },
  "cervical-isometrics-2": { file: "cervical-isometrics-2.webp" },
  "cervical-retraction-1": { file: "cervical-retraction-1.webp", credit: "Shutterstock" },
  "chin-tuck-supine-1": { file: "chin-tuck-supine-1.webp" },
  "chin-tuck-supine-2": { file: "chin-tuck-supine-2.webp" },
  "deep-neck-flexor-endurance-1": { file: "deep-neck-flexor-endurance-1.webp" },
  "levator-scapulae-stretch-1": { file: "levator-scapulae-stretch-1.webp", credit: "BackIntelligence" },
  "neck-arom-1": { file: "neck-arom-1.webp", credit: "@elite.physio.in" },
  "neck-arom-2": { file: "neck-arom-2.webp" },
  "prone-y-t-1": { file: "prone-y-t-1.webp" },
  "scapular-setting-1": { file: "scapular-setting-1.webp" },
  "self-snag-rotation-1": { file: "self-snag-rotation-1.webp" },
  "thoracic-extension-towel-1": { file: "thoracic-extension-towel-1.webp" },
  "upper-trap-stretch-1": { file: "upper-trap-stretch-1.webp" },
  //  **الدفعةُ الرابعة — «خشونة الركبة»: اثنتا عشرةَ من أربعَ عشرة، و«نهايةُ التجديف» للرقبة** (٢٠٢٦-١٠-١١، §4.di التكملة): المجلّدُ نفسُه.
  //  **وما فيه وضعيّتا الحركة يبقى كاملاً** — صورةٌ تُظهر البدايةَ والنهاية تكفي البطاقةَ ولا يُطلَب لها ملفٌّ ثانٍ (ملاحظةُ المالك على الطلبات المكرّرة).
  //  «سحبُ الكعب» بلا شريط البحث وعنوانه، و«رفعُ الساق مستقيمة» بلا حافّته السفلى المقطوعة، و«الوقوف على ساق» بلا عنوانه المرقّم، و«صعودُ الدرجة»
  //  بلا فراغه الأعلى، و«النزولُ الجانبيّ» بلا السقف. **و«القرفصاءُ على الحائط» و«الدرّاجةُ الثابتة» لم تُسجَّلا**: الأولى قرفصاءُ كاملة (فخذان
  //  موازيان للأرض ونصٌّ «دقيقتين») والبطاقةُ ربعُ قرفصاء؛ والثانية دوّاساتٌ على كرسيّ والركبةُ مثنيّةٌ كثيراً — وبطاقتُها تنهى عن ذلك.
  "band-row-2": { file: "band-row-2.webp" },
  "calf-raise-1": { file: "calf-raise-1.webp", credit: "WorkoutLabs" },
  "hamstring-stretch-seated-1": { file: "hamstring-stretch-seated-1.webp" },
  "heel-prop-1": { file: "heel-prop-1.webp" },
  "heel-slide-1": { file: "heel-slide-1.webp", credit: "Healthwise" },
  "lateral-step-down-1": { file: "lateral-step-down-1.webp" },
  "quad-set-1": { file: "quad-set-1.webp" },
  "seated-knee-extension-1": { file: "seated-knee-extension-1.webp" },
  "seated-knee-extension-2": { file: "seated-knee-extension-2.webp", credit: "wikiHow" },
  "side-lying-hip-abduction-1": { file: "side-lying-hip-abduction-1.webp", credit: "Run Mechanics" },
  "single-leg-balance-1": { file: "single-leg-balance-1.webp" },
  "step-up-1": { file: "step-up-1.webp" },
  "straight-leg-raise-1": { file: "straight-leg-raise-1.webp" },
  //  **صورةٌ معادة لبطاقةٍ جديدة — قاعدةُ المالك «لا تطلب صوراً مكرّرة»** (§4.dm): توازنُ الكاحل بطاقةٌ جديدة لأنّ هدفَ بطاقة الركبة مكتوبٌ للركبة،
  //  والصورةُ نفسُها (واقفٌ على ساقٍ واحدة بجانب كرسيّ) تصلح لها حرفاً بحرف — فنُسخ ملفُّ `single-leg-balance-1.webp` باسم رمزها (حارسُ و.٣:
  //  الملفُّ باسم رمزه) ولم تُطلَب من المالك.
  "ankle-single-leg-balance-1": { file: "ankle-single-leg-balance-1.webp" },
  //  **الدفعةُ الخامسة — كلُّ المطلوب حتى العاشر: ثمانون من اثنتين وثمانين** (٢٠٢٦-١٠-١٢): المجلّدُ نفسُه، ستّةٌ وثمانون ملفّاً (والأربعةُ الزائدة
  //  رفعٌ أقدمُ للخانات نفسِها). **الثلاثُ المنتظرة**: «Y منبطحاً» اللوحةُ العليا وحدها (السفلى «T»)، و«القرفصاءُ على الحائط» ربعُ قرفصاء، و«الدرّاجةُ»
  //  مقعدٌ عالٍ والركبةُ مثنيّةٌ قليلاً — **والنسخُ الأقدم كما رُدّت** (T، وقرفصاءُ كاملة، ودوّاساتٌ على كرسيّ). **وما قُصّ**: من «رفع الذراع إلى الرفّ»
  //  صورةُ المطبخ وحدها، ومن «الوصول جالساً» الجالسُ على المقعد بلا الكرسيّ المتحرّك، ومن «النقل من السرير» عمودُ السرير ⟵ الكرسيّ بلا عنوانه
  //  الكوريّ، ومن «الوصول والقبض» بلا أرقام المراحل اليابانية، ومن «المرآة» الخطوةُ الأولى، ومن «القفّاز» الأكلُ والشرب، ومن «المشي فوق العوائق»
  //  اللوحةُ الوسطى بالمعالج، ومن «الانقباض الثابت للكاحل» لوحةُ الحائط (الثانيةُ رباط)، ومن «الركبة إلى الحائط» بلا العنوان الإنكليزيّ، ومن «لمس
  //  المقعد» الوقفةُ الأولى، ومن «لبس الضاغط» لوحاتُه الثلاث، ومن «المرآة للساق» بلا النصّ الإعلانيّ، ومن «دفع الجدار» الشكلُ بلا العنوان الصينيّ،
  //  ومن «المشّاية» أرقامُ الأشكال. **ولم تُسجَّل اثنتان** لا تُظهران بطاقتَيهما: «نقلُ الوزن واقفاً» امرأةٌ واقفةٌ وحدها بلا طاولةٍ ولا نقلٍ ولا معالج،
  //  و«الدرجُ جلوساً» صعودٌ على اليدين والقدم وقفزٌ بالدرابزين — والبطاقةُ جلوسٌ على الدرجة (§4.dv التكملة).
  "prone-y-t-2": { file: "prone-y-t-2.webp" },
  "wall-squat-1": { file: "wall-squat-1.webp" },
  "stationary-cycling-1": { file: "stationary-cycling-1.webp" },
  //  الكتف (§4.dk).
  "wand-flexion-supine-1": { file: "wand-flexion-supine-1.webp" },
  "isometric-er-1": { file: "isometric-er-1.webp" },
  "isometric-abduction-1": { file: "isometric-abduction-1.webp", credit: "Healthwise" },
  "cross-body-stretch-1": { file: "cross-body-stretch-1.webp" },
  "side-lying-er-1": { file: "side-lying-er-1.webp" },
  "band-er-1": { file: "band-er-1.webp", credit: "Healthwise" },
  "band-ir-1": { file: "band-ir-1.webp" },
  "scaption-raise-1": { file: "scaption-raise-1.webp" },
  "wall-slide-serratus-1": { file: "wall-slide-serratus-1.webp" },
  "doorway-pec-stretch-1": { file: "doorway-pec-stretch-1.webp" },
  "wall-push-up-plus-1": { file: "wall-push-up-plus-1.webp" },
  //  الجلطة (§4.dl) — و«نقلُ الوزن واقفاً» وصلت ثانيةً (٢٠٢٦-١٠-١٢): واقفةٌ أمام طاولةٍ ويداها عليها، بلا شعار الزاوية (§4.dv التكملة ٢).
  "standing-weight-shift-1": { file: "standing-weight-shift-1.webp" },
  "overhead-shelf-lift-1": { file: "overhead-shelf-lift-1.webp" },
  "sitting-reach-1": { file: "sitting-reach-1.webp" },
  "roll-to-sit-1": { file: "roll-to-sit-1.webp", credit: "ptnodoka.com" },
  "bed-to-chair-transfer-1": { file: "bed-to-chair-transfer-1.webp" },
  "affected-arm-weight-bearing-1": { file: "affected-arm-weight-bearing-1.webp" },
  "table-towel-slide-1": { file: "table-towel-slide-1.webp" },
  "ankle-dorsiflexion-seated-1": { file: "ankle-dorsiflexion-seated-1.webp" },
  "overground-gait-training-1": { file: "overground-gait-training-1.webp", credit: "fumira" },
  "side-stepping-1": { file: "side-stepping-1.webp" },
  "reach-grasp-task-1": { file: "reach-grasp-task-1.webp" },
  "mirror-therapy-1": { file: "mirror-therapy-1.webp" },
  "calf-stretch-standing-1": { file: "calf-stretch-standing-1.webp" },
  "forced-use-mitt-1": { file: "forced-use-mitt-1.webp" },
  "obstacle-dual-task-walking-1": { file: "obstacle-dual-task-walking-1.webp" },
  //  الكاحل (§4.dm).
  "ankle-alphabet-1": { file: "ankle-alphabet-1.webp", credit: "Healthwise" },
  "ankle-isometrics-1": { file: "ankle-isometrics-1.webp", credit: "Healthwise" },
  "band-ankle-strengthening-1": { file: "band-ankle-strengthening-1.webp" },
  "knee-to-wall-lunge-1": { file: "knee-to-wall-lunge-1.webp" },
  "star-excursion-reach-1": { file: "star-excursion-reach-1.webp" },
  "forward-hop-stick-1": { file: "forward-hop-stick-1.webp" },
  "lateral-hops-1": { file: "lateral-hops-1.webp" },
  "figure-8-agility-1": { file: "figure-8-agility-1.webp" },
  //  المشيُ بالطرف (§4.dt).
  "prosthesis-donning-1": { file: "prosthesis-donning-1.webp" },
  "residual-limb-skin-check-1": { file: "residual-limb-skin-check-1.webp" },
  "prosthetic-weight-shift-1": { file: "prosthetic-weight-shift-1.webp" },
  "prosthetic-stool-tap-1": { file: "prosthetic-stool-tap-1.webp" },
  "prone-lying-1": { file: "prone-lying-1.webp" },
  "prone-hip-extension-1": { file: "prone-hip-extension-1.webp" },
  "prosthetic-gait-drill-1": { file: "prosthetic-gait-drill-1.webp" },
  "resisted-gait-pnf-1": { file: "resisted-gait-pnf-1.webp" },
  "prosthetic-turning-1": { file: "prosthetic-turning-1.webp" },
  "prosthetic-stairs-up-1": { file: "prosthetic-stairs-up-1.webp" },
  "prosthetic-stairs-down-1": { file: "prosthetic-stairs-down-1.webp" },
  "floor-rise-kneel-1": { file: "floor-rise-kneel-1.webp" },
  "floor-rise-chair-1": { file: "floor-rise-chair-1.webp" },
  "prosthetic-ramp-1": { file: "prosthetic-ramp-1.webp" },
  "treadmill-walking-amputee-1": { file: "treadmill-walking-amputee-1.webp" },
  //  ما قبل الطرف السفليّ (§4.du) — و«الدرجُ جلوساً» وصلت ثالثاً (٢٠٢٦-١٠-١٢): جالسٌ على الدرجة يدفع بيديه والساق السليمة (§4.dv التكملة ٣).
  "residual-limb-stump-board-1": { file: "residual-limb-stump-board-1.webp" },
  "thomas-stretch-amputee-1": { file: "thomas-stretch-amputee-1.webp" },
  "amputee-bed-sit-up-1": { file: "amputee-bed-sit-up-1.webp" },
  "amputee-pivot-transfer-1": { file: "amputee-pivot-transfer-1.webp" },
  "wheelchair-amputee-propulsion-1": { file: "wheelchair-amputee-propulsion-1.webp" },
  "residual-limb-desensitisation-1": { file: "residual-limb-desensitisation-1.webp" },
  "shrinker-donning-1": { file: "shrinker-donning-1.webp" },
  "seated-push-up-1": { file: "seated-push-up-1.webp" },
  "walker-hop-to-1": { file: "walker-hop-to-1.webp" },
  "seated-stair-climbing-1": { file: "seated-stair-climbing-1.webp" },
  "arm-ergometer-1": { file: "arm-ergometer-1.webp" },
  "phantom-mirror-therapy-1": { file: "phantom-mirror-therapy-1.webp", credit: "Amputee Store — EPFL / Alain Herzog, CC BY-SA" },
  //  بترُ الطرف العلويّ (§4.dv).
  "ul-residual-skin-care-1": { file: "ul-residual-skin-care-1.webp" },
  "ul-compression-wrap-1": { file: "ul-compression-wrap-1.webp" },
  "ul-distal-joint-rom-1": { file: "ul-distal-joint-rom-1.webp" },
  "ul-residual-shoulder-rom-1": { file: "ul-residual-shoulder-rom-1.webp" },
  "ul-residual-limb-loading-1": { file: "ul-residual-limb-loading-1.webp" },
  "one-handed-adl-1": { file: "one-handed-adl-1.webp" },
  "hand-dominance-writing-1": { file: "hand-dominance-writing-1.webp", credit: "wikiHow" },
  "myo-site-training-1": { file: "myo-site-training-1.webp" },
  "myo-graded-control-1": { file: "myo-graded-control-1.webp" },
  "pattern-recognition-training-1": { file: "pattern-recognition-training-1.webp" },
  "ul-phantom-mirror-gmi-1": { file: "ul-phantom-mirror-gmi-1.webp" },
  "ul-prosthesis-donning-1": { file: "ul-prosthesis-donning-1.webp" },
  "myo-control-accuracy-1": { file: "myo-control-accuracy-1.webp" },
  "body-powered-control-1": { file: "body-powered-control-1.webp" },
  "multigrip-selection-1": { file: "multigrip-selection-1.webp" },
  "graded-object-grasp-1": { file: "graded-object-grasp-1.webp" },
  "prosthetic-hand-drills-1": { file: "prosthetic-hand-drills-1.webp" },
  "bimanual-adl-tasks-1": { file: "bimanual-adl-tasks-1.webp" },
  //  **الدفعةُ السادسة — ما بعد استبدال الركبة: الاثنتا عشرة كلُّها** (٢٠٢٦-١٠-١٣، §4.dx التكملة): المجلّدُ نفسُه، ملفٌّ لكلّ خانة طابق Drive بايتاً ببايت.
  //  **وما قُصّ**: من «ضخّ الكاحل» العنوانُ والتعليماتُ الإنكليزية (وبقي سطرُ الموقع)، ومن «تحريك الرضفة» النصُّ اليابانيّ وطُليت تسميةُ العظم وخطُّها،
  //  ومن «المشي بالمشّاية» أسماءُ الخطوات الإنكليزية تحت الأشكال، ومن «ثني الركبة على الدرجة» الخلفيةُ الفارغة، ومن «ثني الركبة جالساً» و«ضغط
  //  الساقين» الهوامشُ البيضاء — **والوضعيّتان باقيتان فيهما**، وفي «الدرج» الصعودُ والنزول معاً كما في خطوات البطاقة.
  "ankle-pumps-1": { file: "ankle-pumps-1.webp", credit: "medmovie.com" },
  "patellar-self-mobilisation-1": { file: "patellar-self-mobilisation-1.webp" },
  "cold-elevation-1": { file: "cold-elevation-1.webp" },
  "seated-knee-flexion-slide-1": { file: "seated-knee-flexion-slide-1.webp" },
  "walking-aid-gait-1": { file: "walking-aid-gait-1.webp" },
  "stairs-after-knee-surgery-1": { file: "stairs-after-knee-surgery-1.webp", credit: "MG共享康复" },
  "car-transfer-1": { file: "car-transfer-1.webp" },
  "scar-mobilisation-1": { file: "scar-mobilisation-1.webp" },
  "terminal-knee-extension-1": { file: "terminal-knee-extension-1.webp" },
  "knee-flexion-step-stretch-1": { file: "knee-flexion-step-stretch-1.webp" },
  "leg-press-progressive-1": { file: "leg-press-progressive-1.webp" },
  "kneeling-floor-transfer-1": { file: "kneeling-floor-transfer-1.webp" },
  //  **ما بعد استبدال الورك** (ترحيل ١٤٠، §4.dz): بطاقتا الدرج والسيارة للورك بصورتَي بطاقتَي الركبة منسوختين باسم رمزيهما — تُظهران الحركةَ نفسَها
  //  (الصعودُ بالسليمة والعكّازُ والدرابزين، والجلوسُ في المقعد ثمّ إدخالُ الساق) بلا ما يخصّ الركبة.
  "stairs-after-hip-surgery-1": { file: "stairs-after-hip-surgery-1.webp", credit: "MG共享康复" },
  "car-transfer-hip-1": { file: "car-transfer-hip-1.webp" },
  //  **الدفعةُ السابعة — ما بعد استبدال الورك: الإحدى عشرة كلُّها** (٢٠٢٦-١٠-١٣، §4.dz التكملة): المجلّدُ نفسُه، ملفٌّ لكلّ خانة طابق Drive بايتاً ببايت.
  //  **وما قُصّ**: من «الحركة الآمنة» الكتابةُ البرتغالية تحت الأشكال وكلمةُ «لا» فوقها (وبقيت الأسهمُ والعلاماتُ الحمراء)، ومن «مُلبِس الجوارب» التعليماتُ
  //  الإنكليزية (فأُعيد صفُّ الرسوم الأربعة بأرقامها)، **ومن «الصلاة» صفُّ الأرض كلُّه** (السجودُ على الأرض ممنوعٌ في الأسابيع الأولى — فبقي صفُّ الكرسيّ وحده)،
  //  ومن «رفع الحوض على درجة» الحروفُ والعنوانُ والشعار، ومن «شدّ المقعدة» و«الصدفة» الهوامشُ البيضاء. **و«النهوض من السرير» هي صورةُ «التقلّب ككتلة»
  //  بعينها** (`log-roll-2`، الفرقُ ٣ في البصمة) — فنُسخ ملفُّها المسجَّل باسم الرمز.
  "gluteal-sets-1": { file: "gluteal-sets-1.webp" },
  "supine-hip-abduction-slide-1": { file: "supine-hip-abduction-slide-1.webp" },
  "standing-hip-three-way-1": { file: "standing-hip-three-way-1.webp" },
  "hip-safe-movement-1": { file: "hip-safe-movement-1.webp" },
  "bed-mobility-hip-1": { file: "bed-mobility-hip-1.webp" },
  "raised-seat-transfer-hip-1": { file: "raised-seat-transfer-hip-1.webp" },
  "dressing-aids-hip-1": { file: "dressing-aids-hip-1.webp" },
  "walking-aid-gait-hip-1": { file: "walking-aid-gait-hip-1.webp" },
  "prayer-progression-hip-1": { file: "prayer-progression-hip-1.webp" },
  "pelvic-drop-step-1": { file: "pelvic-drop-step-1.webp", credit: "Run Mechanics" },
  "clamshell-1": { file: "clamshell-1.webp" },
  //  **الدفعةُ الثامنة — ألمُ الكعب الأخمصيّ: الستّ كلُّها** (٢٠٢٦-١٠-١٤، §4.eb التكملة): المجلّدُ نفسُه، ملفٌّ لكلّ خانة طابق Drive بايتاً ببايت، ولا تكرارَ
  //  مع المسجَّلة في البصمة. **وما قُصّ**: من «شدّ اللفافة» العنوانُ الإنكليزيّ؛ ومن «ثني الأصابع بالمنشفة» عمودُ التعليمات الإنكليزية وتعليقُ كلّ خطوة
  //  (فبقي الشكلُ الجالس وخطواتُه الثلاث بأرقامها)؛ ومن «القدم القصيرة» النصُّ التشيكيّ كلُّه (فبقي الشكلُ الجالس والقدمُ مرتخيةً فوق القدم مفعَّلةً
  //  بسهميها)؛ **ومن «الجبيرة الليلية» الشريطُ الإنكليزيّ وقائمةُ الأمراض الدعائية** بجانبها (طُليت بلون الخلفية). **وبقيت حروفُ «التشريط» A–D**:
  //  تقول ترتيبَ الشرائط هنا، لا كحروف «رفع الحوض».
  "plantar-fascia-stretch-1": { file: "plantar-fascia-stretch-1.webp" },
  "heel-raise-towel-high-load-1": { file: "heel-raise-towel-high-load-1.webp" },
  "towel-toe-curl-1": { file: "towel-toe-curl-1.webp" },
  "short-foot-1": { file: "short-foot-1.webp" },
  "low-dye-taping-1": { file: "low-dye-taping-1.webp" },
  "night-splint-1": { file: "night-splint-1.webp" },
  //  **الدفعةُ التاسعة — عِرقُ النسا: أربعٌ من خمس** (٢٠٢٦-١٠-١٤، §4.ec التكملة): **لم يُرفع شيءٌ منها إلى المجلّد، فبحث عنها المساعدُ بطلب المالك**
  //  («حاول بصور البروتوكول الذي لم تجلب صوره») — والمصدرُ اسمُ الموقع ورابطُ صفحته، ولا صورةَ من مواقع الصور المدفوعة ولا بعلامتها.
  //  «الانبطاح على المرفقين» **من صورةٍ مسجَّلة**: النصفُ السفليّ من «البسط من الانبطاح ١» هو الوضعُ نفسُه (مُحيت منه «POSITION 2»)؛ و«تصحيح الميل»
  //  لوحاه دون لافتة الحائط. **و«الركوع بثني الركبتين» تنتظر**: الصورةُ الوحيدة بركبتين مثنيّتين ظهرُها منحنٍ، والبطاقةُ تقول ظهراً مستقيماً.
  "prone-on-elbows-1": { file: "prone-on-elbows-1.webp" },
  "lateral-shift-correction-1": { file: "lateral-shift-correction-1.webp", credit: "Lombafit", sourceUrl: "https://www.lombafit.com/methode-mckenzie/" },
  "supine-sciatic-slider-1": { file: "supine-sciatic-slider-1.webp", credit: "Rehab Hero", sourceUrl: "https://www.rehabhero.ca/exercise/knee-sciatic-nerve-flossing" },
  "slump-slider-seated-1": { file: "slump-slider-seated-1.webp", credit: "Dani Winks Flexibility", sourceUrl: "https://www.daniwinksflexibility.com/bendy-blog/what-is-sciatic-nerve-tension-and-how-do-i-fix-it" },
  //  الكتفُ المتجمّد (ترحيل ١٤٩، §4.eg) — الستُّ بحث عنها المساعد على الويب (لا شيءَ في Drive ولا في المسجَّل يُظهر حركاتها).
  "codman-pendulum-1": { file: "codman-pendulum-1.webp", credit: "OrthoInfo — AAOS", sourceUrl: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program" },
  "wand-er-supine-1": { file: "wand-er-supine-1.webp", credit: "UW Medicine Orthopaedics & Sports Medicine (Matsen)", sourceUrl: "https://orthop.washington.edu/patient-care/articles/shoulder/rehabilitation-after-shoulder-arthroplasty.html" },
  "wall-finger-walk-1": { file: "wall-finger-walk-1.webp", credit: "OrthoInfo — AAOS", sourceUrl: "https://orthoinfo.aaos.org/en/recovery/shoulder-surgery-exercise-guide" },
  "towel-ir-behind-back-1": { file: "towel-ir-behind-back-1.webp", credit: "UW Medicine Orthopaedics & Sports Medicine (Matsen)", sourceUrl: "https://orthop.washington.edu/patient-care/articles/shoulder/rehabilitation-after-shoulder-arthroplasty.html" },
  "sleeper-stretch-1": { file: "sleeper-stretch-1.webp", credit: "H2 Health", sourceUrl: "https://www.h2health.com/stretches-and-exercises/" },
  "prayer-wudu-reach-1": { file: "prayer-wudu-reach-1.webp", credit: "Tawasol Symbols (Mada) — CC BY-SA 4.0", sourceUrl: "https://globalsymbols.com/symbolsets/tawasol/symbols/7566" },
  //  الاعتلالُ الجذريّ العنقيّ (ترحيل ١٥١، §4.ei) — الستُّ بحث عنها المساعد على الويب (لا شيءَ في Drive ولا في المسجَّل يُظهر حركاتها)، ورآها كلَّها قبل تسجيلها؛
  //  وصورةُ العصب الزنديّ الأولى رُدّت لأنّ مصدرَها مكتبةُ تمارين تجارية، فبُدّلت بصور المستشفى نفسِه.
  "median-nerve-slider-1": { file: "median-nerve-slider-1.webp", credit: "© State of Queensland (Metro North Hospital and Health Service) — CC BY-ND 4.0 (drawings after Coppieters et al.)", sourceUrl: "https://metronorth.health.qld.gov.au/tpch/wp-content/uploads/sites/3/2021/12/ot-exercises-to-glide-my-median-nerve.pdf" },
  "ulnar-nerve-slider-1": { file: "ulnar-nerve-slider-1.webp", credit: "East Kent Hospitals University NHS FT", sourceUrl: "https://leaflets.ekhuft.nhs.uk/cubital-tunnel-syndrome/html/" },
  "shoulder-abduction-relief-1": { file: "shoulder-abduction-relief-1.webp", credit: "Kimura et al., Cureus 2023 — CC BY 3.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9918333/" },
  "triceps-band-extension-1": { file: "triceps-band-extension-1.webp", credit: "Versus Arthritis", sourceUrl: "https://www.arthritis-uk.org/media/fg1ot4q0/versus-arthritis-resistance-band-exercise-sheet-upper-body-2.pdf" },
  "wrist-extension-weight-1": { file: "wrist-extension-weight-1.webp", credit: "Leicestershire Partnership NHS Trust", sourceUrl: "https://www.leicspart.nhs.uk/wp-content/uploads/2022/07/514-Tennis-Elbow.pdf" },
  "grip-putty-squeeze-1": { file: "grip-putty-squeeze-1.webp", credit: "Sherwood Forest Hospitals NHS FT", sourceUrl: "https://www.sfh-tr.nhs.uk/media/3lxfm3sa/pil202508-05-tphe-therapeutic-putty-hand-exercises.pdf" },
  //  مرفقُ التنس (ترحيل ١٥٢، §4.ej) — الخمسُ بحث عنها المساعد على الويب (لا شيءَ في Drive ولا في المسجَّل يُظهر حركاتها)، ورآها كلَّها قبل تسجيلها؛
  //  ورُدّت صورٌ تنسبها نشراتُها إلى مكتبة تمارين تجارية. والتحريكُ الذاتيّ صورةُ التجربة نفسِها (يدٌ تدفع لا حزام — والبطاقةُ كُتبت عليها).
  "wrist-extensor-isometric-1": { file: "wrist-extensor-isometric-1.webp", credit: "Leicestershire Partnership NHS Trust", sourceUrl: "https://www.leicspart.nhs.uk/wp-content/uploads/2022/07/514-Tennis-Elbow.pdf" },
  //  **صورُ المصادر ذات الحقوق مقبولة — قرارُ المالك ٢٠٢٦-١٠-٢٠** («استخدم حتى إن كانت بحقوق لأنّي لن أنشرها ولن أستخدمها تجارياً — استخدامٌ شخصيّ خاصّ»، §4.ew):
  //  فعادت الصورُ الأربع التي بُدّلت أو أُزيلت يومَها لشروط مصادرها (أكسفورد · نوفا سكوشا · رايتنغتون)، والمصدرُ مكتوبٌ كما كان.
  "forearm-rotation-hammer-1": { file: "forearm-rotation-hammer-1.webp", credit: "Oxford University Hospitals NHS FT (Nuffield Orthopaedic Centre)", sourceUrl: "https://www.ouh.nhs.uk/media/lsjlro5o/85220advice.pdf" },
  "radial-deviation-hammer-1": { file: "radial-deviation-hammer-1.webp", credit: "Nova Scotia Health", sourceUrl: "https://www.nshealth.ca/sites/default/files/documents/1349-2025.03.11.pdf" },
  "wrist-extensor-stretch-1": { file: "wrist-extensor-stretch-1.webp", credit: "NHS Greater Glasgow and Clyde", sourceUrl: "https://rightdecisions.scot.nhs.uk/media/je5g5qzk/tennis-elbow-exercise-booklet.pdf" },
  "elbow-self-mwm-1": { file: "elbow-self-mwm-1.webp", credit: "Coombes et al., BMC Musculoskelet Disord 2009 — CC BY 2.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2707364/" },
  //  تضيّقُ القناة القطنية (ترحيل ١٥٣، §4.ek) — الأربعُ بحث عنها المساعد على الويب (لا شيءَ في Drive ولا في المسجَّل يُظهر حركاتها — «سحب الركبة
  //  إلى الصدر» المسجَّلةُ ركبةٌ واحدة)، ورآها كلَّها قبل تسجيلها؛ ورُدّت صورٌ تنسبها نشراتُها إلى مكتبات تمارين تجارية. والمشّايةُ صورةٌ برخصةٍ مفتوحة قُصّت وصُغّرت.
  "double-knee-to-chest-1": { file: "double-knee-to-chest-1.webp", credit: "NHS Greater Glasgow and Clyde (MSK Physiotherapy)", sourceUrl: "https://rightdecisions.scot.nhs.uk/media/lwacd0ys/spinal-stenosis-patient-info.pdf" },
  "seated-forward-flexion-1": { file: "seated-forward-flexion-1.webp", credit: "NHS Greater Glasgow and Clyde (MSK Physiotherapy)", sourceUrl: "https://rightdecisions.scot.nhs.uk/media/1848/308219_2_0-information-on-stenosis.pdf" },
  "rollator-flexed-walking-1": { file: "rollator-flexed-walking-1.webp", credit: "nathanmac87 (Flickr) via Wikimedia Commons — CC BY 2.0 (cropped and resized)", sourceUrl: "https://commons.wikimedia.org/wiki/File:Los_Angeles_Weekend_(20477413034)_(cropped).jpg" },
  "tandem-stance-1": { file: "tandem-stance-1.webp", credit: "NHS Greater Glasgow and Clyde (Mental Health Physiotherapists)", sourceUrl: "https://rightdecisions.scot.nhs.uk/media/nkgh2jey/falls-2021-exercises-for-strength-and-balance.pdf" },
  //  ألمُ الرضفة الفخذيّ (ترحيل ١٥٥، §4.en) — الخمسُ بحث عنها المساعد على الويب (لا شيءَ في Drive ولا في المسجَّل يُظهر حركاتها — «الوركُ بثلاثة اتّجاهات»
  //  المسجَّلةُ بلا مطّاط)، ورآها كلَّها قبل تسجيلها؛ ورُدّت صورٌ تنسبها نشراتُها إلى مكتبات تمارين تجارية. وتمطيطُ الفخذ رسمٌ بلا حائطٍ ولا كرسيّ (وصفُه يقوله)،
  //  والجريُ شكلان بلا كتابة — الأيسرُ المطلوب، ووصفُ الصورة يقوله؛ وهو والشريطُ صورتا بحثين برخصة CC BY.
  "quadriceps-stretch-standing-1": { file: "quadriceps-stretch-standing-1.webp", credit: "OrthoInfo — AAOS", sourceUrl: "https://www.orthoinfo.org/en/recovery/knee-conditioning-program/" },
  "standing-band-hip-abduction-1": { file: "standing-band-hip-abduction-1.webp", credit: "Arthritis Action", sourceUrl: "https://www.arthritisaction.org.uk/wp-content/uploads/2018/06/Hip-strength-exercises.pdf" },
  "single-leg-squat-to-box-1": { file: "single-leg-squat-to-box-1.webp", credit: "Wrightington, Wigan and Leigh Teaching Hospitals NHS FT", sourceUrl: "https://www.wwl.nhs.uk/pdfreader/accessiblePDF/cnv-wwl-68ca8bce8ec828.01098451" },
  "running-cadence-1": { file: "running-cadence-1.webp", credit: "Wallace et al., Evol Hum Sci 2022 (drawing by Samantha Shields) — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9624512/" },
  "patellar-taping-1": { file: "patellar-taping-1.webp", credit: "Yoon & Son, Medicina 2022 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9501162/" },
  //  خشونةُ الورك (ترحيل ١٥٦، §4.eo) — الخمسُ بحث عنها المساعد على الويب (لا شيءَ في المسجَّل يُظهر حركاتها، وموصلُ Drive لم يكن متّصلاً في الجلسة)،
  //  ورآها كلَّها قبل تسجيلها؛ ورُدّت صورٌ تنسبها نشراتُها إلى مكتبات تمارين تجارية. والتدويرُ الداخليّ صورةُ قياسٍ بيد الفاحص (لا صورةَ مفتوحة للمريض وحده)،
  //  والشدُّ من الكاحل، والصلاةُ رمزا التشهّد والسجود بوضعهما المعتاد — ووصفُ كلٍّ منها في الترحيل يقول ذلك.
  "hip-internal-rotation-stretch-1": { file: "hip-internal-rotation-stretch-1.webp", credit: "Ganokroj et al., BMC Musculoskelet Disord 2021 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7879637/" },
  "quadruped-rock-back-1": { file: "quadruped-rock-back-1.webp", credit: "Songjaroen et al., Sci Rep 2021 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8292547/" },
  "hip-long-axis-distraction-1": { file: "hip-long-axis-distraction-1.webp", credit: "Wong & Macpherson, Cureus 2025 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12358169/" },
  "contralateral-cane-walking-1": { file: "contralateral-cane-walking-1.webp", credit: "NHS Fife (Physiotherapy Dept)", sourceUrl: "https://www.nhsfife.org/media/erxpgb68/using_a_walking_stick_v7.pdf" },
  "prayer-floor-sitting-hip-oa-1": { file: "prayer-floor-sitting-hip-oa-1.webp", credit: "Tawasol Symbols (Mada) — CC BY-SA 4.0", sourceUrl: "https://globalsymbols.com/symbolsets/tawasol/symbols/7975" },
  //  **الجلطةُ المزمنة — البطاقاتُ الستّ الجديدة** (٢٠٢٦-١٠-١٨، §4.ep): لا صورةَ لها في Drive (آخرُ ملفٍّ فيه ٢٠٢٦-١٠-١٤) ولا في المسجَّل؛ فبحث عنها المساعدُ على الويب
  //  ورآها: أربعٌ من أبحاثٍ برخصة CC BY (طوبقت الرخصةُ مع Europe PMC، ولا ملاحظةَ «بإذن» على الشكل)، ورموزُ Tawasol للصلاة، وصورةُ وضوءٍ برخصة CC BY 2.0.
  "hit-treadmill-walking-1": { file: "hit-treadmill-walking-1.webp", credit: "Cleland et al., Mult Scler Relat Disord 2026 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12926876/" },
  "reactive-stepping-practice-1": { file: "reactive-stepping-practice-1.webp", credit: "Bosquée et al., Eur Rev Aging Phys Act 2021 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8493681/" },
  "stairs-speed-training-1": { file: "stairs-speed-training-1.webp", credit: "Yeung et al., J NeuroEng Rehabil 2021 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7847008/" },
  "floor-rise-hemiparesis-1": { file: "floor-rise-hemiparesis-1.webp", credit: "Seeley et al., Age Ageing 2026 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13023370/" },
  "prayer-hemiparesis-pathway-1": { file: "prayer-hemiparesis-pathway-1.webp", credit: "Tawasol Symbols (Mada) — CC BY-SA 4.0", sourceUrl: "https://globalsymbols.com/symbolsets/tawasol/symbols/7984" },
  "wudu-affected-arm-assist-1": { file: "wudu-affected-arm-assist-1.webp", credit: "np&djjewell (Flickr) via Wikimedia Commons — CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Ablution_(Wudu)_S%C3%BCleymaniye_Mosque,_Istanbul_(6328282594).jpg" },
  "standing-hamstring-curl-1": { file: "standing-hamstring-curl-1.webp", credit: "OrthoInfo — AAOS", sourceUrl: "https://www.orthoinfo.org/en/recovery/knee-conditioning-program/" },
  "fitball-hamstring-curl-1": { file: "fitball-hamstring-curl-1.webp", credit: "Eric Astrauskas (Flickr) — CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/121183998@N08/43844585072" },
  "knee-stability-band-loop-1": { file: "knee-stability-band-loop-1.webp", credit: "Silva et al., Trials 2019 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6788005/" },
  "skater-hop-soft-landing-1": { file: "skater-hop-soft-landing-1.webp", credit: "Kim, Brain Sci 2025 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12293109/" },
  "hop-cross-four-directions-1": { file: "hop-cross-four-directions-1.webp", credit: "Vijayakumar & Palekar, Cureus 2024 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11180489/" },
  "prone-hang-extension-1": { file: "prone-hang-extension-1.webp", credit: "James Paget University Hospitals NHS FT — ACL reconstruction leaflet (PH36)", sourceUrl: "https://www.jpaget.nhs.uk/media/gshbpdbh/ph-36-anterior-cruciate-ligament-reconstruction-ver-3.pdf" },
  "acl-open-chain-knee-extension-1": { file: "acl-open-chain-knee-extension-1.webp", credit: "Kasnesis et al., Sci Data 2025 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11992047/" },
  "single-leg-pogo-hops-1": { file: "single-leg-pogo-hops-1.webp", credit: "Ortega-Prados et al., J Clin Med 2025 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12294919/" },
  "walk-jog-progression-1": { file: "walk-jog-progression-1.webp", credit: "Ortega-Prados et al., J Clin Med 2025 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12294919/" },
  "deceleration-cutting-drills-1": { file: "deceleration-cutting-drills-1.webp", credit: "Ortega-Prados et al., J Clin Med 2025 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12294919/" },
  "nordic-hamstring-curl-1": { file: "nordic-hamstring-curl-1.webp", credit: "Whyte et al., PLOS One 2026 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12931786/" },
  "fifa-11-plus-warm-up-1": { file: "fifa-11-plus-warm-up-1.webp", credit: "Steindy (Wikimedia Commons) — CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Andorra_national_football_team_-_Warm_up_(002).jpg" },
  //  **صورُ الصلاة الثلاث التي انتظرت المالك** (٢٠٢٦-١٠-١٩ — أرسلها في المحادثة بعد أن رآها في «الصور المطلوبة»، ورتّبها بمواقعها):
  //  لا اسمَ موقعٍ مكتوبٌ على أيٍّ منها فبلا مصدر (قاعدةُ الدفعة الأولى أعلاه). «الركوع» صورةٌ كما هي، و«الصلاة مع الغضروف» رسمان
  //  كما هما، و«الصلاة بعد الرباط» قُصّ منها صفُّ الرسوم الثلاثة على الكرسيّ وحده — النصُّ الإندونيسيّ فوقه وتحته خارجَها.
  //  ووصفُ الثلاث كما وصلت بترحيل ١٦٠.
  "prayer-bent-knee-ruku-1": { file: "prayer-bent-knee-ruku-1.webp" },
  "prayer-deep-flexion-meniscus-1": { file: "prayer-deep-flexion-meniscus-1.webp" },
  "prayer-kneeling-after-acl-1": { file: "prayer-kneeling-after-acl-1.webp" },
  //  **صورُ «متلازمة النفق الرسغي» الأربع** (٢٠٢٦-١٠-١٩، §4.et — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه): ثلاثٌ من أبحاثٍ برخصة CC BY
  //  (طوبقت الرخصةُ مع Europe PMC) — انزلاقُ الأوتار رسومُ Loh 2018 جُمعت أوضاعُها الخمسة في صفٍّ واحد بترتيب التمرين وحُذفت تسمياتُها الإنكليزية ووضعُ «الراحة»،
  //  وانزلاقُ العصب ستُّ صورٍ من Akdağ 2024 (والموافقةُ مكتوبة) طُمس رقمُ اللوحة فيها، والجبيرةُ من بروتوكول تجربة Atroshi 2019 بلا لوحة الجبيرة المنزوعة؛
  //  وتدليكُ الندبة من منشور مستشفى كوين فكتوريا (NHS، بلا رخصةٍ معلنة وصورتُه منه). **و«الرسغ المستقيم في العمل» بلا صورة** — لم تُوجد صورةٌ بترخيصٍ مقبول
  //  تُظهر الرسغَ مستقيماً بحجمٍ يُقرأ، فهي في «الصور المطلوبة» تنتظر المالك.
  "tendon-gliding-1": { file: "tendon-gliding-1.webp", credit: "Loh et al., PeerJ 2018 — CC BY 4.0 (adapted)", sourceUrl: "https://peerj.com/articles/5406/" },
  "median-nerve-glide-hand-1": { file: "median-nerve-glide-hand-1.webp", credit: "Akdağ et al., Front Neurosci 2024 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10835795/" },
  "wrist-night-splint-1": { file: "wrist-night-splint-1.webp", credit: "Atroshi et al., Trials 2019 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6712840/" },
  "palm-scar-massage-1": { file: "palm-scar-massage-1.webp", credit: "Queen Victoria Hospital NHS FT — Hand Therapy: Scar Massage (0128)", sourceUrl: "https://www.qvh.nhs.uk/download/patient-information-leaflets/scar-massage-0128" },
  //  **صورُ «ما بعد كسر الكعبرة البعيد» السبع** (٢٠٢٦-١٠-١٩، §4.eu — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه، والمسجَّلُ لا يُظهر الحركاتِ بلا ثقل):
  //  ستٌّ من منشورات مستشفياتٍ بريطانية بتصويرها هي (بلا رخصةٍ معلنة) — طُمس حرفا «a/b» في صورة التدوير، و«الاستناد» صورتان من مصدرين جُمعتا (الطاولةُ ثمّ اليدان
  //  والركبتان)؛ **وصندوقُ المرآة ملفُّ `ul-phantom-mirror-gmi-1.webp` المسجَّل منسوخاً باسم رمزه** (حارسُ و.٣ — وقاعدةُ المالك: لا تُطلب صورةٌ مكرّرة). **و«عصر المنشفة» بلا صورة** — لا صورةَ بترخيصٍ مقبول.
  //  **وتصحيحٌ معها**: صورةُ «انزلاق العصب الأوسط» من Metro North برخصة CC BY-ND 4.0 (صفحةُ الحقوق في موقعهم) — والرسمان جزءٌ منها بلا تعديل فيجوز نشرُه،
  //  وسطرُها صار يحمل إشعارَ الحقوق واسمَ الرخصة كما تشترط.
  //  **وصورةُ «الاستناد» بُدّلت يومَ ٢٠٢٦-١٠-٢٠ لشروط أكسفورد (§4.ev) ثمّ عادت كما كانت بقرار المالك في اليوم نفسه** — الاستعمالُ خاصّ (§4.ew)؛ وسطرا باث بـ«©».
  "wrist-flex-ext-arom-1": { file: "wrist-flex-ext-arom-1.webp", credit: "University Hospital Southampton NHS FT — Wrist exercises (3459)", sourceUrl: "https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Medicinestherapiesandanaesthetics/Wrist-exercises-3459-PIL.pdf" },
  "wrist-deviation-arom-1": { file: "wrist-deviation-arom-1.webp", credit: "University Hospital Southampton NHS FT — Wrist exercises (3459)", sourceUrl: "https://www.uhs.nhs.uk/Media/UHS-website-2019/Patientinformation/Medicinestherapiesandanaesthetics/Wrist-exercises-3459-PIL.pdf" },
  "forearm-rot-arom-1": { file: "forearm-rot-arom-1.webp", credit: "Northern Care Alliance NHS FT — Following wrist injury (PI_SU_1526)", sourceUrl: "https://www.northerncarealliance.nhs.uk/patient-information/patient-leaflets/othopaedic-surgery-following-wrist-injury" },
  "prayer-stretch-wrist-1": { file: "prayer-stretch-wrist-1.webp", credit: "© Royal United Hospitals Bath NHS FT — Wrist Exercises (HTH/024)", sourceUrl: "https://ruh.nhs.uk/patients/patient_information/HTH024_Wrist_Exercises.pdf" },
  "hand-elevation-pump-1": { file: "hand-elevation-pump-1.webp", credit: "Worcestershire Acute Hospitals NHS Trust — In-cast Exercises for Fractures of the Wrist", sourceUrl: "https://www.worcsacute.nhs.uk/leaflets/in-cast-exercises-for-fractures-of-the-wrist/" },
  "wrist-weight-bearing-progression-1": { file: "wrist-weight-bearing-progression-1.webp", credit: "Oxford University Hospitals NHS FT (content from University Hospitals Sussex) + © Royal United Hospitals Bath (HTH018b)", sourceUrl: "https://www.ouh.nhs.uk/media/jsnlfzn4/102394wrist.pdf" },
  "wrist-gmi-mirror-1": { file: "wrist-gmi-mirror-1.webp" },
  //  **صورُ «شلل العصب الوجهي» السبع** (٢٠٢٦-١٠-٢٠، §4.ev — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه، ولا صورةَ وجهٍ في المسجَّل):
  //  رسمان من بحثٍ برخصة CC BY رُسما بمساعدة الذكاء الاصطناعيّ — فالوجوهُ مصنوعة لا أشخاص؛ وصورتان من منشور مستشفى هَل البريطانيّ بتصوير موظّفيه
  //  (بلا رخصةٍ معلنة، ولا صفحةَ شروطٍ في موقعه)؛ وصورتان من ويكيميديا برخصة CC BY-SA (الأولى بإذن صاحبتها، والثانية مضمضةٌ في الوضوء)؛ وصورةٌ من ١٩١٠ ملكٌ عامّ.
  "eye-care-closure-1": { file: "eye-care-closure-1.webp", credit: "Andrea Kamphuis, Wikimedia Commons — CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Fazialisl%C3%A4hmung_Tag_01_Uhrglasverband_1000.jpg" },
  "facial-mirror-retraining-1": { file: "facial-mirror-retraining-1.webp", credit: "Lin, Front Neurol 2026 — CC BY 4.0 (schematic drawn with AI assistance)", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13642283/" },
  "facial-self-massage-1": { file: "facial-self-massage-1.webp", credit: "Margaret Mixter, Health and Beauty Hints (1910), photo Joel Feder — public domain", sourceUrl: "https://commons.wikimedia.org/wiki/File:Face_massage_-_Healthbeautyhint00mixt_0021.jpg" },
  "lip-seal-cheek-puff-1": { file: "lip-seal-cheek-puff-1.webp", credit: "Lin, Front Neurol 2026 — CC BY 4.0 (schematic drawn with AI assistance)", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13642283/" },
  "synkinesis-dissociation-1": { file: "synkinesis-dissociation-1.webp", credit: "© Hull University Teaching Hospitals NHS Trust — Facial Exercises and Stretches (HEY1663/2026)", sourceUrl: "https://www.hey.nhs.uk/patient-leaflet/facial-exercises-and-stretches/" },
  "facial-cheek-stretch-1": { file: "facial-cheek-stretch-1.webp", credit: "© Hull University Teaching Hospitals NHS Trust — Facial Exercises and Stretches (HEY1663/2026)", sourceUrl: "https://www.hey.nhs.uk/patient-leaflet/facial-exercises-and-stretches/" },
  "facial-function-tasks-1": { file: "facial-function-tasks-1.webp", credit: "Pharouqenr, Wikimedia Commons (Wiki Loves Ramadan 2026) — CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:A_Muslim_man_performs_ablution_(wudu)_during_the_holy_month_of_Ramadan.jpg" },
  //  **صورُ «الشلل الدماغي عند الأطفال» التسع** (٢٠٢٦-١٠-٢٠، §4.ew — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه): أربعٌ من منشورات تحالف الشلل الدماغيّ الأستراليّ
  //  وصفحاته (ثلاثٌ منها مقصوصةٌ من دليلَي الأهل)، واثنتان من كتيّب العناية بالوضعيات لـNHS Grampian، وكليفلاند كلينك، ومقالُ Rehab Management، وصورةُ بحثٍ برخصة CC BY —
  //  بقرار المالك: الاستعمالُ خاصّ فلا تُردّ صورةٌ لحقوقها، والمصدرُ يُكتب.
  "cp-goal-task-practice-1": { file: "cp-goal-task-practice-1.webp", credit: "Cerebral Palsy Alliance — Therapy and support for school-age children (7–12), p. 20", sourceUrl: "https://cerebralpalsy.org.au/wp-content/uploads/2023/06/CPA40_EarlyInterventionGuide_7-12_LR.pdf" },
  "cp-early-motor-play-1": { file: "cp-early-motor-play-1.webp", credit: "© NHS Grampian — A Guide to 24 Hour Postural Management (CGD 150534), p. 5", sourceUrl: "https://www.rach.scot.nhs.uk/wp-content/uploads/2023/05/Parent-Booklet-FINAL-Draft-1.pdf" },
  "cp-cimt-play-1": { file: "cp-cimt-play-1.webp", credit: "© Cleveland Clinic Children's — constraint-induced movement therapy", sourceUrl: "https://my.clevelandclinic.org/patient-stories/590-innovative-therapy-helps-child-gain-use-of-both-arms" },
  "cp-bimanual-play-1": { file: "cp-bimanual-play-1.webp", credit: "Cerebral Palsy Alliance — Therapy and support for school-age children (7–12), p. 15", sourceUrl: "https://cerebralpalsy.org.au/wp-content/uploads/2023/06/CPA40_EarlyInterventionGuide_7-12_LR.pdf" },
  "cp-functional-strength-play-1": { file: "cp-functional-strength-play-1.webp", credit: "Cerebral Palsy Alliance — Gross motor skills group", sourceUrl: "https://cerebralpalsy.org.au/services/gross-motor-skills-group/" },
  "cp-treadmill-training-1": { file: "cp-treadmill-training-1.webp", credit: "Cerebral Palsy Alliance — Bodyweight supported treadmill training", sourceUrl: "https://cerebralpalsy.org.au/services/bodyweight-supported-treadmill-training/" },
  "cp-standing-frame-abduction-1": { file: "cp-standing-frame-abduction-1.webp", credit: "Rehab Management — Case study: standing program prevents surgery (2022)", sourceUrl: "https://rehabpub.com/mobility/standing-systems/case-study-standing-program-prevents-surgery/" },
  "cp-afo-wear-skin-1": { file: "cp-afo-wear-skin-1.webp", credit: "Guner et al., Children (Basel) 2023 — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10137149/" },
  "cp-24h-postural-care-1": { file: "cp-24h-postural-care-1.webp", credit: "© NHS Grampian — A Guide to 24 Hour Postural Management (CGD 150534), p. 6", sourceUrl: "https://www.rach.scot.nhs.uk/wp-content/uploads/2023/05/Parent-Booklet-FINAL-Draft-1.pdf" },
  //  **صورُ «إصابة الحبل الشوكي» العشر** (٢٠٢٦-١٠-٢٣، §4.ex — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه): منشورُ MSKTC بإذن نسخه مع الإسناد، وثلاثُ لقطاتٍ
  //  من مقاطع يوتيوب لأصحابها المصابين، وثلاثٌ من ويكيميديا (قبضةُ الوتر صورتان لصاحبهما جنباً إلى جنب، والمسجدُ النبويّ مقصوص)، ورسمُ Healthwise، وكتيّبُ Parkwood،
  //  وبطاقةُ مؤسّسة ريف بالعربية — بقرار المالك: الاستعمالُ خاصّ فلا تُردّ صورةٌ لحقوقها، والمصدرُ يُكتب.
  "sci-pressure-relief-1": { file: "sci-pressure-relief-1.webp", credit: "MSKTC / Northwest Regional SCI System, University of Washington — Pressure Relief (© 2009 MSKTC, may be reproduced with attribution), p. 2", sourceUrl: "https://sci.washington.edu/info/pamphlets/msktc-pressure_relief.asp" },
  "sci-sliding-board-transfer-1": { file: "sci-sliding-board-transfer-1.webp", credit: "Rachelle Chapman, YouTube — sliding-board transfer (video frame)", sourceUrl: "https://www.youtube.com/watch?v=Hzw9cZDhYRo" },
  "sci-standing-frame-1": { file: "sci-standing-frame-1.webp", credit: "Em Quattrocchi, YouTube — EasyStand standing frame (video frame)", sourceUrl: "https://www.youtube.com/watch?v=uaqklouzhik" },
  "sci-tenodesis-grasp-1": { file: "sci-tenodesis-grasp-1.webp", credit: "plastische_erasmusmc, Wikimedia Commons — CC BY-SA 3.0 (Tenodese hand + Wrist related tenodesis effect, second step)", sourceUrl: "https://commons.wikimedia.org/wiki/File:Tenodese_hand.JPG" },
  "sci-assisted-cough-1": { file: "sci-assisted-cough-1.webp", credit: "© 2022 Healthwise — via HealthLinkBC, Spinal cord injury: abdominal thrust assist (assisted cough)", sourceUrl: "https://www.healthlinkbc.ca/healthwise/spinal-cord-injury-abdominal-thrust-assist-assisted-cough" },
  "sci-kafo-walking-1": { file: "sci-kafo-walking-1.webp", credit: "ray3578, Wikimedia Commons — CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Crutches_and_swinging_leg_braces.jpg" },
  "sci-bwstt-locomotor-1": { file: "sci-bwstt-locomotor-1.webp", credit: "© St. Joseph's Health Care London – Parkwood Institute — Locomotor Training Program brochure, p. 1", sourceUrl: "https://sjhc.london.on.ca/media/10317/download" },
  "sci-autonomic-dysreflexia-1": { file: "sci-autonomic-dysreflexia-1.webp", credit: "© Christopher & Dana Reeve Foundation with Kennedy Krieger ICSCI — Autonomic Dysreflexia card (Arabic), p. 1", sourceUrl: "https://www.christopherreeve.org/wp-content/uploads/2024/04/ArabicADGuide-web.pdf" },
  "sci-long-sitting-bed-mobility-1": { file: "sci-long-sitting-bed-mobility-1.webp", credit: "Wheelchair Wellness, YouTube — long sitting in bed (video frame)", sourceUrl: "https://www.youtube.com/watch?v=jmhJlVkT584" },
  "sci-wheelchair-prayer-1": { file: "sci-wheelchair-prayer-1.webp", credit: "Indonesiagood, Wikimedia Commons — CC BY 4.0 (cropped)", sourceUrl: "https://commons.wikimedia.org/wiki/File:Masjid_Nabawi_(Umroh_Ramadhan_2023)-19.jpg" },
  //  **صورُ «هشاشة العظام والوقاية من السقوط» التسع** (٢٠٢٦-١٠-٢٣، §4.ey — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه): رسما برنامج أوتاغو (ACC نيوزيلندا)،
  //  ومنشوراتُ Covenant Health وMelioGuide ومؤسّسة الهشاشة الدولية وأوستيوبوروسيس كندا ووزارة الصحّة الماليزية ومنشورُ سوفك (NHS)، وويكيميديا للتاي تشي —
  //  بقرار المالك: الاستعمالُ خاصّ فلا تُردّ صورةٌ لحقوقها، والمصدرُ يُكتب. (صورتا «رفع الصدر» و«الصلاة على الكرسيّ» لغير كبير السنّ — لا أقربَ منهما.)
  "osteo-tandem-walk-1": { file: "osteo-tandem-walk-1.webp", credit: "© ACC (New Zealand) — Otago Exercise Programme booklet (ACC1162), p. 58 'Heel toe walking – hold support'", sourceUrl: "https://regionvasterbotten.se/VLL/Filer/Otago-Exercise-Programme2.pdf" },
  "osteo-backward-turn-walk-1": { file: "osteo-backward-turn-walk-1.webp", credit: "© ACC (New Zealand) — Otago Exercise Programme booklet (ACC1162), p. 52 'Backwards walking – hold support'", sourceUrl: "https://regionvasterbotten.se/VLL/Filer/Otago-Exercise-Programme2.pdf" },
  "osteo-back-extension-1": { file: "osteo-back-extension-1.webp", credit: "Misericordia Hospital – Covenant Health, Osteoporosis exercises: spinal extensors (2021), p. 6 — image © Wibbi", sourceUrl: "https://covenanthealth.ca/sites/default/files/2024-08/osteoporosis-spinal-extensor-exercises.pdf" },
  "osteo-heel-drop-impact-1": { file: "osteo-heel-drop-impact-1.webp", credit: "© MelioGuide (Margaret Martin) — Heel drop exercise (two photos side by side)", sourceUrl: "https://melioguide.com/osteoporosis-exercises/heel-drop-exercise/" },
  "osteo-tai-chi-1": { file: "osteo-tai-chi-1.webp", credit: "Tom Thai (Flickr), Wikimedia Commons — CC BY 2.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Elderly_Shanghai_woman_practices_tai_chi.jpg" },
  "osteo-home-hazard-footwear-1": { file: "osteo-home-hazard-footwear-1.webp", credit: "International Osteoporosis Foundation — How to fall-proof your home (infographic, cropped)", sourceUrl: "https://www.osteoporosis.foundation/educational-hub/files/fall-proofing-your-home" },
  "osteo-safe-bending-lifting-1": { file: "osteo-safe-bending-lifting-1.webp", credit: "© Osteoporosis Canada — Too Fit To Fracture: Managing Osteoporosis through Exercise (2016), booklet p. 29 'Bending'", sourceUrl: "https://www.bonehealthandosteoporosis.org/wp-content/uploads/2016/09/OC-Too-Fit-To-Fracture-Osteo-Exercise-Book.pdf" },
  "osteo-prayer-safe-1": { file: "osteo-prayer-safe-1.webp", credit: "Unit Hal Ehwal Islam, Hospital Tengku Ampuan Rahimah Klang (Ministry of Health Malaysia) — Solat di atas kerusi (2009), p. 2", sourceUrl: "https://jknselangor.moh.gov.my/htar/images/pdf/UHEI/solat_atas_kerusi_lelaki2009.pdf" },
  "osteo-floor-rise-1": { file: "osteo-floor-rise-1.webp", credit: "Suffolk PCT, West Suffolk and Ipswich Hospital NHS Trusts — What to do if you fall (2008), illustrations Halcyon Mandelstam, p. 3", sourceUrl: "https://www.ageuk.org.uk/bp-assets/globalassets/north-staffordshire/resources/pdf-what-to-do-if-i-fall--leaflet.pdf" },
  //  **صورُ «الجنف عند المراهقين» العشر** (٢٠٢٦-١٠-٢٤، §4.fa — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه): أشكالُ بحثين في PLOS One (Lu 2025 · Meng 2026)
  //  ومراجعةُ مدارس التمرين (Berdishevsky 2016) برخصة CC BY، ومنشورُ مستشفى الأطفال الملكيّ في ملبورن، ورمزا Tawasol للصلاة، ومنشورا NHS للجلوس والحقيبة —
  //  بقرار المالك: الاستعمالُ خاصّ فلا تُردّ صورةٌ لحقوقها، والمصدرُ يُكتب.
  "scol-3d-autocorrection-mirror-1": { file: "scol-3d-autocorrection-mirror-1.webp", credit: "Lu et al., PLOS One 2025, Fig 1 D–E (cropped, panel letters removed) — © 2025 Lu et al, CC BY", sourceUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0334713" },
  "scol-rotational-angular-breathing-1": { file: "scol-rotational-angular-breathing-1.webp", credit: "Berdishevsky et al., Scoliosis Spinal Disord 2016 (PMC4973373) — © The Author(s) 2016, CC BY 4.0, Fig 85 (cropped)", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4973373/" },
  "scol-side-lying-corrective-1": { file: "scol-side-lying-corrective-1.webp", credit: "Meng et al., PLOS One 2026, Fig 2C (cropped) — © 2026 Meng et al, CC BY", sourceUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0340585" },
  "scol-side-shift-1": { file: "scol-side-shift-1.webp", credit: "Berdishevsky et al., Scoliosis Spinal Disord 2016 (PMC4973373) — © The Author(s) 2016, CC BY 4.0, Fig 74 (English label removed)", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4973373/" },
  "scol-stabilised-correction-arm-lift-1": { file: "scol-stabilised-correction-arm-lift-1.webp", credit: "Lu et al., PLOS One 2025, Fig 4C left (cropped; face pixelated by the publisher) — © 2025 Lu et al, CC BY", sourceUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0334713" },
  "scol-in-brace-breathing-shift-1": { file: "scol-in-brace-breathing-shift-1.webp", credit: "Berdishevsky et al., Scoliosis Spinal Disord 2016 (PMC4973373) — © The Author(s) 2016, CC BY 4.0, Fig 84", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4973373/" },
  "scol-brace-day-heat-skin-1": { file: "scol-brace-day-heat-skin-1.webp", credit: "© The Royal Children's Hospital Melbourne, Orthotic Prosthetic Unit — Scoliosis Bracing: Cheneau information sheet (2025), p. 1 (cropped)", sourceUrl: "https://www.rch.org.au/uploadedFiles/Main/Content/orthotic/Scoliosis%20Bracing%20Cheneau%20information%20sheet%20with%20photos%202025.pdf" },
  "scol-prayer-with-brace-1": { file: "scol-prayer-with-brace-1.webp", credit: "Tawasol Symbols (Mada), Global Symbols 7643 and 7986 — CC BY-SA 4.0 (two symbols side by side)", sourceUrl: "https://globalsymbols.com/symbolsets/tawasol/symbols/7986" },
  "scol-corrected-sitting-school-1": { file: "scol-corrected-sitting-school-1.webp", credit: "Solihull Children's Occupational Therapy Service, University Hospitals Birmingham NHS FT — Getting seating right (PI22/2496/01, 2022), labels removed", sourceUrl: "https://childrenscommunitytherapies.uhb.nhs.uk/wp-content/uploads/PI22_2496_01-Getting-seating-right.pdf" },
  "scol-school-bag-carry-1": { file: "scol-school-bag-carry-1.webp", credit: "East London NHS Foundation Trust, Children's Physiotherapy — Posture leaflet, p. 2", sourceUrl: "https://www.elft.nhs.uk/sites/default/files/2024-09/posture%20leaflet%20pdf.pdf" },
  //  **صورُ «التهاب المفاصل الروماتويدي» العشر** (٢٠٢٦-١٠-٢٤، §4.ez — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه): منشوراتُ NHS (دونكاستر وبرادفورد والمستشفى الملكيّ الوطنيّ
  //  للعظام وغيتسهيد وإيست ساسكس وأكسفورد) وVersus Arthritis وArthritis UK وكتيّبُ كيل وسالفورد لحماية المفاصل وCreakyJoints ووزارةُ الصحّة الماليزية وويكيميديا وPexels —
  //  وأربعٌ منها تجمع صورتين أو ثلاثاً من مصادرها (لا صورةَ واحدة تُظهر البطاقةَ كلَّها). بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "ra-hand-strengthening-1": { file: "ra-hand-strengthening-1.webp", credit: "Doncaster & Bassetlaw Teaching Hospitals NHS FT — Therapeutic putty (WPR46470), p. 2 + © AHC Aurora BayCare — Gross intrinsic action (composite)", sourceUrl: "https://www.dbth.nhs.uk/wp-content/uploads/2019/03/WPR46470-Therapeutic-Putty.pdf" },
  "ra-joint-protection-hand-1": { file: "ra-joint-protection-hand-1.webp", credit: "© Keele University and University of Salford 2008 — Joint protection workbook (hosted by RACGP HANDI), pp. 23 and 33", sourceUrl: "https://www.racgp.org.au/FSDEDEV/media/documents/Clinical%20Resources/HANDI/Joint-protection-workbook-for-patients.pdf" },
  "ra-energy-pacing-1": { file: "ra-energy-pacing-1.webp", credit: "Royal National Orthopaedic Hospital NHS Trust — Pacing (patient information guide), without and with pacing charts", sourceUrl: "https://www.rnoh.nhs.uk/patients-and-visitors/patient-information-guides/pacing" },
  "ra-flare-gentle-routine-1": { file: "ra-flare-gentle-routine-1.webp", credit: "© CreakyJoints (Global Healthy Living Foundation) — Cold therapy for arthritis + © Bradford Teaching Hospitals NHS FT — PRICE leaflet, hand exercise (composite)", sourceUrl: "https://creakyjoints.org/living-with-arthritis/cold-therapy-for-arthritis/" },
  "ra-morning-stiffness-routine-1": { file: "ra-morning-stiffness-routine-1.webp", credit: "Oxford University Hospitals NHS FT / Moving Medicine — Bed exercise programme, p. 5 'Ankle strength when lying'", sourceUrl: "https://australia.movingmedicine.ac.uk/wp-content/uploads/2020/04/Bed-exercise-programme.pdf" },
  "ra-wrist-working-splint-1": { file: "ra-wrist-working-splint-1.webp", credit: "© Versus Arthritis 2022 — booklet VA2055, p. 7 (hosted by Wrightington, Wigan and Leigh NHS FT)", sourceUrl: "https://wwl.nhs.uk/media/.leaflets/664b495a9f3152.82770533.pdf" },
  "ra-foot-care-orthoses-1": { file: "ra-foot-care-orthoses-1.webp", credit: "Gateshead Health NHS FT — RA and the feet, p. 2 + Menz et al., J Foot Ankle Res 2022, Fig 2 (CC BY 4.0, shoe reproduced with permission from Global Footcare) + © East Sussex Healthcare NHS Trust — insoles leaflet 0860 (composite)", sourceUrl: "https://www.gatesheadhealth.nhs.uk/wp-content/uploads/2023/09/Rheumatoid-Arthritis-and-the-Feet.pdf" },
  "ra-prayer-joint-protection-1": { file: "ra-prayer-joint-protection-1.webp", credit: "Michael Burrows, Pexels (Pexels License, cropped) + Unit Hal Ehwal Islam, Hospital Tengku Ampuan Rahimah Klang (Ministry of Health Malaysia) — Solat di atas kerusi (2009), photo 8 (composite)", sourceUrl: "https://www.pexels.com/photo/man-in-white-thobe-bowing-down-on-red-and-blue-rug-7129731/" },
  "ra-interval-cycling-1": { file: "ra-interval-cycling-1.webp", credit: "VideoPlasty, Wikimedia Commons — CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Man_on_an_Exercise_Bike_Cartoon.svg" },
  "ra-neck-safe-mobility-1": { file: "ra-neck-safe-mobility-1.webp", credit: "Arthritis UK — Neck pain leaflet, exercise 4 'Neck turn', p. 2", sourceUrl: "https://www.arthritis-uk.org/media/5uzbryge/a4-neck-pain-leaflet_digital.pdf" },
  //  **صورُ «الوذمة اللمفية» العشر** (٢٠٢٦-١٠-٢٤، §4.fb — بحث عنها المساعد ورآها كلَّها، وDrive فُحص ولا جديدَ فيه): منشوراتُ NHS (واي فالي وسانت جورج وشبكة الوذمة في
  //  إيرلندا الشمالية) وشبكةُ جامعة تورنتو الصحّية ومستشفى ميديكلينيك دبي وNIDDK الأمريكيّ وLiveUp الأستراليّ وTactile Medical؛ وصورةُ «الوضوء» بديلٌ: غطاءٌ مانعٌ للماء
  //  على الذراع (لا صورةَ تُظهر الوضوءَ بذراعٍ مضمَّدة). بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "lymph-decongestive-arm-sequence-1": { file: "lymph-decongestive-arm-sequence-1.webp", credit: "Wye Valley NHS Trust — Exercises for arm lymphoedema, patient information leaflet (October 2023)", sourceUrl: "https://www.wyevalley.nhs.uk/media/1425978/lymphoedema-upper-arms-exercise-final-060624.pdf" },
  "lymph-self-drainage-1": { file: "lymph-self-drainage-1.webp", credit: "© 2026 Tactile Medical — Self manual lymphatic drainage resources", sourceUrl: "https://tactilemedical.com/resource-hub/resources/self-manual-lymphatic-drainage-mld-resources/" },
  "lymph-self-bandaging-arm-1": { file: "lymph-self-bandaging-arm-1.webp", credit: "© 2026 University Health Network, Toronto — How to self-bandage your hand(s) and arm(s) to reduce lymphedema (Form D-8605)", sourceUrl: "https://www.uhn.ca/PatientsFamilies/Health_Information/Health_Topics/Documents/Self-bandage_hands_arms_to_reduce_lymphedema.pdf" },
  "lymph-garment-donning-1": { file: "lymph-garment-donning-1.webp", credit: "St George's University Hospitals NHS FT — Lymphoedema compression garments (DER_LGAR_01, 2025), p. 4; images Juzo UK Limited", sourceUrl: "https://www.stgeorges.nhs.uk/wp-content/uploads/2025/07/DER_LGAR.pdf" },
  "lymph-skin-care-check-1": { file: "lymph-skin-care-check-1.webp", credit: "NIDDK (US National Institutes of Health) — Diabetes and foot problems (two photos side by side)", sourceUrl: "https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/foot-problems" },
  "lymph-pal-progressive-weights-1": { file: "lymph-pal-progressive-weights-1.webp", credit: "LiveUp (Australian Government funded) — Fitness for All: how to do biceps curls", sourceUrl: "https://www.liveup.org.au/media/F4A_BICEPS.pdf" },
  "lymph-axillary-cord-stretch-1": { file: "lymph-axillary-cord-stretch-1.webp", credit: "Mediclinic City Hospital, Dubai — Axillary web syndrome / cording exercises, p. 4 'Self-tissue stretching'", sourceUrl: "https://mediclinic.ae/content/dam/mc-me-corporate/downloads/pdf/Axillary%20web%20syndrome%20-%20cording%20exercise.pdf" },
  "lymph-chest-scar-mobilisation-1": { file: "lymph-chest-scar-mobilisation-1.webp", credit: "© 2023 University Health Network, Toronto — How to do self lymphatic massage on your upper body (Form D-5804), p. 7 'Massage your scar'", sourceUrl: "https://www.uhn.ca/PatientsFamilies/Health_Information/Health_Topics/Documents/How_to_Do_Self_Lymphatic_Massage_Upper_Body_One_Side.pdf" },
  "lymph-leg-decongestive-sequence-1": { file: "lymph-leg-decongestive-sequence-1.webp", credit: "HSC / Lymphoedema Network Northern Ireland — Exercise for lymphoedema of the leg(s) (2011), hosted by the South Eastern HSC Trust", sourceUrl: "https://setrust.hscni.net/wp-content/uploads/2020/08/Leg-Exercises-for-Lymphoedema.pdf" },
  "lymph-wudu-prayer-compression-1": { file: "lymph-wudu-prayer-compression-1.webp", credit: "Millercare — Aidapt waterproof cast protector, adult long arm (product photo)", sourceUrl: "https://www.millercare.co.uk/products/aidapt-waterproof-cast-protector-adult-long-arm-vm200l" },
  //  **صورُ «الألم العضليّ الليفيّ» التسع** (٢٠٢٦-١٠-٢٤، §4.fc — بحث عنها المساعد ورآها كلَّها): منظّمةُ الصحّة في جنوب تسمانيا (كتيّبٌ تستضيفه NHS غلوسترشير) وكايزر بيرماننتي
  //  ووكالةُ الصحّة العامّة في إيرلندا الشمالية وبحثٌ برخصة CC BY وLive Well with Pain وMove Physiotherapy والصحّةُ العامّة الإنكليزية وويكيميديا وMy Salah Mat ورموزُ Tawasol
  //  ومنظّمةُ الصحّة العالمية؛ و«خطّةُ النوبة» تطابق جزئياً (لا صورةَ مصوَّرة لخطّةٍ بألوان الإشارة). بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "fm-pain-neuroscience-education-1": { file: "fm-pain-neuroscience-education-1.webp", credit: "© 2014 Tasmanian Health Organisation South — persistent pain booklet (permission to copy with acknowledgement), hosted by Gloucestershire Hospitals NHS FT", sourceUrl: "https://www.gloshospitals.nhs.uk/documents/6106/tazzypersistentpainbooklet.pdf" },
  "fm-start-low-aerobic-1": { file: "fm-start-low-aerobic-1.webp", credit: "Kirk, Wikimedia Commons (public domain) + Kaiser Permanente Georgia, cardiac rehabilitation booklet — rate of perceived exertion (Borg scale, © Gunnar Borg); red outline added (composite)", sourceUrl: "https://georgia.kaiserpermanente.org/cardiac/wp-content/uploads/sites/9/2026/04/4408094649_HBCRBooklet_rateofperceivedexertion.pdf" },
  "fm-lifestyle-steps-1": { file: "fm-lifestyle-steps-1.webp", credit: "HSC Public Health Agency, Northern Ireland — Step by step booklet (2024), pp. 10 and 4 (composite)", sourceUrl: "https://www.publichealth.hscni.net/sites/default/files/2024-02/Step_By_Step_Booklet_02_24.pdf" },
  "fm-progressive-resistance-circuit-1": { file: "fm-progressive-resistance-circuit-1.webp", credit: "Matte et al., JMIR Res Protoc 2026, Fig 2 'Illustration of resistance exercises' — CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13536984/" },
  "fm-time-contingent-activity-1": { file: "fm-time-contingent-activity-1.webp", credit: "© 2026 Move Physiotherapy & Fitness — boom-bust vs pacing chart + © Live Well with Pain 2023 — pacing booklet, 'My daily pacing plan' (one example row kept) (composite)", sourceUrl: "https://livewellwithpain.co.uk/resources-for-people-with-pain/ten-footsteps-to-living-well-with-pain/pacing/" },
  "fm-flare-plan-1": { file: "fm-flare-plan-1.webp", credit: "© Live Well with Pain 2023 — pacing booklet, p. 8 'Effort scale' + Public Health England / Sport England — Active at Home booklet, p. 7 'Chair marching' (illustrations Nifty Fox Creative) (composite)", sourceUrl: "https://livewellwithpain.co.uk/resources-for-people-with-pain/ten-footsteps-to-living-well-with-pain/pacing/" },
  "fm-sleep-routine-1": { file: "fm-sleep-routine-1.webp", credit: "U.S. Army (Rodney Jackson), via Wikimedia Commons — public domain (cropped: the alcohol panel and two text lines removed)", sourceUrl: "https://commons.wikimedia.org/wiki/File:The_Power_of_Sleep_Hygiene-_Why_a_Good_Night%27s_Rest_Matters_(9259797).jpg" },
  "fm-prayer-full-movement-1": { file: "fm-prayer-full-movement-1.webp", credit: "© 2026 My Salah Mat — padded prayer mats (blog photo) + Tawasol Symbols (Mada), Global Symbols 7687 — CC BY-SA 4.0 (composite)", sourceUrl: "https://www.mysalahmat.com/blogs/news/how-can-padded-prayer-mats-help-you" },
  "fm-heat-power-cut-routine-1": { file: "fm-heat-power-cut-routine-1.webp", credit: "© 2026 WHO — heatwave infographic 'Try to keep out of heat' + Public Health England / Sport England — Active at Home booklet (composite)", sourceUrl: "https://www.who.int/multi-media/details/throughout-a-heatwave-try-to-keep-out-of-heat" },
  //  **صورُ «التهاب الفقار المحوريّ» العشر** (٢٠٢٦-١٠-٢٤، §4.fd — بحث عنها المساعد ورآها كلَّها): منشورُ مستشفى رويال بيركشير للتمارين وأبحاثٌ برخصة CC BY ورسومُ Everkinetic
  //  ورموزُ ARASAAC وTawasol وSclera ومنشورُ وزارة الصحّة الماليزية — والمجمَّعةُ تُقرأ من اليمين إلى اليسار؛ و«إنذارُ الكسر» بطاقةٌ جُمعت من أربعة رموز. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "axspa-chest-expansion-breathing-1": { file: "axspa-chest-expansion-breathing-1.webp", credit: "Royal Berkshire NHS FT — Exercises for axial spondyloarthritis (axSpA), p. 5 + Okada et al., JMA J 2026, Fig 2a — CC BY 4.0 (composite)", sourceUrl: "https://www.royalberkshire.nhs.uk/leaflets/exercises-for-axial-spondyloarthritis-axspa" },
  "axspa-wall-posture-check-1": { file: "axspa-wall-posture-check-1.webp", credit: "Koelé et al., Arch Osteoporos 2026, Fig 1B — © The Author(s) 2026, CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12783319/" },
  "axspa-thoracic-rotation-open-book-1": { file: "axspa-thoracic-rotation-open-book-1.webp", credit: "Royal Berkshire NHS FT — Exercises for axial spondyloarthritis (axSpA), p. 6 'Arm opening'", sourceUrl: "https://www.royalberkshire.nhs.uk/leaflets/exercises-for-axial-spondyloarthritis-axspa" },
  "axspa-lumbar-side-flexion-1": { file: "axspa-lumbar-side-flexion-1.webp", credit: "Royal Berkshire NHS FT — Exercises for axial spondyloarthritis (axSpA), p. 9", sourceUrl: "https://www.royalberkshire.nhs.uk/leaflets/exercises-for-axial-spondyloarthritis-axspa" },
  "axspa-prone-lying-routine-1": { file: "axspa-prone-lying-routine-1.webp", credit: "Royal Berkshire NHS FT — Exercises for axial spondyloarthritis (axSpA), p. 10", sourceUrl: "https://www.royalberkshire.nhs.uk/leaflets/exercises-for-axial-spondyloarthritis-axspa" },
  "axspa-hiit-4x4-intervals-1": { file: "axspa-hiit-4x4-intervals-1.webp", credit: "Spencer et al., Physiol Rep 2025, Fig 1(b) — © 2025 The Author(s), CC BY 4.0 (three syringe icons removed) + ARASAAC 23227 (Government of Aragon, Sergio Palao) — CC BY-NC-SA 4.0 (composite)", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12099066/" },
  "axspa-strength-circuit-1": { file: "axspa-strength-circuit-1.webp", credit: "Everkinetic, Wikimedia Commons — CC BY-SA 3.0 (five drawings) + Pk0001, Wikimedia Commons — Plank exercise, CC BY-SA 4.0 (composite)", sourceUrl: "https://commons.wikimedia.org/wiki/File:Plank_exercise.svg" },
  "axspa-flare-day-routine-1": { file: "axspa-flare-day-routine-1.webp", credit: "Royal Berkshire NHS FT — Exercises for axSpA (photos) + ARASAAC 16266 — CC BY-NC-SA 4.0 + Sclera 34610 — CC BY-NC 4.0 (composite)", sourceUrl: "https://www.royalberkshire.nhs.uk/leaflets/exercises-for-axial-spondyloarthritis-axspa" },
  "axspa-prayer-fused-spine-1": { file: "axspa-prayer-fused-spine-1.webp", credit: "Tawasol Symbols (Mada), Global Symbols 7644 and 7984 — CC BY-SA 4.0 + Hospital Tengku Ampuan Rahimah Klang (Ministry of Health Malaysia) — Solat di atas kerusi (2009), photo 6 (composite)", sourceUrl: "https://globalsymbols.com/symbolsets/tawasol/symbols/7984" },
  "axspa-fracture-warning-1": { file: "axspa-fracture-warning-1.webp", credit: "ARASAAC 44795, 16469, 18043 and 23123 (Government of Aragon, author Sergio Palao) — CC BY-NC-SA 4.0 (assembled into one card)", sourceUrl: "https://globalsymbols.com/symbolsets/arasaac/symbols/44795" },
  //  **صورُ «باركنسون» العشر** (٢٠٢٦-١٠-٢٤، §4.fe — بحث عنها المساعد ورآها كلَّها): جمعيةُ باركنسون في كولومبيا البريطانية ومؤسّسةُ باركنسون الأمريكية وأبحاثٌ برخصة CC BY
  //  وNHS فايف وبرادفورد ولوثيان وكليفلاند كلينك وبرنامجُ GRASP في جامعة كولومبيا البريطانية ورموزُ Tawasol. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "pd-big-amplitude-movements-1": { file: "pd-big-amplitude-movements-1.webp", credit: "© Parkinson Society British Columbia 2021 — Exercise booklet for people with Parkinson's disease (physiotherapist Shelly Yu), 'Movement contrast', p. 27", sourceUrl: "https://parkinson.bc.ca/wp-content/uploads/2024/10/exercise-booklet.pdf" },
  "pd-metronome-cued-walking-1": { file: "pd-metronome-cued-walking-1.webp", credit: "Li et al., Front Neurol 2025, Fig 1 (cropped) + Wall et al., PLoS One 2026, Fig 1(ii) — both CC BY 4.0 (composite)", sourceUrl: "https://www.frontiersin.org/journals/neurology/articles/10.3389/fneur.2025.1561880/full" },
  "pd-freezing-release-strategies-1": { file: "pd-freezing-release-strategies-1.webp", credit: "Beck, Ehgoetz Martens & Almeida, PLoS One 2015, Fig 1 (top-right panel) — © 2015 Beck et al, CC BY 4.0", sourceUrl: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0144986" },
  "pd-arc-turning-narrow-spaces-1": { file: "pd-arc-turning-narrow-spaces-1.webp", credit: "© 2025 Parkinson's Foundation — Fitness Counts, 'Turning tips', p. 38 (English labels replaced by a tick and a cross)", sourceUrl: "https://www.parkinson.org/library/books/fitness-counts" },
  "pd-chair-rise-sequence-1": { file: "pd-chair-rise-sequence-1.webp", credit: "NHS Fife (Fife HSCP Occupational Therapy Working Group) — Chairs for Parkinson's (August 2022), p. 7", sourceUrl: "https://www.nhsfife.org/media/mdlp1b2n/parkinsons-seating-info-booklet-final.pdf" },
  "pd-bed-turning-sequence-1": { file: "pd-bed-turning-sequence-1.webp", credit: "Bradford Teaching Hospitals NHS FT, Neuro Rehab Team — Aiding bed mobility for patients with Parkinson's disease, p. 1 'Knee rolls'", sourceUrl: "https://bradfordhospitals.nhs.uk/wp-content/uploads/2024/03/Bed-mobility-for-parkinsons-patients.pdf" },
  "pd-orthostatic-safe-rising-1": { file: "pd-orthostatic-safe-rising-1.webp", credit: "NHS Lothian (adapted with permission from NHS Greater Glasgow and Clyde) — Dropping blood pressure (orthostatic hypotension) v1.0, pictograms pp. 4–5 (arrows added)", sourceUrl: "https://apps.nhslothian.scot/files/sites/2/Information-for-patients-with-dropping-blood-pressure-Orthostatic-Hypotension-v1.0-1-1.pdf" },
  "pd-prayer-with-parkinsons-1": { file: "pd-prayer-with-parkinsons-1.webp", credit: "Tawasol Symbols (Mada), Global Symbols 7975, 8072 and 7644 — CC BY-SA 4.0 + © 2025 Parkinson's Foundation — Fitness Counts, 'Getting up from a fall', p. 45 (composite)", sourceUrl: "https://globalsymbols.com/symbolsets/tawasol/symbols/7975" },
  "pd-fast-cadence-cycling-1": { file: "pd-fast-cadence-cycling-1.webp", credit: "© 2026 Cleveland Clinic — Consult QD, eight-week cycling intervention for Parkinson's disease (article image)", sourceUrl: "https://consultqd.clevelandclinic.org/eight-week-cycling-intervention-for-parkinsons-disease-leads-to-improved-gait-biomechanics" },
  "pd-home-dexterity-tasks-1": { file: "pd-home-dexterity-tasks-1.webp", credit: "UBC Neurorehabilitation Research Program — Home GRASP participant manual v1.1 (2021), exercises 31, 33 and 26 (composite)", sourceUrl: "https://neurorehab.med.ubc.ca/grasp/" },
  //  **صورُ «الصعر الخلقيّ» التسع** (٢٠٢٦-١٠-٢٤، §4.ff — بحث عنها المساعد ورآها كلَّها): مركزُ تأهيل الأطفال في وينيبيغ (وتمطيطاه لصعرٍ أيمن — يُعكسان للأيسر)
  //  وPathways.org وNICHD «النومُ الآمن»، و«علاماتُ الخطر» بطاقةٌ جُمعت من رموز Noto المفتوحة. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "cmt-passive-rotation-stretch-1": { file: "cmt-passive-rotation-stretch-1.webp", credit: "Rehabilitation Centre for Children, Winnipeg — Right torticollis, combination, younger babies (2019), p. 1 (cropped; for left torticollis the picture is mirrored)", sourceUrl: "https://rccinc.ca/wp-content/uploads/2024/08/Right-Torticollis-combination-younger-babies.pdf" },
  "cmt-lateral-flexion-stretch-1": { file: "cmt-lateral-flexion-stretch-1.webp", credit: "Rehabilitation Centre for Children, Winnipeg — Right torticollis, combination, younger babies (2019), p. 1 (cropped)", sourceUrl: "https://rccinc.ca/wp-content/uploads/2024/08/Right-Torticollis-combination-younger-babies.pdf" },
  "cmt-tummy-time-progression-1": { file: "cmt-tummy-time-progression-1.webp", credit: "© 2026 Pathways Foundation — Tummy time by age infographic (4-month photo)", sourceUrl: "https://pathways.org/topics-of-development/tummy-time/" },
  "cmt-lateral-head-righting-1": { file: "cmt-lateral-head-righting-1.webp", credit: "Rehabilitation Centre for Children, Winnipeg — Right torticollis, combination, older babies, p. 2", sourceUrl: "https://rccinc.ca/wp-content/uploads/2024/08/Right-Torticollis-combination-older-babies.pdf" },
  "cmt-visual-tracking-rotation-1": { file: "cmt-visual-tracking-rotation-1.webp", credit: "© 2026 Pathways Foundation — 4 ways to help prevent positional plagiocephaly and torticollis ('Back tracks')", sourceUrl: "https://pathways.org/4-ways-to-prevent-flat-head-and-torticollis-in-babies" },
  "cmt-carrying-positions-1": { file: "cmt-carrying-positions-1.webp", credit: "© 2026 Pathways Foundation — Why tummy time is important for baby's head and neck strength ('Tummy carry')", sourceUrl: "https://pathways.org/tummy-time-head-neck-strength" },
  "cmt-feeding-sleep-setup-1": { file: "cmt-feeding-sleep-setup-1.webp", credit: "NICHD Safe to Sleep (US National Institutes of Health) — Safe sleep for your baby, NIH Pub. No. 22-HD-5759 (2022) — no copyright restrictions", sourceUrl: "https://www.nichd.nih.gov/publications/product/510" },
  "cmt-rolling-side-lying-play-1": { file: "cmt-rolling-side-lying-play-1.webp", credit: "© 2026 Pathways Foundation — The side lying position, a parenting guide (video thumbnail, logo cropped)", sourceUrl: "https://pathways.org/side-lying-position-for-baby" },
  "cmt-parent-watch-signs-1": { file: "cmt-parent-watch-signs-1.webp", credit: "Noto Emoji (Google), v2.047 — Apache License 2.0 (icons assembled into one card)", sourceUrl: "https://github.com/googlefonts/noto-emoji" },
  //  **صورُ «شلل الضفيرة العضدية الولاديّ» العشر** (٢٠٢٦-١٠-٢٤، §4.fg — بحث عنها المساعد ورآها كلَّها): كتيّبُ مستشفى الأطفال الملكيّ في ملبورن وNHS لوثيان
  //  وبرنامجُ الضفيرة في مستشفى أطفال كولومبيا البريطانية وبحثا Feretti 2026 وOp de Coul 2022؛ و«الحملُ واللبس» حملُ المولود وحده. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "bpbi-parent-prom-er-adduction-1": { file: "bpbi-parent-prom-er-adduction-1.webp", credit: "Royal Children's Hospital Melbourne (Physiotherapy, Occupational Therapy and Plastic Surgery) — Understanding brachial plexus palsy, p. 15 (two panels joined)", sourceUrl: "https://www.rch.org.au/kidsinfo/fact_sheets/Obstetric_brachial_plexus_palsy_Erbs_palsy" },
  "bpbi-gentle-handling-dressing-1": { file: "bpbi-gentle-handling-dressing-1.webp", credit: "NHS Lothian Paediatric Physiotherapy — Erb's palsy newborn advice v3.0, p. 1 photo", sourceUrl: "https://policyonline.nhslothian.scot/wp-content/uploads/2023/03/Erbs_Palsy.pdf" },
  "bpbi-positioning-play-sensory-1": { file: "bpbi-positioning-play-sensory-1.webp", credit: "Royal Children's Hospital Melbourne — Understanding brachial plexus palsy, pp. 17–18 (two panels joined)", sourceUrl: "https://www.rch.org.au/kidsinfo/fact_sheets/Obstetric_brachial_plexus_palsy_Erbs_palsy" },
  "bpbi-sup-er-orthosis-routine-1": { file: "bpbi-sup-er-orthosis-routine-1.webp", credit: "© 2025 BC Children's Hospital Research Institute, Brachial Plexus Program — Sup-ER splint application, parent handout, Figure 3", sourceUrl: "https://www.bcchr.ca/brachial-plexus/treatment/sup-er-splint/" },
  "bpbi-hand-to-mouth-elbow-flexion-1": { file: "bpbi-hand-to-mouth-elbow-flexion-1.webp", credit: "Feretti et al., J Hand Ther 2026, Fig 5A — © 2025 Published by Elsevier Inc. (cropped)", sourceUrl: "https://doi.org/10.1016/j.jht.2025.12.001" },
  "bpbi-active-shoulder-er-abduction-play-1": { file: "bpbi-active-shoulder-er-abduction-play-1.webp", credit: "Royal Children's Hospital Melbourne — Understanding brachial plexus palsy, p. 18", sourceUrl: "https://www.rch.org.au/kidsinfo/fact_sheets/Obstetric_brachial_plexus_palsy_Erbs_palsy" },
  "bpbi-forearm-supination-play-1": { file: "bpbi-forearm-supination-play-1.webp", credit: "Feretti et al., J Hand Ther 2026, Fig 5B — © 2025 Published by Elsevier Inc. (cropped)", sourceUrl: "https://doi.org/10.1016/j.jht.2025.12.001" },
  "bpbi-infant-weight-bearing-play-1": { file: "bpbi-infant-weight-bearing-play-1.webp", credit: "Royal Children's Hospital Melbourne — Understanding brachial plexus palsy, p. 17", sourceUrl: "https://www.rch.org.au/kidsinfo/fact_sheets/Obstetric_brachial_plexus_palsy_Erbs_palsy" },
  "bpbi-elbow-extension-night-orthosis-1": { file: "bpbi-elbow-extension-night-orthosis-1.webp", credit: "Op de Coul et al., Clin Rehabil 2022, Fig 3 'Dynamic orthosis' (Leiden University Medical Center) — © The Author(s) 2022, CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9676414/" },
  "bpbi-post-op-staged-rehab-1": { file: "bpbi-post-op-staged-rehab-1.webp", credit: "Feretti et al., J Hand Ther 2026, Fig 2 — © 2025 Published by Elsevier Inc.", sourceUrl: "https://doi.org/10.1016/j.jht.2025.12.001" },
  //  **صورُ «التهاب المفاصل اليفعيّ» العشر** (٢٠٢٦-١٠-٢٤، §4.fh — بحث عنها المساعد ورآها كلَّها): Oxford Health وشيروود فورست ويورك وNHS Grampian وSickKids وبحثٌ برخصة CC BY
  //  وFlickr برخصة CC BY 2.0 ورموزُ ARASAAC — والفكُّ والركبةُ والنعلُ تطابق جزئياً. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "jia-jaw-mobility-home-1": { file: "jia-jaw-mobility-home-1.webp", credit: "Huhtanen et al., Acta Odontol Scand 2024, Fig 1 'Measurement procedure of MIO' — © 2024 The Author(s), CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11707685/" },
  "jia-play-rom-morning-routine-1": { file: "jia-play-rom-morning-routine-1.webp", credit: "Oxford Health NHS FT, Children's Community Physiotherapy — Core strength level 1 (composite)", sourceUrl: "https://oxfordhealth.nhs.uk/cit/12-weeks/gross-motor-skills/" },
  "jia-knee-extension-night-splint-1": { file: "jia-knee-extension-night-splint-1.webp", credit: "Sherwood Forest Hospitals NHS FT — Gaiter fitting, PIL202509-01-GF (step labels cropped)", sourceUrl: "https://www.sfh-tr.nhs.uk/media/zlbjkgat/pil202509-01-gf-gaiter-fitting.pdf" },
  "jia-resting-wrist-hand-splint-1": { file: "jia-resting-wrist-hand-splint-1.webp", credit: "© 2024 York and Scarborough Teaching Hospitals NHS FT — PIL1479 v2 + © AboutKidsHealth (SickKids) — Occupational therapy for JIA (composite)", sourceUrl: "https://www.aboutkidshealth.ca/occupational-therapy-for-juvenile-idiopathic-arthritis-jia" },
  "jia-foot-orthoses-shoe-raise-1": { file: "jia-foot-orthoses-shoe-raise-1.webp", credit: "NHS Grampian Podiatry — Advice for wearing insoles, CGD 180422 v2 (composite)", sourceUrl: "https://www.nhsgrampian.org/globalassets/foidocument/foi-public-documents1---all-documents/insoles-pil.pdf" },
  "jia-pilates-mat-sequence-1": { file: "jia-pilates-mat-sequence-1.webp", credit: "Oxford Health NHS FT, Children's Community Physiotherapy — Core strength levels 1, 2 and 3 (composite)", sourceUrl: "https://oxfordhealth.nhs.uk/cit/12-weeks/gross-motor-skills/" },
  "jia-balance-proprioception-circuit-1": { file: "jia-balance-proprioception-circuit-1.webp", credit: "Oxford Health NHS FT, Children's Community Physiotherapy — Balance level 1 (composite)", sourceUrl: "https://oxfordhealth.nhs.uk/wp-content/uploads/sites/22/2023/10/Balance-Level-1-Leaflet-with-pics-2-3.pdf" },
  "jia-cardio-karate-dance-1": { file: "jia-cardio-karate-dance-1.webp", credit: "USAG-Humphreys, Flickr — Pyeongtaek students at summer school — CC BY 2.0 (cropped)", sourceUrl: "https://www.flickr.com/photos/31687107@N07/6074474687" },
  "jia-jump-rope-bone-loading-1": { file: "jia-jump-rope-bone-loading-1.webp", credit: "Tim Pierce, Flickr — jump rope — CC BY 2.0", sourceUrl: "https://www.flickr.com/photos/48439369@N00/3601357375" },
  "jia-prayer-floor-sitting-squat-toilet-1": { file: "jia-prayer-floor-sitting-squat-toilet-1.webp", credit: "ARASAAC 36492, 35031, 24372 and 15905 (Government of Aragon, author Sergio Palao) — CC BY-NC-SA 4.0 (composite)", sourceUrl: "https://arasaac.org/pictograms/en/36492" },
  //  **صورُ «ما بعد إصلاح الكفّة المدوّرة» السبع** (٢٠٢٦-١٠-٢٤، §4.fi — بحث عنها المساعد ورآها كلَّها): NHS لوثيان وشيروود فورست ورايتنغتون وويغان وكالدرديل وهدرزفيلد
  //  وساوث تيز ومستشفى تنكو أمبوان رحيمة في ماليزيا ورمزُ Tawasol وويكيميديا والهيئةُ البريطانية للصحّة والسلامة — و«الوضوء مع المعلاق» تنتظر المالك. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "rcr-sling-wear-and-removal-1": { file: "rcr-sling-wear-and-removal-1.webp", credit: "NHS Lothian (Edinburgh Orthopaedics) — Use of a Shoulder Sling, patient information sheet (2025), four step photos", sourceUrl: "https://policyonline.nhslothian.scot/wp-content/uploads/2025/05/Use-of-A-Shoulder-Sling.pdf" },
  "rcr-sleep-positioning-1": { file: "rcr-sleep-positioning-1.webp", credit: "NHS Lothian — Use of a Shoulder Sling (2025), p. 4 + Sherwood Forest Hospitals NHS FT — Rotator cuff repair operation, PIL202402-05-RCRO (2024), p. 6", sourceUrl: "https://www.sfh-tr.nhs.uk/media/pvyhoywr/pil202402-05-rcro-rotator-cuff-operation.pdf" },
  "rcr-assisted-passive-rom-1": { file: "rcr-assisted-passive-rom-1.webp", credit: "© Wrightington, Wigan and Leigh Teaching Hospitals NHS FT, all rights reserved — patient leaflet CM 317 (two photos)", sourceUrl: "https://www.wwl.nhs.uk/patient-information-leaflets" },
  "rcr-active-elevation-supine-to-upright-1": { file: "rcr-active-elevation-supine-to-upright-1.webp", credit: "Calderdale and Huddersfield NHS FT — Anterior Deltoid Programme, csph0163 (four photos)", sourceUrl: "https://plr.cht.nhs.uk/download/1143/Anterior%20Deltoid%20Programme%20A4" },
  "rcr-closed-chain-weight-shift-1": { file: "rcr-closed-chain-weight-shift-1.webp", credit: "Calderdale and Huddersfield NHS FT — Anterior Deltoid Programme, csph0163, p. 3 + © 2026 South Tees Hospitals NHS FT — STW0078 and STW0079", sourceUrl: "https://www.southtees.nhs.uk/resources/shoulder-loading-against-a-wall/" },
  "rcr-prayer-staged-return-1": { file: "rcr-prayer-staged-return-1.webp", credit: "Hospital Tengku Ampuan Rahimah Klang, Ministry of Health Malaysia (2009) + Tawasol symbol 7984 (Mada) — CC BY-SA 4.0 + Pharouqenr, Wikimedia Commons — CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Muslim_Performing_Suj%C5%ABd_(Prostration)_in_Prayer_During_Ramadan.jpg" },
  "rcr-graded-lift-and-carry-1": { file: "rcr-graded-lift-and-carry-1.webp", credit: "Health and Safety Executive (UK) — Good handling technique — Open Government Licence v3.0", sourceUrl: "https://www.hse.gov.uk/msd/manual-handling/good-handling-technique.htm" },
  //  **صورُ «اعتلال وتر العرقوب» التسع** (٢٠٢٦-١٠-٢٤، §4.fk — بحث عنها المساعد ورآها كلَّها): Physitrack وتجربة HEALTHY برخصة CC BY ومستشفى باث الملكيّ وويكيميديا
  //  وكتيّبُ تجربة Pringels ورموزُ ARASAAC وTawasol — ورافعةُ الكعب وحدها بلا حذاء. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "ach-isometric-calf-hold-1": { file: "ach-isometric-calf-hold-1.webp", credit: "© Physitrack PLC, all rights reserved — Isometric single-leg heel raise (video frame)", sourceUrl: "https://uk.physitrack.com/home-exercise-video/isometric-single-leg-heel-raise---gastrocnemius-bias" },
  "ach-eccentric-heel-drop-step-1": { file: "ach-eccentric-heel-drop-step-1.webp", credit: "Rabusin et al., J Foot Ankle Res 2019;12:20, Fig 4 — © The Author(s) 2019, CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6429802/" },
  "ach-floor-eccentric-insertional-1": { file: "ach-floor-eccentric-insertional-1.webp", credit: "© Physitrack PLC, all rights reserved — Single-leg eccentric calf raise (three video frames)", sourceUrl: "https://au.physitrack.com/home-exercise-video/single-leg-eccentric-calf-raise" },
  "ach-heavy-slow-calf-raise-1": { file: "ach-heavy-slow-calf-raise-1.webp", credit: "© Physitrack PLC — Weighted heel raises with support (video frame) + GeorgeStepanek, Wikimedia Commons — GFDL 1.2+ / CC BY-SA 3.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:DumbbellStandingCalfRaise.JPG" },
  "ach-seated-soleus-heavy-raise-1": { file: "ach-seated-soleus-heavy-raise-1.webp", credit: "© Royal United Hospitals Bath NHS FT — PHY053 Insertional Achilles tendinopathy, p. 4", sourceUrl: "https://www.ruh.nhs.uk/patients/services/physiotherapy/documents/PHY053_Advice_and_Exercises_Insertional_Achilles_Tendinopathy.pdf" },
  "ach-pain-monitoring-load-plan-1": { file: "ach-pain-monitoring-load-plan-1.webp", credit: "Pringels et al., Br J Sports Med 2025, participant brochure p. 4 — CC BY-NC 4.0 (English removed) + ARASAAC 25704 and 8490 (Government of Aragon, Sergio Palao) — CC BY-NC-SA 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12171478/" },
  "ach-heel-lift-footwear-1": { file: "ach-heel-lift-footwear-1.webp", credit: "Rabusin et al., J Foot Ankle Res 2019;12:20, Fig 3 — © The Author(s) 2019, CC BY 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6429802/" },
  "ach-prayer-floor-squat-insertional-1": { file: "ach-prayer-floor-squat-insertional-1.webp", credit: "Tawasol symbol 8072 (Mada) — CC BY-SA 4.0 + SuSanA / OXFAM-GB (Sarah House), Wikimedia Commons — CC BY 2.0 + ARASAAC 38611 and 3291 — CC BY-NC-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Seat_for_people_with_disabilities_to_use_a_pit_latrine_squatting_pan_(Pakistan)_(5600799213).jpg" },
  "ach-rebound-heel-raise-skipping-1": { file: "ach-rebound-heel-raise-skipping-1.webp", credit: "U.S. Marine Corps photo by Sgt. Austin Hazard, Wikimedia Commons — public domain + Pringels et al., Br J Sports Med 2025, participant brochure p. 29 — CC BY-NC 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:22nd_MEU_Marine_jumps_rope_to_stay_fit_140522-M-HZ646-037.jpg" },
  //  **صورُ «الكتف التكلّسيّ» السبع** (٢٠٢٦-١٠-٢٤، §4.fj — بحث عنها المساعد ورآها كلَّها): مستشفيات دونكاستر وشيروود فورست وتجربةُ KALK برخصة CC BY وتجربةُ Holmgren
  //  وأبحاثٌ برخصٍ مفتوحة ورموزُ Tawasol وويكيميديا — و«العناية بعد الموجات» و«الصلاة في النوبة» تطابقان جزئياً. بقرار المالك: الاستعمالُ خاصّ، والمصدرُ يُكتب.
  "calc-acute-flare-plan-1": { file: "calc-acute-flare-plan-1.webp", credit: "Doncaster and Bassetlaw Teaching Hospitals NHS FT — Shoulder Calcific Tendonitis, WPR45490, pp. 2–3 + Yıldız et al., BMC Sports Sci Med Rehabil 2026, Fig 1 — © The Author(s) 2026, CC BY-NC-ND 4.0", sourceUrl: "https://www.dbth.nhs.uk/wp-content/uploads/2023/08/WPR45490-Shoulder-Calcific-Tendonitus.pdf" },
  "calc-night-sleep-positions-1": { file: "calc-night-sleep-positions-1.webp", credit: "Sherwood Forest Hospitals NHS FT — Arthroscopic subacromial decompression, PIL202505-06-ASD, p. 4", sourceUrl: "https://sfh-tr.nhs.uk/media/chapvf1k/arthroscopic-subacromial-decompression.pdf" },
  "calc-after-shockwave-care-1": { file: "calc-after-shockwave-care-1.webp", credit: "Nambi et al., Pain Ther 2024, Fig 2a — © The Author(s) 2024, CC BY-NC 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10928055/" },
  "calc-after-barbotage-first-weeks-1": { file: "calc-after-barbotage-first-weeks-1.webp", credit: "Moosmayer et al., KALK study home programme, BMC Musculoskelet Disord 2017, Additional file 2 — © The Author(s) 2017, CC BY 4.0 (letters removed)", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5379547/" },
  "calc-rotation-self-check-1": { file: "calc-rotation-self-check-1.webp", credit: "Guiraud et al., Int J Surg Case Rep 2026, Fig 6B — CC BY-NC-ND 4.0 + Du et al., J Surg Case Rep 2023, Fig 1c — CC BY-NC 4.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10493127/" },
  "calc-prayer-wudu-flare-options-1": { file: "calc-prayer-wudu-flare-options-1.webp", credit: "Awaled, Wikimedia Commons, Takbir.svg — CC0 1.0 + Tawasol symbols 7988 and 7979 (Mada) — CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Takbir.svg" },
  "calc-assisted-raise-slow-lowering-1": { file: "calc-assisted-raise-slow-lowering-1.webp", credit: "Holmgren et al., BMJ 2012;344:e787, appendix exercise 2 — © Holmgren et al 2012, CC BY-NC 2.0", sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3282676/" },
};

/** رابطُ الصورة إن وصلت، وإلّا `null`. */
export function exerciseImageUrl(key: string): string | null {
  const f = EXERCISE_IMAGE_FILES[key];
  return f ? EXERCISE_IMAGE_BASE + f.file : null;
}
