// Data layer for doctor medical examinations (معاينة الطبيب).
//
// Invariants enforced here — the routes layer assumes all of them:
//   1. Nothing is ever destroyed. An exam may be REVISED (030), but only
//      through `reviseExam`, which snapshots the outgoing version into
//      `medical_exam_revisions` inside the same transaction. There is no
//      delete anywhere. The 028 trigger still rejects any UPDATE that has not
//      opened the supervised `app.allow_exam_edit` door, so a stray write from
//      a console or a future bug is still refused.
//   2. The doctor's name is snapshotted onto the row at signing time, so a
//      record stays readable after the account is renamed or removed.
//   3. `caseType` is always one of the three specialties, validated by the
//      caller against the doctor's own grant before we get here.

import { db } from "../db";
import {
  medicalExams as EX,
  medicalExamAddenda as AD,
  medicalExamRevisions as REV,
  patientCases,
  patients,
  systemUsers,
  type MedicalExam,
  type MedicalExamAddendum,
  type MedicalExamRevision,
} from "@shared/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { MEDICAL_SPECIALTIES, isMedicalSpecialty, type MedicalSpecialty } from "@shared/medical";
import { PROSTHETIC_SPECS, SUPPORT_SPECS, buildAmputationSite, serializeInjuries } from "@shared/case_fields";
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
  deviceCost: number | null;
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
    // The amputation builder's structured parts live in the prescription; the
    // legacy column stores the COMPOSED string, in the exact format the
    // registration form has always produced — EditPatient's parser and the
    // expert order page keep reading doctor-written values unchanged.
    const site = buildAmputationSite(prescription);
    if (site) patch.amputationSite = site;
    // Raise the legacy flag too. `syncPatientCases` would infer the case from
    // the detail columns alone, but a great deal of UI still reads the FLAG:
    // the registry chips, the manufacturing card on the patient page, and —
    // most consequentially — AssignExpertDialog, which derives the work order's
    // serviceType from it. Leaving the flag false produced a prosthesis order
    // for a patient the doctor had prescribed a support for.
    patch.isAmputee = true;
  } else if (caseType === "medical_support") {
    for (const f of SUPPORT_SPECS) put(f.key, prescription[f.key]);
    put("injurySide", prescription.injurySide);
    patch.isMedicalSupport = true;
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

// NOTE deliberately absent: nothing here writes the doctor's device price onto
// the case. The price stays on the exam as a PROPOSAL (`medical_exams.
// device_cost`) until reception confirms it in «تخصيص وإسناد خبير» — whose
// save path (storage.assignManufacturing) is the single place a device sale
// enters the books: it sets the case cost AND bumps patients.total_cost, which
// is what totalRevenue actually sums. Writing the case cost directly from the
// exam (the first implementation) put the amount into the per-section split
// while totalRevenue never saw it — and then assignManufacturing's delta
// (price − oldCaseCost) came out 0, so the sale never reached the books at
// all. A patient who walks out without paying now leaves no trace in the
// accounts, exactly as the owner specified.

/**
 * The doctor changed WHICH device the patient needs (أطراف ⇄ مساند).
 *
 * Reception's initial pick is a first guess; the doctor's decision replaces it
 * rather than adding a second thread — otherwise the superseded case stays
 * active forever, nagging in the pending badge and the worklist, which is
 * exactly what happened in practice.
 *
 * Reuses `storage.deleteCaseType`, which already carries the guards this needs:
 * it refuses when a work order or a tagged payment exists for the old type, and
 * it moves any visits/payments onto the remaining case before clearing the old
 * columns. So a case that has REAL history is never silently discarded — the
 * caller reports the refusal and both cases simply stay.
 *
 * Returns true when the switch happened.
 */
export async function retireSupersededCase(
  patientId: number,
  keepType: MedicalSpecialty,
  /**
   * The patient's device case types as they stood BEFORE this prescription was
   * applied. Essential: applying the prescription creates the new case, so
   * reading the state afterwards can no longer tell a CHANGE apart from an
   * addition.
   */
  deviceTypesBefore: string[],
): Promise<{ switched: boolean; reason?: string }> {
  // Only the two device specialties trade places. Physiotherapy is a different
  // service entirely, not an alternative reading of the same need.
  if (keepType !== "prosthetic" && keepType !== "medical_support") {
    return { switched: false };
  }
  const dropType = keepType === "prosthetic" ? "medical_support" : "prosthetic";

  // A switch is ONLY when reception had made exactly one device determination
  // and the doctor picked the other one. If the patient already carried BOTH —
  // a legitimate combination reception adds through «إضافة نوع حالة» — then the
  // doctor is documenting one of two real threads, and retiring the other would
  // silently destroy a service the patient actually needs.
  const hadOnlyTheOther =
    deviceTypesBefore.length === 1 && deviceTypesBefore[0] === dropType;
  if (!hadOnlyTheOther) return { switched: false };

  try {
    await storage.deleteCaseType(patientId, dropType);
    return { switched: true };
  } catch (err: any) {
    // Guard tripped — the old case has real history (a work order, or tagged
    // payments). Keep both and let the caller say so.
    return { switched: false, reason: err?.message || "تعذّر استبدال الحالة السابقة" };
  }
}

/** The patient's DEVICE case types (أطراف/مساند) as they stand right now. */
export async function deviceCaseTypes(patientId: number): Promise<string[]> {
  const rows = await db
    .select({ caseType: patientCases.caseType })
    .from(patientCases)
    .where(eq(patientCases.patientId, patientId));
  return rows
    .map((r) => r.caseType)
    .filter((t) => t === "prosthetic" || t === "medical_support");
}

/**
 * Replace an exam with a new version, keeping the old one.
 *
 * The whole transaction runs behind `app.allow_exam_edit`, the supervised door
 * the 028 trigger leaves open: the previous version is copied into
 * `medical_exam_revisions` FIRST, and only then is the live row replaced. If
 * anything fails the transaction rolls back and the record is untouched — there
 * is no window in which a version exists nowhere.
 */
export async function reviseExam(
  examId: number,
  values: {
    caseType: MedicalSpecialty;
    prescription: Record<string, any>;
    deviceCost: number | null;
    chiefComplaint: string | null;
    clinicalFindings: string | null;
    diagnosis: string | null;
    plan: string | null;
    notes: string | null;
  },
  editor: { userId: number | null; userName: string },
): Promise<MedicalExam> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.allow_exam_edit = 'on'`);

    const [current] = await tx.select().from(EX).where(eq(EX.id, examId));
    if (!current) throw new Error("المعاينة غير موجودة");

    await tx.insert(REV).values({
      examId: current.id,
      version: current.version,
      caseType: current.caseType,
      doctorId: current.doctorId,
      doctorName: current.doctorName,
      chiefComplaint: current.chiefComplaint,
      clinicalFindings: current.clinicalFindings,
      diagnosis: current.diagnosis,
      plan: current.plan,
      notes: current.notes,
      prescription: current.prescription,
      deviceCost: current.deviceCost,
      signedAt: current.signedAt,
      editedBy: editor.userId,
      editedByName: editor.userName,
    });

    // `caseId` is re-resolved for the (possibly new) specialty so a type change
    // does not leave the exam pointing at the case it used to belong to.
    const [caseRow] = await tx
      .select({ id: patientCases.id })
      .from(patientCases)
      .where(
        and(
          eq(patientCases.patientId, current.patientId),
          eq(patientCases.caseType, values.caseType),
        ),
      );

    const [updated] = await tx
      .update(EX)
      .set({
        caseType: values.caseType,
        caseId: caseRow?.id ?? current.caseId,
        prescription: values.prescription,
        deviceCost: values.deviceCost,
        chiefComplaint: values.chiefComplaint,
        clinicalFindings: values.clinicalFindings,
        diagnosis: values.diagnosis,
        plan: values.plan,
        notes: values.notes,
        version: current.version + 1,
        editedAt: new Date(),
        editedBy: editor.userId,
        editedByName: editor.userName,
      })
      .where(eq(EX.id, examId))
      .returning();

    return updated;
  });
}

/** Every superseded version of an exam, oldest first. */
export async function getRevisions(examIds: number[]): Promise<MedicalExamRevision[]> {
  if (examIds.length === 0) return [];
  return await db
    .select()
    .from(REV)
    .where(inArray(REV.examId, examIds))
    .orderBy(REV.examId, REV.version);
}

/**
 * Does a signed exam exist for (patient, specialty)?
 *
 * The workflow gate: an INITIAL-BUILD work order (تخصيص / بدء التصنيع) may not
 * be created before the doctor has examined the patient — on what basis would
 * an expert be assigned? Maintenance episodes are exempt: the device already
 * exists and was prescribed once.
 */
export async function hasSignedExam(
  patientId: number,
  caseType: MedicalSpecialty,
): Promise<boolean> {
  const [row] = await db
    .select({ id: EX.id })
    .from(EX)
    .where(and(eq(EX.patientId, patientId), eq(EX.caseType, caseType)))
    .limit(1);
  return !!row;
}

/** The newest signed exam's proposed device price, or null when unset. */
export async function latestDeviceCost(
  patientId: number,
  caseType: MedicalSpecialty,
): Promise<number | null> {
  const [exam] = await db
    .select({ deviceCost: EX.deviceCost })
    .from(EX)
    .where(and(eq(EX.patientId, patientId), eq(EX.caseType, caseType)))
    .orderBy(desc(EX.signedAt), desc(EX.id))
    .limit(1);
  return typeof exam?.deviceCost === "number" && exam.deviceCost > 0 ? exam.deviceCost : null;
}

/**
 * The newest signed exam's non-empty device specs for (patient, specialty).
 *
 * Read by the تخصيص endpoint so the doctor's signed specification always wins
 * over whatever the request body carries: reception may FILL fields the doctor
 * left blank, but may not rewrite the ones the doctor decided.
 */
export async function prescribedSpecs(
  patientId: number,
  caseType: MedicalSpecialty,
): Promise<Record<string, string>> {
  const [exam] = await db
    .select({ prescription: EX.prescription })
    .from(EX)
    .where(and(eq(EX.patientId, patientId), eq(EX.caseType, caseType)))
    .orderBy(desc(EX.signedAt), desc(EX.id))
    .limit(1);
  const rx = exam?.prescription;
  if (!rx || typeof rx !== "object") return {};
  const fields = caseType === "prosthetic" ? PROSTHETIC_SPECS : SUPPORT_SPECS;
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = (rx as Record<string, unknown>)[f.key];
    if (typeof v === "string" && v.trim()) out[f.key] = v.trim();
  }
  return out;
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

/**
 * The positive counterpart: specialties the doctor has already DECIDED, so the
 * registry can say "تم تحديد مسند" rather than merely dropping the amber chip.
 * Reception reads this as their cue to assign an expert and take payment.
 *
 * Scoped by the exam's own branch, since that is where the exam was signed.
 */
export async function getDecidedExams(
  branchIds: number[] | null,
): Promise<{ patientId: number; caseType: string }[]> {
  const scoped =
    branchIds === null
      ? sql`TRUE`
      : branchIds.length === 0
        ? sql`FALSE`
        : sql`COALESCE(me.branch_id, p.branch_id) IN (${sql.join(
            branchIds.map((id) => sql`${id}`),
            sql`, `,
          )})`;

  const rows = await db.execute<{ patient_id: number; case_type: string }>(sql`
    SELECT DISTINCT me.patient_id, me.case_type
    FROM medical_exams me
    JOIN patients p ON p.id = me.patient_id
    WHERE ${scoped}
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
