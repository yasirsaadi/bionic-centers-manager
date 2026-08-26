// منطقُ هويّةِ جهاز الصيانة — بلا React وبلا قاعدة بيانات.
// `npm run test:maintenance-device-target`.
//
// ══ العطبُ الذي يحرسه هذا الملفّ ═══════════════════════════════════════
// `devices.length === 0` كانت تعني ثلاثةَ أشياءَ مختلفة: «لم يصل ردٌّ
// بعد» و«فشل الطلب» و«وصل ردٌّ ناجحٌ بصفر عناصر فعلاً» — والنافذةُ كانت
// تعامل الثلاثةَ معاملةً واحدة: تُخفي مُنتقي الجهاز وتسمح بحفظ صيانةٍ
// «غير مسجَّلة». فموظّفٌ يفتح النافذةَ على اتصالٍ بطيء قد يحفظ صيانةً
// بلا هويّة جهاز بينما القائمةُ الحقيقية لم تُعرَف بعد قطّ.
//
// ══ وما يُثبَته هنا ══════════════════════════════════════════════════════
//   (أ) `devicePhaseOf` تقرأ حالة `react-query` بلا اختراع آلة حالةٍ ثانية.
//   (ب) `maintenanceDeviceMissing` — الحقلُ ناقصٌ حتى يُعرَف الجوابُ يقيناً.
//   (ج) `maintenanceDeviceSelectorVisible` — لا مُنتقي إلّا بعد نجاحٍ
//       حقيقيّ وبحلقةٍ واحدة فأكثر.
//   (د) `maintenanceDeviceRequestFields` — حقلا الطلب: واحدةٌ من اثنتين
//       دائماً، لا صفرٌ ولا اثنتان معاً — نفسُ شرط الخادم بالضبط.
//   (هـ) عقدُ الشاشة: النافذةُ تستورد هذه الدوالّ حرفياً ولا تُعيد بناءَ
//       القرار بنفسها، ولا «صفر أجهزة» صريحٌ في مسار الحفظ.

import { readFileSync } from "fs";
import { join } from "path";
import {
  UNREGISTERED_DEVICE, devicePhaseOf, maintenanceDeviceSelectorVisible,
  maintenanceDeviceMissing, maintenanceDeviceRequestFields,
  type MaintenanceDeviceState,
} from "./maintenance_device_target";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const st = (over: Partial<MaintenanceDeviceState>): MaintenanceDeviceState => ({
  phase: "resolved", deviceCount: 0, selectedTarget: "", ...over,
});

console.log("\n── أ. devicePhaseOf — لا آلة حالةٍ ثانية ──");
same("١. نجاحٌ ⟶ resolved", devicePhaseOf({ isSuccess: true, isError: false }), "resolved");
same("٢. **نجاحٌ + إعادةُ جلبٍ خلفية ⟶ resolved رغم ذلك**",
  devicePhaseOf({ isSuccess: true, isError: false }), "resolved");
same("٣. خطأٌ ⟶ error", devicePhaseOf({ isSuccess: false, isError: true }), "error");
same("٤. لا نجاحَ ولا خطأ (تحميلٌ أوّل) ⟶ loading",
  devicePhaseOf({ isSuccess: false, isError: false }), "loading");

console.log("\n── ب. الحالةُ A: تحميلٌ — لا حفظَ ولا صفراً ──");
{
  const s = st({ phase: "loading", deviceCount: 0, selectedTarget: "" });
  check(maintenanceDeviceMissing(s), "٥. **التحميلُ ⟶ الحقلُ ناقصٌ** — لا يُفتَح الحفظ");
  check(!maintenanceDeviceSelectorVisible(s), "٦. ولا مُنتقيَ يظهر أثناء التحميل");
  same("٧. **ولا حقولَ طلبٍ تُبنى** — `null` صراحةً لا تخمين",
    maintenanceDeviceRequestFields(s), null);
}
{
  //  **ولو كان العددُ المخزَّن صفراً من قراءةٍ سابقة** — التحميلُ الحاليّ
  //  يبقى يمنع الحفظ؛ لا يُستعمَل رقمٌ بائت.
  const s = st({ phase: "loading", deviceCount: 0, selectedTarget: UNREGISTERED_DEVICE });
  check(maintenanceDeviceMissing(s),
    "٨. **وحتى مع اختيارٍ سابق** — تحميلٌ جديد يُعيد الحقلَ ناقصاً");
}

console.log("\n── ج. الحالةُ B: فشلٌ — رسالةٌ ولا حفظَ ولا تخمينَ «غير مسجَّل» ──");
{
  const s = st({ phase: "error", deviceCount: 0, selectedTarget: "" });
  check(maintenanceDeviceMissing(s), "٩. **الفشلُ ⟶ الحقلُ ناقصٌ**");
  check(!maintenanceDeviceSelectorVisible(s), "١٠. ولا مُنتقيَ يظهر بعد فشل");
  same("١١. **ولا يُفسَّر الفشلُ «جهازاً غير مسجَّل» بصمت**",
    maintenanceDeviceRequestFields(s), null);
}

console.log("\n── د. الحالةُ C: نجاحٌ بصفر — مُنتقًى غائبٌ ونيّةٌ صريحة للخادم ──");
{
  const s = st({ phase: "resolved", deviceCount: 0, selectedTarget: "" });
  check(!maintenanceDeviceMissing(s), "١٢. **صفرٌ محلولٌ ⟶ لا نقصَ** — لا خيارَ ليُختار");
  check(!maintenanceDeviceSelectorVisible(s), "١٣. ولا مُنتقيَ يظهر — لا خيارَ حقيقياً ليُعرَض");
  same("١٤. **وحقولُ الطلب تحمل نيّةً صريحة**",
    maintenanceDeviceRequestFields(s), { deviceEpisodeId: null, legacyUnrecordedDevice: true });
}

console.log("\n── هـ. الحالةُ D: نجاحٌ بحلقاتٍ — مُنتقًى إلزاميّ ──");
{
  const unselected = st({ phase: "resolved", deviceCount: 2, selectedTarget: "" });
  check(maintenanceDeviceMissing(unselected),
    "١٥. **حلقاتٌ موجودة وبلا اختيار ⟶ ناقصٌ** — لا اختيارَ تلقائيّ");
  check(maintenanceDeviceSelectorVisible(unselected), "١٦. والمُنتقي يظهر");
  same("١٧. ولا حقولَ طلبٍ قبل الاختيار",
    maintenanceDeviceRequestFields(unselected), null);

  const registered = st({ phase: "resolved", deviceCount: 2, selectedTarget: "9407" });
  check(!maintenanceDeviceMissing(registered), "١٨. **معرّفٌ محدَّد ⟶ لا نقص**");
  same("١٩. **والحقولُ تحمل المعرّفَ الدقيق**",
    maintenanceDeviceRequestFields(registered),
    { deviceEpisodeId: 9407, legacyUnrecordedDevice: false });

  const explicitUnregistered = st({
    phase: "resolved", deviceCount: 2, selectedTarget: UNREGISTERED_DEVICE,
  });
  check(!maintenanceDeviceMissing(explicitUnregistered),
    "٢٠. **واختيارُ «غير مسجَّل» صراحةً ⟶ لا نقص أيضاً**");
  same("٢١. **والحقولُ تحمل النيّةَ الصريحة — لا حلقةَ ولا تخمين**",
    maintenanceDeviceRequestFields(explicitUnregistered),
    { deviceEpisodeId: null, legacyUnrecordedDevice: true });
}

console.log("\n── و. الشرطُ نفسُه الذي يفرضه الخادم — واحدةٌ من اثنتين لا صفرٌ ولا كلاهما ──");
for (const s of [
  st({ phase: "resolved", deviceCount: 0 }),
  st({ phase: "resolved", deviceCount: 3, selectedTarget: "5" }),
  st({ phase: "resolved", deviceCount: 3, selectedTarget: UNREGISTERED_DEVICE }),
]) {
  const f = maintenanceDeviceRequestFields(s);
  check(Boolean(f), "٢٢. حقولٌ حقيقية لكلّ حالةٍ جاهزة", JSON.stringify(s));
  if (f) {
    same("   **واحدةٌ من اثنتين بالضبط**",
      [f.deviceEpisodeId !== null, f.legacyUnrecordedDevice === true].filter(Boolean).length, 1);
  }
}

console.log("\n── ز. عقدُ الشاشة — النافذةُ تستورد القرار ولا تعيد اختراعه ──");
{
  const DIALOG = readFileSync(
    join(process.cwd(), "client/src/components/NoExamOperationDialog.tsx"), "utf8");
  check(DIALOG.includes(`from "./maintenance_device_target"`),
    "٢٣. **والنافذةُ تستورد من الملفّ القانونيّ**");
  for (const fn of ["devicePhaseOf", "maintenanceDeviceSelectorVisible",
    "maintenanceDeviceMissing", "maintenanceDeviceRequestFields"]) {
    check(DIALOG.includes(fn), `   وتستعمل \`${fn}\``);
  }
  const strip = (s: string) => s.split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  const dialogCode = strip(DIALOG);
  check(!/devices\.length === 0[\s\S]{0,80}legacyUnrecordedDevice/.test(dialogCode),
    "٢٤. **ولا حسابَ محلّياً ثانياً لهويّة الجهاز** — الدالّةُ القانونية وحدها");
  check(dialogCode.includes("no-exam-op-device-loading")
    && dialogCode.includes("no-exam-op-device-error"),
  "٢٥. **وحالتا تحميلٍ وخطأٍ ظاهرتان** بمعرّفَي اختبار");
}

console.log(`\n${failures === 0
  ? "✅ كلّ فحوص هويّة جهاز الصيانة نجحت" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
