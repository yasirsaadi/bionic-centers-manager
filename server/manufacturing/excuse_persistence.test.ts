//  **العذرُ المكتوب لا يضيع — ويُكتب في مكانٍ واحد** (قرارُ المالك ٢٠٢٦-٠٩-٢٤).
//
//  شكوى المالك: كتب الخبيرُ مصطفى شرف لمريضته «وهج» عذراً («تأخّر البرلون»)
//  فلم يظهر لها. وقرارُه: «أريد أن تبقى منطقياً بحيث لا يضيع عذرٌ مهما كان
//  موقعُه… أو تُلزم الخبيرَ بمكان كتابة عذرٍ واحد، وتجعل التطبيق يقرأ فقط من
//  هذا المكان.»
//
//  والذي كان يقع: العذرُ يُكتب من «توقّف / مشكلة» — وهو وحدَه ما يقرؤه
//  التطبيق — **ثمّ يمحوه الاستئناف** («إلغاء التوقّف ومتابعة العمل») ويمحوه
//  الانتقالُ للمرحلة التالية، فيعود الأمرُ المتأخّر أحمرَ كأن شيئاً لم يُكتب.
//
//  والقاعدةُ الآن: يبقى العذرُ حتى **ينتهي الأمر** (تسليمٌ أو إنجازُ صيانةٍ أو
//  إلغاء) أو **يحلّ محلَّه عذرٌ أحدث** من المكان نفسِه. وتغييرُ الموعد لا يمحوه.
//
//  حيٌّ على Postgres وعلى النقاط الحقيقية عبر Express حقيقيّ:
//  `/hold` · `/hold-reason` · `/resume` · `/advance` · `/delivery-date` · `/cancel` ·
//  `/orders` · `/orders/:id` · `/overview` · `/notifications`.
//  التشغيل: `DATABASE_URL=… npm run test:manufacturing-excuse`
import { db } from "../db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import * as store from "./store";
import { registerRoutes } from "../routes";
import { HOLD_REASONS, FINAL_RESULTS, latenessOf, writtenHoldExcuse } from "@shared/manufacturing";
import {
  rowToneOf, orderLatenessNotice, EXCUSE_PLACE_HINT_RED, EXCUSE_PLACE_HINT_AMBER,
  EXCUSE_PLACE_HINT_RED_HELD, heldExcuseOf, holdButtonShown, holdDialogKind,
} from "../../client/src/pages/manufacturing_row_tone";
import { workHistoryMovementLabel } from "@shared/daily_review";

const PORT = 6031 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;

//  جدولُ النقاط الحقيقيّ — نفسُ حَقنِ الجلسة المستعمَل في بقيّة الحزم.
async function bootRealRoutes() {
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
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session")
      ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));
  return httpServer;
}

async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, detail = "") => {
  if (c) { pass++; console.log("  ✓ " + m); }
  else { fail++; console.log("  ✗ " + m + (detail ? `\n      ${detail}` : "")); }
};
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);

//  تاريخان لا يتأثّران بيوم التشغيل: مضى موعدُه يقيناً، ولم يحِن يقيناً.
const PAST = "2020-01-15";
const PAST2 = "2020-02-20";
const FUTURE = "2099-12-31";

//  أسبابٌ صالحةٌ من القائمة القانونية نفسِها — لا رموزٌ مكتوبةٌ هنا تنحرف.
const MAT = HOLD_REASONS.waiting_materials[0].code;
const PAT = HOLD_REASONS.waiting_patient[0].code;
const RWK = HOLD_REASONS.technical_rework[0].code;

async function main() {
  let srv: any = null;
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;
  const ids: number[] = [];
  const userIds: number[] = [];
  const patientIds: number[] = [];

  const bE = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع العذر " + t}) RETURNING id`)).id);
  const mkUser = async (role: string, name: string) => {
    const id = Number((await one(sql`
      INSERT INTO system_users (username, password_hash, display_name, role, branch_id, branch_ids,
                                is_active, can_view_patients)
      VALUES (${role + "_x_" + t + "_" + userIds.length}, 'x', ${name + " " + t}, ${role},
              ${bE}, ${JSON.stringify([bE])}::jsonb, true, true)
      RETURNING id`)).id);
    userIds.push(id);
    return id;
  };
  const X = await mkUser("prosthetics_expert", "مصطفى شرف");
  const M = await mkUser("branch_manager", "مدير الفرع");
  const X2 = await mkUser("prosthetics_expert", "خبير آخر");

  const S = {
    expert: { userId: X, role: "prosthetics_expert", isAdmin: false, branchId: bE,
      accessibleBranches: [bE], displayName: "مصطفى شرف", permissions: {} },
    manager: { userId: M, role: "branch_manager", isAdmin: false, branchId: bE,
      accessibleBranches: [bE], displayName: "مدير", permissions: { canViewPatients: true } },
    admin: { userId: 0, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} },
    //  خبيرٌ في الفرع نفسِه **غيرُ مسنَدٍ** إليه أيٌّ من الأوامر.
    other: { userId: X2, role: "prosthetics_expert", isAdmin: false, branchId: bE,
      accessibleBranches: [bE], displayName: "خبير آخر", permissions: {} },
  };

  //  مريضٌ لكلّ أمر — القاعدةُ تمنع بناءين مفتوحين لمريضٍ واحد.
  const mkOrder = async (o: {
    name: string; stage: string; due: string | null; purpose?: string;
  }) => {
    const patient = Number((await one(sql`
      INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
      VALUES (${o.name + " " + t}, ${"0772" + t + patientIds.length}, ${bE}, true, 'اختبار', 30, 'بتر')
      RETURNING id`)).id);
    patientIds.push(patient);
    const id = Number((await one(sql`
      INSERT INTO prosthetic_work_orders
        (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage,
         expected_delivery_date)
      VALUES (${patient}, ${bE}, 'prosthetic', ${o.purpose ?? "initial_build"}, ${X}, 'active',
              ${o.stage}, ${o.due})
      RETURNING id`)).id);
    ids.push(id);
    return id;
  };
  const raw = async (id: number) => (await store.getRawOrder(id))!;
  const rowOf = async (id: number) => {
    const r = await http("GET", `/api/manufacturing/orders?branchId=${bE}`, S.admin);
    return (r.body as any[]).find((x) => x.id === id);
  };

  //  ══ العيّنة ═══════════════════════════════════════════════════════════
  const W = await mkOrder({ name: "وهج", stage: "manufacturing", due: PAST });
  const R = await mkOrder({ name: "متأخر لم يُكتب له شيء", stage: "manufacturing", due: PAST });

  try {
    srv = await bootRealRoutes();

    console.log("\nأ — شكلُ «وهج»: يُكتب العذر ثمّ يُستأنف العمل");
    let row = await rowOf(W);
    eq([row?.isOverdue, latenessOf(row), rowToneOf(row).tone], [true, "late", "red"],
      "أ١. متأخّرٌ ولم يُكتب له عذرٌ بعد ⟶ أحمر");
    let ov = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;
    eq([ov?.totals?.overdue, ov?.totals?.overdueExcused], [2, 0],
      "أ٢. واللوحة: اثنان بدون عذر · صفرٌ بعذر");

    let r = await http("POST", `/api/manufacturing/orders/${W}/hold`, S.expert,
      { status: "waiting_materials", reasonCode: MAT, note: "تأخّر البرلون" });
    eq(r.status, 200, "أ٣. الخبيرُ يكتب السبب من «توقّف / مشكلة»");
    let w = await raw(W);
    eq([w.status, w.holdReasonCode, w.holdNote], ["waiting_materials", MAT, "تأخّر البرلون"],
      "أ٤. والعذرُ مكتوبٌ على الأمر");

    r = await http("POST", `/api/manufacturing/orders/${W}/resume`, S.expert, {});
    eq(r.status, 200, "أ٥. ثمّ «إلغاء التوقّف ومتابعة العمل»");
    w = await raw(W);
    eq([w.status, w.holdReasonCode, w.holdNote], ["active", MAT, "تأخّر البرلون"],
      "أ٦. **يعود الأمرُ يعمل والعذرُ باقٍ بحرفه** — لا يمحوه الاستئناف");

    row = await rowOf(W);
    eq([row?.isOverdue, row?.holdReasonCode, row?.holdNote], [true, MAT, "تأخّر البرلون"],
      "أ٧. والقائمةُ تُخرجه من نقطتها");
    const tone = rowToneOf(row);
    eq([latenessOf(row), tone.tone, tone.overdueBadgeLabel, tone.reason?.prefix, tone.reason?.note],
      ["late_excused", "amber", "متأخر بعذر", "سببُ التأخير", "تأخّر البرلون"],
      "أ٨. **فصفُّه كهرمانيّ «متأخر بعذر» وسببُه ظاهر** — لا أحمر");
    ov = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;
    eq([ov?.totals?.overdue, ov?.totals?.overdueExcused], [1, 1],
      "أ٩. واللوحة: واحدٌ بدون عذر · واحدٌ بعذر");
    const notif = (await http("GET", `/api/manufacturing/notifications`, S.admin)).body;
    const nW = notif?.items?.find((i: any) => i.orderId === W);
    eq([nW?.kind, !!nW?.holdReasonLabel, nW?.holdNote], ["overdue", true, "تأخّر البرلون"],
      "أ١٠. والتنبيهات: متأخّرٌ بسببه — كهرمانيّ لا أحمر");
    const det = (await http("GET", `/api/manufacturing/orders/${W}`, S.expert)).body;
    eq([det?.order?.isOverdue, det?.order?.holdReasonCode], [true, MAT],
      "أ١١. وصفحةُ الأمر تقرأ «متأخر» من الخادم ومعه عذرُه");
    const notice = orderLatenessNotice(det.order);
    eq([notice?.tone, notice?.title, notice?.reason?.note, notice?.hint],
      ["amber", "متأخر بعذر", "تأخّر البرلون", EXCUSE_PLACE_HINT_AMBER],
      "أ١٢. وتنبيهُ الصفحة كهرمانيّ بعذره، ويقول إنه باقٍ");

    console.log("\nب — الانتقالُ للمرحلة التالية لا يمحوه");
    r = await http("PATCH", `/api/manufacturing/orders/${W}/advance`, S.expert, {});
    eq(r.status, 200, "ب١. تقدّم الأمرُ مرحلة");
    w = await raw(W);
    eq([w.currentStage, w.status, w.holdReasonCode, w.holdNote],
      ["ready_for_fitting", "active", MAT, "تأخّر البرلون"],
      "ب٢. والعذرُ باقٍ بعد التقدّم");

    console.log("\nج — تغييرُ الموعد لا يمحوه");
    r = await http("PATCH", `/api/manufacturing/orders/${W}/delivery-date`, S.expert,
      { expectedDeliveryDate: FUTURE, reason: "وصل البرلون", ifCurrentDate: PAST });
    eq(r.status, 200, "ج١. حدّد الخبيرُ موعداً جديداً");
    w = await raw(W);
    eq([w.holdReasonCode, w.holdNote], [MAT, "تأخّر البرلون"], "ج٢. والعذرُ باقٍ في الأمر");
    row = await rowOf(W);
    eq([row?.isOverdue, rowToneOf(row).tone, rowToneOf(row).reason],
      [false, "plain", null],
      "ج٣. **وفي موعده الآن فلا لون** — عذرٌ لا يعذر شيئاً ما دام لا تأخّر");
    eq(orderLatenessNotice({ ...row }), null, "ج٤. ولا تنبيهَ تأخّرٍ في صفحته");
    r = await http("PATCH", `/api/manufacturing/orders/${W}/delivery-date`, S.expert,
      { expectedDeliveryDate: PAST2, reason: "تصحيح التاريخ", ifCurrentDate: FUTURE });
    eq(r.status, 200, "ج٥. وعاد موعدُه ماضياً");
    row = await rowOf(W);
    eq([row?.isOverdue, rowToneOf(row).tone, rowToneOf(row).reason?.note],
      [true, "amber", "تأخّر البرلون"],
      "ج٦. فتأخّر ثانيةً ⟶ عاد كهرمانيّاً بعذره نفسِه — لم يضع");

    console.log("\nد — عذرٌ أحدث يحلّ محلّه");
    r = await http("POST", `/api/manufacturing/orders/${W}/hold`, S.expert,
      { status: "waiting_patient", reasonCode: PAT, note: "المريض مسافر" });
    eq(r.status, 200, "د١. كتب الخبيرُ سبباً جديداً");
    r = await http("POST", `/api/manufacturing/orders/${W}/resume`, S.expert, {});
    w = await raw(W);
    eq([r.status, w.status, w.holdReasonCode, w.holdNote], [200, "active", PAT, "المريض مسافر"],
      "د٢. **والأحدثُ هو العذر** بعد الاستئناف — والقديمُ في الخطّ الزمني");
    const hist = (await db.execute(sql`
      SELECT notes FROM prosthetic_work_history WHERE work_order_id = ${W} ORDER BY id`)).rows as any[];
    ok(hist.some((h) => String(h.notes).includes("تأخّر البرلون"))
      && hist.some((h) => String(h.notes).includes("المريض مسافر")),
      "د٣. والعذران كلاهما محفوظان في الخطّ الزمني");

    console.log("\nهـ — ينتهي العذرُ بانتهاء الأمر");
    r = await http("PATCH", `/api/manufacturing/orders/${W}/advance`, S.expert,
      { finalResult: FINAL_RESULTS[0] });
    w = await raw(W);
    eq([r.status, w.status, w.holdReasonCode, w.holdNote], [200, "completed", null, null],
      "هـ١. سُلِّم الأمرُ ⟶ مكتملٌ بلا عذر");

    const MT = await mkOrder({ name: "صيانة متأخرة", stage: "new_assignment", due: PAST, purpose: "maintenance" });
    await http("POST", `/api/manufacturing/orders/${MT}/hold`, S.expert,
      { status: "waiting_materials", reasonCode: MAT, note: "قطعة" });
    await http("POST", `/api/manufacturing/orders/${MT}/resume`, S.expert, {});
    eq((await raw(MT)).holdReasonCode, MAT, "هـ٢. صيانةٌ استُؤنفت وعذرُها باقٍ");
    r = await http("PATCH", `/api/manufacturing/orders/${MT}/advance`, S.expert,
      { toStage: "maintenance_device_done" });
    const mt = await raw(MT);
    eq([r.status, mt.status, mt.holdReasonCode, mt.holdNote], [200, "completed", null, null],
      "هـ٣. وأُنجزت الصيانةُ ⟶ مكتملةٌ بلا عذر");

    const CN = await mkOrder({ name: "سيُلغى", stage: "manufacturing", due: PAST });
    await http("POST", `/api/manufacturing/orders/${CN}/hold`, S.expert,
      { status: "waiting_materials", reasonCode: MAT });
    await http("POST", `/api/manufacturing/orders/${CN}/resume`, S.expert, {});
    r = await http("POST", `/api/manufacturing/orders/${CN}/cancel`, S.manager, {});
    const cn = await raw(CN);
    eq([r.status, cn.status, cn.holdReasonCode], [200, "cancelled", null],
      "هـ٤. وأُلغي أمرٌ ⟶ ملغىً بلا عذر");

    console.log("\nو — ومَن لم يُكتب له عذرٌ يبقى أحمر، ويُدَلّ على المكان الواحد");
    const rr = await rowOf(R);
    eq([latenessOf(rr), rowToneOf(rr).tone, rowToneOf(rr).overdueBadgeLabel],
      ["late", "red", "متأخر بدون عذر"], "و١. متأخّرٌ بلا عذر ⟶ أحمر «متأخر بدون عذر»");
    const detR = (await http("GET", `/api/manufacturing/orders/${R}`, S.expert)).body;
    const nR = orderLatenessNotice(detR.order);
    eq([nR?.tone, nR?.title, nR?.reason, nR?.hint],
      ["red", "متأخر بدون عذر", null, EXCUSE_PLACE_HINT_RED],
      "و٢. وتنبيهُ صفحته أحمر ويدلّ على «توقّف / مشكلة» وحدَه");
    ok(/«توقّف \/ مشكلة»/.test(EXCUSE_PLACE_HINT_RED) && /الوحيد/.test(EXCUSE_PLACE_HINT_RED),
      "و٣. والجملةُ تسمّي المكانَ الواحد صراحةً");
    //  ملاحظةٌ فنّية عند التقدّم **ليست عذراً**: لا تُكتب في الأمر ولا تغيّر لونه.
    await http("PATCH", `/api/manufacturing/orders/${R}/advance`, S.expert,
      { notes: "تأخّر البرلون" });
    const rr2 = await rowOf(R);
    eq([rr2?.holdReasonCode, latenessOf(rr2), rowToneOf(rr2).tone], [null, "late", "red"],
      "و٤. **وملاحظةٌ فنّية عند التقدّم لا تصير عذراً** — يبقى أحمر");

    console.log("\nز — إعادةُ العمل الفنّي كذلك");
    const K = await mkOrder({ name: "إعادة عمل", stage: "manufacturing", due: PAST });
    r = await http("POST", `/api/manufacturing/orders/${K}/hold`, S.expert,
      { status: "technical_rework", reasonCode: RWK, returnToStage: "mold", note: "إعادة القالب" });
    eq(r.status, 200, "ز١. إعادةُ عملٍ فنّي بسببها");
    r = await http("POST", `/api/manufacturing/orders/${K}/resume`, S.expert, {});
    const k = await raw(K);
    eq([r.status, k.status, k.currentStage, k.holdReasonCode], [200, "active", "mold", RWK],
      "ز٢. واستُؤنف العملُ وسببُها باقٍ عذراً");
    eq(latenessOf(await rowOf(K)), "late_excused", "ز٣. فهو «متأخر بعذر»");

    console.log("\nح — واللوحةُ تتبع الصفوفَ بعد كلّ ذلك");
    ov = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;
    //  الأحياءُ المتأخّرة: R (بلا عذر) · K (بعذر). وW وMT مكتملان، وCN ملغى.
    eq([ov?.totals?.overdue, ov?.totals?.overdueExcused], [1, 1],
      "ح١. واحدٌ بدون عذر (R) · واحدٌ بعذر (K)");

    //  ══ ط. المتوقّفُ الموروثُ بلا سببٍ مكتوب (مراجعة Codex على ٤٠٣) ══════════
    //  ترحيلا ٠٤٥ و٠٤٦ حوّلا `waiting_components` ⟶ `waiting_materials` و
    //  `needs_recast`/`needs_resocket` ⟶ `technical_rework` **بلا تعبئة
    //  `hold_reason_code`** — فأمرٌ متوقّفٌ يبقى بلا عذرٍ مكتوب. والصفحةُ كانت
    //  تُسقط تنبيهَه لأنه «متوقّف»، وتُخفي بطاقةَ التوقّف لأنه «بلا سبب»،
    //  وتُخفي «توقّف / مشكلة» لأنه متوقّف — فلا يقول شيئاً ولا بابَ للعذر.
    console.log("\nط — المتوقّفُ الموروثُ بلا سببٍ مكتوب");
    const L = await mkOrder({ name: "متوقف موروث", stage: "manufacturing", due: PAST });
    const TR = await mkOrder({ name: "إعادة عمل موروثة", stage: "manufacturing", due: PAST });
    //  الشكلُ الذي تتركه الترحيلتان حرفياً: الحالةُ تُحوَّل، والسببُ لا يُمَسّ.
    await db.execute(sql`UPDATE prosthetic_work_orders SET status = 'waiting_materials' WHERE id = ${L}`);
    await db.execute(sql`UPDATE prosthetic_work_orders SET status = 'technical_rework' WHERE id = ${TR}`);

    const detL = (await http("GET", `/api/manufacturing/orders/${L}`, S.expert)).body;
    eq([detL?.order?.status, detL?.order?.holdReasonCode, detL?.order?.isOverdue],
      ["waiting_materials", null, true],
      "ط١. متوقّفٌ متأخّرٌ بلا سببٍ مكتوب — كما تتركه الترحيلتان");
    const rowL = await rowOf(L);
    eq([latenessOf(rowL), rowToneOf(rowL).tone, rowToneOf(rowL).overdueBadgeLabel],
      ["late", "red", "متأخر بدون عذر"],
      "ط٢. واللوحةُ تعدّه «متأخر بدون عذر» أحمر");
    const nL = orderLatenessNotice(detL.order);
    eq([nL?.tone, nL?.title, nL?.reason ?? null, nL?.hint],
      ["red", "متأخر بدون عذر", null, EXCUSE_PLACE_HINT_RED_HELD],
      "ط٣. **وصفحتُه تقول ذلك أيضاً** — تنبيهٌ أحمر يقول لماذا، لا صمت");
    eq([heldExcuseOf(detL.order), writtenHoldExcuse(detL.order.holdReasonCode)], [null, null],
      "ط٤. ولا بطاقةَ «متوقّف» تعرض سبباً — فالتنبيهُ وحدَه يقول الحال");
    eq(holdButtonShown(detL.order), true,
      "ط٤أ. **و«توقّف / مشكلة» ظاهرٌ له** — المكانُ الواحد لا يُحبَس خلف «إلغاء التوقّف»");
    const detTR = (await http("GET", `/api/manufacturing/orders/${TR}`, S.expert)).body;
    eq([orderLatenessNotice(detTR.order)?.tone, holdButtonShown(detTR.order)], ["red", true],
      "ط٥. وإعادةُ العمل الموروثةُ بلا سبب كذلك — تنبيهٌ أحمر وبابُ العذر");

    ov = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;
    eq([ov?.totals?.overdue, ov?.totals?.overdueExcused], [3, 1],
      "ط٦. واللوحة: ثلاثةٌ بدون عذر (R · L · TR) · واحدٌ بعذر (K)");

    r = await http("POST", `/api/manufacturing/orders/${L}/hold`, S.expert,
      { status: "waiting_materials", reasonCode: MAT, note: "تأخّر المفصل" });
    eq(r.status, 200, "ط٧. والخادمُ يقبل كتابةَ السبب على الأمر المتوقّف نفسِه");
    const l = await raw(L);
    eq([l.status, l.holdReasonCode, l.holdNote], ["waiting_materials", MAT, "تأخّر المفصل"],
      "ط٨. فصار للتوقّف سببُه المكتوب");
    const detL2 = (await http("GET", `/api/manufacturing/orders/${L}`, S.expert)).body;
    eq([orderLatenessNotice(detL2.order), heldExcuseOf(detL2.order)],
      [null, MAT],
      "ط٩. **فتقول بطاقةُ «متوقّف» سببَه، ولا تنبيهَ ثانٍ يكرّره**");
    eq(holdButtonShown(detL2.order), false,
      "ط٩أ. وصار كأيّ متوقّفٍ بسببه: يُستأنَف ثمّ يُكتب الأحدث");
    const rowL2 = await rowOf(L);
    eq([latenessOf(rowL2), rowToneOf(rowL2).tone, rowToneOf(rowL2).reason?.note],
      ["late_excused", "amber", "تأخّر المفصل"],
      "ط١٠. وصفُّه كهرمانيّ «متأخر بعذر» بسببه");
    ov = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;
    eq([ov?.totals?.overdue, ov?.totals?.overdueExcused], [2, 2],
      "ط١١. واللوحة: اثنان بدون عذر (R · TR) · اثنان بعذر (K · L)");

    //  ══ ي. كتابةُ سبب التوقّف القائم (مراجعة Codex على ٤٠٤) ════════════════
    //  أمرٌ موروثٌ في `technical_rework` **رجع فعلاً في النظام القديم** (وصفُّ
    //  إعادة عمله باقٍ كما تركه ٠٤٥). وكان البابُ الوحيد لكتابة سببه `/hold`،
    //  وفيه «إعادة العمل الفنّي» لا تُكتب إلّا برجوعٍ إلى مرحلةٍ سابقة: فيُرجَع
    //  مرّةً ثانية، ويُسجَّل له صفُّ إعادة عملٍ ثانٍ، ويُكتب للمريض حدثُ مرحلة —
    //  وفي أوّل المراحل لا مرحلةَ سابقة فلا يُكتب السببُ أصلاً (مُعادٌ حيّاً).
    console.log("\nي — المتوقّفُ الموروثُ يُكتب سببُه: النوعُ نوعُه والمرحلةُ مرحلتُه");
    const legacyRework = async (id: number) => db.execute(sql`
      INSERT INTO prosthetic_rework_events (work_order_id, rework_type, reason_code, stage_when_detected, created_by)
      VALUES (${id}, 'resocket', 'legacy', 'socket_adjustment', ${X})`);
    const legacyShape = async (id: number) =>
      db.execute(sql`UPDATE prosthetic_work_orders SET status = 'technical_rework' WHERE id = ${id}`);
    await legacyRework(TR);
    const TM = await mkOrder({ name: "إعادة عمل موروثة في القياسات", stage: "measurements", due: PAST });
    const TX = await mkOrder({ name: "صيانة بإعادة عمل موروثة", stage: "new_assignment", due: PAST, purpose: "maintenance" });
    const TY = await mkOrder({ name: "إعادة عمل موروثة لشاشةٍ بائتة", stage: "manufacturing", due: PAST });
    const TZ = await mkOrder({ name: "إعادة عمل موروثة للسباق", stage: "manufacturing", due: PAST });
    for (const id of [TM, TX, TY, TZ]) { await legacyShape(id); await legacyRework(id); }

    const snap = async (id: number) => {
      const o = await raw(id);
      const n = async (q: any) => Number(((await db.execute(q)).rows[0] as any).n);
      return {
        status: o.status, stage: o.currentStage, reason: o.holdReasonCode, note: o.holdNote,
        reworks: await n(sql`SELECT count(*) n FROM prosthetic_rework_events WHERE work_order_id = ${id}`),
        patientEvents: await n(sql`SELECT count(*) n FROM patient_events WHERE patient_id = ${o.patientId}`),
        history: await n(sql`SELECT count(*) n FROM prosthetic_work_history WHERE work_order_id = ${id}`),
      };
    };

    const kindOf = async (id: number) =>
      holdDialogKind((await http("GET", `/api/manufacturing/orders/${id}`, S.expert)).body.order);
    eq([await kindOf(TR), await kindOf(TM), await kindOf(TX)],
      ["document_existing", "document_existing", "document_existing"],
      "ي١. «توقّف / مشكلة» يفتح لكلٍّ منها نافذةَ «سبب التوقّف القائم» لا نافذةَ توقّفٍ جديد");
    eq([await kindOf(R), await kindOf(L)], ["new_hold", null],
      "ي٢. والعاملُ يفتح توقّفاً جديداً كما كان · والمتوقّفُ بسببه لا زرَّ له");

    const trBefore = await snap(TR);
    eq([trBefore.status, trBefore.stage, trBefore.reason, trBefore.reworks, trBefore.patientEvents],
      ["technical_rework", "manufacturing", null, 1, 0],
      "ي٣. قبل: إعادةُ عملٍ موروثة في «التصنيع» بلا سبب، ولها صفُّ إعادة عملٍ قديم واحد");
    r = await http("POST", `/api/manufacturing/orders/${TR}/hold-reason`, S.expert,
      { status: "technical_rework", reasonCode: RWK, note: "السوكت القديم ضيّق" });
    eq(r.status, 200, "ي٤. الخبيرُ يكتب السببَ من «توقّف / مشكلة»");
    const trAfter = await snap(TR);
    eq([trAfter.status, trAfter.stage, trAfter.reason, trAfter.note],
      ["technical_rework", "manufacturing", RWK, "السوكت القديم ضيّق"],
      "ي٥. **النوعُ نوعُه والمرحلةُ مرحلتُه** — لم يُرجَع بمرحلة، والسببُ مكتوب");
    eq([trAfter.reworks, trAfter.patientEvents], [1, 0],
      "ي٦. **ولا صفَّ إعادة عملٍ ثانٍ، ولا حدثَ يصل المريض**");
    eq(trAfter.history, trBefore.history + 1, "ي٧. وسطرٌ واحدٌ في الخطّ الزمني");
    const trLine = ((await db.execute(sql`
      SELECT action_type, from_stage, to_stage, notes FROM prosthetic_work_history
       WHERE work_order_id = ${TR} ORDER BY id DESC LIMIT 1`)).rows[0]) as any;
    eq([trLine.action_type, trLine.from_stage, trLine.to_stage], ["hold_reason", "manufacturing", "manufacturing"],
      "ي٨. بنوعه الخاصّ «كتابة سبب التوقّف» — لا «تغيير حالة» لحالةٍ لم تتغيّر");
    ok(String(trLine.notes).includes(RWK) && String(trLine.notes).includes("السوكت القديم ضيّق"),
      "ي٩. ومعه السببُ والملاحظة", String(trLine.notes));
    eq(workHistoryMovementLabel(trLine.action_type, trLine.notes), "كتابة سبب التوقّف",
      "ي١٠. والمراجعةُ اليومية تسمّيه بالعربية لا برمزه الخام");

    const detTR2 = (await http("GET", `/api/manufacturing/orders/${TR}`, S.expert)).body;
    eq([heldExcuseOf(detTR2.order), orderLatenessNotice(detTR2.order), holdDialogKind(detTR2.order)],
      [RWK, null, null],
      "ي١١. فبطاقةُ «متوقّف» تقول سببَه، ولا تنبيهَ يكرّره، ولا زرَّ — كأيّ متوقّفٍ بسببه");
    const rowTR = await rowOf(TR);
    eq([latenessOf(rowTR), rowToneOf(rowTR).tone, rowToneOf(rowTR).reason?.note],
      ["late_excused", "amber", "السوكت القديم ضيّق"],
      "ي١٢. وصفُّه كهرمانيّ «متأخر بعذر» بسببه");

    //  ما كان مستحيلاً: لا مرحلةَ سابقة يُرجَع إليها.
    for (const [id, stage, label] of [
      [TM, "measurements", "ي١٣أ. في «القياسات» (لا مرحلةَ سابقة)"],
      [TX, "new_assignment", "ي١٣ب. صيانةٌ في أوّل مراحلها"],
    ] as const) {
      const before = await snap(id);
      r = await http("POST", `/api/manufacturing/orders/${id}/hold-reason`, S.expert,
        { status: "technical_rework", reasonCode: RWK });
      const after = await snap(id);
      eq([r.status, after.status, after.stage, after.reason, after.reworks, after.patientEvents],
        [200, "technical_rework", stage, RWK, before.reworks, before.patientEvents],
        `${label}: يُكتب السببُ ولا شيءَ غيره — وكان هذا مستحيلاً`);
    }

    console.log("\nي — وما يُردّ بلا كتابة");
    r = await http("POST", `/api/manufacturing/orders/${TR}/hold-reason`, S.expert,
      { status: "technical_rework", reasonCode: HOLD_REASONS.technical_rework[2].code });
    let tr3 = await snap(TR);
    eq([r.status, tr3.reason, tr3.note, tr3.history], [409, RWK, "السوكت القديم ضيّق", trAfter.history],
      "ي١٤. سببٌ مكتوبٌ سلفاً لا يُكتب فوقه (٤٠٩) — والأمرُ كما هو");
    ok(/«إلغاء التوقّف ومتابعة العمل» ثمّ «توقّف \/ مشكلة»/.test(String(r.body?.error)),
      "ي١٥. والرسالةُ تقول كيف يُغيَّر", String(r.body?.error));
    const rBefore = await snap(R);
    r = await http("POST", `/api/manufacturing/orders/${R}/hold-reason`, S.expert,
      { status: "waiting_materials", reasonCode: MAT });
    const rAfter = await snap(R);
    eq([r.status, rAfter.status, rAfter.reason, rAfter.history], [409, "active", null, rBefore.history],
      "ي١٦. والأمرُ العامل لا «توقّفَ قائماً» له — ٤٠٩ بلا كتابة");
    const tyBefore = await snap(TY);
    r = await http("POST", `/api/manufacturing/orders/${TY}/hold-reason`, S.expert,
      { status: "waiting_materials", reasonCode: MAT });
    eq([r.status, (await snap(TY)).reason, (await snap(TY)).status], [409, null, "technical_rework"],
      "ي١٧. ونوعٌ غيرُ نوعِه القائم (شاشةٌ بائتة) ⟶ ٤٠٩ ولا يتغيّر نوعُه");
    r = await http("POST", `/api/manufacturing/orders/${TY}/hold-reason`, S.expert,
      { status: "technical_rework", reasonCode: MAT });
    eq(r.status, 400, "ي١٨. وسببٌ لا يخصّ النوع ⟶ ٤٠٠");
    eq((await snap(TY)).history, tyBefore.history, "ي١٨أ. ولا سطرَ في خطّه الزمني من ذلك");
    r = await http("POST", `/api/manufacturing/orders/${W}/hold-reason`, S.expert,
      { status: "waiting_materials", reasonCode: MAT });
    eq(r.status, 409, "ي١٩. والمنتهي لا يُكتب عليه");
    const tzBefore = await snap(TZ);
    r = await http("POST", `/api/manufacturing/orders/${TZ}/hold-reason`, S.other,
      { status: "technical_rework", reasonCode: RWK });
    const tz0 = await snap(TZ);
    eq([r.status, tz0.reason, tz0.history], [403, null, tzBefore.history],
      "ي٢٠. وخبيرٌ غيرُ مسنَدٍ إليه ⟶ ٤٠٣ بلا كتابةٍ ولا سطر");

    //  الحكمُ الأخير **تحت القفل** لا في فحوص النقطة: لقطةٌ بائتة قبل أن يكتب
    //  كاتبٌ آخر، ثمّ نداءُ المخزن مباشرةً — فلا تحميه فحوصُ النقطة المبكّرة.
    const stale = await raw(TZ);
    r = await http("POST", `/api/manufacturing/orders/${TZ}/hold-reason`, S.manager,
      { status: "technical_rework", reasonCode: RWK, note: "كتبه المدير أوّلاً" });
    eq(r.status, 200, "ي٢١. كتب المديرُ السبب");
    let raced: unknown = null;
    try {
      await store.documentHoldReason({ order: stale, status: "technical_rework",
        reasonCode: HOLD_REASONS.technical_rework[3].code, note: "لقطة بائتة", performedBy: X,
        authority: { via: "assignment", expertUserId: X } });
    } catch (e) { raced = e; }
    const tz = await snap(TZ);
    eq([raced instanceof store.WorkOrderConflictError, tz.reason, tz.note, tz.history],
      [true, RWK, "كتبه المدير أوّلاً", tzBefore.history + 1],
      "ي٢٢. **وكاتبٌ بلقطةٍ بائتة يُردّ تحت القفل** — لا يُكتب فوق سببٍ كتبه غيرُه، ولا سطرَ ثانٍ");

    console.log("\nي — والسببُ المكتوبُ هكذا عذرٌ كسائر الأعذار");
    r = await http("POST", `/api/manufacturing/orders/${TR}/resume`, S.expert, {});
    tr3 = await snap(TR);
    eq([r.status, tr3.status, tr3.stage, tr3.reason], [200, "active", "manufacturing", RWK],
      "ي٢٣. استُؤنف العملُ في مرحلته نفسِها والعذرُ باقٍ");
    eq(latenessOf(await rowOf(TR)), "late_excused", "ي٢٤. فبقي «متأخر بعذر»");
    ov = (await http("GET", `/api/manufacturing/overview?branchId=${bE}`, S.admin)).body;
    //  الأحياءُ المتأخّرة: R وTY بلا عذر · وK وL وTR وTM وTX وTZ بعذر.
    eq([ov?.totals?.overdue, ov?.totals?.overdueExcused], [2, 6],
      "ي٢٥. واللوحة: اثنان بدون عذر (R · TY) · ستّةٌ بعذر");
  } finally {
    if (srv) await new Promise((res) => srv.close(() => res(null)));
    const idList = sql.join(ids.map((i) => sql`${i}`), sql`, `);
    const pList = sql.join(patientIds.map((i) => sql`${i}`), sql`, `);
    //  أحداثُ المريض وخبرُها تشير إلى المريض، فتُحذف قبله (كما في events.test).
    await db.execute(sql`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${pList})`);
    await db.execute(sql`DELETE FROM patient_events WHERE patient_id IN (${pList})`);
    await db.execute(sql`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_history WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id IN (${idList})`);
    await db.execute(sql`DELETE FROM patients WHERE id IN (${pList})`);
    //  سطورُ التدقيق التي كتبتها نقاطُ الموعد والإلغاء تشير إلى مستخدمي الاختبار.
    const uList = sql.join(userIds.map((i) => sql`${i}`), sql`, `);
    await db.execute(sql`DELETE FROM audit_log WHERE user_id IN (${uList})`);
    await db.execute(sql`DELETE FROM system_users WHERE id IN (${uList})`);
    await db.execute(sql`DELETE FROM branches WHERE id = ${bE}`);
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
