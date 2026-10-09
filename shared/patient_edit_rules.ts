// **مَن يعدّل ماذا في ملفّ المريض، ومتى** (§4.db — قرارُ المالك ٢٠٢٦-١٠-٠٩).
//
// قولُه: «كلُّ معلومةٍ يدخلها موظّفُ الاستعلامات يجب أن يتمكّن من تعديلها بعد الحفظ وقبل المعاينة… ولكن بعد المعاينة تكون صلاحيةَ
// المسؤول ومدير الفرع فقط» — للأطراف والمساند وللعلاج الطبيعي. وجوابُه على السؤالين: **الهاتفُ والعنوانُ (والمحافظة) يبقيان للاستعلامات
// بعد المعاينة**، و**مديرُ الفرع يعدّل بعدها بمفتاح «تعديل مرضى»** («المفتاحُ يحكم لا الدور»).
//
// فالقاعدةُ هنا **مشتركة**: الخادمُ يردّ بها (`PUT /api/patients/:id`) والشاشةُ تقفل بها الخانات (`EditPatient`) — فلا تنحرفان.
//   • **الاتّصالُ مفتوحٌ دائماً**: الهاتف، ورمزُ الدولة، والمحافظة، والعنوان، وإشعاراتُ واتساب.
//   • **البياناتُ المشتركة** تُقفَل بعد أوّل معاينةٍ فعّالة للمريض في أيّ قسم.
//   • **خاناتُ كلّ قسم** تُقفَل بعد معاينة ذلك القسم نفسِه — مريضُ أطرافٍ عوين ثمّ أُضيف له علاجٌ طبيعي: «سبب المراجعة» يبقى
//     للاستعلامات حتى يعاينه الأخصائيّ.
//   • **ما يكتبه الفاحص** (التشخيص، ومواصفاتُ الجهاز، والعلاجُ الموصوف) لا يعدّله الاستعلاماتُ قبل المعاينة ولا بعدها.
//   • **المسؤولُ ومديرُ الفرع** (ومعه المفتاح — يفرضه بابُ التعديل نفسُه) لا قفلَ عليهما. والفاحصُ يعدّل من داخل معاينته كما كان.
// و«المطلوب» على طلب الجهاز نفسِه، بقاعدته: للاستعلامات ما دام الجهازُ ينتظر المعاينة (`requestedItemEditable`).
import { hasRole, type RoleHolder } from "./user_roles";
import { injuriesWithLegacyFallback, parseInjuries } from "./case_fields";
import { mergeInjuryDate } from "./intake_sheet";

export type EditCaseType = "prosthetic" | "medical_support" | "physiotherapy";

/** الاتّصالُ — يتغيّر مع الوقت ولا يمسّ القرارَ الطبيّ، فيبقى للاستعلامات دائماً. */
export const ALWAYS_OPEN_FIELDS = ["phone", "phoneCountry", "governorate", "address", "whatsappNotificationsEnabled"] as const;

/** ما يدخله الاستعلاماتُ لكلّ مريض — يُقفَل بعد أوّل معاينةٍ في أيّ قسم. */
export const SHARED_INTAKE_FIELDS = [
  "name", "age", "weight", "height",
  "referralSource", "referralSubSource", "referralNotes", "hadPriorCenterHistory", "patientClassification",
  "injuryCause", "injuryDate", "injuryDateStatus", "generalNotes",
] as const;

/** ما يدخله الاستعلاماتُ لقسمٍ بعينه — يُقفَل بعد معاينة ذلك القسم. */
export const DEPARTMENT_INTAKE_FIELDS: Record<EditCaseType, readonly string[]> = {
  prosthetic: ["amputationSite"],
  medical_support: ["supportType", "injurySide"],
  //  الإصاباتُ اختياريةٌ في استمارة العلاج الطبيعي (يكملها الفاحص)، وعموداها القديمان يتبعانها.
  physiotherapy: ["presentingComplaint", "injuries", "injuryType", "injuryArea"],
};

/** ما يكتبه الفاحصُ على الملفّ — ليس من عمل الاستعلامات في أيّ وقت. */
export const EXAMINER_FIELDS = [
  "diseaseType", "treatmentType", "physioPlan",
  "prostheticType", "siliconType", "siliconSize", "suspensionSystem", "footType", "footSize", "kneeJointType",
] as const;

/** عناوينُ الخانات بالعربية — لرسالة الرفض وللسجلّ. */
export const PATIENT_EDIT_LABELS: Record<string, string> = {
  name: "الاسم", age: "العمر", weight: "الوزن", height: "الطول",
  referralSource: "الجهة المحوِّلة", referralSubSource: "كيف عرف الشخص الآخر بالمركز", referralNotes: "ملاحظة الجهة",
  hadPriorCenterHistory: "تعامل سابق مع المركز", patientClassification: "التصنيف",
  injuryCause: "سبب الإصابة", injuryDate: "تاريخ الإصابة", injuryDateStatus: "تاريخ الإصابة (منذ الولادة / غير معروف)",
  generalNotes: "الملاحظات",
  amputationSite: "تعريف البتر", supportType: "نوع المسند", injurySide: "جهة الإصابة",
  presentingComplaint: "سبب المراجعة", injuries: "الإصابات", injuryType: "نوع الإصابة", injuryArea: "منطقة الإصابة",
  diseaseType: "التشخيص", treatmentType: "نوع العلاج", physioPlan: "العلاج الموصوف",
  prostheticType: "نوع الطرف الصناعي", siliconType: "نوع السليكون", siliconSize: "حجم السليكون",
  suspensionSystem: "نظام التعليق", footType: "نوع القدم", footSize: "قياس القدم", kneeJointType: "نوع مفصل الركبة",
};

/** **المسؤولُ ومديرُ الفرع** — لا قفلَ عليهما (والمفتاحُ يفرضه بابُ التعديل نفسُه قبل هذه القاعدة). */
export function isPrivilegedPatientEditor(s: (RoleHolder & { isAdmin?: unknown }) | null | undefined): boolean {
  if (!s) return false;
  return s.isAdmin === true || hasRole(s, "admin") || hasRole(s, "branch_manager");
}

export interface PatientEditState {
  privileged: boolean;
  /** للمريض معاينةٌ فعّالة في أيّ قسم. */
  examinedAny: boolean;
  /** الأقسامُ التي عُوينت (معاينةٌ فعّالة). */
  examinedTypes: readonly string[];
}

/** الخاناتُ المقفولة على هذا المحرّر لهذا المريض الآن. */
export function lockedPatientFields(s: PatientEditState): Set<string> {
  const out = new Set<string>();
  if (s.privileged) return out;
  EXAMINER_FIELDS.forEach((k) => out.add(k));
  if (s.examinedAny) SHARED_INTAKE_FIELDS.forEach((k) => out.add(k));
  for (const t of Object.keys(DEPARTMENT_INTAKE_FIELDS) as EditCaseType[]) {
    if (s.examinedTypes.includes(t)) DEPARTMENT_INTAKE_FIELDS[t].forEach((k) => out.add(k));
  }
  return out;
}

/** لماذا الخانةُ مقفولة — جملةٌ تُقال للموظّف بجانبها. */
export function lockReason(field: string, s: PatientEditState): string | null {
  if (!lockedPatientFields(s).has(field)) return null;
  if ((EXAMINER_FIELDS as readonly string[]).includes(field)) return "يكتبها الفاحص في المعاينة";
  return "بعد المعاينة يعدّلها المسؤول أو مدير الفرع";
}

const str = (v: unknown): string =>
  v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : typeof v === "number" || typeof v === "boolean" ? String(v) : JSON.stringify(v);

const injuriesKey = (entries: { type: string; area: string; side: string }[]): string =>
  JSON.stringify(entries.map((e) => ({ type: str(e.type), area: str(e.area), side: str(e.side) })).filter((e) => e.type || e.area));

/**
 * **أغيّر المرسَلُ قيمةً مخزّنة؟** — بالقيمة لا بحضور المفتاح: «تعديل مريض» يرسل الكائنَ كاملاً في كلّ حفظ.
 * النصُّ بعد القصّ، والفراغُ و`null` سواء، والإصاباتُ بمعناها (الصفوفُ الفارغة تسقط، والملفُّ القديم بعموديه).
 */
export function editValueChanged(field: string, sent: unknown, stored: Record<string, unknown>): boolean {
  if (sent === undefined) return false;
  if (field === "hadPriorCenterHistory") return typeof sent === "boolean" && sent !== stored[field];
  if (field === "injuries") {
    const before = injuriesWithLegacyFallback(stored.injuries, stored.injuryType, stored.injuryArea);
    return injuriesKey(parseInjuries(typeof sent === "string" ? sent : "")) !== injuriesKey(before);
  }
  if (field === "physioPlan") return JSON.stringify(sent ?? null) !== JSON.stringify(stored[field] ?? null);
  return str(sent) !== str(stored[field]);
}

export interface EditLockResult {
  /** الخاناتُ المقفولة التي غيّرها المرسَل — تُردّ. */
  changed: string[];
  /** الخاناتُ المقفولة التي أُرسلت بلا تغيير — تُسقَط من التعديل فلا تُكتب. */
  dropped: string[];
}

/**
 * **يطبّق القفلَ على تعديلٍ واحد**: ما لم يتغيّر من المقفول يُسقَط من `patch` (يُعدّله في مكانه)، وما تغيّر يُعاد ليُردّ الطلب.
 * وتاريخُ الإصابة بقاعدة التعديل نفسِها (`mergeInjuryDate`): التاريخُ وحالتُه زوجٌ واحد — يُقاس ما سيُكتب لا ما أُرسل.
 * والإصاباتُ وعموداها القديمان زوجٌ كذلك: إن لم تتغيّر الإصاباتُ بمعناها سقط العمودان المشتقّان معها.
 */
export function applyEditLocks(patch: Record<string, unknown>, stored: Record<string, unknown>, locked: ReadonlySet<string>): EditLockResult {
  const changed: string[] = [];
  const dropped: string[] = [];
  const drop = (k: string) => { if (patch[k] !== undefined) { delete patch[k]; dropped.push(k); } };

  if ((locked.has("injuryDate") || locked.has("injuryDateStatus"))
    && (patch.injuryDate !== undefined || patch.injuryDateStatus !== undefined)) {
    const m = mergeInjuryDate(patch.injuryDate, patch.injuryDateStatus, stored.injuryDate, stored.injuryDateStatus);
    if (str(m.injuryDate) === str(stored.injuryDate) && str(m.injuryDateStatus) === str(stored.injuryDateStatus)) {
      drop("injuryDate"); drop("injuryDateStatus");
    } else {
      changed.push("injuryDate");
    }
  }

  if (locked.has("injuries") && (patch.injuries !== undefined || patch.injuryType !== undefined || patch.injuryArea !== undefined)) {
    const sentInjuries = patch.injuries !== undefined ? patch.injuries
      : JSON.stringify(injuriesWithLegacyFallback("", patch.injuryType ?? stored.injuryType, patch.injuryArea ?? stored.injuryArea));
    if (editValueChanged("injuries", sentInjuries, stored)) changed.push("injuries");
    else { drop("injuries"); drop("injuryType"); drop("injuryArea"); }
  }

  for (const k of Object.keys(patch)) {
    if (!locked.has(k) || k === "injuryDate" || k === "injuryDateStatus" || k === "injuries" || k === "injuryType" || k === "injuryArea") continue;
    if (editValueChanged(k, patch[k], stored)) changed.push(k);
    else drop(k);
  }
  return { changed, dropped };
}

/** رسالةُ الرفض — تسمّي الخانات بعناوينها، وتقول مَن يعدّلها. */
export function editLockMessage(changed: readonly string[]): string {
  const examiner = changed.filter((k) => (EXAMINER_FIELDS as readonly string[]).includes(k));
  const intake = changed.filter((k) => !examiner.includes(k));
  const parts: string[] = [];
  if (intake.length) parts.push(`بعد المعاينة يعدّل هذه الخانات المسؤولُ أو مديرُ الفرع: ${intake.map((k) => PATIENT_EDIT_LABELS[k] ?? k).join("، ")}`);
  if (examiner.length) parts.push(`هذه يكتبها الفاحصُ في المعاينة: ${examiner.map((k) => PATIENT_EDIT_LABELS[k] ?? k).join("، ")}`);
  return `لم يُحفظ التعديل — ${parts.join(" · ")}`;
}

/**
 * **«المطلوب» على طلب جهاز**: الاستعلاماتُ ما دام ينتظر المعاينة، والمسؤولُ ومديرُ الفرع بعدها أيضاً ما دام بلا سعرٍ معتمَد ولا
 * تصنيع (حدُّ `setEpisodeRequestedItemTx` نفسُه — الحَكَمُ تحت القفل).
 */
export function requestedItemEditable(p: { privileged: boolean; status: string; agreedCost: number; caseType: string }): boolean {
  if (p.caseType !== "prosthetic") return false;
  if (p.status === "awaiting_exam") return true;
  return p.privileged && p.status === "examined" && !(p.agreedCost > 0);
}
