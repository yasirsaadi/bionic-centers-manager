// **مواصفاتُ الجهاز عند «اشترى»** (ترحيل ١١٥، §4.cq — المرحلةُ الثانية).
//
// قرارُ المالك (٢٠٢٦-١٠-٠٨): خاناتُ الجهاز «يملؤها الطبيبُ أثناء المعاينة **أو موظّفُ الاستعلامات بعدها**، بشرط **ألّا يُقبل
// «اشترى» إلّا بعد أن تمتلئ**؛ وإن لم يشترِ فلا بأس أن تبقى فارغة». وما لا يخصّ الجهاز — مبتورٌ تحت الركبة لا ركبةَ له، وأذنٌ
// سيليكونية لا قدمَ لها — يُكتب فيه **«لا ينطبق»** (توصيةٌ وافق عليها المالك) فلا يُمنع بيعٌ صحيح.
//
// **والمصدران لا يختلطان**: ما كتبه الطبيبُ في وصفته يبقى الحاكم، وما يملؤه الاستعلاماتُ يُحفظ على الحلقة
// (`patient_device_episodes.device_specs`) **فيسدّ الفراغَ وحده** — لا يكتب فوق كلمة طبيب.
import { PROSTHETIC_DEVICE_SPECS, SUPPORT_SPECS, type SpecField } from "./case_fields";

export const NOT_APPLICABLE = "لا ينطبق";

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

/** **كلمةُ الطبيب تغلب**، وما حُفظ على الحلقة يسدّ ما تركه فارغاً. */
export function mergeDeviceSpecs(fromExam: Record<string, string>, stored: unknown): Record<string, string> {
  const out: Record<string, string> = { ...fromExam };
  if (stored && typeof stored === "object" && !Array.isArray(stored)) {
    for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
      if (!str(out[k]) && str(v)) out[k] = str(v);
    }
  }
  return out;
}

/** ما ينقص لـ«اشترى» — مفاتيحُ بترتيب الورقة. */
export function missingSaleSpecs(kind: DeviceKind, merged: Record<string, string>): string[] {
  return SALE_REQUIRED_SPECS[kind].filter((k) => !str(merged[k]));
}

/** ما يُقبَل من نافذة البيع: الخاناتُ الإلزامية وحدها، نصّاً مقصوصاً — وغيرُها يُهمَل. */
export function cleanSaleSpecsInput(input: unknown, kind: DeviceKind): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const k of SALE_REQUIRED_SPECS[kind]) {
    const v = str((input as Record<string, unknown>)[k]).slice(0, 200);
    if (v) out[k] = v;
  }
  return out;
}

export function saleSpecsMessage(kind: DeviceKind, missing: string[]): string {
  const labels = saleSpecFields(kind).filter((f) => missing.includes(f.key)).map((f) => f.label);
  return `أكمل مواصفات الجهاز قبل «اشترى»: ${labels.join("، ")} — واكتب «${NOT_APPLICABLE}» لما لا يخصّ هذا الجهاز`;
}
