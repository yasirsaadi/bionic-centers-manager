// **ذرّيةُ الحذف النهائي الكاملة** — قفلٌ واحد، معاملةٌ واحدة، لا حذفٌ
// مضاعف ولا تدقيقٌ يتيم. حيّاً على Postgres وعلى النقاط الحقيقية.
//
// ══ الثابتُ الذي يحرسه (مراجعة ٢٠٢٦-٠٨-٢٤ — تصحيحُ العائقين الأخيرين)
//    ═══════════════════════════════════════════════════════════════════
// الصياغةُ الأولى لـ`purgePatient` فتحت القفلَ والفحصَ واللقطةَ المالية
// وسطرَ التدقيق في اتصالاتٍ/معاملاتٍ مستقلّة، ثمّ نادت `storage.
// deletePatient` التي تفتح معاملتَها **الخاصّة** — فخمسُ عملياتٍ منفصلة
// لا معاملةٌ واحدة. وهذا يثبت (بندَ بندٍ):
//   • ضغطتان متزامنتان لحذفٍ نهائيّ على المريض نفسِه ⟶ واحدةٌ تنجح
//     بالضبط، والأخرى تُردّ بلا هدمٍ ثانٍ ولا سطرِ تدقيقٍ ثانٍ ولا وسمِ
//     قيدٍ مضاعف.
//   • فشلٌ حقيقيّ داخل الكاسكيد (زُرع بترِكرٍ مؤقّت على جدولٍ حقيقيّ —
//     لا `pg_temp`، فالاتصالُ الذي يُنفّذ الحذفَ الفعليّ اتصالٌ آخر غير
//     اتصال الاختبار) يُسقط سطرَ التدقيق **وكلَّ ما سبقه من حذوفٍ** في
//     المعاملة نفسِها معه — لا تدقيقَ يزعم هدماً لم يقع، ولا هدمَ جزئيّاً
//     صامتاً.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { createJournalForPayment } from "./accounting/auto_journal";

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

const PORT = 6863;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-ذرية-الحذف-النهائي";
const ADMIN = 9981;
const USERS = [ADMIN];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true },
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
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

//  **مُتتبَّعةٌ صراحةً لا بمطابقة `referral_source` عند التنظيف**: مريضٌ
//  حُذف نهائياً أثناء الاختبار نفسِه يغادر جدول `patients` — فلا يبقى ما
//  يربط سطرَ تدقيقه بالعلامة عند التنظيف الختاميّ إلّا هذه القائمة.
const createdPatientIds: number[] = [];

async function mkPatient(label: string): Promise<number> {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, total_cost,
       patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',1,true,0,'new')
     RETURNING id`,
    [`${MARK} ${label}`, MARK]);
  createdPatientIds.push(r[0].id);
  return r[0].id;
}

const del = (id: number, session: any, reason: any = "طلب المالك") =>
  http("DELETE", `/api/patients/${id}`, session, { reason });
const purge = (id: number, session: any, reason: any = "اختبار الذرّية") =>
  http("POST", `/api/patient-trash/${id}/purge`, session, { reason });

/** يدفع الحذفَ إلى ما وراء مهلة الاستعادة — نفسُ محاكاة بقية الملفّات. */
const expire = (id: number) => q(
  `UPDATE patients SET deleted_at = NOW() - interval '40 days',
     restore_until = NOW() - interval '10 days' WHERE id=$1`, [id]);

const purgeAuditCount = async (id: number) => (await q<{ n: number }>(
  `SELECT count(*)::int n FROM audit_log
    WHERE entity_type='patient' AND entity_id=$1 AND action='purge'`, [id]))[0].n;

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  //  **بالمعرّفات المُتتبَّعة صراحةً لا بمطابقة `referral_source` وحدها**:
  //  مريضٌ حُذف نهائياً أثناء الاختبار غادر `patients`، فسطرُ تدقيقه لم
  //  يعد له صفٌّ يربطه بالعلامة — والقائمةُ الصريحة تبقى تعرفه.
  if (createdPatientIds.length > 0) {
    await q(`DELETE FROM audit_log WHERE entity_type='patient'
              AND entity_id = ANY($1::int[])`, [createdPatientIds]);
  }
  //  وحارسٌ إضافيّ لأيّ ترِكرِ اختبارٍ نسيَته دورةٌ سابقة فشلت في المنتصف.
  await q(`DROP TRIGGER IF EXISTS trg_sabotage_cost_entries_test ON cost_entries`);
  await q(`DROP FUNCTION IF EXISTS sabotage_cost_entries_for_test()`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,$2,'x','المسؤول','admin',1,'[1]'::jsonb,true)
           ON CONFLICT (id) DO UPDATE SET role='admin', display_name='المسؤول',
             is_active=true, branch_id=1, branch_ids='[1]'::jsonb`,
    [ADMIN, `pt_atom_u${ADMIN}`]);
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

    // ══ أ. ضغطتان متزامنتان لحذفٍ نهائيّ واحد ═══════════════════════════
    console.log("\n── أ. الضغطةُ المزدوجة للحذف النهائي ──");
    {
      const pid = await mkPatient("سباقُ الحذف");
      const [c] = await q<{ id: number }>(
        `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
         VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [pid]);
      //  دفعةٌ حقيقيةٌ + قيدُها — لإثبات أن `purged_patient_money` يُكتب
      //  مرّةً واحدة بالضبط رغم السباق، لا صفراً ولا مرّتين.
      const [payRow] = await q(
        `INSERT INTO payments (patient_id, branch_id, case_id, amount, date, payment_treatment_type)
         VALUES ($1,1,$2,50000,NOW(),'أطراف صناعية') RETURNING *`, [pid, c.id]);
      await createJournalForPayment({
        id: payRow.id, patientId: payRow.patient_id, branchId: payRow.branch_id,
        caseId: payRow.case_id, amount: payRow.amount, date: payRow.date,
        paymentTreatmentType: payRow.payment_treatment_type, notes: payRow.notes,
      } as any, ADMIN);
      const [entry] = await q<{ id: number }>(
        `SELECT id FROM journal_entries WHERE source_type='payment' AND source_id=$1`, [payRow.id]);
      check(entry !== undefined, "أ٠. القيدُ أُنشئ فعلاً ليُبنى عليه الاختبار");

      const delRes = await del(pid, S.admin, "قبل السباق");
      same("أ١. الحذفُ الناعم ينجح تمهيداً للسباق", delRes.status, 200);
      await expire(pid);

      //  ══ الضغطتان معاً — لا تسلسلَ من طرف الاختبار، Postgres وحده
      //  يفرض التسلسل عبر قفل `FOR UPDATE`. ═══════════════════════════
      const [r1, r2] = await Promise.all([
        purge(pid, S.admin, "سباقٌ أ"),
        purge(pid, S.admin, "سباقٌ ب"),
      ]);
      const codes = [r1.status, r2.status].sort((a, b) => a - b);
      check(codes[0] === 200 && (codes[1] === 404 || codes[1] === 409),
        "أ٢. **ضغطتان متزامنتان تُنتجان حذفاً نهائياً واحداً بالضبط، والأخرى تُردّ بتحكّم**",
        JSON.stringify(codes));

      same("أ٣. **والصفُّ ذهب فعلاً**",
        (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [pid]))[0].n, 0);
      same("أ٤. **ولا صفَّ حالةٍ يتيم** — الكاسكيدُ نفَّذ مرّةً واحدة لا مرّتين",
        (await q(`SELECT count(*)::int n FROM patient_cases WHERE patient_id=$1`, [pid]))[0].n, 0);
      same("أ٥. **وسطرُ تدقيقِ «حذف نهائي» واحدٌ بالضبط لهذا المريض**",
        await purgeAuditCount(pid), 1);
      same("أ٦. **وقيدُ الدفعة مُوسَمٌ `purged_patient_money=TRUE` مرّةً واحدة** — لا كتابةً مضاعفة",
        (await q(`SELECT count(*)::int n FROM journal_entries
                    WHERE id=$1 AND purged_patient_money=TRUE`, [entry!.id]))[0].n, 1);
      same("أ٧. **ورابطُ المريض على سطر القيد مُنزوعٌ فعلاً**",
        (await q(`SELECT count(*)::int n FROM journal_lines
                    WHERE entry_id=$1 AND patient_id IS NOT NULL`, [entry!.id]))[0].n, 0);
    }

    // ══ ب. فشلٌ حقيقيّ داخل الكاسكيد يُسقط التدقيق وكلَّ ما سبقه معه ═════
    console.log("\n── ب. تراجعُ المعاملة كاملةً مع فشل الكاسكيد ──");
    {
      const pid = await mkPatient("فشلٌ مزروع");
      const [payRow] = await q(
        `INSERT INTO payments (patient_id, branch_id, amount, date, payment_treatment_type)
         VALUES ($1,1,12345,NOW(),'أطراف صناعية') RETURNING id`, [pid]);
      const [costRow] = await q(
        `INSERT INTO cost_entries (patient_id, branch_id, amount, source)
         VALUES ($1,1,12345,'manual') RETURNING id`, [pid]);

      const delRes = await del(pid, S.admin, "قبل الفشل المزروع");
      same("ب١. الحذفُ الناعم ينجح", delRes.status, 200);
      await expire(pid);

      const before = (await q(
        `SELECT deleted_at, restore_until FROM patients WHERE id=$1`, [pid]))[0];
      const auditBefore = await purgeAuditCount(pid);
      same("ب٢. ولا سطرَ تدقيقِ «حذف نهائي» بعد", auditBefore, 0);

      //  ترِكرٌ **حقيقيّ لا `pg_temp`** — الاتصالُ الذي ينفّذ الحذفَ
      //  الفعليّ (خلف نقطة REST) اتصالٌ مختلفٌ عن اتصال هذا الاختبار،
      //  فترِكرَ الجلسة لا يراه. يرفض حذف `cost_entries` **لهذا المريض
      //  بعينه فقط** — لا يمسّ أيَّ صفٍّ آخر في القاعدة المشتركة.
      await q(`
        CREATE OR REPLACE FUNCTION sabotage_cost_entries_for_test() RETURNS trigger AS $f$
        BEGIN
          IF OLD.patient_id = ${pid} THEN
            RAISE EXCEPTION 'فشلٌ مزروعٌ للاختبار — لا يمثّل عطباً حقيقياً';
          END IF;
          RETURN OLD;
        END;
        $f$ LANGUAGE plpgsql;
      `);
      await q(`
        CREATE TRIGGER trg_sabotage_cost_entries_test BEFORE DELETE ON cost_entries
        FOR EACH ROW EXECUTE FUNCTION sabotage_cost_entries_for_test();
      `);

      let sabotaged: { status: number; body: any };
      try {
        sabotaged = await purge(pid, S.admin, "محاولةٌ ستفشل عمداً");
      } finally {
        //  **نزعُ الفخّ فوراً** — قبل أيّ تأكيدٍ آخر، كي لا يُفسد اختباراً
        //  تالياً أو التنظيفَ النهائيّ لو طرأ خطأٌ غير متوقَّع هنا.
        await q(`DROP TRIGGER IF EXISTS trg_sabotage_cost_entries_test ON cost_entries`);
        await q(`DROP FUNCTION IF EXISTS sabotage_cost_entries_for_test()`);
      }
      check(sabotaged!.status >= 500,
        "ب٣. **ومحاولةُ الحذف تفشل فعلاً** (٥٠٠ — عطبٌ غيرُ متوقَّع لا حالةَ عمل)",
        String(sabotaged!.status));

      const after = (await q(
        `SELECT deleted_at, restore_until FROM patients WHERE id=$1`, [pid]))[0];
      check(after !== undefined, "ب٤. **والمريضُ ما زال موجوداً** — لم يُهدَم شيء");
      same("ب٥. **وختمُ الحذف والمهلة لم يتغيّرا حرفاً** — لا نصفَ كتابة",
        after && { deletedAt: String(after.deleted_at), restoreUntil: String(after.restore_until) },
        before && { deletedAt: String(before.deleted_at), restoreUntil: String(before.restore_until) });
      same("ب٦. **ولا سطرَ تدقيقٍ جديد يزعم حذفاً نهائياً لم يقع**",
        await purgeAuditCount(pid), auditBefore);
      same("ب٧. **والدفعةُ التي كانت لتُحذف قبل الفشل بقيت** — تراجعٌ كاملٌ لا جزئيّ",
        (await q(`SELECT count(*)::int n FROM payments WHERE id=$1`, [payRow.id]))[0].n, 1);
      same("ب٨. **وصفُّ الكلفة نفسُه (نقطةُ الفشل) لم يُحذف**",
        (await q(`SELECT count(*)::int n FROM cost_entries WHERE id=$1`, [costRow.id]))[0].n, 1);

      //  ══ وبعد نزع الفخّ، الحذفُ النهائيُّ الطبيعيُّ يعمل كما كان ══════
      const clean = await purge(pid, S.admin, "بعد نزع الفخّ");
      same("ب٩. **وحذفٌ نهائيٌّ طبيعيّ بعد نزع الفخّ ينجح** — النظامُ لم يُكسَر", clean.status, 200);
      same("ب١٠. والصفُّ ذهب فعلاً هذه المرّة",
        (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [pid]))[0].n, 0);
      same("ب١١. وسطرُ تدقيقٍ واحدٌ بالضبط للنجاح الحقيقيّ", await purgeAuditCount(pid), 1);
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كلُّ فحوص ذرّية الحذف النهائي نجحت"
    : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
