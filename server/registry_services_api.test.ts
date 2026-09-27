// أقسامُ التصدير في سجلّ المرضى (طلبُ المالك ٢٠٢٦-٠٩-٢٧) — `npm run test:registry-services-api`، قاعدةٌ محلّية.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// «حسب التاريخ» + قسم ⟵ نشاطُ ذلك اليوم **من القسم نفسِه**: مريضٌ بقسمين جاء لقياس طرفٍ وحده لا يُصدَّر
// «علاجاً طبيعياً». و«جميع المرضى» + قسم ⟵ مَن يحمل القسمَ في ملفّه. وقسمان معاً ⟵ أيٌّ منهما.
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
const PORT = 6841;
const DAY = "2026-01-15";
const ADMIN = { userId: 9901, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
  displayName: "adm", permissions: { canViewPatients: true } };
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];

async function mk(name: string, flags: { amp?: boolean; physio?: boolean; ms?: boolean }, cases: string[]) {
  const [p] = await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
      is_amputee, is_physiotherapy, is_medical_support, total_cost, created_at)
    VALUES ($1,'07700000000','اختبار','40','x',1,$2,$3,$4,0,'2025-01-01 09:00') RETURNING id`,
    [name, !!flags.amp, !!flags.physio, !!flags.ms]);
  const ids: Record<string, number> = {};
  for (const c of cases) {
    ids[c] = (await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,$2,0) RETURNING id`,
      [p.id, c]))[0].id;
  }
  return { id: Number(p.id), cases: ids };
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  const A = await mk("أ علاج طبيعي", { physio: true }, ["physiotherapy"]);
  const B = await mk("ب أطراف+علاج جاء لطرف", { amp: true, physio: true }, ["prosthetic", "physiotherapy"]);
  const C = await mk("ج مساند دفع", { ms: true }, ["medical_support"]);
  const D = await mk("د بلا قسم", {}, []);
  await q(`INSERT INTO visits (patient_id, branch_id, case_id, visit_date, treatment_type, session_count, cost)
           VALUES ($1,1,$2,'${DAY} 09:00','روبوت',1,0)`, [A.id, A.cases.physiotherapy]);
  await q(`INSERT INTO visits (patient_id, branch_id, case_id, visit_date, treatment_type, session_count, cost)
           VALUES ($1,1,$2,'${DAY} 09:00','قياس',1,0)`, [B.id, B.cases.prosthetic]);
  await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, date) VALUES ($1,1,$2,50000,'${DAY} 09:00')`,
    [C.id, C.cases.medical_support]);
  await q(`INSERT INTO visits (patient_id, branch_id, visit_date, treatment_type, session_count, cost)
           VALUES ($1,1,'${DAY} 09:00','مراجعة',1,0)`, [D.id]);

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => { r.session = { branchSession: ADMIN }; next(); });
  const realUse = app.use.bind(app);
  (app as any).use = (...a: any[]) =>
    (a.length === 1 && typeof a[0] === "function" && a[0].name === "session") ? app : realUse(...(a as [any]));
  const srv = createServer(app);
  await registerRoutes(srv, app);
  srv.listen(PORT);
  await new Promise((r) => srv.once("listening", r));

  const names = async (qs: string) => {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/patients/registry?pageSize=100&branchId=1&${qs}`);
    const j: any = await r.json();
    return (j.rows ?? []).map((x: any) => x.id).sort((m: number, n: number) => m - n);
  };
  try {
    const all = [A.id, B.id, C.id, D.id].sort((m, n) => m - n);
    same("حسب التاريخ بلا قسم ⟵ الأربعة", await names(`visitDate=${DAY}`), all);
    same("**حسب التاريخ + علاج طبيعي ⟵ أ وحده — لا ب الذي جاء لطرف**",
      await names(`visitDate=${DAY}&services=physiotherapy`), [A.id]);
    same("حسب التاريخ + أطراف ⟵ ب", await names(`visitDate=${DAY}&services=prosthetic`), [B.id]);
    same("حسب التاريخ + مساند ⟵ ج (بدفعته على قسمه)", await names(`visitDate=${DAY}&services=medical_support`), [C.id]);
    same("**قسمان معاً** (علاج طبيعي + مساند) ⟵ أ و ج",
      await names(`visitDate=${DAY}&services=physiotherapy,medical_support`), [A.id, C.id].sort((m, n) => m - n));
    same("جميع المرضى + علاج طبيعي ⟵ أ و ب (في ملفّيهما القسم)",
      await names(`services=physiotherapy`), [A.id, B.id].sort((m, n) => m - n));
    same("وقيمةٌ غريبة لا ترشّح شيئاً", await names(`visitDate=${DAY}&services=xyz`), all);
    same("ويومٌ آخر لا يُظهر أحداً بالقسم", await names(`visitDate=2026-01-16&services=physiotherapy`), []);
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    //  تنظيفٌ كي تُعاد الحزمةُ على القاعدة نفسِها.
    const ids = [A.id, B.id, C.id, D.id];
    for (const t of ["payments", "visits", "patient_cases"]) await q(`DELETE FROM ${t} WHERE patient_id = ANY($1)`, [ids]);
    await q(`DELETE FROM patients WHERE id = ANY($1)`, [ids]);
    await pool.end();
  }
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
