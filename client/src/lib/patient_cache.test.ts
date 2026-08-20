// تنظيفُ الذاكرة بعد حذف مريض — **على `QueryClient` حقيقيّ، بلا React**.
// `npm run test:patient-cache`.
//
// ══ العطبُ الذي يغلقه (لاحظه المالك على الإنتاج) ═══════════════════════
// الحذفُ ينجح في الخادم **ويبقى المريضُ ظاهراً في سجلّ المرضى** حتى يُحدَّث
// المتصفّح يدوياً. والسببُ عائلتا مفاتيح لا واحدة: الطلبُ كان يُبطل
// `["/api/patients"]` وحدها، والشاشةُ المرئية تقرأ
// `["/api/patients/registry", صفحة, حجم, بحث, فرع, عرض, تاريخ]` — أوّلُ
// عنصرٍ **نصٌّ مختلف**، فلا تطابقَ بالبادئة ولا إبطال.
//
// ولا يكفي أن نقرأ الشيفرة: يُبنى `QueryClient` حقيقيّ وتُملأ ذاكرتُه
// بالتوليفات التي تحفظها الشاشة فعلاً، ثم يُسأل بعد التنظيف.

import { QueryClient } from "@tanstack/react-query";
import { readFileSync } from "fs";
import { join } from "path";
import { invalidateAfterPatientDelete } from "./queryClient";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

const GONE = 1473;   // المحذوف
const OTHER = 1500;  // مريضٌ آخر — لا يُمَسّ

/** توليفاتُ السجلّ كما تحفظها الشاشةُ فعلاً: صفحة/حجم/بحث/فرع/عرض/تاريخ. */
const REGISTRY_KEYS: any[][] = [
  ["/api/patients/registry", 1, 25, "", "all", "all", ""],
  ["/api/patients/registry", 2, 25, "", "all", "all", ""],
  ["/api/patients/registry", 1, 50, "حميد", "all", "all", ""],
  ["/api/patients/registry", 1, 25, "", 2, "all", ""],
  ["/api/patients/registry", 1, 25, "", "all", "daily", "2026-08-20"],
  ["/api/patients/registry", "dashboard-recent"],
  ["/api/patients/registry", "survey-picker", "حم"],
];

function seeded(): QueryClient {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const k of REGISTRY_KEYS) c.setQueryData(k, { patients: [{ id: GONE }], total: 1 });
  c.setQueryData(["/api/patients"], [{ id: GONE }, { id: OTHER }]);
  c.setQueryData(["/api/patients/:id", GONE], { id: GONE });
  c.setQueryData(["/api/patients/:id", GONE, "cases"], []);
  c.setQueryData(["/api/patients", GONE, "exam-prefill"], { id: GONE });
  c.setQueryData([`/api/manufacturing/patient/${GONE}/summary`], {});
  c.setQueryData([`/api/manufacturing/patient/${GONE}/orders`], []);
  c.setQueryData([`/api/followups/patient/${GONE}`], []);
  c.setQueryData([`/api/medical/patients/${GONE}/exams`], []);
  //  ومريضٌ آخر — شاهدٌ على أن التنظيف مصوَّب لا كاسح.
  c.setQueryData(["/api/patients/:id", OTHER], { id: OTHER });
  c.setQueryData([`/api/manufacturing/patient/${OTHER}/orders`], []);
  return c;
}

/** هل بقي الاستعلامُ في الذاكرة أصلاً؟ */
const present = (c: QueryClient, key: any[]) =>
  c.getQueryCache().find({ queryKey: key }) !== undefined;
/** هل عُلِّم بأنه بائتٌ فيُعاد جلبُه؟ */
const stale = (c: QueryClient, key: any[]) =>
  c.getQueryState(key)?.isInvalidated === true;

console.log("\n═══ الذاكرة بعد حذف مريض ═══\n");

// ── ١. **العطبُ نفسه: كلُّ توليفةِ سجلٍّ تُبطَل** ────────────────────────
console.log("── سجلّ المرضى ──");
{
  const c = seeded();
  invalidateAfterPatientDelete(c, GONE);
  const missed = REGISTRY_KEYS.filter((k) => !stale(c, k));
  same("١. **كلُّ توليفةِ سجلٍّ محفوظة صارت بائتة** — بلا استثناء",
    missed.map((k) => k.join("|")), []);
  check("٢. (وسبعُ توليفاتٍ فُحصت: صفحات وبحثٌ وفرعٌ وتاريخٌ ولوحة)",
    REGISTRY_KEYS.length === 7, String(REGISTRY_KEYS.length));
}
//  **وهذا هو البرهانُ على أن العطب كان حقيقياً**: إبطالُ العائلة القديمة
//  وحدها — وهو ما كانت تفعله الشيفرةُ — لا يمسّ السجلَّ إطلاقاً.
{
  const c = seeded();
  c.invalidateQueries({ queryKey: ["/api/patients"] });
  const untouched = REGISTRY_KEYS.filter((k) => !stale(c, k));
  same("٣. **والقديمُ وحده كان يترك السجلَّ كلَّه كما هو** — سببُ العطب",
    untouched.length, REGISTRY_KEYS.length);
}

// ── ٢. **وصفحةُ المحذوف تُنزَع لا تُحدَّث** ──────────────────────────────
//  «أعد الجلب» لصفحةِ مريضٍ محذوف تعني ٤٠٤ ورسالةَ خطأ. والصحيحُ نزعُها.
console.log("\n── صفحة المحذوف ──");
{
  const c = seeded();
  invalidateAfterPatientDelete(c, GONE);
  for (const [label, key] of [
    ["صفّ المريض", ["/api/patients/:id", GONE]],
    ["حالاتُه", ["/api/patients/:id", GONE, "cases"]],
    ["تعبئةُ المعاينة", ["/api/patients", GONE, "exam-prefill"]],
    ["ملخّصُ التصنيع", [`/api/manufacturing/patient/${GONE}/summary`]],
    ["أوامرُ التصنيع", [`/api/manufacturing/patient/${GONE}/orders`]],
    ["متابعتُه", [`/api/followups/patient/${GONE}`]],
    ["معايناتُه", [`/api/medical/patients/${GONE}/exams`]],
  ] as Array<[string, any[]]>) {
    check(`٤. **${label} نُزع من الذاكرة**`, !present(c, key), JSON.stringify(key));
  }
}

// ── ٣. **ولا يُمَسّ مريضٌ آخر** ──────────────────────────────────────────
console.log("\n── التنظيف مصوَّب لا كاسح ──");
{
  const c = seeded();
  invalidateAfterPatientDelete(c, GONE);
  check("٥. **صفحةُ مريضٍ آخر باقية**", present(c, ["/api/patients/:id", OTHER]));
  check("٦. **وأوامرُ تصنيعه باقية**",
    present(c, [`/api/manufacturing/patient/${OTHER}/orders`]));
}

// ── ٤. **والقوائمُ تُبطَل ولا تُنزَع** ──────────────────────────────────
//  نزعُها كان سيُفرغ الشاشة لحظةً ثم يملؤها — وميضٌ لا داعي له. والإبطالُ
//  يُبقي المعروضَ حتى يصل الجديد.
console.log("\n── القوائم تُبطَل لا تُنزَع ──");
{
  const c = seeded();
  invalidateAfterPatientDelete(c, GONE);
  check("٧. **قائمةُ المرضى القديمة باقيةٌ وبائتة**",
    present(c, ["/api/patients"]) && stale(c, ["/api/patients"]));
  check("٨. **وتوليفاتُ السجلّ باقيةٌ وبائتة**",
    REGISTRY_KEYS.every((k) => present(c, k)));
}

// ── ٥. **والطوابيرُ والعدّادات التي كان فيها** ──────────────────────────
console.log("\n── الطوابير والعدّادات ──");
{
  const c = seeded();
  for (const k of [["/api/medical/pending"], ["/api/medical/worklist"],
    ["/api/followups"], ["/api/followups/governed"], ["/api/discounts"],
    ["/api/accounting/summary"], ["/api/reports/daily-summary"]]) {
    c.setQueryData(k, {});
  }
  invalidateAfterPatientDelete(c, GONE);
  const missed = [["/api/medical/pending"], ["/api/medical/worklist"],
    ["/api/followups"], ["/api/followups/governed"], ["/api/discounts"],
    ["/api/accounting/summary"], ["/api/reports/daily-summary"]]
    .filter((k) => !stale(c, k));
  same("٩. **كلُّ طابورٍ وعدّادٍ كان يظهر فيه صار بائتاً**",
    missed.map((k) => k[0]), []);
}

// ── ٦. **والذاكرةُ الفارغة لا تُسقط شيئاً** ─────────────────────────────
{
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let threw = false;
  try { invalidateAfterPatientDelete(c, GONE); } catch { threw = true; }
  check("١٠. **وذاكرةٌ فارغة تماماً لا ترمي**", !threw);
}

// ── ٧. **وطلبُ الحذف يستعمل هذا التنظيف فعلاً** ─────────────────────────
console.log("\n── عقد طلب الحذف ──");
{
  const src = readFileSync(join(import.meta.dirname, "../hooks/use-patients.ts"), "utf8");
  //  **دالّةُ الحذف وحدها**: الملفُّ يحمل طلباتٍ أخرى تُبطل القائمة القديمة
  //  بحقٍّ (تعديلُ مريضٍ مثلاً)، فقصُّه إلى آخر الملفّ كان يخلط عملَ غيرها
  //  بعملها.
  const start = src.indexOf("export function useDeletePatient");
  const after = src.indexOf("export function ", start + 10);
  const del = src.slice(start, after > 0 ? after : undefined);
  check("١١. **طلبُ الحذف ينادي التنظيف الكامل**",
    del.includes("invalidateAfterPatientDelete(queryClient, id)"),
    del.slice(0, 700));
  //  **ولم يبقَ الإبطالُ الجزئي** الذي كان يترك السجلَّ كما هو.
  check("١٢. **ولم يبقَ إبطالُ القائمة وحدها**",
    !/onSuccess[\s\S]{0,200}invalidateQueries\(\{\s*queryKey:\s*\[api\.patients\.list\.path\]/
      .test(del),
    del.slice(0, 700));
  //  **ولا حذفَ متفائل**: التنظيفُ في `onSuccess` وحده — فلو ردّ الخادمُ
  //  خطأً بقي الصفُّ ظاهراً كما هو في القاعدة.
  const idx = del.indexOf("invalidateAfterPatientDelete");
  const okIdx = del.indexOf("onSuccess");
  const mutIdx = del.indexOf("mutationFn");
  check("١٣. **ولا تنظيفَ قبل أن يؤكّد الخادم** — لا حذفَ متفائل",
    okIdx > 0 && idx > okIdx && !(idx > mutIdx && idx < okIdx),
    JSON.stringify({ mutIdx, okIdx, idx }));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
