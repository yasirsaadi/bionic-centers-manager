// قائمةُ «ما المطلوب» — منطقٌ خالص، بلا قاعدة ولا شبكة.
// `npm run test:parts`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **قائمةٌ واحدة لمسارين**: شراءُ جزءٍ جديد وصيانةُ جزءٍ قائم. وقائمتان
//     كانتا ستنحرفان — يُضاف «الأدابتر» لإحداهما فتُصان قطعةٌ لا تُباع.
// (٢) **والعمودان متلازمان**: طرفٌ كامل ⟺ لا جزء، وجزءٌ ⟺ الاسمُ نفسه.
// (٣) **والمجهولُ يُردّ لا يُصحَّح بصمت** — تصحيحُه «طرفاً كاملاً» كان
//     سيفتح طلبَ طرفٍ لمريضٍ يريد ركبة، والفرقُ في الثمن هائل.
// (٤) **والصفوفُ القديمة تُقرأ «طرفاً كاملاً»** — وهو معناها الحقيقيّ.

import { readFileSync } from "fs";
import { join } from "path";
import {
  PROSTHETIC_COMPONENTS, REQUESTED_ITEMS, REQUESTED_ITEM_LABELS,
  isProstheticComponent, isRequestedItem, requestedItemLabel, componentLabel,
  componentOfRequest, parseRequestedItem, parseComponent, requestedItemLine,
} from "./prosthetic_parts";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

console.log("\n═══ ما المطلوب: طرفٌ كامل أم جزء ═══\n");

// ── ١. القائمةُ كما طلبها المالك، بترتيبها ─────────────────────────────
console.log("── القائمة ──");
same("١. **الأجزاءُ الثمانية**", [...PROSTHETIC_COMPONENTS],
  ["socket", "silicone", "knee", "tube", "adapter", "foot", "foam_cover", "foot_shell"]);
same("٢. **والطلبُ تسعةٌ — الكاملُ أوّلها**", REQUESTED_ITEMS.length, 9);
same("٣. والكاملُ في رأس القائمة", REQUESTED_ITEMS[0], "full_prosthesis");
same("٤. **وعناوينُها بألفاظ الفرع نفسها**",
  PROSTHETIC_COMPONENTS.map((c) => REQUESTED_ITEM_LABELS[c]),
  ["القالب", "السليكون", "الركبة", "التيوب", "الأدابتر", "القدم",
    "الغلاف الإسفنجي", "غلاف القدم"]);
same("٥. والكاملُ «طرف صناعي كامل»",
  REQUESTED_ITEM_LABELS.full_prosthesis, "طرف صناعي كامل");
//  **ولا عنوانَ ناقصٌ ولا إنجليزيّ** — مسحٌ شامل.
same("٦. **ولكلّ قيمةٍ عنوانٌ عربيّ خالص**",
  REQUESTED_ITEMS.filter((v) => !REQUESTED_ITEM_LABELS[v] || /[A-Za-z_]/.test(REQUESTED_ITEM_LABELS[v])),
  []);

// ── ٢. الحُرّاس ──────────────────────────────────────────────────────────
console.log("\n── الحرّاس ──");
check("٧. الجزءُ المعروف يُعرَف", isProstheticComponent("knee"));
check("٨. **والطرفُ الكامل ليس جزءاً**", !isProstheticComponent("full_prosthesis"));
check("٩. والمخترَعُ يُردّ", !isProstheticComponent("elbow") && !isRequestedItem("elbow"));
check("١٠. والقيمُ غيرُ النصّية تُردّ",
  !isRequestedItem(null) && !isRequestedItem(7) && !isRequestedItem(undefined));

// ── ٣. **العمودان متلازمان** ────────────────────────────────────────────
console.log("\n── التلازم ──");
same("١١. **الكاملُ ⟶ لا جزء**", componentOfRequest("full_prosthesis"), null);
same("١٢. **والجزءُ ⟶ الاسمُ نفسه**",
  PROSTHETIC_COMPONENTS.map((c) => componentOfRequest(c)), [...PROSTHETIC_COMPONENTS]);
same("١٣. والمجهولُ ⟶ لا جزء", componentOfRequest("junk"), null);
//  وهذا هو ما يحرسه القيدُ في القاعدة نفسها — والاشتقاقُ يمنع كتابتَهما
//  بيدين فينحرفا.
same("١٤. **ولا تركيبةَ مستحيلة تخرج من هنا**",
  REQUESTED_ITEMS.filter((v) => {
    const c = componentOfRequest(v);
    return v === "full_prosthesis" ? c !== null : c !== v;
  }), []);

// ── ٤. **المجهولُ يُردّ لا يُصحَّح** ────────────────────────────────────
console.log("\n── القراءة من العميل ──");
same("١٥. **الغيابُ مقبولٌ** — نافذةٌ قديمة لا ترسله",
  [parseRequestedItem(undefined), parseRequestedItem(null), parseRequestedItem("")],
  [{ ok: true, value: null }, { ok: true, value: null }, { ok: true, value: null }]);
same("١٦. **والمجهولُ يُردّ برسالةٍ عربية**",
  parseRequestedItem("elbow").ok, false);
check("١٧. ورسالتُه تدلّ على القائمة",
  (parseRequestedItem("elbow").error ?? "").includes("القائمة"),
  String(parseRequestedItem("elbow").error));
same("١٨. والمعروفُ يمرّ بقيمته", parseRequestedItem("knee"),
  { ok: true, value: "knee" });

// ── ٥. **ولا يُصان «الطرف كلُّه»** ──────────────────────────────────────
console.log("\n── جزء الصيانة ──");
same("١٩. **«طرف كامل» ليس جزءاً يُصان**", parseComponent("full_prosthesis").ok, false);
check("٢٠. ورسالتُه تقول ذلك صراحةً",
  (parseComponent("full_prosthesis").error ?? "").includes("الطرف كاملاً"),
  String(parseComponent("full_prosthesis").error));
same("٢١. والجزءُ المعروف يمرّ", parseComponent("socket"), { ok: true, value: "socket" });
same("٢٢. والغيابُ مقبولٌ هنا أيضاً — الإلزامُ يقرّره المُستدعي",
  parseComponent(null), { ok: true, value: null });

// ── ٦. العناوينُ للعرض ──────────────────────────────────────────────────
console.log("\n── العرض ──");
same("٢٣. **الصفُّ القديم يُقرأ «طرفاً كاملاً»** — وهو معناه الحقيقيّ",
  [requestedItemLabel(null), requestedItemLabel(undefined), requestedItemLabel("")],
  ["طرف صناعي كامل", "طرف صناعي كامل", "طرف صناعي كامل"]);
same("٢٤. **والمجهولُ لا يظهر باسمه البرمجيّ**",
  requestedItemLabel("elbow"), "طرف صناعي كامل");
same("٢٥. والجزءُ بعنوانه", requestedItemLabel("knee"), "الركبة");
same("٢٦. **وسطرُ الطبيب بصيغةٍ واحدة**", requestedItemLine("knee"), "المطلوب: الركبة");
same("٢٧. وللكامل كذلك", requestedItemLine("full_prosthesis"), "المطلوب: طرف صناعي كامل");
same("٢٨. **و`componentLabel` ترفض الكامل**",
  [componentLabel("full_prosthesis"), componentLabel("knee")], [null, "الركبة"]);

// ── ٧. **والقاعدةُ تحرس القيمَ نفسها** ─────────────────────────────────
//  القائمةُ هنا والقيدُ هناك يجب أن يتطابقا حرفاً: قيمةٌ تُضاف في المشتركة
//  ولا تُضاف إلى الترحيل تُقبل في الشيفرة وتُردّ في القاعدة.
console.log("\n── مطابقةُ القاعدة ──");
{
  const mig = readFileSync(
    join(import.meta.dirname, "../server/migrations/060_prosthetic_parts.ts"), "utf8");
  same("٢٩. **كلُّ قيمةٍ في القائمة موجودةٌ في قيد الترحيل**",
    REQUESTED_ITEMS.filter((v) => !mig.includes(`'${v}'`)), []);
  //  والعكس: قيمةٌ في القاعدة بلا عنوانٍ عربي تظهر للموظّف عاريةً.
  const inMig = Array.from(mig.matchAll(/'([a-z_]+)'/g)).map((m) => m[1]);
  const partsInMig = inMig.filter((v) => REQUESTED_ITEMS.includes(v as any));
  check("٣٠. (وقُرئت من الترحيل فعلاً)", partsInMig.length >= 9, String(partsInMig.length));
  //  والمخطّطُ يحمل القيدَ نفسه.
  const schema = readFileSync(join(import.meta.dirname, "./schema.ts"), "utf8");
  same("٣١. **والمخطّطُ يحمل القيمَ نفسها**",
    REQUESTED_ITEMS.filter((v) => !schema.includes(`'${v}'`)), []);
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
