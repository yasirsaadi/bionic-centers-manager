// مراجعةُ أزرار ملفّ المريض وصفحة التصنيع (§4.bp) — `npm run test:patient-buttons`.
//
// ١. «بدء التصنيع وإسناد خبير» خرج من ملفّ المريض، و«أمر تصنيع لمريض موجود» من صفحة التصنيع.
// ٢. «إرسال لمراجعة الطبيب» لمن يملك إرسالَه وحدَه، وبلا «صيانة» ولا «جهاز جديد» — وإعادةُ الإرسال تُبقي سببَها.
// ٣. رسالةُ رفض قلم كلفة القسم تدلّ على «تحديد السعر النهائي» لا على طلبٍ تقاعد.
// ٤. حذفُ المستند لمن يحذف فعلاً (كالخادم) وبتأكيد.

import { readFileSync } from "fs";
import { join } from "path";
import {
  PATIENT_PAGE_REVIEW_KINDS, reviewKindsForDialog, canCreateReview,
} from "@shared/medical_review";

let failures = 0;
function check(ok: boolean, msg: string, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok || detail === undefined ? "" : `\n      ${JSON.stringify(detail)}`}`);
}
const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
/** الشيفرة بلا تعليقات — فالتعليقُ الذي يشرح ما حُذف ليس بقيّةً منه. */
const code = (rel: string) =>
  read(rel).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const details = code("client/src/pages/PatientDetails.tsx");
const mfg = code("client/src/pages/Manufacturing.tsx");
const dialog = code("client/src/components/medical/SendToDoctorReviewDialog.tsx");
const routes = code("server/routes.ts");

console.log("\n── ١. بابا الأمر بلا معاينة ──");
check(!/StartManufacturingDialog/.test(details), "١أ. ملفُّ المريض لا يعرض «بدء التصنيع وإسناد خبير»");
check(!/CreateOrderDialog/.test(mfg) && !/أمر تصنيع لمريض موجود/.test(mfg),
  "١ب. وصفحةُ التصنيع لا تعرض «أمر تصنيع لمريض موجود»");

console.log("\n── ٢. إرسالٌ لمراجعة الطبيب ──");
check(/canCreateReview\(branchSession as any\) && \(\s*<div[^>]*>\s*<SendToDoctorReviewDialog/.test(details),
  "٢أ. الزرُّ في ملفّ المريض خلف `canCreateReview` — نفسِ حارس الخادم");
check(canCreateReview({ isAdmin: false, permissions: { canAddPatients: false } } as any) === false
  && canCreateReview({ isAdmin: false, permissions: { canAddPatients: true } } as any) === true,
  "٢ب. والحارسُ مفتاحُ «إضافة المرضى» (موظّفٌ بلاه لا يرى الزرَّ)");
check(JSON.stringify(PATIENT_PAGE_REVIEW_KINDS) === JSON.stringify(["adjustment", "follow_up", "other"]),
  "٢ج. أسبابُ النافذة: تعديل · متابعة · أخرى — بلا صيانة ولا جهاز جديد", PATIENT_PAGE_REVIEW_KINDS);
check(JSON.stringify(reviewKindsForDialog()) === JSON.stringify(PATIENT_PAGE_REVIEW_KINDS),
  "٢د. ومن ملفّ المريض (بلا إعادة إرسال) القائمةُ الأضيق وحدها");
check(reviewKindsForDialog("new_device")[0] === "new_device"
  && reviewKindsForDialog("maintenance")[0] === "maintenance",
  "٢هـ. وإعادةُ إرسال طلبٍ مُرجَع تُبقي سببَه الأصليّ أوّلاً");
check(!reviewKindsForDialog("return_to_purchase").includes("return_to_purchase"),
  "٢و. و«عاد للشراء» لا تدخل النافذةَ اليدوية بحال");
check(/reviewKindsForDialog\(resend\?\.reviewKind\)/.test(dialog) && /kinds\.map\(/.test(dialog)
  && !/"maintenance"\)/.test(dialog),
  "٢ز. والنافذةُ تعرض هذه القائمةَ، وافتراضُها ليس «صيانة»");

console.log("\n── ٣. رسالةُ قلم الكلفة ──");
const msg = (routes.match(/message: "(?:سعر هذا الجهاز|لهذا القسم جهازٌ)[^"]*"/) ?? [""])[0];
//  وتصحيحٌ (§4.bt): «تحديد السعر النهائي» لا يظهر في البيع الجديد — السعرُ يُكتب في «إتمام البيع».
check(/إتمام البيع/.test(msg) && /لم يشترِ/.test(msg) && !/طلب تعديل سعر/.test(msg) && !/تحديد السعر النهائي/.test(msg),
  "٣. رفضُ تعديل كلفة جهازٍ تحت متابعة يدلّ على «إتمام البيع» أو «لم يشترِ»", msg);

console.log("\n── ٤. حذفُ المستند ──");
//  منذ §4.ch بـ`hasRole` (الأدوارُ كلُّها) — والقاعدةُ هي هي في الطرفين.
check(/const mayDeleteDocuments = isAdmin \|\| hasRole\(branchSession, "branch_manager"\);/.test(details),
  "٤أ. مَن يحذف = المسؤول أو مدير الفرع — كـ`isAdminOrManager` في الخادم");
check(/isAdminOrManager = [\s\S]{0,200}branchSession\?\.isAdmin\) \|\| hasRole\(branchSession, "branch_manager"\)/.test(routes),
  "   والخادمُ ما زال يحكم بالقاعدة نفسها");
const delIdx = details.indexOf("button-delete-doc-");
const before = details.slice(Math.max(0, delIdx - 600), delIdx);
check(delIdx > 0 && /mayDeleteDocuments && \(\s*<AlertDialog>/.test(before),
  "٤ب. والزرُّ خلف الصلاحية وداخل نافذة تأكيد");
const confirmIdx = details.indexOf("confirm-delete-doc-");
check(confirmIdx > delIdx
  && /onClick=\{\(\) => deleteDocument\(/.test(details.slice(delIdx, confirmIdx))
  && (details.match(/deleteDocument\(\{/g) ?? []).length === 1,
  "٤ج. والحذفُ لا يقع إلّا من زرّ التأكيد");

if (failures > 0) { console.log(`\n❌ ${failures} فشل`); process.exit(1); }
console.log("\n✅ كل فحوص أزرار الملفّ نجحت");
