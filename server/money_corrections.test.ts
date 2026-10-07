// **طلبُ تصحيح المال** (قرارُ المالك ٢٠٢٦-١٠-٠٧، ترحيل ١٠٢، §4.ce) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:money-corrections`.
//
//   • **أ**: تعديلُ المصروف وحذفُه من صفحة المحاسبة للمسؤول وحده — ولو ملك الموظّفُ «إدارة المحاسبة».
//   • **ب**: الطلب — بسبب وتغييرٍ فعليّ، في فرعه، وطلبٌ معلَّقٌ واحد للسطر، ولا طلبَ على النسب ولا من المسؤول.
//   • **ج**: الرؤية — الموظّفُ طلباتِه، والمسؤولُ المعلَّقَ كلَّه، والدفترُ يَسِم السطر.
//   • **د**: القرار للمسؤول وحده — الاعتمادُ يطبّق ويكتب التدقيق، ولا يُطبَّق مرّتين، ولا على سطرٍ تغيّر بعد الطلب.
//   • **هـ**: سطورُ الدفتر — التحويلُ إلى قاصة الدكتور يُعدَّل، و«وارد آخر» يُحذف ناعماً، واستلامُ النسبة للمسؤول وحده.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { claim } from "./money_corrections/store";
import { baghdadTodayYmd } from "@shared/visit_date";

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

const PORT = 6894;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-التصحيح";
const BG = 9721, DQ = 9722;
const ADMIN = 9981, ACC = 9982, RACC = 9983, ACC_DQ = 9984;
const USERS = [ADMIN, ACC, RACC, ACC_DQ];
const BRANCHES = [BG, DQ];
const TODAY = baghdadTodayYmd();

const sess = (userId: number, role: string, branchId: number, permissions: any = {}) => ({
  userId, role, isAdmin: role === "admin", branchId, accessibleBranches: [branchId], displayName: `u${userId}`, permissions,
});
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: BG, accessibleBranches: BRANCHES, displayName: "المسؤول", permissions: {} },
  acc: sess(ACC, "accountant", BG, { canAddExpenses: true }),
  //  محاسبُ استقبالٍ بصلاحية «إدارة المحاسبة» — كان يعدّل المصروفَ من صفحة المحاسبة.
  racc: sess(RACC, "reception", BG, { canManageAccounting: true, canAddExpenses: true }),
  accDq: sess(ACC_DQ, "accountant", DQ, { canAddExpenses: true }),
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function cleanup() {
  await q(`DELETE FROM money_correction_requests WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE source_type='expense'
             AND source_id IN (SELECT id FROM expenses WHERE branch_id = ANY($1::int[])))`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM journal_entries WHERE source_type='expense' AND source_id IN (SELECT id FROM expenses WHERE branch_id = ANY($1::int[]))`, [BRANCHES]).catch(() => undefined);
  await q(`DELETE FROM expenses WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_entries WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM cash_book_openings WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
  await q(`DELETE FROM audit_log WHERE branch_id = ANY($1::int[])`, [BRANCHES]);
}
async function expense(branchId: number, category: string, amount: number, description: string | null, by: number) {
  const [r] = await q(`INSERT INTO expenses (branch_id, category, section, amount, expense_date, description, created_by)
     VALUES ($1,$2,'prosthetic',$3,$4,$5,$6) RETURNING id`, [branchId, category, amount, TODAY, description, String(by)]);
  return Number(r.id);
}
async function entry(kind: string, amount: number, note: string | null) {
  const [r] = await q(`INSERT INTO cash_book_entries (branch_id, book, entry_date, kind, amount, note, created_by)
     VALUES ($1,'devices',$2,$3,$4,$5,$6) RETURNING id`, [BG, TODAY, kind, amount, note, ACC]);
  return Number(r.id);
}

async function main() {
  await q(`INSERT INTO branches (id, name) VALUES ($1,$2),($3,$4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [BG, `${MARK} بغداد`, DQ, `${MARK} ذي قار`]);
  for (const [id, role, br, manage] of [[ADMIN, "admin", BG, false], [ACC, "accountant", BG, false], [RACC, "reception", BG, true], [ACC_DQ, "accountant", DQ, false]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_add_expenses,can_manage_accounting)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,$7)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_add_expenses=true, can_manage_accounting=EXCLUDED.can_manage_accounting`,
      [id, `mc_u${id}`, `u${id}`, role, br, JSON.stringify(role === "admin" ? BRANCHES : [br]), manage]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  const ask = (s: any, body: any) => http("POST", "/api/money-corrections", s, body);
  const amountOf = async (id: number) => Number((await q(`SELECT amount FROM expenses WHERE id=$1`, [id]))[0]?.amount ?? -1);

  try {
    console.log("\n── أ. صفحة المحاسبة ──");
    const e1 = await expense(BG, "transport", 500_000, "وقود", ACC);
    same("أ١. **تعديلُ المصروف وحذفُه للمسؤول وحده** — المحاسبُ وصاحبُ «إدارة المحاسبة» ٤٠٣",
      [(await http("PUT", `/api/expenses/${e1}`, S.acc, { amount: 50_000 })).status, (await http("PUT", `/api/expenses/${e1}`, S.racc, { amount: 50_000 })).status,
       (await http("DELETE", `/api/expenses/${e1}`, S.racc)).status, await amountOf(e1)], [403, 403, 403, 500_000]);
    const e0 = await expense(BG, "transport", 1_000, "تجربة", ACC);
    same("أ٢. والمسؤولُ يعدّل ويحذف (٢٠٠)",
      [(await http("PUT", `/api/expenses/${e0}`, S.admin, { amount: 2_000 })).status, await amountOf(e0),
       (await http("DELETE", `/api/expenses/${e0}`, S.admin)).status, await amountOf(e0)], [200, 2_000, 200, -1]);

    console.log("\n── ب. الطلب ──");
    same("ب١. **بلا سبب ⟵ ٤٠٠ · بلا تغيير ⟵ ٤٠٠ · المسؤولُ لا يطلب ⟵ ٤٠٠**",
      [(await ask(S.acc, { targetType: "expense", targetId: e1, action: "update", amount: 50_000, reason: "" })).status,
       (await ask(S.acc, { targetType: "expense", targetId: e1, action: "update", amount: 500_000, reason: "خطأ" })).status,
       (await ask(S.admin, { targetType: "expense", targetId: e1, action: "update", amount: 50_000, reason: "خطأ" })).status], [400, 400, 400]);
    same("ب٢. **ومصروفُ فرعٍ آخر ⟵ ٤٠٣**",
      (await ask(S.accDq, { targetType: "expense", targetId: e1, action: "update", amount: 50_000, reason: "خطأ كتابة" })).status, 403);
    const hosp = await expense(BG, "hospital_percentage", 10_000, "نسبة", ACC);
    same("ب٣. **ولا طلبَ على النسب** (٤٠٠)", (await ask(S.acc, { targetType: "expense", targetId: hosp, action: "delete", reason: "خطأ كتابة" })).status, 400);
    const r1 = await ask(S.acc, { targetType: "expense", targetId: e1, action: "update", amount: "50,000", reason: "كتبتُ صفراً زائداً" });
    same("ب٤. **الطلبُ يُحفظ معلَّقاً بالقيمة قبله والمطلوب** — والمصروفُ لم يتغيّر",
      [r1.status, r1.body?.status, r1.body?.beforeSnapshot?.amount, r1.body?.requestedPatch, await amountOf(e1)],
      [200, "pending", 500_000, { amount: 50_000 }, 500_000]);
    same("ب٥. **وطلبٌ معلَّقٌ واحد للسطر** (٤٠٩)",
      (await ask(S.racc, { targetType: "expense", targetId: e1, action: "delete", reason: "مكرّر" })).status, 409);

    console.log("\n── ج. الرؤية ──");
    const eR = await expense(BG, "stationery", 30_000, "أوراق", RACC);
    const rR = await ask(S.racc, { targetType: "expense", targetId: eR, action: "update", amount: 3_000, reason: "صفرٌ زائد" });
    const mine = (await http("GET", "/api/money-corrections", S.acc)).body;
    const others = (await http("GET", "/api/money-corrections", S.accDq)).body;
    const pending = (await http("GET", "/api/money-corrections?status=pending", S.admin)).body;
    same("ج١. **الموظّفُ يرى طلبَه وحده** (لا طلبَ زميله في الفرع نفسِه)، وموظّفُ فرعٍ آخر لا يراه، والمسؤولُ يراهما معلَّقَين",
      [mine.map((r: any) => r.id), others.length, [r1.body.id, rR.body.id].every((id: number) => pending.some((r: any) => r.id === id))],
      [[r1.body.id], 0, true]);
    await q(`INSERT INTO cash_book_openings (branch_id, book, opening_date, cash_balance, ratio_balance) VALUES ($1,'devices',$2,0,0)`, [BG, TODAY]);
    const sheet = (await http("GET", `/api/cash-book?book=devices&date=${TODAY}`, S.acc)).body;
    same("ج٢. **والدفترُ يَسِم السطرَ المعلَّق**", (sheet.pendingCorrections ?? []).includes(`expense:${e1}`), true);

    console.log("\n── د. القرار ──");
    same("د١. **القرارُ للمسؤول وحده** (٤٠٣)", [(await http("POST", `/api/money-corrections/${r1.body.id}/approve`, S.racc)).status, await amountOf(e1)], [403, 500_000]);
    const ap = await http("POST", `/api/money-corrections/${r1.body.id}/approve`, S.admin);
    same("د٢. **الاعتمادُ يطبّق** — المصروفُ ٥٠٬٠٠٠، والطلبُ معتمَدٌ باسم المسؤول",
      [ap.status, ap.body?.status, ap.body?.decidedByName, await amountOf(e1)], [200, "approved", `u${ADMIN}`, 50_000]);
    const aud = await q(`SELECT entity_type, action, notes FROM audit_log WHERE branch_id=$1 AND entity_type IN ('expense','money_correction_request') ORDER BY id`, [BG]);
    check(aud.some((a) => a.entity_type === "expense" && a.action === "update" && /طلب تصحيح/.test(a.notes ?? ""))
      && aud.some((a) => a.entity_type === "money_correction_request" && a.action === "approve"),
      "د٣. **وسطرا تدقيق**: الاعتمادُ، والتعديلُ على المصروف «باعتماد طلب تصحيح»", JSON.stringify(aud));
    same("د٤. **ولا يُعتمَد مرّتين** (٤٠٩)", (await http("POST", `/api/money-corrections/${r1.body.id}/approve`, S.admin)).status, 409);
    //  ضغطتان متزامنتان على «اعتمد» — يُطبَّق مرّةً واحدة.
    const both = await Promise.all([1, 2].map(() => http("POST", `/api/money-corrections/${rR.body.id}/approve`, S.admin)));
    same("د٤ب. **ضغطتان متزامنتان ⟵ اعتمادٌ واحد**", both.map((b) => b.status).sort(), [200, 409]);
    same("د٤ج. **وحجزُ القرار لا يقع على طلبٍ محسوم** — فلا يطبّقه سباقٌ مرّتين",
      [await claim(r1.body.id, "approved", ADMIN, "x", null), await claim(rR.body.id, "rejected", ADMIN, "x", null)], [null, null]);
    const r2 = await ask(S.acc, { targetType: "expense", targetId: e1, action: "delete", reason: "مكرّر" });
    await http("PUT", `/api/expenses/${e1}`, S.admin, { amount: 60_000 });
    const st = await http("POST", `/api/money-corrections/${r2.body.id}/approve`, S.admin);
    same("د٥. **سطرٌ تغيّر بعد الطلب لا يُطبَّق عليه** (٤٠٩) — ويبقى المصروفُ والطلبُ معلَّقاً",
      [st.status, await amountOf(e1), (await q(`SELECT status FROM money_correction_requests WHERE id=$1`, [r2.body.id]))[0].status], [409, 60_000, "pending"]);
    const rj = await http("POST", `/api/money-corrections/${r2.body.id}/reject`, S.admin, { note: "قديم" });
    same("د٦. والرفضُ يغلقه بلا أثرٍ على المصروف", [rj.status, rj.body?.status, await amountOf(e1)], [200, "rejected", 60_000]);

    console.log("\n── هـ. سطور الدفتر ──");
    const tr = await entry("dr_transfer", 4_000_000, "تحويل");
    const r3 = await ask(S.acc, { targetType: "cash_book_entry", targetId: tr, action: "update", amount: 400_000, reason: "صفرٌ زائد" });
    await http("POST", `/api/money-corrections/${r3.body.id}/approve`, S.admin);
    same("هـ١. **التحويلُ إلى قاصة الدكتور يُصحَّح بالاعتماد**",
      Number((await q(`SELECT amount FROM cash_book_entries WHERE id=$1`, [tr]))[0].amount), 400_000);
    const inc = await entry("income_other", 7_000, "بيع علبة");
    const r4 = await ask(S.acc, { targetType: "cash_book_entry", targetId: inc, action: "delete", reason: "سُجّل مرّتين" });
    await http("POST", `/api/money-corrections/${r4.body.id}/approve`, S.admin);
    same("هـ٢. **و«وارد آخر» يُحذف ناعماً بالاعتماد** — بختم المسؤول",
      (await q(`SELECT deleted_at IS NOT NULL del, deleted_by FROM cash_book_entries WHERE id=$1`, [inc]))[0], { del: true, deleted_by: ADMIN });
    const rec = await entry("ratio_received", 1_000, null);
    same("هـ٣. **واستلامُ النسبة للمسؤول وحده — لا طلبَ عليه** (٤٠٣)",
      (await ask(S.acc, { targetType: "cash_book_entry", targetId: rec, action: "delete", reason: "خطأ" })).status, 403);
  } finally {
    await cleanup();
    httpServer.close();
  }
  console.log(failures === 0 ? "\n✅ كل فحوص طلب التصحيح نجحت" : `\n❌ ${failures} فشل`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); try { await cleanup(); } catch { /* */ } process.exit(1); });
