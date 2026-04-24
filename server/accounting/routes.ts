import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as ledger from "./ledger";
import { backfillJournalEntries } from "../migrations/backfill_journal_entries";
import { insertChartOfAccountSchema } from "@shared/schema";

/**
 * Accounting V2 Routes
 *
 * Professional accounting endpoints:
 * - GET /api/accounting/v2/accounts - chart of accounts
 * - POST /api/accounting/v2/accounts - create account
 * - PATCH /api/accounting/v2/accounts/:id - update account
 * - DELETE /api/accounting/v2/accounts/:id - deactivate account
 * - GET /api/accounting/v2/journal - list journal entries
 * - GET /api/accounting/v2/journal/:id - journal entry with lines
 * - POST /api/accounting/v2/journal - create manual journal entry
 * - POST /api/accounting/v2/journal/:id/reverse - reverse journal entry
 * - GET /api/accounting/v2/reports/trial-balance - trial balance
 * - GET /api/accounting/v2/reports/income-statement - income statement
 * - GET /api/accounting/v2/reports/balance-sheet - balance sheet
 * - GET /api/accounting/v2/audit - audit log
 * - GET /api/accounting/v2/periods - accounting periods
 * - POST /api/accounting/v2/periods/:id/close - close period
 * - POST /api/accounting/v2/periods/:id/reopen - reopen period
 * - POST /api/accounting/v2/backfill - one-time backfill of legacy records
 */

type AuthenticatedRequest = Request & {
  session: any;
  user?: any;
};

function requireAccountingPermission(req: AuthenticatedRequest, res: Response): boolean {
  const session = req.session?.branchSession;
  if (!session) {
    res.status(401).json({ message: "غير مصرح" });
    return false;
  }
  const perms = session.permissions;
  const isAdmin = session.isAdmin;
  if (!isAdmin && !perms?.canManageAccounting) {
    res.status(403).json({ message: "ليس لديك صلاحية إدارة المحاسبة" });
    return false;
  }
  return true;
}

function getUserContext(req: AuthenticatedRequest) {
  const session = req.session?.branchSession;
  return {
    userId: session?.userId ?? null,
    userName: session?.displayName ?? null,
    branchId: session?.branchId ?? null,
    isAdmin: session?.isAdmin ?? false,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
}

const journalLineSchema = z.object({
  accountId: z.number().int().positive(),
  debit: z.number().int().nonnegative().optional().default(0),
  credit: z.number().int().nonnegative().optional().default(0),
  description: z.string().optional(),
  branchId: z.number().int().nullable().optional(),
  patientId: z.number().int().nullable().optional(),
});

const createJournalEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.number().int().nullable().optional(),
  description: z.string().min(1),
  reference: z.string().nullable().optional(),
  lines: z.array(journalLineSchema).min(2),
});

const reverseSchema = z.object({
  reason: z.string().min(1),
  reversalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function registerAccountingV2Routes(
  app: Express,
  isAuthenticated: any
): void {
  // ==================== شجرة الحسابات ====================

  app.get("/api/accounting/v2/accounts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const accounts = await ledger.getAllAccounts(branchId);
      res.json(accounts);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ message: err.message || "خطأ" });
    }
  });

  app.get("/api/accounting/v2/accounts/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const account = await ledger.getAccountById(Number(req.params.id));
      if (!account) return res.status(404).json({ message: "الحساب غير موجود" });
      res.json(account);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/accounting/v2/accounts", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const input = insertChartOfAccountSchema.parse(req.body);
      const account = await ledger.createAccount(input);
      const ctx = getUserContext(req);
      await ledger.logAudit({
        entityType: "account",
        entityId: account.id,
        action: "create",
        userId: ctx.userId,
        userName: ctx.userName,
        branchId: ctx.branchId,
        newValues: account,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      res.json(account);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err.message || "خطأ" });
    }
  });

  app.patch("/api/accounting/v2/accounts/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const id = Number(req.params.id);
      const before = await ledger.getAccountById(id);
      if (!before) return res.status(404).json({ message: "الحساب غير موجود" });
      if (before.isSystem) {
        return res.status(403).json({ message: "لا يمكن تعديل حسابات النظام" });
      }
      const updated = await ledger.updateAccount(id, req.body);
      const ctx = getUserContext(req);
      await ledger.logAudit({
        entityType: "account",
        entityId: id,
        action: "update",
        userId: ctx.userId,
        userName: ctx.userName,
        branchId: ctx.branchId,
        oldValues: before,
        newValues: updated,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/accounting/v2/accounts/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const id = Number(req.params.id);
      const before = await ledger.getAccountById(id);
      if (!before) return res.status(404).json({ message: "الحساب غير موجود" });
      if (before.isSystem) {
        return res.status(403).json({ message: "لا يمكن تعطيل حسابات النظام" });
      }
      await ledger.deactivateAccount(id);
      const ctx = getUserContext(req);
      await ledger.logAudit({
        entityType: "account",
        entityId: id,
        action: "deactivate",
        userId: ctx.userId,
        userName: ctx.userName,
        branchId: ctx.branchId,
        oldValues: before,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== القيود اليومية ====================

  app.get("/api/accounting/v2/journal", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const entries = await ledger.getJournalEntries({
        branchId: req.query.branchId ? Number(req.query.branchId) : undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        sourceType: req.query.sourceType as string | undefined,
        status: req.query.status as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/v2/journal/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const data = await ledger.getJournalEntryWithLines(Number(req.params.id));
      if (!data) return res.status(404).json({ message: "القيد غير موجود" });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/accounting/v2/journal", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const input = createJournalEntrySchema.parse(req.body);
      const ctx = getUserContext(req);

      const entry = await ledger.createJournalEntry({
        ...input,
        sourceType: "manual",
        createdBy: ctx.userId,
      });

      await ledger.logAudit({
        entityType: "journal_entry",
        entityId: entry.id,
        action: "create",
        userId: ctx.userId,
        userName: ctx.userName,
        branchId: ctx.branchId,
        newValues: entry,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      res.json(entry);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: err.message || "فشل إنشاء القيد" });
    }
  });

  app.post("/api/accounting/v2/journal/:id/reverse", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const id = Number(req.params.id);
      const input = reverseSchema.parse(req.body);
      const ctx = getUserContext(req);

      const reversal = await ledger.reverseJournalEntry(
        id,
        input.reversalDate || new Date().toISOString().split("T")[0],
        ctx.userId,
        input.reason
      );

      await ledger.logAudit({
        entityType: "journal_entry",
        entityId: id,
        action: "reverse",
        userId: ctx.userId,
        userName: ctx.userName,
        branchId: ctx.branchId,
        notes: input.reason,
        newValues: { reversalId: reversal.id },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      res.json(reversal);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: err.message || "فشل عكس القيد" });
    }
  });

  // ==================== التقارير المالية ====================

  app.get("/api/accounting/v2/reports/trial-balance", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const trial = await ledger.getTrialBalance({
        branchId: req.query.branchId ? Number(req.query.branchId) : undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });
      res.json(trial);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/v2/reports/income-statement", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate و endDate مطلوبان" });
      }
      const statement = await ledger.getIncomeStatement({
        branchId: req.query.branchId ? Number(req.query.branchId) : undefined,
        startDate,
        endDate,
      });
      res.json(statement);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/accounting/v2/reports/balance-sheet", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const asOfDate = (req.query.asOfDate as string) || new Date().toISOString().split("T")[0];
      const sheet = await ledger.getBalanceSheet({
        branchId: req.query.branchId ? Number(req.query.branchId) : undefined,
        asOfDate,
      });
      res.json(sheet);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== سجل التدقيق ====================

  app.get("/api/accounting/v2/audit", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const entries = await ledger.getAuditLog({
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId ? Number(req.query.entityId) : undefined,
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        branchId: req.query.branchId ? Number(req.query.branchId) : undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== الفترات المحاسبية ====================

  app.get("/api/accounting/v2/periods", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const periods = await ledger.getAccountingPeriods();
      res.json(periods);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/accounting/v2/periods/:id/close", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const id = Number(req.params.id);
      const ctx = getUserContext(req);
      if (!ctx.isAdmin) {
        return res.status(403).json({ message: "فقط المسؤول يستطيع إغلاق الفترات" });
      }
      const period = await ledger.closePeriod(id, ctx.userId);
      await ledger.logAudit({
        entityType: "period",
        entityId: id,
        action: "close",
        userId: ctx.userId,
        userName: ctx.userName,
        newValues: period,
      });
      res.json(period);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/accounting/v2/periods/:id/reopen", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    if (!requireAccountingPermission(req, res)) return;
    try {
      const id = Number(req.params.id);
      const ctx = getUserContext(req);
      if (!ctx.isAdmin) {
        return res.status(403).json({ message: "فقط المسؤول يستطيع إعادة فتح الفترات" });
      }
      const period = await ledger.reopenPeriod(id);
      await ledger.logAudit({
        entityType: "period",
        entityId: id,
        action: "reopen",
        userId: ctx.userId,
        userName: ctx.userName,
        newValues: period,
      });
      res.json(period);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ==================== Backfill (إداري فقط) ====================

  app.post("/api/accounting/v2/backfill", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin) {
      return res.status(403).json({ message: "فقط المسؤول يستطيع تشغيل Backfill" });
    }
    try {
      const result = await backfillJournalEntries();
      await ledger.logAudit({
        entityType: "system",
        entityId: 0,
        action: "backfill",
        userId: ctx.userId,
        userName: ctx.userName,
        newValues: result,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
