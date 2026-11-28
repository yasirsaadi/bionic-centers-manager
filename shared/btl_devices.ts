// **كتالوجُ أجهزة BTL في المركز** (§4.ha — من `docs/claude/btl-devices.md`، صورةُ المالك ٢٠٢٦-١١-٢٧).
//
// لكلّ رمزِ جهازٍ في التطبيق موديلُه أو موديلاته، ولكلّ موديلٍ **نطاقاتُ الشركة المصنّعة وحدها** (دليلُ المستخدم أو صفحتُها) بمصدر كلّ نطاق —
// **لا جرعةَ من تجربةٍ سريرية تُكتب هنا حقيقةً** (نقدُ البحث: في بحث الأجهزة أخطاءُ استشهادٍ نبّه إليها المدقّقون). والبرامجُ الجاهزة **فارغة**
// حتى المرحلة السادسة (تُسجَّل من قوائم الأجهزة نفسِها) — فاسمُ برنامجٍ يكتبه Opus يُحذف في البوّابة (`program_stripped`).
// والقيمةُ الاحتياطية خارجَ النطاق **تُحذف ولا تُقصّ** (`param_out_of_range`) — رقمٌ مُقصوصٌ إعدادٌ لم يكتبه أحد.

export const BTL_CATALOG_VERSION = 1;

export interface BtlParam {
  key: string;
  labelEn: string;
  labelAr: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  /** من أين النطاق — دليلُ الشركة أو صفحتُها. */
  source: string;
}
/** قيدٌ متبادل: حين يتجاوز `whenKey` القيمةَ `whenAbove` لا يتجاوز `limitKey` القيمةَ `max`. */
export interface BtlCrossRule { id: string; whenKey: string; whenAbove: number; limitKey: string; max: number; textEn: string; textAr: string; source: string }
export interface BtlModel {
  id: string;
  deviceCode: string;
  nameEn: string;
  nameAr: string;
  variant: string | null;
  itemCodes: readonly string[];
  params: readonly BtlParam[];
  crossRules: readonly BtlCrossRule[];
  /** البرامجُ الجاهزة المسجَّلة من قائمة الجهاز — **فارغةٌ حتى المرحلة السادسة**. */
  programs: readonly string[];
  noteEn: string | null;
}

const RSWT = "BTL-6000 RSWT Elite user's manual §6.2.1, §8.7";
const FSWT = "BTL-6000 FSWT user's manual ch. 7.4.4 and 10";
const HIL = "BTL-6000 High Intensity Laser user's manual §6.4";
const SIS = "BTL-6000 Super Inductive System Elite user's manual §6.5, §8";
const B4825 = "BTL-4000 Smart/Premium user's manual §8.2–8.3";
const TRAC = "BTL-6000 Traction catalogue (P096.001)";

export const BTL_MODELS: readonly BtlModel[] = [
  {
    id: "rswt-elite", deviceCode: "shockwaves", variant: "radial", nameEn: "BTL-6000 RSWT Elite (Magnum applicator) — radial", nameAr: "موجات صادمة شعاعية BTL-6000 RSWT Elite",
    itemCodes: ["844-POELMA-M"], programs: [],
    params: [
      { key: "pressure_bar", labelEn: "Pressure", labelAr: "الضغط", unit: "bar", min: 1.5, max: 6.0, step: 0.1, source: RSWT },
      { key: "frequency_hz", labelEn: "Frequency", labelAr: "التردّد", unit: "Hz", min: 1, max: 22, step: 1, source: RSWT },
      { key: "shocks", labelEn: "Shocks per session", labelAr: "عدد النبضات", unit: "shocks", min: 1, max: 9999, step: 1, source: RSWT },
    ],
    crossRules: [{ id: "rswt_pressure_frequency", whenKey: "pressure_bar", whenAbove: 5.0, limitKey: "frequency_hz", max: 10,
      textEn: "At 5.1–6.0 bar the maximum frequency is 10 Hz", textAr: "فوق ٥ بار (٥٫١–٦) لا يتجاوز التردّدُ ١٠ هرتز", source: RSWT }],
    noteEn: "Start at a lower intensity and increase after patient tolerance (manual).",
  },
  {
    id: "fswt", deviceCode: "shockwaves", variant: "focused", nameEn: "BTL-6000 FSWT — focused (electromagnetic)", nameAr: "موجات صادمة مركّزة BTL-6000 FSWT",
    itemCodes: ["094-PO-M"], programs: [],
    params: [
      { key: "intensity_pct", labelEn: "Intensity", labelAr: "الشدّة", unit: "%", min: 5, max: 100, step: 1, source: FSWT },
      { key: "energy_flux_mj_mm2", labelEn: "Energy flux density", labelAr: "كثافة تدفّق الطاقة", unit: "mJ/mm2", min: 0.01, max: 0.65, source: FSWT },
      { key: "frequency_hz", labelEn: "Frequency", labelAr: "التردّد", unit: "Hz", min: 1, max: 25, step: 1, source: FSWT },
      { key: "shocks", labelEn: "Shocks per session", labelAr: "عدد النبضات", unit: "shocks", min: 1, max: 9999, step: 100, source: FSWT },
    ],
    crossRules: [{ id: "fswt_frequency_intensity", whenKey: "frequency_hz", whenAbove: 10, limitKey: "intensity_pct", max: 95,
      textEn: "Above 10 Hz the maximum intensity drops from 95% (to 30% at 25 Hz)", textAr: "فوق ١٠ هرتز تنزل الشدّةُ القصوى عن ٩٥٪ (حتى ٣٠٪ عند ٢٥ هرتز)", source: FSWT }],
    noteEn: "Older manual text reads 1–20 Hz; check MENU > unit information on the device.",
  },
  {
    id: "hil-30w", deviceCode: "laser", variant: null, nameEn: "BTL-6000 High Intensity Laser 30 W (class 4, 1064 nm)", nameAr: "ليزر عالي الشدّة BTL-6000 ‏30 واط",
    itemCodes: ["043-PO30W-M", "451-SCAEL2-M"], programs: [],
    params: [
      { key: "power_w", labelEn: "Power", labelAr: "القدرة", unit: "W", min: 0.5, max: 30, step: 0.5, source: HIL },
      { key: "dose_j_cm2", labelEn: "Dose", labelAr: "الجرعة", unit: "J/cm2", min: 1, max: 1000, step: 1, source: HIL },
      { key: "area_cm2", labelEn: "Treated area", labelAr: "المساحة", unit: "cm2", min: 1, max: 500, step: 1, source: HIL },
      { key: "frequency_hz", labelEn: "Pulse frequency (PW)", labelAr: "تردّد النبض", unit: "Hz", min: 1, max: 20000, step: 1, source: HIL },
      { key: "spot_mm", labelEn: "Spot diameter", labelAr: "قطر البقعة", unit: "mm", min: 10, max: 30, step: 5, source: HIL },
    ],
    crossRules: [],
    noteEn: "Class 4: eye protection for patient and therapist; Fitzpatrick skin type required by the device.",
  },
  {
    id: "sis-elite", deviceCode: "megnatik", variant: null, nameEn: "BTL-6000 Super Inductive System Elite", nameAr: "مغناطيس BTL-6000 Super Inductive System Elite",
    itemCodes: ["099-PO122-M"], programs: [],
    params: [
      { key: "intensity_pct", labelEn: "Intensity", labelAr: "الشدّة", unit: "%", min: 0, max: 100, step: 1, source: SIS },
      { key: "frequency_hz", labelEn: "Frequency", labelAr: "التردّد", unit: "Hz", min: 1, max: 150, step: 1, source: SIS },
    ],
    crossRules: [], noteEn: "Pulse Quality Monitor stops therapy when large metal is in the field.",
  },
  {
    id: "tr-elite", deviceCode: "tecar", variant: null, nameEn: "BTL-6000 TR-Therapy Elite", nameAr: "تيكار BTL-6000 TR-Therapy Elite",
    itemCodes: ["049-POELITE-M"], programs: [], params: [], crossRules: [],
    noteEn: "Displayed power is relative only (manual) — dose is set by the patient's thermal sensation, so no numeric fallback values.",
  },
  {
    id: "btl-4825s-electro", deviceCode: "electro", variant: null, nameEn: "BTL-4825S Premium — electrotherapy", nameAr: "تحفيز كهربائي BTL-4825S Premium",
    itemCodes: ["058-PO7825S-M"], programs: [],
    params: [
      { key: "frequency_hz", labelEn: "Frequency (TENS)", labelAr: "التردّد", unit: "Hz", min: 0.1, max: 1000, source: B4825 },
      { key: "pulse_us", labelEn: "Pulse width (TENS)", labelAr: "عرض النبضة", unit: "us", min: 10, max: 1000, source: B4825 },
      { key: "intensity_ma", labelEn: "Intensity (CC)", labelAr: "الشدّة", unit: "mA", min: 0, max: 140, source: B4825 },
      { key: "microcurrent_ua", labelEn: "Microcurrent", labelAr: "تيّار دقيق", unit: "uA", min: 0, max: 1000, source: B4825 },
      { key: "carrier_hz", labelEn: "Carrier (interferential/Russian)", labelAr: "التردّد الحامل", unit: "Hz", min: 2000, max: 10000, source: B4825 },
      { key: "amf_hz", labelEn: "AMF (interferential)", labelAr: "تردّد التعديل", unit: "Hz", min: 1, max: 250, source: B4825 },
    ],
    crossRules: [], noteEn: "Two channels; microcurrent up to 1000 µA (CC mode only).",
  },
  {
    id: "btl-4825s-us", deviceCode: "ultrasound", variant: null, nameEn: "BTL-4825S Premium — ultrasound (HandsFree Sono 6)", nameAr: "أمواج فوق صوتية BTL-4825S Premium",
    itemCodes: ["058-PO7825S-M", "447-APHFS6K-M"], programs: [],
    params: [
      { key: "frequency_mhz", labelEn: "Frequency", labelAr: "التردّد", unit: "MHz", min: 1, max: 3.1, source: B4825 },
      { key: "intensity_w_cm2", labelEn: "Intensity", labelAr: "الشدّة", unit: "W/cm2", min: 0.1, max: 3, step: 0.1, source: B4825 },
      { key: "duty_pct", labelEn: "Duty factor", labelAr: "نسبة التشغيل", unit: "%", min: 5, max: 100, source: B4825 },
      { key: "modulation_hz", labelEn: "Modulation frequency", labelAr: "تردّد التعديل", unit: "Hz", min: 10, max: 150, source: B4825 },
    ],
    crossRules: [], noteEn: "Continuous mode 0.1–2 W/cm²; pulsed up to 3 W/cm² (manual).",
  },
  {
    id: "traction-6000", deviceCode: "traction", variant: null, nameEn: "BTL-6000 Traction with BTL-1300 couch", nameAr: "شدّ BTL-6000 Traction",
    itemCodes: ["096-PO-M", "063-T3SEC1M-M", "296-LUMBSYS-M", "296-CRVLBELT-M"], programs: [],
    params: [
      { key: "force_kg", labelEn: "Traction force", labelAr: "قوّة الشدّ", unit: "kg", min: 1, max: 100, source: TRAC },
      { key: "hold_s", labelEn: "Hold time", labelAr: "زمن الثبات", unit: "s", min: 1, max: 999, source: TRAC },
      { key: "rest_s", labelEn: "Rest time", labelAr: "زمن الراحة", unit: "s", min: 1, max: 999, source: TRAC },
      { key: "time_min", labelEn: "Therapy time", labelAr: "مدّة الجلسة", unit: "min", min: 1, max: 99, source: TRAC },
    ],
    crossRules: [], noteEn: null,
  },
  {
    id: "rgait", deviceCode: "robotik", variant: null, nameEn: "BTL R-GAIT end-effector gait trainer", nameAr: "روبوت المشي BTL R-GAIT",
    itemCodes: ["660-PO-M"], programs: [], params: [], crossRules: [],
    noteEn: "Body-weight-support range, step length and cadence are not published — no numeric fallback values.",
  },
  {
    id: "combi-400-wax", deviceCode: "wax", variant: null, nameEn: "E-2000 COMBI 400 — paraffin", nameAr: "شمع E-2000 COMBI 400",
    itemCodes: ["625-PARAFFXL-M", "EKON-PARAFFBL25"], programs: [], params: [], crossRules: [],
    noteEn: "Manufacturer specification not found — no numeric fallback values.",
  },
  {
    id: "combi-400-hotpack", deviceCode: "hot_pack", variant: null, nameEn: "E-2000 COMBI 400 — peat warm carriers", nameAr: "كمادات حارة E-2000 COMBI 400",
    itemCodes: ["625-THCAR38x28-M", "625-THCAR30x14-M"], programs: [], params: [], crossRules: [],
    noteEn: "Manufacturer specification not found — no numeric fallback values.",
  },
];

/** أجهزةُ التطبيق بلا موديلٍ في الكتالوج — سطرُها بلا `btl_model_id`. */
export const NO_MODEL_DEVICE_CODES: readonly string[] = ["exercise", "needle", "infrared", "compression", "cpm"];

/** **الوحدةُ بالعربية** لما يُعرض للمعالج والمعتمِد — والإنكليزيّةُ (`unit`) للنموذج والبوّابة. */
export const UNIT_AR: Record<string, string> = {
  bar: "بار", Hz: "هرتز", MHz: "ميغاهرتز", shocks: "نبضة", "%": "٪", "mJ/mm2": "ملّي جول/مم²", W: "واط", "J/cm2": "جول/سم²", cm2: "سم²",
  mm: "مم", us: "ميكروثانية", mA: "ملّي أمبير", uA: "ميكرو أمبير", "W/cm2": "واط/سم²", kg: "كغم", s: "ثانية", min: "دقيقة",
};
export const unitAr = (u: string | null | undefined): string => (u ? UNIT_AR[u] ?? u : "");

export const btlModelsFor = (deviceCode: string): BtlModel[] => BTL_MODELS.filter((m) => m.deviceCode === deviceCode);
export const btlModelById = (id: unknown): BtlModel | null => (typeof id === "string" ? BTL_MODELS.find((m) => m.id === id) ?? null : null);

/** الكتالوجُ كما يُرسَل للنموذج — بلا تعليقاتٍ عربية لا يحتاجها. */
export function btlCatalogForModel() {
  return {
    version: BTL_CATALOG_VERSION,
    models: BTL_MODELS.map((m) => ({
      id: m.id, deviceCode: m.deviceCode, variant: m.variant, nameEn: m.nameEn, programs: m.programs, note: m.noteEn,
      params: m.params.map((p) => ({ key: p.key, label: p.labelEn, unit: p.unit, min: p.min, max: p.max, source: p.source })),
      crossRules: m.crossRules.map((r) => ({ id: r.id, rule: r.textEn })),
    })),
    devicesWithoutModel: NO_MODEL_DEVICE_CODES,
  };
}
