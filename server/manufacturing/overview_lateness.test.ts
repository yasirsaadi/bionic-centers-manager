//  **«متأخرةٌ بدون عذر» و«متأخرةٌ بعذر» — لوحةُ الأداء والشرائطُ برقمٍ واحد**
//  (قرارُ المالك ٢٠٢٦-٠٩-٢٤).
//
//  شكوى المالك من شاشة هاتف: ضغط «متأخرون ١٨» فخرجت بطاقاتٌ كهرمانيّة كتب
//  خبراؤها عذرَها («بانتظار المريض — المريض لن يعمل الإجراءات المالية»).
//  وقرارُه: «لا تحسبهم متأخرون، وإنما نقول عنهم متأخرون بعذر، فلا يُعرَضون
//  بالمتأخرون بدون عذر. الأحمرُ فقط وفقط لمن متأخرٌ وليس لديه عذر.»
//
//  والرقمُ نفسُه كان يُعدّ في ثلاثة مواضعَ أخرى على الشاشة ذاتها من الخادم
//  (مربّعُ «متأخرة» · عمودُ الخبراء · سطرُ الفروع)، فانقسمت كلُّها على
//  التعريف المشترك `latenessOf` — وهذا الاختبارُ يثبت أن **المربّعَ والشريطَ
//  يقولان الرقمَ نفسَه** من النقطتين الحقيقيتين، وأن لا صفَّ يضيع.
//
//  حيٌّ على Postgres وعلى `getOverview`/`listOrders` والنقطتين الحقيقيتين.
//  التشغيل: `DATABASE_URL=… npm run test:manufacturing-overview-lateness`
import { db } from "../db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import * as store from "./store";
import { registerRoutes } from "../routes";
import { latenessOf } from "@shared/manufacturing";
import { bucketCounts, ordersInBucket } from "../../client/src/pages/manufacturing_buckets";
import { rowToneOf } from "../../client/src/pages/manufacturing_row_tone";

const PORT = 6011 + (Date.now() % 7);
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

async function http(path: string, session: any) {
  const res = await fetch(BASE + path, {
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
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
const FUTURE = "2099-12-31";

async function main() {
  let srv: any = null;
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;
  const ids: number[] = [];
  const userIds: number[] = [];
  const patientIds: number[] = [];

  const bA = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع أ " + t}) RETURNING id`)).id);
  const bB = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع ب " + t}) RETURNING id`)).id);
  const mkUser = async (role: string, branch: number, name: string) => {
    const id = Number((await one(sql`
      INSERT INTO system_users (username, password_hash, display_name, role, branch_id, branch_ids,
                                is_active, can_view_patients)
      VALUES (${role + "_" + name.length + "_" + t + "_" + userIds.length}, 'x', ${name + " " + t}, ${role},
              ${branch}, ${JSON.stringify([branch])}::jsonb, true, true)
      RETURNING id`)).id);
    userIds.push(id);
    return id;
  };
  const X = await mkUser("prosthetics_expert", bA, "عناد");
  const Y = await mkUser("prosthetics_expert", bA, "محمد باقر");
  const Z = await mkUser("prosthetics_expert", bB, "خبير الفرع الآخر");
  const mgrA = await mkUser("branch_manager", bA, "مدير أ");
  const mgrB = await mkUser("branch_manager", bB, "مدير ب");

  const mkPatient = async (branch: number, name: string) => {
    const id = Number((await one(sql`
      INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
      VALUES (${name + " " + t}, ${"0771" + t + patientIds.length}, ${branch}, true, 'اختبار', 40, 'بتر')
      RETURNING id`)).id);
    patientIds.push(id);
    return id;
  };
  //  مريضٌ لكلّ أمر — كما في اللوحة الحقيقية، ولأن القاعدةَ تمنع بناءين
  //  مفتوحين لمريضٍ واحد (`uq_pwo_one_open_legacy_build`).
  const mkOrder = async (o: {
    name: string; branch: number; expert: number; status: string; stage: string;
    due: string | null; reason?: string | null; note?: string | null; completed?: boolean;
  }) => {
    const patient = await mkPatient(o.branch, o.name);
    const id = Number((await one(sql`
      INSERT INTO prosthetic_work_orders
        (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage,
         expected_delivery_date, hold_reason_code, hold_note, completed_at)
      VALUES (${patient}, ${o.branch}, 'prosthetic', 'initial_build', ${o.expert}, ${o.status},
              ${o.stage}, ${o.due}, ${o.reason ?? null}, ${o.note ?? null},
              ${o.completed ? sql`NOW()` : sql`NULL`})
      RETURNING id`)).id);
    ids.push(id);
    return id;
  };

  //  ══ العيّنة — فرعُ أ ════════════════════════════════════════════════════
  const o1 = await mkOrder({ name: "متأخر بلا عذر", branch: bA, expert: X, status: "active", stage: "manufacturing", due: PAST });
  //  شكلُ صورة المالك بعينه: جاهزٌ للتجربة، بانتظار المريض، ومتأخّر — بعذرٍ مكتوب.
  const o2 = await mkOrder({
    name: "علي عبد الهادي مكي", branch: bA, expert: X, status: "waiting_patient", stage: "ready_for_fitting", due: PAST,
    reason: "patient_return_required", note: "المريض لن يعمل الاجراءات المالية",
  });
  const o3 = await mkOrder({
    name: "متوقّف في موعده", branch: bA, expert: X, status: "waiting_materials", stage: "mold", due: FUTURE,
    reason: "component_delay",
  });
  const o4 = await mkOrder({
    name: "إعادة عمل متأخرة", branch: bA, expert: Y, status: "technical_rework", stage: "manufacturing", due: PAST,
    reason: "socket_fit",
  });
  //  بياضٌ وحده **ليس عذراً** — لا يُقرأ عذراً ملفَّقاً.
  const o5 = await mkOrder({ name: "بياض لا عذر", branch: bA, expert: Y, status: "active", stage: "mold", due: PAST, reason: "   " });
  const o6 = await mkOrder({ name: "مكتمل", branch: bA, expert: Y, status: "completed", stage: "delivered", due: PAST, completed: true });
  const o7 = await mkOrder({ name: "ملغى", branch: bA, expert: Y, status: "cancelled", stage: "manufacturing", due: PAST });
  const o8 = await mkOrder({ name: "بلا موعد", branch: bA, expert: X, status: "active", stage: "order_received", due: null });
  //  ══ فرعُ ب — خارج نطاق أ ══════════════════════════════════════════════
  const o9 = await mkOrder({ name: "مريض الفرع الآخر", branch: bB, expert: Z, status: "active", stage: "manufacturing", due: PAST });
  void o3; void o6; void o7; void o8;

  const MONTH = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }).slice(0, 7);
  const expertOf = (ov: any, id: number) => ov.experts.find((e: any) => e.expertUserId === id);
  const branchOf = (ov: any, id: number) => ov.branches.find((b: any) => b.branchId === id);
  const chipOf = (rows: any[], key: string) =>
    bucketCounts(rows, MONTH).find((c) => c.def.key === key)?.count ?? -1;

  try {
    console.log("\nأ — لوحةُ الأداء: الأحمرُ بدون عذرٍ وحدَه، والكهرمانيُّ بعذر");
    const ov = await store.getOverview({ branchIds: [bA] });
    eq(ov.totals.overdue, 2, "أ١. «متأخرة بدون عذر» = اثنان (لا عذر · وبياضٌ ليس عذراً)");
    eq(ov.totals.overdueExcused, 2, "أ٢. «متأخرة بعذر» = اثنان (بانتظار المريض · إعادة عمل فني)");
    const oldCount = Number((await one(sql`
      SELECT count(*)::int AS n FROM prosthetic_work_orders
       WHERE branch_id = ${bA} AND expected_delivery_date IS NOT NULL
         AND expected_delivery_date < (NOW() AT TIME ZONE 'Asia/Baghdad')::date
         AND status NOT IN ('completed','cancelled')`)).n);
    eq(ov.totals.overdue + ov.totals.overdueExcused, oldCount,
      "أ٣. **ولا صفَّ يضيع**: مجموعُهما ما كان «متأخرة» يعدّه قبلها بالضبط");
    eq(oldCount, 4, "أ٣ب. وذاك الرقمُ القديم أربعة — فالانقسامُ حقيقيٌّ لا صوريّ");
    eq([expertOf(ov, X)?.overdue, expertOf(ov, X)?.overdueExcused], [1, 1],
      "أ٤. عمودُ الخبير «عناد»: واحدٌ بدون عذر · واحدٌ بعذر");
    eq([expertOf(ov, Y)?.overdue, expertOf(ov, Y)?.overdueExcused], [1, 1],
      "أ٥. وخبيرٌ آخر كذلك — والبياضُ عنده يُعدّ بدون عذر");
    eq([branchOf(ov, bA)?.overdue, branchOf(ov, bA)?.overdueExcused], [2, 2],
      "أ٦. وسطرُ الفرع يقسم الاثنين كالمربّع");
    ok(!branchOf(ov, bB), "أ٧. وفرعٌ خارج النطاق لا يدخل الحساب");
    eq([ov.totals.ready, ov.totals.completed, ov.totals.total], [1, 1, 8],
      "أ٨. وبقيّةُ المربّعات لم يتحرّك منها رقم");

    console.log("\nب — الشريطُ والمربّعُ من تعريفٍ واحد");
    const rows = await store.listOrders({ branchIds: [bA] } as any);
    eq(rows.filter((r) => latenessOf(r) === "late").length, ov.totals.overdue,
      "ب١. القائمةُ بالتعريف المشترك = المربّعُ الأحمر");
    eq(chipOf(rows, "overdue"), ov.totals.overdue,
      "ب٢. **وشريطُ «متأخرون بدون عذر» = مربّعُ «متأخرة بدون عذر»**");
    eq(chipOf(rows, "overdue_excused"), ov.totals.overdueExcused,
      "ب٣. وشريطُ «متأخرون بعذر» = مربّعُ «متأخرة بعذر»");
    const red = new Set(ordersInBucket(rows, "overdue", MONTH).map((r) => r.id));
    eq([...red].sort((a, b) => a - b), [o1, o5].sort((a, b) => a - b),
      "ب٤. والأحمرُ يعرض بعينه: بدون عذر، وبياضٌ ليس عذراً");
    ok(rows.every((r) => red.has(r.id) === (rowToneOf(r).tone === "red")),
      "ب٥. **«الأحمرُ فقط وفقط»**: صفٌّ في الشريط الأحمر ⟺ بطاقتُه حمراء");
    const s2 = rows.find((r) => r.id === o2)!;
    ok(!red.has(o2) && ordersInBucket(rows, "overdue_excused", MONTH).some((r) => r.id === o2),
      "ب٦. **وصفُّ صورة المالك** خارج الأحمر، داخل «متأخرون بعذر»");
    const t2 = rowToneOf(s2);
    eq([t2.tone, t2.overdueBadgeLabel, t2.reason?.label, t2.reason?.note],
      ["amber", "متأخر بعذر", "يحتاج مراجعة المريض", "المريض لن يعمل الاجراءات المالية"],
      "ب٧. وبطاقتُه كهرمانيّة، وشارتُه «متأخر بعذر»، وسببُه كاملاً");
    eq(rowToneOf(rows.find((r) => r.id === o1)!).overdueBadgeLabel, "متأخر بدون عذر",
      "ب٨. والأحمرُ يقول «متأخر بدون عذر» صراحةً");

    console.log("\nج — النقطتان الحقيقيتان");
    srv = await bootRealRoutes();
    const admin = { userId: 0, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} };
    const mgr = (userId: number, branch: number) => ({
      userId, role: "branch_manager", isAdmin: false, branchId: branch,
      accessibleBranches: [branch], displayName: "مدير", permissions: { canViewPatients: true },
    });
    const ovAdmin = await http(`/api/manufacturing/overview?branchId=${bA}`, admin);
    eq([ovAdmin.status, ovAdmin.body?.totals?.overdue, ovAdmin.body?.totals?.overdueExcused], [200, 2, 2],
      "ج١. المسؤولُ يقرأ المربّعين من النقطة: ٢ بدون عذر · ٢ بعذر");
    const ovMgr = await http(`/api/manufacturing/overview`, mgr(mgrA, bA));
    eq([ovMgr.status, ovMgr.body?.totals?.overdue, ovMgr.body?.totals?.overdueExcused], [200, 2, 2],
      "ج٢. ومديرُ الفرع بنطاق جلسته: الرقمان أنفسُهما");
    const listAdmin = await http(`/api/manufacturing/orders?branchId=${bA}`, admin);
    ok(listAdmin.status === 200 && Array.isArray(listAdmin.body), "ج٣. والقائمةُ تُقرأ من نقطتها");
    eq([chipOf(listAdmin.body, "overdue"), chipOf(listAdmin.body, "overdue_excused")],
      [ovAdmin.body?.totals?.overdue, ovAdmin.body?.totals?.overdueExcused],
      "ج٤. **وما تعدّه الشاشةُ من القائمة = ما يعدّه الخادمُ في المربّع** — من النقطتين");
    const ovB = await http(`/api/manufacturing/overview`, mgr(mgrB, bB));
    eq([ovB.status, ovB.body?.totals?.overdue, ovB.body?.totals?.overdueExcused], [200, 1, 0],
      "ج٥. والعزلُ لم يضعف: مديرُ الفرع الآخر يرى متأخّرَه وحده");
    void o9;

    console.log("\nد — العذرُ يُكتب فيتحوّل الصفّ، والاستئنافُ لا يُسقطه");
    //  **انقلب هذا العقدُ بقرار المالك (٢٠٢٦-٠٩-٢٤)**: كان الاستئنافُ يُصفّر
    //  العذرَ فيعود الأمرُ أحمر («لا يضيع عذرٌ مهما كان»). والآن يبقى.
    const before2 = await store.getRawOrder(o2);
    await store.resumeOrder({ order: before2!, performedBy: null, authority: { via: "role" } });
    const after2 = await store.getRawOrder(o2);
    eq([after2?.status, after2?.holdReasonCode, after2?.holdNote],
      ["active", before2?.holdReasonCode, before2?.holdNote],
      "د١. استُؤنف أمرُ صورة المالك فعاد يعمل **وعذرُه باقٍ بحرفه**");
    const ov2 = await store.getOverview({ branchIds: [bA] });
    eq([ov2.totals.overdue, ov2.totals.overdueExcused], [2, 2],
      "د١أ. فالمربّعان لم يتحرّكا: ٢ بدون عذر · ٢ بعذر");
    //  والتوقّفُ بالكاتب القانونيّ يكتب العذر ⟶ صار «متأخراً بعذر».
    await store.holdOrder({
      order: (await store.getRawOrder(o1))!, status: "waiting_materials",
      reasonCode: "component_delay", note: "المفصل من تركيا", performedBy: null,
      authority: { via: "role" },
    });
    const ov3 = await store.getOverview({ branchIds: [bA] });
    eq([ov3.totals.overdue, ov3.totals.overdueExcused], [1, 3],
      "د٢. وكتب الخبيرُ عذراً لأمرٍ آخر ⟶ انتقل من الأحمر إلى الكهرمانيّ");
    const rows3 = await store.listOrders({ branchIds: [bA] } as any);
    eq([chipOf(rows3, "overdue"), chipOf(rows3, "overdue_excused")], [1, 3],
      "د٣. والشريطان يتبعان المربّعين في كلّ لحظة");
    eq(ov3.totals.overdue + ov3.totals.overdueExcused, oldCount,
      "د٤. والمجموعُ لا يتحرّك — التأخّرُ واقعٌ، والعذرُ وحدَه يُصنّفه");
  } finally {
    if (srv) await new Promise((r) => srv.close(() => r(null)));
    const idList = sql.join(ids.map((i) => sql`${i}`), sql`, `);
    await db.execute(sql`DELETE FROM prosthetic_work_history WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id IN (${idList})`);
    await db.execute(sql`DELETE FROM patients WHERE id IN (${sql.join(patientIds.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM system_users WHERE id IN (${sql.join(userIds.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM branches WHERE id IN (${bA}, ${bB})`);
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
