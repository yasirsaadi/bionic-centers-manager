// تنبيهاتُ التسليم — تباينُ «متأخّرٌ بعذر» عن «متأخّرٌ بلا عذر». منطقٌ خالص
// (لا مشغّل DOM، على نمط money_input.test.ts): الدالّةُ المنطقية تُعاد
// كتابتُها هنا حرفياً ثمّ يُثبَت أن المصدر الحقيقيّ يطابقها ويستعملها فعلاً.
// `npm run test:delivery-hold-tone`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) متأخّرٌ **بلا** سببٍ مسجَّل ⟶ يبقى أحمر (لا عذرَ يُخترَع له).
// (٢) متأخّرٌ **بسببٍ حقيقيّ** (`holdReasonLabel` من الخادم لا استنتاجاً)
//     ⟶ كهرمانيّ، والبادجُ «متأخر N يوم» كهرمانيّ معه، وسطرُ السبب ظاهر.
// (٣) أقسامٌ أخرى (اليوم/غداً/بعد يومين/مكتمل) **لا تتأثّر بالعذر إطلاقاً**
//     — العذرُ خاصٌّ بالمتأخّر وحده.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

type Kind = "overdue" | "due_today" | "due_tomorrow" | "due_in_2_days" | "completed";
interface Item { kind: Kind; holdReasonLabel: string | null }

//  ── القاعدةُ نفسُها، مكتوبةٌ مرّةً واحدة ومُثبَتٌ أن المصدر يطابقها ──
function toneFor(i: Item, sectionTone: string): string {
  if (i.kind === "overdue" && i.holdReasonLabel) return "border-amber-300 bg-amber-50";
  return sectionTone;
}

console.log("\n═══ تباينُ لون التأخير ═══\n");

console.log("── toneFor ──");
check("١. متأخّرٌ بلا سبب ⟶ يبقى لونَ القسم (أحمر)",
  toneFor({ kind: "overdue", holdReasonLabel: null }, "border-red-300 bg-red-50") === "border-red-300 bg-red-50");
check("٢. متأخّرٌ بسببٍ حقيقيّ ⟶ كهرمانيّ لا أحمر",
  toneFor({ kind: "overdue", holdReasonLabel: "بانتظار مادة" }, "border-red-300 bg-red-50") === "border-amber-300 bg-amber-50");
check("٣. سببٌ نصٌّ فارغ (\"\") يُعامَل كغيابِ سبب — لا يُقلَب اللون",
  toneFor({ kind: "overdue", holdReasonLabel: "" }, "border-red-300 bg-red-50") === "border-red-300 bg-red-50");
check("٤. «اليوم» بسببٍ موجود ⟶ لا يتأثّر (العذرُ خاصٌّ بالمتأخّر)",
  toneFor({ kind: "due_today", holdReasonLabel: "بانتظار مادة" }, "border-orange-300 bg-orange-50") === "border-orange-300 bg-orange-50");
check("٥. «مكتمل» بسببٍ موجود (بيانٌ تاريخيٌّ نادر) ⟶ يبقى أخضر القسم",
  toneFor({ kind: "completed", holdReasonLabel: "قديم" }, "border-green-300 bg-green-50") === "border-green-300 bg-green-50");

// ══ عقدُ المصدر — لا الرسم ═══════════════════════════════════════════════
console.log("\n── عقد الصفحة الحقيقية ──");
{
  const src = readFileSync(join(import.meta.dirname, "./Notifications.tsx"), "utf8");

  check("٦. **`toneFor` موجودةٌ بمنطقها الدقيق**",
    /if \(i\.kind === "overdue" && i\.holdReasonLabel\) return "border-amber-300 bg-amber-50";/.test(src));

  check("٧. **الكارت يستعمل `toneFor(i, tone)` لا `tone` الخام**",
    src.includes("toneFor(i, tone)"));
  check("   ولا بقي استعمالٌ للّون الخام وحده في الكارت",
    !/className=\{`\$\{tone\} \$\{canOpenOrder/.test(src));

  check("٨. **بادجُ «متأخر N يوم» مشروطٌ بوجود السبب** (كهرمانيّ حين يحضر، أحمر حين يغيب)",
    /onHold \? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"/.test(src));

  check("٩. **`onHold` تُشتقّ من `kind === \"overdue\"` ووجود السبب معاً**",
    /const onHold = kind === "overdue" && !!i\.holdReasonLabel;/.test(src));

  check("١٠. **سببُ التأخير يظهر على الكارت نصّاً** حين يحضر",
    /سببُ التأخير: \{i\.holdReasonLabel\}/.test(src));

  check("١١. **والملاحظة (`holdNote`) تُعرَض معه إن وُجدت** لا بدلاً عنه",
    /i\.holdNote && /.test(src) && src.includes("i.holdNote"));

  check("١٢. **العرضُ مشروطٌ بـ`onHold`** — لا يظهر سطرُ السبب لمتأخّرٍ بلا عذر",
    /\{onHold && \(/.test(src));

  check("١٣. **`AlertItem` يحمل الحقول الثلاثة من الخادم** (لا استنتاجَ في الواجهة)",
    src.includes("holdReasonCode: string | null;")
    && src.includes("holdReasonLabel: string | null;")
    && src.includes("holdNote: string | null;"));

  check("١٤. **فلترةُ الفرع والخبير مشتقّةٌ من العناصر المُرجَعة نفسِها** — لا استعلامَ ثانٍ",
    src.includes("for (const i of allItems) if (i.branchId != null)")
    && src.includes("for (const i of allItems) if (i.expertUserId != null)"));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
