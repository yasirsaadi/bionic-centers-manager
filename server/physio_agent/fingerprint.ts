// بصمةُ المعاينة (§4.ha) — تتغيّر بتنقيح أيّ شيءٍ يقرؤه Opus منها؛ فخطّةٌ كُتبت على بصمةٍ أقدم «قديمة» لا تُعتمد، ووظيفةٌ تعمل عليها تُلغى.
import { createHash } from "crypto";

function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as any)[k])]));
  return v ?? null;
}
export function examFingerprint(e: { assessment: unknown; diagnosis?: unknown; chiefComplaint?: unknown; clinicalFindings?: unknown; plan?: unknown; notes?: unknown }): string {
  return createHash("sha256").update(JSON.stringify(stable({
    assessment: e.assessment ?? null, diagnosis: e.diagnosis ?? null, chiefComplaint: e.chiefComplaint ?? null,
    clinicalFindings: e.clinicalFindings ?? null, plan: e.plan ?? null, notes: e.notes ?? null,
  }))).digest("hex");
}
