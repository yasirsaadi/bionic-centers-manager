// **مواصفاتُ كلّ جهازٍ من معاينته هو** — المرحلةُ الثانية من قطار الإصلاح
// (تدقيق ٢٠٢٦-٠٩-١٢، MULTI-2). `npm run test:device-prescription`.
//
// ══ الواقعةُ المُعادُ إنتاجُها على الأساس (64a8bcbd) ═════════════════════
// وصفةُ الطبيب تُكتب عند كلّ توقيعٍ على أعمدة صفّ المريض الواحدة، وكلُّ
// قراءةٍ تصنيعية كانت تقرأ تلك الأعمدة: بعد معاينة الجهاز B صارت صفحةُ أمر
// A تعرض نوعَ B وجهتَه، وقائمةُ الأوامر تعرض «نوع-B» على أمر A، ومعاينةُ
// مسندٍ تقلب جهةَ أمر الطرف، وبيعُ B يكتب مواصفاتِ B في تفاصيل الحالة.
//
// يُشغَّل على Postgres محلّي: DATABASE_URL=... npx tsx server/device_prescription.test.ts

import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import crypto from "node:crypto";
import { registerRoutes } from "./routes";

const PORT = 6949;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-وصفة-الجهاز";
const ADMIN = 99490, RECV = 99491, DOC = 99492, DOC2 = 99493, EXPERT = 99494;
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
  admin: { userId: ADMIN, userName: "المسؤول", branchId: 1, isAdmin: true, role: "admin", accessible: [1, 2], permissions: perms },
  recv: { userId: RECV, userName: "استعلامات", branchId: 1, isAdmin: false, role: "reception", accessible: [1], permissions: perms },
  doc: { userId: DOC, userName: "د. المعاين", branchId: 1, isAdmin: false, role: "doctor", accessible: [1], permissions: perms },
  doc2: { userId: DOC2, userName: "د. الزميل", branchId: 1, isAdmin: false, role: "doctor", accessible: [1], permissions: perms },
  expert: { userId: EXPERT, userName: "الخبير", branchId: 1, isAdmin: false, role: "prosthetics_expert", accessible: [1], permissions: {} },
};
type Svc = "prosthetic" | "medical_support";

const A_RX = {
  prostheticType: "نوع-A", siliconType: "سليكون-A", footType: "قدم-A", kneeJointType: "ركبة-A",
  injurySide: "يمين", amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة",
};
const A_SITE = "احادي - طرف سفلي - يمين - تحت الركبة";
const B_RX = {
  prostheticType: "نوع-B", footType: "قدم-B", kneeJointType: "ركبة-B",
  injurySide: "يسار", amputationType: "single", singleLimb: "lower", singleSide: "left", singleDetail: "فوق الركبة",
};
const B_SITE = "احادي - طرف سفلي - يسار - فوق الركبة";
const SA_RX = { supportType: "مسند-A", injurySide: "يمين" };
const SB_RX = { supportType: "مسند-B", injurySide: "يسار" };

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
async function mkPatient(label: string, kinds: Svc[]) {
  //  فتحُ طلب طرفٍ يشترط تعريفَ البتر على الملفّ (ملفُّ الاستقبال)، والمسندُ نوعَه.
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',$5,$6,1,$3,$4,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, kinds.includes("prosthetic"), kinds.includes("medical_support"),
      kinds.includes("prosthetic") ? "احادي - طرف سفلي - يمين - تحت الركبة" : null,
      kinds.includes("medical_support") ? "مسند ركبة" : null]);
  for (const k of kinds) {
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
             VALUES ($1,1,$2,0,'manual','active')`, [r[0].id, k]);
  }
  return r[0].id;
}
async function openEpisode(patientId: number, svc: Svc, requestedItem?: string) {
  const r = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv, {
    serviceType: svc, servicePath: "exam", ...(requestedItem ? { requestedItem } : {}),
  });
  if (r.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${r.status} ${JSON.stringify(r.body)}`);
  return Number(r.body.id);
}
async function signExam(patientId: number, session: any, svc: Svc, episodeId: number, prescription: Record<string, unknown>) {
  const r = await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    idempotencyKey: crypto.randomUUID(), caseType: svc, diagnosis: `معاينة ${svc}`,
    prescription, deviceEpisodeId: episodeId,
  });
  if (r.status >= 300) throw new Error(`فشل التوقيع: ${r.status} ${JSON.stringify(r.body)}`);
  return Number(r.body.id);
}
async function sell(episodeId: number, price = 1_000_000) {
  const f = await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE device_episode_id=$1 ORDER BY id DESC LIMIT 1`, [episodeId]);
  const r = await http("POST", `/api/followups/${f[0].id}/complete-sale`, S.recv,
    { originalPrice: price, discountAmount: 0, expertUserId: EXPERT });
  if (r.status >= 300) throw new Error(`فشل البيع: ${r.status} ${JSON.stringify(r.body)}`);
  const wo = await q<{ id: number }>(
    `SELECT id FROM prosthetic_work_orders WHERE device_episode_id=$1 ORDER BY id DESC LIMIT 1`, [episodeId]);
  return Number(wo[0].id);
}
async function detail(orderId: number, session: any = S.admin) {
  const r = await http("GET", `/api/manufacturing/orders/${orderId}`, session);
  return { status: r.status, body: r.body };
}
async function listItem(orderId: number) {
  const r = await http("GET", "/api/manufacturing/orders", S.admin);
  const item = (Array.isArray(r.body) ? r.body : []).find((o: any) => Number(o.id) === orderId);
  return item ? { itemType: item.itemType ?? null } : null;
}
async function caseDetails(patientId: number, svc: Svc) {
  const r = await q<{ details: any }>(`SELECT details FROM patient_cases WHERE patient_id=$1 AND case_type=$2`, [patientId, svc]);
  const d = r[0]?.details;
  return typeof d === "string" ? JSON.parse(d) : (d ?? {});
}
async function patientCols(patientId: number) {
  return (await q(`SELECT prosthetic_type, foot_type, injury_side, support_type, amputation_site FROM patients WHERE id=$1`, [patientId]))[0];
}
function specsOf(d: any) {
  const ds = d?.body?.deviceSpecs;
  return ds?.source === "exam" ? { source: "exam", examId: Number(ds.examId), ...ds.specs } : { source: ds?.source ?? null };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const stmt of [
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
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
  ]) await q(stmt);
}
async function deactivateTestUsers() {
  await q(`UPDATE system_users SET is_active = false WHERE id = ANY($1::int[])`, [[ADMIN, RECV, DOC, DOC2, EXPERT]]);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"],
    [RECV, "reception", "استعلامات", "[]"],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support"]'],
    [DOC2, "doctor", "د. الزميل", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=1, branch_ids='[1]'::jsonb, medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `dpx_u${id}`, name, role, spec]);
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

  const expectA = { source: "exam", ...A_RX, amputationSite: A_SITE } as Record<string, unknown>;
  const expectB = { source: "exam", ...B_RX, amputationSite: B_SITE } as Record<string, unknown>;
  for (const k of ["amputationType", "singleLimb", "singleSide", "singleDetail"]) { delete expectA[k]; delete expectB[k]; }
  const stripExam = (s: any) => { const { examId: _e, ...rest } = s; return rest; };

  try {
    // ══ أ. بِيع A ثمّ عُوين B — أمرُ A يبقى على مواصفاته ═══════════════════
    console.log("\n── أ. بِيع A ثمّ عُوين B ──");
    {
      const p = await mkPatient("أ", ["prosthetic"]);
      const A = await openEpisode(p, "prosthetic");
      const ex1 = await signExam(p, S.doc, "prosthetic", A, A_RX);
      const woA = await sell(A);
      const d0 = await detail(woA);
      same("١. صفحةُ أمر A تعرض مواصفاتِ معاينته هو — والمصدرُ مُعلَن", stripExam(specsOf(d0)), expectA);
      same("   ومعرّفُ المعاينة الحاكمة", specsOf(d0).examId, ex1);
      same("   وهويّةُ الجهاز على الأمر", [d0.body?.order?.deviceEpisodeId, d0.body?.order?.sequenceNumber], [A, 1]);
      same("٢. وقائمةُ الأوامر تسمّي نوعَ A", await listItem(woA), { itemType: "نوع-A" });
      same("٣. وتفاصيلُ الحالة لُقطت من معاينة A لا من أعمدة المريض",
        [(await caseDetails(p, "prosthetic")).prostheticType, (await caseDetails(p, "prosthetic")).amputationSite,
          (await caseDetails(p, "prosthetic")).footType], ["نوع-A", A_SITE, "قدم-A"]);

      const B = await openEpisode(p, "prosthetic", "socket");
      await signExam(p, S.doc2, "prosthetic", B, B_RX);
      same("٤. أعمدةُ المريض المشتركة صارت لِـB (كما كانت دائماً)",
        [(await patientCols(p)).prosthetic_type, (await patientCols(p)).injury_side], ["نوع-B", "يسار"]);
      same("٥. **وأمرُ A لا يتغيّر بمعاينة B**", stripExam(specsOf(await detail(woA))), expectA);
      same("٦. **وقائمةُ الأوامر تبقى على نوع A**", await listItem(woA), { itemType: "نوع-A" });
      same("٧. وتفاصيلُ الحالة لم تُمَسّ بالتوقيع وحده", (await caseDetails(p, "prosthetic")).prostheticType, "نوع-A");

      const woB = await sell(B, 300_000);
      same("٨. أمرُ B على مواصفات B", stripExam(specsOf(await detail(woB))), expectB);
      same("٩. **وأمرُ A ما زال على A بعد بيع B**", stripExam(specsOf(await detail(woA))), expectA);
      same("١٠. والقائمةُ تفرّق بينهما", [await listItem(woA), await listItem(woB)], [{ itemType: "نوع-A" }, { itemType: "نوع-B" }]);
      //  الحالةُ خيطٌ واحد لكلّ (مريض، اختصاص) — تفاصيلُها لقطةُ **آخر بيع من
      //  معاينة جهازه هو**؛ الحقيقةُ لكلّ جهازٍ على أمره وحلقته لا هنا.
      same("١١. وتفاصيلُ الحالة لقطةُ آخر بيع — من معاينة B هو",
        [(await caseDetails(p, "prosthetic")).prostheticType, (await caseDetails(p, "prosthetic")).amputationSite], ["نوع-B", B_SITE]);
    }

    // ══ ب. عُوين A ثمّ B ثمّ بِيع A — الالتقاطُ من معاينة A لا من الأعمدة ═══
    console.log("\n── ب. بيعُ A بعد معاينة B ──");
    {
      const p = await mkPatient("ب", ["prosthetic"]);
      const A = await openEpisode(p, "prosthetic");
      await signExam(p, S.doc, "prosthetic", A, A_RX);
      const B = await openEpisode(p, "prosthetic", "socket");
      await signExam(p, S.doc2, "prosthetic", B, B_RX);
      same("١٢. الإعداد: الأعمدةُ على B قبل بيع A", (await patientCols(p)).prosthetic_type, "نوع-B");
      const woA = await sell(A);
      const cd = await caseDetails(p, "prosthetic");
      same("١٣. **تفاصيلُ الحالة من معاينة A** — لا من الأعمدة التي كتبتها B",
        [cd.prostheticType, cd.footType, cd.kneeJointType, cd.injurySide, cd.amputationSite, cd.siliconType],
        ["نوع-A", "قدم-A", "ركبة-A", "يمين", A_SITE, "سليكون-A"]);
      same("١٤. وصفحةُ أمر A على A", stripExam(specsOf(await detail(woA))), expectA);
      same("١٥. والقائمة", await listItem(woA), { itemType: "نوع-A" });
      const woB = await sell(B, 300_000);
      same("١٦. ثمّ بيعُ B على B وA كما هو", [stripExam(specsOf(await detail(woB))), stripExam(specsOf(await detail(woA)))], [expectB, expectA]);
    }

    // ══ ج. معاينةُ مسندٍ لا تقلب جهةَ أمر الطرف ═══════════════════════════
    console.log("\n── ج. عبر الاختصاصين ──");
    {
      const p = await mkPatient("ج", ["prosthetic", "medical_support"]);
      const A = await openEpisode(p, "prosthetic");
      await signExam(p, S.doc, "prosthetic", A, A_RX);
      const woA = await sell(A);
      const Sx = await openEpisode(p, "medical_support");
      await signExam(p, S.doc2, "medical_support", Sx, SB_RX);
      const dA = specsOf(await detail(woA));
      same("١٧. **جهةُ أمر الطرف لا تتغيّر بمعاينة المسند**، ولا نوعُ مسندٍ عليه",
        [dA.injurySide, "supportType" in dA], ["يمين", false]);
      const woS = await sell(Sx, 200_000);
      const dS = specsOf(await detail(woS));
      same("١٨. وأمرُ المسند على معاينته: نوعٌ وجهة، بلا مفاتيح الأطراف",
        [dS.supportType, dS.injurySide, "prostheticType" in dS, "amputationSite" in dS], ["مسند-B", "يسار", false, false]);
      same("١٩. وتفاصيلُ حالة المسند من معاينته", (await caseDetails(p, "medical_support")).supportType, "مسند-B");
      same("٢٠. وحالةُ الطرف بقيت على A", (await caseDetails(p, "prosthetic")).injurySide, "يمين");
    }

    // ══ د. تصحيحٌ سريريّ لاحق لمعاينة A يظهر على أمر A — وB لا يُمَسّ ═══════
    console.log("\n── د. التصحيحُ السريريّ اللاحق ──");
    {
      const p = await mkPatient("د", ["prosthetic"]);
      const A = await openEpisode(p, "prosthetic");
      const ex1 = await signExam(p, S.doc, "prosthetic", A, A_RX);
      const woA = await sell(A);
      const B = await openEpisode(p, "prosthetic", "socket");
      await signExam(p, S.doc2, "prosthetic", B, B_RX);
      const woB = await sell(B, 300_000);
      const patch = await http("PATCH", `/api/medical/exams/${ex1}`, S.doc, {
        diagnosis: "تصحيح", prescription: { ...A_RX, footType: "قدم-A2" },
      });
      same("٢١. صاحبُ المعاينة يصحّح وصفته", patch.status, 200);
      same("٢٢. **فيتبعه أمرُ A** (المعاينةُ نفسُها بنسختها المحفوظة)", specsOf(await detail(woA)).footType, "قدم-A2");
      same("٢٣. وأمرُ B لا يُمَسّ", stripExam(specsOf(await detail(woB))), expectB);
    }

    // ══ هـ. أمرٌ موروث بلا هويّة جهاز — ملفُّ المريض، مُعلَناً ═══════════════
    console.log("\n── هـ. الأمرُ الموروث ──");
    {
      const p = await mkPatient("هـ", ["prosthetic"]);
      await q(`UPDATE patients SET prosthetic_type='قديم', injury_side='يمين', amputation_site=$2 WHERE id=$1`, [p, A_SITE]);
      const wo = await q<{ id: number }>(`INSERT INTO prosthetic_work_orders
        (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose)
        VALUES ($1,1,$2,'prosthetic','active','order_received','initial_build') RETURNING id`, [p, EXPERT]);
      const d = await detail(wo[0].id);
      same("٢٤. المصدرُ يُقال «ملف المريض» — لا يُخلَط", [d.status, d.body?.deviceSpecs?.source, d.body?.order?.deviceEpisodeId], [200, "patient_file", null]);
      same("٢٥. وأعمدةُ المريض تُعرَض كما كانت", [d.body?.patient?.prostheticType, d.body?.patient?.injurySide], ["قديم", "يمين"]);
      same("٢٦. والقائمةُ من العمود كما كانت", await listItem(wo[0].id), { itemType: "قديم" });
    }

    // ══ و. الخبيرُ المسنَد يقرأ مواصفاتِ جهازه — بلا مال ═══════════════════
    console.log("\n── و. الخبير ──");
    {
      const p = await mkPatient("و", ["prosthetic"]);
      const A = await openEpisode(p, "prosthetic");
      await signExam(p, S.doc, "prosthetic", A, A_RX);
      const woA = await sell(A);
      const d = await detail(woA, S.expert);
      same("٢٧. الخبيرُ يفتح أمره ويرى مواصفاتِ الجهاز من معاينته", [d.status, stripExam(specsOf(d))], [200, expectA]);
      const raw = JSON.stringify(d.body).toLowerCase();
      check(!/"cost"|"totalcost"|"approvedprice"|"agreedcost"|"remaining"/.test(raw), "٢٨. وبلا مبلغٍ واحد في الاستجابة", raw.slice(0, 200));
      const my = await http("GET", "/api/manufacturing/my-orders", S.expert);
      const mine = (Array.isArray(my.body) ? my.body : []).find((o: any) => Number(o.id) === woA);
      same("٢٩. وقائمتُه تسمّي نوعَ جهازه من معاينته", mine?.itemType ?? null, "نوع-A");
    }

    // ══ ز. المساند: بيعُ A بعد معاينة B ═══════════════════════════════════
    console.log("\n── ز. المساند ──");
    {
      const p = await mkPatient("ز", ["medical_support"]);
      const A = await openEpisode(p, "medical_support");
      await signExam(p, S.doc, "medical_support", A, SA_RX);
      const B = await openEpisode(p, "medical_support");
      await signExam(p, S.doc2, "medical_support", B, SB_RX);
      same("٣٠. الإعداد: عمودُ المسند على B", (await patientCols(p)).support_type, "مسند-B");
      const woA = await sell(A);
      same("٣١. **تفاصيلُ الحالة وأمرُ A على معاينة A**",
        [(await caseDetails(p, "medical_support")).supportType, (await caseDetails(p, "medical_support")).injurySide,
          specsOf(await detail(woA)).supportType, specsOf(await detail(woA)).injurySide, await listItem(woA)],
        ["مسند-A", "يمين", "مسند-A", "يمين", { itemType: "مسند-A" }]);
      const woB = await sell(B, 100_000);
      same("٣٢. وB على B", [specsOf(await detail(woB)).supportType, await listItem(woB)], ["مسند-B", { itemType: "مسند-B" }]);
    }

    // ══ ح. وصفةٌ لا تقول عن الجهاز شيئاً ⟶ ملفُّ المريض، لا شاشةٌ فارغة ═════
    //  معاينةٌ فعّالة لكن وصفتُها بلا مفتاحِ اختصاصٍ واحد (تشخيصٌ نصّيٌّ فقط).
    //  لو قيل «المصدرُ المعاينة» لأُخفيت أعمدةُ الملفّ وظهرت البطاقةُ كلُّها
    //  «—»، ولخرجت لقطةُ البيع فارغةً — محوٌ لما كان يُقرأ، لا تصحيحُ هويّة.
    console.log("\n── ح. وصفةٌ بلا مواصفات ──");
    {
      const p = await mkPatient("ح", ["prosthetic"]);
      await q(`UPDATE patients SET prosthetic_type='من الملف', injury_side='يسار', amputation_site=$2 WHERE id=$1`, [p, A_SITE]);
      const A = await openEpisode(p, "prosthetic");
      await signExam(p, S.doc, "prosthetic", A, { notes: "تشخيصٌ نصّيّ بلا مواصفات" } as any);
      const woA = await sell(A);
      const d = await detail(woA);
      same("٣٣. **المصدرُ «ملف المريض» بصدق** — لا بطاقةٌ فارغة ولا أعمدةٌ مخفيّة",
        [d.status, d.body?.deviceSpecs?.source], [200, "patient_file"]);
      same("٣٤. وأعمدةُ المريض تُعرَض، والقائمةُ تسمّي نوعَه",
        [d.body?.patient?.prostheticType, d.body?.patient?.injurySide, await listItem(woA)],
        ["من الملف", "يسار", { itemType: "من الملف" }]);
      same("٣٥. **ولقطةُ البيع لم تخرج فارغة**",
        [(await caseDetails(p, "prosthetic")).prostheticType, (await caseDetails(p, "prosthetic")).injurySide],
        ["من الملف", "يسار"]);
    }

    // ══ ط. مفتاحٌ واحد يكفي، والبطاقةُ تقول وصفتَه وحدها ═══════════════════
    //  وصفةٌ تقول النوعَ وحده ⟶ الجهازُ هو مصدرُ البطاقة، وما لم تقله وصفتُه
    //  **لا يُعرَض في بطاقته** — لكنّ **أعمدةَ الملفّ تبقى معروضةً تحتها**
    //  موسومةً بمصدرها (عقدُ الشاشة في `manufacturing_order_ui.test.ts`)،
    //  فلا يفقد الخبيرُ موقعَ البتر لأن الطبيبَ لم يلمس البانيَ.
    console.log("\n── ط. مفتاحٌ واحد ──");
    {
      const p = await mkPatient("ط", ["prosthetic"]);
      await q(`UPDATE patients SET prosthetic_type='من الملف', foot_type='قدمُ الملفّ', injury_side='يسار' WHERE id=$1`, [p]);
      const A = await openEpisode(p, "prosthetic");
      await signExam(p, S.doc, "prosthetic", A, { prostheticType: "نوع-A" } as any);
      const woA = await sell(A);
      const d = await detail(woA);
      const s = specsOf(d);
      same("٣٦. المصدرُ المعاينة، والنوعُ منها",
        [s.source, s.prostheticType, await listItem(woA)], ["exam", "نوع-A", { itemType: "نوع-A" }]);
      same("٣٧. **وبطاقةُ الجهاز تقول وصفتَه وحدها** — لا تستعير",
        [s.footType ?? null, s.injurySide ?? null], [null, null]);
      //  والمقصودُ بعينه: **موقعُ البتر وجهةُ الإصابة** — ليسا من مفاتيح
      //  الوصفة ولم تقلهما هذه المعاينة، فلولا بقاءُ أعمدة الملفّ على الشاشة
      //  لفقدهما الخبيرُ تماماً. (القدمُ ليست في `expertPatientColumns` أصلاً،
      //  والنوعُ كتبته الوصفةُ على الملفّ عند التوقيع فلا يُقاس هنا.)
      same("٣٨. **وأعمدةُ الملفّ ما زالت تصل الشاشة** — لا تُحجَب عن الخبير",
        [typeof d.body?.patient?.amputationSite === "string" && d.body.patient.amputationSite.length > 0,
          d.body?.patient?.injurySide], [true, "يسار"]);
      //  ولقطةُ البيع: الخيطُ بحلقةٍ واحدة، فالعمودُ لا يمكن أن يصف غيرَها ⟶ يُكمِل
      //  ما سكتت عنه الوصفة. والوصفةُ تعلو عليه حيث نطقت.
      const det = await caseDetails(p, "prosthetic");
      same("٣٩. **ولقطةُ البيع تُكمَل من الملفّ حين لا لبس** — والوصفةُ تعلو",
        [det.prostheticType, det.footType, det.injurySide], ["نوع-A", "قدمُ الملفّ", "يسار"]);
    }

    // ══ ي. وبأكثرَ من حلقةٍ لا يُستعار شيء — الصمتُ أصدق ═══════════════════
    //  الحدُّ الحقيقيّ لقاعدة الإكمال: خيطٌ بحلقتين، فعمودُ الملفّ قد يصف
    //  الجهازَ الآخر. وصفةُ A تقول النوعَ وحده ⟶ ما سكتت عنه **يبقى فارغاً**.
    console.log("\n── ي. حلقتان: لا إكمال ──");
    {
      const p = await mkPatient("ي", ["prosthetic"]);
      const A = await openEpisode(p, "prosthetic");
      const B = await openEpisode(p, "prosthetic", "socket");
      await signExam(p, S.doc2, "prosthetic", B, B_RX);
      same("٤٠. الإعداد: عمودُ الملفّ يحمل قدمَ B", (await patientCols(p)).foot_type, B_RX.footType);
      await signExam(p, S.doc, "prosthetic", A, { prostheticType: "نوع-A" } as any);
      const woA = await sell(A);
      const det = await caseDetails(p, "prosthetic");
      same("٤١. **لقطةُ A لا تستعير قدمَ B** — ولا جهتَه",
        [det.prostheticType, det.footType ?? null, det.injurySide ?? null], ["نوع-A", null, null]);
      same("٤٢. وبطاقةُ A على وصفتها", specsOf(await detail(woA)).prostheticType, "نوع-A");
      same("٤٣. وحلقةُ B لم تُمَسّ", (await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [B]))[0].status, "examined");
    }
  } finally {
    await cleanup();
    await deactivateTestUsers();
    httpServer.close();
    await pool.end();
  }

  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
