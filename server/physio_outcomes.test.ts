// نتائجُ العلاج الطبيعي (§4.cp — المرحلةُ ٦ب، ٢٠٢٦-١٠-٠٨). `npm run test:physio-outcomes` — على النقطة الحقيقية.
//
// يحرس القرارَ ٥: المسؤولُ والمشرفُ العام كلُّ الفروع (وبفرعٍ يختارانه)، ومديرُ الفرع فرعُه، والأخصائيُّ خططُه، وغيرُهم لا. ومعه حسابُ التقرير:
// «قورنت» بتقييمَين، و«تحسّن» من الأوّل والأخير باتجاه كلّ مقياس، والتخرّجُ والإيقاف، والالتزامُ بعدد الجلسات، والمتأخّرون، والمعالجُ الأكثرُ جلسات،
// والفترةُ بيوم الاعتماد، والموقوفةُ بلا نشاطٍ خارجه.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-outcomes-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { adherence, groupOf, outcomesScope, type PlanOutcome } from "@shared/physio_assessments";
import { baghdadTodayYmd } from "@shared/visit_date";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6984;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-نتائج-الخطط";
const B1 = 9961, B2 = 9962;
const ADMIN = 9971, SUP = 9972, SPEC1 = 9973, SPEC2 = 9974, MGR1 = 9975, MGR2 = 9976, TECH1 = 9977, TECH2 = 9978, REC = 9979;
const IDS = [ADMIN, SUP, SPEC1, SPEC2, MGR1, MGR2, TECH1, TECH2, REC];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
const addDays = (ymd: string, n: number) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function cleanup() {
  const pts = (await q(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).rows.map((r) => r.id);
  await q(`DELETE FROM physio_assessments WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plan_sessions WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_plans WHERE patient_id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM patients WHERE id = ANY($1::int[])`, [pts]);
  await q(`DELETE FROM physio_protocols WHERE code LIKE 'TEST-OUT-%'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM physio_device_branches WHERE branch_id = ANY($1::int[])`, [[B1, B2]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function main() {
  const today = baghdadTodayYmd();
  console.log("\n── القواعد ──");
  same("ق.١ النطاق: المسؤولُ والمشرفُ الكلّ، والمديرُ فرعُه، والأخصائيُّ خططُه، والتقنيُّ والاستقبالُ لا",
    [outcomesScope({ role: "admin", isAdmin: true, permissions: {} } as any), outcomesScope({ role: "branch_manager", permissions: { canSupervisePhysio: true } } as any),
      outcomesScope({ role: "branch_manager", permissions: {} } as any), outcomesScope({ role: "physio_specialist", permissions: {} } as any),
      outcomesScope({ role: "physio_technician", permissions: {} } as any), outcomesScope({ role: "reception", permissions: {} } as any)],
    ["all", "all", "branches", "own", null, null]);
  same("ق.٢ الالتزام: ثلاثٌ في الأسبوع منذ أسبوعين وثلاثُ جلساتٍ ⟵ ٥٠٪، ولا يتجاوز ١٠٠، ولا يتعدّى مدّةَ الخطّة، وبلا جرعةٍ ⟵ لا شيء",
    [adherence({ approvedOn: "2026-09-01", endOn: null, today: "2026-09-15", sessionsPerWeek: 3, durationWeeks: 12, executed: 3 }),
      adherence({ approvedOn: "2026-09-01", endOn: null, today: "2026-09-15", sessionsPerWeek: 3, durationWeeks: 12, executed: 9 }),
      adherence({ approvedOn: "2026-01-01", endOn: null, today: "2026-09-15", sessionsPerWeek: 2, durationWeeks: 2, executed: 2 }),
      adherence({ approvedOn: "2026-09-01", endOn: null, today: "2026-09-15", sessionsPerWeek: null, durationWeeks: 12, executed: 3 })], [50, 100, 50, null]);
  const o = (verdict: any, status = "approved", adherenceV: number | null = 50, overdue = false): PlanOutcome => ({ planId: 1, status, verdict, adherence: adherenceV, overdue,
    protocolKey: "p", protocolTitle: "p", branchKey: "b", branchName: "b", specialistKey: "s", specialistName: "s", executorKey: "e", executorName: "e" });
  const g = groupOf("k", "k", [o("improved"), o("worse", "stopped", 100), o("insufficient", "graduated", null, true), o("improved")]);
  same("ق.٣ التجميع: «قورنت» بلا غير-المقارَن، والنسبةُ من المقارَن، والحالاتُ والمتوسّطُ والمتأخّر",
    [g.plans, g.compared, g.improved, g.worse, g.improvedPct, g.graduated, g.stopped, g.active, g.adherence, g.overdue], [4, 3, 2, 1, 67, 1, 1, 2, 67, 1]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع نتائج ١'), ($2, 'فرع نتائج ٢')`, [B1, B2]);
  const u = (id: number, name: string, role: string, b: number | null, sup = false) => q(
    `INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_supervise_physio)
     VALUES ($1, $2, 'x', $3, $4, $5, $6::jsonb, true, $7)`, [id, `out-${id}`, name, role, b, JSON.stringify(b ? [b] : []), sup]);
  await u(ADMIN, "المسؤول", "admin", null); await u(SUP, "سليم", "branch_manager", B1, true); await u(SPEC1, "مصطفى", "physio_specialist", B1);
  await u(SPEC2, "سارة", "physio_specialist", B1); await u(MGR1, "مدير ١", "branch_manager", B1); await u(MGR2, "مدير ٢", "branch_manager", B2);
  await u(TECH1, "علي", "physio_technician", B1); await u(TECH2, "حسن", "physio_technician", B2); await u(REC, "استقبال", "reception", B1);
  const who = (userId: number, role: string, branchId: number, isAdmin = false) => hdr({ userId, displayName: String(userId), role, branchId, isAdmin, permissions: {} });
  const S = { admin: who(ADMIN, "admin", B1, true), sup: who(SUP, "branch_manager", B1), spec1: who(SPEC1, "physio_specialist", B1), spec2: who(SPEC2, "physio_specialist", B1),
    mgr1: who(MGR1, "branch_manager", B1), mgr2: who(MGR2, "branch_manager", B2), tech1: who(TECH1, "physio_technician", B1), rec: who(REC, "reception", B1) };

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) {
      try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; }
      catch { /* ignore */ }
    }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  const call = async (path: string, session: string) => {
    const r = await fetch(`${BASE}${path}`, { headers: { "x-test-session": session } });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };

  //  البيانات: بروتوكولٌ بمقياسين، وخمسُ خطط —
  //  A (مصطفى، فرع ١): تحسّنت، وثلاثُ جلساتٍ لعليّ منذ ١٤ يوماً بجرعة ٣/أسبوع ⟵ التزام ٥٠٪
  //  B (سارة، فرع ١): ساءت، وجلستان لحسن
  //  C (مصطفى، فرع ٢): تحسّنت وتخرّجت
  //  D (مصطفى، فرع ١): معتمَدةٌ منذ ٢٠ يوماً بلا تقييم ⟵ متأخّرة
  //  E (مصطفى، فرع ١): موقوفةٌ بلا نشاط ⟵ خارج التقرير
  //  F (سارة، فرع ١): معتمَدةٌ منذ ٥ أيام بتقييمٍ أوّليٍّ وحده ⟵ تُعدّ ولا تُقارن
  const P = (await q(`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, sessions_per_week, duration_weeks, session_minutes)
    VALUES ('TEST-OUT-1', 'بروتوكول النتائج', 'Outcomes protocol', 'neurological', 'pediatric', 3, 12, 45) RETURNING id`)).rows[0].id;
  const pt = (await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_physiotherapy)
    VALUES ($1, '07700000000', $2, '6', 'x', $3, true) RETURNING id`, [`مريض النتائج ${MARK}`, MARK, B1])).rows[0].id;
  const mkPlan = async (by: number, byName: string, branch: number, status: string, daysAgo: number) => (await q(
    `INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, status, sessions_per_week, duration_weeks, session_minutes,
       created_by, created_by_name, decided_at, graduated_at, stopped_at)
     VALUES ($1, $2, $3, 'خطة', $4, 3, 12, 45, $5, $6, now() - ($7 || ' days')::interval,
       CASE WHEN $4 = 'graduated' THEN now() ELSE NULL END, CASE WHEN $4 = 'stopped' THEN now() ELSE NULL END) RETURNING id`,
    [pt, branch, P, status, by, byName, String(daysAgo)])).rows[0].id;
  const A = await mkPlan(SPEC1, "مصطفى", B1, "approved", 14);
  const Bp = await mkPlan(SPEC2, "سارة", B1, "approved", 14);
  const C = await mkPlan(SPEC1, "مصطفى", B2, "graduated", 30);
  const D = await mkPlan(SPEC1, "مصطفى", B1, "approved", 20);
  const E = await mkPlan(SPEC1, "مصطفى", B1, "stopped", 10);
  const F = await mkPlan(SPEC2, "سارة", B1, "approved", 5);
  const sc = (g: number, m: number) => JSON.stringify([
    { code: "gmfm66", nameAr: "حركة", nameEn: "GMFM", unitAr: null, unitEn: null, min: 0, max: 100, higherIsBetter: true, value: g },
    { code: "mas", nameAr: "تشنّج", nameEn: "MAS", unitAr: null, unitEn: null, min: 0, max: 4, higherIsBetter: false, value: m }]);
  const assess = (plan: number, branch: number, daysAgo: number, pain: number, g: number, m: number, kind = "periodic") => q(
    `INSERT INTO physio_assessments (plan_id, patient_id, branch_id, kind, assessed_on, pain, scores, decision) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'continue')`,
    [plan, pt, branch, kind, addDays(today, -daysAgo), pain, sc(g, m)]);
  await assess(A, B1, 13, 6, 40, 3, "baseline"); await assess(A, B1, 1, 3, 55, 2);
  await assess(Bp, B1, 13, 3, 50, 1, "baseline"); await assess(Bp, B1, 1, 6, 45, 2);
  await assess(C, B2, 29, 7, 30, 3, "baseline"); await assess(C, B2, 2, 2, 60, 1, "final");
  await assess(F, B1, 4, 5, 35, 2, "baseline");
  const sess = (plan: number, branch: number, by: number, name: string, n: number) => q(
    `INSERT INTO physio_plan_sessions (plan_id, patient_id, branch_id, session_date, shift, executed_by, executed_by_name)
     SELECT $1, $2, $3, $4::date - g, 'morning', $5, $6 FROM generate_series(1, $7) g`, [plan, pt, branch, today, by, name, n]);
  await sess(A, B1, TECH1, "علي", 3); await sess(Bp, B1, TECH2, "حسن", 2);
  const rep = (s: string, qs = "") => call(`/api/physio/outcomes${qs}`, s);
  const ids = (r: any) => (r.json?.byProtocol ?? []).reduce((a: number, g: any) => a + g.plans, 0);

  try {
    console.log("\n── أ. مَن يرى ماذا (القرار ٥) ──");
    same("أ.١ الاستقبالُ والتقنيُّ ⟵ ٤٠٣", [(await rep(S.rec)).status, (await rep(S.tech1)).status], [403, 403]);
    const ad = (await rep(S.admin)).json;
    same("أ.٢ المسؤول: الكلُّ — خمسُ خطط (الموقوفةُ بلا نشاطٍ خارجه)، ومرشِّحُ الفروع", [ad.scope, ad.totals.plans, ad.branches.some((b: any) => b.id === B2)], ["all", 5, true]);
    same("أ.٣ والمشرفُ العام مثلُه", [(await rep(S.sup)).json.scope, ids(await rep(S.sup))], ["all", 5]);
    const m1 = (await rep(S.mgr1)).json; const m2 = (await rep(S.mgr2)).json;
    same("أ.٤ مديرُ فرع ١ فرعُه (A·B·D·F)، ومديرُ فرع ٢ فرعُه (C)، ولا مرشِّحَ فروعٍ لهما", [m1.scope, m1.totals.plans, m2.totals.plans, m1.branches.length], ["branches", 4, 1, 0]);
    same("أ.٥ ومديرُ فرع ١ يطلب فرعَ ٢ ⟵ لا شيء", ids(await rep(S.mgr1, `?branchId=${B2}`)), 0);
    const s1 = (await rep(S.spec1)).json; const s2 = (await rep(S.spec2)).json;
    same("أ.٦ الأخصائيُّ خططُه: مصطفى A·C·D، وسارة B·F", [s1.scope, s1.totals.plans, s2.totals.plans], ["own", 3, 2]);

    console.log("\n── ب. الحساب ──");
    same("ب.١ الإجماليّ: قورنت ٣، تحسّن ٢ (٦٧٪)، ساءت ١، تخرّجت ١، ومتأخّرةٌ ١ (D)",
      [ad.totals.compared, ad.totals.improved, ad.totals.improvedPct, ad.totals.worse, ad.totals.graduated, ad.totals.overdue], [3, 2, 67, 1, 1, 1]);
    const spec = Object.fromEntries(ad.bySpecialist.map((g: any) => [g.name, [g.plans, g.compared, g.improved, g.worse]]));
    same("ب.٢ حسب الأخصائيّ: مصطفى ٣ خطط قورنت ٢ تحسّنتا، وسارة خطّتان قورنت واحدةٌ ساءت", [spec["مصطفى"], spec["سارة"]], [[3, 2, 2, 0], [2, 1, 0, 1]]);
    const ex = Object.fromEntries(ad.byExecutor.map((g: any) => [g.name, [g.plans, g.improved, g.worse, g.adherence]]));
    same("ب.٣ حسب المعالج (الأكثرُ جلسات): عليٌّ خطّةٌ تحسّنت بالتزام ٥٠٪، وحسنٌ ساءت بالتزام ٣٣٪، وغيرُ المنفَّذ وحده",
      [ex["علي"], ex["حسن"], ex["لم تُنفَّذ جلسة"]?.[0]], [[1, 1, 0, 50], [1, 0, 1, 33], 3]);
    same("ب.٤ حسب الفرع", Object.fromEntries(ad.byBranch.map((g: any) => [g.key, g.plans])), { [`b${B1}`]: 4, [`b${B2}`]: 1 });
    same("ب.٦ **خطّةٌ بتقييمٍ واحد تُعدّ ولا تُقارن** — قورنت ٣ من ٥", [ad.totals.plans, ad.totals.compared], [5, 3]);
    same("ب.٥ والمتأخّرون بأسمائهم", ad.overdue.map((r: any) => r.planId), [D]);

    console.log("\n── ج. المرشّحات ──");
    same("ج.١ المسؤولُ بفرع ٢ ⟵ C وحدها", ids(await rep(S.admin, `?branchId=${B2}`)), 1);
    same("ج.٢ والفترةُ بيوم الاعتماد: من قبل ١٢ يوماً ⟵ F وحدها (A·B قبل ١٤، C قبل ٣٠، D قبل ٢٠)", ids(await rep(S.admin, `?from=${addDays(today, -12)}`)), 1);
    same("ج.٣ ومن قبل ٢٥ يوماً ⟵ A·B·D·F", ids(await rep(S.admin, `?from=${addDays(today, -25)}`)), 4);
    same("ج.٤ وبدايةٌ بعد النهاية ⟵ ٤٠٠", (await rep(S.admin, `?from=${today}&to=${addDays(today, -1)}`)).status, 400);
    check(E > 0, "ج.٥ (الموقوفةُ بلا نشاط موجودةٌ فعلاً في القاعدة)");
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
