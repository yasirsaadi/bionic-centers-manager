// Migration 029: the clinical DECISION inside the exam (الوصفة).
//
// Until now the doctor wrote prose — "بتر تحت الركبة، يحتاج طرف مع مفصل ركبة" —
// and a receptionist then re-entered that decision into the patient's case by
// hand, from a paper note or from memory. The decision was the doctor's, but
// the data entry (and therefore any error in it) was someone else's.
//
// This column carries the structured decision as signed by the doctor: the
// prosthetic/support/physiotherapy fields the owner already designed, filed as
// part of the exam itself. On save the server copies it onto the patient's case
// so the rest of the app — manufacturing, pricing, reports — sees it exactly as
// if reception had typed it, except it is now attributable and immutable.
//
// Shape is per specialty and deliberately schemaless here (the field set is
// owned by shared/case_fields.ts, which both the form and the writer import);
// what matters at the database level is that it is captured inside the sealed
// row, so the prescription can never be edited after signing either.
//
// Idempotent, additive, non-destructive.

export const name = "029_exam_prescription";

export const sql = `
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS prescription JSONB DEFAULT '{}'::jsonb;
`;
