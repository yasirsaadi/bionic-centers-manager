// اختبارُ «إتمام البيع» المبسّط — الاستقبال (المرحلة الثانية، وتصحيحُها
// 2026-08-28) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:reception-sale`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// خبيرٌ + سعرٌ أصليّ + مقدارُ خصم = بيعٌ كامل، **بحفظٍ واحد**. لا `finalPrice`
// ولا `priceKind` ولا قرارَ شراء يُقبَل من العميل — الثلاثةُ تُشتَقّ في
// الخادم (`deriveOfferFromDiscount`) وتُعتمَد وحدها.
//
// **⚠ تصحيحٌ 2026-08-28**: الاستقبالُ **والمحاسبُ** ومديرُ الفرع والمسؤولُ
// العام يبيعون على هذا الباب — المحاسبُ صار كالاستقبال تماماً، لا استثناءً
// جزئياً. **ولا الطبيبُ إطلاقاً** — لا من الأبواب الجديدة ولا من القديمة:
// كلُّ بابٍ تجاريٍّ قديم (`/expert`, `/commercial`, `/commercial-price`,
// `/confirm-purchase`, `/approve-purchase`, `/close`) **متقاعدٌ على مسار
// المعاينة للجميع بلا استثناءٍ للدور** — عقدُ مسارٍ لا قيدُ صلاحية، وردُّه
// ٤٠٩ لا ٤٠٣. و«لم يشترِ» فعلٌ منفصلٌ بسببٍ حرٍّ إلزاميّ، بلا أثرٍ ماليّ.
//
// **وملاحظاتُ الطبيب من المعاينة** (`medical_exams.notes`) تصل بطاقةَ البيع
// للاطّلاع فقط — سياقٌ لا حقيقةٌ مالية، لا يُقرأ برمجياً ولا يُشتقّ منه سعرٌ
// أو خصمٌ أو خبير.
//
// وهذا الملفُّ يثبت الأبوابَ الجديدة (`/complete-sale`, `/not-bought`)
// تحديداً. وتفاصيلُ آليّة `setCommercialFields` نفسِها (المالكية، التزامنُ
// على آخرِ حقلٍ ناقص، عزلُ العلاج الطبيعي، …) مُختبَرةٌ في
// `server/exam_commercial.test.ts` — وهو مُحدَّثٌ في هذه المرحلة ليثبت أن
// الطبيبَ يُردّ عن كلّ باب تجاريّ على مسار المعاينة، وأن الأبوابَ القديمة
// تعمل كما كانت على الصفوف الموروثة وحدها. وسلامةُ سلوك المعاينة الطبّية من
// المرحلة الأولى مُختبَرةٌ في `server/exam_edit_commercial.test.ts`.

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

const S: Record<string, any> = {
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
//  ترتيبٌ ثابتٌ للتكرار على الفاعلين الخمسة — بلا اعتمادٍ على ترتيب مفاتيح
//  كائنٍ (غيرُ مضمونٍ نظرياً عبر محرّكات جافاسكربت مختلفة).
const ALL_ACTOR_NAMES = ["recv", "acct", "manager", "admin", "doc"] as const;

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
const startEpisode = (patientId: number, item = "full_device", serviceType = "prosthetic") =>
  http("POST", `/api/patients/${patientId}/device-episodes`, S.recv,
    { serviceType, requestedItem: item, servicePath: "exam" });

/**
 * توقيعٌ سريريٌّ محضٌ — بلا حمولةٍ تجارية (القسم 4.h). `notes` اختياريّ
 * (القسم 4.i، تصحيحٌ 2026-08-28) — الحقلُ السرديُّ الحرّ نفسُه الذي يصل
 * بطاقةَ البيع للقراءة فقط.
 */
const signExam = (
  patientId: number,
  opts: { session?: any; caseType?: string; notes?: string } = {},
) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, opts.session ?? S.doc, {
    caseType: opts.caseType ?? "prosthetic", diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
    notes: opts.notes,
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
      case_id, device_episode_id, service_type,
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
/** صفوفُ `payments` كاملةً — للقبض الاختياري عند إتمام البيع (القسم ف). */
async function paymentsOf(patientId: number) {
  return q<{
    id: number; amount: number; case_id: number | null;
    device_episode_id: number | null; payment_treatment_type: string | null;
    notes: string | null;
  }>(
    `SELECT id, amount::int, case_id, device_episode_id, payment_treatment_type, notes
       FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
}

/** مريضٌ + حالة + طلبُ جهازٍ على مسار المعاينة + معاينةٌ موقّعة = متابعةٌ جاهزة. */
async function readySale(label: string, opts: { notes?: string } = {}) {
  const pid = await mkPatient(label);
  await mkCase(pid);
  const ep = await startEpisode(pid);
  if (ep.status !== 201) throw new Error(`startEpisode failed: ${JSON.stringify(ep.body)}`);
  const ex = await signExam(pid, { notes: opts.notes });
  if (ex.status >= 300) throw new Error(`signExam failed: ${JSON.stringify(ex.body)}`);
  return { pid, fid: await followupOf(pid) };
}

/**
 * صفٌّ **موروث** — حلقةٌ من قبل ترحيل ٠٦٥ بلا `service_path` (`NULL`).
 * يبقى على قواعده القديمة كاملةً؛ لا الأبوابُ الجديدةُ ولا التقاعدُ
 * الشاملُ يمسّانه.
 */
async function legacyFollowup(label: string): Promise<{ pid: number; fid: number }> {
  const pid = await mkPatient(label);
  const cid = await mkCase(pid);
  await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
             sequence_number, status, agreed_cost, requested_item, created_by)
           VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',$3)`, [pid, cid, MANAGER]);
  await signExam(pid);
  const fid = await followupOf(pid);
  return { pid, fid };
}

/** يستخرج جسمَ دالّةٍ من مصدرٍ نصّي — من إعلانها حتى تصدير الاسم التالي. */
function extractFn(src: string, name: string): string {
  const startIdx = src.indexOf(`export async function ${name}(`);
  if (startIdx === -1) return "";
  const nextExportIdx = src.indexOf("\nexport ", startIdx + 10);
  return nextExportIdx === -1 ? src.slice(startIdx) : src.slice(startIdx, nextExportIdx);
}

const ZERO_MONEY = { total: 0, orders: 0, cost_entries: 0, discounts: 0 };

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
    //  **خبيرٌ من فرعٍ آخر حصراً** — لاختبار الرفض عبر الفروع.
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
    //  أ. الصلاحيات — إتمامُ البيع (١–٥، و١٥: الخبير للمحاسب كالاستقبال)
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
      //  **⚠ تصحيحٌ 2026-08-28**: كان هذا يُثبت رفضَ المحاسب — والقاعدةُ
      //  انقلبت صراحةً: المحاسبُ كالاستقبال تماماً هنا، لا استثناءً جزئياً.
      const { pid, fid } = await readySale("محاسبٌ يبيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.acct,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٢. **والمحاسبُ يُتمّ بيعاً بالضبط كالاستقبال — عبر البابِ نفسِه**",
        [r.status, r.body?.converted, typeof r.body?.workOrderId], [200, true, "number"]);
      const row = await fRow(fid);
      same("١٥. **واختيارُ الخبير من المحاسب يُحفَظ كأيّ فاعلٍ آخر مخوَّل**", row.ex, EXPERT);
      same("   بأمرِ تصنيعٍ واحد", (await moneyOf(pid)).orders, 1);
    }
    {
      const { fid } = await readySale("مديرُ فرعٍ يبيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.manager,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٣. **ومديرُ الفرع في فرعه**", [r.status, r.body?.converted], [200, true]);
    }
    {
      const { fid } = await readySale("مسؤولٌ يبيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.admin,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٤. **والمسؤولُ العام**", [r.status, r.body?.converted], [200, true]);
    }
    {
      const { pid, fid } = await readySale("طبيبٌ يُردّ عن البيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.doc,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٥. **والطبيبُ العاديُّ لا يُتمّ بيعاً جديداً — لا سلطةَ تجاريةً له إطلاقاً**",
        r.status, 403);
      same("   ولا شيءَ كُتب", await moneyOf(pid), ZERO_MONEY);
      same("   والصفُّ كما بدأ", (await fRow(fid)).status, "awaiting_patient_decision");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب. أفعالُ الخادم: المحاسبُ كالاستقبال، والطبيبُ بلا شيء (٦–٧)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. أفعالُ الخادم ──");
    {
      const { pid, fid } = await readySale("تطابقُ الأفعال");
      const rRecv = await http("GET", `/api/followups/patient/${pid}`, S.recv);
      const rAcct = await http("GET", `/api/followups/patient/${pid}`, S.acct);
      const rDoc = await http("GET", `/api/followups/patient/${pid}`, S.doc);
      const find = (body: any) => (Array.isArray(body) ? body : []).find((f: any) => f.id === fid);
      const recvActions = find(rRecv.body)?.actions;
      const acctActions = find(rAcct.body)?.actions;
      const docActions = find(rDoc.body)?.actions;
      same("٦. **المحاسبُ يرى الأفعالَ نفسَها التي يراها الاستقبال بالضبط**",
        acctActions, recvActions);
      same("   وهي البابانِ الجديدان لا غير", recvActions, ["complete_sale", "not_bought"]);
      same("٧. **والطبيبُ العاديُّ لا يرى فعلاً تجارياً واحداً على مسار المعاينة**",
        docActions, []);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج. اشتقاقُ السعر — عاديّ · بخصم · مجّانيّ (٨–١٠، مرقّمةٌ ٢٣ في المواصفة)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. اشتقاقُ السعر ──");
    {
      const { pid, fid } = await readySale("عاديّ");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 0, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("٢٣أ. **عاديّ: discountAmount=0 ⟶ أصليّ=نهائيّ=1,500,000**",
        [r.status, row.op, row.p, row.pk], [200, 1_500_000, 1_500_000, "normal"]);
      same("     وأمرُ تصنيعٍ واحد بالضبط", (await moneyOf(pid)).orders, 1);
    }
    {
      const { pid, fid } = await readySale("بخصم");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 300_000, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("٢٣ب. **بخصم: نهائيّ=1,200,000 ونوعُه discount**",
        [r.status, row.op, row.p, row.pk], [200, 1_500_000, 1_200_000, "discount"]);
      same("     والكلفةُ الفعليةُ المقيَّدةُ 1,200,000 — لا 1,500,000", (await moneyOf(pid)).total,
        1_200_000);
    }
    {
      const { pid, fid } = await readySale("مجّانيّ");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 1_500_000, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("٢٣ج. **مجّانيّ: discountAmount=originalPrice ⟶ نهائيّ=صفر والأصلُ محفوظ**",
        [r.status, row.op, row.p, row.pk], [200, 1_500_000, 0, "free"]);
      same("     والتصنيعُ بدأ رغم ذلك — بأمرٍ واحد بالضبط", (await moneyOf(pid)).orders, 1);
      same("     **والكلفةُ صفرٌ صريحٌ محفوظٌ لا «غير مسعَّر»**",
        [row.p, row.pk === null], [0, false]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. التحقّق قبل أيّ كتابة (٢٣د-و في المواصفة)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. التحقّق قبل الكتابة ──");
    {
      const { pid, fid } = await readySale("خصمٌ يتجاوز الأصل");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 1_200_000, expertUserId: EXPERT });
      same("٢٣د. **discountAmount > originalPrice ⟶ ٤٠٠ ولا كتابة**", r.status, 400);
      same("     ولا شيءَ كُتب", await moneyOf(pid), ZERO_MONEY);
      same("     والصفُّ كما بدأ", (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { pid, fid } = await readySale("خصمٌ سالب");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: -1, expertUserId: EXPERT });
      same("     **خصمٌ سالب ⟶ ٤٠٠**", r.status, 400);
      same("     ولا شيءَ كُتب", (await moneyOf(pid)).orders, 0);
    }
    {
      const { pid, fid } = await readySale("سعرٌ غير موجب");
      const r1 = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 0, discountAmount: 0, expertUserId: EXPERT });
      same("     **originalPrice=0 ⟶ ٤٠٠**", r1.status, 400);
      const r2 = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: -500_000, discountAmount: 0, expertUserId: EXPERT });
      same("     **وسالبٌ كذلك ⟶ ٤٠٠**", r2.status, 400);
      same("     ولا شيءَ كُتب بأيٍّ منهما", (await moneyOf(pid)).orders, 0);
    }
    {
      const { pid, fid } = await readySale("خبيرٌ غير صالح");
      const rMissing = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: 999999 });
      same("٢٣هـ. **خبيرٌ غير موجود ⟶ ٤٠٠**", rMissing.status, 400);
      const rWrongBranch = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT_B2 });
      same("     **وخبيرٌ فعّالٌ في فرعٍ آخر ⟶ ٤٠٠**", rWrongBranch.status, 400);
      same("     ولا شيءَ كُتب بأيٍّ منهما", (await moneyOf(pid)).orders, 0);
      same("     والصفُّ كما بدأ", (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { fid } = await readySale("سعرٌ نهائيّ مزوَّر");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 300_000, expertUserId: EXPERT,
          finalPrice: 1 });
      const row = await fRow(fid);
      same("٢٣و. **`finalPrice` المزوَّر يُتجاهَل — المشتقُّ من الخصم فقط يُحفَظ**",
        [r.status, row.p], [200, 1_200_000]);
    }
    {
      const { fid } = await readySale("نوعُ سعرٍ مزوَّر");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 0, expertUserId: EXPERT,
          priceKind: "free" });
      const row = await fRow(fid);
      same("     **`priceKind` المزوَّر يُتجاهَل — المشتقُّ من الخصم (صفر) فقط يُحفَظ**",
        [r.status, row.pk, row.p], [200, "normal", 1_500_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. لا طلبَ اعتمادِ خصم
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. لا طلبَ اعتمادِ خصم ──");
    {
      const { pid, fid } = await readySale("خصمٌ بلا طلبِ اعتماد");
      await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 500_000, expertUserId: EXPERT });
      same("   **ولا صفَّ `service_discount_requests` واحد**", (await moneyOf(pid)).discounts, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و. حفظٌ واحد = قرارٌ كامل
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. حفظٌ واحد = قرارٌ كامل ──");
    {
      const { fid } = await readySale("حفظٌ واحد");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("   **الحفظُ نفسُه سجّل «اشترى» وحوّل الملفَّ — بلا سؤالٍ ثانٍ**",
        [r.status, row.pd, row.status], [200, "bought", "converted"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز. التزامن — ضغطتان على «إتمام البيع» (٢٤ في المواصفة)
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
      same("٢٤. **واحدةٌ تُتمّ البيعَ والأخرى تُردّ**", oks, 1);
      const m = await moneyOf(pid);
      same("    **وأمرُ تصنيعٍ واحد وقيدُ كلفةٍ واحد ودينارٌ واحد بالضبط**",
        [m.orders, m.cost_entries, m.total], [1, 1, 900_000]);
    }
    {
      //  والتزامنُ نفسُه على «إتمام البيع» بين استقبالٍ ومحاسبٍ معاً — ليس
      //  الاستقبالُ وحده مَن يُختبَر تحت الضغط.
      const { pid, fid } = await readySale("ضغطتان: استقبالٌ ومحاسب");
      const body = { originalPrice: 700_000, discountAmount: 0, expertUserId: EXPERT };
      const [a, b] = await Promise.all([
        http("POST", `/api/followups/${fid}/complete-sale`, S.recv, body),
        http("POST", `/api/followups/${fid}/complete-sale`, S.acct, body),
      ]);
      const oks = [a, b].filter((x) => x.status === 200 && x.body?.converted === true).length;
      same("    **ومحاسبٌ يشارك التزامنَ كأيّ فاعلٍ آخر — نتيجةٌ واحدة**", oks, 1);
      same("    وأمرُ تصنيعٍ واحد بالضبط", (await moneyOf(pid)).orders, 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح. «لم يشترِ» — والمحاسبُ كالاستقبال هنا أيضاً (١٦–١٧)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. لم يشترِ ──");
    {
      const { fid } = await readySale("لم يشترِ بلا سبب");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.recv, {});
      same("   **بلا سببٍ ⟶ ٤٠٠**", r.status, 400);
      same("   والصفُّ ما زال مفتوحاً", (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { pid, fid } = await readySale("لم يشترِ بسبب");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.recv,
        { reason: "السعر أعلى من قدرته الآن" });
      const row = await fRow(fid);
      same("   **بسببٍ حرٍّ ⟶ إغلاقٌ بلا تصنيعٍ ولا كلفة**",
        [r.status, row.status, row.pd],
        [200, "closed_without_purchase", "not_bought"]);
      same("   والسببُ الحرُّ محفوظٌ كما قيل", row.nbr, "السعر أعلى من قدرته الآن");
      same("   ولا أمرَ ولا كلفةَ ولا دينار ولا طلبَ خصم", await moneyOf(pid), ZERO_MONEY);
    }
    {
      const { pid, fid } = await readySale("محاسبٌ يسجّل لم يشترِ");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.acct,
        { reason: "قرّر الانتظار" });
      const row = await fRow(fid);
      same("١٦. **والمحاسبُ يسجّل «لم يشترِ» تماماً كالاستقبال**",
        [r.status, row.status, row.pd],
        [200, "closed_without_purchase", "not_bought"]);
      same("    ولا أثرَ ماليّ", await moneyOf(pid), ZERO_MONEY);
    }
    {
      const { pid, fid } = await readySale("طبيبٌ يُردّ عن لم يشترِ");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.doc,
        { reason: "اختار مركزاً آخر" });
      same("١٧. **والطبيبُ العاديّ لا يستعمل `/not-bought` — بلا استثناء**", r.status, 403);
      same("    والصفُّ ما زال مفتوحاً", (await fRow(fid)).status, "awaiting_patient_decision");
      same("    ولا أثرَ ماليّ", (await moneyOf(pid)).orders, 0);
    }
    {
      const { fid } = await readySale("مسؤولٌ يستعمل لم يشترِ");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.admin,
        { reason: "اختار مركزاً آخر" });
      same("    **والمسؤولُ العام يستعمل `/not-bought`**",
        [r.status, (await fRow(fid)).status], [200, "closed_without_purchase"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط. ملاحظاتُ الطبيب من المعاينة — سياقٌ لا حقيقةٌ مالية (٨–١٤)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. ملاحظاتُ الطبيب من المعاينة ──");
    {
      const { pid, fid } = await readySale("ملاحظةٌ مرتبطة",
        { notes: "ناقشنا سعراً تقريبياً ١,٥٠٠,٠٠٠ وتفضيلاً بالتقسيط" });
      const r = await http("GET", `/api/followups/patient/${pid}`, S.recv);
      const row = (Array.isArray(r.body) ? r.body : []).find((f: any) => f.id === fid);
      same("٨. **ملاحظةُ المعاينة المرتبطة تصل بطاقةَ البيع كما كُتبت — لنفس المتابعة بعينها**",
        row?.examNotes, "ناقشنا سعراً تقريبياً ١,٥٠٠,٠٠٠ وتفضيلاً بالتقسيط");
    }
    {
      //  مريضٌ بجهازين — أطرافٌ ومساند — بمعاينتين منفصلتين. كلُّ متابعةٍ
      //  يجب أن تحمل ملاحظةَ معاينتها **هي فقط**، لا ملاحظةَ الأخرى ولا
      //  «آخرَ معاينةٍ للمريض».
      const pid = await mkPatient("مريضٌ بجهازين — عزلُ الملاحظة");
      await mkCase(pid, 1, "prosthetic");
      await mkCase(pid, 1, "medical_support");
      const ep1 = await startEpisode(pid, "full_device", "prosthetic");
      if (ep1.status !== 201) throw new Error(`ep1: ${JSON.stringify(ep1.body)}`);
      const ex1 = await signExam(pid, { caseType: "prosthetic", notes: "ملاحظةُ معاينة الأطراف" });
      if (ex1.status >= 300) throw new Error(`ex1: ${JSON.stringify(ex1.body)}`);
      const ep2 = await startEpisode(pid, "full_device", "medical_support");
      if (ep2.status !== 201) throw new Error(`ep2: ${JSON.stringify(ep2.body)}`);
      const ex2 = await signExam(pid,
        { caseType: "medical_support", notes: "ملاحظةُ معاينة المسند" });
      if (ex2.status >= 300) throw new Error(`ex2: ${JSON.stringify(ex2.body)}`);

      const r = await http("GET", `/api/followups/patient/${pid}`, S.recv);
      const rows: any[] = Array.isArray(r.body) ? r.body : [];
      const rowP = rows.find((f) => f.serviceType === "prosthetic");
      const rowM = rows.find((f) => f.serviceType === "medical_support");
      same("٩. **مريضٌ بجهازين: كلُّ متابعةٍ تحمل ملاحظةَ معاينتها هي فقط — بلا تبادل**",
        [rowP?.examNotes, rowM?.examNotes],
        ["ملاحظةُ معاينة الأطراف", "ملاحظةُ معاينة المسند"]);
    }
    {
      const { pid, fid } = await readySale("بلا ملاحظة");
      const r = await http("GET", `/api/followups/patient/${pid}`, S.recv);
      const row = (Array.isArray(r.body) ? r.body : []).find((f: any) => f.id === fid);
      same("١٠. **بلا ملاحظةٍ ⟶ `examNotes` فارغةٌ صراحةً (`null`)**", row?.examNotes, null);
    }
    //  ١١-١٢ (عرضُها للقراءة فقط + نصُّ التنبيه) وجزءٌ من ١٠ (الكتلةُ لا
    //  تُعرَض فارغةً) — عقدُ شاشةٍ، يُثبَت مع بقيّة عقد الشاشة أدناه.
    {
      const storeSrc = readFileSync(join(import.meta.dirname, "followup", "store.ts"), "utf8");
      const csBody = extractFn(storeSrc, "completeReceptionSale");
      const nbBody = extractFn(storeSrc, "completeReceptionNotBought");
      const suspicious = /exam_notes|examNotes|\.notes\b/;
      check(
        csBody.length > 0 && !suspicious.test(csBody)
        && nbBody.length > 0 && !suspicious.test(nbBody),
        "١٣. **معماريّاً: لا `completeReceptionSale` ولا `completeReceptionNotBought` يقرآن"
        + " ملاحظاتِ الطبيب** — البيعُ من الحقول الصريحة وحدها",
        `csBody found=${csBody.length > 0} nbBody found=${nbBody.length > 0}`);
    }
    {
      //  السعرُ الصريحُ يسود ولو خالف رقماً مذكوراً في الملاحظة، والملاحظةُ
      //  نفسُها لا تُمسّ — البيعُ لا يُعيد كتابةَ السجلّ السريريّ.
      const { pid, fid } = await readySale("السعرُ الصريحُ يسود على الملاحظة",
        { notes: "المريضُ ناقش سعر ١,٥٠٠,٠٠٠ نقداً على دفعتين" });
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_500_000, discountAmount: 200_000, expertUserId: EXPERT });
      const row = await fRow(fid);
      same("١٤. **السعرُ الصريحُ (١,٣٠٠,٠٠٠) هو الحقيقةُ المالية — لا رقمُ الملاحظة**",
        [r.status, row.p], [200, 1_300_000]);
      const [exam] = await q<{ notes: string }>(
        `SELECT e.notes FROM medical_exams e
           JOIN post_exam_followups f ON f.medical_exam_id = e.id
          WHERE f.id = $1`, [fid]);
      same("    **وملاحظةُ الطبيب بقيت كما كتبها — لم يُعِد البيعُ كتابتها**",
        exam?.notes, "المريضُ ناقش سعر ١,٥٠٠,٠٠٠ نقداً على دفعتين");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي. الأبوابُ القديمة — تقاعدٌ شاملٌ على مسار المعاينة، للجميع (١٨–١٩)
    // ══════════════════════════════════════════════════════════════════
    //  **عقدُ مسارٍ لا قيدُ صلاحية**: مَن كان "مخوَّلاً" بالباب القديم وفق
    //  قواعده الموروثة يُردّ الآن ٤٠٩ (تقاعدُ مسار)، ومَن لم يكن مخوَّلاً به
    //  أصلاً (قيدُ دورٍ سابقٌ لا علاقةَ له بهذا التصحيح — كمحاسبٍ لم يملك
    //  `/close` قطّ، أو استقبالٍ لم يملك `/commercial-price` قطّ) يبقى يُردّ
    //  ٤٠٣ كما كان دائماً. **والنتيجةُ واحدة للجميع: لا نجاحَ، ولا كتابةٌ
    //  واحدة.**
    console.log("\n── ي. الأبوابُ القديمة — تقاعدٌ شامل ──");
    {
      //  مَن كان "مخوَّلاً" بكلّ بابٍ قديم وفق قواعده الموروثة قبل هذا
      //  التصحيح — من `shared/followup.ts`: `canConfirmPurchase` (تشمل
      //  الخمسة جميعاً) لـ`/expert`·`/commercial`·`/confirm-purchase`·
      //  `/approve-purchase`؛ `canActCommercially` (بلا المحاسب) لـ`/close`؛
      //  `canSetCommercialPrice` (مديرُ الفرع والمسؤولُ فقط) لـ`/commercial-price`.
      const AUTHORIZED_FOR: Record<string, readonly string[]> = {
        expert: ALL_ACTOR_NAMES,
        commercial: ALL_ACTOR_NAMES,
        "confirm-purchase": ALL_ACTOR_NAMES,
        "approve-purchase": ALL_ACTOR_NAMES,
        close: ["recv", "manager", "admin", "doc"],
        "commercial-price": ["manager", "admin"],
      };
      const BODY_FOR: Record<string, any> = {
        expert: { expertUserId: EXPERT },
        commercial: { price: { kind: "normal", originalPrice: 500000, finalPrice: 500000 } },
        "confirm-purchase": {},
        "approve-purchase": {},
        close: { reason: "needs_time" },
        "commercial-price": { finalPrice: 500000 },
      };
      let retiredCount = 0, roleBlockedCount = 0;
      for (const path of Object.keys(AUTHORIZED_FOR)) {
        for (const actor of ALL_ACTOR_NAMES) {
          const { fid, pid } = await readySale(`تقاعد-${path}-${actor}`);
          const r = await http("POST", `/api/followups/${fid}/${path}`, S[actor], BODY_FOR[path]);
          const wasAuthorized = AUTHORIZED_FOR[path].includes(actor);
          const expectedStatus = wasAuthorized ? 409 : 403;
          if (wasAuthorized) retiredCount++; else roleBlockedCount++;
          const money = await moneyOf(pid);
          const rowStatus = (await fRow(fid)).status;
          same(
            `١٨/١٩. \`/${path}\` + ${actor}`
            + (wasAuthorized ? " (مخوَّلٌ بالبابِ القديم ⟶ تقاعدُ مسارٍ ٤٠٩)"
              : " (لم يكن مخوَّلاً به أصلاً ⟶ ٤٠٣ كالمعتاد)")
            + " — وصفرُ كتابةٍ في الحالتين",
            [r.status, money.total, money.orders, money.cost_entries, money.discounts, rowStatus],
            [expectedStatus, 0, 0, 0, 0, "awaiting_patient_decision"],
          );
        }
      }
      same("     وتغطيةُ المصفوفة الكاملة (٦ أبوابٍ × ٥ فاعلين = ٣٠)",
        [retiredCount, roleBlockedCount], [26, 4]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك. الصفوفُ الموروثة تبقى على قواعدها القديمة بحرفها (٢٢)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. الصفوفُ الموروثة ──");
    {
      //  حلقةٌ بلا مسار (ما قبل ٠٦٥) — الصفُّ الموروث يبقى على بابه القديم،
      //  **حتى للطبيب** — التقاعدُ خاصٌّ بمسار المعاينة وحده.
      const { fid } = await legacyFollowup("موروثٌ — الطبيبُ يستعمل بابَه القديم");
      const r = await http("POST", `/api/followups/${fid}/expert`, S.doc, { expertUserId: EXPERT });
      same("٢٢. **والصفُّ الموروث (بلا مسار) يبقى على بابه القديم — حتى للطبيب**", r.status, 200);
    }
    {
      //  والمحاسبُ كذلك: `canConfirmPurchase` القديمة تشمله على الصفوف
      //  الموروثة — هذا التصحيحُ لم يمسّ توافقَها الرجعيّ بحرف.
      const { fid } = await legacyFollowup("موروثٌ — المحاسبُ يستعمل بابَه القديم");
      const r = await http("POST", `/api/followups/${fid}/expert`, S.acct, { expertUserId: EXPERT });
      same("    **والمحاسبُ كذلك — `canConfirmPurchase` القديمة تشمله على الصفوف الموروثة**",
        r.status, 200);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ل. `/complete-sale` و`/not-bought` يرفضان الصفوفَ الموروثة (٢٠–٢١)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. البابانِ الجديدانِ يرفضان الموروث ──");
    {
      const { pid, fid } = await legacyFollowup("موروثٌ يُردّ عن إتمام البيع");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("٢٠. **`/complete-sale` يرفض صفّاً موروثاً بلا مسارٍ — صفرُ كتابة**", r.status, 409);
      same("    ولا شيءَ كُتب", await moneyOf(pid), ZERO_MONEY);
      same("    والصفُّ كما بدأ (بابُه القديم لا يزال يعمل — القسم ك)",
        (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { pid, fid } = await legacyFollowup("موروثٌ يُردّ عن لم يشترِ");
      const r = await http("POST", `/api/followups/${fid}/not-bought`, S.recv,
        { reason: "أيّ سبب" });
      same("٢١. **`/not-bought` يرفض صفّاً موروثاً بلا مسارٍ — صفرُ كتابة**", r.status, 409);
      same("    والصفُّ لم يتحوّل", (await fRow(fid)).status, "awaiting_patient_decision");
      same("    ولا أثرَ ماليّ", await moneyOf(pid), ZERO_MONEY);
    }
    {
      //  ومسؤولٌ عامّ كذلك — التقاعدُ عقدُ مسارٍ، وسلطةُ المسؤول لا تلتفّ
      //  عليه لأنه ببساطة ليس البابَ الصحيح لهذا الصفّ.
      const { pid, fid } = await legacyFollowup("موروثٌ — المسؤولُ يُردّ عن /complete-sale");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.admin,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("    **وحتى المسؤولُ العام يُردّ عن `/complete-sale` لصفٍّ موروث — بابُه غيرُ هذا**",
        r.status, 409);
      same("    ولا شيءَ كُتب", await moneyOf(pid), ZERO_MONEY);
    }

    // ══════════════════════════════════════════════════════════════════
    //  م. لا تُمحى السجلّاتُ التاريخية ولا تُعاد كتابتها
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── م. لا محوَ ولا إعادةَ كتابة ──");
    {
      const { pid, fid } = await readySale("سجلٌّ تاريخيّ");
      const before = await fRow(fid);
      await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 800_000, discountAmount: 0, expertUserId: EXPERT });
      const after = await fRow(fid);
      same("   **الصفُّ نفسُه يُحدَّث لا يُستبدَل** — نفسُ المعرّف ونفسُ لحظة الإنشاء",
        [fid, new Date(after.ca).getTime()], [fid, new Date(before.ca).getTime()]);
      const events = await q<{ event_type: string }>(
        `SELECT event_type FROM post_exam_followup_events
          WHERE followup_id=$1 ORDER BY id`, [fid]);
      check(events.some((e) => e.event_type === "followup_created")
        && events.some((e) => e.event_type === "converted"),
        "   وسجلُّ الأحداث يتراكم — الحدثُ الأصليّ لم يُمحَ", JSON.stringify(events));
    }

    // ══════════════════════════════════════════════════════════════════
    //  ن. ملخّصُ البيع يظهر رغم رايةِ اهتمامٍ قديمة (٢٥)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ن. ملخّصُ البيع لا تُخفيه رايةٌ قديمة ──");
    {
      const { pid, fid } = await readySale("محوَّلةٌ وتحمل رايةً قديمة");
      await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_100_000, discountAmount: 100_000, expertUserId: EXPERT });
      //  محاكاةُ رايةٍ قديمة (`purchase_interest_at`) على صفٍّ تحوّل فعلاً —
      //  تُكتب مباشرةً بالـSQL لأن البابَ الحيّ الذي كان يكتبها
      //  (`/purchase-interest`) تقاعد على هذا المسار (القسم ي أعلاه)، وهذا
      //  يحاكي صفّاً تاريخياً رُفعت له الرايةُ قبل التبسيط ثم تحوّل بالبابِ
      //  الجديد.
      await q(`UPDATE post_exam_followups SET purchase_interest_at = NOW(),
                 purchase_interest_by = $2, purchase_interest_by_name = 'قديم'
               WHERE id = $1`, [fid, RECV]);
      const r = await http("GET", `/api/followups/patient/${pid}`, S.recv);
      const row = (Array.isArray(r.body) ? r.body : []).find((f: any) => f.id === fid);
      same("٢٥. **رايةٌ قديمةٌ لا تُخفي بياناتِ البيع بعد التحوّل**",
        [row?.status, row?.priceKind, row?.originalPrice, row?.approvedPrice,
          row?.selectedExpertUserId],
        ["converted", "discount", 1_100_000, 1_000_000, EXPERT]);
      check(Boolean(row?.purchaseInterestAt),
        "    والرايةُ القديمةُ لا تزال مقروءةً أيضاً — لا تُمحى، بل تُعرَض جانب الملخّص");
    }

    // ══════════════════════════════════════════════════════════════════
    //  س. عقدُ الشاشة — بابٌ واحد، وملاحظةُ الطبيب، وملخّصٌ لا يُخفى (١١-١٢، ٢٥)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── س. عقدُ الشاشة ──");
    {
      const card = readFileSync(
        join(import.meta.dirname, "..", "client", "src", "components",
          "PostExamDecisionCard.tsx"),
        "utf8");
      //  ══ **المرحلة الخامسة — الكتلةُ انتقلت إلى مكوّنٍ مشترك** ═══════════
      //  «إتمام البيع»/«لم يشترِ» ونافذتاهما ونصُّ ملاحظة الطبيب صارت في
      //  `ExamPathDecisionActions.tsx` — تستهلكه بطاقةُ المريض **وطابورُ
      //  «بانتظار الحسم»** معاً، فلا نسخةٌ ثانية من هذه الواجهة تنحرف يوماً.
      //  العقدُ صار على المكوّن المشترك، لا على البطاقة وحدها.
      const shared = readFileSync(
        join(import.meta.dirname, "..", "client", "src", "components",
          "ExamPathDecisionActions.tsx"),
        "utf8");
      check(
        shared.includes("button-open-complete-sale")
        && shared.includes("select-complete-sale-expert")
        && shared.includes("input-complete-sale-original")
        && shared.includes("input-complete-sale-discount")
        && shared.includes("text-complete-sale-final")
        && shared.includes("button-save-complete-sale")
        && shared.includes("button-decide-not-bought")
        && shared.includes("input-c-reason")
        //  **ولا** زرَّ «اشترى» منفصل، ولا محدِّدَ نوع سعر، ولا حقلَ سعرٍ
        //  نهائيٍّ قابلاً للتحرير.
        && !shared.includes("button-decide-bought")
        && !shared.includes("radio-c-kind")
        && !shared.includes("input-c-final"),
        "   **إتمامُ البيع بابٌ واحد**: خبيرٌ + سعرٌ أصليّ + خصم + نهائيٌّ للقراءة"
        + " + «لم يشترِ» منفصلة — ولا زرَّ «اشترى» مستقلّ ولا محدِّدَ نوع سعر"
        + " (المكوّنُ المشترك)");
      check(
        shared.includes("block-exam-note") && shared.includes("text-exam-note")
        && shared.includes("text-exam-note-hint"),
        "١١. **ملاحظةُ الطبيب تُعرَض للقراءة فقط في المكوّن المشترك** (`block-exam-note`)");
      check(
        card.includes("examNotes={active.examNotes}"),
        "١١ب. **وبطاقةُ المريض تُمرِّر `active.examNotes` بعينها** — لا نصّاً آخر");
      check(
        /للاطلاع فقط.*السعر المعتمد هو المسجل في إتمام البيع/.test(shared),
        "١٢. **ونصٌّ صريحٌ يقول إنها للاطّلاع فقط والسعرُ المعتمد من إتمام البيع**");
      //  ══ **إثباتُ إعادة الاستعمال — لا نسخةٌ ثانية** (المرحلة الخامسة) ════
      //  البطاقةُ وطابورُ «بانتظار الحسم» يستوردان المكوّنَ نفسَه بالاسم
      //  نفسِه — لا تعريفَين محلّيَّين متطابقين صدفةً.
      const queuePage = readFileSync(
        join(import.meta.dirname, "..", "client", "src", "pages", "PostExamFollowups.tsx"),
        "utf8");
      check(
        card.includes('from "@/components/ExamPathDecisionActions"')
        && queuePage.includes('from "@/components/ExamPathDecisionActions"')
        && !card.includes("button-open-complete-sale")
        && !queuePage.includes("button-save-complete-sale"),
        "١٣ب. **وبطاقةُ المريض وطابورُ «بانتظار الحسم» يستوردان `ExamPathDecisionActions`"
        + " نفسَه** — لا تكرارَ لأزرار البيع في أيٍّ منهما مباشرةً");
      check(
        !/purchaseState === "converted" && !active\.purchaseInterestAt/.test(card)
        && /purchaseState === "converted" && \(/.test(card),
        "٢٥ب. **وشرطُ عرض ملخّص البيع في الواجهة لم يعد يُخفيه خلف رايةِ اهتمامٍ قديمة**");
      //  ══ **قائمةُ الخبراء بفرع العملية — لا استعلامٌ عامّ بلا فرع** ══════
      //  (تصحيحٌ 2026-08-28 الثاني) — كان الطلبُ `fetch("/api/manufacturing/experts", ...)`
      //  بلا `branchId` إطلاقاً، ونقطةُ الخبراء تشترطه صراحةً للمسؤول العام
      //  فتردّه ٤٠٠ ويتحوّل عند العميل إلى قائمةٍ فارغة — مسؤولٌ يملك صلاحية
      //  البيع فعلياً ولا يستطيع اختيار خبير من الشاشة.
      //  **والفحصُ الآن على المكوّن المشترك** — هو من يحمل استعلامَ الخبراء
      //  لبطاقة البيع فعلياً منذ المرحلة الخامسة؛ وبطاقةُ المريض تبقي
      //  استعلامها الخاصّ (لـ`expertNameOf` ونافذة إسناد الخبير القديمة)
      //  بنفس النمط، فالفحصُ عليها لا يتضرّر أيضاً.
      check(
        !/fetch\(\s*"\/api\/manufacturing\/experts"\s*,\s*\{\s*credentials/.test(shared)
        && !/fetch\(\s*"\/api\/manufacturing\/experts"\s*,\s*\{\s*credentials/.test(card),
        "٦. **ولا استعلامَ خبراء بلا فرع بعد اليوم** — الطلبُ القديم بلا `branchId` غاب"
        + " (المكوّنُ المشترك والبطاقة معاً)");
      check(
        /queryKey:\s*\["\/api\/manufacturing\/experts",\s*branchId\]/.test(shared),
        "٧. **ومفتاحُ استعلام المكوّن المشترك يحمل هويّةَ فرع العملية**"
        + " — لا مفتاحٌ عامّ واحد لكلّ الفروع");
      check(
        /\/api\/manufacturing\/experts\?branchId=\$\{branchId\}/.test(shared),
        "٨. **والطلبُ الفعليّ في المكوّن المشترك يحمل `?branchId=<فرع العملية>`**");

      // ══ **I. القبضُ الاختياري — حارسُ مصدرٍ على الواجهة** ═════════════
      //  البيعُ والقبضُ واقعتان مختلفتان في الشاشة أيضاً — لا حقل «مبلغٌ
      //  مدفوع» يُملأ من أيّ مكانٍ غير الموظّف نفسِه.
      check(
        shared.includes("input-complete-sale-paid-now"),
        "I. **حقلُ «المبلغ المدفوع الآن» الاختياريّ موجودٌ في نافذة إتمام البيع**");
      check(
        /المبلغ المدفوع الآن/.test(shared),
        "   **بتسميةٍ عربية واضحة**");
      check(
        shared.includes('const [cPaidNow, setCPaidNow] = useState("");'),
        "   **ويبدأ فارغاً دائماً** — القيمةُ الابتدائية سلسلةٌ فارغة، لا صفرٌ ولا سعرٌ محسوب");
      check(
        /paidNow:\s*cPaidNow/.test(shared),
        "   **والطلبُ يرسل `paidNow` من هذا الحقل بعينه**");
      check(
        /اتركه فارغاً إذا لم يُستلم مبلغ الآن/.test(shared),
        "   **ونصُّ مساعدةٍ عربيّ صريحٌ يشرح ترْكَه فارغاً وتسجيلَ الدفعة لاحقاً**");
      check(
        shared.includes("text-complete-sale-remaining")
        && /الباقي بعد هذا القبض/.test(shared),
        "   **ويعرض الباقي بعد هذا القبض حين يوجد سعرٌ نهائيّ صالح**");
      //  ══ **ولا تعبئةَ تلقائية من أيّ قيمةٍ أخرى — هذا هو الجوهر** ══════
      //  `setCPaidNow(` يجب ألّا تُستدعى إلّا مرّتين حرفياً في الملفّ كلِّه:
      //  تصفيرُها في `reset`، وحقلُها هو (`onValueChange`). أيّ استدعاءٍ
      //  ثالثٍ — من `cOriginal`/`cDiscount`/`csOffer`/`prefill` أو أيّ مصدرٍ
      //  آخر — يعني تعبئةً تلقائية، وهي محظورةٌ صراحةً.
      const paidNowSetCalls = (shared.match(/setCPaidNow\(/g) ?? []).length;
      check(
        paidNowSetCalls === 2,
        "   **ولا تعبئةَ تلقائية من السعر الأصليّ أو النهائيّ أو الخصم أو أيّ تعبئةٍ مسبقة** —"
        + " `setCPaidNow` تُستدعى مرّتين فقط في كامل الملفّ (تصفيرٌ + حقلُها هو)",
        `العددُ الفعليّ: ${paidNowSetCalls}`);
      check(
        !/setCPaidNow\(\s*(cOriginal|cDiscount|csOffer|prefill)/.test(shared),
        "   **وبالتحديد: لا نداءَ `setCPaidNow` يقرأ من `cOriginal`/`cDiscount`/`csOffer`/`prefill`**"
        + " — بما فيها زرُّ فتح النافذة المُعبِّئ من `prefill`، الذي لا يمسّ هذا الحقل");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ع. قائمةُ الخبراء بفرع العملية المُباعة — لا فرع الجلسة (١-٥)
    // ══════════════════════════════════════════════════════════════════
    //  البقُّ الذي صحَّحه هذا القسم: كانت بطاقةُ البيع تجلب القائمةَ بلا
    //  `branchId`، ونقطةُ الخبراء تشترطه صراحةً للمسؤول العام (لا فرعَ ثابتاً
    //  له) فتردّه ٤٠٠ — فالمسؤولُ يملك صلاحية `/complete-sale` فعلياً ولا
    //  يستطيع فتح قائمة الخبراء ليختار منها. الإصلاحُ: تُطلَب القائمةُ بفرع
    //  **المتابعة الفعّالة نفسِها** لكلّ الفاعلين الأربعة — لا فرع جلستهم.
    console.log("\n── ع. قائمةُ الخبراء بفرع العملية ──");
    {
      const namesOf = (rows: any[]) => (rows ?? []).map((e: any) => Number(e.id)).sort().join(",");
      for (const [who, sess] of [["الاستقبال", S.recv], ["المحاسب", S.acct],
        ["مديرُ الفرع", S.manager]] as any[]) {
        const r = await http("GET", "/api/manufacturing/experts?branchId=1", sess);
        same(`١-٣. **${who}: يقرأ قائمةَ خبراء الفرع بـ\`branchId\` صريح**`,
          [r.status, namesOf(r.body)], [200, String(EXPERT)]);
      }
      //  والمسؤولُ العام كذلك — **حين يُرسَل الفرعُ صراحةً**، لا افتراضاً.
      const rAdminB1 = await http("GET", "/api/manufacturing/experts?branchId=1", S.admin);
      same("٤. **والمسؤولُ العام يقرأ خبراء الفرع ١ حين يُرسَل `branchId=1`**",
        [rAdminB1.status, namesOf(rAdminB1.body)], [200, String(EXPERT)]);
      //  وبلا `branchId` يبقى الخادمُ يرفض كما كان — **لم يُضعَف الشرطُ**.
      const rAdminNoBranch = await http("GET", "/api/manufacturing/experts", S.admin);
      same("   **وبلا فرعٍ في الطلب ⟶ ٤٠٠ كما كان — لم يُضعَف شرطُ الخادم**",
        rAdminNoBranch.status, 400);
      //  ٥. والمسؤولُ نفسُه يتنقّل بين فرعين فيقرأ قائمتين مختلفتين بلا
      //  التباس — هذا هو الإثباتُ الحيّ لعزل الفرع خلف تصحيح مفتاح الاستعلام.
      const rAdminB2 = await http("GET", "/api/manufacturing/experts?branchId=2", S.admin);
      same("٥. **والمسؤولُ نفسُه يقرأ خبراء الفرع ٢ بطلبٍ لاحق — بلا تسرّب من الفرع ١**",
        [rAdminB2.status, namesOf(rAdminB2.body)], [200, String(EXPERT_B2)]);
      check(namesOf(rAdminB1.body) !== namesOf(rAdminB2.body),
        "   **والقائمتان مختلفتان فعلاً — لا نسخةٌ واحدة مكرَّرة**");
      //  ٩. وخبيرٌ من فرعٍ آخر يبقى مرفوضاً عند البيع الفعليّ — الحارسُ
      //  الحقيقيّ يبقى في `/complete-sale` لا في طلب القائمة (مُختبَرٌ أصلاً
      //  في القسم د: «١٢. وخبيرٌ فعّالٌ في فرعٍ آخر ⟶ ٤٠٠» — لا يتكرّر هنا).
    }

    // ══════════════════════════════════════════════════════════════════
    //  ف. القبضُ الاختياريّ (`paidNow`) عند إتمام البيع — البيعُ ≠ القبض
    // ══════════════════════════════════════════════════════════════════
    //  قرارُ المالك: حقلٌ اختياريّ محضٌ في نافذة «إتمام البيع» — الموظّفُ
    //  يكتب المبلغَ الذي استلمه فعلاً الآن، أو يتركه فارغاً ويسجّل الدفعةَ
    //  لاحقاً من فعلها المعتاد. البيعُ يمضي في الحالتين بلا فرق.
    console.log("\n── ف. القبضُ الاختياري عند إتمام البيع ──");
    {
      const { pid, fid } = await readySale("قبضٌ محذوف");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
      same("A. `paidNow` محذوفةٌ تماماً ⟶ البيعُ ينجح كالمعتاد",
        [r.status, r.body?.converted], [200, true]);
      same("   والكلفةُ تُقيَّد بالكامل كما كانت دائماً", (await moneyOf(pid)).total, 1_000_000);
      same("   **ولا دفعةَ واحدة أُنشئت**", (await paymentsOf(pid)).length, 0);
      same("   والاستجابةُ تقول ذلك صراحةً (`payment: null`)", r.body?.payment, null);
    }
    {
      const { pid, fid } = await readySale("قبضٌ صفرٌ صريح");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT, paidNow: 0 });
      same("B. `paidNow: 0` صريحةٌ ⟶ نفسُ سلوك الحذف بالضبط",
        [r.status, r.body?.converted], [200, true]);
      same("   ولا دفعةَ هنا كذلك", (await paymentsOf(pid)).length, 0);
    }
    {
      const { pid, fid } = await readySale("قبضٌ جزئيّ");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT, paidNow: 300_000 });
      same("C. قبضٌ جزئيّ (٣٠٠,٠٠٠ من ١,٠٠٠,٠٠٠) ⟶ البيعُ ينجح",
        [r.status, r.body?.converted], [200, true]);
      const money = await moneyOf(pid);
      same("   **وكلفةُ البيع كاملةً ١,٠٠٠,٠٠٠** — القبضُ لا يغيّر الكلفة", money.total, 1_000_000);
      const pays = await paymentsOf(pid);
      same("   **ودفعةٌ واحدةٌ بالضبط بمبلغ ٣٠٠,٠٠٠**",
        pays.map((p) => Number(p.amount)), [300_000]);
      const row = await fRow(fid);
      same("   **والدفعةُ منسوبةٌ لنفس حالة/جهاز المتابعة المباعة**",
        [pays[0].case_id, pays[0].device_episode_id], [row.case_id, row.device_episode_id]);
      same("   **بوسم الجهاز الصحيح** («أطراف صناعية»)",
        pays[0].payment_treatment_type, "أطراف صناعية");
      same("   وملاحظةٌ واضحة", pays[0].notes, "دفعة عند إتمام البيع");
      same("   **والمتبقّي ٧٠٠,٠٠٠**", money.total - Number(pays[0].amount), 700_000);
      same("   والاستجابةُ تحمل الدفعةَ المُنشأة بعينها",
        [r.body?.payment?.id, r.body?.payment?.amount], [pays[0].id, 300_000]);
    }
    {
      const { pid, fid } = await readySale("قبضٌ كامل");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT, paidNow: 500_000 });
      same("D. قبضٌ يساوي السعرَ النهائيّ بالضبط ⟶ البيعُ ينجح",
        [r.status, r.body?.converted], [200, true]);
      const pays = await paymentsOf(pid);
      same("   **ودفعةٌ واحدةٌ بكامل المبلغ — مرّةً واحدة لا مرّتين**",
        pays.map((p) => Number(p.amount)), [500_000]);
      same("   **والمتبقّي صفر**", (await moneyOf(pid)).total - Number(pays[0].amount), 0);
    }
    {
      const { pid, fid } = await readySale("قبضٌ يتجاوز السعر");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT, paidNow: 600_001 });
      same("E. مبلغٌ مدفوعٌ يتجاوز السعرَ النهائيّ ⟶ ٤٠٠", r.status, 400);
      same("   **ولا تحويلَ ولا أمرَ تصنيعٍ ولا قيدَ كلفة**", await moneyOf(pid), ZERO_MONEY);
      same("   ولا دفعة", (await paymentsOf(pid)).length, 0);
      same("   والصفُّ كما بدأ", (await fRow(fid)).status, "awaiting_patient_decision");
    }
    {
      const { pid, fid } = await readySale("قبضٌ سالب");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT, paidNow: -1 });
      same("F. مبلغٌ سالبٌ ⟶ ٤٠٠", r.status, 400);
      same("   وصفرُ كتابةٍ كامل", await moneyOf(pid), ZERO_MONEY);
      same("   ولا دفعة", (await paymentsOf(pid)).length, 0);
    }
    {
      const { pid, fid } = await readySale("قبضٌ نصّيٌّ مشوَّه");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT, paidNow: "abc" });
      same("   ومبلغٌ غيرُ رقميّ (\"abc\") ⟶ ٤٠٠ كذلك", r.status, 400);
      same("   وصفرُ كتابةٍ كامل", await moneyOf(pid), ZERO_MONEY);
      same("   ولا دفعة", (await paymentsOf(pid)).length, 0);
    }
    {
      const { pid, fid } = await readySale("قبضٌ كسريّ");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT, paidNow: 100.5 });
      same("   ومبلغٌ كسريّ (١٠٠٫٥) ⟶ ٤٠٠ — الدينارُ لا يتجزّأ", r.status, 400);
      same("   وصفرُ كتابةٍ كامل", await moneyOf(pid), ZERO_MONEY);
      same("   ولا دفعة", (await paymentsOf(pid)).length, 0);
    }
    {
      const { pid, fid } = await readySale("مجّانيّ — بلا قبض");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 800_000, discountAmount: 800_000, expertUserId: EXPERT });
      same("G. بيعٌ مجّانيّ بلا قبضٍ ⟶ ينجح، مجّانيّاً صراحةً",
        [r.status, r.body?.converted, (await fRow(fid)).pk], [200, true, "free"]);
      same("   ولا دفعة", (await paymentsOf(pid)).length, 0);
    }
    {
      const { pid, fid } = await readySale("مجّانيّ — صفرٌ صريح");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 800_000, discountAmount: 800_000, expertUserId: EXPERT, paidNow: 0 });
      same("   وصفرٌ صريحٌ للقبض على المجّانيّ ⟶ ينجح كذلك", [r.status, r.body?.converted],
        [200, true]);
      same("   ولا دفعة", (await paymentsOf(pid)).length, 0);
    }
    {
      const { pid, fid } = await readySale("مجّانيّ — قبضٌ موجب مرفوض");
      const r = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 800_000, discountAmount: 800_000, expertUserId: EXPERT, paidNow: 1 });
      same("   وقبضٌ موجبٌ على المجّانيّ ⟶ ٤٠٠ — حتى دينارٌ واحد", r.status, 400);
      same("   **وصفرُ كتابةٍ كامل — لا تحويل ولا دفعة**", await moneyOf(pid), ZERO_MONEY);
      same("   ولا دفعة", (await paymentsOf(pid)).length, 0);
    }
    {
      const { pid, fid } = await readySale("ضغطةٌ ثانيةٌ بعد قبض");
      const body = {
        originalPrice: 400_000, discountAmount: 0, expertUserId: EXPERT, paidNow: 150_000,
      };
      const first = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv, body);
      same("H. أوّل حفظٍ بقبضٍ جزئيّ ⟶ ينجح", [first.status, first.body?.converted], [200, true]);
      const second = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv, body);
      same("   **وإعادةُ الطلب نفسِه بعد النجاح ⟶ تُرفَض** (الصفُّ محوَّلٌ أصلاً — حارسُ"
        + " `setCommercialFields` القائم)", second.status, 409);
      const pays = await paymentsOf(pid);
      same("   **ودفعةٌ واحدةٌ بالضبط رغم الإعادة — لا قبضَ مزدوج**", pays.length, 1);
      same("   بنفس المبلغ الأصليّ", Number(pays[0].amount), 150_000);
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
