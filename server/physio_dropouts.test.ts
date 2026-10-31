// §4.fs — المنقطعون عن العلاج الطبيعي بعد جلسةٍ أو جلستين أو ثلاث (طلبُ المالك ٢٠٢٦-١٠-٣١).
// قاعدة محلّية: `npm run test:physio-dropouts`.
//
// ══ ما يحرسه (على النقطة الحقيقية `GET /api/reports/physio-dropouts`) ══════════════════════════════════════
// (أ) الاستعلامُ الخالص: الافتراضُ ٣٠ يوماً و٣ جلسات، والحدودُ تُردّ.
// (ب) العدُّ بالتعريف: ١ · ٢ · ٣ جلسات، وآخرُها قبل ٣٠ يوماً — لا الأربع ولا الحديث ولا المحذوف ولا الخطّةُ المغلقة،
//     وزيارةُ «خدمة جديدة» و«استشارة طبية» و«إضافة نوع حالة» ليست جلسة، وزيارةُ بلا قسمٍ تُحسب لمريض العلاج الطبيعيّ وحده.
// (ج) المعامِلات: inactiveDays · maxSessions · from/to، والقائمةُ بـ`list=1` وما اشتراه وما بقي له.
// (د) الصلاحيةُ والفرع: بلا «عرض التقارير» ٤٠٣، والموظّفُ فرعُه وحده، والمسؤولُ كلُّ الفروع أو ما يختار.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { parseDropoutQuery } from "./reports/physio_dropouts";
import { baghdadTodayYmd } from "@shared/visit_date";

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
const PORT = 6893;
const MARK = "اختبار-المنقطعين";
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const ADMIN = 9961, REC1 = 9962, REC_NO = 9963, REC2 = 9964;
const USERS = [ADMIN, REC1, REC_NO, REC2];
const sess = (userId: number, role: string, branchId: number | null, isAdmin = false) =>
  ({ userId, role, isAdmin, branchId, accessibleBranches: branchId ? [branchId] : null, displayName: `موظف ${userId}`, permissions: {} });
async function http(path: string, s: any) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    headers: { "x-test-session": Buffer.from(JSON.stringify(s), "utf8").toString("base64") },
  });
  let j: any = null; try { j = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: j };
}
const today = baghdadTodayYmd();
const ago = (n: number) => new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)) - n * 86_400_000).toISOString().slice(0, 10);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source='${MARK}'`;
  await q(`DELETE FROM physio_plans WHERE patient_id IN (${ids})`).catch(() => {});
  for (const t of ["payments", "visits", "patient_events", "patient_contacts", "patient_notification_deliveries", "patient_cases"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`).catch(() => {});
  }
  await q(`DELETE FROM patients WHERE referral_source='${MARK}'`);
}

async function main() {
  console.log("── أ. الاستعلامُ الخالص ──");
  same("أ١. الافتراض: ٣٠ يوماً و٣ جلسات بلا قائمة", parseDropoutQuery({}), { inactiveDays: 30, maxSessions: 3, from: null, to: null, list: false });
  same("أ٢. والحدود تُردّ", [parseDropoutQuery({ inactiveDays: "3" }), parseDropoutQuery({ maxSessions: "11" }), parseDropoutQuery({ from: "x" }),
    parseDropoutQuery({ from: "2026-05-02", to: "2026-05-01" })].map((r: any) => "error" in r),
  [true, true, true, true]);

  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  const B1 = (await q(`SELECT name FROM branches WHERE id=1`))[0].name, B2 = (await q(`SELECT name FROM branches WHERE id=2`))[0].name;
  for (const [id, role, branch, reports] of [[ADMIN, "admin", null, true], [REC1, "reception", 1, true], [REC_NO, "reception", 1, false], [REC2, "reception", 2, true]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_view_patients,can_view_reports)
             VALUES ($1,$2,'x','موظف',$3,$4,$5::jsonb,true,true,$6)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_view_reports=EXCLUDED.can_view_reports`,
      [id, `pd_u${id}`, role, branch, JSON.stringify(branch ? [branch] : []), reports]);
  }
  await cleanup();

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

  const S = { admin: sess(ADMIN, "admin", null, true), rec1: sess(REC1, "reception", 1), recNo: sess(REC_NO, "reception", 1), rec2: sess(REC2, "reception", 2) };
  const get = (qs: string, s: any = S.admin) => http(`/api/reports/physio-dropouts${qs}`, s);
  //  القاعدةُ قد تحمل مرضى غيرَنا: الملخّصُ يُقاس **فرقاً** عن خطّ أساسٍ قبل الزرع، والقائمةُ بمرضانا وحدهم.
  const baseline = (await get("")).body;
  const base = (k: string) => Number(baseline?.counts?.bySessions?.[k] ?? 0);
  same("   خطّ الأساس يُقرأ", typeof baseline?.counts?.total, "number");

  const mk = async (tag: string, cases: string[] = ["physiotherapy"], extra = "") => {
    const id = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy, total_cost, patient_classification ${extra ? ", physio_plan" : ""})
      VALUES ($1,'07700000000',$2,'40','physiotherapy',1,true,0,'new' ${extra ? ", $3::jsonb" : ""}) RETURNING id`,
      extra ? [`${MARK} ${tag}`, MARK, extra] : [`${MARK} ${tag}`, MARK]))[0].id);
    const caseIds: Record<string, number> = {};
    for (const c of cases) caseIds[c] = Number((await q(`INSERT INTO patient_cases (patient_id, case_type, branch_id) VALUES ($1,$2,1) RETURNING id`, [id, c]))[0].id);
    return { id, caseIds };
  };
  const visit = (pid: number, caseId: number | null, day: string, branch = 1, more: { details?: string; notes?: string; treatmentType?: string } = {}) =>
    q(`INSERT INTO visits (patient_id, branch_id, visit_date, case_id, details, notes, treatment_type) VALUES ($1,$2,($3 || ' 07:00')::timestamp,$4,$5,$6,$7)`,
      [pid, branch, day, caseId, more.details ?? null, more.notes ?? null, more.treatmentType ?? "روبوت"]);

  const A = await mk("أ-جلسة");            await visit(A.id, A.caseIds.physiotherapy, ago(40));
  const B = await mk("ب-جلستان", ["physiotherapy"], JSON.stringify([{ treatmentType: "روبوت", sessionCount: 10 }]));
  await visit(B.id, B.caseIds.physiotherapy, ago(50)); await visit(B.id, B.caseIds.physiotherapy, ago(45));
  //  أوّلُها في فرع ١ وآخرُها في فرع ٢ — فالفرعُ فرعُ آخر جلسة لا أوّلها.
  const C = await mk("ج-ثلاث-فرع٢");      await visit(C.id, C.caseIds.physiotherapy, ago(36), 1);
  for (const d of [35, 34]) await visit(C.id, C.caseIds.physiotherapy, ago(d), 2);
  const D = await mk("د-أربع");           for (const d of [44, 43, 42, 41]) await visit(D.id, D.caseIds.physiotherapy, ago(d));
  const E = await mk("هـ-حديث");          await visit(E.id, E.caseIds.physiotherapy, ago(12)); await visit(E.id, E.caseIds.physiotherapy, ago(10));
  const F = await mk("و-تخرّج");          await visit(F.id, F.caseIds.physiotherapy, ago(40));
  await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status) VALUES ($1,1,'خطة',$2)`, [F.id, "graduated"]);
  const G = await mk("ز-محذوف");          await visit(G.id, G.caseIds.physiotherapy, ago(40));
  await q(`UPDATE patients SET deleted_at = now(), deleted_reason = 'اختبار', restore_until = now() + interval '30 days', deleted_total_cost = 0, deleted_total_paid = 0, deleted_remaining = 0, deleted_needed_admin = false,
             deleted_pending_json = '{"pendingCharges":0,"pendingDiscounts":0,"pendingPriceRequests":0,"openFollowups":0,"openSettlements":0}'::jsonb
           WHERE id=$1`, [G.id]);
  const H = await mk("ح-غير-جلسات");      await visit(H.id, H.caseIds.physiotherapy, ago(40));
  await visit(H.id, H.caseIds.physiotherapy, ago(39), 1, { details: "خدمة جديدة" });
  await visit(H.id, H.caseIds.physiotherapy, ago(38), 1, { notes: "خدمة جديدة: روبوت" });
  await visit(H.id, H.caseIds.physiotherapy, ago(37), 1, { treatmentType: "استشارة طبية" });
  await visit(H.id, H.caseIds.physiotherapy, ago(36), 1, { details: "إضافة نوع حالة" });
  const I = await mk("ط-أطراف-وعلاج", ["physiotherapy", "prosthetic"]);
  await visit(I.id, I.caseIds.physiotherapy, ago(40)); await visit(I.id, null, ago(39)); await visit(I.id, null, ago(38));
  const J = await mk("ي-قديم-بلا-قسم");    await visit(J.id, null, ago(60)); await visit(J.id, null, ago(55));
  const K = await mk("ك-خطة-جارية");      await visit(K.id, K.caseIds.physiotherapy, ago(40));
  await q(`INSERT INTO physio_plans (patient_id, branch_id, title_ar, status) VALUES ($1,1,'خطة',$2)`, [K.id, "approved"]);
  const ours = new Set([A, B, C, D, E, F, G, H, I, J, K].map((x) => x.id));
  const mine = (body: any) => ((body?.patients ?? []) as any[]).filter((p) => ours.has(p.patientId));
  const byId = (body: any) => Object.fromEntries(mine(body).map((p: any) => [p.patientId, p.sessions]));

  try {
    console.log("\n── ب. العدُّ بالتعريف ──");
    const all = await get("?list=1");
    same("ب١. **مرضانا المنقطعون وعددُ جلسات كلٍّ**: أ١ · ب٢ · ج٣ · ح١ · ط١ · ي٢ · ك١ — لا الأربع ولا الحديث ولا المحذوف ولا المتخرّج",
      byId(all.body), { [A.id]: 1, [B.id]: 2, [C.id]: 3, [H.id]: 1, [I.id]: 1, [J.id]: 2, [K.id]: 1 });
    const sum = (await get("")).body;
    same("ب٢. **والملخّصُ بالعدد** (فرقاً عن خطّ الأساس): جلسةٌ ٤ · جلستان ٢ · ثلاث ١",
      [sum.counts.bySessions["1"] - base("1"), sum.counts.bySessions["2"] - base("2"), sum.counts.bySessions["3"] - base("3")], [4, 2, 1]);
    same("ب٣. **والخطّةُ المتخرّجة تُقال مستبعَدةً** لا تُخفى", sum.excludedClosedPlans - Number(baseline.excludedClosedPlans ?? 0), 1);
    same("ب٤. **والملخّصُ بلا مصفوفة** (فلا تبتلعه طبقةُ المساعد) والتعريفُ مكتوبٌ فيه",
      [Object.values(sum).some(Array.isArray), /من 1 إلى 3 جلسات فقط/.test(sum.rule.text), sum.rule.lastSessionOnOrBefore], [false, true, ago(30)]);
    same("ب٥. **والفرعُ فرعُ آخر جلسة**: مريضُ ج في فرع ٢",
      mine(all.body).find((p: any) => p.patientId === C.id)?.branchName, B2);

    console.log("\n── ج. المعامِلات والقائمة ──");
    const pB = mine(all.body).find((p: any) => p.patientId === B.id);
    same("ج١. **اشترى ١٠ وحضر ٢ ⟵ بقي له ٨** وأيّامُه وآخرُ جلسة",
      [pB?.purchasedSessions, pB?.remainingSessions, pB?.lastSessionDay, pB?.daysSinceLastSession], [10, 8, ago(45), 45]);
    same("ج٢. **ومَن اشترى أكثر ممّا حضر** في الملخّص", [sum.paidForMoreThanAttended.patients - Number(baseline.paidForMoreThanAttended?.patients ?? 0),
      sum.paidForMoreThanAttended.unattendedSessions - Number(baseline.paidForMoreThanAttended?.unattendedSessions ?? 0)], [1, 8]);
    same("ج٣. **inactiveDays=7 ⟵ الحديثُ (قبل ١٠ أيام) يدخل**", byId((await get("?list=1&inactiveDays=7")).body)[E.id], 2);
    same("ج٤. **maxSessions=4 ⟵ صاحبُ الأربع يدخل**", byId((await get("?list=1&maxSessions=4")).body)[D.id], 4);
    same("ج٥. **from/to على يوم أوّل جلسة** ⟵ ب (قبل ٥٠) وي (قبل ٦٠) وحدهما",
      Object.keys(byId((await get(`?list=1&from=${ago(65)}&to=${ago(45)}`)).body)).map(Number).sort((x, y) => x - y), [B.id, J.id].sort((x, y) => x - y));
    same("ج٦. **ومعاملٌ خارج حدوده ⟵ ٤٠٠**", (await get("?inactiveDays=2")).status, 400);

    console.log("\n── د. الصلاحيةُ والفرع ──");
    same("د١. **بلا «عرض التقارير» ⟵ ٤٠٣**", (await get("", S.recNo)).status, 403);
    const r1 = await get("?list=1", S.rec1);
    same("د٢. **استقبالُ فرع ١ يرى فرعَه وحده** — لا مريضَ ج (فرع ٢)", [r1.status, byId(r1.body)[C.id] ?? null, byId(r1.body)[A.id]], [200, null, 1]);
    same("د٣. **ولا يختار فرعاً آخر** (branchId يُتجاهل لغير المسؤول)", byId((await get("?list=1&branchId=2", S.rec1)).body)[C.id] ?? null, null);
    same("د٤. **والمسؤولُ يختار فرع ٢ ⟵ ج وحده من مرضانا**", Object.keys(byId((await get("?list=1&branchId=2")).body)).map(Number), [C.id]);
    same("د٥. **وbyBranch يقسم مرضانا على الفرعين**", [sum.byBranch[B2]?.bySessions?.["3"] - Number(baseline.byBranch?.[B2]?.bySessions?.["3"] ?? 0)], [1]);
    same("د٦. **ولا كتابة**: زياراتُ مرضانا كما هي", Number((await q(`SELECT count(*)::int n FROM visits WHERE patient_id = ANY($1::int[])`, [Array.from(ours)]))[0].n), 25);
    void B1;
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]).catch(() => {});
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
