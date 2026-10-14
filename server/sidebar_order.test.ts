// **ترتيبُ الشريط الجانبيّ لكلّ حساب** (ترحيل ١٤٦، §4.ed) — `npm run test:sidebar-order`.
//
// يحرس:
//   ق — القواعدُ الصافية (`shared/sidebar_order.ts`): قراءةُ المرسَل، والتطبيقُ بلا إسقاطٍ ولا إضافة، والفقرةُ الجديدة بجانب جارتها،
//       والتحريكُ بين الظاهر والمخفيّةُ في مكانها.
//   ش — مصدرُ الشريط (`Sidebar.tsx`): الترتيبُ قبل التصفية (فلا يُظهر فقرةً لا يملكها صاحبُها)، ومساراتُ الفقرات بلا تكرار.
//   أ — النقاطُ حيّةً (منفذ ٧٠١٤): كلُّ حسابٍ يحفظ ترتيبَه ويقرؤه وحده، و`null` يعيده أصليّاً، والمرفوضُ ٤٠٠ لا يحفظ نصفَه،
//       وبلا حساب لا حفظ، وبلا جلسة ٤٠١.
//   ب — الإشارة: الحفظُ يصل صفحاتِ صاحبه وحدها (`sidebar-order`) ولا «changed» لأحد؛ والواجهةُ تجلب ترتيبَه وحده.
import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { LIVE_BATCH_MS, isBroadcastWrite } from "./live/updates";
import { isLiveRefreshWrite } from "../client/src/lib/queryClient";
import { startLiveUpdates } from "../client/src/lib/live_updates";
import {
  SIDEBAR_ORDER_MAX, applySidebarOrder, isSidebarHref, moveSidebarItem, normalizeSidebarOrder, readSidebarOrder,
} from "@shared/sidebar_order";

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

const PORT = 7014;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9781;
const U1 = 9782, U2 = 9783;
const IDS = [U1, U2];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [IDS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

interface Frame { event: string }
interface Stream { status: number; frames: Frame[]; close: () => void }

async function openStream(session: string, origin: string): Promise<Stream> {
  const ac = new AbortController();
  const r = await fetch(`${BASE}/api/live/stream?origin=${encodeURIComponent(origin)}`,
    { headers: { accept: "text/event-stream", "x-test-session": session }, signal: ac.signal });
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
            const ev = raw.split("\n").find((l) => l.startsWith("event: "));
            if (ev) frames.push({ event: ev.slice(7) });
          }
        }
      } catch { /* أُغلق */ }
    })();
  }
  return { status: r.status, frames, close: () => ac.abort() };
}

async function waitFor(pred: () => boolean, ms = 3000): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (pred()) return true; await sleep(25); }
  return pred();
}

async function main() {
  // ══ ق — القواعدُ الصافية ══════════════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصافية ──");
  same("ق.١ المسار: يبدأ بـ`/`، بلا مسافة، ولا `//` (عنوانٌ خارجيّ)، وفي حدّ الطول",
    ["/", "/patients", "/physio/protocols", "patients", "//evil.com", "/a b", "", 5, null, "/" + "x".repeat(200)].map(isSidebarHref),
    [true, true, true, false, false, false, false, false, false, false]);
  same("ق.٢ المرسَل: قائمةٌ بلا تكرار (الأوّلُ يبقى)، و`null` والفارغةُ = الأصليّ",
    [normalizeSidebarOrder(["/b", "/a", "/b"]), normalizeSidebarOrder(null), normalizeSidebarOrder([])], [["/b", "/a"], null, null]);
  same("ق.٣ **والمرفوضُ كلُّه لا نصفُه**: ليس قائمة، أو فيه غيرُ مسار، أو فوق الحدّ ⟵ `undefined`",
    [normalizeSidebarOrder("/a"), normalizeSidebarOrder({}), normalizeSidebarOrder(["/a", 3]), normalizeSidebarOrder(["/a", "x"]),
      normalizeSidebarOrder(Array.from({ length: SIDEBAR_ORDER_MAX + 1 }, (_, i) => `/p${i}`)), normalizeSidebarOrder(undefined)],
    [undefined, undefined, undefined, undefined, undefined, undefined]);
  same("ق.٤ والمحفوظُ الذي لا يُقرأ ⟵ الأصليّ لا خطأ", [readSidebarOrder("x"), readSidebarOrder(["/a"]), readSidebarOrder(null)], [null, ["/a"], null]);

  const items = ["/", "/a", "/b", "/c", "/d"].map((href) => ({ href }));
  const hrefs = (xs: { href: string }[]) => xs.map((x) => x.href);
  same("ق.٥ بلا ترتيب ⟵ الأصليّ كما هو (نسخةٌ لا المصفوفةُ نفسُها)",
    [hrefs(applySidebarOrder(items, null)), applySidebarOrder(items, null) !== items], [["/", "/a", "/b", "/c", "/d"], true]);
  same("ق.٦ الترتيبُ الكامل يُطبَّق بحرفه", hrefs(applySidebarOrder(items, ["/d", "/b", "/", "/c", "/a"])), ["/d", "/b", "/", "/c", "/a"]);
  same("ق.٧ **فقرةٌ أُضيفت بعد الحفظ تظهر بعد جارتها في الأصليّ** — لا آخرَ القائمة (`/c` بعد `/b`)",
    hrefs(applySidebarOrder(items, ["/d", "/b", "/", "/a"])), ["/d", "/b", "/c", "/", "/a"]);
  same("ق.٨ وبلا جارةٍ سابقة ففي الأوّل (`/` الجديدة)، ومسارٌ لا فقرةَ له يُهمَل",
    hrefs(applySidebarOrder(items, ["/c", "/gone", "/a", "/b", "/d"])), ["/", "/c", "/a", "/b", "/d"]);
  const applied = applySidebarOrder(items, ["/b", "/zzz", "/b"]);
  same("ق.٩ **لا يُسقط فقرةً ولا يضيف** — العددُ نفسُه والمساراتُ نفسُها",
    [applied.length, [...hrefs(applied)].sort()], [items.length, [...hrefs(items)].sort()]);

  const full = ["/", "/a", "/hidden", "/b", "/c"];
  const visible = ["/", "/a", "/b", "/c"];
  same("ق.١٠ «لأعلى» قبل الظاهرة التي فوقها — والمخفيّةُ في مكانها", moveSidebarItem(full, visible, "/b", "up"), ["/", "/b", "/a", "/hidden", "/c"]);
  same("ق.١١ «لأسفل» بعد التي تحتها", moveSidebarItem(full, visible, "/a", "down"), ["/", "/hidden", "/b", "/a", "/c"]);
  same("ق.١٢ «أعلى القائمة» قبل أوّل ظاهرة", moveSidebarItem(full, visible, "/c", "top"), ["/c", "/", "/a", "/hidden", "/b"]);
  same("ق.١٣ ولا حركةَ للأولى لأعلى، ولا للأخيرة لأسفل، ولا لمسارٍ غير ظاهر ⟵ `null`",
    [moveSidebarItem(full, visible, "/", "up"), moveSidebarItem(full, visible, "/", "top"), moveSidebarItem(full, visible, "/c", "down"),
      moveSidebarItem(full, visible, "/hidden", "up")], [null, null, null, null]);

  // ══ ش — مصدرُ الشريط ═══════════════════════════════════════════════════════════════════════
  console.log("\n── ش. مصدرُ الشريط ──");
  const src = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "../client/src/components/Sidebar.tsx"), "utf8");
  const menuHrefs = [...src.matchAll(/\bhref: "([^"]+)"/g)].map((m) => m[1]);
  check(menuHrefs.length >= 30 && new Set(menuHrefs).size === menuHrefs.length,
    `ش.١ **مساراتُ الفقرات بلا تكرار** (${menuHrefs.length}) — المسارُ هو مفتاحُ الترتيب`,
    menuHrefs.filter((h, i) => menuHrefs.indexOf(h) !== i).join("، "));
  check(/const orderedMenuItems = applySidebarOrder\(baseMenuItems, effectiveSidebarOrder\);/.test(src)
    && /const menuItems = orderedMenuItems\.filter\(item => \{/.test(src),
    "ش.٢ **الترتيبُ قبل التصفية** — يُرتَّب الكلُّ ثمّ تُطبَّق قواعدُ الظهور كما كانت، فلا يُظهر الترتيبُ فقرةً لا يملكها صاحبُها");
  check(!/baseMenuItems\.filter\(/.test(src), "ش.٣ ولا تصفيةَ على القائمة غيرِ المرتّبة تتجاوز الترتيب");

  // ══ الإعداد ═════════════════════════════════════════════════════════════════════════════════
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار ترتيب القائمة')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
           VALUES ($1, 'sbo-u1', 'x', 'موظّف أوّل', 'reception', $3, $4::jsonb, true),
                  ($2, 'sbo-u2', 'x', 'موظّف ثانٍ', 'reception', $3, $4::jsonb, true)`,
    [U1, U2, B1, JSON.stringify([B1])]);
  const S = {
    u1: hdr({ userId: U1, displayName: "موظّف أوّل", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
    u2: hdr({ userId: U2, displayName: "موظّف ثانٍ", role: "reception", branchId: B1, isAdmin: false, permissions: {} }),
    //  دخولُ الطوارئ القديم — بلا حساب.
    legacy: hdr({ displayName: "مسؤول", role: "admin", branchId: null, isAdmin: true, permissions: {} }),
  };
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    req.session = { destroy: (cb: () => void) => cb() };
    if (h) { try { req.session.branchSession = JSON.parse(Buffer.from(h, "base64").toString("utf8")); } catch { /* */ } }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  const call = async (method: string, p: string, session: string | null, body?: unknown) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (session) headers["x-test-session"] = session;
    const r = await fetch(`${BASE}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const stored = async (id: number) => (await q(`SELECT sidebar_order FROM system_users WHERE id = $1`, [id])).rows[0]?.sidebar_order ?? null;

  const streams: Stream[] = [];
  try {
    // ══ أ — النقاطُ حيّةً ═════════════════════════════════════════════════════════════════════
    console.log("\n── أ. النقاطُ حيّةً ──");
    same("أ.١ قبل أيّ حفظ: الأصليّ (`null`)", [(await call("GET", "/api/sidebar-order", S.u1)).json, await stored(U1)], [{ order: null }, null]);
    const put1 = await call("PUT", "/api/sidebar-order", S.u1, { order: ["/patients", "/", "/patients", "/follow-ups"] });
    same("أ.٢ **الحفظُ على الحساب** — بلا تكرار، ويُقرأ كما حُفظ",
      [put1.status, put1.json, (await call("GET", "/api/sidebar-order", S.u1)).json, await stored(U1)],
      [200, { order: ["/patients", "/", "/follow-ups"] }, { order: ["/patients", "/", "/follow-ups"] }, ["/patients", "/", "/follow-ups"]]);
    same("أ.٣ **ولكلّ حسابٍ ترتيبُه** — الثاني لم يتغيّر", [(await call("GET", "/api/sidebar-order", S.u2)).json, await stored(U2)], [{ order: null }, null]);
    const put2 = await call("PUT", "/api/sidebar-order", S.u2, { order: ["/reports"] });
    same("أ.٤ والثاني يحفظ ترتيبَه ولا يمسّ الأوّل", [put2.status, await stored(U2), await stored(U1)],
      [200, ["/reports"], ["/patients", "/", "/follow-ups"]]);
    //  **ولا يُكتب غيرُ صاحب الجلسة** — ولو أرسل معرّفاً آخر في الجسم.
    await call("PUT", "/api/sidebar-order", S.u2, { order: ["/admin"], userId: U1, id: U1 });
    same("أ.٥ **لا يرتّب أحدٌ قائمةَ أحد** — معرّفٌ في الجسم يُهمَل والكتابةُ على صاحب الجلسة", [await stored(U1), await stored(U2)],
      [["/patients", "/", "/follow-ups"], ["/admin"]]);
    const bad = await Promise.all([
      call("PUT", "/api/sidebar-order", S.u1, { order: "/patients" }),
      call("PUT", "/api/sidebar-order", S.u1, { order: ["/patients", "https://x.com"] }),
      call("PUT", "/api/sidebar-order", S.u1, { order: ["/a", 7] }),
      call("PUT", "/api/sidebar-order", S.u1, { order: Array.from({ length: SIDEBAR_ORDER_MAX + 1 }, (_, i) => `/p${i}`) }),
      call("PUT", "/api/sidebar-order", S.u1, {}),
    ]);
    same("أ.٦ **المرفوضُ ٤٠٠ ولا يحفظ نصفَه** — نصٌّ، وعنوانٌ خارجيّ، ورقم، وفوق الحدّ، وبلا `order`",
      [bad.map((r) => r.status), await stored(U1)], [[400, 400, 400, 400, 400], ["/patients", "/", "/follow-ups"]]);
    const reset = await call("PUT", "/api/sidebar-order", S.u1, { order: null });
    same("أ.٧ **«الترتيب الأصلي»**: `null` يمحو المحفوظ", [reset.status, reset.json, await stored(U1)], [200, { order: null }, null]);
    const legacyPut = await call("PUT", "/api/sidebar-order", S.legacy, { order: ["/"] });
    same("أ.٨ دخولٌ بلا حساب يرى الأصليّ ولا يحفظ", [(await call("GET", "/api/sidebar-order", S.legacy)).json, legacyPut.status],
      [{ order: null }, 400]);
    same("أ.٩ وبلا جلسة ٤٠١", [(await call("GET", "/api/sidebar-order", null)).status, (await call("PUT", "/api/sidebar-order", null, { order: null })).status],
      [401, 401]);
    const audits = (await q(`SELECT count(*)::int AS n FROM audit_log WHERE user_id = ANY($1::int[])`, [IDS])).rows[0].n;
    same("أ.١٠ وبلا سطر تدقيق — عرضٌ شخصيّ لا يمسّ بياناً ولا صلاحية", audits, 0);

    // ══ ب — الإشارة ══════════════════════════════════════════════════════════════════════════
    console.log("\n── ب. الإشارة ──");
    same("ب.١ الحفظُ مستثنىً من إشارة الجميع في الخادم والواجهة معاً (والقراءةُ ليست كتابةً أصلاً)",
      [isBroadcastWrite("PUT", "/api/sidebar-order"), isLiveRefreshWrite("PUT", "/api/sidebar-order"), isBroadcastWrite("PUT", "/api/sidebar-order/x")],
      [false, false, true]);
    const a1 = await openStream(S.u1, "tab-1a");
    const a2 = await openStream(S.u1, "tab-1b");
    const b1 = await openStream(S.u2, "tab-2");
    streams.push(a1, a2, b1);
    await waitFor(() => [a1, a2, b1].every((s) => s.frames.some((f) => f.event === "hello")));
    const count = (s: Stream, e: string) => s.frames.filter((f) => f.event === e).length;
    const before = [a1, a2, b1].map((s) => count(s, "changed"));
    const put = await call("PUT", "/api/sidebar-order", S.u1, { order: ["/follow-ups", "/"] });
    const reached = await waitFor(() => count(a1, "sidebar-order") === 1 && count(a2, "sidebar-order") === 1, 2000);
    await sleep(LIVE_BATCH_MS + 600);
    same("ب.٢ **الحفظُ يصل صفحاتِ صاحبه وحدها** — صفحتاه كلتاهما، لا صفحةُ غيره، ولا «changed» لأحد",
      [put.status, reached, count(a1, "sidebar-order"), count(a2, "sidebar-order"), count(b1, "sidebar-order"),
        [a1, a2, b1].map((s, i) => count(s, "changed") - before[i])],
      [200, true, 1, 1, 0, [0, 0, 0]]);

    //  والواجهةُ: الحدثُ يجلب ترتيبَه وحده — لا الشاشةَ كلَّها، ولو كانت نافذةٌ مفتوحة.
    class FakeES {
      static last: FakeES | null = null;
      listeners: Record<string, Function[]> = {};
      readyState = 1;
      onerror: any = null;
      constructor() { FakeES.last = this; }
      addEventListener(t: string, fn: Function) { (this.listeners[t] ??= []).push(fn); }
      close() { this.readyState = 2; }
      emit(t: string) { for (const fn of this.listeners[t] ?? []) fn({ data: "{}" }); }
    }
    const out = { refresh: 0, sidebar: 0 };
    const doc = { hidden: false, visibilityState: "visible", activeElement: null, querySelector: () => ({}), querySelectorAll: () => [],
      addEventListener() {}, removeEventListener() {} };
    const stop = startLiveUpdates({
      EventSourceCtor: FakeES, doc, win: { addEventListener() {}, removeEventListener() {} }, now: () => 0,
      setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
      refresh: () => { out.refresh++; }, reload: () => {}, onUpdateAvailable: () => {},
      onSidebarOrder: () => { out.sidebar++; }, storage: null,
    });
    FakeES.last!.emit("sidebar-order");
    same("ب.٣ **الواجهةُ تجلب الترتيبَ وحده** — والنافذةُ المفتوحة لا تؤجّله", [out.sidebar, out.refresh], [1, 0]);
    stop();
  } finally {
    for (const s of streams) s.close();
    httpServer.close();
    await cleanup();
  }
}

main()
  .catch((e) => { failures++; console.error(e); })
  .finally(async () => {
    console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
    await pool.end().catch(() => {});
    process.exit(failures ? 1 : 0);
  });
