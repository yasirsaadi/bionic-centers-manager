// §4.ar البند ٨ — الخطةُ العلاجية في نطاق الملفّ، والإصاباتُ بصلاحية تعديل المريض، وكلُّ كتابةٍ بأثر.
// قاعدة محلّية: `npm run test:treatment-plan-guard`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) القراءةُ بـ`canViewPatients` وفي نطاق الملفّ. (ب) الإنشاءُ في النطاق، وبسطر تدقيق.
// (ج) التعديلُ لا ينقل الخطةَ إلى مريضٍ أو فرعٍ آخر، ولا يعبر الفرع. (د) **إصاباتُ الملفّ بـ`canEditPatients` وحدها**،
// وبسطر تدقيقٍ بالقديم والجديد. (هـ) الحذفُ في النطاق وبأثر.
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
const PORT = 6879;
const MARK = "اختبار-حارس-الخطة";
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const TH1 = 9981, TH2 = 9982, TH_EDIT = 9983, VIEWLESS = 9984;
const USERS = [TH1, TH2, TH_EDIT, VIEWLESS];

//  الصلاحياتُ والفروعُ تُعاد من الصفّ مع كلّ طلب — فالجلسةُ هنا هويّةٌ وحسب، والصفُّ هو الحقيقة.
const sess = (userId: number, branchId: number) => ({ userId, role: "therapist", isAdmin: false, branchId,
  accessibleBranches: [branchId], displayName: `معالج ${userId}`, permissions: {} });
async function http(method: string, path: string, s: any, body?: any) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method, headers: { "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(s), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j: any = null; try { j = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: j };
}
const audits = async (type: string, id: number) =>
  (await q(`SELECT action, notes FROM audit_log WHERE entity_type=$1 AND entity_id=$2 ORDER BY id`, [type, id])).map((r) => r.action);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source='${MARK}'`;
  await q(`DELETE FROM treatment_plans WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source='${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, b, view, plans, edit] of [
    [TH1, 1, true, true, false], [TH2, 2, true, true, false], [TH_EDIT, 1, true, true, true], [VIEWLESS, 1, false, false, false],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
               can_view_patients,can_manage_treatment_plans,can_edit_patients)
             VALUES ($1,$2,'x','معالج','therapist',$3,jsonb_build_array($3::int),true,$4,$5,$6)
             ON CONFLICT (id) DO UPDATE SET branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true,
               can_view_patients=EXCLUDED.can_view_patients, can_manage_treatment_plans=EXCLUDED.can_manage_treatment_plans,
               can_edit_patients=EXCLUDED.can_edit_patients`, [id, `tp_u${id}`, b, view, plans, edit]);
  }
  await cleanup();
  const mkP = async (name: string, b: number) => Number((await q(`INSERT INTO patients (name, phone, referral_source, age,
      medical_condition, branch_id, is_physiotherapy, total_cost, injuries, injury_type)
    VALUES ($1,'07700000000',$2,'40','physiotherapy',$3,true,0,'[{"type":"قديم","area":"ركبة"}]','قديم') RETURNING id`,
    [`${MARK} ${name}`, MARK, b]))[0].id);
  const P1 = await mkP("بغداد", 1), P2 = await mkP("ذي قار", 2);

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
  const inj = JSON.stringify([{ type: "جديد", area: "كتف" }]);
  const injuriesOf = async (p: number) => (await q(`SELECT injury_type FROM patients WHERE id=$1`, [p]))[0].injury_type;

  try {
    console.log("\n── ب. الإنشاء ──");
    const c1 = await http("POST", `/api/patients/${P1}/treatment-plans`, sess(TH1, 1), { diagnosis: "تشخيص", injuries: inj });
    same("ب١. معالجُ الفرع ينشئ لمريض فرعه", c1.status, 200);
    const plan = Number(c1.body?.id);
    same("   **وبسطر تدقيق**", await audits("treatment_plan", plan), ["create"]);
    same("ب٢. **ومعالجُ فرعٍ آخر يُردّ** ⟵ ٤٠٣", (await http("POST", `/api/patients/${P1}/treatment-plans`, sess(TH2, 2), { diagnosis: "x" })).status, 403);

    console.log("\n── د. إصاباتُ الملفّ ──");
    same("د١. **بلا صلاحية تعديل المريض: الخطةُ حُفظت والملفُّ كما هو، ويُقال ذلك**",
      [c1.body?.injuriesSynced, await injuriesOf(P1), await audits("patient", P1)], [false, "قديم", []]);
    const c2 = await http("PUT", `/api/treatment-plans/${plan}`, sess(TH_EDIT, 1), { injuries: inj });
    same("د٢. **ومَن يملكها يحدّث الملفَّ بسطر تدقيق**",
      [c2.status, c2.body?.injuriesSynced, await injuriesOf(P1), await audits("patient", P1)], [200, true, "جديد", ["update"]]);

    console.log("\n── أ. القراءة ──");
    same("أ١. معالجُ الفرع يقرأ", (await http("GET", `/api/patients/${P1}/treatment-plans`, sess(TH1, 1))).status, 200);
    same("أ٢. **وفرعٌ آخر لا يقرأ** ⟵ ٤٠٣", (await http("GET", `/api/patients/${P1}/treatment-plans`, sess(TH2, 2))).status, 403);
    same("أ٣. **وبلا صلاحية عرض المرضى** ⟵ ٤٠٣", (await http("GET", `/api/patients/${P1}/treatment-plans`, sess(VIEWLESS, 1))).status, 403);

    console.log("\n── ج. التعديل ──");
    const u1 = await http("PUT", `/api/treatment-plans/${plan}`, sess(TH1, 1), { notes: "ملاحظة", patientId: P2, branchId: 2 });
    const row = (await q(`SELECT patient_id, branch_id, notes FROM treatment_plans WHERE id=$1`, [plan]))[0];
    same("ج١. **الجسمُ لا ينقل الخطةَ إلى مريضٍ أو فرعٍ آخر** — والحقلُ السريريّ كُتب",
      [u1.status, row.patient_id, row.branch_id, row.notes], [200, P1, 1, "ملاحظة"]);
    same("ج٢. **ومعالجُ فرعٍ آخر لا يعدّل** ⟵ ٤٠٣", (await http("PUT", `/api/treatment-plans/${plan}`, sess(TH2, 2), { notes: "x" })).status, 403);

    console.log("\n── هـ. الحذف ──");
    same("هـ١. **فرعٌ آخر لا يحذف** ⟵ ٤٠٣", (await http("DELETE", `/api/treatment-plans/${plan}`, sess(TH2, 2))).status, 403);
    same("هـ٢. معالجُ الفرع يحذف", (await http("DELETE", `/api/treatment-plans/${plan}`, sess(TH1, 1))).status, 200);
    same("   **وبسطر تدقيق** — والتاريخُ كاملٌ: إنشاءٌ، تعديلان، حذف", await audits("treatment_plan", plan), ["create", "update", "update", "delete"]);
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
