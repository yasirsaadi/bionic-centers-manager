// «مرضى اليوم» — حيّاً على Postgres، بكلّ مصدرِ نشاطٍ على حدة.
// قاعدة محلّية: `npm run test:patient-activity`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// المرشِّح كان يسأل جدولَ الزيارات وحده، والزيارةُ صفٌّ يُنشئه الموظّف بيده.
// فمريضٌ جاء اليوم واشترى ودفع ووقّع الطبيبُ معاينته **يختفي** إن لم يفتح
// له أحدٌ زيارة — والموظّفُ الذي يرى ذلك يخترع زيارةً ليُظهره، فيتلوّث
// الجدولُ الذي تُبنى عليه كلُّ إحصاءة.
//
// ══ ولماذا كلُّ مصدرٍ على حدة ═══════════════════════════════════════════
// نجاحُ المجموع لا يُثبت أن السادس يعمل: قد يكون التسجيلُ هو مَن أدخل
// المريضَ في كلّ حالة. فيُنشأ لكلّ مصدرٍ مريضٌ **سُجِّل في يومٍ آخر** ثم
// يُعطى نشاطاً واحداً في اليوم المقصود — فلا يدخل إلّا بذلك المصدر وحده.

import { pool, db } from "./db";
import { sql } from "drizzle-orm";
import { patients } from "@shared/schema";
import {
  patientActiveOnDate, patientActiveOnDateBySource, PATIENT_ACTIVITY_SOURCES,
} from "./patient_activity";

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

const MARK = "اختبار-نشاط-اليوم";
const DAY = "2026-05-14";           // اليومُ المقصود (بغداد)
const OTHER_DAY = "2026-05-10";     // يومُ التسجيل، بعيدٌ عنه
const EXPERT = 9931, DOC = 9932;

const q = async <T = any>(t: string, p: any[] = []): Promise<T[]> =>
  (await pool.query(t, p)).rows as T[];

/**
 * مريضٌ **سُجِّل في يومٍ آخر** — فلا يدخل يومَ الاختبار بتسجيله.
 * والوقتُ ٢١:٣٠ بتوقيت UTC عمداً: هو ٠٠:٣٠ من اليوم التالي ببغداد، فيُثبَت
 * أن التحويل يقع فعلاً ولا يُقرأ الوقتُ خاماً.
 */
async function mk(label: string, day = OTHER_DAY): Promise<number> {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, branch_id, is_amputee, is_medical_support, total_cost,
       patient_classification, created_at)
     VALUES ($1,'07701234567',$2,'40','170','70','بتر',1,true,false,0,'new',
             ($3::date - INTERVAL '1 day' + TIME '21:30')) RETURNING id`,
    [`${MARK} ${label}`, MARK, day]);
  return r[0].id;
}

/** مَن يظهر في «مرضى اليوم» لهذا اليوم — بالشرط الحقيقيّ نفسه. */
async function activeOn(day: string): Promise<number[]> {
  const rows = await db.select({ id: patients.id }).from(patients)
    .where(sql`${patients.referralSource} = ${MARK} AND ${patientActiveOnDate(day)}`);
  return rows.map((r) => Number(r.id)).sort((a, b) => a - b);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function caseOf(patientId: number): Promise<number> {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [patientId]);
  return r[0].id;
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role] of [[EXPERT, "prosthetics_expert"], [DOC, "doctor"]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','م',$3,1,'[1]'::jsonb,true,'["prosthetic"]'::jsonb)
             ON CONFLICT (id) DO NOTHING`, [id, `pa_u${id}`, role]);
  }
  await cleanup();

  try {
    console.log("\n── كلُّ مصدرٍ يُدخل المريضَ بمفرده ──");

    // ① التسجيل — وحده يكفي.
    const pReg = await mk("سُجِّل اليوم", DAY);

    // ② زيارة.
    const pVisit = await mk("زيارة");
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, notes)
             VALUES ($1,1,($2::date + TIME '10:00'),'زيارة')`, [pVisit, DAY]);

    // ③ دفعة.
    const pPay = await mk("دفعة");
    await q(`INSERT INTO payments (patient_id, branch_id, amount, date)
             VALUES ($1,1,50000,($2::date + TIME '11:00'))`, [pPay, DAY]);

    // ④ معاينةٌ موقّعة.
    const pExam = await mk("معاينة");
    await caseOf(pExam);
    await q(`INSERT INTO medical_exams (patient_id, branch_id, case_type, doctor_id,
               doctor_name, diagnosis, signed_at)
             VALUES ($1,1,'prosthetic',$2,'د. فلان','بتر',
                     (($3::date + TIME '12:00') AT TIME ZONE 'Asia/Baghdad'))`,
      [pExam, DOC, DAY]);

    // ⑤ طلبُ جهازٍ أو جزء.
    const pDev = await mk("طلب جهاز");
    const cDev = await caseOf(pDev);
    await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
               sequence_number, status, agreed_cost, requested_item, component, created_at)
             VALUES ($1,$2,1,1,'awaiting_exam',0,'knee','knee',
                     (($3::date + TIME '13:00') AT TIME ZONE 'Asia/Baghdad'))`,
      [pDev, cDev, DAY]);

    // ⑥ أمرُ تصنيع (بناءٌ أو صيانة).
    const pOrder = await mk("أمر تصنيع");
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id,
               service_type, purpose, status, current_stage, created_at)
             VALUES ($1,1,$2,'prosthetic','initial_build','active','measurement',
                     (($3::date + TIME '14:00') AT TIME ZONE 'Asia/Baghdad'))`,
      [pOrder, EXPERT, DAY]);
    const pMaint = await mk("صيانة");
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id,
               service_type, purpose, status, current_stage, maintenance_component, created_at)
             VALUES ($1,1,$2,'prosthetic','maintenance','active','measurement','knee',
                     (($3::date + TIME '15:00') AT TIME ZONE 'Asia/Baghdad'))`,
      [pMaint, EXPERT, DAY]);

    const expected = [pReg, pVisit, pPay, pExam, pDev, pOrder, pMaint].sort((a, b) => a - b);
    same("١. **الستّةُ يظهرون جميعاً** — تسجيلٌ وزيارةٌ ودفعةٌ ومعاينةٌ وطلبٌ وأمر",
      await activeOn(DAY), expected);

    //  **وكلٌّ منهم بمصدره وحده** — لا بمصدرٍ آخر صادف أن أدخله.
    const bySource = async (src: any) => {
      const rows = await db.select({ id: patients.id }).from(patients)
        .where(sql`${patients.referralSource} = ${MARK} AND ${patientActiveOnDateBySource(DAY, src)}`);
      return rows.map((r) => Number(r.id));
    };
    same("٢. **والتسجيلُ وحده يُدخل مَن سُجِّل**", await bySource("registered"), [pReg]);
    same("٣. والزيارةُ وحدها", await bySource("visit"), [pVisit]);
    same("٤. والدفعةُ وحدها", await bySource("payment"), [pPay]);
    same("٥. والمعاينةُ وحدها", await bySource("exam"), [pExam]);
    same("٦. وطلبُ الجهاز وحده", await bySource("device_request"), [pDev]);
    same("٧. **وأمرُ التصنيع يُدخل البناءَ والصيانة معاً**",
      (await bySource("work_order")).sort((a, b) => a - b),
      [pOrder, pMaint].sort((a, b) => a - b));
    same("   (والمصادرُ ستّة لا غير)", PATIENT_ACTIVITY_SOURCES.length, 6);

    // ══ ٢. **ولا تكرار** ولو وقع كلُّ شيءٍ في اليوم نفسه ═══════════════
    console.log("\n── لا تكرار ──");
    const pAll = await mk("كلُّ شيءٍ اليوم", DAY);
    const cAll = await caseOf(pAll);
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, notes)
             VALUES ($1,1,($2::date + TIME '09:00'),'زيارة'), ($1,1,($2::date + TIME '10:00'),'أخرى')`,
      [pAll, DAY]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, date)
             VALUES ($1,1,10000,($2::date + TIME '11:00')), ($1,1,20000,($2::date + TIME '12:00'))`,
      [pAll, DAY]);
    await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
               sequence_number, status, agreed_cost, requested_item, created_at)
             VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',
                     (($3::date + TIME '13:00') AT TIME ZONE 'Asia/Baghdad'))`,
      [pAll, cAll, DAY]);
    const rows = await activeOn(DAY);
    same("٨. **مريضٌ بستّة أنشطةٍ يظهر مرّةً واحدة**",
      rows.filter((id) => id === pAll).length, 1);

    // ══ ٣. **ومَن لا نشاط له لا يظهر** ═════════════════════════════════
    console.log("\n── من لا نشاط له ──");
    const pIdle = await mk("بلا نشاط");
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, notes)
             VALUES ($1,1,($2::date + TIME '10:00'),'زيارةٌ في يومٍ آخر')`, [pIdle, OTHER_DAY]);
    check(!(await activeOn(DAY)).includes(pIdle),
      "٩. **مريضٌ نشاطُه في يومٍ آخر لا يظهر اليوم**");
    check((await activeOn(OTHER_DAY)).includes(pIdle),
      "١٠. ويظهر في يومه هو");

    // ══ ٤. **والزيارةُ المحذوفة ليست نشاطاً** ══════════════════════════
    const pDel = await mk("زيارةٌ محذوفة");
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, notes, deleted_at)
             VALUES ($1,1,($2::date + TIME '10:00'),'محذوفة',NOW())`, [pDel, DAY]);
    check(!(await activeOn(DAY)).includes(pDel),
      "١١. **والحذفُ الناعم يُحترَم — زيارةٌ محذوفة ليست نشاطاً**");

    // ══ ٥. **ويومُ بغداد لا يومُ الخادم** ═════════════════════════════
    //  زيارةٌ الساعة ٢٢:٠٠ بتوقيت UTC هي ٠١:٠٠ من الغد ببغداد — فتُحسَب
    //  على الغد. وهذا أكثرُ ما يقع خلافٌ فيه.
    console.log("\n── يوم بغداد ──");
    const pLate = await mk("زيارةٌ متأخّرة");
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, notes)
             VALUES ($1,1,($2::date + TIME '22:00'),'متأخّرة')`, [pLate, DAY]);
    check(!(await activeOn(DAY)).includes(pLate),
      "١٢. **زيارةُ ٢٢:٠٠ UTC ليست من يومها ببغداد**");
    const nextDay = "2026-05-15";
    check((await activeOn(nextDay)).includes(pLate),
      "١٣. **بل من الغد** — التحويلُ يقع فعلاً");

    // ══ ٦. **وعزلُ الفرع لا يُمَسّ** ═══════════════════════════════════
    //  الشرطُ يُضاف إلى شروط الفرع نفسها — فالنشاطُ لا يُخرج موظّفاً من فرعه.
    console.log("\n── عزل الفرع ──");
    const pB2 = await mk("فرعٌ آخر", DAY);
    await q(`UPDATE patients SET branch_id = 2 WHERE id = $1`, [pB2]);
    const scoped = await db.select({ id: patients.id }).from(patients)
      .where(sql`${patients.referralSource} = ${MARK}
        AND ${patients.branchId} = 1 AND ${patientActiveOnDate(DAY)}`);
    check(!scoped.map((r) => Number(r.id)).includes(pB2),
      "١٤. **ومريضُ فرعٍ آخر لا يظهر لموظّفٍ مثبَّتٍ بفرعه**");
    check((await activeOn(DAY)).includes(pB2),
      "   (وهو نشطٌ فعلاً — الفرقُ شرطُ الفرع لا شرطُ النشاط)");
  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[EXPERT, DOC]]);
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
