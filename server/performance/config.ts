// Employee performance scoring — configuration and pure scoring logic.
//
// The monitor rates each employee 0–100 for a calendar month against
// admin-defined monthly TARGETS, per role. This is deliberately
// target-based (not "relative to the busiest colleague") so a whole
// excellent team can all score high, and a lazy team can't all look good
// just because one of them tops the list. The owner uses the score to pick
// the monthly outstanding-employee reward, so fairness across roles matters:
// each role is judged only on the dimensions that apply to it, always out
// of 100.
//
// Four dimensions (base weights sum to 100):
//   - productivity (40): entries vs the role's monthly entries target
//   - consistency  (20): distinct active days vs the role's working-days target
//   - followups    (15): follow-up calls logged vs the role's target
//   - quality      (25): patient-data completeness + low deletion rate
//
// Any dimension that doesn't apply to a role (target 0) — or quality when
// the employee did no create/delete work at all — is dropped and its weight
// is redistributed across the remaining dimensions, so the score is always
// out of 100 regardless of role.

export interface RoleTarget {
  entriesTarget: number;    // monthly create-events target (0 = dimension N/A)
  activeDaysTarget: number; // monthly distinct-active-days target (0 = N/A)
  followUpsTarget: number;  // monthly follow-up calls target (0 = N/A)
}

export type PerformanceTargets = Record<string, RoleTarget>;

// Sensible starting defaults. The admin edits these from the UI; they are
// stored as JSON in system_settings under PERFORMANCE_TARGETS_KEY.
export const DEFAULT_TARGETS: PerformanceTargets = {
  reception:      { entriesTarget: 300, activeDaysTarget: 24, followUpsTarget: 20 },
  branch_manager: { entriesTarget: 150, activeDaysTarget: 24, followUpsTarget: 0 },
  accountant:     { entriesTarget: 80,  activeDaysTarget: 24, followUpsTarget: 0 },
  therapist:      { entriesTarget: 60,  activeDaysTarget: 24, followUpsTarget: 0 },
  surveyor:       { entriesTarget: 40,  activeDaysTarget: 20, followUpsTarget: 0 },
  admin:          { entriesTarget: 0,   activeDaysTarget: 0,  followUpsTarget: 0 },
};

export const PERFORMANCE_TARGETS_KEY = "performance_targets";

// Base dimension weights (before per-role redistribution).
export const WEIGHTS = {
  productivity: 40,
  consistency: 20,
  followups: 15,
  quality: 25,
} as const;

export function mergeTargets(stored: Partial<PerformanceTargets> | null | undefined): PerformanceTargets {
  const out: PerformanceTargets = {};
  const roles = Array.from(new Set([
    ...Object.keys(DEFAULT_TARGETS),
    ...Object.keys(stored ?? {}),
  ]));
  for (const role of roles) {
    const d = DEFAULT_TARGETS[role] ?? { entriesTarget: 0, activeDaysTarget: 0, followUpsTarget: 0 };
    const s: Partial<RoleTarget> = stored?.[role] ?? {};
    out[role] = {
      entriesTarget: Number.isFinite(s.entriesTarget as number) ? Number(s.entriesTarget) : d.entriesTarget,
      activeDaysTarget: Number.isFinite(s.activeDaysTarget as number) ? Number(s.activeDaysTarget) : d.activeDaysTarget,
      followUpsTarget: Number.isFinite(s.followUpsTarget as number) ? Number(s.followUpsTarget) : d.followUpsTarget,
    };
  }
  return out;
}

export interface ScoreInputs {
  entries: number;        // total create events (patients+visits+payments+expenses+invoices+purchases)
  activeDays: number;     // distinct Baghdad calendar days with any audit action
  followUpsCount: number; // follow_up_calls logged by the user in the month
  deleteCount: number;    // delete actions in the month
  patientsCreated: number;   // patients this user created in the month
  patientsComplete: number;  // of those, how many have a phone number filled
}

export interface DimensionScore {
  earned: number; // points on the 0–100 scale
  max: number;    // this dimension's max on the 0–100 scale (maxes sum to 100)
  ratio: number;  // 0–1 achievement of the dimension
}

export interface ScoreBreakdown {
  productivity: DimensionScore;
  consistency: DimensionScore;
  followups: DimensionScore;
  quality: DimensionScore;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Computes the 0–100 score and per-dimension breakdown for one employee
 * against their role's targets. Dimensions that don't apply are dropped and
 * their weight redistributed, so the displayed dimension maxes always sum to
 * 100 and the score is comparable across roles.
 */
export function computeScore(inp: ScoreInputs, target: RoleTarget): { score: number; breakdown: ScoreBreakdown } {
  const didWork = inp.entries + inp.deleteCount > 0;

  // Achievement ratio per dimension (0–1).
  const productivityRatio = target.entriesTarget > 0 ? clamp01(inp.entries / target.entriesTarget) : 0;
  const consistencyRatio = target.activeDaysTarget > 0 ? clamp01(inp.activeDays / target.activeDaysTarget) : 0;
  const followupsRatio = target.followUpsTarget > 0 ? clamp01(inp.followUpsCount / target.followUpsTarget) : 0;

  // Quality: completeness (only when they created patients) + cleanliness.
  const cleanliness = 1 - clamp01(inp.deleteCount / Math.max(inp.entries, 1));
  let qualityRatio: number;
  if (inp.patientsCreated > 0) {
    const completeness = clamp01(inp.patientsComplete / inp.patientsCreated);
    qualityRatio = 0.5 * completeness + 0.5 * cleanliness;
  } else {
    qualityRatio = cleanliness;
  }

  // Which dimensions are "active" for this role/employee.
  const active = {
    productivity: target.entriesTarget > 0,
    consistency: target.activeDaysTarget > 0,
    followups: target.followUpsTarget > 0,
    quality: didWork,
  };

  const activeWeightSum =
    (active.productivity ? WEIGHTS.productivity : 0) +
    (active.consistency ? WEIGHTS.consistency : 0) +
    (active.followups ? WEIGHTS.followups : 0) +
    (active.quality ? WEIGHTS.quality : 0);

  const dim = (isActive: boolean, weight: number, ratio: number): DimensionScore => {
    if (!isActive || activeWeightSum === 0) return { earned: 0, max: 0, ratio: 0 };
    const max = (weight / activeWeightSum) * 100;
    return { earned: ratio * max, max, ratio };
  };

  const breakdown: ScoreBreakdown = {
    productivity: dim(active.productivity, WEIGHTS.productivity, productivityRatio),
    consistency: dim(active.consistency, WEIGHTS.consistency, consistencyRatio),
    followups: dim(active.followups, WEIGHTS.followups, followupsRatio),
    quality: dim(active.quality, WEIGHTS.quality, qualityRatio),
  };

  const score = Math.round(
    breakdown.productivity.earned +
    breakdown.consistency.earned +
    breakdown.followups.earned +
    breakdown.quality.earned
  );

  return { score, breakdown };
}
