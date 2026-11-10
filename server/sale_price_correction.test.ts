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

    // ══ ح) مراجعة Codex على #717 ═══════════════════════════════════════
    console.log("\n── ح) مراجعة Codex ──");
    const C = await operation("متابعة بلا حالة", { original: 3_000_000, discount: 0 });
    await q(`UPDATE post_exam_followups SET case_id = NULL WHERE id=$1`, [C.followupId]);
    const rc = await correct(C.followupId, S.admin, { originalPrice: 2_000_000, discountAmount: 0, reason: "x" });
    const mC = await moneyOf(C);
    same("ح١. **متابعةٌ بلا حالة ⟵ حالةُ الجهاز**: تتحرّك كلفةُ الحالة مع الباقي",
      [rc.status, mC.caseCost, mC.total, mC.episode[1]], [200, 2_000_000, 2_000_000, 2_000_000]);

    const Rf = await operation("تخفيض مع استرجاع", { original: 5_000_000, discount: 0 });
    await q(`UPDATE patient_cases SET cost = 3000000 WHERE id=$1`, [Rf.caseId]);
    await q(`UPDATE patients SET total_cost = 3000000 WHERE id=$1`, [Rf.patientId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes)
             VALUES ($1,1,-2000000,'refund_cost_reduction',$2,'تخفيض مع استرجاع')`, [Rf.patientId, Rf.caseId]);
    const rr = await correct(Rf.followupId, S.admin, { originalPrice: 1_000_000, discountAmount: 0, reason: "x" });
    const mR = await moneyOf(Rf);
    same("ح٢. **كلفةٌ عُدّلت بعد البيع بتخفيضٍ مع استرجاع ⟵ ٤٠٩ بلا موافقة** ولا يُطرح المبلغُ مرّتين",
      [rr.status, /عُدّلت بعد البيع/.test(rr.body?.error ?? ""), rr.body?.code, rr.body?.caseCostEditAmount, rr.body?.entries?.[0]?.source, mR.caseCost, mR.followup[1]],
      [409, true, "case_cost_edit_absorb", -2_000_000, "refund_cost_reduction", 3_000_000, 5_000_000]);
    //  §4.gh (مراجعةٌ مستقلّة): كان مانعاً إلى الأبد — والقلمُ والتعديلُ مقفولان، فلا بابَ لكلفة القسم. فصار يُطوى كالقلم بموافقة.
    const rr2 = await correct(Rf.followupId, S.admin, { originalPrice: 1_000_000, discountAmount: 0, reason: "x", absorbCaseCostEdit: -2_000_000 });
    const mR2 = await moneyOf(Rf);
    const [rcr] = await q(`SELECT COALESCE(SUM(amount),0)::int s FROM cost_entries WHERE case_id=$1 AND source='refund_cost_reduction'`, [Rf.caseId]);
    same("ح٢ب. **وبالموافقة يُطوى التخفيضُ بمصدره** ويقع التصحيحُ مرّةً — مليونٌ لا صفر، وصافي التخفيض بعد البيع صفر",
      [rr2.status, mR2.caseCost, mR2.total, mR2.followup[1], mR2.episode[1], rcr.s], [200, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 0]);

    //  مريضٌ عائد: بيعٌ قديم وجهازٌ أحدث — البيعُ القديم بزرّه رغم أنه ليس المتابعةَ الفعّالة.
    const O = await operation("مريض عائد", { original: 2_000_000, discount: 0 });
    const ep2 = await http("POST", `/api/patients/${O.patientId}/device-episodes`, S.recv, { serviceType: "prosthetic", servicePath: "exam" });
    await http("POST", `/api/medical/patients/${O.patientId}/exams`, S.doc, {
      idempotencyKey: crypto.randomUUID(), caseType: "prosthetic", diagnosis: "جهاز ثانٍ", prescription: {}, deviceEpisodeId: Number(ep2.body?.id),
    });
    const listO = (await http("GET", `/api/followups/patient/${O.patientId}`, S.admin)).body ?? [];
    const older = listO.find((f: any) => f.id === O.followupId);
    same("ح٣. للمريض متابعتان، والقديمةُ المُباعة تحمل `mayCorrectSalePrice`",
      [listO.length, older?.status, older?.mayCorrectSalePrice], [2, "converted", true]);

    console.log("\n── ط) مراجعة Codex على #719 ──");
    //  بيعٌ مجانيّ لا يكتب قيداً للجهاز — وتعديلٌ للكلفة قبله لا يُحسب «بعد البيع».
    const Fr = await operation("مجاني ثم تصحيح");
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,0,'case_cost_edit',$2,'قلم الكلفة قبل البيع', NOW() - interval '1 day')`, [Fr.patientId, Fr.caseId]);
    const sf = await http("POST", `/api/followups/${Fr.followupId}/complete-sale`, S.recv, {
      deviceSpecs: SALE_SPECS_TEST, originalPrice: 1_000_000, discountAmount: 1_000_000, expertUserId: EXPERT,
    });
    const [devEntries] = await q(`SELECT count(*)::int n FROM cost_entries WHERE device_episode_id=$1`, [Fr.episodeId]);
    same("ط٠. البيعُ المجانيّ تمّ بلا قيدٍ للجهاز (شرطُ الحالة)", [sf.status, devEntries.n], [200, 0]);
    const rFr = await correct(Fr.followupId, S.admin, { originalPrice: 2_000_000, discountAmount: 0, reason: "سُجّل مجانياً خطأً" });
    const mF = await moneyOf(Fr);
    same("ط١. **وتصحيحُه إلى سعرٍ مدفوع يمرّ** — قلمُ الكلفة قبل البيع لا يُحسب بعده (الحدُّ لحظةُ الإتمام)",
      [rFr.status, mF.followup[1], mF.caseCost, mF.episode[1]], [200, 2_000_000, 2_000_000, 2_000_000]);

    //  مراجعة Codex على #721: بيعٌ مجانيّ ⟵ تخفيضُ الكلفة بعده ⟵ رسمُ صيانةٍ للجهاز بعدهما — الرسمُ لا يُزيح الحدَّ عن لحظة البيع.
    const Fm = await operation("مجاني ثم تخفيض ثم صيانة");
    await http("POST", `/api/followups/${Fm.followupId}/complete-sale`, S.recv, {
      deviceSpecs: SALE_SPECS_TEST, originalPrice: 1_000_000, discountAmount: 1_000_000, expertUserId: EXPERT,
    });
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,-300000,'case_cost_edit',$2,'قلم الكلفة بعد البيع', NOW() + interval '1 second')`, [Fm.patientId, Fm.caseId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, device_episode_id, notes, created_at)
             VALUES ($1,1,50000,'maintenance',$2,$3,'رسم صيانة لاحق', NOW() + interval '2 seconds')`, [Fm.patientId, Fm.caseId, Fm.episodeId]);
    const rFm = await correct(Fm.followupId, S.admin, { originalPrice: 2_000_000, discountAmount: 0, reason: "x" });
    const mFm = await moneyOf(Fm);
    same("ط٣. **وقيدٌ لاحق للجهاز (صيانة) لا يُزيح الحدّ** — قلمُ الكلفة بين البيع والصيانة يُحسب «بعد البيع» ⟵ ٤٠٩ ولا يتحرّك السعر",
      [rFm.status, /عُدّلت بعد البيع/.test(rFm.body?.error ?? ""), mFm.followup[1]], [409, true, 0]);

    //  مراجعة Codex على #722: رسمُ صيانةٍ يُكتب بعد البيع مؤرَّخاً بيوم زيارةٍ قبله — لا يسحب الحدَّ إلى ما قبل البيع.
    const Fb = await operation("مجاني ثم صيانة مؤرخة قبله");
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,0,'case_cost_edit',$2,'قلم الكلفة قبل البيع', NOW() - interval '1 day')`, [Fb.patientId, Fb.caseId]);
    await http("POST", `/api/followups/${Fb.followupId}/complete-sale`, S.recv, {
      deviceSpecs: SALE_SPECS_TEST, originalPrice: 1_000_000, discountAmount: 1_000_000, expertUserId: EXPERT,
    });
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, device_episode_id, notes, created_at)
             VALUES ($1,1,50000,'maintenance',$2,$3,'صيانة مؤرخة بيوم الزيارة', NOW() - interval '2 days')`, [Fb.patientId, Fb.caseId, Fb.episodeId]);
    const rFb = await correct(Fb.followupId, S.admin, { originalPrice: 2_000_000, discountAmount: 0, reason: "x" });
    same("ط٤. **وقيدٌ للجهاز مؤرَّخٌ قبل البيع لا يسحب الحدّ** — قلمُ الكلفة قبل البيع لا يمنع التصحيح (٢٠٠)",
      [rFb.status, (await moneyOf(Fb)).followup[1]], [200, 2_000_000]);

    // ══ ي) القلمُ والتصحيحُ مكانٌ واحد (§4.gh — واقعةُ محمد علي محسن ٢٠٢٦-١١-١٠) ══════════
    console.log("\n── ي) قلمُ الكلفة على حالةٍ مُباعة ──");
    //  الواقعة: بيعٌ ١٠ ملايين، والقلمُ نزل بالكلفة ثمّ أرجعها (صافيه صفر) — فكان التصحيحُ مقفولاً إلى الأبد.
    const M = await operation("محمد علي محسن", { original: 10_000_000, discount: 0 });
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,-2000000,'case_cost_edit',$2,'قلم نزل', NOW() + interval '1 second'),
                    ($1,1, 2000000,'case_cost_edit',$2,'قلم رجع', NOW() + interval '2 seconds')`, [M.patientId, M.caseId]);
    const rM = await correct(M.followupId, S.mgr, { originalPrice: 10_000_000, discountAmount: 2_000_000, reason: "تخفيض من الدكتور" });
    const mM = await moneyOf(M);
    same("ي١. **قلمٌ صافيه صفر بعد البيع لا يقفل التصحيح** — ١٠ ⟵ ٨ ملايين في كلّ موضع",
      [rM.status, mM.followup, mM.episode[1], mM.caseCost, mM.total, mM.ledger],
      [200, ["converted", 8_000_000, 10_000_000, "discount"], 8_000_000, 8_000_000, 8_000_000, 8_000_000]);

    const pM = await http("PATCH", `/api/patients/${M.patientId}/cases/${M.caseId}`, S.admin, { cost: 5_000_000 });
    same("ي٢. **والقلمُ الحرّ على حالةٍ مُباعة يُردّ** (٤٠٩ برمزه) — ولو للمسؤول — ولا يتحرّك شيء",
      [pM.status, pM.body?.code, (await moneyOf(M)).caseCost], [409, "case_has_sale_price_correction", 8_000_000]);

    const casesMgr = (await http("GET", `/api/patients/${M.patientId}/cases`, S.mgr)).body ?? [];
    const casesRecv = (await http("GET", `/api/patients/${M.patientId}/cases`, S.recv)).body ?? [];
    const scM = casesMgr.find((c: any) => c.id === M.caseId)?.saleCorrections ?? [];
    const scR = casesRecv.find((c: any) => c.id === M.caseId)?.saleCorrections ?? [];
    same("ي٣. **بطاقةُ القسم تحمل بيعَها** — فيفتح القلمُ «تصحيح سعر البيع» لمدير الفرع، والاستعلاماتُ تراه بلا صلاحية",
      [scM.length, scM[0]?.followupId, scM[0]?.approvedPrice, scM[0]?.originalPrice, scM[0]?.mayCorrect, scR.length, scR[0]?.mayCorrect,
        typeof scM[0]?.sequenceNumber, scM[0]?.costDrift?.net, scR[0]?.costDrift ?? null],
      [1, M.followupId, 8_000_000, 10_000_000, true, 1, false, "number", 0, null]);

    //  قلمٌ قديم صافيه غيرُ صفر (بيعٌ ٥ ثمّ القلمُ إلى ٣) — يُطوى بموافقةٍ على مبلغه بعينه، ولا يُطرح مرّتين.
    const L = await operation("قلم قديم", { original: 5_000_000, discount: 0 });
    await q(`UPDATE patient_cases SET cost = 3000000 WHERE id=$1`, [L.caseId]);
    await q(`UPDATE patients SET total_cost = 3000000 WHERE id=$1`, [L.patientId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,-2000000,'case_cost_edit',$2,'قلم بعد البيع', NOW() + interval '1 second')`, [L.patientId, L.caseId]);
    const cardL = ((await http("GET", `/api/followups/patient/${L.patientId}`, S.admin)).body ?? []).find((f: any) => f.id === L.followupId);
    const casesL = (await http("GET", `/api/patients/${L.patientId}/cases`, S.admin)).body ?? [];
    same("ي٤أ. **والنافذةُ تعرف الانحرافَ قبل الحفظ** — من بطاقة القرار ومن بطاقة القسم: صافيه وقيدُه",
      [cardL?.saleCostDrift?.net, cardL?.saleCostDrift?.entries?.length, casesL.find((c: any) => c.id === L.caseId)?.saleCorrections?.[0]?.costDrift?.net],
      [-2_000_000, 1, -2_000_000]);
    const bodyL = { originalPrice: 5_000_000, discountAmount: 2_000_000, reason: "الخصم الصحيح" };
    const rL0 = await correct(L.followupId, S.admin, bodyL);
    same("ي٤. بلا موافقة ⟵ ٤٠٩ برمز الطيّ ومبلغه، ولا يتحرّك شيء",
      [rL0.status, rL0.body?.code, rL0.body?.caseCostEditAmount, /عُدّلت بعد البيع/.test(rL0.body?.error ?? ""), (await moneyOf(L)).followup[1]],
      [409, "case_cost_edit_absorb", -2_000_000, true, 5_000_000]);
    const rL1 = await correct(L.followupId, S.admin, { ...bodyL, absorbCaseCostEdit: -1_000_000 });
    same("ي٥. وموافقةٌ على مبلغٍ آخر تُردّ (٤٠٩)", [rL1.status, rL1.body?.code], [409, "case_cost_edit_absorb"]);
    const rL2 = await correct(L.followupId, S.admin, { ...bodyL, absorbCaseCostEdit: -2_000_000 });
    const mL = await moneyOf(L);
    const [pencilL] = await q(`SELECT COALESCE(SUM(amount),0)::int s FROM cost_entries WHERE case_id=$1 AND source='case_cost_edit'`, [L.caseId]);
    same("ي٦. **وبالموافقة يُطوى القلمُ ويقع التصحيحُ مرّةً واحدة** — ٣ ملايين في كلّ موضع لا مليونٌ واحد، وصافي القلم صفر",
      [rL2.status, rL2.body?.absorbedCaseCostEdit, mL.followup[1], mL.episode[1], mL.caseCost, mL.total, mL.ledger, pencilL.s],
      [200, -2_000_000, 3_000_000, 3_000_000, 3_000_000, 3_000_000, 3_000_000, 0]);
    const rL3 = await correct(L.followupId, S.admin, { originalPrice: 5_000_000, discountAmount: 1_000_000, reason: "تصحيح ثانٍ" });
    same("ي٧. وتصحيحٌ بعده يمرّ بلا سؤال (٢٠٠) — ٤ ملايين", [rL3.status, (await moneyOf(L)).caseCost], [200, 4_000_000]);

    //  **وسعرُ البيع صحيحٌ والكلفةُ وحدها انحرفت** (مراجعةٌ مستقلّة: كان لا بابَ لها) — «مطابقةُ الكلفة لسعر البيع» بالسعر نفسِه.
    const Q = await operation("مطابقة الكلفة", { original: 6_000_000, discount: 0 });
    await q(`UPDATE patient_cases SET cost = 4000000 WHERE id=$1`, [Q.caseId]);
    await q(`UPDATE patients SET total_cost = 4000000 WHERE id=$1`, [Q.patientId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,-2000000,'case_cost_edit',$2,'قلم خطأ', NOW() + interval '1 second')`, [Q.patientId, Q.caseId]);
    const rQ0 = await correct(Q.followupId, S.admin, { originalPrice: 6_000_000, discountAmount: 0, reason: "القلم خطأ" });
    const rQ1 = await correct(Q.followupId, S.admin, { originalPrice: 6_000_000, discountAmount: 0, reason: "القلم خطأ", absorbCaseCostEdit: -2_000_000 });
    const mQ = await moneyOf(Q);
    same("ي٧ب. **السعرُ نفسُه مع ما يُطوى يُحفظ** — الكلفةُ ٦ ملايين كالسعر، والمتابعةُ والجهازُ كما هما والفرقُ صفر",
      [rQ0.status, rQ0.body?.code, rQ1.status, rQ1.body?.delta, mQ.caseCost, mQ.total, mQ.ledger, mQ.followup, mQ.episode[1]],
      [409, "case_cost_edit_absorb", 200, 0, 6_000_000, 6_000_000, 6_000_000, ["converted", 6_000_000, 6_000_000, "normal"], 6_000_000]);
    const rQ2 = await correct(Q.followupId, S.admin, { originalPrice: 6_000_000, discountAmount: 0, reason: "مرّةً ثانية" });
    same("ي٧ج. وبعدها السعرُ نفسُه بلا ما يُطوى يُردّ (٤٠٠)", rQ2.status, 400);

    //  **قسمٌ بجهازين والقلمُ بين بيعيهما** (مراجعةٌ مستقلّة): الطيُّ يُقاس من أوّل بيعٍ في القسم — فتصحيحُ الثاني لا يرى عكسَ الطيّ وحده فيعيده.
    const W = await operation("جهازان في قسم", { original: 10_000_000, discount: 0 });
    const epW2 = await http("POST", `/api/patients/${W.patientId}/device-episodes`, S.recv, { serviceType: "prosthetic", servicePath: "exam" });
    const exW2 = await http("POST", `/api/medical/patients/${W.patientId}/exams`, S.doc, {
      idempotencyKey: crypto.randomUUID(), caseType: "prosthetic", diagnosis: "جهاز ثانٍ", prescription: {}, deviceEpisodeId: Number(epW2.body?.id),
    });
    const [fW2] = await q(`SELECT id FROM post_exam_followups WHERE medical_exam_id=$1`, [Number(exW2.body?.id)]);
    const sW2 = await http("POST", `/api/followups/${fW2.id}/complete-sale`, S.recv, {
      deviceSpecs: SALE_SPECS_TEST, originalPrice: 5_000_000, discountAmount: 0, expertUserId: EXPERT,
    });
    const [cW] = await q(`SELECT COALESCE(f2.case_id, e2.case_id) c FROM post_exam_followups f2 JOIN patient_device_episodes e2 ON e2.id=f2.device_episode_id WHERE f2.id=$1`, [fW2.id]);
    await q(`UPDATE post_exam_followups SET converted_at = NOW() - interval '2 hours' WHERE id=$1`, [W.followupId]);
    await q(`UPDATE post_exam_followups SET converted_at = NOW() - interval '30 minutes' WHERE id=$1`, [fW2.id]);
    await q(`UPDATE patient_cases SET cost = cost - 1000000 WHERE id=$1`, [W.caseId]);
    await q(`UPDATE patients SET total_cost = total_cost - 1000000 WHERE id=$1`, [W.patientId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,-1000000,'case_cost_edit',$2,'قلم بين البيعين', NOW() - interval '1 hour')`, [W.patientId, W.caseId]);
    const wA = await correct(W.followupId, S.admin, { originalPrice: 10_000_000, discountAmount: 1_000_000, reason: "خصم", absorbCaseCostEdit: -1_000_000 });
    const wB = await correct(fW2.id, S.admin, { originalPrice: 5_000_000, discountAmount: 1_000_000, reason: "خصم" });
    const [cWc] = await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [W.caseId]);
    const [pWt] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [W.patientId]);
    same("ي٧د. **وتصحيحُ الجهاز الثاني لا يعيد ما طُوي** — ٢٠٠ بلا سؤال، والقسمُ ٩ + ٤ = ١٣ مليوناً",
      [sW2.status, cW.c, wA.status, wB.status, wB.body?.code ?? null, cWc.c, pWt.t], [200, W.caseId, 200, 200, null, 13_000_000, 13_000_000]);

    //  **جهازٌ أُلغي أمرُه لا يبدأ منه الحدّ** (المراجعةُ الثانية): بيعٌ ٥ ثمّ أُلغي، والقلمُ أزال مالَه، ثمّ بيعٌ ٤ في القسم نفسِه — تصحيحُه
    //  إلى ٣٫٥ يمضي بلا سؤال ولا يعيد مالَ الملغى.
    const Xc = await operation("ملغى ثم جديد", { original: 5_000_000, discount: 0 });
    await q(`UPDATE post_exam_followups SET converted_at = NOW() - interval '3 hours' WHERE id=$1`, [Xc.followupId]);
    await q(`UPDATE patient_device_episodes SET status='cancelled' WHERE id=$1`, [Xc.episodeId]);
    await q(`UPDATE patient_cases SET cost = 0 WHERE id=$1`, [Xc.caseId]);
    await q(`UPDATE patients SET total_cost = 0 WHERE id=$1`, [Xc.patientId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
             VALUES ($1,1,-5000000,'case_cost_edit',$2,'إزالة مال الملغى', NOW() - interval '2 hours')`, [Xc.patientId, Xc.caseId]);
    const epX2 = await http("POST", `/api/patients/${Xc.patientId}/device-episodes`, S.recv, { serviceType: "prosthetic", servicePath: "exam" });
    const exX2 = await http("POST", `/api/medical/patients/${Xc.patientId}/exams`, S.doc, {
      idempotencyKey: crypto.randomUUID(), caseType: "prosthetic", diagnosis: "جهاز جديد", prescription: {}, deviceEpisodeId: Number(epX2.body?.id),
    });
    const [fX2] = await q(`SELECT id FROM post_exam_followups WHERE medical_exam_id=$1`, [Number(exX2.body?.id)]);
    await http("POST", `/api/followups/${fX2.id}/complete-sale`, S.recv, {
      deviceSpecs: SALE_SPECS_TEST, originalPrice: 4_000_000, discountAmount: 0, expertUserId: EXPERT,
    });
    const rX2 = await correct(fX2.id, S.admin, { originalPrice: 4_000_000, discountAmount: 500_000, reason: "خصم" });
    const [cX] = await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [Xc.caseId]);
    const [tX] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [Xc.patientId]);
    same("ي٧و. **وجهازٌ أُلغي أمرُه خارجُ الحدّ** — تصحيحُ الجديد يمضي (٢٠٠) والقسمُ ٣٫٥ ملايين لا ٨٫٥",
      [rX2.status, rX2.body?.code ?? null, cX.c, tX.t], [200, null, 3_500_000, 3_500_000]);

    //  **وطيٌّ مع فرق البيع تحت الصفر يُردّ** لا يُقصّ (المراجعةُ الثانية).
    const Z = await operation("تحت الصفر", { original: 5_000_000, discount: 0 });
    await q(`UPDATE patient_cases SET cost = 3000000 WHERE id=$1`, [Z.caseId]);
    await q(`UPDATE patients SET total_cost = 3000000 WHERE id=$1`, [Z.patientId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, created_at)
             VALUES ($1,1,2000000,'case_cost_edit',$2, NOW() + interval '1 second')`, [Z.patientId, Z.caseId]);
    const rZ = await correct(Z.followupId, S.admin, { originalPrice: 5_000_000, discountAmount: 3_000_000, reason: "x", absorbCaseCostEdit: 2_000_000 });
    same("ي٧ز. **طيٌّ يُنزل الكلفةَ مع فرق البيع تحت الصفر ⟵ ٤٠٩** ولا يتحرّك شيء",
      [rZ.status, /تحت الصفر/.test(rZ.body?.error ?? ""), (await moneyOf(Z)).caseCost], [409, true, 3_000_000]);

    //  **وبيعٌ موروث بلا سعرٍ أصليّ**: «مطابقة الكلفة» بالسعر نفسِه لا تكتب السعرَ ولا تمحو أسطرَ الأجزاء (المراجعةُ الثانية).
    const Lg = await operation("موروث بلا أصلي", { original: 3_000_000, discount: 0 });
    await q(`UPDATE post_exam_followups SET original_price = NULL, price_kind = NULL, price_source = 'exam' WHERE id=$1`, [Lg.followupId]);
    await q(`UPDATE patient_cases SET cost = 2500000 WHERE id=$1`, [Lg.caseId]);
    await q(`UPDATE patients SET total_cost = 2500000 WHERE id=$1`, [Lg.patientId]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, created_at)
             VALUES ($1,1,-500000,'case_cost_edit',$2, NOW() + interval '1 second')`, [Lg.patientId, Lg.caseId]);
    const rLg = await correct(Lg.followupId, S.admin, { originalPrice: 3_000_000, discountAmount: 0, reason: "مطابقة", absorbCaseCostEdit: -500_000 });
    const [fLg] = await q(`SELECT original_price, price_source FROM post_exam_followups WHERE id=$1`, [Lg.followupId]);
    same("ي٧ح. **والموروثُ بلا أصليّ يُطابَق ولا يُعاد كتابةُ سعره** — ٣ ملايين، والأصليُّ فارغٌ ومصدرُه كما كان",
      [rLg.status, rLg.body?.delta, (await moneyOf(Lg)).caseCost, fLg.original_price, fLg.price_source], [200, 0, 3_000_000, null, "exam"]);

    //  و«تعديل مريض» القديم (`manual_edit`) خارجُ الطيّ عمداً — يكتب القسمَ قيمةً مطلقة فعكسُ قيده لا يعكس أثرَه (مراجعةٌ مستقلّة).
    const K = await operation("تعديل مريض قديم", { original: 4_000_000, discount: 0 });
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, created_at)
             VALUES ($1,1,-500000,'manual_edit',$2, NOW() + interval '1 second')`, [K.patientId, K.caseId]);
    const rK0 = await correct(K.followupId, S.admin, { originalPrice: 4_000_000, discountAmount: 500_000, reason: "الخصم" });
    same("ي٧هـ. **و«تعديل مريض» القديم لا يُطوى** — التصحيحُ يمضي بلا سؤال", [rK0.status, rK0.body?.code ?? null], [200, null]);

    const uM = await http("PUT", `/api/patients/${M.patientId}`, S.admin, { totalCost: 1_000_000 });
    same("ي٨. **و«تعديل مريض» لا يغيّر كلفةَ مريضٍ له جهازٌ مُباع** (٤٠٩ برمزه) ولا يتحرّك شيء",
      [uM.status, uM.body?.code, (await moneyOf(M)).total], [409, "case_has_sale_price_correction", 8_000_000]);
    const uM2 = await http("PUT", `/api/patients/${M.patientId}`, S.admin, { totalCost: 8_000_000, address: "النجف" });
    same("ي٩. وإرسالُها بقيمتها نفسِها مع تعديلٍ آخر يمرّ (٢٠٠)", [uM2.status, (await moneyOf(M)).total], [200, 8_000_000]);

    //  **والقسمُ النشط وحده يمنع «تعديل مريض»**: قسمُ أطرافٍ مغلقٌ بجهازه، والعلاجُ الطبيعيّ النشطُ الوحيد — الخانةُ تكتبه وحده.
    const Cl = await operation("قسم مغلق", { original: 2_000_000, discount: 0 });
    await q(`UPDATE patient_cases SET status='closed' WHERE id=$1`, [Cl.caseId]);
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status) VALUES ($1,1,'physiotherapy',0,'manual','active')`, [Cl.patientId]);
    await q(`UPDATE patients SET is_physiotherapy = true WHERE id=$1`, [Cl.patientId]);
    const uCl = await http("PUT", `/api/patients/${Cl.patientId}`, S.admin, { totalCost: 2_300_000 });
    same("ي٩ب. **وقسمٌ مُباعٌ مغلق لا يمنع كلفةَ العلاج الطبيعيّ النشط** (٢٠٠)", [uCl.status, (await moneyOf(Cl)).total], [200, 2_300_000]);

    const [pl] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, amputation_site, branch_id,
         is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
       VALUES ($1,'07701234568',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - فوق الركبة',1,true,false,false,1000000,'old') RETURNING id`,
      [`${MARK} بلا بيع`, MARK]);
    const [plc] = await q<{ id: number }>(
      `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
       VALUES ($1,1,'prosthetic',1000000,'manual','active') RETURNING id`, [pl.id]);
    const pPl = await http("PATCH", `/api/patients/${pl.id}/cases/${plc.id}`, S.admin, { cost: 1_500_000 });
    const [plcs] = await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [plc.id]);
    const casesPl = (await http("GET", `/api/patients/${pl.id}/cases`, S.admin)).body ?? [];
    same("ي١٠. **وحالةٌ بلا بيعٍ يُصحَّح يبقى قلمُها حرّاً كما كان** (٢٠٠) وبطاقتُها بلا بيوع",
      [pPl.status, plcs.c, casesPl.find((c: any) => c.id === plc.id)?.saleCorrections ?? null], [200, 1_500_000, null]);

    //  متابعةٌ منتهية من فرعٍ لا يصله مديرُ الفرع (ملفٌّ مشترك) — بلا زرّ له، وبزرٍّ للمسؤول.
    const Sh = await operation("بيع من فرع آخر", { original: 2_000_000, discount: 0 });
    await q(`UPDATE post_exam_followups SET branch_id = 2 WHERE id=$1`, [Sh.followupId]);
    const asMgr = ((await http("GET", `/api/followups/patient/${Sh.patientId}`, S.mgr)).body ?? []).find((f: any) => f.id === Sh.followupId);
    const asAdmin = ((await http("GET", `/api/followups/patient/${Sh.patientId}`, S.admin)).body ?? []).find((f: any) => f.id === Sh.followupId);
    const postMgr = await correct(Sh.followupId, S.mgr, { originalPrice: 1_000_000, discountAmount: 0, reason: "x" });
    same("ط٢. **بيعٌ من فرعٍ آخر يظهر لمدير الفرع بلا زرّ** (والخادمُ يردّه ٤٠٣)، وللمسؤول بزرّه",
      [asMgr?.status, asMgr?.mayCorrectSalePrice, postMgr.status, asAdmin?.mayCorrectSalePrice], ["converted", false, 403, true]);
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
