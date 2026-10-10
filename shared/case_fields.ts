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

/** نوع البتر — the three top-level variants, exactly as on the patient form; and «متعدد» (owner, 2026-10-10, §4.de). */
export const AMPUTATION_TYPE_OPTIONS = [
  { value: "single", label: "احادي" },
  { value: "double", label: "ثنائي" },
  { value: "silicone", label: "اطراف سليكونية تعويضية" },
  { value: "multi", label: "متعدد (أطراف مختلفة)" },
] as const;

/** Lower-limb amputation levels — verbatim, value === label. */
export const LOWER_AMPUTATION_DETAILS = [
  "جوبارت", "سايمز", "تحت الركبة", "خلال الركبة", "فوق الركبة", "خلال الحوض",
];

/** Upper-limb amputation levels — verbatim, value === label. */
export const UPPER_AMPUTATION_DETAILS = [
  "اصبع", "خلال الكف", "خلال الرسغ", "تحت المرفق", "خلال المرفق", "فوق المرفق", "خلال الكتف",
];

/** أنواع الأطراف السليكونية التعويضية — verbatim, value === label. «قدم» أضافها المالك ٢٠٢٦-١٠-١٠ (§4.de). */
export const SILICONE_PARTS = ["اذن", "انف", "محجر عين", "اصبع", "كف", "قدم"];

// ── «متعدد» — أطرافٌ مختلفة طرفاً طرفاً (قرارُ المالك ٢٠٢٦-١٠-١٠، §4.de) ─────────
// «لا تترك حالةً تأتي للمركز ويبقى الطبيب أو موظّف الاستعلامات محتاراً»: علويٌّ وسفليٌّ من الجهة نفسِها، وطرفٌ عاديٌّ مع قطعةٍ سليكونية،
// وقطعتان سليكونيّتان مختلفتان، وثلاثةُ أطرافٍ أو أربعة. لكلّ طرفٍ: الموضعُ والجهةُ والنوعُ والمستوى (أو القطعة).
export type LimbRegion = "upper" | "lower" | "face";
export interface AmputationLimb {
  region?: string;  // "upper" | "lower" | "face"
  side?: string;    // "right" | "left" | "" (الأنفُ بلا جهة)
  kind?: string;    // "prosthetic" | "silicone" — والوجهُ سليكونيٌّ دائماً
  detail?: string;  // المستوى، أو القطعةُ السليكونية
}

export const LIMB_REGION_OPTIONS = [
  { value: "lower", label: "سفلي" },
  { value: "upper", label: "علوي" },
  { value: "face", label: "الوجه" },
] as const;
export const LIMB_KIND_OPTIONS = [
  { value: "prosthetic", label: "طرف صناعي" },
  { value: "silicone", label: "سليكوني" },
] as const;
/** قطعُ الوجه السليكونية، وقطعُ اليد والقدم — من `SILICONE_PARTS` نفسِها. */
export const FACE_SILICONE_PARTS = ["اذن", "انف", "محجر عين"];
export const UPPER_SILICONE_PARTS = ["اصبع", "كف"];
export const LOWER_SILICONE_PARTS = ["قدم"];
/** رمزُ قطعة الوجه في مفتاح الطرف (`left-ear`) — مفاتيحُ ثابتة لا تتغيّر بتغيّر اللفظ. */
export const FACE_PART_CODE: Record<string, string> = { "اذن": "ear", "انف": "nose", "محجر عين": "orbit" };

/** ما يُختار في خانة «المستوى / القطعة» لطرفٍ — بموضعه ونوعه. */
export function limbDetailOptions(l: AmputationLimb): string[] {
  if (l.region === "face") return FACE_SILICONE_PARTS;
  if (l.kind === "silicone") return l.region === "upper" ? UPPER_SILICONE_PARTS : l.region === "lower" ? LOWER_SILICONE_PARTS : [];
  return l.region === "upper" ? UPPER_AMPUTATION_DETAILS : l.region === "lower" ? LOWER_AMPUTATION_DETAILS : [];
}

/** هل يحتاج الطرفُ جهة؟ — كلُّها إلّا الأنف. */
export const limbNeedsSide = (l: AmputationLimb): boolean => !(l.region === "face" && l.detail === "انف");

/**
 * **مفتاحُ الطرف** — ثابتٌ يُبنى من جهته وموضعه (`left-lower`، `right-upper`) أو من قطعة الوجه (`left-ear`، `mid-nose`)؛ فلا طرفان بمفتاحٍ
 * واحد (طرفٌ سفليٌّ أيسر واحد)، ومواصفاتُه في الوصفة `footType:left-lower`. و`null` حين لا يكتمل.
 */
export function amputationLimbKey(l: AmputationLimb): string | null {
  const side = limbNeedsSide(l) ? (l.side === "right" || l.side === "left" ? l.side : null) : "mid";
  if (!side) return null;
  if (l.region === "face") { const c = FACE_PART_CODE[l.detail ?? ""]; return c ? `${side}-${c}` : null; }
  return l.region === "upper" || l.region === "lower" ? `${side}-${l.region}` : null;
}

const LIMB_SIDE_TEXT: Record<string, string> = { right: "يمين", left: "يسار" };
const LIMB_REGION_TEXT: Record<string, string> = { upper: "علوي", lower: "سفلي", face: "الوجه" };

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
  limbs?: AmputationLimb[]; // «متعدد» وحده
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
  if (p.amputationType === "multi") {
    //  «متعدد | يسار (سفلي): تحت الركبة | يسار (علوي، سليكوني): كف | (الوجه، سليكوني): انف»
    const segs = (Array.isArray(p.limbs) ? p.limbs : []).map((l) => {
      const side = limbNeedsSide(l) ? (LIMB_SIDE_TEXT[l.side ?? ""] ?? "-") : "";
      const region = LIMB_REGION_TEXT[l.region ?? ""] ?? "-";
      const silicone = l.region === "face" || l.kind === "silicone" ? "، سليكوني" : "";
      return `${side ? `${side} ` : ""}(${region}${silicone}): ${l.detail || "-"}`;
    });
    return ["متعدد", ...segs].join(" | ");
  }
  return "";
}

/**
 * The exact inverse of buildAmputationSite: read a stored site string back into
 * the builder's parts.
 *
 * Needed because reception now records the amputation at registration (owner,
 * 2026-07-31) and the doctor's exam must OPEN carrying it — otherwise the
 * doctor retypes what is already on file, which is the very friction the
 * prefill was built to remove for physiotherapy.
 *
 * Returns {} for anything it does not recognise (legacy free-text sites,
 * empty values); the caller then leaves the builder untouched rather than
 * guessing. Round-trip is covered by `npm run test:amputation-site`.
 */
export function parseAmputationSite(site: string | null | undefined): AmputationParts {
  const raw = (site || "").trim();
  if (!raw) return {};

  // Silicone: "اطراف سليكونية تعويضية - {part}[ - {side}][ | ملاحظات: {notes}]"
  if (raw.startsWith("اطراف سليكونية تعويضية")) {
    const notesMarker = " | ملاحظات: ";
    const at = raw.indexOf(notesMarker);
    const head = at === -1 ? raw : raw.slice(0, at);
    const notes = at === -1 ? "" : raw.slice(at + notesMarker.length);
    const seg = head.split(" - ");
    const part = seg[1] && seg[1] !== "-" ? seg[1] : "";
    const sideText = seg[2] || "";
    const parts: AmputationParts = { amputationType: "silicone" };
    if (part) parts.siliconePart = part;
    if (sideText) {
      parts.siliconeSide =
        sideText === "يمين" ? "right" : sideText === "يسار" ? "left" : "both";
    }
    if (notes) parts.siliconeNotes = notes;
    return parts;
  }

  // Multi: "متعدد | يسار (سفلي): تحت الركبة | (الوجه، سليكوني): انف"
  if (raw.startsWith("متعدد")) {
    const limbs: AmputationLimb[] = [];
    for (const chunk of raw.split(" | ").slice(1)) {
      //  وطرفٌ بلا جهةٍ بعد يُكتب «- (سفلي): -» — يُقرأ كذلك فلا يسقط طرفٌ من الذهاب والإياب.
      const m = chunk.match(/^(?:(يمين|يسار|-) )?\((علوي|سفلي|الوجه)(، سليكوني)?\): (.*)$/);
      if (!m) continue;
      const region = m[2] === "علوي" ? "upper" : m[2] === "سفلي" ? "lower" : "face";
      const limb: AmputationLimb = { region, side: m[1] === "يمين" ? "right" : m[1] === "يسار" ? "left" : "", kind: m[3] || region === "face" ? "silicone" : "prosthetic" };
      if (m[4] && m[4] !== "-") limb.detail = m[4];
      limbs.push(limb);
    }
    return { amputationType: "multi", limbs };
  }

  // Single: "احادي - {طرف علوي|طرف سفلي} - {يمين|يسار}[ - {detail}]"
  if (raw.startsWith("احادي")) {
    const seg = raw.split(" - ");
    const parts: AmputationParts = { amputationType: "single" };
    parts.singleLimb = seg[1] === "طرف علوي" ? "upper" : "lower";
    parts.singleSide = seg[2] === "يسار" ? "left" : "right";
    if (seg[3]) parts.singleDetail = seg[3];
    return parts;
  }

  // Double: "ثنائي - {علوي|سفلي|علوي وسفلي} …"
  if (raw.startsWith("ثنائي")) {
    const [head, ...rest] = raw.split(" | ");
    const kind = head.split(" - ")[1] || "";
    const parts: AmputationParts = { amputationType: "double" };

    if (kind === "علوي وسفلي") {
      parts.doubleLimbType = "both";
      for (const chunk of rest) {
        // "يمين (علوي): تحت المرفق"
        const m = chunk.match(/^(يمين|يسار) \((علوي|سفلي)\): (.*)$/);
        if (!m) continue;
        const limb = m[2] === "علوي" ? "upper" : "lower";
        const detail = m[3] === "-" ? "" : m[3];
        if (m[1] === "يمين") {
          parts.bothRightLimb = limb;
          if (detail) parts.bothRightDetail = detail;
        } else {
          parts.bothLeftLimb = limb;
          if (detail) parts.bothLeftDetail = detail;
        }
      }
      return parts;
    }

    parts.doubleLimbType = kind === "علوي" ? "upper" : "lower";
    for (const chunk of rest) {
      const m = chunk.match(/^(يمين|يسار): (.*)$/);
      if (!m) continue;
      const detail = m[2] === "-" ? "" : m[2];
      if (!detail) continue;
      if (m[1] === "يمين") parts.doubleRightDetail = detail;
      else parts.doubleLeftDetail = detail;
    }
    return parts;
  }

  return {};
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

/**
 * Injuries exactly as the real patient-file page displays them
 * (`CaseDetailSections.tsx`): the JSON array first (`parseInjuries`); when
 * that produces no entries, fall back to splitting the legacy
 * `injuryType`/`injuryArea` columns on the Arabic/Latin comma — the same
 * split the page itself uses, pairing them up by position. Side is never
 * invented for the legacy fallback: those two columns never carried it, so
 * every entry built here gets `side: ""` exactly like the page does.
 */
export function injuriesWithLegacyFallback(
  injuriesJson: unknown, legacyInjuryType: unknown, legacyInjuryArea: unknown,
): InjuryEntry[] {
  const fromJson = parseInjuries(injuriesJson);
  if (fromJson.length > 0) return fromJson;
  const typeStr = typeof legacyInjuryType === "string" ? legacyInjuryType : "";
  const areaStr = typeof legacyInjuryArea === "string" ? legacyInjuryArea : "";
  if (!typeStr && !areaStr) return [];
  const types = typeStr.split(/، |, /).filter(Boolean);
  const areas = areaStr.split(/، |, /).filter(Boolean);
  const maxLen = Math.max(types.length, areas.length, 1);
  const out: InjuryEntry[] = [];
  for (let i = 0; i < maxLen; i++) out.push({ type: types[i] || "", area: areas[i] || "", side: "" });
  return out;
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

/**
 * **نوعُ السوكيت** (§4.cq، قرارُ المالك ٢٠٢٦-١٠-٠٨: «يضاف مع نوع الطرف مثل الموجود بالاستمارة») — **مواصفةُ جهازٍ لا عمودُ ملفّ**:
 * يعيش في وصفة المعاينة (`medical_exams.prescription`) ومواصفات الحلقة (`patient_device_episodes.device_specs`)، ولا يُكتب على
 * صفّ المريض — فـ`PROSTHETIC_SPECS` (أعمدةُ الملفّ القديمة التي تنسخها `applyPrescription`) لا تتغيّر.
 */
export const SOCKET_SPEC: SpecField = { key: "socketType", label: "نوع السوكيت", placeholder: "اكتب نوع السوكيت" };

/** **خاناتُ الطرف العلويّ** (قرارُ المالك ٢٠٢٦-١٠-١٠، §4.de) — مواصفاتُ جهازٍ كالسوكيت، لا أعمدةُ ملفّ. */
export const ELBOW_SPEC: SpecField = { key: "elbowType", label: "نوع المرفق", placeholder: "مثال: مرفق ميكانيكي، مرفق كهربائي…" };
export const HAND_SPEC: SpecField = { key: "handType", label: "نوع الكف / اليد", placeholder: "مثال: كف تجميلية، يد ميكانيكية، يد كهربائية…" };

/** مواصفاتُ **الجهاز** للأطراف: نوعُ الطرف ثمّ السوكيت ثمّ البقيّة — بترتيب الورقة، ثمّ خاناتُ العلويّ. */
export const PROSTHETIC_DEVICE_SPECS: SpecField[] = [PROSTHETIC_SPECS[0], SOCKET_SPEC, ...PROSTHETIC_SPECS.slice(1), ELBOW_SPEC, HAND_SPEC];

/** حقولُ **وصفة الجهاز** لاختصاص — ما يكتبه الطبيبُ ويُعرَض في المعاينة وأمرِ التصنيع. */
export function deviceSpecsForSpecialty(caseType: string): SpecField[] {
  if (caseType === "prosthetic") return PROSTHETIC_DEVICE_SPECS;
  if (caseType === "medical_support") return SUPPORT_SPECS;
  return [];
}
