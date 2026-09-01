// **جودةُ وصف تاريخ الدفعات — «قوبل هذا المبلغُ ماذا بالضبط؟»** (المرحلة
// السابعة، ٢٠٢٦-٠٩-٠١) — حيّاً على Postgres وعلى `GET /api/patients/:id`
// الحقيقية. قاعدة محلّية: `npm run test:payment-description`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// دفعاتُ الأجهزة الجديدة (بيعُ جزء، إلحاقٌ بجهازٍ قيد التصنيع، صيانة) تُكتب
// بنصٍّ غنيٍّ يقول العنصرَ والمبلغَ المقبوض والمتبقّي — لا نصّاً عامّاً بعد
// اليوم. والصفوفُ **القديمة** (نصٌّ عامّ سابق) تكتسب `displayDescription`
// أغنى **حين يوجد رابطٌ آمن**، بلا مسّ `payments.notes` المخزَّن إطلاقاً.
//
// وما يُثبته هنا، بندَ بندٍ (٠–ز):
//   • **٠**: عقدُ `formatDevicePaymentNote`/`deriveDevicePaymentDisplay`
//     الخالص — بلا قاعدة بيانات.
//   • **أ**: بيعُ جزءٍ (حلقةٌ جديدة) — دفعٌ جزئيّ ثم دفعٌ كامل، والنصُّ
//     المخزَّنُ و`displayDescription` **متطابقان** (نفسُ المشتقّ لحظةَ
//     الكتابة ولحظةَ العرض).
//   • **ب**: الإلحاقُ بجهازٍ قيد التصنيع — النصُّ يصف **الإلحاقَ بعينه**
//     (سعرَ الجزء لا كلفةَ الجهاز التراكمية)، و`displayDescription` تبقى
//     `null` **عمداً** (حلقةُ الجهاز الكامل ليست مؤهَّلة — لا لبس بين سعر
//     الجزء وكلفة الجهاز).
//   • **ج**: الصيانةُ — أطرافٌ بجزء، ومساندُ بلا جزء («مسند طبي كامل»)،
//     جزئيّاً وكاملاً، و`displayDescription` تبقى `null` (لا اشتقاقَ
//     تخمينيّ لصفوف الصيانة، الشرحُ في `shared/payment_description.ts`).
//   • **د**: الاشتقاقُ التاريخيّ — صفٌّ قديمٌ بنصٍّ عامّ، مُدرَجٌ مباشرةً
//     بلا نداء النقطة (محاكاةً لصفٍّ سابقٍ على هذه المرحلة)، على حلقةٍ
//     مؤهَّلة فعلاً ⟶ `displayDescription` غنيّة والنصُّ الخام **لم يتغيّر
//     حرفاً**؛ وعلى حلقةٍ غيرَ مؤهَّلة (جهازٌ كامل) ⟶ `null`؛ ودفعتان على
//     الحلقة المؤهَّلة نفسِها ⟶ كلتاهما تنزل إلى الشكل الأبسط (عنصرٌ ومبلغٌ
//     فقط، بلا ادّعاء «من/متبقي»).
//   • **هـ**: **إغلاقُ الثغرة** — صيانةٌ تستهدف حلقةً **مُسلَّمة** كانت
//     يوماً عمليةَ بيع جزءٍ (فمؤهَّلةٌ للاشتقاق) ⟶ `displayDescription`
//     تبقى `null` رغم الأهليّة، لأن الدفعةَ مربوطةٌ بزيارةٍ (صيانةٌ حتماً)
//     لا ببيع.
//   • **و**: العقدُ المعماريّ — لا قاموسَ تسمياتٍ ثانٍ في
//     `shared/payment_description.ts`؛ الاستيرادُ الوحيد من
//     `prosthetic_parts.ts`.
//   • **ز**: `payment.notes` الخامُ يبقى مصدرَ التعديل — لم يُمسّ في أيّ
//     مسار، ودفعةٌ بلا `deviceEpisodeId` (غير جهازية) لا تكتسب
//     `displayDescription` إطلاقاً (`null` دائماً، بصرف النظر عن النصّ).

import { readFileSync } from "fs";
import { join } from "path";
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  formatDevicePaymentNote, deriveDevicePaymentDisplay,
} from "@shared/payment_description";
import { requestedItemLabel } from "@shared/prosthetic_parts";

const PAYMENT_DESC_SRC = readFileSync(
  join(process.cwd(), "shared/payment_description.ts"), "utf8");

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

const PORT = 6950;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-وصف-الدفعات";
const RECV = 9981, EXPERT = 9982;
const USERS = [RECV, EXPERT];

const S = {
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canAddPatients: true },
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

async function mkPatient(label: string, opts: { support?: boolean } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,$3,$4,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, opts.support !== true, opts.support === true]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,0,'manual','active') RETURNING id`, [patientId, caseType]);
  return r[0].id;
}

//  **`paidNow: 0` افتراضٌ آمن هنا** — صفرٌ صريحٌ يعني «دَينٌ كامل، لا دفعة»،
//  فلا يُنشئ صفَّ دفعةٍ يحتاج فحصاً (نفسُ اتفاقية `component_sale.test.ts`).
const sale = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/device-sale", session, { paidNow: 0, ...body });
const maint = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, { paidNow: 0, ...body });

async function paymentsOf(patientId: number) {
  return await q<{
    id: number; amount: number; case_id: number | null; device_episode_id: number | null;
    visit_id: number | null; notes: string | null;
  }>(
    `SELECT id, amount::int, case_id::int, device_episode_id::int, visit_id::int, notes
       FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
}
async function getPatient(patientId: number, session: any = S.recv) {
  const r = await http("GET", `/api/patients/${patientId}`, session);
  return r;
}
async function episodeAgreedCost(episodeId: number): Promise<number> {
  const [r] = await q<{ ac: number }>(
    `SELECT agreed_cost::int ac FROM patient_device_episodes WHERE id=$1`, [episodeId]);
  return r.ac;
}

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
  for (const [id, role, name] of [
    [RECV, "reception", "ريام"],
    [EXPERT, "prosthetics_expert", "الخبير"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,1,'[1]'::jsonb,true,'["prosthetic","medical_support"]'::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true`,
      [id, `pd_u${id}`, role, name]);
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
    console.log("\n── ٠. العقدُ الخالص — `formatDevicePaymentNote`/`deriveDevicePaymentDisplay` ──");
    // ══════════════════════════════════════════════════════════════════
    same("٠١. بيعٌ، دفعٌ جزئيّ",
      formatDevicePaymentNote({
        kind: "sale", itemLabel: "السليكون", operationFinalPrice: 500_000, paidNow: 450_000,
      }),
      "دفعة مقابل السليكون — المدفوع 450,000 د.ع من 500,000 د.ع — المتبقي 50,000 د.ع");
    same("٠٢. بيعٌ، دفعٌ كامل",
      formatDevicePaymentNote({
        kind: "sale", itemLabel: "الركبة", operationFinalPrice: 1_400_000, paidNow: 1_400_000,
      }),
      "دفعة مقابل الركبة — مدفوع بالكامل 1,400,000 د.ع");
    same("٠٣. صيانةٌ، دفعٌ جزئيّ",
      formatDevicePaymentNote({
        kind: "maintenance", itemLabel: "الركبة", operationFinalPrice: 500_000, paidNow: 200_000,
      }),
      "دفعة صيانة الركبة — المدفوع 200,000 د.ع من 500,000 د.ع — المتبقي 300,000 د.ع");
    same("٠٤. صيانةٌ، دفعٌ كامل",
      formatDevicePaymentNote({
        kind: "maintenance", itemLabel: "مسند طبي كامل", operationFinalPrice: 300_000, paidNow: 300_000,
      }),
      "دفعة صيانة مسند طبي كامل — مدفوع بالكامل 300,000 د.ع");
    check(deriveDevicePaymentDisplay({ amount: 100_000 }, null, { linkedPaymentsCount: 1 }) === null,
      "٠٥. اشتقاقٌ بلا حلقةٍ إطلاقاً ⟶ null");
    check(deriveDevicePaymentDisplay(
      { amount: 100_000 },
      { requestedItem: "full_device", agreedCost: 1_750_000, componentSaleOriginalPrice: null },
      { linkedPaymentsCount: 1 },
    ) === null, "٠٦. حلقةُ جهازٍ كامل (غيرُ مؤهَّلة) ⟶ null");
    same("٠٧. حلقةٌ مؤهَّلة، دفعةٌ واحدة ⟶ نفسُ صيغة formatDevicePaymentNote بالضبط",
      deriveDevicePaymentDisplay(
        { amount: 450_000 },
        { requestedItem: "silicone", agreedCost: 500_000, componentSaleOriginalPrice: 500_000 },
        { linkedPaymentsCount: 1 },
      ),
      "دفعة مقابل السليكون — المدفوع 450,000 د.ع من 500,000 د.ع — المتبقي 50,000 د.ع");
    same("٠٨. حلقةٌ مؤهَّلة، دفعتان مرتبطتان ⟶ الشكلُ الأبسط (عنصرٌ ومبلغٌ فقط)",
      deriveDevicePaymentDisplay(
        { amount: 200_000 },
        { requestedItem: "knee", agreedCost: 500_000, componentSaleOriginalPrice: 500_000 },
        { linkedPaymentsCount: 2 },
      ),
      "دفعة مقابل الركبة — 200,000 د.ع");
    check(deriveDevicePaymentDisplay(
      { amount: 200_000, visitId: 555 },
      { requestedItem: "knee", agreedCost: 500_000, componentSaleOriginalPrice: 500_000 },
      { linkedPaymentsCount: 1 },
    ) === null,
    "٠٩. **إغلاقُ الثغرة**: حلقةٌ مؤهَّلة لكنّ الدفعةَ مربوطةٌ بزيارة ⟶ null"
    + " (صيانةٌ لا بيع، بصرف النظر عن أهليّة الحلقة)");
    check(deriveDevicePaymentDisplay(
      { amount: 200_000, visitId: null },
      { requestedItem: "knee", agreedCost: 500_000, componentSaleOriginalPrice: 500_000 },
      { linkedPaymentsCount: 1 },
    ) !== null, "١٠. و`visitId: null` صريحاً — أو غيابُه — لا يمنع الاشتقاق");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. بيعُ جزءٍ (حلقةٌ جديدة) — النصُّ المخزَّن و`displayDescription` متطابقان ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  ══ أ١. دفعٌ جزئيّ ══════════════════════════════════════════════════
      const pid = await mkPatient("أ-بيع-جزئيّ");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "silicone", expertUserId: EXPERT,
        originalPrice: 500_000, discountAmount: 0, paidNow: 450_000,
      });
      check(r.status === 201, "أ١. بيعُ سليكونٍ بدفعٍ جزئيّ ⟶ ينجح", JSON.stringify(r.body));
      const pays = await paymentsOf(pid);
      same("    ودفعةٌ واحدةٌ بمبلغها الصحيح، بلا زيارة، وحلقتُها هي حلقة البيع",
        [pays.length, pays[0]?.amount, pays[0]?.visit_id, pays[0]?.device_episode_id],
        [1, 450_000, null, r.body.deviceEpisodeId]);
      const expected = "دفعة مقابل السليكون — المدفوع 450,000 د.ع من 500,000 د.ع — المتبقي 50,000 د.ع";
      same("أ٢. **النصُّ المخزَّنُ** غنيٌّ بالضبط", pays[0]?.notes, expected);

      const gp = await getPatient(pid);
      check(gp.status === 200, "أ٣. GET /api/patients/:id ينجح", JSON.stringify(gp.body));
      const row = (gp.body.payments as any[]).find((p) => p.id === pays[0].id);
      check(Boolean(row), "    والدفعةُ موجودةٌ في الاستجابة");
      same("أ٤. **و`displayDescription` نفسُ النصّ المخزَّن بالضبط** (المصدرُ واحد)",
        row?.displayDescription, expected);
      same("    و`payment.notes` الخامُ لم يُمَسّ — لا يزال يحمل النصَّ نفسَه أيضاً",
        row?.notes, expected);
    }
    {
      //  ══ أ٢. دفعٌ كامل ═══════════════════════════════════════════════════
      const pid = await mkPatient("أ-بيع-كامل");
      await mkCase(pid, "prosthetic");
      const r = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 1_400_000, discountAmount: 0, paidNow: 1_400_000,
      });
      check(r.status === 201, "أ٥. بيعُ ركبةٍ بدفعٍ كامل ⟶ ينجح", JSON.stringify(r.body));
      const pays = await paymentsOf(pid);
      const expected = "دفعة مقابل الركبة — مدفوع بالكامل 1,400,000 د.ع";
      same("أ٦. النصُّ المخزَّن «مدفوع بالكامل»", pays[0]?.notes, expected);
      const gp = await getPatient(pid);
      const row = (gp.body.payments as any[]).find((p) => p.id === pays[0].id);
      same("أ٧. و`displayDescription` تطابقه", row?.displayDescription, expected);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الإلحاقُ بجهازٍ قيد التصنيع — سعرُ الإلحاق لا كلفةُ الجهاز التراكمية ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ب-إلحاقٌ-بدفعة");
      const caseId = await mkCase(pid, "prosthetic");
      const DEVICE_COST = 1_000_000;
      const [ep] = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, component, service_path, created_by)
         VALUES ($1,$2,1,1,'in_manufacturing',$3,'full_device',NULL,'exam',$4) RETURNING id`,
        [pid, caseId, DEVICE_COST, RECV]);
      await q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
           status, current_stage, purpose, device_episode_id, assigned_by)
         VALUES ($1,1,'prosthetic',$2,'active','mold','initial_build',$3,$4)`,
        [pid, EXPERT, ep.id, RECV]);

      const r = await sale({
        patientId: pid, component: "adapter", attachToDeviceEpisodeId: ep.id, expertUserId: EXPERT,
        originalPrice: 80_000, discountAmount: 0, paidNow: 30_000,
      });
      check(r.status === 201, "ب١. الإلحاقُ بدفعٍ جزئيّ ⟶ ينجح", JSON.stringify(r.body));
      const cost = await episodeAgreedCost(ep.id);
      same("    وكلفةُ الحلقة صارت تراكمية (الجهاز + الأدابتر) — لا سعرَ الإلحاق وحده",
        cost, DEVICE_COST + 80_000);

      const pays = await paymentsOf(pid);
      const expected = "دفعة مقابل الأدابتر — المدفوع 30,000 د.ع من 80,000 د.ع — المتبقي 50,000 د.ع";
      check(pays.length === 1 && pays[0].notes === expected,
        "ب٢. **النصُّ المخزَّن يصف سعرَ الإلحاق بعينه (80,000)** — لا الكلفةَ"
        + " التراكمية (1,080,000) التي كانت ستُنتج «متبقّياً» سالباً كاذباً",
        JSON.stringify(pays[0]));

      const gp = await getPatient(pid);
      const row = (gp.body.payments as any[]).find((p) => p.id === pays[0].id);
      check(row?.displayDescription === null,
        "ب٣. **و`displayDescription` تبقى `null` عمداً** — حلقةُ الجهاز الكامل"
        + " ليست مؤهَّلةً للاشتقاق (لا تحمل component_sale_original_price)،"
        + " فلا لبسَ بين سعر الجزء وكلفة الجهاز", JSON.stringify(row));
      same("    والنصُّ الخامُ يبقى مصدرَ العرض الوحيد لهذه الدفعة", row?.notes, expected);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. الصيانةُ — نصٌّ غنيّ مخزَّن، و`displayDescription` تبقى null عمداً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  ══ ج١. أطرافٌ بجزء، دفعٌ جزئيّ، جهازٌ غيرُ مسجَّل صراحةً ══════════════
      const pid = await mkPatient("ج-صيانة-أطراف-جزئيّ");
      await mkCase(pid, "prosthetic");
      const r = await maint({
        patientId: pid, serviceType: "prosthetic", maintenanceComponent: "knee",
        legacyUnrecordedDevice: true, expertUserId: EXPERT,
        originalPrice: 500_000, discountAmount: 0, paidNow: 200_000,
      });
      check(r.status === 201, "ج١. صيانةُ ركبةٍ بدفعٍ جزئيّ ⟶ ينجح", JSON.stringify(r.body));
      const pays = await paymentsOf(pid);
      const expected = "دفعة صيانة الركبة — المدفوع 200,000 د.ع من 500,000 د.ع — المتبقي 300,000 د.ع";
      same("ج٢. النصُّ المخزَّن غنيّاً بصيغة الصيانة", pays[0]?.notes, expected);
      check(pays[0]?.visit_id !== null,
        "    والدفعةُ مربوطةٌ بزيارةٍ حقيقية — الصيانةُ تُنشئ زيارةً دائماً");
      check(pays[0]?.device_episode_id === null,
        "    وبلا حلقةٍ — أُقرّ صراحةً بجهازٍ غير مسجَّل");
      const gp = await getPatient(pid);
      const row = (gp.body.payments as any[]).find((p) => p.id === pays[0].id);
      check(row?.displayDescription === null,
        "ج٣. **و`displayDescription` تبقى `null` عمداً** — لا اشتقاقَ تخمينيّ"
        + " لصفوف الصيانة (بلا حلقةٍ هنا أصلاً، فالبوّابةُ الأولى تكفي)",
        JSON.stringify(row));
    }
    {
      //  ══ ج٢. مساندُ بلا جزء، دفعٌ كامل ═══════════════════════════════════
      const pid = await mkPatient("ج-صيانة-مساند-كامل", { support: true });
      await mkCase(pid, "medical_support");
      const r = await maint({
        patientId: pid, serviceType: "medical_support",
        legacyUnrecordedDevice: true, expertUserId: EXPERT,
        originalPrice: 300_000, discountAmount: 0, paidNow: 300_000,
      });
      check(r.status === 201, "ج٤. صيانةُ مسندٍ كاملٍ بدفعٍ كامل ⟶ ينجح", JSON.stringify(r.body));
      const pays = await paymentsOf(pid);
      const expected = "دفعة صيانة مسند طبي كامل — مدفوع بالكامل 300,000 د.ع";
      same("ج٥. **عنوانُ «مسند طبي كامل» — لا جزءَ لمريضٍ مساند**", pays[0]?.notes, expected);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الاشتقاقُ التاريخيّ — صفٌّ قديمٌ بنصٍّ عامّ يكتسب عرضاً أغنى بلا مسّه ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  ══ د١. حلقةٌ مؤهَّلة فعلاً + صفُّ دفعةٍ **قديم** مُدرَجٌ مباشرةً —
      //  محاكاةً لدفعةٍ سُجِّلت قبل هذه المرحلة، بنصّها العامّ التاريخيّ
      //  («دفعة عند بيع الجزء») **بلا** نداء النقطة الحقيقية إطلاقاً. ═══════
      const pid = await mkPatient("د-تاريخيّ-مؤهَّل");
      await mkCase(pid, "prosthetic");
      //  **سعرٌ موجب ومدفوعٌ صفرٌ صريح** ⟶ حلقةٌ مؤهَّلة حقيقية (السعرُ
      //  والنوعُ من مسارٍ حيّ فعلاً) بصفر دفعاتٍ — القماشةُ النظيفة التي
      //  نُدرج عليها الصفَّ «القديم» يدوياً.
      const r = await sale({
        patientId: pid, component: "socket", expertUserId: EXPERT,
        originalPrice: 500_000, discountAmount: 0, paidNow: 0,
      });
      check(r.status === 201 && r.body.paymentId === null,
        "د١. حلقةٌ مؤهَّلة بصفر دفعاتٍ (دَينٌ كامل) — القماشةُ الجاهزة", JSON.stringify(r.body));
      const legacyNote = "دفعة عند بيع الجزء";
      const [caseRow] = await q<{ id: number }>(
        `SELECT id FROM patient_cases WHERE patient_id=$1`, [pid]);
      const [legacyPay] = await q<{ id: number }>(
        `INSERT INTO payments (patient_id, branch_id, amount, notes, payment_treatment_type,
           case_id, device_episode_id, visit_id)
         VALUES ($1,1,300000,$2,'أطراف صناعية',$3,$4,NULL) RETURNING id`,
        [pid, legacyNote, caseRow.id, r.body.deviceEpisodeId]);

      const gp = await getPatient(pid);
      const row = (gp.body.payments as any[]).find((p) => p.id === legacyPay.id);
      check(Boolean(row), "د٢. الصفُّ «القديم» موجودٌ في الاستجابة");
      same("    **والنصُّ الخامُ لم يتغيّر حرفاً** — لا مسَّ لصفٍّ تاريخيّ إطلاقاً",
        row?.notes, legacyNote);
      const expectedDerived = "دفعة مقابل القالب — المدفوع 300,000 د.ع من 500,000 د.ع — المتبقي 200,000 د.ع";
      same("د٣. **و`displayDescription` غنيّةٌ ومُشتقّة** من حقول الحلقة المُهيكَلة",
        row?.displayDescription, expectedDerived);

      //  ══ د٢. الدفعةُ الثانية (مباشرةً، لا عبر API) على **الحلقة نفسِها** —
      //  الآن دفعتان مرتبطتان، فكلتاهما تنزل إلى الشكل الأبسط. ══════════════
      const [legacyPay2] = await q<{ id: number }>(
        `INSERT INTO payments (patient_id, branch_id, amount, notes, payment_treatment_type,
           case_id, device_episode_id, visit_id)
         VALUES ($1,1,200000,'دفعة',$2,$3,$4,NULL) RETURNING id`,
        [pid, caseRow.id, caseRow.id, r.body.deviceEpisodeId]);
      const gp2 = await getPatient(pid);
      const row1After = (gp2.body.payments as any[]).find((p: any) => p.id === legacyPay.id);
      const row2 = (gp2.body.payments as any[]).find((p: any) => p.id === legacyPay2.id);
      same("د٤. **دفعتان مرتبطتان بنفس الحلقة ⟶ الشكلُ الأبسط للاثنتين معاً**"
        + " (لا ادّعاءَ «من/متبقي» يرتّب دفعتين تاريخيّتين لا يُعرف ترتيبُهما)",
        [row1After?.displayDescription, row2?.displayDescription],
        ["دفعة مقابل القالب — 300,000 د.ع", "دفعة مقابل القالب — 200,000 د.ع"]);
    }
    {
      //  ══ د٣. حلقةٌ **غيرُ مؤهَّلة** (جهازٌ كامل) + دفعةٌ قديمة ⟶ `null` ══════
      const pid = await mkPatient("د-تاريخيّ-غيرُ-مؤهَّل");
      const caseId = await mkCase(pid, "prosthetic");
      const [ep] = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, component, service_path, created_by)
         VALUES ($1,$2,1,1,'delivered',1750000,'full_device',NULL,'exam',$3) RETURNING id`,
        [pid, caseId, RECV]);
      const legacyNote = "دفعة عند بيع الجزء";
      const [legacyPay] = await q<{ id: number }>(
        `INSERT INTO payments (patient_id, branch_id, amount, notes, payment_treatment_type,
           case_id, device_episode_id, visit_id)
         VALUES ($1,1,500000,$2,'أطراف صناعية',$3,$4,NULL) RETURNING id`,
        [pid, legacyNote, caseId, ep.id]);
      const gp = await getPatient(pid);
      const row = (gp.body.payments as any[]).find((p) => p.id === legacyPay.id);
      check(row?.displayDescription === null,
        "د٥. جهازٌ كاملٌ (غيرُ مؤهَّل) ⟶ `displayDescription: null` — بلا تخمين",
        JSON.stringify(row));
      same("    والنصُّ الخامُ يبقى كما كُتب", row?.notes, legacyNote);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. إغلاقُ الثغرة: صيانةٌ على حلقةٍ مُسلَّمة كانت بيعَ جزء — لا اشتقاقَ «بيع» ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  ══ منتقي جهاز الصيانة (`useDeviceEpisodes`) يعرض **أيّ** حلقةٍ
      //  مُسلَّمة للمريض والخدمة — بما فيها حلقةٌ وُلدت من بيع جزءٍ بلا
      //  معاينة، لا الجهازَ الكاملَ وحده. فجهازٌ اشتُري كذلك («ركبة») قد
      //  يصير لاحقاً هدفَ **صيانةٍ** مستقلّة، ودفعةُ تلك الصيانة تحمل
      //  `device_episode_id` الحلقةِ **المؤهَّلة نفسِها** — فلولا حارسُ
      //  `visitId`، لَقرأها `deriveDevicePaymentDisplay` «بيعاً» بسعر
      //  الشراء الأصليّ لا الصيانة. ═══════════════════════════════════════
      const pid = await mkPatient("هـ-صيانةٌ-على-جهازٍ-مباع");
      await mkCase(pid, "prosthetic");
      const r1 = await sale({
        patientId: pid, component: "knee", expertUserId: EXPERT,
        originalPrice: 500_000, discountAmount: 0, paidNow: 500_000,
      });
      check(r1.status === 201, "هـ١. شراءُ ركبةٍ (سيصير لاحقاً هدفَ صيانة) ⟶ ينجح",
        JSON.stringify(r1.body));
      const episodeId = r1.body.deviceEpisodeId as number;
      //  **تسليمٌ حقيقيّ** — الشرطُ الوحيد ليصلح المُعرَّفُ هدفاً للصيانة.
      await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW()
                WHERE id=$1`, [episodeId]);
      const eligibility = await q<{ csop: number | null }>(
        `SELECT component_sale_original_price::int csop FROM patient_device_episodes WHERE id=$1`,
        [episodeId]);
      check(eligibility[0]?.csop === 500_000,
        "    والحلقةُ **مؤهَّلةٌ فعلاً** للاشتقاق (component_sale_original_price موجب)"
        + " — الثغرةُ حقيقية لولا الحارس", JSON.stringify(eligibility[0]));

      const r2 = await maint({
        patientId: pid, serviceType: "prosthetic", maintenanceComponent: "knee",
        deviceEpisodeId: episodeId, expertUserId: EXPERT,
        originalPrice: 200_000, discountAmount: 0, paidNow: 150_000,
      });
      check(r2.status === 201, "هـ٢. صيانةُ الركبة المُسلَّمة (بمعرّفها) ⟶ ينجح", JSON.stringify(r2.body));
      same("    **والحلقةُ لم تتحرّك عن `delivered`** — الصيانةُ لا تعيد جهازاً إلى التصنيع",
        (await q<{ status: string }>(
          `SELECT status FROM patient_device_episodes WHERE id=$1`, [episodeId]))[0]?.status,
        "delivered");

      const pays = await paymentsOf(pid);
      const maintPay = pays.find((p) => p.amount === 150_000);
      check(Boolean(maintPay), "هـ٣. دفعةُ الصيانة موجودة");
      check(maintPay?.visit_id !== null,
        "    ومربوطةٌ بزيارةٍ حقيقية (صيانةٌ حتماً)، وبنفس الحلقة المؤهَّلة",
        JSON.stringify(maintPay));
      same("    وحلقتُها هي حلقةُ البيع الأصلية نفسُها — التباسٌ حقيقيّ لا افتراضيّ",
        maintPay?.device_episode_id, episodeId);
      const expectedMaintNote =
        "دفعة صيانة الركبة — المدفوع 150,000 د.ع من 200,000 د.ع — المتبقي 50,000 د.ع";
      same("هـ٤. **والنصُّ المخزَّنُ نصُّ صيانةٍ صحيح** (200,000 لا 500,000)",
        maintPay?.notes, expectedMaintNote);

      const gp = await getPatient(pid);
      const row = (gp.body.payments as any[]).find((p) => p.id === maintPay?.id);
      check(row?.displayDescription === null,
        "هـ٥. **الثغرةُ مُغلَقة**: `displayDescription` تبقى `null` رغم أهليّة الحلقة"
        + " — لا اشتقاقَ «مقابل الركبة — المدفوع … من 500,000» (سعرُ الشراء الأصليّ)"
        + " على دفعةِ صيانةٍ لا علاقةَ لها بذلك السعر", JSON.stringify(row));
      same("    والنصُّ الخامُ (نصُّ الصيانة الصحيح) يبقى العرضَ الوحيد", row?.notes, expectedMaintNote);

      //  ══ ودفعةُ **الشراء الأصليّ** على نفس الحلقة لم تتأثّر — ما زالت
      //  دفعةً واحدة مرتبطة (البيعُ)، فتُشتَقّ لها العرضُ الغنيّ كالمعتاد
      //  لو كانت قديمةً؛ وهنا نصُّها المخزَّن أصلاً غنيٌّ فيتطابقان. ══════════
      const salePay = pays.find((p) => p.amount === 500_000);
      const saleRow = (gp.body.payments as any[]).find((p: any) => p.id === salePay?.id);
      check(saleRow?.visitId === null, "هـ٦. ودفعةُ الشراء الأصليّ بلا زيارة كما كانت دائماً");
      same("    و`displayDescription` الخاصّةُ بها لم تتأثّر بالصيانة اللاحقة",
        saleRow?.displayDescription,
        "دفعة مقابل الركبة — مدفوع بالكامل 500,000 د.ع");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. العقدُ المعماريّ — بلا قاموس تسمياتٍ ثانٍ ──");
    // ══════════════════════════════════════════════════════════════════
    check(/from ["']\.\/prosthetic_parts["']/.test(PAYMENT_DESC_SRC),
      "و١. `shared/payment_description.ts` يستورد `requestedItemLabel` من"
      + " `prosthetic_parts.ts` — لا يعيد تعريف التسميات");
    check(!/COMPONENT_LABELS\s*[:=]/.test(PAYMENT_DESC_SRC)
      && !/socket:\s*["']/.test(PAYMENT_DESC_SRC),
      "و٢. ولا قاموسَ تسمياتٍ محليّاً (لا `COMPONENT_LABELS` ولا حرفاً مثل"
      + " «القالب» مكتوباً مباشرةً) — التسميةُ كلُّها عبر `requestedItemLabel`");
    same("و٣. (تأكيدٌ إيجابيّ) `requestedItemLabel` المستورَدة تُنتج نفسَ"
      + " التسميات المستعملة أعلاه — مصدرٌ واحد فعلاً لا مصادفة",
      [requestedItemLabel("silicone"), requestedItemLabel(null, "medical_support")],
      ["السليكون", "مسند طبي كامل"]);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. دفعةٌ بلا `deviceEpisodeId` — بلا `displayDescription` إطلاقاً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  ══ دفعةٌ عادية (غيرُ جهازية) — نفسُ الشرط الأوّل في `routes.ts`:
      //  `p.deviceEpisodeId !== null` — فلا استعلامَ حلقةٍ عبثاً، وبلا
      //  التباسٍ مع نصٍّ حرٍّ قد يذكر «جزء» عرَضاً. ══════════════════════════
      const pid = await mkPatient("ز-دفعةٌ-عاديّة");
      const caseId = await mkCase(pid, "prosthetic");
      const [pay] = await q<{ id: number }>(
        `INSERT INTO payments (patient_id, branch_id, amount, notes, payment_treatment_type,
           case_id, device_episode_id, visit_id)
         VALUES ($1,1,75000,'دفعة نقدية عادية','أطراف صناعية',$2,NULL,NULL) RETURNING id`,
        [pid, caseId]);
      const gp = await getPatient(pid);
      const row = (gp.body.payments as any[]).find((p) => p.id === pay.id);
      check(row?.displayDescription === null,
        "ز١. دفعةٌ بلا حلقةٍ ⟶ `displayDescription: null` دائماً", JSON.stringify(row));
      same("    والنصُّ الخامُ هو العرضُ الوحيد لها كما كان دائماً",
        row?.notes, "دفعة نقدية عادية");
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص جودة وصف تاريخ الدفعات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
