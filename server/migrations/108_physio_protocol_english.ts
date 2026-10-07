// Migration 108: النسخةُ الإنكليزية لبروتوكولات العلاج الطبيعي (§4.cj — قرارُ المالك ٢٠٢٦-١٠-٠٧: «الطبيبُ يقرأ بالإنكليزية،
// وبعضُ المعالجين بالعربية»).
//
// • أعمدةٌ جديدة: `summary_en … precautions_en` في `physio_protocols`، و`parameters_en`/`note_en` في `physio_protocol_devices`.
// • **وترجمةُ الأربعة والأربعين المزروعة (ترحيل ١٠٧)** — وتُكتب **فقط حيث الإنكليزيةُ فارغة والعربيةُ ما زالت نصَّ الزرع حرفياً**:
//   بروتوكولٌ عدّل سليمٌ عربيّتَه لا تُلصَق به ترجمةُ نصٍّ لم يعد موجوداً — يبقى بلا إنكليزية حتى يكتبها، والشاشةُ تقول ذلك.
// • والإعادةُ لا تغيّر شيئاً (`… IS NULL`)، ولا مفتاحَ إلى `patients`.
import { SEED } from "./107_physio_protocol_seed";

type EnText = [summary: string, goals: string, assessment: string, exercises: string, contraindications: string, precautions: string];

/** نصوصُ سطور الأجهزة — من العربية المزروعة حرفياً إلى الإنكليزية. */
export const DEVICE_TEXT_EN: Record<string, string> = {
  "تمارين حركة وتحكّم حركي وتقوية جذع متدرّجة": "Graded mobility, motor-control and trunk-strengthening exercise",
  "حرارة سطحية ١٥–٢٠ دقيقة قبل التمارين": "Superficial heat 15–20 min before exercise",
  "حرارةٌ سطحية مفيدةٌ للحادّ قصيرَ المدى": "Superficial heat gives short-term benefit in acute LBP",
  "بديلُ الحرارة السطحية": "Alternative superficial heat",
  "TENS لا يُنصح به (NICE)": "TENS not recommended (NICE)",
  "لا يُنصح به (NICE)": "Not recommended (NICE)",
  "الشدّ لا يُنصح به (NICE · JOSPT)": "Traction not recommended (NICE · JOSPT)",
  "تقوية وتحمّل وتحكّم حركي + هوائي": "Strength, endurance and motor control + aerobic",
  "نقاطٌ زنادية (Trigger points) في العضلات القطنية والألوية": "Trigger points in lumbar and gluteal muscles",
  "للمرخَّص بالإبر الجافة وحده (علَمُ «الإبر الجافة»)": "Certified dry-needling practitioners only (dry-needling flag)",
  "مساعدٌ قبل التمارين": "Adjunct before exercise",
  "لا يُنصح به": "Not recommended",
  "لا دليلَ كافٍ": "Insufficient evidence",
  "تمارينُ الاتجاه المفضّل وتحريكٌ عصبيّ وتقوية": "Directional-preference exercise, neural mobilization and strengthening",
  "الشدّ القطني لا يُنصح به (NICE)": "Lumbar traction not recommended (NICE)",
  "انثناء + دراجة + توازن + تقوية": "Flexion-based + cycling + balance + strengthening",
  "لا دليلَ على فائدته": "No evidence of benefit",
  "TENS لتخفيف الألم قصيرَ المدى": "TENS for short-term pain relief",
  "دليلٌ ضعيف أو متضارب — مساعدٌ لا بديلٌ عن التمارين": "Weak or conflicting evidence — adjunct, not a substitute for exercise",
  "عضلات عميقة + تقوية كتف/ظهر علوي + وضعية": "Deep neck flexors + shoulder/upper-back strengthening + posture",
  "نقاطٌ زنادية في العضلة شبه المنحرفة (Upper trapezius)": "Upper trapezius trigger points",
  "ليزرٌ منخفض الشدّة على النقاط المؤلمة": "Low-level laser over tender points",
  "TENS": "TENS",
  "شدٌّ عنقيّ متقطّع (Intermittent mechanical traction) مع التمارين والعلاج اليدوي": "Intermittent mechanical cervical traction combined with exercise and manual therapy",
  "JOSPT: يمكن استعماله مع غيره، لا وحده": "JOSPT: may be used combined with other interventions, not alone",
  "PSSE (Schroth / SEAS) وبرنامجٌ منزليٌّ يوميّ": "PSSE (Schroth / SEAS) and a daily home programme",
  "التحفيزُ الكهربائي السطحي لا يوقف التقدّم": "Surface electrical stimulation does not halt progression",
  "بلا تكلّس لا فائدةَ ثابتة — انظر بروتوكول التكلّس": "No proven benefit without calcification — see the calcific protocol",
  "نقاطٌ زنادية في Infraspinatus و Upper trapezius": "Infraspinatus and upper trapezius trigger points",
  "موجاتٌ صادمة مركّزة (Focused ESWT) — جلسةٌ أسبوعياً ٣–٥ جلسات": "Focused ESWT — one session weekly, 3–5 sessions",
  "التكلّسُ من أقوى دواعي الموجات الصادمة": "Calcific tendinopathy is one of the strongest ESWT indications",
  "تمطيطٌ متدرّج بحسب المرحلة": "Graded stretching according to stage",
  "حرارةٌ قبل التمطيط": "Heat before stretching",
  "حرارةٌ قبل الحركة تفيد": "Heat before mobilization helps",
  "دليلٌ محدود": "Limited evidence",
  "حرارةٌ عميقة قبل التمطيط": "Deep heating before stretching",
  "TENS للألم": "TENS for pain",
  "لا دليلَ كافٍ للكتف المتجمّد": "Insufficient evidence for frozen shoulder",
  "موجاتٌ صادمة شعاعية أو مركّزة، ٣–٥ جلسات": "Radial or focused ESWT, 3–5 sessions",
  "للمزمن الذي لم يستجب للتمارين": "For chronic cases unresponsive to exercise",
  "نقاطٌ زنادية في باسطات الرسغ": "Wrist extensor trigger points",
  "انزلاقُ العصب والأوتار مع الجبيرة الليلية": "Nerve and tendon gliding with a night splint",
  "نبضيّ (Pulsed) على النفق الرسغي": "Pulsed mode over the carpal tunnel",
  "الحرارةُ لا تفيد الانضغاط": "Heat does not help nerve compression",
  "شمعُ البارافين ١٥ دقيقة قبل التمارين": "Paraffin wax 15 min before exercise",
  "الحرارةُ موصى بها شرطياً (ACR)": "Thermal therapy conditionally recommended (ACR)",
  "TENS لا يُنصح به (ACR)": "TENS not recommended (ACR)",
  "تقوية + هوائي + توازن": "Strengthening + aerobic + balance",
  "TENS: توصيةٌ قوية ضدّه (ACR)": "TENS: strong recommendation against (ACR)",
  "NICE: لا يُقدَّم الوخزُ ولا الإبرُ الجافة للخشونة": "NICE: do not offer acupuncture or dry needling for OA",
  "ورك + ركبة": "Hip + knee",
  "NMES/TENS لا يُنصح بهما (JOSPT)": "NMES/TENS not recommended (JOSPT)",
  "تحميلٌ متدرّج للوتر": "Progressive tendon loading",
  "ليزرٌ منخفضُ الشدّة": "Low-level laser",
  "JOSPT: يمكن استعماله": "JOSPT: may be used",
  "موجاتٌ صادمة شعاعية ٣–٥ جلسات": "Radial ESWT, 3–5 sessions",
  "للمزمن مع التمارين": "For chronic cases, with exercise",
  "تمطيطُ اللفافة والساق + تقوية": "Plantar fascia and calf stretching + strengthening",
  "موجاتٌ صادمة (Radial أو Focused) ٣–٥ جلسات أسبوعية": "Radial or focused ESWT, 3–5 weekly sessions",
  "JOSPT 2023: موصى بها": "JOSPT 2023: recommended",
  "نقاطٌ زنادية في عضلة الساق والقدم": "Calf and foot trigger points",
  "توازن + تقوية + وظيفيّ": "Balance + strengthening + functional",
  "ضغطٌ متقطّع للتورّم في الطور الحادّ": "Intermittent compression for swelling in the acute phase",
  "للتورّم في الأيام الأولى": "For swelling in the first days",
  "JOSPT: لا يُنصح به": "JOSPT: not recommended",
  "NMES للرباعية عند ضعفها": "NMES for quadriceps weakness",
  "JOSPT: لتقوية الرباعية": "JOSPT: for quadriceps strengthening",
  "للانصباب بعد الجراحة": "For post-operative effusion",
  "مرحليٌّ بالمعايير": "Criteria-based, phased",
  "NMES للرباعية في الأسابيع الأولى": "Quadriceps NMES in the first weeks",
  "يحسّن قوةَ الرباعية": "Improves quadriceps strength",
  "ضغطٌ وتبريد للتورّم": "Compression and cryotherapy for swelling",
  "لا فائدةَ ثابتة بعد الصليبي": "No proven benefit after ACL reconstruction",
  "NMES للرباعية": "Quadriceps NMES",
  "موصى به (APTA TKA CPG)": "Recommended (APTA TKA CPG)",
  "للتورّم": "For swelling",
  "AAOS: لا يُنصح به روتينياً": "AAOS: not recommended routinely",
  "NMES للألوية والرباعية": "Gluteal and quadriceps NMES",
  "مرحليٌّ بحسب الالتئام": "Phased according to tendon healing",
  "لا فائدةَ إضافية ثابتة (AAOS)": "No proven added benefit (AAOS)",
  "شمعٌ قبل التمارين للتيبّس": "Wax before exercise for stiffness",
  "تدريبٌ موجَّهٌ بالمهمّة ومشيٌ مكثّف": "Task-oriented training and intensive gait training",
  "تدريبُ مشيٍ روبوتيّ مع العلاج التقليدي لغير القادر على المشي": "Robot-assisted gait training plus conventional therapy for non-ambulatory patients",
  "Cochrane 2020: يزيد فرصةَ المشي المستقلّ لغير القادر على المشي في الأشهر الثلاثة الأولى — والإرشاداتُ تتفاوت في درجته":
    "Cochrane 2020: increases the chance of independent walking in non-ambulatory patients within the first 3 months — guidelines differ on its grade",
  "تحفيزٌ كهربائيٌّ وظيفيّ (FES/NMES) لرافعات القدم وللكتف المتدلّي": "FES/NMES for ankle dorsiflexors and shoulder subluxation",
  "AHA: للقدم المتدلّية وخلع الكتف الجزئي": "AHA: for foot drop and shoulder subluxation",
  "على العضلات المتشنّجة": "Over spastic muscles",
  "للتشنّج — دليلٌ متوسّط": "For spasticity — moderate evidence",
  "للمرخَّص بالإبر الجافة وحده (علَمُ «الإبر الجافة») — دليلٌ محدود": "Certified dry-needling practitioners only — limited evidence",
  "مشيٌ عالي الشدّة + هوائيّ + تقوية": "High-intensity gait training + aerobic + strengthening",
  "ANPT: لا يُفضَّل على تدريب المشي العادي للقادر على المشي": "ANPT: not preferred over conventional gait training in ambulatory patients",
  "FES لرافعات القدم": "FES for ankle dorsiflexors",
  "مشيٌ روبوتيّ لغير القادر على المشي فوق الأرض": "Robotic gait training for those unable to walk overground",
  "FES للدراجة أو للعضلات": "FES cycling or muscle stimulation",
  "تدريبُ مشيٍ روبوتيّ": "Robot-assisted gait training",
  "ليس أفضلَ من السير — للمتقدّم": "Not superior to treadmill training — for advanced stages",
  "الحرارةُ تزيد الأعراض (Uhthoff)": "Heat worsens symptoms (Uhthoff)",
  "الحرارةُ تزيد الأعراض": "Heat worsens symptoms",
  "إعادةُ تدريبٍ أمام المرآة": "Mirror-based neuromuscular retraining",
  "لا دليلَ كافٍ، وقد يزيد التزامنَ الحركي": "Insufficient evidence, and may increase synkinesis",
  "تدريبُ مشيٍ روبوتيّ للأطفال (حسب المقاس)": "Pediatric robot-assisted gait training (size permitting)",
  "دليلٌ متوسّط — يُضاف للتدريب لا يحلّ محلّه": "Moderate evidence — adds to training, does not replace it",
  "NMES / FES": "NMES / FES",
  "مدى حركةٍ لطيف ولعبٌ وظيفيّ": "Gentle range of motion and functional play",
  "تحفيزٌ كهربائيّ للعضلات": "Muscle electrical stimulation",
  "دليلٌ محدود — يُقرّه الأخصائيّ": "Limited evidence — specialist decision",
  "تمطيطٌ لطيف + تقوية + وضعيات": "Gentle stretching + strengthening + positioning",
  "تقويةُ الورك والجذع + توازن + نقل": "Hip and trunk strengthening + balance + transfers",
  "ضغطٌ لتشكيل الجذع وتخفيف الوذمة": "Compression for limb shaping and oedema reduction",
  "مع الـ Shrinker لا بديلاً عنه": "With the shrinker, not instead of it",
  "TENS لألم الطرف الشبحي": "TENS for phantom limb pain",
  "لتسريع التئام الجرح": "To support wound healing",
  "تدريبُ مشيٍ وتوازن": "Gait and balance training",
  "تدريبُ مشيٍ روبوتيّ في المراحل الأولى": "Robot-assisted gait training in early stages",
  "دليلٌ محدود للمبتورين": "Limited evidence in amputees",
  "مدى حركة + تقوية + تدريبٌ وظيفيّ": "Range of motion + strengthening + functional training",
  "شمعٌ لليدين في المرحلة غير النشطة": "Hand wax during inactive disease",
  "لا على المفصل الملتهب": "Not over an inflamed joint",
  "هوائيٌّ متدرّج + تقويةٌ خفيفة": "Graded aerobic + light strengthening",
  "توصيةٌ ضعيفة (EULAR: العلاجُ الحراري المائي)": "Weak recommendation (EULAR: hydrotherapy / heat)",
  "للمرخَّص بالإبر الجافة وحده (علَمُ «الإبر الجافة») — دليلٌ ضعيف": "Certified dry-needling practitioners only — weak evidence",
  "توازن (Otago) + تقوية": "Balance (Otago) + strengthening",
  "لا دليلَ على زيادة كثافة العظم": "No evidence of increased bone density",
  "صفائحُ النموّ": "Open growth plates",
  "ضغطٌ هوائيٌّ متقطّع (IPC) بضغطٍ منخفض": "Low-pressure intermittent pneumatic compression (IPC)",
  "مساعدٌ ضمن CDT لا بديلٌ عنه": "Adjunct within CDT, not a substitute",
  "دليلٌ متوسّط بعد استئصال الثدي": "Moderate evidence after mastectomy",
  "الحرارةُ تزيد الوذمة": "Heat increases oedema",
};

/** نصوصُ البروتوكولات — بترتيب: نظرة عامة · الأهداف · التقييم · التمارين · الموانع · الاحتياطات. */
export const PROTOCOL_TEXT_EN: Record<string, EnText> = {
  "lbp-acute-adult": [
    "Low back pain under 12 weeks without red flags. The core is reassurance, staying active and exercise.",
    "Reduce pain, return to activity and work, prevent chronicity.",
    "Screen red flags and psychosocial yellow flags (STarT Back), pain (NPRS), disability (Oswestry ODI), range of motion.",
    "Education and reassurance, graded walking, mobility and motor-control exercise, trunk strengthening, a daily home programme.",
    "Red flags: cauda equina syndrome, fracture, infection, tumour, progressive neurological deficit — urgent medical referral.",
    "Avoid bed rest, and avoid relying on passive modalities alone.",
  ],
  "lbp-chronic-adult": [
    "Pain beyond 12 weeks. Therapeutic exercise with pain neuroscience education is the core.",
    "Improve function and work capacity, reduce disability and kinesiophobia.",
    "Oswestry ODI, NPRS, fear-avoidance (FABQ / TSK), trunk endurance tests, red-flag screening.",
    "Trunk and limb strength and endurance, motor control, aerobic exercise, Pilates or yoga, graded activity, home programme.",
    "Red flags (as in acute LBP) — refer.",
    "Avoid reinforcing fear of movement; emphasise self-management over passive sessions.",
  ],
  "lumbar-radiculopathy-adult": [
    "Leg-dominant pain from nerve-root compression (often disc herniation). Most cases improve with conservative care.",
    "Centralize symptoms, reduce leg pain, restore function.",
    "Straight leg raise (SLR), neurological exam (power, sensation, reflexes), ODI, NPRS; progressive deficit → refer.",
    "Directional-preference exercise (McKenzie), neural mobilization, trunk strengthening, graded walking.",
    "Cauda equina syndrome or severe/progressive motor deficit — urgent referral.",
    "Stop any exercise that causes peripheralization of symptoms.",
  ],
  "lumbar-stenosis-geriatric": [
    "Neurogenic claudication that worsens with standing and walking and eases with forward flexion and sitting.",
    "Increase walking distance, reduce pain, maintain independence and prevent falls.",
    "Walking distance to symptom onset, 6-minute walk test (6MWT), ODI, balance (Berg / TUG), neurological exam.",
    "Flexion-based exercise, stationary cycling, body-weight-supported treadmill walking, trunk and lower-limb strengthening, balance training.",
    "Progressive neurological deficit or cauda equina symptoms — refer.",
    "Avoid painful lumbar extension; mind fall risk and cardiac comorbidity.",
  ],
  "neck-pain-mechanical-adult": [
    "Neck pain with mobility deficits and no neurological signs. Manual therapy combined with exercise works best.",
    "Reduce pain, restore range of motion, improve posture and endurance.",
    "Neck Disability Index (NDI), NPRS, cervical range of motion, cranio-cervical flexion test.",
    "Cervical and thoracic mobilization/manipulation, deep neck flexor training, shoulder and upper-back strengthening, posture exercise.",
    "Signs of vertebrobasilar insufficiency, cervical instability, fracture, tumour — refer.",
    "High-velocity manipulation only by trained clinicians after safety screening.",
  ],
  "cervical-radiculopathy-adult": [
    "Neck pain radiating to the arm with numbness or weakness from cervical nerve-root compression.",
    "Reduce arm pain, centralize symptoms, restore strength and function.",
    "Wainner cluster (Spurling, distraction, ULTT A, rotation < 60°), neurological exam, NDI, NPRS.",
    "Manual therapy, deep neck flexor training, neural mobilization, shoulder strengthening.",
    "Cervical myelopathy or progressive weakness — refer.",
    "Stop any position that increases neurological symptoms.",
  ],
  "whiplash-adult": [
    "Neck pain after an acceleration–deceleration injury (road traffic accident). Education and early movement beat immobilization.",
    "Early return to activity, pain reduction, prevention of chronicity.",
    "Quebec classification (WAD I–III), Canadian C-spine rule to exclude fracture, NDI, NPRS.",
    "Education and reassurance, early range-of-motion exercise, deep neck flexor training, cervical proprioception exercise.",
    "Fracture or instability (WAD IV) — refer.",
    "Avoid prolonged use of a cervical collar.",
  ],
  "scoliosis-ais-pediatric": [
    "Three-dimensional lateral curvature during growth. Physiotherapeutic scoliosis-specific exercise (PSSE) plus bracing according to the Cobb angle.",
    "Halt curve progression, improve posture, appearance and breathing, support brace adherence.",
    "Cobb angle on radiographs, Risser sign, Adams test with scoliometer, postural photographs.",
    "PSSE (Schroth / SEAS), 3D auto-correction, corrective breathing, trunk strengthening.",
    "Secondary scoliosis (neuromuscular, congenital) needs medical assessment before the programme.",
    "Monitor the Cobb angle with the physician; large curves (> 45°) to the surgeon.",
  ],
  "subacromial-pain-adult": [
    "Shoulder pain with arm elevation. Graded therapeutic exercise is first-line.",
    "Reduce pain, restore rotator cuff strength and scapular control, return to work and sport.",
    "SPADI or DASH, NPRS, range of motion, rotator cuff strength, Hawkins, Neer and painful arc tests.",
    "Rotator cuff strengthening (isometric/eccentric then progressive), scapular stabilization, posterior capsule stretching.",
    "Acute traumatic full-thickness tear with marked weakness — refer for surgical assessment.",
    "Pain during exercise is acceptable if ≤ 4/10 and settles within 24 hours.",
  ],
  "calcific-shoulder-adult": [
    "Calcium deposits in the rotator cuff with chronic pain. Shockwave therapy is among the strongest conservative options.",
    "Reduce pain, reduce calcific deposit size, restore motion.",
    "Radiographs (deposit size and type), SPADI or Constant score, NPRS, range of motion.",
    "Range-of-motion exercise, then rotator cuff strengthening and scapular stabilization.",
    "For ESWT: pregnancy, coagulopathy or anticoagulants, local infection or tumour, open growth plates.",
    "Temporary pain after a shockwave session is expected.",
  ],
  "frozen-shoulder-adult": [
    "Painful shoulder stiffness in stages: freezing, frozen, thawing. Dose is set by tissue irritability.",
    "Reduce pain, gradually restore range of motion, maintain function.",
    "Range of motion (especially external rotation), SPADI, NPRS, stage and tissue irritability.",
    "Freezing stage: gentle movement within pain limits; later: joint mobilization, graded stretching, strengthening.",
    "Undiagnosed fracture or dislocation.",
    "Diabetes prolongs the course; high-intensity stretching in the painful stage worsens symptoms.",
  ],
  "lateral-elbow-adult": [
    "Pain over the lateral epicondyle with gripping. Graded tendon loading is the core.",
    "Reduce pain, restore pain-free grip strength, return to work.",
    "PRTEE, pain-free grip strength, NPRS, Cozen and Mill tests.",
    "Isometric then eccentric wrist-extensor loading, shoulder and grip strengthening, activity modification.",
    "C6 radiculopathy or radial nerve entrapment — differentiate before starting.",
    "A counterforce brace is a short-term adjunct.",
  ],
  "carpal-tunnel-adult": [
    "Median nerve compression at the wrist: nocturnal numbness of the first three fingers. Mild–moderate cases are managed conservatively.",
    "Relieve night symptoms, preserve strength and sensation, delay or avoid surgery.",
    "Boston CTS Questionnaire, Phalen and Tinel tests, sensation and thenar strength, nerve conduction studies if needed.",
    "Neutral night splint, nerve and tendon gliding exercises, activity modification.",
    "Thenar atrophy or persistent sensory loss — surgical referral.",
    "Avoid direct pressure and excessive heat over the wrist.",
  ],
  "hand-oa-geriatric": [
    "Osteoarthritis of the finger joints and thumb base. Education, exercise, splinting and heat.",
    "Reduce pain and stiffness, maintain grip strength and hand function.",
    "AUSCAN or FIHOA, grip and pinch strength, range of motion, NPRS.",
    "Hand range-of-motion and strengthening exercise, joint protection, assistive devices, thumb-base splint.",
    "Acute inflammation or joint infection.",
    "Use heat cautiously with impaired sensation.",
  ],
  "knee-oa-geriatric": [
    "Exercise, weight loss and education are the core treatment in every guideline.",
    "Reduce pain, strengthen the quadriceps, improve walking and function, prevent falls.",
    "KOOS or WOMAC, NPRS, 30-second chair stand, TUG, 40 m fast-paced walk, quadriceps strength.",
    "Quadriceps and gluteal strengthening, low-impact aerobic exercise (cycling, walking, aquatic), balance, home programme, weight loss.",
    "Acute inflammation or joint infection, unexplained night pain — refer.",
    "Adjust dose to pain; mind cardiac comorbidity.",
  ],
  "hip-oa-geriatric": [
    "Groin pain, stiffness and loss of rotation. Exercise, manual therapy and education.",
    "Reduce pain, improve range of motion and gait, maintain independence.",
    "HOOS or WOMAC, range of motion (internal rotation), 30-second chair stand, 6MWT, TUG.",
    "Hip manual therapy, gluteal and thigh strengthening, stretching, low-impact aerobic exercise, balance, a cane when needed.",
    "Avascular necrosis or undiagnosed fracture — refer.",
    "Avoid painful overloading.",
  ],
  "patellofemoral-pain-adult": [
    "Pain around the patella aggravated by squatting, stairs and prolonged sitting — common in athletes and adolescents.",
    "Reduce pain, strengthen hip and knee, return to sport.",
    "Kujala (AKPS), NPRS, single-leg squat, gluteal and quadriceps strength.",
    "Hip (abductors / external rotators) plus knee strengthening, load management, short-term taping or foot orthoses.",
    "Large effusion or patellar instability after dislocation — reassess.",
    "Avoid painful loading early on.",
  ],
  "achilles-tendinopathy-adult": [
    "Pain and morning stiffness in the mid-portion of the Achilles tendon. Progressive tendon loading is the core.",
    "Reduce pain, restore tendon load capacity, return to running.",
    "VISA-A, repeated heel-raise test, NPRS, palpation.",
    "Progressive loading (Alfredson eccentric or heavy slow resistance), then plyometrics and return to running.",
    "Complete rupture (Thompson test) — refer.",
    "Pain during exercise up to 5/10 is acceptable if it settles by the next morning.",
  ],
  "plantar-heel-pain-adult": [
    "Pain under the heel with the first steps in the morning.",
    "Relieve first-step pain, return to pain-free walking and work.",
    "FAAM or FFI, first-step NPRS, ankle dorsiflexion range, palpation.",
    "Plantar fascia and calf stretching, foot and calf strengthening, taping, foot orthoses, night splint for chronic cases.",
    "Calcaneal stress fracture or nerve entrapment (Baxter) — differentiate.",
    "For ESWT: pregnancy, anticoagulants, children (open growth plates).",
  ],
  "ankle-sprain-adult": [
    "Lateral ankle ligament injury. Brief protection, then early loading and balance training prevent recurrence.",
    "Reduce swelling and pain, restore motion, strength and balance, prevent chronic instability.",
    "Ottawa ankle rules to exclude fracture, grade, FAAM, Y-balance test, range of motion.",
    "Acute: protection (brace), elevation, early loading; then range of motion, strengthening, balance and proprioception, functional and sport training.",
    "Fracture per Ottawa rules — radiograph first.",
    "Bracing during sport for a year after injury reduces recurrence.",
  ],
  "knee-meniscal-adult": [
    "Knee pain, sometimes with locking. In degenerative tears exercise is equivalent to surgery.",
    "Reduce pain and effusion, restore full motion and quadriceps strength, return to activity.",
    "KOOS, IKDC, range of motion, effusion (stroke test), quadriceps strength.",
    "Range-of-motion exercise, quadriceps and gluteal strengthening, neuromuscular training, graded functional training.",
    "A locked knee that does not release — surgical referral.",
    "Progress loading according to effusion and pain.",
  ],
  "acl-reconstruction-adult": [
    "Phased rehabilitation over 9–12 months driven by criteria, not time alone; return to sport by objective testing.",
    "Early full extension, restore quadriceps strength, neuromuscular control, safe return to sport.",
    "Range of motion, effusion, quadriceps strength (LSI), hop tests, IKDC, ACL-RSI.",
    "Early: full extension, quadriceps activation, crutch-free gait; then closed- and open-chain strengthening, balance, running, jumping, sport-specific training.",
    "Signs of infection or deep vein thrombosis — urgent referral.",
    "Open-chain exercise per graft type and surgeon instructions; no return to sport before 9 months and passing criteria.",
  ],
  "tka-geriatric": [
    "Early mobilization from the day of surgery, restoring extension, flexion and quadriceps strength.",
    "Range of motion at least 0–110°, independent gait, quadriceps strength, stair climbing.",
    "Range of motion, TUG, 30-second chair stand, 6MWT, KOOS-JR, pain and swelling.",
    "Range-of-motion and extension exercise, quadriceps and hip strengthening, gait and stair training, balance, home programme.",
    "Signs of wound infection or deep vein thrombosis — urgent referral.",
    "Monitor wound, swelling and pain; follow the surgeon's weight-bearing instructions.",
  ],
  "tha-geriatric": [
    "Early walking, gluteal strengthening and adherence to dislocation precautions according to the surgical approach.",
    "Independent gait without a limp, gluteal strength, safety in daily activities.",
    "TUG, 30-second chair stand, 6MWT, HOOS-JR, gait analysis.",
    "Early isometrics, gluteal and thigh strengthening, gait, stair and transfer training, balance.",
    "Signs of dislocation, infection or thrombosis — urgent referral.",
    "Dislocation precautions per approach (posterior: no flexion > 90°, no adduction, no internal rotation) and surgeon instructions.",
  ],
  "rotator-cuff-repair-adult": [
    "Protect the repair in the first weeks, then graded motion and strengthening according to tear size and the surgeon's instructions.",
    "Protect the repaired tendon, restore motion then strength, return to function.",
    "Passive and active range of motion, pain, ASES or Constant, strength (after 12 weeks).",
    "0–6 weeks: sling and gentle passive motion; 6–12: active-assisted then active motion; after 12: progressive strengthening.",
    "No active strengthening before tendon healing per the surgeon.",
    "Large tears need slower progression; the surgeon's instructions take precedence.",
  ],
  "distal-radius-fracture-adult": [
    "After cast removal or surgical fixation: restore wrist and forearm motion and grip strength.",
    "Restore wrist motion and forearm rotation, grip strength, hand function.",
    "PRWE, range of motion, grip strength, swelling, signs of complex regional pain syndrome (CRPS).",
    "Wrist, finger and forearm range-of-motion exercise, progressive grip strengthening, functional activities.",
    "Non-union on radiographs.",
    "Early finger movement even while in the cast; watch for CRPS signs.",
  ],
  "stroke-subacute-adult": [
    "The first six months are the main window of recovery: intensive, repetitive, task-oriented training.",
    "Independent walking, upper-limb use, independence in daily activities, prevention of complications (shoulder, falls).",
    "Fugl-Meyer, Berg Balance, 10-metre walk test (10MWT), 6MWT, FAC, Modified Ashworth for spasticity, Barthel.",
    "Task-oriented training, intensive gait training, balance, strengthening, constraint-induced movement therapy (CIMT) for the arm, stretching and positioning.",
    "Medical instability (blood pressure or cardiac) — only with physician clearance.",
    "Protect the affected shoulder from traction, prevent falls, monitor blood pressure.",
  ],
  "stroke-chronic-adult": [
    "Improvement remains possible after six months with intensive high-intensity training.",
    "Increase walking speed and distance, improve fitness, maintain independence.",
    "10MWT, 6MWT, Berg, Fugl-Meyer, Modified Ashworth.",
    "Moderate- to high-intensity gait training (treadmill and overground), aerobic training, strengthening, task-oriented arm training.",
    "Cardiac instability — physician clearance for high-intensity exercise.",
    "Monitor heart rate and blood pressure during high-intensity work.",
  ],
  "sci-incomplete-adult": [
    "Restore walking as far as possible and prevent complications (pressure ulcers, contractures, osteoporosis).",
    "Improve walking, balance and transfers, independence, prevent complications.",
    "ASIA Impairment Scale (AIS), WISCI II, 10MWT, 6MWT, Berg, SCIM.",
    "Intensive gait training (overground and treadmill), strengthening, balance, transfer and wheelchair training, stretching.",
    "Spinal instability after injury — surgeon clearance.",
    "Autonomic dysreflexia in lesions above T6, orthostatic hypotension, skin care.",
  ],
  "parkinsons-geriatric": [
    "Regular exercise throughout the disease: cued gait, balance, strengthening and aerobic training.",
    "Maintain gait and balance, prevent falls, maintain independence.",
    "Hoehn & Yahr, MDS-UPDRS part III, Mini-BESTest, TUG, 10MWT, freezing of gait (FOG-Q).",
    "Gait training with auditory or visual cueing, balance training, strengthening, aerobic exercise (treadmill/cycling), movement strategies, LSVT BIG.",
    "Severe orthostatic hypotension — adapt positions.",
    "Train during the medication 'on' phase; high fall risk.",
  ],
  "multiple-sclerosis-adult": [
    "Aerobic, strengthening and balance exercise dosed to fatigue, plus spasticity management.",
    "Improve walking and balance, reduce fatigue, maintain independence.",
    "EDSS (physician), Timed 25-Foot Walk, 6MWT, Berg, MFIS for fatigue, Modified Ashworth.",
    "Moderate aerobic exercise, strengthening, balance, stretching for spasticity, energy conservation.",
    "Acute relapse — reduce or pause.",
    "Avoid overheating (Uhthoff phenomenon): heat temporarily worsens symptoms.",
  ],
  "bells-palsy-all": [
    "Most cases recover spontaneously; early medication by the physician, and physiotherapy for retraining and preventing synkinesis.",
    "Restore symmetrical facial movement, prevent synkinesis, protect the eye.",
    "House-Brackmann, Sunnybrook Facial Grading System.",
    "Mirror-based facial neuromuscular retraining, small precise movements, gentle massage.",
    "Other neurological signs or very slow recovery — refer for assessment.",
    "Protect the eye from dryness; avoid forceful gross exercises that increase synkinesis.",
  ],
  "cerebral-palsy-pediatric": [
    "Intensive goal-directed training, spasticity management and prevention of deformity.",
    "Achieve functional goals chosen by the child and family, improve walking, sitting and balance.",
    "GMFCS, GMFM-66, Modified Ashworth, range of motion, Goal Attainment Scaling (GAS).",
    "Goal-directed functional training, CIMT or bimanual training for hemiplegia, strengthening, gait training, family-delivered home programme.",
    "Hip dislocation or fixed deformities — orthopaedic assessment.",
    "Hip surveillance radiographs per GMFCS level; involve the family.",
  ],
  "brachial-plexus-birth-pediatric": [
    "Brachial plexus injury at birth. Maintain range of motion, monitor recovery, and refer for surgery if it does not improve.",
    "Prevent shoulder and elbow contractures, stimulate movement, integrate the arm into play and function.",
    "Active Movement Scale (AMS), Mallet (older children), passive range of motion, elbow flexion recovery at 3 months.",
    "Gentle daily range-of-motion exercise (especially external rotation), sensory and motor stimulation through play, family training.",
    "Associated clavicle or humerus fracture in the first weeks — move with caution.",
    "No return of elbow flexion by 3–6 months → refer to a nerve surgeon.",
  ],
  "torticollis-cmt-pediatric": [
    "Shortening of the sternocleidomastoid in an infant. Starting before 3 months gives the best outcomes.",
    "Full cervical range of motion, midline head posture, prevention of plagiocephaly.",
    "Rotation and lateral flexion range, Muscle Function Scale, severity grade, plagiocephaly, hip screening.",
    "Gentle daily stretching, active strengthening of the opposite side, positioning and handling, tummy time, family home programme.",
    "Non-muscular torticollis (bony, neurological, ocular) — refer.",
    "Gentle, pain-free stretching; never forceful.",
  ],
  "lower-limb-preprosthetic-adult": [
    "Prepare the residual limb and body for the prosthesis: limb shape, strength, contracture prevention, independent transfers.",
    "A conical residual limb ready for casting, prevent hip and knee contractures, strength in both limbs, independent transfers and wheelchair use.",
    "Residual limb circumference and shape, wound, hip and knee range of motion, muscle strength, single-leg balance, AMPPRO, phantom limb pain.",
    "Shrinker / elastic wrapping, anti-contracture positioning (prone lying), hip extensor and abductor strengthening, trunk exercise, balance, transfers.",
    "Unhealed wound or infection — no loading of the residual limb.",
    "Dysvascular (diabetic) limbs heal slowly; inspect the intact limb daily.",
  ],
  "lower-limb-prosthetic-gait-adult": [
    "From donning and weight-bearing on the prosthesis to symmetrical independent gait on varied surfaces and stairs.",
    "Independent symmetrical gait, correct donning and doffing, target K-level, return to work.",
    "AMPPRO, 2MWT or 6MWT, TUG, gait analysis, socket fit, Houghton scale, K-level.",
    "Weight-bearing on the prosthesis, balance in parallel bars, step and gait-phase training, varied surfaces, stairs and ramps, recovery from falls.",
    "Persistent ulcer or redness on the residual limb — adjust the socket before continuing.",
    "Inspect the residual limb before and after every session; adjust socks to volume changes.",
  ],
  "upper-limb-amputation-adult": [
    "Prepare the residual limb, train muscle signals (myo-training) for smart prostheses, then functional training.",
    "A ready residual limb, separable muscle signals for control, use of the prosthesis in daily activities.",
    "Range of motion and strength, residual limb, EMG site testing, phantom limb pain, AM-ULA or SHAP.",
    "Wrapping and shaping, shoulder and elbow range of motion, strengthening, software-guided myo-training, grasp-and-release training, bimanual daily activities.",
    "Unhealed wound.",
    "Overuse of the intact limb — education and prevention.",
  ],
  "rheumatoid-arthritis-adult": [
    "Regular exercise is safe and beneficial; dose is set by disease activity.",
    "Reduce pain and stiffness, maintain strength and motion, protect joints.",
    "DAS28 (physician), HAQ, grip strength, range of motion, swollen joint count.",
    "Moderate aerobic exercise, strengthening, range of motion, hand exercise, joint protection, energy conservation.",
    "Acutely inflamed joint — relative rest and gentle movement; upper cervical (C1–C2) instability.",
    "Avoid high loads on inflamed joints; heat for stiffness, not for the inflamed joint.",
  ],
  "axial-spa-adult": [
    "Regular lifelong exercise is a core part of treatment alongside medication.",
    "Maintain spinal and chest mobility and posture, reduce pain and stiffness.",
    "BASFI, BASDAI, BASMI, chest expansion, occiput-to-wall distance.",
    "Spinal mobility and extension exercise, breathing exercise, trunk strengthening, aerobic exercise, swimming.",
    "Fracture of the ankylosed spine after even a minor fall — urgent referral.",
    "No high-velocity manipulation of an ankylosed spine.",
  ],
  "fibromyalgia-adult": [
    "Exercise is the only strong recommendation in EULAR; start low and progress slowly.",
    "Reduce pain and fatigue, improve sleep and function, self-management.",
    "FIQR, NPRS, fatigue scale, 6MWT.",
    "Low-intensity graded aerobic exercise, light strengthening, aquatic exercise, tai chi or yoga, pain neuroscience education.",
    "—",
    "Very slow progression prevents post-exercise flares.",
  ],
  "osteoporosis-falls-geriatric": [
    "Balance and strength training reduce falls and fractures; the foundation of prevention in older adults.",
    "Reduce fall risk, strengthen muscle and bone, improve balance and confidence.",
    "TUG, Berg, 30-second chair stand, gait speed, falls history, FES-I for fear of falling.",
    "Progressive balance training (Otago), progressive resistance training, weight-bearing exercise, tai chi, posture and back-extensor exercise.",
    "Acute vertebral compression fracture — assess first.",
    "Avoid loaded spinal flexion combined with rotation (raises vertebral fracture risk).",
  ],
  "jia-pediatric": [
    "Maintain motion, strength and participation in play and school alongside medical treatment.",
    "Prevent contractures, maintain strength and fitness, participation in activities.",
    "CHAQ, range of motion of affected joints, strength, gait.",
    "Range of motion, strengthening, aerobic exercise, aquatic exercise, night splints when needed, suitable play and sport.",
    "Acutely inflamed joint — gentle movement, no loading.",
    "Open growth plates — no shockwave therapy and no excessive loading.",
  ],
  "lymphedema-adult": [
    "Complete decongestive therapy (CDT): manual lymphatic drainage, multilayer bandaging, exercise and skin care.",
    "Reduce limb volume, maintain it with compression garments, prevent infection.",
    "Limb circumference or volume, ISL stage, skin inspection, Stemmer sign, function (DASH).",
    "Manual lymphatic drainage (MLD), multilayer bandaging, exercise under bandaging, progressive strengthening, maintenance compression garment.",
    "Acute infection (cellulitis), acute deep vein thrombosis, uncontrolled heart failure — no compression or drainage.",
    "No heat on the limb; active untreated cancer — with physician approval.",
  ],
};

const FIELDS = ["summary", "goals", "assessment", "exercises", "contraindications", "precautions"] as const;
const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

function protocolSql(code: string): string {
  const seed = SEED.find((p) => p.code === code);
  const en = PROTOCOL_TEXT_EN[code];
  if (!seed || !en) throw new Error(`108: no seed/English for ${code}`);
  //  كلُّ حقلٍ بشرطه: الإنكليزيةُ فارغة **والعربيةُ نصُّ الزرع حرفياً**.
  const sets = FIELDS.map((f, i) => `${f}_en = CASE WHEN ${f}_en IS NULL AND ${f} = ${lit((seed as any)[f])} THEN ${lit(en[i])} ELSE ${f}_en END`);
  return `UPDATE physio_protocols SET\n  ${sets.join(",\n  ")}\nWHERE code = ${lit(code)};`;
}

function deviceSql(): string {
  const out: string[] = [];
  for (const p of SEED) {
    for (const [code, , params, , note] of p.devices) {
      for (const [col, ar] of [["parameters", params], ["note", note]] as const) {
        if (!ar) continue;
        const en = DEVICE_TEXT_EN[ar];
        if (!en) throw new Error(`108: no English for device text «${ar}»`);
        out.push(`UPDATE physio_protocol_devices pd SET ${col}_en = ${lit(en)}
FROM physio_protocols p, devices d
WHERE pd.protocol_id = p.id AND pd.device_id = d.id AND p.code = ${lit(p.code)} AND d.code = ${lit(code)}
  AND pd.${col}_en IS NULL AND pd.${col} = ${lit(ar)};`);
      }
    }
  }
  return out.join("\n");
}

export const name = "108_physio_protocol_english";
export const sql = `
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS summary_en TEXT;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS goals_en TEXT;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS assessment_en TEXT;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS exercises_en TEXT;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS contraindications_en TEXT;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS precautions_en TEXT;
ALTER TABLE physio_protocol_devices ADD COLUMN IF NOT EXISTS parameters_en TEXT;
ALTER TABLE physio_protocol_devices ADD COLUMN IF NOT EXISTS note_en TEXT;

${SEED.map((p) => protocolSql(p.code)).join("\n\n")}

${deviceSql()}
`;
