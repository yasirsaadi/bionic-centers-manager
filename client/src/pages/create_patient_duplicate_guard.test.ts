// اختبارُ عقدِ شاشة منع تكرار الاسم عند التسجيل — بادئةٌ حيّة، حدٌّ
// أحمر/أخضر، بلا كشفِ بيانات. `npm run test:create-patient-duplicate-guard`.
//
// ══ ولماذا يُقرأ المصدر لا يُشغَّل رسمٌ حقيقيّ ═══════════════════════════
// لا مُشغِّل DOM في هذا الريبو (نفسُ قيد `add_case_type_ui.test.ts` و
// `new_exam_idempotency_key.test.ts`) — فعقدُ الشاشة يُختبَر بقراءة
// المصدر نفسه: أيُّ حالةٍ باقية، وأيُّ حالةٍ أُزيلت، وأين يقع الحدُّ
// اللونيّ والرسالةُ ومنعُ الحفظ بالضبط.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

const src = readFileSync(join(import.meta.dirname, "./CreatePatient.tsx"), "utf8");

console.log("\n═══ عقدُ شاشة منع تكرار الاسم عند التسجيل ═══\n");

// ── ١. البطاقةُ الكهرمانيةُ القديمة أُزيلت بالكامل ───────────────────────
console.log("── إزالةُ البطاقة القديمة ──");
check("١. **`otherBranchMatches` غابت تماماً عن الملفّ**",
  !src.includes("otherBranchMatches"));
check("٢. **ولا استدعاءَ لـ`lookup-by-name` من هذا الملفّ بعد اليوم**",
  !src.includes("lookup-by-name"));
check("٣. **والبطاقةُ الكهرمانيةُ (amber) غابت من نموذج التسجيل**",
  !/border-amber-300/.test(src) && !src.includes("notice-patient-other-branch"));

// ── ٢. حالةُ التحقّق الجديدة ──────────────────────────────────────────
console.log("── حالةُ التحقّق ──");
const nameCheckState = /const \[nameCheck, setNameCheck\] = useState<\{([\s\S]*?)\}>\(\{ status: "empty" \}\);/
  .exec(src);
check("٤. **`nameCheck` بحالاتها الخمس بالضبط، ورسالةٌ اختيارية من الخادم (تصحيحٌ لاحق: السلّة)**",
  !!nameCheckState
    && /status: "empty" \| "checking" \| "available" \| "conflict" \| "error";/.test(nameCheckState[1])
    && /message\?: string;/.test(nameCheckState[1]),
  nameCheckState?.[1] ?? "لم يُعثَر على إعلان الحالة");

// ── ٣. الرسالةُ المعتمَدة — نصٌّ ثابتٌ بالحرف (owner-approved) ───────────
console.log("── الرسالةُ المعتمَدة ──");
const REQUIRED_MESSAGE = "يوجد اسم مسجل يبدأ بهذا الاسم، أكمل كتابة الاسم.";
check("٥. **الرسالةُ العربية المطلوبة موجودةٌ بالحرف**",
  src.includes(REQUIRED_MESSAGE));
check("٦. **ومُعرَّفةٌ مرّةً واحدة بثابتٍ يُستعمَل في كلّ مكان (لا تكرارَ نصّي)**",
  (src.match(new RegExp(REQUIRED_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length === 1);

// ── ٤. أثرُ الفحص المُهدَّأ يستهدف النقطة الجديدة ────────────────────────
console.log("── أثرُ الفحص ──");
const effectMatch = /useEffect\(\(\) => \{[\s\S]*?name-availability[\s\S]*?\}, \[typedName\]\);/.exec(src);
check("٧. **أثرٌ يستهدف `/api/patients/name-availability` باعتماديةٍ `[typedName]` وحدها**",
  !!effectMatch, "لم يُعثَر على الشكل المتوقَّع");
check("٨. **ويُهدَّأ بمهلة `setTimeout`**",
  !!effectMatch && /setTimeout\(/.test(effectMatch[0]));
check("٩. **وينتقل إلى «قيدَ التحقّق» فوراً قبل المهلة — لا يبقى الحدُّ القديم معلَّقاً**",
  !!effectMatch && /setNameCheck\(\{ status: "checking" \}\)/.test(effectMatch[0]));
check("١٠. **وله تنظيفٌ يُلغي الطلبَ البائت (`cancelled`)**",
  !!effectMatch && /cancelled = true/.test(effectMatch[0]));

// ── ٥. الحدُّ اللونيّ على حقل الاسم ──────────────────────────────────────
console.log("── الحدُّ اللونيّ ──");
check("١١. **أحمر عند `conflict`**",
  /nameCheck\.status === "conflict" \? " border-red-500/.test(src));
check("١٢. **أخضر عند `available`**",
  /nameCheck\.status === "available" \? " border-green-500/.test(src));

// ── ٦. الرسالةُ تحت الحقل — فقط عند الحجب ────────────────────────────────
console.log("── رسالةُ الحجب ──");
check("١٣. **`<p>` الرسالة مشروطةٌ بـ`nameCheck.status === \"conflict\"` حصراً**",
  /\{nameCheck\.status === "conflict" && \(/.test(src));

// ── ٧. منعُ الحفظ في `onSubmit` — لا تعطيلَ الزرّ وحده ───────────────────
console.log("── منعُ الحفظ في `onSubmit` ──");
const onSubmitStart = src.indexOf("function onSubmit(values: FormValues) {");
const firstGuardSlice = onSubmitStart >= 0 ? src.slice(onSubmitStart, onSubmitStart + 500) : "";
check("١٤. **أوّلُ ما يفعله `onSubmit` فحصُ `nameCheck` (قبل أيّ فحصٍ آخر)**",
  /nameCheck\.status !== "empty" && nameCheck\.status !== "available"/.test(firstGuardSlice),
  firstGuardSlice);

// ── ٨. تعطيلُ زرّ الحفظ — إرشادٌ بصريّ إضافي ─────────────────────────────
console.log("── تعطيلُ الزرّ ──");
check("١٥. **الزرّ معطَّلٌ أيضاً أثناء `checking`/`conflict`/`error`**",
  /disabled=\{isPending \|\| nameCheck\.status === "checking" \|\| nameCheck\.status === "conflict" \|\| nameCheck\.status === "error"\}/
    .test(src));

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}`);
process.exit(failures === 0 ? 0 : 1);
