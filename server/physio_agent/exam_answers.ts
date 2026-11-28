// **أجوبةُ Bionic AI تُكتب في المعاينة** (§4.hd ٥.٥ — طلبُ المالك ٢٠٢٦-١١-٢٨: «التشخيصُ حرّ، ومنه يسأل الوكيلُ ما يحتاج»).
//
// سؤالٌ عن خاناتٍ مسمّاة في معاينة الإصدار الثالث يُجاب في لوح الأسئلة، فتُكتب القيمُ في المعاينة **نسخةً جديدة بالباب المراقَب نفسِه**
// (`reviseExam` — النسخةُ السابقة في `medical_exam_revisions` الذي لا يُعدَّل)، باسم مَن أجاب، بسطر تدقيق، في معاملة الجواب نفسِها —
// فتقرؤها البوّاباتُ الحتمية في التشغيل التالي. وبصمةُ الوظيفة تُحدَّث في التحديث نفسِه، فالوظيفةُ التي سألت تكمل ولا يلغيها المصالِح.
//
//   • **ملءٌ لا تبديل**: كلُّ خانةٍ تُكتب فارغةٌ في المخزَّن، وإلّا ٤٠٠ — تغييرُ ما كتبه الفاحصُ من «تعديل المعاينة» وحده.
//   • **لا ورقةَ السلامة ولا الجنسَ والعمر** — لا تُسأل ولا تُكتب من هنا أبداً؛ **والعلاماتُ الحمراء لا تُسأل**، وتُكتب وحدها حين يفرضها الجواب.
//   • **ما يفرضه الجوابُ على نفسه** (المجموعةُ ⟵ حالتُها ⟵ مدخلاتُ بوّابتها ⟵ **علاماتُها الحمراء**) يُطلب في الجواب نفسِه، وإلّا لا يُكتب شيء.
//   • **ولا يُكتب ما لم يُسأل عنه** ولم يفرضه الجواب (`exam_field_not_requested`) — المراجعة.
//   • **الثابت**: الموانعُ بعد الجواب تشمل ما قبله، إلّا ما كان «لم يُسجَّل بعد» وحسمه الجواب — وإلّا ٥٠٠ (حارسُ عطبٍ لا جوابُ عمل).
import { sql } from "drizzle-orm";
import { logAudit } from "../accounting/ledger";
import { readStoredAssessment } from "@shared/physio_initial_assessment";
import {
  answerFollowUps, examRuleset, examV2Missing, examV2MissingLabel, forbiddenDevices, isExamV2, isNeverAskable, isNotRecordedReason, parseExamV2,
  type ExamFieldSource, type PhysioExamV2, type V2Value,
} from "@shared/physio_exam_v2";
import { baghdadTodayYmd } from "@shared/visit_date";
import { reviseExam } from "../medical/store";

export class ExamAnswerError extends Error {
  constructor(public status: number, message: string, public code: string, public extra: Record<string, unknown> = {}) { super(message); }
}

const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];
const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** نقطةُ اختبارٍ للثابت: تعبث بالمدموج قبل فحصه — فتُثبت المراجعةُ العكسية أنّ الحارسَ يمنع. */
let invariantHook: ((merged: PhysioExamV2) => PhysioExamV2) | null = null;
export function setExamAnswerInvariantHookForTests(fn: ((merged: PhysioExamV2) => PhysioExamV2) | null): void { invariantHook = fn; }

export interface WrittenAnswers { examVersion: number; keys: string[]; oldValues: Record<string, V2Value | null>; newValues: Record<string, V2Value> }

/**
 * **يكتب الأجوبةَ في المعاينة** داخل معاملة الجواب (بعد قفل المريض وقفل الوظيفة). `mayWrite`: كاتبُ المعاينة أو أخصائيّو فرعها.
 * يعيد النسخةَ الجديدة وما تغيّر.
 */
export async function writeAnswersToExamTx(tx: any, p: {
  examId: number; patch: Record<string, V2Value>; actor: { userId: number | null; name: string | null; ip?: string | null; userAgent?: string | null };
  jobId: number; round: number; mayWrite: boolean;
  /** خاناتُ الأسئلة المفتوحة (`examFields`) — وما عداها لا يُقبل إلّا ما يفرضه الجوابُ نفسُه. */
  askedKeys: readonly string[];
}): Promise<WrittenAnswers> {
  if (!p.mayWrite) throw new ExamAnswerError(403, "يجيب عن خانة المعاينة كاتبُها أو أخصائيّو فرعها", "exam_field_answer_refused");
  const ex = rows(await tx.execute(sql`SELECT me.*, EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = me.id) AS cancelled
      FROM medical_exams me WHERE me.id = ${p.examId} FOR UPDATE OF me`))[0];
  if (!ex) throw new ExamAnswerError(404, "المعاينةُ غير موجودة", "exam_not_found");
  if (ex.cancelled) throw new ExamAnswerError(409, "المعاينةُ ملغاة", "exam_cancelled");
  const stored = readStoredAssessment(ex.assessment);
  if (!isExamV2(stored) || examRuleset(stored) !== "v3") {
    throw new ExamAnswerError(409, "هذه المعاينة ليست على الاستمارة ذات التشخيص الحرّ — عدّلها من «تعديل المعاينة»", "answer_needs_exam_revision");
  }
  const keys = Object.keys(p.patch);
  //  §4.hd (المراجعة) — **لا يُكتب إلّا ما سُئل عنه وما فرضه الجوابُ نفسُه** (`answerFollowUps` طبقةً بعد طبقة على دمجٍ تجريبيّ):
  //  جوابٌ عن السكّريّ لا يحمل نوعَ وتر العرقوب فيُبيح الموجات، ولا علامةً حمراء لم تصر إلزاميةً بالجواب.
  const asked = new Set(p.askedKeys);
  for (const key of keys) {
    if (isNeverAskable(key) && !key.startsWith("redFlags.")) throw new ExamAnswerError(400, "هذه الخانةُ يكتبها الفاحصُ في المعاينة نفسِها", "exam_field_not_askable", { missing: [key] });
    const [part, k] = key.split(".");
    if ((part !== "core" && part !== "module" && part !== "redFlags") || !k) throw new ExamAnswerError(400, "خانةٌ غيرُ معروفة في المعاينة", "exam_field_unknown", { missing: [key] });
    if (part === "redFlags" && asked.has(key)) throw new ExamAnswerError(400, "هذه الخانةُ يكتبها الفاحصُ في المعاينة نفسِها", "exam_field_not_askable", { missing: [key] });
  }
  const today = baghdadTodayYmd();
  const mergeOf = (subset: readonly string[]) => {
    const core = { ...(stored.core ?? {}) };
    const module = { ...(stored.module ?? {}) };
    const redFlags = { ...(stored.redFlags ?? {}) } as Record<string, any>;
    for (const key of subset) {
      const [part, k] = key.split(".");
      (part === "core" ? core : part === "module" ? module : redFlags)[k] = p.patch[key];
    }
    return parseExamV2({ ...stored, core, module, redFlags }, { today, diagnosis: ex.diagnosis ?? "" });
  };
  let allowed = new Set(Array.from(asked).filter((k) => k in p.patch));
  for (let i = 0; i < 6; i++) {
    const trial = mergeOf(keys.filter((k) => allowed.has(k)));
    if (!trial.ok) break;
    const next = new Set([...Array.from(allowed), ...answerFollowUps(stored, trial.value, Array.from(allowed))]);
    if (next.size === allowed.size) break;
    allowed = next;
  }
  const oldValues: Record<string, V2Value | null> = {};
  for (const key of keys) {
    const [part, k] = key.split(".");
    const cur = part === "core" ? stored.core?.[k] : part === "module" ? stored.module?.[k] : (stored.redFlags as any)?.[k];
    //  **ملءٌ لا تبديل** — ما في المعاينة يغيّره الفاحصُ من «تعديل المعاينة» وحده.
    if (!isEmpty(cur)) {
      throw new ExamAnswerError(400, "غيّر هذه الخانة من «تعديل المعاينة» — فيها قيمةٌ مسجَّلة", "exam_field_already_answered", { missing: [key] });
    }
    oldValues[key] = (cur ?? null) as V2Value | null;
  }
  const extra = keys.filter((k) => !allowed.has(k));
  if (extra.length) {
    throw new ExamAnswerError(400, "في الجواب خاناتٌ لم يسأل عنها Bionic AI ولا يفرضها الجواب — غيّرها من «تعديل المعاينة»", "exam_field_not_requested",
      { missing: extra, missingLabels: extra.map((k) => examV2MissingLabel(k, stored.core?.group)) });
  }
  //  `fieldSources` و`onsetAtSigning` يكتبهما الخادم — يُعادان بعد التطبيع (الذي يُسقط ما لا يعرفه).
  const parsed = mergeOf(keys);
  if (!parsed.ok) throw new ExamAnswerError(400, parsed.error, "assessment_invalid", { missing: parsed.missing });
  let merged: PhysioExamV2 = parsed.value;
  for (const key of keys) {
    const [part, k] = key.split(".");
    if (isEmpty(part === "core" ? merged.core?.[k] : part === "module" ? merged.module?.[k] : (merged.redFlags as any)?.[k])) {
      //  قيمةٌ لا تنطبق بعد الدمج (الشرطُ لم يصدق) تُمحى — فلا يُكتب جوابٌ لا يُقرأ.
      throw new ExamAnswerError(400, `«${examV2MissingLabel(key, merged.core?.group)}» لا تنطبق على هذه المعاينة`, "answer_incomplete_fields",
        { missing: [key], missingLabels: [examV2MissingLabel(key, merged.core?.group)] });
    }
  }
  const followUps = answerFollowUps(stored, merged, keys);
  if (followUps.length) {
    throw new ExamAnswerError(400, `أكمل في الجواب نفسِه: ${followUps.map((k) => examV2MissingLabel(k, merged.core?.group)).join("، ")}`, "answer_incomplete_fields",
      { missing: followUps, missingLabels: followUps.map((k) => examV2MissingLabel(k, merged.core?.group)) });
  }
  if (examV2Missing(merged, ex.diagnosis ?? "").length) {
    throw new ExamAnswerError(409, "المعاينةُ ناقصة — أكملها من «تعديل المعاينة»", "assessment_incomplete");
  }
  if (invariantHook) merged = invariantHook(merged);
  //  **الثابت** — جوابٌ يملأ خانةً لا يُبيح جهازاً كان ممنوعاً بسببٍ مسجَّل.
  const before = forbiddenDevices(stored, { today });
  const after = new Set(forbiddenDevices(merged, { today }).map((d) => d.deviceCode));
  const lost = before.filter((d) => !after.has(d.deviceCode) && !d.reasonAr.split("؛ ").every((r) => isNotRecordedReason(r)));
  if (lost.length) {
    console.error("[physio-agent] exam answer invariant violated:", lost);
    throw new ExamAnswerError(500, "تعذّر حفظ الجواب: تغيّرت موانعُ مسجَّلة — أُبلغ المسؤول", "exam_answer_invariant", { devices: lost.map((d) => d.deviceCode) });
  }
  const version = Number(ex.version) + 1;
  const at = new Date().toISOString();
  const src: ExamFieldSource = { by: p.actor.userId, byName: p.actor.name, jobId: p.jobId, round: p.round, version, at };
  const fieldSources = { ...(stored.fieldSources ?? {}), ...Object.fromEntries(keys.map((k) => [k, src])) };
  const assessment = { ...merged, fieldSources, ...((stored as any).onsetAtSigning !== undefined ? { onsetAtSigning: (stored as any).onsetAtSigning } : {}) };
  const editorName = p.actor.name?.trim() || "مستخدم";
  const revised = await reviseExam(p.examId, {
    caseType: ex.case_type, prescription: ex.prescription ?? {}, deviceCost: ex.device_cost ?? null,
    proposedExpertUserId: ex.proposed_expert_user_id ?? null, chiefComplaint: ex.chief_complaint ?? null, clinicalFindings: ex.clinical_findings ?? null,
    diagnosis: ex.diagnosis ?? null, plan: ex.plan ?? null, notes: ex.notes ?? null, assessment,
  }, { userId: p.actor.userId, userName: editorName }, { tx, expectedVersion: Number(ex.version) });
  const newValues = Object.fromEntries(keys.map((k) => {
    const [part, kk] = k.split(".");
    return [k, (part === "core" ? merged.core?.[kk] : part === "module" ? merged.module?.[kk] : (merged.redFlags as any)?.[kk]) as V2Value];
  }));
  await logAudit({ entityType: "medical_exam", entityId: p.examId, action: "update", userId: p.actor.userId, userName: editorName,
    branchId: ex.branch_id == null ? null : Number(ex.branch_id), oldValues: { fields: oldValues, version: Number(ex.version) },
    newValues: { fields: newValues, version: revised.version, source: "agent_question", jobId: p.jobId, round: p.round },
    notes: `أُضيفت أجوبةٌ لـ Bionic AI إلى المعاينة #${p.examId} — الجولة ${p.round} — بواسطة ${editorName} (النسخة ${revised.version})`,
    ipAddress: p.actor.ip ?? null, userAgent: p.actor.userAgent ?? null, tx });
  return { examVersion: revised.version, keys, oldValues, newValues };
}
