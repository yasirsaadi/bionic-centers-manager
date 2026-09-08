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
//    محاولتين متزامنتين بنفس الاسم أو نفس الهاتف معاً.
// ٤) **السلّةُ لا تُمَسّ** — مريضٌ محذوفٌ (سلّةٌ) لا يُحتسَب نشطاً، فاسمُه
//    ورقمُه يعودان متاحين، والحذفُ نفسُه يبقى ناعماً كما كان.
// ٥) **`lookup-by-name` بحرفها** — لم تُمَسّ، ولا تزال تعمل لغرضها الخاصّ.

import { pool } from "./db";
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
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
      same("١. **«أحمد» — بادئةٌ لاسمٍ قائم ⟶ محجوب**", short1.body, { available: false });

      const short2 = await nameAvailability(S.recv, "أحمد حسين");
      same("٢. **«أحمد حسين» — بادئةٌ أطول لكنّها لا تزال بادئة ⟶ محجوب**",
        short2.body, { available: false });

      const exact = await nameAvailability(S.recv, "أحمد حسين فايق");
      same("٣. **مطابقةٌ تامّة ⟶ محجوب أيضاً (البادئةُ تشمل التطابق)**",
        exact.body, { available: false });

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
        fromBranch1.body, { available: false });

      const fromBranch2 = await nameAvailability(S.recv2, "زينب");
      same("٨. **وكذلك استقبالُ الفرع نفسِه (٢)**", fromBranch2.body, { available: false });

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
        bareAlif.body, { available: false });

      await mkActivePatient("فاطمة", "07711000021"); // تاء مربوطة
      const withHeh = await nameAvailability(S.recv, "فاطمه"); // هاء
      same("١١. **«فاطمة» تُطابِق «فاطمه» (ة⟵ه)**", withHeh.body, { available: false });

      await mkActivePatient("مُحَمَّد", "07711000022"); // بتشكيل كامل
      const bareLetters = await nameAvailability(S.recv, "محمد");
      same("١٢. **التشكيلُ لا يُخفي المطابقة**", bareLetters.body, { available: false });

      await mkActivePatient("نور  الهدى", "07711000023"); // مسافةٌ مضاعفة
      const singleSpace = await nameAvailability(S.recv, "نور الهدى");
      same("١٣. **المسافاتُ المكرَّرة تُطوى فلا تُخفي المطابقة**",
        singleSpace.body, { available: false });
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. لا كشفَ لأيّ بياناتٍ عن المطابقة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. لا كشفَ لبيانات ──");
    {
      const blocked = await nameAvailability(S.recv, "أحمد");
      same("١٤. **جسمُ الردّ المحجوب مفتاحٌ واحد فقط: `available`**",
        Object.keys(blocked.body ?? {}).sort(), ["available"]);

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
    //  ك. السلّةُ — محذوفٌ لا يُحتسَب نشطاً، والحذفُ يبقى ناعماً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. السلّة ──");
    {
      const x = await mkActivePatient("زياد كامل مطشر", "07755000001");

      const whileActive = await registerPatient(S.recv,
        { name: "زياد كامل مطشر", phone: "07755000001" });
      same("٢٣. **قبل الحذف: نفسُ الاسم ونفسُ الرقم محجوبان معاً**",
        whileActive.status, 409);

      const del = await http("DELETE", `/api/patients/${x.id}`, S.admin, { reason: "اختبار" });
      same("٢٤. **الحذفُ ناعمٌ كما كان — ٢٠٠ بلا هدم**", del.status, 200);
      const xAfterDelete = await patientRow(x.id);
      check(xAfterDelete !== null && xAfterDelete.da !== null,
        "٢٥. **والصفُّ باقٍ في القاعدة بختمِ حذفٍ — لم يُهدَم**",
        JSON.stringify(xAfterDelete));

      const afterDelete = await registerPatient(S.recv,
        { name: "زياد كامل مطشر", phone: "07755000001" });
      same("٢٦. **وبعد الحذف: نفسُ الاسم ونفسُ الرقم صارا متاحين — المحذوفُ ليس نشطاً**",
        [afterDelete.status, typeof afterDelete.body?.id], [201, "number"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ل. `lookup-by-name` — بحرفها، لم تُمَسّ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. سلامةُ lookup-by-name ──");
    {
      const r = await http("GET",
        `/api/patients/lookup-by-name?name=${encodeURIComponent("أحمد حسين فايق")}`, S.recv);
      same("٢٧. **نفسُ شكل الردّ القديم — لم تُمَسّ**",
        Object.keys(r.body ?? {}).sort(),
        ["inTrash", "inTrashCount", "matches", "trashNotice"]);
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
