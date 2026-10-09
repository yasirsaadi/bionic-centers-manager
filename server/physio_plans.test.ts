// خطّةُ العلاج الطبيعي للمريض واعتمادُها (ترحيل ١٠٩، §4.cm — المرحلةُ الثالثة، ٢٠٢٦-١٠-٠٧).
// `npm run test:physio-plans` — على النقاط الحقيقية بتطبيق Express الحقيقيّ.
//
// يحرس: (أ) مَن يقرأ ومَن يكتب؛ (ب) الخطّةُ من البروتوكول: نصوصُه وجرعتُه، وأجهزتُه الموصى بها والاختيارية المتوفّرةُ في الفرع وحدها؛
// (ج) المسوّدةُ لا يراها المنفّذ؛ (د) الإرسالُ ينبّه المعتمِدين، والاعتمادُ للمسؤول والمشرف العام وحدهما وينبّه الكاتبَ والمنفّذين؛
// (هـ) تعديلُ المعتمَدة بيد الأخصائيّ يعيدها إلى الاعتماد، وبيد المعتمِد لا؛ (و) الإعادةُ بملاحظة والإيقافُ بسبب؛
// (ز) الإسنادُ لأدوار القسم في فرع الخطّة وحدها؛ (ح) حذفُ المريض يمرّ بخططه (القاعدة الملزمة §8)؛ (ط) كلُّ كتابةٍ بسطر تدقيق؛
// (ن) §4.cz — على بروتوكولٍ اعتمده المشرف يبدأ الأخصائيُّ خطّتَه بنفسه فتُنفَّذ في الحال، والمشرفُ يراجعها بعدها ويُنبَّه الكاتبُ بما فعل،
//     وعلى بروتوكولٍ غير معتمَد أو بلا بروتوكول تنتظر الاعتمادَ كما كانت.

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
import { canReviewFrom, canSelfActivate, planStatusAfterEdit, planVisibleTo, SELF_ACTIVATE_NEEDS_APPROVED_PROTOCOL } from "@shared/physio_plans";
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
const ADMIN = 9651, SUP = 9652, SPEC = 9653, TECH = 9654, DOC = 9655, REC = 9656, TECH2 = 9657;
const IDS = [ADMIN, SUP, SPEC, TECH, DOC, REC, TECH2];
const PCODE = "tstplan-protocol";
const MARK = "اختبار-خطط-العلاج";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM staff_notification_outbox WHERE (link_path LIKE '/physio/plans/%' OR link_path LIKE '/patients/%') AND text LIKE '%${MARK}%'`);
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
  same("ق.١ المعتمَدةُ بيد الأخصائيّ تعود إلى الاعتماد", planStatusAfterEdit("approved", spec), "pending");
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
                  ($7, 'pl-tech2', 'x', 'تقنيّ الفرع الآخر', 'physio_technician', $10, $11::jsonb, true, false)`,
    [ADMIN, SUP, SPEC, TECH, DOC, REC, TECH2, B1, JSON.stringify([B1]), B2, JSON.stringify([B2])]);

  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: null, isAdmin: true, permissions: { canSupervisePhysio: true } }),
    sup: hdr({ userId: SUP, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: { canSupervisePhysio: true } }),
    spec: hdr({ userId: SPEC, displayName: "مصطفى", role: "physio_specialist", branchId: B1, isAdmin: false, permissions: {} }),
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
    same("هـ.٢ بيد الأخصائيّ تعود إلى الاعتماد", [bySpec.json?.status, bySpec.json?.demoted], ["pending", true]);
    same("هـ.٣ ويصل التنبيهُ ثانيةً", (await outbox("physio_plan_pending", id)).length, pendingBefore + 1);
    same("هـ.٤ والمنفّذُ لا يراها حتى تُعتمَد", (await call("GET", `/api/physio/plans/${id}`, S.tech)).status, 404);
    same("هـ.٥ ويعتمدها المسؤول", (await call("POST", `/api/physio/plans/${id}/approve`, S.admin)).json?.status, "approved");

    console.log("\n── و. الإيقاف ──");
    same("و.٥ بلا سبب ⟵ ٤٠٠", (await call("POST", `/api/physio/plans/${id}/stop`, S.spec, {})).status, 400);
    same("و.٦ بسببه", (await call("POST", `/api/physio/plans/${id}/stop`, S.spec, { reason: "أنهى البرنامج" })).json?.status, "stopped");
    same("و.٧ والموقوفةُ لا تُعدَّل", (await call("PUT", `/api/physio/plans/${id}`, S.spec, editBody())).status, 409);
    same("و.٨ والمنفّذُ يراها تاريخاً", (await call("GET", `/api/physio/plans/${id}`, S.tech)).status, 200);

    console.log("\n── ي. الحذفُ للمسؤول والمشرف العام حصراً ──");
    const del1 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    await call("PUT", `/api/physio/plans/${del1}/assignees`, S.spec, { userIds: [TECH] });
    same("ي.١ الأخصائيُّ لا يحذف", (await call("DELETE", `/api/physio/plans/${del1}`, S.spec)).status, 403);
    same("ي.٢ ولا الطبيب", (await call("DELETE", `/api/physio/plans/${del1}`, S.doc)).status, 403);
    same("ي.٣ والقائمةُ تقول للأخصائيّ «لا حذف» وللمشرف «حذف»",
      [(await call("GET", `/api/patients/${pt}/physio-plans`, S.spec)).json?.canDelete, (await call("GET", `/api/patients/${pt}/physio-plans`, S.sup)).json?.canDelete], [false, true]);
    same("ي.٤ المشرفُ يحذف", (await call("DELETE", `/api/physio/plans/${del1}`, S.sup)).status, 200);
    same("ي.٥ ولا يبقى منها شيء", Number((await q(`SELECT (SELECT count(*) FROM physio_plans WHERE id = $1) + (SELECT count(*) FROM physio_plan_devices WHERE plan_id = $1)
      + (SELECT count(*) FROM physio_plan_assignees WHERE plan_id = $1) AS n`, [del1])).rows[0].n), 0);
    const delAudit = (await q(`SELECT old_values FROM audit_log WHERE entity_type = 'physio_plan' AND entity_id = $1 AND action = 'delete'`, [del1])).rows
      .map((r) => ({ old_values: typeof r.old_values === "string" ? JSON.parse(r.old_values) : r.old_values }));
    same("ي.٦ وما حُذف كاملاً في سطر التدقيق (الأجهزةُ والمنفّذون)", [delAudit.length, delAudit[0]?.old_values?.devices?.length, delAudit[0]?.old_values?.assignees], [1, 1, [TECH]]);
    const del2 = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "للحذف" })).json.id as number;
    same("ي.٧ والمسؤولُ يحذف", (await call("DELETE", `/api/physio/plans/${del2}`, S.admin)).status, 200);

    console.log("\n── م. تغييرُ نوع الخطّة — للمسؤول والمشرف العام حصراً ──");
    const P2 = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, goals, sessions_per_week, duration_weeks, status)
                         VALUES ($1, 'ألم أسفل الظهر', 'Low back pain', 'spine', 'adult', 'تقليل الألم', 2, 6, 'approved') RETURNING id`, [PCODE + "-2"])).rows[0].id;
    await q(`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, minutes, display_order) VALUES ($1,$2,'recommended',25,0)`, [P2, D4]);
    await q(`INSERT INTO physio_device_branches (device_id, branch_id, available) VALUES ($1,$2,true) ON CONFLICT (device_id, branch_id) DO UPDATE SET available = true`, [D4, B1]);
    const ct = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    await call("PUT", `/api/physio/plans/${ct}`, S.spec, { titleAr: "شلل دماغي", notes: "ملاحظةُ الأخصائيّ لهذا المريض", devices: [{ deviceId: D1, minutes: 15 }] });
    await call("PUT", `/api/physio/plans/${ct}/assignees`, S.spec, { userIds: [TECH] });
    await call("POST", `/api/physio/plans/${ct}/approve`, S.sup);
    same("م.١ الأخصائيُّ لا يغيّر النوع", (await call("POST", `/api/physio/plans/${ct}/change-protocol`, S.spec, { protocolId: P2 })).status, 403);
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
    same("ل.١ المسؤول: الانتظار · المشرف: الانتظارُ والقرار · الأخصائيّ: القرارُ والإسناد · التقنيّان والطبيبُ المعالجُ أيضاً: الإسناد · الاستقبال: لا شيء — والإعادةُ لا تكرّر",
      prefs, [[ADMIN, ["physio_plan_pending"]], [SUP, ["physio_plan_decided", "physio_plan_pending"]],
        [SPEC, ["physio_plan_assigned", "physio_plan_decided"]], [TECH, ["physio_plan_assigned"]], [DOC, ["physio_plan_assigned"]], [TECH2, ["physio_plan_assigned"]]]);
    await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [IDS]);

    console.log("\n── ن. الأخصائيُّ يبدأ خطّتَه على بروتوكولٍ معتمَد، والمشرفُ يراجعها بعدها (§4.cz) ──");
    same("ن.١ القواعد: يبدأها كاتبُها من المسوّدة أو المُعادة على بروتوكولٍ معتمَد وحده؛ ويراجعها المشرفُ معتمَدةً تنتظره؛ وتعديلُ الأخصائيّ على معتمَدٍ يُبقيها",
      [canSelfActivate("draft", "approved"), canSelfActivate("returned", "approved"), canSelfActivate("draft", "draft"), canSelfActivate("draft", null),
        canSelfActivate("pending", "approved"), canReviewFrom("approved", "awaiting"), canReviewFrom("approved", "reviewed"), canReviewFrom("stopped", "awaiting"),
        planStatusAfterEdit("approved", spec, "approved"), planStatusAfterEdit("approved", spec, "draft"), planStatusAfterEdit("approved", spec, null)],
      [true, true, false, false, false, true, false, false, "approved", "pending", "pending"]);
    const outText = async (event: string, planId: number) => (await q(
      `SELECT target_user_ids, exclude_user_id, text FROM staff_notification_outbox WHERE event_type = $1 AND link_path = $2 ORDER BY id`,
      [event, `/physio/plans/${planId}`])).rows;
    const draftProto = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P })).json.id as number;
    const noProto = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { titleAr: "خطّةٌ بلا بروتوكول" })).json.id as number;
    const na = (await call("POST", `/api/patients/${pt}/physio-plans`, S.spec, { protocolId: P2 })).json.id as number;
    await call("PUT", `/api/physio/plans/${na}/assignees`, S.spec, { userIds: [TECH] });
    const dp = await call("POST", `/api/physio/plans/${draftProto}/activate`, S.spec);
    same("ن.٢ على بروتوكولٍ غير معتمَد ⟵ ٤٠٩ «أرسلها للاعتماد»، وبلا بروتوكول ⟵ ٤٠٩",
      [dp.status, dp.json?.error, (await call("POST", `/api/physio/plans/${noProto}/activate`, S.spec)).status], [409, SELF_ACTIVATE_NEEDS_APPROVED_PROTOCOL, 409]);
    same("ن.٣ وهما باقيتان مسوّدتين", [(await call("GET", `/api/physio/plans/${draftProto}`, S.spec)).json?.status, (await call("GET", `/api/physio/plans/${noProto}`, S.spec)).json?.status], ["draft", "draft"]);
    same("ن.٤ التقنيُّ لا يبدأ خطّة", (await call("POST", `/api/physio/plans/${na}/activate`, S.tech)).status, 404);
    same("ن.٥ والطبيبُ لا يبدأ خطّة", (await call("POST", `/api/physio/plans/${na}/activate`, S.doc)).status, 403);
    const act = await call("POST", `/api/physio/plans/${na}/activate`, S.spec);
    same("ن.٦ **الأخصائيُّ يبدؤها على بروتوكولٍ معتمَد** — معتمَدةٌ باسمه، «بانتظار مراجعة المشرف»",
      [act.status, act.json?.status, act.json?.decidedByName, act.json?.reviewStatus], [200, "approved", "مصطفى", "awaiting"]);
    const pend = await outText("physio_plan_pending", na);
    same("ن.٧ **ويُنبَّه المشرفُ والمسؤول للمراجعة** (عامّ، بلا الكاتب)", pend.map((r) => [r.target_user_ids, r.exclude_user_id, /للمراجعة/.test(r.text)]), [[null, SPEC, true]]);
    same("ن.٨ والمنفّذُ المسنَد", (await outbox("physio_plan_assigned", na)).map((r) => r.target_user_ids), [[TECH]]);
    same("ن.٩ **والتقنيُّ يراها ويُنفّذها في الحال** — لا انتظارَ للمشرف",
      [(await call("GET", `/api/physio/plans/${na}`, S.tech)).status,
        ((await call("GET", `/api/patients/${pt}/physio-plans`, S.tech)).json?.plans ?? []).find((x: any) => x.id === na)?.canExecute], [200, true]);
    const twice = await call("POST", `/api/physio/plans/${na}/activate`, S.spec);
    same("ن.١٠ والبدءُ مرّتين ⟵ ٤٠٩ بسببه", [twice.status, twice.json?.error], [409, "الخطّةُ بدأت من قبل أو أُرسلت للاعتماد"]);
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
    await call("POST", `/api/physio/plans/${draftProto}/submit`, S.spec);
    const old = await call("POST", `/api/physio/plans/${draftProto}/approve`, S.sup);
    same("ن.٢٤ وعلى البروتوكول غير المعتمَد: إرسالٌ فاعتمادٌ كما كان، والاعتمادُ مراجعةٌ بنفسه", [old.json?.status, old.json?.reviewStatus], ["approved", "reviewed"]);
    const own = (await call("POST", `/api/patients/${pt}/physio-plans`, S.sup, { protocolId: P2 })).json.id as number;
    const ownAct = await call("POST", `/api/physio/plans/${own}/activate`, S.sup);
    same("ن.٢٥ والمشرفُ يبدأ خطّتَه بنفسه: مراجَعةٌ أصلاً، ولا تنبيهَ مراجعة", [ownAct.json?.status, ownAct.json?.reviewStatus, (await outText("physio_plan_pending", own)).length], ["approved", "reviewed", 0]);
    same("ن.٢٦ والتعديلُ على المعتمَدة على البروتوكول غير المعتمَد ما زال يعيدها للاعتماد", (await call("PUT", `/api/physio/plans/${draftProto}`, S.spec, editBody())).json?.status, "pending");

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
