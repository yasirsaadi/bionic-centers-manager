// **بيعُ جزءٍ من طرفٍ صناعي، مبسّطاً** (المرحلة الرابعة، ٢٠٢٦-٠٨-٢٨) — حيّاً
// على Postgres وعلى النقطة الحقيقية `/api/no-exam/device-sale`.
// قاعدة محلّية: `npm run test:component-sale`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// جزءٌ ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ سعرٌ نهائيّ يشتقّه الخادم ⟵ **حفظٌ واحد**
// يفتح الحلقةَ وأمرَ العمل ويقيّد المبلغ معاً — بلا طبيبٍ، بلا مراجعةٍ
// استرجاعية، بلا نداءين منفصلين (فتحُ حلقةٍ ثمّ بيعُها).
//
// وما يُثبته هنا، بندَ بندٍ (أ–ف):
//   • **أ**: تكافؤُ الأدوار الأربعة، ورفضُ الطبيب المطلق ولو نادى النقطةَ
//     مباشرةً، ورفضُ دورٍ آخر (خبير).
//   • **ب**: النطاقُ — كلُّ جزءٍ من الثمانية يُقبَل، والمجهولُ والجهازُ
//     الكاملُ والمسندُ الطبيّ تُرفَض جميعاً.
//   • **ج**: اشتقاقُ السعر بأرقامٍ دقيقة (عاديّ/بخصم/مجّانيّ)، والتحقّقُ
//     قبل الكتابة (أصلٌ ≤ ٠، خصمٌ سالب، خصمٌ يفوق الأصل، كسورٌ)، ومقاومةُ
//     تلفيق `finalPrice`/`priceKind` من العميل.
//   • **د**: العقدُ القديم `charged`/`amount` مرفوضٌ صراحةً بصفر كتابة.
//   • **هـ**: صفرٌ دائماً لـ`pending_service_charges` و
//     `service_discount_requests` و`medical_review_requests` — ولا مراجعةَ
//     استرجاعية للطبيب إطلاقاً.
//   • **و**: تقاعدُ البابِ القديم على `POST /device-episodes` لبيعِ جزءٍ
//     جديد بلا معاينة (٤٠٩)، وبقاءُ مسار المعاينة والمسندِ والجهازِ الكاملِ
//     كما كانا بحرفهما.
//   • **ز**: هويّةُ الحلقة والأمر — حلقةٌ واحدة بالضبط، حقولُها صحيحة، وأمرٌ
//     يشير إليها بخبيرها.
//   • **ح**: الخبيرُ يُعاد التحقّق منه تحت القفل — نداءٌ مباشر للمخزن يتجاوز
//     الفحصَ المبكّر تماماً.
//   • **ف**: الفرعُ الفعليّ للعملية — لا لقطةُ `params.branchId` قبل
//     المعاملة (تصحيحٌ لاحق). فرعٌ خاطئ مُرسَلٌ مباشرةً (حلقةً جديدة أو
//     موروثة) يُرفَض بصفر كتابة، وفرعٌ صحيح يمرّ، والمسؤولُ يُتمّ بيعاً
//     حقيقياً في فرعٍ غير فرع جلسته، والأدوارُ المحجوزة بفرعها كما كانت
//     حرفياً، وفرعٌ فارغ (`NULL`) مصطنَع يُرفَض صراحةً لا يُخمَّن.
//   • **ط**: لا خيطَ أطرافٍ ⟵ صفرُ كتابة؛ والعلاجُ الطبيعيّ وحده لا يتلقّى
//     كلفةً.
//   • **ي**: الفروقُ الماليةُ الموجبة تتطابق عبر خمسة مصادر؛ والمجّانيّ
//     فروقُه كلُّها صفر مع قيام الحلقة والأمر.
//   • **ك**: الحقيقةُ المُهيكَلة (ترحيل ٠٧٠) تطابق الفعل، والصفوفُ التاريخية
//     تبقى `NULL`.
//   • **ل**: حلقةٌ موروثة من الشكل القديم ذي النداءين تُستأنَف بمعرّفها —
//     بلا حلقةٍ ثانية.
//   • **م**: الطابورُ الموروث (`pending_service_charges` من نوع `device_sale`)
//     يبقى قابلاً للقراءة والحسم بمساره القديم؛ وسجلُّ مراجعةٍ طبّية تاريخيّ
//     يبقى محفوظاً بلا مساس.
//   • **ن**: التزامن — بيعان جديدان متزامنان على الخيط نفسه ⟶ واحدٌ ينجح؛
//     وإكمالان متزامنان لحلقةٍ موروثةٍ واحدة ⟶ واحدٌ ينجح.
//   • **س**: عقدُ الشاشة `NoExamOperationDialog.tsx` — حقولٌ بلا «بلا أجور»
//     ولا نداءٍ ثانٍ لفتح الحلقة ولا صياغةَ مراجعةٍ طبية.
//   • **ع**: رؤيةُ المُوجِّه (`reception_routing.ts`) — بابُ البيع بصلاحيةٍ
//     مخصَّصة لا الأدوار وحدها، وغائبٌ عن المساند كلّياً.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  canCompleteComponentSale, deriveComponentSaleOffer, parseComponentSaleComponent,
  COMPONENT_SALE_SUCCESS_MESSAGE,
} from "@shared/component_sale";
import { PROSTHETIC_COMPONENTS, COMPONENT_LABELS } from "@shared/prosthetic_parts";
import { receptionRoutingChoices } from "../client/src/components/reception_routing";
//  **قسم ح** ينادي المخزن مباشرةً — متجاوزاً نقطة REST وفحصَها المبكّر —
//  ليثبت أن الحارسَ المعامَليّ نفسَه هو السلطة، لا الفحصُ المبكّر وحده.
import * as pendingChargeStore from "./pending_charges/store";

const DIALOG_SRC = readFileSync(
  join(process.cwd(), "client/src/components/NoExamOperationDialog.tsx"), "utf8");
const ROUTES_SRC = readFileSync(
  join(process.cwd(), "server/pending_charges/routes.ts"), "utf8");
const EPISODE_ROUTES_SRC = readFileSync(
  join(process.cwd(), "server/device_episodes/routes.ts"), "utf8");

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

const PORT = 6858;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-بيع-الجزء-المبسّط";
const ADMIN = 9971, MANAGER = 9972, ACC = 9973, RECV = 9974, DOC = 9975,
  EXPERT = 9976, EXPERT2 = 9977, EXPERT_OTHER_BRANCH = 9978, RECV_BRANCH2 = 9979;
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
/** حلقةٌ موروثة كما كان يتركها الشكلُ القديم ذو النداءين — بلا سعرٍ مُهيكَل. */
async function mkLegacyNoExamEpisode(
  patientId: number, caseId: number, item: string, branch = 1,
) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, requested_item, component, service_path, created_by)
     VALUES ($1,$2,$4,1,'awaiting_exam',0,$3,
             CASE WHEN $3 = 'full_device' THEN NULL ELSE $3 END,'no_exam',$5) RETURNING id`,
    [patientId, caseId, item, branch, RECV]);
  return r[0].id;
}

const sale = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/device-sale", session, body);
const oldEpisodeDoor = (body: any, session: any = S.recv) =>
  http("POST", `/api/patients/${body.patientId}/device-episodes`, session, body);

async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT COALESCE(SUM(cost),0)::int FROM patient_cases WHERE patient_id=$1) AS case_cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) AS ledger,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ledger_rows,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM patient_device_episodes WHERE patient_id=$1) AS episodes,
      (SELECT count(*)::int FROM pending_service_charges WHERE patient_id=$1) AS pending,
      (SELECT count(*)::int FROM service_discount_requests WHERE patient_id=$1) AS discounts,
      (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
}
const ZERO = {
  total: 0, case_cost: 0, ledger: 0, ledger_rows: 0, orders: 0, episodes: 0,
  pending: 0, discounts: 0, reviews: 0,
};

const episodeOf = async (id: number) => {
  const [r] = await q(`SELECT id, patient_id::int p, case_id::int c, branch_id::int b,
      status, agreed_cost::int ac, requested_item ri, component cmp, service_path sp,
      component_sale_original_price::int csop, component_sale_price_kind cspk
    FROM patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
};
const orderOf = async (id: number) => {
  const [r] = await q(`SELECT id, patient_id::int p, branch_id::int b, service_type st,
      purpose, status, device_episode_id::int de, expert_user_id::int ex
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
    [EXPERT_OTHER_BRANCH, "prosthetics_expert", "خبير فرعٍ آخر", 2, [2]],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,'["prosthetic","medical_support"]'::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `cs_u${id}`, role, name, branch, JSON.stringify(branchIds)]);
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
    check(canCompleteComponentSale({ isAdmin: true }), "٠١. المسؤولُ يمرّ دائماً");
    check(canCompleteComponentSale({ role: "reception" }), "٠٢. الاستقبالُ يمرّ");
    check(canCompleteComponentSale({ role: "accountant" }), "٠٣. المحاسبُ يمرّ");
    check(canCompleteComponentSale({ role: "branch_manager" }), "٠٤. مديرُ الفرع يمرّ");
    check(!canCompleteComponentSale({ role: "doctor" }), "٠٥. الطبيبُ يُرفَض دائماً");
    check(!canCompleteComponentSale({ role: "prosthetics_expert" }), "٠٦. الخبيرُ يُرفَض");
    check(!canCompleteComponentSale(null), "٠٧. جلسةٌ غائبة تُرفَض");
    same("٠٨. عاديّ: خصمٌ صفر", deriveComponentSaleOffer({ originalPrice: 1_500_000, discountAmount: 0 }),
      { ok: true, kind: "normal", originalPrice: 1_500_000, finalPrice: 1_500_000, discountAmount: 0 });
    same("٠٩. بخصم", deriveComponentSaleOffer({ originalPrice: 1_500_000, discountAmount: 300_000 }),
      { ok: true, kind: "discount", originalPrice: 1_500_000, finalPrice: 1_200_000, discountAmount: 300_000 });
    same("١٠. مجّانيّ صراحةً", deriveComponentSaleOffer({ originalPrice: 1_500_000, discountAmount: 1_500_000 }),
      { ok: true, kind: "free", originalPrice: 1_500_000, finalPrice: 0, discountAmount: 1_500_000 });
    check(!deriveComponentSaleOffer({ originalPrice: 0, discountAmount: 0 }).ok,
      "١١. سعرٌ أصليّ صفر يُرفَض");
    check(!deriveComponentSaleOffer({ originalPrice: -1000, discountAmount: 0 }).ok,
      "١٢. سعرٌ أصليّ سالب يُرفَض");
    check(!deriveComponentSaleOffer({ originalPrice: 1000, discountAmount: -1 }).ok,
      "١٣. خصمٌ سالب يُرفَض");
    check(!deriveComponentSaleOffer({ originalPrice: 1000, discountAmount: 1200 }).ok,
      "١٤. خصمٌ يتجاوز الأصلَ يُرفَض");
    check(!deriveComponentSaleOffer({ originalPrice: 1000.5, discountAmount: 0 }).ok,
      "١٥. سعرٌ أصليّ كسريّ يُرفَض");
    check(!deriveComponentSaleOffer({ originalPrice: 1000, discountAmount: 10.5 }).ok,
      "١٦. خصمٌ كسريّ يُرفَض");
    for (const c of PROSTHETIC_COMPONENTS) {
      check(parseComponentSaleComponent(c).ok, `١٧. الجزءُ «${COMPONENT_LABELS[c]}» يُقبَل من المحلِّل الخالص`);
    }
    check(!parseComponentSaleComponent("full_device").ok, "١٨. full_device مرفوضٌ من المحلِّل الخالص");
    check(!parseComponentSaleComponent("bogus_part").ok, "١٩. جزءٌ مجهول مرفوضٌ من المحلِّل الخالص");
    check(!parseComponentSaleComponent(null).ok, "٢٠. الغيابُ مرفوضٌ (إلزاميٌّ دائماً هنا)");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. تكافؤُ الأدوار الأربعة، ورفضُ الطبيب والخبير ──");
    // ══════════════════════════════════════════════════════════════════
    for (const [label, session] of [
      ["الاستقبال", S.recv], ["المحاسب", S.acc],
      ["مديرُ الفرع", S.manager], ["المسؤول", S.admin],
    ] as const) {
      const pid = await mkPatient(`تكافؤ-${label}`);
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 300_000, discountAmount: 0,
      }, session);
      check(r.status === 201, `أ. ${label} يُتمّ بيعَ الجزء بنجاح`, JSON.stringify(r.body));
      same(`أ. ${label} — الرسالةُ الموحَّدة`, r.body?.message, COMPONENT_SALE_SUCCESS_MESSAGE);
    }
    {
      const pid = await mkPatient("رفض-الطبيب");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 300_000, discountAmount: 0,
      }, S.doc);
      check(r.status === 403, "أ. الطبيبُ يُرفَض ٤٠٣ ولو حمل canAddPatients", String(r.status));
      same("أ. ولا أثرَ ماليّاً أو تشغيلياً لمحاولة الطبيب", await moneyOf(pid), ZERO);
    }
    {
      const pid = await mkPatient("رفض-الخبير");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 300_000, discountAmount: 0,
      }, S.expert);
      check(r.status === 403, "أ. الخبيرُ (منفّذٌ لا بائع) يُرفَض ٤٠٣", String(r.status));
      same("أ. صفرُ كتابة لمحاولة الخبير", await moneyOf(pid), ZERO);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. النطاق — الأجزاءُ الثمانية وحدها، والجهازُ الكاملُ والمسندُ مرفوضان ──");
    // ══════════════════════════════════════════════════════════════════
    for (const c of PROSTHETIC_COMPONENTS) {
      const pid = await mkPatient(`نطاق-${c}`);
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: c, expertUserId: EXPERT,
        originalPrice: 100_000, discountAmount: 0,
      });
      check(r.status === 201, `ب. الجزء «${COMPONENT_LABELS[c]}» يُباع بنجاح`, JSON.stringify(r.body));
      same("    والجزءُ المسجَّل على الحلقة يطابق المطلوب بالضبط", r.body?.component, c);
    }
    {
      const pid = await mkPatient("نطاق-جهاز-كامل");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "full_device", expertUserId: EXPERT,
        originalPrice: 2_000_000, discountAmount: 0,
      });
      check(r.status === 400, "ب. الجهازُ الكاملُ مرفوضٌ ٤٠٠ من هذا الباب", String(r.status));
      same("    وصفرُ كتابة", await moneyOf(pid), ZERO);
    }
    {
      const pid = await mkPatient("نطاق-جزء-مجهول");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "handle_bar_xyz", expertUserId: EXPERT,
        originalPrice: 100_000, discountAmount: 0,
      });
      check(r.status === 400, "ب. جزءٌ مجهول مرفوضٌ ٤٠٠", String(r.status));
    }
    {
      const pid = await mkPatient("نطاق-مسند", { support: true });
      await mkCase(pid, "medical_support");
      //  المسندُ لا يملك قائمة أجزاء أصلاً — إرسالُ أيّ جزءٍ يُردّ.
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 100_000, discountAmount: 0,
      });
      check(r.status !== 201, "ب. المسندُ الطبيّ لا يُباع منه جزءٌ إطلاقاً", String(r.status));
      same("    وصفرُ كتابة", await moneyOf(pid), ZERO);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. السعرُ — اشتقاقٌ وتحقّقٌ ومقاومةُ تلفيق ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ج-عادي");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 1_500_000, discountAmount: 0,
      });
      same("ج١. عاديّ — النهائيّ = الأصليّ",
        [r.status, r.body?.finalPrice, r.body?.priceKind, r.body?.originalPrice, r.body?.discountAmount],
        [201, 1_500_000, "normal", 1_500_000, 0]);
    }
    {
      const pid = await mkPatient("ج-خصم");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 1_500_000, discountAmount: 300_000,
      });
      same("ج٢. بخصم — 1,500,000 − 300,000 = 1,200,000",
        [r.status, r.body?.finalPrice, r.body?.priceKind],
        [201, 1_200_000, "discount"]);
    }
    {
      const pid = await mkPatient("ج-مجاني");
      await mkCase(pid, "prosthetic");
      const before = await moneyOf(pid);
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 1_500_000, discountAmount: 1_500_000,
      });
      same("ج٣. مجّانيّ — النهائيّ صفر والأصليّ محفوظ",
        [r.status, r.body?.finalPrice, r.body?.priceKind, r.body?.originalPrice],
        [201, 0, "free", 1_500_000]);
      const after = await moneyOf(pid);
      same("    والحلقةُ والأمرُ قائمان مع ذلك — بلا أثرٍ مالي موجب",
        [after.episodes - before.episodes, after.orders - before.orders,
          after.total - before.total, after.ledger - before.ledger], [1, 1, 0, 0]);
    }
    for (const [label, body] of [
      ["أصلٌ صفر", { originalPrice: 0, discountAmount: 0 }],
      ["أصلٌ سالب", { originalPrice: -500, discountAmount: 0 }],
      ["خصمٌ سالب", { originalPrice: 100_000, discountAmount: -1 }],
      ["خصمٌ يفوق الأصل", { originalPrice: 100_000, discountAmount: 200_000 }],
      ["أصلٌ كسريّ", { originalPrice: 100_000.5, discountAmount: 0 }],
      ["خصمٌ كسريّ", { originalPrice: 100_000, discountAmount: 5.5 }],
    ] as const) {
      const pid = await mkPatient(`ج-رفض-${label}`);
      await mkCase(pid, "prosthetic");
      const r = await sale({ patientId: pid, component: "knee", expertUserId: EXPERT, ...body });
      check(r.status === 400, `ج٤. ${label} ⟶ ٤٠٠`, JSON.stringify(r.body));
      same("    وصفرُ كتابة", await moneyOf(pid), ZERO);
    }
    {
      //  ══ **تلفيقُ finalPrice/priceKind يُتجاهَل تماماً** ═══════════════
      const pid = await mkPatient("ج-تلفيق");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 1_000_000, discountAmount: 0,
        //  ادّعاءٌ بمجّانيّةٍ ونهائيّ زائف — يجب أن يُتجاهَل بالكامل.
        finalPrice: 1, priceKind: "free", price: 1,
      });
      same("ج٥. المُشتقّ الحقيقيّ يسود — لا التلفيق",
        [r.status, r.body?.finalPrice, r.body?.priceKind], [201, 1_000_000, "normal"]);
      const ep = await episodeOf(r.body.deviceEpisodeId);
      same("    والحلقةُ نفسُها تحمل السعر الحقيقيّ لا الملفَّق",
        [ep.ac, ep.cspk], [1_000_000, "normal"]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. العقدُ القديم charged/amount مرفوضٌ صراحةً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("د-عقد-قديم");
      await mkCase(pid, "prosthetic");
      const r1 = await sale({ patientId: pid, component: "knee", expertUserId: EXPERT, charged: true, amount: 50_000 });
      check(r1.status === 400, "د١. charged/amount مرفوضان ٤٠٠", JSON.stringify(r1.body));
      const r2 = await sale({ patientId: pid, component: "knee", expertUserId: EXPERT, charged: false });
      check(r2.status === 400, "د٢. charged وحدها كافيةٌ للرفض", JSON.stringify(r2.body));
      same("د٣. صفرُ كتابة في الحالتين", await moneyOf(pid), ZERO);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. صفرٌ دائماً للطوابير الثلاثة، وبلا مراجعةٍ استرجاعية ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("هـ-بلا-طوابير");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "socket", expertUserId: EXPERT,
        originalPrice: 400_000, discountAmount: 0,
      });
      check(r.status === 201, "هـ١. البيعُ ينجح", JSON.stringify(r.body));
      const m = await moneyOf(pid);
      same("هـ٢. صفرُ pending_service_charges/service_discount_requests/medical_review_requests",
        [m.pending, m.discounts, m.reviews], [0, 0, 0]);
      check(r.body?.reviewRouted === undefined, "هـ٣. لا حقل reviewRouted في الردّ إطلاقاً");
    }
    check(!/(async )?function routeRetrospectiveReview/.test(ROUTES_SRC)
      && !/await routeRetrospectiveReview\(/.test(ROUTES_SRC),
      "هـ٤. الدالّةُ المتقاعدة routeRetrospectiveReview لا تعريفَ لها ولا نداءَ بعد اليوم");
    check(!/import.*routeServiceToDoctorReview/.test(ROUTES_SRC)
      && !/[^.]routeServiceToDoctorReview\(/.test(ROUTES_SRC),
      "هـ٥. لا استيرادَ ولا نداءَ لـ routeServiceToDoctorReview في pending_charges/routes.ts");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. تقاعدُ الباب القديم على device-episodes، وبقاءُ مسار المعاينة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("و-تقاعد-جزء");
      const r = await oldEpisodeDoor({
        patientId: pid, serviceType: "prosthetic", requestedItem: "knee", servicePath: "no_exam",
      });
      check(r.status === 409, "و١. جزءٌ جديد بلا معاينة عبر الباب القديم ⟶ ٤٠٩", JSON.stringify(r.body));
      same("و٢. صفرُ كتابة (لا حلقة تُفتَح)", await moneyOf(pid), ZERO);
    }
    {
      const pid = await mkPatient("و-مسند-بلا-معاينة-كما-كان");
      const r = await oldEpisodeDoor({
        patientId: pid, serviceType: "medical_support", requestedItem: "full_device", servicePath: "no_exam",
      });
      check(r.status === 400, "و٣. المسندُ الطبيّ بلا معاينة ⟶ ٤٠٠ كما كان (لا ٤٠٩)", String(r.status));
    }
    {
      const pid = await mkPatient("و-جهاز-كامل-بلا-معاينة-كما-كان");
      const r = await oldEpisodeDoor({
        patientId: pid, serviceType: "prosthetic", requestedItem: "full_device", servicePath: "no_exam",
      });
      check(r.status === 400, "و٤. الطرفُ الكاملُ بلا معاينة ⟶ ٤٠٠ كما كان (لا ٤٠٩)", String(r.status));
    }
    {
      const pid = await mkPatient("و-مسار-المعاينة-كما-هو");
      await mkCase(pid, "prosthetic");
      const r = await oldEpisodeDoor({
        patientId: pid, serviceType: "prosthetic", requestedItem: "knee", servicePath: "exam",
      });
      check(r.status === 201, "و٥. مسارُ المعاينة (servicePath=exam) يعمل كما كان بلا مساس", JSON.stringify(r.body));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. هويّةُ الحلقة والأمر ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ز-هوية");
      const caseId = await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "adapter", expertUserId: EXPERT,
        originalPrice: 250_000, discountAmount: 0,
      });
      check(r.status === 201, "ز١. البيعُ ينجح", JSON.stringify(r.body));
      const ep = await episodeOf(r.body.deviceEpisodeId);
      same("ز٢. الحلقةُ: caseId صحيح · in_manufacturing · requested_item/component=adapter · service_path=no_exam",
        [ep.c, ep.status, ep.ri, ep.cmp, ep.sp], [caseId, "in_manufacturing", "adapter", "adapter", "no_exam"]);
      const order = await orderOf(r.body.workOrderId);
      same("ز٣. الأمرُ يشير إلى هذه الحلقة بعينها وبالخبير الصحيح",
        [order.de, order.ex, order.purpose, order.status], [ep.id, EXPERT, "initial_build", "active"]);
      const count = await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [pid]);
      same("ز٤. حلقةٌ واحدة بالضبط لهذا المريض", count[0].n, 1);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. الخبيرُ يُعاد التحقّق منه تحت القفل — لا الفحصَ المبكّر وحده ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ح-خبير-فرع-آخر-فحص-مبكر");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT_OTHER_BRANCH,
        originalPrice: 100_000, discountAmount: 0,
      });
      check(r.status === 400, "ح١. خبيرُ فرعٍ آخر يُرفَض من الفحص المبكّر", JSON.stringify(r.body));
      same("    وصفرُ كتابة", await moneyOf(pid), ZERO);
    }
    {
      //  نداءٌ مباشر للمخزن — **متجاوزاً نقطة REST وفحصَها المبكّر تماماً**.
      const pid = await mkPatient("ح-خبير-تحت-القفل-مباشرة");
      await mkCase(pid, "prosthetic");
      const before = await moneyOf(pid);
      let threw = false, msg = "";
      try {
        await pendingChargeStore.createComponentSaleOperation({
          patientId: pid, branchId: 1,
          expertUserId: EXPERT_OTHER_BRANCH,
          originalPrice: 200_000, priceKind: "normal", finalPrice: 200_000,
          note: null, actor: { userId: RECV, userName: "ريام" },
          component: "knee" as any, existingEpisodeId: null,
        });
      } catch (e: any) { threw = true; msg = String(e?.message ?? ""); }
      check(threw, "ح٢. الخبيرُ غيرُ الصالح لفرع العملية يُرفَض من داخل المعاملة نفسِها", msg);
      same("    وصفرُ كتابة — لا حلقةَ ولا أمرَ ولا كلفةَ ولا قيدَ ولا لمسَ إجمالي",
        await moneyOf(pid), before);
    }
    {
      const pid = await mkPatient("ح-خبير-غير-موجود");
      await mkCase(pid, "prosthetic");
      let threw = false;
      try {
        await pendingChargeStore.createComponentSaleOperation({
          patientId: pid, branchId: 1, expertUserId: 88_888_888,
          originalPrice: 100_000, priceKind: "normal", finalPrice: 100_000,
          note: null, actor: { userId: RECV, userName: "ريام" },
          component: "knee" as any, existingEpisodeId: null,
        });
      } catch { threw = true; }
      check(threw, "ح٣. خبيرٌ غيرُ موجودٍ يُرفَض من داخل المعاملة");
      same("    وصفرُ كتابة", await moneyOf(pid), ZERO);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ف. الفرعُ الفعليّ للعملية — لا لقطةُ ما قبل المعاملة (تصحيحٌ لاحق) ──");
    // ══════════════════════════════════════════════════════════════════
    //  كانت `validateExpertForBranchTx` تُراجَع بـ`params.branchId` — فرعٌ
    //  قرأه الخادمُ **قبل** فتح المعاملة. فنداءٌ مباشر (أو مريضٌ نُقل بين تلك
    //  القراءة وهذا القفل) يمرّر فرعاً لا يطابق العمليةَ الحقيقية، والحارسُ
    //  المفترَض أن يكون نهائياً يصدّق سلطةً بائتة. فصار الفرعُ الفعليُّ
    //  يُشتقّ من الحلقة المقفولة نفسِها، ويُقارَن بما أذن له الطالبُ قبل أيّ
    //  كتابة — والاثنان يمرّان عبر نداءٍ مباشر للمخزن، متجاوزَين فحصَ النقطة
    //  المبكّر تماماً، تماماً كقسم ح أعلاه.
    {
      //  ══ ف١. `branchId` خاطئ لحلقةٍ **جديدة** — العمليةُ حقاً في فرع ١. ══
      const pid = await mkPatient("ف-فرع-خاطئ-حلقة-جديدة"); // فرع ١ افتراضياً
      await mkCase(pid, "prosthetic"); // فرع ١ افتراضياً
      const before = await moneyOf(pid);
      let threw = false, msg = "";
      try {
        await pendingChargeStore.createComponentSaleOperation({
          patientId: pid, branchId: 2, // ⟵ خاطئ عمداً
          expertUserId: EXPERT_OTHER_BRANCH, // خبيرُ فرع ٢ — سيُقبَل لو صدّقنا الفرعَ الخاطئ
          originalPrice: 200_000, priceKind: "normal", finalPrice: 200_000,
          note: null, actor: { userId: RECV, userName: "ريام" },
          component: "knee" as any, existingEpisodeId: null,
        });
      } catch (e: any) { threw = true; msg = String(e?.message ?? ""); }
      check(threw, "ف١. branchId=٢ مُرسَلٌ مباشرةً لعمليةٍ حقيقتُها فرعٌ ١ ⟶ يُرفَض", msg);
      same("    وصفرُ كتابة بالضبط — لا حلقةَ ولا أمرَ ولا قيدَ ولا لمسَ كلفةِ حالةٍ ولا إجماليّ",
        await moneyOf(pid), before);
    }
    {
      //  ══ ف٢. نفسُها لحلقةٍ **موروثة** — الحلقةُ المقفولة فرعُها ١ حقاً. ══
      const pid = await mkPatient("ف-فرع-خاطئ-حلقة-موروثة");
      const caseId = await mkCase(pid, "prosthetic"); // فرع ١
      const epId = await mkLegacyNoExamEpisode(pid, caseId, "socket", 1);
      const before = await moneyOf(pid);
      let threw = false, msg = "";
      try {
        await pendingChargeStore.createComponentSaleOperation({
          patientId: pid, branchId: 2, // ⟵ خاطئ: الحلقةُ المقفولة فرعُها ١
          expertUserId: EXPERT_OTHER_BRANCH,
          originalPrice: 150_000, priceKind: "normal", finalPrice: 150_000,
          note: null, actor: { userId: RECV, userName: "ريام" },
          component: null, existingEpisodeId: epId,
        });
      } catch (e: any) { threw = true; msg = String(e?.message ?? ""); }
      check(threw, "ف٢. ونفسُ الرفض عند استئناف حلقةٍ موروثة بفرعٍ مخالف", msg);
      same("    وصفرُ أثرٍ ماليّ أو تشغيليّ — الحلقةُ اليتيمة بقيت كما كانت بالضبط",
        await moneyOf(pid), before);
      const ep = await episodeOf(epId);
      same("    والحلقةُ نفسُها لم تتحرّك من awaiting_exam", ep.status, "awaiting_exam");
    }
    {
      //  ══ ف٣. وفرعٌ صحيحٌ مطابق يمرّ كالمعتاد — الحارسُ الجديد لا يمنع عملاً
      //  سليماً. ══
      const pid = await mkPatient("ف-فرع-صحيح-يمر");
      await mkCase(pid, "prosthetic");
      const before = await moneyOf(pid);
      const out = await pendingChargeStore.createComponentSaleOperation({
        patientId: pid, branchId: 1, // ⟵ صحيحٌ ومطابق
        expertUserId: EXPERT,
        originalPrice: 300_000, priceKind: "normal", finalPrice: 300_000,
        note: null, actor: { userId: RECV, userName: "ريام" },
        component: "knee" as any, existingEpisodeId: null,
      });
      check(Boolean(out.workOrderId) && Boolean(out.deviceEpisodeId),
        "ف٣. فرعٌ صحيحٌ مطابق ⟶ العمليةُ تمضي بنجاح", JSON.stringify(out));
      const after = await moneyOf(pid);
      same("    والمالُ تحرّك بمقدار السعر كاملاً، وحلقةٌ وأمرٌ فُتحا",
        [after.total - before.total, after.episodes - before.episodes, after.orders - before.orders],
        [300_000, 1, 1]);
    }
    {
      //  ══ ف٤. المسؤولُ العامّ عبر **النقطة الحقيقية** يُتمّ بيعاً في فرعٍ ٢
      //  فعلاً حين يكون المريضُ والعمليةُ حقاً في فرع ٢ والخبيرُ صالحٌ له —
      //  فرعُ جلسته الافتراضيّ ١، وسلطتُه غيرُ مقيَّدةٍ بفرعٍ واحد. ══
      const pid = await mkPatient("ف-مسؤول-فرع٢-حقيقي", { branch: 2 });
      await mkCase(pid, "prosthetic", 2);
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT_OTHER_BRANCH,
        originalPrice: 400_000, discountAmount: 0,
      }, S.admin);
      check(r.status === 201, "ف٤. المسؤولُ يُتمّ بيعاً حقيقياً في فرع ٢ عبر النقطة الحقيقية", JSON.stringify(r.body));
      const ep = await episodeOf(r.body.deviceEpisodeId);
      same("    والحلقةُ فعلاً على فرع ٢", ep.b, 2);
    }
    {
      //  ══ ف٥/ف٦. الأدوارُ المحجوزة بفرعها تبقى كما كانت — تصحيحُ الفرع
      //  الفعليّ لا يوسّع صلاحيةَ أحد ولا يضيّقها. ══
      const pid = await mkPatient("ف-فرع-٢-باستقبالين", { branch: 2 });
      await mkCase(pid, "prosthetic", 2);
      const r1 = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT_OTHER_BRANCH,
        originalPrice: 100_000, discountAmount: 0,
      }, S.recv); // استقبالُ فرع ١
      check(r1.status === 403, "ف٥. استقبالُ فرع ١ يُردّ ٤٠٣ على مريض فرع ٢ — كما كان قبل هذا التصحيح", String(r1.status));
      same("    وصفرُ كتابة", await moneyOf(pid), ZERO);
      const r2 = await sale({
        patientId: pid, component: "socket", expertUserId: EXPERT_OTHER_BRANCH,
        originalPrice: 100_000, discountAmount: 0,
      }, S.recvBranch2); // استقبالُ فرع ٢ نفسِه
      check(r2.status === 201, "ف٦. واستقبالُ فرع ٢ نفسِه يُتمّها بنجاح", JSON.stringify(r2.body));
    }
    {
      //  ══ ف٧. فرعٌ فارغ (`NULL`) على حلقةٍ قابلةٍ للاستئناف — خللٌ مصطنَع لا
      //  يُنتجه أيّ مسارٍ حيّ اليوم (`startDeviceEpisodeTx` يكتب الفرعَ دائماً
      //  من `patients.branch_id` غيرِ القابل لـ`NULL`، ولا تحديثٌ لاحقٌ
      //  يمسحه — انظر تعليقَ الدالّة). فيُزرَع هنا بالـSQL مباشرةً ليثبت أن
      //  الحارسَ **يرفض صراحةً** بدل أن يخمِّن من `params.branchId`. ══
      const pid = await mkPatient("ف-فرع-فارغ-مصطنع");
      const caseId = await mkCase(pid, "prosthetic");
      const [ep] = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, component, service_path, created_by)
         VALUES ($1,$2,NULL,1,'awaiting_exam',0,'socket','socket','no_exam',$3) RETURNING id`,
        [pid, caseId, RECV]);
      const before = await moneyOf(pid);
      let threw = false, msg = "";
      try {
        await pendingChargeStore.createComponentSaleOperation({
          patientId: pid, branchId: 1, expertUserId: EXPERT,
          originalPrice: 100_000, priceKind: "normal", finalPrice: 100_000,
          note: null, actor: { userId: RECV, userName: "ريام" },
          component: null, existingEpisodeId: ep.id,
        });
      } catch (e: any) { threw = true; msg = String(e?.message ?? ""); }
      check(threw, "ف٧. حلقةٌ بفرعٍ NULL تُرفَض صراحةً — لا تُخمَّن من params.branchId", msg);
      same("    وصفرُ كتابة", await moneyOf(pid), before);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. لا خيطَ أطرافٍ ⟵ صفرُ كتابة، والعلاجُ الطبيعيّ لا يتلقّى كلفة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ط-بلا-خيط");
      //  **بلا `mkCase` إطلاقاً** — لا حالة أطرافٍ على هذا الملفّ.
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 100_000, discountAmount: 0,
      });
      check(r.status === 400, "ط١. لا حالة أطرافٍ على الملفّ ⟶ ٤٠٠", JSON.stringify(r.body));
      same("    وصفرُ كتابة", await moneyOf(pid), ZERO);
    }
    {
      const pid = await mkPatient("ط-فيزيو-فقط");
      const physioCase = await mkCase(pid, "physiotherapy");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 100_000, discountAmount: 0,
      });
      check(r.status === 400, "ط٢. حالةُ فيزيو وحدها لا تكفي لبيع جزءٍ من طرف صناعي", JSON.stringify(r.body));
      const [pc] = await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [physioCase]);
      same("    وكلفةُ حالة الفيزيو لم تتحرّك", pc.c, 0);
      same("    وصفرُ كتابة إجمالاً", await moneyOf(pid), ZERO);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. الفروقُ الماليةُ تتطابق عبر خمسة مصادر ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ي-تطابق-موجب");
      const caseId = await mkCase(pid, "prosthetic");
      const before = await moneyOf(pid);
      const r = await sale({
        patientId: pid, component: "foot", expertUserId: EXPERT,
        originalPrice: 900_000, discountAmount: 100_000,
      });
      check(r.status === 201, "ي١. البيعُ ينجح", JSON.stringify(r.body));
      const after = await moneyOf(pid);
      const ep = await episodeOf(r.body.deviceEpisodeId);
      const [cc] = await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [caseId]);
      const deltas = [
        after.total - before.total,       // ١) إجماليّ المريض
        cc.c - 0,                          // ٢) كلفةُ الحالة
        after.ledger - before.ledger,      // ٣) قيدُ الدفتر
        ep.ac,                             // ٤) agreed_cost على الحلقة
        r.body.finalPrice,                 // ٥) ما اشتقّه الخادمُ وأعاده
      ];
      same("ي٢. الفروقُ الخمسة كلُّها ٨٠٠,٠٠٠", deltas, [800_000, 800_000, 800_000, 800_000, 800_000]);
    }
    {
      const pid = await mkPatient("ي-مجاني-تطابق");
      const caseId = await mkCase(pid, "prosthetic");
      const before = await moneyOf(pid);
      const r = await sale({
        patientId: pid, component: "foot", expertUserId: EXPERT,
        originalPrice: 500_000, discountAmount: 500_000,
      });
      const after = await moneyOf(pid);
      const [cc] = await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [caseId]);
      same("ي٣. المجّانيّ: كلُّ الفروق الماليةِ صفر، لكنّ الحلقة والأمر قائمان",
        [after.total - before.total, cc.c, after.ledger - before.ledger,
          after.episodes - before.episodes, after.orders - before.orders],
        [0, 0, 0, 1, 1]);
      check(r.status === 201, "    والاستجابةُ ٢٠١ (نجاحٌ حقيقيّ لا رفض)", String(r.status));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. الحقيقةُ المُهيكَلة (ترحيل ٠٧٠) تطابق الفعل، والقديمُ NULL ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ك-مهيكل-عادي");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 700_000, discountAmount: 0,
      });
      const ep = await episodeOf(r.body.deviceEpisodeId);
      same("ك١. عاديّ: original=700,000 · kind=normal · agreed=700,000",
        [ep.csop, ep.cspk, ep.ac], [700_000, "normal", 700_000]);
    }
    {
      const pid = await mkPatient("ك-مهيكل-خصم");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 900_000, discountAmount: 150_000,
      });
      const ep = await episodeOf(r.body.deviceEpisodeId);
      same("ك٢. بخصم: original=900,000 · kind=discount · agreed=750,000 · الخصمُ يُشتقّ = original-agreed",
        [ep.csop, ep.cspk, ep.ac, ep.csop - ep.ac], [900_000, "discount", 750_000, 150_000]);
    }
    {
      const pid = await mkPatient("ك-مهيكل-مجاني");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 400_000, discountAmount: 400_000,
      });
      const ep = await episodeOf(r.body.deviceEpisodeId);
      same("ك٣. مجّانيّ: original=400,000 محفوظ · kind=free · agreed=0",
        [ep.csop, ep.cspk, ep.ac], [400_000, "free", 0]);
    }
    {
      //  صفٌّ تاريخيّ — حلقةٌ أُنشئت **بلا مرور على المرحلة الرابعة إطلاقاً**
      //  (نفسُ الشكل الذي كانت تنتجه أيّ حلقةٍ قبل هذا الترحيل).
      const pid = await mkPatient("ك-تاريخي-NULL");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkLegacyNoExamEpisode(pid, caseId, "knee");
      const ep = await episodeOf(epId);
      same("ك٤. صفٌّ لم يمرّ بالمرحلة الرابعة ⟶ الحقلان المُهيكَلان NULL",
        [ep.csop, ep.cspk], [null, null]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. حلقةٌ موروثة من الشكل القديم ذي النداءين تُستأنَف بمعرّفها ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ل-استئناف");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkLegacyNoExamEpisode(pid, caseId, "socket");
      const before = await moneyOf(pid);
      same("ل١. قبل الاستئناف: حلقةٌ واحدة يتيمة، بلا أمرٍ ولا كلفة",
        [before.episodes, before.orders, before.total], [1, 0, 0]);
      const r = await sale({
        patientId: pid, existingEpisodeId: epId, expertUserId: EXPERT,
        originalPrice: 350_000, discountAmount: 50_000,
        //  والجزءُ المُرسَل هنا (لو أُرسل) يُتجاهَل — الحلقةُ تقول الحقيقة.
        component: "foot",
      });
      check(r.status === 201, "ل٢. الاستئنافُ ينجح", JSON.stringify(r.body));
      same("ل٣. والجزءُ المسجَّل هو ما كانت الحلقةُ تحمله (socket) لا ما أرسله الطلب (foot)",
        r.body?.component, "socket");
      const after = await moneyOf(pid);
      same("ل٤. لا حلقةَ ثانية — العددُ ما زال ١، وأمرٌ واحدٌ فُتح، والمالُ صحّ",
        [after.episodes, after.orders, after.total], [1, 1, 300_000]);
      const ep = await episodeOf(epId);
      same("ل٥. الحلقةُ نفسُها (نفس المعرّف) انتقلت إلى in_manufacturing",
        [ep.id, ep.status], [epId, "in_manufacturing"]);
    }
    {
      //  حلقةٌ موروثة بجهازٍ كامل — لا تُستأنَف من هذا الباب.
      const pid = await mkPatient("ل-استئناف-جهاز-كامل-يرفض");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkLegacyNoExamEpisode(pid, caseId, "full_device");
      const r = await sale({ patientId: pid, existingEpisodeId: epId, expertUserId: EXPERT,
        originalPrice: 100_000, discountAmount: 0 });
      check(r.status !== 201, "ل٦. حلقةٌ موروثة بجهازٍ كامل لا تُستأنَف من هنا", String(r.status));
    }
    {
      //  معرّفٌ لا يخصّ هذا المريض.
      const pidA = await mkPatient("ل-هوية-أ");
      const caseA = await mkCase(pidA, "prosthetic");
      const epA = await mkLegacyNoExamEpisode(pidA, caseA, "knee");
      const pidB = await mkPatient("ل-هوية-ب");
      await mkCase(pidB, "prosthetic");
      const r = await sale({ patientId: pidB, existingEpisodeId: epA, expertUserId: EXPERT,
        originalPrice: 100_000, discountAmount: 0 });
      check(r.status === 409, "ل٧. حلقةٌ تخصّ مريضاً آخر تُرفَض ٤٠٩", String(r.status));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── م. الطابورُ الموروث يبقى قابلاً للقراءة والحسم؛ ومراجعةٌ تاريخيةٌ محفوظة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  ══ محاكاةٌ دقيقة لصفٍّ **من قبل هذه المرحلة**: أمرٌ فُتح تشغيلياً
      //  (كما كانت `startDeviceSaleOperationallyTx` وحدها تفعل) والمالُ لم
      //  يُقيَّد بعد — بانتظار الطابور الموروث.
      const pid = await mkPatient("م-طابور-موروث");
      const caseId = await mkCase(pid, "prosthetic");
      const [ep] = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, component, service_path, created_by)
         VALUES ($1,$2,1,1,'in_manufacturing',0,'knee','knee','no_exam',$3) RETURNING id`,
        [pid, caseId, RECV]);
      const [wo] = await q<{ id: number }>(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
           status, current_stage, purpose, device_episode_id, assigned_by)
         VALUES ($1,1,'prosthetic',$2,'active','pending','initial_build',$3,$4) RETURNING id`,
        [pid, EXPERT, ep.id, RECV]);
      const [charge] = await q<{ id: number }>(
        `INSERT INTO pending_service_charges (patient_id, branch_id, case_id, device_episode_id,
           work_order_id, service_type, operation_kind, requested_item, sale_expert_user_id,
           amount, status, created_by, created_by_name)
         VALUES ($1,1,$2,$3,$4,'prosthetic','device_sale','knee',$5,275_000,'pending_review',$6,'ريام')
         RETURNING id`,
        [pid, caseId, ep.id, wo.id, EXPERT, RECV]);

      const list = await http("GET", "/api/no-exam/review", S.recv);
      const found = (list.body?.rows ?? []).some((row: any) => row.id === charge.id);
      check(found, "م١. الصفُّ الموروثُ يظهر في طابور الإكمال كما كان");

      const before = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [pid]);
      const approve = await http("POST", `/api/no-exam/charges/${charge.id}/approve`, S.recv);
      check(approve.status === 200, "م٢. الحسمُ عبر الباب الموروث ما زال يعمل", JSON.stringify(approve.body));
      const after = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [pid]);
      same("م٣. والمالُ تحرّك بالضبط بمقدار المبلغ الموروث",
        after[0].t - before[0].t, 275_000);
    }
    {
      //  سجلُّ مراجعةٍ طبّية تاريخيّ — يبقى محفوظاً بلا مساسٍ من هذه المرحلة.
      const pid = await mkPatient("م-مراجعة-تاريخية");
      await mkCase(pid, "prosthetic");
      const [row] = await q<{ id: number }>(
        `INSERT INTO medical_review_requests (patient_id, service_type, requested_path, review_kind, status)
         VALUES ($1,'prosthetic','quick','other','pending') RETURNING id`, [pid]);
      //  بيعُ جزءٍ جديد على المريض نفسه — من المرحلة الرابعة.
      await sale({ patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 150_000, discountAmount: 0 });
      const [still] = await q(`SELECT status FROM medical_review_requests WHERE id=$1`, [row.id]);
      check(still?.status === "pending", "م٤. السجلُّ التاريخيُّ باقٍ بحالته بلا مساس من بيع الجزء الجديد");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ن. التزامن ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ن-بيعان-جديدان-متزامنان");
      await mkCase(pid, "prosthetic");
      const [r1, r2] = await Promise.all([
        sale({ patientId: pid, component: "knee", expertUserId: EXPERT, originalPrice: 300_000, discountAmount: 0 }),
        sale({ patientId: pid, component: "socket", expertUserId: EXPERT2, originalPrice: 300_000, discountAmount: 0 }),
      ]);
      const statuses = [r1.status, r2.status];
      const successCount = statuses.filter((s) => s === 201).length;
      same("ن١. واحدةٌ تنجح (٢٠١) بالضبط والأخرى ترتدّ", successCount, 1);
      check(statuses.some((s) => s !== 201), "    والأخرى لا تنجح (٤٠٩ أو ما يعادله)", JSON.stringify(statuses));
      const m = await moneyOf(pid);
      check(m.episodes === 1 && m.orders === 1 && m.ledger_rows === 1,
        "ن٢. حلقةٌ واحدة وأمرٌ واحدٌ وقيدٌ واحد بالضبط — لا نصفَ كتابة", JSON.stringify(m));
    }
    {
      const pid = await mkPatient("ن-إكمالان-متزامنان");
      const caseId = await mkCase(pid, "prosthetic");
      const epId = await mkLegacyNoExamEpisode(pid, caseId, "tube");
      const [r1, r2] = await Promise.all([
        sale({ patientId: pid, existingEpisodeId: epId, expertUserId: EXPERT, originalPrice: 200_000, discountAmount: 0 }),
        sale({ patientId: pid, existingEpisodeId: epId, expertUserId: EXPERT2, originalPrice: 200_000, discountAmount: 0 }),
      ]);
      const statuses = [r1.status, r2.status];
      const successCount = statuses.filter((s) => s === 201).length;
      same("ن٣. إكمالان متزامنان لحلقةٍ واحدة: واحدةٌ تنجح بالضبط", successCount, 1);
      check(statuses.some((s) => s !== 201), "    والأخرى ترتدّ", JSON.stringify(statuses));
      const m = await moneyOf(pid);
      check(m.episodes === 1 && m.orders === 1,
        "ن٤. حلقةٌ واحدة (لم تُخلَق ثانية) وأمرٌ واحد بالضبط", JSON.stringify(m));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── س. عقدُ الشاشة `NoExamOperationDialog.tsx` ──");
    // ══════════════════════════════════════════════════════════════════
    check(/no-exam-op-item/.test(DIALOG_SRC), "س١. حقلُ اختيار الجزء موجود لبيع الجزء الجديد");
    check(/no-exam-op-expert/.test(DIALOG_SRC), "س٢. حقلُ الخبير موجود");
    check(/no-exam-op-original-price/.test(DIALOG_SRC) && /no-exam-op-discount-amount/.test(DIALOG_SRC),
      "س٣. حقلا السعر الأصلي ومقدار الخصم موجودان (مشتركان مع الصيانة)");
    check(/no-exam-op-final-price/.test(DIALOG_SRC), "س٤. سطرُ السعر النهائي للقراءة فقط موجود");
    check(!/no-exam-op-no-charge/.test(DIALOG_SRC), "س٥. مربّعُ «بلا أجور» حُذف تماماً من كلّ الملفّ");
    check(!/no-exam-op-amount"/.test(DIALOG_SRC), "س٦. حقلُ المبلغ اليدويّ القديم حُذف");
    check(!/والطبيب يراه لاحقاً/.test(DIALOG_SRC), "س٧. صياغةُ «الطبيب يراه لاحقاً ضمن المراجعة» حُذفت");
    check(!/reviewFailedCopy\(/.test(DIALOG_SRC) && !/\.reviewRouted/.test(DIALOG_SRC),
      "س٨. لا قراءةَ فعليةً لـ .reviewRouted ولا استدعاءَ reviewFailedCopy(...) بعد اليوم"
      + " (مجرّد ذكرِ الاسم في تعليقٍ توثيقيّ لا يُحتسَب)");
    check(!/charged:\s*true/.test(DIALOG_SRC) && !/setCharged/.test(DIALOG_SRC),
      "س٩. لا حالة charged/setCharged باقية في الملفّ");
    //  ══ **حفظٌ واحد فقط** — لا نداءَ device-episodes قبل device-sale ═══
    const saveFnMatch = DIALOG_SRC.match(/mutationFn: async \(\) => \{[\s\S]*?\n    \},/);
    const saveFn = saveFnMatch ? saveFnMatch[0] : "";
    check(saveFn.length > 0, "س١٠. جسمُ mutationFn وُجد للفحص");
    check(!/\/device-episodes`/.test(saveFn),
      "س١١. بلا نداءِ POST لفتح حلقةٍ منفصل قبل device-sale — حفظٌ واحد");
    const saleCalls = (saveFn.match(/apiRequest\("POST"/g) ?? []).length;
    same("س١٢. نداءُ حفظٍ واحد بالضبط داخل mutationFn (لكلا الفرعين معاً)", saleCalls, 2);
    check(/existingEpisodeId\s*\?/.test(saveFn),
      "س١٣. existingEpisodeId يُرسَل فقط عند الاستئناف، بديلاً عن component");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ع. رؤيةُ المُوجِّه `reception_routing.ts` ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const forRecv = receptionRoutingChoices("prosthetic", { role: "reception" });
      check(forRecv.some((c) => c.id === "device_sale"), "ع١. الاستقبالُ يرى «بيع جزء» للأطراف");
      const forAcc = receptionRoutingChoices("prosthetic", { role: "accountant" });
      check(forAcc.some((c) => c.id === "device_sale"), "ع٢. المحاسبُ يرى «بيع جزء»");
      const forMgr = receptionRoutingChoices("prosthetic", { role: "branch_manager" });
      check(forMgr.some((c) => c.id === "device_sale"), "ع٣. مديرُ الفرع يرى «بيع جزء»");
      const forAdmin = receptionRoutingChoices("prosthetic", { isAdmin: true });
      check(forAdmin.some((c) => c.id === "device_sale"), "ع٤. المسؤولُ يرى «بيع جزء»");
      const forDoc = receptionRoutingChoices("prosthetic", { role: "doctor" });
      check(!forDoc.some((c) => c.id === "device_sale"), "ع٥. الطبيبُ لا يرى «بيع جزء» إطلاقاً");
      const forNone = receptionRoutingChoices("prosthetic", null);
      check(!forNone.some((c) => c.id === "device_sale"), "ع٦. جلسةٌ غائبة ⟶ الخيارُ محجوبٌ احتياطاً");
      //  والصيانةُ تبقى ظاهرةً لهم جميعاً (قدرةٌ مستقلّة، لم تتأثّر).
      check(forRecv.some((c) => c.id === "maintenance") && forAcc.some((c) => c.id === "maintenance"),
        "ع٧. خيارُ الصيانة لم يتأثّر بهذا التعديل");
    }
    {
      const forSupport = receptionRoutingChoices("medical_support", { isAdmin: true });
      check(!forSupport.some((c) => c.id === "device_sale"),
        "ع٨. المساندُ الطبية بلا خيار «بيع جزء» إطلاقاً — بصرف النظر عن الصلاحية");
      check(forSupport.some((c) => c.id === "exam_required"),
        "    ويبقى «يحتاج معاينة طبية» ظاهراً للجهاز الكامل");
    }
    check(!/canOperateNoExam/.test(EPISODE_ROUTES_SRC.match(/POST.*device-episodes[\s\S]{0,4000}/)?.[0] ?? ""),
      "ع٩. (تنويهٌ معماريّ) نقطة device-episodes لا تستعمل canOperateNoExam أصلاً — بلا صلة بهذا التعديل");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص بيع الجزء المبسّط نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
