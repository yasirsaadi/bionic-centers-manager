// **استئنافُ طلبِ الجهاز بعد استكمال الملفّ** — حالةٌ تعبر تفكيكَ المكوّنات.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// الموظّفةُ تختار «قالب»، فيردّ الخادمُ أن الملفّ ينقصه مستوى البتر، فتذهب
// إلى «تعديل مريض» وتكمله وتحفظ. وحفظُ التعديل **يغيّر المسار** إلى صفحة
// المريض، فتُفكَّك الشجرةُ كلُّها: صفحةُ المريض، والموزِّع، ونافذةُ الجهاز.
//
// فأيُّ `useState` — في النافذة أو في الموزِّع أو في الصفحة — **يموت**.
// والاختيارُ الذي وُعد الموظّفُ بحفظه لا يعود، فيبدأ من أوّله: «إضافة خدمة
// جديدة» ⟶ «طرف صناعي جديد أو جزء جديد» ⟶ «قالب». وهذا بالضبط التعجُّلُ
// الذي وُلد له بابُ التصحيح الإداريّ.
//
// ══ فالحالةُ تعيش خارج React ════════════════════════════════════════════
// `sessionStorage` يبقى عبر تغيّر المسار ويموت بإغلاق اللسان — وهو عمرُ
// المهمّة نفسِه. **ولا `localStorage`**: مسوّدةٌ تنام أسبوعاً ثم تفتح نافذةً
// لم يطلبها أحد.
//
// ══ ولقطةٌ **تُستهلَك مرّةً واحدة** ═════════════════════════════════════
// القراءةُ تمسح دائماً. فإن عادت الموظّفةُ ولم تُكمِل الطلبَ لم تلاحقها
// النافذةُ في كلّ تحميلٍ للصفحة، وإن فتحت مريضاً آخر لم يُستأنف له طلبُ
// غيره — والمخزَّنُ يُنسَب إلى مريضٍ بعينه ويُرفَض لسواه.
//
// ══ ولا تخزينَ يُسقط التطبيق ════════════════════════════════════════════
// المتصفّحُ في وضع التصفّح الخاص قد يرمي عند أوّل لمسةٍ للتخزين. وطلبُ جهازٍ
// لا يجوز أن يفشل لأنّ مسوّدةً لم تُحفَظ: كلُّ لمسةٍ محروسة، والفشلُ يعني
// «بلا استئناف» لا «تعطّل».

import { isDeviceServiceKind, isRequestedItem, type DeviceServiceKind } from "@shared/prosthetic_parts";
import { isServicePath, type ServicePath } from "@shared/service_path";

/** ما يلزم لاستئناف نافذة «جهاز جديد» تماماً حيث تُركت. */
export interface DeviceFlowResume {
  patientId: number;
  serviceType: DeviceServiceKind;
  /** `""` = لم يُختَر جزءٌ بعد — وهي حالةٌ مشروعة تُحفَظ كما هي. */
  requestedItem: string;
  /**
   * مسارُ العملية كما اختاره الموظّفُ قبل أن يُردّ (ترحيل ٠٦٥).
   *
   * `""` = لم يُجَب بعد. **ولا يُخمَّن عند العودة**: السؤالُ يبقى مطروحاً
   * فارغاً لا مُجاباً نيابةً عن أحد.
   */
  servicePath: ServicePath | "";
}

export const DEVICE_FLOW_RESUME_KEY = "bcm.device_flow_resume";

/**
 * أضيقُ عقدٍ من `Storage` — فيُمرَّر مخزَّنٌ زائف في الاختبار بلا متصفّح.
 */
export interface ResumeStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `sessionStorage` حين يوجد ويُسمَح به — وإلّا `null` بلا رمي. */
export function sessionResumeStore(): ResumeStore | null {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** يحفظ لقطةَ الاستئناف. والفشلُ صامتٌ: أسوأُ نتيجةٍ ألّا يُستأنف. */
export function saveDeviceFlowResume(store: ResumeStore | null, r: DeviceFlowResume): void {
  if (!store) return;
  if (!Number.isFinite(r.patientId) || r.patientId <= 0) return;
  if (!isDeviceServiceKind(r.serviceType)) return;
  try {
    store.setItem(DEVICE_FLOW_RESUME_KEY, JSON.stringify({
      patientId: Number(r.patientId),
      serviceType: r.serviceType,
      //  الجزءُ المخزَّن قيمةٌ من القائمة أو لا شيء — ولا نصَّ حرّ يعود
      //  فيُضبَط به `Select` على قيمةٍ لا يعرفها.
      requestedItem: isRequestedItem(r.requestedItem) ? r.requestedItem : "",
      servicePath: isServicePath(r.servicePath) ? r.servicePath : "",
    } satisfies DeviceFlowResume));
  } catch {
    /* بلا استئناف — ولا تعطُّل. */
  }
}

/**
 * يقرأ اللقطةَ **ويمسحها دائماً**، ولا يعيدها إلّا لصاحبها.
 *
 * والمسحُ حتى عند عدم التطابق مقصود: لقطةٌ لمريضٍ تُركت وذهب الموظّفُ إلى
 * غيره **انتهى وقتُها** — وإبقاؤها كان يفتح نافذةً بعد ساعةٍ بلا سببٍ ظاهر.
 */
export function takeDeviceFlowResume(
  store: ResumeStore | null, patientId: number,
): DeviceFlowResume | null {
  if (!store) return null;
  let raw: string | null = null;
  try {
    raw = store.getItem(DEVICE_FLOW_RESUME_KEY);
    store.removeItem(DEVICE_FLOW_RESUME_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (Number(parsed.patientId) !== Number(patientId)) return null;
  if (!isDeviceServiceKind(parsed.serviceType)) return null;
  return {
    patientId: Number(patientId),
    serviceType: parsed.serviceType,
    requestedItem: isRequestedItem(parsed.requestedItem) ? parsed.requestedItem : "",
    servicePath: isServicePath(parsed.servicePath) ? parsed.servicePath : "",
  };
}

/** يُلغي استئنافاً معلَّقاً — حين يُغلق الموظّفُ المسارَ بنفسه. */
export function clearDeviceFlowResume(store: ResumeStore | null): void {
  if (!store) return;
  try {
    store.removeItem(DEVICE_FLOW_RESUME_KEY);
  } catch {
    /* لا شيء يُفعَل. */
  }
}

// ══ «فتح العملية الحالية» — إلى أين بالضبط ════════════════════════════════
//
// الزرُّ كان يغلق النافذةَ ولا يفتح شيئاً، فيقرأ الموظّفُ وعداً لا يقع.
// وأينَ يذهب سؤالٌ له جوابٌ واحد صحيح:
//
//   أمرُ تصنيعٍ قائم  ⟶  **صفحةُ الأمر نفسِها** بمسارها القائم.
//   حلقةٌ بلا أمر     ⟶  البطاقةُ التي تُقرأ فيها حالةُ الطلب في صفحة
//                        المريض — بطاقةُ «قرار المريض بعد المعاينة».
//
// **ولا عارضَ ثانٍ للعملية**: كلا الوجهتين قائمتان قبل هذه التمريرة.

export type OperationFocus =
  | { kind: "route"; href: string }
  | { kind: "anchor"; elementId: string };

/** مرساةُ بطاقةِ «قرار المريض بعد المعاينة» في صفحة المريض. */
export const POST_EXAM_CARD_ANCHOR = "post-exam-decision-card";

/** مسارُ صفحةِ أمر التصنيع القائم — `/manufacturing/orders/:id`. */
export const workOrderHref = (id: number) => `/manufacturing/orders/${id}`;

export function activeOperationFocus(
  c: { workOrderId?: number | null; episodeId?: number | null },
): OperationFocus {
  const wo = Number(c?.workOrderId);
  if (Number.isFinite(wo) && wo > 0) return { kind: "route", href: workOrderHref(wo) };
  return { kind: "anchor", elementId: POST_EXAM_CARD_ANCHOR };
}
