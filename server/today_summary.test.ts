// §4.gy — «ملخص مرضى اليوم» (طلبُ المالك ٢٠٢٦-١١-٢٦، وموافقتُه ٢٠٢٦-١١-٢٧).
// قاعدة محلّية: `npm run test:today-summary`.
//
// ══ ما يحرسه (على النقطة الحقيقية `GET /api/reports/today-summary`) ══════════════════════════════════════
// (أ) الخالص: اليومُ والجديدُ والقديمُ ودمجُ الحفظة والتصفية.
// (ب) الصلاحية: بلا المفتاح ٤٠٣ (ولو حمل «عرض التقارير»)، وبه ٢٠٠، والمسؤولُ بسلطته؛ والمفتاحُ يُشعل من نافذة المستخدم بسطر تدقيق.
// (ج) مَن يظهر: كلُّ حدثٍ بفرعه ويوم بغداد — لا المحذوف ولا «خدمة جديدة» ولا المعاينة الملغاة ولا أمسِ، ومنتصفُ ليل بغداد داخل.
// (د) البطاقة: قديمٌ أم جديد، وسببُ الحضور، وما جرى بالترتيب، والحالةُ الآن، والمالُ والمتبقي.
// (هـ) المال: بلا «عرض المدفوعات» لا مبلغَ ولا حدثَ دفعةٍ ولا بطاقةَ «دفعة فقط».
// (و) الفروع: الموظّفُ فرعُه وحده، والمسؤولُ فرعٌ أو الكلّ.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { baghdadTodayYmd } from "@shared/visit_date";
import { newOrOld, parseSummaryDay, mergeSaves, filterCards, patientProblemText, type TodayCard } from "@shared/today_summary";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6917;
const MARK = "اختبار-ملخص-اليوم";
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const ADMIN = 9971, REC = 9972, REC_NOMONEY = 9973, REC_OFF = 9974, REC2 = 9975, EXPERT = 9976, DOCTOR = 9977, TECH = 9978;
const sess = (userId: number, role: string, branchId: number | null, perms: Record<string, boolean>, isAdmin = false) =>
  ({ userId, role, isAdmin, branchId, accessibleBranches: branchId ? [branchId] : null, displayName: `موظف ${userId}`, permissions: perms });
async function http(method: string, path: string, s: any, body?: unknown) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-test-session": Buffer.from(JSON.stringify(s), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j: any = null; try { j = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: j };
}
const today = baghdadTodayYmd();
const dayShift = (ymd: string, n: number) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) + n * 86_400_000).toISOString().slice(0, 10);
const yesterday = dayShift(today, -1);
/** لحظةُ «ساعة:دقيقة» بتوقيت بغداد في يومٍ ما — نصّاً UTC بلا منطقة (للأعمدة بلا منطقة) وبـZ (للأخرى). */
const at = (hh: number, mm = 0, ymd = today) => {
  const d = new Date(Date.parse(`${ymd}T00:00:00Z`) + ((hh - 3) * 60 + mm) * 60_000);
  return { naive: d.toISOString().slice(0, 19).replace("T", " "), tz: d.toISOString() };
};

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source='${MARK}'`;
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM physio_plans WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`).catch(() => {});
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM medical_exam_cancellations WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`).catch(() => {});
  for (const t of ["payments", "cost_entries", "visits", "patient_events", "patient_contacts", "patient_notification_deliveries"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`).catch(() => {});
  }
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM audit_log WHERE entity_type='patient' AND entity_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM patients WHERE referral_source='${MARK}'`);
}

async function main() {
  console.log("── أ. الخالص ──");
  same("أ١. اليوم: الفارغ ⟵ اليوم، والمستقبلُ والتالف يُردّان",
    [parseSummaryDay("", "2026-11-27"), parseSummaryDay("2026-11-28", "2026-11-27"), parseSummaryDay("2026-02-30", "2026-11-27"), parseSummaryDay("2026-11-01", "2026-11-27")],
    ["2026-11-27", { error: "لا ملخّصَ ليومٍ لم يأتِ بعد" }, { error: "التاريخ غير صالح" }, "2026-11-01"]);
  same("أ٢. **جديد = سُجّل في يوم بغداد** (٢٣:٣٠ بغداد أمس قديم، و٠٠:٣٠ اليوم جديد) — والمراجعُ قبل النظام قديمٌ ولو سُجّل اليوم",
    [newOrOld({ createdAt: "2026-11-26T20:30:00.000Z", priorHistory: false }, "2026-11-27"),
     newOrOld({ createdAt: "2026-11-26T21:30:00.000Z", priorHistory: false }, "2026-11-27"),
     newOrOld({ createdAt: "2026-11-26T21:30:00.000Z", priorHistory: true }, "2026-11-27")],
    [{ isNew: false, label: "قديم — منذ 26/11/2026" }, { isNew: true, label: "جديد — سُجّل اليوم" },
     { isNew: false, label: "قديم — سُجّل اليوم (مراجعٌ قبل النظام)" }]);
  same("أ٣. **الحفظةُ الواحدة دفعةٌ واحدة** (صفّان للمريض نفسِه خلال ١٠ ثوانٍ) — والثالثُ بعد دقيقة منفصل",
    mergeSaves([
      { patientId: 1, branchId: 1, at: "2026-11-27T08:00:00.000Z", amount: 100, free: false, sessions: 5, treatmentType: "روبوت", caseType: null },
      { patientId: 1, branchId: 1, at: "2026-11-27T08:00:04.000Z", amount: 50, free: false, sessions: 3, treatmentType: "إبر", caseType: null },
      { patientId: 1, branchId: 1, at: "2026-11-27T08:01:10.000Z", amount: 70, free: false, sessions: null, treatmentType: null, caseType: null },
    ]).map((p) => [p.amount, p.sessions, p.treatmentType]),
    [[150, 8, "روبوت + إبر"], [70, null, null]]);
  const fc = [{ isNew: true, name: "أحمد", code: "WB-1", departments: ["أطراف صناعية"] }, { isNew: false, name: "فاطمة", code: "WB-2", departments: ["علاج طبيعي"] }] as unknown as TodayCard[];
  same("أ٤. التصفية: جدد · قدامى · قسم · بحثٌ بالاسم بلا همزة وبالرمز",
    [filterCards(fc, { who: "new", departments: null, search: "" }).length, filterCards(fc, { who: "old", departments: null, search: "" })[0].name,
     filterCards(fc, { who: "all", departments: ["علاج طبيعي"], search: "" })[0].name, filterCards(fc, { who: "all", departments: null, search: "احمد" })[0].name,
     filterCards(fc, { who: "all", departments: null, search: "wb-2" })[0].name],
    [1, "فاطمة", "فاطمة", "أحمد", "فاطمة"]);
  same("أ٥. «شنو عنده» بقاعدة التقرير اليومي: رمزُ القسم لا يُعرض، والتفصيلُ أوّلاً",
    [patientProblemText({ medicalCondition: "amputee", amputationSite: "تحت الركبة يمين", isAmputee: true }),
     patientProblemText({ medicalCondition: "ألم ظهر مزمن" }), patientProblemText({ medicalCondition: "physiotherapy", isPhysiotherapy: true })],
    ["تحت الركبة يمين", "ألم ظهر مزمن", "علاج طبيعي"]);

  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد أطراف'),(2,'الوارث كربلاء') ON CONFLICT DO NOTHING`);
  for (const [id, role, branch] of [[ADMIN, "admin", null], [REC, "reception", 1], [REC_NOMONEY, "reception", 1], [REC_OFF, "reception", 1],
    [REC2, "reception", 2], [EXPERT, "prosthetics_expert", 1], [DOCTOR, "doctor", 1], [TECH, "physio_executor", 1]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name,
               is_active=true, can_view_today_summary=false`,
      [id, `ts_u${id}`, ({ [REC]: "زهراء", [EXPERT]: "عباس", [DOCTOR]: "د. حيدر", [TECH]: "مصطفى" } as any)[id] ?? `موظف ${id}`, role, branch, JSON.stringify(branch ? [branch] : [])]);
  }
  //  الجلسةُ تُبنى من صفّ الحساب في كلّ طلب (§4.fr) — فالمفاتيحُ في القاعدة لا في رأس الاختبار وحده.
  for (const [id, summary, payments, reports] of [[REC, true, true, false], [REC_NOMONEY, true, false, true], [REC_OFF, false, true, true], [REC2, true, true, false]] as any[]) {
    await q(`UPDATE system_users SET can_view_today_summary=$2, can_view_payments=$3, can_view_reports=$4 WHERE id=$1`, [id, summary, payments, reports]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    r.session.destroy = (cb: () => void) => cb();
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...a: any[]) =>
    (a.length === 1 && typeof a[0] === "function" && a[0].name === "session") ? app : realUse(...(a as [any]));
  const srv = createServer(app);
  await registerRoutes(srv, app);
  srv.listen(PORT);
  await new Promise((r) => srv.once("listening", r));

  const S = {
    admin: sess(ADMIN, "admin", null, {}, true),
    rec: sess(REC, "reception", 1, { canViewTodaySummary: true, canViewPayments: true }),
    noMoney: sess(REC_NOMONEY, "reception", 1, { canViewTodaySummary: true, canViewReports: true }),
    off: sess(REC_OFF, "reception", 1, { canViewReports: true, canViewPayments: true }),
    rec2: sess(REC2, "reception", 2, { canViewTodaySummary: true, canViewPayments: true }),
  };
  const get = (s: any, qs = "") => http("GET", `/api/reports/today-summary${qs}`, s);

  //  ═══ الزرع ═══
  const mk = async (tag: string, o: { created?: string; branch?: number; cases?: string[]; prior?: boolean; extra?: Record<string, unknown> } = {}) => {
    const id = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, total_cost, patient_classification,
        had_prior_center_history, created_at, amputation_site, is_amputee, is_physiotherapy, is_medical_support)
      VALUES ($1,'07700000000',$2,'40',$3,$4,0,'new',$5,$6::timestamp,$7,$8,$9,$10) RETURNING id`,
      [`${MARK} ${tag}`, MARK, o.cases?.[0] === "physiotherapy" ? "ألم أسفل الظهر المزمن" : "amputee", o.branch ?? 1, o.prior ?? null,
        o.created ?? at(9, 0, dayShift(today, -40)).naive, o.cases?.[0] === "prosthetic" ? "تحت الركبة — يمين" : null,
        (o.cases ?? []).includes("prosthetic"), (o.cases ?? []).includes("physiotherapy"), (o.cases ?? []).includes("medical_support")]))[0].id);
    const caseIds: Record<string, number> = {};
    for (const c of o.cases ?? []) caseIds[c] = Number((await q(`INSERT INTO patient_cases (patient_id, case_type, branch_id) VALUES ($1,$2,$3) RETURNING id`, [id, c, o.branch ?? 1]))[0].id);
    return { id, caseIds };
  };
  const visit = (pid: number, caseId: number | null, when: string, details: string | null, branch = 1) =>
    q(`INSERT INTO visits (patient_id, branch_id, visit_date, case_id, details) VALUES ($1,$2,$3::timestamp,$4,$5) RETURNING id`, [pid, branch, when, caseId, details]);
  const pay = (pid: number, caseId: number | null, when: string, amount: number, branch = 1, more: { type?: string; sessions?: number } = {}) =>
    q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, date, payment_treatment_type, session_count) VALUES ($1,$2,$3,$4,$5::timestamp,$6,$7)`,
      [pid, branch, caseId, amount, when, more.type ?? null, more.sessions ?? null]);

  //  أ — جديدٌ اليوم: تسجيل ⟵ طلب معاينة ⟵ معاينة ⟵ تم الشراء ⟵ دفع (والكلفةُ ٢٬٥٠٠٬٠٠٠).
  const A = await mk("أ-جديد", { created: at(9, 15).naive, cases: ["prosthetic"] });
  await q(`INSERT INTO audit_log (entity_type, entity_id, action, user_id, created_at) VALUES ('patient',$1,'create',$2,$3::timestamp)`, [A.id, REC, at(9, 15).naive]);
  await visit(A.id, A.caseIds.prosthetic, at(9, 16).naive, "طلب معاينة طبية");
  const epA = Number((await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, requested_item, service_path, created_at)
    VALUES ($1,$2,1,1,'in_manufacturing','full_device','exam',$3::timestamptz) RETURNING id`, [A.id, A.caseIds.prosthetic, at(9, 16).tz]))[0].id);
  const exA = Number((await q(`INSERT INTO medical_exams (patient_id, case_id, branch_id, case_type, doctor_id, doctor_name, chief_complaint, clinical_findings, diagnosis, plan, notes, prescription, device_episode_id, signed_at)
    VALUES ($1,$2,1,'prosthetic',$3,'د. حيدر','شكوى','فحص','طرف تحت الركبة بسوكيت سليكون','خطة','',$4::jsonb,$5,$6::timestamptz) RETURNING id`,
    [A.id, A.caseIds.prosthetic, DOCTOR, JSON.stringify({}), epA, at(9, 40).tz]))[0].id);
  let fA = (await q(`SELECT id FROM post_exam_followups WHERE medical_exam_id=$1`, [exA]))[0]?.id;
  if (!fA) fA = (await q(`INSERT INTO post_exam_followups (patient_id, case_id, branch_id, service_type, device_episode_id, status, medical_exam_id, approved_price)
    VALUES ($1,$2,1,'prosthetic',$3,'converted',$4,2500000) RETURNING id`, [A.id, A.caseIds.prosthetic, epA, exA]))[0].id;
  await q(`UPDATE post_exam_followups SET status='converted', approved_price=2500000 WHERE id=$1`, [fA]);
  await q(`INSERT INTO post_exam_followup_events (followup_id, patient_id, branch_id, event_type, created_at) VALUES ($1,$2,1,'converted',$3::timestamptz)`, [fA, A.id, at(11, 0).tz]);
  await q(`INSERT INTO cost_entries (patient_id, branch_id, case_id, amount, source, created_at) VALUES ($1,1,$2,2500000,'assign_manufacturing',$3::timestamp)`, [A.id, A.caseIds.prosthetic, at(11, 0).naive]);
  await q(`UPDATE patients SET total_cost = 2500000 WHERE id=$1`, [A.id]);
  await pay(A.id, A.caseIds.prosthetic, at(11, 5).naive, 500000);

  //  ب — قديمٌ في العلاج الطبيعي: الجلسةُ التاسعة من ٢٤، وزيارتُها لا تُكتب مرّتين.
  const B = await mk("ب-علاج", { cases: ["physiotherapy"] });
  const planB = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status, total_sessions) VALUES ($1,1,'ألم الظهر','approved',24) RETURNING id`, [B.id]))[0].id);
  await q(`INSERT INTO physio_plan_sessions (plan_id, patient_id, branch_id, session_date, shift, executed_by, executed_by_name)
           SELECT $1, $2, 1, $3::date - g, 'morning', $4, 'مصطفى' FROM generate_series(1, 8) g`, [planB, B.id, today, TECH]);
  const vB = Number((await visit(B.id, B.caseIds.physiotherapy, at(10, 20).naive, "جلسة من الخطة: ألم الظهر"))[0].id);
  await q(`INSERT INTO physio_plan_sessions (plan_id, patient_id, branch_id, session_date, shift, executed_by, executed_by_name, visit_id, created_at)
           VALUES ($1,$2,1,$3::date,'morning',$4,'مصطفى',$5,$6::timestamptz)`, [planB, B.id, today, TECH, vB, at(10, 20).tz]);

  //  ج — قديمٌ يستلم جهازه ويدفع الباقي.
  const C = await mk("ج-تسليم", { cases: ["prosthetic"] });
  const epC = Number((await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, requested_item, service_path, created_at)
    VALUES ($1,$2,1,1,'delivered','full_device','exam',$3::timestamptz) RETURNING id`, [C.id, C.caseIds.prosthetic, at(9, 0, dayShift(today, -30)).tz]))[0].id);
  const woC = Number((await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage, device_episode_id)
    VALUES ($1,1,$2,'prosthetic','initial_build','completed','delivered',$3) RETURNING id`, [C.id, EXPERT, epC]))[0].id);
  await q(`INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, performed_by, created_at) VALUES ($1,'delivered','ready_for_fitting','delivered',$2,$3::timestamptz)`, [woC, EXPERT, at(11, 40).tz]);
  await visit(C.id, C.caseIds.prosthetic, at(11, 38).naive, "استلام الجهاز");
  await pay(C.id, C.caseIds.prosthetic, at(11, 45).naive, 150000);

  //  د — دفع قسطاً ولم يحضر. هـ — محذوف. و — «خدمة جديدة» وحدها. ز — أمسِ ٢٣:٣٠. ز٢ — اليوم ٠٠:٣٠. ح — فرع ٢. ط — معاينةٌ ملغاة وحدها.
  const D = await mk("د-قسط", { cases: ["prosthetic"] });           await pay(D.id, D.caseIds.prosthetic, at(14, 30).naive, 200000);
  const E = await mk("هـ-محذوف", { cases: ["prosthetic"] });        await visit(E.id, E.caseIds.prosthetic, at(10).naive, "صيانة");
  await q(`UPDATE patients SET deleted_at = now(), deleted_reason = 'اختبار', restore_until = now() + interval '30 days', deleted_total_cost = 0, deleted_total_paid = 0, deleted_remaining = 0, deleted_needed_admin = false,
             deleted_pending_json = '{"pendingCharges":0,"pendingDiscounts":0,"pendingPriceRequests":0,"openFollowups":0,"openSettlements":0}'::jsonb WHERE id=$1`, [E.id]);
  const F = await mk("و-خدمة-جديدة", { cases: ["physiotherapy"] }); await visit(F.id, F.caseIds.physiotherapy, at(10).naive, "خدمة جديدة");
  const G = await mk("ز-أمس", { cases: ["prosthetic"] });            await visit(G.id, G.caseIds.prosthetic, at(23, 30, yesterday).naive, "صيانة");
  const G2 = await mk("ز٢-منتصف-الليل", { cases: ["prosthetic"] });  await visit(G2.id, G2.caseIds.prosthetic, at(0, 30).naive, "صيانة");
  const H = await mk("ح-كربلاء", { cases: ["prosthetic"], branch: 2 }); await visit(H.id, H.caseIds.prosthetic, at(10).naive, "صيانة", 2);
  const I = await mk("ط-معاينة-ملغاة", { cases: ["prosthetic"] });
  const exI = Number((await q(`INSERT INTO medical_exams (patient_id, case_id, branch_id, case_type, doctor_id, doctor_name, chief_complaint, clinical_findings, diagnosis, plan, notes, prescription, signed_at)
    VALUES ($1,$2,1,'prosthetic',$3,'د. حيدر','ش','ف','ت','خ','',$4::jsonb,$5::timestamptz) RETURNING id`, [I.id, I.caseIds.prosthetic, DOCTOR, "{}", at(10).tz]))[0].id);
  await q(`INSERT INTO medical_exam_cancellations (exam_id, patient_id, branch_id, cancelled_by, cancelled_by_name, reason) VALUES ($1,$2,1,$3,'د. حيدر','خطأ')`, [exI, I.id, DOCTOR]);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id=$1`, [I.id]);
  //  ي — حفظةٌ بنوعين (صفّان خلال ثانيتين) واسترجاعٌ بعدها. ك — مراجعٌ قبل النظام سُجّل اليوم.
  const J = await mk("ي-حفظة-واسترجاع", { cases: ["physiotherapy"] });
  await visit(J.id, J.caseIds.physiotherapy, at(12, 0).naive, null);
  await pay(J.id, J.caseIds.physiotherapy, at(12, 1).naive, 100000, 1, { type: "روبوت", sessions: 4 });
  await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, date, payment_treatment_type, session_count) VALUES ($1,1,$2,50000,($3::timestamp + interval '2 seconds'),'إبر',2)`, [J.id, J.caseIds.physiotherapy, at(12, 1).naive]);
  await pay(J.id, J.caseIds.physiotherapy, at(13, 0).naive, -30000);
  const K = await mk("ك-قبل-النظام", { created: at(12, 30).naive, cases: ["medical_support"], prior: true });

  const OURS = new Set([A, B, C, D, E, F, G, G2, H, I, J, K].map((x) => x.id));
  const mine = (b: any): TodayCard[] => ((b?.cards ?? []) as TodayCard[]).filter((c) => OURS.has(c.patientId));
  const by = (b: any) => Object.fromEntries(mine(b).map((c) => [c.patientId, c]));

  try {
    console.log("\n── ب. الصلاحية ──");
    same("ب١. **بلا المفتاح ٤٠٣ ولو حمل «عرض التقارير» و«عرض المدفوعات»** · وبه ٢٠٠ · والمسؤولُ بسلطته",
      [(await get(S.off)).status, (await get(S.rec)).status, (await get(S.admin)).status], [403, 200, 200]);
    const p1 = await http("PATCH", `/api/admin/users/${REC_OFF}`, S.admin, { canViewTodaySummary: true });
    same("ب٢. المسؤولُ يشعل المفتاحَ من نافذة المستخدم ⟵ العمودُ true وسطرُ تدقيق",
      [p1.status, (await q(`SELECT can_view_today_summary AS v FROM system_users WHERE id=$1`, [REC_OFF]))[0].v,
       (await q(`SELECT 1 FROM audit_log WHERE entity_type='system_user' AND entity_id=$1 AND new_values::text LIKE '%canViewTodaySummary%'`, [REC_OFF])).length > 0],
      [200, true, true]);
    const p2 = await http("PATCH", `/api/admin/users/${REC_OFF}`, S.rec, { canViewTodaySummary: true });
    same("ب٣. والموظّفُ لا يشعله لغيره", p2.status >= 400, true);
    same("ب٤. يومٌ لم يأتِ ⟵ ٤٠٠", (await get(S.rec, `?date=${dayShift(today, 1)}`)).status, 400);

    console.log("\n── ج. مَن يظهر ──");
    const r = await get(S.rec);
    const ids = mine(r.body).map((c) => c.patientId).sort((a, b) => a - b);
    same("ج١. **فرعُ ١ اليوم**: أ ب ج د ز٢ ي ك — لا المحذوف ولا «خدمة جديدة» ولا أمسِ ولا كربلاء ولا المعاينةُ الملغاة",
      ids, [A, B, C, D, G2, J, K].map((x) => x.id).sort((a, b) => a - b));
    same("ج٢. **أمسِ ٢٣:٣٠ بغداد** يظهر في يوم أمس (ومعه جلسةُ ب الثامنة بيومها) لا اليوم",
      mine((await get(S.rec, `?date=${yesterday}`)).body).map((c) => c.patientId).sort((a, b) => a - b), [B.id, G.id].sort((a, b) => a - b));

    console.log("\n── د. البطاقة ──");
    const c = by(r.body);
    same("د١. **أ جديد**: «جديد — سُجّل اليوم» وسجّلته زهراء، والسببُ «طلب معاينة طبية»، و«شنو عنده» تفصيلُ البتر",
      [c[A.id].isNew, c[A.id].newLabel, c[A.id].registeredBy, c[A.id].reasons, c[A.id].problem, c[A.id].departments],
      [true, "جديد — سُجّل اليوم", "زهراء", ["طلب معاينة طبية"], "تحت الركبة — يمين", ["أطراف صناعية"]]);
    same("د٢. **ما جرى لـأ بالترتيب**: تسجيل ⟵ زيارة ⟵ طلب جهاز ⟵ معاينة ⟵ تم الشراء ⟵ دفع",
      c[A.id].events.map((e) => [e.kind, e.text, e.amount ?? null]),
      [["registered", "سُجّل في المركز — سجّله زهراء", null], ["visit", "طلب معاينة طبية", null], ["device", "طلب طرف صناعي كامل", null],
       ["exam", "معاينة أطراف صناعية — د. حيدر: طرف تحت الركبة بسوكيت سليكون", null], ["decision", "تم الشراء — أطراف صناعية", 2500000],
       ["payment", "دفع", 500000]]);
    same("د٣. **حالةُ أ ومالُه**: تم الشراء بلا خبير بعد، ودفع ٥٠٠ ألف والمتبقي مليونان",
      [c[A.id].statuses, c[A.id].money], [[{ text: "تم الشراء — بانتظار إسناد خبير", tone: "warn" }], { paid: 500000, refunded: 0, remaining: 2000000, credit: 0 }]);
    same("د٤. **ب قديم**: الجلسةُ التاسعة من ٢٤ بمنفّذها، وزيارتُها لا تُكتب حدثاً ثانياً، والحالةُ «باقي ١٥»",
      [c[B.id].isNew, c[B.id].reasons, c[B.id].events.map((e) => e.text), c[B.id].statuses.map((s) => s.text), c[B.id].money?.paid],
      [false, ["جلسة من الخطة"], ["الجلسة 9 من 24 — ألم الظهر — نفّذها مصطفى"], ["خطّةٌ قائمة — الجلسة 9 من 24 · باقي 15"], 0]);
    same("د٥. **ج يستلم**: «استلام الجهاز» ⟵ سُلِّم بخبيره ⟵ دفع، والحالةُ «مُسلَّم»",
      [c[C.id].events.map((e) => e.text), c[C.id].statuses.map((s) => s.text)],
      [["استلام الجهاز", "سُلِّم الجهاز — عباس", "دفع"], ["مُسلَّم"]]);
    same("د٦. **د دفع ولم يحضر**: خارجَ عدّ الحاضرين، وسببُه «لم يحضر — دفعة فقط»، وفي آخر القائمة",
      [c[D.id].attended, c[D.id].reasons, mine(r.body).at(-1)?.patientId], [false, ["لم يحضر — دفعة فقط"], D.id]);
    same("د٧. **ي: الحفظةُ بنوعين دفعةٌ واحدة، والاسترجاعُ حدثٌ مستقلّ**",
      [c[J.id].events.map((e) => [e.kind, e.text, e.amount ?? null]), c[J.id].money?.paid, c[J.id].money?.refunded],
      [[["visit", "جلسة علاج طبيعي", null], ["payment", "دفع — روبوت + إبر · 6 جلسة", 150000], ["refund", "استرجاع مبلغ", 30000]], 150000, 30000]);
    same("د٨. **ك مراجعٌ قبل النظام سُجّل اليوم**: قديمٌ لا جديد", [c[K.id].isNew, c[K.id].newLabel], [false, "قديم — سُجّل اليوم (مراجعٌ قبل النظام)"]);
    const tot = r.body.totals;
    same("د٩. **المجاميعُ من البطاقات** (القاعدةُ لا تحمل غيرَ مرضانا): ٦ حاضرين · جديدٌ واحد · ٥ قدامى · دفعةٌ فقط واحدة · المقبوضُ ١٬٠٠٠٬٠٠٠ · ٣ لم يدفعوا",
      [mine(r.body).length === r.body.cards.length, tot.patients, tot.newCount, tot.oldCount, tot.paymentOnly, tot.paidToday, tot.unpaid],
      [true, 6, 1, 5, 1, 500000 + 150000 + 200000 + 150000, 3]);

    console.log("\n── هـ. المال ──");
    const nm = await get(S.noMoney);
    const cn = by(nm.body);
    same("هـ١. **بلا «عرض المدفوعات»**: لا money ولا حدثَ دفعةٍ ولا استرجاع، ولا بطاقةَ «دفعة فقط»، ولا مقبوضَ في المجاميع",
      [nm.body.withMoney, Object.values(cn).some((x) => x.money !== undefined),
       Object.values(cn).flatMap((x) => x.events).filter((e) => e.kind === "payment" || e.kind === "refund" || e.amount !== undefined).length,
       Boolean(cn[D.id]), "paidToday" in nm.body.totals, "unpaid" in nm.body.totals],
      [false, false, 0, false, false, false]);

    console.log("\n── و. الفروع ──");
    same("و١. **موظّفُ كربلاء فرعُه وحده**، ولا يغيّره بـbranchId", [mine((await get(S.rec2)).body).map((x) => x.patientId), mine((await get(S.rec2, "?branchId=1")).body).map((x) => x.patientId)], [[H.id], [H.id]]);
    const all = await get(S.admin);
    same("و٢. **المسؤولُ بلا فرع = الكلّ** بفرع كلّ بطاقة (بغداد أوّلاً ثمّ كربلاء)، وبـbranchId=1 كموظّفه",
      [mine(all.body).length, mine(all.body).find((x) => x.patientId === H.id)?.branchName, mine(all.body).filter((x) => x.attended).at(-1)?.branchId,
       mine((await get(S.admin, "?branchId=1")).body).map((x) => x.patientId).join(",") === mine(r.body).map((x) => x.patientId).join(",")],
      [8, "الوارث كربلاء", 2, true]);
  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, REC, REC_NOMONEY, REC_OFF, REC2, EXPERT, DOCTOR, TECH]]).catch(() => {});
    srv.close();
    await pool.end();
  }
  if (failures) { console.log(`\n❌ ${failures} فشل`); process.exit(1); }
  console.log("\n✅ كل فحوص ملخص مرضى اليوم نجحت");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
