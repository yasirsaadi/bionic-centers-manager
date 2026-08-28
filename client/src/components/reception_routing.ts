// **«ما سبب حضور المريض اليوم؟»** — البابُ الواحد لعمليات الأجهزة.
// منطقٌ خالص، بلا React ولا شبكة.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// كان لعمليات الأطراف والمساند أربعةُ مداخل متوازية: «طرف صناعي جديد أو
// جزء جديد» و«صيانة …» و«بيع أو صيانة بلا معاينة» في قائمة «إضافة خدمة
// جديدة»، و«غرض الزيارة: صيانة» داخل نافذة الزيارة. أربعةُ أبوابٍ إلى
// عملياتٍ ثلاث، لكلّ بابٍ سلوكُه ونواقصُه — فيختار الموظّفُ بالعادة لا
// بالمعنى، وتُفتَح العمليةُ الواحدة من حيث لا يُتوقَّع.
//
// فصار البابُ واحداً: سؤالٌ واحدٌ يُطرَح فور التسجيل، ويبقى متاحاً من صفحة
// المريض ومن داخل «إضافة خدمة جديدة».
//
// ══ ولا مسارَ جديد ═══════════════════════════════════════════════════════
// **هذا موزِّعٌ فوق الموزِّع، لا نظامَ توجيهٍ ثانٍ.** ثلاثةُ خياراتٍ لكلّ
// قسم، وكلٌّ منها **نفسُ** الحقل `flow` الذي يفهمه `PatientServiceLauncher`
// أصلاً — نافذةُ «جهاز جديد» (`NewDeviceEpisodeModal`) لمن يحتاج معاينة،
// ونافذةُ «بلا معاينة» (`NoExamOperationDialog`) بنوعها المحسوم مسبقاً
// (بيعٌ أو صيانة) لغيره. **ولا نقطةَ نهايةٍ جديدة ولا قائمةَ أجزاءٍ ثانية.**
//
// ══ ولا «شراء طرف صناعي كامل» بين الخيارات ═══════════════════════════════
// الجهازُ الكاملُ قرارٌ سريريٌّ من أوّله (`shared/prosthetic_parts`:
// `NO_EXAM_FULL_PROSTHESIS_REFUSAL`) — فمكانُه «يحتاج معاينة طبية»، الذي
// يفتح نافذةَ «جهاز جديد» على مسار المعاينة دائماً. والموظّفُ يحدّد
// **المطلوب** فيها (طرفٌ كاملٌ أو جزء) كما كان.
//
// ══ والمساندُ الطبية بلا شراءٍ بلا معاينة ═══════════════════════════════
// كان الخيارُ «شراء مسند طبي» يفتح نافذةَ «بلا معاينة» بنوعِ خدمةٍ
// `medical_support`، فتعرض له **الجهازَ الكاملَ** لأنه الشيءُ الوحيد الذي
// لا أجزاءَ دونه. وهذا يبيع بلا معاينةٍ **أشدَّ** ما يحتاج الطبيب.
//
// **وقرارُ المالك (بعد ٢٤٩)**: المسندُ الكاملُ كالطرف الكامل — يحتاج معاينة.
// ولا قائمةَ أجزاءٍ قانونيةً للمساند، فلا يبقى لها ما يُباع بلا معاينة
// أصلاً — **ولن تُخترَع لها أجزاءٌ هنا ولا في أيّ ملفّ**.
//
// فالخيارُ حُذف، ولم يُترك معطَّلاً: بابٌ يردّه الخادمُ بعد ضغطتين ليس
// باباً. والقائمةُ تُشتقّ من قاعدة `shared/prosthetic_parts` نفسِها
// (`noExamSaleServiceTypes`) لا من شرطٍ مكتوبٍ بيدٍ ثانية هنا ينحرف عنها.

import type { ServiceFlow } from "./patient_service_launcher_logic";
import type { ResumeStore } from "./device_flow_resume";
import { DEPARTMENT_LABELS } from "@shared/service_taxonomy";
import { noExamSaleServiceTypes } from "@shared/prosthetic_parts";
import { canCompleteMaintenance, type MaintenanceSessionLike } from "@shared/maintenance";
import { canCompleteComponentSale, type ComponentSaleSessionLike } from "@shared/component_sale";

/**
 * جلسةٌ تصلح للبابين معاً — `canCompleteMaintenance` و`canCompleteComponentSale`
 * تقرآن الشكلَ نفسَه (`role`/`isAdmin`) بدالّتين مستقلّتين عمداً (كلٌّ منهما
 * قدرةٌ قائمةٌ بذاتها لبابها — لا اسمٌ بديل)، فلا حاجةَ لنوعين متطابقين.
 */
type RoutingSessionLike = MaintenanceSessionLike & ComponentSaleSessionLike;

/** عنوانُ السؤال كما يراه الاستقبال — ثابتٌ واحد يُستعمَل في كلّ سطح. */
export const RECEPTION_ROUTING_QUESTION = "ما سبب حضور المريض اليوم؟";

export type ReceptionRoutingServiceType = "prosthetic" | "medical_support";

export interface ReceptionRoutingChoice {
  id: "exam_required" | "device_sale" | "maintenance";
  label: string;
  flow: ServiceFlow;
}

/** قسمٌ واحد بخياراته — عنوانُه من تصنيف الأقسام الرسميّ لا من معجمٍ ثانٍ. */
export interface ReceptionRoutingGroup {
  serviceType: ReceptionRoutingServiceType;
  label: string;
  choices: ReceptionRoutingChoice[];
}

/**
 * **أقسامُ الأجهزة التي يملكها المريض — كلُّها، بلا تفضيلٍ صامت.**
 *
 * ── العطبُ الذي تغلقه ──────────────────────────────────────────────────
 * كانت القاعدةُ `if (isAmputee) return "prosthetic"` ثمّ المساند — فمريضٌ
 * يحمل الاثنين يُعرَض له سؤالُ الأطراف وحده، **ولا يُقال له ذلك**. فيضغط
 * «صيانة طرف صناعي» وهو جاء لمسنده، أو يظنّ أن لا بابَ لمسنده أصلاً.
 * والتخمينُ هنا يكتب في سجلٍّ دائم: أمرُ تصنيعٍ على القسم الخطأ.
 *
 * فصار الاثنان يُعرضان معاً مجموعَين، ولا يُخمَّن قسمٌ أبداً. وصاحبُ قسمٍ
 * واحد يرى خياراتِه الثلاثة مباشرةً بلا عنوانٍ زائد.
 *
 * **والعلاجُ الطبيعي لا يُمَسّ**: ليس قسمَ أجهزة، فلا يظهر هنا إطلاقاً
 * ولا يتغيّر حرفٌ في مساره.
 */
export function receptionRoutingDepartments(p: {
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
}): ReceptionRoutingServiceType[] {
  const out: ReceptionRoutingServiceType[] = [];
  if (p.isAmputee) out.push("prosthetic");
  if (p.isMedicalSupport) out.push("medical_support");
  return out;
}

const SALE_LABEL: Record<ReceptionRoutingServiceType, string> = {
  prosthetic: "شراء جزء من طرف صناعي",
  //  لا يُعرَض — المساندُ خارجَ `noExamSaleServiceTypes`. ويبقى العنوانُ
  //  هنا كي يظلّ السجلّ مكتملَ الشكل، ولا يصير غيابُه هو الحارس.
  medical_support: "شراء مسند طبي",
};
const MAINTENANCE_LABEL: Record<ReceptionRoutingServiceType, string> = {
  prosthetic: "صيانة طرف صناعي",
  medical_support: "صيانة مسند طبي",
};

/**
 * **خياراتُ القسم** — بالترتيب الذي تُعرَض به دائماً.
 *
 * و«يحتاج معاينة طبية» يفتح نافذة «جهاز جديد» على **مسار المعاينة دائماً**:
 * لا سؤالَ داخلها عن المسار، ولا تبديلَ إلى «بلا معاينة» من قلبها — ذلك
 * التبديلُ لا يقول أهو بيعُ جزءٍ أم صيانة، وكان يترك حلقةً مفتوحةً بمسارٍ
 * ناقص المعنى قبل تسجيل العملية الصحيحة. ومَن تبيّن له غيرُ ذلك يضغط
 * «تغيير سبب الحضور» فيعود إلى هذا المُوجِّه ليختار بدقّة.
 *
 * والآخران (البيع والصيانة) يذهبان إلى **نافذةٍ واحدة موجودة**
 * (`no_exam_operation` ⟶ `NoExamOperationDialog`) بنوعٍ محسومٍ سلفاً
 * (`initialKind`) — فلا يُعاد سؤال «بيعٌ أم صيانة؟» بعد أن أجاب عنه
 * اختيارُ الزرّ بعينه.
 *
 * **والبيعُ لا يُعرَض إلّا لقسمٍ له ما يُباع بلا معاينة** — وهي الأطرافُ
 * وحدها اليوم. فالأطرافُ ثلاثة، والمساندُ اثنان: معاينةٌ وصيانة. والمسندُ
 * الكاملُ بابُه «يحتاج معاينة طبية» ككلّ جهازٍ كامل.
 *
 * **والبيعُ لا يُعرَض إلّا لمن يملك `canCompleteComponentSale` أيضاً**
 * (المرحلة الرابعة، `shared/component_sale.ts`) — استقبالٌ أو محاسبٌ أو
 * مديرُ فرع، أو المسؤولُ العامّ بلا قيد. **والطبيبُ لا يرى هذا الخيارَ هنا
 * إطلاقاً**: لا سلطةَ تجاريةً له على بيع الجزء من أوّلها، ولو ملك
 * `canAddPatients` أو أيَّ علمٍ آخر — هذا هو **العطبُ الذي أغلقته هذه
 * المرحلة تحديداً**: كان `sellsWithoutExam` وحدَه (شرطٌ غيرُ واعٍ بالصلاحية)
 * يُظهر «شراء جزء من طرف صناعي» حتى لطبيبٍ عاديّ.
 *
 * **والصيانةُ تُعرَض لمن يملك `canCompleteMaintenance` فقط** (المرحلة
 * الثالثة، `shared/maintenance.ts`) — **دالّةٌ مستقلّة عمداً عن بيع الجزء**
 * رغم تطابق أدوارها الثلاثة اليوم، فيتطوّر كلُّ بابٍ بلا أن يخشى تعديلُ
 * أحدهما كسرَ الآخر. **والطبيبُ لا يراها هنا إطلاقاً** أيضاً: لا سلطةَ له
 * على الصيانة المبسّطة من أوّلها. **والخادمُ يبقى الحارسَ الأخير على أيّ
 * حال** في البابين معاً (`session` غيابُها يُخفي الخيارين احتياطاً لا
 * افتراضَ صلاحية).
 */
export function receptionRoutingChoices(
  serviceType: ReceptionRoutingServiceType,
  session?: RoutingSessionLike | null,
): ReceptionRoutingChoice[] {
  const sellsWithoutExam = noExamSaleServiceTypes.includes(serviceType);
  const maySellComponent = canCompleteComponentSale(session);
  const mayMaintain = canCompleteMaintenance(session);
  return [
    {
      id: "exam_required",
      label: "يحتاج معاينة طبية",
      flow: { kind: "device_episode", serviceType },
    },
    ...(sellsWithoutExam && maySellComponent ? [{
      id: "device_sale" as const,
      label: SALE_LABEL[serviceType],
      flow: { kind: "no_exam_operation" as const, serviceType, initialKind: "device_sale" as const },
    }] : []),
    ...(mayMaintain ? [{
      id: "maintenance" as const,
      label: MAINTENANCE_LABEL[serviceType],
      flow: { kind: "no_exam_operation" as const, serviceType, initialKind: "maintenance" as const },
    }] : []),
  ];
}

/**
 * ما تعرضه الشاشة: مجموعةٌ لكلّ قسمٍ يملكه المريض، بخياراتها.
 *
 * فارغةٌ لمن لا قسمَ جهازٍ له إطلاقاً — فلا يُفتَح له مُوجِّه. **و`session`
 * تمرَّر إلى كلّ قسمٍ بلا تكرارِ منطق الصلاحية** — نفسُ الجلسة، نفسُ القرار.
 */
export function receptionRoutingGroups(p: {
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
}, session?: RoutingSessionLike | null): ReceptionRoutingGroup[] {
  return receptionRoutingDepartments(p).map((serviceType) => ({
    serviceType,
    label: DEPARTMENT_LABELS[serviceType],
    choices: receptionRoutingChoices(serviceType, session),
  }));
}

// ══ العلمُ الأحاديّ الاستعمال — يُفتَح فور التسجيل، ولا يلاحق التحديث ═════
//
// نفسُ نمط `device_flow_resume.ts` حرفاً: `sessionStorage` (يعبر التنقّل،
// يموت بإغلاق اللسان) ولقطةٌ **تُستهلَك مرّةً واحدة** (القراءةُ تمسح
// دائماً) فلا يلاحق المُوجِّهُ الموظّفَ في كلّ تحديثٍ للصفحة، ولا يُستأنف
// لمريضٍ غير صاحبه.

export const RECEPTION_ROUTING_FLAG_KEY = "bcm.reception_routing_open_once";

/** يُخزَّن فور نجاح التسجيل لمريضٍ بعينه. والفشلُ صامت — أسوأ نتيجةٍ ألّا يُفتَح المُوجِّه تلقائياً. */
export function markReceptionRoutingPending(store: ResumeStore | null, patientId: number): void {
  if (!store) return;
  if (!Number.isFinite(patientId) || patientId <= 0) return;
  try {
    store.setItem(RECEPTION_ROUTING_FLAG_KEY, String(Math.trunc(patientId)));
  } catch {
    /* بلا فتحٍ تلقائيّ — ولا تعطُّل. */
  }
}

/**
 * يقرأ العلمَ **ويمسحه دائماً**، ولا يُرجع `true` إلّا لصاحبه.
 *
 * فتحديثُ الصفحة بعد فتح المُوجِّه (أو إغلاقه) لا يعيد فتحه، وفتحُ مريضٍ
 * آخر بعده بلحظات لا يستأنف له علماً ليس علمَه.
 */
export function takeReceptionRoutingPending(
  store: ResumeStore | null, patientId: number,
): boolean {
  if (!store) return false;
  let raw: string | null = null;
  try {
    raw = store.getItem(RECEPTION_ROUTING_FLAG_KEY);
    store.removeItem(RECEPTION_ROUTING_FLAG_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;
  return Number(raw) === Number(patientId);
}
