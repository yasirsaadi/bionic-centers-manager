// المراجعةُ الشاملة — الدفعةُ د: إلغاءُ الجهاز يسحب طلباتِ مراجعته المعلَّقة عند الطبيب (§4.bo).
// قاعدة محلّية: `npm run test:review-batch-d`.
//
// (أ) إلغاءُ أمر التصنيع (`syncEpisodeToOrderTerminalState`) ⟵ «المراجعةُ السريعة» المعلَّقة على الجهاز تُسحب.
// (ب) الإبطالُ الإداريّ للعملية (`markEpisodeAdministrativelyVoid`) ⟵ كذلك.
// (ج) والتسليمُ لا يسحب شيئاً، وطلبُ جهازٍ آخر لا يُمسّ.

import { db, pool } from "./db";
import { syncEpisodeToOrderTerminalState, markEpisodeAdministrativelyVoid } from "./device_episodes/store";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const MARK = "اختبار-مراجعة-د";
async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/** مريضٌ بقسم أطراف وجهازين «قيد التصنيع»، ولكلٍّ منهما «مراجعةٌ سريعة» معلَّقة. */
async function fixture(label: string) {
  const p = (await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost)
     VALUES ($1,'07701234567',$2,'40','170','70','x',1,0) RETURNING id`, [`${MARK} ${label}`, MARK]))[0].id;
  const c = (await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,'prosthetic',0) RETURNING id`, [p]))[0].id;
  const ep = async (seq: number) => (await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status)
     VALUES ($1,$2,1,$3,'in_manufacturing') RETURNING id`, [p, c, seq]))[0].id;
  const e1 = await ep(1), e2 = await ep(2);
  const rq = async (e: number) => (await q<{ id: number }>(
    `INSERT INTO medical_review_requests (patient_id, service_type, case_id, branch_id, device_episode_id, requested_path, review_kind, status)
     VALUES ($1,'prosthetic',$2,1,$3,'quick','follow_up','pending') RETURNING id`, [p, c, e]))[0].id;
  return { p, e1, e2, r1: await rq(e1), r2: await rq(e2) };
}
const statusOf = async (id: number) => (await q(`SELECT status FROM medical_review_requests WHERE id=$1`, [id]))[0]?.status;

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await cleanup();
  try {
    console.log("\n── أ. إلغاءُ أمر التصنيع ──");
    {
      const f = await fixture("أ");
      await db.transaction(async (tx) => {
        await syncEpisodeToOrderTerminalState(tx, { deviceEpisodeId: f.e1, purpose: "initial_build" },
          { status: "cancelled", at: new Date(), reason: "طلب المريض" });
      });
      same("أ١. **طلبُ مراجعة الجهاز الملغى سُحب**", await statusOf(f.r1), "cancelled");
      same("أ٢. وطلبُ الجهاز الآخر باقٍ", await statusOf(f.r2), "pending");
    }
    console.log("\n── ب. الإبطالُ الإداريّ ──");
    {
      const f = await fixture("ب");
      const rv = (await q<{ id: number }>(
        `INSERT INTO administrative_operation_reversals (patient_id, branch_id, mode, reason_code, reason_note, financial_delta)
         VALUES ($1,1,'full_operation','other','اختبار',0) RETURNING id`, [f.p]))[0]?.id;
      await db.transaction(async (tx) => {
        await markEpisodeAdministrativelyVoid(tx, { episodeId: f.e1, reversalId: rv, reason: "إلغاء إداري" });
      });
      same("ب١. **طلبُ مراجعة الجهاز المُبطَل سُحب**", await statusOf(f.r1), "cancelled");
      same("ب٢. وطلبُ الجهاز الآخر باقٍ", await statusOf(f.r2), "pending");
      await q(`UPDATE patient_device_episodes SET admin_void_reversal_id = NULL WHERE patient_id=$1`, [f.p]);
      await q(`DELETE FROM administrative_operation_reversals WHERE id=$1`, [rv]);
    }
    console.log("\n── ج. التسليمُ لا يسحب ──");
    {
      const f = await fixture("ج");
      await db.transaction(async (tx) => {
        await syncEpisodeToOrderTerminalState(tx, { deviceEpisodeId: f.e1, purpose: "initial_build" },
          { status: "delivered", at: new Date() });
      });
      same("ج١. طلبُ مراجعة الجهاز المسلَّم باقٍ", await statusOf(f.r1), "pending");
    }
  } finally {
    await cleanup();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص الدفعة د نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
