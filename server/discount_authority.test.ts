// §4.ar البند ٢٥ — **قرارُ المالك (٢٠٢٦-٠٩-٢٩، بعد تجربة يوم): لا قيدَ على خصم الاستقبال**.
// «حين ضغط الموظف تم الشراء ويحتاج كتابة السعر ثم مقدار الخصم ثم المدفوع فيحفظ، هنا يجب ان يفعلها بدون اذن…
//  لا اريد قيود كثيرة تربك العمل والموظف». قاعدة محلّية: `npm run test:discount-authority`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// استقبالٌ **بلا** مفتاح «اعتماد الخصومات» يخصم فوراً: تسعيرُ الجلسات · «خدمة جديدة» مجّانية · إتمامُ البيع (لا ٤٠٣).
// فلا يعود حارسٌ يمنعه بلا قرارٍ جديد من المالك. **وجلساتُ الدفع المجّانية** بقيت كما كانت قبل البند: المسؤول ومديرُ الفرع.
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
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6881;
const MARK = "اختبار-سلطة-الخصم";
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const RECV = 9961, RECV_OK = 9962, MGR = 9963;
const USERS = [RECV, RECV_OK, MGR];
const sess = (userId: number, role: string) => ({ userId, role, isAdmin: false, branchId: 1, accessibleBranches: [1],
  displayName: `موظف ${userId}`, permissions: {} });
const S = { recv: sess(RECV, "reception"), ok: sess(RECV_OK, "reception"), mgr: sess(MGR, "branch_manager") };
async function http(method: string, path: string, s: any, body?: any) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method, headers: { "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(s), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j: any = null; try { j = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: j };
}
let tok = 0;
const token = () => `da-${Date.now().toString(36)}-${++tok}`;

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source='${MARK}'`;
  for (const t of ["service_discount_requests", "journal_lines", "payments", "cost_entries", "visits", "patient_events",
    "patient_contacts", "patient_notification_deliveries", "patient_cases"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`).catch(() => {});
  }
  await q(`DELETE FROM patients WHERE referral_source='${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, disc] of [[RECV, "reception", false], [RECV_OK, "reception", true], [MGR, "branch_manager", false]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
               can_view_patients,can_add_patients,can_add_payments,can_approve_discount)
             VALUES ($1,$2,'x','موظف',$3,1,'[1]'::jsonb,true,true,true,true,$4)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true, can_approve_discount=EXCLUDED.can_approve_discount,
               can_view_patients=true, can_add_patients=true, can_add_payments=true`, [id, `da_u${id}`, role, disc]);
  }
  await cleanup();
  const mkP = async (name: string) => {
    const id = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
        is_physiotherapy, total_cost, patient_classification)
      VALUES ($1,'07700000000',$2,'40','physiotherapy',1,true,0,'new') RETURNING id`, [`${MARK} ${name}`, MARK]))[0].id);
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,'physiotherapy',0)`, [id]);
    return id;
  };
  const totalOf = async (p: number) => Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost);
  const discountsOf = async (p: number) => (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`, [p]))[0].n;

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    r.session.destroy = (cb: () => void) => cb();
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...a: any[]) =>
    (a.length === 1 && typeof a[0] === "function" && a[0].name === "session") ? app : realUse(...(a as [any]));
  const srv = createServer(app);
  await registerRoutes(srv, app);
  srv.listen(PORT);
  await new Promise((r) => srv.once("listening", r));

  const cut = { entries: [{ treatmentType: "روبوت", sessionCount: 10 }], discount: { finalPrice: 400000, reason: "negotiation" } };
  const freeService = () => ({
    serviceType: "additional_therapy", serviceCost: 25000, initialPayment: 0, submissionToken: token(),
    treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 25000 }],
    paymentTreatmentType: "أجهزة علاج طبيعي", sessionCount: 1,
    discount: { isFree: true, reason: "charity" },
  });
  try {
    console.log("\n── أ. تسعيرُ الجلسات ──");
    const p1 = await mkP("تسعير");
    const d1 = await http("POST", `/api/patients/${p1}/price-physio`, S.recv, cut);
    same("أ١. **استقبالٌ بلا مفتاح يخصم فوراً** — بلا إذن (قرارُ المالك)", [d1.status, await totalOf(p1), await discountsOf(p1)], [200, 400000, 1]);
    const p2 = await mkP("تسعير بالمفتاح");
    same("أ٣. **وبالمفتاح يمرّ الخصم**", [(await http("POST", `/api/patients/${p2}/price-physio`, S.ok, cut)).status, await totalOf(p2)], [200, 400000]);
    const p3 = await mkP("تسعير مدير");
    same("أ٤. ومديرُ الفرع كذلك", (await http("POST", `/api/patients/${p3}/price-physio`, S.mgr, cut)).status, 200);

    console.log("\n── ب. «خدمة جديدة» مجّانية ──");
    const p4 = await mkP("خدمة");
    const n1 = await http("POST", `/api/patients/${p4}/new-service`, S.recv, freeService());
    same("ب١. **«خدمة جديدة» مجّانية من استقبالٍ بلا مفتاح تمرّ**", [n1.status < 300, await discountsOf(p4)], [true, 1]);

    console.log("\n── ج. إتمامُ البيع بخصم ──");
    same("ج١. **إتمامُ البيع بخصمٍ من استقبالٍ بلا مفتاح لا يُردّ للسلطة** — يمضي إلى قراءة المتابعة (٤٠٤ هنا لأنها غير موجودة)",
      (await http("POST", `/api/followups/999999999/complete-sale`, S.recv, { originalPrice: 1000, discountAmount: 100 })).status, 404);

    console.log("\n── د. الجلساتُ المجّانية في نافذة الدفع ──");
    const p5 = await mkP("مجاني");
    const pay = async (s: any) => http("POST", "/api/payments", s, {
      patientId: p5, branchId: 1, amount: 0, paymentMethod: "cash", isFreeSessions: true,
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 3 }],
    });
    const r1 = await pay(S.recv);
    const byRecv = await q(`SELECT is_free_sessions f FROM payments WHERE patient_id=$1`, [p5]);
    void r1;
    same("د١. **وجلساتُ الدفع المجّانية كما كانت**: الاستقبالُ لا يمنحها",
      byRecv.filter((r) => r.f).length, 0);
    const r2 = await pay(S.mgr);
    same("د٢. ومديرُ الفرع يمنحها", [r2.status, (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1 AND is_free_sessions`, [p5]))[0].n], [201, 1]);
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
