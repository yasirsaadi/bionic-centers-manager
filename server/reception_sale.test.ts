// اختبارُ «إتمام البيع» المبسّط — الاستقبال (المرحلة الثانية) — حيّاً على
// Postgres وعلى النقاط الحقيقية. قاعدة محلّية: `npm run test:reception-sale`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// خبيرٌ + سعرٌ أصليّ + مقدارُ خصم = بيعٌ كامل، **بحفظٍ واحد**. لا `finalPrice`
// ولا `priceKind` ولا قرارَ شراء يُقبَل من العميل — الثلاثةُ تُشتَقّ في
// الخادم (`deriveOfferFromDiscount`) وتُعتمَد وحدها. والاستقبالُ ومديرُ
// الفرع والمسؤولُ العام وحدهم يبيعون على هذا الباب — **لا الطبيب ولا
// المحاسب**. و«لم يشترِ» فعلٌ منفصلٌ بسببٍ حرٍّ إلزاميّ، بلا أثرٍ ماليّ.
//
// وهذا الملفُّ يثبت الأبوابَ الجديدة (`/complete-sale`, `/not-bought`)
// تحديداً. وتفاصيلُ آليّة `setCommercialFields` نفسِها (المالكية، التزامنُ
// على آخرِ حقلٍ ناقص، عزلُ العلاج الطبيعي، …) مُختبَرةٌ في
// `server/exam_commercial.test.ts` — وهو مُحدَّثٌ في هذه المرحلة ليثبت أن
// الطبيبَ يُردّ عن الأبواب القديمة على مسار المعاينة أيضاً، وأن الملكيةَ
// الموروثة تبقى محفوظة. وسلامةُ سلوك المعاينة الطبّية من المرحلة الأولى
// مُختبَرةٌ في `server/exam_edit_commercial.test.ts`.

import { readFileSync } from "fs";
import { join } from "path";
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

const PORT = 6901;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إتمام-البيع";
const ADMIN = 9921, MANAGER = 9922, DOC = 9923, RECV = 9924, ACCT = 9925;
const EXPERT = 9926, EXPERT_B2 = 9927;

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "مدير الفرع",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "سعد",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  acct: {
    userId: ACCT, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true },
  },
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
      //  **base64**: الأسماءُ عربية، وترويسةُ HTTP لا تحمل إلّا Latin-1.
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}
/** طلبُ جهازٍ على **مسار المعاينة** — البابُ الحقيقي (ترحيل ٠٦٥). */
const startEpisode = (patientId: number, item = "full_device") =>
  http("POST", `/api/patients/${patientId}/device-episodes`, S.recv,
    { serviceType: "prosthetic", requestedItem: item, servicePath: "exam" });

/** توقيعٌ سريريٌّ محضٌ — بلا حمولةٍ تجارية (القسم 4.h). */
const signExam = (patientId: number, session: any = S.doc) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType: "prosthetic", diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
  });

async function followupOf(patientId: number): Promise<number> {
  const [r] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1
                        ORDER BY id DESC LIMIT 1`, [patientId]);
  return Number(r?.id ?? 0);
}
async function fRow(id: number) {
  const [r] = await q(`SELECT approved_price::int p, original_price::int op, price_kind pk,
      selected_expert_user_id ex, purchase_decision pd, purchase_decision_owner pdo,
      not_bought_reason_text nbr, status, closed_reason cr, converted_work_order_id wo,
      created_at ca
    FROM post_exam_followups WHERE id=$1`, [id]);
  return r ?? null;
}
async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS cost_entries,
      (SELECT count(*)::int FROM service_discount_requests WHERE patient_id=$1) AS discounts`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
}

/** مريضٌ + حالة + طلبُ جهازٍ على مسار المعاينة + معاينةٌ موقّعة = متابعةٌ جاهزة. */
async function readySale(label: string) {
  const pid = await mkPatient(label);
  await mkCase(pid);
  const ep = await startEpisode(pid);
  if (ep.status !== 201) throw new Error(`startEpisode failed: ${JSON.stringify(ep.body)}`);
  const ex = await signExam(pid);
  if (ex.status >= 300) throw new Error(`signExam failed: ${JSON.stringify(ex.body)}`);
  return { pid, fid: await followupOf(pid) };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${RECV},${ACCT},${EXPERT},${EXPERT_B2}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${RECV},${ACCT},${EXPERT},${EXPERT_B2}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, branchId, branchIds, name] of [
    [ADMIN, "admin", 1, "[1,2]", "المسؤول"],
    [MANAGER, "branch_manager", 1, "[1]", "مدير الفرع"],
    [DOC, "doctor", 1, "[1]", "سعد"],
    [RECV, "reception", 1, "[1]", "ريام"],
    [ACCT, "accountant", 1, "[1]", "المحاسب"],
    [EXPERT, "prosthetics_expert", 1, "[1]", "الخبير الأول"],
    //  **خبيرٌ من فرعٍ آخر حصراً** — لاختبار الرفض عبر الفروع (١٢).
    [EXPERT_B2, "prosthetics_expert", 2, "[2]", "خبيرُ الفرع الآخر"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,
               ${role === "doctor" ? `'["prosthetic","medical_support"]'::jsonb` : "'null'::jsonb"})
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name, is_active=true`,
      [id, `rs_u${id}`, role, name, branchId, branchIds]);
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
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ══════════════════════════════════════════════════════════════════
    //  أ. الصلاحيات (١–٥)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. الصلاحيات ──");
    {
      const { pid, fid } = await readySale("استقبالٌ يبيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("١. **الاستقبالُ يُتمّ بيعاً على المسار الجديد**",
        [r.status, r.body?.converted, typeof r.body?.workOrderId], [200, true, "number"]);
      same("   بأمرِ تصنيعٍ واحد", (await moneyOf(pid)).orders, 1);
    }
    {
      const { fid } = await readySale("مديرُ فرعٍ يبيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.manager,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٢. **ومديرُ الفرع في فرعه**", [r.status, r.body?.converted], [200, true]);
    }
    {
      const { fid } = await readySale("مسؤولٌ يبيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.admin,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٣. **والمسؤولُ العام**", [r.status, r.body?.converted], [200, true]);
    }
    {
      const { pid, fid } = await readySale("طبيبٌ يُردّ عن البيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.doc,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٤. **والطبيبُ العاديُّ لا يُتمّ بيعاً جديداً**", r.status, 403);
      same("   ولا شيءَ كُتب",
        await moneyOf(pid), { total: 0, orders: 0, cost_entries: 0, discounts: 0 });
      same("   والصفُّ كما بدأ", (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { pid, fid } = await readySale("محاسبٌ يُردّ عن البيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.acct,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٥. **والمحاسبُ لا يُتمّ بيعاً**", r.status, 403);
      same("   ولا شيءَ كُتب",
        await moneyOf(pid), { total: 0, orders: 0, cost_entries: 0, discounts: 0 });
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب. اشتقاقُ السعر — عاديّ · بخصم · مجّانيّ (٦–٨)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. اشتقاقُ السعر ──");
    {
      const { pid, fid } = await readySale("عاديّ");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 0, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("٦. **عاديّ: discountAmount=0 ⟶ أصليّ=نهائيّ=1,500,000**",
        [r.status, row.op, row.p, row.pk], [200, 1_500_000, 1_500_000, "normal"]);
      same("   وأمرُ تصنيعٍ واحد بالضبط", (await moneyOf(pid)).orders, 1);
    }
    {
      const { pid, fid } = await readySale("بخصم");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 300_000, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("٧. **بخصم: نهائيّ=1,200,000 ونوعُه discount**",
        [r.status, row.op, row.p, row.pk], [200, 1_500_000, 1_200_000, "discount"]);
      same("   والكلفةُ الفعليةُ المقيَّدةُ 1,200,000 — لا 1,500,000", (await moneyOf(pid)).total,
        1_200_000);
    }
    {
      const { pid, fid } = await readySale("مجّانيّ");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 1_500_000, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("٨. **مجّانيّ: discountAmount=originalPrice ⟶ نهائيّ=صفر والأصلُ محفوظ**",
        [r.status, row.op, row.p, row.pk], [200, 1_500_000, 0, "free"]);
      same("   والتصنيعُ بدأ رغم ذلك — بأمرٍ واحد بالضبط", (await moneyOf(pid)).orders, 1);
      same("   **والكلفةُ صفرٌ صريحٌ محفوظٌ لا «غير مسعَّر»**",
        [row.p, row.pk === null], [0, false]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج. التحقّق قبل أيّ كتابة (٩–١٢)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. التحقّق قبل الكتابة ──");
    {
      const { pid, fid } = await readySale("خصمٌ يتجاوز الأصل");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 1_200_000, expertUserId: EXPERT });
      same("٩. **discountAmount > originalPrice ⟶ ٤٠٠ ولا كتابة**", r.status, 400);
      same("   ولا شيءَ كُتب",
        await moneyOf(pid), { total: 0, orders: 0, cost_entries: 0, discounts: 0 });
      same("   والصفُّ كما بدأ", (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { pid, fid } = await readySale("خصمٌ سالب");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: -1, expertUserId: EXPERT });
      same("١٠. **خصمٌ سالب ⟶ ٤٠٠**", r.status, 400);
      same("   ولا شيءَ كُتب", (await moneyOf(pid)).orders, 0);
    }
    {
      const { pid, fid } = await readySale("سعرٌ غير موجب");
      const r1 = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 0, discountAmount: 0, expertUserId: EXPERT });
      same("١١. **originalPrice=0 ⟶ ٤٠٠**", r1.status, 400);
      const r2 = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: -500_000, discountAmount: 0, expertUserId: EXPERT });
      same("   **وسالبٌ كذلك ⟶ ٤٠٠**", r2.status, 400);
      same("   ولا شيءَ كُتب بأيٍّ منهما", (await moneyOf(pid)).orders, 0);
    }
    {
      const { pid, fid } = await readySale("خبيرٌ غير صالح");
      const rMissing = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: 999999 });
      same("١٢. **خبيرٌ غير موجود ⟶ ٤٠٠**", rMissing.status, 400);
      const rWrongBranch = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT_B2 });
      same("   **وخبيرٌ فعّالٌ في فرعٍ آخر ⟶ ٤٠٠**", rWrongBranch.status, 400);
      same("   ولا شيءَ كُتب بأيٍّ منهما", (await moneyOf(pid)).orders, 0);
      same("   والصفُّ كما بدأ", (await fRow(fid)).status, "awaiting_patient_decision");
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. **الخادمُ لا يثق بحساب العميل** (١٣–١٤)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الخادمُ لا يثق بحساب العميل ──");
    {
      const { fid } = await readySale("سعرٌ نهائيّ مزوَّر");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 300_000, expertUserId: EXPERT,
          finalPrice: 1 });
      const row = await fRow(fid);
      same("١٣. **`finalPrice` المزوَّر يُتجاهَل — المشتقُّ من الخصم فقط يُحفَظ**",
        [r.status, row.p], [200, 1_200_000]);
    }
    {
      const { fid } = await readySale("نوعُ سعرٍ مزوَّر");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 0, expertUserId: EXPERT,
          priceKind: "free" });
      const row = await fRow(fid);
      same("١٤. **`priceKind` المزوَّر يُتجاهَل — المشتقُّ من الخصم (صفر) فقط يُحفَظ**",
        [r.status, row.pk, row.p], [200, "normal", 1_500_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. لا طلبَ اعتمادِ خصم (١٥)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. لا طلبَ اعتمادِ خصم ──");
    {
      const { pid, fid } = await readySale("خصمٌ بلا طلبِ اعتماد");
      await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 500_000, expertUserId: EXPERT });
      same("١٥. **ولا صفَّ `service_discount_requests` واحد**", (await moneyOf(pid)).discounts, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و. حفظٌ واحد = قرارٌ كامل (١٦)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. حفظٌ واحد = قرارٌ كامل ──");
    {
      const { fid } = await readySale("حفظٌ واحد");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("١٦. **الحفظُ نفسُه سجّل «اشترى» وحوّل الملفَّ — بلا سؤالٍ ثانٍ**",
        [r.status, row.pd, row.status], [200, "bought", "converted"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز. التزامن — ضغطتان على «إتمام البيع» (١٧)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. التزامن ──");
    {
      const { pid, fid } = await readySale("ضغطتان متزامنتان");
      const body = { originalPrice: 900_000, discountAmount: 0, expertUserId: EXPERT };
      const [a, b] = await Promise.all([
        http("POST", `/api/followups/${fid}/complete-sale`, S.recv, body),
        http("POST", `/api/followups/${fid}/complete-sale`, S.manager, body),
      ]);
      const oks = [a, b].filter((x) => x.status === 200 && x.body?.converted === true).length;
      same("١٧. **واحدةٌ تُتمّ البيعَ والأخرى تُردّ**", oks, 1);
      const m = await moneyOf(pid);
      same("   **وأمرُ تصنيعٍ واحد وقيدُ كلفةٍ واحد ودينارٌ واحد بالضبط**",
        [m.orders, m.cost_entries, m.total], [1, 1, 900_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح. «لم يشترِ» (١٨–٢١)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. لم يشترِ ──");
    {
      const { fid } = await readySale("لم يشترِ بلا سبب");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.recv, {});
      same("١٨. **بلا سببٍ ⟶ ٤٠٠**", r.status, 400);
      same("   والصفُّ ما زال مفتوحاً", (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { pid, fid } = await readySale("لم يشترِ بسبب");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.recv,
        { reason: "السعر أعلى من قدرته الآن" });
      const row = await fRow(fid);
      same("١٩. **بسببٍ حرٍّ ⟶ إغلاقٌ بلا تصنيعٍ ولا كلفة**",
        [r.status, row.status, row.pd],
        [200, "closed_without_purchase", "not_bought"]);
      same("   والسببُ الحرُّ محفوظٌ كما قيل", row.nbr, "السعر أعلى من قدرته الآن");
      same("   ولا أمرَ ولا كلفةَ ولا دينار ولا طلبَ خصم",
        await moneyOf(pid), { total: 0, orders: 0, cost_entries: 0, discounts: 0 });
    }
    {
      const { pid, fid } = await readySale("طبيبٌ يُردّ عن لم يشترِ");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.doc,
        { reason: "اختار مركزاً آخر" });
      same("٢٠. **والطبيبُ العاديّ لا يستعمل `/not-bought`**", r.status, 403);
      same("   والصفُّ ما زال مفتوحاً", (await fRow(fid)).status, "awaiting_patient_decision");
      same("   ولا أثرَ ماليّ", (await moneyOf(pid)).orders, 0);
    }
    {
      const { fid } = await readySale("مسؤولٌ يستعمل لم يشترِ");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.admin,
        { reason: "اختار مركزاً آخر" });
      same("٢١. **والمسؤولُ العام يستعمل `/not-bought`**",
        [r.status, (await fRow(fid)).status], [200, "closed_without_purchase"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط. الأبوابُ القديمة — متقاعدةٌ لمسار المعاينة، وقائمةٌ للموروث (٢٢–٢٣)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. الأبوابُ القديمة ──");
    {
      const { fid } = await readySale("أبوابٌ قديمة على المسار الجديد");
      for (const path of ["expert", "commercial", "confirm-purchase", "approve-purchase"]) {
        const r = await http("POST", `/api/followups/${fid}/${path}`, S.doc,
          { expertUserId: EXPERT });
        same(`٢٢. **\`/${path}\` مع الطبيب على مسار المعاينة يُردّ (لا بديلاً للحظر)**`,
          r.status, 403);
      }
      same("   والصفُّ لم يتغيّر بأيٍّ من المحاولات",
        (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      //  حلقةٌ بلا مسار (ما قبل ٠٦٥) — الصفُّ الموروث يبقى على بابه القديم،
      //  **حتى للطبيب** — التقاعدُ خاصٌّ بمسار المعاينة وحده.
      const pid = await mkPatient("صفٌّ موروث بلا مسار");
      const cid = await mkCase(pid);
      await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
                 sequence_number, status, agreed_cost, requested_item, created_by)
               VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',$3)`, [pid, cid, MANAGER]);
      await signExam(pid);
      const fid = await followupOf(pid);
      const r = await http("POST", `/api/followups/${fid}/expert`, S.doc,
        { expertUserId: EXPERT });
      same("٢٣. **والصفُّ الموروث (بلا مسار) يبقى على بابه القديم — حتى للطبيب**",
        r.status, 200);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي. لا تُمحى السجلّاتُ التاريخية ولا تُعاد كتابتها (٢٤)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. لا محوَ ولا إعادةَ كتابة ──");
    {
      const { pid, fid } = await readySale("سجلٌّ تاريخيّ");
      const before = await fRow(fid);
      await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 800_000, discountAmount: 0, expertUserId: EXPERT });
      const after = await fRow(fid);
      same("٢٤. **الصفُّ نفسُه يُحدَّث لا يُستبدَل** — نفسُ المعرّف ونفسُ لحظة الإنشاء",
        [fid, new Date(after.ca).getTime()], [fid, new Date(before.ca).getTime()]);
      const events = await q<{ event_type: string }>(
        `SELECT event_type FROM post_exam_followup_events
          WHERE followup_id=$1 ORDER BY id`, [fid]);
      check(events.some((e) => e.event_type === "followup_created")
        && events.some((e) => e.event_type === "converted"),
        "   وسجلُّ الأحداث يتراكم — الحدثُ الأصليّ لم يُمحَ", JSON.stringify(events));
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك. عقدُ الشاشة — بابٌ واحد (٢٥، والتفصيلُ الكامل في test:exam-commercial)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. عقدُ الشاشة ──");
    {
      const card = readFileSync(
        join(import.meta.dirname, "..", "client", "src", "components",
          "PostExamDecisionCard.tsx"),
        "utf8");
      check(
        card.includes("button-open-complete-sale")
        && card.includes("select-complete-sale-expert")
        && card.includes("input-complete-sale-original")
        && card.includes("input-complete-sale-discount")
        && card.includes("text-complete-sale-final")
        && card.includes("button-save-complete-sale")
        && card.includes("button-decide-not-bought")
        && card.includes("input-c-reason")
        //  **ولا** زرَّ «اشترى» منفصل، ولا محدِّدَ نوع سعر، ولا حقلَ سعرٍ
        //  نهائيٍّ قابلاً للتحرير.
        && !card.includes("button-decide-bought")
        && !card.includes("radio-c-kind")
        && !card.includes("input-c-final"),
        "٢٥. **إتمامُ البيع بابٌ واحد**: خبيرٌ + سعرٌ أصليّ + خصم + نهائيٌّ للقراءة"
        + " + «لم يشترِ» منفصلة — ولا زرَّ «اشترى» مستقلّ ولا محدِّدَ نوع سعر");
    }

    console.log(
      "\nملاحظة: سلامةُ سلوك المعاينة الطبّية من المرحلة الأولى (٢٦) تُختبَر"
      + " في server/exam_edit_commercial.test.ts — شغّله ضمن الحزمة الكاملة.");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص إتمام البيع نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
