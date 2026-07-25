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
//   EDIT / DELETE — do not exist. There is deliberately no such endpoint. A
//           correction is filed as an addendum; the original stands.
//
// The grant is re-read from the database on every write rather than trusted
// from the session, so revoking a doctor's capability takes effect at once
// instead of at their next login.

import type { Express } from "express";
import { logAudit } from "../accounting/ledger";
import * as store from "./store";
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

      const { userId } = getSession(req);
      const [exams, pending, specialties] = await Promise.all([
        store.getExamsByPatient(patientId),
        store.getPendingForPatient(patientId),
        store.doctorSpecialties(userId),
      ]);

      res.json({
        exams,
        pending, // active specialties with no exam yet → "بانتظار معاينة"
        canWriteMedicalExam: specialties.length > 0,
        specialties,
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
        return res.status(403).json({ error: "لا يمكنك المعاينة في فرع آخر" });
      }

      const body = {
        chiefComplaint: clean(req.body?.chiefComplaint),
        clinicalFindings: clean(req.body?.clinicalFindings),
        diagnosis: clean(req.body?.diagnosis),
        plan: clean(req.body?.plan),
        notes: clean(req.body?.notes),
      };

      // A signed record must actually say something. Since the row can never be
      // edited afterwards, an accidental empty save would be permanent.
      if (!Object.values(body).some((v) => v !== null)) {
        return res.status(400).json({ error: "لا يمكن حفظ معاينة فارغة" });
      }

      const doctorName = session.userName?.trim() || "طبيب";
      const caseRow = await store.findCaseFor(patientId, caseType as MedicalSpecialty);

      const exam = await store.createExam({
        patientId,
        caseId: caseRow?.id ?? null,
        caseType: caseType as MedicalSpecialty,
        branchId: caseRow?.branchId ?? patient.branchId,
        doctorId: session.userId,
        doctorName,
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

      res.json(exam);
    } catch (err: any) {
      console.error("[medical] POST exam failed:", err);
      res.status(500).json({ error: err?.message || "تعذّر حفظ المعاينة" });
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

  // ── Pending-exam signal for the patients list ────────────────────────────
  // Returns one entry per patient who still has an unexamined active case, so
  // each doctor can see who is waiting on THEIR specialty.
  app.get("/api/medical/pending", isAuthenticated, async (req: Req, res) => {
    try {
      const rows = await store.getPendingExams(branchScope(req));
      const byPatient: Record<number, string[]> = {};
      for (const r of rows) {
        (byPatient[r.patientId] ||= []).push(r.caseType);
      }
      res.json({ pending: byPatient, total: rows.length });
    } catch (err: any) {
      console.error("[medical] GET pending failed:", err);
      res.status(500).json({ error: "تعذّر تحميل قائمة الانتظار" });
    }
  });
}
