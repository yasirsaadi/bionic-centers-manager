// **«ما سبب حضور المريض اليوم؟»** — توجيهٌ فوريّ بعد تسجيل مريضٍ جديد.
// منطقٌ خالص، بلا React ولا شبكة.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// الاستقبالُ يسجّل مريضَ أطرافٍ أو مساندَ جديداً، فيُحفَظ الملفُّ ويهبط
// الموظّفُ على صفحة المريض العارية — والسؤالُ المهمّ («ما سبب الحضور؟»)
// مخفيٌّ خلف زرّ «إضافة خدمة جديدة» وقائمةٍ طويلة لا يعرف أوّلَها من آخرها.
//
// ══ ولا مسارَ جديد ═══════════════════════════════════════════════════════
// **هذا موزِّعٌ فوق الموزِّع، لا نظامَ توجيهٍ ثانٍ.** ثلاثةُ خياراتٍ فقط،
// وكلٌّ منها **نفسُ** الحقل `flow` الذي يفهمه `PatientServiceLauncher`
// أصلاً — نافذةُ «جهاز جديد» (`NewDeviceEpisodeModal`) لمن يحتاج معاينة،
// ونافذةُ «بلا معاينة» (`NoExamOperationDialog`) بنوعها المحسوم مسبقاً
// (بيعٌ أو صيانة) لغيره. **ولا نقطةَ نهايةٍ جديدة ولا قائمةَ أجزاءٍ ثانية.**
//
// ══ ولا «شراء طرف صناعي كامل» بين الخيارات ═══════════════════════════════
// الجهازُ الكاملُ قرارٌ سريريٌّ من أوّله (`shared/prosthetic_parts`:
// `NO_EXAM_FULL_PROSTHESIS_REFUSAL`) — فمكانُه الطبيعيّ «يحتاج معاينة
// طبية»، الذي يفتح نافذةَ «جهاز جديد» القائمة نفسَها **بمسارٍ ثابت**
// «معاينة طبية» (`fromReceptionRouting`) بلا محدِّدٍ داخليّ إطلاقاً —
// تبديلُ المسار من «نعم» إلى «لا» داخل النافذة لا يقول أهو بيعُ جزءٍ أم
// صيانة. فمَن يتبيّن له أن المريض لا يحتاج طبياً فعلاً يضغط «تغيير سبب
// الحضور» فيعود إلى هذا المُوجِّه نفسِه ليختار بدقّة. **والموظّفُ يحدّد
// المطلوبَ فيها كما كان دائماً** (طرفٌ كاملٌ أو جزء).
//
// ══ والمساندُ الطبية بلا قائمةِ أجزاء — ولن تُخترَع هنا ══════════════════
// لا تصنيفَ أجزاءٍ قانونياً للمساند في هذا المستودع (`NoExamOperationDialog`
// تعرض `FULL_DEVICE` وحده لها). فخيارُ «شراء مسند طبي» يفتح النافذةَ نفسَها
// بنوعِ خدمةٍ `medical_support`، وهي التي تقرّر البقاءَ بلا قائمة أجزاء —
// هذا الملفّ لا يضيف قائمةً ولا يفترضها.

import type { ServiceFlow } from "./patient_service_launcher_logic";
import type { ResumeStore } from "./device_flow_resume";

/** عنوانُ السؤال كما يراه الاستقبال — ثابتٌ واحد يُستعمَل في كلّ سطح. */
export const RECEPTION_ROUTING_QUESTION = "ما سبب حضور المريض اليوم؟";

export type ReceptionRoutingServiceType = "prosthetic" | "medical_support";

export interface ReceptionRoutingChoice {
  id: "exam_required" | "device_sale" | "maintenance";
  label: string;
  flow: ServiceFlow;
}

/**
 * القسمُ الذي يُطرَح له سؤالُ التوجيه — للأطراف والمساند فقط.
 *
 * **العلاجُ الطبيعي لا يُمَسّ**: يبقى `null` فلا يُفتَح له شيء. ونموذجُ
 * التسجيل خيارٌ واحد لا اجتماع (`conditionType`)، فمريضٌ حديثُ التسجيل
 * يحمل أحدَ العَلَمين لا كليهما — والأطرافُ تُقرأ أوّلاً لو اجتمعا لاحقاً
 * (حالةٌ ثانية أُضيفت من غير هذا المسار) بلا أن يُخمَّن شيء: كلا الاختيارين
 * ما زال بابُه القائم متاحاً من «إضافة خدمة جديدة» في الحالتين.
 */
export function receptionRoutingServiceType(p: {
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
}): ReceptionRoutingServiceType | null {
  if (p.isAmputee) return "prosthetic";
  if (p.isMedicalSupport) return "medical_support";
  return null;
}

const SALE_LABEL: Record<ReceptionRoutingServiceType, string> = {
  prosthetic: "شراء جزء من طرف صناعي",
  medical_support: "شراء مسند طبي",
};
const MAINTENANCE_LABEL: Record<ReceptionRoutingServiceType, string> = {
  prosthetic: "صيانة طرف صناعي",
  medical_support: "صيانة مسند طبي",
};

/**
 * **ثلاثةُ خياراتٍ لا رابع** — بالترتيب الذي يُعرَض به دائماً.
 *
 * و«يحتاج معاينة طبية» يفتح نافذة «جهاز جديد» بمسارٍ **ثابت** «معاينة
 * طبية» (`fromReceptionRouting`) بلا محدِّدٍ داخليّ يُبدَّل إلى «بلا
 * معاينة» — ذلك التبديلُ لا يقول أهو بيعُ جزءٍ أم صيانة، وقد يترك حلقةً
 * مفتوحةً قبل تسجيل العملية الصحيحة. فبدلاً منه زرُّ «تغيير سبب الحضور»
 * يعيد الموظّفَ إلى **هذا المُوجِّه نفسِه** ليختار السببَ الصحيح بدقّة —
 * لا تناقضَ بين اسم الزرّ ومحدِّدٍ يُعاد سؤالُه، ولا حلقةَ ناقصةَ المعنى.
 *
 * وكلاهما الآخران (البيع والصيانة) يذهب إلى **نافذةٍ واحدة موجودة**
 * (`no_exam_operation` ⟶ `NoExamOperationDialog`) بنوعٍ محسومٍ سلفاً
 * (`initialKind`) — فلا يُعاد سؤال «بيعٌ أم صيانة؟» بعد أن أجاب عنه
 * اختيارُ الزرّ بعينه.
 */
export function receptionRoutingChoices(
  serviceType: ReceptionRoutingServiceType,
): ReceptionRoutingChoice[] {
  return [
    {
      id: "exam_required",
      label: "يحتاج معاينة طبية",
      flow: {
        kind: "device_episode", serviceType,
        initialServicePath: "exam", fromReceptionRouting: true,
      },
    },
    {
      id: "device_sale",
      label: SALE_LABEL[serviceType],
      flow: { kind: "no_exam_operation", serviceType, initialKind: "device_sale" },
    },
    {
      id: "maintenance",
      label: MAINTENANCE_LABEL[serviceType],
      flow: { kind: "no_exam_operation", serviceType, initialKind: "maintenance" },
    },
  ];
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
