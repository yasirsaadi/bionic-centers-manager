// **«طلب معاينة جديدة» من الاستعلامات** (§4.el — طلبُ المالك ٢٠٢٦-١٠-١٧).
// `npm run test:new-exam-request` — القاعدةُ المشتركة، ثمّ البابُ الحقيقيّ `POST /api/patients/:id/new-exam-request`:
// الصلاحيةُ صلاحيةُ التسجيل، وخاناتُ الاستمارة تُكتب بعد المعاينة في هذا الباب وحده بتدقيق، والطلبُ يصل «معايناتي» —
// والعلاجُ الطبيعيّ (ترحيل ١٥٤) طلبٌ كامل عارٍ يُغلقه توقيعُ المعاينة التالية ويُلغى — **ويُرجَع** (§4.gu، قرارُ المالك ٢٠٢٦-١١-٢٢، وكان «لا يُرجَع»).
// وقسم «ز» (§4.gu): الإرجاعُ للعلاج الطبيعيّ (بطلبٍ وبلا طلب)، وإلغاءُ الاستعلامات للمُرجَع وإغلاقُ القسم الفارغ، والتحويلُ بين القسمين في معاملةٍ واحدة.

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
  await q(`DROP TRIGGER IF EXISTS ner_fail_routing ON medical_review_requests`);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
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
  //  الفرعُ الأوّل فيه علاجٌ طبيعيّ (جهازٌ متوفّر — `physioOfferingBranchIds`)، والثاني لا.
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices ORDER BY id LIMIT 1`, [B1]);
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
    //  **والتوجيهُ إلى الطبيب في المعاملة نفسِها** (من مراجعة Codex): يُفشَل عمداً بمُطلِقٍ في القاعدة، فيتراجع الحفظُ كلُّه —
    //  لا جهازَ ولا زيارةَ ولا تعديلَ يلتزم بلا طلبه، فلا يفتح الإرسالُ الثاني جهازاً ثانياً.
    await q(`CREATE OR REPLACE FUNCTION ner_fail_routing_fn() RETURNS trigger AS $f$
      BEGIN IF NEW.patient_id = ${P.pid} AND NEW.service_type = 'prosthetic' THEN RAISE EXCEPTION 'ner: routing fails'; END IF; RETURN NEW; END $f$ LANGUAGE plpgsql`);
    await q(`CREATE TRIGGER ner_fail_routing BEFORE INSERT ON medical_review_requests FOR EACH ROW EXECUTE FUNCTION ner_fail_routing_fn()`);
    const ep8 = await episodes(P.pid), v8 = await examVisits(P.pid);
    const c8 = await nexr(P.pid, S.recv, { department: "prosthetic", requestedItems: ["socket"], fields: { age: "44" } });
    const after8 = [await episodes(P.pid) - ep8, await examVisits(P.pid) - v8, (await row(P.pid)).age];
    await q(`DROP TRIGGER IF EXISTS ner_fail_routing ON medical_review_requests`);
    same("ج.٨ **فشلُ التوجيه يُرجع الحفظَ كلَّه** — لا جهازَ ولا زيارةَ ولا عمرَ جديد",
      [c8.status, ...after8], [500, 0, 0, "42"]);

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
    //  القسمُ فُتح قبل شهر — فصفُّ الطلب يجب أن يقول «منذ الطلب» لا «منذ فتح القسم» (سؤالُ المالك عن مصطفى، ٢٠٢٦-١٠-١٧).
    await q(`UPDATE patient_cases SET created_at = NOW() - interval '30 days' WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [F.pid]);
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
    //  **قرارُ المالك ٢٠٢٦-١١-٢٢ (§4.gu) قلب هذا التأكيد**: كان «ولا إرجاعَ له»، وصار طلبُ العلاج الطبيعيّ يُرجَع كالأطراف والمساند —
    //  للطبيب ولأخصائيّ العلاج الطبيعيّ معاً.
    same("د.٥ **ويعود إلى «معايناتي»** وشارةِ الانتظار — **و«إرجاع للاستعلامات» له** للطبيب وللأخصائيّ (§4.gu)",
      [(await pendingOf(F.pid))?.includes("physiotherapy"), wlF !== null, wlFdoc?.reviewKind,
        wlFdoc?.returnableRequestId === Number(d3.json?.reviewRequestId), wlF?.returnableRequestId === Number(d3.json?.reviewRequestId)],
      [true, true, "other", true, true]);
    same("د.٥ب **وينتظر منذ الطلب لا منذ فتح القسم قبل شهر** — فيكون أوّلَ «الأحدث أولاً» في «معايناتي»",
      wlF?.waitingSince ? Date.now() - new Date(wlF.waitingSince).getTime() < 120_000 : null, true);
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
    //  **والعلاجُ الطبيعيّ في فروعه وحدها** (من مراجعة Codex) — الفرعُ النشط بلا جهازٍ متوفّر يُردّ، والطلبُ المباشر لا يتجاوزه.
    await q(`UPDATE physio_device_branches SET available = false WHERE branch_id = $1`, [B1]);
    const r12 = (await physioReqs(F.pid)).length;
    const d12 = await nexr(F.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم في الكتف" } });
    const after12 = [(await physioReqs(F.pid)).length - r12, (await row(F.pid)).pc];
    await q(`UPDATE physio_device_branches SET available = true WHERE branch_id = $1`, [B1]);
    same("د.١٢ **فرعٌ بلا علاجٍ طبيعيّ لا يُرسَل منه** — ٤٠٠ بخانة الفرع، ولا طلبَ ولا «سبب مراجعة» يُكتب",
      [d12.status, d12.json?.field, ...after12], [400, "branchId", 0, "ألم جديد في الرقبة"]);
    //  **وإلغاءُ المعاينة يعيد طلبَها إلى «معايناتي» منذ الإلغاء** (من مراجعة Codex على #660): الطلبُ أُرسل، ووُقّعت معاينتُه،
    //  ثمّ أُلغيت — فدخل الطابورَ لحظةَ الإلغاء، ولا يهبط آخرَ «الأحدث أولاً» بتاريخ إرساله. (والمعاينةُ الموقّعة مختومةٌ لا يُرجَع
    //  تاريخُها، فيُقاس بلحظة الإلغاء المكتوبة في القاعدة؛ وثانيتان بين الإرسال والإلغاء تجعلان الفرقَ أوضحَ من دقّة الساعة.)
    await new Promise((r) => setTimeout(r, 2000));
    const d13 = await call("POST", `/api/medical/exams/${Number(s2.json?.id)}/cancel`, S.admin, { reason: "وُقّعت على المريض الخطأ" });
    const cancelledAt = (await q(`SELECT cancelled_at FROM medical_exam_cancellations WHERE exam_id = $1`, [Number(s2.json?.id)])).rows[0]?.cancelled_at;
    const sentAt = (await q(`SELECT created_at FROM medical_review_requests WHERE id = $1`, [Number(reqs7[0]?.id)])).rows[0]?.created_at;
    const wl13 = await worklistRow(S.spec, F.pid, "physiotherapy");
    const at13 = wl13?.waitingSince ? new Date(wl13.waitingSince).getTime() : NaN;
    same("د.١٣ **إلغاءُ المعاينة يعيد طلبَها منتظراً منذ الإلغاء** لا منذ إرساله — فيكون أوّلَ «الأحدث أولاً»",
      [d13.status, (d13.json?.requestsReopened ?? []).length, wl13 !== null,
        new Date(cancelledAt).getTime() - new Date(sentAt).getTime() > 1500, at13 >= new Date(cancelledAt).getTime() - 5],
      [200, 1, true, true, true]);

    //  **الصفُّ بفرع طلبه لا بفرع القسم** (طلبُ المالك ٢٠٢٦-١١-١٧ — مريضةُ ذي قار أُتيح ملفُّها لبغداد فطلبت بغدادُ المعاينة):
    //  قسمُ العلاج الطبيعيّ مسجَّلٌ في الفرع الآخر، والاستعلاماتُ في B1 تطلب ⟵ «معايناتي» تقول B1، وأخصائيُّ B1 يراه.
    {
      const G = await mkPatient("هدى", "physiotherapy");
      const sG = await signPhysio(G.pid);
      check(sG.status === 200, "تهيئة: المعاينةُ الأولى لهدى", JSON.stringify(sG.json));
      await q(`UPDATE patient_cases SET branch_id = $2 WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [G.pid, B2]);
      const dG = await nexr(G.pid, S.recv, { department: "physiotherapy" });
      const wlG = await worklistRow(S.spec, G.pid, "physiotherapy");
      same("د.١٤ **طلبٌ من فرعٍ غير فرع القسم ⟵ «معايناتي» بفرع الطلب**، ويراه أخصائيُّ ذلك الفرع",
        [dG.status, wlG !== null, wlG?.branchId, wlG?.branchName], [201, true, B1, "فرع طلب المعاينة"]);
    }

    // ══ ز. المُرجَعون: الإرجاعُ للعلاج الطبيعيّ، والإلغاءُ، والتحويل (§4.gu) ══
    console.log("\n── ز. المُرجَعون من الطبيب: العلاج الطبيعي والإلغاء والتحويل ──");
    const returnedRows = async (pid: number, sx = S.recv) =>
      ((await call("GET", "/api/medical-review/returned", sx)).json?.rows ?? []).filter((r: any) => r.patientId === pid);
    const caseOf = async (pid: number, t: string) =>
      (await q(`SELECT id, status FROM patient_cases WHERE patient_id = $1 AND case_type = $2`, [pid, t])).rows[0] ?? null;
    const reqOf = async (id: number) =>
      (await q(`SELECT status, decision, doctor_note AS note, service_type AS st FROM medical_review_requests WHERE id = $1`, [id])).rows[0];
    const registryPending = async (pid: number) =>
      ((await call("GET", "/api/medical/pending", S.recv)).json?.pending?.[pid] ?? []).includes("physiotherapy");
    const closeReturned = (rid: number, sx: string, reason: string) =>
      call("POST", `/api/medical-review/requests/${rid}/close-returned`, sx, { reason });
    const returnImplicit = (pid: number, sx: string, reason: unknown) =>
      call("POST", `/api/medical-review/patients/${pid}/return-implicit`, sx, { reason, serviceType: "physiotherapy" });

    //  ز.أ — طلبٌ صريح (القاعدةُ ②): مريضٌ عُويِن ثمّ طُلبت له معاينةٌ جديدة.
    const K = await mkPatient("كوثر", "physiotherapy");
    check((await signPhysio(K.pid)).status === 200, "تهيئة: المعاينةُ الأولى لكوثر");
    const kReq = await nexr(K.pid, S.recv, { department: "physiotherapy" });
    const kRid = Number(kReq.json?.reviewRequestId);
    const kWl = await worklistRow(S.spec, K.pid, "physiotherapy");
    same("ز.١ **صفُّ الطلب الصريح يحمل رقمَه للإرجاع** — للأخصائيّ أيضاً لا للطبيب وحده", [kReq.status, kWl?.returnableRequestId], [201, kRid]);
    const kRet = await call("POST", `/api/medical-review/requests/${kRid}/return`, S.spec, { reason: "القسم خطأ — أطراف" });
    const kListed = await returnedRows(K.pid);
    same("ز.٢ **الأخصائيُّ يُرجعه** ⟵ في «المُرجَعون» للاستعلامات وللأخصائيّ، وخارجَ «معايناتي» والشارة",
      [kRet.status, kListed.map((r: any) => [r.requestId, r.serviceType]), (await returnedRows(K.pid, S.spec)).length,
        await worklistRow(S.spec, K.pid, "physiotherapy"), await worklistRow(S.doc, K.pid, "physiotherapy"), (await pendingOf(K.pid))?.includes("physiotherapy")],
      [200, [[kRid, "physiotherapy"]], 1, null, null, false]);
    const kNoReason = await closeReturned(kRid, S.recv, "  ");
    const kOther = await closeReturned(kRid, S.other, "لا يحتاج");
    same("ز.٣ **إلغاءُ الاستعلامات بسببٍ إلزاميّ** — بلا سبب ٤٠٠، ومن فرعٍ آخر لا يراه ٤٠٩، وبلا صلاحية ٤٠٣",
      [kNoReason.status, kOther.status, (await closeReturned(kRid, S.noadd, "x")).status, (await reqOf(kRid)).status],
      [400, 409, 403, "returned"]);
    const kCancel = await closeReturned(kRid, S.recv, "لا يحتاج معاينة");
    const kr = await reqOf(kRid);
    same("ز.٤ **الاستعلاماتُ يُلغيه** — قرارُ الطبيب وسببُه باقيان، **والقسمُ لا يُغلق** (فيه معاينةٌ موقّعة)",
      [kCancel.status, kr.status, kr.decision, /القسم خطأ/.test(kr.note), /لا يحتاج معاينة/.test(kr.note), kCancel.json?.caseClosed,
        typeof kCancel.json?.caseKeptBecause, (await caseOf(K.pid, "physiotherapy"))?.status, (await returnedRows(K.pid)).length],
      [200, "cancelled", "return_to_reception", true, true, false, "string", "active", 0]);

    //  ز.ب — صفٌّ بلا طلبٍ قطّ (القاعدةُ ③): مريضٌ جديد لم يُعايَن.
    const H1 = await mkPatient("هيفاء", "physiotherapy");
    const h1Wl = await worklistRow(S.spec, H1.pid, "physiotherapy");
    same("ز.٥ **الصفُّ بلا طلب يُرجَع ببابه** — `returnableImplicit` بلا رقم طلب، وهو في الشاشات الثلاث",
      [h1Wl?.returnableImplicit, "returnableRequestId" in (h1Wl ?? {}), await registryPending(H1.pid), (await pendingOf(H1.pid))?.includes("physiotherapy")],
      [true, false, true, true]);
    same("ز.٦ **ولا يُرجعه الاستعلامات** ⟵ ٤٠٣ · وبلا سبب ⟵ ٤٠٠ · ولا طلبَ يُكتب",
      [(await returnImplicit(H1.pid, S.recv, "x")).status, (await returnImplicit(H1.pid, S.spec, " ")).status, (await physioReqs(H1.pid)).length],
      [403, 400, 0]);
    const h1Ret = await returnImplicit(H1.pid, S.spec, "ليس مريض علاج طبيعي");
    const h1Reqs = await physioReqs(H1.pid);
    same("ز.٧ **الأخصائيُّ يُرجعه** ⟵ طلبٌ مُرجَعٌ عارٍ بقراره، وخارجَ المواضع الثلاثة، وفي «المُرجَعون»",
      [h1Ret.status, h1Reqs.map((r: any) => [r.status, r.path, r.ep]), (await reqOf(Number(h1Ret.json?.requestId))).decision,
        await worklistRow(S.spec, H1.pid, "physiotherapy"), await worklistRow(S.doc, H1.pid, "physiotherapy"),
        await registryPending(H1.pid), (await pendingOf(H1.pid))?.includes("physiotherapy"),
        (await returnedRows(H1.pid)).map((r: any) => r.serviceType)],
      [200, [["returned", "full", null]], "return_to_reception", null, null, false, false, ["physiotherapy"]]);
    same("ز.٨ ومرّةً ثانية ⟵ ٤٠٩ ولا طلبٌ ثانٍ", [(await returnImplicit(H1.pid, S.spec, "x")).status, (await physioReqs(H1.pid)).length], [409, 1]);
    const h1Cancel = await closeReturned(Number(h1Ret.json?.requestId), S.recv, "أُدخل خطأً");
    same("ز.٩ **إلغاءُ الاستعلامات والقسمُ فارغ ⟵ يُغلق تلقائياً** بسطر تدقيق — ولا يعود إلى أيّ قائمة",
      [h1Cancel.status, h1Cancel.json?.caseClosed, (await caseOf(H1.pid, "physiotherapy"))?.status,
        Number((await q(`SELECT COUNT(*)::int n FROM audit_log WHERE entity_type = 'patient_case' AND entity_id = $1 AND user_id = $2
          AND notes LIKE 'إغلاق تلقائي لقسم%'`, [(await caseOf(H1.pid, "physiotherapy"))?.id, RECV])).rows[0].n),
        (await returnedRows(H1.pid)).length, await worklistRow(S.spec, H1.pid, "physiotherapy"), await registryPending(H1.pid)],
      [200, true, "closed", 1, 0, null, false]);

    const H2 = await mkPatient("حنان", "physiotherapy");
    const h2Ret = await returnImplicit(H2.pid, S.spec, "القسم خطأ");
    await q(`INSERT INTO visits (patient_id, branch_id, case_id, details) VALUES ($1, $2, $3, 'جلسة علاج طبيعي')`,
      [H2.pid, B1, (await caseOf(H2.pid, "physiotherapy"))?.id]);
    const h2Cancel = await closeReturned(Number(h2Ret.json?.requestId), S.recv, "يكمل جلساته");
    same("ز.١٠ **وقسمٌ فيه جلسة ⟵ يبقى مفتوحاً** ويُلغى الطلبُ وحده — **ولا يعود إلى «معايناتي»** (قرارُ الطبيب باقٍ)",
      [h2Ret.status, h2Cancel.status, h2Cancel.json?.caseClosed, /زيارات|جلسات/.test(h2Cancel.json?.caseKeptBecause ?? ""),
        (await caseOf(H2.pid, "physiotherapy"))?.status, await worklistRow(S.spec, H2.pid, "physiotherapy"),
        await registryPending(H2.pid), (await pendingOf(H2.pid))?.includes("physiotherapy")],
      [200, 200, false, true, "active", null, false, false]);
    const h2Again = await nexr(H2.pid, S.recv, { department: "physiotherapy" });
    same("ز.١١ **ويعود بطلبٍ صريح وحده** — «طلب معاينة جديدة» يُقبل ويعيده إلى «معايناتي» برقم طلبه",
      [h2Again.status, (await worklistRow(S.spec, H2.pid, "physiotherapy"))?.returnableRequestId], [201, Number(h2Again.json?.reviewRequestId)]);
    const h2Implicit = await returnImplicit(H2.pid, S.spec, "x");
    same("ز.١١ب **وصفٌّ له طلبٌ صريح لا يُرجَع ببابِ «بلا طلب»** — ٤٠٩ برمزه ولا طلبٌ يُكتب",
      [h2Implicit.status, h2Implicit.json?.code, (await physioReqs(H2.pid)).length], [409, "explicit_request_exists", 2]);

    //  ز.ج — التحويل: علاجٌ طبيعيّ ⟵ أطراف، والقسمُ القديم فارغ.
    const T = await mkPatient("تماضر", "physiotherapy");
    const tRid = Number((await returnImplicit(T.pid, S.spec, "مريضة أطراف لا علاج طبيعي")).json?.requestId);
    const tr = await nexr(T.pid, S.recv, {
      department: "prosthetic", requestedItems: ["full_device"], replacesRequestId: tRid,
      fields: { amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة" },
    });
    if (tr.status !== 201) console.log("   ردّ التحويل:", tr.status, JSON.stringify(tr.json));
    const tEp = (await q(`SELECT e.status, c.case_type AS st FROM patient_device_episodes e JOIN patient_cases c ON c.id = e.case_id
      WHERE e.id = $1`, [Number(tr.json?.episodeId) || 0])).rows[0];
    same("ز.١٢ **التحويلُ إلى الأطراف** — جهازٌ ينتظر المعاينة في قسمٍ فُتح له وعلمُه، والطلبُ المُرجَع أُلغي، **والعلاجُ الطبيعيّ الفارغ أُغلق**",
      [tr.status, tr.json?.replacedRequestId, tr.json?.oldCaseClosed, tEp?.st, tEp?.status, (await caseOf(T.pid, "prosthetic"))?.status,
        (await q(`SELECT is_amputee AS a FROM patients WHERE id = $1`, [T.pid])).rows[0].a,
        (await reqOf(tRid)).status, (await reqOf(tRid)).decision, (await caseOf(T.pid, "physiotherapy"))?.status],
      [201, tRid, true, "prosthetic", "awaiting_exam", "active", true, "cancelled", "return_to_reception", "closed"]);
    same("ز.١٣ ⟵ في «معايناتي» بالأطراف وحدها، وخارجَ «المُرجَعون»، وسطرُ تدقيق الإلغاء يقول «تحويل»",
      [!!(await worklistRow(S.doc, T.pid, "prosthetic")), await worklistRow(S.doc, T.pid, "physiotherapy"), (await returnedRows(T.pid)).length,
        Number((await q(`SELECT COUNT(*)::int n FROM audit_log WHERE entity_type = 'medical_review_request' AND entity_id = $1 AND user_id = $2
          AND notes LIKE '%تحويل المريض إلى قسم%'`, [tRid, RECV])).rows[0].n)],
      [true, null, 0, 1]);

    //  ز.د — التحويل: أطراف ⟵ علاجٌ طبيعيّ — فارغٌ يُغلق، وفيه دفعةٌ يبقى.
    const Q1 = await mkPatient("قاسم", "prosthetic");
    const q1Rid = Number((await q(`SELECT id FROM medical_review_requests WHERE device_episode_id = $1 AND status = 'pending'`, [Q1.epId])).rows[0].id);
    check((await call("POST", `/api/medical-review/requests/${q1Rid}/return`, S.doc, { reason: "مريض علاج طبيعي" })).status === 200, "تهيئة: الطبيبُ أرجع طلبَ قاسم");
    const tr2 = await nexr(Q1.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم الظهر" }, replacesRequestId: q1Rid });
    const q1Phys = await physioReqs(Q1.pid);
    same("ز.١٤ **التحويلُ إلى العلاج الطبيعيّ** — قسمُه يُفتح وعلمُه، وطلبُه عارٍ ينتظر، والجهازُ القديم لم يعد ينتظر، **والأطرافُ الفارغة أُغلقت**",
      [tr2.status, tr2.json?.oldCaseClosed, (await caseOf(Q1.pid, "physiotherapy"))?.status,
        (await q(`SELECT is_physiotherapy AS f FROM patients WHERE id = $1`, [Q1.pid])).rows[0].f,
        q1Phys.map((r: any) => [r.status, r.ep]), (await q(`SELECT status FROM patient_device_episodes WHERE id = $1`, [Q1.epId])).rows[0]?.status !== "awaiting_exam",
        (await reqOf(q1Rid)).status, (await caseOf(Q1.pid, "prosthetic"))?.status,
        !!(await worklistRow(S.spec, Q1.pid, "physiotherapy")), await worklistRow(S.doc, Q1.pid, "prosthetic")],
      [201, true, "active", true, [["pending", null]], true, "cancelled", "closed", true, null]);

    const Q2 = await mkPatient("قيس", "prosthetic");
    const q2Rid = Number((await q(`SELECT id FROM medical_review_requests WHERE device_episode_id = $1 AND status = 'pending'`, [Q2.epId])).rows[0].id);
    await call("POST", `/api/medical-review/requests/${q2Rid}/return`, S.doc, { reason: "علاج طبيعي" });
    await q(`INSERT INTO payments (patient_id, branch_id, amount, case_id) VALUES ($1, $2, 10000, $3)`, [Q2.pid, B1, (await caseOf(Q2.pid, "prosthetic"))?.id]);
    const tr3 = await nexr(Q2.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم الركبة" }, replacesRequestId: q2Rid });
    same("ز.١٥ **وقسمٌ فيه دفعة ⟵ يبقى مفتوحاً** — والطلبُ وحده يُلغى، والتحويلُ يقع",
      [tr3.status, tr3.json?.oldCaseClosed, typeof tr3.json?.oldCaseKeptBecause, (await caseOf(Q2.pid, "prosthetic"))?.status,
        (await reqOf(q2Rid)).status, (await physioReqs(Q2.pid)).length],
      [201, false, "string", "active", "cancelled", 1]);

    //  ز.هـ — حرّاسُ التحويل: كلُّ ردٍّ يُرجع المعاملةَ كلَّها.
    const R = await mkPatient("رنا", "prosthetic");
    const rRid = Number((await q(`SELECT id FROM medical_review_requests WHERE device_episode_id = $1 AND status = 'pending'`, [R.epId])).rows[0].id);
    await call("POST", `/api/medical-review/requests/${rRid}/return`, S.doc, { reason: "خطأ" });
    const snap = async () => [await episodes(R.pid), (await physioReqs(R.pid)).length, (await reqOf(rRid)).status,
      (await caseOf(R.pid, "prosthetic"))?.status, (await caseOf(R.pid, "physiotherapy"))?.status ?? null, (await row(R.pid)).pc];
    const s0 = await snap();
    const g1 = await nexr(R.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم" }, replacesRequestId: tRid });
    same("ز.١٦ **طلبُ مريضٍ آخر** ⟵ ٤٠٠ ولا شيءَ يُكتب", [g1.status, g1.json?.code, ...(await snap())], [400, "request_other_patient", ...s0]);
    const g2b = await nexr(R.pid, S.recv, { department: "prosthetic", requestedItems: ["foot"], replacesRequestId: rRid });
    same("ز.١٧ **ولا قسمٌ مثله** ⟵ ٤٠٠ — ولا شيءَ يُكتب", [g2b.status, g2b.json?.code, ...(await snap())], [400, "replaces_same_department", ...s0]);
    //  طلبُ المريض نفسِه لم يُرجَع (ينتظر الطبيب) ⟵ لا يُستبدَل.
    const q3 = await mkPatient("قمر", "prosthetic");
    const q3Pending = Number((await q(`SELECT id FROM medical_review_requests WHERE device_episode_id = $1 AND status = 'pending'`, [q3.epId])).rows[0].id);
    const q3e0 = await episodes(q3.pid);
    const g3 = await nexr(q3.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم" }, replacesRequestId: q3Pending });
    same("ز.١٨ **وطلبٌ لم يُرجَع** ⟵ ٤٠٩ — ولا قسمٌ يُفتح ولا طلبٌ يُكتب ولا الطلبُ يُمسّ",
      [g3.status, g3.json?.code, await episodes(q3.pid) - q3e0, (await physioReqs(q3.pid)).length, (await reqOf(q3Pending)).status,
        await caseOf(q3.pid, "physiotherapy")],
      [409, "request_not_returned", 0, 0, "pending", null]);
    await q(`CREATE OR REPLACE FUNCTION ner_fail_routing_fn() RETURNS trigger AS $f$
      BEGIN IF NEW.patient_id = ${R.pid} AND NEW.service_type = 'physiotherapy' THEN RAISE EXCEPTION 'ner: transfer fails'; END IF; RETURN NEW; END $f$ LANGUAGE plpgsql`);
    await q(`CREATE TRIGGER ner_fail_routing BEFORE INSERT ON medical_review_requests FOR EACH ROW EXECUTE FUNCTION ner_fail_routing_fn()`);
    const g4 = await nexr(R.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم" }, replacesRequestId: rRid });
    const s4 = await snap();
    await q(`DROP TRIGGER IF EXISTS ner_fail_routing ON medical_review_requests`);
    same("ز.١٩ **فشلُ الطلب الجديد يُرجع كلَّ شيء** — الطلبُ المُرجَع باقٍ، والقسمُ القديم مفتوح، ولا قسمَ جديد ولا «سبب مراجعة»",
      [g4.status, ...s4], [500, ...s0]);
    const g5 = await nexr(R.pid, S.recv, { department: "physiotherapy", fields: { presentingComplaint: "ألم" }, replacesRequestId: rRid });
    same("ز.٢٠ وبعدها التحويلُ نفسُه يمرّ", [g5.status, (await reqOf(rRid)).status, (await physioReqs(R.pid)).length], [201, "cancelled", 1]);

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
