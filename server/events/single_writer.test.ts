// قاعدة الكاتب الواحد — تُفرَض على **كل** كود الخادم لا على وحدة الأحداث
// وحدها. بلا قاعدة بيانات: `npm run test:events-single-writer`.
//
// اختبار النقاء (`purity.test.ts`) يحرس ألّا تعرف وحدةُ الأحداث الأعمالَ.
// وهذا يحرس الاتجاه المعاكس: ألّا تكتب أي وحدة أعمال في الجدول مباشرةً.
// بدونه، يكفي أن يضيف أحدهم `tx.insert(patientEvents)` في `manufacturing`
// أو `routes` ليتجاوز `recordPatientEvent` كلّه — بسياستها في الوجهة،
// وحارس النوع، ومنع التكرار، وإلزام المعاملة.
//
// ── لماذا لا يكتفي الفحص بأسماء الدوالّ ─────────────────────────────────
// ثلاث طبقات، لا اسم دالّة في أيٍّ منها كدليل وحيد:
//   1. **قائمة ملفّات بيضاء** — الكتابة مسموحة في ملفّين اثنين لا غير.
//   2. **عدّ دقيق** — لكل عملية عدد متوقَّع بالضبط، فكتابة ثانية تُسقط
//      الاختبار ولو كانت داخل الملفّ المسموح.
//   3. **إسناد بالموضع** — كل كتابة تُنسَب إلى الدالّة التي تحويها فعلاً،
//      بحساب أقرب تعريف دالّة يسبقها في الملفّ، لا بمطابقة اسم في نصّ
//      مجاور. فنقلُ الكتابة إلى دالّة أخرى داخل نفس الملفّ يُكشَف.
// ويشمل الفحص SQL الخام أيضاً، فالتفافٌ عبر `sql\`UPDATE patient_events\``
// لا يمرّ.

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const SERVER_ROOT = join(import.meta.dirname, "..");

// الملفّ المسموح لكل عملية، والعدد المتوقَّع فيه، والدالّة التي يجب أن
// تحويه. أي انحراف عن هذا الجدول يُسقط الاختبار.
const SANCTIONED = [
  { op: "insert", file: "events/store.ts",  fn: "recordPatientEvent", count: 1 },
  { op: "update", file: "storage.ts",       fn: "mergePatients",      count: 1 },
  //  **`deletePatientTx` منذ مراجعة الذرّية (٢٠٢٦-٠٨-٢٤)** — الجسمُ
  //  الذرّيُّ الذي يحوي الكاسكيدَ فعلياً. `deletePatient` صار غلافاً
  //  رقيقاً يفتح معاملةً وينادي هذا الجسمَ، فلا DELETE في جسمه هو.
  { op: "delete", file: "storage.ts",       fn: "deletePatientTx",    count: 1 },
] as const;

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

// ── جمع ملفّات الخادم ────────────────────────────────────────────────────
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { walk(full, out); continue; }
    if (!entry.endsWith(".ts")) continue;
    if (entry.endsWith(".test.ts")) continue; // الاختبارات تكتب بيانات تجريبية عمداً
    out.push(full);
  }
  return out;
}
const files = walk(SERVER_ROOT).map((f) => ({ path: f, rel: relative(SERVER_ROOT, f).replace(/\\/g, "/") }));
check(files.length > 10, `مُسحت ملفّات الخادم (${files.length} ملفّاً)`);

// ── إيجاد كل كتابة على الجدول، عبر Drizzle أو SQL خام ───────────────────
interface Write { rel: string; op: string; offset: number; snippet: string }
const writes: Write[] = [];

for (const { path, rel } of files) {
  const src = readFileSync(path, "utf8");

  // (أ) باني Drizzle: ‎.insert(patientEvents) / .update(...) / .delete(...)
  for (const m of src.matchAll(/\.\s*(insert|update|delete)\s*\(\s*patientEvents\b/g)) {
    writes.push({ rel, op: m[1], offset: m.index ?? 0, snippet: m[0] });
  }

  // (ب) SQL خام يمسّ الجدول بأي عملية كتابة — الالتفاف الواضح.
  for (const m of src.matchAll(/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+patient_events\b/gi)) {
    const op = /^INSERT/i.test(m[1]) ? "insert" : /^UPDATE/i.test(m[1]) ? "update" : "delete";
    writes.push({ rel, op, offset: m.index ?? 0, snippet: m[0].replace(/\s+/g, " ") });
  }
}

// ── إسناد كل كتابة إلى الدالّة التي تحويها، بالموضع لا بالاسم ───────────
function enclosingFunction(src: string, offset: number): string {
  // تعريفات الدوالّ بكل أشكالها في هذا المشروع: توابع الصنف، والدوالّ
  // المُصدَّرة، والدوالّ العادية.
  const decls = [
    ...src.matchAll(/(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g),
    ...src.matchAll(/(?:^|\n)\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*[:{]/g),
  ]
    .map((m) => ({ name: m[1], at: m.index ?? 0 }))
    .filter((d) => d.at < offset)
    .sort((a, b) => a.at - b.at);
  return decls.length ? decls[decls.length - 1].name : "<top-level>";
}

console.log("\n── كل كتابة على patient_events مُصرَّح بها ──");
for (const w of writes) {
  const rule = SANCTIONED.find((s) => s.op === w.op && s.file === w.rel);
  if (!rule) {
    check(false, `كتابة غير مصرَّح بها: ${w.op.toUpperCase()} في ${w.rel}`,
      `«${w.snippet}» — الكتابة على patient_events تمرّ عبر recordPatientEvent حصراً.`);
    continue;
  }
  const src = readFileSync(join(SERVER_ROOT, w.rel), "utf8");
  const fn = enclosingFunction(src, w.offset);
  check(fn === rule.fn,
    `${w.op.toUpperCase()} في ${w.rel} داخل ${rule.fn}()`,
    `وُجد داخل ${fn}() بدل ${rule.fn}()`);
}

console.log("\n── العدد المتوقَّع بالضبط، فلا كتابة ثانية تختبئ ──");
for (const rule of SANCTIONED) {
  const found = writes.filter((w) => w.op === rule.op && w.rel === rule.file);
  check(found.length === rule.count,
    `${rule.op.toUpperCase()} في ${rule.file}: ${rule.count}`,
    `وُجد ${found.length}`);
}

console.log("\n── لا وحدة أعمال تلمس الجدول إطلاقاً ──");
{
  const businessDirs = ["manufacturing/", "accounting/", "medical/", "anomalies/", "sessions_module/", "notifications/", "followups/", "ai/"];
  const offenders = writes.filter((w) => businessDirs.some((d) => w.rel.startsWith(d)));
  check(offenders.length === 0, "لا كتابة من التصنيع/المحاسبة/المعاينات/غيرها",
    offenders.map((o) => `${o.rel}: ${o.op}`).join("، "));

  const routeOffenders = writes.filter((w) => w.rel.endsWith("routes.ts"));
  check(routeOffenders.length === 0, "ولا من أي ملفّ نقاط REST",
    routeOffenders.map((o) => `${o.rel}: ${o.op}`).join("، "));
}

console.log("\n── ولا أحد يفتح باب الختم خارج مسار الدمج ──");
{
  // الترحيلات مستثناة: هي التي **تعرّف** الترِكر والباب، وذكرُ الاسم فيها
  // تعريفٌ لا استعمال. وهي مراجَعة SQL على أي حال، وفيها مخرج الطوارئ
  // الموثَّق للمالك.
  const door = files
    .filter(({ rel }) => !rel.startsWith("migrations/"))
    .flatMap(({ path, rel }) => {
      const src = readFileSync(path, "utf8");
      return [...src.matchAll(/app\.allow_event_edit/g)].map((m) => ({ rel, offset: m.index ?? 0, src }));
    });
  const outside = door.filter((d) => !(d.rel === "storage.ts" && enclosingFunction(d.src, d.offset) === "mergePatients"));
  check(outside.length === 0, "app.allow_event_edit لا يُفتح إلا في mergePatients()",
    [...new Set(outside.map((o) => o.rel))].join("، "));
  check(door.length > 0, "والباب مستعمَل فعلاً في مسار الدمج (لا فحص فارغ)");
}

console.log(failures === 0 ? "\n✅ all single-writer cases pass" : `\n❌ ${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
