// Physiotherapy per-session prices — the single source of truth, shared by the
// client (live preview while typing) and the SERVER (authoritative compute; a
// tampered request can never invent its own prices).
export const PHYSIO_TREATMENT_PRICES: Record<string, number> = {
  "استشارة طبية": 0,
  "روبوت": 50000,
  "تمارين تأهيلية": 25000,
  "أجهزة علاج طبيعي": 25000,
  "أبر صينية": 25000,
};

export const PHYSIO_TREATMENT_TYPES = Object.keys(PHYSIO_TREATMENT_PRICES);

export interface PhysioEntry {
  treatmentType: string;
  sessionCount: number;
  isFree?: boolean;
}

/** One line of the purchased course, as stored in `patients.physio_plan`. */
export interface PhysioPlanEntry {
  treatmentType: string;
  sessionCount: number;
}

/**
 * Merge newly-sold sessions into the stored plan, summing per treatment type.
 *
 * Pricing and «جلسات علاج إضافية» both go through here, so a patient who buys
 * 10 robot sessions and later 5 more reads as one line of 15 rather than two
 * lines the counter would have to reconcile.
 */
export function mergePhysioPlan(
  existing: PhysioPlanEntry[] | null | undefined,
  additions: { treatmentType: string; sessionCount: number }[],
): PhysioPlanEntry[] {
  const byType: Record<string, number> = {};
  for (const e of existing ?? []) {
    const type = String(e?.treatmentType ?? "").trim();
    const n = Math.max(0, Math.floor(Number(e?.sessionCount) || 0));
    if (type) byType[type] = (byType[type] ?? 0) + n;
  }
  for (const a of additions ?? []) {
    const type = String(a?.treatmentType ?? "").trim();
    const n = Math.max(0, Math.floor(Number(a?.sessionCount) || 0));
    // A consultation is a single visit, not a course — it never enters the plan.
    if (!type || n <= 0 || type === "استشارة طبية") continue;
    byType[type] = (byType[type] ?? 0) + n;
  }
  return Object.keys(byType)
    .filter((t) => byType[t] > 0)
    .map((t) => ({ treatmentType: t, sessionCount: byType[t] }));
}

/** «روبوت (10 جلسات)، أبر صينية (5 جلسات)» — the plan as the file reads it. */
export function describePhysioPlan(plan: PhysioPlanEntry[] | null | undefined): string {
  return (plan ?? [])
    .filter((e) => e && e.treatmentType && e.sessionCount > 0)
    .map((e) => `${e.treatmentType} (${e.sessionCount} جلسات)`)
    .join("، ");
}

// Cost of one entry: sessions × the type's price, 0 when marked free.
export function physioEntryCost(e: PhysioEntry): number {
  if (e.isFree) return 0;
  const price = PHYSIO_TREATMENT_PRICES[e.treatmentType];
  if (price === undefined) return 0;
  const n = Math.max(0, Math.floor(Number(e.sessionCount) || 0));
  return n * price;
}
