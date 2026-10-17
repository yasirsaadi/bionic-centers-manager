// **«طلب معاينة جديدة» من الاستعلامات** (§4.el — طلبُ المالك ٢٠٢٦-١٠-١٧).
// `npm run test:new-exam-request` — القاعدةُ المشتركة، ثمّ البابُ الحقيقيّ `POST /api/patients/:id/new-exam-request`:
// الصلاحيةُ صلاحيةُ التسجيل، وخاناتُ الاستمارة تُكتب بعد المعاينة في هذا الباب وحده بتدقيق، والطلبُ يصل «معايناتي» —
// والعلاجُ الطبيعيّ (ترحيل ١٥٤) طلبٌ كامل عارٍ يُغلقه توقيعُ المعاينة التالية ويُلغى ولا يُرجَع.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "new-exam-request-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { softDeletePatient } from "./patients/trash_store";
import { allowedSheetFields, mayRequestNewExam } from "./patients/new_exam_request";
import { createReviewRequestTx } from "./medical_review/store";
import { emptyInitialAssessment } from "@shared/physio_initial_assessment";
import { EXAMINER_FIELDS } from "@shared/patient_edit_rules";
import { isExamRequestServiceType, isReviewServiceType } from "@shared/medical_review";
import { changedSheetValues, newExamDepartmentsOf, referralSubSourceChoice } from "@shared/new_exam_request";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7017;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-طلب-معاينة-جديدة";
const B1 = 8861, B2 = 8862;
const RECV = 8871, RECV_NOADD = 8872, ADMIN = 8873, DOC = 8874, SPEC = 8875, OTHER = 8876;
const IDS = [RECV, RECV_NOADD, ADMIN, DOC, SPEC, OTHER];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

const GOOD = () => ({
  ...emptyInitialAssessment(),
  investigations: ["mri"], trend: "worse", allergy: ["nka"], previousTherapy: "no",
  symptoms: "constant", painBest: 3, painWorst: 7, location: ["back"], aggravating: ["sitting"], relieving: ["rest"],
  sensation: "intact", plan: ["therapeutic_exercises"],
});

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_notes = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  // ══ ق. القاعدةُ المشتركة ══
  console.log("\n── ق. القواعد ──");
  const pros = allowedSheetFields("prosthetic"), phys = allowedSheetFields("physiotherapy"), sup = allowedSheetFields("medical_support");
  same("ق.١ **خاناتُ كلّ استمارة**: الاتّصالُ والمشتركةُ وخاناتُ القسم المختار وحده",
    [pros.has("name"), pros.has("phone"), pros.has("amputationSite"), pros.has("presentingComplaint"), pros.has("supportType"),
      phys.has("presentingComplaint"), phys.has("injuries"), phys.has("amputationSite"), sup.has("supportType"), sup.has("injurySide")],
    [true, true, true, false, false, true, true, false, true, true]);
  same("ق.٢ **ولا رايةُ واتساب ولا التصنيفُ ولا شيءٌ ممّا يكتبه الفاحص** في أيّ استمارة",
    [pros, phys, sup].map((s) => ["whatsappNotificationsEnabled", "patientClassification", ...EXAMINER_FIELDS].some((k) => s.has(k))),
    [false, false, false]);
  same("ق.٣ **الصلاحيةُ صلاحيةُ التسجيل** — المسؤولُ ومفتاحُ «إضافة مرضى»، لا «تعديل مرضى» وحده",
    [mayRequestNewExam({ isAdmin: true }), mayRequestNewExam({ permissions: { canAddPatients: true } }),
      mayRequestNewExam({ permissions: { canEditPatients: true } }), mayRequestNewExam(null)],
    [true, true, false, false]);
  same("ق.٤ **أقسامُ المريض لقائمة الزرّ** بأعلامه",
    [newExamDepartmentsOf({ isAmputee: true, isPhysiotherapy: true }), newExamDepartmentsOf({ isMedicalSupport: true }), newExamDepartmentsOf({})],
    [["prosthetic", "physiotherapy"], ["medical_support"], []]);
  same("ق.٥ **العلاجُ الطبيعيّ طلبُ معاينةٍ لا مراجعة** — يدخل الإغلاقَ بالتوقيع ولا يدخل طابورَ المراجعة",
    [isExamRequestServiceType("physiotherapy"), isReviewServiceType("physiotherapy"), isExamRequestServiceType("prosthetic"), isExamRequestServiceType("x")],
    [true, false, true, false]);
  same("ق.٦ **الورقةُ تُفتح على «كيف عرف» كما في الملفّ** — ما في القائمة يُختار، وما سواه «أخرى» بنصّه",
    [referralSubSourceChoice("فيسبوك"), referralSubSourceChoice("صديق العائلة"), referralSubSourceChoice(""), referralSubSourceChoice("أخرى")],
    [{ choice: "فيسبوك", other: "" }, { choice: "أخرى", other: "صديق العائلة" }, { choice: "", other: "" }, { choice: "أخرى", other: "" }]);
  same("ق.٧ **ويُرسَل ما تغيّر وحده** — المسافاتُ و`null` ليست تغييراً، وتاريخُ الإصابة وحالتُه زوجٌ يُرسَلان معاً",
    [changedSheetValues({ name: "علي", age: "40", notes: null, prior: false, injuryDate: "2021-03-04", injuryDateStatus: null },
      { name: " علي ", age: "41", notes: "", prior: false, injuryDate: "2021-03-04", injuryDateStatus: null }),
      changedSheetValues({ injuryDate: "2021-03-04", injuryDateStatus: null, phone: "0770" }, { injuryDate: null, injuryDateStatus: "unknown", phone: "0770" }),
      changedSheetValues({ injuryDate: null, injuryDateStatus: "unknown" }, { injuryDate: null, injuryDateStatus: "congenital" })],
    [{ age: "41" }, { injuryDate: null, injuryDateStatus: "unknown" }, { injuryDateStatus: "congenital", injuryDate: null }]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع طلب المعاينة'), ($2, 'فرع آخر للطلب')`, [B1, B2]);
  const users: [number, string, Record<string, unknown>][] = [
    [RECV, "reception", { can_add_patients: true, can_edit_patients: false }],
    [RECV_NOADD, "reception", { can_add_patients: false, can_edit_patients: true }],
    [ADMIN, "admin", {}],
    [DOC, "doctor", { medical_specialties: '["prosthetic","medical_support","physiotherapy"]' }],
    [SPEC, "physio_specialist", {}],
    [OTHER, "reception", { can_add_patients: true, branch_id: B2, branch_ids: JSON.stringify([B2]) }],
  ];
  for (const [id, role, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `ner-${id}`, `موظّف ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) {
      await q(`UPDATE system_users SET ${k} = $2${k === "medical_specialties" || k === "branch_ids" ? "::jsonb" : ""} WHERE id = $1`, [id, v]);
    }
  }
  const sess = (id: number, role: string, perms: Record<string, unknown>, branch = B1) => hdr({
    userId: id, displayName: `موظّف ${id}`, role, roles: [role], branchId: branch, accessibleBranches: [branch], isAdmin: role === "admin",
    permissions: { canViewPatients: true, ...perms },
  });
  const S = {
    recv: sess(RECV, "reception", { canAddPatients: true }),
    noadd: sess(RECV_NOADD, "reception", { canEditPatients: true }),
    admin: sess(ADMIN, "admin", {}),
    doc: sess(DOC, "doctor", { canWriteMedicalExam: true }),
    spec: sess(SPEC, "physio_specialist", {}),
    other: sess(OTHER, "reception", { canAddPatients: true }, B2),
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
  /** مريضٌ بالاستمارة كاملةً — أطرافٌ (بطلب معاينةٍ لجهازه) أو علاجٌ طبيعيّ أو مساند. */
  async function mkPatient(label: string, kind: "prosthetic" | "physiotherapy" | "medical_support") {
    seq += 1;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, referral_notes, age, height, weight,
        medical_condition, amputation_site, branch_id, is_amputee, is_physiotherapy, is_medical_support, total_cost, patient_classification,
        governorate, address, injury_cause, injury_date, presenting_complaint, support_type, injury_side)
      VALUES ($1, $2, 'من شخص آخر', 'فيسبوك', $3, '40', '172', '78', 'x', $4, $5, $6, $7, $8, 0, 'new',
        'بغداد', 'الكرادة', 'حادث سير', '2021-03-04', $9, $10, $11) RETURNING id`,
      [`${label} ${MARK}`, `0773${String(6000000 + seq * 7919).slice(0, 7)}`, MARK,
        kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null, B1,
        kind === "prosthetic", kind === "physiotherapy", kind === "medical_support",
        kind === "physiotherapy" ? "ألم أسفل الظهر" : null,
        kind === "medical_support" ? "مسند ركبة" : null, kind === "medical_support" ? "يمين" : null])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    let epId = 0;
    if (kind !== "physiotherapy") {
      const ep = await call("POST", `/api/patients/${pid}/device-episodes`, S.recv, {
        serviceType: kind, requestedItem: "full_device", servicePath: "exam",
      });
      epId = Number(ep.json?.id);
    }
    return { pid, epId };
  }
  const nexr = (pid: number, s: string, body: Record<string, unknown>) => call("POST", `/api/patients/${pid}/new-exam-request`, s, body);
  const row = async (pid: number) => (await q(`SELECT name, age, phone, address, presenting_complaint AS pc, prosthetic_type AS pt
      FROM patients WHERE id = $1`, [pid])).rows[0];
  const count = async (t: string, p: any[]) => Number((await q(t, p)).rows[0].n);
  const episodes = (pid: number) => count(`SELECT COUNT(*)::int n FROM patient_device_episodes WHERE patient_id = $1`, [pid]);
  const examVisits = (pid: number) => count(`SELECT COUNT(*)::int n FROM visits WHERE patient_id = $1 AND details = 'طلب معاينة طبية' AND deleted_at IS NULL`, [pid]);
  const allVisits = (pid: number) => count(`SELECT COUNT(*)::int n FROM visits WHERE patient_id = $1 AND deleted_at IS NULL`, [pid]);
  const physioReqs = async (pid: number) => (await q(`SELECT id, status, requested_path AS path, review_kind AS kind, device_episode_id AS ep,
      reception_note AS note, exam_id AS exam, branch_id AS branch FROM medical_review_requests
      WHERE patient_id = $1 AND service_type = 'physiotherapy' ORDER BY id`, [pid])).rows;
  const pendingOf = async (pid: number) => (await call("GET", `/api/medical/patients/${pid}/exams`, S.recv)).json?.pending ?? null;
  const worklistRow = async (s: string, pid: number, caseType: string) =>
    ((await call("GET", "/api/medical/worklist", s)).json?.rows ?? []).find((r: any) => r.patientId === pid && r.caseType === caseType) ?? null;
  const signProsthetic = async (pid: number, epId: number) => call("POST", `/api/medical/patients/${pid}/exams`, S.doc, {
    idempotencyKey: randomUUID(), caseType: "prosthetic", deviceEpisodeId: epId,
    chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis: "بترٌ تحت الركبة الأيمن",
    prescription: { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة", prostheticType: "طرف تحت الركبة" },
  });
  const signPhysio = async (pid: number) => call("POST", `/api/medical/patients/${pid}/exams`, S.spec, {
    idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "",
    diagnosis: "ألم أسفل الظهر الميكانيكي", assessment: GOOD(), prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 10 }] },
  });

  try {
    // ══ أ. الصلاحيةُ والنطاق ══
    console.log("\n── أ. الصلاحية والنطاق ──");
    const P = await mkPatient("أحمد", "prosthetic");
    check(P.epId > 0, "تهيئة: طلبُ معاينة الجهاز الأوّل فُتح", String(P.epId));
    const signed = await signProsthetic(P.pid, P.epId);
    check(signed.status === 200, "تهيئة: الطبيبُ وقّع معاينةَ الجهاز", JSON.stringify(signed.json));
    const ep0 = await episodes(P.pid);
    const a1 = await nexr(P.pid, S.noadd, { department: "prosthetic", requestedItems: ["foot"] });
    same("أ.١ **بلا مفتاح «إضافة مرضى» لا طلب** — ولو حمل «تعديل مرضى»، ولا شيءَ يُكتب",
      [a1.status, await episodes(P.pid)], [403, ep0]);
    const a2 = await nexr(P.pid, S.other, { department: "prosthetic", requestedItems: ["foot"] });
    const a3 = await nexr(P.pid, S.recv, { department: "orthotics" });
    const a4 = await nexr(999999999, S.recv, { department: "prosthetic" });
    same("أ.٢ ولا من فرعٍ آخر · ولا بقسمٍ غير معروف · ولا لمريضٍ غير موجود",
      [a2.status, a3.status, a3.json?.field, a4.status, await episodes(P.pid)], [403, 400, "department", 404, ep0]);

    // ══ ب. الأطراف بعد المعاينة ══
    console.log("\n── ب. الأطراف والمساند ──");
    const b1 = await call("PUT", `/api/patients/${P.pid}`, S.noadd, { name: `أحمد كريم ${MARK}`, age: "42" });
    same("ب.١ تهيئة: **«تعديل مريض» يقفل الاسمَ والعمر بعد المعاينة** على الاستعلامات",
      [b1.status, b1.json?.code], [403, "PATIENT_FIELDS_LOCKED"]);
    const v0 = await examVisits(P.pid);
    const b2 = await nexr(P.pid, S.recv, {
      department: "prosthetic", requestedItems: ["foot"], receptionNote: "يريد تبديل القدم",
      fields: { name: `أحمد كريم ${MARK}`, age: "42", phone: (await row(P.pid)).phone, address: "الكرادة" },
    });
    const ep2 = (await q(`SELECT e.status, e.service_path AS path, e.requested_item AS item, c.case_type AS st
      FROM patient_device_episodes e JOIN patient_cases c ON c.id = e.case_id WHERE e.id = $1`,
      [Number(b2.json?.episodeId)])).rows[0];
    const rr2 = (await q(`SELECT status, requested_path AS path, review_kind AS kind, device_episode_id AS ep, reception_note AS note
      FROM medical_review_requests WHERE id = $1`, [Number(b2.json?.reviewRequestId)])).rows[0];
    same("ب.٢ **الطلبُ يُرسَل**: جهازٌ جديد على مسار المعاينة («المطلوب»: قدم) ومعه زيارةُ «طلب معاينة طبية»",
      [b2.status, ep2?.st, ep2?.status, ep2?.path, ep2?.item, await examVisits(P.pid) - v0], [201, "prosthetic", "awaiting_exam", "exam", "foot", 1]);
    same("ب.٣ **ويصل الطبيبَ** — طلبُ معاينةٍ كاملة على الجهاز نفسِه، وملاحظةُ الاستعلامات فيه",
      [rr2?.status, rr2?.path, rr2?.kind, Number(rr2?.ep) === Number(b2.json?.episodeId), /يريد تبديل القدم/.test(rr2?.note ?? "")],
      ["pending", "full", "new_device", true, true]);
    const r2 = await row(P.pid);
    same("ب.٤ **والاسمُ والعمرُ تغيّرا في هذا الباب** وإن كانا مقفولين على «تعديل مريض»",
      [r2.name, r2.age], [`أحمد كريم ${MARK}`, "42"]);
    const au2 = (await q(`SELECT notes, old_values AS o, new_values AS n FROM audit_log WHERE entity_type = 'patient' AND entity_id = $1
      AND user_id = $2 AND action = 'update' ORDER BY id DESC LIMIT 1`, [P.pid, RECV])).rows[0];
    same("ب.٥ **وسطرُ تدقيقٍ بالقديم والجديد** يسمّي ما تغيّر وحده ويقول من أين",
      [/من «طلب معاينة جديدة»/.test(au2?.notes ?? ""), /الاسم/.test(au2?.notes ?? ""), Object.keys(JSON.parse(au2?.n ?? "{}")).sort(),
        JSON.parse(au2?.o ?? "{}").age],
      [true, true, ["age", "name"], "40"]);
    const wlP = await worklistRow(S.doc, P.pid, "prosthetic");
    const awaiting = (await call("GET", `/api/medical/patients/${P.pid}/exams`, S.recv)).json?.awaitingEpisodes ?? [];
    same("ب.٦ **ويظهر في «معايناتي»** بجهازه — والإرجاعُ للاستعلامات متاحٌ للأطراف كما كان",
      [wlP?.episodeId === Number(b2.json?.episodeId), typeof wlP?.returnableRequestId === "number",
        awaiting.some((e: any) => Number(e.id ?? e.episodeId) === Number(b2.json?.episodeId))],
      [true, true, true]);

    const M = await mkPatient("زينب", "medical_support");
    const ms = await call("POST", `/api/medical/patients/${M.pid}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "medical_support", deviceEpisodeId: M.epId,
      chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis: "خشونة ركبة", prescription: { supportType: "مسند ركبة" },
    });
    check(ms.status === 200, "تهيئة: معاينةُ المساند وُقّعت", JSON.stringify(ms.json));
    const b7 = await nexr(M.pid, S.recv, { department: "medical_support", fields: { supportType: "مسند ظهر", injurySide: "يسار" } });
    const ep7 = (await q(`SELECT c.case_type AS st, e.status, e.requested_item AS item
      FROM patient_device_episodes e JOIN patient_cases c ON c.id = e.case_id WHERE e.id = $1`, [Number(b7.json?.episodeId)])).rows[0];
    const m7 = (await q(`SELECT support_type AS t, injury_side AS s FROM patients WHERE id = $1`, [M.pid])).rows[0];
    same("ب.٧ **والمساندُ كذلك**: جهازٌ كامل ينتظر المعاينة، ونوعُ المسند وجهتُه من الاستمارة",
      [b7.status, ep7?.st, ep7?.status, ep7?.item, m7?.t, m7?.s], [201, "medical_support", "awaiting_exam", "full_device", "مسند ظهر", "يسار"]);

    // ══ ج. حرّاسُ الخانات ══
    console.log("\n── ج. حرّاس الخانات ──");
    const ep3 = await episodes(P.pid);
    const c1 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { name: `أحمد علي ${MARK}`, prostheticType: "طرف فوق الركبة" } });
    same("ج.١ **ما يكتبه الفاحصُ ليس من الاستمارة** — يُردّ الطلبُ كلُّه بخانته، ولا اسمَ يتغيّر ولا جهاز",
      [c1.status, c1.json?.field, /يكتبها الفاحص/.test(c1.json?.message ?? ""), (await row(P.pid)).name, (await row(P.pid)).pt, await episodes(P.pid)],
      [400, "prostheticType", true, `أحمد كريم ${MARK}`, "طرف تحت الركبة", ep3]);
    const c2 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { totalCost: 5 } });
    const c2b = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { presentingComplaint: "ألم" } });
    const c2c = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { patientClassification: "old" } });
    same("ج.٢ **ولا خانةٌ من خارج استمارة القسم** — الكلفة، و«سبب المراجعة» على استمارة الأطراف، والتصنيف",
      [c2.status, c2.json?.field, c2b.status, c2b.json?.field, c2c.status, await episodes(P.pid)],
      [400, "totalCost", 400, "presentingComplaint", 400, ep3]);
    const c3 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { address: "  ", age: "43" } });
    same("ج.٣ **والاستمارةُ كاملةٌ كما في التسجيل** — العنوانُ الفارغ يُسمّى، ولا العمرُ يُكتب ولا الجهاز",
      [c3.status, c3.json?.missing, (await row(P.pid)).age, (await row(P.pid)).address, await episodes(P.pid)],
      [400, ["address"], "42", "الكرادة", ep3]);
    const c4 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["قدم"] });
    same("ج.٤ و«المطلوب» من القائمة وحدها", [c4.status, c4.json?.field, await episodes(P.pid)], [400, "requestedItem", ep3]);
    const otherPhone = (await row(M.pid)).phone;
    const c5 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { phone: otherPhone } });
    same("ج.٥ **ورقمُ مريضٍ آخر يُسأل عنه** — ٤٠٩ باسم حامله، ولا رقمَ يتغيّر ولا جهاز",
      [c5.status, c5.json?.code, (c5.json?.holders ?? []).map((h: any) => h.id), (await row(P.pid)).phone === otherPhone, await episodes(P.pid)],
      [409, "patient_phone_conflict", [M.pid], false, ep3]);
    const c6 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { phone: otherPhone },
      sharedPhone: { withPatientId: M.pid, relation: "أخت" } });
    same("ج.٦ **وبتأكيد «قريب يستعمل الرقم نفسه» يمرّ** — والرقمُ مشترك",
      [c6.status, (await row(P.pid)).phone === otherPhone,
        (await q(`SELECT phone_shared_with_patient_id AS w FROM patients WHERE id = $1`, [P.pid])).rows[0]?.w], [201, true, M.pid]);
    const c7 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], sharedPhone: { withPatientId: M.pid, relation: "جار" } });
    same("ج.٧ وصلةٌ ليست من القائمة تُردّ", [c7.status, c7.json?.field], [400, "sharedPhone"]);

    // ══ د. العلاجُ الطبيعيّ ══
    console.log("\n── د. العلاج الطبيعي ──");
    const F = await mkPatient("سعاد", "physiotherapy");
    const d1 = await nexr(F.pid, S.recv, { department: "physiotherapy" });
    same("د.١ **مريضٌ لم يُعايَن علاجُه الطبيعيّ بعد ينتظر أصلاً** — ٤٠٩ ولا طلبَ يُكتب",
      [d1.status, d1.json?.code, (await physioReqs(F.pid)).length], [409, "physio_exam_already_pending", 0]);
    const s1 = await signPhysio(F.pid);
    check(s1.status === 200, "تهيئة: الأخصائيُّ وقّع المعاينةَ الأولى", JSON.stringify(s1.json));
    same("د.٢ تهيئة: **بعد المعاينة لا بابَ يعيده** — لا انتظار، ولا صفَّ في «معايناتي»، و«تعديل مريض» يقفل «سبب المراجعة»",
      [(await pendingOf(F.pid))?.includes("physiotherapy"), await worklistRow(S.spec, F.pid, "physiotherapy"),
        (await call("PUT", `/api/patients/${F.pid}`, S.noadd, { presentingComplaint: "ألم جديد في الرقبة" })).status],
      [false, null, 403]);
    const vF = await allVisits(F.pid);
    const d3 = await nexr(F.pid, S.recv, { department: "physiotherapy", receptionNote: "عاد بعد شهرين", fields: { presentingComplaint: "ألم جديد في الرقبة", age: "51" } });
    const reqs3 = await physioReqs(F.pid);
    same("د.٣ **الطلبُ يُرسَل**: معاينةٌ كاملة عارية (بلا جهاز) سببُها «سبب المراجعة» الجديد وملاحظةُ الاستعلامات",
      [d3.status, d3.json?.episodeId, reqs3.length, reqs3[0]?.status, reqs3[0]?.path, reqs3[0]?.ep, Number(reqs3[0]?.id) === Number(d3.json?.reviewRequestId),
        /سبب المراجعة: ألم جديد في الرقبة/.test(reqs3[0]?.note ?? ""), /عاد بعد شهرين/.test(reqs3[0]?.note ?? ""), Number(reqs3[0]?.branch)],
      [201, null, 1, "pending", "full", null, true, true, true, B1]);
    same("د.٤ **ولا زيارةَ تُكتب** — زيارةُ العلاج الطبيعي تُعدّ جلسة · والخاناتُ تغيّرت",
      [await allVisits(F.pid) - vF, (await row(F.pid)).pc, (await row(F.pid)).age], [0, "ألم جديد في الرقبة", "51"]);
    const wlF = await worklistRow(S.spec, F.pid, "physiotherapy");
    const wlFdoc = await worklistRow(S.doc, F.pid, "physiotherapy");
    same("د.٥ **ويعود إلى «معايناتي»** وشارةِ الانتظار — ولا «إرجاع للاستعلامات» له (للأطراف والمساند وحدهما)",
      [(await pendingOf(F.pid))?.includes("physiotherapy"), wlF !== null, wlFdoc?.reviewKind, "returnableRequestId" in (wlFdoc ?? {})],
      [true, true, "other", false]);
    const d6 = await nexr(F.pid, S.recv, { department: "physiotherapy" });
    same("د.٦ **ولا يُطلَب مرّتين** — ٤٠٩ ما دام الأوّلُ ينتظر", [d6.status, d6.json?.code, (await physioReqs(F.pid)).length],
      [409, "physio_exam_already_pending", 1]);
    const s2 = await signPhysio(F.pid);
    const reqs7 = await physioReqs(F.pid);
    same("د.٧ **وتوقيعُ المعاينة التالية يُغلقه** بهويّتها — فيخرج من «معايناتي»",
      [s2.status, reqs7[0]?.status, Number(reqs7[0]?.exam) === Number(s2.json?.id), (await pendingOf(F.pid))?.includes("physiotherapy"),
        await worklistRow(S.spec, F.pid, "physiotherapy")],
      [200, "examined", true, false, null]);
    const d8 = await nexr(F.pid, S.recv, { department: "physiotherapy" });
    same("د.٨ **فطلبٌ ثانٍ بعدها يُقبل**", [d8.status, (await physioReqs(F.pid)).filter((r: any) => r.status === "pending").length], [201, 1]);
    const d9 = await call("POST", "/api/medical/worklist/cancel-request", S.spec, { patientId: F.pid, caseType: "physiotherapy", reason: "أُرسل خطأً" });
    const reqs9 = await physioReqs(F.pid);
    same("د.٩ **و«إلغاء المعاينة» يسحبه** — لا يبقى منتظراً، ولا صفَّ في «معايناتي»",
      [d9.status, (d9.json?.cancelledRequestIds ?? []).includes(Number(d8.json?.reviewRequestId)),
        reqs9.filter((r: any) => r.status === "pending").length, await worklistRow(S.spec, F.pid, "physiotherapy")],
      [200, true, 0, null]);
    const d10 = await nexr(P.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم في الظهر" } });
    same("د.١٠ **ومريضٌ بلا قسم علاجٍ طبيعيّ يُردّ** — ولا يُكتب «سبب المراجعة» (المعاملةُ كلُّها تتراجع)",
      [d10.status, /إضافة خدمة جديدة/.test(d10.json?.message ?? ""), (await row(P.pid)).pc, (await physioReqs(P.pid)).length], [400, true, null, 0]);
    const d11 = await nexr(F.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: " " } });
    same("د.١١ و«سبب المراجعة» إلزاميٌّ في استمارته", [d11.status, d11.json?.missing], [400, ["presentingComplaint"]]);

    // ══ هـ. الشكلُ الواحد في القاعدة والمخزن ══
    console.log("\n── هـ. الشكل ──");
    //  مريضان لهذا القسم وحده — فلا يقيس أحدُ الحارسَين أثرَ الآخر (فهرسُ التفرّد العاري).
    const G1 = await mkPatient("هدى", "physiotherapy"), G2 = await mkPatient("ليلى", "physiotherapy");
    let dbErr = "";
    try {
      await q(`INSERT INTO medical_review_requests (patient_id, service_type, requested_path, review_kind, status) VALUES ($1, 'physiotherapy', 'quick', 'other', 'pending')`, [G1.pid]);
    } catch (e: any) { dbErr = String(e?.constraint ?? e?.message ?? e); }
    same("هـ.١ **القاعدةُ ترفض طلبَ علاجٍ طبيعيّ سريعاً**", dbErr, "medical_review_requests_physio_shape_check");
    const tryStore = async (p: Record<string, unknown>) => {
      try {
        await db.transaction(async (tx) => {
          await createReviewRequestTx(tx, {
            patientId: G2.pid, serviceType: "physiotherapy", requestedPath: "full", reviewKind: "other", receptionNote: "", createdBy: RECV,
            branchIds: [B1], sessionBranchId: B1, ...p,
          } as any);
          throw new Error("rollback");
        });
        return "ok";
      } catch (e: any) { return e?.message === "rollback" ? "created" : `${e?.status ?? ""} ${e?.message ?? e}`; }
    };
    same("هـ.٢ **والمخزنُ لا يفتحه إلّا هذا الباب** — بلا علامته يُردّ، وبها سريعاً يُردّ، وبها كاملاً يُنشأ",
      [(await tryStore({})).startsWith("400"), (await tryStore({ physioExamRequest: true, requestedPath: "quick" })).startsWith("400"),
        await tryStore({ physioExamRequest: true })],
      [true, true, "created"]);

    // ══ و. السلّة ══
    console.log("\n── و. السلّة ──");
    await softDeletePatient({ patientId: M.pid, reason: "اختبار", actor: { userId: ADMIN, isAdmin: true, role: "admin", scope: null } as any });
    const w1 = await nexr(M.pid, S.recv, { department: "medical_support" });
    same("و.١ **ولا لمريضٍ في السلّة** — يُقال «في السلّة» لا «غير موجود»", [w1.status, /المحذوفات/.test(w1.json?.message ?? "")], [409, true]);
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\nكلُّ التأكيدات نجحت." : `\n${failures} تأكيداً سقط.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch { /* */ }
  process.exit(1);
});
