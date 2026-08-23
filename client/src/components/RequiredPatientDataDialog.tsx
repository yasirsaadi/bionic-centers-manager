import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileWarning } from "lucide-react";
import { FIELD_LABELS } from "@shared/patient_required";

// **ملفٌّ ناقص: تُقال حاجتُه بالعربية، ولا يُسكَب رمزُ الخادم على الموظّف.**
//
// ══ العطبُ الذي يغلقه (واقعةُ الإنتاج) ══════════════════════════════════
// موظّفةُ الاستقبال فتحت «طرف صناعي جديد أو جزء جديد» لمريضٍ قديم، فرُدّت
// بهذا:
//
//     400  missing: ["amputationLevel"]
//
// والردُّ **صحيحٌ تماماً**: الطرفُ يُصنَع على تعريف البتر، وملفٌّ بلا مستوى
// بترٍ يصل الخبيرَ ناقصاً. لكنّ ما وصل الموظّفةَ ليس تعليمةً بل رمزُ حالةٍ
// واسمُ حقلٍ إنجليزيّ. فلا هي تعرف ما تفعل، ولا هي تدري أنها على بُعد
// حقلٍ واحد من إتمام عملها.
//
// **والحراسةُ لا تُضعَف بحرف** — تبقى في الخادم كما هي. الذي يتغيّر أن
// الشاشة تترجم الردَّ إلى عملٍ ممكن: تسمّي الناقصَ بالعربية، وتفتح تعديلَ
// المريض بضغطة، **وتحفظ ما اختاره الموظّف** ليعود إليه بلا أن يبدأ من أوّله.

export interface RequiredPatientDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** مفاتيحُ الحقول الناقصة كما يرسلها الخادم منظَّمةً. */
  missing: string[];
  /** يفتح نموذجَ تعديل المريض — والاختيارُ محفوظٌ عند العودة. */
  onComplete: () => void;
  /** سطرٌ يقول لماذا الآن — «قبل بدء طرف أو جزء جديد». */
  context?: string;
}

export function RequiredPatientDataDialog({
  open, onOpenChange, missing, onComplete, context,
}: RequiredPatientDataDialogProps) {
  //  **العناوينُ من المصدر المشترك** — نفسُ الجدول الذي يفرضه الخادم.
  //  ونسخُها هنا كان سيُنتج اسمين لحقلٍ واحد ينحرفان يوماً. ومفتاحٌ لا
  //  عنوانَ له يُقال «بيان مطلوب» ولا يُطبَع اسمُه الإنجليزيّ.
  const fieldLabel = (key: string) => FIELD_LABELS[key] ?? "بيان مطلوب";
  const shown = Array.from(new Set(missing.map(fieldLabel)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <FileWarning className="h-5 w-5" />
            ملف المريض يحتاج استكمال
          </DialogTitle>
          <DialogDescription className="text-right">
            {context ?? "قبل بدء طرف أو جزء جديد، أكمل البيانات التالية:"}
          </DialogDescription>
        </DialogHeader>

        <ul
          className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          data-testid="list-missing-fields"
        >
          {shown.map((label) => (
            <li key={label} className="flex items-center gap-2">
              <span aria-hidden>•</span>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        {/*  ولماذا تُطلَب — فلا تبدو الحراسةُ تعنّتاً إدارياً. */}
        <p className="text-xs text-muted-foreground">
          هذه البيانات يُصنَع عليها الجهاز: المقاسات وتعريف البتر تصل الخبير مع
          أمر التصنيع. وإكمالها الآن يمنع أن يُقاس الجهاز على فراغ.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={onComplete} data-testid="button-complete-patient-data">
            إكمال البيانات الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
