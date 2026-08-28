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
// **وذاك البقاءُ الانتقاليّ انتهى الآن.** القسمُ أعلاه وصف حالاً مؤقّتة —
// ومرحلةُ «تبسيط مبيعات الاستعلامات» التي أشار إليها هي **هذه المرحلةُ
// بعينها** (٤.i في CLAUDE.md، فرعُ `simplify-reception-sale-flow`).
//
// ══ **⚠ تصحيحٌ 2026-08-28 — تقاعدٌ شامل، لا حظرُ طبيبٍ فحسب** ═══════════════
// النسخةُ الأولى من هذه المرحلة قصرت التقاعدَ على الطبيب: أبقت
// `POST /api/followups/:id/commercial` (ومعه `/expert` و`/confirm-purchase`
// و`/approve-purchase`) **مفتوحةً للاستقبال ومديرِ الفرع والمسؤول** على مسار
// المعاينة، وحجبت الطبيبَ وحده. **وهذا خطأٌ صُحِّح صراحةً**: البابُ الجديد
// `/complete-sale`/`/not-bought` هو البابُ الوحيدُ الحيّ لمسار المعاينة —
// **للجميع بلا استثناءٍ للدور**، بما فيهم الاستقبالُ ومديرُ الفرع والمسؤولُ
// العام. فكلُّ بابٍ تجاريٍّ قديم (`/expert`, `/commercial`,
// `/commercial-price`, `/confirm-purchase`, `/approve-purchase`, `/close`)
// **متقاعدٌ على مسار المعاينة عقدَ مسارٍ لا قيدَ صلاحية** — الردُّ ٤٠٩ لا
// ٤٠٣، عبر الحارس المشترك `retiredOnExamPath`. **والمحاسبُ صار مخوَّلاً
// بالبابِ الجديد** أيضاً (كالاستقبال تماماً) — مُختبَرٌ في
// `server/reception_sale.test.ts`، لا في هذا الملفّ.
//
// **وهذا غيّر مهمّةَ هذا الملفّ**: آليّةُ `setCommercialFields`
// (المالكيةُ، الحفظُ الجزئيّ ثمّ الإكمال، التزامنُ على آخرِ حقلٍ ناقص،
// المجّانيّةُ الصريحة …) **لم تتغيّر بحرف** — لكنّ الصفَّ الجديد
// (`service_path = 'exam'`) لم يعد يصلها إلّا عبر `/complete-sale`
// بعقدها المبسّط الذرّيّ (خبيرٌ + سعرٌ أصليّ + خصمٌ معاً دائماً، لا سلسلةَ
// تعديلاتٍ جزئية). فهذا الملفُّ صار يثبت آليّةَ `setCommercialFields`
// نفسَها عبر **صفوفٍ موروثة** (`legacyFollowup` — حلقةٌ بلا `service_path`،
// ما قبل ترحيل ٠٦٥) حيث بابُها القديم لا يزال حيّاً بحرفه — لا لأنه يظنّ
// الصفَّ الجديد يسلك المسارَ نفسَه، بل لأن هذه هي الطريقةُ الوحيدة الباقية
// لاختبار الآليّة عبر بابها الأصليّ.
//
// وما يُثبته هنا:
//   • **ولا مسؤوليةَ تجارية على التوقيع مهما وصل في جسمه** — قسمٌ (ي‌ب).
//   • **والتقاعدُ شاملٌ للجميع على مسار المعاينة** (قسمٌ أ) — لا الطبيبُ
//     وحده؛ الاستقبالُ ومديرُ الفرع والمسؤولُ يُردّون هنا أيضاً بـ٤٠٩.
//   • مالكيةُ الحقول للموظّفين في الاتجاهين، والحفظُ الجزئيّ، والتزامن،
//     والمجّانيّةُ الصريحة (ب–ح) — **عبر صفوفٍ موروثة**، بابُها القديم الحيّ.
//   • «اشترى» كاملاً ⟶ أمرُ تصنيعٍ **واحد** وقيدُ كلفةٍ **واحد**، بلا اعتماد.
//   • «اشترى» ناقصاً ⟶ القرارُ **يُحفَظ**، ولا مالَ ولا تصنيع، ثمّ يُكمله
//     الموظّف فيُتمّ الخادمُ البيعَ **ذرّياً** — وضغطتان تُنتجان تحويلاً واحداً.
//   • «لم يشترِ» بلا سببٍ ⟶ ٤٠٠ · وبسببٍ ⟶ إغلاقٌ بلا دينار.
//   • الخصمُ والمجّانيّة **نافذةٌ فوراً بلا `service_discount_requests`**.
//   • و**«لم يُسعَّر» ≠ «مجّانيّ»** — الصفرُ لم يبقَ يقول الاثنين.
//
// **والبابُ الجديد** (`/complete-sale`, `/not-bought`) والتقاعدُ الشاملُ
// وتكافؤُ المحاسب والاستقبال وملاحظاتُ الطبيب في بطاقة البيع — كلُّها محورُ
// الاختبار المخصَّص `server/reception_sale.test.ts`، لا هذا الملفّ.

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

/**
 * صفٌّ **موروث** — حلقةٌ من قبل ترحيل ٠٦٥ بلا `service_path` (`NULL`).
 *
 * **⚠ تصحيحٌ 2026-08-28 — لماذا هذا الملفُّ صار يعتمد عليها فعلياً**: البابُ
 * القديم `/commercial` (ومعه `/expert`، `/confirm-purchase`،
 * `/approve-purchase`) بقي حيّاً بحرفه، **لكن على الصفوف الموروثة وحدها**.
 * صفٌّ جديد (`service_path = 'exam'`) لا يصل آليّةَ `setCommercialFields`
 * إلّا عبر `/complete-sale`/`/not-bought` (المُختبَرَين حصراً في
 * `server/reception_sale.test.ts`، بعقدهما المبسّط: خبيرٌ + سعرٌ أصليّ +
 * خصمٌ، حفظٌ واحدٌ ذرّيّ لا سلسلةَ تعديلاتٍ جزئية). فهذا الملفُّ يستعمل صفوفاً
 * موروثة **عمداً** ليبقى يثبت آليّةَ `setCommercialFields` نفسَها (المالكية،
 * الحفظُ الجزئيّ ثم الإكمال، التزامنُ على آخرِ حقلٍ ناقص، المجّانيّةُ
 * الصريحة …) عبر بابها الأصليّ — لا لأنه يظنّ الصفَّ الجديد يسلك المسارَ
 * نفسَه.
 */
async function legacyFollowup(
  label: string, caseType = "prosthetic", opts: { support?: boolean } = {},
): Promise<{ pid: number; cid: number; fid: number }> {
  const pid = await mkPatient(label, opts);
  const cid = await mkCase(pid, caseType);
  await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
             sequence_number, status, agreed_cost, requested_item, created_by)
           VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',$3)`, [pid, cid, MANAGER]);
  await signExam(pid, caseType);
  const fid = await followupOf(pid);
  return { pid, cid, fid };
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
    same("٩. **(المرحلةُ الثانية) فعلان لا أكثر — «إتمام البيع» و«لم يشترِ»**",
      [
        examPathActions({ session: S.recv, status: "awaiting_patient_decision", mayAct: true }),
        //  قرارٌ مملوكٌ لغير الجالس — لا يظهر له الفعلان (موروثٌ من قبل
        //  هذه المرحلة، إذ لا طريقَ حيّاً يُنتج قراراً مملوكاً للطبيب اليوم).
        examPathActions({
          session: S.recv, status: "awaiting_patient_decision",
          decisionField: { owner: "doctor", ownerUserId: DOC, ownerName: "سعد" }, mayAct: true }),
        examPathActions({ session: S.recv, status: "converted", mayAct: true }),
      ],
      [["complete_sale", "not_bought"], [], []]);
    same("١٠. وسطرُ الحالة يقول ما ينقص بالعربية",
      examPathStatusLine({
        status: "awaiting_patient_decision", decision: "bought", missing: ["expert"],
      }), `${PENDING_SALE_DATA_LABEL} — الخبير`);

    // ══════════════════════════════════════════════════════════════════
    //  أ. **تقاعدٌ شاملٌ على مسار المعاينة — للجميع بلا استثناءٍ للدور**
    //     (تصحيحٌ 2026-08-28؛ ومالكيةُ حقلٍ **موروثة** تُختبَر على صفٍّ
    //     موروثٍ حقيقيّ حيث بابُها الحيّ لا يزال قائماً)
    // ══════════════════════════════════════════════════════════════════
    //  المصفوفةُ الكاملة (٦ أبوابٍ × ٥ فاعلين) في `server/reception_sale.test.ts`
    //  قسم «ي». هنا: تأكيدٌ مركَّزٌ أن **لا فرقَ بين طبيبٍ وموظّف** على مسار
    //  المعاينة — بالضبط الفرقُ الذي صحَّحه هذا التاريخ (كان التصميمُ الأوّل
    //  يردّ الطبيبَ ٤٠٣ ويقبل الباقين ٢٠٠؛ صار الجميعُ ٤٠٩ سواء).
    console.log("\n── أ. تقاعدٌ شاملٌ على مسار المعاينة ──");
    {
      const p = await mkPatient("تقاعدٌ شامل");
      await mkCase(p);
      same("١١. طلبُ الجهاز على مسار المعاينة", (await startEpisode(p)).status, 201);
      //  التوقيعُ سريريٌّ محضٌ — بلا سعرٍ ولا خبيرٍ في جسمه.
      const ex = await signExam(p, "prosthetic");
      check(ex.status === 200 || ex.status === 201, "١٢. المعاينةُ وُقّعت", String(ex.status));
      const fid = await followupOf(p);

      //  ══ **لا فرقَ بين طبيبٍ وموظّف — عقدُ مسارٍ لا قيدُ دور** ═══════
      for (const [who, sess] of [["الطبيب", S.doc], ["الاستقبال", S.recv],
        ["مديرُ الفرع", S.manager], ["المسؤول", S.admin]] as any[]) {
        const r1 = await commercial(fid,
          { price: { kind: "normal", originalPrice: 1_500_000 }, expertUserId: EXPERT }, sess);
        same(`١٣. **${who}: يُردّ عن \`/commercial\` على مسار المعاينة بـ٤٠٩**`, r1.status, 409);
        same(`١٤. **${who}: وعن \`/expert\` بـ٤٠٩ كذلك**`,
          (await http("POST", `/api/followups/${fid}/expert`, sess,
            { expertUserId: EXPERT })).status, 409);
        same(`١٥. **${who}: وعن \`/confirm-purchase\`/\`/approve-purchase\` بـ٤٠٩**`,
          [(await http("POST", `/api/followups/${fid}/confirm-purchase`, sess, {})).status,
            (await http("POST", `/api/followups/${fid}/approve-purchase`, sess, {})).status],
          [409, 409]);
      }
      same("   **ولا شيءَ كُتب بكلّ هذه المحاولات — بمَن فيهم المسؤولُ العام**",
        [(await fRow(fid)).pk, (await fRow(fid)).ex, (await fRow(fid)).status],
        [null, null, "awaiting_patient_decision"]);
    }

    {
      //  ══ **والمالكيةُ الموروثة — على صفٍّ موروثٍ حقيقيّ** ═══════════════
      //  صفٌّ بهذا الشكل (مالكيةٌ للطبيب على `/commercial`) قائمٌ فعلاً على
      //  الإنتاج من قبل هذه المرحلة — لكنّ بابَه الحيّ الوحيد اليوم صفٌّ
      //  **موروث** (`service_path IS NULL`)، لا صفٌّ على مسار المعاينة (ذاك
      //  يُردّ ٤٠٩ فوق، بصرف النظر عن أيّ مالكية). فالحراسةُ تُختبَر هنا عبر
      //  بابها الحيّ الحقيقيّ — `legacyFollowup` توقّع المعاينةَ بـ`S.doc`
      //  فعلياً، فهو صاحبُها الحقيقيّ لا محاكاةً مجرَّدة.
      const { pid: p, fid } = await legacyFollowup("مالكيةٌ موروثة");
      await q(`UPDATE post_exam_followups SET
                 original_price = 1500000, approved_price = 1500000, price_kind = 'normal',
                 price_source = 'exam',
                 price_owner = 'doctor', price_owner_user_id = $2, price_owner_name = 'سعد',
                 selected_expert_user_id = $3,
                 expert_owner = 'doctor', expert_owner_user_id = $2, expert_owner_name = 'سعد'
               WHERE id = $1`, [fid, DOC, EXPERT]);

      same("١٦. **(الملكيةُ الموروثة) الاستقبالُ لا يكتب فوق سعر الطبيب**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 900_000 } }, S.recv)).status,
        403);
      same("   ومديرُ الفرع كذلك — قرارُ مالكٍ صريح",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 900_000 } }, S.manager)).status,
        403);
      same("   ومن البابِ القديم أيضاً (`commercial-price`) — لا نافذةَ خلفية",
        (await http("POST", `/api/followups/${fid}/commercial-price`, S.manager,
          { finalPrice: 900_000, reason: "مساومة" })).status, 403);
      same("١٧. **وصاحبُها الطبيبُ نفسُه يكتب فوق سعره على الصفّ الموروث**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1_600_000 } }, S.doc)).status,
        200);
      same("١٨. **وطبيبٌ آخر لا يكتب فوق سعر زميله — ملكيةٌ لصاحبها لا للمهنة**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1_650_000 } }, S.doc2)).status,
        403);
      same("١٩. **والمسؤولُ العام وحده يصحّح أيضاً**",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1_700_000 } }, S.admin)).status,
        200);
      same("   **والمالكيةُ ما زالت للطبيب** — التصحيحُ الإداريّ لا يُسلّمها للاستقبال",
        [(await fRow(fid)).po, Number((await fRow(fid)).pou)], ["doctor", DOC]);
      same("   فالاستقبالُ ما زال يُردّ بعد تصحيح المسؤول",
        (await commercial(fid, { price: { kind: "normal", originalPrice: 1 } }, S.recv)).status, 403);
      //  والخبيرُ كذلك — ومن بابه القديم أيضاً.
      same("٢٠. **والخبيرُ الذي أسنَده الطبيبُ لا يُبدَّل من الاستقبال**",
        (await commercial(fid, { expertUserId: EXPERT2 }, S.recv)).status, 403);
      same("   ولا من نقطة `expert` القديمة",
        (await http("POST", `/api/followups/${fid}/expert`, S.recv,
          { expertUserId: EXPERT2 })).status, 403);
      same("   ومديرُ الفرع كذلك",
        (await http("POST", `/api/followups/${fid}/expert`, S.manager,
          { expertUserId: EXPERT2 })).status, 403);
      //  والمسؤولُ العام يُتمّ ما تبقّى — والملكيةُ باقيةٌ للطبيب فوق ذلك،
      //  ثمّ يقرّر «اشترى» فيكتمل البيعُ ذرّياً في المعاملة نفسِها.
      same("٢١. **والمسؤولُ يُتمّ ما تبقّى فيتحوّل الصفُّ**", await (async () => {
        await commercial(fid, { expertUserId: EXPERT }, S.admin);
        const done = await commercial(fid, { decision: "bought" }, S.admin);
        return done.body?.converted;
      })(), true);
      same("   بحالةٍ محوَّلة", (await fRow(fid)).status, "converted");
    }

    {
      //  **و`/close` القديم متقاعدٌ على مسار المعاينة أيضاً** (المرحلة
      //  الثانية) — بابُ «لم يشترِ» الوحيد صار `/not-bought` بسببٍ حرٍّ
      //  إلزاميّ، لا رمزَ إغلاقٍ من قائمةٍ ثابتة. والتقاعدُ **للجميع** كبقيّة
      //  الأفعال المتقاعدة (`/defer` ونحوها) — لا فرقَ بين طبيبٍ وموظّف.
      const p = await mkPatient("إغلاقٌ متقاعد");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      for (const [who, sess] of [["الاستقبال", S.recv], ["مديرُ الفرع", S.manager],
        ["الطبيب", S.doc], ["المسؤول", S.admin]] as any[]) {
        same(`٢٠أ. **${who}: \`/close\` متقاعدٌ على مسار المعاينة**`,
          (await http("POST", `/api/followups/${fid}/close`, sess,
            { reason: "price", note: "x" })).status, 409);
      }
      same("   والصفُّ لم يتغيّر", (await fRow(fid)).status, "awaiting_patient_decision");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب. **(ب)(د)(و)(ح)** ما تركه الطبيبُ فارغاً يُكمله الموظّف
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الفارغُ يُكمله مَن حضر (صفٌّ موروث — بابُه القديم حيّ) ──");
    {
      //  بلا سعرٍ ولا خبيرٍ ولا قرار — `legacyFollowup` توقّع سريرياً محضاً.
      const { pid: p, fid } = await legacyFollowup("فراغٌ يُكمَل");
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
    console.log("\n── ج. اشترى + بياناتٌ كاملة (صفٌّ موروث) ──");
    let convertedFollowup = 0;
    {
      const { pid: p, cid: c, fid } = await legacyFollowup("اشترى كاملاً");
      const set = await commercial(fid, {
        price: { kind: "normal", originalPrice: 2_000_000 },
        expertUserId: EXPERT, decision: "bought",
      }, S.recv);
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
    console.log("\n── د. اشترى + بياناتٌ ناقصة (صفٌّ موروث) ──");
    {
      //  (ي) ناقصُ الخبير — عبر البابِ القديم (حيٌّ على الصفوف الموروثة).
      const { pid: p, fid } = await legacyFollowup("اشترى بلا خبير");
      const set = await commercial(fid,
        { price: { kind: "normal", originalPrice: 1_100_000 }, decision: "bought" }, S.recv);
      same("٣٠. **(ي) القرارُ حُفظ ولم يُتمّ البيع**",
        [set.body?.converted, set.body?.missing, (await fRow(fid)).pd, (await fRow(fid)).status],
        [false, ["expert"], "bought", "awaiting_patient_decision"]);
      same("   **ولا مالَ ولا تصنيع**",
        await moneyOf(p), { total: 0, orders: 0, cost_entries: 0, payments: 0, discounts: 0 });
      //  والصفُّ **موروث** (`examPath=false`) فلا يكتسب عرضَ مسار المعاينة —
      //  لا `statusLine` ولا `actions` («إتمام البيع»/«لم يشترِ» عرضٌ
      //  لمسار المعاينة وحده). و`missing` تُحسَب دائماً بلا شرط examPath —
      //  وهذا الفرقُ نفسُه بين حالةٍ حيّةٍ على مسار المعاينة (تُختبَر في
      //  «٣٣أ» أدناه) وصفٍّ موروثٍ عاديّ.
      const card = await http("GET", `/api/followups/patient/${p}`, S.recv);
      same("٣١. **والصفُّ الموروث لا يكتسب عرضَ مسار المعاينة**",
        [card.body?.[0]?.examPath, card.body?.[0]?.statusLine, card.body?.[0]?.actions,
          card.body?.[0]?.missing],
        [false, null, null, ["expert"]]);
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
      //  (ك) ناقصُ السعر — عبر البابِ القديم كذلك.
      const { pid: p, fid } = await legacyFollowup("اشترى بلا سعر");
      await commercial(fid, { expertUserId: EXPERT, decision: "bought" }, S.recv);
      same("٣٣. **(ك) ناقصُ السعر — القرارُ محفوظٌ والمالُ صفر**",
        [(await fRow(fid)).pd, (await fRow(fid)).pk, (await moneyOf(p)).orders], ["bought", null, 0]);
      const done = await commercial(fid,
        { price: { kind: "normal", originalPrice: 700_000 } }, S.recv);
      same("   وإكمالُ السعر أتمّ البيع", [done.body?.converted, (await moneyOf(p)).total],
        [true, 700_000]);
    }
    {
      //  **حالةٌ جزئيةٌ تاريخية على مسار المعاينة نفسه** — صفٌّ قد يحمل
      //  «اشترى» بلا خبير من فترة ما قبل هذا التصحيح (كان `/commercial` حيّاً
      //  هناك أيضاً حينذاك). البابُ الحيّ اليوم (`/complete-sale`) لا يُنتج
      //  هذه الحالةَ أبداً — يلمس الحقولَ الثلاثة معاً دائماً — **لكنّ نموذج
      //  القراءة يجب أن يبقى صادقاً لها، والإكمالُ عبر البابِ الجديد ممكناً.**
      const p = await mkPatient("حالةٌ جزئيةٌ تاريخية على مسار المعاينة");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");
      const fid = await followupOf(p);
      await q(`UPDATE post_exam_followups SET
                 original_price = 1100000, approved_price = 1100000, price_kind = 'normal',
                 price_source = 'reception_set',
                 price_owner = 'staff', price_owner_user_id = $2, price_owner_name = 'ريام',
                 purchase_decision = 'bought', purchase_decision_at = NOW(),
                 purchase_decision_owner = 'staff', purchase_decision_user_id = $2,
                 purchase_decision_name = 'ريام'
               WHERE id = $1`, [fid, RECV]);
      const card = await http("GET", `/api/followups/patient/${p}`, S.recv);
      same("٣٣أ. **والبطاقةُ تقرأ حالةً جزئيةً تاريخيةً على مسار المعاينة بصدق**",
        [card.body?.[0]?.statusLine, card.body?.[0]?.missing, card.body?.[0]?.actions], [
          `${PENDING_SALE_DATA_LABEL} — الخبير`, ["expert"], ["complete_sale", "not_bought"]]);
      //  والبابُ الجديدُ وحده يُكملها — لا البابُ القديمُ المتقاعد.
      const done2 = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 1_100_000, discountAmount: 0, expertUserId: EXPERT });
      same("    **والبابُ الجديد يُكملها ذرّياً**", [done2.status, done2.body?.converted], [200, true]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. **(ل)** ضغطتان على آخرِ ناقص ⟶ تحويلٌ واحد (صفٌّ موروث)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. التزامن على آخرِ حقلٍ ناقص ──");
    {
      const { pid: p, fid } = await legacyFollowup("ضغطتان متزامنتان");
      await commercial(fid,
        { price: { kind: "normal", originalPrice: 1_300_000 }, decision: "bought" }, S.recv);
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
    console.log("\n── و. لم يشترِ (صفٌّ موروث) ──");
    {
      const { pid: p, fid } = await legacyFollowup("لم يشترِ");
      await commercial(fid, { price: { kind: "normal", originalPrice: 800_000 } }, S.recv);
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
      //  (ع) قرارٌ موروثٌ للطبيب «لم يشترِ» لا يقلبه موظّف — على **صفٍّ
      //  موروثٍ حقيقيّ** حيث بابُ `/commercial` القديم لا يزال حيّاً، وحارسُ
      //  المالكية عنده يبقى فعّالاً بحرفه.
      const { pid: p, fid } = await legacyFollowup("قرارٌ موروثٌ: لم يشترِ");
      await q(`UPDATE post_exam_followups SET
                 original_price = 950000, approved_price = 950000, price_kind = 'normal',
                 price_owner = 'doctor', price_owner_user_id = $2, price_owner_name = 'سعد',
                 selected_expert_user_id = $3,
                 expert_owner = 'doctor', expert_owner_user_id = $2, expert_owner_name = 'سعد',
                 status = 'closed_without_purchase', closed_reason = 'other', closed_at = NOW(),
                 purchase_decision = 'not_bought', purchase_decision_at = NOW(),
                 purchase_decision_owner = 'doctor', purchase_decision_user_id = $2,
                 purchase_decision_name = 'سعد', not_bought_reason_text = 'اختار مركزاً آخر'
               WHERE id = $1`, [fid, DOC, EXPERT]);
      same("٣٨. **(ع) قرارٌ موروثٌ للطبيب «لم يشترِ»**",
        [(await fRow(fid)).status, (await fRow(fid)).pd, (await fRow(fid)).pdo,
          Number((await fRow(fid)).pdu)],
        ["closed_without_purchase", "not_bought", "doctor", DOC]);
      const reopened = await http("POST", `/api/followups/${fid}/reopen`, S.recv, {});
      check(reopened.status === 200, "٣٩. والاستقبالُ يعيد فتحَه (مسارٌ قائم)",
        JSON.stringify(reopened.body));
      const flip = await commercial(fid, { decision: "bought" }, S.recv);
      same("٤٠. **(ع) لكنّه لا يقلب القرارَ الموروث إلى «اشترى»**", flip.status, 403);
      same("   والمسؤولُ يقدر",
        (await commercial(fid, { decision: "bought" }, S.admin)).status, 200);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز. **(ر)** المجّانيُّ الصريح
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. مجّانيٌّ صريح (صفٌّ موروث) ──");
    {
      const { pid: p, cid: c, fid } = await legacyFollowup("تبرّعٌ صريح");
      const set = await commercial(fid, {
        price: { kind: "free", originalPrice: 1_800_000 },
        expertUserId: EXPERT, decision: "bought",
      }, S.recv);
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
      const { pid: p, fid } = await legacyFollowup("تبرّعٌ لا يُكتب فوقه");
      await commercial(fid, { price: { kind: "free", originalPrice: 600_000 } }, S.recv);
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
      //  والمسندُ على مسار المعاينة يمرّ **بالبابِ الجديد** — لا فرقَ عن
      //  الأطراف. (`/commercial` نفسُها مُختبَرةٌ على المساند عبر الصفوف
      //  الموروثة ضمنياً؛ الجديدُ هو `/complete-sale`، ومُختبَرٌ حصراً
      //  للأطراف في `server/reception_sale.test.ts`، فهنا إثباتُ عزل الخدمة.)
      const p = await mkPatient("مسندٌ طبيّ", { support: true });
      await mkCase(p, "medical_support");
      same("٤٤. المسندُ يمرّ بالمسار نفسه",
        (await startEpisode(p, "medical_support")).status, 201);
      await signExam(p, "medical_support");
      const fid = await followupOf(p);
      const set = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 400_000, discountAmount: 0, expertUserId: EXPERT });
      same("   ويُتمّ بيعَه كالأطراف — عبر البابِ الجديد", set.body?.converted, true);
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
      //  إتمامُ البيع عبر البابِ الجديد — المسارُ الوحيدُ الحيّ على هذا
      //  الصفّ اليوم؛ والغرضُ هنا سلامةُ الكاسكيد لا آليّةَ البيع.
      await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 900_000, discountAmount: 200_000, expertUserId: EXPERT });
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
      //  ⑤ **ونفسُ الحراسة تبقى فعّالة على `/commercial` — على صفٍّ موروثٍ
      //  حيث بابُها حيّ.** الخصمُ غيرُ الصالح والمجّانيّةُ بلا أصلٍ ما زالا
      //  يُردّان **هناك**؛ وتحقّقُ `/complete-sale` من العرض التجاريّ
      //  (`deriveOfferFromDiscount`) مُختبَرٌ في `server/reception_sale.test.ts`.
      const { pid: p, fid } = await legacyFollowup("نقصٌ يُردّ من البطاقة");
      const bad = await commercial(fid,
        { price: { kind: "free", originalPrice: null }, expertUserId: EXPERT }, S.recv);
      same("٦٧. **(٧) والبطاقةُ كذلك: نقصٌ ⟶ ٤٠٠ ولا نصفَ يُقبل**", bad.status, 400);
      same("   **ولا الخبيرُ حُفظ** — الطلبُ يُردّ كلُّه",
        [(await fRow(fid)).ex, (await fRow(fid)).pk], [null, null]);
    }
    {
      //  ⑥⑦ **(تصحيحٌ 2026-08-28) لا فرقَ بين صاحب المعاينة وطبيبٍ آخر —
      //  ولا فرقَ بين طبيبٍ وموظّف أيضاً** على مسار المعاينة: الثلاثةُ
      //  يُردّون بنفس ٤٠٩ عن `/commercial` — **تقاعدُ مسارٍ لا حراسةَ
      //  مالكيةٍ ولا قيدَ دور**. والاستقبالُ يُتمّ البيعَ من بابه الوحيد.
      const p = await mkPatient("لا فرقَ بين الأطباء ولا الموظّفين");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic");  //  DOC هو مَن وقّع
      const fid = await followupOf(p);
      same("٦٨. **صاحبُ المعاينة وطبيبٌ آخر ومديرُ الفرع يُردّون معاً — ٤٠٩ للجميع**",
        [(await commercial(fid,
          { price: { kind: "normal", originalPrice: 1_000_000 } }, S.doc)).status,
          (await commercial(fid,
            { price: { kind: "normal", originalPrice: 1_000_000 } }, S.doc2)).status,
          (await commercial(fid,
            { price: { kind: "normal", originalPrice: 1_000_000 }, expertUserId: EXPERT },
            S.manager)).status],
        [409, 409, 409]);
      same("٦٩. **والاستقبالُ يُتمّ البيعَ من بابه الوحيد `/complete-sale`**",
        (await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
          { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT })).body?.converted,
        true);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك. **عقدُ الشاشات** — ما يراه الطبيبُ والموظّف (المرحلة الثانية)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. عقدُ الشاشات ──");
    {
      const read = (...parts: string[]) =>
        readFileSync(join(import.meta.dirname, "..", ...parts), "utf8");
      const exam = read("client", "src", "components", "medical", "NewExamDialog.tsx");
      const card = read("client", "src", "components", "PostExamDecisionCard.tsx");

      //  ① نافذةُ الطبيب تبقى طبّيةً محضة — **لا أثرَ فيها لأيّ مفهومٍ
      //  تجاريّ إطلاقاً** (لم تُمَسّ في هذه المرحلة، مُختبَرةٌ مجدَّداً هنا
      //  كي لا ينحرف عقدٌ ثابتٌ عبر مرحلتين).
      for (const gone of [
        "priceKind", "discountFinal", "notBoughtReason", "expertUserId", "deviceCost",
        "commercialPayload", "confirmPrice", "priceCorrectionReason", "computeCommercialOffer",
        "MoneyInput", "block-exam-commercial", "radio-price-kind", "radio-purchase-decision",
        "input-not-bought-reason", "select-exam-expert", "input-exam-device-cost",
      ]) {
        check(!exam.includes(gone),
          `٧٠. **ولا أثرَ لـ\`${gone}\`** في نموذج المعاينة`, gone);
      }
      for (const gone of ["نوع السعر", "قرار المريض", "تفاصيل البيع", "الخبير المقترح", "مجاني"]) {
        check(!exam.includes(gone),
          `٧٠أ. **ولا عبارةَ «${gone}»** في نموذج المعاينة`, gone);
      }
      //  ② وما بقي حصراً: الاختصاص · الوصفةُ السريرية · الحقولُ السرديّة.
      check(exam.includes("select-exam-specialty") && exam.includes("<PrescriptionFields")
        && exam.includes("EXAM_FIELDS.map"),
        "٧٠ب. **والذي بقي سريريٌّ محضٌ**: الاختصاص والوصفةُ والحقولُ السرديّة");
      check(/body: JSON\.stringify\(\{\s*caseType: specialty,\s*\.\.\.form,\s*prescription: rx,\s*\}\)/
        .test(exam),
        "٧٠ج. **وجسمُ الحفظ ثلاثةُ حقولٍ سريرية لا أكثر**",
        (exam.match(/body: JSON\.stringify\(\{[\s\S]{0,150}/) ?? [""])[0]);

      //  ③ **وبطاقةُ المريض صارت بابَ إتمامٍ واحد** — لا زرَّين منفصلَين
      //  «تفاصيل البيع» و«اشترى»، ولا محدِّدَ نوعِ سعر، ولا حقلَ سعرٍ
      //  نهائيٍّ قابلاً للتحرير، ولا مالكيةَ تُعرَض حقلاً حقلاً كالسابق.
      for (const gone of [
        "button-open-commercial", "button-decide-bought", "field-commercial-price",
        "radio-c-kind", "select-c-expert", "input-c-original", "input-c-final",
        "text-c-free", "text-c-untouched", "text-c-block", "text-price-locked",
        "text-expert-locked", "button-save-commercial", "text-owner-", "ownerLabels.",
      ]) {
        check(!card.includes(gone),
          `٧١. **ولا أثرَ لـ\`${gone}\`** في بطاقة المريض`, gone);
      }
      //  والبابُ الواحدُ الباقي: خبيرٌ · سعرٌ أصليّ · مقدارُ خصم · نهائيٌّ
      //  للقراءة فقط (معاينةٌ حيّة، لا حقلٌ يُكتب فيه).
      check(card.includes("block-exam-path-sale")
        && card.includes("button-open-complete-sale")
        && card.includes("select-complete-sale-expert")
        && card.includes("input-complete-sale-original")
        && card.includes("input-complete-sale-discount")
        && card.includes("text-complete-sale-final")
        && card.includes("text-complete-sale-free")
        && card.includes("button-save-complete-sale"),
        "٧٢. **وبابٌ واحد**: خبيرٌ + سعرٌ أصليّ + مقدارُ خصم + نهائيٌّ للقراءة");
      //  «لم يشترِ» بقي فعلاً منفصلاً، ببابه المستقلّ الجديد `/not-bought`.
      check(card.includes("button-decide-not-bought") && card.includes("input-c-reason")
        && card.includes("button-save-not-bought") && card.includes("/not-bought`"),
        "٧٣. **و«لم يشترِ» منفصلٌ ببابه المستقلّ** `/not-bought`");
      check(card.includes("/complete-sale`"),
        "٧٤. **والحفظُ ينادي `/complete-sale` القانونية**");
      //  والأفعالُ من الخادم لا من حسابٍ في الشاشة — لم يتغيّر.
      check(/const examActions: string\[\] = Array\.isArray\(active\.actions\)/.test(card),
        "٧٥. **والأفعالُ يقولها الخادم** — لا تحسبها الشاشة");
      check(/const actions = examPath \? \[\] : allowedActions\(/.test(card),
        "٧٦. **وأفعالُ المسار القديم تُخفى على العملية المبسّطة** — ولا تُحذَف من الموروث");
      //  والمجّانيُّ صريحٌ دائماً — في نافذة الإتمام (معاينةً) وبعد البيع
      //  (نتيجةً) معاً — لا صفرٌ يُقرأ «غير مسعَّر».
      check(card.includes("مجاني — ٠ د.ع") && card.includes("مجاني (٠ د.ع)"),
        "٧٧. **والمجّانيُّ صريحٌ دائماً** — لا صفرٌ صامت");
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
