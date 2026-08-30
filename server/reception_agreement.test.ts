// اتفاقُ الاستقبال ومراجعةُ المشرف — حيّاً على النقاط وPostgres.
// قاعدة محلّية: `npm run test:reception-agreement`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
//
// ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل (القسمان أ-ن) ═════
// طابورُ اعتماد الخصومات تقاعد: مَن يملك تنفيذ الخدمة بسعرها الكامل يملك
// تنفيذَها بخصمٍ صحيح أيضاً — بلا طبقة إذنٍ ثانية. فالأقسامُ التالية
// أُعيد بناؤها لتُثبت **التطبيقَ الفوريّ**، مع الحفاظ على تغطية البابِ
// التاريخيّ `/api/discounts/:id/decide` عبر بقايا مبنيّةٍ بإدراجٍ مباشر
// (`mkHistoricalPending`) — تماماً كما تبقى فعلياً بعد اليوم.
//
// (أ) **السعرُ الكامل يمضي فوراً** — بلا طلبِ اعتماد. خمسون مريضاً في اليوم
//     لا يمرّون بطابور، والطابورُ للاستثناء وحده.
// (ب) **والمخفَّضُ يُطبَّق فوراً بأثرٍ ماليّ كامل** — كلفة، ودفعة، وجلسة
//     مشتراة، وقيدُ دفتر، بحفظٍ واحد يحمل الخصمَ والتنفيذَ معاً.
// (ج) **والبابُ التاريخيُّ يبقى قانونياً بحرفه** لصفوفٍ حقيقية من قبل هذا
//     التغيير — بنداءِ الدالّة القانونية نفسها التي يناديها المسارُ الكامل.
// (د) **واعتمادٌ ثانٍ على البقيّة التاريخية لا يُنشئ خدمةً ثانية.**
// (هـ) **والرفضُ على البقيّة التاريخية لا يُنشئ خدمةً ولا يشحن السعرَ الكامل.**
// (و) **والمجّانيُّ خدمةٌ حقيقية بقيمةٍ صفر** — تُطبَّق فوراً، جلسةٌ تُعدّ،
//     وبلا دينار.
// (ز–ل) **والمراجعةُ الإشرافية قدرةٌ منفصلة عن التوقيع** (خارج نطاق هذا
//     التصحيح — لا علاقةَ لها بطابور الخصم)، بحدود الفرع، وبإرجاعٍ يُخرج
//     الطلبَ من الطابور ويسمح ببديلٍ مصحَّح.

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

const PORT = 6871;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-اتفاق-الاستقبال";
const ADMIN = 9941, RECV = 9942, MGR = 9943, MGR2 = 9944, DOC = 9945, RECV2 = 9946;

const perms = { canViewPatients: true, canAddPatients: true, canEnterSessions: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2],
    displayName: "adm", permissions: { ...perms, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "recv", permissions: perms },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "recv2", permissions: perms },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "mgr", permissions: perms },
  mgr2: { userId: MGR2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "mgr2", permissions: perms },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "doc", permissions: { ...perms, canWriteMedicalExam: true } },
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

const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE source_type = 'payment' AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids})))`);
  await q(`DELETE FROM journal_entries WHERE source_type = 'payment' AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM submission_tokens WHERE token LIKE 'tok-agreement-%'`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mk(name: string, opts: {
  branchId?: number; physio?: boolean; prosthetic?: boolean; classification?: string;
} = {}): Promise<number> {
  const branchId = opts.branchId ?? 1;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, referral_source, age, height, weight, amputation_site,
       medical_condition, branch_id, is_amputee, is_physiotherapy, total_cost,
       patient_classification)
     VALUES ($1,$2,'40','172','78','احادي - طرف سفلي - يمين - تحت الركبة','x',
             $3,$4,$5,0,$6)
     RETURNING id`,
    [name, MARK, branchId, Boolean(opts.prosthetic), Boolean(opts.physio),
      opts.classification ?? "new"]);
  const id = r[0].id;
  for (const [flag, type] of [
    [opts.physio, "physiotherapy"], [opts.prosthetic, "prosthetic"],
  ] as [boolean | undefined, string][]) {
    if (flag) {
      await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
               VALUES ($1,$2,'active',$3) ON CONFLICT DO NOTHING`, [id, type, branchId]);
    }
  }
  return id;
}

/** لقطةُ كلِّ ما يجب ألّا يتحرّك قبل الاعتماد. */
async function money(patientId: number) {
  const one = async (sqlText: string) =>
    Number((await q<{ c: number }>(sqlText, [patientId]))[0].c);
  return {
    totalCost: Number((await q(`SELECT total_cost c FROM patients WHERE id=$1`, [patientId]))[0].c),
    payments: await one(`SELECT COUNT(*)::int c FROM payments WHERE patient_id=$1`),
    paid: await one(`SELECT COALESCE(SUM(amount),0)::int c FROM payments WHERE patient_id=$1`),
    sessions: await one(`SELECT COALESCE(SUM(session_count),0)::int c FROM payments WHERE patient_id=$1`),
    costEntries: await one(`SELECT COUNT(*)::int c FROM cost_entries WHERE patient_id=$1`),
    caseCost: await one(`SELECT COALESCE(SUM(cost),0)::int c FROM patient_cases WHERE patient_id=$1`),
    visits: await one(`SELECT COUNT(*)::int c FROM visits WHERE patient_id=$1 AND deleted_at IS NULL`),
    journal: await one(
      `SELECT COUNT(*)::int c FROM journal_entries
        WHERE source_type = 'payment'
          AND source_id IN (SELECT id FROM payments WHERE patient_id=$1)`),
  };
}

const newService = (session: any, patientId: number, body: any) =>
  http("POST", `/api/patients/${patientId}/new-service`, session, body);

/** طلبُ جلسةٍ واحدة «أجهزة علاج طبيعي» — سعرُها القياسي ٢٥,٠٠٠. */
const sessionBody = (token: string, extra: any = {}) => ({
  serviceType: "additional_therapy",
  serviceCost: 25000,
  initialPayment: 25000,
  submissionToken: token,
  treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 25000 }],
  paymentTreatmentType: "أجهزة علاج طبيعي",
  sessionCount: 1,
  ...extra,
});

const pendingFor = async (patientId: number) =>
  await q(`SELECT * FROM service_discount_requests WHERE patient_id=$1 ORDER BY id DESC`, [patientId]);

const decideDiscount = (session: any, id: number, body: any) =>
  http("POST", `/api/discounts/${id}/decide`, session, body);

/**
 * **صفٌّ تاريخيّ محاكًى** — بقيّةٌ من قبل التطبيق الفوريّ.
 *
 * ══ لماذا إدراجٌ مباشر لا نداءُ النقطة (تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨) ═════
 * `applyDiscountImmediately` تُدرج الصفَّ **وتحسمه فوراً في المعاملة
 * نفسها** (`npm run test:discount`)، فلا بابَ حيّاً يترك صفّاً `pending`
 * خارج معاملته بعد اليوم. والبابُ التاريخيّ `/api/discounts/:id/decide`
 * يبقى قانونياً بحرفه لبقيّةٍ حقيقية — صفوفٍ من قبل هذا التغيير — وهذه
 * الدالّة تبني تلك البقيّةَ بإدراجٍ مباشر، تماماً كما تبقى فعلياً.
 *
 * ══ و`initialPayment` يبقى `null` افتراضياً — **لا اختراعَ مالٍ** (تصحيحٌ
 *    لاحقٌ ثانٍ، يُلغي ويستبدل محاولةً أولى افترضت قبضاً كاملاً) ═════════
 * البقيّةُ التاريخية الحقيقية **لا تحمل مبلغاً محفوظاً** — لم تُسجَّل هذه
 * الواقعةُ يومَها، ولا يجوز أن يُفترَض قبضٌ كاملٌ لم يُثبِته أحد (نفسُ درس
 * ٠٣٨/٠٣٥). فالمحاكاةُ الأمينة تُبقيه غائباً كما هو دائماً؛ ومَن يحتاج
 * صفّاً يحمل مبلغاً محفوظاً فعلاً (لإثبات أن المحفوظ يسود ولا يُستبدَل)
 * يمرّره صراحةً عبر `opts.initialPayment`.
 */
async function mkHistoricalPending(patientId: number, opts: {
  originalPrice: number; finalPrice: number; isFree?: boolean; reason?: string;
  entries?: { treatmentType: string; sessionCount: number }[];
  initialPayment?: number | null;
}): Promise<number> {
  const isFree = opts.isFree === true;
  const finalPrice = isFree ? 0 : opts.finalPrice;
  const discountAmount = opts.originalPrice - finalPrice;
  const discountPercentage = Math.round((discountAmount / opts.originalPrice) * 10000) / 100;
  const entries = opts.entries ?? [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1 }];
  const payload = {
    kind: "new_service", serviceType: "additional_therapy",
    entries, serviceNotes: null,
    paymentTreatmentType: entries.map((e) => e.treatmentType).join("، "),
    sessionCount: entries.reduce((s, e) => s + e.sessionCount, 0),
    initialPayment: opts.initialPayment ?? null,
  };
  const r = await q<{ id: number }>(
    `INSERT INTO service_discount_requests
       (patient_id, branch_id, department, context_ref, original_price,
        proposed_final_price, discount_amount, discount_percentage, is_free,
        reason, status, payload, requested_by, requested_by_name)
     VALUES ($1, 1, 'physiotherapy', NULL, $2, $3, $4, $5, $6, $7, 'pending', $8::jsonb, $9, 'استعلامات')
     RETURNING id`,
    [patientId, opts.originalPrice, finalPrice, discountAmount, discountPercentage, isFree,
      isFree ? "donation_dr_yasir" : (opts.reason ?? "humanitarian"),
      JSON.stringify(payload), RECV]);
  return r[0].id;
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, spec] of [
    [ADMIN, "admin", 1, null], [RECV, "reception", 1, null], [RECV2, "reception", 1, null],
    [MGR, "branch_manager", 1, null], [MGR2, "branch_manager", 2, null],
    [DOC, "doctor", 1, JSON.stringify(["prosthetic", "medical_support"])],
  ] as any[]) {
    await q(`INSERT INTO system_users
             (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
              medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true,$6::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, medical_specialties=EXCLUDED.medical_specialties,
               is_active=true`,
      [id, `ra_u${id}`, role, b, JSON.stringify([b]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise<void>((r) => httpServer.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══ أ. السعرُ الكامل يمضي فوراً ═══════════════════════════════════
    console.log("\n── أ. السعر الكامل ──");
    const pA = await mk("أ — سعر كامل", { physio: true });
    const rA = await newService(S.recv, pA, sessionBody("tok-agreement-a"));
    same("أ. الخدمةُ تُسجَّل فوراً", rA.status, 200);
    same("   ولا طلبَ اعتمادٍ أُنشئ", (await pendingFor(pA)).length, 0);
    const mA = await money(pA);
    same("   والكلفةُ ٢٥,٠٠٠", mA.totalCost, 25000);
    same("   ودفعةٌ واحدة بها", [mA.payments, mA.paid], [1, 25000]);
    same("   وجلسةٌ واحدة مشتراة", mA.sessions, 1);
    check(mA.costEntries === 1, "   وقيدُ كلفةٍ واحد", String(mA.costEntries));
    same("   وكلفةُ الحالة تساوي كلفةَ المريض", mA.caseCost, 25000);
    check(mA.visits === 1, "   وزيارةٌ واحدة", String(mA.visits));

    // ══ ب. المخفَّضُ يُطبَّق فوراً بأثرٍ ماليّ كامل ═══════════════════
    //
    //  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل ═══════════════
    //  كان الخصمُ هنا يفتح طلباً معلَّقاً بلا أثرٍ ماليّ، ينتظر مديرَ الفرع.
    //  اليوم لا طابورَ يخصّ الخصمَ وحده: مَن يملك تنفيذ الخدمة بسعرها
    //  الكامل (والاستقبالُ منهم) يملك تنفيذَها بخصمٍ صحيح — فيُطبَّق فوراً
    //  بحفظٍ واحد (`applyDiscountImmediately`، `npm run test:discount`).
    console.log("\n── ب. الخصم يُطبَّق فوراً ──");
    const pB = await mk("ب — خصم", { physio: true });
    const before = await money(pB);
    const rB = await newService(S.recv, pB, sessionBody("tok-agreement-b", {
      discount: { finalPrice: 12500, isFree: false, reason: "humanitarian", note: "اتفقنا على النصف" },
    }));
    same("ب. الخدمةُ تُنفَّذ فوراً بالسعر المخفَّض",
      [rB.status, rB.body?.success, Number(rB.body?.newTotalCost)], [201, true, 12500]);
    const reqsB = await pendingFor(pB);
    same("   صفٌّ واحدٌ معتمَدٌ فوراً — لا `pending` أبداً خارج معاملته",
      [reqsB.length, reqsB[0]?.status], [1, "approved"]);
    same("   بالسعرين الصحيحين",
      [Number(reqsB[0].original_price), Number(reqsB[0].proposed_final_price)], [25000, 12500]);
    same("   وبنسبةِ خصمٍ ٥٠٪", Number(reqsB[0].discount_percentage), 50);
    check(String(reqsB[0].payload?.kind) === "new_service",
      "   وحمولتُه «خدمة جديدة»", JSON.stringify(reqsB[0].payload));
    check(reqsB[0].payload?.finalPrice === undefined
      && reqsB[0].payload?.serviceCost === undefined,
    "   **ولا سعرَ داخل الحمولة** — الصفُّ هو المصدر", JSON.stringify(reqsB[0].payload));
    //  ══ **والأثرُ الماليُّ كاملٌ فوراً** — لا فرقَ عن السعر الكامل إلّا
    //  أن المبلغَ أقلّ (قارِن بالقسم أ أعلاه، الفرقُ رقمٌ لا مسار) ══
    const afterB = await money(pB);
    same("   والكلفةُ ١٢,٥٠٠ فوراً", afterB.totalCost, 12500);
    same("   ودفعةٌ واحدة بها", [afterB.payments, afterB.paid], [1, 12500]);
    same("   وجلسةٌ واحدة مشتراة", afterB.sessions, 1);
    check(afterB.costEntries === before.costEntries + 1, "   وقيدُ كلفةٍ واحدٌ جديد",
      `${before.costEntries} ⟶ ${afterB.costEntries}`);
    same("   وكلفةُ الحالة تساوي كلفةَ المريض", afterB.caseCost, 12500);
    check(afterB.visits === 1, "   وزيارةٌ واحدة", String(afterB.visits));

    //  ورمزُ الإرسالة يمنع طلباً ثانياً من الضغطة نفسها — **حارسٌ منفصل
    //  تماماً** (`submission_tokens`) لا علاقةَ له بحالة صفّ الخصم، فلم
    //  يتأثّر بتقاعد الاعتماد المؤجَّل إطلاقاً.
    const dupB = await newService(S.recv, pB, sessionBody("tok-agreement-b", {
      discount: { finalPrice: 12500, isFree: false, reason: "humanitarian" },
    }));
    same("   وإعادةُ الإرسال بنفس الرمز لا تُنشئ طلباً ثانياً",
      [dupB.body?.duplicate, (await pendingFor(pB)).length], [true, 1]);

    //  ══ **والسعرُ الأصليُّ يُحسب في الخادم لا يُقبل من العميل** ═══════
    //  عميلٌ يعلن أصلاً ملفَّقاً منخفضاً يجعل الخصمَ يبدو صغيراً، فيمرّ
    //  على المعتمِد ما لم يكن ليمرّ. والجدولُ المشترك هو الحكم.
    const pB2 = await mk("ب.ب — أصلٌ ملفَّق", { physio: true });
    await newService(S.recv, pB2, sessionBody("tok-agreement-b2", {
      serviceCost: 8000,
      treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 8000 }],
      discount: { finalPrice: 4000, isFree: false, reason: "humanitarian" },
    }));
    const reqB2 = (await pendingFor(pB2))[0];
    same("ب.ب **والأصلُ المسجَّل ٢٥,٠٠٠ لا ٨,٠٠٠ التي أعلنها العميل**",
      Number(reqB2?.original_price), 25000);
    same("   والخصمُ يُحسب على الأصل الحقيقيّ (٨٤٪)",
      Number(reqB2?.discount_percentage), 84);

    // ══ ج. والبابُ التاريخيُّ يبقى قانونياً بحرفه لبقيّةٍ حقيقية ═══════
    //
    //  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل ═══════════════
    //  صفُّ (ب) أُقفل معتمَداً في معاملة تطبيقه — فمحاولةُ حسمه من البابِ
    //  التاريخيّ تُردّ **٤٠٩ بلا مسّ المال**؛ وبقيّةٌ تاريخية حقيقية (من
    //  قبل هذا التغيير، تُبنى هنا بإدراجٍ مباشر) تُحسَم عبر البابِ نفسِه
    //  **بحرفه** فتُنفَّذ الخدمةُ بالسعر المعتمد — تماماً كما كانت.
    console.log("\n── ج. البابُ التاريخيّ ──");
    const reOpen = await decideDiscount(S.mgr, Number(reqsB[0].id), { decision: "approve" });
    same("ج. **ومحاولةُ حسم صفٍّ اكتمل فوراً تُردّ ٤٠٩**", reOpen.status, 409);
    same("   ولا أثرَ ماليّاً ثانياً", await money(pB), afterB);

    // ══ ج.أ بقيّةٌ تاريخية **بلا مبلغٍ محفوظ** — لا اختراعَ مالٍ (تصحيحٌ
    //      لاحقٌ ثانٍ، يُلغي محاولةً أولى افترضت قبضاً كاملاً بالخطأ) ═══
    //  الصفُّ لا يحمل `initialPayment` — لم تُسجَّل هذه الواقعةُ يومَها.
    //  فحسمُه **بلا** أن يكتب المُنجِز المبلغَ الفعليّ الآن يُرفَض — نفسُ
    //  حارس «خدمة جديدة» المباشرة بعينه، مطبَّقاً على هذا الباب. ولمّا
    //  يكتب المبلغَ الحقيقيّ ينجح الحسمُ، والمقيَّدُ هو ما كتبه بالضبط —
    //  لا السعرَ المتَّفقَ عليه المخمَّن.
    const pC = await mk("ج — بقيّةٌ تاريخية", { physio: true });
    const beforeC = await money(pC);
    const reqC = await mkHistoricalPending(pC, { originalPrice: 25000, finalPrice: 12500 });

    const blockedC = await decideDiscount(S.mgr, reqC, { decision: "approve" });
    same("ج.أ. **وحسمٌ بلا مبلغٍ مدفوعٍ يُردّ ٤٠٠**", blockedC.status, 400);
    check(String(blockedC.body?.error ?? "").includes("أدخل المبلغ المدفوع الآن"),
      "برسالةٍ صريحة", JSON.stringify(blockedC.body));
    same("   **وصفرُ أثرٍ كامل** — لا كلفةَ ولا دفعة", await money(pC), beforeC);
    const stillPendingC = await q(
      `SELECT status FROM service_discount_requests WHERE id=$1`, [reqC]);
    same("   **والصفُّ باقٍ `pending`** — لم يُقفَل بلا مالٍ حقيقيّ", stillPendingC[0]?.status, "pending");

    const okC = await decideDiscount(S.mgr, reqC, { decision: "approve", initialPayment: 12500 });
    same("   **وبعد إدخال المبلغ الفعليّ يحسم البابُ التاريخيُّ بنجاح**", okC.status, 200);
    const mC = await money(pC);
    same("   والكلفةُ صارت ١٢,٥٠٠", mC.totalCost, 12500);
    same("   ودفعةٌ واحدة بالمبلغ المُدخَل بالضبط — لا السعرِ المتَّفقِ عليه المخمَّن",
      [mC.payments, mC.paid], [1, 12500]);
    same("   **وجلسةٌ واحدة بالضبط**", mC.sessions, 1);
    same("   وكلفةُ الحالة تساوي كلفةَ المريض", mC.caseCost, 12500);
    check(mC.visits === 1, "   وزيارةٌ واحدة", String(mC.visits));
    //  **الثابتُ الملزم**: مجموعُ قيود الدفتر = كلفةُ المريض.
    const ledgerC = Number((await q(
      `SELECT COALESCE(SUM(amount),0)::int c FROM cost_entries WHERE patient_id=$1`, [pC]))[0].c);
    same("   **ومجموعُ قيود الدفتر = الكلفة**", ledgerC, 12500);
    check(mC.paid > beforeC.paid, "   والأثرُ حقيقيٌّ لا وهميّ", JSON.stringify([beforeC, mC]));

    // ══ ج.ب وصفٌّ يحمل مبلغاً محفوظاً فعلاً — المحفوظُ يسود ولا يُستبدَل ══
    //  صفٌّ نادرٌ يحمل `initialPayment` حقيقياً من قبل هذا التصحيح. حسمُه
    //  **بلا** أيّ مبلغٍ في طلب الحسم ينجح بالمحفوظ نفسه — لا يُطلَب من
    //  المُنجِز إعادةَ إدخال رقمٍ موجودٍ أصلاً، ولا رقمٌ آخرَ يُرسَل معه
    //  فيُستبدَل به المحفوظُ الحقيقيّ.
    const pCb = await mk("ج.ب — بمبلغٍ محفوظ فعلاً", { physio: true });
    const reqCb = await mkHistoricalPending(pCb,
      { originalPrice: 25000, finalPrice: 12500, initialPayment: 9000 });
    const okCb = await decideDiscount(S.mgr, reqCb, { decision: "approve" });
    same("ج.ب. **يحسم بالمحفوظ بلا إدخالٍ جديد**", okCb.status, 200);
    const mCb = await money(pCb);
    same("   **والمقبوضُ هو المحفوظُ ٩,٠٠٠ بالضبط** — لا ١٢,٥٠٠ الاتّفاق",
      [mCb.payments, mCb.paid], [1, 9000]);

    // ══ ج.ج بقيّةٌ تاريخية غيرُ مجّانية — «تعديل واعتماد» يقرّرها مجّانيةً
    //      صراحةً: التنفيذُ يتّبع القرارَ الجديد لا المخزَّنَ القديم
    //      (تصحيحٌ لاحقٌ ثالث — قيمةٌ بائتة) ═══════════════════════════
    //  صفٌّ أُدرج **غيرَ مجّانيّ** (`is_free = false`). والمشرفُ في «تعديل
    //  واعتماد» يقرّر الآن أنها مجّانيةٌ صراحةً — نفسُ ما ترسله الشاشةُ
    //  فعلياً (`finalPrice: 0, isFree: true` معاً، لا `isFree` وحده: بدون
    //  `finalPrice` صريح لا يُعاد حسابُ الخصم أصلاً — راجع `changing` في
    //  `decideDiscountTx`). **العطبُ**: كان التنفيذُ الفعليّ يستعمل
    //  `req.isFree` القديم (`false`) رغم أن الصفَّ يُختَم `is_free = true`
    //  بصدق — فتُسجَّل الدفعةُ «غير مجّانية بمبلغٍ صفر» بدل «مجّانيةٍ
    //  صريحة»، وهذا بالضبط ما يحاول حارسُ الدفع الإلزاميّ منعَه.
    const pCc = await mk("ج.ج — تعديلٌ إلى مجّاني", { physio: true });
    const reqCc = await mkHistoricalPending(pCc,
      { originalPrice: 25000, finalPrice: 12500, isFree: false });
    const storedCc = await q(`SELECT is_free FROM service_discount_requests WHERE id=$1`, [reqCc]);
    same("ج.ج. الصفُّ المخزَّنُ غيرُ مجّانيّ أصلاً", storedCc[0]?.is_free, false);

    const okCc = await decideDiscount(S.mgr, reqCc,
      { decision: "approve", finalPrice: 0, isFree: true });
    same("   **و«تعديل واعتماد» إلى مجّانيّ صراحةً ينجح**", okCc.status, 200);
    const mCc = await money(pCc);
    same("   **بلا أثرٍ ماليّ — لا كلفةَ ولا مقبوض**",
      [mCc.totalCost, mCc.paid, mCc.caseCost], [0, 0, 0]);
    same("   **وجلسةٌ واحدة مسجَّلة رغم المجّانيّة**", mCc.sessions, 1);
    const rowCc = await q(
      `SELECT is_free_sessions f, amount a, session_count s
         FROM payments WHERE patient_id=$1`, [pCc]);
    same("   **والدفعةُ موسومةٌ مجّانيةً صراحةً — لا «غير مجّانية بصفر»**"
      + " (هذا هو العطبُ الذي يصلحه هذا التصحيح)",
    [rowCc.length, rowCc[0]?.f, Number(rowCc[0]?.a), Number(rowCc[0]?.s)], [1, true, 0, 1]);
    const decidedCc = await q(
      `SELECT is_free f, approved_final_price p FROM service_discount_requests WHERE id=$1`,
      [reqCc]);
    same("   والصفُّ نفسُه مختومٌ مجّانياً بالسعر الصحيح",
      [decidedCc[0]?.f, Number(decidedCc[0]?.p)], [true, 0]);

    // ══ د. اعتمادٌ ثانٍ على البقيّة التاريخية لا يُكرّر ════════════════
    console.log("\n── د. الاعتماد المكرَّر ──");
    const twice = await decideDiscount(S.mgr, reqC, { decision: "approve" });
    same("د. الثاني يُردّ ٤٠٩", twice.status, 409);
    same("   **ولا خدمةَ ولا دفعةَ ولا جلسةَ ثانية**", await money(pC), mC);

    // ══ هـ. والرفضُ على البقيّة التاريخية لا يُنشئ شيئاً ════════════════
    //  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ ═══════════════════════════════════════
    //  لا صفَّ `pending` يُنتجه `/new-service` بعد اليوم لِيُرفَض — فتُبنى
    //  البقيّةُ بإدراجٍ مباشر، والرفضُ نفسُه بحرفه القديم.
    console.log("\n── هـ. الرفض ──");
    const pE = await mk("هـ — رفض", { physio: true });
    const beforeE = await money(pE);
    const reqE = await mkHistoricalPending(pE, { originalPrice: 25000, finalPrice: 5000 });
    same("هـ. الرفضُ يمرّ",
      (await decideDiscount(S.mgr, reqE, { decision: "reject" })).status, 200);
    same("   **ولا خدمةَ وقعت ولا سعرٌ كاملٌ شُحن**", await money(pE), beforeE);
    same("   والصفُّ مرفوض",
      String((await pendingFor(pE))[0].status), "rejected");

    // ══ و. المجّانيُّ الصريح — يُطبَّق فوراً ════════════════════════════
    //  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ ═══════════════════════════════════════
    console.log("\n── و. مجّاني صريح ──");
    const pF = await mk("و — مجّاني", { physio: true });
    const rF = await newService(S.recv, pF, sessionBody("tok-agreement-f", {
      discount: { finalPrice: 0, isFree: true, reason: "" },
    }));
    same("و. الخدمةُ تُنفَّذ فوراً مجّاناً",
      [rF.status, rF.body?.success, Number(rF.body?.newTotalCost)], [201, true, 0]);
    const reqF = (await pendingFor(pF))[0];
    same("   بسعرٍ أصليٍّ موجبٍ ونهائيٍّ صفر، ومعتمَدٌ فوراً",
      [Number(reqF.original_price), Number(reqF.proposed_final_price), reqF.is_free, reqF.status],
      [25000, 0, true, "approved"]);
    const mF = await money(pF);
    same("   **الجلسةُ حقيقيةٌ وقيمتُها صفر فوراً**", [mF.sessions, mF.paid, mF.totalCost], [1, 0, 0]);
    check(mF.visits === 1, "   وزيارةٌ واحدة", String(mF.visits));
    const freeRow = await q(
      `SELECT is_free_sessions f, session_count s FROM payments WHERE patient_id=$1`, [pF]);
    same("   والدفعةُ موسومةٌ «جلسات مجّانية»",
      [freeRow.length, freeRow[0]?.f, Number(freeRow[0]?.s)], [1, true, 1]);

    //  ══ **والبابُ التاريخيُّ يحسم مجّانيّةً موروثةً بحرفه** ═══════════════
    const pF3 = await mk("و.ج — مجّاني تاريخيّ", { physio: true });
    const reqF3 = await mkHistoricalPending(pF3, { originalPrice: 25000, finalPrice: 0, isFree: true });
    same("   والاعتمادُ التاريخيُّ يمرّ",
      (await decideDiscount(S.mgr, reqF3, { decision: "approve" })).status, 200);
    const mF3 = await money(pF3);
    same("   **الجلسةُ حقيقيةٌ وقيمتُها صفر عبر البابِ التاريخيّ أيضاً**",
      [mF3.sessions, mF3.paid, mF3.totalCost], [1, 0, 0]);

    // ══ الصفرُ وحده ليس تبرّعاً ═══════════════════════════════════════
    const pF2 = await mk("و.ب — صفر بلا إعلان", { physio: true });
    const zero = await newService(S.recv, pF2, sessionBody("tok-agreement-f2", {
      discount: { finalPrice: 0, isFree: false, reason: "humanitarian" },
    }));
    same("و.ب والصفرُ بلا إعلانِ تبرّعٍ يُردّ", zero.status, 400);
    same("   ولا طلبَ ولا مال", (await pendingFor(pF2)).length, 0);

    // ══ م. السعرُ القياسيُّ لا يُلتفّ عليه من حقل الكلفة ═══════════════
    console.log("\n── م. لا التفافَ على الخصم ──");
    const pM = await mk("م — التفاف", { physio: true });
    const beforeM = await money(pM);
    const sneak = await newService(S.recv, pM, sessionBody("tok-agreement-m", {
      serviceCost: 12500,   // القياسيُّ ٢٥,٠٠٠ — وبلا حقل خصمٍ إطلاقاً
      treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 12500 }],
      initialPayment: 12500,
    }));
    same("م. **مبلغٌ أقلُّ من القياسيّ بلا خصمٍ يُردّ ٤٠٠**", sneak.status, 400);
    check(String(sneak.body?.message ?? "").includes("خصم أو خدمة مجّانية"),
      "   برسالةٍ تدلّ على الباب الصحيح", String(sneak.body?.message));
    //  ══ حارسُ ارتداد — لا صياغةَ اعتمادٍ في رسالةٍ حيّة (تصحيحٌ لاحق) ═══
    //  كانت الرسالةُ تقول «فيُعتمَد» — بقيّةٌ من قبل تقاعد اعتماد الخصم
    //  الحيّ (٢٦٠). فحصٌ صريح يمنع عودتها: لا «اعتماد» في أيّ صياغته، ولا
    //  «معتمِد»، والرسالةُ تقول التطبيقَ الفوريّ صراحةً بدل ذلك.
    check(!/اعتماد|يُعتمَد|معتمِد/.test(String(sneak.body?.message ?? "")),
      "   **ولا صياغةَ اعتمادٍ فيها بأيّ شكل** — لا اعتمادَ بعد اليوم",
      String(sneak.body?.message));
    check(/يُطبَّق مباشرةً/.test(String(sneak.body?.message ?? "")),
      "   **وتقول صراحةً إن الخصمَ يُطبَّق مباشرةً عند الحفظ**",
      String(sneak.body?.message));
    same("   **ولا خدمةَ ولا مال ولا جلسة**", await money(pM), beforeM);
    same("   ولا طلبَ خصمٍ أُنشئ", (await pendingFor(pM)).length, 0);

    //  وكلفةُ السطر المضخَّمة لا تُصدَّق: القياسيُّ يحكم، والحسابُ لا ينحرف.
    const pM2 = await mk("م.ب — سطرٌ مضخَّم", { physio: true });
    const inflated = await newService(S.recv, pM2, sessionBody("tok-agreement-m2", {
      serviceCost: 25000,
      treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 100000 }],
      initialPayment: 25000,
    }));
    same("م.ب والخدمةُ تمرّ بالقياسيّ", inflated.status, 200);
    const mM2 = await money(pM2);
    same("   **وكلفةُ السطر ١٠٠,٠٠٠ لم تُصدَّق**",
      [mM2.totalCost, mM2.caseCost, mM2.paid], [25000, 25000, 25000]);

    // ══ ن. الخصمُ على نوعين يحفظ جلسات النوعين ════════════════════════
    console.log("\n── ن. نوعان مع خصم ──");
    //  روبوت ٥٠,٠٠٠ + أجهزة ٢٥,٠٠٠ = ٧٥,٠٠٠ قياسيّاً.
    const twoTypes = (token: string, extra: any = {}) => ({
      serviceType: "additional_therapy",
      serviceCost: 75000,
      initialPayment: 75000,
      submissionToken: token,
      treatmentEntries: [
        { treatmentType: "روبوت", sessionCount: 1, cost: 50000 },
        { treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 25000 },
      ],
      paymentTreatmentType: "روبوت، أجهزة علاج طبيعي",
      sessionCount: 2,
      ...extra,
    });
    const typesOf = async (patientId: number) =>
      (await q<{ t: string; s: number }>(
        `SELECT payment_treatment_type t, session_count s FROM payments
          WHERE patient_id=$1 ORDER BY payment_treatment_type`, [patientId]))
        .map((r) => `${r.t}:${r.s}`);

    //  ن.أ — بالسعر الكامل: النوعان مسجَّلان.
    const pN1 = await mk("ن.أ — نوعان كامل", { physio: true });
    same("ن.أ الخدمةُ تمرّ", (await newService(S.recv, pN1, twoTypes("tok-agreement-n1"))).status, 200);
    same("   والنوعان مسجَّلان بجلستيهما",
      await typesOf(pN1), ["أجهزة علاج طبيعي:1", "روبوت:1"]);
    same("   والكلفةُ ٧٥,٠٠٠", (await money(pN1)).totalCost, 75000);

    //  ن.ب — بخصمٍ إلى ٤٠,٠٠٠: **يُطبَّق فوراً**، والنوعان يبقيان، والمجموعُ
    //  يطابق المعتمَد.
    //  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل ═══════════════
    const pN2 = await mk("ن.ب — نوعان بخصم", { physio: true });
    const rN2 = await newService(S.recv, pN2, twoTypes("tok-agreement-n2", {
      discount: { finalPrice: 40000, isFree: false, reason: "humanitarian" },
    }));
    same("ن.ب الخدمةُ تُنفَّذ فوراً بأصلٍ ٧٥,٠٠٠",
      [rN2.status, Number(rN2.body?.newTotalCost)], [201, 40000]);
    const reqN2 = (await pendingFor(pN2))[0];
    same("   والطلبُ معتمَدٌ فوراً بأصلٍ ٧٥,٠٠٠", [Number(reqN2?.original_price), reqN2?.status],
      [75000, "approved"]);
    same("   **والنوعان باقيان بجلستيهما رغم الخصم**",
      await typesOf(pN2), ["أجهزة علاج طبيعي:1", "روبوت:1"]);
    const mN2 = await money(pN2);
    same("   ومجموعُ الدفعات = المعتمَد بالضبط", mN2.paid, 40000);
    same("   وكلفةُ المريض = كلفةُ الحالة = المعتمَد",
      [mN2.totalCost, mN2.caseCost], [40000, 40000]);
    same("   ومجموعُ الجلسات اثنتان", mN2.sessions, 2);
    same("   ومجموعُ قيود الدفتر = الكلفة", Number((await q(
      `SELECT COALESCE(SUM(amount),0)::int c FROM cost_entries WHERE patient_id=$1`,
      [pN2]))[0].c), 40000);
    //  والتوزيعُ تناسبيّ: ٥٠/٧٥ × ٤٠,٠٠٠ ≈ ٢٦,٦٦٧ و٢٥/٧٥ ≈ ١٣,٣٣٣.
    const linesN2 = (await q<{ a: number; t: string }>(
      `SELECT amount a, payment_treatment_type t FROM payments
        WHERE patient_id=$1 ORDER BY amount DESC`, [pN2])).map((r) => Number(r.a));
    same("   والتوزيعُ تناسبيٌّ مجموعُه المعتمَد", [linesN2, linesN2[0] + linesN2[1]],
      [[26667, 13333], 40000]);

    //  ن.ج — ومحاولةُ حسمٍ من البابِ التاريخيّ على صفٍّ اكتمل فوراً تُردّ
    //  ٤٠٩ ولا تُضاعف شيئاً.
    same("ن.ج محاولةُ الحسم على صفٍّ مكتمل تُردّ ٤٠٩",
      (await decideDiscount(S.mgr, Number(reqN2.id), { decision: "approve" })).status, 409);
    same("   **ولا جلساتٍ مكرّرة**", await money(pN2), mN2);

    //  ن.هـ — **بندٌ نصيبُه من المال صفر تبقى جلستُه** — يُطبَّق فوراً.
    //  خطُّ دفاعٍ ثانٍ خلف التوزيع التناسبيّ: بندٌ سعرُه الأصليّ صفر
    //  (استشارة) يحمل جلسات ⟶ نصيبُه صفرٌ مهما كان المعتمَد. وقبل الإصلاح
    //  كان شرطُ `cost > 0` يُسقط صفَّه، فتضيع جلساتُه من العدّاد نهائياً.
    const pN4 = await mk("ن.هـ — بندٌ بلا سعر", { physio: true });
    const rN4 = await newService(S.recv, pN4, {
      serviceType: "additional_therapy",
      serviceCost: 50000,
      initialPayment: 50000,
      submissionToken: "tok-agreement-n4",
      treatmentEntries: [
        { treatmentType: "روبوت", sessionCount: 1, cost: 50000 },
        { treatmentType: "استشارة طبية", sessionCount: 2, cost: 0 },
      ],
      paymentTreatmentType: "روبوت، استشارة طبية",
      sessionCount: 3,
      discount: { finalPrice: 30000, isFree: false, reason: "humanitarian" },
    });
    same("ن.هـ الخدمةُ تُنفَّذ فوراً", rN4.status, 201);
    same("   **والبندُ الذي نصيبُه صفر بقيت جلساتُه**",
      await typesOf(pN4), ["استشارة طبية:2", "روبوت:1"]);
    const mN4 = await money(pN4);
    same("   ومجموعُ الدفعات = المعتمَد", mN4.paid, 30000);
    same("   ومجموعُ الجلسات ثلاث", mN4.sessions, 3);

    //  ن.د — تبرّعٌ صريح على نوعين: يُطبَّق فوراً، والجلستان تبقيان بقيمةٍ صفر.
    const pN3 = await mk("ن.د — نوعان مجّاناً", { physio: true });
    const rN3 = await newService(S.recv, pN3, twoTypes("tok-agreement-n3", {
      discount: { finalPrice: 0, isFree: true, reason: "" },
    }));
    same("ن.د الخدمةُ تُنفَّذ فوراً مجّاناً", rN3.status, 201);
    same("   **والنوعان باقيان بجلستيهما**",
      await typesOf(pN3), ["أجهزة علاج طبيعي:1", "روبوت:1"]);
    const mN3 = await money(pN3);
    same("   وبقيمةٍ ماليّة صفر", [mN3.paid, mN3.totalCost, mN3.caseCost], [0, 0, 0]);
    same("   والجلستان معدودتان", mN3.sessions, 2);

    // ══ ز. مديرُ الفرع يؤشّر «تمت المراجعة» ═══════════════════════════
    console.log("\n── ز. المراجعة الإشرافية ──");
    const pG = await mk("ز — مراجعة", { prosthetic: true });
    const mkReq = async (session: any, patientId: number, path: "quick" | "full") =>
      await http("POST", "/api/medical-review/requests", session, {
        patientId, serviceType: "prosthetic", requestedPath: path, reviewKind: "maintenance",
      });
    const reqG = (await mkReq(S.recv, pG, "quick")).body;
    check(Boolean(reqG?.id), "ز. طلبٌ سريعٌ أُنشئ", JSON.stringify(reqG));
    const ackG = await http("POST", `/api/medical-review/requests/${reqG.id}/decide`, S.mgr,
      { decision: "approve" });
    same("ز. **مديرُ الفرع يؤشّر «تمت المراجعة»**", ackG.status, 200);
    same("   والحالةُ صارت معترَفاً بها", String(ackG.body?.status), "approved");
    same("   **ولا معاينةً كُتبت**",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [pG]))[0].c), 0);

    // ══ ح. والإشرافُ لا يمنح توقيعاً ═════════════════════════════════
    console.log("\n── ح. الإشراف ≠ التوقيع ──");
    const pH = await mk("ح — توقيع", { prosthetic: true });
    const signTry = await http("POST", `/api/medical/patients/${pH}/exams`, S.mgr, {
      caseType: "prosthetic", diagnosis: "محاولة", plan: "خطة",
    });
    check(signTry.status === 403,
      "ح. **مديرُ الفرع لا يوقّع معاينةً ولو راجع إشرافياً**", String(signTry.status));
    same("   ولا صفَّ معاينةٍ وُلد",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [pH]))[0].c), 0);
    const reqH = (await mkReq(S.recv, pH, "quick")).body;
    same("   **ولا يطلب معاينةً كاملة — قرارٌ سريريّ**",
      (await http("POST", `/api/medical-review/requests/${reqH.id}/decide`, S.mgr,
        { decision: "require_full_exam" })).status, 403);

    // ══ ط. إرجاعُ الطلب السريع ثمّ بديلٌ مصحَّح ═══════════════════════
    console.log("\n── ط. إرجاع السريع ──");
    const noReason = await http("POST", `/api/medical-review/requests/${reqH.id}/decide`, S.mgr,
      { decision: "return_to_reception" });
    same("ط. الإرجاعُ بلا سببٍ يُردّ", noReason.status, 400);
    const retI = await http("POST", `/api/medical-review/requests/${reqH.id}/decide`, S.mgr,
      { decision: "return_to_reception", doctorNote: "جهة البتر غير صحيحة — عدّلها وأعد الإرسال" });
    same("   وبالسببِ يمرّ", retI.status, 200);
    same("   والسببُ محفوظٌ في السجلّ",
      String(retI.body?.doctorNote), "جهة البتر غير صحيحة — عدّلها وأعد الإرسال");
    const qAfter = await http("GET", "/api/medical-review/queue", S.mgr);
    check(!(qAfter.body?.rows ?? []).some((r: any) => r.id === reqH.id),
      "   **وخرج من الطابور النشط**");
    const again = await mkReq(S.recv, pH, "quick");
    check(again.status === 201 && again.body?.id !== reqH.id,
      "   **والاستعلاماتُ ترسل بديلاً مصحَّحاً بلا ٤٠٩**",
      `${again.status} ${JSON.stringify(again.body)}`);

    // ══ ي. إرجاعُ طلبِ المعاينة الكاملة من «معايناتي» ════════════════
    console.log("\n── ي. إرجاع الكامل ──");
    //  مريضٌ قديمٌ بحالةٍ نشطة: لا يدخل القائمةَ إلّا بطلبِه الكامل، فخروجُه
    //  منها بعد الإرجاع دليلٌ على أن الطلبَ هو ما أخرجه.
    const pJ = await mk("ي — كامل", { prosthetic: true, classification: "past" });
    const reqJ = (await mkReq(S.recv, pJ, "full")).body;
    check(Boolean(reqJ?.id), "ي. طلبُ معاينةٍ كاملة أُنشئ", JSON.stringify(reqJ));
    const wl1 = await http("GET", "/api/medical/worklist", S.doc);
    check((wl1.body?.rows ?? []).some((r: any) => r.patientId === pJ),
      "   والمريضُ في قائمة «معايناتي»");
    const selfTry = await http("POST", `/api/medical-review/requests/${reqJ.id}/return`, S.recv,
      { reason: "أُصحّحه بنفسي" });
    same("   والاستقبالُ لا يُرجع أصلاً — ليس مشرفاً", selfTry.status, 403);

    //  **ولا يُرجِع المشرفُ طلبَ نفسه**: مديرُ الفرع يملك القدرة كاملةً،
    //  فلو أنشأ طلباً ثم سحبه بنفسه لصار البابُ طريقاً لمحو الأثر. والفحصُ
    //  هنا هو الوحيد الذي يصل الحارسَ فعلاً — الاستقبالُ يسقط قبله.
    const pJ2 = await mk("ي.ب — طلب المدير", { prosthetic: true, classification: "past" });
    const reqJ2 = (await mkReq(S.mgr, pJ2, "full")).body;
    check(Boolean(reqJ2?.id), "   ومديرُ الفرع أنشأ طلباً كاملاً", JSON.stringify(reqJ2));
    same("   **ولا يُرجِع المشرفُ طلبَ نفسه ولو ملك القدرة**",
      (await http("POST", `/api/medical-review/requests/${reqJ2.id}/return`, S.mgr,
        { reason: "سحبٌ ذاتيّ" })).status, 403);
    same("   والطلبُ باقٍ معلَّقاً",
      String((await q(`SELECT status FROM medical_review_requests WHERE id=$1`,
        [reqJ2.id]))[0].status), "pending");
    same("   وغيرُه يستطيع إرجاعَه",
      (await http("POST", `/api/medical-review/requests/${reqJ2.id}/return`, S.doc,
        { reason: "الاختصاص غير صحيح" })).status, 200);
    const retJ = await http("POST", `/api/medical-review/requests/${reqJ.id}/return`, S.doc,
      { reason: "الاختصاص غير صحيح — أعد الإرسال على المساند" });
    same("   وطبيبُ الاختصاص يُرجعه", retJ.status, 200);
    const wl2 = await http("GET", "/api/medical/worklist", S.doc);
    check(!(wl2.body?.rows ?? []).some((r: any) => r.patientId === pJ),
      "   **وخرج من قائمة «معايناتي»**");
    same("   **ولا معاينةً أُنشئت ولا حُذفت**",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [pJ]))[0].c), 0);
    const againJ = await mkReq(S.recv, pJ, "full");
    check(againJ.status === 201,
      "   **والاستعلاماتُ ترسل طلباً جديداً على المرساة نفسها**",
      `${againJ.status} ${JSON.stringify(againJ.body)}`);

    //  ══ **ولا إرجاعَ بعد التوقيع** — خطُّ دفاعٍ ثانٍ ═══════════════════
    //  توقيعُ المعاينة يُغلق الطلبَ بنفسه (`closeRequestsAwaitingExam`)،
    //  لكنّ ذلك الإغلاق **يبتلع خطأه عمداً** كي لا يُسقط توقيعَ سجلٍّ
    //  سريري. فلو سقط، بقي صفٌّ يقول «معلَّق» ومعاينتُه موقّعة — وإرجاعُه
    //  حينئذٍ يزوّر تسلسلاً وقع. لذا يُعاد الصفُّ إلى حاله يدوياً هنا:
    //  هذه هي الحالةُ التي وُضع لها الحارس بالضبط.
    const signed = await http("POST", `/api/medical/patients/${pJ}/exams`, S.doc, {
      caseType: "prosthetic", diagnosis: "تشخيص", plan: "خطة",
    });
    same("   وتوقيعُ المعاينة يمرّ", signed.status, 200);
    await q(`UPDATE medical_review_requests
                SET status='pending', decision=NULL, decided_at=NULL, exam_id=NULL
              WHERE id=$1`, [againJ.body.id]);
    const afterSign = await http("POST", `/api/medical-review/requests/${againJ.body.id}/return`,
      S.doc, { reason: "محاولة إرجاع بعد التوقيع" });
    same("   **ولا يُرجَع طلبٌ وُقّعت معاينتُه — ٤٠٩**", afterSign.status, 409);

    // ══ س. الاختصاصُ يُفرَض في الخادم لا في الشاشة ════════════════════
    console.log("\n── س. حدود الاختصاص ──");
    //  طبيبُ أطرافٍ فقط — يعرف رقمَ طلبِ مسندٍ ويحاول البتّ فيه مباشرةً.
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic"]), DOC]);
    const pS = await mk("س — مساند", { prosthetic: true });
    await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
             VALUES ($1,'medical_support','active',1) ON CONFLICT DO NOTHING`, [pS]);
    const supportReq = (await http("POST", "/api/medical-review/requests", S.recv, {
      patientId: pS, serviceType: "medical_support", requestedPath: "quick",
      reviewKind: "maintenance",
    })).body;
    check(Boolean(supportReq?.id), "س. طلبُ مساندٍ أُنشئ", JSON.stringify(supportReq));
    same("س. **طبيبُ الأطراف لا يبتّ في طلبِ مساند ولو عرف رقمَه**",
      (await http("POST", `/api/medical-review/requests/${supportReq.id}/decide`, S.doc,
        { decision: "approve" })).status, 403);
    //  ومريضٌ ثانٍ للطلب الكامل: فهرسُ التفرّد يسمح بمعلَّقٍ واحدٍ بلا مرساة
    //  لكلّ (مريض، اختصاص) — فطلبان على المريض نفسه يُردّ ثانيهما ٤٠٩.
    const pS2 = await mk("س.ب — مساند كامل", { prosthetic: true, classification: "past" });
    await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
             VALUES ($1,'medical_support','active',1) ON CONFLICT DO NOTHING`, [pS2]);
    const supportFull = (await http("POST", "/api/medical-review/requests", S.recv, {
      patientId: pS2, serviceType: "medical_support", requestedPath: "full",
      reviewKind: "new_device",
    })).body;
    check(Boolean(supportFull?.id), "   وطلبُ معاينةٍ كاملة للمساند أُنشئ",
      JSON.stringify(supportFull));
    same("   ولا يُرجع طلبَ معاينةٍ كاملة في اختصاصٍ ليس له",
      (await http("POST", `/api/medical-review/requests/${supportFull.id}/return`, S.doc,
        { reason: "محاولة" })).status, 403);
    //  وفي اختصاصه يمرّ — فالحارسُ يميّز ولا يحجب الجميع.
    const prosReq = (await mkReq(S.recv, pS, "quick")).body;
    same("   **وفي اختصاصه يمرّ**",
      (await http("POST", `/api/medical-review/requests/${prosReq.id}/decide`, S.doc,
        { decision: "approve" })).status, 200);
    //  ومديرُ الفرع إشرافُه إداريّ فلا يُرشَّح باختصاص — الاثنان في نطاقه.
    same("   **ومديرُ الفرع يؤشّر على المساند أيضاً — إشرافُه إداريّ**",
      (await http("POST", `/api/medical-review/requests/${supportReq.id}/decide`, S.mgr,
        { decision: "approve" })).status, 200);
    same("   والمسؤولُ العام يُرجع المساند في فرعٍ يصله",
      (await http("POST", `/api/medical-review/requests/${supportFull.id}/return`, S.admin,
        { reason: "بيانٌ خاطئ" })).status, 200);
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic", "medical_support"]), DOC]);

    // ══ ع. بابُ المدير إلى الطلبات المنتظرة ═══════════════════════════
    console.log("\n── ع. سطح إشراف المدير ──");
    const pO = await mk("ع — منتظر", { prosthetic: true, classification: "past" });
    const reqO = (await mkReq(S.recv, pO, "full")).body;
    check(Boolean(reqO?.id), "ع. طلبُ معاينةٍ كاملة أُنشئ", JSON.stringify(reqO));
    //  «معايناتي» تبقى للطبيب: المديرُ يقرؤها فارغة — وهذا هو العطبُ الذي
    //  فتح له بابٌ آخر بدل أن تُحوَّل قائمةُ الطبيب إلى قائمة مدير.
    const wlMgr = await http("GET", "/api/medical/worklist", S.mgr);
    same("   و«معايناتي» تبقى فارغةً للمدير — لم تُحوَّل إلى قائمة مدير",
      (wlMgr.body?.rows ?? []).length, 0);
    const qMgr = await http("GET", "/api/medical-review/queue", S.mgr);
    const waiting = (qMgr.body?.awaitingFull ?? []) as any[];
    check(waiting.some((r) => r.id === reqO.id),
      "ع. **والطلبُ يصل المديرَ في قسم «بانتظار الطبيب»**",
      JSON.stringify(waiting.map((r) => r.id)));
    same("   والمديرُ يُرجعه بسبب",
      (await http("POST", `/api/medical-review/requests/${reqO.id}/return`, S.mgr,
        { reason: "الاختصاص غير صحيح — أعد الإرسال" })).status, 200);
    const qAfterO = await http("GET", "/api/medical-review/queue", S.mgr);
    check(!((qAfterO.body?.awaitingFull ?? []) as any[]).some((r) => r.id === reqO.id),
      "   **وخرج من القسم بعد الإرجاع**");
    //  ولا يُعرَض للاستقبال إطلاقاً.
    const qRecv = await http("GET", "/api/medical-review/queue", S.recv);
    same("   ولا يُعرَض القسمُ للاستقبال",
      [(qRecv.body?.awaitingFull ?? []).length, qRecv.body?.canSupervise], [0, false]);

    // ══ ف. الدورُ يسبق الاختصاص في سطح الإشراف ════════════════════════
    console.log("\n── ف. الدور يسبق الاختصاص ──");
    //  **العطب**: مسؤولٌ أو مديرٌ يحمل منحاً سريرياً في الأطراف كان
    //  يُحجَب عنه المساند — فيُضيَّق عليه بسبب صلاحيةٍ زائدة لا ناقصة.
    await q(`UPDATE system_users
                SET can_write_medical_exam = true, medical_specialties = $1::jsonb
              WHERE id = ANY($2::int[])`,
    [JSON.stringify(["prosthetic"]), [ADMIN, MGR]]);

    //  مريضان منتظران: أحدهما أطراف والآخر مساند — ليُقاس ما يصل كلَّ دور.
    const pRolePros = await mk("ف — أطراف", { prosthetic: true, classification: "past" });
    const reqF1 = (await mkReq(S.recv, pRolePros, "full")).body;
    const pRoleSup = await mk("ف — مساند", { prosthetic: true, classification: "past" });
    await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
             VALUES ($1,'medical_support','active',1) ON CONFLICT DO NOTHING`, [pRoleSup]);
    const reqF2 = (await http("POST", "/api/medical-review/requests", S.recv, {
      patientId: pRoleSup, serviceType: "medical_support", requestedPath: "full",
      reviewKind: "new_device",
    })).body;
    check(Boolean(reqF1?.id) && Boolean(reqF2?.id), "ف. طلبان أُنشئا (أطراف ومساند)",
      `${JSON.stringify(reqF1)} ${JSON.stringify(reqF2)}`);

    const specsOf = async (session: any) => {
      const r = await http("GET", "/api/medical-review/queue", session);
      return {
        specialties: [...(r.body?.specialties ?? [])].sort(),
        awaiting: ((r.body?.awaitingFull ?? []) as any[]).map((x) => x.id).sort(),
      };
    };

    //  أ) مسؤولٌ عام بمنحٍ سريريٍّ في الأطراف ⟶ الاثنان.
    const adm = await specsOf(S.admin);
    same("ف.أ **المسؤولُ ذو المنح السريريّ يشرف على الاختصاصين**",
      adm.specialties, ["medical_support", "prosthetic"]);
    check(adm.awaiting.includes(reqF1.id) && adm.awaiting.includes(reqF2.id),
      "   والطلبان المنتظران يصلانه معاً", JSON.stringify(adm.awaiting));

    //  ب) مديرُ فرعٍ بالمنح نفسه ⟶ الاثنان داخل نطاقه.
    const mg = await specsOf(S.mgr);
    same("ف.ب **ومديرُ الفرع كذلك — إشرافُه إداريّ لا مهنيّ**",
      mg.specialties, ["medical_support", "prosthetic"]);
    check(mg.awaiting.includes(reqF1.id) && mg.awaiting.includes(reqF2.id),
      "   والطلبان يصلانه في فرعه", JSON.stringify(mg.awaiting));

    //  ج) طبيبُ أطرافٍ فقط ⟶ الأطراف وحدها.
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic"]), DOC]);
    const dc = await specsOf(S.doc);
    same("ف.ج **والطبيبُ باختصاصه المسجَّل وحده**", dc.specialties, ["prosthetic"]);
    check(dc.awaiting.includes(reqF1.id) && !dc.awaiting.includes(reqF2.id),
      "   فيصله طلبُ الأطراف ولا يصله المساند", JSON.stringify(dc.awaiting));

    //  د) والفرعُ يبقى حاجزاً فوق ذلك كلِّه.
    const mg2 = await specsOf(S.mgr2);
    same("ف.د ومديرُ الفرع الآخر يشرف على الاختصاصين — في فرعه هو",
      mg2.specialties, ["medical_support", "prosthetic"]);
    same("   **ولا يصله شيءٌ من فرعٍ ليس له**", mg2.awaiting, []);

    await q(`UPDATE system_users
                SET can_write_medical_exam = false, medical_specialties = NULL
              WHERE id = ANY($1::int[])`, [[ADMIN, MGR]]);
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic", "medical_support"]), DOC]);

    // ══ ك. الفرعُ حاجز ═══════════════════════════════════════════════
    console.log("\n── ك. حدود الفرع ──");
    const reqK = (await mkReq(S.recv, pG, "quick")).body ?? {};
    const pKfull = await mk("ك — كامل", { prosthetic: true, classification: "past" });
    const reqKfull = (await mkReq(S.recv, pKfull, "full")).body;
    same("ك. مديرُ فرعٍ آخر لا يؤشّر على طلبِ فرعٍ ليس له",
      (await http("POST", `/api/medical-review/requests/${reqK.id ?? reqH.id}/decide`, S.mgr2,
        { decision: "approve" })).status, 403);
    same("   ولا يُرجع طلبَ معاينةٍ كاملة في فرعٍ ليس له",
      (await http("POST", `/api/medical-review/requests/${reqKfull.id}/return`, S.mgr2,
        { reason: "محاولة" })).status, 403);

    // ══ ل. الاستقبالُ العاديّ ليس مشرفاً ═════════════════════════════
    console.log("\n── ل. الاستقبال ليس مشرفاً ──");
    same("ل. الاستقبالُ لا يؤشّر «تمت المراجعة»",
      (await http("POST", `/api/medical-review/requests/${reqK.id ?? reqH.id}/decide`, S.recv2,
        { decision: "approve" })).status, 403);
    same("   ولا يُرجع طلبَ معاينةٍ كاملة",
      (await http("POST", `/api/medical-review/requests/${reqKfull.id}/return`, S.recv2,
        { reason: "محاولة" })).status, 403);
    same("   والطلبُ باقٍ كما كان",
      String((await q(`SELECT status FROM medical_review_requests WHERE id=$1`,
        [reqKfull.id]))[0].status), "pending");
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1::int[])`,
      [[ADMIN, RECV, RECV2, MGR, MGR2, DOC]]);
    await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`,
      [[ADMIN, RECV, RECV2, MGR, MGR2, DOC]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV, RECV2, MGR, MGR2, DOC]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
