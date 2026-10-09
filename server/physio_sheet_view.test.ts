// «استمارة مراجع — علاج طبيعي» مكتملةً للعرض والطباعة (§4.da — المرحلةُ الثالثة).
// `npm run test:physio-sheet-view` — القاعدةُ المشتركة (`physioSessionRows` وأسطرُ الورقة)، ثمّ البابُ الحقيقيّ
// `GET /api/patients/:patientId/physio-sheet`: كلُّ خانةٍ من مكانها، والمالُ لمن يرى الدفعات، والخطّةُ لمن يقرأ الخطط، والنطاقُ كصفحة المريض.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-sheet-view-test-secret";

import express from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { softDeletePatient } from "./patients/trash_store";
import { BLOCKED } from "./ai/capabilities/catalog";
import { emptyInitialAssessment } from "@shared/physio_initial_assessment";
import { physioMoneyLine, physioPlanLine, physioProgressLine, physioSessionRows } from "@shared/physio_sheet_view";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7001;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-ورقة-علاج-طبيعي";
const B1 = 9891, B2 = 9892;
const RECV = 9893, SPEC = 9894, THER = 9895, BLIND = 9896, ADMIN = 9897, DOC = 9898, OTHER = 9899;
const IDS = [RECV, SPEC, THER, BLIND, ADMIN, DOC, OTHER];
const PROTO_CODE = "psv-test-protocol";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

const GOOD = () => ({
  ...emptyInitialAssessment(),
  investigations: ["mri"], trend: "worse", allergy: ["nka"], previousTherapy: "no",
  symptoms: "constant", painBest: 4, painWorst: 8, location: ["neck"], aggravating: ["sitting"], relieving: ["rest"],
  sensation: "impaired", sensationRegions: "C6 dermatome (R)",
  mmt: { ...emptyInitialAssessment().mmt, shoulder: { r: "4", l: "5" } },
  plan: ["therapeutic_exercises", "pain_management"],
});

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_sub_source = $1`, [MARK])).rows.map((r) => Number(r.id));
  for (const id of pts) await storage.deletePatient(id);
  await q(`DELETE FROM physio_protocols WHERE code = $1`, [PROTO_CODE]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  // ══ القاعدةُ المشتركة ══
  console.log("\n── ق. القواعد ──");
  const rows = physioSessionRows({ "تمارين تأهيلية": 10, "تيكار": 4 }, [
    { treatmentType: "تمارين تأهيلية" }, { treatmentType: "تمارين تأهيلية" }, { treatmentType: "تيكار" },
    { treatmentType: null, details: "خدمة جديدة" }, { treatmentType: "استشارة طبية" }, { treatmentType: null, notes: "خدمة جديدة: x" },
    { treatmentType: null, details: "زيارة" },
  ]);
  same("ق.١ **الجلساتُ لكلّ نوع** = المشترى ناقصاً المنفّذ — و«خدمة جديدة» و«استشارة طبية» ليستا جلسة، والفارغُ «غير محدد»",
    rows, [{ type: "تمارين تأهيلية", bought: 10, done: 2, remaining: 8 }, { type: "تيكار", bought: 4, done: 1, remaining: 3 },
      { type: "غير محدد", bought: 0, done: 1, remaining: -1 }]);
  same("ق.٢ ونوعٌ بلا مشترى ولا منفّذ لا يُعرَض", physioSessionRows({ "روبوت": 0 }, []), []);
  same("ق.٣ سطرُ المبلغ: الكلّيّ والمدفوعُ والمتبقّي، والمُهدى والخصم",
    physioMoneyLine({ total: 300000, paid: 100000, remaining: 200000, freeSessions: 2, discounts: [{ originalPrice: 350000, finalPrice: 300000, reason: "حالة إنسانية" }] }),
    { main: "الكلي 300,000 د.ع · المدفوع 100,000 د.ع · المتبقي 200,000 د.ع",
      extra: ["منها 2 جلسة مُهداة بلا مقابل", "خصم 50,000 د.ع من 350,000 — حالة إنسانية"] });
  same("ق.٤ سطرُ الخطّة والتقدّم",
    [physioPlanLine({ id: 1, title: "خطة الرقبة", protocolName: "ألم الرقبة", sessionsPerWeek: 3, durationWeeks: 4, sessionMinutes: null, status: "approved",
      statusLabel: "معتمَدة", reviewLabel: "راجعها المشرف", reviewedByName: "سليم", decidedByName: null, createdByName: "أحمد", createdAt: null }),
    physioProgressLine({ firstPain: 8, firstOn: "2026-10-01", lastPain: 3, lastOn: "2026-10-20", count: 2, goalsPct: 75, lastDecision: "استمرار" })],
    [{ main: "خطة الرقبة — بروتوكول: ألم الرقبة · 3 جلسات في الأسبوع × لمدّة 4 أسابيع", sub: "معتمَدة · راجعها المشرف (سليم) · كتبها أحمد" },
      "الألم 8 ⟵ 3 من ١٠ · الأهداف 75٪ · آخر قرار: استمرار · التقييمات: 2"]);
  check(typeof BLOCKED["/api/patients/:patientId/physio-sheet"] === "string",
    "ق.٥ **والمساعدُ لا يقرأ الورقة** — ممنوعةٌ بسببٍ مكتوب في فهرس القدرات");

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع ورقة العلاج الطبيعي'), ($2, 'فرع آخر')`, [B1, B2]);
  const users: [number, string, Record<string, unknown>][] = [
    [RECV, "reception", { can_view_patients: true, can_view_payments: true }],
    [SPEC, "physio_specialist", { can_view_patients: true }],
    [THER, "therapist", { can_view_patients: true }],
    //  الجلسةُ تُبنى من صفّ الحساب (`buildStoredPermissions`) — فالمنعُ يُكتب في الصفّ لا في رأس الطلب.
    [BLIND, "reception", { can_view_patients: true, can_view_payments: false }],
    [ADMIN, "admin", {}],
    [DOC, "doctor", { medical_specialties: '["physiotherapy"]' }],
    [OTHER, "reception", { can_view_patients: true, can_view_payments: true, branch_id: B2, branch_ids: JSON.stringify([B2]) }],
  ];
  for (const [id, role, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true)`, [id, `psv-${id}`, `موظّف ${id}`, role, B1, JSON.stringify([B1])]);
    for (const [k, v] of Object.entries(extra)) {
      await q(`UPDATE system_users SET ${k} = $2${k === "medical_specialties" || k === "branch_ids" ? "::jsonb" : ""} WHERE id = $1`, [id, v]);
    }
  }
  const sess = (id: number, role: string, perms: Record<string, unknown>, branch = B1) => hdr({
    userId: id, displayName: `موظّف ${id}`, role, roles: [role], branchId: branch, accessibleBranches: [branch], isAdmin: role === "admin",
    permissions: { canViewPatients: true, ...perms },
  });
  const S = {
    recv: sess(RECV, "reception", { canViewPayments: true }), spec: sess(SPEC, "physio_specialist", {}), ther: sess(THER, "therapist", {}),
    blind: sess(BLIND, "reception", {}), admin: sess(ADMIN, "admin", {}), doc: sess(DOC, "doctor", { canViewPayments: true }),
    other: sess(OTHER, "reception", { canViewPayments: true }, B2),
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
  const sheet = (pid: number, s: string) => call("GET", `/api/patients/${pid}/physio-sheet`, s);

  try {
    // ══ المريضُ: علاجٌ طبيعيّ بكلّ ما في الورقة ══
    const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, referral_notes, age, height, weight,
        medical_condition, branch_id, is_physiotherapy, total_cost, patient_classification, governorate, address, injury_cause, injury_date,
        presenting_complaint, injuries, physio_plan, treatment_type)
      VALUES ($1, '07731112233', 'من شخص آخر', $2, 'د. حسن', '41', '165', '72', 'physiotherapy', $3, true, 0, 'new', 'ذي قار', 'الناصرية',
        'حادث سير', '2026-08-01', 'ألم الرقبة ينزل إلى الذراع', $4, $5::jsonb, 'تمارين تأهيلية') RETURNING id`,
      [`سارة ${MARK}`, MARK, B1, JSON.stringify([{ type: "انزلاق غضروفي", area: "الرقبة", side: "يمين" }]),
        JSON.stringify([{ treatmentType: "تمارين تأهيلية", sessionCount: 10 }])])).rows[0].id);
    await storage.syncPatientCases(pid);
    const caseId = Number((await q(`SELECT id FROM patient_cases WHERE patient_id = $1 AND case_type = 'physiotherapy'`, [pid])).rows[0].id);
    await q(`UPDATE patient_cases SET cost = 250000 WHERE id = $1`, [caseId]);

    //  معاينةٌ قديمة (قبل الاستمارة) ثمّ معاينةٌ على الاستمارة بتقييمها.
    const oldExam = await call("POST", `/api/medical/patients/${pid}/exams`, S.spec, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "ألم رقبة", clinicalFindings: "تحدّد الحركة", plan: "", notes: "",
      diagnosis: "التهاب مفاصل الرقبة", prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 6 }] },
    });
    await new Promise((r) => setTimeout(r, 20));
    const newExam = await call("POST", `/api/medical/patients/${pid}/exams`, S.spec, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "اختبار سبيرلنغ إيجابي يميناً",
      diagnosis: "اعتلال جذر عصبي رقبي C6", assessment: GOOD(),
      prescription: { treatments: [{ treatmentType: "تمارين تأهيلية", sessionCount: 10 }, { treatmentType: "تيكار", sessionCount: 4 }] },
    });
    //  ومعاينةٌ ثالثة أُلغيت — ليست سلطةً سريرية، فلا تظهر في الورقة (`activeExamSql`).
    const cancelled = await call("POST", `/api/medical/patients/${pid}/exams`, S.spec, {
      idempotencyKey: randomUUID(), caseType: "physiotherapy", chiefComplaint: "", clinicalFindings: "", plan: "", notes: "",
      diagnosis: "معاينةٌ أُلغيت", assessment: GOOD(), prescription: {},
    });
    await q(`INSERT INTO medical_exam_cancellations (exam_id, patient_id, branch_id, reason) VALUES ($1, $2, $3, 'وُقّعت على المريض الخطأ')`,
      [cancelled.json?.id, pid, B1]);
    check(oldExam.status === 200 && newExam.status === 200 && cancelled.status === 200, "تهيئة: المعايناتُ الثلاث وُقّعت",
      JSON.stringify([oldExam.json, newExam.json, cancelled.json]));

    //  زياراتُ القسم، وزيارةٌ بلا قسم (قديمة)، وزيارةُ جهاز (ليست منها).
    const visit = async (date: string, type: string | null, details: string, caseRef: number | null) => Number((await q(
      `INSERT INTO visits (patient_id, branch_id, visit_date, details, notes, treatment_type, created_by, case_id)
       VALUES ($1, $2, $3, $4, NULL, $5, $6, $7) RETURNING id`, [pid, B1, date, details, type, RECV, caseRef])).rows[0].id);
    const v1 = await visit("2026-10-01 09:00:00", "تمارين تأهيلية", "جلسة علاج طبيعي", caseId);
    const v2 = await visit("2026-10-03 10:00:00", "تمارين تأهيلية", "جلسة علاج طبيعي", caseId);
    const v3 = await visit("2026-10-05 10:00:00", null, "زيارة قديمة", null);
    await visit("2026-10-06 10:00:00", null, "خدمة جديدة", caseId);
    //  وزيارةُ جهازٍ بلا قسمٍ مكتوب (صفٌّ قديم) — ليست من مراجعات العلاج الطبيعي.
    const pcase = Number((await q(`INSERT INTO patient_cases (patient_id, case_type, cost) VALUES ($1, 'prosthetic', 0) RETURNING id`, [pid])).rows[0].id);
    const ep = Number((await q(`INSERT INTO patient_device_episodes (patient_id, case_id, sequence_number, branch_id) VALUES ($1, $2, 1, $3) RETURNING id`,
      [pid, pcase, B1])).rows[0].id);
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, details, created_by, case_id, device_episode_id)
             VALUES ($1, $2, '2026-10-02 10:00:00', 'زيارة جهاز', $3, NULL, $4)`, [pid, B1, RECV, ep]);
    //  دفعاتُ القسم: يومَ v1 (تلتصق بها)، ويومٌ بلا زيارة (سطرٌ مستقلّ)، وجلستان مُهداتان؛ ودفعةٌ بلا قسم لا تُعدّ في مال القسم.
    const pay = async (date: string, amount: number, caseRef: number | null, extra: Record<string, unknown> = {}) => {
      await q(`INSERT INTO payments (patient_id, branch_id, amount, date, case_id, payment_treatment_type, session_count, is_free_sessions, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [pid, B1, amount, date, caseRef, extra.type ?? null, extra.sessions ?? null, extra.free ?? false, extra.notes ?? null]);
    };
    await pay("2026-10-01 09:05:00", 100000, caseId);
    await pay("2026-10-04 12:00:00", 50000, caseId, { notes: "دفعة نقدية" });
    await pay("2026-10-04 12:05:00", 0, caseId, { type: "تمارين تأهيلية", sessions: 2, free: true });
    await pay("2026-10-02 12:00:00", 999, null);
    await q(`INSERT INTO service_discount_requests (patient_id, case_id, branch_id, department, original_price, proposed_final_price, discount_amount,
               discount_percentage, reason, status, approved_final_price, decided_at, applied_at)
             VALUES ($1, $2, $3, 'physiotherapy', 300000, 260000, 40000, 13.33, 'حالة إنسانية', 'approved', 250000, now(), now())`,
      [pid, caseId, B1]);
    //  وطلبُ خصمٍ لم يُحسم بعد — ليس من مال القسم.
    await q(`INSERT INTO service_discount_requests (patient_id, case_id, branch_id, department, original_price, proposed_final_price, discount_amount,
               discount_percentage, reason, status) VALUES ($1, $2, $3, 'physiotherapy', 250000, 200000, 50000, 20, 'طلبٌ معلّق', 'pending')`,
      [pid, caseId, B1]);

    //  الخطّة: بروتوكولٌ وخطّةٌ معتمَدة بتقييمين، ثمّ مسوّدةٌ أحدث.
    const proto = Number((await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group) VALUES ($1, 'ألم الرقبة', 'Neck pain', 'spine', 'adult') RETURNING id`, [PROTO_CODE])).rows[0].id);
    const plan = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, sessions_per_week, duration_weeks, status,
        decided_by_name, created_by_name, review_status, reviewed_by_name, created_at)
      VALUES ($1, $2, $3, 'خطة الرقبة', 3, 4, 'approved', 'سليم', 'أحمد', 'reviewed', 'سليم', now() - interval '2 days') RETURNING id`, [pid, B1, proto])).rows[0].id);
    await q(`INSERT INTO physio_assessments (plan_id, patient_id, branch_id, kind, assessed_on, pain, goals, decision)
             VALUES ($1, $2, $3, 'baseline', '2026-10-01', 8, '[]'::jsonb, 'continue'),
                    ($1, $2, $3, 'periodic', '2026-10-20', 3, '[{"text":"x","status":2},{"text":"y","status":1}]'::jsonb, 'continue')`, [plan, pid, B1]);
    await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status, created_at) VALUES ($1, $2, 'مسوّدة أحدث', 'draft', now())`, [pid, B1]);

    console.log("\n── أ. ما يراه الاستعلامُ (يرى الدفعات ولا يقرأ الخطط) ──");
    const r = await sheet(pid, S.recv);
    const d = r.json;
    same("أ.١ **حقولُ الاستعلامات من الملفّ** — و«سبب المراجعة» و«ملاحظة الجهة» والإصاباتُ صفوفاً",
      [r.status, d?.patient?.name, d?.patient?.presentingComplaint, d?.patient?.referralNotes, d?.patient?.governorate, d?.patient?.injuries],
      [200, `سارة ${MARK}`, "ألم الرقبة ينزل إلى الذراع", "د. حسن", "ذي قار", [{ type: "انزلاق غضروفي", area: "الرقبة", side: "يمين" }]]);
    same("أ.٢ **المعايناتُ الأحدثُ أوّلاً** — بتشخيصها ووصفتها وملاحظاتها وسطرِ تقييمها",
      [d?.exams?.map((e: any) => e.diagnosis), d?.exams?.[0]?.treatments, d?.exams?.[0]?.notes, d?.exams?.[0]?.assessment?.form,
        d?.exams?.[0]?.assessmentSummary],
      [["اعتلال جذر عصبي رقبي C6", "التهاب مفاصل الرقبة"],
        [{ treatmentType: "تمارين تأهيلية", sessionCount: 10 }, { treatmentType: "تيكار", sessionCount: 4 }],
        "اختبار سبيرلنغ إيجابي يميناً", "BC-PT-01", "الألم 4–8 من ١٠ · الرقبة · مستمرّ · الإحساس ضعيف · بنود خطة العلاج: 2"]);
    same("أ.٣ **والمعاينةُ القديمة لا يضيع منها حرف** — خاناتُها بعناوينها في «ملاحظات الفاحص»، وبلا تقييم",
      [d?.exams?.[1]?.notes, d?.exams?.[1]?.assessment], ["الشكوى: ألم رقبة\nالفحص السريري: تحدّد الحركة", null]);
    same("أ.٤ **المالُ من القسم** — كلفتُه ودفعاتُه (لا الدفعةُ بلا قسم)، والمُهدى والخصمُ المعتمَد",
      d?.money, { total: 250000, paid: 150000, remaining: 100000, freeSessions: 2,
        discounts: [{ originalPrice: 300000, finalPrice: 250000, reason: "حالة إنسانية" }] });
    const vis = (d?.visits ?? []) as any[];
    same("أ.٥ **المراجعاتُ** — زياراتُ القسم وما لا قسمَ له بترتيبها، ومَن سجّلها، وما دُفع يومها، والدفعةُ بلا زيارة سطرٌ مستقلّ",
      vis.map((v) => [v.kind, v.type ?? v.details, v.recordedBy, v.paid]),
      [["visit", "تمارين تأهيلية", `موظّف ${RECV}`, 100000], ["visit", "تمارين تأهيلية", `موظّف ${RECV}`, null],
        ["payment", "دفعة", null, 50000], ["visit", "زيارة قديمة", `موظّف ${RECV}`, null], ["visit", "خدمة جديدة", `موظّف ${RECV}`, null]]);
    same("أ.٦ ومجموعُ ما تحت المراجعات = «المدفوع»", vis.reduce((s, v) => s + (v.paid ?? 0), 0), d?.money?.paid);
    same("أ.٧ **الجلساتُ بحساب تبويب الزيارات** — خطّةُ «الكلفة والجلسات» ١٠ ناقصاً المنفّذ، و«خدمة جديدة» ليست جلسة",
      d?.sessions, [{ type: "تمارين تأهيلية", bought: 10, done: 2, remaining: 8 }, { type: "غير محدد", bought: 0, done: 1, remaining: -1 }]);
    same("أ.٨ **والاستعلامُ لا يقرأ الخطط** — خانتُها مقفولة بلا محتوى", [d?.canViewPlan, d?.plan, d?.progress], [false, null, null]);

    console.log("\n── ب. الخطّةُ لمن يقرؤها، بما يراه منها ──");
    const ds = (await sheet(pid, S.spec)).json;
    same("ب.١ **المعالجُ (المنفّذ) يرى المعتمَدة لا المسوّدةَ الأحدث** — والتقدّمُ من تقييماتها",
      [(await sheet(pid, S.ther)).json?.plan?.title, (await sheet(pid, S.ther)).json?.progress],
      ["خطة الرقبة", { firstPain: 8, firstOn: "2026-10-01", lastPain: 3, lastOn: "2026-10-20", count: 2, goalsPct: 75, lastDecision: "استمرار" }]);
    same("ب.٢ والمسؤولُ يرى أحدثَ خطّة ولو مسوّدة", (await sheet(pid, S.admin)).json?.plan?.title, "مسوّدة أحدث");
    const dt = (await sheet(pid, S.ther)).json?.plan;
    same("ب.٣ والخطّةُ ببروتوكولها وجرعتها ومَن راجعها",
      [dt?.protocolName, dt?.sessionsPerWeek, dt?.durationWeeks, dt?.statusLabel, dt?.reviewLabel, dt?.reviewedByName],
      ["ألم الرقبة", 3, 4, "معتمَدة", "راجعها المشرف", "سليم"]);
    same("ب.٤ والأخصائيُّ يقرأ الخطط", ds?.canViewPlan, true);

    console.log("\n── ج. المالُ لمن يرى الدفعات وحده ──");
    const b = (await sheet(pid, S.blind)).json;
    same("ج.١ **بلا «عرض الدفعات»: لا مال، ولا مبلغ تحت مراجعة، ولا سطرَ دفعة** — والجلساتُ باقية",
      [b?.money, b?.canViewMoney, (b?.visits ?? []).some((v: any) => v.kind === "payment" || v.paid !== null), b?.sessions?.[0]?.remaining],
      [null, false, false, 8]);
    same("ج.٢ والطبيبُ بلا دورٍ غيره لا يرى المالَ ولو حمل المفتاح (القاعدةُ نفسُها في استمارة الأجهزة)",
      (await sheet(pid, S.doc)).json?.money, null);

    console.log("\n── د. النطاق ──");
    const other = await sheet(pid, S.other);
    same("د.١ موظّفُ فرعٍ آخر ⟵ ٤٠٣", other.status, 403);
    const dev = Number((await q(`INSERT INTO patients (name, phone, referral_source, referral_sub_source, age, height, weight, medical_condition, branch_id,
        is_amputee, total_cost, patient_classification) VALUES ($1, '07731112299', 'فيسبوك', $2, '30', '170', '70', 'amputee', $3, true, 0, 'new') RETURNING id`,
      [`طرف ${MARK}`, MARK, B1])).rows[0].id);
    await storage.syncPatientCases(dev);
    same("د.٢ مريضٌ بلا علاجٍ طبيعيّ ⟵ ٤٠٤", (await sheet(dev, S.recv)).status, 404);
    await softDeletePatient({ patientId: dev, reason: "تسجيلٌ مكرّر للاختبار", actor: { userId: ADMIN, isAdmin: true, role: "admin", scope: null } as any });
    same("د.٣ ومريضٌ في السلّة ⟵ ٤٠٩", (await sheet(dev, S.recv)).status, 409);
    void v2; void v3;
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
