//  **سجلُّ محادثات المساعد** (ترحيل ٠٨٤ — ٢٠٢٦-٠٩-٢١) — حيّاً على Postgres
//  وعلى النقاط الحقيقية. قاعدة محلّية: `npm run test:ai-conversations`.
//
//  ══ ⚠ يعكس قاعدةً موثَّقة بقرار المالك ══════════════════════════════════
//  القسمُ ٤.n يقول «**ولا محادثةٌ عادية تُحفَظ أبداً**». سأل المالكُ صراحةً:
//  «اين المشكلة ان حفظناها بقاعدة البيانات واقرا مايكتبه الموظفون؟» ثمّ قرّر
//  الحفظ. **فالعكسُ معلَن، وهذا الملفُّ يثبت العقدَ الجديد بحدوده.**
//
//  ══ ما يحرسه، بندَ بندٍ ═════════════════════════════════════════════════
//   • **أ**: حالةُ القاعدة — الجدولُ وفهارسُه، والترحيلُ idempotent ومسجَّل،
//     **ولا مفتاحَ أجنبيّاً إلى `patients`** (فالقاعدةُ الملزمة في القسم ٨
//     لا تنطبق — يُثبَت لا يُفترَض).
//   • **ب**: الكاتبُ القانونيُّ نفسُه — ما يُحفَظ وما لا يُحفَظ.
//   • **ج**: **«محادثاتي»** — صفوفُ صاحب الجلسة وحدها، لكلّ دور.
//   • **د**: **«كلُّ المحادثات» للمسؤول العام وحده** — ومديرُ الفرع يُردّ.
//   • **هـ**: **خيطُ المحادثة ليس إذناً** — معرّفُ زميلٍ يُرجع فارغاً.
//   • **و**: **نافذةُ التسعين يوماً تُفرَض عند القراءة** لا بالمحو وحده.
//   • **ز**: والمحوُ الفيزيائيّ — بشرطٍ صريح، ولا يمسّ ما هو داخل النافذة.
//   • **ح**: المدخلاتُ المشوَّهة تُردّ ولا تُقرأ «الكلّ».
//   • **ط**: **وجوابٌ لم يقع لا يُحفَظ له صفّ** — مُثبَتٌ عبر النقطة
//     الحقيقية `/api/ai/chat` بلا مفتاحِ مزوّد (٥٠٣ وصفرُ صفوف).
//   • **ي**: حارسٌ معماريّ — لا كتابةَ في ملفّ نقاط القراءة، والوصلُ في
//     `/api/ai/chat` قائمٌ بشروطه.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { sql as MIG084, name as NAME084 } from "./migrations/084_ai_chat_conversations";
import {
  getConversationThread, listAllConversations, listMyConversations,
  purgeExpiredConversations, recordExchange,
} from "./ai/conversations/store";
import { AI_CHAT_RETENTION_DAYS } from "@shared/ai_conversations";

const ROUTES_SRC = readFileSync(join(process.cwd(), "server/routes.ts"), "utf8");
const CONV_ROUTES_SRC = readFileSync(
  join(process.cwd(), "server/ai/conversations/routes.ts"), "utf8");
const RUNNER_SRC = readFileSync(join(process.cwd(), "server/migrations/runner.ts"), "utf8");
const BACKUP_SRC = readFileSync(join(process.cwd(), "server/backup.ts"), "utf8");
/** بلا تعليقات — فلا يمرّ فحصُ العقد على شرحٍ بدل كود. */
const code = (t: string) => t.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

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
function same(msg: string, got: unknown, expected: unknown, detail = "") {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`
    + (detail ? `\n      ${detail}` : ""));
}

const PORT = 6884;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = 9881, RECV = 9882, MGR = 9883, DOC = 9884, ACC = 9885;
const USERS = [ADMIN, RECV, MGR, DOC, ACC];

const S: Record<string, any> = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: {} },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canViewPatients: true } },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "الطبيب", permissions: { canWriteMedicalExam: true } },
  acc: { userId: ACC, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب", permissions: { canManageAccounting: true } },
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

async function runMigration084() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(MIG084);
    await c.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [NAME084]);
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}

/** يُنظَّف ما كتبه هذا الاختبار وحده — ولا يُمَسّ صفُّ غيره. */
async function cleanup() {
  await q(`DELETE FROM ai_chat_conversations WHERE user_id = ANY($1::int[])`, [USERS]);
}

/** يكتب صفّاً بعمرٍ محدَّد — لاختبار النافذة وحدها. */
async function ageRow(id: number, days: number) {
  await q(`UPDATE ai_chat_conversations SET created_at = NOW() - ($2 || ' days')::interval
            WHERE id = $1`, [id, String(days)]);
}
const say = (userId: number, s: any, q2: string, a: string, conv: string | null = null) =>
  recordExchange({
    conversationId: conv, userId, userName: s.displayName, userRole: s.role,
    branchId: s.branchId, branchName: "بغداد", mode: "general",
    pagePath: "/patients", question: q2, answer: a, toolNames: [], knowledgeIds: [],
  });

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name] of [
    [ADMIN, "admin", "المسؤول"], [RECV, "reception", "ريام"],
    [MGR, "branch_manager", "مدير الفرع"], [DOC, "doctor", "الطبيب"],
    [ACC, "accountant", "المحاسب"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,1,'[1]'::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true`,
      [id, `conv_u${id}`, role, name]);
  }

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

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── أ. حالةُ القاعدة ──");
    // ════════════════════════════════════════════════════════════════════
    await runMigration084();
    await runMigration084();     // idempotent: مرّتان بلا خطأ
    await cleanup();

    const cols = (await q<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name='ai_chat_conversations' ORDER BY ordinal_position`))
      .map((c) => c.column_name);
    for (const c of ["conversation_id", "user_id", "user_name", "mode", "question", "answer", "created_at"]) {
      check(cols.includes(c), `أ١.${c} — العمودُ قائم`, cols.join(", "));
    }
    const idx = (await q<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename='ai_chat_conversations' ORDER BY indexname`))
      .map((i) => i.indexname);
    check(idx.includes("idx_ai_chat_conv_user"), "أ٢. فهرسُ «محادثاتي»", idx.join(", "));
    check(idx.includes("idx_ai_chat_conv_created"), "أ٣. وفهرسُ «كلُّ المحادثات» والمحو");
    check(idx.includes("idx_ai_chat_conv_thread"), "أ٤. وفهرسُ الخيط الجزئيّ");
    check(RUNNER_SRC.includes("084_ai_chat_conversations") && RUNNER_SRC.includes("migration084"),
      "أ٥. والترحيلُ مسجَّلٌ في المُشغِّل");

    //  **القاعدةُ الملزمة (القسم ٨) — تُثبَت لا تُفترَض.**
    const fks = await q<{ refs: string }>(`
      SELECT cl2.relname AS refs FROM pg_constraint con
        JOIN pg_class cl ON cl.oid = con.conrelid
        JOIN pg_class cl2 ON cl2.oid = con.confrelid
       WHERE cl.relname = 'ai_chat_conversations' AND con.contype = 'f'`);
    const refs = fks.map((f) => f.refs).sort();
    same("أ٦. **ولا مفتاحَ أجنبيّاً إلى `patients` ولا توابعها** — فكاسكيدُ "
      + "`deletePatient` لا شأنَ له بهذا الجدول", refs, ["branches", "system_users"]);

    //  **والنسخةُ الليلية خارجَ هذا كلِّه** — شرطُ المالك صراحةً.
    check(!/ai_chat_conversations|aiChatConversations/.test(BACKUP_SRC),
      "أ٧. **والجدولُ غائبٌ عن النسخة البريدية** — `server/backup.ts` بلا ذكرٍ له");

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── ب. الكاتبُ القانونيّ — ما يُحفَظ وما لا يُحفَظ ──");
    // ════════════════════════════════════════════════════════════════════
    check(await say(RECV, S.recv, "كم مريضاً اليوم؟", "اليوم ثلاثة مرضى."),
      "ب١. تبادلٌ كامل يُحفَظ");
    check(!(await say(RECV, S.recv, "   ", "جوابٌ بلا سؤال")),
      "ب٢. **وسؤالٌ فارغ لا يُحفَظ** — صفٌّ بلا نصٍّ ضجيجٌ لا سجلّ");
    check(!(await say(RECV, S.recv, "سؤالٌ بلا جواب", "")),
      "ب٣. ولا جوابٌ فارغ");
    check(!(await recordExchange({
      conversationId: null, userId: 0, userName: "x", userRole: null, branchId: 1,
      branchName: null, mode: "general", pagePath: null, question: "س", answer: "ج",
      toolNames: [], knowledgeIds: [],
    })), "ب٤. **والصفرُ ليس رقمَ مستخدم** — لا صفَّ بلا صاحب");

    //  **وغيابُ الاسم يُقال ولا يُترَك فارغاً** (العمود `NOT NULL`).
    await recordExchange({
      conversationId: null, userId: RECV, userName: "   ", userRole: null, branchId: 1,
      branchName: null, mode: "general", pagePath: null, question: "بلا اسم", answer: "ج",
      toolNames: [], knowledgeIds: [],
    });
    const noName = await q<{ user_name: string }>(
      `SELECT user_name FROM ai_chat_conversations WHERE user_id=$1 AND question='بلا اسم'`, [RECV]);
    same("ب٥. واسمٌ غائب يُقال «مستخدم #رقم»", noName[0]?.user_name, `مستخدم #${RECV}`);

    //  **والمعرّفُ الملفَّق لا يُكتب كما وصل.**
    await recordExchange({
      conversationId: "'; DROP TABLE ai_chat_conversations; --", userId: RECV,
      userName: "ريام", userRole: "reception", branchId: 1, branchName: null,
      mode: "general", pagePath: null, question: "معرّفٌ ملفَّق", answer: "ج",
      toolNames: [], knowledgeIds: [],
    });
    const bad = await q<{ conversation_id: string | null }>(
      `SELECT conversation_id FROM ai_chat_conversations WHERE user_id=$1 AND question='معرّفٌ ملفَّق'`,
      [RECV]);
    same("ب٦. **ومعرّفٌ ملفَّق يُقرأ «بلا تجميع»** لا يُكتب نصّاً",
      bad[0]?.conversation_id ?? null, null);
    check((await q(`SELECT to_regclass('ai_chat_conversations') AS t`))[0].t !== null,
      "ب٧. والجدولُ قائمٌ بعده — لا حقنَ يمرّ");

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── ج. «محادثاتي» — صفوفُ صاحب الجلسة وحدها ──");
    // ════════════════════════════════════════════════════════════════════
    await cleanup();
    await say(RECV, S.recv, "سؤالُ ريام", "جوابُ ريام");
    await say(DOC, S.doc, "سؤالُ الطبيب", "جوابُ الطبيب");
    await say(ACC, S.acc, "سؤالُ المحاسب", "جوابُ المحاسب");

    for (const [key, uid, expected] of [
      ["recv", RECV, "سؤالُ ريام"], ["doc", DOC, "سؤالُ الطبيب"],
      ["acc", ACC, "سؤالُ المحاسب"],
    ] as any[]) {
      const r = await http("GET", "/api/ai/conversations/mine", S[key]);
      same(`ج١.${key} — يقرأ محادثتَه وحدها`,
        (r.body?.rows ?? []).map((x: any) => x.question), [expected]);
    }
    const mgrMine = await http("GET", "/api/ai/conversations/mine", S.mgr);
    same("ج٢. ومديرُ الفرع بلا محادثات ⟶ قائمةٌ فارغة لا صفوفُ غيره",
      mgrMine.body?.rows ?? [], []);
    const noSess = await http("GET", "/api/ai/conversations/mine", { isAdmin: false });
    same("ج٣. **وجلسةٌ بلا رقمِ مستخدم ⟶ ٤٠٣** لا صفوفَ أحد", noSess.status, 403);

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── د. «كلُّ المحادثات» — المسؤولُ العام وحده ──");
    // ════════════════════════════════════════════════════════════════════
    const all = await http("GET", "/api/ai/conversations", S.admin);
    same("د١. المسؤولُ يقرأ الثلاثة", all.status, 200);
    check((all.body?.rows ?? []).length >= 3, "د٢. وعددُها ثلاثةٌ فأكثر",
      String((all.body?.rows ?? []).length));
    const qs = new Set((all.body?.rows ?? []).map((r: any) => r.question));
    check(qs.has("سؤالُ ريام") && qs.has("سؤالُ الطبيب") && qs.has("سؤالُ المحاسب"),
      "د٣. وفيها محادثاتُ الثلاثة", Array.from(qs).join(" | "));

    for (const key of ["recv", "mgr", "doc", "acc"]) {
      const r = await http("GET", "/api/ai/conversations", S[key]);
      same(`د٤.${key} — يُردّ ٤٠٣`, r.status, 403);
      const u = await http("GET", "/api/ai/conversations/users", S[key]);
      same(`د٥.${key} — وقائمةُ المستخدمين كذلك`, u.status, 403);
    }
    check(S.mgr.role === "branch_manager",
      "د٦. **ومديرُ الفرع منهم صراحةً** — قياسٌ على معرفة المساعد (٤.n)");

    const filtered = await http("GET", `/api/ai/conversations?userId=${DOC}`, S.admin);
    same("د٧. والترشيحُ بمستخدمٍ بعينه",
      (filtered.body?.rows ?? []).map((r: any) => r.question), ["سؤالُ الطبيب"]);
    const users = await http("GET", "/api/ai/conversations/users", S.admin);
    check((users.body?.users ?? []).some((u: any) => u.userId === RECV),
      "د٨. وقائمةُ مَن لهم محادثات", JSON.stringify(users.body?.users));

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── هـ. خيطُ المحادثة — تجميعٌ لا إذن ──");
    // ════════════════════════════════════════════════════════════════════
    await cleanup();
    const THREAD = "conv-thread-aaa";
    await say(RECV, S.recv, "أولاً", "ج١", THREAD);
    await say(RECV, S.recv, "ثانياً", "ج٢", THREAD);
    await say(DOC, S.doc, "خيطُ الطبيب", "ج", "conv-thread-bbb");

    const mine = await http("GET", `/api/ai/conversations/thread/${THREAD}`, S.recv);
    same("هـ١. صاحبُ الخيط يقرؤه بترتيبه",
      (mine.body?.rows ?? []).map((r: any) => r.question), ["أولاً", "ثانياً"]);
    const stolen = await http("GET", `/api/ai/conversations/thread/${THREAD}`, S.doc);
    same("هـ٢. **ومعرّفُ خيطِ زميلٍ يُرجع فارغاً** — المعرّفُ ليس إذناً",
      stolen.body?.rows ?? [], []);
    const adminThread = await http("GET", `/api/ai/conversations/thread/${THREAD}`, S.admin);
    same("هـ٣. والمسؤولُ العام يقرؤه",
      (adminThread.body?.rows ?? []).map((r: any) => r.question), ["أولاً", "ثانياً"]);
    const badThread = await http("GET", "/api/ai/conversations/thread/not%20valid%20id", S.recv);
    same("هـ٤. ومعرّفٌ مشوَّه ⟶ ٤٠٠", badThread.status, 400);

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── و. نافذةُ التسعين يوماً تُفرَض عند القراءة ──");
    // ════════════════════════════════════════════════════════════════════
    await cleanup();
    await say(RECV, S.recv, "حديثٌ", "ج");
    await say(RECV, S.recv, "قديمٌ جداً", "ج");
    const oldRow = (await q<{ id: number }>(
      `SELECT id FROM ai_chat_conversations WHERE user_id=$1 AND question='قديمٌ جداً'`, [RECV]))[0];
    await ageRow(oldRow.id, AI_CHAT_RETENTION_DAYS + 5);

    const afterAge = await http("GET", "/api/ai/conversations/mine", S.recv);
    same("و١. **والصفُّ خارجَ النافذة لا يُعرَض ولو بقي في الجدول**",
      (afterAge.body?.rows ?? []).map((r: any) => r.question), ["حديثٌ"]);
    const stillThere = await q(
      `SELECT 1 FROM ai_chat_conversations WHERE id=$1`, [oldRow.id]);
    check(stillThere.length === 1,
      "و٢. وهو **ما زال في الجدول** — الترشيحُ عند القراءة لا محوٌ ضمنيّ");
    const adminAge = await http("GET", "/api/ai/conversations", S.admin);
    check(!(adminAge.body?.rows ?? []).some((r: any) => r.question === "قديمٌ جداً"),
      "و٣. **والمسؤولُ لا يراه كذلك** — النافذةُ واحدةٌ للطرفين");
    const threadAged = await getConversationThread("conv-thread-aaa", RECV);
    same("و٤. والخيطُ يرشّح بها أيضاً", threadAged.length, 0);

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── ز. المحوُ الفيزيائيّ — بشرطٍ صريح ──");
    // ════════════════════════════════════════════════════════════════════
    const before = (await q<{ n: string }>(
      `SELECT COUNT(*)::text n FROM ai_chat_conversations WHERE user_id=$1`, [RECV]))[0].n;
    same("ز١. صفّان قبل المحو", before, "2");
    const removed = await purgeExpiredConversations();
    check(removed >= 1, "ز٢. والمحوُ يُرجع عددَ ما مُحي", String(removed));
    const left = await q<{ question: string }>(
      `SELECT question FROM ai_chat_conversations WHERE user_id=$1`, [RECV]);
    same("ز٣. **والحديثُ باقٍ بعد المحو** — لا `DELETE` بلا شرط",
      left.map((r) => r.question), ["حديثٌ"]);
    const again = await purgeExpiredConversations();
    same("ز٤. وتشغيلٌ ثانٍ لا يمحو شيئاً — idempotent", again, 0);

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── ح. المدخلاتُ المشوَّهة تُردّ ولا تُقرأ «الكلّ» ──");
    // ════════════════════════════════════════════════════════════════════
    for (const v of ["abc", "-1", "0", "1.5", "true"]) {
      const r = await http("GET", `/api/ai/conversations?userId=${encodeURIComponent(v)}`, S.admin);
      same(`ح١.${v} — رقمُ مستخدمٍ مشوَّه ⟶ ٤٠٠`, r.status, 400);
    }
    const empty = await http("GET", "/api/ai/conversations?userId=", S.admin);
    same("ح٢. **والفراغُ الصريح ⟶ «الكلّ» صحيحاً** لا خطأ", empty.status, 200);
    const huge = await http("GET", "/api/ai/conversations?limit=100000", S.admin);
    check((huge.body?.rows ?? []).length <= 50,
      "ح٣. وحجمُ صفحةٍ هائل يُقصَر على سقف الخادم",
      String((huge.body?.rows ?? []).length));

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── ط. وجوابٌ لم يقع لا يُحفَظ له صفّ ──");
    // ════════════════════════════════════════════════════════════════════
    //  **النقطةُ الحقيقية بلا مفتاح مزوّد**: `aiChat` تردّ `ok:false`،
    //  فالحارسُ `result.ok` يمنع الكتابة. وهذا إثباتٌ حيٌّ للحارس نفسِه.
    check(!process.env.ANTHROPIC_API_KEY,
      "ط٠. **ولا نداءَ شبكةٍ إلى المزوّد في هذا الاختبار** — بلا مفتاح");
    await cleanup();
    const chat = await http("POST", "/api/ai/chat", S.recv, {
      messages: [{ role: "user", content: "سؤالٌ لن يُجاب" }],
      pagePath: "/patients",
      conversationId: "conv-nope-1",
    });
    check(chat.status >= 400, "ط١. النقطةُ تردّ فشلاً بلا مزوّد", String(chat.status));
    //  **والكتابةُ «أطلق وانسَ» فلا تُقاس لحظةَ عودة الردّ.** بلا هذه
    //  المهلة كان البندُ التالي يمرّ **صدفةً** — الصفُّ لم يُكتب بعد لا
    //  لأن الحارسَ منعه (أمسكه عكسُ الحارس: سقط ي٤ وحدَه وبقي ط٢ أخضر).
    await new Promise((r) => setTimeout(r, 500));
    const rowsAfterFail = await q(
      `SELECT 1 FROM ai_chat_conversations WHERE user_id=$1`, [RECV]);
    same("ط٢. **وصفرُ صفوفٍ محفوظة** — لا يُحفَظ سؤالٌ بلا جواب",
      rowsAfterFail.length, 0);

    // ════════════════════════════════════════════════════════════════════
    console.log("\n── ي. حارسٌ معماريّ ──");
    // ════════════════════════════════════════════════════════════════════
    const convCode = code(CONV_ROUTES_SRC);
    check(!/\bapp\.(post|patch|put|delete)\s*\(/.test(convCode),
      "ي١. **ولا كتابةَ في ملفّ نقاط القراءة** — سجلٌّ يُقرأ ولا يُنقَّح", convCode.slice(0, 300));
    check(!/\b(INSERT|UPDATE|DELETE)\b/i.test(convCode),
      "ي٢. ولا SQL كتابةٍ فيه");

    const routesCode = code(ROUTES_SRC);
    const at = routesCode.indexOf("recordExchange({");
    check(at > 0, "ي٣. والوصلُ في `/api/ai/chat` قائم");
    const near = routesCode.slice(Math.max(0, at - 300), at + 900);
    check(/if\s*\(result\.ok\s*&&\s*access\.userId\)/.test(near),
      "ي٤. **ومحروسٌ بـ`result.ok && access.userId`** — لا صفَّ لجوابٍ لم يقع", near.slice(0, 400));
    check(/question:\s*lastUserQuestion\(history\)/.test(near),
      "ي٥. **والسؤالُ آخرُ رسالةِ مستخدم** لا التاريخُ كلُّه", near.slice(0, 600));
    check(/\.catch\(/.test(near),
      "ي٦. **و«أطلق وانسَ» بمصيدة** — فشلُ سجلٍّ لا يُضيّع جواباً بين يدي الموظّف");
    check(/pagePath:\s*page\?\.path/.test(near),
      "ي٧. والمسارُ بعد تنظيف الخادم لا كما وصل من العميل");

    await cleanup();
  } finally {
    httpServer.close();
    await pool.end();
  }

  console.log(failures ? `\n❌ ${failures} حالة فاشلة` : "\n✅ كل الفحوص نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
