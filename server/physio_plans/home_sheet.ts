// **إرسالُ ورقة تمارين البيت إلى تلغرام المريض** (§4.ds). الورقةُ تُصنع في الصفحة (`/physio-home-sheet/print`) ملفَّ PDF بصفحاتها
// المطبوعة نفسِها، وهنا تُفحص وتُرسل لكلّ حساب تلغرامٍ مربوطٍ ربطاً نشِطاً بالمريض، **ونصُّ الرسالة من الخطّة لا من الصفحة**.
// والإرسالُ «أطلق وأبلغ» كبطاقة المريض (§4.bv): يقول كم وصل وكم تعذّر، ولا يكتب في الخطّة شيئاً — سطرُ التدقيق وحدَه أثرُه.
import { createHash } from "node:crypto";
import { listActiveContacts } from "../patient_contacts/store";
import { patientBotEnabled } from "../patient_telegram/config";
import { sendDocument } from "../patient_telegram/client";
import { intakeHeader } from "@shared/intake_sheet";
import {
  homeSheetAllowed, homeSheetCaption, homeSheetFileName, homeSheetSelectionError, isPdfBytes, HOME_SHEET_NOT_STARTED,
} from "@shared/physio_home_sheet";
import { getPlanPhases, PlanError } from "./store";

export interface HomeSheetPlan { id: number; patientId: number; status: string; branchName: string | null; patientCode: string | null }

export interface HomeSheetResult { recipients: number; sent: number; failed: number; phasePosition: number; exerciseIds: number[]; bytes: number; sha256: string }

/** عددُ حسابات تلغرام المربوطة ربطاً نشِطاً بالمريض — لزرّ «إرسال عبر تلغرام». */
export async function telegramRecipients(patientId: number): Promise<number> {
  return (await listActiveContacts(patientId)).filter((c) => c.channel === "telegram").length;
}

/** ما يُعرف قبل الإرسال — يُكتب سطرَ تدقيقٍ قبل أن يخرج شيء (`beforeSend`). */
export type HomeSheetAttempt = Omit<HomeSheetResult, "sent" | "failed">;

/**
 * يفحص ثمّ يرسل. **و`beforeSend` يُستدعى بعد الفحص وقبل أوّل نداءٍ لتلغرام** — فيه يكتب الباب سطرَ المحاولة كتابةً صارمة (ملاحظةُ المراجعة على #623):
 * إن تعذّر التدقيقُ لا يخرج ملفٌّ للمريض، وإن تعذّر سطرُ النتيجة بعد الإرسال بقي سطرُ المحاولة يقول ما أُرسل ولمن.
 */
export async function sendHomeSheet(plan: HomeSheetPlan, p: { pdf: Uint8Array | null; phasePosition: number | null; exerciseIds: number[] | null },
  beforeSend: (attempt: HomeSheetAttempt) => Promise<void> = async () => {}): Promise<HomeSheetResult> {
  if (!homeSheetAllowed(plan.status)) throw new PlanError(409, HOME_SHEET_NOT_STARTED);
  if (!patientBotEnabled()) throw new PlanError(503, "بوتُ تلغرام المرضى غيرُ مُعدّ — لا إرسال");
  if (!p.pdf || !isPdfBytes(p.pdf)) throw new PlanError(400, "الورقةُ ملفُّ PDF من صفحة الطباعة");
  if (p.phasePosition === null || p.exerciseIds === null) throw new PlanError(400, "المرحلةُ وتمارينُ الورقة مطلوبة");

  const phases = await getPlanPhases(plan.id);
  const phase = phases.find((ph: any) => ph.position === p.phasePosition);
  if (!phase) throw new PlanError(400, "مرحلةٌ ليست في الخطّة");
  const bad = homeSheetSelectionError({ phaseExerciseIds: phase.exercises.map((e: any) => e.exerciseId), exerciseIds: p.exerciseIds });
  if (bad) throw new PlanError(400, bad);

  const contacts = (await listActiveContacts(plan.patientId)).filter((c) => c.channel === "telegram");
  if (contacts.length === 0) throw new PlanError(409, "المريضُ غيرُ مربوطٍ بتلغرام — اربطه من ملفّه أوّلاً");

  const h = intakeHeader(plan.branchName);
  const caption = homeSheetCaption({ centerName: h.centerName, city: h.city || null, phaseName: phase.nameAr ?? null, count: p.exerciseIds.length });
  const fileName = homeSheetFileName(plan.patientCode, plan.id);
  const attempt: HomeSheetAttempt = {
    recipients: contacts.length, phasePosition: phase.position, exerciseIds: p.exerciseIds,
    bytes: p.pdf.length, sha256: createHash("sha256").update(p.pdf).digest("hex"),
  };
  await beforeSend(attempt);
  let sent = 0;
  for (const c of contacts) {
    const r = await sendDocument(String(c.externalId), p.pdf, fileName, caption);
    if (r.ok) sent++;
  }
  return { ...attempt, sent, failed: contacts.length - sent };
}
