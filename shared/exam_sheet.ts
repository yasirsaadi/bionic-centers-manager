// **معاينةُ الطبيب على «استمارة المراجع» نفسِها** (§4.cq — المرحلةُ الثانية ب، ٢٠٢٦-١٠-٠٨).
//
// قرارُ المالك: «أن تكون معاينةُ الطبيب نفسَ الورقة تماماً التي ملأها الاستعلامات، وإزالةُ الحقول الزائدة، ووضعُ حقلٍ واحد اسمُه
// المعاينة الطبية ويظهر عند ملف المريض». فللأطراف والمساند:
//   • **الخاناتُ النصّيةُ الخمس** (الشكوى، الفحص السريري، التشخيص، الخطة، الملاحظات) صارت **خانةً واحدة «المعاينة الطبية»** —
//     تُحفَظ في عمود `diagnosis` القائم (لا ترحيل)، فكلُّ قارئٍ له اليوم (المراجعةُ الطبّية، المساعد) يقرؤها كما هي.
//   • **والطبيبُ يعدّل كلَّ ما كتبه الاستعلامات** في الورقة، ويُكتب التعديلُ في سجلّ التدقيق باسمه («إن احتجنا أن نعرف مَن غيّر»).
//   • والعلاجُ الطبيعيُّ لا يمسّه شيء: معاينتُه كما هي.
// والقاعدةُ هنا **مشتركة**: الشاشةُ تفحص بها قبل الإرسال، والخادمُ يردّ بها — فلا تنحرف إحداهما.
import { EXAM_FIELDS, type ExamFieldKey } from "./medical";
import {
  INTAKE_FIELD_LABELS, REFERRAL_OTHER_PERSON, isGovernorate, isInjuryDateStatus, mergeInjuryDate,
} from "./intake_sheet";
import { normalizePhone } from "./phone";

export const EXAM_SHEET_TEXT_LABEL = "المعاينة الطبية";
/** العمودُ الذي يحمل «المعاينة الطبية» — `diagnosis` القائم. */
export const EXAM_SHEET_TEXT_KEY: ExamFieldKey = "diagnosis";

/** **خاناتُ الجهاز بترتيب الورقة وألفاظها** — تقرؤها شاشةُ الاستعلامات مقفولةً ومعاينةُ الطبيب مفتوحةً، فلا تختلفان. */
export const SHEET_DEVICE_ROWS = [
  { key: "prostheticType", label: "نوع الطرف الصناعي" },
  { key: "kneeJointType", label: "نوع الركبة" },
  { key: "footType", label: "نوع القدم" },
  //  **وللطرف العلويّ** (قرارُ المالك ٢٠٢٦-١٠-١٠، §4.de): المرفقُ لما فوق المرفق، والكفُّ/اليدُ لكلّ علويّ.
  { key: "elbowType", label: "نوع المرفق" },
  { key: "handType", label: "نوع الكف / اليد" },
  { key: "socketType", label: "نوع السوكيت" },
  { key: "siliconType", label: "نوع السيليكون" },
] as const;

/** الأطرافُ والمساند وحدهما تُعايَن على الاستمارة. */
export const isSheetExamType = (t: unknown): t is "prosthetic" | "medical_support" =>
  t === "prosthetic" || t === "medical_support";

/**
 * **والعلاجُ الطبيعيُّ على استمارته هو** (§4.da، قرارُ المالك ٢٠٢٦-١٠-٠٩): حقولُ الاستعلامات نفسُها ومعها «سبب المراجعة»، ثمّ التقييمُ
 * الأوّليّ كاملاً، ثمّ «قرار الفاحص». شكلٌ آخر غيرُ ورقة الأجهزة — فدالّةٌ منفصلة لا توسيعٌ لتلك (يقرؤها كلُّ ما يخصّ الأجهزة).
 */
export const isPhysioSheetExamType = (t: unknown): t is "physiotherapy" => t === "physiotherapy";

/** حقولُ الاستعلامات في الورقة — بأسماء أعمدة `patients` — وهي ما يعدّله الطبيبُ منها. */
export const SHEET_PATIENT_KEYS = [
  "name", "phone", "governorate", "address", "referralSource", "referralSubSource", "hadPriorCenterHistory",
  "presentingComplaint",
  "age", "weight", "height", "injuryCause", "injuryDate", "injuryDateStatus", "generalNotes",
] as const;
export type SheetPatientKey = (typeof SHEET_PATIENT_KEYS)[number];

/** ما لا يُفرَّغ إن كان مكتوباً — حقولُ الاستمارة الإلزامية. («سبب المراجعة» في استمارة العلاج الطبيعي وحدها — ورقةُ الأجهزة لا ترسله.) */
const REQUIRED: ReadonlySet<string> = new Set(["name", "phone", "governorate", "address", "referralSource", "presentingComplaint", "age", "weight", "height", "injuryCause"]);
const NUMERIC: ReadonlySet<string> = new Set(["age", "weight", "height"]);

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
/** نصّان متساويان بعد القصّ — `null` والفراغُ سواء. */
const same = (a: unknown, b: unknown) => str(a) === str(b);

export interface SheetEdit {
  /** ما تغيّر فعلاً — بقيمته الجديدة، جاهزاً للكتابة على صفّ المريض. */
  patch: Record<string, unknown>;
  /** المفاتيحُ المرفوضة بترتيب الورقة — فراغٌ لمكتوبٍ إلزاميّ، أو قيمةٌ ليست صالحة. */
  missing: string[];
  message: string | null;
}

/**
 * **تعديلُ الطبيب لحقول الاستعلامات** — يُقارَن بما في الملفّ، فما لم يتغيّر لا يُكتب ولا يُدقَّق.
 *
 * **ولا قيدَ جديداً على الطبيب**: الملفُّ القديم الذي ينقصه حقلٌ (محافظةٌ لم تُسأل يومَ سُجّل) لا يُجبَر على إكماله —
 * يُفحَص **ما غيّره** وحده: لا يُفرَّغ إلزاميٌّ مكتوب، والمحافظةُ من القائمة، والعمرُ والوزنُ والطولُ أرقامٌ موجبة، والهاتفُ صالح،
 * و«من شخص آخر» تحتاج كيف عرف. وتاريخُ الإصابة بقاعدة التعديل نفسِها (`mergeInjuryDate`): ما اختاره الآن يغلب.
 */
export function prepareSheetEdit(existing: Record<string, unknown> | null | undefined, raw: unknown): SheetEdit {
  const ex = existing ?? {};
  const patch: Record<string, unknown> = {};
  const missing: string[] = [];
  let phoneReason: string | null = null;
  if (!raw || typeof raw !== "object") return { patch, missing, message: null };
  const r = raw as Record<string, unknown>;

  for (const k of SHEET_PATIENT_KEYS) {
    if (k === "injuryDate" || k === "injuryDateStatus" || r[k] === undefined) continue;
    if (k === "hadPriorCenterHistory") {
      //  ثلاثيٌّ كما في «تعديل مريض»: البولياناتُ الصريحة وحدها تُكتب.
      if (typeof r[k] === "boolean" && r[k] !== ex[k]) patch[k] = r[k];
      continue;
    }
    const next = str(r[k]);
    if (same(next, ex[k])) continue;
    if (!next) {
      if (REQUIRED.has(k)) missing.push(k);
      else patch[k] = null;
      continue;
    }
    if (k === "governorate" && !isGovernorate(next)) { missing.push(k); continue; }
    if (NUMERIC.has(k) && !(Number(next) > 0)) { missing.push(k); continue; }
    if (k === "phone") {
      const n = normalizePhone(next, str(ex.phoneCountry) || undefined);
      if (!n.ok) { missing.push(k); phoneReason = n.reason ?? null; continue; }
    }
    patch[k] = next;
  }

  //  «من شخص آخر» بلا «كيف عرف» ناقصة — بالقيمة بعد التعديل لا قبله.
  const source = patch.referralSource !== undefined ? patch.referralSource : ex.referralSource;
  const sub = patch.referralSubSource !== undefined ? patch.referralSubSource : ex.referralSubSource;
  if (patch.referralSource !== undefined) {
    if (source === REFERRAL_OTHER_PERSON && !str(sub)) missing.push("referralSubSource");
    if (source !== REFERRAL_OTHER_PERSON && str(ex.referralSubSource)) patch.referralSubSource = null;
    else if (source !== REFERRAL_OTHER_PERSON) delete patch.referralSubSource;
  }

  if (r.injuryDate !== undefined || r.injuryDateStatus !== undefined) {
    const m = mergeInjuryDate(
      r.injuryDate === undefined ? undefined : str(r.injuryDate),
      r.injuryDateStatus === undefined ? undefined : (isInjuryDateStatus(r.injuryDateStatus) ? r.injuryDateStatus : null),
      ex.injuryDate, ex.injuryDateStatus,
    );
    const had = Boolean(str(ex.injuryDate) || isInjuryDateStatus(ex.injuryDateStatus));
    if (!m.injuryDate && !m.injuryDateStatus && had) missing.push("injuryDate");
    else {
      if (!same(m.injuryDate, ex.injuryDate)) patch.injuryDate = m.injuryDate;
      if (!same(m.injuryDateStatus, ex.injuryDateStatus)) patch.injuryDateStatus = m.injuryDateStatus;
    }
  }

  const ordered = SHEET_PATIENT_KEYS.filter((k) => missing.includes(k));
  return {
    patch,
    missing: ordered,
    message: ordered.length
      ? (phoneReason && ordered.length === 1 ? `رقم الهاتف: ${phoneReason}`
        : `لا يُحفظ تعديلُ الاستمارة: ${ordered.map((k) => INTAKE_FIELD_LABELS[k] ?? k).join("، ")} — لا تُفرَّغ ولا تُكتب بقيمةٍ غير صالحة`)
      : null,
  };
}

export interface ExamNarrativeRow { key: ExamFieldKey; label: string; value: string }

/**
 * **ما يُعرَض من نصّ المعاينة** — في ملفّ المريض وطباعتها ونسخها السابقة.
 * معاينةُ جهازٍ نصُّها خانتُها الواحدة وحدها ⟵ «المعاينة الطبية». والقديمةُ بخاناتها الخمس تبقى بعناوينها كما كُتبت.
 */
/** **«ملاحظات الفاحص»** على استمارة العلاج الطبيعي — عمودُ `notes` القائم؛ و«التشخيص» عمودُ `diagnosis` باسمه. */
export const PHYSIO_SHEET_NOTES_LABEL = "ملاحظات الفاحص";

export function examNarrativeRows(caseType: unknown, e: Partial<Record<ExamFieldKey, string | null>> & { assessment?: unknown }): ExamNarrativeRow[] {
  const filled = EXAM_FIELDS.filter((f) => str(e[f.key]).length > 0);
  //  **معاينةُ العلاج الطبيعي على استمارتها** (§4.da): «التشخيص» باسمه، و`notes` هي «ملاحظات الفاحص».
  if (isPhysioSheetExamType(caseType) && e.assessment && typeof e.assessment === "object") {
    return filled.map((f) => ({ key: f.key, label: f.key === "notes" ? PHYSIO_SHEET_NOTES_LABEL : f.label, value: String(e[f.key]) }));
  }
  if (isSheetExamType(caseType) && filled.length === 1 && filled[0].key === EXAM_SHEET_TEXT_KEY) {
    return [{ key: EXAM_SHEET_TEXT_KEY, label: EXAM_SHEET_TEXT_LABEL, value: String(e[EXAM_SHEET_TEXT_KEY]) }];
  }
  return filled.map((f) => ({ key: f.key, label: f.label, value: String(e[f.key]) }));
}

/**
 * **تنقيحُ معاينة علاجٍ طبيعيّ قديمة على الاستمارة** (§4.da): «التشخيص» يبقى في خانته، والشكوى والفحصُ السريريّ والخطّةُ والملاحظاتُ
 * تُجمَع في «ملاحظات الفاحص» بعناوينها — لا يضيع منها حرف، والنسخةُ القديمة محفوظةٌ في السجلّ كالعادة.
 */
export function physioSheetNotesOf(e: Partial<Record<ExamFieldKey, string | null>>): string {
  const others = EXAM_FIELDS.filter((f) => f.key !== "diagnosis" && str(e[f.key]).length > 0);
  if (others.length === 1 && others[0].key === "notes") return str(e.notes);
  return others.map((f) => `${f.label}: ${str(e[f.key])}`).join("\n");
}

/** **تعديلُ معاينةٍ قديمة على الاستمارة**: خاناتُها الخمس تُجمَع في الخانة الواحدة بعناوينها — لا يضيع منها حرف. */
export function examSheetTextOf(caseType: unknown, e: Partial<Record<ExamFieldKey, string | null>>): string {
  const rows = examNarrativeRows(caseType, e);
  if (rows.length === 1 && rows[0].key === EXAM_SHEET_TEXT_KEY) return rows[0].value;
  return rows.map((r) => `${r.label}: ${r.value}`).join("\n");
}
