// حالةُ إسناد الخبير في سجلّ المرضى — منطقٌ خالص، بلا قاعدة بيانات.
// `npm run test:registry-assignment`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الحالة لكل خدمة على حدة، لا عَلَمٌ واحد للمريض**: مريضٌ أُسنِد
//     طرفُه وبقي مسندُه ينتظر يبقى زرُّه ظاهراً لمسنده وحده. هذا هو
//     الخطأ الوحيد الذي لا يُغتفَر هنا.
// (٢) **الصيانة ليست إسناداً**: خبيرُ الصيانة يعمل على جهازٍ قائم، فلا
//     يخفي زرَّ تخصيص جهازٍ يُبنى ولا يقول «تم إسناد الطرف».
// (٣) **المنتهي لا يُحتسب**: أمرٌ سُلّم أو أُلغي ليس إسناداً قائماً.
// (٤) **الإعفاء التاريخي يرفع شرط المعاينة لا شرط الأمر**.
// (٥) **«تم تحديد» لا يبقى بعد التخصيص**: الحالة الأحدث تسود.
//
// ملاحظة صريحة: احتساب الصيانة والمنتهي يُصفَّى في **الخادم** (استعلام
// السجلّ يشترط `initial_build` وغير المنتهي)، فما يصل هنا مصفّىً أصلاً.
// والحالتان مُختبَرتان في الخادم أيضاً — انظر `test:registry-assignment-api`.

import {
  assignableServices, assignedServices, assignmentBadgeLabel, assignmentFor,
  ownedDeviceServices, resolveDialogService, visibleDecided, type ActiveAssignment,
} from "./patient_registry_assignment";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const assign = (serviceType: string, expertName: string | null = "أحمد"): ActiveAssignment => ({
  serviceType, workOrderId: 1, deviceEpisodeId: 7, expertUserId: 5,
  expertName, status: "active", currentStage: "order_received",
});

// ══ أ. مريضٌ عادي: معاينة موقّعة بلا أمر ══════════════════════════════
console.log("\n── قابلية التخصيص ──");
const plainProsthetic = { id: 1, isAmputee: true, activeDeviceAssignments: [] };
same("أ. طرفٌ قرّره الطبيب ولا أمر له ⟶ قابل للتخصيص",
  assignableServices({ patient: plainProsthetic, decided: ["prosthetic"], legacyExempt: false }),
  ["prosthetic"]);
same("   وبلا قرار الطبيب ⟶ غير قابل",
  assignableServices({ patient: plainProsthetic, decided: [], legacyExempt: false }), []);

// ══ ب. بعد التخصيص ═══════════════════════════════════════════════════
const assignedProsthetic = {
  id: 2, isAmputee: true, activeDeviceAssignments: [assign("prosthetic")],
};
//  والحلقةُ الوحيدة أُسنِدت فخرجت من `decided` **حيّاً في الخادم** (حالتُها
//  صارت `in_manufacturing`) — هذا هو الشكلُ الواقعيّ الذي يصل هذه الدالّة.
same("ب. وبعد إسناد الحلقة الوحيدة (فخرجت من decided) ⟶ لم يعد قابلاً",
  assignableServices({ patient: assignedProsthetic, decided: [], legacyExempt: false }), []);
//  ══ ب٢. حلقتان — إسنادُ إحداهما لا يُخفي الخدمةَ عن الأخرى (ترحيل ٠٧٣) ══
//  هنا **بالضبط** يقع الفرقُ عن العالم القديم: `decided` تبقى صحيحةً
//  (حلقةٌ أخرى ما زالت `examined`) رغم أن `activeDeviceAssignments` تحمل
//  إسناداً فعلياً — والخدمةُ يجب أن تبقى ظاهرة.
same("ب٢. **وحلقةٌ أخرى ما زالت مؤهَّلة (decided ما زالت تذكرها) ⟶ تبقى ظاهرة رغم الإسناد**",
  assignableServices({ patient: assignedProsthetic, decided: ["prosthetic"], legacyExempt: false }),
  ["prosthetic"]);
same("   والشارة تحمل اسم الخبير",
  assignmentBadgeLabel(assign("prosthetic")), "تم إسناد الطرف — أحمد");
same("   وبلا اسمٍ تبقى مفهومة",
  assignmentBadgeLabel(assign("prosthetic", null)), "تم إسناد الطرف");
same("   والمسند بصيغته",
  assignmentBadgeLabel(assign("medical_support")), "تم إسناد المسند — أحمد");
same("   ونوعٌ غير معروف يقع على النصّ العام",
  assignmentBadgeLabel(assign("physiotherapy", null)), "تم إسناد الخبير");

// ══ ج. الإعفاء التاريخي ══════════════════════════════════════════════
console.log("\n── الإعفاء التاريخي ──");
const legacyPlain = { id: 3, isAmputee: true, activeDeviceAssignments: [] };
same("ج. القديم بلا معاينة ⟶ قابل للتخصيص كما كان",
  assignableServices({ patient: legacyPlain, decided: [], legacyExempt: true }), ["prosthetic"]);
const legacyAssigned = {
  id: 4, isAmputee: true, activeDeviceAssignments: [assign("prosthetic")],
};
same("   **لكن أمراً فعّالاً يمنعه — الإعفاء يرفع شرط المعاينة لا شرط الأمر**",
  assignableServices({ patient: legacyAssigned, decided: [], legacyExempt: true }), []);

// ══ د. المريض ذو الخدمتين — الحالة الحرجة ════════════════════════════
console.log("\n── الخدمتان معاً ──");
const dual = {
  id: 5, isAmputee: true, isMedicalSupport: true,
  activeDeviceAssignments: [assign("prosthetic")],
};
//  حلقةُ الطرف الوحيدة أُسنِدت فخرجت من `decided` **حيّاً في الخادم** —
//  هذا هو الشكلُ الواقعيّ حين لا يملك الطرفُ إلّا حلقةً واحدة.
same("د. الطرف مُسنَد (فخرج من decided) والمسند قرّره الطبيب ⟶ **المسند وحده يبقى قابلاً**",
  assignableServices({ patient: dual, decided: ["medical_support"], legacyExempt: false }),
  ["medical_support"]);
same("   والطرف يظهر مُسنَداً", assignedServices(dual), ["prosthetic"]);
same("   وإسناده مقروء", assignmentFor(dual, "prosthetic")?.expertName, "أحمد");
same("   ولا إسناد للمسند", assignmentFor(dual, "medical_support"), null);
same("   والنافذة لا تعرض الطرف ثانيةً",
  assignableServices({ patient: dual, decided: ["medical_support"], legacyExempt: false })
    .includes("prosthetic"), false);

// ══ د٢. حلقتا طرفٍ — إسنادُ إحداهما لا يخفي الخدمةَ عن الأخرى (٠٧٣) ════
//  **هذا سيناريو التقرير بعينه**: طرفٌ له حلقتان مؤهَّلتان، إحداهما أُسنِدت
//  والأخرى ما زالت `examined`. فالخادمُ يُبقي «prosthetic» في `decided`
//  (حيّةٌ بالحلقة الثانية)، ويجب أن يبقى الطرفُ ظاهراً للتخصيص رغم إسنادٍ
//  قائم عليه — لا أن يختفي لأن **إحدى** حلقتيه أُسنِدت.
same("د٢. **وحلقةُ طرفٍ ثانية ما زالت مؤهَّلة رغم إسناد الأولى ⟶ الطرفُ يبقى ظاهراً**",
  assignableServices({ patient: dual, decided: ["prosthetic", "medical_support"], legacyExempt: false }),
  ["prosthetic", "medical_support"]);

const dualBoth = {
  id: 6, isAmputee: true, isMedicalSupport: true,
  activeDeviceAssignments: [assign("prosthetic"), assign("medical_support")],
};
//  والحلقتان الوحيدتان لكلا الخدمتين أُسنِدتا فخرجتا معاً من `decided`.
same("   وحين تُسنَد الحلقةُ الوحيدة لكلّ خدمة لا يبقى شيء",
  assignableServices({ patient: dualBoth, decided: [], legacyExempt: false }), []);
same("   **إلّا إن بقيت حلقةٌ أخرى مؤهَّلة لإحداهما — فتلك وحدها تظهر**",
  assignableServices({ patient: dualBoth, decided: ["medical_support"], legacyExempt: false }),
  ["medical_support"]);

const dualNone = { id: 7, isAmputee: true, isMedicalSupport: true, activeDeviceAssignments: [] };
same("   وحين لا يُسنَد أيّهما يبقى الاثنان",
  assignableServices({ patient: dualNone, decided: ["prosthetic", "medical_support"], legacyExempt: false }),
  ["prosthetic", "medical_support"]);

// ══ هـ. الخدمة غير المملوكة لا تُعرَض ═══════════════════════════════════
same("هـ. وما لا يملكه المريض لا يُعرَض ولو قرّره الطبيب",
  assignableServices({ patient: plainProsthetic, decided: ["prosthetic", "medical_support"], legacyExempt: false }),
  ["prosthetic"]);
same("   والملكية تُقرأ من الأعلام", ownedDeviceServices(dual), ["prosthetic", "medical_support"]);

// ══ و. «تم تحديد» — الآن مرآةٌ صادقة لـ`decided` وحدها (ترحيل ٠٧٣) ════
console.log("\n── decided حيّةٌ بالحلقة، بلا تصفيةٍ هنا ──");
//  الحلقةُ الوحيدة للمسند المُسنَد خرجت من `decided` **في الخادم** فعلاً
//  (`status='examined'` فقط) — فما يصل هنا مصفّىً أصلاً، ولا حاجةَ لتصفيةٍ
//  ثانية تخفي شارةَ حلقةٍ أخرى ما زالت تنتظر لو تعدّدت.
same("و. المُمرَّر يبقى كما هو — لا تصفية بـ`taken` بعد اليوم",
  visibleDecided(dual, ["medical_support"]), ["medical_support"]);
same("   وغير المُسنَد يبقى", visibleDecided(dualNone, ["prosthetic", "medical_support"]),
  ["prosthetic", "medical_support"]);
same("   والعلاج الطبيعي لا يتأثّر", visibleDecided(dual, ["physiotherapy"]), ["physiotherapy"]);
//  ══ و٢. حلقةٌ أخرى ما زالت مؤهَّلة ⟶ الشارة تبقى رغم إسنادٍ قائم ═══════
//  لو أرسل الخادمُ «prosthetic» ضمن `decided` رغم أن `dual` يحمل إسناداً
//  فعلياً له — فذاك يعني حلقةً أخرى ما زالت `examined` تنتظر، والشارةُ
//  يجب أن تُخبر بها لا أن تختفي.
same("و٢. **وخدمةٌ مُسنَدة لكن decided ما زالت تذكرها ⟶ تبقى ظاهرة**",
  visibleDecided(dual, ["prosthetic", "medical_support"]), ["prosthetic", "medical_support"]);

// ══ ز. نافذة «تخصيص وإسناد خبير»: متى تسأل ═══════════════════════════
console.log("\n── النافذة ──");
const dlg = (o: any) => {
  const r = resolveDialogService(o);
  return [r.needsChoice, r.serviceType];
};
same("ز. خدمتان باقيتان ⟶ تسأل، وتبدأ بالطرف",
  dlg({ offered: ["prosthetic", "medical_support"], isAmputee: true, isMedicalSupport: true }),
  [true, "prosthetic"]);
same("   وباختيار الموظّف تتبعه",
  dlg({ offered: ["prosthetic", "medical_support"], isAmputee: true, isMedicalSupport: true, choice: "medical_support" }),
  [true, "medical_support"]);
same("   **وخدمةٌ واحدة باقية ⟶ لا سؤال، وتفتح عليها**",
  dlg({ offered: ["medical_support"], isAmputee: true, isMedicalSupport: true }),
  [false, "medical_support"]);
same("   ولو كان الباقي هو الطرف",
  dlg({ offered: ["prosthetic"], isAmputee: true, isMedicalSupport: true }), [false, "prosthetic"]);
same("   والمسند وحده كما كان",
  dlg({ offered: ["medical_support"], isAmputee: false, isMedicalSupport: true }), [false, "medical_support"]);
same("   وبلا قائمةٍ محسوبة تعود للأعلام كسابق عهدها",
  dlg({ isAmputee: true, isMedicalSupport: true }), [true, "prosthetic"]);
same("   والمسند وحده بلا قائمة",
  dlg({ isAmputee: false, isMedicalSupport: true }), [false, "medical_support"]);

// ══ ح. مدخلاتٌ ناقصة لا تُسقط الصفحة ══════════════════════════════════
same("ح. وغياب القائمة يُقرأ كلا إسناد", assignedServices({ id: 8, isAmputee: true }), []);
same("   والتخصيص يبقى محكوماً بقرار الطبيب",
  assignableServices({ patient: { id: 8, isAmputee: true }, decided: ["prosthetic"], legacyExempt: false }),
  ["prosthetic"]);

// ══ **البابُ المكرَّر يُخفى** — خدمةٌ يحكمها ملفُّ متابعةٍ حيّ ═══════════
//  الخادمُ يردّ «تخصيص» المباشر على خدمةٍ لها متابعةٌ حيّة، فكان الزرُّ
//  يظهر ثم يُضغط ثم يُردّ. والزرُّ الذي ينتهي دائماً بخطأ أسوأ من زرٍّ
//  يختفي بعد أن أدّى غرضه.
same("ك. **خدمةٌ يحكمها ملفُّ متابعةٍ حيّ لا تُعرَض للتخصيص**",
  assignableServices({
    patient: plainProsthetic, decided: ["prosthetic"], legacyExempt: false,
    governed: ["prosthetic"],
  }), []);
same("   **ولا يُنقذها إعفاءُ القِدَم** — الحارسُ لا يستثني القدامى",
  assignableServices({
    patient: legacyPlain, decided: [], legacyExempt: true, governed: ["prosthetic"],
  }), []);
same("   وما لا تحكمه متابعةٌ يبقى مفتوحاً كما كان",
  assignableServices({
    patient: plainProsthetic, decided: ["prosthetic"], legacyExempt: false,
    governed: ["medical_support"],
  }), ["prosthetic"]);
same("   **والغيابُ لا يغيّر شيئاً** — نداءٌ لم يمرّر الخريطة يسلك كما كان",
  [assignableServices({ patient: plainProsthetic, decided: ["prosthetic"], legacyExempt: false }),
    assignableServices({ patient: plainProsthetic, decided: ["prosthetic"],
      legacyExempt: false, governed: null })],
  [["prosthetic"], ["prosthetic"]]);

console.log(`\n${failures === 0 ? "✅ all registry-assignment cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);