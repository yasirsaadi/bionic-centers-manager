// **إتاحةُ ملفّ المريض لفروعٍ إضافية** — بديلُ نافذة «نقل المريض» (ترحيل ٠٨٠).
//
// النافذةُ تقول **ما لا يتغيّر** قبل ما يتغيّر: فرعُ التسجيل وحساباتُه
// والدفعاتُ والزياراتُ والكلفُ والعملياتُ التاريخية — كلُّها تبقى كما هي.
// والذي يتغيّر: مَن يرى الملفَّ، وإلى أيّ فرعٍ تُنسَب الحركةُ الجديدة.
//
// **وسؤالُ العملية المفتوحة يُعرَض حين توجد فعلاً** — يقرؤه الخادمُ من
// القاعدة (`openOperations`) لا من تخمين الشاشة، ويردّ ٤٠٠ إن مضى الطلبُ
// بلا جواب.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Share2, Trash2, Building2 } from "lucide-react";

interface AccessRow {
  id: number; branchId: number; branchName: string | null;
  grantedByName: string | null; note: string | null; grantedAt: string | null;
}
interface OpenOperation {
  episodeId: number | null; serviceType: string | null;
  requestedItem: string | null; workOrderId: number | null;
  expertUserId: number | null; expertName: string | null;
}
interface AccessState {
  homeBranchId: number | null; homeBranchName: string | null;
  access: AccessRow[]; openOperations: OpenOperation[];
  eligibleBranches: { id: number; name: string }[];
  canManage: boolean;
}

const SERVICE_LABEL: Record<string, string> = {
  prosthetic: "طرف صناعي", medical_support: "مسند طبي", physiotherapy: "علاج طبيعي",
};

export function PatientBranchAccessDialog({ patientId }: { patientId: number }) {
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [moveOps, setMoveOps] = useState<"yes" | "no" | "">("");
  const [expertChoice, setExpertChoice] = useState("");   // "keep" | "<id>"
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AccessState>({
    queryKey: ["/api/patients", patientId, "branch-access"],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/branch-access`, { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر قراءة حالة الإتاحة");
      return res.json();
    },
    enabled: open,
  });

  //  خبراءُ الفرع المضاف — لا يُطلبون قبل اختيار الفرع.
  const { data: experts } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/patients", patientId, "branch-access", branchId, "experts"],
    queryFn: async () => {
      const res = await fetch(
        `/api/patients/${patientId}/branch-access/${branchId}/experts`, { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر قراءة خبراء الفرع");
      return res.json();
    },
    enabled: open && branchId !== "" && moveOps === "yes",
  });

  //  إغلاقُ النافذة يمسح الحالة — فلا يبقى نصفُ قرارٍ معلّقاً بعد إعادة فتح.
  useEffect(() => {
    if (!open) { setBranchId(""); setMoveOps(""); setExpertChoice(""); }
  }, [open]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/patients", patientId, "branch-access"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients/registry"] });
  };

  const grant = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { branchId: Number(branchId) };
      if (hasOpenOps) {
        body.moveOpenOperations = moveOps === "yes";
        if (moveOps === "yes") {
          if (expertChoice === "keep") body.keepExpert = true;
          else body.newExpertUserId = Number(expertChoice);
        }
      }
      const res = await fetch(`/api/patients/${patientId}/branch-access`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "تعذّر إتاحة الملف");
      return json;
    },
    onSuccess: (out: any) => {
      invalidate();
      setOpen(false);
      toast({
        title: "تمت الإتاحة",
        description: "الفرع المضاف يرى الملف كاملاً الآن — وفرع التسجيل وحساباته كما هي."
          + (out?.movedOperations?.length
            ? " ونُقلت مسؤولية العملية المفتوحة إليه."
            : ""),
      });
    },
    onError: (e: Error) =>
      toast({ title: "لم تتم الإتاحة", description: e.message, variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (b: number) => {
      const res = await fetch(`/api/patients/${patientId}/branch-access/${b}`, {
        method: "DELETE", credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "تعذّر سحب الإتاحة");
      return json;
    },
    onSuccess: () => {
      invalidate();
      toast({
        title: "سُحبت الإتاحة",
        description: "لم يتغيّر أي صف تاريخي — الرؤية وحدها.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "تعذّر السحب", description: e.message, variant: "destructive" }),
  });

  const hasOpenOps = (data?.openOperations?.length ?? 0) > 0;
  const opsWithOrder = (data?.openOperations ?? []).filter((o) => o.workOrderId !== null);
  const needsExpert = hasOpenOps && moveOps === "yes" && opsWithOrder.length > 0;
  const canSubmit = branchId !== ""
    && (!hasOpenOps || moveOps !== "")
    && (!needsExpert || expertChoice !== "")
    && !grant.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-branch-access">
          <Share2 className="w-4 h-4" />
          إتاحة لفرع إضافي
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إتاحة ملف المريض لفرع إضافي</DialogTitle>
          <DialogDescription>
            الفرع المضاف يرى الملف كاملاً — الأطراف والمساند والعلاج الطبيعي.
            <span className="block mt-1 font-medium text-foreground">
              ولا يتغيّر فرع التسجيل، ولا فرع أي دفعة أو زيارة أو كلفة أو عملية سابقة.
              كل حركة جديدة تُنسب للفرع الذي تحدث فيه.
            </span>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 text-sm text-muted-foreground">جارٍ التحميل…</div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-md border p-3 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>فرع التسجيل: <b>{data?.homeBranchName ?? "—"}</b> — لا يتغيّر</span>
            </div>

            {(data?.access?.length ?? 0) > 0 && (
              <div className="space-y-2" data-testid="branch-access-list">
                <div className="text-sm font-medium">الفروع المتاحة حالياً</div>
                {data!.access.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <div>
                      <b>{a.branchName ?? `#${a.branchId}`}</b>
                      {a.grantedByName && (
                        <span className="text-muted-foreground"> — أتاحه {a.grantedByName}</span>
                      )}
                    </div>
                    {data!.canManage && (
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive"
                        data-testid={`button-revoke-${a.branchId}`}
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutate(a.branchId)}>
                        <Trash2 className="w-3.5 h-3.5" /> سحب
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data?.canManage ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">الفرع المضاف</label>
                  <Select value={branchId} onValueChange={(v) => { setBranchId(v); setExpertChoice(""); }}>
                    <SelectTrigger data-testid="select-access-branch">
                      <SelectValue placeholder="اختر الفرع" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.eligibleBranches ?? []).map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasOpenOps && (
                  <div className="rounded-md border p-3 space-y-3" data-testid="open-operation-question">
                    <div className="text-sm">
                      <b>لهذا المريض عملية مفتوحة:</b>
                      <ul className="mt-1 list-disc pr-5 text-muted-foreground">
                        {data!.openOperations.map((o, i) => (
                          <li key={i}>
                            {SERVICE_LABEL[o.serviceType ?? ""] ?? o.serviceType}
                            {o.requestedItem ? ` — ${o.requestedItem}` : ""}
                            {o.expertName ? ` — الخبير: ${o.expertName}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        هل تُنقل مسؤوليتها إلى الفرع الجديد؟
                      </label>
                      <Select value={moveOps} onValueChange={(v) => {
                        setMoveOps(v as "yes" | "no"); setExpertChoice("");
                      }}>
                        <SelectTrigger data-testid="select-move-operations">
                          <SelectValue placeholder="اختر" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">نعم — تنتقل المسؤولية للفرع الجديد</SelectItem>
                          <SelectItem value="no">لا — تبقى العملية وخبيرها كما هما</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {needsExpert && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">الخبير</label>
                        <Select value={expertChoice} onValueChange={setExpertChoice}>
                          <SelectTrigger data-testid="select-expert-choice">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keep">
                              إبقاء الخبير الحالي
                              {opsWithOrder[0]?.expertName ? ` (${opsWithOrder[0].expertName})` : ""}
                            </SelectItem>
                            {(experts ?? []).map((e) => (
                              <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                إتاحة الملف لفرع إضافي صلاحية المسؤول العام وحده.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          {data?.canManage && (
            <Button onClick={() => grant.mutate()} disabled={!canSubmit}
              data-testid="button-confirm-branch-access">
              {grant.isPending ? "جارٍ الحفظ…" : "إتاحة الملف"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
