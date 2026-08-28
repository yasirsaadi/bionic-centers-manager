// **مسارُ المعاينة التجاريّ** — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:exam-commercial`.
//
// ══ الثابتُ الذي يحرسه ═════════════════════════════════════════════════════
// **معاينة ⟶ تفاصيلُ البيع ⟶ قرارٌ واحد: اشترى / لم يشترِ.**
// ولكلّ حقلٍ تجاريٍّ **مالك**: ما أدخله الطبيبُ لا يكتب فوقه استقبالٌ ولا
// مديرُ فرع — بل صاحبُه أو المسؤولُ العام. وما تركه فارغاً يُكمله مَن حضر.
//
// ══ **تعديلٌ جوهريّ (مرحلةُ «معاينةٌ طبّيةٌ محضة»)** ═══════════════════════
// كان الطبيبُ يستطيع أن يُدخل التفاصيلَ التجارية **عند التوقيع نفسه**، عبر
// حقل `commercial` في جسم `POST /api/medical/patients/:id/exams` — وهذا
// الملفُّ وُلد أصلاً ليختبر ذلك المسار. **وقد أُزيل ذلك المسارُ بالكامل**
// (القسم 4.b/4.f في CLAUDE.md): الطبيبُ يشخّص ويصف ويوقّع فقط، ولا سعرَ ولا
// خبيرَ ولا قرارَ شراء يصل الخادمَ من نافذته بعد اليوم — ولو أرسله عميلٌ
// قديم، **يُتجاهَل تماماً** (لا يُقرأ، لا يُتحقَّق منه، لا يُكتب، ولا يُسقِط
// المعاينةَ إن كان فاسداً).
//
// **والبابُ القانونيُّ الواحد الباقي**: `POST /api/followups/:id/commercial`
// (`server/followup/routes.ts` ⟶ `setCommercialFields`) — **لم يتغيّر بحرف**،
// وهو ما تنادِيه بطاقةُ المريض اليوم. فكلُّ سيناريوهات هذا الملفّ التي كانت
// تُبنى بحمولةٍ تجاريةٍ مرفقة بالتوقيع تحوّلت إلى **خطوتين**: توقيعٌ نظيف،
// ثمّ نداءٌ مباشر إلى `/commercial` — وهذا يثبت أن `setCommercialFields`
// وآليّةَ المالكية (`asDoctor` تُشتقّ من `isExamDoctorOf` بصرف النظر عن
// الطريق الذي وصلتَ منه) **لم تُمَسّا بحرف كمصدر**، وستبقيان جاهزتين
// لإعادة الاستعمال في مرحلة الاستعلامات القادمة.
//
// **وهذا بقاءٌ انتقاليٌّ للطبيب — لا تصميمٌ نهائيّ.** هذه المرحلةُ لم تمسّ
// سير عمل ما بعد المعاينة أصلاً، فطبيبٌ نادى البابَ مباشرةً (لا من نافذة
// التوقيع المحذوفة) اليوم **ما زال تقنياً** يُمنَح `asDoctor` ويكتب سعراً
// أو خبيراً مملوكاً له — تماماً كما تثبته الأقسامُ أ–ك أدناه بنقاطٍ حقيقية.
// **لكنّ الهدفَ النهائيّ لا دورَ تجارياً للطبيب إطلاقاً** (القسم 4.h في
// CLAUDE.md): الاستعلاماتُ وحدها تملك الخبيرَ والسعرَ الأصليّ والخصمَ
// وإتمامَ الشراء و«لم يشترِ»، ومرحلةُ تبسيط مبيعات الاستعلامات القادمة
// ستُقيِّد أو تُزيل قدرةَ `asDoctor` من هذا الباب نفسِه. فالأقسامُ أ–ك
// أدناه تثبتُ **سلوكاً قائماً اليوم لأن هذه المرحلة لم تمسّه**، لا عقداً
// يُراد الحفاظُ عليه أبداً.
//
// وما يُثبته هنا:
//   • **ولا مسؤوليةَ تجارية على التوقيع مهما وصل في جسمه** — قسمٌ جديد (ي‌ب).
//   • مالكيةُ الحقول الثلاثة في الاتجاهين (أ–ح) — عبر البابِ الباقي وحده.
//   • «اشترى» كاملاً ⟶ أمرُ تصنيعٍ **واحد** وقيدُ كلفةٍ **واحد**، بلا اعتماد.
//   • «اشترى» ناقصاً ⟶ القرارُ **يُحفَظ**، ولا مالَ ولا تصنيع، ثمّ يُكمله
//     الموظّف فيُتمّ الخادمُ البيعَ **ذرّياً** — وضغطتان تُنتجان تحويلاً واحداً.
//   • «لم يشترِ» بلا سببٍ ⟶ ٤٠٠ · وبسببٍ ⟶ إغلاقٌ بلا دينار.
//   • الخصمُ والمجّانيّة **نافذةٌ فوراً بلا `service_discount_requests`**.
//   • و**«لم يُسعَّر» ≠ «مجّانيّ»** — الصفرُ لم يبقَ يقول الاثنين.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  computeCommercialOffer, canOverwriteCommercialField, saleState,
  examPathActions, examPathStatusLine, PENDING_SALE_DATA_LABEL,
  NOT_BOUGHT_LEGACY_REASON,
} from "@shared/commercial";

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
const MARK = "اختبار-تجاري-المعاينة";
const ADMIN = 9901, MANAGER = 9902, DOC = 9903, DOC2 = 9904;
const RECV = 9905, EXPERT = 9906, EXPERT2 = 9907;

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "مدير الفرع",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "سعد",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
  doc2: {
    userId: DOC2, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "هدى",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
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
      //  **base64**: الأسماءُ عربية، وترويسةُ HTTP لا تحمل إلّا Latin-1.
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, opts: { support?: boolean } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,$3,$4,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, opts.support !== true, opts.support === true]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,0,'manual','active') RETURNING id`, [patientId, caseType]);
  return r[0].id;
}
/** طلبُ جهازٍ على **مسار المعاينة** — البابُ الحقيقي (ترحيل ٠٦٥). */
const startEpisode = (patientId: number, serviceType = "prosthetic", item = "full_device") =>
  http("POST", `/api/patients/${patientId}/device-episodes`, S.recv,
    { serviceType, requestedItem: item, servicePath: "exam" });

/**
 * توقيعُ معاينةٍ — **سريريّةٌ محضةٌ**. لا حمولةَ تجاريةً في هذه الدالّة على
 * الإطلاق: النقطةُ الحقيقية لم تعد تقرأ شيئاً تجارياً من جسمها (القسمُ
 * ي‌ب أدناه يثبت ذلك بنداءٍ خامٍ مباشر). تفاصيلُ البيع تصل من الآن فصاعداً
 * عبر `commercial()` وحدها.
 */
const signExam = (patientId: number, caseType = "prosthetic", session: any = S.doc) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType, diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
  });

const commercial = (followupId: number, patch: any, session: any) =>
  http("POST", `/api/followups/${followupId}/commercial`, session, patch);

/**
 * يكتب `device_cost`/`proposed_expert_user_id` مباشرةً على معاينةٍ موقّعة —
 * **لمحاكاة صفٍّ من قبل هذا التبسيط وحده**. الترِكرُ (٠٢٨) يرفض أيّ
 * `UPDATE` على `medical_exams` لم يفتح البابَ المراقَب صراحةً، فيُفتح هنا
 * تماماً كما توثّق CLAUDE.md — `BEGIN` + `SET LOCAL app.allow_exam_edit`
 * على **معاملةٍ واحدة** على نفس الاتصال، لا نداءين منفصلين قد يذهبان إلى
 * اتصالين مختلفين من المجمّع.
 */
async function sealedOverrideWrite(examId: number, deviceCost: number, expertId: number) {
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
}

async function fRow(id: number) {
  const [r] = await q(`SELECT approved_price::int p, original_price::int op, price_kind pk,
      price_owner po, price_owner_user_id pou, expert_owner eo, expert_owner_user_id eou,
      selected_expert_user_id ex, purchase_decision pd, purchase_decision_owner pdo,
      purchase_decision_user_id pdu, not_bought_reason_text nbr, status, price_source ps,
      converted_work_order_id wo
    FROM post_exam_followups WHERE id=$1`, [id]);
  return r ?? null;
}
async function followupOf(patientId: number): Promise<number> {
  const [r] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1
                        ORDER BY id DESC LIMIT 1`, [patientId]);
  return Number(r?.id ?? 0);
}
async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS cost_entries,
      (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS payments,
      (SELECT count(*)::int FROM service_discount_requests WHERE patient_id=$1) AS discounts`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
}

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
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${DOC2},${RECV},${EXPERT},${EXPERT2}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${DOC2},${RECV},${EXPERT},${EXPERT2}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec, name] of [
    [ADMIN, "admin", "null", "المسؤول"],
    [MANAGER, "branch_manager", "null", "مدير الفرع"],
    [DOC, "doctor", '["prosthetic","medical_support"]', "سعد"],
    [DOC2, "doctor", '["prosthetic","medical_support","physiotherapy"]', "هدى"],
    [RECV, "reception", "null", "ريام"],
    [EXPERT, "prosthetics_expert", "null", "الخبير الأول"],
    [EXPERT2, "prosthetics_expert", "null", "الخبير الثاني"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$5,$3,1,'[1]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               medical_specialties=EXCLUDED.medical_specialties,
               display_name=EXCLUDED.display_name, is_active=true`,
      [id, `ec_u${id}`, role, spec, name]);
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

    // ══════════════════════════════════════════════════════════════════
    //  ٠. العقدُ الخالص
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ٠. عقدُ التسعير (خالص) ──");
    same("١. عاديٌّ: النهائيُّ يساوي الأصل",
      (() => { const o = computeCommercialOffer({ kind: "normal", originalPrice: 1_000_000 });
        return [o.ok, o.originalPrice, o.finalPrice]; })(), [true, 1_000_000, 1_000_000]);
    same("٢. بخصم: أصغرُ من الأصل ومُوجب",
      (() => { const o = computeCommercialOffer({ kind: "discount", originalPrice: 1_000_000, finalPrice: 800_000 });
        return [o.ok, o.finalPrice]; })(), [true, 800_000]);
    same("٣. **مجّانيّ: النهائيُّ صفرٌ والأصلُ محفوظ**",
      (() => { const o = computeCommercialOffer({ kind: "free", originalPrice: 1_200_000 });
        return [o.ok, o.originalPrice, o.finalPrice]; })(), [true, 1_200_000, 0]);
    check(!computeCommercialOffer({ kind: "discount", originalPrice: 500_000, finalPrice: 500_000 }).ok,
      "٤. **(س) والنهائيُّ ≥ الأصل يُردّ**");
    check(!computeCommercialOffer({ kind: "discount", originalPrice: 500_000, finalPrice: 600_000 }).ok,
      "   ولو كان أكبر");
    check(!computeCommercialOffer({ kind: "free", originalPrice: 0 }).ok,
      "٥. **(ص) ومجّانيّةٌ بلا أصلٍ موجبٍ معلوم تُردّ**");
    check(!computeCommercialOffer({ kind: "discount", originalPrice: 0, finalPrice: 0 }).ok,
      "   وكذلك خصمٌ بلا أصل");
    check(!computeCommercialOffer({ kind: "normal", originalPrice: 1000.5 }).ok,
      "٦. وكسرُ الدينار يُردّ");
    //  **الفرقُ الذي جاءت المرحلةُ لأجله.**
    same("٧. **«لم يُسعَّر» ≠ «مجّانيّ» — النوعُ هو الدليل لا الرقم**",
      [saleState({ priceKind: null, expertUserId: 5 }).missing,
        saleState({ priceKind: "free", expertUserId: 5 }).missing],
      [["price"], []]);
    same("٨. ومالكيةُ الحقل: الفارغُ للجميع، والطبيبُ لصاحبه وللمسؤول",
      [
        canOverwriteCommercialField({ field: null, session: S.recv }),
        canOverwriteCommercialField({
          field: { owner: "staff", ownerUserId: RECV, ownerName: "ريام" }, session: S.manager }),
        canOverwriteCommercialField({
          field: { owner: "doctor", ownerUserId: DOC, ownerName: "سعد" }, session: S.recv }),
        canOverwriteCommercialField({
          field: { owner: "doctor", ownerUserId: DOC, ownerName: "سعد" }, session: S.manager }),
        canOverwriteCommercialField({
          field: { owner: "doctor", ownerUserId: DOC, ownerName: "سعد" }, session: S.doc }),
        canOverwriteCommercialField({
          field: { owner: "doctor", ownerUserId: DOC, ownerName: "سعد" }, session: S.doc2 }),
        canOverwriteCommercialField({
          field: { owner: "doctor", ownerUserId: DOC, ownerName: "سعد" }, session: S.admin }),
      ], [true, true, false, false, true, false, true]);
    same("٩. والأفعالُ ثلاثةٌ لا أكثر، والقرارُ القائم لا يُعاد اختيارُه",
      [
        examPathActions({ session: S.recv, status: "awaiting_patient_decision", mayAct: true }),
        examPathActions({
          session: S.recv, status: "awaiting_patient_decision", decision: "bought",
          decisionField: { owner: "doctor", ownerUserId: DOC, ownerName: "سعد" }, mayAct: true }),
        examPathActions({ session: S.recv, status: "converted", mayAct: true }),
      ],
      [["commercial", "bought", "not_bought"], ["commercial"], []]);
    same("١٠. وسطرُ الحالة يقول ما ينقص بالعربية",
      examPathStatusLine({
        status: "awaiting_patient_decision", decision: "bought", missing: ["expert"],
      }), `${PENDING_SALE_DATA_LABEL} — الخبير`);

    // ══════════════════════════════════════════════════════════════════
    //  أ. **(أ)(ج)(هـ)(ز)** الطبيبُ يُدخل الثلاثة من بطاقة التفاصيل ⟶
    //     مقفولةٌ على غيره
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. ما أدخله الطبيبُ مقفولٌ على غيره ──");
    {
      const p = await mkPatient("مالكيةُ الطبيب");
      await mkCase(p);
      same("١١. طلبُ الجهاز على مسار المعاينة", (await startEpisode(p)).status, 201);
      //  التوقيعُ سريريٌّ محضٌ — بلا سعرٍ ولا خبيرٍ في جسمه.
      const ex = await signExam(p, "prosthetic");
      check(ex.status === 200 || ex.status === 201, "١٢. المعاينةُ وُقّعت", String(ex.status));
      const fid = await followupOf(p);
      //  والطبيبُ يُدخل السعرَ والخبيرَ من بطاقة التفاصيل — البابُ الوحيد.
      const set = await commercial(fid,
        { price: { kind: "normal", originalPrice: 1_500_000 }, expertUserId: EXPERT }, S.doc);
      check(set.status === 200, "   والطبيبُ يُدخل سعرَه وخبيرَه من بطاقة التفاصيل",
        String(set.status));
      const row = await fRow(fid);
      same("١٣. والسعرُ والخبيرُ محفوظان بمالكِهما «الطبيب»",
        [row.p, row.op, row.pk, row.po, Number(row.pou), row.ex, row.eo, Number(row.eou)],
        [1_500_000, 1_500_000, "normal", "doctor", DOC, EXPERT, "doctor", DOC]);
      same("   **ولا طلبَ اعتمادِ خصم** ولا أثرَ ماليّ بعد",
        await moneyOf(p), { total: 0, orders: 0, cost_entries: 0, payments: 0, discounts: 0 });

      //  (أ) الاستقبالُ يُردّ · مديرُ الفرع يُردّ · صاحبُه يمرّ · المسؤولُ يمرّ.
      const r1 = await commercial(fid, { price: { kind: "normal", originalPrice: 900_000 } }, S.recv);
      same("١٤. **(أ) الاستقبالُ لا يكتب فوق سعر الطبيب**", r1.status, 403);
      check(String(r1.body?.error ?? "").includes("سعد"), "   والرسالةُ تسمّيه", JSON.stringify(r1.body));
      same("١٥. **(أ) ومديرُ الفرع كذلك — قرارُ مالكٍ صريح**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 900_000 } }, S.manager)).status,
        403);
      same("   ومن البابِ القديم أيضاً (`commercial-price`) — لا نافذةَ خلفية",
        (await http("POST", `/api/followups/${fid}/commercial-price`, S.manager,
          { finalPrice: 900_000, reason: "مساومة" })).status, 403);
      same("١٦. **(أ) وصاحبُه يمرّ**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1_600_000 } }, S.doc)).status,
        200);
      same("   والقيمةُ تغيّرت والمالكُ **لم يتغيّر**",
        [(await fRow(fid)).p, (await fRow(fid)).po, Number((await fRow(fid)).pou)],
        [1_600_000, "doctor", DOC]);
      same("١٧. **(أ) والمسؤولُ العام يمرّ**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1_700_000 } }, S.admin)).status,
        200);
      same("   **والمالكيةُ ما زالت للطبيب** — التصحيحُ الإداريّ لا يُسلّمها للاستقبال",
        [(await fRow(fid)).po, Number((await fRow(fid)).pou)], ["doctor", DOC]);
      same("   فالاستقبالُ ما زال يُردّ بعد تصحيح المسؤول",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1 } }, S.recv)).status, 403);
      //  (ج) الخبيرُ كذلك — ومن بابه القديم أيضاً.
      same("١٨. **(ج) والخبيرُ الذي أسنَده الطبيبُ لا يُبدَّل**",
        (await commercial(fid, { expertUserId: EXPERT2 }, S.recv)).status, 403);
      same("   ولا من نقطة `expert` القديمة",
        (await http("POST", `/api/followups/${fid}/expert`, S.recv,
          { expertUserId: EXPERT2 })).status, 403);
      same("   ومديرُ الفرع كذلك",
        (await http("POST", `/api/followups/${fid}/expert`, S.manager,
          { expertUserId: EXPERT2 })).status, 403);
      //  (ز) والقرار.
      same("١٩. **(ز) وقرارُ الطبيب لا يقلبه موظّف**", await (async () => {
        await commercial(fid, { decision: "bought" }, S.doc);
        return (await fRow(fid)).pd;
      })(), "bought");
      const flip = await commercial(fid,
        { decision: "not_bought", notBoughtReason: "غيّر رأيه" }, S.recv);
      check(flip.status === 403 || flip.status === 409,
        "   والاستقبالُ يُردّ عن قلبه", JSON.stringify({ s: flip.status, b: flip.body }));
      //  وبإكمالِ الحقلين صار البيعُ جاهزاً فتحوّل الصفُّ — وهذا هو المقصود.
      same("٢٠. والقرارُ الكاملُ أتمّ البيع في المعاملة نفسِها",
        (await fRow(fid)).status, "converted");
    }

    {
      //  **ولا نافذةَ خلفية من `close` القديمة**: قرارُ الطبيب «اشترى» على
      //  صفٍّ ما زال ناقصَ الخبير — فالصفُّ مفتوحٌ والحارسُ هو المالكية لا
      //  الحالة. وهذا بالضبط ما كان سيُفلت لو بقيت النقطةُ القديمة مطلقة.
      const p = await mkPatient("إغلاقٌ ممنوع");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid,
        { price: { kind: "normal", originalPrice: 1_000_000 }, decision: "bought" }, S.doc);
      same("٢٠أ. الصفُّ مفتوحٌ وقرارُه للطبيب",
        [(await fRow(fid)).status, (await fRow(fid)).pdo],
        ["awaiting_patient_decision", "doctor"]);
      const closed = await http("POST", `/api/followups/${fid}/close`, S.recv,
        { reason: "price", note: "x" });
      same("٢٠ب. **(س) والاستقبالُ لا يُغلقه من البابِ القديم**", closed.status, 403);
      same("   ولا مديرُ الفرع",
        (await http("POST", `/api/followups/${fid}/close`, S.manager,
          { reason: "price" })).status, 403);
      same("   والصفُّ لم يتغيّر", (await fRow(fid)).status, "awaiting_patient_decision");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب. **(ب)(د)(و)(ح)** ما تركه الطبيبُ فارغاً يُكمله الموظّف
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الفارغُ يُكمله مَن حضر ──");
    {
      const p = await mkPatient("فراغٌ يُكمَل");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");  //  بلا سعرٍ ولا خبيرٍ ولا قرار
      const fid = await followupOf(p);
      same("٢١. الصفُّ يبدأ بلا سعرٍ ولا مالك",
        [(await fRow(fid)).pk, (await fRow(fid)).po, (await fRow(fid)).ex], [null, null, null]);
      same("٢٢. **(ب) والاستقبالُ يُدخل السعرَ فينجح**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1_000_000 } }, S.recv)).status,
        200);
      same("   ومالكُه «الموظّفون»",
        [(await fRow(fid)).po, Number((await fRow(fid)).pou), (await fRow(fid)).ps],
        ["staff", RECV, "reception_set"]);
      same("٢٣. **(د) والخبيرُ كذلك**",
        (await commercial(fid, { expertUserId: EXPERT }, S.recv)).status, 200);
      same("   ومالكُه «الموظّفون»", (await fRow(fid)).eo, "staff");
      //  وما صار للموظّفين يديره أيُّ مخوَّل — ومديرُ الفرع منهم.
      same("٢٤. وما صار للموظّفين يديره مديرُ الفرع",
        (await commercial(fid, { price: { kind: "discount", originalPrice: 1_000_000, finalPrice: 850_000 } },
          S.manager)).status, 200);
      same("   **(ف) والخصمُ نافذٌ فوراً بلا طلبِ اعتماد**",
        [(await fRow(fid)).p, (await fRow(fid)).op, (await fRow(fid)).pk,
          (await moneyOf(p)).discounts],
        [850_000, 1_000_000, "discount", 0]);
      same("٢٥. **(ح) والقرارُ فارغٌ فيختاره الموظّف**",
        (await commercial(fid, { decision: "bought" }, S.recv)).status, 200);
      same("   ومالكُه «الموظّفون»",
        [(await fRow(fid)).pd, (await fRow(fid)).pdo, Number((await fRow(fid)).pdu)],
        ["bought", "staff", RECV]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج. **(ط)** «اشترى» كاملاً ⟶ أمرٌ واحد وقيدٌ واحد، بلا اعتماد
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. اشترى + بياناتٌ كاملة ──");
    let convertedFollowup = 0;
    {
      const p = await mkPatient("اشترى كاملاً");
      const c = await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      const set = await commercial(fid, {
        price: { kind: "normal", originalPrice: 2_000_000 },
        expertUserId: EXPERT, decision: "bought",
      }, S.doc);
      same("٢٦. **(ط) إكمالُ الحقول الثلاثة معاً أتمّ البيع**",
        [set.body?.converted, typeof set.body?.workOrderId], [true, "number"]);
      convertedFollowup = fid;
      const row = await fRow(fid);
      same("٢٧. والمتابعةُ `converted` بأمرها", [row.status, typeof Number(row.wo)],
        ["converted", "number"]);
      const m = await moneyOf(p);
      same("٢٨. **أمرُ تصنيعٍ واحد · قيدُ كلفةٍ واحد · ولا طلبَ اعتماد**",
        [m.orders, m.cost_entries, m.discounts], [1, 1, 0]);
      same("   والكلفةُ على الملفّ", m.total, 2_000_000);
      same("   وكلفةُ الخيط", (await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [c]))[0].c,
        2_000_000);
      same("   والحلقةُ صارت قيد التصنيع",
        (await q(`SELECT status FROM patient_device_episodes WHERE patient_id=$1`, [p]))[0].status,
        "in_manufacturing");
      //  (١٤) وبعد البيع لا تُعدَّل التفاصيلُ من هنا — بابُها التصحيحُ الإداريّ.
      const after = await commercial(fid, { price: { kind: "normal", originalPrice: 9 } }, S.admin);
      same("٢٩. **وبعد البيع يُردّ ٤٠٩ ويُدلّ على بابِ التصحيح**", after.status, 409);
      check(String(after.body?.error ?? "").includes("تصحيح"),
        "   برسالةٍ تسمّيه", JSON.stringify(after.body));
      same("   ولا شيءَ تحرّك", (await moneyOf(p)).total, 2_000_000);
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. **(ي)(ك)** «اشترى» ناقصاً ⟶ يُحفَظ، ثمّ يُكمَل فيُتمّ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. اشترى + بياناتٌ ناقصة ──");
    {
      //  (ي) ناقصُ الخبير.
      const p = await mkPatient("اشترى بلا خبير");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      const set = await commercial(fid,
        { price: { kind: "normal", originalPrice: 1_100_000 }, decision: "bought" }, S.doc);
      same("٣٠. **(ي) القرارُ حُفظ ولم يُتمّ البيع**",
        [set.body?.converted, set.body?.missing, (await fRow(fid)).pd, (await fRow(fid)).status],
        [false, ["expert"], "bought", "awaiting_patient_decision"]);
      same("   **ولا مالَ ولا تصنيع**",
        await moneyOf(p), { total: 0, orders: 0, cost_entries: 0, payments: 0, discounts: 0 });
      //  والشاشةُ تقول ما ينقص.
      const card = await http("GET", `/api/followups/patient/${p}`, S.recv);
      same("٣١. والبطاقةُ تقول «اشترى — بانتظار استكمال بيانات البيع — الخبير»",
        [card.body?.[0]?.statusLine, card.body?.[0]?.missing], [
          `${PENDING_SALE_DATA_LABEL} — الخبير`, ["expert"]]);
      //  **ولا زرَّ قرارٍ للاستقبال هنا إطلاقاً**: القرارُ للطبيب، فلا
      //  «اشترى» يُعاد سؤالُه ولا «لم يشترِ» يقلبه مَن لا يملكه. وما بقي
      //  للموظّف هو ما ينقص فعلاً: تفاصيلُ البيع.
      same("   ولا يُسأل القرارُ ثانيةً ولا يُقلَب — «تفاصيل البيع» وحدها",
        card.body?.[0]?.actions, ["commercial"]);
      same("   والقفلُ يقوله الخادم",
        [card.body?.[0]?.locks?.decision, card.body?.[0]?.ownerLabels?.decision],
        [true, "أدخله د. سعد"]);
      //  والاستقبالُ يُكمل آخرَ ناقصٍ ⟶ **الخادمُ يُتمّ البيع**.
      const done = await commercial(fid, { expertUserId: EXPERT }, S.recv);
      same("٣٢. **(ي) وإكمالُ الخبير أتمّ البيع ذرّياً — بلا سؤالٍ ثانٍ**",
        [done.status, done.body?.converted, (await fRow(fid)).status],
        [200, true, "converted"]);
      const m = await moneyOf(p);
      same("   بأمرٍ واحد وقيدٍ واحد", [m.orders, m.cost_entries, m.total],
        [1, 1, 1_100_000]);
    }
    {
      //  (ك) ناقصُ السعر.
      const p = await mkPatient("اشترى بلا سعر");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid, { expertUserId: EXPERT, decision: "bought" }, S.doc);
      same("٣٣. **(ك) ناقصُ السعر — القرارُ محفوظٌ والمالُ صفر**",
        [(await fRow(fid)).pd, (await fRow(fid)).pk, (await moneyOf(p)).orders], ["bought", null, 0]);
      const done = await commercial(fid,
        { price: { kind: "normal", originalPrice: 700_000 } }, S.recv);
      same("   وإكمالُ السعر أتمّ البيع", [done.body?.converted, (await moneyOf(p)).total],
        [true, 700_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. **(ل)** ضغطتان على آخرِ ناقص ⟶ تحويلٌ واحد
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. التزامن على آخرِ حقلٍ ناقص ──");
    {
      const p = await mkPatient("ضغطتان متزامنتان");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid,
        { price: { kind: "normal", originalPrice: 1_300_000 }, decision: "bought" }, S.doc);
      const [a, b] = await Promise.all([
        commercial(fid, { expertUserId: EXPERT }, S.recv),
        commercial(fid, { expertUserId: EXPERT }, S.recv),
      ]);
      const oks = [a, b].filter((x) => x.status === 200 && x.body?.converted === true).length;
      same("٣٤. **(ل) واحدةٌ تُتمّ البيعَ والأخرى تُردّ**", oks, 1);
      const m = await moneyOf(p);
      same("   **وأمرُ تصنيعٍ واحد وقيدُ كلفةٍ واحد ودينارٌ واحد**",
        [m.orders, m.cost_entries, m.total], [1, 1, 1_300_000]);
      same("   وحدثُ التحويل مرّةً واحدة",
        (await q(`SELECT count(*)::int n FROM post_exam_followup_events
                   WHERE followup_id=$1 AND event_type='converted'`, [fid]))[0].n, 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و. **(م)(ن)(ع)** «لم يشترِ»
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. لم يشترِ ──");
    {
      const p = await mkPatient("لم يشترِ");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid, { price: { kind: "normal", originalPrice: 800_000 } }, S.doc);
      same("٣٥. **(م) بلا سببٍ ⟶ ٤٠٠**",
        (await commercial(fid, { decision: "not_bought" }, S.recv)).status, 400);
      same("   والصفُّ ما زال مفتوحاً", (await fRow(fid)).status, "awaiting_patient_decision");
      const closed = await commercial(fid,
        { decision: "not_bought", notBoughtReason: "السعر أعلى من قدرته الآن" }, S.recv);
      same("٣٦. **(ن) وبسببٍ ⟶ إغلاقٌ بلا تصنيعٍ ولا كلفة**",
        [closed.status, closed.body?.closed, (await fRow(fid)).status],
        [200, true, "closed_without_purchase"]);
      same("   والسببُ الحرُّ محفوظٌ كما قيل",
        (await fRow(fid)).nbr, "السعر أعلى من قدرته الآن");
      same("   **والرمزُ الموروث محايدٌ** لا يدّعي سبباً لم يُقَل",
        (await q(`SELECT closed_reason c FROM post_exam_followups WHERE id=$1`, [fid]))[0].c,
        NOT_BOUGHT_LEGACY_REASON);
      same("   ولا دينارَ ولا أمرَ ولا قيد",
        await moneyOf(p), { total: 0, orders: 0, cost_entries: 0, payments: 0, discounts: 0 });
      same("٣٧. ومالكُ القرارِ «الموظّفون» فيُصحِّحونه بإعادة الفتح",
        [(await fRow(fid)).pd, (await fRow(fid)).pdo], ["not_bought", "staff"]);
    }
    {
      //  (ع) قرارُ الطبيب «لم يشترِ» لا يقلبه موظّف.
      const p = await mkPatient("طبيبٌ قال لم يشترِ");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid, {
        price: { kind: "normal", originalPrice: 950_000 }, expertUserId: EXPERT,
        decision: "not_bought", notBoughtReason: "اختار مركزاً آخر",
      }, S.doc);
      same("٣٨. **(ع) والطبيبُ أغلقه بمالكيّته**",
        [(await fRow(fid)).status, (await fRow(fid)).pd, (await fRow(fid)).pdo,
          Number((await fRow(fid)).pdu)],
        ["closed_without_purchase", "not_bought", "doctor", DOC]);
      const reopened = await http("POST", `/api/followups/${fid}/reopen`, S.recv, {});
      check(reopened.status === 200, "٣٩. والاستقبالُ يعيد فتحَه (مسارٌ قائم)",
        JSON.stringify(reopened.body));
      const flip = await commercial(fid, { decision: "bought" }, S.recv);
      same("٤٠. **(ع) لكنّه لا يقلب قرارَ الطبيب إلى «اشترى»**", flip.status, 403);
      same("   والمسؤولُ يقدر",
        (await commercial(fid, { decision: "bought" }, S.admin)).status, 200);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز. **(ر)** المجّانيُّ الصريح
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. مجّانيٌّ صريح ──");
    {
      const p = await mkPatient("تبرّعٌ صريح");
      const c = await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      const set = await commercial(fid, {
        price: { kind: "free", originalPrice: 1_800_000 },
        expertUserId: EXPERT, decision: "bought",
      }, S.doc);
      const row = await fRow(fid);
      same("٤١. **(ر) النهائيُّ صفرٌ والأصلُ محفوظ — ولا اعتمادَ**",
        [row.p, row.op, row.pk, (await moneyOf(p)).discounts], [0, 1_800_000, "free", 0]);
      same("٤٢. **والبيعُ تمّ بلا أن يُقرأ «غير مسعَّر»**",
        [set.body?.converted, row.status], [true, "converted"]);
      const m = await moneyOf(p);
      same("   بأمرٍ واحد وكلفةٍ صفر", [m.orders, m.total], [1, 0]);
      same("   وكلفةُ الخيط صفر",
        (await q(`SELECT cost::int c FROM patient_cases WHERE id=$1`, [c]))[0].c, 0);
    }
    {
      //  **والصفرُ لم يبقَ باباً خلفياً**: تبرّعٌ صريحٌ لا يكتب فوقه أحدٌ رقماً.
      const p = await mkPatient("تبرّعٌ لا يُكتب فوقه");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid, { price: { kind: "free", originalPrice: 600_000 } }, S.doc);
      const sneak = await http("POST", `/api/followups/${fid}/confirm-purchase`, S.recv,
        { initialPrice: 600_000, expertUserId: EXPERT });
      check(sneak.status >= 400 || (await fRow(fid)).op === 600_000,
        "٤٣. **ولا يُكتب فوق تبرّعٍ صريحٍ سعرٌ من بابٍ آخر**",
        JSON.stringify({ s: sneak.status, row: await fRow(fid) }));
      same("   والأصلُ كما هو", (await fRow(fid)).op, 600_000);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح. المساندُ الطبية · والعلاجُ الطبيعي · والمسارُ بلا معاينة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. العزل ──");
    {
      const p = await mkPatient("مسندٌ طبيّ", { support: true });
      await mkCase(p, "medical_support");
      same("٤٤. المسندُ يمرّ بالمسار نفسه",
        (await startEpisode(p, "medical_support")).status, 201);
      await signExam(p, "medical_support");
      const fid = await followupOf(p);
      const set = await commercial(fid, {
        price: { kind: "normal", originalPrice: 400_000 },
        expertUserId: EXPERT, decision: "bought",
      }, S.doc);
      same("   ويُتمّ بيعَه كالأطراف", set.body?.converted, true);
    }
    {
      //  **العلاجُ الطبيعي لا متابعةَ بيعٍ له إطلاقاً** — لا حلقةَ جهازٍ له.
      const p = await mkPatient("علاجٌ طبيعي");
      await q(`UPDATE patients SET is_physiotherapy=true, is_amputee=false WHERE id=$1`, [p]);
      await mkCase(p, "physiotherapy");
      const ex = await signExam(p, "physiotherapy", S.doc2);
      check(ex.status === 200 || ex.status === 201,
        "٤٥. **معاينةُ العلاج الطبيعي تُوقَّع**", String(ex.status));
      same("   **ولا متابعةَ بيعٍ لها ولا أثرَ ماليّ**",
        [await followupOf(p), (await moneyOf(p)).orders], [0, 0]);
    }
    {
      //  **ومسارُ «بلا معاينة» يبقى عند حدّه** — لا متابعةَ ولا مال.
      const p = await mkPatient("بلا معاينة");
      await mkCase(p);
      same("٤٦. طلبٌ على مسار «بلا معاينة»",
        (await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: "prosthetic", requestedItem: "knee", servicePath: "no_exam" })).status,
        201);
      const assign = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.recv,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 500_000 });
      same("   **والحدُّ المؤقّت لم يُمَسّ** — ٤٠٩ بلا أثرٍ ماليّ", assign.status, 409);
      same("   ولا متابعةَ ولا دينار",
        [await followupOf(p), (await moneyOf(p)).total, (await moneyOf(p)).orders], [0, 0, 0]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط. **(ت)** الأفعالُ المتقاعدة · والصفوفُ الموروثة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. المتقاعدُ والموروث ──");
    {
      const p = await mkPatient("أفعالٌ متقاعدة");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      for (const [path, body] of [
        ["defer", { reason: "needs_time", noScheduledFollowUp: true }],
        ["accept-price", {}],
        ["purchase-interest", {}],
      ] as any[]) {
        same(`٤٧. **«${path}» متقاعدٌ على المسار المبسّط**`,
          (await http("POST", `/api/followups/${fid}/${path}`, S.admin, body)).status, 409);
      }
    }
    {
      //  **والصفُّ الموروث لا يُحبَس**: حلقةٌ بلا مسار (ما قبل ٠٦٥) تبقى على
      //  أفعالها كلِّها — وإلّا تجمّد ملفٌّ في حالةٍ لا زرَّ لها.
      const p = await mkPatient("صفٌّ موروث");
      const c = await mkCase(p);
      await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
                 sequence_number, status, agreed_cost, requested_item, created_by)
               VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',$3)`, [p, c, MANAGER]);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      check(fid > 0, "٤٨. متابعةٌ على حلقةٍ بلا مسار", String(fid));
      same("   **وأفعالُها القديمة باقية** — `defer` تعمل",
        (await http("POST", `/api/followups/${fid}/defer`, S.recv,
          { reason: "needs_time", noScheduledFollowUp: true })).status, 200);
      const card = await http("GET", `/api/followups/patient/${p}`, S.recv);
      same("   والبطاقةُ لا تعرض عليها المسارَ المبسّط",
        [card.body?.[0]?.examPath, card.body?.[0]?.actions], [false, null]);
    }
    {
      //  **(ث) والطلباتُ القديمة المعلَّقة تبقى مقروءةً وقابلةً للحسم.**
      const p = await mkPatient("طلبُ خصمٍ قديم");
      await mkCase(p);
      const [d] = await q<{ id: number }>(
        `INSERT INTO service_discount_requests (patient_id, branch_id, department,
           context_ref, original_price, proposed_final_price, discount_amount,
           discount_percentage, is_free, reason, status, requested_by,
           requested_by_name, payload)
         VALUES ($1,1,'prosthetic','service:prosthetic',1000000,800000,200000,20,
                 false,'مساومة','pending',$2,'ريام','{}'::jsonb) RETURNING id`,
        [p, RECV]);
      const q1 = await http("GET", "/api/discounts", S.admin);
      check(q1.status === 200,
        "٤٩. **(ث) طابورُ الخصومات القديم ما زال يُقرأ**", String(q1.status));
      same("   والصفُّ القديم قائمٌ كما هو",
        (await q(`SELECT status FROM service_discount_requests WHERE id=$1`, [d.id]))[0].status,
        "pending");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي. حذفُ المريض كاملاً — القاعدةُ الملزمة في CLAUDE.md
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. حذفُ المريض ──");
    {
      const p = await mkPatient("حذفٌ كامل");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid, {
        price: { kind: "discount", originalPrice: 900_000, finalPrice: 700_000 },
        expertUserId: EXPERT, decision: "bought",
      }, S.doc);
      //  **الحذفُ العاديُّ صار سلّةً** (ترحيل ٠٦٨): والكاسكيدُ الهادمُ
      //  بابُه الوحيد «حذف نهائي» من داخل السلّة. فتُنفَّذ الخطوتان معاً
      //  كي تبقى **تغطيةُ الكاسكيد كما كانت** بحرفها.
      await http("DELETE", `/api/patients/${p}`, S.admin,
        { reason: "اختبار الكاسكيد" });
      //  **والحذفُ النهائيُّ مقفلٌ حتى تنقضي مهلةُ الاستعادة** (المراجعة
      //  الأخيرة، القسم أ): فتُدفَع المهلةُ إلى الماضي كي يختبر هذا القسمُ
      //  الكاسكيدَ نفسَه لا بوّابةَ الانتظار.
      await q(`UPDATE patients SET deleted_at = NOW() - interval '40 days',
                 restore_until = NOW() - interval '10 days' WHERE id=$1`, [p]);
      const del = await http("POST", `/api/patient-trash/${p}/purge`,
        S.admin, { reason: "اختبار الكاسكيد" });
      check(del.status === 200 || del.status === 204,
        "٥٠. **حذفُ مريضٍ بتفاصيلَ تجارية كاملة ينجح**",
        JSON.stringify({ s: del.status, b: del.body }));
      same("   ولا صفَّ متابعةٍ يتيماً",
        (await q(`SELECT count(*)::int n FROM post_exam_followups WHERE patient_id=$1`, [p]))[0].n,
        0);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي‌ب. **بلا مسؤوليةٍ تجارية على التوقيع — مهما وصل في الجسم**
    // ══════════════════════════════════════════════════════════════════
    //  كان هذا القسمُ يثبت أن تسعيراً ناقصاً أو متناقضاً في جسم التوقيع
    //  يُردّ **قبل** أن تُوقَّع المعاينة (٤٠٠، ولا معاينةَ ولا متابعةَ
    //  تُحفَظ) — وأن سعراً/خبيراً كاملَين يُطبَّقان **معها**. وذاك بالضبط
    //  الاقترانُ الذي أزالته هذه المرحلة: **لا شيءَ تجاريّ يُقرأ من جسم
    //  التوقيع بعد اليوم، صحيحاً كان أم فاسداً، كاملاً أم ناقصاً** — فيسقط
    //  سؤالُ «هل يُقبل أم يُردّ؟» لأن الجوابَ «لا يُقرأ أصلاً». والمعاينةُ
    //  **تنجح دائماً** ما دام محتواها السريريُّ سليماً.
    console.log("\n── ي‌ب. لا مسؤوليةَ تجارية على التوقيع ──");
    {
      //  ① حمولةٌ **كاملةٌ وصالحة** — لو وصلت البابَ القديم كانت ستُتمّ
      //  البيعَ في الطلب نفسه (كالقسم ج أعلاه، قبل هذه المرحلة). والآن:
      //  تُتجاهَل تماماً، بأسماء الحقول القديمة كلِّها معاً.
      const p = await mkPatient("حمولةٌ تجاريةٌ كاملة تُتجاهَل");
      await mkCase(p);
      await startEpisode(p);
      const ex = await http("POST", `/api/medical/patients/${p}/exams`, S.doc, {
        caseType: "prosthetic", diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
        deviceCost: 2_000_000,
        proposedExpertUserId: EXPERT,
        commercial: {
          price: { kind: "normal", originalPrice: 2_000_000 },
          expertUserId: EXPERT, decision: "bought",
        },
      });
      check(ex.status === 200 || ex.status === 201,
        "٦١. **(١) المعاينةُ تُوقَّع بحمولةٍ تجاريةٍ كاملة كأنها لم تصل**",
        String(ex.status));
      same("   **ولا `commercial` في الردّ** — النقطةُ لا تعرف هذا المفهوم بعد اليوم",
        Object.prototype.hasOwnProperty.call(ex.body ?? {}, "commercial"), false);
      const fid = await followupOf(p);
      check(fid > 0, "   ومتابعةُ البيع فُتحت كالمعتاد (طلبُ جهازٍ على مسار المعاينة)",
        String(fid));
      const row = await fRow(fid);
      same("٦٢. **(٢) بلا سعرٍ ولا خبيرٍ ولا قرارٍ — ولا مالكيةَ لأحد**",
        [row.pk, row.op, row.p, row.eo, row.ex, row.pd, row.pdo],
        [null, null, 0, null, null, null, null]);
      same("   **ولا أمرَ تصنيعٍ ولا قيدَ كلفةٍ ولا دينار** — البيعُ لم يبدأ",
        await moneyOf(p), { total: 0, orders: 0, cost_entries: 0, payments: 0, discounts: 0 });
      //  وحقلا المعاينة القديمان («المرحلة ١») كذلك: لا يُكتبان من هذا الطلب.
      const examRow = (await q<{ dc: number | null; pe: number | null }>(
        `SELECT device_cost dc, proposed_expert_user_id pe FROM medical_exams WHERE id=$1`,
        [ex.body.id]))[0];
      same("٦٣. **(٣) و`medical_exams.device_cost`/`proposed_expert_user_id` بلا قيمة**",
        [examRow.dc, examRow.pe], [null, null]);
    }
    {
      //  ② حمولةٌ **فاسدة** (مجّانيّ بلا سعرٍ أصليّ، أو قرارٌ بلا معنى) —
      //  لو وصلت البابَ القديم كانت ستُسقط المعاينةَ كلَّها بـ٤٠٠. والآن:
      //  لا تُقرأ لتُرفَض.
      const p = await mkPatient("حمولةٌ تجاريةٌ فاسدة لا تُسقِط شيئاً");
      await mkCase(p);
      await startEpisode(p);
      const ex = await http("POST", `/api/medical/patients/${p}/exams`, S.doc, {
        caseType: "prosthetic", diagnosis: "تشخيصٌ سريريّ",
        commercial: {
          price: { kind: "free", originalPrice: null },
          decision: "قرارٌ لا معنى له",
        },
      });
      check(ex.status === 200 || ex.status === 201,
        "٦٤. **(٤) وحمولةٌ فاسدةٌ لا تُسقِط المعاينةَ أبداً**", String(ex.status));
      same("   والمعاينةُ محفوظةٌ فعلاً",
        (await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p]))[0].n, 1);
      same("   والمتابعةُ بلا تسعير — لا «مجّانيّ» ولا أيّ قيمة",
        [(await fRow(await followupOf(p))).pk, (await fRow(await followupOf(p))).status],
        [null, "awaiting_patient_decision"]);
    }
    {
      //  ③ **والعلاجُ الطبيعي كذلك** — لا فرقَ بين أنواع الاختصاص، لأن لا
      //  اختصاصٍ يقرأ هذا الحقلَ بعد اليوم.
      const p = await mkPatient("علاجٌ طبيعي بحمولةٍ تجارية");
      await q(`UPDATE patients SET is_physiotherapy=true, is_amputee=false WHERE id=$1`, [p]);
      await mkCase(p, "physiotherapy");
      const ex = await http("POST", `/api/medical/patients/${p}/exams`, S.doc2, {
        caseType: "physiotherapy", diagnosis: "تشخيصٌ سريريّ",
        commercial: { price: { kind: "normal", originalPrice: 250_000 }, decision: "bought" },
      });
      check(ex.status === 200 || ex.status === 201,
        "٦٥. **(٥) ومعاينةُ العلاج الطبيعي كذلك** — ولو حمل الطلبُ تسعيراً",
        String(ex.status));
      same("   **ولا متابعةَ بيعٍ لها أصلاً**",
        [await followupOf(p), (await moneyOf(p)).orders], [0, 0]);
    }
    {
      //  ④ **وتعديلُ معاينةٍ موجودة لا يمحو كلفتَها القديمة بصمت.**
      //  معاينةٌ من **قبل** هذا التبسيط تحمل سعراً حقيقياً — والشاشةُ
      //  الجديدة لا ترسل الحقلَ إطلاقاً عند التعديل، فيجب أن يبقى الرقمُ
      //  القديم كما هو، لا أن يُقرأ غيابُه محواً.
      const p = await mkPatient("تعديلُ معاينةٍ تحمل سعراً قديماً");
      await mkCase(p);
      const ex = await signExam(p, "prosthetic");
      const examId = ex.body.id;
      //  لقطةُ «قبل هذا التبسيط»: سعرٌ وخبيرٌ كُتبا مباشرةً على المعاينة —
      //  تماماً كما كان الطبيبُ يكتبهما من النافذة قبل هذه المرحلة.
      await sealedOverrideWrite(examId, 1234000, EXPERT);
      //  والشاشةُ الجديدةُ تعدّل التشخيصَ وحده — بلا `deviceCost` في الجسم.
      const edit = await http("PATCH", `/api/medical/exams/${examId}`, S.doc, {
        caseType: "prosthetic", diagnosis: "تشخيصٌ مُعدَّل",
      });
      check(edit.status === 200, "٦٦. **(٦) والتعديلُ ينجح**", JSON.stringify(edit.body));
      const after = (await q<{ dc: number | null; pe: number | null }>(
        `SELECT device_cost dc, proposed_expert_user_id pe FROM medical_exams WHERE id=$1`,
        [examId]))[0];
      same("   **ولا يُمحى الرقمُ القديم لمجرّد أن الشاشةَ لم ترسله**",
        [after.dc, after.pe], [1234000, EXPERT]);
    }
    {
      //  ⑤ **ونفسُ الحراسة تبقى فعّالة على نقطة التفاصيل** — حيث
      //  المسؤوليةُ التجاريةُ الحقيقية تقع الآن. الخصمُ غيرُ الصالح
      //  والمجّانيّةُ بلا أصلٍ ما زالا يُردّان **هناك**.
      const p = await mkPatient("نقصٌ يُردّ من البطاقة");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      const bad = await commercial(fid,
        { price: { kind: "free", originalPrice: null }, expertUserId: EXPERT }, S.recv);
      same("٦٧. **(٧) والبطاقةُ كذلك: نقصٌ ⟶ ٤٠٠ ولا نصفَ يُقبل**", bad.status, 400);
      same("   **ولا الخبيرُ حُفظ** — الطلبُ يُردّ كلُّه",
        [(await fRow(fid)).ex, (await fRow(fid)).pk], [null, null]);
    }
    {
      //  ⑥⑦ صاحبُ المعاينة يعدّل حقولَه من البطاقة، وغيرُه يُردّ.
      const p = await mkPatient("تعديلُ صاحبها");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await commercial(fid,
        { price: { kind: "normal", originalPrice: 1_000_000 }, expertUserId: EXPERT }, S.doc);
      same("٦٨. **(٨) صاحبُ المعاينة يعدّل سعرَه من بطاقة التفاصيل قبل البيع**",
        (await commercial(fid,
          { price: { kind: "discount", originalPrice: 1_000_000, finalPrice: 820_000 } },
          S.doc)).status, 200);
      same("   والقيمُ تغيّرت والمالكيةُ باقيةٌ له",
        [(await fRow(fid)).p, (await fRow(fid)).pk, (await fRow(fid)).po,
          Number((await fRow(fid)).pou)],
        [820_000, "discount", "doctor", DOC]);
      same("   ويبدّل خبيرَه كذلك",
        (await commercial(fid, { expertUserId: EXPERT2 }, S.doc)).status, 200);
      same("٦٩. **(٩) ومديرُ الفرع والاستقبالُ يُردّان عنهما**",
        [(await commercial(fid, { price: { kind: "normal", originalPrice: 1 } }, S.manager)).status,
          (await commercial(fid, { price: { kind: "normal", originalPrice: 1 } }, S.recv)).status,
          (await commercial(fid, { expertUserId: EXPERT }, S.manager)).status,
          (await commercial(fid, { expertUserId: EXPERT }, S.recv)).status],
        [403, 403, 403, 403]);
      same("   **وطبيبٌ آخر ليس صاحبَها يُردّ كذلك**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1 } }, S.doc2)).status,
        403);
      same("   والقيمُ لم تتغيّر بعد كلّ ذلك",
        [(await fRow(fid)).p, Number((await fRow(fid)).ex)], [820_000, EXPERT2]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك. **عقدُ الشاشات** — ما يراه الطبيبُ والموظّف
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. عقدُ الشاشات ──");
    {
      const read = (...parts: string[]) =>
        readFileSync(join(import.meta.dirname, "..", ...parts), "utf8");
      const exam = read("client", "src", "components", "medical", "NewExamDialog.tsx");
      const card = read("client", "src", "components", "PostExamDecisionCard.tsx");

      //  ① نافذةُ الطبيب صارت طبّيةً محضة — **لا أثرَ فيها لأيّ مفهومٍ
      //  تجاريّ إطلاقاً**، لا الأسماءُ القديمة (`priceKind`، `expertUserId`،
      //  `deviceCost`، …) ولا مفرداتُها العربية («نوع السعر»، «قرار
      //  المريض»، «مجاني»، …).
      for (const gone of [
        "priceKind", "discountFinal", "notBoughtReason", "expertUserId", "deviceCost",
        "commercialPayload", "confirmPrice", "priceCorrectionReason", "computeCommercialOffer",
        "MoneyInput", "block-exam-commercial", "radio-price-kind", "radio-purchase-decision",
        "input-not-bought-reason", "select-exam-expert", "input-exam-device-cost",
      ]) {
        check(!exam.includes(gone),
          `٥١. **ولا أثرَ لـ\`${gone}\`** في نموذج المعاينة`, gone);
      }
      for (const gone of ["نوع السعر", "قرار المريض", "تفاصيل البيع", "الخبير المقترح", "مجاني"]) {
        check(!exam.includes(gone),
          `٥١أ. **ولا عبارةَ «${gone}»** في نموذج المعاينة`, gone);
      }
      //  ② وما بقي حصراً: الاختصاص · الوصفةُ السريرية · الحقولُ السرديّة.
      check(exam.includes("select-exam-specialty") && exam.includes("<PrescriptionFields")
        && exam.includes("EXAM_FIELDS.map"),
        "٥١ب. **والذي بقي سريريٌّ محضٌ**: الاختصاص والوصفةُ والحقولُ السرديّة");
      check(/body: JSON\.stringify\(\{\s*caseType: specialty,\s*\.\.\.form,\s*prescription: rx,\s*\}\)/
        .test(exam),
        "٥١ج. **وجسمُ الحفظ ثلاثةُ حقولٍ سريرية لا أكثر**",
        (exam.match(/body: JSON\.stringify\(\{[\s\S]{0,150}/) ?? [""])[0]);

      //  ③ ونقطةُ التفاصيل التجارية (بطاقةُ المريض) كما كانت — لم تُمَسّ.
      check(card.includes("block-commercial-completion")
        && card.includes("field-commercial-${key}")
        && /\["price", "السعر",/.test(card)
        && /\["expert", "الخبير",/.test(card)
        && /\["decision", "القرار",/.test(card),
        "٥٦. والبطاقةُ تعرض السعرَ والخبيرَ والقرار سطراً سطراً");
      check(card.includes("button-open-commercial")
        && card.includes("button-decide-bought")
        && card.includes("button-decide-not-bought"),
        "٥٧. **وثلاثةُ أزرارٍ لا أكثر**");
      //  **والأفعالُ من الخادم لا من حسابٍ في الشاشة.**
      check(/const examActions: string\[\] = Array\.isArray\(active\.actions\)/.test(card),
        "٥٨. **والأفعالُ يقولها الخادم** — لا تحسبها الشاشة");
      check(/const actions = examPath \? \[\] : allowedActions\(/.test(card),
        "٥٩. **وأفعالُ المسار القديم تُخفى على العملية المبسّطة** — ولا تُحذَف من الموروث");
      check(card.includes("text-owner-") && card.includes("ownerLabels"),
        "٦٠. و«أدخله د. فلان» يُعرَض — لا رمزُ مالكيةٍ خام");
      check(!/owner === "doctor"/.test(card),
        "   ولا تحسب الشاشةُ المالكيةَ بنفسها");
    }
    void convertedFollowup;
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, DOC2, RECV, EXPERT, EXPERT2]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, DOC2, RECV, EXPERT, EXPERT2]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص المسار التجاري نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
