// حالةُ إسناد الخبير في سجلّ المرضى — **منطقٌ خالص، بلا React ولا شبكة**.
//
// ══ لماذا ملفٌّ مستقلّ ══════════════════════════════════════════════════
// المشروع بلا مشغّل DOM، فقرارٌ داخل مكوّن React لا يُختبَر. وهذا القرار
// يستحقّ الاختبار: المريض قد يحمل طرفاً ومسنداً، وحالةُ كلٍّ منهما مستقلّة
// تماماً. فمنطقٌ يعامل «مُسنَد» كعَلَمٍ واحد للمريض يخفي زرَّ المسند لأن
// الطرف أُسنِد — وهذا بالضبط ما يجب ألّا يقع.
//
// ══ القاعدة ═════════════════════════════════════════════════════════════
// الخدمة **قابلة للتخصيص** حين:
//   (أ) قرّرها الطبيب (`decided`)، أو كان المريض مُعفىً تاريخياً،
//   (ب) **ولا يوجد لها أمر بناءٍ أوليّ فعّال**.
// والشرط الثاني هو الجديد: أمرٌ قائم يعني أن التخصيص وقع فعلاً، فإعادته
// تُنشئ أمراً ثانياً يردّه الخادم على أي حال — والزرّ الذي ينتهي برسالة
// خطأ أسوأ من زرٍّ يختفي بعد أن أدّى غرضه.

export type DeviceService = "prosthetic" | "medical_support";

export const DEVICE_SERVICES: DeviceService[] = ["prosthetic", "medical_support"];

export interface ActiveAssignment {
  serviceType: string;
  workOrderId: number;
  deviceEpisodeId: number | null;
  expertUserId: number | null;
  expertName: string | null;
  status: string;
  currentStage: string;
}

export interface RegistryPatientLike {
  id: number;
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
  activeDeviceAssignments?: ActiveAssignment[] | null;
}

/** الخدمات التي يحملها ملفّ المريض فعلاً. */
export function ownedDeviceServices(p: RegistryPatientLike): DeviceService[] {
  return DEVICE_SERVICES.filter((s) =>
    s === "prosthetic" ? Boolean(p.isAmputee) : Boolean(p.isMedicalSupport));
}

/** الخدمات التي لها أمر بناءٍ أوليّ فعّال الآن. */
export function assignedServices(p: RegistryPatientLike): DeviceService[] {
  const list = Array.isArray(p.activeDeviceAssignments) ? p.activeDeviceAssignments : [];
  return DEVICE_SERVICES.filter((s) => list.some((a) => a.serviceType === s));
}

/** إسنادُ خدمةٍ بعينها إن وُجد. */
export function assignmentFor(
  p: RegistryPatientLike, service: DeviceService,
): ActiveAssignment | null {
  const list = Array.isArray(p.activeDeviceAssignments) ? p.activeDeviceAssignments : [];
  return list.find((a) => a.serviceType === service) ?? null;
}

/**
 * الخدمات القابلة للتخصيص الآن.
 *
 * `decided` إشارةُ الطبيب، و`legacyExempt` مخرجُ المرضى القدامى الذي لم
 * يتغيّر في الخادم. وفي الحالتين تُطرح الخدمةُ المُسنَدة فعلاً — فالإعفاء
 * يرفع شرطَ المعاينة، لا يبيح إسناداً ثانياً لأمرٍ قائم.
 */
export function assignableServices(params: {
  patient: RegistryPatientLike;
  decided: string[];
  legacyExempt: boolean;
  /**
   * الخدماتُ التي يحكمها **ملفُّ متابعةٍ حيّ** لهذا المريض.
   *
   * ══ البابُ المكرَّر الذي يغلقه ═════════════════════════════════════════
   * مريضٌ وقّع الطبيبُ معاينته يفتح له ملفُّ متابعةٍ يحكم بيعَه، والخادم
   * يردّ «تخصيص» المباشر ما دام حيّاً. وكان الزرُّ يظهر رغم ذلك — فيضغطه
   * الموظّف ويُردّ بـ409. **بابان ظاهران وأحدُهما ينتهي دائماً بخطأ.**
   *
   * فيُخفى هنا، ويبقى المسارُ الصحيح وحده مرئياً: بطاقةُ «قرار المريض بعد
   * المعاينة» في صفحة المريض.
   *
   * **والبابُ القديم يبقى مشروعاً حيث لا متابعةَ تحكمه**: المريضُ القديم
   * المُعفى، ومَن أُغلق ملفُّه، ومَن لا معاينةَ له أصلاً.
   */
  governed?: string[] | null;
}): DeviceService[] {
  const owned = ownedDeviceServices(params.patient);
  const taken = assignedServices(params.patient);
  const governed = params.governed ?? [];
  return owned.filter((s) => {
    if (taken.includes(s)) return false;
    //  والإخفاءُ يسبق الإعفاء: مريضٌ قديمٌ فُتحت له متابعةٌ حيّة يُحكَم
    //  بها هو الآخر — الحارسُ في الخادم لا يستثني القدامى.
    if (governed.includes(s)) return false;
    return params.legacyExempt || params.decided.includes(s);
  });
}

/**
 * وسوم «تم تحديد» التي **ما زالت** تعني شيئاً.
 *
 * بعد التخصيص صار الجهاز في التصنيع، فبقاءُ «تم تحديد» يقول للموظّف إن
 * دوره لم يأتِ بعد — وهو أقدمُ حالةً من الواقع. والحالةُ الأحدث تسود.
 * (المعالجة هنا لا في نقطة المعاينات: تلك إشارةٌ سريرية صحيحة بذاتها.)
 */
export function visibleDecided(
  p: RegistryPatientLike, decided: string[],
): string[] {
  const taken = assignedServices(p) as string[];
  return decided.filter((d) => !taken.includes(d));
}

/**
 * أيَّ خدمةٍ تفتح عليها نافذةُ «تخصيص وإسناد خبير»، وهل تسأل أصلاً.
 *
 * تسأل حين تبقى خدمتان. أمّا حين لا تبقى إلا واحدة — ولو كان الملفّ يحمل
 * الاثنين لأن إحداهما أُسنِدت فعلاً — فالسؤال بلا معنى: جوابُه معروف،
 * وتركُه مفتوحاً يُغري بإعادة تخصيص ما خُصِّص.
 *
 * و`offered` الغائبة تعني نداءً من مكانٍ لم يحسبها بعد، فتُشتقّ من أعلام
 * الملفّ كما كان السلوك قبل هذه الميزة تماماً.
 */
export function resolveDialogService(params: {
  offered?: DeviceService[] | null;
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
  choice?: DeviceService | null;
}): { offered: DeviceService[]; needsChoice: boolean; serviceType: DeviceService } {
  const offered = params.offered ?? ownedDeviceServices({
    id: 0, isAmputee: params.isAmputee, isMedicalSupport: params.isMedicalSupport,
  });
  const needsChoice = offered.length > 1;
  const serviceType: DeviceService = offered.length === 1
    ? offered[0]
    : needsChoice
      ? (params.choice ?? offered[0])
      : (params.isMedicalSupport && !params.isAmputee ? "medical_support" : "prosthetic");
  return { offered, needsChoice, serviceType };
}

const SERVICE_NOUN: Record<DeviceService, string> = {
  prosthetic: "الطرف",
  medical_support: "المسند",
};

/** نصّ شارة الإسناد — باسم الخبير إن عُرف، وإلّا بلا اسم. */
export function assignmentBadgeLabel(a: ActiveAssignment): string {
  const noun = SERVICE_NOUN[a.serviceType as DeviceService];
  const head = noun ? `تم إسناد ${noun}` : "تم إسناد الخبير";
  const name = (a.expertName ?? "").trim();
  return name ? `${head} — ${name}` : (noun ? head : "تم إسناد الخبير");
}
