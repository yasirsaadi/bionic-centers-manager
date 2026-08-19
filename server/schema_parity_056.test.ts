// تطابقُ المخطّط مع الترحيل ٠٥٦ — **قاعدتان تُبنيان بطريقين وتُقارَنان**.
// قاعدة محلّية: `npm run test:schema-parity`.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// للنظام مصدرا مخطّطٍ اثنان: `shared/schema.ts` (يبني به `drizzle-kit push`
// قواعدَ التطوير) وملفّاتُ `server/migrations/` (تبني بها قاعدةُ الإنتاج
// تراكمياً). **وهما يصمتان حين يفترقان.**
//
// وهذا ما وقع فعلاً في ٠٥٦: الترحيلُ يعرّف `ON DELETE SET NULL` وفهرساً
// جزئياً، والمخطّطُ يعرّف مرجعاً عارياً بلا فهرس. فقاعدةُ التطوير تكسر
// «سحبَ نوع الحالة» على المفتاح (`NO ACTION`) بينما الإنتاجُ يمرّ، أو
// العكسُ في تعديلٍ لاحق — والاختبارُ يمرّ على قاعدةٍ ويسقط على أخرى بلا
// أن يفهم أحدٌ لماذا.
//
// ══ كيف يُقارَن ═════════════════════════════════════════════════════════
// قاعدتان مؤقّتتان تُنشآن ثم تُحذفان، وكلتاهما تبدأ بـ`drizzle-kit push`
// لأن ترحيلاتِ هذا الريبو **طبقةُ `ALTER` فوق أساسٍ يبنيه المخطّط** لا
// بناءٌ من الصفر:
//
//   • `parity_056_schema`     — المخطّطُ وحده. هذه قاعدةُ المطوِّر بعد
//                               `npm run db:push`.
//   • `parity_056_migrations` — المخطّطُ ثم **تُنزَع آثارُ ٠٥٦ الثلاثة**
//                               (الفهرس والمفتاح والعمود) فتعود القاعدةُ
//                               إلى ما كانت عليه قبل الترحيل، ثم يُطبَّق
//                               ٠٥٦ **مرّتين**. هذه قاعدةُ الإنتاج.
//
// ثم تُقرأ حقائقُ العمود والمفتاح والفهرس من `pg_catalog` في كلتيهما
// وتُطابَق. ولا يُقرأ نصٌّ من الملفّات إطلاقاً: ما تقوله القاعدةُ هو الحَكَم.
//
// والنزعُ ليس حيلة: هو تعريفُ السؤال. «قاعدةٌ رُقّيت بـ٠٥٦» تعني قاعدةً
// لم تكن تحمل آثارَه ثم حملتها منه — وهذا ما يُبنى هنا بالضبط.

import { execFileSync } from "child_process";
import { Client } from "pg";
import * as migration056 from "./migrations/056_cost_entry_department";
import * as migration057 from "./migrations/057_discount_requests";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

//  اسمان ثابتان: القاعدةُ تُحذف وتُنشأ في كل تشغيل، فلا أثرَ يتراكم.
const SCHEMA_DB = "parity_056_schema";
const MIGR_DB = "parity_056_migrations";
const adminUrl = (db: string) => DBURL.replace(/\/[^/?]+(\?|$)/, `/${db}$1`);

/** حقائقُ العمود والمفتاح والفهرس — من `pg_catalog` لا من الملفّات. */
const FACTS = `
SELECT jsonb_build_object(
  'column', (
    SELECT jsonb_build_object(
             'data_type', a.atttypid::regtype::text,
             'not_null', a.attnotnull)
      FROM pg_attribute a
     WHERE a.attrelid = 'cost_entries'::regclass
       AND a.attname = 'case_id' AND NOT a.attisdropped
  ),
  'fk', (
    SELECT jsonb_build_object(
             'target_table', c.confrelid::regclass::text,
             'target_column', (
               SELECT ta.attname FROM pg_attribute ta
                WHERE ta.attrelid = c.confrelid AND ta.attnum = c.confkey[1]),
             'on_delete', c.confdeltype,
             'on_update', c.confupdtype)
      FROM pg_constraint c
     WHERE c.conrelid = 'cost_entries'::regclass AND c.contype = 'f'
       AND c.conkey = ARRAY[(SELECT a.attnum FROM pg_attribute a
                              WHERE a.attrelid = 'cost_entries'::regclass
                                AND a.attname = 'case_id')]::smallint[]
  ),
  'discount_columns', (
    SELECT jsonb_object_agg(a.attname,
             jsonb_build_object('data_type', format_type(a.atttypid, a.atttypmod),
                                'not_null', a.attnotnull))
      FROM pg_attribute a
     WHERE a.attrelid = 'price_change_requests'::regclass
       AND a.attname IN ('discount_mode', 'discount_value', 'discount_amount')
       AND NOT a.attisdropped
  ),
  'discount_checks', (
    SELECT jsonb_object_agg(c.conname, pg_get_constraintdef(c.oid))
      FROM pg_constraint c
     WHERE c.conrelid = 'price_change_requests'::regclass AND c.contype = 'c'
       AND c.conname LIKE '%discount%'
  ),
  'index', (
    SELECT jsonb_build_object(
             'name', ci.relname,
             'columns', (
               SELECT jsonb_agg(att.attname ORDER BY k.ord)
                 FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
                 JOIN pg_attribute att
                   ON att.attrelid = i.indrelid AND att.attnum = k.attnum),
             'is_unique', i.indisunique,
             'predicate', pg_get_expr(i.indpred, i.indrelid))
      FROM pg_index i
      JOIN pg_class ci ON ci.oid = i.indexrelid
     WHERE i.indrelid = 'cost_entries'::regclass
       AND ci.relname = 'ix_cost_entries_case'
  )
) AS facts`;

async function withClient<T>(url: string, fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: url });
  await c.connect();
  try { return await fn(c); } finally { await c.end(); }
}

async function recreate(admin: Client, db: string) {
  await admin.query(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${db}`);
}

/**
 * الدوالُّ الثابتةُ التي يعتمد عليها عمودٌ مولَّد في `patients`.
 *
 * ينشئها ترحيلُ ٠٥٤، لكن `drizzle-kit push` يبني الجداولَ من المخطّط
 * وحده فيسقط على عمودٍ يناديها قبل وجودها. فتُزرَع أولاً — وهذا **لا
 * يخفي فرقاً**: المقارنةُ أدناه على `cost_entries` لا على هاتين.
 */
const BOOTSTRAP = `
CREATE OR REPLACE FUNCTION patient_search_norm(t text) RETURNS text AS $f$
  SELECT lower(regexp_replace(translate(coalesce(t,''),
    'أإآٱىةؤئـًٌٍَُِّْ', 'ااااهياا'), '[^a-z0-9\\u0621-\\u064a ]', '', 'g'))
$f$ LANGUAGE sql IMMUTABLE;
CREATE OR REPLACE FUNCTION patient_digits_only(t text) RETURNS text AS $f$
  SELECT regexp_replace(translate(coalesce(t,''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
                        '[^0-9]', '', 'g')
$f$ LANGUAGE sql IMMUTABLE;
`;

async function main() {
  //  الاتصالُ الإداري على `postgres` كي يمكن حذفُ القاعدتين وإنشاؤهما.
  await withClient(adminUrl("postgres"), async (admin) => {
    await recreate(admin, SCHEMA_DB);
    await recreate(admin, MIGR_DB);
  });

  try {
    // ══ ١. القاعدتان تُبنيان من `shared/schema.ts` ════════════════════
    console.log("\n── ١. البناء من المخطّط ──");
    for (const db of [SCHEMA_DB, MIGR_DB]) {
      await withClient(adminUrl(db), (c) => c.query(BOOTSTRAP));
      execFileSync("npx", ["drizzle-kit", "push", "--force"], {
        env: { ...process.env, DATABASE_URL: adminUrl(db) },
        stdio: "pipe", cwd: process.cwd(),
      });
    }
    check(true, "١. `drizzle-kit push` بنى القاعدتين من `shared/schema.ts`");

    // ══ ٢. الثانيةُ تُردّ إلى ما قبل ٠٥٦ ثم يُطبَّق — **مرّتين** ═══════
    console.log("\n── ٢. الترقيةُ بالترحيل ٠٥٦ (مرّتين) ──");
    await withClient(adminUrl(MIGR_DB), async (c) => {
      //  نزعُ آثار ٠٥٦ الثلاثة: الفهرس، ثم المفتاح، ثم العمود. فتعود
      //  القاعدةُ إلى حالِ الإنتاج قبل الترحيل بالضبط.
      await c.query(`DROP INDEX IF EXISTS ix_cost_entries_case`);
      await c.query(`ALTER TABLE cost_entries DROP CONSTRAINT IF EXISTS cost_entries_case_id_fkey`);
      await c.query(`ALTER TABLE cost_entries DROP COLUMN IF EXISTS case_id`);
      const before = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_attribute
          WHERE attrelid = 'cost_entries'::regclass AND attname = 'case_id'
            AND NOT attisdropped`)).rows[0].n;
      same("٢. **القاعدةُ عادت إلى ما قبل الترحيل** — لا عمودَ `case_id`", before, 0);

      //  والمرّةُ الثانية تُثبت أنه لا ينكسر على قاعدةٍ طُبّق عليها — وهو
      //  شرطُ التشغيل عند كلّ إقلاعٍ على Render.
      await c.query(migration056.sql);
      check(true, "٣. تطبيقُ الترحيل ٠٥٦ نجح");
      await c.query(migration056.sql);
      check(true, "   **وأُعيد مرّةً ثانية بلا خطأ** — idempotent");

      const dup = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_constraint
          WHERE conrelid = 'cost_entries'::regclass AND contype = 'f'
            AND conname = 'cost_entries_case_id_fkey'`)).rows[0].n;
      same("   ولم يتضاعف المفتاحُ بالإعادة", dup, 1);

      // ══ وترحيل ٠٥٧ بنفس الطريقة ════════════════════════════════════
      await c.query(`ALTER TABLE price_change_requests
        DROP CONSTRAINT IF EXISTS price_change_requests_discount_shape_check,
        DROP CONSTRAINT IF EXISTS price_change_requests_discount_mode_check`);
      await c.query(`ALTER TABLE price_change_requests
        DROP COLUMN IF EXISTS discount_mode,
        DROP COLUMN IF EXISTS discount_value,
        DROP COLUMN IF EXISTS discount_amount`);
      const before57 = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_attribute
          WHERE attrelid = 'price_change_requests'::regclass
            AND attname LIKE 'discount%' AND NOT attisdropped`)).rows[0].n;
      same("٣ب. **والجدولُ عاد إلى ما قبل ٠٥٧** — لا أعمدةَ خصم", before57, 0);
      await c.query(migration057.sql);
      check(true, "   تطبيقُ الترحيل ٠٥٧ نجح");
      await c.query(migration057.sql);
      check(true, "   **وأُعيد مرّةً ثانية بلا خطأ** — idempotent");
      const dup57 = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_constraint
          WHERE conrelid = 'price_change_requests'::regclass AND contype = 'c'
            AND conname LIKE '%discount%'`)).rows[0].n;
      same("   والقيدان اثنان لا أربعة بعد الإعادة", dup57, 2);
    });

    // ══ ٣. المقارنة ═══════════════════════════════════════════════════
    console.log("\n── ٣. تطابقُ الحقائق ──");
    const factsOf = async (db: string) =>
      withClient(adminUrl(db), async (c) => (await c.query(FACTS)).rows[0].facts);
    const fromSchema = await factsOf(SCHEMA_DB);
    const fromMigrations = await factsOf(MIGR_DB);

    same("٣. **نوعُ العمود متطابق**",
      fromSchema.column?.data_type, fromMigrations.column?.data_type);
    same("   وقابليةُ الفراغ متطابقة",
      fromSchema.column?.not_null, fromMigrations.column?.not_null);
    same("٤. **هدفُ المفتاح الأجنبي متطابق**",
      [fromSchema.fk?.target_table, fromSchema.fk?.target_column],
      [fromMigrations.fk?.target_table, fromMigrations.fk?.target_column]);
    same("٥. **وسلوكُ الحذف متطابق**",
      fromSchema.fk?.on_delete, fromMigrations.fk?.on_delete);
    same("٦. **واسمُ الفهرس متطابق**",
      fromSchema.index?.name, fromMigrations.index?.name);
    same("   وأعمدتُه متطابقة",
      fromSchema.index?.columns, fromMigrations.index?.columns);
    same("٧. **وشرطُ الفهرس الجزئي متطابق**",
      fromSchema.index?.predicate, fromMigrations.index?.predicate);
    //  ══ وترحيل ٠٥٧: الأعمدةُ الثلاثة والقيدان ══
    same("٧ب. **وأعمدةُ الخصم الثلاثة متطابقة نوعاً وقابليةَ فراغ**",
      fromSchema.discount_columns, fromMigrations.discount_columns);
    same("٧ج. **وقيدا الخصم متطابقان نصّاً**",
      fromSchema.discount_checks, fromMigrations.discount_checks);

    //  ولا يكفي التطابق: قد تتّفقان على الخطأ. فالقيمُ تُثبَّت صراحةً.
    console.log("\n── ٤. والقيمُ هي المقصودة لا مجرّد متساوية ──");
    same("٨. العمودُ `integer` ويقبل الفراغ",
      [fromMigrations.column?.data_type, fromMigrations.column?.not_null],
      ["integer", false]);
    same("٩. والمفتاحُ يشير إلى `patient_cases.id`",
      [fromMigrations.fk?.target_table, fromMigrations.fk?.target_column],
      ["patient_cases", "id"]);
    //  `confdeltype`: 'n' = SET NULL · 'a' = NO ACTION · 'c' = CASCADE.
    same("١٠. **و`ON DELETE SET NULL` في القاعدتين معاً**",
      [fromSchema.fk?.on_delete, fromMigrations.fk?.on_delete], ["n", "n"]);
    same("١١. والفهرسُ على `case_id` وحده وغيرُ فريد",
      [fromMigrations.index?.columns, fromMigrations.index?.is_unique],
      [["case_id"], false]);
    check(String(fromMigrations.index?.predicate ?? "").replace(/[()]/g, "").trim()
        === "case_id IS NOT NULL",
      "١٢. **وشرطُه `case_id IS NOT NULL`** — جزئيٌّ لا كامل",
      String(fromMigrations.index?.predicate));
    //  ══ والقيمُ المقصودة في ٠٥٧ كذلك ══
    //  عمودٌ عمودٌ لا كائناً كاملاً: `jsonb_object_agg` لا يضمن ترتيبَ
    //  المفاتيح، ومقارنةُ النصّ كانت ستسقط على ترتيبٍ لا على قيمة.
    const dcol = (n: string) => {
      const c = (fromMigrations.discount_columns ?? {})[n] ?? {};
      return [c.data_type, c.not_null];
    };
    same("١٢ب. الأعمدةُ الثلاثة بأنواعها وكلُّها تقبل الفراغ",
      [dcol("discount_mode"), dcol("discount_value"), dcol("discount_amount")],
      [["text", false], ["numeric(14,2)", false], ["integer", false]]);
    same("١٢ج. والقيدان موجودان بالاسمين",
      Object.keys(fromMigrations.discount_checks ?? {}).sort(),
      ["price_change_requests_discount_mode_check",
        "price_change_requests_discount_shape_check"]);
    // ══ ١٢د. والصفُّ القديم **بأعمدته الثلاثة فارغةً معاً** ═══════════
    //  لا بعمود النوع وحده: لولا ذلك لكفى تفريغُه كي يتنكّر صفٌّ نصفُ ممتلئ
    //  في هيئة سجلٍّ قديم فيحمل مبلغَ خصمٍ لا يفحصه أحد.
    const shapeDef = String(
      fromMigrations.discount_checks?.price_change_requests_discount_shape_check ?? "");
    //  الأقواسُ تُزال قبل المقارنة: Postgres يعيد صياغةَ التعبير بأقواسٍ
    //  حول كلّ شرط، والمقارنةُ على المعنى لا على شكل الطباعة.
    const shapeNorm = shapeDef.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
    check(shapeNorm.includes("discount_mode IS NULL AND discount_value IS NULL"
        + " AND discount_amount IS NULL"),
      "١٢د. **والفرعُ القديم يشترط الأعمدةَ الثلاثة فارغةً معاً**", shapeNorm);
    check(shapeNorm.includes("discount_amount = current_price - proposed_price"),
      "   والفرعُ الجديد يربط المبلغَ بفرق السعرين", shapeNorm);
    check(shapeNorm.includes("proposed_price < current_price"),
      "   **ويمنع رفعَ السعر في القاعدة نفسها**", shapeNorm);

    // ══ ١٢هـ. والقيدُ يعمل حيّاً على القاعدتين ═════════════════════════
    //  التعريفُ وحده لا يكفي دليلاً — يُنفَّذ الإدراجُ فعلاً.
    for (const [label, db] of [["المخطّط", SCHEMA_DB], ["الترحيلات", MIGR_DB]] as const) {
      await withClient(adminUrl(db), async (c) => {
        const ins = async (cols: string, vals: string) => {
          try {
            await c.query(`INSERT INTO price_change_requests
                             (followup_id, patient_id, branch_id, reason, status, ${cols})
                           VALUES (0, 0, 1, 'other', 'cancelled', ${vals})`);
            return true;
          } catch (e: any) {
            //  خطأُ المفتاح الأجنبي يعني أن القيدَ مرّ — نفصله عن خطأ الشكل.
            return !String(e?.message ?? "").includes("discount_shape");
          }
        };
        same(`١٢هـ. **صفٌّ قديمٌ ثلاثتُه فارغة يمرّ** (${label})`,
          await ins("current_price, proposed_price", "500000, 600000"), true);
        same(`     **ونصفُ ممتلئٍ يُردّ** (${label})`,
          await ins("current_price, proposed_price, discount_amount", "500000, 400000, 100000"),
          false);
        same(`     وخصمٌ كاذبٌ يُردّ (${label})`,
          await ins("current_price, proposed_price, discount_mode, discount_value, discount_amount",
            "500000, 400000, 'amount', 100000, 7"), false);
      });
    }

    // ══ ٥. والسلوكُ الحيّ يطابق ما وُعد ════════════════════════════════
    //  التعريفُ وحده لا يكفي دليلاً: يُنفَّذ الحذفُ فعلاً على القاعدتين.
    console.log("\n── ٥. الحذفُ حيّاً على القاعدتين ──");
    for (const [label, db] of [["المخطّط", SCHEMA_DB], ["الترحيلات", MIGR_DB]] as const) {
      await withClient(adminUrl(db), async (c) => {
        await c.query(`INSERT INTO branches (id, name) VALUES (1, 'بغداد') ON CONFLICT DO NOTHING`);
        //  `patient_code` صريحٌ هنا: افتراضُه تسلسلٌ ينشئه ترحيلُ ٠٥٢،
        //  و`push` يبني العمودَ NOT NULL بلا ذلك الافتراض. ولا علاقةَ له
        //  بما نقيسه، فيُملأ يدوياً بدل أن يوقف الاختبار.
        const pid = (await c.query(
          `INSERT INTO patients (name, phone, age, medical_condition, branch_id, total_cost,
                                 patient_code, referral_source)
           VALUES ('تطابق','07701234567','40','x',1,0,'WB-9001','تطابق') RETURNING id`)).rows[0].id;
        const cid = (await c.query(
          `INSERT INTO patient_cases (patient_id, branch_id, case_type, status, cost)
           VALUES ($1,1,'prosthetic','active',0) RETURNING id`, [pid])).rows[0].id;
        const eid = (await c.query(
          `INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id)
           VALUES ($1,1,500000,'add_case_type',$2) RETURNING id`, [pid, cid])).rows[0].id;

        //  **سحبُ نوع الحالة يحذف الصفَّ فعلاً** — وهذا ما كان سينكسر على
        //  `NO ACTION`. القيدُ يبقى تاريخاً ويصير «غير مبوَّب».
        let deleteOk = true; let err = "";
        try { await c.query(`DELETE FROM patient_cases WHERE id = $1`, [cid]); }
        catch (e: any) { deleteOk = false; err = e.message; }
        check(deleteOk, `١٣. **حذفُ حالةٍ يشير إليها قيدُ كلفة ينجح** (${label})`, err);

        const row = (await c.query(`SELECT case_id, amount FROM cost_entries WHERE id=$1`, [eid])).rows[0];
        same(`   **والقيدُ باقٍ بمبلغه وقسمُه صار NULL** (${label})`,
          [row?.case_id, Number(row?.amount)], [null, 500000]);
      });
    }
  } finally {
    await withClient(adminUrl("postgres"), async (admin) => {
      await admin.query(`DROP DATABASE IF EXISTS ${SCHEMA_DB} WITH (FORCE)`);
      await admin.query(`DROP DATABASE IF EXISTS ${MIGR_DB} WITH (FORCE)`);
    });
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e?.stderr?.toString?.() || e);
  try {
    await withClient(adminUrl("postgres"), async (admin) => {
      await admin.query(`DROP DATABASE IF EXISTS ${SCHEMA_DB} WITH (FORCE)`);
      await admin.query(`DROP DATABASE IF EXISTS ${MIGR_DB} WITH (FORCE)`);
    });
  } catch { /* ignore */ }
  process.exit(1);
});
