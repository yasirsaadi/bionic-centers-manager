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

// Cost of one entry: sessions × the type's price, 0 when marked free.
export function physioEntryCost(e: PhysioEntry): number {
  if (e.isFree) return 0;
  const price = PHYSIO_TREATMENT_PRICES[e.treatmentType];
  if (price === undefined) return 0;
  const n = Math.max(0, Math.floor(Number(e.sessionCount) || 0));
  return n * price;
}
