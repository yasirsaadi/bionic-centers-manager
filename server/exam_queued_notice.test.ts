// **«أصبح المريض في «معايناتي»» لمَن أدخله** (§4.em — طلبُ المالك ٢٠٢٦-١٠-١٧).
// `npm run test:exam-queued-notice` — العقدُ المشترك، ثمّ الأبوابُ الحقيقية: كلُّ ردٍّ ناجح أدخل مريضاً «معايناتي» يحمل الترويسةَ
// `X-Exam-Queued` باسمه وقسمه (فتفتح الواجهةُ نافذةً لا تُغلق إلّا بـ«حسناً»)، وما لم يُدخل أحداً — أو فشل أو تراجع — لا يحملها.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "exam-queued-notice-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { noteExamQueued } from "./medical/exam_queued_notice";
import { emptyInitialAssessment } from "@shared/physio_initial_assessment";
import {
  EXAM_QUEUED_HEADER, decodeExamQueued, encodeExamQueued, mergeExamQueued, type ExamQueuedNotice,
} from "@shared/exam_queued_notice";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7018;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-نافذة-معايناتي";
const B1 = 8881;
const RECV = 8891, ADMIN = 8892, DOC = 8893, SPEC = 8894;
const IDS = [RECV, ADMIN, DOC, SPEC];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_notes = $1 OR referral_sub_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DROP TRIGGER IF EXISTS eqn_fail_routing ON medical_review_requests`);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ ق. العقدُ المشترك ══
  console.log("\n── ق. العقد ──");
  const a: ExamQueuedNotice = { patientId: 5, patient: "علي حسن (WB-00005)", department: "الأطراف الصناعية" };
  const b: ExamQueuedNotice = { patientId: 5, patient: "علي حسن (WB-00005)", department: "العلاج الطبيعي" };
  const c: ExamQueuedNotice = { patientId: 7, patient: "زينب", department: "المساند الطبية" };
  same("ق.١ **الترميزُ يحفظ العربيةَ كما هي** — ذهاباً وإياباً، والترويسةُ نصٌّ لاتينيّ",
    [decodeExamQueued(encodeExamQueued([a, c])), /^[\x21-\x7e]+$/.test(encodeExamQueued([a, c]))], [[a, c], true]);
  same("ق.٢ **المريضُ نفسُه في القسم نفسِه سطرٌ واحد** — وقسمٌ آخر له سطرُه، والترتيبُ ترتيبُ الوصول",
    mergeExamQueued([a], [a, b, c, b]), [a, b, c]);
  same("ق.٣ **والتالفُ لا يرمي** — فارغٌ أو ليس قائمةً أو شكلٌ غريب ⟵ يسقط وحده",
    [decodeExamQueued(null), decodeExamQueued(""), decodeExamQueued("%E0%A4%A"), decodeExamQueued(encodeURIComponent('{"x":1}')),
      decodeExamQueued(encodeURIComponent(JSON.stringify([a, { patientId: "5", patient: "x", department: "" }, { patientId: 9, patient: " ", department: "" }])))],
    [[], [], [], [], [a]]);
  let threw = false;
  try { noteExamQueued(a); } catch { threw = true; }
  check(!threw, "ق.٤ **وخارجَ طلبٍ لا شيء** — كرونٌ أو سكربتٌ يُدخل مريضاً لا يرمي ولا يُعلن");

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع نافذة المعاينات')`, [B1]);
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices ORDER BY id LIMIT 1`, [B1]);
  const users: [number, string, Record<string, unknown>][] = [
    [RECV, "reception", { can_add_patients: true }],
    [ADMIN, "admin", {}],
    [DOC, "doctor", { medical_specialties: '["prosthetic","medical_support","physiotherapy"]' }],
    [SPEC, "physio_specialist", {}],
  ];
  for (const [id, role, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `eqn-${id}`, `موظّف ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) {
      await q(`UPDATE system_users SET ${k} = $2${k === "medical_specialties" ? "::jsonb" : ""} WHERE id = $1`, [id, v]);
    }
  }
  const sess = (id: number, role: string, perms: Record<string, unknown>) => hdr({
    userId: id, displayName: `موظّف ${id}`, role, roles: [role], branchId: B1, accessibleBranches: [B1], isAdmin: role === "admin",
    permissions: { canViewPatients: true, ...perms },
  });
  const S = {
    recv: sess(RECV, "reception", { canAddPatients: true, canEditPatients: true }),
    admin: sess(ADMIN, "admin", {}),
    doc: sess(DOC, "doctor", { canWriteMedicalExam: true }),
    spec: sess(SPEC, "physio_specialist", {}),
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
  /** الردُّ ومعه ما في ترويسة النافذة — مقروءةً كما تقرؤها الواجهة (`main.tsx`). */
  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    const raw = r.headers.get(EXAM_QUEUED_HEADER);
    return { status: r.status, json, raw, queued: decodeExamQueued(raw) };
  };
  const shown = (r: { queued: ExamQueuedNotice[] }) => r.queued.map((n) => [n.patientId, n.patient, n.department]);
  const code = async (pid: number) => String((await q(`SELECT patient_code FROM patients WHERE id = $1`, [pid])).rows[0]?.patient_code ?? "");
  const who = async (pid: number, name: string) => { const c = await code(pid); return c ? `${name} (${c})` : name; };

  let seq = 0;
  /** مريضٌ قائم بلا طلب — أطرافٌ أو مساندُ أو علاجٌ طبيعيّ، يُدرَج مباشرةً فلا يمرّ بأيّ باب. */
  async function mkPatient(label: string, kind: "prosthetic" | "physiotherapy" | "medical_support") {
    seq += 1;
    const name = `${label} ${MARK}`;
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, referral_notes, age, height, weight,
        medical_condition, amputation_site, branch_id, is_amputee, is_physiotherapy, is_medical_support, total_cost, patient_classification,
        governorate, address, injury_cause, injury_date, presenting_complaint, support_type, injury_side)
      VALUES ($1, $2, 'من شخص آخر', 'فيسبوك', $3, '40', '172', '78', 'x', $4, $5, $6, $7, $8, 0, 'new',
        'بغداد', 'الكرادة', 'حادث سير', '2021-03-04', $9, $10, $11) RETURNING id`,
      [name, `0774${String(5000000 + seq * 7919).slice(0, 7)}`, MARK,
        kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null, B1,
        kind === "prosthetic", kind === "physiotherapy", kind === "medical_support",
        kind === "physiotherapy" ? "ألم أسفل الظهر" : null,
        kind === "medical_support" ? "مسند ركبة" : null, kind === "medical_support" ? "يمين" : null])).rows[0].id);
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    return { pid, name };
  }
  const openDevice = (pid: number, serviceType: string, s = S.recv) => call("POST", `/api/patients/${pid}/device-episodes`, s, {
    serviceType, requestedItem: "full_device", servicePath: "exam",
  });
  const worklistHas = async (pid: number, caseType: string) =>
    ((await call("GET", "/api/medical/worklist", S.doc)).json?.rows ?? []).some((r: any) => r.patientId === pid && r.caseType === caseType);

  try {
    // ══ أ. التسجيل ══
    console.log("\n── أ. التسجيل ──");
    const reg = await call("POST", "/api/patients", S.recv, {
      intakeSheet: true, department: "physiotherapy", branchId: B1,
      name: `سارة ${MARK}`, phone: "07719870001", hadPriorCenterHistory: false,
      governorate: "بغداد", address: "الكرادة", referralSource: "من شخص آخر", referralSubSource: MARK,
      presentingComplaint: "ألمٌ في أسفل الظهر منذ شهر", age: "35", weight: "60", height: "160",
      injuryCause: "غير معروف", injuryDate: null, injuryDateStatus: "unknown", generalNotes: "", totalCost: 0, whatsappNotificationsEnabled: false,
    });
    const regId = Number(reg.json?.id);
    same("أ.١ **تسجيلُ مراجعٍ بالاستمارة يُعلَن**: الحفظُ نفسُه يحمل اسمَه برمزه وقسمَه — ويظهر في «معايناتي» فعلاً",
      [reg.status, shown(reg), await worklistHas(regId, "physiotherapy")],
      [201, [[regId, await who(regId, `سارة ${MARK}`), "العلاج الطبيعي"]], true]);
    const regBad = await call("POST", "/api/patients", S.recv, {
      intakeSheet: true, department: "physiotherapy", branchId: B1, name: `ناقص ${MARK}`, phone: "07719870002",
      governorate: "", address: "", referralSource: "", referralSubSource: MARK, presentingComplaint: "",
      age: "30", weight: "60", height: "160", injuryCause: "", injuryDate: null, injuryDateStatus: null, totalCost: 0, whatsappNotificationsEnabled: false,
    });
    same("أ.٢ **والمردودُ لا يُعلَن** — استمارةٌ ناقصة ٤٠٠ بلا ترويسة", [regBad.status, regBad.raw], [400, null]);

    // ══ ب. طلبُ الجهاز («يحتاج معاينة طبية» — الصيانةُ والجزءُ والجهازُ الكامل) ══
    console.log("\n── ب. طلب الجهاز ──");
    const P = await mkPatient("أحمد", "prosthetic");
    const b1 = await openDevice(P.pid, "prosthetic");
    same("ب.١ **«يحتاج معاينة طبية» يُعلَن**: طلبُ جهازٍ على مسار المعاينة — «الأطراف الصناعية»",
      [b1.status, shown(b1), await worklistHas(P.pid, "prosthetic")], [201, [[P.pid, await who(P.pid, P.name), "الأطراف الصناعية"]], true]);
    const M = await mkPatient("زينب", "medical_support");
    const b2 = await openDevice(M.pid, "medical_support");
    same("ب.٢ **والمساندُ كذلك** — «المساند الطبية»", [b2.status, shown(b2)], [201, [[M.pid, await who(M.pid, M.name), "المساند الطبية"]]]);
    const b3 = await call("POST", `/api/patients/${P.pid}/device-episodes`, S.recv, { serviceType: "prosthetic", requestedItem: "full_device" });
    same("ب.٣ **وبلا مسارٍ محدَّد يُردّ ولا يُعلَن**", [b3.status, b3.raw], [400, null]);

    // ══ ج. ما لا يُدخل «معايناتي» لا يُعلَن ══
    console.log("\n── ج. ما ليس دخولاً ──");
    const epId = Number(b1.json?.id);
    const c1 = await call("PUT", `/api/patients/${P.pid}`, S.admin, { address: "المنصور" });
    const c2 = await call("GET", "/api/medical/worklist", S.doc);
    same("ج.١ **تعديلُ ملفٍّ وقراءةُ القائمة بلا ترويسة** — النافذةُ لدخول «معايناتي» وحده",
      [c1.status, c1.raw, c2.status, c2.raw], [200, null, 200, null]);
    const signed = await call("POST", `/api/medical/patients/${P.pid}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "prosthetic", deviceEpisodeId: epId,
      chiefComplaint: "", clinicalFindings: "", plan: "", notes: "", diagnosis: "بترٌ تحت الركبة الأيمن",
      prescription: { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة", prostheticType: "طرف تحت الركبة" },
    });
    same("ج.٢ **وتوقيعُ المعاينة يُخرج ولا يُدخل** — بلا ترويسة", [signed.status, signed.raw, await worklistHas(P.pid, "prosthetic")], [200, null, false]);

    // ══ د. العودةُ إلى «معايناتي» ══
    console.log("\n── د. العودة ──");
    const examId = Number(signed.json?.id ?? signed.json?.exam?.id);
    const d0 = await call("POST", `/api/medical/exams/${examId}/cancel`, S.doc, { reason: "" });
    same("د.١ تهيئة: **إلغاءٌ بلا سبب يُردّ ولا يُعلَن**", [d0.status, d0.raw], [400, null]);
    const d1 = await call("POST", `/api/medical/exams/${examId}/cancel`, S.doc, { reason: "خطأ في الجهة" });
    same("د.٢ **إلغاءُ المعاينة يعيد الجهازَ إلى «معايناتي» ويُعلَن** لمَن ألغاها — بالبابِ نفسِه الذي يسلكه «عاد للشراء»",
      [d1.status, shown(d1), await worklistHas(P.pid, "prosthetic")], [200, [[P.pid, await who(P.pid, P.name), "الأطراف الصناعية"]], true]);

    // ══ هـ. «طلب معاينة جديدة» ══
    console.log("\n── هـ. طلب معاينة جديدة ──");
    const F = await mkPatient("سعاد", "physiotherapy");
    const e0 = await call("POST", `/api/patients/${F.pid}/new-exam-request`, S.recv, { department: "physiotherapy" });
    same("هـ.١ **ومَن ينتظر أصلاً ٤٠٩ بلا ترويسة** — لم يدخل شيءٌ جديد", [e0.status, e0.raw], [409, null]);
    const sp = await call("POST", `/api/medical/patients/${F.pid}/exams`, S.spec, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "",
      diagnosis: "ألم أسفل الظهر الميكانيكي", prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 10 }] },
      assessment: { ...emptyInitialAssessment(), investigations: ["mri"], trend: "worse", allergy: ["nka"], previousTherapy: "no",
        symptoms: "constant", painBest: 3, painWorst: 7, location: ["back"], aggravating: ["sitting"], relieving: ["rest"],
        sensation: "intact", plan: ["therapeutic_exercises"] },
    });
    check(sp.status === 200, "تهيئة: الأخصائيُّ وقّع معاينةَ العلاج الطبيعي", JSON.stringify(sp.json));
    const e1 = await call("POST", `/api/patients/${F.pid}/new-exam-request`, S.recv, { department: "physiotherapy", fields: { address: "الأعظمية" } });
    same("هـ.٢ **«طلب معاينة جديدة» للعلاج الطبيعيّ يُعلَن** — طلبٌ عارٍ أعاده إلى «معايناتي»",
      [e1.status, shown(e1), await worklistHas(F.pid, "physiotherapy")], [201, [[F.pid, await who(F.pid, F.name), "العلاج الطبيعي"]], true]);
    const e2 = await call("POST", `/api/patients/${M.pid}/new-exam-request`, S.recv, { department: "medical_support" });
    same("هـ.٣ **وللمساند: جهازٌ ثانٍ ينتظر** — سطرٌ واحد للجهاز وطلبِه معاً",
      [e2.status, shown(e2)], [201, [[M.pid, await who(M.pid, M.name), "المساند الطبية"]]]);

    // ══ و. ما تراجع لا يُعلَن ══
    console.log("\n── و. التراجع ──");
    await q(`CREATE OR REPLACE FUNCTION eqn_fail_routing_fn() RETURNS trigger AS $f$
      BEGIN IF NEW.patient_id = ${P.pid} AND NEW.service_type = 'prosthetic' THEN RAISE EXCEPTION 'eqn: routing fails'; END IF; RETURN NEW; END $f$ LANGUAGE plpgsql`);
    await q(`CREATE TRIGGER eqn_fail_routing BEFORE INSERT ON medical_review_requests FOR EACH ROW EXECUTE FUNCTION eqn_fail_routing_fn()`);
    const eps0 = Number((await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id = $1`, [P.pid])).rows[0].n);
    const f1 = await call("POST", `/api/patients/${P.pid}/new-exam-request`, S.recv, { department: "prosthetic", requestedItems: ["socket"] });
    const eps1 = Number((await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id = $1`, [P.pid])).rows[0].n);
    await q(`DROP TRIGGER IF EXISTS eqn_fail_routing ON medical_review_requests`);
    same("و.١ **جهازٌ فُتح ثمّ تراجع حفظُه لا يُعلَن** — ٥٠٠ بلا ترويسة، ولا جهازَ بقي",
      [f1.status, f1.raw, eps1 - eps0], [500, null, 0]);
  } finally {
    httpServer.close();
    await cleanup();
  }
  console.log(`\n${failures === 0 ? "✅ كلُّ التأكيدات نجحت" : `❌ ${failures} تأكيداً سقط`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  try { await cleanup(); } catch { /* */ }
  await pool.end();
  process.exit(1);
});
