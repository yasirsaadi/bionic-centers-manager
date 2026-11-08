//  **«تصحيح سعر البيع» بعد إتمامه** (§4.ge — واقعةُ بيداء كريم محمد، ٢٠٢٦-١١-٠٨).
//
//  سُجّل البيعُ ١٩٬٠٠٠٬٠٠٠ بخصم ٧٬٠٠٠٬٠٠٠ (= ١٢٬٠٠٠٬٠٠٠) وبدأ التصنيع، والصحيحُ ٤٬٣٥٠٬٠٠٠ بخصم ٣٥٠٬٠٠٠ (= ٤٬٠٠٠٬٠٠٠). وقراراتُ المالك:
//  للمسؤول ومدير الفرع، والدفعُ الزائد لا يمنع (رصيدٌ يُستردّ بطلب استرجاع)، ويُسمح بعد التسليم بسببٍ مكتوب.
//  يثبت على النقاط الحقيقية أن المواضعَ كلَّها تتحرّك معاً (المتابعة بأصليّها وخصمها · الحلقة · كلفةُ الخيط · مجموعُ المريض · قيدٌ موقَّع
//  بهويّة الجهاز · الحدث · التدقيق) وأن أمرَ التصنيع وخبيرَه باقيان، وكلَّ حارس.
//
//  حيٌّ على Postgres. التشغيل: `DATABASE_URL=… npm run test:sale-price-correction`
import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import crypto from "node:crypto";
import { registerRoutes } from "./routes";
import { followupEventView } from "@shared/followup_events";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
const pool = new Pool({ connectionString: DBURL });

const SALE_SPECS_TEST = {
  prostheticType: "طرف تحت الركبة", socketType: "كاربون درجة أولى", kneeJointType: "لا ينطبق",
  footType: "أحادية المحور", siliconType: "لا ينطبق", supportType: "مسند اختبار",
};

const PORT = 6061 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تصحيح-سعر-البيع";
const ADMIN = 99710, RECV = 99711, MGR = 99712, MGR2 = 99713, DOC = 99714, EXPERT = 99715;
const ALL_USERS = [ADMIN, RECV, MGR, MGR2, DOC, EXPERT];

let failures = 0, passes = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (cond) { passes++; console.log(`✅  ${msg}`); }
  else { failures++; console.log(`❌ FAIL  ${msg}${detail ? `\n      ${detail}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(expected);
  check(g === e, msg, g === e ? "" : `expected: ${e}\n      got:      ${g}`);
}

const perms = { canViewPatients: true, canAddPatients: true, canEditPatients: true };
const S = {
  admin: { userId: ADMIN, userName: "المسؤول", displayName: "المسؤول", branchId: 1, isAdmin: true, role: "admin", accessibleBranches: [1, 2], permissions: perms },
  recv: { userId: RECV, userName: "استعلامات", displayName: "استعلامات", branchId: 1, isAdmin: false, role: "reception", accessibleBranches: [1], permissions: perms },
  mgr: { userId: MGR, userName: "مدير الفرع", displayName: "مدير الفرع", branchId: 1, isAdmin: false, role: "branch_manager", accessibleBranches: [1], permissions: perms },
  mgr2: { userId: MGR2, userName: "مدير فرع آخر", displayName: "مدير فرع آخر", branchId: 2, isAdmin: false, role: "branch_manager", accessibleBranches: [2], permissions: perms },
  doc: { userId: DOC, userName: "د. المعاين", displayName: "د. المعاين", branchId: 1, isAdmin: false, role: "doctor", accessibleBranches: [1], permissions: { ...perms, canWriteMedicalExam: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* بلا جسم */ }
  return { status: res.status, body: json };
}

/** مريضٌ ⟶ طلبُ جهاز ⟶ معاينةٌ موقّعة ⟶ متابعة. ويُباع إن طُلب سعر. */
async function operation(label: string, sale?: { original: number; discount: number }) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - فوق الركبة', 1, true,false,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK]);
  const [c] = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [p.id]);
  const ep = await http("POST", `/api/patients/${p.id}/device-episodes`, S.recv,
    { serviceType: "prosthetic", servicePath: "exam" });
  if (ep.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${JSON.stringify(ep)}`);
  const ex = await http("POST", `/api/medical/patients/${p.id}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(), caseType: "prosthetic",
    diagnosis: "طرف مقفول مع قدم متحركة", prescription: {}, deviceEpisodeId: Number(ep.body.id),
  });
  if (ex.status >= 300) throw new Error(`فشل التوقيع: ${JSON.stringify(ex)}`);
  const [fu] = await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE medical_exam_id=$1`, [Number(ex.body.id)]);
  let workOrderId: number | null = null;
  if (sale) {
    const r = await http("POST", `/api/followups/${fu.id}/complete-sale`, S.recv, {
      deviceSpecs: SALE_SPECS_TEST, originalPrice: sale.original, discountAmount: sale.discount, expertUserId: EXPERT,
    });
    if (r.status >= 300) throw new Error(`فشل البيع: ${JSON.stringify(r)}`);
    workOrderId = Number(r.body?.workOrderId);
  }
  return { patientId: p.id, caseId: c.id, episodeId: Number(ep.body.id), followupId: Number(fu.id), workOrderId };
}

async function moneyOf(op: { patientId: number; caseId: number; episodeId: number; followupId: number }) {
  const [f] = await q(`SELECT status, approved_price::int a, original_price::int o, price_kind k FROM post_exam_followups WHERE id=$1`, [op.followupId]);
  const [e] = await q(`SELECT status, agreed_cost::int c FROM patient_device_episodes WHERE id=$1`, [op.episodeId]);
  const [cs] = await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [op.caseId]);
  const [pt] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [op.patientId]);
  const [le] = await q(`SELECT COALESCE(SUM(amount),0)::int s FROM cost_entries WHERE patient_id=$1`, [op.patientId]);
  const [wo] = await q(`SELECT count(*)::int n, max(status) s FROM prosthetic_work_orders WHERE patient_id=$1`, [op.patientId]);
  return {
    followup: [f.status, f.a, f.o, f.k], episode: [e.status, e.c], caseCost: cs.c, total: pt.t, ledger: le.s,
    orders: [wo.n, wo.s],
  };
}
const correct = (fid: number, session: any, body: any) =>
  http("POST", `/api/followups/${fid}/correct-sale-price`, session, body);

async function pay(op: { patientId: number; caseId: number }, amount: number) {
  await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id, payment_treatment_type, notes)
           VALUES ($1,1,$2,$3,'prosthetic','اختبار')`, [op.patientId, amount, op.caseId]);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const stmt of [
    `DELETE FROM audit_log WHERE user_id = ANY(ARRAY[${ALL_USERS.join(",")}])`,
    `UPDATE patient_device_episodes SET admin_void_reversal_id = NULL WHERE patient_id IN (${ids})`,
    `DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_events WHERE patient_id IN (${ids})`,
    `DELETE FROM staff_notification_outbox WHERE link_path LIKE '/patients/%' AND text LIKE '%${MARK}%'`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM journal_entries WHERE id IN (SELECT entry_id FROM journal_lines WHERE patient_id IN (${ids}))`,
    `DELETE FROM journal_lines WHERE patient_id IN (${ids})`,
    `DELETE FROM installment_plans WHERE patient_id IN (${ids})`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
    `DELETE FROM patient_code_aliases a WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`,
  ]) { try { await q(stmt); } catch { /* جدولٌ غيرُ موجودٍ في هذه النسخة */ } }
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, spec] of [
    [ADMIN, "admin", "المسؤول", 1, "[]"],
    [RECV, "reception", "استعلامات", 1, "[]"],
    [MGR, "branch_manager", "مدير الفرع", 1, "[]"],
    [MGR2, "branch_manager", "مدير فرع آخر", 2, "[]"],
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "عناد نجم", 1, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name, medical_specialties=EXCLUDED.medical_specialties`,
      [id, `spc_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", r));

  try {
    // ══ أ) واقعةُ بيداء بعينها ══════════════════════════════════════════
    console.log("\n── أ) ١٩ مليوناً بخصم ٧ ⟶ ٤٬٣٥٠٬٠٠٠ بخصم ٣٥٠٬٠٠٠ ──");
    const A = await operation("بيداء", { original: 19_000_000, discount: 7_000_000 });
    await pay(A, 2_000_000);
    const before = await moneyOf(A);
    same("أ٠. البيعُ كما سُجّل: ١٢ مليوناً في كلّ موضع وأمرُ تصنيعٍ قائم",
      [before.followup, before.episode[1], before.caseCost, before.total, before.ledger, before.orders[0]],
      [["converted", 12_000_000, 19_000_000, "discount"], 12_000_000, 12_000_000, 12_000_000, 12_000_000, 1]);
    const cardMgr = (await http("GET", `/api/followups/patient/${A.patientId}`, S.mgr)).body?.[0];
    const cardRecv = (await http("GET", `/api/followups/patient/${A.patientId}`, S.recv)).body?.[0];
    same("أ١. البطاقةُ تعرض الزرَّ لمدير الفرع ولا تعرضه للاستعلامات",
      [cardMgr?.mayCorrectSalePrice, cardRecv?.mayCorrectSalePrice], [true, false]);
    const r = await correct(A.followupId, S.mgr, {
      originalPrice: 4_350_000, discountAmount: 350_000, reason: "سُجّل السعر خطأً عند إتمام البيع",
    });
    same("أ٢. مديرُ الفرع يصحّح (٢٠٠) والفرقُ −٨ ملايين ولا رصيدَ زائد (دفع ٢ من ٤)",
      [r.status, r.body?.delta, r.body?.creditBalance], [200, -8_000_000, 0]);
    const after = await moneyOf(A);
    same("أ٣. **المتابعةُ بأصليّها وخصمها الجديدين** — فتقول البطاقةُ ٤٬٣٥٠٬٠٠٠ و٣٥٠٬٠٠٠ و٤٬٠٠٠٬٠٠٠",
      after.followup, ["converted", 4_000_000, 4_350_000, "discount"]);
    same("أ٤. والحلقةُ بسعرها الجديد وحالتها كما هي", after.episode, ["in_manufacturing", 4_000_000]);
    same("أ٥. وكلفةُ الخيط ومجموعُ المريض والدفترُ كلُّها ٤ ملايين",
      [after.caseCost, after.total, after.ledger], [4_000_000, 4_000_000, 4_000_000]);
    same("أ٦. **وأمرُ التصنيع نفسُه باقٍ** — واحدٌ لم يُلغَ", after.orders, before.orders);
    const [entry] = await q(`SELECT amount::int a, source, device_episode_id d, notes FROM cost_entries
                              WHERE patient_id=$1 AND source='sale_price_correction'`, [A.patientId]);
    same("أ٧. قيدٌ موقَّع بهويّة الجهاز وسببِه",
      [entry?.a, entry?.d, /سُجّل السعر خطأً/.test(entry?.notes ?? "")], [-8_000_000, A.episodeId, true]);
    const card = (await http("GET", `/api/followups/patient/${A.patientId}`, S.admin)).body?.[0];
    const ev = (card?.events ?? []).find((e: any) => e.eventType === "sale_price_corrected");
    const view = ev ? followupEventView(ev, () => null) : null;
    check(!!view && view.title === "تصحيح سعر البيع" && JSON.stringify(view.transition) === JSON.stringify({ from: 12_000_000, to: 4_000_000 })
      && view.facts.some((x) => /السعر الأصلي: 4,350,000/.test(x) && /الخصم: 350,000/.test(x))
      && view.facts.some((x) => /سبب التصحيح: سُجّل السعر خطأً/.test(x)),
      "أ٨. والحدثُ في سجلّ البطاقة بعنوانه وانتقاله وأصليّه وخصمه وسببه", JSON.stringify(view));
    const [aud] = await q(`SELECT new_values FROM audit_log WHERE entity_type='post_exam_followup' AND entity_id=$1
                             AND user_id=$2 ORDER BY id DESC LIMIT 1`, [A.followupId, MGR]);
    const nv = typeof aud?.new_values === "string" ? JSON.parse(aud.new_values) : aud?.new_values;
    same("أ٩. وسطرُ تدقيقٍ بالقديم والجديد", [nv?.approvedPrice, nv?.originalPrice], [4_000_000, 4_350_000]);

    // ══ ب) الصلاحيات ═══════════════════════════════════════════════════
    console.log("\n── ب) مَن يصحّح ──");
    const body = { originalPrice: 5_000_000, discountAmount: 0, reason: "تصحيح" };
    same("ب١. الاستعلاماتُ لا تصحّح (٤٠٣)", (await correct(A.followupId, S.recv, body)).status, 403);
    same("ب٢. ولا الطبيب (٤٠٣)", (await correct(A.followupId, S.doc, body)).status, 403);
    same("ب٣. ولا مديرُ فرعٍ آخر (٤٠٣)", (await correct(A.followupId, S.mgr2, body)).status, 403);
    same("ب٤. والمالُ لم يتحرّك بأيّها", (await moneyOf(A)).followup[1], 4_000_000);

    // ══ ج) التحقّق ═════════════════════════════════════════════════════
    console.log("\n── ج) التحقّق ──");
    same("ج١. بلا سببٍ يُردّ (٤٠٠)",
      (await correct(A.followupId, S.admin, { originalPrice: 5_000_000, discountAmount: 0, reason: "  " })).status, 400);
    same("ج٢. وخصمٌ فوق الأصليّ يُردّ (٤٠٠)",
      (await correct(A.followupId, S.admin, { originalPrice: 1_000_000, discountAmount: 2_000_000, reason: "x" })).status, 400);
    same("ج٣. والسعرُ نفسُه يُردّ (٤٠٠)",
      (await correct(A.followupId, S.admin, { originalPrice: 4_350_000, discountAmount: 350_000, reason: "x" })).status, 400);
    const N = await operation("لم يُبَع");
    const rn = await correct(N.followupId, S.admin, body);
    same("ج٤. **وملفٌّ لم يُبَع بعد لا يُصحَّح** — والرسالةُ تدلّ على «إتمام البيع» (٤٠٩)",
      [rn.status, /لم يُبَع بعد/.test(rn.body?.error ?? "")], [409, true]);

    // ══ د) الدفعُ الزائد لا يمنع (قرارُ المالك) ═════════════════════════
    console.log("\n── د) دفع أكثر من السعر الجديد ──");
    const D = await operation("دفع زائد", { original: 6_000_000, discount: 0 });
    await pay(D, 5_000_000);
    const rd = await correct(D.followupId, S.admin, { originalPrice: 4_000_000, discountAmount: 0, reason: "السعر الصحيح ٤ ملايين" });
    same("د١. يُحفظ ويقول الرصيدَ الزائد مليوناً", [rd.status, rd.body?.creditBalance], [200, 1_000_000]);
    same("د٢. والكلفةُ صارت ٤ ملايين", (await moneyOf(D)).caseCost, 4_000_000);

    // ══ هـ) بعد التسليم ═════════════════════════════════════════════════
    console.log("\n── هـ) بعد التسليم ──");
    const E = await operation("مسلَّم", { original: 3_000_000, discount: 0 });
    await q(`UPDATE prosthetic_work_orders SET status='completed', current_stage='delivered', completed_at=now() WHERE patient_id=$1`, [E.patientId]);
    await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=now() WHERE id=$1`, [E.episodeId]);
    const re = await correct(E.followupId, S.mgr, { originalPrice: 3_000_000, discountAmount: 500_000, reason: "خصمٌ نُسي" });
    const me = await moneyOf(E);
    same("هـ١. يُصحَّح بعد التسليم والجهازُ يبقى مسلَّماً",
      [re.status, me.episode, me.followup[1], me.caseCost], [200, ["delivered", 2_500_000], 2_500_000, 2_500_000]);

    // ══ و) الحرّاس تحت القفل ═════════════════════════════════════════════
    console.log("\n── و) الحرّاس ──");
    const F = await operation("خصمٌ معلَّق", { original: 2_000_000, discount: 0 });
    await q(`INSERT INTO service_discount_requests
               (patient_id, branch_id, department, context_ref, original_price, proposed_final_price, discount_amount,
                discount_percentage, is_free, reason, status, payload, requested_by)
             VALUES ($1,1,'prosthetic',$2,2000000,1800000,200000,10,false,'خصم','pending','{}'::jsonb,$3)`,
      [F.patientId, `followup:${F.followupId}`, RECV]);
    const rf = await correct(F.followupId, S.admin, { originalPrice: 1_500_000, discountAmount: 0, reason: "x" });
    same("و١. طلبُ خصمٍ معلَّق على الجهاز يُردّ (٤٠٩) ولا يتحرّك شيء",
      [rf.status, (await moneyOf(F)).followup[1]], [409, 2_000_000]);

    const G = await operation("رقمان مختلفان", { original: 2_000_000, discount: 0 });
    await q(`UPDATE patient_device_episodes SET agreed_cost = 1999000 WHERE id=$1`, [G.episodeId]);
    const rg = await correct(G.followupId, S.admin, { originalPrice: 1_500_000, discountAmount: 0, reason: "x" });
    same("و٢. سعرُ المتابعة وسعرُ الجهاز مختلفان ⟵ يُردّ (٤٠٩) للمراجعة",
      [rg.status, /غير متطابقين/.test(rg.body?.error ?? "")], [409, true]);

    const H = await operation("مُبطَل", { original: 2_000_000, discount: 0 });
    await q(`UPDATE prosthetic_work_orders SET status='completed', current_stage='delivered', completed_at=now() WHERE patient_id=$1`, [H.patientId]);
    await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=now() WHERE id=$1`, [H.episodeId]);
    const [rv] = await q<{ id: number }>(`INSERT INTO administrative_operation_reversals (patient_id, mode, reason_code, reason_note)
                                           VALUES ($1,'full_operation','other','اختبار') RETURNING id`, [H.patientId]);
    await q(`UPDATE patient_device_episodes SET admin_void_reversal_id=$2 WHERE id=$1`, [H.episodeId, rv.id]);
    const rh = await correct(H.followupId, S.admin, { originalPrice: 1_500_000, discountAmount: 0, reason: "x" });
    same("و٣. **وجهازٌ مسلَّمٌ أُبطلت عمليتُه إدارياً لا يُصحَّح سعرُه** (٤٠٩)",
      [rh.status, /أُبطلت/.test(rh.body?.error ?? "")], [409, true]);

    const I = await operation("ملغى", { original: 2_000_000, discount: 0 });
    await q(`UPDATE patient_device_episodes SET status='cancelled' WHERE id=$1`, [I.episodeId]);
    const ri = await correct(I.followupId, S.admin, { originalPrice: 1_500_000, discountAmount: 0, reason: "x" });
    same("و٤. وجهازٌ ليس قيد التصنيع ولا مسلَّماً يُردّ (٤٠٩)", ri.status, 409);

    // ══ ز) ما أمسكته المراجعةُ المستقلّة ═════════════════════════════════
    console.log("\n── ز) المراجعة المستقلّة ──");
    const [srcA] = await q(`SELECT price_source FROM post_exam_followups WHERE id=$1`, [A.followupId]);
    same("ز١. مصدرُ السعر بعد التصحيح قرارُ إدارة لا «من المعاينة»", srcA?.price_source, "manager_set");
    //  بيعٌ سعرُه «من المعاينة» (الموروث: الطبيبُ كتب السعر) — يُصحَّح، ثمّ يعدّل أحدٌ سعرَ المعاينة: لا يكتب فوق التصحيح.
    const X = await operation("سعرٌ من المعاينة", { original: 6_000_000, discount: 0 });
    await q(`UPDATE post_exam_followups SET price_source='exam' WHERE id=$1`, [X.followupId]);
    const rx = await correct(X.followupId, S.admin, { originalPrice: 5_000_000, discountAmount: 0, reason: "تصحيح" });
    const [exX] = await q(`SELECT medical_exam_id id FROM post_exam_followups WHERE id=$1`, [X.followupId]);
    const ed = await http("PATCH", `/api/medical/exams/${exX.id}`, S.admin, {
      caseType: "prosthetic", diagnosis: "طرف مقفول مع قدم متحركة", prescription: {},
      deviceCost: 9_000_000, priceCorrectionReason: "تعديل المعاينة",
    });
    const mX = await moneyOf(X);
    same("ز٢. **وتعديلُ سعر المعاينة بعده لا يكتب فوق التصحيح** — والمعاينةُ تُحفظ",
      [rx.status, ed.status, mX.followup[1], mX.episode[1], mX.caseCost], [200, 200, 5_000_000, 5_000_000, 5_000_000]);

    const P = await operation("أقساط", { original: 3_000_000, discount: 0 });
    await q(`INSERT INTO installment_plans (patient_id, branch_id, case_id, total_amount, installment_amount, number_of_installments, start_date, status)
             VALUES ($1,1,$2,3000000,500000,6,CURRENT_DATE,'active')`, [P.patientId, P.caseId]);
    const rp = await correct(P.followupId, S.admin, { originalPrice: 2_000_000, discountAmount: 0, reason: "x" });
    same("ز٣. **خطّةُ أقساطٍ نشطة على الحالة ⟵ ٤٠٩** تُعدَّل من «الأقساط» أوّلاً، ولا يتحرّك شيء",
      [rp.status, /خطّةُ أقساطٍ نشطة/.test(rp.body?.error ?? ""), (await moneyOf(P)).caseCost], [409, true, 3_000_000]);

    const T = await operation("في السلّة", { original: 3_000_000, discount: 0 });
    const del = await http("DELETE", `/api/patients/${T.patientId}`, { ...S.admin, permissions: { ...perms, canDeletePatients: true } }, { reason: "اختبار السلّة" });
    const [tr] = await q(`SELECT deleted_at IS NOT NULL d FROM patients WHERE id=$1`, [T.patientId]);
    check(del.status < 300 && tr?.d === true, "ز٤٠. المريضُ في السلّة بالباب الحقيقيّ", JSON.stringify(del));
    const rt = await correct(T.followupId, S.admin, { originalPrice: 2_000_000, discountAmount: 0, reason: "x" });
    same("ز٤. **ومريضُ السلّة لا يُمسّ مالُه** (٤٠٩)", [rt.status, /المحذوفات/.test(rt.body?.error ?? "")], [409, true]);

    const B = await operation("فرعان", { original: 3_000_000, discount: 0 });
    await q(`UPDATE post_exam_followups SET branch_id = 2 WHERE id=$1`, [B.followupId]);
    const rb = await correct(B.followupId, S.admin, { originalPrice: 2_000_000, discountAmount: 0, reason: "x" });
    const br = await q(`SELECT source, branch_id::int b FROM cost_entries WHERE device_episode_id=$1 ORDER BY id`, [B.episodeId]);
    same("ز٥. **قيدُ التصحيح بفرع قيد البيع** لا بفرع المتابعة — فلا ينقسم الجهازُ بين فرعين",
      [rb.status, br.map((x: any) => x.b)], [200, [1, 1]]);

    const cardI = (await http("GET", `/api/followups/patient/${I.patientId}`, S.admin)).body?.[0];
    same("ز٦. **ولا زرَّ لجهازٍ ألغي** — لا يُعرض ما يردّه الخادمُ دائماً", [cardI?.status, cardI?.mayCorrectSalePrice], ["converted", false]);
  } finally {
    httpServer.close();
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]).catch(() => {});
    await pool.end();
  }
  console.log(`\n${failures === 0 ? "✅" : "❌"} ${passes} نجح · ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
