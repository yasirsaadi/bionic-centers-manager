// نقطةُ المراجعة اليومية — قراءةٌ فقط، للمسؤول العامّ حصراً.
//
// **بلا أفعالٍ إطلاقاً**: لا اعتماد ولا رفض ولا تصحيح من هذه الصفحة —
// نقطةُ `GET` واحدة، ولا نقطةَ كتابةٍ ثانية بجوارها. المراقبةُ لا تُغيّر شيئاً.

import type { Express } from "express";
import { getDailyReviewEvents } from "./store";
import { isDailyReviewServiceFilter } from "@shared/daily_review";

type Req = any;

function isGlobalAdmin(req: Req): boolean {
  return Boolean((req.session as any)?.branchSession?.isAdmin);
}

/** يوم بغداد الحاليّ، `YYYY-MM-DD` — الافتراضُ حين لا يُطلب تاريخٌ صريح. */
function todayInBaghdad(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(v: unknown): string {
  return typeof v === "string" && DATE_RE.test(v) ? v : todayInBaghdad();
}

function parseBranchId(v: unknown): number | null {
  if (v === undefined || v === null || v === "" || v === "all") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export function registerDailyReviewRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/daily-review", isAuthenticated, async (req: Req, res) => {
    if (!isGlobalAdmin(req)) {
      return res.status(403).json({ message: "المراجعة اليومية للمسؤول العام فقط" });
    }
    const date = parseDate(req.query.date);
    const branchId = parseBranchId(req.query.branchId);
    const serviceType = isDailyReviewServiceFilter(req.query.serviceType) ? req.query.serviceType : "all";

    const rows = await getDailyReviewEvents({ date, branchId, serviceType });
    res.json({ date, branchId, serviceType, rows });
  });
}
