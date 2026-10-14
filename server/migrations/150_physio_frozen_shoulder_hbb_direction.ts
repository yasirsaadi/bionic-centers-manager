// Migration 150: مسافةُ اليد خلف الظهر في الكتف المتجمّد — بإشارة، والأكثرُ أفضل (§4.eg التكملة — ٢٠٢٦-١٠-١٤).
//
// مراجعةُ Codex على الطلب ٦٥٢ بعد دمجه: ترحيلُ ١٤٩ كتب في «التقييم» وفي بند سليم «المقاييس» أنّ مسافةَ الإبهام خلف الظهر «الأقلّ أفضل» —
// **والدراسةُ التي يستشهد بها تقيسها بإشارة** (van den Dolder 2014، من ملخّصها في Europe PMC): من منتصف الخطّ بين الشوكتين الخلفيّتين للحوض
// إلى طرف الإبهام، **موجبةً فوقه وسالبةً تحته** — فارتفاعُها تحسّن، و«الأقلّ أفضل» يقلب اتّجاهَ منحنى التقدّم عند المشرف إن اتّبع البند.
// فيُصحَّح النصّان، **ولا يُكتب فوق تعديل إنسان**: يتغيّر الحقلُ إن كان كما زرعه ١٤٩ بالضبط، وإلّا بقي كما عدّله المشرف — وتكرارُه لا يفعل شيئاً.
// والبندُ يتغيّر نصُّه وحده: إن كان سليم علّمه «تمّ» بقي معلَّماً. وخانةُ القياس تقبل السالب حين يكون «الأدنى» سالباً (§4.cp) — فالبندُ يقوله.
import { lit } from "./physio_content";
import { CHECKLIST, PROTOCOL } from "./149_physio_frozen_shoulder_detail";

/** ما يتغيّر في كلّ نصّ: القديمُ كما كتبه ١٤٩ حرفاً بحرف ⟵ الجديد. */
export const FIXES = {
  assessmentAr: [
    "ومسافةَ الإبهام عن خطّ الحوض خلف الظهر بالشريط (سم — أوثقُ من عدّ الفقرات: Edwards 2002 · van den Dolder 2014)",
    "ومسافةَ طرف الإبهام خلف الظهر عن منتصف الخطّ بين الشوكتين الخلفيّتين للحوض بالشريط (سم بإشارة: موجبةٌ فوقه وسالبةٌ تحته، فارتفاعُها تحسّن؛ والتغيّرُ الحقيقيّ عند الأصحّاء ١٫٣ سم — وهي أوثقُ من عدّ الفقرات: Edwards 2002 · van den Dolder 2014)",
  ],
  assessmentEn: [
    "the thumb-to-pelvis distance behind the back with a tape (cm — more reliable than counting vertebral levels: Edwards 2002 · van den Dolder 2014)",
    "the hand-behind-back distance from the midpoint between the posterior superior iliac spines to the thumb tip, with a tape (signed cm: positive above, negative below, so a higher value is better; smallest real change 1.3 cm in healthy adults — more reliable than counting vertebral levels: Edwards 2002 · van den Dolder 2014)",
  ],
  checklistAr: [
    "ومسافةَ الإبهام خلف الظهر بالسنتيمتر (الأقلّ أفضل)",
    "ومسافةَ طرف الإبهام خلف الظهر عن منتصف الشوكتين الخلفيّتين للحوض بالسنتيمتر — بإشارة: موجبةٌ فوقه وسالبةٌ تحته (الأكثر أفضل، واجعل «الأدنى» سالباً مثل −٣٠ ليُقبل ما تحت الحوض)",
  ],
  checklistEn: [
    "the thumb-to-pelvis distance behind the back in cm (lower is better)",
    "the hand-behind-back distance from the midpoint between the posterior superior iliac spines to the thumb tip in cm — signed, positive above and negative below (higher is better; set the minimum negative, e.g. −30, so values below the pelvis are accepted; van den Dolder 2014)",
  ],
} as const;

const fix = (text: string, [from, to]: readonly [string, string]) => text.replace(from, to);
const item = CHECKLIST.find((i) => i.key === "measures-add")!;

/** النصوصُ قبل وبعد — يقرؤها الاختبار. */
export const TEXTS = {
  assessmentAr: [PROTOCOL.assessment[0], fix(PROTOCOL.assessment[0], FIXES.assessmentAr)],
  assessmentEn: [PROTOCOL.assessment[1], fix(PROTOCOL.assessment[1], FIXES.assessmentEn)],
  checklistAr: [item.ar, fix(item.ar, FIXES.checklistAr)],
  checklistEn: [item.en, fix(item.en, FIXES.checklistEn)],
} as const;

const code = lit(PROTOCOL.code);
export const name = "150_physio_frozen_shoulder_hbb_direction";
export const sql = [
  `UPDATE physio_protocols SET assessment = ${lit(TEXTS.assessmentAr[1])}, updated_at = now()
WHERE code = ${code} AND assessment = ${lit(TEXTS.assessmentAr[0])};`,
  `UPDATE physio_protocols SET assessment_en = ${lit(TEXTS.assessmentEn[1])}, updated_at = now()
WHERE code = ${code} AND assessment_en = ${lit(TEXTS.assessmentEn[0])};`,
  `UPDATE physio_protocol_checklist c SET text_ar = ${lit(TEXTS.checklistAr[1])}
FROM physio_protocols p WHERE p.id = c.protocol_id AND p.code = ${code} AND c.item_key = 'measures-add' AND c.text_ar = ${lit(TEXTS.checklistAr[0])};`,
  `UPDATE physio_protocol_checklist c SET text_en = ${lit(TEXTS.checklistEn[1])}
FROM physio_protocols p WHERE p.id = c.protocol_id AND p.code = ${code} AND c.item_key = 'measures-add' AND c.text_en = ${lit(TEXTS.checklistEn[0])};`,
].join("\n");
