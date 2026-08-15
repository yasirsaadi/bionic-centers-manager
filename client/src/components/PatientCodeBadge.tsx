// شارةُ رمز المريض مع نسخةٍ بضغطة — تُستعمل في رأس صفحة المريض.
//
// النسخ هو نصف الفائدة: الموظّف يُملي الرمز هاتفياً أو يلصقه في رسالة، وقراءةُ
// خمس خانات من الشاشة تُخطئ. والمنسوخ **الرمز وحده** بلا اسمٍ ولا زينة، فما
// يُلصَق في مربّع البحث يُطابِق فوراً.

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function PatientCodeBadge({ code }: { code?: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      //  حافظات غير مسموح لها (http أو متصفّح قديم): يبقى الرمز مقروءاً
      //  على الشاشة، والفشل لا يُظهر خطأً على شيءٍ ثانوي كهذا.
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="نسخ رمز المريض"
      aria-label={`نسخ رمز المريض ${code}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs md:text-sm text-slate-700 hover:bg-slate-100 transition print:border-0 print:bg-transparent"
      data-testid="button-copy-patient-code"
    >
      <span data-testid="text-patient-code">{code}</span>
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-600 print:hidden" />
        : <Copy className="w-3.5 h-3.5 text-slate-400 print:hidden" />}
    </button>
  );
}
