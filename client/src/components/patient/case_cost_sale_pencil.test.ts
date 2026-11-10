//  **قلمُ «التكلفة» على قسمٍ مُباع هو «تصحيح سعر البيع»** (§4.gh — قرارُ المالك ٢٠٢٦-١١-١٠: «إن عدّلتُ من الأعلى أو من الأسفل يتعدّل في
//  كلّ مكان»). عقدُ الشاشة على المكوّن الحقيقيّ: القلمُ يفتح النافذةَ نفسَها لا الكتابةَ الحرّة، ويُخفى عمّن لا يصحّح، و«تعديل مريض» لا
//  يغيّر الكلفة، والخطأُ يُقرأ نصّاً لا «409: {…}». والسلوكُ الحيّ في `test:sale-price-correction` (ي١–ي١٠).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let fails = 0;
const check = (cond: boolean, msg: string) => { console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}`); if (!cond) fails++; };

const tabs = readFileSync(join(here, "PatientCasesTabs.tsx"), "utf8");
const spc = readFileSync(join(here, "..", "SalePriceCorrection.tsx"), "utf8");
const edit = readFileSync(join(here, "..", "..", "pages", "EditPatient.tsx"), "utf8");

check(/const pencilIsSaleCorrection = saleCorrections\.length > 0;/.test(tabs)
  && /if \(!pencilIsSaleCorrection\) \{ setDraft\(caseRow\.cost \|\| 0\); setEditing\(true\); return; \}/.test(tabs),
  "١. القلمُ يكتب حرّاً على قسمٍ بلا بيعٍ وحده");
check(/\(pencilIsSaleCorrection \? correctable\.length > 0 : canEditCost\) && !editing/.test(tabs),
  "٢. وعلى قسمٍ مُباع يظهر لمن يصحّح وحده");
check(/<SalePriceCorrection[\s\S]{0,700}hideTrigger open onOpenChange=/.test(tabs) && /onClick=\{onPencil\}/.test(tabs),
  "٣. **والضغطُ يفتح «تصحيح سعر البيع» نفسَه** بلا زرٍّ ثانٍ");
check(/drift=\{correcting\.costDrift \?\? null\}/.test(tabs) && /drift=\{active\.saleCostDrift \?\? null\}/.test(readFileSync(join(here, "..", "PostExamDecisionCard.tsx"), "utf8")),
  "٣ب. **والانحرافُ يصل النافذةَ من البابين** فتقوله من أوّل فتحها");
check(/الجهاز #\$\{x\.sequenceNumber\}/.test(tabs) && !/الجهاز \{i \+ 1\}/.test(tabs),
  "٣ج. واختيارُ الجهاز برقمه في الملفّ لا بترتيب القائمة");
check(/correctable\.length === 1\) setCorrectingId\(correctable\[0\]\.followupId\);\s*else setPickDevice\(true\);/.test(tabs),
  "٤. ولقسمٍ بأكثر من جهاز يُسأل: أيُّ جهاز");
check(/e\?\.body\?\.code === "case_cost_edit_absorb"/.test(spc) && /absorbCaseCostEdit: absorb/.test(spc)
  && /setAbsorb\(net !== 0 \? net : null\)/.test(spc),
  "٥. وما عُدّل بعد البيع يُطوى بموافقةٍ على صافيه بعينه — معروضاً من أوّل الفتح");
check(/\(!unchanged \|\| absorb !== null\)/.test(spc) && /مطابقة الكلفة لسعر البيع/.test(spc),
  "٥ب. والسعرُ نفسُه يُحفظ «مطابقةً للكلفة» حين على القسم ما يُطوى");
check(/\{serverError && \(/.test(spc) && /clearError\(\); setOriginal/.test(spc),
  "٥ج. والخطأُ يظهر ولو مع سؤال الطيّ، ويُمحى حين تتغيّر الخانات");
check(!/apiRequest\(/.test(spc) && /body\?\.error \?\? body\?\.message/.test(spc),
  "٦. والخطأُ نصُّه لا «409: {…}»");
check(/disabled=\{costLockedBySale\}/.test(edit) && /activeForCost\.length === 1 && \(activeForCost\[0\]\.saleCorrections\?\.length \?\? 0\) === 0/.test(edit)
  && /canCorrectHere/.test(edit),
  "٧. و«تعديل مريض» يعرض الكلفةَ لمريضٍ له جهازٌ مُباع ولا يغيّرها");

console.log(`\n${fails === 0 ? "✅ كلُّها نجحت" : `❌ ${fails} فشل`}`);
process.exit(fails === 0 ? 0 : 1);
