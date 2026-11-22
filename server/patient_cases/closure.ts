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
import { recordRefundPaymentTx } from "../accounting/refund_payment";
import { logAudit } from "../accounting/ledger";
import { ATTENDANCE_REASONS } from "@shared/attendance";

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
  return { patient: p, caseRow: c, branchId: resolveBranchId(p, c) };
}

/**
 * **فرعُ الحركة المالية — ولا صفرَ أبداً.**
 *
 * ══ العطب ═════════════════════════════════════════════════════════════════
 * `patient_cases.branch_id` عمودٌ **يقبل `NULL`** (بلا افتراض، ومفتاحٌ أجنبيّ
 * إلى `branches`). وكان يُقرأ `Number(caseRow.branch_id)` — و`Number(null)`
 * تساوي **صفراً** لا `NaN`. فحالةٌ بلا فرع كانت تكتب دفعةَ استرجاعٍ على
 * `branch_id = 0`: لا فرعَ بهذا الرقم، فيرتدّ المفتاحُ الأجنبيّ بنصّ Postgres
 * خامٍّ على وجه المستخدم وتسقط المعاملةُ كلُّها؛ ولو وُجد فرعٌ بالرقم يوماً
 * لكان أسوأ — **مالٌ يُنسَب صامتاً إلى فرعٍ لم يعمل فيه**.
 *
 * ══ والحلُّ يُرتِّب المصادر ولا يخترع ═════════════════════════════════════
 * فرعُ الحالة إن وُجد · وإلّا **فرعُ المريض** (`patients.branch_id` عمودٌ
 * `NOT NULL`، وهو المصدرُ الذي تستعمله `startDeviceEpisodeTx` احتياطاً
 * أصلاً — لا قاعدةٌ ثانية تُخترَع هنا) · وإلّا **يُردّ الطلبُ صراحةً**
 * بلا كتابةِ دينار. ولا صفرٌ ولا تخمين.
 */
function resolveBranchId(patientRow: Record<string, any>, caseRow: Record<string, any>): number {
  for (const raw of [caseRow.branch_id, patientRow.branch_id]) {
    if (raw === null || raw === undefined || raw === "") continue;
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0) return n;
  }
  throw new CaseClosureError(
    "لا يمكن تحديد فرع هذه الحالة — راجع بيانات الملف قبل الإغلاق.", 409,
  );
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
  const { caseRow, branchId } = await lockCaseTx(tx, patientId, caseType);
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
  //  **والكتابةُ بالكاتب الواحد** (`recordRefundPaymentTx`): رُفعت من هنا كما
  //  هي حرفاً حين احتاجها بابٌ ثانٍ (فرعُ «نعم» في التصحيح الإداريّ) — نفسُ
  //  الأعمدة ونفسُ القيد ونفسُ التسامح مع نقص الإعداد. **والوسمُ والملاحظةُ
  //  يبقيان هنا**: لغةُ الإغلاق لا لغةُ كلّ ردّ.
  let refundPaymentId: number | null = null;
  let journalPosted = true;
  if (money.refundAmount > 0) {
    const written = await recordRefundPaymentTx(tx, {
      patientId, branchId, caseId,
      amount: money.refundAmount,
      paymentTreatmentType: CLOSURE_PAYMENT_TAG[caseType],
      notes: refundPaymentNote(caseType, refundReason ?? reason),
      actorUserId: actor.userId,
    });
    refundPaymentId = written.paymentId;
    journalPosted = written.journalPosted;
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

// ══ **إغلاقُ القسم الفارغ تلقائياً** (§4.gu — قرارُ المالك ٢٠٢٦-١١-٢٢) ═════════════════════════════════
//
// المالك: حين يُرجِع الطبيبُ معاينةً للاستعلامات «يجب أن يتمكّن من إمّا إلغائها أو تحويل المريض من علاج طبيعي إلى أطراف أو بالعكس»،
// **والقسمُ القديم يُغلَق تلقائياً إن كان فارغاً، وإلّا يبقى كما هو ويُلغى طلبُه وحده**.
//
// **و«الفارغ» بأشدّ معنى** — أيُّ أثرٍ حقيقيّ يُبقيه:
//   ① `classifyCaseDisposal` تقول «سقالة» (لا معاينةَ موقّعة ولا متابعة ولا أمرَ تصنيع ولا دفعةً على القسم ولا عمليةً معلَّقة ولا خصماً
//      ينتظر ولا حلقةً حيّة ولا طلباً قُرِّر فيه)؛ ② وكلفةُ القسم صفر؛ ③ ولا حلقةَ جهازٍ عليه غيرُ ملغاة (فطلبُ جهازٍ آخر ينتظر يُبقيه —
//   وهو ما تعدّه ①سقالةً)؛ ④ ولا زيارةَ حيّةً عليه غيرُ علامتَي المسار نفسِه («إضافة نوع حالة» و«طلب معاينة طبية» — الزيارتان اللتان
//   تعدّهما ① سقالةً)؛ ⑤ ولا قيدَ كلفةٍ ولا خطّةَ أقساطٍ ولا طلبَ استرجاعٍ عليه؛ ⑥ **وللعلاج الطبيعيّ** فوقها: لا خطّةَ علاج
//   (`physio_plans` · `treatment_plans` — بالمريض، فلا قسمَ فيهما)، ولا زيارةَ حيّةً بلا قسم، ولا دفعةً بلا قسم — كقاعدة
//   `retireAcrossPhysiotherapy` («للعلاج الطبيعي جلساتٌ أو خطّةُ علاجٍ مسجَّلة»).
//
// **والإغلاقُ لا الحذف** («يُغلَق» قولُ المالك): الصفُّ يبقى بتاريخه، ويُفتَح مُدقَّقاً حين يعود المريضُ لخدمة (`ensureCaseTx`)،
// **وأعلامُ المريض لا تُمَسّ** — قاعدةُ الإغلاق في هذا الملفّ (`closeCaseWithHistoryTx` يغيّر الحالةَ وحدها).
//
// **تحت قفل المريض** (٩١٩) **ثمّ صفّ القسم** — بترتيب `lockCaseTx`؛ ويُنادى داخل معاملة المُنادي بعد أن يسحب الطلبَ المُرجَع،
// فالسحبُ والإغلاقُ وسطرُ التدقيق حدثٌ واحد أو لا شيء.
export type AutoCloseOutcome =
  | { closed: true; caseId: number }
  | { closed: false; caseId: number | null; keptBecause: string };

export async function closeCaseIfEmptyTx(
  tx: Executor,
  params: {
    patientId: number;
    caseType: ClosureServiceType;
    reason: string;
    actor: { userId: number | null; userName: string | null };
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<AutoCloseOutcome> {
  const { patientId, caseType } = params;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${patientId})`);
  const [p] = await rows(tx, sql`SELECT id, branch_id FROM patients WHERE id = ${patientId} FOR UPDATE`);
  const [c] = await rows(tx, sql`
    SELECT id, status, cost, branch_id FROM patient_cases
     WHERE patient_id = ${patientId} AND case_type = ${caseType}
     FOR UPDATE
  `);
  if (!p || !c) return { closed: false, caseId: c ? Number(c.id) : null, keptBecause: "لا قسمَ من هذا النوع" };
  const caseId = Number(c.id);
  if (String(c.status) !== "active") return { closed: false, caseId, keptBecause: "القسمُ مغلقٌ أصلاً" };
  const kept = (keptBecause: string): AutoCloseOutcome => ({ closed: false, caseId, keptBecause });

  const disposal = await classifyCaseDisposal(tx, { patientId, caseId, caseType });
  if (!disposal.disposable) return kept(disposal.blocker.reason);
  if (Number(c.cost ?? 0) !== 0) return kept("على القسم كلفةٌ مسجَّلة");
  const markers = sql`('إضافة نوع حالة', ${ATTENDANCE_REASONS.examRequest})`;
  const physio = caseType === "physiotherapy";
  const [hit] = await rows(tx, sql`
    SELECT 'episode' AS k FROM patient_device_episodes WHERE case_id = ${caseId} AND status <> 'cancelled'
    UNION ALL
    SELECT 'visit' FROM visits
     WHERE deleted_at IS NULL AND details NOT IN ${markers}
       AND (case_id = ${caseId} ${physio ? sql`OR (patient_id = ${patientId} AND case_id IS NULL)` : sql``})
    UNION ALL
    SELECT 'cost_entry' FROM cost_entries WHERE case_id = ${caseId}
    UNION ALL
    SELECT 'installment' FROM installment_plans WHERE case_id = ${caseId}
    UNION ALL
    SELECT 'refund' FROM patient_refund_requests WHERE case_id = ${caseId}
    ${physio ? sql`
    UNION ALL
    SELECT 'payment' FROM payments WHERE patient_id = ${patientId} AND case_id IS NULL
    UNION ALL
    SELECT 'plan' FROM physio_plans WHERE patient_id = ${patientId}
    UNION ALL
    SELECT 'plan' FROM treatment_plans WHERE patient_id = ${patientId}` : sql``}
    LIMIT 1
  `);
  if (hit) {
    const why: Record<string, string> = {
      episode: "على القسم طلبُ جهازٍ آخر قائم",
      visit: "على القسم زياراتٌ أو جلساتٌ مسجَّلة",
      cost_entry: "على القسم قيودُ كلفة",
      installment: "على القسم خطّةُ أقساط",
      refund: "على القسم طلبُ استرجاع",
      payment: "للمريض دفعاتٌ غيرُ منسوبةٍ لقسم",
      plan: "للعلاج الطبيعي خطّةُ علاجٍ مسجَّلة",
    };
    return kept(why[String(hit.k)] ?? "على القسم سجلّ");
  }

  const closed = await rows(tx, sql`
    UPDATE patient_cases SET status = 'closed', updated_at = NOW()
     WHERE id = ${caseId} AND status = 'active'
    RETURNING id
  `);
  if (!closed.length) return kept("تغيّرت حالة القسم");
  const branchId = (() => { try { return resolveBranchId(p, c); } catch { return null; } })();
  await logAudit({
    tx, entityType: "patient_case", entityId: caseId, action: "update",
    userId: params.actor.userId, userName: params.actor.userName, branchId,
    oldValues: { status: "active" },
    newValues: { status: "closed", caseType, autoClosed: true },
    ipAddress: params.ipAddress ?? null, userAgent: params.userAgent ?? null,
    notes: `إغلاق تلقائي لقسم ${CLOSURE_SERVICE_LABEL[caseType]} الفارغ (#${caseId}) — ${params.reason}`,
  });
  return { closed: true, caseId };
}
