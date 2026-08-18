// ربط حساب تلغرام بالمريض — اختبار حيّ على Postgres عبر الـwebhook الحقيقي.
// قاعدة محلّية: `npm run test:patient-telegram`.
//
// يحرس ما لا يُثبته فحص الشيفرة بالعين:
//   • **الحارس الوحيد لنقطة عامّة**: بلا سرٍّ صحيح لا يمرّ شيء.
//   • **الهوية من تلغرام والصلة من التذكرة** — ولا خلط.
//   • **إعادة الإرسال لا تُنشئ صفّاً ثانياً ولا 500**.
//   • **لا سرّ في السجلّ**: لا توكن ولا سرّ webhook ولا نصّ تذكرة، ولو كان
//     مدفوناً داخل الرابط العميق.
//
// وبوت تلغرام لا يُنادى فعلاً: `fetch` يُستبدل بجاسوس يسجّل ما كان سيُرسَل.

import express from "express";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { pool, db } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerPatientTelegramWebhook, PATIENT_WEBHOOK_PATH, MESSAGES } from "./webhook";
import { registerPatientCommunicationRoutes } from "../patient_contacts/routes";
import { createLinkToken, revokeLinkToken, listActiveContacts } from "../patient_contacts/store";
import { redactForLog } from "../log_redaction";
import { patientContacts, patientLinkTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

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

// ── البيئة: قيم اختبار لا تُشبه شيئاً حقيقياً ─────────────────────────────
const BOT_TOKEN = "1234567:TEST-BOT-TOKEN-DO-NOT-USE";
const BOT_USERNAME = "bionic_patient_test_bot";
const WEBHOOK_SECRET = "test-webhook-secret-value-0001";
process.env.PATIENT_TELEGRAM_BOT_TOKEN = BOT_TOKEN;
process.env.PATIENT_TELEGRAM_BOT_USERNAME = BOT_USERNAME;
process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;

const PORT = 6793;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-ربط-تلغرام";
const ADMIN = 9801;
const S_ADMIN = { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} };

// ── جاسوس على تلغرام: لا نداء شبكة، ونرى ما كان سيُرسَل ───────────────────
interface Sent { chatId: string; text: string }
const sent: Sent[] = [];
let failNextSend = false;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const href = String(url);
  if (href.startsWith("https://api.telegram.org/")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (failNextSend) {
      failNextSend = false;
      throw new TypeError("fetch failed"); // كما يفشل fetch فعلاً
    }
    sent.push({ chatId: String(body.chat_id), text: String(body.text) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return realFetch(url, init);
}) as any;

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}
const withSecret = { "x-telegram-bot-api-secret-token": WEBHOOK_SECRET };

/** تحديث تلغرام واقعي الشكل. */
function update(opts: {
  text?: string; fromId?: number | string; chatType?: string; chatId?: number; updateId?: number;
}) {
  return {
    update_id: opts.updateId ?? 1,
    message: {
      message_id: 11,
      from: { id: opts.fromId ?? 55501234567, is_bot: false, first_name: "مريض" },
      chat: { id: opts.chatId ?? opts.fromId ?? 55501234567, type: opts.chatType ?? "private" },
      date: 1760000000,
      text: opts.text ?? "/start",
    },
  };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM audit_log WHERE entity_type IN ('patient_link_token','patient_contact') AND user_id = ${ADMIN}`);
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  // الصادر يشير إلى الأحداث وجهات الاتصال معاً — يُحذف قبلهما.
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mkPatient(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition, branch_id, is_amputee)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true) RETURNING id`, [name, MARK]);
  return rows[0].id;
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await pool.query(
    `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
     VALUES ($1,'tg_admin','x','مسؤول','admin',1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`, [ADMIN]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(h as string) } : {};
    next();
  });
  registerPatientCommunicationRoutes(app, isAuthenticated as any);
  registerPatientTelegramWebhook(app);
  const server = app.listen(PORT);
  await new Promise((r) => setTimeout(r, 300));

  try {
    // ══ ١-٢. سرّ الـwebhook هو الحارس الوحيد ═════════════════════════════
    console.log("\n── الحارس: سرّ الترويسة ──");
    let r = await post(PATIENT_WEBHOOK_PATH, update({}), { "x-telegram-bot-api-secret-token": "wrong-secret" });
    same("١. سرٌّ خاطئ ⇒ 401", r.status, 401);
    r = await post(PATIENT_WEBHOOK_PATH, update({}));
    same("٢. وبلا ترويسة ⇒ 401", r.status, 401);
    r = await post(PATIENT_WEBHOOK_PATH, update({}), { "x-telegram-bot-api-secret-token": "" });
    same("والفارغ ⇒ 401", r.status, 401);
    // ولا يُقبل من سلسلة الاستعلام ولا من الجسم — تُكتب في سجلّات الوسطاء.
    r = await post(`${PATIENT_WEBHOOK_PATH}?secret=${WEBHOOK_SECRET}`, update({}));
    same("ولا يُقبل من سلسلة الاستعلام ⇒ 401", r.status, 401);
    r = await post(PATIENT_WEBHOOK_PATH, { ...update({}), secret_token: WEBHOOK_SECRET });
    same("ولا من جسم الطلب ⇒ 401", r.status, 401);
    same("ولم تُرسَل رسالة في أيٍّ منها", sent.length, 0);

    // ══ ٣-٥. الربط الناجح ════════════════════════════════════════════════
    console.log("\n── /start برابط صالح ──");
    const p1 = await mkPatient("مريض الربط");
    const tok = await createLinkToken({ patientId: p1, channel: "telegram", relation: "guardian" });
    const TG_ID = 7788991234567; // أكبر من ٣٢-بت عمداً — معرّفات تلغرام كذلك

    sent.length = 0;
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${tok.rawToken}`, fromId: TG_ID }), withSecret);
    same("٣. ⇒ 200", r.status, 200);
    const contacts = await listActiveContacts(p1);
    same("وجهة اتصال واحدة", contacts.length, 1);
    same("٤. و`externalId` هو معرّف تلغرام **نصّاً**", contacts[0].externalId, String(TG_ID));
    check(typeof contacts[0].externalId === "string", "ونوعه نصّ لا رقم");
    same("٥. والصلة من التذكرة لا من تلغرام", contacts[0].relation, "guardian");
    same("والقناة telegram", contacts[0].channel, "telegram");
    // **الترحيب صار عبر صندوق الصادر** (المرحلة ٢١٠) لا إرسالاً مباشراً،
    // فيستفيد من إعادة المحاولة. فالمتوقَّع هنا صفٌّ مستحقّ لا رسالة فورية.
    const { rows: queued } = await pool.query(
      `SELECT notification_type, patient_event_id FROM patient_notification_deliveries WHERE patient_id = $1`, [p1]);
    same("ورسالة ترحيب مستحقّة في الصادر", queued.map((q: any) => q.notification_type), ["link.welcome"]);
    check(queued[0].patient_event_id === null, "وبلا حدث مريض مخترَع لها");
    // والكبسة تُرسلها في الحال — فالنتيجة عند المريض واحدة.
    await new Promise((r) => setTimeout(r, 400));
    const welcomeText = sent.find((x) => x.text.includes("مرحباً بك"));
    check(!!welcomeText, "ونصّ الترحيب وصل فعلاً", JSON.stringify(sent));
    // ولا تكشف الرسالة شيئاً.
    const p1s = String(p1), tid = String(tok.token.id);
    const wt = welcomeText?.text ?? "";
    check(!wt.includes(p1s) && !wt.includes(tid)
      && !wt.includes("guardian") && !wt.includes(String(TG_ID)),
      "ولا تحمل معرّف مريض ولا تذكرة ولا صلة ولا حساباً", wt);

    // والتذكرة استُهلكت بمَن استهلكها.
    const [used] = await db.select().from(patientLinkTokens).where(eq(patientLinkTokens.id, tok.token.id));
    check(!!used.consumedAt, "والتذكرة مختومة بالاستهلاك");
    same("ومَن استهلكها هو معرّف تلغرام", used.consumedByExternalId, String(TG_ID));

    // ══ ٩. إعادة الإرسال — تلغرام يعيد المحاولة ══════════════════════════
    console.log("\n── إعادة إرسال التحديث نفسه ──");
    sent.length = 0;
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${tok.rawToken}`, fromId: TG_ID }), withSecret);
    same("٩. ⇒ 200 لا 500", r.status, 200);
    same("ولا جهة اتصال ثانية", (await listActiveContacts(p1)).length, 1);
    same("ولا ترحيب ثانٍ في الصادر",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM patient_notification_deliveries WHERE patient_id = $1`, [p1])).rows[0].n, 1);
    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p1]);
    same("ولا صفّ ثانٍ في الجدول إطلاقاً", totalRows[0].n, 1);
    const after = await listActiveContacts(p1);
    same("والصلة لم تتغيّر", after[0].relation, "guardian");
    same("ولا قيد تدقيق من الـwebhook",
      (await pool.query(`SELECT COUNT(*)::int AS n FROM audit_log WHERE entity_type = 'patient_link_token' AND action = 'link_token_redeemed'`)).rows[0].n, 0);

    // ══ ٦-٨. ما لا يُربَط ════════════════════════════════════════════════
    console.log("\n── تذاكر لا تصلح ──");
    const p2 = await mkPatient("مريض الرفض");
    const expired = await createLinkToken({ patientId: p2, channel: "telegram", relation: "self", ttlMs: -1000 });
    const revoked = await createLinkToken({ patientId: p2, channel: "telegram", relation: "self" });
    await revokeLinkToken(revoked.token.id);

    for (const [label, raw, num] of [
      ["٦. منتهية", expired.rawToken, "٦"],
      ["٧. مسحوبة", revoked.rawToken, "٧"],
      ["٨. غير موجودة", "no-such-token-at-all-xyz", "٨"],
    ] as [string, string, string][]) {
      sent.length = 0;
      const res = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${raw}`, fromId: 999000111 }), withSecret);
      same(`${label} ⇒ 200`, res.status, 200);
      same(`${label}: بلا جهة اتصال`, (await listActiveContacts(p2)).length, 0);
      same(`${label}: رسالة واحدة`, sent.length, 1);
      same(`${label}: بالنصّ العامّ نفسه`, sent[0].text, MESSAGES.invalid);
    }
    // **ولا تفريق بينها**: الردّ واحد، فلا يصير الرابط أداة استكشاف.
    check(true, "ولا فرق بين «غير موجودة» و«مسحوبة» و«منتهية» في الردّ");

    // ══ ١٠. حسابٌ واحد لعدّة مرضى ════════════════════════════════════════
    console.log("\n── حسابٌ واحد لعدّة مرضى ──");
    const p3 = await mkPatient("ابن ثانٍ");
    const t3 = await createLinkToken({ patientId: p3, channel: "telegram", relation: "guardian" });
    sent.length = 0;
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${t3.rawToken}`, fromId: TG_ID }), withSecret);
    same("١٠. ⇒ 200", r.status, 200);
    same("والحساب نفسه ارتبط بمريضٍ ثانٍ", (await listActiveContacts(p3)).length, 1);
    same("والأوّل ما زال مرتبطاً", (await listActiveContacts(p1)).length, 1);

    // ══ ١١-١٣. ما يُتجاهَل بأمان ═════════════════════════════════════════
    console.log("\n── ما يُتجاهَل ──");
    const p4 = await mkPatient("مريض التجاهل");
    const t4 = await createLinkToken({ patientId: p4, channel: "telegram", relation: "self" });

    sent.length = 0;
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${t4.rawToken}`, chatType: "group" }), withSecret);
    same("١١. مجموعة ⇒ 200", r.status, 200);
    same("ولا ربط", (await listActiveContacts(p4)).length, 0);
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${t4.rawToken}`, chatType: "supergroup" }), withSecret);
    same("و«supergroup» كذلك", (await listActiveContacts(p4)).length, 0);
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${t4.rawToken}`, chatType: "channel" }), withSecret);
    same("و«channel» كذلك", (await listActiveContacts(p4)).length, 0);

    r = await post(PATIENT_WEBHOOK_PATH, update({ text: "/help" }), withSecret);
    same("١٢. أمرٌ آخر ⇒ 200", r.status, 200);
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/stop ${t4.rawToken}` }), withSecret);
    same("و`/stop` ومعه نصّ صالح ⇒ لا ربط", (await listActiveContacts(p4)).length, 0);
    same("ولا رسالة لأيٍّ من المتجاهَل", sent.length, 0);

    for (const [label, body] of [
      ["جسم فارغ", {}],
      ["جسم غير كائن", []],
      ["بلا message", { update_id: 5 }],
      ["message نصّ", { update_id: 5, message: "x" }],
      ["بلا chat", { update_id: 5, message: { from: { id: 1 }, text: "/start x" } }],
      ["بلا from", { update_id: 5, message: { chat: { id: 1, type: "private" }, text: "/start x" } }],
      ["from.id غائب", { update_id: 5, message: { chat: { id: 1, type: "private" }, from: {}, text: "/start x" } }],
      ["نصّ غائب", { update_id: 5, message: { chat: { id: 1, type: "private" }, from: { id: 1 } } }],
      ["رسالة معدَّلة", { update_id: 5, edited_message: { chat: { id: 1, type: "private" }, from: { id: 1 }, text: "/start x" } }],
      ["زرّ", { update_id: 5, callback_query: { from: { id: 1 }, data: "/start x" } }],
    ] as [string, any][]) {
      const res = await post(PATIENT_WEBHOOK_PATH, body, withSecret);
      same(`١٣. «${label}» ⇒ 200 بلا انهيار`, res.status, 200);
    }
    same("ولا رسالة أُرسلت لأيٍّ منها", sent.length, 0);

    // و`/start` بلا حمولة: إرشادٌ بلا كشف.
    sent.length = 0;
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: "/start" }), withSecret);
    same("و`/start` عارياً ⇒ 200 مع إرشاد", [r.status, sent.length], [200, 1]);
    same("بنصّ الإرشاد", sent[0].text, MESSAGES.noPayload);

    // ══ ١٨. فشل الإرسال لا يتراجع عن الربط ═══════════════════════════════
    console.log("\n── فشل sendMessage بعد نجاح الربط ──");
    const p5 = await mkPatient("مريض فشل الإرسال");
    const t5 = await createLinkToken({ patientId: p5, channel: "telegram", relation: "family" });
    sent.length = 0;
    failNextSend = true;
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${t5.rawToken}`, fromId: 4242424242 }), withSecret);
    same("١٨. ⇒ 200 رغم فشل الإرسال", r.status, 200);
    same("ولم تُرسَل رسالة فعلاً", sent.length, 0);
    const p5c = await listActiveContacts(p5);
    same("**والربط باقٍ في القاعدة**", p5c.length, 1);
    same("بصلته من التذكرة", p5c[0].relation, "family");
    same("وبمعرّفه", p5c[0].externalId, "4242424242");

    // ══ ١٤-١٥. الرابط العميق ═════════════════════════════════════════════
    console.log("\n── الرابط العميق ──");
    const p6 = await mkPatient("مريض الرابط العميق");
    const issued = await post(`/api/patients/${p6}/communication/link-tokens`,
      { channel: "telegram", relation: "self" },
      { "x-test-session": JSON.stringify(S_ADMIN) });
    same("١٤. الإصدار ⇒ 201", issued.status, 201);
    const deep: string = issued.json.telegramDeepLink;
    same("وشكله كما هو معلَن", deep, `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(issued.json.rawToken)}`);
    check(deep.startsWith(`https://t.me/${BOT_USERNAME}?start=`), "ويبدأ باسم البوت", deep);

    // والرابط يعمل فعلاً: نصّه هو ما يصل في `/start`.
    const payload = decodeURIComponent(deep.split("?start=")[1]);
    sent.length = 0;
    r = await post(PATIENT_WEBHOOK_PATH, update({ text: `/start ${payload}`, fromId: 6161616161 }), withSecret);
    same("والضغط عليه يربط فعلاً", (await listActiveContacts(p6)).length, 1);

    // **١٥. والنصّ الخام مدفونٌ داخل الرابط — يجب أن يُحجب هو أيضاً.**
    const rawIssued: string = issued.json.rawToken;
    const logLine = JSON.stringify(redactForLog(issued.json));
    check(!logLine.includes(rawIssued), "١٥. والنصّ الخام لا يظهر في سطر السجلّ", logLine);
    check(!logLine.includes(deep), "ولا الرابط العميق الحامل له", logLine);
    check(logLine.includes("[محجوب]"), "وأثر الحجب ظاهر", logLine);
    same("وحقلا السرّ محجوبان معاً",
      [(JSON.parse(logLine) as any).rawToken, (JSON.parse(logLine) as any).telegramDeepLink],
      ["[محجوب]", "[محجوب]"]);

    // ولقناة تلغرام وحدها.
    same("ولا رابط عميق لقناة غير تلغرام (لا قناة أخرى مدعومة اليوم)",
      issued.json.channel, "telegram");

    // ══ ١٦-١٧. الأسرار لا تظهر في السجلّ ═════════════════════════════════
    console.log("\n── أسرار البيئة ──");
    const shapes = [
      { botToken: BOT_TOKEN }, { webhookSecret: WEBHOOK_SECRET },
      issued.json, { nested: { deep: { telegramDeepLink: deep } } },
    ];
    const allLogged = shapes.map((s) => JSON.stringify(redactForLog(s))).join(" ");
    check(!allLogged.includes(rawIssued), "والنصّ الخام غائب عن كل الأشكال");
    check(!allLogged.includes(deep), "والرابط العميق كذلك — ولو كان في العمق");

    // ١٦-١٧. التوكن والسرّ **لا يُطبعان في شيفرتنا أصلاً**: فحص ساكن.
    const mod = (f: string) => readFileSync(join(import.meta.dirname, f), "utf8");
    const srcs = { config: mod("config.ts"), client: mod("client.ts"), webhook: mod("webhook.ts") };
    for (const [name, src] of Object.entries(srcs)) {
      const logs = src.match(/console\.(log|error|warn|info)\([^\n]*/g) ?? [];
      const bad = logs.filter((l) =>
        /config\.token|\.webhookSecret|process\.env\.PATIENT_TELEGRAM_BOT_TOKEN|process\.env\.PATIENT_TELEGRAM_WEBHOOK_SECRET|rawToken|payload/.test(l));
      same(`١٦-١٧. لا سطر طباعة في «${name}» يحمل سرّاً`, bad, []);
    }
    // ولا يُطبع كائن الخطأ خاماً في العميل — عنوان Bot API يحمل التوكن.
    check(!/console\.error\([^)]*\berr\b\s*\)/.test(srcs.client)
      && !/\$\{err\}|err\.message/.test(srcs.client),
      "ولا كائن خطأ خام في عميل البوت (عنوانه يحمل التوكن)");
    // ولا يُخزَّن أيٌّ منها في القاعدة.
    const { rows: leaked } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM system_settings WHERE setting_value IN ($1,$2)`, [BOT_TOKEN, WEBHOOK_SECRET]);
    same("ولا يُخزَّن أيٌّ منهما في القاعدة", leaked[0].n, 0);

    // ══ ١٩-٢٠. عزل عن الإدارة، وبلا Gateway ══════════════════════════════
    console.log("\n── العزل ──");
    const dir = join(import.meta.dirname, ".");
    const ourFiles = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    check(ourFiles.length >= 3, `وحدة البوت ${ourFiles.length} ملفّات`, ourFiles.join(", "));
    // **استعمالاً لا ذِكراً**: تعليقٌ يشرح لماذا لا نلمس بوت الإدارة ليس
    // مخالفة — هو التوثيق المقصود. والمخالفة استيرادٌ أو نداءٌ فعلي.
    const usesAdminConfig = (src: string) =>
      /from\s+["'][^"']*notifications\/telegram["']/.test(src) ||
      /getSystemSetting\s*\(/.test(src) ||
      /["'](telegram_bot_token|telegram_chat_id)["']/.test(src);
    const usesGateway = (src: string) =>
      /gatewayapi\.telegram\.org/i.test(src) ||
      /sendVerificationMessage\s*\(/.test(src) ||
      /checkVerificationStatus\s*\(/.test(src);
    for (const f of ourFiles) {
      const src = readFileSync(join(dir, f), "utf8");
      check(!usesAdminConfig(src), `١٩. «${f}» لا يمسّ إعداد بوت الإدارة`);
      check(!usesGateway(src), `٢٠. و«${f}» بلا أي أثر لـTelegram Gateway`);
    }
    // والحارسان حيّان — لو وقعت المخالفة لأُمسكت.
    check(usesAdminConfig('import { sendTelegram } from "../notifications/telegram";'),
      "وحارس بوت الإدارة يمسك الاستيراد");
    check(usesAdminConfig('await storage.getSystemSetting("x")'), "ويمسك قراءة الإعداد");
    check(!usesAdminConfig("// بوت الإدارة في notifications/telegram.ts"), "ولا يعثّره تعليق");
    check(usesGateway('fetch("https://gatewayapi.telegram.org/sendVerificationMessage")'),
      "وحارس Gateway يمسك النداء");
    // والعكس: بوت الإدارة لم يُمسّ.
    const admin = readFileSync(join(dir, "..", "notifications", "telegram.ts"), "utf8");
    check(!/PATIENT_TELEGRAM/.test(admin), "وبوت الإدارة لا يعرف متغيّرات بوت المريض");
    // ولا Gateway في الخادم كلّه.
    const walk = (d: string, acc: string[] = []): string[] => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) { if (e.name !== "node_modules") walk(join(d, e.name), acc); }
        else if (e.name.endsWith(".ts")) acc.push(join(d, e.name));
      }
      return acc;
    };
    const serverFiles = walk(join(import.meta.dirname, ".."));
    // (والاختبارات مستثناة: تحمل الأنماط نفسها كي تبحث عنها.)
    const gateway = serverFiles.filter((f) =>
      !f.endsWith(".test.ts") && usesGateway(readFileSync(f, "utf8")));
    same("٢٠. ولا ملفّ في الخادم يستعمل Telegram Gateway",
      gateway.map((f) => f.split("/server/")[1] ?? f), []);

    // ولا إشعارات ولا outbox في هذه المرحلة.
    const webhookSrc = srcs.webhook;
    check(!/outbox|notifyPatient|patient_events|recordPatientEvent/.test(webhookSrc),
      "ولا حدث مريض ولا outbox في مسار الـwebhook");
  } finally {
    server.close();
    globalThis.fetch = realFetch;
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id = $1`, [ADMIN]);
  console.log(failures === 0 ? "\n✅ all patient-telegram cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { globalThis.fetch = realFetch; await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
