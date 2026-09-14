// **سباقُ إلغاءِ المعاينة مع إتمام البيع** — تعارضُ الأقفال يُقال تعارضاً.
// `npm run test:lock-conflict-race`
//
// ══ الواقعة المُقاسة ═════════════════════════════════════════════════════
// مسارانِ مشروعان على الملفّ نفسِه في اللحظة نفسِها: إلغاءُ معاينةٍ موقّعة
// (معاينة ⟶ حلقة ⟶ متابعة) وإتمامُ بيعٍ (متابعة ⟶ خيط ⟶ حلقة). يتقاطع
// ترتيبُ القفلين، فتُبلغ Postgres عن **جمودٍ حقيقيّ** (`40P01`) بعد
// `deadlock_timeout` وتُسقط إحدى المعاملتين كاملةً.
//
// **والبياناتُ لم تكن تفسد قطّ** — الخللُ كان في الردّ: ٥٠٠ «تعذّر إلغاء
// المعاينة» في مسار الإلغاء، ورميٌ غيرُ ملتقَط في مسار البيع فلا يصل ردٌّ.
//
// ══ ما يُثبته هذا الملفّ ══════════════════════════════════════════════════
//   ① **صفرُ ردود ٥٠٠** في كلّ الجولات.
//   ② **صفرُ طلبٍ معلَّق** — لكلّ طلبٍ ردٌّ، ولا رفضَ غيرَ ملتقَط.
//   ③ **الحالةُ ذرّية** — كلُّ جولةٍ «بِيعت كاملةً» أو «أُلغيت كاملةً»، ولا ثالث.
//   ④ **وجمودٌ حقيقيٌّ وقع فعلاً** — وإلّا كانت الثلاثةُ أعلاه ادّعاءً بلا حادث.
//
// **ولا يفحص هذا الملفُّ ترتيبَ قفلٍ ولا إعادةَ محاولة** — لم يُمَسّ أيٌّ منهما.
//
// يُشغَّل على Postgres محلّي: DATABASE_URL=... npx tsx server/lock_conflict_race.test.ts

import express from "express";
import { createServer } from "node:http";
import { Pool } from "pg";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { registerRoutes } from "./routes";
import {
  LOCK_CONFLICT_CODE, LOCK_CONFLICT_ERROR, LOCK_CONFLICT_PG_CODES,
  isLockConflictError,
} from "@shared/lock_conflict";

const PORT = 6995;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سباق-تعارض-الاقفال";
const ADMIN = 99620, RECV = 99621, DOC = 99622, EXPERT = 99623;
const ROUNDS = Number(process.env.ROUNDS ?? 12);
/** مهلةٌ تفوق `deadlock_timeout` بكثير — فالتعليقُ يُقاس لا يُنتظَر للأبد. */
const RESPONSE_DEADLINE_MS = 25_000;
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
  admin: { userId: ADMIN, userName: "المسؤول", branchId: 1, isAdmin: true, role: "admin", accessibleBranches: [1], permissions: perms },
  recv: { userId: RECV, userName: "استعلامات", branchId: 1, isAdmin: false, role: "reception", accessibleBranches: [1], permissions: perms },
  doc: { userId: DOC, userName: "د. المعاين", branchId: 1, isAdmin: false, role: "doctor", accessibleBranches: [1], permissions: perms },
};

//  **الرفضُ غيرُ الملتقَط يُعَدّ ولا يقتل القياس**: بلا مستمعٍ تخرج العمليةُ
//  فوراً، فلا يُعرَف كم طلباً بقي بلا ردّ. والتأكيدُ أدناه يشترط صفراً.
const unhandled: string[] = [];
process.on("unhandledRejection", (e: any) => {
  unhandled.push(`${e?.name ?? "?"}: ${String(e?.message ?? e).slice(0, 120)}`);
});

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), RESPONSE_DEADLINE_MS);
  try {
    const res = await fetch(BASE + path, {
      method, signal: ctl.signal,
      headers: {
        "content-type": "application/json",
        "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* بلا جسم */ }
    return { status: res.status as number | string, body: json };
  } catch (e: any) {
    //  انقطاعُ المهلة يعني **طلباً معلَّقاً** — وهو بعينه ما يُقاس.
    return { status: "NO-RESPONSE" as const, body: { error: String(e?.name ?? e) } };
  } finally { clearTimeout(timer); }
}
async function deadlockCount() {
  const [r] = await q<{ n: number }>(
    `SELECT deadlocks::int AS n FROM pg_stat_database WHERE datname = current_database()`);
  return Number(r.n);
}

/** عمليةُ أطرافٍ جاهزةٌ للسباق: مريض ⟶ طلبُ جهاز ⟶ معاينةٌ موقّعة ⟶ متابعة. */
async function buildOperation(label: string) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة', 1, true,false,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,1,'prosthetic',0,'manual','active')`, [p.id]);
  const ep = await http("POST", `/api/patients/${p.id}/device-episodes`, S.recv,
    { serviceType: "prosthetic", servicePath: "exam" });
  if (Number(ep.status) >= 300) throw new Error(`فشل فتحُ الحلقة: ${JSON.stringify(ep)}`);
  const ex = await http("POST", `/api/medical/patients/${p.id}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(), caseType: "prosthetic",
    diagnosis: "معاينة سباق", prescription: {}, deviceEpisodeId: Number(ep.body.id),
  });
  if (Number(ex.status) >= 300) throw new Error(`فشل التوقيع: ${JSON.stringify(ex)}`);
  const [fu] = await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE medical_exam_id=$1`, [Number(ex.body.id)]);
  return { patientId: p.id, examId: Number(ex.body.id), followupId: Number(fu.id) };
}

/**
 *  جولةُ سباقٍ واحدة. `cancelLagMs` **تأخيرٌ للإلغاء وحده** يُغيّر أيَّ
 *  معاملةٍ تختارها القاعدةُ ضحيّةً — **ولا يغيّر ترتيبَ قفلٍ ولا يعيد
 *  محاولة**: هو توقيتُ إطلاقٍ من العميل لا أكثر.
 */
async function race(op: { examId: number; followupId: number }, cancelLagMs: number) {
  return await Promise.all([
    (async () => {
      if (cancelLagMs > 0) await new Promise((r) => setTimeout(r, cancelLagMs));
      return await http("POST", `/api/medical/exams/${op.examId}/cancel`, S.admin,
        { reason: "سباق" });
    })(),
    http("POST", `/api/followups/${op.followupId}/complete-sale`, S.recv,
      { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT }),
  ]);
}

/** ما وقع فعلاً على الملفّ بعد الجولة — تُقاس الذرّيةُ منه. */
async function outcomeOf(patientId: number, examId: number) {
  const [wo] = await q<{ n: number }>(
    `SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [patientId]);
  const [ce] = await q<{ n: number }>(
    `SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [patientId]);
  const [can] = await q<{ n: number }>(
    `SELECT count(*)::int n FROM medical_exam_cancellations WHERE exam_id=$1`, [examId]);
  const [f] = await q<{ status: string }>(
    `SELECT status FROM post_exam_followups WHERE medical_exam_id=$1`, [examId]);
  const [pt] = await q<{ total: number }>(
    `SELECT COALESCE(total_cost,0)::int AS total FROM patients WHERE id=$1`, [patientId]);
  return {
    orders: Number(wo.n), costEntries: Number(ce.n), witnesses: Number(can.n),
    followup: f?.status ?? null, totalCost: Number(pt.total),
  };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const stmt of [
    `DELETE FROM audit_log WHERE user_id = ANY(ARRAY[${ADMIN},${RECV},${DOC}])`,
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
    `DELETE FROM journal_entries WHERE id IN
       (SELECT entry_id FROM journal_lines WHERE patient_id IN (${ids}))`,
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
  // ══ أ) تصنيفُ الرمز — خالصٌ بلا قاعدة بيانات ═══════════════════════════
  console.log("\n── أ) ما هو تعارضُ الأقفال، وما ليس منه ──");
  same("١. رمزان لا أكثر", [...LOCK_CONFLICT_PG_CODES], ["40P01", "40001"]);
  check(isLockConflictError({ code: "40P01" }), "٢. الجمودُ تعارض");
  check(isLockConflictError({ code: "40001" }), "٣. وفشلُ التسلسل أخوه");
  check(!isLockConflictError({ code: "23505" }), "٤. **والفريدُ المكسور ليس منه** — قرارٌ نهائيّ لا عابر");
  check(!isLockConflictError({ code: "23503" }), "٥. ولا المفتاحُ الأجنبيّ");
  check(!isLockConflictError({ code: "55P03" }), "٦. ولا مهلةُ القفل — لها معناها");
  check(!isLockConflictError(new Error("deadlock detected")), "٧. **ولا يُقرأ من نصّ الرسالة** — بالرمز وحده");
  check(!isLockConflictError(undefined) && !isLockConflictError(null)
    && !isLockConflictError({}), "٨. ولا العدم");
  check(isLockConflictError({ cause: { code: "40P01" } }),
    "٩. **ويُفحَص السببُ المغلَّف** — مُشغّلُ المعاملات قد يلفّ خطأ pg");
  check(isLockConflictError({ cause: { cause: { code: "40001" } } }), "١٠. ولو تعمّق لفُّه");

  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"],
    [RECV, "reception", "استعلامات", "[]"],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true,
               display_name=EXCLUDED.display_name, medical_specialties=EXCLUDED.medical_specialties`,
      [id, `lcr_u${id}`, name, role, spec]);
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
  await new Promise<void>((r) => httpServer.once("listening", r));

  try {
    // ══ ب) السباقُ الحيّ ═══════════════════════════════════════════════════
    console.log(`\n── ب) السباق الحيّ (${ROUNDS} جولة) ──`);
    const deadlocksBefore = await deadlockCount();
    const responses: { status: number | string; body: any; side: string }[] = [];
    const shapes: any[] = [];

    for (let i = 1; i <= ROUNDS; i++) {
      const op = await buildOperation(`ج${i}`);
      const [cancel, sale] = await race(op, 0);
      responses.push({ ...cancel, side: "cancel" }, { ...sale, side: "sale" });
      shapes.push({ round: i, ...(await outcomeOf(op.patientId, op.examId)) });
    }
    const deadlocksAfter = await deadlockCount();
    const delta = deadlocksAfter - deadlocksBefore;

    const tally: Record<string, number> = {};
    for (const r of responses) tally[String(r.status)] = (tally[String(r.status)] ?? 0) + 1;
    console.log(`   توزيع الردود: ${JSON.stringify(tally)} · Δ جمود = ${delta}`);

    // ══ ج) **الحادثُ وقع فعلاً** — وإلّا فالتأكيداتُ التالية بلا موضوع ══════
    check(delta >= 1,
      `١١. **جمودٌ حقيقيٌّ وقع** (Δ=${delta}) — فالترجمةُ تُمارَس لا تُدّعى`,
      `لم يقع أيُّ جمود في ${ROUNDS} جولة`);

    // ══ د) **صفرُ ردود ٥٠٠** ════════════════════════════════════════════════
    const fiveHundreds = responses.filter((r) => Number(r.status) >= 500);
    same("١٢. **صفرُ ردود ٥٠٠** — التعارضُ ليس عطباً في الخادم",
      fiveHundreds.length, 0);
    check(fiveHundreds.length === 0, "١٢-ب. (تفصيلُ أيّ ٥٠٠ إن وقع)",
      JSON.stringify(fiveHundreds.slice(0, 3)));

    // ══ هـ) **صفرُ طلبٍ معلَّق** ═════════════════════════════════════════════
    same("١٣. **لكلّ طلبٍ ردّ** — لا تعليقَ ولا مهلةَ انقطعت",
      responses.filter((r) => r.status === "NO-RESPONSE").length, 0);
    same("١٤. **وصفرُ رفضٍ غير ملتقَط** — لولا مستمعُ القياس لخرجت العملية",
      unhandled.length, 0);
    check(unhandled.length === 0, "١٤-ب. (تفصيلُ أيّ رفضٍ إن وقع)",
      JSON.stringify(unhandled.slice(0, 3)));

    // ══ و) **ولا ردَّ إلّا ٢٠٠ أو ٤٠٩** ══════════════════════════════════════
    const odd = responses.filter((r) => Number(r.status) !== 200 && Number(r.status) !== 409);
    same("١٥. كلُّ ردٍّ ٢٠٠ أو ٤٠٩ لا ثالثَ", odd.length, 0);

    // ══ ز) **ورسالةُ التعارض واحدةٌ مشتركة في البابين** ══════════════════════
    const conflicts = responses.filter((r) => Number(r.status) === 409
      && r.body?.code === LOCK_CONFLICT_CODE);
    check(conflicts.length >= 1,
      `١٦. **ووصل ردُّ تعارضٍ مترجَم** (${conflicts.length} من ${responses.length})`);
    check(conflicts.every((r) => r.body?.error === LOCK_CONFLICT_ERROR),
      "١٧. **بالنصّ المشترك حرفياً** — لا صياغتان تنحرفان",
      JSON.stringify(conflicts.map((r) => r.body?.error).slice(0, 2)));
    check(conflicts.every((r) => !/تعذّر/.test(String(r.body?.error ?? ""))),
      "١٨. **ولا تقول «تعذّر»** فيظنّ القارئُ النظامَ معطوباً");

    // ══ ح) **الحالةُ ذرّية** — بِيعت كاملةً أو أُلغيت كاملةً، ولا ثالث ════════
    const SOLD = (s: any) => s.orders === 1 && s.costEntries === 1 && s.witnesses === 0
      && s.followup === "converted" && s.totalCost === 1_000_000;
    const CANCELLED = (s: any) => s.orders === 0 && s.costEntries === 0 && s.witnesses === 1
      && s.totalCost === 0;
    const torn = shapes.filter((s) => !SOLD(s) && !CANCELLED(s));
    same("١٩. **لا جولةَ ممزّقة** — كلُّ جولةٍ بِيعت كاملةً أو أُلغيت كاملةً",
      torn.length, 0);
    check(torn.length === 0, "١٩-ب. (تفصيلُ أيّ جولةٍ ممزّقة)",
      JSON.stringify(torn.slice(0, 3)));
    check(shapes.some(SOLD) || shapes.some(CANCELLED),
      "٢٠. **وفائزٌ حقيقيٌّ في كلّ جولة** — لا جولةَ سقط فيها الطرفان");
    //  **ولا نصفَ كتابة**: أمرٌ بلا قيدِ كلفة (أو العكس) يعني معاملةً تمزّقت.
    same("٢١. **وأمرُ التصنيع وقيدُ الكلفة يقعان معاً أو لا يقعان**",
      shapes.filter((s) => s.orders !== s.costEntries).length, 0);
    //  والشاهدةُ نقيضُ البيع: لا تجتمعان على ملفٍّ واحد.
    same("٢٢. **ولا شاهدةَ إلغاءٍ مع بيعٍ على الملفّ نفسِه**",
      shapes.filter((s) => s.witnesses > 0 && s.orders > 0).length, 0);
    // ══ ط) **والطرفُ الآخر يخسر أحياناً** — بتوقيتِ إطلاقٍ مختلف ══════════
    //  الضحيّةُ تختارها القاعدةُ لا نحن. وفي الإطلاق المتزامن تخسر عمليةُ
    //  الإلغاء دائماً؛ وبتأخيرٍ صغيرٍ لها **يخسر البيعُ في بعض الجولات** —
    //  فيمرّ الردُّ بمترجم `fail()` في مسار البيع لا بمترجم مسار الإلغاء.
    //  **والثوابتُ نفسُها تُقاس هنا**: صفرُ ٥٠٠ · صفرُ تعليق · وذرّيةٌ كاملة.
    console.log("\n── ط) السباق بتوقيتٍ مُزاح (٨ جولات) ──");
    const staggered: { status: number | string; body: any; side: string }[] = [];
    const stagShapes: any[] = [];
    for (let i = 1; i <= 8; i++) {
      const op = await buildOperation(`ز${i}`);
      const [cancel, sale] = await race(op, 5);
      staggered.push({ ...cancel, side: "cancel" }, { ...sale, side: "sale" });
      stagShapes.push({ round: i, ...(await outcomeOf(op.patientId, op.examId)) });
    }
    const stagTally: Record<string, number> = {};
    for (const r of staggered) stagTally[String(r.status)] = (stagTally[String(r.status)] ?? 0) + 1;
    const victims = staggered.filter((r) => r.body?.code === LOCK_CONFLICT_CODE)
      .map((r) => r.side);
    console.log(`   توزيع الردود: ${JSON.stringify(stagTally)}`
      + ` · الخاسرُ في التعارضات: ${JSON.stringify(victims)}`);

    same("٢٣. **صفرُ ردود ٥٠٠ بالتوقيت المُزاح أيضاً**",
      staggered.filter((r) => Number(r.status) >= 500).length, 0);
    same("٢٤. **وصفرُ طلبٍ معلَّق**",
      staggered.filter((r) => r.status === "NO-RESPONSE").length, 0);
    same("٢٥. **وصفرُ رفضٍ غير ملتقَط في الشوطين معاً**", unhandled.length, 0);
    same("٢٦. **والحالةُ ذرّيةٌ في كلّ جولة**",
      stagShapes.filter((s: any) => !SOLD(s) && !CANCELLED(s)).length, 0);
    check(staggered.filter((r) => r.body?.code === LOCK_CONFLICT_CODE)
      .every((r) => r.body?.error === LOCK_CONFLICT_ERROR),
      "٢٧. **وكلُّ تعارضٍ مترجَمٍ بالنصّ المشترك** — من أيّ البابين جاء");

    // ══ ي) **عقدُ المصدر — رسالةٌ واحدة في البابين، وبلا إعادةِ محاولة** ═════
    //  الضحيّةُ يختارها Postgres، فلا يُضمَن أن يخسر كلُّ بابٍ في كلّ تشغيل.
    //  وهذا الفحصُ يثبت **حتمياً** أن البابين يقرآن المفردات نفسَها.
    const medicalSrc = readFileSync("server/medical/routes.ts", "utf8");
    const saleSrc = readFileSync("server/followup/routes.ts", "utf8");
    for (const [name, src] of [["مسار إلغاء المعاينة", medicalSrc],
      ["مسار البيع", saleSrc]] as [string, string][]) {
      check(src.includes('from "@shared/lock_conflict"')
        && src.includes("isLockConflictError(err)")
        && src.includes("LOCK_CONFLICT_ERROR") && src.includes("LOCK_CONFLICT_CODE"),
        `٢٨. **${name} يترجم بالمفردات المشتركة**`);
    }
    //  **ولا إعادةَ محاولةٍ تلقائية**: الوحدةُ المشتركة تصنّف وتصف، ولا تنفّذ.
    const lockSrc = readFileSync("shared/lock_conflict.ts", "utf8");
    check(!/\bretry\b|setTimeout|while\s*\(|for\s*\(\s*let\s+attempt/i.test(lockSrc),
      "٢٩. **ولا إعادةَ محاولةٍ في الوحدة المشتركة** — تصنيفٌ ووصفٌ لا أكثر");
    same("٣٠. **وسطحُها أربعةُ أسماءٍ لا خامس**",
      [...Object.keys(await import("@shared/lock_conflict"))].sort(),
      ["LOCK_CONFLICT_CODE", "LOCK_CONFLICT_ERROR", "LOCK_CONFLICT_PG_CODES",
        "isLockConflictError"]);
  } finally {
    await cleanup();
    await q(`UPDATE system_users SET is_active=false WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV, DOC, EXPERT]]);
    httpServer.close();
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "🎉 كلُّ التأكيدات مرّت" : `❌ ${failures} تأكيداً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
