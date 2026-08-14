// حلقات أجهزة المريض — أساسُ المرحلة الأولى، حيّاً على Postgres.
// قاعدة محلّية: `npm run test:device-episodes`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **قيود القاعدة نفسها**: التسلسل الفريد، وشراءٌ مفتوحٌ واحد لكل خيط،
//     وحالةٌ من قائمة مغلقة. ثوابتُ عملٍ لا تعليقات.
// (٢) **الأعمدة الخمسة اختيارية فعلاً** — فكل صفٍّ قائم في الإنتاج يبقى
//     كما هو، وكل مسارٍ حالي يعمل بلا علم بها.
// (٣) **حذف المريض ينجح** بالسلسلة الثلاثية الجديدة (أمر/قيد ⟶ حلقة ⟶
//     حالة). هذا هو الخطر الأول في هذه المرحلة، والقاعدة الملزِمة في
//     CLAUDE.md تفرض إثباته بحذفٍ حقيقي لا بمراجعة.
// (٤) **الدمج ينقل الحلقات بمعرّفاتها** ويعيد الترقيم بلا تصادم، فتبقى
//     توابعها مرتبطةً بلا لمسة.
//
// ══ وما لا يفعله ═══════════════════════════════════════════════════════
// لا ينشئ حلقةً لصفٍّ تاريخي، ولا يحرّك ديناراً. هذه المرحلة **أساسٌ بلا
// سلوك**: لا نقطة REST، ولا زرّ، ولا كاتب واحد في الإنتاج.

import { pool, db } from "./db";
import { storage } from "./storage";
import {
  patientDeviceEpisodes as PDE, patientCases, prostheticWorkOrders as WO,
  costEntries, payments, visits, medicalExams,
} from "@shared/schema";
import { eq } from "drizzle-orm";

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
/** تُرجع رسالة الخطأ إن رفضت القاعدة، أو `null` إن قبلت. */
async function refused(fn: () => Promise<unknown>): Promise<string | null> {
  try { await fn(); return null; } catch (e: any) { return String(e?.message ?? e); }
}

const MARK = "اختبار-حلقات-الأجهزة";
const EXPERT = 9801, MANAGER = 9802;

async function mkPatient(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition,
       branch_id, is_amputee, total_cost)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true,0) RETURNING id`,
    [name, MARK]);
  return rows[0].id;
}

async function mkCase(patientId: number, caseType = "prosthetic"): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,$2,0) RETURNING id`,
    [patientId, caseType]);
  return rows[0].id;
}

async function mkEpisode(
  patientId: number, caseId: number, sequence: number, status = "awaiting_exam",
): Promise<number> {
  const [row] = await db.insert(PDE).values({
    patientId, caseId, branchId: 1, sequenceNumber: sequence, status, createdBy: MANAGER,
  }).returning({ id: PDE.id });
  return row.id;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role] of [[EXPERT, "prosthetics_expert"], [MANAGER, "branch_manager"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `de_u${id}`, role]);
  }
  await cleanup();

  // ══ ١. حلقةٌ صحيحة ═══════════════════════════════════════════════════
  console.log("\n── إنشاء الحلقة ──");
  const p1 = await mkPatient("مريض الحلقة الأولى");
  const c1 = await mkCase(p1);
  const e1 = await mkEpisode(p1, c1, 1);
  const [row1] = await db.select().from(PDE).where(eq(PDE.id, e1));
  check(!!row1, "١. الحلقة أُنشئت");
  same("وحالتها الافتراضية «بانتظار معاينة»", row1.status, "awaiting_exam");
  same("وسعرها المتفق عليه صفر", row1.agreedCost, 0);
  same("وتسلسلها ١", row1.sequenceNumber, 1);
  same("ومرتبطة بخيطها", row1.caseId, c1);
  check(row1.deliveredAt === null && row1.cancelledAt === null, "وبلا تسليم ولا إلغاء");

  // ══ ٢. التسلسل فريد داخل الخيط ════════════════════════════════════════
  const dupSeq = await refused(() => mkEpisode(p1, c1, 1, "delivered"));
  check(!!dupSeq && /uq_pde_case_seq|duplicate key/.test(dupSeq),
    "٢. وتسلسلٌ مكرَّر في الخيط نفسه مرفوض", String(dupSeq));

  // ══ ٣. شراءٌ مفتوحٌ واحد لكل خيط ══════════════════════════════════════
  const dupOpen = await refused(() => mkEpisode(p1, c1, 2, "examined"));
  check(!!dupOpen && /uq_pde_case_open|duplicate key/.test(dupOpen),
    "٣. **وحلقة مفتوحة ثانية لنفس الخيط مرفوضة**", String(dupOpen));

  // ══ ٤. وبعد التسليم يُفتح غيرها ═══════════════════════════════════════
  await db.update(PDE).set({ status: "delivered", deliveredAt: new Date() }).where(eq(PDE.id, e1));
  const e2 = await mkEpisode(p1, c1, 2);
  check(e2 > 0, "٤. وبعد التسليم تُفتَح حلقة ثانية");
  same("بتسلسلها الثاني",
    (await db.select().from(PDE).where(eq(PDE.id, e2)))[0].sequenceNumber, 2);
  // وثالثةٌ مفتوحة ما زالت مرفوضة — القيد يقيس المفتوح لا العدد.
  const third = await refused(() => mkEpisode(p1, c1, 3));
  check(!!third, "وثالثةٌ مفتوحة ما زالت مرفوضة", String(third));
  // والملغاة لا تحجز المكان كذلك.
  await db.update(PDE).set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "عدل المريض" }).where(eq(PDE.id, e2));
  const e3 = await mkEpisode(p1, c1, 3);
  check(e3 > 0, "والملغاة لا تحجز المكان");

  // ══ ٥. الحالة من قائمة مغلقة ══════════════════════════════════════════
  console.log("\n── القيود ──");
  const badStatus = await refused(() => pool.query(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status)
     VALUES ($1,$2,1,99,'in_progress')`, [p1, c1]));
  check(!!badStatus && /status_check|check constraint/.test(badStatus),
    "٥. **وحالةٌ خارج القائمة ترفضها القاعدة**", String(badStatus));
  for (const st of ["awaiting_exam", "examined", "in_manufacturing", "delivered", "cancelled"]) {
    const c = await mkCase(await mkPatient(`مريض ${st}`), "prosthetic");
    const okStatus = await refused(() => pool.query(
      `INSERT INTO patient_device_episodes (patient_id, case_id, sequence_number, status)
       VALUES ((SELECT patient_id FROM patient_cases WHERE id = $1), $1, 1, $2)`, [c, st]));
    check(okStatus === null, `والحالة «${st}» مقبولة`, String(okStatus));
  }

  // ══ ٦. الأعمدة الخمسة اختيارية — الإنتاج القائم لا يتأثّر ═════════════
  console.log("\n── الأعمدة الخمسة اختيارية ──");
  const pNull = await mkPatient("مريض بلا حلقات");
  const cNull = await mkCase(pNull);
  const { rows: woNull } = await pool.query<{ id: number; device_episode_id: number | null }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, assigned_by)
     VALUES ($1,1,$2,'prosthetic','active','order_received',$2) RETURNING id, device_episode_id`, [pNull, EXPERT]);
  same("٦. أمر تصنيع بلا حلقة يُنشأ كما كان", woNull[0].device_episode_id, null);
  const { rows: payNull } = await pool.query<{ device_episode_id: number | null }>(
    `INSERT INTO payments (patient_id, branch_id, amount, case_id) VALUES ($1,1,1000,$2) RETURNING device_episode_id`, [pNull, cNull]);
  same("ودفعة بلا حلقة", payNull[0].device_episode_id, null);
  const { rows: visNull } = await pool.query<{ device_episode_id: number | null }>(
    `INSERT INTO visits (patient_id, branch_id, case_id) VALUES ($1,1,$2) RETURNING device_episode_id`, [pNull, cNull]);
  same("وزيارة بلا حلقة", visNull[0].device_episode_id, null);
  const { rows: costNull } = await pool.query<{ device_episode_id: number | null }>(
    `INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,1,1000,'manual') RETURNING device_episode_id`, [pNull]);
  same("وقيد كلفة بلا حلقة", costNull[0].device_episode_id, null);
  const { rows: exNull } = await pool.query<{ device_episode_id: number | null }>(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name)
     VALUES ($1,$2,'prosthetic',1,$3,'د. تجربة') RETURNING device_episode_id`, [pNull, cNull, MANAGER]);
  same("ومعاينة بلا حلقة", exNull[0].device_episode_id, null);

  // ══ ٧-١١. وكلٌّ منها يستطيع أن يشير إلى حلقة ══════════════════════════
  console.log("\n── الإشارة إلى الحلقة ──");
  const pLink = await mkPatient("مريض الروابط");
  const cLink = await mkCase(pLink);
  const eLink = await mkEpisode(pLink, cLink, 1, "in_manufacturing");
  const { rows: woL } = await pool.query<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, assigned_by, device_episode_id)
     VALUES ($1,1,$2,'prosthetic','active','order_received',$2,$3) RETURNING id`, [pLink, EXPERT, eLink]);
  same("٧. أمر التصنيع يشير إلى حلقته",
    (await db.select().from(WO).where(eq(WO.id, woL[0].id)))[0].deviceEpisodeId, eLink);
  await pool.query(`INSERT INTO payments (patient_id, branch_id, amount, case_id, device_episode_id) VALUES ($1,1,500000,$2,$3)`, [pLink, cLink, eLink]);
  same("٨. والدفعة",
    (await db.select().from(payments).where(eq(payments.patientId, pLink)))[0].deviceEpisodeId, eLink);
  await pool.query(`INSERT INTO visits (patient_id, branch_id, case_id, device_episode_id) VALUES ($1,1,$2,$3)`, [pLink, cLink, eLink]);
  same("٩. والزيارة",
    (await db.select().from(visits).where(eq(visits.patientId, pLink)))[0].deviceEpisodeId, eLink);
  await pool.query(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, device_episode_id) VALUES ($1,1,500000,'assign_manufacturing',$2)`, [pLink, eLink]);
  same("١٠. وقيد الكلفة",
    (await db.select().from(costEntries).where(eq(costEntries.patientId, pLink)))[0].deviceEpisodeId, eLink);
  await pool.query(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, device_episode_id)
     VALUES ($1,$2,'prosthetic',1,$3,'د. تجربة',$4)`, [pLink, cLink, MANAGER, eLink]);
  same("١١. والمعاينة تخزّنه **بلا مفتاح أجنبي**",
    (await db.select().from(medicalExams).where(eq(medicalExams.patientId, pLink)))[0].deviceEpisodeId, eLink);
  // والفرق مُثبَت: رقمٌ لا يملكه أحد يُقبَل في المعاينة ويُرفَض في الأمر.
  // مريضٌ نظيف: حارس «أمرٌ نشط واحد لكل خدمة» كان سيسبق المفتاح الأجنبي
  // على `pLink` فيقيس الاختبارُ قيداً آخر غير الذي وُضع له.
  const ghost = 2_000_000_000;
  const pGhost = await mkPatient("مريض الرقم اليتيم");
  const cGhost = await mkCase(pGhost);
  const examGhost = await refused(() => pool.query(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, device_episode_id)
     VALUES ($1,$2,'prosthetic',1,$3,'د. تجربة',$4)`, [pGhost, cGhost, MANAGER, ghost]));
  check(examGhost === null, "ورقمٌ يتيم يُقبَل فيها — لقطةٌ لا علاقة", String(examGhost));
  const woGhost = await refused(() => pool.query(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, assigned_by, device_episode_id)
     VALUES ($1,1,$2,'prosthetic','active','order_received',$2,$3)`, [pGhost, EXPERT, ghost]));
  check(!!woGhost && /foreign key/.test(woGhost), "**ويُرفَض في الأمر — مفتاحٌ حقيقي**", String(woGhost));
  // وحذف حلقةٍ لها تابع يفشل — NO ACTION لا كاسكيد صامت.
  const orphan = await refused(() => pool.query(`DELETE FROM patient_device_episodes WHERE id = $1`, [eLink]));
  check(!!orphan && /foreign key/.test(orphan), "وحذف حلقةٍ لها تابع يفشل — لا تفريغ صامت", String(orphan));

  // ══ ١٢. **حذف المريض الكامل** — الخطر الأول ═══════════════════════════
  console.log("\n── حذف المريض بالسلسلة الثلاثية ──");
  const pDel = await mkPatient("مريض الحذف الكامل");
  const cDel = await mkCase(pDel);
  const eDel = await mkEpisode(pDel, cDel, 1, "in_manufacturing");
  const { rows: woDel } = await pool.query<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, assigned_by, device_episode_id)
     VALUES ($1,1,$2,'prosthetic','active','manufacturing',$2,$3) RETURNING id`, [pDel, EXPERT, eDel]);
  await pool.query(
    `INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, performed_by)
     VALUES ($1,'created',NULL,'order_received',$2)`, [woDel[0].id, EXPERT]);
  await pool.query(
    `INSERT INTO prosthetic_rework_events (work_order_id, rework_type, reason_code, stage_when_detected, created_by)
     VALUES ($1,'technical','fit_issue','ready_for_fitting',$2)`, [woDel[0].id, EXPERT]);
  await pool.query(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name, device_episode_id)
     VALUES ($1,$2,'prosthetic',1,$3,'د. تجربة',$4)`, [pDel, cDel, MANAGER, eDel]);
  await pool.query(`INSERT INTO payments (patient_id, branch_id, amount, case_id, device_episode_id) VALUES ($1,1,750000,$2,$3)`, [pDel, cDel, eDel]);
  await pool.query(`INSERT INTO visits (patient_id, branch_id, case_id, device_episode_id) VALUES ($1,1,$2,$3)`, [pDel, cDel, eDel]);
  await pool.query(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, device_episode_id) VALUES ($1,1,750000,'assign_manufacturing',$2)`, [pDel, eDel]);

  const before = (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_device_episodes WHERE patient_id = $1`, [pDel])).rows[0].n;
  same("للمريض حلقة قبل الحذف", before, 1);
  let delErr: any = null;
  try { await storage.deletePatient(pDel); } catch (e) { delErr = e; }
  check(delErr === null, "**١٢. حذف المريض نجح بلا خطأ مفتاح أجنبي**", String(delErr));
  for (const [table, label] of [
    ["patient_device_episodes", "الحلقات"], ["patient_cases", "الحالات"],
    ["prosthetic_work_orders", "الأوامر"], ["cost_entries", "القيود"],
    ["payments", "الدفعات"], ["visits", "الزيارات"], ["medical_exams", "المعاينات"],
    ["patients", "المريض"],
  ] as [string, string][]) {
    const col = table === "patients" ? "id" : "patient_id";
    const n = (await pool.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${col} = $1`, [pDel])).rows[0].n;
    same(`ولا صفّ باقٍ في ${label}`, n, 0);
  }

  // ══ ١٣-١٦. الدمج ═════════════════════════════════════════════════════
  console.log("\n── الدمج وإعادة الترقيم ──");
  const src = await mkPatient("ملفّ مكرّر");
  const dst = await mkPatient("الملفّ الأصلي");
  const cSrc = await mkCase(src, "prosthetic");
  const cSrcSup = await mkCase(src, "medical_support");
  const cDst = await mkCase(dst, "prosthetic");
  // الهدف يحمل «#١» و«#٢» بالفعل ⇒ تصادمٌ حتمي لو نُقل تسلسل المصدر كما هو.
  await mkEpisode(dst, cDst, 1, "delivered");
  await mkEpisode(dst, cDst, 2, "delivered");
  const sEp1 = await mkEpisode(src, cSrc, 1, "delivered");
  const sEp2 = await mkEpisode(src, cSrc, 2, "in_manufacturing");
  const sEpSup = await mkEpisode(src, cSrcSup, 1, "delivered");
  // تابعٌ على حلقة المصدر — يجب أن يبقى مرتبطاً بها بعد الدمج بلا لمسة.
  const { rows: woSrc } = await pool.query<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, assigned_by, device_episode_id)
     VALUES ($1,1,$2,'prosthetic','completed','delivered',$2,$3) RETURNING id`, [src, EXPERT, sEp1]);
  await pool.query(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, device_episode_id) VALUES ($1,1,1000000,'assign_manufacturing',$2)`, [src, sEp1]);

  let mergeErr: any = null;
  try { await storage.mergePatients(src, dst); } catch (e) { mergeErr = e; }
  check(mergeErr === null, "١٣. الدمج نجح", String(mergeErr));

  const moved = await db.select().from(PDE).where(eq(PDE.patientId, dst));
  same("وكل الحلقات صارت على الهدف", moved.length, 5);
  same("ولا حلقة بقيت على المصدر",
    (await db.select().from(PDE).where(eq(PDE.patientId, src))).length, 0);

  // ١٤. إعادة الترقيم بلا تصادم، وبترتيب المصدر القديم.
  const dstCases = await db.select().from(patientCases).where(eq(patientCases.patientId, dst));
  const dstPros = dstCases.find((c) => c.caseType === "prosthetic")!;
  const dstSup = dstCases.find((c) => c.caseType === "medical_support")!;
  const prosSeq = moved.filter((e) => e.caseId === dstPros.id).map((e) => e.sequenceNumber).sort((a, b) => a - b);
  same("١٤. أربع حلقات أطراف بتسلسلٍ متّصل بلا تصادم", prosSeq, [1, 2, 3, 4]);
  same("والمنقولتان أخذتا ٣ ثم ٤ بترتيب المصدر", [
    moved.find((e) => e.id === sEp1)!.sequenceNumber,
    moved.find((e) => e.id === sEp2)!.sequenceNumber,
  ], [3, 4]);

  // ١٦. وحلقة المسند ذهبت إلى حالة **المسند** في الهدف لا الأطراف.
  same("١٦. وحلقة المسند إلى خيط المسند في الهدف",
    moved.find((e) => e.id === sEpSup)!.caseId, dstSup.id);
  same("وتسلسلها ١ — خيطٌ فارغ عند الهدف",
    moved.find((e) => e.id === sEpSup)!.sequenceNumber, 1);

  // ١٥. **التوابع لم تُلمَس**: المعرّف ثابت، فالرابط صحيح بلا إعادة ربط.
  same("١٥. أمر التصنيع ما زال على الحلقة نفسها",
    (await db.select().from(WO).where(eq(WO.id, woSrc[0].id)))[0].deviceEpisodeId, sEp1);
  same("وقيد الكلفة كذلك",
    (await db.select().from(costEntries).where(eq(costEntries.deviceEpisodeId, sEp1))).length, 1);
  // والمعرّفات نفسها لم تتغيّر إطلاقاً.
  same("ومعرّفات الحلقات لم تتغيّر",
    [sEp1, sEp2, sEpSup].every((id) => moved.some((e) => e.id === id)), true);

  // ══ ١٧. ولا رقم تاريخي أُعيد حسابه ═══════════════════════════════════
  console.log("\n── لا ترحيل ولا مال ──");
  const { rows: anyEpisodeInProd } = await pool.query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM patient_device_episodes
      WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
  same("١٧. ولا حلقة أُنشئت لأي صفٍّ خارج هذا الاختبار", anyEpisodeInProd[0].n, 0);
  const { rows: linked } = await pool.query<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM prosthetic_work_orders WHERE device_episode_id IS NOT NULL
               AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}'))
          + (SELECT COUNT(*) FROM payments WHERE device_episode_id IS NOT NULL
               AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}'))
          + (SELECT COUNT(*) FROM visits WHERE device_episode_id IS NOT NULL
               AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}'))
          + (SELECT COUNT(*) FROM cost_entries WHERE device_episode_id IS NOT NULL
               AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}'))
          + (SELECT COUNT(*) FROM medical_exams WHERE device_episode_id IS NOT NULL
               AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}'))
          AS n`);
  same("**ولا صفّ قائم رُبِط بحلقة — بلا ترحيل بيانات إطلاقاً**", Number(linked[0].n), 0);

  // ══ ولا كاتب واحد في الإنتاج ═════════════════════════════════════════
  const { readFileSync, readdirSync } = await import("fs");
  const { join } = await import("path");
  const roots = ["server", "client/src", "shared"];
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules") walk(full); }
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) files.push(full);
    }
  };
  for (const r of roots) walk(r);
  const writers = files.filter((f) => {
    const src = readFileSync(f, "utf8");
    return /insert\(\s*patientDeviceEpisodes|INSERT INTO patient_device_episodes/i.test(src);
  });
  same("**ولا كاتب واحد للحلقات في شيفرة الإنتاج** — أساسٌ بلا سلوك", writers, []);
  const migrationText = readFileSync("server/migrations/049_patient_device_episodes.ts", "utf8");
  check(!/\bUPDATE\s+(payments|visits|cost_entries|patients|patient_cases|prosthetic_work_orders|medical_exams)\b/i.test(migrationText),
    "**والهجرة لا تحدّث صفّاً واحداً — لا مبلغ ولا ربط**");
  check(!/INSERT\s+INTO/i.test(migrationText), "ولا تُدرج صفّاً واحداً");
  // ولا علامة اقتباس خلفية داخل نصّ SQL — فخٌّ وقع فيه هذا المشروع مرّتين:
  // العلامة تُنهي القالب النصّي، فيفشل الملفّ عند التحويل لا عند التشغيل،
  // والرسالة لا تدلّ على السبب. الحارس أرخص من اكتشافه في النشر.
  const sqlBody = migrationText.split("export const sql = " + "`")[1]?.split("`;")[0] ?? "";
  check(sqlBody.length > 500, "ونصّ الهجرة مقروء", String(sqlBody.length));
  same("**ولا علامة اقتباس خلفية داخل نصّ الهجرة**", (sqlBody.match(/`/g) ?? []).length, 0);

  await cleanup();
  await pool.query(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[EXPERT, MANAGER]]);
  await pool.query(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[EXPERT, MANAGER]]);
  console.log(failures === 0 ? "\n✅ all device-episode cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
