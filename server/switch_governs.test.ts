// **المفتاحُ يحكم لا الدور** — تدقيقُ لوحة الصلاحيات، المجموعاتُ ٢–٤ (قرارُ المالك ٢٠٢٦-٠٩-٣٠).
// `npm run test:switch-governs` — حيٌّ على Postgres وعلى النقاط الحقيقية.
//
// «إن كان الزرّ مطفأً على أيٍّ كان — مدير أو موظّف — فلا يتمكّن؛ وإن كان مفعّلاً فيتمكّن».
// فمديرُ فرعٍ مفاتيحُه مطفأة يُردّ، وموظّفُ استقبالٍ مفاتيحُه مفعّلة يمرّ — والمسؤولُ العامّ فوقها.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { canCompleteReceptionSale } from "@shared/commercial";
import { canCompleteMaintenance } from "@shared/maintenance";
import { canCompleteComponentSale } from "@shared/component_sale";
import { canApproveServiceDiscount, canRequestServiceDiscount } from "@shared/discount";
import { canCreateReview } from "@shared/medical_review";
import { canOperateNoExam } from "@shared/pending_charge";

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

const PORT = 6963;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-المفاتيح";
const ADMIN = 99630, MGR_OFF = 99631, RECV_ON = 99632, RECV_OFF = 99633;

const OFF = {
  canViewPatients: true, canAddPatients: false, canEditPatients: false, canViewPayments: false,
  canAddPayments: false, canEditPayments: false, canApproveDiscount: false, canViewReports: false,
  canManageAccounting: false, canManageSurveys: false,
};
const ON = {
  canViewPatients: true, canAddPatients: true, canEditPatients: true, canViewPayments: true,
  canAddPayments: true, canEditPayments: true, canApproveDiscount: true, canViewReports: true,
  canManageAccounting: true, canManageSurveys: true,
};
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: ON },
  mgrOff: { userId: MGR_OFF, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير مطفأ", permissions: OFF },
  recvOn: { userId: RECV_ON, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبال مفعّل", permissions: ON },
  recvOff: { userId: RECV_OFF, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبال مطفأ", permissions: OFF },
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

async function mkPatient(label: string, opts: { amputee?: boolean; physio?: boolean; branchId?: number } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة', $3,$4,false,$5,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, opts.branchId ?? 1, opts.amputee ?? false, opts.physio ?? false]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,0,'manual','active') RETURNING id`, [patientId, caseType]);
  return r[0].id;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  // ══ أ. الدوالُّ المشتركة — المفتاحُ لا الدور ══════════════════════════════
  console.log("── أ. الدوالُّ المشتركة ──");
  const gates: [string, (s: any) => boolean][] = [
    ["«تم الشراء»", canCompleteReceptionSale], ["الصيانة", canCompleteMaintenance],
    ["بيعُ الجزء", canCompleteComponentSale], ["اعتمادُ الخصم", canApproveServiceDiscount],
    ["طلبُ الخصم", canRequestServiceDiscount], ["طلبُ المراجعة", canCreateReview],
    ["بلا معاينة", canOperateNoExam],
  ];
  for (const [label, fn] of gates) {
    same(`أ. ${label}: مديرٌ مطفأ ⟵ لا · استقبالٌ مفعّل ⟵ نعم · استقبالٌ مطفأ ⟵ لا · المسؤول ⟵ نعم`,
      [fn(S.mgrOff), fn(S.recvOn), fn(S.recvOff), fn(S.admin)], [false, true, false, true]);
  }

  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, perms] of [
    [ADMIN, "admin", "المسؤول", ON], [MGR_OFF, "branch_manager", "مدير مطفأ", OFF],
    [RECV_ON, "reception", "استقبال مفعّل", ON], [RECV_OFF, "reception", "استقبال مطفأ", OFF],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=1, branch_ids='[1]'::jsonb, is_active=true`, [id, `swg_u${id}`, name, role]);
    //  صفُّ القاعدة يطابق الجلسة — الخادمُ يقرأ المفاتيحَ حيّةً من الصفّ.
    await q(`UPDATE system_users SET can_view_patients=true, can_add_patients=$2, can_edit_patients=$3,
               can_view_payments=$4, can_add_payments=$5, can_edit_payments=$6, can_approve_discount=$7,
               can_view_reports=$8, can_manage_accounting=$9, can_manage_surveys=$10 WHERE id=$1`,
      [id, perms.canAddPatients, perms.canEditPatients, perms.canViewPayments, perms.canAddPayments,
        perms.canEditPayments, perms.canApproveDiscount, perms.canViewReports, perms.canManageAccounting,
        perms.canManageSurveys]);
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
    console.log("\n── ب. «إضافة مرضى» — بدءُ جهاز وأمرُ التصنيع ──");
    const p1 = await mkPatient("سعد", { amputee: true });
    await mkCase(p1, "prosthetic");
    const epOff = await http("POST", `/api/patients/${p1}/device-episodes`, S.mgrOff,
      { serviceType: "prosthetic", servicePath: "exam" });
    same("ب١. مديرٌ مطفأٌ مفتاحُه ⟵ ٤٠٣", epOff.status, 403);
    const epOn = await http("POST", `/api/patients/${p1}/device-episodes`, S.recvOn,
      { serviceType: "prosthetic", servicePath: "exam" });
    check(epOn.status < 300, "ب٢. استقبالٌ مفعّلٌ مفتاحُه ⟵ يمرّ", `${epOn.status} ${JSON.stringify(epOn.body)}`);
    const moOff = await http("POST", "/api/manufacturing/orders", S.mgrOff, { patientId: p1 });
    same("ب٣. أمرُ التصنيع — مديرٌ مطفأ ⟵ ٤٠٣", moOff.status, 403);
    const moOn = await http("POST", "/api/manufacturing/orders", S.recvOn, { patientId: p1 });
    check(moOn.status !== 403, "ب٤. أمرُ التصنيع — استقبالٌ مفعّل ⟵ لا يُردّ بالصلاحية",
      `${moOn.status} ${JSON.stringify(moOn.body)}`);

    console.log("\n── ج. «تعديل مرضى» — كلفةُ الحالة والإجماليّ وتاريخُ الإضافة ──");
    const p2 = await mkPatient("كريم");
    const c2 = await mkCase(p2, "medical_support");
    const ccOff = await http("PATCH", `/api/patients/${p2}/cases/${c2}`, S.mgrOff, { cost: 100000 });
    same("ج١. كلفةُ الحالة — مديرٌ مطفأ ⟵ ٤٠٣", ccOff.status, 403);
    const ccOn = await http("PATCH", `/api/patients/${p2}/cases/${c2}`, S.recvOn, { cost: 100000 });
    same("ج٢. كلفةُ الحالة — استقبالٌ مفعّل ⟵ ٢٠٠ والكلفةُ كُتبت",
      [ccOn.status, Number((await q(`SELECT cost FROM patient_cases WHERE id=$1`, [c2]))[0].cost)], [200, 100000]);
    const caOff = await http("PUT", `/api/patients/${p2}/created-at`, S.mgrOff, { createdAt: "2026-09-01" });
    same("ج٣. تاريخُ الإضافة — مديرٌ مطفأ ⟵ ٤٠٣", caOff.status, 403);
    const caOn = await http("PUT", `/api/patients/${p2}/created-at`, S.recvOn, { createdAt: "2026-09-01" });
    same("ج٤. تاريخُ الإضافة — استقبالٌ مفعّل ⟵ ٢٠٠", caOn.status, 200);
    const p3 = await mkPatient("منار");
    const tcOn = await http("PUT", `/api/patients/${p3}`, S.recvOn, { totalCost: 70000 });
    same("ج٥. الإجماليّ في «تعديل مريض» — استقبالٌ مفعّل ⟵ يُكتب لا يُسقَط",
      [tcOn.status, Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p3]))[0].total_cost)], [200, 70000]);

    console.log("\n── د. «اعتماد الخصم» — الجلسةُ المجّانية ──");
    const p4 = await mkPatient("رشا", { physio: true });
    await mkCase(p4, "physiotherapy");
    const freeBody = {
      patientId: p4, branchId: 1, amount: 0, isFreeSessions: true,
      paymentTreatmentType: "تمارين تأهيلية", sessionCount: 3,
    };
    //  مَن يملك «إضافة مدفوعات» بلا «اعتماد الخصم»: مديرٌ مفتاحُ الإضافة وحده عنده.
    await q(`UPDATE system_users SET can_add_payments=true WHERE id=$1`, [MGR_OFF]);
    const mgrPay = { ...S.mgrOff, permissions: { ...OFF, canAddPayments: true } };
    await http("POST", "/api/payments", mgrPay, freeBody);
    same("د١. مديرٌ بلا «اعتماد الخصم» ⟵ لا دفعةَ مجّانية",
      Number((await q(`SELECT COUNT(*)::int n FROM payments WHERE patient_id=$1 AND is_free_sessions`, [p4]))[0].n), 0);
    await q(`UPDATE system_users SET can_add_payments=false WHERE id=$1`, [MGR_OFF]);
    const freeOn = await http("POST", "/api/payments", S.recvOn, freeBody);
    same("د٢. استقبالٌ بـ«اعتماد الخصم» ⟵ الدفعةُ مجّانية",
      [freeOn.status < 300,
        Number((await q(`SELECT COUNT(*)::int n FROM payments WHERE patient_id=$1 AND is_free_sessions`, [p4]))[0].n) > 0],
      [true, true]);

    console.log("\n── هـ. «تعديل المدفوعات» — بياناتُ جلسات الدفعة ──");
    const pay = (await q(`SELECT id FROM payments WHERE patient_id=$1 ORDER BY id LIMIT 1`, [p4]))[0]?.id;
    const siOff = await http("PATCH", `/api/payments/${pay}/session-info`, S.mgrOff, { sessionCount: 4 });
    same("هـ١. مديرٌ مطفأ ⟵ ٤٠٣", siOff.status, 403);
    const siOn = await http("PATCH", `/api/payments/${pay}/session-info`, S.recvOn, { sessionCount: 4 });
    check(siOn.status !== 403, "هـ٢. استقبالٌ مفعّل ⟵ لا يُردّ بالصلاحية", `${siOn.status} ${JSON.stringify(siOn.body)}`);

    console.log("\n── و. «عرض المدفوعات» — مالُ التقارير ──");
    await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,1,12345,now())`, [p2]);
    const ovOff = await http("GET", "/api/reports/overall", S.recvOff);
    same("و١. لوحةُ التحكّم — بلا المفتاح ⟵ الأعدادُ تصل والمالُ صفر",
      [ovOff.status, ovOff.body?.totalPatients > 0, ovOff.body?.paid, ovOff.body?.sold, ovOff.body?.remaining],
      [200, true, 0, 0, 0]);
    const ovOn = await http("GET", "/api/reports/overall", S.recvOn);
    check(ovOn.body?.paid >= 12345, "و٢. وبالمفتاح ⟵ المالُ الحقيقيّ", JSON.stringify(ovOn.body));
    const dOff = await http("GET", "/api/reports/daily", S.recvOff);
    same("و٣. اليوميّ — بلا المفتاح ⟵ المالُ صفرٌ والفروعُ فارغة",
      [dOff.status, dOff.body?.paid, dOff.body?.branchRevenues], [200, 0, []]);
    const dOn = await http("GET", "/api/reports/daily", S.recvOn);
    check(dOn.body?.paid >= 12345, "و٤. وبالمفتاح ⟵ واردُ اليوم", JSON.stringify(dOn.body));
    same("و٥. إيراداتُ الفروع — بلا المفتاح ⟵ ٤٠٣ · وبه ⟵ ٢٠٠",
      [(await http("GET", "/api/reports/all-branches", S.recvOff)).status,
        (await http("GET", "/api/reports/all-branches", S.recvOn)).status], [403, 200]);
    same("و٦. تقريرُ الفرع — بلا المفتاح ⟵ ٤٠٣ · وبه ⟵ ٢٠٠",
      [(await http("GET", "/api/reports/daily/1", S.recvOff)).status,
        (await http("GET", "/api/reports/daily/1", S.recvOn)).status], [403, 200]);
    same("و٧. الملخّصُ الماليّ للمريض — بلا المفتاح ⟵ ٤٠٣ · وبه ⟵ ٢٠٠",
      [(await http("GET", `/api/patients/${p2}/financial-summary`, S.recvOff)).status,
        (await http("GET", `/api/patients/${p2}/financial-summary`, S.recvOn)).status], [403, 200]);

    console.log("\n── ز. «إدارة المحاسبة» — الفواتير ──");
    same("ز١. القائمة — مديرٌ مطفأ ⟵ ٤٠٣ · مفعّل ⟵ ٢٠٠",
      [(await http("GET", "/api/invoices", S.mgrOff)).status, (await http("GET", "/api/invoices", S.recvOn)).status],
      [403, 200]);
    same("ز٢. بنودُ الفواتير — مديرٌ مطفأ ⟵ ٤٠٣",
      (await http("GET", "/api/invoice-items/bulk?invoiceIds=1", S.mgrOff)).status, 403);
    const inv = await q<{ id: number }>(
      `INSERT INTO invoices (invoice_number, patient_id, branch_id, invoice_date, subtotal, total)
       VALUES ($1,$2,2,CURRENT_DATE,1000,1000) RETURNING id`, [`SWG-${Date.now()}`, p2]).catch((e) => {
        console.error(e?.message); return [] as any[]; });
    if (inv[0]) {
      same("ز٣. فاتورةُ فرعٍ آخر برقمها ⟵ ٤٠٣ · وللمسؤول ⟵ ٢٠٠",
        [(await http("GET", `/api/invoices/${inv[0].id}`, S.recvOn)).status,
          (await http("GET", `/api/invoices/${inv[0].id}`, S.admin)).status], [403, 200]);
      await q(`DELETE FROM invoices WHERE id=$1`, [inv[0].id]);
    } else {
      check(false, "ز٣. (الإعداد) تعذّر إنشاءُ فاتورة");
    }

    console.log("\n── ح. «إدارة الاستبيانات» ──");
    same("ح١. القائمة — بلا المفتاحين ⟵ ٤٠٣ · بالمفتاح ⟵ ٢٠٠",
      [(await http("GET", "/api/survey-responses", S.recvOff)).status,
        (await http("GET", "/api/survey-responses", S.recvOn)).status], [403, 200]);
    const reportsOnly = { ...S.recvOff, permissions: { ...OFF, canViewReports: true } };
    await q(`UPDATE system_users SET can_view_reports=true WHERE id=$1`, [RECV_OFF]);
    same("ح٢. «عرض التقارير» وحده ⟵ القائمةُ والنتائجُ (صفحةُ الإحصائيات) · لا إجاباتُ مريض",
      [(await http("GET", "/api/survey-responses", reportsOnly)).status,
        (await http("GET", "/api/survey-results", reportsOnly)).status,
        (await http("GET", `/api/survey-responses/patient/${p2}`, reportsOnly)).status],
      [200, 200, 403]);
    await q(`UPDATE system_users SET can_view_reports=false WHERE id=$1`, [RECV_OFF]);
    same("ح٣. النتائج — بلا المفتاحين ⟵ ٤٠٣", (await http("GET", "/api/survey-results", S.recvOff)).status, 403);

  } finally {
    await cleanup();
    await q(`UPDATE system_users SET is_active = false WHERE id = ANY($1::int[])`, [[ADMIN, MGR_OFF, RECV_ON, RECV_OFF]]);
    httpServer.close();
    await pool.end();
  }

  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
