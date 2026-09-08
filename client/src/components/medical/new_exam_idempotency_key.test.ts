// **دورةُ حياة مفتاح تطابق إنشاء المعاينة** (migration 074، تصحيحٌ لاحق).
// `npm run test:exam-idempotency-key`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// كان توليدُ المفتاح يعيش داخل أثر إعادة الضبط الأعرض، باعتماديات
// `preferSpecialty`/`specialties.join(",")` — فتغيّرُ أيٍّ منهما بينما
// النافذةُ **لا تزال مفتوحة** كان يُعيد توليد مفتاحٍ جديد، فتفقد إعادةُ
// محاولةٍ لنفس الحفظ مفتاحَها الثابت في المنتصف — عكسَ ما صُمِّم له تماماً.
//
// ══ ولماذا يُقرأ المصدر ═════════════════════════════════════════════════
// لا مُشغِّل DOM في هذا الريبو (نفسُ قيد `add_case_type_ui.test.ts`)، فدورةُ
// حياة أثرٍ لا تُختبَر بمحاكاة رسمٍ حقيقية — تُختبَر بقراءة العقد نفسه في
// المصدر: أيّ اعتمادياتٍ يحملها كلُّ أثر، وأين يقع توليدُ المفتاح بالضبط.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

const exam = readFileSync(join(import.meta.dirname, "./NewExamDialog.tsx"), "utf8");

console.log("\n═══ دورةُ حياة مفتاح تطابق الإنشاء ═══\n");

// ── ١. المفتاحُ في `useRef` لا `useState` ───────────────────────────────
check("١. **المرجعُ `useRef` لا `useState`** — لا يستحقّ إعادةَ رسم",
  /const newExamIdempotencyKeyRef = useRef<string>\(""\);/.test(exam));

// ── ٢. أثرُ دورة الحياة قائمٌ بذاته، بمعرّفَين اثنين فقط ─────────────────
console.log("── أثرُ دورة الحياة ──");
const lifecycleEffect =
  /useEffect\(\(\) => \{\s*if \(open && !isEdit\) newExamIdempotencyKeyRef\.current = crypto\.randomUUID\(\);\s*\}, \[open, isEdit\]\);/
    .exec(exam);
check("٢. **أثرٌ مستقلّ يولّد المفتاح بشرط `open && !isEdit` بالضبط**",
  !!lifecycleEffect, "لم يُعثَر على الشكل المتوقَّع حرفياً");
check("٣. **واعتماديتاه `[open, isEdit]` وحدهما** — لا ثالثةَ لهما",
  !!lifecycleEffect && / \}, \[open, isEdit\]\);$/.test(lifecycleEffect![0]));
for (const stray of ["preferSpecialty", "specialties", "patientRow", "specialty"]) {
  check(`٤. **ولا \`${stray}\` في اعتماديات هذا الأثر أو جسمه**`,
    !!lifecycleEffect && !lifecycleEffect![0].includes(stray),
    lifecycleEffect?.[0]);
}

// ── ٣. أثرُ إعادة الضبط الأعرض يبقى كما كان، ولم يعد يولّد المفتاح ───────
console.log("── أثرُ إعادة الضبط الأعرض ──");
const resetEffectMatch =
  /\/\/ Reset on every open[\s\S]*?\}, \[open, exam\?\.id, preferSpecialty, specialties\.join\(","\)\]\);/
    .exec(exam);
check("٥. **أثرُ إعادة الضبط لا يزال قائماً باعتمادياته الأصلية** — لم يُمَسّ",
  !!resetEffectMatch, "لم يُعثَر على أثر إعادة الضبط بشكله المتوقَّع");
check("٦. **ولم يعد يولّد المفتاح** — `crypto.randomUUID` غائبةٌ عن جسمه تماماً",
  !!resetEffectMatch && !resetEffectMatch![0].includes("crypto.randomUUID"),
  resetEffectMatch?.[0]);

// ── ٤. المفتاحُ يُولَّد في مكانٍ واحد بالضبط في كامل الملفّ ──────────────
const genCount = (exam.match(/crypto\.randomUUID\(\)/g) ?? []).length;
check("٧. **`crypto.randomUUID()` تظهر مرّةً واحدة بالضبط في كامل الملفّ**",
  genCount === 1, `ظهرت ${genCount} مرّة`);

// ── ٥. التعديلُ لا يرسل مفتاح إنشاءٍ — بلا تغيير عن التصميم الأصليّ ──────
console.log("── الإرسالُ ──");
check("٨. **جسمُ الحفظ يُسقط المفتاح صراحةً في وضع التعديل**",
  /\.\.\.\(isEdit \? \{\} : \{ idempotencyKey: newExamIdempotencyKeyRef\.current \}\),/.test(exam));

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}`);
process.exit(failures === 0 ? 0 : 1);
