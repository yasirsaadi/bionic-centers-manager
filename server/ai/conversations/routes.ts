//  نقاطُ سجلّ محادثات المساعد — **«محادثاتي» لكلّ موظّف، و«كلُّ المحادثات»
//  للمسؤول العام وحده** (قرارُ المالك ٢٠٢٦-٠٩-٢١).
//
//  ══ ولا `branch_manager` في «كلُّ المحادثات» ════════════════════════════
//  قياسٌ على معرفة المساعد (٤.n) لا اختراع: «قرارُ معرفة المساعد للمسؤول
//  العام حصراً»، وهذه أحسَسُ منها — فيها **نصُّ ما كتبه الموظّف**. ومديرُ
//  الفرع سلطتُه تشغيليةٌ في نطاقه، وقراءةُ ما يكتبه فريقُه للمساعد ليست من
//  ذلك النطاق. **والقرارُ في `shared/ai_conversations.ts` لا هنا** — دالّةٌ
//  خالصة تُختبَر دخلاً وخرجاً، يستوردها الخادمُ والشاشةُ معاً.
//
//  ══ ولا كتابةَ في أيّ نقطةٍ هنا إطلاقاً ═════════════════════════════════
//  الكتابةُ الوحيدة `recordExchange`، وتقع داخل `/api/ai/chat` وحدها. وهذا
//  الملفُّ **قراءةٌ محضة** — لا `POST` ولا `PATCH` ولا `DELETE`: سجلٌّ يُقرأ
//  ولا يُحرَّر، وإلّا صار مَن يُقرأ عليه قادراً على تنقيحه.
//
//  ══ و`next(err)` لا رفضٌ عارٍ — الطلبُ يُردّ عليه دائماً ═════════════════
//  (مراجعةٌ آلية على #٣٧٢، ٢٠٢٦-٠٩-٢١.) Express 4 لا يلتقط رفضَ الوعود من
//  معالجٍ غير متزامن، ومعالِجُ `unhandledRejection` في `index.ts` **لا يملك
//  `res` أصلاً** فلا يستطيع الردّ — يُبقي العمليةَ حيّةً ويترك ذلك الطلبَ
//  **بلا أيّ استجابة إلى الأبد**. فعطلُ قاعدةٍ عابر (مهلةُ قفل، انقطاعُ
//  اتّصال) كان يجعل شاشةَ السجلّ تدور بلا نهاية بدل أن تقول «تعذّر».
//  والمخرجُ نفسُه المستعمَل في `server/ai/knowledge/routes.ts` بحرفه:
//  `try/catch` حول كلّ معالجٍ يلمس القاعدة، و`next(err)` يوصله إلى وسيط
//  الأخطاء العامّ فيُرسَل ردٌّ حقيقيّ. **والحُرّاسُ قبله كما هي**: ٤٠٣
//  و٤٠٠ تبقى ردوداً مبكّرة لا استثناءات.

import type { Express } from "express";
import {
  AI_CHAT_CONVERSATION_ID_MAX, boundedPageSize,
  canReadAllConversations, canReadOwnConversations,
  decodeConversationCursor, sanitizeConversationId,
} from "@shared/ai_conversations";
import {
  getConversationThread, listAllConversations, listConversationUsers,
  listMyConversations,
} from "./store";

type Req = any;

function sessionOf(req: Req) {
  return (req.session as any)?.branchSession ?? null;
}

/** رقمُ مستخدمٍ اختياريٌّ من الاستعلام — والمشوَّهُ يُردّ ولا يُقرأ «الكلّ». */
const INVALID = Symbol("invalid");
function parseUserId(v: unknown): number | null | typeof INVALID {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return INVALID;
  return n;
}

export function registerAiConversationRoutes(app: Express, isAuthenticated: any) {
  //  ══ «محادثاتي» — كلُّ موظّفٍ مصادَق، صفوفُه هو وحدها ═══════════════════
  //  الترشيحُ بـ`userId` **من الجلسة** لا من الطلب: لا معرّفَ في استعلامٍ
  //  ولا جسمٍ يفتح صفوفَ زميل.
  app.get("/api/ai/conversations/mine", isAuthenticated, async (req: Req, res, next) => {
    try {
      const s = sessionOf(req);
      if (!canReadOwnConversations(s)) {
        return res.status(403).json({ error: "لا تملك صلاحية قراءة سجلّ المحادثات" });
      }
      //  **والمؤشّرُ المشوَّه يُقرأ غياباً لا خطأً** — رابطٌ بائتٌ من تبويبٍ
      //  قديم يُعيد الصفحةَ الأولى، وذاك أهونُ من شاشةٍ فارغة بخطأ.
      const page = await listMyConversations(
        s.userId, boundedPageSize(req.query?.limit), undefined,
        decodeConversationCursor(req.query?.cursor),
      );
      res.json({ rows: page.rows, nextCursor: page.nextCursor });
    } catch (err) {
      next(err);
    }
  });

  //  ══ «كلُّ المحادثات» — المسؤولُ العام وحده ════════════════════════════
  app.get("/api/ai/conversations", isAuthenticated, async (req: Req, res, next) => {
    try {
      if (!canReadAllConversations(sessionOf(req))) {
        return res.status(403).json({ error: "سجلّ محادثات الموظّفين للمسؤول العام وحده" });
      }
      const userId = parseUserId(req.query?.userId);
      if (userId === INVALID) {
        return res.status(400).json({ error: "رقم المستخدم غير صحيح" });
      }
      const page = await listAllConversations({
        limit: boundedPageSize(req.query?.limit),
        userId,
        cursor: decodeConversationCursor(req.query?.cursor),
      });
      res.json({ rows: page.rows, nextCursor: page.nextCursor });
    } catch (err) {
      next(err);
    }
  });

  //  ══ مَن له محادثات — لمرشِّح شاشة المسؤول وحدها ═══════════════════════
  app.get("/api/ai/conversations/users", isAuthenticated, async (req: Req, res, next) => {
    try {
      if (!canReadAllConversations(sessionOf(req))) {
        return res.status(403).json({ error: "سجلّ محادثات الموظّفين للمسؤول العام وحده" });
      }
      res.json({ users: await listConversationUsers() });
    } catch (err) {
      next(err);
    }
  });

  //  ══ خيطُ محادثةٍ واحدة ════════════════════════════════════════════════
  //  **ومعرّفُ التجميع ليس إذناً**: غيرُ المسؤول يُرشَّح برقم نفسِه دائماً،
  //  فمعرّفُ محادثةِ زميلٍ يُرجع مصفوفةً فارغة لا صفوفَه.
  app.get("/api/ai/conversations/thread/:conversationId", isAuthenticated, async (req: Req, res, next) => {
    try {
      const s = sessionOf(req);
      const isAdmin = canReadAllConversations(s);
      if (!isAdmin && !canReadOwnConversations(s)) {
        return res.status(403).json({ error: "لا تملك صلاحية قراءة سجلّ المحادثات" });
      }
      const raw = String(req.params?.conversationId ?? "");
      if (raw.length > AI_CHAT_CONVERSATION_ID_MAX) {
        return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });
      }
      const conversationId = sanitizeConversationId(raw);
      if (!conversationId) {
        return res.status(400).json({ error: "معرّف المحادثة غير صحيح" });
      }
      const rows = await getConversationThread(conversationId, isAdmin ? null : s.userId);
      res.json({ rows });
    } catch (err) {
      next(err);
    }
  });
}
