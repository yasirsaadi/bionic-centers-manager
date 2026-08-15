// مَن يرى المساعد الذكي وبأي أمثلة — منطقٌ خالص، بلا React ولا شبكة.
//
// ══ حدُّ هذا الملفّ ══════════════════════════════════════════════════════
// هذا **عرضٌ لا حراسة**. الخادم هو صاحب القرار: `buildAiAccess` هناك يقرّر
// وحده مَن تُبنى له لقطةٌ مالية، ولا يقرأ شيئاً من العميل. فما هنا يمنع
// عرضَ اقتراحٍ لا ينفع صاحبه، ولا يمنع شيئاً عن مهاجم — ولا يُفترض فيه ذلك.
//
// ══ ما تغيّر ═════════════════════════════════════════════════════════════
// كان الزرّ العائم مخفيّاً عن كلّ من لا يملك المحاسبة، لأن المساعد كان
// مالياً بالكامل. وبعد فصل الوضعين صار المساعد نافعاً لكلّ موظّف — يشرح
// المسارات والشاشات — فبقاء الإخفاء يحرم أكثر المستعملين من أنفع ما فيه.

export interface AiSessionLike {
  isAdmin?: boolean | null;
  permissions?: Record<string, any> | null;
}

/** نفس قاعدة الخادم حرفياً — للعرض وحده. */
export function sessionHasFinance(session: AiSessionLike | null | undefined): boolean {
  return session?.isAdmin === true || session?.permissions?.canManageAccounting === true;
}

/** يظهر الزرّ لكلّ موظّف مصادَق ما دامت الخدمة مفعّلة على الخادم. */
export function canOpenAssistant(
  session: AiSessionLike | null | undefined, aiEnabled: boolean | undefined,
): boolean {
  return Boolean(session) && aiEnabled === true;
}

/** أمثلةٌ عامّة: أسئلةُ الموظّف عن النظام نفسه، بلا مال. */
export const GENERAL_SUGGESTIONS = [
  "كيف أسجل مريضاً جديداً؟",
  "ما مراحل تصنيع الطرف؟",
  "كيف أفتح صيانة؟",
  "أين أجد المعاينات؟",
];

/** أمثلةٌ مالية — لا تُعرض إلّا لمن يستطيع الجواب عنها فعلاً. */
export const FINANCE_SUGGESTIONS = [
  "كم بلغت الإيرادات هذا الشهر؟",
  "ما أكبر بنود المصاريف؟",
  "من المرضى الذين عليهم ذمم متأخّرة؟",
  "ما رصيد القاصة اليوم؟",
];

/**
 * الأمثلة المعروضة.
 *
 * صاحب المحاسبة يرى الاثنين — عملُه يشمل النظام والمال معاً. وغيره يرى
 * العامّة وحدها، فسؤالٌ يُردّ باعتذارٍ ليس اقتراحاً بل إحباط.
 */
export function suggestionsFor(session: AiSessionLike | null | undefined): string[] {
  return sessionHasFinance(session)
    ? [...FINANCE_SUGGESTIONS, ...GENERAL_SUGGESTIONS]
    : GENERAL_SUGGESTIONS;
}

/** سطر التعريف داخل النافذة — يصف ما يستطيعه هذا المستخدم بالذات. */
export function introTextFor(session: AiSessionLike | null | undefined): string {
  return sessionHasFinance(session)
    ? "اسألني عن إيرادات الفرع، المصاريف، الفواتير غير المدفوعة، أو رصيد القاصة — أو عن مسارات النظام وشاشاته. البيانات المالية محصورة بنطاقك."
    : "اسألني عن مسارات النظام: تسجيل المرضى، المعاينات، مراحل التصنيع، الصيانة، والجلسات. لا أطّلع على البيانات المالية.";
}

/** وصف النطاق أسفل العنوان. */
export function scopeLabelFor(
  session: (AiSessionLike & { branchName?: string | null }) | null | undefined,
): string {
  if (!sessionHasFinance(session)) return "مساعد النظام";
  return session?.isAdmin === true ? "نطاق: كل الفروع" : `نطاق: ${session?.branchName ?? "فرعك"}`;
}
