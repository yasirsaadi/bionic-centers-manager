// ترحيل ٠٥٠ — هوية الأجهزة التاريخية، حيّاً على Postgres.
// قاعدة محلّية: `npm run test:episode-backfill`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **خريطة الحالات كاملةً**: مكتمل ⟶ مُسلَّم، ملغى ⟶ ملغى، وما بينهما
//     ⟶ قيد التصنيع. وتاريخ التسليم يُقرأ من ختم حقيقي أو يبقى فارغاً —
//     لا يُخترع من updated_at.
// (٢) **الترتيب التاريخي محفوظ**: جهازان لنفس الخيط يصيران #١ و#٢ بترتيب
//     الإنشاء، ولو كان الأول ملغى. هذا هو جوهر المشروع: تاريخُ المريض لا
//     يُطوى إلى جهاز واحد.
// (٣) **agreed_cost = 0 لكل حلقة مرحَّلة** — حتى حين يكون في الخيط سعرُ
//     جهازٍ وأجرُ صيانةٍ مجموعين في رقم واحد. لا يوجد مصدر حتميّ يفصلهما،
//     والتخمين في سجلّ دائم أسوأ من الفراغ.
// (٤) **لم يتحرّك دينار**: لقطة قبل/بعد لكلّ من total_cost وكلف الحالات
//     ومجاميع الدفعات والقيود وأعدادها — متطابقة حرفياً.
// (٥) **لا إسناد تاريخي خارج أوامر البناء**: الترحيل يكتب عمود الربط على
//     أوامر البناء الأولي وحدها. الصيانة والمعاينة والدفعة والزيارة وقيد
//     الكلفة تبقى كلّها NULL — في العيّنة وفي القاعدة كلّها.
// (٦) **الختم السريري لم يُفتح أصلاً**: صفّ المعاينة مقارنٌ بايتاً ببايت
//     بما فيه عمود الربط، وتحقّقٌ نصّي أن allow_exam_edit لا يَرِد في
//     نصّ الترحيل إطلاقاً.
// (٧) **idempotent فعلاً**: تشغيل الـ SQL نفسه مرّتين لا يكرّر حلقة ولا
//     يغيّر تسلسلاً ولا رابطاً ولا حالة ولا مبلغاً.
//
// ══ لماذا لا إسناد تاريخي ══════════════════════════════════════════════
// قياس الإنتاج أظهر ٤٢ أمر صيانة بلا أيّ بناء سابق — دليلٌ موجب على أجهزة
// إرث حقيقية لم تُسجَّل قطّ. فبناءٌ مكتمل وحيد قبل صيانةٍ ما لا يثبت أنها
// تخصّه؛ القرينة الزمنية ترجيحٌ لا برهان، ولا تُثبَّت في سجلّ دائم.

import { pool } from "./db";
import { sql as MIGRATION_050, name as MIGRATION_NAME } from "./migrations/050_device_episode_backfill";

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

const MARK = "اختبار-ترحيل-الحلقات";
const MANAGER = 9811;

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

/** يشغّل ترحيل ٠٥٠ تماماً كما يشغّله runner: معاملة واحدة. */
async function runMigration050(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(MIGRATION_050);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function mkPatient(name: string, totalCost = 0): Promise<number> {
  const rows = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       medical_condition, branch_id, is_amputee, total_cost)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true,$3) RETURNING id`,
    [name, MARK, totalCost]);
  return rows[0].id;
}

async function mkCase(patientId: number, caseType = "prosthetic", cost = 0): Promise<number> {
  const rows = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost)
     VALUES ($1,1,$2,$3) RETURNING id`, [patientId, caseType, cost]);
  return rows[0].id;
}

interface OrderOpts {
  purpose?: string; status?: string; createdAt: string;
  completedAt?: string | null; updatedAt?: string | null;
  assignedBy?: number | null; serviceType?: string;
}
async function mkOrder(patientId: number, o: OrderOpts): Promise<number> {
  const rows = await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders
       (patient_id, branch_id, expert_user_id, assigned_by, service_type, purpose,
        status, created_at, completed_at, updated_at)
     VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [patientId, MANAGER, o.assignedBy === undefined ? MANAGER : o.assignedBy,
     o.serviceType ?? "prosthetic", o.purpose ?? "initial_build", o.status ?? "active",
     //  updated_at في القاعدة NOT NULL، فالافتراض هو تاريخ الإنشاء نفسه.
     o.createdAt, o.completedAt ?? null, o.updatedAt ?? o.createdAt]);
  return rows[0].id;
}

async function mkExam(patientId: number, caseId: number | null): Promise<number> {
  const rows = await q<{ id: number }>(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
       doctor_name, diagnosis, plan, prescription, version, signed_at)
     VALUES ($1,$2,'prosthetic',1,$3,'د. فلان','تشخيص أصلي','خطة أصلية',
             '{"a":1}'::jsonb, 1, NOW()) RETURNING id`,
    [patientId, caseId, MANAGER]);
  return rows[0].id;
}

async function episodesOf(caseId: number) {
  return q(`SELECT id, sequence_number, status, agreed_cost, delivered_at, cancelled_at,
                   cancel_reason, created_by, created_at, updated_at, branch_id, patient_id
              FROM patient_device_episodes WHERE case_id = $1 ORDER BY sequence_number`, [caseId]);
}
async function orderEpisode(orderId: number): Promise<number | null> {
  const r = await q<{ device_episode_id: number | null }>(
    `SELECT device_episode_id FROM prosthetic_work_orders WHERE id = $1`, [orderId]);
  return r[0]?.device_episode_id ?? null;
}

/** لقطة مالية شاملة للقاعدة كلّها — لا لصفوف الاختبار وحدها. */
async function moneySnapshot() {
  const [r] = await q(`SELECT
      (SELECT COALESCE(sum(total_cost),0) FROM patients)      AS patients_total_cost,
      (SELECT COALESCE(sum(cost),0) FROM patient_cases)       AS cases_cost,
      (SELECT COALESCE(sum(amount),0) FROM cost_entries)      AS cost_entries_sum,
      (SELECT count(*) FROM cost_entries)                     AS cost_entries_n,
      (SELECT COALESCE(sum(amount),0) FROM payments)          AS payments_sum,
      (SELECT count(*) FROM payments)                         AS payments_n,
      (SELECT count(*) FROM invoices)                         AS invoices_n,
      (SELECT COALESCE(sum(total),0) FROM invoices)           AS invoices_sum,
      (SELECT COALESCE(sum(paid_amount),0) FROM invoices)     AS invoices_paid,
      (SELECT count(*) FROM installment_plans)                AS plans_n`);
  return r;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

const T = {
  build1: "2024-01-10T09:00:00Z", done1: "2024-03-01T12:00:00Z",
  build2: "2026-02-10T09:00:00Z", done2: "2026-04-01T12:00:00Z",
  mnt:    "2026-06-01T09:00:00Z", edited: "2025-12-31T23:00:00Z",
};
const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d === null ? null : String(d));
/** التوقيت المتوقَّع بصيغة ISO الكاملة، فلا يفشل التطابق على أجزاء الثانية. */
const at = (s: string) => new Date(s).toISOString();

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'bf_u1','x','MigrationTester','branch_manager',1,'[1]'::jsonb,true)
           ON CONFLICT (id) DO NOTHING`, [MANAGER]);
  await cleanup();

  // ══════════════ بناء العيّنة ══════════════════════════════════════════
  console.log("\n── بناء العيّنة التاريخية ──");

  // A/B — بناء مكتمل بختم تسليم
  const pA = await mkPatient("أ. جهاز مسلَّم", 1_000_000);
  const cA = await mkCase(pA, "prosthetic", 1_000_000);
  const oA = await mkOrder(pA, { status: "completed", createdAt: T.build1, completedAt: T.done1, updatedAt: T.done1 });

  // C — مكتمل بلا ختم تسليم
  const pC = await mkPatient("ج. مكتمل بلا ختم");
  const cC = await mkCase(pC);
  const oC = await mkOrder(pC, { status: "completed", createdAt: T.build1, completedAt: null, updatedAt: T.edited });

  // D — ملغى
  const pD = await mkPatient("د. ملغى");
  const cD = await mkCase(pD);
  const oD = await mkOrder(pD, { status: "cancelled", createdAt: T.build1, updatedAt: T.edited });

  // E — قيد العمل
  const pE = await mkPatient("هـ. قيد العمل");
  const cE = await mkCase(pE);
  const oE = await mkOrder(pE, { status: "active", createdAt: T.build1, assignedBy: null });

  // F — ملغى ثم مكتمل (العائد بعد فشل أوّل)
  const pF = await mkPatient("و. ملغى ثم مكتمل");
  const cF = await mkCase(pF);
  const oF1 = await mkOrder(pF, { status: "cancelled", createdAt: T.build1 });
  const oF2 = await mkOrder(pF, { status: "completed", createdAt: T.build2, completedAt: T.done2 });

  // G — جهازان مكتملان (العائد بعد سنتين — قلب المشروع)
  const pG = await mkPatient("ز. جهازان مكتملان", 1_950_000);
  const cG = await mkCase(pG, "prosthetic", 1_950_000);
  const oG1 = await mkOrder(pG, { status: "completed", createdAt: T.build1, completedAt: T.done1 });
  const oG2 = await mkOrder(pG, { status: "completed", createdAt: T.build2, completedAt: T.done2 });

  // H — ملغيان
  const pH = await mkPatient("ح. ملغيان", 250_000);
  const cH = await mkCase(pH, "prosthetic", 250_000);
  const oH1 = await mkOrder(pH, { status: "cancelled", createdAt: T.build1 });
  const oH2 = await mkOrder(pH, { status: "cancelled", createdAt: T.build2 });

  // I — حالة بلا أمر بناء (نمط الـ٧٧٩)
  const pI = await mkPatient("ط. حالة بلا بناء");
  const cI = await mkCase(pI);

  // J — أمر بناء بلا حالة مطابقة
  const pJ = await mkPatient("ي. بناء بلا حالة");
  const oJ = await mkOrder(pJ, { status: "completed", createdAt: T.build1, completedAt: T.done1 });

  // K — صيانة بدليل تسليم قاطع. الخيط يحمل سعر جهاز + أجر صيانة معاً.
  const pK = await mkPatient("ك. صيانة موثّقة", 1_050_000);
  const cK = await mkCase(pK, "prosthetic", 1_050_000);   // 1,000,000 جهاز + 50,000 صيانة
  const oK = await mkOrder(pK, { status: "completed", createdAt: T.build1, completedAt: T.done1 });
  const oKm = await mkOrder(pK, { purpose: "maintenance", status: "completed", createdAt: T.mnt });

  // L — صيانة وبناؤها بلا ختم تسليم
  const pL = await mkPatient("ل. صيانة بلا ختم");
  const cL = await mkCase(pL);
  const oL = await mkOrder(pL, { status: "completed", createdAt: T.build1, completedAt: null });
  const oLm = await mkOrder(pL, { purpose: "maintenance", status: "completed", createdAt: T.mnt });

  // M — صيانة بمرشّحَين
  const pM = await mkPatient("م. صيانة بمرشّحين");
  const cM = await mkCase(pM);
  const oM1 = await mkOrder(pM, { status: "completed", createdAt: T.build1, completedAt: T.done1 });
  const oM2 = await mkOrder(pM, { status: "completed", createdAt: T.build2, completedAt: T.done2 });
  const oMm = await mkOrder(pM, { purpose: "maintenance", status: "completed", createdAt: T.mnt });

  // N — صيانة بلا بناء (جهاز إرث غير مسجّل)
  const pN = await mkPatient("ن. صيانة بلا بناء");
  const cN = await mkCase(pN);
  const oNm = await mkOrder(pN, { purpose: "maintenance", status: "completed", createdAt: T.mnt });

  // O — معاينة على خيط بحلقة واحدة
  const pO = await mkPatient("س. معاينة بحلقة واحدة");
  const cO = await mkCase(pO);
  const oO = await mkOrder(pO, { status: "completed", createdAt: T.build1, completedAt: T.done1 });
  const xO = await mkExam(pO, cO);

  // P — معاينة على خيط بحلقتين
  const pP = await mkPatient("ع. معاينة بحلقتين");
  const cP = await mkCase(pP);
  const oP1 = await mkOrder(pP, { status: "completed", createdAt: T.build1, completedAt: T.done1 });
  const oP2 = await mkOrder(pP, { status: "completed", createdAt: T.build2, completedAt: T.done2 });
  const xP = await mkExam(pP, cP);

  // R/S/T — مال وزيارات تاريخية يجب أن تبقى بلا ربط
  await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id) VALUES ($1,1,300000,$2)`, [pA, cA]);
  await q(`INSERT INTO visits   (patient_id, branch_id, case_id)          VALUES ($1,1,$2)`, [pA, cA]);
  await q(`INSERT INTO cost_entries (patient_id, amount, source)          VALUES ($1,1000000,'assign')`, [pA]);

  const examBefore = await q(`SELECT id, patient_id, case_id, case_type, doctor_id, doctor_name,
      chief_complaint, clinical_findings, diagnosis, plan, notes, prescription, device_cost,
      proposed_expert_user_id, version, edited_at, edited_by, edited_by_name, signed_at, created_at,
      device_episode_id
      FROM medical_exams WHERE id = ANY($1::int[]) ORDER BY id`, [[xO, xP]]);

  const before = await moneySnapshot();
  const alreadyApplied = await q(`SELECT 1 FROM _migrations WHERE name = $1`, [MIGRATION_NAME]);

  // ══════════════ التشغيل الأول ═════════════════════════════════════════
  console.log("\n── تشغيل الترحيل (المرّة الأولى) ──");
  await runMigration050();

  const eA = await episodesOf(cA);
  same("أ. حلقة واحدة للجهاز المسلَّم", eA.length, 1);
  same("   حالتها «مُسلَّم»", eA[0]?.status, "delivered");
  same("   وتسلسلها ١", eA[0]?.sequence_number, 1);
  same("   وسعرها المتفق عليه صفر رغم أن كلفة الخيط ١٬٠٠٠٬٠٠٠", eA[0]?.agreed_cost, 0);
  same("ب. وتاريخ التسليم منقول حرفياً من completed_at", iso(eA[0]?.delivered_at), at(T.done1));
  same("   وتاريخ الإنشاء من الأمر لا من اليوم", iso(eA[0]?.created_at), at(T.build1));
  same("   وكاتبها منقول من assigned_by", eA[0]?.created_by, MANAGER);
  same("   وفرعها من الأمر", eA[0]?.branch_id, 1);
  same("   والأمر مرتبط بها", await orderEpisode(oA), eA[0]?.id);

  const eC = await episodesOf(cC);
  same("ج. المكتمل بلا ختم يبقى «مُسلَّم»", eC[0]?.status, "delivered");
  same("   لكن تاريخ تسليمه فارغ — لا يُخترع من updated_at", eC[0]?.delivered_at, null);
  same("   و updated_at منقول كما هو", iso(eC[0]?.updated_at), at(T.edited));
  same("   والأمر مرتبط", await orderEpisode(oC), eC[0]?.id);

  const eD = await episodesOf(cD);
  same("د. الملغى ⟶ حلقة ملغاة", eD[0]?.status, "cancelled");
  same("   وسعرها صفر", eD[0]?.agreed_cost, 0);
  same("   وتاريخ الإلغاء فارغ (لا ختم موثوق)", eD[0]?.cancelled_at, null);
  same("   وسبب الإلغاء فارغ", eD[0]?.cancel_reason, null);

  const eE = await episodesOf(cE);
  same("هـ. غير المنتهي ⟶ «قيد التصنيع»", eE[0]?.status, "in_manufacturing");
  same("   وكاتبها NULL حين كان assigned_by فارغاً", eE[0]?.created_by, null);

  const eF = await episodesOf(cF);
  same("و. جهازان: ملغى ثم مكتمل", eF.map((e: any) => [e.sequence_number, e.status]),
    [[1, "cancelled"], [2, "delivered"]]);
  same("   الأول مرتبط بحلقته", await orderEpisode(oF1), eF[0]?.id);
  same("   والثاني بحلقته", await orderEpisode(oF2), eF[1]?.id);

  const eG = await episodesOf(cG);
  same("ز. جهازان مكتملان ⟶ #١ و#٢ مُسلَّمان", eG.map((e: any) => [e.sequence_number, e.status]),
    [[1, "delivered"], [2, "delivered"]]);
  same("   وكلا سعريهما صفر رغم كلفة الخيط ١٬٩٥٠٬٠٠٠", eG.map((e: any) => e.agreed_cost), [0, 0]);
  same("   والربط ١:١ بالترتيب", [await orderEpisode(oG1), await orderEpisode(oG2)],
    [eG[0]?.id, eG[1]?.id]);
  same("   وتاريخا التسليم مختلفان — التاريخ لم يُطوَ",
    [iso(eG[0]?.delivered_at), iso(eG[1]?.delivered_at)], [at(T.done1), at(T.done2)]);

  const eH = await episodesOf(cH);
  same("ح. ملغيان ⟶ #١ و#٢ ملغاتان", eH.map((e: any) => [e.sequence_number, e.status]),
    [[1, "cancelled"], [2, "cancelled"]]);
  same("   والربط ١:١", [await orderEpisode(oH1), await orderEpisode(oH2)], [eH[0]?.id, eH[1]?.id]);

  same("ط. حالة بلا أمر بناء ⟶ لا حلقة", (await episodesOf(cI)).length, 0);

  const eJ = await q(`SELECT count(*)::int AS n FROM patient_device_episodes WHERE patient_id = $1`, [pJ]);
  same("ي. بناء بلا حالة ⟶ لا حلقة", eJ[0]?.n, 0);
  same("   والأمر يبقى بلا ربط", await orderEpisode(oJ), null);

  //  ك — حلقة البناء تُنشأ لمريض له صيانة أيضاً، وسعرها يبقى صفراً حتى
  //  حين يجمع خيطُه سعر الجهاز وأجر الصيانة في رقم واحد.
  const eK = await episodesOf(cK);
  same("ك. حلقة البناء أُنشئت لمريض له صيانة", eK.length, 1);
  same("   وسعرها صفر رغم أن الخيط يجمع ١٬٠٠٠٬٠٠٠ جهازاً + ٥٠٬٠٠٠ صيانةً",
    eK[0]?.agreed_cost, 0);
  same("   وحلقة البناء بلا ختم تسليم أُنشئت كذلك", (await episodesOf(cL)).length, 1);
  same("   وحلقتا البناء لمريض المرشّحَين أُنشئتا", (await episodesOf(cM)).length, 2);

  // ══ لا إسناد تاريخي خارج أوامر البناء ════════════════════════════════
  //  ٤٢ أمر صيانة في الإنتاج بلا أيّ بناء سابق ⇒ أجهزة إرث حقيقية غير
  //  مسجَّلة. فالقرينة الزمنية ترجيحٌ لا برهان، ولا تُثبَّت في سجلّ دائم.
  console.log("\n── لا إسناد تاريخي خارج أوامر البناء ──");
  same("ل. الصيانة الموثّقة زمنياً تبقى فارغة", await orderEpisode(oKm), null);
  same("م. والصيانة بلا ختم تسليم فارغة", await orderEpisode(oLm), null);
  same("ن. والصيانة بمرشّحَين فارغة", await orderEpisode(oMm), null);
  same("س. والصيانة بلا بناء سابق فارغة", await orderEpisode(oNm), null);

  const mnt = await q(`SELECT count(*)::int AS n FROM prosthetic_work_orders
                        WHERE purpose <> 'initial_build' AND device_episode_id IS NOT NULL`);
  same("ع. ولا أمر واحد بغرضٍ غير البناء رُبِط بحلقة — في القاعدة كلّها", mnt[0]?.n, 0);

  const xOrow = await q(`SELECT device_episode_id FROM medical_exams WHERE id = $1`, [xO]);
  const xProw = await q(`SELECT device_episode_id FROM medical_exams WHERE id = $1`, [xP]);
  same("ف. المعاينة على خيط بحلقة واحدة تبقى فارغة", xOrow[0]?.device_episode_id, null);
  same("ص. والمعاينة على خيط بحلقتين تبقى فارغة", xProw[0]?.device_episode_id, null);
  const exAll = await q(`SELECT count(*)::int AS n FROM medical_exams WHERE device_episode_id IS NOT NULL`);
  same("ق. ولا معاينة واحدة رُبِطت — في القاعدة كلّها", exAll[0]?.n, 0);

  //  الختم السريري لم يُمَسّ — بما فيه عمود الربط نفسه هذه المرّة.
  const examAfter = await q(`SELECT id, patient_id, case_id, case_type, doctor_id, doctor_name,
      chief_complaint, clinical_findings, diagnosis, plan, notes, prescription, device_cost,
      proposed_expert_user_id, version, edited_at, edited_by, edited_by_name, signed_at, created_at,
      device_episode_id
      FROM medical_exams WHERE id = ANY($1::int[]) ORDER BY id`, [[xO, xP]]);
  same("ر. صفّ المعاينة المختوم كما كان بايتاً ببايت", examAfter, examBefore);
  const revs = await q(`SELECT count(*)::int AS n FROM medical_exam_revisions WHERE exam_id = ANY($1::int[])`,
    [[xO, xP]]);
  same("   ولم تُنشأ نسخة مراجعة", revs[0]?.n, 0);
  const sealed = await q(`SELECT current_setting('app.allow_exam_edit', true) AS v`);
  check(sealed[0]?.v !== "on", "   والباب المراقَب مغلق", String(sealed[0]?.v));
  check(!/allow_exam_edit/.test(MIGRATION_050),
    "   **ولا يَرِد allow_exam_edit في نصّ الترحيل إطلاقاً** — الختم لا يُفتح");

  // ش/ت/ث — المال والزيارات بلا ربط
  const unlinked = await q(`SELECT
      (SELECT count(*)::int FROM payments     WHERE device_episode_id IS NOT NULL) AS pay,
      (SELECT count(*)::int FROM visits       WHERE device_episode_id IS NOT NULL) AS vis,
      (SELECT count(*)::int FROM cost_entries WHERE device_episode_id IS NOT NULL) AS ce`);
  same("ش. لا دفعة مرتبطة بحلقة", unlinked[0]?.pay, 0);
  same("ت. لا زيارة مرتبطة بحلقة", unlinked[0]?.vis, 0);
  same("ث. لا قيد كلفة مرتبط بحلقة", unlinked[0]?.ce, 0);

  // ══════════════ لم يتحرّك دينار ═══════════════════════════════════════
  console.log("\n── إثبات أن المال لم يتحرّك ──");
  const after = await moneySnapshot();
  same("كل المجاميع والأعداد المالية متطابقة حرفياً", after, before);

  const allZero = await q(`SELECT count(*)::int AS n FROM patient_device_episodes WHERE agreed_cost <> 0`);
  same("ولا حلقة واحدة في القاعدة كلّها بسعر غير صفر", allZero[0]?.n, 0);

  // ══════════════ ثوابت ما بعد الترحيل ══════════════════════════════════
  console.log("\n── الثوابت ──");
  const inv = await q(`SELECT
      (SELECT count(*)::int FROM patient_device_episodes e JOIN patient_cases pc ON pc.id = e.case_id
        WHERE pc.patient_id <> e.patient_id)                                        AS wrong_patient,
      (SELECT count(*)::int FROM prosthetic_work_orders wo JOIN patient_device_episodes e
        ON e.id = wo.device_episode_id WHERE e.patient_id <> wo.patient_id)         AS wrong_order_patient,
      (SELECT count(*)::int FROM (SELECT case_id FROM patient_device_episodes
        WHERE status NOT IN ('delivered','cancelled') GROUP BY case_id HAVING count(*) > 1) x) AS multi_open,
      (SELECT count(*)::int FROM (SELECT case_id, sequence_number FROM patient_device_episodes
        GROUP BY case_id, sequence_number HAVING count(*) > 1) y)                   AS dup_seq,
      (SELECT count(*)::int FROM patient_device_episodes)                           AS episodes_total,
      (SELECT count(*)::int FROM prosthetic_work_orders wo JOIN patient_cases pc
        ON pc.patient_id = wo.patient_id AND pc.case_type = wo.service_type
        WHERE wo.purpose = 'initial_build')                                         AS linkable_builds,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE purpose = 'initial_build'
        AND device_episode_id IS NULL AND EXISTS (SELECT 1 FROM patient_cases pc
          WHERE pc.patient_id = prosthetic_work_orders.patient_id
            AND pc.case_type = prosthetic_work_orders.service_type))                AS unlinked_builds`);
  same("كل حلقة تخصّ مريض حالتها", inv[0]?.wrong_patient, 0);
  same("كل أمر مرتبط يخصّ مريض حلقته", inv[0]?.wrong_order_patient, 0);
  same("لا خيط بحلقتين مفتوحتين", inv[0]?.multi_open, 0);
  same("لا تسلسل مكرَّر داخل خيط", inv[0]?.dup_seq, 0);
  same("عدد الحلقات = عدد أوامر البناء القابلة للربط", inv[0]?.episodes_total, inv[0]?.linkable_builds);
  same("ولا أمر بناء قابل للربط بقي بلا حلقة", inv[0]?.unlinked_builds, 0);

  // ══════════════ التشغيل الثاني — idempotency ══════════════════════════
  console.log("\n── تشغيل الترحيل مرّة ثانية ──");
  const snapAll = async () => q(
    `SELECT id, patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
            created_by, created_at, updated_at, delivered_at, cancelled_at, cancel_reason
       FROM patient_device_episodes ORDER BY id`);
  const linksSnap = async () => q(
    `SELECT id, device_episode_id FROM prosthetic_work_orders ORDER BY id`);
  const examLinks = async () => q(
    `SELECT id, device_episode_id FROM medical_exams ORDER BY id`);

  const epi1 = await snapAll(), lnk1 = await linksSnap(), exl1 = await examLinks();
  await runMigration050();
  const epi2 = await snapAll(), lnk2 = await linksSnap(), exl2 = await examLinks();
  const money2 = await moneySnapshot();

  same("الحلقات لم تتكرّر ولم تتغيّر بحرف", epi2, epi1);
  same("وروابط الأوامر كما هي", lnk2, lnk1);
  same("وروابط المعاينات كما هي", exl2, exl1);
  same("والمال ما زال كما كان قبل الترحيل", money2, before);
  same("وعدد الحلقات لم يزد", epi2.length, epi1.length);

  const examAfter2 = await q(`SELECT id, diagnosis, plan, prescription, version, signed_at, doctor_name
      FROM medical_exams WHERE id = ANY($1::int[]) ORDER BY id`, [[xO, xP]]);
  const examBefore2 = examBefore.map((e: any) => ({
    id: e.id, diagnosis: e.diagnosis, plan: e.plan, prescription: e.prescription,
    version: e.version, signed_at: e.signed_at, doctor_name: e.doctor_name }));
  same("والمعاينة المختومة سليمة بعد التشغيلين", examAfter2, examBefore2);

  // ══════════════ الصفوف الباقية فارغة عمداً ════════════════════════════
  //  الجرد النهائي: الترحيل يكتب في عمود ربط واحد لا غير — على أوامر
  //  البناء الأولي وحدها. وكل ما عداه في القاعدة كلّها يبقى فارغاً.
  console.log("\n── الجرد النهائي: ما كُتب وما بقي فارغاً ──");
  const nulls = await q(`SELECT
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE purpose = 'initial_build'
        AND device_episode_id IS NOT NULL)                                       AS build_linked,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE purpose <> 'initial_build'
        AND device_episode_id IS NOT NULL)                                       AS other_linked,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE purpose = 'maintenance'
        AND device_episode_id IS NOT NULL)                                       AS mnt_linked,
      (SELECT count(*)::int FROM medical_exams WHERE device_episode_id IS NOT NULL) AS exam_linked,
      (SELECT count(*)::int FROM payments      WHERE device_episode_id IS NOT NULL) AS pay_linked,
      (SELECT count(*)::int FROM visits        WHERE device_episode_id IS NOT NULL) AS vis_linked,
      (SELECT count(*)::int FROM cost_entries  WHERE device_episode_id IS NOT NULL) AS ce_linked`);
  check((nulls[0]?.build_linked ?? 0) > 0, "أوامر البناء الأولي مرتبطة فعلاً", JSON.stringify(nulls[0]));
  same("**والصيانة كلّها فارغة**", nulls[0]?.mnt_linked, 0);
  same("**وكل أمر بغرضٍ غير البناء فارغ**", nulls[0]?.other_linked, 0);
  same("**والمعاينات كلّها فارغة**", nulls[0]?.exam_linked, 0);
  same("**والدفعات كلّها فارغة**", nulls[0]?.pay_linked, 0);
  same("**والزيارات كلّها فارغة**", nulls[0]?.vis_linked, 0);
  same("**وقيود الكلف كلّها فارغة**", nulls[0]?.ce_linked, 0);

  if (alreadyApplied.length === 0) {
    await q(`INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [MIGRATION_NAME]);
  }

  await cleanup();
  await q(`DELETE FROM audit_log WHERE user_id = $1`, [MANAGER]);
  await q(`DELETE FROM system_users WHERE id = $1`, [MANAGER]);

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
