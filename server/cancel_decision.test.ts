// اختبارُ «إلغاء الحسم» — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدةٌ محلّية: `npm run test:cancel-decision`.
//
// ══ الثابتُ الذي يحرسه (قرارُ المالك ٢٠٢٦-٠٩-١٥) ═════════════════════════
// صفٌّ دخل «بانتظار الحسم» بالخطأ يخرج منه **بلا أن يُقال عن المريض شيء**:
//   · لا بيعٌ يُنشأ · ولا «لم يشترِ» تُسجَّل · ولا بيعٌ سابقٌ يُعكَس.
//   · ولا دفعةٌ ولا كلفةٌ ولا قيدُ دفتر · ولا حلقةٌ ولا أمرُ تصنيع.
//   · ولا معاينةٌ ولا شاهدةُ إلغاء · ولا صفُّ متابعةٍ يُحذَف.
//   · ويُسجَّل مَن ولماذا ومتى في التدقيق وفي سجلّ المتابعة.
//   · ولا يُمَسّ صفٌّ آخر للمريض نفسِه.
//   · والتكرارُ والتزامنُ يُنتجان نتيجةً واحدة.
//
// **والبصمةُ هي الحَكَم**: كلُّ قسمٍ يلتقط `fingerprint(pid)` قبل الفعل
// ويقارنه بعده حرفاً بحرف — الدفعاتُ ومجموعُها، `patients.total_cost`،
// قيودُ الدفتر، الحالاتُ وكلفُها، الحلقاتُ بحالاتها وأسعارها، أوامرُ
// التصنيع بمراحلها وخبرائها، المعايناتُ بأختامها، شواهدُ الإلغاء،
// والزيارات. فادّعاءُ «لم يتغيّر شيء» مُثبَتٌ لا مكتوب.

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { canCancelDecision, TERMINAL_STATUSES, FOLLOWUP_STATUS_LABELS } from "@shared/followup";
// **نداءٌ مباشرٌ للمخزن** — النقطةُ تردّ ٤٠٠ على السبب الفارغ قبل أن تصل
// المخزنَ أصلاً، فحارسُ المخزن نفسُه لا يُختبَر من فوقها أبداً. وحارسٌ
// لا يُختبَر حارسٌ يسقط يوماً بلا أن يفشل شيء.
import * as followupStore from "./followup/store";
import {
  followupEventView, purchasePresentation, PURCHASE_STATE_TEXT,
} from "@shared/followup_events";

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

const PORT = 6917;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إلغاء-الحسم";
const ADMIN = 9961, MANAGER = 9962, DOC = 9963, RECV = 9964, ACCT = 9965;
const EXPERT = 9966, EXPERT_B2 = 9967;

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
    idempotencyKey: crypto.randomUUID(),
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

/**
 * **متابعةٌ يتيمة** — معاينةٌ موقّعة بلا حلقةٍ منتظرة (`device_episode_id
 * IS NULL`) — شكلُ الإنتاج للمريض ٢٥٣٤ بالضبط (تصحيحٌ حيّ). خلافاً لـ
 * `readySale` لا تُفتَح حلقةٌ قبل التوقيع، فـ`claimAwaitingEpisodeForExam`
 * لا تجد شيئاً تحجزه و`ensureFollowupForSignedExam` تُنشئ الصفَّ بـ
 * `device_episode_id = NULL` — **بابٌ حيٌّ حقيقيّ** (لا لقطةَ قاعدةٍ كـ
 * `legacyFollowup`/`noExamLinkedFollowup` أدناه).
 */
async function orphanFollowup(
  label: string,
  opts: { caseType?: "prosthetic" | "medical_support"; branchId?: number } = {},
): Promise<{ pid: number; fid: number }> {
  const branchId = opts.branchId ?? 1;
  const caseType = opts.caseType ?? "prosthetic";
  const pid = await mkPatient(label, branchId);
  await mkCase(pid, branchId, caseType);
  const ex = await signExam(pid, { caseType });
  if (ex.status >= 300) throw new Error(`signExam failed: ${JSON.stringify(ex.body)}`);
  return { pid, fid: await followupOf(pid) };
}

/**
 * حلقةٌ على مسار «بلا معاينة» (`service_path='no_exam'`) يشير إليها توقيعٌ
 * لاحق — تُثبت أن الحدَّ الموسَّع (يتيمةٌ **أو** `service_path='exam'`) لا
 * يسحب معه حلقةً من مسارٍ آخر. **لقطةُ قاعدةٍ ضابطة** (نفسُ نمط
 * `legacyFollowup` تماماً) — لا محاكاةً لبابٍ حيّ يفتح حلقةً كهذه ثم يوقّع
 * عليها معاينة.
 *
 * **ولا بابَ حيّاً لها بعد المرحلة الأولى من قطار الإصلاح (ترحيل ٠٧٧)**:
 * حلقةُ «بلا معاينة» لم تعد مرشَّحاً للتوقيع أصلاً — بلا معرّفٍ لا تُحسَم،
 * وبمعرّفها الصريح تُردّ ٤٠٩. فالتوقيعُ هنا يولّد متابعةً **يتيمة**، ويُربَط
 * الصفُّ بالحلقة بلقطةِ SQL صريحة — كما كانت هذه الدالّةُ تعلن عن نفسها.
 */
async function noExamLinkedFollowup(label: string): Promise<{ pid: number; fid: number }> {
  const pid = await mkPatient(label);
  const cid = await mkCase(pid);
  const ep = await q<{ id: number }>(`INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
             sequence_number, status, agreed_cost, requested_item, service_path, created_by)
           VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device','no_exam',$3) RETURNING id`, [pid, cid, MANAGER]);
  await signExam(pid);
  const fid = await followupOf(pid);
  await q(`UPDATE post_exam_followups SET device_episode_id = $2 WHERE id = $1`, [fid, ep[0].id]);
  await q(`UPDATE patient_device_episodes SET status = 'examined' WHERE id = $1`, [ep[0].id]);
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
      [id, `cd_u${id}`, role, name, branchId, branchIds]);
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

  const cancel = (fid: number, session: any, reason: any) =>
    http("POST", `/api/followups/${fid}/cancel-decision`, session, { reason });

  /** **بصمةُ كلّ ما يجب ألّا يتغيّر** — تُقارَن حرفياً قبل وبعد. */
  async function fingerprint(pid: number) {
    const [pay] = await q(`SELECT COALESCE(SUM(amount),0)::int total, COUNT(*)::int n
                             FROM payments WHERE patient_id=$1`, [pid]);
    const [pt] = await q(`SELECT total_cost::int tc FROM patients WHERE id=$1`, [pid]);
    const [ce] = await q(`SELECT COALESCE(SUM(amount),0)::int total, COUNT(*)::int n
                            FROM cost_entries WHERE patient_id=$1`, [pid]);
    const cases = await q(`SELECT id, case_type, cost::int cost, status FROM patient_cases
                            WHERE patient_id=$1 ORDER BY id`, [pid]);
    const eps = await q(`SELECT id, status, agreed_cost::int agreed, requested_item, service_path,
                                sequence_number FROM patient_device_episodes
                          WHERE patient_id=$1 ORDER BY id`, [pid]);
    const wos = await q(`SELECT id, status, current_stage, purpose, device_episode_id,
                                expert_user_id, admin_void_reversal_id
                           FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [pid]);
    const exams = await q(`SELECT id, case_type, diagnosis, plan, notes, device_episode_id,
                                  device_cost, signed_at FROM medical_exams
                            WHERE patient_id=$1 ORDER BY id`, [pid]);
    const [cancels] = await q(`SELECT COUNT(*)::int n FROM medical_exam_cancellations c
                                 JOIN medical_exams e ON e.id=c.exam_id WHERE e.patient_id=$1`, [pid]);
    const visits = await q(`SELECT id, cost::int cost, deleted_at FROM visits
                             WHERE patient_id=$1 ORDER BY id`, [pid]);
    return JSON.stringify({ pay, pt, ce, cases, eps, wos, exams, cancels, visits });
  }
  async function fRow(fid: number) {
    const [r] = await q(`SELECT status, closed_at IS NOT NULL closed, closed_reason,
                                last_note, last_contact_at,
                                purchase_decision, purchase_decision_owner,
                                not_bought_reason_text, approved_price, original_price,
                                price_kind, price_owner, selected_expert_user_id,
                                expert_owner, converted_work_order_id, device_episode_id
                           FROM post_exam_followups WHERE id=$1`, [fid]);
    return r ?? null;
  }
  const inQueue = async (session: any, fid: number) =>
    idsOf((await waiting(session)).body).includes(fid);
  const inResolved = async (session: any, fid: number) =>
    idsOf((await resolved(session)).body).includes(fid);

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ أ. المفردةُ الجديدة — طرفيّةٌ سادسة معلَنة ══\n");
    // ════════════════════════════════════════════════════════════════════
    check(TERMINAL_STATUSES.includes("closed_decision_cancelled" as any),
      "١. **`closed_decision_cancelled` طرفيّةٌ معلَنة** — فلا تُحسَب حيّةً في أيّ قارئ");
    same("٢. ولها اسمٌ عربيٌّ يُقرأ",
      FOLLOWUP_STATUS_LABELS["closed_decision_cancelled" as keyof typeof FOLLOWUP_STATUS_LABELS],
      "أُلغي الحسم");
    //  والقاعدةُ نفسُها تقبلها — وإلّا كانت المفردةُ في الشيفرة وحدها.
    const [ck] = await q(`SELECT pg_get_constraintdef(oid) d FROM pg_constraint
                           WHERE conname='post_exam_followups_status_check'`);
    check(String(ck?.d ?? "").includes("closed_decision_cancelled"),
      "٣. **والقيدُ في القاعدة يعرفها** (ترحيل ٠٨١)", String(ck?.d ?? ""));
    for (const ix of ["uq_pef_active_episode", "uq_pef_active_legacy"]) {
      const [r] = await q(`SELECT indexdef d FROM pg_indexes WHERE indexname=$1`, [ix]);
      check(String(r?.d ?? "").includes("closed_decision_cancelled"),
        `٤. **وفهرسُ «المتابعة الحيّة الواحدة» ${ix} يعرفها** — وإلّا أقفلت الخيطَ للأبد`,
        String(r?.d ?? ""));
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ب. الصلاحية — سلطةٌ إدارية لا لكلّ موظّف ══\n");
    // ════════════════════════════════════════════════════════════════════
    same("٥. المسؤولُ العام يملكها", canCancelDecision(S.admin), true);
    same("٦. ومديرُ الفرع", canCancelDecision(S.manager), true);
    same("٧. **ولا الاستقبال**", canCancelDecision(S.recv), false);
    same("٨. **ولا المحاسب**", canCancelDecision(S.acct), false);
    same("٩. **ولا الطبيبُ ولو كان مخوَّلاً بالمعاينة**", canCancelDecision(S.doc), false);
    same("١٠. ولا جلسةٌ غائبة", canCancelDecision(null), false);

    {
      const { pid, fid } = await readySale("صلاحية");
      const before = await fingerprint(pid);
      for (const [who, s] of [["الاستقبال", S.recv], ["المحاسب", S.acct], ["الطبيب", S.doc]] as any[]) {
        const r = await cancel(fid, s, "محاولة");
        same(`١١. ${who} يُردّ ٤٠٣`, r.status, 403);
      }
      same("١٢. **وصفرُ كتابةٍ بعد المحاولات الثلاث** — بصمةُ الملفّ مطابقة",
        await fingerprint(pid), before);
      same("١٣. والصفُّ ما زال حيّاً في الطابور", await inQueue(S.recv, fid), true);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ج. السببُ إلزاميّ — يفرضه الخادم لا الشاشةُ وحدها ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await readySale("سبب");
      const before = await fingerprint(pid);
      for (const [label, reason] of [
        ["غائب", undefined], ["فارغ", ""], ["بياضٌ فقط", "   "],
      ] as any[]) {
        const r = await cancel(fid, S.admin, reason);
        same(`١٤. سببٌ ${label} ⟶ ٤٠٠`, r.status, 400);
      }
      same("١٥. **وصفرُ كتابة**", await fingerprint(pid), before);
      same("١٦. والصفُّ باقٍ حيّاً", (await fRow(fid))?.status, "awaiting_patient_decision");

      // **والمخزنُ يحرس نفسَه** — لا يتّكل على ردّ النقطة. النداءُ هنا مباشرٌ
      // على `store.cancelDecision` فيتجاوز ٤٠٠ النقطةِ تماماً: لو سقط حارسُ
      // المخزن يوماً لَكُتبت المتابعةُ بسببٍ فارغ من أيّ مُنادٍ داخليّ.
      for (const [label, reason] of [
        ["غائب", undefined], ["فارغ", ""], ["بياضٌ فقط", "   "],
      ] as any[]) {
        let code: unknown = "لم يُرمَ شيء";
        try {
          await followupStore.cancelDecision({
            followupId: fid, reason: reason as any,
            actor: { userId: ADMIN, userName: "مسؤول" },
          });
        } catch (e: any) { code = e?.status ?? e?.constructor?.name ?? String(e); }
        same(`١٦.١ المخزنُ مباشرةً — سببٌ ${label} ⟶ ٤٠٠`, code, 400);
      }
      same("١٦.٢ **وصفرُ كتابة من النداء المباشر**", await fingerprint(pid), before);
      same("١٦.٣ والصفُّ ما زال حيّاً", (await fRow(fid))?.status, "awaiting_patient_decision");
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ د. المسارُ الطبيعيّ — يخرج من الطابور ولا يُقال شيءٌ عن المريض ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await readySale("المسار الطبيعي");
      const before = await fingerprint(pid);
      same("١٧. الإعدادُ: الصفُّ في «بانتظار الحسم»", await inQueue(S.recv, fid), true);

      const REASON = "دخل الطابور بالخطأ — لا بيعَ ينتظره";
      const r = await cancel(fid, S.admin, REASON);
      same("١٨. **الإلغاءُ ينجح** (٢٠٠)", r.status, 200);

      const row = await fRow(fid);
      same("١٩. **والحالةُ طرفيّةٌ محايدة**", row?.status, "closed_decision_cancelled");
      same("٢٠. **ويخرج من «بانتظار الحسم»**", await inQueue(S.recv, fid), false);
      same("٢١. **ولا يظهر في «تم الحسم»** — لا قرارَ شراءٍ وقع",
        await inResolved(S.recv, fid), false);

      //  ── وما لم يتغيّر: البصمةُ الكاملة حرفاً بحرف ──
      same("٢٢. **الدفعاتُ والكلفةُ ودفترُ القيود والحلقةُ وأمرُ التصنيع"
        + " والمعاينةُ والزياراتُ — كلُّها مطابقةٌ بايتاً**",
        await fingerprint(pid), before);

      //  ── ولا قرارَ شراءٍ يُدَّعى ──
      same("٢٣. **ولا «اشترى»**", row?.purchase_decision, null);
      same("٢٤. **ولا «لم يشترِ»**", row?.not_bought_reason_text, null);
      same("٢٥. **ولا `closed_reason`** — ذاك عمودُ «لماذا لم يشترِ»", row?.closed_reason, null);
      same("٢٦. **ولا أمرَ تصنيعٍ مرتبط**", row?.converted_work_order_id, null);
      same("٢٧. **ولا سعرَ تحرّك**", [row?.approved_price, row?.original_price, row?.price_kind],
        [0, null, null]);
      same("٢٨. **ولا خبيرَ أُسنِد**", row?.selected_expert_user_id, null);
      check(Boolean(row?.closed), "٢٩. وختمُ الإغلاق مكتوب");
      //  **والسببُ لا يُكتب على الصفّ** — يعيش في الحدث وفي التدقيق وحدهما.
      same("٣٠. **ولا يُكتب السببُ في `last_note`**", row?.last_note, null);

      //  ── الحدثُ والتدقيق ──
      const ev = await q(`SELECT event_type, from_status, to_status, note, payload,
                                 actor_user_id, actor_name FROM post_exam_followup_events
                           WHERE followup_id=$1 AND event_type='closed_decision_cancelled'`, [fid]);
      same("٣١. **حدثٌ واحدٌ بالضبط**", ev.length, 1);
      same("٣٢. ومن الحالة الحيّة إلى الطرفيّة", [ev[0]?.from_status, ev[0]?.to_status],
        ["awaiting_patient_decision", "closed_decision_cancelled"]);
      same("٣٣. **والسببُ في الحدث**", ev[0]?.note, REASON);
      same("٣٤. ومَن نفّذ", Number(ev[0]?.actor_user_id), ADMIN);
      //  والحدثُ يُقرأ بالعربية — لا مفتاحٌ داخليٌّ يصل الشاشة.
      const desc = followupEventView({ eventType: "closed_decision_cancelled", note: REASON } as any);
      check(String(desc?.title ?? "").includes("أُلغي الحسم"),
        "٣٥. **والحدثُ يُقرأ بالعربية**", JSON.stringify(desc));
      check((desc?.facts ?? []).some((f: string) => f.includes(REASON)),
        "٣٦. **ويُخرج سببَ مَن ألغى كما كتبه**", JSON.stringify(desc));

      const au = await q(`SELECT action, old_values, new_values, notes, user_id
                            FROM audit_log WHERE entity_type='post_exam_followup' AND entity_id=$1
                             AND notes LIKE 'إلغاء الحسم%'`, [fid]);
      same("٣٧. **وسطرُ تدقيقٍ واحد**", au.length, 1);
      same("٣٨. بفاعله", Number(au[0]?.user_id), ADMIN);
      check(String(au[0]?.notes ?? "").includes(REASON),
        "٣٩. **وبالسبب كما كُتب**", String(au[0]?.notes ?? ""));
      const nv = typeof au[0]?.new_values === "string"
        ? JSON.parse(au[0].new_values) : au[0]?.new_values;
      same("٤٠. وبالحالة الجديدة", nv?.status, "closed_decision_cancelled");
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ هـ. مديرُ الفرع — في نطاقه وحده ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("مدير الفرع");
      same("٤١. **مديرُ الفرع يُلغي في فرعه**", (await cancel(fid, S.manager, "تصحيحٌ إداريّ")).status, 200);
      same("٤٢. والصفُّ خرج", await inQueue(S.recv, fid), false);
    }
    {
      const { pid, fid } = await readySale("فرعٌ آخر", { branchId: 2 });
      const before = await fingerprint(pid);
      const r = await cancel(fid, S.manager, "من خارج نطاقي");
      check(r.status === 403 || r.status === 404,
        "٤٣. **ومديرُ فرعٍ آخر يُردّ** — نطاقُ الفرع من صفّ المتابعة", String(r.status));
      same("٤٤. **وصفرُ كتابة**", await fingerprint(pid), before);
      same("٤٥. **والمسؤولُ العام يمضي في كلّ فرع**",
        (await cancel(fid, S.admin, "تصحيحٌ من المسؤول")).status, 200);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ و. العزل — متابعةٌ أخرى لنفس المريض لا تُمَسّ ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      //  مريضٌ بجهازين على المسار نفسِه: تُلغى متابعةُ الأول وتبقى الثانية.
      const pid = await mkPatient("جهازان");
      await mkCase(pid);
      const e1 = await http("POST", `/api/patients/${pid}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
      check(e1.status === 201, "٤٦. الإعدادُ: الطلبُ الأول", JSON.stringify(e1.body));
      const epId1 = Number(e1.body?.episode?.id ?? e1.body?.id);
      const x1 = await signExam(pid, { session: S.doc });
      check(x1.status < 300, "٤٧. ومعاينتُه", JSON.stringify(x1.body));
      const fid1 = await followupOf(pid);

      const e2 = await http("POST", `/api/patients/${pid}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "socket", servicePath: "exam" });
      check(e2.status === 201, "٤٨. والطلبُ الثاني", JSON.stringify(e2.body));
      const epId2 = Number(e2.body?.episode?.id ?? e2.body?.id);
      const x2 = await http("POST", `/api/medical/patients/${pid}/exams`, S.doc, {
        idempotencyKey: crypto.randomUUID(), caseType: "prosthetic",
        diagnosis: "ثانية", plan: "خطّة", deviceEpisodeId: epId2,
      });
      check(x2.status < 300, "٤٩. ومعاينتُه", JSON.stringify(x2.body));
      const fid2 = await followupOf(pid);
      check(fid1 > 0 && fid2 > 0 && fid1 !== fid2, "٥٠. **متابعتان مستقلّتان**",
        `${fid1} / ${fid2}`);

      const f2Before = JSON.stringify(await fRow(fid2));
      same("٥١. الإعدادُ: كلتاهما في الطابور",
        [await inQueue(S.recv, fid1), await inQueue(S.recv, fid2)], [true, true]);

      same("٥٢. تُلغى الأولى", (await cancel(fid1, S.admin, "الأولى بالخطأ")).status, 200);
      same("٥٣. **فتخرج هي وحدها**",
        [await inQueue(S.recv, fid1), await inQueue(S.recv, fid2)], [false, true]);
      same("٥٤. **والثانيةُ لم تتغيّر بحرف**", JSON.stringify(await fRow(fid2)), f2Before);
      //  والحلقتان كما هما — الإلغاءُ لا يمسّ جهازاً.
      const eps = await q(`SELECT id, status FROM patient_device_episodes
                            WHERE patient_id=$1 ORDER BY id`, [pid]);
      same("٥٥. **والحلقتان بحالتيهما**", eps.map((e: any) => e.status),
        [ "examined", "examined" ]);
      check(epId1 > 0 && epId2 > 0, "٥٦. (هويّةُ الحلقتين مقروءة)", `${epId1}/${epId2}`);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ز. التكرارُ والتزامن — نتيجةٌ واحدة لا نتيجتان ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const { fid } = await readySale("تكرار");
      same("٥٧. الأولى تنجح", (await cancel(fid, S.admin, "سببٌ أوّل")).status, 200);
      const again = await cancel(fid, S.admin, "سببٌ ثانٍ");
      same("٥٨. **والثانيةُ تُردّ ٤٠٩** — المنتهيةُ لا تُلغى مرّتين", again.status, 409);
      const row = await fRow(fid);
      {
        const [e1] = await q(`SELECT note FROM post_exam_followup_events
                               WHERE followup_id=$1 AND event_type='closed_decision_cancelled'
                               ORDER BY id`, [fid]);
        same("٥٩. **والسببُ الأوّل هو الباقي في الحدث** — لا كتابةَ فوق",
          e1?.note, "سببٌ أوّل");
      }
      const ev = await q(`SELECT COUNT(*)::int n FROM post_exam_followup_events
                           WHERE followup_id=$1 AND event_type='closed_decision_cancelled'`, [fid]);
      same("٦٠. **وحدثٌ واحدٌ بالضبط**", Number(ev[0]?.n), 1);
    }
    {
      const { fid } = await readySale("تزامن");
      const [a, b] = await Promise.all([
        cancel(fid, S.admin, "متزامنة أ"),
        cancel(fid, S.manager, "متزامنة ب"),
      ]);
      const codes = [a.status, b.status].sort();
      same("٦١. **ضغطتان متزامنتان ⟶ نجاحٌ واحد و٤٠٩ واحد**", codes, [200, 409]);
      const ev = await q(`SELECT COUNT(*)::int n FROM post_exam_followup_events
                           WHERE followup_id=$1 AND event_type='closed_decision_cancelled'`, [fid]);
      same("٦٢. **وحدثٌ واحدٌ بالضبط**", Number(ev[0]?.n), 1);
      same("٦٣. والحالةُ طرفيّةٌ واحدة", (await fRow(fid))?.status, "closed_decision_cancelled");
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ح. المنتهيةُ بأيّ سببٍ لا تُلغى ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await readySale("محسومة سلفاً");
      const nb = await http("POST", `/api/followups/${fid}/not-bought`, S.recv,
        { reason: "price", note: "غالٍ عليه" });
      check(nb.status === 200, "٦٤. الإعدادُ: سُجّل «لم يشترِ»", JSON.stringify(nb.body));
      const before = await fingerprint(pid);
      const beforeRow = JSON.stringify(await fRow(fid));
      const r = await cancel(fid, S.admin, "محاولةُ إلغاءٍ بعد الحسم");
      same("٦٥. **٤٠٩ — لا يُقلَب حسمٌ وقع**", r.status, 409);
      same("٦٦. **وصفرُ كتابة**", await fingerprint(pid), before);
      same("٦٧. **وصفُّ المتابعة كما هو** — «لم يشترِ» باقيةٌ بسببها",
        JSON.stringify(await fRow(fid)), beforeRow);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ط. بعد البيع — المالُ والتصنيعُ لا يُمَسّان ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await readySale("بعد البيع");
      const sale = await http("POST", `/api/followups/${fid}/complete-sale`, S.recv, {
        originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT,
      });
      check(sale.status === 200, "٦٨. الإعدادُ: بيعٌ كامل", JSON.stringify(sale.body));
      const before = await fingerprint(pid);
      const r = await cancel(fid, S.admin, "محاولةٌ بعد البيع");
      same("٦٩. **٤٠٩ — البيعُ الواقع لا يُلغى من هذا الباب**", r.status, 409);
      same("٧٠. **وصفرُ كتابة: الكلفةُ والقيدُ والحلقةُ وأمرُ التصنيع كما هي**",
        await fingerprint(pid), before);
      same("٧١. والصفُّ ما زال «تم الشراء»", (await fRow(fid))?.status, "converted");
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ي. الصفُّ اليتيم — يُلغى كذلك (شكلُ العشر على الإنتاج) ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      //  الصفوفُ العشرةُ التي كشفها التشخيصُ على الإنتاج يتيمةٌ أو مرساة —
      //  والبابُ لا يفرّق: المدارُ هو **المتابعة** لا الجهاز.
      const { pid, fid } = await orphanFollowup("يتيمة");
      const before = await fingerprint(pid);
      same("٧٢. الإعدادُ: يتيمةٌ في الطابور", await inQueue(S.recv, fid), true);
      same("٧٣. **بلا حلقةِ جهاز**", (await fRow(fid))?.device_episode_id, null);
      same("٧٤. **والإلغاءُ ينجح عليها**",
        (await cancel(fid, S.admin, "يتيمةٌ دخلت بالخطأ")).status, 200);
      same("٧٥. **فتخرج**", await inQueue(S.recv, fid), false);
      same("٧٦. **وصفرُ أثرٍ على الملفّ**", await fingerprint(pid), before);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ك. عقدُ الشاشة — الزرُّ يظهر لمن يملكه فقط ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const { pid, fid } = await readySale("عقد الشاشة");
      const card = async (s: any) => {
        const r = await http("GET", `/api/followups/patient/${pid}`, s);
        return (r.body?.rows ?? r.body ?? []).find?.((x: any) => Number(x.id) === fid)
          ?? (r.body?.followups ?? []).find?.((x: any) => Number(x.id) === fid);
      };
      const forAdmin = await card(S.admin);
      const forManager = await card(S.manager);
      const forRecv = await card(S.recv);
      same("٧٧. **المسؤولُ يراه**", forAdmin?.mayCancelDecision, true);
      same("٧٨. ومديرُ الفرع", forManager?.mayCancelDecision, true);
      same("٧٩. **ولا الاستقبال** — فلا يظهر زرٌّ يردّه الخادمُ ٤٠٣",
        forRecv?.mayCancelDecision, false);

      const qrow = (b: any) => rowOf(b, fid);
      const qAdmin = qrow((await waiting(S.admin)).body);
      const qRecv = qrow((await waiting(S.recv)).body);
      same("٨٠. **والطابورُ يقولها بنفس الحساب**", qAdmin?.mayCancelDecision, true);
      same("٨١. ولا يقولها للاستقبال", qRecv?.mayCancelDecision, false);

      //  وبعد الإلغاء لا يُعرَض الفعلُ على صفٍّ منتهٍ.
      await cancel(fid, S.admin, "إغلاقُ عقد الشاشة");
      const after = await card(S.admin);
      same("٨٢. **وبعد الإلغاء لا يُعرَض** — المنتهيةُ لا فعلَ عليها",
        after?.mayCancelDecision ?? false, false);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ل. الحارسُ المعماريّ — لا كتابةَ مالية أو تصنيعية في المسار ══\n");
    // ════════════════════════════════════════════════════════════════════
    {
      const src = readFileSync(join(import.meta.dirname, "followup", "store.ts"), "utf8");
      const i = src.indexOf("export async function cancelDecision(");
      const j = src.indexOf("\n/**", i);
      const fn = src.slice(i, j > i ? j : undefined);
      check(i > 0 && fn.length > 0, "٨٣. (جسمُ الدالّة مقروء)");
      for (const [what, re] of [
        ["payments", /\bpayments\b/],
        ["cost_entries", /\bcost_entries\b/],
        ["patients.total_cost", /total_cost/],
        ["patient_cases", /\bpatient_cases\b/],
        ["patient_device_episodes", /patient_device_episodes/],
        ["prosthetic_work_orders", /prosthetic_work_orders/],
        ["medical_exams", /\bmedical_exams\b/],
        ["assignManufacturing", /assignManufacturing/],
        ["purchase_decision", /purchase_decision/],
        ["not_bought_reason_text", /not_bought_reason_text/],
        ["approved_price", /approved_price/],
      ] as any[]) {
        check(!re.test(fn), `٨٤. **ولا ذكرَ لـ\`${what}\` في مسار الإلغاء**`);
      }
      check(/status = 'closed_decision_cancelled'/.test(fn),
        "٨٥. **والكتابةُ الوحيدة حالةُ الصفّ**");
      check(/AND status = \$\{cur\.status\}|AND status = \$\{cur\.status\}/.test(fn)
        || fn.includes("AND status = ${cur.status}"),
        "٨٦. **وشرطُ الحالة في `UPDATE` نفسِه** — حارسُ السباق الثاني");
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ م. التدقيقُ في المعاملة نفسِها — إمّا الاثنان أو لا شيء ══\n");
    // ════════════════════════════════════════════════════════════════════
    //  **فاعلٌ لا وجودَ له في `system_users`** يُفشل سطرَ التدقيق بالمفتاح
    //  الأجنبيّ (`audit_log.user_id → system_users.id`) — وهو أدقُّ ما
    //  يكشف «أَداخلَ المعاملة هو أم خارجَها؟». خارجَها: يُبتلَع الخطأُ
    //  ويخرج الصفُّ من الطابور بلا شاهد. داخلَها: يسقط الإلغاءُ كلُّه.
    {
      const { pid, fid } = await readySale("التدقيق في المعاملة");
      const before = await fingerprint(pid);
      const GHOST = 999_777;   // لا وجودَ له
      const ghost = { ...S.admin, userId: GHOST };
      const r = await cancel(fid, ghost, "فاعلٌ لا وجودَ له");
      check(r.status >= 400, `٨٧. **فاعلٌ بلا صفٍّ ⟶ الطلبُ يفشل** (${r.status})`);
      same("٨٨. **والمتابعةُ باقيةٌ حيّةً** — لا إلغاءَ بلا شاهد",
        (await fRow(fid))?.status, "awaiting_patient_decision");
      same("٨٩. **وصفرُ أحداثٍ مكتوبة**",
        Number((await q(`SELECT COUNT(*)::int n FROM post_exam_followup_events
                          WHERE followup_id=$1 AND event_type='closed_decision_cancelled'`,
          [fid]))[0].n), 0);
      same("٩٠. وصفرُ أسطرِ تدقيق",
        Number((await q(`SELECT COUNT(*)::int n FROM audit_log
                          WHERE entity_type='post_exam_followup' AND entity_id=$1`,
          [fid]))[0].n), 0);
      same("٩١. **وصفرُ كتابةٍ على الملفّ**", await fingerprint(pid), before);

      //  وبفاعلٍ حقيقيّ يمضي الاثنان معاً.
      const ok = await cancel(fid, S.admin, "فاعلٌ حقيقيّ");
      same("٩٢. وبفاعلٍ حقيقيّ ⟶ ٢٠٠", ok.status, 200);
      same("٩٣. **والحدثُ والتدقيقُ معاً**", [
        Number((await q(`SELECT COUNT(*)::int n FROM post_exam_followup_events
                          WHERE followup_id=$1 AND event_type='closed_decision_cancelled'`,
          [fid]))[0].n),
        Number((await q(`SELECT COUNT(*)::int n FROM audit_log
                          WHERE entity_type='post_exam_followup' AND entity_id=$1`,
          [fid]))[0].n),
      ], [1, 1]);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ن. الحيادُ الكامل — آخرُ ملاحظةٍ وآخرُ تواصلٍ لا يُمَسّان ══\n");
    // ════════════════════════════════════════════════════════════════════
    //  **إلغاءُ الحسم سحبُ مهمّةٍ لا حدثٌ على المريض**: فلا يُكتب سببُه فوق
    //  آخر ملاحظةٍ قالها زميلٌ عنه، ولا يحرّك ختمَ آخرِ تواصلٍ فيجعل ملفّاً
    //  لم يُكلَّم صاحبُه منذ شهر يُقرأ «تُوبع اليوم».
    {
      const { pid, fid } = await readySale("الحياد الكامل");
      const NOTE = "اتصلنا به الأحد — قال يراجع أهله ويردّ";
      await q(`UPDATE post_exam_followups
                  SET last_note = $1, last_contact_at = TIMESTAMPTZ '2026-08-01 09:30:00+03'
                WHERE id = $2`, [NOTE, fid]);
      const pre = await fRow(fid);
      const before = await fingerprint(pid);
      same("٩٤. الإعدادُ: ملاحظةٌ ووقتُ تواصلٍ سابقان", [pre?.last_note, Boolean(pre?.last_contact_at)],
        [NOTE, true]);

      const r = await cancel(fid, S.admin, "دخل الطابور بالخطأ — سببُ الإلغاء لا يُكتب فوق ملاحظته");
      same("٩٥. الإلغاءُ ينجح", r.status, 200);
      const post = await fRow(fid);
      same("٩٦. **والحالةُ طرفيّة**", post?.status, "closed_decision_cancelled");

      same("٩٧. **آخرُ ملاحظةٍ باقيةٌ حرفاً بحرف** — لا سببُ الإلغاء كتبها",
        post?.last_note, NOTE);
      same("٩٨. **وآخرُ تواصلٍ لم يتحرّك بجزءٍ من ثانية**",
        String(post?.last_contact_at ?? ""), String(pre?.last_contact_at ?? ""));
      same("٩٩. **وصفرُ كتابةٍ على الملفّ**", await fingerprint(pid), before);

      //  والسببُ موجودٌ فعلاً — في الحدث، حيث يعيش.
      const [ev] = await q(`SELECT note FROM post_exam_followup_events
                             WHERE followup_id=$1 AND event_type='closed_decision_cancelled'`, [fid]);
      check(String(ev?.note ?? "").includes("دخل الطابور بالخطأ"),
        "١٠٠. **والسببُ محفوظٌ في الحدث** — لم يضِع، بل لم يُكتب فوق غيره");
      const [au] = await q(`SELECT notes FROM audit_log
                             WHERE entity_type='post_exam_followup' AND entity_id=$1
                               AND notes LIKE 'إلغاء الحسم%'`, [fid]);
      check(String(au?.notes ?? "").includes("دخل الطابور بالخطأ"),
        "١٠١. **وفي سطر التدقيق كذلك**");

      //  والحارسُ المعماريّ: العمودان غائبان عن جسم الدالّة أصلاً.
      {
        const src = readFileSync(join(import.meta.dirname, "followup", "store.ts"), "utf8");
        const i = src.indexOf("export async function cancelDecision(");
        const j = src.indexOf("\n/**", i);
        const fn = src.slice(i, j > i ? j : undefined);
        const upd = fn.slice(fn.indexOf("UPDATE post_exam_followups"), fn.indexOf("RETURNING"));
        check(!/last_note/.test(upd), "١٠٢. **ولا `last_note` في جملة الكتابة**", upd);
        check(!/last_contact_at/.test(upd), "١٠٣. **ولا `last_contact_at`**", upd);
        check(/SET status =[\s\S]*closed_at =[\s\S]*updated_at =/.test(upd),
          "١٠٤. **والمكتوبُ ثلاثةُ أعمدةٍ لا أكثر**", upd);
      }
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ س. قرارُ شراءٍ محفوظ — لا يُمحى ولا يُناقَض نصّاً ══\n");
    // ════════════════════════════════════════════════════════════════════
    //  النظامُ يقبل `purchase_decision = 'bought'` محفوظاً بينما البيعُ ينتظر
    //  استكمالَ بياناته (٠٦٦). و«إلغاء الحسم» **لا يمحوه** — وهذا صوابُه.
    //  فالنصُّ المعروض بعده يجب ألّا ينفيه.
    {
      const { pid, fid } = await readySale("قرارٌ محفوظ");
      await ownDecisionBought(fid, DOC, "سعد");
      const pre = await fRow(fid);
      same("١٠٥. الإعدادُ: قرارُ «اشترى» محفوظٌ على الصفّ",
        [pre?.purchase_decision, pre?.purchase_decision_owner], ["bought", "doctor"]);
      const before = await fingerprint(pid);

      const r = await cancel(fid, S.admin, "المهمّةُ دخلت الطابورَ بالخطأ");
      same("١٠٦. الإلغاءُ ينجح", r.status, 200);
      const post = await fRow(fid);
      same("١٠٧. **والقرارُ المحفوظ باقٍ كما هو — لا يُمحى**",
        [post?.purchase_decision, post?.purchase_decision_owner], ["bought", "doctor"]);
      same("١٠٨. **وصفرُ كتابةٍ على الملفّ**", await fingerprint(pid), before);

      //  ── والعرضُ لا يناقض الصفَّ الذي يقرؤه الموظّفُ نفسُه ──
      const view = purchasePresentation({ status: post?.status } as any);
      same("١٠٩. **والعرضُ `decision_cancelled`**", view, "decision_cancelled");
      const text = PURCHASE_STATE_TEXT[view];
      check(text.includes("أُلغي الحسم"), "١١٠. **ونصُّه يقول إن الحسمَ أُلغي**", text);
      check(!/لا\s+قرار/.test(text),
        "١١١. **ولا ينفي قراراً قائماً في الصفّ نفسِه** — لا «لا قرارَ شراءٍ مسجَّل»", text);
      check(!/لم\s+يشترِ|رفض|تم الشراء/.test(text),
        "١١٢. **ولا يثبت شراءً ولا رفضاً** — محايدٌ في الاتجاهين", text);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ع. المسارُ الموروث — الصلاحيةُ تصل الشاشةَ ويوجد زرٌّ يستعملها ══\n");
    // ════════════════════════════════════════════════════════════════════
    //  ══ الفجوةُ التي يغلقها هذا القسم ═══════════════════════════════════
    //  الخادمُ يرسل `mayCancelDecision` لكلّ صفٍّ حيّ من نقطتَي البطاقة
    //  والطابور معاً — **بصرف النظر عن `examPath`**. لكنّ الشاشتين كانتا
    //  ترسمان الزرَّ في `ExamPathDecisionActions` وحدها، وتلك لا تُركَّب إلّا
    //  حين `examPath === true`. فصفٌّ موروثٌ (يتيمٌ أو حلقةٌ من ما قبل ٠٦٥)
    //  كان يحمل الصلاحيةَ **ولا يجد زرّاً** — وهو بعينه شكلُ الصفوف التي
    //  وُضع البابُ لأجلها. والخادمُ لم يُمَسّ هنا بحرف: الفجوةُ واجهيّةٌ
    //  محضة، والاختبارُ يثبت الطرفين — الحقيقةَ الحيّة وعقدَ الوصل.
    {
      //  ── ١) الصلاحيةُ الحيّة على صفٍّ موروث: مَن يراها ومَن لا ──────────
      const { pid, fid } = await orphanFollowup("موروثٌ للإلغاء");
      const cardRow = async (s: any) => {
        const r = await http("GET", `/api/followups/patient/${pid}`, s);
        return (r.body?.rows ?? r.body ?? []).find?.((x: any) => Number(x.id) === fid)
          ?? (r.body?.followups ?? []).find?.((x: any) => Number(x.id) === fid);
      };
      same("١١٣. الإعدادُ: صفٌّ موروثٌ حيٌّ في الطابور",
        [await inQueue(S.recv, fid), (await fRow(fid))?.device_episode_id], [true, null]);
      same("١١٤. **وليس على مسار المعاينة** — فيُرسَم بالمكوّن الموروث",
        rowOf((await waiting(S.admin)).body, fid)?.examPath, false);

      same("١١٥. **المسؤولُ العامّ يراها على الصفّ الموروث**",
        (await cardRow(S.admin))?.mayCancelDecision, true);
      same("١١٦. **ومديرُ الفرع ضمن فرعه**",
        (await cardRow(S.manager))?.mayCancelDecision, true);
      for (const [who, sess] of [["الاستقبال", S.recv], ["المحاسب", S.acct], ["الطبيب", S.doc]] as any[]) {
        same(`١١٧. **ولا ${who}** — فلا يُرسَم زرٌّ يردّه الخادمُ ٤٠٣`,
          (await cardRow(sess))?.mayCancelDecision, false);
      }
      //  والطابورُ يقولها بنفس الحساب — الشاشتان تقرآن الحقيقةَ نفسَها.
      same("١١٨. **والطابورُ يقولها بنفس الحساب**", [
        rowOf((await waiting(S.admin)).body, fid)?.mayCancelDecision,
        rowOf((await waiting(S.manager)).body, fid)?.mayCancelDecision,
        rowOf((await waiting(S.recv)).body, fid)?.mayCancelDecision,
        rowOf((await waiting(S.acct)).body, fid)?.mayCancelDecision,
      ], [true, true, false, false]);
    }

    {
      //  ── ٢) مديرُ الفرع **ضمن فرعه وحده** — لا يمتدّ إلى فرعٍ آخر ───────
      const b2 = await orphanFollowup("موروثٌ في فرعٍ آخر", { branchId: 2 });
      same("١١٩. **والصفُّ في الفرع ٢ لا يبلغ مديرَ الفرع ١ أصلاً**",
        rowOf((await waiting(S.manager)).body, b2.fid) ?? null, null);
      same("١٢٠. **والمسؤولُ يراه في كلّ الفروع**",
        rowOf((await waiting(S.admin)).body, b2.fid)?.mayCancelDecision, true);
    }

    {
      //  ── ٣) **الأفعالُ العاديةُ فارغة والصلاحيةُ قائمة** ────────────────
      //  مديرُ فرعٍ أمام صفٍّ موروثٍ في `price_approval_pending`: اعتمادُ
      //  السعر القديم ليس له (`canDecideLegacyPriceRequest`) فتُرجع
      //  `allowedActions` **`[]`** — وهو مع ذلك يملك إخراجَ الصفّ. والشرطُ
      //  القديم `actions.length > 0` كان يحجب الصفَّ كلَّه فلا يجد زرّاً.
      const { fid } = await orphanFollowup("موروثٌ بأفعالٍ فارغة");
      await q(`UPDATE post_exam_followups SET status='price_approval_pending' WHERE id=$1`, [fid]);
      const row = rowOf((await waiting(S.manager)).body, fid);
      same("١٢١. **الأفعالُ العاديةُ فارغةٌ تماماً لمديرِ الفرع**", row?.actions, []);
      same("١٢٢. **والصلاحيةُ قائمةٌ مع ذلك** — فلا بدّ من زرٍّ",
        row?.mayCancelDecision, true);
      //  والفعلُ نفسُه يمضي فعلاً بهذا الشكل — لا صلاحيةٌ معلَّقةٌ بلا باب.
      same("١٢٣. **والإلغاءُ ينجح بيد مديرِ الفرع**",
        (await cancel(fid, S.manager, "دخل الطابورَ بالخطأ — أفعالُه فارغة")).status, 200);
      same("١٢٤. فيخرج من الطابور", await inQueue(S.manager, fid), false);
    }

    {
      //  ── ٤) **السببُ إلزاميّ على الصفّ الموروث أيضاً** ──────────────────
      const { pid, fid } = await orphanFollowup("موروثٌ بلا سبب");
      const before = await fingerprint(pid);
      for (const [what, reason] of [
        ["الغائب", undefined], ["الفارغ", ""], ["البياض", "   "],
      ] as any[]) {
        const r = await cancel(fid, S.admin, reason);
        same(`١٢٥. **السببُ ${what} يُردّ ٤٠٠**`, r.status, 400);
      }
      same("١٢٦. **والصفُّ باقٍ حيّاً**", (await fRow(fid))?.status, "awaiting_patient_decision");
      same("١٢٧. **وصفرُ كتابةٍ على الملفّ**", await fingerprint(pid), before);
      same("١٢٨. **وبسببٍ حقيقيّ يمضي — نفسُ النقطة**",
        (await cancel(fid, S.admin, "سببٌ مكتوب")).status, 200);
    }

    // ════════════════════════════════════════════════════════════════════
    console.log("\n══ ف. عقدُ الشاشة — المكوّنُ الموروث وصِلتاه ══\n");
    // ════════════════════════════════════════════════════════════════════
    //  **لا مشغّلَ DOM في المستودع**، فعقدُ الوصل يُقرأ من المصدر — والأصلُ
    //  المقابَلُ به هو `ExamPathDecisionActions.tsx` نفسُه لا نصٌّ مكتوبٌ
    //  هنا: فلو تغيّر السلوكُ هناك يوماً ولم يلحقه الموروثُ، سقط القسم.
    {
      const cdir = join(import.meta.dirname, "..", "client", "src");
      const src = (...parts: string[]) => readFileSync(join(cdir, ...parts), "utf8");
      const legacy = src("components", "LegacyDecisionActions.tsx");
      const examPath = src("components", "ExamPathDecisionActions.tsx");
      const queue = src("pages", "PostExamFollowups.tsx");
      const card = src("components", "PostExamDecisionCard.tsx");

      //  ── الخاصّيةُ والزرُّ والنافذة ──────────────────────────────────────
      check(/mayCancelDecision\?: boolean;/.test(legacy),
        "١٢٩. **الخاصّيةُ `mayCancelDecision` في عقد المكوّن الموروث**");
      check(/\{mayCancelDecision && \(/.test(legacy),
        "١٣٠. **والزرُّ مشروطٌ بها وحدها** — لا بـ`actions`");
      check(/data-testid="button-cancel-decision"/.test(legacy),
        "١٣١. وبنفس معرّف الزرّ");
      check(/data-testid="button-save-cancel-decision"/.test(legacy)
        && /data-testid="input-cancel-decision-reason"/.test(legacy)
        && /data-testid="text-cancel-decision-scope"/.test(legacy),
        "١٣٢. **ونفسُ نافذة التأكيد بحقلها وتحذيرها**");

      //  ── **نفسُ النقطة القائمة** — لا مسارَ ثانٍ يُخترَع ────────────────
      const EP = "`/api/followups/${followupId}/cancel-decision`";
      check(legacy.includes(EP), "١٣٣. **ونفسُ نقطة الإلغاء القائمة**", EP);
      check(examPath.includes(EP) && legacy.includes(EP),
        "١٣٤. **والمكوّنان ينادِيان النقطةَ نفسَها حرفاً بحرف**");
      check(/\{ reason: cancelReason\.trim\(\) \}/.test(legacy),
        "١٣٥. **ونفسُ جسم الطلب** — `{ reason }` مقلَّماً");
      check(/disabled=\{busy \|\| !cancelReason\.trim\(\)\}/.test(legacy),
        "١٣٦. **والسببُ إلزاميٌّ في الشاشة كذلك** — زرُّ الحفظ معطَّلٌ بلا نصّ");
      //  ونفسُ معالجة النجاح/الخطأ/الإبطال: الفعلُ يمرّ بـ`submit` نفسِها
      //  التي تمرّ بها «اشترى»/«لم يشترِ» — لا `useMutation` ثانية.
      same("١٣٧. **ولا طفرةً ثانية للإلغاء** — نفسُ `act`/`submit`/`invalidateAll`",
        (legacy.match(/useMutation\(/g) ?? []).length, 1);
      check(/setCancelReason\(""\); setDialog\("cancel_decision"\)/.test(legacy),
        "١٣٨. **والنافذةُ تُفتَح بحقلٍ فارغ** — لا سببٌ بائتٌ من فتحةٍ سابقة");

      //  ── الصِّلةُ الأولى: الطابور ────────────────────────────────────────
      check(/mayCancelDecision: boolean;/.test(queue),
        "١٣٩. **والحقلُ مطبوعٌ في نوع صفّ الطابور**");
      const legacyBlock = queue.slice(queue.indexOf("<LegacyDecisionActions"),
        queue.indexOf("/>", queue.indexOf("<LegacyDecisionActions")));
      check(/mayCancelDecision=\{Boolean\(row\.mayCancelDecision\)\}/.test(legacyBlock),
        "١٤٠. **والطابورُ يمرّرها إلى المكوّن الموروث**", legacyBlock);
      check(queue.includes("row.actions.length > 0 || row.mayCancelDecision"),
        "١٤١. **وشرطُ العرض صار «أفعالٌ أو صلاحية»** — لا يحجبه فراغُ الأفعال");
      check(!/\(row as any\)\.mayCancelDecision/.test(queue),
        "١٤٢. ولا قراءةَ `any` بقيت له");

      //  ── الصِّلةُ الثانية: بطاقةُ المريض — نفسُ التمرير ─────────────────
      const cardBlock = card.slice(card.indexOf("<LegacyDecisionActions"),
        card.indexOf("/>", card.indexOf("<LegacyDecisionActions")));
      check(/mayCancelDecision=\{!examPath && Boolean\(\(active as any\)\.mayCancelDecision\)\}/
        .test(cardBlock),
        "١٤٣. **وبطاقةُ المريض تمرّرها كذلك** — فالشاشتان متطابقتان", cardBlock);
      //  **و`!examPath` شرطُ صحّةٍ لا زينة**: البطاقةُ تُركّب المكوّنَ
      //  الموروثَ بلا شرط، فبدونه يظهر الزرُّ مرّتين على صفّ مسار المعاينة.
      check(cardBlock.includes("!examPath"),
        "١٤٤. **ومقصورةً على الموروث** — فلا زرّان على صفّ مسار المعاينة");
      const examBlock = card.slice(card.indexOf("<ExamPathDecisionActions"),
        card.indexOf("/>", card.indexOf("<ExamPathDecisionActions")));
      check(/mayCancelDecision=/.test(examBlock),
        "١٤٥. **ومسارُ المعاينة كما كان بحرفه**");
    }

    console.log(
      "\nملاحظة: «إلغاء الحسم» لا يُنشئ بيعاً ولا يسجّل «لم يشترِ» ولا يعكس بيعاً"
      + " سابقاً — المنتهيةُ تُردّ ٤٠٩، والحيّةُ تخرج من الطابور وحدها.");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, MANAGER, DOC, RECV, ACCT, EXPERT, EXPERT_B2]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص إلغاء الحسم نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
