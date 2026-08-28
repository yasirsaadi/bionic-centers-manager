// تعديلُ المعاينة — سلطةٌ سريريةٌ كاملة للطبيب، وتجاريةٌ صفر (القسم 4.h،
// تنقيحٌ ثانٍ، ٢٠٢٦-٠٨-٢٨). حيّاً على Postgres وعلى النقطة نفسها.
// قاعدة محلّية: `npm run test:exam-edit-commercial`.
//
// ══ القاعدة ═══════════════════════════════════════════════════════════
// الطبيبُ العاديّ — لا مسؤولٌ عام ولا مديرُ فرع (`isNormalDoctorAuthor` في
// `server/medical/routes.ts`) — يحتفظ بكامل سلطته على تعديل المحتوى
// السريريّ لمعاينته هو: التشخيص، الشكوى الرئيسية، الموجودات، الخطة،
// الملاحظات، الوصفة/المواصفات — أيّ حقلٍ طبّيّ قائم. **وسلطتُه التجارية
// صفر**: `deviceCost` و`proposedExpertUserId` اللذان يرسلهما عبر `PATCH`
// يُتجاهَلان بصمت مهما كانت قيمتُهما — لا تُطبَّقان، ولا تُزامَنان مع سعر
// المتابعة التجاريّ، ولا تُحرّكان مجموعَ المريض أو كلفةَ الخيط أو دفترَ
// القيود، ولا تُنشئان تصنيعاً ولا تُعدّلانه. **ولا يُردّ الطلبُ لهذا
// السبب**: الشقُّ السريريُّ من نفس الطلب ينجح دائماً. والمسؤولُ العام
// (`session.isAdmin`) ومديرُ الفرع يحتفظان بسلطتهما كاملةً كما كانت —
// لا توسيعَ ولا تضييقَ عليهما في هذه المهمّة.
//
// ══ ما يحرسه هذا الملفّ ═══════════════════════════════════════════════
// (أ) تعديلُ الطبيب السريريّ الكامل — تشخيصٌ · حقولٌ أخرى · وصفة.
// (ب) نفسُ الطلب: الحقولُ التجارية تُتجاهَل، والسريريُّ ينجح — بعد بيعٍ
//     حقيقيّ بسعرٍ وخبيرٍ وأمرِ تصنيعٍ قائم، فلا شيءَ منها يُمَسّ.
// (ج) المسؤولُ العام يحتفظ بسلطته الإدارية التاريخية كاملةً.
// (د) مديرُ الفرع كما كان — بلا توسيعٍ ولا تضييق.
// (هـ) عقدُ المصدر: الحارسُ من الدور القائم لا من هويّةٍ مُقحَمة.
//
// ══ ما لا يختبره هذا الملفّ (مُختبَرٌ في مكانٍ آخر) ═══════════════════════
// مصفوفةُ «مَن يملك التعديل أصلاً» (طبيبٌ آخر/استقبال/محاسب/خبير ⟶ ٤٠٣)
// وميكانيكا التزامن/الذرّية/السباق بعد البيع مُختبَرةٌ بعمقٍ في
// `exam_price_correction.test.ts` (قسم ي) — هذا الملفّ يثبت **مَن يملك
// الحقلَ** فحسب، بأقلّ سيناريوهاتٍ تكفي.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";
import { readFileSync } from "fs";

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

const PORT = 6858;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تعديل-المعاينة-التجاري";
const ADMIN = 9901, RECV = 9902, MGR = 9903, DOC = 9904, DOC2 = 9905, EXPERT = 9906;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, DOC2, EXPERT];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  doc2: {
    userId: DOC2, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. الزميل", permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {},
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
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',$3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}

/** توقيعٌ نظيف — بلا أيّ حقلٍ تجاريّ، كالشاشة الحقيقية بعد التبسيط (4.h). */
async function signExam(patientId: number, session: any = S.doc, caseType = "prosthetic") {
  return http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType, diagnosis: "بتر تحت الركبة", prescription: {},
  });
}

/**
 * يزرع قيمةً تجاريةً «تاريخية» مباشرةً على معاينةٍ موقّعة — تماماً كما
 * توثّق CLAUDE.md: الترِكرُ (٠٢٨) يرفض أيّ `UPDATE` لم يفتح البابَ
 * المراقَب صراحةً، فيُفتح هنا داخل معاملةٍ واحدة على نفس الاتصال. هذا
 * يُحاكي معاينةً وقّعها طبيبٌ **قبل** هذا التبسيط (٢٠٢٦-٠٨-٢٨) وكانت
 * تحمل كلفةً/خبيراً مقترَحَين — والنقطةُ الحيّة لا تكتب هذين الحقلين
 * عند التوقيع بعد اليوم، فلا طريقَ آخر لبناء هذه الحالة.
 */
async function sealedSeed(examId: number, deviceCost: number, expertId: number | null) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL app.allow_exam_edit = 'on'`);
    await client.query(
      `UPDATE medical_exams SET device_cost=$2, proposed_expert_user_id=$3 WHERE id=$1`,
      [examId, deviceCost, expertId]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  await q(`UPDATE post_exam_followups SET approved_price=$2 WHERE medical_exam_id=$1`,
    [examId, deviceCost]);
}

const editExam = (examId: number, session: any, body: any) =>
  http("PATCH", `/api/medical/exams/${examId}`, session, body);

async function examRow(examId: number) {
  const [r] = await q(
    `SELECT version, diagnosis, chief_complaint, clinical_findings, plan, notes,
            prescription, device_cost::int AS device_cost, proposed_expert_user_id
       FROM medical_exams WHERE id=$1`, [examId]);
  return r;
}
async function revisionCount(examId: number) {
  return (await q(`SELECT count(*)::int AS n FROM medical_exam_revisions WHERE exam_id=$1`,
    [examId]))[0].n;
}
async function followupOf(patientId: number) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, S.admin);
  return (Array.isArray(r.body) ? r.body : [])[0] ?? null;
}
async function money(patientId: number, caseType = "prosthetic") {
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const [c] = await q(
    `SELECT cost::int AS cost FROM patient_cases WHERE patient_id=$1 AND case_type=$2`,
    [patientId, caseType]);
  const [e] = await q(
    `SELECT COALESCE(SUM(amount),0)::int AS sum FROM cost_entries WHERE patient_id=$1`,
    [patientId]);
  return { total: p?.total ?? 0, caseCost: c?.cost ?? 0, ledger: e.sum };
}
async function manufacturingCount(patientId: number) {
  return (await q(`SELECT count(*)::int AS n FROM prosthetic_work_orders WHERE patient_id=$1`,
    [patientId]))[0].n;
}

/** جهازٌ مباعٌ فعلاً بسعرٍ وخبيرٍ «تاريخيَّين» — أقوى حالةٍ لحماية القسم (ب). */
async function soldDeviceWithLegacyPrice(label: string, price: number, expertId: number) {
  const patientId = await mkPatient(label);
  const caseId = await mkCase(patientId);
  const ep = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR,
  });
  const sign = await signExam(patientId);
  const examId = sign.body.id;
  await sealedSeed(examId, price, expertId);
  const f = await followupOf(patientId);
  const buy = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv,
    { expertUserId: expertId });
  return { patientId, caseId, episodeId: (ep as any).id ?? ep, examId, followupId: f.id, buy };
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
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM audit_log WHERE entity_type='medical_exam' AND entity_id IN
             (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
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
    [DOC2, "doctor", "د. الزميل", 1, '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `eec_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session-b64"];
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
  const server = createServer(app);
  await registerRoutes(server as any, app as any);
  (app as any).use = realUse;
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══════════════════════════════════════════════════════════════════
    //  أ) **الطبيبُ يعدّل سريرياً — كاملاً**: تشخيصٌ · حقولٌ أخرى · وصفة.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ) الطبيبُ يعدّل سريرياً — كاملاً ──");
    {
      const p = await mkPatient("تعديلٌ سريريّ كامل");
      await mkCase(p);
      const sign = await signExam(p);
      const examId = sign.body.id;
      const original = await examRow(examId);
      same("١. (وُقِّعت نظيفة: نسخة ١ وبلا حقلٍ تجاريّ)",
        [original.version, original.device_cost, original.proposed_expert_user_id],
        [1, null, null]);

      //  ١) التشخيص وحده.
      const r1 = await editExam(examId, S.doc,
        { caseType: "prosthetic", diagnosis: "بتر تحت الركبة — تعديلٌ أوّل", prescription: {} });
      same("٢. **الطبيبُ يعدّل التشخيصَ وينجح**", r1.status, 200);
      same("٣. **والتشخيصُ صار الجديد**", (await examRow(examId)).diagnosis,
        "بتر تحت الركبة — تعديلٌ أوّل");

      //  ٢) بقيّة الحقول السردية معاً.
      const r2 = await editExam(examId, S.doc, {
        caseType: "prosthetic", diagnosis: "بتر تحت الركبة — تعديلٌ أوّل",
        chiefComplaint: "ألمٌ عند الحركة", clinicalFindings: "تورّمٌ خفيف",
        plan: "إعادة تأهيل ٦ أسابيع", notes: "متابعةٌ أسبوعية", prescription: {},
      });
      same("٤. **ويعدّل بقيّةَ الحقول السردية معاً وينجح**", r2.status, 200);
      const afterNarrative = await examRow(examId);
      same("٥. **وكلُّها صارت الجديدة**",
        [afterNarrative.chief_complaint, afterNarrative.clinical_findings,
          afterNarrative.plan, afterNarrative.notes],
        ["ألمٌ عند الحركة", "تورّمٌ خفيف", "إعادة تأهيل ٦ أسابيع", "متابعةٌ أسبوعية"]);

      //  ٣) الوصفة/المواصفات (حقلٌ حقيقيّ من `shared/case_fields.ts`).
      const r3 = await editExam(examId, S.doc, {
        caseType: "prosthetic", diagnosis: "بتر تحت الركبة — تعديلٌ أوّل",
        prescription: { prostheticType: "فوق الركبة" },
      });
      same("٦. **ويعدّل الوصفة/المواصفات وينجح**", r3.status, 200);
      same("٧. **والوصفةُ صارت الجديدة**",
        (await examRow(examId)).prescription?.prostheticType, "فوق الركبة");

      //  ٤) والتاريخُ محفوظٌ عبر الثلاثة — الأصلُ يبقى مقروءاً.
      same("٨. **وثلاثُ نسخٍ محفوظة، والمعاينةُ على الرابعة**",
        [await revisionCount(examId), (await examRow(examId)).version], [3, 4]);
      const revs = await q(
        `SELECT version, diagnosis FROM medical_exam_revisions WHERE exam_id=$1 ORDER BY version`,
        [examId]);
      same("٩. **والنسخةُ الأولى تحمل التشخيصَ الأصليّ حرفياً** — لا يُمحى",
        revs[0]?.diagnosis, "بتر تحت الركبة");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب) **نفسُ الطلب: التجاريُّ يُتجاهَل، والسريريُّ ينجح** — بعد بيعٍ
    //     حقيقيّ بسعرٍ وخبيرٍ وأمرِ تصنيعٍ قائم.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب) نفسُ الطلب: التجاريُّ يُتجاهَل، والسريريُّ ينجح ──");
    {
      const d = await soldDeviceWithLegacyPrice("طلبٌ مزدوج", 1_700_000, EXPERT);
      same("١٠. (البيعُ اعتُمد وبدأ التصنيع بسعرٍ تاريخيّ)", d.buy.status, 200);
      const before = {
        exam: await examRow(d.examId),
        followup: await followupOf(d.patientId),
        money: await money(d.patientId),
        wos: await manufacturingCount(d.patientId),
      };
      same("١١. (الحالُ قبل المحاولة: سعرٌ وخبيرٌ وأمرُ تصنيعٍ واحد)",
        [before.exam.device_cost, before.exam.proposed_expert_user_id,
          before.followup?.approvedPrice, before.wos],
        [1_700_000, EXPERT, 1_700_000, 1]);

      //  الطبيبُ نفسُه يرسل تصحيحاً تجارياً كاملاً (سعرٌ + خبيرٌ وهميّ +
      //  سببٌ) بالتزامن مع تعديلٍ سريريّ حقيقيّ، في طلبٍ واحد.
      const r = await editExam(d.examId, S.doc, {
        caseType: "prosthetic",
        diagnosis: "بتر تحت الركبة — تصحيحٌ سريريّ بحت",
        prescription: {},
        deviceCost: 2_500_000,
        proposedExpertUserId: 999999, // وهميّ عمداً — لا يُتحقَّق منه أصلاً
        priceCorrectionReason: "محاولةُ الطبيب نفسِه",
      });
      same("١٢. **والطلبُ ينجح (٢٠٠)** — لا يُردّ لوجود حقولٍ تجارية فيه",
        r.status, 200);
      same("١٣. **والتشخيصُ صار الجديد فعلاً**", r.body?.diagnosis,
        "بتر تحت الركبة — تصحيحٌ سريريّ بحت");

      const after = {
        exam: await examRow(d.examId),
        followup: await followupOf(d.patientId),
        money: await money(d.patientId),
        wos: await manufacturingCount(d.patientId),
      };
      same("١٤. **ولا سعرَ المعاينة تحرّك** — يبقى السعرَ التاريخيّ",
        after.exam.device_cost, 1_700_000);
      same("١٥. **ولا الخبيرَ المقترَح تحرّك** — والقيمةُ الوهمية لم تُطبَّق ولا رُفضت",
        after.exam.proposed_expert_user_id, EXPERT);
      same("١٦. **ولا سعرُ المتابعة التجاريّ تزامن**",
        [after.followup?.approvedPrice, after.followup?.priceSource],
        [before.followup?.approvedPrice, before.followup?.priceSource]);
      same("١٧. **ولا حقيقةَ المريض المالية تحرّكت** — المجموع وكلفةُ الخيط ودفترُ القيود",
        JSON.stringify(after.money), JSON.stringify(before.money));
      same("١٨. **ولا أمرَ تصنيعٍ جديدٍ أُنشئ ولا القائمُ تغيّر**", after.wos, before.wos);
      check(r.body?.priceNote == null,
        "١٩. **ولا `priceNote` يعود** — لا شيءَ ماليّ وقع ليُقال عنه",
        String(r.body?.priceNote));
      same("٢٠. **والنسخةُ تتقدّم رغم ذلك** — التاريخُ محفوظٌ ولو لم يتحرّك المال",
        after.exam.version > before.exam.version, true);
      same("   والنسخةُ الجديدة تحمل حالةَ ما قبل المحاولة",
        (await q(`SELECT diagnosis FROM medical_exam_revisions
                   WHERE exam_id=$1 ORDER BY version DESC LIMIT 1`, [d.examId]))[0]?.diagnosis,
        "بتر تحت الركبة");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج) **المسؤولُ العام يحتفظ بسلطته الإدارية التاريخية كاملةً**.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج) المسؤولُ العام يحتفظ بسلطته كاملةً ──");
    {
      const p = await mkPatient("سلطة المسؤول");
      await mkCase(p);
      const sign = await signExam(p);
      const examId = sign.body.id;
      await sealedSeed(examId, 1_000_000, null);
      const r = await editExam(examId, S.admin, {
        caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
        deviceCost: 1_200_000,
      });
      same("٢١. **والمسؤولُ العام يصحّح فعلاً** — لا حجبَ عليه", r.status, 200);
      same("٢٢. **وسعرُ المعاينة صار الجديد**",
        (await examRow(examId)).device_cost, 1_200_000);
      same("٢٣. **وسعرُ المتابعة تبعه** — التزامنُ يقع فعلاً",
        (await followupOf(p))?.approvedPrice, 1_200_000);
    }

    // ══════════════════════════════════════════════════════════════════
    //  د) **مديرُ الفرع كما كان — بلا توسيعٍ ولا تضييق**.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د) مديرُ الفرع كما كان ──");
    {
      const p = await mkPatient("سلطة مدير الفرع");
      await mkCase(p);
      const sign = await signExam(p);
      const examId = sign.body.id;
      await sealedSeed(examId, 800_000, null);
      const r = await editExam(examId, S.mgr, {
        caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
        deviceCost: 950_000,
      });
      same("٢٤. **ومديرُ الفرع يصحّح كما كان يفعل قبل هذه المهمّة**", r.status, 200);
      same("٢٥. **وسعرُ المعاينة صار الجديد**",
        (await examRow(examId)).device_cost, 950_000);
      same("٢٦. **وسعرُ المتابعة تبعه**", (await followupOf(p))?.approvedPrice, 950_000);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ) **عقدُ المصدر** — الحارسُ من الدور القائم لا من هويّةٍ مُقحَمة.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ) عقد المصدر ──");
    {
      const routes = readFileSync("server/medical/routes.ts", "utf8");
      check(/const isNormalDoctorAuthor = isAuthor && !isResponsibleManager;/.test(routes),
        "٢٧. **`isNormalDoctorAuthor` معرَّفةٌ بدقّة**: صاحبُ المعاينة بلا صفةٍ إدارية", "");
      check(/req\.body\?\.deviceCost === undefined \|\| isNormalDoctorAuthor/.test(routes),
        "٢٨. **وحقلُ الكلفة محروسٌ بها**", "");
      check(/req\.body\?\.proposedExpertUserId === undefined \|\| isNormalDoctorAuthor/.test(routes),
        "٢٩. **وحقلُ الخبير المقترَح محروسٌ بها كذلك**", "");
      check(/isResponsibleManager = session\.isAdmin \|\| session\.role === "branch_manager"/
        .test(routes),
      "٣٠. **والآليّةُ من صلاحية الجلسة القائمة نفسِها** — `session.isAdmin`/`session.role`", "");
      //  ولا هويّةٌ مُقحَمة في أيّ مكانٍ من الملفّ: لا اسمَ مالكٍ، ولا بريدَه،
      //  ولا مقارنةَ `session.userId` برقمٍ ثابت — الحارسُ كلُّه من الدور.
      check(!/yasir/i.test(routes) && !/@gmail\.com/i.test(routes),
        "٣١. **ولا اسمَ مالكٍ ولا بريدَه في الملفّ كلِّه**", "");
      check(!/session\.userId\s*===\s*\d/.test(routes),
        "   **ولا مقارنةَ هويّةٍ ثابتة على `session.userId`** — كلُّ فحصٍ من الدور لا من الرقم",
        "");
    }
  } finally {
    server.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
