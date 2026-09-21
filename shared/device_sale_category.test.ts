// تصنيفُ بيعة جهاز — منطقٌ خالص، بلا قاعدة بيانات وبلا شبكة.
// `npm run test:device-sale-category`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) **الطرفُ الكامل يُفصَّل بنوع بتره**، والسليكونيُّ بجزئه — وهو سؤالُ
//     المالك بعينه: «كم إصبعاً سليكونياً بِيع؟».
// (ب) **وكلُّ جزءٍ من الثمانية باسمه** من المعجم القانونيّ.
// (ج) **والمسندُ الطبيُّ الكامل صنفٌ قائم** — كان يُستبعَد كلّياً.
// (د) **ولا يُخمَّن تصنيفٌ أبداً**: بلا معاينة، أو بوصفةٍ لم تلمس بانيَ
//     البتر ⟶ «نوعٌ غير مسجَّل» صراحةً — لا يُنسَب إلى الأشيع ولا يُسقَط.
// (هـ) **والمجاميعُ تتصالح**: مجموعُ صفوف التفصيل = عددُ البيعات المُدخَلة.

import {
  classifyDeviceSale, tallyDeviceSales, type DeviceSaleFacts,
} from "./device_sale_category";
import { COMPONENT_LABELS, PROSTHETIC_COMPONENTS } from "./prosthetic_parts";
import { SILICONE_PARTS } from "./case_fields";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown, detail = "") {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`
    + (detail ? `\n      ${detail}` : ""));
}

const full = (rx: Record<string, unknown> | null): DeviceSaleFacts =>
  ({ serviceType: "prosthetic", requestedItem: "full_device", prescription: rx });

console.log("── أ. الطرفُ الكامل يُفصَّل بنوع بتره ──");
same("أ.١ احادي", classifyDeviceSale(full({ amputationType: "single" })).key, "prosthetic_full:single");
same("أ.٢ وعنوانُه عربيٌّ يُقرأ",
  classifyDeviceSale(full({ amputationType: "single" })).label, "طرف صناعي كامل — احادي");
same("أ.٣ ثنائي", classifyDeviceSale(full({ amputationType: "double" })).key, "prosthetic_full:double");
same("أ.٤ وعنوانُه", classifyDeviceSale(full({ amputationType: "double" })).label, "طرف صناعي كامل — ثنائي");

console.log("\n── أ٢. **والسليكونيُّ بجزئه — سؤالُ المالك بعينه** ──");
const finger = classifyDeviceSale(full({ amputationType: "silicone", siliconePart: "اصبع" }));
same("أ٢.١ **الإصبعُ السليكونيّ صنفٌ قائمٌ بمفتاحه**", finger.key, "prosthetic_full:silicone:اصبع");
same("أ٢.٢ وعنوانُه كما ينطقه الفرع", finger.label, "اطراف سليكونية تعويضية — اصبع");
same("أ٢.٣ ونوعُه وجزؤه مُعلَنان",
  [finger.amputationType, finger.siliconePart], ["silicone", "اصبع"]);
for (const p of SILICONE_PARTS) {
  const c = classifyDeviceSale(full({ amputationType: "silicone", siliconePart: p }));
  check(c.key === `prosthetic_full:silicone:${p}` && c.label.endsWith(p),
    `أ٢.٤ وكلُّ جزءٍ سليكونيٍّ له صنفُه — «${p}»`, c.key);
}
const noPart = classifyDeviceSale(full({ amputationType: "silicone" }));
same("أ٢.٥ **وسليكونيٌّ بلا جزءٍ مسجَّل يُقال كذلك** لا يُخمَّن",
  [noPart.key, noPart.label],
  ["prosthetic_full:silicone:unrecorded", "اطراف سليكونية تعويضية — جزءٌ غير مسجَّل"]);
same("أ٢.٦ وسلسلةٌ فارغة تُقرأ غياباً لا قيمة",
  classifyDeviceSale(full({ amputationType: "silicone", siliconePart: "   " })).key,
  "prosthetic_full:silicone:unrecorded");

console.log("\n── ب. وكلُّ جزءٍ من الثمانية باسمه من المعجم القانونيّ ──");
for (const c of PROSTHETIC_COMPONENTS) {
  const r = classifyDeviceSale({ serviceType: "prosthetic", requestedItem: c, prescription: null });
  check(r.key === `prosthetic_part:${c}` && r.label === COMPONENT_LABELS[c] && r.scope === "part",
    `ب.١ «${COMPONENT_LABELS[c]}»`, JSON.stringify(r));
}
same("ب.٢ والجزءُ لا يحمل نوعَ بترٍ إطلاقاً",
  classifyDeviceSale({ serviceType: "prosthetic", requestedItem: "socket", prescription: { amputationType: "single" } }).amputationType,
  null);

console.log("\n── ج. والمسندُ الطبيُّ الكامل صنفٌ قائم ──");
const sup = classifyDeviceSale({ serviceType: "medical_support", requestedItem: "full_device", prescription: null });
same("ج.١ مفتاحُه وعنوانُه", [sup.key, sup.label], ["support_full", "مسند طبي كامل"]);
same("ج.٢ وقسمُه ومداه", [sup.serviceType, sup.scope], ["medical_support", "full"]);
same("ج.٣ **ولا جزءَ للمساند** — طلبٌ كهذا بياناتٌ فاسدة تُقال ولا تُصحَّح",
  classifyDeviceSale({ serviceType: "medical_support", requestedItem: "knee", prescription: null }).key,
  "unclassified");

console.log("\n── د. **ولا يُخمَّن تصنيفٌ أبداً** ──");
same("د.١ حلقةٌ بلا معاينةٍ فعّالة", classifyDeviceSale(full(null)).key, "prosthetic_full:unrecorded");
same("د.٢ وعنوانُها يقول ذلك", classifyDeviceSale(full(null)).label, "طرف صناعي كامل — نوعٌ غير مسجَّل");
same("د.٣ ووصفةٌ لم تلمس بانيَ البتر", classifyDeviceSale(full({ diagnosis: "بتر" })).key, "prosthetic_full:unrecorded");
same("د.٤ وقيمةٌ لا يعرفها البانِي", classifyDeviceSale(full({ amputationType: "quadruple" })).key, "prosthetic_full:unrecorded");
same("د.٥ ووصفةٌ ليست كائناً", classifyDeviceSale(full([] as any)).key, "prosthetic_full:unrecorded");
same("د.٦ وخدمةٌ مجهولة", classifyDeviceSale({ serviceType: "physiotherapy", requestedItem: "full_device", prescription: null }).key, "unclassified");
same("د.٧ وطلبٌ مجهول", classifyDeviceSale({ serviceType: "prosthetic", requestedItem: "wing", prescription: null }).key, "unclassified");

console.log("\n── هـ. والمجاميعُ تتصالح، والترتيبُ حتميّ ──");
const rows = tallyDeviceSales([
  full({ amputationType: "silicone", siliconePart: "اصبع" }),
  full({ amputationType: "silicone", siliconePart: "اصبع" }),
  full({ amputationType: "silicone", siliconePart: "كف" }),
  full({ amputationType: "single" }),
  full(null),
  { serviceType: "prosthetic", requestedItem: "socket", prescription: null },
  { serviceType: "medical_support", requestedItem: "full_device", prescription: null },
]);
same("هـ.١ **مجموعُ الصفوف = عددُ البيعات** — لا بيعةَ تسقط",
  rows.reduce((n, r) => n + r.sold, 0), 7);
same("هـ.٢ والإصبعُ السليكونيُّ اثنان",
  rows.find((r) => r.key === "prosthetic_full:silicone:اصبع")?.sold, 2);
same("هـ.٣ وصفوفُه ستّة (الإصبعان صفٌّ واحد)", rows.length, 6);
same("هـ.٤ **والأكثرُ مبيعاً أوّلاً**", rows[0].key, "prosthetic_full:silicone:اصبع");
const again = tallyDeviceSales([
  { serviceType: "prosthetic", requestedItem: "knee", prescription: null },
  { serviceType: "prosthetic", requestedItem: "socket", prescription: null },
]);
same("هـ.٥ **وتساوي العددين لا يجعل الترتيبَ يتبدّل** — المفتاحُ يحسم",
  again.map((r) => r.key), ["prosthetic_part:knee", "prosthetic_part:socket"]);
same("هـ.٦ ولا صفوفَ لبيعاتٍ فارغة", tallyDeviceSales([]), []);

console.log(failures ? `\n❌ ${failures} حالة فاشلة` : "\n✅ كل الفحوص نجحت");
process.exit(failures ? 1 : 0);
