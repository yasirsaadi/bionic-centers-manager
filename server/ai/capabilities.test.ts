//  ══ قدراتُ القراءة — حيّاً على Postgres وعلى النقاط الحقيقية ════════════
//
//  الثابتُ المُختبَر: **المساعد يرى ما يراه السائل، لا أكثر ولا أقلّ** —
//  وذلك بلا سطرِ صلاحيةٍ واحدٍ مكتوبٍ في طبقة المساعد.
//
//  التشغيل: `DATABASE_URL=… npm run test:ai-capabilities`
import express from "express";
import { createServer } from "http";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { registerRoutes } from "../routes";
import { buildCatalog, BLOCKED, DESCRIBED } from "./capabilities/catalog";
import { executeTool } from "./tools/registry";
import { resolveAiAccess } from "./access";

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? (pass++, console.log("  ✓ " + m)) : (fail++, console.log("  ✗ " + m)); };
const same = (m: string, a: unknown, b: unknown) =>
  ok(JSON.stringify(a) === JSON.stringify(b), `${m} — ${JSON.stringify(a)}`);

const one = async (q: any) => (await db.execute(q)).rows[0] as any;
const t = Date.now() % 1000000;

//  ══ جلساتٌ حقيقيةُ الشكل — تمرّ بوسيط «تحديث الصلاحيات حيّاً» كما يمرّ
//  طلبُ المتصفّح، فتُعاد قراءةُ أعلامها من صفّ المستخدم في القاعدة.
//  **`destroy` تُسجَّل لا تُبتلَع**: نداءُ `/api/logout` يُنهي الجلسة
//  فعلاً في الإنتاج، ومصيدةٌ صامتة كانت ستجعل فحصَ «الجلسةُ لم تُمَسّ»
//  يمرّ لسببٍ خاطئ — يُردّ النداءُ لأنه إعادةُ توجيهٍ لا لأنه مُنع.
function session(u: any) {
  const s: any = { branchSession: u, destroyed: false };
  s.destroy = (cb: any) => { s.destroyed = true; if (cb) cb(); return s; };
  return s;
}
const access = (u: any, branchId: number | null, branchName: string | null = null) =>
  resolveAiAccess({ session: u, branchName, scopeBranchId: branchId });

async function main() {
  let srv: any = null;
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);

  const ids: number[] = [];
  const bA = await one(sql`INSERT INTO branches (name) VALUES (${"فرع أ " + t}) RETURNING id`);
  const bB = await one(sql`INSERT INTO branches (name) VALUES (${"فرع ب " + t}) RETURNING id`);

  const mkUser = async (o: any) => Number((await one(sql`
    INSERT INTO system_users (username, password_hash, display_name, role, branch_id, branch_ids,
                              is_active, can_view_patients, can_manage_accounting, can_view_reports)
    VALUES (${o.username}, 'x', ${o.name}, ${o.role}, ${o.branch},
            ${JSON.stringify(o.branches ?? [o.branch])}::jsonb, true,
            ${o.viewPatients ?? false}, ${o.accounting ?? false}, ${o.reports ?? false})
    RETURNING id`)).id);

  const expX = await mkUser({ username: "cx" + t, name: "خبير ألف " + t, role: "prosthetics_expert", branch: bA.id });
  const expY = await mkUser({ username: "cy" + t, name: "خبير باء " + t, role: "prosthetics_expert", branch: bB.id });
  const mgrB = await mkUser({ username: "cm" + t, name: "مدير ب " + t, role: "branch_manager", branch: bB.id, viewPatients: true });
  const recB = await mkUser({ username: "cr" + t, name: "استقبال ب " + t, role: "reception", branch: bB.id, viewPatients: true });
  const bare = await mkUser({ username: "cb" + t, name: "بلا صلاحية " + t, role: "reception", branch: bB.id });
  ids.push(expX, expY, mgrB, recB, bare);

  const mkPatient = async (branch: number, n: string) => Number((await one(sql`
    INSERT INTO patients (name, phone, branch_id, is_amputee, referral_source, age, medical_condition)
    VALUES (${n}, ${"0770" + Math.floor(Math.random() * 1e6)}, ${branch}, true, 'اختبار', 40, 'بتر')
    RETURNING id`)).id);
  const patients: number[] = [];

  const day = (offset: number) => {
    const d = new Date(Date.now() + offset * 86_400_000);
    return d.toISOString().slice(0, 10);
  };
  const orders: number[] = [];
  //  **مريضٌ لكلّ أمر**: `uq_pwo_one_open_legacy_build` يمنع أمرَي بناءٍ
  //  مفتوحين لمريضٍ وخدمةٍ واحدة (٠٧٣)، وهو حارسٌ صحيح لا يُلتَفّ عليه.
  const mkOrder = async (branch: number, expert: number, due: string, hold?: string) => {
    const p = await mkPatient(branch, `مريض ${orders.length + 1} ` + t);
    patients.push(p);
    orders.push(Number((await one(sql`
      INSERT INTO prosthetic_work_orders
        (patient_id, branch_id, service_type, purpose, expert_user_id, status, current_stage,
         expected_delivery_date, hold_reason_code)
      VALUES (${p}, ${branch}, 'prosthetic', 'initial_build', ${expert}, 'in_progress', 'measurement',
              ${due}, ${hold ?? null})
      RETURNING id`)).id));
  };

  //  خبيرُ ألف: ثلاثةٌ متأخّرةٌ **بلا عذر** + واحدةٌ متأخّرةٌ **بعذرٍ مسجَّل**
  //  + واحدةٌ لم يحن موعدُها. وخبيرُ باء: واحدةٌ متأخّرةٌ بلا عذر.
  await mkOrder(bA.id, expX, day(-5));
  await mkOrder(bA.id, expX, day(-4));
  await mkOrder(bA.id, expX, day(-3));
  await mkOrder(bA.id, expX, day(-2), "waiting_parts");
  await mkOrder(bA.id, expX, day(+30));
  await mkOrder(bB.id, expY, day(-6));

  const snapshot = async () => {
    const r = await one(sql`SELECT
      (SELECT COUNT(*) FROM patients) p, (SELECT COUNT(*) FROM prosthetic_work_orders) w,
      (SELECT COUNT(*) FROM payments) y, (SELECT COUNT(*) FROM visits) v,
      (SELECT COUNT(*) FROM system_users) u, (SELECT COUNT(*) FROM cost_entries) c`);
    return JSON.stringify(r);
  };
  const before = await snapshot();

  //  النداءُ كما يقع في الإنتاج بالضبط: عبر `executeTool` بسياقٍ يحمل
  //  التطبيقَ والجلسة — لا عبر الدوالّ الداخلية مباشرةً.
  const call = (a: any, sess: any, name: string, input: any) =>
    executeTool(a, name, input, { app, source: { session: session(sess) } } as any);

  const adminSess = { userId: null, role: "admin", isAdmin: true, branchId: null, accessibleBranches: null, permissions: {} };
  const adminAccess = access(adminSess, null);

  const OVERDUE_NO_EXCUSE = {
    name: "/api/manufacturing/notifications",
    aggregate: {
      where: [{ field: "kind", equals: "overdue" }, { field: "holdReasonCode", isNull: true }],
      groupBy: "expertName", sort: "count",
    },
  };
  const groupsOf = (r: any) => (r.data?.groups ?? []) as { key: string; count: number }[];
  const countFor = (r: any, name: string) => groupsOf(r).find((g) => g.key === name)?.count ?? 0;

  try {
    console.log("\nأ — الفهرسُ يُكتشَف من التطبيق، والقرارُ صريحٌ لكلّ نقطة");
    const cat = buildCatalog(app);
    same("لا نقطةَ قراءةٍ بلا قرار (موصوفةٌ أو ممنوعة)", cat.undecided, []);
    same("ولا وصفٌ شاخَ لنقطةٍ زالت", cat.describedButMissing, []);
    ok(cat.capabilities.length >= 80, `الفهرسُ يحمل ${cat.capabilities.length} قدرة`);
    ok(cat.capabilities.some((c) => c.path === "/api/manufacturing/notifications"), "وفيه شاشةُ التنبيهات");
    ok(!cat.capabilities.some((c) => c.path === "/api/logout"), "ولا يحمل ما يُنهي الجلسة");
    ok(BLOCKED["/api/logout"].length > 10, "ومنعُه مكتوبٌ بسببه");

    console.log("\nب — سؤالُ المالك بعينه: أيُّ خبيرٍ أكثرُ تأخّراً بلا عذر");
    const found = await call(adminAccess, adminSess, "list_capabilities", { topic: "اوامر تصنيع متاخرة خبير" });
    ok(found.ok, "البحثُ في الفهرس نجح");
    ok(((found.data?.capabilities ?? []) as any[]).some((c) => String(c.name).includes("manufacturing")),
      "ويعيد شاشاتِ التصنيع");

    const red = await call(adminAccess, adminSess, "read_capability", OVERDUE_NO_EXCUSE);
    ok(red.ok, "والنداءُ نجح");
    same("الخبيرُ الأوّلُ هو الأكثر", groupsOf(red)[0]?.key, "خبير ألف " + t);
    same("بثلاثةِ أوامرَ بلا عذر", groupsOf(red)[0]?.count, 3);
    same("وخبيرُ الفرع الآخر بواحد", countFor(red, "خبير باء " + t), 1);

    //  ولولا شرطُ «بلا عذر» لصارت أربعة — فالكهرمانيُّ مستبعَدٌ فعلاً لا صدفةً.
    const all = await call(adminAccess, adminSess, "read_capability", {
      name: "/api/manufacturing/notifications",
      aggregate: { where: [{ field: "kind", equals: "overdue" }], groupBy: "expertName", sort: "count" },
    });
    same("والمتأخّرُ بعذرٍ يُحتسَب حين لا يُستبعَد", countFor(all, "خبير ألف " + t), 4);

    console.log("\nج — والحدُّ يأتي من النقطة نفسِها، بلا سطرِ صلاحيةٍ في المساعد");
    const mSess = { userId: mgrB, role: "branch_manager", isAdmin: false, branchId: bB.id,
      accessibleBranches: [bB.id], permissions: { canViewPatients: true } };
    const mRed = await call(access(mSess, bB.id), mSess, "read_capability", OVERDUE_NO_EXCUSE);
    ok(mRed.ok, "مديرُ الفرع الآخر ينادي بنجاح");
    same("ويرى خبيرَه وحده", countFor(mRed, "خبير باء " + t), 1);
    same("ولا يرى خبيرَ الفرع الأوّل", countFor(mRed, "خبير ألف " + t), 0);

    const rSess = { userId: recB, role: "reception", isAdmin: false, branchId: bB.id,
      accessibleBranches: [bB.id], permissions: { canViewPatients: true } };
    const rRed = await call(access(rSess, bB.id), rSess, "read_capability", OVERDUE_NO_EXCUSE);
    same("والاستقبالُ في فرعه كذلك", countFor(rRed, "خبير باء " + t), 1);
    same("ولا يتسرّب إليه الفرعُ الآخر", countFor(rRed, "خبير ألف " + t), 0);

    const zSess = { userId: bare, role: "reception", isAdmin: false, branchId: bB.id,
      accessibleBranches: [bB.id], permissions: {} };
    const zRed = await call(access(zSess, bB.id), zSess, "read_capability", OVERDUE_NO_EXCUSE);
    ok(!zRed.ok, "ومَن لا يملك عرضَ المرضى يُردّ");
    ok(String(zRed.data?.error ?? "").length > 0, "برسالةِ النقطة نفسِها لا بعبارةٍ مخترَعة");

    console.log("\nد — والمالُ خلف وضعِه، فوق حارسِ النقطة");
    //  **جلسةٌ عامّةٌ حقيقية**: استقبالٌ بلا `canManageAccounting` — فوضعُه
    //  عامٌّ يقيناً. (والمسؤولُ وضعُه ماليٌّ أصلاً، فقياسُ «العامّ» عليه
    //  كان سيمرّ لسببٍ خاطئ.)
    const genAccess = access(rSess, bB.id, "فرع ب " + t);
    same("وضعُ الاستقبال عامٌّ", genAccess.mode, "general");
    const genList = await call(genAccess, rSess, "list_capabilities", { topic: "مصاريف محاسبة وارد" });
    const genNames = ((genList.data?.capabilities ?? []) as any[]).map((c) => String(c.name));
    ok(genNames.length > 0, "ويجد شاشاتٍ لموضوعه");
    //  **بالوسم لا ببادئة المسار**: `/api/expense-categories` أسماءُ
    //  تصنيفاتٍ لا مبالغ، فبادئةٌ نصّية كانت ستُسقط الفحصَ لسببٍ خاطئ.
    ok(!genNames.some((n) => DESCRIBED[n]?.f === true), "ولا شاشةَ ماليةً واحدة تُعرَض له");
    ok(Object.values(DESCRIBED).some((v) => v.f === true), "والوسمُ الماليُّ مستعمَلٌ فعلاً");
    const genRead = await call(genAccess, rSess, "read_capability", { name: "/api/accounting/summary" });
    ok(!genRead.ok, "ولا تُنادى ولو باسمها الصريح");

    const adminFinancial = adminAccess.mode === "financial";
    ok(adminFinancial, "والمسؤولُ وضعُه ماليّ");
    const finList = await call(adminAccess, adminSess, "list_capabilities", { topic: "مصاريف محاسبة وارد" });
    ok(((finList.data?.capabilities ?? []) as any[]).some((c) => String(c.name).startsWith("/api/accounting")),
      "فتظهر له الشاشاتُ المالية");
    const finRead = await call(adminAccess, adminSess, "read_capability", {
      name: "/api/accounting/summary", query: { startDate: day(-30), endDate: day(0) },
    });
    ok(finRead.ok, "ويقرؤها فعلاً");

    console.log("\nهـ — والممنوعُ لا يُنادى ولو اخترع النموذجُ اسمَه");
    const sess = session(adminSess);
    const out = await executeTool(adminAccess, "read_capability", { name: "/api/logout" },
      { app, source: { session: sess } } as any);
    ok(!out.ok, "نداءُ الخروج يُردّ");
    ok(sess.destroyed === false, "ولم تُنهَ الجلسةُ إطلاقاً — لم يبلغ المعالِجَ أصلاً");
    ok(sess.branchSession === adminSess, "وهي كما هي");
    const bogus = await call(adminAccess, adminSess, "read_capability", { name: "/api/does-not-exist" });
    ok(!bogus.ok, "ومسارٌ مخترَعٌ يُردّ");
    const secret = await call(adminAccess, adminSess, "read_capability", { name: "/api/admin/settings/telegram" });
    ok(!secret.ok, "وسرُّ التكامل لا يُقرأ في محادثة");

    console.log("\nو — وصفرُ كتابة");
    same("بصمةُ الجداول كما هي", await snapshot(), before);
  } finally {
    if (srv) await new Promise((r) => srv.close(() => r(null)));
    if (orders.length) await db.execute(sql`DELETE FROM prosthetic_work_orders WHERE id IN (${sql.join(orders.map((i) => sql`${i}`), sql`, `)})`);
    if (patients.length) await db.execute(sql`DELETE FROM patients WHERE id IN (${sql.join(patients.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM system_users WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM branches WHERE id IN (${bA.id}, ${bB.id})`);
  }

  console.log(`\nنجح ${pass} · فشل ${fail}`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
