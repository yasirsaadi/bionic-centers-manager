// تنبيهاتُ التسليم — قسمان للمتأخّر: «متأخرة بدون عذر» و«متأخرة بعذر»، كلوحة
// التصنيع (قرارُ المالك ٢٠٢٦-٠٩-٢٤، نُفِّذ ٢٠٢٦-٠٩-٢٥). منطقٌ خالص (لا مشغّل
// DOM): القرارُ في `notifications_sections.ts` يُختبَر مباشرةً، ثمّ يُثبَت أن
// الصفحةَ الحقيقية تستعمله ولا تقرّر بنفسها.
// `npm run test:delivery-hold-tone`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) متأخّرٌ **بلا** عذرٍ مكتوب ⟶ «متأخرة بدون عذر» (أحمر).
// (٢) متأخّرٌ **بعذرٍ مكتوب** ⟶ «متأخرة بعذر» (كهرمانيّ)، وسطرُ السبب ظاهر.
// (٣) البياضُ وحده ليس عذراً — كما في اللوحة.
// (٤) أقسامٌ أخرى (اليوم/غداً/بعد يومين/مكتمل) **لا تتأثّر بالعذر إطلاقاً**.
// (٥) **التعريفُ تعريفُ اللوحة نفسُه** — يُقارَن بشرائطها صفّاً صفّاً،
//     والعنوانان بمربّعَيها بحرفهما من `Manufacturing.tsx`.

import { readFileSync } from "fs";
import { join } from "path";
import {
  NOTIFICATION_SECTIONS, sectionOf, isLateSection, type AlertKind,
} from "./notifications_sections";
import { bucketDef } from "./manufacturing_buckets";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

const def = (key: string) => NOTIFICATION_SECTIONS.find((s) => s.key === key);

console.log("\n═══ أقسامُ التنبيهات — المتأخّرُ قسمان ═══\n");

console.log("── sectionOf ──");
check("١. متأخّرٌ بلا عذر ⟶ «متأخرة بدون عذر»",
  sectionOf({ kind: "overdue", holdReasonCode: null }) === "overdue");
check("٢. متأخّرٌ بعذرٍ مكتوب ⟶ «متأخرة بعذر»",
  sectionOf({ kind: "overdue", holdReasonCode: "materials_unavailable" }) === "overdue_excused");
check("٣. نصٌّ فارغ ليس عذراً ⟶ يبقى بدون عذر",
  sectionOf({ kind: "overdue", holdReasonCode: "" }) === "overdue");
check("٤. بياضٌ وحده ليس عذراً ⟶ يبقى بدون عذر (كاللوحة)",
  sectionOf({ kind: "overdue", holdReasonCode: "   " }) === "overdue");
for (const k of ["due_today", "due_tomorrow", "due_in_2_days", "completed"] as AlertKind[]) {
  check(`٥. «${k}» بعذرٍ موجود ⟶ يبقى في قسمه (العذرُ خاصٌّ بالمتأخّر)`,
    sectionOf({ kind: k, holdReasonCode: "materials_unavailable" }) === k);
}

console.log("\n── الأقسام ──");
check("٦. «متأخرة بدون عذر» أوّلاً ثمّ «متأخرة بعذر» — قبل ما يقترب موعدُه",
  NOTIFICATION_SECTIONS[0].key === "overdue" && NOTIFICATION_SECTIONS[1].key === "overdue_excused",
  JSON.stringify(NOTIFICATION_SECTIONS.map((s) => s.key)));
check("٧. العنوانان بكلمات المالك",
  def("overdue")?.title === "متأخرة بدون عذر" && def("overdue_excused")?.title === "متأخرة بعذر");
check("٨. الأحمرُ لمن لا عذرَ له وحدَه، والكهرمانيُّ للمعذور",
  def("overdue")?.tone === "border-red-300 bg-red-50"
  && def("overdue_excused")?.tone === "border-amber-300 bg-amber-50");
check("٩. لا قسمَ أحمر غيرُ «متأخرة بدون عذر»",
  NOTIFICATION_SECTIONS.filter((s) => s.tone.includes("red")).map((s) => s.key).join() === "overdue");
check("١٠. شارةُ «متأخر N يوم» للقسمين وحدهما",
  NOTIFICATION_SECTIONS.filter((s) => isLateSection(s.key)).map((s) => s.key).join() === "overdue,overdue_excused");
check("١١. لكلّ قسمٍ من `sectionOf` تعريفٌ يُعرَض — لا تنبيهَ يسقط بلا قسم",
  (["overdue", "due_today", "due_tomorrow", "due_in_2_days", "completed"] as AlertKind[])
    .flatMap((k) => [null, "x"].map((c) => sectionOf({ kind: k, holdReasonCode: c })))
    .every((key) => !!def(key)));

// ══ التعريفُ تعريفُ اللوحة — لا نسخةٌ ثانية ═══════════════════════════════
console.log("\n── مطابقةُ لوحة التصنيع ──");
{
  const red = bucketDef("overdue")!;
  const amber = bucketDef("overdue_excused")!;
  const codes: (string | null)[] = [null, "", "  ", "\t", "materials_unavailable", " x ", "نصٌّ حرّ"];
  const mismatch = codes.filter((c) => {
    const row = { currentStage: "fitting", status: "active", completedAt: null, isOverdue: true, holdReasonCode: c };
    const sec = sectionOf({ kind: "overdue", holdReasonCode: c });
    return (sec === "overdue") !== red.match(row, "2026-09")
      || (sec === "overdue_excused") !== amber.match(row, "2026-09");
  });
  check("١٢. **كلُّ عذرٍ يقع في القسم الذي تضعه فيه شرائطُ اللوحة**",
    mismatch.length === 0, `مختلفٌ: ${JSON.stringify(mismatch)}`);

  const mfg = readFileSync(join(import.meta.dirname, "./Manufacturing.tsx"), "utf8");
  const lateTiles = [...mfg.matchAll(/<StatTile\s+label="([^"]+)"/g)]
    .map((m) => m[1]).filter((l) => l.includes("متأخر"));
  check("١٣. **عنوانا القسمين هما مربّعا اللوحة بحرفهما**",
    JSON.stringify(lateTiles) === JSON.stringify([def("overdue")?.title, def("overdue_excused")?.title]),
    JSON.stringify(lateTiles));
}

// ══ عقدُ المصدر — لا الرسم ═══════════════════════════════════════════════
console.log("\n── عقد الصفحة الحقيقية ──");
{
  const src = readFileSync(join(import.meta.dirname, "./Notifications.tsx"), "utf8");

  check("١٤. **الأقسامُ من `NOTIFICATION_SECTIONS`** لا مصفوفةٌ محليّة",
    src.includes("NOTIFICATION_SECTIONS.map(") && !/const SECTIONS\b/.test(src));
  check("١٥. **التنبيهُ يُوزَّع بـ`sectionOf` وحدها** لا بـ`kind` الخام",
    src.includes("items.filter((i) => sectionOf(i) === key)")
    && !/i\.kind === kind/.test(src) && !/i\.kind === "overdue"/.test(src));
  check("١٦. لا بقيَ القسمُ الجامع «متأخرة عن موعد التسليم»",
    !src.includes("متأخرة عن موعد التسليم"));
  check("١٧. لا بقيَ قرارُ لونٍ محليّ (`toneFor` / `onHold`) يخالف القسم",
    !src.includes("toneFor(") && !src.includes("onHold"));
  check("١٨. **البطاقةُ بلون قسمها**",
    /<Card className=\{`\$\{tone\} \$\{canOpenOrder/.test(src));
  check("١٩. **سطرُ السبب في «متأخرة بعذر» وحدَه**",
    src.includes('const excused = key === "overdue_excused";')
    && /\{excused && \(/.test(src) && /سببُ التأخير: \{i\.holdReasonLabel\}/.test(src));
  check("٢٠. **والملاحظة (`holdNote`) تُعرَض معه إن وُجدت** لا بدلاً عنه",
    /\{i\.holdNote && /.test(src));
  check("٢١. **شارةُ «متأخر N يوم» كهرمانيّةٌ للمعذور وحمراءُ لغيره**",
    src.includes("const late = isLateSection(key);")
    && /excused \? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"/.test(src));
  check("٢٢. **`AlertItem` يحمل الحقول الثلاثة من الخادم** (لا استنتاجَ في الواجهة)",
    src.includes("holdReasonCode: string | null;")
    && src.includes("holdReasonLabel: string | null;")
    && src.includes("holdNote: string | null;"));
  check("٢٣. **فلترةُ الفرع والخبير مشتقّةٌ من العناصر المُرجَعة نفسِها** — لا استعلامَ ثانٍ",
    src.includes("for (const i of allItems) if (i.branchId != null)")
    && src.includes("for (const i of allItems) if (i.expertUserId != null)"));
}

console.log("\n── عقد الخادم ──");
{
  const routes = readFileSync(join(import.meta.dirname, "../../../server/manufacturing/routes.ts"), "utf8");
  check("٢٤. **اسمُ السبب بتعريف `writtenHoldExcuse`** — البياضُ لا اسمَ له",
    routes.includes("const excuse = writtenHoldExcuse(o.holdReasonCode);")
    && routes.includes("holdReasonLabel: excuse === null ? null : (REASON_CODE_LABELS[excuse] ?? excuse),"));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
