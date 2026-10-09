// **التحديثُ الحيّ لكلّ مستخدم — بلا «ريفريش»** (§4.cy) — `npm run test:live-updates`.
//
// حيٌّ على النقاط الحقيقية (منفذ ٦٩٧٥) وخلف وسيط الضغط كما في الإنتاج. يحرس:
//   ق — القواعدُ الصافية في الخادم: أيُّ كتابةٍ تستحقّ إشارةً للجميع، وقراءةُ رقم النسخة.
//   أ — الاتصالُ لمن دخل وحده: بلا جلسة ٤٠١، وحسابٌ عُطِّل ٤٠١ (قراءةُ الحساب حيّاً تسبقه).
//   ب — الاتصال: نوعُه `text/event-stream` بلا ضغطٍ يحبسه، وأوّلُه «hello» برقم النسخة، ويُعَدّ ثمّ يُنزَع عند الإغلاق.
//   ج — كتابةٌ تنجح ⟵ إشارةٌ لكلّ صفحةٍ مفتوحة ومعها مَن كتب؛ وكتابتان في الثانية نفسِها ⟵ إشارةٌ واحدة.
//   د — لا إشارة: كتابةٌ ردّت بخطأ (٤٠٠ و٤٠٣)، وقراءةٌ، ونقطةٌ مستثناة لا تكتب.
//   و — الواجهة (`client/src/lib/live_updates.ts`): الصدى يُهمَل، والمخفيّةُ لا تُحدَّث، والنافذةُ المفتوحة تؤجّل، ولا أكثرَ من
//       تحديثٍ كلَّ ثلاث ثوانٍ، والاتصالُ العائد يُحدِّث، والنسخةُ الأحدث تُعاد وحدها آمنةً ولا تُعاد مرّتين.
import express from "express";
import compression from "compression";
import fs from "fs";
import os from "os";
import path from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  LIVE_BATCH_MS, LIVE_HEARTBEAT_MS, isBroadcastWrite, liveClientCountForTest, readBuildIdFile, setLiveBuildForTest,
} from "./live/updates";
import {
  LIVE_MIN_GAP_MS, LIVE_IDLE_RELOAD_MS, hasUnsavedText, isBusyDom, isNewerBuild, reconnectDelay, shouldAutoReload, shouldIgnoreRemote,
  startLiveUpdates,
} from "../client/src/lib/live_updates";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PORT = 6975;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9751;
const ADMIN = 9752, REC = 9753, OFF = 9754;
const IDS = [ADMIN, REC, OFF];
const PREFIX = "tstlive-";

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  await q(`DELETE FROM physio_exercises WHERE code LIKE $1`, [PREFIX + "%"]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

interface Frame { event: string; data: any }
interface Stream { status: number; headers: Headers; frames: Frame[]; close: () => void }

/** يفتح اتصالَ الصفحة كما يفتحه المتصفّح، ويقرأ الإطاراتِ وهي تصل. */
async function openStream(session: string | null, origin: string): Promise<Stream> {
  const ac = new AbortController();
  const headers: Record<string, string> = { accept: "text/event-stream", "accept-encoding": "gzip, deflate, br" };
  if (session) headers["x-test-session"] = session;
  const r = await fetch(`${BASE}/api/live/stream?origin=${encodeURIComponent(origin)}`, { headers, signal: ac.signal });
  const frames: Frame[] = [];
  if (r.ok && r.body) {
    void (async () => {
      const reader = r.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const raw = buf.slice(0, i);
            buf = buf.slice(i + 2);
            let event = "message";
            const data: string[] = [];
            for (const line of raw.split("\n")) {
              if (line.startsWith(":")) continue;
              if (line.startsWith("event: ")) event = line.slice(7);
              else if (line.startsWith("data: ")) data.push(line.slice(6));
            }
            if (!data.length) continue;
            let parsed: any = data.join("\n");
            try { parsed = JSON.parse(parsed); } catch { /* نصّ */ }
            frames.push({ event, data: parsed });
          }
        }
      } catch { /* أُغلق */ }
    })();
  } else {
    try { await r.text(); } catch { /* */ }
  }
  return { status: r.status, headers: r.headers, frames, close: () => ac.abort() };
}

async function waitFor(pred: () => boolean, ms = 3000): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (pred()) return true; await sleep(25); }
  return pred();
}

const changed = (s: Stream) => s.frames.filter((f) => f.event === "changed");

// ══ عنصرُ صفحةٍ مزيَّف لفحوص الواجهة ═══════════════════════════════════════════════════════════
function fakeDoc(o: { overlay?: boolean; active?: any; hidden?: boolean; fields?: any[] } = {}) {
  const listeners: Record<string, Function[]> = {};
  return {
    overlay: o.overlay ?? false,
    activeElement: o.active ?? null,
    hidden: o.hidden ?? false,
    //  خاناتٌ في الصفحة (للعدّ «بالمسح»): الإعادةُ لا تنظر إليها — تنظر إلى ما كُتب فيه وحده.
    fields: o.fields ?? [],
    querySelectorAll() { return this.fields; },
    get visibilityState() { return this.hidden ? "hidden" : "visible"; },
    querySelector(sel: string) { return this.overlay && sel.includes('role="dialog"') ? {} : null; },
    addEventListener(t: string, fn: Function) { (listeners[t] ??= []).push(fn); },
    removeEventListener(t: string, fn: Function) { listeners[t] = (listeners[t] ?? []).filter((f) => f !== fn); },
    fire(t: string, ev?: unknown) { for (const fn of listeners[t] ?? []) fn(ev); },
  };
}
const input = (value: string, extra: Record<string, unknown> = {}) => ({ tagName: "INPUT", type: "text", value, disabled: false, readOnly: false, closest: () => null, ...extra });

/** ساعةٌ مزيَّفة ومؤقّتاتٌ تتقدّم بيد الاختبار. */
function fakeClock() {
  let now = 1_000_000;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void; every?: number }>();
  const api = {
    now: () => now,
    setTimeout: (fn: () => void, ms: number) => { const id = ++seq; timers.set(id, { at: now + Math.max(0, ms), fn }); return id; },
    clearTimeout: (id: number) => { timers.delete(id); },
    setInterval: (fn: () => void, ms: number) => { const id = ++seq; timers.set(id, { at: now + ms, fn, every: ms }); return id; },
    clearInterval: (id: number) => { timers.delete(id); },
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        let next: [number, { at: number; fn: () => void; every?: number }] | null = null;
        for (const e of Array.from(timers.entries())) if (e[1].at <= end && (!next || e[1].at < next[1].at)) next = e;
        if (!next) break;
        now = next[1].at;
        if (next[1].every) next[1].at = now + next[1].every; else timers.delete(next[0]);
        next[1].fn();
      }
      now = end;
    },
  };
  return api;
}

class FakeES {
  static all: FakeES[] = [];
  readyState = 0;
  onerror: (() => void) | null = null;
  listeners: Record<string, ((ev: any) => void)[]> = {};
  constructor(public url: string) { FakeES.all.push(this); }
  addEventListener(t: string, fn: (ev: any) => void) { (this.listeners[t] ??= []).push(fn); }
  emit(t: string, data: unknown) { this.readyState = 1; for (const fn of this.listeners[t] ?? []) fn({ data: JSON.stringify(data) }); }
  fail() { this.readyState = 2; this.onerror?.(); }
  close() { this.readyState = 2; }
}

function harness(o: { doc?: any; appBuild?: string } = {}) {
  FakeES.all = [];
  const clock = fakeClock();
  const doc = o.doc ?? fakeDoc();
  const store = new Map<string, string>();
  const out = { refreshes: 0, reloads: 0, updates: [] as string[] };
  const stop = startLiveUpdates({
    EventSourceCtor: FakeES, doc, win: { addEventListener() {}, removeEventListener() {} },
    now: clock.now, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, setInterval: clock.setInterval, clearInterval: clock.clearInterval,
    refresh: () => { out.refreshes++; }, reload: () => { out.reloads++; }, onUpdateAvailable: (b) => { out.updates.push(b); },
    storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } },
    tabId: "tab-me", appBuild: o.appBuild ?? "build-A",
  });
  return { clock, doc, out, stop, es: () => FakeES.all[FakeES.all.length - 1], store };
}

async function main() {
  // ══ ق — القواعدُ الصافية في الخادم ══════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصافية في الخادم ──");
  same("ق.١ الكتابةُ على `/api/…` تستحقّ إشارة — والقراءةُ لا",
    [isBroadcastWrite("POST", "/api/patients"), isBroadcastWrite("put", "/api/visits/3?x=1"), isBroadcastWrite("PATCH", "/api/x"),
      isBroadcastWrite("DELETE", "/api/payments/9"), isBroadcastWrite("GET", "/api/patients"), isBroadcastWrite("HEAD", "/api/x")],
    [true, true, true, true, false, false]);
  same("ق.٢ ما ليس من `/api/` لا يُرسل إشارة",
    [isBroadcastWrite("POST", "/login"), isBroadcastWrite("POST", "/apix/a"), isBroadcastWrite("POST", "")], [false, false, false]);
  same("ق.٣ المستثناةُ لا تُرسل: المساعد، وتلميحاتُ المصروف، ومعاينةُ التصحيح، والدخولُ وتبديلُ الفرع وكلمةُ المرور، وأسئلةُ المساعد، وبطاقةُ المريض، والاتصالُ نفسُه",
    ["/api/ai/chat", "/api/guidance/expense", "/api/admin/operation-reversal/preview", "/api/verify-branch", "/api/verify-admin",
      "/api/auth/switch-branch", "/api/auth/change-password", "/api/ai/monthly-report", "/api/ai/smart-audit", "/api/ai/survey-reply",
      "/api/ai/categorize-expense", "/api/ai/explain-anomaly", "/api/patient-card/me", "/api/live/stream"].map((p) => isBroadcastWrite("POST", p)),
    Array(14).fill(false));
  same("ق.٤ وما يكتب يبقى خارج الاستثناء — ولو شابه اسمُه: معرفةُ المساعد، واقتراحُ الخطّة، وويب هوك تلغرام (يربط المريض)",
    ["/api/ai/knowledge/articles", "/api/patients/5/physio-plans/suggest", "/api/integrations/telegram/patient/webhook", "/api/ai/chat/extra"]
      .map((p) => isBroadcastWrite("POST", p)), [true, true, true, true]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "live-build-"));
  fs.mkdirSync(path.join(tmp, "public"));
  const noFile = readBuildIdFile(tmp);
  fs.writeFileSync(path.join(tmp, "public", "build-id.txt"), "  abc123-xyz \n");
  const withFile = readBuildIdFile(tmp);
  fs.writeFileSync(path.join(tmp, "public", "build-id.txt"), "   ");
  same("ق.٥ رقمُ النسخة من `public/build-id.txt` بجانب الخادم — وبلا ملفٍّ أو فارغاً: لا رقم", [noFile, withFile, readBuildIdFile(tmp)], [null, "abc123-xyz", null]);
  fs.rmSync(tmp, { recursive: true, force: true });
  check(LIVE_HEARTBEAT_MS < 100_000 && LIVE_HEARTBEAT_MS >= 10_000, "ق.٦ النبضةُ أقصرُ من مهلة الوسيط (Cloudflare يقطع الصامتَ بعد ~١٠٠ ثانية)", String(LIVE_HEARTBEAT_MS));

  // ══ الإعداد ═════════════════════════════════════════════════════════════════════════
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار التحديث الحيّ')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
           VALUES ($1, 'live-admin', 'x', 'المسؤول', 'admin', NULL, '[]', true),
                  ($2, 'live-rec', 'x', 'استقبال', 'reception', $4, $5::jsonb, true),
                  ($3, 'live-off', 'x', 'معطَّل', 'reception', $4, $5::jsonb, false)`,
    [ADMIN, REC, OFF, B1, JSON.stringify([B1])]);
  const S = {
    admin: hdr({ userId: ADMIN, displayName: "المسؤول", role: "admin", branchId: null, isAdmin: true, permissions: {} }),
    rec: hdr({ userId: REC, displayName: "استقبال", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
    off: hdr({ userId: OFF, displayName: "معطَّل", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
  };
  const app = express();
  //  كما في `server/index.ts`: الضغطُ أوّلاً — والاتصالُ يجب أن يتخطّاه وإلّا حُبست الإشاراتُ في ذاكرته.
  app.use(compression());
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    //  وبلا ترويسة: جلسةٌ فارغة كزائرٍ لم يدخل (وسيطُ الجلسة الحقيقيّ يحتاج سرّاً لا تحمله بيئةُ الاختبار).
    req.session = { destroy: (cb: () => void) => cb() };
    if (h) { try { req.session.branchSession = JSON.parse(Buffer.from(h, "base64").toString("utf8")); } catch { /* */ } }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  const call = async (method: string, p: string, session: string, body?: unknown, origin?: string) => {
    const headers: Record<string, string> = { "content-type": "application/json", "x-test-session": session };
    if (origin) headers["x-live-origin"] = origin;
    const r = await fetch(`${BASE}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const exercise = (code: string) => ({ code: PREFIX + code, nameAr: "تمرين اختبار", nameEn: "Test exercise", kind: "strength", region: "hip", steps: "خطوة" });

  const streams: Stream[] = [];
  try {
    // ══ أ — الاتصالُ لمن دخل وحده ════════════════════════════════════════════════════════════
    console.log("\n── أ. الاتصالُ لمن دخل وحده ──");
    const anon = await openStream(null, "anon");
    same("أ.١ بلا جلسة: ٤٠١", anon.status, 401);
    const off = await openStream(S.off, "off");
    same("أ.٢ حسابٌ عُطِّل: ٤٠١ — قراءةُ الحساب حيّاً تسبق الاتصال", off.status, 401);

    // ══ ب — الاتصال ══════════════════════════════════════════════════════════════════════════
    console.log("\n── ب. الاتصال ──");
    setLiveBuildForTest("build-B");
    const a = await openStream(S.admin, "tab-A");
    const b = await openStream(S.rec, "tab-B");
    streams.push(a, b);
    same("ب.١ يُفتح بـ٢٠٠ للمسؤول وللاستقبال", [a.status, b.status], [200, 200]);
    check(String(a.headers.get("content-type")).startsWith("text/event-stream"), "ب.٢ نوعُه `text/event-stream`", String(a.headers.get("content-type")));
    check(!a.headers.get("content-encoding") && /no-transform/.test(String(a.headers.get("cache-control"))),
      "ب.٣ بلا ضغط ولو طلبه المتصفّح (`no-transform`) — فلا تُحبس الإشارات", `${a.headers.get("content-encoding")} · ${a.headers.get("cache-control")}`);
    const hello = await waitFor(() => a.frames.some((f) => f.event === "hello") && b.frames.some((f) => f.event === "hello"), 1500);
    check(hello, "ب.٤ أوّلُ ما يصل «hello» — في الحال لا بعد امتلاء ذاكرة");
    same("ب.٥ ومعه رقمُ نسخة الخادم", a.frames.find((f) => f.event === "hello")?.data, { build: "build-B" });
    same("ب.٦ والصفحتان معدودتان", liveClientCountForTest(), 2);

    // ══ ج — كتابةٌ تنجح ⟵ إشارة ════════════════════════════════════════════════════════════════
    console.log("\n── ج. كتابةٌ تنجح ⟵ إشارةٌ للجميع ──");
    const w1 = await call("POST", "/api/physio/exercises", S.admin, exercise("one"), "tab-A");
    same("ج.١ الكتابةُ نفسُها نجحت", w1.status, 200);
    const got1 = await waitFor(() => changed(a).length === 1 && changed(b).length === 1, LIVE_BATCH_MS + 1500);
    check(got1, "ج.٢ وصلت الإشارةُ الصفحتين — مَن كتب وزميلَه", JSON.stringify([changed(a).length, changed(b).length]));
    same("ج.٣ ومعها مَن كتب (لتُهمل صفحتُه صداها) — بلا بيانات", Object.keys(changed(b)[0]?.data ?? {}).sort().concat(changed(b)[0]?.data?.origins ?? []),
      ["at", "origins", "tab-A"]);
    const w2 = await call("POST", "/api/physio/exercises", S.admin, exercise("two"), "tab-A");
    const w3 = await call("POST", "/api/physio/exercises", S.admin, exercise("three"), "tab-C");
    same("ج.٤ كتابتان متتاليتان نجحتا", [w2.status, w3.status], [200, 200]);
    await waitFor(() => changed(b).length >= 2, LIVE_BATCH_MS + 1500);
    await sleep(LIVE_BATCH_MS + 300);
    same("ج.٥ وفي الثانية نفسِها ⟵ إشارةٌ واحدة تجمع الكاتبَين", [changed(b).length, (changed(b)[1]?.data?.origins ?? []).slice().sort()],
      [2, ["tab-A", "tab-C"]]);

    // ══ د — لا إشارة ════════════════════════════════════════════════════════════════════════════
    console.log("\n── د. ما لا يُرسل إشارة ──");
    const before = changed(b).length;
    const bad = await call("POST", "/api/physio/exercises", S.admin, { code: PREFIX + "bad" }, "tab-A");
    const denied = await call("POST", "/api/physio/exercises", S.rec, exercise("denied"), "tab-B");
    const read = await call("GET", "/api/physio/exercises", S.admin);
    const exempt = await call("POST", "/api/guidance/expense", S.admin, { description: "وقود مولدة", amount: 1000 });
    same("د.١ ردّت كما يُتوقّع: ٤٠٠ و٤٠٣ و٢٠٠ و٢٠٠", [bad.status, denied.status, read.status, exempt.status], [400, 403, 200, 200]);
    await sleep(LIVE_BATCH_MS + 600);
    same("د.٢ ولا إشارةَ من أيٍّ منها — الخطأُ لم يغيّر شيئاً، والقراءةُ والمستثناةُ لا تكتب", changed(b).length - before, 0);

    // ══ ب (تكملة) — الإغلاق ═══════════════════════════════════════════════════════════════════
    a.close(); b.close();
    const gone = await waitFor(() => liveClientCountForTest() === 0, 2000);
    check(gone, "ب.٧ وتُنزَع الصفحةُ حين تُغلق — لا اتصالَ ميّتاً يُكتب إليه", String(liveClientCountForTest()));
  } finally {
    for (const s of streams) s.close();
    setLiveBuildForTest(undefined);
  }

  // ══ و — الواجهة ═══════════════════════════════════════════════════════════════════════════════
  console.log("\n── و. الواجهة ──");
  same("و.١ الصدى: دفعةٌ كلُّها من هذا التبويب تُهمَل، وفيها غيرُه أو بلا مصدر لا تُهمَل",
    [shouldIgnoreRemote(["me"], "me"), shouldIgnoreRemote(["me", "me"], "me"), shouldIgnoreRemote(["me", "x"], "me"),
      shouldIgnoreRemote([""], ""), shouldIgnoreRemote([], "me"), shouldIgnoreRemote(null, "me")],
    [true, true, false, false, false, false]);
  same("و.٢ النسخةُ الأحدث: رقمٌ مختلف من خادمٍ له رقم، والصفحةُ من بناء — لا «dev» ولا رقمٌ غائب",
    [isNewerBuild("b2", "b1"), isNewerBuild("b1", "b1"), isNewerBuild(null, "b1"), isNewerBuild("b2", "dev"), isNewerBuild("  ", "b1")],
    [true, false, false, false, false]);
  same("و.٣ الإعادةُ التلقائية: آمنةٌ و(مخفيّةٌ أو خاملةٌ دقيقتين)، ولا مرّتين لرقمٍ واحد",
    [shouldAutoReload({ busy: false, unsaved: false, hidden: true, idleMs: 0, alreadyReloadedForThis: false }),
      shouldAutoReload({ busy: false, unsaved: false, hidden: false, idleMs: LIVE_IDLE_RELOAD_MS, alreadyReloadedForThis: false }),
      shouldAutoReload({ busy: false, unsaved: false, hidden: false, idleMs: LIVE_IDLE_RELOAD_MS - 1, alreadyReloadedForThis: false }),
      shouldAutoReload({ busy: true, unsaved: false, hidden: true, idleMs: 1e9, alreadyReloadedForThis: false }),
      shouldAutoReload({ busy: false, unsaved: true, hidden: true, idleMs: 1e9, alreadyReloadedForThis: false }),
      shouldAutoReload({ busy: false, unsaved: false, hidden: true, idleMs: 1e9, alreadyReloadedForThis: true })],
    [true, true, false, false, false, false]);
  same("و.٤ مشغول: نافذةٌ مفتوحة، أو خانةٌ مركَّزةٌ فيها نصّ أو داخل نموذج — وخانةُ بحثٍ فارغة لا تحبس، ولا مربّعُ اختيار",
    [isBusyDom(fakeDoc({ overlay: true })), isBusyDom(fakeDoc({ active: input("أحمد") })), isBusyDom(fakeDoc({ active: input("", { closest: () => ({}) }) })),
      isBusyDom(fakeDoc({ active: input("") })), isBusyDom(fakeDoc({ active: input("x", { type: "checkbox" }) })), isBusyDom(fakeDoc())],
    [true, true, true, false, false, false]);
  same("و.٥ نصٌّ لم يُحفَظ: خانةٌ كتب فيها وفيها نصّ — والمعطّلةُ وللقراءة وحدها والفارغةُ والمنزوعةُ من الصفحة لا",
    [hasUnsavedText([input(""), input("ملاحظة")]), hasUnsavedText([input("x", { readOnly: true }), input("y", { disabled: true }), input("  ")]),
      hasUnsavedText([{ tagName: "TEXTAREA", value: "نصّ" }]), hasUnsavedText([input("حُفظ وأُغلق", { isConnected: false })])],
    [true, false, true, false]);
  same("و.٦ مهلةُ إعادة الاتصال تتضاعف من ٣ ثوانٍ حتى دقيقة", [0, 1, 2, 5, 30].map(reconnectDelay), [3000, 6000, 12000, 60000, 60000]);

  {
    const h = harness();
    check(h.es().url.includes("origin=tab-me"), "و.٧ يفتح الاتصالَ بهويّة التبويب", h.es().url);
    h.es().emit("hello", { build: "build-A" });
    h.clock.advance(10);
    same("و.٨ أوّلُ «hello» بالنسخة نفسِها: لا تحديثَ ولا شريط", [h.out.refreshes, h.out.updates.length], [0, 0]);
    h.es().emit("changed", { origins: ["tab-me"] });
    h.clock.advance(10);
    same("و.٩ صدى كتابتي لا يُحدِّث (حدّثتها كتابتُها في الحال)", h.out.refreshes, 0);
    h.es().emit("changed", { origins: ["tab-me", "tab-other"] });
    h.clock.advance(10);
    same("و.١٠ وكتابةُ زميلي تُحدِّث شاشتي", h.out.refreshes, 1);
    h.es().emit("changed", { origins: ["tab-other"] });
    h.clock.advance(10);
    same("و.١١ والثانيةُ في الثواني الثلاث تنتظر…", h.out.refreshes, 1);
    h.clock.advance(LIVE_MIN_GAP_MS);
    same("و.١٢ …ثمّ تقع مرّةً واحدة", h.out.refreshes, 2);
    h.doc.hidden = true;
    h.es().emit("changed", { origins: ["tab-other"] });
    h.clock.advance(LIVE_MIN_GAP_MS * 2);
    same("و.١٣ والصفحةُ المخفيّة لا تُحدَّث (العودةُ إليها تُعيد الجلب)", h.out.refreshes, 2);
    h.doc.hidden = false;
    h.doc.overlay = true;
    h.es().emit("changed", { origins: ["tab-other"] });
    h.clock.advance(LIVE_MIN_GAP_MS * 3);
    same("و.١٤ ونافذةٌ مفتوحة تؤجّله — فلا يُعاد ملءُ نموذجٍ يكتبه الموظّف", h.out.refreshes, 2);
    h.doc.overlay = false;
    h.clock.advance(2000);
    same("و.١٥ وحين تُغلق يقع", h.out.refreshes, 3);
    h.es().emit("hello", { build: "build-A" });
    h.clock.advance(LIVE_MIN_GAP_MS + 10);
    same("و.١٦ واتصالٌ عاد بعد انقطاع يُحدِّث مرّةً — ربّما فاتته إشارات", h.out.refreshes, 4);
    const first = h.es();
    first.fail();
    h.clock.advance(3000);
    check(FakeES.all.length === 2 && h.es() !== first, "و.١٧ واتصالٌ أُغلق (ردٌّ بغير ٢٠٠) يُعاد بيدنا بعد مهلة", String(FakeES.all.length));
    h.stop();
    h.es().emit("changed", { origins: ["tab-other"] });
    h.clock.advance(LIVE_MIN_GAP_MS * 2);
    same("و.١٨ وبعد الإيقاف لا شيء", h.out.refreshes, 4);
  }
  {
    //  تاريخُ اليوم ورقمٌ افتراضيّ مملوءان سلفاً في صفحة تقرير — لم يكتبهما أحد.
    const prefilled = harness({ doc: fakeDoc({ fields: [input("2026-10-09", { type: "date" }), input("0", { type: "number" })] }) });
    prefilled.es().emit("hello", { build: "build-NEW" });
    prefilled.clock.advance(LIVE_IDLE_RELOAD_MS + 1_000);
    same("و.١٩أ والقيمةُ المملوءةُ سلفاً (لم يكتبها أحد) لا تمنع الإعادة", prefilled.out.reloads, 1);
    prefilled.stop();
    const h = harness();
    const field = input("اسمٌ لم يُحفظ");
    h.doc.fire("input", { target: field });
    h.es().emit("hello", { build: "build-NEW" });
    h.clock.advance(LIVE_IDLE_RELOAD_MS + 20_000);
    same("و.١٩ نسخةٌ أحدث ونصٌّ كتبه الموظّف: يظهر الشريط ولا تُعاد الصفحةُ وحدها", [h.out.updates, h.out.reloads], [["build-NEW"], 0]);
    (field as any).isConnected = false;
    h.clock.advance(15_000);
    same("و.٢٠ وحين يُحفظ فتُغلق نافذتُه (والصفحةُ خاملة) تُعاد وحدها", h.out.reloads, 1);
    h.stop();
    const again = harness({ doc: fakeDoc({ hidden: true }) });
    for (const [k, v] of Array.from(h.store.entries())) again.store.set(k, v);
    again.es().emit("hello", { build: "build-NEW" });
    again.clock.advance(60_000);
    same("و.٢١ ولا تُعاد مرّتين لرقمٍ واحد — فلا حلقةَ إن بقي الخادمُ يقول رقماً لا تصله الصفحة", again.out.reloads, 0);
    again.stop();
    const hidden = harness({ doc: fakeDoc({ hidden: true }) });
    hidden.es().emit("hello", { build: "build-NEW" });
    same("و.٢٢ والصفحةُ المخفيّةُ بلا نصّ تُعاد في الحال", hidden.out.reloads, 1);
    hidden.stop();
  }

  await cleanup();
  console.log(failures ? `\n❌ ${failures} فحصاً فشل` : "\n✅ كل فحوص التحديث الحيّ لكلّ مستخدم نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch { /* */ }
  process.exit(1);
});
