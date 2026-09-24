// **فرعُ المعاينة بلا جهاز — فرعٌ يصله الطبيبُ الموقِّع دائماً** (٢٠٢٦-٠٩-٢٤).
//
// ══ الواقعة (مراجعةٌ مستقلّة على الطلب ٤٠٩، مُعادةٌ حيّاً) ═════════════════
// نسب ٤٠٩ المعاينةَ العاريةَ لفرع مَن أرسل المريض (شكوى «زهراء») بشرطٍ واحد:
// أن يصل ذلك الفرعُ ملفَّ المريض — **ولم يسأل أيصله الطبيبُ الذي يوقّع**.
// فبغدادُ ترسل مريضةَ ذي قار، ويوقّع طبيبُ ذي قار، فتُكتب المعاينةُ في بغداد:
// ثمّ يُردّ طبيبُها نفسُه ٤٠٣ على تعديلها وعلى الملحق وعلى الإلغاء، ويُردّ
// مديرُ ذي قار على الإلغاء — **الطبيبُ يفقد معاينتَه**.
//
// **وليس ٤٠٩ وحده**: منذ إتاحة الملفّ (٠٨٠) يوقّع طبيبُ الفرع المُتاح على
// المريض، فتُنسَب معاينتُه العاريةُ لفرع الحالة (ذي قار) وهو لا يصله — العطبُ
// نفسُه بشكلٍ أقدم، مُعادٌ حيّاً كذلك.
//
// ══ القاعدة ══════════════════════════════════════════════════════════════
// المعاينةُ عملُ مَن وقّعها، **فتُكتب في فرعٍ يصله**. وبين فروعه المفاضلةُ
// القائمة نفسُها بترتيبها:
//   ١) فرعُ مَن أرسل المريض — إن وصل الملفَّ **ووصله الموقِّع** (قصدُ ٤٠٩)؛
//   ٢) فرعُ خيط الاختصاص؛
//   ٣) فرعُ التسجيل؛
//   ٤) فرعُ جلسة الموقِّع إن وصل الملفّ — «كلُّ مركزٍ يسجّل أحداثَه عنده»؛
//   ٥) أوّلُ فرعٍ من فروع الملفّ في نطاقه.
// **والمسؤولُ العام (`scope === null`) يصل كلَّ فرع**، فترتيبُه هو الترتيبُ
// القائم قبل هذا الإصلاح بحرفه: المُرسِلُ ثمّ الحالةُ ثمّ التسجيل.
//
// ══ لماذا دالّةٌ خالصة ═══════════════════════════════════════════════════
// المفاضلةُ قرارٌ يُختبَر دخلاً وخرجاً (درسُ ٤.u) — ونسبةٌ خاطئة هنا تُختَم
// بترِكر ٠٢٨ فلا تُصحَّح بعدها. والقراءةُ من القاعدة غلافٌ رقيقٌ حولها في
// نقطة التوقيع.

export function pickBareExamBranch(p: {
  /** نطاقُ الموقِّع — `null` = المسؤولُ العام (يصل كلَّ فرع). */
  scope: number[] | null;
  /** فروعُ ملفّ المريض: التسجيلُ وكلُّ فرعٍ أُتيح له. */
  fileBranchIds: number[];
  /** فرعُ طلب المراجعة الذي سيُغلقه هذا التوقيع — أو `null`. */
  referralBranchId: number | null;
  /** فرعُ خيط الاختصاص — أو `null` إن لم يُفتَح بعد. */
  caseBranchId: number | null;
  registrationBranchId: number | null;
  sessionBranchId: number | null;
}): number | null {
  const valid = (b: number | null | undefined): b is number =>
    typeof b === "number" && Number.isInteger(b) && b > 0;
  const inScope = (b: number | null | undefined): b is number =>
    valid(b) && (p.scope === null || p.scope.includes(b));
  const onFile = (b: number | null | undefined): b is number =>
    valid(b) && p.fileBranchIds.includes(b);

  if (onFile(p.referralBranchId) && inScope(p.referralBranchId)) return p.referralBranchId;
  if (inScope(p.caseBranchId)) return p.caseBranchId;
  if (inScope(p.registrationBranchId)) return p.registrationBranchId;
  if (onFile(p.sessionBranchId) && inScope(p.sessionBranchId)) return p.sessionBranchId;
  const firstReach = p.fileBranchIds.find((b) => inScope(b));
  if (firstReach !== undefined) return firstReach;
  //  لا فرعَ يصله الموقِّع — لا يقع: نقطةُ التوقيع ردّته قبل هذا
  //  (`scopeReachesPatient`). فيبقى الترتيبُ القائم ولا يُخترَع فرع.
  return valid(p.caseBranchId) ? p.caseBranchId
    : valid(p.registrationBranchId) ? p.registrationBranchId : null;
}
