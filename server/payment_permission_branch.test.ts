// **إصلاحٌ إنتاجيّ ضيّق** — الخادمُ يفرض صلاحيةَ إضافة الدفعات ونطاقَ
// الفرع على `POST /api/payments`، بدل الاكتفاء بإخفاء الزرّ في الواجهة.
// حيّاً على Postgres وعلى النقطة الحقيقية. `npm run test:payment-guard`.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// النقطةُ كانت محميّةً بـ`isAuthenticated` فقط — أيّ حسابٍ داخلَ جلسةٍ صحيحة
// كان يستطيع فتحها مباشرةً (تجاوز زرّ الواجهة المخفيّ) ولو كان `canAddPayments`
// مُطفَأً صراحةً على صفّه، أو كان `branchId` المُرسَل في الجسم فرعاً لا يصل
// إليه صاحبُ الجلسة أصلاً.
//
// وما يُثبته هنا:
//   • مسؤولٌ يمرّ دائماً، وحتى عبر فروعٍ متعدّدة.
//   • مديرُ الفرع يمرّ في فرعه، ويُردّ خارجه.
//   • استقبالٌ يحمل `canAddPayments=true` يمرّ (المسارُ الافتراضيّ المألوف).
//   • استقبالٌ أُطفئ له العَلَم صراحةً ⟶ ٤٠٣ **ولا صفَّ دفعةٍ يُكتب**.
//   • حسابٌ بلا `canAddPayments` إطلاقاً (مجرّد جلسةٍ صحيحة) ⟶ ٤٠٣ كذلك —
//     الدخولُ وحده لا يكفي.
//   • استقبالُ فرعٍ آخر يحاول دفعةً لمريض فرعٍ غير فرعه ⟶ ٤٠٣ **ولا كتابة**.
//   • و`branchId` المُرسَل من العميل **لا سلطة له وحده**: طلبٌ صالحٌ يحمل
//     فرعاً مزوَّراً في جسمه يُكتب بفرع المريض الحقيقيّ، لا بالمُرسَل.
//   • وحارسُ سلّة المرضى (٠٦٨) باقٍ كما هو: دفعةٌ لمريضٍ في السلّة تُرَدّ.

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "./db";
import { registerRoutes } from "./routes";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══ تحكّمُ تصحيح الدفعات — احمِ المال، لا الجلسات التشغيلية (2026-08-29) ═
// ملحقٌ إلى ملفّ صلاحية الدفعات القائم (نفسُ الجدول والمستخدمون
// والمساعدات، بلا تكرار): يثبت أنّ حقول الدفعة المحمية (المبلغ · التاريخ
// الماليّ · نوع العلاج المدفوع · علم الجلسات المجانية · الحذف) تمرّ الآن
// عبر تصحيحٍ موثَّق — مباشرٌ للمسؤول العام، معلَّقٌ لغيره — بينما الملاحظات
// وعددُ الجلسات يبقيان فوريَّين بلا أثرٍ على القيد. ويثبت أنّ محرّر/حذف
// الزيارة صار عملياً صرفاً: لا يمسّ الكلفة ولا الدفعة ولا القيد أبداً.

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

const PORT = 6864;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-صلاحية-الدفعات";
const ADMIN = 9991, MGR = 9992, RECV_OK = 9993, RECV_DENIED = 9994,
  RECV_B2 = 9995, NOPERM = 9996;
const USERS = [ADMIN, MGR, RECV_OK, RECV_DENIED, RECV_B2, NOPERM];

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    //  canEditPayments/canDeletePayments مضافتان لهذا الملحق — جلسةُ
    //  دخولٍ حقيقية للمسؤول تحمل adminPermissions الكاملة (getPermissions
    //  تُرجع session.permissions حرفياً إن وُجدت، بصرف النظر عن isAdmin)،
    //  وهذا الكائنُ لقطةٌ عن تلك الجلسة لا اختصاراً لها.
    permissions: { canViewPatients: true, canAddPayments: true, canEditPayments: true, canDeletePayments: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير بغداد",
    //  canEditPayments/canDeletePayments مضافتان لهذا الملحق — مديرُ الفرع
    //  طالبُ تصحيحٍ لا معتمِداً (القسم د وما بعده). لا تُغيِّران شيئاً في
    //  فحوص القسمين أ/ب أعلاه (لا تلمسان POST /api/payments إطلاقاً).
    permissions: { canViewPatients: true, canAddPayments: true, canEditPayments: true, canDeletePayments: true },
  },
  recvOk: {
    userId: RECV_OK, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPayments: true, canEditPayments: true, canDeletePayments: true },
  },
  //  **العَلَمُ مُطفَأٌ صراحةً** — لا مجرّد غياب. هذا هو الحسابُ الذي كان
  //  يمرّ من النقطة قبل هذا الإصلاح.
  recvDenied: {
    userId: RECV_DENIED, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبالٌ محظور",
    permissions: { canViewPatients: true, canAddPayments: false },
  },
  //  استقبالُ الفرع الثاني — الدورُ يصحّ، النطاقُ لا.
  recvB2: {
    userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استقبالُ الفرع الثاني",
    permissions: { canViewPatients: true, canAddPayments: true, canEditPayments: true, canDeletePayments: true },
  },
  //  **جلسةٌ صحيحةٌ بلا `canAddPayments` إطلاقاً** — لا دورَ إداريّاً ولا
  //  علماً صريحاً. يثبت أن الدخول وحده لا يمنح شيئاً.
  noPerm: {
    userId: NOPERM, role: "surveyor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مسّاحٌ بلا صلاحية",
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

const createdPatientIds: number[] = [];

async function mkPatient(label: string, branch: number, cost = 1_000_000): Promise<number> {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, branch_id, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','ألم',$3,$4,'new')
     RETURNING id`,
    [`${MARK} ${label}`, MARK, branch, cost]);
  createdPatientIds.push(r[0].id);
  return r[0].id;
}

const pay = (patientId: number, branchId: number, session: any, amount = 10000) =>
  http("POST", "/api/payments", session, { patientId, branchId, amount });

const del = (id: number, session: any, reason: any = "طلب المالك") =>
  http("DELETE", `/api/patients/${id}`, session, { reason });

const paymentCount = async (patientId: number) => (await q<{ n: number }>(
  `SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [patientId]))[0].n;

// ══ مساعداتُ الملحق — تصحيح الدفعات ═════════════════════════════════════

const patchPayment = (id: number, session: any, body: any) =>
  http("PATCH", `/api/payments/${id}`, session, body);
const patchSessionInfo = (id: number, session: any, body: any) =>
  http("PATCH", `/api/payments/${id}/session-info`, session, body);
const deletePaymentHttp = (id: number, session: any, reason: string) =>
  http("DELETE", `/api/payments/${id}`, session, { reason });
const approveCorrectionHttp = (id: number, session: any) =>
  http("POST", `/api/admin/payment-corrections/${id}/approve`, session, {});
const rejectCorrectionHttp = (id: number, session: any) =>
  http("POST", `/api/admin/payment-corrections/${id}/reject`, session, {});

/**
 * قيدٌ محاسبيٌّ صالحٌ (رأسٌ + سطران متوازنان) لدفعةٍ خام — يُستدعى من
 * `mkPaymentRaw` كي تبدأ الدفعةُ بنفس الحقيقة التي كانت ستحملها لو مرّت
 * بـ `POST /api/payments` الحقيقية (`createJournalForPayment`).
 */
async function mkJournalForPayment(paymentId: number, branchId: number, amount: number): Promise<void> {
  if (!(amount > 0)) return;
  const [cash] = await q<{ id: number }>(
    `SELECT id FROM chart_of_accounts WHERE branch_id=$1 AND account_type='asset' AND account_code LIKE '1111%' LIMIT 1`,
    [branchId]);
  const [rev] = await q<{ id: number }>(`SELECT id FROM chart_of_accounts WHERE account_code='4900' LIMIT 1`);
  const [entry] = await q<{ id: number }>(
    `INSERT INTO journal_entries (entry_number, entry_date, branch_id, description, source_type, source_id, total_amount, status)
     VALUES ($1, CURRENT_DATE, $2, 'قيدُ اختبار', 'payment', $3, $4, 'posted') RETURNING id`,
    [`JE-TEST-${paymentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, branchId, paymentId, amount]);
  await q(
    `INSERT INTO journal_lines (entry_id, account_id, branch_id, debit, credit, line_order)
     VALUES ($1,$2,$3,$4,0,1)`, [entry.id, cash.id, branchId, amount]);
  await q(
    `INSERT INTO journal_lines (entry_id, account_id, branch_id, debit, credit, line_order)
     VALUES ($1,$2,$3,0,$4,2)`, [entry.id, rev.id, branchId, amount]);
}

/**
 * دفعةٌ خام تحت السيطرة الكاملة — لا عبر POST /api/payments. تحمل قيدها
 * المحاسبيّ الصحيح تلقائياً (`amount > 0`) تماماً كما لو مرّت بالنقطة
 * الحقيقية — فحوصُ عكس/إعادة بناء القيد تبدأ من حالةٍ واقعية.
 */
async function mkPaymentRaw(opts: {
  patientId: number; branchId: number; amount: number;
  paymentTreatmentType?: string | null; sessionCount?: number | null;
  notes?: string | null; isFreeSessions?: boolean; deviceEpisodeId?: number | null;
  caseId?: number | null; visitId?: number | null;
}): Promise<number> {
  const r = await q<{ id: number }>(
    `INSERT INTO payments (patient_id, branch_id, amount, payment_treatment_type,
       session_count, notes, is_free_sessions, device_episode_id, case_id, visit_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [opts.patientId, opts.branchId, opts.amount, opts.paymentTreatmentType ?? null,
      opts.sessionCount ?? null, opts.notes ?? "دفعة اختبار", opts.isFreeSessions ?? false,
      opts.deviceEpisodeId ?? null, opts.caseId ?? null, opts.visitId ?? null]);
  await mkJournalForPayment(r[0].id, opts.branchId, opts.amount);
  return r[0].id;
}

/** حالةٌ + حلقةُ جهازٍ مسلَّمة، ودفعةٌ تخصّها — لاختبار حارس إسناد الجهاز. */
async function mkDeviceLinkedPayment(patientId: number, branchId: number, tag: string, amount = 50000) {
  const [c] = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, case_type) VALUES ($1,'prosthetic') RETURNING id`, [patientId]);
  const [ep] = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes
       (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, requested_item)
     VALUES ($1,$2,$3,1,'delivered',100000,'full_device') RETURNING id`,
    [patientId, c.id, branchId]);
  const paymentId = await mkPaymentRaw({
    patientId, branchId, amount, paymentTreatmentType: tag, deviceEpisodeId: ep.id, caseId: c.id,
  });
  return { paymentId, episodeId: ep.id, caseId: c.id };
}

async function getPayment(id: number) {
  const r = await q<any>(`SELECT * FROM payments WHERE id=$1`, [id]);
  return r[0] ?? null;
}
async function pendingFcrFor(paymentId: number) {
  const r = await q<any>(
    `SELECT * FROM financial_correction_requests WHERE target_type='payment' AND target_id=$1 AND status='pending'`,
    [paymentId]);
  return r[0] ?? null;
}
async function fcrCountFor(paymentId: number, status?: string) {
  const r = status
    ? await q<{ n: number }>(`SELECT count(*)::int n FROM financial_correction_requests WHERE target_type='payment' AND target_id=$1 AND status=$2`, [paymentId, status])
    : await q<{ n: number }>(`SELECT count(*)::int n FROM financial_correction_requests WHERE target_type='payment' AND target_id=$1`, [paymentId]);
  return r[0].n;
}
/**
 * كلُّ قيود الدفعة — الأصليّ **وأيُّ عاكسٍ ولده**. العاكسُ يحمل
 * `source_type='reversal'` و`source_id = <رقم القيد الأصليّ>` — لا رقم
 * الدفعة (نفسُ عقد `reverseJournalEntryTx`/`reverseJournalEntry`
 * التاريخيّة) — فالبحث بخطوتين لا بشرطٍ واحد.
 */
async function journalFor(paymentId: number) {
  const direct = await q<any>(
    `SELECT * FROM journal_entries WHERE source_type='payment' AND source_id=$1`, [paymentId]);
  const ids = direct.map((d: any) => d.id);
  const reversals = ids.length > 0
    ? await q<any>(`SELECT * FROM journal_entries WHERE source_type='reversal' AND source_id = ANY($1::int[])`, [ids])
    : [];
  return [...direct, ...reversals].sort((a: any, b: any) => a.id - b.id);
}

/** زيارةٌ خام تحت السيطرة الكاملة — لا عبر POST /api/visits. */
async function mkVisitRaw(opts: {
  patientId: number; branchId: number; cost?: number | null; visitId?: number | null;
}): Promise<number> {
  const r = await q<{ id: number }>(
    `INSERT INTO visits (patient_id, branch_id, details, notes, treatment_type, session_count, cost)
     VALUES ($1,$2,'تفصيل اختبار','ملاحظة اختبار','روبوت',3,$3) RETURNING id`,
    [opts.patientId, opts.branchId, opts.cost ?? 0]);
  return r[0].id;
}
async function getVisit(id: number) {
  const r = await q<any>(`SELECT * FROM visits WHERE id=$1`, [id]);
  return r[0] ?? null;
}
const patchVisit = (id: number, session: any, body: any) =>
  http("PATCH", `/api/visits/${id}`, session, body);
const deleteVisitHttp = (id: number, session: any) =>
  http("DELETE", `/api/visits/${id}`, session);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  //  **كلُّ سطرِ تدقيقٍ كتبه مستخدمو الاختبار** — لا سطورَ المريض وحدها:
  //  إنشاءُ الدفعة يكتب `audit_log.user_id`، وFK يمنع حذف `system_users`
  //  ما دام سطرٌ يشير إليها.
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
  // طلباتُ التصحيح المالي (ترحيل ٠٧١) — قبل الدفعات (لا مفتاح بينهما، لكن
  // ترتيبٌ آمن)، وبعدها القفلُ الحقيقي: الحلقات قبل الحالات، والدفعات قبل
  // الحلقات (تشير الدفعةُ إلى الحلقة).
  await q(`DELETE FROM financial_correction_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch] of [
    [ADMIN, "admin", "المسؤول", 1],
    [MGR, "branch_manager", "مدير بغداد", 1],
    [RECV_OK, "reception", "ريام", 1],
    [RECV_DENIED, "reception", "استقبالٌ محظور", 1],
    [RECV_B2, "reception", "استقبالُ الفرع الثاني", 2],
    [NOPERM, "surveyor", "مسّاحٌ بلا صلاحية", 1],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,$5,'[1,2]'::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `pay_guard_u${id}`, role, name, branch]);
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

    // ══ أ. الصلاحية — مَن يملك إضافة دفعة ═══════════════════════════════
    console.log("\n── أ. صلاحيةُ إضافة الدفعة ──");
    {
      const pid = await mkPatient("مريضُ الصلاحية", 1);

      const r1 = await pay(pid, 1, S.admin);
      same("أ١. المسؤولُ يمرّ دائماً", r1.status, 201);

      const r2 = await pay(pid, 1, S.mgr);
      same("أ٢. مديرُ الفرع يمرّ في فرعه", r2.status, 201);

      const r3 = await pay(pid, 1, S.recvOk);
      same("أ٣. استقبالٌ بـ`canAddPayments=true` يمرّ — المسارُ الافتراضيّ", r3.status, 201);

      const before4 = await paymentCount(pid);
      const r4 = await pay(pid, 1, S.recvDenied);
      same("أ٤. **استقبالٌ أُطفئ له العَلَمُ صراحةً ⟶ ٤٠٣**", r4.status, 403);
      same("أ٥. ورسالةٌ واضحة", r4.body?.message, "ليس لديك صلاحية لإضافة دفعات");
      same("أ٦. **ولا صفَّ دفعةٍ كُتب**", await paymentCount(pid), before4);

      const before7 = await paymentCount(pid);
      const r7 = await pay(pid, 1, S.noPerm);
      same("أ٧. **جلسةٌ صحيحةٌ بلا `canAddPayments` إطلاقاً ⟶ ٤٠٣**", r7.status, 403);
      same("أ٨. **الدخولُ وحده لا يكفي — ولا كتابة**", await paymentCount(pid), before7);
    }

    // ══ ب. نطاقُ الفرع ═══════════════════════════════════════════════════
    console.log("\n── ب. نطاقُ الفرع ──");
    {
      const pidBranch1 = await mkPatient("مريضُ الفرع الأول", 1);
      const pidBranch2 = await mkPatient("مريضُ الفرع الثاني", 2);

      const rCross = await pay(pidBranch2, 2, S.admin);
      same("ب١. **والمسؤولُ يحتفظ بسلطته عبر الفروع**", rCross.status, 201);

      const rMgrOut = await pay(pidBranch2, 2, S.mgr);
      same("ب٢. **ومديرُ الفرع خارج فرعه ⟶ ٤٠٣**", rMgrOut.status, 403);
      same("ب٣. رسالةٌ صريحة", rMgrOut.body?.message, "غير مصرح لك بهذا الفرع");

      const before4 = await paymentCount(pidBranch1);
      const r4 = await pay(pidBranch1, 1, S.recvB2);
      same("ب٤. **واستقبالُ فرعٍ آخر لا يستطيع تصنيع طلبٍ يعبر الفرع ⟶ ٤٠٣**", r4.status, 403);
      same("ب٥. **ولا كتابة**", await paymentCount(pidBranch1), before4);

      //  ══ **والفرعُ المرسَل من العميل لا سلطة له وحده** ══════════════════
      //  استقبالُ الفرع الأول يرسل دفعةً لمريضه هو، لكن بجسمٍ يحمل
      //  `branchId: 2` مزوَّراً — الطلبُ يمرّ (المريضُ والفرعُ الحقيقيّان
      //  ضمن نطاق صاحب الجلسة)، **لكنّ الصفَّ المكتوب يحمل فرع المريض
      //  الحقيقيّ لا الرقمَ المُرسَل**.
      const rSpoof = await pay(pidBranch1, 2 /* مزوَّر */, S.recvOk);
      same("ب٦. **وطلبٌ ببرانش مزوَّر ضمن نطاق المريض الحقيقيّ يمرّ**", rSpoof.status, 201);
      same("ب٧. **لكنّ الصفَّ المكتوب يحمل فرع المريض الحقيقيّ (١) لا المُرسَل (٢)**",
        rSpoof.body?.branchId, 1);
      const [writtenRow] = await q<{ branch_id: number }>(
        `SELECT branch_id FROM payments WHERE id=$1`, [rSpoof.body?.id]);
      same("ب٨. **ومطابَقٌ في القاعدة كذلك**", writtenRow?.branch_id, 1);
    }

    // ══ ج. حارسُ سلّة المرضى (٠٦٨) باقٍ كما هو ═══════════════════════════
    console.log("\n── ج. حارسُ سلّة المرضى ──");
    {
      const pid = await mkPatient("مريضٌ سيُحذف", 1);
      const delRes = await del(pid, S.admin, "اختبار حارس الدفعات");
      same("ج١. الحذفُ الناعم ينجح تمهيداً", delRes.status, 200);

      const before = await paymentCount(pid);
      const r = await pay(pid, 1, S.recvOk);
      same("ج٢. **ودفعةٌ لملفٍّ في السلّة تُرَدّ** — لا «غير موجود»", r.status, 409);
      same("ج٣. **ولا صفَّ دفعةٍ يُكتب على المحذوف**", await paymentCount(pid), before);
    }

    // ══ د. المباشر مقابل المحمي — الملاحظات وعددُ الجلسات فوريّان دائماً ══
    console.log("\n── د. مباشرٌ مقابل محميّ — الملاحظات وعددُ الجلسات ──");
    {
      const pid = await mkPatient("مريضُ التصنيف المباشر", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 20000, notes: "قبل" });
      const journalBefore = await journalFor(paymentId);
      check(journalBefore.length === 1 && journalBefore[0].status === "posted",
        "د٠. تمهيد: القيدُ الأصليّ للدفعة قائم", JSON.stringify(journalBefore));

      const created = await pay(pid, 1, S.recvOk, 15000);
      same("د١. إنشاءُ دفعةٍ جديدة يبقى فورياً (٢٠١)", created.status, 201);

      const r2 = await patchPayment(paymentId, S.recvOk, { notes: "بعد" });
      same("د٢. تعديلُ الملاحظات وحدها فوريّ (٢٠٠ لا ٢٠٢)", r2.status, 200);
      const afterNotes = await getPayment(paymentId);
      same("د٣. والملاحظةُ تغيّرت فعلاً", afterNotes.notes, "بعد");
      same("د٤. **ولا صفَّ تصحيحٍ نشأ**", await fcrCountFor(paymentId), 0);

      const r3 = await patchPayment(paymentId, S.recvOk, { sessionCount: 7 });
      same("د٥. تعديلُ عدد الجلسات وحده فوريّ", r3.status, 200);
      const afterSession = await getPayment(paymentId);
      same("د٦. والعددُ تغيّر فعلاً", afterSession.session_count, 7);
      same("د٧. **ولا صفَّ تصحيحٍ نشأ**", await fcrCountFor(paymentId), 0);
      const journalAfter = await journalFor(paymentId);
      same("د٨. **ولا إعادةَ بناء قيد** — نفسُ عدد القيود", journalAfter.length, 1);
      same("د٩. ونفسُ رقم القيد بعينه", journalAfter[0].id, journalBefore[0].id);
      same("د١٠. وحالتُه لا تزال posted", journalAfter[0].status, "posted");
    }

    // ══ هـ. تغييراتٌ محمية فردية — غيرُ المسؤول ⟶ ٢٠٢، وبلا تغيير ══════════
    console.log("\n── هـ. تغييراتٌ محمية فردية — ٢٠٢ وبلا تغيير حتى الاعتماد ──");
    {
      const pid = await mkPatient("مريضُ التغييرات المحمية", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 30000, paymentTreatmentType: "علاج طبيعي" });
      const before = await getPayment(paymentId);

      const rAmt = await patchPayment(paymentId, S.recvOk, { amount: 99999, reason: "تصحيح تجريبي" });
      same("هـ١. تغييرُ المبلغ من غير مسؤول ⟶ ٢٠٢", rAmt.status, 202);
      const afterAmt = await getPayment(paymentId);
      same("هـ٢. **والدفعةُ لم تتغيّر**", afterAmt.amount, before.amount);
      const fcrAmt = await pendingFcrFor(paymentId);
      check(!!fcrAmt, "هـ٣. **وطلبُ تصحيحٍ معلَّقٌ نشأ**");
      await rejectCorrectionHttp(fcrAmt.id, S.admin);

      const rDate = await patchPayment(paymentId, S.recvOk, { customDate: "2020-01-01", reason: "تصحيح تاريخ" });
      same("هـ٤. تغييرُ التاريخ الماليّ ⟶ ٢٠٢", rDate.status, 202);
      const afterDate = await getPayment(paymentId);
      same("هـ٥. **ويبقى التاريخُ غير مطبَّق**",
        new Date(afterDate.date).toISOString(), new Date(before.date).toISOString());
      const fcrDate = await pendingFcrFor(paymentId);
      check(!!fcrDate, "هـ٦. وطلبٌ معلَّقٌ للتاريخ نشأ");
      await rejectCorrectionHttp(fcrDate.id, S.admin);

      const rType = await patchPayment(paymentId, S.recvOk, { paymentTreatmentType: "أبر صينية", reason: "تصحيح نوع" });
      same("هـ٧. تغييرُ نوع العلاج المدفوع ⟶ ٢٠٢", rType.status, 202);
      const afterType = await getPayment(paymentId);
      same("هـ٨. **ويبقى النوعُ القديم**", afterType.payment_treatment_type, before.payment_treatment_type);
      const fcrType = await pendingFcrFor(paymentId);
      check(!!fcrType, "هـ٩. وطلبٌ معلَّقٌ للنوع نشأ");
      await rejectCorrectionHttp(fcrType.id, S.admin);

      const rFree = await patchPayment(paymentId, S.recvOk, { isFreeSessions: true, reason: "تصحيح علم" });
      same("هـ١٠. تغييرُ علم الجلسات المجانية ⟶ ٢٠٢", rFree.status, 202);
      const afterFree = await getPayment(paymentId);
      same("هـ١١. **ويبقى العلمُ كما كان**", afterFree.is_free_sessions, before.is_free_sessions);
      const fcrFree = await pendingFcrFor(paymentId);
      check(!!fcrFree, "هـ١٢. وطلبٌ معلَّقٌ للعلم نشأ");
      await rejectCorrectionHttp(fcrFree.id, S.admin);
    }

    // ══ و. الحذفُ من غير مسؤول ⟶ ٢٠٢، والدفعةُ باقية ═══════════════════════
    console.log("\n── و. حذفٌ من غير مسؤول ⟶ ٢٠٢، والدفعةُ باقية ──");
    {
      const pid = await mkPatient("مريضُ حذفٍ معلَّق", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 40000 });
      const rDel = await deletePaymentHttp(paymentId, S.recvOk, "حذفٌ تجريبي");
      same("و١. حذفٌ من غير مسؤول ⟶ ٢٠٢", rDel.status, 202);
      const still = await getPayment(paymentId);
      check(!!still, "و٢. **والدفعةُ ما تزال موجودة**");
      const fcr = await pendingFcrFor(paymentId);
      check(!!fcr && fcr.action === "delete", "و٣. وطلبُ حذفٍ معلَّقٌ نشأ بالفعل الصحيح", JSON.stringify(fcr));
      if (fcr) await rejectCorrectionHttp(fcr.id, S.admin);
    }

    // ══ ز. مديرُ الفرع طالبٌ لا معتمِدٌ أبداً ═══════════════════════════════
    console.log("\n── ز. مديرُ الفرع يقدّم طلباً ولا يعتمد ولا يرفض ──");
    {
      const pid = await mkPatient("مريضُ طلبِ المدير", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 25000 });
      const rMgr = await patchPayment(paymentId, S.mgr, { amount: 26000, reason: "طلب مدير" });
      same("ز١. مديرُ الفرع يقدّم طلباً (٢٠٢)", rMgr.status, 202);
      const fcr = await pendingFcrFor(paymentId);
      check(!!fcr, "ز٢. وطلبٌ معلَّقٌ نشأ");

      const rApprove = await approveCorrectionHttp(fcr.id, S.mgr);
      same("ز٣. **ومديرُ الفرع لا يستطيع الاعتماد ⟶ ٤٠٣**", rApprove.status, 403);
      const rReject = await rejectCorrectionHttp(fcr.id, S.mgr);
      same("ز٤. **ولا الرفض ⟶ ٤٠٣**", rReject.status, 403);

      const stillPending = await pendingFcrFor(paymentId);
      check(!!stillPending, "ز٥. والطلبُ يبقى معلَّقاً كما هو");
      await rejectCorrectionHttp(fcr.id, S.admin);
    }

    // ══ ح. عبورُ الفرع يُردّ ٤٠٣ بلا صفّ طلب ════════════════════════════════
    console.log("\n── ح. تعديلٌ/حذفٌ عابرٌ للفرع ⟶ ٤٠٣ بلا صفّ طلب ──");
    {
      const pid = await mkPatient("مريضُ فرعٍ آخر", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 33000 });

      const rEdit = await patchPayment(paymentId, S.recvB2, { amount: 34000, reason: "محاولة عبور" });
      same("ح١. تعديلٌ من استقبال الفرع الثاني على دفعة الفرع الأول ⟶ ٤٠٣", rEdit.status, 403);
      same("ح٢. **ولا صفَّ طلبٍ نشأ**", await fcrCountFor(paymentId), 0);
      const afterEdit = await getPayment(paymentId);
      same("ح٣. **والدفعةُ لم تتغيّر**", afterEdit.amount, 33000);

      const rDel = await deletePaymentHttp(paymentId, S.recvB2, "محاولة عبور حذف");
      same("ح٤. حذفٌ من استقبال الفرع الثاني على دفعة الفرع الأول ⟶ ٤٠٣", rDel.status, 403);
      same("ح٥. **ولا صفَّ طلبٍ نشأ من الحذف أيضاً**", await fcrCountFor(paymentId), 0);
      const stillThere = await getPayment(paymentId);
      check(!!stillThere, "ح٦. والدفعةُ ما تزال موجودة");
    }

    // ══ ط. طلبٌ معلَّقٌ ثانٍ على الدفعة نفسها ⟶ ٤٠٩ ═════════════════════════
    console.log("\n── ط. طلبٌ معلَّقٌ ثانٍ على الدفعة نفسها ⟶ ٤٠٩ ──");
    {
      const pid = await mkPatient("مريضُ الطلب المكرَّر", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 22000 });
      const r1 = await patchPayment(paymentId, S.recvOk, { amount: 23000, reason: "أوّل" });
      same("ط١. الطلبُ الأوّل ⟶ ٢٠٢", r1.status, 202);
      const r2 = await patchPayment(paymentId, S.recvOk, { amount: 24000, reason: "ثانٍ" });
      same("ط٢. **والطلبُ الثاني على نفس الدفعة ⟶ ٤٠٩**", r2.status, 409);
      same("ط٣. **وطلبٌ معلَّقٌ واحدٌ فقط**", await fcrCountFor(paymentId, "pending"), 1);
      const fcr = await pendingFcrFor(paymentId);
      if (fcr) await rejectCorrectionHttp(fcr.id, S.admin);
    }

    // ══ ي. المسؤولُ العامّ يصحّح مباشرةً بلا طلب ════════════════════════════
    console.log("\n── ي. المسؤولُ العامّ يصحّح مباشرةً بلا طلب ──");
    {
      const pid = await mkPatient("مريضُ التصحيح المباشر", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 12000 });
      const rAdmin = await patchPayment(paymentId, S.admin, { amount: 15000, reason: "تصحيح مباشر" });
      same("ي١. تصحيحٌ مباشرٌ من المسؤول ⟶ ٢٠٠ لا ٢٠٢", rAdmin.status, 200);
      const after = await getPayment(paymentId);
      same("ي٢. **والدفعةُ تغيّرت فوراً**", after.amount, 15000);
      same("ي٣. **ولا صفَّ طلبٍ نشأ إطلاقاً**", await fcrCountFor(paymentId), 0);
    }

    // ══ ك. الاعتمادُ يُطبَّق مرّةً واحدة ويعيد بناء القيد ═══════════════════
    console.log("\n── ك. الاعتمادُ يُطبَّق مرّةً واحدة ويعيد بناء القيد ──");
    {
      const pid = await mkPatient("مريضُ الاعتماد", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 10000, paymentTreatmentType: "علاج طبيعي" });
      const before = await getPayment(paymentId);
      const journalBefore = await journalFor(paymentId);
      same("ك٠. تمهيد: قيدٌ أصليٌّ واحد قائم", journalBefore.length, 1);

      const rReq = await patchPayment(paymentId, S.recvOk, {
        amount: 40000, customDate: "2026-02-02", paymentTreatmentType: "روبوت", isFreeSessions: false,
        reason: "تصحيحٌ شامل",
      });
      same("ك١. الطلبُ الشامل ⟶ ٢٠٢", rReq.status, 202);
      const fcr = await pendingFcrFor(paymentId);
      check(!!fcr, "ك٢. وطلبٌ معلَّقٌ نشأ");

      const rApprove = await approveCorrectionHttp(fcr.id, S.admin);
      same("ك٣. اعتمادُ المسؤول ⟶ ٢٠٠", rApprove.status, 200);
      const after = await getPayment(paymentId);
      same("ك٤. **المبلغُ صار النهائي**", after.amount, 40000);
      check(new Date(after.date).getTime() !== new Date(before.date).getTime(),
        "ك٥. **والتاريخُ الماليّ تغيّر فعلاً إلى المطلوب**");
      same("ك٦. **والنوعُ صار النهائي**", after.payment_treatment_type, "روبوت");

      // ثلاثةُ قيودٍ الآن: الأصليُّ (صار reversed) · عاكسُه (source_type=
      // 'reversal') · وقيدٌ جديد بالمبلغ النهائيّ (source_type='payment'
      // كالأصليّ، لكن بمعرّفٍ آخر) — «عكسٌ ثم تطبيقٌ ثم قيدٌ جديد» حرفياً.
      const journalAfter = await journalFor(paymentId);
      same("ك٧. **ثلاثةُ قيودٍ الآن**: الأصليُّ وعاكسُه والجديد", journalAfter.length, 3);
      const original = journalAfter.find((j: any) => j.id === journalBefore[0].id);
      same("ك٨. الأصليُّ صار reversed", original?.status, "reversed");
      const reversal = journalAfter.find((j: any) => j.source_type === "reversal");
      check(!!reversal, "ك٩. وقيدٌ عاكسٌ (source_type=reversal) نشأ");
      const fresh = journalAfter.find((j: any) => j.source_type === "payment" && j.id !== journalBefore[0].id);
      same("ك١٠. **والقيدُ الجديدُ posted**", fresh?.status, "posted");
      same("ك١١. **وبمبلغه النهائيّ**", fresh?.total_amount, 40000);

      const rApproveAgain = await approveCorrectionHttp(fcr.id, S.admin);
      same("ك١٢. **إعادةُ الاعتماد لا تُطبَّق مرّتين ⟶ ٤٠٩**", rApproveAgain.status, 409);
      const journalAfterAgain = await journalFor(paymentId);
      same("ك١٣. **وما تزال ثلاثةُ قيودٍ فقط** — لا كتابةَ رابعة", journalAfterAgain.length, 3);
    }

    // ══ ل. الرفضُ لا يغيّر الدفعة ولا القيد ══════════════════════════════════
    console.log("\n── ل. الرفضُ لا يغيّر الدفعة ولا القيد ──");
    {
      const pid = await mkPatient("مريضُ الرفض", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 18000 });
      const before = await getPayment(paymentId);
      const journalBefore = await journalFor(paymentId);

      const rReq = await patchPayment(paymentId, S.recvOk, { amount: 99000, reason: "طلبٌ سيُرفض" });
      same("ل١. الطلبُ ⟶ ٢٠٢", rReq.status, 202);
      const fcr = await pendingFcrFor(paymentId);

      const rReject = await rejectCorrectionHttp(fcr.id, S.admin);
      same("ل٢. الرفضُ ⟶ ٢٠٠", rReject.status, 200);
      const after = await getPayment(paymentId);
      same("ل٣. **والدفعةُ لم تتغيّر**", after.amount, before.amount);
      const journalAfter = await journalFor(paymentId);
      same("ل٤. **والقيدُ لم يتغيّر**", journalAfter.length, journalBefore.length);
      same("ل٥. وحالتُه كما كانت", journalAfter[0]?.status, journalBefore[0]?.status);

      const [row] = await q<any>(`SELECT status FROM financial_correction_requests WHERE id=$1`, [fcr.id]);
      same("ل٦. وحالةُ الطلب صارت rejected", row.status, "rejected");
    }

    // ══ م. اعتمادٌ بائتٌ ⟶ ٤٠٩ بلا تغيير ═════════════════════════════════════
    console.log("\n── م. اعتمادٌ بائتٌ ⟶ ٤٠٩ بلا تغيير ──");
    {
      const pid = await mkPatient("مريضُ الاعتماد البائت", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 21000 });

      const rReq = await patchPayment(paymentId, S.recvOk, { amount: 21500, reason: "طلبٌ سيبيت" });
      same("م١. الطلبُ ⟶ ٢٠٢", rReq.status, 202);
      const fcr = await pendingFcrFor(paymentId);

      // تحرّكٌ مباشرٌ آخر من المسؤول على الدفعة نفسها بعد تقديم الطلب —
      // يجعل لقطتَه بائتة.
      const rAdminDirect = await patchPayment(paymentId, S.admin, { amount: 77777, reason: "تحرّكٌ آخر قبل الاعتماد" });
      same("م٢. تمهيد: تصحيحٌ مباشرٌ آخر نجح", rAdminDirect.status, 200);

      const rApprove = await approveCorrectionHttp(fcr.id, S.admin);
      same("م٣. **اعتمادُ الطلب البائت ⟶ ٤٠٩**", rApprove.status, 409);
      const after = await getPayment(paymentId);
      same("م٤. **والدفعةُ تبقى على قيمة التصحيح المباشر — لا قيمة الطلب البائت**", after.amount, 77777);
      const [row] = await q<any>(`SELECT status FROM financial_correction_requests WHERE id=$1`, [fcr.id]);
      same("م٥. **وحالةُ الطلب تبقى pending**", row.status, "pending");
      await rejectCorrectionHttp(fcr.id, S.admin);
    }

    // ══ ن. إعادةُ وسمٍ متعارضة على دفعةٍ مرتبطةٍ بجهاز تُرفَض ═══════════════
    console.log("\n── ن. إعادةُ وسمٍ متعارضة على دفعةٍ مرتبطةٍ بجهاز تُرفَض ──");
    {
      const pid = await mkPatient("مريضُ دفعةِ جهاز", 1);
      const { paymentId } = await mkDeviceLinkedPayment(pid, 1, "أطراف صناعية");
      const before = await getPayment(paymentId);

      const rConflict = await patchPayment(paymentId, S.recvOk, {
        paymentTreatmentType: "مساند طبية", reason: "محاولةُ إعادة وسمٍ متعارضة",
      });
      same("ن١. إعادةُ الوسم إلى خدمةٍ أخرى ⟶ ٤٠٩", rConflict.status, 409);
      const after = await getPayment(paymentId);
      same("ن٢. **والوسمُ لم يتغيّر**", after.payment_treatment_type, before.payment_treatment_type);
      same("ن٣. **ولا صفَّ طلبٍ نشأ**", await fcrCountFor(paymentId), 0);
    }

    // ══ س. حذفُ المسؤول العام يعكس القيد ويحذف الدفعة ═══════════════════════
    console.log("\n── س. حذفُ المسؤول العام يعكس القيد ويحذف الدفعة ──");
    {
      const pid = await mkPatient("مريضُ حذفِ المسؤول", 1);
      const paymentId = await mkPaymentRaw({ patientId: pid, branchId: 1, amount: 16000 });
      const journalBefore = await journalFor(paymentId);
      same("س٠. تمهيد: قيدٌ أصليّ قائم", journalBefore.length, 1);

      const rDel = await deletePaymentHttp(paymentId, S.admin, "حذفٌ مباشرٌ من المسؤول");
      same("س١. حذفُ المسؤول العام ⟶ ٢٠٠ مباشرةً", rDel.status, 200);
      const gone = await getPayment(paymentId);
      check(!gone, "س٢. **والدفعةُ حُذفت فعلاً**");
      const journalAfter = await journalFor(paymentId);
      const original = journalAfter.find((j: any) => j.id === journalBefore[0].id);
      same("س٣. **والقيدُ الأصليّ عُكس (reversed)**", original?.status, "reversed");
      check(journalAfter.length === 2, "س٤. وقيدٌ عاكسٌ جديد نشأ", String(journalAfter.length));
    }

    // ══ ع. حذفُ الزيارة عمليٌّ صرف — بلا أثرٍ ماليّ إطلاقاً ══════════════════
    console.log("\n── ع. حذفُ الزيارة عمليٌّ صرف — بلا أثرٍ ماليّ إطلاقاً ──");
    {
      const pid1 = await mkPatient("مريضُ زيارةٍ حديثة", 1);
      const visitId1 = await mkVisitRaw({ patientId: pid1, branchId: 1, cost: 0 });
      const patientBefore1 = await q<any>(`SELECT total_cost FROM patients WHERE id=$1`, [pid1]);
      const rDel1 = await deleteVisitHttp(visitId1, S.admin);
      same("ع١. حذفُ زيارةٍ حديثةٍ بكلفة صفر ⟶ ٢٠٠", rDel1.status, 200);
      const visitAfter1 = await getVisit(visitId1);
      check(!!visitAfter1?.deleted_at, "ع٢. **والزيارةُ حُذفت ناعماً (deleted_at)**");
      const patientAfter1 = await q<any>(`SELECT total_cost FROM patients WHERE id=$1`, [pid1]);
      same("ع٣. **وكلفةُ المريض لم تتغيّر**", patientAfter1[0].total_cost, patientBefore1[0].total_cost);

      const pid2 = await mkPatient("مريضُ زيارةٍ تاريخية", 1);
      const visitId2 = await mkVisitRaw({ patientId: pid2, branchId: 1, cost: 50000 });
      const paymentId2 = await mkPaymentRaw({
        patientId: pid2, branchId: 1, amount: 50000, notes: "دفعة زيارة", visitId: visitId2,
      });
      await q(`UPDATE patients SET total_cost = total_cost + 50000 WHERE id = $1`, [pid2]);
      const [costEntry] = await q<{ id: number }>(
        `INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,$2,50000,'visit') RETURNING id`,
        [pid2, 1]);
      // ملحوظة: `mkPaymentRaw` أعلاه أنشأ قيداً محاسبياً واحداً بالفعل
      // لهذه الدفعة (amount=50000>0) — نفسُ الحقيقة التي كان سيحملها لو
      // مرّ بمسار «دفعة زيارة» الحقيقيّ قبل تصحيح ٤.ي.

      const patientBefore2 = await q<any>(`SELECT total_cost FROM patients WHERE id=$1`, [pid2]);
      const paymentBefore2 = await getPayment(paymentId2);
      const costEntryBefore = await q<any>(`SELECT * FROM cost_entries WHERE id=$1`, [costEntry.id]);
      const journalBefore2 = await journalFor(paymentId2);

      const rDel2 = await deleteVisitHttp(visitId2, S.admin);
      same("ع٤. حذفُ زيارةٍ تاريخيةٍ بكلفةٍ موجبة ودفعةٍ مرتبطة ⟶ ٢٠٠", rDel2.status, 200);
      const visitAfter2 = await getVisit(visitId2);
      check(!!visitAfter2?.deleted_at, "ع٥. **والزيارةُ حُذفت ناعماً**");

      const patientAfter2 = await q<any>(`SELECT total_cost FROM patients WHERE id=$1`, [pid2]);
      same("ع٦. **وكلفةُ المريض بايتاً بايت كما كانت**", patientAfter2[0].total_cost, patientBefore2[0].total_cost);
      const paymentAfter2 = await getPayment(paymentId2);
      check(!!paymentAfter2, "ع٧. ولم تُحذف الدفعةُ إطلاقاً");
      same("ع٨. **والدفعةُ بايتاً بايت كما كانت**", paymentAfter2?.amount, paymentBefore2.amount);
      const costEntryAfter = await q<any>(`SELECT * FROM cost_entries WHERE id=$1`, [costEntry.id]);
      check(!!costEntryAfter[0], "ع٩. ولم يُحذف قيدُ الكلفة");
      same("ع١٠. **وقيدُ الكلفة بايتاً بايت كما كان**", costEntryAfter[0]?.amount, costEntryBefore[0]?.amount);
      const journalAfter2 = await journalFor(paymentId2);
      same("ع١١. **والقيدُ المحاسبيّ بايتاً بايت — نفسُ الحالة**", journalAfter2[0]?.status, journalBefore2[0]?.status);
      same("ع١٢. ونفسُ المبلغ", journalAfter2[0]?.total_amount, journalBefore2[0]?.total_amount);
    }

    // ══ ف. الكلفةُ غيرُ قابلةٍ للتغيير من محرّر الزيارة ═════════════════════
    console.log("\n── ف. الكلفةُ غيرُ قابلةٍ للتغيير من محرّر الزيارة ──");
    {
      const pid = await mkPatient("مريضُ كلفةٍ محمية", 1);
      const visitId = await mkVisitRaw({ patientId: pid, branchId: 1, cost: 30000 });
      const before = await getVisit(visitId);

      const rChange = await patchVisit(visitId, S.admin, { cost: 99999, details: "محاولة" });
      same("ف١. **محاولةُ تغيير الكلفة تُرَدّ قبل أيّ كتابة ⟶ ٤٠٠**", rChange.status, 400);
      const after1 = await getVisit(visitId);
      same("ف٢. **والزيارةُ لم تتغيّر إطلاقاً (حتى التفاصيل)**", after1.details, before.details);
      same("ف٣. والكلفةُ بقيت كما هي", after1.cost, before.cost);

      const rSame = await patchVisit(visitId, S.admin, { cost: 30000, details: "تعديلٌ مقبول" });
      same("ف٤. إعادةُ إرسال الكلفة نفسِها تمرّ (٢٠٠)", rSame.status, 200);
      const after2 = await getVisit(visitId);
      same("ف٥. والتفاصيلُ تحدّثت", after2.details, "تعديلٌ مقبول");
      same("ف٦. والكلفةُ ما تزال كما كانت", after2.cost, 30000);
    }

    // ══ ص. عقدُ الشاشة — قراءةٌ نصّية بلا خادم ═══════════════════════════════
    console.log("\n── ص. عقدُ الشاشة (قراءةٌ نصّية) ──");
    {
      const patientDetailsSrc = readFileSync(
        join(__dirname, "..", "client/src/pages/PatientDetails.tsx"), "utf8");
      const usePatientsSrc = readFileSync(
        join(__dirname, "..", "client/src/hooks/use-patients.ts"), "utf8");

      check(/سبب التصحيح/.test(patientDetailsSrc),
        "ص١. نافذةُ تعديل الدفعة تحمل تسمية «سبب التصحيح»");
      check(/paymentEditTouchesProtected/.test(patientDetailsSrc),
        "ص٢. وتشتقّ حقلاً محمياً فعلاً محلياً قبل إظهار/إلزام السبب");
      check(/res\.status === 202/.test(patientDetailsSrc) && /res\.status === 202/.test(usePatientsSrc),
        "ص٣. نافذةُ تعديل الدفعة وخطّافُ حذفها يميّزان استجابة ٢٠٢ عن النجاح المباشر");
      check(/سبب الحذف/.test(patientDetailsSrc),
        "ص٤. نافذةُ تأكيد حذف الدفعة تطلب سبباً");
      check(/إرسال الطلب/.test(patientDetailsSrc) && /أُرسل طلبُ حذف الدفعة/.test(usePatientsSrc),
        "ص٥. تسميةٌ صريحة لإرسال طلب حذفٍ (لا حذفٍ فوري) لغير المسؤول");
      check(!/سيتم حذف هذه الزيارة نهائياً ولا يمكن استرجاعها/.test(patientDetailsSrc),
        "ص٦. **زالت صياغةُ حذف الزيارة القديمة المضلِّلة من الشاشة**");
      check(/لا تُحذفان ولا تُعدَّلان/.test(patientDetailsSrc),
        "ص٧. **ونصُّ تأكيد حذف الزيارة الجديد يقول صراحةً إنّ الكلفة والدفعات لا تتغيّران**");
      check(!/وسُحبت كلفتها ودفعتها إن وُجدتا/.test(usePatientsSrc),
        "ص٨. **وتوستُ نجاح حذف الزيارة القديم (يدّعي سحب المال) اختفى**");
      check(/الكلفة والدفعات المرتبطة بها لم تتغيّر/.test(usePatientsSrc),
        "ص٩. **والتوستُ الجديد يقول صراحةً إنّ المال لم يتغيّر**");
    }

    // ══ ق. session-info — عمليّةٌ صرفة، عددُ الجلسات وحده ═══════════════════
    // متابعةُ تحكّم تصحيح الدفعات، القسم أ: إغلاقُ ثغرة إعادة الوسم القديمة.
    console.log("\n── ق. session-info لا يعيد وسم دفعةٍ بعد اليوم ──");
    {
      const pid = await mkPatient("مريضُ session-info", 1);
      const paymentId = await mkPaymentRaw({
        patientId: pid, branchId: 1, amount: 17000, paymentTreatmentType: "علاج طبيعي", sessionCount: 3,
      });
      const journalBefore = await journalFor(paymentId);
      same("ق٠. تمهيد: قيدٌ أصليّ واحد قائم", journalBefore.length, 1);

      // ١. تعديلُ عددِ الجلسات وحده — لا يمسّ paymentTreatmentType إطلاقاً،
      // حتى وهو غائبٌ تماماً عن الطلب.
      const r1 = await patchSessionInfo(paymentId, S.mgr, { sessionCount: 5 });
      same("ق١. sessionCount وحده ⟶ ٢٠٠", r1.status, 200);
      const after1 = await getPayment(paymentId);
      same("ق٢. **ونوعُ العلاج المدفوع بقي كما كان بالضبط**", after1.payment_treatment_type, "علاج طبيعي");
      same("ق٣. وعددُ الجلسات صار الجديد", after1.session_count, 5);

      // ٢. ولا صفَّ تصحيحٍ، ولا إعادةَ بناء قيد.
      same("ق٤. **ولا صفَّ تصحيحٍ نشأ**", await fcrCountFor(paymentId), 0);
      const journalAfter1 = await journalFor(paymentId);
      same("ق٥. **ولا إعادةَ بناء قيد** — نفسُ عدد القيود", journalAfter1.length, 1);
      same("ق٦. ونفسُ رقم القيد بعينه", journalAfter1[0].id, journalBefore[0].id);

      // ٣. قيمةٌ تتطابق مع المخزَّن بعد التطبيع (مسافاتٌ زائدة) — تُتجاهَل
      // بصمتٍ، لا تُرفَض ولا تُكتب.
      const r2 = await patchSessionInfo(paymentId, S.mgr, { sessionCount: 6, paymentTreatmentType: "  علاج طبيعي  " });
      same("ق٧. قيمةٌ مطابقةٌ بعد التطبيع تمرّ (٢٠٠ لا ٤٠٠)", r2.status, 200);
      const after2 = await getPayment(paymentId);
      same("ق٨. **والنوعُ يبقى بحرفه المخزَّن — لا النسخة ذات المسافات**", after2.payment_treatment_type, "علاج طبيعي");
      same("ق٩. وعددُ الجلسات تحدّث", after2.session_count, 6);

      // ٤. تغييرٌ فعليّ ⟶ يُرَدّ قبل أيّ كتابة.
      const r3 = await patchSessionInfo(paymentId, S.mgr, { sessionCount: 9, paymentTreatmentType: "أبر صينية" });
      same("ق١٠. **تغييرٌ فعليّ في نوع العلاج المدفوع ⟶ ٤٠٠**", r3.status, 400);
      const after3 = await getPayment(paymentId);
      same("ق١١. **ولا كتابةَ إطلاقاً — حتى عددُ الجلسات لم يتغيّر**", after3.session_count, 6);
      same("ق١٢. والنوعُ بقي كما كان", after3.payment_treatment_type, "علاج طبيعي");
      same("ق١٣. **ولا صفَّ تصحيحٍ من هذه المحاولة أيضاً**", await fcrCountFor(paymentId), 0);
    }

    // ══ ر. تصحيحٌ مباشرٌ من المسؤول لنوعٍ محميّ — caseId صحيحٌ ذرّياً ═══════
    console.log("\n── ر. تصحيحٌ مباشرٌ من المسؤول لنوعٍ محميّ — caseId صحيحٌ ذرّياً ──");
    {
      const pid = await mkPatient("مريضُ إعادة الإسناد المباشرة", 1);
      const [physioCase] = await q<{ id: number }>(
        `INSERT INTO patient_cases (patient_id, case_type) VALUES ($1,'physiotherapy') RETURNING id`, [pid]);
      const [prostheticCase] = await q<{ id: number }>(
        `INSERT INTO patient_cases (patient_id, case_type) VALUES ($1,'prosthetic') RETURNING id`, [pid]);
      const paymentId = await mkPaymentRaw({
        patientId: pid, branchId: 1, amount: 24000, paymentTreatmentType: "علاج طبيعي", caseId: physioCase.id,
      });
      const before = await getPayment(paymentId);
      same("ر٠. تمهيد: الدفعةُ على حالة العلاج الطبيعي", before.case_id, physioCase.id);

      const rAdmin = await patchPayment(paymentId, S.admin, {
        paymentTreatmentType: "أطراف صناعية", reason: "تصحيحُ وسمٍ إداريّ مباشر",
      });
      same("ر١. تصحيحٌ مباشرٌ للنوع ⟶ ٢٠٠", rAdmin.status, 200);
      // **بلا انتظار ولا إعادة محاولة** — إن لم يكن caseId صحيحاً فوراً هنا
      // فإعادةُ الإسناد لم تعد صارمةً/ذرّيةً كما تطلب المهمّة.
      const after = await getPayment(paymentId);
      same("ر٢. **والنوعُ صار النهائي**", after.payment_treatment_type, "أطراف صناعية");
      same("ر٣. **و`caseId` صار حالةَ الأطراف الصناعية فوراً — لا الفيزيو ولا NULL**",
        after.case_id, prostheticCase.id);
    }

    // ══ ش. اعتمادُ تصحيحٍ لنوعٍ محميّ — caseId صحيحٌ ذرّياً كذلك ═══════════
    console.log("\n── ش. اعتمادُ تصحيحٍ لنوعٍ محميّ — caseId صحيحٌ ذرّياً كذلك ──");
    {
      const pid = await mkPatient("مريضُ إعادة الإسناد بالاعتماد", 1);
      const [physioCase] = await q<{ id: number }>(
        `INSERT INTO patient_cases (patient_id, case_type) VALUES ($1,'physiotherapy') RETURNING id`, [pid]);
      const [supportCase] = await q<{ id: number }>(
        `INSERT INTO patient_cases (patient_id, case_type) VALUES ($1,'medical_support') RETURNING id`, [pid]);
      const paymentId = await mkPaymentRaw({
        patientId: pid, branchId: 1, amount: 19000, paymentTreatmentType: "علاج طبيعي", caseId: physioCase.id,
      });

      const rReq = await patchPayment(paymentId, S.recvOk, {
        paymentTreatmentType: "مساند طبية", reason: "طلبُ تصحيح وسمٍ",
      });
      same("ش١. طلبُ تصحيح النوع ⟶ ٢٠٢", rReq.status, 202);
      const fcr = await pendingFcrFor(paymentId);
      check(!!fcr, "ش٢. وطلبٌ معلَّقٌ نشأ");
      const beforeApprove = await getPayment(paymentId);
      same("ش٣. **وقبل الاعتماد لا شيء تغيّر — لا النوع ولا caseId**",
        JSON.stringify([beforeApprove.payment_treatment_type, beforeApprove.case_id]),
        JSON.stringify(["علاج طبيعي", physioCase.id]));

      const rApprove = await approveCorrectionHttp(fcr.id, S.admin);
      same("ش٤. الاعتمادُ ⟶ ٢٠٠", rApprove.status, 200);
      const after = await getPayment(paymentId);
      same("ش٥. **والنوعُ صار النهائي**", after.payment_treatment_type, "مساند طبية");
      same("ش٦. **و`caseId` صار حالةَ المساند الطبية فوراً بعد الاعتماد ذاتِه**",
        after.case_id, supportCase.id);
    }

    // ══ ت. عقدُ الملفّ — لا إعادةَ إسنادٍ بعديّةٍ، وisFreeSessions صريحٌ دائماً ═
    console.log("\n── ت. عقدُ الملفّ (قراءةٌ نصّية) ──");
    {
      const correctionStoreSrc = readFileSync(
        join(__dirname, "payments", "correction_store.ts"), "utf8");
      check(!/reattachIfTagChanged/.test(correctionStoreSrc),
        "ت١. **زال المسارُ البعديّ `reattachIfTagChanged` من الملفّ كليةً**");
      check(/reattachPaymentCase\(before\.id, before\.patientId, changed\.paymentTreatmentType, tx\)/.test(correctionStoreSrc),
        "ت٢. **وإعادةُ الإسناد تُنادى داخل `applyCorrectionWriteTx` بتمرير `tx` صراحةً**");

      const patientDetailsSrc = readFileSync(
        join(__dirname, "..", "client/src/pages/PatientDetails.tsx"), "utf8");
      check(!/editPaymentFreeSessions \|\| undefined/.test(patientDetailsSrc),
        "ت٣. **زال النمطُ القديم `editPaymentFreeSessions || undefined` الذي كان يُسقط false**");
      check(/isFreeSessions: editPaymentFreeSessions,/.test(patientDetailsSrc),
        "ت٤. **وصار يُرسَل بوليانَ الحالة صراحةً — true أو false على حدٍّ سواء**");
    }

    console.log(`\n${failures === 0 ? "✅ كل فحوص صلاحية الدفعات ونطاق الفرع نجحت"
      : `❌ ${failures} فشل`}\n`);
  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
    await new Promise((r) => setTimeout(r, 50));
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
