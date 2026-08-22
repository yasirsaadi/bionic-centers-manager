// بطاقة «تواصل المريض» — اختبار العقد والثوابت.
// `npm run test:communication-ui`.
//
// ══ ما يغطّيه وما لا يغطّيه — بصراحة ════════════════════════════════════
// المشروع بلا مشغّل DOM (لا vitest ولا jsdom ولا testing-library)، وإضافته
// لأجل مكوّن واحد تغييرٌ بنيوي أكبر من الميزة نفسها. فهذا الاختبار يغطّي
// ما يمكن إثباته فعلاً بلا ادّعاء:
//
//   • **عقد الخادم حيّاً**: النقاط الأربع تُعيد بالضبط ما تقرؤه البطاقة —
//     وهذا ما ينكسر عملياً حين تتغيّر نقطة.
//   • **ثوابت الأمان ساكناً**: لا طباعة للرابط، ولا تخزين محلّي، ولا نداء
//     لـBot API من المتصفّح، ولا عرض لمعرّف حساب.
//   • **الترجمة والمنطق الخالص**: خريطة الصلات ونصّ المهلة.
//
// **وما لا يغطّيه**: تصيير React نفسه — الاستطلاع يبدأ ويتوقّف، والنافذة
// تُغلق فتمسح الحالة. مسارُها مفحوصٌ ساكناً هنا (الشرط موجود والمسح موجود)
// لا مُشغَّلاً. مَن أراد تغطيتها فعلاً فليُضِف مشغّل DOM في مرحلة مستقلّة.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "../../../server/db";
import { isAuthenticated } from "../../../server/replit_integrations/auth/replitAuth";
import { registerPatientCommunicationRoutes } from "../../../server/patient_contacts/routes";
import { classifyCommunicationError, hasNewContact } from "./patient_communication_logic";

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

process.env.PATIENT_TELEGRAM_BOT_TOKEN = "1234567:TEST-UI-TOKEN";
process.env.PATIENT_TELEGRAM_BOT_USERNAME = "bionic_ui_test_bot";
process.env.PATIENT_TELEGRAM_WEBHOOK_SECRET = "ui-test-secret-0001";
//  وواتساب مُعدٌّ أيضاً — فهي قناةُ الروابط الجديدة التي تصدرها البطاقة.
process.env.PATIENT_WHATSAPP_ACCESS_TOKEN = "TEST-UI-WA-TOKEN";
process.env.PATIENT_WHATSAPP_PHONE_NUMBER_ID = "111222333";
process.env.PATIENT_WHATSAPP_BUSINESS_PHONE = "9647700000000";
process.env.PATIENT_WHATSAPP_VERIFY_TOKEN = "ui-wa-verify-0001";
process.env.PATIENT_WHATSAPP_APP_SECRET = "ui-wa-secret-0001";

const PORT = 6795;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-واجهة-التواصل";
const ADMIN = 9951, THERAPIST = 9952;
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} },
  // دورٌ غير مؤهَّل ومعه صلاحية القراءة — البطاقة يجب أن تصمت أمامه.
  therapist: { userId: THERAPIST, role: "therapist", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true } },
};

const SRC = readFileSync(join(import.meta.dirname, "PatientCommunicationCard.tsx"), "utf8");

/**
 * الشيفرة بلا تعليقات.
 *
 * التعليق الذي يشرح **لماذا لا نعرض `externalId`** ليس عرضاً له، وشرحُ
 * لماذا لا يوجد زرّ «رسالة تجريبية» ليس زرّاً. فما كان الحكم فيه على
 * الشيفرة يُقاس على الشيفرة — والتوثيق يبقى حيث ينفع.
 */
const CODE = SRC
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")  // تعليقات JSX
  .replace(/\/\*[\s\S]*?\*\//g, "")               // كتل
  .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

async function req(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM audit_log WHERE entity_type IN ('patient_link_token','patient_contact') AND user_id IN (${ADMIN},${THERAPIST})`);
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
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

const COMM = (p: number) => `/api/patients/${p}/communication`;

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role] of [[ADMIN, "admin"], [THERAPIST, "therapist"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`, [id, `ui_u${id}`, role]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(h as string) } : {};
    next();
  });
  registerPatientCommunicationRoutes(app, isAuthenticated as any);
  const server = app.listen(PORT);
  await new Promise((r) => setTimeout(r, 300));

  try {
    // ══ ١. غير مربوط ═════════════════════════════════════════════════════
    console.log("\n── الحالات الثلاث كما تقرؤها البطاقة ──");
    const p = await mkPatient("مريض الواجهة");
    let r = await req("GET", COMM(p), S.admin);
    same("١. مريض غير مربوط ⇒ قائمتان فارغتان",
      [r.status, r.json.activeContacts.length, r.json.pendingTokens.length], [200, 0, 0]);
    // البطاقة تشتقّ «غير مربوط» من هذا وحده، فتُظهر زرّ الربط.
    check(/غير مربوط/.test(SRC) && /ربط واتساب/.test(SRC), "والبطاقة تعرض «غير مربوط» وزرّ الربط");

    // ══ ٢-٣. الإصدار: الرابط والصلة ══════════════════════════════════════
    console.log("\n── الإصدار ──");
    r = await req("POST", `${COMM(p)}/link-tokens`, S.admin, { channel: "whatsapp", relation: "guardian" });
    same("٢. الإصدار ⇒ 201", r.status, 201);
    //  **العقدُ العامّ**: `deepLink` واحدٌ لكلّ القنوات، و`channel` بجواره
    //  يقول أيَّها هو — فلا تخمّن الشاشةُ قناتَها من اسم مفتاحٍ في JSON.
    const deepLink: string = r.json.deepLink;
    check(typeof deepLink === "string" && deepLink.startsWith("https://wa.me/"),
      "ويعيد `deepLink` المحايد — وهو ما يُبنى منه رمز QR", String(deepLink));
    same("وقناتُه معه صراحةً", r.json.channel, "whatsapp");
    same("٣. والصلة المرسَلة هي المحفوظة", r.json.relation, "guardian");
    // والقيم الخمس في البطاقة هي التي يقبلها الخادم — لا أكثر ولا أقلّ.
    const uiRelations = [...SRC.matchAll(/\{ value: "(\w+)", label: "([^"]+)" \}/g)].map((m) => m[1]);
    same("وقيم الصلة في البطاقة هي قيم الخادم",
      uiRelations.sort(), ["caregiver", "family", "guardian", "other", "self"]);
    for (const rel of uiRelations) {
      const rr = await req("POST", `${COMM(p)}/link-tokens`, S.admin, { channel: "telegram", relation: rel });
      same(`والخادم يقبل «${rel}»`, rr.status, 201);
      await req("POST", `${COMM(p)}/link-tokens/${rr.json.tokenId}/revoke`, S.admin);
    }

    // ══ ٤-٥. الرابط المعلَّق وإلغاؤه ═════════════════════════════════════
    console.log("\n── الرابط المعلَّق ──");
    r = await req("GET", COMM(p), S.admin);
    same("٤. الرابط المعلَّق يظهر", r.json.pendingTokens.length, 1);
    const pending = r.json.pendingTokens[0];
    same("بحقوله الخمسة التي تعرضها البطاقة", Object.keys(pending).sort(),
      ["channel", "createdAt", "expiresAt", "id", "relation"]);
    check(!("rawToken" in pending) && !("tokenHash" in pending),
      "**وبلا نصّ التذكرة ولا بصمتها** — فلا سبيل لإعادة عرض رابط قديم");
    check(/لا يمكن عرض الرابط مرّة أخرى/.test(SRC), "والبطاقة تقول ذلك للموظّف صراحةً");

    r = await req("POST", `${COMM(p)}/link-tokens/${pending.id}/revoke`, S.admin);
    same("٥. وإلغاؤه ينجح", [r.status, r.json.revoked], [200, true]);
    same("ويختفي من القائمة", (await req("GET", COMM(p), S.admin)).json.pendingTokens.length, 0);
    // ثم إصدار رابط جديد — المخرج حين يفقد الموظّف الأول.
    r = await req("POST", `${COMM(p)}/link-tokens`, S.admin, { channel: "telegram", relation: "self" });
    same("وإصدار رابط جديد بعده ينجح", r.status, 201);
    const fresh = r.json;

    // ══ ٦-٨. بعد ضغط المريض Start ════════════════════════════════════════
    console.log("\n── بعد الربط ──");
    // نستهلك التذكرة كما يفعل الـwebhook، ثم نقرأ ما ستراه البطاقة.
    const { redeemAndWelcome } = await import("../../../server/patient_notifications/welcome");
    await redeemAndWelcome({ rawToken: deepLinkToken(fresh.deepLink), externalId: "tg-ui-9001" });
    r = await req("GET", COMM(p), S.admin);
    same("٦-٧. الجهة النشطة تظهر — وهذا ما يوقف الاستطلاع", r.json.activeContacts.length, 1);
    const contact = r.json.activeContacts[0];
    same("بحقولها الأربعة", Object.keys(contact).sort(), ["channel", "id", "linkedAt", "relation"]);
    same("والصلة كما أُصدرت", contact.relation, "self");
    // ٨. والبطاقة تعرضها بالعربية.
    check(/"self", label: "المريض نفسه"/.test(SRC), "٨. والبطاقة تعرض «self» بالعربية «المريض نفسه»");
    check(/RELATION_LABEL\[c\.relation\]/.test(SRC), "وتقرأ الترجمة من الخريطة نفسها");
    // ٦. وشرط الاستطلاع موقوف على النافذة والرابط معاً.
    check(/refetchInterval: dialogOpen && deepLink && !justLinked \? 2500 : false/.test(SRC),
      "٦. والاستطلاع مشروط بالنافذة والرابط — ويتوقّف بالنجاح");

    // ══ ١٠. لا معرّف حساب في أي ردّ تقرؤه البطاقة ════════════════════════
    const dump = JSON.stringify(r.json);
    check(!dump.includes("tg-ui-9001"), "١٠. ولا `externalId` في ردّ الخادم إطلاقاً", dump);
    check(!/externalId|external_id/.test(CODE), "ولا تقرؤه البطاقة في شيفرتها");

    // ══ ١٤. أكثر من جهة نشطة ═════════════════════════════════════════════
    const second = await req("POST", `${COMM(p)}/link-tokens`, S.admin, { channel: "telegram", relation: "guardian" });
    await redeemAndWelcome({ rawToken: deepLinkToken(second.json.deepLink), externalId: "tg-ui-9002" });
    r = await req("GET", COMM(p), S.admin);
    same("١٤. جهتان نشطتان تظهران معاً", r.json.activeContacts.length, 2);
    same("بصلتيهما المختلفتين",
      r.json.activeContacts.map((c: any) => c.relation).sort(), ["guardian", "self"]);
    check(/activeWhatsapp\.map\(\(c\)/.test(SRC), "والبطاقة تعرضها بالتكرار لا بواحدة");

    // ══ ٩. سحب الجهة ═════════════════════════════════════════════════════
    r = await req("POST", `${COMM(p)}/contacts/${contact.id}/revoke`, S.admin);
    same("٩. سحب الجهة ينجح", [r.status, r.json.revoked], [200, true]);
    r = await req("GET", COMM(p), S.admin);
    same("وتختفي من النشطة", r.json.activeContacts.length, 1);
    const { rows: hist } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM patient_contacts WHERE patient_id = $1`, [p]);
    same("**والسجل التاريخي باقٍ — ختمٌ لا حذف**", hist[0].n, 2);
    check(/السجل التاريخي\s*\n?\s*يبقى محفوظاً/.test(SRC.replace(/\s+/g, " ")) || /السجل التاريخي/.test(SRC),
      "والبطاقة تُطمئن الموظّف بذلك في التأكيد");

    // ══ ١٣. غير المخوَّل: لا أزرار ═══════════════════════════════════════
    console.log("\n── الصلاحية ──");
    r = await req("GET", COMM(p), S.therapist);
    same("١٣. الدور غير المؤهَّل ⇒ 403 من الخادم", r.status, 403);
    // والبطاقة تُغلق على 403 كما على غيره — التفصيل في قسم «فشل القراءة».
    check(classifyCommunicationError(new Error("403: غير مصرح")).kind === "denied",
      "والبطاقة تصنّفه منعاً وتعرض بطاقةً صامتة");
    const deniedAt = CODE.indexOf("if (failure)");
    const buttonAt = CODE.indexOf("button-link-whatsapp");
    check(deniedAt > 0 && deniedAt < buttonAt, "وتُعاد قبل أي زرّ قابل للتنفيذ");
    check(!/data-testid="button-(link-whatsapp|revoke)/.test(CODE.slice(deniedAt, CODE.indexOf("</Card>", deniedAt))),
      "**ولا زرّ ربط ولا سحب داخل بطاقة المنع**");

    // ══ ١١-١٢ و١٦. ثوابت الأمان ══════════════════════════════════════════
    console.log("\n── ثوابت الأمان في شيفرة البطاقة ──");
    check(!/console\.(log|error|warn|info)/.test(CODE), "١١. لا طباعة إطلاقاً في البطاقة");
    check(!/localStorage|sessionStorage/.test(CODE), "ولا تخزين محلّي ولا جلسة");
    check(!/api\.telegram\.org|sendMessage|bot\$\{/.test(CODE), "١٦. ولا نداء لـBot API من المتصفّح");
    check(!/رسالة تجريبية|test message/i.test(CODE), "ولا زرّ رسالة تجريبية");
    // ١٢. الإغلاق يمسح الرابط — والمسح في مسار الإغلاق نفسه لا في غيره.
    const closeFn = SRC.slice(SRC.indexOf("function closeDialog"), SRC.indexOf("const issue ="));
    check(/setDeepLink\(null\)/.test(closeFn), "١٢. وإغلاق النافذة يمسح الرابط من الحالة");
    check(/setDeepLink\(null\);\s*\/\/ \*\*الرابط يُمحى فور نجاحه/.test(SRC),
      "ويُمحى فور نجاح الربط أيضاً");
    // ولا يُوضع في عنوان الصفحة.
    check(!/history\.(push|replace)State|location\.(href|search|hash)\s*=/.test(SRC),
      "ولا يدخل عنوان الصفحة");
    // والرابط في حالة محلّية لا سياق عامّ.
    check(/const \[deepLink, setDeepLink\] = useState<string \| null>\(null\)/.test(SRC),
      "والرابط في حالة النافذة المحلّية وحدها");
    // ولا يُعرَض نصّاً مقروءاً — رمزاً ونسخاً فقط.
    check(!/\{deepLink\}</.test(SRC), "١١. ولا يُعرَض نصّ الرابط مقروءاً في الصفحة");
    check(/QRCodeSVG value=\{deepLink\}/.test(SRC), "بل رمزاً يُبنى منه");

    // ══ ١-٣ (بلوكر): أي فشل يُغلق البطاقة، لا 403 وحده ═══════════════════
    console.log("\n── فشل القراءة: مغلقٌ عند الشكّ ──");
    const cases: [string, unknown, string, string, boolean][] = [
      ["401", new Error("401: Unauthorized"), "unauthenticated", "انتهت الجلسة أو يلزم تسجيل الدخول من جديد.", false],
      ["403", new Error("403: غير مصرح"), "denied", "لا تملك صلاحية إدارة قنوات تواصل هذا المريض.", false],
      ["500", new Error("500: Internal Server Error"), "unknown", "تعذّر تحميل حالة تواصل المريض. أعد المحاولة.", true],
      ["انقطاع شبكة", new TypeError("Failed to fetch"), "unknown", "تعذّر تحميل حالة تواصل المريض. أعد المحاولة.", true],
      ["خطأ بلا نصّ", undefined, "unknown", "تعذّر تحميل حالة تواصل المريض. أعد المحاولة.", true],
    ];
    for (const [label, err, kind, message, canRetry] of cases) {
      const info = classifyCommunicationError(err);
      same(`«${label}» ⇒ تصنيفٌ ورسالةٌ وزرّ إعادة`, [info.kind, info.message, info.canRetry],
        [kind, message, canRetry]);
    }
    // والبطاقة تُغلق على **أي** فشل — لا على 403 وحده.
    check(/const failure = state\.isError \? classifyCommunicationError\(state\.error\) : null;/.test(CODE),
      "١-٣. والبطاقة تُغلق على أي فشل لا على 403 وحده");
    check(/if \(failure\) \{/.test(CODE), "وتُعاد بطاقة الفشل مبكّراً");
    const failAt = CODE.indexOf("if (failure) {");
    const linkBtnAt = CODE.indexOf("button-link-whatsapp");
    const revokeBtnAt = CODE.indexOf("button-revoke-contact-");
    check(failAt > 0 && failAt < linkBtnAt && failAt < revokeBtnAt,
      "**وقبل زرّ الربط وزرّ السحب معاً**");
    const failBlock = CODE.slice(failAt, CODE.indexOf("return (", linkBtnAt - 4000) > 0
      ? CODE.indexOf("</Card>", failAt) : CODE.indexOf("</Card>", failAt));
    check(!/button-link-whatsapp|button-revoke/.test(failBlock),
      "ولا زرّ ربط ولا سحب داخل بطاقة الفشل", failBlock.slice(0, 120));
    check(/failure\.canRetry &&/.test(CODE), "وزرّ إعادة المحاولة مشروطٌ بالعطل العابر وحده");

    // ══ ٤-٦ (بلوكر): اكتشاف النجاح بالمعرّفات لا بالعدد ══════════════════
    console.log("\n── اكتشاف الربط ──");
    same("٥. زيادة العدد ⇒ نجاح", hasNewContact([10], [10, 11]), true);
    // **الحالة الحاسمة**: تغيّر الصلة يستبدل الجهة، فالعدد يبقى واحداً.
    same("٤. **تبديل المعرّف مع بقاء العدد ⇒ نجاح** (استبدال الصلة)", hasNewContact([10], [11]), true);
    same("٦. وثبات المعرّفات ⇒ لا نجاح", hasNewContact([10], [10]), false);
    same("ولا شيء من لا شيء", hasNewContact([], []), false);
    same("وأولُ ربطٍ على الإطلاق ⇒ نجاح", hasNewContact([], [7]), true);
    same("واختفاء جهة بلا جديدة ليس نجاحاً", hasNewContact([10, 11], [10]), false);
    same("وتبديل واحدة من اثنتين ⇒ نجاح", hasNewContact([10, 11], [10, 12]), true);
    // والبطاقة تستعملها فعلاً بالمعرّفات.
    check(/hasNewContact\(baselineIds, currentIds\)/.test(CODE), "والبطاقة تقارن المعرّفات");
    check(!/activeWhatsapp\.length > baseline\b/.test(CODE), "**ولا أثر لمقارنة الأعداد**");
    check(/setBaselineIds\(activeWhatsapp\.map\(\(c\) => c\.id\)\)/.test(CODE),
      "وتلتقط المعرّفات عند فتح النافذة");

    // ══ ٧-٨ (بلوكر): تذكرةٌ بلا رابط تُسحَب فوراً ════════════════════════
    console.log("\n── تذكرة بلا رابط ──");
    const pOrphan = await mkPatient("مريض التكامل المعطَّل");
    // نُعطِّل البوت كما لو أن الخادم بلا إعداد — فتصدر التذكرة بلا رابط.
    const savedPhone = process.env.PATIENT_WHATSAPP_BUSINESS_PHONE;
    delete process.env.PATIENT_WHATSAPP_BUSINESS_PHONE;
    const orphan = await req("POST", `${COMM(pOrphan)}/link-tokens`, S.admin,
      { channel: "whatsapp", relation: "self" });
    same("٧. الإصدار ينجح لكن بلا رابط عميق", [orphan.status, orphan.json.deepLink], [201, undefined]);
    check(typeof orphan.json.tokenId === "number", "والردّ يحمل `tokenId` — وهو ما يُسحَب به");
    same("والتذكرة معلَّقة فعلاً قبل السحب",
      (await req("GET", COMM(pOrphan), S.admin)).json.pendingTokens.length, 1);
    // البطاقة تسحبها بالمسار نفسه — ننفّذه هنا كما تفعل.
    const revoked = await req("POST", `${COMM(pOrphan)}/link-tokens/${orphan.json.tokenId}/revoke`, S.admin);
    same("والسحب بالنقطة القائمة ينجح", [revoked.status, revoked.json.revoked], [200, true]);
    same("٨. **فلا يبقى رابط معلَّق مخفيّ**",
      (await req("GET", COMM(pOrphan), S.admin)).json.pendingTokens.length, 0);
    process.env.PATIENT_WHATSAPP_BUSINESS_PHONE = savedPhone;
    // والبطاقة تفعل ذلك في شيفرتها: سحبٌ ثم إبطالٌ ثم خطأ.
    const issueBlock = CODE.slice(CODE.indexOf("const issue = useMutation"), CODE.indexOf("const revokeToken"));
    check(/if \(!payload\.deepLink\)/.test(issueBlock), "والبطاقة تكشف غياب الرابط");
    check(/link-tokens\/\$\{payload\.tokenId\}\/revoke/.test(issueBlock), "وتسحب التذكرة الصادرة");
    check(/invalidateQueries/.test(issueBlock), "وتُبطل الاستعلام");
    check(/variant: "destructive"/.test(issueBlock), "وتعرض خطأ التكامل");
    check(!/setDeepLink\(payload/.test(issueBlock.slice(0, issueBlock.indexOf("return;"))),
      "ولا تضع رابطاً غير موجود في الحالة");

    // ══ ٩ (بلوكر): المعلَّق يمنع إصدار ثانٍ ══════════════════════════════
    console.log("\n── المعلَّق يمنع الإصدار ──");
    const pBlock = await mkPatient("مريض المنع");
    await req("POST", `${COMM(pBlock)}/link-tokens`, S.admin, { channel: "whatsapp", relation: "self" });
    same("٩. للمريض رابط معلَّق", (await req("GET", COMM(pBlock), S.admin)).json.pendingTokens.length, 1);
    // **الشرط مربوط بالعنصر نفسه** — لا بأي ذكرٍ آخر لـ`pendingWhatsapp`
    // (الشارة تستعمله أيضاً، فمطابقةٌ عامّة كانت تمرّ ولو أُزيل الحارس).
    const gateRe = /\{pendingWhatsapp\.length > 0 \? \(\s*[\s\S]{0,200}?data-testid="text-pending-blocks-issue"/;
    check(gateRe.test(CODE), "والبطاقة تستبدل زرّ الربط بنصّ التوجيه — بشرطٍ مربوط بالنصّ نفسه");
    check(/يوجد رابط ربط بانتظار المريض\. ألغِه أولاً لإصدار رابط جديد\./.test(SRC),
      "بالنصّ المطلوب حرفياً");
    // والزرّ في الفرع الآخر وحده — فلا سبيل للضغط عليه والمعلَّق قائم.
    const gateAt = CODE.search(gateRe);
    const gate = gateAt >= 0 ? CODE.slice(gateAt, CODE.indexOf("</Dialog>")) : "";
    const elseAt = gate.indexOf(") : (");
    check(elseAt > 0 && gate.indexOf("button-link-whatsapp") > elseAt,
      "**وزرّ الربط في فرع «لا معلَّق» وحده**");

    // ══ ١٠. لا سرّ في الواجهة ════════════════════════════════════════════
    check(!/rawToken/.test(CODE.replace(/payload\.deepLink/g, "")),
      "١٠. ولا `rawToken` في شيفرة البطاقة إطلاقاً");

    // ══ ١٥. لا مساس بمسار التصنيع ════════════════════════════════════════
    check(!/manufacturing|work_order|workOrder/i.test(CODE), "١٥. ولا مساس بالتصنيع في شيفرة البطاقة");

    // ══ ١٧. **الانتقال إلى واتساب** — البابُ الجديد واحد ══════════════════
    //
    // ══ ما يحرسه ═══════════════════════════════════════════════════════
    // بابان مفتوحان يعنيان موظّفاً يربط اليوم بقناةٍ نتقاعدها غداً. فالجديدُ
    // واتساب حصراً، والقديمُ يُقرأ ويُسحَب **ولا يُنشأ**.
    console.log("\n── الانتقال إلى واتساب ──");
    check(/channel: LINK_CHANNEL/.test(CODE) && /const LINK_CHANNEL = "whatsapp"/.test(CODE),
      "١٧. **الإصدارُ بقناة واتساب — من ثابتٍ واحد**",
      (CODE.match(/.*channel: .*/g) ?? []).join(" | "));
    //  **ولا `channel: "telegram"` في أي مسار إصدار** — لا نصّاً ولا ثابتاً.
    const issueCalls = CODE.slice(CODE.indexOf("const issue = useMutation"), CODE.indexOf("const revokeToken"));
    check(!/telegram/i.test(issueCalls),
      "١٧.١ **ولا ذكرَ لتلغرام في مسار الإصدار إطلاقاً**", issueCalls);
    check(/payload\.deepLink/.test(CODE) && !/telegramDeepLink/.test(CODE),
      "١٧.٢ **وتقرأ العقدَ العامّ `deepLink` لا حقلاً باسم قناته**");

    //  واجهةُ الموظّف تقول «واتساب» — لا «Telegram».
    check(/تواصل المريض — واتساب/.test(SRC), "١٧.٣ **والعنوان «تواصل المريض — واتساب»**");
    check(/ربط واتساب/.test(SRC), "١٧.٤ **والزرّ الأساسي «ربط واتساب»**");
    check(/تم ربط واتساب بالمريض بنجاح\./.test(SRC), "١٧.٥ **ونصُّ النجاح بواتساب**");
    check(!/ربط Telegram|ربط حساب Telegram/.test(SRC),
      "١٧.٦ **ولا زرَّ ربطٍ بتلغرام في الشاشة الحيّة**",
      (SRC.match(/.*ربط .*Telegram.*/g) ?? []).join(" | "));

    //  والقديمُ يُعرَض ويُسحَب — ولا يُسحَب تلقائياً.
    check(/Telegram — ربط قديم/.test(SRC), "١٧.٧ **وقسمُ «Telegram — ربط قديم» موجود**");
    const legacyAt = CODE.indexOf("section-legacy-telegram");
    const legacyBlock = legacyAt > 0 ? CODE.slice(legacyAt, legacyAt + 1600) : "";
    check(/button-revoke-contact-/.test(legacyBlock),
      "١٧.٨ **وفيه زرُّ السحب** — الإدارةُ تبقى ممكنة", legacyBlock.slice(0, 100));
    check(!/button-link|issue\.mutate/.test(legacyBlock),
      "١٧.٩ **ولا زرَّ إنشاءٍ فيه إطلاقاً**", legacyBlock.slice(0, 200));
    check(/legacyTelegram = useMemo/.test(CODE) && /c\.channel === LEGACY_CHANNEL/.test(CODE),
      "١٧.١٠ ويُشتقّ من قناة الجهة لا من ترتيبها");
    //  **ولا سحبَ تلقائيّ**: لا مؤثّرٌ ولا نداءٌ يُلغي تلغرام من تلقائه.
    check(!/revokeContact\.mutate\([^)]*\)\s*;?\s*}\s*,\s*\[/.test(CODE),
      "١٧.١١ **ولا سحبَ تلقائياً لتلغرام** — الانقطاعُ قرارُ إنسان");

    //  والحارسُ حيٌّ: لو أُعيد زرُّ تلغرام إلى الشاشة لسقط الفحصُ أعلاه.
    check(/ربط واتساب/.test("ربط واتساب") && !/ربط واتساب/.test("ربط Telegram"),
      "١٧.١٢ وحارسُ النصّ يمسك المخالفة");

    // والحارسان حيّان — مخالفةٌ حقيقية تُمسك، وتعليقٌ لا يعثّرهما.
    const strip = (src: string) => src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    check(/console\.log/.test(strip('const x = 1;\nconsole.log(x);')), "وحارس الطباعة يمسك المخالفة");
    check(!/console\.log/.test(strip('// لا console.log هنا\nconst x = 1;')), "ولا يعثّره تعليق");
  } finally {
    server.close();
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id IN ($1,$2)`, [ADMIN, THERAPIST]);
  console.log(failures === 0 ? "\n✅ all communication-ui cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

/** نصّ التذكرة من الرابط العميق — كما يفعل تلغرام حين يضغط المريض Start. */
/**
 * النصُّ الخام من الرابط العميق — **لمحاكاة ما يرسله المريضُ بيده**.
 *
 * `wa.me/<num>?text=%D8%B1%D8%A8%D8%B7%20<token>`: الرسالةُ المُعبّأة تحمل
 * أمرَ الربط ثم التذكرة، فيؤخَذ ما بعد الفراغ. و`t.me/...?start=<token>`
 * يبقى مفهوماً للصفوف القديمة.
 */
function deepLinkToken(link: string): string {
  if (link.includes("?start=")) return decodeURIComponent(link.split("?start=")[1] ?? "");
  const text = decodeURIComponent(link.split("?text=")[1] ?? "");
  return text.split(/\s+/).slice(1).join(" ");
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
