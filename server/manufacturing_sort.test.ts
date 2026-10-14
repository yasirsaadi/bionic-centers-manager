// **ترتيبُ قائمة «تصنيع الأطراف والمساند»** (§4.ee) — `npm run test:manufacturing-sort`.
//
// يحرس:
//   ق — القواعدُ الصافية (`client/src/pages/manufacturing_sort.ts`): «الأحدث أولاً» بوصول الأمر إلى خبيره الحاليّ (الإسنادُ أو آخرُ تحويل)،
//       و«حسب الاسم» أبجدياً بالعربية (الألفاتُ معاً، والتشكيلُ والتطويلُ لا يُحسبان)، وعنوانُ الحرف، ولا يُسقط صفّاً.
//   ش — مصدرُ الشاشة: الترتيبُ بعد تصفية الشرائط، واختيارُه ظاهر ومحفوظٌ لكلّ مستخدم، وعنوانُ الحرف في «حسب الاسم» وحده.
//   أ — الخادمُ حيّاً (منفذ ٧٠١٥): `reassignedAt` آخرُ تحويلٍ لكلّ أمر (وللمحوَّل وحده)، في قائمة المسؤول وقائمة الخبير؛
//       فالأمرُ القديم المحوَّل اليوم يصعد أوّلاً عند خبيره الجديد.
import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  MANUFACTURING_SORT_LABELS, arrivedAtOf, manufacturingSortKey, nameInitialOf, readManufacturingSort, sortManufacturingOrders,
} from "../client/src/pages/manufacturing_sort";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) { console.error("Refusing to run: LOCAL TEST database only."); process.exit(1); }

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7015, BASE = `http://127.0.0.1:${PORT}`, MARK = "اختبار-ترتيب-التصنيع";
const B1 = 9791, ADMIN = 9792, EXP_A = 9793, EXP_B = 9794;
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;

async function cleanup() {
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[ADMIN, EXP_A, EXP_B]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, EXP_A, EXP_B]]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

const order = (id: number, name: string, assignedAt: string | null, reassignedAt: string | null = null) =>
  ({ id, patientName: name, assignedAt, reassignedAt });

async function main() {
  // ══ ق — القواعدُ الصافية ══════════════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصافية ──");
  same("ق.١ الاختيارُ المحفوظ يُقرأ، وما لا يُعرف ⟵ «الأحدث أولاً»",
    [readManufacturingSort("name"), readManufacturingSort("newest"), readManufacturingSort("x"), readManufacturingSort(null)],
    ["name", "newest", "newest", "newest"]);
  same("ق.٢ والتسميتان بحرف الشاشة، ومفتاحُ الحفظ لكلّ مستخدم",
    [MANUFACTURING_SORT_LABELS.newest, MANUFACTURING_SORT_LABELS.name, manufacturingSortKey(7), manufacturingSortKey(undefined)],
    ["الأحدث أولاً", "حسب الاسم (أ – ي)", "manufacturing-sort:7", "manufacturing-sort:anon"]);
  same("ق.٣ **الوصولُ = آخرُ تحويلٍ إن كان بعد الإسناد**، وإلّا الإسناد",
    [arrivedAtOf(order(1, "x", "2026-09-01T10:00:00Z", "2026-10-14T08:00:00Z")) === Date.parse("2026-10-14T08:00:00Z"),
      arrivedAtOf(order(1, "x", "2026-10-01T10:00:00Z", null)) === Date.parse("2026-10-01T10:00:00Z")],
    [true, true]);
  const list = [
    order(1, "زهراء", "2026-10-10T09:00:00Z"),
    order(2, "أحمد", "2026-09-01T09:00:00Z", "2026-10-14T07:00:00Z"),  // قديمٌ حُوِّل اليوم
    order(3, "علي", "2026-10-12T09:00:00Z"),
    order(4, "إبراهيم", "2026-10-12T09:00:00Z"),                         // يساوي ٣ في الوقت
    order(5, "احمد", null),
  ];
  same("ق.٤ **«الأحدث أولاً»: المحوَّلُ اليوم أوّلاً** ولو أُسند قبل شهر، والتعادلُ بالرقم الأحدث، وبلا تاريخٍ آخراً",
    sortManufacturingOrders(list, "newest").map((o) => o.id), [2, 4, 3, 1, 5]);
  same("ق.٥ **«حسب الاسم»: أبجديٌّ بالعربية** — «إبراهيم» و«أحمد» و«احمد» معاً تحت الألف، و«احمد» الأحدثُ بينهما للتعادل",
    sortManufacturingOrders(list, "name").map((o) => o.patientName), ["إبراهيم", "أحمد", "احمد", "زهراء", "علي"]);
  same("ق.٦ والتشكيلُ والتطويلُ ومسافاتُ الطرفين لا تُحسب",
    sortManufacturingOrders([order(1, "  مُحمّد", null), order(2, "مـحمود", null), order(3, "محسن", null)], "name").map((o) => o.id),
    [3, 1, 2]);
  same("ق.٧ **عنوانُ الحرف**: الألفاتُ ألفٌ واحدة، والتطويلُ لا يُحسب، والفارغُ «#»",
    ["أحمد", "إبراهيم", "آمنة", "احمد", "ـنور", "  علي", "", "ى"].map(nameInitialOf), ["ا", "ا", "ا", "ا", "ن", "ع", "#", "ي"]);
  const sorted = sortManufacturingOrders(list, "name");
  same("ق.٨ **يرتّب ولا يُسقط** — نسخةٌ جديدة بالعدد نفسِه والأصلُ كما هو",
    [sorted !== list, sorted.length, list.map((o) => o.id)], [true, 5, [1, 2, 3, 4, 5]]);

  // ══ ش — مصدرُ الشاشة ═════════════════════════════════════════════════════════════════════
  console.log("\n── ش. مصدرُ الشاشة ──");
  const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "../client/src/pages/Manufacturing.tsx"), "utf8");
  check(/sortManufacturingOrders\(ordersInBucket\(orders, bucket, nowMonth, nowDay\), sortMode\)/.test(src),
    "ش.١ **الترتيبُ بعد تصفية الشرائط** — «متأخرون» ثمّ «حسب الاسم» يرتّب المتأخّرين أنفسَهم");
  check(/data-testid="select-sort"/.test(src) && /MANUFACTURING_SORTS\.map/.test(src),
    "ش.٢ واختيارُ الترتيب ظاهرٌ بالخيارين");
  check(/localStorage\.setItem\(sortKey, m\)/.test(src) && /manufacturingSortKey\(session\?\.userId\)/.test(src),
    "ش.٣ ومحفوظٌ لكلّ مستخدمٍ على جهازه");
  check(/sortMode === "name" \? nameInitialOf\(o\.patientName\) : null/.test(src),
    "ش.٤ وعنوانُ الحرف في «حسب الاسم» وحده");

  // ══ أ — الخادمُ حيّاً ════════════════════════════════════════════════════════════════════
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار ترتيب التصنيع')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active) VALUES
           ($1,'ms_admin','x','المسؤول','admin',$4,$5::jsonb,true),
           ($2,'ms_exp_a','x','خبير أ','prosthetics_expert',$4,$5::jsonb,true),
           ($3,'ms_exp_b','x','خبير ب','prosthetics_expert',$4,$5::jsonb,true)`,
    [ADMIN, EXP_A, EXP_B, B1, JSON.stringify([B1])]);
  const pid = async (n: string) => (await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'0770222${Math.floor(Math.random() * 9000 + 1000)}',$2,'40','170','70','x',$3,0,'new') RETURNING id`, [`${MARK} ${n}`, MARK, B1]))[0].id;
  const wo = async (n: string, expert: number, daysAgo: number) => (await q(`INSERT INTO prosthetic_work_orders
       (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, created_at)
       VALUES ($1,$2,$3,'prosthetic','active','casting','initial_build', NOW() - ($4 || ' days')::interval) RETURNING id`,
    [await pid(n), B1, expert, String(daysAgo)]))[0].id as number;
  const OLD = await wo("قديم", EXP_A, 40);
  const MID = await wo("وسط", EXP_B, 10);
  const NEW = await wo("جديد", EXP_B, 2);

  const sess = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s), "utf8").toString("base64");
  const S = {
    admin: sess({ userId: ADMIN, role: "admin", isAdmin: true, branchId: B1, accessibleBranches: [B1], displayName: "المسؤول", permissions: {} }),
    expB: sess({ userId: EXP_B, role: "prosthetics_expert", roles: ["prosthetics_expert"], isAdmin: false, branchId: B1, accessibleBranches: [B1], displayName: "خبير ب", permissions: {} }),
  };
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")), destroy: (cb: any) => cb() } : { destroy: (cb: any) => cb() };
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const srv = createServer(app); await registerRoutes(srv, app); srv.listen(PORT);
  await new Promise<void>((r) => srv.once("listening", r));
  const call = async (method: string, p: string, s: string, body?: unknown) => {
    const r = await fetch(`${BASE}${p}`, { method, headers: { "content-type": "application/json", "x-test-session-b64": s },
      body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const mine = (rows: any[]) => (rows ?? []).filter((o) => String(o.patientName).startsWith(MARK));
  const short = (o: any) => String(o.patientName).slice(MARK.length + 1);

  try {
    console.log("\n── أ. الخادمُ حيّاً ──");
    const before = mine((await call("GET", `/api/manufacturing/orders?branchId=${B1}`, S.admin)).json);
    same("أ.١ قبل أيّ تحويل: `reassignedAt` فارغٌ للجميع", before.map((o) => [short(o), o.reassignedAt]).sort(),
      [["جديد", null], ["قديم", null], ["وسط", null]]);
    const r1 = await call("PATCH", `/api/manufacturing/orders/${OLD}/reassign`, S.admin, { newExpertUserId: EXP_B, reason: "اختبار الترتيب" });
    const t1 = Date.now();
    const after = mine((await call("GET", `/api/manufacturing/orders?branchId=${B1}`, S.admin)).json);
    const old = after.find((o) => o.id === OLD);
    check(r1.status === 200 && !!old?.reassignedAt && Math.abs(Date.parse(old.reassignedAt) - t1) < 60_000
      && after.filter((o) => o.id !== OLD).every((o) => o.reassignedAt === null),
      "أ.٢ **التحويلُ يكتب `reassignedAt` للمحوَّل وحده** — بوقت التحويل، والإسنادُ الأصليّ كما هو",
      JSON.stringify({ status: r1.status, after: after.map((o) => [o.id, o.assignedAt, o.reassignedAt]) }));
    check(Date.parse(old?.assignedAt) < Date.now() - 39 * 86_400_000, "أ.٣ وتاريخُ الإسناد لم يتحرّك (قبل أربعين يوماً)", String(old?.assignedAt));
    //  تحويلٌ ثانٍ ⟵ الأحدث منهما.
    await new Promise((r) => setTimeout(r, 1100));
    await call("PATCH", `/api/manufacturing/orders/${OLD}/reassign`, S.admin, { newExpertUserId: EXP_A, reason: "رجوع" });
    await call("PATCH", `/api/manufacturing/orders/${OLD}/reassign`, S.admin, { newExpertUserId: EXP_B, reason: "ثانية" });
    const hist = await q(`SELECT MAX(created_at) AS at FROM prosthetic_work_history WHERE work_order_id = $1 AND action_type = 'reassigned'`, [OLD]);
    const again = mine((await call("GET", `/api/manufacturing/orders?branchId=${B1}`, S.admin)).json).find((o) => o.id === OLD);
    same("أ.٤ **وبعد أكثر من تحويل: الأحدثُ منها**", again?.reassignedAt, new Date(hist[0].at).toISOString());
    const expRows = mine((await call("GET", `/api/manufacturing/my-orders`, S.expB)).json);
    same("أ.٥ **وفي قائمة الخبير الجديد** يحمل الحقلَ نفسَه، و«الأحدث أولاً» يضع المحوَّلَ إليه اليوم أوّلاً ولو أُسند قبل أربعين يوماً",
      [expRows.find((o) => o.id === OLD)?.reassignedAt === again?.reassignedAt,
        sortManufacturingOrders(expRows, "newest").map(short), sortManufacturingOrders(expRows, "name").map(short)],
      [true, ["قديم", "جديد", "وسط"], ["جديد", "قديم", "وسط"]]);
    same("أ.٦ والخادمُ نفسُه لم يغيّر ترتيبَه (الإسنادُ الأحدث أوّلاً كما كان) — الاختيارُ في الشاشة",
      expRows.map(short), ["جديد", "وسط", "قديم"]);
  } finally {
    await cleanup(); srv.close();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  await pool.end().catch(() => {});
  process.exit(failures ? 1 : 0);
}
main().catch(async (e) => { console.error(e); process.exit(1); });
