// Which services does a patient actually have?
//
// Extracted from `storage.syncPatientCases` so the rule can be tested without a
// database — it is the rule that decides whether a `patient_cases` row gets
// created, and getting it wrong invents services a patient never needed (or
// hides ones they do).

export interface ServiceSignals {
  /** Explicit classification recorded on the patient row. */
  isAmputee: boolean;
  isMedicalSupport: boolean;
  isPhysiotherapy: boolean;
  /** A manufacturing work order exists for that service. */
  hasProstheticWorkOrder: boolean;
  hasSupportWorkOrder: boolean;
  /** A payment is tagged for that service. */
  hasProstheticTag: boolean;
  hasSupportTag: boolean;
  hasPhysioTag: boolean;
  /** The service's own detail column carries something. */
  hasProstheticDetails: boolean;
  hasSupportDetails: boolean;
}

export interface WantedServices {
  prosthetic: boolean;
  medical_support: boolean;
  physiotherapy: boolean;
}

/**
 * HARD signals — a flag, a work order, a tagged payment — are deliberate acts
 * and always count.
 *
 * A service's own detail column is a SOFT signal, trusted only for a patient
 * carrying NO classification at all. It exists to rescue legacy rows whose
 * مسند/طرف lived only in its type field while every flag stayed false, and for
 * those it is exactly right.
 *
 * For a patient reception DID classify, a leftover detail column is noise. The
 * registration form keeps whatever was typed before the service type was
 * switched, and it opens on أطراف for most branches — so a مساند-only patient
 * could carry a stale `amputationSite`, which the old rule read as proof of an
 * amputation. That manufactured a phantom أطراف case, leaving the patient
 * permanently "بانتظار معاينة أطراف صناعية" for a limb they do not need.
 * An explicit classification beats a stale field.
 */
export function wantedServices(s: ServiceSignals): WantedServices {
  const explicitlyClassified = s.isAmputee || s.isMedicalSupport || s.isPhysiotherapy;
  const soft = (present: boolean) => !explicitlyClassified && present;

  return {
    prosthetic:
      s.isAmputee || s.hasProstheticWorkOrder || s.hasProstheticTag || soft(s.hasProstheticDetails),
    medical_support:
      s.isMedicalSupport || s.hasSupportWorkOrder || s.hasSupportTag || soft(s.hasSupportDetails),
    // Physiotherapy has no device detail column to mis-read, so it was never
    // affected — and it is the isolation the other two now match.
    physiotherapy: s.isPhysiotherapy || s.hasPhysioTag,
  };
}
