// **عددُ الجلسات أساسُ الجرعة، والمراحلُ بنطاقات الجلسات، ونسخةُ المريض من البروتوكول** (ترحيل ١٢٣، §4.dd — قرارُ المالك ٢٠٢٦-١٠-١٠).
// `npm run test:physio-plan-copy` — على النقاط الحقيقية بتطبيق Express الحقيقيّ. يحرس:
//   ق — القواعدُ الخالصة: اشتقاقُ الأسابيع من العدد، وموعدُ الختاميّ بعدد الجلسات، والالتزامُ لا يتجاوز العدد، ونطاقُ المرحلة، والصلاحيات.
//   أ — الترحيل: ألمُ الظهر المزمن ٢٤ × ٦ بمراحل ١–٦ · ٧–١٦ · ١٧–٢٤، والتكرارُ بلا أثر، وما عدّله إنسانٌ لا يُمَسّ، والخططُ المفتوحة تأخذ نسختَها.
//   ب — نسخةُ المريض: الخطّةُ تأخذ المراحلَ والتمارين والعدد والأساسيَّ وحده، والمساعدُ يُعرض؛ والأخصائيُّ يعدّل كلَّ شيءٍ لمريضه والبروتوكولُ لا يُمَسّ.
//   ج — حالةُ الخطّة بعد تعديل المراحل بقاعدة كلّ تعديل (§4.cz).
//   د — تغييرُ نوع الخطّة يستبدل المراحل، و«اقترح خطّة» ينسخها.
//   هـ — موعدُ الختاميّ عند الجلسة الأخيرة من الباب الحقيقيّ.
//   و — الحذف: الخطّةُ ومراحلُها، والمريضُ بكاسكيده (§8).

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-plan-copy-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { setSuggestCompleterForTests } from "./physio_plans/suggest";
import { sql as MIGRATION_SQL } from "./migrations/123_physio_sessions_and_plan_phases";
import { canConsultProtocols, canEditProtocols, normalizeDose } from "@shared/physio_protocols";
import { canWritePlans } from "@shared/physio_plans";
import { adherence, assessmentDue, canEditMeasures } from "@shared/physio_assessments";
import { parsePhasesBody, sessionRangeLabel } from "@shared/physio_exercises";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7005;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8968;
const ADMIN = 8961, SUP = 8962, SPEC = 8963, TECH = 8964;
const IDS = [ADMIN, SUP, SPEC, TECH];
const MARK = "اختبار-نسخة-المريض";
const LBP = "lbp-chronic-adult";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
/** قيمُ سطر التدقيق تُكتب نصّاً مُسلسَلاً (`logAudit`). */
const js = (v: any) => (typeof v === "string" ? JSON.parse(v) : v);

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_assessments WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plan_suggestions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM visits WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`UPDATE physio_protocols SET updated_by = NULL WHERE updated_by = ANY($1::int[])`, [IDS]);
  await q(`UPDATE physio_protocols SET approved_by = NULL WHERE approved_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

/** جسمُ «حفظ المراحل» من مراحل كما يقرؤها المحرّر. */
const phasesBody = (phases: any[]) => phases.map((ph) => ({
  nameAr: ph.nameAr, nameEn: ph.nameEn, sessionFrom: ph.sessionFrom, sessionTo: ph.sessionTo,
  timeframe: ph.timeframe, timeframeEn: ph.timeframeEn, goals: ph.goals, goalsEn: ph.goalsEn, education: ph.education, educationEn: ph.educationEn,
  progressCriteria: ph.progressCriteria, progressCriteriaEn: ph.progressCriteriaEn, notes: ph.notes, notesEn: ph.notesEn,
  exercises: ph.exercises.map((x: any) => ({ exerciseId: x.exerciseId, sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds, restSeconds: x.restSeconds,
    doseNote: x.doseNote, doseNoteEn: x.doseNoteEn, note: x.note, noteEn: x.noteEn })),
}));

async function main() {
  // ══ ق. القواعد ══
  console.log("\n── ق. القواعد ──");
  same("ق.١ **العددُ أساسُ الجرعة**: ٢٤ ÷ ٦ = ٤ أسابيع، و٢٤ ÷ ٥ ⟵ ٥؛ وبلا عددٍ يُحسب من الأسبوع × الأسابيع (القديمُ بمعناه)؛ وبلا تواترٍ يبقى ما كُتب",
    [normalizeDose({ totalSessions: 24, sessionsPerWeek: 6, durationWeeks: 12 }), normalizeDose({ totalSessions: 24, sessionsPerWeek: 5, durationWeeks: null }),
      normalizeDose({ totalSessions: null, sessionsPerWeek: 2, durationWeeks: 12 }), normalizeDose({ totalSessions: null, sessionsPerWeek: null, durationWeeks: 8 })],
    [{ totalSessions: 24, sessionsPerWeek: 6, durationWeeks: 4 }, { totalSessions: 24, sessionsPerWeek: 5, durationWeeks: 5 },
      { totalSessions: 24, sessionsPerWeek: 2, durationWeeks: 12 }, { totalSessions: null, sessionsPerWeek: null, durationWeeks: 8 }]);
  const base = { status: "approved", approvedOn: "2026-01-01", durationWeeks: 4, count: 1, totalSessions: 24, sessionsPerWeek: 6 };
  const due = (p: Record<string, unknown>) => { const d = assessmentDue({ ...base, lastOn: "2026-01-01", today: "2026-01-20", ...p } as any); return [d.state, d.kind, d.dueOn]; };
  same("ق.٢ **الختاميُّ عند الجلسة الأخيرة** (يومَ نُفّذت) — مستحقٌّ ولو لم ينتهِ التقويم",
    due({ executed: 24, lastSessionOn: "2026-01-27", today: "2026-01-28" }), ["due", "final", "2026-01-27"]);
  same("ق.٣ **وفي الأسبوع الأخير لا دوريّ** — ختاميٌّ قادم (نهايةُ المدّة وأسبوعُ سماح)",
    due({ executed: 20, lastSessionOn: "2026-01-23", today: "2026-01-24" }), ["upcoming", "final", "2026-02-05"]);
  same("ق.٤ **وفي منتصفها دوريٌّ بعد ٢٨ يوماً** كما كان",
    due({ executed: 10, lastSessionOn: "2026-01-12" }), ["upcoming", "periodic", "2026-01-29"]);
  same("ق.٥ **ومَن انقطع ولم يُكمل** يُطلب ختاميُّه بعد نهاية المدّة وأسبوع السماح",
    due({ executed: 10, lastSessionOn: "2026-01-12", lastOn: "2026-01-29", today: "2026-02-10" }), ["due", "final", "2026-02-05"]);
  same("ق.٦ **وقُيِّم بعد الجلسة الأخيرة** ⟵ لا ختاميَّ ثانياً (دوريٌّ بعد ٢٨ يوماً حتى يتخرّج)",
    due({ executed: 24, lastSessionOn: "2026-01-27", lastOn: "2026-01-27", today: "2026-01-28" }), ["upcoming", "periodic", "2026-02-24"]);
  same("ق.٧ **والخططُ بلا عدد** على قاعدتها القديمة بحرفها (نهايةُ المدّة = الاعتماد + الأسابيع)",
    due({ totalSessions: null, executed: 10 }), ["upcoming", "final", "2026-01-29"]);
  same("ق.٨ **والالتزامُ لا يتجاوز العدد**: ٢٤ من ٢٤ بخمسٍ في الأسبوع ⟵ ١٠٠٪ (وبلا عددٍ ٢٤ من ٢٥ ⟵ ٩٦٪)",
    [adherence({ approvedOn: "2026-01-01", endOn: null, today: "2026-02-15", sessionsPerWeek: 5, durationWeeks: 5, executed: 24, totalSessions: 24 }),
      adherence({ approvedOn: "2026-01-01", endOn: null, today: "2026-02-15", sessionsPerWeek: 5, durationWeeks: 5, executed: 24 })], [100, 96]);
  const ph = (from: unknown, to: unknown) => parsePhasesBody([{ nameAr: "أ", nameEn: "A", sessionFrom: from, sessionTo: to, exercises: [] }]);
  same("ق.٩ **نطاقُ المرحلة**: يُحفظ، والبدايةُ بعد النهاية تُردّ، وخارجَ ١–٣٠٠ يُردّ — والتسميةُ «الجلسات ١–٦»",
    [(ph(1, 6) as any)[0]?.sessionFrom, (ph(1, 6) as any)[0]?.sessionTo, typeof ph(7, 3), typeof ph(0, 3),
      sessionRangeLabel({ sessionFrom: 1, sessionTo: 6 }, "ar"), sessionRangeLabel({ sessionFrom: 17, sessionTo: 24 }, "en")],
    [1, 6, "string", "string", "الجلسات ١–٦", "Sessions 17–24"]);
  const sx = (role: string, extra: Record<string, unknown> = {}) => ({ role, isAdmin: false, permissions: {}, ...extra }) as any;
  same("ق.١٠ **الصلاحيات** (قرارُ المالك): البروتوكولُ الأساسيّ ومقاييسُه للمشرف والمسؤول؛ والأخصائيُّ يكتب الخططَ ويستشير المكتبة",
    [canEditProtocols(sx("physio_specialist")), canEditMeasures(sx("physio_specialist")), canWritePlans(sx("physio_specialist")),
      canConsultProtocols(sx("physio_specialist")), canEditProtocols(sx("branch_manager", { permissions: { canSupervisePhysio: true } })),
      canEditProtocols({ isAdmin: true } as any), canWritePlans(sx("physio_technician"))],
    [false, false, true, true, true, true, false]);

  // ══ أ. الترحيل ══
  console.log("\n── أ. ترحيل ١٢٣ ──");
  const lbp = async () => (await q(`SELECT p.id, p.status, p.total_sessions, p.sessions_per_week, p.duration_weeks, p.session_minutes, p.exercises, p.exercises_en,
      p.assessment, (SELECT json_agg(json_build_array(ph.position, ph.session_from, ph.session_to) ORDER BY ph.position) FROM physio_protocol_phases ph WHERE ph.protocol_id = p.id) AS ranges,
      (SELECT count(*)::int FROM physio_protocol_phase_exercises pe JOIN physio_protocol_phases ph ON ph.id = pe.phase_id WHERE ph.protocol_id = p.id) AS links
      FROM physio_protocols p WHERE p.code = $1`, [LBP])).rows[0];
  const l0 = await lbp();
  same("أ.١ **ألمُ الظهر المزمن ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة**، والمراحلُ ١–٦ · ٧–١٦ · ١٧–٢٤، والتمارينُ كما هي",
    [l0.total_sessions, l0.sessions_per_week, l0.duration_weeks, l0.session_minutes, l0.ranges, l0.links],
    [24, 6, 4, 50, [[1, 1, 6], [2, 7, 16], [3, 17, 24]], 24]);
  check(/\(الجلسات ١–٦\)/.test(l0.exercises) && /\(الجلسات ١٧–٢٤\)/.test(l0.exercises) && /حتى نهاية الأسبوع الثاني عشر/.test(l0.exercises)
    && /يوماً بعد يوم/.test(l0.exercises) && /\(sessions 7–16\)/.test(l0.exercises_en) && /الجلسة الأخيرة/.test(l0.assessment) && !/الأسبوع ١–٢/.test(l0.exercises),
    "أ.٢ **ونصُّه يقول الجلساتِ لا الأسابيع**: البرنامجُ المنزليّ حتى الأسبوع ١٢، وتمارينُ الثقل يوماً بعد يوم، والتقييمُ عند الجلسة الأخيرة — باللغتين", l0.exercises);
  const doseOf = async (code: string) => (await q(`SELECT pe.dose_note, pe.dose_note_en FROM physio_protocol_phase_exercises pe JOIN physio_protocol_phases ph ON ph.id = pe.phase_id
      JOIN physio_protocols p ON p.id = ph.protocol_id JOIN physio_exercises e ON e.id = pe.exercise_id WHERE p.code = $1 AND ph.position = 3 AND e.code = $2`, [LBP, code])).rows[0];
  check(/يوماً بعد يوم/.test((await doseOf("kettlebell-deadlift"))?.dose_note ?? "") && /Alternate days/.test((await doseOf("split-squat"))?.dose_note_en ?? "")
    && /كلّ جلستين أو ثلاث/.test((await doseOf("front-plank"))?.dose_note ?? ""),
    "أ.٣ **وتمارينُ الثقل في المرحلة ٣ يوماً بعد يوم**، والتدرّجُ «كلّ جلستين أو ثلاث» لا «كلّ أسبوع»");
  await q(MIGRATION_SQL);
  const l1 = await lbp();
  same("أ.٤ **والتكرارُ بلا أثر** — النصُّ لا يتضاعف والأرقامُ كما هي",
    [l1.total_sessions, l1.duration_weeks, l1.exercises === l0.exercises, (l1.exercises.match(/الأسبوع الثاني عشر/g) ?? []).length], [24, 4, true, 1]);
  //  وما عدّله إنسانٌ (`updated_by`) لا يُمَسّ — قاعدةُ `physio_content.ts`.
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع نسخة المريض')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'pc-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'pc-sup', 'x', 'سليم', 'branch_manager', $5, $6::jsonb, true, true),
                  ($3, 'pc-spec', 'x', 'مصطفى', 'physio_specialist', $5, $6::jsonb, true, false),
                  ($4, 'pc-tech', 'x', 'علي', 'physio_technician', $5, $6::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, B1, JSON.stringify([B1])]);
  await q(`UPDATE physio_protocols SET updated_by = $2, total_sessions = 30, sessions_per_week = 3, duration_weeks = 10 WHERE code = $1`, [LBP, SUP]);
  await q(`UPDATE physio_protocol_phases SET session_from = 1, session_to = 10 WHERE position = 1 AND protocol_id = $1`, [l0.id]);
  await q(MIGRATION_SQL);
  const l2 = await lbp();
  same("أ.٥ **وبروتوكولٌ عدّله سليم لا يكتب فيه الترحيلُ شيئاً**", [l2.total_sessions, l2.sessions_per_week, l2.ranges[0]], [30, 3, [1, 1, 10]]);
  await q(`UPDATE physio_protocols SET updated_by = NULL, total_sessions = 24, sessions_per_week = 6, duration_weeks = 4 WHERE code = $1`, [LBP]);
  await q(`UPDATE physio_protocol_phases SET session_from = 1, session_to = 6 WHERE position = 1 AND protocol_id = $1`, [l0.id]);
  const nulls = (await q(`SELECT count(*)::int AS n FROM physio_protocols WHERE total_sessions IS NULL AND sessions_per_week IS NOT NULL AND duration_weeks IS NOT NULL`)).rows[0].n;
  same("أ.٦ **والبروتوكولاتُ الباقية أخذت عددَها من الأسبوع × الأسابيع** — بلا تغيير معنى", nulls, 0);
  //  الخططُ المفتوحة تأخذ نسختَها، والمنتهيةُ تبقى تاريخاً.
  const mkPatient = async (label: string) => Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
      VALUES ($1, '07709991001', $2, '45', 'physiotherapy', $3, true) RETURNING id`, [`${label} ${MARK}`, MARK, B1])).rows[0].id);
  const pt0 = await mkPatient("قديم");
  const oldOpen = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, status, sessions_per_week, duration_weeks)
      VALUES ($1, $2, $3, 'خطّةٌ قديمة', 'approved', 2, 12) RETURNING id`, [pt0, B1, l0.id])).rows[0].id);
  const oldStopped = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, status)
      VALUES ($1, $2, $3, 'خطّةٌ موقوفة', 'stopped') RETURNING id`, [pt0, B1, l0.id])).rows[0].id);
  await q(MIGRATION_SQL);
  const planPhaseCount = async (id: number) => (await q(`SELECT count(DISTINCT ph.id)::int AS phases, count(pe.id)::int AS links FROM physio_plan_phases ph
      LEFT JOIN physio_plan_phase_exercises pe ON pe.phase_id = ph.id WHERE ph.plan_id = $1`, [id])).rows[0];
  same("أ.٧ **الخطّةُ المفتوحة القديمة تأخذ نسختَها من مراحل بروتوكولها، والموقوفةُ تبقى تاريخاً**، والعددُ من الأسبوع × الأسابيع",
    [await planPhaseCount(oldOpen), await planPhaseCount(oldStopped), (await q(`SELECT total_sessions FROM physio_plans WHERE id = $1`, [oldOpen])).rows[0].total_sessions],
    [{ phases: 3, links: 24 }, { phases: 0, links: 0 }, 24]);
  await q(MIGRATION_SQL);
  same("أ.٨ **ولا تتضاعف بالتكرار**", await planPhaseCount(oldOpen), { phases: 3, links: 24 });

  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "علي", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
  };
  const app = express();
  app.use(express.json({ limit: "5mb" }));
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
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const exId = async (code: string) => Number((await q(`SELECT id FROM physio_exercises WHERE code = $1`, [code])).rows[0].id);
  const protoLinks = async () => (await q(`SELECT e.code, pe.reps, ph.position FROM physio_protocol_phase_exercises pe JOIN physio_protocol_phases ph ON ph.id = pe.phase_id
      JOIN physio_exercises e ON e.id = pe.exercise_id WHERE ph.protocol_id = $1 ORDER BY ph.position, pe.position`, [l0.id])).rows;
  const protoBefore = JSON.stringify(await protoLinks());
  const pt = await mkPatient("سعد");
  const pt2 = await mkPatient("سارة");

  try {
    // ══ ب. نسخةُ المريض ══
    console.log("\n── ب. نسخةُ المريض ──");
    const created = await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: l0.id });
    const plan = Number(created.json?.id);
    const g = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    same("ب.١ **الخطّةُ تأخذ المراحلَ بتمارينها ونطاقاتها، والعددَ والتواتر، والأساسيَّ وحده**",
      [created.status, g?.totalSessions, g?.sessionsPerWeek, g?.durationWeeks, (g?.phases ?? []).map((p: any) => [p.position, p.sessionFrom, p.sessionTo, p.exercises.length]),
        (g?.devices ?? []).map((d: any) => [d.code, d.centreUse])],
      [200, 24, 6, 4, [[1, 1, 6, 8], [2, 7, 16, 8], [3, 17, 24, 8]], [["exercise", "core"]]]);
    const tecar = (g?.protocolAdjuncts ?? []).find((d: any) => d.code === "tecar");
    check((g?.protocolAdjuncts ?? []).length === 7 && /^النمط: CAP → RES/.test(tecar?.parameters ?? "") && tecar?.centreUse === "adjunct",
      "ب.٢ **والمساعدُ يُعرض بإعداداته الأولى** ليؤشّر منه الأخصائيُّ لمريضه — سبعة", JSON.stringify((g?.protocolAdjuncts ?? []).map((d: any) => d.code)));
    check(Boolean(g?.phases?.[0]?.exercises?.[0]?.exercise?.nameAr) && Array.isArray(g?.phases?.[0]?.exercises?.[0]?.exercise?.images),
      "ب.٣ **وتمارينُ المرحلة بالبطاقة كاملةً بصورها** — كما في صفحة البروتوكول");

    //  الأخصائيُّ يعدّل لمريضه: تكراراتُ «الكلب والطائر» ٥، ويُزال «الانحناءُ بالعصا»، ونطاقُ المرحلة ٢ يصير ٧–١٤، ويُضاف «الطعنة» إليها.
    const bird = await exId("bird-dog"); const hinge = await exId("hip-hinge-dowel"); const split = await exId("split-squat");
    const edited = phasesBody(g.phases).map((p: any) => (p.nameAr !== g.phases[1].nameAr ? p : {
      ...p, sessionTo: 14,
      exercises: [...p.exercises.filter((x: any) => x.exerciseId !== hinge).map((x: any) => (x.exerciseId === bird ? { ...x, reps: 5, doseNote: "خمسٌ ببطء" } : x)),
        { exerciseId: split, sets: 2, reps: 6 }],
    }));
    same("ب.٤ **التقنيُّ لا يصل مسوّدةً أصلاً** ⟵ ٤٠٤ (يرى المعتمَدةَ وحدها — ج.٥)", (await call("PUT", `/api/physio/plans/${plan}/phases`, S.tech, { phases: edited })).status, 404);
    const put = await call("PUT", `/api/physio/plans/${plan}/phases`, S.spec, { phases: edited });
    const g2 = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    const p2 = g2?.phases?.[1];
    same("ب.٥ **والأخصائيُّ يعدّل لمريضه**: التكرارات والجرعة، وإزالةُ تمرينٍ وإضافةُ آخر، ونطاقُ المرحلة",
      [put.status, p2?.sessionTo, p2?.exercises?.find((x: any) => x.exerciseId === bird)?.reps, p2?.exercises?.find((x: any) => x.exerciseId === bird)?.doseNote,
        p2?.exercises?.some((x: any) => x.exerciseId === hinge), p2?.exercises?.find((x: any) => x.exerciseId === split)?.sets, p2?.exercises?.length],
      [200, 14, 5, "خمسٌ ببطء", false, 2, 8]);
    same("ب.٦ **والبروتوكولُ الأساسيّ لم يتغيّر حرفاً** — تمارينُه وتكراراتُه ونطاقاتُه",
      [JSON.stringify(await protoLinks()) === protoBefore, (await lbp()).ranges], [true, [[1, 1, 6], [2, 7, 16], [3, 17, 24]]]);
    same("ب.٧ **ولا يعدّل الأخصائيُّ البروتوكولَ نفسَه** ⟵ ٤٠٣", (await call("PUT", `/api/physio/protocols/${l0.id}/phases`, S.spec, { phases: edited })).status, 403);
    const other = await call("POST", `/api/patients/${pt2}/physio-plans`, S.spec, { protocolId: l0.id });
    const go = (await call("GET", `/api/physio/plans/${other.json?.id}`, S.spec)).json;
    same("ب.٨ **ومريضٌ آخر على البروتوكول نفسِه يأخذ الأصلَ** لا تعديلَ الأوّل",
      [go?.phases?.[1]?.sessionTo, go?.phases?.[1]?.exercises?.some((x: any) => x.exerciseId === hinge), go?.phases?.[1]?.exercises?.find((x: any) => x.exerciseId === bird)?.reps ?? null],
      [16, true, null]);
    same("ب.٩ **والمرفوض يُردّ ولا يُكتب**: نطاقٌ مقلوب، وتمرينٌ مجهول",
      [(await call("PUT", `/api/physio/plans/${plan}/phases`, S.spec, { phases: [{ ...edited[0], sessionFrom: 9, sessionTo: 2 }] })).status,
        (await call("PUT", `/api/physio/plans/${plan}/phases`, S.spec, { phases: [{ ...edited[0], exercises: [{ exerciseId: 99999999 }] }] })).status,
        (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json?.phases?.length], [400, 400, 3]);
    const aud = (await q(`SELECT old_values, new_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'update_phases'`, [plan])).rows;
    same("ب.١٠ **وسطرُ تدقيقٍ بالقديم والجديد**", [aud.length, js(aud[0]?.old_values)?.phases?.[1]?.sessionTo, js(aud[0]?.new_values)?.phases?.[1]?.sessionTo], [1, 16, 14]);
    //  الجرعةُ لمريضه: ١٨ جلسة بخمسٍ في الأسبوع ⟵ ٤ أسابيع، والبروتوكولُ باقٍ ٢٤ × ٦.
    const dose = await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: g.titleAr, totalSessions: 18, sessionsPerWeek: 5, durationWeeks: 12, sessionMinutes: 45,
      devices: g.devices.map((d: any) => ({ deviceId: d.deviceId, minutes: d.minutes, parameters: d.parameters, centreUse: d.centreUse })) });
    same("ب.١١ **وعددُ الجلسات وتواترُها ومدّتُها لمريضه** — الأسابيعُ تُشتقّ (١٨ ÷ ٥ ⟵ ٤) ولا يتأثّر البروتوكول",
      [dose.status, dose.json?.totalSessions, dose.json?.sessionsPerWeek, dose.json?.durationWeeks, dose.json?.sessionMinutes,
        [(await lbp()).total_sessions, (await lbp()).sessions_per_week]], [200, 18, 5, 4, 45, [24, 6]]);
    same("ب.١٢ وعددٌ خارج ١–٣٠٠ يُردّ، وعددٌ بتواترٍ يتجاوز ١٠٤ أسابيع يُردّ برسالةٍ لا بخطأ قاعدة",
      [(await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: g.titleAr, totalSessions: 999, devices: [] })).status,
        (await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: g.titleAr, totalSessions: 300, sessionsPerWeek: 1, devices: [] })).status], [400, 400]);
    //  والمساعدُ المؤشَّر يدخل بإعداداته — جهازان.
    const two = (g.protocolAdjuncts as any[]).filter((d) => d.code === "tecar" || d.code === "traction");
    const tick = await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: g.titleAr, totalSessions: 18, sessionsPerWeek: 5, sessionMinutes: 45,
      devices: [...g.devices, ...two].map((d: any) => ({ deviceId: d.deviceId, minutes: d.minutes, parameters: d.parameters, parametersEn: d.parametersEn, centreUse: d.centreUse })) });
    const g3 = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    same("ب.١٣ **والمساعدان المؤشَّران يدخلان بالتناوب** — والدورُ لأوّلهما",
      [tick.status, (g3?.devices ?? []).map((d: any) => [d.code, d.centreUse]), g3?.rotation?.turnDeviceId === two[0].deviceId],
      [200, [["exercise", "core"], ["tecar", "adjunct"], ["traction", "adjunct"]], true]);

    // ══ ج. حالةُ الخطّة بعد تعديل المراحل ══
    console.log("\n── ج. حالةُ الخطّة ──");
    same("تهيئة: سليم يعتمد الخطّة", (await call("POST", `/api/physio/plans/${plan}/approve`, S.sup)).status, 200);
    const onDraft = await call("PUT", `/api/physio/plans/${plan}/phases`, S.spec, { phases: edited });
    same("ج.١ **على بروتوكولٍ غير معتمَد**: تعديلُ الأخصائيّ مراحلَ خطّةٍ معتمَدة يعيدها إلى الاعتماد — كتعديل أجهزتها",
      [onDraft.status, onDraft.json?.status, onDraft.json?.demoted], [200, "pending", true]);
    same("تهيئة: سليم يعتمد البروتوكولَ ثمّ الخطّة", [(await call("POST", `/api/physio/protocols/${l0.id}/approve`, S.sup)).status,
      (await call("POST", `/api/physio/plans/${plan}/approve`, S.sup)).status], [200, 200]);
    const onApproved = await call("PUT", `/api/physio/plans/${plan}/phases`, S.spec, { phases: edited });
    same("ج.٢ **وعلى بروتوكولٍ معتمَد**: تبقى تُنفَّذ وتعود لمراجعة المشرف",
      [onApproved.status, onApproved.json?.status, onApproved.json?.backToReview, (await q(`SELECT review_status FROM physio_plans WHERE id = $1`, [plan])).rows[0].review_status],
      [200, "approved", true, "awaiting"]);
    const bySup = await call("PUT", `/api/physio/plans/${plan}/phases`, S.sup, { phases: edited });
    const note = (await q(`SELECT count(*)::int AS n FROM staff_notification_outbox WHERE text LIKE '%عدّل المشرفُ خطّتك%' AND text LIKE $1`, [`%${MARK}%`])).rows[0].n;
    same("ج.٣ **وبيد المشرف**: تبقى معتمَدةً «راجعها المشرف»، ويُنبَّه كاتبُها",
      [bySup.status, bySup.json?.status, (await q(`SELECT review_status FROM physio_plans WHERE id = $1`, [plan])).rows[0].review_status, note >= 1],
      [200, "approved", "reviewed", true]);
    same("ج.٤ **والبروتوكولُ المعتمَد باقٍ معتمَداً** — تعديلُ المريض لا يمسّه", (await lbp()).status, "approved");
    same("ج.٥ **والتقنيُّ يرى الخطّةَ المعتمَدة بمراحلها ولا يعدّلها** ⟵ ٤٠٣",
      [(await call("GET", `/api/physio/plans/${plan}`, S.tech)).json?.phases?.length, (await call("PUT", `/api/physio/plans/${plan}/phases`, S.tech, { phases: edited })).status],
      [3, 403]);

    // ══ د. تغييرُ النوع و«اقترح خطّة» ══
    console.log("\n── د. تغييرُ النوع واقترح خطّة ──");
    const noPhases = Number((await q(`SELECT p.id FROM physio_protocols p WHERE p.is_archived = false AND p.code <> $1
        AND NOT EXISTS (SELECT 1 FROM physio_protocol_phases ph WHERE ph.protocol_id = p.id) ORDER BY p.id LIMIT 1`, [LBP])).rows[0].id);
    const ch = await call("POST", `/api/physio/plans/${other.json?.id}/change-protocol`, S.sup, { protocolId: noPhases });
    same("د.١ **تغييرُ النوع إلى بروتوكولٍ بلا مراحل يُزيل مراحلَ القديم**", [ch.status, (await planPhaseCount(Number(other.json?.id))).phases], [200, 0]);
    const back = await call("POST", `/api/physio/plans/${other.json?.id}/change-protocol`, S.sup, { protocolId: l0.id });
    const gb = (await call("GET", `/api/physio/plans/${other.json?.id}`, S.spec)).json;
    same("د.٢ **والعودةُ إلى ألم الظهر تنسخ مراحلَه، والأساسيَّ وحده**",
      [back.status, (await planPhaseCount(Number(other.json?.id))), (gb?.devices ?? []).map((d: any) => d.code), gb?.totalSessions], [200, { phases: 3, links: 24 }, ["exercise"], 24]);
    setSuggestCompleterForTests(async (p) => {
      const u = JSON.parse(p.user);
      return JSON.stringify(u.step === "choose" ? { choices: [{ protocolId: l0.id, reasonAr: "ألمٌ مزمن" }] } : {});
    });
    const sg = await call("POST", `/api/patients/${pt2}/physio-plans/suggest`, S.spec, { note: "ألمٌ أسفل الظهر منذ سنة" });
    const acc = await call("POST", `/api/physio/suggestions/${sg.json?.id}/accept`, S.spec);
    const ga = (await call("GET", `/api/physio/plans/${acc.json?.id}`, S.spec)).json;
    same("د.٣ **وقبولُ «اقترح خطّة» ينسخ المراحلَ، والعددُ عددُ البروتوكول**",
      [sg.status, acc.status, await planPhaseCount(Number(acc.json?.id)), ga?.totalSessions, ga?.sessionsPerWeek, ga?.durationWeeks], [200, 200, { phases: 3, links: 24 }, 24, 6, 4]);
    setSuggestCompleterForTests(null);

    // ══ هـ. موعدُ الختاميّ من الباب الحقيقيّ ══
    console.log("\n── هـ. موعدُ الختاميّ ──");
    await q(`UPDATE physio_plans SET decided_at = now() - interval '20 days' WHERE id = $1`, [plan]);
    const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
    const daysAgo = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
    await q(`INSERT INTO physio_assessments (plan_id, patient_id, branch_id, kind, assessed_on, pain, scores, goals, decision, assessed_by, assessed_by_name)
      VALUES ($1, $2, $3, 'baseline', $4, 6, '[]', '[]', 'continue', $5, 'مصطفى')`, [plan, pt, B1, daysAgo(20), SPEC]);
    for (let i = 0; i < 18; i++) {
      await q(`INSERT INTO physio_plan_sessions (plan_id, patient_id, branch_id, session_date, shift, executed_by, executed_by_name)
        VALUES ($1, $2, $3, $4, 'morning', $5, 'علي')`, [plan, pt, B1, daysAgo(18 - i), TECH]);
    }
    const dv = (await call("GET", `/api/physio/plans/${plan}/assessments`, S.spec)).json;
    same("هـ.١ **اكتملت الجلساتُ الثماني عشرة** ⟵ الختاميُّ مستحقٌّ يومَ الأخيرة — قبل نهاية المدّة بالتقويم",
      [dv?.due?.state, dv?.due?.kind, dv?.due?.dueOn, dv?.sessions?.executed, dv?.sessions?.total], ["due", "final", daysAgo(1), 18, 18]);
    const list = (await call("GET", `/api/physio/assessments/due`, S.sup)).json?.plans ?? [];
    same("هـ.٢ **وفي «مستحقّ التقييم» بالقاعدة نفسِها**", list.filter((r: any) => r.planId === plan).map((r: any) => [r.due.kind, r.due.dueOn]), [["final", daysAgo(1)]]);

    // ══ و. الحذف ══
    console.log("\n── و. الحذف ──");
    const del = await call("DELETE", `/api/physio/plans/${acc.json?.id}`, S.sup);
    const delAudit = (await q(`SELECT old_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'delete'`, [acc.json?.id])).rows[0];
    same("و.١ **حذفُ الخطّة يأخذ مراحلَها وتمارينَها**، وصورتُها في التدقيق",
      [del.status, await planPhaseCount(Number(acc.json?.id)), (js(delAudit?.old_values)?.phases ?? []).length], [200, { phases: 0, links: 0 }, 3]);
    let deleted = true;
    try { await storage.deletePatient(pt); } catch (e) { deleted = false; console.error(e); }
    same("و.٢ **وحذفُ المريض نهائياً يمرّ بخططه ومراحلها** (§8)، والبروتوكولُ باقٍ",
      [deleted, (await q(`SELECT count(*)::int AS n FROM physio_plan_phases WHERE plan_id = $1`, [plan])).rows[0].n, (await lbp()).links], [true, 0, 24]);
  } finally {
    setSuggestCompleterForTests(null);
    //  البروتوكولُ يعود مسوّدةً كما في القالب.
    await q(`UPDATE physio_protocols SET status = 'draft', approved_by = NULL, approved_by_name = NULL, approved_at = NULL WHERE code = $1`, [LBP]);
    await cleanup();
    httpServer.close();
    await pool.end();
  }
  console.log(failures === 0 ? "\nكلُّ التأكيدات نجحت." : `\n${failures} تأكيداً سقط.`);
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
