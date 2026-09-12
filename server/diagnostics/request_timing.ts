// أداةُ تشخيصٍ مؤقّتة — تعليقُ طلبين إداريَّين إلى الأبد في الإنتاج
// (٢٠٢٦-٠٩-١٢): تعديلُ مقالة معرفة (`PATCH /api/ai/knowledge/articles/:id`)
// وحذفُ مستخدم نظام (`DELETE /api/admin/users/:id`). كلاهما يبقى معلَّقاً
// بلا استجابةٍ ولا خطأ — والهدفُ تحديدُ الطبقة المشتركة التي يتعلّقان
// عندها فعلياً: تحميلُ الجلسة، اقتناءُ اتّصالٍ من مِجمَع قاعدة البيانات،
// أم إغلاقُ الاستجابة نفسِه.
//
// ══ تجريدٌ عابرٌ لا سطحُ عملٍ دائم ═══════════════════════════════════════
// يُزال بالكامل بعد تحديد مصدر التعليق — **لا يغيّر سلوك أيّ طريق ولا
// إعداد مِجمَعٍ ولا جلسة**، مجرّد سطورِ سجلٍّ منسدلة على طريقين محدَّدين
// بالاسم والطريقة فقط. أيُّ طلبٍ آخر يمرّ عبر `diagRawArrivalMiddleware`/
// `diagSessionCompletedMiddleware` بفحص نمطٍ واحد رخيص ثم `next()` فوراً.
//
// ══ ما لا يُسجَّل أبداً ════════════════════════════════════════════════════
// لا نصّ مقالة، لا عنوانها، لا اسم مستخدمٍ ولا بريده ولا دوره، لا رابط
// قاعدة بيانات، لا سرّ. **معرّفُ الصفّ الرقميّ وحده** (نفسُ ما كانت تسمح
// به المهمّة الأصلية لـ«معرّف المقالة») والزمنُ المنقضي بالمللي ثانية.
//
// ══ معرّفُ ارتباطٍ واحد لكلّ طلب — لا اثنان ══════════════════════════════
// يُولَّد مرّةً واحدة عند أوّل نقطة اعتراضٍ ممكنة (`diagRawArrivalMiddleware`،
// قبل وسيط الجلسة) ويُحمَل على `req` نفسِه — فكلّ الأطوار اللاحقة (انتهاءُ
// الجلسة، وصولُ المعالج، أطوارُ قاعدة البيانات، الاستجابة، `finish`/`close`)
// تشترك في المعرّف نفسِه وتُقاس من الزمن نفسِه، فتُقرأ كسلسلةٍ واحدة متّصلة
// في السجلّات لا شذراتٍ متفرّقة.

import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

//  ══ لا توسيعَ عامّاً لنوع `Express.Request` ═══════════════════════════
//  الملفّاتُ المجاورة (`server/routes.ts`, `server/ai/knowledge/routes.ts`)
//  تستعمل `any`/`(req.session as any)` باستمرار بدل توسيع الأنواع
//  الرسمية — نفسُ النمط هنا يتفادى أيّ تعارضٍ في دمج الإعلانات العامّة مع
//  إصدار `@types/express` الحاليّ. `__diag` تُقرأ وتُكتَب عبر `(req as any)`.

//  مُصدَّرٌ — الاختبارُ المؤقّت يلتقط سطور السجلّ ويميّزها بهذه القيمة
//  الثابتة نفسِها بدل تكرار سلسلةٍ حرفية قد تنحرف عن هذا الملفّ لاحقاً.
export const DIAG_TAG = "diag_admin_write_hang_probe";
const SLOW_WARNING_MS = 10_000;

interface DiagRouteMatcher {
  method: string;
  pattern: RegExp;
  route: string;
}

// ══ الطريقان المشخَّصان حصراً ═══════════════════════════════════════════
// إضافةُ طريقٍ ثالث لاحقاً تعني سطراً واحداً هنا فقط — لا تعديلَ في أيّ
// وسيطٍ أو معالج.
const DIAG_ROUTES: DiagRouteMatcher[] = [
  { method: "PATCH", pattern: /^\/api\/ai\/knowledge\/articles\/[^/]+$/, route: "knowledge_article_edit" },
  { method: "DELETE", pattern: /^\/api\/admin\/users\/[^/]+$/, route: "admin_user_delete" },
];

interface DiagState {
  requestId: string;
  startedAt: number;
  route: string;
  /** معرّفُ الصفّ الرقميّ من نهاية المسار — لا اسمَ ولا بيانات أخرى. */
  entityId: string;
}

function matchDiagRoute(req: Request): DiagRouteMatcher | undefined {
  return DIAG_ROUTES.find((r) => r.method === req.method && r.pattern.test(req.path));
}

/** سطرٌ منظَّمٌ JSON واحد — معرّفُ الارتباط، الطورُ، الزمنُ المنقضي، ومعرّفُ الصفّ الرقميّ وحده. */
function logDiagPhase(state: DiagState, phase: string, level: "log" | "warn" = "log") {
  const line = JSON.stringify({
    tag: DIAG_TAG,
    route: state.route,
    requestId: state.requestId,
    phase,
    elapsedMs: Date.now() - state.startedAt,
    entityId: state.entityId,
  });
  if (level === "warn") console.warn(line); else console.log(line);
}

/**
 * الوسيطُ الأوّل — **يُركَّب قبل `setupAuth(app)` مباشرةً** (قبل وسيط
 * الجلسة في ترتيب التسجيل)، فيسجّل «وصولَ الطلب الخام» قبل أن يلمسه أيّ
 * كودِ جلسة. طلبٌ لا يطابق أحد الطريقين المشخَّصين يمرّ فوراً بفحص نمطٍ
 * واحد رخيص — بلا أثرٍ ولا تكلفةٍ تُذكَر على بقيّة حركة الموقع.
 *
 * وهنا أيضاً — لا في المعالج — تُركَّب مراقبتا `finish`/`close`: هذه أوّل
 * نقطةٍ نرى فيها كائنَ `res` لهذا الطلب، وتركيبُهما هنا يضمن تسجيلَهما
 * دائماً بصرف النظر عن أين يتعثّر الطلبُ لاحقاً (حتى لو انفجر المعالجُ قبل
 * الوصول إلى أيّ طورٍ آخر). والتحذيرُ المحدود (١٠ث) يُسلَّح هنا وحدها
 * ويُلغى عند أوّل حدثٍ من الحدثين.
 */
export function diagRawArrivalMiddleware(req: Request, res: Response, next: NextFunction) {
  const match = matchDiagRoute(req);
  if (!match) return next();

  const entityId = req.path.split("/").filter(Boolean).pop() ?? "";
  const state: DiagState = {
    requestId: randomUUID(),
    startedAt: Date.now(),
    route: match.route,
    entityId,
  };
  (req as any).__diag = state;
  logDiagPhase(state, "raw_request_arrival_before_session");

  const slowTimer = setTimeout(() => {
    logDiagPhase(state, `slow_request_warning_exceeded_${SLOW_WARNING_MS}ms`, "warn");
  }, SLOW_WARNING_MS);
  const clearSlowTimer = () => clearTimeout(slowTimer);

  //  `finish` يقع عند تسليم الاستجابة فعلياً للنظام؛ و`close` عند إغلاق
  //  الاتّصال (يقع بعد `finish` عادةً، ويقع **وحده بلا `finish` أبداً** إن
  //  قطع العميلُ الاتّصال قبل استجابةٍ حقيقية — فرقٌ يُشخَّص لا يُخمَّن).
  res.on("finish", () => { logDiagPhase(state, "http_response_finish"); clearSlowTimer(); });
  res.on("close", () => { logDiagPhase(state, "http_response_close"); clearSlowTimer(); });

  next();
}

/**
 * يُركَّب مباشرةً بعد `await setupAuth(app)` — **لا تعديلَ في `setupAuth`
 * نفسِها ولا في إعداد الجلسة**، مجرّد مراقبةٍ لما بعدها. يسجّل «انتهاء
 * وسيط الجلسة» فقط للطلبين المشخَّصين (`req.__diag` موجودةٌ فعلاً).
 */
export function diagSessionCompletedMiddleware(req: Request, _res: Response, next: NextFunction) {
  const state: DiagState | undefined = (req as any).__diag;
  if (state) logDiagPhase(state, "session_middleware_completed");
  next();
}

/** يُنادى من داخل معالج الطريق نفسِه فور الوصول إليه — أوّلُ سطرٍ فيه. */
export function diagRouteHandlerReached(req: Request) {
  const state: DiagState | undefined = (req as any).__diag;
  if (state) logDiagPhase(state, "route_handler_reached");
}

/** طورٌ عامّ يُنادى يدوياً من داخل المعالج (بدء/نهاية عملية قاعدة البيانات، قبل الاستجابة). */
export function diagPhase(req: Request, phase: string) {
  const state: DiagState | undefined = (req as any).__diag;
  if (state) logDiagPhase(state, phase);
}
