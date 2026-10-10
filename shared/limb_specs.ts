// **مواصفاتُ الطرف بحسب البتر نفسِه** (ملاحظاتُ المالك ٢٠٢٦-١٠-١٠، §4.de).
//
// «طرفٌ تحت الركبة نختاره في الاستمارة يجب ألّا يظهر نوعُ الركبة في مواصفات الطرف. وحين أختار طرفاً سليكونياً مثل إصبع فما فائدةُ
// نوع القدم والركبة وغيرها؟ وأهمُّ نقطة: حين يكون المصابُ مبتورَ طرفين … يجب أن يكون لديّ خياران لمواصفات الطرف، مع مربّعٍ يقول إن كان
// الطرفان متماثلين فيُدخل الطبيبُ مرّةً واحدة ويُعمَّم على الاثنين».
//
// فقاعدةٌ واحدة يقرؤها كلُّ مَن يكتب الخاناتِ أو يعرضها أو يشترطها — معاينةُ الطبيب، وورقةُ الاستعلامات، والاستمارةُ المطبوعة، ومستطيلُ
// الأجهزة، وأمرُ التصنيع، ونافذةُ «اشترى»:
//   • **ما يخصّ الطرفَ بمستواه** (`limbSpecKeys`): السفليُّ تحت الركبة (وسايمز وجوبارت) بلا ركبة، والعلويُّ بلا ركبةٍ ولا قدم،
//     والسليكونيُّ التعويضيّ (أذن، أنف، محجر عين، إصبع، كف، قدم) نوعُه وسيليكونُه وحدهما. والمستوى المجهول يُبقي الخمسَ كما كانت.
//   • **والثنائيُّ طرفان** (`limbSlots`): لكلّ جهةٍ خاناتُها بمفتاحٍ بجهته (`footType:right`)، **والمفتاحُ بلا جهة يعني الطرفين معاً** —
//     فـ«متماثلان» تُكتب مرّةً في المفتاح العامّ، والمختلفان كلٌّ في مفتاح جهته، والقراءةُ واحدة (`limbSpecValue`): الجهةُ أوّلاً ثمّ العامّ.
//   • **ولا يُخفى مكتوب**: خانةٌ لا تخصّ المستوى وفيها قيمةٌ حقيقية (لا «لا ينطبق») تُعرض — ملفٌّ قديمٌ لا يفقد حرفاً.
import { LOWER_AMPUTATION_DETAILS, parseAmputationSite, type AmputationParts } from "./case_fields";
import { SHEET_DEVICE_ROWS } from "./exam_sheet";

export const NOT_APPLICABLE_SPEC = "لا ينطبق";

/** خاناتُ الطرف الخمس بترتيب الورقة. */
export const LIMB_SPEC_KEYS: readonly string[] = SHEET_DEVICE_ROWS.map((r) => r.key);
const SHEET_LABEL: Record<string, string> = Object.fromEntries(SHEET_DEVICE_ROWS.map((r) => [r.key, r.label]));

export type LimbSide = "right" | "left";
export type LimbKind = "upper" | "lower" | "silicone";
export const LIMB_SIDES: readonly LimbSide[] = ["right", "left"];
export const SIDE_LABEL: Record<LimbSide, string> = { right: "يمين", left: "يسار" };

/** مستوياتُ البتر السفليّ التي فيها ركبةٌ صناعية — خلال الركبة وفوقها وخلال الحوض. */
export const KNEE_LEVELS: readonly string[] = ["خلال الركبة", "فوق الركبة", "خلال الحوض"];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** **الخاناتُ التي تخصّ طرفاً بمستواه** — بترتيب الورقة. ونوعٌ أو مستوى مجهول ⟵ الخمسُ كلُّها (لا يُخفى شيءٌ تخميناً). */
export function limbSpecKeys(kind: LimbKind | null | undefined, level: string | null | undefined): string[] {
  const keep = (ks: string[]) => LIMB_SPEC_KEYS.filter((k) => ks.includes(k));
  if (kind === "silicone") return keep(["prostheticType", "siliconType"]);
  if (kind === "upper") return keep(["prostheticType", "socketType", "siliconType"]);
  const lv = str(level);
  if (kind === "lower" && lv && LOWER_AMPUTATION_DETAILS.includes(lv) && !KNEE_LEVELS.includes(lv)) {
    return keep(["prostheticType", "footType", "socketType", "siliconType"]);
  }
  return [...LIMB_SPEC_KEYS];
}

/** طرفٌ يُصنَع له: جهتُه (`null` لطرفٍ واحد — مفاتيحُه بلا جهة)، ونوعُه ومستواه، وخاناتُه. */
export interface LimbSlot { side: LimbSide | null; kind: LimbKind | null; level: string | null; keys: string[] }

const kindOf = (v: unknown): LimbKind | null => (v === "upper" || v === "lower" ? v : null);
const slot = (side: LimbSide | null, kind: LimbKind | null, level: unknown): LimbSlot =>
  ({ side, kind, level: str(level) || null, keys: limbSpecKeys(kind, str(level)) });

/** **أطرافُ البتر** — واحدٌ للأحاديّ والسليكونيّ بجهةٍ واحدة والمجهول، واثنان (يمين ثمّ يسار) للثنائيّ بأنماطه الثلاثة وللسليكونيّ «كلا الجانبين». */
export function limbSlots(p: AmputationParts | null | undefined): LimbSlot[] {
  const a = p ?? {};
  if (a.amputationType === "single") return [slot(null, kindOf(a.singleLimb), a.singleDetail)];
  //  **وسليكونيٌّ «كلا الجانبين» طرفان** (طلبُ المالك ٢٠٢٦-١٠-١٠: «ثنائيٌّ يحتاج أطرافاً سليكونية») — لكلّ جهةٍ خاناتُها، وخاناتُهما متطابقة
  //  فمربّعُ «متماثلان» يظهر دائماً. والأنفُ بلا جهة فطرفٌ واحد.
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
  return [slot(null, null, null)];
}

/** أجزاءُ البتر من سلسلته المركّبة (`amputationSite` في مواصفات الجهاز) — وسلسلةٌ لا تُفهَم ⟵ مجهول. */
export const limbSlotsOfSite = (site: unknown): LimbSlot[] => limbSlots(parseAmputationSite(str(site)));

/** **يقبل الطرفان «متماثلان»** حين تتطابق خاناتُهما — تحت الركبة والآخرُ فوقها لا يتماثلان (للثاني ركبة). */
export const slotsCanShare = (slots: LimbSlot[]): boolean =>
  slots.length === 2 && slots[0].keys.join("|") === slots[1].keys.join("|");

export const sideSpecKey = (key: string, side: LimbSide) => `${key}:${side}`;
/** `footType:left` ⟵ `{ base: "footType", side: "left" }` · `footType` ⟵ `{ base: "footType", side: null }`. */
export function splitSpecKey(k: string): { base: string; side: LimbSide | null } {
  const m = /^(.+):(right|left)$/.exec(k);
  return m ? { base: m[1], side: m[2] as LimbSide } : { base: k, side: null };
}

/** **قيمةُ خانةٍ لجهة**: مفتاحُ الجهة أوّلاً، ثمّ المفتاحُ العامّ (للطرفين معاً). وبلا جهة ⟵ العامُّ وحده. */
export function limbSpecValue(specs: Record<string, unknown>, key: string, side: LimbSide | null): string {
  return side ? (str(specs[sideSpecKey(key, side)]) || str(specs[key])) : str(specs[key]);
}

/** هل في المواصفات مفتاحُ جهةٍ مكتوب؟ */
export const hasSideSpecs = (specs: Record<string, unknown>): boolean =>
  LIMB_SPEC_KEYS.some((k) => LIMB_SIDES.some((s) => str(specs[sideSpecKey(k, s)])));

/**
 * **نصٌّ واحد لخانةٍ** — لعمود ملفّ المريض وبطاقة الأمر: المفتاحُ العامّ كما هو، والمختلفان «يمين: … | يسار: …».
 * (أعمدةُ الملفّ القديمة عمودٌ لكلّ خانة؛ فمبتورُ طرفين بمواصفاتٍ مختلفة يُقرأ فيها كاملاً لا نصفاً.)
 */
export function limbSpecFlat(specs: Record<string, unknown>, key: string): string {
  const top = str(specs[key]);
  if (top) return top;
  return LIMB_SIDES.map((s) => (str(specs[sideSpecKey(key, s)]) ? `${SIDE_LABEL[s]}: ${str(specs[sideSpecKey(key, s)])}` : ""))
    .filter(Boolean).join(" | ");
}

export interface LimbSpecSide { side: LimbSide; value: string | null; applicable: boolean }
export interface LimbSpecRow {
  key: string;
  label: string;
  /** نصُّ القيمة كاملاً — طرفٌ واحد، أو «X» للطرفين، أو «يمين: X · يسار: Y» — و`null` حين يخلو. */
  value: string | null;
  /** للطرفين بمواصفاتٍ مختلفة: قيمةُ كلّ جهة، و`applicable: false` لجهةٍ لا تخصّها الخانة («لا ينطبق»). */
  sides?: LimbSpecSide[];
}
export interface LimbSpecView {
  /** `single` طرفٌ واحد · `identical` طرفان بمواصفاتٍ واحدة · `split` طرفان كلٌّ بمواصفاته. */
  mode: "single" | "identical" | "split";
  slots: LimbSlot[];
  rows: LimbSpecRow[];
}

/** عنوانُ جهة طرفٍ — «يمين — تحت الركبة». */
export const slotTitle = (s: LimbSlot): string =>
  [s.side ? SIDE_LABEL[s.side] : null, s.level].filter(Boolean).join(" — ");

const realValue = (v: string) => Boolean(v) && v !== NOT_APPLICABLE_SPEC;

/**
 * **ما يُعرض من خانات الطرف** — للعرض والطباعة وأمر التصنيع. `specs` مواصفاتُ الجهاز (الوصفةُ ثمّ ما مُلئ عند البيع)، و`site`
 * سلسلةُ البتر (تُقرأ من `specs.amputationSite` حين لا تُعطى).
 *   • طرفٌ واحد: خاناتُه بمستواه، ومعها ما كُتب في غيرها بقيمةٍ حقيقية.
 *   • طرفان «متماثلان» (خاناتٌ متطابقة، ولا مفتاحَ جهةٍ مكتوب، وفي العامّ قيمة): صفٌّ لكلّ خانة بقيمته للطرفين.
 *   • وإلّا كلُّ جهةٍ بقيمتها — والجهةُ التي لا تخصّها الخانة «لا ينطبق».
 */
export function limbSpecView(specs: Record<string, unknown>, site?: unknown): LimbSpecView {
  const slots = limbSlotsOfSite(site === undefined ? specs.amputationSite : site);
  const label = (k: string) => SHEET_LABEL[k] ?? k;
  if (slots.length === 1) {
    const keys = slots[0].keys;
    const rows = LIMB_SPEC_KEYS
      .filter((k) => keys.includes(k) || realValue(str(specs[k])))
      .map((k) => ({ key: k, label: label(k), value: str(specs[k]) || null }));
    return { mode: "single", slots, rows };
  }
  const anyTop = LIMB_SPEC_KEYS.some((k) => str(specs[k]));
  if (slotsCanShare(slots) && !hasSideSpecs(specs) && anyTop) {
    const keys = slots[0].keys;
    const rows = LIMB_SPEC_KEYS
      .filter((k) => keys.includes(k) || realValue(str(specs[k])))
      .map((k) => ({ key: k, label: label(k), value: str(specs[k]) || null }));
    return { mode: "identical", slots, rows };
  }
  const rows: LimbSpecRow[] = [];
  for (const k of LIMB_SPEC_KEYS) {
    const sides: LimbSpecSide[] = slots.map((s) => {
      const own = str(specs[sideSpecKey(k, s.side!)]);
      const applicable = s.keys.includes(k) || realValue(own);
      return { side: s.side!, applicable, value: (applicable ? limbSpecValue(specs, k, s.side) : own) || null };
    });
    if (!sides.some((x) => x.applicable)) continue;
    const filled = sides.filter((x) => x.applicable && x.value);
    rows.push({
      key: k, label: label(k), sides,
      value: filled.length ? sides.filter((x) => x.applicable).map((x) => `${SIDE_LABEL[x.side]}: ${x.value ?? "—"}`).join(" · ") : null,
    });
  }
  return { mode: "split", slots, rows };
}

/**
 * **ترتيبُ وصفة الطبيب على البتر** — يُنادى كلّما تغيّر البترُ أو مربّعُ «متماثلان» في معاينة الطبيب، فما يُحفظ هو ما يراه:
 *   • خانةٌ لا تخصّ أيَّ طرفٍ بعد التغيير تُحذف (مَن غيّر «فوق الركبة» إلى «تحت الركبة» لا تبقى له ركبةٌ مخفيّة).
 *   • طرفٌ واحد، أو طرفان «متماثلان» ⟵ المفاتيحُ العامّة وحدها (والقيمةُ: العامّ، وإلّا اليمين، وإلّا اليسار).
 *   • طرفان مختلفان ⟵ مفاتيحُ الجهات وحدها (وكلُّ جهةٍ تأخذ ما كان في العامّ ما لم تكن لها قيمتُها).
 * و`limbsIdentical` (مربّعُ «متماثلان») يبقى للثنائيّ وحده، ويعمل حين تتطابق خاناتُ الطرفين.
 */
export function normalizeLimbSpecs<T extends Record<string, unknown>>(rx: T): T {
  const slots = limbSlots(rx as AmputationParts);
  const bilateral = slots.length === 2;
  const share = slotsCanShare(slots);
  const identical = bilateral && share && rx.limbsIdentical === true;
  const out: Record<string, unknown> = { ...rx };
  for (const k of LIMB_SPEC_KEYS) {
    const top = str(rx[k]);
    const own = Object.fromEntries(LIMB_SIDES.map((s) => [s, str(rx[sideSpecKey(k, s)])])) as Record<LimbSide, string>;
    delete out[k];
    for (const s of LIMB_SIDES) delete out[sideSpecKey(k, s)];
    if (!bilateral || identical) {
      const v = top || own.right || own.left;
      if (v && slots[0].keys.includes(k)) out[k] = v;
    } else {
      for (const sl of slots) {
        const v = own[sl.side!] || top;
        if (v && sl.keys.includes(k)) out[sideSpecKey(k, sl.side!)] = v;
      }
    }
  }
  //  والمربّعُ يبقى ما بقي البترُ ثنائياً — فطبيبٌ أشّره ثمّ اختار المستويين واحداً بعد الآخر (فاختلفا لحظةً) لا يفقده.
  if (bilateral) out.limbsIdentical = rx.limbsIdentical === true;
  else delete out.limbsIdentical;
  return out as T;
}
