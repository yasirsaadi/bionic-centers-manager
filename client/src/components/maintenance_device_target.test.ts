// اختيارُ جهاز الصيانة — منطقٌ خالص، بلا React ولا شبكة ولا قاعدة بيانات.
// `npm run test:maintenance-device-target`.
//
// ══ ما يثبته ═══════════════════════════════════════════════════════════
// تصحيحٌ لاحقٌ على PR #257 (المرحلة الثالثة): `devicePhaseOf` كانت تقرأ
// `isSuccess` وحدها دليلاً على استقرار الاستعلام، فإعادةُ جلبٍ خلفية
// (`isSuccess: true` مع `isFetching: true` — الشكلُ الذي تُبقيه React Query
// أثناء إعادة الجلب فوق بياناتٍ مخزَّنة) كانت تُقرأ نجاحاً نهائياً: يعرض
// حقلُ الجهاز القائمةَ **المخزَّنة القديمة** ويُتيح الحفظَ فوقها، بينما
// الحقيقةُ قيد التغيّر تلك اللحظة (جهازٌ سُلِّم للتوّ مثلاً).
//
// فصار الشرطُ `isSuccess && !isFetching` — **يُنفَّذ فعلياً هنا**، لا
// يُستدَلّ عليه من مصدر الشيفرة وحده: الحالاتُ الخمس (أ–هـ) تُشغِّل
// `devicePhaseOf` بمُدخَلاتٍ حقيقية وتقرأ مخرجها، ومعها تأكيدُ أن الحفظ
// يُمنَع فعلياً (`maintenanceDeviceBlocksSave`) في كلّ حالة إعادةِ جلب.

import {
  devicePhaseOf, maintenanceDeviceBlocksSave, resolveMaintenanceDeviceTarget,
  UNREGISTERED_DEVICE, type DeviceQueryState,
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

/** حالةٌ كاملة — كلّ حقلٍ صريح، بلا افتراضاتٍ ناقصة. */
function state(p: Partial<DeviceQueryState>): DeviceQueryState {
  return {
    isLoading: false, isFetching: false, isError: false, isSuccess: false,
    hasOptions: false, ...p,
  };
}

function main() {
  console.log("── devicePhaseOf: الحالاتُ الخمس المُلزَمة ──");

  // A. isSuccess=true, isFetching=false, hasOptions=true ⟶ choose
  same("A. نجاحٌ مستقرّ بخياراتٍ ⟶ choose",
    devicePhaseOf(state({ isSuccess: true, isFetching: false, hasOptions: true })),
    "choose");

  // B. isSuccess=true, isFetching=false, hasOptions=false ⟶ none
  same("B. نجاحٌ مستقرّ بلا خياراتٍ ⟶ none",
    devicePhaseOf(state({ isSuccess: true, isFetching: false, hasOptions: false })),
    "none");

  // C. isSuccess=true, isFetching=true, hasOptions=true ⟶ loading (يمنع الحفظ)
  {
    const phase = devicePhaseOf(state({ isSuccess: true, isFetching: true, hasOptions: true }));
    same("C. إعادةُ جلبٍ خلفية بخياراتٍ مخزَّنة ⟶ loading — لا choose",
      phase, "loading");
    check(maintenanceDeviceBlocksSave({ phase, selection: "5" }),
      "C. ويمنع الحفظ ولو كان هناك اختيارٌ سابق محفوظ في الشاشة");
    same("C. ولا يُستخرَج هدفٌ من هذه المرحلة — resolveMaintenanceDeviceTarget ⟶ null",
      resolveMaintenanceDeviceTarget({ phase, selection: "5" }), null);
  }

  // D. isSuccess=true, isFetching=true, hasOptions=false ⟶ loading (يمنع الحفظ)
  {
    const phase = devicePhaseOf(state({ isSuccess: true, isFetching: true, hasOptions: false }));
    same("D. إعادةُ جلبٍ خلفية بصفر خياراتٍ مخزَّنة ⟶ loading — لا none",
      phase, "loading");
    check(maintenanceDeviceBlocksSave({ phase, selection: "" }),
      "D. ويمنع الحفظ — الصفرُ المخزَّن قد لا يكون صادقاً الآن");
    same("D. ولا يُقرَأ «جهازٌ غير مسجَّل» تلقائياً أثناء إعادة الجلب",
      resolveMaintenanceDeviceTarget({ phase, selection: "" }), null);
  }

  // E. isError=true ⟶ error (بصرف النظر عن hasOptions/isFetching)
  same("E. فشلُ الطلب ⟶ error",
    devicePhaseOf(state({ isError: true, isFetching: true, hasOptions: true })),
    "error");
  same("E.ب والخطأُ يسبق كلّ شيءٍ آخر — حتى لو ادّعى isSuccess معه",
    devicePhaseOf(state({ isError: true, isSuccess: true, isFetching: false, hasOptions: true })),
    "error");

  console.log("\n── حالاتٌ إضافية — تحميلٌ أوّليّ واستقرارُ الحفظ ──");

  // بلا isSuccess ولا isError إطلاقاً — تحميلٌ أوّليّ أو استعلامٌ غير مفعَّل.
  same("و. لا نجاحَ ولا خطأَ بعد ⟶ loading",
    devicePhaseOf(state({ isLoading: true })), "loading");

  // بعد أن استقرّ النجاحُ فعلاً (isFetching عاد false) — الحفظُ يُفتَح من جديد.
  {
    const stable = devicePhaseOf(state({ isSuccess: true, isFetching: false, hasOptions: true }));
    check(!maintenanceDeviceBlocksSave({ phase: stable, selection: "5" }),
      "ز. وبعد استقرار الجلب (isFetching: false) — الحفظُ يُفتَح باختيارٍ صريح");
    same("ز.ب وهويّةُ الجهاز المُستخرَجة رقمُ الحلقة نفسُه",
      resolveMaintenanceDeviceTarget({ phase: stable, selection: "5" }),
      { deviceEpisodeId: 5, legacyUnrecordedDevice: false });
  }

  // «none» المستقرّة وحدها تُتيح «غير مسجَّل» تلقائياً.
  {
    const none = devicePhaseOf(state({ isSuccess: true, isFetching: false, hasOptions: false }));
    check(!maintenanceDeviceBlocksSave({ phase: none, selection: "" }),
      "ح. النجاحُ المستقرّ بصفر خياراتٍ لا يمنع الحفظ — «غير مسجَّل» تلقائياً");
    same("ح.ب والهدفُ المُستخرَج «غير مسجَّل» صراحةً",
      resolveMaintenanceDeviceTarget({ phase: none, selection: "" }),
      { deviceEpisodeId: null, legacyUnrecordedDevice: true });
  }

  // اختيارُ «غير مسجَّل» صراحةً من قائمةٍ فيها خياراتٌ حقيقية أيضاً.
  {
    const choose = devicePhaseOf(state({ isSuccess: true, isFetching: false, hasOptions: true }));
    same("ط. اختيارُ «غير مسجَّل» صراحةً من choose",
      resolveMaintenanceDeviceTarget({ phase: choose, selection: UNREGISTERED_DEVICE }),
      { deviceEpisodeId: null, legacyUnrecordedDevice: true });
  }

  console.log(failures === 0
    ? "\n✅ all maintenance-device-target cases pass"
    : `\n❌ ${failures} case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
