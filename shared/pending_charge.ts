/**
 * **المراجعةُ المالية لعملياتِ «بلا معاينة»** — منطقٌ خالص.
 *
 * ══ القاعدةُ الحاكمة ═══════════════════════════════════════════════════════
 * **العمليةُ تمضي. والمالُ لا يدخل المحاسبة حتى يعتمده طبيبٌ مخوَّل.**
 *
 * ترحيلُ ٠٦٥ فتح مسارَ «بلا معاينة» ثمّ أوقفه عند حدٍّ مؤقّت: الطلبُ يُفتَح
 * ويُوثَّق، ولا تخصيصَ ولا تصنيع. وهذه المرحلةُ تستبدل ذلك الحدَّ بالمسار
 * الحقيقيّ: الاستقبالُ يُنجز العملَ التشغيليّ (صيانةً أو بيعَ جزء)، ويبقى
 * **المبلغُ وحده** معلّقاً في صفٍّ مستقلّ لا يراه دفترٌ ولا تقرير — حتى
 * يعتمده طبيبٌ يملك اختصاصَ الجهاز ويصل فرعَ العملية.
 *
 * ══ وليست معاينةً طبية ═════════════════════════════════════════════════════
 * الطبيبُ هنا يراجع **مشروعيّةَ المبلغ**، لا يفحص المريض. فلا `medical_exams`
 * تُنشأ · ولا تشخيصَ يُوقَّع · ولا `service_path` يتغيّر · ولا تصير العمليةُ
 * عمليةَ مسارِ معاينة.
 *
 * ══ ولا خصم ═══════════════════════════════════════════════════════════════
 * `service_discount_requests` اعتمادُ **استثناءٍ** على سعرٍ قائم. وهذه
 * مراجعةُ **المبلغ نفسِه** مهما كان — كاملاً أو مخفَّضاً. فمفهومٌ واحد لا
 * اعتمادان، ولا صفَّ خصمٍ يُنشأ لهذا المسار.
 */

// ── حالاتٌ ثلاث، ولا آلةَ رفضٍ معقّدة ────────────────────────────────────

export const PENDING_CHARGE_STATUSES = [
  "pending_review", "returned", "approved",
] as const;
export type PendingChargeStatus = (typeof PENDING_CHARGE_STATUSES)[number];

export function isPendingChargeStatus(v: unknown): v is PendingChargeStatus {
  return typeof v === "string"
    && (PENDING_CHARGE_STATUSES as readonly string[]).includes(v);
}

export const PENDING_CHARGE_STATUS_LABELS: Record<PendingChargeStatus, string> = {
  pending_review: "بانتظار المراجعة",
  returned: "مُعادة للتصحيح",
  approved: "معتمدة",
};

/**
 * **وقرارُ الطبيب السلبيُّ إعادةٌ لا هدم.**
 *
 * العمليةُ وقعت فعلاً — صيانةٌ أُجريت أو جزءٌ بيع — فحذفُها كذبٌ على الواقع.
 * والمُعادُ يعود إلى استقبال **فرعه** بسببٍ مكتوب، فيُصحَّح **الصفُّ نفسُه**
 * ويُعاد إرسالُه. ولا صفَّ ثانٍ يُستنسَخ فيُحسَب البيعُ مرّتين.
 */
export const PENDING_CHARGE_ACTIONS = ["approve", "return"] as const;
export type PendingChargeAction = (typeof PENDING_CHARGE_ACTIONS)[number];

export const PENDING_CHARGE_ACTION_LABELS: Record<PendingChargeAction, string> = {
  approve: "اعتماد",
  return: "إعادة للتصحيح",
};

export const RETURN_REASON_LABEL = "سبب الإعادة";

// ── نوعُ العملية — اثنان لا أكثر في هذه المرحلة ──────────────────────────

/**
 * `device_sale` — بيعُ جزءِ طرفٍ صناعيّ أو مسندٍ طبيّ كامل.
 * `maintenance` — صيانةٌ أو إصلاح، ولو كان الجهازُ مصنوعاً خارج المركز.
 *
 * **ولا نوعَ ثالثٌ يُخترَع**: ما لا يمثّله التصنيفُ القائم بصدق لا يُمرَّر
 * عبر نوعٍ عامّ يُفرغه من معناه.
 */
export const PENDING_CHARGE_KINDS = ["device_sale", "maintenance"] as const;
export type PendingChargeKind = (typeof PENDING_CHARGE_KINDS)[number];

export function isPendingChargeKind(v: unknown): v is PendingChargeKind {
  return typeof v === "string"
    && (PENDING_CHARGE_KINDS as readonly string[]).includes(v);
}

export const PENDING_CHARGE_KIND_LABELS: Record<PendingChargeKind, string> = {
  device_sale: "بيع",
  maintenance: "صيانة",
};

// ── عناوينُ الشاشات — في مكانٍ واحد ──────────────────────────────────────

/** طابورُ الطبيب — **لا يخلط بمعايناته ولا بمراجعته الإشرافية**. */
export const REVIEW_QUEUE_TITLE = "مراجعة مبيعات وخدمات بلا معاينة";
export const RETURNED_QUEUE_TITLE = "مُعادة للتصحيح";

export const SAVED_PENDING_MESSAGE = "تم تسجيل العملية — بانتظار اعتماد المبلغ";
export const SAVED_NO_CHARGE_MESSAGE = "تم تسجيل العملية";

// ── ثوابتُ المبلغ ────────────────────────────────────────────────────────

export interface PendingAmount {
  ok: boolean;
  error?: string;
  /** `null` = **لا مبلغ** — عمليةٌ بلا أجر، فلا صفَّ معلّقاً ولا اعتماد. */
  amount: number | null;
}

/**
 * **الصفرُ لا يُخلَط بـ«لم يُدخَل بعد»** — وهذا الالتباسُ نفسُه أُصلح في
 * المرحلة الثانية، ولا يُعاد فتحُه هنا.
 *
 * فالمبلغُ إمّا **غائبٌ صراحةً** (`charged = false`) فالعمليةُ بلا أجر ولا
 * مراجعةَ لها، وإمّا **حاضرٌ موجب**. ولا اعتمادَ مسرحيٌّ لصفر.
 */
export function parsePendingAmount(params: {
  charged: unknown; amount: unknown;
}): PendingAmount {
  if (params.charged !== true) return { ok: true, amount: null };
  const n = Number(params.amount);
  if (!Number.isInteger(n)) {
    return { ok: false, amount: null, error: "المبلغ يجب أن يكون بالدينار الصحيح" };
  }
  if (n <= 0) {
    return {
      ok: false, amount: null,
      error: "المبلغ يجب أن يكون أكبر من صفر — والعملية بلا أجر تُحفَظ بلا مبلغ",
    };
  }
  return { ok: true, amount: n };
}

// ── الصلاحيات ────────────────────────────────────────────────────────────

export interface ChargeSessionLike {
  userId?: number | null;
  role?: string | null;
  isAdmin?: boolean | null;
  permissions?: Record<string, any> | null;
}

/**
 * **مَن يُنشئ العمليةَ ويصحّحها** — الاستقبالُ ومديرُ الفرع والمسؤول.
 *
 * ولا صلاحيةَ طبيةٍ تُمنَح بذلك: اختيارُ مسار «بلا معاينة» توجيهٌ تشغيليّ لا
 * قرارٌ سريريّ (ترحيل ٠٦٥)، وهذه المرحلةُ لا توسّعه بحرف.
 */
export function canOperateNoExam(s: ChargeSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  //  **البوّابةُ نفسُها التي تفتح «بدء جهاز» و«خدمة جديدة» حرفاً بحرف** —
  //  `canAddPatients` هو ما يعنيه «استقبال» في هذا النظام، ولا بوّابةَ
  //  ثانية تنحرف عن الأولى يوماً.
  return s?.role === "branch_manager" || s?.permissions?.canAddPatients === true;
}

/**
 * **والتصحيحُ للفرع لا للموظّف**: مَن أنشأ الصفَّ قد يكون غائباً، وزميلُه في
 * الفرع نفسِه يصحّحه. وقفلُ التصحيح على مُنشئه كان يجعل مريضاً ينتظر دوامَ
 * موظّفةٍ بعينها.
 */
export const canCorrectReturned = canOperateNoExam;

/**
 * **مَن يراجع المبلغ** — طبيبٌ يملك اختصاصَ الجهاز ويصل فرعَ العملية.
 *
 * ولا «طبيبٌ مسؤولٌ عن المريض» يُخترَع: علاقةٌ دائمةٌ هشّة تُعطّل المريضَ
 * كلّما غاب صاحبُها. فالأهليّةُ **اختصاصٌ × فرع** — النمطُ نفسُه الذي تعمل
 * به قوائمُ المعاينة والمراجعة، ويُحسَم في الخادم لا يُرسله الاستقبال.
 *
 * وهذه الدالّةُ تفحص **الشكل** وحده؛ والاختصاصُ يُقرأ من القاعدة عند كلّ
 * طلب (`doctorSpecialties`) والفرعُ من صفّ العملية.
 */
export function mayReviewShape(s: ChargeSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

// ── قواعدُ التحرير ───────────────────────────────────────────────────────

/**
 * **بانتظار المراجعة = مقروءٌ لا يُعدَّل · مُعادة للتصحيح = يُعدَّل.**
 *
 * وهذا يُغلق السباقَ الذي لا يُصلَح بعد وقوعه: طبيبٌ يعتمد مبلغَ «أ» بينما
 * يغيّره الاستقبالُ إلى «ب» فيُقيَّد ما لم يُراجَع. فمَن أراد التغييرَ بعد
 * الإرسال ينتظر إعادةَ الطبيب — وهي ضغطةٌ واحدة عنده.
 */
export function isEditableByReception(status: unknown): boolean {
  return status === "returned";
}

/** المعتمدةُ نهائيّة: تصحيحُها بابُه أنظمةُ التصحيح القائمة لا هذا الباب. */
export function isTerminalCharge(status: unknown): boolean {
  return status === "approved";
}
