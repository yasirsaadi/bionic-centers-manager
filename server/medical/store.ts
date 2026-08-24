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
import { activePatientDrizzle } from "../patients/active_patient";
import {
  claimAwaitingEpisodeForExam, markEpisodeExamined, DeviceEpisodeError,
} from "../device_episodes/store";
import { ensureFollowupForSignedExam } from "../followup/store";
import { activeExamDrizzle, activeExamSql } from "./active_exam";

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

/**
 * Sign a new exam. The only write path that exists for this table.
 *
 * ══ Binding the exam to the device it is about ═════════════════════════
 * When the patient has an OPEN device episode still `awaiting_exam`, this
 * exam is the one that episode was waiting for: the row records which
 * device it examined, and the episode advances to `examined`. Both writes
 * live in ONE transaction — an exam claiming an episode that never moved,
 * or an episode marked examined with no exam behind it, would each be a
 * silent lie in a clinical record.
 *
 * The episode is locked (`FOR UPDATE`) before it is read, so two doctors
 * signing at once cannot both claim the same one.
 *
 * Deliberately NOT automatic in reverse: an exam never CREATES an episode.
 * Most exams are ordinary follow-ups, not device purchases — minting a
 * device request from every consultation would fabricate demand.
 *
 * `medical_exams.device_episode_id` carries no foreign key on purpose (the
 * 028 seal trigger rejects the SET NULL that a FK would need), so the
 * patient/case match is verified HERE, in code. The absence of a database
 * constraint is exactly why this check may not be skipped.
 */
export async function createExam(values: {
  patientId: number;
  caseId: number | null;
  caseType: MedicalSpecialty;
  branchId: number | null;
  doctorId: number | null;
  doctorName: string;
  prescription: Record<string, any>;
  deviceCost: number | null;
  proposedExpertUserId: number | null;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  plan: string | null;
  notes: string | null;
}): Promise<MedicalExam> {
  const isDevice = values.caseType === "prosthetic" || values.caseType === "medical_support";

  return await db.transaction(async (tx) => {
    let episodeId: number | null = null;

    if (isDevice && values.caseId !== null) {
      episodeId = await claimAwaitingEpisodeForExam(tx, {
        patientId: values.patientId, caseId: values.caseId,
      });
    }

    const [row] = await tx
      .insert(EX)
      .values({ ...values, deviceEpisodeId: episodeId })
      .returning();

    if (episodeId !== null) await markEpisodeExamined(tx, episodeId);

    // ══ متابعةُ ما بعد المعاينة (ترحيل ٠٥٣) ═══════════════════════════
    // الطبيب قرّر، والمريض لم يقرّر بعد. فتُفتح متابعةٌ بحالة «بانتظار قرار
    // المريض» **في معاملة التوقيع نفسها**: معاينةٌ موقّعة بلا متابعة تعني
    // مريضاً يختفي من كل شاشة، وهو بالضبط الفراغ الذي بُنيت له الميزة.
    //
    // **ولا تبدأ تصنيعاً ولا تغيّر الحلقة ولا تلمس المعاينة**: الحلقة تبقى
    // `examined` كما حرّكها السطر أعلاه، والبيع يمرّ من «تخصيص» وحده.
    //
    // idempotent بالبناء: التكرار يصطدم بفهرس التفرّد الجزئي فيُبتلع.
    //
    // وفشلُها لا يجوز أن يُسقط توقيع سجلٍّ سريري — الطبيب وقّع، والمتابعة
    // طبقةٌ تجارية فوقه. **وداخل نقطة حفظ لا مجرّد `try`**: خطأٌ في معاملة
    // Postgres يُفسدها كلّها، فالتقاطُه وحده كان سيجعل COMMIT يتحوّل إلى
    // ROLLBACK — فتضيع المعاينة صامتةً وهو أسوأ ما نحرس منه. والنقطة تحصر
    // الأثر في هذه الكتلة وتُبقي المعاملة صالحة.
    if (isDevice) {
      try {
        await tx.transaction(async (inner: any) => {
          await ensureFollowupForSignedExam(inner, {
            patientId: values.patientId,
            caseId: values.caseId,
            deviceEpisodeId: episodeId,
            medicalExamId: row.id,
            branchId: values.branchId,
            serviceType: values.caseType as "prosthetic" | "medical_support",
            deviceCost: values.deviceCost,
            //  اقتراحُ الطبيب يُبذَر في المتابعة — والاستعلامات تُبقيه أو
            //  تغيّره. فلا يُسأل الطبيبُ عنه ثانيةً لحظة اعتماد الشراء.
            proposedExpertUserId: values.proposedExpertUserId,
            actor: { userId: values.doctorId, userName: values.doctorName },
          });
        });
      } catch (err) {
        console.error("[medical] فتح متابعة ما بعد المعاينة فشل:", err);
      }
    }

    return row;
  });
}

// ── episode-aware readers (PR #217) ─────────────────────────────────────────
// The old helpers answer "has this PATIENT been examined for this specialty",
// which was right while a patient could only ever have one device per thread.
// It is wrong the moment he returns for a second one: an exam from two years
// ago would unlock manufacturing for a device nobody has looked at.
//
// These read ONE episode's own exam and nothing else — no fallback to
// (patient, caseType), because a fallback is precisely the bug. The old
// helpers stay for now; the current workflow still runs on them and is
// switched over in the next PR.

/** Has THIS device been examined? */
export async function hasSignedExamForEpisode(episodeId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: EX.id })
    .from(EX)
    .where(and(eq(EX.deviceEpisodeId, episodeId), activeExamDrizzle()))
    .limit(1);
  return !!row;
}

/** THIS device's proposed price, from its own exam only. */
export async function latestDeviceCostForEpisode(episodeId: number): Promise<number | null> {
  const [exam] = await db
    .select({ deviceCost: EX.deviceCost })
    .from(EX)
    .where(and(eq(EX.deviceEpisodeId, episodeId), activeExamDrizzle()))
    .orderBy(desc(EX.signedAt), desc(EX.id))
    .limit(1);
  return typeof exam?.deviceCost === "number" && exam.deviceCost > 0 ? exam.deviceCost : null;
}

/** THIS device's prescribed specs, from its own exam only. */
export async function prescribedSpecsForEpisode(
  episodeId: number,
  caseType: MedicalSpecialty,
): Promise<Record<string, string>> {
  const [exam] = await db
    .select({ prescription: EX.prescription })
    .from(EX)
    .where(and(eq(EX.deviceEpisodeId, episodeId), activeExamDrizzle()))
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

/**
 * Is this user a manufacturing expert reachable from `branchId`?
 *
 * The doctor's suggested expert is validated against the same roster
 * reception picks from, so a stale or hand-crafted id can never reach the
 * work order — it is dropped and the field simply stays empty.
 */
export async function isExpertInBranch(userId: number, branchId: number | null): Promise<boolean> {
  if (!Number.isFinite(userId) || branchId === null) return false;
  const [row] = await db
    .select({ id: systemUsers.id })
    .from(systemUsers)
    .where(
      and(
        eq(systemUsers.id, userId),
        eq(systemUsers.isActive, true),
        sql`(${systemUsers.role} = 'prosthetics_expert' OR ${systemUsers.canWorkAsExpert} = true)`,
        sql`(${systemUsers.branchIds} @> ${JSON.stringify([branchId])}::jsonb OR ${systemUsers.branchId} = ${branchId})`,
      ),
    );
  return !!row;
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
    // The prescribed course lands on the patient row THE MOMENT the exam is
    // signed. Doctors reported their session counts "not showing in the
    // patient record": they lived only inside the exam card until reception
    // priced them, so the file looked untreated and patients waited. This
    // writes the SAME treatmentType column the pricing step writes — with the
    // counts, e.g. "روبوت (10 جلسات)، أبر صينية (5 جلسات)" — and pricing later
    // overwrites it with the confirmed plan through the same proven path.
    // Money still never moves here: pricing remains reception's alone.
    if (Array.isArray(prescription.treatments)) {
      const course = (prescription.treatments as any[])
        .filter((t) => t && typeof t.treatmentType === "string" && t.treatmentType)
        .map((t) => {
          const n = Number(t.sessionCount) || 0;
          return n > 0 ? `${t.treatmentType} (${n} جلسات)` : t.treatmentType;
        });
      if (course.length > 0) patch.treatmentType = course.join("، ");
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
    proposedExpertUserId: number | null;
    chiefComplaint: string | null;
    clinicalFindings: string | null;
    diagnosis: string | null;
    plan: string | null;
    notes: string | null;
  },
  editor: { userId: number | null; userName: string },
  /**
   * **معاملةُ المُستدعي** — يمرّرها تصحيحُ السعر فيصير التنقيحُ والتزامنُ
   * والحدثُ معاملةً واحدة: تنجح معاً أو تسقط معاً. ومَن لا يمرّر شيئاً
   * يفتح معاملته كما كان — نفسُ نمط `createMaintenanceOrderWithVisit`.
   *
   * ولا نسخةَ ثانية من منطق النسخ: الجسمُ واحد، والفرقُ مَن يملك المعاملة.
   */
  opts?: { tx?: any },
): Promise<MedicalExam> {
  const body = async (tx: any) => {
    //  ختمُ ٠٢٨ يرفض أيّ تعديلٍ لم يفتح البابَ المراقَب — ويُفتَح داخل
    //  المعاملة العاملة أيّاً كان صاحبُها، فـ`SET LOCAL` نطاقُها المعاملة.
    await tx.execute(sql`SET LOCAL app.allow_exam_edit = 'on'`);

    const [current] = await tx.select().from(EX).where(eq(EX.id, examId));
    if (!current) throw new Error("المعاينة غير موجودة");

    // ══ A LINKED EXAM MAY NOT CHANGE SPECIALTY ═══════════════════════════
    // Below, `caseType` is rewritten and `caseId` re-resolved for the new
    // specialty — but `deviceEpisodeId` is not, and cannot be: it names ONE
    // physical device on ONE thread. Letting the type change would leave a
    // medical_support exam still pointing at a prosthetic episode, which is
    // not a stale field but a false clinical record — and the column carries
    // no foreign key (the 028 seal trigger forbids the SET NULL one needs),
    // so nothing downstream would catch it.
    //
    // Refused BEFORE the revision row is written and before any UPDATE, so a
    // rejected edit leaves no trace at all. And refused rather than repaired:
    // silently clearing the link, moving the exam to another episode, or
    // cancelling the device would each be this code guessing at a decision
    // that belongs to a human. The doctor cancels the wrong device request
    // and starts the right one.
    if (current.deviceEpisodeId !== null && values.caseType !== current.caseType) {
      throw new DeviceEpisodeError(
        "لا يمكن تغيير اختصاص معاينة مرتبطة بجهاز — ألغِ طلب الجهاز وابدأ الطلب الصحيح",
        409,
      );
    }

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
      proposedExpertUserId: current.proposedExpertUserId,
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
        proposedExpertUserId: values.proposedExpertUserId,
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
  };
  return opts?.tx ? await body(opts.tx) : await db.transaction(body);
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
    .where(and(eq(EX.patientId, patientId), eq(EX.caseType, caseType), activeExamDrizzle()))
    .limit(1);
  return !!row;
}

// ---- legacy exemption (owner's decision 2026-07-29) -------------------------
// Patients registered BEFORE the exam system went live were prescribed and
// fitted under the old workflow; holding their routine work hostage to a
// retroactive exam served no one — reception froze waiting for the doctor,
// and the doctor's worklist drowned in old files. "Legacy" is pinned to the
// moment migration 028 was applied in THIS database: deterministic, exact per
// environment, and a NEW patient can never age into the exemption. The doctor
// may still examine a legacy patient — the exemption removes the OBLIGATION,
// not the possibility.
let examActivationCache: Date | null | undefined;
export async function examSystemActivatedAt(): Promise<Date | null> {
  if (examActivationCache !== undefined) return examActivationCache;
  try {
    const r = await db.execute<{ applied_at: string | Date }>(sql`
      SELECT applied_at FROM _migrations WHERE name = '028_medical_exams' LIMIT 1
    `);
    const v = (r.rows ?? [])[0]?.applied_at;
    examActivationCache = v ? new Date(v) : null;
  } catch {
    examActivationCache = null;
  }
  return examActivationCache;
}

export async function isLegacyPatient(patientId: number): Promise<boolean> {
  const [p] = await db
    .select({ createdAt: patients.createdAt, classification: patients.patientClassification })
    .from(patients)
    .where(eq(patients.id, patientId));
  if (!p) return false;
  // Reception's own classification counts too: a returning patient whose
  // paper file is years old often gets his SYSTEM file created today —
  // createdAt alone would wrongly treat him as new (caught by the owner on
  // patient نعمه, classified "مريض قديم" but registered hours after go-live).
  if (p.classification === "past") return true;
  const activated = await examSystemActivatedAt();
  if (!activated) return false;
  return !!p.createdAt && p.createdAt < activated;
}

/** The newest signed exam's proposed device price, or null when unset. */
export async function latestDeviceCost(
  patientId: number,
  caseType: MedicalSpecialty,
): Promise<number | null> {
  const [exam] = await db
    .select({ deviceCost: EX.deviceCost })
    .from(EX)
    .where(and(eq(EX.patientId, patientId), eq(EX.caseType, caseType), activeExamDrizzle()))
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
    .where(and(eq(EX.patientId, patientId), eq(EX.caseType, caseType), activeExamDrizzle()))
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
  /**
   * `false` (default) → the MANDATORY queue: new patients only.
   * `true` → the OPTIONAL list: exam-exempt legacy patients who still have an
   * un-examined active case. They carry no amber badge and no obligation, but
   * a doctor must still be able to open «كتابة معاينة» for them from the
   * registry — the exemption lifted the requirement, not the possibility.
   */
  legacyOnly = false,
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

  // Legacy patients are exempt from the exam requirement, so they never
  // appear as "waiting" — the amber badges and the doctor's queue stay clean
  // for genuinely new patients. Legacy = registered before go-live OR
  // classified «مريض قديم» by reception (same rule as isLegacyPatient).
  const activated = await examSystemActivatedAt();
  const isLegacy = activated
    ? sql`(p.created_at < ${activated} OR COALESCE(p.patient_classification, '') = 'past')`
    : sql`COALESCE(p.patient_classification, '') = 'past'`;
  // PHYSIOTHERAPY IS NEVER MANDATORY (owner, 2026-08-01, all branches):
  // reception registers, prices and runs the whole course on its own. A
  // doctor's exam is welcome — «فزايد خير» — so the case still shows up as an
  // OPTIONAL one (the «كتابة معاينة» button stays), it just never wears the
  // amber "waiting" badge or blocks anybody. Only the device specialties keep
  // the obligation, because there تخصيص genuinely cannot proceed without it.
  const isExempt = sql`(${isLegacy} OR pc.case_type = 'physiotherapy')`;

  // ══ A NEW DEVICE IS ALWAYS WAITING ═══════════════════════════════════
  // An open episode still `awaiting_exam` means the patient asked for a
  // device NOW. Nothing about his past excuses that exam: not an exam from
  // two years ago, not a device already delivered, not «مريض قديم», not a
  // pre-go-live file. The legacy exemption forgave the RETROACTIVE exam for
  // devices fitted under the old workflow — it cannot forgive one for a
  // device requested today, or the doctor would be asked to approve
  // manufacturing he never looked at.
  //  ══ **إلّا ما قيل صراحةً إنه لا يحتاجها** (ترحيل ٠٦٥) ══════════════
  //  الجملةُ أعلاه بقيت صحيحة: طلبٌ جديد لا يعفيه ماضي صاحبه. لكنّ سؤالاً
  //  جديداً صار يُطرَح على **الطلب نفسِه** عند فتحه: «أتحتاج هذه العملية
  //  معاينةَ طبيب؟». فمَن أجاب «لا» لا يُساق إلى طابور الطبيب — ليس لأن
  //  المريض قديم، بل لأن **هذه العملية بعينها** قيل إنها لا تحتاجه.
  //
  //  و`IS DISTINCT FROM` لا `<>`: حلقةُ ما قبل ٠٦٥ تحمل `NULL` (لم تُسأل)،
  //  و`<>` كانت ستُقيَّم `NULL` فتُسقطها من الطابور — أي تُعفي بصمتٍ ما لم
  //  يُعفِه أحد. فالغيابُ يُقرأ «تنتظر» تماماً كما كان قبل هذه المرحلة.
  const awaitingEpisode = sql`EXISTS (
    SELECT 1 FROM patient_device_episodes e
     WHERE e.case_id = pc.id AND e.status = 'awaiting_exam'
       AND e.service_path IS DISTINCT FROM 'no_exam')`;
  // The old path stays EXACTLY as it was, but only for threads that carry no
  // episode at all. A thread whose episodes are all delivered/cancelled is
  // settled: its devices were handled, and it must not drag the patient back
  // into the queue.
  const noEpisodes = sql`NOT EXISTS (
    SELECT 1 FROM patient_device_episodes e WHERE e.case_id = pc.id)`;
  const neverExamined = sql`NOT EXISTS (
    SELECT 1 FROM medical_exams me
     WHERE me.patient_id = pc.patient_id AND me.case_type = pc.case_type
       AND ${activeExamSql("me")})`;

  // ══ المنتظِرُ معاينةً كاملة من المراجعة (ترحيل ٠٥٥) ══════════════════
  // بابان يلتقيان هنا: ما **أرسله الاستقبال كاملاً** من أوّله (جهازٌ جديد،
  // تغيّرٌ سريري)، وما **أحاله الطبيب** بعد نظرةٍ سريعة. وكلاهما يُلزِم مهما
  // كان تصنيفُ المريض أو تاريخُه — لا «مريض قديم» ولا معاينةٌ قديمة تُسقطه.
  //
  // والخروج بتوقيع معاينةٍ **بعد** لحظة الطلب: `COALESCE` يختار لحظةَ
  // الإحالة إن وُجدت وإلّا لحظةَ الإنشاء. فمعاينةٌ **سابقة** لا تكتم طلباً
  // لاحقاً — وهذا هو الثابت الذي جاء الشرط ليحرسه.
  const awaitingExamReview = sql`EXISTS (
    SELECT 1 FROM medical_review_requests r
     WHERE r.patient_id = pc.patient_id
       AND r.service_type = pc.case_type
       AND (r.status = 'escalated'
            OR (r.status = 'pending' AND r.requested_path = 'full'))
       AND NOT EXISTS (
         SELECT 1 FROM medical_exams me2
          WHERE me2.patient_id = r.patient_id
            AND me2.case_type = r.service_type
            AND me2.created_at >= COALESCE(r.decided_at, r.created_at)
            AND ${activeExamSql("me2")}))`;
  const legacyPath = sql`(${noEpisodes} AND ${legacyOnly ? isExempt : sql`NOT ${isExempt}`} AND ${neverExamined})`;
  // The optional list is for the exempt only; a mandatory awaiting-exam
  // episode belongs in the amber queue, never in the quiet one.
  //  والمنتظِرُ معاينةً كاملة يقع في الطابور الإلزامي دائماً — لا في الهادئة.
  const filter = legacyOnly
    ? sql`(${legacyPath} AND NOT ${awaitingExamReview})`
    : sql`(${awaitingEpisode} OR ${awaitingExamReview} OR ${legacyPath})`;

  const rows = await db.execute<{ patient_id: number; case_type: string }>(sql`
    SELECT pc.patient_id, pc.case_type
    FROM patient_cases pc
    JOIN patients p ON p.id = pc.patient_id
    WHERE pc.status = 'active'
      -- **والمحذوفُ يخرج من كلّ طابور** (ترحيل ٠٦٨).
      AND p.deleted_at IS NULL
      AND ${scoped}
      AND ${filter}
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

  // ══ "تم تحديد" must describe the device in hand ══════════════════════
  // Reception reads this badge as its cue to assign an expert and take money,
  // so it must answer for the CURRENT device — never for a previous one.
  //
  // Once a thread has entered the episode-aware flow, the episodes are the
  // whole truth: `examined` means decided, and anything else — awaiting,
  // in manufacturing, cancelled, delivered — does not. A cancelled request
  // whose exam still sits in the table must NOT keep telling reception to
  // collect payment for a device nobody is building.
  //
  // The marker for "this thread entered the new flow" is an exam actually
  // LINKED to one of its episodes — not the mere existence of an episode.
  // Migration 050 created 102 historical episodes and deliberately linked no
  // exams to them; treating those as new-flow threads would strip the badge
  // from devices delivered years ago. So a thread with episodes but no
  // linked exam keeps the old signal exactly as it was.
  const episodeAware = sql`EXISTS (
    SELECT 1 FROM medical_exams m2
      JOIN patient_device_episodes e2 ON e2.id = m2.device_episode_id
     WHERE e2.case_id = pc.id AND ${activeExamSql("m2")})`;
  const openExamined = sql`EXISTS (
    SELECT 1 FROM patient_device_episodes e
     WHERE e.case_id = pc.id AND e.status = 'examined')`;
  const noOpenEpisode = sql`NOT EXISTS (
    SELECT 1 FROM patient_device_episodes e
     WHERE e.case_id = pc.id AND e.status NOT IN ('delivered', 'cancelled'))`;

  const rows = await db.execute<{ patient_id: number; case_type: string }>(sql`
    SELECT DISTINCT me.patient_id, me.case_type
    FROM medical_exams me
    JOIN patients p ON p.id = me.patient_id
    LEFT JOIN patient_cases pc
      ON pc.patient_id = me.patient_id AND pc.case_type = me.case_type
    WHERE p.deleted_at IS NULL
      AND ${scoped}
      AND ${activeExamSql("me")}
      AND (
        ${openExamined}
        OR (${noOpenEpisode} AND NOT ${episodeAware})
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
  /** الرمز العلني الدائم — الطبيب يبحث برمزٍ كما يبحث باسم. */
  patientCode: string | null;
  /** رموزُ ملفّاتٍ دُمجت في هذا الملفّ — تُرفَق في النقطة دفعةً واحدة. */
  aliasCodes?: string[];
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

  // Legacy patients never enter the doctor's queue (same rule as the pending
  // maps): the worklist is for genuinely new patients only.
  const activatedWl = await examSystemActivatedAt();
  const notLegacyWl = activatedWl
    ? sql`(p.created_at >= ${activatedWl} AND COALESCE(p.patient_classification, '') <> 'past')`
    : sql`COALESCE(p.patient_classification, '') <> 'past'`;

  const rows = await db.execute<{
    patient_id: number;
    patient_name: string;
    phone: string | null;
    patient_code: string | null;
    branch_id: number | null;
    branch_name: string | null;
    case_type: string;
    waiting_since: string | null;
  }>(sql`
    SELECT pc.patient_id, p.name AS patient_name, p.phone, p.patient_code,
           COALESCE(pc.branch_id, p.branch_id) AS branch_id,
           b.name AS branch_name,
           pc.case_type,
           -- A device request starts waiting when it was OPENED, not when the
           -- specialty thread was first created years earlier.
           COALESCE(ep.created_at, pc.created_at) AS waiting_since
    FROM patient_cases pc
    JOIN patients p ON p.id = pc.patient_id
    LEFT JOIN branches b ON b.id = COALESCE(pc.branch_id, p.branch_id)
    -- At most one row can join: uq_pde_case_open permits a single non-terminal
    -- episode per thread, so a returning patient appears ONCE, never twice.
    LEFT JOIN patient_device_episodes ep
      ON ep.case_id = pc.id AND ep.status = 'awaiting_exam'
      -- **والمسارُ يحسم لا التصنيف** (ترحيل ٠٦٥): طلبٌ قيل صراحةً إنه بلا
      -- معاينة لا ينضمّ، فلا يظهر في قائمة عمل الطبيب. و«NULL» (حلقةُ ما
      -- قبل ٠٦٥) تنضمّ كما كانت — الغيابُ ليس إعفاءً.
     AND ep.service_path IS DISTINCT FROM 'no_exam'
    WHERE pc.status = 'active'
      AND p.deleted_at IS NULL
      AND ${scoped}
      AND pc.case_type IN (${sql.join(
        specialties.map((s) => sql`${s}`),
        sql`, `,
      )})
      AND (
        -- A device requested now is on the doctor's list whoever the patient
        -- is — legacy or not, examined before or not.
        ep.id IS NOT NULL
        -- ══ المنتظِرُ معاينةً كاملة من المراجعة (ترحيل ٠٥٥) ═══════════
        -- بابان: ما أرسله الاستقبال **كاملاً** من أوّله، وما أحاله الطبيب
        -- بعد نظرةٍ سريعة. ولا استثناءَ يعلو على أيّهما: لا «مريض قديم»،
        -- ولا خيطٌ بلا حلقة، ولا معاينةٌ قديمة.
        -- والشرط أن **لا معاينةَ بعد لحظة الطلب** — فيخرج بتوقيع معاينةٍ
        -- جديدة لا بوجود واحدةٍ من قبل.
        OR EXISTS (
          SELECT 1 FROM medical_review_requests r
           WHERE r.patient_id = pc.patient_id
             AND r.service_type = pc.case_type
             AND (r.status = 'escalated'
                  OR (r.status = 'pending' AND r.requested_path = 'full'))
             AND NOT EXISTS (
               SELECT 1 FROM medical_exams me2
                WHERE me2.patient_id = r.patient_id
                  AND me2.case_type = r.service_type
                  AND me2.created_at >= COALESCE(r.decided_at, r.created_at)
                  AND ${activeExamSql("me2")}
             )
        )
        OR (
          NOT EXISTS (SELECT 1 FROM patient_device_episodes e WHERE e.case_id = pc.id)
          AND ${notLegacyWl}
          AND NOT EXISTS (
            SELECT 1 FROM medical_exams me
            WHERE me.patient_id = pc.patient_id
              AND me.case_type = pc.case_type
              AND ${activeExamSql("me")}
          )
        )
      )
    ORDER BY waiting_since ASC
  `);

  return (rows.rows ?? []).map((r) => ({
    patientId: Number(r.patient_id),
    patientName: String(r.patient_name ?? ""),
    phone: r.phone ?? null,
    patientCode: r.patient_code ? String(r.patient_code) : null,
    branchId: r.branch_id === null ? null : Number(r.branch_id),
    branchName: r.branch_name ?? null,
    caseType: String(r.case_type),
    waitingSince: r.waiting_since ? String(r.waiting_since) : null,
  }));
}

/** User id → display name, for showing WHO the doctor suggested. */
export async function userNames(ids: number[]): Promise<Record<number, string>> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isFinite(n))));
  if (unique.length === 0) return {};
  const rows = await db
    .select({ id: systemUsers.id, displayName: systemUsers.displayName })
    .from(systemUsers)
    .where(inArray(systemUsers.id, unique));
  const out: Record<number, string> = {};
  for (const r of rows) out[r.id] = r.displayName;
  return out;
}

/**
 * معاينة ⟶ متابعتُها — **الرابطُ الذي كتبه التوقيعُ نفسُه**.
 *
 * ══ لماذا يُقرأ هنا ═════════════════════════════════════════════════════
 * بطاقةُ المعاينة أحدُ أبواب «تصحيح / إلغاء العملية» الثلاثة، **لكنّ معاينةً
 * سريريةً عاديةً ليست عمليةَ جهاز**: معاينةُ علاجٍ طبيعي لا تولّد متابعةً
 * أصلاً، فعرضُ الزرّ عليها يَعِد بتصحيحٍ لا هدفَ له.
 *
 * فالشرطُ **وجودُ المتابعة** — وهي الهويّةُ نفسُها التي يفتح بها الزرُّ
 * النافذةَ، لا قرينةً ثانية. **ولا نقطةَ تصحيحٍ ثانية تُخترَع**: هذه قراءةٌ
 * تقول «أيّ معاينةٍ لها عملية»، والتصحيحُ يبقى في نقطته الواحدة.
 */
export async function followupIdsForExams(
  examIds: number[],
): Promise<Record<number, number>> {
  const unique = Array.from(new Set(examIds.filter((n) => Number.isFinite(n))));
  if (unique.length === 0) return {};
  const rows = await db.execute<{ medical_exam_id: number; id: number }>(sql`
    SELECT medical_exam_id, id
    FROM post_exam_followups
    WHERE medical_exam_id IN (${sql.join(unique.map((n) => sql`${n}`), sql`, `)})
  `);
  const out: Record<number, number> = {};
  //  والأقدمُ لا يزيح الأحدث: التوقيعُ يكتب متابعةً واحدة لكلّ معاينة،
  //  وإن وُجدت أكثرُ (صفٌّ تاريخيّ) فالأحدثُ هي العملية القائمة.
  for (const r of rows.rows ?? []) {
    const exam = Number(r.medical_exam_id);
    const id = Number(r.id);
    if (!out[exam] || id > out[exam]) out[exam] = id;
  }
  return out;
}

/** Branch id → name, for error messages that must name the branch. */
export async function branchNames(): Promise<Record<number, string>> {
  const rows = await db.execute<{ id: number; name: string }>(sql`SELECT id, name FROM branches`);
  const out: Record<number, string> = {};
  for (const r of rows.rows ?? []) out[Number(r.id)] = String(r.name);
  return out;
}

/** Which specialties of THIS patient are still waiting for an exam. */
export async function getPendingForPatient(patientId: number): Promise<string[]> {
  // The legacy exemption is evaluated INSIDE the query now, not as an early
  // return. Returning [] up front was the bug: it answered "waits on no one"
  // before ever looking at whether the patient had just requested a new
  // device — and a new device is never exempt, whoever asked for it.
  const legacy = await isLegacyPatient(patientId);
  const rows = await db.execute<{ case_type: string }>(sql`
    SELECT pc.case_type
    FROM patient_cases pc
    WHERE pc.patient_id = ${patientId}
      AND pc.status = 'active'
      AND (
        EXISTS (
          SELECT 1 FROM patient_device_episodes e
           WHERE e.case_id = pc.id AND e.status = 'awaiting_exam')
        OR (
          ${!legacy}
          AND NOT EXISTS (SELECT 1 FROM patient_device_episodes e WHERE e.case_id = pc.id)
          AND NOT EXISTS (
            SELECT 1 FROM medical_exams me
            WHERE me.patient_id = pc.patient_id
              AND me.case_type = pc.case_type
              AND ${activeExamSql("me")}
          )
        )
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
  //  **ولا تُوقَّع معاينةٌ على ملفٍّ في السلّة**: هذه النقطةُ هي ما تقرؤه
  //  طبقةُ الإذن قبل التوقيع، فغيابُ الصفّ منها يُردّ ٤٠٤ قبل أيّ كتابة.
  const [row] = await db
    .select({ id: patients.id, name: patients.name, branchId: patients.branchId })
    .from(patients)
    .where(and(eq(patients.id, patientId), activePatientDrizzle()));
  return row ?? null;
}
