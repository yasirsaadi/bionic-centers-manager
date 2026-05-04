import type { Express, Request, Response } from "express";
import { z } from "zod";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  branches,
  devices,
  dailySessions,
  sessionCounts,
  monthlyTargets,
} from "@shared/schema";
import { logAudit } from "../accounting/ledger";
import { getTodayIraq } from "../timezone";
import {
  getSession,
  getUserContext,
  accessibleBranchesFor,
  canAccessBranch,
  canEnterSessions,
  canManageSessionTargets,
  canViewSessionsReport,
  requirePerm,
  resolveBranchId,
  requireBranchWriteAccess,
} from "./permissions";

/**
 * Session Tracking Routes
 *
 * /api/session-tracking/*
 *
 * Per-branch / per-day / per-shift counts of physiotherapy device usage,
 * plus monthly targets per branch+device. Reception enters today's
 * counts; branch managers edit historical data and set targets; admin
 * does everything across all branches.
 *
 * Auth: all routes require a logged-in branchSession. Per-route
 * permission checks are inline using helpers from ./permissions.
 *
 * All writes append to audit_log via logAudit() with entityType
 * = 'daily_session' or 'monthly_target'.
 */

// 24-hour edit window for reception users. Branch managers and admins
// bypass this.
const RECEPTION_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const shiftSchema = z.enum(["morning", "evening"]);
const yearSchema = z.coerce.number().int().min(2020).max(2100);
const monthSchema = z.coerce.number().int().min(1).max(12);

const upsertDailySchema = z.object({
  branchId: z.coerce.number().int().positive(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: shiftSchema,
  counts: z
    .array(
      z.object({
        deviceId: z.coerce.number().int().positive(),
        count: z.coerce.number().int().min(0).max(100000),
      }),
    )
    .max(50),
});

const upsertTargetsSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  year: yearSchema,
  month: monthSchema,
  targets: z
    .array(
      z.object({
        deviceId: z.coerce.number().int().positive(),
        targetCount: z.coerce.number().int().min(0).max(1_000_000),
      }),
    )
    .max(50),
});

const copyTargetsSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  fromYear: yearSchema,
  fromMonth: monthSchema,
  toYear: yearSchema,
  toMonth: monthSchema,
});

export function registerSessionTrackingRoutes(
  app: Express,
  isAuthenticated: any,
): void {
  // ==================== المراجع ====================

  // List of branches the requester may act on (used to populate the
  // branch picker on the entry page).
  app.get(
    "/api/session-tracking/branches",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const allowed = accessibleBranchesFor(req);
        const rows = await db.select().from(branches).orderBy(asc(branches.name));
        const filtered = allowed === null ? rows : rows.filter((b) => allowed.includes(b.id));
        res.json(filtered);
      } catch (err) {
        console.error("[session-tracking] /branches error", err);
        res.status(500).json({ message: "تعذّر جلب الفروع" });
      }
    },
  );

  // List of active devices in display order.
  app.get(
    "/api/session-tracking/devices",
    isAuthenticated,
    async (_req: Request, res: Response) => {
      try {
        const rows = await db
          .select()
          .from(devices)
          .where(eq(devices.isActive, true))
          .orderBy(asc(devices.displayOrder), asc(devices.id));
        res.json(rows);
      } catch (err) {
        console.error("[session-tracking] /devices error", err);
        res.status(500).json({ message: "تعذّر جلب الأجهزة" });
      }
    },
  );

  // ==================== جلسات اليوم ====================

  // Current state for a (branch, date, shift). Returns the session row
  // (if any) and one count row per active device — zero-filled for
  // devices that don't have a row yet so the UI can render the full grid.
  app.get(
    "/api/session-tracking/daily",
    isAuthenticated,
    async (req: Request, res: Response) => {
      if (!requirePerm(req, res, (r) => canEnterSessions(r) || canViewSessionsReport(r))) return;
      try {
        const branchId = resolveBranchId(req, req.query.branchId);
        if (branchId === undefined || branchId === null) {
          return res.status(400).json({ message: "branchId مطلوب" });
        }
        if (!canAccessBranch(req, branchId)) {
          return res.status(403).json({ message: "لا تملك وصولاً لهذا الفرع" });
        }
        const sessionDate = String(req.query.date ?? "");
        const shiftRaw = req.query.shift;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
          return res.status(400).json({ message: "صيغة التاريخ غير صحيحة" });
        }
        const shiftParse = shiftSchema.safeParse(shiftRaw);
        if (!shiftParse.success) {
          return res.status(400).json({ message: "shift يجب أن يكون morning أو evening" });
        }
        const shift = shiftParse.data;

        const [session] = await db
          .select()
          .from(dailySessions)
          .where(
            and(
              eq(dailySessions.branchId, branchId),
              eq(dailySessions.sessionDate, sessionDate),
              eq(dailySessions.shift, shift),
            ),
          )
          .limit(1);

        const allDevices = await db
          .select()
          .from(devices)
          .where(eq(devices.isActive, true))
          .orderBy(asc(devices.displayOrder), asc(devices.id));

        let counts: { deviceId: number; count: number }[] = allDevices.map((d) => ({
          deviceId: d.id,
          count: 0,
        }));

        if (session) {
          const stored = await db
            .select()
            .from(sessionCounts)
            .where(eq(sessionCounts.dailySessionId, session.id));
          const map = new Map(stored.map((c) => [c.deviceId, c.count]));
          counts = allDevices.map((d) => ({ deviceId: d.id, count: map.get(d.id) ?? 0 }));
        }

        res.json({ session: session ?? null, counts });
      } catch (err) {
        console.error("[session-tracking] /daily error", err);
        res.status(500).json({ message: "تعذّر جلب جلسة اليوم" });
      }
    },
  );

  // Atomic upsert: creates or updates the daily_session row, then
  // upserts every count value within a single transaction. Audited.
  app.post(
    "/api/session-tracking/daily/upsert",
    isAuthenticated,
    async (req: Request, res: Response) => {
      if (!requirePerm(req, res, canEnterSessions)) return;
      const parsed = upsertDailySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", details: parsed.error.format() });
      }
      const { branchId, sessionDate, shift, counts } = parsed.data;
      if (!requireBranchWriteAccess(req, res, branchId)) return;

      const ctx = getUserContext(req);
      const today = getTodayIraq();
      const isReception = ctx.role === "reception";

      // Reception can only enter today's data, never past or future.
      if (isReception && sessionDate !== today) {
        return res.status(403).json({
          message: "موظّف الاستقبال يستطيع إدخال جلسات اليوم الحالي فقط",
        });
      }

      try {
        const result = await db.transaction(async (tx) => {
          const [existing] = await tx
            .select()
            .from(dailySessions)
            .where(
              and(
                eq(dailySessions.branchId, branchId),
                eq(dailySessions.sessionDate, sessionDate),
                eq(dailySessions.shift, shift),
              ),
            )
            .limit(1);

          let dailySessionId: number;
          let action: "create" | "update";
          let oldCountsForAudit: { deviceId: number; count: number }[] = [];

          if (!existing) {
            if (!ctx.userId) throw new Error("missing userId on session");
            const [created] = await tx
              .insert(dailySessions)
              .values({
                branchId,
                sessionDate,
                shift,
                createdBy: ctx.userId,
              })
              .returning();
            dailySessionId = created!.id;
            action = "create";
          } else {
            // Reception: enforce 24-hour edit window from original
            // creation. Branch managers and admins bypass.
            if (isReception) {
              const ageMs = Date.now() - new Date(existing.createdAt).getTime();
              if (ageMs > RECEPTION_EDIT_WINDOW_MS) {
                throw new ReceptionWindowError();
              }
            }
            await tx
              .update(dailySessions)
              .set({ updatedAt: new Date() })
              .where(eq(dailySessions.id, existing.id));
            dailySessionId = existing.id;
            action = "update";
            const prior = await tx
              .select()
              .from(sessionCounts)
              .where(eq(sessionCounts.dailySessionId, existing.id));
            oldCountsForAudit = prior.map((p) => ({ deviceId: p.deviceId, count: p.count }));
          }

          // Upsert each count. We use ON CONFLICT on the
          // (daily_session_id, device_id) unique index.
          for (const c of counts) {
            await tx
              .insert(sessionCounts)
              .values({
                dailySessionId,
                deviceId: c.deviceId,
                count: c.count,
              })
              .onConflictDoUpdate({
                target: [sessionCounts.dailySessionId, sessionCounts.deviceId],
                set: { count: c.count },
              });
          }

          return { dailySessionId, action, oldCountsForAudit };
        });

        await logAudit({
          entityType: "daily_session",
          entityId: result.dailySessionId,
          action: result.action,
          userId: ctx.userId,
          userName: ctx.userName,
          branchId,
          oldValues: result.action === "update" ? { counts: result.oldCountsForAudit } : undefined,
          newValues: { branchId, sessionDate, shift, counts },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });

        res.json({ ok: true, dailySessionId: result.dailySessionId, action: result.action });
      } catch (err: any) {
        if (err instanceof ReceptionWindowError) {
          return res.status(403).json({
            message: "انتهت مدّة التعديل (٢٤ ساعة). يرجى مراجعة المدير.",
          });
        }
        console.error("[session-tracking] /daily/upsert error", err);
        res.status(500).json({ message: "تعذّر حفظ الجلسة" });
      }
    },
  );

  // ==================== الأهداف الشهرية ====================

  // Returns: { devices, targets, actuals } where targets is the saved
  // monthly_targets rows for that branch+year+month and actuals is the
  // sum of session_counts grouped by device for that month.
  app.get(
    "/api/session-tracking/monthly",
    isAuthenticated,
    async (req: Request, res: Response) => {
      if (
        !requirePerm(req, res, (r) =>
          canEnterSessions(r) || canManageSessionTargets(r) || canViewSessionsReport(r),
        )
      )
        return;
      try {
        const branchId = resolveBranchId(req, req.query.branchId);
        if (branchId === undefined || branchId === null) {
          return res.status(400).json({ message: "branchId مطلوب" });
        }
        if (!canAccessBranch(req, branchId)) {
          return res.status(403).json({ message: "لا تملك وصولاً لهذا الفرع" });
        }
        const yearParse = yearSchema.safeParse(req.query.year);
        const monthParse = monthSchema.safeParse(req.query.month);
        if (!yearParse.success || !monthParse.success) {
          return res.status(400).json({ message: "year / month غير صحيحة" });
        }
        const year = yearParse.data;
        const month = monthParse.data;

        const allDevices = await db
          .select()
          .from(devices)
          .where(eq(devices.isActive, true))
          .orderBy(asc(devices.displayOrder), asc(devices.id));

        const targets = await db
          .select()
          .from(monthlyTargets)
          .where(
            and(
              eq(monthlyTargets.branchId, branchId),
              eq(monthlyTargets.year, year),
              eq(monthlyTargets.month, month),
            ),
          );

        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const actualRows = await db
          .select({
            deviceId: sessionCounts.deviceId,
            total: sql<number>`COALESCE(SUM(${sessionCounts.count}), 0)::int`,
          })
          .from(sessionCounts)
          .innerJoin(dailySessions, eq(sessionCounts.dailySessionId, dailySessions.id))
          .where(
            and(
              eq(dailySessions.branchId, branchId),
              gte(dailySessions.sessionDate, monthStart),
              lte(dailySessions.sessionDate, monthEnd),
            ),
          )
          .groupBy(sessionCounts.deviceId);

        const targetsMap = new Map(targets.map((t) => [t.deviceId, t]));
        const actualsMap = new Map(actualRows.map((a) => [a.deviceId, Number(a.total)]));

        const result = allDevices.map((d) => ({
          deviceId: d.id,
          deviceCode: d.code,
          deviceNameAr: d.nameAr,
          deviceNameEn: d.nameEn,
          target: targetsMap.get(d.id)?.targetCount ?? 0,
          actual: actualsMap.get(d.id) ?? 0,
        }));

        res.json({ branchId, year, month, devices: result });
      } catch (err) {
        console.error("[session-tracking] /monthly error", err);
        res.status(500).json({ message: "تعذّر جلب البيانات الشهرية" });
      }
    },
  );

  app.post(
    "/api/session-tracking/targets/upsert",
    isAuthenticated,
    async (req: Request, res: Response) => {
      if (!requirePerm(req, res, canManageSessionTargets)) return;
      const parsed = upsertTargetsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", details: parsed.error.format() });
      }
      const { branchId, year, month, targets } = parsed.data;
      if (!requireBranchWriteAccess(req, res, branchId)) return;

      const ctx = getUserContext(req);
      if (!ctx.userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      try {
        await db.transaction(async (tx) => {
          for (const t of targets) {
            await tx
              .insert(monthlyTargets)
              .values({
                branchId,
                deviceId: t.deviceId,
                year,
                month,
                targetCount: t.targetCount,
                setBy: ctx.userId!,
              })
              .onConflictDoUpdate({
                target: [
                  monthlyTargets.branchId,
                  monthlyTargets.deviceId,
                  monthlyTargets.year,
                  monthlyTargets.month,
                ],
                set: {
                  targetCount: t.targetCount,
                  setBy: ctx.userId!,
                  updatedAt: new Date(),
                },
              });
          }
        });

        await logAudit({
          entityType: "monthly_target",
          entityId: 0, // batch op; entity is (branch, year, month) — see notes
          action: "upsert_batch",
          userId: ctx.userId,
          userName: ctx.userName,
          branchId,
          newValues: { year, month, targets },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          notes: `monthly targets upserted for ${year}-${month}`,
        });

        res.json({ ok: true });
      } catch (err) {
        console.error("[session-tracking] /targets/upsert error", err);
        res.status(500).json({ message: "تعذّر حفظ الأهداف" });
      }
    },
  );

  app.post(
    "/api/session-tracking/targets/copy",
    isAuthenticated,
    async (req: Request, res: Response) => {
      if (!requirePerm(req, res, canManageSessionTargets)) return;
      const parsed = copyTargetsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", details: parsed.error.format() });
      }
      const { branchId, fromYear, fromMonth, toYear, toMonth } = parsed.data;
      if (!requireBranchWriteAccess(req, res, branchId)) return;
      const ctx = getUserContext(req);
      if (!ctx.userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }
      if (fromYear === toYear && fromMonth === toMonth) {
        return res.status(400).json({ message: "الشهر المصدر والمستهدف متطابقان" });
      }

      try {
        const source = await db
          .select()
          .from(monthlyTargets)
          .where(
            and(
              eq(monthlyTargets.branchId, branchId),
              eq(monthlyTargets.year, fromYear),
              eq(monthlyTargets.month, fromMonth),
            ),
          );

        if (source.length === 0) {
          return res.json({ ok: true, copied: 0 });
        }

        await db.transaction(async (tx) => {
          for (const t of source) {
            await tx
              .insert(monthlyTargets)
              .values({
                branchId,
                deviceId: t.deviceId,
                year: toYear,
                month: toMonth,
                targetCount: t.targetCount,
                setBy: ctx.userId!,
              })
              .onConflictDoUpdate({
                target: [
                  monthlyTargets.branchId,
                  monthlyTargets.deviceId,
                  monthlyTargets.year,
                  monthlyTargets.month,
                ],
                set: {
                  targetCount: t.targetCount,
                  setBy: ctx.userId!,
                  updatedAt: new Date(),
                },
              });
          }
        });

        await logAudit({
          entityType: "monthly_target",
          entityId: 0,
          action: "copy",
          userId: ctx.userId,
          userName: ctx.userName,
          branchId,
          newValues: { fromYear, fromMonth, toYear, toMonth, copied: source.length },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });

        res.json({ ok: true, copied: source.length });
      } catch (err) {
        console.error("[session-tracking] /targets/copy error", err);
        res.status(500).json({ message: "تعذّر نسخ الأهداف" });
      }
    },
  );

  // ==================== التقرير الشامل ====================

  // Returns a list of daily_sessions within [from, to] for a branch
  // (or all branches when admin omits branchId), with the count rows
  // joined in. The client will pivot it for display and CSV export.
  app.get(
    "/api/session-tracking/list",
    isAuthenticated,
    async (req: Request, res: Response) => {
      if (!requirePerm(req, res, canViewSessionsReport)) return;
      try {
        const branchId = resolveBranchId(req, req.query.branchId);
        if (branchId === undefined) {
          return res.status(400).json({ message: "branchId غير صحيح" });
        }
        const from = String(req.query.from ?? "");
        const to = String(req.query.to ?? "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
          return res.status(400).json({ message: "from / to تاريخ غير صحيح" });
        }

        const conditions = [
          gte(dailySessions.sessionDate, from),
          lte(dailySessions.sessionDate, to),
        ];
        if (branchId !== null) {
          conditions.push(eq(dailySessions.branchId, branchId));
        }

        const sessions = await db
          .select()
          .from(dailySessions)
          .where(and(...conditions))
          .orderBy(desc(dailySessions.sessionDate), asc(dailySessions.shift))
          .limit(1000);

        const ids = sessions.map((s) => s.id);
        let counts: { dailySessionId: number; deviceId: number; count: number }[] = [];
        if (ids.length > 0) {
          counts = (
            await db
              .select()
              .from(sessionCounts)
              .where(sql`${sessionCounts.dailySessionId} = ANY(${ids})`)
          ).map((c) => ({
            dailySessionId: c.dailySessionId,
            deviceId: c.deviceId,
            count: c.count,
          }));
        }

        const allDevices = await db
          .select()
          .from(devices)
          .orderBy(asc(devices.displayOrder), asc(devices.id));

        res.json({ sessions, counts, devices: allDevices });
      } catch (err) {
        console.error("[session-tracking] /list error", err);
        res.status(500).json({ message: "تعذّر جلب التقرير" });
      }
    },
  );

  // ==================== تحليلات معمّقة ====================

  // Returns four pre-aggregated views over a date range. Designed for
  // chart rendering on the analytics page. Server-side aggregation
  // keeps the payload small and works for arbitrarily long ranges.
  app.get(
    "/api/session-tracking/analytics",
    isAuthenticated,
    async (req: Request, res: Response) => {
      if (!requirePerm(req, res, canViewSessionsReport)) return;
      try {
        const branchId = resolveBranchId(req, req.query.branchId);
        if (branchId === undefined) {
          return res.status(400).json({ message: "branchId غير صحيح" });
        }
        const from = String(req.query.from ?? "");
        const to = String(req.query.to ?? "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
          return res.status(400).json({ message: "from / to تاريخ غير صحيح" });
        }

        const branchFilter = branchId === null ? sql`TRUE` : sql`${dailySessions.branchId} = ${branchId}`;

        // Total count per device, ordered by display_order
        const byDevice = await db
          .select({
            deviceId: devices.id,
            deviceCode: devices.code,
            nameAr: devices.nameAr,
            nameEn: devices.nameEn,
            total: sql<number>`COALESCE(SUM(${sessionCounts.count}), 0)::int`,
            displayOrder: devices.displayOrder,
          })
          .from(devices)
          .leftJoin(sessionCounts, eq(sessionCounts.deviceId, devices.id))
          .leftJoin(
            dailySessions,
            and(
              eq(sessionCounts.dailySessionId, dailySessions.id),
              gte(dailySessions.sessionDate, from),
              lte(dailySessions.sessionDate, to),
              branchFilter,
            ),
          )
          .where(eq(devices.isActive, true))
          .groupBy(devices.id, devices.code, devices.nameAr, devices.nameEn, devices.displayOrder)
          .orderBy(asc(devices.displayOrder));

        // Per-day totals across all devices
        const byDay = await db
          .select({
            date: dailySessions.sessionDate,
            total: sql<number>`COALESCE(SUM(${sessionCounts.count}), 0)::int`,
          })
          .from(dailySessions)
          .leftJoin(sessionCounts, eq(sessionCounts.dailySessionId, dailySessions.id))
          .where(
            and(
              gte(dailySessions.sessionDate, from),
              lte(dailySessions.sessionDate, to),
              branchFilter,
            ),
          )
          .groupBy(dailySessions.sessionDate)
          .orderBy(asc(dailySessions.sessionDate));

        // Per-shift totals
        const byShiftRows = await db
          .select({
            shift: dailySessions.shift,
            total: sql<number>`COALESCE(SUM(${sessionCounts.count}), 0)::int`,
          })
          .from(dailySessions)
          .leftJoin(sessionCounts, eq(sessionCounts.dailySessionId, dailySessions.id))
          .where(
            and(
              gte(dailySessions.sessionDate, from),
              lte(dailySessions.sessionDate, to),
              branchFilter,
            ),
          )
          .groupBy(dailySessions.shift);

        const byShift = {
          morning: byShiftRows.find((r) => r.shift === "morning")?.total ?? 0,
          evening: byShiftRows.find((r) => r.shift === "evening")?.total ?? 0,
        };

        // Per-branch totals — admins see all branches; others see only
        // the resolved branch
        let byBranch: { branchId: number; name: string; total: number }[] = [];
        const isAdminReq = !!getSession(req)?.isAdmin;
        if (isAdminReq) {
          byBranch = await db
            .select({
              branchId: branches.id,
              name: branches.name,
              total: sql<number>`COALESCE(SUM(${sessionCounts.count}), 0)::int`,
            })
            .from(branches)
            .leftJoin(dailySessions, eq(dailySessions.branchId, branches.id))
            .leftJoin(
              sessionCounts,
              and(
                eq(sessionCounts.dailySessionId, dailySessions.id),
                gte(dailySessions.sessionDate, from),
                lte(dailySessions.sessionDate, to),
              ),
            )
            .groupBy(branches.id, branches.name)
            .orderBy(asc(branches.name));
        }

        res.json({ byDevice, byDay, byShift, byBranch });
      } catch (err) {
        console.error("[session-tracking] /analytics error", err);
        res.status(500).json({ message: "تعذّر جلب التحليلات" });
      }
    },
  );
}

class ReceptionWindowError extends Error {
  constructor() {
    super("RECEPTION_WINDOW_EXPIRED");
    this.name = "ReceptionWindowError";
  }
}
