// مِجمَعُ مخزن الجلسات — رابطٌ قانونيّ، مهلةٌ محدودة، ولا تعليقَ أبديّ عبر
// `express-session` **الحقيقيّ** (تصحيحٌ إنتاجيّ ٢٠٢٦-٠٩-١٢).
// `npm run test:session-store-pool`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// المِجمَعُ الرئيسيّ (`server/db.ts`) صار مقيَّداً بمهلة اقتناء، لكنّ
// `connect-pg-simple` كان يبني مِجمَعَه الخاصّ من `process.env.DATABASE_URL`
// الخام بلا مهلة — وكلُّ طلبٍ مصادَق يمرّ به **قبل** أن يبلغ أيَّ مسار. فكان
// تشبّعُه يُعلِّق الطلبَ إلى الأبد قبل أن تبدأ أيُّ حمايةٍ لاحقة.
//
// ══ لا `x-test-session` هنا عمداً ══════════════════════════════════════════
// حقنُ الجلسة عبر ترويسةٍ يتجاوز `express-session` ومخزنَها كلياً — أي
// يتجاوز **الشيءَ الذي يُختبَر**. هنا كوكي جلسةٍ حقيقيّ (مُوقَّع بالسرّ نفسِه
// الذي يقرؤه الخادم، أو ناتجٌ عن تسجيل دخولٍ حقيقيّ)، ومخزنٌ حقيقيّ، ومِجمَعٌ
// حقيقيّ يُشبَع عمداً.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
//  السرُّ يُقرأ داخل `getSession()` — يجب أن يكون مضبوطاً قبل `registerRoutes`،
//  ويُستعمَل هنا أيضاً لتوقيع كوكي مُصطنَع بالخوارزمية نفسِها.
process.env.SESSION_SECRET ||= "session-store-pool-test-secret";
const SESSION_SECRET = process.env.SESSION_SECRET;

import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import { createRequire } from "module";
import path from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { pool, DB_CONNECTION_TIMEOUT_MS } from "./db";
import { resolveDatabaseUrl } from "./db_url";
import { sessionPool } from "./replit_integrations/auth/replitAuth";
import { registerRoutes } from "./routes";
import { DIAG_TAG } from "./diagnostics/request_timing";
import { SAVE_ARTICLE_TIMEOUT_MS } from "../client/src/pages/ai_knowledge_admin_save";

//  نفسُ مكتبة التوقيع التي يستعملها `express-session` حرفياً — لا إعادةَ
//  كتابةٍ للخوارزمية قد تنحرف عنها. (بلا تعريفات أنواع، فتُحمَّل بـrequire.)
const require = createRequire(import.meta.url);
const cookieSignature = require("cookie-signature") as { sign(value: string, secret: string): string };

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6930;
const BASE = `http://127.0.0.1:${PORT}`;

//  نطاقُ معرّفاتٍ محجوزٌ لهذا الملفّ وحده.
const B1 = 9950;
const ADMIN = 9951;
const ADMIN_USERNAME = "ssp-admin";
const PLAINTEXT_PASSWORD = "SessionPool1234";

async function q(text: string, params: any[] = []) {
  return pool.query(text, params);
}

//  اتّصالاتُ مِجمَع الجلسات المحجوزة عمداً للتشبّع — على مستوى الملفّ كي
//  تُحرَّر في كلّ مسار خروج: `sessionPool.end()` **لا يكتمل** ما دام اتّصالٌ
//  محجوزاً، فاستثناءٌ بين الحجز والتحرير كان سيُعلِّق الحزمةَ نفسَها بدل أن
//  تفشل بوضوح.
const held: Array<{ release(): void }> = [];
function releaseHeld() {
  for (const c of held.splice(0)) { try { c.release(); } catch { /* حُرِّر سلفاً */ } }
}

async function cleanup() {
  await q(`DELETE FROM audit_log WHERE user_id = $1`, [ADMIN]);
  //  صفوفُ الجلسات التي أنشأها تسجيلُ الدخول هنا — `sess` لا يحمل اسمَ الحساب
  //  (يحمل `branchSession` بمعرّف المستخدم)، فالتمييزُ بالمعرّف داخل JSON.
  await q(`DELETE FROM sessions WHERE sess->'branchSession'->>'userId' = $1`, [String(ADMIN)]).catch(() => { /* الجدول قد لا يكون موجوداً بعد */ });
  await q(`DELETE FROM system_users WHERE id = $1`, [ADMIN]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

/** كوكي `connect.sid` بصيغة `express-session` بالضبط: `s:<sid>.<توقيع>` مُرمَّزاً. */
function signedSessionCookie(sid: string): string {
  return `connect.sid=${encodeURIComponent("s:" + cookieSignature.sign(sid, SESSION_SECRET))}`;
}

/** يلتقط سطور console أثناء `fn` فقط — لقراءة أطوار تشخيص PR #289 على الطلب. */
async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const origLog = console.log, origWarn = console.warn;
  console.log = ((...args: unknown[]) => { lines.push(String(args[0])); }) as typeof console.log;
  console.warn = ((...args: unknown[]) => { lines.push(String(args[0])); }) as typeof console.warn;
  try {
    const result = await fn();
    await new Promise((r) => setTimeout(r, 150));
    return { result, lines };
  } finally {
    console.log = origLog;
    console.warn = origWarn;
  }
}
function diagPhases(lines: string[], route: string, entityId: string): string[] {
  return lines
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((o): o is Record<string, any> => !!o && o.tag === DIAG_TAG && o.route === route && String(o.entityId) === entityId)
    .map((o) => String(o.phase));
}

/** طلبٌ بحدٍّ زمنيّ خاصّ بالاختبار وحده — الخادمُ هو مَن يجب أن يردّ قبله. */
async function boundedFetch(url: string, init: RequestInit, guardMs: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), guardMs);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    return { aborted: false, status: res.status, text, elapsedMs: Date.now() - t0, headers: res.headers };
  } catch {
    return { aborted: true, status: -1, text: "", elapsedMs: Date.now() - t0, headers: undefined as Headers | undefined };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const root = process.cwd();
  const authSrcRaw = readFileSync(path.join(root, "server/replit_integrations/auth/replitAuth.ts"), "utf8");
  //  الحارسُ يفحص **الشيفرةَ** لا التعليقات — التعليقُ يذكر العطبَ القديم
  //  بالاسم عمداً، فتُنزَع التعليقاتُ قبل المطابقة.
  const authSrc = authSrcRaw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  // ══ أ. حارسٌ معماريّ على المصدر — رابطٌ قانونيّ، ولا إعدادَ جلسةٍ تغيّر ══
  console.log("\n── أ. المصدر: الرابطُ من resolveDatabaseUrl، والمِجمَعُ يُمرَّر، وإعداداتُ الجلسة بحرفها ──");
  check(authSrc.includes("resolveDatabaseUrl(process.env)"),
    "أ.١ **الرابطُ يُقرأ عبر resolveDatabaseUrl نفسِها التي يقرأ منها server/db.ts**");
  check(!authSrc.includes("process.env.DATABASE_URL") && !/\bconString\b/.test(authSrc),
    "أ.٢ **ولا قراءةَ خامّة لـprocess.env.DATABASE_URL ولا conString في الشيفرة بعد اليوم**");
  check(authSrc.includes("pool: sessionPool") && authSrc.includes("DB_CONNECTION_TIMEOUT_MS"),
    "أ.٣ المخزنُ يستلم المِجمَعَ المقيَّد بالثابت المشترك نفسِه");
  for (const pinned of [
    'tableName: "sessions"', "createTableIfMissing: true", "resave: false", "saveUninitialized: false",
    "rolling: true", "httpOnly: true", "secure: true", 'sameSite: "lax"', "24 * 60 * 60 * 1000",
  ]) {
    check(authSrc.includes(pinned), `أ.٤ إعدادُ الجلسة باقٍ بحرفه: ${pinned}`);
  }
  const logsUrl = authSrc.split("\n").some((l) => /console\.(log|error|warn|info)/.test(l) && /connectionString|sessionConnectionString|DATABASE_URL/.test(l));
  check(!logsUrl, "أ.٥ **ولا سطرَ طباعةٍ واحد يمرّر الرابطَ أو متغيّرَه**");

  // ══ ب. زمنُ التشغيل: الرابطُ ذاتُه الذي يستعمله المِجمَعُ الرئيسيّ ═══════
  //  (تُقارَن السلاسل ولا تُطبَع — لا رابطَ قاعدةٍ في أيّ مخرَج).
  console.log("\n── ب. زمنُ التشغيل: مِجمَعُ الجلسات على الرابط القانونيّ نفسِه ──");
  const sessionCs = (sessionPool as any).options?.connectionString;
  const mainCs = (pool as any).options?.connectionString;
  check(typeof sessionCs === "string" && sessionCs.length > 0, "ب.١ لمِجمَع الجلسات رابطٌ صريح (لا افتراضاتِ بيئةِ pg الضمنية)");
  check(sessionCs === resolveDatabaseUrl(process.env), "ب.٢ **وهو ناتجُ resolveDatabaseUrl(process.env) بالضبط**");
  check(sessionCs === mainCs, "ب.٣ **ومطابقٌ حرفياً لرابط المِجمَع الرئيسيّ**");

  // ══ ج. الأسبقيةُ نفسُها: EXTERNAL_DATABASE_URL تسبق — في عمليةٍ فرعية ═══
  //  الرابطان مشتقّان من الرابط **القانونيّ** الذي اجتاز حارسَ أمان القاعدة
  //  في هذه العملية (لا من `DATABASE_URL` الخام — قد يكون متروكاً وغيرَ صالح
  //  بجوار `EXTERNAL_DATABASE_URL` صالح، وخطأُ `new URL` يحمل النصَّ كاملاً).
  //  والعمليةُ الفرعية تعمل بـ`tsx -e` — ليست نقطةَ دخولِ `*.test.ts` فحارسُ
  //  الأمان لا يعتبرها اختباراً — لكنّها **لا تفتح اتّصالاً أصلاً**: المِجمَعان
  //  كسولان وتُقرأ خياراتُهما فقط. والمخرَجُ قيمٌ منطقية، لا روابط.
  console.log("\n── ج. أسبقيةُ EXTERNAL_DATABASE_URL — نفسُ قرار db.ts، في عمليةٍ فرعية ──");
  {
    let base: URL | null = null, ext: URL | null = null;
    try {
      const canonical = resolveDatabaseUrl(process.env) ?? "";
      base = new URL(canonical);
      ext = new URL(canonical);
      ext.searchParams.set("application_name", "ssp_external_probe");
      base.searchParams.set("application_name", "ssp_base_probe");
    } catch {
      //  لا يُطبَع الخطأُ نفسُه — قد يحمل الرابطَ بكلمة مروره.
      check(false, "ج.٠ الرابطُ القانونيّ قابلٌ للتحليل لاشتقاق رابطَي الفحص", "new URL(canonical) رمى — لا يُطبَع الرابط");
    }
    const probe = `
      Promise.all([import('./server/db.ts'), import('./server/replit_integrations/auth/replitAuth.ts')]).then(([db, auth]) => {
        const s = auth.sessionPool.options.connectionString, m = db.pool.options.connectionString;
        console.log(JSON.stringify({
          sessionUsesExternal: s === process.env.EXTERNAL_DATABASE_URL,
          sessionIgnoresPlainDatabaseUrl: s !== process.env.DATABASE_URL,
          sessionEqualsMain: s === m,
          timeout: auth.sessionPool.options.connectionTimeoutMillis,
        }));
        process.exit(0);
      }).catch((e) => { console.error('PROBE_ERR', e && e.message); process.exit(2); });
    `;
    let out: any = null;
    if (base && ext) {
      try {
        const raw = execFileSync(path.join(root, "node_modules/.bin/tsx"), ["-e", probe], {
          cwd: root, encoding: "utf8", timeout: 90_000,
          env: { ...process.env, EXTERNAL_DATABASE_URL: ext.toString(), DATABASE_URL: base.toString() },
        });
        const last = raw.trim().split("\n").filter((l) => l.startsWith("{")).pop();
        out = last ? JSON.parse(last) : null;
      } catch (e: any) {
        //  يُطبَع مخرَجُ الفحص وحده (قيمٌ منطقية أو `PROBE_ERR <رسالة>`) — لا الأمرُ
        //  ولا البيئة، فلا رابطَ يصل المخرَج.
        check(false, "ج.٠ العمليةُ الفرعية اكتملت", String(e?.stdout || e?.stderr || "").slice(0, 300));
      }
    }
    check(out?.sessionUsesExternal === true, "ج.١ **مِجمَعُ الجلسات يتبع EXTERNAL_DATABASE_URL حين تُضبَط** — لا DATABASE_URL الخام", JSON.stringify(out));
    check(out?.sessionIgnoresPlainDatabaseUrl === true, "ج.٢ ولا يقرأ DATABASE_URL وحدها حين تسبقها الأخرى");
    check(out?.sessionEqualsMain === true, "ج.٣ **ويطابق المِجمَعَ الرئيسيّ في القرار نفسِه**");
    same("ج.٤ والمهلةُ نفسُها في تلك العملية أيضاً", out?.timeout, DB_CONNECTION_TIMEOUT_MS);
  }

  // ══ د. مهلةُ اقتناءٍ محدودة ومتّسقة ═══════════════════════════════════
  console.log("\n── د. مهلةُ الاقتناء: محدودة، مطابقة للمِجمَع الرئيسيّ، ودون مهلة العميل ──");
  const sessionTimeout = (sessionPool as any).options?.connectionTimeoutMillis;
  same("د.١ **مِجمَعُ الجلسات يحمل مهلةَ اقتناءٍ = DB_CONNECTION_TIMEOUT_MS**", sessionTimeout, DB_CONNECTION_TIMEOUT_MS);
  same("د.٢ وهي نفسُها مهلةُ المِجمَع الرئيسيّ", sessionTimeout, (pool as any).options?.connectionTimeoutMillis);
  check(typeof sessionTimeout === "number" && sessionTimeout > 0, "د.٣ ومحدودةٌ فعلاً (> ٠) — لا انتظارٌ أبديّ");
  check(sessionTimeout < SAVE_ARTICLE_TIMEOUT_MS,
    `د.٤ **ودون مهلة عميل حفظ المقالة (${SAVE_ARTICLE_TIMEOUT_MS}ms)** — فيصل ردُّ الخادم قبل يأس المتصفّح`);

  // ══ هـ. حيّاً — طلبٌ حقيقيّ عبر express-session والمخزن الحقيقيّ ═══════
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار مخزن الجلسات') ON CONFLICT (id) DO NOTHING`, [B1]);
  await q(
    `INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, is_active)
     VALUES ($1, $2, $3, 'مسؤول اختبار الجلسات', 'admin', NULL, true)
     ON CONFLICT (id) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash`,
    [ADMIN, ADMIN_USERNAME, await bcrypt.hash(PLAINTEXT_PASSWORD, 10)],
  );

  const app = express();
  app.use(express.json());
  //  **لا وسيطَ جلسةٍ مُحاكاة** — `registerRoutes` يركّب express-session
  //  الحقيقيّ بمخزن connect-pg-simple الحقيقيّ فوق `sessionPool`.
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  //  نفسُ وسيط الأخطاء العامّ في server/index.ts بحرفه — هو مَن يجب أن يُنهي
  //  الطلبَ حين يمرّر express-session خطأَ المخزن عبر next(err).
  app.use((err: any, req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[express] ${req.method} ${req.path} -> ${status}:`, err?.message ?? err);
    if (!res.headersSent) res.status(status).json({ message });
  });
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  //  تُرسَل مع كلّ طلب: الكوكي `secure: true` لا يُضبَط إلّا لطلبٍ يراه Express
  //  آمناً — و`trust proxy = 1` (setupAuth) يقرأ ذلك من هذه الترويسة كما في
  //  الإنتاج خلف Cloudflare/Render.
  const https = { "x-forwarded-proto": "https" } as const;
  const poolMax: number = (sessionPool as any).options?.max ?? 10;

  try {
    // ── هـ.١ أوّلُ لمسةٍ للمخزن بعد الإقلاع، والمِجمَعُ مشبَعٌ سلفاً ────────
    //  كوكي موقَّعٌ بالسرّ الحقيقيّ لمعرّفٍ عشوائيّ: express-session **يجب** أن
    //  يسأل المخزنَ عنه (توقيعٌ صالح ⟹ store.get) — وهذا الاستعلامُ الأوّل هو
    //  ما يمرّ بفحص «هل الجدول موجود» الذي كان يُسمَّم بأوّل فشل.
    console.log("\n── هـ.١ المِجمَعُ مشبَعٌ قبل أوّل استعلامٍ للمخزن — الطلبُ يُنهى خلال المهلة لا أبداً ──");
    for (let i = 0; i < poolMax; i++) held.push(await sessionPool.connect());
    const forgedCookie = signedSessionCookie(randomBytes(16).toString("hex"));
    const first = await captureLogs(() => boundedFetch(
      `${BASE}/api/ai/knowledge/articles/123`,
      { method: "PATCH", headers: { ...https, cookie: forgedCookie, "content-type": "application/json" }, body: "{}" },
      DB_CONNECTION_TIMEOUT_MS + 7_000,
    ));
    const r1 = first.result;
    check(!r1.aborted, "هـ.١.أ **ردٌّ وصل فعلاً** — لا انتظارٌ أبديّ لاقتناء اتّصالِ مخزن الجلسات", `elapsed=${r1.elapsedMs}ms`);
    same("هـ.١.ب **٥٠٠ عبر وسيط الأخطاء العامّ** — express-session مرّر الخطأ بـnext(err)", r1.status, 500);
    check(r1.elapsedMs >= DB_CONNECTION_TIMEOUT_MS - 500 && r1.elapsedMs < DB_CONNECTION_TIMEOUT_MS + 4_000,
      `هـ.١.ج ووقع عند حدود المهلة (${DB_CONNECTION_TIMEOUT_MS}ms) لا قبلها ولا بعدها بكثير`, `elapsed=${r1.elapsedMs}ms`);
    let body1: any = null; try { body1 = JSON.parse(r1.text); } catch { /* ignore */ }
    check(typeof body1?.message === "string", "هـ.١.د والجسمُ JSON برسالةٍ — لا HTML الافتراضيّ ولا فراغ", r1.text.slice(0, 200));
    check(!r1.text.includes("postgres") && !r1.text.includes("@") && !r1.text.includes("bionic_test_pw"),
      "هـ.١.هـ **ولا رابطَ قاعدةٍ ولا كلمةَ مرورٍ في الردّ**");
    const phases1 = diagPhases(first.lines, "knowledge_article_edit", "123");
    check(phases1.includes("raw_request_arrival_before_session"), "هـ.١.و تشخيصُ PR #289 رأى الطلبَ يصل قبل الجلسة");
    check(!phases1.includes("session_middleware_completed") && !phases1.includes("route_handler_reached"),
      "هـ.١.ز **وأُنهي في طبقة الجلسة نفسِها — لم يبلغ المسارَ قطّ**", JSON.stringify(phases1));

    // ── هـ.٢ تحريرُ الاتّصالات: التعافي فوراً — فحصُ الجدول لم يُسمَّم ──────
    console.log("\n── هـ.٢ بعد تحرير الاتّصالات: المخزنُ يتعافى فوراً (لا تسميمَ بأوّل فشل) ──");
    releaseHeld();
    const r2 = await boundedFetch(`${BASE}/api/ai/knowledge/articles/123`,
      { method: "PATCH", headers: { ...https, cookie: forgedCookie, "content-type": "application/json" }, body: "{}" }, 10_000);
    check(!r2.aborted && r2.status !== 500, "هـ.٢.أ **الطلبُ التالي بالكوكي نفسِه يبلغ المسار** — لا ٥٠٠ دائم بعد الفشل الأوّل", `status=${r2.status} elapsed=${r2.elapsedMs}ms`);
    same("هـ.٢.ب ويُردّ ٤٠١ (معرّفُ جلسةٍ لا صفَّ له ⟹ لا branchSession) — المسارُ نفسُه عمل", r2.status, 401);
    check(r2.elapsedMs < 3_000, "هـ.٢.ج وفي أقلّ من ثلاث ثوانٍ", `elapsed=${r2.elapsedMs}ms`);

    // ── هـ.٣ تسجيلُ دخولٍ حقيقيّ ⟹ كوكي حقيقيّ ⟹ طلبٌ مصادَق ينجح ──────────
    console.log("\n── هـ.٣ دخولٌ حقيقيّ وكوكي حقيقيّ عبر المخزن المقيَّد ──");
    //  بحدٍّ زمنيّ أيضاً — الدخولُ يمرّ بالمخزن نفسِه، ولا طلبَ في هذا الملفّ بلا حدّ.
    const login = await boundedFetch(`${BASE}/api/verify-branch`, {
      method: "POST", headers: { ...https, "content-type": "application/json" },
      body: JSON.stringify({ branchKey: ADMIN_USERNAME, username: ADMIN_USERNAME, password: PLAINTEXT_PASSWORD }),
    }, 15_000);
    check(!login.aborted, "هـ.٣.٠ تسجيلُ الدخول أجاب خلال حدّ الاختبار", `elapsed=${login.elapsedMs}ms`);
    same("هـ.٣.أ تسجيلُ الدخول ينجح", login.status, 200);
    const loginHeaders = login.headers;
    const setCookies: string[] = typeof (loginHeaders as any)?.getSetCookie === "function"
      ? (loginHeaders as any).getSetCookie()
      : [loginHeaders?.get("set-cookie") ?? ""];
    const sidCookie = setCookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("connect.sid="));
    check(!!sidCookie, "هـ.٣.ب **والخادمُ أصدر كوكي connect.sid حقيقياً** (secure عبر x-forwarded-proto)", JSON.stringify(setCookies));
    const realCookie = sidCookie ?? "";
    const r3 = await boundedFetch(`${BASE}/api/admin/users`, { headers: { ...https, cookie: realCookie } }, 10_000);
    same("هـ.٣.ج طلبٌ مصادَق بالكوكي الحقيقيّ يُردّ ٢٠٠ — الجلسةُ تُقرأ من المخزن فعلاً", r3.status, 200);

    // ── هـ.٤ التشبّعُ في منتصف العمل — الجلسةُ الحقيقية لا تُعلَّق أبداً ───
    console.log("\n── هـ.٤ المِجمَعُ مشبَعٌ وجلسةٌ حقيقية — ردٌّ خلال المهلة، ثم تعافٍ ──");
    for (let i = 0; i < poolMax; i++) held.push(await sessionPool.connect());
    const r4 = await boundedFetch(`${BASE}/api/admin/users`, { headers: { ...https, cookie: realCookie } }, DB_CONNECTION_TIMEOUT_MS + 7_000);
    check(!r4.aborted, "هـ.٤.أ **ردٌّ وصل رغم تشبّع مِجمَع الجلسات بالكامل**", `elapsed=${r4.elapsedMs}ms`);
    same("هـ.٤.ب ٥٠٠ عبر وسيط الأخطاء — لا انتظارٌ أبديّ", r4.status, 500);
    check(r4.elapsedMs >= DB_CONNECTION_TIMEOUT_MS - 500 && r4.elapsedMs < DB_CONNECTION_TIMEOUT_MS + 4_000,
      "هـ.٤.ج وعند حدود المهلة نفسِها", `elapsed=${r4.elapsedMs}ms`);
    releaseHeld();
    const r5 = await boundedFetch(`${BASE}/api/admin/users`, { headers: { ...https, cookie: realCookie } }, 10_000);
    same("هـ.٤.د **وبعد التحرير يعود الطلبُ نفسُه ٢٠٠ فوراً** — الجلسةُ سليمة، لا أثرَ عالق", r5.status, 200);
    check(r5.elapsedMs < 3_000, "هـ.٤.هـ وفي أقلّ من ثلاث ثوانٍ", `elapsed=${r5.elapsedMs}ms`);

    // ── هـ.٥ المِجمَعُ الرئيسيّ لم يُمَسّ طوال ذلك ────────────────────────
    const mainProbe = await q(`SELECT 1 AS ok`);
    same("هـ.٥ المِجمَعُ الرئيسيّ حرٌّ ويعمل — التشبّعُ كان في مِجمَع الجلسات وحده", mainProbe.rows[0]?.ok, 1);
  } finally {
    //  التحريرُ أوّلاً: `sessionPool.end()` أدناه لا يكتمل واتّصالٌ محجوز.
    releaseHeld();
    await cleanup();
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  await sessionPool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  //  الرسالةُ والمكدّسُ فقط — لا الكائنُ كاملاً: خطأُ `new URL` مثلاً يحمل
  //  النصَّ المُدخَل كخاصّية ظاهرة، وقد يكون رابطَ قاعدةٍ بكلمة مروره.
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  releaseHeld();
  try { await cleanup(); await pool.end(); await sessionPool.end(); } catch { /* ignore */ }
  process.exit(1);
});
