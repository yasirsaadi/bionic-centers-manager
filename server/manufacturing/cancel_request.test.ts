//  **طلبُ إلغاء أمر التصنيع وموافقةُ المدير، وإعادةُ فتح الملغى** (ترحيل ١٩٤، §4.gd — واقعةُ قحطان ياسين علوان ٢٠٢٦-١١-٠٨).
//
//  قولُ المالك: «لا تدع الخبير يلغي دون موافقة مدير الفرع أو المسؤول … ممكن أن يلغي لكن بمصادقة المدير». يثبت هذا الاختبار على النقاط
//  الحقيقية: الخبيرُ لا يلغي، يطلب بسببٍ إلزاميّ والأمرُ قائم (لا حالةَ ولا مرحلةَ تتغيّر) وتنبيهٌ للمدير؛ لا طلبان؛ لا يطلب غيرُ المسنَد؛
//  المديرُ لا «يطلب» بل يلغي؛ الرفضُ للمدير والمسؤول والسحبُ لصاحبه؛ والموافقةُ إلغاءٌ بسبب الطلب ومَن طلبه وتمحوه وتلغي الجهاز؛ وإعادةُ
//  الفتح للمسؤول وحده بسبب، تعيد الأمرَ في مرحلته وخبيره وتعيد الجهازَ «قيد التصنيع»، ولا تفتح ما أبطله تصحيحٌ إداريّ ولا ما قام بعده أمرٌ نشط.
//
//  حيٌّ على Postgres. التشغيل: `DATABASE_URL=… npm run test:order-cancel-request`
import { db } from "../db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../routes";

const PORT = 6051 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;

async function bootRealRoutes() {
  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));
  return httpServer;
}

async function post(path: string, session: any, body: any = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function get(path: string, session: any) {
  const res = await fetch(BASE + path, { headers: { "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") } });
  return { status: res.status, body: await res.json().catch(() => null) };
}

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, detail = "") => {
  if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m + (detail ? `\n      ${detail}` : "")); }
};
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m, `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);

async function main() {
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;
  const userIds: number[] = [], patientIds: number[] = [], orderIds: number[] = [], caseIds: number[] = [], epIds: number[] = [];
  const bA = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع أ " + t}) RETURNING id`)).id);
  const mkUser = async (role: string, name: string) => {
    const id = Number((await one(sql`
      INSERT INTO system_users (username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_view_patients)
      VALUES (${role + "_" + t + "_" + userIds.length}, 'x', ${name}, ${role}, ${bA}, ${JSON.stringify([bA])}::jsonb, true, true)
      RETURNING id`)).id);
    userIds.push(id);
    return id;
  };
  const X = await mkUser("prosthetics_expert", "عناد " + t);
  const Y = await mkUser("prosthetics_expert", "خبير آخر " + t);
  const M = await mkUser("branch_manager", "مدير " + t);
  const AD = await mkUser("admin", "المسؤول " + t);
  const ses = (userId: number, role: string, extra: any = {}) => ({
    userId, role, isAdmin: false, branchId: bA, accessibleBranches: [bA], displayName: "x", permissions: { canViewPatients: true }, ...extra,
  });
  const expert = ses(X, "prosthetics_expert");
  const other = ses(Y, "prosthetics_expert");
  const mgr = ses(M, "branch_manager");
  const admin = { userId: AD, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {}, displayName: "المسؤول" };

  const mkOrder = async (o: { status?: string; stage?: string; episode?: boolean; adminVoid?: boolean; episodeId?: number; patientId?: number }) => {
    let patient = o.patientId;
    if (!patient) {
      patient = Number((await one(sql`
        INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
        VALUES (${"قحطان " + t + " " + patientIds.length}, ${"0773" + t + patientIds.length}, ${bA}, true, 'اختبار', 40, 'بتر')
        RETURNING id`)).id);
      patientIds.push(patient);
    }
    let ep: number | null = o.episodeId ?? null;
    if (o.episode && !ep) {
      const c = Number((await one(sql`INSERT INTO patient_cases (patient_id, case_type, cost) VALUES (${patient}, 'prosthetic', 1500000) RETURNING id`)).id);
      caseIds.push(c);
      ep = Number((await one(sql`
        INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, agreed_cost)
        VALUES (${patient}, ${c}, ${bA}, 1, 'in_manufacturing', 1500000) RETURNING id`)).id);
      epIds.push(ep);
    }
    const id = Number((await one(sql`
      INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage, device_episode_id)
      VALUES (${patient}, ${bA}, 'prosthetic', 'initial_build', ${X}, ${o.status ?? "active"}, ${o.stage ?? "measurements"}, ${ep})
      RETURNING id`)).id);
    orderIds.push(id);
    if (o.adminVoid) await db.execute(sql`UPDATE prosthetic_work_orders SET admin_void_reversal_id = 999999 WHERE id = ${id}`);
    return { id, patient: patient!, ep };
  };
  const row = async (id: number) => one(sql`SELECT status, current_stage, cancel_requested_at, cancel_requested_by, cancel_request_note FROM prosthetic_work_orders WHERE id = ${id}`);
  const epRow = async (id: number) => one(sql`SELECT status, cancel_reason FROM patient_device_episodes WHERE id = ${id}`);
  const hist = async (id: number) => (await db.execute(sql`SELECT action_type, notes FROM prosthetic_work_history WHERE work_order_id = ${id} ORDER BY id`)).rows as any[];
  const maxOut = async () => Number((await one(sql`SELECT COALESCE(MAX(id),0) AS m FROM staff_notification_outbox`)).m);

  let srv: any = null;
  try {
    srv = await bootRealRoutes();
    const A = await mkOrder({ episode: true });

    console.log("\nأ — الخبيرُ لا يلغي، يطلب");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel`, expert, { note: "x" })).status, 403, "أ١. الخبيرُ لا يلغي مباشرةً (٤٠٣)");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request`, expert, { note: "   " })).status, 400, "أ٢. والطلبُ بلا سببٍ يُردّ (٤٠٠)");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request`, other, { note: "سبب" })).status, 403, "أ٣. وخبيرٌ غيرُ مسنَدٍ لا يطلب (٤٠٣)");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request`, mgr, { note: "سبب" })).status, 400, "أ٤. والمديرُ لا «يطلب» — يلغي مباشرةً");
    const m0 = await maxOut();
    const r1 = await post(`/api/manufacturing/orders/${A.id}/cancel-request`, expert, { note: "المريض سافر" });
    const w1 = await row(A.id);
    eq([r1.status, w1.status, w1.current_stage, w1.cancel_request_note, Number(w1.cancel_requested_by)], [200, "active", "measurements", "المريض سافر", X],
      "أ٥. **الطلبُ لا يلغي**: الأمرُ نشطٌ في مرحلته، والطلبُ بسببه وصاحبه");
    eq((await epRow(A.ep!)).status, "in_manufacturing", "أ٦. والجهازُ «قيد التصنيع» كما هو");
    const ob = (await db.execute(sql`SELECT event_type, text, link_path FROM staff_notification_outbox WHERE id > ${m0}`)).rows as any[];
    ok(ob.length === 1 && ob[0].event_type === "order_hold_rework" && /طلب إلغاء أمر التصنيع رقم/.test(ob[0].text) && /المريض سافر/.test(ob[0].text)
      && ob[0].link_path === `/manufacturing/orders/${A.id}`, "أ٧. وتنبيهٌ للمدير والمسؤول بالسبب ورابطِ الأمر", JSON.stringify(ob));
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request`, expert, { note: "ثانٍ" })).status, 409, "أ٨. ولا طلبان على أمرٍ واحد (٤٠٩)");
    const d = await get(`/api/manufacturing/orders/${A.id}`, expert);
    eq([d.body?.order?.cancelRequestNote, typeof d.body?.order?.cancelRequestedByName], ["المريض سافر", "string"], "أ٩. وصفحةُ الأمر تحمل الطلبَ واسمَ صاحبه");
    const list = await get(`/api/manufacturing/orders?branchId=${bA}`, mgr);
    ok(Boolean((list.body ?? []).find((o: any) => o.id === A.id)?.cancelRequestedAt), "أ١٠. وقائمةُ التصنيع تحمل شارةَ الطلب");

    console.log("\nب — الرفضُ للمدير، والسحبُ لصاحبه");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request/reject`, expert, {})).status, 403, "ب١. الخبيرُ لا يرفض (٤٠٣)");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request/reject`, mgr, { note: "أكمِل العمل" })).status, 200, "ب٢. والمديرُ يرفض");
    const w2 = await row(A.id);
    eq([w2.status, w2.cancel_requested_at, w2.cancel_request_note], ["active", null, null], "ب٣. فيُمحى الطلبُ ويستمرّ الأمر");
    ok((await hist(A.id)).some((h) => h.action_type === "cancel_request_rejected" && /أكمِل العمل/.test(h.notes)), "ب٤. والرفضُ سطرٌ في الخطّ الزمني");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request/reject`, mgr, {})).status, 409, "ب٥. ولا رفضَ بلا طلب (٤٠٩)");
    await post(`/api/manufacturing/orders/${A.id}/cancel-request`, expert, { note: "سبب ثانٍ" });
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request/withdraw`, mgr, {})).status, 403, "ب٥أ. ولا يسحبه غيرُ صاحبه (٤٠٣)");
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel-request/withdraw`, expert, {})).status, 200, "ب٦. وصاحبُ الطلب يسحبه");
    eq((await row(A.id)).cancel_requested_at, null, "ب٧. فيُمحى");

    console.log("\nج — الموافقةُ إلغاءٌ بسبب الطلب");
    await post(`/api/manufacturing/orders/${A.id}/cancel-request`, expert, { note: "المريض لا يريد الطرف" });
    eq((await post(`/api/manufacturing/orders/${A.id}/cancel`, mgr, {})).status, 200, "ج١. المديرُ يوافق («إلغاء الأمر»)");
    const w3 = await row(A.id);
    eq([w3.status, w3.cancel_requested_at, w3.current_stage], ["cancelled", null, "measurements"], "ج٢. فيُلغى الأمرُ في مرحلته ويُمحى الطلب");
    eq(await epRow(A.ep!), { status: "cancelled", cancel_reason: "المريض لا يريد الطرف" }, "ج٣. ويُلغى جهازُه بسبب الخبير");
    ok((await hist(A.id)).some((h) => h.action_type === "status_change" && /بموافقةٍ على طلب عناد/.test(h.notes) && /المريض لا يريد الطرف/.test(h.notes)),
      "ج٤. والسطرُ يقول إنها موافقةٌ على طلب الخبير بسببه");

    console.log("\nد — إعادةُ الفتح للمسؤول وحده");
    eq((await post(`/api/manufacturing/orders/${A.id}/reopen`, mgr, { reason: "x" })).status, 403, "د١. المديرُ لا يعيد الفتح (٤٠٣)");
    eq((await post(`/api/manufacturing/orders/${A.id}/reopen`, expert, { reason: "x" })).status, 403, "د٢. ولا الخبير");
    eq((await post(`/api/manufacturing/orders/${A.id}/reopen`, admin, { reason: " " })).status, 400, "د٣. والمسؤولُ بلا سبب يُردّ (٤٠٠)");
    eq((await post(`/api/manufacturing/orders/${A.id}/reopen`, admin, { reason: "أُلغي خطأً — المريض دفع" })).status, 200, "د٤. والمسؤولُ بسببٍ يعيد الفتح");
    const w4 = await row(A.id);
    eq([w4.status, w4.current_stage], ["active", "measurements"], "د٥. **فيعود نشطاً في مرحلته نفسِها**");
    eq(await epRow(A.ep!), { status: "in_manufacturing", cancel_reason: null }, "د٦. وجهازُه «قيد التصنيع» بلا سبب إلغاء");
    ok((await hist(A.id)).some((h) => h.action_type === "reopened" && /أُلغي خطأً/.test(h.notes)), "د٧. والإعادةُ سطرٌ بسببها");
    eq((await post(`/api/manufacturing/orders/${A.id}/reopen`, admin, { reason: "x" })).status, 409, "د٨. ولا يُعاد فتحُ أمرٍ غير ملغى (٤٠٩)");

    const V = await mkOrder({ status: "cancelled", adminVoid: true });
    eq((await post(`/api/manufacturing/orders/${V.id}/reopen`, admin, { reason: "x" })).status, 409, "د٩. ولا ما أبطله تصحيحٌ إداريّ (٤٠٩)");
    const B = await mkOrder({ status: "cancelled", episode: true });
    await db.execute(sql`UPDATE patient_device_episodes SET status = 'cancelled' WHERE id = ${B.ep}`);
    await mkOrder({ episodeId: B.ep!, patientId: B.patient });
    const rb = await post(`/api/manufacturing/orders/${B.id}/reopen`, admin, { reason: "x" });
    eq([rb.status, rb.body?.error, (await row(B.id)).status], [409, "لهذا الجهاز أمرُ تصنيعٍ آخر قيد العمل — لا يُفتح أمران له", "cancelled"],
      "د١٠. ولا ما قام بعده أمرٌ نشطٌ للجهاز نفسِه (٤٠٩ بسببه قبل قيد القاعدة) — ويبقى ملغى");
    //  أمرُ قحطان بعينه: أُلغي بالباب القديم «الحالة: cancelled» بلا مزامنة الجهاز (قبل #205) — والإعادةُ تفتحه.
    const Q = await mkOrder({ status: "cancelled", stage: "order_received" });
    eq([(await post(`/api/manufacturing/orders/${Q.id}/reopen`, admin, { reason: "قحطان دفع يوم ٩/٨" })).status, (await row(Q.id)).status], [200, "active"],
      "د١١. وأمرٌ ملغى بالباب القديم بلا جهازٍ مرتبط يُعاد فتحُه");
  } finally {
    if (srv) srv.close();
    const L = (xs: number[]) => sql.join((xs.length ? xs : [-1]).map((i) => sql`${i}`), sql`, `);
    await db.execute(sql`DELETE FROM prosthetic_work_history WHERE work_order_id IN (${L(orderIds)})`);
    await db.execute(sql`DELETE FROM patient_events WHERE patient_id IN (${L(patientIds)})`).catch(() => {});
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id IN (${L(orderIds)})`);
    await db.execute(sql`DELETE FROM patient_device_episodes WHERE id IN (${L(epIds)})`);
    await db.execute(sql`DELETE FROM patient_cases WHERE id IN (${L(caseIds)})`);
    await db.execute(sql`DELETE FROM patients WHERE id IN (${L(patientIds)})`);
    await db.execute(sql`DELETE FROM audit_log WHERE user_id IN (${L(userIds)})`).catch(() => {});
    await db.execute(sql`DELETE FROM system_users WHERE id IN (${L(userIds)})`);
    await db.execute(sql`DELETE FROM branches WHERE id = ${bA}`);
  }
  console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} نجح · ${fail} فشل`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
