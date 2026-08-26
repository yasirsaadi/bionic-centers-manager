// **أمانُ قاعدةِ الاختبارات** — اختبارٌ خالص، **بلا قاعدةِ بيانات إطلاقاً**.
//
// `npm run test:db-safety`
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════════
// أن حزمةَ اختباراتٍ تكتب وتحذف لا تُشغَّل على قاعدةٍ حيّة. والعطبُ الذي كُتب
// لأجله: `server/db.ts` يبني المسبحَ من `EXTERNAL_DATABASE_URL ||
// DATABASE_URL`، بينما ٤٥ ملفَّ اختبارٍ يحرسون `DATABASE_URL` وحده — فتمرّ
// التركيبةُ التي توجّه المسبحَ إلى الإنتاج بينما الحارسُ يقرأ محلّياً آمناً.
//
// ══ ولا يستورد `pg` ولا `./db` ولا `drizzle` ═══════════════════════════════
// يستورد `./db_url` وحده — منطقٌ خالص. **فتشغيلُ هذا الملفّ لا يفتح اتّصالاً**،
// وهو الشرطُ الذي يجعله صالحاً للتشغيل قبل أن تثبت الحمايةُ نفسُها.
//
// وقراءةُ `server/db.ts` أدناه **نصّاً** (`readFileSync`) لا استيراداً —
// فالترتيبُ يُثبَت بلا تنفيذِ الملفّ ولا بناءِ مسبح.

import { readFileSync } from "fs";
import { join } from "path";
import {
  resolveDatabaseUrl, resolvedDatabaseUrlSource, isPermittedTestDatabaseUrl,
  isTestEntryPoint, checkDatabaseSafety, assertDatabaseSafeForEntryPoint,
  inspectDatabaseUrl, DATABASE_URL_VARS,
} from "./db_url";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

//  روابطُ العيّنات — **لا واحدَ منها يُتّصل به**، فهي نصوصٌ تُقرأ لا وجهات.
const PROD = "postgres://u:p@ep-cool-forest-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const LOCAL = "postgres://postgres:postgres@localhost:55432/bionic_test";
const LOCAL_IP = "postgres://postgres:postgres@127.0.0.1:5432/anything";
const NAMED_TEST = "postgres://u:p@db.example.com/bionic_test";
const TEST_ARGV = ["/opt/node22/bin/node", "/home/user/bionic-centers-manager/server/pending_charge.test.ts"];
const SERVER_ARGV = ["/opt/node22/bin/node", "/home/user/bionic-centers-manager/server/index.ts"];
const BUILD_ARGV = ["/opt/node22/bin/node", "/home/user/bionic-centers-manager/script/build.ts"];
const PROD_ARGV = ["/opt/node22/bin/node", "/home/user/bionic-centers-manager/dist/index.cjs"];

console.log("\n── ٠. الأسبقيةُ كما هي في الإنتاج ──");

same("١. `EXTERNAL_DATABASE_URL` تسبق `DATABASE_URL`",
  resolveDatabaseUrl({ EXTERNAL_DATABASE_URL: PROD, DATABASE_URL: LOCAL }), PROD);
same("٢. وبغيابها تُقرأ `DATABASE_URL`",
  resolveDatabaseUrl({ DATABASE_URL: LOCAL }), LOCAL);
same("٣. والفارغةُ لا تفوز على الموجودة — الفراغُ ليس قيمة",
  resolveDatabaseUrl({ EXTERNAL_DATABASE_URL: "   ", DATABASE_URL: LOCAL }), LOCAL);
same("٤. وبلا شيءٍ ⟶ `null`", resolveDatabaseUrl({}), null);
same("٥. **وترتيبُ الأسبقية معلَنٌ لا مخفيّ**",
  [...DATABASE_URL_VARS], ["EXTERNAL_DATABASE_URL", "DATABASE_URL"]);
same("٦. ويُقال أيُّ متغيّرٍ فاز",
  [resolvedDatabaseUrlSource({ EXTERNAL_DATABASE_URL: PROD, DATABASE_URL: LOCAL }),
    resolvedDatabaseUrlSource({ DATABASE_URL: LOCAL }),
    resolvedDatabaseUrlSource({})],
  ["EXTERNAL_DATABASE_URL", "DATABASE_URL", null]);

console.log("\n── ١. قاعدةُ السماح — تفكيكُ الرابط لا مطابقةُ سلسلةٍ فرعية ──");
same("٧. المضيفُ المحلّيُّ بأيّ منفذ ⟶ مسموح",
  [LOCAL, LOCAL_IP, NAMED_TEST].map(isPermittedTestDatabaseUrl), [true, true, true]);
same("٨. ورابطُ الإنتاج ⟶ ممنوع", isPermittedTestDatabaseUrl(PROD), false);
same("٩. والغائبُ ممنوع", [isPermittedTestDatabaseUrl(null), isPermittedTestDatabaseUrl(undefined)],
  [false, false]);

// ══════════════════════════════════════════════════════════════════════════
//  ١.ب **الشرطُ الموروث كان يمرّر هذه كلَّها** — والمطابقةُ على نصّ الرابط
//  كلِّه هي العطب. كلُّ صفٍّ هنا يُقارَن بالشرط القديم صراحةً فلا يُدَّعى
//  التشديدُ بل يُثبَت.
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── ١.ب مسموحٌ ومرفوض، صفّاً صفّاً ──");
{
  const LEGACY = /test|localhost|127\.0\.0\.1/;

  const ALLOW: [string, string][] = [
    ["المضيفُ بالضبط localhost بأيّ منفذ", "postgres://postgres:postgres@localhost:55432/bionic_test"],
    ["   وبلا منفذٍ أصلاً", "postgres://u:p@localhost/neondb"],
    ["المضيفُ بالضبط 127.0.0.1 بأيّ منفذ", "postgres://u:p@127.0.0.1:5432/anything"],
    ["قاعدةٌ بعيدةٌ اسمُها bionic_test", "postgres://u:p@db.example.com/bionic_test"],
    ["قاعدةٌ بعيدةٌ اسمُها bionic-test", "postgres://u:p@db.example.com/bionic-test"],
    ["قاعدةٌ بعيدةٌ اسمُها test", "postgres://u:p@db.example.com/test"],
    ["قاعدةٌ بعيدةٌ اسمُها test_bionic", "postgresql://u:p@db.example.com/test_bionic"],
  ];
  for (const [label, url] of ALLOW) {
    check(isPermittedTestDatabaseUrl(url), `✔ ${label}`, JSON.stringify(inspectDatabaseUrl(url)));
  }

  //  **الإيجابياتُ الكاذبةُ التي كان الشرطُ القديم يقبلها** — لكلٍّ سببُ ردٍّ
  //  مسمّىً، فلا يُردّ الرابطُ لسببٍ غير الذي نظنّه.
  const REFUSE: [string, string, string][] = [
    ["مضيفٌ latest-prod.example.com — «test» داخل «latest»",
      "postgres://u:p@latest-prod.example.com/neondb", "remote_not_test_named"],
    ["مضيفٌ notlocalhost.example.com — «localhost» مبتلَعة",
      "postgres://u:p@notlocalhost.example.com/prod", "remote_not_test_named"],
    ["قاعدةٌ اسمُها latest", "postgres://u:p@db.example.com/latest", "remote_not_test_named"],
    ["قاعدةٌ اسمُها contest", "postgres://u:p@db.example.com/contest", "remote_not_test_named"],
    ["قاعدةٌ اسمُها attestation",
      "postgres://u:p@db.example.com/attestation", "remote_not_test_named"],
    ["إنتاجٌ و?application_name=test في الاستعلام",
      "postgres://u:p@ep-x.aws.neon.tech/neondb?sslmode=require&application_name=test",
      "remote_not_test_named"],
    ["مضيفٌ يحمل test واسمُ القاعدة production",
      "postgres://u:p@testhost.example.com/production", "remote_not_test_named"],
    ["مستخدمٌ اسمُه test والقاعدةُ إنتاج",
      "postgres://test:p@db.example.com/production", "remote_not_test_named"],
    ["رابطٌ لا يُفكَّك", "host=localhost dbname=test", "unparseable"],
    ["نصٌّ ليس رابطاً أصلاً", "bionic_test", "unparseable"],
    ["مخطَّطٌ ليس postgres", "mysql://u:p@localhost/test", "non_postgres_scheme"],
    ["مضيفٌ بعيدٌ بلا اسمِ قاعدة", "postgres://u:p@db.example.com/", "no_database_name"],
  ];
  for (const [label, url, why] of REFUSE) {
    const v = inspectDatabaseUrl(url);
    check(!v.permitted && v.rejection === why, `✘ ${label}`,
      `rejection=${v.rejection ?? "(none)"} expected=${why}`);
    //  **والشرطُ القديم كان يقبلها** — إلّا ما لا يحوي الكلمةَ أصلاً.
    if (LEGACY.test(url)) {
      check(true, `   (وكان الشرطُ الموروث يمرّرها)`);
    }
  }

  //  **المطابقةُ الكاملة للمضيف المحلّيّ** — لا احتواء، ولا حساسيةَ لحالة الأحرف.
  same("المضيفُ يُطابَق كاملاً لا احتواءً",
    ["postgres://u:p@LOCALHOST/x", "postgres://u:p@localhost.example.com/prod",
      "postgres://u:p@127.0.0.1.example.com/prod"].map(isPermittedTestDatabaseUrl),
    [true, false, false]);

  //  **والمحلّيُّ يُسمَح مهما كان اسمُ قاعدته** — قاعدةٌ على جهاز المطوّر.
  check(isPermittedTestDatabaseUrl("postgres://u:p@localhost:5432/production"),
    "والمحلّيُّ مسموحٌ ولو سُمّيت قاعدتُه production");

  //  **واسمُ القاعدة وحده يُفحَص للبعيد** — يُقرأ من المسار لا من الاستعلام.
  same("واسمُ القاعدة يُقرأ من مقطع المسار وحده",
    inspectDatabaseUrl("postgres://u:p@db.example.com/neondb?x=bionic_test").database, "neondb");
}

console.log("\n── ٢. كشفُ نقطةِ دخولِ الاختبار ──");
same("١٠. **`tsx <path>.test.ts` ⟶ اختبار**", isTestEntryPoint(TEST_ARGV), true);
same("١١. و`.test.tsx` كذلك",
  isTestEntryPoint(["node", "/x/client/src/components/a.test.tsx"]), true);
same("١٢. **ونقاطُ الدخول الحيّة ليست اختباراً** — الخادم والبناء والإنتاج",
  [SERVER_ARGV, BUILD_ARGV, PROD_ARGV].map(isTestEntryPoint), [false, false, false]);
same("١٣. ولا ملفٌّ يحمل `test` في اسمه دون اللاحقة",
  isTestEntryPoint(["node", "/x/server/latest_report.ts"]), false);
same("١٤. وبلا `argv` ⟶ ليس اختباراً (فلا يُعطَّل شيءٌ بالسهو)",
  [isTestEntryPoint(undefined), isTestEntryPoint([])], [false, false]);

// ══════════════════════════════════════════════════════════════════════════
//  الحالاتُ الخمس التي طلبها المالك — أ ب ج د هـ
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── ٣. الحالاتُ الخمس ──");

//  (أ) **العطبُ الأصليّ**: الحارسُ القديم كان يمرّرها لأنه يقرأ `DATABASE_URL`.
{
  const d = checkDatabaseSafety({
    env: { EXTERNAL_DATABASE_URL: PROD, DATABASE_URL: LOCAL }, argv: TEST_ARGV,
  });
  same("(أ) إنتاجٌ في EXTERNAL + محلّيٌّ في DATABASE ⟶ **يُرفَض**",
    [d.allowed, d.isTest, d.source], [false, true, "EXTERNAL_DATABASE_URL"]);
  same("   والرابطُ المحسوب هو رابطُ الإنتاج — لا المحلّيّ المطمئن",
    d.resolvedUrl, PROD);
  check(String(d.reason).includes("EXTERNAL_DATABASE_URL"),
    "   والرسالةُ تسمّي المتغيّرَ الفائز فلا يُصحَّح الآخرُ عبثاً", String(d.reason));
  //  **وهذا بالضبط ما كان الحارسُ القديم يقبله** — يُثبَت لا يُدَّعى.
  const legacyGuardWouldPass = /test|localhost|127\.0\.0\.1/.test(LOCAL);
  check(legacyGuardWouldPass && !d.allowed,
    "   **والحارسُ المحلّيُّ القديم كان يمرّرها** — والجديدُ يمنعها");
}

//  (ب) الحالةُ السليمة المعتادة.
{
  const d = checkDatabaseSafety({ env: { DATABASE_URL: LOCAL }, argv: TEST_ARGV });
  same("(ب) بلا EXTERNAL + محلّيٌّ في DATABASE ⟶ **يُسمَح**",
    [d.allowed, d.isTest, d.source], [true, true, "DATABASE_URL"]);
}

//  (ج) القرارُ يتبع الرابطَ الفعليَّ لا الأسوأ ظاهراً.
{
  const d = checkDatabaseSafety({
    env: { EXTERNAL_DATABASE_URL: NAMED_TEST, DATABASE_URL: PROD }, argv: TEST_ARGV,
  });
  same("(ج) EXTERNAL اختباريّ + DATABASE إنتاجيّ ⟶ **يُسمَح** بحكم الفعليّ",
    [d.allowed, d.source, d.resolvedUrl], [true, "EXTERNAL_DATABASE_URL", NAMED_TEST]);
  check(!isPermittedTestDatabaseUrl(PROD),
    "   **ورابطُ `DATABASE_URL` الإنتاجيُّ لا يُستشار أصلاً** — المسبحُ لن يستعمله");
}

//  (د) الحالةُ الصريحة الخطرة.
{
  const d = checkDatabaseSafety({ env: { DATABASE_URL: PROD }, argv: TEST_ARGV });
  same("(د) بلا EXTERNAL + إنتاجيٌّ في DATABASE ⟶ **يُرفَض**",
    [d.allowed, d.isTest, d.source], [false, true, "DATABASE_URL"]);
}

//  (هـ) **ولا يتغيّر تشغيلٌ طبيعيّ بحرف** — وهذا شرطُ ألّا يكسر الحارسُ الإنتاج.
{
  const cases: [string, readonly string[]][] = [
    ["خادمُ التطوير (server/index.ts)", SERVER_ARGV],
    ["البناء (script/build.ts)", BUILD_ARGV],
    ["الإنتاج (dist/index.cjs)", PROD_ARGV],
  ];
  for (const [label, argv] of cases) {
    const d = checkDatabaseSafety({ env: { EXTERNAL_DATABASE_URL: PROD }, argv });
    same(`(هـ) ${label} على قاعدة الإنتاج ⟶ **يُسمَح ولا يُمَسّ**`,
      [d.allowed, d.isTest], [true, false]);
  }
  //  ولا حتى حين تكون البيئةُ فارغةً تماماً — الخادمُ يرمي رسالتَه القديمة لا رسالتَنا.
  const empty = checkDatabaseSafety({ env: {}, argv: SERVER_ARGV });
  same("   وبيئةٌ فارغة خارج الاختبار ⟶ لا رأيَ للحارس", [empty.allowed, empty.isTest],
    [true, false]);
}

console.log("\n── ٤. الرمي عند المنع، والصمت عند السماح ──");
{
  let threw = false;
  try {
    assertDatabaseSafeForEntryPoint({
      env: { EXTERNAL_DATABASE_URL: PROD, DATABASE_URL: LOCAL }, argv: TEST_ARGV,
    });
  } catch { threw = true; }
  check(threw, "١٥. **الحارسُ يرمي** عند التركيبة الخطرة — لا يكتفي بتحذير");

  let ok = true;
  try {
    assertDatabaseSafeForEntryPoint({ env: { DATABASE_URL: LOCAL }, argv: TEST_ARGV });
  } catch { ok = false; }
  check(ok, "١٦. ولا يرمي على قاعدةٍ اختبارية سليمة");

  let prodOk = true;
  try {
    assertDatabaseSafeForEntryPoint({ env: { EXTERNAL_DATABASE_URL: PROD }, argv: PROD_ARGV });
  } catch { prodOk = false; }
  check(prodOk, "١٧. **ولا يرمي في الإنتاج أبداً** — وإلّا صار الحارسُ هو العطل");
}

// ══════════════════════════════════════════════════════════════════════════
//  ٥. **الترتيبُ في `server/db.ts`** — الحارسُ قبل المسبح، نصّاً لا تنفيذاً
// ══════════════════════════════════════════════════════════════════════════
console.log("\n── ٥. الحارسُ يسبق بناءَ المسبح في db.ts ──");
{
  //  ══ **الدليلُ يقرأ ما يُنفَّذ لا ما يُشرَح** ═══════════════════════════════
  //  التعليقُ الذي يشرح الحارسَ يذكر `new Pool(...)` بالضرورة — وهو نصٌّ لا
  //  ينفّذ شيئاً. فقراءةُ الملفّ خاماً كانت تجعل شرحَ الحمايةِ دليلاً على
  //  غيابها. تُنزَع التعليقاتُ أوّلاً، ويُقارَن ما يبقى.
  //
  //  و`://` محميّةٌ عمداً: رابطُ قاعدةٍ في سطرِ شيفرةٍ ليس تعليقاً.
  const code = (src: string) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .split("\n")
      .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
      .join("\n");

  const dbSrc = code(readFileSync(join(import.meta.dirname, "db.ts"), "utf8"));
  const iGuard = dbSrc.indexOf("assertDatabaseSafeForEntryPoint(");
  const iPool = dbSrc.indexOf("new Pool(");
  check(iGuard > 0, "١٨. **والحارسُ منادىً في `db.ts`**");
  check(iPool > 0, "١٩. وبناءُ المسبح موجودٌ فيه");
  check(iGuard > 0 && iPool > 0 && iGuard < iPool,
    "٢٠. **والنداءُ يسبق `new Pool(` نصّاً** — فلا اتّصالَ يُفتَح قبل القرار",
    `guard@${iGuard} pool@${iPool}`);
  //  **ولا اتّصالَ ولا استعلامَ قبل الحارس** — يُثبَت بما لا يظهر قبله.
  const beforeGuard = dbSrc.slice(0, iGuard);
  for (const forbidden of ["new Pool(", ".query(", ".connect(", "drizzle("]) {
    check(!beforeGuard.includes(forbidden),
      `٢١. ولا «${forbidden}» قبل الحارس في الملفّ`);
  }
  //  **والأسبقيةُ لم تُكرَّر في `db.ts`** — تُقرأ من المصدر الواحد.
  check(dbSrc.includes("resolveDatabaseUrl(process.env)"),
    "٢٢. **و`db.ts` يقرأ الرابطَ من المصدر المشترك**");
  check(!/EXTERNAL_DATABASE_URL\s*\|\|\s*process\.env\.DATABASE_URL/.test(dbSrc),
    "٢٣. **ولا نسخةَ ثانية من الأسبقية في `db.ts`** — فلا تنحرف نسختان");
  //  ولا يستورد هذا الحارسُ قاعدةَ بيانات — الشرطُ الذي يجعله قابلاً للتشغيل الآن.
  const urlSrc = readFileSync(join(import.meta.dirname, "db_url.ts"), "utf8");
  for (const forbidden of ['from "pg"', 'from "./db"', "drizzle-orm"]) {
    check(!urlSrc.includes(forbidden),
      `٢٤. **ولا «${forbidden}» في «db_url.ts»** — منطقٌ خالص يُختبَر بلا اتّصال`);
  }
}

console.log(`\n${failures === 0
  ? "✅ كل فحوص أمان قاعدة الاختبارات نجحت"
  : `❌ ${failures} فشل`}\n`);
process.exit(failures === 0 ? 0 : 1);
