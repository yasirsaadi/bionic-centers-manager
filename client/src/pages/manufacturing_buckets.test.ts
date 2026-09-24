//  تصنيفاتُ لوحة التصنيع — منطقٌ خالص، بلا قاعدة بيانات ولا DOM.
//  `npm run test:manufacturing-buckets`.
//
//  ══ ما يحرسه ═══════════════════════════════════════════════════════════
//  (١) **الشروطُ التسعة كما كانت بحرفها** — الأعدادُ التي يقرؤها المالكُ
//      اليوم لا يتحرّك منها رقم، والمتبدِّلُ أن الشريطَ صار يُضغَط.
//  (٢) **والضغطةُ تعرض ما عدّه الشريطُ بعينه** — لا رقمٌ يقول شيئاً
//      وقائمةٌ تقول غيره.
//  (٣) **والتركيبُ مع مرشِّح الخبير** — طلبُ المالك الصريح: «اختار عناد
//      واختار المتأخر فيظهرون». والمرشِّحُ يقع في الخادم، فيُحاكى هنا
//      بقائمةٍ مُرشَّحةٍ سلفاً كما تصل الشاشة.
//  (٤) **ومفتاحٌ لا نعرفه لا يُفرغ الشاشة** — بائتٌ من تبويبٍ قديم يُقرأ
//      «بلا تصنيف» لا «صفر نتائج».
//  (٥) وعقدُ الشاشة: الصفحةُ تستعمل الحاسمَ ولا تعيد كتابة قاعدته،
//      والشرائطُ أزرارٌ لا `div`، والقائمةُ المعروضةُ هي المُرشَّحة.

import {
  BUCKET_DEFS, bucketCounts, ordersInBucket, nextBucket, bucketDef,
  type BucketOrderLike,
} from "./manufacturing_buckets";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const MONTH = "2026-09";

interface Row extends BucketOrderLike { id: number; expert: string; }
const row = (
  id: number, expert: string, stage: string, status: string,
  extra: Partial<Row> = {},
): Row => ({
  id, expert, currentStage: stage, status,
  completedAt: null, isOverdue: false, ...extra,
});

//  عيّنةٌ تحاكي لوحةً حقيقية: خبيران، وكلُّ تصنيفٍ ممثَّلٌ فيها.
const ORDERS: Row[] = [
  row(1, "عناد", "order_received", "active"),                        // جديد
  row(2, "فاضل", "order_received", "active"),                        // جديد
  row(3, "عناد", "order_received", "cancelled"),                     // ملغى — خارج «جديد»
  row(4, "عناد", "manufacturing", "active"),                         // قيد العمل
  row(5, "فاضل", "casting", "active", { isOverdue: true }),          // قيد العمل + متأخر
  row(6, "عناد", "manufacturing", "active", { isOverdue: true }),    // قيد العمل + متأخر
  row(7, "عناد", "manufacturing", "waiting_patient"),
  row(8, "فاضل", "casting", "waiting_materials"),
  row(9, "عناد", "manufacturing", "medical_hold"),
  row(10, "فاضل", "manufacturing", "technical_rework", { isOverdue: true }),
  row(11, "عناد", "ready_for_fitting", "active"),                    // جاهز + قيد العمل
  row(12, "فاضل", "ready_for_fitting", "completed", { completedAt: "2026-09-02T09:00:00Z" }),
  row(13, "عناد", "ready_for_fitting", "completed", { completedAt: "2026-08-30T09:00:00Z" }),
  row(14, "عناد", "delivered", "completed", { completedAt: "2026-09-20T09:00:00Z" }),
];

const countOf = (key: string) =>
  bucketCounts(ORDERS, MONTH).find((c) => c.def.key === key)?.count ?? -1;
const idsOf = (key: string | null, list: Row[] = ORDERS) =>
  ordersInBucket(list, key, MONTH).map((o) => o.id);

// ═══ أ: الشروطُ التسعة كما كانت ══════════════════════════════════════════
console.log("\n── أ: الشروطُ التسعة بحرفها ──");
same("أ.١ الترتيبُ والمفاتيح كما على الشاشة",
  BUCKET_DEFS.map((d) => d.key),
  ["new", "active", "waiting_patient", "waiting_materials", "medical_hold",
    "technical_rework", "ready", "completed_month", "overdue"]);
same("أ.٢ **أوامر جديدة** — المرحلةُ الأولى والملغى خارجها", idsOf("new"), [1, 2]);
same("أ.٣ **قيد العمل** — فعّالٌ خارج المرحلة الأولى", idsOf("active"), [4, 5, 6, 11]);
same("أ.٤ بانتظار المريض", idsOf("waiting_patient"), [7]);
same("أ.٥ بانتظار المواد", idsOf("waiting_materials"), [8]);
same("أ.٦ متوقّفون لسبب طبي", idsOf("medical_hold"), [9]);
same("أ.٧ إعادة عمل فني", idsOf("technical_rework"), [10]);
same("أ.٨ **جاهزون** — بالمرحلة لا بالحالة", idsOf("ready"), [11, 12, 13]);
same("أ.٩ **مكتملون هذا الشهر** — والشهرُ السابق خارجهم", idsOf("completed_month"), [12, 14]);
same("أ.١٠ متأخرون", idsOf("overdue"), [5, 6, 10]);
check(BUCKET_DEFS.every((d) => d.label.trim() !== ""), "أ.١١ لكلّ تصنيفٍ عنوانٌ يُقرأ");

// ═══ ب: العددُ هو ما يظهر ════════════════════════════════════════════════
console.log("\n── ب: العددُ والقائمةُ من مصدرٍ واحد ──");
for (const { def, count } of bucketCounts(ORDERS, MONTH)) {
  check(count === ordersInBucket(ORDERS, def.key, MONTH).length,
    `ب «${def.label}»: العددُ ${count} = طولُ ما يظهر`);
}

// ═══ ج: طلبُ المالك — خبيرٌ ثمّ متأخر ════════════════════════════════════
console.log("\n── ج: «اختار عناد واختار المتأخر فيظهرون» ──");
//  مرشِّحُ الخبير يقع في الخادم، فتصل الشاشةَ قائمةٌ مُرشَّحةٌ سلفاً.
const enad = ORDERS.filter((o) => o.expert === "عناد");
const fadhil = ORDERS.filter((o) => o.expert === "فاضل");
same("ج.١ **متأخرو عناد وحدهم**", idsOf("overdue", enad), [6]);
same("ج.٢ ومتأخرو فاضل وحدهم", idsOf("overdue", fadhil), [5, 10]);
check(idsOf("overdue", enad).length + idsOf("overdue", fadhil).length
  === idsOf("overdue").length, "ج.٣ ومجموعُهما متأخرو اللوحة — لا صفَّ يسقط ولا يُعدّ مرّتين");
same("ج.٤ والعددُ المعروضُ لعناد يتبع قائمتَه",
  bucketCounts(enad, MONTH).find((c) => c.def.key === "overdue")?.count, 1);
same("ج.٥ **وتصنيفٌ آخر لنفس الخبير** — جاهزو عناد", idsOf("ready", enad), [11, 13]);
same("ج.٦ وخبيرٌ بلا متأخرين ⟶ صفر", idsOf("overdue",
  ORDERS.filter((o) => o.expert === "لا أحد")), []);

// ═══ د: بلا تصنيف، والمفتاحُ البائت ══════════════════════════════════════
console.log("\n── د: بلا تصنيف، والمفتاحُ البائت ──");
same("د.١ `null` ⟶ كلُّ الأوامر", idsOf(null), ORDERS.map((o) => o.id));
same("د.٢ **ومفتاحٌ لا نعرفه لا يُفرغ الشاشة**", idsOf("مفتاحٌ قديم"),
  ORDERS.map((o) => o.id));
same("د.٣ والفراغُ الصريح كذلك", idsOf(""), ORDERS.map((o) => o.id));
check(bucketDef("overdue")?.label === "متأخرون", "د.٤ التعريفُ يُقرأ بمفتاحه");
check(bucketDef("لا شيء") === null, "د.٥ والمجهولُ `null` لا افتراضٌ صامت");
check(ordersInBucket([], "overdue", MONTH).length === 0, "د.٦ وقائمةٌ فارغة تبقى فارغة");

// ═══ هـ: الضغطةُ الثانية تُلغي ═══════════════════════════════════════════
console.log("\n── هـ: الضغطةُ الثانية تُلغي الاختيار ──");
same("هـ.١ الأولى تختار", nextBucket(null, "overdue"), "overdue");
same("هـ.٢ **والثانية على الشريط نفسِه تُلغي**", nextBucket("overdue", "overdue"), null);
same("هـ.٣ وشريطٌ آخر يستبدل", nextBucket("overdue", "ready"), "ready");
same("هـ.٤ ومفتاحٌ مجهول لا يغيّر المختار", nextBucket("overdue", "مجهول"), "overdue");
same("هـ.٥ ولا يخترع اختياراً من مجهول", nextBucket(null, "مجهول"), null);

// ═══ و: التقويمُ يُمرَّر ولا يُقرأ من الجهاز ═════════════════════════════
console.log("\n── و: شهرُ بغداد يُمرَّر ──");
same("و.١ شهرٌ آخر يُغيّر «مكتملون هذا الشهر»",
  ordersInBucket(ORDERS, "completed_month", "2026-08").map((o) => o.id), [13]);
check(!readFileSync(join(dirname(fileURLToPath(import.meta.url)), "manufacturing_buckets.ts"), "utf8")
  .includes("new Date("), "و.٢ **ولا ساعةَ جهازٍ داخل الحاسم الخالص**");

// ═══ ز: عقدُ الشاشة ══════════════════════════════════════════════════════
console.log("\n── ز: عقدُ الشاشة ──");
const page = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Manufacturing.tsx"), "utf8");
const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
check(/from "\.\/manufacturing_buckets"/.test(pageCode),
  "ز.١ الصفحةُ تستورد الحاسم");
check(pageCode.includes("bucketCounts(orders, nowMonth)"),
  "ز.٢ والأعدادُ منه لا من نسخةٍ ثانية");
check(!/orders\.filter\(\(o\)\s*=>\s*o\.isOverdue/.test(pageCode),
  "ز.٣ **ولا شرطَ تصنيفٍ مكتوبٌ في الصفحة** ينحرف عنه يوماً");
check(pageCode.includes("ordersInBucket(orders, bucket, nowMonth)"),
  "ز.٤ والقائمةُ المعروضةُ هي المُرشَّحة");
check(pageCode.includes("visibleOrders.map((o) => <OrderRow"),
  "ز.٥ **والصفوفُ تُرسَم من المُرشَّحة لا من كلّ الأوامر**");
check(pageCode.includes("visibleOrders.length === 0"),
  "ز.٦ ورسالةُ الفراغ تقيس المعروض");
check(/<button[\s\S]{0,400}data-testid={`chip-bucket-\$\{def\.key\}`}/.test(pageCode),
  "ز.٧ **والشريطُ زرٌّ يُضغَط لا `div` يُقرأ**");
check(pageCode.includes("nextBucket(cur, def.key)"),
  "ز.٨ وضغطتُه تمرّ بقاعدة التبديل");
check(pageCode.includes("aria-pressed={on}"),
  "ز.٩ وحالتُه مُعلَنة لقارئ الشاشة");
for (const tone of ["blue", "amber", "red", "green"]) {
  check(new RegExp(`bg-${tone}-100`).test(pageCode),
    `ز.١٠ لونُ «${tone}» سلسلةٌ حرفية يراها الماسح`);
}
check(pageCode.includes("py-2.5 sm:py-1.5"),
  "ز.١١ **وهدفُ اللمس أكبرُ على الهاتف** ويعود مضغوطاً على الحاسوب");
check(pageCode.includes("إظهار كل الأوامر") && pageCode.includes("إظهار الكل"),
  "ز.١٢ وللتصنيف بابُ خروجٍ ظاهر");

console.log(`\n${failures === 0 ? "🎉 كل البنود نجحت" : `❌ ${failures} بنداً فشل`}`);
process.exit(failures === 0 ? 0 : 1);
