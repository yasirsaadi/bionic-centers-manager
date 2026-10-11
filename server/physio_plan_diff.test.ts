// **ما تختلف به خطّةُ المريض عن بروتوكولها، ومقاييسُ الخطّة، والبدءُ بلا اعتماد** (ترحيل ١٣٢، §4.do — ٢٠٢٦-١٠-١١).
// `npm run test:physio-plan-diff` — حيٌّ على النقاط الحقيقية (منفذ ٧٠٠٨، فرع ٨٩٤٠، مستخدمون ٨٩٤١–٨٩٤٥). يحرس:
//   ق — القاعدةُ المشتركة (`planProtocolDiff`): خطّةٌ منسوخةٌ كما هي لا فرقَ فيها، والمساعدُ غيرُ المؤشَّر ليس فرقاً، والأساسيُّ الغائبُ «أُزيل»
//       (وسببُه إن كان غيرَ متوفّر)، والمضافُ (ومنه «لا يُستخدم»)، وخاناتُ الجهاز والجرعة والمراحل والتمارين والمقاييس والنصوص.
//   أ — من الأبواب على بروتوكول خشونة الركبة الحقيقيّ: الخطّةُ الجديدة مطابقة، وإزالةُ الدرّاجة الثابتة واستبدالُ تمرينٍ لهذا المريض وحده،
//       والجرعةُ والأجهزة، والبدءُ بلا اعتماد على بروتوكولٍ غير معتمَد وتنبيهُ المشرف بالفروق، ومقاييسُ الخطّة (حفظاً وتقييماً وعودةً وصلاحية)،
//       وتعديلُ المشرف البروتوكولَ بعد النسخ (والمقاييسُ منه)، وتغييرُ النوع، والترحيلُ وإعادتُه، وحذفُ المريض، وترتيبُ الأجهزة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-plan-diff-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { sql as MIGRATION_SQL } from "./migrations/132_physio_plan_measures";
import {
  diffSummaryLine, planLineFromProtocol, planProtocolDiff, protocolPrecautionsText,
  type DiffPlanSide, type DiffProtocolSide,
} from "@shared/physio_plan_diff";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7008;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8940;
const ADMIN = 8941, SUP = 8942, SPEC = 8943, TECH = 8944, DOC = 8945;
const IDS = [ADMIN, SUP, SPEC, TECH, DOC];
const MARK = "اختبار-فروق-الخطّة";
const KNEE = "knee-oa-geriatric";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_assessments WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`UPDATE physio_protocols SET updated_by = NULL WHERE updated_by = ANY($1::int[])`, [IDS]);
  await q(`UPDATE physio_protocols SET approved_by = NULL WHERE approved_by = ANY($1::int[])`, [IDS]);
  await q(`UPDATE physio_protocols SET measures_approved_by = NULL WHERE measures_approved_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

const keys = (d: { items: { key: string; kind: string }[] }) => d.items.map((i) => `${i.kind}:${i.key}`);

async function main() {
  // ══ ق. القاعدةُ المشتركة ══
  console.log("\n── ق. القاعدة ──");
  const ex = (id: number, nameAr: string, extra: Record<string, unknown> = {}) => ({
    exerciseId: id, sets: 2, reps: 10, holdSeconds: null, restSeconds: null, doseNote: "يومياً", doseNoteEn: "Daily", note: null, noteEn: null,
    exercise: { nameAr, nameEn: nameAr }, ...extra,
  });
  const P: DiffProtocolSide = {
    totalSessions: 24, sessionsPerWeek: 6, durationWeeks: 4, sessionMinutes: 50,
    goals: "تقليل الألم", goalsEn: "Less pain", exercises: "البرنامج", exercisesEn: "Programme",
    contraindications: "الموانع", contraindicationsEn: "Contraindications", precautions: "الاحتياطات", precautionsEn: "Precautions",
    devices: [
      { deviceId: 1, code: "exercise", nameAr: "تمارين", nameEn: "Exercise", centreUse: "core", evidence: "recommended", minutes: 30,
        parameters: "تقوية", parametersEn: "Strength", note: null, noteEn: null, params: {}, everyDays: null, times: null },
      { deviceId: 2, code: "shockwaves", nameAr: "موجات صادمة", nameEn: "Shockwave", centreUse: "core", evidence: "optional", minutes: 10,
        parameters: "حول الركبة", parametersEn: "Around the knee", note: "أسبوعياً", noteEn: "Weekly", params: { mode: "Radial", impulses: "2000" }, everyDays: 7, times: 4 },
      { deviceId: 3, code: "tecar", nameAr: "تيكار", nameEn: "Tecar", centreUse: "adjunct", evidence: "optional", minutes: 15,
        parameters: null, parametersEn: null, note: null, noteEn: null, params: {}, everyDays: null, times: null },
      { deviceId: 4, code: "laser", nameAr: "ليزر", nameEn: "Laser", centreUse: "not_used", evidence: "not_recommended", minutes: null,
        parameters: null, parametersEn: null, note: null, noteEn: null, params: {}, everyDays: null, times: null },
    ],
    phases: [{ position: 1, nameAr: "الأولى", nameEn: "First", sessionFrom: 1, sessionTo: 6, goals: "تخفيف", goalsEn: "Relief",
      exercises: [ex(10, "الدرّاجة الثابتة"), ex(11, "رفع الساق")] }],
    measures: [
      { code: "koos", nameAr: "KOOS", nameEn: "KOOS", unitAr: null, unitEn: null, min: 0, max: 100, higherIsBetter: true },
      { code: "tug", nameAr: "TUG", nameEn: "TUG", unitAr: "ث", unitEn: "s", min: 0, max: 60, higherIsBetter: false },
    ],
  };
  const name = (d: any) => ({ code: d.code, nameAr: d.nameAr, nameEn: d.nameEn });
  //  الخطّةُ كما ينسخها «خطة جديدة»: الأساسيُّ وحده بقاعدة النسخ، والموانعُ والاحتياطاتُ معاً، والمراحلُ كما هي، والمقاييسُ تتبع البروتوكول.
  const copied = (): DiffPlanSide => ({
    totalSessions: 24, sessionsPerWeek: 6, durationWeeks: 4, sessionMinutes: 50,
    goals: P.goals, goalsEn: P.goalsEn, exercises: P.exercises, exercisesEn: P.exercisesEn,
    precautions: protocolPrecautionsText(P, "ar"), precautionsEn: protocolPrecautionsText(P, "en"),
    devices: P.devices.filter((d) => d.centreUse === "core").map((d) => ({ ...planLineFromProtocol(d as any, d.code!), ...name(d) })),
    phases: JSON.parse(JSON.stringify(P.phases)), measures: null,
  });
  same("ق.١ **خطّةٌ منسوخةٌ كما هي لا فرقَ فيها** — والمساعدُ غيرُ المؤشَّر و«لا يُستخدم» الغائبُ ليسا فرقاً، وسطرُ الإعدادات من خاناتها",
    [planProtocolDiff(copied(), P).count, copied().devices[1].parameters?.split("\n").length], [0, 2]);
  const withAdj = copied();
  withAdj.devices.push({ ...planLineFromProtocol(P.devices[2] as any, "tecar"), ...name(P.devices[2]) });
  same("ق.٢ **والمساعدُ المؤشَّرُ بإعداداته ليس فرقاً**", planProtocolDiff(withAdj, P).count, 0);
  const noShock = copied();
  noShock.devices = noShock.devices.filter((d) => d.deviceId !== 2);
  const r3 = planProtocolDiff(noShock, P);
  const r3b = planProtocolDiff(noShock, P, new Set([1, 3, 4]));
  same("ق.٣ **الأساسيُّ الغائب «أُزيل»** بسببه — و«غيرُ متوفّرٍ في فرع الخطّة» حين يكون ذلك",
    [keys(r3), r3.items[0]?.noteAr, r3b.items[0]?.noteAr],
    [["removed:device:2"], "أساسيٌّ في البروتوكول", "أساسيٌّ في البروتوكول — غيرُ متوفّرٍ في فرع الخطّة"]);
  const added = copied();
  added.devices.push({ ...planLineFromProtocol(P.devices[3] as any, "laser"), ...name(P.devices[3]) },
    { deviceId: 9, code: "wax", nameAr: "شمع", nameEn: "Wax", minutes: 10, parameters: null, parametersEn: null, note: null, noteEn: null, centreUse: "core" });
  const r4 = planProtocolDiff(added, P);
  same("ق.٤ **والمضاف**: «لا يُستخدم» في البروتوكول بسببه، وجهازٌ ليس فيه",
    r4.items.map((i) => [i.kind, i.key, i.noteAr]), [["added", "device:4", "البروتوكول: لا يُستخدم"], ["added", "device:9", "ليس في البروتوكول"]]);
  const changed = copied();
  changed.devices[1] = { ...changed.devices[1], minutes: 8, centreUse: "adjunct", times: 3, parameters: "حول الركبة — ٢٫٥ بار" };
  const r5 = planProtocolDiff(changed, P);
  same("ق.٥ **وخاناتُ الجهاز المعدَّل**: الاستعمالُ والدقائقُ والموعدُ والمعاملات — والقيمتان", [keys(r5), r5.items[0]?.fields?.map((f) => [f.field, f.from, f.to])],
    [["changed:device:2"], [["centreUse", "أساسيّ", "مساعد"], ["minutes", "10", "8"], ["schedule", "كلّ أسبوع · 4 مرّات", "كلّ أسبوع · 3 مرّات"],
      ["parameters", changed.devices[1].parameters === null ? null : copied().devices[1].parameters, "حول الركبة — ٢٫٥ بار"]]]);
  const dose = copied();
  dose.totalSessions = 18;
  same("ق.٦ **والجرعة** بندٌ واحد بخاناته", planProtocolDiff(dose, P).items.map((i) => [i.key, i.fields?.map((f) => [f.field, f.from, f.to])]),
    [["dose", [["totalSessions", "24", "18"]]]]);
  const ph = copied();
  ph.phases[0].nameAr = "الأولى — معدَّلة";
  ph.phases[0].exercises = [{ ...ph.phases[0].exercises[1], sets: 3 }, ex(12, "القرفصاء")];
  ph.phases.push({ position: 2, nameAr: "الثانية", nameEn: "Second", exercises: [] });
  same("ق.٧ **والمراحلُ والتمارين**: المرحلةُ المعدَّلة، والدرّاجةُ «أُزيلت»، ورفعُ الساق بمجموعاته، والقرفصاءُ مضاف، ومرحلةٌ زائدة",
    keys(planProtocolDiff(ph, P)), ["changed:phase:1", "removed:exercise:1:10", "changed:exercise:1:11", "added:exercise:1:12", "added:phase:2"]);
  const ms = copied();
  ms.measures = [{ ...P.measures[0], max: 50 }, { code: "six_mwt", nameAr: "المشي ٦ دقائق", nameEn: "6MWT", unitAr: "متر", unitEn: "m", min: 0, max: 1000, higherIsBetter: true }];
  same("ق.٨ **والمقاييس** حين عُدّلت لمريضها وحدها: المدى، والمحذوف، والمضاف",
    [planProtocolDiff(copied(), { ...P, measures: [] }).count, keys(planProtocolDiff(ms, P))],
    [0, ["changed:measure:koos", "removed:measure:tug", "added:measure:six_mwt"]]);
  const tx = copied();
  tx.goals = "المشي بلا ألم";
  tx.exercisesEn = "Another programme";
  const r9 = planProtocolDiff(tx, P);
  same("ق.٩ **والنصوص**: الأهدافُ بنسختيها، والإنكليزيةُ وحدها تُعدّ فرقاً، والموانعُ والاحتياطاتُ مجموعتين ليستا فرقاً",
    [keys(r9), r9.items[1]?.fields?.[0]?.from === r9.items[1]?.fields?.[0]?.to], [["changed:text:goals", "changed:text:exercises"], true]);
  same("ق.١٠ **وسطرُ التنبيه** يعدّ ويسمّي المجالات", [diffSummaryLine(planProtocolDiff(copied(), P)), diffSummaryLine(r9), diffSummaryLine(r4)],
    ["مطابقةٌ للبروتوكول الأصليّ", "تختلف عن البروتوكول في موضعين: النصوص", "تختلف عن البروتوكول في موضعين: الأجهزة"]);

  // ══ أ. من الأبواب ══
  console.log("\n── أ. من الأبواب ──");
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع فروق الخطّة')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'pd-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'pd-sup', 'x', 'سليم', 'branch_manager', $6, $7::jsonb, true, true),
                  ($3, 'pd-spec', 'x', 'مصطفى', 'physio_specialist', $6, $7::jsonb, true, false),
                  ($4, 'pd-tech', 'x', 'علي', 'physio_technician', $6, $7::jsonb, true, false),
                  ($5, 'pd-doc', 'x', 'الطبيب', 'doctor', $6, $7::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, DOC, B1, JSON.stringify([B1])]);
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "علي", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
    doc: hdr({ userId: DOC, displayName: "الطبيب", role: "doctor", branchId: B1, isAdmin: false, permissions: {} }),
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
  try {
    const dev = Object.fromEntries((await q(`SELECT id, code FROM devices`)).rows.map((r) => [r.code, Number(r.id)]));
    const exId = Object.fromEntries((await q(`SELECT id, code FROM physio_exercises`)).rows.map((r) => [r.code, Number(r.id)]));
    const kneeId = Number((await q(`SELECT id FROM physio_protocols WHERE code = $1`, [KNEE])).rows[0].id);
    const newPatient = async (n: string) => {
      const id = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
        VALUES ($1, '07709990941', $2, '66', 'physiotherapy', $3, true) RETURNING id`, [`${n} ${MARK}`, MARK, B1])).rows[0].id);
      await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [id]);
      return id;
    };
    const pt = await newPatient("سعاد");
    const getPlan = async (id: number, s = S.spec) => (await call("GET", `/api/physio/plans/${id}`, s)).json;
    const diffKeys = async (id: number) => keys((await getPlan(id)).protocolDiff.diff);
    //  ما ترسله شاشةُ المراحل — المراحلُ كلُّها، وتمارينُ المرحلة المطلوبة بعد `fn` (كما يفعل التحريرُ المباشر من البطاقة).
    const phasesBody = (plan: any, pos: number, fn: (xs: any[]) => any[]) => plan.phases.map((ph: any) => {
      const exs = ph.exercises.map((x: any) => ({ exerciseId: x.exerciseId, sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds,
        restSeconds: x.restSeconds, doseNote: x.doseNote, doseNoteEn: x.doseNoteEn, note: x.note, noteEn: x.noteEn }));
      const out: any = { ...ph, exercises: ph.position === pos ? fn(exs) : exs };
      delete out.id; delete out.planId;
      return out;
    });
    const planBody = (g: any, patch: Record<string, unknown> = {}) => ({
      titleAr: g.titleAr, titleEn: g.titleEn, goals: g.goals, goalsEn: g.goalsEn, exercises: g.exercises, exercisesEn: g.exercisesEn,
      precautions: g.precautions, precautionsEn: g.precautionsEn, notes: g.notes, notesEn: g.notesEn,
      totalSessions: g.totalSessions, sessionsPerWeek: g.sessionsPerWeek, sessionMinutes: g.sessionMinutes,
      devices: g.devices.map((d: any) => ({ deviceId: d.deviceId, minutes: d.minutes, parameters: d.parameters, parametersEn: d.parametersEn,
        note: d.note, noteEn: d.noteEn, centreUse: d.centreUse, everyDays: d.everyDays, times: d.times })),
      ...patch,
    });

    const plan = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: kneeId })).json.id as number;
    const g0 = await getPlan(plan);
    same("أ.١ **الخطّةُ الجديدة مطابقةٌ لبروتوكولها**، ومقاييسُها مقاييسُه، ومتى نُسخت مكتوب",
      [g0.protocolDiff?.diff?.count, g0.protocolDiff?.changedSinceCopy, g0.measuresOwn, (g0.measures ?? []).map((m: any) => m.code), Boolean(g0.protocolCopiedAt)],
      [0, false, false, ["koos", "chair_stand_30", "tug"], true]);

    const bike = exId["stationary-cycling"];
    const rm = await call("PUT", `/api/physio/plans/${plan}/phases`, S.spec, { phases: phasesBody(g0, 1, (xs) => xs.filter((x) => x.exerciseId !== bike)) });
    const g1 = await getPlan(plan);
    const protoBike = Number((await q(`SELECT count(*) FROM physio_protocol_phase_exercises l JOIN physio_protocol_phases ph ON ph.id = l.phase_id
      WHERE ph.protocol_id = $1 AND ph.position = 1 AND l.exercise_id = $2`, [kneeId, bike])).rows[0].count);
    same("أ.٢ **الأخصائيُّ يزيل الدرّاجةَ الثابتة من المرحلة الأولى لهذا المريض** — «أُزيلت» في فروقه، والبروتوكولُ باقٍ بها",
      [rm.status, g1.phases[0].exercises.some((x: any) => x.exerciseId === bike), keys(g1.protocolDiff.diff), protoBike],
      [200, false, [`removed:exercise:1:${bike}`], 1]);
    const swap = exId["quad-set"];
    await call("PUT", `/api/physio/plans/${plan}/phases`, S.spec,
      { phases: phasesBody(g1, 2, (xs) => xs.map((x) => (x.exerciseId === bike ? { exerciseId: swap, sets: null, reps: null, holdSeconds: null, restSeconds: null,
        doseNote: null, doseNoteEn: null, note: null, noteEn: null } : x))) });
    const g2 = await getPlan(plan);
    same("أ.٣ **ويستبدلها في الثانية بتمرينٍ آخر في موضعها** — «أُزيلت» و«أُضيف»",
      [g2.phases[1].exercises.findIndex((x: any) => x.exerciseId === swap) === g1.phases[1].exercises.findIndex((x: any) => x.exerciseId === bike),
        (await diffKeys(plan)).filter((k) => k.includes("exercise:2:"))],
      [true, [`removed:exercise:2:${bike}`, `added:exercise:2:${swap}`]]);

    const devs = g2.devices.filter((d: any) => d.code !== "shockwaves")
      .map((d: any) => (d.code === "exercise" ? { ...d, minutes: Number(d.minutes ?? 30) + 5 } : d));
    devs.push({ deviceId: dev.laser, minutes: 5, centreUse: "core" }, { deviceId: dev.wax, minutes: 10, centreUse: "core" });
    const ed = await call("PUT", `/api/physio/plans/${plan}`, S.spec, planBody(g2, { totalSessions: 18, devices: devs }));
    const g3 = await getPlan(plan);
    const byKey = Object.fromEntries(g3.protocolDiff.diff.items.map((i: any) => [i.key, i]));
    same("أ.٤ **الجرعةُ والأجهزة**: العددُ ٢٤ ⟵ ١٨، والتمارينُ بدقائقها، والموجاتُ الأساسيّة «أُزيلت»، والليزرُ «لا يُستخدم» مضاف، والشمعُ ليس فيه",
      [ed.status, byKey.dose?.fields?.map((f: any) => [f.field, f.from, f.to]), byKey[`device:${dev.exercise}`]?.fields?.map((f: any) => f.field),
        byKey[`device:${dev.shockwaves}`]?.kind, byKey[`device:${dev.laser}`]?.noteAr, byKey[`device:${dev.wax}`]?.noteAr],
      [200, [["totalSessions", "24", "18"]], ["minutes"], "removed", "البروتوكول: لا يُستخدم", "ليس في البروتوكول"]);

    const pendText = async (id: number) => (await q(`SELECT text FROM staff_notification_outbox WHERE event_type = 'physio_plan_pending' AND link_path = $1 ORDER BY id`,
      [`/physio/plans/${id}`])).rows.map((r) => r.text);
    const protoStatus = (await q(`SELECT status FROM physio_protocols WHERE id = $1`, [kneeId])).rows[0].status;
    const act = await call("POST", `/api/physio/plans/${plan}/activate`, S.spec);
    const t1 = (await pendText(plan))[0] ?? "";
    same("أ.٥ **يبدؤها الأخصائيُّ والبروتوكولُ مسوّدة** (§4.do)، **ويُنبَّه المشرفُ باسم المريض وكاتبها وما تختلف به**",
      [protoStatus, act.status, act.json?.status, act.json?.reviewStatus, t1.includes(MARK), /كتبها مصطفى/.test(t1), /تختلف عن البروتوكول في \d+ مواضع: الجرعة، الأجهزة، التمارين/.test(t1)],
      ["draft", 200, "approved", "awaiting", true, true, true]);
    await call("POST", `/api/physio/plans/${plan}/review`, S.sup);

    //  مقاييسُ هذا المريض: تُحذف TUG ويُضاف المشي ستّ دقائق، والبروتوكولُ لا يتغيّر.
    const mine = [...g3.measures.filter((m: any) => m.code !== "tug"),
      { code: "six_mwt", nameAr: "المشي ٦ دقائق", nameEn: "6-minute walk test", unitAr: "متر", unitEn: "m", min: 0, max: 1000, higherIsBetter: true }];
    const pm = await call("PUT", `/api/physio/plans/${plan}/measures`, S.spec, { measures: mine });
    const g4 = await getPlan(plan);
    const view = (await call("GET", `/api/physio/plans/${plan}/assessments`, S.spec)).json;
    const t2 = (await pendText(plan)).slice(-1)[0] ?? "";
    same("أ.٦ **مقاييسُ الخطّة لمريضها**: تُحفظ لها، والتقييمُ يقرؤها («own»)، والفروقُ تعلّمها، **وتبقى تُنفَّذ ويُنبَّه المشرفُ باسم مَن عدّل**",
      [pm.status, g4.measuresOwn, g4.measures.map((m: any) => m.code), view?.measures?.map((m: any) => m.code), view?.measuresStatus,
        keys(g4.protocolDiff.diff).filter((k) => k.includes("measure")), g4.status, g4.reviewStatus, /عدّلها مصطفى/.test(t2),
        (await q(`SELECT count(*)::int AS n FROM physio_protocol_measures WHERE protocol_id = $1`, [kneeId])).rows[0].n],
      [200, true, ["koos", "chair_stand_30", "six_mwt"], ["koos", "chair_stand_30", "six_mwt"], "own",
        ["removed:measure:tug", "added:measure:six_mwt"], "approved", "awaiting", true, 3]);
    const okA = await call("POST", `/api/physio/plans/${plan}/assessments`, S.spec, { assessedOn: (await q(`SELECT (now() AT TIME ZONE 'Asia/Baghdad')::date::text AS d`)).rows[0].d,
      pain: 5, scores: [{ code: "six_mwt", value: 320 }], decision: "continue" });
    const badA = await call("POST", `/api/physio/plans/${plan}/assessments`, S.spec, { assessedOn: (await q(`SELECT (now() AT TIME ZONE 'Asia/Baghdad')::date::text AS d`)).rows[0].d,
      pain: 5, scores: [{ code: "tug", value: 12 }], decision: "continue" });
    same("أ.٧ **والتقييمُ يُسجَّل بمقاييس الخطّة**: المضافُ يُقبل، والمحذوفُ يُردّ", [okA.status, badA.status, /ليس من مقاييس الخطّة/.test(badA.json?.error ?? "")], [200, 400, true]);
    same("أ.٨ **والتقنيُّ والطبيبُ لا يعدّلان المقاييس**", [(await call("PUT", `/api/physio/plans/${plan}/measures`, S.tech, { measures: mine })).status,
      (await call("PUT", `/api/physio/plans/${plan}/measures`, S.doc, { measures: mine })).status, (await call("DELETE", `/api/physio/plans/${plan}/measures`, S.tech)).status],
      [403, 403, 403]);
    same("أ.٩ **ومقاييسُ غيرُ صالحة تُردّ بقاعدة البروتوكول نفسِها**", (await call("PUT", `/api/physio/plans/${plan}/measures`, S.spec,
      { measures: [{ ...mine[0], min: 10, max: 5 }] })).status, 400);
    const back = await call("DELETE", `/api/physio/plans/${plan}/measures`, S.spec);
    const g5 = await getPlan(plan);
    same("أ.١٠ **والعودةُ إلى مقاييس البروتوكول** — تتبعه ثانيةً، ولا فرقَ مقاييس، وسطرا تدقيق",
      [back.status, g5.measuresOwn, g5.measures.map((m: any) => m.code), keys(g5.protocolDiff.diff).filter((k) => k.includes("measure")).length,
        Number((await q(`SELECT count(*) FROM physio_plan_measures WHERE plan_id = $1`, [plan])).rows[0].count),
        (await q(`SELECT action FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action LIKE '%measures' ORDER BY id`, [plan])).rows.map((r) => r.action)],
      [200, false, ["koos", "chair_stand_30", "tug"], 0, 0, ["update_measures", "reset_measures"]]);

    //  المرجعُ «البروتوكولُ الذي عدّله المشرفُ آخرَ مرّة»: سليم يعدّل دقائقَ الجلسة.
    const full = (await call("GET", `/api/physio/protocols/${kneeId}`, S.sup)).json;
    const pick = (o: any, ks: string[]) => Object.fromEntries(ks.map((k) => [k, o?.[k]]));
    const protoBody = (f: any, patch: Record<string, unknown> = {}) => ({
      ...pick(f, ["code", "titleAr", "titleEn", "category", "ageGroup", "summary", "goals", "assessment", "exercises", "contraindications", "precautions",
        "summaryEn", "goalsEn", "assessmentEn", "exercisesEn", "contraindicationsEn", "precautionsEn", "sessionsPerWeek", "durationWeeks", "sessionMinutes",
        "totalSessions", "references"]),
      devices: (f?.devices ?? []).map((d: any) => pick(d, ["deviceId", "evidence", "parameters", "parametersEn", "minutes", "note", "noteEn", "params", "centreUse", "everyDays", "times"])),
      ...patch,
    });
    const pu = await call("PUT", `/api/physio/protocols/${kneeId}`, S.sup, protoBody(full, { sessionMinutes: 45 }));
    const g6 = await getPlan(plan);
    same("أ.١١ **سليم يعدّل البروتوكول بعد نسخ الخطّة**: يصير المرجعَ — باسمه، والفرقُ الجديد في الجرعة، و«عُدّل بعد النسخ»",
      [pu.status, g6.protocolDiff.changedSinceCopy, g6.protocolDiff.reference.updatedByName,
        g6.protocolDiff.diff.items.find((i: any) => i.key === "dose")?.fields?.map((f: any) => f.field)],
      [200, true, "سليم", ["totalSessions", "sessionMinutes"]]);
    const fresh = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: kneeId })).json.id as number;
    const before = (await getPlan(fresh)).protocolDiff;
    const pms = await call("PUT", `/api/physio/protocols/${kneeId}/measures`, S.sup, { measures: full.measures.slice(0, 2) });
    const after = (await getPlan(fresh)).protocolDiff;
    same("أ.١٢ **وتعديلُ مقاييس البروتوكول تعديلٌ له** — خطّةٌ نُسخت قبله تعرف، وتتبعه ما دامت لم تُعدَّل لمريضها",
      [before.changedSinceCopy, before.diff.count, pms.status, after.changedSinceCopy, (await getPlan(fresh)).measures.map((m: any) => m.code)],
      [false, 0, 200, true, ["koos", "chair_stand_30"]]);

    //  تغييرُ النوع: المقاييسُ تتبع البروتوكولَ الجديد، ويوم النسخ يتجدّد.
    await call("PUT", `/api/physio/plans/${plan}/measures`, S.spec, { measures: mine });
    const copiedBefore = (await q(`SELECT protocol_copied_at FROM physio_plans WHERE id = $1`, [plan])).rows[0].protocol_copied_at;
    const other = Number((await q(`SELECT id FROM physio_protocols WHERE code = 'lbp-chronic-adult'`)).rows[0].id);
    const cp = await call("POST", `/api/physio/plans/${plan}/change-protocol`, S.sup, { protocolId: other });
    const g7 = await getPlan(plan);
    const copiedAfter = (await q(`SELECT protocol_copied_at FROM physio_plans WHERE id = $1`, [plan])).rows[0].protocol_copied_at;
    same("أ.١٣ **وتغييرُ النوع يعيد المقاييسَ إلى البروتوكول الجديد** ويُجدّد يومَ النسخ، والخطّةُ مطابقةٌ له",
      [cp.status, g7.measuresOwn, Number((await q(`SELECT count(*) FROM physio_plan_measures WHERE plan_id = $1`, [plan])).rows[0].count),
        new Date(copiedAfter) > new Date(copiedBefore), g7.protocolDiff.changedSinceCopy, g7.protocolDiff.diff.count],
      [200, false, 0, true, false, 0]);

    //  الترحيلُ وإعادتُه: يومُ النسخ من آخر «تغيير نوع» في التدقيق، وإلّا يومُ الإنشاء.
    await q(`UPDATE physio_plans SET protocol_copied_at = NULL WHERE id = ANY($1::int[])`, [[plan, fresh]]);
    //  تغييرٌ مسجَّلٌ بعد كلّ ما سبق — فهو الأخير، ويومُه يومُ النسخ.
    await q(`INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, created_at) VALUES ('physio_plan', $1, 'change_protocol', $2, 'سليم', '2030-01-01T09:00:00Z')`, [plan, SUP]);
    await q(MIGRATION_SQL);
    await q(MIGRATION_SQL);
    const mig = (await q(`SELECT id, protocol_copied_at = created_at AS from_created, protocol_copied_at FROM physio_plans WHERE id = ANY($1::int[]) ORDER BY id`, [[plan, fresh]])).rows;
    same("أ.١٤ **الترحيلُ يُعاد بلا خطأ**، ويملأ يومَ النسخ من آخر «تغيير نوع» وإلّا من يوم الإنشاء",
      [new Date(mig[0].protocol_copied_at).toISOString(), mig[1].from_created], ["2030-01-01T09:00:00.000Z", true]);

    //  الترتيب: سليم يعكس أجهزةَ البروتوكول، والخطّةُ الجديدة تنسخها بترتيبه؛ والأخصائيُّ يعكس أجهزةَ خطّته فلا يُعدّ فرقاً.
    const full2 = (await call("GET", `/api/physio/protocols/${kneeId}`, S.sup)).json;
    const reversed = protoBody(full2);
    reversed.devices = reversed.devices.slice().reverse();
    await call("PUT", `/api/physio/protocols/${kneeId}`, S.sup, reversed);
    const order = (await call("GET", `/api/physio/protocols/${kneeId}`, S.sup)).json.devices.map((d: any) => d.code);
    const p3 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: kneeId })).json.id as number;
    const g8 = await getPlan(p3);
    const flipped = await call("PUT", `/api/physio/plans/${p3}`, S.spec, planBody(g8, { devices: planBody(g8).devices.slice().reverse() }));
    const g9 = await getPlan(p3);
    same("أ.١٥ **ترتيبُ الأجهزة**: البروتوكولُ بترتيب سليم، والخطّةُ الجديدة به، وترتيبُ الأخصائيّ لمريضه يُحفظ ولا يُعدّ فرقاً",
      [order[0], order[order.length - 1], g8.devices.map((d: any) => d.code), flipped.status, g9.devices.map((d: any) => d.code), g9.protocolDiff.diff.count],
      ["ultrasound", "exercise", ["shockwaves", "exercise"], 200, ["exercise", "shockwaves"], 0]);

    //  القاعدةُ الملزمة (§8): حذفُ مريضٍ له خطّةٌ بمقاييسها.
    const pt2 = await newPatient("كريم");
    const p4 = (await call("POST", `/api/patients/${pt2}/physio-plans`, S.spec, { protocolId: kneeId })).json.id as number;
    await call("PUT", `/api/physio/plans/${p4}/measures`, S.spec, { measures: mine });
    let deleted = true;
    try { await storage.deletePatient(pt2); } catch (e) { deleted = false; console.error(e); }
    same("أ.١٦ **حذفُ المريض النهائيّ يمرّ بخطّةٍ لها مقاييسُها**", [deleted, Number((await q(`SELECT count(*) FROM physio_plan_measures WHERE plan_id = $1`, [p4])).rows[0].count)],
      [true, 0]);
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
