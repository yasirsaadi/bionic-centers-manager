// **مواصفاتُ الجهاز عند «اشترى»** (ترحيل ١١٥، §4.cq — المرحلةُ الثانية).
//
// قرارُ المالك (٢٠٢٦-١٠-٠٨): خاناتُ الجهاز «يملؤها الطبيبُ أثناء المعاينة **أو موظّفُ الاستعلامات بعدها**، بشرط **ألّا يُقبل
// «اشترى» إلّا بعد أن تمتلئ**؛ وإن لم يشترِ فلا بأس أن تبقى فارغة». وما لا يخصّ الجهاز — مبتورٌ تحت الركبة لا ركبةَ له، وأذنٌ
// سيليكونية لا قدمَ لها — يُكتب فيه **«لا ينطبق»** (توصيةٌ وافق عليها المالك) فلا يُمنع بيعٌ صحيح.
//
// **والمصدران لا يختلطان**: ما كتبه الطبيبُ في وصفته يبقى الحاكم، وما يملؤه الاستعلاماتُ يُحفظ على الحلقة
// (`patient_device_episodes.device_specs`) **فيسدّ الفراغَ وحده** — لا يكتب فوق كلمة طبيب.
//
// **وبحسب البتر نفسِه** (ملاحظاتُ المالك ٢٠٢٦-١٠-١٠، §4.de): الإلزاميُّ ما يخصّ الطرفَ بمستواه (`shared/limb_specs.ts`) — تحت الركبة بلا
// ركبة، والسليكونيُّ بلا قدمٍ ولا ركبةٍ ولا سوكيت — ولمبتور الطرفين خاناتُ كلّ جهة (`footType:right`)، أو العامّةُ «للطرفين» إن تماثلا.
// والبترُ من معاينة الجهاز نفسِه (`amputationSite` في مواصفاته)؛ ومعاينةٌ بلا بترٍ مسجَّل ⟵ الخمسُ كما كانت.
import { PROSTHETIC_DEVICE_SPECS, SUPPORT_SPECS, type SpecField } from "./case_fields";
import {
  LIMB_SIDES, LIMB_SPEC_KEYS, NOT_APPLICABLE_SPEC, SIDE_LABEL, limbSpecValue, limbSpecView, sideSpecKey, splitSpecKey,
} from "./limb_specs";

export const NOT_APPLICABLE = NOT_APPLICABLE_SPEC;

export type DeviceKind = "prosthetic" | "medical_support";

/** الخاناتُ الإلزامية لـ«اشترى» — للأطراف خمسُ الورقة، وللمساند نوعُ المسند. */
export const SALE_REQUIRED_SPECS: Record<DeviceKind, readonly string[]> = {
  prosthetic: ["prostheticType", "socketType", "kneeJointType", "footType", "siliconType"],
  medical_support: ["supportType"],
};

export const isDeviceKind = (v: unknown): v is DeviceKind => v === "prosthetic" || v === "medical_support";

/** تعريفاتُ الخانات الإلزامية بعناوينها — بترتيب الورقة. */
export function saleSpecFields(kind: DeviceKind): SpecField[] {
  const all = kind === "prosthetic" ? PROSTHETIC_DEVICE_SPECS : SUPPORT_SPECS;
  return SALE_REQUIRED_SPECS[kind].map((k) => all.find((f) => f.key === k)!).filter(Boolean);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** **قيمةُ خانةٍ كما تُقرأ** — مفتاحُ الجهة (`footType:left`) يقرأ جهتَه ثمّ العامّ (للطرفين)، والعامُّ نفسَه. */
export function specResolved(specs: Record<string, unknown>, key: string): string {
  const { base, side } = splitSpecKey(key);
  return limbSpecValue(specs, base, side);
}

/**
 * **كلمةُ الطبيب تغلب**، وما حُفظ على الحلقة يسدّ ما تركه فارغاً.
 * **وبالجهة أيضاً**: طبيبٌ كتب الخانةَ للطرفين (المفتاحُ العامّ) لا يكتب فوقها ما حُفظ لجهةٍ واحدة.
 */
export function mergeDeviceSpecs(fromExam: Record<string, string>, stored: unknown): Record<string, string> {
  const out: Record<string, string> = { ...fromExam };
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
      const { base, side } = splitSpecKey(k);
      if (side && str(fromExam[base])) continue;
      if (!str(out[k]) && str(v)) out[k] = str(v);
    }
  }
  return out;
}

/** خانةٌ إلزامية لـ«اشترى» — مفتاحُها (بجهته لمبتور الطرفين) وعنوانُها. */
export interface SaleSpecField { key: string; label: string }

/** عنوانُ خانةٍ بجهتها — «نوع القدم — يسار». */
export function saleSpecLabel(kind: DeviceKind, key: string): string {
  const { base, side } = splitSpecKey(key);
  const label = saleSpecFields(kind).find((f) => f.key === base)?.label ?? base;
  return side ? `${label} — ${SIDE_LABEL[side]}` : label;
}

/**
 * **الخاناتُ الإلزامية لهذا الجهاز بعينه** — بترتيب الورقة: للمساند نوعُ المسند؛ وللأطراف ما يخصّ البترَ المسجَّل في معاينته
 * (`merged.amputationSite`): طرفٌ واحد خاناتُه، وطرفان متماثلان خاناتُهما مرّةً «للطرفين»، ومختلفان خاناتُ اليمين ثمّ اليسار.
 */
export function saleSpecFieldsFor(kind: DeviceKind, merged: Record<string, unknown>): SaleSpecField[] {
  const fields = saleSpecFields(kind);
  if (kind !== "prosthetic") return fields.map((f) => ({ key: f.key, label: f.label }));
  const view = limbSpecView(merged);
  if (view.mode !== "split") {
    const keys = view.slots[0].keys;
    return fields.filter((f) => keys.includes(f.key))
      .map((f) => ({ key: f.key, label: view.mode === "identical" ? `${f.label} — للطرفين` : f.label }));
  }
  return view.slots.flatMap((s) => fields.filter((f) => s.keys.includes(f.key))
    .map((f) => ({ key: sideSpecKey(f.key, s.side!), label: saleSpecLabel(kind, sideSpecKey(f.key, s.side!)) })));
}

/** ما ينقص لـ«اشترى» — مفاتيحُ بترتيب الورقة (وبجهاتها لمبتور الطرفين). */
export function missingSaleSpecs(kind: DeviceKind, merged: Record<string, string>): string[] {
  return saleSpecFieldsFor(kind, merged).map((f) => f.key).filter((k) => !specResolved(merged, k));
}

/** ما يُقبَل من نافذة البيع: الخاناتُ الإلزامية وحدها (وللأطراف بجهتَيها)، نصّاً مقصوصاً — وغيرُها يُهمَل. */
export function cleanSaleSpecsInput(input: unknown, kind: DeviceKind): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  const allowed = kind === "prosthetic"
    ? [...SALE_REQUIRED_SPECS[kind], ...LIMB_SPEC_KEYS.flatMap((k) => LIMB_SIDES.map((s) => sideSpecKey(k, s)))]
    : SALE_REQUIRED_SPECS[kind];
  for (const k of allowed) {
    const v = str((input as Record<string, unknown>)[k]).slice(0, 200);
    if (v) out[k] = v;
  }
  return out;
}

export function saleSpecsMessage(kind: DeviceKind, missing: string[]): string {
  const labels = missing.map((k) => saleSpecLabel(kind, k));
  return `أكمل مواصفات الجهاز قبل «اشترى»: ${labels.join("، ")} — واكتب «${NOT_APPLICABLE}» لما لا يخصّ هذا الجهاز`;
}
