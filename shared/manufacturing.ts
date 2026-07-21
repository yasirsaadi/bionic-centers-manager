// Prosthetic / medical-support manufacturing — canonical codes + Arabic labels.
// Single source of truth shared by the server (validation) and the client
// (display). Stable internal codes, Arabic labels for the UI. No expert names
// are ever hardcoded here — the expert roster is data-driven from system_users.

export type ServiceType = "prosthetic" | "medical_support";

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
};

// Why the order exists: a first build vs a maintenance job on a delivered
// device. Drives a visible badge and lets reception open a maintenance episode
// from the patient's "new visit" flow.
export const PURPOSES = ["initial_build", "maintenance"] as const;
export type Purpose = (typeof PURPOSES)[number];
export const PURPOSE_LABELS: Record<string, string> = {
  initial_build: "بناء أولي",
  maintenance: "صيانة",
};

// Ordered fabrication stages for a prosthetic limb.
export const PROSTHETIC_STAGES: string[] = [
  "new_assignment",
  "assessment_measurements",
  "cast_taken",
  "cast_preparation",
  "test_socket",
  "first_fitting",
  "socket_adjustment",
  "alignment",
  "final_socket",
  "final_assembly",
  "quality_check",
  "ready_for_delivery",
  "delivered",
  "post_delivery_followup",
];

// Ordered stages for a medical support.
export const MEDICAL_SUPPORT_STAGES: string[] = [
  "new_assignment",
  "assessment_measurements",
  "cast_if_needed",
  "manufacturing",
  "fitting",
  "adjustment",
  "quality_check",
  "ready_for_delivery",
  "delivered",
];

export const STAGE_LABELS: Record<string, string> = {
  new_assignment: "مريض جديد بانتظار بدء العمل",
  assessment_measurements: "التقييم والقياسات",
  cast_taken: "أخذ القالب",
  cast_preparation: "تحضير القالب",
  test_socket: "تصنيع السوكت التجريبي",
  first_fitting: "التجربة الأولى",
  socket_adjustment: "تعديل السوكت أو القالب",
  alignment: "المحاذاة والتجربة الوظيفية",
  final_socket: "تصنيع السوكت النهائي",
  final_assembly: "التجميع النهائي",
  quality_check: "الفحص النهائي",
  ready_for_delivery: "جاهز للتسليم",
  delivered: "تم التسليم",
  post_delivery_followup: "متابعة ما بعد التسليم",
  // medical-support specific
  cast_if_needed: "أخذ القالب عند الحاجة",
  manufacturing: "التصنيع",
  fitting: "التجربة",
  adjustment: "التعديل",
};

// Order status — deliberately separate from the current stage.
export const STATUSES: string[] = [
  "active",
  "waiting_patient",
  "waiting_components",
  "medical_hold",
  "needs_recast",
  "needs_resocket",
  "completed",
  "cancelled",
];

export const STATUS_LABELS: Record<string, string> = {
  active: "قيد العمل",
  waiting_patient: "بانتظار المريض",
  waiting_components: "بانتظار المكونات",
  medical_hold: "متوقف لسبب طبي",
  needs_recast: "يحتاج إعادة قالب",
  needs_resocket: "يحتاج إعادة سوكت",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const REWORK_TYPES: string[] = ["recast", "resocket", "major_adjustment", "full_remake"];

export const REWORK_TYPE_LABELS: Record<string, string> = {
  recast: "إعادة القالب",
  resocket: "إعادة تصنيع السوكت",
  major_adjustment: "تعديل كبير",
  full_remake: "إعادة تصنيع كاملة",
};

export const REASON_CODES: string[] = [
  "measurement_error",
  "cast_error",
  "socket_fit_error",
  "manufacturing_error",
  "patient_body_change",
  "medical_reason",
  "patient_noncompliance",
  "component_problem",
  "other",
];

export const REASON_CODE_LABELS: Record<string, string> = {
  measurement_error: "خطأ في القياس",
  cast_error: "خطأ في القالب",
  socket_fit_error: "مشكلة في ملاءمة السوكت",
  manufacturing_error: "خطأ في التصنيع",
  patient_body_change: "تغيّر في وزن أو حجم الطرف المتبقّي",
  medical_reason: "سبب طبي أو جلدي",
  patient_noncompliance: "عدم التزام المريض",
  component_problem: "مشكلة في المكونات",
  other: "سبب آخر",
};

// Fabrication & fit result — required when the stage becomes "delivered".
export const FINAL_RESULTS: string[] = [
  "first_fit_success",
  "minor_adjustment_success",
  "multiple_adjustments_success",
  "recast_required",
  "resocket_required",
  "component_changed",
  "medical_incomplete",
  "patient_absent",
  "components_unavailable",
  "technical_rejection",
  "transferred_to_another_expert",
];

export const FINAL_RESULT_LABELS: Record<string, string> = {
  first_fit_success: "ناجح من أول تجربة",
  minor_adjustment_success: "ناجح بعد تعديل بسيط",
  multiple_adjustments_success: "ناجح بعد تعديلات متعددة",
  recast_required: "احتاج إعادة قالب",
  resocket_required: "احتاج إعادة سوكت",
  component_changed: "احتاج تغيير مكوّن",
  medical_incomplete: "غير مكتمل بسبب حالة طبية",
  patient_absent: "غير مكتمل بسبب عدم حضور المريض",
  components_unavailable: "غير مكتمل بسبب نقص المكونات",
  technical_rejection: "غير مقبول فنيّاً",
  transferred_to_another_expert: "تم تحويله إلى خبير آخر",
};

// Ordered stage list for a given service type.
export function stagesForService(serviceType: string): string[] {
  return serviceType === "medical_support" ? MEDICAL_SUPPORT_STAGES : PROSTHETIC_STAGES;
}

// Server-side validators (fail closed on unknown codes).
export function isValidServiceType(v: unknown): v is ServiceType {
  return v === "prosthetic" || v === "medical_support";
}
export function isValidStageFor(serviceType: string, stage: unknown): boolean {
  return typeof stage === "string" && stagesForService(serviceType).includes(stage);
}
export function isValidStatus(v: unknown): boolean {
  return typeof v === "string" && STATUSES.includes(v);
}
export function isValidReworkType(v: unknown): boolean {
  return typeof v === "string" && REWORK_TYPES.includes(v);
}
export function isValidReasonCode(v: unknown): boolean {
  return typeof v === "string" && REASON_CODES.includes(v);
}
export function isValidFinalResult(v: unknown): boolean {
  return typeof v === "string" && FINAL_RESULTS.includes(v);
}

export const NEW_ASSIGNMENT_STAGE = "new_assignment";
export const DELIVERED_STAGE = "delivered";

// The "mold/cast taken" stage per service — the point where the expert commits
// to a delivery date (a طرف: cast_taken; a مسند: cast_if_needed). Reaching it
// requires a mandatory promised delivery date, which then locks (only branch
// management / admin may change it afterward) so the expert's delivery accuracy
// can be tracked against the date they themselves promised.
export const MOLD_STAGE: Record<string, string> = {
  prosthetic: "cast_taken",
  medical_support: "cast_if_needed",
};
export function isMoldStage(serviceType: string, stage: string): boolean {
  return MOLD_STAGE[serviceType] === stage;
}

// Is `stage` the mold stage OR any stage after it in the service's ordered
// list? Stage transitions are not forced to be sequential, so the delivery
// date must be demanded on ANY transition that lands at-or-beyond the mold
// stage — otherwise an expert who jumps straight past cast_taken would never
// commit a date and the delivery-accuracy tracking would silently never arm.
export function isAtOrBeyondMoldStage(serviceType: string, stage: string): boolean {
  const stages = stagesForService(serviceType);
  const moldIdx = stages.indexOf(MOLD_STAGE[serviceType] ?? "");
  const idx = stages.indexOf(stage);
  return moldIdx >= 0 && idx >= moldIdx;
}
