//  **الفرعُ المُتاحُ له الملفّ يرى عملَ صاحبه في لوحة التصنيع** (ترحيل ٠٨٠).
//
//  شكلُ العطب المُبلَّغ من الإنتاج: ملفٌّ مسجَّلٌ في ذي قار أُتيح لكربلاء
//  وأُسنِد خبيرُه إلى خبير كربلاء، **والعمليةُ بقيت في فرعها**. فرآه الخبيرُ
//  (قائمتُه ترشّح برقم الخبير بلا شرط فرع) ولم يرَه مديرُ كربلاء (لوحتُه
//  كانت ترشّح بفرع الأمر وحده)، بينما يفتح ملفَّه طبيعياً.
//
//  حيٌّ على Postgres وعلى `listOrders`/`getOverview` الحقيقيتين.
//  التشغيل: `DATABASE_URL=… npm run test:manufacturing-share`
import { db } from "../db";
import { sql } from "drizzle-orm";
import express from "express";
import { createServer } from "http";
import * as store from "./store";
import { registerRoutes } from "../routes";

const PORT = 5991 + (Date.now() % 7);
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

async function http(method: string, path: string, session: any) {
  const res = await fetch(BASE + path, {
    method,
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
const ok = (c: boolean, m: string) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m)); };

async function main() {
  let srv: any = null;
  const mgrIds: number[] = [];
  const t = Date.now() % 1000000;
  const one = async (q: any) => (await db.execute(q)).rows[0] as any;

  const bA = await one(sql`INSERT INTO branches (name) VALUES (${"فرع تسجيل " + t}) RETURNING id`);
  const bB = await one(sql`INSERT INTO branches (name) VALUES (${"فرع مُتاح " + t}) RETURNING id`);
  const bC = await one(sql`INSERT INTO branches (name) VALUES (${"فرع ثالث " + t}) RETURNING id`);
  const ex = await one(sql`
    INSERT INTO system_users (username, password_hash, display_name, role, branch_id, is_active)
    VALUES (${"exp" + t}, 'x', ${"خبير " + t}, 'prosthetics_expert', ${bB.id}, true) RETURNING id`);
  const p = await one(sql`
    INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
    VALUES (${"مريض مشترك " + t}, ${"0770" + t}, ${bA.id}, true, 'اختبار', 40, 'بتر') RETURNING id`);
  const wo = await one(sql`
    INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage)
    VALUES (${p.id}, ${bA.id}, 'prosthetic', 'initial_build', ${ex.id}, 'in_progress', 'measurement') RETURNING id`);

  const seen = async (scope: number[]) =>
    (await store.listOrders({ branchIds: scope } as any)).some((o: any) => o.id === Number(wo.id));

  try {
    console.log("\nأ — قبل الإتاحة");
    ok(await seen([Number(bA.id)]), "مديرُ فرع التسجيل يرى الأمر");
    ok(!(await seen([Number(bB.id)])), "ومديرُ الفرع الآخر لا يراه");
    ok((await store.listOrders({ expertUserId: Number(ex.id) } as any))
      .some((o: any) => o.id === Number(wo.id)), "والخبيرُ يراه بلا شرط فرع — شكلُ العطب");

    await db.execute(sql`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES (${p.id}, ${bB.id})`);

    console.log("\nب — بعد إتاحة الملفّ، والعمليةُ باقيةٌ في فرعها");
    ok(await seen([Number(bB.id)]), "مديرُ الفرع المُتاح صار يرى الأمر");
    ok(await seen([Number(bA.id)]), "ومديرُ فرع التسجيل ما زال يراه — الشرطُ اتّحادٌ لا استبدال");
    const row = await one(sql`SELECT branch_id FROM prosthetic_work_orders WHERE id = ${wo.id}`);
    ok(Number(row.branch_id) === Number(bA.id), "وفرعُ الأمر لم يتغيّر — النسبةُ للتقارير كما هي");
    const ov = await store.getOverview({ branchIds: [Number(bB.id)] } as any);
    ok(JSON.stringify(ov).includes(String(wo.id)) || JSON.stringify(ov).includes("خبير " + t),
      "ولوحةُ سير العمل تعدّه — نفسُ شرط القائمة");

    //  ══ شكوى المالك ٢٠٢٦-٠٩-٢٢: «ظهر في قائمة التصنيع ولكن حين يدخل عليه
    //  يظهر له لا يمكنك رؤية الملف» — نصفُ إصلاحٍ أسوأُ من غيابه.
    console.log("\nج — وصفحةُ الأمر تُفتَح فعلاً");
    const mkMgr = async (branch: number, label: string) => Number((await one(sql`
      INSERT INTO system_users (username, password_hash, display_name, role,
                                branch_id, branch_ids, is_active, can_view_patients)
      VALUES (${"mgr" + t + "_" + branch}, 'x', ${label + " " + t}, 'branch_manager',
              ${branch}, ${JSON.stringify([branch])}::jsonb, true, true)
      RETURNING id`)).id);
    const mA = await mkMgr(Number(bA.id), "مدير التسجيل");
    const mB = await mkMgr(Number(bB.id), "مدير المُتاح");
    const mC = await mkMgr(Number(bC.id), "مدير ثالث");
    mgrIds.push(mA, mB, mC);
    const mgr = (userId: number, branch: number) => ({
      userId, role: "branch_manager", branchId: branch,
      accessibleBranches: [branch], displayName: "مدير", isAdmin: false,
      permissions: { canViewPatients: true },
    });
    srv = await bootRealRoutes();
    const openAs = async (userId: number, branch: number) =>
      (await http("GET", `/api/manufacturing/orders/${wo.id}`, mgr(userId, branch))).status;

    ok(await openAs(mA, Number(bA.id)) === 200, "مديرُ فرع التسجيل يفتح صفحةَ الأمر");
    ok(await openAs(mB, Number(bB.id)) === 200, "ومديرُ الفرع المُتاح يفتحها — شكوى المالك");
    ok(await openAs(mC, Number(bC.id)) === 403, "وفرعٌ ثالث بلا إتاحة يُردّ ٤٠٣");

    console.log("\nد — والعزلُ لم يضعف");
    ok(!(await seen([Number(bC.id)])), "فرعٌ ثالث بلا إتاحة لا يراه في القائمة");
    await db.execute(sql`DELETE FROM patient_branch_access WHERE patient_id = ${p.id}`);
    ok(!(await seen([Number(bB.id)])), "وسحبُ الإتاحة يُخفيه ثانيةً");
    ok(await openAs(mB, Number(bB.id)) === 403, "ويُغلق صفحةَ الأمر معه");
    ok(await openAs(mA, Number(bA.id)) === 200, "وفرعُ التسجيل يفتحها كما كان");
  } finally {
    if (srv) await new Promise((r) => srv.close(() => r(null)));
    await db.execute(sql`DELETE FROM patient_branch_access WHERE patient_id = ${p.id}`);
    await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id = ${wo.id}`);
    await db.execute(sql`DELETE FROM patients WHERE id = ${p.id}`);
    await db.execute(sql`DELETE FROM system_users WHERE id = ${ex.id}`);
    if (mgrIds.length > 0) {
      await db.execute(sql`DELETE FROM system_users WHERE id IN (${sql.join(mgrIds.map((i) => sql`${i}`), sql`, `)})`);
    }
    await db.execute(sql`DELETE FROM branches WHERE id IN (${bA.id}, ${bB.id}, ${bC.id})`);
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
