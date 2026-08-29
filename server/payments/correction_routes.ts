// نقاطُ قرار تصحيح الدفعات — للمسؤول العامّ حصراً.
//
// **مديرُ الفرع طالبٌ لا معتمِدٌ أبداً** (القسم B من مهمّة «تحكّمٌ في تصحيح
// الدفعات» 2026-08-29): يملك تقديمَ طلبٍ عبر `PATCH`/`DELETE
// /api/payments/:id` القائمتين — انظر `server/routes.ts` — لكنّ نقاط
// القرار هنا مقفلةٌ على `session.isAdmin` وحده. **وما مِن قدرةٍ دقيقة
// (`can*`) تفتحها**: هذه سلطةٌ تمسّ الحقيقةَ الماليةَ المحفوظة، ومنحُها
// بعلمٍ في صفّ مستخدمٍ يجعلها تُوزَّع بالخطأ (نفسُ مبدأ `admin_reversal`).
//
// لا شاشةَ اعتمادٍ في هذه المهمّة (القسم G — «No admin queue UI yet»): هذه
// النقاط الخام وحدها، جاهزةٌ لواجهةٍ لاحقة.

import type { Express } from "express";
import {
  approveCorrection, rejectCorrection, listCorrectionRequests, countPendingCorrections,
  CorrectionError,
} from "./correction_store";

type Req = any;

function actorOf(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? null) as string | null,
  };
}

function isGlobalAdmin(req: Req): boolean {
  return Boolean((req.session as any)?.branchSession?.isAdmin);
}

export function registerPaymentCorrectionRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/admin/payment-corrections", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) {
      return res.status(403).json({ message: "اعتمادُ التصحيح المالي للمسؤول العام فقط" });
    }
    const status = ["pending", "approved", "rejected"].includes(String(req.query.status))
      ? (req.query.status as "pending" | "approved" | "rejected")
      : undefined;
    const rows = await listCorrectionRequests(status);
    res.json(rows);
  });

  app.get("/api/admin/payment-corrections/pending-count", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) {
      return res.status(403).json({ message: "اعتمادُ التصحيح المالي للمسؤول العام فقط" });
    }
    const count = await countPendingCorrections();
    res.json({ count });
  });

  app.post("/api/admin/payment-corrections/:id/approve", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) {
      return res.status(403).json({ message: "اعتمادُ التصحيح المالي للمسؤول العام فقط" });
    }
    try {
      const out = await approveCorrection({
        requestId: Number(req.params.id),
        actor: actorOf(req),
        decisionNote: req.body?.decisionNote ?? null,
      });
      res.json(out);
    } catch (err: any) {
      if (err instanceof CorrectionError) return res.status(err.status).json({ message: err.message });
      throw err;
    }
  });

  app.post("/api/admin/payment-corrections/:id/reject", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) {
      return res.status(403).json({ message: "اعتمادُ التصحيح المالي للمسؤول العام فقط" });
    }
    try {
      const out = await rejectCorrection({
        requestId: Number(req.params.id),
        actor: actorOf(req),
        decisionNote: req.body?.decisionNote ?? null,
      });
      res.json(out);
    } catch (err: any) {
      if (err instanceof CorrectionError) return res.status(err.status).json({ message: err.message });
      throw err;
    }
  });
}
