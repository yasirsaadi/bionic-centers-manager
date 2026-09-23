// التراجعُ عن «إلغاء العملية بالكامل» الذي وقع بالخطأ — حيّاً على Postgres.
//
// ══ الواقعة ═══════════════════════════════════════════════════════════
// ألغى المسؤولُ عمليةَ مريضٍ بالكامل وأجاب «نعم» على سؤال «هل تم إرجاع
// المبلغ؟» بلا أن يكون المالُ قد رُدّ فعلاً — فخرج من النظام ٣٠٠ ألفاً
// ورقاً لا نقداً، وبطل أمرُ التصنيع.
//
// ما يحرسه هذا الملفّ: سكربتُ التراجع يعيد الملفَّ إلى حالته **قبل**
// الضغطة بالضبط — بمقارنة بصمةٍ كاملة قبل وبعد، لا بوصف.

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";

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

const PORT = 6893;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تراجع-الإلغاء";
const ADMIN = 9931, RECV = 9932, MGR = 9933, DOC = 9934, EXPERT = 9935;

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true,
      canViewPayments: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true,
      canViewPayments: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين",
    permissions: { canViewPatients: true, canWriteMedicalExam: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** البصمةُ الكاملة — كلُّ ما يجب أن يعود كما كان. */
async function shape(patientId: number) {
  const eps = await q(`SELECT id, sequence_number, status, agreed_cost::int AS cost,
      requested_item, admin_void_reversal_id, cancelled_at, cancel_reason, service_path
      FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const fus = await q(`SELECT id, status, device_episode_id, converted_work_order_id,
      approved_price::int AS price, closed_reason, closed_at
      FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const wos = await q(`SELECT id, status, current_stage, device_episode_id, expert_user_id,
      admin_void_reversal_id, hold_reason_code, hold_note
      FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const cases = await q(`SELECT id, case_type, cost::int AS cost, status
      FROM patient_cases WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const entries = await q(`SELECT amount::int AS amount, source, case_id
      FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const pays = await q(`SELECT id, amount::int AS amount, notes, case_id, device_episode_id
      FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const cancels = await q(`SELECT exam_id, reason FROM medical_exam_cancellations
      WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const revs = await q(`SELECT id, mode FROM administrative_operation_reversals
      WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const events = await q(`SELECT event_type, from_status, to_status
      FROM post_exam_followup_events WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const jl = await q(`SELECT je.id, je.source_type, je.source_id, je.total_amount::int AS amt,
      (SELECT COUNT(*)::int FROM journal_lines l WHERE l.entry_id=je.id) AS lines
      FROM journal_entries je
      WHERE je.source_type='payment'
        AND je.source_id IN (SELECT id FROM payments WHERE patient_id=$1)
      ORDER BY je.id`, [patientId]);
  return { eps, fus, wos, total: p?.total ?? 0, cases, entries, pays, cancels, revs, events, jl };
}

async function cleanup() {
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT je.id FROM journal_entries je WHERE je.source_type='payment'
              AND je.source_id IN (SELECT id FROM payments WHERE patient_id IN
                (SELECT id FROM patients WHERE name LIKE $1)))`, [`${MARK}%`]);
  await q(`DELETE FROM journal_entries WHERE source_type='payment'
             AND source_id IN (SELECT id FROM payments WHERE patient_id IN
               (SELECT id FROM patients WHERE name LIKE $1))`, [`${MARK}%`]);
  const pts = await q<{ id: number }>(`SELECT id FROM patients WHERE name LIKE $1`, [`${MARK}%`]);
  for (const { id } of pts) {
    await q(`UPDATE patients SET deleted_at=NULL WHERE id=$1`, [id]);
    await http("DELETE", `/api/patients/${id}`, S.admin).catch(() => null);
  }
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"],
    [RECV, "reception", "استعلامات", "[]"],
    [MGR, "branch_manager", "مدير الفرع", "[]"],
    [DOC, "doctor", "د. المعاين", '["prosthetic"]'],
    [EXPERT, "prosthetics_expert", "الخبير", "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true,
               medical_specialties=EXCLUDED.medical_specialties`,
      [id, `ur_u${id}`, name, role, spec]);
  }
  //  دليلُ حسابات يكفي لقيد الاسترجاع — وإلّا لم يُكتب قيدٌ أصلاً فلا يُختبَر حذفُه.
  await q(`INSERT INTO chart_of_accounts (account_code, account_name_ar, account_type,
             branch_id, is_active, normal_balance)
           VALUES ('1111','صندوق بغداد','asset',1,true,'debit')
           ON CONFLICT DO NOTHING`);
  for (const code of ["4100", "4200", "4300", "4900"]) {
    await q(`INSERT INTO chart_of_accounts (account_code, account_name_ar, account_type,
               branch_id, is_active, normal_balance)
             VALUES ($1,'إيراد '||$1,'revenue',NULL,true,'credit')
             ON CONFLICT DO NOTHING`, [code]);
  }

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session-b64"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const server = createServer(app);
  await registerRoutes(server as any, app as any);
  (app as any).use = realUse;
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));
  await cleanup();

  const PRICE = 1_000_000, PAID = 300_000;

  // ── بناءُ العملية: طلبٌ ⟶ معاينة ⟶ خبير ⟶ شراء ⟶ أمرُ تصنيع ⟶ دفعة ──
  const [{ id: patientId }] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',1,true,false,0,'past') RETURNING id`,
    [`${MARK} عبدالله`, MARK]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,1,'prosthetic',0,'manual','active')`, [patientId]);
  const epRow = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR, requestedItem: "full_device" as any,
  });
  const episodeId = Number((epRow as any).id ?? epRow);
  const ex = await http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(),
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
  });
  check(ex.status < 300, "أ١ · وُقّعت المعاينة", JSON.stringify(ex.body));
  await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
    [ex.body?.id, PRICE]);
  const fl = await http("GET", `/api/followups/patient/${patientId}`, S.admin);
  const f = (Array.isArray(fl.body) ? fl.body : [])[0];
  await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
  const buy = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
  check(buy.status === 200, "أ٢ · تمّ الشراء وفُتح أمرُ التصنيع", JSON.stringify(buy.body));
  const pay = await http("POST", "/api/payments", S.recv, {
    patientId, branchId: 1, amount: PAID, paymentTreatmentType: "أطراف صناعية",
    notes: "دفعة أولى", deviceEpisodeId: episodeId,
  });
  check(pay.status < 300, "أ٣ · سُجّلت دفعةُ ٣٠٠ ألف", JSON.stringify(pay.body));

  const before = await shape(patientId);
  check(before.wos.length === 1 && before.wos[0].status !== "cancelled",
    "أ٤ · أمرُ التصنيع قائمٌ قبل الخطأ", JSON.stringify(before.wos));
  check(before.pays.length === 1 && before.pays[0].amount === PAID,
    "أ٥ · دفعةٌ واحدة موجبة قبل الخطأ", JSON.stringify(before.pays));

  // ── ب · الخطأ يقع: إلغاءُ العملية بالكامل مع «نعم، رُدّ المبلغ» ──────
  const pv = await http("POST", "/api/admin/operation-reversal/preview", S.admin,
    { followupId: f.id });
  check(pv.status === 200, "ب١ · المعاينة قبل التنفيذ", JSON.stringify(pv.body));
  check(Number(pv.body?.paidAmount) === PAID, "ب٢ · المعاينة تقول المقبوض ٣٠٠ ألف",
    JSON.stringify(pv.body?.paidAmount));
  const ex1 = await http("POST", "/api/admin/operation-reversal/execute", S.admin, {
    followupId: f.id, intent: "cancel_operation",
    reasonNote: "عمليتان بالخطأ", refundAnswer: "yes", stateStamp: pv.body?.stateStamp,
  });
  check(ex1.status === 200, "ب٣ · وقع الإلغاء", JSON.stringify(ex1.body));
  const reversalId = Number(ex1.body?.reversalId);
  check(Number(ex1.body?.refundedAmount) === PAID, "ب٤ · رُدّ ٣٠٠ ألف بالخطأ",
    JSON.stringify(ex1.body?.refundedAmount));

  const broken = await shape(patientId);
  check(broken.wos[0].status === "cancelled" && broken.wos[0].admin_void_reversal_id === reversalId,
    "ب٥ · أمرُ التصنيع صار ملغىً", JSON.stringify(broken.wos));
  check(broken.pays.length === 2 && broken.pays[1].amount === -PAID,
    "ب٦ · دخل صفُّ استرجاعٍ سالب", JSON.stringify(broken.pays));
  check(broken.jl.some((j: any) => j.amt === PAID && j.source_id === broken.pays[1].id),
    "ب٧ · كُتب قيدُ يوميةٍ للاسترجاع", JSON.stringify(broken.jl));
  check(broken.total === before.total - PRICE, "ب٨ · نقصت كلفةُ المريض",
    `${broken.total} vs ${before.total}`);
  check(broken.revs.length === 1, "ب٩ · صفُّ التصحيح موجود", JSON.stringify(broken.revs));

  // ── ج · التراجع بالسكربت ──────────────────────────────────────────
  //  يُشغَّل **بمسار الاكتشاف بالرمز** — وهو المسارُ الذي سيستعمله المالك،
  //  لا بالرقم الصريح، فيُختبَر ما يُنفَّذ فعلاً.
  const [{ code }] = await q<{ code: string }>(
    `SELECT patient_code AS code FROM patients WHERE id=$1`, [patientId]);
  const sqlText = readFileSync("undo_admin_reversal_apply.sql", "utf8")
    .replace("v_patient_code  text    := 'WB-01982';",
      `v_patient_code  text    := '${code}';`);
  let undoErr: any = null;
  try { await pool.query(sqlText); } catch (e: any) { undoErr = e; }
  check(undoErr === null, "ج١ · نُفّذ سكربتُ التراجع بلا خطأ", String(undoErr?.message ?? ""));

  const after = await shape(patientId);
  same("ج٢ · حلقاتُ الجهاز عادت كما كانت", after.eps, before.eps);
  same("ج٣ · المتابعة عادت كما كانت", after.fus, before.fus);
  same("ج٤ · أوامرُ التصنيع عادت كما كانت", after.wos, before.wos);
  same("ج٥ · كلفةُ المريض عادت", after.total, before.total);
  same("ج٦ · كلفُ الحالات عادت", after.cases, before.cases);
  same("ج٧ · قيودُ الكلفة عادت", after.entries, before.entries);
  same("ج٨ · الدفعات عادت", after.pays, before.pays);
  same("ج٩ · قيودُ اليومية عادت", after.jl, before.jl);
  same("ج١٠ · لا شهادةَ إلغاءِ معاينة", after.cancels, before.cancels);
  same("ج١١ · لا صفَّ تصحيحٍ باقٍ", after.revs, before.revs);
  same("ج١٢ · أحداثُ المتابعة عادت", after.events, before.events);

  // ── د · ما يبقى أثراً بقصد ────────────────────────────────────────
  const hist = await q(`SELECT notes FROM prosthetic_work_history
      WHERE work_order_id=$1 ORDER BY id`, [before.wos[0].id]);
  check(hist.some((h: any) => String(h.notes).includes("تراجُع إداري عن الإلغاء")),
    "د١ · سجلُّ الأمر يحمل سطرَ التراجع", JSON.stringify(hist));
  const au = await q(`SELECT action FROM audit_log
      WHERE entity_type='administrative_operation_reversal' AND entity_id=$1 ORDER BY id`,
    [reversalId]);
  same("د٢ · التدقيقُ يحمل الإنشاءَ والتراجع", au.map((a: any) => a.action), ["create", "delete"]);

  // ── هـ · التشغيلُ ثانيةً لا يفعل شيئاً ولا يفسد شيئاً ──────────────
  let secondErr: any = null;
  try { await pool.query(sqlText); } catch (e: any) { secondErr = e; }
  check(secondErr !== null && String(secondErr.message).includes("لا تصحيحَ إدارياً حديثاً"),
    "هـ١ · التشغيلُ الثاني يُردّ برسالةٍ صريحة", String(secondErr?.message ?? "لم يُردّ"));
  same("هـ٢ · والبصمةُ لم تتغيّر بعده", await shape(patientId), after);

  // ── و · نقلُ دفعةٍ بين جهازَي المريض نفسِه — لا يتحرّك دينار ────────
  //  الحاجةُ الحقيقية: أمرُ تصنيعٍ مكرَّر يحمل دفعةً، فلا يُلغى قبل أن
  //  تُنسَب دفعتُه إلى الجهاز القائم — وإلّا فرض النظامُ استرجاعَ مالٍ
  //  قُبض فعلاً. ونقطةُ تعديل الدفعة لا تغيّر الجهاز، فلا بابَ إلّا السكربت.
  const ep2 = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR, requestedItem: "full_device" as any,
  });
  const ep2Id = Number((ep2 as any).id ?? ep2);
  await q(`UPDATE patient_device_episodes SET status='in_manufacturing' WHERE id=$1`, [ep2Id]);

  const moneyBefore = await shape(patientId);
  const moveSql = readFileSync("move_payment_between_devices.sql", "utf8")
    .replace("v_patient_code  text    := 'WB-01982';", `v_patient_code  text    := '${code}';`)
    .replace("v_from_episode  integer := 257;", `v_from_episode  integer := ${episodeId};`)
    .replace("v_to_episode    integer := 258;", `v_to_episode    integer := ${ep2Id};`);
  let moveErr: any = null;
  try { await pool.query(moveSql); } catch (e: any) { moveErr = e; }
  check(moveErr === null, "و١ · نُفّذ سكربتُ النقل بلا خطأ", String(moveErr?.message ?? ""));

  const paidOn = async (id: number) => Number((await q<{ s: string }>(
    `SELECT COALESCE(SUM(amount),0)::int AS s FROM payments WHERE device_episode_id=$1`,
    [id]))[0]?.s ?? 0);
  same("و٢ · الجهازُ المصدر صار بلا مدفوع", await paidOn(episodeId), 0);
  same("و٣ · والمدفوعُ صار على الجهاز الهدف", await paidOn(ep2Id), PAID);

  const moneyAfter = await shape(patientId);
  same("و٤ · مجموعُ مبالغ الدفعات لم يتغيّر",
    moneyAfter.pays.map((x: any) => x.amount), moneyBefore.pays.map((x: any) => x.amount));
  same("و٥ · كلفةُ المريض لم تتغيّر", moneyAfter.total, moneyBefore.total);
  same("و٦ · قيودُ الدفتر لم تتغيّر", moneyAfter.entries, moneyBefore.entries);
  same("و٧ · قيودُ اليومية لم تتغيّر", moneyAfter.jl, moneyBefore.jl);
  const mvAudit = await q(`SELECT COUNT(*)::int AS n FROM audit_log
      WHERE entity_type='payment' AND notes LIKE 'نقلُ الدفعة%'
        AND entity_id IN (SELECT id FROM payments WHERE patient_id=$1)`, [patientId]);
  same("و٨ · سطرُ تدقيقٍ لكلّ دفعة منقولة", Number(mvAudit[0].n), 1);

  //  والتشغيلُ الثاني لا يجد ما ينقل فيُردّ صراحةً بلا كتابة.
  let moveTwice: any = null;
  try { await pool.query(moveSql); } catch (e: any) { moveTwice = e; }
  check(moveTwice !== null && String(moveTwice.message).includes("لا دفعةَ على الجهاز"),
    "و٩ · التشغيلُ الثاني يُردّ برسالةٍ صريحة", String(moveTwice?.message ?? "لم يُردّ"));
  same("و١٠ · والبصمةُ لم تتغيّر بعده", (await shape(patientId)).pays, moneyAfter.pays);

  // ══════════════════════════════════════════════════════════════════
  //  الأشكالُ التي **لا يجوز أن يُخمَّن فيها** — مراجعةٌ آلية على الطلب ٣٨٤
  //
  //  سطرُ التدقيق يحمل **الحالاتِ وحدها**: `orderStatus`/`episodeStatus`/
  //  `followupStatus`. ولا يحمل `closed_at`/`closed_reason` للمتابعة ولا
  //  `cancelled_at`/`cancel_reason` للحلقة. والإلغاءُ الإداريّ يكتب فوق
  //  هذين الزوجين حين يكون الصفُّ مغلقاً/ملغىً **قبله**. فإرجاعُ الحالة
  //  وتصفيرُ الزوج يُنتج صفّاً يدّعي حالةً بلا وقتها ولا سببها — وذاك
  //  تزويرٌ لا استعادة. فالسكربتُ يقف، ولا يكتب حرفاً.
  // ══════════════════════════════════════════════════════════════════
  /** يبني عمليةً كاملة (طلب ⟶ معاينة ⟶ خبير ⟶ شراء ⟶ أمر) ويُرجع هويّاتِها. */
  async function buildOperation(suffix: string) {
    const [{ id: pid }] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight,
         medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
         total_cost, patient_classification)
       VALUES ($1,'07701234567',$2,'40','172','78','بتر',
               'احادي - طرف سفلي - يمين - تحت الركبة',1,true,false,0,'past') RETURNING id`,
      [`${MARK} ${suffix}`, MARK]);
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
             VALUES ($1,1,'prosthetic',0,'manual','active')`, [pid]);
    const ep = await episodes.startDeviceEpisode({
      patientId: pid, serviceType: "prosthetic", createdBy: MGR,
      requestedItem: "full_device" as any,
    });
    const epId = Number((ep as any).id ?? ep);
    const exam = await http("POST", `/api/medical/patients/${pid}/exams`, S.doc, {
      idempotencyKey: crypto.randomUUID(),
      caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
    });
    await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
      [exam.body?.id, PRICE]);
    const list = await http("GET", `/api/followups/patient/${pid}`, S.admin);
    const fu = (Array.isArray(list.body) ? list.body : [])[0];
    await http("POST", `/api/followups/${fu.id}/expert`, S.recv, { expertUserId: EXPERT });
    await http("POST", `/api/followups/${fu.id}/confirm-purchase`, S.recv, {});
    const [{ code: pcode }] = await q<{ code: string }>(
      `SELECT patient_code AS code FROM patients WHERE id=$1`, [pid]);
    return { pid, epId, fuId: Number(fu.id), examId: Number(exam.body?.id), code: pcode };
  }

  /** يُنفّذ الإلغاءَ الكامل على متابعةٍ بعينها ويُرجع رقمَ التصحيح. */
  async function runReversal(fuId: number) {
    const pv2 = await http("POST", "/api/admin/operation-reversal/preview", S.admin,
      { followupId: fuId });
    const ex2 = await http("POST", "/api/admin/operation-reversal/execute", S.admin, {
      followupId: fuId, intent: "cancel_operation",
      reasonNote: "خطأُ إدخال", refundAnswer: "no", stateStamp: pv2.body?.stateStamp,
    });
    return { status: ex2.status, body: ex2.body, reversalId: Number(ex2.body?.reversalId) };
  }

  /** نصُّ السكربت مضبوطاً على رمزِ مريضٍ بعينه. */
  const undoFor = (code: string, operatorLine?: string) => {
    let t = readFileSync("undo_admin_reversal_apply.sql", "utf8")
      .replace("v_patient_code  text    := 'WB-01982';",
        `v_patient_code  text    := '${code}';`);
    if (operatorLine !== undefined) {
      t = t.replace("v_operator_id   integer := 0;", operatorLine);
    }
    return t;
  };

  // ── ز · متابعةٌ كانت مغلقةً قبل الإلغاء ⟶ يقف ولا يكتب ─────────────
  {
    const op = await buildOperation("متابعة-مغلقة");
    //  الشكلُ الخطر: أُغلقت المتابعةُ بسببها ووقتها، ثمّ وقع الإلغاءُ فوقها.
    await q(`UPDATE post_exam_followups
                SET status='closed_without_purchase', closed_at=NOW() - INTERVAL '2 hours',
                    closed_reason='other'
              WHERE id=$1`, [op.fuId]);
    const rev = await runReversal(op.fuId);
    check(rev.status === 200, "ز١ · وقع الإلغاءُ فوق متابعةٍ مغلقة", JSON.stringify(rev.body));
    const [fuBroken] = await q(`SELECT status, closed_reason, closed_at
        FROM post_exam_followups WHERE id=$1`, [op.fuId]);
    check(String((fuBroken as any).closed_reason) === "admin_void",
      "ز٢ · **والإلغاءُ كتب فوق سببِ الإغلاق السابق** — لا شيءَ يُستعاد منه",
      JSON.stringify(fuBroken));
    const brokenShape = await shape(op.pid);
    let err: any = null;
    try { await pool.query(undoFor(op.code)); } catch (e: any) { err = e; }
    check(err !== null && String(err.message).includes("كانت مغلقةً أصلاً"),
      "ز٣ · **السكربت يقف ويقول لماذا**", String(err?.message ?? "لم يقف"));
    same("ز٤ · **وصفرُ كتابة** — البصمةُ كما كانت بايتاً", await shape(op.pid), brokenShape);
  }

  // ── ح · حلقةٌ كانت ملغاةً قبل الإلغاء ⟶ يقف ولا يكتب ───────────────
  {
    const op = await buildOperation("حلقة-ملغاة");
    await q(`UPDATE patient_device_episodes
                SET status='cancelled', cancelled_at=NOW() - INTERVAL '3 hours',
                    cancel_reason='طلبٌ سُحب بقرارٍ سابق'
              WHERE id=$1`, [op.epId]);
    const rev = await runReversal(op.fuId);
    check(rev.status === 200, "ح١ · وقع الإلغاءُ فوق حلقةٍ ملغاة", JSON.stringify(rev.body));
    const [epBroken] = await q(`SELECT cancel_reason FROM patient_device_episodes WHERE id=$1`,
      [op.epId]);
    check(String((epBroken as any).cancel_reason).startsWith("إلغاء إداري"),
      "ح٢ · **والإلغاءُ كتب فوق سببِ الإلغاء السابق**", JSON.stringify(epBroken));
    const brokenShape = await shape(op.pid);
    let err: any = null;
    try { await pool.query(undoFor(op.code)); } catch (e: any) { err = e; }
    check(err !== null && String(err.message).includes("كانت ملغاةً أصلاً"),
      "ح٣ · **السكربت يقف ويقول لماذا**", String(err?.message ?? "لم يقف"));
    same("ح٤ · **وصفرُ كتابة** — البصمةُ كما كانت بايتاً", await shape(op.pid), brokenShape);
  }

  // ── ط · معاينةٌ كانت ملغاةً قبل الإلغاء ⟶ شهادتُها **لا تُحذَف** ────
  //  الإلغاءُ الإداريّ يتخطّى كتابةَ الشهادة حين تكون المعاينةُ ملغاةً سلفاً،
  //  فحذفٌ بمطابقة نصّ السبب كان يُعيد سلطةَ معاينةٍ سُحبت قبل الضغطة الخاطئة.
  {
    const op = await buildOperation("معاينة-ملغاة");
    await q(`INSERT INTO medical_exam_cancellations
               (exam_id, patient_id, branch_id, cancelled_by, cancelled_by_name, reason)
             VALUES ($1,$2,1,$3,'د. المعاين',$4)`,
      [op.examId, op.pid, DOC, "إلغاء إداري للعملية — سببٌ سابقٌ تماماً"]);
    const rev = await runReversal(op.fuId);
    check(rev.status === 200, "ط١ · وقع الإلغاءُ فوق معاينةٍ ملغاة", JSON.stringify(rev.body));
    const auditNew = await q<{ nv: string }>(`SELECT new_values AS nv FROM audit_log
        WHERE entity_type='administrative_operation_reversal' AND entity_id=$1
        ORDER BY id DESC LIMIT 1`, [rev.reversalId]);
    same("ط٢ · **والتدقيقُ يقول إنه لم يُنشئ شهادة**",
      JSON.parse(auditNew[0].nv).examCancelled, null);
    let err: any = null;
    try { await pool.query(undoFor(op.code)); } catch (e: any) { err = e; }
    check(err === null, "ط٣ · التراجعُ يمضي", String(err?.message ?? ""));
    const cancels = await q(`SELECT exam_id, reason FROM medical_exam_cancellations
        WHERE patient_id=$1`, [op.pid]);
    same("ط٤ · **وشهادةُ الإلغاء السابقة باقيةٌ بنصّها**",
      cancels.map((c: any) => c.reason), ["إلغاء إداري للعملية — سببٌ سابقٌ تماماً"]);
    const [fuBack] = await q(`SELECT status FROM post_exam_followups WHERE id=$1`, [op.fuId]);
    same("ط٥ · وبقيّةُ التراجع وقعت كما يجب", (fuBack as any).status, "converted");
  }

  // ── ي · التراجعُ يُنسَب لمن نفّذه لا لمن أوقع الإلغاء ───────────────
  {
    const op = await buildOperation("نسبة-الفعل");
    const rev = await runReversal(op.fuId);
    check(rev.status === 200, "ي١ · وقع الإلغاءُ بحساب المسؤول", JSON.stringify(rev.body));

    //  رقمُ حسابٍ لا وجودَ له ⟶ يُردّ قبل أوّل كتابة.
    const shapeBefore = await shape(op.pid);
    let badErr: any = null;
    try {
      await pool.query(undoFor(op.code, "v_operator_id   integer := 999777;"));
    } catch (e: any) { badErr = e; }
    check(badErr !== null && String(badErr.message).includes("لا حسابَ بالرقم"),
      "ي٢ · **رقمُ منفّذٍ لا وجودَ له يُردّ**", String(badErr?.message ?? "لم يُردّ"));
    same("ي٣ · **وصفرُ كتابة**", await shape(op.pid), shapeBefore);

    //  وبمنفّذٍ حقيقيّ: التدقيقُ وسجلُّ الأمر يحملانه هو، لا مَن ألغى.
    let err: any = null;
    try {
      await pool.query(undoFor(op.code, `v_operator_id   integer := ${MGR};`));
    } catch (e: any) { err = e; }
    check(err === null, "ي٤ · التراجعُ بمنفّذٍ صريح", String(err?.message ?? ""));
    const [au] = await q<{ uid: number; uname: string; nv: string }>(
      `SELECT user_id AS uid, user_name AS uname, new_values AS nv FROM audit_log
        WHERE entity_type='administrative_operation_reversal' AND entity_id=$1
          AND action='delete' ORDER BY id DESC LIMIT 1`, [rev.reversalId]);
    same("ي٥ · **سطرُ التدقيق يحمل رقمَ المنفّذ**", Number(au.uid), MGR);
    check(String(au.uname) === "مدير الفرع",
      "ي٦ · وباسمه هو لا باسم مَن ألغى", String(au.uname));
    same("ي٧ · ويُسمّى مَن أوقع الإلغاءَ الأصليّ صراحةً",
      JSON.parse(au.nv).originalReversalBy, "المسؤول");
    const [hist] = await q<{ pb: number; notes: string }>(
      `SELECT performed_by AS pb, notes FROM prosthetic_work_history
        WHERE notes LIKE 'تراجُع إداري عن الإلغاء%' ORDER BY id DESC LIMIT 1`);
    same("ي٨ · **وسجلُّ الأمر ينسبه للمنفّذ**", Number(hist.pb), MGR);
    check(String(hist.notes).includes("نفّذه: مدير الفرع"),
      "ي٩ · ويقول اسمَه في السطر", String(hist.notes));

    //  وبلا رقمٍ (تنفيذٌ من Console): لا يُنسَب لأحدٍ كذباً.
    const op2 = await buildOperation("بلا-منفّذ");
    const rev2 = await runReversal(op2.fuId);
    check(rev2.status === 200, "ي١٠ · عمليةٌ ثانية أُلغيت", JSON.stringify(rev2.body));
    let err2: any = null;
    try { await pool.query(undoFor(op2.code)); } catch (e: any) { err2 = e; }
    check(err2 === null, "ي١١ · التراجعُ بلا رقمِ منفّذ", String(err2?.message ?? ""));
    const [au2] = await q<{ uid: number | null; uname: string }>(
      `SELECT user_id AS uid, user_name AS uname FROM audit_log
        WHERE entity_type='administrative_operation_reversal' AND entity_id=$1
          AND action='delete' ORDER BY id DESC LIMIT 1`, [rev2.reversalId]);
    same("ي١٢ · **لا رقمَ مستخدمٍ يُلفَّق**", au2.uid, null);
    check(String(au2.uname).includes("تدخّلٌ يدويّ"),
      "ي١٣ · والاسمُ يقول إنه تدخّلٌ يدويّ", String(au2.uname));
  }

  await cleanup();
  server.close();
  await pool.end();
  console.log(failures === 0 ? "\n🎉 كل الفحوص نجحت" : `\n❌ ${failures} فحصاً فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
