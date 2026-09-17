// تطابقُ إنشاء المعاينة — إعادةُ إنتاج حادثة السبع معاينات (٢٠٢٦-٠٩).
// اختبارٌ حيّ على Postgres. قاعدة محلّية: `npm run test:exam-idempotency`.
//
// ══ الحادثة ═════════════════════════════════════════════════════════════
// طبيبٌ واحد قصد توقيع معاينةٍ واحدة. سبعُ صفوفٍ بمحتوًى سريريّ متطابق
// وُلدت خلال ثوانٍ على `POST /api/medical/patients/:patientId/exams`، بلا
// أيّ حارس من أيّ نوع: لا مفتاحَ طلب، ولا قيدَ قاعدة، وزرُّ الحفظِ المعطَّل
// أثناء الإرسال وحده لا يصمد أمام إعادة إرسالٍ شبكيّة أو ضغطتين متزامنتين.
// حلقتا جهازٍ منتظِرتان مختلفتان كانتا موجودتين سلفاً استُهلكتا بمحاولتين
// من تلك المحاولات — فبدل جهازٍ واحد يبدأ تصنيعه، بدأ اثنان.
//
// ══ ما يحرسه هذا الاختبار (migration 074) ═══════════════════════════════
// (أ) سبعُ طلباتٍ **متزامنة حقاً** بنفس مفتاح التطابق ⟶ صفٌّ واحد، معرّفٌ
//     واحد تتقارب عليه كلُّ الردود، حلقةٌ واحدةٌ بالضبط تُستهلك والأخرى
//     تبقى منتظِرة، متابعةٌ واحدة، سطرُ تدقيقٍ واحد، بلا أثرٍ ماليّ أو
//     تصنيعيّ إضافيّ.
// (ب) إعادةُ إرسالٍ عاديّة **بعد** أن التزمت المحاولةُ الأولى ⟶ نفسُ الصفّ،
//     بلا تكرارٍ لأيّ أثرٍ جانبي.
// (ج) نفسُ المفتاح بمحتوًى **مختلف فعلاً** ⟶ تعارضٌ (٤٠٩)، لا صفٌّ ثانٍ.
// (د) مفتاحٌ **جديد فعلاً** ⟶ معاينةٌ جديدة فعلاً حين تسمح القواعد.
// (هـ) مفتاحٌ غائبٌ أو فاسدُ الشكل ⟶ يُردّ صراحةً (٤٠٠)، لا سقوطاً صامتاً
//     إلى سلوكٍ غير تطابقيّ.
//
// ══ تصحيحٌ لاحق — الهويّةُ لا المحتوى وحده (٢٠٢٦-٠٩) ═════════════════════
// بصمةُ المحتوى وحدها كانت تكفي إعادةَ معاينة مريضٍ آخر بالكامل لو تطابق
// تشخيصان صدفةً بنفس المفتاح. صار التطابقُ يشترط **هويّةً من مِلك الخادم**
// معاً مع المحتوى: المريضُ، الطبيبُ، الفرعُ، الحالةُ، الاختصاص.
// (و) نفسُ المفتاح ونفسُ المحتوى حرفياً **لمريضٍ مختلف** ⟶ ٤٠٩، صفرُ صفوفٍ
//     جديدة، وبلا تسريب معرّف معاينة المريض الأصليّ في الردّ.
// (ز) نفسُ المفتاح لنفس المريض بنفس المحتوى **بطبيبٍ آخر** ⟶ ٤٠٩ كذلك.
// (ح) والإعادةُ العاديّة لنفس المريض ونفس الطبيب تبقى تعمل كما كانت.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database (must contain 'test' or a local host).");
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

const PORT = 6829;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تطابق-المعاينة";
const MANAGER = 9841, DOCTOR = 9842, DOCTOR2 = 9843;

const S = {
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "mgr-idem-test",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doctor: {
    userId: DOCTOR, role: "doctor", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "doc-idem-test",
    permissions: { canViewPatients: true },
  },
  // ══ لاختبار «نفسُ المفتاح، نفسُ المريض، طبيبٌ آخر» فقط (تصحيحٌ لاحق) ═══
  doctor2: {
    userId: DOCTOR2, role: "doctor", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "doc2-idem-test",
    permissions: { canViewPatients: true },
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
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

async function mkPatient(name: string) {
  const rows = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       medical_condition, branch_id, is_amputee, total_cost)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true,0) RETURNING id`,
    [name, MARK]);
  return rows[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic") {
  const rows = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, status)
     VALUES ($1,1,$2,0,'active') RETURNING id`, [patientId, caseType]);
  return rows[0].id;
}
/** حلقةٌ منتظِرةٌ فعلاً — **قبل** أيّ توقيع، تماماً كحادثة الإنتاج. */
async function mkAwaitingEpisode(patientId: number, caseId: number, seq: number) {
  const rows = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes
       (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, created_by)
     VALUES ($1,$2,1,$3,'awaiting_exam',0,$4) RETURNING id`,
    [patientId, caseId, seq, MANAGER]);
  return rows[0].id;
}
async function episodeStatus(id: number): Promise<string | null> {
  const r = await q<{ status: string }>(`SELECT status FROM patient_device_episodes WHERE id=$1`, [id]);
  return r[0]?.status ?? null;
}
function randomKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

// ══ بوّابةٌ اختباريةٌ حتميّة على قراءة «الأجهزة المنتظرة» ═══════════════════
//  تحجز **أوّل** استعلامٍ يقرأ الأجهزةَ المنتظرة لخيطٍ بعد التسليح — وهو
//  `awaitingExamEpisodesForCase` الذي يناديه `resolveExamEpisode` في النقطة.
//  ويميّزه `ORDER BY sequence_number` عن قراءة فرع الجهاز (`episodeBranchOf`)
//  التي **تسبق** الفحصَ السريع، فيقف الطلبُ **بين** الفحصين بالضبط — وذاك
//  موضعُ العطب حرفياً. فيصير توقيتُ السباق **حتمياً لا احتمالاً**.
//
//  **ولا تُمَسّ شيفرةُ الخادم**: الاعتراضُ على عميل القاعدة في هذا الملفّ
//  وحده، ويُستعاد الأصلُ في `finally` مهما وقع.
const AWAITING_EPISODES_READ =
  /patient_device_episodes[\s\S]*awaiting_exam[\s\S]*order\s+by\s+sequence_number/i;

const rawPoolQuery = (pool as any).query;
const passThroughQuery = rawPoolQuery.bind(pool);
let gateArmed = false;
let gateOpen: Promise<void> | null = null;
let announceHit: (() => void) | null = null;

(pool as any).query = function (...args: any[]) {
  const first = args[0];
  const text = typeof first === "string"
    ? first
    : (first && typeof first.text === "string" ? first.text : "");
  if (gateArmed && AWAITING_EPISODES_READ.test(text)) {
    gateArmed = false;
    announceHit?.();
    return gateOpen!.then(() => passThroughQuery(...args));
  }
  return passThroughQuery(...args);
};

/** يُسلِّح البوّابة لطلبٍ واحد: `reached` تُحَلّ حين يقف، و`release` تُطلقه. */
function armAwaitingReadGate() {
  let release!: () => void;
  gateOpen = new Promise<void>((r) => { release = r; });
  const reached = new Promise<void>((r) => { announceHit = r; });
  gateArmed = true;
  return { reached, release };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_cancellations WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role] of [[MANAGER, "branch_manager"], [DOCTOR, "doctor"], [DOCTOR2, "doctor"]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, medical_specialties = EXCLUDED.medical_specialties`,
      [id, `exidem${id}`, role, role === "doctor" ? '["prosthetic","medical_support"]' : "null"]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(h) } : {};
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    // ══════════════════════════════════════════════════════════════════
    //  أ. الحادثةُ نفسُها: سبعُ طلباتٍ متزامنة، حلقتان منتظِرتان
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. سبعُ طلباتٍ متزامنة بمفتاحٍ واحد — حلقتان منتظِرتان ──");
    const p1 = await mkPatient("مريضٌ بحلقتين منتظِرتين");
    const c1 = await mkCase(p1);
    const epA = await mkAwaitingEpisode(p1, c1, 1);
    const epB = await mkAwaitingEpisode(p1, c1, 2);
    same("   قبل أيّ طلب: الحلقتان منتظِرتان", [await episodeStatus(epA), await episodeStatus(epB)],
      ["awaiting_exam", "awaiting_exam"]);

    const key1 = randomKey("regression-concurrent");
    //  **وهويّةُ الجهاز صريحة** (المرحلة الأولى من قطار الإصلاح، ٢٠٢٦-٠٩-١٢):
    //  حلقتان منتظرتان وتوقيعٌ بلا معرّفٍ صار التباساً يُردّ ٤٠٩ عمداً لا
    //  اختياراً لأيّهما. فالمحاولاتُ السبع — وهي محاولةٌ منطقيةٌ واحدة —
    //  تحمل الجهازَ الأوّل بعينه، وموضوعُ الاختبار (مفتاحُ التطابق تحت
    //  التزامن) كما هو بحرفه.
    const payload = {
      caseType: "prosthetic",
      diagnosis: "بتر تحت الركبة",
      chiefComplaint: "ألمٌ في موضع البتر",
      plan: "طرفٌ صناعيّ",
      notes: null,
      prescription: { prostheticType: "تحت الركبة" },
      idempotencyKey: key1,
      deviceEpisodeId: epA,
    };

    const responses = await Promise.all(Array.from({ length: 7 }, () =>
      http("POST", `/api/medical/patients/${p1}/exams`, S.doctor, payload)));

    check(responses.every((r) => r.status === 200 || r.status === 201),
      "أ١. **السبعُ طلباتٍ كلُّها تنجح** — لا رفضَ صامت لأيٍّ منها",
      JSON.stringify(responses.map((r) => [r.status, r.body?.error])));

    const respIds = new Set(responses.map((r) => r.body?.id));
    same("أ٢. **وكلُّ الردود تتقارب على معرّف معاينةٍ واحد**", respIds.size, 1);

    const examCount = (await q<{ n: number }>(
      `SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p1]))[0].n;
    same("أ٣. **وصفٌّ واحدٌ بالضبط في medical_exams** — لا سبعة", examCount, 1);

    const [examRow] = await q<{ id: number; device_episode_id: number | null }>(
      `SELECT id, device_episode_id FROM medical_exams WHERE patient_id=$1`, [p1]);
    check(examRow.device_episode_id === epA,
      "أ٤. **والمعاينةُ ربطت الحلقةَ المحدَّدة بعينها** — لا الأخرى", String(examRow.device_episode_id));

    const [statusA, statusB] = [await episodeStatus(epA), await episodeStatus(epB)];
    const examinedCount = [statusA, statusB].filter((s) => s === "examined").length;
    const awaitingCount = [statusA, statusB].filter((s) => s === "awaiting_exam").length;
    same("أ٥. **حلقةٌ واحدة بالضبط أصبحت `examined`**", examinedCount, 1);
    same("أ٦. **والأخرى بقيت `awaiting_exam`** — لا حلقةٌ ثانيةٌ اخُتطفت بمعاملةٍ خاسرة تراجعت جزئياً",
      awaitingCount, 1);
    const examinedId = statusA === "examined" ? epA : epB;
    same("   والحلقةُ التي أصبحت `examined` هي نفسُها التي ربطتها المعاينة — لا التباس",
      examRow.device_episode_id, examinedId);

    const followupCount = (await q<{ n: number }>(
      `SELECT count(*)::int n FROM post_exam_followups WHERE medical_exam_id=$1`, [examRow.id]))[0].n;
    same("أ٧. **متابعةٌ واحدة بالضبط لهذه المعاينة** — لا تكرار", followupCount, 1);

    const auditCount = (await q<{ n: number }>(
      `SELECT count(*)::int n FROM audit_log
        WHERE entity_type='medical_exam' AND action='create' AND entity_id=$1`, [examRow.id]))[0].n;
    same("أ٨. **وسطرُ تدقيقِ إنشاءٍ واحد بالضبط**", auditCount, 1);

    const workOrderCount = (await q<{ n: number }>(
      `SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [p1]))[0].n;
    const costEntryCount = (await q<{ n: number }>(
      `SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [p1]))[0].n;
    const totalCost = (await q<{ total_cost: number }>(
      `SELECT total_cost FROM patients WHERE id=$1`, [p1]))[0].total_cost;
    same("أ٩. **ولا أثرَ تصنيعيّ** — توقيعُ المعاينة لا يفتح أمرَ عمل", workOrderCount, 0);
    same("   **ولا أثرَ ماليّ** — لا قيدَ كلفة", costEntryCount, 0);
    same("   وكلفةُ المريض ما زالت صفراً", totalCost, 0);

    check(!responses.some((r) => JSON.stringify(r.body ?? "").includes("duplicate key")),
      "أ١٠. **بلا تسريب خطأ قاعدة بياناتٍ خامٍ لأيّ عميل**",
      JSON.stringify(responses.map((r) => r.body?.error)));

    // ══════════════════════════════════════════════════════════════════
    //  ب. إعادةُ إرسالٍ عاديّة **بعد** أن التزمت المحاولةُ الأولى
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. إعادةُ إرسالٍ عاديّة بعد النجاح ──");
    const replay = await http("POST", `/api/medical/patients/${p1}/exams`, S.doctor, payload);
    check(replay.status === 200 || replay.status === 201, "ب١. تنجح كذلك", String(replay.status));
    same("ب٢. **وتُعيد نفسَ المعرّف** — لا صفّاً جديداً", replay.body?.id, examRow.id);
    same("ب٣. **و`created: false` صراحةً**", replay.body?.created, false);
    same("ب٤. **وما زال صفّاً واحداً في القاعدة**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p1]))[0].n, 1);
    same("ب٥. **ولا سطرَ تدقيقٍ ثانٍ**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM audit_log
        WHERE entity_type='medical_exam' AND action='create' AND entity_id=$1`, [examRow.id]))[0].n, 1);
    same("ب٦. **ولا متابعةً ثانية**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM post_exam_followups
        WHERE medical_exam_id=$1`, [examRow.id]))[0].n, 1);

    // ══════════════════════════════════════════════════════════════════
    //  ج. نفسُ المفتاح بمحتوًى **مختلف فعلاً** ⟶ تعارض
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. مفتاحٌ مُعاد بمحتوًى مختلف ──");
    const conflict = await http("POST", `/api/medical/patients/${p1}/exams`, S.doctor, {
      ...payload, diagnosis: "تشخيصٌ مختلفٌ تماماً لا علاقة له بالأصل",
    });
    same("ج١. **يُردّ ٤٠٩ لا نجاحاً صامتاً**", conflict.status, 409);
    check(typeof conflict.body?.error === "string" && conflict.body.error.length > 0,
      "   برسالةٍ عربية واضحة", JSON.stringify(conflict.body));
    same("ج٢. **بلا صفٍّ جديد ولا تعديل على القديم**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p1]))[0].n, 1);
    same("   والتشخيصُ الأصليّ لم يتغيّر",
      (await q<{ diagnosis: string }>(`SELECT diagnosis FROM medical_exams WHERE id=$1`, [examRow.id]))[0].diagnosis,
      "بتر تحت الركبة");

    // ══════════════════════════════════════════════════════════════════
    //  د. مفتاحٌ **جديد فعلاً** ⟶ معاينةٌ جديدة فعلاً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. مفتاحٌ جديد ⟶ معاينةٌ جديدة ──");
    const p2 = await mkPatient("معاينةٌ ثانية بمفتاحٍ آخر");
    await mkCase(p2);
    const key2 = randomKey("regression-fresh");
    const distinct = await http("POST", `/api/medical/patients/${p2}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "معاينةٌ أخرى مستقلّة", plan: null, notes: null,
      chiefComplaint: null, prescription: {}, idempotencyKey: key2,
    });
    check(distinct.status === 200 || distinct.status === 201, "د١. تنجح", JSON.stringify(distinct.body));
    check(!!distinct.body?.id && distinct.body.id !== examRow.id,
      "د٢. **بمعرّفٍ مختلف تماماً عن معاينة (أ)**", String(distinct.body?.id));
    same("د٣. **و`created: true`**", distinct.body?.created, true);

    // ══════════════════════════════════════════════════════════════════
    //  هـ. مفتاحٌ غائبٌ أو فاسدُ الشكل ⟶ يُردّ صراحةً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. المفتاحُ الغائب/الفاسد ──");
    const before = (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p2]))[0].n;

    const missing = await http("POST", `/api/medical/patients/${p2}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "بلا مفتاح إطلاقاً",
    });
    same("هـ١. **الغيابُ يُردّ ٤٠٠**", missing.status, 400);
    same("   برمزٍ واضح لا خطأٍ عام", missing.body?.code, "idempotency_key_required");

    const shortKey = await http("POST", `/api/medical/patients/${p2}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "مفتاحٌ قصيرٌ فاسد", idempotencyKey: "abc",
    });
    same("هـ٢. **ومفتاحٌ فاسدُ الشكل (أقصر مما يُقبَل) يُردّ ٤٠٠ كذلك**", shortKey.status, 400);

    const badChars = await http("POST", `/api/medical/patients/${p2}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "حروفٌ غير آمنة", idempotencyKey: "not a valid key!! ###",
    });
    same("هـ٣. **وحروفٌ خارج المسموح تُردّ ٤٠٠ كذلك**", badChars.status, 400);

    same("هـ٤. **ولا صفَّ نتج عن أيٍّ من المحاولات الثلاث الفاسدة**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p2]))[0].n, before);

    // ══════════════════════════════════════════════════════════════════
    //  و. تصحيحٌ لاحق — نفسُ المفتاح ونفسُ المحتوى **لمريضٍ مختلف** ⟶ تعارض
    // ══════════════════════════════════════════════════════════════════
    //  العلّةُ التي يحرسها هذا القسم: بصمةُ المحتوى وحدها كانت تكفي لإعادة
    //  معاينة مريضٍ آخر بالكامل لو تطابق تشخيصان صدفةً بنفس المفتاح — خللُ
    //  عميلٍ (لا حالةً طبيعية)، لكنّ الخادم يجب ألّا يثق بالمحتوى وحده.
    console.log("\n── و. نفسُ المفتاح ونفسُ المحتوى لمريضٍ مختلف ⟶ تعارض ──");
    const pW1 = await mkPatient("هويّةٌ — مريضٌ أوّل");
    await mkCase(pW1);
    const keyW = randomKey("regression-identity-patient");
    const payloadW = {
      caseType: "prosthetic", diagnosis: "بتر تحت الركبة", chiefComplaint: null,
      plan: null, notes: null, prescription: {}, idempotencyKey: keyW,
    };
    const firstW = await http("POST", `/api/medical/patients/${pW1}/exams`, S.doctor, payloadW);
    check(firstW.status === 200 || firstW.status === 201,
      "و١. المحاولةُ الأولى تنجح لصاحب المفتاح الحقيقيّ", JSON.stringify(firstW.body));
    const firstWExamId = firstW.body?.id;

    const pW2 = await mkPatient("هويّةٌ — مريضٌ ثانٍ");
    await mkCase(pW2);
    // نفسُ المفتاح، نفسُ كلّ حقلٍ سريريّ حرفياً — **مريضٌ مختلفٌ فقط**.
    const crossPatient = await http("POST", `/api/medical/patients/${pW2}/exams`, S.doctor, payloadW);
    same("و٢. **مريضٌ مختلفٌ بنفس المفتاح ونفس المحتوى ⟶ ٤٠٩** — لا نجاحاً صامتاً",
      crossPatient.status, 409);
    same("   ورمزُ الخطأ `idempotency_conflict`", crossPatient.body?.code, "idempotency_conflict");
    check(!crossPatient.body?.id,
      "و٣. **ولا يُعاد معرّفُ معاينةٍ في الردّ إطلاقاً** — لا معاينةَ المريض الأوّل ولا غيرها",
      JSON.stringify(crossPatient.body));
    same("و٤. **ولا صفَّ جديداً وُلد للمريض الثاني**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pW2]))[0].n, 0);
    same("   ومعاينةُ المريض الأوّل بقيت صفّاً واحداً وحدها — لم تُمَسّ",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pW1]))[0].n, 1);
    // ولا سبيلَ لتسريب صفّ المريض الأوّل عبر أيّ محاولةٍ لاحقة بنفس المفتاح.
    const retryAfterConflictW = await http("POST", `/api/medical/patients/${pW2}/exams`, S.doctor, payloadW);
    same("و٥. **وإعادةُ نفس محاولة المريض الثاني تُردّ ٤٠٩ كذلك** — لا تتذبذب",
      retryAfterConflictW.status, 409);
    check(retryAfterConflictW.body?.id !== firstWExamId,
      "   وما زالت لا تُعيد معرّف المريض الأوّل", JSON.stringify(retryAfterConflictW.body));

    // ══════════════════════════════════════════════════════════════════
    //  ز. تصحيحٌ لاحق — نفسُ المفتاح لنفس المريض بطبيبٍ **مختلف** ⟶ تعارض
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. نفسُ المفتاح لنفس المريض بطبيبٍ مختلف ⟶ تعارض ──");
    const pZ = await mkPatient("هويّةٌ — طبيبٌ مختلف");
    await mkCase(pZ);
    const keyZ = randomKey("regression-identity-doctor");
    const payloadZ = {
      caseType: "prosthetic", diagnosis: "بتر تحت الركبة", chiefComplaint: null,
      plan: null, notes: null, prescription: {}, idempotencyKey: keyZ,
    };
    const firstZ = await http("POST", `/api/medical/patients/${pZ}/exams`, S.doctor, payloadZ);
    check(firstZ.status === 200 || firstZ.status === 201,
      "ز١. المحاولةُ الأولى تنجح بتوقيع الطبيب الأوّل", JSON.stringify(firstZ.body));

    // نفسُ المريض، نفسُ المفتاح، نفسُ المحتوى — **جلسةُ طبيبٍ آخر فقط**.
    const crossDoctor = await http("POST", `/api/medical/patients/${pZ}/exams`, S.doctor2, payloadZ);
    same("ز٢. **نفسُ المريض والمفتاح والمحتوى بطبيبٍ آخر ⟶ ٤٠٩**", crossDoctor.status, 409);
    same("   ورمزُ الخطأ `idempotency_conflict`", crossDoctor.body?.code, "idempotency_conflict");
    same("ز٣. **ولا صفَّ ثانٍ لهذا المريض** — توقيعُ الطبيب الأوّل وحده قائم",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pZ]))[0].n, 1);
    same("   والصفُّ القائم لا يزال منسوباً للطبيب الأوّل بعينه",
      (await q<{ doctor_id: number }>(`SELECT doctor_id FROM medical_exams WHERE patient_id=$1`, [pZ]))[0].doctor_id,
      DOCTOR);

    // ══════════════════════════════════════════════════════════════════
    //  ح. والإعادةُ العاديّة لنفس المريض ونفس الطبيب سليمةٌ كما كانت
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. الإعادةُ العاديّة لنفس المريض/الطبيب سليمة بعد التصحيح ──");
    const normalRetryZ = await http("POST", `/api/medical/patients/${pZ}/exams`, S.doctor, payloadZ);
    check(normalRetryZ.status === 200 || normalRetryZ.status === 201,
      "ح١. تنجح — لا تتأثّر بحارس الهويّة الجديد", String(normalRetryZ.status));
    same("ح٢. **وتُعيد نفسَ معرّف معاينة الطبيب الأصليّ**", normalRetryZ.body?.id, firstZ.body?.id);
    same("ح٣. **و`created:false` صراحةً**", normalRetryZ.body?.created, false);
    same("ح٤. **وما زال صفّاً واحداً في القاعدة**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pZ]))[0].n, 1);

    // ══════════════════════════════════════════════════════════════════
    //  ط. سباقٌ حقيقيّ على تصحيح نوعٍ **بلا خيطٍ للاختصاص الهدف قبله**
    // ══════════════════════════════════════════════════════════════════
    //  ══ الواقعة ════════════════════════════════════════════════════════
    //  الاستعلاماتُ فتحت طلبَ **مساند**، والطبيبُ يصحّحه إلى **أطراف** —
    //  ولا خيطَ أطرافٍ على الملفّ بعد. فتُفتَحُ الحالةُ الهدف **داخل معاملة
    //  التوقيع** (٤.y، تكملةٌ ثانية)، ومعرّفُها لا يُعرَف قبل بدء المعاملة:
    //  الطلبان المتزامنان يبدآن كلاهما بـ`caseId = null` لأن الخيطَ لم يكن
    //  موجوداً حين قرأه كلٌّ منهما.
    //
    //  فالفائزةُ تفتح الخيطَ وتنقل الطلبَ وتكتب المعاينةَ بـ`case_id`
    //  الجديد. والخاسرةُ تصطدم بالحلقة `examined` تحت القفل، فتعود إلى
    //  قاعدة إعادة الإرسال بهويّةٍ **بائتة**: `caseId` عندها ما زال `null`
    //  بينما الصفُّ المحفوظ يحمل الخيطَ الذي وُلد بعدها — فتُقرأ «هويّةٌ
    //  مختلفة» ويُردّ **٤٠٩ تعارضاً** على إعادةِ إرسالٍ مشروعةٍ تماماً.
    //
    //  ══ والعلاجُ **بعد خسارة السباق وحدها** ════════════════════════════
    //  لا يُجعَل الخيطُ الفارغ تطابقاً مفتوحاً، ولا تضعف مقارنةُ الهويّة،
    //  ولا يتغيّر المسارُ السريع قبل السباق. بل يُعاد — في مسار الخسارة
    //  وحده — قراءةُ الهويّة القانونية الحالية **لنفس عملية الجهاز بعينها**
    //  من القاعدة، فيُعرَف الخيطُ الذي صارت إليه، ثمّ تُطبَّق **قاعدةُ
    //  إعادة الإرسال الصارمة نفسُها** على تلك الهويّة المحدَّثة.
    console.log("\n── ط. طلبان متزامنان على تصحيح نوعٍ بلا خيطٍ هدف ──");
    const pT = await mkPatient("سباقُ تصحيح النوع بلا خيطٍ هدف");
    const cT = await mkCase(pT, "medical_support");
    const epT = await mkAwaitingEpisode(pT, cT, 1);

    same("ط١. **قبل الطلب: لا خيطَ أطرافٍ على الملفّ إطلاقاً**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM patient_cases
        WHERE patient_id=$1 AND case_type='prosthetic'`, [pT]))[0].n, 0);
    same("   والطلبُ منتظِرٌ على خيط المساند",
      (await q<{ case_id: number; status: string }>(
        `SELECT case_id, status FROM patient_device_episodes WHERE id=$1`, [epT]))[0],
      { case_id: cT, status: "awaiting_exam" });

    const keyT = randomKey("retype-race-no-target-case");
    const payloadT = {
      caseType: "prosthetic",
      diagnosis: "بتر تحت الركبة",
      chiefComplaint: "تصحيحُ نوع الطلب",
      plan: "طرفٌ صناعيّ",
      notes: null,
      prescription: { prostheticType: "تحت الركبة" },
      idempotencyKey: keyT,
      deviceEpisodeId: epT,
      retypeDeviceEpisode: true,
    };

    //  **طلبان في اللحظة نفسِها** — نفسُ العملية، نفسُ المفتاح، نفسُ المحتوى.
    const raceT = await Promise.all([
      http("POST", `/api/medical/patients/${pT}/exams`, S.doctor, payloadT),
      http("POST", `/api/medical/patients/${pT}/exams`, S.doctor, payloadT),
    ]);

    check(raceT.every((r) => r.status === 200 || r.status === 201),
      "ط٢. **الطلبان كلاهما ينجحان** — ولا يُردّ الخاسرُ تعارضاً لمجرّد أن خيطَه كان فارغاً عند بدايته",
      JSON.stringify(raceT.map((r) => [r.status, r.body?.code, r.body?.error])));

    const raceIds = new Set(raceT.map((r) => r.body?.id));
    same("ط٣. **وكلاهما يُعيد معرّفَ المعاينة نفسَه**", raceIds.size, 1);

    same("ط٤. **ومعاينةٌ واحدةٌ بالضبط في القاعدة** — لا اثنتان",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pT]))[0].n, 1);

    const [examT] = await q<{ id: number; case_id: number | null; case_type: string; device_episode_id: number | null }>(
      `SELECT id, case_id, case_type, device_episode_id FROM medical_exams WHERE patient_id=$1`, [pT]);
    same("   والمعرّفُ المُعاد هو صفُّ القاعدة بعينه", [...raceIds][0], examT.id);
    same("   والمعاينةُ مختومةٌ على نفس عملية الجهاز", examT.device_episode_id, epT);
    same("   واختصاصُها هو المصحَّح إليه", examT.case_type, "prosthetic");

    const prosCases = await q<{ id: number }>(
      `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`, [pT]);
    same("ط٥. **وخيطُ أطرافٍ واحدٌ بالضبط وُلد** — لا اثنان من سباقِ الفتح", prosCases.length, 1);
    same("   والمعاينةُ مربوطةٌ به لا بـ`null`", examT.case_id, prosCases[0]?.id);

    const episodesT = await q<{ id: number; case_id: number; status: string; sequence_number: number }>(
      `SELECT id, case_id, status, sequence_number FROM patient_device_episodes WHERE patient_id=$1`, [pT]);
    same("ط٦. **وعمليةُ الجهاز ما زالت صفّاً واحداً بمعرّفه** — لا صفَّ ثانٍ استُنسخ",
      episodesT.map((e) => e.id), [epT]);
    same("   **وانتقلت مرّةً واحدة إلى الخيط الصحيح**",
      [episodesT[0]?.case_id, episodesT[0]?.status, episodesT[0]?.sequence_number],
      [prosCases[0]?.id, "examined", 1]);

    same("ط٧. **ومتابعةٌ واحدةٌ بالضبط** — لا أثرَ تجاريٌّ مكرَّر",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM post_exam_followups
        WHERE medical_exam_id=$1`, [examT.id]))[0].n, 1);
    same("   ومتابعةٌ واحدة لهذا المريض كلِّه",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM post_exam_followups WHERE patient_id=$1`, [pT]))[0].n, 1);
    same("   وهي على الخيط والعملية الصحيحين",
      (await q<{ case_id: number | null; device_episode_id: number | null; service_type: string }>(
        `SELECT case_id, device_episode_id, service_type FROM post_exam_followups
          WHERE medical_exam_id=$1`, [examT.id]))[0],
      { case_id: prosCases[0]?.id, device_episode_id: epT, service_type: "prosthetic" });

    same("ط٨. **وسطرُ تدقيقِ إنشاءٍ واحدٌ بالضبط**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM audit_log
        WHERE entity_type='medical_exam' AND action='create' AND entity_id=$1`, [examT.id]))[0].n, 1);

    same("ط٩. **ولا أثرَ ماليّ ولا تصنيعيّ مكرَّر — ولا أصليّ أصلاً**",
      [
        (await q<{ n: number }>(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [pT]))[0].n,
        (await q<{ n: number }>(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [pT]))[0].n,
        (await q<{ total_cost: number }>(`SELECT total_cost FROM patients WHERE id=$1`, [pT]))[0].total_cost,
      ], [0, 0, 0]);

    //  وإعادةُ إرسالٍ عاديّة **بعد** انتهاء السباق تبقى تعمل كما كانت.
    const replayT = await http("POST", `/api/medical/patients/${pT}/exams`, S.doctor, payloadT);
    check(replayT.status === 200 || replayT.status === 201,
      "ط١٠. **وإعادةُ الإرسال بعد استقرار السباق تنجح كذلك**", JSON.stringify(replayT.body));
    same("   بنفس المعرّف و`created:false`", [replayT.body?.id, replayT.body?.created], [examT.id, false]);
    same("   وما زالت معاينةً واحدة",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pT]))[0].n, 1);

    // ══════════════════════════════════════════════════════════════════
    //  ي. **والصرامةُ لم تُمَسّ** — نفسُ المفتاح بهويّةٍ مختلفة يبقى تعارضاً
    // ══════════════════════════════════════════════════════════════════
    //  إعادةُ القراءة أعلاه تقع **بعد خسارة السباق وحدها** وتقرأ هويّةَ
    //  **تلك العملية بعينها** — فلا تفتح باباً لأيّ اختلافٍ آخر.
    console.log("\n── ي. المفتاحُ نفسُه بهويّةٍ مختلفة يبقى تعارضاً ──");

    same("ي١. **مريضٌ مختلفٌ بنفس المفتاح ⟶ ٤٠٩**",
      (await http("POST", `/api/medical/patients/${p2}/exams`, S.doctor, payloadT)).status, 409);
    same("ي٢. **وطبيبٌ مختلفٌ بنفس المفتاح ⟶ ٤٠٩**",
      (await http("POST", `/api/medical/patients/${pT}/exams`, S.doctor2, payloadT)).status, 409);
    same("ي٣. **ومحتوًى مختلفٌ بنفس المفتاح ⟶ ٤٠٩**",
      (await http("POST", `/api/medical/patients/${pT}/exams`, S.doctor,
        { ...payloadT, diagnosis: "تشخيصٌ مختلفٌ تماماً" })).status, 409);

    //  **واختصاصٌ مختلفٌ بنفس المفتاح** — الطلبُ صار على خيط الأطراف، فمعاينةُ
    //  مساندٍ بنفس المفتاح هويّةٌ أخرى لا إعادةَ إرسال.
    same("ي٤. **واختصاصٌ مختلفٌ بنفس المفتاح ⟶ ٤٠٩**",
      (await http("POST", `/api/medical/patients/${pT}/exams`, S.doctor,
        { ...payloadT, caseType: "medical_support" })).status, 409);

    //  **وعمليةُ جهازٍ مختلفة بنفس المفتاح** — طلبٌ ثانٍ مستقلٌّ على الملفّ نفسِه.
    const epT2 = await mkAwaitingEpisode(pT, prosCases[0].id, 2);
    same("ي٥. **وعمليةُ جهازٍ مختلفةٌ بنفس المفتاح ⟶ ٤٠٩**",
      (await http("POST", `/api/medical/patients/${pT}/exams`, S.doctor,
        { ...payloadT, deviceEpisodeId: epT2, retypeDeviceEpisode: false })).status, 409);
    same("ي٦. **ولا صفَّ معاينةٍ ثانٍ وُلد من أيٍّ من الخمسة**",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pT]))[0].n, 1);
    same("   والطلبُ الثاني ما زال منتظِراً لم يُمَسّ",
      (await q<{ status: string }>(`SELECT status FROM patient_device_episodes WHERE id=$1`, [epT2]))[0].status,
      "awaiting_exam");

    // ══════════════════════════════════════════════════════════════════
    //  ك. **البياتُ في النقطة** — خاسرُ سباقٍ يُردّ قبل أن يبلغ `createExam`
    // ══════════════════════════════════════════════════════════════════
    //  ══ العلّة ══════════════════════════════════════════════════════════
    //  طلبان **متطابقان** بنفس المفتاح. الأوّلُ يلتزم **بين** فحصِ التطابق
    //  السريع في النقطة و`resolveExamEpisode` بعده. فيقرأ الثاني
    //  `medical_exams` ولا يجد صفّاً (الفائزةُ لم تلتزم بعد)، ثمّ يقرأ
    //  الجهازَ فيجده `examined` ⟶ **٤٠٩ `device_episode_stale`** قبل أن
    //  يبلغ `createExam` أصلاً، فلا يمرّ بحزامِ إعادة الإرسال الذي هناك.
    //  وهو بعينه ما كان يُفشل أ١/أ٢ أعلاه بمعدّل ٦ من ١٤ تشغيلة.
    //
    //  ══ والتوقيتُ هنا **حتميٌّ لا احتمال** ══════════════════════════════
    //  بوّابةٌ اختباريةٌ على `pool.query` تحجز **أوّل** قراءةٍ لحالة الأجهزة
    //  المنتظرة بعد التسليح (استعلامُ `awaitingExamEpisodesForCase` وحده —
    //  يميّزه `ORDER BY sequence_number` فلا يلتقط قراءةَ فرع الجهاز التي
    //  تسبق الفحصَ السريع). فتتوقّف الخاسرةُ **في النقطة بالضبط** التي
    //  يصفها العطب، وتُطلَق الفائزةُ حتى تلتزم، ثمّ تُحرَّر. **ولا تُمَسّ
    //  شيفرةُ الخادم**: اعتراضٌ على عميل القاعدة في الاختبار وحده،
    //  يُستعاد الأصلُ بعده مهما وقع.
    console.log("\n── ك. بياتُ الجهاز في النقطة — طلبان متطابقان ──");

    const pK = await mkPatient("سباقُ البيات في النقطة");
    const cK = await mkCase(pK);
    const epK1 = await mkAwaitingEpisode(pK, cK, 1);
    const epK2 = await mkAwaitingEpisode(pK, cK, 2); // **الجهازُ المستقلّ — لا يُمَسّ**

    const keyK = randomKey("route-stale-replay");
    const payloadK = {
      caseType: "prosthetic",
      diagnosis: "بتر تحت الركبة",
      chiefComplaint: "ألمٌ في موضع البتر",
      plan: "طرفٌ صناعيّ",
      notes: null,
      prescription: { prostheticType: "تحت الركبة" },
      idempotencyKey: keyK,
      deviceEpisodeId: epK1,
    };

    const gateK = armAwaitingReadGate();
    //  الخاسرةُ تنطلق ولا تُنتظَر — تتوقّف عند فحص حالة الجهاز.
    const loserK = http("POST", `/api/medical/patients/${pK}/exams`, S.doctor, payloadK);
    await gateK.reached;

    //  والفائزةُ تمضي كاملةً وتلتزم بينما الخاسرةُ محجوزة.
    const winnerK = await http("POST", `/api/medical/patients/${pK}/exams`, S.doctor, payloadK);
    check(winnerK.status === 200 || winnerK.status === 201,
      "ك١. الفائزةُ تلتزم أوّلاً", JSON.stringify(winnerK.body));
    same("   والجهازُ المقصود صار `examined`", await episodeStatus(epK1), "examined");

    //  **لقطةٌ قبل تحرير الخاسرة** — فيُقاس أثرُها وحدها بعد أن تعود.
    const snapK = async () => ({
      exams: (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pK]))[0].n,
      followups: (await q<{ n: number }>(`SELECT count(*)::int n FROM post_exam_followups WHERE patient_id=$1`, [pK]))[0].n,
      audits: (await q<{ n: number }>(`SELECT count(*)::int n FROM audit_log
        WHERE entity_type='medical_exam' AND action='create' AND entity_id=$1`, [winnerK.body?.id]))[0].n,
      episodes: await q<{ id: number; status: string; case_id: number; sequence_number: number }>(
        `SELECT id, status, case_id, sequence_number FROM patient_device_episodes
          WHERE patient_id=$1 ORDER BY id`, [pK]),
      orders: (await q<{ n: number }>(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [pK]))[0].n,
      costs: (await q<{ n: number }>(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [pK]))[0].n,
      totalCost: (await q<{ total_cost: number }>(`SELECT total_cost FROM patients WHERE id=$1`, [pK]))[0].total_cost,
    });
    const beforeK = await snapK();

    gateK.release();
    const loserRes = await loserK;

    check(loserRes.status === 200 || loserRes.status === 201,
      "ك٢. **والخاسرةُ تنجح كذلك** — لا تُردّ `device_episode_stale` وهي إعادةُ إرسالٍ مطابقة",
      JSON.stringify([loserRes.status, loserRes.body?.code, loserRes.body?.error]));
    same("ك٣. **وتُعيد معرّفَ المعاينة نفسَه**", loserRes.body?.id, winnerK.body?.id);
    same("   و`created: false` صراحةً", loserRes.body?.created, false);

    const afterK = await snapK();
    same("ك٤. **وصفرُ كتابةٍ في مسار الاسترداد** — بصمةُ الملفّ قبل الخاسرة وبعدها سواء",
      afterK, beforeK);

    same("ك٥. **معاينةٌ واحدةٌ بالضبط**", afterK.exams, 1);
    same("ك٦. **ومتابعةٌ واحدة**", afterK.followups, 1);
    same("ك٧. **وسطرُ تدقيقِ إنشاءٍ واحد**", afterK.audits, 1);

    const epK2Row = afterK.episodes.find((e) => e.id === epK2);
    same("ك٨. **والجهازُ المستقلّ لم يُمَسّ** — ما زال منتظِراً بخيطه وتسلسله",
      [epK2Row?.status, epK2Row?.case_id, epK2Row?.sequence_number],
      ["awaiting_exam", cK, 2]);
    same("   والمعاينةُ مختومةٌ على الجهاز المقصود وحده",
      (await q<{ device_episode_id: number | null }>(
        `SELECT device_episode_id FROM medical_exams WHERE patient_id=$1`, [pK]))[0].device_episode_id,
      epK1);

    same("ك٩. **ولا أثرَ ماليٍّ ولا تصنيعيّ**",
      [afterK.orders, afterK.costs, afterK.totalCost], [0, 0, 0]);

    // ══════════════════════════════════════════════════════════════════
    //  ل. **وإلّا يبقى الرفض** — نفسُ المخرج، بطلبٍ ليس إعادةَ إرسال
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. البياتُ يبقى رفضاً لمن ليس إعادةَ إرسال ──");

    //  (١) **مفتاحٌ جديد على جهازٍ استُهلك** — يمرّ بالمخرج نفسِه، ولا صفَّ
    //  بهذا المفتاح إطلاقاً ⟶ الرفضُ كما كان بحرفه.
    const staleFresh = await http("POST", `/api/medical/patients/${pK}/exams`, S.doctor, {
      ...payloadK, idempotencyKey: randomKey("route-stale-fresh"),
    });
    same("ل١. **مفتاحٌ جديد على جهازٍ لم يعد منتظِراً ⟶ ٤٠٩**", staleFresh.status, 409);
    same("   برمز البيات نفسِه", staleFresh.body?.code, "device_episode_stale");
    same("   ولا صفَّ معاينةٍ ثانٍ",
      (await q<{ n: number }>(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pK]))[0].n, 1);

    //  (٢) **وسباقٌ بمحتوًى مختلف** — الخاسرةُ تبلغ المخرجَ نفسَه، وصفُّ
    //  المفتاح موجودٌ لكنّه **ليس طلبَها**: المطابقةُ الصارمة ترفضه ⟶ يبقى
    //  الرفض. فلا يصير المخرجُ الجديد باباً يُعيد معاينةَ غيرِ صاحبها.
    const pL = await mkPatient("سباقٌ بمحتوًى مختلف");
    const cL = await mkCase(pL);
    const epL = await mkAwaitingEpisode(pL, cL, 1);
    const keyL = randomKey("route-stale-mismatch");
    const baseL = {
      caseType: "prosthetic", chiefComplaint: null, plan: null, notes: null,
      prescription: {}, idempotencyKey: keyL, deviceEpisodeId: epL,
    };

    const gateL = armAwaitingReadGate();
    const loserL = http("POST", `/api/medical/patients/${pL}/exams`, S.doctor,
      { ...baseL, diagnosis: "تشخيصُ الخاسرة — مختلفٌ تماماً" });
    await gateL.reached;
    const winnerL = await http("POST", `/api/medical/patients/${pL}/exams`, S.doctor,
      { ...baseL, diagnosis: "تشخيصُ الفائزة" });
    check(winnerL.status === 200 || winnerL.status === 201,
      "ل٢. الفائزةُ تلتزم", JSON.stringify(winnerL.body));
    gateL.release();
    const loserLRes = await loserL;

    same("ل٣. **والخاسرةُ بمحتوًى مختلف تُردّ** — لا تُعاد لها معاينةُ غيرها",
      loserLRes.status, 409);
    check(loserLRes.body?.id === undefined || loserLRes.body?.id === null,
      "   ولا يُسرَّب معرّفُ معاينة الفائزة في الردّ", JSON.stringify(loserLRes.body));
    same("ل٤. **ومعاينةٌ واحدةٌ فقط للمريض** — تشخيصُ الفائزة وحده",
      (await q<{ n: number; diagnosis: string }>(
        `SELECT count(*)::int n, min(diagnosis) diagnosis FROM medical_exams WHERE patient_id=$1`, [pL]))[0],
      { n: 1, diagnosis: "تشخيصُ الفائزة" });

    //  (٣) **ونفسُ المفتاح بمحتوًى مختلف بعد استقرار السباق** — الفحصُ
    //  السريع يردّه تعارضاً كما كان، بلا تغيير.
    same("ل٥. **ونفسُ المفتاح بمحتوًى مختلف ⟶ تعارضٌ كما كان**",
      (await http("POST", `/api/medical/patients/${pK}/exams`, S.doctor,
        { ...payloadK, diagnosis: "شيءٌ آخر تماماً" })).status, 409);
    same("   ومريضٌ مختلفٌ بنفس المفتاح ⟶ تعارضٌ كذلك",
      (await http("POST", `/api/medical/patients/${p2}/exams`, S.doctor, payloadK)).status, 409);
  } finally {
    //  يُستعاد عميلُ القاعدة الأصليّ أوّلاً — فلا تنظيفٌ يمرّ ببوّابةٍ مسلَّحة.
    gateArmed = false;
    (pool as any).query = rawPoolQuery;
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[MANAGER, DOCTOR, DOCTOR2]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[MANAGER, DOCTOR, DOCTOR2]]);
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
