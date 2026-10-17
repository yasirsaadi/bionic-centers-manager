// **«طلب معاينة جديدة» من الاستعلامات — الاستمارةُ ببيانات المريض ثمّ الإرسالُ للمعاينة** (§4.el — ٢٠٢٦-١٠-١٧).
//
// المالك: «اريدها ان تظهر لموظّفي الاستعلامات ليتمكّنوا من ارسال معاينة جديدة في حال احتاج المريض معاينة اضافية» — ثمّ: «احرص ان تكون
// فتح المعاينة للاستعلامات مثل صلاحيات التسجيل لاول مرة بحيث تظهر معلومات المريض وبالامكان تعديلها ان اراد ثم يرسلها للمعاينة».
//
// فالبابُ واحدٌ لمريضٍ قائم: **استمارةُ قسمه مملوءةً بما في ملفّه، يعدّل الموظّفُ ما شاء، ثمّ «إرسال للمعاينة»** — حفظٌ واحد ومعاملةٌ واحدة:
//   • **خاناتُ الاستمارة** (الاتّصالُ والمشتركةُ وخاناتُ القسم المختار — `allowedSheetFields`) تُكتب **بصلاحية التسجيل** (`canAddPatients`):
//     قفلُ ما بعد المعاينة (§4.db) لا يحكم هذا البابَ بقرار المالك، فالمعاينةُ الجديدة تُكتب على البيانات الجديدة. **وخاناتُ الفاحص لا تُقبل**
//     (التشخيصُ ومواصفاتُ الطرف — ٤٠٠)، وغيرُ خانات الاستمارة كذلك. وكلُّ ما تغيّر في سطر تدقيقٍ بالقديم والجديد.
//   • **والطلبُ في المعاملة نفسِها**: الأطرافُ والمساند ⟵ طلبُ جهازٍ على مسار المعاينة (`openExamEpisodeTx` — ما يفعله «يحتاج معاينة طبية»
//     بحرفه، ومعه زيارةُ «طلب معاينة طبية» والتوجيهُ إلى الطبيب — في المعاملة نفسِها)؛ **والعلاجُ الطبيعيّ** ⟵ طلبُ معاينةٍ كاملة عارٍ (ترحيل ١٥٤)
//     يعيده إلى «معايناتي» ويُغلقه توقيعُ المعاينة التالية — **بلا زيارة**: زيارةُ العلاج الطبيعي تُعدّ جلسة.
//   • **والاستمارةُ كاملةٌ كما في التسجيل** (`checkIntakeSheet` على الملفّ بعد التعديل) — فلا يُرسَل ملفٌّ ناقص.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { logAudit } from "../accounting/ledger";
import { scopeReachesPatient, patientBranchIdsOf, resolveActingBranchId, adminMustChooseBranch, ADMIN_BRANCH_CHOICE_ERROR } from "./branch_access";
import { diffPatientEdit, patientEditNote } from "./patient_edit_audit";
import { openExamEpisodeTx, routeAndAuditExamEpisode } from "../device_episodes/routes";
import { DeviceEpisodeError } from "../device_episodes/store";
import { createReviewRequestTx, ReviewError } from "../medical_review/store";
import { getPendingForPatient } from "../medical/store";
import { physioOfferingBranchIds } from "../physio_plans/store";
import { ensureCaseTx } from "../patient_cases/reopen";
import { PatientPhoneConflictError, PatientPhoneTrashConflictError } from "./duplicate_guard";
import { ALWAYS_OPEN_FIELDS, DEPARTMENT_INTAKE_FIELDS, EXAMINER_FIELDS, SHARED_INTAKE_FIELDS, editValueChanged } from "@shared/patient_edit_rules";
import { checkIntakeSheet, isGovernorate, mergeInjuryDate } from "@shared/intake_sheet";
import { parseRequestedItems } from "@shared/prosthetic_parts";
import { normalizePhone } from "@shared/phone";
import { parseSharedPhone } from "@shared/shared_phone";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { NEW_EXAM_REQUEST_DEPARTMENTS, isNewExamRequestDepartment, type NewExamRequestDepartment } from "@shared/new_exam_request";

type Req = any;

/** **صلاحيةُ التسجيل** — «مثل صلاحيات التسجيل لاول مرة» (المالك): المفتاحُ يحكم لا الدور، والمسؤولُ العامّ فوقه. */
export const mayRequestNewExam = (s: any): boolean => Boolean(s?.isAdmin) || s?.permissions?.canAddPatients === true;

/** نطاقُ الكتابة — الفرعُ النشط وحده (§4.ay)، كبابِ «تعديل مريض». */
const writeScope = (s: any): number[] | null => (s?.isAdmin ? null : s?.branchId ? [Number(s.branchId)] : []);

/** **خاناتُ الاستمارة التي يكتبها هذا البابُ** — الاتّصالُ (بلا رايةِ واتساب) والمشتركةُ (بلا التصنيف) وخاناتُ القسم المختار وحده. */
export function allowedSheetFields(dept: NewExamRequestDepartment): Set<string> {
  return new Set<string>([
    ...ALWAYS_OPEN_FIELDS.filter((k) => k !== "whatsappNotificationsEnabled"),
    ...SHARED_INTAKE_FIELDS.filter((k) => k !== "patientClassification"),
    ...DEPARTMENT_INTAKE_FIELDS[dept],
  ]);
}

export function registerNewExamRequestRoutes(
  app: Express,
  isAuthenticated: any,
  deps: { phoneConflictBody: (req: any, err: PatientPhoneConflictError) => Promise<Record<string, unknown>> },
) {
  app.post("/api/patients/:id/new-exam-request", isAuthenticated, async (req: Req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "معرّف غير صالح" });
      const s = req.session?.branchSession;
      if (!mayRequestNewExam(s)) return res.status(403).json({ message: "ليس لديك صلاحية تسجيل المرضى وإرسالهم للمعاينة" });

      const dept = req.body?.department;
      if (!isNewExamRequestDepartment(dept)) {
        return res.status(400).json({ message: `القسم غير صالح — ${NEW_EXAM_REQUEST_DEPARTMENTS.join(" / ")}`, field: "department" });
      }

      const existing = await storage.getPatient(id);
      if (!existing) {
        //  `getPatient` لا يرى السلّة — فمريضُها يُقال «في السلّة» لا «غير موجود» (كبابَي صلاحيات التعديل).
        const trashed = await db.execute(sql`SELECT 1 FROM patients WHERE id = ${id} AND deleted_at IS NOT NULL`);
        return (trashed.rows ?? []).length > 0
          ? res.status(409).json({ message: PATIENT_IN_TRASH_ERROR })
          : res.status(404).json({ message: "المريض غير موجود" });
      }
      const patientRef = { id, branchId: existing.branchId ?? null };
      if (!(await scopeReachesPatient(writeScope(s), patientRef))) {
        return res.status(403).json({ message: "لا يمكنك إرسال مريض فرعٍ آخر للمعاينة — بدّل الفرع النشط" });
      }

      // ── ما تغيّر من خانات الاستمارة ── غيرُ خاناتها يُردّ صريحاً، وما لم يتغيّر يسقط فلا يُكتب ولا يظهر في التدقيق.
      const rawFields = req.body?.fields && typeof req.body.fields === "object" ? req.body.fields as Record<string, unknown> : {};
      const allowed = allowedSheetFields(dept);
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawFields)) {
        if ((EXAMINER_FIELDS as readonly string[]).includes(k)) {
          return res.status(400).json({ message: "هذه الخانة يكتبها الفاحص في المعاينة — ليست من الاستمارة", field: k });
        }
        if (!allowed.has(k)) return res.status(400).json({ message: "خانةٌ ليست من استمارة هذا القسم", field: k });
        if (editValueChanged(k, v, existing as any)) patch[k] = v;
      }
      //  الإصاباتُ وعموداها القديمان زوج: إن لم تتغيّر بمعناها سقط المشتقّان معها.
      if (patch.injuries === undefined) { delete patch.injuryType; delete patch.injuryArea; }
      else {
        if (rawFields.injuryType !== undefined) patch.injuryType = rawFields.injuryType;
        if (rawFields.injuryArea !== undefined) patch.injuryArea = rawFields.injuryArea;
      }

      const sharedPhone = parseSharedPhone(req.body?.sharedPhone);
      if (sharedPhone === undefined && req.body?.sharedPhone !== undefined && req.body?.sharedPhone !== null) {
        return res.status(400).json({ message: "تأكيد الرقم المشترك غير صالح", field: "sharedPhone" });
      }
      //  الهاتف: يُستبدل ولا يُفرَّغ، ويصحّ بمطبّعه — كـ«تعديل مريض».
      if (patch.phone !== undefined) {
        const typed = String(patch.phone ?? "").trim();
        if (!typed) return res.status(400).json({ message: "لا يمكن حذف رقم الاتصال المسجَّل — استبدله برقم صحيح", field: "phone" });
        const n = normalizePhone(typed, (patch.phoneCountry as string) || existing.phoneCountry || undefined);
        if (!n.ok) return res.status(400).json({ message: n.reason ?? "رقم اتصال غير صالح", field: "phone" });
      }
      if (patch.hadPriorCenterHistory !== undefined && typeof patch.hadPriorCenterHistory !== "boolean") delete patch.hadPriorCenterHistory;
      if (patch.governorate !== undefined && !isGovernorate(patch.governorate)) {
        return res.status(400).json({ message: "اختر المحافظة من القائمة", field: "governorate" });
      }
      if (patch.injuryDate !== undefined || patch.injuryDateStatus !== undefined) {
        Object.assign(patch, mergeInjuryDate(
          patch.injuryDate, patch.injuryDateStatus, (existing as any).injuryDate, (existing as any).injuryDateStatus,
        ));
      }

      // ── «المطلوب» للأطراف (والمساندُ جهازٌ كامل) ──
      let requestedItem: string | null = null;
      let extraComponents: string[] = [];
      if (dept !== "physiotherapy") {
        const parsed = parseRequestedItems(req.body?.requestedItems, dept);
        if (!parsed.ok) return res.status(400).json({ message: parsed.error, field: "requestedItem" });
        requestedItem = parsed.requestedItem;
        extraComponents = parsed.extraComponents;
      }

      // ── **الاستمارةُ كاملةٌ كما في التسجيل** — على الملفّ كما سيصير ──
      const merged = { ...(existing as any), ...patch };
      const check = checkIntakeSheet({
        name: merged.name, phone: merged.phone, governorate: merged.governorate, address: merged.address,
        referralSource: merged.referralSource, referralSubSource: merged.referralSubSource,
        age: merged.age, weight: merged.weight, height: merged.height, injuryCause: merged.injuryCause,
        injuryDate: merged.injuryDate, injuryDateStatus: merged.injuryDateStatus, department: dept,
        amputationSite: merged.amputationSite, supportType: merged.supportType, injurySide: merged.injurySide,
        presentingComplaint: merged.presentingComplaint,
        requestedItems: dept === "prosthetic" ? req.body?.requestedItems : undefined,
      } as any);
      if (!check.ok) return res.status(400).json({ message: check.message, missing: check.missing });

      // ── والعلاجُ الطبيعيّ لا يُطلَب له مرّتين ──
      if (dept === "physiotherapy" && (await getPendingForPatient(id)).includes("physiotherapy")) {
        return res.status(409).json({ message: "المريض بانتظار معاينة العلاج الطبيعي أصلاً — تظهر في «معايناتي»", code: "physio_exam_already_pending" });
      }

      // ── فرعُ الحركة ── للأجهزة كبابِ طلب الجهاز (§4.ay)؛ وللعلاج الطبيعيّ يحسمه الطلبُ نفسُه.
      const patientBranchIds = await patientBranchIdsOf(patientRef);
      if (dept !== "physiotherapy" && adminMustChooseBranch({
        isAdmin: writeScope(s) === null, sessionBranchId: s?.branchId ?? null, patientBranchIds,
      })) {
        return res.status(409).json({ message: ADMIN_BRANCH_CHOICE_ERROR });
      }
      const actingBranchId = resolveActingBranchId({
        scope: writeScope(s), sessionBranchId: s?.branchId ?? null, homeBranchId: patientRef.branchId, patientBranchIds,
      });
      //  **والعلاجُ الطبيعيّ في فروعه وحدها** — كالتسجيل (`offersPhysio`)، فلا يُرسَل مريضٌ إلى «معايناتي» فرعٍ بلا أخصائيّ
      //  (من مراجعة Codex: الشاشةُ تمنعه بعد تحميل الفروع وحدها، والطلبُ المباشر يتجاوزها).
      if (dept === "physiotherapy" && (actingBranchId === null || !(await physioOfferingBranchIds()).has(actingBranchId))) {
        return res.status(400).json({ message: "العلاج الطبيعي غير متوفّر في الفرع النشط — بدّل إلى فرعٍ فيه علاجٌ طبيعيّ", field: "branchId" });
      }
      const userId: number | null = s?.userId ?? null;
      const userName: string | null = s?.displayName ?? null;

      // ── حفظٌ واحد: التعديلُ وسطرُ تدقيقه والطلبُ ──
      const out = await db.transaction(async (tx) => {
        let updated: any = existing;
        if (Object.keys(patch).length > 0) {
          updated = await storage.updatePatient(id, patch as any, "manual_edit", null, tx, false, null, sharedPhone ?? null);
          const diff = diffPatientEdit(existing as any, (updated ?? {}) as any,
            [...Object.keys(patch), ...(patch.phone !== undefined ? ["phoneSharedWithPatientId", "phoneSharedRelation"] : [])]);
          if (diff.fields.length > 0) {
            await logAudit({
              tx, entityType: "patient", entityId: id, action: "update", userId, userName,
              branchId: existing.branchId ?? null, oldValues: diff.oldValues, newValues: diff.newValues,
              ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
              notes: `${patientEditNote(diff)} — من «طلب معاينة جديدة»`,
            } as any);
          }
        }
        if (dept === "physiotherapy") {
          const c = await ensureCaseTx(tx as any, {
            patientId: id, caseType: "physiotherapy", branchId: actingBranchId,
            create: false, reopen: { reason: "طلب معاينة جديدة — علاج طبيعي", actor: { userId, userName } },
          });
          if (!c) throw new ReviewError("لا قسمَ علاجٍ طبيعيّ في ملفّ المريض — أضفه من «إضافة خدمة جديدة»", 400);
          const reason = String(merged.presentingComplaint ?? "").trim();
          const note = typeof req.body?.receptionNote === "string" ? req.body.receptionNote.trim() : "";
          const row = await createReviewRequestTx(tx, {
            patientId: id, serviceType: "physiotherapy", requestedPath: "full", reviewKind: "other",
            receptionNote: ["طلب معاينة جديدة", reason ? `سبب المراجعة: ${reason}` : "", note].filter(Boolean).join(" — "),
            createdBy: userId, branchIds: writeScope(s), sessionBranchId: s?.branchId ?? null, operationBranchId: actingBranchId,
            physioExamRequest: true,
          });
          await logAudit({
            tx, entityType: "medical_review_request", entityId: row.id, action: "create", userId, userName,
            branchId: (row as any).branchId ?? actingBranchId, newValues: row as any,
            ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
            notes: `طلب معاينة جديدة — علاج طبيعي — للمريض ${merged.name ?? id}`,
          } as any);
          return { kind: "physio" as const, reviewRequestId: row.id, episode: null };
        }
        const episode = await openExamEpisodeTx(tx, {
          patientId: id, serviceType: dept, createdBy: userId, requestedItem, extraComponents, actingBranchId,
        });
        //  **والتوجيهُ إلى الطبيب في المعاملة نفسِها** — جهازٌ بلا طلبه لا يلتزم (من مراجعة Codex).
        const routing = await routeAndAuditExamEpisode(req, {
          episode, patientId: id, patientName: merged.name ?? null, serviceType: dept as "prosthetic" | "medical_support",
          reviewNote: typeof req.body?.receptionNote === "string" ? req.body.receptionNote : "",
          auditSuffix: " — من «طلب معاينة جديدة»",
        }, tx);
        return { kind: "device" as const, reviewRequestId: routing.request?.id ?? null, episode };
      });

      return res.status(201).json({ department: dept, episodeId: out.episode?.id ?? null, reviewRequestId: out.reviewRequestId });
    } catch (err: any) {
      if (err instanceof PatientPhoneConflictError) return res.status(409).json(await deps.phoneConflictBody(req, err));
      if (err instanceof PatientPhoneTrashConflictError) {
        return res.status(409).json({ message: err.message, code: "patient_phone_trash_conflict" });
      }
      if (err instanceof ReviewError || err instanceof DeviceEpisodeError) {
        return res.status((err as any).status ?? 400).json({ message: err.message, ...((err as any).code ? { code: (err as any).code } : {}) });
      }
      console.error("[new-exam-request] failed:", err);
      return res.status(500).json({ message: "تعذّر إرسال المريض للمعاينة" });
    }
  });
}
