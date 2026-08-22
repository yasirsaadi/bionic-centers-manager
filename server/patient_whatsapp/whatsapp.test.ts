// واتساب المريض — **حفظُ المريض = واتساب جاهزة**، حيّاً على Postgres وعلى
// نقطة التسجيل الحقيقية، **وبلا نداءِ شبكةٍ واحد إلى Meta**.
// قاعدة محلّية: `npm run test:whatsapp`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) تسجيلٌ برقمٍ عراقيّ محلّي ⟶ جهةٌ واحدة + ترحيبٌ واحد + الرمزُ فيه.
// (ب) والصيغةُ الدولية تعطي **الوجهةَ نفسَها بالضبط**.
// (ج) والرايةُ مطفأةً ⟶ لا جهةَ ولا ترحيب.
// (د) ورقمٌ غير صالح ⟶ التسجيلُ يُردّ، **ولا وجهةَ مشوّهة تُطابَر**.
// (هـ) وMeta معطَّلة ⟶ **المريضُ محفوظ** والصفُّ قابلٌ للإعادة.
// (و) وقالبُ الترحيب غير مُعدّ ⟶ الصفُّ ينتظر بـ٠ محاولات و**بلا نداء**.
// (ز) ثمّ يُضبَط ⟶ **الصفُّ نفسُه** يُرسَل.
// (ح) ورفضُ Meta الحقيقيّ ⟶ رمزٌ محدود، بلا جسم مزوّدٍ خام.
// (ط) وحمولةُ الترحيب **الرمزُ وحده** — ولا اسمَ ولا تشخيصَ ولا مالاً.
// (ي) وتغييرُ الرقم ⟶ القديمةُ تُختَم والجديدةُ تعمل، **وبلا ترحيبٍ ثانٍ**.
// (ك) والإطفاءُ يوقف كلَّ استحقاقٍ لاحق.
// (ل) وإعادةُ الرفع تعمل للمستقبل **بلا بثٍّ رجعيّ ولا ترحيبٍ مكرَّر**.
// (م) وحدثُ تصنيعٍ ⟶ صفٌّ واحد يُرسَل بقالب التحديث.
// (ن) **ولا أثرَ تشغيليّ لتلغرام المرضى** في المستودع.
// (ع) **وتنبيهاتُ المالك الداخلية باقيةٌ كما هي.**
// (ف) وإعادةُ طلب التسجيل لا تُنتج ترحيباً ثانياً.

import express from "express";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool, db } from "../db";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { dispatchOnce } from "../patient_notifications/dispatcher";
import { registerWhatsappWelcome } from "../patient_notifications/registration";
import { deliveriesForPatient, enqueueForActiveContacts, backoffFor } from "../patient_notifications/outbox";
import { REGISTRATION_WELCOME, welcomePreview, WELCOME_LINES, templateKindFor } from "../patient_notifications/render";
import { whatsappDestination, PATIENT_WHATSAPP_ENV, templateReady } from "./config";
import { CONTACT_CHANNELS } from "../patient_contacts/store";
import { PATIENT_EVENT_TYPES } from "@shared/patient_events";
import { normalizePhone } from "@shared/phone";

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
const WELCOME_TEMPLATE = "bionic_patient_welcome";
const UPDATE_TEMPLATE = "bionic_patient_update";
process.env[PATIENT_WHATSAPP_ENV.accessToken] = "TEST-WA-ACCESS-TOKEN-DO-NOT-USE";
process.env[PATIENT_WHATSAPP_ENV.phoneNumberId] = "111222333444555";
process.env[PATIENT_WHATSAPP_ENV.welcomeTemplate] = WELCOME_TEMPLATE;
process.env[PATIENT_WHATSAPP_ENV.updateTemplate] = UPDATE_TEMPLATE;
process.env[PATIENT_WHATSAPP_ENV.templateLanguage] = "ar";

const PORT = 6885;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-واتساب";
const ADMIN = 9891;

// ── جاسوسٌ على Graph: لا نداءَ شبكة، ونرى ما كان سيُرسَل ─────────────────
interface SentWa { to: string; template: string; param: string }
const waSent: SentWa[] = [];
/** إخفاقٌ مُبرمَج للنداء التالي — لإثبات مسار الفشل بلا شبكة. */
let waFailure: null | { status: number } | "network" = null;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const href = String(url);
  if (href.includes("graph.facebook.com")) {
    if (waFailure === "network") { waFailure = null; throw new TypeError("simulated network failure"); }
    if (waFailure) {
      const status = waFailure.status; waFailure = null;
      return new Response(JSON.stringify({ error: { message: "simulated", fbtrace_id: "SECRET" } }), { status });
    }
    const body = JSON.parse(String(init?.body ?? "{}"));
    waSent.push({
      to: String(body.to ?? ""),
      template: String(body.template?.name ?? ""),
      param: String(body.template?.components?.[0]?.parameters?.[0]?.text ?? ""),
    });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.TEST" }] }), { status: 200 });
  }
  return realFetch(url, init);
}) as any;

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}

const SESSION = {
  userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
  displayName: "المسؤول",
  permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true },
};
async function http(method: string, path: string, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(SESSION), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** جسمُ تسجيلٍ كاملٌ صالح — يتغيّر منه ما يخصّ السيناريو فقط. */
function newPatientBody(name: string, phone: string, extra: any = {}) {
  return {
    name: `${MARK} ${name}`, phone, referralSource: MARK,
    age: "40", height: "172", weight: "78",
    medicalCondition: "x", branchId: 1, totalCost: 0,
    patientClassification: "new", isPhysiotherapy: true,
    ...extra,
  };
}

const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
/** عزلٌ عن بقيّة الحزم: صفوفُ مرضى آخرين لا يلتقطها عاملُنا فيلوّث الجاسوس. */
async function quiesceForeignOutbox() {
  await q(`UPDATE patient_notification_deliveries SET status = 'skipped'
            WHERE status IN ('pending','failed','processing') AND patient_id NOT IN (${ids})`);
}

/**
 * ينتظر أن يهدأ الطابور — **بلا صفٍّ محجوزٍ في الطريق**.
 *
 * نقطةُ التسجيل تنادي `nudgeDispatcher()` «أطلق وانسَ» (وهو صحيحٌ في
 * الإنتاج: الحفظُ لا ينتظر شبكة). فحين يقيس الاختبارُ فوراً قد يجد الصفَّ
 * `processing` بين يدَي تلك الكبسة — لا `pending` ولا `sent`. فيُنتظَر
 * خروجُه من الحجز أوّلاً، ثمّ يُقاس.
 */
async function settle(timeoutMs = 4000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const [r] = await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patient_notification_deliveries
        WHERE status = 'processing' AND patient_id IN (${ids})`);
    if (r.n === 0) { await new Promise((x) => setTimeout(x, 40)); return; }
    await new Promise((x) => setTimeout(x, 50));
  }
}

const contactsOf = (patientId: number) => q<{ id: string; channel: string; external_id: string; relation: string; revoked_at: string | null }>(
  `SELECT id, channel, external_id, relation, revoked_at FROM patient_contacts
    WHERE patient_id = $1 ORDER BY id`, [patientId]);
const activeOf = async (patientId: number) =>
  (await contactsOf(patientId)).filter((c) => c.revoked_at === null);

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'wa_admin','x','المسؤول','admin',1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`, [ADMIN]);
  await cleanup();
  await quiesceForeignOutbox();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise<void>((r) => httpServer.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══ أ. تسجيلٌ برقمٍ عراقيّ محلّي ═══════════════════════════════════
    console.log("\n── أ. التسجيل: 0770… ──");
    waSent.length = 0;
    const rA = await http("POST", "/api/patients", newPatientBody("أ", "07701234567"));
    await settle();
    same("أ. **المريضُ حُفظ**", rA.status, 201);
    const pA = rA.body;
    check(Boolean(pA?.id && pA?.patientCode), "أ.١ وله رمزٌ قانونيّ", JSON.stringify(pA?.patientCode));
    same("أ.٢ **والرايةُ مرفوعة افتراضاً**", pA.whatsappNotificationsEnabled, true);
    check(Boolean(pA.whatsappConsentAt), "أ.٣ وموافقتُه مؤرَّخة", String(pA.whatsappConsentAt));
    same("   ومنسوبةٌ لمن أشّرها", pA.whatsappConsentByUserId, ADMIN);

    const cA = await activeOf(pA.id);
    same("أ.٤ **جهةُ واتسابٍ واحدة نشطة**", cA.length, 1);
    same("أ.٥ **والوجهةُ الدولية بأرقامٍ فقط**",
      [cA[0].channel, cA[0].external_id, cA[0].relation],
      ["whatsapp", "9647701234567", "self"]);

    const dA = await deliveriesForPatient(pA.id);
    //  **وقد أُرسل فعلاً**: الكبسةُ بعد الحفظ تُوصله في ثوانٍ — وهذا هو
    //  «حفظُ المريض = واتساب جاهزة» مقاساً لا موصوفاً.
    same("أ.٦ **صفُّ ترحيبٍ واحد بالضبط، وقد أُرسل**",
      dA.map((d) => [d.notificationType, d.channel, d.status]),
      [[REGISTRATION_WELCOME, "whatsapp", "sent"]]);
    same("أ.٧ **وحمولتُه الرمزُ وحده**", dA[0].payload, { patientCode: pA.patientCode });
    same("أ.٨ **ولا صفَّ تلغرام**", dA.filter((d) => d.channel === "telegram").length, 0);
    same("أ.٩ **ولا تذكرةَ ربطٍ إطلاقاً**",
      Number((await q(`SELECT COUNT(*)::int c FROM patient_link_tokens WHERE patient_id=$1`, [pA.id]))[0].c), 0);

    // ══ ب. الصيغةُ الدولية ⟶ الوجهةُ نفسها ══════════════════════════════
    console.log("\n── ب. +964… ──");
    const rB = await http("POST", "/api/patients", newPatientBody("ب", "+9647701234567"));
    await settle();
    same("ب. المريضُ حُفظ", rB.status, 201);
    const cB = await activeOf(rB.body.id);
    same("ب.١ **الوجهةُ مطابقةٌ للمحلّي حرفاً بحرف**", cB[0].external_id, cA[0].external_id);
    //  ومن مطبِّع المستودع نفسه — لا خوارزميةَ ثانية.
    same("ب.٢ **والمصدرُ `normalizePhone` وحده**",
      ["07701234567", "+9647701234567", "٠٧٧٠١٢٣٤٥٦٧", "00964 770 123 4567"]
        .map((v) => whatsappDestination(normalizePhone(v, "IQ").e164)),
      ["9647701234567", "9647701234567", "9647701234567", "9647701234567"]);
    same("ب.٣ ولا وجهةَ من رقمٍ لم يُطبَّع",
      [whatsappDestination(null), whatsappDestination("0770"), whatsappDestination("9647701234567")],
      [null, null, null]);

    // ══ ج. الرايةُ مطفأة ═══════════════════════════════════════════════
    console.log("\n── ج. مطفأة ──");
    const rC = await http("POST", "/api/patients",
      newPatientBody("ج", "07705550000", { whatsappNotificationsEnabled: false }));
    await settle();
    same("ج. المريضُ حُفظ", rC.status, 201);
    same("ج.١ **والرايةُ مطفأة**", rC.body.whatsappNotificationsEnabled, false);
    same("ج.٢ ولا ختمَ موافقةٍ ملفَّق", rC.body.whatsappConsentAt, null);
    same("ج.٣ **ولا جهةَ اتصال**", (await activeOf(rC.body.id)).length, 0);
    same("ج.٤ **ولا صفَّ ترحيب**", (await deliveriesForPatient(rC.body.id)).length, 0);

    // ══ د. رقمٌ غير صالح ════════════════════════════════════════════════
    console.log("\n── د. رقم غير صالح ──");
    const before = Number((await q(`SELECT COUNT(*)::int c FROM patient_contacts`))[0].c);
    const rD = await http("POST", "/api/patients", newPatientBody("د", "هاتف الجار"));
    same("د. **التسجيلُ يُردّ ٤٠٠** — بقاعدة الهاتف القائمة", rD.status, 400);
    same("د.١ **ولا جهةَ أُنشئت**",
      Number((await q(`SELECT COUNT(*)::int c FROM patient_contacts`))[0].c), before);
    same("د.٢ **ولا وجهةَ مشوّهة في الطابور**",
      Number((await q(
        `SELECT COUNT(*)::int c FROM patient_contacts WHERE external_id !~ '^[0-9]{8,15}$'`))[0].c), 0);

    // ══ هـ. Meta معطَّلة ═══════════════════════════════════════════════
    console.log("\n── هـ. Meta معطَّلة ──");
    waFailure = "network";
    const rE = await http("POST", "/api/patients", newPatientBody("هـ", "07709998888"));
    same("هـ. **المريضُ محفوظٌ رغم العطل**", rE.status, 201);
    await settle();
    await dispatchOnce(50);
    await settle();
    const dE = (await deliveriesForPatient(rE.body.id))[0];
    same("هـ.١ **والصفُّ فاشلٌ قابلٌ للإعادة**", dE.status, "failed");
    same("هـ.٢ برمزٍ محدود", dE.lastErrorCode, "whatsapp_network");
    check(dE.nextAttemptAt !== null
      && new Date(dE.nextAttemptAt).getTime() > Date.now() + backoffFor(1) - 5000,
      "هـ.٣ والتباعدُ سليم", String(dE.nextAttemptAt));
    same("هـ.٤ **والمريضُ ما زال في القاعدة**",
      Number((await q(`SELECT COUNT(*)::int c FROM patients WHERE id=$1`, [rE.body.id]))[0].c), 1);
    check(!String(dE.lastErrorCode ?? "").includes("SECRET"),
      "هـ.٥ ولا نصَّ مزوّدٍ خام", String(dE.lastErrorCode));

    // ══ و. قالبُ الترحيب غير مُعدّ ═════════════════════════════════════
    console.log("\n── و. بلا قالب ──");
    delete process.env[PATIENT_WHATSAPP_ENV.welcomeTemplate];
    same("و. **والنوعُ يُعلَن غيرَ جاهز**", templateReady("welcome"), false);
    const rF = await http("POST", "/api/patients", newPatientBody("و", "07707776666"));
    same("و.١ **المريضُ حُفظ**", rF.status, 201);
    await settle();
    waSent.length = 0;
    await dispatchOnce(50);
    await settle();
    const dF = (await deliveriesForPatient(rF.body.id))[0];
    same("و.٢ **الصفُّ ينتظر**", dF.status, "pending");
    same("و.٣ **وبلا محاولةٍ محروقة**", dF.attemptCount, 0);
    same("و.٤ ولا رمزَ خطأٍ ملفَّق", dF.lastErrorCode, null);
    same("و.٥ **ولا نداءَ إلى Meta إطلاقاً**", waSent.length, 0);

    // ══ ز. ثمّ يُضبَط القالب ═══════════════════════════════════════════
    console.log("\n── ز. ثمّ يُضبَط ──");
    process.env[PATIENT_WHATSAPP_ENV.welcomeTemplate] = WELCOME_TEMPLATE;
    await dispatchOnce(50);
    await settle();
    const dF2 = (await deliveriesForPatient(rF.body.id))[0];
    same("ز. **الصفُّ نفسُه أُرسل**", [dF2.id, dF2.status], [dF.id, "sent"]);
    const sentF = waSent.find((m) => m.param === rF.body.patientCode);
    check(Boolean(sentF) && sentF!.template === WELCOME_TEMPLATE,
      "ز.١ **بقالب الترحيب المُعدّ**", JSON.stringify(sentF));
    same("ز.٢ ووجهتُه رقمُه المسجَّل", sentF!.to, "9647707776666");

    // ══ ح. رفضُ Meta الحقيقيّ ══════════════════════════════════════════
    console.log("\n── ح. رفضُ القالب ──");
    waFailure = { status: 400 };
    const rH = await http("POST", "/api/patients", newPatientBody("ح", "07701110000"));
    await settle();
    await dispatchOnce(50);
    await settle();
    const dH = (await deliveriesForPatient(rH.body.id))[0];
    same("ح. **رمزُ خطأ القالب**", [dH.status, dH.lastErrorCode], ["failed", "whatsapp_template_error"]);
    same("ح.١ والمحاولةُ عُدَّت هنا (رفضٌ حقيقيّ لا إعدادٌ ناقص)", dH.attemptCount, 1);
    check(!JSON.stringify(dH).includes("fbtrace") && !JSON.stringify(dH).includes("SECRET"),
      "ح.٢ **ولا جسمَ مزوّدٍ خام في الصفّ**", JSON.stringify(dH).slice(0, 160));

    // ══ ط. ما لا يخرج في الترحيب ═══════════════════════════════════════
    console.log("\n── ط. ما لا يخرج ──");
    same("ط. **معامِلُ القالب هو الرمزُ وحده**",
      waSent.filter((m) => m.template === WELCOME_TEMPLATE)
        .every((m) => /^[A-Z]{2}-\d+$/.test(m.param)), true);
    const forbidden: [string, string][] = [
      ["اسم المريض", MARK], ["التشخيص", "x"], ["الهاتف", "07701234567"],
      ["رقم الصفّ", String(pA.id)],
    ];
    const allParams = waSent.map((m) => m.param).join("\n");
    for (const [label, needle] of forbidden) {
      check(!allParams.includes(needle), `ط.١ ولا ${label} في أي معامِل`, needle);
    }
    //  والنصُّ المرجعيّ للقالب هو ما أملاه المالك حرفاً — والرمزُ متغيّرُه الوحيد.
    const preview = welcomePreview("WB-201234");
    check(preview.includes("أهلاً وسهلاً بكم في مجموعة مراكز الدكتور ياسر الساعدي (الوارث وبايونك)")
      && preview.includes("تم تسجيل ملفكم بنجاح في نظام المراكز الموحد.")
      && preview.includes("رمز ملفكم: WB-201234")
      && preview.includes("نتمنى لكم دوام الصحة والعافية"),
      "ط.٢ **ونصُّ الترحيب المرجعيّ كما أُملي**", preview);
    same("ط.٣ **ولا اسمَ مريضٍ متغيّراً في القالب** — معامِلٌ واحد",
      WELCOME_LINES.join("\n").match(/\{\{\w+\}\}/g), ["{{code}}"]);
    same("ط.٤ والترحيبُ يخصّ قالبَه، والتصنيعُ قالبَه",
      [templateKindFor(REGISTRATION_WELCOME),
       templateKindFor(PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED)],
      ["welcome", "update"]);

    // ══ ي. تغييرُ الرقم ════════════════════════════════════════════════
    console.log("\n── ي. تغييرُ الرقم ──");
    const beforeWelcomes = (await deliveriesForPatient(pA.id))
      .filter((d) => d.notificationType === REGISTRATION_WELCOME).length;
    const rY = await http("PUT", `/api/patients/${pA.id}`, { phone: "07712223333" });
    same("ي. التعديلُ نجح", rY.status, 200);
    const cY = await contactsOf(pA.id);
    same("ي.١ **القديمةُ خُتمت والجديدةُ نشطة**",
      cY.map((c) => [c.external_id, c.revoked_at === null]),
      [["9647701234567", false], ["9647712223333", true]]);
    same("ي.٢ **ولا ترحيبَ ثانٍ** — تعديلُ رقمٍ ليس تسجيلاً",
      (await deliveriesForPatient(pA.id))
        .filter((d) => d.notificationType === REGISTRATION_WELCOME).length, beforeWelcomes);
    //  والحدثُ التالي يذهب إلى الجديد وحده.
    const evY = await q<{ id: number }>(
      `INSERT INTO patient_events (patient_id, branch_id, event_type, payload, actor_user_id)
       VALUES ($1,1,$2,'{}'::jsonb,$3) RETURNING id`,
      [pA.id, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED, ADMIN]);
    await db.transaction((tx) => enqueueForActiveContacts(tx as any, {
      patientId: pA.id, patientEventId: evY[0].id,
      notificationType: PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED,
      payload: { stage: "mold", serviceType: "prosthetic" },
    }));
    waSent.length = 0;
    await dispatchOnce(50);
    await settle();
    same("ي.٣ **والحدثُ التالي إلى الرقم الجديد وحده**",
      waSent.map((m) => m.to), ["9647712223333"]);

    // ══ ك. الإطفاء ═════════════════════════════════════════════════════
    console.log("\n── ك. الإطفاء ──");
    same("ك. التبديلُ نجح",
      (await http("PUT", `/api/patients/${pA.id}`, { whatsappNotificationsEnabled: false })).status, 200);
    same("ك.١ **ولا جهةَ نشطة**", (await activeOf(pA.id)).length, 0);
    const evK = await q<{ id: number }>(
      `INSERT INTO patient_events (patient_id, branch_id, event_type, payload, actor_user_id)
       VALUES ($1,1,$2,'{}'::jsonb,$3) RETURNING id`,
      [pA.id, PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERED, ADMIN]);
    const queuedK = await db.transaction((tx) => enqueueForActiveContacts(tx as any, {
      patientId: pA.id, patientEventId: evK[0].id,
      notificationType: PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERED,
      payload: { stage: "delivered", serviceType: "prosthetic" },
    }));
    same("ك.٢ **ولا صفَّ يُستحقّ بعد الإطفاء**", queuedK, 0);

    // ══ ل. إعادةُ الرفع ════════════════════════════════════════════════
    console.log("\n── ل. إعادةُ الرفع ──");
    const beforeRows = (await deliveriesForPatient(pA.id)).length;
    same("ل. التبديلُ نجح",
      (await http("PUT", `/api/patients/${pA.id}`, { whatsappNotificationsEnabled: true })).status, 200);
    same("ل.١ **جهةٌ نشطة من الرقم الحالي**",
      (await activeOf(pA.id)).map((c) => c.external_id), ["9647712223333"]);
    same("ل.٢ **ولا صفَّ رجعيّ ولا ترحيبَ مكرَّر**",
      (await deliveriesForPatient(pA.id)).length, beforeRows);
    //  والمستقبلُ يعمل.
    const evL = await q<{ id: number }>(
      `INSERT INTO patient_events (patient_id, branch_id, event_type, payload, actor_user_id)
       VALUES ($1,1,$2,'{}'::jsonb,$3) RETURNING id`,
      [pA.id, PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY, ADMIN]);
    same("ل.٣ **والحدثُ الجديد يُستحقّ**",
      await db.transaction((tx) => enqueueForActiveContacts(tx as any, {
        patientId: pA.id, patientEventId: evL[0].id,
        notificationType: PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY,
        payload: { stage: "ready_for_fitting", serviceType: "prosthetic" },
      })), 1);

    // ══ م. حدثُ تصنيعٍ بقالب التحديث ═══════════════════════════════════
    console.log("\n── م. تحديثُ التصنيع ──");
    waSent.length = 0;
    await dispatchOnce(50);
    await settle();
    const upd = waSent.find((m) => m.template === UPDATE_TEMPLATE);
    check(Boolean(upd), "م. **أُرسل بقالب التحديث**", JSON.stringify(waSent));
    check(upd!.param.includes("جاهزاً للتجربة"),
      "م.١ **ومعامِلُه نصُّ العارض نفسه**", upd!.param);
    check(!upd!.param.includes(MARK) && !/\d{6,}/.test(upd!.param.replace(/\d{2}\/\d{2}\/\d{4}/g, "")),
      "م.٢ ولا اسمَ ولا مبلغَ فيه", upd!.param);

    // ══ ن. لا أثرَ تشغيليّ لتلغرام المرضى ═══════════════════════════════
    console.log("\n── ن. تلغرام المرضى ──");
    check(!existsSync(join(import.meta.dirname, "..", "patient_telegram")),
      "ن. **مجلّد `server/patient_telegram/` أُزيل**");
    const routesSrc = readFileSync(join(import.meta.dirname, "..", "routes.ts"), "utf8");
    check(!/patient_telegram|registerPatientTelegramWebhook/.test(routesSrc),
      "ن.١ **ولا تسجيلَ نقطةِ تلغرام للمرضى**",
      (routesSrc.match(/.*patient_telegram.*/g) ?? []).join(" | "));
    check(!existsSync(join(import.meta.dirname, "..", "patient_notifications", "transports.ts")),
      "ن.٢ **ولا سجلَّ نواقلَ ثنائياً**");
    same("ن.٣ **والقناةُ المدعومة واحدة**", [...CONTACT_CHANNELS], ["whatsapp"]);
    //  **بلا تعليقات**: سطرٌ يشرح ما أُزيل ليس هو الشيءَ المُزال.
    const cardSrc = readFileSync(
      join(import.meta.dirname, "../../client/src/components/PatientCommunicationCard.tsx"), "utf8")
      .split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*")
        && !l.trim().startsWith("/*")).join("\n");
    check(!/Telegram|QRCode|qrcode|ربط واتساب|deepLink|link-token/i.test(cardSrc),
      "ن.٤ **ولا واجهةَ ربطٍ ولا رمزَ QR في البطاقة**",
      (cardSrc.match(/.*(Telegram|QR|deepLink).*/gi) ?? []).join(" | "));
    //  ولا صفَّ تلغرامٍ **جديد** يُنشأ لأي مريضٍ من هذه الحزمة.
    same("ن.٥ **ولا جهةَ تلغرامٍ أُنشئت**",
      Number((await q(
        `SELECT COUNT(*)::int c FROM patient_contacts
          WHERE channel <> 'whatsapp' AND patient_id IN (${ids})`))[0].c), 0);

    // ══ ع. تنبيهاتُ المالك الداخلية باقية ══════════════════════════════
    console.log("\n── ع. تنبيهاتُ الإدارة ──");
    check(existsSync(join(import.meta.dirname, "..", "notifications", "telegram.ts")),
      "ع. **`server/notifications/telegram.ts` قائمٌ كما هو**");
    check(/notifyNewPatient/.test(routesSrc),
      "ع.١ **وما زال يُنادى عند تسجيل مريض** — شأنٌ آخر تماماً");

    // ══ ف. إعادةُ طلب التسجيل ══════════════════════════════════════════
    console.log("\n── ف. إعادةُ الطلب ──");
    //  نفسُ الرقم لمريضٍ ثانٍ: جهةٌ ثانية مشروعة (أبٌ وابنه)، وترحيبٌ لكلٍّ.
    const rP1 = await http("POST", "/api/patients", newPatientBody("ف١", "07714445555"));
    const rP2 = await http("POST", "/api/patients", newPatientBody("ف٢", "07714445555"));
    await settle();
    same("ف. **رقمٌ واحد لملفَّين مشروع**", [rP1.status, rP2.status], [201, 201]);
    same("ف.١ ولكلٍّ جهتُه وترحيبُه",
      [(await activeOf(rP1.body.id)).length, (await activeOf(rP2.body.id)).length], [1, 1]);
    //  **وإعادةُ الاستحقاق لنفس الجهة لا تُنتج ترحيباً ثانياً** — الفهرسُ يحسم.
    const dup = await storage.getPatient(rP1.body.id);
    await db.transaction((tx) => registerWhatsappWelcome(tx as any, {
      patientId: dup!.id, phoneE164: dup!.phoneE164,
      patientCode: dup!.patientCode, enabled: true,
    }));
    same("ف.٢ **وإعادةُ النداء لا تُنتج صفّاً ثانياً**",
      (await deliveriesForPatient(rP1.body.id))
        .filter((d) => d.notificationType === REGISTRATION_WELCOME).length, 1);
    same("ف.٣ **ولا جهةَ مكرَّرة**", (await activeOf(rP1.body.id)).length, 1);

    //  ولا ترحيبَ استُحقّ لمريضٍ سابقٍ على الميزة (الرايةُ افتراضُها FALSE).
    const legacy = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
                             medical_condition, branch_id, total_cost)
       VALUES ($1,'07700000001','+9647700000001','ok',$2,'50','x',1,0) RETURNING id`,
      [`${MARK} قديم`, MARK]);
    same("ف.٤ **ومريضٌ أُدرج بلا رايةٍ لا يُستحقّ له شيء**",
      (await deliveriesForPatient(legacy[0].id)).length, 0);
    same("   ورايتُه مطفأةٌ بحكم القاعدة",
      (await q(`SELECT whatsapp_notifications_enabled e FROM patients WHERE id=$1`, [legacy[0].id]))[0].e,
      false);

    // ولا ترحيلَ يبثّ للقدامى: لا حلقةَ في ٠٦٢ ولا مسحَ إقلاع.
    const mig = readFileSync(
      join(import.meta.dirname, "..", "migrations", "062_whatsapp_notification_consent.ts"), "utf8");
    check(!/INSERT INTO patient_notification_deliveries|UPDATE patients\s+SET whatsapp_notifications_enabled = TRUE/i.test(mig),
      "ف.٥ **ولا بثَّ جماعيّ في الترحيل**");
    check(/DEFAULT FALSE/.test(mig), "ف.٦ **وافتراضُ العمود FALSE صراحةً**");
    void readdirSync;
  } finally {
    globalThis.fetch = realFetch;
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = $1`, [ADMIN]);
    await q(`DELETE FROM system_users WHERE id = $1`, [ADMIN]);
    httpServer.close();
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
