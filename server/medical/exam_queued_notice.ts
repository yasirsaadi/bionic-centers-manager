// **«أصبح المريض في «معايناتي»» يُقال لمَن أدخله** (§4.em — طلبُ المالك ٢٠٢٦-١٠-١٧).
//
// على نسق `patient_cases/reopen_notice.ts`: `notifyExamRequest` — البابُ الوحيد لكلّ دخولٍ إلى «معايناتي» — يسجّل المريضَ
// هنا في سياق الطلب نفسِه، وعند ردٍّ ناجح (٢xx) تُكتب الترويسةُ `X-Exam-Queued`، والواجهةُ تفتح النافذة.
// **ودخولٌ في معاملةٍ تراجعت لا يُعلَن**: الردُّ حينها خطأ، والترويسةُ لا تُكتب إلّا مع النجاح. وخارجَ طلبٍ (كرون) لا شيء.

import { AsyncLocalStorage } from "async_hooks";
import type { Request, Response, NextFunction } from "express";
import { EXAM_QUEUED_HEADER, encodeExamQueued, mergeExamQueued, type ExamQueuedNotice } from "@shared/exam_queued_notice";

const store = new AsyncLocalStorage<{ queued: ExamQueuedNotice[] }>();

/** يُسجّل مريضاً دخل «معايناتي» في هذا الطلب — لا شيء خارج طلب. */
export function noteExamQueued(n: ExamQueuedNotice): void {
  const s = store.getStore();
  if (s) s.queued = mergeExamQueued(s.queued, [n]);
}

export function examQueuedNoticeMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const ctx = { queued: [] as ExamQueuedNotice[] };
  const origJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode < 300 && ctx.queued.length > 0 && !res.headersSent) {
      res.setHeader(EXAM_QUEUED_HEADER, encodeExamQueued(ctx.queued));
    }
    return origJson(body);
  }) as any;
  store.run(ctx, () => next());
}
