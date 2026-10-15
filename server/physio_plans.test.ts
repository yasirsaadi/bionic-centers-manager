// خطّةُ العلاج الطبيعي للمريض واعتمادُها (ترحيل ١٠٩، §4.cm — المرحلةُ الثالثة، ٢٠٢٦-١٠-٠٧).
// `npm run test:physio-plans` — على النقاط الحقيقية بتطبيق Express الحقيقيّ.
//
// يحرس: (أ) مَن يقرأ ومَن يكتب؛ (ب) الخطّةُ من البروتوكول: نصوصُه وجرعتُه، وأجهزتُه الموصى بها والاختيارية المتوفّرةُ في الفرع وحدها؛
// (ج) المسوّدةُ لا يراها المنفّذ؛ (د) الإرسالُ ينبّه المعتمِدين، والاعتمادُ للمسؤول والمشرف العام وحدهما وينبّه الكاتبَ والمنفّذين؛
// (هـ) تعديلُ المعتمَدة لا يوقفها بيد أحد — وبيد الأخصائيّ تعود لمراجعة المشرف (§4.do، وكانت تعود إلى الاعتماد)؛ (و) الإعادةُ بملاحظة والإيقافُ بسبب؛
// (ز) الإسنادُ لأدوار القسم في فرع الخطّة وحدها؛ (ح) حذفُ المريض يمرّ بخططه (القاعدة الملزمة §8)؛ (ط) كلُّ كتابةٍ بسطر تدقيق؛
// (ن) §4.cz — يبدأ الأخصائيُّ خطّتَه بنفسه فتُنفَّذ في الحال، والمشرفُ يراجعها بعدها ويُنبَّه الكاتبُ بما فعل — **وعلى أيّ بروتوكولٍ أو بلا
//     بروتوكول منذ §4.do** (قرارُ المالك ٢٠٢٦-١٠-١١: «لا تحتاج اعتمادَ سليم ليبدأ، وإنّما اطّلاعَه»)؛ وكانت على غير المعتمَد تنتظر الاعتماد.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-plans-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { ALREADY_STARTED, canReviewFrom, canSelfActivate, planStatusAfterEdit, planVisibleTo } from "@shared/physio_plans";
import { eligibleStaffEvents } from "@shared/staff_notifications";
import { sql as migration110Sql } from "./migrations/110_physio_plan_notify_prefs";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6987;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9641, B2 = 9642;
const ADMIN = 9651, SUP = 9652, SPEC = 9653, TECH = 9654, DOC = 9655, REC = 9656, TECH2 = 9657, SPEC2 = 9658;
const IDS = [ADMIN, SUP, SPEC, TECH, DOC, REC, TECH2, SPEC2];
const PCODE = "tstplan-protocol";
const MARK = "اختبار-خطط-العلاج";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE (link_path LIKE '/physio/plans/%' OR link_path LIKE '/patients/%') AND text LIKE '%${MARK}%'`);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patient_cases WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_protocols WHERE code = ANY($1::text[])`, [[PCODE, PCODE + "-2"]]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  console.log("\n── القواعد (بلا قاعدة) ──");
  const spec = { role: "physio_specialist", permissions: {} };
  const tech = { role: "therapist", permissions: {} };
  const sup = { role: "branch_manager", permissions: { canSupervisePhysio: true } };
  //  §4.do — قرارُ المالك ٢٠٢٦-١٠-١١: تعديلُ الأخصائيّ لا يحتاج اعتمادَ سليم — تبقى تُنفَّذ (وكانت تعود «بانتظار الاعتماد»).
  same("ق.١ المعتمَدةُ بيد الأخصائيّ تبقى معتمَدةً تُنفَّذ (§4.do)", planStatusAfterEdit("approved", spec), "approved");
  same("ق.٢ وبيد المشرف تبقى معتمَدة", planStatusAfterEdit("approved", sup), "approved");
  same("ق.٣ والمُعادةُ تبقى مُعادة حتى الإرسال", planStatusAfterEdit("returned", spec), "returned");
  check(!planVisibleTo(tech, "draft") && !planVisibleTo(tech, "pending") && planVisibleTo(tech, "approved"), "ق.٤ المنفّذُ يرى المعتمَدة وحدها");
  check(planVisibleTo({ role: "doctor", permissions: {} }, "draft"), "ق.٥ والطبيبُ يرى المسوّدة");
  const ev = (u: any) => eligibleStaffEvents(u).filter((k) => k.startsWith("physio_plan"));
  same("ق.٦ تنبيهاتُ المشرف العام: الانتظارُ والقرار", ev({ role: "branch_manager", canSupervisePhysio: true }), ["physio_plan_pending", "physio_plan_decided"]);
  same("ق.٧ والأخصائيّ: القرارُ والإسناد", ev({ role: "physio_specialist" }), ["physio_plan_decided", "physio_plan_assigned"]);
  same("ق.٨ والمنفّذ: الإسنادُ وحده", ev({ role: "therapist" }), ["physio_plan_assigned"]);
  same("ق.٩ والاستقبالُ ومديرُ الفرع بلا إشراف: لا شيء", [ev({ role: "reception" }), ev({ role: "branch_manager" })], [[], []]);
  same("ق.١٠ والمسؤولُ: الثلاثة", ev({ role: "admin" }).length, 3);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع خطط ١'), ($2, 'فرع خطط ٢')`, [B1, B2]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
           VALUES ($1, 'pl-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true, false),
                  ($2, 'pl-sup', 'x', 'سليم', 'branch_manager', $8, $9::jsonb, true, true),
                  ($3, 'pl-spec', 'x', 'مصطفى', 'physio_specialist', $8, $9::jsonb, true, false),
                  ($4, 'pl-tech', 'x', 'تقنيّ', 'physio_technician', $8, $9::jsonb, true, false),
                  ($5, 'pl-doc', 'x', 'طبيب', 'doctor', $8, $9::jsonb, true, false),
                  ($6, 'pl-rec', 'x', 'استقبال', 'reception', $8, $9::jsonb, true, false),
                  ($7, 'pl-tech2', 'x', 'تقنيّ الفرع الآخر', 'physio_technician', $10, $11::jsonb, true, false),
                  ($12, 'pl-spec2', 'x', 'سارة', 'physio_specialist', $8, $9::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, DOC, REC, TECH2, B1, JSON.stringify([B1]), B2, JSON.stringify([B2]), SPEC2]);

  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: null, isAdmin: true, permissions: { canSupervisePhysio: true } }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    spec2: hdr({ userId: SPEC2, displayName: "سارة", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
    tech: hdr({ userId: TECH, displayName: "تقنيّ", role: "physio_technician", branchId: B1, isAdmin: false, permissions: {} }),
    doc: hdr({ userId: DOC, displayName: "طبيب", role: "doctor", branchId: B1, isAdmin: false, permissions: {} }),
    rec: hdr({ userId: REC, displayName: "استقبال", role: "reception", branchId: B1, isAdmin: false, permissions: { canViewPatients: true } }),
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
  const outbox = async (event: string, planId: number) => (await q(
    `SELECT target_user_ids, exclude_user_id FROM staff_notification_outbox WHERE event_type = $1 AND link_path = $2 ORDER BY id`,
    [event, `/physio/plans/${planId}`])).rows;
  const auditCount = async (id: number, action: string) =>
    Number((await q(`SELECT count(*) FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = $2`, [id, action])).rows[0].count);

  //  بروتوكولٌ بثلاثة أجهزة: موصى به متوفّر، واختياريٌّ غيرُ متوفّر في الفرع، وغيرُ موصى به متوفّر.
  const devs = (await q(`SELECT id FROM devices WHERE is_active ORDER BY display_order, id`)).rows.map((r) => Number(r.id));
  const [D1, D2, D3, D4] = devs;
  await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1,$4,true),($3,$4,true),($5,$4,true),($2,$4,false)`, [D1, D2, D3, B1, D4]);
  const P = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, goals, goals_en, exercises, contraindications, precautions,
                       sessions_per_week, duration_weeks, session_minutes, status)
                      VALUES ($1, 'شلل دماغي أطفال', 'Cerebral palsy', 'neurological', 'pediatric', 'تحسين المشي', 'Improve gait', 'تمارين التوازن',
                              'نوبات غير مسيطر عليها', 'مراقبة التعب', 3, 12, 45, 'draft') RETURNING id`, [PCODE])).rows[0].id;
  await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, minutes, parameters, display_order)
           VALUES ($1,$2,'recommended',15,'تحفيز',0), ($1,$3,'optional',10,NULL,1), ($1,$4,'not_recommended',NULL,NULL,2)`, [P, D1, D2, D3]);
  const pt = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
                       VALUES ($1, '07701234567', $2, '7', 'physio', $3, true) RETURNING id`, [`طفل ${MARK}`, MARK, B1])).rows[0].id;
  await q(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'physiotherapy')`, [pt]);

  try {
    console.log("\n── أ. مَن يقرأ ومَن يكتب ──");
    same("أ.١ الاستقبالُ لا يقرأ الخطط", (await call("GET", `/api/patients/${pt}/physio-plans`, S.rec)).status, 403);
    same("أ.٢ التقنيُّ لا يكتب", (await call("POST", `/api/patients/${pt}/physio-plans`, S.tech, { protocolId: P })).status, 403);
    same("أ.٣ الطبيبُ لا يكتب", (await call("POST", `/api/patients/${pt}/physio-plans`, S.doc, { protocolId: P })).status, 403);
    same("أ.٤ وبلا بروتوكولٍ ولا عنوان ⟵ ٤٠٠", (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, {})).status, 400);

    console.log("\n── ب. من البروتوكول ──");
    const c = await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P });
    same("ب.١ الأخصائيُّ يكتب", c.status, 200);
    const id = c.json?.id as number;
    const plan = (await call("GET", `/api/physio/plans/${id}`, S.spec)).json;
    same("ب.٢ مسوّدةٌ بنصوص البروتوكول وجرعته", [plan.status, plan.titleAr, plan.goals, plan.goalsEn, plan.sessionsPerWeek, plan.durationWeeks],
      ["draft", "شلل دماغي أطفال", "تحسين المشي", "Improve gait", 3, 12]);
    check(String(plan.precautions).includes("نوبات") && String(plan.precautions).includes("مراقبة"), "ب.٣ والموانعُ والاحتياطاتُ معاً");
    same("ب.٤ وأجهزتُه: الموصى به المتوفّرُ وحده (لا غيرُ المتوفّر ولا غيرُ الموصى به)", plan.devices.map((d: any) => [d.deviceId, d.minutes]), [[D1, 15]]);
    same("ب.٥ وسطرُ تدقيق", await auditCount(id, "create"), 1);
    check(plan.protocol?.status === "draft", "ب.٦ وحالةُ البروتوكول تصل الشاشةَ (شارة «غير معتمد بعد»)");

    console.log("\n── ج. المسوّدةُ لا يراها المنفّذ ──");
    same("ج.١ التقنيُّ لا يفتحها", (await call("GET", `/api/physio/plans/${id}`, S.tech)).status, 404);
    same("ج.٢ ولا تظهر في قائمته", (await call("GET", `/api/patients/${pt}/physio-plans`, S.tech)).json?.plans?.length, 0);
    same("ج.٣ والطبيبُ يراها", (await call("GET", `/api/physio/plans/${id}`, S.doc)).status, 200);

    console.log("\n── التعديل والأجهزة ──");
    const editBody = (extra: Record<string, unknown> = {}) => ({
      titleAr: "شلل دماغي — خطة أحمد", goals: "المشي بلا مساعدة", sessionsPerWeek: 3, durationWeeks: 8, sessionMinutes: 45,
      devices: [{ deviceId: D1, minutes: 20, parameters: "تحفيز" }, { deviceId: D4, minutes: 10 }], ...extra,
    });
    same("ت.١ جهازٌ غيرُ متوفّرٍ في الفرع ⟵ ٤٠٠", (await call("PUT", `/api/physio/plans/${id}`, S.spec, editBody({ devices: [{ deviceId: D2 }] }))).status, 400);
    const e1 = await call("PUT", `/api/physio/plans/${id}`, S.spec, editBody());
    same("ت.٢ التعديلُ يُحفَظ والمسوّدةُ تبقى مسوّدة", [e1.status, e1.json?.status], [200, "draft"]);

    console.log("\n── د. الإرسالُ والاعتماد ──");
    same("د.١ الأخصائيُّ يرسل", (await call("POST", `/api/physio/plans/${id}/submit`, S.spec)).json?.status, "pending");
    same("د.٢ وينبّه المعتمِدين (عامّ، بلا الكاتب)", (await outbox("physio_plan_pending", id)).map((r) => [r.target_user_ids, r.exclude_user_id]), [[null, SPEC]]);
    same("د.٣ والإرسالُ مرّتين ⟵ ٤٠٩", (await call("POST", `/api/physio/plans/${id}/submit`, S.spec)).status, 409);
    same("د.٤ الأخصائيُّ لا يعتمد", (await call("POST", `/api/physio/plans/${id}/approve`, S.spec)).status, 403);
    same("د.٥ والطبيبُ لا يعتمد", (await call("POST", `/api/physio/plans/${id}/approve`, S.doc)).status, 403);
    same("د.٦ قائمةُ الاعتمادات للمشرف فيها الخطّة", ((await call("GET", "/api/physio/plans?view=pending", S.sup)).json?.plans ?? []).some((p: any) => p.id === id), true);
    same("د.٧ وللأخصائيّ ممنوعة", (await call("GET", "/api/physio/plans?view=pending", S.spec)).status, 403);

    console.log("\n── و. الإعادةُ بملاحظة ──");
    same("و.١ بلا ملاحظة ⟵ ٤٠٠", (await call("POST", `/api/physio/plans/${id}/return`, S.sup, {})).status, 400);
    const ret = await call("POST", `/api/physio/plans/${id}/return`, S.sup, { note: "أضف تقييم الألم" });
    same("و.٢ المشرفُ يعيد", [ret.json?.status, ret.json?.returnNote], ["returned", "أضف تقييم الألم"]);
    same("و.٣ وينبّه الكاتب", (await outbox("physio_plan_decided", id)).map((r) => r.target_user_ids), [[SPEC]]);
    same("و.٤ ويُرسل ثانيةً", (await call("POST", `/api/physio/plans/${id}/submit`, S.spec)).json?.status, "pending");

    console.log("\n── ز. الإسناد ──");
    same("ز.١ الاستقبالُ لا يُسنَد إليه", (await call("PUT", `/api/physio/plans/${id}/assignees`, S.spec, { userIds: [REC] })).status, 400);
    same("ز.٢ ولا تقنيُّ فرعٍ آخر", (await call("PUT", `/api/physio/plans/${id}/assignees`, S.spec, { userIds: [TECH2] })).status, 400);
    same("ز.٣ وتقنيُّ الفرع يُسنَد إليه", (await call("PUT", `/api/physio/plans/${id}/assignees`, S.spec, { userIds: [TECH] })).status, 200);
    same("ز.٤ ولا تنبيهَ إسنادٍ قبل الاعتماد", (await outbox("physio_plan_assigned", id)).length, 0);

    const ap = await call("POST", `/api/physio/plans/${id}/approve`, S.sup);
    same("د.٨ المشرفُ يعتمد", [ap.status, ap.json?.status, ap.json?.decidedByName], [200, "approved", "سليم"]);
    same("د.٩ ويُنبَّه الكاتب", (await outbox("physio_plan_decided", id)).length, 2);
    same("د.١٠ والمنفّذ", (await outbox("physio_plan_assigned", id)).map((r) => r.target_user_ids), [[TECH]]);
    same("د.١١ وسطرا تدقيق للقرارين", [await auditCount(id, "approve"), await auditCount(id, "return")], [1, 1]);
    same("ج.٤ والتقنيُّ يراها معتمَدة", (await call("GET", `/api/physio/plans/${id}`, S.tech)).status, 200);
    same("ج.٥ وفي «المسندة إليّ»", ((await call("GET", "/api/physio/plans?view=assigned", S.tech)).json?.plans ?? []).map((p: any) => p.id), [id]);
    same("ج.٦ ولا يعدّلها", (await call("PUT", `/api/physio/plans/${id}`, S.tech, editBody())).status, 403);

    console.log("\n── هـ. تعديلُ المعتمَدة ──");
    const byAdmin = await call("PUT", `/api/physio/plans/${id}`, S.admin, editBody({ notes: "من المسؤول" }));
    same("هـ.١ بيد المسؤول تبقى معتمَدة", [byAdmin.json?.status, byAdmin.json?.demoted], ["approved", false]);
    const pendingBefore = (await outbox("physio_plan_pending", id)).length;
    const bySpec = await call("PUT", `/api/physio/plans/${id}`, S.spec, editBody({ notes: "من الأخصائيّ" }));
    //  §4.do — تعديلُ الأخصائيّ لا يوقفها (كانت تعود «بانتظار الاعتماد» ويُحجب المنفّذ): تبقى تُنفَّذ وتعود لمراجعة المشرف.
    same("هـ.٢ بيد الأخصائيّ تبقى معتمَدةً، وتعود «بانتظار مراجعة المشرف»", [bySpec.json?.status, bySpec.json?.demoted, bySpec.json?.reviewStatus], ["approved", false, "awaiting"]);
    same("هـ.٣ ويصل التنبيهُ ثانيةً", (await outbox("physio_plan_pending", id)).length, pendingBefore + 1);
    same("هـ.٤ والمنفّذُ يراها ويُنفّذها بلا انقطاع", (await call("GET", `/api/physio/plans/${id}`, S.tech)).status, 200);
    same("هـ.٥ ويراجعها المسؤول", (await call("POST", `/api/physio/plans/${id}/review`, S.admin)).json?.reviewStatus, "reviewed");

    console.log("\n── و. الإيقاف ──");
    same("و.٥ بلا سبب ⟵ ٤٠٠", (await call("POST", `/api/physio/plans/${id}/stop`, S.spec, {})).status, 400);
    same("و.٦ بسببه", (await call("POST", `/api/physio/plans/${id}/stop`, S.spec, { reason: "أنهى البرنامج" })).json?.status, "stopped");
    same("و.٧ والموقوفةُ لا تُعدَّل", (await call("PUT", `/api/physio/plans/${id}`, S.spec, editBody())).status, 409);
    same("و.٨ والمنفّذُ يراها تاريخاً", (await call("GET", `/api/physio/plans/${id}`, S.tech)).status, 200);

    //  §4.eh — طلبُ المالك ٢٠٢٦-١٠-١٥: «مثل مصطفى وسارة» — وكان للمسؤول والمشرف العام حصراً (٢٠٢٦-١٠-٠٧).
    console.log("\n── ي. الحذفُ لكاتب الخطّة: الأخصائيّ والمشرف العام والمسؤول — والمنفّذُ والطبيبُ لا ──");
    const del1 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    await call("PUT", `/api/physio/plans/${del1}/assignees`, S.spec, { userIds: [TECH] });
    same("ي.١ الطبيبُ لا يحذف", (await call("DELETE", `/api/physio/plans/${del1}`, S.doc)).status, 403);
    same("ي.٢ ولا الاستقبال", (await call("DELETE", `/api/physio/plans/${del1}`, S.rec)).status, 403);
    const canDel = async (sess: string) => (await call("GET", `/api/patients/${pt}/physio-plans`, sess)).json?.canDelete;
    same("ي.٣ والقائمةُ تقول «حذف» للأخصائيَّين والمشرف، و«لا» للطبيب والمنفّذ",
      [await canDel(S.spec), await canDel(S.spec2), await canDel(S.sup), await canDel(S.doc), await canDel(S.tech)], [true, true, true, false, false]);
    same("ي.٤ المشرفُ يحذف", (await call("DELETE", `/api/physio/plans/${del1}`, S.sup)).status, 200);
    same("ي.٥ ولا يبقى منها شيء", Number((await q(`SELECT (SELECT count(*) FROM physio_plans WHERE id = $1) + (SELECT count(*) FROM physio_plan_devices WHERE plan_id = $1)
      + (SELECT count(*) FROM physio_plan_assignees WHERE plan_id = $1) AS n`, [del1])).rows[0].n), 0);
    const delAudit = (await q(`SELECT old_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'delete'`, [del1])).rows
      .map((r) => ({ old_values: typeof r.old_values === "string" ? JSON.parse(r.old_values) : r.old_values }));
    same("ي.٦ وما حُذف كاملاً في سطر التدقيق (الأجهزةُ والمنفّذون)", [delAudit.length, delAudit[0]?.old_values?.devices?.length, delAudit[0]?.old_values?.assignees], [1, 1, [TECH]]);
    const del2 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "للحذف" })).json.id as number;
    same("ي.٧ والمسؤولُ يحذف", (await call("DELETE", `/api/physio/plans/${del2}`, S.admin)).status, 200);
    //  تنبيهاتُ الحذف برابط ملفّ المريض — الخطّةُ لم تعد.
    const delOut = async (event: string, like: string) => (await q(`SELECT target_user_ids, exclude_user_id, text FROM staff_notification_outbox
      WHERE event_type = $1 AND link_path = $2 AND text LIKE $3 ORDER BY id`, [event, `/patients/${pt}`, `%${like}%`])).rows;
    const del3 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "مسوّدةُ مصطفى" })).json.id as number;
    same("ي.٨ **الأخصائيُّ يحذف مسوّدتَه** — ولا تنبيهَ للمشرف (لم يبدأ علاجُها) ولا لنفسه",
      [(await call("DELETE", `/api/physio/plans/${del3}`, S.spec)).status, (await delOut("physio_plan_pending", "مسوّدةُ مصطفى")).length,
        (await delOut("physio_plan_decided", "مسوّدةُ مصطفى")).length], [200, 0, 0]);
    const del4 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "خطّةُ مصطفى تُنفَّذ" })).json.id as number;
    await call("PUT", `/api/physio/plans/${del4}/assignees`, S.spec, { userIds: [TECH] });
    await call("POST", `/api/physio/plans/${del4}/activate`, S.spec);
    same("ي.٩ والمنفّذُ المسنَد لا يحذف ولو رآها", [(await call("GET", `/api/physio/plans/${del4}`, S.tech)).status,
      (await call("DELETE", `/api/physio/plans/${del4}`, S.tech)).status], [200, 403]);
    same("ي.١٠ **وسارةُ تحذف خطّةَ مصطفى التي بدأ علاجُها**", (await call("DELETE", `/api/physio/plans/${del4}`, S.spec2)).status, 200);
    const delPend = await delOut("physio_plan_pending", "خطّةُ مصطفى تُنفَّذ");
    same("ي.١١ **فيعلم المشرفُ والمسؤول** (عامّ، بلا الحاذفة) باسم المريض والخطّة ومَن حذفها",
      delPend.map((r) => [r.target_user_ids, r.exclude_user_id, /حُذفت خطّةٌ بدأ علاجُها/.test(r.text), r.text.includes(MARK), /حذفها سارة/.test(r.text)]),
      [[null, SPEC2, true, true, true]]);
    same("ي.١٢ **ويعلم مصطفى أنّ زميلاً حذف خطّتَه** — باسمها",
      (await delOut("physio_plan_decided", "خطّةُ مصطفى تُنفَّذ")).map((r) => [r.target_user_ids, /حذف زميلٌ خطّتك/.test(r.text), /سارة/.test(r.text)]), [[[SPEC], true, true]]);
    const del5 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "خطّةٌ لها جلسة" })).json.id as number;
    await call("POST", `/api/physio/plans/${del5}/activate`, S.spec);
    await q(`INSERT INTO physio_plan_sessions (plan_id, patient_id, branch_id, session_date, shift, executed_by)
             VALUES ($1, $2, $3, CURRENT_DATE, 'morning', $4)`, [del5, pt, B1, SPEC]);
    same("ي.١٣ **وخطّةٌ لها جلسةٌ منفّذة لا يحذفها الأخصائيُّ** — كما لا يحذفها أحد", (await call("DELETE", `/api/physio/plans/${del5}`, S.spec)).status, 409);
    await q(`DELETE FROM physio_plan_sessions WHERE plan_id = $1`, [del5]);

    console.log("\n── م. تغييرُ نوع الخطّة — لكاتبها: الأخصائيّ والمشرف العام والمسؤول (§4.eh) ──");
    const P2 = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, goals, sessions_per_week, duration_weeks, status)
                         VALUES ($1, 'ألم أسفل الظهر', 'Low back pain', 'spine', 'adult', 'تقليل الألم', 2, 6, 'approved') RETURNING id`, [PCODE + "-2"])).rows[0].id;
    await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, minutes, display_order) VALUES ($1,$2,'recommended',25,0)`, [P2, D4]);
    await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1,$2,true) ON CONFLICT (device_id, branch_id) DO UPDATE SET available = true`, [D4, B1]);
    const ct = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    await call("PUT", `/api/physio/plans/${ct}`, S.spec, { titleAr: "شلل دماغي", notes: "ملاحظةُ الأخصائيّ لهذا المريض", devices: [{ deviceId: D1, minutes: 15 }] });
    await call("PUT", `/api/physio/plans/${ct}/assignees`, S.spec, { userIds: [TECH] });
    await call("POST", `/api/physio/plans/${ct}/approve`, S.sup);
    same("م.١ المنفّذُ والطبيبُ لا يغيّران النوع", [(await call("POST", `/api/physio/plans/${ct}/change-protocol`, S.tech, { protocolId: P2 })).status,
      (await call("POST", `/api/physio/plans/${ct}/change-protocol`, S.doc, { protocolId: P2 })).status], [403, 403]);
    same("م.٢ والنوعُ نفسُه ⟵ ٤٠٩", (await call("POST", `/api/physio/plans/${ct}/change-protocol`, S.sup, { protocolId: P })).status, 409);
    const assignedBefore = (await outbox("physio_plan_assigned", ct)).length;
    same("م.٣ المشرفُ يغيّر النوع", (await call("POST", `/api/physio/plans/${ct}/change-protocol`, S.sup, { protocolId: P2 })).status, 200);
    const cp = (await call("GET", `/api/physio/plans/${ct}`, S.sup)).json;
    same("م.٤ الخطّةُ تمتلئ من البروتوكول الجديد: العنوانُ والأهدافُ والجرعةُ والأجهزة",
      [cp.protocol?.id, cp.titleAr, cp.goals, cp.sessionsPerWeek, cp.devices.map((d: any) => [d.deviceId, d.minutes])],
      [P2, "ألم أسفل الظهر", "تقليل الألم", 2, [[D4, 25]]]);
    same("م.٥ ويبقى المنفّذون وملاحظةُ الأخصائيّ والحالة", [cp.assignees.map((a: any) => a.userId), cp.notes, cp.status], [[TECH], "ملاحظةُ الأخصائيّ لهذا المريض", "approved"]);
    same("م.٦ ويُنبَّه المنفّذ", (await outbox("physio_plan_assigned", ct)).length, assignedBefore + 1);
    same("م.٧ وسطرُ تدقيق", await auditCount(ct, "change_protocol"), 1);
    await call("POST", `/api/physio/plans/${ct}/stop`, S.spec, { reason: "x" });
    same("م.٨ والموقوفةُ لا يتغيّر نوعُها", (await call("POST", `/api/physio/plans/${ct}/change-protocol`, S.admin, { protocolId: P })).status, 409);
    same("م.٨ب ولا بيد الأخصائيّ", (await call("POST", `/api/physio/plans/${ct}/change-protocol`, S.spec, { protocolId: P })).status, 409);
    //  §4.eh — الأخصائيُّ يغيّر النوع؛ وفي خطّةٍ تُنفَّذ تبقى تُنفَّذ وتنتظر مراجعةَ المشرف، كأيّ تعديلٍ بيده (§4.do).
    const swOut = async (event: string, planId: number) => (await q(`SELECT target_user_ids, exclude_user_id, text FROM staff_notification_outbox
      WHERE event_type = $1 AND link_path = $2 ORDER BY id`, [event, `/physio/plans/${planId}`])).rows;
    const sw = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    await call("PUT", `/api/physio/plans/${sw}/assignees`, S.spec, { userIds: [TECH] });
    await call("POST", `/api/physio/plans/${sw}/activate`, S.spec);
    await call("POST", `/api/physio/plans/${sw}/review`, S.sup);
    same("م.٩ (تمهيد) خطّةُ مصطفى تُنفَّذ وراجعها المشرف", (await call("GET", `/api/physio/plans/${sw}`, S.sup)).json?.reviewStatus, "reviewed");
    const swPendBefore = (await swOut("physio_plan_pending", sw)).length;
    const assignedBeforeSw = (await swOut("physio_plan_assigned", sw)).length;
    const swr = await call("POST", `/api/physio/plans/${sw}/change-protocol`, S.spec2, { protocolId: P2 });
    same("م.١٠ **سارةُ تغيّر نوعَ خطّة مصطفى التي تُنفَّذ**: تمتلئ من الجديد وتبقى تُنفَّذ، و«بانتظار مراجعة المشرف» وتُمحى مراجعتُه السابقة",
      [swr.status, swr.json?.protocolId, swr.json?.status, swr.json?.reviewStatus, swr.json?.reviewedByName, swr.json?.updatedByName],
      [200, P2, "approved", "awaiting", null, "سارة"]);
    const swPend = (await swOut("physio_plan_pending", sw)).slice(swPendBefore);
    same("م.١١ **ويعلم المشرفُ والمسؤول** (عامّ، بلا سارة) بمَن غيّر ومن أيّ نوعٍ إلى أيّ نوع",
      swPend.map((r) => [r.target_user_ids, r.exclude_user_id, /تغيّر نوعُ خطّةٍ تُنفَّذ/.test(r.text), /غيّرها سارة/.test(r.text), r.text.includes("⟵ ألم أسفل الظهر")]),
      [[null, SPEC2, true, true, true]]);
    same("م.١٢ **ويعلم مصطفى أنّ زميلاً غيّر نوعَ خطّته** — والمنفّذُ كما كان",
      [(await swOut("physio_plan_decided", sw)).filter((r) => /غيّر زميلٌ نوعَ خطّتك/.test(r.text)).map((r) => r.target_user_ids),
        (await swOut("physio_plan_assigned", sw)).length - assignedBeforeSw], [[[SPEC]], 1]);
    const decBefore = (await swOut("physio_plan_decided", sw)).length;
    const back = await call("POST", `/api/physio/plans/${sw}/change-protocol`, S.spec, { protocolId: P });
    same("م.١٣ ومصطفى يعيده على خطّته هو: يعلم المشرف، ولا يُنبَّه هو بفعل نفسه",
      [back.status, back.json?.reviewStatus, (await swOut("physio_plan_pending", sw)).length - swPendBefore, (await swOut("physio_plan_decided", sw)).length - decBefore],
      [200, "awaiting", 2, 0]);
    same("م.١٤ وسطرا تدقيق بالاسمين", (await q(`SELECT user_name FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'change_protocol' ORDER BY id`, [sw])).rows
      .map((r) => r.user_name), ["سارة", "مصطفى"]);
    const swDraft = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    const dr = await call("POST", `/api/physio/plans/${swDraft}/change-protocol`, S.spec, { protocolId: P2 });
    same("م.١٥ والمسوّدةُ يغيّر نوعَها كاتبُها بلا تنبيهٍ للمشرف — تبقى مسوّدة", [dr.status, dr.json?.status, (await swOut("physio_plan_pending", swDraft)).length], [200, "draft", 0]);

    console.log("\n── ك. الخططُ القديمة: المشرفُ العام يعدّل ويحذف ──");
    const legacy = (await q(`INSERT INTO treatment_plans (patient_id, branch_id, diagnosis) VALUES ($1, $2, 'تشخيص قديم') RETURNING id`, [pt, B1])).rows[0].id;
    const supLegacy = hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false,
      permissions: { canSupervisePhysio: true, canViewPatients: true, canManageTreatmentPlans: false } });
    //  الجلسةُ تُقرأ حيّةً من صفّ الحساب — فحسابٌ بلا إشرافٍ ولا صلاحية الخطط (الطبيبُ هنا) لا حسابُ سليم.
    const mgrLegacy = hdr({ userId: DOC, displayName: "مدير", role: "branch_manager", branchId: B1, isAdmin: false,
      permissions: { canSupervisePhysio: false, canViewPatients: true, canManageTreatmentPlans: false } });
    same("ك.١ مديرُ فرعٍ بلا إشرافٍ ولا صلاحية الخطط لا يعدّل", (await call("PUT", `/api/treatment-plans/${legacy}`, mgrLegacy, { notes: "x" })).status, 403);
    same("ك.٢ والمشرفُ العام يعدّل", (await call("PUT", `/api/treatment-plans/${legacy}`, supLegacy, { notes: "عدّلها سليم" })).status, 200);
    same("ك.٣ ويحذف", (await call("DELETE", `/api/treatment-plans/${legacy}`, supLegacy)).status, 200);

    console.log("\n── ل. ترحيل ١١٠: تفعيلُ التنبيهات ──");
    await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [IDS]);
    await q(`UPDATE system_users SET extra_roles = '["therapist"]'::jsonb WHERE id = $1`, [DOC]);
    await q(migration110Sql);
    await q(migration110Sql);
    const prefs = (await q(`SELECT user_id, array_agg(event_type ORDER BY event_type) AS ev FROM staff_notification_prefs WHERE user_id = ANY($1::int[]) GROUP BY user_id ORDER BY user_id`, [IDS])).rows
      .map((r) => [Number(r.user_id), r.ev]);
    same("ل.١ المسؤول: الانتظار · المشرف: الانتظارُ والقرار · الأخصائيّان: القرارُ والإسناد · التقنيّان والطبيبُ المعالجُ أيضاً: الإسناد · الاستقبال: لا شيء — والإعادةُ لا تكرّر",
      prefs, [[ADMIN, ["physio_plan_pending"]], [SUP, ["physio_plan_decided", "physio_plan_pending"]],
        [SPEC, ["physio_plan_assigned", "physio_plan_decided"]], [TECH, ["physio_plan_assigned"]], [DOC, ["physio_plan_assigned"]], [TECH2, ["physio_plan_assigned"]],
        [SPEC2, ["physio_plan_assigned", "physio_plan_decided"]]]);
    await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [IDS]);

    console.log("\n── ن. الأخصائيُّ يبدأ خطّتَه بنفسه على أيّ بروتوكول، والمشرفُ يراجعها بعدها (§4.cz، و§4.do) ──");
    //  §4.do — قرارُ المالك ٢٠٢٦-١٠-١١: البدءُ على غير المعتمَد وبلا بروتوكول ومن المنتظِرة صار مسموحاً، والتعديلُ يُبقيها على أيّ بروتوكول.
    same("ن.١ القواعد: يبدأها كاتبُها من المسوّدة أو المُعادة أو المنتظِرة على أيّ بروتوكول، لا من المعتمَدة ولا المنتهية؛ ويراجعها المشرفُ معتمَدةً تنتظره؛ وتعديلُ الأخصائيّ يُبقيها",
      [canSelfActivate("draft", "approved"), canSelfActivate("returned", "approved"), canSelfActivate("draft", "draft"), canSelfActivate("draft", null),
        canSelfActivate("pending", "approved"), canSelfActivate("approved"), canSelfActivate("stopped"), canSelfActivate("graduated"),
        canReviewFrom("approved", "awaiting"), canReviewFrom("approved", "reviewed"), canReviewFrom("stopped", "awaiting"),
        planStatusAfterEdit("approved", spec, "approved"), planStatusAfterEdit("approved", spec, "draft"), planStatusAfterEdit("approved", spec, null)],
      [true, true, true, true, true, false, false, false, true, false, false, "approved", "approved", "approved"]);
    const outText = async (event: string, planId: number) => (await q(
      `SELECT target_user_ids, exclude_user_id, text FROM staff_notification_outbox WHERE event_type = $1 AND link_path = $2 ORDER BY id`,
      [event, `/physio/plans/${planId}`])).rows;
    const draftProto = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    const noProto = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "خطّةٌ بلا بروتوكول" })).json.id as number;
    const na = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P2 })).json.id as number;
    await call("PUT", `/api/physio/plans/${na}/assignees`, S.spec, { userIds: [TECH] });
    const dp = await call("POST", `/api/physio/plans/${draftProto}/activate`, S.spec);
    const np = await call("POST", `/api/physio/plans/${noProto}/activate`, S.spec);
    same("ن.٢ **وعلى بروتوكولٍ غير معتمَد وبلا بروتوكول يبدؤها كذلك** (§4.do) — معتمَدةٌ تنتظر مراجعة المشرف",
      [dp.status, dp.json?.status, dp.json?.reviewStatus, np.status, np.json?.status, np.json?.reviewStatus], [200, "approved", "awaiting", 200, "approved", "awaiting"]);
    const dpText = (await outText("physio_plan_pending", draftProto)).map((r) => r.text).join("|");
    same("ن.٣ **وتنبيهُ المشرف يقول المريضَ وكاتبَها وما تختلف به عن البروتوكول**، وبلا بروتوكول يقولها",
      [/للاطّلاع والمراجعة/.test(dpText), dpText.includes(MARK), /كتبها مصطفى/.test(dpText), /مطابقةٌ للبروتوكول الأصليّ|تختلف عن البروتوكول/.test(dpText),
        /خطّةٌ بلا بروتوكول/.test((await outText("physio_plan_pending", noProto)).map((r) => r.text).join("|"))], [true, true, true, true, true]);
    same("ن.٤ التقنيُّ لا يبدأ خطّة", (await call("POST", `/api/physio/plans/${na}/activate`, S.tech)).status, 404);
    same("ن.٥ والطبيبُ لا يبدأ خطّة", (await call("POST", `/api/physio/plans/${na}/activate`, S.doc)).status, 403);
    const act = await call("POST", `/api/physio/plans/${na}/activate`, S.spec);
    same("ن.٦ **الأخصائيُّ يبدؤها على بروتوكولٍ معتمَد** — معتمَدةٌ باسمه، «بانتظار مراجعة المشرف»",
      [act.status, act.json?.status, act.json?.decidedByName, act.json?.reviewStatus], [200, "approved", "مصطفى", "awaiting"]);
    const pend = await outText("physio_plan_pending", na);
    same("ن.٧ **ويُنبَّه المشرفُ والمسؤول للمراجعة** (عامّ، بلا الكاتب)", pend.map((r) => [r.target_user_ids, r.exclude_user_id, /للاطّلاع والمراجعة/.test(r.text)]), [[null, SPEC, true]]);
    same("ن.٨ والمنفّذُ المسنَد", (await outbox("physio_plan_assigned", na)).map((r) => r.target_user_ids), [[TECH]]);
    same("ن.٩ **والتقنيُّ يراها ويُنفّذها في الحال** — لا انتظارَ للمشرف",
      [(await call("GET", `/api/physio/plans/${na}`, S.tech)).status,
        ((await call("GET", `/api/patients/${pt}/physio-plans`, S.tech)).json?.plans ?? []).find((x: any) => x.id === na)?.canExecute], [200, true]);
    const twice = await call("POST", `/api/physio/plans/${na}/activate`, S.spec);
    same("ن.١٠ والبدءُ مرّتين ⟵ ٤٠٩ بسببه", [twice.status, twice.json?.error], [409, ALREADY_STARTED]);
    const inList = async (view: string, sess: string) => ((await call("GET", `/api/physio/plans?view=${view}`, sess)).json?.plans ?? []).some((x: any) => x.id === na);
    same("ن.١١ «للمراجعة» عند المشرف فيها الخطّة، و«بانتظار الاعتماد» لا، وللأخصائيّ ممنوعة",
      [await inList("review", S.sup), await inList("pending", S.sup), (await call("GET", "/api/physio/plans?view=review", S.spec)).status], [true, false, 403]);
    same("ن.١٢ وفي ملفّ المريض حالتُها «بانتظار مراجعة المشرف»",
      ((await call("GET", `/api/patients/${pt}/physio-plans`, S.spec)).json?.plans ?? []).find((x: any) => x.id === na)?.reviewStatus, "awaiting");
    const body2 = { titleAr: "ألم أسفل الظهر — خطة طفل", goals: "تقليل الألم", sessionsPerWeek: 2, durationWeeks: 6, sessionMinutes: 40, devices: [{ deviceId: D4, minutes: 20 }] };
    const pendBefore = (await outText("physio_plan_pending", na)).length;
    const ne1 = await call("PUT", `/api/physio/plans/${na}`, S.spec, body2);
    same("ن.١٣ **تعديلُ الأخصائيّ لا يوقفها**: تبقى معتمَدةً وتُنفَّذ، وتنتظر المراجعة، ويُنبَّه المشرفُ ثانيةً",
      [ne1.json?.status, ne1.json?.demoted, ne1.json?.reviewStatus, (await outText("physio_plan_pending", na)).length - pendBefore,
        (await call("GET", `/api/physio/plans/${na}`, S.tech)).status], ["approved", false, "awaiting", 1, 200]);
    same("ن.١٤ الأخصائيُّ لا يراجع، ولا الطبيب", [(await call("POST", `/api/physio/plans/${na}/review`, S.spec)).status, (await call("POST", `/api/physio/plans/${na}/review`, S.doc)).status], [403, 403]);
    const rv = await call("POST", `/api/physio/plans/${na}/review`, S.sup);
    same("ن.١٥ **المشرفُ يوافق** — «راجعها المشرف» باسمه", [rv.status, rv.json?.reviewStatus, rv.json?.reviewedByName], [200, "reviewed", "سليم"]);
    const dec1 = await outText("physio_plan_decided", na);
    same("ن.١٦ **ويُنبَّه الأخصائيُّ بموافقته**", dec1.map((r) => [r.target_user_ids, /وافق المشرفُ/.test(r.text)]), [[[SPEC], true]]);
    same("ن.١٧ والمراجعةُ مرّتين ⟵ ٤٠٩، وخرجت من «للمراجعة»", [(await call("POST", `/api/physio/plans/${na}/review`, S.sup)).status, await inList("review", S.sup)], [409, false]);
    await call("PUT", `/api/physio/plans/${na}`, S.spec, { ...body2, notes: "زاد الألم" });
    same("ن.١٨ وتعديلٌ جديد من الأخصائيّ يعيدها للمراجعة", (await call("GET", `/api/physio/plans/${na}`, S.sup)).json?.reviewStatus, "awaiting");
    const e2 = await call("PUT", `/api/physio/plans/${na}`, S.sup, { ...body2, notes: "عدّلها سليم" });
    const dec2 = await outText("physio_plan_decided", na);
    same("ن.١٩ **المشرفُ يعدّل**: تبقى معتمَدة، «راجعها المشرف»، **ويُنبَّه الأخصائيُّ بتعديله**",
      [e2.json?.status, e2.json?.reviewStatus, e2.json?.reviewedByName, dec2.length, /عدّل المشرفُ/.test(dec2[dec2.length - 1]?.text ?? "")], ["approved", "reviewed", "سليم", 2, true]);
    const st = await call("POST", `/api/physio/plans/${na}/stop`, S.sup, { reason: "يحتاج تقييماً جديداً" });
    const dec3 = await outText("physio_plan_decided", na);
    same("ن.٢٠ **المشرفُ يوقف**: ويُنبَّه الأخصائيُّ بالسبب", [st.json?.status, dec3.length, /أوقف المشرفُ.*يحتاج تقييماً جديداً/.test(dec3[dec3.length - 1]?.text ?? "")], ["stopped", 3, true]);
    same("ن.٢١ وسطرا تدقيق: البدءُ والمراجعة", [await auditCount(na, "activate"), await auditCount(na, "review")], [1, 1]);
    //  الاستبدالُ والحذفُ بيد المشرف ينبّهان الكاتب كذلك.
    const nb = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P2 })).json.id as number;
    await call("POST", `/api/physio/plans/${nb}/activate`, S.spec);
    await call("POST", `/api/physio/plans/${nb}/change-protocol`, S.sup, { protocolId: P });
    const nbPlan = (await call("GET", `/api/physio/plans/${nb}`, S.sup)).json;
    same("ن.٢٢ **المشرفُ يستبدل نوعَها**: «راجعها المشرف»، ويُنبَّه الأخصائيّ",
      [nbPlan.reviewStatus, (await outText("physio_plan_decided", nb)).map((r) => [r.target_user_ids, /استبدل المشرفُ/.test(r.text)])], ["reviewed", [[[SPEC], true]]]);
    const nc = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P2 })).json.id as number;
    await call("POST", `/api/physio/plans/${nc}/activate`, S.spec);
    const delRows = async () => (await q(`SELECT target_user_ids FROM staff_notification_outbox WHERE event_type = 'physio_plan_decided' AND link_path = $1
      AND text LIKE '%حذف المشرفُ%' ORDER BY id`, [`/patients/${pt}`])).rows.map((r) => r.target_user_ids);
    const delBefore = (await delRows()).length;
    same("ن.٢٣ **المشرفُ يحذف**: ويُنبَّه الأخصائيُّ برابط ملفّ المريض", [(await call("DELETE", `/api/physio/plans/${nc}`, S.sup)).status,
      (await delRows()).slice(delBefore)], [200, [[SPEC]]]);
    //  والمسارُ القديم باقٍ: المعتمِدُ يعتمد المنتظِرة فتُعدّ مراجَعة، والمشرفُ يبدأ خطّتَه بنفسه بلا مراجعةٍ معلَّقة ولا تنبيهِ مراجعة.
    const submitted = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    await call("POST", `/api/physio/plans/${submitted}/submit`, S.spec);
    const old = await call("POST", `/api/physio/plans/${submitted}/approve`, S.sup);
    same("ن.٢٤ والمسارُ القديم باقٍ: إرسالٌ فاعتمادٌ، والاعتمادُ مراجعةٌ بنفسه", [old.json?.status, old.json?.reviewStatus], ["approved", "reviewed"]);
    const waiting = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    await call("POST", `/api/physio/plans/${waiting}/submit`, S.spec);
    const fromPending = await call("POST", `/api/physio/plans/${waiting}/activate`, S.spec);
    same("ن.٢٤ب **وخطّةٌ أُرسلت للاعتماد قبل اليوم يبدؤها كاتبُها** (§4.do)", [fromPending.status, fromPending.json?.status, fromPending.json?.reviewStatus], [200, "approved", "awaiting"]);
    const own = (await call("POST", `/api/patients/${pt}/physio-plans`, S.sup, { protocolId: P2 })).json.id as number;
    const ownAct = await call("POST", `/api/physio/plans/${own}/activate`, S.sup);
    same("ن.٢٥ والمشرفُ يبدأ خطّتَه بنفسه: مراجَعةٌ أصلاً، ولا تنبيهَ مراجعة", [ownAct.json?.status, ownAct.json?.reviewStatus, (await outText("physio_plan_pending", own)).length], ["approved", "reviewed", 0]);
    const onDraft = await call("PUT", `/api/physio/plans/${draftProto}`, S.spec, editBody());
    same("ن.٢٦ **والتعديلُ على المعتمَدة على البروتوكول غير المعتمَد يُبقيها تُنفَّذ** (§4.do — وكان يعيدها للاعتماد)",
      [onDraft.json?.status, onDraft.json?.reviewStatus], ["approved", "awaiting"]);

    console.log("\n── ح. حذفُ المريض يمرّ بخططه ──");
    const c2 = await call("POST", `/api/patients/${pt}/physio-plans`, S.sup, { titleAr: "خطّةٌ بلا بروتوكول" });
    same("ح.١ خطّةٌ بلا بروتوكول", c2.status, 200);
    let deleted = true;
    try { await storage.deletePatient(pt); } catch (e) { deleted = false; console.error(e); }
    check(deleted, "ح.٢ الحذفُ النهائيّ ينجح");
    same("ح.٣ ولا خطّةَ ولا جهازَ ولا إسنادَ باقٍ",
      Number((await q(`SELECT (SELECT count(*) FROM physio_plans WHERE patient_id = $1) + (SELECT count(*) FROM physio_plan_devices WHERE plan_id = $2)
                      + (SELECT count(*) FROM physio_plan_assignees WHERE plan_id = $2) AS n`, [pt, id])).rows[0].n), 0);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
