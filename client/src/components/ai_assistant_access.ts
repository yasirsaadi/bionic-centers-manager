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
  role?: string | null;
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
  "ما مهامي الآن؟",
  "ما مراحل تصنيع الطرف؟",
  "كيف أفتح صيانة؟",
];

/** أمثلةٌ بحسب الدور — لا يُعرض ما سيردّه الخادم. */
export const DOCTOR_SUGGESTIONS = ["من المرضى الذين ينتظرون معاينتي؟"];
export const EXPERT_SUGGESTIONS = ["ما أوامر التصنيع المسندة إليّ؟"];
export const RECEPTION_SUGGESTIONS = ["من ينتظر معاينة أو تخصيص خبير؟"];
export const PHYSIO_SUGGESTIONS = ["من مرضى العلاج الطبيعي النشطون في فرعي؟"];

/** نفس أعلام النظام الحيّة — لا أدوارٌ مخترَعة. */
const isDoctor = (s?: AiSessionLike | null) =>
  s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
const worksAsExpert = (s?: AiSessionLike | null) =>
  s?.role === "prosthetics_expert" || s?.permissions?.canWorkAsExpert === true;
const isPureExpert = (s?: AiSessionLike | null) => s?.role === "prosthetics_expert";
const isReceptionish = (s?: AiSessionLike | null) =>
  s?.isAdmin === true || s?.role === "branch_manager" || s?.role === "reception"
  || s?.permissions?.canAddPatients === true;
//  **الصلاحية الحقيقية لا دورٌ مخترَع**: النظام ليس فيه «موظّف علاج طبيعي»،
//  وإنّما `canEnterSessions` — مَن يُدخل الجلسات. وهي نفس شرط الطابور في
//  الخادم، فلا يُعرَض اقتراحٌ يُردّ.
const entersSessions = (s?: AiSessionLike | null) =>
  s?.isAdmin === true || s?.role === "branch_manager"
  || s?.permissions?.canEnterSessions === true;

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
  const out: string[] = [];
  //  الأخصّ أوّلاً: ما يخصّ عمل هذا المستخدم بالذات يسبق العامّ.
  if (isDoctor(session)) out.push(...DOCTOR_SUGGESTIONS);
  if (worksAsExpert(session)) out.push(...EXPERT_SUGGESTIONS);
  if (isReceptionish(session)) out.push(...RECEPTION_SUGGESTIONS);
  if (entersSessions(session)) out.push(...PHYSIO_SUGGESTIONS);
  if (sessionHasFinance(session)) out.push(...FINANCE_SUGGESTIONS);
  //  الخبيرُ الصِرف لا يرى طوابير الفرع، فلا يُقترح عليه «ما مهامي» العامّ
  //  مرّتين — اقتراحُه الخاصّ يكفيه.
  out.push(...(isPureExpert(session) ? GENERAL_SUGGESTIONS.slice(1) : GENERAL_SUGGESTIONS));
  return out.filter((v, i) => out.indexOf(v) === i);
}

/** سطر التعريف داخل النافذة — يصف ما يستطيعه هذا المستخدم بالذات. */
export function introTextFor(session: AiSessionLike | null | undefined): string {
  const live = "أقرأ النظام مباشرةً ضمن صلاحياتك: اسألني «ما مهامي الآن؟» أو اكتب رمز مريض مثل WB-00001 لأعرض حالته.";
  return sessionHasFinance(session)
    ? `${live} ويمكنني أيضاً إيرادات الفرع والمصاريف والذمم ورصيد القاصة — محصورةً بنطاقك المالي.`
    : `${live} أمّا البيانات المالية فلا أطّلع عليها.`;
}

/** وصف النطاق أسفل العنوان. */
export function scopeLabelFor(
  session: (AiSessionLike & { branchName?: string | null }) | null | undefined,
): string {
  if (!sessionHasFinance(session)) return "مساعد النظام";
  return session?.isAdmin === true ? "نطاق: كل الفروع" : `نطاق: ${session?.branchName ?? "فرعك"}`;
}
