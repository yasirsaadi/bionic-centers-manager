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
const MANAGER = 9841, DOCTOR = 9842;

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
  for (const [id, role] of [[MANAGER, "branch_manager"], [DOCTOR, "doctor"]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, medical_specialties = EXCLUDED.medical_specialties`,
      [id, `exidem${id}`, role, id === DOCTOR ? '["prosthetic","medical_support"]' : "null"]);
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
    const payload = {
      caseType: "prosthetic",
      diagnosis: "بتر تحت الركبة",
      chiefComplaint: "ألمٌ في موضع البتر",
      plan: "طرفٌ صناعيّ",
      notes: null,
      prescription: { prostheticType: "تحت الركبة" },
      idempotencyKey: key1,
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
    check([epA, epB].includes(examRow.device_episode_id as number),
      "أ٤. **والمعاينةُ ربطت واحدةً من الحلقتين بعينها**", String(examRow.device_episode_id));

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
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[MANAGER, DOCTOR]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[MANAGER, DOCTOR]]);
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
