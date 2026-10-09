// **التحديثُ الحيّ لكلّ مستخدم — بلا «ريفريش»** (§4.cy — ٢٠٢٦-١٠-٠٩). نصفُ الواجهة؛ ونصفُ الخادم في `server/live/updates.ts`.
//
// طلبُ المالك: «اعمل كلَّ ما في التطبيق يتحدّث بدون ريفريش ولكلّ مستخدمٍ مهما كان — الريفريش ننساه غالباً وتضيع علينا أمورٌ كثيرة».
//
// كلُّ صفحةٍ مفتوحة تفتح اتصالاً واحداً دائماً (`EventSource`) فيصلها من الخادم:
//   • **«تغيّر شيء»** بعد كلّ كتابةٍ تنجح من أيّ مستخدم ⟵ تُعيد الصفحةُ جلبَ ما تعرضه الآن (`invalidateQueries()` — الفعّالُ وحده،
//     بصلاحيات صاحب الصفحة). **وصداها هي تُهمله**: كتابتُها حدّثتها في الحال (`installLiveRefresh` في `queryClient.ts`).
//   • **ورقمُ نسخة الخادم** عند كلّ اتصال ⟵ إن خالف رقمَ هذه الصفحة فقد وصل نشرٌ جديد.
//
// **ومتى لا تُحدَّث الشاشةُ فوراً** — وهو شرطُ سلامةٍ لا تحسين:
//   • **الصفحةُ مخفيّة** (تبويبٌ آخر، أو التطبيقُ في الخلفية): لا طلبَ لشاشةٍ لا يراها أحد؛ وعند العودة يُعاد الجلبُ كلُّه
//     (`refetchOnWindowFocus: "always"`).
//   • **نافذةٌ مفتوحة أو قائمةٌ منسدلة أو كتابةٌ جارية**: نموذجٌ يُملأ من البيانات قد يُعاد ملؤه فيضيع ما كتبه الموظّف. فيُؤجَّل
//     التحديثُ حتى تُغلق النافذةُ أو يخرج من الخانة.
//   • **ولا أكثرَ من تحديثٍ كلَّ ثلاث ثوانٍ** — فحلقةُ كتاباتٍ متتابعة لا تصير عاصفةَ طلبات.
//
// **والنسخةُ الجديدة**: تُحمَّل وحدها **إن كان ذلك آمناً** — لا نافذةَ مفتوحة ولا نصَّ كتبه الموظّفُ في خانةٍ ما زالت ظاهرة — **والصفحةُ مخفيّة أو لم
// يلمسها أحدٌ دقيقتين**؛ وإلّا ظهر شريط «نسخةٌ أحدث — تحديث» ويُعاد الفحصُ كلَّ ١٥ ثانية. ولا تُعاد التحميلُ مرّتين لرقمٍ واحد
// (حارسٌ في `sessionStorage`) فلا حلقةَ إن بقي الخادمُ يقول رقماً لا تصله الصفحة.

declare const __APP_BUILD__: string | undefined;

export const LIVE_STREAM_URL = "/api/live/stream";
export const LIVE_ORIGIN_HEADER = "x-live-origin";
export const LIVE_MIN_GAP_MS = 3_000;
export const LIVE_BUSY_RECHECK_MS = 1_500;
export const LIVE_IDLE_RELOAD_MS = 120_000;
export const LIVE_UPDATE_RECHECK_MS = 15_000;
export const LIVE_RECONNECT_BASE_MS = 3_000;
export const LIVE_RECONNECT_MAX_MS = 60_000;
export const LIVE_UPDATE_EVENT = "live-update-available";
const RELOADED_FOR_KEY = "live_reloaded_for_build";

/** رقمُ نسخة هذه الصفحة — يضعه البناء (`vite.config.ts`). وخارج البناء (التطوير والاختبار) «dev»: لا يُقارَن. */
export const APP_BUILD: string = typeof __APP_BUILD__ === "string" && __APP_BUILD__ ? __APP_BUILD__ : "dev";

function makeTabId(): string {
  try {
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch { /* يسقط إلى البديل */ }
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** هويّةُ هذا التبويب — تُرسَل مع كتاباته (`x-live-origin`) ومع اتصاله، فيعرف صداه. */
export const LIVE_TAB_ID: string = makeTabId();

/** **أصدى كتابتي وحدي؟** — يُهمَل إن كانت كلُّ الكتابات في الدفعة من هذا التبويب. ودفعةٌ بلا مصدرٍ معلوم لا تُهمَل. */
export function shouldIgnoreRemote(origins: unknown, self: string): boolean {
  if (!Array.isArray(origins) || origins.length === 0) return false;
  return origins.every((o) => typeof o === "string" && o !== "" && o === self);
}

/** **أوصلت نسخةٌ أحدث؟** — رقمُ الخادم موجودٌ ومختلف، وهذه الصفحةُ من بناءٍ له رقم. */
export function isNewerBuild(server: unknown, mine: string): boolean {
  if (typeof server !== "string" || !server.trim()) return false;
  if (!mine || mine === "dev") return false;
  return server.trim() !== mine;
}

const NON_TEXT_INPUTS = new Set(["button", "checkbox", "radio", "submit", "reset", "file", "range", "color", "hidden", "image"]);

function isEditable(el: any): boolean {
  if (!el || typeof el !== "object") return false;
  const tag = String(el.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return !el.disabled && !el.readOnly;
  if (tag === "INPUT") return !NON_TEXT_INPUTS.has(String(el.type ?? "text").toLowerCase()) && !el.disabled && !el.readOnly;
  return el.isContentEditable === true;
}

function valueOf(el: any): string {
  if (el?.isContentEditable === true) return String(el.textContent ?? "");
  return String(el?.value ?? "");
}

/** نافذةٌ أو قائمةٌ منسدلة مفتوحة (Radix يُزيل المغلقةَ من الصفحة). */
const OPEN_OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-app-dialog]';

/**
 * **أالموظّفُ في منتصف شيء؟** — نافذةٌ مفتوحة، أو خانةٌ مركَّزٌ فيها **وفيها نصّ أو هي داخل نموذج**. فخانةُ بحثٍ فارغة عليها المؤشّرُ
 * دائماً لا تحبس التحديث.
 */
export function isBusyDom(doc: any): boolean {
  if (!doc) return false;
  try {
    if (doc.querySelector?.(OPEN_OVERLAY)) return true;
    const a = doc.activeElement;
    if (isEditable(a)) {
      if (valueOf(a).trim() !== "") return true;
      if (typeof a.closest === "function" && a.closest("form")) return true;
    }
  } catch { /* لا يُفشل الفحصُ شيئاً */ }
  return false;
}

/**
 * **أفي الصفحة نصٌّ كتبه الموظّفُ ولم يُحفَظ؟** — من الخانات **التي كتب فيها بيده** (حدثُ `input`) وما زالت في الصفحة وفيها نصّ.
 * إعادةُ التحميل تمحوه، فلا إعادةَ تلقائية. **ولا تُعدّ القيمُ المملوءةُ سلفاً** (تاريخُ اليوم في التقارير، رقمٌ افتراضيّ): تلك لم يكتبها أحد،
 * ولو عُدّت لما أُعيدت صفحةُ تقريرٍ قطّ.
 */
export function hasUnsavedText(typedFields: Iterable<any>): boolean {
  try {
    for (const el of Array.from(typedFields ?? [])) {
      if (el?.isConnected === false) continue;
      if (isEditable(el) && valueOf(el).trim() !== "") return true;
    }
  } catch { /* لا يُفشل الفحصُ شيئاً */ }
  return false;
}

/** **أتُعاد الصفحةُ الآن لنسخةٍ أحدث؟** — دالّةٌ خالصة: آمنةٌ (لا نافذة ولا نصّ) **و**(مخفيّةٌ أو خاملةٌ دقيقتين). */
export function shouldAutoReload(p: { busy: boolean; unsaved: boolean; hidden: boolean; idleMs: number; alreadyReloadedForThis: boolean }): boolean {
  if (p.alreadyReloadedForThis) return false;
  if (p.busy || p.unsaved) return false;
  return p.hidden || p.idleMs >= LIVE_IDLE_RELOAD_MS;
}

/** مهلةُ إعادة الاتصال: تتضاعف من ٣ ثوانٍ حتى دقيقة. */
export function reconnectDelay(attempt: number): number {
  const n = Math.max(0, Math.floor(attempt));
  return Math.min(LIVE_RECONNECT_MAX_MS, LIVE_RECONNECT_BASE_MS * 2 ** Math.min(n, 10));
}

export interface LiveDeps {
  EventSourceCtor: any;
  doc: any;
  win: any;
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => any;
  clearTimeout: (t: any) => void;
  setInterval: (fn: () => void, ms: number) => any;
  clearInterval: (t: any) => void;
  /** يُعيد جلبَ ما تعرضه الصفحة (`queryClient.invalidateQueries()`). */
  refresh: () => void;
  reload: () => void;
  onUpdateAvailable: (build: string) => void;
  storage?: { getItem(k: string): string | null; setItem(k: string, v: string): void } | null;
  tabId?: string;
  appBuild?: string;
}

/** يبدأ الاستماع، ويُرجع دالّةَ الإيقاف. */
export function startLiveUpdates(d: LiveDeps): () => void {
  const self = d.tabId ?? LIVE_TAB_ID;
  const mine = d.appBuild ?? APP_BUILD;
  let es: any = null;
  let stopped = false;
  let attempt = 0;
  let connectedOnce = false;
  let retryTimer: any = null;
  let flushTimer: any = null;
  let pending = false;
  let lastRefreshAt = -Infinity;
  let lastActivityAt = d.now();
  let newBuild: string | null = null;
  let updateTimer: any = null;
  //  الخاناتُ التي كتب فيها الموظّفُ بيده — والمنزوعةُ من الصفحة تُسقَط عند كلّ فحص.
  const typed = new Set<any>();
  const typedNow = () => {
    for (const el of Array.from(typed)) if (el?.isConnected === false) typed.delete(el);
    return typed;
  };

  const hidden = () => d.doc?.visibilityState === "hidden" || d.doc?.hidden === true;

  const flush = () => {
    flushTimer = null;
    if (!pending || stopped) return;
    //  المخفيّةُ لا تُحدَّث — والعودةُ إليها تُعيد الجلبَ كلَّه.
    if (hidden()) { pending = false; return; }
    if (isBusyDom(d.doc)) { flushTimer = d.setTimeout(flush, LIVE_BUSY_RECHECK_MS); return; }
    const wait = lastRefreshAt + LIVE_MIN_GAP_MS - d.now();
    if (wait > 0) { flushTimer = d.setTimeout(flush, wait); return; }
    pending = false;
    lastRefreshAt = d.now();
    try { d.refresh(); } catch { /* زينةٌ لا شرط */ }
  };

  const requestRefresh = () => {
    pending = true;
    if (flushTimer === null) flushTimer = d.setTimeout(flush, 0);
  };

  const reloadedFor = () => { try { return d.storage?.getItem(RELOADED_FOR_KEY) ?? null; } catch { return null; } };

  const maybeReload = () => {
    if (!newBuild || stopped) return;
    const ok = shouldAutoReload({
      busy: isBusyDom(d.doc), unsaved: hasUnsavedText(typedNow()), hidden: hidden(),
      idleMs: d.now() - lastActivityAt, alreadyReloadedForThis: reloadedFor() === newBuild,
    });
    if (!ok) return;
    try { d.storage?.setItem(RELOADED_FOR_KEY, newBuild); } catch { /* بلا ذاكرة ⟵ تُعاد مرّةً على الأكثر لكلّ فتح */ }
    d.reload();
  };

  const onHello = (ev: any) => {
    attempt = 0;
    let build: unknown = null;
    try { build = JSON.parse(String(ev?.data ?? "{}"))?.build; } catch { /* بلا رقم */ }
    //  اتصالٌ عاد بعد انقطاع (نشرٌ، أو شبكة، أو هاتفٌ في الخلفية): ربّما فاتته إشارات — فيُحدَّث مرّةً.
    if (connectedOnce) requestRefresh();
    connectedOnce = true;
    if (isNewerBuild(build, mine) && newBuild !== build) {
      newBuild = String(build).trim();
      try { d.onUpdateAvailable(newBuild); } catch { /* لا يُفشل شيئاً */ }
      if (updateTimer === null) updateTimer = d.setInterval(maybeReload, LIVE_UPDATE_RECHECK_MS);
      maybeReload();
    }
  };

  const onChanged = (ev: any) => {
    let origins: unknown = null;
    try { origins = JSON.parse(String(ev?.data ?? "{}"))?.origins; } catch { /* دفعةٌ بلا مصدر */ }
    if (shouldIgnoreRemote(origins, self)) return;
    //  والمخفيّةُ تُسقطها `flush` قبل أن تُحدِّث — والعودةُ إليها تُعيد الجلبَ كلَّه.
    requestRefresh();
  };

  const connect = () => {
    if (stopped) return;
    retryTimer = null;
    try {
      es = new d.EventSourceCtor(`${LIVE_STREAM_URL}?origin=${encodeURIComponent(self)}`, { withCredentials: true });
    } catch {
      scheduleReconnect();
      return;
    }
    es.addEventListener("hello", onHello);
    es.addEventListener("changed", onChanged);
    es.onerror = () => {
      //  المتصفّحُ يُعيد الاتصالَ وحده ما دام `CONNECTING`؛ و`CLOSED` (ردٌّ بغير ٢٠٠ — جلسةٌ انتهت مثلاً) لا يعود إلّا بيدنا.
      if (es && es.readyState === 2) { try { es.close(); } catch { /* */ } es = null; scheduleReconnect(); }
    };
  };

  const scheduleReconnect = () => {
    if (stopped || retryTimer !== null) return;
    retryTimer = d.setTimeout(connect, reconnectDelay(attempt++));
  };

  const onActivity = () => { lastActivityAt = d.now(); };
  const onInput = (ev: any) => { const t = ev?.target; if (isEditable(t)) typed.add(t); };
  const onVisibility = () => {
    if (!hidden() && !es && retryTimer !== null) { d.clearTimeout(retryTimer); retryTimer = null; connect(); }
    maybeReload();
  };
  const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"];
  for (const t of ACTIVITY) d.win?.addEventListener?.(t, onActivity, { passive: true, capture: true });
  d.doc?.addEventListener?.("visibilitychange", onVisibility);
  d.doc?.addEventListener?.("input", onInput, true);

  connect();

  return () => {
    stopped = true;
    if (es) { try { es.close(); } catch { /* */ } es = null; }
    if (retryTimer !== null) d.clearTimeout(retryTimer);
    if (flushTimer !== null) d.clearTimeout(flushTimer);
    if (updateTimer !== null) d.clearInterval(updateTimer);
    for (const t of ACTIVITY) d.win?.removeEventListener?.(t, onActivity, { capture: true });
    d.doc?.removeEventListener?.("visibilitychange", onVisibility);
    d.doc?.removeEventListener?.("input", onInput, true);
    typed.clear();
  };
}
