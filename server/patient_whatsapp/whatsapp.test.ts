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
// (ص) **ذرّيّةُ الكتابة**: عطلُ قاعدةٍ عند التسجيل أو عند تغيير الرقم لا
//     يترك حالةً نصفَ مكتوبة — ولا رقماً جديداً مع جهةٍ قديمة نشطة.
// (ق) **ولا تجويع**: صفوفٌ بلا قالبٍ لا تستهلك سعةَ الدفعة، والمؤهَّلُ
//     خلفها يُرسَل.
// (ر) **وحقلُ الموافقة في نموذج تعديل المريض** — لا في شاشةٍ ثانية.

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
//  `params` **بترتيبها** كما وصلت Graph — واحدٌ للترحيب، اثنان للتحديث
//  (الرمزُ القانونيّ ثمّ نصُّ الحالة، إصلاحٌ 2026-09-03).
interface SentWa { to: string; template: string; params: string[] }
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
      params: ((body.template?.components?.[0]?.parameters ?? []) as any[])
        .map((p) => String(p?.text ?? "")),
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

/** مريضٌ يملك طابوراً صناعياً — لاختبار سعةِ الدفعة بلا خمسةٍ وعشرين تسجيلاً. */
async function mkQueueOwner(): Promise<{ id: number; code: string }> {
  const r = await q<{ id: number; patient_code: string }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
                           medical_condition, branch_id, total_cost)
     VALUES ($1,'07700000009','+9647700000009','ok',$2,'40','x',1,0)
     RETURNING id, patient_code`, [`${MARK} طابور`, MARK]);
  return { id: r[0].id, code: r[0].patient_code };
}

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
  //  **مثلُ الإنتاج**: `server/index.ts` يركّب معالجَ أخطاءٍ عامّاً يردّ ٥٠٠
  //  ولا يرمي (PR #71). وبدونه هنا كان خطأُ قاعدةٍ متعمَّد يُسقط العملية
  //  بدل أن يُقاس ردُّه — فيبدو الاختبارُ منهاراً وهو يقيس السلوك الصحيح.
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (res.headersSent) return;
    res.status(err?.status ?? 500).json({ message: "خطأ في الخادم" });
  });
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
    const sentF = waSent.find((m) => m.params[0] === rF.body.patientCode);
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
    same("ط. **معامِلٌ واحدٌ بالضبط، وهو الرمزُ وحده** — لا شيءَ آخر",
      waSent.filter((m) => m.template === WELCOME_TEMPLATE)
        .every((m) => m.params.length === 1 && /^[A-Z]{2}-\d+$/.test(m.params[0])), true);
    const forbidden: [string, string][] = [
      ["اسم المريض", MARK], ["التشخيص", "x"], ["الهاتف", "07701234567"],
      ["رقم الصفّ", String(pA.id)],
    ];
    const allParams = waSent.flatMap((m) => m.params).join("\n");
    for (const [label, needle] of forbidden) {
      check(!allParams.includes(needle), `ط.١ ولا ${label} في أي معامِل`, needle);
    }
    //  والنصُّ المرجعيّ للقالب هو ما أملاه المالك حرفاً — والرمزُ متغيّرُه الوحيد.
    const preview = welcomePreview("WB-201234");
    check(preview.includes("أهلاً وسهلاً بكم في مجموعة مراكز الدكتور ياسر الساعدي (الوارث وبايونك)")
      && preview.includes("تم تسجيل ملفكم بنجاح في نظام المراكز الموحد.")
      && preview.includes("رقم ملفكم في نظام المراكز: WB-201234")
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

    // ══ م. حدثُ تصنيعٍ بقالب التحديث — معامِلان: الرمزُ ثمّ نصُّ الحالة ══
    console.log("\n── م. تحديثُ التصنيع ──");
    waSent.length = 0;
    await dispatchOnce(50);
    await settle();
    const upd = waSent.find((m) => m.template === UPDATE_TEMPLATE);
    check(Boolean(upd), "م. **أُرسل بقالب التحديث**", JSON.stringify(waSent));
    same("م.١ **بمعامِلَين بالضبط** — لا واحدٍ كالترحيب", upd?.params.length, 2);
    same("م.٢ **الأوّلُ رمزُ المريض القانونيّ صاحبِ الملفّ بعينه**",
      upd?.params[0], pA.patientCode);
    check(!!upd?.params[1]?.includes("جاهزاً للتجربة"),
      "م.٣ **والثاني نصُّ العارض نفسه**", upd?.params[1]);
    check(!upd?.params[1]?.includes(MARK)
      && !/\d{6,}/.test((upd?.params[1] ?? "").replace(/\d{2}\/\d{2}\/\d{4}/g, "")),
      "م.٤ ولا اسمَ ولا مبلغَ في نصّ الحالة", upd?.params[1]);

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

    // ══ ص. ذرّيّةُ الكتابة — **عطلُ قاعدةٍ لا يترك نصفَ حالة** ═══════════
    //
    //  ══ عطلان لا عطلٌ واحد ═══════════════════════════════════════════
    //  عطلُ المزوّد (هـ أعلاه) **لا يتراجع عن شيء** — الحفظُ ثابت والصفُّ
    //  يُعاد. أمّا عطلُ **القاعدة نفسِها** فلا يجوز أن يُبتلَع: ردٌّ ٢٠١
    //  بمريضٍ رايتُه مرفوعة بلا جهةٍ وبلا ترحيب وعدٌ ضاع بلا أن يعلم أحد.
    console.log("\n── ص. ذرّيّة الكتابة ──");
    //  حاجزٌ في القاعدة يرفض إدراجَ صفّ الترحيب — أقربُ ما يكون لعطلٍ حقيقيّ.
    await q(`CREATE OR REPLACE FUNCTION wa_test_block_welcome() RETURNS trigger AS $$
             BEGIN RAISE EXCEPTION 'wa_test: welcome insert blocked'; END $$ LANGUAGE plpgsql`);
    await q(`DROP TRIGGER IF EXISTS wa_test_block_welcome ON patient_notification_deliveries`);
    await q(`CREATE TRIGGER wa_test_block_welcome BEFORE INSERT ON patient_notification_deliveries
             FOR EACH ROW WHEN (NEW.notification_type = '${REGISTRATION_WELCOME}')
             EXECUTE FUNCTION wa_test_block_welcome()`);
    const rS = await http("POST", "/api/patients", newPatientBody("ص", "07713334444"));
    check(rS.status >= 400,
      "ص. **التسجيلُ لا يُبلِّغ نجاحاً وحالتُه ناقصة**", `${rS.status}`);
    const orphan = await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patients
        WHERE referral_source = '${MARK}' AND phone_e164 = '+9647713334444'`);
    same("ص.١ **ولا مريضَ نصفَ مكتوب** — المعاملةُ تراجعت كاملةً", orphan[0].n, 0);
    same("ص.٢ ولا جهةَ يتيمة",
      Number((await q(`SELECT COUNT(*)::int n FROM patient_contacts
                        WHERE external_id = '9647713334444'`))[0].n), 0);

    await q(`DROP TRIGGER wa_test_block_welcome ON patient_notification_deliveries`);
    const rS2 = await http("POST", "/api/patients", newPatientBody("ص٢", "07713334444"));
    await settle();
    same("ص.٣ **وبعد زوال العطل يمرّ التسجيل**", rS2.status, 201);
    same("ص.٤ **بجهةٍ واحدة وترحيبٍ واحد**",
      [(await activeOf(rS2.body.id)).length,
       (await deliveriesForPatient(rS2.body.id))
         .filter((d) => d.notificationType === REGISTRATION_WELCOME).length],
      [1, 1]);

    //  ── وتغييرُ الرقم: **لا رقمٌ جديد مع جهةٍ قديمة نشطة أبداً** ──────
    const beforePhone = (await q<{ phone_e164: string }>(
      `SELECT phone_e164 FROM patients WHERE id=$1`, [rS2.body.id]))[0].phone_e164;
    const beforeContacts = (await activeOf(rS2.body.id)).map((c) => c.external_id);
    await q(`CREATE OR REPLACE FUNCTION wa_test_block_contact() RETURNS trigger AS $$
             BEGIN RAISE EXCEPTION 'wa_test: contact insert blocked'; END $$ LANGUAGE plpgsql`);
    await q(`DROP TRIGGER IF EXISTS wa_test_block_contact ON patient_contacts`);
    await q(`CREATE TRIGGER wa_test_block_contact BEFORE INSERT ON patient_contacts
             FOR EACH ROW WHEN (NEW.external_id = '9647715556666')
             EXECUTE FUNCTION wa_test_block_contact()`);
    const rS3 = await http("PUT", `/api/patients/${rS2.body.id}`, { phone: "07715556666" });
    check(rS3.status >= 400, "ص.٥ **والتعديلُ يفشل معلَناً لا صامتاً**", `${rS3.status}`);
    same("ص.٦ **والرقمُ بقي على حاله المتّسق**",
      (await q<{ phone_e164: string }>(
        `SELECT phone_e164 FROM patients WHERE id=$1`, [rS2.body.id]))[0].phone_e164, beforePhone);
    same("ص.٧ **والجهةُ النشطة هي هي** — لا رقمٌ جديد مع جهةٍ قديمة",
      (await activeOf(rS2.body.id)).map((c) => c.external_id), beforeContacts);
    await q(`DROP TRIGGER wa_test_block_contact ON patient_contacts`);

    // ══ ق. لا تجويع — التصفيةُ بالقالب قبل `LIMIT` ═════════════════════
    //
    //  السيناريو الذي كان يقع: الدفعةُ عشرون، والترتيبُ بالأقدم. فثلاثون
    //  ترحيباً بلا قالبٍ معتمَد كانت تُحجَز ثم تُعاد في كلّ دورة، **وتحديثُ
    //  التصنيع خلفها لا يبلغ الدفعةَ أبداً**.
    console.log("\n── ق. لا تجويع ──");
    const pQ = await mkQueueOwner();
    //  ٢٥ جهةً وترحيباً لكلٍّ — أقدمُ من التحديث بدقيقة.
    for (let i = 0; i < 25; i++) {
      const cid = Number((await q<{ id: string }>(
        `INSERT INTO patient_contacts (patient_id, channel, relation, external_id, linked_at)
         VALUES ($1,'whatsapp','self',$2,NOW()) RETURNING id`,
        [pQ.id, `96477000${String(i).padStart(4, "0")}`]))[0].id);
      await q(`INSERT INTO patient_notification_deliveries
                 (patient_id, patient_contact_id, channel, notification_type, payload,
                  next_attempt_at)
               VALUES ($1,$2,'whatsapp',$3,$4::jsonb, NOW() - INTERVAL '1 minute')`,
        [pQ.id, cid, REGISTRATION_WELCOME, JSON.stringify({ patientCode: pQ.code })]);
    }
    const cUpd = Number((await q<{ id: string }>(
      `INSERT INTO patient_contacts (patient_id, channel, relation, external_id, linked_at)
       VALUES ($1,'whatsapp','self','9647799999999',NOW()) RETURNING id`, [pQ.id]))[0].id);
    const evQ = (await q<{ id: number }>(
      `INSERT INTO patient_events (patient_id, branch_id, event_type, payload, actor_user_id)
       VALUES ($1,1,$2,'{}'::jsonb,$3) RETURNING id`,
      [pQ.id, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED, ADMIN]))[0];
    await q(`INSERT INTO patient_notification_deliveries
               (patient_id, patient_event_id, patient_contact_id, channel, notification_type,
                payload, next_attempt_at)
             VALUES ($1,$2,$3,'whatsapp',$4,'{"stage":"mold","serviceType":"prosthetic"}'::jsonb, NOW())`,
      [pQ.id, evQ.id, cUpd, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED]);

    //  قالبُ الترحيب غائب، وقالبُ التحديث جاهز.
    delete process.env[PATIENT_WHATSAPP_ENV.welcomeTemplate];
    waSent.length = 0;
    await dispatchOnce(20);   // نفسُ حجم الدفعة الحقيقيّ
    await settle();
    check(waSent.some((m) => m.template === UPDATE_TEMPLATE && m.to === "9647799999999"),
      "ق. **تحديثُ التصنيع خلف ٢٥ ترحيباً وصل**", JSON.stringify(waSent.slice(0, 3)));
    same("ق.١ **ولا ترحيبَ أُرسل**",
      waSent.filter((m) => m.template === WELCOME_TEMPLATE).length, 0);
    const stuck = await q<{ n: number; a: number }>(
      `SELECT COUNT(*)::int n, COALESCE(MAX(attempt_count),0)::int a
         FROM patient_notification_deliveries
        WHERE patient_id=$1 AND notification_type=$2`, [pQ.id, REGISTRATION_WELCOME]);
    same("ق.٢ **والترحيباتُ الخمسةُ والعشرون تنتظر بـ٠ محاولات**",
      [stuck[0].n, stuck[0].a], [25, 0]);
    same("ق.٣ **ولا صفَّ ترحيبٍ محجوز**",
      Number((await q(`SELECT COUNT(*)::int n FROM patient_notification_deliveries
                        WHERE patient_id=$1 AND notification_type=$2 AND status <> 'pending'`,
        [pQ.id, REGISTRATION_WELCOME]))[0].n), 0);

    //  ── العكس: قالبُ التحديث غائب والترحيبُ جاهز ──────────────────────
    process.env[PATIENT_WHATSAPP_ENV.welcomeTemplate] = WELCOME_TEMPLATE;
    delete process.env[PATIENT_WHATSAPP_ENV.updateTemplate];
    waSent.length = 0;
    await dispatchOnce(20);
    await settle();
    check(waSent.length > 0 && waSent.every((m) => m.template === WELCOME_TEMPLATE),
      "ق.٤ **والعكس: الترحيبُ الجاهز يمرّ وحده**",
      JSON.stringify(waSent.map((m) => m.template).slice(0, 3)));

    //  ── ثمّ يُضبَط الغائب ⟶ **الصفوفُ نفسُها** تُرسَل ─────────────────
    process.env[PATIENT_WHATSAPP_ENV.updateTemplate] = UPDATE_TEMPLATE;
    const updRowBefore = (await q<{ id: string; status: string }>(
      `SELECT id, status FROM patient_notification_deliveries
        WHERE patient_id=$1 AND notification_type=$2`,
      [pQ.id, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED]))[0];
    waSent.length = 0;
    await dispatchOnce(50);
    await settle();
    const updRowAfter = (await q<{ id: string; status: string }>(
      `SELECT id, status FROM patient_notification_deliveries
        WHERE patient_id=$1 AND notification_type=$2`,
      [pQ.id, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED]))[0];
    same("ق.٥ **وبعد ضبطه: الصفُّ نفسُه بمعرّفه أُرسل**",
      [updRowAfter.id, updRowAfter.status], [updRowBefore.id, "sent"]);

    //  ── ورفضُ Meta لقالبٍ **مُعدٍّ فعلاً** يبقى خطأً حقيقياً ──────────
    const pR = await http("POST", "/api/patients", newPatientBody("ق-رفض", "07718889999"));
    await settle();
    await q(`UPDATE patient_notification_deliveries
                SET status='pending', attempt_count=0, next_attempt_at=NOW(), last_error_code=NULL
              WHERE patient_id=$1`, [pR.body.id]);
    waFailure = { status: 400 };
    await dispatchOnce(50);
    await settle();
    same("ق.٦ **ورفضُ Meta لقالبٍ مُعدٍّ = خطأٌ حقيقيّ**",
      (await deliveriesForPatient(pR.body.id)).map((d) => [d.status, d.lastErrorCode]),
      [["failed", "whatsapp_template_error"]]);

    // ══ ر. حقلُ الموافقة في **نموذج تعديل المريض** ═════════════════════
    console.log("\n── ر. نموذج التعديل ──");
    const editSrc = readFileSync(
      join(import.meta.dirname, "../../client/src/pages/EditPatient.tsx"), "utf8");
    check(/checkbox-whatsapp-consent/.test(editSrc),
      "ر. **المربّعُ موجودٌ في نموذج التعديل**");
    check(/إرسال إشعارات وتحديثات المركز عبر واتساب على الرقم المسجل/.test(editSrc),
      "ر.١ **بالنصّ نفسه الذي في التسجيل**");
    check(/whatsappNotificationsEnabled: \(patient as any\)\.whatsappNotificationsEnabled === true/
      .test(editSrc),
      "ر.٢ **وقيمتُه الابتدائية من بيانات المريض** لا افتراضاً",
      (editSrc.match(/.*whatsappNotificationsEnabled.*/g) ?? []).join(" | "));
    check(/form\.setValue\("whatsappNotificationsEnabled", e\.target\.checked\)/.test(editSrc),
      "ر.٣ ويُكتب في النموذج فيدخل حمولة الحفظ");
    //  الحمولةُ صارت `data` مبنيّةً من `values` (ترحيل ٠٦٥ أضاف حقلاً واحداً
    //  يُرسَل بلمسةٍ فقط)، **وحقولُ النموذج كلُّها ما زالت فيها** — وهو
    //  الثابتُ الذي يحرسه هذا الفحص: رايةُ واتساب تبلغ PUT.
    check(/const data: any = \{ \.\.\.values \};/.test(editSrc)
      && /mutate\(\{ id: patientId, data \}/.test(editSrc),
      "ر.٤ **والحفظُ يرسل النموذجَ كاملاً** — فالحقلُ في حمولة PUT",
      (editSrc.match(/.*mutate\(\{ id: patientId.*/g) ?? []).join(" | "));
    //  ولا بابَ ثانٍ: البطاقةُ حالةٌ تُقرأ لا شاشةُ إدارة.
    check(!/checkbox|onChange|mutate|apiRequest/.test(cardSrc),
      "ر.٥ **والبطاقةُ بلا أيّ زرٍّ أو تبديل**", cardSrc.slice(0, 120));
    //  والخادمُ يقبل الحقل فعلاً على PUT (مُثبَتٌ حيّاً في ك/ل أعلاه).
    same("ر.٦ **والخادمُ يقبله على PUT** (أُثبت حيّاً في ك/ل)",
      (await http("PUT", `/api/patients/${rS2.body.id}`,
        { whatsappNotificationsEnabled: true })).status, 200);

    // ══ س. رمزٌ فاسدٌ أو مفقود على صفّ تحديث — فشلٌ آمن بلا نداءٍ مشوَّه ══
    //
    // ══ لماذا هذا السيناريو تحديداً ═══════════════════════════════════
    // `patients.patient_code` مقفلٌ بـNOT NULL وقيدِ صيغةٍ معاً (ترحيل
    // ٠٥٢)، فملفٌّ حقيقيّ لا يحمل رمزاً فاسداً في التشغيل العاديّ أبداً.
    // وإثباتُ الحارس يحتاج كسرَ هذا الضمان **عمداً ومؤقّتاً** — نفسُ
    // أسلوب حواجز قسم «ص» أعلاه — لا لأن الحالة تقع طبيعياً، بل لأن
    // الحارس في `dispatcher.ts` يجب أن يصمد لو وقعت رغم كلّ ذلك.
    console.log("\n── س. رمزٌ فاسدٌ على المتابعة ──");
    const rS4 = await http("POST", "/api/patients", newPatientBody("س", "07716667777"));
    await settle();
    same("س. المريضُ حُفظ", rS4.status, 201);
    const pS = rS4.body;
    const evS = await q<{ id: number }>(
      `INSERT INTO patient_events (patient_id, branch_id, event_type, payload, actor_user_id)
       VALUES ($1,1,$2,'{}'::jsonb,$3) RETURNING id`,
      [pS.id, PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED, ADMIN]);
    same("س.١ **وحدثُ تحديثٍ يُستحقّ له كالمعتاد**",
      await db.transaction((tx) => enqueueForActiveContacts(tx as any, {
        patientId: pS.id, patientEventId: evS[0].id,
        notificationType: PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED,
        payload: { stage: "mold", serviceType: "prosthetic" },
      })), 1);

    //  كسرُ ضمان الرمز عمداً — يُعاد فوراً بعد القياس، ومرّةً أخرى في
    //  `finally` احتياطاً لو فشل قياسٌ في المنتصف.
    await q(`ALTER TABLE patients DROP CONSTRAINT ck_patients_patient_code_format`);
    await q(`UPDATE patients SET patient_code = 'INVALID-CODE' WHERE id = $1`, [pS.id]);

    waSent.length = 0;
    await dispatchOnce(50);
    await settle();
    same("س.٢ **ولا نداءَ Meta إطلاقاً — لا قالبَ مشوَّهاً يُرسَل**",
      waSent.filter((m) => m.to === "9647716667777").length, 0);
    const dS = (await deliveriesForPatient(pS.id))
      .find((d) => d.notificationType === PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED);
    same("س.٣ **والصفُّ يُخطَّى آمناً برمزٍ محدود، بلا محاولةٍ محروقة**",
      [dS?.status, dS?.lastErrorCode, dS?.attemptCount], ["skipped", "render_failed", 0]);

    //  واستعادةُ القيد والقيمة فوراً — لا في `finally` وحده، فبقيّةُ
    //  الملفّ (إن وُجد المزيد) يجب أن تعمل على قاعدةٍ سليمة كما كانت.
    await q(`UPDATE patients SET patient_code = $2 WHERE id = $1`, [pS.id, pS.patientCode]);
    await q(`ALTER TABLE patients ADD CONSTRAINT ck_patients_patient_code_format
             CHECK (patient_code ~ '^WB-[0-9]{5,}$')`);
  } finally {
    //  حزامٌ ثانٍ: لو فشل قياسٌ في قسم «س» قبل إعادة القيد أعلاه، هذا
    //  يضمن ألّا يبقى مفقوداً على القاعدة المشتركة لأيّ تشغيلٍ تالٍ.
    await q(`DO $$ BEGIN
               IF NOT EXISTS (SELECT 1 FROM pg_constraint
                               WHERE conname = 'ck_patients_patient_code_format') THEN
                 ALTER TABLE patients ADD CONSTRAINT ck_patients_patient_code_format
                   CHECK (patient_code ~ '^WB-[0-9]{5,}$');
               END IF;
             END $$;`);
    globalThis.fetch = realFetch;
    //  **حواجزُ العطل المتعمَّد تُرفع دائماً** — انهيارٌ في المنتصف كان
    //  يتركها على الجدول فتُسقط كلَّ تشغيلٍ تالٍ بلا سببٍ مفهوم.
    await q(`DROP TRIGGER IF EXISTS wa_test_block_welcome ON patient_notification_deliveries`);
    await q(`DROP TRIGGER IF EXISTS wa_test_block_contact ON patient_contacts`);
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
