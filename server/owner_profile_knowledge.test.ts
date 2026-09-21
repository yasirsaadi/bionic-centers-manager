// اختبارُ مقالة تعريف صاحب المراكز (ترحيل ٠٨٥). `npm run test:owner-profile`.
//
// يقيس ثلاثةَ أشياء، كلُّها على القاعدة الحقيقية وعلى `retrieveKnowledge`
// نفسِها التي يناديها `server/ai/chat.ts`:
//
//   ١. **الصفُّ موجودٌ مرّةً واحدة بشكله** — والزرعُ idempotent.
//   ٢. **الحقائقُ التي أملاها المالكُ كلُّها في المتن**، وأسماءُ المراكز
//      الخمسة **مطابقةٌ لِـ`BRANCH_MAP` الحيّة** — فإن فُتح مركزٌ سادس أو
//      تغيّر اسمٌ سقط هذا البند وعرف مَن يقرأ أن المقالة تحتاج تحريراً.
//   ٣. **الاسترجاعُ يصيبها ولا يصيب غيرَها** — سؤالُ هويّةٍ يُرجعها أوّلاً
//      لموظّفِ استقبالٍ عاديّ (لا مسؤول)، وسؤالُ مسارِ عملٍ لا يُرجعها
//      إطلاقاً. **ولا نسخةَ ثانية من قواعد الترشيح هنا** — تُنادى الدالّةُ
//      القانونية كما هي.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { pool } from "./db";
import { sql as migrationSql } from "./migrations/085_owner_profile_knowledge";
import { retrieveKnowledge } from "./ai/knowledge/retrieval";
import { isLiveDataOnlyQuestion } from "@shared/ai_knowledge_retrieval";
import type { AiAccessContext } from "./ai/access";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const SEED_KEY = "center_owner_profile";

/** موظّفُ استقبالٍ عاديّ — لا مسؤول، ولا صلاحيةَ مالية، وفرعٌ واحد. */
const RECEPTION: AiAccessContext = {
  userId: 1, role: "reception", isAdmin: false,
  branchId: 1, branchName: "بايونك بغداد",
  permissions: { canAddPatients: true, canViewPatients: true },
  canUseFinance: false, mode: "general", financeScopeMissing: false,
  operationalBranches: [1],
};

async function row() {
  const r = await pool.query(
    `SELECT id, title, body, scope, content_type, audience, is_active, version,
            branch_id, supersedes_id, created_by_name, approved_by_name
       FROM ai_knowledge_articles WHERE seed_key = $1`, [SEED_KEY]);
  return r.rows;
}

/** الاسترجاعُ الحقيقيّ خلف بوّابة النيّة نفسِها التي في `chat.ts`. */
async function retrieve(q: string) {
  if (isLiveDataOnlyQuestion(q)) return [];
  return retrieveKnowledge(RECEPTION, q);
}

(async () => {
  console.log("\n═══ أ. الصفُّ المزروع وشكلُه ═══");
  let rows = await row();
  check(rows.length === 1, "أ١. صفٌّ واحدٌ بالضبط بمفتاح الزرع", `got ${rows.length}`);
  if (rows.length !== 1) {
    //  بلا صفٍّ لا معنى لبقيّة البنود — يُقال ذلك صراحةً بدل أن ينهار
    //  الملفُّ بـ`undefined` فيُقرأ عطبَ اختبارٍ لا غيابَ مقالة.
    console.log("\n❌ لا مقالة — الترحيلُ ٠٨٥ لم يُطبَّق أو أُزيل زرعُه. توقّف.");
    await pool.end();
    process.exit(1);
  }
  const a = rows[0];
  check(a.scope === "general", "أ٢. النطاق general — يصل كلَّ موظّف", String(a.scope));
  check(a.audience === null, "أ٣. بلا جمهورٍ محدَّد (audience = NULL)", JSON.stringify(a.audience));
  check(a.is_active === true, "أ٤. فعّالة", String(a.is_active));
  check(a.branch_id === null, "أ٥. بلا فرعٍ — ليست مقالةَ فرعٍ بعينه", String(a.branch_id));
  check(a.version === 1 && a.supersedes_id === null, "أ٦. النسخةُ الأولى، بلا سابقة");
  check(a.content_type === "workflow",
    "أ٧. content_type الافتراضية — لا قيمةَ ثالثة تُوسَّع لأجلها", String(a.content_type));
  //  العنوانُ يزن ×٣ في `scoreArticle`. **والمتنُ وحده يكفي اليوم** لإصابة
  //  كلّ أسئلة القسم «و» (مُتحقَّقٌ بالعكس: تجريدُ العنوان لا يُسقط منها
  //  بنداً) — فهذا بندُ تصميمٍ يحمي الترتيبَ حين يكبر عددُ المقالات، لا
  //  شرطٌ يتوقّف عليه الاسترجاعُ الآن.
  check(String(a.title).includes("ياسر الساعدي") && String(a.title).includes("صاحب"),
    "أ٨. العنوان يحمل الاسمَ وصفةَ المِلكية (وزنُه ×٣ في الترشيح)", String(a.title));

  console.log("\n═══ ب. إعادةُ الزرع لا تكرّر ولا تكتب فوق تحريرٍ لاحق ═══");
  const before = JSON.stringify(rows[0]);
  await pool.query(migrationSql);
  rows = await row();
  check(rows.length === 1, "ب١. ما زال صفّاً واحداً بعد إعادة التشغيل", `got ${rows.length}`);
  check(JSON.stringify(rows[0]) === before, "ب٢. الصفُّ مطابقٌ بايتاً — لا كتابةَ فوق");
  //  تحريرُ المسؤول لاحقاً لا يُمحى بنشرٍ يُعيد الترحيل.
  await pool.query(
    `UPDATE ai_knowledge_articles SET title = $2 WHERE seed_key = $1`,
    [SEED_KEY, "عنوانٌ حرّره المسؤول"]);
  await pool.query(migrationSql);
  rows = await row();
  check(rows[0].title === "عنوانٌ حرّره المسؤول",
    "ب٣. تحريرُ المسؤول يبقى — الزرعُ لا يستعيد نصَّه", String(rows[0].title));
  await pool.query(
    `UPDATE ai_knowledge_articles SET title = $2 WHERE seed_key = $1`, [SEED_KEY, a.title]);

  console.log("\n═══ ج. الحقائقُ التي أملاها المالك — لا واحدةَ تسقط ═══");
  const body: string = String(a.body);
  const FACTS: Array<[string, string[]]> = [
    ["صاحبُ المراكز ومالكها", ["صاحب المراكز", "مالك"]],
    ["صيدليّ", ["صيدلي"]],
    ["طبيب", ["طبيب"]],
    ["خبيرُ أطرافٍ ذكية", ["خبير", "أطراف", "ذكية"]],
    ["رجلُ أعمال", ["أعمال"]],
    ["يعيش بين تركيا والعراق", ["تركيا", "العراق"]],
    ["مساعداتٌ للمحتاجين", ["المساعدات", "للمحتاجين"]],
    ["العلمُ والمعرفة", ["العلم", "المعرفة"]],
    ["تطويرُ المراكز", ["تطوير"]],
    ["دعمُ ذوي الاحتياجات الخاصة", ["ذوي الاحتياجات الخاصة"]],
  ];
  for (const [label, needles] of FACTS) {
    const missing = needles.filter((n) => !body.includes(n));
    check(missing.length === 0, `ج. ${label}`, `missing: ${missing.join(", ")}`);
  }

  console.log("\n═══ د. المراكزُ الخمسة مطابقةٌ لخريطة الفروع الحيّة ═══");
  //  تُقرأ من **مصدر `server/routes.ts` نفسِه** لا من جدول الفروع في قاعدة
  //  اختبارٍ قد تحمل فروعاً ملفَّقة، ولا بنسخةِ أسماءٍ ثانيةٍ هنا تنحرف.
  //  و`usernameToBranch` غيرُ مصدَّرة — فلا يُوسَّع سطحُ `routes.ts` لأجل
  //  اختبار. والمدخلُ `admin` ليس مركزاً (branchId نصّيّ) فيُستبعَد بالشرط
  //  نفسِه الذي يميّزه في الشيفرة: رقمُ فرعٍ حقيقيّ.
  const routesSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "routes.ts"), "utf8");
  const mapBlock = routesSrc.slice(
    routesSrc.indexOf("const usernameToBranch"),
    routesSrc.indexOf("const verifyAdminSchema"));
  check(mapBlock.length > 0 && mapBlock.includes("branchName"),
    "د٠. خريطةُ الفروع موجودةٌ في المصدر بالشكل المتوقَّع");
  const liveBranches = Array.from(
    mapBlock.matchAll(/branchId:\s*\d+\s*,\s*branchName:\s*"([^"]+)"/g),
  ).map((m) => m[1]);
  check(liveBranches.length === 5,
    "د١. النظامُ الحيّ يحمل خمسةَ مراكز — كما قال المالك",
    `got ${liveBranches.length}: ${liveBranches.join(" · ")}`);
  const missingNames = liveBranches.filter((n) => !body.includes(n));
  check(missingNames.length === 0,
    "د٢. كلُّ اسمِ مركزٍ حيٍّ مذكورٌ في المقالة", `missing: ${missingNames.join(" · ")}`);
  check(body.includes("خمسة"), "د٣. العددُ مكتوبٌ صراحةً");

  console.log("\n═══ هـ. معلومةٌ لا سلطة ═══");
  check(body.includes("لا تمنح أحداً صلاحية"),
    "هـ١. المتنُ ينفي منحَ الصلاحية صراحةً");
  check(body.includes("جلسة المستخدم"),
    "هـ٢. ويدلّ على مصدر الصلاحية الحقيقيّ (الجلسة في الخادم)");
  check(body.includes("لا يُخمَّن"),
    "هـ٣. ويمنع تخمينَ تفصيلٍ شخصيٍّ غير وارد");
  check(!/\d{7,}/.test(body.replace(/\s/g, "")),
    "هـ٤. بلا رقمِ هاتفٍ ولا رقمٍ شخصيٍّ في المتن");

  console.log("\n═══ و. الاسترجاعُ يصيبها — لموظّفِ استقبالٍ عاديّ ═══");
  const IDENTITY = [
    "من هو الدكتور ياسر الساعدي؟",
    "من هو دكتور ياسر الساعدي؟",
    "من هو صاحب المراكز؟",
    "مين مالك المركز؟",
    "من يملك مراكز بايونك؟",
    "عرفني على الدكتور ياسر",
    "ما هي خبرة دكتور ياسر الساعدي؟",
    "صاحب الشركة منو؟",
    "شنو اسم مجموعة المراكز؟",
    "كم مركز عندنا؟",
    "دكتور ياسر وين يعيش؟",
    "من هو مؤسس المراكز",
  ];
  for (const q of IDENTITY) {
    const top = await retrieve(q);
    check(top.length > 0 && top[0].id === a.id, `و. ${q}`,
      `got: ${top.map((t) => `${t.score}:${t.title}`).join(" | ") || "(لا شيء)"}`);
  }

  console.log("\n═══ ز. ولا تصيب سؤالَ مسارِ عملٍ أبداً ═══");
  const UNRELATED = [
    "كيف أفتح صيانة؟",
    "كيف أسجل مريض طرف صناعي جديد؟",
    "ما هي خطوات إتمام البيع بعد المعاينة؟",
    "كيف أضيف دفعة للمريض؟",
    "ليش ما أشوف التقرير؟",
    "كيف أسعّر جلسات العلاج الطبيعي؟",
    "كيف أستعيد مريضاً محذوفاً؟",
    "ما حالة WB-02119؟",
  ];
  for (const q of UNRELATED) {
    const top = await retrieve(q);
    check(!top.some((t) => t.id === a.id), `ز. ${q}`,
      `owner article leaked: ${top.map((t) => t.title).join(" | ")}`);
  }

  console.log("\n═══ ح. حارسٌ معماريّ — زرعٌ لا بناء ═══");
  const src = migrationSql;
  for (const kw of ["CREATE TABLE", "ALTER TABLE", "DROP", "DELETE", "UPDATE", "TRUNCATE"]) {
    check(!src.toUpperCase().includes(kw), `ح. الترحيلُ بلا ${kw}`);
  }
  check(src.includes("ON CONFLICT (seed_key) DO NOTHING"),
    "ح. وبـON CONFLICT DO NOTHING");

  console.log(`\n${failures === 0 ? "✅ كلُّ البنود ناجحة" : `❌ ${failures} بنداً فاشلاً`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
