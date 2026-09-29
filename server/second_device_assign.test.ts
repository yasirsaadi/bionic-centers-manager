// **البند ٩ من §4.ar — لا جهازَ ثانٍ من المعاينة القديمة عبر «تخصيص»**.
// قاعدة محلّية: `npm run test:second-device-assign`.
//
// كان «تخصيص وإسناد خبير» بلا حلقةٍ حيّة يكتفي بـ«معاينةٍ موقّعة في أيّ وقت» —
// ومعاينةُ الجهاز الأوّل المسلَّم تبقى موقّعةً للأبد، فيُصنَع جهازٌ ثانٍ بمواصفات
// الأوّل وسعرِه ولم يرَ الطبيبُ المريض، بينما «بدء التصنيع» يمنعه. والحارسُ هنا
// **أخفُّ** من حارس «بدء التصنيع»: الأمرُ الملغى لا يجعل المريضَ صاحبَ جهاز.

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

const PORT = 6851;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الجهاز-الثاني";
const MANAGER = 9941, DOCTOR = 9942, EXPERT = 9943, RECEPTION = 9944, ADMIN = 9945;
const MSG = "لهذا المريض جهاز سابق — الجهاز أو الجزء الجديد يبدأ من «إضافة خدمة جديدة»";

const S = {
  reception: {
    userId: RECEPTION, role: "reception", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "recv",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true },
  },
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1,
    accessibleBranches: [1], displayName: "adm", permissions: {},
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

async function mkPatient(label: string, classification = "new") {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,true,false,0,$3) RETURNING id`,
    [`${MARK} ${label}`, MARK, classification]);
  return r[0].id;
}
async function mkCase(patientId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [patientId]);
  return r[0].id;
}
async function mkEpisode(patientId: number, caseId: number, seq: number, status: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, requested_item, created_by, delivered_at)
     VALUES ($1,$2,1,$3,$4,1000000,'full_device',$5,
             CASE WHEN $4='delivered' THEN NOW() ELSE NULL END) RETURNING id`,
    [patientId, caseId, seq, status, MANAGER]);
  return r[0].id;
}
async function mkExam(patientId: number, caseId: number, episodeId: number | null) {
  await q(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
       doctor_name, diagnosis, prescription, device_cost, version, signed_at, device_episode_id)
     VALUES ($1,$2,'prosthetic',1,$3,'د. فلان','تشخيص','{}'::jsonb,1200000,1,NOW(),$4)`,
    [patientId, caseId, DOCTOR, episodeId]);
}
async function mkOrder(patientId: number, status: "completed" | "cancelled") {
  await q(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
       purpose, status, current_stage)
     VALUES ($1,1,$2,'prosthetic','initial_build',$3,
             CASE WHEN $3='completed' THEN 'delivered' ELSE 'order_received' END)`,
    [patientId, EXPERT, status]);
}
async function activeBuilds(patientId: number) {
  const [r] = await q<{ n: number }>(
    `SELECT count(*)::int AS n FROM prosthetic_work_orders
      WHERE patient_id=$1 AND purpose='initial_build' AND status NOT IN ('completed','cancelled')`,
    [patientId]);
  return r.n;
}
const assign = (pid: number, s: any = S.reception) =>
  http("POST", `/api/patients/${pid}/assign-manufacturing`, s,
    { expertUserId: EXPERT, serviceType: "prosthetic", cost: 1200000 });

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
    [EXPERT, "prosthetics_expert", "null"], [RECEPTION, "reception", "null"], [ADMIN, "admin", "null"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, medical_specialties=EXCLUDED.medical_specialties`,
      [id, `sd_u${id}`, role, spec]);
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

    console.log("\n── أ. الجهازُ الثاني من المعاينة القديمة — يُردّ ──");
    {
      //  الواقعة: طرفٌ أوّل سُلِّم (أمرٌ مكتمل) ومعاينتُه موقّعة، ولا طلبَ جديد.
      const p = await mkPatient("مكتمل");
      const c = await mkCase(p);
      await mkExam(p, c, null);
      await mkOrder(p, "completed");
      const r = await assign(p);
      same("أ١. «تخصيص» لجهازٍ ثانٍ بلا طلبٍ جديد ⟵ ٤٠٩", r.status, 409);
      same("أ٢. والرسالةُ تدلّ على «إضافة خدمة جديدة»", r.body?.error, MSG);
      same("أ٣. ولا أمرَ تصنيعٍ وُلد", await activeBuilds(p), 0);
      const ra = await assign(p, S.admin);
      same("أ٤. **ولا استثناءَ للمسؤول** — البابُ نفسُه لا الصلاحية", ra.status, 409);
    }
    {
      //  المريضُ القديم (قبل نظام المعاينة): معفى في جهازه الأوّل وحده.
      const p = await mkPatient("قديم-مكتمل", "past");
      await mkCase(p);
      await mkOrder(p, "completed");
      const r = await assign(p);
      same("أ٥. **والمريضُ القديم** بجهازٍ مكتمل ⟵ ٤٠٩ (الإعفاءُ للأوّل وحده)", r.status, 409);
      same("أ٦. بالرسالة نفسها", r.body?.error, MSG);
    }
    {
      //  حلقةٌ مسلَّمة بلا أمرٍ مكتمل يشهد لها — تُحسب جهازاً سابقاً.
      const p = await mkPatient("حلقة-مسلمة", "past");
      const c = await mkCase(p);
      await mkEpisode(p, c, 1, "delivered");
      const r = await assign(p);
      same("أ٧. حلقةٌ مسلَّمة وحدها ⟵ ٤٠٩", r.status, 409);
    }

    console.log("\n── ب. ما لا يتغيّر للموظّف ──");
    {
      const p = await mkPatient("جديد");
      const c = await mkCase(p);
      await mkExam(p, c, null);
      const r = await assign(p);
      check(r.status === 201, "ب١. الجهازُ الأوّل بمعاينته ⟵ يمرّ كما كان",
        `${r.status} ${JSON.stringify(r.body)}`);
      same("ب٢. وأمرُه وُلد", await activeBuilds(p), 1);
    }
    {
      //  «قلّل القيود»: أمرٌ أُلغي لخطأٍ في الخبير لا يجعله صاحبَ جهاز.
      const p = await mkPatient("ملغى");
      const c = await mkCase(p);
      await mkExam(p, c, null);
      await mkOrder(p, "cancelled");
      const r = await assign(p);
      check(r.status === 201, "ب٣. **أمرٌ ملغى لا يُحسب جهازاً سابقاً** ⟵ يُعاد التخصيص",
        `${r.status} ${JSON.stringify(r.body)}`);
    }
    {
      //  المريضُ العائد بطلبٍ جديد عاينه الطبيب — المسارُ الصحيح يبقى مفتوحاً.
      const p = await mkPatient("عائد");
      const c = await mkCase(p);
      await mkEpisode(p, c, 1, "delivered");
      await mkOrder(p, "completed");
      const e2 = await mkEpisode(p, c, 2, "examined");
      await mkExam(p, c, e2);
      const r = await assign(p);
      check(r.status === 201, "ب٤. **العائدُ بطلبٍ جديدٍ مُعايَن** ⟵ يمرّ (حلقتُه الحيّة)",
        `${r.status} ${JSON.stringify(r.body)}`);
    }
    {
      const p = await mkPatient("قديم-أول", "past");
      await mkCase(p);
      const r = await assign(p);
      check(r.status === 201, "ب٥. المريضُ القديم بلا جهازٍ سابق ⟵ إعفاؤه باقٍ",
        `${r.status} ${JSON.stringify(r.body)}`);
    }
  } finally {
    await cleanup();
    //  سطورُ التدقيق تشير إلى المستخدم — تُمسح قبله، وإلّا رُدّ الحذفُ بمفتاح.
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[MANAGER, DOCTOR, EXPERT, RECEPTION, ADMIN]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[MANAGER, DOCTOR, EXPERT, RECEPTION, ADMIN]]);
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
