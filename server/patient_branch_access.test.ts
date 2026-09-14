// **إتاحةُ ملفّ المريض لفروعٍ إضافية** — حيّاً على Postgres وعلى النقاط
// الحقيقية. قاعدة محلّية: `npm run test:patient-branch-access`.
//
// ══ السيناريو الذي طلبه المالك ═══════════════════════════════════════════
//   دفعٌ قديمٌ في **كربلاء** ⟶ تُتاح الملفُّ لـ**ذي قار** ⟶ خدمةٌ جديدة في
//   ذي قار ⟶ **وحساباتُ كربلاء كما هي بالضبط**.
//
// وما يحرسه هذا الملفّ تحديداً:
//   • فرعُ التسجيل لا يتغيّر، ولا فرعُ دفعةٍ أو زيارةٍ أو كلفةٍ أو عمليةٍ سابقة.
//   • كلُّ حركةٍ جديدة تُنسَب للفرع الذي حدثت فيه.
//   • الفرعُ المضاف يرى الملفَّ كاملاً — أطرافٌ ومساندُ وعلاجٌ طبيعي.
//   • سؤالُ العملية المفتوحة: «لا» تُبقي كلَّ شيء · «نعم» تنقل المسؤولية،
//     وتخيّر بين إبقاء الخبير الحالي أو خبيرٍ من الفرع الجديد.
//   • و«نقل المريض» تقاعد.

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { join } from "path";
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

const PORT = 6914;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إتاحة-الفروع";
//  كربلاء = ٣ · ذي قار = ٤ — أرقامٌ لا تتقاطع مع فِكستشرات الملفّات الأخرى.
const KARBALA = 3, DHIQAR = 4;
const ADMIN = 9961, RECV_K = 9962, RECV_D = 9963, DOC = 9964;
const EXPERT_K = 9965, EXPERT_D = 9966;

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: KARBALA,
    accessibleBranches: [KARBALA, DHIQAR], displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true,
      canViewPayments: true, canManageAccounting: true },
  },
  karbala: {
    userId: RECV_K, role: "reception", isAdmin: false, branchId: KARBALA,
    accessibleBranches: [KARBALA], displayName: "استقبال كربلاء",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true,
      canViewPayments: true },
  },
  dhiqar: {
    userId: RECV_D, role: "reception", isAdmin: false, branchId: DHIQAR,
    accessibleBranches: [DHIQAR], displayName: "استقبال ذي قار",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true,
      canViewPayments: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: KARBALA,
    accessibleBranches: [KARBALA, DHIQAR], displayName: "الطبيب",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, sess: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(sess), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, branchId: number) {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,false,true,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r.id;
}
async function mkCase(patientId: number, branchId: number, caseType = "prosthetic") {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r.id;
}

/** مجاميعُ فرعٍ بعينه — «حساباتُ كربلاء» بالمعنى الحرفيّ. */
async function branchBooks(branchId: number) {
  const [p] = await q(`SELECT COALESCE(SUM(amount),0)::int n, COUNT(*)::int c
                         FROM payments WHERE branch_id=$1
                          AND patient_id IN (SELECT id FROM patients WHERE referral_source=$2)`,
    [branchId, MARK]);
  const [v] = await q(`SELECT COUNT(*)::int c FROM visits WHERE branch_id=$1
                        AND patient_id IN (SELECT id FROM patients WHERE referral_source=$2)`,
    [branchId, MARK]);
  const [ce] = await q(`SELECT COALESCE(SUM(amount),0)::int n, COUNT(*)::int c
                          FROM cost_entries WHERE branch_id=$1
                           AND patient_id IN (SELECT id FROM patients WHERE referral_source=$2)`,
    [branchId, MARK]);
  return { paid: p.n, payments: p.c, visits: v.c, costs: ce.n, costRows: ce.c };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const t of [
    `DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_events WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM pending_service_charge_events WHERE patient_id IN (${ids})`,
    `DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM journal_lines WHERE patient_id IN (${ids})`,
    `DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${RECV_K},${RECV_D},${DOC},${EXPERT_K},${EXPERT_D}]))`,
    `DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${RECV_K},${RECV_D},${DOC},${EXPERT_K},${EXPERT_D}])`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
    `DELETE FROM patient_code_aliases a WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`,
  ]) await q(t);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES ($1,'كربلاء') ON CONFLICT (id) DO NOTHING`, [KARBALA]);
  await q(`INSERT INTO branches (id,name) VALUES ($1,'ذي قار') ON CONFLICT (id) DO NOTHING`, [DHIQAR]);
  for (const [id, role, branchId, ids, name] of [
    [ADMIN, "admin", KARBALA, `[${KARBALA},${DHIQAR}]`, "المسؤول"],
    [RECV_K, "reception", KARBALA, `[${KARBALA}]`, "استقبال كربلاء"],
    [RECV_D, "reception", DHIQAR, `[${DHIQAR}]`, "استقبال ذي قار"],
    [DOC, "doctor", KARBALA, `[${KARBALA},${DHIQAR}]`, "الطبيب"],
    [EXPERT_K, "prosthetics_expert", KARBALA, `[${KARBALA}]`, "خبير كربلاء"],
    [EXPERT_D, "prosthetics_expert", DHIQAR, `[${DHIQAR}]`, "خبير ذي قار"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,
               ${role === "doctor" ? `'["prosthetic","medical_support"]'::jsonb` : "'null'::jsonb"})
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name, is_active=true`,
      [id, `pba_u${id}`, role, name, branchId, ids]);
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
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") {
      skipped++; return app;
    }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── أ. السيناريو: دفعٌ في كربلاء ⟶ إتاحةٌ لذي قار ⟶ خدمةٌ في ذي قار ──");
    // ═══════════════════════════════════════════════════════════════════
    const pid = await mkPatient("سيناريو-كربلاء-ذي-قار", KARBALA);
    await mkCase(pid, KARBALA, "physiotherapy");
    await q(`UPDATE patients SET total_cost = 500000 WHERE id=$1`, [pid]);

    //  ① دفعٌ قديمٌ في كربلاء — من موظّف كربلاء.
    const pay1 = await http("POST", "/api/payments", S.karbala, {
      patientId: pid, branchId: KARBALA, amount: 200000, paymentMethod: "cash",
      paymentTreatmentType: "علاج طبيعي", notes: "دفعة كربلاء",
    });
    same("١. الدفعةُ الأولى تُسجَّل في كربلاء", pay1.status < 300, true);
    const books0 = await branchBooks(KARBALA);
    same("٢. وحساباتُ كربلاء: ٢٠٠,٠٠٠ بدفعةٍ واحدة", [books0.paid, books0.payments], [200000, 1]);

    //  ② قبل الإتاحة: ذي قار **لا ترى الملفّ إطلاقاً**.
    //  **والنقطةُ تردّ ٤٠٤ لا ٤٠٣ لمن لا يصل الملفّ** — سلوكٌ قائم قبل هذه
    //  المرحلة ولم يُمَسّ: «ليس في سجلّك» لا «موجودٌ وممنوع».
    const before = await http("GET", `/api/patients/${pid}/cases`, S.dhiqar);
    check(before.status !== 200,
      "٣. **وقبل الإتاحة ذي قار لا تصل الملفّ**", String(before.status));
    const regBefore = await http("GET", "/api/patients/registry?pageSize=200", S.dhiqar);
    check(!(regBefore.body?.patients ?? regBefore.body?.rows ?? [])
      .some((p: any) => Number(p.id) === pid),
      "٤. ولا يظهر في سجلّ مرضى ذي قار");

    //  ③ الإتاحة — من المسؤول العام.
    const grant = await http("POST", `/api/patients/${pid}/branch-access`, S.admin,
      { branchId: DHIQAR });
    same("٥. **المسؤولُ يتيح الملفَّ لذي قار**", grant.status, 201);
    const [pat] = await q(`SELECT branch_id FROM patients WHERE id=$1`, [pid]);
    same("٦. **وفرعُ التسجيل كما هو — كربلاء**", Number(pat.branch_id), KARBALA);

    //  ④ وذي قار ترى الملفَّ كاملاً.
    const after = await http("GET", `/api/patients/${pid}/cases`, S.dhiqar);
    same("٧. **وبعدها ذي قار تصل الملفّ**", after.status, 200);
    const regAfter = await http("GET", "/api/patients/registry?pageSize=200", S.dhiqar);
    check((regAfter.body?.patients ?? regAfter.body?.rows ?? [])
      .some((p: any) => Number(p.id) === pid),
      "٨. ويظهر في سجلّ مرضى ذي قار", JSON.stringify(regAfter.body).slice(0, 200));

    //  ⑤ خدمةٌ جديدة في ذي قار.
    const svc = await http("POST", `/api/patients/${pid}/new-service`, S.dhiqar, {
      serviceType: "consultation", serviceCost: 50000, notes: "استشارة ذي قار",
      //  **مبلغٌ موجبٌ إلزاميّ** لخدمةٍ بكلفة — قاعدةٌ قائمة لا علاقةَ لها
      //  بالإتاحة؛ تُحترَم كما هي.
      initialPayment: 50000,
    });
    same("٩. **وخدمةٌ جديدة تُسجَّل من ذي قار بنجاح**", svc.status < 300, true,
      JSON.stringify(svc.body));

    //  **والفرعُ في جسم الطلب لا سلطةَ له**: يُرسَل كربلاء عمداً، والخادمُ
    //  يشتقّ فرعَ الحركة من جلسة الموظّف — فتُقيَّد في ذي قار.
    const pay2 = await http("POST", "/api/payments", S.dhiqar, {
      patientId: pid, branchId: KARBALA, amount: 50000, paymentMethod: "cash",
      paymentTreatmentType: "استشارة", notes: "دفعة ذي قار",
    });
    same("١٠. ودفعتُها كذلك", pay2.status < 300, true, JSON.stringify(pay2.body));
    const [p2row] = await q(`SELECT branch_id FROM payments WHERE patient_id=$1
                              AND notes='دفعة ذي قار'`, [pid]);
    same("١٠-ب. **والفرعُ من الجلسة لا من جسم الطلب** — أُرسل كربلاء وقُيِّد في ذي قار",
      Number(p2row.branch_id), DHIQAR);

    //  ⑥ **والحاسم**: حساباتُ كربلاء كما هي، وحركةُ ذي قار في ذي قار.
    const booksK = await branchBooks(KARBALA);
    const booksD = await branchBooks(DHIQAR);
    same("١١. **حساباتُ كربلاء كما هي بالضبط** — ٢٠٠,٠٠٠ بدفعةٍ واحدة، بلا زيادةٍ ولا نقصان",
      [booksK.paid, booksK.payments], [books0.paid, books0.payments]);
    check(booksD.paid === 100000 && booksD.payments === 2,
      "١٢. **وحركةُ ذي قار كلُّها في ذي قار** — دفعةُ الخدمة ودفعةُ الاستشارة",
      JSON.stringify(booksD));
    check(booksD.costs > 0 && booksD.costRows > 0,
      "١٣. **وقيدُ كلفة الخدمة الجديدة في ذي قار أيضاً**",
      JSON.stringify(booksD));
    same("١٤. **ولا قيدَ كلفةٍ جديدٍ في كربلاء**", booksK.costRows, books0.costRows);

    //  ⑦ ولا صفَّ تاريخيّ تغيّر فرعُه.
    const [oldPay] = await q(`SELECT branch_id FROM payments
                               WHERE patient_id=$1 AND notes='دفعة كربلاء'`, [pid]);
    same("١٥. **ودفعةُ كربلاء ما زالت في كربلاء** — لا يُعاد كتابةُ تاريخ",
      Number(oldPay.branch_id), KARBALA);
    const [physioCase] = await q(`SELECT branch_id FROM patient_cases
                                   WHERE patient_id=$1 AND case_type='physiotherapy'`, [pid]);
    same("١٦. **وخيطُ العلاج الطبيعي ما زال بفرعه**", Number(physioCase.branch_id), KARBALA);

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ب. «نقل المريض» تقاعد ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const t = await http("POST", `/api/patients/${pid}/transfer`, S.admin, { branchId: DHIQAR });
      same("١٧. **البابُ القديم يردّ ٤٠٩ ويدلّ على البديل**", t.status, 409);
      check(String(t.body?.message ?? "").includes("branch-access"),
        "    ورسالتُه تسمّي البابَ الصحيح", String(t.body?.message));
      const [still] = await q(`SELECT branch_id FROM patients WHERE id=$1`, [pid]);
      same("١٨. **ولم يتغيّر فرعُ التسجيل**", Number(still.branch_id), KARBALA);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ج. الصلاحية — المسؤولُ العام وحده يمنح ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const p2 = await mkPatient("صلاحية", KARBALA);
      await mkCase(p2, KARBALA);
      for (const [who, sess] of [["استقبال كربلاء", S.karbala], ["استقبال ذي قار", S.dhiqar],
        ["الطبيب", S.doc]] as any[]) {
        const r = await http("POST", `/api/patients/${p2}/branch-access`, sess,
          { branchId: DHIQAR });
        same(`١٩. ${who} يُردّ ٤٠٣`, r.status, 403);
      }
      const rows = await q(`SELECT COUNT(*)::int c FROM patient_branch_access WHERE patient_id=$1`, [p2]);
      same("    وصفرُ كتابة", rows[0].c, 0);
      //  والمسؤولُ يمضي.
      same("٢٠. والمسؤولُ العام يمضي",
        (await http("POST", `/api/patients/${p2}/branch-access`, S.admin,
          { branchId: DHIQAR })).status, 201);
      //  وفرعُ التسجيل نفسُه لا يُمنَح.
      const home = await http("POST", `/api/patients/${p2}/branch-access`, S.admin,
        { branchId: KARBALA });
      same("٢١. **وفرعُ التسجيل نفسُه يُردّ** — لا إتاحةَ لمن يملك أصلاً", home.status, 400);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── د. العمليةُ المفتوحة — «لا» تُبقي كلَّ شيء ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const p3 = await mkPatient("عمليةٌ-مفتوحة-لا", KARBALA);
      const c3 = await mkCase(p3, KARBALA);
      const [ep] = await q(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, service_path, created_by)
         VALUES ($1,$2,$3,1,'in_manufacturing',0,'full_device','exam',$4) RETURNING id`,
        [p3, c3, KARBALA, ADMIN]);
      const [wo] = await q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
           purpose, status, current_stage, device_episode_id)
         VALUES ($1,$2,$3,'prosthetic','initial_build','active','order_received',$4) RETURNING id`,
        [p3, KARBALA, EXPERT_K, ep.id]);

      //  السؤالُ إلزاميّ.
      const silent = await http("POST", `/api/patients/${p3}/branch-access`, S.admin,
        { branchId: DHIQAR });
      same("٢٢. **صمتٌ عن سؤال العملية المفتوحة ⟶ ٤٠٠**", silent.status, 400);
      const [n0] = await q(`SELECT COUNT(*)::int c FROM patient_branch_access WHERE patient_id=$1`, [p3]);
      same("    وصفرُ كتابة", n0.c, 0);

      const no = await http("POST", `/api/patients/${p3}/branch-access`, S.admin,
        { branchId: DHIQAR, moveOpenOperations: false });
      same("٢٣. **و«لا» تُتيح الملفَّ فقط**", no.status, 201);
      const [epA] = await q(`SELECT branch_id FROM patient_device_episodes WHERE id=$1`, [ep.id]);
      const [woA] = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE id=$1`, [wo.id]);
      same("٢٤. **والعمليةُ وخبيرُها كما هما بالضبط**",
        [Number(epA.branch_id), Number(woA.branch_id), Number(woA.expert_user_id)],
        [KARBALA, KARBALA, EXPERT_K]);
      //  ومع ذلك ذي قار ترى الملفّ.
      same("٢٥. ومع ذلك ذي قار تصل الملفّ",
        (await http("GET", `/api/patients/${p3}/cases`, S.dhiqar)).status, 200);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. «نعم» — نقلُ المسؤولية، وخيارُ الخبير ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      //  ① إبقاءُ الخبير الحالي.
      const p4 = await mkPatient("نعم-إبقاءُ-الخبير", KARBALA);
      const c4 = await mkCase(p4, KARBALA);
      const [ep4] = await q(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, service_path, created_by)
         VALUES ($1,$2,$3,1,'in_manufacturing',0,'full_device','exam',$4) RETURNING id`,
        [p4, c4, KARBALA, ADMIN]);
      const [wo4] = await q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
           purpose, status, current_stage, device_episode_id)
         VALUES ($1,$2,$3,'prosthetic','initial_build','active','order_received',$4) RETURNING id`,
        [p4, KARBALA, EXPERT_K, ep4.id]);

      //  خيارُ الخبير إلزاميٌّ مع «نعم».
      const noChoice = await http("POST", `/api/patients/${p4}/branch-access`, S.admin,
        { branchId: DHIQAR, moveOpenOperations: true });
      same("٢٦. **«نعم» بلا قرارِ خبيرٍ ⟶ ٤٠٠**", noChoice.status, 400);

      const keep = await http("POST", `/api/patients/${p4}/branch-access`, S.admin,
        { branchId: DHIQAR, moveOpenOperations: true, keepExpert: true });
      same("٢٧. **«نعم» + إبقاءُ الخبير الحالي**", keep.status, 201);
      const [ep4A] = await q(`SELECT branch_id FROM patient_device_episodes WHERE id=$1`, [ep4.id]);
      const [wo4A] = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE id=$1`, [wo4.id]);
      same("٢٨. **المسؤوليةُ في ذي قار، والخبيرُ كما هو**",
        [Number(ep4A.branch_id), Number(wo4A.branch_id), Number(wo4A.expert_user_id)],
        [DHIQAR, DHIQAR, EXPERT_K]);

      //  ② خبيرٌ من الفرع الجديد.
      const p5 = await mkPatient("نعم-خبيرُ-الفرع-الجديد", KARBALA);
      const c5 = await mkCase(p5, KARBALA);
      const [ep5] = await q(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, service_path, created_by)
         VALUES ($1,$2,$3,1,'in_manufacturing',0,'full_device','exam',$4) RETURNING id`,
        [p5, c5, KARBALA, ADMIN]);
      const [wo5] = await q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
           purpose, status, current_stage, device_episode_id)
         VALUES ($1,$2,$3,'prosthetic','initial_build','active','order_received',$4) RETURNING id`,
        [p5, KARBALA, EXPERT_K, ep5.id]);

      //  وخبيرٌ من فرعٍ **آخر** يُردّ.
      const wrong = await http("POST", `/api/patients/${p5}/branch-access`, S.admin,
        { branchId: DHIQAR, moveOpenOperations: true, newExpertUserId: EXPERT_K });
      same("٢٩. **وخبيرٌ ليس من الفرع الجديد يُردّ ٤٠٠**", wrong.status, 400);
      const [wo5Mid] = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE id=$1`, [wo5.id]);
      same("    وصفرُ كتابة — العمليةُ كما هي",
        [Number(wo5Mid.branch_id), Number(wo5Mid.expert_user_id)], [KARBALA, EXPERT_K]);

      const ok = await http("POST", `/api/patients/${p5}/branch-access`, S.admin,
        { branchId: DHIQAR, moveOpenOperations: true, newExpertUserId: EXPERT_D });
      same("٣٠. **وخبيرُ الفرع الجديد يُقبل**", ok.status, 201);
      const [ep5A] = await q(`SELECT branch_id FROM patient_device_episodes WHERE id=$1`, [ep5.id]);
      const [wo5A] = await q(`SELECT branch_id, expert_user_id FROM prosthetic_work_orders WHERE id=$1`, [wo5.id]);
      same("٣١. **المسؤوليةُ والخبيرُ في ذي قار**",
        [Number(ep5A.branch_id), Number(wo5A.branch_id), Number(wo5A.expert_user_id)],
        [DHIQAR, DHIQAR, EXPERT_D]);
      const hist = await q(`SELECT notes FROM prosthetic_work_history
                             WHERE work_order_id=$1 ORDER BY id DESC LIMIT 1`, [wo5.id]);
      check(String(hist[0]?.notes ?? "").includes("نقل مسؤولية العملية"),
        "٣٢. **وسجلُّ الأمر يقول ما جرى**", String(hist[0]?.notes));
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── و. السحب · والأقسام الثلاثة · وحذفُ المريض الكامل ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      //  الأقسامُ الثلاثة: الملفُّ يُرى كاملاً بلا تفرقة.
      const [cases] = [await http("GET", `/api/patients/${pid}/cases`, S.dhiqar)];
      check(cases.status === 200 && Array.isArray(cases.body),
        "٣٣. **والفرعُ المضاف يرى الحالات كاملةً** — أطرافٌ ومساندُ وعلاجٌ طبيعي بلا تفرقة",
        JSON.stringify(cases.body).slice(0, 160));

      //  السحبُ لا يمسّ صفّاً تاريخياً.
      const booksKBefore = await branchBooks(KARBALA);
      const booksDBefore = await branchBooks(DHIQAR);
      const rev = await http("DELETE", `/api/patients/${pid}/branch-access/${DHIQAR}`, S.admin);
      same("٣٤. **والسحبُ ينجح**", rev.status, 200);
      same("٣٥. **ولم يتغيّر أيُّ صفٍّ ماليّ في الفرعين**",
        [await branchBooks(KARBALA), await branchBooks(DHIQAR)],
        [booksKBefore, booksDBefore]);
      check((await http("GET", `/api/patients/${pid}/cases`, S.dhiqar)).status !== 200,
        "٣٦. **وذي قار لم تعد تصل الملفّ**");

      //  **القاعدةُ الملزمة (CLAUDE.md §٨)**: حذفُ مريضٍ كامل يحمل صفَّ إتاحة.
      const p6 = await mkPatient("حذفٌ-كامل", KARBALA);
      await mkCase(p6, KARBALA);
      same("٣٧. الإعدادُ: إتاحةٌ على الملفّ",
        (await http("POST", `/api/patients/${p6}/branch-access`, S.admin,
          { branchId: DHIQAR })).status, 201);
      const { storage } = await import("./storage");
      await storage.deletePatient(p6);
      const [left] = await q(`SELECT COUNT(*)::int c FROM patient_branch_access WHERE patient_id=$1`, [p6]);
      const [gone] = await q(`SELECT COUNT(*)::int c FROM patients WHERE id=$1`, [p6]);
      same("٣٨. **وحذفُ المريض الكامل ينجح ويأخذ صفَّ الإتاحة معه**",
        [gone.c, left.c], [0, 0]);
    }

    // ═══════════════════════════════════════════════════════════════════
    console.log("\n── ز. عقدُ الشاشة ──");
    // ═══════════════════════════════════════════════════════════════════
    {
      const dlg = readFileSync(
        join(process.cwd(), "client/src/components/PatientBranchAccessDialog.tsx"), "utf8");
      check(dlg.includes("/branch-access"), "٣٩. النافذةُ تنادي النقطةَ الحقيقية");
      check(dlg.includes("moveOpenOperations") && dlg.includes("keepExpert")
        && dlg.includes("newExpertUserId"),
        "٤٠. وترسل قرارَ العملية المفتوحة وقرارَ الخبير");
      check(dlg.includes("لا يتغيّر فرع التسجيل"),
        "٤١. وتقول صراحةً إن فرعَ التسجيل وتاريخَه لا يتغيّران");
      const page = readFileSync(join(process.cwd(), "client/src/pages/PatientDetails.tsx"), "utf8");
      check(page.includes("PatientBranchAccessDialog"), "٤٢. وصفحةُ المريض تستعملها");
      check(!page.includes("transferMutation") && !page.includes("transferDialogOpen"),
        "٤٣. **ونافذةُ «نقل المريض» لم تعد في الصفحة**");
      const storageSrc = readFileSync(join(process.cwd(), "server/storage.ts"), "utf8");
      //  **يُقاس بتعريف الدالّة لا بذكر اسمها**: التعليقُ الذي يشرح إزالتها
      //  يسمّيها بالضرورة، فبحثُ النصّ المجرَّد كان سيُدين توثيقَ الإزالة نفسَه.
      check(!/async\s+transferPatientToBranch\s*\(/.test(storageSrc),
        "٤٤. **والكاتبُ الهادم `transferPatientToBranch` أُزيل** — لا يُنادى بالسهو");
      check(!/transferPatientToBranch\s*\(/.test(
        readFileSync(join(process.cwd(), "server/routes.ts"), "utf8")),
        "٤٤-ب. ولا نداءَ له في أيّ نقطة");
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, RECV_K, RECV_D, DOC, EXPERT_K, EXPERT_D]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV_K, RECV_D, DOC, EXPERT_K, EXPERT_D]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص إتاحة الفروع نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
