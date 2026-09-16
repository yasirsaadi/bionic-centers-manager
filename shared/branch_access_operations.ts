//  **قرارُ كلّ عمليةٍ مفتوحة على حدة** عند إتاحة الملفّ لفرعٍ إضافيّ.
//  منطقٌ خالص، بلا شبكة ولا قاعدة بيانات — يقرؤه **الطرفان**: الشاشةُ
//  لتعطيل الحفظ قبل اكتمال القرارات، والخادمُ ليحرس ما يُكتب.
//
//  ══ لماذا لكلّ عمليةٍ قرارُها ══════════════════════════════════════════
//  كان السؤالُ واحداً لكلّ المريض: «أتُنقَل مسؤوليةُ العمليات؟» ومعه خبيرٌ
//  واحد يُطبَّق على الجميع. ومريضٌ له طرفٌ يُصنَع في كربلاء ومسندٌ يُصنَع
//  في ذي قار لا يُوصَف قرارُه بنعم/لا واحدة — فإمّا نُقلت عمليةٌ لم يُقصَد
//  نقلُها، وإمّا بقيت عمليةٌ كان يجب أن تنتقل.
//
//  ══ وتغييرُ الخبير قرارٌ مستقلّ عن النقل ═══════════════════════════════
//  «تبقى العمليةُ في فرعها» لا يعني «يبقى خبيرُها»: خبيرٌ يمرض أو يُجاز
//  فيُسلَّم جهازُه لزميلٍ **في الفرع نفسِه**، والعمليةُ لم تتحرّك. فالقراران
//  متعامدان: يبقى/ينتقل × يبقى الخبير/يتغيّر.
//
//  ══ والفرعُ الذي يُتحقَّق الخبيرُ تجاهه يتبع القرارَ لا المنح ═══════════
//  عمليةٌ **تنتقل** ⟶ خبيرُها من **الفرع المضاف**. وعمليةٌ **تبقى** ⟶
//  خبيرُها من **فرعها هي**. وهذا هو بيتُ القصيد: لو تحقّقنا دائماً تجاه
//  الفرع المضاف لصار تغييرُ خبيرِ عمليةٍ باقيةٍ في كربلاء يطلب خبيرَ ذي
//  قار — فيُسنَد جهازُ كربلاء إلى مَن لا يعمل فيها.

/** ما يلزم من صفّ «عملية مفتوحة» لاتّخاذ قرارها — لا أكثر. */
export interface OpenOperationLike {
  episodeId: number | null;
  episodeLive: boolean;
  episodeBranchId: number | null;
  workOrderId: number | null;
  workOrderBranchId: number | null;
  expertUserId: number | null;
  followupId: number | null;
}

export type ExpertChoice = "keep" | number;

export interface OperationDecisionInput {
  key: string;
  move: boolean;
  /** يُشترَط لعمليةٍ لها أمرُ عمل، ويُرفَض لغيرها — لا خبيرَ بلا أمر. */
  expert?: ExpertChoice | null;
}

export interface ResolvedOperationPlan<T extends OpenOperationLike = OpenOperationLike> {
  key: string;
  op: T;
  move: boolean;
  /** فرعُ العملية **بعد** القرار — وإليه يُتحقَّق الخبير. */
  targetBranchId: number | null;
  /** الخبيرُ الجديد، أو `null` حين يبقى الحاليّ أو لا خبيرَ أصلاً. */
  newExpertUserId: number | null;
  /**
   * **الخبيرُ المُسمَّى صراحةً** — يُتحقَّق منه تجاه `targetBranchId` **دائماً**،
   * ولو كان هو الخبيرَ الحاليَّ نفسَه.
   *
   * و«إبقاء» وحدها تتخطّى التحقّق: خبيرٌ بدأ جهازاً يواصله ولو انتقلت
   * مسؤوليةُ العملية إلى فرعٍ لا يعمل فيه — قرارٌ صريحٌ قائم. أمّا أن
   * **تُسمّيَه** لعمليةٍ في فرعٍ لا يصلح له فادّعاءُ إسنادٍ لا يصحّ، ويُردّ
   * — وهذا هو العقدُ القائم قبل قرارات العمليات، محفوظاً بحرفه.
   */
  validateExpertUserId: number | null;
}

export type DecisionResolution<T extends OpenOperationLike = OpenOperationLike> =
  | { ok: true; plans: ResolvedOperationPlan<T>[] }
  | { ok: false; error: string };

/**
 * **هويّةُ الصفّ** — أمرُ العمل أوّلاً، ثمّ الحلقة، ثمّ المتابعة.
 *
 * وصفوفُ `listOpenOperations` متقاطعةُ الاستبعاد بحكم استعلامها (① أمرٌ حيّ ·
 * ② حلقةٌ حيّةٌ بلا أمرٍ حيّ · ③ متابعةٌ حيّةٌ لا يمثّلها أيٌّ منهما)، فهذا
 * الترتيبُ يُنتج مفتاحاً فريداً لكلّ صفّ.
 */
export function openOperationKey(op: OpenOperationLike): string {
  if (op.workOrderId !== null && op.workOrderId !== undefined) return `wo:${op.workOrderId}`;
  if (op.episodeId !== null && op.episodeId !== undefined) return `ep:${op.episodeId}`;
  if (op.followupId !== null && op.followupId !== undefined) return `fu:${op.followupId}`;
  return "unknown";
}

/** فرعُ العملية الآن — فرعُ أمرها، وإلّا فرعُ حلقتها. */
export function currentOperationBranchId(op: OpenOperationLike): number | null {
  if (op.workOrderId !== null && op.workOrderBranchId !== null) return op.workOrderBranchId;
  return op.episodeBranchId ?? null;
}

/** **الفرعُ الذي يجب أن يكون الخبيرُ صالحاً له** بحسب قرار النقل. */
export function expertTargetBranchId(
  op: OpenOperationLike, move: boolean, grantedBranchId: number,
): number | null {
  return move ? grantedBranchId : currentOperationBranchId(op);
}

/** أتقبل هذه العمليةُ قرارَ خبيرٍ أصلاً؟ — لا خبيرَ بلا أمرِ عمل. */
export function operationHasExpertChoice(op: OpenOperationLike): boolean {
  return op.workOrderId !== null && op.workOrderId !== undefined;
}

const isPositiveInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v > 0;

/**
 * **يحسم قراراتِ كلّ العمليات المفتوحة، أو يردّ بسببٍ يُقرأ.**
 *
 * ولا يُقرأ غيابُ قرارٍ «لا» بصمت: إسقاطُ مسؤوليةٍ بالسكوت ليس قراراً
 * (نفسُ مبدأ `OPERATION_ANSWER_REQUIRED` القائم).
 */
export function resolveOperationDecisions<T extends OpenOperationLike>(params: {
  open: T[];
  decisions: OperationDecisionInput[];
  grantedBranchId: number;
}): DecisionResolution<T> {
  const { open, decisions, grantedBranchId } = params;
  if (open.length === 0) return { ok: true, plans: [] };

  const byKey = new Map<string, T>();
  for (const op of open) byKey.set(openOperationKey(op), op);

  const seen = new Set<string>();
  const plans: ResolvedOperationPlan<T>[] = [];

  for (const d of decisions) {
    const key = typeof d?.key === "string" ? d.key : "";
    if (!byKey.has(key)) {
      return { ok: false, error: `قرارٌ لعمليةٍ غير موجودة (${key || "بلا معرّف"}) — حدّث الصفحة` };
    }
    if (seen.has(key)) {
      return { ok: false, error: "تكرّر قرارٌ لنفس العملية — حدّث الصفحة" };
    }
    seen.add(key);

    if (typeof d.move !== "boolean") {
      return { ok: false, error: "أجب لكل عملية: تبقى في فرعها أم تنتقل" };
    }
    const op = byKey.get(key)!;
    const hasExpert = operationHasExpertChoice(op);

    let newExpertUserId: number | null = null;
    let validateExpertUserId: number | null = null;
    //  **يُقرأ مجهولَ النوع عمداً**: يصل من جسم طلبٍ لا من داخل البرنامج،
    //  فالسلسلةُ الفارغة وغيرُها تُفحَص ولا تُفترَض مستحيلةً بحكم النوع.
    const rawExpert = d.expert as unknown;
    if (hasExpert) {
      if (rawExpert === undefined || rawExpert === null || rawExpert === "") {
        return { ok: false, error: "اختر لكل عملية: إبقاء الخبير الحالي أو خبيراً آخر" };
      }
      if (rawExpert !== "keep") {
        if (!isPositiveInt(rawExpert)) return { ok: false, error: "خبير غير صالح" };
        //  **واختيارُ الخبير الحاليّ نفسِه ليس تغييراً** — فلا سطرَ تحويلٍ
        //  يقول «من فلان إلى فلان» ولا تعارضٌ يُختلَق.
        //  يُتحقَّق منه دائماً، ويُحوَّل فقط إن اختلف عن الحاليّ — فلا سطرُ
        //  «من فلان إلى فلان» لتحويلٍ لم يقع، ولا تحقّقٌ يُتخطّى بالتسمية.
        validateExpertUserId = rawExpert;
        newExpertUserId = rawExpert === op.expertUserId ? null : rawExpert;
      }
    } else if (rawExpert !== undefined && rawExpert !== null
               && rawExpert !== "" && rawExpert !== "keep") {
      //  ولا يُتجاهَل بصمت: عمليةٌ بلا أمرِ عملٍ لا خبيرَ لها تُسنِده.
      return { ok: false, error: "هذه العملية بلا أمر عمل — لا خبير لها" };
    }

    plans.push({
      key, op, move: d.move,
      targetBranchId: expertTargetBranchId(op, d.move, grantedBranchId),
      newExpertUserId, validateExpertUserId,
    });
  }

  const missing = Array.from(byKey.keys()).filter((k) => !seen.has(k));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `بقيت ${missing.length} عملية بلا قرار — أجب عن كل عملية على حدة`,
    };
  }
  return { ok: true, plans };
}

/**
 * **الصيغةُ المختصرة القديمة** — قرارٌ واحد لكلّ العمليات.
 *
 * تبقى مقبولةً بحرفها (عميلٌ قائم · اختبارٌ قائم · نداءٌ داخليّ)، وتُترجَم
 * إلى قراراتٍ لكلّ عملية فيمرّ الجميعُ بالمسار الواحد — **ولا فرعَ تنفيذٍ
 * ثانٍ في المخزن**.
 */
export function legacyDecisionsFor(
  open: OpenOperationLike[],
  legacy: { move: boolean; keepExpert?: boolean; newExpertUserId?: number | null },
): OperationDecisionInput[] {
  return open.map((op) => {
    const key = openOperationKey(op);
    if (!legacy.move) return { key, move: false, expert: "keep" as ExpertChoice };
    if (!operationHasExpertChoice(op)) return { key, move: true };
    //  **ولا يُخترَع «إبقاء» من السكوت**: «نعم» بلا قرارِ خبيرٍ كانت تُردّ
    //  ٤٠٠ قبل قرارات العمليات، وتبقى تُردّ — فالغيابُ يُمرَّر كما هو
    //  ليردّه الحاكمُ نفسُه.
    if (legacy.keepExpert === true) return { key, move: true, expert: "keep" };
    if (legacy.newExpertUserId === null || legacy.newExpertUserId === undefined) {
      return { key, move: true };
    }
    return { key, move: true, expert: Number(legacy.newExpertUserId) };
  });
}

/** بوّابةُ حفظ الشاشة — نفسُ الحاكم الذي يفحصه الخادم، لا شرطٌ ثانٍ. */
export function decisionsReady(
  open: OpenOperationLike[], decisions: OperationDecisionInput[], grantedBranchId: number,
): boolean {
  return resolveOperationDecisions({ open, decisions, grantedBranchId }).ok;
}
