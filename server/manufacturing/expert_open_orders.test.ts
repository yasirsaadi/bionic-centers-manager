//  **الحالاتُ غيرُ المكتملة لكلّ خبير** (§4.gc — طلبُ المالك ٢٠٢٦-١١-٠٨: «مستقبلاً لا حاجةَ لنيون»).
//
//  عمودُ «قيد العمل» في «مقارنة الخبراء» صار مقسوماً (بعذر · بلا موعد · راكدة)، وورقةُ الطباعة تقرأ القائمةَ نفسَها وتعدّ بالقاعدة
//  نفسِها (`shared/expert_open_orders.ts`). يثبت هذا الاختبار: القاعدةَ بحدودها (٢٠ يوماً ليست راكدة و٢١ راكدة، والبياضُ ليس عذراً،
//  ويومُ بغداد لا يوم UTC)، وأن الجدولَ من `getOverview` والورقةَ من القائمة يقولان الأرقامَ نفسَها، وأن `active` = `open.open`،
//  وأن القائمةَ تحمل رمزَ المريض، وأن مديرَ فرعٍ آخر لا يقرأ قائمةَ هذا الفرع.
//
//  حيٌّ على Postgres والنقاط الحقيقية. التشغيل: `DATABASE_URL=… npm run test:expert-open-orders`
import { db } from "../db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import * as store from "./store";
import { registerRoutes } from "../routes";
import {
  baghdadDayOf, classifyOpenOrder, summarizeOpenOrders, STALE_NO_DATE_DAYS,
} from "@shared/expert_open_orders";

const PORT = 6031 + (Date.now() % 7);
const BASE = `http://127.0.0.1:${PORT}`;

async function bootRealRoutes() {
  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));
  return httpServer;
}

async function http(path: string, session: any) {
  const res = await fetch(BASE + path, {
    headers: { "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

let pass = 0, fail = 0;
const ok = (c: boolean, m: string, detail = "") => {
  if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m + (detail ? `\n      ${detail}` : "")); }
};
const eq = (got: unknown, want: unknown, m: string) =>
  ok(JSON.stringify(got) === JSON.stringify(want), m, `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);

async function main() {
  console.log("\nأ — القاعدةُ وحدها");
  const T = "2026-11-08";
  const at = (daysAgo: number) => new Date(Date.UTC(2026, 10, 8 - daysAgo, 9)).toISOString();
  const c = (o: Partial<Parameters<typeof classifyOpenOrder>[0]>) =>
    classifyOpenOrder({ status: "active", expectedDeliveryDate: null, holdReasonCode: null, assignedAt: at(0), ...o }, T);
  eq([c({ status: "completed" }), c({ status: "cancelled" })], [null, null], "أ١. المكتملُ والملغى ليسا «غير مكتملة»");
  eq([c({ assignedAt: at(STALE_NO_DATE_DAYS - 1) })!.stale, c({ assignedAt: at(STALE_NO_DATE_DAYS) })!.stale], [false, true],
    `أ٢. **الحدّ**: ${STALE_NO_DATE_DAYS - 1} يوماً بلا موعدٍ ولا عذر ليست راكدة، و${STALE_NO_DATE_DAYS} راكدة`);
  eq([c({ holdReasonCode: "   ", assignedAt: at(40) })!.excused, c({ holdReasonCode: "   ", assignedAt: at(40) })!.stale], [false, true],
    "أ٣. البياضُ وحده ليس عذراً — فهي بلا عذرٍ وراكدة");
  eq([c({ holdReasonCode: "other", assignedAt: at(60) })!.excused, c({ holdReasonCode: "other", assignedAt: at(60) })!.stale], [true, false],
    "أ٤. والمكتوبُ عذرٌ — فلا تُعدّ راكدةً ولو طال الانتظار");
  const late = c({ expectedDeliveryDate: "2026-10-06", holdReasonCode: "trial_socket" })!;
  eq([late.late, late.daysToDue, late.noDate, late.stale], [true, -33, false, false], "أ٥. فات موعدُها منذ ٣٣ يوماً (مثالُ هيام) — ولها موعدٌ فليست راكدة");
  eq(c({ expectedDeliveryDate: "2026-11-08" })!.late, false, "أ٦. موعدُها اليوم ليس فائتاً");
  eq(baghdadDayOf("2026-11-07T22:30:00.000Z"), "2026-11-08", "أ٧. **يومُ بغداد لا يومُ UTC**: ٢٢:٣٠ بتوقيت غرينتش = صباحُ الغد في بغداد");
  eq(c({ assignedAt: "2026-10-18T22:30:00.000Z" })!.daysSinceAssigned, 20, "أ٨. وأيّامُ الإسناد بتقويم بغداد (١٩ أكتوبر ⟵ ٨ نوفمبر = ٢٠)");

  console.log("\nب — الجدولُ من `getOverview` والورقةُ من القائمة");
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;
  const ids: number[] = [], userIds: number[] = [], patientIds: number[] = [];
  const bA = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع أ " + t}) RETURNING id`)).id);
  const bB = Number((await one(sql`INSERT INTO branches (name) VALUES (${"فرع ب " + t}) RETURNING id`)).id);
  const mkUser = async (role: string, branch: number, name: string) => {
    const id = Number((await one(sql`
      INSERT INTO system_users (username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_view_patients)
      VALUES (${role + "_" + t + "_" + userIds.length}, 'x', ${name + " " + t}, ${role}, ${branch}, ${JSON.stringify([branch])}::jsonb, true, true)
      RETURNING id`)).id);
    userIds.push(id);
    return id;
  };
  const X = await mkUser("prosthetics_expert", bA, "أيوب");
  const Y = await mkUser("prosthetics_expert", bB, "خبير ب");
  const mgrA = await mkUser("branch_manager", bA, "مدير أ");
  const mgrB = await mkUser("branch_manager", bB, "مدير ب");
  const mkOrder = async (o: { expert: number; branch: number; status: string; stage: string; due: string | null;
    reason?: string | null; note?: string | null; daysAgo: number; purpose?: string }) => {
    const patient = Number((await one(sql`
      INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
      VALUES (${"مريض " + t + " " + patientIds.length}, ${"0772" + t + patientIds.length}, ${o.branch}, true, 'اختبار', 40, 'بتر')
      RETURNING id`)).id);
    patientIds.push(patient);
    const id = Number((await one(sql`
      INSERT INTO prosthetic_work_orders
        (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage, expected_delivery_date,
         hold_reason_code, hold_note, created_at, completed_at)
      VALUES (${patient}, ${o.branch}, 'prosthetic', ${o.purpose ?? "initial_build"}, ${o.expert}, ${o.status}, ${o.stage}, ${o.due},
              ${o.reason ?? null}, ${o.note ?? null}, NOW() - (${o.daysAgo} || ' days')::interval,
              ${o.status === "completed" ? sql`NOW()` : sql`NULL`})
      RETURNING id`)).id);
    ids.push(id);
    return id;
  };
  await mkOrder({ expert: X, branch: bA, status: "active", stage: "order_received", due: null, daysAgo: 30 });
  await mkOrder({ expert: X, branch: bA, status: "active", stage: "order_received", due: null, daysAgo: 20 });
  await mkOrder({ expert: X, branch: bA, status: "active", stage: "measurements", due: null, daysAgo: 21 });
  await mkOrder({ expert: X, branch: bA, status: "medical_hold", stage: "order_received", due: null, daysAgo: 60, reason: "other", note: "تراجع دكتور اعصاب" });
  await mkOrder({ expert: X, branch: bA, status: "waiting_patient", stage: "ready_for_fitting", due: "2020-01-15", daysAgo: 64, reason: "patient_return_required" });
  await mkOrder({ expert: X, branch: bA, status: "active", stage: "manufacturing", due: "2099-12-31", daysAgo: 80 });
  await mkOrder({ expert: X, branch: bA, status: "active", stage: "new_assignment", due: null, daysAgo: 40, reason: "   ", purpose: "maintenance" });
  await mkOrder({ expert: X, branch: bA, status: "completed", stage: "delivered", due: "2020-01-15", daysAgo: 90 });
  await mkOrder({ expert: X, branch: bA, status: "cancelled", stage: "manufacturing", due: null, daysAgo: 90 });
  await mkOrder({ expert: Y, branch: bB, status: "active", stage: "order_received", due: null, daysAgo: 50 });
  const WANT = { open: 7, excused: 2, unexcused: 5, noDate: 5, late: 1, stale: 3 };

  let srv: any = null;
  try {
    const ov = await store.getOverview({ branchIds: [bA] });
    const ex = ov.experts.find((e: any) => e.expertUserId === X) as any;
    eq(ex?.open, WANT, "ب١. عمودُ أيوب: ٧ غير مكتملة · ٢ بعذر · ٥ بلا عذر · ٥ بلا موعد · ١ فات موعدها · ٣ راكدة");
    eq(ex?.open?.open, ex?.active, "ب٢. و«قيد العمل» القديم = مجموعُ غير المكتملة — لا رقمان للشيء نفسِه");
    ok(!ov.experts.some((e: any) => e.expertUserId === Y), "ب٣. وخبيرُ الفرع الآخر خارج لوحة فرع أ");

    srv = await bootRealRoutes();
    const admin = { userId: 0, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} };
    const mgr = (userId: number, branch: number) => ({
      userId, role: "branch_manager", isAdmin: false, branchId: branch,
      accessibleBranches: [branch], displayName: "مدير", permissions: { canViewPatients: true },
    });
    const ovHttp = await http(`/api/manufacturing/overview`, mgr(mgrA, bA));
    eq([ovHttp.status, ovHttp.body?.experts?.find((e: any) => e.expertUserId === X)?.open], [200, WANT],
      "ب٤. ومن النقطة الحقيقية بجلسة مدير الفرع: الأرقامُ نفسُها");
    //  ما تقرؤه ورقةُ الطباعة بعينه: `/api/manufacturing/orders?expertUserId=&branchId=` ثمّ `summarizeOpenOrders`.
    const list = await http(`/api/manufacturing/orders?expertUserId=${X}&branchId=${bA}`, admin);
    const sheet = summarizeOpenOrders((list.body ?? []).map((r: any) => ({
      status: r.status, expectedDeliveryDate: r.expectedDeliveryDate, holdReasonCode: r.holdReasonCode, assignedAt: r.assignedAt,
    })), new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }));
    eq([list.status, sheet], [200, WANT], "ب٥. **والورقةُ من القائمة = الجدولُ من اللوحة** — رقماً برقم");
    const codes = (list.body ?? []).map((r: any) => r.patientCode);
    ok(codes.length === 9 && codes.every((x: any) => typeof x === "string" && x.length > 0),
      "ب٦. والقائمةُ تحمل رمزَ المريض لكلّ صفّ", JSON.stringify(codes));
    const foreign = await http(`/api/manufacturing/orders?expertUserId=${X}&branchId=${bA}`, mgr(mgrB, bB));
    eq(foreign.status, 403, "ب٧. ومديرُ الفرع الآخر لا يقرأ قائمةَ هذا الفرع");
  } finally {
    if (srv) srv.close();
    const idList = sql.join(ids.map((i) => sql`${i}`), sql`, `);
    await db.execute(sql`DELETE FROM prosthetic_work_history WHERE work_order_id IN (${idList})`);
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id IN (${idList})`);
    await db.execute(sql`DELETE FROM patients WHERE id IN (${sql.join(patientIds.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM system_users WHERE id IN (${sql.join(userIds.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM branches WHERE id IN (${bA}, ${bB})`);
  }
  console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} نجح · ${fail} فشل`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
