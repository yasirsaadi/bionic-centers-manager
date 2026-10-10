// «معاينةُ العلاج الطبيعي على استمارتها، والتقييمُ الأوّليّ كاملاً داخلها» (§4.da — قرارُ المالك ٢٠٢٦-١٠-٠٩).
// `npm run test:physio-exam-sheet` — القاعدةُ المشتركة، ثمّ النقاطُ الحقيقية: مَن يوقّع، وماذا يُختَم، وكيف يُنقَّح.
//
// يحرس قراراتِ المالك: (١) «هذه الاستمارةُ العلاجية لدور الأخصائيّ أو الطبيب أو المسؤول» — للعلاج الطبيعي وحده؛ (٢) الاستمارةُ
// الورقية «بدون أيّ نقص» تُحفَظ مع المعاينة بتاريخها ووقتها ويطّلع عليها مَن يرى المريض؛ (٣) قوةُ العضلات ٠–٥ كالورقة، ومستوى المساعدة
// نصٌّ حرّ؛ (٤) الإلزام: القسمُ الأوّل أو «لا ينطبق»، والألم، والإحساس، وبندٌ من خطّة العلاج، والتشخيص. ومعها: «سبب المراجعة» خانةٌ
// مستقلّة لا يُفرَّغ مكتوبُها، والتنقيحُ لا يمحو، ولا قيدَ جديد على معاينةٍ قديمة. **والمرحلةُ الثانية** (ت.): التسجيلُ بالاستمارة —
// «سبب المراجعة» إلزاميّ، و«التشخيص» للفاحص وحده، وفي فروع العلاج الطبيعي وحدها («بغداد وذي قار» — من توفّر أجهزته).

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-exam-sheet-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { prepareSheetEdit } from "@shared/exam_sheet";
import { writesPhysioExamByRole } from "@shared/user_roles";
import {
  assessmentGaps, assessmentGapsText, assessmentHasContent, assessmentSummaryAr, emptyInitialAssessment, parseInitialAssessment, PT_FORM_CODE,
} from "@shared/physio_initial_assessment";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6999;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تقييم-علاج-طبيعي";
const B1 = 9861;
/** فرعٌ بلا علاجٍ طبيعيّ — كالموصل وكركوك (§4.da، المرحلةُ الثانية). */
const B2 = 9862;
const DEV_CODE = "pes-test-device";
const RECV = 9871, SPEC = 9872, SUP = 9873, ADMIN = 9874, DOCP = 9875, THER = 9876;
const IDS = [RECV, SPEC, SUP, ADMIN, DOCP, THER];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

/** تقييمٌ صالحٌ كامل — ألمُ أسفل الظهر المزمن. */
const GOOD = () => ({
  ...emptyInitialAssessment(),
  investigations: ["mri", "xray"], trend: "same", pastHistory: "Hypertension (controlled)",
  allergy: ["nka"], previousTherapy: "yes", previousVisits: 6,
  symptoms: "intermittent", painBest: 3, painWorst: 7, location: ["back"],
  aggravating: ["standing", "sitting"], relieving: ["heat", "position_change"],
  sensation: "intact",
  mmt: { ...emptyInitialAssessment().mmt, hip: { r: "4", l: "4" }, knee: { r: "5", l: "5" } },
  ashworth: { ...emptyInitialAssessment().ashworth, lower: { r: "0", l: "1+" } },
  functional: { ...emptyInitialAssessment().functional, gait: { assist: "Independent", notes: "≈ 500 m, no aid" } },
  plan: ["therapeutic_exercises", "strengthening", "pain_management"],
});

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1 OR referral_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
  await q(`DELETE FROM devices WHERE code = $1`, [DEV_CODE]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  // ══ القاعدةُ المشتركة (بلا قاعدة بيانات) ══
  console.log("\n── ق. القواعد ──");
  //  **لا خانةَ إلزامية منذ ٢٠٢٦-١٠-١٠** (قرارُ المالك: «اجعل جميع الحقول غير إلزامية ويمكن أن يحفظها بدون أي حقل، مع تنبيه»):
  //  ما كان إلزاماً صار تنبيهاً (`gaps`) بالترتيب نفسِه — والقيمةُ غيرُ الصالحة وحدها تُردّ (ق.٦–ق.١٠).
  const empty = parseInitialAssessment(emptyInitialAssessment());
  same("ق.١ **الاستمارةُ فارغةً تُقبل**، وتنبيهُها بترتيبه: الألمُ والإحساسُ وبندٌ من الخطّة",
    [empty.ok, empty.ok ? empty.gaps : null], [true, ["painBest", "painWorst", "sensation", "plan"]]);
  const na = parseInitialAssessment({ ...emptyInitialAssessment(), sectionANa: true });
  same("ق.٢ «لا ينطبق» على القسم الأوّل ⟵ يبقى التنبيهُ ببند الخطّة وحده", na.ok ? na.gaps : null, ["plan"]);
  same("ق.٢ب والتشخيصُ الفارغ يُنبَّه عليه بنصّه", [assessmentGaps(null, "  "), assessmentGapsText(["diagnosis", "plan"])],
    [["diagnosis"], "لم يُكتب بعد: التشخيص، بندٌ واحد على الأقلّ من خطة العلاج"]);
  const zero = parseInitialAssessment({ ...emptyInitialAssessment(), painBest: 0, painWorst: 0, sensation: "intact", plan: ["rom"] });
  same("ق.٣ ألمٌ صفر ⟵ لا تنبيهَ بالأعراض ولا بالموقع", zero.ok ? zero.gaps : null, []);
  const pain = parseInitialAssessment({ ...emptyInitialAssessment(), painBest: 2, painWorst: 6, sensation: "intact", plan: ["rom"] });
  same("ق.٤ ألمٌ ⟵ تنبيهٌ بالأعراض وموقعه", pain.ok ? pain.gaps : null, ["symptoms", "location"]);
  same("ق.٤ب و«أخرى» مكتوبةً تكفي موقعاً",
    parseInitialAssessment({ ...emptyInitialAssessment(), painBest: 2, painWorst: 6, symptoms: "constant", locationOther: "Elbow", sensation: "intact", plan: ["rom"] }).ok, true);
  const imp = parseInitialAssessment({ ...emptyInitialAssessment(), painBest: 0, painWorst: 0, sensation: "impaired", plan: ["rom"] });
  same("ق.٥ إحساسٌ ضعيف ⟵ تنبيهٌ بالمناطق المصابة", imp.ok ? imp.gaps : null, ["sensationRegions"]);
  const badCode = parseInitialAssessment({ ...GOOD(), location: ["back", "elbow"] });
  same("ق.٦ رمزٌ غيرُ معروف يُردّ ويُسمّى — لا يسقط صامتاً", badCode.ok ? null : badCode.missing, ["location"]);
  const plus = parseInitialAssessment({ ...GOOD(), mmt: { ...GOOD().mmt, hip: { r: "4+", l: "4" } } });
  same("ق.٦ب **قوةُ العضلات ٠–٥ كالورقة** — «٤+» تُردّ، و«١+» في أشورث تُقبل", [plus.ok, parseInitialAssessment(GOOD()).ok], [false, true]);
  const nka = parseInitialAssessment({ ...GOOD(), allergy: ["drug", "nka"], allergySpecify: "Penicillin" });
  same("ق.٧ «لا حساسية معروفة» وحدها، ويُمحى «حدّد»", nka.ok ? [nka.value.allergy, nka.value.allergySpecify] : null, [["nka"], null]);
  same("ق.٨ أفضلُ الألم لا يزيد على أسوئه، والألمُ ٠–١٠",
    [parseInitialAssessment({ ...GOOD(), painBest: 8, painWorst: 7 }).ok, parseInitialAssessment({ ...GOOD(), painWorst: 11 }).ok], [false, false]);
  const pv = parseInitialAssessment({ ...GOOD(), previousVisits: null });
  same("ق.٩ «علاجٌ سابق: نعم» بلا عدد الزيارات ⟵ تنبيه — و«لا» يمحوه",
    [pv.ok ? pv.gaps : null, (parseInitialAssessment({ ...GOOD(), previousTherapy: "no" }) as any).value?.previousVisits], [["previousVisits"], null]);
  same("ق.١٠ تاريخُ العملية لا يكون في المستقبل",
    parseInitialAssessment({ ...GOOD(), surgeryDate: "2099-01-01" }, { today: "2026-10-09" }).ok, false);
  same("ق.١١ الملخّصُ بالعربية", assessmentSummaryAr((parseInitialAssessment(GOOD()) as any).value),
    "الألم 3–7 من ١٠ · الظهر · متقطّع · الإحساس سليم · بنود خطة العلاج: 3");
  same("ق.١٢ الفارغُ بلا محتوى، وبندُ خطّةٍ واحد محتوى",
    [assessmentHasContent(emptyInitialAssessment()), assessmentHasContent({ ...emptyInitialAssessment(), plan: ["rom"] })], [false, true]);
  same("ق.١٣ **مَن يكتب معاينةَ العلاج الطبيعي بدوره**: الأخصائيّ والمسؤولُ والمشرفُ العامّ — لا المعالجُ ولا الاستقبال",
    [writesPhysioExamByRole({ role: "physio_specialist" }), writesPhysioExamByRole({ role: "admin" }),
      writesPhysioExamByRole({ role: "branch_manager", canSupervisePhysio: true }), writesPhysioExamByRole({ role: "therapist" }),
      writesPhysioExamByRole({ role: "reception" }), writesPhysioExamByRole({ role: "reception", extraRoles: ["physio_specialist"] })],
    [true, true, true, false, false, true]);
  const EXR = { name: "س", phone: "07701234567", governorate: "بغداد", address: "ع", referralSource: "فيسبوك", age: "40", weight: "70", height: "170",
    injuryCause: "س", injuryDate: "2020-05-01", presentingComplaint: "ألم الظهر" };
  same("ق.١٤ **«سبب المراجعة» لا يُفرَّغ مكتوبُه** — وتغييرُه يُكتب",
    [prepareSheetEdit(EXR, { presentingComplaint: " " }).missing, prepareSheetEdit(EXR, { presentingComplaint: "ألم الرقبة" }).patch],
    [["presentingComplaint"], { presentingComplaint: "ألم الرقبة" }]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع تقييم العلاج الطبيعي'), ($2, 'فرع بلا علاج طبيعي')`, [B1, B2]);
  //  **فرعُ العلاج الطبيعي مَن فيه جهازٌ متوفّر** (ترحيل ١٠٦) — B1 كبغداد وذي قار، وB2 جهازُه «غير متوفّر».
  const dev = (await q(`INSERT INTO devices (code, name_ar, name_en) VALUES ($1, 'جهاز اختبار', 'Test device') RETURNING id`, [DEV_CODE])).rows[0].id;
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1, $2, true), ($1, $3, false)`, [dev, B1, B2]);
  const users: [number, string, Record<string, unknown>][] = [
    [RECV, "reception", { can_add_patients: true, can_view_patients: true }],
    [SPEC, "physio_specialist", { can_view_patients: true }],
    [SUP, "branch_manager", { can_supervise_physio: true, can_view_patients: true }],
    [ADMIN, "admin", {}],
    [DOCP, "doctor", { medical_specialties: '["prosthetic"]' }],
    [THER, "therapist", { can_view_patients: true }],
  ];
  for (const [id, role, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `pes-${id}`, `مستخدم ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) {
      await q(`UPDATE system_users SET ${k} = $2${k === "medical_specialties" ? "::jsonb" : ""} WHERE id = $1`, [id, v]);
    }
  }
  const sess = (id: number, role: string, extra: Record<string, unknown> = {}) => hdr({
    userId: id, displayName: `م ${id}`, role, roles: [role], branchId: B1, accessibleBranches: [B1], isAdmin: role === "admin",
    permissions: { canViewPatients: true, canAddPatients: true }, ...extra,
  });
  const S = {
    recv: sess(RECV, "reception"), spec: sess(SPEC, "physio_specialist"), sup: sess(SUP, "branch_manager"),
    admin: sess(ADMIN, "admin"), docp: sess(DOCP, "doctor"), ther: sess(THER, "therapist"),
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
  async function physioPatient(label: string) {
    seq += 1;
    const pid = (await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition,
        branch_id, is_physiotherapy, total_cost, patient_classification, governorate, address, injury_cause, injury_date, presenting_complaint,
        disease_type)
      VALUES ($1, $2, 'من شخص آخر', $3, '46', '172', '88', 'physiotherapy', $4, true, 0, 'new', 'بغداد', 'الكرادة', 'الجلوس الطويل', '2026-05-01',
        'ألم أسفل الظهر منذ ٤ أشهر', NULL) RETURNING id`,
      [`${label} ${MARK}`, `0772${String(4000000 + seq * 7919).slice(0, 7)}`, MARK, B1])).rows[0].id;
    await q(`UPDATE patients SET phone_e164 = '+964' || substr(phone, 2) WHERE id = $1`, [pid]);
    await storage.syncPatientCases(pid);
    return Number(pid);
  }
  const examBody = (over: Record<string, unknown> = {}) => ({
    idempotencyKey: randomUUID(), caseType: "physiotherapy",
    chiefComplaint: "", clinicalFindings: "", plan: "", notes: "لا علامات خطر. رفع الساق المستقيمة سلبي.",
    diagnosis: "ألم أسفل الظهر المزمن غير النوعي",
    prescription: { injuries: [{ type: "تشنج عضلي", area: "منطقة الظهر السفلية", side: "كلاهما" }], treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 12 }] },
    assessment: GOOD(),
    ...over,
  });
  const examCount = async (pid: number) => Number((await q(`SELECT count(*) FROM medical_exams WHERE patient_id = $1`, [pid])).rows[0].count);
  const permsOf = async (s: string) => (await call("GET", "/api/auth/user", s)).json?.permissions ?? {};

  try {
    console.log("\n── أ. مَن يكتب معاينةَ العلاج الطبيعي ──");
    const me = async (s: string) => (await call("GET", "/api/medical/me", s)).json;
    same("أ.١ **الأخصائيّ والمشرفُ العامّ والمسؤولُ: العلاجُ الطبيعيّ وحده** — والمعالجُ والاستقبالُ لا، والطبيبُ باختصاصه كما كان",
      [(await me(S.spec))?.specialties, (await me(S.sup))?.specialties, (await me(S.admin))?.specialties,
        (await me(S.ther))?.canWriteMedicalExam, (await me(S.recv))?.canWriteMedicalExam, (await me(S.docp))?.specialties],
      [["physiotherapy"], ["physiotherapy"], ["physiotherapy"], false, false, ["prosthetic"]]);
    same("أ.١ب **و«معايناتي» تظهر لهم** — صلاحيةُ الجلسة الحيّة (لا للمعالج)",
      [(await permsOf(S.spec)).canWriteMedicalExam, (await permsOf(S.sup)).canWriteMedicalExam, (await permsOf(S.ther)).canWriteMedicalExam],
      [true, true, false]);

    const w = await physioPatient("منتظر");
    const wl = await call("GET", "/api/medical/worklist", S.spec);
    same("أ.٢ ومريضُ العلاج الطبيعي الجديد في «معايناتي» الأخصائيّ",
      [wl.status, (wl.json?.rows ?? wl.json?.items ?? wl.json ?? []).some?.((r: any) => Number(r.patientId ?? r.patient_id ?? r.id) === w)], [200, true]);

    const p1 = await physioPatient("علي");
    const asSpec = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ caseType: "prosthetic", assessment: undefined }));
    same("أ.٣ **ولا يكتب الأخصائيُّ معاينةَ الأطراف** — ٤٠٣ بلا كتابة", [asSpec.status, await examCount(p1)], [403, 0]);
    const asTher = await call("POST", `/api/medical/patients/${p1}/exams`, S.ther, examBody());
    same("أ.٤ والمعالجُ لا يوقّع", [asTher.status, await examCount(p1)], [403, 0]);

    console.log("\n── ب. التوقيع: التقييمُ يُفحَص قبل أيّ كتابة، ويُختَم مع المعاينة ──");
    //  **لا خانةَ إلزامية** (قرارُ المالك ٢٠٢٦-١٠-١٠) — كانت ب.١ وب.٢ تردّان ٤٠٠ بلا بند خطّة وبلا تشخيص.
    const pNoPlan = await physioPatient("بلا خطة");
    const noPlan = await call("POST", `/api/medical/patients/${pNoPlan}/exams`, S.spec, examBody({ assessment: { ...GOOD(), plan: [] } }));
    same("ب.١ **تقييمٌ بلا بندٍ من الخطّة يُحفَظ** — والتقييمُ مختومٌ بلا بنود", [noPlan.status, await examCount(pNoPlan),
      (await q(`SELECT assessment FROM medical_exams WHERE patient_id = $1`, [pNoPlan])).rows[0]?.assessment?.plan], [200, 1, []]);
    const pNoDx = await physioPatient("بلا تشخيص");
    const noDx = await call("POST", `/api/medical/patients/${pNoDx}/exams`, S.spec, examBody({ diagnosis: "  " }));
    same("ب.٢ **والتشخيصُ الفارغ لا يمنع الحفظ**", [noDx.status, await examCount(pNoDx)], [200, 1]);
    const pBare = await physioPatient("فارغة");
    const bareSheet = await call("POST", `/api/medical/patients/${pBare}/exams`, S.spec, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", diagnosis: "", plan: "", notes: "",
      prescription: {}, assessment: emptyInitialAssessment(),
    });
    same("ب.٢ب **والاستمارةُ بلا أيّ حقلٍ تُحفَظ** (قولُ المالك «يمكن أن يحفظها بدون أي حقل»)", [bareSheet.status, await examCount(pBare)], [200, 1]);
    const bareOld = await call("POST", `/api/medical/patients/${pBare}/exams`, S.spec, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", diagnosis: "", plan: "", notes: "", prescription: {},
    });
    same("ب.٢ج وبلا الاستمارة (عميلٌ قديم) تبقى المعاينةُ الفارغة مرفوضةً كما كانت", [bareOld.status, bareOld.json?.error, await examCount(pBare)],
      [400, "لا يمكن حفظ معاينة فارغة", 1]);
    const badGrade = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ assessment: { ...GOOD(), mmt: { ...GOOD().mmt, knee: { r: "6", l: "5" } } } }));
    same("ب.٣ ودرجةُ قوةٍ خارج ٠–٥ تُردّ", [badGrade.status, badGrade.json?.missing, await examCount(p1)], [400, ["mmt"], 0]);
    const emptied = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, examBody({ sheet: { presentingComplaint: "" } }));
    same("ب.٤ **ولا يُفرَّغ «سبب المراجعة»** — يُردّ قبل التوقيع", [emptied.status, emptied.json?.missing, await examCount(p1)], [400, ["presentingComplaint"], 0]);

    const key = randomUUID();
    const body = examBody({
      idempotencyKey: key,
      sheet: { presentingComplaint: "ألم أسفل الظهر يزداد بالجلوس", governorate: "ذي قار", injuryDate: "", injuryDateStatus: "unknown" },
    });
    const ok = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, body);
    const row = (await q(`SELECT assessment, diagnosis, notes, doctor_name, signed_at, case_type FROM medical_exams WHERE id = $1`, [ok.json?.id])).rows[0];
    same("ب.٥ **الأخصائيُّ يوقّع، والتقييمُ مختومٌ مع المعاينة** برمز الاستمارة ووقت الحفظ",
      //  (JSONB يرتّب المفاتيحَ — فتُقارَن القيمُ لا ترتيبُها.)
      [ok.status, row?.case_type, row?.assessment?.form, row?.assessment?.painWorst,
        [row?.assessment?.mmt?.hip?.r, row?.assessment?.mmt?.hip?.l], [row?.assessment?.ashworth?.lower?.r, row?.assessment?.ashworth?.lower?.l],
        [row?.assessment?.functional?.gait?.assist, row?.assessment?.functional?.gait?.notes], row?.diagnosis, row?.notes, Boolean(row?.signed_at)],
      [200, "physiotherapy", PT_FORM_CODE, 7, ["4", "4"], ["0", "1+"], ["Independent", "≈ 500 m, no aid"],
        "ألم أسفل الظهر المزمن غير النوعي", "لا علامات خطر. رفع الساق المستقيمة سلبي.", true]);
    same("ب.٦ **«تاريخ بداية الإصابة» يُختَم من «تاريخ الإصابة» بعد تعديل الفاحص** — لا خانةٌ ثانية",
      row?.assessment?.onsetAtSigning, "unknown");
    const pr = (await q(`SELECT presenting_complaint, governorate, injury_date, injury_date_status, disease_type, injuries FROM patients WHERE id = $1`, [p1])).rows[0];
    same("ب.٧ ما عدّله الفاحصُ من الاستمارة على الملفّ — والتشخيصُ والإصاباتُ من الوصفة",
      [pr.presenting_complaint, pr.governorate, pr.injury_date, pr.injury_date_status, (JSON.parse(pr.injuries ?? "[]") as any[])[0]?.area],
      ["ألم أسفل الظهر يزداد بالجلوس", "ذي قار", null, "unknown", "منطقة الظهر السفلية"]);
    const au = (await q(`SELECT notes, new_values::jsonb AS nv FROM audit_log WHERE entity_type = 'patient' AND entity_id = $1 AND action = 'update' ORDER BY id`, [p1])).rows;
    check(au.some((a) => /من استمارة المعاينة #/.test(a.notes ?? "") && a.nv?.presentingComplaint === "ألم أسفل الظهر يزداد بالجلوس"),
      "ب.٨ **وسطرُ تدقيقٍ باسم الفاحص** لتعديل «سبب المراجعة»", JSON.stringify(au.map((a) => a.notes)));

    const replay = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, body);
    same("ب.٩ إعادةُ الإرسال بالمفتاح نفسِه ⟵ الصفُّ نفسُه بلا كتابة", [replay.status, replay.json?.id, replay.json?.created, await examCount(p1)],
      [200, ok.json?.id, false, 1]);
    const conflict = await call("POST", `/api/medical/patients/${p1}/exams`, S.spec, { ...body, assessment: { ...GOOD(), painWorst: 9 } });
    same("ب.١٠ **والمفتاحُ نفسُه بتقييمٍ آخر تعارضٌ لا إعادة**", [conflict.status, conflict.json?.code, await examCount(p1)], [409, "idempotency_conflict", 1]);

    const g = (await call("GET", `/api/medical/patients/${p1}/exams`, S.recv)).json;
    same("ب.١١ **ويطّلع عليه الاستعلامُ من ملفّ المريض** — التقييمُ مع معاينته",
      [g?.exams?.[0]?.assessment?.form, g?.exams?.[0]?.assessment?.plan], [PT_FORM_CODE, ["therapeutic_exercises", "strengthening", "pain_management"]]);
    const gs = (await call("GET", `/api/medical/patients/${p1}/exams`, S.spec)).json;
    same("ب.١٢ والأخصائيُّ يفتح على حقول الاستعلامات ومعها «سبب المراجعة»", gs?.sheet?.presentingComplaint, "ألم أسفل الظهر يزداد بالجلوس");

    const p2 = await physioPatient("سليم");
    const bySup = await call("POST", `/api/medical/patients/${p2}/exams`, S.sup, examBody());
    const p3 = await physioPatient("المسؤول");
    const byAdmin = await call("POST", `/api/medical/patients/${p3}/exams`, S.admin, examBody());
    same("ب.١٣ **والمشرفُ العامّ والمسؤولُ يوقّعان** (قرارُ المالك)", [bySup.status, byAdmin.status], [200, 200]);

    console.log("\n── ج. التنقيح: لا يمحو، ولا قيدَ جديد على القديم ──");
    const examId = Number(ok.json?.id);
    const rev = await call("PATCH", `/api/medical/exams/${examId}`, S.spec, {
      caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "بعد أسبوع",
      diagnosis: "ألم أسفل الظهر المزمن غير النوعي", prescription: body.prescription,
      assessment: { ...GOOD(), painWorst: 5 },
    });
    const live = (await q(`SELECT version, assessment FROM medical_exams WHERE id = $1`, [examId])).rows[0];
    const old = (await q(`SELECT version, assessment FROM medical_exam_revisions WHERE exam_id = $1 ORDER BY version`, [examId])).rows;
    same("ج.١ **التنقيحُ يكتب التقييمَ الجديد، والنسخةُ السابقة تحمل تقييمَها**",
      [rev.status, live.version, live.assessment?.painWorst, old.map((r) => [r.version, r.assessment?.painWorst])], [200, 2, 5, [[1, 7]]]);
    await call("PATCH", `/api/medical/exams/${examId}`, S.spec, {
      caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "نصٌّ فقط",
      diagnosis: "ألم أسفل الظهر المزمن غير النوعي", prescription: body.prescription,
    });
    same("ج.٢ وتنقيحٌ بلا مفتاح التقييم يُبقيه كما هو", (await q(`SELECT assessment FROM medical_exams WHERE id = $1`, [examId])).rows[0].assessment?.painWorst, 5);
    const badRev = await call("PATCH", `/api/medical/exams/${examId}`, S.spec, {
      caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {}, assessment: { ...GOOD(), sensation: null },
    });
    same("ج.٣ **وتقييمٌ ناقص في التنقيح يُحفَظ** (لا إلزام) — نسخةٌ جديدة بلا إحساس",
      [badRev.status, (await q(`SELECT version, assessment FROM medical_exams WHERE id = $1`, [examId])).rows.map((r) => [r.version, r.assessment?.sensation ?? null])[0]],
      [200, [4, null]]);
    const badRevValue = await call("PATCH", `/api/medical/exams/${examId}`, S.spec, {
      caseType: "physiotherapy", notes: "x", diagnosis: "د", prescription: {}, assessment: { ...GOOD(), painWorst: 12 },
    });
    same("ج.٣ب وقيمةٌ غيرُ صالحة في التنقيح ⟵ ٤٠٠ بلا نسخةٍ جديدة",
      [badRevValue.status, badRevValue.json?.missing, (await q(`SELECT version FROM medical_exams WHERE id = $1`, [examId])).rows[0].version], [400, ["painWorst"], 4]);

    //  **معاينةٌ قديمة بلا تقييم** (عميلٌ قديم، أو ما قبل اليوم) — تُنقَّح بلا تقييم ما دام فارغاً.
    const p4 = await physioPatient("قديم");
    const oldExam = await call("POST", `/api/medical/patients/${p4}/exams`, S.spec, examBody({ assessment: undefined, chiefComplaint: "ألم", diagnosis: "قديم" }));
    const oldRow = (await q(`SELECT assessment FROM medical_exams WHERE id = $1`, [oldExam.json?.id])).rows[0];
    const reOld = await call("PATCH", `/api/medical/exams/${oldExam.json?.id}`, S.spec, {
      caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "الشكوى: ألم", diagnosis: "قديم", prescription: {},
      assessment: emptyInitialAssessment(),
    });
    const afterEmpty = (await q(`SELECT assessment FROM medical_exams WHERE id = $1`, [oldExam.json?.id])).rows[0].assessment ?? null;
    const partial = await call("PATCH", `/api/medical/exams/${oldExam.json?.id}`, S.spec, {
      caseType: "physiotherapy", notes: "x", diagnosis: "قديم", prescription: {}, assessment: { ...emptyInitialAssessment(), plan: ["rom"] },
    });
    same("ج.٤ **ولا قيدَ جديد على القديم**: يوقَّع بلا تقييم، ويُنقَّح باستمارةٍ فارغة — وما كُتب فيها يُحفَظ ولو ناقصاً",
      [oldExam.status, oldRow?.assessment ?? null, reOld.status, afterEmpty,
        partial.status, (await q(`SELECT assessment FROM medical_exams WHERE id = $1`, [oldExam.json?.id])).rows[0].assessment?.plan],
      [200, null, 200, null, 200, ["rom"]]);

    console.log("\n── د. الأطرافُ كما كانت ──");
    const pp = await call("POST", `/api/medical/patients/${p4}/exams`, S.docp, examBody({ caseType: "prosthetic", prescription: { prostheticType: "طرف" } }));
    const ppRow = pp.json?.id ? (await q(`SELECT assessment FROM medical_exams WHERE id = $1`, [pp.json.id])).rows[0] : null;
    same("د.١ **معاينةٌ غيرُ العلاج الطبيعي لا يُختَم فيها تقييم** ولو أُرسل", [pp.status, ppRow?.assessment ?? null], [200, null]);

    // ══ المرحلةُ الثانية: التسجيلُ بالاستمارة، وفي فروع العلاج الطبيعي وحدها ══
    console.log("\n── ت. التسجيلُ بـ«استمارة مراجع — علاج طبيعي» ──");
    const br = (await call("GET", "/api/branches", S.recv)).json ?? [];
    same("ت.١ **`offersPhysio` من توفّر أجهزة العلاج الطبيعي في الفرع** — لا من اسمه، والجهازُ «غير المتوفّر» لا يكفي",
      [br.find((b: any) => b.id === B1)?.offersPhysio, br.find((b: any) => b.id === B2)?.offersPhysio], [true, false]);

    const sheetBody = (over: Record<string, unknown> = {}) => ({
      intakeSheet: true, department: "physiotherapy", branchId: B1,
      name: `زينب ${MARK}`, phone: "07719876543", hadPriorCenterHistory: false,
      governorate: "ذي قار", address: "الناصرية — حي الشهداء",
      referralSource: "من شخص آخر", referralSubSource: MARK, referralNotes: "د. حسن — مستشفى الحسين",
      presentingComplaint: "ألمٌ في الرقبة ينزل إلى الذراع اليمنى منذ شهر",
      injuries: JSON.stringify([{ type: "انزلاق غضروفي", area: "الرقبة", side: "يمين" }]), injuryType: "انزلاق غضروفي", injuryArea: "الرقبة",
      age: "38", weight: "64", height: "160", injuryCause: "غير معروف", injuryDate: null, injuryDateStatus: "unknown",
      generalNotes: "", totalCost: 0, whatsappNotificationsEnabled: false,
      ...over,
    });
    const created = await call("POST", "/api/patients", S.recv, sheetBody({ diseaseType: "تشخيصٌ من الاستقبال" }));
    const np = created.json?.id ? (await q(`SELECT is_physiotherapy, is_amputee, is_medical_support, medical_condition, presenting_complaint,
        disease_type, referral_notes, governorate, injury_date, injury_date_status, injuries FROM patients WHERE id = $1`, [created.json.id])).rows[0] : null;
    same("ت.٢ **الاستقبالُ يسجّل بالاستمارة**: قسمُ العلاج الطبيعي، و«سبب المراجعة» و«ملاحظة الجهة» والإصاباتُ محفوظة",
      [created.status, np?.is_physiotherapy, np?.is_amputee, np?.is_medical_support, np?.medical_condition, np?.presenting_complaint,
        np?.referral_notes, np?.governorate, np?.injury_date, np?.injury_date_status, (JSON.parse(np?.injuries ?? "[]") as any[])[0]?.area],
      [201, true, false, false, "physiotherapy", "ألمٌ في الرقبة ينزل إلى الذراع اليمنى منذ شهر",
        "د. حسن — مستشفى الحسين", "ذي قار", null, "unknown", "الرقبة"]);
    same("ت.٣ **و«التشخيص» للفاحص وحده** — ما أرسله العميلُ لا يُكتب", np?.disease_type ?? "", "");
    const npId = Number(created.json?.id);
    const cases = (await q(`SELECT case_type, cost FROM patient_cases WHERE patient_id = $1`, [npId])).rows;
    const eps = Number((await q(`SELECT count(*) FROM patient_device_episodes WHERE patient_id = $1`, [npId])).rows[0].count);
    same("ت.٤ قسمُ العلاج الطبيعي بكلفة صفر، **ولا طلبَ جهاز**",
      [cases.map((c) => [c.case_type, Number(c.cost)]), eps], [[["physiotherapy", 0]], 0]);
    const wl2 = await call("GET", "/api/medical/worklist", S.spec);
    same("ت.٥ **والمراجعُ في «معايناتي» الأخصائيّ** حين يُحفظ — انتظارٌ مشتقٌّ بلا طلب",
      (wl2.json?.rows ?? wl2.json?.items ?? wl2.json ?? []).some?.((r: any) => Number(r.patientId ?? r.patient_id ?? r.id) === npId), true);

    const before = Number((await q(`SELECT count(*) FROM patients WHERE referral_sub_source = $1`, [MARK])).rows[0].count);
    const noComplaint = await call("POST", "/api/patients", S.recv, sheetBody({ name: `حسين ${MARK}`, phone: "07719876544", presentingComplaint: "  " }));
    same("ت.٦ **«سبب المراجعة» إلزاميّ** — ٤٠٠ يسمّيه، ولا ملفّ",
      [noComplaint.status, noComplaint.json?.missing, Number((await q(`SELECT count(*) FROM patients WHERE referral_sub_source = $1`, [MARK])).rows[0].count)],
      [400, ["presentingComplaint"], before]);
    const bare = await call("POST", "/api/patients", S.recv, {
      //  ما ترسله الشاشةُ فارغةً — نصوصٌ فارغة لا مفاتيحُ غائبة.
      intakeSheet: true, department: "physiotherapy", branchId: B1, name: `فارغ ${MARK}`, phone: "07719876545",
      governorate: "", address: "", referralSource: "", referralSubSource: MARK, presentingComplaint: "",
      age: "30", weight: "60", height: "160", injuryCause: "", injuryDate: null, injuryDateStatus: null,
      totalCost: 0, whatsappNotificationsEnabled: false,
    });
    same("ت.٧ **والإلزامُ كالأطراف** — كلُّها إلّا الملاحظاتِ والإصابات، بترتيب الورقة",
      [bare.status, bare.json?.missing], [400, ["governorate", "address", "referralSource", "injuryCause", "injuryDate", "presentingComplaint"]]);
    const elsewhere = await call("POST", "/api/patients", S.admin, sheetBody({ name: `مصطفى ${MARK}`, phone: "07719876546", branchId: B2 }));
    same("ت.٨ **وفي فرعٍ بلا علاجٍ طبيعيّ يُردّ** — ٤٠٠ على «الفرع»، ولا ملفّ",
      [elsewhere.status, elsewhere.json?.missing, elsewhere.json?.message,
        Number((await q(`SELECT count(*) FROM patients WHERE referral_sub_source = $1`, [MARK])).rows[0].count)],
      [400, ["branchId"], "العلاج الطبيعي غير متوفّر في هذا الفرع", before]);
    const devicesThere = await call("POST", "/api/patients", S.admin, {
      ...sheetBody({ name: `مسند ${MARK}`, phone: "07719876547", branchId: B2 }), department: "medical_support",
      presentingComplaint: undefined, supportType: "مشدّ ظهر", injurySide: "لا ينطبق", requestedItems: ["full_device"],
    });
    same("ت.٩ والأطرافُ والمساندُ في ذلك الفرع كما كانت", devicesThere.status, 201);
  } finally {
    httpServer.close();
    await cleanup();
  }
  console.log(`\n${failures === 0 ? "✅ كلُّ التأكيدات نجحت" : `❌ ${failures} تأكيداً سقط`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* */ }
  process.exit(1);
});
