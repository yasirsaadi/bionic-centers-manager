// **إعادةُ فتح القسم تُقال للموظّف** (§4.ar البند ٣ — قرارُ المالك «أ»).
//
// كلُّ بابٍ يعيد فتح قسمٍ مغلق يمرّ بـ`reopenClosedCaseAuditedTx`، وهي تسجّل الفتحَ هنا في سياق الطلب نفسِه.
// وعند ردٍّ ناجح (٢xx) يُكتب الترويسةُ `X-Case-Reopened`، والواجهةُ (`client/src/main.tsx`) تُظهر تنبيهاً لأيّ طلبٍ
// يحملها — فلا تحتاج كلُّ شاشةٍ كوداً خاصّاً، ولا يفوت بابٌ جديدٌ الإعلانُ.
// **وفتحٌ في معاملةٍ تراجعت لا يُعلَن**: الردُّ حينها خطأ، والترويسةُ لا تُكتب إلّا مع النجاح.

import { AsyncLocalStorage } from "async_hooks";
import type { Request, Response, NextFunction } from "express";

const store = new AsyncLocalStorage<{ reopened: string[] }>();

/** يُسجّل قسماً أُعيد فتحُه في هذا الطلب — لا شيء خارج طلب. */
export function noteCaseReopened(label: string): void {
  const s = store.getStore();
  if (s && !s.reopened.includes(label)) s.reopened.push(label);
}

export const REOPEN_HEADER = "X-Case-Reopened";

export function caseReopenNoticeMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const ctx = { reopened: [] as string[] };
  const origJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode < 300 && ctx.reopened.length > 0 && !res.headersSent) {
      res.setHeader(REOPEN_HEADER, encodeURIComponent(ctx.reopened.join("، ")));
      res.setHeader("Access-Control-Expose-Headers", REOPEN_HEADER);
    }
    return origJson(body);
  }) as any;
  store.run(ctx, () => next());
}
