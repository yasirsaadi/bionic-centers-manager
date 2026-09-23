// تغيّرُ الصلاحية يُبطل ما خُبِّئ من مالِ الأجهزة — **على `QueryClient` حقيقيّ**.
// `npm run test:permission-cache`.
//
// ══ العطبُ الذي يغلقه (مراجعةٌ آلية على الطلب ٣٨٤) ══════════════════════
// الطلبُ ٣٨٤ جعل ردَّ `GET /api/manufacturing/patient/:id/orders` **يتبع
// الصلاحية**: حقلا `agreedCost`/`paidOnDevice` يُحذَفان عمّن لا يملك
// `canViewPayments`. و`App.tsx` يُبطل عند تغيّر اللقطة **قائمةً مكتوبةً
// حرفاً** من المفاتيح — وهذا المفتاحُ ليس فيها، ولا يمكن أن يكون: نصُّه
// الواحدُ يحمل رقمَ المريض في جسمه، فلا بادئةَ تصيبه.
//
// فسحبُ `canViewPayments` وصفحةُ المريض مفتوحةٌ كان يُبقي المبلغَ معروضاً
// من ردٍّ مخبَّأٍ سابق (ومنحُها يُبقيه محجوباً) — والخادمُ يبقى الحارسَ
// الحقيقيّ، لكنّ الشاشةَ تكذب حتى تُعيد الجلب.
//
// ولا يكفي أن نقرأ الشيفرة: يُبنى `QueryClient` حقيقيّ وتُملأ ذاكرتُه
// بالمفاتيح التي تحفظها الشاشةُ فعلاً، ثمّ يُسأل بعد الإبطال.

import { QueryClient } from "@tanstack/react-query";
import { readFileSync } from "fs";
import { join } from "path";
import {
  invalidatePermissionShapedQueries,
  isPermissionShapedOrdersKey,
} from "./queryClient";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

const A = 1473;   // صفحةُ مريضٍ مفتوحة
const B = 1500;   // مريضٌ آخر خُبِّئ ملفُّه قبل قليل

/** مفاتيحُ الأوامر كما تحفظها الشاشةُ فعلاً (`PatientWorkOrderCard`). */
const ORDER_KEYS: any[][] = [
  [`/api/manufacturing/patient/${A}/orders`],
  [`/api/manufacturing/patient/${B}/orders`],
];

/** مفاتيحُ لا علاقةَ لها بشكل المال — شاهدٌ على أن الإبطال مصوَّب لا كاسح. */
const UNRELATED_KEYS: any[][] = [
  [`/api/manufacturing/patient/${A}/summary`],
  [`/api/manufacturing/patient/${B}/summary`],
  [`/api/followups/patient/${A}`],
  [`/api/medical/patients/${A}/exams`],
  ["/api/manufacturing/orders"],
  ["/api/manufacturing/my-orders"],
];

function seeded(): QueryClient {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  //  ردُّ الأمر **بالمال** — كما يصل مَن يملك `canViewPayments`.
  for (const k of ORDER_KEYS) {
    c.setQueryData(k, [{ id: 362, agreedCost: 300000, paidOnDevice: 300000 }]);
  }
  for (const k of UNRELATED_KEYS) c.setQueryData(k, {});
  return c;
}

const present = (c: QueryClient, key: any[]) =>
  c.getQueryCache().find({ queryKey: key }) !== undefined;
const stale = (c: QueryClient, key: any[]) =>
  c.getQueryState(key)?.isInvalidated === true;

console.log("\n═══ الذاكرة عند تغيّر لقطة الصلاحيات ═══\n");

// ── أ · **العطبُ نفسه: القائمةُ المكتوبةُ حرفاً لا تبلغ هذا المفتاح** ────
console.log("── أ · القائمةُ القديمة وحدها ──");
{
  const c = seeded();
  //  ما كان `App.tsx` يفعله وحده عند تغيّر الصلاحية.
  c.invalidateQueries({ queryKey: ["/api/patients"] });
  c.invalidateQueries({ queryKey: ["/api/patients/registry"] });
  c.invalidateQueries({ queryKey: ["/api/patients/:id"] });
  const untouched = ORDER_KEYS.filter((k) => !stale(c, k));
  same("أ١. **مفاتيحُ الأوامر تبقى كما هي** — سببُ العطب",
    untouched.length, ORDER_KEYS.length);
  check("أ٢. والمبلغُ ما زال في الذاكرة يُقرأ",
    (c.getQueryData(ORDER_KEYS[0]) as any[])[0].paidOnDevice === 300000);
}

// ── ب · **وبالمُسنِد تُبطَل كلُّها، لأيّ مريض** ──────────────────────────
console.log("\n── ب · بالمُسنِد ──");
{
  const c = seeded();
  invalidatePermissionShapedQueries(c);
  const missed = ORDER_KEYS.filter((k) => !stale(c, k));
  same("ب١. **كلُّ مفتاحِ أوامرٍ محفوظ صار بائتاً** — بلا استثناء",
    missed.map((k) => k.join("|")), []);
  check("ب٢. **إبطالٌ لا نزع** — الصفحةُ تبقى معروضةً حتى يصل الجديد",
    ORDER_KEYS.every((k) => present(c, k)));
}

// ── ج · **ولا يُمَسّ مفتاحٌ لا يتبع الصلاحية** ──────────────────────────
console.log("\n── ج · الإبطالُ مصوَّب لا كاسح ──");
{
  const c = seeded();
  invalidatePermissionShapedQueries(c);
  for (const k of UNRELATED_KEYS) {
    check(`ج. **${k.join("|")} لم يُمَسّ**`, !stale(c, k), JSON.stringify(k));
  }
}

// ── د · **القرارُ خالصٌ ومحدود** ────────────────────────────────────────
//  رقمٌ في جسم المفتاح لا عنصرٌ تالٍ — فالمطابقةُ على الشكل كلِّه لا على
//  بادئةٍ تبتلع ما ليس منها (`…/summary` مثلاً).
console.log("\n── د · القرارُ الخالص ──");
{
  const yes: string[] = [
    "/api/manufacturing/patient/1/orders",
    "/api/manufacturing/patient/1473/orders",
    "/api/manufacturing/patient/99999999/orders",
  ];
  const no: string[] = [
    "/api/manufacturing/patient/1473/summary",
    "/api/manufacturing/orders",
    "/api/manufacturing/patient//orders",
    "/api/manufacturing/patient/abc/orders",
    "/api/manufacturing/patient/1473/orders/extra",
    "x/api/manufacturing/patient/1473/orders",
    "/api/patients/1473",
  ];
  for (const k of yes) check(`د. «${k}» يُطابق`, isPermissionShapedOrdersKey([k]));
  for (const k of no) check(`د. «${k}» لا يُطابق`, !isPermissionShapedOrdersKey([k]));
  check("د. ومفتاحٌ أوّلُه ليس نصّاً لا يُطابق",
    !isPermissionShapedOrdersKey([123]) && !isPermissionShapedOrdersKey([]));
}

// ── هـ · **عقدُ الوصل: `App.tsx` ينادِيها فعلاً في فرع الصلاحية** ───────
//  الدالّةُ وحدها لا تحرس شيئاً إن لم تُنادَ — والقرارُ يعيش داخل
//  `useEffect` في مكوّن React، والمشروعُ بلا مشغّل DOM، فيُقفَل الوصلُ
//  بقراءة المصدر (نفسُ نمط `test:ai-chat-input` و`test:my-exams-phone`).
console.log("\n── هـ · عقدُ الوصل في App.tsx ──");
{
  const app = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8")
    .replace(/\/\/[^\n]*/g, "");  // التعليقاتُ تُزال فلا يمرّ ذكرٌ بدل كود
  check("هـ١. تستوردها `App.tsx`",
    /import\s*\{[^}]*invalidatePermissionShapedQueries[^}]*\}\s*from\s*"\.\/lib\/queryClient"/
      .test(app));
  const branch = app.slice(app.indexOf("if (patientOrPaymentViewChanged)"));
  const body = branch.slice(0, branch.indexOf("\n      }") + 1);
  check("هـ٢. وتُنادى **داخل فرع تغيّر المرضى/الدفعات** لا خارجه",
    body.includes("invalidatePermissionShapedQueries(queryClient)"),
    body.slice(0, 400));
  check("هـ٣. والفرعُ ما زال يتبع `canViewPayments` كما كان",
    /prevPermSnapshot\.canViewPayments !== nextPermSnapshot\.canViewPayments/.test(app));
}

console.log(failures === 0
  ? "\n✅ كلُّ البنود خضراء\n"
  : `\n❌ ${failures} بنداً ساقطاً\n`);
process.exit(failures === 0 ? 0 : 1);
