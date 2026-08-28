/**
 * **الصيانةُ المبسّطة** (المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨) — منطقٌ خالص، بلا
 * React ولا شبكة ولا قاعدة.
 *
 * ══ القاعدةُ الحاكمة ═════════════════════════════════════════════════════
 * جهازٌ ⟵ جزءٌ إن لزم ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ **حفظٌ واحد** يفتح أمر
 * العمل ويقيّد المبلغ النهائي معه في المعاملة نفسِها. **بلا اعتمادٍ لاحق،
 * بلا طبيبٍ، بلا مراجعةٍ إشرافية، بلا طابور** — ذاك بابُ بيع الجهاز
 * (`shared/commercial.ts`) لا هذا. الاستقبالُ والمحاسبُ ومديرُ الفرع
 * والمسؤولُ متكافئون تماماً هنا.
 *
 * ══ ولماذا ملفٌّ مستقلّ ══════════════════════════════════════════════════
 * الصيانةُ ليست بيعَ جهازٍ بعد معاينة: لا مسارَ معاينةٍ يحكمها، ولا خبيرَ
 * تقترحه ولا سعرَ يقترحه طبيب. فصلاحيتُها ودالّةُ حسم هويّة جهازها منطقٌ
 * خاصٌّ بها — لا امتداداً لـ`shared/commercial.ts` (بيعُ جهازٍ بعد معاينة)
 * ولا لـ`shared/pending_charge.ts` (طابورٌ موروثٌ يُنهيه إنسان).
 */

import { deriveOfferFromDiscount, type DiscountOffer } from "./commercial";

export const MAINTENANCE_SUCCESS_MESSAGE = "تم تسجيل الصيانة وفتح أمر العمل";

export interface MaintenanceSessionLike {
  role?: string | null;
  isAdmin?: boolean | null;
}

/**
 * **صلاحيةُ إتمام الصيانة المبسّطة** — دالّةٌ جديدة مخصَّصة، **لا امتداداً
 * لـ`canOperateNoExam`** (`shared/pending_charge.ts`).
 *
 * ══ ولماذا لا تلك ═══════════════════════════════════════════════════════
 * `canOperateNoExam` تعتمد `permissions.canAddPatients` — علمٌ عامّ قد
 * يحمله مَن ليس استقبالاً (مديرُ فرعٍ **طبيبٍ** مثلاً، أو حسابٌ خاصّ)، فتمنح
 * الصيانةَ ضمناً لمن لا ينبغي أن يملكها. وهذه صريحةٌ بدور: `reception` أو
 * `accountant` أو `branch_manager`، أو المسؤولُ العامّ بلا قيد — **والطبيبُ
 * ليس منها إطلاقاً**، ولو حمل `canAddPatients` أو `canWriteMedicalExam` أو
 * أيّ علمٍ آخر. سلطتُه الوحيدة هنا هي `isAdmin` إن كان هو المسؤولَ العامّ
 * فعلاً — لا دورٌ طبّيٌّ خاصّ، ولا هويّةٌ مكتوبةٌ في الكود.
 */
export function canCompleteMaintenance(
  s: MaintenanceSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  return s?.role === "reception" || s?.role === "accountant" || s?.role === "branch_manager";
}

// ── الجهاز — نيّةٌ صريحة، لا افتراض ────────────────────────────────────────

export interface MaintenanceDeviceTarget {
  ok: boolean;
  error?: string;
  deviceEpisodeId: number | null;
  legacyUnrecordedDevice: boolean;
}

/**
 * **إمّا جهازٌ مسجَّل بعينه، أو إقرارٌ صريح أنه غير مسجَّل — واحدٌ منهما لا
 * صفرٌ ولا اثنان.**
 *
 * ══ ولماذا لا صمتَ يُفسَّر ════════════════════════════════════════════════
 * كان الخادمُ (قبل هذه المرحلة) يقبل غيابَ الاثنين معاً فيحاول أن يخمّن —
 * جهازٌ وحيدٌ مؤهَّل يُختار تلقائياً، وتعدّدٌ يُردّ. وهذا يُبقي الشاشةَ تخمّن
 * أيضاً: عليها أن تعرف قبل الحفظ أهناك جهازٌ واحد أم لا حتى تقرّر أترسل
 * الحقل أم تصمت. **فصار القرارُ للموظّف دائماً**: يرى الخياراتِ (إن وُجدت)
 * أو يقرأ «لا أجهزة مسجَّلة» فيقرّ صراحةً، وما يصل الخادمَ نيّةٌ واحدةٌ
 * واضحة — لا صمتٌ يُفسَّر في أيّ طرف.
 *
 * **وهذا فحصُ شكلٍ فقط**: الانتماءُ للمريض والحالةُ (`delivered`) يُحسمان
 * تحت القفل داخل `resolveDeviceTargetTx` (`server/device_episodes/store.ts`)
 * — القانونيّة نفسِها التي يستعملها بيعُ الجهاز والصيانةُ كاملةُ الأجر،
 * فلا نسخةَ ثانية من حسم الهويّة.
 */
export function parseMaintenanceDeviceTarget(params: {
  deviceEpisodeId: unknown;
  legacyUnrecordedDevice: unknown;
}): MaintenanceDeviceTarget {
  const raw = params.deviceEpisodeId;
  const hasEpisode = raw !== null && raw !== undefined && raw !== "";
  const legacy = params.legacyUnrecordedDevice === true;
  const nil = { deviceEpisodeId: null, legacyUnrecordedDevice: false };
  if (hasEpisode && legacy) {
    return { ok: false, error: "طلبٌ متناقض: جهازٌ محدَّد و«جهاز غير مسجَّل» معاً", ...nil };
  }
  if (!hasEpisode && !legacy) {
    return {
      ok: false,
      error: "حدّد الجهاز المراد صيانته — أو أقرّ صراحةً أنه جهاز غير مسجَّل في النظام",
      ...nil,
    };
  }
  if (hasEpisode) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      return { ok: false, error: "معرّف جهاز غير صالح", ...nil };
    }
    return { ok: true, deviceEpisodeId: id, legacyUnrecordedDevice: false };
  }
  return { ok: true, deviceEpisodeId: null, legacyUnrecordedDevice: true };
}

// ── السعر — نفسُ اشتقاق المرحلة الثانية بحرفه ──────────────────────────────

/**
 * **بلا حسابٍ ثانٍ**: تُسلِّم مباشرةً لـ`deriveOfferFromDiscount`
 * (`shared/commercial.ts`، المرحلة الثانية) — نفسُ الثوابت الآمنة ونفسُ
 * تصنيف عاديّ/بخصم/مجّانيّ. **وهذا إعادةُ تصديرٍ لا نسخة**: أيّ تعديلٍ على
 * قواعد الاشتقاق يسري هنا تلقائياً بلا صيانة ملفَّين.
 */
export const deriveMaintenanceOffer = deriveOfferFromDiscount;
export type MaintenanceOffer = DiscountOffer;
