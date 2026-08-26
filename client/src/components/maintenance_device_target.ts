// **هويّةُ جهاز الصيانة — منطقٌ خالص لا يُخمَّن من حالة استعلامٍ ناقصة.**
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// `useDeviceEpisodes` كانت تُرجع `data?.episodes ?? []`. فحالاتُ التحميلِ
// الأوّل، وإعادةِ الجلب بلا بياناتٍ سابقة، والفشل — كلُّها تبدو **صفرَ
// أجهزة** لمن يقرأ `devices.length`. ونافذةُ الصيانة كانت تقرأ الصفرَ
// فتُخفي مُنتقي الجهاز وتسمح بحفظ صيانةٍ «غير مسجَّلة» — فيصير «لم نعرف
// بعد» و«لا يوجد جهازٌ فعلاً» الشيءَ نفسَه في عين الشاشة، رغم أنهما
// مختلفان تماماً: الأوّل يستحقّ الانتظار أو رسالةَ خطأ، والثاني وحده
// يستحقّ القرار. وهذا خرقٌ مباشر لقاعدة «لا تخمين — هويّةُ جهازٍ دقيقة».
//
// ══ فالقرارُ لا يُبنى إلّا على استعلامٍ ناجحٍ **وساكن** فعلاً ═══════════════
// `resolved` = وصل ردٌّ ناجح (`isSuccess`) **ولا نداءَ شبكةٍ قائماً الآن**
// (`!isFetching`). فبياناتٌ ناجحةٌ سابقاً لكنّ إعادةَ جلبٍ خلفيةً تجري
// عليها الآن **لا تُقرأ يقيناً** — القائمةُ المعروضة قد تتغيّر خلال هذه
// اللحظة بعينها (جهازٌ سُلِّم تواً فدخل القائمة، أو أُلغيَ فخرج منها)،
// وحفظُ صيانةٍ فوق لقطةٍ قد تصير بائتة قبل أن يستقرّ الردّ **هو نفسُه
// التخمين** الذي أُغلق البابُ لأجله. فكلُّ نداءٍ نشطٍ — أوّلاً كان أو
// إعادةَ جلبٍ خلفية — «غير معلوم» لا «معروف»، ويبقى البابُ مغلقاً حتى
// يسكن الاستعلامُ على نتيجةٍ نهائية. والفشلُ النهائيُّ حالةٌ ثالثة صريحة.
//
// ══ ولا React هنا ═══════════════════════════════════════════════════════
// المشروع بلا مشغّل DOM (نفسُ قاعدة `device_flow_resume.ts`)، فدورةُ
// الحياة الحقيقية للنافذة تُثبَت بالبنية لا بالتشغيل: هذا الملفُّ يحمل
// **القرار** خالصاً، والنافذةُ تستورده حرفياً بدل أن تعيد كتابته بنفسها.

/** خيارُ «لا هويّةَ مسجَّلة» — قيمةٌ محلّية للشاشة، ليست منشأً ولا تصنيفاً. */
export const UNREGISTERED_DEVICE = "__unregistered_device__";

export type DevicePhase = "loading" | "error" | "resolved";

/**
 * يُشتَقّ من حالة `useQuery` مباشرةً — بلا آلة حالةٍ ثانية.
 *
 * **`resolved` وحدها حين تسكت الشبكةُ على نجاح**: `isSuccess &&
 * !isFetching`. فنجاحٌ سابقٌ مع إعادة جلبٍ قائمة الآن **ليس محلولاً** —
 * القائمةُ المعروضة لقطةٌ قد تتغيّر قبل أن يستقرّ الردُّ الجديد، وقراءتُها
 * يقيناً في هذه اللحظة تخمينٌ لا معرفة. **والخطأُ النهائيُّ يعلو على كلّ
 * شيء**: `isError` تعني ٤٠٤/شبكةً استقرّت على فشل، فتُقرأ «خطأ» ولو كانت
 * إعادةُ محاولةٍ تلقائية قائمةً خلفها — فلا يُقرأ فشلٌ مستقرٌّ «تحميلاً».
 */
export function devicePhaseOf(
  q: { isSuccess: boolean; isFetching: boolean; isError: boolean },
): DevicePhase {
  if (q.isError) return "error";
  if (q.isSuccess && !q.isFetching) return "resolved";
  return "loading";
}

export interface MaintenanceDeviceState {
  phase: DevicePhase;
  /** عددُ الحلقات المؤهَّلة — ذو معنًى فقط حين `phase === "resolved"`. */
  deviceCount: number;
  /** ما اختاره الموظّف: فارغ · معرّفُ حلقةٍ كسلسلة · `UNREGISTERED_DEVICE`. */
  selectedTarget: string;
}

/** أيُظهَر مُنتقي الجهاز؟ فقط بعد نجاحٍ حقيقيّ وبحلقةٍ مؤهَّلة واحدة فأكثر. */
export function maintenanceDeviceSelectorVisible(
  s: Pick<MaintenanceDeviceState, "phase" | "deviceCount">,
): boolean {
  return s.phase === "resolved" && s.deviceCount > 0;
}

/**
 * هل حقلُ الجهاز ناقصٌ؟ — يمنع الحفظَ حتى يُعرَف الجوابُ يقيناً.
 *
 * غيرُ محلولٍ بعد (تحميلٌ أو خطأ) ⟶ ناقصٌ دائماً، ولو كانت آخر قراءةٍ
 * معروفة صفراً. محلولٌ بصفرٍ ⟶ لا نقصَ، لا خيارَ ليُختار. محلولٌ بحلقةٍ
 * فأكثر ⟶ ناقصٌ حتى يختار الموظّفُ جهازاً بعينه أو «غير مسجَّل» صراحةً.
 */
export function maintenanceDeviceMissing(s: MaintenanceDeviceState): boolean {
  if (s.phase !== "resolved") return true;
  if (s.deviceCount === 0) return false;
  return s.selectedTarget === "";
}

/**
 * حقولُ الطلب المُرسَلة للخادم — أو `null` إن كانت الحالةُ ناقصة، فلا
 * يبني المُستدعي جسمَ طلبٍ من بياناتٍ لم تكتمل بعد.
 *
 * **وواحدةٌ من اثنتين دائماً، لا صفرٌ ولا اثنتان معاً** — نفسُ الشرط الذي
 * يفرضه الخادم على `POST /api/no-exam/maintenance` بالضبط، فلا ينحرف
 * عقدُ الشاشة عن عقد النقطة.
 */
export function maintenanceDeviceRequestFields(s: MaintenanceDeviceState): {
  deviceEpisodeId: number | null;
  legacyUnrecordedDevice: boolean;
} | null {
  if (maintenanceDeviceMissing(s)) return null;
  if (s.deviceCount === 0 || s.selectedTarget === UNREGISTERED_DEVICE) {
    return { deviceEpisodeId: null, legacyUnrecordedDevice: true };
  }
  return { deviceEpisodeId: Number(s.selectedTarget), legacyUnrecordedDevice: false };
}
