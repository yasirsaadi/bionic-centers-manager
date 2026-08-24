// **مسارُ المعاينة التجاريّ** — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:exam-commercial`.
//
// ══ الثابتُ الذي يحرسه ═════════════════════════════════════════════════════
// **معاينة ⟶ تفاصيلُ البيع ⟶ قرارٌ واحد: اشترى / لم يشترِ.**
// ولكلّ حقلٍ تجاريٍّ **مالك**: ما أدخله الطبيبُ لا يكتب فوقه استقبالٌ ولا
// مديرُ فرع — بل صاحبُه أو المسؤولُ العام. وما تركه فارغاً يُكمله مَن حضر.
//
// وما يُثبته هنا:
//   • مالكيةُ الحقول الثلاثة في الاتجاهين (أ–ح).
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

/** توقيعُ معاينةٍ — ومعها التفاصيلُ التجارية إن أُرسلت. */
const signExam = (patientId: number, caseType = "prosthetic", commercial?: any,
  session: any = S.doc) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType, diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
    ...(commercial === undefined ? {} : { commercial }),
  });

const commercial = (followupId: number, patch: any, session: any) =>
  http("POST", `/api/followups/${followupId}/commercial`, session, patch);

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
    //  أ. **(أ)(ج)(هـ)(ز)** الطبيبُ يُدخل الثلاثة ⟶ مقفولةٌ على غيره
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. ما أدخله الطبيبُ مقفولٌ على غيره ──");
    {
      const p = await mkPatient("مالكيةُ الطبيب");
      await mkCase(p);
      same("١١. طلبُ الجهاز على مسار المعاينة", (await startEpisode(p)).status, 201);
      //  الطبيبُ يوقّع ومعه السعرُ والخبيرُ والقرار «لم يُقرَّر بعد».
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "normal", originalPrice: 1_500_000 },
        expertUserId: EXPERT,
      });
      check(ex.status === 200 || ex.status === 201, "١٢. المعاينةُ وُقّعت", String(ex.status));
      const fid = await followupOf(p);
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
      await signExam(p, "prosthetic", {
        price: { kind: "normal", originalPrice: 1_000_000 }, decision: "bought",
      });
      const fid = await followupOf(p);
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
      await signExam(p, "prosthetic", {});  //  بلا سعرٍ ولا خبيرٍ ولا قرار
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
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "normal", originalPrice: 2_000_000 },
        expertUserId: EXPERT, decision: "bought",
      });
      same("٢٦. **(ط) التوقيعُ نفسُه أتمّ البيع**",
        [ex.body?.commercial?.converted, typeof ex.body?.commercial?.workOrderId],
        [true, "number"]);
      const fid = await followupOf(p);
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
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "normal", originalPrice: 1_100_000 }, decision: "bought",
      });
      const fid = await followupOf(p);
      same("٣٠. **(ي) القرارُ حُفظ ولم يُتمّ البيع**",
        [ex.body?.commercial?.converted, ex.body?.commercial?.missing,
          (await fRow(fid)).pd, (await fRow(fid)).status],
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
      await signExam(p, "prosthetic", { expertUserId: EXPERT, decision: "bought" });
      const fid = await followupOf(p);
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
      await signExam(p, "prosthetic", {
        price: { kind: "normal", originalPrice: 1_300_000 }, decision: "bought",
      });
      const fid = await followupOf(p);
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
      await signExam(p, "prosthetic", { price: { kind: "normal", originalPrice: 800_000 } });
      const fid = await followupOf(p);
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
      await signExam(p, "prosthetic", {
        price: { kind: "normal", originalPrice: 950_000 }, expertUserId: EXPERT,
        decision: "not_bought", notBoughtReason: "اختار مركزاً آخر",
      });
      const fid = await followupOf(p);
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
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "free", originalPrice: 1_800_000 },
        expertUserId: EXPERT, decision: "bought",
      });
      const fid = await followupOf(p);
      const row = await fRow(fid);
      same("٤١. **(ر) النهائيُّ صفرٌ والأصلُ محفوظ — ولا اعتمادَ**",
        [row.p, row.op, row.pk, (await moneyOf(p)).discounts], [0, 1_800_000, "free", 0]);
      same("٤٢. **والبيعُ تمّ بلا أن يُقرأ «غير مسعَّر»**",
        [ex.body?.commercial?.converted, row.status], [true, "converted"]);
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
      await signExam(p, "prosthetic", { price: { kind: "free", originalPrice: 600_000 } });
      const fid = await followupOf(p);
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
      const ex = await signExam(p, "medical_support", {
        price: { kind: "normal", originalPrice: 400_000 },
        expertUserId: EXPERT, decision: "bought",
      });
      same("   ويُتمّ بيعَه كالأطراف", ex.body?.commercial?.converted, true);
    }
    {
      //  **العلاجُ الطبيعي لا يستقبل هذه الحقول إطلاقاً** — تُسقَط في الخادم.
      const p = await mkPatient("علاجٌ طبيعي");
      await q(`UPDATE patients SET is_physiotherapy=true, is_amputee=false WHERE id=$1`, [p]);
      await mkCase(p, "physiotherapy");
      const ex = await signExam(p, "physiotherapy", {
        price: { kind: "normal", originalPrice: 250_000 }, decision: "bought",
      }, S.doc2);
      check(ex.status === 200 || ex.status === 201,
        "٤٥. **معاينةُ العلاج الطبيعي تُوقَّع**", String(ex.status));
      same("   **ولا تفاصيلَ تجارية تُطبَّق عليها ولا متابعةَ بيع**",
        [ex.body?.commercial, await followupOf(p), (await moneyOf(p)).orders], [null, 0, 0]);
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
      await signExam(p, "prosthetic", {});
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
      await signExam(p, "prosthetic", {});
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
      await signExam(p, "prosthetic", {
        price: { kind: "discount", originalPrice: 900_000, finalPrice: 700_000 },
        expertUserId: EXPERT, decision: "bought",
      });
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
    //  ي‌ب. **الاختيارُ الصريحُ لا يُسقَط بصمت** — علّةُ «غير محدد»
    // ══════════════════════════════════════════════════════════════════
    //  كانت الشاشةُ تبدأ بـ`normal` فاستحال أن يُعرَف: أاختار الطبيبُ أم لم
    //  يلمس؟ ومَن اختار **بخصم** أو **مجّاني** ثمّ ترك الأصلَ فارغاً كان
    //  اختيارُه يُحذَف من الحمولة بينما يُحفَظ خبيرُه وقرارُه — فيُقرأ الملفُّ
    //  «غير مسعَّر» وقد قرّر الطبيبُ تبرّعاً.
    console.log("\n── ي‌ب. النقصُ يُردّ ولا يُسقَط ──");
    {
      //  ① بلا لمسٍ للسعر إطلاقاً ⟶ المعاينةُ تُوقَّع والملفُّ بلا تسعير.
      const p = await mkPatient("بلا تسعير");
      await mkCase(p);
      await startEpisode(p);
      const ex = await signExam(p, "prosthetic", { expertUserId: EXPERT });
      check(ex.status === 200 || ex.status === 201,
        "٦١. **(١) بلا سعرٍ إطلاقاً ⟶ المعاينةُ تُوقَّع**", String(ex.status));
      const fid = await followupOf(p);
      same("   والملفُّ **غير مسعَّر** لا «مجّانيّ»",
        [(await fRow(fid)).pk, (await fRow(fid)).op, (await fRow(fid)).p], [null, null, 0]);
      same("   والخبيرُ حُفظ وحده", Number((await fRow(fid)).ex), EXPERT);
      same("   وما ينقص «السعر»", (await http("GET", `/api/followups/patient/${p}`, S.recv))
        .body?.[0]?.missing, ["price"]);
    }
    {
      //  ② «مجّاني» بلا أصلٍ ⟶ **يُردّ**، ولا يُسقَط ولا يُحفَظ نصفُ الطلب.
      const p = await mkPatient("مجّانيٌّ بلا أصل");
      await mkCase(p);
      await startEpisode(p);
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "free", originalPrice: null },
        expertUserId: EXPERT, decision: "bought",
      });
      same("٦٢. **(٢) «مجّاني» بلا سعرٍ أصليّ ⟶ ٤٠٠**", ex.status, 400);
      check(String(ex.body?.error ?? "").includes("أصليّ"),
        "   برسالةٍ تقول ما ينقص", JSON.stringify(ex.body));
      //  **(٦) ولا نصفَ حمولةٍ يُقبل**: لا معاينةَ ولا متابعةَ ولا خبيرَ ولا قرار.
      same("٦٣. **(٦) ولا شيءَ حُفظ — لا معاينةَ ولا متابعةَ ولا خبير**",
        [(await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p]))[0].n,
          await followupOf(p)],
        [0, 0]);
      same("   ولا دينارَ ولا أمر",
        await moneyOf(p), { total: 0, orders: 0, cost_entries: 0, payments: 0, discounts: 0 });
    }
    {
      //  ③ «بخصم» بلا أصل ⟶ يُردّ.
      const p = await mkPatient("خصمٌ بلا أصل");
      await mkCase(p);
      await startEpisode(p);
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "discount", originalPrice: null, finalPrice: 500_000 },
        expertUserId: EXPERT,
      });
      same("٦٤. **(٣) «بخصم» بلا سعرٍ أصليّ ⟶ ٤٠٠**", ex.status, 400);
      same("   ولا معاينةَ حُفظت",
        (await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p]))[0].n, 0);
    }
    {
      //  ④ «بخصم» بأصلٍ بلا نهائيّ ⟶ يُردّ.
      const p = await mkPatient("خصمٌ بلا نهائيّ");
      await mkCase(p);
      await startEpisode(p);
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "discount", originalPrice: 900_000, finalPrice: null },
      });
      same("٦٥. **(٤) «بخصم» بلا سعرٍ نهائيّ ⟶ ٤٠٠**", ex.status, 400);
      same("   ولا معاينةَ حُفظت",
        (await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [p]))[0].n, 0);
      //  وبأصلٍ ونهائيٍّ صحيحين يمرّ.
      const ok = await signExam(p, "prosthetic", {
        price: { kind: "discount", originalPrice: 900_000, finalPrice: 700_000 },
      });
      check(ok.status === 200 || ok.status === 201, "   وبالاثنين يمرّ", String(ok.status));
      const fid = await followupOf(p);
      same("   بالقيم الصحيحة",
        [(await fRow(fid)).op, (await fRow(fid)).p, (await fRow(fid)).pk],
        [900_000, 700_000, "discount"]);
    }
    {
      //  ⑤ «مجّاني» بأصلٍ موجب ⟶ يُحفَظ صريحاً.
      const p = await mkPatient("مجّانيٌّ صحيح");
      await mkCase(p);
      await startEpisode(p);
      const ex = await signExam(p, "prosthetic", {
        price: { kind: "free", originalPrice: 1_400_000 },
      });
      check(ex.status === 200 || ex.status === 201,
        "٦٦. **(٥) «مجّاني» بأصلٍ موجب يمرّ**", String(ex.status));
      const fid = await followupOf(p);
      same("   ويُحفَظ صريحاً: نهائيٌّ صفرٌ وأصلٌ محفوظ",
        [(await fRow(fid)).pk, (await fRow(fid)).op, (await fRow(fid)).p],
        ["free", 1_400_000, 0]);
      same("   **و«مكتملُ السعر» لا «ينقصه السعر»**",
        (await http("GET", `/api/followups/patient/${p}`, S.recv)).body?.[0]?.missing,
        ["expert"]);
    }
    {
      //  ⑥ ونفسُ الحراسة على **نقطة التفاصيل** لا على التوقيع وحده.
      const p = await mkPatient("نقصٌ من البطاقة");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic", {});
      const fid = await followupOf(p);
      const bad = await commercial(fid,
        { price: { kind: "free", originalPrice: null }, expertUserId: EXPERT }, S.recv);
      same("٦٧. **(٦) والبطاقةُ كذلك: نقصٌ ⟶ ٤٠٠ ولا نصفَ يُقبل**", bad.status, 400);
      same("   **ولا الخبيرُ حُفظ** — الطلبُ يُردّ كلُّه",
        [(await fRow(fid)).ex, (await fRow(fid)).pk], [null, null]);
    }
    {
      //  ⑦⑧ صاحبُ المعاينة يعدّل حقولَه من البطاقة، وغيرُه يُردّ.
      const p = await mkPatient("تعديلُ صاحبها");
      await mkCase(p);
      await startEpisode(p);
      await signExam(p, "prosthetic", {
        price: { kind: "normal", originalPrice: 1_000_000 }, expertUserId: EXPERT,
      });
      const fid = await followupOf(p);
      same("٦٨. **(٧) صاحبُ المعاينة يعدّل سعرَه من بطاقة التفاصيل قبل البيع**",
        (await commercial(fid,
          { price: { kind: "discount", originalPrice: 1_000_000, finalPrice: 820_000 } },
          S.doc)).status, 200);
      same("   والقيمُ تغيّرت والمالكيةُ باقيةٌ له",
        [(await fRow(fid)).p, (await fRow(fid)).pk, (await fRow(fid)).po,
          Number((await fRow(fid)).pou)],
        [820_000, "discount", "doctor", DOC]);
      same("   ويبدّل خبيرَه كذلك",
        (await commercial(fid, { expertUserId: EXPERT2 }, S.doc)).status, 200);
      same("٦٩. **(٨) ومديرُ الفرع والاستقبالُ يُردّان عنهما**",
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

      //  ① نافذةُ الطبيب: نوعُ السعر · القرار · وسببُ عدم الشراء.
      //  والقيمُ تُبنى من قائمةٍ واحدة، فيُفحَص القالبُ والقائمةُ معاً — لا
      //  نصٌّ مسطَّح لا وجودَ له في المصدر.
      check(exam.includes("block-exam-commercial")
        && exam.includes('radio-price-kind-${v || "none"}')
        && /\["", "غير محدد"\]/.test(exam)
        && /\["normal", "السعر كما هو"\]/.test(exam)
        && /\["discount", "بخصم"\]/.test(exam)
        && /\["free", "مجاني"\]/.test(exam),
        "٥١. نافذةُ المعاينة فيها: غير محدد · عاديّ · بخصم · مجّانيّ");
      //  ══ **الحالةُ الابتدائية فراغٌ لا `normal`** ═══════════════════════
      //  وهذا هو الفرقُ الذي بُني عليه كلُّ شيء: `normal` ابتداءً تجعل
      //  «لم يلمس» و«اختار السعرَ كما هو» شيئاً واحداً.
      check(/useState<"" \| "normal" \| "discount" \| "free">\(""\)/.test(exam),
        "٥١أ. **والابتداءُ «غير محدد» لا «السعر كما هو»**");
      check(/price: priceTouched\s*\?/.test(exam)
        && !/const hasPrice = deviceCost !== ""/.test(exam),
        "٥١ب. **والاختيارُ الصريح يُرسَل ولو نقص** — لا يُحذَف من الحمولة");
      check(exam.includes("text-commercial-block")
        && /computeCommercialOffer\(/.test(exam),
        "٥١ج. ويُمنَع الإرسالُ قبل الشبكة **بالقاعدة المشتركة نفسها**");
      const cardKind = read("client", "src", "components", "PostExamDecisionCard.tsx");
      check(/useState<"" \| "normal" \| "discount" \| "free">\(""\)/.test(cardKind)
        && /if \(!locks\.price && cKind !== ""\)/.test(cardKind)
        && cardKind.includes("text-c-block"),
        "٥١د. **ونافذةُ البطاقة بالقاعدة نفسِها** — لا علّةٌ باقيةٌ في نصفٍ ثانٍ");
      check(exam.includes("radio-purchase-decision")
        && exam.includes('radio-decision-${v || "none"}')
        && /\["bought", "اشترى"\]/.test(exam)
        && /\["not_bought", "لم يشترِ"\]/.test(exam)
        && /\["", "يكمله الموظّف لاحقاً"\]/.test(exam),
        "٥٢. **والقرارُ اثنان ومعهما «يكمله الموظّف»** — ولا ثالثَ");
      check(!/radio-decision-(defer|interest|approve)/.test(exam),
        "   ولا تأجيلَ ولا «يرغب بالشراء» ولا اعتماد");
      check(exam.includes("input-not-bought-reason"),
        "٥٣. وسببُ عدم الشراء نصٌّ حرّ");
      //  **ولا سعرَ ثانٍ**: الأصلُ هو `deviceCost` نفسُه.
      //  الأصلُ يُقرأ من `deviceCost` وحده — والفراغُ يُرسَل `null` صريحةً
      //  ليردَّه الخادمُ، لا يُحذَف الكائنُ فيمضي نصفُ الطلب.
      check(/originalPrice: deviceCost === "" \? null : Number\(deviceCost\)/.test(exam)
        && !/id="exam-original-price"/.test(exam),
        "٥٤. **والسعرُ الأصليُّ هو حقلُ الكلفة نفسُه** — لا رقمَ يُكتب مرّتين");
      //  **ولا تُرسَل في التحرير**: تصحيحُ سعرِ ما بِيع بابُه الخاصّ (٢٣٩).
      check(/if \(isEdit \|\| !isDeviceSpecialty\) return undefined;/.test(exam),
        "٥٥. **ولا تُرسَل في التحرير ولا للعلاج الطبيعي**");

      //  ② بطاقةُ المريض: ثلاثةُ سطورٍ وثلاثةُ أزرار، والأقفالُ من الخادم.
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
