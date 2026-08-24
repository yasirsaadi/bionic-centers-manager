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
    permissions: { canViewPatients: true, canAddPayments: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير بغداد",
    permissions: { canViewPatients: true, canAddPayments: true },
  },
  recvOk: {
    userId: RECV_OK, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPayments: true },
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
    permissions: { canViewPatients: true, canAddPayments: true },
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

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  //  **كلُّ سطرِ تدقيقٍ كتبه مستخدمو الاختبار** — لا سطورَ المريض وحدها:
  //  إنشاءُ الدفعة يكتب `audit_log.user_id`، وFK يمنع حذف `system_users`
  //  ما دام سطرٌ يشير إليها.
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
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
