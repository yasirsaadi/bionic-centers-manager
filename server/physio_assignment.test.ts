// إسنادُ خطّة Bionic AI بأجزائها، والتنفيذُ المقصور على المُسنَد، والبديلُ بموافقة المعتمِد، وقرارُ المالك D في الإيقاف والتخرّج (§4.hc — ترحيل ٢٠١).
// `npm run test:physio-assignment` — القواعدُ الصرفة ثمّ النقاطُ الحقيقية بتطبيق Express الحقيقيّ على Postgres محلّي.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-assignment-test-secret";
delete process.env.ANTHROPIC_API_KEY;

import express from "express";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { executionItemsError } from "@shared/physio_plans";
import {
  canClosePlan, canCloseOpusPlans, partOfDeviceCode, partVerdict, requiredParts, substitutionInputError, SUBSTITUTION_MAX_DAYS, type SubstitutionLite,
} from "@shared/physio_plan_assignment";
import { eligibleStaffEvents, STAFF_EVENT_KEYS, staffEventDeliverable } from "@shared/staff_notifications";
import { baghdadTodayYmd } from "@shared/visit_date";
import { isBroadcastWrite } from "./live/updates";
import * as assignment from "./physio_plans/assignment";
import * as assess from "./physio_plans/assessments";
import * as versions from "./physio_agent/versions";
import { loadDayStats } from "./staff_greeting/yesterday";
import { loadTodaySummary } from "./reports/today_summary";
import * as migration201 from "./migrations/201_physio_plan_part_assignment";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg, `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows;
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

const PORT = Number(process.env.PHYSIO_ASSIGNMENT_TEST_PORT) || 7061;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إسناد-الأجزاء";
const B1 = 9851, B2 = 9852;
const ADMIN = 9861, SUP = 9862, SPEC = 9863, T1 = 9864, T2 = 9865, T3 = 9866, T4 = 9867, TX = 9868, DOC = 9869, BM = 9870, REC = 9871, SPECX = 9872, INACT = 9873;
const SPECB2 = 9874, T5 = 9875;
const IDS = [ADMIN, SUP, SPEC, T1, T2, T3, T4, TX, DOC, BM, REC, SPECX, INACT, SPECB2, T5];
const NAMES: Record<number, string> = { [ADMIN]: "المسؤول", [SUP]: "سليم", [SPEC]: "مصطفى", [T1]: "علي", [T2]: "حسن", [T3]: "زينب", [T4]: "مريم",
  [TX]: "معالج الفرع الآخر", [DOC]: "الطبيب", [BM]: "مدير الفرع", [REC]: "الاستقبال", [SPECX]: "أخصائيٌّ ومعالج", [INACT]: "معطّل", [SPECB2]: "أخصائيّ الفرع الآخر", [T5]: "نور" };

async function main() {
  // ══ ق. القواعدُ الصرفة ══════════════════════════════════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصرفة ──");
  same("Q.1 الجزءُ من رمز الجهاز، والأجزاءُ المطلوبة من النسخة",
    [partOfDeviceCode("electro"), partOfDeviceCode("exercise"),
      requiredParts({ devices: [{ deviceCode: "electro" }], phases: [] }),
      requiredParts({ devices: [{ deviceCode: "exercise" }], phases: [] }),
      requiredParts({ devices: [{ deviceCode: "laser" }, { deviceCode: "exercise" }], phases: [{ exercises: [{ exerciseId: 3 }] }] }),
      requiredParts({ devices: [{ deviceCode: "laser" }], phases: [{ exercises: [{ exerciseId: 3 }] }] }),
      requiredParts({ devices: [{ deviceCode: "laser" }], phases: [{ exercises: [{ exerciseId: -1 }] }] })],
    ["devices", "exercises", ["devices"], ["exercises"], ["devices", "exercises"], ["devices", "exercises"], ["devices"]]);
  const today0 = "2026-11-28";
  const sub = (o: Partial<SubstitutionLite>): SubstitutionLite => ({ id: 1, assigneeId: 10, substituteId: 20, planId: null, part: null, status: "approved",
    effectiveFrom: today0, dateTo: today0, substituteEligibleHere: true, ...o });
  const pv = (o: Partial<Parameters<typeof partVerdict>[0]>) => {
    const r = partVerdict({ approver: false, userId: 20, planId: 5, part: "exercises", assignment: { part: "exercises", userId: 10, name: "زينب", eligible: true },
      substitutions: [], date: today0, ...o });
    return r.ok ? r.via : r.code;
  };
  same("Q.2 **حكمُ الجزء**: المعتمِد · المُسنَد · البديلُ بنطاقه ويومه وأهليّته · وإلّا «ليس لك» أو «لم يُسنَد»",
    [pv({ approver: true }), pv({ userId: 10 }), pv({}), pv({ substitutions: [sub({})] }), pv({ substitutions: [sub({ planId: 5 })] }), pv({ substitutions: [sub({ planId: 6 })] }),
      pv({ substitutions: [sub({ part: "exercises" })] }), pv({ substitutions: [sub({ part: "devices" })] }), pv({ substitutions: [sub({ effectiveFrom: "2026-11-29", dateTo: "2026-11-30" })] }),
      pv({ substitutions: [sub({ dateTo: "2026-11-27", effectiveFrom: "2026-11-27" })] }), pv({ substitutions: [sub({ substituteEligibleHere: false })] }),
      pv({ substitutions: [sub({ status: "pending" })] }), pv({ substitutions: [sub({ status: "lapsed" })] }), pv({ substitutions: [sub({ assigneeId: 11 })] }),
      pv({ assignment: null }), pv({ assignment: { part: "exercises", userId: 10, name: "زينب", eligible: false }, userId: 10 }), pv({ substitutions: [sub({ effectiveFrom: null })] })],
    ["approver", "assignee", "part_not_yours", "substitute", "substitute", "part_not_yours", "substitute", "part_not_yours", "part_not_yours", "part_not_yours",
      "part_not_yours", "part_not_yours", "part_not_yours", "part_not_yours", "part_unassigned", "part_unassigned", "part_not_yours"]);
  same("Q.2ب **بديلُ «كلّ خططه» لا يمتدّ إلى ما أُسند بعد اعتماده** — وبديلُ الخطّة الواحدة لا يُقيَّد بهذا",
    [pv({ substitutions: [sub({ decidedAt: "2026-11-28T08:00:00.000Z" })], assignment: { part: "exercises", userId: 10, name: "زينب", eligible: true, assignedAt: "2026-11-28T07:00:00.000Z" } }),
      pv({ substitutions: [sub({ decidedAt: "2026-11-28T08:00:00.000Z" })], assignment: { part: "exercises", userId: 10, name: "زينب", eligible: true, assignedAt: "2026-11-28T09:00:00.000Z" } }),
      pv({ substitutions: [sub({ planId: 5, decidedAt: "2026-11-28T08:00:00.000Z" })], assignment: { part: "exercises", userId: 10, name: "زينب", eligible: true, assignedAt: "2026-11-28T09:00:00.000Z" } })],
    ["substitute", "part_not_yours", "substitute"]);
  const sie = (dateFrom: string, dateTo: string, reason = "إجازة") => substitutionInputError({ dateFrom, dateTo, reason, today: today0 }) === null;
  same("Q.3 **طلبُ البديل**: ليومٍ مضى ⟵ لا · النهايةُ قبل البداية ⟵ لا · ٦١ يوماً نعم و٦٢ لا · السببُ ٣–٥٠٠ · الصيغة",
    [sie(today0, today0), sie("2026-11-27", today0), sie(today0, "2026-11-27"), sie(today0, "2027-01-27"), sie(today0, "2027-01-28"), sie(today0, today0, "اب"),
      sie(today0, today0, "x".repeat(501)), sie("28-11-2026", today0), SUBSTITUTION_MAX_DAYS], [true, false, false, true, false, false, false, false, 61]);
  same("Q.3ب **يومٌ غيرُ موجود** («٣١ شباط» و«٢٩ شباط» في سنةٍ بسيطة) يُردّ برسالة الصيغة لا خطأً عامّاً — و«٢٨ شباط» يمرّ (مراجعةُ Codex على #778)",
    [substitutionInputError({ dateFrom: "2027-02-31", dateTo: "2027-02-31", reason: "إجازة", today: today0 }), sie("2027-02-01", "2027-02-29"), sie("2027-02-01", "2027-02-28")],
    ["التاريخان بصيغة سنة-شهر-يوم", false, true]);
  const S0 = (o: any) => o;
  same("Q.4 **قرارُ المالك D**: يوقف خطّةَ Bionic AI الأخصائيُّ والمسؤولُ والمشرفُ العام — لا المعالجُ ولا التقنيّ ولا المدرّبُ ولا الطبيبُ ولا المدير",
    [S0({ isAdmin: true }), S0({ role: "branch_manager", permissions: { canSupervisePhysio: true } }), S0({ role: "physio_specialist" }),
      S0({ role: "therapist", roles: ["therapist", "physio_specialist"] }), S0({ role: "therapist" }), S0({ role: "physio_technician" }), S0({ role: "physio_trainer" }),
      S0({ role: "doctor" }), S0({ role: "branch_manager" }), null].map((s) => canCloseOpusPlans(s)),
    [true, true, true, true, false, false, false, false, false, false]);
  same("Q.4ج **وفي فرع الخطّة**: أخصائيٌّ فروعُه غيرُ فرعها لا يوقفها (ملفٌّ أُتيح لفرعه)، والمعتمِدان لكلّ الفروع، واليدويةُ كما كانت",
    [canClosePlan({ role: "physio_specialist" }, { origin: "opus", branchId: 1 }, [2]), canClosePlan({ role: "physio_specialist" }, { origin: "opus", branchId: 1 }, [1, 2]),
      canClosePlan({ role: "branch_manager", permissions: { canSupervisePhysio: true } } as any, { origin: "opus", branchId: 1 }, [2]),
      canClosePlan({ role: "physio_specialist" }, { origin: "manual", branchId: 1 }, [2])], [false, true, true, true]);
  same("Q.4ب واليدويةُ بقاعدتها (كاتبُ الخطط)", [canClosePlan({ role: "physio_specialist" }, { origin: "manual" }), canClosePlan({ role: "therapist" }, { origin: "manual" })], [true, false]);
  const it = (deviceId: number, done: boolean, note: string | null = null) => ({ deviceId, done, minutes: null, note });
  same("Q.5 «بندٌ منفّذ على الأقلّ» يُترك للمُستدعي حين يُطلب، والافتراضُ كما كان",
    [executionItemsError({ planDeviceIds: [1], items: [it(1, false, "رفض")], needleDeviceId: null, canDryNeedle: false }) !== null,
      executionItemsError({ planDeviceIds: [1], items: [it(1, false, "رفض")], needleDeviceId: null, canDryNeedle: false, requireOneDone: false }),
      executionItemsError({ planDeviceIds: [], items: [], needleDeviceId: null, canDryNeedle: false, requireOneDone: false })], [true, null, null]);
  same("N.1 الأنواعُ أربعةٌ وثلاثون، و«طلبُ بديل» للمعتمِد وقرارُه لأدوار القسم — لا للاستقبال",
    [STAFF_EVENT_KEYS.length, eligibleStaffEvents({ role: "branch_manager", canSupervisePhysio: true } as any).includes("physio_substitute_pending"),
      eligibleStaffEvents({ role: "therapist" } as any).includes("physio_substitute_pending"),
      ["therapist", "physio_technician", "physio_trainer", "physio_specialist"].every((r) => eligibleStaffEvents({ role: r } as any).includes("physio_substitute_decided")),
      eligibleStaffEvents({ role: "reception" } as any).includes("physio_substitute_decided")], [34, true, false, true, false]);
  same("N.2 والقرارُ ردٌّ موجَّه يصل صاحبَه ولو تغيّر دورُه", [staffEventDeliverable({ role: "reception" }, "physio_substitute_decided", true),
    staffEventDeliverable({ role: "reception" }, "physio_substitute_decided", false)], [true, false]);
  same("N.3 كلُّ كتابةٍ جديدة تبثّ الإشارةَ الحيّة", ["/api/physio/plans/5/part-assignments", "/api/physio/part-assignments/seen", "/api/physio/substitutes",
    "/api/physio/substitutes/3/withdraw", "/api/physio/substitutes/3/decide", "/api/physio/substitutes/3/end", "/api/physio/substitutes/seen"]
    .map((p) => isBroadcastWrite(p.endsWith("part-assignments") ? "PUT" : "POST", p)), [true, true, true, true, true, true, true]);

  // ══ التجهيز ═══════════════════════════════════════════════════════════════════════════════════════════════════
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع إسناد ١'), ($2, 'فرع إسناد ٢') ON CONFLICT DO NOTHING`, [B1, B2]);
  const users: [number, string, number, boolean, Record<string, unknown>][] = [
    [ADMIN, "admin", B1, true, {}], [SUP, "branch_manager", B1, true, { can_supervise_physio: true }], [SPEC, "physio_specialist", B1, true, {}],
    [T1, "therapist", B1, true, { can_dry_needle: true }], [T2, "physio_technician", B1, true, {}], [T3, "physio_trainer", B1, true, {}], [T4, "therapist", B1, true, {}],
    [TX, "therapist", B2, true, {}], [DOC, "doctor", B1, true, {}], [BM, "branch_manager", B1, true, {}], [REC, "reception", B1, true, {}],
    [SPECX, "therapist", B1, true, { extra_roles: ["physio_specialist"] }], [INACT, "therapist", B1, false, {}],
    [SPECB2, "physio_specialist", B2, true, {}], [T5, "therapist", B1, true, {}],
  ];
  for (const [id, role, branch, active, extra] of users) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio, can_dry_needle, extra_roles)
             VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb)`,
      [id, `pa-${id}`, NAMES[id], role, branch, JSON.stringify([branch]), active, extra.can_supervise_physio === true, extra.can_dry_needle === true,
        JSON.stringify(extra.extra_roles ?? [])]);
  }
  const sessOf = (id: number, shift: "morning" | "evening" = "morning") => {
    const u = users.find((x) => x[0] === id)!;
    return hdr({ userId: id, displayName: NAMES[id], role: u[1], roles: [u[1], ...((u[4].extra_roles as string[]) ?? [])], branchId: u[2], isAdmin: u[1] === "admin",
      accessibleBranches: [u[2]], permissions: {}, shift });
  };
  const S = Object.fromEntries(IDS.map((id) => [id, sessOf(id)])) as Record<number, string>;
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) { try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; } catch { /* */ } }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, { method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const today = baghdadTodayYmd();
  const dayOff = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  const yesterday = dayOff(-1);
  const dev = Object.fromEntries((await q(`SELECT id, code FROM devices`)).map((r) => [r.code, Number(r.id)]));
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) SELECT id, $1, true FROM devices ON CONFLICT DO NOTHING`, [B1]);
  const EX = (await q(`SELECT id FROM physio_exercises WHERE NOT is_archived ORDER BY id LIMIT 4`)).map((r) => Number(r.id));

  let ptSeq = 0;
  const mkPatient = async (label: string) => {
    const id = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
        VALUES ($1, $2, $3, '40', 'physio', $4, true) RETURNING id`, [`${label} ${MARK}`, `0770${String(1000000 + ++ptSeq).slice(1)}`, MARK, B1]))[0].id;
    await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [id]);
    return Number(id);
  };
  /** خطّةُ Bionic AI معتمَدة (كما يكتبها الاعتمادُ قبل نظام النسخ) — أجهزتُها ومراحلُها (المرحلةُ ١ للجلستين الأوليين). */
  const mkPlan = async (patientId: number, title: string, codes: string[], phases: number[][] = [[EX[0], EX[1]], [EX[2]]], o: { status?: string; origin?: string } = {}) => {
    const id = Number((await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status, origin, decided_at, decided_by, decided_by_name, total_sessions,
        sessions_per_week, session_minutes, created_by, created_by_name)
      VALUES ($1, $2, $3, $4, $5, now(), $6, 'سليم', 12, 3, 45, $7, 'مصطفى') RETURNING id`,
      [patientId, B1, title, o.status ?? "approved", o.origin ?? "opus", SUP, SPEC]))[0].id);
    for (const [i, c] of codes.entries()) await q(`INSERT INTO physio_plan_devices (plan_id, device_id, minutes, centre_use, display_order) VALUES ($1, $2, 15, 'core', $3)`, [id, dev[c], i]);
    for (const [i, xs] of phases.entries()) {
      const ph = (await q(`INSERT INTO physio_plan_phases (plan_id, position, name_ar, name_en, session_from, session_to) VALUES ($1, $2, $3, 'P', $4, $5) RETURNING id`,
        [id, i + 1, `المرحلة ${i + 1}`, i === 0 ? 1 : 3, i === 0 ? 2 : 12]))[0].id;
      for (const [j, x] of xs.entries()) await q(`INSERT INTO physio_plan_phase_exercises (phase_id, exercise_id, position) VALUES ($1, $2, $3)`, [ph, x, j]);
    }
    return id;
  };
  /** تمارينُ مرحلة الجلسة التالية (المرحلةُ ١ للجلستين الأوليين) — من صفحة الخطّة. */
  const phaseEx = async (planId: number, sessionId?: number) => {
    const sv = (await call("GET", `/api/physio/plans/${planId}/sessions`, S[SUP])).json?.sessions ?? [];
    const live = sv.filter((x: any) => !x.cancelledAt && (sessionId == null || x.id < sessionId)).length;
    return live + 1 <= 2 ? [EX[0], EX[1]] : [EX[2]];
  };
  const execV = async (planId: number) => (await call("GET", `/api/physio/plans/${planId}`, S[SUP])).json?.executionVersion ?? null;
  const items = (o: Record<string, { done: boolean; note?: string; minutes?: number }>) => Object.entries(o).map(([c, v]) => ({ deviceId: dev[c], done: v.done,
    minutes: v.minutes ?? null, note: v.note ?? null }));
  const exs = (ids: number[], done = true) => ids.map((x) => ({ exerciseId: x, done, note: done ? null : "رفض المريض" }));
  const run = (planId: number, s: string, body: any) => call("POST", `/api/physio/plans/${planId}/sessions`, s, body);
  const assign = (planId: number, s: string, body: any) => call("PUT", `/api/physio/plans/${planId}/part-assignments`, s, body);
  const outbox = async (event: string, since: number) => q(`SELECT target_user_ids, text, link_path FROM staff_notification_outbox WHERE event_type = $1 AND id > $2 ORDER BY id`, [event, since]);
  const lastOutbox = async () => Number((await q(`SELECT COALESCE(max(id), 0) AS m FROM staff_notification_outbox`))[0].m);
  const countsOf = async (shift: string) => Object.fromEntries((await q(`SELECT c.device_id, c.count FROM session_counts c JOIN daily_sessions d ON d.id = c.daily_session_id
      WHERE d.branch_id = $1 AND d.session_date = $2 AND d.shift = $3`, [B1, today, shift])).map((r) => [Number(r.device_id), Number(r.count)]));

  const PA = await mkPatient("مريض الخطّة الأولى");
  const P1 = await mkPlan(PA, "خطّة Bionic AI الأولى", ["electro", "tecar", "needle", "exercise"]);
  const PB = await mkPatient("مريض الخطّة الثانية");
  const P2 = await mkPlan(PB, "خطّة Bionic AI الثانية", ["electro", "exercise"]);
  const PE = await mkPatient("مريض الخطّة التوأم");
  const PTW = await mkPlan(PE, "خطّة Bionic AI الأولى", ["electro", "tecar", "needle", "exercise"]);
  const PC = await mkPatient("مريض التمارين في المراحل وحدها");
  const PNX = await mkPlan(PC, "خطّة بلا سطر تمارين", ["electro"]);
  const PD = await mkPatient("مريض الخطّة اليدوية");
  const PMAN = await mkPlan(PD, "خطّة يدوية", ["electro", "exercise"], [[EX[0]]], { origin: "manual" });
  const PF = await mkPatient("مريض الأجهزة وحدها");
  const PDEV = await mkPlan(PF, "خطّة أجهزة وحدها", ["electro", "laser"], []);
  const PG = await mkPatient("مريض النسخ");
  const PVER = await mkPlan(PG, "خطّة تتغيّر نسخُها", ["electro", "exercise"]);

  try {
    console.log("\n── أ. الإسناد ──");
    same("A.1 الأخصائيُّ والمعالجُ والطبيبُ لا يُسندون خطّةَ Bionic AI", [(await assign(P1, S[SPEC], { devices: T1 })).status, (await assign(P1, S[T1], { devices: T1 })).status,
      (await assign(P1, S[DOC], { devices: T1 })).status], [403, 403, 403]);
    let ob = await lastOutbox();
    const a2 = await assign(P1, S[SUP], { devices: T1, exercises: T3 });
    const rowsA = await q(`SELECT part, user_id, assigned_version, seen_at FROM physio_plan_part_assignments WHERE plan_id = $1 ORDER BY part`, [P1]);
    same("A.2 **المشرفُ يُسند الأجهزةَ لعلي والتمارينَ لزينب** — صفٌّ لكلّ جزء ولم يُرَ بعد", [a2.status, rowsA.map((r) => [r.part, Number(r.user_id), r.seen_at])],
      [200, [["devices", T1, null], ["exercises", T3, null]]]);
    same("A.3 والمنفّذون القدامى اتّحادُ المُسنَدين", (await q(`SELECT user_id FROM physio_plan_assignees WHERE plan_id = $1 ORDER BY user_id`, [P1])).map((r) => Number(r.user_id)), [T1, T3]);
    const asgEv = await outbox("physio_plan_assigned", ob);
    same("A.4 **تلغرامُ كلّ مُسنَد بجزئه** — بلا «Opus»", asgEv.map((e) => [e.target_user_ids, /«الأجهزة»/.test(e.text) ? "d" : /«التمارين»/.test(e.text) ? "x" : "?", /Opus/.test(e.text)]),
      [[[T1], "d", false], [[T3], "x", false]]);
    same("A.5 وسطرُ تدقيق «assign_parts»", (await q(`SELECT new_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'assign_parts'`, [P1]))
      .map((r) => JSON.parse(r.new_values).parts), [{ devices: T1, exercises: T3 }]);
    same("A.6 **يُسند إلى أدوار القسم العاملة في فرع الخطّة وحدها** — معالجُ فرعٍ آخر والمعطَّلُ والطبيبُ ⟵ ٤٠٠",
      [await assign(P1, S[SUP], { devices: TX }), await assign(P1, S[SUP], { devices: INACT }), await assign(P1, S[SUP], { devices: DOC })].map((r) => r.json?.code), ["assignee_invalid", "assignee_invalid", "assignee_invalid"]);
    ob = await lastOutbox();
    const a7a = await assign(P1, S[SUP], { exercises: T2 });
    const a7b = await assign(P1, S[SUP], { exercises: T2, reason: "زينب في دورة تدريبية" });
    const withdrawn = await outbox("physio_plan_assigned", ob);
    same("A.7 **تغييرُ مُسنَدٍ قائم بسبب**، و«سُحب منك» لزينب و«أُسند إليك» لحسن", [a7a.json?.code, a7b.status, withdrawn.map((e) => [e.target_user_ids[0], /سُحب منك/.test(e.text)])],
      ["reason_required", 200, [[T2, false], [T3, true]]]);
    await assign(P1, S[SUP], { exercises: T3, reason: "عادت زينب" });
    same("A.7ب والمنفّذون القدامى يتبعون", (await q(`SELECT user_id FROM physio_plan_assignees WHERE plan_id = $1 ORDER BY user_id`, [P1])).map((r) => Number(r.user_id)), [T1, T3]);
    same("A.8 بلا تغيير ⟵ ٤٠٠", (await assign(P1, S[SUP], { devices: T1 })).json?.code, "no_change");
    same("A.9 جزءٌ ليس في الخطّة ⟵ ٤٠٠", (await assign(PDEV, S[SUP], { exercises: T3 })).json?.code, "part_not_in_plan");
    same("A.10 **قائمةُ المنفّذين القديمة لخطّة Bionic AI ⟵ ٤٠٩** لأيّ أحد، واليدويةُ كما كانت", [(await call("PUT", `/api/physio/plans/${P1}/assignees`, S[SPEC], { userIds: [T4] })).json?.code,
      (await call("PUT", `/api/physio/plans/${P1}/assignees`, S[SUP], { userIds: [T4] })).json?.code, (await call("PUT", `/api/physio/plans/${PMAN}/assignees`, S[SPEC], { userIds: [T4] })).status],
      ["opus_assign_by_part", "opus_assign_by_part", 200]);
    const PAW = await mkPlan(await mkPatient("مريض الخطّة المنتظرة"), "منتظرة", ["electro"], [], { status: "pending" });
    const PST = await mkPlan(await mkPatient("مريض الخطّة الموقوفة"), "موقوفة", ["electro"], [], { status: "stopped" });
    same("A.11 المنتظرةُ ⟵ ٤٠٩ مقفلة · واليدويةُ ⟵ لخطّة Bionic AI وحدها · والموقوفةُ ⟵ منتهية",
      [(await assign(PAW, S[SUP], { devices: T1 })).json?.code, (await assign(PMAN, S[SUP], { devices: T1 })).json?.code, (await assign(PST, S[SUP], { devices: T1 })).json?.code],
      ["opus_plan_locked", "opus_only", "plan_closed"]);
    const cand = await call("GET", `/api/physio/plans/${P1}/assignee-candidates`, S[SUP]);
    same("A.12 مرشّحو خطّة Bionic AI للمعتمِد وحده بعلَم الإبر", [(await call("GET", `/api/physio/plans/${P1}/assignee-candidates`, S[SPEC])).status, cand.status,
      cand.json?.find((u: any) => u.id === T1)?.canDryNeedle, cand.json?.find((u: any) => u.id === T4)?.canDryNeedle, cand.json?.[0]?.planHasNeedle, cand.json?.some((u: any) => u.id === TX)],
      [403, 200, true, false, true, false]);
    const seen1 = await call("POST", `/api/physio/part-assignments/seen`, S[T1], { planId: P1 });
    await call("POST", `/api/physio/part-assignments/seen`, S[T1], { planId: P1 });
    same("A.13 **«رآه»** مرّةً لكلّ إسناد — والإعادةُ لا تكتب ثانية", [seen1.json?.parts,
      Number((await q(`SELECT count(*) FROM audit_log WHERE entity_id = $1 AND action = 'assignment_seen'`, [P1]))[0].count),
      (await q(`SELECT seen_at IS NOT NULL AS s FROM physio_plan_part_assignments WHERE plan_id = $1 AND part = 'devices'`, [P1]))[0].s], [["devices"], 1, true]);
    //  الترحيلُ يملأ أجزاءَ خطّةٍ قائمة ولا يُسند شيئاً (لا ملءَ من المنفّذين القدامى).
    const PMIG = await mkPlan(await mkPatient("مريض قبل الترحيل"), "قبل ٢٠١", ["laser", "exercise"]);
    await q(`INSERT INTO physio_plan_assignees (plan_id, user_id) VALUES ($1, $2)`, [PMIG, T1]);
    await pool.query(migration201.sql);
    same("A.14 **الترحيلُ يملأ الأجزاءَ ولا يُسند** (ويُعاد بلا أثر)", [(await q(`SELECT opus_parts FROM physio_plans WHERE id = $1`, [PMIG]))[0].opus_parts,
      Number((await q(`SELECT count(*) FROM physio_plan_part_assignments WHERE plan_id = $1`, [PMIG]))[0].count)], [["devices", "exercises"], 0]);

    console.log("\n── ب. بانتظار الإسناد ──");
    const un = await call("GET", `/api/physio/opus-plans?view=unassigned`, S[SUP]);
    const pc = await call("GET", `/api/physio/red-flag-reviews/pending-count`, S[SUP]);
    same("U.1 **الخطّةُ المعتمَدة بلا إسناد** في «بانتظار الإسناد» بما ينقصها، ورقمُها في الشارة", [un.json?.rows?.find((r: any) => r.id === P2)?.missingParts,
      un.json?.rows?.some((r: any) => r.id === P1), pc.json?.opusUnassigned >= 1, pc.json?.count >= pc.json?.opusUnassigned],
      [["devices", "exercises"], false, true, true]);
    const tdT1 = await call("GET", `/api/physio/today`, S[T1]);
    const tdSup = await call("GET", `/api/physio/today`, S[SUP]);
    same("U.3 **«جلسات اليوم»**: لعلي خطّةٌ بلا جزءٍ له للقراءة وحدها، وللمشرف «بانتظار الإسناد»",
      [tdT1.json?.plans?.find((p: any) => p.planId === P2)?.readOnly, tdT1.json?.plans?.find((p: any) => p.planId === P1)?.readOnly,
        tdT1.json?.plans?.find((p: any) => p.planId === P1)?.myParts, tdSup.json?.awaitingAssignment?.includes(P2), tdSup.json?.awaitingAssignment?.includes(P1)],
      [true, false, ["devices"], true, false]);
    let v2 = await execV(P2);
    const u2a = await run(P2, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: v2 });
    same("U.2 **بلا إسناد لا ينفّذ إلّا المعتمِد** — علي ⟵ ٤٠٣ «لم يُسنَد بعد»", [u2a.status, u2a.json?.code, /لم يُسنَد بعد/.test(u2a.json?.error ?? "")], [403, "part_unassigned", true]);
    const u2b = await run(P2, S[SUP], { items: items({ electro: { done: true }, exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: v2 });
    same("U.2ب والمشرفُ ينفّذها بجزأيها", [u2b.status, u2b.json?.parts, (await q(`SELECT part, via FROM physio_plan_session_parts WHERE session_id = $1 ORDER BY part`, [u2b.json?.id]))
      .map((r) => [r.part, r.via])], [200, ["devices", "exercises"], [["devices", "approver"], ["exercises", "approver"]]]);
    await assign(P2, S[SUP], { devices: T1, exercises: T3 });
    same("U.4 بعد الإسناد تخرج من «بانتظار الإسناد» — وتعود إن عُطّل المُسنَد",
      [await (async () => (await assignment.listUnassignedOpusPlans(null)).some((r) => r.id === P2))(),
        await (async () => { await q(`UPDATE system_users SET is_active = false WHERE id = $1`, [T1]); const r = (await assignment.listUnassignedOpusPlans(null)).find((x) => x.id === P2)?.missingParts;
          await q(`UPDATE system_users SET is_active = true WHERE id = $1`, [T1]); return r; })()], [false, ["devices"]]);

    console.log("\n── ج. التنفيذُ بالأجزاء ──");
    await q(`UPDATE branches SET physio_counts_from = $1 WHERE id = $2`, [today, B1]);
    let v1 = await execV(P1);
    const p1Dev = { electro: { done: true, minutes: 15 }, tecar: { done: true }, needle: { done: false, note: "لا وقت" } };
    same("E.1ب جزءُ الأجهزة لا يحمل مرحلة التمارين ⟵ ٤٠٠", (await run(P1, S[T1], { parts: ["devices"], items: items(p1Dev), phasePosition: 1, planVersion: v1 })).json?.code,
      "exercises_not_requested");
    const e1 = await run(P1, sessOf(T1, "morning"), { parts: ["devices"], items: items(p1Dev), planVersion: v1 });
    const s1 = (await q(`SELECT parts_required, phase_position, visit_id, plan_version FROM physio_plan_sessions WHERE id = $1`, [e1.json?.id]))[0];
    same("E.1 **علي يفتح الجلسةَ بالأجهزة** — جلسةٌ تطلب الجزأين، وصفُّ جزئه بصفة المُسنَد، والمرحلةُ تنتظر التمارين، وزيارةٌ واحدة",
      [e1.status, e1.json?.parts, s1?.parts_required, s1?.phase_position, (await q(`SELECT via, recorded_by FROM physio_plan_session_parts WHERE session_id = $1`, [e1.json?.id]))
        .map((r) => [r.via, Number(r.recorded_by)]), Number((await q(`SELECT count(*) FROM visits WHERE patient_id = $1 AND deleted_at IS NULL`, [PA]))[0].count)],
      [200, ["devices"], ["devices", "exercises"], null, [["assignee", T1]], 1]);
    const t1Today = (await call("GET", `/api/physio/today`, S[T1])).json?.plans?.find((p: any) => p.planId === P1);
    same("E.1ج «جلسات اليوم» لعلي: سُجّل جزؤه (والجلسةُ تنتظر زينب)", [t1Today?.doneToday, t1Today?.awaitingMyPart, t1Today?.parts?.map((x: any) => [x.part, x.holderName, Boolean(x.recordedToday)])],
      [true, false, [["devices", "علي", true], ["exercises", "زينب", false]]]);
    const e2 = await run(P1, S[T1], { parts: ["exercises"], items: items({ exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: v1 });
    same("E.2 **علي لا يسجّل التمارين** ⟵ ٤٠٣ باسم زينب", [e2.status, e2.json?.code, /زينب/.test(e2.json?.error ?? "")], [403, "part_not_yours", true]);
    const e3 = await run(P1, S[T3], { parts: ["exercises"], items: items({ exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: v1 });
    same("E.3 **زينب لا تفتح جلسةً ثانية** — ٤٠٩ برقم الجلسة المفتوحة وما ينقصها", [e3.status, e3.json?.code, e3.json?.sessionId, e3.json?.missingParts, e3.json?.recordedParts],
      [409, "open_session_exists", e1.json?.id, ["exercises"], ["devices"]]);
    const t3Today = (await call("GET", `/api/physio/today`, S[T3])).json?.plans?.find((p: any) => p.planId === P1);
    same("E.3ب وفي «جلسات اليوم»: «إكمال الجلسة» لزينب برقمها", [t3Today?.awaitingMyPart, t3Today?.openSessionId, t3Today?.doneToday], [true, e1.json?.id, false]);
    const planView = (await call("GET", `/api/physio/plans/${P1}`, S[T3])).json;
    same("E.15ب **صفحةُ الخطّة لزينب**: الجلسةُ المفتوحة بما سُجّل منها وما ينقصها", [planView?.assignment?.openSession?.id, planView?.assignment?.openSession?.missingParts,
      planView?.assignment?.openSession?.recordedParts?.map((x: any) => [x.part, x.byName]), planView?.assignment?.openSession?.sessionsBefore], [e1.json?.id, ["exercises"], [["devices", "علي"]], 0]);
    same("E.8 نسخةٌ قديمة ⟵ ٤٠٩ في الفتح والإكمال", [(await run(P1, S[T1], { parts: ["devices"], items: items(p1Dev), planVersion: 99 })).json?.code,
      (await run(P1, S[T3], { parts: ["exercises"], sessionId: e1.json?.id, items: items({ exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: 99 })).json?.code],
      ["plan_version_changed", "plan_version_changed"]);
    same("E.7 **بنودُ جزءٍ ليس له** ⟵ ٤٠٠ (الأجهزةُ مع التمارين)", [
      (await run(P1, S[T3], { parts: ["exercises"], sessionId: e1.json?.id, items: items({ exercise: { done: true }, electro: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: v1 })).status],
      [400]);
    same("E.20 **جزءُ التمارين بلا تمارينه** ⟵ ٤٠٠", (await run(P1, S[T3], { parts: ["exercises"], sessionId: e1.json?.id, items: items({ exercise: { done: true } }), planVersion: v1 })).json?.code,
      "exercises_required");
    same("E.10ب افتراضٌ قديمٌ للمرحلة ⟵ ٤٠٩", (await run(P1, S[T3], { parts: ["exercises"], sessionId: e1.json?.id, items: items({ exercise: { done: true } }),
      exercises: exs([EX[2]]), phasePosition: 2, planVersion: v1 })).status, 409);
    const visitId = s1.visit_id;
    const e4 = await run(P1, sessOf(T3, "evening"), { parts: ["exercises"], sessionId: e1.json?.id, items: items({ exercise: { done: true } }),
      exercises: [{ exerciseId: EX[0], done: true, note: null }, { exerciseId: EX[1], done: false, note: "تعب" }], planVersion: v1 });
    const tw = await run(PTW, S[SUP], { items: items({ ...p1Dev, exercise: { done: true } }),
      exercises: [{ exerciseId: EX[0], done: true, note: null }, { exerciseId: EX[1], done: false, note: "تعب" }], planVersion: await execV(PTW) });
    const vA = (await q(`SELECT treatment_type, notes FROM visits WHERE id = $1`, [visitId]))[0];
    const vB = (await q(`SELECT treatment_type, notes FROM visits WHERE id = $1`, [tw.json?.visitId]))[0];
    same("E.4 **زينب تُكمل الجلسةَ على الزيارة نفسِها** — نوعُها ونصُّها يساويان حفظاً واحداً حقلاً بحقل، والمرحلةُ تُكتب",
      [e4.status, e4.json?.attached, e4.json?.visitId === visitId, Number((await q(`SELECT count(*) FROM visits WHERE patient_id = $1 AND deleted_at IS NULL`, [PA]))[0].count),
        vA.treatment_type === vB.treatment_type, vA.notes === vB.notes, (await q(`SELECT phase_position FROM physio_plan_sessions WHERE id = $1`, [e1.json?.id]))[0].phase_position,
        (await q(`SELECT phase_position FROM physio_plan_sessions WHERE id = $1`, [tw.json?.id]))[0].phase_position],
      [200, true, true, 1, true, true, 1, 1]);
    if (vA.notes !== vB.notes) console.log(`      A=${JSON.stringify(vA)} B=${JSON.stringify(vB)}`);
    same("E.4ب وسطرُ تعديل الزيارة بالقديم والجديد", (await q(`SELECT old_values, new_values FROM audit_log WHERE entity_type = 'visit' AND entity_id = $1 AND action = 'update'`, [visitId]))
      .map((r) => [JSON.parse(r.old_values).notes !== JSON.parse(r.new_values).notes]), [[true]]);
    same("E.6 جلسةُ التوأم بحفظٍ واحد: جزآن بصفة المعتمِد", (await q(`SELECT part, via FROM physio_plan_session_parts WHERE session_id = $1 ORDER BY part`, [tw.json?.id])).map((r) => [r.part, r.via]),
      [["devices", "approver"], ["exercises", "approver"]]);
    {
      //  مراجعةُ Codex على #778 — «حسب المعالج» في نتائج العلاج الطبيعي ينسب الجلسةَ المقسومة لمعالجَيها كليهما، لا لأحدهما.
      const oc = await call("GET", `/api/physio/outcomes`, S[ADMIN]);
      const names = (await q(`SELECT id, display_name FROM system_users WHERE id IN ($1, $2)`, [T1, T3])).map((r) => [Number(r.id), String(r.display_name)]);
      same("E.4ج **نتائجُ العلاج: معالجا الجلسة المقسومة كلاهما** في «حسب المعالج»",
        [oc.status, names.length, ...names.map(([, n]) => (oc.json?.byExecutor ?? []).some((g: any) => g.name === n))], [200, 2, true, true]);
    }
    same("E.7ب وسطرُ التمارين مع الأجهزة ⟵ ٤٠٠", (await run(P1, S[T1], { parts: ["devices"], items: items({ ...p1Dev, exercise: { done: true } }), planVersion: v1 })).status, 400);
    same("E.5 الجزءُ نفسُه ثانيةً ⟵ ٤٠٩", (await run(P1, S[T3], { parts: ["exercises"], sessionId: e1.json?.id, items: items({ exercise: { done: true } }),
      exercises: exs([EX[0], EX[1]]), planVersion: v1 })).json?.code, "part_already_recorded");
    const cm = await countsOf("morning"); const ce = await countsOf("evening");
    same("E.9 **العدّاداتُ بوردية الجلسة** (صباحاً) لا وردية زينب (مساءً): التحفيزُ والتيكارُ والتمارينُ مرّتين (الجلسةُ والتوأم)",
      [cm[dev.electro], cm[dev.tecar], cm[dev.exercise], cm[dev.needle] ?? 0, ce[dev.exercise] ?? 0], [2, 2, 2, 0, 0]);
    const t3After = (await call("GET", `/api/physio/today`, S[T3])).json?.plans?.find((p: any) => p.planId === P1);
    same("E.1د وبعد الإكمال: «سُجّلت اليوم» لزينب", [t3After?.doneToday, t3After?.awaitingMyPart], [true, false]);
    const ps = (await call("GET", `/api/physio/plans/${P1}/sessions`, S[SPEC])).json;
    same("E.16 **سجلُّ الجلسات بأجزائها ومسجِّليها**، ولا ناقص", [ps?.sessions?.[0]?.parts?.map((x: any) => [x.part, x.recordedByName, x.via]), ps?.sessions?.[0]?.missingParts],
      [[["devices", "علي", "assignee"], ["exercises", "زينب", "assignee"]], []]);
    //  جلسةٌ أخرى اليوم (الأولى اكتملت): علي يفتح، والمعتمِدُ يُغلقها بعد ذلك.
    same("E.6ب **صفحةٌ أقدم بلا أجزاء** لعلي ⟵ ٤٠٣ (لا يسجّل التمارين)", (await run(P1, S[T1], { items: items({ ...p1Dev, exercise: { done: true } }), exercises: exs([EX[2]]), planVersion: v1 })).status, 403);
    same("E.11 فتحٌ بلا بندٍ منفّذ ⟵ ٤٠٠", (await run(P1, S[T1], { parts: ["devices"], items: items({ electro: { done: false, note: "x" }, tecar: { done: false, note: "x" }, needle: { done: false, note: "x" } }), planVersion: v1 })).status, 400);
    same("E.22 **الإبرُ بيد غير حاملها** ⟵ ٤٠٠ — حسن مُسنَدٌ إليه أجهزةُ خطّةٍ فيها إبر", await (async () => {
      await assign(PTW, S[SUP], { devices: T2, exercises: T3 });
      return (await run(PTW, S[T2], { parts: ["devices"], items: items({ electro: { done: true }, tecar: { done: true }, needle: { done: true } }), planVersion: await execV(PTW) })).status; })(), 400);
    same("E.13 **الأخصائيُّ غيرُ المُسنَد** لا ينفّذ خطّةَ Bionic AI، وهو ومريم ينفّذان اليدوية كما كانت",
      [(await run(P1, S[SPEC], { parts: ["devices"], items: items(p1Dev), planVersion: v1 })).status,
        (await run(PMAN, S[SPEC], { items: items({ electro: { done: true }, exercise: { done: true } }), exercises: exs([EX[0]]) })).status,
        (await run(PMAN, S[T4], { items: items({ electro: { done: true }, exercise: { done: true } }) })).status,
        (await run(PMAN, S[T4], { parts: ["devices"], items: items({ electro: { done: true }, exercise: { done: true } }) })).json?.code], [403, 200, 200, "parts_not_opus"]);
    const g = async (s: number) => (await call("GET", `/api/physio/plans/${P1}`, S[s])).json;
    const [gT1, gT4] = [await g(T1), await g(T4)];
    const pl = async (s: number) => (await call("GET", `/api/patients/${PA}/physio-plans`, S[s])).json?.plans?.find((p: any) => p.id === P1)?.canExecute;
    same("E.15 **«تنفيذ جلسة»** بحكم الأجزاء: لعلي نعم ولمريم لا — في الخطّة وملفّ المريض وسجلّ الجلسات",
      [gT1?.canExecute, gT4?.canExecute, gT1?.assignment?.verdicts?.devices?.ok, gT1?.assignment?.verdicts?.exercises?.ok, await pl(T1), await pl(T4),
        (await call("GET", `/api/physio/plans/${P1}/sessions`, S[T4])).json?.canExecute, gT1?.assignment?.myUnseen, (await g(T3))?.assignment?.myUnseen],
      [true, false, true, false, true, false, false, [], ["exercises"]]);
    //  جلسةُ الأمس بالأجهزة وحدها ⟵ «لم يُسجَّل جزءُ التمارين» في الاختلافات.
    const ey = await run(P1, S[T1], { parts: ["devices"], items: items(p1Dev), planVersion: v1, date: yesterday });
    const dvs = (await call("GET", `/api/physio/deviations`, S[SPEC])).json?.sessions?.find((x: any) => x.id === ey.json?.id);
    same("E.12 **جزءٌ لم يُسجَّل من جلسة الأمس** في «اختلافات التنفيذ»", [ey.status, dvs?.differences?.filter((x: any) => x.kind === "missing_part").map((x: any) => x.nameAr)],
      [200, ["لم يُسجَّل جزءُ «التمارين»"]]);
    same("E.11ب **الإكمالُ بلا بندٍ منفّذ مقبول** (المريضُ رفض التمارين) — وجلسةُ الأمس تُكمَل بتاريخها", (await run(P1, S[T3], { parts: ["exercises"], sessionId: ey.json?.id,
      items: items({ exercise: { done: false, note: "رفض المريض" } }), exercises: [], planVersion: v1 })).status, 200);
    same("E.11ج ثمّ لا ناقص", ((await call("GET", `/api/physio/deviations`, S[SPEC])).json?.sessions?.find((x: any) => x.id === ey.json?.id)?.differences ?? [])
      .filter((x: any) => x.kind === "missing_part").length, 0);

    //  مسابقةُ الفتح: طلبان معاً على خطّةٍ بجزأين ⟵ واحدٌ يفتح والآخر ٤٠٩.
    v2 = await execV(P2);
    const race = await Promise.all([1, 2].map(() => run(P2, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: v2 })));
    same("E.3ج **فتحان متزامنان** ⟵ واحدٌ ٢٠٠ والآخرُ ٤٠٩", race.map((r) => r.status).sort(), [200, 409]);
    const openP2 = race.find((r) => r.status === 200)!.json;

    console.log("\n── ج٢. الإلغاءُ والإكمال ──");
    const cancelOpen = await call("POST", `/api/physio/sessions/${openP2.id}/cancel`, S[SUP], { reason: "سُجّلت خطأً" });
    same("E.21 **الإلغاءُ ثمّ الإكمال** ⟵ ٤٠٩ «أُلغيت»", [cancelOpen.status, (await run(P2, S[T3], { parts: ["exercises"], sessionId: openP2.id, items: items({ exercise: { done: true } }),
      exercises: exs([EX[0], EX[1]]), planVersion: v2 })).json?.code], [200, "session_cancelled"]);
    const before21 = await countsOf("morning");
    const o21 = await run(P2, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: v2 });
    await run(P2, S[T3], { parts: ["exercises"], sessionId: o21.json?.id, items: items({ exercise: { done: true } }), exercises: exs([EX[2]]), planVersion: v2 });
    await call("POST", `/api/physio/sessions/${o21.json?.id}/cancel`, S[SUP], { reason: "خطأ" });
    same("E.21ب والإكمالُ ثمّ الإلغاء ⟵ كلُّ عدّادٍ يعود", [(await countsOf("morning"))[dev.electro], (await countsOf("morning"))[dev.exercise]],
      [before21[dev.electro], before21[dev.exercise]]);

    console.log("\n── ج٣. الأجزاءُ والنسخ ──");
    //  خطّةٌ بالأجهزة والتمارين معاً لشخصٍ واحد.
    await assign(PVER, S[SUP], { devices: T2, exercises: T2 });
    let vv = await execV(PVER);
    const e14 = await run(PVER, S[T2], { items: items({ electro: { done: true }, exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: vv });
    same("E.14 **مُسنَدٌ واحد للجزأين** ⟵ حفظٌ واحد بصفّين", [e14.status, (await q(`SELECT count(*) FROM physio_plan_session_parts WHERE session_id = $1`, [e14.json?.id]))[0].count], [200, "2"]);
    await assign(PVER, S[SUP], { exercises: T3, reason: "تقسيم" });
    const eo = await run(PVER, S[T2], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: vv });
    //  المشرفُ يكتب النسخة ٢: يضيف التيكار ويزيل تمرينَ المرحلة الثانية.
    const writeV = async (planId: number, fn: (s: any) => void, how: "direct_edit" = "direct_edit") => db.transaction(async (tx) => {
      const plan = ((await tx.execute((await import("drizzle-orm")).sql`SELECT * FROM physio_plans WHERE id = ${planId} FOR UPDATE`)) as any).rows[0];
      await versions.ensureVersionOneTx(tx, plan, { userId: SUP, name: "سليم" });
      const cur = (await versions.currentVersionTx(tx, plan))!;
      const s = JSON.parse(JSON.stringify(cur.snapshot)); fn(s);
      const P = versions._private as any;
      await P.writeVersionTx(tx, plan, s, P.proofOf({ snapshot: s }, "direct_edit"), { version: cur.version + 1, how, reason: "اختبار", gateLog: [], actor: { userId: SUP, name: "سليم" } });
      await P.notifyVersionedTx(tx, plan, cur.version + 1, how, "اختبار", { userId: SUP, name: "سليم" });
      return cur.version + 1;
    });
    const lbl = (await versions.deviceLabels(db)).get("tecar")!;
    const newV = await writeV(PVER, (s) => { s.devices.push({ ...s.devices[0], deviceCode: "tecar", nameAr: lbl.nameAr, nameEn: lbl.nameEn, btl: null }); s.phases[1].exercises = []; });
    const e17a = await run(PVER, S[T3], { parts: ["exercises"], sessionId: eo.json?.id, items: items({ exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: vv });
    const e17b = await run(PVER, S[T3], { parts: ["exercises"], sessionId: eo.json?.id, items: items({ exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: newV });
    same("E.17 **نسخةٌ جديدة بين الجزأين**: الإكمالُ بالقديمة ⟵ ٤٠٩، وبالجديدة يُختم جزؤه بها والجلسةُ بنسخة فاتحها",
      [newV, e17a.json?.code, e17b.status, (await q(`SELECT plan_version FROM physio_plan_session_parts WHERE session_id = $1 AND part = 'exercises'`, [eo.json?.id]))[0]?.plan_version,
        (await q(`SELECT plan_version FROM physio_plan_sessions WHERE id = $1`, [eo.json?.id]))[0]?.plan_version], [2, "plan_version_changed", 200, 2, vv]);
    //  النسخةُ ٣ تزيل جزءَ التمارين كلَّه بعد أن فُتحت جلسةٌ بالأجهزة.
    const eo3 = await run(PVER, S[T2], { parts: ["devices"], items: items({ electro: { done: true }, tecar: { done: true } }), planVersion: newV });
    const sub19 = (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T4, reason: "دورة", planId: PVER, part: "exercises", dateFrom: dayOff(6), dateTo: dayOff(6) })).json?.substitution;
    ob = await lastOutbox();
    const v3 = await writeV(PVER, (s) => { s.devices = s.devices.filter((d: any) => d.deviceCode !== "exercise"); for (const ph of s.phases) ph.exercises = []; });
    same("E.19 **نسخةٌ تزيل جزءاً**: الجلسةُ لا تبقى ناقصة، وإسنادُ الجزء يُسحب بسطر تدقيق",
      [(await q(`SELECT opus_parts FROM physio_plans WHERE id = $1`, [PVER]))[0].opus_parts, (await call("GET", `/api/physio/plans/${PVER}/sessions`, S[SPEC])).json?.sessions?.find((x: any) => x.id === eo3.json?.id)?.missingParts,
        (await q(`SELECT part FROM physio_plan_part_assignments WHERE plan_id = $1`, [PVER])).map((r) => r.part),
        (await q(`SELECT notes FROM audit_log WHERE entity_id = $1 AND action = 'assign_parts' ORDER BY id DESC LIMIT 1`, [PVER]))[0]?.notes?.includes("أزالت النسخةُ")],
      [["devices"], [], ["devices"], true]);
    same("E.19ج **وبديلُ الجزء المُزال يُلغى ويُبلَّغ صاحبُه** — لا إلغاءَ صامت", [(await q(`SELECT status, lapse_reason FROM physio_plan_substitutions WHERE id = $1`, [sub19?.id]))[0],
      (await outbox("physio_substitute_decided", ob)).some((e) => e.target_user_ids.includes(T3) && /تغيّر الإسناد/.test(e.text))], [{ status: "lapsed", lapse_reason: "تغيّر الإسناد" }, true]);
    const v4 = await writeV(PVER, (s) => { s.phases[0].exercises = [{ ...((s as any).__ex ?? {}), exerciseId: EX[3], nameAr: "x", nameEn: "x", sets: 1, reps: 5, holdSeconds: null, restSeconds: null,
      doseNote: null, doseNoteEn: null, note: null, noteEn: null, card: null }]; });
    same("E.19ب **وإعادتُه في نسخةٍ لاحقة ⟵ بلا إسناد** (لا يعود لمُسنَده القديم)، والمعتمِدون يُنبَّهون، وزينب لا تنفّذه",
      [v4, await assignment.unassignedPartsOf(db, PVER), (await outbox("physio_opus_plan_versioned", ob)).some((e) => /جزءٌ جديد بلا إسناد/.test(e.text) && e.target_user_ids.includes(SUP)),
        (await run(PVER, S[T3], { parts: ["exercises"], items: [], exercises: exs([EX[3]]), planVersion: v4 })).json?.code], [4, ["exercises"], true, "part_unassigned"]);
    //  خطّةٌ بالأجهزة وحدها تكتسب جزءَ التمارين ⟵ «بانتظار الإسناد».
    await assign(PDEV, S[SUP], { devices: T1 });
    const vd = await writeV(PDEV, (s) => { s.phases = [{ position: 1, nameAr: "م", nameEn: "P", sessionFrom: 1, sessionTo: 12, timeframe: null, timeframeEn: null, goals: null, goalsEn: null,
      education: null, educationEn: null, progressCriteria: null, progressCriteriaEn: null, notes: null, notesEn: null,
      exercises: [{ exerciseId: EX[0], nameAr: "x", nameEn: "x", sets: 1, reps: 5, holdSeconds: null, restSeconds: null, doseNote: null, doseNoteEn: null, note: null, noteEn: null, card: null }] }]; });
    same("E.18 **نسخةٌ تضيف جزءاً** ⟵ الأجزاءُ تُكتب و«بانتظار الإسناد» للجديد وحده", [vd, (await q(`SELECT opus_parts FROM physio_plans WHERE id = $1`, [PDEV]))[0].opus_parts,
      await assignment.unassignedPartsOf(db, PDEV)], [2, ["devices", "exercises"], ["exercises"]]);
    //  التمارينُ في المراحل وحدها (بلا سطر «تمارين»).
    await assign(PNX, S[SUP], { devices: T1, exercises: T4 });
    const e20 = await run(PNX, S[T4], { parts: ["exercises"], items: [], exercises: [{ exerciseId: EX[0], done: true, note: null }, { exerciseId: EX[1], done: false, note: "ألم" }],
      planVersion: await execV(PNX) });
    same("E.20ب **جزءُ التمارين بلا سطر جهاز** يفتح الجلسةَ بتمرينٍ منفّذ", [e20.status, e20.json?.phasePosition], [200, 1]);

    console.log("\n── د. البديل ──");
    ob = await lastOutbox();
    same("S.1 **غيرُ المُسنَد لا يطلب بديلاً** لجزءٍ ليس له", [(await call("POST", `/api/physio/substitutes`, S[T1], { planId: P1, part: "exercises", substituteId: T4, reason: "إجازة" })).status,
      (await call("POST", `/api/physio/substitutes`, S[T2], { substituteId: T4, reason: "إجازة", planId: P1 })).status], [403, 403]);
    const s2 = await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T4, reason: "إجازة مرضية" });
    same("S.2 **زينب تطلب مريمَ بديلةً لكلّ خططها اليوم** ⟵ منتظر، وتنبيهٌ واحد للمعتمِدين وسطرُ تدقيق",
      [s2.status, s2.json?.substitution?.status, s2.json?.substitution?.planId, (await outbox("physio_substitute_pending", ob)).length,
        Number((await q(`SELECT count(*) FROM audit_log WHERE action = 'substitute_request' AND new_values::jsonb->>'substitutionId' = $1`, [String(s2.json?.substitution?.id)]))[0].count)],
      [201, "pending", null, 1, 1]);
    const p1v = await execV(P1);
    const t4p1 = () => run(P1, S[T4], { parts: ["exercises"], items: items({ exercise: { done: true } }), exercises: exs([EX[2]]), planVersion: p1v });
    //  جلسةٌ جديدة على P1 اليوم بالأجهزة (لعلي) ثمّ يُكملها البديل.
    const p1open = await run(P1, S[T1], { parts: ["devices"], items: items(p1Dev), planVersion: p1v });
    const t4att = async (sid: number, planId = P1, v = p1v) => run(planId, S[T4], { parts: ["exercises"], sessionId: sid, items: items({ exercise: { done: true } }),
      exercises: exs(await phaseEx(planId, sid)), planVersion: v });
    same("S.3 **قبل الاعتماد لا ينفّذ البديل**", (await t4att(p1open.json?.id)).status, 403);
    same("S.4 طلبٌ مكرّر للنطاق نفسِه ⟵ ٤٠٩", (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T2, reason: "إجازة" })).json?.code, "substitute_pending_exists");
    same("S.5 البديلُ نفسُه أو من فرعٍ آخر أو معطَّل ⟵ ٤٠٠، وليومٍ مضى ⟵ ٤٠٠", [
      (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T3, reason: "إجازة", planId: P2 })).status,
      (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: TX, reason: "إجازة", planId: P2 })).status,
      (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: INACT, reason: "إجازة", planId: P2 })).status,
      (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T4, reason: "إجازة", planId: P2, dateFrom: yesterday, dateTo: today })).status], [400, 400, 400, 400]);
    same("S.6 **السحب**: لغير صاحبه ⟵ ٤٠٣، ولصاحبه ⟵ ٢٠٠، وثانيةً ⟵ ٤٠٩", [(await call("POST", `/api/physio/substitutes/${s2.json?.substitution?.id}/withdraw`, S[T1])).status,
      (await call("POST", `/api/physio/substitutes/${s2.json?.substitution?.id}/withdraw`, S[T3])).status,
      (await call("POST", `/api/physio/substitutes/${s2.json?.substitution?.id}/withdraw`, S[T3])).json?.code], [403, 200, "not_pending"]);
    const s7 = (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T4, reason: "إجازة مرضية" })).json?.substitution;
    ob = await lastOutbox();
    same("S.7 **الرفضُ بملاحظة** ويصل صاحبَ الطلب، والبديلُ يبقى ممنوعاً", [(await call("POST", `/api/physio/substitutes/${s7.id}/decide`, S[SUP], { decision: "reject" })).json?.code,
      (await call("POST", `/api/physio/substitutes/${s7.id}/decide`, S[SUP], { decision: "reject", note: "مريم مشغولة" })).json?.substitution?.status,
      (await outbox("physio_substitute_decided", ob)).map((e) => e.target_user_ids.includes(T3)), (await t4att(p1open.json?.id)).status],
      ["note_required", "rejected", [true], 403]);
    const s8 = (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T4, reason: "إجازة مرضية" })).json?.substitution;
    same("S.14 الطابورُ للمعتمِد وحده", [(await call("GET", `/api/physio/substitutes?view=pending`, S[SUP])).json?.rows?.some((r: any) => r.id === s8.id && r.coveredPlans === 3),
      (await call("GET", `/api/physio/substitutes?view=pending`, S[T3])).status, (await call("GET", `/api/physio/red-flag-reviews/pending-count`, S[SUP])).json?.substitutes], [true, 403, 1]);
    ob = await lastOutbox();
    same("S.8 **الأخصائيُّ لا يقرّر، والمشرفُ يعتمد** — فتسجّل مريمُ تمارينَ الخطّتين بصفة البديل، وزينبُ تبقى تستطيع",
      [(await call("POST", `/api/physio/substitutes/${s8.id}/decide`, S[SPEC], { decision: "approve" })).status,
        (await call("POST", `/api/physio/substitutes/${s8.id}/decide`, S[SUP], { decision: "approve" })).json?.substitution?.effectiveFrom,
        (await outbox("physio_substitute_decided", ob)).map((e) => [e.target_user_ids.includes(T3), e.target_user_ids.includes(T4)])],
      [403, today, [[true, true]]]);
    const s8a = await t4att(p1open.json?.id);
    const p2v = await execV(P2);
    const p2o = await run(P2, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: p2v });
    const s8b = await t4att(p2o.json?.id, P2, p2v);
    same("S.8ب البديلُ على الخطّتين بصفّه ورقمِ البديل", [s8a.status, s8b.status, (await q(`SELECT via, substitution_id FROM physio_plan_session_parts WHERE session_id = $1 AND part = 'exercises'`, [p1open.json?.id]))
      .map((r) => [r.via, Number(r.substitution_id)])], [200, 200, [["substitute", s8.id]]]);
    const t4today = (await call("GET", `/api/physio/today`, S[T4])).json;
    same("S.8ج «جلسات اليوم» لمريم: «بديلٌ عن زينب» وطلبُها في شريطها", [t4today?.plans?.find((p: any) => p.planId === P1)?.substituteFor?.map((x: any) => x.assigneeName),
      t4today?.mySubstitutions?.some((x: any) => x.id === s8.id && x.unseen)], [["زينب"], true]);
    await call("POST", `/api/physio/substitutes/seen`, S[T4], { ids: [s8.id] });
    same("S.8د و«رأيتُه» يُطفئ الجديد", (await call("GET", `/api/physio/today`, S[T4])).json?.mySubstitutions?.find((x: any) => x.id === s8.id)?.unseen, false);
    const p1o2 = await run(P1, S[T1], { parts: ["devices"], items: items(p1Dev), planVersion: p1v });
    same("S.9 **جلسةُ الأمس بيد البديل** ⟵ ٤٠٣ (البديلُ من يوم اعتماده)", (await run(P1, S[T4], { parts: ["exercises"], items: items({ exercise: { done: true } }),
      exercises: exs([EX[2]]), planVersion: p1v, date: yesterday })).status, 403);
    //  البديلُ لعلي يُعتمد غداً ⟵ لا ينفّذ اليوم.
    const s10 = (await call("POST", `/api/physio/substitutes`, S[T1], { substituteId: T2, reason: "سفر", planId: P1, part: "devices", dateFrom: today, dateTo: dayOff(3) })).json?.substitution;
    assignment.setAssignmentClockForTests(() => Date.now() + 86_400_000);
    const d10 = await call("POST", `/api/physio/substitutes/${s10.id}/decide`, S[SUP], { decision: "approve" });
    assignment.setAssignmentClockForTests(null);
    same("S.10 **اعتمادٌ في الغد** ⟵ يبدأ من الغد، وحسن لا يسجّل اليوم", [d10.json?.substitution?.effectiveFrom,
      (await run(P1, S[T2], { parts: ["devices"], items: items(p1Dev), planVersion: p1v })).status], [dayOff(1), 403]);
    same("S.13 **بديلٌ معتمَد يغطّي الأيّامَ نفسَها** ⟵ ٤٠٩ للطلب الجديد", (await call("POST", `/api/physio/substitutes`, S[T1], { substituteId: T4, reason: "سفر", planId: P1, part: "devices",
      dateFrom: dayOff(2), dateTo: dayOff(2) })).json?.code, "substitute_overlap");
    same("S.16 **الإنهاءُ المبكّر**: البديلُ لا ينهيه، وبلا سبب ⟵ ٤٠٠، وبسببٍ ⟵ أُنهي وصاحبُه مسجَّل", [(await call("POST", `/api/physio/substitutes/${s10.id}/end`, S[T2], { reason: "x" })).status,
      (await call("POST", `/api/physio/substitutes/${s10.id}/end`, S[SUP], {})).json?.code,
      await (async () => { const r = (await call("POST", `/api/physio/substitutes/${s10.id}/end`, S[T1], { reason: "ألغيتُ السفر" })).json?.substitution; return [r?.status, r?.lapsedBy, r?.lapseReason]; })()],
      [403, "reason_required", ["lapsed", T1, "ألغيتُ السفر"]]);
    //  إعادةُ إسناد تمارين P1 من زينب إلى حسن ⟵ مريمُ لا تُكمل P1، وتبقى على P2.
    await assign(P1, S[SUP], { exercises: T2, reason: "إعادة توزيع" });
    const p2o2 = await run(P2, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: p2v });
    same("S.11 **تغيّر الإسناد في خطّة** ⟵ البديلُ لا يغطّيها ويبقى على الأخرى", [(await t4att(p1o2.json?.id)).status, (await t4att(p2o2.json?.id, P2, p2v)).status,
      (await q(`SELECT status FROM physio_plan_substitutions WHERE id = $1`, [s8.id]))[0].status], [403, 200, "approved"]);
    await assign(P2, S[SUP], { exercises: T2, reason: "إعادة توزيع" });
    same("S.11ج وما دام يحمل خطّةً ثالثة يبقى", (await q(`SELECT status FROM physio_plan_substitutions WHERE id = $1`, [s8.id]))[0].status, "approved");
    await assign(PTW, S[SUP], { exercises: T2, reason: "إعادة توزيع" });
    same("S.11ب وفي الأخرى أيضاً ⟵ «أُلغي تلقائياً — تغيّر الإسناد»", (await q(`SELECT status, lapse_reason FROM physio_plan_substitutions WHERE id = $1`, [s8.id]))[0],
      { status: "lapsed", lapse_reason: "تغيّر الإسناد" });
    //  طلبٌ مضى أجلُه (يُكتب في القاعدة بتاريخٍ مضى).
    const exp = (await q(`INSERT INTO physio_plan_substitutions (assignee_id, substitute_id, requested_by, plan_id, part, date_from, date_to, reason)
        VALUES ($1, $2, $1, $3, 'devices', $4, $4, 'إجازة قديمة') RETURNING id`, [T1, T4, P2, yesterday]))[0].id;
    same("S.12 **انتهى أجلُه** ⟵ لا يُعدّ، والقرارُ ٤٠٩ ويُلغى تلقائياً، ثمّ طلبٌ جديد يمرّ", [(await call("GET", `/api/physio/red-flag-reviews/pending-count`, S[SUP])).json?.substitutes,
      (await call("POST", `/api/physio/substitutes/${exp}/decide`, S[SUP], { decision: "approve" })).json?.code,
      (await q(`SELECT status, lapse_reason FROM physio_plan_substitutions WHERE id = $1`, [exp]))[0],
      (await call("POST", `/api/physio/substitutes`, S[T1], { substituteId: T4, reason: "إجازة", planId: P2, part: "devices" })).status],
      [0, "substitute_expired", { status: "lapsed", lapse_reason: "انتهى أجلُه" }, 201]);
    ob = await lastOutbox();
    const s15 = await call("POST", `/api/physio/substitutes`, S[SUP], { assigneeId: T2, substituteId: T4, reason: "حسن في دورة", planId: P1 });
    same("S.15 **المعتمِدُ يُنشئه نيابةً عن حسن** ⟵ معتمَدٌ حين يُنشأ، بلا تنبيه انتظار، والقرارُ لحسن ولمريم، وسطرا تدقيق",
      [s15.status, s15.json?.substitution?.status, (await outbox("physio_substitute_pending", ob)).length,
        (await outbox("physio_substitute_decided", ob)).map((e) => [...e.target_user_ids].sort()), Number((await q(`SELECT count(*) FROM audit_log WHERE action IN ('substitute_request','substitute_decide')
          AND new_values::jsonb->>'substitutionId' = $1`, [String(s15.json?.substitution?.id)]))[0].count)],
      [201, "approved", 0, [[T2, T4].sort()], 2]);
    const s19 = await call("GET", `/api/physio/substitute-candidates?planId=${P1}&part=devices`, S[T1]);
    same("S.19 **تنبيهُ الإبر في المرشّحين**: النطاقُ فيه إبر ومريم لا تحملها، ومعالجُ الفرع الآخر ليس فيهم",
      [s19.json?.needleInScope, s19.json?.candidates?.find((c: any) => c.id === T4)?.canDryNeedle, s19.json?.candidates?.some((c: any) => c.id === TX),
        (await call("GET", `/api/physio/substitute-candidates?assigneeId=${T3}`, S[T1])).status], [true, false, false, 403]);
    //  زينب فقدت كلَّ أجزائها (بالقاعدة) ⟵ القرارُ ٤٠٩ «تغيّر الإسناد» ويُلغى؛ وطلبُها الجديد ٤٠٣.
    await assign(PTW, S[SUP], { exercises: T3, reason: "عادت زينب" });
    const s18r = await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T4, reason: "إجازة", planId: PTW });
    if (s18r.status !== 201) console.log("      s18:", JSON.stringify(s18r));
    const s18 = s18r.json?.substitution;
    await q(`DELETE FROM physio_plan_part_assignments WHERE user_id = $1`, [T3]);
    same("S.18 **القرارُ بعد أن فقد المُسنَدُ أجزاءَه** ⟵ ٤٠٩ ويُلغى ويُلتزم، وطلبٌ منه بعدها ⟵ ٤٠٣", [(await call("POST", `/api/physio/substitutes/${s18?.id}/decide`, S[SUP], { decision: "approve" })).json?.code,
      (await q(`SELECT status FROM physio_plan_substitutions WHERE id = $1`, [s18?.id]))[0]?.status,
      (await call("POST", `/api/physio/substitutes`, S[T3], { substituteId: T4, reason: "إجازة" })).status], ["assignment_changed", "lapsed", 403]);
    await assign(PTW, S[SUP], { exercises: T3 });
    await q(`UPDATE system_users SET branch_id = $2, branch_ids = $3::jsonb WHERE id = $1`, [T3, B2, JSON.stringify([B2])]);
    same("S.18ب **مُسنَدٌ انتقل إلى فرعٍ آخر** ⟵ طلبُ المعتمِد نيابةً عنه ٤٠٩", (await call("POST", `/api/physio/substitutes`, S[SUP], { assigneeId: T3, substituteId: T4, reason: "إجازة", planId: PTW })).json?.code,
      "assignee_ineligible");
    await q(`UPDATE system_users SET branch_id = $2, branch_ids = $3::jsonb WHERE id = $1`, [T3, B1, JSON.stringify([B1])]);
    const s17 = (await call("POST", `/api/physio/substitutes`, S[T2], { substituteId: T1, reason: "دورة", planId: P1, part: "exercises", dateFrom: dayOff(1), dateTo: dayOff(2) })).json?.substitution;
    const wide = (await call("POST", `/api/physio/substitutes`, S[T2], { substituteId: T4, reason: "إجازة", dateFrom: dayOff(5), dateTo: dayOff(5) })).json?.substitution;

    console.log("\n── هـ. قرارُ المالك D — الإيقافُ والتخرّج ──");
    const stop = (planId: number, s: number) => call("POST", `/api/physio/plans/${planId}/stop`, S[s], { reason: "تحسّن" });
    same("S.17 **إيقافُ الخطّة يُلغي بدائلَها** «أُغلقت الخطّة» — وبديلُ «كلّ خططه» لا يُمسّ", await (async () => {
      const r = await stop(P1, SPEC);
      return [r.status, (await q(`SELECT status, lapse_reason FROM physio_plan_substitutions WHERE id = $1`, [s17.id]))[0], (await q(`SELECT status FROM physio_plan_substitutions WHERE id = $1`, [s15.json?.substitution?.id]))[0].status,
        (await q(`SELECT status FROM physio_plan_substitutions WHERE id = $1`, [wide.id]))[0].status]; })(),
      [200, { status: "lapsed", lapse_reason: "أُغلقت الخطّة" }, "lapsed", "pending"]);
    const mk = async (label: string) => { const id = await mkPlan(await mkPatient(label), label, ["electro"], []); return id; };
    const [PX, PY, PZ] = [await mk("إيقاف ١"), await mk("إيقاف ٢"), await mk("إيقاف ٣")];
    same("D.1 **يوقف خطّةَ Bionic AI الأخصائيُّ والمشرفُ والأخصائيُّ بدورٍ إضافيّ** — لا المعالجُ ولا التقنيّ ولا المدرّبُ ولا الطبيبُ ولا المدير",
      [...await Promise.all([T1, T2, T3, DOC, BM].map(async (u) => { const r = await stop(PX, u); return r.status === 404 ? 404 : r.status; })),
        (await stop(PX, SPEC)).status, (await stop(PY, SUP)).status, (await stop(PZ, SPECX)).status], [403, 403, 403, 403, 403, 200, 200, 200]);
    const PX2 = await mk("إيقاف ٤");
    same("D.1ب ونصُّ الرفض بالاسم الظاهر لا «Opus»", await (async () => { const r = await stop(PX2, T1); return [r.json?.code, /Opus/.test(r.json?.error ?? ""), /أخصائيُّ العلاج الطبيعي/.test(r.json?.error ?? "")]; })(),
      ["close_forbidden", false, true]);
    const PQ = await mk("تخرّج");
    const assessBody = (decision: string) => ({ decision, pain: 2, notes: "سبب", assessedOn: today });
    same("D.2 **التخرّجُ والإيقافُ من التقييم** للمعالج والتقنيّ ⟵ ٤٠٣، وللأخصائيّ ⟵ تخرّج، و«استمرار» كما كان",
      [(await call("POST", `/api/physio/plans/${PQ}/assessments`, S[T1], assessBody("discharge"))).status, (await call("POST", `/api/physio/plans/${PQ}/assessments`, S[T2], assessBody("stop"))).status,
        (await call("POST", `/api/physio/plans/${PQ}/assessments`, S[SPEC], assessBody("continue"))).status,
        (await call("POST", `/api/physio/plans/${PQ}/assessments`, S[SPEC], assessBody("discharge"))).json?.planStatus], [403, 403, 200, "graduated"]);
    const PR = await mk("زرّ الإيقاف");
    same("D.3 **«canClose»** في الخطّة والتقييمات: للأخصائيّ نعم وللمعالج لا", [(await call("GET", `/api/physio/plans/${PR}`, S[SPEC])).json?.canClose,
      (await call("GET", `/api/physio/plans/${PR}`, S[T1])).json?.canClose, (await call("GET", `/api/physio/plans/${PR}/assessments`, S[SPEC])).json?.canClose,
      (await call("GET", `/api/physio/plans/${PR}/assessments`, S[T1])).json?.canClose], [true, false, true, false]);
    const PM2 = await mkPlan(await mkPatient("يدوية للإيقاف"), "يدوية", ["electro"], [], { origin: "manual" });
    same("D.4 **اليدويةُ بقاعدتها**: الأخصائيّ ⟵ ٢٠٠ والمعالج ⟵ ٤٠٣", [(await stop(PM2, T1)).status, (await stop(PM2, SPEC)).status], [403, 200]);
    same("D.5 **والحارسُ تحت القفل** (`recordAssessment` بلا «canClose») ⟵ ٤٠٣", await assess.recordAssessment(PR, assessBody("stop"), { userId: T1, name: "علي" }, { canClose: false })
      .then(() => "ok", (e: any) => `${e.status}:${e.code}`), "403:close_forbidden");

    console.log("\n── و. الإنجاز ──");
    //  جلسةٌ بجزأين أمس: علي الأجهزة وحسن التمارين.
    const gs = p2o.json?.id;
    await q(`UPDATE physio_plan_session_parts SET recorded_at = now() - interval '1 day' WHERE session_id = $1`, [gs]);
    await q(`UPDATE physio_plan_sessions SET created_at = now() - interval '1 day' WHERE id = $1`, [gs]);
    const partsG = (await q(`SELECT part, recorded_by FROM physio_plan_session_parts WHERE session_id = $1`, [gs])).map((r) => [r.part, Number(r.recorded_by)]);
    const statOf = async (u: number) => (await loadDayStats(u, ["physioSessions"] as any, yesterday)).physioSessions;
    same("G.1 **تحيّةُ الصباح**: جلسةُ الجزأين تُعدّ لكلٍّ من مسجّليها مرّة", [partsG.length, await statOf(Number(partsG[0][1])), await statOf(Number(partsG[1][1]))], [2, 1, 1]);
    const sum = await loadTodaySummary({ day: today, branchId: B1, withMoney: false });
    const evs: string[] = JSON.stringify(sum).match(/جزءُ «(الأجهزة|التمارين)»/g) ?? [];
    same("G.2 **ملخّصُ اليوم**: حدثٌ لكلّ جزء", [evs.includes("جزءُ «الأجهزة»"), evs.includes("جزءُ «التمارين»")], [true, true]);

    console.log("\n── ح. إصلاحاتُ المراجعة ──");
    //  R.1 — **ترتيبُ الأقفال الواحد**: قرارُ البديل لا يمسك صفَّه ولا قفلَ مُسنَده وهو ينتظر الخطّة (كان يعاكس الإيقافَ والإسناد ⟵ جمودٌ يُردّ ٥٠٠).
    const probeFree = async (subId: number | null, assigneeId: number) => {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        let row = true;
        if (subId != null) { try { await c.query(`SELECT id FROM physio_plan_substitutions WHERE id = $1 FOR UPDATE NOWAIT`, [subId]); } catch { row = false; await c.query("ROLLBACK"); await c.query("BEGIN"); } }
        const adv = (await c.query(`SELECT pg_try_advisory_xact_lock(hashtext($1)) AS ok`, [`physio_sub:${assigneeId}`])).rows[0].ok === true;
        return [row, adv];
      } finally { await c.query("ROLLBACK"); c.release(); }
    };
    const holdPlan = async (planId: number) => { const c = await pool.connect(); await c.query("BEGIN"); await c.query(`SELECT id FROM physio_plans WHERE id = $1 FOR UPDATE`, [planId]); return c; };
    const PL1 = await mkPlan(await mkPatient("ترتيب الأقفال"), "قفل", ["electro", "exercise"]);
    await assign(PL1, S[SUP], { devices: T1, exercises: T4 });
    const rq1 = (await call("POST", `/api/physio/substitutes`, S[T4], { substituteId: T2, reason: "غياب", planId: PL1 })).json?.substitution;
    let hold = await holdPlan(PL1);
    const decP = call("POST", `/api/physio/substitutes/${rq1?.id}/decide`, S[SUP], { decision: "approve" });
    await new Promise((r) => setTimeout(r, 500));
    const freeDec = await probeFree(rq1?.id ?? null, T4);
    await hold.query("COMMIT"); hold.release();
    same("R.1 **القرارُ ينتظر الخطّةَ قبل صفّه وقفلِ مُسنَده** — ثمّ يمرّ", [...freeDec, (await decP).status], [true, true, 200]);
    hold = await holdPlan(PL1);
    const reqP = call("POST", `/api/physio/substitutes`, S[T1], { substituteId: T2, reason: "غياب", planId: PL1, part: "devices", dateFrom: dayOff(3), dateTo: dayOff(3) });
    await new Promise((r) => setTimeout(r, 500));
    const freeReq = await probeFree(null, T1);
    await hold.query("COMMIT"); hold.release();
    same("R.2 **وطلبُ البديل لخطّة** يأخذ الخطّةَ قبل قفل المُسنَد", [freeReq[1], (await reqP).status], [true, 201]);

    //  R.13 — **سحبُ مُسنَدٍ ينتظر قفلَ بدائله**: فطلبُ «كلّ خططي» المتزامن إمّا يُرى فيُلغى، وإمّا يُردّ — لا طلبَ معلَّقٌ بلا إسناد.
    const advHold = await pool.connect();
    await advHold.query("BEGIN"); await advHold.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`physio_sub:${T1}`]);
    let doneEarly = false;
    const asgP = assign(PL1, S[SUP], { devices: T2, reason: "إعادة توزيع" }).then((r) => { doneEarly = true; return r; });
    await new Promise((r) => setTimeout(r, 500));
    const waited = !doneEarly;
    await advHold.query("COMMIT"); advHold.release();
    same("R.13 **سحبُ المُسنَد ينتظر قفلَ بدائله** ثمّ يمرّ", [waited, (await asgP).status], [true, 200]);

    //  R.3 — بديلُ «كلّ خططه» لا يغطّي خطّةً أُسندت بعد اعتماده.
    const PL2 = await mkPlan(await mkPatient("قبل الاعتماد"), "قبل", ["electro"], []);
    await assign(PL2, S[SUP], { devices: T5 });
    const wide5 = await call("POST", `/api/physio/substitutes`, S[SUP], { assigneeId: T5, substituteId: T2, reason: "إجازة" });
    await new Promise((r) => setTimeout(r, 30));
    const PL3 = await mkPlan(await mkPatient("بعد الاعتماد"), "بعد", ["electro"], []);
    await assign(PL3, S[SUP], { devices: T5 });
    same("R.3 **بديلُ «كلّ خططه» لما أُسند حين اعتُمد** — الخطّةُ التي أُسندت بعده ⟵ ٤٠٣", [wide5.json?.substitution?.status,
      (await run(PL2, S[T2], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: await execV(PL2) })).status,
      (await run(PL3, S[T2], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: await execV(PL3) })).json?.code], ["approved", 200, "part_not_yours"]);

    //  R.4 — سببُ تغيير الإسناد للمعتمِد وللمُسنَد وحدهما.
    await assign(PL1, S[SUP], { exercises: T3, reason: "سببٌ خاصّ بالإدارة" });
    const reasonFor = async (u: number) => (await call("GET", `/api/physio/plans/${PL1}`, S[u])).json?.assignment?.parts?.find((p: any) => p.part === "exercises")?.reason ?? null;
    same("R.4 **سببُ تغيير الإسناد** للمعتمِد وللمُسنَد الجديد — لا لزميلٍ يحمل الجزءَ الآخر ولا للأخصائيّ", [await reasonFor(SUP), await reasonFor(T3), await reasonFor(T1), await reasonFor(SPEC)],
      ["سببٌ خاصّ بالإدارة", "سببٌ خاصّ بالإدارة", null, null]);

    //  R.5 — المنفّذون القدامى الذين أُسقطوا في أوّل إسناد يُكتبون في التدقيق.
    const PL4 = await mkPlan(await mkPatient("منفّذٌ قديم"), "قديم", ["electro"], []);
    await q(`INSERT INTO physio_plan_assignees (plan_id, user_id) VALUES ($1, $2)`, [PL4, T4]);
    await assign(PL4, S[SUP], { devices: T1 });
    same("R.5 **أوّلُ إسناد يُسقط المنفّذين القدامى بأسمائهم في التدقيق**", JSON.parse((await q(`SELECT old_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1
        AND action = 'assign_parts' ORDER BY id DESC LIMIT 1`, [PL4]))[0]?.old_values ?? "{}").legacyAssigneesRemoved, [T4]);

    //  R.6 — ملاحظةُ المُكمِل للأخصائيّ تظهر في الجلسة و«ما اختلف عن الخطّة».
    const PL5 = await mkPlan(await mkPatient("ملاحظة المكمل"), "ملاحظة", ["electro", "exercise"]);
    await assign(PL5, S[SUP], { devices: T1, exercises: T4 });
    const v5 = await execV(PL5);
    const o5 = await run(PL5, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: v5 });
    const a5 = await run(PL5, S[T4], { parts: ["exercises"], sessionId: o5.json?.id, items: items({ exercise: { done: true } }), exercises: exs(await phaseEx(PL5, o5.json?.id)),
      planVersion: v5, noteToSpecialist: "يشكو ألماً في الركبة" });
    const note5 = (await q(`SELECT note_to_specialist FROM physio_plan_sessions WHERE id = $1`, [o5.json?.id]))[0]?.note_to_specialist ?? "";
    const dev5 = (await call("GET", `/api/physio/deviations`, S[SPEC])).json?.sessions?.find((x: any) => x.id === o5.json?.id);
    same("R.6 **ملاحظةُ المُكمِل** في ملاحظة الجلسة باسمه، فتظهر في «ما اختلف عن الخطّة»", [a5.status, note5, Boolean(dev5 && /يشكو ألماً/.test(dev5.noteToSpecialist ?? ""))],
      [200, "مريم: يشكو ألماً في الركبة", true]);

    //  R.7 — إكمالُ جلسةٍ حُذفت زيارتُها ⟵ ٤٠٩.
    const PL6 = await mkPlan(await mkPatient("زيارة محذوفة"), "زيارة", ["electro", "exercise"]);
    await assign(PL6, S[SUP], { devices: T1, exercises: T4 });
    const v6 = await execV(PL6);
    const o6 = await run(PL6, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: v6 });
    await q(`UPDATE visits SET deleted_at = now() WHERE id = (SELECT visit_id FROM physio_plan_sessions WHERE id = $1)`, [o6.json?.id]);
    const before6 = (await countsOf("morning"))[dev.exercise] ?? 0;
    const a6 = await run(PL6, S[T4], { parts: ["exercises"], sessionId: o6.json?.id, items: items({ exercise: { done: true } }), exercises: exs(await phaseEx(PL6, o6.json?.id)), planVersion: v6 });
    same("R.7 **زيارةُ الجلسة محذوفة** ⟵ الإكمالُ ٤٠٩ ولا يتحرّك عدّاد", [a6.status, a6.json?.code, (await countsOf("morning"))[dev.exercise] ?? 0], [409, "session_visit_deleted", before6]);

    //  R.8 — القراءةُ لا تكتب: المنتهي أجلُه يُعرض «انتهى أجلُه» ويبقى في القاعدة كما هو حتى أوّل كتابة.
    const exp8 = Number((await q(`INSERT INTO physio_plan_substitutions (assignee_id, assignee_name, substitute_id, substitute_name, requested_by, plan_id, part, date_from, date_to, reason)
        VALUES ($1, 'نور', $2, 'حسن', $1, $3, 'devices', $4, $4, 'إجازة أمس') RETURNING id`, [T5, T2, PL2, yesterday]))[0].id);
    const dec8 = (await call("GET", `/api/physio/substitutes?view=decided`, S[SUP])).json?.rows?.find((r: any) => r.id === exp8);
    const my8 = (await call("GET", `/api/physio/today`, S[T5])).json?.mySubstitutions?.find((r: any) => r.id === exp8);
    same("R.8 **المنتهي أجلُه** في «المحسومة» وفي شريط صاحبه «أُلغي — انتهى أجلُه» جديداً، والقراءةُ لم تكتب", [dec8?.status, dec8?.lapseReason, my8?.status, my8?.unseen,
      (await q(`SELECT status FROM physio_plan_substitutions WHERE id = $1`, [exp8]))[0].status,
      Number((await q(`SELECT count(*) FROM audit_log WHERE action = 'substitute_lapse' AND new_values::jsonb->>'substitutionId' = $1`, [String(exp8)]))[0].count)],
      ["lapsed", "انتهى أجلُه", "lapsed", true, "pending", 0]);
    const seen8 = await call("POST", `/api/physio/substitutes/seen`, S[T5], { ids: [exp8] });
    same("R.9 **«رآه» بسطر تدقيق** ويُطفئ الجديد", [seen8.json?.marked, Number((await q(`SELECT count(*) FROM audit_log WHERE action = 'substitute_seen'
        AND new_values::jsonb->>'substitutionId' = $1`, [String(exp8)]))[0].count), (await call("GET", `/api/physio/today`, S[T5])).json?.mySubstitutions?.find((r: any) => r.id === exp8)?.unseen],
      [1, 1, false]);

    //  R.10 — إيقافُ الخطّة يُبلغ مَن أُلغي بديلُه.
    const PL7 = await mkPlan(await mkPatient("إيقاف مع بديل"), "إيقاف", ["electro"], []);
    await assign(PL7, S[SUP], { devices: T1 });
    const sub7 = (await call("POST", `/api/physio/substitutes`, S[SUP], { assigneeId: T1, substituteId: T2, reason: "غياب", planId: PL7, dateFrom: dayOff(4), dateTo: dayOff(4) })).json?.substitution;
    ob = await lastOutbox();
    await call("POST", `/api/physio/plans/${PL7}/stop`, S[SPEC], { reason: "تحسّن" });
    same("R.10 **الإيقافُ يُلغي البديلَ ويُبلغ المُسنَدَ والبديلَ وصاحبَ الطلب** — لا إلغاءَ صامت", [(await q(`SELECT status FROM physio_plan_substitutions WHERE id = $1`, [sub7?.id]))[0]?.status,
      (await outbox("physio_substitute_decided", ob)).map((e) => [[...e.target_user_ids].sort(), /أُغلقت الخطّة/.test(e.text)])], ["lapsed", [[[SUP, T1, T2].sort(), true]]]);

    //  R.11 — قرارُ المالك D في فرع الخطّة: أخصائيُّ فرعٍ أُتيح له الملفّ يقرؤها ولا يوقفها.
    const PS = await mkPatient("ملفٌّ مُتاح لفرعٍ آخر");
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1, $2)`, [PS, B2]);
    const PL8 = await mkPlan(PS, "فرعٌ آخر", ["electro"], []);
    const g8 = await call("GET", `/api/physio/plans/${PL8}`, S[SPECB2]);
    same("R.11 **أخصائيُّ الفرع الآخر**: يقرأ الخطّة ولا يوقفها ولا يخرّجها، وأخصائيُّ فرعها نعم", [g8.status, g8.json?.canClose, g8.json?.assignment?.canClose,
      (await call("POST", `/api/physio/plans/${PL8}/stop`, S[SPECB2], { reason: "تحسّن" })).json?.code,
      (await call("POST", `/api/physio/plans/${PL8}/assessments`, S[SPECB2], { decision: "discharge", pain: 1, notes: "س", assessedOn: today })).json?.code,
      (await call("GET", `/api/physio/plans/${PL8}`, S[SPEC])).json?.canClose], [200, false, false, "close_forbidden", "close_forbidden", true]);

    //  R.12 — «بانتظار الإسناد» في قائمة خطط المريض من الأحكام نفسِها.
    const PU = await mkPatient("قائمة المريض");
    const PL9 = await mkPlan(PU, "بلا إسناد", ["electro"], []);
    const PL10 = await mkPlan(PU, "مُسنَدة", ["electro"], []);
    await assign(PL10, S[SUP], { devices: T1 });
    const lst = (await call("GET", `/api/patients/${PU}/physio-plans`, S[SUP])).json?.plans ?? [];
    same("R.12 **قائمةُ خطط المريض للمعتمِد**: «بانتظار الإسناد» للتي لم تُسنَد وحدها", [lst.find((p: any) => p.id === PL9)?.awaitingAssignment, lst.find((p: any) => p.id === PL10)?.awaitingAssignment],
      [true, false]);

    console.log("\n── ز. الحذفُ والدمج ──");
    //  مريضٌ كامل: خطّةٌ مُسنَدة وبدائلُ بكلّ حال وجلسةٌ بجزأين بيد بديل وجلسةٌ ملغاة.
    const PK = await mkPatient("مريض الحذف");
    const PLK = await mkPlan(PK, "حذف", ["electro", "exercise"]);
    await assign(PLK, S[SUP], { devices: T1, exercises: T4 });
    const vk = await execV(PLK);
    const subK = (await call("POST", `/api/physio/substitutes`, S[SUP], { assigneeId: T4, substituteId: T2, reason: "غياب", planId: PLK })).json?.substitution;
    await call("POST", `/api/physio/substitutes`, S[T4], { substituteId: T1, reason: "غياب", planId: PLK, part: "devices", dateFrom: dayOff(10), dateTo: dayOff(10) });
    const ok1 = await run(PLK, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: vk });
    await run(PLK, S[T2], { parts: ["exercises"], sessionId: ok1.json?.id, items: items({ exercise: { done: true } }), exercises: exs([EX[0], EX[1]]), planVersion: vk });
    const ok2 = await run(PLK, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: vk });
    await call("POST", `/api/physio/sessions/${ok2.json?.id}/cancel`, S[SUP], { reason: "خطأ" });
    const wideK = (await call("POST", `/api/physio/substitutes`, S[T4], { substituteId: T2, reason: "إجازة عامّة", dateFrom: dayOff(20), dateTo: dayOff(20) })).json?.substitution;
    same("M.1أ في الحذف بديلٌ بصفّه", (await q(`SELECT count(*) FROM physio_plan_session_parts WHERE substitution_id = $1`, [subK?.id]))[0].count, "1");
    let delErr = "";
    try { await storage.deletePatient(PK); } catch (e: any) { delErr = String(e?.message ?? e); }
    same("M.1 **حذفُ المريض نهائياً يمرّ** — لا يبقى شيءٌ لخطّته، وبديلُ «كلّ خطط» المعالجة يبقى", [delErr,
      Number((await q(`SELECT count(*) FROM physio_plans WHERE id = $1`, [PLK]))[0].count), Number((await q(`SELECT count(*) FROM physio_plan_part_assignments WHERE plan_id = $1`, [PLK]))[0].count),
      Number((await q(`SELECT count(*) FROM physio_plan_substitutions WHERE plan_id = $1`, [PLK]))[0].count),
      Number((await q(`SELECT count(*) FROM physio_plan_session_parts WHERE session_id = ANY($1::int[])`, [[ok1.json?.id, ok2.json?.id]]))[0].count),
      Number((await q(`SELECT count(*) FROM physio_plan_substitutions WHERE id = $1`, [wideK?.id]))[0].count)], ["", 0, 0, 0, 0, 1]);
    //  الدمج: الخطّةُ تنتقل بإسنادها وبدائلها وأجزاء جلساتها.
    const PSRC = await mkPatient("مصدر الدمج"); const PTGT = await mkPatient("هدف الدمج");
    const PLM = await mkPlan(PSRC, "دمج", ["electro", "exercise"]);
    await assign(PLM, S[SUP], { devices: T1, exercises: T4 });
    const om = await run(PLM, S[T1], { parts: ["devices"], items: items({ electro: { done: true } }), planVersion: await execV(PLM) });
    await storage.mergePatients(PSRC, PTGT);
    same("M.2 **الدمج**: الخطّةُ عند الهدف وإسنادُها وأجزاءُ جلستها معها، وفي «جلسات اليوم» لعلي", [(await q(`SELECT patient_id FROM physio_plans WHERE id = $1`, [PLM]))[0].patient_id,
      Number((await q(`SELECT count(*) FROM physio_plan_part_assignments WHERE plan_id = $1`, [PLM]))[0].count), Number((await q(`SELECT count(*) FROM physio_plan_session_parts WHERE session_id = $1`, [om.json?.id]))[0].count),
      (await call("GET", `/api/physio/today`, S[T1])).json?.plans?.find((p: any) => p.planId === PLM)?.patientId], [PTGT, 2, 1, PTGT]);
    const PLD = await mkPlan(await mkPatient("حذف الخطّة"), "حذف خطّة", ["electro", "exercise"]);
    await assign(PLD, S[SUP], { devices: T1, exercises: T4 });
    await call("POST", `/api/physio/substitutes`, S[T4], { substituteId: T2, reason: "غياب", planId: PLD, dateFrom: dayOff(1), dateTo: dayOff(1) });
    same("M.3 **حذفُ الخطّة** (بلا جلسات) يحذف إسنادَها وبدائلَها", [(await call("DELETE", `/api/physio/plans/${PLD}`, S[SUP])).status,
      Number((await q(`SELECT count(*) FROM physio_plan_part_assignments WHERE plan_id = $1`, [PLD]))[0].count), Number((await q(`SELECT count(*) FROM physio_plan_substitutions WHERE plan_id = $1`, [PLD]))[0].count),
      await (async () => { const o = JSON.parse((await q(`SELECT old_values FROM audit_log WHERE entity_id = $1 AND action = 'delete' AND entity_type = 'physio_plan'`, [PLD]))[0]?.old_values ?? "{}");
        return [o.partAssignments?.length, o.substitutions?.map((x: any) => x.status)]; })()],
      [200, 0, 0, [2, ["lapsed"]]]);
  } finally {
    httpServer.close();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّ التأكيدات نجحت");
  await pool.end();
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => { console.error(e); try { await pool.end(); } catch { /* */ } process.exit(1); });
