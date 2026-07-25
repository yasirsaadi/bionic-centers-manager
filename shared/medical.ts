// Shared vocabulary for doctor medical examinations (معاينة الطبيب).
//
// The three specialties this business runs are already the three case types on
// `patient_cases`. An exam is always filed against exactly one of them, so the
// same list drives: which specialties an admin may grant a doctor, which exams
// that doctor may sign, and how the record is labelled in the UI.
//
// Server and client both import from here so the vocabulary can never drift.

export const MEDICAL_SPECIALTIES = [
  "prosthetic",
  "medical_support",
  "physiotherapy",
] as const;

export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number];

export function isMedicalSpecialty(value: unknown): value is MedicalSpecialty {
  return typeof value === "string" && (MEDICAL_SPECIALTIES as readonly string[]).includes(value);
}

/** Full Arabic name, used in headings, the print sheet and audit notes. */
export const SPECIALTY_LABELS: Record<MedicalSpecialty, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};

/** Short Arabic name, for chips and badges where space is tight. */
export const SPECIALTY_SHORT_LABELS: Record<MedicalSpecialty, string> = {
  prosthetic: "أطراف",
  medical_support: "مساند",
  physiotherapy: "علاج طبيعي",
};

/**
 * Per-specialty accent, so a patient treated by two departments can tell the
 * two clinical threads apart at a glance. Tailwind class fragments — kept here
 * rather than in the component so the badge, the timeline dot and the print
 * header all agree.
 */
export const SPECIALTY_COLORS: Record<
  MedicalSpecialty,
  { badge: string; dot: string; ring: string }
> = {
  prosthetic: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
    ring: "border-blue-200",
  },
  medical_support: {
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
    ring: "border-violet-200",
  },
  physiotherapy: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    ring: "border-emerald-200",
  },
};

export function specialtyLabel(value: string | null | undefined): string {
  return isMedicalSpecialty(value) ? SPECIALTY_LABELS[value] : (value ?? "—");
}

export function specialtyShortLabel(value: string | null | undefined): string {
  return isMedicalSpecialty(value) ? SPECIALTY_SHORT_LABELS[value] : (value ?? "—");
}

/**
 * The structured body of an exam, in the order a doctor works through a
 * consultation. Every field is optional on its own; the server requires that at
 * least one carries text, so an empty record can never be signed.
 */
export const EXAM_FIELDS = [
  { key: "chiefComplaint", label: "الشكوى", placeholder: "ما يشكو منه المريض بكلماته" },
  { key: "clinicalFindings", label: "الفحص السريري", placeholder: "ما وجدته عند الفحص" },
  { key: "diagnosis", label: "التشخيص", placeholder: "التشخيص السريري" },
  { key: "plan", label: "الخطة والتوصيات", placeholder: "خطة العلاج والتوصيات" },
  { key: "notes", label: "ملاحظات إضافية", placeholder: "أي ملاحظة أخرى" },
] as const;

export type ExamFieldKey = (typeof EXAM_FIELDS)[number]["key"];
