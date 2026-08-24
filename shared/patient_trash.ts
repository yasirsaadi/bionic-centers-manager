/**
 * **سلّةُ المرضى واستعادتُهم خلال ثلاثين يوماً** — منطقٌ خالص.
 *
 * ══ القاعدةُ الحاكمة ═══════════════════════════════════════════════════
 * **الحذفُ العاديّ لم يعد يهدم شيئاً.** الملفُّ يخرج من النظام الفعّال —
 * قوائمَ وبحثاً وطوابيرَ ومحاسبةً — **وصفوفُه كلُّها تبقى كما هي بايتاً**:
 * المعايناتُ بأختامها · أوامرُ التصنيع بسجلّها · الدفعاتُ وقيودُ الكلف ·
 * الفواتيرُ والأقساط · المبالغُ المعلَّقة · جهاتُ الاتصال.
 *
 * والاستعادةُ **لا تُعيد بناء شيء**: تُزيل حالةَ الحذف عن صفّ المريض، فتعود
 * الصفوفُ نفسُها بمعرّفاتها ومبالغها. لا نسخَ ولا استنساخَ ولا رمزَ جديد.
 *
 * ══ ولماذا لا يُمحى شيءٌ في اليوم الثلاثين ═══════════════════════════════
 * محوٌ آليٌّ لسجلٍّ طبيٍّ وماليّ لا رجعةَ فيه، ويقع بلا أن يقرّره إنسان.
 * فبعد انقضاء المدّة **تسقط الاستعادةُ وحدها**، ويبقى «الحذف النهائيّ»
 * قراراً صريحاً للمسؤول العام بسببٍ مكتوب.
 */

// ── المدّة ───────────────────────────────────────────────────────────────

/** ثلاثون يوماً — **تُحسَب في الخادم من ختم الحذف**، لا من ساعة المتصفّح. */
export const RESTORE_WINDOW_DAYS = 30;

// ── العناوين ─────────────────────────────────────────────────────────────

export const TRASH_TITLE = "المحذوفات";
export const DELETE_REASON_LABEL = "سبب الحذف";
export const RESTORE_LABEL = "استعادة";
export const PURGE_LABEL = "حذف نهائي";
export const PURGE_REASON_LABEL = "سبب الحذف النهائي";

export const RESTORE_EXPIRED_MESSAGE = "انتهت مدة استعادة هذا المريض";

/**
 * **رسالةُ الالتزام الماليّ القائم** — تُقال لمن لا يملك سلطةَ حذفه.
 *
 * ولا تُقال «غير مصرح» عارية: الموظّفُ يستحقّ أن يعرف **لماذا** ومَن يملك.
 */
export const GLOBAL_ADMIN_REQUIRED_MESSAGE =
  "هذه الحالة تحتاج حذفاً من المسؤول العام لوجود التزام مالي قائم";

/**
 * **ما يُقال لمن حاول أن يعمل على ملفٍّ في السلّة** — بابُه الاستعادةُ لا
 * الالتفاف. ولا يُقال «غير موجود»: الملفُّ موجودٌ وصفوفُه كلُّها قائمة،
 * وإنكارُ وجوده يرسل الموظّفَ يبحث عن خطأٍ ليس هناك.
 */
export const PATIENT_IN_TRASH_ERROR = "هذا الملف في المحذوفات — استعده أولاً";

/**
 * **ما يُقال لمن لا يملك رؤيةَ السلّة** عند تكرارِ تسجيل.
 *
 * يكفي لمنع ملفٍّ ثانٍ، **ولا يكشف بياناتِ المحذوف** لمن لا يملك الاطّلاع.
 */
export const IN_TRASH_HINT = "المريض موجود في المحذوفات";

/**
 * **وما يُقال لمن لا يملكها** — نتيجةٌ محكومة بلا كشفِ بيان.
 *
 * الموظّفُ يحتاج أن يعرف أن ملفّاً ثانياً **لا يُفتَح الآن**، ولا يحتاج أن
 * يعرف أنه في السلّة ولا اسمَ صاحبه ولا رقمَه ولا فرعه. فيُقال له ما يكفي
 * ليتوقّف ويسأل، **ولا يُقال أكثر**.
 */
export const IN_TRASH_ESCALATION = "يوجد ملف مطابق يحتاج مراجعة الإدارة قبل التسجيل";

// ── الصلاحية — قرارُ منتجٍ صريح ──────────────────────────────────────────

export interface TrashSessionLike {
  userId?: number | null;
  role?: string | null;
  isAdmin?: boolean | null;
  permissions?: Record<string, any> | null;
}

/**
 * **مَن يحذف ويستعيد**: المسؤولُ العام · مديرُ الفرع · **الطبيب**.
 *
 * ولا استقبالَ ولا محاسبَ ولا خبيرَ ولا معالجَ ولا مسّاح — الملفُّ كلُّه
 * يخرج من النظام بضغطة، وذاك قرارُ إدارةِ ملفّ لا قرارُ إدخالِ بيانات.
 *
 * **ولا تُفتَح بـ`canWriteMedicalExam`**: تلك صلاحيةُ كتابةِ سجلٍّ سريريّ،
 * ومنحُها لمديرِ فرعٍ طبيبٍ لا يعني منحَه إدارةَ الملفّات. **والدورُ
 * الأساسيُّ `doctor` هو المعتمَد** — قرارُ مالكٍ صريح.
 *
 * **ولا يُشترَط أن يملك الطبيبُ معاينةَ المريض ولا اختصاصَه**: هذه سلطةُ
 * إدارةِ ملفّ منحتها السياسة، لا قرارٌ سريريّ يُقاس بالاختصاص.
 */
export function canTrashPatients(s: TrashSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  return s?.role === "branch_manager" || s?.role === "doctor";
}

/** والاستعادةُ لمن يحذف — الطرفُ نفسُه لا طرفٌ ثانٍ يُخترَع. */
export const canRestorePatients = canTrashPatients;

/**
 * **والحذفُ النهائيُّ للمسؤول العام وحده** — لا مديرَ فرعٍ ولا طبيب.
 *
 * فهو الفعلُ الوحيدُ في هذا المسار الذي لا رجعةَ فيه.
 */
export function canPurgePatients(s: TrashSessionLike | null | undefined): boolean {
  return s?.isAdmin === true;
}

// ── لقطةُ الحال المالي عند الحذف ─────────────────────────────────────────

/**
 * **لقطةٌ للتدقيق والعرض — لا مصدرَ حقيقةٍ ثانٍ للمال.**
 *
 * المالُ نفسُه يبقى في `payments` و`cost_entries` و`patients.total_cost`
 * كما هو. وهذه تجيب سؤالاً واحداً بعد شهور: **بماذا كان الملفُّ يوم حُذف؟**
 * — فيُقرأ قرارُ الحذف في سياقه بدل أن يُعاد حسابُه من صفوفٍ تغيّرت.
 */
export interface TrashFinancialSnapshot {
  /** `patients.total_cost` لحظةَ الحذف. */
  totalCost: number;
  /** مجموعُ دفعات المريض لحظتَها. */
  totalPaid: number;
  /** **الرصيدُ المعتمَد** = الكلفة − المدفوع (بإشارته). */
  remaining: number;
  /** مبالغُ «بلا معاينة» المعلّقةُ أو المُعادة (ترحيل ٠٦٧). */
  pendingCharges: number;
  /** طلباتُ الخصم المعلّقة (ترحيل ٠٥٨). */
  pendingDiscounts: number;
  /** طلباتُ تغيير السعر المعلّقة (ترحيل ٠٥٣). */
  pendingPriceRequests: number;
  /** متابعاتُ ما بعد المعاينة الحيّة بقرارٍ ماليٍّ لم يُحسَم. */
  openFollowups: number;
  /** تصحيحاتٌ إدارية تركت رصيداً للمريض لم يُسوَّ بعد (ترحيل ٠٦٤). */
  openSettlements: number;
}

export const EMPTY_SNAPSHOT: TrashFinancialSnapshot = {
  totalCost: 0, totalPaid: 0, remaining: 0,
  pendingCharges: 0, pendingDiscounts: 0,
  pendingPriceRequests: 0, openFollowups: 0, openSettlements: 0,
};

/**
 * **متى يلزم المسؤولُ العام؟**
 *
 * ══ رصيدٌ غيرُ صفريّ ═══════════════════════════════════════════════════
 * دَيناً كان أو رصيداً للمريض. فكلاهما التزامٌ قائم، وإخراجُه من التقارير
 * قرارٌ ماليّ لا إداريّ. **والحسابُ هو الحسابُ القائم في النظام** — كلفةُ
 * المريض ناقصَ مدفوعه — لا صيغةٌ تُخترَع لهذه المرحلة.
 *
 * ══ وعملٌ ماليٌّ حيٌّ لم يُحسَم ══════════════════════════════════════════
 * مبلغٌ معلَّقٌ بانتظار طبيب · خصمٌ بانتظار اعتماد · طلبُ سعرٍ معلَّق ·
 * متابعةٌ حيّةٌ لم يُحسَم قرارُها · رصيدٌ لم يُسوَّ بعد تصحيحٍ إداريّ.
 * كلُّها تعني أن أحداً ما زال ينتظر قراراً
 * على مال هذا الملفّ، **فإخفاؤه بضغطةِ مديرٍ يُسقط قراراً معلّقاً بصمت**.
 *
 * **والمسؤولُ العام لا يُمنَع أبداً** — هو المخرجُ لا الحاجز.
 */
export function requiresGlobalAdmin(s: TrashFinancialSnapshot): boolean {
  return s.remaining !== 0
    || s.pendingCharges > 0
    || s.pendingDiscounts > 0
    || s.pendingPriceRequests > 0
    || s.openFollowups > 0
    || s.openSettlements > 0;
}

/** أسبابُ الاشتراط، بالعربية — فيُقرأ «لماذا» لا «لا يمكنك». */
export function globalAdminReasons(s: TrashFinancialSnapshot): string[] {
  const out: string[] = [];
  if (s.remaining > 0) out.push(`دَين قائم: ${s.remaining.toLocaleString("en-US")} د.ع`);
  if (s.remaining < 0) out.push(`رصيد للمريض: ${(-s.remaining).toLocaleString("en-US")} د.ع`);
  if (s.pendingCharges > 0) out.push(`مبالغ «بلا معاينة» بانتظار المراجعة: ${s.pendingCharges}`);
  if (s.pendingDiscounts > 0) out.push(`طلبات خصم معلّقة: ${s.pendingDiscounts}`);
  if (s.pendingPriceRequests > 0) out.push(`طلبات سعر معلّقة: ${s.pendingPriceRequests}`);
  if (s.openFollowups > 0) out.push(`متابعات بيع لم تُحسَم: ${s.openFollowups}`);
  if (s.openSettlements > 0) out.push(`تسويات مالية معلّقة بعد تصحيح إداري: ${s.openSettlements}`);
  return out;
}

// ── حسابُ المدّة ─────────────────────────────────────────────────────────

/**
 * **الأيامُ الباقية للاستعادة** — للعرض وحده.
 *
 * والقرارُ الحقيقيُّ في الخادم بمقارنةِ `NOW()` بـ`restore_until` داخل
 * المعاملة. **فساعةُ المتصفّح لا تُقرَّر بها استعادةٌ ولا يُمنَع بها ملفّ.**
 */
export function daysLeft(restoreUntil: string | null, now: Date): number | null {
  if (!restoreUntil) return null;
  const until = new Date(restoreUntil);
  if (Number.isNaN(until.getTime())) return null;
  const ms = until.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** أهذا الصفُّ قابلٌ للاستعادة **عرضاً**؟ والخادمُ يعيد الفحص. */
export function isRestorable(restoreUntil: string | null, now: Date): boolean {
  const d = daysLeft(restoreUntil, now);
  return d !== null && d > 0;
}

/** **والسببُ إلزاميّ** — حذفاً كان أو حذفاً نهائياً. */
export function parseReason(v: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return { ok: false, error: `${DELETE_REASON_LABEL} مطلوب` };
  return { ok: true, value: s };
}
