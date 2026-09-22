//  ══ القرارُ الخالص: التشكيلُ والمطابقةُ وملءُ المسار — بلا قاعدة بيانات ══
//
//  الحسابُ يقع في الخادم (`shape.ts`) فلا يجمع النموذجُ ولا يعدّ. وهذا
//  الملفّ يقيسه **دخلاً وخرجاً** لا بقراءة نصِّه.
//  التشغيل: `npm run test:ai-capabilities-pure`
import { shapeResult, MAX_ROWS } from "./capabilities/shape";
import { matchCapabilities } from "./capabilities/match";
import { fillPath, buildQuery } from "./capabilities/invoke";
import type { Capability } from "./capabilities/catalog";

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m)); };
const same = (m: string, a: unknown, b: unknown) =>
  ok(JSON.stringify(a) === JSON.stringify(b), `${m} — ${JSON.stringify(a)}`);

const ITEMS = {
  alertCount: 5,
  items: [
    { kind: "overdue", expertName: "أ", holdReasonCode: null, amount: 100 },
    { kind: "overdue", expertName: "أ", holdReasonCode: null, amount: 200 },
    { kind: "overdue", expertName: "أ", holdReasonCode: "waiting_parts", amount: 50 },
    { kind: "overdue", expertName: "ب", holdReasonCode: "", amount: 300 },
    { kind: "due_today", expertName: "ب", holdReasonCode: null, amount: 900 },
  ],
};

console.log("\nأ — التجميعُ يقع في الخادم");
const red = shapeResult(ITEMS, {
  aggregate: {
    where: [{ field: "kind", equals: "overdue" }, { field: "holdReasonCode", isNull: true }],
    groupBy: "expertName", sort: "count",
  },
});
same("مجموعتان بالترتيب", red.groups?.map((g) => [g.key, g.count]), [["أ", 2], ["ب", 1]]);
same("والمطابقون ثلاثة", red.matched, 3);
same("من خمسةِ صفوف", red.total, 5);
ok(!red.rows, "ولا تُسلَّم الصفوفُ الخام مع التجميع");

const amber = shapeResult(ITEMS, {
  aggregate: { where: [{ field: "kind", equals: "overdue" }], groupBy: "expertName", sort: "count" },
});
same("وبلا شرط العذر تصير ثلاثةً لِـأ", amber.groups?.find((g) => g.key === "أ")?.count, 3);

console.log("\nب — والفراغُ يُقرأ غياباً لا قيمة");
same("السلسلةُ الفارغة كالغياب في isNull", red.groups?.find((g) => g.key === "ب")?.count, 1);
same("و notNull تعكسها", shapeResult(ITEMS, {
  aggregate: { where: [{ field: "holdReasonCode", notNull: true }], groupBy: "expertName" },
}).matched, 1);

console.log("\nج — والجمعُ الرقميّ");
const sum = shapeResult(ITEMS, {
  aggregate: { where: [{ field: "kind", equals: "overdue" }], groupBy: "expertName", sum: "amount", sort: "sum" },
});
same("أعلى مجموعٍ أوّلاً", sum.groups?.map((g) => [g.key, g.sum]), [["أ", 350], ["ب", 300]]);
same("وبلا groupBy مجموعٌ واحد", shapeResult(ITEMS, { aggregate: { sum: "amount" } }).groups, [{ key: "الكل", count: 5, sum: 1550 }]);

console.log("\nد — والقصُّ يُعلَن ولا يُخفى");
const many = { rows: Array.from({ length: MAX_ROWS + 9 }, (_, i) => ({ i })) };
const cut = shapeResult(many);
same("يُسلَّم السقفُ", cut.rows?.length, MAX_ROWS);
same("ويُقال العددُ الحقيقيّ", cut.matched, MAX_ROWS + 9);
ok(cut.truncated === true && typeof cut.note === "string", "ويُعلَن القصُّ بملاحظة");
ok(shapeResult({ rows: [{ i: 1 }] }).truncated === undefined, "وبلا قصٍّ لا ملاحظة");

console.log("\nهـ — واختيارُ الحقول واكتشافُ المصفوفة");
same("الحقولُ تُقصَر", shapeResult(ITEMS, { fields: ["kind"] }).rows?.[0], { kind: "overdue" });
same("وأطولُ مصفوفةٍ تُكتشَف", shapeResult({ a: [1], items: [1, 2, 3] }).matched, 3);
same("و path الصريح يعلو", shapeResult({ a: [1], items: [1, 2, 3] }, { aggregate: { path: "a", groupBy: "x" } }).matched, 1);
same("وجوابٌ بلا مصفوفةٍ يمضي كما هو", shapeResult({ total: 7 }).value, { total: 7 });
ok(typeof shapeResult({ total: 7 }, { aggregate: { groupBy: "x" } }).note === "string",
  "وطلبُ تجميعٍ على غير قائمةٍ يُقال صراحةً");

console.log("\nو — والمطابقةُ العربيةُ بعد تجريد السوابق");
const CAPS: Capability[] = [
  { path: "/api/manufacturing/overview", description: "لوحةُ أداء التصنيع والمتأخّرون لكلّ خبير", pathParams: [], query: [], financial: false },
  { path: "/api/accounting/summary", description: "الملخّصُ المحاسبيّ: الواردُ والمصاريفُ والصافي", pathParams: [], query: [], financial: true },
  { path: "/api/survey-results", description: "نتائجُ الاستطلاعات", pathParams: [], query: [], financial: false },
];
const first = (t: string) => matchCapabilities(CAPS, t)[0]?.path;
same("«مصاريف» تطابق «والمصاريف»", first("كم المصاريف هذا الشهر"), "/api/accounting/summary");
same("و«تصنيع» تطابق «التصنيع»", first("اوامر التصنيع المتاخرة"), "/api/manufacturing/overview");
same("و«محاسبه» تقارب «المحاسبيّ»", first("تقرير محاسبه"), "/api/accounting/summary");
same("وما لا يطابق شيئاً يُرجع فارغاً", matchCapabilities(CAPS, "زرافة قطبية"), []);
same("وموضوعٌ فارغ يُرجع الكلّ", matchCapabilities(CAPS, "").length, 3);
same("والسقفُ يُحترَم", matchCapabilities(CAPS, "", 2).length, 2);

console.log("\nز — وملءُ المسار لا يُخترَع ولا يُحقَن");
same("المعامِلُ يُملأ", fillPath("/api/x/:id", { id: 7 }), { url: "/api/x/7" });
ok("error" in fillPath("/api/x/:id", {}), "والناقصُ يُردّ صراحةً");
ok("error" in fillPath("/api/x/:id", { id: "  " }), "والبياضُ ناقصٌ أيضاً");
same("والشرطةُ المائلة تُرمَّز فلا تُغيّر النقطة", fillPath("/api/x/:id", { id: "1/../admin" }),
  { url: "/api/x/1%2F..%2Fadmin" });
same("والاستعلامُ يُبنى", buildQuery({ a: 1, b: "س" }), "?a=1&b=%D8%B3");
same("والفارغُ يُسقَط", buildQuery({ a: "", b: null, c: undefined, d: 2 }), "?d=2");
same("والكائنُ لا يُمرَّر", buildQuery({ a: { x: 1 } as any, b: 3 }), "?b=3");
same("ولا شيءَ يعني لا سلسلة", buildQuery(null), "");

console.log(`\nنجح ${pass} · فشل ${fail}`);
process.exit(fail ? 1 : 0);
