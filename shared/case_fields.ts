// The clinical description of a case, in ONE place.
//
// These field sets and option lists were designed by the owner and were, until
// now, duplicated across CreatePatient, EditPatient, AssignExpertDialog,
// PhysioPricingDialog and PatientDetails. The doctor's exam needs the very same
// fields — the doctor is now the one who decides them — so rather than copy
// them a sixth time they are lifted here verbatim and imported by everyone.
//
// Nothing here is new or reworded. Every label, placeholder and option value is
// carried over exactly as it already exists in the app, so records written
// before and after this change remain directly comparable.

// ── أطراف صناعية ────────────────────────────────────────────────────────────
// Verbatim from AssignExpertDialog.tsx PROSTHETIC_SPECS. Free text by design:
// the owner never enumerated these, and inventing a picker here would silently
// reject values reception has been entering for months.
export interface SpecField {
  key: string;
  label: string;
  placeholder: string;
  numeric?: boolean;
}

export const PROSTHETIC_SPECS: SpecField[] = [
  { key: "prostheticType", label: "نوع الطرف الصناعي", placeholder: "مثال: طرف سفلي ذكي، ركبة ميكانيكية…" },
  { key: "siliconType", label: "نوع السليكون", placeholder: "مثال: سليكون طبي…" },
  { key: "siliconSize", label: "حجم السليكون", placeholder: "مثال: 3، 4، 5…", numeric: true },
  { key: "suspensionSystem", label: "نظام التعليق", placeholder: "مثال: حزام، فاكيوم، سليكون…" },
  { key: "footType", label: "نوع القدم", placeholder: "مثال: قدم كربون، قدم مرنة…" },
  { key: "footSize", label: "قياس الحذاء الذي يلبسه المريض", placeholder: "مثال: 42، 43…", numeric: true },
  { key: "kneeJointType", label: "نوع مفصل الركبة", placeholder: "مثال: مفصل هيدروليكي، مفصل ميكانيكي…" },
];

// ── نوع البتر (the amputation builder) ──────────────────────────────────────
// Verbatim from CreatePatient.tsx, where these lists lived only as inline
// <SelectItem> JSX (repeated six times each across CreatePatient/EditPatient).
// The doctor's exam is where the amputation is actually determined, so the
// vocabulary is lifted here and the composed string format is kept
// byte-identical — EditPatient's reverse-parser and the expert order page both
// read `amputationSite` and must keep understanding doctor-written values.

/** نوع البتر — the three top-level variants, exactly as on the patient form. */
export const AMPUTATION_TYPE_OPTIONS = [
  { value: "single", label: "احادي" },
  { value: "double", label: "ثنائي" },
  { value: "silicone", label: "اطراف سليكونية تعويضية" },
] as const;

/** Lower-limb amputation levels — verbatim, value === label. */
export const LOWER_AMPUTATION_DETAILS = [
  "جوبارت", "سايمز", "تحت الركبة", "خلال الركبة", "فوق الركبة", "خلال الحوض",
];

/** Upper-limb amputation levels — verbatim, value === label. */
export const UPPER_AMPUTATION_DETAILS = [
  "اصبع", "خلال الكف", "خلال الرسغ", "تحت المرفق", "خلال المرفق", "فوق المرفق", "خلال الكتف",
];

/** أنواع الأطراف السليكونية التعويضية — verbatim, value === label. */
export const SILICONE_PARTS = ["اذن", "انف", "محجر عين", "اصبع", "كف"];

/**
 * The structured parts the builder collects. All optional strings: an absent
 * `amputationType` means the doctor didn't touch the builder at all, and
 * buildAmputationSite returns "" for it.
 */
export interface AmputationParts {
  amputationType?: string; // "single" | "double" | "silicone"
  singleLimb?: string;     // "upper" | "lower"
  singleSide?: string;     // "right" | "left"
  singleDetail?: string;
  doubleLimbType?: string; // "upper" | "lower" | "both"
  doubleRightDetail?: string;
  doubleLeftDetail?: string;
  bothRightLimb?: string;  // "upper" | "lower"
  bothLeftLimb?: string;
  bothRightDetail?: string;
  bothLeftDetail?: string;
  siliconePart?: string;
  siliconeSide?: string;   // "right" | "left" | "both"
  siliconeNotes?: string;
}

/**
 * Compose the `amputationSite` string EXACTLY as CreatePatient's useEffect
 * does — same segments, same ` - ` / ` | ` separators, same `-` placeholders,
 * same "no side for انف" rule. One format, wherever the record was written.
 */
export function buildAmputationSite(p: AmputationParts): string {
  if (p.amputationType === "single") {
    const limbText = p.singleLimb === "upper" ? "طرف علوي" : "طرف سفلي";
    const sideText = p.singleSide === "right" ? "يمين" : "يسار";
    let site = `احادي - ${limbText} - ${sideText}`;
    if (p.singleDetail) site += ` - ${p.singleDetail}`;
    return site;
  }
  if (p.amputationType === "double") {
    if (p.doubleLimbType === "upper" || p.doubleLimbType === "lower") {
      let site = p.doubleLimbType === "upper" ? "ثنائي - علوي" : "ثنائي - سفلي";
      if (p.doubleRightDetail || p.doubleLeftDetail) {
        site += ` | يمين: ${p.doubleRightDetail || "-"} | يسار: ${p.doubleLeftDetail || "-"}`;
      }
      return site;
    }
    const rightLimbText = p.bothRightLimb === "upper" ? "علوي" : "سفلي";
    const leftLimbText = p.bothLeftLimb === "upper" ? "علوي" : "سفلي";
    let site = "ثنائي - علوي وسفلي";
    site += ` | يمين (${rightLimbText}): ${p.bothRightDetail || "-"}`;
    site += ` | يسار (${leftLimbText}): ${p.bothLeftDetail || "-"}`;
    return site;
  }
  if (p.amputationType === "silicone") {
    let site = `اطراف سليكونية تعويضية - ${p.siliconePart || "-"}`;
    if (p.siliconePart && p.siliconePart !== "انف") {
      const sideText =
        p.siliconeSide === "right" ? "يمين" : p.siliconeSide === "left" ? "يسار" : "كلا الجانبين";
      site += ` - ${sideText}`;
    }
    if (p.siliconeNotes) site += ` | ملاحظات: ${p.siliconeNotes}`;
    return site;
  }
  return "";
}

// ── مساند طبية ──────────────────────────────────────────────────────────────
// Verbatim from AssignExpertDialog.tsx SUPPORT_SPECS.
export const SUPPORT_SPECS: SpecField[] = [
  { key: "supportType", label: "نوع المسند", placeholder: "مثال: مسند ظهر، مسند رقبة…" },
];

/** جهة الإصابة — free text for devices, matching the patient form's Input. */
export const INJURY_SIDE_PLACEHOLDER = "مثال: يمين، يسار، كلا الجانبين...";

// ── علاج طبيعي ──────────────────────────────────────────────────────────────
// The injury-type list exists in three slightly different copies in the app:
// 29 items on the registration form, 33 on the treatment-plan form, and a
// 34-item superset in the i18n table that contains every value used by either.
// The doctor writes the definitive clinical record, so the SUPERSET is used
// here — a doctor must be able to record a tumour or a burn, and every value
// remains one the app already knows how to display.
export const INJURY_TYPE_OPTIONS = [
  "التهاب اوتار", "وثي", "قطع اوتار", "تشنج عضلي", "إصابة عصب محيطي", "التهاب اعصاب سكري",
  "سوفان", "انزلاق ديسك", "انزلاق فقرات", "جنف", "جلطة دماغية", "نزف دماغي",
  "التهاب سحايا", "تصلب لويحي", "باركنسون", "غيلان باريه", "ضمور عضلي", "ضمور عصبي",
  "شلل دماغ", "شلل اطفال", "تأخر نفسي حركي", "اصابة حبل شوكي", "التهاب حبل شوكي",
  "شلل العصب الوجهي", "إصابة اربطة", "قطع جزئي في العضلات", "تبديل مفصل", "كسر",
  "نتوء عظمي", "ورم حميد", "ورم خبيث", "استئصال اورام", "حروق", "أخرى",
];

// Verbatim from CreatePatient.tsx injuryAreaOptions (identical in EditPatient
// and PatientDetails — all three agree).
export const INJURY_AREA_OPTIONS = [
  "الرأس", "الرقبة", "الصدر", "القطن", "العمود الفقري", "الكتف",
  "منطقة الظهر العلوية", "منطقة الظهر السفلية", "العضد", "المرفق", "الساعد", "المعصم",
  "الرسغ", "اليد", "الاصابع", "الحوض", "الورك", "الفخذ",
  "الركبة", "الساق", "الكاحل", "القدم", "اصابع القدم",
];

/** Verbatim from the injuries builder's side Select. */
export const INJURY_SIDE_OPTIONS = ["يمين", "يسار", "كلاهما"];

export interface InjuryEntry {
  type: string;
  area: string;
  side: string;
}

/**
 * Serialize injury rows exactly as CreatePatient does, so a doctor-written set
 * is byte-identical to a reception-written one: empty rows dropped, and the
 * legacy joined strings kept in sync with the Arabic comma separator.
 */
export function serializeInjuries(entries: InjuryEntry[]): {
  injuries: string;
  injuryType: string;
  injuryArea: string;
} {
  const filtered = entries.filter((e) => e.type || e.area);
  return {
    injuries: filtered.length > 0 ? JSON.stringify(filtered) : "",
    injuryType: entries.map((e) => e.type).filter(Boolean).join("، "),
    injuryArea: entries.map((e) => e.area).filter(Boolean).join("، "),
  };
}

/** Parse the stored injuries JSON back into rows, tolerating bad data. */
export function parseInjuries(raw: unknown): InjuryEntry[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e: any) => e && (e.type || e.area))
      .map((e: any) => ({ type: e.type ?? "", area: e.area ?? "", side: e.side ?? "" }));
  } catch {
    return [];
  }
}

/** تشخيص الحالة / نوع المرض — free text, as on the registration form. */
export const DISEASE_TYPE_LABEL = "تشخيص الحالة / نوع المرض";
export const DISEASE_TYPE_PLACEHOLDER = "مثال: شلل نصفي، إصابة عمود فقري...";

/**
 * Which spec fields belong to a specialty. `physiotherapy` has none — its
 * clinical content is the injuries list, the diagnosis and the prescribed
 * course, all handled separately.
 */
export function specsForSpecialty(caseType: string): SpecField[] {
  if (caseType === "prosthetic") return PROSTHETIC_SPECS;
  if (caseType === "medical_support") return SUPPORT_SPECS;
  return [];
}
