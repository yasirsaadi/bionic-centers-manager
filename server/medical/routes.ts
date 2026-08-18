// REST endpoints for doctor medical examinations (معاينة الطبيب).
//
// Authorization model:
//   READ  — any authenticated user who can reach the patient's branch. A
//           clinical record is meant to be seen by the whole care team; the
//           protection here is against writing, not reading.
//   WRITE — ONLY a user carrying `canWriteMedicalExam`, and only for a
//           specialty listed in their own `medicalSpecialties`. Admins are NOT
//           exempt: signing a clinical record is a professional act, not an
//           administrative one, so an admin who was never granted the
//           capability cannot sign either.
//   EDIT  — the doctor who SIGNED it, or the responsible manager (admin /
//           branch_manager). Nobody else, not even another doctor holding the
//           same specialty: they file an addendum rather than rewrite a
//           colleague's signature. Editing never destroys — the outgoing
//           version is archived first (see store.reviseExam).
//   DELETE — does not exist. There is deliberately no such endpoint.
//
// The grant is re-read from the database on every write rather than trusted
// from the session, so revoking a doctor's capability takes effect at once
// instead of at their next login.

import type { Express } from "express";
import { aliasCodesByPatient } from "../patient_code/store";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
import { DeviceEpisodeError } from "../device_episodes/store";
import { closeRequestsAwaitingExam } from "../medical_review/store";
import { isMedicalSpecialty, specialtyLabel, type MedicalSpecialty } from "@shared/medical";

type Req = any;

function getSession(req: Req) {
  const s = (req.session as any)?.branchSession;
  return {
    userId: (s?.userId ?? null) as number | null,
    userName: (s?.displayName ?? null) as string | null,
    role: (s?.role ?? "") as string,
    isAdmin: Boolean(s?.isAdmin),
    branchId: (s?.branchId ?? null) as number | null,
    accessible: Array.isArray(s?.accessibleBranches) ? (s.accessibleBranches as number[]) : [],
  };
}

/** Branch IDs the caller may read. `null` = admin, i.e. every branch. */
function branchScope(req: Req): number[] | null {
  const s = getSession(req);
  if (s.isAdmin) return null;
  if (s.accessible.length > 0) return s.accessible;
  return s.branchId ? [s.branchId] : [];
}

function canReachBranch(req: Req, branchId: number | null): boolean {
  const scope = branchScope(req);
  if (scope === null) return true;
  if (branchId === null) return false;
  return scope.includes(branchId);
}

/** Trim to null so a whitespace-only field never counts as clinical content. */
function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The device price, accepted for أطراف/مساند ONLY.
 *
 * Physiotherapy is untouched by design: its price is computed per session by
 * reception in «الكلفة والجلسات», so a cost arriving on a physiotherapy exam is
 * dropped rather than honoured — the doctor's form does not offer the field
 * there, and the server must not trust that it didn't.
 */
/**
 * The doctor's suggested manufacturing expert — أطراف/مساند only, and only if
 * the id really is an active expert reachable from the patient's branch. An
 * unusable suggestion is dropped rather than refused: it is a convenience for
 * reception, never a gate, and a signed clinical record must not fail over it.
 */
async function parseProposedExpert(
  raw: unknown,
  caseType: string,
  branchId: number | null,
): Promise<number | null> {
  if (caseType !== "prosthetic" && caseType !== "medical_support") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (await store.isExpertInBranch(n, branchId)) ? Math.round(n) : null;
}

function parseDeviceCost(raw: unknown, caseType: string): number | null {
  if (caseType !== "prosthetic" && caseType !== "medical_support") return null;
  const n = typeof raw === "string" ? Number(raw.replace(/,/g, "")) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/**
 * Land the doctor's decision on the patient's record, in the order the rest of
 * the app depends on:
 *
 *   1. the prescription (which CREATES the case when the doctor decides a
 *      specialty the patient had none for),
 *   2. the superseded device case is retired — reception's initial pick was a
 *      guess and the doctor's decision replaces it, so nothing is left hanging
 *      in the pending badge.
 *
 * The device price is deliberately NOT applied here. It stays on the exam as a
 * proposal until reception confirms it in «تخصيص وإسناد خبير» — the one save
 * that puts a device sale into the books (case cost + patients.total_cost). A
 * patient who walks out without paying therefore leaves the accounts untouched.
 *
 * Every step is isolated: a signed clinical record must never be undone by a
 * bookkeeping failure downstream, so problems are logged and reported, not
 * thrown.
 */
async function applyDecision(
  patientId: number,
  caseType: MedicalSpecialty,
  prescription: Record<string, any>,
): Promise<{ switchNote?: string }> {
  let switchNote: string | undefined;

  // Read the device cases BEFORE anything is applied — once the prescription
  // has run, the new case exists and a change is indistinguishable from an
  // addition.
  let deviceTypesBefore: string[] = [];
  try {
    deviceTypesBefore = await store.deviceCaseTypes(patientId);
  } catch (err) {
    console.error("[medical] reading device cases failed:", err);
  }

  try {
    await store.applyPrescription(patientId, caseType, prescription);
  } catch (err) {
    console.error("[medical] applying prescription to case failed:", err);
  }

  try {
    const result = await store.retireSupersededCase(patientId, caseType, deviceTypesBefore);
    if (result.reason) {
      switchNote = `بقيت الحالة السابقة مفتوحة: ${result.reason}`;
    }
  } catch (err) {
    console.error("[medical] retiring superseded case failed:", err);
  }

  return { switchNote };
}

export function registerMedicalRoutes(app: Express, isAuthenticated: any) {
  // ── The current user's doctor grant ──────────────────────────────────────
  // The UI asks this to decide whether to offer the "معاينة جديدة" button and
  // which specialties to put in its dropdown.
  app.get("/api/medical/me", isAuthenticated, async (req: Req, res) => {
    try {
      const { userId } = getSession(req);
      const specialties = await store.doctorSpecialties(userId);
      res.json({ canWriteMedicalExam: specialties.length > 0, specialties });
    } catch (err: any) {
      console.error("[medical] GET /me failed:", err);
      res.status(500).json({ error: "تعذّر قراءة صلاحية المعاينة" });
    }
  });

  // ── One patient's clinical thread ────────────────────────────────────────
  app.get("/api/medical/patients/:patientId/exams", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) {
        return res.status(400).json({ error: "معرّف مريض غير صالح" });
      }

      const patient = await store.getPatientScope(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branchId)) {
        return res.status(403).json({ error: "لا يمكنك الاطّلاع على مرضى فرع آخر" });
      }

      const session = getSession(req);
      const [exams, pending, specialties] = await Promise.all([
        store.getExamsByPatient(patientId),
        store.getPendingForPatient(patientId),
        store.doctorSpecialties(session.userId),
      ]);

      // Superseded versions, grouped onto their exam. Read by everyone: the
      // history is the reason editing is safe, so hiding it would defeat it.
      const revisions = await store.getRevisions(exams.map((e) => e.id));
      const byExam: Record<number, typeof revisions> = {};
      for (const r of revisions) (byExam[r.examId] ||= []).push(r);

      // A PURE prosthetics expert is financially locked out everywhere else in
      // the app; the exam carries a device price now, so strip it for them
      // rather than let the clinical record become a side channel to it.
      const hideMoney = session.role === "prosthetics_expert";
      const scrub = <T extends { deviceCost?: number | null }>(row: T): T =>
        hideMoney ? { ...row, deviceCost: null } : row;

      // Resolve the suggested experts' names once, so the card and reception's
      // dialog can show a person rather than an id.
      const expertNames = await store.userNames(
        exams.map((e) => e.proposedExpertUserId).filter((n): n is number => typeof n === "number"),
      );

      res.json({
        exams: exams.map((e) => ({
          ...scrub(e),
          proposedExpertName: e.proposedExpertUserId != null
            ? expertNames[e.proposedExpertUserId] ?? null
            : null,
          revisions: (byExam[e.id] ?? []).map(scrub),
        })),
        pending, // active specialties with no exam yet → "بانتظار معاينة"
        canWriteMedicalExam: specialties.length > 0,
        specialties,
        // Who may press "تعديل" — the author, or the responsible manager. Sent
        // from the server so the UI can never offer an action the server would
        // then refuse.
        canManageExams: session.isAdmin || session.role === "branch_manager",
        userId: session.userId,
        // Registered before the exam system went live ⇒ exempt from the exam
        // requirement (تخصيص unlocks, reception enters the cost directly).
        legacyExempt: await store.isLegacyPatient(patientId),
      });
    } catch (err: any) {
      console.error("[medical] GET exams failed:", err);
      res.status(500).json({ error: "تعذّر تحميل المعاينات" });
    }
  });

  // ── Sign a new exam ──────────────────────────────────────────────────────
  app.post("/api/medical/patients/:patientId/exams", isAuthenticated, async (req: Req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      if (!Number.isFinite(patientId)) {
        return res.status(400).json({ error: "معرّف مريض غير صالح" });
      }

      const session = getSession(req);
      const specialties = await store.doctorSpecialties(session.userId);
      if (specialties.length === 0) {
        return res.status(403).json({ error: "المعاينة الطبية يكتبها الطبيب فقط" });
      }

      const caseType = req.body?.caseType;
      if (!isMedicalSpecialty(caseType)) {
        return res.status(400).json({ error: "اختصاص المعاينة غير صالح" });
      }
      if (!specialties.includes(caseType)) {
        return res
          .status(403)
          .json({ error: `لا تملك صلاحية المعاينة في اختصاص ${specialtyLabel(caseType)}` });
      }

      const patient = await store.getPatientScope(patientId);
      if (!patient) return res.status(404).json({ error: "المريض غير موجود" });
      if (!canReachBranch(req, patient.branchId)) {
        // Name both sides: a bare "another branch" left the doctor guessing
        // why a save he had every right to make was refused.
        const names = await store.branchNames();
        const mine = branchScope(req)?.map((b) => names[b] ?? `#${b}`).join("، ") || "لا شيء";
        return res.status(403).json({
          error: `المريض في فرع ${names[patient.branchId ?? -1] ?? "غير معروف"} وحسابك على فرع ${mine} — راجع المسؤول لإضافة الفرع لحسابك`,
        });
      }

      const body = {
        chiefComplaint: clean(req.body?.chiefComplaint),
        clinicalFindings: clean(req.body?.clinicalFindings),
        diagnosis: clean(req.body?.diagnosis),
        plan: clean(req.body?.plan),
        notes: clean(req.body?.notes),
      };

      // The structured clinical decision. Sealed into the exam row alongside
      // the narrative, so what the doctor prescribed is as unalterable as what
      // they wrote — and attributable to them rather than to whoever typed it
      // into the patient file afterwards.
      const prescription =
        req.body?.prescription && typeof req.body.prescription === "object"
          ? (req.body.prescription as Record<string, any>)
          : {};

      // A signed record must actually say something — either half counts: a
      // narrative, or a prescription on its own, since specifying the device IS
      // a clinical decision even with no prose around it.
      const hasNarrative = Object.values(body).some((v) => v !== null);
      const hasPrescription = Object.values(prescription).some((v) =>
        Array.isArray(v)
          ? v.some((row: any) => row && Object.values(row).some((x) => x !== "" && x !== 0))
          : typeof v === "string" && v.trim().length > 0,
      );
      if (!hasNarrative && !hasPrescription) {
        return res.status(400).json({ error: "لا يمكن حفظ معاينة فارغة" });
      }

      const deviceCost = parseDeviceCost(req.body?.deviceCost, caseType);
      const proposedExpertUserId = await parseProposedExpert(
        req.body?.proposedExpertUserId, caseType, patient.branchId,
      );
      const doctorName = session.userName?.trim() || "طبيب";

      // ORDER MATTERS. The prescription is applied FIRST, because when the
      // doctor decides a specialty the patient had no case for, applying it is
      // what creates that case. Resolving the case before this step returned
      // null, and the exam was saved permanently orphaned from its own case.
      const applied = await applyDecision(patientId, caseType, prescription);

      const caseRow = await store.findCaseFor(patientId, caseType as MedicalSpecialty);

      const exam = await store.createExam({
        patientId,
        caseId: caseRow?.id ?? null,
        caseType: caseType as MedicalSpecialty,
        branchId: caseRow?.branchId ?? patient.branchId,
        doctorId: session.userId,
        doctorName,
        prescription,
        deviceCost,
        proposedExpertUserId,
        ...body,
      });

      await logAudit({
        entityType: "medical_exam",
        entityId: exam.id,
        action: "create",
        userId: session.userId,
        userName: doctorName,
        branchId: exam.branchId,
        newValues: exam,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        notes: `معاينة ${specialtyLabel(caseType)} للمريض ${patient.name ?? patientId} — بتوقيع ${doctorName}`,
      });

      //  إغلاقُ ما كان ينتظر هذه المعاينة (ترحيل ٠٥٥): المُرسَل كاملاً من
      //  الاستقبال والمُحال من طبيبٍ سواء — كلاهما ينتهي بتوقيعٍ لا بقرار.
      //  فيصير التسلسل مقروءاً: صنّف الاستقبالُ ⟶ انتظر ⟶ عاين.
      //  **وفشلُه لا يجوز أن يُسقط توقيعَ سجلٍّ سريري**: المعاينة كُتبت
      //  وخُتمت قبل هذا السطر، وربطٌ ناقص أهونُ من توقيعٍ ضائع.
      try {
        await closeRequestsAwaitingExam({
          patientId, serviceType: caseType, examId: exam.id,
        });
      } catch (linkErr) {
        console.error("[medical] closing review requests after exam failed:", linkErr);
      }

      // `switchNote` is surfaced, not swallowed: when the superseded case could
      // not be retired (it already carries a work order or tagged payments) the
      // doctor must know both cases are still open.
      res.json({ ...exam, switchNote: applied.switchNote ?? null });
    } catch (err: any) {
      console.error("[medical] POST exam failed:", err);
      res.status(500).json({ error: err?.message || "تعذّر حفظ المعاينة" });
    }
  });

  // ── Revise an exam ───────────────────────────────────────────────────────
  // The doctor who signed it, or branch management / admin. Nothing is lost:
  // the outgoing version is archived before the live row is replaced.
  app.patch("/api/medical/exams/:examId", isAuthenticated, async (req: Req, res) => {
    try {
      const examId = Number(req.params.examId);
      if (!Number.isFinite(examId)) {
        return res.status(400).json({ error: "معرّف معاينة غير صالح" });
      }

      const session = getSession(req);
      const exam = await store.getExam(examId);
      if (!exam) return res.status(404).json({ error: "المعاينة غير موجودة" });
      if (!canReachBranch(req, exam.branchId)) {
        return res.status(403).json({ error: "لا يمكنك التعديل على معاينة فرع آخر" });
      }

      // Exactly two parties, as agreed: the author, or the responsible manager.
      // A different doctor — even one holding the same specialty — may not
      // rewrite a colleague's signature; they file an addendum instead.
      const isAuthor = exam.doctorId !== null && exam.doctorId === session.userId;
      const isResponsibleManager = session.isAdmin || session.role === "branch_manager";
      if (!isAuthor && !isResponsibleManager) {
        return res
          .status(403)
          .json({ error: "تعديل المعاينة للطبيب صاحبها أو للمدير المسؤول فقط" });
      }

      const caseType = req.body?.caseType ?? exam.caseType;
      if (!isMedicalSpecialty(caseType)) {
        return res.status(400).json({ error: "اختصاص المعاينة غير صالح" });
      }
      // ══ REFUSE BEFORE ANYTHING WRITES ════════════════════════════════════
      // `reviseExam` carries this same guard, but it runs too late to be the
      // only one: `applyDecision` below writes the patient's device fields and
      // its `patient_cases` row BEFORE the revision is attempted. A request
      // destined for 409 would still have moved the patient's record — the
      // refusal would be honest about the exam and silent about everything it
      // had already changed.
      //
      // So the answer is given here, before the first write. The inner guard
      // stays as defence for any other caller of `reviseExam`.
      if (exam.deviceEpisodeId !== null && caseType !== exam.caseType) {
        return res.status(409).json({
          error: "لا يمكن تغيير اختصاص معاينة مرتبطة بجهاز — ألغِ طلب الجهاز وابدأ الطلب الصحيح",
        });
      }

      // The author must still hold the specialty they are moving the exam to;
      // a manager editing on someone's behalf is not bound by that.
      if (isAuthor && !isResponsibleManager) {
        const specialties = await store.doctorSpecialties(session.userId);
        if (!specialties.includes(caseType)) {
          return res
            .status(403)
            .json({ error: `لا تملك صلاحية المعاينة في اختصاص ${specialtyLabel(caseType)}` });
        }
      }

      const body = {
        chiefComplaint: clean(req.body?.chiefComplaint),
        clinicalFindings: clean(req.body?.clinicalFindings),
        diagnosis: clean(req.body?.diagnosis),
        plan: clean(req.body?.plan),
        notes: clean(req.body?.notes),
      };
      const prescription =
        req.body?.prescription && typeof req.body.prescription === "object"
          ? (req.body.prescription as Record<string, any>)
          : {};
      const deviceCost = parseDeviceCost(req.body?.deviceCost, caseType);
      const proposedExpertUserId = await parseProposedExpert(
        req.body?.proposedExpertUserId, caseType, exam.branchId,
      );

      const hasNarrative = Object.values(body).some((v) => v !== null);
      const hasPrescription = Object.values(prescription).some((v) =>
        Array.isArray(v)
          ? v.some((row: any) => row && Object.values(row).some((x) => x !== "" && x !== 0))
          : typeof v === "string" && v.trim().length > 0,
      );
      if (!hasNarrative && !hasPrescription) {
        return res.status(400).json({ error: "لا يمكن حفظ معاينة فارغة" });
      }

      const editorName = session.userName?.trim() || "مستخدم";
      // Same ordering rule as signing: the decision lands on the case first, so
      // a specialty change has a case to point the revised exam at.
      const applied = await applyDecision(exam.patientId, caseType, prescription);

      const updated = await store.reviseExam(
        examId,
        { caseType, prescription, deviceCost, proposedExpertUserId, ...body },
        { userId: session.userId, userName: editorName },
      );

      await logAudit({
        entityType: "medical_exam",
        entityId: examId,
        action: "update",
        userId: session.userId,
        userName: editorName,
        branchId: exam.branchId,
        oldValues: exam,
        newValues: updated,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        notes: `تعديل المعاينة #${examId} إلى النسخة ${updated.version} — بواسطة ${editorName}${isAuthor ? "" : " (مدير)"}`,
      });

      res.json({ ...updated, switchNote: applied.switchNote ?? null });
    } catch (err: any) {
      // A refused edit is a business answer, not a server fault: the doctor
      // must read WHY and what to do instead, not a bare 500.
      if (err instanceof DeviceEpisodeError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("[medical] PATCH exam failed:", err);
      res.status(500).json({ error: err?.message || "تعذّر تعديل المعاينة" });
    }
  });

  // ── Append a correction to an existing exam ──────────────────────────────
  app.post("/api/medical/exams/:examId/addenda", isAuthenticated, async (req: Req, res) => {
    try {
      const examId = Number(req.params.examId);
      if (!Number.isFinite(examId)) {
        return res.status(400).json({ error: "معرّف معاينة غير صالح" });
      }

      const session = getSession(req);
      const specialties = await store.doctorSpecialties(session.userId);
      if (specialties.length === 0) {
        return res.status(403).json({ error: "الملحق يكتبه الطبيب فقط" });
      }

      const exam = await store.getExam(examId);
      if (!exam) return res.status(404).json({ error: "المعاينة غير موجودة" });
      if (!specialties.includes(exam.caseType as MedicalSpecialty)) {
        return res
          .status(403)
          .json({ error: `لا تملك صلاحية الكتابة في اختصاص ${specialtyLabel(exam.caseType)}` });
      }
      if (!canReachBranch(req, exam.branchId)) {
        return res.status(403).json({ error: "لا يمكنك الكتابة على معاينة فرع آخر" });
      }

      const bodyText = clean(req.body?.body);
      if (!bodyText) return res.status(400).json({ error: "نص الملحق مطلوب" });

      const doctorName = session.userName?.trim() || "طبيب";
      const addendum = await store.addAddendum({
        examId,
        doctorId: session.userId,
        doctorName,
        body: bodyText,
      });

      await logAudit({
        entityType: "medical_exam_addendum",
        entityId: addendum.id,
        action: "create",
        userId: session.userId,
        userName: doctorName,
        branchId: exam.branchId,
        newValues: addendum,
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
        notes: `ملحق على المعاينة #${examId} — بتوقيع ${doctorName}`,
      });

      res.json(addendum);
    } catch (err: any) {
      console.error("[medical] POST addendum failed:", err);
      res.status(500).json({ error: err?.message || "تعذّر حفظ الملحق" });
    }
  });

  // ── The doctor's own worklist ────────────────────────────────────────────
  // Who is waiting on ME, in MY specialties, oldest first. Empty for anyone who
  // is not a doctor — the queue only exists for someone who can act on it.
  app.get("/api/medical/worklist", isAuthenticated, async (req: Req, res) => {
    try {
      const { userId } = getSession(req);
      const specialties = await store.doctorSpecialties(userId);
      if (specialties.length === 0) return res.json({ rows: [], specialties: [] });
      const rows = await store.getWorklist(specialties, branchScope(req));
      //  الأسماء البديلة دفعةً واحدة لصفوف هذه القائمة — والقائمة نفسها مرّت
      //  بـ`branchScope` أعلاه، فلا يتّسع نطاقٌ بإرفاق رمزٍ لمريضٍ فيها.
      const aliasByPatient = await aliasCodesByPatient(rows.map((r) => r.patientId));
      res.json({
        rows: rows.map((r) => (aliasByPatient.has(r.patientId)
          ? { ...r, aliasCodes: aliasByPatient.get(r.patientId) } : r)),
        specialties,
      });
    } catch (err: any) {
      console.error("[medical] GET worklist failed:", err);
      res.status(500).json({ error: "تعذّر تحميل قائمة المعاينات" });
    }
  });

  // ── Pending-exam signal for the patients list ────────────────────────────
  // Returns one entry per patient who still has an unexamined active case, so
  // each doctor can see who is waiting on THEIR specialty.
  app.get("/api/medical/pending", isAuthenticated, async (req: Req, res) => {
    try {
      const scope = branchScope(req);
      const [rows, decidedRows, optionalRows] = await Promise.all([
        store.getPendingExams(scope),
        store.getDecidedExams(scope),
        store.getPendingExams(scope, true),
      ]);
      const byPatient: Record<number, string[]> = {};
      for (const r of rows) {
        (byPatient[r.patientId] ||= []).push(r.caseType);
      }
      // Legacy patients with an un-examined case: no badge, no obligation —
      // but the doctor still gets the «كتابة معاينة» button for them.
      const optionalByPatient: Record<number, string[]> = {};
      for (const r of optionalRows) {
        (optionalByPatient[r.patientId] ||= []).push(r.caseType);
      }
      const decidedByPatient: Record<number, string[]> = {};
      for (const r of decidedRows) {
        (decidedByPatient[r.patientId] ||= []).push(r.caseType);
      }
      res.json({
        pending: byPatient,
        decided: decidedByPatient,
        optional: optionalByPatient,
        total: rows.length,
        // The exam system's go-live moment: patients registered before it are
        // legacy-exempt, and the registry compares createdAt against this to
        // unlock تخصيص without a signed exam.
        activatedAt: (await store.examSystemActivatedAt())?.toISOString() ?? null,
      });
    } catch (err: any) {
      console.error("[medical] GET pending failed:", err);
      res.status(500).json({ error: "تعذّر تحميل قائمة الانتظار" });
    }
  });
}
