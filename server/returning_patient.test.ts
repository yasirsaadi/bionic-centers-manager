// **المريضُ العائد** — من الطلب إلى الصيانة، حيّاً على Postgres.
// قاعدة محلّية: `npm run test:returning-patient`.
//
// ══ لماذا هذا الملفّ ═════════════════════════════════════════════════════
// المريضُ العائد هو الحالةُ الأشيع في المركز: طرفُه سُلِّم قبل سنتين، فيعود
// لطرفٍ جديد، أو **لجزءٍ منه** (ركبةٌ أو قدمٌ أو قالب)، أو لصيانةِ ما عنده.
// وكلُّ واحدةٍ من هذه الثلاث كانت تُدار بمسارٍ يخصّها، وبعضُها بلا مسارٍ
// أصلاً: الجزءُ يُكتب في ملاحظةٍ حرّة، والصيانةُ تُفتَح بلا أن يُقال أيُّ
// جزءٍ يُصان، وخصمُ الصيانة يقع بلا اعتماد.
//
// ══ والقاعدةُ الواحدة التي يحرسها ═══════════════════════════════════════
// **بابٌ واحد لكلّ قرار**: الطلبُ حلقةٌ على خيطه القائم (لا ملفٌّ ثانٍ ولا
// خيطٌ ثانٍ)، والجزءُ **عمودٌ منظَّم** لا نصّ، والصيانةُ تسمّي جزأها،
// وخصمُها يمرّ بطابور الاعتماد نفسه الذي يمرّ به بيعُ جهاز — ولا شيءَ
// يُنفَّذ قبل الاعتماد: لا أمرَ ولا زيارةَ ولا كلفةَ ولا قيد.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as mfg from "./manufacturing/store";
import { COMPONENT_LABELS } from "@shared/prosthetic_parts";
import { maintenanceDiscountRef } from "@shared/discount";

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

const PORT = 6837;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-المريض-العائد";
const MANAGER = 9861, DOCTOR = 9862, EXPERT = 9863, RECEPTION = 9864;

const S = {
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "mgr",
    permissions: { canViewPatients: true, canAddPatients: true, canEditVisits: true },
  },
  //  `canAddPayments: true` — الافتراضُ الحقيقيّ لحساب استقبال، ولازمٌ
  //  الآن كي تبلغ طلباتُ الدفعة هنا حراسها التالية (لا ترتدّ ٤٠٣ من بوّابة
  //  الصلاحية أوّلاً).
  reception: {
    userId: RECEPTION, role: "reception", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "recv",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true },
  },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** مريضٌ **قائم** — بمقاساته الإلزامية وبترِه المنظَّم. */
async function mkPatient(label: string, opts: { support?: boolean } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,true,$3,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, opts.support === true]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,0,'manual','active') RETURNING id`, [patientId, caseType]);
  return r[0].id;
}
/** حلقةُ جهازٍ **مسلَّمة** — أي مريضٌ يملك جهازاً فعلاً. */
async function mkDeliveredEpisode(patientId: number, caseId: number, seq = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, requested_item, created_by, delivered_at)
     VALUES ($1,$2,1,$3,'delivered',1000000,'full_device',$4,NOW()) RETURNING id`,
    [patientId, caseId, seq, MANAGER]);
  return r[0].id;
}
/** معاينةٌ موقّعة على حلقةٍ بعينها — شرطُ التخصيص. */
async function mkExam(patientId: number, caseId: number, episodeId: number | null) {
  const r = await q<{ id: number }>(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
       doctor_name, diagnosis, prescription, device_cost, version, signed_at, device_episode_id)
     VALUES ($1,$2,'prosthetic',1,$3,'د. فلان','تشخيص','{}'::jsonb,1200000,1,NOW(),$4) RETURNING id`,
    [patientId, caseId, DOCTOR, episodeId]);
  return r[0].id;
}
async function epRow(id: number) {
  const [r] = await q(
    `SELECT id, sequence_number, status, requested_item, component
       FROM patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
}
async function ordersOf(patientId: number) {
  return q(`SELECT id, purpose, status, expert_user_id, maintenance_component, device_episode_id
              FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
}
async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT count(*)::int FROM visits       WHERE patient_id=$1 AND deleted_at IS NULL) AS visits,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS cost_entries,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders`,
    [patientId]);
  return { total: Number(p?.total ?? 0), ...n };
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
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  //  قيدُ اليومية يشير إلى مَن أنشأه — فيُمسح قبل حذف المستخدم في النهاية.
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries
              WHERE created_by = ANY(ARRAY[${MANAGER},${DOCTOR},${EXPERT},${RECEPTION}]))`);
  await q(`DELETE FROM journal_entries
            WHERE created_by = ANY(ARRAY[${MANAGER},${DOCTOR},${EXPERT},${RECEPTION}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  //  جهاتُ واتساب تُنشأ تلقائياً مع كلّ مريضٍ يُسجَّل بالنقطة الحقيقية
  //  (الرايةُ مرفوعةٌ افتراضاً)، فحذفُ المريض بـSQL خام يصطدم بمفتاحها.
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec] of [
    [MANAGER, "branch_manager", "null"], [DOCTOR, "doctor", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "null"], [RECEPTION, "reception", "null"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, medical_specialties=EXCLUDED.medical_specialties`,
      [id, `rp_u${id}`, role, spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(h) } : {};
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
    //  أ. **العائدُ لطرفٍ كامل** — حلقةٌ ثانية على خيطه، لا ملفٌّ ثانٍ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. العائد لطرفٍ كامل ──");
    {
      const p = await mkPatient("عائد لطرف كامل");
      const c = await mkCase(p);
      const ep1 = await mkDeliveredEpisode(p, c);

      const before = await q(
        `SELECT count(*)::int AS n FROM patients WHERE referral_source=$1`, [MARK]);
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "prosthetic", requestedItem: "full_device" });
      same("١. **الطلبُ يُقبل** لمريضٍ جهازُه مسلَّم", r.status, 201);
      const ep2 = await epRow(r.body?.id);
      same("٢. **حلقةٌ ثانيةٌ على الخيط نفسه** — لا خيطَ جديد",
        [ep2?.sequence_number, ep2?.status], [2, "awaiting_exam"]);
      same("٣. **والمطلوبُ مخزَّنٌ منظَّماً: طرفٌ كامل ⟶ بلا جزء**",
        [ep2?.requested_item, ep2?.component], ["full_device", null]);
      const after = await q(
        `SELECT count(*)::int AS n FROM patients WHERE referral_source=$1`, [MARK]);
      same("٤. **ولا ملفَّ مريضٍ ثانياً يُنشأ** — العائدُ هو هو",
        after[0].n, before[0].n);
      const cases = await q(
        `SELECT count(*)::int AS n FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`, [p]);
      same("٥. **ولا حالةَ أطرافٍ ثانية**", cases[0].n, 1);
      const [old] = await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [ep1]);
      same("٦. **والجهازُ القديم لا يُمَسّ** — تاريخُه تاريخُه", old.status, "delivered");

      //  والطبيبُ يقرأ ما طُلب في طلبِه هو.
      const [rev] = await q(
        `SELECT reception_note, review_kind FROM medical_review_requests
          WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [p]);
      check(String(rev?.reception_note ?? "").includes("المطلوب: طرف صناعي كامل"),
        "٧. **وطلبُ المراجعة يحمل المطلوب نصّاً للطبيب**", JSON.stringify(rev));
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب. **العائدُ لجزءٍ جديد** — ركبةٌ لا طرفٌ كامل
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. العائد لجزءٍ جديد ──");
    let partEpisode = 0, partPatient = 0, partCase = 0;
    {
      const p = await mkPatient("عائد لركبة");
      const c = await mkCase(p);
      await mkDeliveredEpisode(p, c);
      partPatient = p; partCase = c;

      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "prosthetic", requestedItem: "knee" });
      same("٨. **طلبُ جزءٍ يمرّ بالبابِ نفسه** — لا نظامَ بيعٍ موازٍ", r.status, 201);
      partEpisode = r.body?.id;
      const ep = await epRow(partEpisode);
      same("٩. **والجزءُ عمودٌ منظَّم لا ملاحظةٌ حرّة**",
        [ep?.requested_item, ep?.component], ["knee", "knee"]);

      const [rev] = await q(
        `SELECT reception_note FROM medical_review_requests
          WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [p]);
      same("١٠. **والطبيبُ يقرأ «المطلوب: الركبة»**",
        String(rev?.reception_note ?? "").startsWith("المطلوب: الركبة"), true);

      //  **والمجهولُ يُردّ لا يُصحَّح**: تصحيحُه «طرفاً كاملاً» يقلب ثمنَه.
      const bad = await http("POST", `/api/patients/${p}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "prosthetic", requestedItem: "elbow" });
      same("١١. **وقطعةٌ مخترَعة تُردّ ٤٠٠**", bad.status, 400);
      check(String(bad.body?.error ?? "").includes("القائمة"),
        "   (برسالةٍ تدلّ على القائمة)", JSON.stringify(bad.body));
    }
    {
      //  والمساندُ الطبية لا أجزاءَ لها في هذه القائمة.
      const p = await mkPatient("مسند", { support: true });
      await mkCase(p, "medical_support");
      const bad = await http("POST", `/api/patients/${p}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "medical_support", requestedItem: "knee" });
      same("١٢. **وجزءُ طرفٍ على مسندٍ يُردّ**", bad.status, 400);
      const ok = await http("POST", `/api/patients/${p}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "medical_support", requestedItem: "full_device" });
      same("١٣. والمسندُ يمرّ بلا جزء", ok.status, 201);
      const ep = await epRow(ok.body?.id);
      same("   (وعمودُه فارغ)", [ep?.requested_item, ep?.component], ["full_device", null]);
    }
    {
      //  **والحوكمةُ التجارية نفسها**: الجزءُ لا يُخصَّص قبل معاينته هو.
      const r = await http("POST", `/api/patients/${partPatient}/assign-manufacturing`,
        S.manager, { expertUserId: EXPERT, serviceType: "prosthetic", cost: 300000 });
      same("١٤. **ولا تخصيصَ للجزء قبل معاينة الطبيب**", r.status, 409);
      await mkExam(partPatient, partCase, partEpisode);
      await q(`UPDATE patient_device_episodes SET status='examined' WHERE id=$1`, [partEpisode]);
      const ok = await http("POST", `/api/patients/${partPatient}/assign-manufacturing`,
        S.manager, { expertUserId: EXPERT, serviceType: "prosthetic", cost: 300000 });
      check(ok.status === 201, "١٥. **وبعد المعاينة يمرّ** — نفسُ مسار الطرف الكامل حرفاً",
        `${ok.status} ${JSON.stringify(ok.body)}`);
      const [ep] = await q(
        `SELECT status, requested_item, component FROM patient_device_episodes WHERE id=$1`,
        [partEpisode]);
      same("١٦. **والجزءُ باقٍ على الحلقة بعد البيع**",
        [ep.requested_item, ep.component], ["knee", "knee"]);
      const orders = await ordersOf(partPatient);
      same("   (وأمرُ تصنيعٍ واحد فُتح)", orders.length, 1);
      same("١٧. **وأمرُ البناء مربوطٌ بحلقة الجزء**",
        Number(orders[0].device_episode_id), partEpisode);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج. **الصيانة** — أيُّ جزء، وبأيّ ثمن، وبأيّ إذن
    // ══════════════════════════════════════════════════════════════════
    //  ⚠ **(المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨)** — البابُ الحيّ صار
    //  `/api/no-exam/maintenance` (`originalPrice`/`discountAmount` بدل
    //  `cost`/`discount`، بلا طابورِ اعتمادٍ للصيانة الجديدة إطلاقاً — خصمٌ
    //  أو مجّانيّةٌ يُدخلهما المخوَّلُ فوراً). **وطابورُ الخصم القديم
    //  (`service_discount_requests`) لم يُحذَف**: صفوفٌ معلَّقةٌ من قبل هذه
    //  المرحلة تبقى قابلةً للحسم بمسارها — فتُحاكى هنا بإدراجٍ مباشر
    //  (نفسُ الشكل الذي كان `discountStore.submitDiscount` يكتبه)، ويُثبَت
    //  أن `POST /api/discounts/:id/decide` ما زال يعمل بحرفه.
    async function seedPendingMaintenanceDiscount(p: {
      patientId: number; branchId: number; caseId: number; deviceEpisodeId: number;
      component: string; originalPrice: number; finalPrice: number; isFree: boolean;
    }): Promise<number> {
      const discountAmount = p.originalPrice - p.finalPrice;
      const pct = ((discountAmount / p.originalPrice) * 100).toFixed(2);
      const payload = {
        kind: "maintenance", expertUserId: EXPERT,
        deviceEpisodeId: p.deviceEpisodeId, legacyUnrecordedDevice: false,
        maintenanceComponent: p.component, visitNotes: "صيانة", expectedDeliveryDate: null,
      };
      const [row] = await q<{ id: number }>(
        `INSERT INTO service_discount_requests
           (patient_id, case_id, branch_id, department, context_ref, original_price,
            proposed_final_price, discount_amount, discount_percentage, is_free, reason,
            status, payload, requested_by, requested_by_name)
         VALUES ($1,$2,$3,'prosthetic',$4,$5,$6,$7,$8,$9,'humanitarian','pending',$10,$11,'ريام')
         RETURNING id`,
        [p.patientId, p.caseId, p.branchId, maintenanceDiscountRef("prosthetic"),
          p.originalPrice, p.finalPrice, discountAmount, pct, p.isFree,
          JSON.stringify(payload), RECEPTION]);
      return row.id;
    }

    console.log("\n── ج. الصيانة: الجزء إلزامي ──");
    {
      const p = await mkPatient("صيانة بلا جزء");
      const c = await mkCase(p);
      await mkDeliveredEpisode(p, c);
      const r = await http("POST", "/api/no-exam/maintenance", S.reception,
        { patientId: p, expertUserId: EXPERT, originalPrice: 50000, discountAmount: 0,
          note: "صيانة" });
      same("١٨. **صيانةُ طرفٍ بلا جزءٍ تُردّ ٤٠٠**", r.status, 400);
      same("   (برسالةٍ تسمّي المطلوب)", r.body?.error, "حدّد الجزء المراد صيانته");
      same("١٩. **ولا شيءَ وقع** — لا أمرَ ولا زيارةَ ولا كلفة",
        await moneyOf(p), { total: 0, visits: 0, cost_entries: 0, orders: 0 });

      //  **وحتى الجهازُ القديم غير المسجَّل يُسأل عن جزئه**: الجهازُ مجهولٌ
      //  والجزءُ ليس كذلك.
      const legacy = await http("POST", "/api/no-exam/maintenance", S.reception,
        { patientId: p, expertUserId: EXPERT, originalPrice: 50000, discountAmount: 0,
          legacyUnrecordedDevice: true });
      same("٢٠. **والقديمُ غير المسجَّل يُسأل أيضاً**", legacy.status, 400);
    }

    console.log("\n── ج. الصيانة العادية: تنفيذٌ فوري ──");
    let normalPatient = 0;
    {
      const p = await mkPatient("صيانة عادية");
      normalPatient = p;
      const c = await mkCase(p);
      const ep = await mkDeliveredEpisode(p, c);
      const r = await http("POST", "/api/no-exam/maintenance", S.reception,
        { patientId: p, expertUserId: EXPERT, originalPrice: 50000, discountAmount: 0,
          paidNow: 0,
          note: "صيانة الطرف القديم", maintenanceComponent: "knee", deviceEpisodeId: ep });
      same("٢١. **الصيانةُ بلا خصمٍ تُنفَّذ فوراً**", r.status, 201);
      const orders = await ordersOf(p);
      same("٢٢. **وأمرٌ واحدٌ فُتح بجزئه المنظَّم**",
        orders.map((o: any) => [o.purpose, o.maintenance_component, o.status]),
        [["maintenance", "knee", "active"]]);
      const m = await moneyOf(p);
      same("٢٣. **وأجورُها مقيَّدةٌ ومحسوبة**",
        [m.total, m.visits, m.cost_entries], [50000, 1, 1]);
      const [v] = await q(`SELECT notes FROM visits WHERE patient_id=$1`, [p]);
      check(String(v.notes).includes("صيانة الركبة")
        && String(v.notes).includes("صيانة الطرف القديم"),
        "٢٤. **وملاحظةُ الموظّف تبقى، والجزءُ يُضاف إليها**", String(v.notes));
      same("٢٥. **والأمرُ مربوطٌ بالجهاز المُصان بعينه**",
        Number(orders[0].device_episode_id), ep);
    }

    // ══ **والصفرُ وحده لا يعني «مجّاناً»** ═══════════════════════════════
    //  السعرُ الأصليُّ **موجبٌ دائماً** (`deriveOfferFromDiscount` القانونية،
    //  المرحلة الثانية) — لا حارسَ صيانةٍ خاصٍّ يُعاد اختراعه.
    console.log("\n── ج. الصفر لا يعني مجّاناً ──");
    {
      const p = await mkPatient("صيانة بصفر");
      const c = await mkCase(p);
      const ep = await mkDeliveredEpisode(p, c);
      const zero = await http("POST", "/api/no-exam/maintenance", S.reception,
        { patientId: p, expertUserId: EXPERT, originalPrice: 0, discountAmount: 0,
          maintenanceComponent: "knee", deviceEpisodeId: ep, note: "صيانة" });
      same("٢٦. **صيانةٌ بأصلٍ صفرٍ بلا تبرّعٍ صريح تُردّ ٤٠٠**", zero.status, 400);
      check(String(zero.body?.error ?? "").includes("صفر"),
        "   (والرسالةُ تدلّ على اشتراط الأصل الموجب)", JSON.stringify(zero.body));
      same("٢٧. **ولا أثرَ ماليّاً إطلاقاً** — لا أمرَ ولا زيارةَ ولا كلفة",
        await moneyOf(p), { total: 0, visits: 0, cost_entries: 0, orders: 0 });
      const [jl] = await q(
        `SELECT count(*)::int AS n FROM journal_lines WHERE patient_id=$1`, [p]);
      same("   (ولا سطرَ يومية)", jl.n, 0);

      //  **والمجّانيّ من سعرٍ أصليٍّ موجب يمضي فوراً** — بلا طابور، بمقدار
      //  خصمٍ يساوي الأصلَ بالضبط. (التغطيةُ الشاملة في
      //  `server/simplified_maintenance.test.ts`.)
      const free = await http("POST", "/api/no-exam/maintenance", S.reception,
        { patientId: p, expertUserId: EXPERT, originalPrice: 80000, discountAmount: 80000,
          maintenanceComponent: "knee", deviceEpisodeId: ep });
      same("٢٨. **والتبرّعُ الصريح من سعرٍ موجب يُنفَّذ فوراً بلا طابور**",
        [free.status, free.body?.priceKind, free.body?.finalPrice], [201, "free", 0]);
      const m = await moneyOf(p);
      same("٢٩. **بلا دينارٍ على المريض ولا قيدَ كلفةٍ يُخترَع** — والزيارةُ والأمرُ حقيقيّان",
        [m.orders, m.visits, m.total, m.cost_entries], [1, 1, 0, 0]);
      same("٣٠. **وصفرُ طلباتٍ معلَّقة على هذه العملية**",
        (await q(`SELECT count(*)::int n FROM service_discount_requests WHERE patient_id=$1`,
          [p]))[0].n, 0);
    }

    console.log("\n── ج. الخصمُ الموروث: طابورُ الاعتماد ما زال يعمل ──");
    let discountPatient = 0, discountRequest = 0, discountEpisode = 0;
    {
      const p = await mkPatient("صيانة بخصم موروث");
      discountPatient = p;
      const c = await mkCase(p);
      const ep = await mkDeliveredEpisode(p, c);
      discountEpisode = ep;
      //  **مُحاكاةٌ لصفٍّ موروث** — لا بابَ حيّاً ينشئ صفّاً كهذا للصيانة
      //  الجديدة بعد اليوم؛ هذا شكلُ ما تركته المرحلةُ السابقة، مقصوداً.
      discountRequest = await seedPendingMaintenanceDiscount({
        patientId: p, branchId: 1, caseId: c, deviceEpisodeId: ep, component: "foot",
        originalPrice: 100000, finalPrice: 60000, isFree: false,
      });
      same("٣٢. **الصفُّ الموروث معلَّقٌ ولا أمرَ له بعد**",
        await moneyOf(p), { total: 0, visits: 0, cost_entries: 0, orders: 0 });

      //  **وطلبٌ ثانٍ على الصيانة نفسها يُردّ** — لا طابورٌ مزدوج (الفهرسُ
      //  الفريد `uq_sdr_one_pending` يحرسه، وهو غيرُ مُمَسٍّ في هذه المرحلة).
      let dupBlocked = false;
      try {
        await seedPendingMaintenanceDiscount({
          patientId: p, branchId: 1, caseId: c, deviceEpisodeId: ep, component: "foot",
          originalPrice: 100000, finalPrice: 50000, isFree: false,
        });
      } catch { dupBlocked = true; }
      check(dupBlocked, "٣٧. **وطلبٌ معلَّقٌ ثانٍ على الصيانة نفسها يُرفَض بالقيد نفسِه**");
      same("   (وما زال أمرٌ واحدٌ صفراً)", (await ordersOf(p)).length, 0);
    }
    {
      //  ── الاعتماد: **الدالّةُ القانونية نفسها** تُنفَّذ ──
      const r = await http("POST", `/api/discounts/${discountRequest}/decide`,
        S.manager, { decision: "approve" });
      same("٣٨. **والاعتمادُ ينفّذ الصيانة**", r.status, 200);
      const orders = await ordersOf(discountPatient);
      same("٣٩. **أمرُ صيانةٍ واحدٌ بالضبط** — لا اثنان ولا صفر",
        orders.map((o: any) => [o.purpose, o.maintenance_component, o.status]),
        [["maintenance", "foot", "active"]]);
      same("٤٠. **وبالجهاز المُصان نفسه**",
        Number(orders[0].device_episode_id), discountEpisode);
      const m = await moneyOf(discountPatient);
      same("٤١. **والمقيَّدُ هو السعرُ المعتمَد لا الأصلي**",
        [m.total, m.visits, m.cost_entries], [60000, 1, 1]);
      const [ce] = await q(
        `SELECT amount::int AS amt, source FROM cost_entries WHERE patient_id=$1`,
        [discountPatient]);
      //  **ومصدرُ القيد `maintenance`** — فيُبوَّب في «أجهزة» كصيانةٍ عادية،
      //  لا كمصدرٍ ثالثٍ يخترعه بابُ الاعتماد لنفسه.
      same("٤٢. **وقيدُ الدفتر بالسعر المعتمد ومصدرُه صيانة**",
        [ce.amt, ce.source], [60000, "maintenance"]);

      //  **ولا تنفيذَ مرّتين**: إعادةُ الاعتماد تُردّ والأمرُ يبقى واحداً.
      const again = await http("POST", `/api/discounts/${discountRequest}/decide`,
        S.manager, { decision: "approve" });
      check(again.status >= 400, "٤٣. **وإعادةُ الاعتماد تُردّ**", String(again.status));
      same("٤٤. **والأمرُ يبقى واحداً** — لا ازدواج",
        (await ordersOf(discountPatient)).length, 1);
      same("   (والمالُ لم يتضاعف)", (await moneyOf(discountPatient)).total, 60000);
    }

    console.log("\n── ج. صيانةٌ مجّانيةٌ موروثة (اعتمادٌ بصفر) ──");
    {
      const p = await mkPatient("صيانة مجّانية موروثة");
      const c = await mkCase(p);
      const ep = await mkDeliveredEpisode(p, c);
      const reqId = await seedPendingMaintenanceDiscount({
        patientId: p, branchId: 1, caseId: c, deviceEpisodeId: ep, component: "socket",
        originalPrice: 80000, finalPrice: 0, isFree: true,
      });
      const ok = await http("POST", `/api/discounts/${reqId}/decide`,
        S.manager, { decision: "approve", isFree: true });
      same("٤٧. **والاعتمادُ ينفّذها بصفر**", ok.status, 200);
      const orders = await ordersOf(p);
      same("٤٨. **أمرٌ واحدٌ بجزئه**",
        orders.map((o: any) => [o.purpose, o.maintenance_component]), [["maintenance", "socket"]]);
      const m = await moneyOf(p);
      same("٤٩. **وبلا دينارٍ على المريض** — ولا قيدَ كلفةٍ يُخترَع",
        [m.total, m.cost_entries, m.visits], [0, 0, 1]);
    }
    {
      //  **والرفضُ لا ينفّذ شيئاً**.
      const p = await mkPatient("صيانة مرفوضة موروثة");
      const c = await mkCase(p);
      const ep = await mkDeliveredEpisode(p, c);
      const reqId = await seedPendingMaintenanceDiscount({
        patientId: p, branchId: 1, caseId: c, deviceEpisodeId: ep, component: "tube",
        originalPrice: 90000, finalPrice: 10000, isFree: false,
      });
      const dec = await http("POST", `/api/discounts/${reqId}/decide`,
        S.manager, { decision: "reject", note: "غير مبرَّر" });
      same("٥٠. **والرفضُ يُقبل**", dec.status, 200);
      same("٥١. **ولا يُنفَّذ شيء** — لا أمرَ ولا كلفة",
        await moneyOf(p), { total: 0, visits: 0, cost_entries: 0, orders: 0 });
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. **الجهازُ المكتمل** — تاريخُه يبقى، وبابُ البدء يُغلق
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الجهاز المكتمل ──");
    {
      //  للمريضِ العائد أمرُ بناءٍ سابق (أُنشئ في الفقرة ج بصيانةٍ عادية؟ لا —
      //  هنا نبني حالتَه صراحةً): أمرُ بناءٍ **مكتمل** بخبيرٍ معلوم.
      const p = await mkPatient("جهازٌ مكتمل");
      const c = await mkCase(p);
      const ep = await mkDeliveredEpisode(p, c);
      const [wo] = await q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id,
           service_type, purpose, status, current_stage, device_episode_id, final_result)
         VALUES ($1,1,$2,'prosthetic','initial_build','completed','delivered',$3,'success')
         RETURNING id`, [p, EXPERT, ep]);

      //  **الاختصارُ يُغلَق**: كان يعود بمجرّد اكتمال الأمر الأول، فيبدأ
      //  جهازاً ثانياً بلا حلقةٍ ولا معاينةٍ ولا سعر.
      const r = await http("POST", "/api/manufacturing/orders", S.manager,
        { patientId: p, expertUserId: EXPERT, serviceType: "prosthetic" });
      same("٤٦. **ولا اختصارَ يبدأ جهازاً ثانياً بعد التسليم**", r.status, 409);
      check(String(r.body?.error ?? "").includes("خدمة جديدة"),
        "٤٧. **والرسالةُ تدلّ على البابِ الصحيح**", JSON.stringify(r.body));
      same("٤٨. **ولا أمرَ ثانٍ أُنشئ**", (await ordersOf(p)).length, 1);

      //  **ولا يُمَسّ تاريخُه**: الأمرُ المكتمل وخبيرُه كما هما.
      const [after] = await q(
        `SELECT status, expert_user_id, final_result FROM prosthetic_work_orders WHERE id=$1`,
        [wo.id]);
      same("٤٩. **والخبيرُ التاريخيّ باقٍ على الأمر المكتمل**",
        [after.status, Number(after.expert_user_id), after.final_result],
        ["completed", EXPERT, "success"]);

      //  **والبابُ الصحيح مفتوح**: «خدمة جديدة» تعمل لنفس المريض.
      const ok = await http("POST", `/api/patients/${p}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "prosthetic", requestedItem: "foot" });
      same("٥٠. **والبابُ الصحيح يعمل** — حلقةٌ جديدة بجزئها", ok.status, 201);
      const ep2 = await epRow(ok.body?.id);
      same("   (بترتيبها وجزئها)",
        [ep2?.sequence_number, ep2?.requested_item, ep2?.component], [2, "foot", "foot"]);

      //  **ومَن لم يكن له جهازٌ قطّ يبقى له الاختصار** — لم يُغلَق على الجميع.
      const fresh = await mkPatient("بلا جهازٍ قطّ");
      const fc = await mkCase(fresh);
      await mkExam(fresh, fc, null);
      const shortcut = await http("POST", "/api/manufacturing/orders", S.manager,
        { patientId: fresh, expertUserId: EXPERT, serviceType: "prosthetic" });
      same("٥١. **والمريضُ الذي لا جهازَ له يبقى له الاختصار**", shortcut.status, 201);
    }

    //  والصيانةُ لا تُغلَق بالجهاز المكتمل: هي البابُ الصحيح لِما سُلِّم.
    {
      const orders = await ordersOf(normalPatient);
      same("٥٢. **والصيانةُ تبقى مفتوحةً للجهاز المسلَّم** — لا تحتاج معاينة",
        orders.length, 1);
    }

    //  ── **وعقدُ الواجهة**: زرُّ «بدء التصنيع» يختفي متى وُجدت حلقة ──
    {
      const { readFileSync } = await import("fs");
      const src = readFileSync(
        "client/src/components/manufacturing/StartManufacturingDialog.tsx", "utf8");
      check(src.includes("/device-episodes"),
        "٥٣. **والواجهةُ تسأل عن الحلقات أيضاً لا عن الأوامر وحدها**");
      //  **والحلقاتُ داخل التعبير نفسه** لا مجرّد استعلامٍ مهمَل: أمرُ
      //  التصنيع يُلغى فيختفي `summary` بينما الحلقةُ قائمة — وذاك بالضبط
      //  المريضُ الذي كان الزرُّ يعود له.
      const anyOrderLine = (src.match(/const hasAnyOrder = .*/) ?? [""])[0];
      check(/episode/i.test(anyOrderLine),
        "٥٤. **والحلقةُ داخل شرط الإخفاء نفسِه**", anyOrderLine);
      check(/if \(!mayStart \|\| hasAnyOrder/.test(src),
        "٥٥. **فيختفي الزرُّ لمَن له جهازٌ سابق**",
        (src.match(/.*hasAnyOrder.*/g) ?? []).join("\n"));
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. **إسنادُ الدفعة إلى حالتها** — والخادمُ يتحقّق لا الواجهة
    //
    //  النافذةُ صارت تحسم الحالةَ تلقائياً ولا تسأل إلّا عند غموضٍ حقيقيّ.
    //  **لكنّ العرضَ ليس حراسة**: وسمٌ من نافذةٍ قديمة مفتوحة — أو طلبٌ
    //  مصنوعٌ بيدٍ — كان يُدخل مالَ مريضِ علاجٍ طبيعي في قسم الأجهزة.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. إسناد الدفعة ──");
    const pay = (patientId: number, body: any) =>
      http("POST", "/api/payments", S.reception,
        { patientId, branchId: 1, amount: 100000, ...body });
    {
      //  ① مريضُ أطرافٍ يدفع على أطرافه — يمرّ.
      const p = await mkPatient("دفعة أطراف");
      await mkCase(p);
      await q(`UPDATE patients SET total_cost = 500000 WHERE id=$1`, [p]);
      const ok = await pay(p, { paymentTreatmentType: "أطراف صناعية" });
      same("٥٦. **دفعةُ أطرافٍ لمريضِ أطراف تمرّ**", ok.status, 201);
      const [row] = await q(
        `SELECT payment_treatment_type AS t FROM payments WHERE patient_id=$1`, [p]);
      same("   (ووسمُها محفوظٌ كما وصل)", row.t, "أطراف صناعية");
    }
    {
      //  ② **مريضُ علاجٍ طبيعي بوسم أطراف — يُردّ**. هذا هو الحارس.
      const [pt] = await q(
        `INSERT INTO patients (name, phone, referral_source, age, height, weight,
           medical_condition, branch_id, is_amputee, is_medical_support,
           total_cost, patient_classification)
         VALUES ($1,'07701234567',$2,'35','168','70','ألم ظهر',1,false,false,
                 500000,'new') RETURNING id`, [`${MARK} علاج طبيعي`, MARK]);
      await mkCase(pt.id, "physiotherapy");
      const bad = await pay(pt.id, { paymentTreatmentType: "أطراف صناعية" });
      same("٥٧. **ووسمُ أطرافٍ لمريضٍ لا أطرافَ له يُردّ ٤٠٠**", bad.status, 400);
      check(String(bad.body?.message ?? "").includes("أطراف صناعية"),
        "   (برسالةٍ تسمّي الحالة الناقصة)", JSON.stringify(bad.body));
      same("٥٨. **ولا دفعةَ كُتبت**",
        (await q(`SELECT count(*)::int AS n FROM payments WHERE patient_id=$1`, [pt.id]))[0].n, 0);
      //  ③ **والعلاجُ الطبيعي لا يُمَسّ** — منطقُ جلساته كما هو.
      const ok = await pay(pt.id, { paymentTreatmentType: "روبوت", sessionCount: 3 });
      same("٥٩. **ودفعةُ العلاج الطبيعي تمرّ بلا تغيير**", ok.status, 201);
      const [row] = await q(
        `SELECT payment_treatment_type AS t, session_count::int AS n
           FROM payments WHERE patient_id=$1`, [pt.id]);
      same("   (بنوعها وعدد جلساتها)", [row.t, row.n], ["روبوت", 3]);
      //  ④ **ووسمُ مساندٍ لمَن لا مسندَ له يُردّ كذلك** — القاعدةُ للنوعين.
      same("٦٠. **ووسمُ المساند كذلك**",
        (await pay(pt.id, { paymentTreatmentType: "مساند طبية" })).status, 400);
    }
    {
      //  ⑤ **وصاحبُ الحالتين يمرّ بأيّهما اختار** — الغموضُ يُسأل لا يُمنَع.
      const p = await mkPatient("أطراف ومساند", { support: true });
      await mkCase(p);
      await mkCase(p, "medical_support");
      await q(`UPDATE patients SET total_cost = 900000 WHERE id=$1`, [p]);
      same("٦١. **وصاحبُ الحالتين يمرّ بالأطراف**",
        (await pay(p, { paymentTreatmentType: "أطراف صناعية" })).status, 201);
      same("٦٢. **وبالمساند كذلك**",
        (await pay(p, { paymentTreatmentType: "مساند طبية" })).status, 201);
      const rows = await q(
        `SELECT payment_treatment_type AS t FROM payments WHERE patient_id=$1 ORDER BY id`, [p]);
      same("   (وكلٌّ بوسمه هو — لا خلط)",
        rows.map((r: any) => r.t), ["أطراف صناعية", "مساند طبية"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و. **بياناتٌ لا يُصنَع جهازٌ بدونها** — والخادمُ هو الحارس
    //
    //  العمرُ والطولُ والوزن ليست حقولاً إدارية: الطرفُ يُصنَع عليها،
    //  ومريضُ البتر يزيد تعريفَ بترِه **منظَّماً** — نصٌّ حرٌّ لا يُقرأ في
    //  أمر التصنيع. والنموذجُ يُبرزها، لكن نافذةً قديمةً بقيمةٍ افتراضية
    //  كانت ستمرّ لولا فحصُ الخادم.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. بيانات المريض الإلزامية ──");
    const NEW_PATIENT = {
      phone: "07701234567", referralSource: MARK, age: "40", height: "172", weight: "78",
      medicalCondition: "بتر", branchId: 1, patientClassification: "new",
    };
    const create = (extra: any) =>
      http("POST", "/api/patients", S.reception,
        { ...NEW_PATIENT, name: `${MARK} ${extra.name ?? "جديد"}`, ...extra });
    {
      const ok = await create({ name: "مكتمل", isAmputee: false });
      check(ok.status === 200 || ok.status === 201,
        "٦٤. **ملفٌّ مكتملُ المقاسات يُقبل**", `${ok.status} ${JSON.stringify(ok.body)}`);
      for (const [label, patch] of [
        ["بلا عمر", { age: "" }], ["بلا طول", { height: "" }], ["بلا وزن", { weight: "" }],
      ] as any[]) {
        const bad = await create({ name: label, isAmputee: false, ...patch });
        same(`٦٥. **و${label} يُردّ ٤٠٠**`, bad.status, 400);
      }
      //  **والصفرُ ليس قيمة**: «٠ كغم» ليست وزناً بل حقلٌ لم يُملأ.
      same("٦٦. **والصفرُ ليس وزناً**",
        (await create({ name: "وزنٌ صفر", isAmputee: false, weight: "0" })).status, 400);
      //  ولا شيءَ كُتب من المردودات.
      same("٦٧. **ولا ملفَّ كُتب من المردودة**",
        (await q(`SELECT count(*)::int AS n FROM patients
                   WHERE referral_source = $1 AND name = ANY($2::text[])`,
          [MARK, ["بلا عمر", "بلا طول", "بلا وزن", "وزنٌ صفر"].map((s) => `${MARK} ${s}`)],
        ))[0].n, 0);
    }
    {
      //  **ومريضُ البتر يزيد تعريفَ بترِه منظَّماً**.
      const bad = await create({ name: "مبتورٌ بلا تعريف", isAmputee: true });
      same("٦٨. **ومبتورٌ بلا تعريفِ بترٍ يُردّ**", bad.status, 400);
      const free = await create({
        name: "مبتورٌ بنصٍّ حرّ", isAmputee: true, amputationSite: "مبتور من الرجل",
      });
      same("٦٩. **ونصٌّ حرٌّ لا يفهمه الباني يُردّ**", free.status, 400);
      const ok = await create({
        name: "مبتورٌ معرَّف", isAmputee: true,
        amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة",
      });
      check(ok.status === 200 || ok.status === 201,
        "٧٠. **والتعريفُ المنظَّم يمرّ**", `${ok.status} ${JSON.stringify(ok.body)}`);
    }
    {
      // ══ **الملفُّ القديم: يُصحَّح إدارياً، ولا يدخل دورةً ناقصاً** ══════
      //  **قرارُ المالك** بعد المراجعة: إجبارُ الموظّف على وزنٍ لا يملكه
      //  لحظتَها كي يصحّح رقمَ هاتفٍ يوقف عملاً مشروعاً بلا مقابل —
      //  ونتيجتُه المعتادة أن يُخترَع رقم، وهو أسوأ من الفراغ لأنه يُقرأ
      //  قياساً. فاللحظةُ التي يجب أن يكتمل فيها الملفّ هي **دخولُه دورةَ
      //  تصنيعٍ جديدة**، لا كلُّ حفظٍ يمرّ عليه.
      const legacy = await q<{ id: number }>(
        `INSERT INTO patients (name, phone, referral_source, age, medical_condition,
           branch_id, is_amputee, total_cost, patient_classification)
         VALUES ($1,'07701234567',$2,'40','بتر',1,true,0,'past') RETURNING id`,
        [`${MARK} قديمٌ ناقص`, MARK]);
      const lid = legacy[0].id;
      await mkCase(lid);

      //  ① **التصحيحُ الإداريُّ المحض يمرّ** — هاتفٌ وتصنيفٌ وعنوان.
      const admin1 = await http("PUT", `/api/patients/${lid}`, S.manager,
        { name: `${MARK} قديمٌ ناقص`, phone: "07709998877", branchId: 1 });
      same("٧١. **تصحيحُ هاتفٍ على ملفٍّ قديمٍ ناقص يمرّ**", admin1.status, 200);
      same("   **ونُفِّذ فعلاً**",
        (await q(`SELECT phone FROM patients WHERE id=$1`, [lid]))[0].phone, "07709998877");
      same("٧٢. **والتصنيفُ كذلك**",
        (await http("PUT", `/api/patients/${lid}`, S.manager,
          { patientClassification: "new" })).status, 200);
      same("   والعنوانُ كذلك",
        (await http("PUT", `/api/patients/${lid}`, S.manager,
          { address: "عنوانٌ ما" })).status, 200);
      //  **ولا يُخمَّن الناقص**: الملفُّ ما زال بلا طولٍ ولا وزن.
      same("٧٣. **ولا يُخترَع له قياسٌ في الطريق**",
        (await q(`SELECT height, weight FROM patients WHERE id=$1`, [lid]))[0],
        { height: null, weight: null });

      //  ② **والنموذجُ الكامل كما يرسله «تعديل مريض»** — كلُّ الحقول حاضرة
      //  والهاتفُ وحده مختلف. وهذه هي الحالةُ الحقيقية: الشاشةُ ترسل الكائن
      //  كاملاً في كلّ حفظ، فقراءةُ **وجود المفاتيح** كانت تردّ كلَّ تصحيحٍ
      //  إداريّ على كلّ ملفٍّ قديم — أي القاعدةَ التي وُضعت لإلغائها بعينها.
      const fullForm = (patch: any = {}) => ({
        name: `${MARK} قديمٌ ناقص`, phone: "07709998877", branchId: 1,
        age: "40", height: "", weight: "", isAmputee: true, amputationSite: "",
        medicalCondition: "بتر", referralSource: MARK, patientClassification: "new",
        address: "عنوانٌ ما", ...patch,
      });
      const fullPhone = await http("PUT", `/api/patients/${lid}`, S.manager,
        fullForm({ phone: "07705554433" }));
      same("٧٤. **نموذجٌ كامل والهاتفُ وحده مختلف ⟶ يمرّ**", fullPhone.status, 200);
      same("   **ونُفِّذ فعلاً**",
        (await q(`SELECT phone FROM patients WHERE id=$1`, [lid]))[0].phone, "07705554433");
      //  **والناقصُ ما زال ناقصاً**: النموذجُ يرسل «» والمخزَّن كان `null`،
      //  وكلاهما «لا قيمة» بنصّ القاعدة — المهمّ ألّا يُخترَع رقم.
      const stillMissing = (await q(
        `SELECT COALESCE(NULLIF(height,''), NULL) AS h, COALESCE(NULLIF(weight,''), NULL) AS w
           FROM patients WHERE id=$1`, [lid]))[0];
      same("   **والناقصُ ما زال ناقصاً — لا يُخترَع رقم**",
        stillMissing, { h: null, w: null });

      //  ③ **ولمسُ حقلٍ إلزاميّ في النموذج نفسه يُلزم بإكمالها**.
      const fullHeight = await http("PUT", `/api/patients/${lid}`, S.manager,
        fullForm({ phone: "07705554433", height: "165" }));
      same("٧٥. **والنموذجُ نفسُه بطولٍ جديد يُردّ حتى يكتمل**", fullHeight.status, 400);
      check(Array.isArray(fullHeight.body?.missing)
        && fullHeight.body.missing.includes("weight"),
        "   **ويسمّي الناقصَ الحقيقيّ**", JSON.stringify(fullHeight.body?.missing));
      same("   ولم يُكتب الطولُ المرفوض",
        (await q(`SELECT NULLIF(height,'') AS h FROM patients WHERE id=$1`, [lid]))[0].h, null);
      //  ونصفُ الحالة من نداءٍ ضيّق يُردّ كذلك.
      const half = await http("PUT", `/api/patients/${lid}`, S.manager,
        { height: "165" });
      same("٧٦. **وإدخالُ الطول وحده يُردّ** — نصفُ الحالة لا يُحفَظ", half.status, 400);

      //  ③ **ولا دورةَ تصنيعٍ جديدة بملفٍّ ناقص** — وهذه هي البوّابة.
      const blocked = await http("POST", `/api/patients/${lid}/device-episodes`,
        S.reception, { servicePath: "exam", serviceType: "prosthetic", requestedItem: "knee" });
      same("٧٧. **وطلبُ جزءٍ جديد يُردّ حتى يكتمل الملفّ**", blocked.status, 400);
      check(String(blocked.body?.error ?? "").includes("أكمِل ملفّ المريض"),
        "   (برسالةٍ تدلّ على ما يجب فعله)", JSON.stringify(blocked.body));
      check(Array.isArray(blocked.body?.missing) && blocked.body.missing.length > 0,
        "   **وتسمّي الناقصَ حقلاً حقلاً** — فتعرضه الواجهة",
        JSON.stringify(blocked.body?.missing));
      same("٧٨. **ولا حلقةَ فُتحت**",
        (await q(`SELECT count(*)::int AS n FROM patient_device_episodes WHERE patient_id=$1`,
          [lid]))[0].n, 0);

      //  ④ **والإكمالُ يفتح البابَ** — بلا ترحيلٍ يخترع أرقاماً.
      const done = await http("PUT", `/api/patients/${lid}`, S.manager, {
        height: "165", weight: "62", age: "40",
        amputationSite: "احادي - طرف سفلي - يسار - فوق الركبة",
      });
      same("٧٩. **والإكمالُ في نداءٍ واحد يمرّ**", done.status, 200);
      same("٨٠. **وبعده يُفتح الطلب**",
        (await http("POST", `/api/patients/${lid}/device-episodes`, S.reception,
          { servicePath: "exam", serviceType: "prosthetic", requestedItem: "knee" })).status, 201);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح. **إضافةُ حالة أطراف لا تُنتج ملفّاً نصفَ مكتمل**
    //
    //  «إضافة نوع حالة» كانت ترفع `is_amputee` **بلا موقع بتر** — فيُولَد
    //  ملفٌّ مبتورٌ بلا تعريفِ بتره، ويُترك إكمالُه لتعديلٍ لاحقٍ لا يقع.
    //  ثم يصطدم به الطبيبُ في المعاينة والخبيرُ في القياس.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. إضافة حالة الأطراف ──");
    {
      //  مريضُ علاجٍ طبيعي **بلا بتر ولا مقاسات كاملة** — يُضاف له الأطراف.
      const [p] = await q<{ id: number }>(
        `INSERT INTO patients (name, phone, referral_source, age, medical_condition,
           branch_id, is_amputee, is_physiotherapy, total_cost, patient_classification)
         VALUES ($1,'07701234567',$2,'35','ألم',1,false,true,0,'new') RETURNING id`,
        [`${MARK} يضيف أطرافاً`, MARK]);
      const add = (body: any) =>
        http("POST", `/api/patients/${p.id}/add-case-type`, S.reception, body);

      const noSite = await add({ caseType: "amputee" });
      same("٨١. **إضافةُ أطرافٍ بلا تعريفِ بترٍ تُردّ**", noSite.status, 400);
      check(String(noSite.body?.message ?? "").includes("تعريف البتر"),
        "   (برسالةٍ تقول ما يلزم)", JSON.stringify(noSite.body));
      same("   **ولم يُرفَع العَلَم**",
        (await q(`SELECT is_amputee FROM patients WHERE id=$1`, [p.id]))[0].is_amputee, false);

      //  ونصٌّ حرٌّ لا يفهمه الباني يُردّ كذلك — لا بديلَ عن المنظَّم.
      same("٨٢. **ونصٌّ حرٌّ يُردّ**",
        (await add({ caseType: "amputee", amputationSite: "مبتور من الرجل" })).status, 400);

      //  والمقاساتُ الناقصة تُطلَب **في المسار نفسه** لا في تعديلٍ لاحق.
      const noMeasures = await add({
        caseType: "amputee", amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة",
      });
      same("٨٣. **وبلا طولٍ ووزنٍ تُردّ أيضاً**", noMeasures.status, 400);
      same("   **ولم يُرفَع العَلَم بعد**",
        (await q(`SELECT is_amputee FROM patients WHERE id=$1`, [p.id]))[0].is_amputee, false);

      //  **والمسارُ الواحد يجمعها كلَّها** فيُفتح الخيطُ مكتملاً.
      const ok = await add({
        caseType: "amputee", amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة",
        height: "170", weight: "68",
      });
      same("٨٤. **وبها جميعاً تُفتَح الحالةُ مكتملة**", ok.status, 200);
      const after = (await q(
        `SELECT is_amputee, height, weight, amputation_site FROM patients WHERE id=$1`,
        [p.id]))[0];
      same("   **والملفُّ مكتملٌ لحظةَ فتحه** — لا نصفَ حالةٍ يُحفَظ",
        [after.is_amputee, after.height, after.weight,
          String(after.amputation_site).includes("تحت الركبة")],
        [true, "170", "68", true]);
      //  **ويدخل الدورةَ فوراً** — لأن ما يلزمها اكتمل في مسارها.
      same("   ويبدأ طلبَ جهازٍ فوراً بلا عائق",
        (await http("POST", `/api/patients/${p.id}/device-episodes`, S.reception,
          { servicePath: "exam", serviceType: "prosthetic", requestedItem: "full_device" })).status, 201);
    }
    {
      //  **والمساندُ والعلاجُ الطبيعي لا يُسألان عن بتر إطلاقاً.**
      const [p] = await q<{ id: number }>(
        `INSERT INTO patients (name, phone, referral_source, age, medical_condition,
           branch_id, is_amputee, total_cost, patient_classification)
         VALUES ($1,'07701234567',$2,'50','ألم',1,false,0,'new') RETURNING id`,
        [`${MARK} يضيف مسنداً`, MARK]);
      same("٨٥. **وإضافةُ مسندٍ تمرّ بلا تعريفِ بتر**",
        (await http("POST", `/api/patients/${p.id}/add-case-type`, S.reception,
          { caseType: "medical_support" })).status, 200);
      //  **وحلقتُه محايدةٌ في القاعدة، مسمّاةٌ في الشاشة.**
      const ep = await http("POST", `/api/patients/${p.id}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "medical_support" });
      same("٨٦. **وحلقةُ المسند تُفتَح**", ep.status, 201);
      const row = await epRow(ep.body?.id);
      same("٨٧. **وقيمتُها محايدة — لا «طرف» على مسند**",
        [row?.requested_item, row?.component], ["full_device", null]);
      const [rev] = await q(
        `SELECT reception_note FROM medical_review_requests
          WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [p.id]);
      same("٨٨. **والطبيبُ يقرأ «مسند طبي كامل»** — لا «طرف صناعي كامل»",
        String(rev?.reception_note ?? "").startsWith("المطلوب: مسند طبي كامل"), true);
      //  **وجزءُ طرفٍ عليه يُردّ** — لا يُصحَّح إلى «كامل».
      const bad = await http("POST", `/api/patients/${p.id}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "medical_support", requestedItem: "knee" });
      same("٨٩. **وطلبُ ركبةٍ على مسندٍ يُردّ**", bad.status, 400);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز. **والحذفُ يبقى ممكناً** — القاعدةُ الملزمة في CLAUDE.md
    //
    //  ترحيلُ ٠٦٠ **أعمدةٌ لا جداول**، فلا مفتاحَ جديداً إلى `patients`
    //  ولا سطرَ يُضاف إلى الكاسكيد. لكنّ «لا يحتاج» دعوى تُختبَر لا تُقال:
    //  حادثةُ ٢٠٢٦-٠٧-٢٦ كسرت الحذفَ لكلّ المستخدمين بمن فيهم المسؤول.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. الحذف بعد الترحيل ──");
    {
      const p = await mkPatient("للحذف");
      const c = await mkCase(p);
      const ep = await mkDeliveredEpisode(p, c);
      await mkExam(p, c, ep);
      await http("POST", `/api/patients/${p}/device-episodes`, S.reception,
        { servicePath: "exam", serviceType: "prosthetic", requestedItem: "knee" });
      const mv = await http("POST", "/api/no-exam/maintenance", S.reception,
        { patientId: p, expertUserId: EXPERT, originalPrice: 30000, discountAmount: 0,
          paidNow: 0, maintenanceComponent: "adapter", deviceEpisodeId: ep });
      check(mv.status === 201, "(الصيانةُ فُتحت قبل اختبار الحذف)", JSON.stringify(mv.body));
      const before = await moneyOf(p);
      check(before.orders === 1 && before.cost_entries === 1,
        "(مريضٌ بحلقتين وجزءٍ مطلوب وأمرِ صيانةٍ بجزئه)", JSON.stringify(before));
      //  **الحذفُ العاديُّ صار سلّةً** (ترحيل ٠٦٨): والكاسكيدُ الهادمُ
      //  بابُه الوحيد «حذف نهائي» من داخل السلّة. فتُنفَّذ الخطوتان معاً
      //  كي تبقى **تغطيةُ الكاسكيد كما كانت** بحرفها.
      const killer = { ...S.manager, isAdmin: true, role: "admin",
        permissions: { ...S.manager.permissions, canDeletePatients: true } };
      await http("DELETE", `/api/patients/${p}`, killer, { reason: "اختبار الكاسكيد" });
      //  **والحذفُ النهائيُّ مقفلٌ حتى تنقضي مهلةُ الاستعادة** (المراجعة
      //  الأخيرة، القسم أ): فتُدفَع المهلةُ إلى الماضي كي يختبر هذا القسمُ
      //  الكاسكيدَ نفسَه لا بوّابةَ الانتظار.
      await q(`UPDATE patients SET deleted_at = NOW() - interval '40 days',
                 restore_until = NOW() - interval '10 days' WHERE id=$1`, [p]);
      const del = await http("POST", `/api/patient-trash/${p}/purge`, killer,
        { reason: "اختبار الكاسكيد" });
      check(del.status === 200 || del.status === 204,
        "٩٠. **حذفُ مريضٍ يحمل الأعمدة الجديدة ينجح**",
        `${del.status} ${JSON.stringify(del.body)}`);
      same("   ولا صفَّ حلقةٍ يتيماً بقي",
        (await q(`SELECT count(*)::int AS n FROM patient_device_episodes WHERE patient_id=$1`,
          [p]))[0].n, 0);
      same("   ولا أمرَ تصنيعٍ ولا قيدَ كلفة",
        [(await q(`SELECT count(*)::int AS n FROM prosthetic_work_orders WHERE patient_id=$1`, [p]))[0].n,
          (await q(`SELECT count(*)::int AS n FROM cost_entries WHERE patient_id=$1`, [p]))[0].n],
        [0, 0]);
    }

    //  ── والقائمةُ مشتركةٌ بين المسارين حرفاً ──
    same("٩١. **وقائمةُ الأجزاء واحدةٌ للشراء والصيانة**",
      [COMPONENT_LABELS.knee, COMPONENT_LABELS.foot,
        COMPONENT_LABELS.socket, COMPONENT_LABELS.tube],
      ["الركبة", "القدم", "القالب", "التيوب"]);
    void mfg;
  } finally {
    await cleanup();
    //  سطورُ التدقيق تشير إلى المستخدم — تُمسح قبله، وإلّا رُدّ الحذفُ بمفتاح.
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[MANAGER, DOCTOR, EXPERT, RECEPTION]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[MANAGER, DOCTOR, EXPERT, RECEPTION]]);
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
