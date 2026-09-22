//  ══ تنفيذُ نقطةِ قراءةٍ قائمة **بجلسة السائل نفسِها** ═══════════════════
//
//  هذا هو الباب: المساعدُ لا يسأل قاعدةَ البيانات، يسأل **التطبيق**. فينفَّذ
//  المعالِجُ نفسُه الذي يعمل حين يضغط الموظّفُ الشاشةَ بيده — نفسُ الدالّة،
//  نفسُ الحارس، نفسُ الاستعلام، نفسُ عزل الفرع وإخفاء المحذوف وحجب المال.
//
//  ══ ولماذا هذا أأمنُ من أداةٍ نكتبها ════════════════════════════════════
//
//  كلُّ أداةٍ في `tools/registry.ts` تستعلم القاعدةَ بحارسٍ كتبناه **لها
//  وحدها**، وأيُّ سهوٍ في واحدٍ منها ثغرة (وقد وقع ذلك فعلاً ثلاثَ مرّات:
//  سجلُّ المرضى فُتح لمن لا يملكه، والتقاريرُ عُرضت للجميع). وهذا الملفّ
//  **لا يفتح باب بياناتٍ جديداً إطلاقاً** — ولا نسخةَ ثانية من الصلاحية
//  تنحرف بعد شهرين، لأن لا نسخةَ أصلاً.
//
//  ══ والجلسةُ تُمرَّر كما هي، لا تُبنى ولا تُوسَّع ═══════════════════════
//
//  الكائنُ المُمرَّر هو `req.session` الحقيقيّ بعينه. فوسيطُ «تحديثِ
//  الصلاحيات حيّاً» يُعيد قراءتَها من القاعدة كما يفعل لكلّ طلب، وحسابٌ
//  عُطِّل يُردّ ٤٠١ هنا أيضاً. **ولا حقلَ واحدٌ يُضاف أو يُبدَّل.**

import { EventEmitter } from "events";

/** ما يعود من نداءٍ واحد. */
export interface InvokeResult {
  status: number;
  body: unknown;
  /** انقضت المهلةُ قبل أن يردّ المعالِج. */
  timedOut?: boolean;
}

/** مهلةٌ صارمة — معالِجٌ لا يردّ لا يحبس جوابَ المساعد إلى الأبد. */
export const INVOKE_TIMEOUT_MS = 12_000;

const PATH_PARAM = /:([A-Za-z0-9_]+)/g;

/**
 * يملأ معاملاتِ المسار من كائنٍ يرسله النموذج.
 *
 * **ولا يُمرَّر معامِلٌ ناقصٌ إلى المسار** — مسارٌ فيه `:id` بلا قيمة يصير
 * مساراً آخر تماماً (أو يطابق نقطةً غيرَها)، فيُردّ صراحةً.
 */
export function fillPath(
  template: string, params: Record<string, unknown> | null | undefined,
): { url: string } | { error: string } {
  const missing: string[] = [];
  const url = template.replace(PATH_PARAM, (_m, key: string) => {
    const raw = params?.[key];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      missing.push(key);
      return "";
    }
    //  قيمةٌ واحدة لا مقطعُ مسار: شرطةٌ مائلة في القيمة تُغيّر النقطةَ
    //  المنادَاة، فتُرمَّز ولا تُمرَّر خاماً.
    return encodeURIComponent(String(raw));
  });
  if (missing.length > 0) {
    return { error: `ينقص هذه المعاملات: ${missing.join("، ")}` };
  }
  return { url };
}

/** يبني سلسلةَ الاستعلام من قيمٍ بسيطة — والفارغُ يُسقَط لا يُرسَل فارغاً. */
export function buildQuery(query: Record<string, unknown> | null | undefined): string {
  if (!query || typeof query !== "object") return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "object") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

/** الطلبُ الحقيقيُّ الذي وصل به سؤالُ المساعد — مصدرُ الجلسة والترويسات. */
export interface SourceRequest {
  session?: any;
  user?: any;
  headers?: Record<string, any>;
  socket?: any;
  ip?: string;
}

/**
 * ردٌّ صناعيٌّ يلتقط ما يكتبه المعالِج.
 *
 * دوالُّه **ملكٌ للكائن نفسِه** فتحجب نموذجَ Express الأصليّ بالكامل — فلا
 * يُطلَب من مقبسٍ لا وجودَ له أن يكتب بايتاً.
 */
function makeResponse(done: (r: InvokeResult) => void) {
  const headers = new Map<string, unknown>();
  let finished = false;
  const res: any = new EventEmitter();

  const finish = (body: unknown) => {
    if (finished) return res;
    finished = true;
    const out = { status: res.statusCode ?? 200, body };
    //  وسيطُ التسجيل في `index.ts` يستمع إلى «finish» — فيُبَثّ كما يُبَثّ
    //  في طلبٍ حقيقيّ، ولا يبقى مستمعٌ معلَّقاً.
    try { res.emit("finish"); } catch { /* لا يُسقط الجواب */ }
    done(out);
    return res;
  };

  res.statusCode = 200;
  res.locals = {};
  res.headersSent = false;
  res.status = (n: number) => { res.statusCode = n; return res; };
  res.json = (v: unknown) => finish(v);
  res.send = (v: unknown) => finish(v);
  res.end = (v?: unknown) => finish(v ?? null);
  res.sendStatus = (n: number) => { res.statusCode = n; return finish(null); };
  res.setHeader = (k: string, v: unknown) => { headers.set(String(k).toLowerCase(), v); return res; };
  res.getHeader = (k: string) => headers.get(String(k).toLowerCase());
  res.removeHeader = (k: string) => { headers.delete(String(k).toLowerCase()); };
  res.getHeaders = () => Object.fromEntries(headers);
  res.set = (k: any, v?: unknown) => {
    if (k && typeof k === "object") for (const [kk, vv] of Object.entries(k)) res.setHeader(kk, vv);
    else res.setHeader(k, v);
    return res;
  };
  res.header = res.set;
  res.type = () => res;
  res.vary = () => res;
  res.cookie = () => res;
  res.clearCookie = () => res;
  res.writeHead = (n: number) => { res.statusCode = n; return res; };
  res.write = () => true;
  //  إعادةُ توجيهٍ ليست جواباً يُقرأ — تُلتقط صراحةً بدل أن تُقرأ نجاحاً.
  res.redirect = (...args: any[]) => {
    const to = typeof args[0] === "number" ? args[1] : args[0];
    res.statusCode = typeof args[0] === "number" ? args[0] : 302;
    return finish({ redirect: String(to ?? "") });
  };

  return { res, isFinished: () => finished };
}

/**
 * ينفّذ نقطةَ قراءةٍ داخل العملية بجلسة السائل.
 *
 * **لا يقرّر مَن يرى ماذا** — ذاك للنقطة نفسِها. ودورُه أن يوصل الطلبَ
 * إليها كما يصلها من المتصفّح تماماً.
 */
export async function invokeCapability(params: {
  app: any;
  source: SourceRequest;
  path: string;
  pathParams?: Record<string, unknown> | null;
  query?: Record<string, unknown> | null;
  timeoutMs?: number;
}): Promise<InvokeResult> {
  const { app, source } = params;
  if (!app || typeof app.handle !== "function") {
    return { status: 500, body: { message: "تعذّر الوصول إلى التطبيق." } };
  }

  const filled = fillPath(params.path, params.pathParams);
  if ("error" in filled) return { status: 400, body: { message: filled.error } };
  const url = filled.url + buildQuery(params.query);

  return await new Promise<InvokeResult>((resolve) => {
    let settled = false;
    const settle = (r: InvokeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(r);
    };

    const timer = setTimeout(
      () => settle({ status: 504, body: { message: "تأخّرت قراءةُ البيانات." }, timedOut: true }),
      params.timeoutMs ?? INVOKE_TIMEOUT_MS,
    );

    const { res } = makeResponse(settle);

    //  ══ الطلبُ الصناعيّ ══
    //  Express يستبدل نموذجَ هذا الكائن في وسيطه الأوّل، فكلُّ ما يلزم
    //  يُوضَع **ملكاً للكائن** لا موروثاً — والمِلكُ يعلو على النموذج.
    const req: any = new EventEmitter();
    req.method = "GET";
    req.url = url;
    req.originalUrl = url;
    req.baseUrl = "";
    req.headers = { ...(source.headers ?? {}), "x-internal-capability": "1" };
    req.body = {};
    req.params = {};
    req.cookies = {};
    req.signedCookies = {};
    //  **الجلسةُ هي هي** — لا نسخةٌ ولا كائنٌ مبنيّ.
    req.session = source.session;
    req.user = source.user;
    req.socket = source.socket ?? { remoteAddress: source.ip ?? "127.0.0.1" };
    req.connection = req.socket;
    req.ip = source.ip ?? "127.0.0.1";
    req.ips = [];
    req.res = res;
    res.req = req;

    try {
      app.handle(req, res, (err?: any) => {
        if (err) {
          console.error("[ai-capability] فشلَ النداءُ الداخليّ:", err);
          return settle({ status: 500, body: { message: "تعذّرت قراءة البيانات." } });
        }
        //  لم يطابق أيُّ مسار — نقطةٌ غيرُ موجودة.
        settle({ status: 404, body: { message: "لا توجد هذه النقطة." } });
      });
    } catch (err) {
      console.error("[ai-capability] انهارَ النداءُ الداخليّ:", err);
      settle({ status: 500, body: { message: "تعذّرت قراءة البيانات." } });
    }
  });
}
