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
//   ٤. **ونطاقُها شخصُه وحده** (ترحيل ٠٨٦، مراجعةٌ آلية على #٣٧٣): سؤالٌ
//      عن **مركزٍ** لا عن شخصه لا يجد فيها توجيهاً نافياً يُقرأ نفياً عن
//      المركز — والنسخةُ القديمة تبقى بنصّها مُطفأة.

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
import { sql as scopeSql } from "./migrations/086_owner_profile_scope";
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

const COLS = `id, title, body, scope, content_type, audience, is_active, version,
              branch_id, supersedes_id, created_by_name, approved_by_name`;

/** صفُّ ٠٨٥ بعينه — تُقاس عليه idempotency الزرع وبقاءُ النسخة القديمة. */
async function row() {
  const r = await pool.query(
    `SELECT ${COLS} FROM ai_knowledge_articles WHERE seed_key = $1`, [SEED_KEY]);
  return r.rows;
}

/**
 *  **المقالةُ الفعّالة من هذه السلسلة** — وهي ما يصل النموذجَ فعلاً.
 *  بعد ٠٨٦ هي النسخةُ الثانية؛ وقبله كانت الأولى. فالبنودُ الموضوعية
 *  (الحقائق · المراكز · الاسترجاع) تُقاس على **ما يُقرأ**، لا على صفٍّ
 *  بمفتاحٍ بعينه قد يكون متقاعداً.
 */
async function activeRow() {
  const r = await pool.query(
    `SELECT ${COLS} FROM ai_knowledge_articles
      WHERE seed_key LIKE 'center_owner_profile%' AND is_active = true`);
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
  const v1 = rows[0];

  //  ══ ٠٨٦ يُطبَّق هنا، فتُقاس البنودُ على ما يصل النموذجَ فعلاً ═════════
  //  ويُشغَّل **مرّتين**: الثانيةُ تُثبت idempotency (لا نسخةَ ثالثة).
  await pool.query(scopeSql);
  await pool.query(scopeSql);

  let actives = await activeRow();
  check(actives.length === 1, "أ٢. فعّالةٌ واحدةٌ بالضبط من السلسلة", `got ${actives.length}`);
  if (actives.length !== 1) {
    console.log("\n❌ لا مقالةَ فعّالة — الترحيلُ ٠٨٦ لم يعمل كما يجب. توقّف.");
    await pool.end();
    process.exit(1);
  }
  const a = actives[0];
  check(a.version === 2 && a.supersedes_id === v1.id,
    "أ٣. **والفعّالةُ نسخةٌ ثانية تخلُف الأولى**", `v${a.version} ← ${a.supersedes_id}`);
  const v1After = (await row())[0];
  check(v1After.is_active === false, "أ٤. **والأولى مُطفأة**", String(v1After.is_active));
  //  **ولا يُمحى نصُّ القديمة** — المعرفةُ تُنسَخ ولا تُمحى (٤.n).
  check(String(v1After.body) === String(v1.body),
    "أ٥. **ونصُّ القديمة باقٍ بحرفه** — تُقرأ للتدقيق", "تغيّر متنُ النسخة الأولى");
  //  **وأ٤ ليس بنداً فارغاً**: ٠٨٥ لا يضبط `is_active` إطلاقاً، والعمودُ
  //  افتراضُه `true` — فصفُّه يولد فعّالاً، وإطفاؤه لا يقع إلّا من ٠٨٦.
  //  (ويُقال هكذا لا بمقارنةِ «قبل وبعد» في هذا التشغيل: الحزمةُ تُعاد على
  //  القاعدة نفسِها، فالتشغيلُ الثاني يجد الأصلَ مُطفأً سلفاً بحقّ.)
  check(!/is_active/i.test(migrationSql),
    "أ٦. (و٠٨٥ لا يضبط `is_active` — فإطفاؤها أثرُ ٠٨٦ وحده، والبندُ أعلاه ليس فارغاً)");

  check(a.scope === "general", "أ٧. النطاق general — يصل كلَّ موظّف", String(a.scope));
  check(a.audience === null, "أ٨. بلا جمهورٍ محدَّد (audience = NULL)", JSON.stringify(a.audience));
  check(a.branch_id === null, "أ٩. بلا فرعٍ — ليست مقالةَ فرعٍ بعينه", String(a.branch_id));
  check(a.content_type === "workflow",
    "أ١٠. content_type الافتراضية — لا قيمةَ ثالثة تُوسَّع لأجلها", String(a.content_type));
  //  العنوانُ يزن ×٣ في `scoreArticle`. **والمتنُ وحده يكفي اليوم** لإصابة
  //  كلّ أسئلة القسم «و» (مُتحقَّقٌ بالعكس: تجريدُ العنوان لا يُسقط منها
  //  بنداً) — فهذا بندُ تصميمٍ يحمي الترتيبَ حين يكبر عددُ المقالات، لا
  //  شرطٌ يتوقّف عليه الاسترجاعُ الآن.
  check(String(a.title).includes("ياسر الساعدي") && String(a.title).includes("صاحب"),
    "أ١١. العنوان يحمل الاسمَ وصفةَ المِلكية (وزنُه ×٣ في الترشيح)", String(a.title));

  console.log("\n═══ ب. إعادةُ الزرع لا تكرّر ولا تكتب فوق تحريرٍ لاحق ═══");
  const before = JSON.stringify((await row())[0]);
  await pool.query(migrationSql);
  rows = await row();
  check(rows.length === 1, "ب١. ما زال صفّاً واحداً بعد إعادة التشغيل", `got ${rows.length}`);
  check(JSON.stringify(rows[0]) === before, "ب٢. الصفُّ مطابقٌ بايتاً — لا كتابةَ فوق");
  check((await activeRow()).length === 1,
    "ب٢أ. **ولا نسخةَ ثالثة** — ٠٨٦ شُغِّل مرّتين والفعّالةُ واحدة");

  //  ══ وحارسُ «نُسخ سلفاً» معزولاً عن حارس «مُطفأ» ═══════════════════════
  //  التشغيلُ الثاني أعلاه يجتاز الحارسَين معاً (الأصلُ مُطفأٌ **و**منسوخ).
  //  وهذا يعزل الثاني: الأصلُ يُعاد تفعيلُه مؤقّتاً مع بقاء نسخته — وهي
  //  صورةُ «حرّره المسؤولُ من لوحة التحكّم» — فيجب ألّا يُنشَأ شيء.
  const beforeGuard = (await pool.query(
    `SELECT COUNT(*)::int AS n FROM ai_knowledge_articles
      WHERE seed_key LIKE 'center_owner_profile%'`)).rows[0].n;
  //  **وتُقاس الحالةُ قبل العبث ثمّ تُستعاد كما كانت** — لا تُكتب قيمةٌ
  //  مفترَضة: لو لم يُطبَّق ٠٨٦ لكان «تعطيلُ الأصل» يُطفئ المقالةَ الوحيدة
  //  فتسقط بنودٌ لا علاقةَ لها بالحارس، ويُقرأ العطبُ في غير موضعه.
  const wasActive = (await row())[0].is_active;
  await pool.query(`UPDATE ai_knowledge_articles SET is_active = true WHERE seed_key = $1`,
    [SEED_KEY]);
  await pool.query(scopeSql);
  const afterGuard = (await pool.query(
    `SELECT COUNT(*)::int AS n FROM ai_knowledge_articles
      WHERE seed_key LIKE 'center_owner_profile%'`)).rows[0].n;
  check(afterGuard === beforeGuard,
    "ب٢ب. **ولا يُنشئ شيئاً إن كان الأصلُ منسوخاً سلفاً** — تحريرُ المسؤول لا يُستبدَل",
    `${beforeGuard} → ${afterGuard}`);
  await pool.query(`UPDATE ai_knowledge_articles SET is_active = $2 WHERE seed_key = $1`,
    [SEED_KEY, wasActive]);
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

  console.log("\n═══ ط. ونطاقُها شخصُه — لا نفيٌ عن المركز ═══");
  //  المقالةُ تسمّي المراكزَ الخمسةَ ومدنَها بالضرورة، فسؤالٌ عن **مركز**
  //  يستدعيها — **وهذا قيسَ ولا يُعالَج بالصياغة**: حذفُ «هاتف»/«عنوان» من
  //  المتن لا يوقف المطابقة (هي من «مركز»/«فرع» وأسماء المدن)، وبوّابةُ
  //  هويّةٍ قبل الاسترجاع كانت ستُسقط أسئلةً مشروعة. **فالمقصودُ أن تصير
  //  المطابقةُ غيرَ ضارّة**: لا توجيهَ نافياً يُقرأ نفياً عن المركز.
  const CENTER_CONTACT = [
    "ما عنوان فرع بغداد؟",
    "أريد رقم هاتف المركز",
    "ما رقم هاتف مركز كربلاء؟",
    "وين موقع مركز ذي قار؟",
    "كيف أتواصل مع مركز الموصل؟",
  ];
  //  ① المتنُ لا يعدّد أمثلةً (هاتف/عنوان) يُقرأ نفيُها نفياً عن المركز.
  check(!body.includes("هاتف") && !body.includes("عنوان"),
    "ط١. **ولا «هاتف» ولا «عنوان» في المتن** — الأمثلةُ التي كانت تُوهِم أُزيلت",
    body.slice(0, 200));
  //  ② والتوجيهُ النافي مقصورٌ على شخصه صراحةً.
  check(body.includes("عن شخصه لا يُخمَّن"),
    "ط٢. **والنفيُ مقصورٌ على شخصه** لا مطلقاً");
  //  ③ وتقول صراحةً إنها ليست مصدرَ سؤالٍ عن مركز — ولا يُبنى على سكوتها نفي.
  check(body.includes("ليست مصدرَه"),
    "ط٣. **وتقول إنها ليست مصدرَ سؤالٍ عن مركز**");
  check(body.includes("سكوتها نفيٌ عن المركز"),
    "ط٤. **ولا يُبنى على سكوتها نفيٌ عن المركز** — الجملةُ التي تُغلق سوءَ التطبيق");
  check(body.includes("إدارة فرعه"),
    "ط٥. وتدلّ على المخرج الحقيقيّ — إدارةُ الفرع");
  //  ④ والنسخةُ القديمة كانت تحمل العطبَ فعلاً — فالبنودُ أعلاه ليست فارغة.
  check(String(v1.body).includes("هاتف") && String(v1.body).includes("عنوان"),
    "ط٦. (والقديمةُ كانت تعدّدهما فعلاً — فالإصلاحُ يقابل عطباً واقعاً)");
  //  ⑤ والمطابقةُ نفسُها باقية، ويُقال ذلك صراحةً لا يُدَّعى خلافُه.
  let matched = 0;
  for (const q of CENTER_CONTACT) {
    const top = await retrieve(q);
    if (top.some((t) => t.id === a.id)) matched++;
  }
  check(matched === CENTER_CONTACT.length,
    "ط٧. **والمطابقةُ باقيةٌ عمداً** — لا تُطارَد بصياغةٍ تُفقِد أسئلةً مشروعة",
    `matched ${matched}/${CENTER_CONTACT.length}`);

  console.log("\n═══ ح. حارسٌ معماريّ — زرعٌ لا بناء ═══");
  const src = migrationSql;
  for (const kw of ["CREATE TABLE", "ALTER TABLE", "DROP", "DELETE", "UPDATE", "TRUNCATE"]) {
    check(!src.toUpperCase().includes(kw), `ح. الترحيلُ ٠٨٥ بلا ${kw}`);
  }
  check(src.includes("ON CONFLICT (seed_key) DO NOTHING"),
    "ح. وبـON CONFLICT DO NOTHING");

  //  و٠٨٦ يُطفئ رايةً فله `UPDATE` بحقّ — **لكن على صفٍّ واحدٍ بمعرّفه**،
  //  ولا هدمَ فيه بحال.
  const src86 = scopeSql;
  for (const kw of ["CREATE TABLE", "ALTER TABLE", "DROP", "DELETE", "TRUNCATE"]) {
    check(!src86.toUpperCase().includes(kw), `ح٢. الترحيلُ ٠٨٦ بلا ${kw}`);
  }
  check(/UPDATE ai_knowledge_articles[\s\S]{0,120}WHERE id = v1\.id/.test(src86),
    "ح٣. **و`UPDATE` الوحيدُ فيه على صفٍّ بمعرّفه** — لا شرطَ واسع");
  check((src86.match(/UPDATE /g) ?? []).length === 1,
    "ح٤. **ولا `UPDATE` ثانٍ** في الترحيل");
  check(src86.includes("supersedes_id = v1.id") && src86.includes("RETURN"),
    "ح٥. **ومشروطٌ**: لا يعمل إن كان الأصلُ منسوخاً سلفاً أو مُطفأً");

  console.log(`\n${failures === 0 ? "✅ كلُّ البنود ناجحة" : `❌ ${failures} بنداً فاشلاً`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
