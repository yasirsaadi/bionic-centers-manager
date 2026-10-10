// **مواصفاتُ الطرف بحسب البتر نفسِه** (ملاحظاتُ المالك ٢٠٢٦-١٠-١٠، §4.de).
//
// «طرفٌ تحت الركبة نختاره في الاستمارة يجب ألّا يظهر نوعُ الركبة في مواصفات الطرف. وحين أختار طرفاً سليكونياً مثل إصبع فما فائدةُ
// نوع القدم والركبة وغيرها؟ وأهمُّ نقطة: حين يكون المصابُ مبتورَ طرفين … يجب أن يكون لديّ خياران لمواصفات الطرف، مع مربّعٍ يقول إن كان
// الطرفان متماثلين فيُدخل الطبيبُ مرّةً واحدة ويُعمَّم على الاثنين». ثمّ: «لا تترك حالةً تأتي للمركز ويبقى الطبيبُ أو الاستعلاماتُ محتاراً».
//
// فقاعدةٌ واحدة يقرؤها كلُّ مَن يكتب الخاناتِ أو يعرضها أو يشترطها — معاينةُ الطبيب، وورقةُ الاستعلامات، والاستمارةُ المطبوعة، ومستطيلُ
// الأجهزة، وأمرُ التصنيع، ونافذةُ «اشترى»:
//   • **ما يخصّ الطرفَ بمستواه** (`limbSpecKeys`): السفليُّ تحت الركبة (وسايمز وجوبارت) بلا ركبة، والعلويُّ بلا ركبةٍ ولا قدم وله الكفُّ/اليد
//     (والمرفقُ لما فوق المرفق)، والسليكونيُّ التعويضيّ نوعُه وسيليكونُه وحدهما. والمستوى المجهول يُبقي الخمسَ القديمة كما كانت.
//   • **وأكثرُ من طرفٍ أطرافٌ** (`limbSlots`): الثنائيُّ يمينٌ ويسار، والسليكونيُّ «كلا الجانبين» كذلك، و«متعدد» طرفاً طرفاً (`left-lower` …).
//     لكلّ طرفٍ خاناتُه بمفتاحٍ بطرفه (`footType:right`، `handType:left-upper`)، **والمفتاحُ بلا طرفٍ يعني الأطرافَ كلَّها** — فـ«متماثلان»
//     تُكتب مرّةً في المفتاح العامّ، والمختلفةُ كلٌّ في مفتاحه، والقراءةُ واحدة (`limbSpecValue`): مفتاحُ الطرف أوّلاً ثمّ العامّ.
//   • **و«يُصنع في هذا الطلب»** (`limbsNotMade` في الوصفة): مبتورُ طرفين يأخذ واحداً الآن — المواصفاتُ والشرطُ للمصنوع وحده.
//   • **ولا يُخفى مكتوب**: خانةٌ لا تخصّ المستوى وفيها قيمةٌ حقيقية (لا «لا ينطبق») تُعرض — ملفٌّ قديمٌ لا يفقد حرفاً.
import {
  FACE_PART_CODE, LOWER_AMPUTATION_DETAILS, UPPER_AMPUTATION_DETAILS, amputationLimbKey, parseAmputationSite, type AmputationParts,
} from "./case_fields";
import { SHEET_DEVICE_ROWS } from "./exam_sheet";

export const NOT_APPLICABLE_SPEC = "لا ينطبق";

/** خاناتُ الطرف بترتيب الورقة — الخمسُ القديمة ومعها المرفقُ والكفّ. */
export const LIMB_SPEC_KEYS: readonly string[] = SHEET_DEVICE_ROWS.map((r) => r.key);
const SHEET_LABEL: Record<string, string> = Object.fromEntries(SHEET_DEVICE_ROWS.map((r) => [r.key, r.label]));
/** **الخمسُ القديمة** — لطرفٍ مجهولِ المستوى أو بلا بترٍ مسجَّل، كما كانت قبل §4.de (فلا شرطَ جديدَ على معاينةٍ قديمة). */
export const LEGACY_LIMB_SPEC_KEYS: readonly string[] = ["prostheticType", "kneeJointType", "footType", "socketType", "siliconType"];

export type LimbSide = "right" | "left";
export type LimbKind = "upper" | "lower" | "silicone";
export const LIMB_SIDES: readonly LimbSide[] = ["right", "left"];
export const SIDE_LABEL: Record<LimbSide, string> = { right: "يمين", left: "يسار" };

/** مستوياتُ البتر السفليّ التي فيها ركبةٌ صناعية — خلال الركبة وفوقها وخلال الحوض. */
export const KNEE_LEVELS: readonly string[] = ["خلال الركبة", "فوق الركبة", "خلال الحوض"];
/** مستوياتُ البتر العلويّ التي فيها مرفقٌ صناعيّ — خلال المرفق وفوقه وخلال الكتف. */
export const ELBOW_LEVELS: readonly string[] = ["خلال المرفق", "فوق المرفق", "خلال الكتف"];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** **الخاناتُ التي تخصّ طرفاً بمستواه** — بترتيب الورقة. ونوعٌ أو مستوى مجهول ⟵ الخمسُ القديمة (لا يُخفى شيءٌ تخميناً). */
export function limbSpecKeys(kind: LimbKind | null | undefined, level: string | null | undefined): string[] {
  const keep = (ks: string[]) => LIMB_SPEC_KEYS.filter((k) => ks.includes(k));
  const lv = str(level);
  if (kind === "silicone") return keep(["prostheticType", "siliconType"]);
  if (kind === "upper") {
    const belowElbow = lv && UPPER_AMPUTATION_DETAILS.includes(lv) && !ELBOW_LEVELS.includes(lv);
    return keep(belowElbow ? ["prostheticType", "handType", "socketType", "siliconType"]
      : ["prostheticType", "elbowType", "handType", "socketType", "siliconType"]);
  }
  if (kind === "lower" && lv && LOWER_AMPUTATION_DETAILS.includes(lv) && !KNEE_LEVELS.includes(lv)) {
    return keep(["prostheticType", "footType", "socketType", "siliconType"]);
  }
  return keep([...LEGACY_LIMB_SPEC_KEYS]);
}

/**
 * طرفٌ يُصنَع له: مفتاحُه (`null` لطرفٍ واحد — مفاتيحُه بلا طرف)، واسمُه القصير («يسار سفلي») وعنوانُه («يسار سفلي — تحت الركبة»)،
 * ونوعُه ومستواه، وخاناتُه.
 */
export interface LimbSlot { key: string | null; label: string; title: string; kind: LimbKind | null; level: string | null; keys: string[] }

const REGION_TEXT: Record<string, string> = { upper: "علوي", lower: "سفلي" };
const FACE_TEXT: Record<string, string> = { ear: "أذن", nose: "أنف", orbit: "محجر عين" };
/** **اسمُ الطرف من مفتاحه** — «يمين»، «يسار سفلي»، «أذن يسار»، «أنف». */
export function slotKeyLabel(key: string): string {
  if (key === "right" || key === "left") return SIDE_LABEL[key];
  const m = /^(right|left|mid)-([a-z]+)$/.exec(key);
  if (!m) return key;
  const side = m[1] === "mid" ? "" : SIDE_LABEL[m[1] as LimbSide];
  if (REGION_TEXT[m[2]]) return `${side} ${REGION_TEXT[m[2]]}`.trim();
  return [FACE_TEXT[m[2]] ?? m[2], side].filter(Boolean).join(" ");
}
/** مفتاحُ طرفٍ صالح: الجهتان للثنائيّ، أو جهةٌ وموضعٌ لـ«متعدد». */
export const isSlotKey = (k: string): boolean =>
  k === "right" || k === "left" || /^(right|left)-(upper|lower|ear|orbit)$/.test(k) || k === "mid-nose";

const kindOf = (v: unknown): LimbKind | null => (v === "upper" || v === "lower" ? v : null);
const slot = (key: string | null, kind: LimbKind | null, level: unknown): LimbSlot => {
  const lv = str(level) || null;
  const label = key ? slotKeyLabel(key) : "";
  return { key, label, title: [label, lv].filter(Boolean).join(" — "), kind, level: lv, keys: limbSpecKeys(kind, lv) };
};

/**
 * **أطرافُ البتر** — واحدٌ للأحاديّ والسليكونيّ بجهةٍ واحدة والمجهول؛ واثنان (يمين ثمّ يسار) للثنائيّ بأنماطه الثلاثة وللسليكونيّ «كلا
 * الجانبين»؛ ولـ«متعدد» طرفٌ لكلّ ما اكتمل موضعُه وجهتُه، بترتيبه، بلا تكرارٍ للمفتاح.
 */
export function limbSlots(p: AmputationParts | null | undefined): LimbSlot[] {
  const a = p ?? {};
  if (a.amputationType === "single") return [slot(null, kindOf(a.singleLimb), a.singleDetail)];
  //  **وسليكونيٌّ «كلا الجانبين» طرفان** — لكلّ جهةٍ خاناتُها، وخاناتُهما متطابقة فمربّعُ «متماثلان» يظهر دائماً. والأنفُ بلا جهة فطرفٌ واحد.
  if (a.amputationType === "silicone") {
    return a.siliconeSide === "both" && a.siliconePart !== "انف"
      ? [slot("right", "silicone", a.siliconePart), slot("left", "silicone", a.siliconePart)]
      : [slot(null, "silicone", a.siliconePart)];
  }
  if (a.amputationType === "double") {
    if (a.doubleLimbType === "upper" || a.doubleLimbType === "lower") {
      return [slot("right", a.doubleLimbType, a.doubleRightDetail), slot("left", a.doubleLimbType, a.doubleLeftDetail)];
    }
    if (a.doubleLimbType === "both") {
      return [slot("right", kindOf(a.bothRightLimb), a.bothRightDetail), slot("left", kindOf(a.bothLeftLimb), a.bothLeftDetail)];
    }
    return [slot("right", null, null), slot("left", null, null)];
  }
  if (a.amputationType === "multi") {
    const out: LimbSlot[] = [];
    for (const l of Array.isArray(a.limbs) ? a.limbs : []) {
      const key = amputationLimbKey(l);
      if (!key || out.some((s) => s.key === key)) continue;
      const kind: LimbKind | null = l.region === "face" || l.kind === "silicone" ? "silicone" : kindOf(l.region);
      out.push(slot(key, kind, l.detail));
    }
    if (out.length === 0) return [slot(null, null, null)];
    if (out.length === 1) return [{ ...out[0], key: null, label: "", title: out[0].level ?? "" }];
    return out;
  }
  return [slot(null, null, null)];
}

/** أجزاءُ البتر من سلسلته المركّبة (`amputationSite` في مواصفات الجهاز) — وسلسلةٌ لا تُفهَم ⟵ مجهول. */
export const limbSlotsOfSite = (site: unknown): LimbSlot[] => limbSlots(parseAmputationSite(str(site)));

/** **تقبل الأطرافُ «متماثلان»** حين تتطابق خاناتُها كلُّها — تحت الركبة والآخرُ فوقها لا يتماثلان (للثاني ركبة). */
export const slotsCanShare = (slots: LimbSlot[]): boolean =>
  slots.length >= 2 && slots.every((s) => s.keys.join("|") === slots[0].keys.join("|"));

/** مفتاحُ خانةٍ لطرف — `footType:right`، `handType:left-upper`. */
export const sideSpecKey = (key: string, slotKey: string) => `${key}:${slotKey}`;
/** `footType:left-lower` ⟵ `{ base: "footType", side: "left-lower" }` · `footType` ⟵ `{ base: "footType", side: null }`. */
export function splitSpecKey(k: string): { base: string; side: string | null } {
  const at = k.lastIndexOf(":");
  if (at > 0 && isSlotKey(k.slice(at + 1))) return { base: k.slice(0, at), side: k.slice(at + 1) };
  return { base: k, side: null };
}

/** **قيمةُ خانةٍ لطرف**: مفتاحُ الطرف أوّلاً، ثمّ المفتاحُ العامّ (للأطراف كلّها). وبلا طرف ⟵ العامُّ وحده. */
export function limbSpecValue(specs: Record<string, unknown>, key: string, slotKey: string | null): string {
  return slotKey ? (str(specs[sideSpecKey(key, slotKey)]) || str(specs[key])) : str(specs[key]);
}

/** مفاتيحُ الأطراف المكتوبةُ في المواصفات — لكلّ خانةٍ أساسية. */
function slotEntries(specs: Record<string, unknown>): { base: string; side: string; value: string }[] {
  const out: { base: string; side: string; value: string }[] = [];
  for (const [k, v] of Object.entries(specs)) {
    const { base, side } = splitSpecKey(k);
    if (side && LIMB_SPEC_KEYS.includes(base) && str(v)) out.push({ base, side, value: str(v) });
  }
  return out;
}

/** هل في المواصفات مفتاحُ طرفٍ مكتوب؟ (لأطرافٍ بعينها حين تُعطى.) */
export const hasSideSpecs = (specs: Record<string, unknown>, slotKeys?: readonly string[]): boolean =>
  slotEntries(specs).some((e) => !slotKeys || slotKeys.includes(e.side));

/** **«يُصنع في هذا الطلب»** — مفاتيحُ الأطراف التي لا تُصنع الآن، من الوصفة (قائمة) أو المواصفات (نصٌّ مفصولٌ بفواصل). */
export function notMadeOf(specs: Record<string, unknown> | null | undefined): string[] {
  const v = specs?.limbsNotMade;
  const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  return list.map((x) => str(x)).filter((x) => isSlotKey(x));
}

/**
 * **نصٌّ واحد لخانةٍ** — لعمود ملفّ المريض وبطاقة الأمر: المفتاحُ العامّ كما هو، والمختلفةُ «يمين: … | يسار: …»
 * («يسار سفلي: … | يسار علوي: …» لـ«متعدد»). أعمدةُ الملفّ القديمة عمودٌ لكلّ خانة، فتُقرأ الأطرافُ فيها كاملةً لا نصفاً.
 */
export function limbSpecFlat(specs: Record<string, unknown>, key: string): string {
  const top = str(specs[key]);
  if (top) return top;
  return slotEntries(specs).filter((e) => e.base === key).map((e) => `${slotKeyLabel(e.side)}: ${e.value}`).join(" | ");
}

export interface LimbSpecSide { side: string; label: string; value: string | null; applicable: boolean }
export interface LimbSpecRow {
  key: string;
  label: string;
  /** نصُّ القيمة كاملاً — طرفٌ واحد، أو «X» للأطراف كلّها، أو «يمين: X · يسار: Y» — و`null` حين يخلو. */
  value: string | null;
  /** للأطراف بمواصفاتٍ مختلفة: قيمةُ كلّ طرف، و`applicable: false` لطرفٍ لا تخصّه الخانة («لا ينطبق»). */
  sides?: LimbSpecSide[];
}
export interface LimbSpecView {
  /** `single` طرفٌ واحد · `identical` أطرافٌ بمواصفاتٍ واحدة · `split` كلُّ طرفٍ بمواصفاته. */
  mode: "single" | "identical" | "split";
  /** الأطرافُ المصنوعة في هذا الطلب. */
  slots: LimbSlot[];
  /** أطرافُ البتر كلُّها، ومنها ما لا يُصنع الآن. */
  allSlots: LimbSlot[];
  notMadeSlots: LimbSlot[];
  rows: LimbSpecRow[];
}

/** عنوانُ طرفٍ — «يمين — تحت الركبة». */
export const slotTitle = (s: LimbSlot): string => s.title;

const realValue = (v: string) => Boolean(v) && v !== NOT_APPLICABLE_SPEC;

/**
 * **ما يُعرض من خانات الطرف** — للعرض والطباعة وأمر التصنيع و«اشترى». `specs` مواصفاتُ الجهاز (الوصفةُ ثمّ ما مُلئ عند البيع)، و`site`
 * سلسلةُ البتر (تُقرأ من `specs.amputationSite` حين لا تُعطى)، و«يُصنع في هذا الطلب» من `specs.limbsNotMade`.
 *   • طرفٌ واحد: خاناتُه بمستواه، ومعها ما كُتب في غيرها بقيمةٍ حقيقية.
 *   • أطرافٌ «متماثلة» (مصنوعةٌ اثنان فأكثر، خاناتُها متطابقة، ولا مفتاحَ طرفٍ مكتوب لها، وفي العامّ قيمة): صفٌّ لكلّ خانة بقيمته للكلّ.
 *   • وإلّا كلُّ طرفٍ مصنوعٍ بقيمته — والطرفُ الذي لا تخصّه الخانة «لا ينطبق».
 */
export function limbSpecView(specs: Record<string, unknown>, site?: unknown): LimbSpecView {
  const all = limbSlotsOfSite(site === undefined ? specs.amputationSite : site);
  const label = (k: string) => SHEET_LABEL[k] ?? k;
  if (all.length === 1) {
    const keys = all[0].keys;
    const rows = LIMB_SPEC_KEYS
      .filter((k) => keys.includes(k) || realValue(str(specs[k])))
      .map((k) => ({ key: k, label: label(k), value: str(specs[k]) || null }));
    return { mode: "single", slots: all, allSlots: all, notMadeSlots: [], rows };
  }
  const skip = new Set(notMadeOf(specs));
  let slots = all.filter((s) => !skip.has(s.key!));
  if (slots.length === 0) slots = all;
  const notMadeSlots = all.filter((s) => !slots.includes(s));
  const anyTop = LIMB_SPEC_KEYS.some((k) => str(specs[k]));
  if (slotsCanShare(slots) && !hasSideSpecs(specs, slots.map((s) => s.key!)) && anyTop) {
    const keys = slots[0].keys;
    const rows = LIMB_SPEC_KEYS
      .filter((k) => keys.includes(k) || realValue(str(specs[k])))
      .map((k) => ({ key: k, label: label(k), value: str(specs[k]) || null }));
    return { mode: "identical", slots, allSlots: all, notMadeSlots, rows };
  }
  const rows: LimbSpecRow[] = [];
  for (const k of LIMB_SPEC_KEYS) {
    const sides: LimbSpecSide[] = slots.map((s) => {
      const own = str(specs[sideSpecKey(k, s.key!)]);
      const applicable = s.keys.includes(k) || realValue(own);
      return { side: s.key!, label: s.label, applicable, value: (applicable ? limbSpecValue(specs, k, s.key) : own) || null };
    });
    if (!sides.some((x) => x.applicable)) continue;
    const filled = sides.filter((x) => x.applicable && x.value);
    rows.push({
      key: k, label: label(k), sides,
      value: filled.length ? sides.filter((x) => x.applicable).map((x) => `${x.label}: ${x.value ?? "—"}`).join(" · ") : null,
    });
  }
  return { mode: "split", slots, allSlots: all, notMadeSlots, rows };
}

/**
 * **ترتيبُ وصفة الطبيب على البتر** — يُنادى كلّما تغيّر البترُ أو مربّعُ «متماثلان» أو «يُصنع في هذا الطلب» في معاينة الطبيب، فما يُحفظ
 * هو ما يراه:
 *   • خانةٌ لا تخصّ أيَّ طرفٍ بعد التغيير تُحذف (مَن غيّر «فوق الركبة» إلى «تحت الركبة» لا تبقى له ركبةٌ مخفيّة).
 *   • طرفٌ واحد، أو أطرافٌ «متماثلة» ⟵ المفاتيحُ العامّة وحدها (والقيمةُ: العامّ، وإلّا أوّلُ طرفٍ بترتيبه).
 *   • أطرافٌ مختلفة ⟵ مفاتيحُ الأطراف وحدها (وكلُّ طرفٍ مصنوعٍ يأخذ ما كان في العامّ ما لم تكن له قيمتُه).
 * و`limbsIdentical` يبقى لما فيه طرفان فأكثر ويعمل حين تتطابق خاناتُ المصنوعة؛ و`limbsNotMade` يبقى بمفاتيح أطرافٍ قائمة، ولا يُخرج الكلّ.
 */
export function normalizeLimbSpecs<T extends Record<string, unknown>>(rx: T): T {
  const all = limbSlots(rx as AmputationParts);
  const multi = all.length >= 2;
  const keysNow = all.map((s) => s.key).filter((k): k is string => Boolean(k));
  const notMade = multi ? notMadeOf(rx).filter((k) => keysNow.includes(k)) : [];
  const madeAll = notMade.length >= all.length;
  const made = madeAll ? all : all.filter((s) => !notMade.includes(s.key!));
  const identical = multi && slotsCanShare(made) && rx.limbsIdentical === true;
  const own = slotEntries(rx);
  const out: Record<string, unknown> = { ...rx };
  for (const k of Object.keys(out)) {
    const { base, side } = splitSpecKey(k);
    if (LIMB_SPEC_KEYS.includes(base) && (side || base === k)) delete out[k];
  }
  for (const k of LIMB_SPEC_KEYS) {
    const top = str(rx[k]);
    const ownOf = (key: string) => own.find((e) => e.base === k && e.side === key)?.value ?? "";
    if (!multi || identical) {
      const first = all.map((s) => (s.key ? ownOf(s.key) : "")).find(Boolean) ?? own.find((e) => e.base === k)?.value ?? "";
      const v = top || first;
      if (v && (identical ? made[0] : all[0]).keys.includes(k)) out[k] = v;
    } else {
      for (const sl of all) {
        const isMade = made.includes(sl);
        const v = ownOf(sl.key!) || (isMade ? top : "");
        if (v && sl.keys.includes(k)) out[sideSpecKey(k, sl.key!)] = v;
      }
    }
  }
  //  والمربّعُ يبقى ما بقيت الأطرافُ اثنين فأكثر — فطبيبٌ أشّره ثمّ اختار المستويات واحداً بعد الآخر (فاختلفت لحظةً) لا يفقده.
  if (multi) out.limbsIdentical = rx.limbsIdentical === true;
  else delete out.limbsIdentical;
  if (multi && notMade.length && !madeAll) out.limbsNotMade = notMade;
  else delete out.limbsNotMade;
  return out as T;
}
