// «الحالة المرضية» تتبع أقسامَ المريض (البند ٣١ من §4.ar، ترحيل ٠٨٨) — `npm run test:medical-condition-sync`، قاعدةٌ محلّية
// **لم يُطبَّق عليها ٠٨٨ بعد** (قالبٌ بلا الترحيل)، فيُقاس التصحيحُ الرجعيُّ وسطرُ تدقيقه ثمّ المُطلِق.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// مريضُ أطرافٍ صار علاجاً طبيعياً وحده ⟵ رمزُه `physiotherapy` بسطر تدقيق · والتشغيلُ الثاني لا يكتب شيئاً ·
// ونصٌّ حرٌّ قديم لا يُمَسّ · ومريضُ قسمين لا يتقلّب رمزُه · والتصديرُ والتقريرُ اليوميّ يقولان الأقسامَ بالعربية.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { runMigrations } from "./migrations/runner";
import { registerRoutes } from "./routes";
import { patientDepartmentsLabel } from "@shared/medical";

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
const PORT = 6843;
const ADMIN = { userId: 9901, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
  displayName: "adm", permissions: { canViewPatients: true, canViewReports: true } };
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];

async function mk(name: string, mc: string, f: { amp?: boolean; physio?: boolean; ms?: boolean }) {
  const [p] = await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
      is_amputee, is_physiotherapy, is_medical_support, total_cost)
    VALUES ($1,'07700000000','اختبار','40',$2,1,$3,$4,$5,0) RETURNING id`, [name, mc, !!f.amp, !!f.physio, !!f.ms]);
  return Number(p.id);
}
const mcOf = async (id: number) => (await q(`SELECT medical_condition FROM patients WHERE id=$1`, [id]))[0].medical_condition;
const auditOf = async (id: number) =>
  (await q(`SELECT old_values, new_values, user_name FROM audit_log WHERE entity_type='patient' AND entity_id=$1 ORDER BY id`, [id]))
    .map((r) => [JSON.parse(r.old_values).medicalCondition, JSON.parse(r.new_values).medicalCondition, r.user_name]);

async function main() {
  // ══ ٠. الدالّةُ الخالصة ══
  same("٠.١ الأعلامُ بالترتيب الثابت", patientDepartmentsLabel({ medicalCondition: "physiotherapy", isAmputee: true, isPhysiotherapy: true }),
    "أطراف صناعية + علاج طبيعي");
  same("٠.٢ نصٌّ حرٌّ قديم كما هو", patientDepartmentsLabel({ medicalCondition: "بتر تحت الركبة", isPhysiotherapy: true }), "بتر تحت الركبة");
  same("٠.٣ بلا علَمٍ ⟵ قسمُ الرمز", patientDepartmentsLabel({ medicalCondition: "amputee" }), "أطراف صناعية");
  same("٠.٤ «constructor» ليس رمزاً", patientDepartmentsLabel({ medicalCondition: "constructor" }), "constructor");

  const applied = await q(`SELECT 1 FROM _migrations WHERE name='088_sync_medical_condition'`);
  //  **قاعدةُ الاختبار تُعاد إلى ما قبل ٠٨٨ بنفسها** — القالبُ المعتاد (`bcm_base`) مُرحَّلٌ كاملاً، فكان
  //  الاختبارُ يخرج بلا قياس. يُزال ما أنشأه الترحيلُ وحده (مُطلِقُه ودالّتُه وسطرُ تسجيله)، ثمّ يُقاس التصحيحُ
  //  الرجعيُّ والمُطلِقُ من الصفر كما لو كان أوّلَ إقلاع. (الحارسُ أعلاه يقصر هذا على قاعدةٍ محلّية.)
  if (applied.length) {
    await q(`DROP TRIGGER IF EXISTS trg_sync_medical_condition ON patients`);
    await q(`DROP FUNCTION IF EXISTS sync_patient_medical_condition()`);
    await q(`DELETE FROM _migrations WHERE name='088_sync_medical_condition'`);
  }
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);

  const STALE = await mk("أ أطراف صار علاجاً", "amputee", { physio: true });
  const STALE2 = await mk("ب علاج صار مساند", "physiotherapy", { ms: true, physio: false });
  const TWO = await mk("ج قسمان رمزُه الثاني", "physiotherapy", { amp: true, physio: true });
  const LEGACY = await mk("د نصٌّ حرّ", "بتر فوق الركبة", { physio: true });
  const NONE = await mk("هـ بلا أعلام", "amputee", {});
  const OK = await mk("و متّسق", "medical_support", { ms: true });

  // ══ ١. التصحيحُ الرجعيّ ══
  await runMigrations();
  same("١.١ المتخلّف ⟵ قسمُه القائم", [await mcOf(STALE), await mcOf(STALE2)], ["physiotherapy", "medical_support"]);
  same("١.٢ **وسطرُ تدقيقٍ بالقديم والجديد**", [await auditOf(STALE), await auditOf(STALE2)],
    [[["amputee", "physiotherapy", "ترحيل ٠٨٨"]], [["physiotherapy", "medical_support", "ترحيل ٠٨٨"]]]);
  same("١.٣ قسمان ورمزُه قائم ⟵ لا يتقلّب ولا سطر", [await mcOf(TWO), await auditOf(TWO)], ["physiotherapy", []]);
  same("١.٤ النصُّ الحرّ لا يُمَسّ", [await mcOf(LEGACY), await auditOf(LEGACY)], ["بتر فوق الركبة", []]);
  same("١.٥ بلا أعلام ⟵ كما هو", [await mcOf(NONE), await auditOf(NONE)], ["amputee", []]);
  same("١.٦ المتّسق ⟵ كما هو", [await mcOf(OK), await auditOf(OK)], ["medical_support", []]);

  // ══ ٢. idempotent ══
  const before = (await q(`SELECT count(*)::int n FROM audit_log`))[0].n;
  await pool.query((await import("./migrations/088_sync_medical_condition")).sql);
  same("٢.١ التشغيلُ الثاني لا يكتب سطراً", (await q(`SELECT count(*)::int n FROM audit_log`))[0].n, before);

  // ══ ٣. المُطلِق ══
  await q(`UPDATE patients SET is_amputee=false, is_medical_support=true WHERE id=$1`, [TWO]);
  same("٣.١ قسمُ الرمز باقٍ ⟵ لا يتغيّر", await mcOf(TWO), "physiotherapy");
  await q(`UPDATE patients SET is_physiotherapy=false WHERE id=$1`, [TWO]);
  same("٣.٢ **سقط قسمُ الرمز ⟵ ينتقل إلى القائم**", await mcOf(TWO), "medical_support");
  await q(`UPDATE patients SET is_amputee=true WHERE id=$1`, [NONE]);
  same("٣.٣ علَمٌ يُضاف لرمزٍ بلا أعلام يوافقه ⟵ كما هو", await mcOf(NONE), "amputee");
  const NEW = await mk("ز تسجيلٌ متناقض", "amputee", { physio: true });
  same("٣.٤ الإدراجُ كذلك", await mcOf(NEW), "physiotherapy");
  await q(`UPDATE patients SET medical_condition='amputee' WHERE id=$1`, [NEW]);
  same("٣.٥ كتابةُ رمزٍ لا قسمَ له ⟵ تُصحَّح", await mcOf(NEW), "physiotherapy");
  await q(`UPDATE patients SET is_amputee=true, is_physiotherapy=false WHERE id=$1`, [LEGACY]);
  same("٣.٦ النصُّ الحرّ يبقى مع تبدّل الأعلام", await mcOf(LEGACY), "بتر فوق الركبة");

  // ══ ٤. التصديرُ والتقريرُ اليوميّ ══
  await q(`INSERT INTO visits (patient_id, branch_id, visit_date, treatment_type, session_count, cost)
           VALUES ($1,1,'2026-01-15 09:00','روبوت',1,0)`, [STALE]);
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
  try {
    const csv = await (await fetch(`http://127.0.0.1:${PORT}/api/admin/export/patients`)).text();
    const line = (name: string) => csv.split("\n").find((l) => l.includes(name)) ?? "";
    same("٤.١ **التصدير: قسمُه الحاليّ لا «بتر»**", [line("أ أطراف صار علاجاً").includes("علاج طبيعي"), line("أ أطراف صار علاجاً").includes("بتر")], [true, false]);
    same("٤.٢ ونصٌّ حرٌّ قديم كما هو لا «مساند طبية»", line("د نصٌّ حرّ").includes("بتر فوق الركبة"), true);
    const rep: any = await (await fetch(`http://127.0.0.1:${PORT}/api/reports/daily-patient-report?date=2026-01-15&branchId=1`)).json();
    const row = (rep.rows ?? rep.visits ?? []).find((r: any) => r.patientId === STALE);
    same("٤.٣ **التقريرُ اليوميّ: المشكلةُ بالعربية لا الرمزُ الخام**", row?.problem, "علاج طبيعي");
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    await pool.end();
  }
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
