// «لم يشترِ» وسببُه على بطاقة القسم في ملفّ المريض (§4.bm) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:case-not-bought`.
//
// (أ) قسمُ جهازٍ آخرُ قرارِه «لم يشترِ» ⟵ `notBought` بالسبب كما كُتب وبالتاريخ — للاستقبال وللطبيب.
// (ب) معاينةٌ بلا قرارٍ بعد ⟵ لا `notBought`.
// (ج) «عاد للشراء» ⟵ يختفي (الحلقةُ عادت `awaiting_exam`).
// (د) جهازٌ حيٌّ أُنشئ بعد القرار (بيعٌ «بلا معاينة») ⟵ يختفي.
// (هـ) العلاجُ الطبيعيّ لا يحمله أبداً؛ والرمزُ الموروث يُقرأ باسمه حين لا نصّ.

import { notBoughtReasonOf } from "./case_not_bought";
import express from "express";
import { createServer } from "http";
import { pool } from "../db";
import { registerRoutes } from "../routes";

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

const PORT = 6947;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-لم-يشتر-بطاقة";
const ADMIN = 9971, RECV = 9972, MGR = 9973, DOC = 9974, EXPERT = 9975, RECV_B2 = 9976;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, EXPERT, RECV_B2];

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true } },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {} },
  //  استقبالُ فرعٍ آخر — لإثبات أن الأهليّةَ والتنفيذَ محكومان بالفرع.
  recvB2: { userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استعلامات ٢", permissions: { canViewPatients: true, canAddPatients: true } },
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

/** مريضٌ ببياناتٍ إلزامية كاملة — **بدءُ حلقة جهاز يشترطها**. */
async function mkPatient(label: string, flags: {
  isAmputee?: boolean; isMedicalSupport?: boolean; isPhysiotherapy?: boolean;
} = {}, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',$3,$4,$5,$6,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId,
      flags.isAmputee ?? false, flags.isMedicalSupport ?? false, flags.isPhysiotherapy ?? false]);
  return r[0].id;
}
/**
 * **idempotent**: توقيعُ معاينةٍ لقسمٍ واحد قد يُزامِن (`syncPatientCases`)
 * حالةَ القسم الآخر تلقائياً إن كان علمُه مرفوعاً على المريض — فمريضٌ
 * بعلمَي «أطراف» و«مساند» معاً قد يجد حالةَ المساند موجودةً بالفعل قبل أن
 * يطلبها هذا الاختبارُ صراحةً.
 */
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const existing = await q<{ id: number }>(
    `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type=$2`, [patientId, caseType]);
  if (existing[0]) return existing[0].id;
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}

/** يوقّع معاينةً **عبر نقطتها الحقيقية** — فالحلقةُ والمتابعةُ تُبنيان كما تُبنيان إنتاجاً. */
async function signExam(patientId: number, session: any, caseType: "prosthetic" | "medical_support") {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    idempotencyKey: crypto.randomUUID(),
    caseType, diagnosis: "بتر تحت الركبة", prescription: {},
  });
}

/**
 * **الدورةُ الكاملة**: فتحُ حلقةٍ على مسار المعاينة ⟵ توقيعٌ ⟵ «لم يشترِ».
 * تُعيد هويّةَ الحلقة والمتابعة القديمة — الحالةُ الابتدائية لكلّ سيناريو.
 */
async function declinedDevice(patientId: number, caseType: "prosthetic" | "medical_support") {
  //  الخيطُ شرطُ وجودٍ لفتح جهاز — لا يُفتَح على اختصاصٍ لم يُصنَّف بعد.
  await mkCase(patientId, 1, caseType);
  const ep = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv, {
    serviceType: caseType, servicePath: "exam",
  });
  if (ep.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${ep.status} ${JSON.stringify(ep.body)}`);
  const episodeId = Number(ep.body.id);

  const exam = await signExam(patientId, S.doc, caseType);
  if (exam.status >= 300) throw new Error(`فشل التوقيع: ${exam.status} ${JSON.stringify(exam.body)}`);

  const fRows = await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE device_episode_id = $1 ORDER BY id DESC LIMIT 1`,
    [episodeId]);
  const followupId = fRows[0].id;

  const close = await http("POST", `/api/followups/${followupId}/not-bought`, S.recv, {
    reason: "السعر غالٍ على المريض حالياً",
  });
  if (close.status >= 300) throw new Error(`فشل «لم يشترِ»: ${close.status} ${JSON.stringify(close.body)}`);

  return { episodeId, followupId, examId: Number(exam.body.id) };
}

async function eligibleRows(patientId: number, session: any = S.recv) {
  const r = await http("GET", `/api/followups/patient/${patientId}/return-to-purchase-eligible`, session);
  return { status: r.status, rows: Array.isArray(r.body?.rows) ? r.body.rows : [] };
}

async function episodeStatus(episodeId: number): Promise<string> {
  const r = await q<{ status: string }>(`SELECT status FROM patient_device_episodes WHERE id=$1`, [episodeId]);
  return r[0]?.status ?? "";
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
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
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, spec] of [
    [ADMIN, "admin", "المسؤول", 1, "[]"],
    [RECV, "reception", "استعلامات", 1, "[]"],
    [MGR, "branch_manager", "مدير الفرع", 1, "[]"],
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
    [RECV_B2, "reception", "استعلامات ٢", 2, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `nbc_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
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
  //  `registerRoutes` تسجّل جلسةَ express-session الحقيقية — تُتخطّى هنا
  //  فلا تتصادم مع الجلسة المزيَّفة أعلاه.
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
    const casesOf = async (pid: number, session: any = S.recv) => {
      const r = await http("GET", `/api/patients/${pid}/cases`, session);
      return { status: r.status, rows: Array.isArray(r.body) ? r.body : [] };
    };
    const byType = (rows: any[], t: string) => rows.find((c: any) => c.caseType === t);

    console.log("\n── أ. «لم يشترِ» يظهر بسببه ──");
    const pA = await mkPatient("رفض-مسند", { isMedicalSupport: true, isPhysiotherapy: true });
    const dA = await declinedDevice(pA, "medical_support");
    {
      const { status, rows } = await casesOf(pA);
      same("أ١. النقطةُ تردّ ٢٠٠", status, 200);
      const sup = byType(rows, "medical_support");
      same("أ٢. **السببُ كما كُتب**", sup?.notBought?.reason, "السعر غالٍ على المريض حالياً");
      check(typeof sup?.notBought?.at === "string" && !Number.isNaN(Date.parse(sup.notBought.at)),
        "أ٣. ومعه تاريخُ القرار", JSON.stringify(sup?.notBought));
      const phys = byType(rows, "physiotherapy");
      check(!phys || phys.notBought === undefined, "أ٤. **والعلاجُ الطبيعيّ لا يحمله**", JSON.stringify(phys));
      const doc = await casesOf(pA, S.doc);
      same("أ٥. والطبيبُ (المحجوبُ عن المال) يراه أيضاً", byType(doc.rows, "medical_support")?.notBought?.reason,
        "السعر غالٍ على المريض حالياً");
      check(byType(doc.rows, "medical_support")?.cost === undefined, "أ٦. ولا يفتح للطبيب الكلفة", "");
    }

    console.log("\n── ب. معاينةٌ بلا قرار ──");
    {
      const pB = await mkPatient("بلا-قرار", { isAmputee: true });
      await mkCase(pB, 1, "prosthetic");
      const ep = await http("POST", `/api/patients/${pB}/device-episodes`, S.recv,
        { serviceType: "prosthetic", servicePath: "exam" });
      same("ب١. فتحُ الحلقة", ep.status, 201);
      const ex = await signExam(pB, S.doc, "prosthetic");
      check(ex.status < 300, "ب٢. التوقيع", JSON.stringify(ex.body));
      const { rows } = await casesOf(pB);
      same("ب٣. **لا `notBought` قبل القرار**", byType(rows, "prosthetic")?.notBought, undefined);
    }

    console.log("\n── ج. «عاد للشراء» يُسقطه ──");
    {
      const r = await http("POST", "/api/followups/return-to-purchase", S.recv,
        { patientId: pA, deviceEpisodeId: dA.episodeId });
      check(r.status < 300, "ج١. «عاد للشراء» ينجح", `${r.status} ${JSON.stringify(r.body)}`);
      same("ج٢. الحلقةُ عادت", await episodeStatus(dA.episodeId), "awaiting_exam");
      const { rows } = await casesOf(pA);
      same("ج٣. **فلا يبقى «لم يشترِ» على البطاقة**", byType(rows, "medical_support")?.notBought, undefined);
    }

    console.log("\n── د. جهازٌ حيٌّ بعد القرار يُسقطه ──");
    {
      const pD = await mkPatient("بيع-لاحق", { isAmputee: true });
      const dD = await declinedDevice(pD, "prosthetic");
      same("د١. قبلُ: يظهر", byType((await casesOf(pD)).rows, "prosthetic")?.notBought?.reason,
        "السعر غالٍ على المريض حالياً");
      //  محاكاةُ بيعٍ «بلا معاينة» لاحق: حلقةٌ جديدة في التصنيع أُنشئت بعد القرار.
      await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, created_at)
               SELECT patient_id, case_id, branch_id, sequence_number + 1, 'in_manufacturing', NOW() + interval '1 minute'
                 FROM patient_device_episodes WHERE id = $1`, [dD.episodeId]);
      same("د٢. **بعدُ: يختفي**", byType((await casesOf(pD)).rows, "prosthetic")?.notBought, undefined);
    }

    console.log("\n── هـ. السببُ الموروث ──");
    same("هـ١. النصُّ أوّلاً", notBoughtReasonOf("  غالي  ", "price"), "غالي");
    same("هـ٢. والرمزُ باسمه حين لا نصّ", notBoughtReasonOf(null, "price"), "السعر");
    same("هـ٣. ولا اختراعَ لرمزٍ مجهول", notBoughtReasonOf("", "zzz"), null);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص «لم يشترِ» على البطاقة نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
