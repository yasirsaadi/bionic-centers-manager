// Follow-up reminders — computes which physiotherapy patients have stopped
// coming and need a follow-up call. Read-only, rule-based, computed on the fly
// against the database (mirrors server/anomalies/detector.ts) so there's no
// cron and no stored "is overdue" flag to keep in sync.
//
// A reminder is active when a physiotherapy patient (patients.isPhysiotherapy)
// has at least one non-deleted visit and their last visit is >= STOP_DAYS days
// ago (Baghdad calendar days). Reminders that have already been handled — i.e.
// a follow_up_calls row whose last_visit_anchor equals the patient's *current*
// last visit — are suppressed. A new visit raises MAX(visit_date) so the old
// anchor no longer matches and the reminder re-arms automatically.

import { db } from "../db";
import { patients, visits, branches, followUpCalls } from "@shared/schema";
import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import { getStartOfDayIraq } from "../timezone";
import { activePatientDrizzle } from "../patients/active_patient";

// A patient is considered "stopped" once 7 full days have passed since their
// last visit (the reminder appears on the 7th day).
export const STOP_DAYS = 7;

export interface ReminderItem {
  patientId: number;
  name: string;
  phone: string | null;
  /** الرمز العلني الدائم — يُبحث به في شاشة المتابعات كما في السجلّ. */
  patientCode: string | null;
  branchId: number;
  branchName?: string;
  lastVisitDate: string; // ISO
  daysSince: number;
}

// Whole Baghdad calendar days between a past date and today.
function daysSinceIraq(lastVisit: Date | string): number {
  const today = getStartOfDayIraq().getTime();
  const last = getStartOfDayIraq(lastVisit).getTime();
  return Math.round((today - last) / 86_400_000);
}

/**
 * Active follow-up reminders, optionally restricted to a single branch.
 * One aggregation query for last-visit-per-patient + one lookup for handled
 * episodes — no N+1 regardless of patient count.
 */
export async function computeActiveReminders(branchId?: number): Promise<ReminderItem[]> {
  const conditions = [eq(patients.isPhysiotherapy, true)];
  if (branchId) conditions.push(eq(patients.branchId, branchId));

  // Physio patients with their last non-deleted visit. innerJoin guarantees
  // "at least one visit"; the deletedAt filter lives in the join condition so
  // soft-deleted visits never count toward the MAX.
  const rows = await db
    .select({
      patientId: patients.id,
      name: patients.name,
      phone: patients.phone,
      patientCode: patients.patientCode,
      branchId: patients.branchId,
      lastVisit: sql<string>`MAX(${visits.visitDate})`,
    })
    .from(patients)
    .innerJoin(
      visits,
      and(eq(visits.patientId, patients.id), isNull(visits.deletedAt))
    )
    //  **والمحذوفُ لا يُتَّصَل به** (ترحيل ٠٦٨) — الملفُّ خرج من النظام.
    .where(and(...conditions, activePatientDrizzle()))
    .groupBy(patients.id, patients.name, patients.phone, patients.patientCode,
             patients.branchId);

  // Keep only patients stopped for >= STOP_DAYS.
  const stopped = rows
    .map((r) => ({ ...r, daysSince: daysSinceIraq(r.lastVisit) }))
    .filter((r) => r.daysSince >= STOP_DAYS);

  if (stopped.length === 0) return [];

  // Suppress episodes already handled. Match on (patientId, anchor millis):
  // a handled row whose anchor equals the patient's current last visit means
  // this exact stop-episode was already called.
  const candidateIds = stopped.map((r) => r.patientId);
  const handled = await db
    .select({ patientId: followUpCalls.patientId, anchor: followUpCalls.lastVisitAnchor })
    .from(followUpCalls)
    .where(inArray(followUpCalls.patientId, candidateIds));
  const handledKeys = new Set(
    handled.map((h) => `${h.patientId}|${new Date(h.anchor).getTime()}`)
  );

  const active = stopped.filter(
    (r) => !handledKeys.has(`${r.patientId}|${new Date(r.lastVisit).getTime()}`)
  );
  if (active.length === 0) return [];

  const branchList = await db.select().from(branches);
  const nameByBranch = new Map(branchList.map((b) => [b.id, b.name]));

  return active
    .map((r) => ({
      patientId: r.patientId,
      name: r.name,
      phone: r.phone,
      patientCode: r.patientCode,
      branchId: r.branchId,
      branchName: nameByBranch.get(r.branchId),
      lastVisitDate: new Date(r.lastVisit).toISOString(),
      daysSince: r.daysSince,
    }))
    .sort((a, b) => b.daysSince - a.daysSince);
}

export interface ReminderSnapshot {
  branchId: number;
  lastVisit: Date;
  daysSince: number;
}

/**
 * Server-side snapshot of a single patient's current stop-episode, used when
 * logging an outcome so the anchor is derived from the DB (never trusted from
 * the client). Returns null if the patient is not a valid active reminder
 * (not physio, no visits, or last visit < STOP_DAYS ago).
 */
export async function getReminderSnapshot(patientId: number): Promise<ReminderSnapshot | null> {
  const [row] = await db
    .select({
      isPhysiotherapy: patients.isPhysiotherapy,
      branchId: patients.branchId,
      lastVisit: sql<string | null>`MAX(${visits.visitDate})`,
    })
    .from(patients)
    .leftJoin(
      visits,
      and(eq(visits.patientId, patients.id), isNull(visits.deletedAt))
    )
    .where(and(eq(patients.id, patientId), activePatientDrizzle()))
    .groupBy(patients.id, patients.isPhysiotherapy, patients.branchId);

  if (!row || !row.isPhysiotherapy || !row.lastVisit) return null;
  const daysSince = daysSinceIraq(row.lastVisit);
  if (daysSince < STOP_DAYS) return null;
  return { branchId: row.branchId, lastVisit: new Date(row.lastVisit), daysSince };
}
