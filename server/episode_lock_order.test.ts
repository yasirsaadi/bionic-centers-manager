// ترتيبُ الأقفال بين «طلب جهاز جديد» و«تصحيح العملية» (٢٠٢٦-١٠-٠٥) — حيّاً على Postgres، بتسلسلٍ محتوم لا بالحظّ.
// قاعدة محلّية: `npm run test:episode-lock-order`.
//
// التصحيحُ (`executeReversal`) يقفل صفَّ المريض `FOR UPDATE` ثمّ صفَّ الحالة. والطلبُ الجديد (`startDeviceEpisodeTx`) كان
// يقفل الحالةَ أوّلاً (`ensureCaseTx`) ثمّ يحتاج صفَّ المريض بمفتاح الإدراج — فيتعاكسان ⟵ `deadlock detected` و٥٠٠
// (`test:administrative-reversal` ١٣٨ أحمرَ مرّةً في نحو عشر). هنا يُعاد ذلك التسلسلُ بعينه بيدٍ ثابتة:
//   (أ) جلسةٌ تمثّل التصحيح تقفل المريض ⟵ (ب) الطلبُ الحقيقيّ يبدأ ⟵ (أ) تطلب صفَّ الحالة.
// بالترتيب الصحيح ينتظر (ب) قبل أن يمسّ الحالة، فتأخذها (أ) فوراً ويمضي الاثنان. وبالقديم: جمود.
import { Pool } from "pg";

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

const MARK = "اختبار-ترتيب-أقفال-الطلب";
const pool = new Pool({ connectionString: DBURL });
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE $1`, [`%${MARK}%`]).catch(() => undefined);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`).catch(() => undefined);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id, name) VALUES (1, 'بغداد') ON CONFLICT DO NOTHING`);
  await cleanup();
  const episodes = await import("./device_episodes/store");

  const run = async (label: string, servicePath: "exam" | "no_exam") => {
    const [p] = await q(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1, NULL, $2, '40', '170', '70', 'x', 1, 0, 'new') RETURNING id`, [`${MARK} ${label}`, MARK]);
    const [c] = await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type) VALUES ($1, 1, 'prosthetic') RETURNING id`, [p.id]);

    const a = await pool.connect();
    let aCase: string = "pending";
    let b: { ok: boolean; err?: string } = { ok: false, err: "pending" };
    try {
      await a.query("BEGIN");
      await a.query(`SET LOCAL lock_timeout = '5s'`);
      //  (أ) كالتصحيح: صفُّ المريض أوّلاً.
      await a.query(`SELECT id FROM patients WHERE id = $1 FOR UPDATE`, [p.id]);
      //  (ب) الطلبُ الحقيقيّ في معاملته.
      const bp = episodes.startDeviceEpisode({ patientId: p.id, serviceType: "prosthetic", createdBy: null, servicePath, actingBranchId: 1 })
        .then(() => { b = { ok: true }; })
        .catch((e: any) => { b = { ok: false, err: e?.code ?? e?.message ?? String(e) }; });
      await sleep(400);
      //  (أ) ثمّ صفُّ الحالة — بالترتيب الصحيح هو حرّ، وبالقديم يمسكه (ب) فيتعاكسان.
      try {
        await a.query(`SELECT id FROM patient_cases WHERE id = $1 FOR UPDATE`, [c.id]);
        aCase = "acquired";
        await a.query("COMMIT");
      } catch (e: any) {
        aCase = e?.code ?? "error";
        await a.query("ROLLBACK").catch(() => undefined);
      }
      await bp;
    } finally {
      a.release();
    }
    const eps = await q(`SELECT count(*)::int AS n FROM patient_device_episodes WHERE patient_id = $1`, [p.id]);
    return { aCase, b, episodes: eps[0].n };
  };

  try {
    const r1 = await run("بمعاينة", "exam");
    same("١. **التصحيحُ يأخذ صفَّ الحالة بلا جمود** والطلبُ الجديد ينتظره ثمّ يمضي — حلقةٌ واحدة كُتبت (مسارُ المعاينة)",
      [r1.aCase, r1.b, r1.episodes], ["acquired", { ok: true }, 1]);
    const r2 = await run("بلا معاينة", "no_exam");
    same("٢. والأمرُ نفسُه في مسار «بلا معاينة»", [r2.aCase, r2.b, r2.episodes], ["acquired", { ok: true }, 1]);
  } finally {
    await cleanup();
    await pool.end();
  }
  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); process.exit(1); });
