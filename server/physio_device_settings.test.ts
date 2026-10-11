// **الموجاتُ الصادمة في البروتوكولات السبعة، وإعداداتُ الجهاز قبل الاعتماد، والموعدُ الدوريّ** (ترحيل ١٣١، §4.dn — ٢٠٢٦-١٠-١١).
// `npm run test:physio-device-settings` — حيٌّ على النقاط الحقيقية (منفذ ٧٠٠٧، فرع ٨٩٣٠، مستخدمون ٨٩٣١–٨٩٣٤). يحرس:
//   ق — القواعدُ المشتركة: الخاناتُ الإلزامية للجهاز المستعمَل وحده (والشدّةُ بأحد بديليها)، وتطبيعُ الموعد، وحسابُ «هل حان»، وخروجُ الدوريّ من التناوب.
//   أ — الترحيلُ على القاعدة: سطرُ كلّ بروتوكولٍ من السبعة باستعماله ودليله وموعده وإعداداتٍ فارغة، والركبةُ بعد التمارين، والمعتمَدُ الناقصُ
//       يعود مسوّدةً بسطر تدقيق، والإعادةُ لا تكرّر، وما عدّله إنسانٌ لا يُكتب فوقه، وكلُّ سطر موجاتٍ في المكتبة أسبوعيّ، والمراجعُ مرّةً.
//   ب — من الأبواب: الصفحةُ تقول موانعَ الاعتماد والقائمةُ شارتَها، والاعتمادُ يُردّ ناقصاً ويمرّ مكتملاً (والشدّةُ بالمللي جول تكفي)، وتعديلُ
//       المشرف المعتمَدَ ناقصاً يعيده مسوّدة، والخطّةُ تنسخ الموعد، والتنفيذُ يطلب الجهازَ حين يحين وحده ويتوقّف حين يكتمل، والدوريُّ خارجَ التناوب.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-device-settings-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { LINES, REFS, sql as MIGRATION_SQL } from "./migrations/131_physio_shockwave_settings";
import {
  addDaysYmd, missingDeviceSettings, normalizeSchedule, scheduleOffNote, scheduleState,
} from "@shared/physio_device_settings";
import { sessionAdjuncts } from "@shared/physio_plans";
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

const PORT = 7007;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 8930;
const ADMIN = 8931, SUP = 8932, SPEC = 8933, TECH = 8934;
const IDS = [ADMIN, SUP, SPEC, TECH];
const MARK = "اختبار-إعدادات-الجهاز";
const KNEE = "knee-oa-geriatric", CHRONIC = "lbp-chronic-adult", STROKE = "stroke-subacute-adult", NECK = "neck-pain-mechanical-adult";

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
  await q(`UPDATE physio_protocols SET updated_by = NULL WHERE updated_by = ANY($1::int[])`, [IDS]);
  await q(`UPDATE physio_protocols SET approved_by = NULL WHERE approved_by = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ ق. القواعد المشتركة ══
  console.log("\n── ق. القواعد ──");
  const keys = (l: any) => missingDeviceSettings(l).map((m) => m.keys.join("|"));
  same("ق.١ **الموجاتُ الصادمة المستعمَلة بلا إعدادات تنقصها أربع**: النوع، والشدّة (بار أو مللي جول)، والتردّد، والنبضات",
    keys({ code: "shockwaves", params: {}, centreUse: "adjunct" }), ["mode", "pressureBar|energyMj", "frequencyHz", "impulses"]);
  same("ق.٢ **والشدّةُ بأحد بديليها تكفي**، والقيمةُ الفارغة كغيابها",
    [keys({ code: "shockwaves", params: { mode: "Focused", energyMj: "0.15", frequencyHz: "5", impulses: " " }, centreUse: "core" }),
      keys({ code: "shockwaves", params: { mode: "Radial", pressureBar: "2.5", frequencyHz: "8", impulses: "2000" }, centreUse: "core" })],
    [["impulses"], []]);
  same("ق.٣ **و«لا يُستخدم» لا يُطلب له شيء** — مكتوباً أو مشتقّاً من الدليل — ولا قاعدةَ لجهازٍ آخر",
    [keys({ code: "shockwaves", params: {}, centreUse: "not_used" }), keys({ code: "shockwaves", params: {}, centreUse: null, evidence: "not_recommended" }),
      keys({ code: "shockwaves", params: {}, centreUse: null, evidence: "optional" }).length, keys({ code: "tecar", params: {}, centreUse: "core" })],
    [[], [], 4, []]);
  same("ق.٤ **الموعدُ الدوريّ**: كلّ ١–٦٠ يوماً، والمرّاتُ ١–١٠٠ أو بلا حدّ، والمرّاتُ بلا تباعدٍ تُردّ",
    [normalizeSchedule(7, 4), normalizeSchedule("", ""), normalizeSchedule(undefined, null), typeof normalizeSchedule(0, null),
      typeof normalizeSchedule(61, null), typeof normalizeSchedule(null, 4), typeof normalizeSchedule(7, 101), typeof normalizeSchedule(1.5, null)],
    [{ everyDays: 7, times: 4 }, { everyDays: null, times: null }, { everyDays: null, times: null }, "string", "string", "string", "string", "string"]);
  const L = { everyDays: 7, times: 3 };
  same("ق.٥ **هل حان؟** أوّلَ مرّة نعم، وبعد ٣ أيّامٍ من آخر تنفيذ لا (والتالي بعد سبعة)، وبعد سبعةٍ نعم، وحين يكتمل العددُ لا — وبلا موعدٍ دائماً",
    [scheduleState(L, [], "2026-01-01").due, scheduleState(L, ["2026-01-01"], "2026-01-04"), scheduleState(L, ["2026-01-01"], "2026-01-08").due,
      scheduleState(L, ["2026-01-01", "2026-01-08", "2026-01-15"], "2026-01-29"), scheduleState({}, ["2026-01-01"], "2026-01-02").due],
    [true, { due: false, done: 1, next: "2026-01-08", complete: false }, true, { due: false, done: 3, next: null, complete: true }, true]);
  same("ق.٦ **وملاحظةُ الجلسة تقول لماذا تُرك** — لم يحن (بتاريخه) أو اكتمل",
    [scheduleOffNote(scheduleState(L, ["2026-01-01"], "2026-01-04")), scheduleOffNote(scheduleState(L, ["a", "b", "c"], "2026-02-01"))],
    ["موعدٌ دوريّ — لم يحن (التالي 2026-01-08)", "موعدٌ دوريّ — اكتمل عددُه (3)"]);
  same("ق.٧ **والدوريُّ خارجَ تناوب المساعدين** — لا يأخذ دوراً ولا يُعدّ «ليس دورَه»",
    sessionAdjuncts([{ deviceId: 1, centreUse: "core", displayOrder: 0 }, { deviceId: 2, centreUse: "adjunct", displayOrder: 1, everyDays: 7 },
      { deviceId: 3, centreUse: "adjunct", displayOrder: 2 }, { deviceId: 4, centreUse: "adjunct", displayOrder: 3 }], 0),
    { turnDeviceId: 3, offTurnDeviceIds: [4] });

  // ══ أ. الترحيل على القاعدة ══
  console.log("\n── أ. ترحيل ١٣١ ──");
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع إعدادات الجهاز')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'ds-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'ds-sup', 'x', 'سليم', 'branch_manager', $5, $6::jsonb, true, true),
                  ($3, 'ds-spec', 'x', 'مصطفى', 'physio_specialist', $5, $6::jsonb, true, false),
                  ($4, 'ds-tech', 'x', 'علي', 'physio_technician', $5, $6::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, B1, JSON.stringify([B1])]);
  //  كما على الإنتاج: سليم اعتمد ألمَ الظهر المزمن قبل الترحيل — ويُعاد الترحيلُ كاملاً هنا (يُزال سطرُه أوّلاً كأنّه لم يكن).
  await q(`DELETE FROM physio_protocol_devices pd USING devices d, physio_protocols p WHERE pd.device_id = d.id AND pd.protocol_id = p.id
             AND d.code = 'shockwaves' AND p.code = ANY($1::text[])`, [[KNEE, CHRONIC]]);
  await q(`UPDATE physio_protocols SET status = 'approved', approved_by = $2, approved_by_name = 'سليم' WHERE code = $1`, [CHRONIC, SUP]);
  await q(MIGRATION_SQL);
  const lines = async () => Object.fromEntries((await q(`SELECT p.code, pd.centre_use, pd.evidence, pd.every_days, pd.times, pd.params, pd.minutes, pd.note
      FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id JOIN physio_protocols p ON p.id = pd.protocol_id
      WHERE d.code = 'shockwaves' AND p.code = ANY($1::text[])`, [LINES.map((l) => l.code)])).rows.map((r) => [r.code, r]));
  const L0 = await lines();
  same("أ.١ **سطرٌ في كلّ بروتوكولٍ من السبعة** باستعماله ودليله وموعده الأسبوعيّ ومرّاته، **وإعداداتُ الجهاز فارغة** لجهاز المركز",
    LINES.map((l) => [l.code, L0[l.code]?.centre_use, L0[l.code]?.evidence, L0[l.code]?.every_days, L0[l.code]?.times, L0[l.code]?.params]),
    LINES.map((l) => [l.code, l.use, l.evidence, 7, l.times, {}]));
  same("أ.٢ **الركبةُ: أساسيٌّ بقرار سليم بعد التمارين مباشرة**، والمستعمَلُ بدقائقه وما لا يُستخدم بلاها",
    [(await q(`SELECT d.code FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id JOIN physio_protocols p ON p.id = pd.protocol_id
        WHERE p.code = $1 ORDER BY pd.display_order LIMIT 2`, [KNEE])).rows.map((r) => r.code), L0[KNEE]?.minutes, L0[NECK]?.minutes],
    [["exercise", "shockwaves"], 10, null]);
  const chronic = (await q(`SELECT id, status, approved_by_name FROM physio_protocols WHERE code = $1`, [CHRONIC])).rows[0];
  const auditRows = async () => (await q(`SELECT notes FROM audit_log WHERE entity_type = 'physio_protocol' AND entity_id = $1 AND user_name = 'ترحيل ١٣١'`, [chronic.id])).rows;
  same("أ.٣ **المعتمَدُ الذي صار فيه جهازٌ مستعمَلٌ ناقصُ الإعدادات يعود مسوّدةً** — بسطر تدقيقٍ يقول لماذا",
    [chronic.status, chronic.approved_by_name, (await auditRows()).length, /الموجاتُ الصادمة/.test((await auditRows())[0]?.notes ?? "")],
    ["draft", null, 1, true]);
  const counts = async () => (await q(`SELECT (SELECT count(*)::int FROM physio_protocol_devices) AS devs,
      (SELECT sum(jsonb_array_length("references"))::int FROM physio_protocols) AS refs,
      (SELECT count(*)::int FROM audit_log WHERE user_name = 'ترحيل ١٣١') AS audits,
      (SELECT string_agg(display_order::text, ',' ORDER BY id) FROM physio_protocol_devices) AS orders`)).rows[0];
  const c0 = await counts();
  await q(MIGRATION_SQL);
  same("أ.٤ **والإعادةُ لا تكرّر شيئاً**: السطورُ وترتيبُها والمراجعُ وسطورُ التدقيق", await counts(), c0);
  //  ما عدّله إنسانٌ لا يُكتب فوقه: سليم كتب ملاحظةً وإعداداتٍ في سطر الجلطة.
  await q(`UPDATE physio_protocols SET updated_by = $2 WHERE code = $1`, [STROKE, SUP]);
  await q(`UPDATE physio_protocol_devices pd SET note = 'ملاحظةُ سليم', params = '{"mode":"Radial"}'::jsonb FROM devices d, physio_protocols p
            WHERE pd.device_id = d.id AND pd.protocol_id = p.id AND d.code = 'shockwaves' AND p.code = $1`, [STROKE]);
  await q(MIGRATION_SQL);
  const s1 = (await lines())[STROKE];
  await q(`UPDATE physio_protocols SET updated_by = NULL WHERE code = $1`, [STROKE]);
  await q(MIGRATION_SQL);
  const s2 = (await lines())[STROKE];
  same("أ.٥ **وسطرٌ عدّله سليم لا يُكتب فوقه** (ملاحظتُه وإعداداتُه باقية) — وبلا أثرِ إنسانٍ يكتبه الترحيلُ بنصّه وإعداداتٍ فارغة",
    [s1?.note, s1?.params, s2?.note === LINES.find((l) => l.code === STROKE)!.note[0], s2?.params], ["ملاحظةُ سليم", { mode: "Radial" }, true, {}]);
  same("أ.٦ **وكلُّ سطر موجاتٍ صادمة في المكتبة أسبوعيّ** — المزروعةُ كذلك",
    (await q(`SELECT count(*) FILTER (WHERE pd.every_days IS DISTINCT FROM 7)::int AS n FROM physio_protocol_devices pd JOIN devices d ON d.id = pd.device_id
        WHERE d.code = 'shockwaves'`)).rows[0].n, 0);
  const refDup = (await q(`SELECT p.code, e->>'url' AS url, count(*)::int AS n FROM physio_protocols p, jsonb_array_elements(p."references") e
      WHERE e->>'url' = ANY($1::text[]) GROUP BY 1, 2`, [REFS.map((r) => r.url)])).rows;
  same("أ.٧ **ومراجعُ الدليل الجديدة في بروتوكولاتها مرّةً واحدة**",
    [refDup.length, refDup.every((r) => r.n === 1)], [REFS.length, true]);

  // ══ ب. من الأبواب ══
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: B1, isAdmin: true, permissions: {} }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
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
  const dev = Object.fromEntries((await q(`SELECT id, code FROM devices`)).rows.map((r) => [r.code, Number(r.id)]));
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices`, [B1]);
  const idOf = async (code: string) => Number((await q(`SELECT id FROM physio_protocols WHERE code = $1`, [code])).rows[0].id);
  const kneeId = await idOf(KNEE), neckId = await idOf(NECK);
  const pick = (o: any, ks: string[]) => Object.fromEntries(ks.map((k) => [k, o?.[k]]));
  //  ما ترسله شاشةُ تحرير البروتوكول — مع تعديلٍ على سطر الموجات الصادمة.
  const bodyOf = (full: any, shock: (d: any) => any = (d) => d) => ({
    ...pick(full, ["code", "titleAr", "titleEn", "category", "ageGroup", "summary", "goals", "assessment", "exercises", "contraindications", "precautions",
      "summaryEn", "goalsEn", "assessmentEn", "exercisesEn", "contraindicationsEn", "precautionsEn", "sessionsPerWeek", "durationWeeks", "sessionMinutes",
      "totalSessions", "references"]),
    devices: (full?.devices ?? []).map((d: any) => {
      const line = pick(d, ["deviceId", "evidence", "parameters", "parametersEn", "minutes", "note", "noteEn", "params", "centreUse", "everyDays", "times"]);
      return d.code === "shockwaves" ? shock(line) : line;
    }),
  });
  const pt = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
      VALUES ($1, '07709990931', $2, '64', 'physiotherapy', $3, true) RETURNING id`, [`حسن ${MARK}`, MARK, B1])).rows[0].id);
  await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [pt]);

  try {
    console.log("\n── ب. من الأبواب الحقيقية ──");
    const k0 = (await call("GET", `/api/physio/protocols/${kneeId}`, S.sup)).json;
    const shock0 = (k0?.devices ?? []).find((d: any) => d.code === "shockwaves");
    same("ب.١ **صفحةُ الركبة تقول موانعَ الاعتماد**: الموجاتُ الصادمة بخاناتها الأربع — والسطرُ بموعده",
      [(k0?.settingsBlockers ?? []).map((b: any) => [b.code, b.missing.map((m: any) => m.keys.join("|"))]), shock0?.everyDays, shock0?.times, shock0?.centreUse],
      [[["shockwaves", ["mode", "pressureBar|energyMj", "frequencyHz", "impulses"]]], 7, 4, "core"]);
    const list = (await call("GET", `/api/physio/protocols`, S.sup)).json ?? [];
    const rowOf = (id: number) => (Array.isArray(list) ? list : list.rows ?? []).find((r: any) => r.id === id);
    same("ب.٢ **وشارتُها في المكتبة**: الركبةُ تنتظر إعداداتِ جهاز، والرقبةُ (لا يُستخدم فيها) لا", [rowOf(kneeId)?.settingsMissing, rowOf(neckId)?.settingsMissing], [1, 0]);
    const a1 = await call("POST", `/api/physio/protocols/${kneeId}/approve`, S.sup);
    same("ب.٣ **والاعتمادُ يُردّ ناقصاً** — والرسالةُ تسمّي الجهازَ وخاناتِه",
      [a1.status, /الشدّة/.test(a1.json?.error ?? "") && /التردّد/.test(a1.json?.error ?? "") && /صادمة/.test(a1.json?.error ?? "")], [409, true]);
    const p1 = await call("PUT", `/api/physio/protocols/${kneeId}`, S.sup, bodyOf(k0, (d) => ({ ...d, params: { mode: "Radial", pressureBar: "2.5" } })));
    const a2 = await call("POST", `/api/physio/protocols/${kneeId}/approve`, S.sup);
    same("ب.٤ **ونصفُ الإعدادات لا يكفي**: الحفظُ يمرّ ويقول ما بقي، والاعتمادُ يُردّ بالتردّد والنبضات",
      [p1.status, (p1.json?.settingsBlockers ?? [])[0]?.missing?.map((m: any) => m.keys.join("|")), a2.status], [200, ["frequencyHz", "impulses"], 409]);
    const k1 = (await call("GET", `/api/physio/protocols/${kneeId}`, S.sup)).json;
    const p2 = await call("PUT", `/api/physio/protocols/${kneeId}`, S.sup,
      bodyOf(k1, (d) => ({ ...d, params: { mode: "Focused", energyMj: "0.15", frequencyHz: "5", impulses: "1500" } })));
    const a3 = await call("POST", `/api/physio/protocols/${kneeId}/approve`, S.sup);
    same("ب.٥ **ومكتملةً يُعتمد** — والشدّةُ بالمللي جول (المركّز) تكفي بدل البار",
      [p2.status, p2.json?.settingsBlockers, a3.status, a3.json?.status], [200, [], 200, "approved"]);
    const k2 = (await call("GET", `/api/physio/protocols/${kneeId}`, S.sup)).json;
    const p3 = await call("PUT", `/api/physio/protocols/${kneeId}`, S.sup, bodyOf(k2, (d) => ({ ...d, params: { ...d.params, impulses: "" } })));
    const k3 = (await call("GET", `/api/physio/protocols/${kneeId}`, S.sup)).json;
    const note3 = (await q(`SELECT notes FROM audit_log WHERE entity_type = 'physio_protocol' AND entity_id = $1 AND user_id = $2 ORDER BY id DESC LIMIT 1`, [kneeId, SUP])).rows[0]?.notes;
    same("ب.٦ **ولا يبقى معتمَداً ناقصاً ولو عدّله المشرف**: يعود مسوّدةً ويقول لماذا — في الردّ وسطر التدقيق",
      [p3.status, p3.json?.demoted, k3?.status, /عاد مسوّدةً/.test(note3 ?? "") && /النبضات/.test(note3 ?? "")], [200, true, "draft", true]);
    const p4 = await call("PUT", `/api/physio/protocols/${kneeId}`, S.sup, bodyOf(k3, (d) => ({ ...d, params: { ...d.params, impulses: "1500" } })));
    const a4 = await call("POST", `/api/physio/protocols/${kneeId}/approve`, S.sup);
    same("ب.٧ تهيئة: أُكملت فاعتُمدت ثانيةً", [p4.status, a4.status], [200, 200]);
    const n0 = (await call("GET", `/api/physio/protocols/${neckId}`, S.sup)).json;
    const na = await call("POST", `/api/physio/protocols/${neckId}/approve`, S.sup);
    same("ب.٨ **و«لا يُستخدم» لا يمنع الاعتماد** — الرقبةُ بلا موانع", [n0?.settingsBlockers, na.status], [[], 200]);
    const badSched = await call("PUT", `/api/physio/protocols/${neckId}`, S.sup, bodyOf(n0, (d) => ({ ...d, everyDays: null, times: 3 })));
    same("ب.٩ **والمرّاتُ بلا تباعدٍ تُردّ** في البروتوكول", badSched.status, 400);

    // ── الخطّةُ والتنفيذ ──
    const created = await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: kneeId });
    const plan = Number(created.json?.id);
    const g0 = (await call("GET", `/api/physio/plans/${plan}`, S.spec)).json;
    const pshock = (g0?.devices ?? []).find((d: any) => d.code === "shockwaves");
    same("ب.١٠ **الخطّةُ الجديدة تنسخ الموعد**: الموجاتُ الصادمة أساسيٌّ أسبوعيّ ٤ مرّات، وتاريخُ تنفيذها فارغ",
      [created.status, pshock?.centreUse, pshock?.everyDays, pshock?.times, g0?.scheduleHistory?.[dev.shockwaves]], [200, "core", 7, 4, []]);
    //  الأخصائيُّ يؤشّر مساعداً واحداً (التيكار) — فيتناوب وحده، والموجاتُ خارجَ التناوب.
    const tecar = (g0?.protocolAdjuncts ?? []).find((d: any) => d.code === "tecar");
    const lineOf = (d: any) => pick(d, ["deviceId", "minutes", "parameters", "parametersEn", "note", "noteEn", "centreUse", "everyDays", "times"]);
    const put = await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: g0.titleAr, devices: [...g0.devices, tecar].map(lineOf) });
    const badPlan = await call("PUT", `/api/physio/plans/${plan}`, S.spec, { titleAr: g0.titleAr,
      devices: [...g0.devices, tecar].map(lineOf).map((d: any) => (d.deviceId === dev.shockwaves ? { ...d, everyDays: null, times: 4 } : d)) });
    same("ب.١١ **والأخصائيُّ يحفظ الموعدَ لمريضه** — والمرّاتُ بلا تباعدٍ تُردّ", [put.status, badPlan.status], [200, 400]);
    await call("PUT", `/api/physio/plans/${plan}/assignees`, S.spec, { userIds: [TECH] });
    const ap = await call("POST", `/api/physio/plans/${plan}/approve`, S.sup);
    check(ap.status === 200, "تهيئة: اعتُمدت الخطّة", JSON.stringify(ap.json));
    const g = (await call("GET", `/api/physio/plans/${plan}`, S.admin)).json;
    const D = addDaysYmd(baghdadTodayYmd(), -35);
    const items = (done: string[], notes: Record<string, string> = {}) => (g?.devices ?? []).map((d: any) => ({
      deviceId: d.deviceId, done: done.includes(d.code), minutes: done.includes(d.code) ? d.minutes : null, note: notes[d.code] ?? null }));
    const run = (date: string, done: string[], notes: Record<string, string> = {}) =>
      call("POST", `/api/physio/plans/${plan}/sessions`, S.admin, { date, items: items(done, notes) });
    const itemOf = async (sid: number, code: string) => (await q(`SELECT i.done, i.off_turn, i.note FROM physio_plan_session_items i
        JOIN devices d ON d.id = i.device_id WHERE i.session_id = $1 AND d.code = $2`, [sid, code])).rows[0];
    const sid = (r: any) => Number(r.json?.session?.id ?? r.json?.id);
    const e1 = await run(D, ["exercise", "shockwaves", "tecar"]);
    const e2 = await run(addDaysYmd(D, 1), ["exercise", "tecar"]);
    const i2 = await itemOf(sid(e2), "shockwaves");
    same("ب.١٢ **اليومُ التالي: لم يحن موعدُها** — تُترك بلا سبب، وتُكتب «لم يحن» بتاريخ التالي",
      [e1.status, e2.status, i2?.done, i2?.off_turn, i2?.note], [200, 200, false, true, `موعدٌ دوريّ — لم يحن (التالي ${addDaysYmd(D, 7)})`]);
    const g2 = (await call("GET", `/api/physio/plans/${plan}`, S.admin)).json;
    same("ب.١٣ **والتيكارُ وحده يتناوب** — الموجاتُ الأساسيّة الدوريّة خارجَ التناوب، وتاريخُ تنفيذها مكتوب",
      [g2?.rotation?.turnDeviceId, g2?.scheduleHistory?.[dev.shockwaves]], [dev.tecar, [D]]);
    const e3 = await run(addDaysYmd(D, 7), ["exercise", "tecar"]);
    same("ب.١٤ **وبعد سبعة أيّام حان** — تركُها بلا سبب يُردّ كأيّ بندٍ مطلوب", [e3.status, /سبب/.test(e3.json?.error ?? "")], [400, true]);
    const e4 = await run(addDaysYmd(D, 7), ["exercise", "shockwaves", "tecar"]);
    const e5 = await run(addDaysYmd(D, 14), ["exercise", "shockwaves", "tecar"]);
    const e6 = await run(addDaysYmd(D, 21), ["exercise", "shockwaves", "tecar"]);
    const e7 = await run(addDaysYmd(D, 28), ["exercise", "tecar"]);
    const i7 = await itemOf(sid(e7), "shockwaves");
    same("ب.١٥ **وحين يكتمل عددُها (٤) لا تُطلب** — تُترك بلا سبب، وتُكتب «اكتمل عددُه»",
      [e4.status, e5.status, e6.status, e7.status, i7?.off_turn, i7?.note], [200, 200, 200, 200, true, "موعدٌ دوريّ — اكتمل عددُه (4)"]);
    const visit = (await q(`SELECT notes FROM visits WHERE patient_id = $1 AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`, [pt])).rows[0];
    check(!/لم يُنفَّذ/.test(visit?.notes ?? ""), "ب.١٦ **وزيارةُ الجلسة لا تقول «لم يُنفَّذ» عن موعدٍ لم يحن أو اكتمل**", visit?.notes);
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
