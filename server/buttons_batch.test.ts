// مراجعةُ أزرار بقيّة الصفحات — الدفعة (§4.bt). حيّاً على Postgres وعلى النقاط الحقيقية، وفحوصُ توصيلٍ للواجهة.
// قاعدة محلّية: `npm run test:buttons-batch`.
//
// (أ) الفرعُ المُتاحُ له الملفُّ يعدّل بيانات المريض كفرع التسجيل (قرارُ المالك).
// (ب) «تحويل لخبير» من ملفٍّ مُتاح: قائمةُ الخبراء من فرع الأمر، والتحويلُ يُقبل.
// (ج) «المُرجَعون من الطبيب» يحمل اختصاصاتِ المعاينة لصاحب الجلسة.
// (د) الواجهة: أزرارٌ أُخفيت عمّن يُردّ، ونصوصٌ صُحّحت، وتأكيداتٌ أُضيفت.
import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
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
const PORT = 6958;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-أزرار-الدفعة";
const RECV1 = 9961, MGR1 = 9962, EXP1 = 9963, EXP2A = 9964, EXP2B = 9965, DOC = 9966;
const USERS = [RECV1, MGR1, EXP1, EXP2A, EXP2B, DOC];
const S = {
  recv1: { userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استقبال بغداد",
    permissions: { canViewPatients: true, canEditPatients: true, canAddPatients: true } },
  mgr1: { userId: MGR1, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "مدير بغداد",
    permissions: { canViewPatients: true, canEditPatients: true, canAddPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "طبيب",
    permissions: { canViewPatients: true } },
};
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method, headers: { "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, expert] of [
    [RECV1, "reception", 1, false], [MGR1, "branch_manager", 1, false],
    [EXP1, "prosthetics_expert", 1, true], [EXP2A, "prosthetics_expert", 2, true], [EXP2B, "prosthetics_expert", 2, true],
    [DOC, "doctor", 1, false],
  ] as any[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active,
               can_view_patients, can_edit_patients, can_add_patients)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,$7,$7)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_view_patients=true, can_edit_patients=EXCLUDED.can_edit_patients, can_add_patients=EXCLUDED.can_add_patients`,
      [id, `btb_u${id}`, `مستخدم ${id}`, role, b, JSON.stringify([b]), !expert && role !== "doctor"]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", r));

  try {
    //  مريضٌ مسجَّل في كربلاء (٢) ومُتاحٌ لبغداد (١).
    const pid = (await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'07701112233',$2,'40','170','70','x',2,0,'new') RETURNING id`, [`${MARK} مُتاح`, MARK]))[0].id;
    const other = (await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'07704445566',$2,'40','170','70','x',2,0,'new') RETURNING id`, [`${MARK} غير مُتاح`, MARK]))[0].id;
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1, 1)`, [pid]);

    console.log("\n── أ. تعديلُ مريضٍ مُتاح ──");
    const e1 = await http("PUT", `/api/patients/${pid}`, S.recv1, { phone: "07701112299" });
    same("أ١. استقبالُ الفرع المُتاحِ له يحفظ التعديل", e1.status, 200);
    same("أ٢. والقيمةُ كُتبت", (await q(`SELECT phone FROM patients WHERE id=$1`, [pid]))[0].phone, "07701112299");
    same("أ٣. وملفٌّ غيرُ مُتاحٍ يُردّ كما كان", (await http("PUT", `/api/patients/${other}`, S.recv1, { phone: "07704445599" })).status, 403);
    await http("PUT", `/api/patients/${pid}`, S.recv1, { branchId: 1 });
    same("أ٤. وفرعُ التسجيل لا يتغيّر من الفرع المُتاح", (await q(`SELECT branch_id FROM patients WHERE id=$1`, [pid]))[0].branch_id, 2);

    console.log("\n── ب. تحويلٌ لخبير من ملفٍّ مُتاح ──");
    const oid = (await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, assigned_by)
       VALUES ($1,2,$2,'prosthetic','active','order_received','initial_build',$3) RETURNING id`, [pid, EXP2A, MGR1]))[0].id;
    const plain = await http("GET", `/api/manufacturing/experts?branchId=2`, S.mgr1);
    same("ب١. بلا orderId: خبراءُ فرع المدير (كما كان)", (plain.body ?? []).map((x: any) => x.id).filter((i: number) => USERS.includes(i)), [EXP1]);
    const forOrder = await http("GET", `/api/manufacturing/experts?branchId=2&orderId=${oid}`, S.mgr1);
    same("ب٢. بـorderId: خبراءُ فرع الأمر", (forOrder.body ?? []).map((x: any) => x.id).filter((i: number) => USERS.includes(i)).sort(), [EXP2A, EXP2B]);
    const re = await http("PATCH", `/api/manufacturing/orders/${oid}/reassign`, S.mgr1, { newExpertUserId: EXP2B, reason: "اختبار" });
    same("ب٣. والتحويلُ إلى خبيرٍ منها يُقبل", re.status, 200);
    const oid2 = (await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, assigned_by)
       VALUES ($1,2,$2,'prosthetic','active','order_received','initial_build',$3) RETURNING id`, [other, EXP2A, MGR1]))[0].id;
    const leak = await http("GET", `/api/manufacturing/experts?branchId=2&orderId=${oid2}`, S.mgr1);
    same("ب٤. وأمرٌ لا يصله المدير: لا قائمةَ لفرعه — خبراءُ فرعه هو",
      (leak.body ?? []).map((x: any) => x.id).filter((i: number) => USERS.includes(i)), [EXP1]);

    console.log("\n── ج. المُرجَعون من الطبيب ──");
    const ret = await http("GET", `/api/medical-review/returned`, S.recv1);
    same("ج١. الردُّ يحمل examSpecialties", Array.isArray(ret.body?.examSpecialties), true);
    same("   والاستقبالُ بلا اختصاص معاينة ⟵ فارغة", ret.body?.examSpecialties, []);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log("\n── د. الواجهة ──");
  const code = (rel: string) => readFileSync(rel, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  const pedc = code("client/src/components/PostExamDecisionCard.tsx");
  same("د١. «اختيار الخبير» لا يظهر في البيع الجديد", /\{!examPath && canSelectExpert\(/.test(pedc), true);
  same("د٢. «بانتظار التخصيص» صارت «بانتظار إتمام البيع»", [/بانتظار التخصيص/.test(pedc), /بانتظار إتمام البيع/.test(pedc)], [false, true]);
  const acc = code("client/src/pages/Accounting.tsx");
  same("د٣. «اقتراح بالذكاء» لصاحب المحاسبة وحده", /\{aiEnabled && fullAccounting && \(/.test(acc), true);
  same("د٤. والملخّصُ والتقريران خلف fullAccounting", /\{fullAccounting && \(<>\s*<Button\s+variant="default"[\s\S]{0,400}button-daily-summary/.test(acc), true);
  same("د٥. وإرشادُ المصاريف خلفه", /\{fullAccounting && <ExpenseHintsPanel/.test(acc), true);
  const dash = code("client/src/pages/Dashboard.tsx");
  same("د٦. «عرض التقارير» بصلاحية التقارير", /\{\(isAdmin \|\| canViewReports\) && \(/.test(dash), true);
  same("د٧. وبطاقتا الإيرادات تُضغطان للمسؤول وحده",
    (dash.match(/onClick=\{isAdmin \? \(\) => navigate\("\/revenues/g) ?? []).length, 2);
  same("د٨. الإحصاءُ العامّ: التعديلُ والحذفُ لغير المسؤول مخفيّان",
    /\(isAdmin \|\| \(!stat\.isGlobal && stat\.branchId != null\)\) && \(/.test(code("client/src/pages/Statistics.tsx")), true);
  same("د٩. قائمةُ التحويل تطلب فرعَ الأمر",
    /experts\?branchId=\$\{branchId\}&orderId=\$\{orderId\}/.test(code("client/src/pages/ManufacturingOrder.tsx")), true);
  const rfd = code("client/src/pages/ReturnedFromDoctor.tsx");
  same("د١٠. «كتابة معاينة» و«إلغاء المعاينة» باختصاص الصفّ",
    (rfd.match(/mayExam && \(data\?\.examSpecialties \?\? \[\]\)\.includes\(r\.serviceType\)/g) ?? []).length, 2);
  same("د١١. إضافةُ مريض لا تدلّ على «تحديد خبير»", /تحديد خبير/.test(code("client/src/pages/CreatePatient.tsx")), false);
  const rc = code("client/src/pages/ReturnedCharges.tsx") + code("client/src/components/PendingChargesCard.tsx");
  same("د١٢. المبالغُ المُرجَعة والمعلّقة بلا «الطبيب»", /الطبيب/.test(rc), false);
  const pdb = code("client/src/components/PendingDiscountBanner.tsx");
  same("د١٣. شريطُ الخصم يدلّ على الصفحة لمن يراها وحده", /mayComplete\s*\?/.test(pdb) && /canApproveServiceDiscount\(/.test(pdb), true);
  same("د١٤. نصوصُ السلّة والخصومات بالصلاحية لا بالدور",
    [/مدير الفرع أو الطبيب|ومدير الفرع والطبيب/.test(code("client/src/pages/PatientTrash.tsx") + code("server/patients/trash_store.ts")),
     /ومدير الفرع والمخوَّل/.test(code("client/src/pages/DiscountApprovals.tsx") + code("server/discounts/routes.ts"))], [false, false]);
  const adm = code("client/src/pages/AdminSettings.tsx");
  same("د١٥. لا تبويبَ «كلمات مرور الفروع» ولا حقلَ كلمة مرورٍ للفرع الجديد",
    [/value="branches"/.test(adm), /input-new-branch-password|button-save-branch-password/.test(adm)], [false, false]);
  const da = code("client/src/pages/DiscountApprovals.tsx");
  same("د١٦. «إلغاء الطلب» في الخصومات بتأكيد",
    /reject-\$\{r\.id\}`\}>\s*<X[\s\S]{0,1200}confirm-reject-\$\{r\.id\}`\}\s*onClick=\{\(\) => decide\.mutate\(\{ id: r\.id, body: \{ decision: "reject" \} \}\)\}/.test(da), true);
  same("د١٧. «نسخ من الشهر السابق» يسأل حين للشهر أهداف",
    /hasTargets && !window\.confirm\(/.test(code("client/src/pages/SessionTargets.tsx")), true);

  console.log(`\n${failures === 0 ? "✅ كل فحوص دفعة الأزرار نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((err) => { console.error(err); process.exit(1); });
