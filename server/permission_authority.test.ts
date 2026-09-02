// الصلاحياتُ المخزَّنة سلطةٌ حيّة — لا الدور (إصلاحٌ 2026-09-01).
// حيّاً على Postgres وعلى النقاط الحقيقية. `npm run test:permission-authority`.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// كان دورُ «مدير الفرع» يمنح كلَّ الصلاحيات الوظيفية تلقائياً (`grantAll`)
// عند تسجيل الدخول — بصرف النظر عمّا هو مخزَّنٌ فعلاً على صفّه، وبصرف
// النظر عن أيّ تعديلٍ لاحق من شاشة المستخدمين. فسحبُ صلاحيةٍ من مدير فرعٍ
// بعينه كان بلا أثر، والمنحُ نفسُه كان مُلقَطاً في الجلسة لحظةَ الدخول —
// تعديلٌ من الشاشة لا يسري إلا بخروجٍ وعودة.
//
// وما يُثبته هنا (السيناريوهات الخمسة المطلوبة تحديداً):
//   (١) **العَلَمُ مُطفَأٌ ⟶ مديرُ فرعٍ يُرفَض** — رغم دوره.
//   (٢) **العَلَمُ مُشعَلٌ ⟶ دورٌ آخر (استقبال) يُقبَل** — العَلَمُ لا الدور.
//   (٣) **عزلُ الفرع باقٍ كما هو** — صلاحيةٌ صحيحة لا تفتح فرعاً آخر.
//   (٤) **المسؤولُ العام بلا قيد** — حتى لو كان صفّه الشخصيّ يحمل كلَّ
//       الأعلام مُطفَأة صراحةً في القاعدة.
//   (٥) **سريانُ التغيير فوراً بلا خروجٍ وعودة** — نفسُ الجلسة (الهيدر)
//       بلا أيّ تعديل، والقاعدةُ وحدها تتغيّر بين الطلبين.
//
// وبابان مختلفان يثبتان معاً أن الإصلاح يعمل بنمطَيه:
//   **الفصل أ** — `GET /api/patients/:id/cases` (`canViewPatients`): كان
//   الفحصُ `isAdmin || role==='branch_manager' || canViewPatients` — أُزيل
//   منحُ الدور.
//   **الفصل ب** — `PUT /api/patients/:id` (`canEditPatients`): كان الفحصُ
//   نطاقَ الفرع فقط بلا أيّ عَلَمٍ إطلاقاً — أُضيف الشرطُ من الصفر.
//
// ══ لماذا الهيدرُ بلا `permissions` عمداً ═════════════════════════════════
// لو حمل هيدرُ الجلسة صلاحياتٍ جاهزة، لَما ثبت شيء: قد تكون هذه القيمُ هي
// ما يفتح الباب لا القاعدة. فكلُّ جلسةٍ غير إداريةٍ هنا **بلا** `permissions`
// إطلاقاً — فلا سبيل للنجاح إلا أن يُعيد الخادمُ بناءها حيّاً من صفّ
// `system_users` نفسِه على كل طلب (المِعترِضةُ الجديدة في `routes.ts`).
//
// ══ توسيعٌ 2026-09-02 — إكمالُ السلطة الحيّة على أبوابٍ لم تكن محروسة ═════
// الأقسامُ أ–هـ أعلاه تثبت النمطَ العامّ على بابين. وما يلي يثبته على
// الأبواب التي كانت **بلا أيّ فحص عَلَمٍ إطلاقاً** قبل هذا التصحيح:
//   **الفصل و** — `POST /api/patients` (`canAddPatients`): لم تكن هذه
//   النقطةُ تتحقّق من شيء غير المصادقة.
//   **الفصل ز** — `GET /api/patients` و`GET /api/patients/registry` و
//   `GET /api/patients/:id` (`canViewPatients` على الأبواب الأساسية الثلاثة
//   — الفصلُ أ أثبتها على `/cases` فقط).
//   **الفصل ح** — `canViewPayments`: لا صفوفَ دفعاتٍ ولا مبالغَ مشتقّةً منها
//   تصل مَن لا يملك العَلَم، **والمريضُ يبقى مرئياً بلا حجب**.
//   **الفصل ط** — `canViewReports`: كانت محجوبةً في الواجهة فقط — تقريرٌ
//   عامٌّ وإحصاءٌ عامّ ممثِّلان.
//   **الفصل ي** — تحصينُ القراءة الحيّة: مستخدمٌ غيرُ نشطٍ أو صفٌّ مفقود لا
//   يستمرّ بصلاحياتٍ قديمة مخبَّأة — ٤٠١ لا ٢٠٠ ولا فشلٌ صامت.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

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

const PORT = 6871;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سلطة-الصلاحيات";
const TOKEN = "صلاحياتحيّة";
const ADMIN = 9931, MGR_NO = 9932, RECEPTION_YES = 9933, LIVE_USER = 9934;
//  ══ توسيعٌ 2026-09-02 ══════════════════════════════════════════════════
const PAY_BLIND = 9935;      // يرى المرضى، لا يرى الدفعات — يفرّق العَلَمين.
const INACTIVE_USER = 9936;  // صفٌّ حقيقيّ، لكن `is_active=false`.
const MISSING_USER = 9937;   // **لا صفَّ له إطلاقاً** — لا يُدرَج أبداً عمداً.
const USERS = [ADMIN, MGR_NO, RECEPTION_YES, LIVE_USER, PAY_BLIND, INACTIVE_USER, MISSING_USER];

// ══ جلساتٌ بلا `permissions` — القاعدةُ وحدها يجب أن تقرّر (انظر أعلاه) ══
const S: Record<string, any> = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [],
    displayName: "المسؤول" },
  mgrNo: { userId: MGR_NO, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مديرٌ بلا صلاحية مخزَّنة" },
  receptionYes: { userId: RECEPTION_YES, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبالٌ بصلاحية مخزَّنة" },
  liveUser: { userId: LIVE_USER, role: "therapist", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "معالجٌ — تعديلٌ حيّ" },
  payBlind: { userId: PAY_BLIND, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبالٌ يرى المرضى لا الدفعات" },
  inactiveUser: { userId: INACTIVE_USER, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "حسابٌ معطَّل" },
  missingUser: { userId: MISSING_USER, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "حسابٌ محذوف" },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  //  ══ base64 — الأسماءُ العربية في الجلسة لا تصلح قيمةَ هيدرٍ مباشرة ══
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

async function mkPatient(label: string, branchId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       medical_condition, branch_id, total_cost, patient_classification)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','قبل الاختبار',$3,0,'new')
     RETURNING id`,
    [`${TOKEN} ${label}`, MARK, branchId]);
  return r[0].id;
}

/** دفعةٌ حقيقية على مريض — لإثبات أنها **تُحجَب** لا أنها غائبةٌ أصلاً. */
async function mkPayment(patientId: number, branchId: number, amount: number) {
  await q(`INSERT INTO payments (patient_id, branch_id, amount) VALUES ($1,$2,$3)`,
    [patientId, branchId, amount]);
}

async function setStoredFlags(userId: number, flags: { canView: boolean; canEdit: boolean }) {
  await q(
    `UPDATE system_users SET can_view_patients=$2, can_edit_patients=$3 WHERE id=$1`,
    [userId, flags.canView, flags.canEdit]);
}

async function cleanup() {
  //  ══ هويّةٌ مزدوجة ═══════════════════════════════════════════════════
  //  `mkPatient` يكتب `referral_source = MARK`؛ والقسمُ و ينشئ عبر
  //  `POST /api/patients` الحقيقية (لإثبات أن الكتابةَ تمرّ فعلاً لا مجرّد
  //  ردّ حالة) باسمٍ يحمل `TOKEN` — الشرطان معاً يغطّيان كلَّ صفٍّ أنشأه
  //  هذا الملفّ.
  const cond = `referral_source = '${MARK}' OR name LIKE '${TOKEN}%'`;
  const ids = `SELECT id FROM patients WHERE ${cond}`;
  //  ══ سلسلةُ الحذف الكاملة — نفسُ ترتيب `patient_code_api.test.ts`
  //  المُثبَت (POST /api/patients الحقيقية تكتب جهةَ اتصالٍ وترحيباً
  //  واتساب تلقائياً، القسم 4.c من CLAUDE.md، فبلا هذه السلسلة يفشل حذفُ
  //  المريض بقيدٍ أجنبيّ من `patient_contacts`). ══════════════════════════
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_link_tokens WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE ${cond}`);
  //  أسماءٌ بديلة قد تصير يتيمة بعد حذف الملفّات (لا يقع في الإنتاج).
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, canView, canEdit, canAdd, canViewPay, canViewRep, isActive] of [
    // المسؤولُ العام يحمل صفّاً شخصياً بأعلامٍ **مُطفَأة صراحةً بالكامل** —
    // ليثبت القسمُ (د) وكلُّ الأقسام الجديدة أن `isAdmin` وحدَه يكفي، لا
    // أيَّ عَلَمٍ مخزَّن.
    [ADMIN, "admin", "المسؤول", 1, false, false, false, false, false, true],
    // مديرُ الفرع بلا أيّ عَلَم — كان الدورُ وحده يفتح كلَّ هذه الأبواب قبل
    // الإصلاح. يُستعمَل لإثبات «لا منحَ ضمنيّاً» على كلّ عَلَمٍ جديد أيضاً.
    [MGR_NO, "branch_manager", "مديرٌ بلا صلاحية مخزَّنة", 1, false, false, false, false, false, true],
    // استقبالٌ يحمل كلَّ الأعلام صراحةً — يثبت أن العَلَمَ لا الدور هو الحَكَم.
    [RECEPTION_YES, "reception", "استقبالٌ بصلاحية مخزَّنة", 1, true, true, true, true, true, true],
    // يبدأ بلا الأعلام؛ يُبدَّل حيّاً أثناء الاختبار (القسم هـ).
    [LIVE_USER, "therapist", "معالجٌ — تعديلٌ حيّ", 1, false, false, false, false, false, true],
    // ══ يرى المرضى، لا يرى الدفعات — يفرّق العَلَمين استقلالاً (القسم ح) ══
    [PAY_BLIND, "reception", "استقبالٌ يرى المرضى لا الدفعات", 1, true, true, true, false, false, true],
    // ══ حسابٌ حقيقيّ لكنّه معطَّل — كلّ الأعلام مُشعَلة، والتعطيلُ وحده
    // يجب أن يقفل البابَ (القسم ي) ═══════════════════════════════════════
    [INACTIVE_USER, "reception", "حسابٌ معطَّل", 1, true, true, true, true, true, false],
    //  ملاحظة: `MISSING_USER` لا صفَّ له هنا إطلاقاً — عمداً (القسم ي).
  ] as any[]) {
    await q(
      `INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
         branch_ids, is_active, can_view_patients, can_edit_patients, can_add_patients,
         can_view_payments, can_view_reports)
       VALUES ($1,$2,'x',$3,$4,$5,'[1]'::jsonb,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
         branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=EXCLUDED.is_active,
         can_view_patients=EXCLUDED.can_view_patients, can_edit_patients=EXCLUDED.can_edit_patients,
         can_add_patients=EXCLUDED.can_add_patients, can_view_payments=EXCLUDED.can_view_payments,
         can_view_reports=EXCLUDED.can_view_reports`,
      [id, `perm_auth_u${id}`, name, role, branch, isActive, canView, canEdit, canAdd, canViewPay, canViewRep]);
  }
  //  ══ `MISSING_USER` — التأكّدُ الصريح أنه لا صفَّ له (وليس بقايا تشغيلٍ
  //  سابق)، فيَصدُق سيناريو «صفٌّ مفقود» في القسم ي. ══════════════════════
  await q(`DELETE FROM system_users WHERE id = $1`, [MISSING_USER]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    //  ══ `destroy()` — تحصينُ المِعترِضة الحيّة يستدعيه لصفٍّ مفقود/معطَّل
    //  (القسم ي، 2026-09-02) ═══════════════════════════════════════════
    //  `express-session` الحقيقية تحمل `.destroy(callback)`؛ هذا الجلسةُ
    //  الوهمية لم تكن تحمله فكانت ستُسقط استثناءً في وعدٍ غير مُمسَك.
    const destroy = (cb: () => void) => cb();
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")), destroy }
      : { destroy };
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

    const pBranch1 = await mkPatient("مريضٌ في الفرع الأول", 1);
    const pBranch2 = await mkPatient("مريضٌ في الفرع الثاني", 2);

    // ══ أ. `canViewPatients` وحدها — لا منحَ دورٍ (GET /cases) ══════════
    console.log("\n── أ. GET /api/patients/:id/cases — canViewPatients لا الدور ──");
    const viewDenied = await http("GET", `/api/patients/${pBranch1}/cases`, S.mgrNo);
    same("أ١. **مديرُ فرعٍ بلا canViewPatients مخزَّنة ⟶ ٤٠٣** رغم دوره",
      viewDenied.status, 403);

    const viewAllowed = await http("GET", `/api/patients/${pBranch1}/cases`, S.receptionYes);
    same("أ٢. **واستقبالٌ بـ canViewPatients=true مخزَّنة ⟶ ٢٠٠** — العَلَمُ لا الدور",
      viewAllowed.status, 200);

    // ══ ب. `canEditPatients` — بابٌ جديد كلّياً (PUT /api/patients/:id) ═══
    console.log("\n── ب. PUT /api/patients/:id — canEditPatients لا الدور (شرطٌ جديد) ──");
    const editDenied = await http("PUT", `/api/patients/${pBranch1}`, S.mgrNo,
      { medicalCondition: "محاولةُ مديرٍ بلا صلاحية" });
    same("ب١. **مديرُ فرعٍ بلا canEditPatients مخزَّنة ⟶ ٤٠٣** رغم دوره",
      editDenied.status, 403);
    const stillOld1 = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pBranch1]))[0];
    same("ب٢. **ولم يتغيّر شيء في القاعدة**", stillOld1?.medical_condition, "قبل الاختبار");

    const editAllowed = await http("PUT", `/api/patients/${pBranch1}`, S.receptionYes,
      { medicalCondition: "عدّله الاستقبال بصلاحيته" });
    same("ب٣. **واستقبالٌ بـ canEditPatients=true مخزَّنة ⟶ ٢٠٠**", editAllowed.status, 200);
    const changedRow = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pBranch1]))[0];
    same("ب٤. **والحقلُ تغيّر فعلاً**", changedRow?.medical_condition, "عدّله الاستقبال بصلاحيته");

    // ══ ج. عزلُ الفرع باقٍ كما هو ═══════════════════════════════════════
    console.log("\n── ج. عزلُ الفرع لم يضعف ──");
    const crossBranch = await http("PUT", `/api/patients/${pBranch2}`, S.receptionYes,
      { medicalCondition: "محاولةُ عبور فرع" });
    same("ج١. **واستقبالٌ بصلاحيةٍ صحيحة لمريضٍ خارج فرعه ⟶ ٤٠٣**", crossBranch.status, 403);
    const untouchedBranch2 = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pBranch2]))[0];
    same("ج٢. **ولم يتغيّر شيء**", untouchedBranch2?.medical_condition, "قبل الاختبار");

    // ══ د. المسؤولُ العام بلا قيد — ولو كان صفّه الشخصيّ يقول «لا» ═══════
    console.log("\n── د. المسؤولُ بلا قيدٍ رغم أعلامه الشخصية المُطفَأة ──");
    const [adminRow] = await q<{ can_view_patients: boolean; can_edit_patients: boolean }>(
      `SELECT can_view_patients, can_edit_patients FROM system_users WHERE id=$1`, [ADMIN]);
    same("   تمهيد: صفُّ المسؤول نفسُه يحمل الأعلامَ مُطفَأةً صراحةً في القاعدة",
      [adminRow.can_view_patients, adminRow.can_edit_patients], [false, false]);

    const adminView = await http("GET", `/api/patients/${pBranch2}/cases`, S.admin);
    same("د١. **والمسؤولُ يرى حتى مع أعلامٍ مُطفَأة على صفّه ⟶ ٢٠٠**", adminView.status, 200);
    const adminEdit = await http("PUT", `/api/patients/${pBranch2}`, S.admin,
      { medicalCondition: "عدّله المسؤول" });
    same("د٢. **ويعدّل كذلك ⟶ ٢٠٠**", adminEdit.status, 200);

    // ══ هـ. سريانُ التغيير فوراً — بلا خروجٍ وعودة ═══════════════════════
    console.log("\n── هـ. سريانُ التغيير بلا إعادة تسجيل دخول ──");
    const pLive = await mkPatient("مريضُ الاختبار الحيّ", 1);

    const before = await http("PUT", `/api/patients/${pLive}`, S.liveUser,
      { medicalCondition: "محاولةٌ أولى" });
    same("هـ١. **بادئ ذي بدء: العَلَمُ مُطفَأٌ في القاعدة ⟶ ٤٠٣**", before.status, 403);

    // نفسُ الجلسة (`S.liveUser`) بلا أيّ تعديل — القاعدةُ وحدها تتغيّر،
    // تماماً كما يفعل المسؤول من شاشة المستخدمين بينما المستخدم لا يزال
    // في جلسته الحالية.
    await setStoredFlags(LIVE_USER, { canView: true, canEdit: true });
    const after = await http("PUT", `/api/patients/${pLive}`, S.liveUser,
      { medicalCondition: "نجحت بعد تفعيل العَلَم" });
    same("هـ٢. **ونفسُ الجلسة بالضبط، فوراً بعد التفعيل ⟶ ٢٠٠ — بلا خروجٍ ولا دخول**",
      after.status, 200);
    const liveRowAfterOn = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pLive]))[0];
    same("هـ٣. **والتعديلُ نفذ فعلاً**", liveRowAfterOn?.medical_condition, "نجحت بعد تفعيل العَلَم");

    // والاتجاهُ المعاكس أيضاً — سحبُ الصلاحية يسري فوراً كذلك.
    await setStoredFlags(LIVE_USER, { canView: true, canEdit: false });
    const afterOff = await http("PUT", `/api/patients/${pLive}`, S.liveUser,
      { medicalCondition: "محاولةٌ بعد سحب الصلاحية" });
    same("هـ٤. **وسحبُ الصلاحية يسري فوراً أيضاً ⟶ ٤٠٣ من جديد، بنفس الجلسة**",
      afterOff.status, 403);
    const liveRowAfterOff = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pLive]))[0];
    same("هـ٥. **ولم يتغيّر شيء بعد السحب**",
      liveRowAfterOff?.medical_condition, "نجحت بعد تفعيل العَلَم");

    // ══ و. `canAddPatients` — بابٌ كان بلا أيّ فحصٍ إطلاقاً (POST) ═══════
    console.log("\n── و. POST /api/patients — canAddPatients لا الدور ──");
    const newPatientBody = (label: string, phone: string) => ({
      name: `${TOKEN} ${label}`, phone, age: "35", height: "170", weight: "72",
      medicalCondition: "x", referralSource: MARK, branchId: 1,
      patientClassification: "new",
    });

    const beforeCreateCount = (await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patients WHERE name = $1`,
      [`${TOKEN} محاولةُ مديرٍ`]))[0].n;
    const createDenied = await http("POST", "/api/patients", S.mgrNo,
      newPatientBody("محاولةُ مديرٍ", "07711111101"));
    same("و١. **مديرُ فرعٍ بلا canAddPatients مخزَّنة ⟶ ٤٠٣** رغم دوره",
      createDenied.status, 403);
    const afterCreateCount = (await q<{ n: number }>(
      `SELECT COUNT(*)::int n FROM patients WHERE name = $1`,
      [`${TOKEN} محاولةُ مديرٍ`]))[0].n;
    same("و٢. **ولا مريضَ نشأ فعلاً**", afterCreateCount, beforeCreateCount);
    same("   (كان صفراً قبل المحاولة أيضاً)", beforeCreateCount, 0);

    const createAllowed = await http("POST", "/api/patients", S.receptionYes,
      newPatientBody("مريضُ الاستقبال", "07711111102"));
    check(createAllowed.status === 200 || createAllowed.status === 201,
      "و٣. **واستقبالٌ بـ canAddPatients=true مخزَّنة ⟶ ٢٠٠/٢٠١**", String(createAllowed.status));
    const createdRow = await q<{ id: number }>(
      `SELECT id FROM patients WHERE name = $1`, [`${TOKEN} مريضُ الاستقبال`]);
    same("و٤. **والمريضُ نشأ فعلاً في القاعدة**", createdRow.length, 1);

    // ══ ز. `canViewPatients` على الأبواب الأساسية الثلاثة (لا `/cases` فقط) ═
    console.log("\n── ز. canViewPatients على GET /api/patients و/registry و/:id ──");
    const listDenied = await http("GET", "/api/patients", S.mgrNo);
    same("ز١. **مديرُ فرعٍ بلا canViewPatients ⟶ ٤٠٣ على القائمة الأساسية**",
      listDenied.status, 403);
    const registryDenied = await http("GET", "/api/patients/registry?pageSize=5", S.mgrNo);
    same("ز٢. **وعلى السجلّ المُرقَّم كذلك ⟶ ٤٠٣**", registryDenied.status, 403);
    const detailsDenied = await http("GET", `/api/patients/${pBranch1}`, S.mgrNo);
    same("ز٣. **وعلى ملفّ مريضٍ بعينه ⟶ ٤٠٣**", detailsDenied.status, 403);

    const listAllowed = await http("GET", "/api/patients", S.receptionYes);
    same("ز٤. **واستقبالٌ بالعَلَم ⟶ ٢٠٠ على القائمة الأساسية**", listAllowed.status, 200);
    check(Array.isArray(listAllowed.body) && listAllowed.body.some((p: any) => p.id === pBranch1),
      "ز٥. **ومريضُ فرعه ظاهرٌ فيها فعلاً**", JSON.stringify(listAllowed.body?.slice(0, 2)));
    const registryAllowed = await http("GET", "/api/patients/registry?pageSize=200", S.receptionYes);
    same("ز٦. **وعلى السجلّ المُرقَّم ⟶ ٢٠٠**", registryAllowed.status, 200);
    check(Array.isArray(registryAllowed.body?.rows)
      && registryAllowed.body.rows.some((r: any) => r.id === pBranch1),
      "ز٧. **ومريضُ فرعه ظاهرٌ في صفوفه**");
    const detailsAllowed = await http("GET", `/api/patients/${pBranch1}`, S.receptionYes);
    same("ز٨. **وعلى ملفّه بعينه ⟶ ٢٠٠**", detailsAllowed.status, 200);
    same("   (نفسُ الهوية)", detailsAllowed.body?.id, pBranch1);

    // ══ ح. `canViewPayments` — دفعاتٌ لا تصل بلا صلاحية، والمريضُ يبقى مرئياً ═
    console.log("\n── ح. canViewPayments مستقلّةٌ عن canViewPatients ──");
    const pPay = await mkPatient("مريضٌ له دفعة", 1);
    await mkPayment(pPay, 1, 250_000);

    const payBlindDetails = await http("GET", `/api/patients/${pPay}`, S.payBlind);
    same("ح١. **`canViewPatients=true, canViewPayments=false` ⟶ الملفُّ يُقرأ (٢٠٠)**",
      payBlindDetails.status, 200);
    check(payBlindDetails.body?.payments === undefined,
      "ح٢. **لكن بلا حقل `payments` إطلاقاً — لا صفٌّ فارغ ولا صفرٌ زائف**",
      JSON.stringify(payBlindDetails.body?.payments));
    same("ح٣. **وبقيّة الملفّ حاضرة** (الاسم ظاهرٌ رغم حجب المال)",
      typeof payBlindDetails.body?.name, "string");

    const payVisibleDetails = await http("GET", `/api/patients/${pPay}`, S.receptionYes);
    same("ح٤. **ومَن يملك `canViewPayments=true` ⟶ ٢٠٠ مع الحقل**",
      payVisibleDetails.status, 200);
    check(Array.isArray(payVisibleDetails.body?.payments) && payVisibleDetails.body.payments.length === 1,
      "ح٥. **وفيه الدفعةُ الحقيقية بعينها**", JSON.stringify(payVisibleDetails.body?.payments));
    same("ح٦. **بالمبلغ الصحيح**", payVisibleDetails.body?.payments?.[0]?.amount, 250_000);

    // نفسُ الفصل بين العَلَمين على القائمة الأساسية.
    const payBlindList = await http("GET", "/api/patients", S.payBlind);
    const payBlindListEntry = payBlindList.body?.find((p: any) => p.id === pPay);
    check(!!payBlindListEntry, "ح٧. تمهيد: المريضُ ظاهرٌ في قائمة مَن لا يرى الدفعات أيضاً");
    check(payBlindListEntry?.payments === undefined,
      "ح٨. **وفي القائمة الأساسية أيضاً بلا حقل `payments`**",
      JSON.stringify(payBlindListEntry?.payments));

    // وعلى السجلّ المُرقَّم — `totalPaid` تُحذَف لا تُصفَّر.
    //  **البحثُ بالتسمية الفريدة لهذا المريض بعينه** — لا بـ`TOKEN` المشترك
    //  بين كلّ مرضى هذا الملفّ — كي يُحسَم صفٌّ واحدٌ فقط بلا اعتمادٍ على
    //  ترتيب الصفحة الافتراضيّ أو حجمها.
    const payRegistrySearch = encodeURIComponent("مريضٌ له دفعة");
    const payBlindRegistry = await http(
      "GET", `/api/patients/registry?search=${payRegistrySearch}&pageSize=50`, S.payBlind);
    const payBlindRegRow = payBlindRegistry.body?.rows?.find((r: any) => r.id === pPay);
    check(!!payBlindRegRow, "ح٩. تمهيد: صفُّه ظاهرٌ في السجلّ المُرقَّم", JSON.stringify(payBlindRegistry.body));
    check(payBlindRegRow?.totalPaid === undefined,
      "ح١٠. **`totalPaid` محذوفةٌ من صفّه — لا `0` قد يُقرأ «لم يدفع شيئاً»**",
      JSON.stringify(payBlindRegRow?.totalPaid));
    const payVisibleRegistry = await http(
      "GET", `/api/patients/registry?search=${payRegistrySearch}&pageSize=50`, S.receptionYes);
    const payVisibleRegRow = payVisibleRegistry.body?.rows?.find((r: any) => r.id === pPay);
    same("ح١١. **ومَن يملك العَلَم يرى `totalPaid` الصحيح**", payVisibleRegRow?.totalPaid, 250_000);

    // ══ ط. `canViewReports` — كانت محجوبةً في الواجهة فقط ═════════════════
    console.log("\n── ط. canViewReports على تقريرٍ عامّ وإحصاءٍ عامّ ممثِّلَين ──");
    const reportDenied = await http("GET", "/api/reports/detailed/1", S.mgrNo);
    same("ط١. **مديرُ فرعٍ بلا canViewReports ⟶ ٤٠٣ على التقرير التفصيليّ**",
      reportDenied.status, 403);
    const statsDenied = await http("GET", "/api/statistics/visits-by-treatment", S.mgrNo);
    same("ط٢. **وعلى الإحصاء العامّ كذلك ⟶ ٤٠٣**", statsDenied.status, 403);

    const reportAllowed = await http("GET", "/api/reports/detailed/1", S.receptionYes);
    same("ط٣. **واستقبالٌ بالعَلَم ⟶ ٢٠٠ على التقرير التفصيليّ**", reportAllowed.status, 200);
    const statsAllowed = await http("GET", "/api/statistics/visits-by-treatment", S.receptionYes);
    same("ط٤. **وعلى الإحصاء العامّ ⟶ ٢٠٠**", statsAllowed.status, 200);

    // ══ ي. تحصينُ القراءة الحيّة — صفٌّ مفقود أو معطَّل لا يستمرّ بصلاحياتٍ
    // قديمة، وعطلُ قاعدةٍ حقيقيّ لا يُفوَّض بمنحةٍ مخبَّأة ══════════════════
    console.log("\n── ي. تحصينُ المِعترِضة الحيّة: صفٌّ معطَّل أو مفقود ──");
    const [inactiveRow] = await q<{ can_view_patients: boolean; is_active: boolean }>(
      `SELECT can_view_patients, is_active FROM system_users WHERE id=$1`, [INACTIVE_USER]);
    same("   تمهيد: صفُّ الحساب المعطَّل يحمل كلَّ الأعلام **مُشعَلة** فعلاً",
      [inactiveRow.can_view_patients, inactiveRow.is_active], [true, false]);

    const inactiveTry = await http("GET", `/api/patients/${pBranch1}/cases`, S.inactiveUser);
    same("ي١. **حسابٌ معطَّلٌ بأعلامٍ مُشعَلة كلِّها ⟶ ٤٠١ لا ٢٠٠**", inactiveTry.status, 401);
    check(typeof inactiveTry.body?.message === "string" && inactiveTry.body.message.length > 0,
      "ي٢. **برسالةٍ عربيةٍ حقيقية — لا ردّاً فارغاً**", JSON.stringify(inactiveTry.body));
    const inactiveWriteTry = await http("PUT", `/api/patients/${pBranch1}`, S.inactiveUser,
      { medicalCondition: "محاولةُ حسابٍ معطَّل" });
    same("ي٣. **ولا تمرّ كتابةٌ منه أيضاً ⟶ ٤٠١**", inactiveWriteTry.status, 401);

    const missingTry = await http("GET", `/api/patients/${pBranch1}/cases`, S.missingUser);
    same("ي٤. **معرّفُ مستخدمٍ لا صفَّ له في `system_users` إطلاقاً ⟶ ٤٠١**",
      missingTry.status, 401);
    check(typeof missingTry.body?.message === "string" && missingTry.body.message.length > 0,
      "ي٥. **برسالةٍ عربيةٍ حقيقية أيضاً**", JSON.stringify(missingTry.body));

    // والمسؤولُ العام — بلا `userId` حقيقيّ في مسار كودِ الدخول القديم، أو
    // ببساطة `isAdmin=true` — لا يمرّ بهذا الفحص إطلاقاً مهما كان صفّه.
    const adminStillFine = await http("GET", `/api/patients/${pBranch1}/cases`, S.admin);
    same("ي٦. **والمسؤولُ العام غيرُ مُتأثِّرٍ بهذا التحصين إطلاقاً ⟶ ٢٠٠**",
      adminStillFine.status, 200);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
