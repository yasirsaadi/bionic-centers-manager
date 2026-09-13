// **عقدُ صفحة أمر التصنيع مع الخادم** — مواصفاتُ الجهاز من معاينته هو
// (المرحلة الثانية من قطار الإصلاح، MULTI-2). `npm run test:manufacturing-order-ui`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// الخادمُ صار يرسل `deviceSpecs` من وصفة حلقة الأمر بعينها ويُعلن مصدرَها.
// وشاشةٌ تبقى تقرأ `patient.prostheticType`/`injurySide` وحدهما تعرض للخبير
// مواصفاتِ آخر جهازٍ عُوين لا جهازَه — وهو بالضبط ما أُعيد إنتاجُه.
//
// ══ ولماذا يُقرأ المصدر ═════════════════════════════════════════════════
// لا مُشغِّل DOM في هذا الريبو، واختبارُ الخادم (`test:device-prescription`)
// يثبت الحقلَ في الاستجابة لا في الشاشة.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
const read = (rel: string) => readFileSync(join(import.meta.dirname, rel), "utf8");
const page = read("./ManufacturingOrder.tsx");

console.log("\n═══ عقدُ مواصفات الجهاز في صفحة الأمر ═══\n");

check("١. الصفحةُ تقرأ `deviceSpecs` من استجابة الأمر",
  page.includes("const { order, patient, deviceSpecs, timeline, rework, dateChanges = [] } = data;"));
check("٢. **بطاقةٌ لمواصفات هذا الجهاز** حين يكون المصدرُ معاينته",
  page.includes('deviceSpecs?.source === "exam"') && page.includes('data-testid="card-device-specs"'));
check("٣. والقوائمُ القانونية نفسُها لا قائمةٌ ثانية",
  page.includes('import { PROSTHETIC_SPECS, SUPPORT_SPECS } from "@shared/case_fields";')
  && page.includes('(order.serviceType === "medical_support" ? SUPPORT_SPECS : PROSTHETIC_SPECS).map((f) =>'));
check("٤. وموقعُ البتر وجهةُ الإصابة من الجهاز نفسِه",
  page.includes("value={deviceSpecs.specs.amputationSite}") && page.includes("value={deviceSpecs.specs.injurySide}"));
check("٥. ويسمّي الجهازَ برقمه وما طُلب ومَن عاينه",
  page.includes("جهاز #{order.sequenceNumber}") && page.includes("requestedItemLabel(order.requestedItem ?? null, order.serviceType)")
  && page.includes("deviceSpecs.doctorName"));
check("٦. **والأمرُ الموروث يُقال عنه صراحةً** ويبقى على ملفّ المريض",
  page.includes('data-testid="note-device-specs-patient-file"')
  && page.includes("أمرٌ بلا معاينة جهازٍ مرتبطة — المواصفات أدناه من ملف المريض كما كان."));
// ══ ولا يُخفى عن الخبير ما كان يقرؤه ═══════════════════════════════════
// موقعُ البتر وجهةُ الإصابة ليسا من مفاتيح الوصفة، والبانيَ اختياريٌّ في
// نافذة التوقيع — فإخفاءُ أعمدة الملفّ متى عُرفت المعاينةُ كان يترك شاشةَ
// الخبير بلا موقعِ بترٍ إطلاقاً. فتبقى معروضةً دائماً ويُقال من أين هي.
check("٧. **أعمدةُ المريض السريرية معروضةٌ دائماً** — لا تُخفى بوجود معاينة",
  page.includes('<Info label="موقع البتر" value={patient?.amputationSite} />')
  && page.includes('<Info label="جهة الإصابة" value={patient?.injurySide} />')
  && !/deviceSpecs\?\.source !== "exam" && \(\s*<>\s*<Info label="موقع البتر"/.test(page));
check("٨. **ويُقال إنها من الملفّ** حين تُعرَف معاينةُ الجهاز — فلا تُقرأ مواصفاتِه",
  page.includes('data-testid="note-patient-file-specs"')
  && page.includes('المعتمَد لهذا الجهاز ما في بطاقة معاينته أعلاه.'));

console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
process.exit(failures === 0 ? 0 : 1);
