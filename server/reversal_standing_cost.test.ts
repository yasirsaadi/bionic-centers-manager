// عكسُ الكلفة في التصحيح الإداريّ — **المقدارُ القائم فعلاً، لا سعرُ البيع**.
// قاعدة محلّية: `npm run test:reversal-standing-cost`.
//
// ══ الواقعة ═══════════════════════════════════════════════════════════════
// جهازٌ بِيع بمليون، ثمّ **خُفِّض مجموعُ المريض إدارياً** من «تعديل مريض»
// إلى ٣٠٠ ألف (المسارُ الموثَّق في §4.h: «فصُحّح الرقمُ من شاشة تعديل
// المريض العامّة: تحرّك `patients.total_cost` وحدَه»). ثمّ أُلغيت العمليةُ
// إدارياً.
//
// وكان التصحيحُ يعكس **سعرَ البيع** (مليوناً) لا المقدارَ القائم (٣٠٠ ألفاً):
//   · `patients.total_cost` و`patient_cases.cost` يرتدّان بـ`GREATEST(0, …)`
//     فينقصان ٣٠٠ ألفاً فقط — وهو كلُّ ما كان هناك؛
//   · بينما `cost_entries` يكتب **−١,٠٠٠,٠٠٠** كاملةً.
// فينكسر ثابتُ الدفتر (§٤: «مجموع قيود المريض = `total_cost`») بفارق ٧٠٠
// ألف، ويصرخ إنذارُ `cost_ledger_mismatch` الدائم، ويقرأ المريضُ رصيداً
// وهميّاً لم يقع.
//
// ══ القاعدةُ التي يحرسها هذا الملفّ ═══════════════════════════════════════
// (أ) **مقدارُ العكس هو المقدارُ القائم فعلاً لهذه العملية** — لا سعرُ البيع.
// (ب) **والمقدارُ نفسُه في كلّ أثرٍ ماليّ**: مجموعُ المريض · كلفةُ الحالة ·
//     قيدُ الكلفة · `financial_delta` · حدثُ المتابعة · وردُّ النقطة.
// (ج) **ولا قيدَ سالبٌ أكبرُ ممّا نُقص فعلاً** — أبداً، في أيّ مسار.
// (د) **ولا ارتداد**: العمليةُ بلا تخفيضٍ سابق تُعكَس بكامل سعرها كما كانت.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";

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

const PORT = 6874;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-عكس-الكلفة-القائمة";
const ADMIN = 9951, RECV = 9952, MGR = 9953, DOC = 9954, EXPERT = 9955;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, EXPERT];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول",
    permissions: {
      canViewPatients: true, canAddPatients: true, canEditPatients: true,
      canDeletePatients: true, canViewPayments: true,
    },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
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
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

//  **ورقمُ هاتفٍ فريدٌ لكلّ ملفّ**: «تعديل مريض» يردّ التكرارَ بـ
//  `patient_phone_conflict`، فملفّان بالرقم نفسِه يُفشلان التخفيضَ الإداريّ
//  الذي هو **شرطُ الواقعة** — لا عيبٌ في الحارس بل في الفكستشر.
let phoneSeq = 0;
async function mkPatient(label: string) {
  const phone = `0770${String(4100000 + (phoneSeq++)).padStart(7, "0")}`;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,$3,$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',1,true,false,0,'past') RETURNING id`,
    [`${MARK} ${label}`, MARK, phone]);
  return r[0].id;
}
async function mkCase(patientId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [patientId]);
  return r[0].id;
}
async function signExam(patientId: number, deviceCost: number) {
  const res = await http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(),
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
  });
  if (res.status < 300 && res.body?.id) {
    await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
      [res.body.id, deviceCost]);
  }
  return res;
}
async function followupOf(patientId: number) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, S.admin);
  const list = Array.isArray(r.body) ? r.body : [];
  return list[0] ?? null;
}

/** عمليةٌ مباعة: طلبٌ ⟶ معاينةٌ موقّعة ⟶ خبيرٌ ⟶ شراءٌ ⟶ أمرُ تصنيع. */
async function soldOperation(label: string, price: number) {
  const patientId = await mkPatient(label);
  const caseId = await mkCase(patientId);
  const ep = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR,
    requestedItem: "full_device" as any,
  });
  const episodeId = Number((ep as any).id ?? ep);
  await signExam(patientId, price);
  const f = await followupOf(patientId);
  await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
  await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
  const [wo] = await q(
    `SELECT id FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`,
    [patientId]);
  return { patientId, caseId, episodeId, followupId: Number(f.id),
    workOrderId: Number(wo?.id ?? 0) };
}

/** الأرقامُ التي يجب أن تتّسق. */
async function money(patientId: number) {
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const [c] = await q(
    `SELECT cost::int AS cost FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
    [patientId]);
  const entries = await q<{ amount: number; source: string }>(
    `SELECT amount::int AS amount, source FROM cost_entries WHERE patient_id=$1 ORDER BY id`,
    [patientId]);
  const [ep] = await q(
    `SELECT agreed_cost::int AS agreed FROM patient_device_episodes
      WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [patientId]);
  return {
    total: p?.total ?? 0,
    caseCost: c?.cost ?? 0,
    agreed: ep?.agreed ?? 0,
    entries,
    ledger: entries.reduce((s, e) => s + e.amount, 0),
    reversalEntries: entries.filter((e) => e.source === "administrative_reversal"),
  };
}

const preview = (target: any) =>
  http("POST", "/api/admin/operation-reversal/preview", S.admin, target);
async function execute(body: any) {
  const pv = await preview({ followupId: body?.followupId ?? null });
  return await http("POST", "/api/admin/operation-reversal/execute", S.admin,
    { ...body, stateStamp: pv.body?.stateStamp });
}

/** يخفض مجموعَ المريض من «تعديل مريض» — نفسُ بابِ الواقعة الموثَّقة. */
async function lowerTotalCost(patientId: number, to: number) {
  const [p] = await q(`SELECT * FROM patients WHERE id=$1`, [patientId]);
  return await http("PUT", `/api/patients/${patientId}`, S.admin, {
    name: p.name, phone: p.phone, branchId: p.branch_id, totalCost: to,
  });
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"],
    [RECV, "reception", "استعلامات", "[]"],
    [MGR, "branch_manager", "مدير الفرع", "[]"],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `rsc_u${id}`, name, role, spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session-b64"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const server = createServer(app);
  await registerRoutes(server as any, app as any);
  (app as any).use = realUse;
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══ أ. الواقعة: بيعٌ بمليون ⟶ تخفيضٌ إداريّ إلى ٣٠٠ ألف ⟶ إلغاءٌ كامل ══
    console.log("\n── أ. مبلغُ العملية أكبر من الكلفة القائمة بعد تخفيضٍ سابق ──");
    {
      const op = await soldOperation("الواقعة", 1_000_000);
      const sold = await money(op.patientId);
      same("١. البيعُ قُيِّد بكامله", [sold.total, sold.caseCost, sold.agreed],
        [1_000_000, 1_000_000, 1_000_000]);
      same("   والدفترُ متّسقٌ قبل التخفيض", sold.ledger, sold.total);

      const cut = await lowerTotalCost(op.patientId, 300_000);
      check(cut.status < 300, "٢. التخفيضُ الإداريّ نجح", JSON.stringify(cut.body));
      const after = await money(op.patientId);
      same("   ومجموعُ المريض صار ٣٠٠ ألفاً", after.total, 300_000);
      same("   وكلفةُ الحالة تبعته", after.caseCost, 300_000);
      same("   والدفترُ ما زال متّسقاً", after.ledger, after.total);
      //  **ولم يتحرّك سعرُ الحلقة** — وهو ما يجعل «سعرَ البيع» أكبرَ من القائم.
      same("٣. **وسعرُ الحلقة بقي مليوناً** — فالفجوةُ حقيقية", after.agreed, 1_000_000);

      const standing = after.total; // ٣٠٠ ألف: كلُّ ما بقي لهذه العملية
      const res = await execute({
        followupId: op.followupId, mode: "full_operation",
        reasonCode: "purchase_recorded_by_mistake", reasonNote: "تصحيحُ عمليةٍ خاطئة",
      });
      check(res.status < 300, "٤. الإلغاءُ الكامل نجح", JSON.stringify(res.body));

      const fin = await money(op.patientId);
      const applied = after.total - fin.total;
      same("٥. **ما نُقص فعلاً من مجموع المريض** = القائم", applied, standing);
      same("٦. **وقيدُ الكلفة السالب = ما نُقص فعلاً، لا سعرُ البيع**",
        fin.reversalEntries.map((e) => e.amount), [-standing]);
      check(Math.abs(fin.reversalEntries[0]?.amount ?? 0) <= applied,
        "٧. **ولا قيدَ سالبٌ أكبرُ ممّا نُقص** — الثابتُ الحاكم",
        `entry=${fin.reversalEntries[0]?.amount} applied=${applied}`);
      same("٨. **وثابتُ الدفتر محفوظ**: مجموعُ القيود = مجموعُ المريض",
        fin.ledger, fin.total);
      same("   وكلفةُ الحالة نقصت المقدارَ نفسَه",
        after.caseCost - fin.caseCost, standing);

      const [rev] = await q(
        `SELECT financial_delta::int AS delta FROM administrative_operation_reversals
          WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [op.patientId]);
      same("٩. **و`financial_delta` بالمقدار نفسِه**", rev?.delta, -standing);
      same("١٠. **وردُّ النقطة كذلك**", res.body?.financialDelta, -standing);

      const [ev] = await q(
        `SELECT payload->>'reversedAmount' AS amt FROM post_exam_followup_events
          WHERE patient_id=$1 AND event_type='administrative_reversal'
          ORDER BY id DESC LIMIT 1`, [op.patientId]);
      same("١١. **وحدثُ المتابعة كذلك**", Number(ev?.amt), standing);
    }

    // ══ ب. الضابط: بلا تخفيضٍ سابق ⟶ يُعكَس السعرُ كاملاً كما كان ══════════
    console.log("\n── ب. الضابط — لا ارتداد على المسار السليم ──");
    {
      const op = await soldOperation("الضابط", 800_000);
      const before = await money(op.patientId);
      same("١٢. البيعُ قُيِّد بكامله", before.total, 800_000);

      const res = await execute({
        followupId: op.followupId, mode: "full_operation",
        reasonCode: "purchase_recorded_by_mistake", reasonNote: "تصحيحٌ عاديّ",
      });
      check(res.status < 300, "١٣. الإلغاءُ نجح", JSON.stringify(res.body));

      const fin = await money(op.patientId);
      same("١٤. **والعكسُ بكامل السعر** — ٨٠٠ ألف",
        fin.reversalEntries.map((e) => e.amount), [-800_000]);
      same("   ومجموعُ المريض صفر", fin.total, 0);
      same("   وكلفةُ الحالة صفر", fin.caseCost, 0);
      same("   والدفترُ متّسق", fin.ledger, fin.total);
      same("   و`financial_delta` بكامله", res.body?.financialDelta, -800_000);
    }

    // ══ ج. التخفيضُ إلى الصفر ⟶ لا قيدَ سالبٌ إطلاقاً ════════════════════
    console.log("\n── ج. لا شيءَ قائمٌ ⟶ لا قيدَ يُكتب ──");
    {
      const op = await soldOperation("الصفر", 500_000);
      const cut0 = await lowerTotalCost(op.patientId, 0);
      check(cut0.status < 300, "١٤-ب. التخفيضُ إلى الصفر نجح", JSON.stringify(cut0.body));
      const before = await money(op.patientId);
      same("١٥. المجموعُ صفرٌ قبل الإلغاء", [before.total, before.caseCost], [0, 0]);

      const res = await execute({
        followupId: op.followupId, mode: "full_operation",
        reasonCode: "purchase_recorded_by_mistake", reasonNote: "لا كلفةَ قائمة",
      });
      check(res.status < 300, "١٦. الإلغاءُ نجح رغم ذلك", JSON.stringify(res.body));

      const fin = await money(op.patientId);
      same("١٧. **ولا قيدَ عكسٍ يُكتب** — صفرٌ لا يُقيَّد",
        fin.reversalEntries.map((e) => e.amount), []);
      same("   والمجموعُ ما زال صفراً", fin.total, 0);
      same("   والدفترُ متّسق", fin.ledger, fin.total);
      same("   و`financial_delta` صفر", res.body?.financialDelta, 0);
    }

    // ══ د. «تراجعٌ عن الشراء» — القاعدةُ نفسُها ═══════════════════════════
    console.log("\n── د. تراجعٌ عن الشراء بعد تخفيضٍ سابق ──");
    {
      const op = await soldOperation("التراجع", 900_000);
      const cutD = await lowerTotalCost(op.patientId, 250_000);
      check(cutD.status < 300, "١٧-ب. التخفيضُ نجح", JSON.stringify(cutD.body));
      const before = await money(op.patientId);
      same("١٨. القائمُ ٢٥٠ ألفاً وسعرُ الحلقة ٩٠٠", [before.total, before.agreed],
        [250_000, 900_000]);

      const res = await execute({
        followupId: op.followupId, mode: "purchase_only",
        reasonCode: "purchase_recorded_by_mistake", reasonNote: "ضغطةٌ خاطئة",
      });
      check(res.status < 300, "١٩. التراجعُ عن الشراء نجح", JSON.stringify(res.body));

      const fin = await money(op.patientId);
      const applied = before.total - fin.total;
      same("٢٠. **ما نُقص = القائم**", applied, 250_000);
      same("٢١. **والقيدُ السالبُ بالمقدار نفسِه**",
        fin.reversalEntries.map((e) => e.amount), [-250_000]);
      same("٢٢. **وثابتُ الدفتر محفوظ**", fin.ledger, fin.total);
      same("   و`financial_delta`", res.body?.financialDelta, -250_000);
    }

    // ══ هـ. الثابتُ العامّ على كلّ ما كُتب في هذه الجلسة ══════════════════
    console.log("\n── هـ. الثابتُ العامّ ──");
    {
      const bad = await q(
        `SELECT p.id,
                p.total_cost::int AS total,
                COALESCE(SUM(e.amount),0)::int AS ledger
           FROM patients p
           LEFT JOIN cost_entries e ON e.patient_id = p.id
          WHERE p.referral_source = $1
          GROUP BY p.id, p.total_cost
         HAVING p.total_cost <> COALESCE(SUM(e.amount),0)`, [MARK]);
      same("٢٣. **ولا مريضَ واحدٌ يخالف دفترُه مجموعَه**", bad, []);

      const over = await q(
        `SELECT e.patient_id, e.amount::int AS amount
           FROM cost_entries e JOIN patients p ON p.id = e.patient_id
          WHERE p.referral_source = $1
            AND e.source = 'administrative_reversal'
            AND e.amount < -(SELECT COALESCE(MAX(x.amount),0)
                               FROM cost_entries x
                              WHERE x.patient_id = e.patient_id AND x.amount > 0)`,
        [MARK]);
      same("٢٤. **ولا قيدَ عكسٍ يفوق أكبرَ قيدٍ موجبٍ على الملفّ**", over, []);
    }
  } finally {
    server.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص عكس الكلفة القائمة نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
