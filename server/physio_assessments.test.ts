// إعادةُ التقييم ومقاييسُ البروتوكول و«تخرّج» و«مستحقّ التقييم» (ترحيل ١١٣، §4.cp — المرحلةُ السادسة، ٢٠٢٦-١٠-٠٨).
// `npm run test:physio-assessments` — على النقاط الحقيقية بتطبيق Express الحقيقيّ.
//
// يحرس قراراتِ المالك الخمس: (١) مقاييسُ رقميةٌ لكلّ بروتوكول تُعتمد مستقلّةً عنه، والألمُ والأهدافُ لكلّ مريض؛ (٢) أوّليٌّ ثمّ كلَّ ٢٨ يوماً
// وختاميٌّ عند نهاية المدّة، وتنبيهٌ صباحيّ — والجلساتُ لا تتوقّف؛ (٣) يقيّم كاتبو الخطط وحدهم والمنفّذُ يرى؛ (٤) «تخرّج» حالةٌ منتهية منفصلة؛
// ومعها: القياساتُ لقطةٌ لا تتغيّر بتغيّر المقاييس، ولا حذفَ لخطّةٍ لها تقييمات، وحذفُ المريض يمرّ بها (§8).

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-assessments-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { buildPhysioAssessmentDigests } from "./staff_telegram/digests";
import {
  assessmentDue, compareAssessments, normalized, parseAssessment, parseMeasures, planGoalsList, PROTOCOL_MEASURE_SEED,
} from "@shared/physio_assessments";
import { baghdadTodayYmd } from "@shared/visit_date";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6983;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تقييم-الخطط";
const B1 = 9861, B2 = 9862;
const ADMIN = 9871, SUP = 9872, SPEC = 9873, TECH = 9874, REC = 9875, SPEC2 = 9876;
const IDS = [ADMIN, SUP, SPEC, TECH, REC, SPEC2];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
const addDays = (ymd: string, n: number) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_assessments WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM visits WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_protocols WHERE code LIKE 'TEST-ASM-%'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM staff_telegram_links WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  const today = baghdadTodayYmd();
  // ══ القواعد ══════════════════════════════════════════════════════════════════════════════════════════════
  console.log("\n── القواعد ──");
  const M = [{ code: "gmfm66", nameAr: "حركة", nameEn: "GMFM", unitAr: null, unitEn: null, min: 0, max: 100, higherIsBetter: true },
    { code: "mas", nameAr: "تشنّج", nameEn: "MAS", unitAr: null, unitEn: null, min: 0, max: 4, higherIsBetter: false }];
  same("ق.١ المقاييس: رمزٌ مكرّر · حدّان معكوسان · رمزُ الألم محجوز · بلا اسم · بلا اتجاه — كلُّها تُردّ",
    [parseMeasures([M[0], M[0]]), parseMeasures([{ ...M[0], min: 5, max: 5 }]), parseMeasures([{ ...M[0], code: "pain_nprs" }]),
      parseMeasures([{ ...M[0], nameEn: "" }]), parseMeasures([{ ...M[0], higherIsBetter: "yes" }])].map((x) => typeof x), ["string", "string", "string", "string", "string"]);
  const ok = { assessedOn: today, decision: "continue" };
  same("ق.٢ التقييم: بلا قرار · تخرّجٌ لخطّةٍ غيرِ معتمَدة · إيقافٌ بلا سبب · رمزٌ غريب · قيمةٌ خارج الحدود · لا قياسَ أصلاً — كلُّها تُردّ",
    [parseAssessment({ ...ok, decision: "x", pain: 3 }, M, "approved"), parseAssessment({ ...ok, decision: "discharge", pain: 3 }, M, "pending"),
      parseAssessment({ ...ok, decision: "stop", pain: 3 }, M, "approved"), parseAssessment({ ...ok, scores: [{ code: "odi", value: 3 }] }, M, "approved"),
      parseAssessment({ ...ok, scores: [{ code: "mas", value: 5 }] }, M, "approved"), parseAssessment({ ...ok }, M, "approved")].map((x) => typeof x),
    ["string", "string", "string", "string", "string", "string"]);
  const good = parseAssessment({ ...ok, pain: 4, scores: [{ code: "gmfm66", value: 40.5 }, { code: "mas", value: "" }], goals: [{ text: "يمشي", status: 1 }] }, M, "approved");
  same("ق.٣ والصالح: القيمةُ الفارغة تُتخطّى، والكسورُ مقبولة", typeof good === "string" ? good : [good.pain, good.scores, good.goals], [4, [{ code: "gmfm66", value: 40.5 }], [{ text: "يمشي", status: 1 }]]);
  same("ق.٤ الموعد: أوّليٌّ مستحقٌّ منذ الاعتماد", assessmentDue({ status: "approved", approvedOn: "2026-09-01", durationWeeks: 12, lastOn: null, count: 0, today: "2026-09-05" }),
    { state: "baseline", dueOn: "2026-09-01", kind: "baseline", overdueDays: 4 });
  same("ق.٥ وبعده بثمانيةٍ وعشرين يوماً، والختاميُّ إن جاءت نهايةُ المدّة قبله، وغيرُ المعتمَدة لا موعدَ لها",
    [assessmentDue({ status: "approved", approvedOn: "2026-09-01", durationWeeks: 12, lastOn: "2026-09-02", count: 1, today: "2026-09-10" }),
      assessmentDue({ status: "approved", approvedOn: "2026-09-01", durationWeeks: 4, lastOn: "2026-09-15", count: 2, today: "2026-10-01" }).kind,
      assessmentDue({ status: "graduated", approvedOn: "2026-09-01", durationWeeks: 4, lastOn: null, count: 0, today: "2026-10-01" }).state],
    [{ state: "upcoming", dueOn: "2026-09-30", kind: "periodic", overdueDays: 0 }, "final", "none"]);
  const snap = (v: number, code = "gmfm66") => ({ ...M.find((m) => m.code === code)!, value: v });
  same("ق.٦ المقارنةُ باتجاه كلّ مقياس: الحركةُ ارتفعت والتشنّجُ نزل والألمُ نزل ⟵ تحسّن ٣",
    compareAssessments({ pain: 6, scores: [snap(40), snap(3, "mas")], goals: [] }, { pain: 3, scores: [snap(55), snap(2, "mas")], goals: [] }),
    { improved: 3, worsened: 0, same: 0, compared: 3, verdict: "improved" });
  same("ق.٧ وما ساء أكثرُ ⟵ ساء، ولا مشترَك ⟵ لا مقارنة", [compareAssessments({ pain: 2, scores: [snap(50)], goals: [] }, { pain: 5, scores: [snap(45)], goals: [] }).verdict,
    compareAssessments({ pain: null, scores: [snap(50)], goals: [] }, { pain: 3, scores: [], goals: [] }).verdict], ["worse", "insufficient"]);
  same("ق.٨ أهدافُ الخطّة سطوراً بلا نقاطٍ ولا ترقيم", planGoalsList("• يمشي عشرة أمتار\n2. يصعد درجة\n\n- يجلس وحده"), ["يمشي عشرة أمتار", "يصعد درجة", "يجلس وحده"]);
  same("ق.٩ التطبيعُ ٠–١٠٠ والأفضلُ ١٠٠", [normalized(4, M[1]), normalized(0, M[1]), normalized(75, M[0])], [0, 100, 75]);
  same("ق.١٠ زرعُ المقاييس يغطّي الأربعةَ والأربعين", Object.keys(PROTOCOL_MEASURE_SEED).length, 44);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع تقييم ١'), ($2, 'فرع تقييم ٢')`, [B1, B2]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'as-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'as-sup', 'x', 'سليم', 'branch_manager', $7, $8::jsonb, true, true),
                  ($3, 'as-spec', 'x', 'مصطفى', 'physio_specialist', $7, $8::jsonb, true, false),
                  ($4, 'as-tech', 'x', 'تقنيّ', 'physio_technician', $7, $8::jsonb, true, false),
                  ($5, 'as-rec', 'x', 'استقبال', 'reception', $7, $8::jsonb, true, false),
                  ($6, 'as-spec2', 'x', 'أخصائيّ ثانٍ', 'physio_specialist', $7, $8::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, REC, SPEC2, B1, JSON.stringify([B1])]);
  const who = (userId: number, role: string, isAdmin = false) => hdr({ userId, displayName: String(userId), role, branchId: B1, isAdmin, permissions: {} });
  const S = { admin: who(ADMIN, "admin", true), sup: who(SUP, "branch_manager"), spec: who(SPEC, "physio_specialist"), tech: who(TECH, "physio_technician"),
    rec: who(REC, "reception"), spec2: who(SPEC2, "physio_specialist") };

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

  const dev = Object.fromEntries((await q(`SELECT id, code FROM devices`)).rows.map((r) => [r.code, Number(r.id)]));
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const P = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, goals, sessions_per_week, duration_weeks, session_minutes)
    VALUES ('TEST-ASM-1', 'شلل دماغي — اختبار التقييم', 'CP — assessment test', 'neurological', 'pediatric', '• يمشي عشرة أمتار\n• يصعد درجة', 3, 12, 45) RETURNING id`)).rows[0].id;
  await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, minutes) VALUES ($1, $2, 'recommended', 30)`, [P, dev.robotik]);
  const mkPatient = async (label: string) => (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
    VALUES ($1, '07700000000', $2, '6', 'x', $3, true) RETURNING id`, [`${label} ${MARK}`, MARK, B1])).rows[0].id;
  const pt = await mkPatient("طفل التقييم");
  await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [pt]);

  try {
    console.log("\n── أ. مقاييسُ البروتوكول — اعتمادٌ مستقلّ (القرار ١) ──");
    const put = (s: string, measures: any) => call("PUT", `/api/physio/protocols/${P}/measures`, s, { measures });
    same("أ.١ الاستقبالُ والتقنيُّ لا يعدّلانها ⟵ ٤٠٣", [(await put(S.rec, M)).status, (await put(S.tech, M)).status], [403, 403]);
    const r1 = await put(S.spec, M);
    same("أ.٢ الأخصائيُّ يكتبها ⟵ مسوّدة", [r1.status, r1.json?.measuresStatus], [200, "draft"]);
    same("أ.٣ والأخصائيُّ لا يعتمدها ⟵ ٤٠٣", (await call("POST", `/api/physio/protocols/${P}/measures/approve`, S.spec)).status, 403);
    same("أ.٤ سليمٌ يعتمدها ⟵ معتمَدة، **والبروتوكولُ نفسُه باقٍ مسوّدة**", [(await call("POST", `/api/physio/protocols/${P}/measures/approve`, S.sup)).json?.measuresStatus,
      (await q(`SELECT status FROM physio_protocols WHERE id = $1`, [P])).rows[0].status], ["approved", "draft"]);
    const r2 = await put(S.spec, [M[0], M[1], { ...M[0], code: "berg", nameAr: "بيرغ", nameEn: "Berg", max: 56 }]);
    same("أ.٥ وتعديلُ الأخصائيّ يعيدها مسوّدة", [r2.json?.measuresStatus, r2.json?.demoted], ["draft", true]);
    await call("POST", `/api/physio/protocols/${P}/measures/approve`, S.sup);
    const r3 = await put(S.sup, M);
    same("أ.٦ وتعديلُ المعتمِد يُبقيها معتمَدة", [r3.json?.measuresStatus, r3.json?.demoted], ["approved", false]);
    const gp = (await call("GET", `/api/physio/protocols/${P}`, S.tech)).json;
    same("أ.٧ والصفحةُ تعرضها للتقنيّ ولا تعطيه تعديلاً", [gp.measures?.map((m: any) => m.code), gp.measuresStatus, gp.canEditMeasures], [["gmfm66", "mas"], "approved", false]);
    const seeded = (await q(`SELECT count(DISTINCT protocol_id)::int AS n, bool_and(p.measures_status = 'draft') AS d FROM physio_protocol_measures m
      JOIN physio_protocols p ON p.id = m.protocol_id WHERE p.code NOT LIKE 'TEST-%'`)).rows[0];
    same("أ.٨ والزرعُ: الأربعةُ والأربعون لها مقاييس، كلُّها مسوّدات", [seeded.n, seeded.d], [44, true]);

    console.log("\n── ب. التقييم (القراران ٣ و٤) ──");
    const plan = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    const A = (s: string, body: any) => call("POST", `/api/physio/plans/${plan}/assessments`, s, body);
    same("ب.١ تقييمٌ أوّليٌّ على مسوّدةٍ ممكن، والتخرّجُ عليها لا ⟵ ٤٠٠", (await A(S.spec, { decision: "discharge", pain: 5 })).status, 400);
    await call("POST", `/api/physio/plans/${plan}/approve`, S.sup);
    await call("PUT", `/api/physio/plans/${plan}/assignees`, S.spec, { userIds: [TECH] });
    const v0 = (await call("GET", `/api/physio/plans/${plan}/assessments`, S.tech)).json;
    same("ب.٢ التقنيُّ يرى ولا يقيّم، والأوّليُّ مستحقّ، والأهدافُ من الخطّة", [v0.canAssess, v0.due?.state, v0.goals], [false, "baseline", ["يمشي عشرة أمتار", "يصعد درجة"]]);
    same("ب.٣ والتقنيُّ لا يكتب ⟵ ٤٠٣، والاستقبالُ لا يقرأ ⟵ ٤٠٣", [(await A(S.tech, { decision: "continue", pain: 3 })).status, (await A(S.rec, { decision: "continue", pain: 3 })).status], [403, 403]);
    same("ب.٤ مقياسٌ خارج حدوده ⟵ ٤٠٠، ومستقبليٌّ ⟵ ٤٠٠",
      [(await A(S.spec, { decision: "continue", scores: [{ code: "mas", value: 9 }] })).status, (await A(S.spec, { decision: "continue", pain: 3, assessedOn: addDays(today, 2) })).status], [400, 400]);
    const base = await A(S.spec, { decision: "continue", pain: 6, scores: [{ code: "gmfm66", value: 40 }, { code: "mas", value: 3 }],
      goals: [{ text: "يمشي عشرة أمتار", status: 0 }, { text: "يصعد درجة", status: 0 }], notes: "بداية" });
    same("ب.٥ الأوّليّ ⟵ نوعُه «أوّليّ» وقياساتُه لقطةٌ بتعريفها", [base.status, base.json?.kind, base.json?.scores?.[0]?.nameAr, base.json?.scores?.[0]?.max], [200, "baseline", "حركة", 100]);
    await put(S.sup, [{ ...M[0], nameAr: "الحركة الوظيفية الكبرى" }, M[1]]);
    const v1 = (await call("GET", `/api/physio/plans/${plan}/assessments`, S.spec)).json;
    same("ب.٦ وتغييرُ اسم المقياس بعدها لا يغيّر التقييمَ القديم، والموعدُ التالي بعد ٢٨ يوماً",
      [v1.assessments[0].scores[0].nameAr, v1.measures[0].nameAr, v1.due.state, v1.due.dueOn], ["حركة", "الحركة الوظيفية الكبرى", "upcoming", addDays(today, 28)]);
    const per = await A(S.spec, { decision: "continue", pain: 3, scores: [{ code: "gmfm66", value: 55 }, { code: "mas", value: 2 }],
      goals: [{ text: "يمشي عشرة أمتار", status: 2 }, { text: "يصعد درجة", status: 1 }] });
    same("ب.٧ والثاني «دوريّ»", per.json?.kind, "periodic");
    same("ب.٨ والإيقافُ بلا سبب ⟵ ٤٠٠", (await A(S.spec, { decision: "stop", pain: 3 })).status, 400);
    same("ب.٩ وخطّةٌ لها تقييماتٌ لا تُحذف ⟵ ٤٠٩", (await call("DELETE", `/api/physio/plans/${plan}`, S.admin)).status, 409);
    const fin = await A(S.spec, { decision: "discharge", pain: 1, scores: [{ code: "gmfm66", value: 70 }], goals: [{ text: "يمشي عشرة أمتار", status: 2 }, { text: "يصعد درجة", status: 2 }] });
    same("ب.١٠ «تخرّج» ⟵ ختاميٌّ والخطّةُ «graduated» بمَن ومتى", [fin.json?.kind, fin.json?.planStatus,
      (await q(`SELECT graduated_by_name FROM physio_plans WHERE id = $1`, [plan])).rows[0].graduated_by_name], ["final", "graduated", "مصطفى"]);
    const aud = (await q(`SELECT action FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action IN ('assess','graduate') ORDER BY id`, [plan])).rows.map((r) => r.action);
    same("ب.١١ وسطورُ تدقيقٍ لكلّ تقييمٍ وللتخرّج", aud, ["assess", "assess", "assess", "graduate"]);
    same("ب.١٢ **والمتخرّجةُ منتهية**: لا تقييمَ ولا تعديلَ ولا إسنادَ ولا إيقافَ ولا تنفيذ",
      [(await A(S.spec, { decision: "continue", pain: 1 })).status, (await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: "x", devices: [] })).status,
        (await call("PUT", `/api/physio/plans/${plan}/assignees`, S.spec, { userIds: [] })).status, (await call("POST", `/api/physio/plans/${plan}/stop`, S.spec, { reason: "x" })).status,
        (await call("POST", `/api/physio/plans/${plan}/sessions`, S.tech, { items: [{ deviceId: dev.robotik, done: true }] })).status], [409, 409, 409, 409, 409]);
    same("ب.١٣ والتقنيُّ يرى المتخرّجة", (await call("GET", `/api/physio/plans/${plan}`, S.tech)).status, 200);

    console.log("\n── ج. مستحقّ التقييم (القرار ٢) ──");
    const pt2 = await mkPatient("مريض الموعد");
    const mkApproved = async (patient: number, by: string) => {
      const id = (await call("POST", `/api/patients/${patient}/physio-plans`, by, { protocolId: P })).json.id as number;
      await call("POST", `/api/physio/plans/${id}/approve`, S.sup);
      return id;
    };
    const pNo = await mkApproved(pt2, S.spec);          // بلا تقييم ⟵ أوّليّ
    const pLate = await mkApproved(pt2, S.spec);        // أوّليٌّ قبل ٣٠ يوماً ⟵ دوريٌّ متأخّرٌ يومين
    const pEnd = await mkApproved(pt2, S.spec);         // مدّةٌ أسبوعان بدأت قبل ٢٠ يوماً ⟵ ختاميّ
    const pt3 = await mkPatient("مريض الزميل");
    const pOther = await mkApproved(pt3, S.spec2);      // خطّةُ أخصائيٍّ آخر لمريضٍ آخر
    await q(`UPDATE physio_plans SET decided_at = now() - interval '40 days' WHERE id = $1`, [pLate]);
    await q(`INSERT INTO physio_assessments (plan_id, patient_id, branch_id, kind, assessed_on, pain, decision) VALUES ($1, $2, $3, 'baseline', $4, 5, 'continue')`, [pLate, pt2, B1, addDays(today, -30)]);
    await q(`UPDATE physio_plans SET decided_at = now() - interval '20 days', duration_weeks = 2 WHERE id = $1`, [pEnd]);
    await q(`INSERT INTO physio_assessments (plan_id, patient_id, branch_id, kind, assessed_on, pain, decision) VALUES ($1, $2, $3, 'baseline', $4, 5, 'continue')`, [pEnd, pt2, B1, addDays(today, -19)]);
    const dueOf = async (s: string) => Object.fromEntries(((await call("GET", `/api/physio/assessments/due`, s)).json?.plans ?? [])
      .map((r: any) => [r.planId, `${r.due.state}:${r.due.kind}:${r.due.overdueDays}`]));
    const dSpec = await dueOf(S.spec);
    same("ج.١ للأخصائيّ خططُه: أوّليٌّ مستحقّ، ودوريٌّ متأخّرٌ يومين، وختاميٌّ عند نهاية المدّة", [dSpec[pNo]?.split(":")[0], dSpec[pLate], dSpec[pEnd]?.split(":").slice(0, 2).join(":")],
      ["baseline", "due:periodic:2", "due:final"]);
    same("ج.٢ ولا يرى خطّةَ زميله، ولا المتخرّجة", [pOther in dSpec, plan in dSpec], [false, false]);
    same("ج.٣ والمشرفُ يرى الكلّ", (pOther in (await dueOf(S.sup))) && (pNo in (await dueOf(S.sup))), true);
    same("ج.٤ والتقنيُّ لا ⟵ ٤٠٣", (await call("GET", `/api/physio/assessments/due`, S.tech)).status, 403);
    //  **تنبيهٌ لا قيد**: خطّةٌ مستحقّةُ الأوّليّ تُنفَّذ جلستُها.
    same("ج.٥ **والجلساتُ لا تتوقّف**: خطّةٌ بلا تقييمٍ أوّليّ تُنفَّذ", (await call("POST", `/api/physio/plans/${pNo}/sessions`, S.spec,
      { items: [{ deviceId: dev.robotik, done: true, minutes: 30 }] })).status, 200);

    console.log("\n── د. التنبيهُ الصباحيّ ──");
    await q(`INSERT INTO staff_telegram_links (user_id, chat_id) VALUES ($1, '111'), ($2, '222')`, [SPEC, TECH]);
    await q(`INSERT INTO staff_notification_prefs (user_id, event_type) VALUES ($1, 'physio_assessment_due'), ($2, 'physio_assessment_due')`, [SPEC, TECH]);
    await buildPhysioAssessmentDigests();
    const out = (await q(`SELECT target_user_ids, text FROM staff_notification_outbox WHERE event_type = 'physio_assessment_due' AND text LIKE $1`, [`%${MARK}%`])).rows;
    same("د.١ رسالةٌ واحدة للأخصائيّ بخططه — والتقنيُّ لا يُرسَل له ولو اختاره أحد", out.map((r) => r.target_user_ids), [[SPEC]]);
    check(out[0]?.text.includes("تقييمٌ أوّليّ") && out[0]?.text.includes("تقييمٌ ختاميّ") && out[0]?.text.includes("متأخّرٌ 2 يوماً"), "د.٢ وفيها الأنواعُ والتأخّر", out[0]?.text);
    same("د.٣ **وخططُه هو وحدها** — لا مريضَ زميله", out[0]?.text.includes("مريض الزميل"), false);

    console.log("\n── هـ. حذفُ المريض ──");
    let deleted = true;
    try { await storage.deletePatient(pt); await storage.deletePatient(pt2); await storage.deletePatient(pt3); } catch (e) { deleted = false; console.error(e); }
    check(deleted, "هـ.١ الحذفُ النهائيّ لمريضٍ له تقييماتٌ ينجح");
    same("هـ.٢ ولا تقييمَ باقٍ", Number((await q(`SELECT count(*) FROM physio_assessments WHERE patient_id = ANY($1::int[])`, [[pt, pt2, pt3]])).rows[0].count), 0);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
