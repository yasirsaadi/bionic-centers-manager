// «معاينةُ الطبيب على استمارة المراجع نفسِها» (§4.cq — المرحلةُ الثانية ب، ٢٠٢٦-١٠-٠٨).
// `npm run test:exam-sheet` — القاعدةُ المشتركة، ثمّ النقاطُ الحقيقية: توقيعُ المعاينة وتنقيحُها.
//
// يحرس قرارَي المالك: (١) «نفسُ الورقة تماماً التي ملأها الاستعلامات» — فالطبيبُ يعدّل حقولَ الاستعلامات ويُكتب تعديلُه في سجلّ
// التدقيق باسمه، و«المطلوب» يُصحَّح قبل البيع وحده؛ (٢) «حقلٌ واحد اسمُه المعاينة الطبية ويظهر عند ملف المريض» — يُحفَظ في
// `diagnosis` وتُفرَّغ الأربعُ الباقية. ومعهما: لا قيدَ جديد على ملفٍّ قديمٍ ناقص، والرفضُ لا يترك أثراً، والعلاجُ الطبيعيُّ لا يمسّه شيء.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "exam-sheet-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { prepareSheetEdit, examNarrativeRows, examSheetTextOf, EXAM_SHEET_TEXT_LABEL } from "@shared/exam_sheet";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6993;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-استمارة-الطبيب";
const B1 = 9841;
const RECV = 9851, DOC = 9852, DOC2 = 9853, MGR = 9854, EXPERT = 9855;
const IDS = [RECV, DOC, DOC2, MGR, EXPERT];
const SALE_SPECS = { prostheticType: "طرف", socketType: "سوكيت", kneeJointType: "لا ينطبق", footType: "قدم", siliconType: "لا ينطبق" };

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1 OR referral_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY($1::int[]))`, [IDS]);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ القاعدةُ المشتركة (بلا قاعدة بيانات) ══
  console.log("\n── القواعد ──");
  const EX = {
    name: "علي حسن", phone: "07701234567", governorate: "بغداد", address: "الكرادة", referralSource: "فيسبوك", referralSubSource: null,
    hadPriorCenterHistory: false, age: "40", weight: "70", height: "170", injuryCause: "حادث", injuryDate: "2020-05-01",
    injuryDateStatus: null, generalNotes: null,
  };
  const echo = { ...EX, referralSubSource: "", generalNotes: "", injuryDateStatus: null };
  same("ق.١ الاستمارةُ كما هي ⟵ لا شيءَ يُكتب", prepareSheetEdit(EX, echo), { patch: {}, missing: [], message: null });
  same("ق.٢ ما تغيّر وحده يُكتب — مقصوصاً", prepareSheetEdit(EX, { ...echo, name: " علي حسن جاسم ", address: "الكرادة" }).patch, { name: "علي حسن جاسم" });
  same("ق.٣ **لا يُفرَّغ إلزاميٌّ مكتوب**", prepareSheetEdit(EX, { ...echo, address: " ", age: "" }).missing, ["address", "age"]);
  same("ق.٤ المحافظةُ من القائمة، والعمرُ والوزنُ رقمٌ موجب", prepareSheetEdit(EX, { ...echo, governorate: "مدينة", weight: "-3" }).missing, ["governorate", "weight"]);
  const ph = prepareSheetEdit(EX, { ...echo, phone: "123" });
  same("ق.٥ والهاتفُ صالح — وتُقال علّتُه", [ph.missing, /^رقم الهاتف: /.test(ph.message ?? "")], [["phone"], true]);
  same("ق.٦ «من شخص آخر» بلا كيف عرف ⟵ ناقصة", prepareSheetEdit(EX, { ...echo, referralSource: "من شخص آخر" }).missing, ["referralSubSource"]);
  same("ق.٦ب وتركُها يمحو «كيف عرف» القديم",
    prepareSheetEdit({ ...EX, referralSource: "من شخص آخر", referralSubSource: "فيسبوك" }, { ...echo, referralSource: "طبيبنا", referralSubSource: "فيسبوك" }).patch,
    { referralSource: "طبيبنا", referralSubSource: null });
  same("ق.٧ «منذ الولادة» على تاريخٍ قائم ⟵ الحالةُ تغلب ويُمحى التاريخ",
    prepareSheetEdit(EX, { ...echo, injuryDate: "", injuryDateStatus: "congenital" }).patch, { injuryDate: null, injuryDateStatus: "congenital" });
  same("ق.٧ب ولا يُفرَّغ التاريخُ والحالةُ معاً", prepareSheetEdit(EX, { ...echo, injuryDate: "", injuryDateStatus: null }).missing, ["injuryDate"]);
  const legacy = { ...EX, governorate: null, weight: null, injuryDate: null };
  same("ق.٨ **ولا قيدَ جديد على ملفٍّ قديمٍ ناقص**: ما لم يُغيَّر لا يُطلَب",
    prepareSheetEdit(legacy, { ...echo, governorate: "", weight: "", injuryDate: "" }), { patch: {}, missing: [], message: null });
  same("ق.٩ والبولياناتُ الصريحة وحدها تُكتب (سبق التعامل)",
    [prepareSheetEdit(EX, { ...echo, hadPriorCenterHistory: true }).patch, prepareSheetEdit(EX, { ...echo, hadPriorCenterHistory: "نعم" }).patch],
    [{ hadPriorCenterHistory: true }, {}]);
  same("ق.١٠ **«المعاينة الطبية» باسمها** لجهازٍ نصُّه خانتُه الواحدة",
    examNarrativeRows("prosthetic", { diagnosis: "بتر تحت الركبة" }).map((r) => r.label), [EXAM_SHEET_TEXT_LABEL]);
  same("ق.١٠ب والقديمةُ بخاناتها كما كُتبت — والعلاجُ الطبيعيُّ «التشخيص» كما كان",
    [examNarrativeRows("prosthetic", { chiefComplaint: "ألم", diagnosis: "بتر" }).map((r) => r.label),
      examNarrativeRows("physiotherapy", { diagnosis: "انزلاق" }).map((r) => r.label)],
    [["الشكوى", "التشخيص"], ["التشخيص"]]);
  same("ق.١١ وتنقيحُ القديمة على الاستمارة يجمع خاناتها بعناوينها — لا يضيع حرف",
    examSheetTextOf("prosthetic", { chiefComplaint: "ألم", diagnosis: "بتر", plan: "طرف" }), "الشكوى: ألم\nالتشخيص: بتر\nالخطة والتوصيات: طرف");

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع استمارة الطبيب')`, [B1]);
  for (const [id, role] of [[RECV, "reception"], [DOC, "doctor"], [DOC2, "doctor"], [MGR, "branch_manager"], [EXPERT, "prosthetics_expert"]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `exs-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
  }
  await q(`UPDATE system_users SET medical_specialties = '["prosthetic","medical_support","physiotherapy"]'::jsonb WHERE id = ANY($1::int[])`, [[DOC, DOC2]]);
  await q(`UPDATE system_users SET can_add_patients = true, can_add_payments = true, can_view_payments = true WHERE id = ANY($1::int[])`, [[RECV, MGR]]);
  const PAY = { canViewPatients: true, canAddPatients: true, canAddPayments: true, canViewPayments: true };
  const docS = (id: number) => hdr({ userId: id, displayName: `د. ${id}`, role: "doctor", branchId: B1, accessibleBranches: [B1], isAdmin: false,
    permissions: { canViewPatients: true, canWriteMedicalExam: true } });
  const S = {
    recv: hdr({ userId: RECV, displayName: "استقبال", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
    doc: docS(DOC), doc2: docS(DOC2),
    mgr: hdr({ userId: MGR, displayName: "المدير", role: "branch_manager", roles: ["branch_manager"], branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: PAY }),
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

  /** مريضٌ بالاستمارة كاملةً وطلبُ معاينةٍ لجهازه. */
  let seq = 0;
  async function sheetPatient(kind: "prosthetic" | "medical_support" | "physiotherapy", label: string) {
    seq += 1;
    const pid = (await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, amputation_site,
        support_type, branch_id, is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification, governorate, address,
        injury_cause, injury_date)
      VALUES ($1, $2, 'من شخص آخر', $3, '40', '172', '78', $4, $5, $6, $7, $8, $9, $10, 0, 'new', 'بغداد', 'الكرادة', 'حادث سير', '2021-03-04') RETURNING id`,
      [`${label} ${MARK}`, `0771${String(4000000 + seq * 7919).slice(0, 7)}`, MARK,
        kind === "prosthetic" ? "amputee" : kind, kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null,
        kind === "medical_support" ? "مشد" : null, B1, kind === "prosthetic", kind === "medical_support", kind === "physiotherapy"])).rows[0].id;
    //  الرقمُ المطبَّع كما يكتبه التسجيلُ — عليه يُفحَص الرقمُ المحجوز.
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    let epId = 0;
    if (kind !== "physiotherapy") {
      const ep = await call("POST", `/api/patients/${pid}/device-episodes`, S.recv, { serviceType: kind, requestedItem: "full_device", servicePath: "exam" });
      epId = Number(ep.json?.id);
    }
    return { pid: Number(pid), epId };
  }
  const patientRow = async (pid: number) => (await q(`SELECT name, phone, governorate, address, age, injury_date::text AS d, injury_date_status AS st,
      referral_source AS src, referral_sub_source AS sub FROM patients WHERE id = $1`, [pid])).rows[0];
  //  `old_values`/`new_values` نصُّ JSON في القاعدة — يُقرأ كائناً.
  const auditRows = async (entity: string, id: number) => (await q(`SELECT user_id, notes, old_values::jsonb AS old_values, new_values::jsonb AS new_values
      FROM audit_log WHERE entity_type = $1 AND entity_id = $2 AND action = 'update' ORDER BY id`, [entity, id])).rows;
  const examBody = (kind: string, over: Record<string, unknown> = {}) => ({
    idempotencyKey: randomUUID(), caseType: kind,
    chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis: "بترٌ تحت الركبة الأيمن، الجذعة سليمة",
    prescription: { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة", prostheticType: "طرف سفلي" },
    ...over,
  });

  try {
    console.log("\n── أ. التوقيعُ على الاستمارة ──");
    const a = await sheetPatient("prosthetic", "سعد");
    const gd = (await call("GET", `/api/medical/patients/${a.pid}/exams`, S.doc)).json;
    const gr = (await call("GET", `/api/medical/patients/${a.pid}/exams`, S.recv)).json;
    same("أ.١ الطبيبُ يفتح على حقول الاستعلامات (ومعها الفرعُ للترويسة) — والاستعلاماتُ لا تُرسَل لها",
      [gd?.sheet?.governorate, gd?.sheet?.address, gd?.sheet?.branchName, gr?.sheet ?? null], ["بغداد", "الكرادة", "فرع استمارة الطبيب", null]);

    //  **المرفوضُ على مريضٍ مستقلّ** — فلا يتّصل أثرُه (إن وقع) بما بعده.
    const z = await sheetPatient("prosthetic", "مرفوض");
    const bad = await call("POST", `/api/medical/patients/${z.pid}/exams`, S.doc, examBody("prosthetic", {
      deviceEpisodeId: z.epId, sheet: { address: "", governorate: "مدينة" },
    }));
    const epBad = (await q(`SELECT status FROM patient_device_episodes WHERE id = $1`, [z.epId])).rows[0].status;
    same("أ.٢ **تعديلٌ غير صالح ⟵ ٤٠٠ يسمّي الحقول، ولا معاينةَ ولا أثر**",
      [bad.status, bad.json?.code, bad.json?.missing, epBad, Number((await q(`SELECT count(*) FROM medical_exams WHERE patient_id = $1`, [z.pid])).rows[0].count)],
      [400, "exam_sheet_invalid", ["governorate", "address"], "awaiting_exam", 0]);

    const key = randomUUID();
    const body = examBody("prosthetic", {
      idempotencyKey: key, deviceEpisodeId: a.epId, requestedItem: "socket",
      sheet: { name: `سعد كاظم ${MARK}`, governorate: "ذي قار", address: "الناصرية", referralSource: "من شخص آخر", referralSubSource: MARK,
        injuryDate: "", injuryDateStatus: "congenital", age: "40" },
    });
    const blank = await call("POST", `/api/medical/patients/${z.pid}/exams`, S.doc, { ...body, deviceEpisodeId: z.epId, requestedItem: undefined, idempotencyKey: randomUUID(), sheet: { phone: " " } });
    same("أ.٢ب ولا يُفرَّغ الهاتفُ المكتوب — يُردّ قبل التوقيع", [blank.status, blank.json?.missing], [400, ["phone"]]);
    const ok = await call("POST", `/api/medical/patients/${a.pid}/exams`, S.doc, body);
    const ex = (await q(`SELECT chief_complaint, clinical_findings, diagnosis, plan, notes FROM medical_exams WHERE id = $1`, [ok.json?.id])).rows[0];
    same("أ.٣ «المعاينة الطبية» في خانتها وحدها", [ok.status, ex?.diagnosis, ex?.chief_complaint, ex?.plan, ex?.notes],
      [200, "بترٌ تحت الركبة الأيمن، الجذعة سليمة", null, null, null]);
    const pr = await patientRow(a.pid);
    same("أ.٤ **ما عدّله الطبيبُ من الاستمارة على الملفّ** — وما لم يُرسَل يبقى",
      [pr.name, pr.governorate, pr.address, pr.d, pr.st, pr.phone.startsWith("0771")],
      [`سعد كاظم ${MARK}`, "ذي قار", "الناصرية", null, "congenital", true]);
    const au = await auditRows("patient", a.pid);
    same("أ.٥ **وسطرُ تدقيقٍ باسم الطبيب** بالقديم والجديد ورقمِ المعاينة",
      [au.length, au[0]?.user_id, /من استمارة المعاينة #\d+ بيد/.test(au[0]?.notes ?? ""), au[0]?.old_values?.governorate, au[0]?.new_values?.governorate],
      [1, DOC, true, "بغداد", "ذي قار"]);
    const ep = (await q(`SELECT requested_item, component FROM patient_device_episodes WHERE id = $1`, [a.epId])).rows[0];
    const epAu = await auditRows("patient_device_episode", a.epId);
    same("أ.٦ **«المطلوب» يُصحَّح قبل البيع** — ومعه الجزءُ، وسطرُ تدقيق",
      [ep.requested_item, ep.component, epAu.length, epAu[0]?.old_values?.requestedItem, epAu[0]?.new_values?.requestedItem],
      ["socket", "socket", 1, "full_device", "socket"]);
    const again = await call("POST", `/api/medical/patients/${a.pid}/exams`, S.doc, body);
    same("أ.٧ وإعادةُ الإرسال بالمفتاح نفسِه لا تكتب ولا تدقّق ثانيةً",
      [again.status, again.json?.created, (await auditRows("patient", a.pid)).length, (await auditRows("patient_device_episode", a.epId)).length],
      [200, false, 1, 1]);
    const replayOther = await call("POST", `/api/medical/patients/${a.pid}/exams`, S.doc, { ...body, sheet: { address: "مكانٌ آخر" } });
    same("أ.٧ب **ولو حملت الإعادةُ استمارةً أخرى** — المعاينةُ لم تُنشأ الآن، فلا يُكتب شيء",
      [replayOther.json?.created, (await patientRow(a.pid)).address, (await auditRows("patient", a.pid)).length], [false, "الناصرية", 1]);

    console.log("\n── ب. التنقيح ──");
    const n0 = (await auditRows("patient", a.pid)).length;
    const p2 = await call("PATCH", `/api/medical/exams/${ok.json.id}`, S.doc, { ...examBody("prosthetic"), sheet: { address: "سوق الشيوخ" } });
    same("ب.١ صاحبُ المعاينة ينقّحها ويعدّل الاستمارةَ — بسطر تدقيق",
      [p2.status, (await patientRow(a.pid)).address, (await auditRows("patient", a.pid)).length - n0], [200, "سوق الشيوخ", 1]);
    const before3 = (await patientRow(a.pid)).address;
    const p3 = await call("PATCH", `/api/medical/exams/${ok.json.id}`, S.doc2, { ...examBody("prosthetic"), sheet: { address: "البصرة" } });
    same("ب.٢ **وطبيبٌ آخر لا** — ولا يمسّ الملفّ", [p3.status, (await patientRow(a.pid)).address === before3], [403, true]);
    const n4 = (await auditRows("patient", a.pid)).length;
    const p4 = await call("PATCH", `/api/medical/exams/${ok.json.id}`, S.mgr, { ...examBody("prosthetic"), sheet: { address: "الشطرة" } });
    const au4 = await auditRows("patient", a.pid);
    same("ب.٣ **ومديرُ الفرع يصحّح** — والتدقيقُ باسمه",
      [p4.status, (await patientRow(a.pid)).address, au4.length - n4, au4[au4.length - 1]?.user_id], [200, "الشطرة", 1, MGR]);

    const itemOf = async (ep: number) => (await q(`SELECT requested_item FROM patient_device_episodes WHERE id = $1`, [ep])).rows[0].requested_item;
    //  **سعرٌ معتمَد على جهازٍ معايَن** (حالٌ تُصنَع هنا مباشرةً) ⟵ لا يتغيّر «المطلوب».
    await q(`UPDATE patient_device_episodes SET agreed_cost = 1 WHERE id = $1`, [a.epId]);
    const item0 = await itemOf(a.epId);
    const pPriced = await call("PATCH", `/api/medical/exams/${ok.json.id}`, S.doc, { ...examBody("prosthetic"), requestedItem: item0 === "socket" ? "full_device" : "socket" });
    same("ب.٤ **وبسعرٍ معتمَد لا يتغيّر «المطلوب»** — يُقال ولا يُكتب، والتنقيحُ يُحفَظ",
      [pPriced.status, /لم يتغيّر «المطلوب»/.test(pPriced.json?.sheetNote ?? ""), await itemOf(a.epId)], [200, true, item0]);
    await q(`UPDATE patient_device_episodes SET agreed_cost = 0 WHERE id = $1`, [a.epId]);
    const fid = Number((await q(`SELECT id FROM post_exam_followups WHERE patient_id = $1 ORDER BY id DESC LIMIT 1`, [a.pid])).rows[0]?.id);
    const sold = await call("POST", `/api/followups/${fid}/complete-sale`, S.recv, { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT, deviceSpecs: SALE_SPECS });
    const item1 = await itemOf(a.epId);
    //  **والبيعُ المجانيّ سعرُه صفر** — فتُصفَّر هنا ليحرسه الحالُ وحده (`in_manufacturing`).
    await q(`UPDATE patient_device_episodes SET agreed_cost = 0 WHERE id = $1`, [a.epId]);
    const p5 = await call("PATCH", `/api/medical/exams/${ok.json.id}`, S.doc, { ...examBody("prosthetic"), requestedItem: item1 === "socket" ? "full_device" : "socket" });
    same("ب.٥ **وبعد البيع وأمرِ التصنيع لا يتغيّر «المطلوب»** — ولو كان مجانياً",
      [sold.status, p5.status, /لم يتغيّر «المطلوب»/.test(p5.json?.sheetNote ?? ""), await itemOf(a.epId)], [200, 200, true, item1]);

    console.log("\n── ج. ما لا يمسّه ──");
    const other = await sheetPatient("medical_support", "جار");
    const c = await sheetPatient("medical_support", "منى");
    const otherPhone = (await patientRow(other.pid)).phone;
    const rc = await call("POST", `/api/medical/patients/${c.pid}/exams`, S.doc, {
      ...examBody("medical_support", { prescription: { supportType: "مشد ظهر", injurySide: "يمين" } }),
      deviceEpisodeId: c.epId, sheet: { phone: otherPhone, address: "الكاظمية" },
    });
    same("ج.١ **رقمٌ محجوزٌ لمريضٍ آخر ⟵ المعاينةُ تُحفَظ ويُقال إن التعديل لم يُحفظ** — والملفُّ كما كان كلُّه",
      [rc.status, /لم تُحفظ تعديلاتُ بيانات المريض: رقم الهاتف مسجَّل لمريضٍ آخر/.test(rc.json?.sheetNote ?? ""), (await patientRow(c.pid)).address],
      [200, true, "الكرادة"]);
    const ph1 = await sheetPatient("physiotherapy", "علاج");
    const rp = await call("POST", `/api/medical/patients/${ph1.pid}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", diagnosis: "انزلاق غضروفي", sheet: { address: "الأعظمية" },
    });
    //  **تغيّر بقرار المالك (٢٠٢٦-١٠-٠٩، §4.da)**: كان العلاجُ الطبيعيُّ لا يُعايَن على استمارة فتُتجاهَل حقولُها؛ وصار على استمارته
    //  هو — فتعديلُ الفاحص لحقول الاستعلامات يُكتب ويُدقَّق باسمه كالأجهزة بالقاعدة نفسِها. (حرّاسُه في `test:physio-exam-sheet`.)
    same("ج.٢ **والعلاجُ الطبيعيُّ على استمارته** — تعديلُ الفاحص يُكتب ويُدقَّق كالأجهزة (§4.da)", [rp.status, (await patientRow(ph1.pid)).address, (await auditRows("patient", ph1.pid)).length],
      [200, "الأعظمية", 1]);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
