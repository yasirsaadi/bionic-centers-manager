// اختبارُ طابور «بانتظار الحسم / تم الحسم» — حيّاً على Postgres وعلى النقاط
// الحقيقية. قاعدة محلّية: `npm run test:decision-queue`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// هذا الملفُّ **قراءةٌ فقط فوق حقائق قائمة**: لا حقيقةَ ماليةً جديدة، ولا
// كتابةَ من `GET /api/followups/decision-queue`/`/count`. الكتابةُ الفعلية
// (`/complete-sale`, `/not-bought`) مُختبَرةٌ بتفصيلٍ في
// `server/reception_sale.test.ts` — هذا الملفُّ يثبت **الطابورَ نفسَه**:
// عضويّةَ التبويبين من الحالة الحيّة، النطاقَ، التصنيفَ، ملاحظةَ الطبيب،
// هويّةَ الحاسم ولقطةَ دوره، وإعادةَ الفتح والحسم من فاعلٍ آخر.
//
// ══ تصحيحٌ لاحق (مراجعةٌ حيّة) — أربعُ ثغراتٍ دقيقة ════════════════════════
// ك: إلغاءُ طلبِ سعرٍ موروثٍ حقيقيّ عند إتمامٍ مباشر (وتراجعُه عند فشل البيع).
// ل: `complete_sale` يلزم السعرَ والخبيرَ والقرارَ معاً — لا القرارَ وحده —
//    وبقاءُ الصفّ ظاهراً مع ملاحظة الطبيب حين يُحجَب بملكيةٍ موروثة.
// م: عقدُ المصدر — إبطالُ الطابور بعد أيّ خطأ، وأهليّةُ الشريط الجانبيّ من
//    الدالّة القانونية لا قائمة أدوارٍ ثانية.

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { examPathActions, examPathBlockedMessage, canCompleteReceptionSale } from "@shared/commercial";

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

const PORT = 6910;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-طابور-الحسم";
const ADMIN = 9941, MANAGER = 9942, DOC = 9943, RECV = 9944, ACCT = 9945;
const EXPERT = 9946, EXPERT_B2 = 9947;

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "مدير الفرع",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    //  فروعٌ مزدوجة عمداً (خلافاً لـ`reception_sale.test.ts`): قسمُ نطاق
    //  الفرع هنا يحتاج مريضاً على الفرع الآخر، والمعاينةُ تشترط وصول الطبيب
    //  إلى فرع المريض (`canReachBranch`) بصرف النظر عن مسار البيع.
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1, 2],
    displayName: "سعد",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  acct: {
    userId: ACCT, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
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

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}
const signExam = (
  patientId: number,
  opts: { session?: any; caseType?: string; notes?: string } = {},
) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, opts.session ?? S.doc, {
    caseType: opts.caseType ?? "prosthetic", diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
    notes: opts.notes,
  });

async function followupOf(patientId: number): Promise<number> {
  const [r] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1
                        ORDER BY id DESC LIMIT 1`, [patientId]);
  return Number(r?.id ?? 0);
}

/** مريضٌ + حالة + طلبُ جهازٍ على مسار المعاينة + معاينةٌ موقّعة = متابعةٌ جاهزة. */
async function readySale(label: string, opts: { notes?: string; branchId?: number } = {}) {
  const branchId = opts.branchId ?? 1;
  const pid = await mkPatient(label, branchId);
  await mkCase(pid, branchId);
  const ep = await http("POST", `/api/patients/${pid}/device-episodes`,
    branchId === 1 ? S.recv : S.admin,
    { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
  if (ep.status !== 201) throw new Error(`startEpisode failed: ${JSON.stringify(ep.body)}`);
  const ex = await signExam(pid, { notes: opts.notes });
  if (ex.status >= 300) throw new Error(`signExam failed: ${JSON.stringify(ex.body)}`);
  return { pid, fid: await followupOf(pid) };
}

/** صفٌّ **موروث** — حلقةٌ بلا `service_path` (`NULL`). لا يظهر في هذا الطابور أبداً. */
async function legacyFollowup(label: string): Promise<{ pid: number; fid: number }> {
  const pid = await mkPatient(label);
  const cid = await mkCase(pid);
  await q(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
             sequence_number, status, agreed_cost, requested_item, created_by)
           VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',$3)`, [pid, cid, MANAGER]);
  await signExam(pid);
  const fid = await followupOf(pid);
  return { pid, fid };
}

async function waiting(session: any, extra = "") {
  return http("GET", `/api/followups/decision-queue?state=waiting${extra}`, session);
}
async function resolved(session: any, extra = "") {
  return http("GET", `/api/followups/decision-queue?state=resolved${extra}`, session);
}
async function countOf(session: any) {
  return http("GET", "/api/followups/decision-queue/count", session);
}
function idsOf(body: any): number[] {
  return (body?.rows ?? []).map((r: any) => Number(r.followupId));
}
function rowOf(body: any, fid: number): any {
  return (body?.rows ?? []).find((r: any) => Number(r.followupId) === fid);
}

//  ══ إلغاءُ طلبِ سعرٍ موروثٍ (تصحيحٌ لاحق، القسم ك) ═══════════════════════
//  الطلبُ القديم `/api/followups/:id/price-request` صار باباً مغلقاً
//  (يردّ ٤٠٠ للجميع)، فلا مسارَ حيّاً يُنشئ صفَّ `price_change_requests`
//  اليوم. **لقطةُ قاعدةٍ ضابطة** — كما توجب الحالةُ الموروثة نفسُها —
//  وليست محاكاةً لباب حيّ.
async function mkPendingPriceRequest(fid: number, pid: number, branchId = 1,
  opts: { currentPrice?: number; proposedPrice?: number } = {}) {
  const currentPrice = opts.currentPrice ?? 500_000;
  const proposedPrice = opts.proposedPrice ?? 650_000;
  const r = await q<{ id: number }>(
    `INSERT INTO price_change_requests
       (followup_id, patient_id, branch_id, current_price, proposed_price, reason,
        requested_by, requested_by_name, status)
     VALUES ($1,$2,$3,$4,$5,'المريضُ طلب مراجعةَ السعر',$6,'ريام','pending')
     RETURNING id`,
    [fid, pid, branchId, currentPrice, proposedPrice, RECV]);
  return r[0].id;
}
async function priceRequestRow(id: number) {
  const [r] = await q(
    `SELECT status, decided_at, decided_by, decided_by_name, decision_note,
            current_price::int cp, proposed_price::int pp, reason
       FROM price_change_requests WHERE id=$1`, [id]);
  return r ?? null;
}
async function priceRequestCancelEvents(fid: number) {
  return q(
    `SELECT event_type, payload, from_status, to_status, note
       FROM post_exam_followup_events
      WHERE followup_id=$1 AND event_type='price_request_cancelled'
      ORDER BY id ASC`, [fid]);
}

//  ══ ملكيّةٌ موروثة (تصحيحٌ لاحق، القسم ل) ═════════════════════════════════
//  لا بابَ حيّاً يكتب `owner='doctor'` على صفٍّ من مسار المعاينة بعد اليوم
//  (`retiredOnExamPath`) — فهذه أيضاً لقطةُ قاعدةٍ ضابطة لصفٍّ **كان** قد
//  لُمس قبل هذا التبسيط، لا محاكاةً لباب حيّ.
async function ownPrice(fid: number, byId: number, byName: string) {
  await q(`UPDATE post_exam_followups
              SET price_owner='doctor', price_owner_user_id=$1, price_owner_name=$2
            WHERE id=$3`, [byId, byName, fid]);
}
async function ownExpert(fid: number, byId: number, byName: string) {
  await q(`UPDATE post_exam_followups
              SET expert_owner='doctor', expert_owner_user_id=$1, expert_owner_name=$2
            WHERE id=$3`, [byId, byName, fid]);
}
/** قرارٌ **وقيمتُه معاً** — الحالةُ الحقيقية الوحيدة القابلة للحدوث فعلاً:
 *  المالكيةُ لا تُكتب في النظام الحيّ بمعزلٍ عن قيمةٍ حقيقية (`setCommercialFields`
 *  تكتبهما بنفس السطر دائماً)، فقرارٌ مملوكٌ بلا قيمةٍ حالةٌ لا تقع أبداً. */
async function ownDecisionBought(fid: number, byId: number, byName: string) {
  await q(`UPDATE post_exam_followups
              SET purchase_decision='bought', purchase_decision_at=NOW(),
                  purchase_decision_owner='doctor', purchase_decision_user_id=$1,
                  purchase_decision_name=$2
            WHERE id=$3`, [byId, byName, fid]);
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
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${RECV},${ACCT},${EXPERT},${EXPERT_B2}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${DOC},${RECV},${ACCT},${EXPERT},${EXPERT_B2}])`);
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
  for (const [id, role, branchId, branchIds, name] of [
    [ADMIN, "admin", 1, "[1,2]", "المسؤول"],
    [MANAGER, "branch_manager", 1, "[1]", "مدير الفرع"],
    [DOC, "doctor", 1, "[1]", "سعد"],
    [RECV, "reception", 1, "[1]", "ريام"],
    [ACCT, "accountant", 1, "[1]", "المحاسب"],
    [EXPERT, "prosthetics_expert", 1, "[1]", "الخبير الأول"],
    [EXPERT_B2, "prosthetics_expert", 2, "[2]", "خبيرُ الفرع الآخر"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,
               ${role === "doctor" ? `'["prosthetic","medical_support"]'::jsonb` : "'null'::jsonb"})
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name, is_active=true`,
      [id, `dq_u${id}`, role, name, branchId, branchIds]);
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
    console.log("\n── أ. الصلاحيات ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("صلاحيات-١");
      for (const [who, sess] of [["الاستقبال", S.recv], ["المحاسب", S.acct],
        ["مديرُ الفرع", S.manager], ["المسؤول", S.admin]] as any[]) {
        const r = await waiting(sess);
        check(r.status === 200 && idsOf(r.body).includes(fid),
          `١. ${who}: يقرأ طابورَ «بانتظار الحسم»`, JSON.stringify(r.body));
        const c = await countOf(sess);
        check(c.status === 200 && typeof c.body?.count === "number",
          `   ${who}: يقرأ الشارة`, JSON.stringify(c.body));
      }
      const rDoc = await waiting(S.doc);
      same("٢. **والطبيبُ يُردّ ٤٠٣ عن الطابور** — لا سلطةَ تجاريةً له",
        rDoc.status, 403);
      const cDoc = await countOf(S.doc);
      same("   والشارةُ صفرٌ صامت للطبيب — لا خطأ", [cDoc.status, cDoc.body?.count], [200, 0]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. عضويّةُ «بانتظار الحسم» ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: examFid } = await readySale("مسارُ-معاينة");
      const { fid: legacyFid } = await legacyFollowup("موروثٌ-بلا-مسار");
      const r = await waiting(S.admin);
      check(idsOf(r.body).includes(examFid),
        "٣. **صفُّ مسارِ المعاينة يظهر في «بانتظار الحسم»**");
      check(!idsOf(r.body).includes(legacyFid),
        "٤. **والصفُّ الموروث (بلا `service_path`) لا يظهر أبداً** — رغم أنه حيٌّ فعلاً",
        JSON.stringify(idsOf(r.body)));
    }
    {
      //  حالةٌ وسيطة قديمة كانت تُحبَس قبل إصلاح `CONFIRMABLE`.
      const { fid } = await readySale("حالةٌ-وسيطة-قديمة");
      await q(`UPDATE post_exam_followups SET status='price_approval_pending' WHERE id=$1`, [fid]);
      const r = await waiting(S.admin);
      check(idsOf(r.body).includes(fid),
        "٥. **وحالة `price_approval_pending` الوسيطة تظهر أيضاً** (إصلاحُ `CONFIRMABLE`)");
      const cs = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });
      same("   **ويمكن حسمُها فعلاً عبر `/complete-sale`** — لا تبقى محبوسة",
        [cs.status, cs.body?.converted], [200, true]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. ملاحظةُ الطبيب — الهويّةُ الدقيقة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: withNote } = await readySale("بملاحظة", { notes: "المريض يفضّل الدفع نقداً" });
      const { fid: withoutNote } = await readySale("بلا-ملاحظة");
      const r = await waiting(S.admin);
      const rows = r.body?.rows ?? [];
      const a = rows.find((x: any) => x.followupId === withNote);
      const b = rows.find((x: any) => x.followupId === withoutNote);
      same("٦. **ملاحظةُ الطبيب تصل حرفياً لمتابعتها بعينها**",
        a?.examNotes, "المريض يفضّل الدفع نقداً");
      check(!b?.examNotes, "٧. **وتغيب (فارغة/`null`) حين لم يكتبها الطبيب**",
        JSON.stringify(b?.examNotes));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. نطاقُ الفرع ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: b1 } = await readySale("فرع-١", { branchId: 1 });
      const { fid: b2 } = await readySale("فرع-٢", { branchId: 2 });

      const rManager = await waiting(S.manager);
      check(idsOf(rManager.body).includes(b1) && !idsOf(rManager.body).includes(b2),
        "٨. **مديرُ فرعٍ يرى فرعه وحده**", JSON.stringify(idsOf(rManager.body)));

      const rOutOfScope = await waiting(S.manager, "&branchId=2");
      same("٩. **وفلترةٌ صريحة بفرعٍ خارج نطاقه ⟶ ٤٠٣ لا توسيعاً صامتاً**",
        rOutOfScope.status, 403);

      const rAdmin = await waiting(S.admin);
      check(idsOf(rAdmin.body).includes(b1) && idsOf(rAdmin.body).includes(b2),
        "١٠. **والمسؤولُ يرى الفرعين معاً**");

      const rAdminFiltered = await waiting(S.admin, "&branchId=1");
      check(idsOf(rAdminFiltered.body).includes(b1) && !idsOf(rAdminFiltered.body).includes(b2),
        "١١. **ومسؤولٌ يفلتر بفرعٍ واحد يرى ذلك الفرع وحده في الصفحة**");

      const cAdmin = await countOf(S.admin);
      const cManager = await countOf(S.manager);
      check((cAdmin.body?.count ?? 0) >= (cManager.body?.count ?? 0) + 1,
        "١٢. **وشارةُ المسؤول تبقى كلَّ الفروع** — لا تتأثّر بفلترة الصفحة المحلّية",
        JSON.stringify([cAdmin.body, cManager.body]));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. عضويّةُ «تم الحسم» والفرزُ ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: boughtFid } = await readySale("تم-الشراء");
      const csR = await http("POST", `/api/followups/${boughtFid}/complete-sale`, S.recv,
        { originalPrice: 900_000, discountAmount: 100_000, expertUserId: EXPERT });
      same("١٣. الإعدادُ: تمّ البيع", csR.status, 200);

      const { fid: notBoughtFid } = await readySale("لم-يشترِ");
      const nbR = await http("POST", `/api/followups/${notBoughtFid}/not-bought`, S.acct,
        { reason: "غالٍ جداً بالنسبة له" });
      same("١٤. الإعدادُ: سُجِّل عدم الشراء", nbR.status, 200);

      const rW = await waiting(S.admin);
      check(!idsOf(rW.body).includes(boughtFid) && !idsOf(rW.body).includes(notBoughtFid),
        "١٥. **الصفّان يختفيان من «بانتظار الحسم» تلقائياً** — لا زرَّ «تحديد كمحسوم»");

      const rR = await resolved(S.admin);
      const rows = rR.body?.rows ?? [];
      const bought = rows.find((x: any) => x.followupId === boughtFid);
      const notBought = rows.find((x: any) => x.followupId === notBoughtFid);
      same("١٦. **والمُشترى يظهر في «تم الحسم» بنتيجة bought**", bought?.result, "bought");
      same("١٧. **وغيرُ المُشترى بنتيجة not_bought**", notBought?.result, "not_bought");
      same("١٨. وتفاصيلُ البيع صحيحة (أصلي/خصم/نهائي/خبير)",
        [bought?.originalPrice, bought?.approvedPrice, bought?.priceKind, bought?.selectedExpertUserId],
        [900_000, 800_000, "discount", EXPERT]);
      same("١٩. وسببُ عدم الشراء كما قاله المريض حرفياً",
        notBought?.notBoughtReasonText, "غالٍ جداً بالنسبة له");

      const idxBought = rows.findIndex((x: any) => x.followupId === boughtFid);
      const idxNotBought = rows.findIndex((x: any) => x.followupId === notBoughtFid);
      check(idxNotBought < idxBought,
        "٢٠. **الأحدثُ حسماً أوّلاً** («لم يشترِ» حُسمت بعد «تم الشراء»)",
        `notBought@${idxNotBought} bought@${idxBought}`);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. هويّةُ الحاسم ولقطةُ الدور ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: recvFid } = await readySale("حاسمٌ-استقبال");
      await http("POST", `/api/followups/${recvFid}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });

      const { fid: acctFid } = await readySale("حاسمٌ-محاسب");
      await http("POST", `/api/followups/${acctFid}/not-bought`, S.acct, { reason: "سبب" });

      const { fid: adminFid } = await readySale("حاسمٌ-مسؤول");
      await http("POST", `/api/followups/${adminFid}/complete-sale`, S.admin,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });

      const rows = (await resolved(S.admin)).body?.rows ?? [];
      const recvRow = rows.find((x: any) => x.followupId === recvFid);
      const acctRow = rows.find((x: any) => x.followupId === acctFid);
      const adminRow = rows.find((x: any) => x.followupId === adminFid);

      same("٢١. **الاستقبالُ يظهر اسماً ودوراً صحيحين**",
        [recvRow?.resolvedByName, recvRow?.resolvedByRole], ["ريام", "reception"]);
      same("٢٢. **والمحاسبُ كذلك**",
        [acctRow?.resolvedByName, acctRow?.resolvedByRole], ["المحاسب", "accountant"]);
      same("٢٣. **والمسؤولُ العام يُختَم `global_admin` — لا دورَه الخام `admin`**",
        adminRow?.resolvedByRole, "global_admin");
      check(!!recvRow?.resolvedAt, "٢٤. ووقتُ الحسم مسجَّل");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. إعادةُ الفتح وإعادةُ الحسم من فاعلٍ آخر ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("إعادةُ-حسم");
      await http("POST", `/api/followups/${fid}/not-bought`, S.recv, { reason: "تراجع مؤقّتاً" });
      const before = (await resolved(S.admin)).body?.rows ?? [];
      const beforeRow = before.find((x: any) => x.followupId === fid);
      same("٢٥. الإعدادُ: حسمتها ريام أوّلاً", beforeRow?.resolvedByName, "ريام");

      const reopenR = await http("POST", `/api/followups/${fid}/reopen`, S.manager, {});
      same("٢٦. الإعدادُ: أُعيد فتحها", reopenR.status, 200);

      const midW = await waiting(S.admin);
      check(idsOf(midW.body).includes(fid),
        "٢٧. **وتعود «بانتظار الحسم» فعلاً** — لا تبقى في «تم الحسم»");

      await http("POST", `/api/followups/${fid}/complete-sale`, S.acct,
        { originalPrice: 700_000, discountAmount: 0, expertUserId: EXPERT });
      const after = (await resolved(S.admin)).body?.rows ?? [];
      const afterRow = after.find((x: any) => x.followupId === fid);
      same("٢٨. **والحاسمُ الآن هو المحاسب — الأحدث لا الأقدم**",
        [afterRow?.resolvedByName, afterRow?.result], ["المحاسب", "bought"]);

      const events = await q(
        `SELECT event_type, actor_name FROM post_exam_followup_events
          WHERE followup_id=$1 ORDER BY id ASC`, [fid]);
      const types = events.map((e: any) => e.event_type);
      check(types.includes("closed_without_purchase") && types.includes("reopened")
        && types.includes("converted"),
        "٢٩. **والتاريخُ كاملٌ محفوظ** — الحدثُ الأوّل («لم يشترِ» بريام) لم يُمحَ",
        JSON.stringify(events));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. حالاتٌ لا تُعَدّ حسماً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  تُطبَّق حالةٌ طرفية إدارية مباشرةً على الصفّ — فحصٌ للفرز في القراءة
      //  وحده، بلا استحضار مسار الإلغاء/الإبطال الكامل (مُختبَرٌ بتفصيله في
      //  `exam_cancellation.test.ts`/`administrative_reversal.test.ts`).
      const { fid: cancelledFid } = await readySale("معاينةٌ-ملغاة");
      await q(`UPDATE post_exam_followups SET status='closed_exam_cancelled' WHERE id=$1`,
        [cancelledFid]);
      const { fid: voidFid } = await readySale("عمليةٌ-مُبطَلة");
      await q(`UPDATE post_exam_followups SET status='closed_admin_void' WHERE id=$1`, [voidFid]);

      const w = await waiting(S.admin);
      const r = await resolved(S.admin);
      check(!idsOf(w.body).includes(cancelledFid) && !idsOf(r.body).includes(cancelledFid),
        "٣٠. **المعاينةُ الملغاة لا تظهر في أيّ تبويب**");
      check(!idsOf(w.body).includes(voidFid) && !idsOf(r.body).includes(voidFid),
        "٣١. **والعمليةُ المُبطَلة إدارياً كذلك** — واقعةٌ تاريخية لا قرارَ شراء");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. التزامن ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("ضغطتان-متزامنتان");
      const [r1, r2] = await Promise.all([
        http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
          { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT }),
        http("POST", `/api/followups/${fid}/complete-sale`, S.acct,
          { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT }),
      ]);
      const statuses = [r1.status, r2.status].sort();
      same("٣٢. **إحداهما ٢٠٠ والأخرى ٤٠٩ — لا نجاحان معاً**", statuses, [200, 409]);
      const rows = (await resolved(S.admin)).body?.rows ?? [];
      check(rows.filter((x: any) => x.followupId === fid).length === 1,
        "٣٣. **وصفٌّ واحدٌ فقط في «تم الحسم»**");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. التصنيفُ ودقّةُ العدّ ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: prosFid } = await readySale("تصنيف-طرف", {});
      const pid2 = await mkPatient("تصنيف-مسند", 1);
      await mkCase(pid2, 1, "medical_support");
      const ep2 = await http("POST", `/api/patients/${pid2}/device-episodes`, S.recv,
        { serviceType: "medical_support", requestedItem: "full_device", servicePath: "exam" });
      same("الإعدادُ: فُتح طلبُ مسند", ep2.status, 201);
      const ex2 = await signExam(pid2, { caseType: "medical_support" });
      same("الإعدادُ: وُقِّعت معاينةُ المسند", ex2.status, 200);
      const supFid = await followupOf(pid2);

      const rPros = await waiting(S.admin, "&serviceType=prosthetic");
      const rSup = await waiting(S.admin, "&serviceType=medical_support");
      check(idsOf(rPros.body).includes(prosFid) && !idsOf(rPros.body).includes(supFid),
        "٣٤. **فلترةُ «طرف صناعي» تُبقي الأطرافَ وتستبعد المساند**");
      check(idsOf(rSup.body).includes(supFid) && !idsOf(rSup.body).includes(prosFid),
        "٣٥. **وفلترةُ «مسند طبي» عكسُها بالضبط**");

      const rAll = await waiting(S.admin);
      same("٣٦. **والعددُ الإجماليّ يطابق طولَ الصفوف الفعليّ** — بلا `LIMIT` صامت",
        rAll.body?.total, (rAll.body?.rows ?? []).length);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── (دالّتان خالصتان) `examPathActions`/`examPathBlockedMessage` ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const sessRecv = { userId: 1, role: "reception", isAdmin: false };
      const noneOwned = { owner: null, ownerUserId: null, ownerName: null };
      const docOwned = { owner: "doctor" as const, ownerUserId: 999, ownerName: "طبيب" };

      same("أ. كلُّ الحقول حرّة ⟶ الفعلان معاً",
        examPathActions({
          session: sessRecv, status: "follow_up", mayAct: true,
          decisionField: noneOwned, priceField: noneOwned, expertField: noneOwned,
        }),
        ["complete_sale", "not_bought"]);
      same("ب. السعرُ محجوبٌ وحده ⟶ «لم يشترِ» فقط",
        examPathActions({
          session: sessRecv, status: "follow_up", mayAct: true,
          decisionField: noneOwned, priceField: docOwned, expertField: noneOwned,
        }),
        ["not_bought"]);
      same("ج. الخبيرُ محجوبٌ وحده ⟶ نفسُ الأثر",
        examPathActions({
          session: sessRecv, status: "follow_up", mayAct: true,
          decisionField: noneOwned, priceField: noneOwned, expertField: docOwned,
        }),
        ["not_bought"]);
      same("د. القرارُ محجوبٌ ⟶ لا فعلَ إطلاقاً",
        examPathActions({
          session: sessRecv, status: "follow_up", mayAct: true,
          decisionField: docOwned, priceField: noneOwned, expertField: noneOwned,
        }),
        []);
      same("هـ. حالةٌ منتهية ⟶ لا فعلَ بصرف النظر عن الملكية",
        examPathActions({
          session: sessRecv, status: "converted", mayAct: true,
          decisionField: noneOwned, priceField: noneOwned, expertField: noneOwned,
        }),
        []);
      same("و. **غيابُ `priceField`/`expertField` من منادٍ لم يُحدَّث ⟶ لا ينكسر** (تُقرأ غيرَ مملوكة)",
        examPathActions({ session: sessRecv, status: "follow_up", mayAct: true, decisionField: noneOwned }),
        ["complete_sale", "not_bought"]);

      same("ز. الرسالةُ فارغةٌ حين الفعلان معاً", examPathBlockedMessage(["complete_sale", "not_bought"]), null);
      const msgNB = examPathBlockedMessage(["not_bought"]);
      check(typeof msgNB === "string" && !/doctor|staff|owner/i.test(msgNB ?? ""),
        "ح. **ورسالةٌ عربيةٌ بلا كودٍ داخليّ** حين «لم يشترِ» وحدها متاحة", String(msgNB));
      const msgNone = examPathBlockedMessage([]);
      check(typeof msgNone === "string" && !/doctor|staff|owner/i.test(msgNone ?? ""),
        "ط. وكذلك حين لا فعلَ إطلاقاً", String(msgNone));
      check(msgNB !== msgNone, "ي. والرسالتان مختلفتان — تصفان حالتين مختلفتين لا نصّاً واحداً معاداً");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. إلغاءُ طلبِ سعرٍ موروثٍ عند إتمامٍ مباشر (تصحيحٌ لاحق) ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await readySale("طلبُ-سعرٍ-معلَّق");
      await q(`UPDATE post_exam_followups SET status='price_approval_pending' WHERE id=$1`, [fid]);
      const reqId = await mkPendingPriceRequest(fid, pid, 1,
        { currentPrice: 500_000, proposedPrice: 700_000 });

      const before = await priceRequestRow(reqId);
      same("٣٧. الإعدادُ: طلبُ السعر `pending` فعلاً، والمتابعةُ في الحالة الوسيطة",
        [before?.status], ["pending"]);

      const cs = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 900_000, discountAmount: 0, expertUserId: EXPERT });
      same("٣٨. **والبيعُ المباشر ينجح على الحالة الوسيطة** — إصلاحُ `CONFIRMABLE`",
        [cs.status, cs.body?.converted, typeof cs.body?.workOrderId], [200, true, "number"]);

      const after = await priceRequestRow(reqId);
      same("٣٩. **وطلبُ السعر صار `cancelled` — لا `rejected`**", after?.status, "cancelled");
      check(!!after?.decided_at && after?.decided_by === RECV && after?.decided_by_name === "ريام",
        "٤٠. **ومَن ألغاه ومتى مسجَّلان بالفاعل الحقيقيّ**", JSON.stringify(after));
      same("٤١. **وسببُ الإلغاء يذكر الإتمامَ المباشر تحديداً**",
        after?.decision_note, "أُلغي تلقائياً بإتمام البيع عبر المسار المبسّط");
      same("٤٢. **والقيمتان التاريخيتان والسببُ محفوظةٌ بلا تغيير** — تاريخٌ لا يُمحى",
        [after?.cp, after?.pp, after?.reason], [500_000, 700_000, "المريضُ طلب مراجعةَ السعر"]);

      const events = await priceRequestCancelEvents(fid);
      same("٤٣. **وحدثٌ واحدٌ بالضبط `price_request_cancelled`**", events.length, 1);
      const payload: any = (events[0] as any)?.payload;
      same("٤٤. وحمولتُه تحمل هويّةَ الطلب وسعرَيه", [payload?.requestId, payload?.currentPrice,
        payload?.proposedPrice], [reqId, 500_000, 700_000]);

      const approvals = await http("GET", "/api/followups/approvals", S.admin);
      const stillThere = (approvals.body?.priceApprovals ?? [])
        .some((a: any) => a.requestId === reqId);
      check(!stillThere,
        "٤٥. **ولم يعد يظهر في طابور الاعتماد الموروث** — لا تاريخَ مستحيلاً");
    }
    {
      //  ══ **التراجعُ — لا نصفَ أثر** ═══════════════════════════════════
      //  خبيرٌ من فرعٍ آخر يُفشل `/complete-sale` **داخل** `setCommercialFields`
      //  قبل أن تُنادى `cancelPendingPriceRequestsTx` أصلاً — فيثبت أن
      //  الإلغاءَ لا يقع أبداً ما لم يثبت البيعُ فعلاً في المعاملة نفسِها.
      const { pid, fid } = await readySale("طلبُ-سعرٍ-يتراجع");
      await q(`UPDATE post_exam_followups SET status='price_approval_pending' WHERE id=$1`, [fid]);
      const reqId = await mkPendingPriceRequest(fid, pid, 1);

      const failedSale = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv,
        { originalPrice: 900_000, discountAmount: 0, expertUserId: EXPERT_B2 });
      check(failedSale.status >= 400,
        "٤٦. الإعدادُ: إتمامٌ بخبيرٍ من فرعٍ آخر يفشل كما هو متوقَّع",
        JSON.stringify(failedSale.body));

      const stillPending = await priceRequestRow(reqId);
      same("٤٧. **وطلبُ السعر يبقى `pending`** — لا إلغاءَ قبل ثبوت البيع", stillPending?.status, "pending");
      const noEvents = await priceRequestCancelEvents(fid);
      same("٤٨. ولا حدثَ إلغاءٍ كُتب إطلاقاً", noEvents.length, 0);
      const followupNow = await q(`SELECT status FROM post_exam_followups WHERE id=$1`, [fid]);
      same("٤٩. **والمتابعةُ نفسُها بقيت على حالتها الوسيطة — لم تتحوّل**",
        (followupNow[0] as any)?.status, "price_approval_pending");
    }
    {
      //  ══ **رجعة: «لم يشترِ» تبقى تُلغي طلبَها الحقيقيَّ كما كانت** ════
      const { pid, fid } = await readySale("لم-يشترِ-وطلبُ-سعرٍ-معلَّق");
      const reqId = await mkPendingPriceRequest(fid, pid, 1);
      const nb = await http("POST", `/api/followups/${fid}/not-bought`, S.recv, { reason: "غيّر رأيه" });
      same("٥٠. الإعدادُ: «لم يشترِ» نجح كالمعتاد", nb.status, 200);
      const after = await priceRequestRow(reqId);
      same("٥١. **و«لم يشترِ» يبقى يُلغي طلبَ سعره الحقيقيَّ بنصّه الأصليّ** — لم ينحرف بالدالّة المشتركة",
        [after?.status, after?.decision_note],
        ["cancelled", "أُلغي تلقائياً بإغلاق ملفّ المتابعة بلا شراء"]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. أفعالٌ تطابق ما يقبله الخادمُ فعلاً (تصحيحٌ لاحق) ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const { fid: fidA } = await readySale("محجوبٌ-سعر");
      await ownPrice(fidA, DOC, "سعد");
      const wRecvA = await waiting(S.recv);
      same("٥٢. **أ. سعرٌ مملوكٌ للطبيب ⟶ الاستقبالُ يرى الصفَّ بلا `complete_sale`**",
        rowOf(wRecvA.body, fidA)?.actions, ["not_bought"]);
      const wAdminA = await waiting(S.admin);
      same("   **والمسؤولُ العام يملك الفعلين معاً — يتجاوز الملكيةَ التاريخية**",
        [...(rowOf(wAdminA.body, fidA)?.actions ?? [])].sort(),
        ["complete_sale", "not_bought"].sort());
      const csA = await http("POST", `/api/followups/${fidA}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });
      same("   **والبابُ الحقيقيّ يردّ الاستقبالَ فعلاً — لا زرٌّ كاذب**", csA.status, 403);
      const nbA = await http("POST", `/api/followups/${fidA}/not-bought`, S.recv, { reason: "جرّب مركزاً آخر" });
      same("   **و«لم يشترِ» يعمل رغم قفل السعر — يطابق `actions` تماماً**", nbA.status, 200);
    }
    {
      const { fid: fidB } = await readySale("محجوبٌ-خبير");
      await ownExpert(fidB, DOC, "سعد");
      const wRecvB = await waiting(S.recv);
      same("٥٣. **ب. خبيرٌ مملوكٌ للطبيب ⟶ نفسُ نمط أ**",
        rowOf(wRecvB.body, fidB)?.actions, ["not_bought"]);
      const csB = await http("POST", `/api/followups/${fidB}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });
      same("   والبابُ يردّه أيضاً — يطابق غيابَ `complete_sale`", csB.status, 403);
    }
    {
      //  الحالةُ الواقعية الوحيدة: قرارٌ **بقيمته** (`bought`) موقَّعٌ من
      //  الطبيب — لا ملكيةً بلا قيمة (تلك لا تقع في النظام الحيّ).
      const { fid: fidC } = await readySale("محجوبٌ-قرار", { notes: "المريض تردّد أمام الطبيب" });
      await ownDecisionBought(fidC, DOC, "سعد");
      const wRecvC = await waiting(S.recv);
      const rowC = rowOf(wRecvC.body, fidC);
      check(!!rowC, "٥٤. **ج. قرارٌ (بقيمته) مملوكٌ للطبيب ⟶ الصفُّ يبقى ظاهراً في «بانتظار الحسم»**"
        + " — لا يُخفَى بسبب الحجب");
      same("   **ولا فعلَ نهائيّاً للاستقبال**", rowC?.actions, []);
      same("   **وملاحظةُ الطبيب تصل رغم الحجب الكامل** — سياقٌ يبقى مقروءاً",
        rowC?.examNotes, "المريض تردّد أمام الطبيب");
      const wAdminC = await waiting(S.admin);
      same("   **والمسؤولُ العام يملك الفعلين معاً**",
        [...(rowOf(wAdminC.body, fidC)?.actions ?? [])].sort(),
        ["complete_sale", "not_bought"].sort());
      const csC = await http("POST", `/api/followups/${fidC}/complete-sale`, S.recv,
        { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });
      same("   **والبابان معاً يردّان الاستقبالَ**", csC.status, 403);
      const nbC = await http("POST", `/api/followups/${fidC}/not-bought`, S.recv, { reason: "أ" });
      same("   ", nbC.status, 403);
    }
    {
      const { fid: fidD } = await readySale("عاديٌّ-متكافئ");
      for (const [who, sess] of [["الاستقبال", S.recv], ["المحاسب", S.acct],
        ["مديرُ الفرع", S.manager], ["المسؤول", S.admin]] as any[]) {
        const r = await waiting(sess);
        const row = rowOf(r.body, fidD);
        same(`٥٥. **د. ${who} يملك الفعلين معاً على صفٍّ عاديّ بلا ملكيةٍ تاريخية**`,
          [...(row?.actions ?? [])].sort(), ["complete_sale", "not_bought"].sort());
      }
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── م. عقدُ المصدر — إبطالٌ عند الخطأ، وأهليّةٌ قانونية (تصحيحٌ لاحق) ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const comp = readFileSync(
        join(import.meta.dirname, "..", "client", "src", "components", "ExamPathDecisionActions.tsx"),
        "utf8");
      check(/onError:\s*\(err: any\) => \{[\s\S]{0,300}invalidateAll\(\)/.test(comp),
        "٥٦. **وخطأُ الحفظ (٤٠٩ ضمنها) يُبطل الحالةَ المرجعية لا التوستَ وحده**");
      check(comp.includes("examPathBlockedMessage") && comp.includes("text-exam-path-blocked"),
        "٥٧. **ورسالةُ الحجب من الدالّة المشتركة نفسِها — لا نصٍّ محليّ ثانٍ**");
      check(!/if \(actions\.length === 0\) return null/.test(comp),
        "٥٨. **ولم يعد المكوّنُ يُخفي نفسَه (وملاحظةَ الطبيب معه) عند غياب الأفعال**");

      const sidebar = readFileSync(
        join(import.meta.dirname, "..", "client", "src", "components", "Sidebar.tsx"), "utf8");
      check(/import\s*\{\s*canCompleteReceptionSale\s*\}\s*from\s*"@shared\/commercial"/.test(sidebar),
        "٥٩. **والشريطُ الجانبيّ يستورد الدالّةَ القانونية نفسَها**");
      check(/decisionQueueEligible\s*=\s*canCompleteReceptionSale\(/.test(sidebar),
        "٦٠. **وأهليّةُ «بانتظار الحسم» تُحسَب بمناداتها مباشرةً — لا شرطٍ يدويّ**");
      const itemLine = (sidebar.match(/\{ label: DECISION_QUEUE_SIDEBAR_LABEL,[^}]*\}/) ?? [""])[0];
      check(itemLine.length > 0 && !itemLine.includes("roles:") && itemLine.includes("eligible:"),
        "٦١. **وعنصرُ القائمة نفسُه لا يحمل قائمةَ أدوارٍ ثانية — `eligible` وحده**", itemLine);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ن. الكتلةُ التجاريةُ ليست للطبيب العاديّ في بطاقة المريض (تصحيحٌ لاحقٌ ثانٍ) ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  `examActions` فارغةٌ للطبيب أصلاً (يردّها الخادمُ)، فكان الشرطُ
      //  القديم `examPath && !isTerminal(status)` يفتح الكتلةَ له على صفٍّ
      //  حيّ ليقرأ رسالةَ حجبٍ لا تخصّه — هو بلا سلطةٍ تجارية أصلاً، لا
      //  محجوباً عنها ولا مطلَقاً فيها.
      const card = readFileSync(
        join(import.meta.dirname, "..", "client", "src", "components", "PostExamDecisionCard.tsx"),
        "utf8");
      check(/import\s*\{\s*canCompleteReceptionSale\s*\}\s*from\s*"@shared\/commercial"/.test(card),
        "٦٢. **`PostExamDecisionCard.tsx` يستورد الدالّةَ القانونية نفسَها**");
      check(/mayUseExamPathCommercialDecision\s*=\s*canCompleteReceptionSale\(/.test(card),
        "٦٣. **والمتغيّرُ الذي يحرس الكتلةَ يُحسَب بمناداتها مباشرةً — لا شرطٍ يدويّ**");
      const gateLine = (card.match(
        /\{examPath && !isTerminal\(active\.status\)[^\n]*&&[^\n]*\(\s*$/m) ?? [""])[0];
      check(gateLine.includes("mayUseExamPathCommercialDecision"),
        "٦٤. **وشرطُ عرض `ExamPathDecisionActions` نفسُه يتضمّن هذا المتغيّر**", gateLine);
      check(!/mayUseExamPathCommercialDecision[\s\S]{0,80}["']doctor["']/.test(card)
        && !gateLine.includes("doctor"),
        "٦٥. **ولا قائمةَ أدوارٍ يدويةً ثانية بجوار الشرط** — لا ذكرَ حرفيّاً لـ`\"doctor\"` فيه");

      //  **والفعليُّ**: نفسُ الدالّة القانونية بنفس بطاقات الجلسة المستعملة
      //  في هذا الملفّ — هي ما يقرّر ظهورَ الكتلة فعلياً بعد الإثباتين
      //  أعلاه (الاستيراد والربط)، فلا حاجةَ لمُصيِّر React لإثبات الأثر.
      check(canCompleteReceptionSale(S.doc) === false,
        "٦٦. **الطبيبُ العاديّ: `mayUseExamPathCommercialDecision = false` ⟶ لا كتلةَ تجاريةً إطلاقاً**");
      for (const [who, sess] of [["الاستقبال", S.recv], ["المحاسب", S.acct],
        ["مديرُ الفرع", S.manager], ["المسؤول العام", S.admin]] as any[]) {
        check(canCompleteReceptionSale(sess) === true,
          `٦٧. **${who}: \`mayUseExamPathCommercialDecision = true\` ⟶ الكتلةُ تُعرَض** (صفٌّ عاديّ أو محجوبٌ تاريخياً معاً)`);
      }
      //  والحجبُ التاريخيُّ (القسم ل) يبقى كما هو بحرفه لهؤلاء الأربعة —
      //  هذا الشرطُ الجديد لا يمسّ منطقَ `examPathActions`/`examPathBlockedMessage`
      //  إطلاقاً، فقط يقرّر **مَن يدخل الكتلةَ من الأصل**.
    }

    console.log(
      "\nملاحظة: تفاصيلُ آليّة `/complete-sale`/`/not-bought` (المالكية، اشتقاقُ"
      + " السعر، عزلُ العلاج الطبيعي…) مُختبَرةٌ في server/reception_sale.test.ts"
      + " — هذا الملفُّ يثبت طابورَ القراءة الجديد فوقها.");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص طابور الحسم نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
