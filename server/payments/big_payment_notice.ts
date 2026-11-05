// **شرائطُ الدفعة الكبيرة** (§4.ga) — على نسق `medical/exam_queued_notice.ts`: `storage.createPayment` — الكاتبُ الوحيد لكلّ دفعةٍ جديدة —
// يسجّل مبلغَها الموجب هنا في سياق الطلب، وعند ردٍّ ناجح (٢xx) يبلغ مجموعُه الحدَّ تُكتب الترويسةُ `X-Big-Payment`.
// **ودفعةٌ في معاملةٍ تراجعت لا تُعلَن**: الردُّ حينها خطأ، والترويسةُ لا تُكتب إلّا مع النجاح. وخارجَ طلبٍ (كرون) لا شيء.

import { AsyncLocalStorage } from "async_hooks";
import type { Request, Response, NextFunction } from "express";
import { BIG_PAYMENT_HEADER, encodeBigPayment, isBigPayment } from "@shared/big_payment";

const store = new AsyncLocalStorage<{ total: number }>();

/** يُسجّل مبلغَ دفعةٍ كُتبت في هذا الطلب — الموجبُ وحده، ولا شيء خارج طلب. */
export function notePaymentAmount(amount: unknown): void {
  const s = store.getStore();
  const n = Number(amount);
  if (s && Number.isFinite(n) && n > 0) s.total += n;
}

export function bigPaymentNoticeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ctx = { total: 0 };
  const origJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode < 300 && isBigPayment(ctx.total) && !res.headersSent) {
      const name = (req.session as any)?.branchSession?.displayName ?? null;
      res.setHeader(BIG_PAYMENT_HEADER, encodeBigPayment({ amount: ctx.total, name }));
    }
    return origJson(body);
  }) as any;
  store.run(ctx, () => next());
}
