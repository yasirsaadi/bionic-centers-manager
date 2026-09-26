// قرارُ الطبيب في المعاينة يحلّ محلَّ قسم الاستعلامات — والعلاجُ الطبيعيُّ منه (٢٠٢٦-٠٩-٢٦).
// `npm run test:exam-physio-switch` — حيٌّ على Postgres وعلى النقاط الحقيقية.
//
// ══ الواقعة ══════════════════════════════════════════════════════════════
// زين العابدين — سجّله استعلاماتُ كربلاء «مساند»، فعاينه الطبيبُ فوجده علاجاً
// طبيعياً. فحُفظت المعاينةُ **بلا قسم** (`case_id = NULL` — الوصفةُ لم ترفع
// عَلَمَ العلاج الطبيعي فلم يُنشأ خيطُه)، **وبقي الملفُّ مسنداً** (الاستبدالُ
// كان بين الجهازين وحدهما). وقرارُ المالك: قرارُ الطبيب أهمّ، ويُلغى قسمُ
// الموظّف.

import express from "express";
import { createServer } from "http";
import crypto from "crypto";
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

const PORT = 6883;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-قسم-الطبيب";
const RECV = 88300, DOC = 88301;
type Svc = "prosthetic" | "medical_support" | "physiotherapy";

const S = {
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات كربلاء", permissions: { canViewPatients: true, canAddPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** مريضٌ كما يسجّله الاستعلامات: عَلَمُ قسمٍ واحد (أو لا شيء) وخيطُه. */
async function mkPatient(label: string, svc: Svc | null, opts: { cost?: number } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification, amputation_site)
     VALUES ($1,'07701234567',$2,'30','حالة',$3,1,$4,$5,$6,$7,'new',$8) RETURNING id`,
    [`${MARK} ${label}`, MARK, svc === "medical_support" ? "مسند ظهر" : null,
      svc === "prosthetic", svc === "medical_support", svc === "physiotherapy", opts.cost ?? 0,
      svc === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null]);
  const id = r[0].id;
  if (svc) {
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
             VALUES ($1,1,$2,$3,'manual','active')`, [id, svc, opts.cost ?? 0]);
  }
  return id;
}
/** طلبُ جهازٍ على مسار المعاينة **عبر نقطته الحقيقية** — كما يفتحه استعلاماتُ كربلاء. */
async function openEpisode(patientId: number, svc: "prosthetic" | "medical_support") {
  const r = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv,
    { serviceType: svc, servicePath: "exam" });
  if (r.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${r.status} ${JSON.stringify(r.body)}`);
  const episodeId = Number(r.body.id);
  const req = await q<{ id: number }>(
    `SELECT id FROM medical_review_requests WHERE device_episode_id=$1 AND status='pending'`, [episodeId]);
  return { episodeId, requestId: req[0]?.id ?? null };
}
async function signExam(patientId: number, svc: Svc, extra: Record<string, unknown> = {}) {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(), caseType: svc, diagnosis: `معاينة ${svc}`, prescription: {},
    ...extra,
  });
}
async function casesOf(p: number) {
  return (await q<{ t: string }>(`SELECT case_type t FROM patient_cases WHERE patient_id=$1 ORDER BY case_type`, [p]))
    .map((r) => r.t);
}
async function flagsOf(p: number) {
  const r = (await q(`SELECT is_amputee a, is_medical_support s, is_physiotherapy f, total_cost c
                        FROM patients WHERE id=$1`, [p]))[0];
  return { a: r.a, s: r.s, f: r.f, cost: r.c };
}
async function examCaseType(examId: number) {
  return (await q<{ t: string | null }>(
    `SELECT c.case_type t FROM medical_exams e LEFT JOIN patient_cases c ON c.id = e.case_id WHERE e.id=$1`,
    [examId]))[0]?.t ?? null;
}
async function pendingOf(p: number) {
  const r = await http("GET", "/api/medical/pending", S.doc);
  return ((r.body?.pending ?? {})[String(p)] ?? []).slice().sort();
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const t of ["medical_review_requests", "post_exam_followup_events", "price_change_requests",
    "post_exam_followups", "service_discount_requests", "patient_code_aliases",
    "patient_notification_deliveries", "patient_events"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`);
  }
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  for (const t of ["journal_lines", "payments", "cost_entries", "visits", "treatment_plans",
    "patient_device_episodes", "patient_cases"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`);
  }
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'كربلاء') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [RECV, "reception", "استعلامات كربلاء", "[]"],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support","physiotherapy"]'],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `pts_u${id}`, name, role, spec]);
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
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  try {
    // ══ أ. واقعةُ زين العابدين بعينها ═══════════════════════════════════════
    console.log("\n── أ. سُجّل مسنداً ⟵ الطبيبُ: علاجٌ طبيعي ──");
    const zain = await mkPatient("زين العابدين", "medical_support");
    const sup = await openEpisode(zain, "medical_support");
    same("أ.١ (الإعداد: قسمُ مساند، وطلبُه بانتظار المعاينة)",
      [await casesOf(zain), await pendingOf(zain)], [["medical_support"], ["medical_support"]]);
    const ex = await signExam(zain, "physiotherapy");
    check(ex.status < 300, "أ.٢ المعاينةُ تُحفَظ علاجاً طبيعياً", JSON.stringify(ex.body));
    same("أ.٣ **ومربوطةٌ بقسم العلاج الطبيعي** — لا معاينةٌ بلا قسم", await examCaseType(Number(ex.body?.id)), "physiotherapy");
    same("أ.٤ **الملفُّ صار علاجاً طبيعياً وحده** — سُحب قسمُ المساند", await casesOf(zain), ["physiotherapy"]);
    same("أ.٥ والأعلامُ تتبعه: مساند ✗ · علاج طبيعي ✓", [(await flagsOf(zain)).s, (await flagsOf(zain)).f], [false, true]);
    same("أ.٦ **ولا شارةَ «بانتظار معاينة مساند»**", await pendingOf(zain), []);
    same("أ.٧ وطلبُ المساند السقاليّ حُذف، وطلبُ مراجعته أُلغي",
      [(await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE id=$1`, [sup.episodeId]))[0].n,
       (await q(`SELECT status FROM medical_review_requests WHERE id=$1`, [sup.requestId]))[0]?.status],
      [0, "cancelled"]);
    same("أ.٨ ولا ملاحظةَ تعثّر", ex.body?.switchNote ?? null, null);

    // ══ ب. معاينةٌ ثانيةٌ لا تهدم قرارَ الطبيب الأوّل ═════════════════════
    console.log("\n── ب. معاينةُ جهازٍ بعد العلاج الطبيعي ──");
    const ex2 = await signExam(zain, "medical_support");
    check(ex2.status < 300, "ب.١ معاينةُ مسندٍ ثانية تُحفَظ", JSON.stringify(ex2.body));
    same("ب.٢ **والعلاجُ الطبيعيُّ باقٍ** (معاينتُه الموقّعة تحميه) — قسمان",
      await casesOf(zain), ["medical_support", "physiotherapy"]);

    // ══ ج. العكس: سُجّل علاجاً طبيعياً ⟵ الطبيبُ: مسند ═══════════════════
    console.log("\n── ج. سُجّل علاجاً طبيعياً ⟵ الطبيبُ: مسند ──");
    const c = await mkPatient("ج-عكس", "physiotherapy");
    const exc = await signExam(c, "medical_support");
    check(exc.status < 300, "ج.١ المعاينةُ تُحفَظ مسنداً", JSON.stringify(exc.body));
    same("ج.٢ **الملفُّ صار مسنداً وحده**", await casesOf(c), ["medical_support"]);
    same("ج.٣ وعَلَمُ العلاج الطبيعي أُطفئ", (await flagsOf(c)).f, false);

    // ══ د. الحُرّاس ═══════════════════════════════════════════════════════
    console.log("\n── د. ما له تاريخٌ حقيقيّ يبقى ──");
    const d1 = await mkPatient("د-جلسات", "physiotherapy");
    await q(`INSERT INTO visits (patient_id, branch_id, visit_date, treatment_type, session_count, cost)
             VALUES ($1,1,NOW(),'روبوت',1,0)`, [d1]);
    const exd1 = await signExam(d1, "medical_support");
    same("د.١ **علاجٌ طبيعيٌّ له جلسات ⟶ يبقى** (قسمان)", await casesOf(d1), ["medical_support", "physiotherapy"]);
    check(/جلسات/.test(exd1.body?.switchNote ?? ""), "د.٢ ويُقال للطبيب لماذا", String(exd1.body?.switchNote));

    const d2 = await mkPatient("د-كلفة", "medical_support", { cost: 500_000 });
    const exd2 = await signExam(d2, "physiotherapy");
    same("د.٣ **قسمٌ عليه كلفة ⟶ يبقى** (قسمان)", await casesOf(d2), ["medical_support", "physiotherapy"]);
    same("د.٤ **ولا دينارَ تحرّك**", (await flagsOf(d2)).cost, 500_000);
    check(/كلفة/.test(exd2.body?.switchNote ?? ""), "د.٥ ويُقال للطبيب لماذا", String(exd2.body?.switchNote));

    const d3 = await mkPatient("د-قسمان", "medical_support");
    await q(`UPDATE patients SET is_physiotherapy=true WHERE id=$1`, [d3]);
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
             VALUES ($1,1,'physiotherapy',0,'manual','active')`, [d3]);
    await signExam(d3, "physiotherapy");
    same("د.٦ **قسمان مشروعان ⟶ لا يُمَسّ أيٌّ منهما**", await casesOf(d3), ["medical_support", "physiotherapy"]);

    // ══ هـ. بلا قسمٍ أصلاً ⟶ المعاينةُ تُنشئ قسمها ════════════════════════
    console.log("\n── هـ. معاينةُ علاجٍ طبيعيّ لملفٍّ بلا قسم ──");
    const e = await mkPatient("هـ-بلا-قسم", null);
    const exe = await signExam(e, "physiotherapy");
    same("هـ.١ **المعاينةُ تُنشئ قسمَها وتُربَط به**", [await casesOf(e), await examCaseType(Number(exe.body?.id))],
      [["physiotherapy"], "physiotherapy"]);

    // ══ و. التبادلُ القائم بين الجهازين بحرفه ═════════════════════════════
    console.log("\n── و. أطراف ⇄ مساند كما كان ──");
    const f = await mkPatient("و-جهازان", "medical_support");
    await signExam(f, "prosthetic");
    same("و.١ مسند ⟵ أطراف: خيطٌ واحد أطراف", await casesOf(f), ["prosthetic"]);

    // ══ ز. تنقيحُ معاينةٍ قائمة إلى علاجٍ طبيعي ═══════════════════════════
    console.log("\n── ز. تعديلُ معاينةٍ موقّعة إلى علاجٍ طبيعي ──");
    const g = await mkPatient("ز-تنقيح", "medical_support");
    const exg = await signExam(g, "medical_support");
    same("ز.١ (الإعداد: معاينةُ مسندٍ على قسم المساند)", await examCaseType(Number(exg.body?.id)), "medical_support");
    const rev = await http("PATCH", `/api/medical/exams/${exg.body?.id}`, S.doc, {
      caseType: "physiotherapy", diagnosis: "علاج طبيعي بعد الفحص", prescription: {},
    });
    check(rev.status < 300, "ز.٢ التنقيحُ يُحفَظ", JSON.stringify(rev.body));
    same("ز.٣ **والمعاينةُ انتقلت إلى العلاج الطبيعي**", await examCaseType(Number(exg.body?.id)), "physiotherapy");
    //  **ومعاينةُ الجهاز الموقّعة وَلدت متابعةَ «قرار المريض»** على قسم المساند،
    //  والتنقيحُ لا يمسّها — فحارسُ المتابعة يُبقي القسمَ ويقول للطبيب لماذا.
    //  سلوكٌ آمنٌ مقصود: حسمُ المتابعة قرارُ إنسانٍ من بطاقتها، لا أثرٌ جانبيّ.
    same("ز.٤ **قسمُ المساند باقٍ** — عليه متابعةُ قرارِ المريض التي وَلدتها معاينتُه",
      await casesOf(g), ["medical_support", "physiotherapy"]);
    check(/متابعة/.test(rev.body?.switchNote ?? ""), "ز.٥ **ويُقال للطبيب لماذا** — لا صمت", String(rev.body?.switchNote));

    //  والعكسُ بلا متابعة: معاينةُ علاجٍ طبيعيّ تُنقَّح إلى مسند ⟶ يُسحَب العلاجُ
    //  الطبيعيّ **بعد** انتقال المعاينة (ولو سُحب قبله لردّه حارسُ «معاينةٌ موقّعة»).
    const h = await mkPatient("ح-تنقيح-عكس", "physiotherapy");
    const exh = await signExam(h, "physiotherapy");
    same("ح.١ (الإعداد: معاينةُ علاجٍ طبيعيّ على قسمها)", await examCaseType(Number(exh.body?.id)), "physiotherapy");
    const revh = await http("PATCH", `/api/medical/exams/${exh.body?.id}`, S.doc, {
      caseType: "medical_support", diagnosis: "يحتاج مسنداً", prescription: {},
    });
    check(revh.status < 300, "ح.٢ التنقيحُ يُحفَظ", JSON.stringify(revh.body));
    same("ح.٣ **والملفُّ صار مسنداً وحده** — سُحب العلاجُ الطبيعيّ بعد انتقال المعاينة",
      await casesOf(h), ["medical_support"]);
    same("ح.٤ ولا ملاحظةَ تعثّر", revh.body?.switchNote ?? null, null);
  } finally {
    await new Promise((r) => httpServer.close(() => r(null)));
    await cleanup();
    await q(`UPDATE system_users SET is_active=false WHERE id = ANY($1::int[])`, [[RECV, DOC]]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فحصٌ فاشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
