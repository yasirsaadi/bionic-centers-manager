// Migration 131: الموجاتُ الصادمة في البروتوكولات المفصَّلة السبعة، وإعداداتُ الجهاز قبل الاعتماد، والموعدُ الدوريّ (§4.dn — ٢٠٢٦-١٠-١١).
//
// ملاحظةُ سليم: «في خشونة الركبة لم تُدخَل الموجاتُ الصادمة وهي أهمُّ جهاز» — ولدى المركز أحدثُ جهازٍ من BTL. **فقرّر المالك**: تدخل البروتوكولاتِ
// السبعة كلَّها بما ثبت بالدليل، **وإعداداتُ الجهاز نفسِه خاناتٌ فارغة يملؤها سليم** — ولا يُعتمد بروتوكولٌ ولا يُعاد اعتمادُه قبلها
// (`shared/physio_device_settings.ts`).
//
// **المراجعةُ بروتوكولاً بروتوكولاً** (التحقّقُ في §4.dn — Europe PMC، وAAOS 2021 وNICE 2022 من نصّيهما، ونشرةُ الشركة نفسِها):
//   • خشونةُ الركبة ⟵ **أساسيّ بقرار سليم**، أسبوعياً ٤ مرّات، والدليلُ محدود (AAOS «يجوز» بدرجةٍ محدودة؛ NICE «غير مؤكّد»).
//   • ألمُ الظهر المزمن ⟵ مساعدٌ أسبوعياً ٤ مرّات (تحليلان مجمّعان: ألمٌ أقلّ من الوهميّ لشهرٍ إلى ثلاثة) — وكان معتمَداً فيعود مسوّدة.
//   • الجلطةُ تحت الحادّة ⟵ مساعدٌ كما كان (للتشنّج)، أسبوعياً ٣ مرّات، **وتُفرَّغ إعداداتُه التي كُتبت من الأدبيات** لتُملأ من جهاز المركز.
//   • ألمُ الرقبة ⟵ لا يُستخدم: **نشرةُ الشركة تمنعه في منطقة الرأس والرقبة وقرب الأعصاب والأوعية الكبيرة**؛ ولسليم أن يفعّله للنقاط الزنادية
//     في عضلات حزام الكتف بعيداً عن الرقبة.
//   • ألمُ تحت الأخرم بلا تكلّس ⟵ لا يُستخدم كما كان: لم يفُق الوهميَّ بفرقٍ مهمّ (كوكرين 2020 · Kamonseki 2024).
//   • ألمُ الظهر الحادّ والتواءُ الكاحل ⟵ لا يُستخدم: لا دليلَ في الطور الحادّ (وفي الكاحل التهابٌ حادّ — مانعٌ في النشرة).
//   وكلُّ «لا يُستخدم» سطرٌ مكتوبٌ بسببه ودليله — يغيّره سليم، فإن جعله مستعمَلاً طُلبت الإعداداتُ قبل الاعتماد.
//
// **وأثرُ الإنسان باقٍ**: السطرُ يُضاف حيث لا سطرَ للجهاز، ونصُّ سطرٍ قائم لا يُعاد كتابتُه إلّا في بروتوكولٍ لم يعدّله أحد (`updated_by IS NULL`).
// **والمعتمَدُ الذي صار فيه جهازٌ مستعمَلٌ ناقصُ الإعدادات يعود مسوّدةً** بسطر تدقيق — في كلّ المكتبة، لا في السبعة وحدها.
// **والموعدُ الأسبوعيّ** لكلّ سطر موجاتٍ صادمة في المكتبة (المزروعةُ كذلك)، وعددُ المرّات للسبعة وحدها.
import { lit, num } from "./physio_content";

type Bi = [string, string];

const CONTRA: Bi = [
  "الموانع (نشرةُ الشركة نفسِها وISMST): مضادّاتُ التخثّر واضطراباتُ النزف، والخثرةُ الوريدية، والحمل، وورمٌ في موضع العلاج، ومنظّمُ ضربات القلب أو جهازٌ مزروع، ومناطقُ نموّ العظام عند الأطفال، وموضعُ حقنة كورتيزون، والجلدُ المجروح، والالتهابُ أو العدوى الحادّة، وفقدُ الإحساس، والقربُ من الأعصاب والأوعية الكبيرة.",
  "Contraindications (the manufacturer's own insert and ISMST): anticoagulants and bleeding disorders, venous thrombosis, pregnancy, a tumour in the treatment area, a pacemaker or implanted device, children's growth plates, a site of corticosteroid injection, broken skin, acute inflammation or infection, loss of sensation, and proximity to large nerves and vessels.",
];
const FROM_DEVICE: Bi = [
  "والإعداداتُ (النوعُ والشدّةُ والتردّدُ والنبضات) من جهاز المركز في خاناتها — يملؤها المشرفُ قبل الاعتماد؛ فقيمُ الأدبيات لا تنتقل بين جهازٍ وآخر.",
  "The settings (type, intensity, frequency, impulses) come from the centre's own device, in their fields — the supervisor fills them before approval, since published values do not transfer between devices.",
];

interface Line {
  code: string; use: "core" | "adjunct" | "not_used"; evidence: "recommended" | "optional" | "not_recommended";
  minutes: number | null; times: number | null; parameters: Bi | null; note: Bi;
  /** أين يقع: بعد التمارين (الأساسيّ)، أو بعد آخر مستعمَل (المساعد)، أو في الآخر (لا يُستخدم). */
  place: "after_exercise" | "after_used" | "end";
  /** سطرٌ قائم (الجلطة والكتف): يُعاد كتابةُ نصّه وتُفرَّغ إعداداتُه في بروتوكولٍ لم يعدّله أحد. */
  rewrite?: boolean;
}

export const LINES: Line[] = [
  {
    code: "knee-oa-geriatric", use: "core", evidence: "optional", minutes: 10, times: 4, place: "after_exercise",
    parameters: [
      "مرّةً في الأسبوع ٤ جلسات (٣–٥ في التجارب)، ودائماً مع التمرين: نصفُ النبضات على النقاط المؤلمة في الحافّة الداخلية للمفصل وهضبة الظنبوب الداخلية، والنصفُ على حوافّ المفصل الرضفيّ الفخذيّ والظنبوبيّ الفخذيّ؛ ثمّ التمرينُ مباشرةً. "
        + "وفي التجارب: الشعاعيّ نحو ٢٠٠٠ نبضة بضغط ٢–٣ بار وتردّد ٨ (٥–١٠)، والمركّزُ طاقةٌ متوسّطة ٠٫١٠–٠٫٢٥ مللي جول/مم² و١٠٠٠–٢٠٠٠ نبضة بتردّد ٤–٦. " + FROM_DEVICE[0],
      "Once a week for 4 sessions (3–5 in trials), always with exercise: half the impulses on the tender points of the medial joint line and medial tibial plateau, half along the patellofemoral and tibiofemoral borders; then exercise straight away. "
        + "In trials: radial about 2000 impulses at 2–3 bar and 8 Hz (5–10); focused at medium energy 0.10–0.25 mJ/mm² with 1000–2000 impulses at 4–6 Hz. " + FROM_DEVICE[1],
    ],
    note: [
      "أساسيٌّ بقرار سليم (أهمُّ جهازٍ في المركز لهذه الحالة) بموعدٍ أسبوعيّ — لا في كلّ جلسة. والدليلُ محدود: أفضلُ من الوهميّ على المدى القصير في الألم والوظيفة بيقينٍ منخفضٍ إلى متوسّط (Avendaño-Coy 2020 · Tang 2024)، "
        + "و«يجوز استعمالُه» بدرجةٍ محدودة عند الأكاديمية الأمريكية لجراحي العظام (AAOS 2021)، وغيرُ مؤكَّدٍ عند NICE 2022، ولا تذكره ACR ولا OARSI 2019؛ وفوق التمرين فائدتُه غير مؤكّدة (Günaydin 2022). "
        + "أنسبُه الدرجةُ ٢–٣ مع ألمٍ موضعيٍّ على الحافّة الداخلية، ولا يُوعَد مريضُ الدرجة ٤ بفائدة (Imamura 2017 سلبية). " + CONTRA[0],
      "Core by Saleem's decision (the centre's most important device for this condition), on a weekly schedule — not every session. The evidence is limited: better than sham in the short term for pain and function at low-to-moderate certainty (Avendaño-Coy 2020 · Tang 2024); "
        + "AAOS 2021 says it 'may be used' (limited strength), NICE 2022 calls the evidence uncertain, and ACR and OARSI 2019 do not mention it; added to exercise its benefit is uncertain (Günaydin 2022). "
        + "Best suited to Kellgren–Lawrence grade 2–3 with localised medial joint-line tenderness; do not promise benefit in grade 4 (Imamura 2017 was negative). " + CONTRA[1],
    ],
  },
  {
    code: "lbp-chronic-adult", use: "adjunct", evidence: "optional", minutes: 10, times: 4, place: "after_used",
    parameters: [
      "مرّةً في الأسبوع ٤ جلسات، على العضلات المجاورة للفقرات القطنية ونقاطها المؤلمة والمريضُ منبطح، ثمّ التمرينُ مباشرةً. وفي تجربة Walewicz 2019: الشعاعيّ ٢٠٠٠ نبضة بضغط ٢٫٥ بار وتردّد ٥، مرّتين أسبوعياً خمسةَ أسابيع مع تمارين الثبات. "
        + FROM_DEVICE[0],
      "Once a week for 4 sessions, over the lumbar paraspinal muscles and their tender points with the patient prone, then exercise straight away. In Walewicz 2019: radial 2000 impulses at 2.5 bar and 5 Hz, twice weekly for five weeks with stabilisation training. "
        + FROM_DEVICE[1],
    ],
    note: [
      "مساعدٌ بموعدٍ دوريّ — يؤشّره الأخصائيُّ لمريضه. تحليلان مجمّعان وجدا ألماً أقلّ من الوهميّ لشهرٍ إلى ثلاثة أشهر (Yue 2021 · Liu 2023)، وفي تجربةٍ كان الوهميُّ أفضلَ فورَ انتهاء العلاج والأمواجُ أفضلَ بعد ثلاثة أشهر (Walewicz 2019) — "
        + "دليلٌ محدود، مساعدٌ للتمرين لا بديلٌ عنه. " + CONTRA[0],
      "Scheduled adjunct — the specialist ticks it for the patient. Two meta-analyses found less pain than sham for one to three months (Yue 2021 · Liu 2023); in one trial sham was better right after treatment and shockwave better at three months (Walewicz 2019) — "
        + "limited evidence, an adjunct to exercise and never a substitute. " + CONTRA[1],
    ],
  },
  {
    code: "stroke-subacute-adult", use: "adjunct", evidence: "optional", minutes: 10, times: 3, place: "after_used", rewrite: true,
    parameters: [
      "مرّةً في الأسبوع ٣ جلسات، على العضلات المتشنّجة التي تعيق الوظيفة (عضلةُ الساق، قابضاتُ الرسغ والأصابع، قابضاتُ المرفق) عند اتّصال العضلة بالوتر، ثمّ التمرينُ والتمطيطُ مباشرةً. " + FROM_DEVICE[0],
      "Once a week for 3 sessions, over spastic muscles that limit function (calf, wrist and finger flexors, elbow flexors) at the muscle–tendon junction, followed straight away by exercise and stretching. " + FROM_DEVICE[1],
    ],
    note: [
      "مساعدٌ بموعدٍ دوريّ (كما في الزرع — لم يذكره سليم). مراجعاتٌ وجدت تخفيفاً للتشنّج (أشوورث) يمتدّ أسابيع (Guo 2017 · Cabanas-Valdés 2020)، لكنّ جودةَ الدراسات منخفضة، ولا توصي به NICE ولا AHA 2016. ولا يُعطى بلا تمرينٍ بعده؛ ومضادّاتُ التخثّر قرارُ الطبيب. "
        + CONTRA[0],
      "Scheduled adjunct (as seeded — not mentioned by Saleem). Reviews found reduced spasticity (Ashworth) lasting weeks (Guo 2017 · Cabanas-Valdés 2020), but study quality is low, and neither NICE nor AHA 2016 recommends it. Never given without exercise afterwards; anticoagulants are the doctor's decision. "
        + CONTRA[1],
    ],
  },
  {
    code: "neck-pain-mechanical-adult", use: "not_used", evidence: "optional", minutes: null, times: 3, place: "end", parameters: null,
    note: [
      "لا يُستخدم: نشرةُ الشركة نفسِها تمنعه في منطقة الرأس والرقبة وقرب الأعصاب والأوعية الكبيرة. والدليلُ في ألم العضلات واللفافة: أفضلُ من الوهميّ في الألم (Zhang 2020 · Jun 2021)، ولم يفُق الإبرَ الجافّة ولا حقنَ النقاط الزنادية ولا الليزر (Zhang 2020)، "
        + "ولا أثرَ له في إعاقة الرقبة (Jun 2021). ولسليم أن يجعله مساعداً للنقاط الزنادية في عضلات حزام الكتف بعيداً عن الرقبة — فتُطلب إعداداتُه قبل الاعتماد.",
      "Not used: the manufacturer's own insert prohibits the head and neck region and proximity to large nerves and vessels. Evidence in myofascial pain: better than sham for pain (Zhang 2020 · Jun 2021), no better than dry needling, trigger-point injection or laser (Zhang 2020), "
        + "and no effect on neck disability (Jun 2021). Saleem may make it an adjunct for trigger points in the shoulder-girdle muscles away from the neck — its settings are then required before approval.",
    ],
  },
  {
    code: "subacromial-pain-adult", use: "not_used", evidence: "not_recommended", minutes: null, times: null, place: "end", parameters: null, rewrite: true,
    note: [
      "لا يُستخدم لهذه الحالة: بلا تكلّسٍ في الوتر لم تفُق الأمواجُ الصادمة الوهميَّ بفرقٍ مهمّ سريرياً — كوكرين (Surace 2020) وجد الألمَ والوظيفة دون الفرق المهمّ مع آثارٍ جانبية أكثر، وتحليلٌ مجمّع (Kamonseki 2024) فائدةً صغيرة قصيرة للألم بلا أثرٍ في الوظيفة، "
        + "ولم تُضِف إلى التمرين المشرَف عليه شيئاً (Kvalvaag 2017)؛ والإرشاداتُ الهولندية (2014) تقول «لا» بلا تكلّس. ومكانُها التهابُ الأوتار التكلّسيّ، وله بروتوكولُه. ولسليم أن يغيّر — فتُطلب إعداداتُه قبل الاعتماد.",
      "Not used for this condition: without calcification, shockwave therapy was no better than sham by a clinically important margin — Cochrane (Surace 2020) found pain and function below the important difference with more adverse events, a meta-analysis (Kamonseki 2024) a small short-term pain benefit with no effect on function, "
        + "and it added nothing to supervised exercise (Kvalvaag 2017); the Dutch guideline (2014) advises against it without calcification. Its place is calcific tendinopathy, which has its own protocol. Saleem may change this — its settings are then required before approval.",
    ],
  },
  {
    code: "lbp-acute-adult", use: "not_used", evidence: "optional", minutes: null, times: null, place: "end", parameters: null,
    note: [
      "لا يُستخدم في الطور الحادّ: تجاربُه في الألم المزمن وحده (Walewicz 2019 · Yue 2021)، ولا دليلَ له في الحادّ. ومَن بقي ألمُه بعد ستّة أسابيع ينتقل إلى بروتوكول ألم الظهر المزمن، وفيه الأمواجُ مساعدٌ أسبوعيّ. ولسليم أن يغيّر — فتُطلب إعداداتُه قبل الاعتماد.",
      "Not used in the acute phase: its trials are in chronic pain only (Walewicz 2019 · Yue 2021), with no evidence in acute pain. Patients still in pain after six weeks move to the chronic low back pain protocol, where shockwave is a weekly adjunct. Saleem may change this — its settings are then required before approval.",
    ],
  },
  {
    code: "ankle-sprain-adult", use: "not_used", evidence: "optional", minutes: null, times: null, place: "end", parameters: null,
    note: [
      "لا يُستخدم: لا دليلَ للأمواج الصادمة في التواء الكاحل الحادّ، ولا توصيةَ لها في ملخّص توصيات JOSPT 2021 ولا في Vuurberg 2018؛ والكاحلُ في الأيّام الأولى متورّمٌ ملتهب — والالتهابُ الحادّ مانعٌ في نشرة الشركة نفسِها. ولسليم أن يغيّر — فتُطلب إعداداتُه قبل الاعتماد.",
      "Not used: there is no evidence for shockwave therapy in acute ankle sprain, and neither the JOSPT 2021 summary of recommendations nor Vuurberg 2018 includes it; the ankle is swollen and inflamed in the first days — and acute inflammation is a contraindication in the manufacturer's own insert. Saleem may change this — its settings are then required before approval.",
    ],
  },
];

/** موضعُ السطر الجديد في ترتيب أجهزة البروتوكول — يُزاح ما بعده خطوةً. */
function positionSql(place: Line["place"]): string {
  const use = `COALESCE(pd.centre_use, CASE pd.evidence WHEN 'recommended' THEN 'core' WHEN 'optional' THEN 'adjunct' ELSE 'not_used' END)`;
  if (place === "after_exercise") {
    return `(SELECT COALESCE(max(pd.display_order), -1) FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id WHERE pd.protocol_id = p.id AND d.code = 'exercise')`;
  }
  if (place === "after_used") {
    return `(SELECT COALESCE(max(pd.display_order), -1) FROM physio_protocol_devices pd WHERE pd.protocol_id = p.id AND ${use} <> 'not_used')`;
  }
  return `(SELECT COALESCE(max(pd.display_order), -1) FROM physio_protocol_devices pd WHERE pd.protocol_id = p.id)`;
}

function lineSql(l: Line): string {
  const code = lit(l.code);
  const has = `EXISTS (SELECT 1 FROM physio_protocol_devices x JOIN devices d ON d.id = x.device_id WHERE x.protocol_id = p.id AND d.code = 'shockwaves')`;
  const insert = `WITH target AS (
  SELECT p.id, ${positionSql(l.place)} AS k FROM physio_protocols p WHERE p.code = ${code} AND NOT ${has}
), shifted AS (
  UPDATE physio_protocol_devices pd SET display_order = pd.display_order + 1
    FROM target t WHERE pd.protocol_id = t.id AND pd.display_order > t.k RETURNING pd.id
)
INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, parameters, parameters_en, minutes, note, note_en, params, centre_use, every_days, times, display_order)
SELECT t.id, d.id, ${lit(l.evidence)}, ${lit(l.parameters?.[0])}, ${lit(l.parameters?.[1])}, ${num(l.minutes)}, ${lit(l.note[0])}, ${lit(l.note[1])},
       '{}'::jsonb, ${lit(l.use)}, 7, ${num(l.times)}, t.k + 1
  FROM target t CROSS JOIN devices d WHERE d.code = 'shockwaves'
ON CONFLICT (protocol_id, device_id) DO NOTHING;`;
  if (!l.rewrite) return insert;
  //  السطرُ القائم (الجلطة والكتف): نصُّه الجديد وإعداداتٌ فارغة لجهاز المركز — في بروتوكولٍ لم يعدّله أحد.
  const rewrite = `UPDATE physio_protocol_devices pd SET
    evidence = ${lit(l.evidence)}, centre_use = ${lit(l.use)}, minutes = ${num(l.minutes)},
    parameters = ${lit(l.parameters?.[0])}, parameters_en = ${lit(l.parameters?.[1])}, note = ${lit(l.note[0])}, note_en = ${lit(l.note[1])},
    params = '{}'::jsonb, every_days = 7, times = ${num(l.times)}
  FROM physio_protocols p, devices d
 WHERE pd.protocol_id = p.id AND pd.device_id = d.id AND d.code = 'shockwaves' AND p.code = ${code} AND p.updated_by IS NULL;`;
  return `${insert}\n${rewrite}`;
}

/** **مراجعُ الدليل الجديدة** — عناوينُها ومعرّفاتُها من سجلّ Europe PMC؛ تُضاف إلى مراجع البروتوكول إن لم تكن فيه وما دام دون الثلاثين. */
export const REFS: { code: string; title: string; org: string; year: number; url: string }[] = [
  { code: "knee-oa-geriatric", title: "Extracorporeal shockwave therapy improves pain and function in subjects with knee osteoarthritis: a systematic review and meta-analysis of randomized clinical trials", org: "International Journal of Surgery (Avendaño-Coy et al.)", year: 2020, url: "https://doi.org/10.1016/j.ijsu.2020.07.055" },
  { code: "knee-oa-geriatric", title: "The efficacy of extracorporeal shock wave therapy for knee osteoarthritis: an umbrella review", org: "International Journal of Surgery (Tang et al.)", year: 2024, url: "https://doi.org/10.1097/js9.0000000000001116" },
  { code: "knee-oa-geriatric", title: "Comparison of the added effects of kinesio taping and extracorporeal shockwave therapy to exercise alone in knee osteoarthritis", org: "Physiotherapy Theory and Practice (Günaydin, Bayrakci Tunay)", year: 2022, url: "https://doi.org/10.1080/09593985.2020.1780657" },
  { code: "knee-oa-geriatric", title: "Radial extracorporeal shock wave therapy for disabling pain due to severe primary knee osteoarthritis", org: "Journal of Rehabilitation Medicine (Imamura et al.)", year: 2017, url: "https://doi.org/10.2340/16501977-2148" },
  { code: "lbp-chronic-adult", title: "Extracorporeal Shockwave Therapy for Treating Chronic Low Back Pain: A Systematic Review and Meta-analysis of Randomized Controlled Trials", org: "BioMed Research International (Yue et al.)", year: 2021, url: "https://doi.org/10.1155/2021/5937250" },
  { code: "lbp-chronic-adult", title: "Efficacy and safety of extracorporeal shockwave therapy in chronic low back pain: a systematic review and meta-analysis of 632 patients", org: "Journal of Orthopaedic Surgery and Research (Liu et al.)", year: 2023, url: "https://doi.org/10.1186/s13018-023-03943-x" },
  { code: "lbp-chronic-adult", title: "The Effectiveness Of Radial Extracorporeal Shock Wave Therapy In Patients With Chronic Low Back Pain: A Prospective, Randomized, Single-Blinded Pilot Study", org: "Clinical Interventions in Aging (Walewicz et al.)", year: 2019, url: "https://doi.org/10.2147/cia.s224001" },
  { code: "lbp-acute-adult", title: "Extracorporeal Shockwave Therapy for Treating Chronic Low Back Pain: A Systematic Review and Meta-analysis of Randomized Controlled Trials", org: "BioMed Research International (Yue et al.)", year: 2021, url: "https://doi.org/10.1155/2021/5937250" },
  { code: "lbp-acute-adult", title: "The Effectiveness Of Radial Extracorporeal Shock Wave Therapy In Patients With Chronic Low Back Pain: A Prospective, Randomized, Single-Blinded Pilot Study", org: "Clinical Interventions in Aging (Walewicz et al.)", year: 2019, url: "https://doi.org/10.2147/cia.s224001" },
  { code: "neck-pain-mechanical-adult", title: "Efficacy of Extracorporeal Shockwave Therapy on Pain and Function in Myofascial Pain Syndrome of the Trapezius: A Systematic Review and Meta-Analysis", org: "Archives of Physical Medicine and Rehabilitation (Zhang et al.)", year: 2020, url: "https://doi.org/10.1016/j.apmr.2020.02.013" },
  { code: "neck-pain-mechanical-adult", title: "The Effect of Extracorporeal Shock Wave Therapy on Pain Intensity and Neck Disability for Patients With Myofascial Pain Syndrome in the Neck and Shoulder: A Meta-Analysis of Randomized Controlled Trials", org: "American Journal of Physical Medicine & Rehabilitation (Jun et al.)", year: 2021, url: "https://doi.org/10.1097/phm.0000000000001493" },
  { code: "subacromial-pain-adult", title: "Shock wave therapy for rotator cuff disease with or without calcification", org: "Cochrane Database of Systematic Reviews (Surace et al.)", year: 2020, url: "https://doi.org/10.1002/14651858.CD008962.pub2" },
  { code: "subacromial-pain-adult", title: "Extracorporeal Shockwave Therapy for the Treatment of Noncalcific Rotator Cuff Tendinopathy: A Systematic Review and Meta-analysis", org: "American Journal of Physical Medicine & Rehabilitation (Kamonseki et al.)", year: 2024, url: "https://doi.org/10.1097/phm.0000000000002361" },
  { code: "subacromial-pain-adult", title: "Effectiveness of Radial Extracorporeal Shock Wave Therapy (rESWT) When Combined With Supervised Exercises in Patients With Subacromial Shoulder Pain: A Double-Masked, Randomized, Sham-Controlled Trial", org: "The American Journal of Sports Medicine (Kvalvaag et al.)", year: 2017, url: "https://doi.org/10.1177/0363546517707505" },
];

function refSql(r: (typeof REFS)[number]): string {
  return `UPDATE physio_protocols p SET "references" = p."references" || jsonb_build_array(jsonb_build_object('title', ${lit(r.title)}, 'org', ${lit(r.org)}, 'year', ${r.year}, 'url', ${lit(r.url)}))
 WHERE p.code = ${lit(r.code)} AND jsonb_array_length(p."references") < 30
   AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p."references") e WHERE lower(e->>'url') = lower(${lit(r.url)}));`;
}

const USE = `COALESCE(pd.centre_use, CASE pd.evidence WHEN 'recommended' THEN 'core' WHEN 'optional' THEN 'adjunct' ELSE 'not_used' END)`;
const blank = (k: string) => `COALESCE(btrim(pd.params->>'${k}'), '') = ''`;

export const name = "131_physio_shockwave_settings";
export const sql = `
ALTER TABLE physio_protocol_devices ADD COLUMN IF NOT EXISTS every_days integer;
ALTER TABLE physio_protocol_devices ADD COLUMN IF NOT EXISTS times integer;
ALTER TABLE physio_plan_devices ADD COLUMN IF NOT EXISTS every_days integer;
ALTER TABLE physio_plan_devices ADD COLUMN IF NOT EXISTS times integer;

${LINES.map(lineSql).join("\n\n")}

${REFS.map(refSql).join("\n")}

-- الموعدُ الأسبوعيّ لكلّ سطر موجاتٍ صادمة في المكتبة لم يُكتب له موعد (والمرّاتُ للسبعة وحدها، أعلاه).
UPDATE physio_protocol_devices pd SET every_days = 7
  FROM devices d WHERE pd.device_id = d.id AND d.code = 'shockwaves' AND pd.every_days IS NULL;

-- المعتمَدُ الذي فيه موجاتٌ صادمة مستعمَلة ناقصةُ الإعدادات يعود مسوّدةً — بسطر تدقيق يقول لماذا.
WITH demoted AS (
  UPDATE physio_protocols p SET status = 'draft', approved_by = NULL, approved_by_name = NULL, approved_at = NULL
   WHERE p.status = 'approved' AND EXISTS (
     SELECT 1 FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id
      WHERE pd.protocol_id = p.id AND d.code = 'shockwaves' AND ${USE} <> 'not_used'
        AND (${blank("mode")} OR (${blank("pressureBar")} AND ${blank("energyMj")}) OR ${blank("frequencyHz")} OR ${blank("impulses")}))
  RETURNING p.id, p.title_ar
)
INSERT INTO audit_log (entity_type, entity_id, action, user_name, old_values, new_values, notes)
SELECT 'physio_protocol', id, 'update', 'ترحيل ١٣١', '{"status":"approved"}', '{"status":"draft"}',
       'عاد مسوّدةً: أُضيفت الموجاتُ الصادمة وإعداداتُها (النوعُ والشدّةُ والتردّدُ والنبضات) تنتظر المشرفَ من جهاز المركز — ' || title_ar
  FROM demoted;
`;
