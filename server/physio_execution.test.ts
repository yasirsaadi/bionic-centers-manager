// تنفيذُ خطّة العلاج الطبيعي (ترحيل ١١١، §4.cn — المرحلةُ الرابعة، ٢٠٢٦-١٠-٠٧).
// `npm run test:physio-execution` — على النقاط الحقيقية بتطبيق Express الحقيقيّ.
//
// يحرس قراراتِ المالك: (أ) ينفّذ أيُّ منفّذٍ من القسم في فرع الخطّة لا المسنَدُ وحده، ولا غيرُ القسم ولا فرعٌ آخر؛ (ب) البنودُ بنودُ الخطّة
// بأعيانها، وبندٌ منفّذٌ على الأقلّ، وسببُ ما لم يُنفَّذ؛ (ج) الإبرُ الجافة لحاملها؛ (د) «إنهاء الجلسة» يكتب زيارةَ جلسة العلاج الطبيعي؛
// (هـ) قبل يوم القفل لا يُمَسّ العدّادُ اليدويّ، ومن يومه يُكتب من التنفيذ ويُقفَل اليدويّ، ويومُ القفل من الغد للمسؤول وحده؛
// (و) «ملاحظة للأخصائيّ» تنبيهٌ لكاتب الخطّة، وصفحةُ الاختلافات؛ (ز) الإلغاءُ يُرجع الزيارةَ والعدّاد؛ (ح) لا حذفَ لخطّةٍ لها جلسات؛
// (ط) حذفُ المريض يمرّ بالجلسات (§8).

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-execution-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { countsFromError, executionItemsError, sessionTreatmentType } from "@shared/physio_plans";
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

const PORT = 6988;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9661, B2 = 9662;
const ADMIN = 9671, SUP = 9672, SPEC = 9673, TECH = 9674, TECH_N = 9675, TECH_B2 = 9676, REC = 9677, MGR = 9678;
const IDS = [ADMIN, SUP, SPEC, TECH, TECH_N, TECH_B2, REC, MGR];
const MARK = "اختبار-تنفيذ-الخطط";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM visits WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_branch_access WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM session_counts WHERE daily_session_id IN (SELECT id FROM daily_sessions WHERE branch_id = ANY($1::int[]))`, [[B1, B2]]);
  await q(`DELETE FROM daily_sessions WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  console.log("\n── القواعد (بلا قاعدة) ──");
  const base = { planDeviceIds: [1, 2, 3], needleDeviceId: 3, canDryNeedle: false };
  const it = (deviceId: number, done: boolean, note: string | null = null) => ({ deviceId, done, minutes: null, note });
  same("ق.١ بنودُ الخطّة كاملةً ومنفّذة ⟵ مقبولة", executionItemsError({ ...base, items: [it(1, true), it(2, true), it(3, false, "لا وقت")] }), null);
  check(!!executionItemsError({ ...base, items: [it(1, true), it(2, true)] }), "ق.٢ بندٌ ناقص يُردّ");
  check(!!executionItemsError({ ...base, items: [it(1, true), it(2, true), it(3, false, "x"), it(9, true)] }), "ق.٣ وجهازٌ زائد يُردّ");
  check(!!executionItemsError({ ...base, items: [it(1, false, "x"), it(2, false, "x"), it(3, false, "x")] }), "ق.٤ ولا بندَ منفّذاً يُردّ");
  check(!!executionItemsError({ ...base, items: [it(1, true), it(2, false), it(3, false, "x")] }), "ق.٥ وما لم يُنفَّذ بلا سبب يُردّ");
  check(!!executionItemsError({ ...base, items: [it(1, true), it(2, true), it(3, true)] }), "ق.٦ والإبرُ بلا علَمها تُردّ");
  same("ق.٧ وبعلَمها مقبولة", executionItemsError({ ...base, canDryNeedle: true, items: [it(1, true), it(2, true), it(3, true)] }), null);
  same("ق.٨ نوعُ العلاج من البنود", [sessionTreatmentType(["robotik", "exercise"]), sessionTreatmentType(["laser"]), sessionTreatmentType(["needle"]), sessionTreatmentType(["exercise"])],
    ["روبوت", "أجهزة علاج طبيعي", "أبر صينية", "تمارين تأهيلية"]);
  check(!!countsFromError("2026-10-07", "2026-10-07") && countsFromError("2026-10-08", "2026-10-07") === null && countsFromError(null, "2026-10-07") === null,
    "ق.٩ يومُ القفل من الغد، و«بلا» يرفعه");

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع تنفيذ ١'), ($2, 'فرع تنفيذ ٢')`, [B1, B2]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio, can_dry_needle, can_enter_sessions)
           VALUES ($1, 'ex-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false, false, true),
                  ($2, 'ex-sup', 'x', 'سليم', 'branch_manager', $8, $9::jsonb, true, true, false, true),
                  ($3, 'ex-spec', 'x', 'مصطفى', 'physio_specialist', $8, $9::jsonb, true, false, false, false),
                  ($4, 'ex-tech', 'x', 'علي المسنَد', 'physio_technician', $8, $9::jsonb, true, false, false, false),
                  ($5, 'ex-techn', 'x', 'حسن الإبر', 'therapist', $8, $9::jsonb, true, false, true, false),
                  ($6, 'ex-tech2', 'x', 'تقنيّ الفرع الآخر', 'physio_technician', $10, $11::jsonb, true, false, true, false),
                  ($7, 'ex-rec', 'x', 'استقبال', 'reception', $8, $9::jsonb, true, false, false, true),
                  ($12, 'ex-mgr', 'x', 'مدير الفرع', 'branch_manager', $8, $9::jsonb, true, false, false, true)`,
    [ADMIN, SUP, SPEC, TECH, TECH_N, TECH_B2, REC, B1, JSON.stringify([B1]), B2, JSON.stringify([B2]), MGR]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: {} }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "علي المسنَد", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
    techN: hdr({ userId: TECH_N, displayName: "حسن الإبر", role: "therapist", branchId: B1, isAdmin: false, permissions: {} }),
    tech2: hdr({ userId: TECH_B2, displayName: "تقنيّ الفرع الآخر", role: "physio_technician", branchId: B2, isAdmin: false, permissions: {} }),
    rec: hdr({ userId: REC, displayName: "استقبال", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
    mgr: hdr({ userId: MGR, displayName: "مدير الفرع", role: "branch_manager", branchId: B1, isAdmin: false, permissions: {} }),
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
  const today = baghdadTodayYmd();
  const dev = Object.fromEntries((await q(`SELECT id, code FROM devices`)).rows.map((r) => [r.code, Number(r.id)]));
  const [ROBOT, LASER, NEEDLE] = [dev.robotik, dev.laser, dev.needle];
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const pt = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
                       VALUES ($1, '07701234567', $2, '7', 'physio', $3, true) RETURNING id`, [`طفل ${MARK}`, MARK, B1])).rows[0].id;
  const physioCase = (await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy') RETURNING id`, [pt])).rows[0].id;
  //  خطّةٌ بثلاثة بنود: روبوت ٣٠، ليزر ١٠، إبر ١٥ — يكتبها الأخصائيّ ويُسندها لعلي ويعتمدها سليم.
  const plan = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "خطة اختبار التنفيذ" })).json.id as number;
  await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: "خطة اختبار التنفيذ", devices: [
    { deviceId: ROBOT, minutes: 30 }, { deviceId: LASER, minutes: 10 }, { deviceId: NEEDLE, minutes: 15 }] });
  await call("PUT", `/api/physio/plans/${plan}/assignees`, S.spec, { userIds: [TECH] });
  const items = (o: Partial<Record<number, { done: boolean; minutes?: number; note?: string }>>) => [ROBOT, LASER, NEEDLE].map((d) => ({
    deviceId: d, done: o[d]?.done ?? false, minutes: o[d]?.minutes ?? null, note: o[d]?.note ?? null }));
  const okItems = items({ [ROBOT]: { done: true, minutes: 30 }, [LASER]: { done: true, minutes: 8 }, [NEEDLE]: { done: false, note: "لا مختصّ اليوم" } });
  const exec = (s: string, body: any = { items: okItems }) => call("POST", `/api/physio/plans/${plan}/sessions`, s, body);
  const countsOf = async (date: string) => Object.fromEntries((await q(`SELECT c.device_id, c.count FROM session_counts c JOIN daily_sessions d ON d.id = c.daily_session_id
      WHERE d.branch_id = $1 AND d.session_date = $2`, [B1, date])).rows.map((r) => [Number(r.device_id), Number(r.count)]));

  try {
    console.log("\n── أ. مَن ينفّذ ──");
    same("أ.١ قبل الاعتماد لا تُنفَّذ (المنفّذُ لا يرى المسوّدةَ أصلاً)", (await exec(S.tech)).status, 404);
    same("أ.١ب والأخصائيُّ يرى المسوّدةَ ولا ينفّذها ⟵ ٤٠٩", (await exec(S.spec)).status, 409);
    await call("POST", `/api/physio/plans/${plan}/approve`, S.sup);
    same("أ.٢ الاستقبالُ لا ينفّذ", (await exec(S.rec)).status, 403);
    same("أ.٢ب ومديرُ الفرع يقرأ الخطّةَ (مستشير) ولا ينفّذها", [(await call("GET", `/api/physio/plans/${plan}`, S.mgr)).status, (await exec(S.mgr)).status], [200, 403]);
    same("أ.٣ ومنفّذُ فرعٍ آخر لا ينفّذ (لا يرى الخطّةَ أصلاً)", (await exec(S.tech2)).status, 404);
    //  الملفُّ يُتاح لفرعه (§4.t) فيراه تقنيُّه — والتنفيذُ يبقى في فرع الخطّة وحده.
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1, $2)`, [pt, B2]);
    same("أ.٣ب وإن أُتيح له الملفّ: يرى الخطّةَ ولا ينفّذها ⟵ ٤٠٣", (await exec(S.tech2)).status, 403);
    const canExecRow = async (s: string) => (await call("GET", `/api/patients/${pt}/physio-plans`, s)).json?.plans?.find((p: any) => p.id === plan)?.canExecute;
    same("أ.٣ج وزرُّ «تنفيذ جلسة» في الملفّ: لتقنيّ فرع الخطّة وللمشرف، لا لتقنيّ الفرع الآخر",
      [await canExecRow(S.tech), await canExecRow(S.sup), await canExecRow(S.tech2)], [true, true, false]);

    console.log("\n── ب. البنود ──");
    same("ب.١ بندٌ ناقص ⟵ ٤٠٠", (await exec(S.tech, { items: okItems.slice(0, 2) })).status, 400);
    same("ب.٢ وما لم يُنفَّذ بلا سبب ⟵ ٤٠٠", (await exec(S.tech, { items: items({ [ROBOT]: { done: true } }) })).status, 400);
    same("ج.١ والإبرُ بيد مَن لا يحملها ⟵ ٤٠٠", (await exec(S.tech, { items: items({ [ROBOT]: { done: true }, [LASER]: { done: true }, [NEEDLE]: { done: true } }) })).status, 400);
    same("ب.٣ ولا زيارةَ كُتبت", Number((await q(`SELECT count(*) FROM visits WHERE patient_id = $1`, [pt])).rows[0].count), 0);

    console.log("\n── د. «إنهاء الجلسة» — قبل يوم القفل ──");
    const manualBefore = await countsOf(today);
    const r1 = await exec(S.techN, { items: okItems, noteToSpecialist: `يشكو ألماً في الركبة ${MARK}` });
    same("أ.٤ منفّذٌ غيرُ مسنَدٍ من الفرع ينفّذ (قرارُ المالك)", r1.status, 200);
    const v1 = (await q(`SELECT case_id, treatment_type, details, deleted_at FROM visits WHERE id = $1`, [r1.json.visitId])).rows[0];
    same("د.١ زيارةُ جلسة علاج طبيعي على قسمه بنوعٍ من قائمته", [v1.case_id, v1.treatment_type, String(v1.details).includes("خطة اختبار التنفيذ")],
      [physioCase, "روبوت", true]);
    same("د.٢ والبنودُ بدقائقها الفعلية ودقائق الخطّة", (await q(`SELECT device_id, done, minutes, planned_minutes FROM physio_plan_session_items WHERE session_id = $1 ORDER BY device_id`, [r1.json.id])).rows
      .map((r) => [Number(r.device_id), r.done, r.minutes, r.planned_minutes]).sort((a: any, b: any) => a[0] - b[0]),
      [[ROBOT, true, 30, 30], [LASER, true, 8, 10], [NEEDLE, false, null, 15]].sort((a: any, b: any) => a[0] - b[0]));
    same("هـ.١ وقبل يوم القفل لا يُمَسّ العدّاد", [r1.json.countsWritten, await countsOf(today)], [false, manualBefore]);
    same("و.١ والملاحظةُ تنبيهٌ لكاتب الخطّة", (await q(`SELECT target_user_ids FROM staff_notification_outbox WHERE event_type = 'physio_session_note' AND link_path = $1`, [`/physio/plans/${plan}`])).rows
      .map((r) => r.target_user_ids), [[SPEC]]);
    const td = (await call("GET", `/api/physio/today`, S.tech)).json;
    same("أ.٥ «جلسات اليوم» للمسنَد: الخطّةُ مسنَدةٌ إليه وسُجّلت اليوم", td.plans.filter((p: any) => p.planId === plan).map((p: any) => [p.assignedToMe, p.doneToday, p.sessionCount]), [[true, true, 1]]);
    same("أ.٦ والاستقبالُ لا يرى «جلسات اليوم»", (await call("GET", `/api/physio/today`, S.rec)).status, 403);
    const dv = (await call("GET", `/api/physio/deviations`, S.spec)).json.sessions.filter((s: any) => s.id === r1.json.id);
    same("و.٢ وصفحةُ الاختلافات: الإبرُ لم تُنفَّذ والليزرُ ٨ بدل ١٠", dv.map((s: any) => s.differences.length), [2]);
    same("و.٣ والتقنيُّ لا يرى الاختلافات", (await call("GET", `/api/physio/deviations`, S.tech)).status, 403);
    same("و.٤ والاستقبالُ يعرف أنّ للملفّ خطّةً معتمَدة", (await call("GET", `/api/patients/${pt}/physio-plan-flag`, S.rec)).json, { hasApprovedPlan: true, canExecute: false });
    same("ج.٢ وحاملُ الإبر يعلّمها منفّذة", (await exec(S.techN, { items: items({ [ROBOT]: { done: true }, [LASER]: { done: true }, [NEEDLE]: { done: true, minutes: 15 } }) })).status, 200);

    console.log("\n── هـ. يومُ القفل ──");
    const tomorrow = new Date(Date.now() + 3 * 3600 * 1000 + 86400000).toISOString().slice(0, 10);
    same("هـ.٢ غيرُ المسؤول لا يضبطه", (await call("PUT", `/api/session-tracking/branches/${B1}/counts-from`, S.sup, { date: tomorrow })).status, 403);
    same("هـ.٣ واليومُ نفسُه ⟵ ٤٠٠", (await call("PUT", `/api/session-tracking/branches/${B1}/counts-from`, S.admin, { date: today })).status, 400);
    same("هـ.٤ والغدُ مقبول", (await call("PUT", `/api/session-tracking/branches/${B1}/counts-from`, S.admin, { date: tomorrow })).status, 200);
    //  يومُ القفل اليوم مباشرةً في القاعدة (القاعدةُ تمنعه من الشاشة) — لنقيس الكتابةَ اليوم.
    await q(`UPDATE branches SET physio_counts_from = $1 WHERE id = $2`, [today, B1]);
    const r2 = await exec(S.tech);
    const after = await countsOf(today);
    same("هـ.٥ من يوم القفل تُكتب العدّاداتُ من التنفيذ: الروبوتُ والليزرُ +١ والإبرُ لا", [r2.json.countsWritten, after[ROBOT], after[LASER], after[NEEDLE] ?? 0],
      [true, (manualBefore[ROBOT] ?? 0) + 1, (manualBefore[LASER] ?? 0) + 1, manualBefore[NEEDLE] ?? 0]);
    const shift = (await q(`SELECT shift FROM physio_plan_sessions WHERE id = $1`, [r2.json.id])).rows[0].shift;
    same("هـ.٦ والإدخالُ اليدويّ مقفل", (await call("POST", `/api/session-tracking/daily/upsert`, S.admin, { branchId: B1, sessionDate: today, shift, counts: [{ deviceId: ROBOT, count: 99 }] })).status, 403);
    const daily = (await call("GET", `/api/session-tracking/daily?branchId=${B1}&date=${today}&shift=${shift}`, S.admin)).json;
    same("هـ.٧ و«إدخال الجلسات» يقول مقفل ويعرض عدّاتِ التنفيذ (ثلاثُ جلساتٍ فيها روبوت)", [daily.locked, daily.executionCounts.find((c: any) => c.deviceId === ROBOT)?.count],
      [true, 3]);

    console.log("\n── ز. الإلغاء ──");
    same("ز.١ الأخصائيُّ لا يلغي", (await call("POST", `/api/physio/sessions/${r2.json.id}/cancel`, S.spec, { reason: "x" })).status, 403);
    same("ز.٢ وبلا سبب ⟵ ٤٠٠", (await call("POST", `/api/physio/sessions/${r2.json.id}/cancel`, S.sup, {})).status, 400);
    same("ز.٣ المشرفُ يلغي", (await call("POST", `/api/physio/sessions/${r2.json.id}/cancel`, S.sup, { reason: "سُجّلت على مريضٍ خطأ" })).status, 200);
    same("ز.٤ فتُحذف الزيارةُ حذفاً ناعماً ويعود العدّاد", [
      (await q(`SELECT deleted_at IS NOT NULL AS d FROM visits WHERE id = $1`, [r2.json.visitId])).rows[0].d,
      (await countsOf(today))[ROBOT] ?? 0, (await countsOf(today))[LASER] ?? 0],
      [true, manualBefore[ROBOT] ?? 0, manualBefore[LASER] ?? 0]);
    same("ز.٥ ومرّتين ⟵ ٤٠٩", (await call("POST", `/api/physio/sessions/${r2.json.id}/cancel`, S.sup, { reason: "x" })).status, 409);

    console.log("\n── ح. لا حذفَ لخطّةٍ لها جلسات ──");
    same("ح.١ ⟵ ٤٠٩", (await call("DELETE", `/api/physio/plans/${plan}`, S.admin)).status, 409);

    console.log("\n── ط. حذفُ المريض يمرّ بالجلسات ──");
    let deleted = true;
    try { await storage.deletePatient(pt); } catch (e) { deleted = false; console.error(e); }
    check(deleted, "ط.١ الحذفُ النهائيّ ينجح");
    same("ط.٢ ولا جلسةَ ولا بندَ باقٍ", Number((await q(`SELECT (SELECT count(*) FROM physio_plan_sessions WHERE patient_id = $1)
      + (SELECT count(*) FROM physio_plan_session_items i WHERE NOT EXISTS (SELECT 1 FROM physio_plan_sessions s WHERE s.id = i.session_id)) AS n`, [pt])).rows[0].n), 0);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
