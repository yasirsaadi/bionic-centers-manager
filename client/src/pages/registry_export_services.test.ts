//  `npm run test:registry-export-services` — منطقُ أقسام التصدير، بلا قاعدة.
import { exportServicesParam, exportServicesLabel, exportServicesFileTag, ALL_EXPORT_SERVICES } from "./registry_export_services";
let failures = 0;
const same = (m: string, got: unknown, exp: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${m}${ok ? "" : `\n      expected ${JSON.stringify(exp)} got ${JSON.stringify(got)}`}`);
};
same("قسمٌ واحد", exportServicesParam(["physiotherapy"]), "physiotherapy");
same("قسمان — بترتيبٍ ثابت أيّاً كان ترتيبُ الاختيار", exportServicesParam(["medical_support", "physiotherapy"]), "physiotherapy,medical_support");
same("**الثلاثة = لا ترشيح** (فيبقى مَن لا قسمَ له)", exportServicesParam(ALL_EXPORT_SERVICES), null);
same("ولا شيء = لا ترشيح", exportServicesParam([]), null);
same("وقيمةٌ غريبة تسقط", exportServicesParam(["x", "prosthetic"]), "prosthetic");
same("العنوانُ لقسمين", exportServicesLabel(["prosthetic", "physiotherapy"]), "علاج طبيعي + أطراف صناعية");
same("والعنوانُ للكلّ", exportServicesLabel(ALL_EXPORT_SERVICES), "كل الأقسام");
same("ووسمُ الملفّ", [exportServicesFileTag(["medical_support"]), exportServicesFileTag(ALL_EXPORT_SERVICES)], ["medical_support", "all"]);
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
