// **عقدُ جواب «هل تم إرجاع المبلغ للمريض؟»** — يُرسَل مع الإلغاء الكامل،
// ويردّ الخادمُ التنفيذَ إن لزم ولم يصل. `npm run test:reversal-refund-contract`.
//
// ══ ما يُختبَر هنا — **العقدُ وحدَه** ═══════════════════════════════════════
// «إلغاء العملية بالكامل» يعكس البيعَ **ولا يمسّ الدفعات** (قرارٌ قائم منذ
// ٠٦٤: نقدٌ قُبض واقعةٌ لا تُعاد كتابتُها)، فيبقى للمريض رصيدٌ موسومٌ
// `requires_financial_settlement`. والسؤالُ يُطرح على مَن يعرف الجواب لحظتَها.
//
// **وهذه المرحلةُ تسأل وتُرسِل وتحرس — ولا تسجّل ولا تحرّك ديناراً**:
//   ① الشاشةُ ترسل الجوابَ مع **الإلغاء الكامل وحدَه** (عقدُ الشاشة في
//      `npm run test:correction-ux` — لا يُكرَّر هنا).
//   ② **والخادمُ يردّ ٤٠٠** إن كان على العملية مبلغٌ مقبوضٌ ولم يصل جوابٌ
//      صحيح — **قبل أن يكتب حرفاً**.
//   ③ **ولا أثرَ ماليّاً للجواب نفسِه**: «نعم» و«لا» تُنتجان النتيجةَ نفسَها
//      بالضبط — لا ردَّ مال، ولا دفعةَ تُمَسّ، ولا يُخزَّن الجوابُ في صفّ.
//
// **ولا حارسَ قائمٌ ضعُف**: الصلاحيةُ (٤٠٣) والختمُ البائت (٤٠٩) يبقيان
// أسبقَ منه — فلا يتحوّل رفضٌ معروفٌ إلى ٤٠٠ جديدة.
//
// يُشغَّل على Postgres محلّي: DATABASE_URL=... npx tsx server/reversal_refund_contract.test.ts

import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import crypto from "node:crypto";
import { registerRoutes } from "./routes";
import { REFUND_ANSWER_REQUIRED_ERROR } from "@shared/administrative_reversal";

const PORT = 6971;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-عقد-إرجاع-المبلغ";
const ADMIN = 99580, RECV = 99581, DOC = 99582, EXPERT = 99583, BM2 = 99584;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (cond) console.log(`✅  ${msg}`);
  else { failures++; console.log(`❌ FAIL  ${msg}${detail ? `\n      ${detail}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  const g = JSON.stringify(got), e = JSON.stringify(expected);
  check(g === e, msg, g === e ? "" : `expected: ${e}\n      got:      ${g}`);
}

const perms = { canViewPatients: true, canAddPatients: true, canEditPatients: true };
const S = {
  admin: { userId: ADMIN, userName: "المسؤول", branchId: 1, isAdmin: true, role: "admin", accessibleBranches: [1, 2], permissions: perms },
  recv: { userId: RECV, userName: "استعلامات", branchId: 1, isAdmin: false, role: "reception", accessibleBranches: [1], permissions: perms },
  doc: { userId: DOC, userName: "د. المعاين", branchId: 1, isAdmin: false, role: "doctor", accessibleBranches: [1], permissions: perms },
  bm2: { userId: BM2, userName: "مدير ذي قار", branchId: 2, isAdmin: false, role: "branch_manager", accessibleBranches: [2], permissions: perms },
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
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** عمليةُ أطرافٍ كاملة: مريضٌ ⟶ طلبُ جهاز ⟶ معاينةٌ موقّعة ⟶ بيعٌ وأمرُ تصنيع. */
async function soldOperation(label: string, price = 1_000_000, branch = 1) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة', $3, true,false,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branch]);
  const [c] = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,'prosthetic',0,'manual','active') RETURNING id`, [p.id, branch]);
  const staff = branch === 1 ? S.recv : { ...S.recv, branchId: 2, accessibleBranches: [2] };
  const epRes = await http("POST", `/api/patients/${p.id}/device-episodes`, staff,
    { serviceType: "prosthetic", servicePath: "exam" });
  if (epRes.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${JSON.stringify(epRes.body)}`);
  const episodeId = Number(epRes.body.id);
  const exRes = await http("POST", `/api/medical/patients/${p.id}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(), caseType: "prosthetic",
    diagnosis: "معاينة تجريبية", prescription: {}, deviceEpisodeId: episodeId,
  });
  if (exRes.status >= 300) throw new Error(`فشل التوقيع: ${JSON.stringify(exRes.body)}`);
  const [fu] = await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE medical_exam_id=$1`, [Number(exRes.body.id)]);
  const sale = await http("POST", `/api/followups/${fu.id}/complete-sale`, staff,
    { originalPrice: price, discountAmount: 0, expertUserId: EXPERT });
  if (sale.status >= 300) throw new Error(`فشل البيع: ${JSON.stringify(sale.body)}`);
  return { patientId: p.id, caseId: c.id, episodeId, followupId: Number(fu.id),
    examId: Number(exRes.body.id) };
}

/** دفعةٌ حقيقيةٌ على الحلقة — فالتصحيحُ يواجه نقداً قُبض لا فرضاً. */
async function pay(d: { patientId: number; caseId: number; episodeId: number }, amount: number) {
  await q(`INSERT INTO payments (patient_id, branch_id, amount, device_episode_id, case_id, notes)
           VALUES ($1,1,$2,$3,$4,'دفعة تجريبية')`,
    [d.patientId, amount, d.episodeId, d.caseId]);
}

const preview = (followupId: number, session: any = S.admin) =>
  http("POST", "/api/admin/operation-reversal/preview", session, { followupId });
const executeRaw = (body: any, session: any = S.admin) =>
  http("POST", "/api/admin/operation-reversal/execute", session, body);

/** ينفّذ بالأثر الحيّ — كما تفعل الشاشةُ بالضبط. */
async function executeFull(followupId: number, extra: any = {}, session: any = S.admin) {
  const pv = await preview(followupId);
  return await executeRaw({
    followupId, intent: "cancel_operation", reasonNote: "سببٌ تجريبيّ",
    stateStamp: pv.body?.stateStamp, ...extra,
  }, session);
}

/** بصمةُ كلّ ما قد يلمسه تصحيحٌ أو مال — «صفرُ كتابة» يُقاس لا يُدّعى. */
async function snapshot(patientId: number) {
  const ep = await q(`SELECT id,status,agreed_cost FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const fu = await q(`SELECT id,status,converted_work_order_id,approved_price FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const wo = await q(`SELECT id,status,purpose FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const ce = await q(`SELECT id,amount,source FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const pay = await q(`SELECT id,amount,notes FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const jl = await q(`SELECT id,debit,credit FROM journal_lines WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const pt = await q(`SELECT total_cost FROM patients WHERE id=$1`, [patientId]);
  const pc = await q(`SELECT id,cost,status FROM patient_cases WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const rev = await q(`SELECT id FROM administrative_operation_reversals WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const can = await q(`SELECT exam_id FROM medical_exam_cancellations
                        WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id=$1) ORDER BY exam_id`, [patientId]);
  const aud = await q(`SELECT count(*)::int n FROM audit_log
                        WHERE entity_type='administrative_operation_reversal'`, []);
  return JSON.stringify({ ep, fu, wo, ce, pay, jl, pt, pc, rev, can, aud });
}

/** الأثرُ الماليُّ والتشغيليُّ **بلا معرّفات** — ليُقارَن مريضٌ بمريض. */
async function outcomeShape(patientId: number) {
  const [rev] = await q(`SELECT mode, reason_code, reason_note, financial_delta,
                                requires_financial_settlement, preserved_paid_amount
                           FROM administrative_operation_reversals WHERE patient_id=$1`, [patientId]);
  const pay = await q(`SELECT amount, notes FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const ce = await q(`SELECT amount, source FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const [pt] = await q(`SELECT total_cost FROM patients WHERE id=$1`, [patientId]);
  const [fu] = await q(`SELECT status FROM post_exam_followups WHERE patient_id=$1`, [patientId]);
  const [ep] = await q(`SELECT status, agreed_cost FROM patient_device_episodes WHERE patient_id=$1`, [patientId]);
  const [wo] = await q(`SELECT status FROM prosthetic_work_orders WHERE patient_id=$1`, [patientId]);
  return { rev, pay, ce, total: pt?.total_cost, fu: fu?.status, ep, wo: wo?.status };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const stmt of [
    `DELETE FROM audit_log WHERE user_id = ANY(ARRAY[${ADMIN},${RECV},${DOC},${BM2}])`,
    `DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_events WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM journal_lines WHERE patient_id IN (${ids})`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
    `DELETE FROM patient_code_aliases a WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`,
  ]) { try { await q(stmt); } catch { /* جدولٌ غيرُ موجودٍ في هذه النسخة */ } }
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec, br] of [
    [ADMIN, "admin", "المسؤول", "[]", 1],
    [RECV, "reception", "استعلامات", "[]", 1],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support"]', 1],
    [EXPERT, "prosthetics_expert", "الخبير", "[]", 1],
    [BM2, "branch_manager", "مدير ذي قار", "[]", 2],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$6,$7::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `rfc_u${id}`, name, role, spec, br, JSON.stringify([br])]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw
      ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));

  try {
    // ══ أ) **الصمتُ يُردّ — وصفرُ كتابة** ══════════════════════════════════
    console.log("\n── أ) مبلغٌ مقبوضٌ وإلغاءٌ كامل بلا جواب ──");
    {
      const d = await soldOperation("أ", 1_000_000);
      await pay(d, 300_000);
      const pv = await preview(d.followupId);
      same("١. (الإعدادُ: المعاينةُ المسبقة تقرأ المبلغَ المقبوض)",
        pv.body?.paidAmount, 300_000);

      const before = await snapshot(d.patientId);
      const r = await executeFull(d.followupId);
      same("٢. **التنفيذُ بلا جواب يُردّ ٤٠٠**", r.status, 400);
      same("٣. **بالرسالة المشتركة حرفياً** — لا صياغةً ثانية تنحرف",
        r.body?.error, REFUND_ANSWER_REQUIRED_ERROR);
      same("٤. **وصفرُ كتابة** — البصمةُ مطابقةٌ بايتاً (حلقة · متابعة · أمر"
        + " · قيود · دفعات · يومية · مجموع · صفُّ تصحيح · شاهدةُ إلغاء · تدقيق)",
        await snapshot(d.patientId), before);
    }

    // ══ ب) **الجوابُ الفاسد ليس جواباً** ═══════════════════════════════════
    console.log("\n── ب) قيمٌ لا تصلح جواباً ──");
    {
      const d = await soldOperation("ب", 900_000);
      await pay(d, 250_000);
      const before = await snapshot(d.patientId);
      for (const bad of ["maybe", "", "YES", " yes ", "نعم", 1, 0, true, false, null, {}, ["yes"]]) {
        const r = await executeFull(d.followupId, { refundAnswer: bad });
        same(`٥. «${JSON.stringify(bad) ?? String(bad)}» ⟶ ٤٠٠`,
          [r.status, r.body?.error], [400, REFUND_ANSWER_REQUIRED_ERROR]);
      }
      same("٦. **وبعد اثنتَي عشرة محاولةً فاسدة: صفرُ كتابة**",
        await snapshot(d.patientId), before);
    }

    // ══ ج) **«نعم» و«لا» كلاهما جوابٌ صحيح يمضي** ══════════════════════════
    //  الخادمُ يحرس **وجودَ قرارٍ** لا مضمونَه: المضيُّ مع رصيدٍ لم يُردّ
    //  قرارٌ مشروع (يبقى موسوماً `requires_financial_settlement`).
    console.log("\n── ج) «نعم» و«لا» — القرارُ يمضي، والأثرُ واحد ──");
    {
      const yes = await soldOperation("ج-نعم", 1_000_000);
      await pay(yes, 300_000);
      const rYes = await executeFull(yes.followupId, { refundAnswer: "yes" });
      same("٧. **«نعم» ⟶ ينفَّذ**", rYes.status, 200);

      const no = await soldOperation("ج-لا", 1_000_000);
      await pay(no, 300_000);
      const rNo = await executeFull(no.followupId, { refundAnswer: "no" });
      same("٨. **و«لا» ⟶ ينفَّذ أيضاً** — الحارسُ على الصمت لا على المضمون",
        rNo.status, 200);

      //  **والأثرُ واحدٌ حرفياً** — وهذا هو إثباتُ «لا يُسجَّل ردُّ مال بعد».
      same("٩. **والأثرُ المالي والتشغيليّ واحدٌ بالضبط في الحالتين**"
        + " — فالجوابُ لا يحرّك ديناراً ولا يُخزَّن في صفّ",
        await outcomeShape(yes.patientId), await outcomeShape(no.patientId));

      const s = await outcomeShape(no.patientId);
      same("١٠. **والدفعةُ باقيةٌ بحرفها** — لا ردَّ اختُرع ولا دفعةَ سالبة",
        s.pay, [{ amount: 300_000, notes: "دفعة تجريبية" }]);
      same("١١. **والرصيدُ موسومٌ «يحتاج تسوية»** كما كان قبل هذه المرحلة",
        [s.rev?.requires_financial_settlement, s.rev?.preserved_paid_amount],
        [true, 300_000]);
      same("١٢. **ولا قيدَ ردٍّ** — قيدُ التصحيح وحدَه",
        (s.ce as any[]).filter((e) => e.source === "administrative_reversal").length, 1);
    }

    // ══ د) **بلا مبلغٍ لا سؤال** — العقدُ لا يعترض طريقاً نظيفاً ═══════════
    console.log("\n── د) عمليةٌ بلا دفعات ──");
    {
      const d = await soldOperation("د", 700_000);
      const pv = await preview(d.followupId);
      same("١٣. (الإعدادُ: لا مبلغَ مقبوض)", pv.body?.paidAmount, 0);
      const r = await executeFull(d.followupId);
      same("١٤. **ينفَّذ بلا حقلِ جوابٍ أصلاً** — لا سؤالَ بلا موضوع", r.status, 200);
    }

    // ══ هـ) **«التراجعُ عن الشراء» لا يُسأل ولو كان هناك مبلغ** ════════════
    //  الطلبُ يبقى حيّاً ليُشترى صحيحاً، والمالُ يُستعمل فيه — فلا رصيدَ
    //  معلَّقٌ يُسأل عن ردّه.
    console.log("\n── هـ) تراجعٌ عن الشراء فقط ──");
    {
      const d = await soldOperation("هـ", 1_200_000);
      await pay(d, 400_000);
      const pv = await preview(d.followupId);
      same("١٥. (الإعدادُ: مبلغٌ مقبوضٌ فعلاً)", pv.body?.paidAmount, 400_000);
      const r = await executeRaw({
        followupId: d.followupId, intent: "purchase_mistake",
        reasonNote: "ضغطةٌ خاطئة", stateStamp: pv.body?.stateStamp,
      });
      same("١٦. **ينفَّذ بلا جواب** — الحقلُ للإلغاء الكامل وحدَه", r.status, 200);
    }

    // ══ و) **المبلغُ يُقرأ من القاعدة تحت القفل لا من جسم الطلب** ══════════
    console.log("\n── و) المبلغُ من القاعدة لا من الطلب ──");
    {
      //  (و.١) طلبٌ ملفَّق يدّعي أن لا مبلغَ — لا يُقرأ منه شيء.
      const d = await soldOperation("و-١", 1_000_000);
      await pay(d, 500_000);
      const r = await executeFull(d.followupId, { paidAmount: 0, requiresFinancialSettlement: false });
      same("١٧. **ادّعاءُ «لا مبلغ» في جسم الطلب لا يُقرأ** ⟶ ٤٠٠",
        [r.status, r.body?.error], [400, REFUND_ANSWER_REQUIRED_ERROR]);

      //  (و.٢) دفعةٌ تُقبَض **بعد** المعاينة المسبقة: الشاشةُ لم تسأل أصلاً.
      //   الختمُ البائت يردّها أوّلاً (حارسٌ قائمٌ لم يضعف)، وبأثرٍ محدَّثٍ
      //   يصير السؤالُ واجباً — فلا يمضي إلغاءٌ لم يُقرَّر فيه مصيرُ المال.
      const d2 = await soldOperation("و-٢", 1_000_000);
      const pvClean = await preview(d2.followupId);
      same("١٨. (المعاينةُ المسبقة قرأت صفراً — فالشاشةُ لم تسأل)",
        pvClean.body?.paidAmount, 0);
      await pay(d2, 150_000);
      const staleTry = await executeRaw({
        followupId: d2.followupId, intent: "cancel_operation",
        reasonNote: "بختمٍ قديم", stateStamp: pvClean.body?.stateStamp,
      });
      same("١٩. **والختمُ البائت يبقى أسبق (٤٠٩)** — لا يتحوّل حارسٌ قائمٌ إلى ٤٠٠",
        staleTry.status, 409);
      const fresh = await executeFull(d2.followupId);
      same("٢٠. **وبأثرٍ محدَّثٍ يُطلَب الجوابُ الذي لم تسأله الشاشةُ قطّ** ⟶ ٤٠٠",
        [fresh.status, fresh.body?.error], [400, REFUND_ANSWER_REQUIRED_ERROR]);
      same("٢١. **ثمّ يمضي بالجواب**",
        (await executeFull(d2.followupId, { refundAnswer: "no" })).status, 200);
    }

    // ══ ز) **الصلاحيةُ تسبق سؤالَ المال** — ولا تُسرَّب حالةُ مالٍ لمن لا يملك ══
    console.log("\n── ز) ترتيبُ الحُرّاس ──");
    {
      const d = await soldOperation("ز", 1_000_000);
      await pay(d, 200_000);
      const pv = await preview(d.followupId);
      for (const [who, session] of [["الطبيب", S.doc], ["الاستقبال", S.recv]] as any[]) {
        const r = await executeRaw({
          followupId: d.followupId, intent: "cancel_operation",
          reasonNote: "محاولة", stateStamp: pv.body?.stateStamp,
        }, session);
        same(`٢٢. ${who} ⟶ ٤٠٣ لا ٤٠٠ — الإذنُ أوّلاً`, r.status, 403);
      }
      const other = await executeRaw({
        followupId: d.followupId, intent: "cancel_operation",
        reasonNote: "محاولة", stateStamp: pv.body?.stateStamp,
      }, S.bm2);
      same("٢٣. **ومديرُ فرعٍ آخر ⟶ ٤٠٣**", other.status, 403);
      same("٢٤. **وسببُ التصحيح يبقى إلزامياً قبل كلّ شيء (٤٠٠)**",
        (await executeRaw({
          followupId: d.followupId, intent: "cancel_operation",
          reasonNote: "  ", stateStamp: pv.body?.stateStamp, refundAnswer: "yes",
        })).status, 400);
    }
  } finally {
    await cleanup();
    await q(`UPDATE system_users SET is_active=false WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV, DOC, EXPERT, BM2]]);
    httpServer.close();
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "🎉 كلُّ التأكيدات مرّت" : `❌ ${failures} تأكيداً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
