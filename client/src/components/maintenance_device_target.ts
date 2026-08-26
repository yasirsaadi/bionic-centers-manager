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
// ══ فالقرارُ لا يُبنى إلّا على استعلامٍ ناجحٍ فعلاً ═══════════════════════
// `resolved` = وصل ردٌّ ناجحٌ ولو مرّة (`isSuccess`)، بصرف النظر عن إعادة
// جلبٍ صامتة تجري خلفه بعد ذلك. وما دون ذلك — تحميلٌ أوّل أو فشل — «غير
// معلوم» لا «صفر»، ويبقى البابُ مغلقاً حتى يُعرَف الجواب يقيناً.
//
// ══ ولا React هنا ═══════════════════════════════════════════════════════
// المشروع بلا مشغّل DOM (نفسُ قاعدة `device_flow_resume.ts`)، فدورةُ
// الحياة الحقيقية للنافذة تُثبَت بالبنية لا بالتشغيل: هذا الملفُّ يحمل
// **القرار** خالصاً، والنافذةُ تستورده حرفياً بدل أن تعيد كتابته بنفسها.

/** خيارُ «لا هويّةَ مسجَّلة» — قيمةٌ محلّية للشاشة، ليست منشأً ولا تصنيفاً. */
export const UNREGISTERED_DEVICE = "__unregistered_device__";

export type DevicePhase = "loading" | "error" | "resolved";

/**
 * يُشتَقّ من حالة `useQuery` — `isSuccess` يعلو فوق إعادة جلبٍ خلفية:
 * استعلامٌ نجح مرّةً ويعيد الجلب الآن صامتاً يبقى «محلولاً»، فتُقرأ نتيجتُه
 * السابقة بثقة. وفشلُ إعادة الجلب ذاتها يُسقط `isSuccess` فيعود «خطأ» —
 * وهذا هو الصواب: بيانٌ كان صحيحاً قد يصير غيرَ موثوق.
 */
export function devicePhaseOf(q: { isSuccess: boolean; isError: boolean }): DevicePhase {
  if (q.isSuccess) return "resolved";
  if (q.isError) return "error";
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
