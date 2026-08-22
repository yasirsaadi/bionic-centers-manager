// واتساب المريض — حيّاً على النقاط الحقيقية وعلى Postgres، **بلا شبكة Meta**.
// قاعدة محلّية: `npm run test:whatsapp`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) **القنوات**: `whatsapp` و`telegram` مقبولتان، وما عداهما مرفوض.
// (ب) **الرابط العميق**: إلى رقم المركز، وبأمر الربط، **ولا يُخزَّن النصّ
//     الخام في القاعدة إطلاقاً** — وإعدادٌ ناقص لا يعطي رابطاً يُعرَض.
// (ج) **تحقّق GET**: التحدّي يمرّ بالسرّ الصحيح، ويُردّ بغيره.
// (د) **توقيع POST**: التوقيع الخاطئ يُردّ ٤٠١، والصحيح يمرّ.
// (هـ) **الربط**: «ربط <token>» ⟶ جهة واتساب واحدة + استهلاك التذكرة +
//     صفوفُ الترحيب/اللقطة **لتلك الجهة**.
// (و) **الإعادة**: تذكرةٌ مُستهلَكة لا تُنشئ جهةً ثانية.
// (ز) **الهويّة من المزوّد** لا من هاتف الملفّ ولا من جسم الطلب.
// (ح) **«رمزي»**: الرمزُ وحده — ولا اسم ولا تشخيص ولا جهاز ولا مال.
// (ط) **حدثُ تصنيع بجهتين** ⟶ صفّان، واحدٌ لكلّ جهة بقناتها.
// (ي) **العامل** يرسل كلَّ صفٍّ بناقله هو.
// (ك) رسالةُ الربط بوضع **النصّ**، و(ل) تحديثُ التصنيع بوضع **القالب**.
// (م) **فشلُ Meta**: المعاملةُ التجارية ثابتة، والصفُّ فاشلٌ برمزٍ محدود،
//     والتباعدُ سليم.
// (ع) **تلغرام القديم يبقى مقروءاً وقابلاً للإرسال**.
// (ف) **ولا حقل سريريّ ولا ماليّ ولا داخليّ في أي حمولة تخرج**.

import express from "express";
import { createHmac } from "crypto";
import { pool, db } from "../db";
import { registerPatientWhatsappWebhook, WHATSAPP_WEBHOOK_PATH, WHATSAPP_MESSAGES } from "./webhook";
import {
  patientWhatsappDeepLink, patientWhatsappConfig, patientWhatsappEnabled,
  patientWhatsappTemplateReady, missingPatientWhatsappEnv, normalizeWhatsappId,
  PATIENT_WHATSAPP_ENV, LINK_COMMAND,
} from "./config";
import { createLinkToken, isContactChannel, CONTACT_CHANNELS, hashToken } from "../patient_contacts/store";
import { enqueueForActiveContacts, enqueueForContact, deliveriesForPatient, claimDue, backoffFor } from "../patient_notifications/outbox";
import { enabledChannels, transportFor } from "../patient_notifications/transports";
import { dispatchOnce } from "../patient_notifications/dispatcher";
import { renderNotification, LINK_NOTIFICATION_TYPES, isLinkNotificationType } from "../patient_notifications/render";
import { PATIENT_EVENT_TYPES } from "@shared/patient_events";

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

// ── إعدادٌ وهميّ: لا سرَّ حقيقيّ، ولا نداءَ شبكة ─────────────────────────
const ACCESS_TOKEN = "TEST-WA-ACCESS-TOKEN-DO-NOT-USE";
const PHONE_NUMBER_ID = "111222333444555";
const BUSINESS_PHONE = "9647700000000";
const VERIFY_TOKEN = "test-wa-verify-token-0062";
const APP_SECRET = "test-wa-app-secret-0062";
const TEMPLATE_NAME = "bionic_patient_update";
process.env[PATIENT_WHATSAPP_ENV.accessToken] = ACCESS_TOKEN;
process.env[PATIENT_WHATSAPP_ENV.phoneNumberId] = PHONE_NUMBER_ID;
process.env[PATIENT_WHATSAPP_ENV.businessPhone] = BUSINESS_PHONE;
process.env[PATIENT_WHATSAPP_ENV.verifyToken] = VERIFY_TOKEN;
process.env[PATIENT_WHATSAPP_ENV.appSecret] = APP_SECRET;
process.env[PATIENT_WHATSAPP_ENV.templateName] = TEMPLATE_NAME;
process.env[PATIENT_WHATSAPP_ENV.templateLanguage] = "ar";
// وتلغرام مُعدٌّ أيضاً: الانتقالُ يعني قناتين حيّتين معاً.
process.env.PATIENT_TELEGRAM_BOT_TOKEN = "1234567:TEST-BOT-TOKEN-DO-NOT-USE";
process.env.PATIENT_TELEGRAM_BOT_USERNAME = "bionic_wa_test_bot";
process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = "test-tg-secret-0062";

const PORT = 6884;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-واتساب";
const ADMIN = 9891;
const WA_ID = "9647701112233";
const WA_ID_2 = "9647709998877";
const TG_ID = "770001";

// ── جاسوسٌ على المزوّدين: لا نداءَ شبكة، ونرى ما كان سيُرسَل ─────────────
interface SentWa { to: string; type: string; text: string; template: string | null }
const waSent: SentWa[] = [];
const tgSent: { chatId: string; text: string }[] = [];
/** إخفاقٌ مُبرمَج للنداء التالي إلى Graph — لإثبات مسار الفشل بلا شبكة. */
let waFailure: null | { status: number } | "network" = null;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const href = String(url);
  if (href.includes("graph.facebook.com")) {
    if (waFailure === "network") throw new TypeError("simulated network failure");
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (waFailure) {
      const status = waFailure.status;
      waFailure = null;
      return new Response(JSON.stringify({ error: { message: "simulated" } }), { status });
    }
    waSent.push({
      to: String(body.to ?? ""),
      type: String(body.type ?? ""),
      text: String(body.text?.body ?? body.template?.components?.[0]?.parameters?.[0]?.text ?? ""),
      template: body.template?.name ?? null,
    });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.TEST" }] }), { status: 200 });
  }
  if (href.includes("api.telegram.org")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    tgSent.push({ chatId: String(body.chat_id), text: String(body.text ?? "") });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return realFetch(url, init);
}) as any;

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

/** تحديثُ Meta كما يصل فعلاً — ومعه توقيعُه الصحيح ما لم يُطلَب غيره. */
function metaUpdate(from: string, text: string) {
  return {
    object: "whatsapp_business_account",
    entry: [{
      id: "WABA",
      changes: [{
        field: "messages",
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: BUSINESS_PHONE, phone_number_id: PHONE_NUMBER_ID },
          contacts: [{ profile: { name: "اسمٌ يكتبه صاحبُ الحساب" }, wa_id: from }],
          messages: [{ from, id: "wamid.X", timestamp: "1", type: "text", text: { body: text } }],
        },
      }],
    }],
  };
}

async function post(update: unknown, opts: { signature?: string | null } = {}) {
  const raw = JSON.stringify(update);
  const sig = opts.signature === undefined
    ? `sha256=${createHmac("sha256", APP_SECRET).update(raw, "utf8").digest("hex")}`
    : opts.signature;
  const res = await fetch(BASE + WHATSAPP_WEBHOOK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(sig ? { "x-hub-signature-256": sig } : {}),
    },
    body: raw,
  });
  return { status: res.status };
}

const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/**
 * **عزلٌ عن بقيّة الحزم**: صفوفٌ مستحقّة لمرضى اختباراتٍ أخرى ما زالت
 * `pending` في القاعدة يلتقطها عاملُنا فيرسلها ويُلوّث جاسوسَنا. تُختَم
 * `skipped` قبل البدء — قاعدةُ اختبارٍ محلّية، والصفوفُ ليست بيانات أحد.
 */
async function quiesceForeignOutbox() {
  await q(`UPDATE patient_notification_deliveries
              SET status = 'skipped'
            WHERE status IN ('pending', 'failed', 'processing')
              AND patient_id NOT IN (${ids})`);
}

/**
 * يستنزف الطابورَ حتى يهدأ.
 *
 * الـwebhook ينادي `nudgeDispatcher()` **بلا انتظار** — وهذا صحيحٌ في
 * الإنتاج (الربطُ لا ينتظر شبكةً) لكنه يجعل الاختبارَ غير حتميّ: إرسالٌ
 * أطلقه قسمٌ سابق قد يصل الجاسوسَ بعد أن مسحناه. فالتصريفُ صريحٌ هنا.
 */
async function settle() {
  for (let i = 0; i < 3; i++) {
    await dispatchOnce(50);
    await new Promise((r) => setTimeout(r, 30));
  }
}

async function mkPatient(name: string): Promise<{ id: number; code: string }> {
  const r = await q<{ id: number; patient_code: string }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, total_cost)
     VALUES ($1,'07709999999',$2,'40','بتر تحت الركبة',1,1500000) RETURNING id, patient_code`,
    [`${MARK} ${name}`, MARK]);
  return { id: r[0].id, code: r[0].patient_code };
}

/** يربط جهةً يدوياً — لسيناريوهاتٍ لا تمرّ بالـwebhook. */
async function linkContact(patientId: number, channel: string, externalId: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_contacts (patient_id, channel, relation, external_id, linked_at)
     VALUES ($1,$2,'self',$3,NOW()) RETURNING id`, [patientId, channel, externalId]);
  //  BIGSERIAL يعود نصّاً من `pg` الخام بينما Drizzle يعيده رقماً — والخلطُ
  //  بينهما يجعل المقارنة تفشل صامتةً. فالتطبيعُ عند المصدر مرّةً واحدة.
  return Number(r[0].id);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'wa_admin','x','المسؤول','admin',1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`, [ADMIN]);
  await cleanup();
  await quiesceForeignOutbox();

  const app = express();
  // نفسُ التقاط الجسم الخام الذي في `server/index.ts` — وهو ما يحرس التوقيع.
  app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  registerPatientWhatsappWebhook(app);
  const server = app.listen(PORT, "127.0.0.1");
  await new Promise<void>((r) => server.on("listening", () => r()));

  try {
    // ══ أ. القنوات ══════════════════════════════════════════════════════
    console.log("\n── أ. القنوات ──");
    same("أ. **القناتان المدعومتان**", [...CONTACT_CHANNELS].sort(), ["telegram", "whatsapp"]);
    same("أ.١ وكلتاهما مقبولة",
      [isContactChannel("whatsapp"), isContactChannel("telegram")], [true, true]);
    same("أ.٢ **وما عداهما مرفوض**",
      ["sms", "email", "signal", "", "WHATSAPP", null].map(isContactChannel),
      [false, false, false, false, false, false]);
    same("أ.٣ وناقلٌ لكلٍّ منهما",
      [transportFor("whatsapp")?.channel, transportFor("telegram")?.channel, transportFor("sms")],
      ["whatsapp", "telegram", null]);
    same("أ.٤ والقناتان مُعدّتان في هذا الاختبار",
      [...enabledChannels()].sort(), ["telegram", "whatsapp"]);

    // ══ ب. الرابط العميق ════════════════════════════════════════════════
    console.log("\n── ب. الرابط العميق ──");
    const pB = await mkPatient("ب");
    const { rawToken: tokB, token: rowB } = await createLinkToken({
      patientId: pB.id, channel: "whatsapp", relation: "self", createdByUserId: ADMIN,
    });
    const link = patientWhatsappDeepLink(tokB);
    check(Boolean(link?.startsWith(`https://wa.me/${BUSINESS_PHONE}?text=`)),
      "ب. **إلى رقم المركز المُعدّ**", String(link));
    check(link!.includes(encodeURIComponent(LINK_COMMAND)),
      "ب.١ **وبأمر الربط لمرّة واحدة**", String(link));
    check(link!.includes(encodeURIComponent(tokB)),
      "ب.٢ والتذكرة داخله (وهو كلُّ ما يُعرَض منها)");

    //  **ولا نصَّ خام في القاعدة** — بصمتُه وحدها.
    const stored = await q<{ token_hash: string }>(
      `SELECT token_hash FROM patient_link_tokens WHERE id = $1`, [rowB.id]);
    same("ب.٣ **المخزَّن بصمةٌ لا نصّ**", stored[0].token_hash, hashToken(tokB));
    const anywhere = await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patient_link_tokens WHERE token_hash = $1`, [tokB]);
    same("ب.٤ **ولا صفَّ يحمل النصّ الخام إطلاقاً**", anywhere[0].n, 0);

    //  وإعدادٌ ناقص ⟶ لا رابط.
    const savedToken = process.env[PATIENT_WHATSAPP_ENV.accessToken];
    delete process.env[PATIENT_WHATSAPP_ENV.accessToken];
    same("ب.٥ **إعدادٌ ناقص ⟶ لا رابطَ يُعرَض**", patientWhatsappDeepLink(tokB), null);
    same("   والتكامل معطَّل نظيفاً", patientWhatsappEnabled(), false);
    same("   ويُقال اسمُ الناقص لا قيمتُه",
      missingPatientWhatsappEnv(), [PATIENT_WHATSAPP_ENV.accessToken]);
    process.env[PATIENT_WHATSAPP_ENV.accessToken] = savedToken;
    same("   ثم يعود", patientWhatsappEnabled(), true);

    // ══ ج. تحقّق GET ════════════════════════════════════════════════════
    console.log("\n── ج. تحقّق GET ──");
    const okGet = await fetch(
      `${BASE}${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=CHALLENGE-42`);
    same("ج. **السرُّ الصحيح ⟶ ٢٠٠**", okGet.status, 200);
    same("ج.١ **والتحدّي عارياً كما يشترط المزوّد**", await okGet.text(), "CHALLENGE-42");
    const badGet = await fetch(
      `${BASE}${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=CHALLENGE-42`);
    same("ج.٢ **والسرُّ الخاطئ ⟶ ٤٠٣**", badGet.status, 403);
    check(!(await badGet.text()).includes("CHALLENGE-42"), "   ولا يُسرَّب التحدّي");
    const noMode = await fetch(
      `${BASE}${WHATSAPP_WEBHOOK_PATH}?hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=C`);
    same("ج.٣ وبلا `hub.mode` ⟶ ٤٠٣", noMode.status, 403);

    // ══ د. توقيع POST ═══════════════════════════════════════════════════
    console.log("\n── د. توقيع POST ──");
    const upd = metaUpdate(WA_ID, "شيء لا نعالجه");
    same("د. **بلا توقيع ⟶ ٤٠١**", (await post(upd, { signature: null })).status, 401);
    same("د.١ **وبتوقيعٍ خاطئ ⟶ ٤٠١**",
      (await post(upd, { signature: "sha256=" + "0".repeat(64) })).status, 401);
    same("د.٢ **وبتوقيعٍ بسرٍّ آخر ⟶ ٤٠١**", (await post(upd, {
      signature: `sha256=${createHmac("sha256", "wrong-secret").update(JSON.stringify(upd)).digest("hex")}`,
    })).status, 401);
    same("د.٣ **وبالتوقيع الصحيح ⟶ ٢٠٠**", (await post(upd)).status, 200);
    same("   ونصٌّ لا نعرفه لا يصير محادثةً آلية", waSent.length, 0);

    // ══ هـ. الربط ═══════════════════════════════════════════════════════
    console.log("\n── هـ. الربط ──");
    const pE = await mkPatient("هـ");
    //  أمرُ تصنيعٍ حيّ ⇒ لقطةُ حالةٍ مع الترحيب.
    await q(`INSERT INTO prosthetic_work_orders
               (patient_id, branch_id, expert_user_id, service_type, purpose,
                current_stage, status, expected_delivery_date, assigned_by)
             VALUES ($1,1,$2,'prosthetic','initial_build','manufacturing','active','2026-12-01',$2)`,
      [pE.id, ADMIN]);
    const { rawToken: tokE } = await createLinkToken({
      patientId: pE.id, channel: "whatsapp", relation: "self", createdByUserId: ADMIN,
    });
    waSent.length = 0;
    same("هـ. **«ربط <token>» ⟶ ٢٠٠**",
      (await post(metaUpdate(WA_ID, `${LINK_COMMAND} ${tokE}`))).status, 200);

    const contactsE = (await q<{ id: string; channel: string; external_id: string; relation: string }>(
      `SELECT id, channel, external_id, relation FROM patient_contacts
        WHERE patient_id = $1 AND revoked_at IS NULL`, [pE.id]))
      .map((c) => ({ ...c, id: Number(c.id) }));
    same("هـ.١ **جهةُ واتسابٍ واحدة بالضبط**", contactsE.length, 1);
    same("هـ.٢ بقناتها ومعرّفها وصلتها",
      [contactsE[0].channel, contactsE[0].external_id, contactsE[0].relation],
      ["whatsapp", WA_ID, "self"]);
    const consumed = await q<{ consumed_at: string | null; consumed_by_external_id: string | null }>(
      `SELECT consumed_at, consumed_by_external_id FROM patient_link_tokens
        WHERE token_hash = $1`, [hashToken(tokE)]);
    check(consumed[0].consumed_at !== null && consumed[0].consumed_by_external_id === WA_ID,
      "هـ.٣ **والتذكرةُ استُهلكت بهذا الحساب**", JSON.stringify(consumed[0]));

    const rowsE = await deliveriesForPatient(pE.id);
    same("هـ.٤ **وصفوفُ الربط استُحقّت لتلك الجهة**",
      rowsE.map((r) => [r.notificationType, r.channel, r.patientContactId === contactsE[0].id]),
      [
        [LINK_NOTIFICATION_TYPES.WELCOME, "whatsapp", true],
        [LINK_NOTIFICATION_TYPES.CURRENT_STAGE, "whatsapp", true],
        [LINK_NOTIFICATION_TYPES.DELIVERY_DATE, "whatsapp", true],
      ]);

    // ══ و. الإعادة ══════════════════════════════════════════════════════
    console.log("\n── و. الإعادة ──");
    same("و. **إعادةُ التذكرة نفسها ⟶ ٢٠٠**",
      (await post(metaUpdate(WA_ID, `${LINK_COMMAND} ${tokE}`))).status, 200);
    const afterReplay = await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patient_contacts WHERE patient_id = $1 AND revoked_at IS NULL`, [pE.id]);
    same("و.١ **ولا جهةَ ثانية**", afterReplay[0].n, 1);
    same("و.٢ ولا صفوفَ ربطٍ مكرَّرة", (await deliveriesForPatient(pE.id)).length, 3);
    check(waSent.some((m) => m.text === WHATSAPP_MESSAGES.invalid),
      "و.٣ ويُجاب بالنصّ العامّ الواحد", JSON.stringify(waSent.map((m) => m.text)));

    // ══ ز. الهويّة من المزوّد ═══════════════════════════════════════════
    console.log("\n── ز. الهويّة ──");
    const pZ = await mkPatient("ز");
    const { rawToken: tokZ } = await createLinkToken({
      patientId: pZ.id, channel: "whatsapp", relation: "guardian", createdByUserId: ADMIN,
    });
    //  التحديثُ يحمل هاتفَ الملفّ ورقمَ مريضٍ آخر واسماً — **ولا يُقرأ منها شيء**.
    const spoof: any = metaUpdate(WA_ID_2, `${LINK_COMMAND} ${tokZ}`);
    spoof.entry[0].changes[0].value.messages[0].text.body =
      `${LINK_COMMAND} ${tokZ}`;
    spoof.patientId = pB.id;
    spoof.entry[0].changes[0].value.contacts[0].wa_id = "07709999999";
    same("ز. الربط يمرّ", (await post(spoof)).status, 200);
    const cZ = await q<{ external_id: string; patient_id: number; relation: string }>(
      `SELECT external_id, patient_id, relation FROM patient_contacts
        WHERE patient_id = $1 AND revoked_at IS NULL`, [pZ.id]);
    same("ز.١ **الهويّةُ من `messages[].from` لا من `contacts[].wa_id` ولا من الهاتف**",
      cZ[0].external_id, WA_ID_2);
    same("ز.٢ **والملفُّ من التذكرة لا من جسم الطلب**", cZ[0].patient_id, pZ.id);
    same("ز.٣ **والصلةُ من التذكرة**", cZ[0].relation, "guardian");
    const leaked = await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patient_contacts WHERE patient_id = $1`, [pB.id]);
    same("ز.٤ **ولا جهةَ للمريض الذي ادّعاه الجسم**", leaked[0].n, 0);

    // ══ ح. «رمزي» ══════════════════════════════════════════════════════
    console.log("\n── ح. رمزي ──");
    waSent.length = 0;
    same("ح. «رمزي» ⟶ ٢٠٠", (await post(metaUpdate(WA_ID, "رمزي"))).status, 200);
    const codeReply = waSent[waSent.length - 1]?.text ?? "";
    check(codeReply.includes(pE.code), "ح.١ **الرمزُ الحالي**", codeReply);
    const forbidden: [string, string][] = [
      ["اسم المريض", MARK], ["التشخيص", "بتر تحت الركبة"],
      ["الهاتف", "07709999999"], ["المال", "1500000"],
      ["رقم الصفّ", `#${pE.id}`], ["المرحلة الداخلية", "manufacturing"],
    ];
    for (const [label, needle] of forbidden) {
      check(!codeReply.includes(needle), `   ولا ${label}`, codeReply);
    }
    //  ورقمٌ في نصّ الرسالة لا يفتح ملفَّ غيره.
    waSent.length = 0;
    await post(metaUpdate(WA_ID, `رمزي ${pZ.id}`));
    same("ح.٢ **و«رمزي <رقم>» تُتجاهَل صامتة**", waSent.length, 0);
    //  وحسابٌ بلا ربط ⟶ نصٌّ عامّ واحد.
    waSent.length = 0;
    await post(metaUpdate("964770000000", "رمزي"));
    same("ح.٣ وحسابٌ بلا ربط ⟶ نصٌّ عامّ",
      waSent[waSent.length - 1]?.text, WHATSAPP_MESSAGES.noLinkedPatient);

    // ══ ط. حدثُ تصنيعٍ بجهتين ═══════════════════════════════════════════
    console.log("\n── ط. جهتان، صفّان ──");
    //  **تصريفٌ محسوم قبل القياس**: الـwebhook ينادي `nudgeDispatcher()`
    //  «أطلق وانسَ»، فقد تصل إرسالاتُ الأقسام السابقة **بعد** أن نمسح
    //  الجاسوس. فتُستنزف أولاً بانتظارٍ صريح — ثم يُقاس ما نُنشئه نحن.
    await settle();
    const pT = await mkPatient("ط");
    const waContact = await linkContact(pT.id, "whatsapp", WA_ID);
    const tgContact = await linkContact(pT.id, "telegram", TG_ID);
    const [evt] = await q<{ id: number }>(
      `INSERT INTO patient_events (patient_id, branch_id, event_type, payload, actor_user_id)
       VALUES ($1,1,$2,'{}'::jsonb,$3) RETURNING id`,
      [pT.id, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED, ADMIN]);
    const queued = await db.transaction((tx) => enqueueForActiveContacts(tx as any, {
      patientId: pT.id, patientEventId: evt.id,
      notificationType: PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED,
      payload: { stage: "manufacturing", serviceType: "prosthetic" },
    }));
    same("ط. **حدثٌ واحد ⟶ صفّان**", queued, 2);
    const rowsT = await deliveriesForPatient(pT.id);
    same("ط.١ **واحدٌ لكلّ جهة بقناتها هي**",
      rowsT.map((r) => [r.channel, r.patientContactId]).sort(),
      [["telegram", tgContact], ["whatsapp", waContact]].sort());
    //  والتكرار ممنوع: نفسُ الحدث لنفس الجهة لا يُنتج صفّاً ثانياً.
    const again = await db.transaction((tx) => enqueueForActiveContacts(tx as any, {
      patientId: pT.id, patientEventId: evt.id,
      notificationType: PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED,
      payload: { stage: "manufacturing", serviceType: "prosthetic" },
    }));
    same("ط.٢ **وإعادةُ الاستحقاق لا تُنتج صفّاً مكرَّراً**", again, 0);

    // ══ ي/ك/ل. العامل: كلُّ صفٍّ بناقله، وبوضعه ═════════════════════════
    console.log("\n── ي/ك/ل. العامل ──");
    //  وترحيبٌ طازج لهذا المريض كي يُقاس وضعُه لا وضعُ صفٍّ أُرسل سلفاً.
    await db.transaction((tx) => enqueueForContact(tx as any, {
      patientId: pT.id, patientContactId: waContact,
      notificationType: LINK_NOTIFICATION_TYPES.WELCOME,
      payload: { patientCode: pT.code },
    }) as any);
    waSent.length = 0; tgSent.length = 0;
    await dispatchOnce(50);
    const waTo = waSent.filter((m) => m.to === WA_ID);
    check(tgSent.some((m) => m.chatId === TG_ID),
      "ي. **صفُّ تلغرام ذهب إلى تلغرام**", JSON.stringify(tgSent));
    check(waTo.length > 0, "ي.١ **وصفُّ واتساب إلى واتساب**", JSON.stringify(waSent));
    same("ي.٢ **ولا رسالةَ واتسابٍ ذهبت إلى معرّف تلغرام**",
      waSent.filter((m) => m.to === TG_ID).length, 0);

    const welcomeSent = waSent.find((m) => m.text.includes("مرحباً بك"));
    check(Boolean(welcomeSent) && welcomeSent!.type === "text" && welcomeSent!.template === null,
      "ك. **رسالةُ الربط بوضع النصّ** (نافذةٌ مفتوحة)", JSON.stringify(welcomeSent));
    check(welcomeSent!.text.includes("واتساب") && !welcomeSent!.text.includes("Telegram"),
      "ك.١ **وسطرُ الترحيب يقول واتساب لا Telegram**", welcomeSent!.text);

    const stageSent = waSent.find((m) => m.type === "template");
    check(Boolean(stageSent) && stageSent!.template === TEMPLATE_NAME,
      "ل. **وتحديثُ التصنيع بالقالب المُعدّ**", JSON.stringify(stageSent));
    check(stageSent!.text.includes("طرفك الصناعي"),
      "ل.١ **والنصُّ من `renderNotification` نفسه** معامِلاً للقالب", String(stageSent?.text));
    same("ل.٢ **والتمييزُ مشتقٌّ لا مكتوبٌ مرّتين**",
      [
        isLinkNotificationType(LINK_NOTIFICATION_TYPES.WELCOME),
        isLinkNotificationType(PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED),
      ], [true, false]);
    //  وترحيبُ تلغرام يبقى بصياغته هو — القناةُ تصل العارض.
    const tgWelcome = tgSent.find((m) => m.text.includes("مرحباً بك"));
    check(!tgWelcome || tgWelcome.text.includes("Telegram"),
      "ك.٢ وترحيبُ تلغرام يبقى بصياغته", String(tgWelcome?.text));

    // ══ م. فشلُ Meta ════════════════════════════════════════════════════
    console.log("\n── م. الفشل ──");
    const pM = await mkPatient("م");
    const waM = await linkContact(pM.id, "whatsapp", WA_ID_2);
    const [evtM] = await q<{ id: number }>(
      `INSERT INTO patient_events (patient_id, branch_id, event_type, payload, actor_user_id)
       VALUES ($1,1,$2,'{}'::jsonb,$3) RETURNING id`,
      [pM.id, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED, ADMIN]);
    const costBefore = await q<{ total_cost: string }>(
      `SELECT total_cost FROM patients WHERE id = $1`, [pM.id]);
    await db.transaction((tx) => enqueueForActiveContacts(tx as any, {
      patientId: pM.id, patientEventId: evtM.id,
      notificationType: PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED,
      payload: { stage: "mold", serviceType: "prosthetic" },
    }));
    waFailure = "network";
    await dispatchOnce(50);
    const failed = (await deliveriesForPatient(pM.id))[0];
    same("م. **الصفُّ فاشل**", failed.status, "failed");
    same("م.١ **برمزٍ محدود من القائمة المغلقة**", failed.lastErrorCode, "whatsapp_network");
    same("م.٢ والمحاولةُ عُدَّت", failed.attemptCount, 1);
    check(failed.nextAttemptAt !== null
      && new Date(failed.nextAttemptAt).getTime() > Date.now() + backoffFor(1) - 5000,
      "م.٣ **والتباعدُ سليم**", String(failed.nextAttemptAt));
    same("م.٤ **والمعاملةُ التجارية ثابتة** — لا دينارَ تحرّك",
      (await q(`SELECT total_cost FROM patients WHERE id = $1`, [pM.id]))[0].total_cost,
      costBefore[0].total_cost);
    check(!String(failed.lastErrorCode ?? "").includes("simulated"),
      "م.٥ **ولا نصَّ مزوّدٍ خام في العمود**", String(failed.lastErrorCode));
    //  وخطأُ قالبٍ يُميَّز عن خطأِ شبكة.
    await q(`UPDATE patient_notification_deliveries
                SET status='pending', next_attempt_at=NOW(), attempt_count=0
              WHERE id = $1`, [failed.id]);
    waFailure = { status: 400 };
    await dispatchOnce(50);
    same("م.٦ **وخطأُ القالب يُميَّز**",
      (await deliveriesForPatient(pM.id))[0].lastErrorCode, "whatsapp_template_error");
    void waM;

    // ══ ع. تلغرام القديم ═══════════════════════════════════════════════
    console.log("\n── ع. تلغرام القديم ──");
    const legacy = await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patient_notification_deliveries
        WHERE patient_id = $1 AND channel = 'telegram' AND status = 'sent'`, [pT.id]);
    check(legacy[0].n > 0, "ع. **صفُّ تلغرام أُرسل فعلاً ولم يُخطَّ**", JSON.stringify(legacy));
    const skippedLegacy = await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patient_notification_deliveries
        WHERE patient_id = $1 AND channel = 'telegram' AND status = 'skipped'`, [pT.id]);
    same("ع.١ **ولم يُوسَم متخطّى لمجرّد أن واتساب أُضيف**", skippedLegacy[0].n, 0);
    same("ع.٢ **وجهةُ تلغرام ما زالت تُقرأ**",
      (await q<{ n: number }>(
        `SELECT COUNT(*)::int n FROM patient_contacts
          WHERE patient_id = $1 AND channel = 'telegram' AND revoked_at IS NULL`, [pT.id]))[0].n, 1);

    //  ولا يُحجَز صفٌّ لقناةٍ بلا ناقل — يبقى `pending` لا يُحرَق.
    const pQ = await mkPatient("ق");
    const cQ = await linkContact(pQ.id, "telegram", "770777");
    await q(`INSERT INTO patient_notification_deliveries
               (patient_id, patient_contact_id, channel, notification_type, payload)
             VALUES ($1,$2,'telegram',$3,'{"stage":"mold"}'::jsonb)`,
      [pQ.id, cQ, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED]);
    const onlyWa = await claimDue(50, ["whatsapp"]);
    same("ع.٣ **وحجزُ واتساب وحدَه لا يمسّ صفَّ تلغرام**",
      onlyWa.filter((r) => r.channel === "telegram").length, 0);
    same("   والصفُّ ما زال `pending` لا متخطّى",
      (await deliveriesForPatient(pQ.id))[0].status, "pending");

    // ══ ف. لا حقلَ سريرياً ولا مالياً في أي حمولة تخرج ══════════════════
    console.log("\n── ف. ما لا يخرج ──");
    const payloads = await q<{ payload: any; notification_type: string }>(
      `SELECT payload, notification_type FROM patient_notification_deliveries
        WHERE patient_id IN (${ids})`);
    const allowedKeys = new Set([
      "stage", "serviceType", "expectedDeliveryDate", "patientCode",
    ]);
    const strayKeys = [...new Set(payloads.flatMap((r) => Object.keys(r.payload ?? {})))]
      .filter((k) => !allowedKeys.has(k));
    same("ف. **لا مفتاحَ خارج القائمة البيضاء في أي حمولة**", strayKeys, []);
    const outboundTexts = waSent.map((m) => m.text).join("\n");
    for (const [label, needle] of forbidden) {
      check(!outboundTexts.includes(needle),
        `ف.١ ولا ${label} في أي نصٍّ خرج إلى واتساب`, needle);
    }
    //  **ولا رقمَ في رسالةٍ إلا ما له مسوّغ**: تاريخُ تسليمٍ متوقَّع، أو
    //  رمزُ المريض القانونيّ. وما عداهما — مبلغٌ، معرّفٌ داخليّ، رقمُ صفّ —
    //  لا يخرج. والفحصُ على الباقي بعد نزعِ المسوَّغَين لا على النصّ كلِّه،
    //  فلا يمرّ مبلغٌ لأنه جاور تاريخاً.
    const strayDigits = waSent
      .map((m) => m.text
        .replace(/\d{2}\/\d{2}\/\d{4}/g, "")      // موعدُ التسليم
        .replace(/[A-Z]{2}-\d+/g, ""))            // رمزُ المريض القانونيّ
      .filter((t) => /\d/.test(t));
    same("ف.٢ **ولا رقمَ آخر في أي رسالة** — لا مبلغ ولا معرّف", strayDigits, []);
    //  والعارضُ نفسه لا يُخرج شيئاً لنوعٍ غير مسموح.
    same("ف.٣ **ونوعٌ غير مسموحٍ لا نصَّ له**",
      renderNotification(PATIENT_EVENT_TYPES.PAYMENT_RECORDED ?? "payment.recorded", { amount: 500000 }),
      null);
    same("ف.٤ والقالبُ جاهزٌ في هذا الاختبار", patientWhatsappTemplateReady(), true);
    same("ف.٥ والتطبيعُ يوحّد صيغَ الرقم",
      ["+964 770 111 2233", "00964-770", "(770)"].map(normalizeWhatsappId),
      ["9647701112233", "00964770", "770"]);
    void patientWhatsappConfig();
  } finally {
    globalThis.fetch = realFetch;
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = $1`, [ADMIN]);
    await q(`DELETE FROM system_users WHERE id = $1`, [ADMIN]);
    server.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  globalThis.fetch = realFetch;
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
