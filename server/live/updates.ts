// **التحديثُ الحيّ لكلّ مستخدم — بلا «ريفريش»** (§4.cy — ٢٠٢٦-١٠-٠٩).
//
// طلبُ المالك: «اعمل كلَّ ما في التطبيق يتحدّث بدون ريفريش ولكلّ مستخدمٍ مهما كان — الريفريش ننساه غالباً وتضيع علينا أمورٌ كثيرة».
// وكان القانونُ (§4.an) يحدّث شاشةَ مَن كتب في الحال، وشاشةَ زميله **حين يعود إلى النافذة** فقط؛ والنسخةُ الجديدة من التطبيق لا تصل
// صفحةً مفتوحة إلّا بتحديثٍ يدويّ.
//
// فالخادمُ هنا:
//   • **بعد كلّ كتابةٍ تنجح** (`POST`/`PUT`/`PATCH`/`DELETE` على `/api/…` بردٍّ دون ٤٠٠) يُرسل **إشارةً بلا بيانات** — «تغيّر شيء» —
//     إلى كلّ صفحةٍ مفتوحة، فتعيد كلُّ صفحةٍ جلبَ ما تعرضه **بصلاحيات صاحبها** (فلا يصل أحداً ما ليس له).
//   • **مجمَّعةً**: كتاباتُ الثانية الواحدة إشارةٌ واحدة — فلا عاصفةَ طلبات من حلقةٍ تكتب مراراً.
//   • **ومعها رقمُ نسخة الخادم** عند كلّ اتصال: النشرُ يُعيد تشغيله، فتعود الصفحاتُ فتقرأ رقماً جديداً وتعرف أنّ نسخةً أحدث وصلت.
//   • **ونبضةٌ كلّ ٢٥ ثانية**: الوسيطُ أمام الخادم يقطع الاتصالَ الصامت بعد نحو ١٠٠ ثانية.
//
// **وحدودُه المعروفة**: الإشارةُ في ذاكرة نسخةٍ واحدة من الخادم (وهذا حالُ الإنتاج اليوم)؛ ونسختان تحتاجان قناةً مشتركة. وما يكتبه مؤقّتٌ
// في الخادم (لا طلبٌ من متصفّح) لا يُرسل إشارة — يصل الشاشةَ عند الكتابة التالية أو العودة إلى النافذة كما كان.
import fs from "fs";
import path from "path";
import type { Express, NextFunction, Request, RequestHandler, Response } from "express";

export const LIVE_HEARTBEAT_MS = 25_000;
export const LIVE_BATCH_MS = 1_000;
export const LIVE_ORIGIN_HEADER = "x-live-origin";

/**
 * كتاباتٌ **لا تغيّر بياناتِ عملٍ تُعرَض في شاشةِ غيرك** — فلا تُحرّك شاشاتِ الجميع. مرآةُ قائمة الواجهة (`LIVE_REFRESH_EXEMPT`
 * في `client/src/lib/queryClient.ts`)، ومعها الدخولُ وتبديلُ الفرع وكلمةُ المرور (تغيّر جلسةَ صاحبها وحده)، وأسئلةُ المساعد التي
 * تُجيب بنصٍّ ولا تكتب حرفاً (فُحصت في `routes.ts`: ردُّها `res.json` بلا إدراجٍ ولا تحديث)، وبطاقةُ المريض في تلغرام (قراءةٌ بـ`POST`).
 * **ولا يُضاف هنا ما يكتب** — ولو كان نادراً: الويب هوك يربط المريضَ بتلغرام والاستقبالُ ينظر إلى ملفّه لحظتَها.
 */
const BROADCAST_EXEMPT: RegExp[] = [
  /^\/api\/ai\/chat$/,
  /^\/api\/guidance\/expense$/,
  /^\/api\/admin\/operation-reversal\/preview$/,
  /^\/api\/verify-branch$/,
  /^\/api\/verify-admin$/,
  /^\/api\/auth\/switch-branch$/,
  /^\/api\/auth\/change-password$/,
  /^\/api\/ai\/(categorize-expense|monthly-report|survey-reply|smart-audit|explain-anomaly)$/,
  /^\/api\/patient-card\/me$/,
  /^\/api\/live\//,
];

/** **أهذه كتابةٌ تستحقّ إشارةً للجميع؟** — دالّةٌ خالصة. */
export function isBroadcastWrite(method: string, rawPath: string): boolean {
  const m = String(method ?? "").toUpperCase();
  if (m !== "POST" && m !== "PUT" && m !== "PATCH" && m !== "DELETE") return false;
  const p = String(rawPath ?? "").split("?")[0].split("#")[0];
  if (!p.startsWith("/api/")) return false;
  return !BROADCAST_EXEMPT.some((re) => re.test(p));
}

interface LiveClient { res: Response; origin: string | null }
const clients = new Set<LiveClient>();
let pendingOrigins: Set<string> | null = null;
let batchTimer: ReturnType<typeof setTimeout> | null = null;

/** يُجمِّع الإشاراتِ ضمن النافذة ثمّ يرسلها مرّةً واحدة لكلّ صفحةٍ مفتوحة، ومعها مَن كتب (لتتجاهل صفحتُه صداها). */
export function notifyChange(origin: string | null): void {
  if (!pendingOrigins) pendingOrigins = new Set();
  pendingOrigins.add(origin ?? "");
  if (batchTimer) return;
  batchTimer = setTimeout(flushChanges, LIVE_BATCH_MS);
}

function flushChanges() {
  batchTimer = null;
  const origins = Array.from(pendingOrigins ?? []);
  pendingOrigins = null;
  if (!origins.length) return;
  const frame = `event: changed\ndata: ${JSON.stringify({ at: Date.now(), origins })}\n\n`;
  for (const c of Array.from(clients)) write(c, frame);
}

function write(c: LiveClient, frame: string) {
  try {
    c.res.write(frame);
    (c.res as any).flush?.();
  } catch {
    clients.delete(c);
  }
}

let cachedBuild: string | null | undefined;

/** يقرأ `<dir>/public/build-id.txt` — وبلا ملفٍّ أو بملفٍّ فارغ: لا رقم. */
export function readBuildIdFile(baseDir: string): string | null {
  try {
    const v = fs.readFileSync(path.resolve(baseDir, "public", "build-id.txt"), "utf8").trim();
    return v || null;
  } catch {
    return null;
  }
}

/**
 * **رقمُ النسخة** — يكتبه البناءُ نفسُه في `build-id.txt` بجانب الواجهة (`dist/public`، ومنها يخدمها `static.ts` بالمسار نفسِه)،
 * والواجهةُ تحمل الرقمَ ذاته (`__APP_BUILD__`). وفي التطوير لا رقم: صفحةٌ تُخدم من `vite` لا من بناءٍ له رقم.
 */
export function liveBuildId(): string | null {
  if (cachedBuild !== undefined) return cachedBuild;
  cachedBuild = process.env.NODE_ENV === "production"
    ? readBuildIdFile(typeof __dirname !== "undefined" ? __dirname : process.cwd())
    : null;
  return cachedBuild;
}

/** وسيطُ الكتابة: يُركَّب قبل النقاط، ويُرسل الإشارةَ بعد أن ينتهي الردّ بنجاح. */
export const liveBroadcastMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const p = req.originalUrl ?? req.url;
  if (isBroadcastWrite(req.method, p)) {
    const origin = typeof req.get(LIVE_ORIGIN_HEADER) === "string" ? String(req.get(LIVE_ORIGIN_HEADER)).slice(0, 64) : null;
    res.on("finish", () => {
      if (res.statusCode < 400) notifyChange(origin);
    });
  }
  next();
};

/** `GET /api/live/stream` — اتصالُ الصفحة الدائم (لمن دخل وحده). */
export function registerLiveStream(app: Express, isAuthenticated: RequestHandler) {
  app.get("/api/live/stream", isAuthenticated, (req: Request, res: Response) => {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    //  `no-transform`: وسيطُ الضغط يتخطّاه فلا يحبس الإشارات في ذاكرته حتى يمتلئ.
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    (res as any).flushHeaders?.();
    const client: LiveClient = { res, origin: typeof req.query.origin === "string" ? req.query.origin.slice(0, 64) : null };
    clients.add(client);
    write(client, `retry: 3000\nevent: hello\ndata: ${JSON.stringify({ build: liveBuildId() })}\n\n`);
    const beat = setInterval(() => write(client, `: نبضة\n\n`), LIVE_HEARTBEAT_MS);
    const close = () => { clearInterval(beat); clients.delete(client); };
    req.on("close", close);
    res.on("close", close);
  });
}

/** للاختبار: عددُ الصفحات المتّصلة، وإفراغُ الدفعة المعلَّقة فوراً. */
export function liveClientCountForTest(): number { return clients.size; }
export function flushLiveForTest(): void { if (batchTimer) { clearTimeout(batchTimer); flushChanges(); } }
export function setLiveBuildForTest(v: string | null | undefined): void { cachedBuild = v; }
