// رمزُ المريض في تلغرام — حيّاً على الـwebhook الحقيقي وعلى Postgres.
// قاعدة محلّية: `npm run test:patient-code-telegram`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الترحيب يحمل الرمز**، ويُقرأ داخل معاملة الربط نفسها.
// (٢) **والقديم يبقى يُعرَض**: صفٌّ في الطابور استُحقّ قبل هذه الميزة بلا
//     حمولة يجب أن يصل بنصّه الأول — لا فراغاً ولا «undefined» لمريض.
// (٣) **و`/id` يردّ الرمز الحالي وحده** — لملفٍّ أو لعدّة ملفّات مشروعة.
// (٤) **ولا يردّ شيئاً غيره**: لا اسم ولا تشخيص ولا جهاز ولا مال ولا هاتف
//     ولا رقم صفّ. مَن يصل إلى الحساب لا يصل إلى الملفّ.
// (٥) **والمسحوب ربطُه لا يُحتسب**، وغيرُ المربوط يُجاب بنصٍّ عامّ واحد.
// (٦) **وبعد الدمج**: الرمز الباقي وحده — لا الرمزان. الاسم البديل للبحث
//     الداخلي لا لعرض هويّتين على المريض.
// (٧) **ولا حدثَ مريض يُسجَّل** لأن رمزاً أُرسل أو لأن `/id` طُلب.

import express from "express";
import { pool } from "./db";
import { storage } from "./storage";
import { registerPatientTelegramWebhook, PATIENT_WEBHOOK_PATH, MESSAGES } from "./patient_telegram/webhook";
import { createLinkToken, revokeContact } from "./patient_contacts/store";
import { renderNotification } from "./patient_notifications/render";
import { LINK_NOTIFICATION_TYPES } from "./patient_notifications/render";
import { PATIENT_CODE_PATTERN } from "@shared/patient_code";

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

const BOT_TOKEN = "1234567:TEST-BOT-TOKEN-DO-NOT-USE";
const BOT_USERNAME = "bionic_code_test_bot";
const WEBHOOK_SECRET = "test-webhook-secret-value-0052";
process.env.PATIENT_TELEGRAM_BOT_TOKEN = BOT_TOKEN;
process.env.PATIENT_TELEGRAM_BOT_USERNAME = BOT_USERNAME;
process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;

const PORT = 6836;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-رمز-تلغرام";
const ADMIN = 9895;

// ── جاسوس على تلغرام: لا نداء شبكة، ونرى ما كان سيُرسَل ───────────────────
const sent: { chatId: string; text: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const href = String(url);
  if (href.includes("api.telegram.org")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    sent.push({ chatId: String(body.chat_id), text: String(body.text ?? "") });
    return new Response(JSON.stringify({ ok: true, result: { message_id: sent.length } }),
      { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(url, init);
}) as any;

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function update(body: any, secret = WEBHOOK_SECRET) {
  const res = await fetch(BASE + PATIENT_WEBHOOK_PATH, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
    body: JSON.stringify(body),
  });
  return res.status;
}
const msg = (fromId: string, text: string) => ({
  message: { chat: { id: fromId, type: "private" }, from: { id: fromId }, text },
});
const lastText = () => sent[sent.length - 1]?.text ?? "";

/**
 * ينتظر أن يفرغ طابور الصادر.
 *
 * الربط يكبس المرسِل، فيصل الترحيب **بعد** ردّ الـwebhook بلحظات. وأي
 * تأكيدٍ يعدّ الرسائل بعد ربطٍ قريب قد يلتقط ترحيباً متأخّراً فيُخفق بلا
 * سبب حقيقي. فيُستقرّ الطابور أوّلاً ثمّ يُقاس.
 */
async function drainOutbox(timeoutMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const [r] = await q(`SELECT count(*)::int n FROM patient_notification_deliveries
                          WHERE status IN ('pending','processing')`);
    if (r.n === 0) return;
    await new Promise((res) => setTimeout(res, 100));
  }
}

async function mkPatient(name: string) {
  const r = await q<{ id: number; patient_code: string }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, total_cost)
     VALUES ($1,'07701234567',$2,'40','x',1,0) RETURNING id, patient_code`, [`${MARK} ${name}`, MARK]);
  return r[0];
}
/** يربط حساباً بملفّ عبر التذكرة الحقيقية والـwebhook الحقيقي. */
async function link(patientId: number, externalId: string) {
  const { rawToken } = await createLinkToken({
    patientId, channel: "telegram", relation: "self", createdBy: ADMIN,
  });
  await update(msg(externalId, `/start ${rawToken}`));
  return rawToken;
}
async function welcomeRowFor(patientId: number) {
  const r = await q(
    `SELECT payload, notification_type FROM patient_notification_deliveries
      WHERE patient_id = $1 AND notification_type = $2 ORDER BY id DESC LIMIT 1`,
    [patientId, LINK_NOTIFICATION_TYPES.WELCOME]);
  return r[0] ?? null;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'pct_admin','x','المسؤول','admin',1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`, [ADMIN]);
  await cleanup();

  const app = express();
  app.use(express.json());
  registerPatientTelegramWebhook(app);
  const server = app.listen(PORT);
  await new Promise((r) => server.once("listening", r));

  try {
    // ══ أ/ب. الترحيب يحمل الرمز ═════════════════════════════════════
    console.log("\n── الترحيب ──");
    const p1 = await mkPatient("المربوط");
    await link(p1.id, "500001");
    const row = await welcomeRowFor(p1.id);
    const payload = row?.payload ?? {};
    same("أ. **حمولة الترحيب تحمل الرمز**", payload.patientCode, p1.patient_code);
    same("   **ولا حقلَ آخر فيها إطلاقاً**", Object.keys(payload).sort(), ["patientCode"]);
    const text = renderNotification(LINK_NOTIFICATION_TYPES.WELCOME, payload) ?? "";
    check(text.includes(p1.patient_code), "ب. **والنصّ المعروض يُظهر الرمز**", text);
    check(text.includes("مرحباً بك") && text.includes("احتفظ بهذا الرمز"),
      "   مع نصّ الترحيب وتعليمة الحفظ", text);
    check(!/\d{6,}/.test(text.replace(p1.patient_code, "")),
      "   ولا رقمَ آخر في النصّ (لا مال ولا رقم صفّ)", text);

    // ══ ج. الصفوف القديمة ═══════════════════════════════════════════
    for (const [label, old] of [["بلا حمولة", null], ["حمولة فارغة", {}],
      ["حمولة مشوّهة", { patientCode: "لست رمزاً" }]] as any[]) {
      const t = renderNotification(LINK_NOTIFICATION_TYPES.WELCOME, old) ?? "";
      check(t.startsWith("مرحباً بك") && !t.includes("رمز المريض"),
        `ج. صفٌّ قديم (${label}) يُعرَض بنصّه الأول`, t);
    }

    // ══ د. /id بملفٍّ واحد ══════════════════════════════════════════
    console.log("\n── /id ──");
    sent.length = 0;
    same("د. /id تُقبل", await update(msg("500001", "/id")), 200);
    same("   **والردّ رمزُه الحالي**", lastText(), `رمز المريض الخاص بك: ${p1.patient_code}`);
    sent.length = 0;
    await update(msg("500001", `/id@${BOT_USERNAME}`));
    same("   و/id@BotUsername مثلها", lastText(), `رمز المريض الخاص بك: ${p1.patient_code}`);

    //  ولا شيء غير الرمز: لا اسم ولا هاتف ولا رقم صفّ.
    const leak = lastText();
    check(!leak.includes("المربوط") && !leak.includes(MARK), "   ولا اسمَ في الردّ", leak);
    check(!leak.includes("0770"), "   ولا هاتف", leak);
    check(!new RegExp(`\\b${p1.id}\\b`).test(leak.replace(p1.patient_code, "")),
      "   ولا رقمَ صفّ داخلي", leak);

    // ══ هـ. /id بعدّة ملفّات ════════════════════════════════════════
    const p2 = await mkPatient("الابن");
    const p3 = await mkPatient("البنت");
    await link(p2.id, "500002");
    await link(p3.id, "500002");
    sent.length = 0;
    await update(msg("500002", "/id"));
    const multi = lastText();
    check(multi.includes(p2.patient_code) && multi.includes(p3.patient_code),
      "هـ. **حسابٌ مربوطٌ بملفّين ⟶ الرمزان معاً**", multi);
    same("   وبلا تكرار", (multi.match(new RegExp(p2.patient_code, "g")) ?? []).length, 1);

    // ══ و. المسحوب لا يُحتسب ═══════════════════════════════════════
    const contacts = await q<{ id: number }>(
      `SELECT id FROM patient_contacts WHERE patient_id = $1 AND revoked_at IS NULL`, [p3.id]);
    await revokeContact(contacts[0].id);
    sent.length = 0;
    await update(msg("500002", "/id"));
    const afterRevoke = lastText();
    check(afterRevoke.includes(p2.patient_code), "و. الباقي يظهر", afterRevoke);
    check(!afterRevoke.includes(p3.patient_code), "   **والمسحوب ربطُه لا يظهر**", afterRevoke);

    // ══ ز. حسابٌ غير مربوط ══════════════════════════════════════════
    sent.length = 0;
    await update(msg("599999", "/id"));
    same("ز. **حسابٌ بلا ربط ⟶ نصٌّ عامّ واحد**", lastText(), MESSAGES.noLinkedPatient);
    check(!PATIENT_CODE_PATTERN.test(lastText()), "   وبلا أي رمز", lastText());

    // ══ ح. بعد الدمج ════════════════════════════════════════════════
    console.log("\n── بعد الدمج ──");
    const src = await mkPatient("مصدر الدمج");
    const tgt = await mkPatient("هدف الدمج");
    await link(src.id, "500003");
    await storage.mergePatients(src.id, tgt.id);
    sent.length = 0;
    await update(msg("500003", "/id"));
    const merged = lastText();
    check(merged.includes(tgt.patient_code),
      "ح. **الردّ رمزُ الملفّ الباقي**", merged);
    check(!merged.includes(src.patient_code),
      "   **ولا يُعرَض الرمز القديم على المريض**", merged);
    same("   ومع ذلك يبقى القديم اسماً بديلاً في البحث الداخلي",
      (await q(`SELECT patient_id FROM patient_code_aliases WHERE code=$1`, [src.patient_code]))
        .map((r: any) => Number(r.patient_id)), [tgt.id]);

    // ══ ط. /start لم يتغيّر ═════════════════════════════════════════
    console.log("\n── ما لم يتغيّر ──");
    const p4 = await mkPatient("ربطٌ جديد");
    await link(p4.id, "500004");
    same("ط. /start ما زال يربط كما كان",
      (await q(`SELECT count(*)::int n FROM patient_contacts
                 WHERE patient_id=$1 AND revoked_at IS NULL`, [p4.id]))[0].n, 1);
    //  ولا يردّ مباشرةً: الترحيب يمرّ بالصادر كما كان قبل هذه الـPR.
    same("   وترحيبُه يُستحقّ في الصادر لا يُرسَل من المعاملة",
      (await welcomeRowFor(p4.id)) !== null, true);
    //  يُستقرّ الطابور أوّلاً: الربط قبل قليل كبس المرسِل، وترحيبٌ متأخّر
    //  يصل أثناء التأكيد يجعله يقرأ رسالةً ليست جوابَ طلبه.
    await drainOutbox();
    sent.length = 0;
    same("   و/start بلا حمولة يُرشِد", await update(msg("500005", "/start")), 200);
    check(sent.some((m) => m.text === MESSAGES.noPayload), "   بنصّه المعتاد",
      JSON.stringify(sent.map((m) => m.text)));

    sent.length = 0;
    same("   وأمرٌ مجهول يُتجاهَل صامتاً", await update(msg("500001", "/whatever")), 200);
    same("   بلا ردّ", sent.length, 0);
    await update(msg("500001", "/id 5"));
    same("   و«/id 5» ليست أمراً — تُتجاهَل", sent.length, 0);
    same("   وبلا سرٍّ صحيح لا يمرّ شيء", await update(msg("500001", "/id"), "wrong"), 401);

    // ══ ي. لا حدثَ مريض ═════════════════════════════════════════════
    const events = await q(
      `SELECT count(*)::int n FROM patient_events
        WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
    same("ي. **لا حدثَ مريض سُجّل بسبب الرمز ولا بسبب /id**", events[0].n, 0);
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
