// **الصيانةُ المبسّطة** (المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨) — حيّاً على Postgres
// وعلى النقطة الحقيقية `/api/no-exam/maintenance`.
// قاعدة محلّية: `npm run test:maintenance-simplify`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// جهازٌ ⟵ جزءٌ إن لزم ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ **حفظٌ واحد** يفتح أمرَ
// العمل ويقيّد المبلغَ النهائيّ معه — بلا اعتمادٍ لاحق ولا طبيبَ ولا طابور.
//
// وما يُثبته هنا، بندَ بندٍ (أ–ن):
//   • **أ**: تكافؤُ الأدوار الأربعة (استقبال/محاسب/مدير فرع/مسؤول) —
//     نفسُ الفعل، نفسُ النقطة، بلا شاشةٍ خاصّة — ورفضُ الطبيب المطلق ولو
//     نادى النقطةَ مباشرةً.
//   • **ب**: اشتقاقُ السعر (عاديّ/بخصم/مجّانيّ) والتحقّقُ قبل الكتابة،
//     ومقاومةُ تلفيق قيمٍ محسوبة من العميل.
//   • **ج**: نيّةُ الجهاز الصريحة — حصراً واحدٌ من (حلقةٌ صالحة، إقرارٌ
//     صريح بعدم التسجيل) — وحُرّاسُ `resolveDeviceTargetTx` تحت القفل.
//   • **د**: الجزءُ إلزاميٌّ للأطراف وحده.
//   • **هـ**: التحقّقُ من فرع الخبير.
//   • **و**: صفرٌ دائماً لـ`pending_service_charges` و
//     `service_discount_requests` و`medical_review_requests`.
//   • **ز**: تقاعدُ `/api/manufacturing/maintenance-visit` — ٤٠٩ للمخوَّلين
//     بصفر كتابة، و٤٠٣ لغيرهم كما كان.
//   • **ح**: الصفوفُ التاريخية (اعتمادُ خصمٍ موروث) تبقى قابلةً للحلّ —
//     `NULL` على الحقول المُهيكَلة الجديدة.
//   • **ط**: الحقلُ المُهيكَل يطابق الحقيقةَ المالية الفعلية.
//   • **ي**: الصيانةُ المجّانية عمليةٌ حقيقية.
//   • **ك**: توافقُ `no_exam_no_charge` — صراحةً على الجديد، بلا مسّ القديم.
//   • **ل**: التزامن — ضغطتان متزامنتان ⟶ أمرٌ واحد بالضبط.
//   • **م**: عقدُ الشاشة (`NoExamOperationDialog.tsx`).
//   • **ن**: بقاءُ المرحلتين ١ و٢ — انحدارٌ صفريّ.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { canCompleteMaintenance, MAINTENANCE_SUCCESS_MESSAGE } from "@shared/maintenance";
import { deriveOfferFromDiscount } from "@shared/commercial";
//  **قسم ن** يثبت أن بيعَ الجزء (المرحلة الأولى) بقي حيّاً بعد تبسيطه في
//  المرحلة الرابعة — بعقده الجديد، لا القديم.
import { COMPONENT_SALE_SUCCESS_MESSAGE } from "@shared/component_sale";
//  **قسم س** ينادي المخزن مباشرةً — متجاوزاً نقطة REST وفحصَها المبكّر —
//  ليثبت أن الحارسَ المعامَليّ نفسَه هو السلطة، لا الفحصُ المبكّر وحده.
import * as pendingChargeStore from "./pending_charges/store";

const DIALOG_SRC = readFileSync(
  join(process.cwd(), "client/src/components/NoExamOperationDialog.tsx"), "utf8");
const ROUTES_SRC = readFileSync(
  join(process.cwd(), "server/pending_charges/routes.ts"), "utf8");
const MFG_ROUTES_SRC = readFileSync(
  join(process.cwd(), "server/manufacturing/routes.ts"), "utf8");
const DISCOUNTS_STORE_SRC = readFileSync(
  join(process.cwd(), "server/discounts/store.ts"), "utf8");

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

const PORT = 6857;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الصيانة-المبسّطة";
const ADMIN = 9961, MANAGER = 9962, ACC = 9963, RECV = 9964, DOC = 9965,
  EXPERT = 9966, EXPERT2 = 9967, EXPERT_OTHER_BRANCH = 9968, RECV_BRANCH2 = 9969;
const USERS = [ADMIN, MANAGER, ACC, RECV, DOC, EXPERT, EXPERT2, EXPERT_OTHER_BRANCH, RECV_BRANCH2];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: {},
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "مدير الفرع", permissions: {},
  },
  acc: {
    userId: ACC, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب", permissions: {},
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canAddPatients: true },
  },
  recvBranch2: {
    userId: RECV_BRANCH2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "ريام ٢", permissions: { canAddPatients: true },
  },
  /** طبيبٌ يحمل `canAddPatients` — يثبت أن الاعتماد على الدور وحده. */
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "سعد", permissions: { canAddPatients: true, canWriteMedicalExam: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {},
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
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, opts: { support?: boolean; branch?: number } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $5,$3,$4,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, opts.support !== true, opts.support === true,
      opts.branch ?? 1]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic", branch = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$3,$2,0,'manual','active') RETURNING id`, [patientId, caseType, branch]);
  return r[0].id;
}
async function mkEpisode(patientId: number, caseId: number, seq: number, status: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, created_by, delivered_at)
     VALUES ($1,$2,1,$3,$4,0,$5,CASE WHEN $4='delivered' THEN NOW() ELSE NULL END) RETURNING id`,
    [patientId, caseId, seq, status, MANAGER]);
  return r[0].id;
}

//  **`paidNow: 0` افتراضٌ آمن هنا** — المرحلة الخامسة («المبلغ المدفوع
//  الآن») صيّرته إلزامياً على سعرٍ موجب؛ صفرٌ صريحٌ = «دَينٌ كامل» وهذا ما
//  تفترضه هذه الاختباراتُ ضمناً أصلاً (بلا دفعاتٍ إطلاقاً)، فلا يغيّر شيئاً.
const maint = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, { paidNow: 0, ...body });
const oldMaintDoor = (body: any, session: any = S.recv) =>
  http("POST", "/api/manufacturing/maintenance-visit", session, body);

async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT COALESCE(SUM(cost),0)::int FROM patient_cases WHERE patient_id=$1) AS case_cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) AS ledger,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ledger_rows,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM visits WHERE patient_id=$1) AS visits,
      (SELECT count(*)::int FROM pending_service_charges WHERE patient_id=$1) AS pending,
      (SELECT count(*)::int FROM service_discount_requests WHERE patient_id=$1) AS discounts,
      (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
}
const ZERO = {
  total: 0, case_cost: 0, ledger: 0, ledger_rows: 0, orders: 0, visits: 0,
  pending: 0, discounts: 0, reviews: 0,
};

const orderOf = async (id: number) => {
  const [r] = await q(`SELECT id, patient_id::int p, branch_id::int b, service_type st,
      purpose, status, device_episode_id::int de, expert_user_id::int ex,
      maintenance_component mc, device_origin origin, no_exam_no_charge nocharge,
      maintenance_original_price::int mop, maintenance_final_price::int mfp,
      maintenance_price_kind mpk
    FROM prosthetic_work_orders WHERE id=$1`, [id]);
  return r ?? null;
};

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM pending_service_charge_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, branchIds] of [
    [ADMIN, "admin", "المسؤول", 1, [1, 2]],
    [MANAGER, "branch_manager", "مدير الفرع", 1, [1]],
    [ACC, "accountant", "المحاسب", 1, [1]],
    [RECV, "reception", "ريام", 1, [1]],
    [RECV_BRANCH2, "reception", "ريام ٢", 2, [2]],
    [DOC, "doctor", "سعد", 1, [1]],
    [EXPERT, "prosthetics_expert", "الخبير", 1, [1]],
    [EXPERT2, "prosthetics_expert", "الخبير الثاني", 1, [1]],
    //  **بفرعه هو وحده** — لا `[1,2]` للجميع، وإلّا مرّ اختبارُ «خبيرُ فرعٍ
    //  آخر يُردّ» بصمتٍ لأن الخبير كان سيبقى مؤهَّلاً للفرع ١ فعلياً.
    [EXPERT_OTHER_BRANCH, "prosthetics_expert", "خبير فرعٍ آخر", 2, [2]],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,'["prosthetic","medical_support"]'::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `sm_u${id}`, role, name, branch, JSON.stringify(branchIds)]);
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
    console.log("\n── ٠. العقدُ الخالص — بلا قاعدة بيانات ──");
    // ══════════════════════════════════════════════════════════════════
    check(canCompleteMaintenance({ isAdmin: true }), "٠١. المسؤولُ يمرّ دائماً");
    check(canCompleteMaintenance({ role: "reception" }), "٠٢. الاستقبالُ يمرّ");
    check(canCompleteMaintenance({ role: "accountant" }), "٠٣. المحاسبُ يمرّ");
    check(canCompleteMaintenance({ role: "branch_manager" }), "٠٤. مديرُ الفرع يمرّ");
    check(!canCompleteMaintenance({ role: "doctor" }), "٠٥. الطبيبُ يُرفَض دائماً");
    check(!canCompleteMaintenance({ role: "prosthetics_expert" }), "٠٦. الخبيرُ يُرفَض");
    check(!canCompleteMaintenance(null), "٠٧. جلسةٌ غائبة تُرفَض");
    same("٠٨. عاديّ: خصمٌ صفر", deriveOfferFromDiscount({ originalPrice: 1000, discountAmount: 0 }),
      { ok: true, kind: "normal", originalPrice: 1000, finalPrice: 1000, discountAmount: 0 });
    same("٠٩. بخصم", deriveOfferFromDiscount({ originalPrice: 1000, discountAmount: 300 }),
      { ok: true, kind: "discount", originalPrice: 1000, finalPrice: 700, discountAmount: 300 });
    same("١٠. مجّانيّ صراحةً", deriveOfferFromDiscount({ originalPrice: 1000, discountAmount: 1000 }),
      { ok: true, kind: "free", originalPrice: 1000, finalPrice: 0, discountAmount: 1000 });
    check(!deriveOfferFromDiscount({ originalPrice: 0, discountAmount: 0 }).ok,
      "١١. سعرٌ أصليّ صفر يُرفَض");
    check(!deriveOfferFromDiscount({ originalPrice: 1000, discountAmount: 1200 }).ok,
      "١٢. خصمٌ يتجاوز الأصلَ يُرفَض");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. تكافؤُ الأدوار الأربعة، ورفضُ الطبيب المطلق ──");
    // ══════════════════════════════════════════════════════════════════
    for (const [label, session] of [
      ["الاستقبال", S.recv], ["المحاسب", S.acc],
      ["مديرُ الفرع", S.manager], ["المسؤول", S.admin],
    ] as const) {
      const pid = await mkPatient(`تكافؤ-${label}`);
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT,
        maintenanceComponent: "socket",
        legacyUnrecordedDevice: true,
        originalPrice: 50_000, discountAmount: 0,
      }, session);
      check(r.status === 201, `أ. ${label} يُتمّ الصيانةَ بنجاح`, JSON.stringify(r.body));
      same(`أ. ${label} — الرسالةُ الموحَّدة`, r.body?.message, MAINTENANCE_SUCCESS_MESSAGE);
    }
    {
      const pid = await mkPatient("رفض-الطبيب");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 50_000, discountAmount: 0,
      }, S.doc);
      check(r.status === 403, "أ. الطبيبُ يُرفَض ٤٠٣ ولو حمل canAddPatients", String(r.status));
      const m = await moneyOf(pid);
      same("أ. ولا أثرَ ماليّاً أو تشغيلياً لمحاولة الطبيب", m, ZERO);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. السعرُ — اشتقاقٌ وتحقّقٌ ومقاومةُ تلفيق ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("سعر-عادي");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 0,
      });
      check(r.status === 201 && r.body.priceKind === "normal" && r.body.finalPrice === 40_000,
        "ب١. عاديّ ⟶ نهائيّ = أصليّ", JSON.stringify(r.body));
      const m = await moneyOf(pid);
      check(m.total === 40_000 && m.ledger === 40_000 && m.ledger_rows === 1,
        "ب١. والمالُ يُقيَّد بدقّة", JSON.stringify(m));
    }
    {
      const pid = await mkPatient("سعر-خصم");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 15_000,
      });
      check(r.status === 201 && r.body.priceKind === "discount" && r.body.finalPrice === 25_000,
        "ب٢. بخصم ⟶ نهائيّ = أصليّ − خصم", JSON.stringify(r.body));
      const m = await moneyOf(pid);
      check(m.total === 25_000, "ب٢. والمالُ المقيَّد هو النهائيّ لا الأصليّ", JSON.stringify(m));
    }
    {
      const pid = await mkPatient("سعر-مجاني");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 40_000,
      });
      check(r.status === 201 && r.body.priceKind === "free" && r.body.finalPrice === 0,
        "ب٣. مجّانيّ صراحةً ⟶ نهائيّ صفر", JSON.stringify(r.body));
    }
    {
      const pid = await mkPatient("سعر-غير-صالح");
      await mkCase(pid, "prosthetic");
      const r1 = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 0, discountAmount: 0,
      });
      check(r1.status === 400, "ب٤. سعرٌ أصليّ صفر يُردّ ٤٠٠");
      const r2 = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 50_000,
      });
      check(r2.status === 400, "ب٤. خصمٌ يتجاوز الأصلَ يُردّ ٤٠٠");
      same("ب٤. وصفرُ كتابة", await moneyOf(pid), ZERO);
    }
    {
      //  **مقاومةُ تلفيق القيم المحسوبة** — العميلُ لا يُرسل سعراً نهائياً
      //  ولا نوعَ سعرٍ أبداً، وحتى لو أرسلهما فالخادمُ يشتقّهما بنفسه.
      const pid = await mkPatient("مقاومة-تلفيق");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 15_000,
        // حقولٌ غريبة — لا وجودَ لها في العقد، ويجب أن تُتجاهَل.
        finalPrice: 1, priceKind: "free", decision: "bought",
      });
      check(r.status === 201 && r.body.finalPrice === 25_000 && r.body.priceKind === "discount",
        "ب٥. القيمُ الملفَّقة تُتجاهَل — الاشتقاقُ من originalPrice/discountAmount وحدهما",
        JSON.stringify(r.body));
    }
    {
      //  **الحقولُ القديمة تُرفَض صراحةً** — لا تُقرأ بصمت.
      const pid = await mkPatient("حقول-قديمة");
      await mkCase(pid, "prosthetic");
      for (const legacy of [{ charged: true, amount: 1000 }, { amount: 1000 },
        { deviceOrigin: "registered" }]) {
        const r = await maint({
          patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
          legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 0,
          ...legacy,
        });
        check(r.status === 400, `ب٦. العقدُ القديم (${Object.keys(legacy).join(",")}) يُرفَض ٤٠٠`,
          JSON.stringify(r.body));
      }
      same("ب٦. وصفرُ كتابة", await moneyOf(pid), ZERO);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. نيّةُ الجهاز الصريحة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("جهاز-لا-نية");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        originalPrice: 40_000, discountAmount: 0,
        // بلا deviceEpisodeId ولا legacyUnrecordedDevice — صمتٌ تامّ.
      });
      check(r.status === 400, "ج١. صمتٌ تامّ عن الجهاز يُردّ ٤٠٠");
    }
    {
      const pid = await mkPatient("جهاز-تناقض");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkEpisode(pid, caseId, 1, "delivered");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        deviceEpisodeId: epId, legacyUnrecordedDevice: true,
        originalPrice: 40_000, discountAmount: 0,
      });
      check(r.status === 400, "ج٢. جهازٌ محدَّد + «غير مسجَّل» معاً ⟶ ٤٠٠ (تناقض)");
    }
    {
      const pid = await mkPatient("جهاز-مسجل-صحيح");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkEpisode(pid, caseId, 1, "delivered");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        deviceEpisodeId: epId, originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 201 && r.body.deviceEpisodeId === epId,
        "ج٣. جهازٌ مسلَّمٌ صحيح ⟶ يُقبَل وتُسجَّل هويّتُه", JSON.stringify(r.body));
      const order = await orderOf(r.body.workOrderId);
      same("ج٣. والأمرُ يحمل الحلقةَ نفسَها", order?.de, epId);
    }
    {
      //  حلقةٌ لمريضٍ آخر — لا تُلتقَط.
      const pidA = await mkPatient("جهاز-مريض-أ");
      const caseA = await mkCase(pidA, "prosthetic");
      const epA = await mkEpisode(pidA, caseA, 1, "delivered");
      const pidB = await mkPatient("جهاز-مريض-ب");
      await mkCase(pidB, "prosthetic");
      const r = await maint({
        patientId: pidB, expertUserId: EXPERT, maintenanceComponent: "socket",
        deviceEpisodeId: epA, originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 400, "ج٤. حلقةُ مريضٍ آخر تُردّ ٤٠٠ ولا تُسرَق");
      same("ج٤. وصفرُ كتابة على كليهما",
        [await moneyOf(pidA), await moneyOf(pidB)], [ZERO, ZERO]);
    }
    {
      //  حلقةٌ غيرُ مسلَّمة (قيد التصنيع) — ليست محلَّ صيانة.
      const pid = await mkPatient("جهاز-غير-مسلم");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkEpisode(pid, caseId, 1, "in_manufacturing");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        deviceEpisodeId: epId, originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 400, "ج٥. حلقةٌ قيد التصنيع (غير مسلَّمة) تُردّ ٤٠٠");
    }
    {
      //  معرّفُ حلقةٍ غير صالح (نصّ، سالب، صفر).
      const pid = await mkPatient("جهاز-معرف-فاسد");
      await mkCase(pid, "prosthetic");
      for (const bad of ["abc", -1, 0]) {
        const r = await maint({
          patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
          deviceEpisodeId: bad, originalPrice: 30_000, discountAmount: 0,
        });
        check(r.status === 400, `ج٦. معرّفٌ فاسد (${JSON.stringify(bad)}) يُردّ ٤٠٠`);
      }
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الجزءُ إلزاميٌّ للأطراف وحده ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("جزء-مفقود-اطراف");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, legacyUnrecordedDevice: true,
        originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 400, "د١. الأطرافُ بلا جزءٍ ⟶ ٤٠٠");
    }
    {
      const pid = await mkPatient("جزء-غير-مطلوب-مساند", { support: true });
      await mkCase(pid, "medical_support");
      const r = await maint({
        patientId: pid, serviceType: "medical_support", expertUserId: EXPERT,
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 201, "د٢. المساندُ بلا جزءٍ ⟶ يُقبَل", JSON.stringify(r.body));
      const order = await orderOf(r.body.workOrderId);
      same("د٢. ولا جزءَ يُكتب", order?.mc, null);
    }
    {
      //  جزءٌ غيرُ صالح (خارج القائمة القانونية).
      const pid = await mkPatient("جزء-غير-صالح");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "not_a_real_part",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 400, "د٣. جزءٌ خارج القائمة القانونية يُردّ ٤٠٠");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. الخبير — فرعٌ ونشاط ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("خبير-فرع-اخر");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT_OTHER_BRANCH, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 400, "هـ١. خبيرُ فرعٍ آخر يُردّ ٤٠٠");
    }
    {
      const pid = await mkPatient("خبير-غير-موجود");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: 999_999, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      });
      check(r.status === 400, "هـ٢. خبيرٌ غيرُ موجود يُردّ ٤٠٠");
    }
    {
      //  مديرُ فرعٍ يحاول عبر مريضٍ في فرعٍ آخر — يُردّ قبل الخبير حتى.
      const pid = await mkPatient("فرع-خارج-النطاق", { branch: 2 });
      await mkCase(pid, "prosthetic", 2);
      const r = await maint({
        patientId: pid, expertUserId: EXPERT_OTHER_BRANCH, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      }, S.manager);
      check(r.status === 403, "هـ٣. مديرُ فرعٍ يُردّ ٤٠٣ خارج نطاقه");
      const r2 = await maint({
        patientId: pid, expertUserId: EXPERT_OTHER_BRANCH, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      }, S.admin);
      check(r2.status === 201, "هـ٣. والمسؤولُ يمضي بلا قيدِ فرع", JSON.stringify(r2.body));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. صفرٌ دائماً للصفوف الوسيطة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("صفر-وسيط");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "knee",
        legacyUnrecordedDevice: true, originalPrice: 60_000, discountAmount: 10_000,
        note: "ملاحظةٌ حرّة",
      });
      check(r.status === 201, "و. الحفظُ نجح", JSON.stringify(r.body));
      const m = await moneyOf(pid);
      check(m.pending === 0, "و١. صفرُ pending_service_charges");
      check(m.discounts === 0, "و٢. صفرُ service_discount_requests");
      check(m.reviews === 0, "و٣. صفرُ medical_review_requests");
      check(m.orders === 1 && m.visits === 1, "و٤. أمرٌ واحدٌ وزيارةٌ واحدة بالضبط");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. تقاعدُ الباب القديم `/api/manufacturing/maintenance-visit` ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("باب-قديم-مخول");
      await mkCase(pid, "prosthetic");
      const before = await moneyOf(pid);
      const r = await oldMaintDoor({
        patientId: pid, expertUserId: EXPERT, cost: 20_000,
        maintenanceComponent: "socket",
      }, S.recv);
      check(r.status === 409, "ز١. مخوَّلٌ (استقبال) يُردّ ٤٠٩ لا ٢٠١", String(r.status));
      same("ز١. وصفرُ كتابة", await moneyOf(pid), before);
    }
    {
      const pid = await mkPatient("باب-قديم-غير-مخول");
      await mkCase(pid, "prosthetic");
      const r = await oldMaintDoor({
        patientId: pid, expertUserId: EXPERT, cost: 20_000,
        maintenanceComponent: "socket",
      }, S.expert); // خبيرٌ بحت — ليس استقبالاً ولا مديراً ولا مسؤولاً.
      check(r.status === 403, "ز٢. غيرُ المخوَّل يُردّ ٤٠٣ كما كان قبل التقاعد");
    }
    check(/status\(409\)\.json\(\{[\s\S]{0,120}تقاعدت/.test(MFG_ROUTES_SRC),
      "ز٣. مصدرُ النقطة القديمة يردّ ٤٠٩ برسالةٍ تدلّ على التقاعد");
    check(!/createMaintenanceOrderWithVisit/.test(
      MFG_ROUTES_SRC.match(/app\.post\("\/api\/manufacturing\/maintenance-visit"[\s\S]*?\}\);/)?.[0] ?? ""),
    "ز٤. ولا نداءَ لأيّ كاتبٍ من داخل النقطة المتقاعدة");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. الصفوفُ التاريخية (اعتمادُ خصمٍ موروث) تبقى قابلةً للحلّ ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  محاكاةٌ لنداء `server/discounts/store.ts` الحقيقيّ — بلا `commercialTerms`،
      //  تماماً كما يناديها اليوم (مصدره لم يُمَسّ، القسمُ التالي يثبته).
      const mfg = await import("./manufacturing/store");
      const pid = await mkPatient("موروث-اعتماد-خصم");
      await mkCase(pid, "prosthetic");
      const order = await mfg.createMaintenanceOrderWithVisit({
        patientId: pid, branchId: 1, serviceType: "prosthetic", expertUserId: EXPERT,
        expectedDeliveryDate: null, assignedBy: MANAGER,
        visitNotes: "صيانة طرف/مسند", visitDate: new Date(),
        cost: 12_000, deviceEpisodeId: null, legacyUnrecordedDevice: true,
        maintenanceComponent: "tube",
        //  بلا deviceOrigin ولا commercialTerms — نفسُ شكل نداء الاعتماد الموروث.
      });
      const row = await orderOf(order.id);
      check(row !== null && row.mop === null && row.mfp === null && row.mpk === null,
        "ح١. صفٌّ بشكل الاعتماد الموروث ⟶ الحقولُ المُهيكَلة الثلاثة NULL",
        JSON.stringify(row));
      const m = await moneyOf(pid);
      check(m.total === 12_000 && m.ledger === 12_000,
        "ح٢. والمالُ يُقيَّد بنفس الكاتب القانونيّ رغم غياب الحقول المُهيكَلة");
    }
    check(/createMaintenanceOrderWithVisit\(\{[\s\S]{0,900}?tx,\n\s*\}\);/.test(DISCOUNTS_STORE_SRC),
      "ح٣. مصدرُ اعتماد الخصم الموروث لم يُمَسّ — النداءُ بشكله القديم بحرفه");
    check(!/commercialTerms/.test(DISCOUNTS_STORE_SRC),
      "ح٤. ولا ذكرَ لِـ`commercialTerms` هناك إطلاقاً — إضافةٌ اختيارية لم تفرض شيئاً على القديم");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. الحقلُ المُهيكَل يطابق الحقيقةَ المالية ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("تطابق-مهيكل");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "adapter",
        legacyUnrecordedDevice: true, originalPrice: 55_000, discountAmount: 20_000,
      });
      const order = await orderOf(r.body.workOrderId);
      const m = await moneyOf(pid);
      same("ط١. الأصليّ المُهيكَل = ما أرسله الموظّف", order?.mop, 55_000);
      same("ط٢. النهائيّ المُهيكَل = المُقيَّد فعلاً في الدفتر", order?.mfp, m.ledger);
      same("ط٣. النهائيّ المُهيكَل = المُقيَّد في total_cost", order?.mfp, m.total);
      same("ط٤. النوعُ المُهيكَل = ما اشتقّه الخادم", order?.mpk, "discount");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. الصيانةُ المجّانية عمليةٌ حقيقية ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("مجاني-حقيقي");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "foot",
        legacyUnrecordedDevice: true, originalPrice: 45_000, discountAmount: 45_000,
      });
      check(r.status === 201, "ي١. المجّانيّ يُحفَظ بنجاح", JSON.stringify(r.body));
      const order = await orderOf(r.body.workOrderId);
      check(order !== null, "ي٢. أمرُ العمل مُنشَأ فعلاً");
      const m = await moneyOf(pid);
      check(m.orders === 1 && m.visits === 1, "ي٣. وزيارةٌ حقيقية معه");
      same("ي٤. بلا كلفةٍ ولا قيدٍ ولا دينار", { total: m.total, ledger: m.ledger, ledger_rows: m.ledger_rows },
        { total: 0, ledger: 0, ledger_rows: 0 });
      same("ي٥. والمُهيكَلُ يقول «مجّانيّ» صراحةً — لا يُستدَلّ عليه بغياب صفّ",
        { kind: order?.mpk, original: order?.mop, final: order?.mfp },
        { kind: "free", original: 45_000, final: 0 });
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. توافقُ `no_exam_no_charge` — صراحةً على الجديد وحده ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pidFree = await mkPatient("توافق-مجاني");
      await mkCase(pidFree, "prosthetic");
      const rFree = await maint({
        patientId: pidFree, expertUserId: EXPERT, maintenanceComponent: "foam_cover",
        legacyUnrecordedDevice: true, originalPrice: 10_000, discountAmount: 10_000,
      });
      same("ك١. مجّانيّ جديد ⟶ no_exam_no_charge = true",
        (await orderOf(rFree.body.workOrderId))?.nocharge, true);

      const pidPaid = await mkPatient("توافق-مدفوع");
      await mkCase(pidPaid, "prosthetic");
      const rPaid = await maint({
        patientId: pidPaid, expertUserId: EXPERT, maintenanceComponent: "foam_cover",
        legacyUnrecordedDevice: true, originalPrice: 10_000, discountAmount: 3_000,
      });
      same("ك٢. بخصمٍ جديد ⟶ no_exam_no_charge = false (ليس NULL)",
        (await orderOf(rPaid.body.workOrderId))?.nocharge, false);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. التزامن — ضغطتان متزامنتان ⟶ أمرٌ واحد بالضبط ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("تزامن-صيانة");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkEpisode(pid, caseId, 1, "delivered");
      const [r1, r2] = await Promise.all([
        maint({
          patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
          deviceEpisodeId: epId, originalPrice: 20_000, discountAmount: 0,
        }),
        maint({
          patientId: pid, expertUserId: EXPERT2, maintenanceComponent: "socket",
          deviceEpisodeId: epId, originalPrice: 20_000, discountAmount: 0,
        }),
      ]);
      const statuses = [r1.status, r2.status].sort();
      same("ل١. واحدةٌ تنجح (٢٠١) والأخرى ترتدّ (٤٠٩)", statuses, [201, 409]);
      const m = await moneyOf(pid);
      check(m.orders === 1 && m.ledger_rows === 1,
        "ل٢. أمرٌ واحد وقيدٌ واحد بالضبط — لا نصفَ كتابة", JSON.stringify(m));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── م. عقدُ الشاشة `NoExamOperationDialog.tsx` ──");
    // ══════════════════════════════════════════════════════════════════
    check(/no-exam-op-original-price/.test(DIALOG_SRC) && /no-exam-op-discount-amount/.test(DIALOG_SRC),
      "م١. حقلا السعر الأصلي ومقدار الخصم موجودان");
    check(/no-exam-op-final-price/.test(DIALOG_SRC),
      "م٢. سطرُ السعر النهائي للقراءة فقط موجود");
    check(!/data-testid="no-exam-op-origin"/.test(DIALOG_SRC),
      "م٣. سؤالُ منشأ الجهاز حُذف تماماً");
    check(!/DEVICE_ORIGIN/.test(DIALOG_SRC),
      "م٤. ولا استيرادَ لمفردات المنشأ إطلاقاً");
    check(/UNREGISTERED_DEVICE/.test(DIALOG_SRC) && /no-exam-op-device[^-]/.test(DIALOG_SRC),
      "م٥. مُنتقي الجهاز الموحَّد (مسجَّل/غير مسجَّل) موجود");
    check(/MAINTENANCE_SUCCESS_MESSAGE/.test(DIALOG_SRC),
      "م٦. رسالةُ النجاح الموحَّدة مستوردةٌ ومُستعمَلة");
    {
      const maintBlock = DIALOG_SRC.match(
        /\{kind === "maintenance" && \([\s\S]*?\)\}\n\n\s*\{\/\* ── مَن ينفّذ/)?.[0] ?? "";
      check(maintBlock.length > 0, "م٧. فرعُ الصيانة في الشاشة معزولٌ ومحدَّد");
      check(!/no-exam-op-no-charge/.test(maintBlock),
        "م٨. مربّعُ «بلا أجور» غيرُ موجودٍ في فرع الصيانة");
    }
    // ⚠ الرجعة (PR #269, main قبل هذا الفرع): صار للعنوان طرفٌ ثالثٌ
    // `attaching ? COMPONENT_ATTACH_SUCCESS_MESSAGE :` قبل ثنائيّ الصيانة/بيع
    // الجزء القديم — التحقّقُ الدقيق تحديثاً لا تخفيفاً.
    check(/title:\s*attaching\s*\?\s*COMPONENT_ATTACH_SUCCESS_MESSAGE\s*:\s*kind === "maintenance" \? MAINTENANCE_SUCCESS_MESSAGE : COMPONENT_SALE_SUCCESS_MESSAGE/
      .test(DIALOG_SRC),
      "م٩. نجاحُ الصيانة لا يقرأ `reviewRouted` — رسالةٌ واحدة دائماً (مشتركةٌ مع بيع الجزء الآن وإلحاقه)");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ن. بقاءُ المرحلتين ١ و٢ — انحدارٌ صفريّ ──");
    // ══════════════════════════════════════════════════════════════════
    //  ⚠ **تحديثٌ (المرحلة الرابعة، ٢٠٢٦-٠٨-٢٨)**: بيعُ الجزء بلا معاينة —
    //  «المرحلة الأولى» التي يحرسها هذا القسم — **غيّر عقدَه وصلاحيتَه
    //  بقرارٍ صريح ومُوثَّق** (`server/component_sale.test.ts` يثبته بالتفصيل):
    //  حفظٌ واحد (لا فتحُ حلقةٍ ثمّ بيعٌ)، `originalPrice`/`discountAmount`
    //  بدل `charged`/`amount`، و`canCompleteComponentSale` بدل
    //  `canOperateNoExam`. **وهذا ليس انحداراً بل تطوّراً مقصوداً** — فما
    //  يبقى هذا القسمُ يحرسه هو **بقاءُ البابِ نفسِه حيّاً بسلوكه الجديد**،
    //  لا تجمّد عقده القديم إلى الأبد.
    {
      //  بيعُ جزءٍ بلا معاينة (المرحلة الأولى) لا يزال يعمل — بعقده الجديد.
      const pid = await mkPatient("انحدار-بيع-جزء");
      await mkCase(pid, "prosthetic");
      const saleRes = await http("POST", "/api/no-exam/device-sale", S.recv, {
        patientId: pid, component: "socket", expertUserId: EXPERT,
        originalPrice: 30_000, discountAmount: 0, paidNow: 0,
      });
      check(saleRes.status === 201 && saleRes.body?.reviewRouted === undefined
        && saleRes.body?.message === COMPONENT_SALE_SUCCESS_MESSAGE,
        "ن١–٢. بيعُ الجزء يعمل بعقده الجديد (originalPrice/discountAmount)"
        + " — بلا reviewRouted، ورسالةُ النجاح الموحَّدة",
        JSON.stringify(saleRes.body));
      //  والعقدُ القديم صار يُرفَض صراحةً — لا يُقرأ بصمت.
      const oldContract = await http("POST", "/api/no-exam/device-sale", S.recv, {
        patientId: pid, serviceType: "prosthetic", deviceEpisodeId: 1,
        expertUserId: EXPERT, charged: true, amount: 30_000,
      });
      check(oldContract.status === 400,
        "ن٢ب. والعقدُ القديم charged/amount مرفوضٌ صراحةً الآن — لا يُقرأ بصمت",
        JSON.stringify(oldContract.body));
    }
    check(/canCompleteComponentSale/.test(ROUTES_SRC),
      "ن٣. `canCompleteComponentSale` (لا `canOperateNoExam`) تحرس بيعَ الجزء الآن");
    check(/canFinalizeLegacyCharge/.test(ROUTES_SRC), "ن٤. وطابورُ الإكمال الموروث كما هو");
    check(!/(async )?function routeRetrospectiveReview/.test(ROUTES_SRC)
      && !/await routeRetrospectiveReview\(/.test(ROUTES_SRC),
      "ن٥. **ولم يعد هناك سجلٌّ استرجاعيّ لبيع الجزء** — الدالّةُ حُذفت كلّياً"
      + " (قرارُ المالك 2026-08-28: لا دورَ للطبيب في بيع الجزء إطلاقاً)");
    {
      const maintHandler = ROUTES_SRC.match(
        /app\.post\("\/api\/no-exam\/maintenance"[\s\S]*?\n {2}\}\);/)?.[0] ?? "";
      check(maintHandler.length > 0, "ن٦. أُمسكت نقطةُ الصيانة لفحصها معزولةً");
      //  **نداءٌ فعليّ لا مجرّدَ ذكرٍ** — الشرحُ داخل الفرع يذكر اسمَ الدالّة
      //  عمداً ليقول إنها غائبة؛ فالفحصُ عن الاستدعاء الحقيقيّ لا عن الكلمة.
      check(!/(await\s+)?routeRetrospectiveReview\(req/.test(maintHandler),
        "ن٧. ولا نداءَ فعلياً لِـ`routeRetrospectiveReview` من داخلها — بلا مراجعةٍ لاحقة");
      check(!/canOperateNoExam/.test(maintHandler),
        "ن٨. ولا اعتمادَ على `canOperateNoExam` — `canCompleteMaintenance` وحدها");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── س. الحارسان المعامَليّان — تصحيحٌ لاحق على PR #257 ──");
    // ══════════════════════════════════════════════════════════════════
    //  الحالةُ الحقيقية (patient_cases) لا عَلَمُ المريض وحده، والخبيرُ
    //  يُعاد التحقّق منه تحت القفل — كلاهما داخل معاملة `createMaintenanceOperation`
    //  نفسِها، قبل أيّ نداءٍ لـ`createMaintenanceOrderWithVisit`.
    {
      //  س١. عَلَمُ «أطراف» مرفوعٌ بلا أيّ حالةٍ مسجَّلة إطلاقاً — لا
      //  فرعَ يُخترَع ولا خطأَ خامس يُسنَد إليه شيء.
      const pid = await mkPatient("س١-لا-حالة-إطلاقاً");
      const before = await moneyOf(pid);
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      });
      same("س١. عَلَمُ «أطراف» بلا حالةٍ مسجَّلة ⇒ 400", r.status, 400);
      check(String(r.body?.error ?? "").includes("لا توجد حالة"),
        "    برسالةٍ تسمّي غياب الحالة", JSON.stringify(r.body));
      same("    وصفرُ كتابة تماماً — لا أمر ولا زيارة ولا كلفة ولا قيد ولا مجموع",
        await moneyOf(pid), before);
    }
    {
      //  س٢. عَلَمُ «أطراف» + حالةُ علاجٍ طبيعي فقط — **لا يُسنَد إليها
      //  بصمت** (مخرجُ `createMaintenanceOrderWithVisit` الموروث كان
      //  سيفعل ذلك بالضبط لولا هذا الحارس).
      const pid = await mkPatient("س٢-فيزيو-بلا-اطراف");
      await mkCase(pid, "physiotherapy");
      const before = await moneyOf(pid);
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      });
      same("س٢. حالةُ فيزيو فقط لمريضٍ يحمل عَلَم «أطراف» ⇒ 400 — لا إسنادَ لها",
        r.status, 400);
      same("    وصفرُ كتابة", await moneyOf(pid), before);
    }
    {
      //  س٣. نفسُها للمساند — نفسُ الحارس، نفسُ الرفض.
      const pid = await mkPatient("س٣-فيزيو-بلا-مساند", { support: true });
      await mkCase(pid, "physiotherapy");
      const before = await moneyOf(pid);
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, serviceType: "medical_support",
        legacyUnrecordedDevice: true, originalPrice: 30_000, discountAmount: 0,
      });
      same("س٣. حالةُ فيزيو فقط لمريضٍ يحمل عَلَم «مساند» ⇒ 400", r.status, 400);
      same("    وصفرُ كتابة", await moneyOf(pid), before);
    }
    {
      //  س٤. الحالةُ الصحيحة بعينها موجودة ⇒ ينجح، وكلُّ الأرقام تتطابق.
      const pid = await mkPatient("س٤-حالة-صحيحة");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 37_000, discountAmount: 0,
      });
      same("س٤. الحالةُ الصحيحة موجودة ⇒ 201", r.status, 201);
      const money = await moneyOf(pid);
      same("    كلفةُ الحالة = مجموعُ المريض = القيدُ = السعرُ النهائيّ",
        [money.total, money.case_cost, money.ledger], [37_000, 37_000, 37_000]);
      const order = await orderOf(r.body.workOrderId);
      same("    والحقلُ المُهيكَل على الأمر يطابق (أصليّ/نهائيّ/نوع)",
        [order.mop, order.mfp, order.mpk], [37_000, 37_000, "normal"]);

      //  ومجّانيّةٌ حقيقية بنفس الحارس — كلُّ الفروق صفرٌ والعمليةُ تقع مع ذلك.
      const pidFree = await mkPatient("س٤ب-مجاني-حالة-صحيحة");
      await mkCase(pidFree, "prosthetic");
      const beforeFree = await moneyOf(pidFree);
      const rFree = await maint({
        patientId: pidFree, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 20_000, discountAmount: 20_000,
      });
      same("    ومجّانيّةٌ حقيقية بنفس الحارس ⇒ 201", rFree.status, 201);
      const moneyFree = await moneyOf(pidFree);
      same("    والفروقُ الماليةُ كلُّها صفر",
        [moneyFree.total - beforeFree.total, moneyFree.case_cost - beforeFree.case_cost,
          moneyFree.ledger - beforeFree.ledger], [0, 0, 0]);
      same("    والأمرُ والزيارةُ مع ذلك قائمان — عملٌ حقيقيّ بقيمة صفر",
        [moneyFree.orders - beforeFree.orders, moneyFree.visits - beforeFree.visits], [1, 1]);
    }
    {
      //  س٥. الخبيرُ يُعاد التحقّق منه تحت القفل — لا الفحصَ المبكّر وحده.
      //  نداءٌ مباشر للمخزن، **متجاوزاً نقطة REST وفحصَها المبكّر تماماً** —
      //  فلو كان هذا الحارسُ المعامَليّ غائباً لكتب خبيرٌ فاسدٌ ديناراً.
      const pid = await mkPatient("س٥-خبير-تحت-القفل");
      await mkCase(pid, "prosthetic");
      const before = await moneyOf(pid);
      let threw = false, msg = "";
      try {
        await pendingChargeStore.createMaintenanceOperation({
          patientId: pid, branchId: 1, serviceType: "prosthetic",
          //  خبيرٌ لا يعمل في الفرع ١ إطلاقاً — ولم يمرّ بأيّ فحصٍ مبكّر هنا.
          expertUserId: EXPERT_OTHER_BRANCH,
          maintenanceComponent: "socket", deviceEpisodeId: null, legacyUnrecordedDevice: true,
          originalPrice: 15_000, priceKind: "normal", finalPrice: 15_000,
          visitNotes: "س٥", actor: { userId: RECV, userName: "ريام" },
        });
      } catch (e: any) { threw = true; msg = String(e?.message ?? ""); }
      check(threw, "س٥. الخبيرُ غيرُ الصالح لفرع العملية يُرفَض من داخل المعاملة نفسِها",
        msg);
      same("    وصفرُ كتابة — لا أمرَ ولا زيارةَ ولا كلفةَ ولا قيدَ ولا لمسَ إجمالي",
        await moneyOf(pid), before);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ق. «المبلغ المدفوع الآن» — دَينٌ صريح، دفعٌ جزئيّ، دفعٌ"
      + " كامل، ومجّانيّ بلا دفعة (المرحلة الخامسة) ──");
    // ══════════════════════════════════════════════════════════════════
    const paymentsOf = async (patientId: number) => {
      const rows = await q<{
        id: number; amount: number; case_id: number | null;
        visit_id: number | null; device_episode_id: number | null;
        payment_treatment_type: string | null;
      }>(
        `SELECT id, amount::int, case_id::int, visit_id::int, device_episode_id::int,
                payment_treatment_type
           FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
      return rows;
    };
    {
      //  ══ ق١. سعرٌ موجب + مدفوعٌ صفرٌ = دَينٌ كاملٌ صريح — لا دفعة ══════════
      const pid = await mkPatient("ق-دَينٌ-كامل");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
        legacyUnrecordedDevice: true, originalPrice: 60_000, discountAmount: 0, paidNow: 0,
      });
      check(r.status === 201, "ق١. سعرٌ موجب ومدفوعٌ صفرٌ صريح ⟶ ينجح (دَينٌ لا رفض)",
        JSON.stringify(r.body));
      same("    والاستجابةُ تقول الحقيقة: paidNow=0، paymentId=null، والمتبقّي = السعرُ كاملاً",
        [r.body?.paidNow, r.body?.paymentId, r.body?.remainingUnpaid], [0, null, 60_000]);
      same("    وصفرُ صفوفِ دفعاتٍ فعلاً", (await paymentsOf(pid)).length, 0);
      const m = await moneyOf(pid);
      same("    والأمرُ والزيارةُ فُتحا مع ذلك، والكلفةُ مقيَّدةٌ دَيناً",
        [m.orders, m.visits, m.total], [1, 1, 60_000]);
    }
    {
      //  ══ ق٢. دفعٌ جزئيّ — دفعةٌ واحدة، مربوطةٌ بالزيارة بعينها ═══════════
      const pid = await mkPatient("ق-دفعٌ-جزئيّ");
      const c = await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "knee",
        legacyUnrecordedDevice: true, originalPrice: 100_000, discountAmount: 20_000,
        paidNow: 30_000,
      });
      check(r.status === 201, "ق٢. دفعٌ جزئيّ ⟶ ينجح", JSON.stringify(r.body));
      same("    والاستجابةُ: paidNow=30,000، والمتبقّي=50,000 (80,000 نهائيّ − 30,000 مدفوع)",
        [r.body?.paidNow, r.body?.remainingUnpaid], [30_000, 50_000]);
      const pays = await paymentsOf(pid);
      const [visitRow] = await q<{ id: number }>(`SELECT id FROM visits WHERE patient_id=$1`, [pid]);
      same("    ودفعةٌ واحدةٌ بالضبط، مربوطةٌ بالزيارة والحالة بعينهما — لا رصيدَ غيرَ مخصَّص",
        [pays.length, pays[0]?.amount, pays[0]?.visit_id, pays[0]?.case_id],
        [1, 30_000, visitRow.id, c]);
      same("    ووسمُها «أطراف صناعية»", pays[0]?.payment_treatment_type, "أطراف صناعية");
      const m = await moneyOf(pid);
      same("    وكلفةُ الأمر = السعرُ النهائيّ كاملاً (الدفعُ الجزئيّ لا يُنقص الكلفة)",
        m.total, 80_000);

      //  ══ إسنادُ التدقيق — الصفُّ الحقيقيّ لا نصٌّ عامّ ═══════════════════
      const paymentAudit = await q<{
        action: string; user_id: number; user_name: string; new_values: string;
      }>(
        `SELECT action, user_id::int, user_name, new_values
           FROM audit_log WHERE entity_type='payment' AND entity_id=$1`, [pays[0].id]);
      same("    وصفُّ تدقيقٍ واحدٌ بالضبط لهذه الدفعة (entity_type='payment')",
        paymentAudit.length, 1);
      same("    بفاعلٍ حقيقيّ — الجلسةُ التي أنشأت الصيانة (ريام)، لا `null`",
        [paymentAudit[0]?.action, paymentAudit[0]?.user_id, paymentAudit[0]?.user_name],
        ["create", RECV, "ريام"]);
      const auditedAmount = JSON.parse(paymentAudit[0]?.new_values ?? "{}")?.amount;
      same("    والقيمةُ المدقَّقةُ = الدفعةُ نفسُها", Number(auditedAmount), 30_000);

      //  ══ القيدُ اليوميّ — مدينٌ صندوقٌ = دائنٌ إيرادٌ = المبلغُ المدفوع ══════
      const je = await q<{ id: number }>(
        `SELECT id FROM journal_entries WHERE source_type='payment' AND source_id=$1`,
        [pays[0].id]);
      same("    وقيدٌ يوميٌّ واحدٌ بالضبط مصدرُه هذه الدفعة", je.length, 1);
      const lines = await q<{ debit: number; credit: number }>(
        `SELECT debit::int, credit::int FROM journal_lines WHERE entry_id=$1`, [je[0]?.id ?? -1]);
      same("    ومدينُه = دائنُه = ٣٠,٠٠٠ (Dr صندوق / Cr إيراد)",
        [lines.reduce((s, l) => s + (l.debit || 0), 0),
          lines.reduce((s, l) => s + (l.credit || 0), 0)],
        [30_000, 30_000]);
    }
    {
      //  ══ ق٣. دفعٌ كاملٌ — المتبقّي صفر، ولمسندٍ طبّيّ لا طرف ══════════════
      const pid = await mkPatient("ق-دفعٌ-كامل-مسند", { support: true });
      await mkCase(pid, "medical_support");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, serviceType: "medical_support",
        legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 0, paidNow: 40_000,
      });
      check(r.status === 201, "ق٣. دفعٌ كاملٌ على مسندٍ طبّيّ ⟶ ينجح", JSON.stringify(r.body));
      same("    والمتبقّي صفرٌ بالضبط", r.body?.remainingUnpaid, 0);
      const pays = await paymentsOf(pid);
      same("    ودفعةٌ واحدةٌ بكامل السعر، ووسمُها «مساند طبية»",
        [pays.length, pays[0]?.amount, pays[0]?.payment_treatment_type],
        [1, 40_000, "مساند طبية"]);

      //  ══ تدقيقٌ وقيدٌ يوميّ — دفعٌ كاملٌ أيضاً، لا الجزئيّ وحده ══════════════
      const paymentAudit = await q<{ action: string; user_id: number }>(
        `SELECT action, user_id::int FROM audit_log
           WHERE entity_type='payment' AND entity_id=$1`, [pays[0].id]);
      same("    وصفُّ تدقيقٍ واحدٌ ('create') بفاعلٍ حقيقيّ",
        [paymentAudit.length, paymentAudit[0]?.action, paymentAudit[0]?.user_id],
        [1, "create", RECV]);
      const je = await q<{ id: number }>(
        `SELECT id FROM journal_entries WHERE source_type='payment' AND source_id=$1`,
        [pays[0].id]);
      const lines = await q<{ debit: number; credit: number }>(
        `SELECT debit::int, credit::int FROM journal_lines WHERE entry_id=$1`, [je[0]?.id ?? -1]);
      same("    والقيدُ متوازنٌ بكامل السعر (٤٠,٠٠٠)",
        [je.length, lines.reduce((s, l) => s + (l.debit || 0), 0),
          lines.reduce((s, l) => s + (l.credit || 0), 0)],
        [1, 40_000, 40_000]);
    }
    {
      //  ══ ق٤. مجّانيٌّ حقيقيّ — بلا دفعة، والأصليّ والخصمُ الكاملُ محفوظان
      //  على الأمر حتى لو حاول العميلُ إرسالَ مبلغٍ (يُتجاهَل تماماً) ═══════
      const pid = await mkPatient("ق-مجّانيّ");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "adapter",
        legacyUnrecordedDevice: true, originalPrice: 35_000, discountAmount: 35_000,
        //  **مُلفَّقٌ عمداً** — يجب أن يُتجاهَل تماماً لا أن يُنشئ دفعة.
        paidNow: 20_000,
      });
      check(r.status === 201 && r.body?.priceKind === "free" && r.body?.finalPrice === 0,
        "ق٤. مجّانيٌّ حقيقيّ ⟶ ينجح، والنهائيُّ صفرٌ", JSON.stringify(r.body));
      same("    **والقيمةُ المُلفَّقة تُتجاهَل تماماً**: paidNow=0 دائماً على المجّانيّ، ولا paymentId",
        [r.body?.paidNow, r.body?.paymentId], [0, null]);
      same("    وصفرُ صفوفِ دفعاتٍ فعلاً", (await paymentsOf(pid)).length, 0);
      const order = await orderOf(r.body.workOrderId);
      same("    **والأصليُّ والخصمُ الكاملُ محفوظان** — الحقيقةُ المُهيكَلة على الأمر:"
        + " original=35,000، final=0، kind=free",
        [order.mop, order.mfp, order.mpk], [35_000, 0, "free"]);
      const m = await moneyOf(pid);
      same("    والأمرُ والزيارةُ قائمان مع ذلك — عملٌ حقيقيّ بقيمة صفر", [m.orders, m.visits], [1, 1]);
    }
    {
      //  ══ ق٥. المبلغُ المدفوعُ الآن أكبرُ من السعر النهائيّ ⟶ ٤٠٠، صفرُ
      //  كتابة تماماً — لا أمرَ ولا زيارةَ ولا دفعةَ ولا قيدَ ═══════════════
      const pid = await mkPatient("ق-مبلغٌ-يفوق-النهائيّ");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "foot",
        legacyUnrecordedDevice: true, originalPrice: 50_000, discountAmount: 0, paidNow: 50_001,
      });
      check(r.status === 400, "ق٥. مبلغٌ يفوق السعرَ النهائيّ ⟶ ٤٠٠", JSON.stringify(r.body));
      same("    وصفرُ كتابةٍ تماماً — لا أمرَ ولا زيارةَ ولا كلفةَ ولا دفعة",
        await moneyOf(pid), ZERO);
      same("    (وبالتحديد: صفرُ صفوفِ دفعاتٍ)", (await paymentsOf(pid)).length, 0);
    }
    {
      //  ══ ق٦. الفراغُ على سعرٍ موجب ⟶ ٤٠٠ — لا يُخمَّن صفراً صامتاً ═══════
      const pid = await mkPatient("ق-فراغٌ-على-سعرٍ-موجب");
      await mkCase(pid, "prosthetic");
      //  **بلا `paidNow` إطلاقاً** — نداءٌ مباشرٌ (لا عبر `maint()` التي
      //  تفرض الافتراضَ الآمن للاختبارات القديمة وحدها).
      const r = await http("POST", "/api/no-exam/maintenance", S.recv, {
        patientId: pid, expertUserId: EXPERT, maintenanceComponent: "tube",
        legacyUnrecordedDevice: true, originalPrice: 45_000, discountAmount: 0,
      });
      check(r.status === 400, "ق٦. فراغُ المبلغ المدفوع على سعرٍ موجب ⟶ ٤٠٠"
        + " — لا يُخمَّن صفراً صامتاً", JSON.stringify(r.body));
      check((r.body?.error ?? "").includes("إلزاميّ"),
        "    (والرسالةُ تقول: إلزاميّ)", JSON.stringify(r.body));
      same("    وصفرُ كتابةٍ تماماً", await moneyOf(pid), ZERO);
    }
    {
      //  ══ ق٧. التزامن — طلبا صيانةٍ متزامنان على الجهاز نفسِه (المسلَّم) ⟶
      //  واحدٌ ينجح بدفعةٍ واحدة، والآخر يرتدّ بصفر كتابة ═════════════════
      const pid = await mkPatient("ق-تزامنٌ-بلا-ازدواج");
      const c = await mkCase(pid, "prosthetic");
      const ep = await mkEpisode(pid, c, 1, "delivered");
      const [r1, r2] = await Promise.all([
        maint({ patientId: pid, expertUserId: EXPERT, maintenanceComponent: "socket",
          deviceEpisodeId: ep, originalPrice: 70_000, discountAmount: 0, paidNow: 70_000 }),
        maint({ patientId: pid, expertUserId: EXPERT, maintenanceComponent: "knee",
          deviceEpisodeId: ep, originalPrice: 70_000, discountAmount: 0, paidNow: 70_000 }),
      ]);
      const statuses = [r1.status, r2.status].sort();
      same("ق٧. واحدٌ ينجح (٢٠١) بالضبط والآخر يرتدّ (٤٠٩)", statuses, [201, 409]);
      const pays = await paymentsOf(pid);
      same("    ودفعةٌ واحدةٌ بالضبط — لا نصفَ كتابة ولا ازدواج", pays.length, 1);
      const m = await moneyOf(pid);
      same("    وأمرٌ واحدٌ وزيارةٌ واحدةٌ وقيدٌ واحد بالضبط",
        [m.orders, m.visits, m.ledger_rows], [1, 1, 1]);
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص الصيانة المبسّطة نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
