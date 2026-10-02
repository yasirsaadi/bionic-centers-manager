// تلغرامُ المرضى قناةً ثانية بجانب واتساب (§4.bl) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:patient-telegram`.  وتلغرامُ لا يُنادى: `fetch` يُستبدل بجاسوس.
//
// أ. الإصدار: الاستقبالُ يُصدر رمزاً لتلغرام وحده، والإصدارُ الجديد يسحب القديم، وغيرُ المخوَّل ٤٠٣.
// ب. الـwebhook: السرّ في الترويسة وحدها، و«ابدأ» بالرمز يربط ويستحقّ الترحيب، والرمزُ لمرّةٍ واحدة.
// ج. الإرسال: الترحيبُ والتحديثُ نصّاً على تلغرام — **وواتساب المعطَّل لا يُطالَب بصفّه ولا يُلمَس**.
// د. فكُّ الربط ⟵ لا رسالة.  هـ. الترحيل ٠٩٢: ماضي آب لا يُرسَل، وصفُّ واتساب لا يُمَسّ.

import express from "express";
import { createServer } from "http";
import { pool } from "../db";
import { registerRoutes } from "../routes";
import { dispatchOnce } from "../patient_notifications/dispatcher";
import { enqueueForActiveContacts } from "../patient_notifications/outbox";
import { sql as migration092 } from "../migrations/092_patient_telegram_relaunch";
import { db } from "../db";

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

const SECRET = "test-webhook-secret-value-0001";
process.env.PATIENT_TELEGRAM_BOT_TOKEN = "1234567:TEST-BOT-TOKEN-DO-NOT-USE";
process.env.PATIENT_TELEGRAM_BOT_USERNAME = "bionic_patient_test_bot";
process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = SECRET;
for (const k of Object.keys(process.env)) if (k.startsWith("PATIENT_WHATSAPP_")) delete process.env[k];
delete process.env.RENDER_EXTERNAL_URL;

const sent: { chatId: string; text: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const href = String(url);
  if (href.startsWith("https://api.telegram.org/")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (href.endsWith("/sendMessage")) sent.push({ chatId: String(body.chat_id), text: String(body.text) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  if (href.startsWith("https://graph.facebook.com/")) throw new Error("WhatsApp must not be called");
  return realFetch(url, init);
}) as any;

const PORT = 6898;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تلغرام-المرضى-٢";
const RECV = 9961, NOVIEW = 9962;
const S = {
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استقبال",
    permissions: { canViewPatients: true } },
  noview: { userId: NOVIEW, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استقبال٢",
    permissions: {} },
};
const FROM = 55501234567;

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any, headers: Record<string, string> = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(session ? { "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const hook = (text: string, withSecret = true) => http("POST", "/api/integrations/telegram/patient/webhook", null, {
  update_id: 1, message: { message_id: 1, from: { id: FROM, is_bot: false, first_name: "م" }, chat: { id: FROM, type: "private" }, date: 1, text },
}, withSecret ? { "x-telegram-bot-api-secret-token": SECRET } : {});

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
async function mkPatient(name: string) {
  const [p] = await q<{ id: number; patient_code: string }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',1,true,0,'new') RETURNING id, patient_code`, [`${MARK} ${name}`, MARK]);
  return p;
}
const linkOf = (deepLink: string) => decodeURIComponent(deepLink.split("?start=")[1] ?? "");

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'فرع ١') ON CONFLICT DO NOTHING`);
  for (const [id, u] of [[RECV, "tg2_recv"], [NOVIEW, "tg2_noview"]] as const) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x','استقبال','reception',1,'[1]'::jsonb,true) ON CONFLICT (id) DO UPDATE SET is_active=true`, [id, u]);
  }
  await q(`UPDATE system_users SET can_view_patients = (id = $1) WHERE id = ANY($2)`, [RECV, [RECV, NOVIEW]]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    const p = await mkPatient("أ");
    //  جهةُ واتساب كما ينشئها التسجيلُ اليوم، وصفُّ ترحيبها `pending` — واتساب معطَّل، فيبقى كما هو.
    const [wa] = await q(`INSERT INTO patient_contacts (patient_id, channel, relation, external_id, linked_at)
                          VALUES ($1,'whatsapp','self','9647701234567',NOW()) RETURNING id`, [p.id]);
    await q(`INSERT INTO patient_notification_deliveries (patient_id, patient_contact_id, channel, notification_type, payload)
             VALUES ($1,$2,'whatsapp','registration.welcome',$3::jsonb)`, [p.id, wa.id, JSON.stringify({ patientCode: p.patient_code })]);

    console.log("\n── أ. الإصدار ──");
    same("أ١. غيرُ المخوَّل (بلا عرض المرضى) ⟵ ٤٠٣",
      (await http("POST", `/api/patients/${p.id}/communication/link-tokens`, S.noview, { channel: "telegram", relation: "self" })).status, 403);
    same("أ٢. **رمزٌ لواتساب ⟵ ٤٠٠** (واتساب بلا ربط)",
      (await http("POST", `/api/patients/${p.id}/communication/link-tokens`, S.recv, { channel: "whatsapp", relation: "self" })).status, 400);
    const t1 = await http("POST", `/api/patients/${p.id}/communication/link-tokens`, S.recv, { channel: "telegram", relation: "self" });
    const t2 = await http("POST", `/api/patients/${p.id}/communication/link-tokens`, S.recv, { channel: "telegram", relation: "self" });
    check(t2.status === 201 && /^https:\/\/t\.me\/bionic_patient_test_bot\?start=/.test(t2.body?.telegramDeepLink ?? ""),
      "أ٣. الرمزُ رابطُ بوت المرضى", JSON.stringify(t2.body));
    const ttlH = (new Date(t2.body.expiresAt).getTime() - Date.now()) / 3_600_000;
    check(ttlH > 71 && ttlH <= 72, "أ٤. **صالحٌ ثلاثة أيام**", String(ttlH));
    same("أ٥. **والإصدارُ الجديد يسحب القديم** — تذكرةٌ معلَّقةٌ واحدة",
      (await q(`SELECT count(*)::int n FROM patient_link_tokens WHERE patient_id=$1 AND revoked_at IS NULL AND consumed_at IS NULL`, [p.id]))[0].n, 1);

    console.log("\n── ب. الـwebhook ──");
    sent.length = 0;
    same("ب١. **بلا سرّ ⟵ ٤٠١**", (await hook(`/start ${linkOf(t2.body.telegramDeepLink)}`, false)).status, 401);
    same("ب٢. الرمزُ المسحوب ⟵ لا ربط",
      [(await hook(`/start ${linkOf(t1.body.telegramDeepLink)}`)).status,
        (await q(`SELECT count(*)::int n FROM patient_contacts WHERE patient_id=$1 AND channel='telegram'`, [p.id]))[0].n], [200, 0]);
    same("ب٣. **«ابدأ» بالرمز الصالح ⟵ جهةُ تلغرام بمعرّفه**",
      [(await hook(`/start ${linkOf(t2.body.telegramDeepLink)}`)).status,
        (await q(`SELECT external_id FROM patient_contacts WHERE patient_id=$1 AND channel='telegram' AND revoked_at IS NULL`, [p.id])).map((r) => r.external_id)],
      [200, [String(FROM)]]);
    same("ب٤. **ومعها ترحيبٌ واحد على جهة تلغرام**",
      (await q(`SELECT notification_type FROM patient_notification_deliveries WHERE patient_id=$1 AND channel='telegram'`, [p.id])).map((r) => r.notification_type),
      ["registration.welcome"]);
    await hook(`/start ${linkOf(t2.body.telegramDeepLink)}`);
    same("ب٥. **والرمزُ لمرّةٍ واحدة** — إعادتُه لا تُنشئ جهةً ولا ترحيباً ثانياً",
      [(await q(`SELECT count(*)::int n FROM patient_contacts WHERE patient_id=$1 AND channel='telegram'`, [p.id]))[0].n,
        (await q(`SELECT count(*)::int n FROM patient_notification_deliveries WHERE patient_id=$1 AND channel='telegram'`, [p.id]))[0].n], [1, 1]);
    const status = await http("GET", `/api/patients/${p.id}/communication`, S.recv);
    same("ب٦. والبطاقةُ تقرأ «مرتبط»", (status.body?.activeContacts ?? []).filter((c: any) => c.channel === "telegram").length, 1);

    console.log("\n── ج. الإرسال ──");
    //  الربطُ يكبس العاملَ فيصل الترحيبُ في ثوانٍ — ودورةٌ إضافية لا تُرسل ثانية.
    await dispatchOnce();
    const welcomes = sent.filter((m) => m.chatId === String(FROM) && m.text.includes("عبر Telegram"));
    same("ج٠. **ترحيبٌ واحد** وإن تكرّرت الدورة", welcomes.length, 1);
    const welcome = welcomes[0];
    check(!!welcome && welcome.text.includes(p.patient_code) && welcome.text.includes("عبر Telegram")
      && !welcome.text.includes(MARK), "ج١. **الترحيبُ وصل تلغرام: الرمزُ بلا اسم**", JSON.stringify(welcome));
    same("ج٢. **وصفُّ واتساب لم يُلمَس** (معطَّل) — `pending` بلا محاولة",
      (await q(`SELECT status, attempt_count FROM patient_notification_deliveries WHERE patient_id=$1 AND channel='whatsapp'`, [p.id]))
        .map((r) => [r.status, r.attempt_count]), [["pending", 0]]);
    //  حدثُ تصنيع ⟵ صفٌّ لكلّ جهةٍ نشِطة (واتساب وتلغرام)، وتلغرام يُرسَل.
    const [ev] = await q(`INSERT INTO patient_events (patient_id, branch_id, event_type, payload) VALUES ($1,1,'manufacturing.ready_for_delivery',$2::jsonb) RETURNING id`,
      [p.id, JSON.stringify({ stage: "ready_for_fitting", serviceType: "prosthetic" })]);
    await db.transaction(async (tx) => {
      await enqueueForActiveContacts(tx as any, { patientId: p.id, patientEventId: Number(ev.id),
        notificationType: "manufacturing.ready_for_delivery", payload: { stage: "ready_for_fitting", serviceType: "prosthetic" } });
    });
    same("ج٣. **حدثٌ واحد ⟵ صفٌّ لكلّ قناة**",
      (await q(`SELECT channel FROM patient_notification_deliveries WHERE patient_event_id=$1 ORDER BY channel`, [ev.id])).map((r) => r.channel),
      ["telegram", "whatsapp"]);
    sent.length = 0;
    await Promise.all([dispatchOnce(), dispatchOnce()]);
    same("ج٤. **والتحديثُ يصل تلغرام مرّةً واحدة** ولو تزامنت دورتان",
      sent.filter((m) => m.text.includes("تحديث بخصوص") && m.text.includes(p.patient_code) && m.text.includes("جاهزاً للتجربة")).length, 1);

    console.log("\n── د. فكُّ الربط ──");
    const [tg] = await q(`SELECT id FROM patient_contacts WHERE patient_id=$1 AND channel='telegram' AND revoked_at IS NULL`, [p.id]);
    same("د١. فكُّ الربط من البطاقة", (await http("POST", `/api/patients/${p.id}/communication/contacts/${tg.id}/revoke`, S.recv, {})).status, 200);
    const [ev2] = await q(`INSERT INTO patient_events (patient_id, branch_id, event_type, payload) VALUES ($1,1,'manufacturing.delivered',$2::jsonb) RETURNING id`,
      [p.id, JSON.stringify({ stage: "delivered", serviceType: "prosthetic" })]);
    await db.transaction(async (tx) => {
      await enqueueForActiveContacts(tx as any, { patientId: p.id, patientEventId: Number(ev2.id),
        notificationType: "manufacturing.delivered", payload: { stage: "delivered", serviceType: "prosthetic" } });
    });
    sent.length = 0;
    await dispatchOnce();
    same("د٢. **بعد فكّ الربط لا رسالةَ تلغرام**", sent.length, 0);

    console.log("\n── هـ. الترحيل ٠٩٢ — ماضي آب ──");
    const old = await mkPatient("قديم");
    const [oc] = await q(`INSERT INTO patient_contacts (patient_id, channel, relation, external_id, linked_at)
                          VALUES ($1,'telegram','self','777','2026-08-15') RETURNING id`, [old.id]);
    const [ow] = await q(`INSERT INTO patient_contacts (patient_id, channel, relation, external_id, linked_at)
                          VALUES ($1,'whatsapp','self','9647700000000','2026-08-15') RETURNING id`, [old.id]);
    await q(`INSERT INTO patient_notification_deliveries (patient_id, patient_contact_id, channel, notification_type, payload, status)
             VALUES ($1,$2,'telegram','link.welcome','{}'::jsonb,'pending'), ($1,$3,'whatsapp','registration.welcome','{}'::jsonb,'skipped')`, [old.id, oc.id, ow.id]);
    await pool.query(migration092);
    same("هـ١. **صفُّ تلغرام القديم ⟵ `skipped`، وصفُّ واتساب المتخطّى كما هو**",
      (await q(`SELECT channel, status FROM patient_notification_deliveries WHERE patient_id=$1 ORDER BY channel`, [old.id])).map((r) => [r.channel, r.status]),
      [["telegram", "skipped"], ["whatsapp", "skipped"]]);
    same("هـ٢. **وجهةُ تلغرام القديمة مسحوبة، وجهةُ واتساب لا تُمَسّ**",
      (await q(`SELECT channel, revoked_at IS NOT NULL r FROM patient_contacts WHERE patient_id=$1 ORDER BY channel`, [old.id])).map((r) => [r.channel, r.r]),
      [["telegram", true], ["whatsapp", false]]);
    sent.length = 0;
    await dispatchOnce();
    same("هـ٣. ولا رسالةَ لمرضى آب", sent.filter((m) => m.chatId === "777").length, 0);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1)`, [[RECV, NOVIEW]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1)`, [[RECV, NOVIEW]]).catch(() => {});
    httpServer.close();
    globalThis.fetch = realFetch;
  }
  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}
main().catch(async (e) => {
  console.error(e);
  try { globalThis.fetch = realFetch; await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
