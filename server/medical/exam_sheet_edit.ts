// **ما يعدّله الطبيبُ من حقول الاستعلامات على «استمارة المراجع»** (§4.cq — المرحلةُ الثانية ب، ٢٠٢٦-١٠-٠٨).
//
// قرارُ المالك: «الطبيبُ يعدّل كلَّ شيء في الاستمارة، والتعديلُ في سجلّ التدقيق إن احتجنا أن نعرف مَن غيّر».
// فنقطتا المعاينة (التوقيعُ والتنقيح) تحملان `sheet` (حقولَ الملفّ) و`requestedItem` («المطلوب» للأطراف)، و:
//   • **يُفحَص قبل أيّ كتابة** (`prepareExamSheet`) بالقاعدة المشتركة `prepareSheetEdit` — والرفضُ ٤٠٠ يسمّي الحقول.
//   • **ويُكتب بعد أن تُحفَظ المعاينة** (`applyExamSheet`) كما تُكتب الوصفةُ على الملفّ — فمعاينةٌ رُدّت لا تترك أثراً على الملفّ.
//     وفشلُه بعدها (رقمٌ محجوزٌ لمريضٍ آخر) **لا يُسقط معاينةً حُفظت**: يُقال للطبيب في الردّ نفسِه.
//   • **وكلُّ تغييرٍ سطرُ تدقيق** بالقديم والجديد، باسم الطبيب ورقم المعاينة.
// وصلاحيةُ «تعديل المرضى» لا تُطلَب هنا: هذا بابُ المعاينة، ومَن يصله هو مَن يملك كتابتَها.
import { prepareSheetEdit, isSheetExamType } from "@shared/exam_sheet";
import { isIntakeRequestedItem } from "@shared/intake_sheet";
import { requestedItemLabel, type RequestedItem } from "@shared/prosthetic_parts";
import { db } from "../db";
import { storage } from "../storage";
import { logAudit } from "../accounting/ledger";
import { diffPatientEdit, patientEditNote } from "../patients/patient_edit_audit";
import { PatientPhoneConflictError, PatientPhoneTrashConflictError } from "../patients/duplicate_guard";
import { setEpisodeRequestedItemTx } from "../device_episodes/store";
import { intakeSheetOf } from "./store";

export interface PreparedExamSheet {
  patientId: number;
  patch: Record<string, unknown>;
  requestedItem: RequestedItem | null;
}

export type PrepareResult =
  | { ok: true; prepared: PreparedExamSheet | null }
  | { ok: false; error: string; missing: string[] };

/** **يُفحَص قبل أيّ كتابة** — لا شيءَ هنا يكتب. `prepared: null` = لا تعديلَ على الاستمارة في هذا الطلب. */
export async function prepareExamSheet(patientId: number, caseType: unknown, body: any): Promise<PrepareResult> {
  if (!isSheetExamType(caseType)) return { ok: true, prepared: null };
  const hasSheet = body?.sheet !== undefined && body?.sheet !== null;
  const rawItem = body?.requestedItem;
  const hasItem = caseType === "prosthetic" && rawItem !== undefined && rawItem !== null && rawItem !== "";
  if (!hasSheet && !hasItem) return { ok: true, prepared: null };

  let patch: Record<string, unknown> = {};
  if (hasSheet) {
    const existing = await intakeSheetOf(patientId);
    if (existing) {
      const edit = prepareSheetEdit(existing, body.sheet);
      if (edit.missing.length) return { ok: false, error: edit.message ?? "تعديلُ الاستمارة غير صالح", missing: edit.missing };
      patch = edit.patch;
    }
  }
  if (hasItem && !isIntakeRequestedItem(rawItem)) {
    return { ok: false, error: "«المطلوب» غير صالح — اختر طرفاً كاملاً أو أحد الأجزاء", missing: ["requestedItem"] };
  }
  return { ok: true, prepared: { patientId, patch, requestedItem: hasItem ? (rawItem as RequestedItem) : null } };
}

/**
 * **يُكتب بعد حفظ المعاينة** — ويُعيد ملاحظةً تُقال للطبيب حين لم يُكتب شيءٌ أراده، أو `null`.
 * `episodeId` حلقةُ المعاينة نفسِها: «المطلوب» يُصحَّح عليها وحدها.
 */
export async function applyExamSheet(
  prepared: PreparedExamSheet | null,
  ctx: { examId: number; episodeId: number | null; userId: number | null; userName: string; ip: string | null; userAgent: string | null },
): Promise<string | null> {
  if (!prepared) return null;
  const notes: string[] = [];

  const keys = Object.keys(prepared.patch);
  if (keys.length > 0) {
    try {
      const before = await storage.getPatient(prepared.patientId);
      const after = await storage.updatePatient(prepared.patientId, prepared.patch as any, "manual_edit");
      const diff = diffPatientEdit((before ?? {}) as any, (after ?? {}) as any, keys);
      if (diff.fields.length > 0) {
        await logAudit({
          entityType: "patient", entityId: prepared.patientId, action: "update",
          userId: ctx.userId, userName: ctx.userName, branchId: before?.branchId ?? null,
          oldValues: diff.oldValues, newValues: diff.newValues, ipAddress: ctx.ip, userAgent: ctx.userAgent,
          notes: `${patientEditNote(diff)} — من استمارة المعاينة #${ctx.examId} بيد ${ctx.userName}`,
        });
      }
    } catch (err) {
      if (err instanceof PatientPhoneConflictError || err instanceof PatientPhoneTrashConflictError) {
        notes.push(`حُفظت المعاينة، ولم تُحفظ تعديلاتُ بيانات المريض: ${err.message}`);
      } else {
        console.error("[medical] exam sheet patient edit failed:", err);
        notes.push("حُفظت المعاينة، ولم تُحفظ تعديلاتُ بيانات المريض — أعدها من «تعديل المعاينة»");
      }
    }
  }

  if (prepared.requestedItem && ctx.episodeId !== null) {
    const r = await db.transaction((tx) => setEpisodeRequestedItemTx(tx, {
      episodeId: ctx.episodeId!, patientId: prepared.patientId, requestedItem: prepared.requestedItem!,
    }));
    if (r.result === "changed") {
      await logAudit({
        entityType: "patient_device_episode", entityId: ctx.episodeId, action: "update",
        userId: ctx.userId, userName: ctx.userName,
        oldValues: { requestedItem: r.from }, newValues: { requestedItem: prepared.requestedItem },
        ipAddress: ctx.ip, userAgent: ctx.userAgent,
        notes: `«المطلوب»: ${requestedItemLabel(r.from, "prosthetic")} ⟶ ${requestedItemLabel(prepared.requestedItem, "prosthetic")}`
          + ` — من استمارة المعاينة #${ctx.examId} بيد ${ctx.userName}`,
      });
    } else if (r.result === "locked") {
      notes.push("لم يتغيّر «المطلوب»: الجهازُ قُيّد سعرُه أو فُتح له أمرُ تصنيع");
    }
  }
  return notes.length ? notes.join(" — ") : null;
}
