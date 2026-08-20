// جسمُ نافذتَي «التأجيل» و«إعادة الفتح» — **بلا React**، فيُختبَر وحده.
//
// ══ العطبُ الذي يغلقه (لاحظه المالك على الإنتاج) ═══════════════════════
// نافذةُ إعادة الفتح كانت تُفتح وحقلُ الموعد **مملوءاً بأسبوعٍ من اليوم**.
// فالموظّفُ الذي أراد «إعادة فتح الملفّ» ولا شيء غير ذلك يضغط «حفظ» فيصير
// الملفُّ **«مؤجَّل — متابعة»** بموعدٍ لم يقرّره أحد، ويخرج من طابور
// «بانتظار قرار المريض» الذي يجب أن يعود إليه.
//
// **الموعدُ قرارٌ يُتَّخذ لا افتراضٌ يُملأ.** فارغٌ ⟶ يعود الملفّ بانتظار
// قرار المريض بلا موعد. مكتوبٌ ⟶ تأجيلٌ مقصود بذلك التاريخ.
//
// ══ وعطبٌ ثانٍ كان كامناً ═══════════════════════════════════════════════
// `new Date("").toISOString()` **ترمي `RangeError`**. فحقلُ تاريخٍ فُرِّغ
// بيد الموظّف كان يُسقط النافذة بلا رسالة. والتحويلُ هنا يحرس ذلك.

/** ISO من حقل `<input type="date">` — و**غيرُ الصالح يُقرأ «بلا موعد»**. */
export function dateInputToIso(v: unknown): string | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * جسمُ `POST /api/followups/:id/reopen`.
 *
 * **بلا تاريخ ⟶ `awaiting_patient_decision`** ولا `nextFollowUpAt` إطلاقاً.
 * وبتاريخٍ صريح ⟶ `follow_up` بذلك الموعد.
 */
export function reopenPayload(params: {
  nextDate?: string | null; note?: string | null;
}): {
  toStatus: "awaiting_patient_decision" | "follow_up";
  nextFollowUpAt?: string;
  note?: string;
} {
  const iso = dateInputToIso(params.nextDate);
  const note = typeof params.note === "string" && params.note.trim() ? params.note : undefined;
  //  ولا يُرسَل `noScheduledFollowUp` إطلاقاً: هو «قرارٌ صريح بلا موعد»
  //  داخل التأجيل، ولا معنى له في إعادة فتحٍ عادت بانتظار قرار المريض.
  if (!iso) return { toStatus: "awaiting_patient_decision", ...(note ? { note } : {}) };
  return { toStatus: "follow_up", nextFollowUpAt: iso, ...(note ? { note } : {}) };
}

/**
 * جسمُ `POST /api/followups/:id/defer` — **سلوكُه لم يتغيّر**.
 *
 * التأجيلُ فعلٌ يُقصَد بذاته، فموعدُه المقترَح في محلّه. والخادم يشترط
 * موعداً أو `noScheduledFollowUp` صريحاً، وهذا ما يُرسَل.
 */
export function deferPayload(params: {
  reason: string; nextDate?: string | null;
  noSchedule?: boolean; note?: string | null;
}): {
  reason: string; nextFollowUpAt?: string;
  noScheduledFollowUp: boolean; note?: string;
} {
  const noSchedule = params.noSchedule === true;
  const note = typeof params.note === "string" && params.note.trim() ? params.note : undefined;
  return {
    reason: params.reason,
    ...(noSchedule ? {} : (() => {
      const iso = dateInputToIso(params.nextDate);
      return iso ? { nextFollowUpAt: iso } : {};
    })()),
    noScheduledFollowUp: noSchedule,
    ...(note ? { note } : {}),
  };
}
