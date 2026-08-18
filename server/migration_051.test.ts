// ترحيل ٠٥١ — تفريدُ الأوامر بحسب الغرض والجهاز. حيّاً على Postgres.
// قاعدة محلّية: `npm run test:migration-051`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **القديم رُفع** بعد أن حلّ محلّه ما هو أدقّ.
// (٢) **وما كان يمنعه لا يزال ممنوعاً**: بناءان مفتوحان لخدمةٍ واحدة،
//     وصيانتان لجهازٍ واحد، وصيانتان بلا جهازٍ مسجَّل.
// (٣) **وما كان يمنعه بلا سبب صار مسموحاً**: بناءٌ وصيانةٌ معاً، وصيانتان
//     على جهازين مسلَّمين مختلفين. وهذا هو سبب الترحيل كلّه.
// (٤) **idempotent**، ولا صفَّ يتغيّر.

import { pool } from "./db";
import { sql as MIG051, name as NAME051 } from "./migrations/051_device_order_purpose_uniqueness";

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
async function refused(fn: () => Promise<unknown>): Promise<string | null> {
  try { await fn(); return null; } catch (e: any) { return String(e?.message ?? e); }
}

const MARK = "اختبار-ترحيل-٠٥١";
const EXPERT = 9851;

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function runMigration() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(MIG051);
    await c.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [NAME051]);
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}
async function mkPatient(name: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_amputee, total_cost)
     VALUES ($1,'07701234567',$2,'40','amputee',1,true,0) RETURNING id`, [name, MARK]);
  return r[0].id;
}
async function mkCase(patientId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, status)
     VALUES ($1,1,'prosthetic',0,'active') RETURNING id`, [patientId]);
  return r[0].id;
}
async function mkEpisode(patientId: number, caseId: number, seq: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, agreed_cost)
     VALUES ($1,$2,1,$3,'delivered',0) RETURNING id`, [patientId, caseId, seq]);
  return r[0].id;
}
async function mkOrder(patientId: number, purpose: string, episodeId: number | null, status = "active") {
  const r = await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
       purpose, status, device_episode_id)
     VALUES ($1,1,$2,'prosthetic',$3,$4,$5) RETURNING id`,
    [patientId, EXPERT, purpose, status, episodeId]);
  return r[0].id;
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'m51','x','خبير','prosthetics_expert',1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`, [EXPERT]);
  await cleanup();

  const rowsBefore = await q(`SELECT count(*)::int n FROM prosthetic_work_orders`);

  console.log("\n── الفهارس ──");
  await runMigration();
  await runMigration();   // idempotent: مرّتان بلا خطأ
  const idx = await q<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE tablename='prosthetic_work_orders'
       AND indexname LIKE 'uq_pwo%' ORDER BY indexname`);
  same("الثلاثة البديلة موجودة والقديم مرفوع", idx.map((i) => i.indexname),
    ["uq_pwo_one_open_build_per_service", "uq_pwo_one_open_legacy_maint", "uq_pwo_one_open_maint_per_episode"]);
  check(!idx.some((i) => i.indexname === "uq_pwo_one_active_per_service"),
    "و«uq_pwo_one_active_per_service» لم يعد موجوداً");
  same("والتشغيل مرّتين لم يغيّر شيئاً",
    (await q(`SELECT count(*)::int n FROM prosthetic_work_orders`))[0].n, rowsBefore[0].n);

  console.log("\n── ما يبقى ممنوعاً ──");
  const p1 = await mkPatient("بناءان");
  await mkCase(p1);
  await mkOrder(p1, "initial_build", null);
  const dupBuild = await refused(() => mkOrder(p1, "initial_build", null));
  check(!!dupBuild && /uq_pwo_one_open_build_per_service/.test(dupBuild),
    "بناءان مفتوحان لخدمةٍ واحدة ⟶ مرفوض", String(dupBuild));

  const p2 = await mkPatient("صيانتان لجهاز");
  const c2 = await mkCase(p2);
  const e2 = await mkEpisode(p2, c2, 1);
  await mkOrder(p2, "maintenance", e2);
  const dupMaint = await refused(() => mkOrder(p2, "maintenance", e2));
  check(!!dupMaint && /uq_pwo_one_open_maint_per_episode/.test(dupMaint),
    "وصيانتان مفتوحتان لجهازٍ واحد ⟶ مرفوض", String(dupMaint));

  const p3 = await mkPatient("صيانتان بلا جهاز");
  await mkCase(p3);
  await mkOrder(p3, "maintenance", null);
  const dupLegacy = await refused(() => mkOrder(p3, "maintenance", null));
  check(!!dupLegacy && /uq_pwo_one_open_legacy_maint/.test(dupLegacy),
    "وصيانتان بلا جهازٍ مسجَّل ⟶ مرفوض", String(dupLegacy));

  console.log("\n── وما صار مسموحاً (سبب الترحيل) ──");
  const p4 = await mkPatient("بناء وصيانة");
  const c4 = await mkCase(p4);
  const e4 = await mkEpisode(p4, c4, 1);
  const build4 = await mkOrder(p4, "initial_build", null);
  const maint4 = await refused(() => mkOrder(p4, "maintenance", e4));
  same("**بناءٌ جديد وصيانةُ قديمٍ معاً ⟶ مسموح**", maint4, null);
  same("   والأمران مفتوحان فعلاً",
    (await q(`SELECT count(*)::int n FROM prosthetic_work_orders
               WHERE patient_id=$1 AND status NOT IN ('completed','cancelled')`, [p4]))[0].n, 2);

  const p5 = await mkPatient("صيانتان لجهازين");
  const c5 = await mkCase(p5);
  const a5 = await mkEpisode(p5, c5, 1);
  const b5 = await mkEpisode(p5, c5, 2);
  await mkOrder(p5, "maintenance", a5);
  same("**وصيانتان على جهازين مسلَّمين مختلفين ⟶ مسموح**",
    await refused(() => mkOrder(p5, "maintenance", b5)), null);

  //  والمنتهي لا يزاحم: أمرٌ مكتمل لا يمنع فتح التالي.
  const p6 = await mkPatient("المنتهي لا يزاحم");
  await mkCase(p6);
  await mkOrder(p6, "initial_build", null, "completed");
  same("والأمر المكتمل لا يمنع بناءً جديداً",
    await refused(() => mkOrder(p6, "initial_build", null)), null);

  await cleanup();
  await q(`DELETE FROM system_users WHERE id = $1`, [EXPERT]);
  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
