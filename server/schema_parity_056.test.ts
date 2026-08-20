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
import * as migration057 from "./migrations/057_commercial_price";
import * as migration058 from "./migrations/058_service_discounts";
import * as migration059 from "./migrations/059_reception_initial_price";
import * as migration060 from "./migrations/060_prosthetic_parts";

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
  'interest_columns', (
    SELECT jsonb_object_agg(a.attname,
             jsonb_build_object('data_type', format_type(a.atttypid, a.atttypmod),
                                'not_null', a.attnotnull))
      FROM pg_attribute a
     WHERE a.attrelid = 'post_exam_followups'::regclass
       AND a.attname IN ('purchase_interest_at', 'purchase_interest_by',
                         'purchase_interest_by_name')
       AND NOT a.attisdropped
  ),
  'pef_checks', (
    SELECT jsonb_object_agg(c.conname, pg_get_constraintdef(c.oid))
      FROM pg_constraint c
     WHERE c.conrelid = 'post_exam_followups'::regclass AND c.contype = 'c'
       AND c.conname IN ('post_exam_followups_price_source_check',
                         'post_exam_followups_purchase_interest_check')
  ),
  'interest_index', (
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
     WHERE i.indrelid = 'post_exam_followups'::regclass
       AND ci.relname = 'ix_pef_purchase_interest'
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
  ),
  -- ══ ترحيل ٠٥٨: جدولُ الخصم بأعمدته وقيوده وفهارسه، والعَلَمُ على الحساب ══
  'sdr_columns', (
    SELECT jsonb_object_agg(a.attname,
             jsonb_build_object('data_type', format_type(a.atttypid, a.atttypmod),
                                'not_null', a.attnotnull))
      FROM pg_attribute a
     WHERE a.attrelid = 'service_discount_requests'::regclass
       AND a.attnum > 0 AND NOT a.attisdropped
  ),
  'sdr_checks', (
    SELECT jsonb_object_agg(c.conname, pg_get_constraintdef(c.oid))
      FROM pg_constraint c
     WHERE c.conrelid = 'service_discount_requests'::regclass AND c.contype = 'c'
  ),
  'sdr_fk', (
    SELECT jsonb_build_object(
             'target_table', c.confrelid::regclass::text,
             'on_delete', c.confdeltype)
      FROM pg_constraint c
     WHERE c.conrelid = 'service_discount_requests'::regclass AND c.contype = 'f'
  ),
  'sdr_indexes', (
    SELECT jsonb_object_agg(ci.relname, jsonb_build_object(
             'columns', pg_get_indexdef(i.indexrelid),
             'is_unique', i.indisunique,
             'predicate', pg_get_expr(i.indpred, i.indrelid)))
      FROM pg_index i
      JOIN pg_class ci ON ci.oid = i.indexrelid
     WHERE i.indrelid = 'service_discount_requests'::regclass
  ),
  'approve_flag', (
    SELECT jsonb_build_object(
             'data_type', format_type(a.atttypid, a.atttypmod),
             'not_null', a.attnotnull,
             'default', pg_get_expr(d.adbin, d.adrelid))
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = 'system_users'::regclass
       AND a.attname = 'can_approve_discount' AND NOT a.attisdropped
  ),
  -- ══ ترحيل ٠٦٠: «ما المطلوب» — الأعمدةُ الثلاثة وقيودُها وفهرساها ══
  'parts_columns', (
    SELECT jsonb_object_agg(a.attname,
             jsonb_build_object('data_type', format_type(a.atttypid, a.atttypmod),
                                'not_null', a.attnotnull,
                                'default', pg_get_expr(d.adbin, d.adrelid)))
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = 'patient_device_episodes'::regclass
       AND a.attname IN ('requested_item', 'component') AND NOT a.attisdropped
  ),
  'maint_component', (
    SELECT jsonb_build_object(
             'data_type', format_type(a.atttypid, a.atttypmod),
             'not_null', a.attnotnull,
             'default', pg_get_expr(d.adbin, d.adrelid))
      FROM pg_attribute a
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
     WHERE a.attrelid = 'prosthetic_work_orders'::regclass
       AND a.attname = 'maintenance_component' AND NOT a.attisdropped
  ),
  'pde_part_checks', (
    SELECT jsonb_object_agg(c.conname, pg_get_constraintdef(c.oid))
      FROM pg_constraint c
     WHERE c.conrelid = 'patient_device_episodes'::regclass AND c.contype = 'c'
       AND c.conname IN ('patient_device_episodes_requested_item_check',
                         'patient_device_episodes_component_check')
  ),
  'wo_part_checks', (
    SELECT jsonb_object_agg(c.conname, pg_get_constraintdef(c.oid))
      FROM pg_constraint c
     WHERE c.conrelid = 'prosthetic_work_orders'::regclass AND c.contype = 'c'
       AND c.conname IN ('prosthetic_work_orders_maint_component_check',
                         'prosthetic_work_orders_maint_component_purpose_check')
  ),
  'parts_indexes', (
    SELECT jsonb_object_agg(ci.relname, jsonb_build_object(
             'def', pg_get_indexdef(i.indexrelid),
             'is_unique', i.indisunique,
             'predicate', pg_get_expr(i.indpred, i.indrelid)))
      FROM pg_index i
      JOIN pg_class ci ON ci.oid = i.indexrelid
     WHERE ci.relname IN ('ix_pde_component', 'ix_wo_maint_component')
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
      await c.query(`DROP INDEX IF EXISTS ix_pef_purchase_interest`);
      await c.query(`ALTER TABLE post_exam_followups
        DROP CONSTRAINT IF EXISTS post_exam_followups_purchase_interest_check`);
      await c.query(`ALTER TABLE post_exam_followups
        DROP COLUMN IF EXISTS purchase_interest_at,
        DROP COLUMN IF EXISTS purchase_interest_by,
        DROP COLUMN IF EXISTS purchase_interest_by_name`);
      //  **وقيدُ مصدرِ السعر يُردّ إلى صيغة ٠٥٣ بقيمتيه**: هذا هو حالُ
      //  الإنتاج قبل ٠٥٧ بالضبط، وبه وحده يصير «توسيعُ القيد» سؤالاً
      //  حقيقياً لا تحصيلَ حاصلٍ من قاعدةٍ بُنيت واسعةً من أولها.
      await c.query(`ALTER TABLE post_exam_followups
        DROP CONSTRAINT IF EXISTS post_exam_followups_price_source_check`);
      await c.query(`ALTER TABLE post_exam_followups
        ADD CONSTRAINT post_exam_followups_price_source_check
        CHECK (price_source IN ('exam', 'approved_change'))`);
      const before57 = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_attribute
          WHERE attrelid = 'post_exam_followups'::regclass
            AND attname LIKE 'purchase_interest%' AND NOT attisdropped`)).rows[0].n;
      same("٣ب. **والجدولُ عاد إلى ما قبل ٠٥٧** — لا أعمدةَ راية", before57, 0);
      const srcBefore = (await c.query(
        `SELECT pg_get_constraintdef(oid) d FROM pg_constraint
          WHERE conname = 'post_exam_followups_price_source_check'
            AND conrelid = 'post_exam_followups'::regclass`)).rows[0].d;
      same("   **وقيدُ مصدر السعر عاد إلى قيمتين**",
        String(srcBefore).includes("manager_set"), false);

      await c.query(migration057.sql);
      check(true, "   تطبيقُ الترحيل ٠٥٧ نجح");
      await c.query(migration057.sql);
      check(true, "   **وأُعيد مرّةً ثانية بلا خطأ** — idempotent");
      const dup57 = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_constraint
          WHERE conrelid = 'post_exam_followups'::regclass AND contype = 'c'
            AND conname IN ('post_exam_followups_price_source_check',
                            'post_exam_followups_purchase_interest_check')`)).rows[0].n;
      same("   والقيدان اثنان لا أربعة بعد الإعادة", dup57, 2);

      // ══ ٣ج. **وقاعدةٌ تحمل صيغةً أقدم تتقارب إليها** ═════════════════
      //  idempotent لا تعني «آمنَ الإعادة» وحدها بل **واحديّةَ النتيجة**:
      //  قاعدةُ تطويرٍ عليها قيدٌ أضيق يجب أن تصير كالإنتاج، لا أن تُترك
      //  كما هي لأن اسمَ القيد موجود. وهذا ما كان سيقع لو اكتفى الفحصُ
      //  بوجود الاسم.
      await c.query(`ALTER TABLE post_exam_followups
        DROP CONSTRAINT IF EXISTS post_exam_followups_price_source_check`);
      await c.query(`ALTER TABLE post_exam_followups
        ADD CONSTRAINT post_exam_followups_price_source_check
        CHECK (price_source IN ('exam'))`);
      await c.query(migration057.sql);
      const converged = (await c.query(
        `SELECT pg_get_constraintdef(oid) d FROM pg_constraint
          WHERE conname = 'post_exam_followups_price_source_check'
            AND conrelid = 'post_exam_followups'::regclass`)).rows[0].d;
      same("٣ج. **وصيغةٌ أقدم من القيد يُعاد بناؤها** — تقارُبٌ لا مجرّد أمانٍ",
        String(converged).includes("manager_set"), true);

      // ══ وترحيل ٠٥٨ بنفس الطريقة ════════════════════════════════════
      //  الجدولُ كلُّه يُسقَط والعَلَمُ يُنزَع، فتعود القاعدةُ إلى ما قبل ٠٥٨.
      await c.query(`DROP TABLE IF EXISTS service_discount_requests`);
      await c.query(`ALTER TABLE system_users DROP COLUMN IF EXISTS can_approve_discount`);
      const before58 = (await c.query(
        `SELECT to_regclass('service_discount_requests') IS NULL AS gone`)).rows[0].gone;
      same("٣د. **والقاعدةُ عادت إلى ما قبل ٠٥٨** — لا جدولَ خصم", before58, true);

      await c.query(migration058.sql);
      check(true, "   تطبيقُ الترحيل ٠٥٨ نجح");
      await c.query(migration058.sql);
      check(true, "   **وأُعيد مرّةً ثانية بلا خطأ** — idempotent");
      const dup58 = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_constraint
          WHERE conrelid = 'service_discount_requests'::regclass AND contype = 'c'`)).rows[0].n;
      same("   والقيودُ خمسةٌ لا عشرة بعد الإعادة", dup58, 5);

      // ══ وترحيل ٠٥٩: يوسّع مصدرَ السعر ويشدّ قيدَ ٠٥٨ ═════════════════
      //  يُردّ القيدُ إلى صيغة ٠٥٧ (ثلاث قيم) وقيدُ ٠٥٨ إلى صيغته الأولى
      //  (بلا شرط لحظةِ التنفيذ) — وهذا حالُ قاعدةٍ ركّبت ٠٥٨ قبل شدّه.
      await c.query(`ALTER TABLE post_exam_followups
        DROP CONSTRAINT IF EXISTS post_exam_followups_price_source_check`);
      await c.query(`ALTER TABLE post_exam_followups
        ADD CONSTRAINT post_exam_followups_price_source_check
        CHECK (price_source IN ('exam', 'manager_set', 'approved_change'))`);
      await c.query(`ALTER TABLE service_discount_requests
        DROP CONSTRAINT IF EXISTS service_discount_requests_decision_check`);
      await c.query(`ALTER TABLE service_discount_requests
        ADD CONSTRAINT service_discount_requests_decision_check
        CHECK (status <> 'approved'
               OR (approved_final_price IS NOT NULL AND decided_at IS NOT NULL))`);

      await c.query(migration059.sql);
      check(true, "٣هـ. تطبيقُ الترحيل ٠٥٩ نجح");
      await c.query(migration059.sql);
      check(true, "   **وأُعيد مرّةً ثانية بلا خطأ** — idempotent");
      const src59 = (await c.query(
        `SELECT pg_get_constraintdef(oid) d FROM pg_constraint
          WHERE conname = 'post_exam_followups_price_source_check'
            AND conrelid = 'post_exam_followups'::regclass`)).rows[0].d;
      check(String(src59).includes("reception_set"),
        "   **ومصدرُ السعر اتّسع لأول سعرٍ من الاستعلامات**", src59);
      //  **والشدُّ يتقارب على قاعدةٍ ركّبت ٠٥٨ قبله** — وهو لبُّ ٠٥٩:
      //  المُشغِّل يتخطّى ترحيلاً طُبِّق باسمه، فلا يكفي تعديلُ ملفّ ٠٥٨.
      const dec59 = (await c.query(
        `SELECT pg_get_constraintdef(oid) d FROM pg_constraint
          WHERE conname = 'service_discount_requests_decision_check'
            AND conrelid = 'service_discount_requests'::regclass`)).rows[0].d;
      check(String(dec59).includes("applied_at IS NOT NULL"),
        "   **وقيدُ «معتمَدٌ يعني نُفِّذ» شُدَّ على قاعدةٍ سبقته**", dec59);

      // ══ وترحيل ٠٦٠ بنفس الطريقة ════════════════════════════════════
      //  تُنزَع الفهارسُ ثم القيودُ ثم الأعمدةُ الثلاثة، **ويُزرَع صفٌّ
      //  قائم** قبل التطبيق: فيصير «لا صفَّ تاريخيٌّ يُعاد تفسيره» سؤالاً
      //  حقيقياً لا دعوى — الترحيلُ يجعل العمودَ إلزامياً، وصفٌّ موجودٌ
      //  بلا قيمة كان سيُسقطه لولا التعبئة.
      await c.query(`DROP INDEX IF EXISTS ix_pde_component`);
      await c.query(`DROP INDEX IF EXISTS ix_wo_maint_component`);
      await c.query(`ALTER TABLE patient_device_episodes
        DROP CONSTRAINT IF EXISTS patient_device_episodes_component_check,
        DROP CONSTRAINT IF EXISTS patient_device_episodes_requested_item_check`);
      await c.query(`ALTER TABLE patient_device_episodes
        DROP COLUMN IF EXISTS requested_item, DROP COLUMN IF EXISTS component`);
      await c.query(`ALTER TABLE prosthetic_work_orders
        DROP CONSTRAINT IF EXISTS prosthetic_work_orders_maint_component_check,
        DROP CONSTRAINT IF EXISTS prosthetic_work_orders_maint_component_purpose_check`);
      await c.query(`ALTER TABLE prosthetic_work_orders
        DROP COLUMN IF EXISTS maintenance_component`);
      const before60 = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_attribute
          WHERE attrelid = 'patient_device_episodes'::regclass
            AND attname IN ('requested_item', 'component') AND NOT attisdropped`)).rows[0].n;
      same("٣و. **والقاعدةُ عادت إلى ما قبل ٠٦٠** — لا عمودَ «ما المطلوب»", before60, 0);

      //  صفٌّ تاريخيّ: مريضٌ وحالةٌ وحلقةٌ وأمرُ صيانة — كما كانت الإنتاجُ.
      //  **بمعرّفاتٍ من التسلسل لا مفروضة**: فرضُ `id = 1` يترك التسلسلَ
      //  خلفه فيصطدم أولُ إدراجٍ لاحق بالمفتاح.
      await c.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد')
                     ON CONFLICT DO NOTHING`);
      const seedPatient = (await c.query(
        `INSERT INTO patients (name, phone, patient_code, referral_source,
           age, medical_condition, branch_id, total_cost)
         VALUES ('قديم','07700000000','BC-000060','ترحيل','40','بتر',1,0)
         RETURNING id`)).rows[0].id;
      const seedCase = (await c.query(
        `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, status)
         VALUES ($1,1,'prosthetic',0,'active') RETURNING id`, [seedPatient])).rows[0].id;
      const seedEpisode = (await c.query(
        `INSERT INTO patient_device_episodes
           (patient_id, case_id, branch_id, sequence_number, status, agreed_cost)
         VALUES ($1,$2,1,1,'delivered',0) RETURNING id`,
        [seedPatient, seedCase])).rows[0].id;
      const seedExpert = (await c.query(
        `INSERT INTO system_users (username, password_hash, display_name, role, branch_id, is_active)
         VALUES ('parity_expert','x','خبير','prosthetics_expert',1,true) RETURNING id`)).rows[0].id;
      const seedMaint = (await c.query(
        `INSERT INTO prosthetic_work_orders
           (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage)
         VALUES ($1,1,$2,'prosthetic','maintenance','completed','delivered') RETURNING id`,
        [seedPatient, seedExpert])).rows[0].id;

      await c.query(migration060.sql);
      check(true, "٣ز. تطبيقُ الترحيل ٠٦٠ نجح على قاعدةٍ فيها صفوفٌ قائمة");
      await c.query(migration060.sql);
      check(true, "   **وأُعيد مرّةً ثانية بلا خطأ** — idempotent");
      const legacy = (await c.query(
        `SELECT requested_item, component FROM patient_device_episodes WHERE id = $1`,
        [seedEpisode])).rows[0];
      same("٣ح. **والصفُّ القديم صار «طرفاً كاملاً» بلا جزء** — تسجيلُ واقعٍ لا ترميم",
        [legacy.requested_item, legacy.component], ["full_prosthesis", null]);
      const legacyWo = (await c.query(
        `SELECT maintenance_component FROM prosthetic_work_orders WHERE id = $1`,
        [seedMaint])).rows[0];
      same("٣ط. **وأمرُ الصيانة القديم يبقى بلا جزء** — «لم يُسجَّل» حقيقةٌ عنه",
        legacyWo.maintenance_component, null);
      const dup60 = (await c.query(
        `SELECT COUNT(*)::int n FROM pg_constraint
          WHERE contype = 'c' AND conname IN (
            'patient_device_episodes_requested_item_check',
            'patient_device_episodes_component_check',
            'prosthetic_work_orders_maint_component_check',
            'prosthetic_work_orders_maint_component_purpose_check')`)).rows[0].n;
      same("   والقيودُ أربعةٌ لا ثمانية بعد الإعادة", dup60, 4);

      //  ── **وصيغةٌ أرخى من قيد التلازم يُعاد بناؤها** ──
      //  `component = requested_item` وحدها تُقيَّم NULL حين يفرغ العمود،
      //  و CHECK تقبل NULL — فقاعدةٌ تحمل الصيغةَ الأولى كانت تقبل «ركبةً
      //  بلا جزء». والتقارُبُ هو ما يجعل الترحيلَ يصلحها بدل أن يتخطّاها
      //  لأن اسمَ القيد موجود.
      await c.query(`ALTER TABLE patient_device_episodes
        DROP CONSTRAINT IF EXISTS patient_device_episodes_component_check`);
      await c.query(`ALTER TABLE patient_device_episodes
        ADD CONSTRAINT patient_device_episodes_component_check
        CHECK ((requested_item = 'full_prosthesis' AND component IS NULL)
               OR (requested_item <> 'full_prosthesis' AND component = requested_item))`);
      await c.query(migration060.sql);
      const conv60 = (await c.query(
        `SELECT pg_get_constraintdef(oid) d FROM pg_constraint
          WHERE conname = 'patient_device_episodes_component_check'
            AND conrelid = 'patient_device_episodes'::regclass`)).rows[0].d;
      check(String(conv60).includes("component IS NOT NULL"),
        "٣ي أ. **والصيغةُ الأرخى يُعاد بناؤها** — تقارُبٌ لا مجرّد أمانٍ", conv60);

      //  ── **والقيدُ يمنع فعلاً** ما تمنعه الشيفرة ──
      const rejects = async (label: string, q: string, params: any[] = []) => {
        try { await c.query(q, params); return `${label}: قُبل!`; }
        catch { return null; }
      };
      const violations = (await Promise.all([
        rejects("جزءٌ مخترَع", `UPDATE patient_device_episodes
           SET requested_item='elbow', component='elbow' WHERE id=$1`, [seedEpisode]),
        rejects("كاملٌ بجزء", `UPDATE patient_device_episodes
           SET requested_item='full_prosthesis', component='knee' WHERE id=$1`, [seedEpisode]),
        rejects("جزءٌ بلا جزء", `UPDATE patient_device_episodes
           SET requested_item='knee', component=NULL WHERE id=$1`, [seedEpisode]),
        rejects("عمودان مختلفان", `UPDATE patient_device_episodes
           SET requested_item='knee', component='foot' WHERE id=$1`, [seedEpisode]),
        rejects("جزءُ صيانةٍ مخترَع", `UPDATE prosthetic_work_orders
           SET maintenance_component='elbow' WHERE id=$1`, [seedMaint]),
      ])).filter(Boolean);
      same("٣ي. **والقاعدةُ تردّ التركيبات المستحيلة الخمس**", violations, []);
      //  **والصيانةُ على أمرِ بناءٍ مردودةٌ كذلك** — البابان لا يختلطان.
      const seedBuild = (await c.query(
        `INSERT INTO prosthetic_work_orders
           (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage)
         VALUES ($1,1,$2,'prosthetic','initial_build','completed','delivered') RETURNING id`,
        [seedPatient, seedExpert])).rows[0].id;
      const buildViolation = await rejects("جزءُ صيانةٍ على أمرِ بناء",
        `UPDATE prosthetic_work_orders SET maintenance_component='knee' WHERE id=$1`, [seedBuild]);
      same("٣ك. **ولا جزءَ صيانةٍ على أمر بناء**", buildViolation, null);
      //  ولا يكفي أنها تردّ: **الصحيحُ يمرّ** — وإلّا كان القيدُ يمنع كلَّ شيء.
      await c.query(`UPDATE patient_device_episodes
         SET requested_item='knee', component='knee' WHERE id=$1`, [seedEpisode]);
      const good = (await c.query(
        `SELECT requested_item, component FROM patient_device_episodes WHERE id=$1`,
        [seedEpisode])).rows[0];
      same("٣ل. **والتركيبةُ الصحيحة تمرّ**",
        [good.requested_item, good.component], ["knee", "knee"]);
      await c.query(`UPDATE patient_device_episodes
         SET requested_item='full_prosthesis', component=NULL WHERE id=$1`, [seedEpisode]);
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
    // ══ وترحيل ٠٥٧: أعمدةُ الراية والقيدان والفهرس ══
    same("٧ب. **وأعمدةُ الراية الثلاثة متطابقة نوعاً وقابليةَ فراغ**",
      fromSchema.interest_columns, fromMigrations.interest_columns);
    same("٧ج. **وقيدا المتابعة متطابقان نصّاً**",
      fromSchema.pef_checks, fromMigrations.pef_checks);
    same("٧د. **وفهرسُ الراية الجزئي متطابق**",
      [fromSchema.interest_index?.name, fromSchema.interest_index?.columns,
        fromSchema.interest_index?.predicate],
      [fromMigrations.interest_index?.name, fromMigrations.interest_index?.columns,
        fromMigrations.interest_index?.predicate]);

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
    //  ولا يكفي التطابق هنا كذلك: القيمُ المقصودة تُثبَّت صراحةً.
    const icol = (n: string) => {
      const c = (fromMigrations.interest_columns ?? {})[n] ?? {};
      return [c.data_type, c.not_null];
    };
    same("١٠ب. أعمدةُ الراية بأنواعها وكلُّها تقبل الفراغ",
      [icol("purchase_interest_at"), icol("purchase_interest_by"),
        icol("purchase_interest_by_name")],
      [["timestamp with time zone", false], ["integer", false], ["text", false]]);
    const srcDef = String(
      fromMigrations.pef_checks?.post_exam_followups_price_source_check ?? "");
    check(["exam", "manager_set", "approved_change"].every((v) => srcDef.includes(v)),
      "١٠ج. **ومصدرُ السعر ثلاثةٌ في القاعدة**", srcDef);
    check(String(fromSchema.pef_checks?.post_exam_followups_price_source_check ?? "")
      .includes("manager_set"), "     وفي المبنيّة من المخطّط كذلك",
      String(fromSchema.pef_checks?.post_exam_followups_price_source_check));
    same("١٠د. والفهرسُ على عمود الزمن وحده وغيرُ فريد",
      [fromMigrations.interest_index?.columns, fromMigrations.interest_index?.is_unique],
      [["purchase_interest_at"], false]);
    check(String(fromMigrations.interest_index?.predicate ?? "")
      .replace(/[()]/g, " ").replace(/\s+/g, " ").trim() === "purchase_interest_at IS NOT NULL",
      "     **وشرطُه جزئيٌّ على المرفوعة وحدها**",
      String(fromMigrations.interest_index?.predicate));
    // ══ ترحيل ٠٥٨: جدولُ الخصم ═══════════════════════════════════════
    console.log("\n── ٥. جدولُ الخصم (٠٥٨) ──");
    same("١٣. **أعمدةُ جدول الخصم متطابقة نوعاً وقابليةَ فراغ**",
      fromSchema.sdr_columns, fromMigrations.sdr_columns);
    same("١٤. **وقيودُه الخمسة متطابقة نصّاً**",
      fromSchema.sdr_checks, fromMigrations.sdr_checks);
    same("١٥. **ومفتاحُه إلى المريض متطابق**",
      fromSchema.sdr_fk, fromMigrations.sdr_fk);
    same("١٦. **وفهارسُه الأربعة متطابقة**",
      fromSchema.sdr_indexes, fromMigrations.sdr_indexes);
    same("١٧. **وعَلَمُ الاعتماد على الحساب متطابق**",
      fromSchema.approve_flag, fromMigrations.approve_flag);

    //  ولا يكفي التطابق هنا كذلك: القيمُ المقصودة تُثبَّت صراحةً.
    const sdrCol = (n: string) => {
      const c = (fromMigrations.sdr_columns ?? {})[n] ?? {};
      return [c.data_type, c.not_null];
    };
    same("١٨. أعمدةُ المال صحيحةٌ إلزامية، والنسبةُ بمنزلتين",
      [sdrCol("original_price"), sdrCol("proposed_final_price"),
        sdrCol("discount_amount"), sdrCol("discount_percentage")],
      [["integer", true], ["integer", true], ["integer", true], ["numeric(5,2)", true]]);
    same("   وعَلَمُ المجّانية إلزاميّ",
      sdrCol("is_free"), ["boolean", true]);
    same("   والسعرُ المعتمد ولحظةُ التنفيذ يقبلان الفراغ",
      [sdrCol("approved_final_price"), sdrCol("applied_at")],
      [["integer", false], ["timestamp with time zone", false]]);
    const shape = String(fromMigrations.sdr_checks?.service_discount_requests_shape_check ?? "");
    //  **التكافؤُ التامّ هو لبُّ الترحيل**: مجّانيٌّ ⟺ صفر.
    check(shape.replace(/\s+/g, " ").includes("is_free = (proposed_final_price = 0)"),
      "١٩. **والقاعدةُ تُلزم: مجّانيٌّ ⟺ صفر** — تكافؤٌ لا شرطٌ في الشيفرة", shape);
    check(shape.includes("original_price > 0"),
      "٢٠. **وسعرٌ أصليٌّ صفر مرفوض** — «غير مسعَّر» لا يُخصَم منه", shape);
    check(shape.replace(/\s+/g, " ").includes("discount_amount = (original_price - proposed_final_price)")
      || shape.replace(/\s+/g, " ").includes("discount_amount = original_price - proposed_final_price"),
      "٢١. وفرقٌ لا يطابق مصدرَه مرفوض", shape);
    const pending = (fromMigrations.sdr_indexes ?? {}).uq_sdr_one_pending ?? {};
    same("٢٢. **وفهرسُ «معلَّقٌ واحد» فريدٌ وجزئيّ**",
      [pending.is_unique, String(pending.predicate ?? "").includes("pending")],
      [true, true]);
    check(String(pending.columns ?? "").includes("context_ref"),
      "     على (مريض، قسم، مرجع)", String(pending.columns));
    const dec = String(fromMigrations.sdr_checks?.service_discount_requests_decision_check ?? "");
    check(dec.includes("applied_at IS NOT NULL"),
      "٢٢ب. **و«معتمَد» يعني «نُفِّذ»**: لا صفَّ معتمَدٍ بلا لحظةِ تنفيذ", dec);
    const src = String(fromMigrations.pef_checks?.post_exam_followups_price_source_check ?? "");
    check(["exam", "manager_set", "approved_change", "reception_set"].every((v) => src.includes(v)),
      "٢٢ج. **ومصدرُ السعر أربعةٌ في القاعدة** — ومنها أولُ سعرٍ من الاستعلامات", src);

    same("٢٣. **وعَلَمُ الاعتماد منطقيٌّ افتراضُه false** — لا يُمنَح بالصمت",
      [fromMigrations.approve_flag?.data_type,
        String(fromMigrations.approve_flag?.default ?? "")],
      ["boolean", "false"]);

    // ══ ترحيل ٠٦٠: «ما المطلوب» ══════════════════════════════════════
    console.log("\n── ٦. ما المطلوب (٠٦٠) ──");
    same("٢٤. **عمودا الحلقة متطابقان نوعاً وإلزاماً وافتراضاً**",
      fromSchema.parts_columns, fromMigrations.parts_columns);
    same("٢٥. **وعمودُ جزء الصيانة متطابق**",
      fromSchema.maint_component, fromMigrations.maint_component);
    same("٢٦. **وقيدا الحلقة متطابقان نصّاً**",
      fromSchema.pde_part_checks, fromMigrations.pde_part_checks);
    same("٢٧. **وقيدا أمر الصيانة كذلك**",
      fromSchema.wo_part_checks, fromMigrations.wo_part_checks);
    same("٢٨. **وفهرساهما الجزئيّان متطابقان**",
      fromSchema.parts_indexes, fromMigrations.parts_indexes);

    //  ولا يكفي التطابق: القيمُ المقصودة تُثبَّت صراحةً.
    const partCol = (n: string) => {
      const c = (fromMigrations.parts_columns ?? {})[n] ?? {};
      return [c.data_type, c.not_null, String(c.default ?? "")];
    };
    same("٢٩. **«ما المطلوب» نصٌّ إلزاميّ افتراضُه الطرفُ الكامل**",
      partCol("requested_item"), ["text", true, "'full_prosthesis'::text"]);
    same("٣٠. **والجزءُ نصٌّ يقبل الفراغ بلا افتراض** — الفراغُ معناه «كامل»",
      partCol("component"), ["text", false, ""]);
    same("٣١. **وجزءُ الصيانة يقبل الفراغ** — الأوامرُ القديمة لم تسجّله",
      [fromMigrations.maint_component?.data_type, fromMigrations.maint_component?.not_null],
      ["text", false]);
    const itemDef = String(
      fromMigrations.pde_part_checks?.patient_device_episodes_requested_item_check ?? "");
    check(["full_prosthesis", "socket", "silicone", "knee", "tube",
      "adapter", "foot", "foam_cover", "foot_shell"].every((v) => itemDef.includes(`'${v}'`)),
      "٣٢. **والقيمُ التسع كلُّها في قيد القاعدة**", itemDef);
    const lockstep = String(
      fromMigrations.pde_part_checks?.patient_device_episodes_component_check ?? "")
      .replace(/\s+/g, " ");
    check(lockstep.includes("component IS NULL") && lockstep.includes("component = requested_item"),
      "٣٣. **والعمودان متلازمان في القاعدة**: كاملٌ ⟺ لا جزء، وجزءٌ ⟺ الاسمُ نفسه",
      lockstep);
    const maintPurpose = String(
      fromMigrations.wo_part_checks?.prosthetic_work_orders_maint_component_purpose_check ?? "")
      .replace(/\s+/g, " ");
    check(maintPurpose.includes("'maintenance'"),
      "٣٤. **ولا جزءَ صيانةٍ إلّا على أمر صيانة**", maintPurpose);
    const pdeIdx = (fromMigrations.parts_indexes ?? {}).ix_pde_component ?? {};
    same("٣٥. **وفهرسُ الأجزاء جزئيٌّ غيرُ فريد** — على المباعة وحدها",
      [pdeIdx.is_unique,
        String(pdeIdx.predicate ?? "").replace(/[()]/g, " ").replace(/\s+/g, " ").trim()],
      [false, "component IS NOT NULL"]);

    same("١١. والفهرسُ على `case_id` وحده وغيرُ فريد",
      [fromMigrations.index?.columns, fromMigrations.index?.is_unique],
      [["case_id"], false]);
    check(String(fromMigrations.index?.predicate ?? "").replace(/[()]/g, "").trim()
        === "case_id IS NOT NULL",
      "١٢. **وشرطُه `case_id IS NOT NULL`** — جزئيٌّ لا كامل",
      String(fromMigrations.index?.predicate));

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

        // ══ ١٤. وقيودُ ٠٥٧ تعمل حيّاً — التعريفُ وحده لا يكفي دليلاً ══
        //  الصفُّ يُمسَح بعد كلّ محاولة: فهرسُ «متابعةٌ حيّةٌ واحدة لكل جهاز»
        //  (٠٥٣) كان سيردّ الثانيةَ لسببٍ لا علاقة له بما نقيسه هنا.
        const insFollowup = async (cols: string, vals: string) => {
          try {
            await c.query(`INSERT INTO post_exam_followups
                             (patient_id, service_type, status, ${cols})
                           VALUES (${pid}, 'prosthetic', 'awaiting_patient_decision', ${vals})`);
            await c.query(`DELETE FROM post_exam_followups WHERE patient_id = ${pid}`);
            return true;
          } catch { return false; }
        };
        same(`١٤. **مصدرُ السعر الثلاثة تمرّ** (${label})`,
          [await insFollowup("price_source", "'exam'"),
            await insFollowup("price_source", "'manager_set'"),
            await insFollowup("price_source", "'approved_change'")],
          [true, true, true]);
        same(`    **وقيمةٌ رابعة تُردّ** (${label})`,
          await insFollowup("price_source", "'whatever'"), false);
        //  **والرايةُ لا تُرفع بلا صاحب** — ولا صاحبَ بلا زمن.
        same(`    **ورايةٌ بلا صاحبٍ تُردّ** (${label})`,
          await insFollowup("purchase_interest_at", "NOW()"), false);
        same(`    وصاحبٌ بلا زمنٍ يُردّ (${label})`,
          await insFollowup("purchase_interest_by", "1"), false);
        same(`    **والاثنان معاً يمرّان** (${label})`,
          await insFollowup("purchase_interest_at, purchase_interest_by", "NOW(), 1"), true);
        await c.query(`DELETE FROM post_exam_followups WHERE patient_id = ${pid}`);
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
