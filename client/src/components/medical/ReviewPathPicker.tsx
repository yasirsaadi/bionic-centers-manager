import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Zap, Stethoscope } from "lucide-react";
import {
  REVIEW_KINDS, REVIEW_KIND_LABELS, REVIEW_PATH_HINTS, REVIEW_PATH_LABELS,
  requiresFullPath, type ReviewKind, type ReviewPath,
} from "@shared/medical_review";

interface Props {
  path: ReviewPath;
  onPathChange: (p: ReviewPath) => void;
  kind: ReviewKind;
  onKindChange: (k: ReviewKind) => void;
  note: string;
  onNoteChange: (n: string) => void;
  /** أسبابُ الزيارة المعروضة. الافتراض: كلُّها عدا الجهاز الجديد. */
  kinds?: readonly ReviewKind[];
}

/**
 * تصنيفُ الاستقبال داخل نموذج الخدمة نفسه — **لا في شاشةٍ ثانية**.
 *
 * ══ لماذا هنا ══════════════════════════════════════════════════════════
 * لأن التصنيف الذي يعيش في زرٍّ منفصل لا يقع. الموظّف الذي أنهى فتحَ صيانةٍ
 * وأغلق نافذتَه لن يفتح صفحةً أخرى ليضغط زرّاً ثالثاً — والحالة التي لا
 * تُصنَّف لا تصل الطبيب، ومَن لا يصل الطبيبَ لا يراه أحد. فالسؤال يُطرح
 * حيث يقف الموظّف بالفعل، ومعه سياقُه.
 *
 * وسؤالان لا أكثر: أيّ بابٍ (سريع أم كامل)، ولماذا جاء المريض. والملاحظة
 * اختيارية لأن أكثر الحالات لا تحتاج شرحاً، وما يحتاجه يحتاجه كثيراً.
 */
export function ReviewPathPicker({
  path, onPathChange, kind, onKindChange, note, onNoteChange, kinds,
}: Props) {
  const options = kinds ?? REVIEW_KINDS.filter((k) => !requiresFullPath(k));

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3 space-y-3">
      <div className="text-xs font-semibold flex items-center gap-1.5">
        <Stethoscope className="w-3.5 h-3.5" /> مراجعة الطبيب
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["quick", "full"] as ReviewPath[]).map((p) => (
          <button
            key={p} type="button" onClick={() => onPathChange(p)}
            data-testid={`visit-review-path-${p}`}
            className={`text-right rounded-lg border p-2.5 transition ${
              path === p ? "border-primary bg-primary/10" : "border-muted bg-background hover:border-primary/40"
            }`}
          >
            <div className="flex items-center gap-1.5 font-medium text-xs">
              {p === "quick" ? <Zap className="w-3.5 h-3.5" /> : <Stethoscope className="w-3.5 h-3.5" />}
              {REVIEW_PATH_LABELS[p]}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              {REVIEW_PATH_HINTS[p]}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 items-start">
        <div>
          <Label className="text-[11px]">سبب الزيارة</Label>
          <Select value={kind} onValueChange={(v) => onKindChange(v as ReviewKind)}>
            <SelectTrigger className="h-9" data-testid="select-visit-review-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((k) => (
                <SelectItem key={k} value={k}>{REVIEW_KIND_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px]">ملاحظة للطبيب (اختيارية)</Label>
          <Textarea
            rows={2} value={note} onChange={(e) => onNoteChange(e.target.value)}
            placeholder="شكوى المريض، ما لاحظه الموظّف…"
            data-testid="input-visit-review-note"
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        إن لم تكن متأكّداً، اسأل خبير الأطراف قبل الاختيار — والطبيب يبقى صاحب
        القرار: يوافق، أو يطلب معاينة كاملة، أو يعيد الطلب إليك.
      </p>
    </div>
  );
}
