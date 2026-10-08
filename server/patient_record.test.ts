// **«المراجعات» في ورقة كلّ جهاز، وما دُفع في كلّ زيارة، و«طباعة السجلّ الكامل»** (ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨، §4.cv).
// `npm run test:patient-record` — القاعدةُ المشتركة (`shared/visit_payments.ts`) بلا قاعدة، ثمّ الأبوابُ الحقيقية على Postgres محلّي.
//
// يحرس ما طلبه المالك: (١) ورقةُ الجهاز تقول أحداثَ جهازها كلَّها — ومنها «طلب معاينة طبية» و«عاد للشراء» اللتان تُكتبان بلا ربطٍ
// بالحلقة عمداً — **ولا صفَّ يُكتب** (الطلبُ الخاطئ يبقى قابلاً للسحب)، ولا تقع زيارةٌ في ورقة جهازٍ غيرِ جهازها؛ (٢) «عاد واشترى
// القالب — وتحتها أنه دفع مليوناً»: الدفعةُ تحت زيارتها لا تحت زيارةٍ أخرى في اليوم نفسِه، ولا تحت جلسةِ قسمٍ آخر؛ (٣) السجلُّ الكامل
// لا يُسقط ديناراً: مجموعُ ما في سطوره = مجموعُ دفعات المريض، والمالُ غائبٌ كلُّه لمن لا تصله الدفعات.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "patient-record-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { attachPaymentsToVisits, patientRecordRows, recordPayments, visitDevicesFromSheets } from "@shared/visit_payments";
import type { IntakeSheet } from "@shared/intake_sheet_view";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6998;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-السجل-الكامل";
const B1 = 9981;
const RECV = 9982, DOC = 9983, EXPERT = 9984;
const IDS = [RECV, DOC, EXPERT];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY($1::int[]))`, [IDS]);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ القاعدةُ المشتركة ══
  console.log("\n── ق. أيُّ زيارةٍ تحمل الدفعة ──");
  const T = (h: string) => `2026-10-08T${h}:00.000Z`;
  //  جهازان (١٠ و٢٠) في قسم الأطراف (١)، وجلسةُ علاجٍ طبيعيّ (قسم ٢).
  const V = [
    { id: 1, date: T("06:00"), deviceEpisodeId: 10, caseId: 1 },   // طلب معاينة طبية — صباحاً
    { id: 2, date: T("09:00"), deviceEpisodeId: 10, caseId: 1 },   // شراء طرف صناعي — لحظةَ دفعة البيع
    { id: 3, date: T("09:30"), deviceEpisodeId: null, caseId: 2 }, // جلسة علاج طبيعي
    { id: 4, date: T("10:00"), deviceEpisodeId: 20, caseId: 1 },   // زيارةُ الجهاز الآخر
    { id: 5, date: "2026-10-01T09:00:00.000Z", deviceEpisodeId: null, caseId: 1 }, // صيانةٌ قبل أسبوع
  ];
  const att = (pays: any[]) => {
    const r = attachPaymentsToVisits(V, pays);
    return [Array.from(r.byVisit.entries()).map(([k, v]) => [k, v.sum]).sort((a, b) => a[0] - b[0]), r.unattached.map((p) => p.id)];
  };
  same("ق.١ **دفعةُ البيع تحت زيارة الشراء** — الأقربُ وقتاً من زيارات جهازها، لا «طلب معاينة طبية» صباحَ اليوم نفسِه",
    att([{ id: 100, amount: 1_000_000, date: T("09:00"), deviceEpisodeId: 10, caseId: 1 }]), [[[2, 1_000_000]], []]);
  same("ق.٢ **ورقمُ الزيارة المحمول يغلب** — ولو في يومٍ آخر",
    att([{ id: 101, amount: 50_000, date: T("09:00"), visitId: 5, deviceEpisodeId: 10, caseId: 1 }]), [[[5, 50_000]], []]);
  same("ق.٣ **دفعةُ جهازٍ لا تقع تحت زيارة جهازٍ آخر ولا تحت جلسة قسمٍ آخر** — وبلا زيارةٍ لجهازها ولا لقسمها بلا جهاز ⟵ بلا زيارة",
    attachPaymentsToVisits(V.filter((v) => v.id !== 1 && v.id !== 2), [{ id: 102, amount: 300_000, date: T("09:40"), deviceEpisodeId: 10, caseId: 1 }])
      .unattached.map((p) => p.id), [102]);
  same("ق.٣ب **ودفعةُ جهازٍ بلا قسمٍ مسجَّل كذلك** — لا تقع تحت جلسةٍ ولا زيارةِ جهازٍ آخر لمجرّد أنها في يومها",
    attachPaymentsToVisits(V.filter((v) => v.id !== 1 && v.id !== 2), [{ id: 110, amount: 300_000, date: T("09:40"), deviceEpisodeId: 10, caseId: null }])
      .unattached.map((p) => p.id), [110]);
  same("ق.٤ **ودفعةُ قسمٍ بلا جهاز تحت زيارة قسمها** — لا تحت جلسةٍ أقربَ منها وقتاً في قسمٍ آخر",
    att([{ id: 103, amount: 70_000, date: T("09:20"), caseId: 1 }]), [[[2, 70_000]], []]);
  same("ق.٥ **ودفعةٌ قديمة بلا جهازٍ ولا قسم تحت أقرب زيارةٍ في يومها**، ويومٌ بلا زيارة ⟵ بلا زيارة",
    att([{ id: 104, amount: 20_000, date: T("09:31") }, { id: 105, amount: 40_000, date: "2026-10-05T09:00:00.000Z" }]), [[[3, 20_000]], [105]]);
  same("ق.٦ **ويومُ بغداد لا يومُ غرينتش** — التاسعةُ والنصفُ ليلاً بتوقيت غرينتش فجرُ الغد في بغداد، فتقع على زيارة ذلك اليوم",
    att([{ id: 106, amount: 10_000, date: "2026-10-07T21:30:00.000Z", deviceEpisodeId: 10, caseId: 1 }]), [[[1, 10_000]], []]);
  same("ق.٧ **والمردودُ يُطرح من زيارته** — صافي اليوم",
    att([{ id: 107, amount: 500_000, date: T("09:00"), deviceEpisodeId: 10, caseId: 1 }, { id: 108, amount: -100_000, date: T("09:05"), deviceEpisodeId: 10, caseId: 1 }]),
    [[[2, 400_000]], []]);

  console.log("\n── ر. السجلُّ الكامل ──");
  const rec = patientRecordRows({
    visits: [
      { id: 2, date: T("09:00"), details: "شراء طرف صناعي", notes: null, deviceEpisodeId: 10, caseId: 1 },
      { id: 1, date: T("06:00"), details: "طلب معاينة طبية", notes: "طرف صناعي كامل", deviceEpisodeId: null, caseId: 1 },
      { id: 3, date: T("09:30"), details: null, treatmentType: "ليزر", notes: "جلسة أولى", caseId: 2 },
    ],
    payments: [
      { id: 100, amount: 1_000_000, date: T("09:00"), deviceEpisodeId: 10, caseId: 1 },
      { id: 109, amount: 250_000, date: "2026-10-06T08:00:00.000Z", deviceEpisodeId: 10, caseId: 1, description: "عربون الطرف", notes: "خام" },
    ],
    deviceLabels: new Map([[10, "الجهاز #1 — طرف صناعي كامل"]]),
    visitDevices: new Map([[1, 10]]),
  });
  same("ر.١ **السطورُ بترتيب التاريخ** — العربونُ سطرُ «دفعة» بوصفه، والزيارةُ بسببها وجهازها، والجلسةُ بنوعها",
    rec.rows.map((r) => [r.kind, r.title, r.notes, r.device, r.paid]),
    [["payment", "دفعة", "عربون الطرف", "الجهاز #1 — طرف صناعي كامل", 250_000],
      ["visit", "طلب معاينة طبية", "طرف صناعي كامل", "الجهاز #1 — طرف صناعي كامل", null],
      ["visit", "شراء طرف صناعي", null, "الجهاز #1 — طرف صناعي كامل", 1_000_000],
      ["visit", "ليزر", "جلسة أولى", null, null]]);
  same("ر.٢ **لا دينارَ يغيب**: مجموعُ ما في السطور = مجموعُ الدفعات",
    [rec.totalPaid, rec.rows.reduce((t, r) => t + (r.paid ?? 0), 0)], [1_250_000, 1_250_000]);
  const recNo = patientRecordRows({ visits: [{ id: 2, date: T("09:00"), details: "شراء طرف صناعي" }], payments: null, deviceLabels: new Map(), visitDevices: new Map() });
  same("ر.٣ **ولمن لا تصله الدفعات: لا مبلغَ ولا مجموعَ ولا سطرَ دفعة**", [recNo.totalPaid, recNo.rows.map((r) => [r.kind, r.paid])], [null, [["visit", null]]]);
  same("ر.٤ **وجهازُ الزيارة من ورقتها** — سطورُ الدفعات في الورقة لا تُقرأ زيارات",
    Array.from(visitDevicesFromSheets([{ episodeId: 10, visits: [{ id: 1, kind: "visit" }, { id: -100, kind: "payment" }] }]).entries()), [[1, 10]]);

  // ══ الأبوابُ الحقيقية ══
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع السجل الكامل')`, [B1]);
  for (const [id, role] of [[RECV, "reception"], [DOC, "doctor"], [EXPERT, "prosthetics_expert"]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `prec-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
  }
  await q(`UPDATE system_users SET medical_specialties = '["prosthetic","medical_support","physiotherapy"]'::jsonb, display_name = 'د. سامر' WHERE id = $1`, [DOC]);
  await q(`UPDATE system_users SET can_add_patients = true, can_add_payments = true, can_view_payments = true, can_view_patients = true WHERE id = $1`, [RECV]);
  const PAY = { canViewPatients: true, canAddPatients: true, canAddPayments: true, canViewPayments: true };
  const S = {
    recv: hdr({ userId: RECV, displayName: "استقبال", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
    doc: hdr({ userId: DOC, displayName: "د. سامر", role: "doctor", roles: ["doctor"], branchId: B1, accessibleBranches: [B1], isAdmin: false,
      permissions: { canViewPatients: true, canWriteMedicalExam: true } }),
  };

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) {
      try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; }
      catch { /* ignore */ }
    }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };

  let seq = 0;
  async function newPatient(label: string, physio = false) {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, amputation_site,
        branch_id, is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification, governorate, address, injury_cause)
      VALUES ($1, $2, 'من شخص آخر', $3, '40', '172', '78', 'amputee', 'احادي - طرف سفلي - يمين - تحت الركبة', $4, true, false, $5, 0, 'new', 'بغداد', 'الكرادة', 'حادث سير')
      RETURNING id`, [`${label} ${MARK}`, `0773${String(4000000 + seq * 7919).slice(0, 7)}`, MARK, B1, physio])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    return pid;
  }
  const openDevice = async (pid: number, requestedItem = "full_device") =>
    Number((await call("POST", `/api/patients/${pid}/device-episodes`, S.recv, { serviceType: "prosthetic", requestedItem, servicePath: "exam" })).json?.id);
  const RX = { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة", prostheticType: "طرف سفلي", kneeJointType: "لا ينطبق" };
  const sign = (pid: number, ep: number) => call("POST", `/api/medical/patients/${pid}/exams`, S.doc, {
    idempotencyKey: randomUUID(), caseType: "prosthetic", deviceEpisodeId: ep,
    chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis: "يحتاج طرفاً.", prescription: RX,
  });
  const followupOf = async (ep: number) => Number((await q(`SELECT id FROM post_exam_followups WHERE device_episode_id = $1 ORDER BY id DESC LIMIT 1`, [ep])).rows[0]?.id);
  const sheetsOf = async (pid: number, s = S.recv) => ((await call("GET", `/api/patients/${pid}/intake-sheets`, s)).json?.sheets ?? []) as IntakeSheet[];
  const SPECS = { socketType: "سوكيت عادي", footType: "قدم مرنة", siliconType: "لا ينطبق" };

  try {
    console.log("\n── أ. «طلب معاينة طبية» في ورقة جهازه ──");
    const a = await newPatient("أحمد");
    const a1 = await openDevice(a);
    const a2 = await openDevice(a, "socket");
    let [s1, s2] = await sheetsOf(a);
    same("أ.١ **كلُّ ورقةٍ تبدأ بطلب معاينة جهازها** — وطلبُ الجهاز الثاني في ورقته وحدها",
      [s1?.visits.map((v) => v.details), s2?.visits.map((v) => [v.details, v.notes])],
      [["طلب معاينة طبية"], [["طلب معاينة طبية", "القالب"]]]);
    const dbLinks = (await q(`SELECT count(*)::int n FROM visits WHERE patient_id = $1 AND details = 'طلب معاينة طبية' AND device_episode_id IS NULL`, [a])).rows[0].n;
    same("أ.٢ **ولا صفَّ يُكتب** — الزيارتان بلا ربطٍ بالحلقة كما كانتا (فالطلبُ الخاطئ يبقى قابلاً للسحب)", dbLinks, 2);

    console.log("\n── ب. «عاد واشترى» — وتحتها ما دُفع ──");
    same("ب.٠ المعاينة", (await sign(a, a1)).status, 200);
    const sale = await call("POST", `/api/followups/${await followupOf(a1)}/complete-sale`, S.recv, {
      originalPrice: 2_000_000, discountAmount: 0, expertUserId: EXPERT, paidNow: 1_000_000, deviceSpecs: SPECS,
    });
    [s1] = await sheetsOf(a);
    same("ب.١ **مليونُ البيع تحت «شراء طرف صناعي»** — لا تحت «طلب معاينة طبية» في اليوم نفسِه",
      [sale.status, s1?.visits.map((v) => [v.details, v.paid])], [200, [["طلب معاينة طبية", null], ["شراء طرف صناعي", 1_000_000]]]);

    const pat = (await call("GET", `/api/patients/${a}`, S.recv)).json;
    const visitDevice = visitDevicesFromSheets(await sheetsOf(a));
    const onScreen = attachPaymentsToVisits(
      pat.visits.map((v: any) => ({ id: v.id, date: v.visitDate, deviceEpisodeId: v.deviceEpisodeId ?? visitDevice.get(v.id) ?? null, caseId: v.caseId })),
      pat.payments.map((p: any) => ({ id: p.id, amount: p.amount, date: p.date, visitId: p.visitId, deviceEpisodeId: p.deviceEpisodeId, caseId: p.caseId })),
    ).byVisit;
    const buyVisit = pat.visits.find((v: any) => v.details === "شراء طرف صناعي");
    same("ب.٢ **وفي سجلّ الزيارات بصفحة المريض الشيءُ نفسُه** — من صفوف الباب الذي تقرؤه الصفحة",
      [onScreen.get(buyVisit?.id)?.sum, onScreen.size], [1_000_000, 1]);

    console.log("\n── ج. «عاد للشراء» في ورقة جهازه ──");
    const c = await newPatient("منى");
    const c1 = await openDevice(c);
    const c2 = await openDevice(c, "socket");
    await sign(c, c1);
    same("ج.٠ لم يشترِ ثمّ عاد للشراء",
      [(await call("POST", `/api/followups/${await followupOf(c1)}/not-bought`, S.recv, { reason: "السعر" })).status,
        (await call("POST", "/api/followups/return-to-purchase", S.recv, { patientId: c, deviceEpisodeId: c1, receptionNote: "جمع المبلغ" })).status],
      [200, 201]);
    const [cs1, cs2] = await sheetsOf(c);
    same("ج.١ **«عاد للشراء» في ورقة جهازه** بملاحظته — لا في ورقة الجهاز الآخر",
      [cs1?.visits.map((v) => [v.details, v.notes]), cs2?.visits.map((v) => v.details)],
      [[["طلب معاينة طبية", "طرف صناعي كامل"], ["عاد للشراء", "جمع المبلغ"]], ["طلب معاينة طبية"]]);
    same("ج.٢ ولا ربطَ يُكتب لها أيضاً",
      (await q(`SELECT count(*)::int n FROM visits WHERE patient_id = $1 AND details = 'عاد للشراء' AND device_episode_id IS NULL`, [c])).rows[0].n, 1);

    console.log("\n── د. المطابقةُ باللحظة لا بالاسم ──");
    //  زيارةٌ يدويّة بالسبب نفسِه في لحظةٍ أخرى، وزيارةُ طلبٍ محذوفة — لا تدخلان ورقة أحد.
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, details) VALUES ($1, $2, now() - interval '2 hours', 'طلب معاينة طبية')`, [c, B1]);
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, details) VALUES ($1, $2, now() - interval '3 hours', 'عاد للشراء')`, [c, B1]);
    await q(`UPDATE visits SET deleted_at = now() WHERE patient_id = $1 AND details = 'طلب معاينة طبية' AND visit_date = (SELECT created_at::timestamp FROM patient_device_episodes WHERE id = $2)`, [c, c2]);
    const [ds1, ds2] = await sheetsOf(c);
    same("د.١ **سببٌ مطابقٌ في لحظةٍ أخرى لا يُنسَب لجهاز، والمحذوفةُ تسقط**",
      [ds1?.visits.map((v) => v.details), ds2?.visits.map((v) => v.details)], [["طلب معاينة طبية", "عاد للشراء"], []]);

    console.log("\n── هـ. مالُ الورقة المطبوعة بقاعدة الاستمارة ──");
    //  حسابُ الطبيب يحمل «عرض الدفعات» افتراضاً — فصفحةُ المريض تصله بدفعاتها، والاستمارةُ تحجب مبالغها عنه (§4.cq).
    const docPat = (await call("GET", `/api/patients/${a}`, S.doc)).json;
    const docSheets = (await call("GET", `/api/patients/${a}/intake-sheets`, S.doc)).json;
    const docRec = patientRecordRows({
      visits: docPat.visits.map((v: any) => ({ id: v.id, date: v.visitDate, details: v.details, notes: v.notes })),
      payments: recordPayments(docPat.payments, docSheets?.canViewMoney), deviceLabels: new Map(), visitDevices: new Map(),
    });
    same("هـ.١ **الطبيبُ يطبع السجلَّ بلا مبلغٍ ولا مجموع** — ولو وصلته الدفعاتُ في صفحة المريض",
      [Array.isArray(docPat.payments), docSheets?.canViewMoney, docRec.totalPaid, docRec.rows.map((r) => [r.title, r.paid])],
      [true, false, null, [["طلب معاينة طبية", null], ["طلب معاينة طبية", null], ["شراء طرف صناعي", null]]]);
    const recvPat = (await call("GET", `/api/patients/${a}`, S.recv)).json;
    const recvSheets = (await call("GET", `/api/patients/${a}/intake-sheets`, S.recv)).json;
    const recvRec = patientRecordRows({
      visits: recvPat.visits.map((v: any) => ({ id: v.id, date: v.visitDate, details: v.details, notes: v.notes, caseId: v.caseId, deviceEpisodeId: v.deviceEpisodeId })),
      payments: recordPayments(recvPat.payments, recvSheets?.canViewMoney), deviceLabels: new Map(), visitDevices: visitDevicesFromSheets(recvSheets?.sheets ?? []),
    });
    same("هـ.٢ **والاستعلاماتُ يطبعه بمالِه**: المليونُ تحت زيارة الشراء، والمجموعُ مليون",
      [recvRec.totalPaid, recvRec.rows.map((r) => [r.title, r.paid])],
      [1_000_000, [["طلب معاينة طبية", null], ["طلب معاينة طبية", null], ["شراء طرف صناعي", 1_000_000]]]);

    console.log("\n── و. الشاشات ──");
    const src = (f: string) => readFileSync(new URL(`../client/src/${f}`, import.meta.url), "utf8");
    const app0 = src("App.tsx"), details = src("pages/PatientDetails.tsx"), box = src("components/intake/DeviceSheetsBox.tsx");
    same("و.١ **صفحةُ «السجلّ الكامل» مسجَّلةٌ بلا إطار، وزرُّها في صفحة المريض**",
      [/location\.startsWith\("\/patient-record\/print"\)/.test(app0), /data-testid="button-print-full-record"/.test(details), /openPatientRecordPrint\(patient\.id\)/.test(details)],
      [true, true, true]);
    same("و.٢ **سجلُّ الزيارات يقول ما دُفع تحت كلّ زيارة بالقاعدة الواحدة**",
      [/attachPaymentsToVisits\(/.test(details), /data-testid=\{`visit-paid-\$\{visit\.id\}`\}/.test(details)], [true, true]);
    same("و.٢ب **والورقةُ المطبوعة تأخذ مالَها بقاعدة الاستمارة**",
      /recordPayments\(p\.payments, sheetsQ\.data\?\.canViewMoney\)/.test(src("pages/PatientRecordPrint.tsx")), true);
    same("و.٣ **والورقةُ المفتوحة تُقرأ برقمها من الاستعلام المحدَّث** — لا لقطةٌ أُخذت لحظةَ الضغط",
      [/sheets\.find\(\(s\) => s\.episodeId === openId\)/.test(box), /useState<IntakeSheet \| null>/.test(box)], [true, false]);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
