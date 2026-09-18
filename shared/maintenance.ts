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

import {
  computeCommercialOffer, deriveOfferFromDiscount, type DiscountOffer,
  parsePaidNowAmount, type PaidNowResult,
} from "./commercial";
import { componentLabel } from "./prosthetic_parts";

export const MAINTENANCE_SUCCESS_MESSAGE = "تم تسجيل الصيانة وفتح أمر العمل";

/**
 * **نجاحٌ آمنٌ لإعادة الإرسال** — الرمزُ نفسُه وصل مرّتين، فالعمليةُ مسجَّلةٌ
 * سلفاً ولم يُكتب شيءٌ في هذه المرّة: لا أمرَ ولا زيارةَ ولا قيدَ كلفةٍ ولا
 * دفعةَ ولا تدقيق. **ولا يُقال «فشل»** — العمليةُ التي طلبها الموظّفُ وقعت
 * فعلاً؛ الذي لم يقع تكرارُها.
 */
export const MAINTENANCE_DUPLICATE_MESSAGE =
  "هذه الصيانة مسجَّلة سابقاً — لم تُسجَّل مرّتين";

/**
 * **تذكرةُ الإرسال إلزاميةٌ على النقطة العامّة** (٢٠٢٦-٠٩-١٨) — وغيابُها
 * ليس خطأَ الموظّف بل عميلاً بائتاً في متصفّحه: نافذةُ الصيانة تسكّ التذكرةَ
 * عند كلّ فتح، فطلبٌ يصل بلا رمزٍ جاء من صفحةٍ سابقةٍ لهذه المرحلة.
 *
 * **ولذلك تقول الرسالةُ المخرجَ لا اللومَ**: حدّث الصفحة وأعد المحاولة.
 * و**صفرُ كتابة** — الردُّ يقع قبل أيّ قفلٍ أو أمرِ عملٍ أو دينار.
 */
export const MAINTENANCE_TOKEN_REQUIRED_MESSAGE =
  "انتهت صلاحية هذه الصفحة — حدّث الصفحة وأعد تسجيل الصيانة."
  + " لم تُسجَّل أيّ عملية ولم يُقيَّد أيّ مبلغ.";

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

/**
 * **«المبلغ المدفوع الآن» — إعادةُ تصديرٍ لا نسخة**، بنفس نمط
 * `deriveMaintenanceOffer` أعلاه. الشرحُ الكامل في `shared/commercial.ts`.
 */
export const parseMaintenancePaidNow = parsePaidNowAmount;
export type MaintenancePaidNowResult = PaidNowResult;

// ══ الضمانُ — حالةٌ مهيكلةٌ مستقلّة (ترحيل ٠٨٣) ════════════════════════════
//
// **«ضمن الضمان» ليست «مجّانيّة» بثوبٍ آخر.** كلتاهما تنتهي إلى أجرٍ صفر،
// لكنّ الأولى التزامٌ سبق أن قطعه المركز والثانية قرارُ منحٍ جديد. فلو
// دُلَّ عليهما بـ`priceKind = 'free'` وحدَه لصارتا صفّاً واحداً لا يُفرَّق
// بينه بعد اليوم — ولا تقريرَ ضمانٍ يُبنى ولا تكلفةَ التزامٍ تُعرَف.
//
// **ولا شرطَ أهليّةٍ محسوب**: لا مدّةَ ولا تاريخَ شراءٍ ولا عدَّ مرّاتٍ ولا
// نوعَ جهاز. **الموظّفُ هو مَن يقرّر**، وصيانةُ ضمانٍ سابقة لا تمنع لاحقة.

export const MAINTENANCE_WARRANTY_LABEL = "ضمن الضمان";

/** علمٌ يصل بغير بوليان = عميلٌ ملفَّق أو بائت — يُردّ ولا يُصحَّح بصمت. */
export const MAINTENANCE_WARRANTY_FLAG_ERROR =
  "قيمة «ضمن الضمان» يجب أن تكون نعم أو لا";

/**
 * **ولا خصمَ مع الضمان** — الأجرُ صفرٌ بقرار التزامٍ سابق، لا بخصمٍ يُمنَح.
 * وقبولُ الاثنين معاً يُنتج صفّاً يقول شيئين متناقضين عن السبب نفسِه.
 */
export const MAINTENANCE_WARRANTY_NO_DISCOUNT_ERROR =
  "صيانةُ الضمان بلا خصم — احذف مقدار الخصم، أو ألغِ «ضمن الضمان»";

export interface MaintenanceTerms extends MaintenanceOffer {
  /** **صريحٌ دائماً** — لا يُستنتَج من `kind === "free"` أبداً. */
  underWarranty: boolean;
}

const nilTerms: MaintenanceTerms = {
  ok: false, kind: null, originalPrice: null, finalPrice: null,
  discountAmount: null, underWarranty: false,
};

/** الغيابُ = «لا» (العلمُ اختياريٌّ في العقد)؛ وأيُّ شكلٍ آخر يُردّ. */
export function parseMaintenanceUnderWarranty(raw: unknown):
  { ok: true; value: boolean } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: false };
  if (typeof raw !== "boolean") return { ok: false, error: MAINTENANCE_WARRANTY_FLAG_ERROR };
  return { ok: true, value: raw };
}

/**
 * **الشروطُ الكاملة لصيانةٍ واحدة** — سعرٌ ونوعٌ وعلمُ ضمان، من مُدخَلاتٍ
 * ثلاثة لا أكثر.
 *
 * **بلا ضمان** ⟶ `deriveMaintenanceOffer` بحرفها: عاديّ/بخصم/مجّانيّ كما
 * كانت تماماً — **لا حرفَ يتغيّر في دلالة أيٍّ منها**.
 *
 * **وبالضمان** ⟶ الأصليُّ يُتحقَّق منه بنفس الدالّة (فالرسائلُ واحدةٌ لا
 * تتفرّع)، ثمّ `computeCommercialOffer` نفسُها تبني العرضَ النهائيّ — فلا
 * ثوابتَ آمنةٌ ثانية ولا حسابٌ منزليُّ الصنع. والنتيجةُ: **الأصليُّ محفوظٌ
 * كما أدخله الموظّف، والنهائيُّ صفر، والخصمُ صفرٌ صراحةً** (لم يُمنَح خصمٌ
 * قطّ — والفارقُ يفسّره علمُ الضمان لا خصمٌ ملفَّق).
 */
export function deriveMaintenanceTerms(params: {
  originalPrice: unknown; discountAmount: unknown; underWarranty?: unknown;
}): MaintenanceTerms {
  const flag = parseMaintenanceUnderWarranty(params.underWarranty);
  if (!flag.ok) return { ...nilTerms, error: flag.error };

  if (!flag.value) {
    return {
      ...deriveMaintenanceOffer({
        originalPrice: params.originalPrice, discountAmount: params.discountAmount,
      }),
      underWarranty: false,
    };
  }

  const d = params.discountAmount;
  const discountSent = d !== undefined && d !== null && d !== "" && Number(d) !== 0;
  if (discountSent) {
    return { ...nilTerms, underWarranty: true, error: MAINTENANCE_WARRANTY_NO_DISCOUNT_ERROR };
  }
  //  تحقّقُ الأصليّ برسائله المعتادة — «السعر الأصلي يجب أن يكون…».
  const base = deriveMaintenanceOffer({
    originalPrice: params.originalPrice, discountAmount: 0,
  });
  if (!base.ok) return { ...base, underWarranty: true };
  const offer = computeCommercialOffer({ kind: "free", originalPrice: base.originalPrice });
  if (!offer.ok) return { ...nilTerms, underWarranty: true, error: offer.error };
  return { ...offer, discountAmount: 0, underWarranty: true };
}

// ══ تنبيهُ الصيانة المشابهة — معلوماتيٌّ لا يمنع ══════════════════════════
//
// **يُسأل قبل الحفظ، ويُجاب بقراءةٍ فقط.** لا تذكرةَ إرسالٍ تُحجَز ولا
// تتغيّر، ولا صفَّ يُكتب — والمتابعةُ تمضي **بالتذكرة الحالية نفسِها**.
//
// ══ ولا قيدَ يعود ═══════════════════════════════════════════════════════
// ترحيلُ ٠٨٢ رفع «صيانةٌ مفتوحةٌ واحدة لكلّ جهاز» عن قصد: مريضٌ يكسر قالبَه
// مرّتين في أسبوع عملان حقيقيّان. **فهذا تنبيهٌ لا حارس** — يقول للموظّف ما
// قد لا يعرفه (زميلٌ في شفتٍ آخر فتح أمراً لنفس الجزء)، ثمّ يمضي إن أراد.
//
// ══ وما يُعَدّ «مشابهاً» — أربعةٌ لا أكثر ════════════════════════════════
//   المريضُ نفسُه · نوعُ الخدمة نفسُه · الجهازُ نفسُه بهويّته (أو **جهازٌ
//   قديمٌ غير مسجَّل** حين يكون الاختيارُ كذلك، فيُقابَل بما لا هويّةَ له
//   — **ولا تُخترَع هويّة**) · والجزءُ نفسُه في الأطراف.
//
// **ولا الخبيرُ ولا السعرُ ولا الخصمُ ولا المبلغُ المدفوعُ ولا الفرع**: هذه
// كلُّها تفاصيلُ العملية لا هويّةُ العمل. أمرُ صيانةِ الركبة نفسِها مفتوحٌ
// في فرعٍ آخر بخبيرٍ آخر وبسعرٍ آخر **هو بالضبط** ما يستحقّ التنبيه.

export interface SimilarMaintenanceOrder {
  workOrderId: number;
  /** ISO — قد يغيب في صفٍّ قديم، فلا يُخمَّن تاريخ. */
  createdAt: string | null;
  branchId: number | null;
  branchName: string | null;
  expertUserId: number | null;
  expertName: string | null;
  maintenanceComponent: string | null;
  deviceEpisodeId: number | null;
  status: string | null;
}

export const MAINTENANCE_SIMILAR_TITLE = "توجد صيانة مفتوحة مشابهة";
export const MAINTENANCE_SIMILAR_HINT =
  "هذا تنبيهٌ فقط ولا يمنع العملية — راجعه ثمّ قرّر.";
export const MAINTENANCE_SIMILAR_BACK = "رجوع";
export const MAINTENANCE_SIMILAR_CONTINUE = "متابعة وفتح أمر صيانة جديد";

/** اليومُ بالتقويم الميلادي كما يقرؤه الموظّف — بلا ساعةٍ ولا منطقةٍ زمنية. */
function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    + `-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * **سطرٌ واحد يُقرأ بالمرور**: رقمُ أمر العمل والتاريخُ والخبيرُ والفرع —
 * **وما غاب منها يُحذَف ولا يُقال «—»**، فسطرُ تنبيهٍ نصفُه شرطاتٌ لا يُقرأ.
 */
export function describeSimilarMaintenance(row: SimilarMaintenanceOrder): string {
  const part = componentLabel(row.maintenanceComponent);
  return [
    `أمر العمل #${row.workOrderId}`,
    part ? `الجزء: ${part}` : null,
    shortDate(row.createdAt),
    row.expertName ? `الخبير: ${row.expertName}` : null,
    row.branchName ? `الفرع: ${row.branchName}` : null,
  ].filter(Boolean).join(" · ");
}

/**
 * **متى تُعرَض النافذة** — صفوفٌ مشابهة **ولم يقرّر الموظّفُ بعد**.
 *
 * والقرارُ خالصٌ خارج المكوّن عمداً: المشروعُ بلا مشغّل DOM، فقرارٌ يعيش في
 * `useState` لا يُختبَر إلّا بقراءة نصِّه — وقراءةُ النصّ لا تُمسك انقلاباً
 * في المعنى يعود بصياغةٍ أخرى (درسُ ٤.u بحرفه).
 */
export function shouldPromptSimilarMaintenance(p: {
  rows: SimilarMaintenanceOrder[] | null | undefined;
  acknowledged: boolean;
}): boolean {
  return !p.acknowledged && Array.isArray(p.rows) && p.rows.length > 0;
}
