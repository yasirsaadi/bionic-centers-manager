// **القالبُ الاختباري** (قرارُ المالك ٢٠٢٦-١٠-٠٥، ترحيل ٠٩٧، §4.bz) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:trial-socket`.
//
//   • **أ**: الخبيرُ يسلّم قالباً اختبارياً — لا تسليمَ ولا إغلاق: توقّفٌ «بانتظار المريض» بسببه، والمرحلةُ والحلقةُ كما هما،
//     وزيارةُ حضور، وسطرٌ في الخطّ الزمني، وحدثٌ للمريض بموعد النهائي وحده.
//   • **ب**: الحرّاس — الموعدُ إلزاميٌّ صالح، والاستقبالُ لا يسلّمه، ولا قالبَ ثانٍ فوق منتظِر، ولا لغير بناءٍ أوّليٍّ لطرف في مرحلته.
//   • **ج**: العذرُ أصفر — المتأخّرُ بانتظار القالب النهائي «متأخّرٌ بعذر».
//   • **د**: صفحةُ المريض وقائمةُ الاتصال — `trialAwaiting` وموعدُه، ومَن يُتّصل به اليوم، والخبيرُ خارجها.
//   • **هـ**: الاتصال — للاستعلامات لا للخبير، بنتيجةٍ وموعدٍ صالح، فيخرج من «اليوم».
//   • **و**: العودة — للاستعلامات في نطاقها، الأمرُ نفسُه نشطٌ لخبيره والعذرُ باقٍ، وزيارةُ «عودة للقالب النهائي»، ومرّةً واحدة.
//   • **ز**: التكرار ثمّ التسليمُ النهائيّ يُغلق كالمعتاد · والاستئنافُ المباشر من الخبير يُخرجه من الانتظار.
//   • **ح**: قيدُ القاعدة · **ط**: المنطقُ الخالص.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { renderNotification } from "./patient_notifications/render";
import { latenessOf } from "@shared/manufacturing";
import { isValidTrialDate, trialCallState, trialAwaitingOrders } from "@shared/trial_socket";
import { baghdadTodayYmd } from "@shared/visit_date";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6891;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-القالب-الاختباري";
const ADMIN = 9961, RECV = 9962, EXPERT = 9963, RECV2 = 9964;
const USERS = [ADMIN, RECV, EXPERT, RECV2];

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2], displayName: "المسؤول", permissions: {} },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "ريام", permissions: { canAddPatients: true, canViewPatients: true } },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "عناد", permissions: {} },
  other: { userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2], displayName: "استقبال آخر", permissions: { canAddPatients: true, canViewPatients: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const TODAY = baghdadTodayYmd();

/** مريضٌ وحالتُه وحلقتُه في التصنيع وأمرُه — في «جاهز للتجربة والتسليم» بموعدٍ مضى (متأخّر). */
async function mkOrder(label: string, o: { serviceType?: string; purpose?: string; stage?: string; branchId?: number } = {}) {
  const st = o.serviceType ?? "prosthetic";
  const br = o.branchId ?? 1;
  const [p] = await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',$3,$4,$5,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, br, st === "prosthetic", st !== "prosthetic"]);
  const [c] = await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [p.id, br, st]);
  const [e] = await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, created_by)
     VALUES ($1,$2,$3,1,'in_manufacturing',0,$4) RETURNING id`, [p.id, c.id, br, ADMIN]);
  const [w] = await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, purpose, status,
       current_stage, device_episode_id, expected_delivery_date, assigned_by)
     VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8,$9) RETURNING id`,
    [p.id, br, EXPERT, st, o.purpose ?? "initial_build", o.stage ?? "ready_for_fitting", e.id, addDays(TODAY, -3), ADMIN]);
  return { patientId: Number(p.id), episodeId: Number(e.id), orderId: Number(w.id) };
}
async function orderRow(id: number) {
  const [r] = await q(`SELECT status, current_stage, hold_reason_code, hold_note, trial_socket_count::int AS n,
      trial_final_date::text AS fd, trial_last_call_note AS cn, (trial_last_call_at IS NOT NULL) AS called, completed_at IS NOT NULL AS done
    FROM prosthetic_work_orders WHERE id=$1`, [id]);
  return r;
}
const visitsOf = async (pid: number) =>
  (await q(`SELECT details FROM visits WHERE patient_id=$1 AND deleted_at IS NULL ORDER BY id`, [pid])).map((v) => v.details);
const historyOf = async (oid: number) =>
  (await q(`SELECT action_type FROM prosthetic_work_history WHERE work_order_id=$1 ORDER BY id`, [oid])).map((h) => h.action_type);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM staff_notification_outbox WHERE text LIKE $1`, [`%${MARK}%`]).catch(() => undefined);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`).catch(() => undefined);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`).catch(() => undefined);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, own] of [
    [ADMIN, "admin", "المسؤول", [1, 2]], [RECV, "reception", "ريام", [1]],
    [EXPERT, "prosthetics_expert", "عناد", [1]], [RECV2, "reception", "استقبال آخر", [2]],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `ts_u${id}`, role, name, own[0], JSON.stringify(own)]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  const trial = (id: number, body: any, s: any = S.expert) => http("POST", `/api/manufacturing/orders/${id}/trial-socket`, s, body);
  const call = (id: number, body: any, s: any = S.recv) => http("POST", `/api/manufacturing/orders/${id}/trial-call`, s, body);
  const back = (id: number, s: any = S.recv) => http("POST", `/api/manufacturing/orders/${id}/trial-return`, s, {});

  try {
    const A = await mkOrder("أ");
    const final1 = addDays(TODAY, 1);

    console.log("\n── ب. الحرّاس قبل الكتابة ──");
    const before = [await orderRow(A.orderId), await visitsOf(A.patientId)];
    const bad = [
      await trial(A.orderId, {}),
      await trial(A.orderId, { finalDate: addDays(TODAY, -1) }),
      await trial(A.orderId, { finalDate: addDays(TODAY, 400) }),
      await trial(A.orderId, { finalDate: "2026-02-30" }),
    ];
    same("ب١. **موعدُ القالب النهائي إلزاميٌّ صالح** — بلا موعد / ماضٍ / أبعدُ من سنة / يومٌ لا يوجد ⟵ ٤٠٠",
      bad.map((r) => r.status), [400, 400, 400, 400]);
    same("ب٢. **الاستقبالُ لا يسلّم القالب** — ٤٠٣", (await trial(A.orderId, { finalDate: final1 }, S.recv)).status, 403);
    same("ب٣. **وصفرُ كتابة** من كلّ ما رُدّ", [await orderRow(A.orderId), await visitsOf(A.patientId)], before);
    const M = await mkOrder("صيانة", { purpose: "maintenance", stage: "new_assignment" });
    const SUP = await mkOrder("مسند", { serviceType: "medical_support" });
    const EARLY = await mkOrder("مبكّر", { stage: "manufacturing" });
    same("ب٤. **ولا لأمر صيانة ولا لمسند ولا قبل «جاهز للتجربة والتسليم»** — ٤٠٩",
      [(await trial(M.orderId, { finalDate: final1 })).status, (await trial(SUP.orderId, { finalDate: final1 })).status,
       (await trial(EARLY.orderId, { finalDate: final1 })).status], [409, 409, 409]);

    console.log("\n── أ. الخبيرُ يسلّم قالباً اختبارياً ──");
    const r1 = await trial(A.orderId, { finalDate: final1, note: "غير جاهز بعد" });
    check(r1.status === 200, "أ١. **«تسليم قالب اختباري» يُحفَظ**", JSON.stringify(r1.body));
    same("أ٢. **لا تسليمَ ولا إغلاق**: بانتظار المريض بسبب القالب، والمرحلةُ كما هي، والموعدُ والعدّاد",
      await orderRow(A.orderId),
      { status: "waiting_patient", current_stage: "ready_for_fitting", hold_reason_code: "trial_socket", hold_note: "غير جاهز بعد",
        n: 1, fd: final1, cn: null, called: false, done: false });
    const [ep] = await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [A.episodeId]);
    same("أ٣. **والحلقةُ ما زالت في التصنيع**", ep.status, "in_manufacturing");
    same("أ٤. **وزيارةُ حضور «تسليم قالب اختباري»** وسطرُ الخطّ الزمني", [await visitsOf(A.patientId), (await historyOf(A.orderId)).slice(-1)],
      [["تسليم قالب اختباري"], ["trial_socket"]]);
    const evs = await q(`SELECT event_type, payload, visibility FROM patient_events WHERE patient_id=$1 ORDER BY id`, [A.patientId]);
    same("أ٥. **وحدثٌ للمريض بموعد القالب النهائي وحده**", evs.map((e) => [e.event_type, e.payload, e.visibility]),
      [["manufacturing.trial_socket_delivered", { finalDate: final1 }, "patient"]]);
    const text = renderNotification("manufacturing.trial_socket_delivered", { finalDate: final1, serviceType: "prosthetic" }) ?? "";
    check(/القالب الاختباري/.test(text) && /موعد القالب النهائي/.test(text),
      "أ٦. **ونصُّه يقول إنه استلم ومتى النهائي**", text);
    same("أ٧. **ولا قالبَ ثانٍ فوق منتظِر** — ٤٠٩", (await trial(A.orderId, { finalDate: final1 })).status, 409);

    console.log("\n── ج. العذرُ أصفر ──");
    const list = await http("GET", "/api/manufacturing/orders", S.admin);
    const card = (list.body ?? []).find((o: any) => o.id === A.orderId);
    same("ج١. **متأخّرٌ بعذر** لا بدونه", card ? latenessOf({ isOverdue: card.isOverdue, holdReasonCode: card.holdReasonCode }) : null, "late_excused");

    console.log("\n── د. صفحةُ المريض وقائمةُ الاتصال ──");
    const po = await http("GET", `/api/manufacturing/patient/${A.patientId}/orders`, S.recv);
    const mine = trialAwaitingOrders(po.body ?? []);
    same("د١. **صفحةُ المريض تقول إنه ينتظر القالب النهائي** وموعدَه", mine.map((o: any) => [o.id, o.trialFinalDate, o.trialSocketCount]),
      [[A.orderId, final1, 1]]);
    const ta = await http("GET", "/api/manufacturing/trial-awaiting", S.recv);
    same("د٢. **قائمةُ الاتصال**: الموعدُ غداً ⟵ «ذكّره بموعده»",
      (ta.body ?? []).filter((r: any) => r.orderId === A.orderId).map((r: any) => r.callState), ["before"]);
    same("د٣. **وفرعٌ آخر لا يراه، والخبيرُ خارجها**",
      [((await http("GET", "/api/manufacturing/trial-awaiting", S.other)).body ?? []).some((r: any) => r.orderId === A.orderId),
       (await http("GET", "/api/manufacturing/trial-awaiting", S.expert)).status], [false, 403]);

    console.log("\n── د′. لوحةُ التصنيع — للمسؤول وللخبير على أوامره (طلبُ المالك ٢٠٢٦-١٠-٠٥) ──");
    const pick = (list: any[]) => (list ?? []).filter((o: any) => o.id === A.orderId)
      .map((o: any) => [o.trialAwaiting, o.trialFinalDate, o.trialSocketCount, o.trialCallState]);
    same("د٤. **المسؤولُ يرى في اللوحة أنه ينتظر النهائي** وموعدَه، وما تفعله الاستعلاماتُ اليوم",
      pick((await http("GET", "/api/manufacturing/orders", S.admin)).body), [[true, final1, 1, "before"]]);
    same("د٥. **والخبيرُ في «أوامري» يرى الشيءَ نفسَه** — ليرتّب أمره",
      pick((await http("GET", "/api/manufacturing/my-orders", S.expert)).body), [[true, final1, 1, "before"]]);

    console.log("\n── هـ. الاتصال ──");
    same("هـ١. **الخبيرُ لا يتّصل** — ٤٠٣", (await call(A.orderId, { note: "x", nextDate: final1 }, S.expert)).status, 403);
    same("هـ٢. **بلا نتيجة أو بموعدٍ ماضٍ ⟵ ٤٠٠**",
      [(await call(A.orderId, { note: " ", nextDate: final1 })).status, (await call(A.orderId, { note: "لم يرد", nextDate: addDays(TODAY, -1) })).status],
      [400, 400]);
    const final2 = addDays(TODAY, 5);
    same("هـ٣. الاتصالُ يُحفَظ", (await call(A.orderId, { note: "طلب التأجيل", nextDate: final2 })).status, 200);
    const afterCall = await orderRow(A.orderId);
    same("هـ٤. **الموعدُ الجديد ونتيجةُ الاتصال**، والانتظارُ قائم", [afterCall.status, afterCall.fd, afterCall.cn, afterCall.called],
      ["waiting_patient", final2, "طلب التأجيل", true]);
    same("هـ٥. **ويخرج من «اليوم»** حتى يقترب موعدُه الجديد",
      ((await http("GET", "/api/manufacturing/trial-awaiting", S.recv)).body ?? []).filter((r: any) => r.orderId === A.orderId).map((r: any) => r.callState),
      [null]);

    console.log("\n── و. العودة للقالب النهائي ──");
    same("و١. **الخبيرُ وفرعٌ لا يصل الملفّ لا يسجّلان العودة** — ٤٠٣", [(await back(A.orderId, S.expert)).status, (await back(A.orderId, S.other)).status], [403, 403]);
    const rb = await back(A.orderId);
    check(rb.status === 200, "و٢. **الاستعلاماتُ تسجّل العودة**", JSON.stringify(rb.body));
    const ret = await orderRow(A.orderId);
    same("و٣. **الأمرُ نفسُه نشطٌ لخبيره** — والعذرُ باقٍ، والمرحلةُ كما هي، ولا إغلاق",
      [ret.status, ret.hold_reason_code, ret.current_stage, ret.done], ["active", "trial_socket", "ready_for_fitting", false]);
    same("و٤. **وزيارةُ «عودة للقالب النهائي»** وسطرُها", [(await visitsOf(A.patientId)).slice(-1), (await historyOf(A.orderId)).slice(-1)],
      [["عودة للقالب النهائي"], ["trial_return"]]);
    same("و٥. **ومرّةً واحدة** — الثانية ٤٠٩، والاتصالُ بعدها ٤٠٩", [(await back(A.orderId)).status, (await call(A.orderId, { note: "x", nextDate: final2 })).status], [409, 409]);
    same("و٦. **ولا يبقى في صفحة المريض ولا في القائمة**",
      [trialAwaitingOrders((await http("GET", `/api/manufacturing/patient/${A.patientId}/orders`, S.recv)).body ?? []).length,
       ((await http("GET", "/api/manufacturing/trial-awaiting", S.recv)).body ?? []).some((r: any) => r.orderId === A.orderId)], [0, false]);

    console.log("\n── ز. التكرارُ ثمّ النهائي ──");
    same("ز١. **قالبٌ اختباريٌّ ثانٍ** — «المريض غير جاهز بعد»", [(await trial(A.orderId, { finalDate: final2 })).status, (await orderRow(A.orderId)).n], [200, 2]);
    same("ز٢. **وإن حضر إلى الخبير مباشرةً**: «إلغاء التوقّف» يُخرجه من الانتظار",
      [(await http("POST", `/api/manufacturing/orders/${A.orderId}/resume`, S.expert, {})).status,
       trialAwaitingOrders((await http("GET", `/api/manufacturing/patient/${A.patientId}/orders`, S.recv)).body ?? []).length], [200, 0]);
    const live = (await http("GET", `/api/manufacturing/orders/${A.orderId}`, S.expert)).body?.order;
    const fin = await http("PATCH", `/api/manufacturing/orders/${A.orderId}/advance`, S.expert,
      { toStage: "delivered", finalResult: "first_fit_success" });
    check(fin.status === 200 && live?.status === "active", "ز٣. **التسليمُ النهائيّ** من «الانتقال للمرحلة التالية»", JSON.stringify(fin.body));
    const done = await orderRow(A.orderId);
    const [ep2] = await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [A.episodeId]);
    same("ز٤. **ويُغلق كالمعتاد**: مكتمل، والعذرُ انتهى، والحلقةُ سُلّمت",
      [done.status, done.hold_reason_code, done.done, ep2.status], ["completed", null, true, "delivered"]);

    console.log("\n── ح. قيدُ القاعدة ──");
    let rejected = false;
    try {
      await q(`UPDATE prosthetic_work_orders SET status='waiting_patient', hold_reason_code='trial_socket', trial_final_date=NULL WHERE id=$1`, [EARLY.orderId]);
    } catch { rejected = true; }
    check(rejected, "ح١. **انتظارُ القالب النهائي بلا موعد ترفضه القاعدة** (`trial_socket_shape_check`)");

    console.log("\n── ط. المنطقُ الخالص ──");
    const d = "2026-10-10";
    same("ط١. حالةُ الاتصال: قبل اليوم السابق / اليوم السابق / يومُه / بعده / اتّصل قبله / اتّصل بعده",
      [trialCallState(d, null, "2026-10-08"), trialCallState(d, null, "2026-10-09"), trialCallState(d, null, d),
       trialCallState(d, null, "2026-10-11"), trialCallState(d, "2026-10-09", d), trialCallState(d, "2026-10-11", "2026-10-12")],
      [null, "before", "before", "missed", null, null]);
    same("ط٢. وفاته موعدُه بعد اتصالٍ قديم ⟵ «فاته»", trialCallState(d, "2026-10-05", "2026-10-11"), "missed");
    same("ط٣. صلاحيةُ الموعد", [isValidTrialDate("2026-10-10", "2026-10-10"), isValidTrialDate("2026-10-09", "2026-10-10"),
      isValidTrialDate("2027-10-11", "2026-10-10"), isValidTrialDate("2026-02-29", "2026-01-01"), isValidTrialDate(null, "2026-10-10")],
      [true, false, false, false, false]);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM staff_notification_outbox WHERE target_user_id = ANY($1::int[])`, [USERS]).catch(() => undefined);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص القالب الاختباري نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
