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

/**
 * Read counts back out of a plan TEXT like «روبوت (10 جلسات)، أبر صينية (5 جلسات)».
 *
 * That format is what the doctor's prescription and the pricing step write onto
 * `patients.treatment_type`, so it often carries the counts even when the
 * structured plan predates this feature.
 */
export function parsePlanFromText(text: string | null | undefined): PhysioPlanEntry[] {
  if (!text || typeof text !== "string") return [];
  const out: PhysioPlanEntry[] = [];
  for (const part of text.split("،")) {
    const m = part.match(/^\s*(.+?)\s*\(\s*(\d+)\s*جلس/);
    if (!m) continue;
    const type = m[1].trim();
    const n = Number(m[2]) || 0;
    if (type && n > 0) out.push({ treatmentType: type, sessionCount: n });
  }
  return out;
}

/**
 * How many sessions this patient actually BOUGHT, per treatment type.
 *
 * Resolved from the most explicit source available, never by summing several
 * (two sources would double the purchase):
 *
 *   1. the stored plan — written by «الكلفة والجلسات» and the correction dialog;
 *   2. counts embedded in the plan text — «روبوت (10 جلسات)»;
 *   3. DERIVED FROM THE PRICE: a single known treatment type whose case cost
 *      divides exactly by its per-session price. This is the one that matters
 *      in practice: a patient priced 275,000 for «أجهزة علاج طبيعي» bought 11
 *      sessions, whatever his payments happen to say so far — and reading the
 *      payments instead is precisely what made the counter disagree with the
 *      cost (منتهى: 11 bought, 4 on payments · مصطفى: 40 bought, 11 on payments);
 *   4. the payment session counts — the old flow, where every sale WAS a payment.
 */
export function resolvePurchasedSessions(input: {
  plan?: PhysioPlanEntry[] | null;
  treatmentTypeText?: string | null;
  caseCost?: number | null;
  paymentSessions?: { treatmentType: string | null; sessionCount: number | null }[];
}): { byType: Record<string, number>; total: number; source: "plan" | "cost" | "payments" | "none" } {
  const sum = (byType: Record<string, number>) =>
    Object.keys(byType).reduce((s, k) => s + byType[k], 0);

  // Payments are computed up front: they are both the legacy fallback AND the
  // sanity floor for the cost derivation below.
  const paymentsByType: Record<string, number> = {};
  for (const p of input.paymentSessions ?? []) {
    const n = Number(p?.sessionCount) || 0;
    if (n <= 0) continue;
    const type = (p.treatmentType || "").trim() || "غير محدد";
    paymentsByType[type] = (paymentsByType[type] ?? 0) + n;
  }
  const paymentsTotal = sum(paymentsByType);

  const fromPlan = (input.plan ?? []).filter((e) => e?.treatmentType && Number(e.sessionCount) > 0);
  if (fromPlan.length > 0) {
    const byType: Record<string, number> = {};
    for (const e of fromPlan) byType[e.treatmentType] = (byType[e.treatmentType] ?? 0) + Number(e.sessionCount);
    return { byType, total: sum(byType), source: "plan" };
  }

  // NOTE deliberately absent: counts parsed from the treatment-type TEXT.
  // That text is written by the doctor's PRESCRIPTION as well as by pricing,
  // and a prescribed course is not a purchased one — reading «روبوت (10
  // جلسات)» as ten bought sessions credited an examined-but-unpriced patient
  // with sessions nobody paid for, and undercounted a per-session veteran the
  // doctor happened to examine. Purchases come from the plan, the price, or
  // the payments — the three places money actually passes through.

  // Derive from the money: only when the text names exactly ONE priced type,
  // the cost divides exactly — AND the result exceeds what the payments prove.
  // The last guard is what protects the per-session (مفرد) patient: gifted
  // sessions add a payment row with amount 0 but no cost, so cost ÷ price
  // UNDERCOUNTS him; his payments are his complete history and must win.
  // (The priced-course patient is the opposite — cost 275,000 = 11 sessions
  // while his installments carry only 4 — and for him the derivation still
  // fires because 11 > 4.)
  const label = String(input.treatmentTypeText ?? "").trim();
  const cost = Math.max(0, Math.floor(Number(input.caseCost) || 0));
  const price = PHYSIO_TREATMENT_PRICES[label];
  if (label && !label.includes("،") && price && price > 0 && cost > 0 && cost % price === 0) {
    const derived = cost / price;
    if (derived > paymentsTotal) {
      return { byType: { [label]: derived }, total: derived, source: "cost" };
    }
  }

  return { byType: paymentsByType, total: paymentsTotal, source: paymentsTotal > 0 ? "payments" : "none" };
}

// Cost of one entry: sessions × the type's price, 0 when marked free.
export function physioEntryCost(e: PhysioEntry): number {
  if (e.isFree) return 0;
  const price = PHYSIO_TREATMENT_PRICES[e.treatmentType];
  if (price === undefined) return 0;
  const n = Math.max(0, Math.floor(Number(e.sessionCount) || 0));
  return n * price;
}
