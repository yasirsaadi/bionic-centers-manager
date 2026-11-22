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
import { sql, eq } from "drizzle-orm";
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
import { specialtyLabel } from "@shared/medical";
import { transferTargets, type TransferDepartment } from "@shared/returned_transfer";
import { patients } from "@shared/schema";
import { cancelReturnedAndCloseTx } from "../medical_review/returned_actions";
import { CancelExamRequestError } from "../medical/cancel_exam_request";
import { grantDepartmentHomeAccessTx, scopeWith, openDepartmentState, openDepartmentTarget, OpenDepartmentError } from "./department_home";
import { noDepartmentHomeMessage, CROSS_EXAM_DEPARTMENT_NAMES } from "@shared/cross_department_exam";

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

const cleanDetails = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== ""));
/** تفاصيلُ قسمٍ يُفتَح بالتحويل — حقولُ `addPatientCaseType` للقسم بحرفها. */
function physioDetails(p: any): Record<string, any> {
  return cleanDetails({
    diseaseType: p?.diseaseType, injuryType: p?.injuryType, injuryArea: p?.injuryArea,
    injuries: p?.injuries, treatmentType: p?.treatmentType,
  });
}
function deviceDetails(dept: "prosthetic" | "medical_support", p: any): Record<string, any> {
  return cleanDetails(dept === "prosthetic" ? {
    amputationSite: p?.amputationSite, prostheticType: p?.prostheticType, siliconType: p?.siliconType,
    siliconSize: p?.siliconSize, suspensionSystem: p?.suspensionSystem, footType: p?.footType, footSize: p?.footSize,
    kneeJointType: p?.kneeJointType, injurySide: p?.injurySide, injuryCause: p?.injuryCause,
    injuryDate: p?.injuryDate, injuryType: p?.injuryType,
  } : {
    supportType: p?.supportType, injurySide: p?.injurySide, injuryCause: p?.injuryCause, injuryDate: p?.injuryDate,
  });
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

      //  ══ **تحويلُ المريض من «المُرجَعون من الطبيب»** (§4.gu — قرارُ المالك ٢٠٢٦-١١-٢٢) ══════════════════════════════
      //  «تحويل المريض من علاج طبيعي إلى أطراف أو بالعكس» — الطلبُ الجديد في القسم الآخر **والطلبُ المُرجَع يُلغى والقسمُ القديم
      //  يُغلَق إن صار فارغاً**، في المعاملة نفسِها: فشلُ أيٍّ منها يتراجع بها كلِّها.
      const rawReplaces = req.body?.replacesRequestId;
      const replacesRequestId = rawReplaces === undefined || rawReplaces === null || rawReplaces === "" ? null : Number(rawReplaces);
      if (replacesRequestId !== null && (!Number.isInteger(replacesRequestId) || replacesRequestId <= 0)) {
        return res.status(400).json({ message: "رقم الطلب المُرجَع غير صالح", field: "replacesRequestId" });
      }
      //  ══ **فتحُ القسم الآخر من «سبب الحضور»** (§4.gv — قرارُ المالك ٢٠٢٦-١١-٢٢) ═══════════════════════════════════════
      //  «إذا كان أطراف فأضف معاينة علاج طبيعي، وإن كان علاج طبيعي فأضف معاينة أطراف ومساند، وإن كان لديه الاثنان فلا يظهر شيء».
      //  علمٌ صريح (`openDepartment`) يفتح قسماً **ليس للمريض** بقاعدة `crossExamDepartments` وحدها، في **فرع القسم** (`departmentHomeBranch`).
      const openDepartment = req.body?.openDepartment === true;
      if (openDepartment && replacesRequestId !== null) {
        return res.status(400).json({ message: "فتحُ قسمٍ جديد والتحويلُ من «المُرجَعون» لا يجتمعان في طلبٍ واحد", code: "open_with_replaces" });
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
      //  **القسمُ ليس للمريض حقاً** — بعلمه أو بقسمٍ نشط؛ وإلّا فبابُه «طلب معاينة جديدة» العاديّ. (ويُعاد الحكمُ بعد قفل ٩١٩ في المعاملة.)
      const openState = openDepartment ? await openDepartmentState(db as any, id, dept) : null;
      if (openState && !openState.ok) {
        return res.status(openState.error.status).json({ message: openState.error.message, code: openState.error.code });
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
      //  **وفتحُ القسم يحسمه فرعُ الحركة** (§4.gv) — فالمسؤولُ يختار الفرعَ لمريضٍ متعدّد الفروع كبابِ الجهاز، ولا يُخمَّن له.
      if ((dept !== "physiotherapy" || openDepartment) && adminMustChooseBranch({
        isAdmin: writeScope(s) === null, sessionBranchId: s?.branchId ?? null, patientBranchIds,
      })) {
        return res.status(409).json({ message: ADMIN_BRANCH_CHOICE_ERROR });
      }
      const actingBranchId = resolveActingBranchId({
        scope: writeScope(s), sessionBranchId: s?.branchId ?? null, homeBranchId: patientRef.branchId, patientBranchIds,
      });
      //  **والعلاجُ الطبيعيّ في فروعه وحدها** — كالتسجيل (`offersPhysio`)، فلا يُرسَل مريضٌ إلى «معايناتي» فرعٍ بلا أخصائيّ
      //  (من مراجعة Codex: الشاشةُ تمنعه بعد تحميل الفروع وحدها، والطلبُ المباشر يتجاوزها).
      //  **وفتحُ القسم يذهب إلى فرعه** (§4.gv) — فلا يُشترط أن يقدّمه الفرعُ النشط؛ ولا فرعَ في المدينة ⟵ ٤٠٠ (كربلاء والموصل للعلاج الطبيعيّ).
      //  والقسمُ المغلقُ يُعاد في فرعه (`openDepartmentTarget`) — فالقسمُ والطلبُ والجهازُ في فرعٍ واحد.
      const openTarget = openState?.ok ? await openDepartmentTarget(undefined, dept, actingBranchId, openState.closedCase) : null;
      if (openTarget?.error) {
        return res.status(openTarget.error.status).json({ message: openTarget.error.message, code: openTarget.error.code });
      }
      if (openTarget && openTarget.target === null) {
        return res.status(400).json({ message: noDepartmentHomeMessage(dept), code: "no_department_home", field: "branchId" });
      }
      const targetBranchId: number | null = openTarget?.target ?? null;
      if (!openDepartment && dept === "physiotherapy" && (actingBranchId === null || !(await physioOfferingBranchIds()).has(actingBranchId))) {
        return res.status(400).json({ message: "العلاج الطبيعي غير متوفّر في الفرع النشط — بدّل إلى فرعٍ فيه علاجٌ طبيعيّ", field: "branchId" });
      }
      const userId: number | null = s?.userId ?? null;
      const userName: string | null = s?.displayName ?? null;

      // ── حفظٌ واحد: التعديلُ وسطرُ تدقيقه والطلبُ ──
      const out = await db.transaction(async (tx) => {
        //  **قفلُ المريض أوّلاً** حين يُحوَّل — بترتيب أبواب الإلغاء والإغلاق (٩١٩ ثمّ صفُّ المريض)، لا بعد قفل صفّه بالتعديل.
        let replaced: Awaited<ReturnType<typeof cancelReturnedAndCloseTx>> | null = null;
        if (openDepartment) {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${id})`);
          //  **ويُعاد الحكمُ بعد القفل** — نقرتان معاً أو قسمان جهازيّان معاً: الثانيةُ تقرأ ما كتبته الأولى فتُردّ بلا كتابة.
          const again = await openDepartmentState(tx as any, id, dept);
          if (!again.ok) throw again.error;
          if ((again.closedCase?.id ?? null) !== (openState?.ok ? openState.closedCase?.id ?? null : null)) {
            throw new OpenDepartmentError("تغيّر ملفُّ المريض أثناء الإرسال — أعد فتح الورقة وأرسله ثانيةً", 409, "patient_changed");
          }
        }
        if (replacesRequestId !== null) {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${id})`);
          const [old] = ((await tx.execute(sql`
            SELECT patient_id, service_type FROM medical_review_requests WHERE id = ${replacesRequestId}
          `)).rows ?? []) as Record<string, any>[];
          if (old && Number(old.patient_id) === id && String(old.service_type) === dept) {
            throw new CancelExamRequestError(
              "التحويلُ إلى قسمٍ آخر — لإعادة إرسال القسم نفسِه استعمل «إعادة إرسال للطبيب»", 400, "replaces_same_department",
            );
          }
          //  **والأقسامُ المسموحة بقاعدة الشاشة نفسِها** (`transferTargets`): بين العلاج الطبيعيّ وقسمَي الجهاز وحده — فلا تحويلَ بين
          //  الأطراف والمساند بطلبٍ يُكتب باليد. (وتوفّرُ العلاج الطبيعيّ في الفرع يفحصه البابُ أعلاه — `physioOfferingBranchIds`.)
          if (old && Number(old.patient_id) === id && !transferTargets(String(old.service_type), true).includes(dept as TransferDepartment)) {
            throw new CancelExamRequestError(
              "التحويلُ بين العلاج الطبيعي وقسمَي الأطراف والمساند وحده", 400, "replaces_department_not_allowed",
            );
          }
          replaced = await cancelReturnedAndCloseTx(tx, {
            requestId: replacesRequestId, reason: `تحويل المريض إلى قسم ${specialtyLabel(dept)}`,
            actor: { userId, userName }, branchIds: writeScope(s), expectPatientId: id,
            auditSuffix: " — من «المُرجَعون من الطبيب»",
            ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
          });
        }
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
        //  ══ **فتحُ القسم في فرعه** (§4.gv): الملفُّ يُتاح لفرع القسم إن لم يصله (استثناءٌ مقصود من «المنحُ للمسؤول» بقرار المالك،
        //  محصورٌ بهذا الباب)، ثمّ القسمُ وعلمُه وسطرُ تدقيق. **ولا يتحرّك غيرُها**: فرعُ التسجيل والمالُ والزياراتُ والأقسامُ القائمة.
        let accessGranted = false;
        if (openDepartment && targetBranchId !== null) {
          if (targetBranchId !== actingBranchId) {
            accessGranted = await grantDepartmentHomeAccessTx(tx as any, {
              patientId: id, targetBranchId, dept, actor: { userId, userName }, via: "«سبب الحضور»",
              ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
            });
          }
          //  **صفُّ المريض قبل صفّ القسم** — ترتيبُ الأقفال (`startDeviceEpisodeTx` · `executeReversal`): العلمُ يُرفع أوّلاً.
          const flag = dept === "prosthetic" ? { isAmputee: true } : dept === "medical_support" ? { isMedicalSupport: true } : { isPhysiotherapy: true };
          await (tx as any).update(patients).set(flag).where(eq(patients.id, id));
          const c = await ensureCaseTx(tx as any, {
            patientId: id, caseType: dept, branchId: targetBranchId,
            create: { cost: 0, costSource: "auto", details: dept === "physiotherapy" ? physioDetails(updated) : deviceDetails(dept, updated) },
            reopen: { reason: `فتح قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} من «سبب الحضور»`, actor: { userId, userName } },
            notifyExam: false,
          });
          if (!c) throw new ReviewError("تعذّر فتح القسم", 500);
          await logAudit({
            tx, entityType: "patient", entityId: id, action: "update", userId, userName, branchId: actingBranchId,
            newValues: { openedDepartment: dept, caseId: c.id, caseBranchId: c.branchId, targetBranchId, accessGranted },
            ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
            notes: `فتح قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} من «سبب الحضور» في ${openTarget?.name ?? `الفرع #${targetBranchId}`}`
              + (accessGranted ? " — وأُتيح له الملفّ" : ""),
          } as any);
        }
        //  فرعُ الطلب والجهاز: فرعُ القسم حين يُفتح، وإلّا فرعُ الحركة كما كان.
        const requestBranchId = targetBranchId ?? actingBranchId;
        if (dept === "physiotherapy") {
          //  **والتحويلُ يفتح القسمَ إن غاب** (§4.gu) — مريضُ أطرافٍ سُجّل خطأً لا قسمَ علاجٍ طبيعيٍّ له؛ والطلبُ أدناه يُنبّه الطبيب.
          const c = await ensureCaseTx(tx as any, {
            patientId: id, caseType: "physiotherapy", branchId: actingBranchId,
            create: replaced ? { cost: 0, costSource: "auto", details: physioDetails(updated) } : false,
            reopen: { reason: "طلب معاينة جديدة — علاج طبيعي", actor: { userId, userName } },
            notifyExam: false,
          });
          if (c && replaced && !updated?.isPhysiotherapy) {
            await (tx as any).update(patients).set({ isPhysiotherapy: true }).where(eq(patients.id, id));
          }
          if (!c) throw new ReviewError("لا قسمَ علاجٍ طبيعيّ في ملفّ المريض — أضفه من «إضافة خدمة جديدة»", 400);
          const reason = String(merged.presentingComplaint ?? "").trim();
          const note = typeof req.body?.receptionNote === "string" ? req.body.receptionNote.trim() : "";
          const row = await createReviewRequestTx(tx, {
            patientId: id, serviceType: "physiotherapy", requestedPath: "full", reviewKind: "other",
            receptionNote: ["طلب معاينة جديدة", reason ? `سبب المراجعة: ${reason}` : "", note].filter(Boolean).join(" — "),
            createdBy: userId, branchIds: scopeWith(writeScope(s), targetBranchId), sessionBranchId: s?.branchId ?? null,
            operationBranchId: requestBranchId,
            physioExamRequest: true,
          });
          await logAudit({
            tx, entityType: "medical_review_request", entityId: row.id, action: "create", userId, userName,
            branchId: (row as any).branchId ?? requestBranchId, newValues: row as any,
            ipAddress: req.ip ?? null, userAgent: req.get("user-agent") ?? null,
            notes: `طلب معاينة جديدة — علاج طبيعي — للمريض ${merged.name ?? id}`,
          } as any);
          return { kind: "physio" as const, reviewRequestId: row.id, episode: null, replaced, accessGranted };
        }
        if (replaced) {
          //  **والقسمُ الهدفُ يُفتَح إن غاب** — بالتفاصيل التي يكتبها «إضافة نوع حالة» للقسم، وعلمُه يُرفع معه (`addPatientCaseType`).
          const c = await ensureCaseTx(tx as any, {
            patientId: id, caseType: dept, branchId: actingBranchId,
            create: { cost: 0, costSource: "auto", details: deviceDetails(dept, updated) },
            reopen: { reason: "طلب معاينة جديدة — تحويلٌ من قسمٍ آخر", actor: { userId, userName } },
          });
          const flag = dept === "prosthetic" ? { isAmputee: true } : { isMedicalSupport: true };
          if (c && !(dept === "prosthetic" ? updated?.isAmputee : updated?.isMedicalSupport)) {
            await (tx as any).update(patients).set(flag).where(eq(patients.id, id));
          }
        }
        const episode = await openExamEpisodeTx(tx, {
          patientId: id, serviceType: dept, createdBy: userId, requestedItem, extraComponents, actingBranchId: requestBranchId,
          visitBranchId: actingBranchId,
        });
        //  **والتوجيهُ إلى الطبيب في المعاملة نفسِها** — جهازٌ بلا طلبه لا يلتزم (من مراجعة Codex).
        const routing = await routeAndAuditExamEpisode(req, {
          episode, patientId: id, patientName: merged.name ?? null, serviceType: dept as "prosthetic" | "medical_support",
          reviewNote: typeof req.body?.receptionNote === "string" ? req.body.receptionNote : "",
          auditSuffix: openDepartment ? " — فتحُ القسم من «سبب الحضور»" : " — من «طلب معاينة جديدة»",
          operationBranchId: targetBranchId,
        }, tx);
        return { kind: "device" as const, reviewRequestId: routing.request?.id ?? null, episode, replaced, accessGranted };
      });

      return res.status(201).json({
        department: dept, episodeId: out.episode?.id ?? null, reviewRequestId: out.reviewRequestId,
        ...(openDepartment ? { openedDepartment: true, targetBranchId, targetBranchName: openTarget?.name ?? null, accessGranted: out.accessGranted } : {}),
        ...(out.replaced ? {
          replacedRequestId: out.replaced.requestId,
          oldCaseClosed: out.replaced.caseClosure.closed,
          oldCaseKeptBecause: out.replaced.caseClosure.closed ? null : out.replaced.caseClosure.keptBecause,
        } : {}),
      });
    } catch (err: any) {
      if (err instanceof PatientPhoneConflictError) return res.status(409).json(await deps.phoneConflictBody(req, err));
      if (err instanceof PatientPhoneTrashConflictError) {
        return res.status(409).json({ message: err.message, code: "patient_phone_trash_conflict" });
      }
      if (err instanceof OpenDepartmentError) return res.status(err.status).json({ message: err.message, code: err.code });
      if (err instanceof CancelExamRequestError) {
        return res.status(err.status ?? 409).json({ message: err.message, code: err.code, field: "replacesRequestId" });
      }
      if (err instanceof ReviewError || err instanceof DeviceEpisodeError) {
        return res.status((err as any).status ?? 400).json({ message: err.message, ...((err as any).code ? { code: (err as any).code } : {}) });
      }
      console.error("[new-exam-request] failed:", err);
      return res.status(500).json({ message: "تعذّر إرسال المريض للمعاينة" });
    }
  });
}
