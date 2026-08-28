// اختيارُ جهاز الصيانة — منطقٌ خالص، بلا React ولا شبكة.
//
// ══ منقولٌ ومُكيَّفٌ من فرعٍ سابق (PR #254) لا مدموجٌ حرفياً ═══════════════
// ذاك الفرعُ لم يُدمَج (نظامُ التسعير والمراجعة الذي بناه فوق هذا الاختيارَ
// تجاوزَته المرحلةُ الثالثة)، لكنّ فكرتَيه في اختيار الجهاز صحيحتان وتُنقَلان
// هنا: (١) كشفُ حالة الاستعلام **كاملةً** بدل الاكتفاء بقائمةٍ فارغة، و(٢)
// نيّةٌ صريحة — مسجَّلٌ بعينه أو إقرارٌ صريح بعدم التسجيل — لا افتراضٌ من
// الصمت.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// كان `useDeviceEpisodes` يُرجع `options: []` في ثلاث حالاتٍ مختلفة: يُحمَّل
// الآن، فشل الطلب، أو **لا توجد فعلاً**. فلو بُني عليها زرُّ حفظٍ مباشرةً —
// «فارغةٌ ⟹ جهازٌ غير مسجَّل تلقائياً» — لكان تعطُّلُ الشبكة أو استجابةٌ لم
// تصل بعد يُسجِّل صيانةً على جهازٍ «غير مسجَّل» وهو مسجَّلٌ فعلاً، بصمتٍ
// تامّ.
//
// ══ فصار العرضُ أربعَ حالاتٍ صريحة ═══════════════════════════════════════
// `loading` (تحميلٌ أو استعلامٌ لم يُطلَب بعد) · `error` (فشل، مع إعادة) ·
// `choose` (حلقاتٌ مسلَّمةٌ موجودة، يختار الموظّفُ صراحةً بينها وبين «غير
// مسجَّل») · `none` (نجاحٌ **مستقرّ** بصفرٍ فعليّ — الوحيدةُ التي تُفعِّل
// «غير مسجَّل» تلقائياً بلا سؤال). **ولا مسارَ آخر يصل «none»**: تحميلٌ أو
// فشلٌ أو حالةٌ لم تستقرّ بعد تبقى `loading`/`error` — لا تُقرأ دليلاً على
// الصفر.
//
// ══ تصحيحٌ لاحق — الاستقرارُ يعني `isFetching === false` أيضاً ═══════════
// كان `isSuccess` وحدها تحسم `choose`/`none`، فإعادةُ جلبٍ خلفية
// (React Query تُبقي `isSuccess: true` مع البيانات المخزَّنة بينما
// `isFetching: true` تجري في الخلفية) كانت تُقرَأ نجاحاً مستقرّاً — فيبقى
// حقلُ الجهاز يعرض القائمةَ **القديمة المخزَّنة** ويُتيح الحفظَ فوقها، ولو
// كانت البياناتُ الحقيقية قيد التغيّر تلك اللحظة (جهازٌ سُلِّم للتوّ مثلاً).
// فصار الشرطُ `isSuccess && !isFetching`: أيّ إعادة جلبٍ — خلفيةً كانت أو
// أوّلية — تبقى `loading`، تمنع الحفظَ، ولا تُقرَأ «صفراً» ولا «مختاراً
// نهائياً» حتى تستقرّ.

export const UNREGISTERED_DEVICE = "__unregistered__";

export type MaintenanceDevicePhase = "loading" | "error" | "choose" | "none";

export interface DeviceQueryState {
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  hasOptions: boolean;
}

/**
 * **المرحلةُ الوحيدة الصادقة لعرض حقل الجهاز.**
 *
 * `isError` تُفحَص أوّلاً وتُقرأ مستقلّةً — رسالةٌ وزرُّ إعادةٍ، لا دورانٌ
 * لا ينتهي. `isSuccess && !isFetching` وحدهما يحسمان `choose`/`none` —
 * **نجاحٌ مستقرّ**، لا نجاحٌ فحسب: إعادةُ جلبٍ خلفية تُبقي `isSuccess: true`
 * مع بياناتٍ قد تكون شاخت تلك اللحظة، فتبقى `loading` حتى تستقرّ. وكلُّ ما
 * دون ذلك (تحميلٌ، إعادةُ جلبٍ — خلفيةً أو أوّلية، أو استعلامٌ لم يُفعَّل بعد
 * لأن المريضَ أو الخدمةَ لم يُعرَفا بعد) يبقى `loading` — **آمنٌ دائماً**:
 * يمنع الحفظَ ولا يُخترَع منه غياب، ولا يُقرَأ اختيارٌ سابقٌ مخزَّنٌ سلطةً
 * حاليّة.
 */
export function devicePhaseOf(q: DeviceQueryState): MaintenanceDevicePhase {
  if (q.isError) return "error";
  if (q.isSuccess && !q.isFetching) return q.hasOptions ? "choose" : "none";
  return "loading";
}

/** هل يمنع حقلُ الجهاز الحفظَ الآن؟ */
export function maintenanceDeviceBlocksSave(params: {
  phase: MaintenanceDevicePhase;
  selection: string;
}): boolean {
  if (params.phase === "loading" || params.phase === "error") return true;
  if (params.phase === "choose") return !params.selection;
  return false; //  "none" — تلقائيّ، لا يُسأل الموظّف عن شيءٍ غير موجود.
}

export interface MaintenanceDeviceTarget {
  deviceEpisodeId: number | null;
  legacyUnrecordedDevice: boolean;
}

/**
 * يحوّل اختيارَ الشاشة (قيمةُ عنصر الاختيار، أو غيابَه حين `none`) إلى
 * النيّة الصريحة التي يفهمها الخادم — نفسُ الشكل الذي يتحقّق منه
 * `shared/maintenance.ts: parseMaintenanceDeviceTarget` مرّةً أخيرة هناك.
 *
 * `null` تعني «لا يُرسَل شيء بعد» — الزرُّ يبقى معطَّلاً (انظر
 * `maintenanceDeviceBlocksSave`)، فهذه الحالةُ لا تصل الشبكةَ أبداً عملياً.
 */
export function resolveMaintenanceDeviceTarget(params: {
  phase: MaintenanceDevicePhase;
  selection: string;
}): MaintenanceDeviceTarget | null {
  if (params.phase === "none") return { deviceEpisodeId: null, legacyUnrecordedDevice: true };
  if (params.phase !== "choose" || !params.selection) return null;
  if (params.selection === UNREGISTERED_DEVICE) {
    return { deviceEpisodeId: null, legacyUnrecordedDevice: true };
  }
  const id = Number(params.selection);
  return Number.isInteger(id) && id > 0
    ? { deviceEpisodeId: id, legacyUnrecordedDevice: false }
    : null;
}
