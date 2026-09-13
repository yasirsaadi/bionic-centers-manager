// **إلغاءُ معاينةٍ قديمة لا يُرجع جهازاً تحكمه معاينةٌ أحدث، ولا يعيد كتابةَ
// تاريخِ متابعةٍ منتهية** — المرحلةُ الثانية من قطار الإصلاح (تدقيق
// ٢٠٢٦-٠٩-١٢، INT-01). `npm run test:exam-cancel-safety`.
//
// ══ الواقعةُ المُعادُ إنتاجُها على الأساس (64a8bcbd) ═════════════════════
// «لم يشترِ» ⟵ «عاد للشراء» ⟵ معاينةٌ ثانية على الحلقة نفسِها ⟵ الاستعلاماتُ
// تعرض «إتمام البيع» على متابعتها الحيّة. ثمّ يُلغي الطبيبُ **الأولى**:
// كان الردُّ ٢٠٠ والحلقةُ تعود «بانتظار المعاينة» والثانيةُ حيّة — فالطبيبُ
// يراه منتظراً فحصاً والبائعُ يراه مفحوصاً و«إتمامُ البيع» يُردّ؛ ومتابعةُ
// «لم يشترِ» تُعاد كتابتُها «أُغلقت بسبب إلغاء المعاينة» — ماضٍ لم يقع.
//
// يُشغَّل على Postgres محلّي: DATABASE_URL=... npx tsx server/exam_cancellation_safety.test.ts

import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import crypto from "node:crypto";
import { registerRoutes } from "./routes";

const PORT = 6948;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إلغاء-آمن";
const ADMIN = 99480, RECV = 99481, DOC = 99482, DOC2 = 99483, EXPERT = 99484;
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

const S = {
  admin: { userId: ADMIN, userName: "المسؤول", branchId: 1, isAdmin: true, role: "admin", accessible: [1, 2],
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
  recv: { userId: RECV, userName: "استعلامات", branchId: 1, isAdmin: false, role: "reception", accessible: [1],
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
  doc: { userId: DOC, userName: "د. المعاين", branchId: 1, isAdmin: false, role: "doctor", accessible: [1],
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
  doc2: { userId: DOC2, userName: "د. الزميل", branchId: 1, isAdmin: false, role: "doctor", accessible: [1],
    permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } },
};
type Svc = "prosthetic" | "medical_support";

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
async function mkPatient(label: string, svc: Svc) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة', $4, 1,$3,$5,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, svc === "prosthetic", svc === "medical_support" ? "مسند ركبة" : null,
      svc === "medical_support"]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,1,$2,0,'manual','active')`, [r[0].id, svc]);
  return r[0].id;
}
async function openEpisode(patientId: number, svc: Svc) {
  const r = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv, {
    serviceType: svc, servicePath: "exam",
  });
  if (r.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${r.status} ${JSON.stringify(r.body)}`);
  return Number(r.body.id);
}
async function signExam(patientId: number, session: any, svc: Svc, episodeId: number) {
  const r = await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    idempotencyKey: crypto.randomUUID(), caseType: svc, diagnosis: `معاينة ${svc}`,
    prescription: {}, deviceEpisodeId: episodeId,
  });
  if (r.status >= 300) throw new Error(`فشل التوقيع: ${r.status} ${JSON.stringify(r.body)}`);
  return Number(r.body.id);
}
async function followupOfExam(examId: number) {
  return (await q(`SELECT id, status, closed_reason, not_bought_reason_text, converted_work_order_id
                     FROM post_exam_followups WHERE medical_exam_id=$1`, [examId]))[0];
}
async function notBought(followupId: number) {
  const r = await http("POST", `/api/followups/${followupId}/not-bought`, S.recv, { reason: "غالٍ" });
  if (r.status >= 300) throw new Error(`فشل «لم يشترِ»: ${r.status} ${JSON.stringify(r.body)}`);
}
async function rtp(patientId: number, episodeId: number) {
  const r = await http("POST", "/api/followups/return-to-purchase", S.recv, { patientId, deviceEpisodeId: episodeId });
  if (r.status !== 201) throw new Error(`فشل «عاد للشراء»: ${r.status} ${JSON.stringify(r.body)}`);
}
async function episodeStatus(id: number) {
  return (await q<{ status: string }>(`SELECT status FROM patient_device_episodes WHERE id=$1`, [id]))[0]?.status;
}
async function isCancelled(examId: number) {
  return (await q(`SELECT 1 FROM medical_exam_cancellations WHERE exam_id=$1`, [examId])).length > 0;
}
async function retireEvents(followupId: number) {
  return Number((await q<{ n: number }>(
    `SELECT count(*)::int n FROM post_exam_followup_events WHERE followup_id=$1 AND event_type='closed_exam_cancelled'`,
    [followupId]))[0].n);
}
/** عددُ سطور التدقيق على معاينةٍ بعينها — «صفرُ كتابة» يشمل التدقيق. */
async function auditRows(examId: number) {
  return Number((await q<{ n: number }>(
    `SELECT count(*)::int n FROM audit_log WHERE entity_type='medical_exam' AND entity_id=$1`,
    [examId]))[0].n);
}
async function worklistRows(patientId: number) {
  const r = await http("GET", "/api/medical/worklist", S.doc);
  return (Array.isArray(r.body?.rows) ? r.body.rows : []).filter((x: any) => x.patientId === patientId);
}
async function cardFollowup(patientId: number, followupId: number) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, S.recv);
  const list = Array.isArray(r.body) ? r.body : (r.body?.rows ?? []);
  return list.find((f: any) => Number(f.id) === followupId) ?? null;
}
async function cancel(examId: number, session: any) {
  return await http("POST", `/api/medical/exams/${examId}/cancel`, session, { reason: "إلغاءٌ تجريبي" });
}
async function snapshot(patientId: number) {
  const e = await q(`SELECT id, status FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const f = await q(`SELECT id, status, closed_reason, not_bought_reason_text FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const ev = await q(`SELECT count(*)::int n FROM post_exam_followup_events WHERE patient_id=$1`, [patientId]);
  return JSON.stringify({ e, f, ev: ev[0].n });
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
      [id, `ecs_u${id}`, name, role, spec]);
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
    for (const svc of ["prosthetic", "medical_support"] as Svc[]) {
      console.log(`\n══════════ ${svc} ══════════`);

      // ══ أ. شكلُ INT-01: إلغاءُ القديمة والأحدثُ حيّة ⟵ ٤٠٩ وصفرُ كتابة ══════
      console.log("\n── أ. إلغاءُ القديمة والأحدثُ حيّة ──");
      {
        const p = await mkPatient(`أ-${svc}`, svc);
        const A = await openEpisode(p, svc);
        const ex1 = await signExam(p, S.doc, svc, A);
        const f1 = await followupOfExam(ex1);
        await notBought(Number(f1.id));
        await rtp(p, A);
        same("١. بعد «عاد للشراء» الحلقةُ تنتظر", await episodeStatus(A), "awaiting_exam");
        const ex2 = await signExam(p, S.doc2, svc, A);
        const f2 = await followupOfExam(ex2);
        same("٢. الإعدادُ: مُعايَنةٌ بمعاينتين، الأولى «لم يشترِ» والثانية حيّة",
          [await episodeStatus(A), f1 && (await followupOfExam(ex1)).status, f2?.status],
          ["examined", "closed_without_purchase", "awaiting_patient_decision"]);
        const before = await snapshot(p);
        const auditBefore = await auditRows(ex1);
        const r = await cancel(ex1, S.doc);
        same("٣. **إلغاءُ القديمة يُردّ ٤٠٩** — تعارضٌ صريح لا تخمينٌ صامت", r.status, 409);
        check(String(r.body?.error ?? "").includes(`#${ex2}`),
          "٤. **والرسالةُ تسمّي المعاينةَ الأحدثَ الحاكمة**", JSON.stringify(r.body));
        same("٥. **ولا شاهدةَ إلغاءٍ كُتبت على أيٍّ منهما**",
          [await isCancelled(ex1), await isCancelled(ex2)], [false, false]);
        same("٦. **ولا سطرَ تدقيقٍ** — الطلبُ المردودُ لا يكتب حرفاً", await auditRows(ex1), auditBefore);
        same("٧. **والحلقةُ باقيةٌ على معاينتها الأحدث**", await episodeStatus(A), "examined");
        same("٨. **و«لم يشترِ» تاريخٌ لم يُعَد كتابتُه**",
          [(await followupOfExam(ex1)).status, (await followupOfExam(ex1)).not_bought_reason_text],
          ["closed_without_purchase", "غالٍ"]);
        same("٩. والمتابعةُ الحيّة كما هي", (await followupOfExam(ex2)).status, "awaiting_patient_decision");
        same("١٠. ولا حدثَ «أُغلقت بسبب إلغاء المعاينة» على أيٍّ منهما",
          [await retireEvents(Number(f1.id)), await retireEvents(Number(f2.id))], [0, 0]);
        same("١١. **صفرُ كتابة**: الحلقاتُ والمتابعاتُ مطابقةٌ بايتاً بايت", await snapshot(p), before);
        same("١٢. **ولا يعود المريضُ إلى قائمة الطبيب**", (await worklistRows(p)).length, 0);
        const card = await cardFollowup(p, Number(f2.id));
        check(Array.isArray(card?.actions) && card.actions.includes("complete_sale"),
          "١٣. والاستعلاماتُ ما زالت ترى «إتمام البيع» على المتابعة الحيّة", JSON.stringify(card));
        const sale = await http("POST", `/api/followups/${f2.id}/complete-sale`, S.recv,
          { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
        same("١٤. **وإتمامُ البيع يمضي فعلاً** — العمليةُ الحيّة لم تُكسَر",
          [sale.status < 300, (await followupOfExam(ex2)).status], [true, "converted"]);
      }

      // ══ أ٢. المخرجُ المنصوص عليه: تُسحَب المعايناتُ من الأحدث إلى الأقدم ════
      console.log("\n── أ٢. المخرج: الأحدثُ أوّلاً ──");
      {
        const p = await mkPatient(`أ٢-${svc}`, svc);
        const A = await openEpisode(p, svc);
        const ex1 = await signExam(p, S.doc, svc, A);
        const f1 = await followupOfExam(ex1);
        await notBought(Number(f1.id));
        await rtp(p, A);
        const ex2 = await signExam(p, S.doc2, svc, A);
        same("١٥. إلغاءُ الأحدث أوّلاً يمضي", (await cancel(ex2, S.doc2)).status, 200);
        const r = await cancel(ex1, S.doc);
        same("١٦. **ثمّ تُلغى القديمةُ فعلاً** — الحجبُ مؤقّتٌ بوجود الأحدث لا دائم",
          [r.status, await isCancelled(ex1)], [200, true]);
        same("١٧. و«لم يشترِ» ما زالت لم تُمَسّ",
          [(await followupOfExam(ex1)).status, await retireEvents(Number(f1.id))],
          ["closed_without_purchase", 0]);
        same("١٨. والحلقةُ تنتظر معاينةً جديدة", await episodeStatus(A), "awaiting_exam");
      }

      // ══ ب. الضابط: إلغاءُ **الأحدث** يُرجع الحلقةَ ويُقاعد متابعتَها هي ═════
      console.log("\n── ب. إلغاءُ الأحدث ──");
      {
        const p = await mkPatient(`ب-${svc}`, svc);
        const A = await openEpisode(p, svc);
        const ex1 = await signExam(p, S.doc, svc, A);
        const f1 = await followupOfExam(ex1);
        await notBought(Number(f1.id));
        await rtp(p, A);
        const ex2 = await signExam(p, S.doc2, svc, A);
        const f2 = await followupOfExam(ex2);
        const r = await cancel(ex2, S.doc2);
        same("١٩. إلغاءُ الأحدث ⟵ إرجاعُ الحلقة وتقاعدُ متابعتها هي",
          [r.status, r.body?.episodeReset, r.body?.followupRetired],
          [200, A, Number(f2.id)]);
        same("٢٠. الحلقةُ عادت تنتظر", await episodeStatus(A), "awaiting_exam");
        same("٢١. متابعةُ الأحدث تقاعدت بسببها الحقيقيّ",
          [(await followupOfExam(ex2)).status, await retireEvents(Number(f2.id))], ["closed_exam_cancelled", 1]);
        same("٢٢. **ومتابعةُ «لم يشترِ» الأولى لم تُمَسّ**",
          [(await followupOfExam(ex1)).status, await retireEvents(Number(f1.id))], ["closed_without_purchase", 0]);
        same("٢٣. والمعاينةُ الأولى تبقى فعّالة (سجلٌّ لا سلطة — الحلقةُ تنتظر معاينةً جديدة)",
          [await isCancelled(ex1), await isCancelled(ex2)], [false, true]);
        same("٢٤. ويعود الجهازُ إلى قائمة الطبيب بهويّته",
          (await worklistRows(p)).map((x: any) => x.episodeId), [A]);
      }

      // ══ ج. معاينةٌ وحيدة ومتابعتُها «لم يشترِ» — لا أحدثَ ══════════════════
      console.log("\n── ج. وحيدةٌ بمتابعةٍ منتهية ──");
      {
        const p = await mkPatient(`ج-${svc}`, svc);
        const A = await openEpisode(p, svc);
        const ex1 = await signExam(p, S.doc, svc, A);
        const f1 = await followupOfExam(ex1);
        await notBought(Number(f1.id));
        const r = await cancel(ex1, S.doc);
        same("٢٥. الإلغاءُ يُرجع الحلقةَ (كما كان) **ولا يُقاعد متابعةً منتهية**",
          [r.status, r.body?.episodeReset, r.body?.followupRetired],
          [200, A, null]);
        same("٢٦. «لم يشترِ» باقيةٌ بسببها", [(await followupOfExam(ex1)).status, await retireEvents(Number(f1.id))],
          ["closed_without_purchase", 0]);
        same("٢٧. والحلقةُ تنتظر", await episodeStatus(A), "awaiting_exam");
      }

      // ══ د. الضابطُ القائم: معاينةٌ وحيدة ومتابعتُها حيّة ══════════════════
      console.log("\n── د. وحيدةٌ بمتابعةٍ حيّة ──");
      {
        const p = await mkPatient(`د-${svc}`, svc);
        const A = await openEpisode(p, svc);
        const ex1 = await signExam(p, S.doc, svc, A);
        const f1 = await followupOfExam(ex1);
        const r = await cancel(ex1, S.doc);
        same("٢٨. الإلغاءُ يُرجع الحلقةَ ويُقاعد المتابعةَ الحيّة — كما كان",
          [r.status, r.body?.episodeReset, r.body?.followupRetired],
          [200, A, Number(f1.id)]);
        same("٢٩. وبسببها الحقيقيّ", [(await followupOfExam(ex1)).status, await retireEvents(Number(f1.id))],
          ["closed_exam_cancelled", 1]);
      }

      // ══ هـ. البيعُ يبقى حارساً ولو تجاوزتها أحدث ═══════════════════════════
      console.log("\n── هـ. بعد البيع ──");
      {
        const p = await mkPatient(`هـ-${svc}`, svc);
        const A = await openEpisode(p, svc);
        const ex1 = await signExam(p, S.doc, svc, A);
        const f1 = await followupOfExam(ex1);
        await notBought(Number(f1.id));
        await rtp(p, A);
        const ex2 = await signExam(p, S.doc2, svc, A);
        const f2 = await followupOfExam(ex2);
        const sale = await http("POST", `/api/followups/${f2.id}/complete-sale`, S.recv,
          { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });
        check(sale.status < 300, "٣٠. بيعُ الأحدث", JSON.stringify(sale.body));
        same("٣١. إلغاءُ القديمة بعد بيع الأحدث ⟵ ٤٠٩ (الحلقةُ قيد التصنيع)", (await cancel(ex1, S.doc)).status, 409);
        same("٣٢. وإلغاءُ الأحدث المباعة ⟵ ٤٠٩", (await cancel(ex2, S.doc2)).status, 409);
        same("   ولا شاهدةَ كُتبت", [await isCancelled(ex1), await isCancelled(ex2)], [false, false]);
      }
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
