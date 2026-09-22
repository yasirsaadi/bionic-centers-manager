// اختبارُ منعِ تكرار تسجيل المريض — بالاسم بادئةً، وبالهاتف مطابقةً تامّة —
// حيّاً على Postgres وعلى النقاط الحقيقية. قاعدة محلّية:
// `npm run test:patient-duplicate-guard`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// ١) **الاسمُ عند التسجيل فقط** — بادئةٌ لا تشابهٌ ولا مطابقةٌ جزئية: اسمُ
//    مريضٍ فعّالٍ **قائم** يبدأ بالنصّ المُدخَل (بعد التطبيع الكنسيّ)
//    يمنع التسجيل. الاتجاهُ واحدٌ لا اثنان — اسمٌ أطول يمدِّد اسماً موجوداً
//    هو تسجيلٌ جديد. عالميٌّ عبر كلّ الفروع، بلا كشفِ أيّ بياناتٍ عن
//    المطابقة (`{available}` فقط).
// ٢) **الهاتفُ عند التسجيل والتعديل معاً** — رقمٌ مطبَّعٌ واحد لمريضٍ
//    فعّالٍ واحد نظام‑ياً، عالميّاً، بلا استثناء. صيغٌ كتابيةٌ مختلفة
//    تُطبَّع لنفس الرقم تتعارض.
// ٣) **الأمانُ من التزامن بلا قيدٍ في القاعدة** — قفلٌ استشاريّ يمنع نجاحَ
//    محاولتين متزامنتين بنفس الاسم أو نفس الهاتف معاً — **وقفلُ الاسم عامٌّ
//    ثابت** (تصحيحٌ لاحق) فيحمي قاعدةَ **البادئة** نفسَها بين اسمين مختلفين
//    متزامنين لا التطابقَ التامّ فقط. **وهو قفلُ هويّةٍ مشترك** (تصحيحٌ
//    لاحقٌ ثالث) تشارك فيه **الاستعادةُ** أيضاً — وهي تُصيّر الهويّةَ
//    **فعّالة**، فتسجيلٌ بلا تسلسلٍ معها كان يُدرِج على قراءةٍ سبقت التزامَها
//    فينكسر شرطُ الفعّالين نفسُه؛ وفحصُ الهاتف عند التعديل ما زال فحصَين
//    اثنين فلا تلتزم الاستعادةُ بينهما.
// ٤) **والمحذوفُ خارجَ منعِ التكرار تماماً** (قرارُ مالكٍ صريح،
//    ٢٠٢٦-٠٩-١٨ — **يُلغي ويستبدل «السلّةُ تحجز الهويّة عند التسجيل»**):
//    مريضٌ محذوفٌ لا يُقرأ في فحص التسجيل إطلاقاً — اسمُه لا يمنع، ورقمُه
//    لا يمنع، **وملفٌّ جديدٌ مطابقٌ له في كلّ بياناته يُسجَّل بصورةٍ
//    طبيعية**. ولا تأكيدَ إداريّ ولا تجاوزَ ولا نافذةَ ثانية. وفحصُ توفّر
//    الاسم في الشاشة يتبع القاعدةَ نفسَها فلا يصير المحذوفُ حدّاً أحمر.
//    والحذفُ والاستعادةُ أنفسُهما لم يُمَسّا بحرف.
//    **والهاتفُ عند التعديل وحده يبقى يحجز** (تصحيحُ ٢٠٢٦-٠٩-٠٨، لم
//    يُمَسّ): مريضٌ فعّالٌ قائم لا ينتقل إلى رقم مريضٍ محذوف — منعُ
//    *انتقالٍ* لا منعُ *تسجيل*؛ والاسمُ عند التعديل خارج القاعدة كما كان.
// ٥) **`lookup-by-name` — المطابقاتُ الفعّالة وحدها** (قرارُ ٢٠٢٦-٠٩-١٨):
//    كشفُ النظير عبر الفروع كما كان بحرفه، **والمحذوفُ لا يُقرأ فيها
//    ولا يولّد تنبيهاً** — فلا `inTrash` ولا عدّادَ ولا رسالة.

import { pool, db } from "./db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { normalizePhone } from "@shared/phone";
import {
  assertNameAvailableForRegistration, PatientNameConflictError, NAME_PREFIX_CONFLICT_MESSAGE,
  nameAlreadyRegisteredMessage,
  acquirePatientIdentityLock, assertPhoneAvailable,
  PatientPhoneTrashConflictError,
} from "./patients/duplicate_guard";
import { IN_TRASH_ESCALATION } from "@shared/patient_trash";

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

const PORT = 6970;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-منع-تكرار-التسجيل";
//  ══ نطاقٌ ٨٨٠١-٨٨٠٤ عمداً لا ٩٩٠٠+ ═══════════════════════════════════
//  `٩٩xx` مكتظّةٌ بمعرّفات ملفّات اختبارٍ أخرى تتشارك القاعدة نفسَها
//  (`patient_trash.test.ts` ٩٩٥١-٩٩٦٠، `patient_trash_badge.test.ts`
//  ٩٩٥١-٩٩٥٣، `patient_search_surfaces.test.ts` ٩٩٥١-٩٩٥٥ من بين غيرها) —
//  وبعضُها (`patient_trash_badge.test.ts` تحديداً) لا يُدرج كلَّ فاعليه في
//  `system_users` بنفسه، فيعتمد ضمنياً على صفوفٍ تتركها ملفّاتُ اختبارٍ
//  أخرى بنفس المعرّف. معرّفٌ مشترَك هنا كان يجعل الوسيطَ الحيّ
//  (`routes.ts` ~٣٥٣) يُصادف صفّاً بحالةٍ لم يقصدها ملفّي، فيتحطّم
//  `req.session.destroy` على الجلسة الوهمية — عطبُ عزلِ اختبارٍ لا عطبٌ في
//  الشيفرة قيد الاختبار. فنطاقٌ فارغٌ تماماً بالكامل (مُتحقَّقٌ) يمنعه جذرياً.
const ADMIN = 8801, RECV = 8802, RECV2 = 8803, NOPERM = 8804;

//  ══ **اسمُ الفرع ١ يُقرأ من القاعدة، لا يُفترَض** ═══════════════════════
//  الفِكستشرُ يُدرج «بغداد» بـ`ON CONFLICT DO NOTHING`، فقاعدةٌ يوجد فيها
//  الفرعُ ١ سلفاً باسمٍ آخر (قالبٌ مبنيٌّ من بياناتٍ حقيقية مثلاً) تُبقي
//  اسمَها — وكانت التأكيداتُ تقارن بـ«بغداد» حرفياً فتفشل جميعاً بسبب
//  **بيئةٍ لا بسبب شيفرة**. فيُقرأ الاسمُ الفعليُّ بعد الإدراج ويُبنى منه
//  المتوقَّعُ: يقيس الاختبارُ **صياغةَ الرسالة** لا اسمَ فرعٍ في قاعدةٍ
//  بعينها.
let B1 = "بغداد";

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  //  فرعٌ آخر حصراً — لإثبات أنّ منعَ الاسم عالميٌّ لا يخصّ فرع السائل.
  recv2: {
    userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استقبالُ الفرع الآخر",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  //  بلا `canAddPatients` — لفحص الصلاحية على النقطة الجديدة. **ملاحظة**:
  //  هذا الحقلُ هنا للتوثيق فقط — الوسيطُ الحيّ في `routes.ts` (سطر ~٣٥٣)
  //  يعيد قراءة الصلاحيات الفعلية من صفّ `system_users` نفسِه على كل طلب
  //  ويستبدل هذا الكائن بها، فالمنعُ الحقيقيُّ من عمود `can_add_patients`
  //  المضبوط `false` صراحةً في `main()` أدناه — لا من هنا.
  noPerm: {
    userId: NOPERM, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "بلا صلاحية",
    permissions: { canViewPatients: true },
  },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
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

function defaultPayload(overrides: Record<string, any> = {}) {
  return {
    name: `${MARK}-افتراضي`,
    phone: "07700000000",
    referralSource: MARK,
    age: "30", height: "170", weight: "70",
    medicalCondition: "physiotherapy",
    isAmputee: false, isPhysiotherapy: true, isMedicalSupport: false,
    branchId: 1,
    whatsappNotificationsEnabled: false,
    hadPriorCenterHistory: false,
    ...overrides,
  };
}
const registerPatient = (session: any, overrides: Record<string, any> = {}) =>
  http("POST", "/api/patients", session, defaultPayload(overrides));

const nameAvailability = (session: any, name: string) =>
  http("GET", `/api/patients/name-availability?name=${encodeURIComponent(name)}`, session);

/** إدخالُ مريضٍ فعّالٍ مباشرةً بالـSQL — لتجهيز «موجودٍ سلفاً» بسرعة. */
async function mkActivePatient(name: string, phone: string, branchId = 1): Promise<{ id: number; phoneE164: string | null }> {
  const n = normalizePhone(phone, "IQ");
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_country, phone_status,
       referral_source, age, height, weight, medical_condition,
       is_amputee, is_physiotherapy, is_medical_support, branch_id,
       total_cost, patient_classification, whatsapp_notifications_enabled)
     VALUES ($1,$2,$3,$4,$5,$6,'30','170','70','physiotherapy',
             false,true,false,$7, 0,'new', false)
     RETURNING id`,
    [name, n.raw, n.e164, n.country, n.status, MARK, branchId]);
  return { id: r[0].id, phoneE164: n.e164 };
}

async function patientRow(id: number) {
  const [r] = await q(
    `SELECT id, name, phone, phone_e164 pe, deleted_at da FROM patients WHERE id=$1`, [id]);
  return r ?? null;
}
async function countByExactName(name: string): Promise<number> {
  const [r] = await q<{ n: number }>(
    `SELECT COUNT(*)::int n FROM patients WHERE referral_source=$1 AND name=$2`, [MARK, name]);
  return r.n;
}
async function countByPhoneE164(e164: string | null): Promise<number> {
  const [r] = await q<{ n: number }>(
    `SELECT COUNT(*)::int n FROM patients WHERE referral_source=$1 AND phone_e164=$2`, [MARK, e164]);
  return r.n;
}

//  ونظيراهما **للفعّالين وحدهم** — الأصلان أعلاه يعدّان الصفوفَ كلَّها
//  (محذوفةً وفعّالة)، وهو ما يلزم لإثبات «المحذوفُ باقٍ ولم يُستعَد ضمناً».
//  وهذان يلزمان لإثبات «وفعّالٌ واحدٌ فقط» بعده — والفرقُ بينهما هو بالضبط
//  ما يفرّق «سُجّل ملفٌّ ثانٍ» عن «استُعيد الأوّل».
async function countActiveByExactName(name: string): Promise<number> {
  const [r] = await q<{ n: number }>(
    `SELECT COUNT(*)::int n FROM patients
      WHERE referral_source=$1 AND name=$2 AND deleted_at IS NULL`, [MARK, name]);
  return r.n;
}
async function countActiveByPhoneE164(e164: string | null): Promise<number> {
  const [r] = await q<{ n: number }>(
    `SELECT COUNT(*)::int n FROM patients
      WHERE referral_source=$1 AND phone_e164=$2 AND deleted_at IS NULL`, [MARK, e164]);
  return r.n;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[ADMIN, RECV, RECV2, NOPERM]]);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  //  **الاسمُ الفعليُّ للفرع ١** — راجع تعليقَ `B1` أعلاه.
  B1 = (await q<{ name: string }>(`SELECT name FROM branches WHERE id = 1`))[0]?.name ?? "بغداد";
  for (const [id, role, branchId, branchIds, name, canAddPatients] of [
    [ADMIN, "admin", 1, "[1,2]", "المسؤول", true],
    [RECV, "reception", 1, "[1]", "ريام", true],
    [RECV2, "reception", 2, "[2]", "استقبالُ الفرع الآخر", true],
    //  **`can_add_patients` صراحةً `false`** — الوسيطُ الحيّ في
    //  `routes.ts` يعيد قراءة هذا العمود على كل طلب ويستبدل به `permissions`
    //  المرسَلة في ترويسة الجلسة الوهمية، والعمودُ افتراضُه `true` في
    //  القاعدة، فلا يجوز تركُه على الافتراض هنا وإلا مرّ الطلبُ خطأً.
    [NOPERM, "reception", 1, "[1]", "بلا صلاحية", false],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,can_add_patients)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,$7)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name, is_active=true,
               can_add_patients=EXCLUDED.can_add_patients`,
      [id, `pdg_u${id}`, role, name, branchId, branchIds, canAddPatients]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  let skipped = 0;
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ══════════════════════════════════════════════════════════════════
    //  أ. بادئةُ الاسم — الحدُّ الحيّ ثمّ الإنفاذ الفعليّ على POST
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. بادئةُ الاسم ──");
    {
      await mkActivePatient("أحمد حسين فايق", "07711000001");

      const short1 = await nameAvailability(S.recv, "أحمد");
      same("١. **«أحمد» — بادئةٌ لاسمٍ قائم ⟶ محجوب**", short1.body, { available: false, reason: "active_conflict", message: NAME_PREFIX_CONFLICT_MESSAGE });

      const short2 = await nameAvailability(S.recv, "أحمد حسين");
      same("٢. **«أحمد حسين» — بادئةٌ أطول لكنّها لا تزال بادئة ⟶ محجوب**",
        short2.body, { available: false, reason: "active_conflict", message: NAME_PREFIX_CONFLICT_MESSAGE });

      const exact = await nameAvailability(S.recv, "أحمد حسين فايق");
      same("٣. **مطابقةٌ تامّة ⟶ محجوبٌ أيضاً، وبرسالةِ «مسجَّل مسبقاً» لا برسالة البادئة**",
        exact.body, { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });

      const longer = await nameAvailability(S.recv, "أحمد حسين فايق صالح");
      same("٤. **اسمٌ أطول يمدِّد الاسمَ القائم ⟶ متاح (الاتجاهُ واحدٌ لا اثنان)**",
        longer.body, { available: true });

      const bypassShort = await registerPatient(S.recv, { name: "أحمد" });
      same("٥. **`POST` مباشرةً ببادئةٍ محجوبة ⟶ ٤٠٩ ولا يُنشأ شيء**",
        [bypassShort.status, bypassShort.body?.code], [409, "patient_name_conflict"]);
      same("   والعدّادُ لم يتغيّر — لا صفَّ أُدرج", await countByExactName("أحمد"), 0);

      const okLonger = await registerPatient(S.recv, { name: "أحمد حسين فايق صالح", phone: "07711000002" });
      same("٦. **والاسمُ الأطول يُسجَّل فعلياً بلا عائق**",
        [okLonger.status, typeof okLonger.body?.id], [201, "number"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب. النطاقُ عالميٌّ — عبر الفروع، بصرف النظر عن فرع السائل
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. عالميّةُ المنع عبر الفروع ──");
    {
      await mkActivePatient("زينب علي كريم", "07711000010", 2); // في الفرع ٢

      const fromBranch1 = await nameAvailability(S.recv, "زينب");
      same("٧. **استقبالُ الفرع ١ يُحجَب عن اسمٍ في الفرع ٢ — النطاقُ عالميّ**",
        fromBranch1.body, { available: false, reason: "active_conflict", message: NAME_PREFIX_CONFLICT_MESSAGE });

      const fromBranch2 = await nameAvailability(S.recv2, "زينب");
      same("٨. **وكذلك استقبالُ الفرع نفسِه (٢)**", fromBranch2.body, { available: false, reason: "active_conflict", message: NAME_PREFIX_CONFLICT_MESSAGE });

      const post1 = await registerPatient(S.recv, { name: "زينب", phone: "07711000011", branchId: 1 });
      same("٩. **والحجبُ حقيقيٌّ على `POST` من فرعٍ مغاير للمطابَقة**",
        [post1.status, post1.body?.code], [409, "patient_name_conflict"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج. التطبيعُ الكنسيّ — همزاتٌ وتاءٌ مربوطة وتشكيلٌ ومسافاتٌ مكرَّرة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. التطبيعُ الكنسيّ ──");
    {
      await mkActivePatient("إسراء", "07711000020"); // همزة تحت الألف
      const bareAlif = await nameAvailability(S.recv, "اسراء"); // ألفٌ عارية
      same("١٠. **«إسراء» المخزَّنة تُطابِق «اسراء» المكتوبة (توحيدُ الهمزات)**",
        bareAlif.body, { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });

      await mkActivePatient("فاطمة", "07711000021"); // تاء مربوطة
      const withHeh = await nameAvailability(S.recv, "فاطمه"); // هاء
      same("١١. **«فاطمة» تُطابِق «فاطمه» (ة⟵ه)**", withHeh.body, { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });

      await mkActivePatient("مُحَمَّد", "07711000022"); // بتشكيل كامل
      const bareLetters = await nameAvailability(S.recv, "محمد");
      same("١٢. **التشكيلُ لا يُخفي المطابقة**", bareLetters.body, { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });

      await mkActivePatient("نور  الهدى", "07711000023"); // مسافةٌ مضاعفة
      const singleSpace = await nameAvailability(S.recv, "نور الهدى");
      same("١٣. **المسافاتُ المكرَّرة تُطوى فلا تُخفي المطابقة**",
        singleSpace.body, { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. لا كشفَ لأيّ بياناتٍ عن المطابقة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. لا كشفَ لبيانات ──");
    {
      const blocked = await nameAvailability(S.recv, "أحمد");
      same("١٤. **جسمُ الردّ المحجوب ثلاثةُ مفاتيح لا أكثر: `available`/`reason`/`message` — بلا اسمٍ ولا فرعٍ ولا رقمٍ ولا عددٍ عن المطابقة**",
        Object.keys(blocked.body ?? {}).sort(), ["available", "message", "reason"]);

      const allowed = await nameAvailability(S.recv, "اسمٌ فريدٌ تماماً لا يطابق أحداً١٢٣");
      same("١٥. **وكذلك جسمُ الردّ المتاح**",
        Object.keys(allowed.body ?? {}).sort(), ["available"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. الصلاحية على النقطة الجديدة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. الصلاحية ──");
    {
      const r = await nameAvailability(S.noPerm, "أحمد");
      same("١٦. **بلا `canAddPatients` ⟶ ٤٠٣**", r.status, 403);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و. تزامنٌ — اسمان متطابقان معاً لا ينجحان معاً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. التزامن على الاسم ──");
    {
      const NAME = "غسان فؤاد ناصر";
      const [r1, r2] = await Promise.all([
        registerPatient(S.recv, { name: NAME, phone: "07711000030" }),
        registerPatient(S.recv, { name: NAME, phone: "07711000031" }),
      ]);
      same("١٧. **محاولتان متزامنتان بنفس الاسم ⟶ واحدةٌ تنجح وأخرى تُرفض ٤٠٩**",
        [r1.status, r2.status].sort(), [201, 409]);
      same("     وصفٌّ واحدٌ بالضبط بهذا الاسم في القاعدة", await countByExactName(NAME), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز. الهاتفُ — تكرارٌ عند الإنشاء
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. تكرارُ الهاتف عند الإنشاء ──");
    {
      const fx = await mkActivePatient("راكان حسين جبّار", "07722000001");
      const dup = await registerPatient(S.recv, { name: "منتظر جبار سلمان", phone: "07722000001" });
      same("١٨. **نفسُ الرقم بالضبط لمريضٍ آخر ⟶ ٤٠٩**",
        [dup.status, dup.body?.code], [409, "patient_phone_conflict"]);
      same("     والعدّادُ لهذا الرقم لم يتغيّر — بقي ١", await countByPhoneE164(fx.phoneE164), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح. صيغٌ كتابيةٌ مختلفة لنفس الرقم — تتعارض
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. تكافؤُ صيغ الهاتف ──");
    {
      const fx = await mkActivePatient("سامر قاسم عبود", "07709876543");
      const equivalentForms = ["+9647709876543", "00964 770 987 6543", "9647709876543"];
      for (const [i, form] of equivalentForms.entries()) {
        const r = await registerPatient(S.recv, {
          name: `منتظر جبار سلمان ${i}`, phone: form,
        });
        same(`١٩.${i}. **الصيغةُ «${form}» تُطبَّع لنفس الرقم ⟶ ٤٠٩**`,
          [r.status, r.body?.code], [409, "patient_phone_conflict"]);
      }
      same("     والعدّادُ لهذا الرقم بقي ١ رغم ثلاث محاولات", await countByPhoneE164(fx.phoneE164), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط. الهاتفُ عند التعديل
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. الهاتفُ عند التعديل ──");
    {
      const a = await mkActivePatient("منتظر جبار سلمان أ", "07733000001");
      const b = await mkActivePatient("منتظر جبار سلمان ب", "07733000002");

      const dup = await http("PUT", `/api/patients/${b.id}`, S.admin, { phone: "07733000001" });
      same("٢٠. **تعديلُ هاتف ب إلى رقم أ ⟶ ٤٠٩**",
        [dup.status, dup.body?.code], [409, "patient_phone_conflict"]);
      const bAfter = await patientRow(b.id);
      same("     **وهاتفُ ب لم يتغيّر — بلا نصفِ كتابة**", bAfter.pe, b.phoneE164);

      const ownSameNumber = await http("PUT", `/api/patients/${a.id}`, S.admin,
        { phone: "+9647733000001" }); // صيغةٌ مختلفة لنفس رقم أ
      same("٢١. **ورقمُ المريض نفسِه بلا تغيير فعليّ (ولو بصيغةٍ مغايرة) ⟶ ينجح**",
        ownSameNumber.status, 200);
      const aAfter = await patientRow(a.id);
      same("     **ويبقى E.164 كما كان**", aAfter.pe, a.phoneE164);

      // ══ وأيضاً حين يُبدَّل الهاتفُ إلى رقمِ مريضٍ **محذوف** — لا فعّالٍ
      //  فقط (تصحيحٌ لاحقٌ ثانٍ، ٢٠٢٦-٠٩-٠٨) ═══════════════════════════════
      //  الثغرةُ: تر-أ محذوفٌ برقمه X ⟵ تر-ب الفعّالُ يُبدِّل رقمَه إلى X بلا
      //  عائق (الحارسُ القديم لا يرى المحذوف) ⟵ تر-أ يُستعاد خلال الثلاثين
      //  يوماً ⟵ **فعّالان بنفس X**. فصار `updatePatient` يفحص السلّةَ أيضاً
      //  حين يتغيّر الرقمُ فعلياً.
      const trA = await mkActivePatient("منتظر جبار سلمان ترِكرٌ أ", "07766000001");
      const trB = await mkActivePatient("منتظر جبار سلمان ترِكرٌ ب", "07766000002");

      const delTrA = await http("DELETE", `/api/patients/${trA.id}`, S.admin, { reason: "اختبار" });
      same("٢١.١ **تمهيدٌ: تر-أ يُحذَف حذفاً ناعماً برقمه X**", delTrA.status, 200);

      const changeToTrashed = await http("PUT", `/api/patients/${trB.id}`, S.admin,
        { phone: "07766000001" });
      same("٢١.٢ **وتر-ب الفعّالُ يحاول الانتقالَ إلى رقم تر-أ المحذوف ⟶ ٤٠٩ برسالة السلّة الآمنة نفسِها**",
        [changeToTrashed.status, changeToTrashed.body?.code, changeToTrashed.body?.message],
        [409, "patient_phone_trash_conflict", IN_TRASH_ESCALATION]);

      const trBAfter = await patientRow(trB.id);
      same("٢١.٣ **وهاتفُ تر-ب لم يتغيّر — بلا نصفِ كتابة**", trBAfter.pe, trB.phoneE164);

      const restoreTrA = await http("POST", `/api/patient-trash/${trA.id}/restore`, S.admin);
      same("٢١.٤ **والاستعادةُ العاديةُ لتر-أ تبقى تنجح بلا عائق — لم تُمَسّ**", restoreTrA.status, 200);
      const trAAfterRestore = await patientRow(trA.id);
      check(Boolean(trAAfterRestore) && trAAfterRestore!.da === null,
        "      وصفُّ تر-أ عاد نشطاً", JSON.stringify(trAAfterRestore));

      same("٢١.٥ **وبعد الاستعادة: صفٌّ نشطٌ واحدٌ بالضبط بهذا الرقم — لم يتكرّر أبداً**",
        await countByPhoneE164(trA.phoneE164), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي. تزامنٌ — رقمان متطابقان معاً لا ينجحان معاً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. التزامن على الهاتف ──");
    {
      const PHONE = "07744000001";
      const [r1, r2] = await Promise.all([
        registerPatient(S.recv, { name: "بيداء ريان", phone: PHONE }),
        registerPatient(S.recv, { name: "ريناس عدنان", phone: PHONE }),
      ]);
      same("٢٢. **محاولتان متزامنتان بنفس الهاتف ⟶ واحدةٌ تنجح وأخرى تُرفض ٤٠٩**",
        [r1.status, r2.status].sort(), [201, 409]);
      const eq = normalizePhone(PHONE, "IQ");
      same("     وصفٌّ واحدٌ بالضبط بهذا الرقم في القاعدة", await countByPhoneE164(eq.e164), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك. السلّةُ خارج منعِ التكرار تماماً — لا اسماً ولا هاتفاً
    // ══════════════════════════════════════════════════════════════════
    //  **انقلبَ عقدُ هذا القسم بقرارِ مالكٍ صريح (٢٠٢٦-٠٩-١٨)، لا لتخضير
    //  اختبار.** كان يثبت أنّ السلّة **تحجز** الهويّةَ عند التسجيل: اسمٌ أو
    //  هاتفٌ يطابق محذوفاً يُردّ ٤٠٩ برسالتها الآمنة. والقاعدةُ الآن عكسُه
    //  بالحرف: **المريضُ المحذوف لا يدخل منعَ التكرار إطلاقاً** — اسمُه لا
    //  يمنع، ورقمُه لا يمنع، وملفٌّ جديدٌ مطابقٌ له في **كلّ** بياناته
    //  يُسجَّل بصورةٍ طبيعية. بلا تأكيدٍ إداريّ ولا تجاوزٍ ولا نافذةٍ ثانية.
    //
    //  **وقاعدةُ الفعّالين لم تتغيّر بحرف** — تُثبَت هنا نفسُها في ك-٤.
    console.log("\n── ك. السلّةُ خارج منعِ التكرار ──");

    // ── ك-١. اسمٌ مطابقٌ لمحذوف وحده ⟶ يُسجَّل ─────────────────────────────
    {
      const NM = "زياد كامل مطشر";
      const x = await mkActivePatient(NM, "07755000001");

      const whileActive = await registerPatient(S.recv, { name: NM, phone: "07755000009" });
      same("٢٣. **تمهيدٌ: قبل الحذف الاسمُ الفعّالُ يمنع (القاعدةُ القديمة على الفعّالين)**",
        [whileActive.status, whileActive.body?.code], [409, "patient_name_conflict"]);

      const del = await http("DELETE", `/api/patients/${x.id}`, S.admin, { reason: "اختبار" });
      same("٢٤. **الحذفُ ناعمٌ كما كان — ٢٠٠ بلا هدم**", del.status, 200);
      const xAfterDelete = await patientRow(x.id);
      check(xAfterDelete !== null && xAfterDelete.da !== null,
        "٢٥. **والصفُّ باقٍ في القاعدة بختمِ حذفٍ — لم يُهدَم**",
        JSON.stringify(xAfterDelete));

      const availAfterDelete = await nameAvailability(S.recv, NM);
      same("٢٦. **وفحصُ توفّر الاسم في شاشة التسجيل: المحذوفُ ليس تعارضاً — `{available:true}` عارية**",
        availAfterDelete.body, { available: true });

      const sameNameOnly = await registerPatient(S.recv, { name: NM, phone: "07755000002" });
      same("٢٦.١ **واسمٌ مطابقٌ لمحذوف ⟶ يُسجَّل ٢٠١ بصورةٍ طبيعية**",
        [sameNameOnly.status, sameNameOnly.body?.code ?? null], [201, null]);
      same("      وصفّان بهذا الاسم الآن: المحذوفُ الأصليّ + الجديدُ الفعّال",
        await countByExactName(NM), 2);
      same("      **وواحدٌ فعّالٌ فقط** — المحذوفُ لم يُستعَد ضمناً",
        await countActiveByExactName(NM), 1);
      const xStillDeleted = await patientRow(x.id);
      check(xStillDeleted !== null && xStillDeleted.da !== null,
        "٢٦.٢ **وصفُّ المحذوف لم يُمَسّ — ما زال محذوفاً بختمه**",
        JSON.stringify(xStillDeleted));
    }

    // ── ك-٢. هاتفٌ مطابقٌ لمحذوف وحده ⟶ يُسجَّل ────────────────────────────
    {
      const NM = "وسام طالب عبد الحسن";
      const PH = "07755000101";
      const y = await mkActivePatient(NM, PH);
      const del = await http("DELETE", `/api/patients/${y.id}`, S.admin, { reason: "اختبار" });
      same("٢٦.٣ **تمهيدٌ: مريضٌ آخر يُحذَف برقمه**", del.status, 200);

      const samePhoneOnly = await registerPatient(S.recv,
        { name: "اسمٌ مختلفٌ تماماً لا صلة له بوسام", phone: PH });
      same("٢٦.٤ **وهاتفٌ مطابقٌ لمحذوف باسمٍ مختلفٍ تماماً ⟶ يُسجَّل ٢٠١**",
        [samePhoneOnly.status, samePhoneOnly.body?.code ?? null], [201, null]);
      same("      وصفّان بهذا الرقم: المحذوفُ + الجديد",
        await countByPhoneE164(y.phoneE164), 2);
      same("      **وواحدٌ فعّالٌ فقط بالرقم**", await countActiveByPhoneE164(y.phoneE164), 1);
      const yStillDeleted = await patientRow(y.id);
      check(yStillDeleted !== null && yStillDeleted.da !== null,
        "      وصفُّ المحذوف لم يُمَسّ", JSON.stringify(yStillDeleted));
    }

    // ── ك-٣. الاسمُ والهاتفُ معاً — تطابقٌ تامٌّ لمحذوف ⟶ يُسجَّل ──────────
    {
      const NM = "حيدر عباس فرحان";
      const PH = "07755000201";
      const z = await mkActivePatient(NM, PH);
      const del = await http("DELETE", `/api/patients/${z.id}`, S.admin, { reason: "اختبار" });
      same("٢٦.٥ **تمهيدٌ: مريضٌ ثالث يُحذَف باسمه ورقمه معاً**", del.status, 200);

      const before = await patientRow(z.id);

      const bothSame = await registerPatient(S.recv, { name: NM, phone: PH });
      same("٢٦.٦ **ونفسُ الاسم ونفسُ الهاتف معاً لمحذوف ⟶ يُسجَّل ٢٠١ — لا حجزَ ولا مراجعةَ إدارة**",
        [bothSame.status, bothSame.body?.code ?? null], [201, null]);
      same("      وصفّان بالاسم", await countByExactName(NM), 2);
      same("      وصفّان بالرقم", await countByPhoneE164(z.phoneE164), 2);
      same("      **وفعّالٌ واحدٌ بكلٍّ منهما**",
        [await countActiveByExactName(NM), await countActiveByPhoneE164(z.phoneE164)], [1, 1]);

      const after = await patientRow(z.id);
      same("٢٦.٧ **وصفُّ المحذوف مطابقٌ بايتاً قبل التسجيل وبعده — لا كتابةَ عليه ولا استعادةَ ضمنية**",
        after, before);
    }

    // ── ك-٤. والفعّالُ يبقى مانعاً — اسماً وهاتفاً (لم يتغيّر بحرف) ────────
    {
      const NM = "سجاد نعيم حسون";
      const PH = "07755000301";
      await mkActivePatient(NM, PH);

      const dupName = await registerPatient(S.recv, { name: NM, phone: "07755000302" });
      same("٢٦.٨ **مريضٌ نشطٌ بنفس الاسم يبقى مانعاً ⟶ ٤٠٩**",
        [dupName.status, dupName.body?.code, dupName.body?.message],
        [409, "patient_name_conflict", nameAlreadyRegisteredMessage(B1)]);
      same("      ولم يُفتَح له صفٌّ — صفٌّ واحدٌ بالاسم",
        await countByExactName(NM), 1);

      const dupPhone = await registerPatient(S.recv,
        { name: "اسمٌ مختلفٌ تماماً لا صلة له بسجاد", phone: PH });
      same("٢٦.٩ **ومريضٌ نشطٌ بنفس الهاتف يبقى مانعاً ⟶ ٤٠٩**",
        [dupPhone.status, dupPhone.body?.code], [409, "patient_phone_conflict"]);
      same("      ولم يُنشأ له صفٌّ",
        await countByExactName("اسمٌ مختلفٌ تماماً لا صلة له بسجاد"), 0);

      const availActive = await nameAvailability(S.recv, NM);
      same("٢٦.١٠ **وفحصُ توفّر الاسم يبقى يحجب الفعّال**",
        availActive.body,
        { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });
      same("      **وجسمُ الردّ ثلاثةُ مفاتيح لا غير** — لا اسمَ ولا رقمَ ولا حقلَ فرعٍ منظَّم",
        Object.keys(availActive.body ?? {}).sort(), ["available", "message", "reason"]);
    }

    // ── ك-٥. والاستعادةُ نفسُها لم تُمَسّ ─────────────────────────────────
    //  **والعاقبةُ المقبولةُ صراحةً بقرار المالك**: ملفٌّ جديد فُتح بهويّة
    //  محذوفٍ ثمّ استُعيد الأصلُ ⟶ ملفّان فعّالان بالهويّة نفسِها. هذا ما
    //  طُلب حرفياً («حتى إذا كانت جميع بيانات المريض الجديد مطابقة تماماً
    //  لمريض محذوف، يجب أن يقبل النظام التسجيل بصورة طبيعية») — ومعالجتُه
    //  قرارٌ إداريّ (دمجٌ أو حذف) لا حارسٌ في النظام. يُثبَت هنا صراحةً كي
    //  يُقرأ الأثرُ كما هو لا كما يُظَنّ.
    {
      const NM = "مرتضى صباح لفتة";
      const PH = "07755000401";
      const w = await mkActivePatient(NM, PH);
      await http("DELETE", `/api/patients/${w.id}`, S.admin, { reason: "اختبار" });
      const created = await registerPatient(S.recv, { name: NM, phone: PH });
      same("٢٦.١١ **تمهيدٌ: ملفٌّ جديدٌ بهويّة المحذوف يُسجَّل**", created.status, 201);

      const restore = await http("POST", `/api/patient-trash/${w.id}/restore`, S.admin);
      same("٢٦.١٢ **والاستعادةُ تنجح بلا عائق — لم تُمَسّ بحرف**", restore.status, 200);
      const wAfter = await patientRow(w.id);
      check(Boolean(wAfter) && wAfter!.da === null, "      والصفُّ عاد نشطاً",
        JSON.stringify(wAfter));

      same("٢٦.١٣ **وعندئذٍ ملفّان فعّالان بالهويّة نفسِها — العاقبةُ المقبولةُ صراحةً**",
        [await countActiveByExactName(NM), await countActiveByPhoneE164(w.phoneE164)], [2, 2]);
    }

    // ══════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════
    //  ل. `lookup-by-name` — المطابقاتُ الفعّالة وحدها
    // ══════════════════════════════════════════════════════════════════
    //  **انقلبَ عقدُ هذا القسم بقرارِ مالكٍ صريح (٢٠٢٦-٠٩-١٨)**: كان يثبت
    //  أربعةَ مفاتيح — ثلاثةٌ منها عن السلّة. وقد خرج المحذوفُ من هذا
    //  المسار كلّياً، فلم يبقَ إلّا `matches`.
    console.log("\n── ل. سلامةُ lookup-by-name ──");
    {
      const r = await http("GET",
        `/api/patients/lookup-by-name?name=${encodeURIComponent("أحمد حسين فايق")}`, S.recv);
      same("٢٧. **مفتاحٌ واحدٌ لا أكثر — لا حقلَ سلّةٍ في الردّ**",
        Object.keys(r.body ?? {}).sort(), ["matches"]);

      //  ══ والإثباتُ الحقيقيّ: نظيرٌ **فعّالٌ** في فرعٍ آخر يظهر، ومحذوفٌ
      //  مثلُه لا يظهر ═══════════════════════════════════════════════════
      //  الاثنان في الفرع ٢ والسائلُ من الفرع ١ — فالتصفيةُ بفرع السائل
      //  نفسِها لا تُخفي أيّاً منهما، والفارقُ الوحيد بينهما حالةُ الحذف.
      //  فلو عاد المحذوفُ يُقرأ يوماً لظهر هنا بعينه.
      const BASE = "هيثم رعد لؤي";
      const liveOther = await mkActivePatient(`${BASE} حاضر`, "07799000001", 2);
      const goneOther = await mkActivePatient(`${BASE} غائب`, "07799000002", 2);
      same("٢٧.١ **تمهيدٌ: الثاني يُحذَف حذفاً ناعماً**",
        (await http("DELETE", `/api/patients/${goneOther.id}`, S.admin,
          { reason: "اختبار" })).status, 200);

      const look = await http("GET",
        `/api/patients/lookup-by-name?name=${encodeURIComponent(BASE)}`, S.recv);
      const ids = (look.body?.matches ?? []).map((x: any) => x.id);
      check(ids.includes(liveOther.id),
        "٢٧.٢ **والنظيرُ الفعّالُ في الفرع الآخر يظهر — الكشفُ عبر الفروع لم يتغيّر**",
        JSON.stringify(look.body));
      check(!ids.includes(goneOther.id),
        "٢٧.٣ **والمحذوفُ لا يظهر إطلاقاً**", JSON.stringify(look.body));
      same("٢٧.٤ **ولا تنبيهَ ولا عدّاد — الردُّ `matches` وحده**",
        Object.keys(look.body ?? {}).sort(), ["matches"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  م. تزامنٌ — الاسمُ بادئةً لا مطابقةً تامّة فقط (تصحيحٌ لاحق)
    // ══════════════════════════════════════════════════════════════════
    //  الثغرةُ التي يحرسها: قفلٌ بهاش الاسم يحمي فقط «نفسَ الاسم ضدَّ نفسه»
    //  (كما في القسم و أعلاه) — لكنّه لا يحمي قاعدةَ **البادئة**: طلبان
    //  متزامنان بنصَّين **مختلفين** («أحمد حسين» بادئةٌ لِـ«أحمد حسين فايق»)
    //  كانا يأخذان مفتاحَي هاشٍ مختلفين فلا يتسلسلان، فيرى كلٌّ منهما «لا
    //  تعارض» (لا صفَّ لأيٍّ منهما بعد) ويكتبان معاً — بصرف النظر عمّا كانت
    //  ستقرّره القاعدةُ لو سُجِّلا تسلسلياً.
    //
    //  ══ حتميٌّ لا احتماليّ ═══════════════════════════════════════════════
    //  سباقٌ حقيقيّ عبر HTTP (`Promise.all` على نداءَين) غيرُ موثوق كإثبات:
    //  كلا الطلبين يُنجَز في أقلَّ من مللي ثانية على قاعدةٍ محلّية، فنادراً ما
    //  يتداخلان فعلياً — جُرِّب مباشرةً ووُجد يمرّ حتى مع الثغرة القديمة غير
    //  المُصحَّحة، لأنّ التداخلَ الحقيقيَّ لم يقع أصلاً لا لأنّ القفلَ نجح.
    //  فالإثباتُ هنا **حتميّ**: يستدعي `assertNameAvailableForRegistration`
    //  القانونية مباشرةً من معاملاتٍ محكومةِ التوقيت (لا مسباقة)، تُبقي إحداها
    //  قابضةً على القفل عمداً بانتظار بوّابةٍ يحرّرها الاختبار — فيُثبَت
    //  مباشرةً أنّ معاملةً باسمٍ **مختلفٍ تماماً** تبقى **محجوبةً فعلياً**
    //  (لا تعبر القفلَ بصمت) طَوال ذلك، لا تخميناً من نتيجةٍ نهائية قد تصحّ
    //  صدفةً.
    console.log("\n── م. التزامن على بادئة الاسم — إثباتٌ حتميّ ──");

    async function insertMinimal(tx: any, name: string): Promise<number> {
      const r: any = await tx.execute(sql`
        INSERT INTO patients (name, referral_source, age, height, weight,
          medical_condition, branch_id, total_cost, patient_classification,
          whatsapp_notifications_enabled)
        VALUES (${name}, ${MARK}, '30', '170', '70', 'physiotherapy', 1, 0, 'new', false)
        RETURNING id
      `);
      return Number(r.rows[0].id);
    }
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    {
      // م-١. الأقصر يقبض القفلَ أوّلاً ويُدرَج، ويبقى ممسكاً به عمداً. الأطولُ
      // (اسمٌ مختلفٌ تماماً، ليس نفس النصّ) يُختبَر أثناء ذلك — يجب أن يبقى
      // محجوباً حقّاً لا عابراً بصمت. ثمّ يُحرَّر القفلُ فيعبر الأطولُ ويُدرَج
      // بلا عائق — يمدِّد الأقصرَ، وهذا تسجيلٌ جديدٌ مشروع (اتجاهٌ واحد).
      const SHORT = "زهراء كامل";
      const LONG = "زهراء كامل جبار"; // بادئتُه بالضبط SHORT — يمدِّدها لا يطابقها.

      let releaseShort: () => void = () => {};
      const shortGate = new Promise<void>((resolve) => { releaseShort = resolve; });
      let shortPassedLock = false;
      const shortDone = db.transaction(async (tx: any) => {
        await assertNameAvailableForRegistration(tx, SHORT);
        shortPassedLock = true;
        const id = await insertMinimal(tx, SHORT);
        await shortGate; // القفلُ يبقى ممسوكاً حتى يُحرَّر صراحةً
        return id;
      });

      await sleep(80); // فرصةٌ سخيّة لتأكيد قبض القفل فعلاً قبل بدء الآخر
      check(shortPassedLock, "٢٨. **معاملةُ الأقصر عبرت القفلَ وأدرجت (وتبقى قابضةً عليه بانتظار التحرير)**");

      let longPassedLockWhileShortHeld = false;
      const longPromise = db.transaction(async (tx: any) => {
        await assertNameAvailableForRegistration(tx, LONG); // يجب أن يُحجَب هنا
        longPassedLockWhileShortHeld = true;
        return insertMinimal(tx, LONG);
      });

      await sleep(250); // نافذةٌ سخيّة يعبر خلالها أيُّ قفلٍ غيرِ فعّال بسهولة
      check(longPassedLockWhileShortHeld === false,
        "٢٩. **وبينما يحمل الأقصرُ القفلَ: معاملةُ الأطول (اسمٌ مختلفٌ تماماً) تبقى محجوبةً فعلياً بانتظاره — لا تعبر بصمت**",
        `longPassedLockWhileShortHeld=${longPassedLockWhileShortHeld}`);

      releaseShort();
      const [shortId, longId] = await Promise.all([shortDone, longPromise]);

      check(longPassedLockWhileShortHeld === true,
        "٣٠. **وبعد تحرّر القفل: الأطولُ يعبر أخيراً ويُدرَج — يمدِّد الأقصرَ، وهذا تسجيلٌ جديدٌ مشروع**");
      same("    وترتيبُ الإدراج الفعليّ يطابق ترتيبَ قبض القفل بالضبط", shortId < longId, true);
    }

    {
      // م-٢. **الاتجاهُ المعاكس**: الأطولُ يقبض القفلَ أوّلاً ويُدرَج ويبقى
      // ممسكاً به عمداً. الأقصرُ (بادئةٌ للأطول بالضبط) يُختبَر أثناء ذلك —
      // يجب أن يبقى محجوباً حقّاً أيضاً. ثمّ يُحرَّر القفلُ فيعبر الأقصرُ أخيراً
      // — ويجد الأطولَ **موجوداً فعلياً الآن** فيُرفَض بحارس التعارض نفسِه
      // (لا يُدرَج له شيء) — لأنّ اسماً فعّالاً قائماً يبدأ بنصّه بالضبط.
      const LONG2 = "وليد إبراهيم حسن";
      const SHORT2 = "وليد إبراهيم"; // بادئةٌ لِـLONG2 بالضبط.

      let releaseLong2: () => void = () => {};
      const long2Gate = new Promise<void>((resolve) => { releaseLong2 = resolve; });
      let long2PassedLock = false;
      const long2Done = db.transaction(async (tx: any) => {
        await assertNameAvailableForRegistration(tx, LONG2);
        long2PassedLock = true;
        const id = await insertMinimal(tx, LONG2);
        await long2Gate;
        return id;
      });

      await sleep(80);
      check(long2PassedLock, "    معاملةُ الأطول (م-٢) عبرت القفلَ وأدرجت، وتبقى قابضةً عليه");

      let short2PassedLockWhileLong2Held = false;
      let short2Rejected = false;
      const short2Promise = db.transaction(async (tx: any) => {
        await assertNameAvailableForRegistration(tx, SHORT2); // يجب أن يُحجَب هنا
        short2PassedLockWhileLong2Held = true;
        return insertMinimal(tx, SHORT2);
      }).catch((e: any) => {
        if (e instanceof PatientNameConflictError) short2Rejected = true;
        else throw e;
      });

      await sleep(250);
      check(short2PassedLockWhileLong2Held === false,
        "٣١. **وفي الاتجاه المعاكس: الأقصرُ (بادئةٌ للأطول) يبقى محجوباً فعلياً أيضاً بينما الأطولُ يحمل القفل**",
        `short2PassedLockWhileLong2Held=${short2PassedLockWhileLong2Held}`);

      releaseLong2();
      await Promise.all([long2Done, short2Promise]);

      check(short2Rejected,
        "٣٢. **وبعد تحرّر القفل: الأقصرُ يعبر أخيراً — ويُرفَض فوراً لأنّ الأطولَ صار موجوداً فعلياً**");
      const short2Row = (await q<{ id: number }>(
        `SELECT id FROM patients WHERE referral_source=$1 AND name=$2`, [MARK, SHORT2]))[0];
      check(!short2Row, "    ولم يُدرَج له صفٌّ إطلاقاً — التراجعُ كاملٌ لا نصفَ كتابة");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ن. تزامنٌ — الاستعادةُ لا تلتزم بين فحصَي الفعّال والمحذوف (تصحيحٌ لاحقٌ ثالث)
    // ══════════════════════════════════════════════════════════════════
    //  الثغرةُ التي يحرسها هذا القسم: فحصَا الفعّال والمحذوف (في التسجيل
    //  والتعديل معاً) عبارتا SQL منفصلتان تحت قفلٍ لم تكن الاستعادةُ تشارك
    //  فيه — فاستعادةٌ متزامنة كانت تستطيع الالتزامَ **بين العبارتين
    //  بالضبط**: تُقرأ الهويّةُ محذوفةً في فحص الفعّال (فلا تعارض)، ثمّ
    //  تلتزم الاستعادةُ، ثمّ تُقرأ فعّالةً في فحص المحذوف (فلا تعارضَ أيضاً)
    //  — فيعبر تسجيلٌ أو تعديلٌ بصمتٍ رغم أنّ الهويّةَ صارت فعّالةً للتوّ.
    //  فصار قفلُ الهويّة مشتركاً بين الثلاثة (`duplicate_guard.ts`، القسم ٥):
    //  مَن يقبضه أوّلاً يُتمّ معاملته القصيرة كاملةً قبل أن يبدأ الآخرُ فحصَه
    //  الأوّل أصلاً — فتُثبَت الاستعادةُ الحقيقية (عبر الـHTTP الحيّ) محجوبةً
    //  فعلياً طَوال ذلك، لا عابرةً بصمت.
    console.log("\n── ن. التزامن بين الاستعادة والتسجيل/التعديل — قفلُ الهويّة المشترك ──");

    {
      // ن-١. تعديلُ هاتفٍ يطالب برقم مريضٍ محذوف، يتسابق مع استعادة صاحبه.
      const rA = await mkActivePatient("راشد كامل عبود ن١", "07788000001");
      const delRA = await http("DELETE", `/api/patients/${rA.id}`, S.admin, { reason: "اختبار" });
      same("٣٣. **تمهيدٌ: راشد يُحذَف حذفاً ناعماً برقمه**", delRA.status, 200);
      const rB = await mkActivePatient("راشد كامل عبود ن١-ب", "07788000002");

      let releaseUpdateGate: () => void = () => {};
      const updateGate = new Promise<void>((resolve) => { releaseUpdateGate = resolve; });
      let updateAcquiredIdentityLock = false;
      let updateRejectedAsTrashConflict = false;
      const updateDone = db.transaction(async (tx: any) => {
        await acquirePatientIdentityLock(tx);
        updateAcquiredIdentityLock = true;
        await updateGate; // القفلُ يبقى ممسوكاً حتى يُحرَّر صراحةً
        // الفحصُ الحقيقيّ عبر الدالّة القانونية نفسِها — لا نسخةٌ يدوية من
        // منطقها. (تُعيد `assertPhoneAvailable` قبضَ قفل الهويّة نفسِه هنا
        // داخلياً — بلا ضرر، نفسُ الجلسة ونفسُ المعاملة.)
        await assertPhoneAvailable(tx, rA.phoneE164 as string, rB.id, { checkTrash: true });
      }).catch((e: any) => {
        if (e instanceof PatientPhoneTrashConflictError) updateRejectedAsTrashConflict = true;
        else throw e;
      });

      await sleep(80); // فرصةٌ سخيّة لتأكيد قبض القفل فعلاً قبل بدء الاستعادة
      check(updateAcquiredIdentityLock,
        "٣٤. **معاملةُ التعديل عبرت قفلَ الهويّة وتبقى قابضةً عليه بانتظار التحرير**");

      let restoreDone = false;
      let restoreHttpResult: { status: number; body: any } | null = null;
      const restorePromise = http("POST", `/api/patient-trash/${rA.id}/restore`, S.admin)
        .then((r) => { restoreDone = true; restoreHttpResult = r; return r; });

      await sleep(250); // نافذةٌ سخيّة تعبر خلالها أيُّ استعادةٍ غيرِ محجوبة بسهولة
      check(restoreDone === false,
        "٣٥. **وبينما التعديلُ يحمل قفل الهويّة: الاستعادةُ المتزامنة (عبر الـHTTP الحيّ) تبقى محجوبةً فعلياً — لا تعبر بصمت**",
        `restoreDone=${restoreDone}`);

      releaseUpdateGate();
      await Promise.all([updateDone, restorePromise]);

      check(updateRejectedAsTrashConflict,
        "٣٦. **وبعد تحرّر القفل: التعديلُ يُرفَض بتعارض السلّة كما هو متوقَّع — لم يتسلّل شيء بين فحصَي الفعّال والمحذوف**");
      same("٣٧. **والاستعادةُ تعبر بعده وتنجح بلا عائق**", restoreHttpResult?.status, 200);

      same("٣٨. **والحالةُ النهائية: صفٌّ نشطٌ واحدٌ بالضبط بهذا الرقم — لم يتكرّر أبداً**",
        await countByPhoneE164(rA.phoneE164), 1);
      const rBAfter = await patientRow(rB.id);
      same("      وهاتفُ راشد-ب لم يتغيّر إطلاقاً — بلا نصفِ كتابة", rBAfter.pe, rB.phoneE164);
    }

    {
      // ن-٢. تسجيلٌ يتسابق مع استعادة صاحب الاسم.
      //  **انقلبَ عقدُ هذا الجزء بقرار ٢٠٢٦-٠٩-١٨** (كما القسم ك): لم يعد
      //  للتسجيل إلّا فحصٌ واحد — الفعّالون — فلا «فحصان» تتسلّل بينهما
      //  الاستعادة. **لكنّ القفلَ المشترك ما زال يعمل ويجب أن يبقى**:
      //  الاستعادةُ تُصيّر الهويّةَ **فعّالة**، فتسجيلٌ بلا تسلسلٍ معها كان
      //  يقرأ «لا تعارضَ فعّالاً» ثمّ يُدرِج بعد التزامها — فينكسر شرطُ
      //  الفعّالين نفسُه (القسمان ١ و٢). فيُثبَت هنا ثلاثةٌ معاً: التسجيلُ
      //  يقبض القفلَ · والاستعادةُ تنتظره فعلياً · **وفحصُ الاسم يمضي على
      //  اسمٍ محذوف** (القاعدةُ الجديدة، عبر الدالّة القانونية نفسِها) ·
      //  ثمّ الفعّالُ يمنع بعد الاستعادة.
      const NM_A = "سرمد فالح شنون ن٢";
      const nmA = await mkActivePatient(NM_A, "07788000003");
      const delNmA = await http("DELETE", `/api/patients/${nmA.id}`, S.admin, { reason: "اختبار" });
      same("٣٩. **تمهيدٌ: سرمد يُحذَف حذفاً ناعماً باسمه**", delNmA.status, 200);

      let releaseCreateGate: () => void = () => {};
      const createGate = new Promise<void>((resolve) => { releaseCreateGate = resolve; });
      let createAcquiredIdentityLock = false;
      let createNameCheckPassed = false;
      let createRejectedUnexpectedly: string | null = null;
      const createDone = db.transaction(async (tx: any) => {
        await acquirePatientIdentityLock(tx);
        createAcquiredIdentityLock = true;
        await createGate;
        // الدالّةُ القانونية نفسُها — لا نسخةٌ يدوية من منطقها.
        await assertNameAvailableForRegistration(tx, NM_A);
        createNameCheckPassed = true;
      }).catch((e: any) => {
        //  انحدارٌ حقيقيّ لو عاد حجزُ السلّة يوماً: يُلتقَط ويُقرأ في ٤٢
        //  بوصفه فشلاً صريحاً، بدل رفضٍ غير ملتقَط يُسقط التشغيلَ كلَّه قبل
        //  أن يُطبَع سببُه.
        createRejectedUnexpectedly = e?.name ?? String(e);
      });

      await sleep(80);
      check(createAcquiredIdentityLock,
        "٤٠. **معاملةُ التسجيل عبرت قفلَ الهويّة وتبقى قابضةً عليه بانتظار التحرير**");

      let restoreDone2 = false;
      let restoreHttpResult2: { status: number; body: any } | null = null;
      const restorePromise2 = http("POST", `/api/patient-trash/${nmA.id}/restore`, S.admin)
        .then((r) => { restoreDone2 = true; restoreHttpResult2 = r; return r; });

      await sleep(250);
      check(restoreDone2 === false,
        "٤١. **وبينما التسجيلُ يحمل قفل الهويّة: الاستعادةُ المتزامنة تبقى محجوبةً فعلياً — القفلُ المشترك باقٍ ويعمل**",
        `restoreDone2=${restoreDone2}`);

      releaseCreateGate();
      await Promise.all([createDone, restorePromise2]);

      check(createNameCheckPassed,
        "٤٢. **وبعد تحرّر القفل: فحصُ الاسم يمضي — الاسمُ المحذوف ليس تعارضاً (القاعدةُ الجديدة)**",
        `createRejectedUnexpectedly=${createRejectedUnexpectedly}`);
      same("٤٣. **والاستعادةُ تعبر بعده وتنجح بلا عائق**", restoreHttpResult2?.status, 200);

      // وبعد أن صار الاسمُ **فعّالاً** بالاستعادة: تسجيلٌ حقيقيٌّ به يُردّ —
      // وهذا بالضبط ما يحرسه تسلسلُ القفل أعلاه.
      const afterRestore = await registerPatient(S.recv, { name: NM_A, phone: "07788000004" });
      same("٤٤. **وتسجيلٌ حقيقيٌّ بالاسم بعد استعادته ⟶ ٤٠٩ — قاعدةُ الفعّالين تسري عليه فوراً**",
        [afterRestore.status, afterRestore.body?.code], [409, "patient_name_conflict"]);
      same("      وصفٌّ واحدٌ بالضبط بهذا الاسم", await countByExactName(NM_A), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  س. **شكلُ لمياء بعينه** — مطابقةٌ تامّة عبر الفروع: تُحجَب كما كانت،
    //     **والرسالةُ تسمّي الفرعَ وتدلّ على الإتاحة** بدل «أكمل الاسم»
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── س. رسالةُ المطابقة التامّة (شكلُ لمياء) ──");
    {
      const NM = "لمياء حسين علي";
      await mkActivePatient(NM, "07766000401", 1); // بغداد

      //  استقبالُ الفرع ٢ (الموصل في الواقع) يكتب الاسمَ نفسَه حرفاً بحرف.
      const live = await nameAvailability(S.recv2, NM);
      same("٤٥. **فحصُ الاسم الحيّ من فرعٍ آخر ⟶ محجوب، والرسالةُ تسمّي فرعَ تسجيله**",
        live.body,
        { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });

      //  **والمنعُ نفسُه لم يضعف بحرف** — نفسُ الردّ ونفسُ الرمز، وصفرُ كتابة.
      const post = await registerPatient(S.recv2, { name: NM, phone: "07766000402", branchId: 2 });
      same("٤٦. **والتسجيلُ الفعليُّ يُردّ ٤٠٩ بالرسالة نفسِها — المنعُ كما كان**",
        [post.status, post.body?.code, post.body?.message],
        [409, "patient_name_conflict", nameAlreadyRegisteredMessage(B1)]);
      same("      وصفٌّ واحدٌ بالاسم — لا ملفَّ ثانياً", await countByExactName(NM), 1);

      //  **ورسالةُ البادئة تبقى في موضعها بالحرف** — اسمٌ قائمٌ أطولُ من
      //  المُدخَل قد يكون شخصاً آخر، و«أكمل كتابة الاسم» نصيحتُه الصحيحة.
      const prefix = await nameAvailability(S.recv2, "لمياء حسين");
      same("٤٧. **وبادئةٌ أقصرُ ⟶ الرسالةُ القديمة بحرفها، لا تسمّي فرعاً ولا تتغيّر**",
        prefix.body,
        { available: false, reason: "active_conflict", message: NAME_PREFIX_CONFLICT_MESSAGE });

      //  **والاسمُ الأطول يمرّ كما كان** — القاعدةُ لم تتغيّر، الرسالةُ فقط.
      const longer = await registerPatient(S.recv2,
        { name: `${NM} محمد`, phone: "07766000403", branchId: 2 });
      same("٤٨. **والاسمُ الأطول يُسجَّل كما كان — لا قاعدةَ تغيّرت**",
        [longer.status, typeof longer.body?.id], [201, "number"]);

      //  **واسمُ فرعٍ غائبٌ أو فارغ ⟶ رسالةٌ بلا عبارة «في فرع»** — لا
      //  يُخمَّن ولا يُترك فراغاً معلَّقاً. و`patients.branch_id` عمودٌ
      //  `NOT NULL` بمفتاحٍ أجنبيّ إلى `branches` (مُتحقَّقٌ في القاعدة)،
      //  فالانضمامُ لا يُرجع فراغاً عملياً — والحارسُ لاسمِ فرعٍ فارغ.
      //  فيُفحَص على الدالّة الخالصة مباشرةً، بلا اختلاق حالةٍ لا تقع.
      const bare = nameAlreadyRegisteredMessage(null);
      check(!/ في فرع /.test(bare), "٤٩. **بلا اسمِ فرع ⟶ لا عبارةَ «في فرع» في الرسالة**", bare);
      check(bare.includes("مسجَّل مسبقاً") && bare.includes("راجع المسؤول"),
        "      وتبقى تقول «مسجَّل مسبقاً» وتدلّ على المسؤول", bare);
      check(nameAlreadyRegisteredMessage("  ").includes("في فرع") === false,
        "      واسمُ فرعٍ بياضاً يُقرأ غياباً لا فرعاً اسمُه فراغ");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ع. **والإرشادُ محايدٌ لأنّ نطاقَ السائل غيرُ معلومٍ للحارس**
    //     (تصحيحُ مراجعةٍ آلية على الطلب ٣٨٢، ٢٠٢٦-٠٩-٢٢)
    //
    //  أوّلُ صياغةٍ أمرت صراحةً: «راجع المسؤول لإتاحة ملفّه لفرعك» —
    //  **وهي خاطئةٌ في أشيع حالاتها**: المنعُ عالميٌّ عبر الفروع، وأكثرُ ما
    //  يقع أن يكون المريضُ في **فرع السائل نفسِه**، فلا إتاحةَ تلزم.
    //  وكذلك ملفٌّ أُتيح لفرعه سلفاً، وكذلك المسؤولُ العام نفسُه.
    //
    //  **والحارسُ لا يقرأ نطاقاً**: `checkNameAvailability(db, name)` و
    //  `assertNameAvailableForRegistration(tx, name)` — بلا جلسةٍ ولا فرع.
    //  فالإرشادُ يصف **فعلاً يصحّ في الحالات الأربع**، ويُثبَت هنا حيّاً
    //  أنّ ذلك الفعل قابلٌ للتنفيذ في كلّ نطاق.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ع. الإرشادُ محايدٌ ويصحّ في نطاق كلّ سائل ──");
    {
      //  هل يجد السائلُ المريضَ في سجلّ المرضى فعلاً؟ — **النقطةُ الحقيقية**
      //  `/api/patients/registry` بحُرّاسها، لا وصفٌ مكتوب.
      const registryFinds = async (session: any, name: string): Promise<boolean> => {
        const r = await http("GET",
          `/api/patients/registry?search=${encodeURIComponent(name)}&pageSize=50`, session);
        const rows = Array.isArray(r.body?.rows) ? r.body.rows : [];
        return rows.some((p: any) => p?.name === name);
      };

      //  **أمرٌ غيرُ مشروطٍ بالإتاحة** — الشكلُ الذي لا يجوز أن يصل سائلاً
      //  يملك الملفَّ أصلاً. الفحصُ على **العلاقة** لا على نصٍّ حرفيّ.
      const ordersEscalationUnconditionally = (m: string) =>
        m.includes("راجع المسؤول") && !m.includes("وإن لم يظهر لك");

      const NM2 = "نور صباح كريم";
      await mkActivePatient(NM2, "07766000411", 1); // بغداد

      // ── ع١. **فرعُ السائل نفسُه** — الحالةُ الأشيع ──────────────────
      const sameLive = await nameAvailability(S.recv, NM2);
      same("٥٠. **مطابقةٌ تامّة داخل فرع السائل ⟶ محجوبةٌ كما كانت**",
        sameLive.body,
        { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });
      const seenBySame = await registryFinds(S.recv, NM2);
      check(seenBySame, "      والسجلُّ يُظهره لها فعلاً — فلا إتاحةَ تلزم أصلاً");
      check(!(seenBySame && ordersEscalationUnconditionally(sameLive.body?.message ?? "")),
        "٥١. **فلا تأمرها الرسالةُ بالإتاحة أمراً غيرَ مشروط**",
        String(sameLive.body?.message));

      //  **والمنعُ نفسُه لم يضعف بحرف** في هذا النطاق أيضاً.
      const samePost = await registerPatient(S.recv, { name: NM2, phone: "07766000412", branchId: 1 });
      same("٥٢. **والتسجيلُ من فرعه نفسِه يُردّ ٤٠٩ — القاعدةُ كما هي**",
        [samePost.status, samePost.body?.code], [409, "patient_name_conflict"]);
      same("      وصفٌّ واحدٌ بالاسم", await countByExactName(NM2), 1);

      // ── ع٢. **ملفٌّ أُتيح لفرعها سلفاً** (ترحيل ٠٨٠) ────────────────
      const [pid] = await q<{ id: number }>(
        `SELECT id FROM patients WHERE referral_source=$1 AND name=$2`, [MARK, NM2]);
      await q(`INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_user_id, granted_by_name)
               VALUES ($1, 2, $2, 'المسؤول') ON CONFLICT DO NOTHING`, [pid.id, ADMIN]);
      const sharedLive = await nameAvailability(S.recv2, NM2);
      same("٥٣. **ومُتاحٌ لفرعٍ آخر ⟶ محجوبٌ كما كان**",
        sharedLive.body,
        { available: false, reason: "active_conflict", message: nameAlreadyRegisteredMessage(B1) });
      const seenByShared = await registryFinds(S.recv2, NM2);
      check(seenByShared, "      والسجلُّ يُظهره لفرعٍ أُتيح له — فلا إتاحةَ ثانية تلزم");
      check(!(seenByShared && ordersEscalationUnconditionally(sharedLive.body?.message ?? "")),
        "٥٤. **ولا تأمره الرسالةُ بإتاحةٍ يملكها سلفاً**",
        String(sharedLive.body?.message));

      // ── ع٣. **المسؤولُ العام** — يقرأ «راجع المسؤول» وهو هو ─────────
      const adminLive = await nameAvailability(S.admin, NM2);
      check(adminLive.body?.available === false, "٥٥. **والمسؤولُ يُحجَب كغيره — القاعدةُ لا تستثني أحداً**");
      const seenByAdmin = await registryFinds(S.admin, NM2);
      check(seenByAdmin, "      والسجلُّ يُظهره له");
      check(!(seenByAdmin && ordersEscalationUnconditionally(adminLive.body?.message ?? "")),
        "٥٦. **ولا تُرسله الرسالةُ إلى نفسِه**", String(adminLive.body?.message));

      // ── ع٤. **وبلا إتاحةٍ يصحّ الشقُّ الثاني فعلاً** ─────────────────
      //  فالإرشادُ ليس تليينَ رسالةٍ — «فراجع المسؤول» تبقى الخطوةَ
      //  الصحيحة حيث لا يملك السائلُ الملفَّ، وهنا يُثبَت أنها تقع فعلاً.
      const NM3 = "هدى ناصر جبار";
      await mkActivePatient(NM3, "07766000413", 1); // بغداد، بلا إتاحة
      const farLive = await nameAvailability(S.recv2, NM3);
      check(farLive.body?.available === false, "٥٧. **ومريضُ فرعٍ آخر بلا إتاحة ⟶ محجوب**");
      check(!(await registryFinds(S.recv2, NM3)),
        "      والسجلُّ لا يُظهره له — فالشقُّ الثاني («فراجع المسؤول») هو الصواب هنا");
      check(String(farLive.body?.message).includes("راجع المسؤول"),
        "٥٨. **والرسالةُ تدلّه عليه — الإرشادُ لم يسقط، صار مشروطاً**",
        String(farLive.body?.message));
    }

  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, RECV, RECV2, NOPERM]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص منع تكرار التسجيل نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
