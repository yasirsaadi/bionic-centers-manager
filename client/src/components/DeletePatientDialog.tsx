// **نافذةُ نقل المريض إلى المحذوفات** (ترحيل ٠٦٨).
//
// ══ تقول ما سيحدث قبل أن يحدث ═════════════════════════════════════════
// الملفُّ يختفي من القوائم والبحث والطوابير والمحاسبة · **ولا يُحذف منه
// شيء** · ويُستعاد بضغطةٍ خلال ثلاثين يوماً · والسببُ إلزاميّ.
//
// ══ والأرقامُ من الخادم ═══════════════════════════════════════════════
// الكلفةُ والمدفوعُ والمتبقّي وما هو معلَّق **تُقرأ من نقطةٍ خادميّة**
// (`delete-preview`) لا تُحسَب هنا. والتنفيذُ يعيد حسابها **تحت القفل**
// ولا يقبل رقماً من هذه الشاشة — فما تراه سببُ القرار لا سلطتُه.
//
// ══ ومَن لا يملك يُقال له لماذا ══════════════════════════════════════
// مديرُ الفرع والطبيب أمام ملفٍّ عليه دَينٌ أو عملٌ ماليٌّ معلَّق يقرأ
// **رسالةَ الالتزام** وأسبابَها بالدينار — لا «غير مصرح» عارية. والخادمُ
// هو الحَكَم: الشاشةُ تعرض ما يقبله، ولا تعرض زرّاً سيردّه.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateAfterPatientTrashChange } from "@/lib/queryClient";
import { Trash2, Loader2, AlertTriangle, Undo2 } from "lucide-react";
import {
  DELETE_REASON_LABEL, RESTORE_WINDOW_DAYS, type TrashFinancialSnapshot,
} from "@shared/patient_trash";

const money = (n: number) => Number(n || 0).toLocaleString("en-US");

interface Preview {
  patientId: number;
  patientCode: string | null;
  name: string | null;
  branchId: number | null;
  snapshot: TrashFinancialSnapshot;
  needsGlobalAdmin: boolean;
  reasons: string[];
  mayDelete: boolean;
  blockedMessage: string | null;
  restoreWindowDays: number;
}

export function DeletePatientDialog({
  patientId, patientName, onDeleted,
}: {
  patientId: number;
  patientName: string;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: preview, isLoading } = useQuery<Preview>({
    queryKey: ["/api/patient-trash/delete-preview", patientId],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/patient-trash/delete-preview/${patientId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "تعذّر القراءة");
      return res.json();
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/patients/${patientId}`, { reason: reason.trim() });
      return res.json();
    },
    onSuccess: () => {
      //  **تنظيفُ الذاكرة نقطةُ خنقٍ واحدة**: القوائمُ والطوابيرُ والعدّادات
      //  والمال — لا قائمةٌ تُبطَل هنا وتُنسى هناك.
      invalidateAfterPatientTrashChange(qc, patientId);
      setOpen(false);
      toast({
        title: "نُقل إلى المحذوفات",
        description: `يمكن استعادته خلال ${RESTORE_WINDOW_DAYS} يوماً — ولم يُحذف من ملفه شيء.`,
      });
      onDeleted();
    },
    onError: (err: any) => toast({
      title: "تعذّر الحذف", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  const snap = preview?.snapshot;
  const canSubmit = Boolean(preview?.mayDelete) && reason.trim().length > 0 && !del.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setReason(""); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
          data-testid="button-delete-patient"
        >
          <Trash2 className="w-4 h-4" />
          حذف
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>نقل «{patientName}» إلى المحذوفات</DialogTitle>
          <DialogDescription className="text-right leading-relaxed">
            سيختفي الملف من القوائم والبحث والطوابير والمحاسبة،
            {" "}<strong>ولن يُحذف منه شيء</strong>: المعاينات وأوامر التصنيع
            والدفعات وقيود الكلفة والفواتير تبقى كما هي.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> جارٍ قراءة حالة الملف…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 text-sm space-y-1" data-testid="delete-preview-money">
              <div className="text-xs text-muted-foreground">الحال المالي الآن</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>الكلفة: <strong>{money(snap?.totalCost ?? 0)}</strong> د.ع</span>
                <span>المدفوع: <strong>{money(snap?.totalPaid ?? 0)}</strong> د.ع</span>
                {(snap?.remaining ?? 0) === 0 ? (
                  <span className="text-emerald-700">الحساب مسدَّد</span>
                ) : (snap?.remaining ?? 0) > 0 ? (
                  <span className="text-red-600">
                    المتبقي: <strong>{money(snap?.remaining ?? 0)}</strong> د.ع
                  </span>
                ) : (
                  <span className="text-emerald-700">
                    رصيد للمريض: <strong>{money(-(snap?.remaining ?? 0))}</strong> د.ع
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              <Undo2 className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>
                يمكن استعادته من صفحة <strong>المحذوفات</strong> خلال
                {" "}<strong>{preview?.restoreWindowDays ?? RESTORE_WINDOW_DAYS} يوماً</strong>،
                فيعود بنفس الرمز ونفس كل صفوفه.
              </span>
            </div>

            {/*  ما يمنع مديرَ الفرع والطبيب — بالسبب لا بـ«غير مصرح».  */}
            {preview && !preview.mayDelete && (
              <div
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2"
                data-testid="delete-blocked"
              >
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <AlertTriangle className="w-4 h-4" />
                  {preview.blockedMessage}
                </div>
                {preview.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {preview.reasons.map((r) => (
                      <Badge key={r} variant="outline" className="border-amber-400 text-amber-900">
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/*  والمسؤولُ يمضي — لكنه يقرأ ما يحمله الملفّ قبل أن يقرّر.  */}
            {preview?.mayDelete && preview.needsGlobalAdmin && preview.reasons.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
                <div className="flex items-center gap-2 font-medium text-amber-900">
                  <AlertTriangle className="w-4 h-4" />
                  على هذا الملف التزام مالي قائم
                </div>
                <div className="flex flex-wrap gap-2">
                  {preview.reasons.map((r) => (
                    <Badge key={r} variant="outline" className="border-amber-400 text-amber-900">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{DELETE_REASON_LABEL}</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="لماذا يُحذف هذا الملف؟ — يُحفظ في سجل التدقيق ويظهر في المحذوفات"
                className="mt-1"
                disabled={!preview?.mayDelete}
                data-testid="input-delete-reason"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            variant="destructive"
            disabled={!canSubmit}
            onClick={() => del.mutate()}
            data-testid="button-delete-confirm"
          >
            {del.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "نقل إلى المحذوفات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
