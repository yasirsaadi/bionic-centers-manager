// **تعليمُ كلّ تمرينٍ في الجلسة** — «الطلب الثاني» (ترحيل ١٣٤، §4.dr — ٢٠٢٦-١٠-١٢).
// `npm run test:physio-session-exercises` — حيٌّ على النقاط الحقيقية (منفذ ٧٠١٠، فرع ٨٧٠٠، مستخدمون ٨٧٠١–٨٧٠٤). يحرس:
//   ق — القاعدةُ المشتركة: مرحلةُ الجلسة بنطاقات الجلسات (`phaseForSession`)، وتمارينُ الجلسة تمارينُ المرحلة بأعيانها وما لم يُنفَّذ بسبب
//       (`exerciseItemsError`).
//   أ — من الأبواب على بروتوكول خشونة الركبة الحقيقيّ: الجلسةُ الأولى بتمارين المرحلة الأولى كلِّها «نُفّذ» وجرعتِها لقطةً، وما لم يُنفَّذ
//       بلا سبب يُردّ وبسببه يُكتب في الزيارة و«ما اختلف عن الخطّة»، والناقصُ والزائدُ يُردّان، واختيارُ المعالج مرحلةً أخرى، وصفحةٌ أقدم بلا
//       تمارين لا تُفشل الجلسة، والجلسةُ السابعة في المرحلة الثانية وحدها، وسجلُّ الجلسات بأسماء التمارين، والترحيلُ وإعادتُه، وحذفُ المريض.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-session-exercises-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { sql as MIGRATION_SQL } from "./migrations/134_physio_session_exercises";
import { exerciseDeviceError, exerciseItemsError, phaseForSession, PHASE_MOVED } from "@shared/physio_plans";
import { mergeDose } from "@shared/physio_exercises";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7010;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8700;
const ADMIN = 8701, SUP = 8702, SPEC = 8703, TECH = 8704;
const IDS = [ADMIN, SUP, SPEC, TECH];
const MARK = "اختبار-تمارين-الجلسة";
const KNEE = "knee-oa-geriatric";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM visits WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM session_counts WHERE daily_session_id IN (SELECT id FROM daily_sessions WHERE branch_id = $1)`, [B1]);
  await q(`DELETE FROM daily_sessions WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = $1`, [B1]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ ق. القاعدة ══
  console.log("\n── ق. القاعدة ──");
  const ranged = [{ position: 1, sessionFrom: 1, sessionTo: 6 }, { position: 2, sessionFrom: 7, sessionTo: 16 }, { position: 3, sessionFrom: 17, sessionTo: 24 }];
  same("ق.١ **مرحلةُ الجلسة بنطاقها**، وبعد آخر نطاقٍ الأخيرة، وبلا نطاقاتٍ الأولى، وبلا مراحل لا شيء",
    [phaseForSession(ranged, 1), phaseForSession(ranged, 6), phaseForSession(ranged, 7), phaseForSession(ranged, 24), phaseForSession(ranged, 30),
      phaseForSession([{ position: 2 }, { position: 1 }], 5), phaseForSession([], 1)],
    [1, 1, 2, 3, 3, 1, null]);
  const x = (exerciseId: number, done: boolean, note: string | null = null) => ({ exerciseId, done, note });
  same("ق.٢ **تمارينُ المرحلة بأعيانها**: كاملةٌ مقبولة، والناقصُ والزائدُ والمكرّرُ وما لم يُنفَّذ بلا سبب تُردّ، ومرحلةٌ بلا تمارين بلا شيء",
    [exerciseItemsError({ phaseExerciseIds: [1, 2], items: [x(1, true), x(2, false, "ألم")] }),
      Boolean(exerciseItemsError({ phaseExerciseIds: [1, 2], items: [x(1, true)] })),
      Boolean(exerciseItemsError({ phaseExerciseIds: [1, 2], items: [x(1, true), x(2, true), x(3, true)] })),
      Boolean(exerciseItemsError({ phaseExerciseIds: [1, 2], items: [x(1, true), x(1, true)] })),
      Boolean(exerciseItemsError({ phaseExerciseIds: [1, 2], items: [x(1, true), x(2, false, "  ")] })),
      exerciseItemsError({ phaseExerciseIds: [], items: [] })],
    [null, true, true, true, true, null]);

  same("ق.٣ **بندُ «تمارين» وتمارينُه لا يتناقضان**: البندُ «لم يُنفَّذ» وتمارينُه مُرسَلة يُردّ، و«نُفّذ» وتمارينُه كلُّها «لم يُنفَّذ» يُردّ، وبلا بندٍ أو بلا تمارين لا شيء",
    [exerciseDeviceError({ deviceDone: true, items: [x(1, true), x(2, false, "ألم")] }),
      Boolean(exerciseDeviceError({ deviceDone: false, items: [x(1, true)] })),
      Boolean(exerciseDeviceError({ deviceDone: true, items: [x(1, false, "ألم"), x(2, false, "تعب")] })),
      exerciseDeviceError({ deviceDone: null, items: [x(1, false, "ألم")] }), exerciseDeviceError({ deviceDone: false, items: [] })],
    [null, true, true, null, null]);

  // ══ أ. من الأبواب ══
  console.log("\n── أ. من الأبواب ──");
  await cleanup();
  await q(MIGRATION_SQL);
  await q(MIGRATION_SQL);
  check(true, "أ.٠ **الترحيلُ يُعاد بلا خطأ**");
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع تمارين الجلسة')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'se-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'se-sup', 'x', 'سليم', 'branch_manager', $5, $6::jsonb, true, true),
                  ($3, 'se-spec', 'x', 'مصطفى', 'physio_specialist', $5, $6::jsonb, true, false),
                  ($4, 'se-tech', 'x', 'علي', 'physio_technician', $5, $6::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, B1, JSON.stringify([B1])]);
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "علي", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
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
    const kneeId = Number((await q(`SELECT id FROM physio_protocols WHERE code = $1`, [KNEE])).rows[0].id);
    const newPatient = async (n: string) => {
      const id = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
        VALUES ($1, '07709990870', $2, '64', 'physiotherapy', $3, true) RETURNING id`, [`${n} ${MARK}`, MARK, B1])).rows[0].id);
      await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [id]);
      return id;
    };
    const pt = await newPatient("نادية");
    const plan = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: kneeId })).json.id as number;
    await call("POST", `/api/physio/plans/${plan}/activate`, S.spec);
    const g = (await call("GET", `/api/physio/plans/${plan}`, S.tech)).json;
    const phase = (pos: number) => g.phases.find((p: any) => p.position === pos);
    const ids = (pos: number) => phase(pos).exercises.map((e: any) => e.exerciseId as number);
    same("أ.١ **الخطّةُ مراحلُها الثلاث بنطاقاتها وتمارينها** يقرؤها المنفّذ", [g.status, g.phases.map((p: any) => [p.position, p.sessionFrom, p.sessionTo]), ids(1).length > 3],
      ["approved", [[1, 1, 6], [2, 7, 16], [3, 17, 24]], true]);
    const devItems = g.devices.map((d: any) => ({ deviceId: d.deviceId, done: true, minutes: d.minutes, note: null }));
    const allDone = (pos: number) => ids(pos).map((id: number) => ({ exerciseId: id, done: true, note: null }));
    const exec = (body: any) => call("POST", `/api/physio/plans/${plan}/sessions`, S.tech, { items: devItems, ...body });
    const rowsOf = async (sessionId: number) => (await q(`SELECT exercise_id, done, note, planned_sets, planned_reps, planned_hold_seconds
      FROM physio_plan_session_exercises WHERE session_id = $1 ORDER BY display_order`, [sessionId])).rows;

    const s1 = await exec({ exercises: allDone(1) });
    const r1 = await rowsOf(s1.json?.id);
    const p1 = phase(1).exercises;
    same("أ.٢ **الجلسةُ الأولى بتمارين المرحلة الأولى كلِّها «نُفّذ»**، ومرحلتُها مكتوبة، وجرعةُ كلّ تمرينٍ لقطةً كما عُرضت (المرحلة وإلّا البطاقة)",
      [s1.status, s1.json?.phasePosition, r1.length, r1.every((r: any) => r.done), r1.map((r: any) => [r.exercise_id, r.planned_sets, r.planned_reps, r.planned_hold_seconds])],
      [200, 1, p1.length, true, p1.map((e: any) => { const d = mergeDose(e.exercise, e); return [e.exerciseId, d.sets, d.reps, d.holdSeconds]; })]);

    const skipOne = allDone(1).map((e: any, i: number) => (i === 0 ? { ...e, done: false } : e));
    const noReason = await exec({ exercises: skipOne });
    const withReason = await exec({ exercises: skipOne.map((e: any, i: number) => (i === 0 ? { ...e, note: "ألمٌ في الركبة اليوم" } : e)) });
    const skippedName = p1[0].exercise.nameAr;
    const visitNotes = (await q(`SELECT notes FROM visits WHERE id = $1`, [withReason.json?.visitId])).rows[0]?.notes ?? "";
    const dv = (await call("GET", `/api/physio/deviations`, S.spec)).json.sessions.find((s: any) => s.id === withReason.json?.id);
    same("أ.٣ **ما لم يُنفَّذ بلا سبب يُردّ، وبسببه يُكتب** في الزيارة وفي «ما اختلف عن الخطّة»",
      [noReason.status, withReason.status, visitNotes.includes(`لم يُنفَّذ من التمارين: ${skippedName} (ألمٌ في الركبة اليوم)`),
        dv?.differences?.find((d: any) => d.kind === "exercise")?.nameAr, dv?.differences?.find((d: any) => d.kind === "exercise")?.note],
      [400, 200, true, skippedName, "ألمٌ في الركبة اليوم"]);

    const missing = await exec({ exercises: allDone(1).slice(1) });
    const extra = await exec({ exercises: [...allDone(1), { exerciseId: ids(2).find((id: number) => !ids(1).includes(id)), done: true, note: null }] });
    const otherPhase = await exec({ exercises: allDone(2), phasePosition: 2, phaseManual: true });
    const badPhase = await exec({ exercises: [], phasePosition: 9 });
    same("أ.٤ **الناقصُ والزائدُ يُردّان، والمعالجُ يختار مرحلةً أخرى** (تُكتب)، ومرحلةٌ ليست في الخطّة تُردّ",
      [missing.status, extra.status, otherPhase.status, otherPhase.json?.phasePosition, (await rowsOf(otherPhase.json?.id)).length, badPhase.status],
      [400, 400, 200, 2, ids(2).length, 400]);

    //  بندُ «تمارين» وتمارينُه (ملاحظةُ المراجعة على #622).
    const exDev = g.devices.find((d: any) => d.code === "exercise");
    const itemsWith = (done: boolean) => devItems.map((d: any) => (d.deviceId === exDev?.deviceId ? { ...d, done, minutes: done ? d.minutes : null, note: done ? null : "رفض المريض" } : d));
    const allSkipped = await exec({ exercises: allDone(1).map((e: any) => ({ ...e, done: false, note: "تعب" })) });
    const devOffWithEx = await call("POST", `/api/physio/plans/${plan}/sessions`, S.tech, { items: itemsWith(false), exercises: allDone(1) });
    const devOffNoEx = await call("POST", `/api/physio/plans/${plan}/sessions`, S.tech, { items: itemsWith(false) });
    same("أ.٤ب **البندُ «نُفّذ» وتمارينُه كلُّها «لم يُنفَّذ» يُردّ، والبندُ «لم يُنفَّذ» وتمارينُه مُرسَلة يُردّ، وبلا تمارين يمرّ بلا صفوف تمارين**",
      [Boolean(exDev), allSkipped.status, devOffWithEx.status, devOffNoEx.status, (await rowsOf(devOffNoEx.json?.id)).length],
      [true, 400, 400, 200, 0]);

    const legacy = await exec({});
    same("أ.٥ **صفحةٌ أقدم بلا تمارين لا تُفشل الجلسة** — ولا تمارينَ تُكتب ولا مرحلة",
      [legacy.status, legacy.json?.phasePosition ?? null, (await rowsOf(legacy.json?.id)).length], [200, null, 0]);

    //  الجلسةُ الثامنة: سبعُ جلساتٍ قبلها (خمسٌ نُفّذت هنا، واثنتان تُضافان) ⟵ مرحلتُها الثانيةُ وحدها.
    await q(`INSERT INTO physio_plan_sessions (plan_id, patient_id, branch_id, session_date, shift) VALUES ($1, $2, $3, CURRENT_DATE, 'morning'), ($1, $2, $3, CURRENT_DATE, 'morning')`,
      [plan, pt, B1]);
    const seventhWrong = await exec({ exercises: allDone(1) });
    //  افتراضُ شاشةٍ فُتحت قبل الجلستين (المرحلةُ الأولى) — يُعاد حسابُه تحت القفل فيُردّ، لا يُكتب كأنه اختيار.
    const staleAuto = await exec({ exercises: allDone(1), phasePosition: 1 });
    const seventh = await exec({ exercises: allDone(2), phasePosition: 2 });
    same("أ.٦ **الجلسةُ الثامنة في المرحلة الثانية** بنطاقها — وتمارينُ الأولى تُردّ ما لم يخترها المعالج، **وافتراضُ الشاشة القديم ٤٠٩** برسالته، والافتراضُ الصحيح يمرّ",
      [seventhWrong.status, staleAuto.status, staleAuto.json?.error, seventh.status, seventh.json?.phasePosition], [400, 409, PHASE_MOVED, 200, 2]);

    const hist = (await call("GET", `/api/physio/plans/${plan}/sessions`, S.spec)).json.sessions;
    const h3 = hist.find((s: any) => s.id === withReason.json?.id);
    same("أ.٧ **سجلُّ الجلسات بأسماء التمارين** ونُفّذ أم لا وسببُه",
      [h3?.exercises?.length, h3?.exercises?.[0]?.nameAr, h3?.exercises?.[0]?.done, h3?.exercises?.[0]?.note, h3?.phasePosition],
      [p1.length, skippedName, false, "ألمٌ في الركبة اليوم", 1]);

    //  القاعدةُ الملزمة (§8): حذفُ مريضٍ له جلساتٌ بتمارينها.
    const sessionIds = hist.map((s: any) => s.id);
    let deleted = true;
    try { await storage.deletePatient(pt); } catch (e) { deleted = false; console.error(e); }
    same("أ.٨ **حذفُ المريض النهائيّ يمرّ بجلساتٍ لها تمارينُها**",
      [deleted, Number((await q(`SELECT count(*) FROM physio_plan_session_exercises WHERE session_id = ANY($1::int[])`, [sessionIds])).rows[0].count)], [true, 0]);
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
