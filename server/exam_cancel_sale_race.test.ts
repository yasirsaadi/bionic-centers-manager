// **سباقُ إلغاء المعاينة × إتمام البيع (INT-05)** — حيّاً على Postgres وعلى
// النقطتين الحقيقيتين: `npm run test:cancel-sale-race`.
//
// ══ الثابتُ الذي يحرسه ════════════════════════════════════════════════════
// ترتيبُ القفل متعاكسٌ بين البابين — `cancelExam` يقفل معاينة ⟶ حلقة ⟶
// متابعة، و`completeReceptionSale` يقفل متابعة ⟶ خيط ⟶ حلقة — فضغطتان
// متزامنتان تُنتجان جموداً حقيقياً تحسمه Postgres. **والمطلوبُ أن يُقال
// تعارضاً**: لا ٥٠٠، ولا طلبٌ معلَّق بلا ردّ، ولا نصفُ بيع.
//
// وما يُثبته، بندَ بندٍ (أ–هـ):
//   أ.  الوحدةُ الخالصة: `isLockConflict` تعرف صنفَ «٤٠» وحده.
//   ب.  **البيعُ ضحيّةً** ⟶ ٤٠٩ برمزه فوراً — كان **معلَّقاً بلا ردٍّ أبداً**.
//   ج.  **الإلغاءُ ضحيّةً** ⟶ ٤٠٩ برمزه — كان ٥٠٠ «تعذّر إلغاء المعاينة».
//   د.  الشكلُ الحرّ (ضغطتان معاً، ١٢ جولة): صفرُ ٥٠٠ وصفرُ تعليق.
//   هـ. **والثابتُ المحاسبيّ**: كلُّ جولةٍ «بِيع كاملاً» أو «لم يُبَع إطلاقاً».

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { isLockConflict, LOCK_CONFLICT_CODE } from "./concurrency";

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

//  **والرفضُ غير الملتقَط يُعَدّ**: هو بعينه ما كان يترك الطلبَ معلَّقاً.
let unhandled = 0;
const unhandledKinds: string[] = [];
process.on("unhandledRejection", (e: any) => {
  unhandled++;
  unhandledKinds.push(`${e?.name ?? "?"}: ${String(e?.message ?? e).slice(0, 80)}`);
});

const PORT = 6979;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سباق-الإلغاء-والبيع";
const RECV = 99860, DOC = 99861, EXPERT = 99862, ADMIN = 99863;
/** مهلةٌ أطولُ من `deadlock_timeout` بمراحل — تجاوزُها يعني تعليقاً حقيقياً. */
const HANG_MS = 8000;
const HUNG = "معلَّق-بلا-ردّ";

const perms = { canViewPatients: true, canAddPatients: true, canEditPatients: true };
const S: Record<string, any> = {
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: perms },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. سعد", permissions: { ...perms, canWriteMedicalExam: true } },
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
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status as number | string, body: json };
}
/** يردّ `HUNG` بدل أن ينتظر إلى الأبد — فالتعليقُ يُقاس لا يُعطّل الاختبار. */
const withHangGuard = (p: Promise<any>) =>
  Promise.race([p, new Promise<any>((r) => setTimeout(() => r({ status: HUNG, body: {} }), HANG_MS))]);

// ── بناءُ الحالة: مريضٌ بحلقةٍ على مسار المعاينة ومعاينةٌ موقّعة ومتابعة ──
let seq = 0;
async function buildCase(label: string) {
  const p = (await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition,
       amputation_site, branch_id, is_amputee, is_medical_support, is_physiotherapy,
       total_cost, patient_classification)
     VALUES ($1,$2,$3,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,true,false,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, `0776${String(6_000_000 + (seq += 1))}`, MARK]))[0].id;
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,1,'prosthetic',0,'manual','active')`, [p]);
  const ep = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
    { serviceType: "prosthetic", servicePath: "exam" });
  if (ep.status !== 201) throw new Error(`episode ${ep.status} ${JSON.stringify(ep.body)}`);
  const epId = (await q<{ id: number }>(
    `SELECT id FROM patient_device_episodes WHERE patient_id=$1`, [p]))[0].id;
  const exam = await http("POST", `/api/medical/patients/${p}/exams`, S.doc, {
    caseType: "prosthetic", deviceEpisodeId: epId, diagnosis: "تشخيص", plan: "خطة",
    idempotencyKey: `cancelsalerace-${seq}`,
  });
  if (exam.status !== 200) throw new Error(`exam ${exam.status} ${JSON.stringify(exam.body)}`);
  const examId = (await q<{ id: number }>(
    `SELECT id FROM medical_exams WHERE patient_id=$1`, [p]))[0].id;
  const fu = (await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE patient_id=$1`, [p]))[0].id;
  return { p, epId, examId, fu };
}

const cancelReq = (examId: number) =>
  http("POST", `/api/medical/exams/${examId}/cancel`, S.doc, { reason: "خطأ إدخال" });
const saleReq = (fu: number) =>
  http("POST", `/api/followups/${fu}/complete-sale`, S.recv,
    { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });

/**
 * **الأثرُ النهائيّ**: أمرٌ وقيدٌ ومتابعةٌ محوَّلة معاً، أو لا شيءَ منها —
 * فضحيّةُ الجمود تتراجع معاملتُها كاملةً بحكم Postgres.
 */
async function outcome(p: number, fu: number) {
  const wo = await q(`SELECT id FROM prosthetic_work_orders WHERE patient_id=$1`, [p]);
  const ce = await q(`SELECT id FROM cost_entries WHERE patient_id=$1`, [p]);
  const st = (await q<{ status: string }>(
    `SELECT status FROM post_exam_followups WHERE id=$1`, [fu]))[0]?.status ?? "?";
  const sold = wo.length === 1 && ce.length === 1 && st === "converted";
  const unsold = wo.length === 0 && ce.length === 0 && st !== "converted";
  return { sold, unsold, shape: `${wo.length}wo/${ce.length}ce/${st}` };
}

const deadlockCount = async () => Number((await q<{ deadlocks: string }>(
  `SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()`))[0].deadlocks);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const s of [
    `DELETE FROM patient_events WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN
       (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN
       (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
  ]) await q(s);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec, name] of [
    [RECV, "reception", "null", "ريام"],
    [DOC, "doctor", '["prosthetic","medical_support"]', "د. سعد"],
    [EXPERT, "prosthetics_expert", "null", "الخبير"],
    [ADMIN, "admin", "null", "المسؤول"],
  ] as any[]) {
    await q(`INSERT INTO system_users
               (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               is_active=true, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties`,
      [id, `csr_u${id}`, role, name, spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
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
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  const deadlocksBefore = await deadlockCount();

  try {
    // ══ أ. الوحدةُ الخالصة ═════════════════════════════════════════════
    console.log(`\n── أ. تصنيفُ التعارض (بلا قاعدة بيانات) ──`);
    check(isLockConflict({ code: "40P01" }), "أ١. الجمودُ تعارض");
    check(isLockConflict({ code: "40001" }), "أ٢. وفشلُ التسلسل أخوه");
    check(!isLockConflict({ code: "23505" }), "أ٣. والفريدُ المكسور ليس منه");
    check(!isLockConflict({ code: "23503" }), "أ٤. ولا المفتاحُ الأجنبيّ");
    check(!isLockConflict({ code: "55P03" }), "أ٥. ولا مهلةُ القفل — لها رسالتُها");
    check(!isLockConflict(new Error("boom")), "أ٦. ولا خطأٌ بلا رمز");
    check(!isLockConflict(null) && !isLockConflict(undefined), "أ٧. ولا العدم");

    // ══ ب. البيعُ ضحيّةً — كان معلَّقاً بلا ردٍّ أبداً ═══════════════════
    //  جلسةٌ مساعدة تلعب دورَ قفلِ الإلغاء بالضبط: تمسك الحلقةَ ثمّ تطلب
    //  المتابعة، فتكتمل الحلقةُ نفسُها والبيعُ هو مَن بدأ الانتظارَ أوّلاً.
    console.log(`\n── ب. البيعُ ضحيّةَ الجمود ──`);
    {
      const { p, epId, fu } = await buildCase("ب");
      const X = await pool.connect();
      let sale: any = null;
      try {
        await X.query("BEGIN");
        await X.query("SELECT id FROM patient_device_episodes WHERE id=$1 FOR UPDATE", [epId]);
        const inflight = withHangGuard(saleReq(fu));
        await new Promise((r) => setTimeout(r, 600));
        X.query("SELECT id FROM post_exam_followups WHERE id=$1 FOR UPDATE", [fu])
          .catch(() => { /* قد تكون X هي الضحيّة */ });
        sale = await inflight;
      } finally {
        try { await X.query("ROLLBACK"); } catch { /* */ }
        X.release();
      }
      check(sale.status !== HUNG, "ب١. **البيعُ يصل ردُّه** — لا تعليقَ بلا ردّ",
        JSON.stringify(sale));
      same("ب٢. وهو ٤٠٩ تعارضاً لا ٥٠٠ ولا صمتاً", sale.status, 409);
      same("ب٣. برمزه المقروء", sale.body?.code, LOCK_CONFLICT_CODE);
      check(typeof sale.body?.error === "string" && sale.body.error.includes("حدّث الصفحة"),
        "ب٤. وبرسالةٍ تقول ما يفعله الموظّف", JSON.stringify(sale.body));
      const o = await outcome(p, fu);
      check(o.unsold, "ب٥. **ولم يقع بيعٌ ولا نصفُه**: لا أمرَ ولا قيدَ كلفة", o.shape);
    }

    // ══ ج. الإلغاءُ ضحيّةً — كان ٥٠٠ «تعذّر إلغاء المعاينة» ═════════════
    console.log(`\n── ج. الإلغاءُ ضحيّةَ الجمود ──`);
    {
      const { p, epId, examId, fu } = await buildCase("ج");
      const X = await pool.connect();
      let cancel: any = null;
      try {
        await X.query("BEGIN");
        await X.query("SELECT id FROM post_exam_followups WHERE id=$1 FOR UPDATE", [fu]);
        const inflight = withHangGuard(cancelReq(examId));
        await new Promise((r) => setTimeout(r, 600));
        X.query("SELECT id FROM patient_device_episodes WHERE id=$1 FOR UPDATE", [epId])
          .catch(() => { /* قد تكون X هي الضحيّة */ });
        cancel = await inflight;
      } finally {
        try { await X.query("ROLLBACK"); } catch { /* */ }
        X.release();
      }
      check(cancel.status !== HUNG, "ج١. الإلغاءُ يصل ردُّه", JSON.stringify(cancel));
      same("ج٢. **وهو ٤٠٩ تعارضاً لا ٥٠٠**", cancel.status, 409);
      same("ج٣. برمزه المقروء", cancel.body?.code, LOCK_CONFLICT_CODE);
      check(typeof cancel.body?.error === "string" && !cancel.body.error.includes("تعذّر"),
        "ج٤. ولا يقول «تعذّر» فيظنّ الطبيبُ النظامَ معطوباً", JSON.stringify(cancel.body));
      const ca = await q(`SELECT c.id FROM medical_exam_cancellations c
                            JOIN medical_exams e ON e.id=c.exam_id WHERE e.patient_id=$1`, [p]);
      same("ج٥. **ولم تُكتب شاهدةُ إلغاء** — المعاملةُ تراجعت كاملةً", ca.length, 0);
      const o = await outcome(p, fu);
      check(o.unsold, "ج٦. ولا بيعَ وقع", o.shape);
    }

    // ══ د+هـ. الشكلُ الحرّ — ضغطتان معاً، والحَكَمُ Postgres ═══════════
    console.log(`\n── د. الشكلُ الحرّ (١٢ جولة) ──`);
    {
      const ROUNDS = 12;
      const statuses: (number | string)[] = [];
      const shapes: string[] = [];
      let torn = 0;
      for (let i = 0; i < ROUNDS; i++) {
        const { p, examId, fu } = await buildCase(`د${i}`);
        const [cancel, sale] = await Promise.all([
          withHangGuard(cancelReq(examId)),
          withHangGuard(saleReq(fu)),
        ]);
        statuses.push(cancel.status, sale.status);
        const o = await outcome(p, fu);
        shapes.push(o.shape);
        if (!o.sold && !o.unsold) torn++;
      }
      const hung = statuses.filter((s) => s === HUNG);
      const five = statuses.filter((s) => typeof s === "number" && s >= 500);
      const odd = statuses.filter((s) => s !== 200 && s !== 409);
      same("د١. **صفرُ تعليقٍ بلا ردّ** في أربعٍ وعشرين استجابة", hung.length, 0);
      same("د٢. **وصفرُ خطأِ خادم**", five.length, 0);
      same("د٣. وكلُّ ردٍّ ٢٠٠ أو ٤٠٩ لا ثالثَ", odd.length, 0);
      check(statuses.filter((s) => s === 200).length >= 1,
        "د٤. وفائزٌ واحدٌ على الأقلّ نجح فعلاً", JSON.stringify(statuses));
      same("هـ١. **والثابتُ المحاسبيّ**: لا جولةَ ممزّقة", torn, 0);
      check(shapes.every((s) => s === "1wo/1ce/converted" || s.startsWith("0wo/0ce/")),
        "هـ٢. كلُّ جولةٍ «بِيع كاملاً» أو «لم يُبَع إطلاقاً»",
        JSON.stringify([...new Set(shapes)]));
    }

    // ══ هـ٣. والاختبارُ ليس فارغاً: جمودٌ وقع فعلاً ════════════════════
    await new Promise((r) => setTimeout(r, 300));
    const dl = (await deadlockCount()) - deadlocksBefore;
    check(dl >= 2, `هـ٣. **جمودٌ حقيقيٌّ وقع فعلاً** (Δ=${dl}) — فالحراسةُ تُمارَس لا تُدّعى`,
      `deadlocks Δ = ${dl}`);
    same("هـ٤. **وصفرُ رفضٍ غير ملتقَط** — لا طلبَ يُترَك بلا ردّ",
      unhandled, 0);
    if (unhandled) for (const u of unhandledKinds.slice(0, 5)) console.log(`      · ${u}`);
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }

  console.log(failures === 0
    ? "\n🎉 كل الفحوص نجحت."
    : `\n❌ ${failures} فحصاً فشل.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
