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
// ══ وتشديدٌ ثانٍ: `isSuccess` وحدها لم تكن كافية ═══════════════════════
// كانت `devicePhaseOf` تقرأ `isSuccess` وحدها «محلولاً»، فنجاحٌ سابقٌ مع
// إعادة جلبٍ **قائمة الآن** خلفه (بعد حذف مريضٍ، أو تسليم جهاز، أو مجرّد
// تحديث القائمة) كان يُقرأ «محلولاً» أيضاً — فيُبنى قرارٌ على لقطةٍ قد
// تصير بائتة **قبل أن يصل الردُّ الجديد أصلاً**. فصار الشرطُ `isSuccess
// && !isFetching`: لا قرارَ إلّا حين تسكت الشبكةُ على نتيجةٍ نهائية.
//
// ══ وما يُثبَته هنا ══════════════════════════════════════════════════════
//   (أ) `devicePhaseOf` — الحالاتُ الخمس A–E: تحميلٌ أوّل · نجاحٌ ساكن ·
//       نجاحٌ + إعادةُ جلب (بصفرٍ أو بحلقات) · خطأٌ نهائيّ.
//   (ب) الحالةُ A كاملةً عبر خطّ الأنابيب: لا حفظَ ولا صفراً.
//   (ج) الحالتان C/D كاملتين: إعادةُ جلبٍ خلفَ نتيجةٍ ناجحة — محجوبتان
//       سواءً كانت النتيجةُ المخزَّنة صفراً أو حلقةً مختارة سلفاً.
//   (د) الحالةُ E كاملةً: فشلٌ — رسالةٌ ولا تخمينَ «غير مسجَّل».
//   (هـ) نجاحٌ ساكنٌ بصفر — مُنتقًى غائبٌ ونيّةٌ صريحة للخادم.
//   (و) نجاحٌ ساكنٌ بحلقاتٍ — مُنتقًى إلزاميّ، ولا اختيارَ تلقائيّ.
//   (ز) الشرطُ نفسُه الذي يفرضه الخادم — واحدةٌ من اثنتين لا صفرٌ ولا كلاهما.
//   (ح) عقدُ الشاشة: النافذةُ تستورد هذه الدوالّ حرفياً ولا تُعيد بناءَ
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

console.log("\n── أ. devicePhaseOf — resolved لا يُقرأ إلّا على شبكةٍ ساكنة ──");
same("١. **A: تحميلٌ أوّل ⟶ loading**",
  devicePhaseOf({ isSuccess: false, isFetching: true, isError: false }), "loading");
same("٢. **B: نجاحٌ بلا نداءٍ قائم ⟶ resolved**",
  devicePhaseOf({ isSuccess: true, isFetching: false, isError: false }), "resolved");
//  (C/D) **نجاحٌ سابقٌ + إعادةُ جلبٍ خلفيةٌ قائمة ⟶ محجوب رغم النجاح
//  السابق** — هذا هو الإصلاحُ في هذه الجولة بعينه.
same("٣. **C/D: نجاحٌ سابقٌ + إعادةُ جلبٍ قائمة ⟶ loading لا resolved**",
  devicePhaseOf({ isSuccess: true, isFetching: true, isError: false }), "loading");
//  (E) **خطأٌ نهائيّ ⟶ محجوب بحالة «خطأ»** — تعلو حتى لو كانت محاولةٌ
//  تلقائية قائمةً خلفها.
same("٤. **E: خطأٌ ساكن ⟶ error**",
  devicePhaseOf({ isSuccess: false, isFetching: false, isError: true }), "error");
same("٥. **E.ب: خطأٌ مستقرّ وإعادةُ محاولةٍ تلقائية قائمة ⟶ error رغم ذلك**",
  devicePhaseOf({ isSuccess: false, isFetching: true, isError: true }), "error");
same("٦. **وبلا نجاحٍ ولا خطأٍ ولا جلبٍ (استعلامٌ معطَّل) ⟶ loading**",
  devicePhaseOf({ isSuccess: false, isFetching: false, isError: false }), "loading");

console.log("\n── ب. الحالةُ A كاملةً: تحميلٌ — لا حفظَ ولا صفراً ──");
{
  const phase = devicePhaseOf({ isSuccess: false, isFetching: true, isError: false });
  const s = st({ phase, deviceCount: 0, selectedTarget: "" });
  check(maintenanceDeviceMissing(s), "٧. **التحميلُ ⟶ الحقلُ ناقصٌ** — لا يُفتَح الحفظ");
  check(!maintenanceDeviceSelectorVisible(s), "٨. ولا مُنتقيَ يظهر أثناء التحميل");
  same("٩. **ولا حقولَ طلبٍ تُبنى** — `null` صراحةً لا تخمين",
    maintenanceDeviceRequestFields(s), null);
}
{
  //  **ولو كان العددُ المخزَّن صفراً من قراءةٍ سابقة** — التحميلُ الحاليّ
  //  يبقى يمنع الحفظ؛ لا يُستعمَل رقمٌ بائت.
  const s = st({ phase: "loading", deviceCount: 0, selectedTarget: UNREGISTERED_DEVICE });
  check(maintenanceDeviceMissing(s),
    "١٠. **وحتى مع اختيارٍ سابق** — تحميلٌ جديد يُعيد الحقلَ ناقصاً");
}

console.log("\n── ج. الحالتان C/D كاملتين: إعادةُ جلبٍ خلف نتيجةٍ ناجحة ⟶ محجوبتان ──");
{
  //  (C) نتيجةٌ مخزَّنةٌ **صفر** + إعادةُ جلبٍ قائمة الآن.
  const phase = devicePhaseOf({ isSuccess: true, isFetching: true, isError: false });
  const s = st({ phase, deviceCount: 0, selectedTarget: "" });
  check(maintenanceDeviceMissing(s),
    "١١. **C: صفرٌ مخزَّنٌ + إعادةُ جلب ⟶ ناقصٌ رغم الصفر** — لا يُقرَأ محلولاً");
  check(!maintenanceDeviceSelectorVisible(s), "١٢. ولا مُنتقيَ يظهر أثناء إعادة الجلب");
  same("١٣. **ولا حقولَ طلبٍ تُبنى من نتيجةٍ قد تصير بائتة**",
    maintenanceDeviceRequestFields(s), null);
}
{
  //  (D) نتيجةٌ مخزَّنةٌ **بحلقاتٍ وجهازٌ مختارٌ سلفاً** + إعادةُ جلبٍ
  //  قائمة الآن — **الاختيارُ السابق لا يُنقَذ الحفظَ**: القائمةُ نفسُها
  //  محلُّ شكّ الآن، فقد يكون الجهازُ المختار لم يعد مؤهَّلاً.
  const phase = devicePhaseOf({ isSuccess: true, isFetching: true, isError: false });
  const s = st({ phase, deviceCount: 3, selectedTarget: "9407" });
  check(maintenanceDeviceMissing(s),
    "١٤. **D: حلقاتٌ مخزَّنة وجهازٌ مختارٌ سلفاً + إعادةُ جلب ⟶ ناقصٌ رغم ذلك**");
  check(!maintenanceDeviceSelectorVisible(s),
    "١٥. **ولا مُنتقيَ يظهر أثناء إعادة الجلب** — رغم أن آخر نتيجةٍ حملت حلقات");
  same("١٦. **ولا حقولَ طلبٍ تُبنى من اختيارٍ فوق نتيجةٍ بائتة**",
    maintenanceDeviceRequestFields(s), null);
}

console.log("\n── د. الحالةُ E كاملةً: فشلٌ — رسالةٌ ولا تخمينَ «غير مسجَّل» ──");
{
  const phase = devicePhaseOf({ isSuccess: false, isFetching: false, isError: true });
  const s = st({ phase, deviceCount: 0, selectedTarget: "" });
  check(maintenanceDeviceMissing(s), "١٧. **الفشلُ ⟶ الحقلُ ناقصٌ**");
  check(!maintenanceDeviceSelectorVisible(s), "١٨. ولا مُنتقيَ يظهر بعد فشل");
  same("١٩. **ولا يُفسَّر الفشلُ «جهازاً غير مسجَّل» بصمت**",
    maintenanceDeviceRequestFields(s), null);
}

console.log("\n── هـ. نجاحٌ ساكنٌ بصفر — مُنتقًى غائبٌ ونيّةٌ صريحة للخادم ──");
{
  const s = st({ phase: "resolved", deviceCount: 0, selectedTarget: "" });
  check(!maintenanceDeviceMissing(s), "٢٠. **صفرٌ محلولٌ ⟶ لا نقصَ** — لا خيارَ ليُختار");
  check(!maintenanceDeviceSelectorVisible(s), "٢١. ولا مُنتقيَ يظهر — لا خيارَ حقيقياً ليُعرَض");
  same("٢٢. **وحقولُ الطلب تحمل نيّةً صريحة**",
    maintenanceDeviceRequestFields(s), { deviceEpisodeId: null, legacyUnrecordedDevice: true });
}

console.log("\n── و. نجاحٌ ساكنٌ بحلقاتٍ — مُنتقًى إلزاميّ ──");
{
  const unselected = st({ phase: "resolved", deviceCount: 2, selectedTarget: "" });
  check(maintenanceDeviceMissing(unselected),
    "٢٣. **حلقاتٌ موجودة وبلا اختيار ⟶ ناقصٌ** — لا اختيارَ تلقائيّ");
  check(maintenanceDeviceSelectorVisible(unselected), "٢٤. والمُنتقي يظهر");
  same("٢٥. ولا حقولَ طلبٍ قبل الاختيار",
    maintenanceDeviceRequestFields(unselected), null);

  const registered = st({ phase: "resolved", deviceCount: 2, selectedTarget: "9407" });
  check(!maintenanceDeviceMissing(registered), "٢٦. **معرّفٌ محدَّد ⟶ لا نقص**");
  same("٢٧. **والحقولُ تحمل المعرّفَ الدقيق**",
    maintenanceDeviceRequestFields(registered),
    { deviceEpisodeId: 9407, legacyUnrecordedDevice: false });

  const explicitUnregistered = st({
    phase: "resolved", deviceCount: 2, selectedTarget: UNREGISTERED_DEVICE,
  });
  check(!maintenanceDeviceMissing(explicitUnregistered),
    "٢٨. **واختيارُ «غير مسجَّل» صراحةً ⟶ لا نقص أيضاً**");
  same("٢٩. **والحقولُ تحمل النيّةَ الصريحة — لا حلقةَ ولا تخمين**",
    maintenanceDeviceRequestFields(explicitUnregistered),
    { deviceEpisodeId: null, legacyUnrecordedDevice: true });
}

console.log("\n── ز. الشرطُ نفسُه الذي يفرضه الخادم — واحدةٌ من اثنتين لا صفرٌ ولا كلاهما ──");
for (const s of [
  st({ phase: "resolved", deviceCount: 0 }),
  st({ phase: "resolved", deviceCount: 3, selectedTarget: "5" }),
  st({ phase: "resolved", deviceCount: 3, selectedTarget: UNREGISTERED_DEVICE }),
]) {
  const f = maintenanceDeviceRequestFields(s);
  check(Boolean(f), "٣٠. حقولٌ حقيقية لكلّ حالةٍ جاهزة", JSON.stringify(s));
  if (f) {
    same("   **واحدةٌ من اثنتين بالضبط**",
      [f.deviceEpisodeId !== null, f.legacyUnrecordedDevice === true].filter(Boolean).length, 1);
  }
}

console.log("\n── ح. عقدُ الشاشة — النافذةُ تستورد القرار ولا تعيد اختراعه ──");
{
  const DIALOG = readFileSync(
    join(process.cwd(), "client/src/components/NoExamOperationDialog.tsx"), "utf8");
  check(DIALOG.includes(`from "./maintenance_device_target"`),
    "٣١. **والنافذةُ تستورد من الملفّ القانونيّ**");
  for (const fn of ["devicePhaseOf", "maintenanceDeviceSelectorVisible",
    "maintenanceDeviceMissing", "maintenanceDeviceRequestFields"]) {
    check(DIALOG.includes(fn), `   وتستعمل \`${fn}\``);
  }
  const strip = (s: string) => s.split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  const dialogCode = strip(DIALOG);
  check(!/devices\.length === 0[\s\S]{0,80}legacyUnrecordedDevice/.test(dialogCode),
    "٣٢. **ولا حسابَ محلّياً ثانياً لهويّة الجهاز** — الدالّةُ القانونية وحدها");
  check(dialogCode.includes("no-exam-op-device-loading")
    && dialogCode.includes("no-exam-op-device-error"),
  "٣٣. **وحالتا تحميلٍ وخطأٍ ظاهرتان** بمعرّفَي اختبار");
  //  **وحقلُ `isFetching` يصل إلى `devicePhaseOf` فعلاً** — لا استيرادَ
  //  بلا استعمال. `deviceQuery` يحمل الحقلَ كاملاً من `useDeviceEpisodes`
  //  ويُمرَّر بجملته، فلا حاجةَ لذكر `isFetching` حرفياً في هذا الملفّ.
  check(dialogCode.includes("devicePhaseOf(deviceQuery)"),
    "٣٤. **والنافذةُ تمرّر حالة الاستعلام كاملةً** — بما فيها `isFetching`");
}

console.log(`\n${failures === 0
  ? "✅ كلّ فحوص هويّة جهاز الصيانة نجحت" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
