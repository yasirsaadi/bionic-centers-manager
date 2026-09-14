// **ردُّ مالٍ لمريض — صفٌّ سالبٌ وقيدُه المرآة، بكاتبٍ واحد.**
//
// ══ المبدأ — الأصلُ لا يُمَسّ ═════════════════════════════════════════════
// لا تُعدَّل دفعةٌ ولا تُحذف ولا يُعكَس قيدُها: **الردُّ حركةٌ ماليةٌ جديدة**
// لها صفُّها وقيدُها. والتعليلُ الكامل فوق `createJournalForRefundTx` —
// المستردُّ قد يكون جزءاً من مجموع دفعاتٍ كثيرة، ووسمُ دفعةٍ صحيحةٍ وقعت
// فعلاً «معكوسة» يكتب ماضياً لم يقع.
//
// ══ ولماذا كاتبٌ واحد ════════════════════════════════════════════════════
// أوّلُ كتابةٍ لهذا كانت **مضمَّنةً** في `closeCaseWithHistoryTx` (§٤.r):
// إدراجٌ سالبٌ ثمّ نداءُ القيد. ثمّ احتاجه **فرعُ «نعم»** في التصحيح الإداريّ.
// ونسخةٌ ثانيةٌ من محاسبة الردّ تنحرف يوماً (درسُ الصيانة قبل ٠٦٠)، فرُفعت
// الكتلةُ كما هي حرفاً إلى هنا: **نفسُ الأعمدة، ونفسُ وسائط القيد، ونفسُ
// تسامحِه مع نقص الإعداد** — والمُنادي يقول الوسمَ والملاحظة، فلكلّ بابٍ
// لغتُه وحقيقتُه الواحدة.
//
// **ولا يقرّر هذا الملفُّ متى يُردّ ولا كم** — تلك قواعدُ كلّ باب. هو يكتب
// ما يُعطى، **ويرفض ما ليس ردّاً** (صفرٌ أو سالب) بدل أن يكتب صفّاً كاذباً.

import { sql } from "drizzle-orm";
import { createJournalForRefundTx } from "./auto_journal";

type Executor = { execute: (q: any) => Promise<any> };

export interface RefundPaymentResult {
  /** رقمُ صفّ الدفعة السالبة — وهو `source_id` لقيدها. */
  paymentId: number;
  /**
   * أوَقَع قيدُ اليومية؟ **نقصُ إعدادٍ يُقال ولا يحبس مالَ مريض**: فرعٌ بلا
   * صندوقٍ مُعَدٍّ يمرّ بـ`false` والصفُّ يُكتب — وأيُّ فشلٍ آخر يصعد فيُسقط
   * المعاملةَ كلَّها.
   */
  journalPosted: boolean;
  journalSkippedReason: "no_cash_account" | "no_revenue_account" | null;
}

export async function recordRefundPaymentTx(
  tx: Executor,
  params: {
    patientId: number;
    /** فرعُ الحركة — **يُحسم عند المنادي**، ولا يُقرأ `NULL` صفراً. */
    branchId: number;
    caseId: number | null;
    /** حلقةُ الجهاز حين يكون للردّ جهازٌ بعينه؛ وإلّا `null`. */
    deviceEpisodeId?: number | null;
    /** مقدارُ الردّ **موجباً** — ويُكتب في الصفّ سالباً. */
    amount: number;
    paymentTreatmentType: string | null;
    notes: string;
    actorUserId: number | null;
  },
): Promise<RefundPaymentResult> {
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error(`recordRefundPaymentTx: مقدارُ الردّ يجب أن يكون موجباً (${params.amount})`);
  }

  const ins = await tx.execute(sql`
    INSERT INTO payments
      (patient_id, branch_id, amount, notes, payment_treatment_type,
       case_id, device_episode_id, date)
    VALUES (${params.patientId}, ${params.branchId}, ${-params.amount},
            ${params.notes}, ${params.paymentTreatmentType},
            ${params.caseId}, ${params.deviceEpisodeId ?? null}, NOW())
    RETURNING id, patient_id, branch_id, date, payment_treatment_type, notes
  `);
  const row = (ins.rows ?? [])[0] as Record<string, any>;
  const paymentId = Number(row.id);

  //  قيدُ اليومية المرآة: مدينٌ للإيراد، دائنٌ للصندوق — **بالمعاملة نفسِها**،
  //  فلا نقدٌ يخرج في جدولٍ ويبقى الدفترُ لا يعرفه.
  const journal = await createJournalForRefundTx(tx, {
    id: paymentId,
    patientId: params.patientId,
    branchId: params.branchId,
    date: row.date ?? null,
    paymentTreatmentType: params.paymentTreatmentType,
    notes: params.notes,
  }, params.amount, params.actorUserId);

  return {
    paymentId,
    journalPosted: journal.posted,
    journalSkippedReason: journal.posted ? null : journal.reason,
  };
}
