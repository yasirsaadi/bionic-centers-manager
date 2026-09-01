// منطق «إضافة خدمة جديدة» — **خالص، بلا React ولا شبكة**.
//
// ══ ما هذا الملفّ ═══════════════════════════════════════════════════════
// النافذة **موزِّع لا منفّذ**: تختار الخدمة فتفتح المسار القائم لها، ولا
// تحمل منطق عمل ولا تنادي نقطة نهاية بنفسها. وهذا الملفّ هو قرار التوزيع
// وحده: أي خيار ⇒ أي مسار، ومتى يُعرَض ولماذا.
//
// وأُخرِج إلى ملفّ مستقلّ للسبب نفسه الذي أُخرِج لأجله منطق بطاقة التواصل:
// المشروع بلا مشغّل DOM، فقرارٌ داخل مكوّن React لا يُختبَر. وهنا يُختبَر
// دخلاً وخرجاً — والخريطة نفسها تصير وثيقةً تنفيذية لا تعليقاً يشيخ.
//
// ══ ولا مسار جديد إطلاقاً ═══════════════════════════════════════════════
// هذا **توحيد لنقطة الدخول في الواجهة، لا توحيد للخلفية**. النقاط القائمة
// تبقى كما هي بحدودها وتحقّقاتها ومحاسبتها — ولا نقطة «خدمة عامّة» تجمعها.
//
// ══ وعملياتُ الأجهزة ليست من هذا الباب ══════════════════════════════════
// **بابُ عمليات الأجهزة واحد: «ما سبب حضور المريض اليوم؟»** (انظر
// `reception_routing.ts`). وكانت هذه القائمة تعرض ستّةَ أبوابٍ موازية له —
// «طرف صناعي جديد أو جزء جديد» و«مسند طبي جديد» وصيانتَيهما و«بيع أو صيانة
// بلا معاينة» لكلّ قسم — فيختار الموظّفُ بابَه بالعادة لا بالمعنى، وتُفتَح
// العمليةُ نفسُها من أربعة مداخل لكلٍّ سلوكُه.
//
// فبقيت هنا **الخدماتُ الإضافية على الملفّ وحدها**: فتحُ خيط اختصاصٍ لم
// يُفتَح بعد، وجلساتٌ إضافية، واستشارة، وخدمةٌ أخرى. **ونقاطُ النهاية لم
// تُحذَف** — الشاشةُ توقّفت عن تكرارها، والخادمُ وتاريخُه كما هما.

import type { Department } from "@shared/service_taxonomy";
import { DEPARTMENT_LABELS } from "@shared/service_taxonomy";
import type { PendingChargeKind } from "@shared/pending_charge";
import { noExamSaleAllowed, FULL_DEVICE } from "@shared/prosthetic_parts";

/** المسارات التي يفتحها الموزِّع — **قائمة مغلقة**. */
export type ServiceFlow =
  /** `POST /api/patients/:id/add-case-type` — قرارٌ بلا مال ولا أمر تصنيع. */
  | { kind: "case_type"; caseType: "amputee" | "medical_support" | "physiotherapy" }
  /** `POST /api/patients/:id/new-service` — قيدٌ مالي على خيطٍ قائم. */
  | { kind: "new_service"; serviceType: "additional_therapy" | "consultation" | "other" }
  /**
   * `POST /api/patients/:patientId/device-episodes` — طلبُ جهازٍ **على مسار
   * المعاينة**.
   *
   * ولا يُفتَح إلّا من «يحتاج معاينة طبية» في مُوجِّه سبب الحضور، فمسارُه
   * `"exam"` دائماً ولا يُسأل عنه داخل النافذة. تفصيلُه في
   * `NewDeviceEpisodeModal`.
   */
  | { kind: "device_episode"; serviceType: "prosthetic" | "medical_support" }
  /**
   * **عمليةٌ بلا معاينة** (ترحيل ٠٦٧) — بيعُ جزءٍ أو صيانةٌ يُنجزها
   * الاستقبال بلا إرسال المريض إلى الطبيب، **ومبلغُها يبقى خارج المحاسبة**
   * حتى يعتمده طبيبٌ مخوَّل.
   *
   * `initialKind` **اختياريّ**: يحسم «نوع العملية» مسبقاً من اختيار الزرّ
   * في مُوجِّه سبب الحضور، فلا يُعاد سؤالٌ أجاب عنه الموظّفُ بضغطته.
   */
  | {
      kind: "no_exam_operation"; serviceType: "prosthetic" | "medical_support";
      initialKind?: PendingChargeKind;
    }
  /**
   * `POST /api/followups/return-to-purchase` — **عاد للشراء** (ترحيل ٠٧٢).
   *
   * مريضٌ عايَنه طبيبٌ لجهازٍ ما، سجّل الاستقبالُ «لم يشترِ»، ثمّ عاد يريد
   * **الجهازَ نفسَه**. لا يُفتَح إلّا من «عاد للشراء» في مُوجِّه سبب
   * الحضور — والخيارُ نفسُه لا يظهر بلا حلقةٍ مؤهَّلة (`ReturnToPurchaseDialog`
   * يفحص الأهليّةَ من الخادم، لا من هنا).
   */
  | { kind: "return_to_purchase"; serviceType: "prosthetic" | "medical_support" };

/** النقاط التي يجوز أن يصل إليها موزِّع الخدمات — قائمة مغلقة. */
export const FLOW_ENDPOINTS: Record<ServiceFlow["kind"], string> = {
  case_type: "/api/patients/:id/add-case-type",
  new_service: "/api/patients/:id/new-service",
  device_episode: "/api/patients/:patientId/device-episodes",
  no_exam_operation: "/api/no-exam/device-sale",
  return_to_purchase: "/api/followups/return-to-purchase",
};

/**
 * حلقةُ جهازٍ كما تصل الشاشةَ من `GET /api/patients/:id/device-episodes`.
 *
 * الحقول اختياريةٌ عمداً: قارئٌ قديم قد لا يمرّرها كلَّها، و**الغائبُ لا
 * يُخمَّن** — يُقرأ «غيرَ معلوم» فيسقط من كلّ قرارٍ يحتاجه.
 */
export interface PatientEpisodeSummary {
  id?: number;
  serviceType: string;
  status: string;
  servicePath?: string | null;
  requestedItem?: string | null;
  /** رقمُ الجهاز التسلسليّ على خيط المريض — لتمييز مُرشَّحٍ عن آخر بالعرض. */
  sequenceNumber?: number | null;
}

export interface PatientServiceFlags {
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
  isPhysiotherapy?: boolean | null;
  /** حلقات المريض — تُقرأ لاستئناف بيعٍ ناقص، لا لبناء القائمة. */
  episodes?: PatientEpisodeSummary[] | null;
}

/**
 * مجموعاتُ الموزِّع — **هي الأقسامُ الثلاثة نفسها، لا غير**.
 *
 * والأسماءُ هي `Department` حرفياً، فلا خريطةَ بين الشاشة والتقرير.
 */
export type LauncherGroup = Department;

export interface LauncherOption {
  id: string;
  label: string;
  /** سطرٌ صغير يقول ما الذي سيحدث فعلاً عند الضغط. */
  description: string;
  group: LauncherGroup;
  flow: ServiceFlow;
}

export const GROUP_LABELS: Record<LauncherGroup, string> = DEPARTMENT_LABELS;

/**
 * **ما يُعرَض هو ما يمكن فعله — لا أكثر.**
 *
 * كانت القائمة تعرض كلَّ خيارٍ دائماً ثمّ تُطفئ ما لا ينطبق بسببٍ مكتوب.
 * وبدا ذلك صدقاً، لكنّه في شاشةٍ من اثني عشر بنداً صار ضجيجاً: صاحبُ
 * الحالات الثلاث يفتح القائمة فيرى نصفَها رمادياً يقول له ما **لا** يستطيع.
 *
 * فصار غيرُ القابل للتنفيذ **يختفي**: حالةٌ قائمةٌ لا تُعرَض ثانيةً، وجلساتٌ
 * إضافية لا تُعرَض لمن لا علاج له. والقائمةُ تقصر فتُقرأ.
 *
 * **ولا حارسَ سقط بذلك**: الخادمُ يردّ النوعَ المكرَّر ٤٠٩ كما كان، وفهرسُ
 * `patient_cases` الفريد يمنع الصفَّ الثاني. الاختفاءُ عرضٌ لا حماية.
 */
export function launcherOptions(p: PatientServiceFlags): LauncherOption[] {
  const hasProsthetic = Boolean(p.isAmputee);
  const hasSupport = Boolean(p.isMedicalSupport);
  const hasPhysio = Boolean(p.isPhysiotherapy);

  const all: (LauncherOption | null)[] = [
    hasProsthetic ? null : {
      id: "prosthetic_case",
      label: "إضافة حالة أطراف صناعية",
      description: "فتح خيط اختصاص الأطراف على ملفّ المريض — بلا مال ولا أمر تصنيع",
      group: "prosthetic",
      flow: { kind: "case_type", caseType: "amputee" },
    },
    hasSupport ? null : {
      id: "support_case",
      label: "إضافة حالة مساند طبية",
      description: "فتح خيط اختصاص المساند على ملفّ المريض — بلا مال ولا أمر تصنيع",
      group: "medical_support",
      flow: { kind: "case_type", caseType: "medical_support" },
    },
    hasPhysio ? null : {
      id: "physio_case",
      label: "إضافة حالة علاج طبيعي",
      description: "فتح خيط اختصاص العلاج الطبيعي على ملفّ المريض",
      group: "physiotherapy",
      flow: { kind: "case_type", caseType: "physiotherapy" },
    },
    !hasPhysio ? null : {
      id: "additional_therapy",
      label: "جلسات علاج طبيعي إضافية",
      description: "زيادة جلسات على خطة العلاج القائمة",
      group: "physiotherapy",
      flow: { kind: "new_service", serviceType: "additional_therapy" },
    },
    {
      id: "consultation",
      label: "استشارة طبية",
      description: "تسجيل استشارة على ملف المريض",
      group: "physiotherapy",
      flow: { kind: "new_service", serviceType: "consultation" },
    },
    {
      id: "other",
      label: "خدمة أخرى",
      description: "خدمة لا مسار خاصّ لها",
      group: "physiotherapy",
      flow: { kind: "new_service", serviceType: "other" },
    },
  ];

  return all.filter((o): o is LauncherOption => o !== null);
}

// ══ استئنافُ بيعٍ بلا معاينة بقي ناقصاً ══════════════════════════════════

/**
 * **الحلقةُ التي فُتحت ولم تكتمل — تُستأنَف هي، ولا تُفتَح ثانية.**
 *
 * ── العطبُ الذي تغلقه ──────────────────────────────────────────────────
 * المسارُ القديم كان يفتح حلقةَ `no_exam` أوّلاً ثمّ يسجّل مبلغَها. فإن
 * انقطع بينهما — إغلاقُ نافذة، خطأُ شبكة، موظّفٌ تركها — بقي على الملفّ
 * صفٌّ حيّ: جزءٌ مطلوبٌ بمسار «بلا معاينة»، **بلا سعرٍ ولا خبيرٍ ولا أمر
 * تصنيع**. وهذا وقع في الإنتاج فعلاً.
 *
 * ولا يجوز حذفُه (عمليةٌ حقيقية وُثّقت) ولا فتحُ ثانٍ فوقه (فهرسُ
 * `uq_pde_case_open` يمنع، والمعنى يمنع قبله). فيُستأنَف **هو بعينه**:
 * تُفتَح نافذةُ «بلا معاينة» على معرّفه، فتُكمِل خبيرَه ومبلغَه وأمرَه.
 *
 * ── ولا يُخمَّن المطلوب أبداً ────────────────────────────────────────────
 * ما طُلب مكتوبٌ على الصفّ، فيُقرأ منه حرفاً. وحلقةٌ وصلت بلا `requestedItem`
 * أو بلا معرّفٍ رقميّ **لا تُستأنَف**: فتحُ نافذةٍ على مجهولٍ كان سيسجّل
 * بيعَ قطعةٍ لم يطلبها أحد. والخادمُ يردّ الطلبَ الثاني ٤٠٩ برسالته، وهو
 * أصدقُ من تخمينٍ يمرّ.
 */
export function resumableNoExamSale(
  episodes: PatientEpisodeSummary[] | null | undefined,
  serviceType: "prosthetic" | "medical_support",
): { episodeId: number; requestedItem: string } | null {
  const list = Array.isArray(episodes) ? episodes : [];
  const found = list.find((e) =>
    e.serviceType === serviceType
    && e.status === "awaiting_exam"
    && e.servicePath === "no_exam");
  if (!found) return null;
  const id = Number(found.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const item = typeof found.requestedItem === "string" && found.requestedItem.trim()
    ? found.requestedItem : null;
  if (!item) return null;
  //  **ولا يُستأنَف ما لا يُباع.** حلقةٌ موروثة بمسار `no_exam` وطلبٍ «جهازٍ
  //  كامل» يردّها الخادمُ عند البيع (قرارُ المالك بعد ٢٤٩). فاستئنافُها هنا
  //  كان يُعبّئ نموذجاً مآلُه ٤٠٩ محتوم — وبابُها المعاينةُ أو التصحيحُ
  //  الإداريّ كما تقول رسالةُ الردّ. والقاعدةُ من `shared` لا نسخةٌ منها.
  if (!noExamSaleAllowed(serviceType, item)) return null;
  return { episodeId: id, requestedItem: item };
}

// ══ إلحاقُ جزءٍ بجهازٍ كاملٍ قيد التصنيع — مُرشَّحون يُعرَضون، لا قرارٌ يُتَّخذ هنا ══

/**
 * **أيّ أطرافٍ كاملة قيد التصنيع بالفعل لهذا المريض؟** — دالّةٌ خالصة تقول
 * **كلَّ** المُرشَّحين لسؤال الإلحاق، لا أن تقرّر الإلحاقَ نفسَه ولا أن
 * تختار واحداً عنهم.
 *
 * ── والقرارُ يبقى للموظّف دائماً ─────────────────────────────────────────
 * وجودُ حلقةِ `in_manufacturing` لجهازٍ كاملٍ **لا يعني** أن كلَّ جزءٍ
 * يُباع اليوم مقصودٌ لذلك الجهاز — فيُسأل الموظّفُ صراحةً
 * («هل هذا الجزء إضافة إلى الطرف الجاري تصنيعه؟»،
 * `shared/component_sale.ts: ATTACH_TO_IN_MANUFACTURING_QUESTION`)، وجوابُه
 * هو ما يقرّر. هذه الدالّةُ توفّر **قائمةَ المُرشَّحين** فحسب — والخادمُ
 * يعيد التحقّق الكامل من الهويّة المُختارة تحت القفل قبل أن يكتب ديناراً.
 *
 * ── ولا اختيارَ ضمنيّاً بعد اليوم (ترحيل ٠٧٣) ════════════════════════════
 * كانت هذه الدالّةُ تُرجع **مُرشَّحاً واحداً** (`.find()`، أوّلَ مطابقة)
 * لأن `uq_pde_case_open` كان يضمن ألّا يوجد أكثر من حلقةٍ مفتوحة على
 * الخيط أصلاً. وذلك الفهرسُ **رُفع**: مريضٌ قد يملك اليوم **أكثر من**
 * طرفٍ كاملٍ قيد التصنيع معاً (عملياتٌ مستقلّة عمداً). فاختيارُ الأوّل
 * صامتاً كان سيُلحِق الجزءَ بجهازٍ **لم يقصده أحد** — والمستدعي (الشاشة)
 * هو مَن يعرض القائمةَ ويُلزم اختياراً صريحاً حين تزيد عن واحد.
 *
 * ── ولجهازٍ كاملٍ وحده ────────────────────────────────────────────────────
 * حلقةُ `in_manufacturing` بجزءٍ (لا جهازٍ كامل) لا تُرشَّح — لا معنى
 * لإلحاق جزءٍ بجزءٍ آخر لم يُسلَّم بعد.
 */
export function inManufacturingFullDeviceEpisodes(
  episodes: PatientEpisodeSummary[] | null | undefined,
  serviceType: "prosthetic" | "medical_support",
): { episodeId: number; sequenceNumber: number | null }[] {
  const list = Array.isArray(episodes) ? episodes : [];
  return list
    .filter((e) =>
      e.serviceType === serviceType
      && e.status === "in_manufacturing"
      && e.requestedItem === FULL_DEVICE)
    .map((e) => {
      const id = Number(e.id);
      if (!Number.isFinite(id) || id <= 0) return null;
      const seq = Number(e.sequenceNumber);
      return { episodeId: id, sequenceNumber: Number.isFinite(seq) ? seq : null };
    })
    .filter((c): c is { episodeId: number; sequenceNumber: number | null } => c !== null)
    // ترتيبٌ ثابتٌ يُقرَأ — الأقدم رقماً أوّلاً، بصرف النظر عن ترتيب وصول
    // الخادم. المجهولُ الرقم (نادرٌ، بيانات تاريخية) يُذيَّل لا يُخمَّن.
    .sort((a, b) => (a.sequenceNumber ?? Infinity) - (b.sequenceNumber ?? Infinity));
}

// ══ تذكرة الإرسال: **واحدة لكل فتح** ═════════════════════════════════════

/**
 * حالة التذكرة بعد كل تغيّر في حالة النافذة — **دالّة خالصة**.
 *
 * ── العطب الذي تغلقه ────────────────────────────────────────────────────
 * كانت التذكرة تُسكّ داخل `onOpenChange(true)` وحده. وهذا يكفي ما دامت
 * النافذة تُفتح بزرّها: الحدث يقع فتُسكّ. لكن الموزِّع **يركّبها وهي
 * مفتوحة أصلاً** (`open` ثابتة)، فلا `onOpenChange` يقع إطلاقاً — فتُرسَل
 * التذكرة فارغةً، والخادم لا يطالب بشيء حين تكون فارغة، **فيسقط منع
 * التكرار بصمت** في المسار الجديد وحده. ضغطتان تصيران خدمتين.
 *
 * ── القاعدة ─────────────────────────────────────────────────────────────
 * مغلقة ⇒ لا تذكرة. مفتوحة ⇒ تذكرةٌ واحدة تثبت ما دامت مفتوحة.
 * فـ`prev ||` تمنع سكّ ثانيةٍ أثناء الفتح نفسه، والتصفير عند الإغلاق يمنع
 * إعادة استعمال تذكرةٍ استُهلكت — والخادم يرفض الثانية على أي حال، لكنه
 * كان سيردّ «مسجَّلة سابقاً» على خدمةٍ جديدة حقيقية.
 *
 * وخالصةٌ لتُختبَر: «فتحٌ واحد ⇒ تذكرة واحدة» ادّعاءٌ عن الزمن، ولا يُثبَت
 * بقراءة مكوّن React بلا مشغّل DOM.
 */
export function nextSubmissionToken(
  previous: string,
  open: boolean,
  mint: () => string,
): string {
  if (!open) return "";
  return previous || mint();
}

/** معرّفٌ عشوائي، ومهرَبٌ لبيئةٍ بلا `crypto.randomUUID`. */
export function mintSubmissionToken(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
