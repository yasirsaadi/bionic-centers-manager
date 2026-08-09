// اختبار معماري — يحرس أن وحدة الأحداث طبقة سفلية لا تعرف الأعمال.
// بلا قاعدة بيانات: `npm run test:events-purity`.
//
// القاعدة: `server/events/*` لا تستورد `storage` ولا `manufacturing` ولا
// `accounting` ولا `medical` ولا `notifications` ولا أي وحدة أعمال أخرى.
// وحدة لا تستورد **لا تستطيع** أن تستدعي — فالضمان بنيوي لا وعد في تعليق،
// وهذا الاختبار هو ما يبقيه صحيحاً بعد سنة ومساعدين آخرين.
//
// ويحرس أيضاً القاعدة الثانية: لا كتابة على أي جدول غير `patientEvents`.
// سجل الأحداث لا يملك مالاً ولا رصيداً ولا حالة تصنيع ولا موعداً ولا حالة
// مريض. مخالفة ذلك تُنشئ مصدر حقيقة ثانياً.

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  ALL_PATIENT_EVENT_TYPES,
  CLINICAL_EVENT_TYPES,
  PATIENT_EVENT_LABELS_AR,
  PATIENT_EVENT_POLICY,
  VISIBILITY_POLICIES,
  isVisibilityAllowed,
} from "@shared/patient_events";

const DIR = join(import.meta.dirname, ".");

// ما يجوز لوحدة الأحداث أن تستورده. أي شيء خارج هذه القائمة يُرفض —
// قائمة بيضاء لا سوداء، فالوحدة الجديدة لا تمرّ بالسهو.
const ALLOWED_IMPORTS = [
  "../db",
  "@shared/schema",
  "@shared/patient_events",
  "drizzle-orm",
  "drizzle-orm/pg-core",
  "drizzle-orm/node-postgres",
  // ملفات الوحدة نفسها
  "./store",
];

// جداول يجوز لهذه الوحدة أن تكتب فيها. واحد لا غير.
const WRITABLE_TABLES = ["patientEvents"];

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
check(files.length > 0, `وُجدت ملفات الوحدة (${files.join("، ")})`);

console.log("\n── لا استيراد لأي وحدة أعمال ──");
for (const file of files) {
  const src = readFileSync(join(DIR, file), "utf8");

  // كل مواضع الاستيراد: import … from "x" و import type … from "x"
  // و import("x") الديناميكي و require("x").
  const specifiers = new Set<string>();
  for (const m of src.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s+["']([^"']+)["']/g)) specifiers.add(m[1]);
  for (const m of src.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) specifiers.add(m[1]);
  for (const m of src.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)) specifiers.add(m[1]);

  const forbidden = [...specifiers].filter((s) => !ALLOWED_IMPORTS.includes(s));
  check(
    forbidden.length === 0,
    `${file}: كل الاستيرادات ضمن القائمة البيضاء`,
    `مرفوض: ${forbidden.join("، ")}\n      المسموح: ${ALLOWED_IMPORTS.join("، ")}`,
  );
}

console.log("\n── لا كتابة على أي جدول غير patientEvents ──");
for (const file of files) {
  const src = readFileSync(join(DIR, file), "utf8");
  const writes = [
    ...src.matchAll(/\.\s*(?:insert|update|delete)\s*\(\s*([A-Za-z_$][\w$]*)/g),
  ].map((m) => m[1]);
  const illegal = writes.filter((t) => !WRITABLE_TABLES.includes(t));
  check(
    illegal.length === 0,
    `${file}: لا كتابة خارج ${WRITABLE_TABLES.join("، ")}`,
    `كتابة على: ${illegal.join("، ")}`,
  );
}

console.log("\n── لا نصّ حرّ لأنواع الأحداث خارج السجل ──");
{
  // السجل نفسه هو المكان الوحيد الذي تُعرَّف فيه القيم النصّية. وجودها
  // مكتوبةً داخل وحدة الكتابة يعني أن أحداً تجاوز السجل.
  const store = readFileSync(join(DIR, "store.ts"), "utf8");
  const literals = [...store.matchAll(/["'](?:patient|manufacturing|maintenance|payment|cost|visit|exam|prescription|appointment)\.[a-z_]+["']/g)];
  check(literals.length === 0, "store.ts لا يحوي نوع حدث مكتوباً نصّاً", `وُجد: ${literals.map((l) => l[0]).join("، ")}`);
}

console.log("\n── السجل المشترك متّسق ──");
{
  // يُفحَص بالاستيراد لا بالتعبير النمطي: قراءة الخرائط نفسها أوثق من
  // مطابقة أسطر نصّية تنكسر مع أول إعادة تنسيق.
  const missingPolicy = ALL_PATIENT_EVENT_TYPES.filter((t) => !(t in PATIENT_EVENT_POLICY));
  check(missingPolicy.length === 0, "كل نوع معلَن له سياسة صريحة", `بلا سياسة: ${missingPolicy.join("، ")}`);

  const badPolicy = ALL_PATIENT_EVENT_TYPES.filter((t) => !VISIBILITY_POLICIES.includes(PATIENT_EVENT_POLICY[t]));
  check(badPolicy.length === 0, "وكل سياسة من الدرجات الثلاث", `غير صالحة: ${badPolicy.join("، ")}`);

  const missingLabel = ALL_PATIENT_EVENT_TYPES.filter((t) => !PATIENT_EVENT_LABELS_AR[t]);
  check(missingLabel.length === 0, "وكل نوع له تسمية عربية", `بلا تسمية: ${missingLabel.join("، ")}`);

  // القاعدة الصلبة: لا حدث سريري يمكن أن يصل المريض — لا افتراضاً ولا
  // بتجاوز. تُفحَص عبر السياسة نفسها لا عبر القيمة الافتراضية.
  const leaky = CLINICAL_EVENT_TYPES.filter((t) => PATIENT_EVENT_POLICY[t] !== "internal_only");
  check(leaky.length === 0, "ولا حدث سريري خارج internal_only", `مخالف: ${leaky.join("، ")}`);

  const clinicalAllowed = CLINICAL_EVENT_TYPES.filter((t) => isVisibilityAllowed(t, "patient"));
  check(clinicalAllowed.length === 0, "والسياسة ترفض جعله patient فعلياً", `يقبل patient: ${clinicalAllowed.join("، ")}`);

  // وكل نوع يقبل التضييق إلى internal — زيادة الخصوصية لا تحتاج إذناً.
  const cannotNarrow = ALL_PATIENT_EVENT_TYPES.filter((t) => !isVisibilityAllowed(t, "internal"));
  check(cannotNarrow.length === 0, "وكل نوع يقبل التضييق إلى internal", `يرفض: ${cannotNarrow.join("، ")}`);
}

console.log(failures === 0 ? "\n✅ all events-purity cases pass" : `\n❌ ${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
