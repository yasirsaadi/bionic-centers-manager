// Migration 139: «اضغطه يا سليم» — ما ينتظر قرارَ المشرف العام في كلّ بروتوكولٍ مفصَّل (§4.dy — ٢٠٢٦-١٠-١٣).
//
// طلبُ المالك (٢٠٢٦-١٠-١٣): «علّم كلَّ مكتملٍ من البروتوكولات بلونٍ يميّزه سليم حين يمرّ عليها بأنه مكتمل ويستطيع اعتمادَه، مع زرٍّ واضح لسليم… وبه كلُّ ما
// تحتاجه من سليم لهذا البروتوكول من إعداداتٍ وأجهزة وكلُّ ما تسألني عنه هنا». فكلُّ ما كان المساعدُ يمرّره عبر المالك إلى سليم صار بنداً في صفحة البروتوكول:
//   • `physio_protocol_checklist` — بندٌ لكلّ سؤال (العددُ، الحدودُ، جهازٌ يقرّر استعمالَه، مقياسٌ يضيفه…) بنصّه باللغتين وموضوعه، **وسليم يعلّمه «تمّ»**
//     ومعه سطرُ قراره إن شاء (`done_at` · `done_by` · `note`) — بسطر تدقيق. ويُحذف بحذف بروتوكوله (`ON DELETE CASCADE`)؛ ولا مفتاحَ فيه إلى المرضى.
//   • والزرعُ **لا يكتب فوق ما علّمه سليم**: `ON CONFLICT (protocol_id, item_key) DO NOTHING` — فالإعادةُ لا تكرّر ولا تُرجع بنداً منجَزاً.
// والمحسوبُ من البيانات (الاعتمادُ، وإعداداتُ الأجهزة، والمقاييس، والبطاقاتُ المسوّدة، والصورُ المنتظرة) **لا يُخزَّن هنا** — يُقرأ حيّاً في الصفحة
// (`shared/physio_supervisor_checklist.ts`)، فلا يكذب بعد أن يتغيّر. والبروتوكولُ القادم يزرع بنودَه في ترحيله بـ`checklistSql`.
import { checklistSql, type ChecklistSeed } from "./physio_content";

/** بنودُ البروتوكولات الأحد عشر المفصَّلة — من «ما بقي» في قسم كلٍّ منها (§4.cx … §4.dx) ومن استعمال أجهزته كما هو في القاعدة. */
export const ITEMS: Record<string, ChecklistSeed[]> = {
  "lbp-chronic-adult": [
    { key: "reapprove-shockwave", topic: "settings",
      ar: "اعتمدتَه سابقاً، ثمّ عاد مسوّدةً حين أُضيفت الموجاتُ الصادمة «مساعداً» أسبوعياً × ٤ (ترحيل ١٣١): املأ إعداداتِها من «تعديل» (النوعُ والشدّةُ والتردّدُ والنبضات) ثمّ أعد اعتمادَه — أو اجعلها «لا يُستخدم».",
      en: "You approved it before; it returned to draft when shockwave was added as a weekly × 4 adjunct (migration 131): fill its settings under 'Edit' (type, intensity, frequency, impulses) and re-approve — or set it to 'Not used'." },
  ],
  "lbp-acute-adult": [
    { key: "device-traction", topic: "devices",
      ar: "الشدّ «مساعد» بعد الأيّام الأولى كما كُتب — أبقِه، أم «لا يُستخدم» في الحادّ؟",
      en: "Traction is an adjunct after the first days as written — keep it, or 'Not used' in acute pain?" },
  ],
  "neck-pain-mechanical-adult": [
    { key: "device-laser", topic: "devices",
      ar: "الليزر «لا يُستخدم» حتى تقرّر — ودليلُه في الرقبة أفضلُ منه في الظهر (Chow 2009): أبقِه، أم «مساعد» بإعداداته؟",
      en: "Laser is 'Not used' until you decide — its evidence in the neck is better than in the back (Chow 2009): keep it, or make it an adjunct with its settings?" },
    { key: "device-traction", topic: "devices",
      ar: "الشدّ «مساعد» بعد الجلسات الأولى كما كُتب — أبقِه، أم «لا يُستخدم»؟",
      en: "Traction is an adjunct after the first sessions as written — keep it, or 'Not used'?" },
    { key: "device-shockwave", topic: "devices",
      ar: "الموجاتُ الصادمة «لا يُستخدم» لأنّ نشرة الجهاز تمنع منطقة الرأس والرقبة — لك أن تفعّلها لحزام الكتف بإعداداتها.",
      en: "Shockwave is 'Not used' because the device leaflet forbids the head and neck — you may enable it for the shoulder girdle with its settings." },
  ],
  "knee-oa-geriatric": [
    { key: "device-electro", topic: "devices",
      ar: "التحفيزُ «مساعد» هنا مع أنّ الإرشادات ضدّه بوضوح (ACR 2019 «توصيةٌ قوية ضدّ») — أبقِه، أم «لا يُستخدم»؟",
      en: "Stimulation is an adjunct here although the guidelines clearly advise against it (ACR 2019 'strongly against') — keep it, or 'Not used'?" },
    { key: "device-needle-laser", topic: "devices",
      ar: "الإبرُ الجافّة والليزر «لا يُستخدمان» — أبقِهما، أم يصيران مساعدَين بإعداداتهما؟",
      en: "Dry needling and laser are 'Not used' — keep them, or make them adjuncts with their settings?" },
  ],
  "subacromial-pain-adult": [
    { key: "dose", topic: "dose",
      ar: "العدد ١٨ جلسة — والدليلُ لا يرى فضلاً للإشراف الكثير (البيتُ كالمركز — GRASP 2021): ١٨، أم أقلّ؟",
      en: "18 sessions — the evidence finds no benefit from more supervision (home equals centre — GRASP 2021): 18, or fewer?" },
    { key: "device-electro", topic: "devices",
      ar: "التحفيزُ «مساعد» والإرشاداتُ ضدّه — أبقِه، أم «لا يُستخدم»؟",
      en: "Stimulation is an adjunct and the guidelines are against it — keep it, or 'Not used'?" },
    { key: "device-laser", topic: "devices",
      ar: "الليزر «لا يُستخدم» حتى تقرّر — أبقِه، أم «مساعد» بإعداداته؟",
      en: "Laser is 'Not used' until you decide — keep it, or make it an adjunct with its settings?" },
  ],
  "stroke-subacute-adult": [
    { key: "device-robot", topic: "devices",
      ar: "جهازُ المشي الروبوتيّ «مساعد» — أبقِه، أم «أساسيّ» لغير القادر على المشي (FAC ٠–٢)؟",
      en: "The robotic gait trainer is an adjunct — keep it, or make it core for non-walkers (FAC 0–2)?" },
    { key: "device-shockwave", topic: "devices",
      ar: "الموجاتُ الصادمة «مساعد» للتشنّج أسبوعياً × ٣ — أبقِها واملأ إعداداتِها من «تعديل»، أم «لا يُستخدم»؟",
      en: "Shockwave is an adjunct for spasticity, weekly × 3 — keep it and fill its settings under 'Edit', or 'Not used'?" },
    { key: "device-needle", topic: "devices",
      ar: "الإبرُ الجافّة «مساعد» — أبقِها كما كُتبت، أم «لا يُستخدم»؟",
      en: "Dry needling is an adjunct — keep it as written, or 'Not used'?" },
  ],
  "ankle-sprain-adult": [
    { key: "dose", topic: "dose",
      ar: "العدد ١٢ جلسة — والدليلُ يخالف نموذج المركز في الالتواء البسيط (Brison 2016): ١٢ للشديد وأقلّ للبسيط؟",
      en: "12 sessions — the evidence contradicts the centre model for a simple sprain (Brison 2016): 12 for severe and fewer for simple?" },
    { key: "device-laser", topic: "devices",
      ar: "الليزر «لا يُستخدم» — والدليلُ متضارب (JOSPT «C» وVuurberg «لا»): أبقِه، أم «مساعد»؟",
      en: "Laser is 'Not used' — the evidence conflicts (JOSPT 'C', Vuurberg 'no'): keep it, or make it an adjunct?" },
  ],
  "lower-limb-prosthetic-gait-adult": [
    { key: "dose", topic: "dose",
      ar: "العدد ٢٤ لتحت الركبة و٣٦ لفوقها أو لقاصر الدوران أو K1–K2 — اقتراحٌ لا دليلَ على عدد: أبقِه أو عدّله.",
      en: "24 sessions below the knee and 36 above it, with poor circulation or K1–K2 — a proposal with no evidence for a number: keep or adjust." },
    { key: "adjuncts", topic: "devices",
      ar: "التحفيزُ والمغناطيسُ والتيكار مساعدةٌ بشروط الجلد — راجع الشروطَ في ملاحظة كلّ جهاز.",
      en: "Stimulation, magnetic therapy and Tecar are adjuncts with skin conditions — review the conditions in each device note." },
    { key: "device-robot-compression", topic: "devices",
      ar: "الروبوتُ والضغطُ «لا يُستخدمان» — أضفهما إن أردت.",
      en: "The robot and compression are 'Not used' — add them if you wish." },
    { key: "measures-add", topic: "measures",
      ar: "أضف من «المقاييس» إن رأيت: سرعة المشي ١٠ أمتار، واختبار L، والمربّعات الأربعة، وPEQ-MS، ومقياس Houghton.",
      en: "Add under 'Measures' if you wish: 10-metre walk speed, the L test, four square step test, PEQ-MS and the Houghton scale." },
  ],
  "lower-limb-preprosthetic-adult": [
    { key: "dose", topic: "dose",
      ar: "العدد ٢٤ ويمتدّ بستٍّ حتى نحو ٤٨ حتى الجاهزية للقالب — اقتراحٌ لا دليل: أبقِه أو عدّله.",
      en: "24 sessions, extended by six up to about 48 until ready for casting — a proposal, not evidence: keep or adjust." },
    { key: "limits", topic: "limits",
      ar: "حدُّ المحيط (ثابتٌ ≤ ٠٫٥ سم في ثلاثة قياسات) وحدُّ التيبّس (≤ ١٠° / ١٥°) — اقتراحٌ مكتوبٌ أنه اقتراح: أبقِهما أو عدّلهما.",
      en: "The girth limit (stable ≤ 0.5 cm over three measurements) and the contracture limit (≤ 10° / 15°) — written as proposals: keep or adjust." },
    { key: "adjuncts", topic: "devices",
      ar: "التحفيزُ والمغناطيسُ والتيكار مساعدةٌ بشروط الجلد والجرح — راجع الشروط.",
      en: "Stimulation, magnetic therapy and Tecar are adjuncts with skin and wound conditions — review the conditions." },
    { key: "measures-add", topic: "measures",
      ar: "أضف من «المقاييس» إن رأيت: BAMS، والوقوف على الساق السليمة، وTUG والمشي دقيقتين بالمساعد، وWST-Q بالعربية، وBarthel، وواط جهاز الذراعين.",
      en: "Add under 'Measures' if you wish: BAMS, sound-leg stance, TUG and the two-minute walk with an aid, Arabic WST-Q, Barthel and arm-ergometer watts." },
  ],
  "upper-limb-amputation-adult": [
    { key: "dose", topic: "dose",
      ar: "العدد ٣٠ لتحت المرفق و٤٢ لفوقه والكتف والطرفين والأنماط — اقتراحٌ لا دليل: أبقِه أو عدّله.",
      en: "30 sessions below the elbow and 42 above it, at shoulder level, bilateral or pattern recognition — a proposal, not evidence: keep or adjust." },
    { key: "limits", topic: "limits",
      ar: "الحدودُ الرقمية في معايير الانتقال (الإشارةُ في ١٠/١٠ و٨/١٠، والأنماطُ ٨٥٪، واختبارُ الحركات ١١ من ١٢، وAM-ULA +٤) — اقتراحٌ: أبقِها أو عدّلها.",
      en: "The numeric progression limits (signals 10/10 and 8/10, patterns 85%, motion test 11 of 12, AM-ULA +4) — proposals: keep or adjust." },
    { key: "adjuncts", topic: "devices",
      ar: "التحفيزُ والمغناطيسُ والتيكار والشمع (لجزء الكفّ وحده) مساعدةٌ بشروطها — راجعها.",
      en: "Stimulation, magnetic therapy, Tecar and wax (partial hand only) are adjuncts with conditions — review them." },
    { key: "device-shockwave", topic: "devices",
      ar: "الموجاتُ الصادمة «لا يُستخدم» إلّا لورمٍ عصبيٍّ مؤكَّدٍ بالسونار بقرارك والطبيب — وإعداداتُها تتبع نوع جهاز المركز.",
      en: "Shockwave is 'Not used' except for an ultrasound-confirmed neuroma by your and the doctor's decision — its settings follow the centre's device type." },
    { key: "measures-add", topic: "measures",
      ar: "أضف من «المقاييس» إن رأيت: الصندوق والمكعّبات، وQuickDASH بالعربية، ومقياس الوظيفة الخاصّ بالمريض، واختبار الحركات الاثنتي عشرة، وسجلّ اللبس.",
      en: "Add under 'Measures' if you wish: Box and Block, Arabic QuickDASH, the Patient-Specific Functional Scale, the 12-motion test and the wear log." },
  ],
  "tka-geriatric": [
    { key: "dose", topic: "dose",
      ar: "العدد ٢٤ وتمديدٌ واحد بستّ بمعيار — عند أعلى ما جُرّب، ولم تختبر تجربةٌ ستَّ جلساتٍ في الأسبوع: أبقِه أو عدّله.",
      en: "24 sessions with one criteria-based extension of six — at the highest volume tested, and no trial tested six sessions a week: keep or adjust." },
    { key: "limits", topic: "limits",
      ar: "الحدود: ثنيٌ ٩٠° ثمّ ١٠٥–١١٠° ثمّ ١١٠–١١٥°، وإحالةُ التيبّس نحو الأسبوع السادس — اقتراحٌ مبنيّ على Bade 2011: أبقِها أو عدّلها.",
      en: "Limits: flexion 90°, then 105–110°, then 110–115°, and stiffness referral at about week 6 — proposals built on Bade 2011: keep or adjust." },
    { key: "device-electro-core", topic: "devices",
      ar: "التحفيز (NMES) «أساسيّ» هنا خلافاً لقاعدتك (مساعد) لأنّ الدليل يوصي به ثلاثةَ أسابيع متّصلة — أبقِه أساسيّاً، أم «مساعد»؟",
      en: "NMES is core here, unlike your rule (adjunct), because the evidence recommends three continuous weeks — keep it core, or make it an adjunct?" },
    { key: "device-magnet-heat", topic: "devices",
      ar: "المغناطيسُ مساعدٌ بقاعدتك والدليلُ ضعيفٌ جدّاً، والكمادةُ الحارّة للمرحلة الثالثة وحدها — أبقِهما؟",
      en: "Magnetic therapy is an adjunct by your rule with very weak evidence, and the hot pack is for phase 3 only — keep both?" },
    { key: "device-laser", topic: "devices",
      ar: "الليزر «لا يُستخدم» حتى تقرّر — وإعداداتُ التجربة المصرية (Alghamdi 2023) في ملاحظته إن جعلتَه مساعداً.",
      en: "Laser is 'Not used' until you decide — the Egyptian trial's settings (Alghamdi 2023) are in its note if you make it an adjunct." },
    { key: "measures-add", topic: "measures",
      ar: "أضف مقياسَ أكسفورد للركبة بالعربية من «المقاييس» ← مقياسٌ خاص (من ٠ إلى ٤٨، الأعلى أفضل) — الوحيدُ الموثّقُ بالعربية بعد الاستبدال (Bin Sheeha 2020).",
      en: "Add the Arabic Oxford Knee Score under 'Measures' → custom measure (0 to 48, higher is better) — the only Arabic score validated after replacement (Bin Sheeha 2020)." },
  ],
};

export const name = "139_physio_supervisor_checklist";

export const sql = [`
CREATE TABLE IF NOT EXISTS physio_protocol_checklist (
  id serial PRIMARY KEY,
  protocol_id integer NOT NULL REFERENCES physio_protocols(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  topic text NOT NULL,
  text_ar text NOT NULL,
  text_en text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  done_at timestamp,
  done_by integer,
  done_by_name text,
  note text,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT physio_protocol_checklist_protocol_id_item_key_key UNIQUE (protocol_id, item_key)
);
CREATE INDEX IF NOT EXISTS idx_physio_protocol_checklist_protocol ON physio_protocol_checklist(protocol_id);`,
  ...Object.entries(ITEMS).map(([code, items]) => checklistSql(code, items)),
].join("\n\n");
