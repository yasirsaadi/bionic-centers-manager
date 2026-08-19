// الأقسامُ السريرية الثلاثة — **مصدرُ حقيقةٍ واحد** للتنظيم والتقارير.
//
// ══ لماذا هذا الملفّ ═══════════════════════════════════════════════════
// كان تقسيمُ المال قسمين لا ثلاثة: «أجهزة» تجمع الأطرافَ والمساندَ في دلوٍ
// واحد، و«علاج طبيعي»، وثالثٌ اسمُه «خدمات أخرى» يعيش خارج التصنيف كلّه.
// فمديرُ المساند لا يعرف كم باع قسمُه، والاستشارةُ لا تنتمي إلى أحد.
//
// **والقاعدة الآن ثلاثةٌ لا رابع لها**: ما ليس طرفاً ولا مسنداً فهو علاجٌ
// طبيعي بنوعٍ فرعيّ تحته. و«الأجهزة» تجميعٌ للتقرير لا قسمٌ رابع — تُشتقّ
// جمعاً ولا تُخزَّن، فلا يمكن لصفٍّ أن يُصنَّف «أجهزة» فيضيع بين القسمين.
//
// ══ وما لا يفعله هذا الملفّ ═════════════════════════════════════════════
// **لا يخمّن من نصٍّ حرّ.** التصنيفُ يُشتقّ من العلاقات المهيكلة وحدها:
// نوعُ الحالة، أو حلقةُ الجهاز، أو أمرُ التصنيع. وما لا يُحسَم بها يبقى
// **غير مبوَّبٍ صراحةً** — لا يُدسّ في العلاج الطبيعي لأنه الأكبر.
//
// ولا شبكةَ ولا قاعدةَ بيانات هنا، فيُختبَر وحده ويُستعمل في الخادم
// والواجهة معاً — قاعدةٌ واحدة لا تنحرف نسختُها عن نسختها.

// ── الأقسام الثلاثة ──────────────────────────────────────────────────────

/**
 * الأقسامُ السريرية الرسمية. **ثلاثةٌ لا رابع.**
 *
 * والأسماءُ هي نفسها قيمُ `patient_cases.case_type` القائمة حرفاً بحرف —
 * فلا ترجمةَ بين طبقةٍ وأخرى ولا خريطةَ تشيخ.
 */
export const DEPARTMENTS = ["prosthetic", "medical_support", "physiotherapy"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  prosthetic: "الأطراف الصناعية",
  medical_support: "المساند الطبية",
  physiotherapy: "العلاج الطبيعي",
};

export const isDepartment = (v: unknown): v is Department =>
  typeof v === "string" && (DEPARTMENTS as readonly string[]).includes(v);

/**
 * قسما الأجهزة. **تجميعٌ لا قسم**: يُستعمل للحُرّاس التقنية (المعاينة،
 * التصنيع، حلقات الأجهزة) وللتقرير المجمَّع — ولا يُخزَّن قيمةً أبداً.
 */
export const DEVICE_DEPARTMENTS = ["prosthetic", "medical_support"] as const;
export type DeviceDepartment = (typeof DEVICE_DEPARTMENTS)[number];

export const isDeviceDepartment = (v: unknown): v is DeviceDepartment =>
  v === "prosthetic" || v === "medical_support";

/** اسمُ التجميع في التقارير — وليس قسماً يُنتمى إليه. */
export const DEVICES_ROLLUP_LABEL = "الأطراف + المساند";
export const GRAND_TOTAL_LABEL = "الإجمالي العام";

// ── أنواعُ العلاج الطبيعي الفرعية ────────────────────────────────────────

/**
 * الأنواعُ الفرعية للعلاج الطبيعي — **بقيمها العربية المخزَّنة كما هي**.
 *
 * ولا تُطبَّع ولا تُرقَّم ولا تُترجَم إلى رموزٍ لاتينية: القيمُ هذه مكتوبةٌ
 * في `patients.treatment_type` و`payments.payment_treatment_type`
 * و`patients.physio_plan` منذ سنة، وتغييرُها ترحيلُ مفرداتٍ محفوف بالخطر
 * لا يشتري إلّا أناقةً في الشيفرة.
 *
 * والقائمةُ مشتقّةٌ من كتالوج الأسعار القائم (`PHYSIO_TREATMENT_PRICES`)
 * لا منسوخةٌ عنه — فنوعٌ يُضاف هناك يصير نوعاً فرعياً هنا بلا لمسة.
 * وإضافةُ نوعٍ جديد **لا تُنشئ قسماً رابعاً**، وهذا هو بيت القصيد.
 */
export const PHYSIO_SUBTYPE_EXTRAS = [
  //  خدماتٌ كانت تحت «خدمات أخرى»، وهي علاجٌ طبيعي تنظيمياً ومالياً.
  "جلسات علاج إضافية",
  "خدمة أخرى",
] as const;

/**
 * كلُّ الأنواع الفرعية: كتالوجُ الأسعار + ما نُقل من «خدمات أخرى».
 * يُمرَّر إليها `PHYSIO_TREATMENT_TYPES` كي لا تستورد هذه الوحدةُ التسعير
 * (فتبقى بلا تبعيّات، ويبقى مصدرُ الأسعار واحداً).
 */
export function physioSubtypes(priceCatalogTypes: readonly string[]): string[] {
  const out = [...priceCatalogTypes];
  for (const extra of PHYSIO_SUBTYPE_EXTRAS) if (!out.includes(extra)) out.push(extra);
  return out;
}

/**
 * نوعُ «خدمة جديدة» المهيكل ⟶ قسمُه.
 *
 * الثلاثةُ الباقية في النقطة (`additional_therapy` · `consultation` ·
 * `other`) **كلُّها علاجٌ طبيعي**: قيمةٌ مهيكلة تُقرأ من جسم الطلب لا نصٌّ
 * حرٌّ يُطابَق. والاستشارةُ منها — وهي التي كانت بلا قسم.
 */
export const NEW_SERVICE_DEPARTMENT: Record<string, Department> = {
  additional_therapy: "physiotherapy",
  consultation: "physiotherapy",
  other: "physiotherapy",
};

// ── الاشتقاقُ من العلاقات المهيكلة ──────────────────────────────────────

/**
 * قسمُ صفٍّ ماليٍّ أو سريري — **من علاقةٍ مهيكلة، أو `null` صراحةً**.
 *
 * الترتيب من الأوثق إلى الأضعف، ويتوقّف عند أوّل ما يُحسَم:
 *   ١) نوعُ الحالة (`patient_cases.case_type`) — أوثقُها، وهو القسمُ نفسُه.
 *   ٢) نوعُ خدمةِ حلقةِ الجهاز أو أمرِ التصنيع — جهازٌ بعينه لا لبسَ فيه.
 *   ٣) نوعُ «خدمة جديدة» المهيكل.
 *
 * **و`null` قرارٌ لا سهو**: صفٌّ لا تحسمه علاقةٌ يبقى «غير مبوَّب» ويظهر
 * كذلك في التقرير. ودسُّه في العلاج الطبيعي لأنه القسمُ الأكبر يجعل رقمَ
 * قسمٍ حقيقي كذبةً — وهو ما لا يُصلحه شيءٌ بعد وقوعه.
 *
 * **ولا يقرأ أعلامَ المريض إطلاقاً**: مريضٌ يحمل الثلاثة معاً لا تقول
 * أعلامُه شيئاً عن **هذه** المعاملة بعينها.
 */
export function departmentOf(rel: {
  /** `patient_cases.case_type` — الأوثق. */
  caseType?: string | null;
  /** نوعُ خدمة الحلقة أو أمر التصنيع (`prosthetic` | `medical_support`). */
  serviceType?: string | null;
  /** نوعُ «خدمة جديدة» المهيكل. */
  newServiceType?: string | null;
}): Department | null {
  if (isDepartment(rel.caseType)) return rel.caseType;
  if (isDeviceDepartment(rel.serviceType)) return rel.serviceType;
  const fromService = rel.newServiceType
    ? NEW_SERVICE_DEPARTMENT[rel.newServiceType] : undefined;
  return fromService ?? null;
}

// ── تجميعُ التقارير ──────────────────────────────────────────────────────

/** مبلغان لكل قسم: **ما بيع** و**ما قُبض**. ولا يُخلطان أبداً. */
export interface DepartmentMoney {
  /** المبيعات — كلفةٌ قُيِّدت في الدفتر (`revenue`). */
  revenue: number;
  /** الوارد — نقدٌ وصل فعلاً (`paid`). */
  paid: number;
}

export const ZERO_MONEY: DepartmentMoney = { revenue: 0, paid: 0 };

export interface DepartmentBreakdown {
  prosthetic: DepartmentMoney;
  medical_support: DepartmentMoney;
  physiotherapy: DepartmentMoney;
  /** ما لم تحسمه علاقةٌ مهيكلة — يُعرَض ولا يُوزَّع. */
  unclassified: DepartmentMoney;
}

/** التجميعان المشتقّان — يُحسبان ولا يُخزَّنان. */
export interface DepartmentRollups {
  /** الأطراف + المساند. **ليس قسماً**. */
  devicesCombined: DepartmentMoney;
  /** الأقسام الثلاثة + غير المبوَّب — يطابق الإجماليَّ المرجعي. */
  grandTotal: DepartmentMoney;
}

const add = (a: DepartmentMoney, b: DepartmentMoney): DepartmentMoney => ({
  revenue: a.revenue + b.revenue,
  paid: a.paid + b.paid,
});

/**
 * التجميعان من التفصيل.
 *
 * **وغيرُ المبوَّب داخلٌ في الإجمالي العام** عمداً: الإجماليُّ يجب أن يطابق
 * مجموعَ الدفتر والمدفوعات إلى الدينار، وإخراجُه منه كان سيجعل الشاشة
 * تعرض رقماً أصغر من الحقيقة — أي تُخفي المشكلة بدل أن تُظهرها.
 * وهو **خارج `devicesCombined`** لأن ذاك تجميعُ قسمين معروفين بعينهما.
 */
export function rollups(b: DepartmentBreakdown): DepartmentRollups {
  const devicesCombined = add(b.prosthetic, b.medical_support);
  return {
    devicesCombined,
    grandTotal: add(add(devicesCombined, b.physiotherapy), b.unclassified),
  };
}

/** صفوفُ العرض بترتيبها الثابت: الأقسامُ الثلاثة ثم التجميعان. */
export const REPORT_ROW_ORDER: readonly (Department | "devicesCombined" | "grandTotal")[] = [
  "prosthetic", "medical_support", "devicesCombined", "physiotherapy", "grandTotal",
] as const;

export const REPORT_ROW_LABELS: Record<string, string> = {
  ...DEPARTMENT_LABELS,
  devicesCombined: DEVICES_ROLLUP_LABEL,
  grandTotal: GRAND_TOTAL_LABEL,
  unclassified: "غير مبوَّب — بيانات قديمة",
};

// ── تصنيفُ المريض: بُعدٌ آخر لا قسمٌ رابع ───────────────────────────────

/**
 * تصنيفُ المريض — **جديدٌ أو قديم، ولا ثالث**.
 *
 * وهو بُعدٌ مستقلٌّ عن القسم السريري تماماً: مريضُ أطرافٍ قد يكون جديداً أو
 * قديماً، والقسمُ لا يقول شيئاً عن ذلك ولا العكس.
 *
 * **و«غير محدَّد» ليست قيمةً يُكتب بها**: هي وصفُ صفوفٍ قديمة تركت العمود
 * فارغاً، تظهر في التقارير مشكلةَ جودةِ بيانات لا خياراً ثالثاً. والكتابةُ
 * الجديدة تُلزَم بأحد الاثنين في الخادم وفي الواجهة معاً.
 */
export const PATIENT_CLASSIFICATIONS = ["new", "past"] as const;
export type PatientClassification = (typeof PATIENT_CLASSIFICATIONS)[number];

export const PATIENT_CLASSIFICATION_LABELS: Record<PatientClassification, string> = {
  new: "مريض جديد",
  past: "مريض قديم",
};

/** وسمُ الصفوف القديمة الفارغة — للعرض والمصالحة، لا للكتابة. */
export const UNSPECIFIED_CLASSIFICATION_LABEL = "غير محدَّد — بيانات قديمة";

export const isPatientClassification = (v: unknown): v is PatientClassification =>
  typeof v === "string" && (PATIENT_CLASSIFICATIONS as readonly string[]).includes(v);

// ── أقسامُ المريض الفعلية ────────────────────────────────────────────────

/**
 * الأقسامُ التي ينتمي إليها مريضٌ فعلاً — **بالدليل لا بالاستنتاج**.
 *
 * ══ العطبُ الذي تغلقه ══════════════════════════════════════════════════
 * كانت الإحصاءات تقول: «بلا علمِ أطرافٍ وبلا علمِ مساند ⟹ علاجٌ طبيعي».
 * فمريضٌ لم يُصنَّف بعد — أو أُنشئ ملفُّه ولم تُفتح له حالةٌ قطّ — كان
 * يُحتسَب في قسمٍ لم يدخله، فيتضخّم رقمُ العلاج الطبيعي بمن ليسوا منه.
 *
 * **والقاعدة الآن: علمٌ صريح أو حالةٌ فعلية.** ومَن لا دليلَ له لا يُحتسَب
 * في أيّ قسم — ويبقى في الإجمالي مرّةً واحدة، فالمجموعُ لا يكذب.
 *
 * ومريضٌ يحمل أكثر من قسمٍ **يُحتسب في كلٍّ منها**: مريضُ مساندَ وعلاجٍ
 * طبيعي معاً حقيقةٌ شائعة، وحصرُه في واحد يُنقص قسماً بلا سبب.
 */
export function departmentsOfPatient(p: {
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
  isPhysiotherapy?: boolean | null;
  /** أنواعُ حالات المريض الفعلية إن قُرئت — دليلٌ أقوى من العلم. */
  caseTypes?: readonly string[] | null;
}): Department[] {
  const out = new Set<Department>();
  if (p.isAmputee) out.add("prosthetic");
  if (p.isMedicalSupport) out.add("medical_support");
  if (p.isPhysiotherapy) out.add("physiotherapy");
  for (const t of p.caseTypes ?? []) if (isDepartment(t)) out.add(t);
  //  الترتيب ثابتٌ للعرض والاختبار معاً.
  return DEPARTMENTS.filter((d) => out.has(d));
}

/** مريضٌ بلا دليلِ انتماءٍ لأي قسم — يظهر في الإجمالي ولا يُنسَب. */
export const hasNoDepartment = (p: Parameters<typeof departmentsOfPatient>[0]): boolean =>
  departmentsOfPatient(p).length === 0;
