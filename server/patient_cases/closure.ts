// **الإغلاقُ بديلُ الهدم لحالةٍ لها تاريخ** (المرحلة الثالثة — تكملة).
//
// ══ الواقعة ═══════════════════════════════════════════════════════════════
// `classifyCaseDisposal` تقول «قابلةٌ للسحب» أو **تحجب بحاجز**. والحجبُ وحده
// كان مخرجاً ناقصاً: معاينةٌ موقّعة أو جهازٌ سُلِّم أو مالٌ قُبض تعني أن الصفَّ
// لا يُهدَم — **لكنّها لا تعني أن الحالة يجب أن تبقى في طوابير العمل إلى
// الأبد**. فمريضٌ أنهى علاجَه، أو جهازٌ سُلّم وأُغلق ملفُّه، كان يبقى «نشطاً»
// في قائمة الطبيب وعدّادات الفرع ولا بابَ لإخراجه.
//
// ══ والمفردةُ موجودةٌ سلفاً بلا كاتب ═══════════════════════════════════════
// `patient_cases.status` يُقرأ `= 'active'` في سبعة مواضع حيّة (خريطتا انتظار
// المعاينة، قائمةُ عمل الطبيب، عدّادُ العلاج الطبيعي، أدواتُ المساعد، ومزامنةُ
// الكلفة) — **ولم يكن في المستودع كاتبٌ واحد يضع `'closed'`**. فالإغلاقُ هنا
// يستعمل الطبقةَ القائمة كما صُمِّمت، بلا عمودٍ جديد ولا ترحيل.
//
// ══ وما لا يُمَسّ أبداً ════════════════════════════════════════════════════
// المعايناتُ ونسخُها وملاحقُها · أوامرُ التصنيع وسجلُّها ومراحلُها · التسليمُ
// بختمه · الصيانةُ · حلقاتُ الأجهزة · **الدفعاتُ الأصلية** · قيودُ الكلف ·
// `patients.total_cost` · `patient_cases.cost`. الإغلاقُ يغيّر **حالةَ الصفّ
// وحدها**، ويضيف — عند الاسترداد — صفَّ حركةٍ ماليةٍ جديداً.

import { sql } from "drizzle-orm";
import {
  parseClosureRequest, computeClosureMoney, refundPaymentNote,
  CLOSURE_PAYMENT_TAG, CLOSURE_SERVICE_LABEL, CLOSURE_MESSAGES,
  type ClosureServiceType, type ClosureMoney, type ClosureRequest,
} from "@shared/case_closure";
import { classifyCaseDisposal, type CaseDisposal } from "./disposal";
import { createJournalForRefundTx } from "../accounting/auto_journal";

type Executor = { execute: (q: any) => Promise<any> };

async function rows(tx: Executor, q: any): Promise<Record<string, any>[]> {
  const r = await tx.execute(q);
  return (r.rows ?? []) as Record<string, any>[];
}

export class CaseClosureError extends Error {
  readonly status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
    this.name = "CaseClosureError";
  }
}

/** ما يراه المسؤولُ **قبل** أن يقرّر — أرقامٌ من الخادم لا من الشاشة. */
export interface CaseRemovalPreview {
  caseId: number;
  caseType: ClosureServiceType;
  serviceLabel: string;
  /** `dispose` = سقالةٌ تُهدَم · `close` = تاريخٌ يُغلَق. */
  mode: "dispose" | "close";
  /** حين `dispose`: ما سيُزال. */
  scaffolding?: { episodeIds: number[]; reviewRequestIds: number[]; markerVisitIds: number[] };
  /** حين `close`: لماذا لا يُهدَم — بالرمز والسبب. */
  blocker?: { code: string; reason: string; remedy: string };
  /** المالُ على هذه الحالة بعينها. */
  money: {
    caseCost: number;
    /** مجموعُ الدفعات **بما فيها الاستردادات السابقة** — الحدُّ الأعلى للردّ. */
    netPaid: number;
    /** كم رُدّ سابقاً على هذه الحالة (موجب). */
    refundedBefore: number;
    /** كلفةُ الحالة ناقصَ صافي المقبوض — يبقى بعد الإغلاق كما هو. */
    caseRemaining: number;
  };
  /** أمغلقةٌ سلفاً؟ — فلا يُعرَض عليها إغلاقٌ ثانٍ. */
  alreadyClosed: boolean;
}

/**
 * **صافي المقبوض على الحالة** — مجموعُ صفوف الدفعات المرتبطة بها، والسالبُ
 * منها (استردادٌ سابق) يخصم نفسَه. فلا عدّادَ ثانٍ يُخزَّن ويُخشى انحرافُه،
 * ولا يمكن أن يُردَّ المبلغُ مرّتين بإغلاقين متتاليين.
 */
async function caseNetPaidTx(tx: Executor, caseId: number): Promise<{ net: number; refunded: number }> {
  const [r] = await rows(tx, sql`
    SELECT COALESCE(SUM(amount), 0)::int AS net,
           COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0)::int AS refunded
      FROM payments WHERE case_id = ${caseId}
  `);
  return { net: Number(r?.net ?? 0), refunded: Number(r?.refunded ?? 0) };
}

/** يقفل صفَّ المريض ثمّ صفَّ الحالة، ويقرأ ما يلزم القرار. */
async function lockCaseTx(tx: Executor, patientId: number, caseType: ClosureServiceType) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${patientId})`);
  const [p] = await rows(tx, sql`
    SELECT id, branch_id, deleted_at FROM patients WHERE id = ${patientId} FOR UPDATE
  `);
  if (!p) throw new CaseClosureError("المريض غير موجود", 404);
  if (p.deleted_at) {
    throw new CaseClosureError("هذا الملف في المحذوفات — استعده أولاً", 409);
  }
  const [c] = await rows(tx, sql`
    SELECT id, status, cost, branch_id FROM patient_cases
     WHERE patient_id = ${patientId} AND case_type = ${caseType}
     FOR UPDATE
  `);
  if (!c) throw new CaseClosureError("لا توجد حالة من هذا النوع لهذا المريض", 404);
  return { patient: p, caseRow: c };
}

/**
 * **المعاينةُ قبل القرار** — تقول أيُّ بابٍ سيُفتَح وكم المالُ فعلاً.
 * وتُقرأ في معاملتها تحت القفل نفسِه، فالرقمُ المعروض ليس تخميناً؛ لكنّه
 * **لا يُقبَل سلطةً عند التنفيذ**: ذاك يعيد قراءتَه تحت قفله هو.
 */
export async function previewCaseRemovalTx(
  tx: Executor,
  params: { patientId: number; caseType: ClosureServiceType },
): Promise<CaseRemovalPreview> {
  const { patientId, caseType } = params;
  const { caseRow } = await lockCaseTx(tx, patientId, caseType);
  const caseId = Number(caseRow.id);

  const verdict: CaseDisposal = await classifyCaseDisposal(tx, { patientId, caseId, caseType });
  const { net, refunded } = await caseNetPaidTx(tx, caseId);
  const caseCost = Number(caseRow.cost ?? 0);

  return {
    caseId,
    caseType,
    serviceLabel: CLOSURE_SERVICE_LABEL[caseType],
    mode: verdict.disposable ? "dispose" : "close",
    scaffolding: verdict.disposable ? verdict.scaffolding : undefined,
    blocker: verdict.disposable ? undefined : verdict.blocker,
    money: {
      caseCost,
      netPaid: net,
      refundedBefore: refunded,
      caseRemaining: caseCost - net,
    },
    alreadyClosed: String(caseRow.status) === "closed",
  };
}

export interface CaseClosureOutcome {
  caseId: number;
  caseType: ClosureServiceType;
  money: ClosureMoney;
  /** صفُّ الاسترداد إن وقع — وإلّا `null`. */
  refundPaymentId: number | null;
  /**
   * **أكُتب قيدُ اليومية المرآة؟** — `true` دائماً إلّا حين لا يكون لفرع
   * المريض صندوقٌ مُعَدّ في دليل الحسابات (وهو نقصُ إعدادٍ يتخطّاه **بابُ
   * الدفعات نفسُه** أصلاً). الردُّ يقع في الحالتين — لأن الأرقامَ المعروضة
   * تُحسب من `payments` — **ويُقال أنه لم يُقيَّد** فلا يختفي بصمت.
   */
  journalPosted: boolean;
  reason: string;
  refundReason: string | null;
  retainedReason: string | null;
}

/**
 * **الإغلاقُ — معاملةٌ واحدة تحت القفل.**
 *
 * الترتيبُ مقصود: القفلُ ⟶ إعادةُ القراءة ⟶ التحقّقُ الكامل ⟶ **ثمّ** أيُّ
 * كتابة. فرفضٌ لأيّ سبب — سقالةٌ لا تُغلَق، مبلغٌ يفوق المقبوض، سببٌ ناقص —
 * يترك القاعدةَ كما وجدها بالضبط: لا صفَّ استردادٍ ولا قيدَ يوميةٍ ولا حالةً
 * تغيّرت.
 */
export async function closeCaseWithHistoryTx(
  tx: Executor,
  params: {
    patientId: number;
    caseType: ClosureServiceType;
    request: ClosureRequest;
    actor: { userId: number | null; userName: string | null };
  },
): Promise<CaseClosureOutcome> {
  const { patientId, caseType, request, actor } = params;
  const { caseRow } = await lockCaseTx(tx, patientId, caseType);
  const caseId = Number(caseRow.id);

  if (String(caseRow.status) === "closed") {
    throw new CaseClosureError("هذه الحالة مغلقة بالفعل — حدّث الصفحة.", 409);
  }

  //  ══ **السقالةُ لا تُغلَق، تُهدَم** ═══════════════════════════════════════
  //  وإلّا صار للخطأ الإداريّ مخرجان: أحدُهما يُبقي صفّاً ميّتاً بلا تاريخٍ
  //  يبرّره. والقرارُ يُعاد أخذُه هنا تحت القفل لا يُقبَل من الشاشة.
  const verdict = await classifyCaseDisposal(tx, { patientId, caseId, caseType });
  if (verdict.disposable) {
    throw new CaseClosureError(
      "هذه الحالة لا تحمل أيّ سجلّ — تُسحَب سحباً كاملاً ولا تُغلَق. أعد فتح النافذة.",
      409,
    );
  }

  //  **والرقمُ من القاعدة الآن** — لا من الشاشة، وقد تكون دفعةٌ سُجّلت بعدها.
  const { net } = await caseNetPaidTx(tx, caseId);
  const parsed = parseClosureRequest(net, request);
  if (!parsed.ok) throw new CaseClosureError(parsed.message, 400);
  const { reason, money, refundReason, retainedReason } = parsed.value;

  // ── ① الاستردادُ حركةٌ ماليةٌ مستقلّة — والأصلُ لا يُمَسّ ────────────────
  let refundPaymentId: number | null = null;
  let journalPosted = true;
  if (money.refundAmount > 0) {
    const note = refundPaymentNote(caseType, refundReason ?? reason);
    const [ins] = await rows(tx, sql`
      INSERT INTO payments
        (patient_id, branch_id, amount, notes, payment_treatment_type, case_id, date)
      VALUES (${patientId}, ${Number(caseRow.branch_id)}, ${-money.refundAmount},
              ${note}, ${CLOSURE_PAYMENT_TAG[caseType]}, ${caseId}, NOW())
      RETURNING id, patient_id, branch_id, date, payment_treatment_type, notes
    `);
    refundPaymentId = Number(ins.id);
    //  قيدُ اليومية المرآة: مدينٌ للإيراد، دائنٌ للصندوق — **بالمعاملة نفسِها**،
    //  فلا نقدٌ يخرج في جدولٍ ويبقى الدفترُ لا يعرفه.
    const journal = await createJournalForRefundTx(tx, {
      id: refundPaymentId,
      patientId,
      branchId: Number(caseRow.branch_id),
      date: ins.date ?? null,
      paymentTreatmentType: CLOSURE_PAYMENT_TAG[caseType],
      notes: note,
    }, money.refundAmount, actor.userId);
    journalPosted = journal.posted;
  }

  // ── ② الإغلاق — الحالةُ وحدها، بشرطِ حالةٍ يمنع الإغلاقَ مرّتين ─────────
  const closed = await rows(tx, sql`
    UPDATE patient_cases SET status = 'closed', updated_at = NOW()
     WHERE id = ${caseId} AND status <> 'closed'
    RETURNING id
  `);
  if (!closed.length) {
    throw new CaseClosureError("هذه الحالة مغلقة بالفعل — حدّث الصفحة.", 409);
  }

  return {
    caseId, caseType, money, refundPaymentId, journalPosted,
    reason, refundReason, retainedReason,
  };
}

/** سطرُ التدقيق — يقول المالَ بأرقامه، لا «أُغلقت» عارية. */
export function closureAuditNote(o: CaseClosureOutcome): string {
  const parts = [
    `إغلاق حالة ${CLOSURE_SERVICE_LABEL[o.caseType]} (#${o.caseId})`,
    `صافي المقبوض: ${o.money.netPaid.toLocaleString()} د.ع`,
  ];
  if (o.money.refundAmount > 0) {
    parts.push(`استُرجع: ${o.money.refundAmount.toLocaleString()} د.ع`
      + (o.refundPaymentId ? ` (حركة #${o.refundPaymentId})` : ""));
    if (o.refundReason) parts.push(`سبب الاسترجاع: ${o.refundReason}`);
    //  نقصُ إعدادٍ يُقال في التدقيق — لا يُكتشَف بعد أشهرٍ من فجوةٍ في اليومية.
    if (!o.journalPosted) parts.push("تنبيه: لم يُقيَّد في اليومية (صندوق الفرع غير مُعَدّ)");
  } else if (o.money.netPaid > 0) {
    parts.push("لم يُسترجَع شيء");
  }
  if (o.money.retainedAmount > 0) {
    parts.push(`احتُفظ بـ: ${o.money.retainedAmount.toLocaleString()} د.ع`);
    if (o.retainedReason) parts.push(`سبب الاحتفاظ: ${o.retainedReason}`);
  }
  parts.push(`السبب: ${o.reason}`);
  return parts.join(" — ");
}

export { CLOSURE_MESSAGES, computeClosureMoney };
