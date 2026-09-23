// ملفُّ المريض يقول أيُّ عمليةٍ وأيُّ مال — حيّاً على Postgres وعلى النقاط.
//
// ══ الواقعة ═══════════════════════════════════════════════════════════
// مريضٌ له أمرا تصنيعٍ بنفس النوع ونفس الخبير. فبطاقتاهما في ملفّه متطابقتا
// النصّ، ودفعاتُه صفوفٌ لا تدلّ على شيء — فلا يعرف المسؤولُ أيُّ بطاقةٍ هي
// «أمر ٣٦٢»، ولا أين المال، ولا يتبيّن أثرَ نقلِ دفعةٍ بين جهازين. ونافذةُ
// التصحيح تعرض الكلفةَ المسجَّلة ولا تعرض المدفوع — وهو الرقمُ الذي يقرّر
// سؤالَ إرجاع المبلغ.
//
// ما يحرسه هذا الملفّ: الهويّةُ تصل للجميع، والمالُ يصل بشرطه **ويُحذَف
// حذفاً لا يُصفَّر** لمن لا يملك عرضَ الدفعات.

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";
import { deviceOrdinalLabel } from "@shared/device_label";

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

const PORT = 6897;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-هوية-الملف";
const ADMIN = 9951, RECV = 9952, MGR = 9953, DOC = 9954, EXPERT = 9955, NOPAY = 9956;

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
  //  **يرى الملفَّ ولا يرى المال** — الحالةُ التي يجب ألّا يتسرّب إليها رقم.
  noPay: { userId: NOPAY, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "بلا مال",
    permissions: { canViewPatients: true, canViewPayments: false } },
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

async function cleanup() {
  const pts = await q<{ id: number }>(`SELECT id FROM patients WHERE name LIKE $1`, [`${MARK}%`]);
  for (const { id } of pts) {
    await q(`UPDATE patients SET deleted_at=NULL WHERE id=$1`, [id]);
    await http("DELETE", `/api/patients/${id}`, S.admin).catch(() => null);
  }
}

/** يبني عمليةً مباعة على حلقةٍ جديدة، ويعيد معرّفَي الحلقة والأمر. */
async function sellOne(patientId: number, price: number) {
  const ep = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR, requestedItem: "full_device" as any,
  });
  const episodeId = Number((ep as any).id ?? ep);
  const ex = await http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(), deviceEpisodeId: episodeId,
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
  });
  if (ex.status >= 300) throw new Error(`exam failed: ${JSON.stringify(ex.body)}`);
  await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
    [ex.body?.id, price]);
  const fl = await http("GET", `/api/followups/patient/${patientId}`, S.admin);
  const f = (Array.isArray(fl.body) ? fl.body : []).find((x: any) => x.deviceEpisodeId === episodeId);
  await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
  const buy = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
  if (buy.status !== 200) throw new Error(`buy failed: ${JSON.stringify(buy.body)}`);
  const [wo] = await q<{ id: number }>(
    `SELECT id FROM prosthetic_work_orders WHERE device_episode_id=$1 ORDER BY id DESC LIMIT 1`,
    [episodeId]);
  return { episodeId, workOrderId: Number(wo.id) };
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"], [RECV, "reception", "استعلامات", "[]"],
    [MGR, "branch_manager", "مدير الفرع", "[]"], [DOC, "doctor", "د. المعاين", '["prosthetic"]'],
    [EXPERT, "prosthetics_expert", "الخبير", "[]"], [NOPAY, "reception", "بلا مال", "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true,
               medical_specialties=EXCLUDED.medical_specialties`,
      [id, `mv_u${id}`, name, role, spec]);
  }
  //  **صلاحياتُ المستخدم تُقرأ من القاعدة حيّاً** (وسيطُ الترقية)، فلا يكفي
  //  ما في الجلسة: مَن نريده بلا مال يجب أن يكون عمودُه صريحاً.
  await q(`UPDATE system_users SET can_view_payments=true  WHERE id = ANY($1::int[])`,
    [[ADMIN, RECV]]);
  await q(`UPDATE system_users SET can_view_payments=false WHERE id=$1`, [NOPAY]);
  await q(`UPDATE system_users SET can_view_patients=true WHERE id = ANY($1::int[])`,
    [[ADMIN, RECV, NOPAY, MGR, DOC]]);

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

  const PRICE = 2_700_000;

  const [{ id: patientId }] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition,
       amputation_site, branch_id, is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',1,true,false,0,'past') RETURNING id`,
    [`${MARK} عبدالله`, MARK]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,1,'prosthetic',0,'manual','active')`, [patientId]);

  //  ══ شكلُ الإنتاج: عمليتان لجهازٍ واحد، بنفس النوع ونفس الخبير ══════
  const one = await sellOne(patientId, PRICE);
  const two = await sellOne(patientId, PRICE);
  check(one.workOrderId !== two.workOrderId, "أ١ · أمرا تصنيعٍ مستقلّان",
    `${one.workOrderId} / ${two.workOrderId}`);

  const payOn = async (episodeId: number, amount: number) => {
    const r = await http("POST", "/api/payments", S.recv, {
      patientId, branchId: 1, amount, paymentTreatmentType: "أطراف صناعية",
      notes: "دفعة", deviceEpisodeId: episodeId,
    });
    if (r.status >= 300) throw new Error(`pay failed: ${JSON.stringify(r.body)}`);
  };
  await payOn(one.episodeId, 300_000);
  await payOn(two.episodeId, 1_700_000);

  // ══ ب · بطاقةُ الأمر تقول هويّتَها ═══════════════════════════════════
  const ordersOf = async (session: any) =>
    (await http("GET", `/api/manufacturing/patient/${patientId}/orders`, session)).body as any[];
  const oAdmin = await ordersOf(S.admin);
  const card1 = oAdmin.find((o) => o.id === one.workOrderId);
  const card2 = oAdmin.find((o) => o.id === two.workOrderId);
  check(!!card1 && !!card2, "ب١ · البطاقتان تصلان", JSON.stringify(oAdmin.map((o) => o.id)));
  same("ب٢ · ترتيبُ الجهاز الأول", card1.deviceSequence, 1);
  same("ب٣ · وترتيبُ الثاني", card2.deviceSequence, 2);
  same("ب٤ · وهويّةُ الحلقة على كلّ بطاقة",
    [card1.deviceEpisodeId, card2.deviceEpisodeId], [one.episodeId, two.episodeId]);
  same("ب٥ · والمطلوبُ مُعلَن", [card1.requestedItem, card2.requestedItem],
    ["full_device", "full_device"]);
  //  **والتسميةُ المعروضة تُشتقّ من الدالّة المشتركة لا من نصٍّ في الشاشة.**
  same("ب٦ · التسميةُ من الدالّة المشتركة",
    [deviceOrdinalLabel(card1.deviceSequence), deviceOrdinalLabel(card2.deviceSequence)],
    ["الجهاز الأول", "الجهاز الثاني"]);

  // ══ ج · والمالُ على بطاقته — بشرطه ═══════════════════════════════════
  same("ج١ · كلفةُ الجهاز الأول", card1.agreedCost, PRICE);
  same("ج٢ · والمدفوعُ عليه", card1.paidOnDevice, 300_000);
  same("ج٣ · وكلفةُ الثاني ومدفوعُه", [card2.agreedCost, card2.paidOnDevice],
    [PRICE, 1_700_000]);

  const oNoPay = await ordersOf(S.noPay);
  const n1 = oNoPay.find((o) => o.id === one.workOrderId);
  check(!!n1, "ج٤ · مَن لا يملك عرضَ المال يرى البطاقات", JSON.stringify(oNoPay?.length));
  same("ج٥ · وهويّتُها كاملة", [n1.deviceSequence, n1.requestedItem], [1, "full_device"]);
  //  **حذفٌ لا تصفير**: صفرٌ يُقرأ «لم يدفع شيئاً» — كذبةٌ مالية.
  check(!("agreedCost" in n1) && !("paidOnDevice" in n1),
    "ج٦ · والمالُ محذوفٌ من ردّه لا مصفَّر", JSON.stringify(n1));
  check(!JSON.stringify(oNoPay).includes(String(PRICE))
    && !JSON.stringify(oNoPay).includes("1700000"),
    "ج٧ · ولا رقمَ ماليٍّ في نصّ الردّ كلِّه", JSON.stringify(oNoPay).slice(0, 400));

  // ══ د · جدولُ الدفعات يقول لأيّ جهازٍ كلُّ صفّ ════════════════════════
  const fileOf = async (session: any) =>
    (await http("GET", `/api/patients/${patientId}`, session)).body as any;
  const file = await fileOf(S.admin);
  const pays = (file.payments ?? []) as any[];
  same("د١ · دفعتان على الملفّ", pays.length, 2);
  const p300 = pays.find((p) => p.amount === 300_000);
  const p1700 = pays.find((p) => p.amount === 1_700_000);
  same("د٢ · دفعةُ ٣٠٠ ألف على الجهاز الأول", p300.deviceSequence, 1);
  same("د٣ · ودفعةُ ١,٧٠٠ ألف على الثاني", p1700.deviceSequence, 2);
  same("د٤ · والمطلوبُ معها", p300.deviceRequestedItem, "full_device");

  //  ومَن لا يملك عرضَ المال لا تصله الدفعاتُ أصلاً — فلا عمودَ ولا رقم.
  const fileNoPay = await fileOf(S.noPay);
  check(!("payments" in fileNoPay), "د٥ · ولا دفعاتٍ لمن حُجب عنه المال",
    JSON.stringify(Object.keys(fileNoPay)).slice(0, 200));

  // ══ هـ · نقلُ دفعةٍ بين الجهازين يُقرأ في الملفّ ═════════════════════
  //  هذه شكوى المالك بعينها: نَقَل دفعةً ولم يجد في الملفّ ما يقول إلى أين.
  const [{ code }] = await q<{ code: string }>(
    `SELECT patient_code AS code FROM patients WHERE id=$1`, [patientId]);
  const moveSql = readFileSync("move_payment_between_devices.sql", "utf8")
    .replace("v_patient_code  text    := 'WB-01982';", `v_patient_code  text    := '${code}';`)
    .replace("v_from_episode  integer := 257;", `v_from_episode  integer := ${one.episodeId};`)
    .replace("v_to_episode    integer := 258;", `v_to_episode    integer := ${two.episodeId};`);
  await pool.query(moveSql);

  const afterMove = await fileOf(S.admin);
  const moved = (afterMove.payments ?? []).find((p: any) => p.amount === 300_000);
  same("هـ١ · بعد النقل تقول الدفعةُ إنها للجهاز الثاني", moved.deviceSequence, 2);
  const oAfter = await ordersOf(S.admin);
  same("هـ٢ · وبطاقةُ الأول صارت بلا مدفوع",
    oAfter.find((o) => o.id === one.workOrderId).paidOnDevice, 0);
  same("هـ٣ · وبطاقةُ الثاني تحمل المجموع",
    oAfter.find((o) => o.id === two.workOrderId).paidOnDevice, 2_000_000);

  // ══ و · معاينةُ التصحيح تقول المدفوع ═════════════════════════════════
  const pv = await http("POST", "/api/admin/operation-reversal/preview", S.admin,
    { workOrderId: one.workOrderId });
  check(pv.status === 200, "و١ · المعاينة تعمل", JSON.stringify(pv.body));
  same("و٢ · وتقول المدفوع على هذه العملية (صفرٌ بعد النقل)", pv.body?.paidAmount, 0);
  const pv2 = await http("POST", "/api/admin/operation-reversal/preview", S.admin,
    { workOrderId: two.workOrderId });
  same("و٣ · وعلى الأخرى المجموعَ كاملاً", pv2.body?.paidAmount, 2_000_000);

  // ══ ز · عقدُ الشاشات ═════════════════════════════════════════════════
  const card = readFileSync("client/src/components/manufacturing/PatientWorkOrderCard.tsx", "utf8");
  check(card.includes("deviceOrdinalLabel") && card.includes("أمر #{o.id}"),
    "ز١ · بطاقةُ الأمر تعرض الترتيبَ ورقمَ الأمر");
  check(card.includes("كلفة هذا الجهاز") && card.includes("المدفوع عليه")
    && card.includes("المتبقّي"),
    "ز٢ · وتعرض المال بثلاثة أرقام");
  check(card.includes('typeof o.agreedCost === "number"')
    && card.includes('typeof o.paidOnDevice === "number"'),
    "ز٣ · **وبغياب الحقل لا بصفره** — فالمحجوبُ لا يقرأ صفراً");
  const page = readFileSync("client/src/pages/PatientDetails.tsx", "utf8");
  check(page.includes("deviceOrdinalLabel") && page.includes("hasDeviceService"),
    "ز٤ · جدولُ الدفعات فيه عمودُ الجهاز بالدالّة المشتركة");
  const dlg = readFileSync("client/src/components/AdministrativeReversalDialog.tsx", "utf8");
  const paidIdx = dlg.indexOf("المدفوع على هذه العملية");
  const intentIdx = dlg.indexOf("ما الذي تريد تصحيحه؟");
  check(paidIdx > 0 && intentIdx > 0 && paidIdx < intentIdx,
    "ز٥ · ونافذةُ التصحيح تعرض المدفوع **قبل** اختيار نوع التصحيح",
    `paid=${paidIdx} intent=${intentIdx}`);
  check(!dlg.slice(paidIdx, paidIdx + 400).includes("details"),
    "ز٦ · ولا داخلَ قسمٍ مطويّ");

  await cleanup();
  server.close();
  await pool.end();
  console.log(failures === 0 ? "\n🎉 كل الفحوص نجحت" : `\n❌ ${failures} فحصاً فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
