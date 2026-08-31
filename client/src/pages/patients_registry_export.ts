// حسابُ المال لصفّ تصدير السجل — دالّةٌ نقيّة (لا React، لا XLSX، لا DOM)
// **لأنه لو بقيت داخل exportToExcel/exportToPDF لَما أمكن اختبارُها إلّا
// بتركيب الصفحة كاملة** — نفسُ نمط service_discount_ui.ts وغيره.
//
// ══ لماذا استُخرجت الآن (متابعةُ تحكّم التسجيل، إضافةُ عمود «المبلغ
// المدفوع») ═══════════════════════════════════════════════════════════
// كان Excel يحسب `remaining` بـ`remaining > 0 ? remaining : 0` وPDF بـ
// `Math.max(0, ...)` — صيغتان لنفس القاعدة، منسوختان بلا داعٍ. ومصدرُ
// الحقيقة الوحيد للمقبوض هو `patient.totalPaid` كما يُرسله
// `GET /api/patients/registry` (مجموعٌ حقيقيّ من `payments`، لا اشتقاقٌ
// هنا) — هذه الدالّة لا تحسب المقبوض، تقرؤه فقط.

export interface RegistryExportPatientMoney {
  totalCost: number | null;
  totalPaid: number | null;
}

export interface RegistryExportMoney {
  totalCost: number;
  totalPaid: number;
  /** لا يقلّ عن صفر — لا يُعرَض متبقٍّ سالب. */
  remaining: number;
}

export function registryExportMoney(patient: RegistryExportPatientMoney): RegistryExportMoney {
  const totalCost = patient.totalCost || 0;
  const totalPaid = patient.totalPaid || 0;
  const remaining = Math.max(0, totalCost - totalPaid);
  return { totalCost, totalPaid, remaining };
}
