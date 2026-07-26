// Data layer for doctor medical examinations (معاينة الطبيب).
//
// Invariants enforced here — the routes layer assumes all of them:
//   1. An exam is only ever INSERTed. There is no update and no delete in this
//      file, and none anywhere else in the app. Postgres backs that up with a
//      trigger (migration 028) that rejects UPDATE on both tables.
//   2. The doctor's name is snapshotted onto the row at signing time, so a
//      record stays readable after the account is renamed or removed.
//   3. `caseType` is always one of the three specialties, validated by the
//      caller against the doctor's own grant before we get here.

import { db } from "../db";
import {
  medicalExams as EX,
  medicalExamAddenda as AD,
  patientCases,
  patients,
  systemUsers,
  type MedicalExam,
  type MedicalExamAddendum,
} from "@shared/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { MEDICAL_SPECIALTIES, isMedicalSpecialty, type MedicalSpecialty } from "@shared/medical";
import { PROSTHETIC_SPECS, SUPPORT_SPECS, serializeInjuries } from "@shared/case_fields";
import { storage } from "../storage";

export type ExamWithAddenda = MedicalExam & { addenda: MedicalExamAddendum[] };

/** Primary role whose whole job is clinical examination. */
export const DOCTOR_ROLE = "doctor";

/** One patient's full clinical thread, newest exam first, each with its addenda. */
export async function getExamsByPatient(patientId: number): Promise<ExamWithAddenda[]> {
  const exams = await db
    .select()
    .from(EX)
    .where(eq(EX.patientId, patientId))
    .orderBy(desc(EX.signedAt), desc(EX.id));

  if (exams.length === 0) return [];

  // Addenda are read in one round-trip and grouped in memory — a patient never
  // has enough exams for this to be worth a join.
  const addenda = await db
    .select()
    .from(AD)
    .where(inArray(AD.examId, exams.map((e) => e.id)))
    .orderBy(AD.signedAt, AD.id);

  const byExam = new Map<number, MedicalExamAddendum[]>();
  for (const a of addenda) {
    const list = byExam.get(a.examId);
    if (list) list.push(a);
    else byExam.set(a.examId, [a]);
  }

  return exams.map((e) => ({ ...e, addenda: byExam.get(e.id) ?? [] }));
}

export async function getExam(id: number): Promise<MedicalExam | undefined> {
  const [row] = await db.select().from(EX).where(eq(EX.id, id));
  return row;
}

/** Sign a new exam. The only write path that exists for this table. */
export async function createExam(values: {
  patientId: number;
  caseId: number | null;
  caseType: MedicalSpecialty;
  branchId: number | null;
  doctorId: number | null;
  doctorName: string;
  prescription: Record<string, any>;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  plan: string | null;
  notes: string | null;
}): Promise<MedicalExam> {
  const [row] = await db.insert(EX).values(values).returning();
  return row;
}

/** Append a dated correction. The original exam text is never touched. */
export async function addAddendum(values: {
  examId: number;
  doctorId: number | null;
  doctorName: string;
  body: string;
}): Promise<MedicalExamAddendum> {
  const [row] = await db.insert(AD).values(values).returning();
  return row;
}

/**
 * Apply the doctor's signed decision to the patient's record.
 *
 * Writes the SAME legacy `patients` columns reception has always written, then
 * lets `syncPatientCases` derive `patient_cases.details` from them — the
 * existing, proven propagation path. Nothing downstream (manufacturing, the
 * expert board, the case panel, reports) needs to know the values now come
 * from a doctor rather than a receptionist.
 *
 * Only non-empty values are written: a prescription that leaves a field blank
 * means "not specified", never "erase what is already there".
 *
 * Physiotherapy's prescribed course is deliberately NOT written here. Treatment
 * types and session counts drive the price, and pricing belongs to reception —
 * they open «الكلفة والجلسات» pre-filled from this prescription and confirm it.
 * The doctor decides the treatment; the clerk decides the money.
 */
export async function applyPrescription(
  patientId: number,
  caseType: MedicalSpecialty,
  prescription: Record<string, any>,
): Promise<void> {
  const patch: Record<string, any> = {};

  const put = (column: string, value: unknown) => {
    if (typeof value === "string" && value.trim()) patch[column] = value.trim();
  };

  if (caseType === "prosthetic") {
    for (const f of PROSTHETIC_SPECS) put(f.key, prescription[f.key]);
    put("injurySide", prescription.injurySide);
  } else if (caseType === "medical_support") {
    for (const f of SUPPORT_SPECS) put(f.key, prescription[f.key]);
    put("injurySide", prescription.injurySide);
  } else {
    put("diseaseType", prescription.diseaseType);
    // Injuries travel as three columns kept in sync, exactly as the patient
    // form writes them: the JSON array plus the two joined legacy strings.
    if (Array.isArray(prescription.injuries)) {
      const { injuries, injuryType, injuryArea } = serializeInjuries(prescription.injuries);
      if (injuries) {
        patch.injuries = injuries;
        patch.injuryType = injuryType;
        patch.injuryArea = injuryArea;
      }
    }
  }

  if (Object.keys(patch).length === 0) return;

  await db.update(patients).set(patch).where(eq(patients.id, patientId));
  // Re-derive the case's `details` from the columns we just wrote.
  await storage.syncPatientCases(patientId);
}

/** Resolve the patient's case row for a specialty, so the exam can point at it. */
export async function findCaseFor(
  patientId: number,
  caseType: MedicalSpecialty,
): Promise<{ id: number; branchId: number | null } | null> {
  const [row] = await db
    .select({ id: patientCases.id, branchId: patientCases.branchId })
    .from(patientCases)
    .where(and(eq(patientCases.patientId, patientId), eq(patientCases.caseType, caseType)));
  return row ?? null;
}

/**
 * The "بانتظار معاينة" signal: every ACTIVE case that has no exam yet.
 *
 * One row per (patient, specialty), so a patient in two departments can be
 * waiting on the prosthetics doctor while the physiotherapy side is already
 * seen. Scoped by branch for non-admins; `branchIds === null` means admin/all.
 */
export async function getPendingExams(
  branchIds: number[] | null,
): Promise<{ patientId: number; caseType: string }[]> {
  const scoped =
    branchIds === null
      ? sql`TRUE`
      : branchIds.length === 0
        ? sql`FALSE`
        : sql`COALESCE(pc.branch_id, p.branch_id) IN (${sql.join(
            branchIds.map((id) => sql`${id}`),
            sql`, `,
          )})`;

  const rows = await db.execute<{ patient_id: number; case_type: string }>(sql`
    SELECT pc.patient_id, pc.case_type
    FROM patient_cases pc
    JOIN patients p ON p.id = pc.patient_id
    WHERE pc.status = 'active'
      AND ${scoped}
      AND NOT EXISTS (
        SELECT 1 FROM medical_exams me
        WHERE me.patient_id = pc.patient_id
          AND me.case_type = pc.case_type
      )
  `);

  return (rows.rows ?? []).map((r) => ({
    patientId: Number(r.patient_id),
    caseType: String(r.case_type),
  }));
}

export interface WorklistRow {
  patientId: number;
  patientName: string;
  phone: string | null;
  branchId: number | null;
  branchName: string | null;
  caseType: string;
  waitingSince: string | null;
}

/**
 * The doctor's own queue: active cases with no exam yet, restricted to the
 * specialties THEY may sign for, oldest wait first.
 *
 * This is the difference between a registry and a worklist — the registry
 * answers "who are our patients", this answers "who is waiting on me". Filtered
 * server-side by specialty so a physiotherapy doctor is never shown a
 * prosthetics case they cannot act on.
 */
export async function getWorklist(
  specialties: MedicalSpecialty[],
  branchIds: number[] | null,
): Promise<WorklistRow[]> {
  if (specialties.length === 0) return [];

  const scoped =
    branchIds === null
      ? sql`TRUE`
      : branchIds.length === 0
        ? sql`FALSE`
        : sql`COALESCE(pc.branch_id, p.branch_id) IN (${sql.join(
            branchIds.map((id) => sql`${id}`),
            sql`, `,
          )})`;

  const rows = await db.execute<{
    patient_id: number;
    patient_name: string;
    phone: string | null;
    branch_id: number | null;
    branch_name: string | null;
    case_type: string;
    waiting_since: string | null;
  }>(sql`
    SELECT pc.patient_id, p.name AS patient_name, p.phone,
           COALESCE(pc.branch_id, p.branch_id) AS branch_id,
           b.name AS branch_name,
           pc.case_type, pc.created_at AS waiting_since
    FROM patient_cases pc
    JOIN patients p ON p.id = pc.patient_id
    LEFT JOIN branches b ON b.id = COALESCE(pc.branch_id, p.branch_id)
    WHERE pc.status = 'active'
      AND ${scoped}
      AND pc.case_type IN (${sql.join(
        specialties.map((s) => sql`${s}`),
        sql`, `,
      )})
      AND NOT EXISTS (
        SELECT 1 FROM medical_exams me
        WHERE me.patient_id = pc.patient_id
          AND me.case_type = pc.case_type
      )
    ORDER BY pc.created_at ASC
  `);

  return (rows.rows ?? []).map((r) => ({
    patientId: Number(r.patient_id),
    patientName: String(r.patient_name ?? ""),
    phone: r.phone ?? null,
    branchId: r.branch_id === null ? null : Number(r.branch_id),
    branchName: r.branch_name ?? null,
    caseType: String(r.case_type),
    waitingSince: r.waiting_since ? String(r.waiting_since) : null,
  }));
}

/** Which specialties of THIS patient are still waiting for a first exam. */
export async function getPendingForPatient(patientId: number): Promise<string[]> {
  const rows = await db.execute<{ case_type: string }>(sql`
    SELECT pc.case_type
    FROM patient_cases pc
    WHERE pc.patient_id = ${patientId}
      AND pc.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM medical_exams me
        WHERE me.patient_id = pc.patient_id
          AND me.case_type = pc.case_type
      )
  `);
  return (rows.rows ?? []).map((r) => String(r.case_type));
}

/**
 * The specialties a user may sign for, read fresh from the database rather than
 * from the session: a grant revoked by the admin must take effect immediately,
 * not at the doctor's next login.
 *
 * Returns [] for anyone without the capability — including admins. Signing a
 * clinical record is a professional act, not an administrative one.
 */
export async function doctorSpecialties(userId: number | null): Promise<MedicalSpecialty[]> {
  if (!userId) return [];
  const [user] = await db
    .select({
      role: systemUsers.role,
      canWrite: systemUsers.canWriteMedicalExam,
      specialties: systemUsers.medicalSpecialties,
      isActive: systemUsers.isActive,
    })
    .from(systemUsers)
    .where(eq(systemUsers.id, userId));

  if (!user || user.isActive === false) return [];
  // A user whose PRIMARY role is doctor carries the capability implicitly;
  // anyone else needs the explicit flag. Mirrors how a pure prosthetics_expert
  // works as an expert without needing can_work_as_expert set.
  const isDoctor = user.role === DOCTOR_ROLE || Boolean(user.canWrite);
  if (!isDoctor) return [];
  const raw = Array.isArray(user.specialties) ? user.specialties : [];
  const chosen = raw.filter(isMedicalSpecialty);
  // An empty list means "no restriction", not "nothing". Most centres have one
  // doctor who covers everything, and forcing them to tick three boxes to
  // achieve the default was pure friction. Narrowing stays available for
  // centres that run separate departments.
  return chosen.length > 0 ? chosen : [...MEDICAL_SPECIALTIES];
}

/** Patient identity + branch, for authorization and for stamping the exam. */
export async function getPatientScope(
  patientId: number,
): Promise<{ id: number; name: string | null; branchId: number | null } | null> {
  const [row] = await db
    .select({ id: patients.id, name: patients.name, branchId: patients.branchId })
    .from(patients)
    .where(eq(patients.id, patientId));
  return row ?? null;
}
