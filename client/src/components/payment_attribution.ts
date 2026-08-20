// **هذه الدفعة تخصّ أي حالة؟** — ويُسأل فقط حين يكون السؤالُ حقيقياً.
//
// ══ العطبُ الذي يغلقه (لاحظه المالك على الإنتاج) ═══════════════════════
// مريضُ أطرافٍ يفتح «تسجيل دفعة مالية»، فتُعرَض عليه قائمةُ **«نوع العلاج»**
// تحمل الروبوت والتمارين والأبر الصينية والأطراف والمساند — ويُطلَب منه أن
// يختار. وهو مريضُ أطرافٍ ليس غير: الجوابُ معروفٌ قبل أن يُسأل.
//
// وثمنُ السؤال الزائد ليس بطئاً فقط: **الموظّف يخطئ**. قائمةٌ تُفتح عشر
// مرّاتٍ في اليوم يُختار فيها البندُ الأول أو الأقرب، فتُوسَم دفعةُ أطرافٍ
// «تمارين تأهيلية» — ويذهب المال إلى القسم الخطأ في كلّ تقرير بعده.
//
// ══ والاسمُ نفسُه كان خطأً ═════════════════════════════════════════════
// «نوع العلاج» سؤالٌ سريريّ. والمقصودُ تجاريٌّ بحت: **أيُّ حسابٍ يُنقَص**.
// فحين يبقى السؤالُ ضرورياً (مريضٌ يحمل حالتين) يُسأل بصيغته الصحيحة:
// «هذه الدفعة تخصّ أي حالة؟» — وبحالات المريض وحدها لا بقائمة النظام كلّها.
//
// ══ والعلاجُ الطبيعي لا يُمَسّ ═════════════════════════════════════════
// جلساتُه لها أنواعُها وأسعارُها وعدّادُها — وذاك منطقٌ حقيقيٌّ لا سؤالٌ
// زائد. فمَن حالتُه علاجٌ طبيعي يبقى على شاشته كما هي حرفاً.

export type DeviceCaseType = "prosthetic" | "medical_support";

/** وسمُ الدفعة كما يُخزَّن — نصُّ `payments.payment_treatment_type`. */
export const CASE_PAYMENT_TAG: Record<DeviceCaseType, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
};

export const CASE_LABEL: Record<DeviceCaseType | "physiotherapy", string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};

/** ما يُعرَف عن المريض وعن السياق الذي فُتحت منه النافذة. */
export interface PaymentContext {
  isPhysiotherapy?: boolean | null;
  isAmputee?: boolean | null;
  isMedicalSupport?: boolean | null;
  /**
   * الحالةُ التي فُتحت النافذةُ من تبويبها، إن فُتحت من تبويبِ حالة.
   * **تسبق كلَّ استنتاج**: الموظّف قال أين هو، فلا يُسأل ثانيةً.
   */
  selectedCaseType?: string | null;
}

export type PaymentAttribution =
  /** حالةٌ واحدة معروفة ⟶ تُوسَم تلقائياً، بلا قائمة. */
  | { mode: "auto"; caseType: DeviceCaseType; tag: string }
  /** علاجٌ طبيعي ⟶ شاشتُه كما هي: أنواعٌ وجلساتٌ وأسعار. */
  | { mode: "physio" }
  /** غموضٌ حقيقيّ ⟶ يُسأل بحالات المريض وحدها. */
  | { mode: "ask"; choices: Array<{ caseType: DeviceCaseType | "physiotherapy"; label: string }> }
  /** لا حالةَ معروفة إطلاقاً (ملفٌّ قديم بلا تصنيف) ⟶ القائمةُ الكاملة. */
  | { mode: "unknown" };

const isDeviceCase = (v: unknown): v is DeviceCaseType =>
  v === "prosthetic" || v === "medical_support";

/**
 * **ماذا تسأل النافذةُ عن دفعةٍ جديدة** — أو لا تسأل.
 *
 * ولا تُستعمل لتصحيح دفعةٍ قديمة: التصحيحُ يحتاج القائمةَ الأوسع لأنه يصلح
 * وسماً خاطئاً قد لا يطابق حالات المريض الحالية أصلاً.
 */
export function paymentAttribution(ctx: PaymentContext | null | undefined): PaymentAttribution {
  //  ① سياقٌ صريح: الموظّف يقف في تبويب حالةٍ بعينها.
  const picked = ctx?.selectedCaseType;
  if (isDeviceCase(picked)) {
    return { mode: "auto", caseType: picked, tag: CASE_PAYMENT_TAG[picked] };
  }
  if (picked === "physiotherapy") return { mode: "physio" };

  //  ② وإلّا فحالاتُ المريض كما هي على ملفّه.
  const owned: Array<DeviceCaseType | "physiotherapy"> = [];
  if (ctx?.isAmputee === true) owned.push("prosthetic");
  if (ctx?.isMedicalSupport === true) owned.push("medical_support");
  if (ctx?.isPhysiotherapy === true) owned.push("physiotherapy");

  //  ملفٌّ قديمٌ بلا تصنيف: لا يُخمَّن له شيء — تبقى القائمةُ الكاملة كما
  //  كانت، فهذا هو المخرج الذي وُضعت له.
  if (owned.length === 0) return { mode: "unknown" };

  if (owned.length === 1) {
    const only = owned[0];
    if (only === "physiotherapy") return { mode: "physio" };
    return { mode: "auto", caseType: only, tag: CASE_PAYMENT_TAG[only] };
  }

  //  ③ غموضٌ حقيقيّ — ويُسأل **بحالات المريض وحدها**.
  return {
    mode: "ask",
    choices: owned.map((c) => ({ caseType: c, label: CASE_LABEL[c] })),
  };
}

/** عنوانُ السؤال حين يُطرَح — **ليس «نوع العلاج»**. */
export const PAYMENT_CASE_QUESTION = "هذه الدفعة تخص أي حالة؟";

/**
 * هل تُعرَض قائمةُ أنواع العلاج وجلساتها؟
 *
 * `physio` وحدها و`unknown` (الملفّ القديم). أمّا الحالةُ المعروفة فتُوسَم
 * تلقائياً، والغامضةُ تُسأل بسؤالها الصحيح ثم تُوسَم.
 */
export function showsTreatmentTypes(a: PaymentAttribution): boolean {
  return a.mode === "physio" || a.mode === "unknown";
}
