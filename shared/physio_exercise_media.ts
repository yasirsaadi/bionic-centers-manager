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
};

/** رابطُ الصورة إن وصلت، وإلّا `null`. */
export function exerciseImageUrl(key: string): string | null {
  const f = EXERCISE_IMAGE_FILES[key];
  return f ? EXERCISE_IMAGE_BASE + f.file : null;
}
