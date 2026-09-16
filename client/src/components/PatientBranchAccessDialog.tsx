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
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  openOperationKey, resolveOperationDecisions, expertTargetBranchId,
  operationHasExpertChoice, type OperationDecisionInput,
} from "@shared/branch_access_operations";

export interface AccessRow {
  id: number; branchId: number; branchName: string | null;
  grantedByName: string | null; note: string | null; grantedAt: string | null;
}
interface OpenOperation {
  episodeId: number | null; serviceType: string | null;
  requestedItem: string | null; workOrderId: number | null;
  expertUserId: number | null; expertName: string | null;
  //  ما يلزم لقرار كلّ عملية — والشكلُ نفسُه الذي يقرؤه الخادم.
  episodeLive: boolean; episodeBranchId: number | null;
  workOrderBranchId: number | null; followupId: number | null;
}
export interface AccessState {
  homeBranchId: number | null; homeBranchName: string | null;
  access: AccessRow[]; openOperations: OpenOperation[];
  eligibleBranches: { id: number; name: string }[];
  canManage: boolean;
}

//  ══ **مفتاحٌ واحد ودالّةُ جلبٍ واحدة** ═══════════════════════════════════
//  رأسُ ملفّ المريض يعرض «متاح أيضاً» من هذه البيانات نفسِها، فلو نسخ
//  المفتاحَ لنفسه لبقي الرأسُ قديماً بعد منحٍ أو سحبٍ من هذه النافذة —
//  `invalidate()` أدناه تُبطل **هذا المفتاح بعينه**. فيُصدَّر ليستورده
//  الطرفان، ولا مسارَ خادمٍ جديد: النقطةُ القائمة تكفي، وحارسُها
//  (`scopeReachesPatient`) هو حارسُ فتحِ الملفّ نفسُه.
export const branchAccessQueryKey = (patientId: number) =>
  ["/api/patients", patientId, "branch-access"] as const;

export async function fetchPatientBranchAccess(patientId: number): Promise<AccessState> {
  const res = await fetch(`/api/patients/${patientId}/branch-access`, { credentials: "include" });
  if (!res.ok) throw new Error("تعذّر قراءة حالة الإتاحة");
  return res.json();
}

/**
 * حالةُ إتاحة الفروع لهذا الملفّ. `enabled` تُترَك فتُجلَب دائماً (الرأس)،
 * وتُمرَّر `open` في النافذة فلا تُجلَب قبل فتحها.
 */
export function usePatientBranchAccess(patientId: number, enabled = true) {
  return useQuery<AccessState>({
    queryKey: branchAccessQueryKey(patientId),
    queryFn: () => fetchPatientBranchAccess(patientId),
    enabled,
  });
}

const SERVICE_LABEL: Record<string, string> = {
  prosthetic: "طرف صناعي", medical_support: "مسند طبي", physiotherapy: "علاج طبيعي",
};

export function PatientBranchAccessDialog({ patientId }: { patientId: number }) {
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  //  **قرارٌ لكلّ عملية** بمفتاحها — لا قرارٌ واحد يُطبَّق على الجميع.
  //  `move` و`expert` مستقلّان: تبقى العمليةُ ويتغيّر خبيرُها، أو العكس.
  const [ops, setOps] = useState<Record<string, { move?: boolean; expert?: string }>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = usePatientBranchAccess(patientId, open);

  const openOps: OpenOperation[] = data?.openOperations ?? [];
  const grantedBranch = branchId === "" ? 0 : Number(branchId);

  /** فرعُ العملية **بعد** قرارها — وإليه تُطلب قائمةُ خبرائها. */
  const targetBranchOf = (op: OpenOperation): number | null => {
    const d = ops[openOperationKey(op)];
    if (d?.move === undefined) return null;
    return expertTargetBranchId(op, d.move, grantedBranch);
  };

  //  **خبراءُ كلّ فرعٍ يلزم فعلاً** — لا الفرعُ المضاف وحده: عمليةٌ تبقى في
  //  كربلاء تُغيَّر إلى خبيرِ **كربلاء**، وطلبُ خبراء الفرع المضاف لها كان
  //  سيعرض مَن لا يعمل فيها ثمّ يردّه الخادم.
  const expertBranches = Array.from(new Set(
    openOps.filter(operationHasExpertChoice)
      .map(targetBranchOf)
      .filter((b): b is number => typeof b === "number" && b > 0),
  ));
  const expertQueries = useQueries({
    queries: expertBranches.map((b) => ({
      queryKey: ["/api/patients", patientId, "branch-access", b, "experts"],
      queryFn: async () => {
        const res = await fetch(
          `/api/patients/${patientId}/branch-access/${b}/experts`, { credentials: "include" });
        if (!res.ok) throw new Error("تعذّر قراءة خبراء الفرع");
        return res.json() as Promise<{ id: number; displayName: string }[]>;
      },
      enabled: open,
    })),
  });
  const expertsOf = (b: number | null): { id: number; displayName: string }[] => {
    if (b === null) return [];
    const i = expertBranches.indexOf(b);
    return i < 0 ? [] : (expertQueries[i]?.data ?? []);
  };

  /** قرارُ الشاشة بشكله القانونيّ — يبنيه الطرفان من الدالّة نفسِها. */
  const buildDecisions = (): OperationDecisionInput[] => openOps.map((op) => {
    const key = openOperationKey(op);
    const d = ops[key] ?? {};
    const out: OperationDecisionInput = { key, move: d.move as boolean };
    if (operationHasExpertChoice(op)) {
      out.expert = d.expert === "keep" ? "keep"
        : d.expert ? Number(d.expert) : undefined;
    }
    return out;
  });

  //  إغلاقُ النافذة يمسح الحالة — فلا يبقى نصفُ قرارٍ معلّقاً بعد إعادة فتح.
  useEffect(() => {
    if (!open) { setBranchId(""); setOps({}); }
  }, [open]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: branchAccessQueryKey(patientId) });
    queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    queryClient.invalidateQueries({ queryKey: ["/api/patients/registry"] });
  };

  const grant = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { branchId: Number(branchId) };
      //  **قرارٌ لكلّ عملية** — ولا يُرسَل معه القرارُ العامّ القديم أبداً،
      //  فالخادمُ يردّ الجمعَ بينهما التباساً.
      if (openOps.length > 0) body.operationDecisions = buildDecisions();
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

  //  **بوّابةُ الحفظ هي حاكمُ الخادم نفسُه** — لا شرطٌ ثانٍ ينحرف عنه.
  const decisionsOk = openOps.length === 0 || resolveOperationDecisions({
    open: openOps, decisions: buildDecisions(), grantedBranchId: grantedBranch,
  }).ok;
  const canSubmit = branchId !== "" && decisionsOk && !grant.isPending;

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
                  {/*  تبديلُ الفرع المضاف يُسقط خبيرَ العمليات **المنتقلة** وحدها:
                      اختيارُها كان من خبراء الفرع القديم. والباقيةُ في فرعها
                      خبيرُها لا علاقةَ له بهذا التبديل فيبقى كما اختير. */}
                  <Select value={branchId} onValueChange={(v) => {
                    setBranchId(v);
                    setOps((prev) => {
                      const next: typeof prev = {};
                      for (const [k, d] of Object.entries(prev)) {
                        next[k] = d.move ? { ...d, expert: undefined } : d;
                      }
                      return next;
                    });
                  }}>
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

                {openOps.length > 0 && (
                  <div className="rounded-md border p-3 space-y-3" data-testid="open-operation-question">
                    <div className="text-sm">
                      <b>لهذا المريض {openOps.length > 1 ? `${openOps.length} عمليات مفتوحة` : "عملية مفتوحة"}:</b>
                      <span className="block text-muted-foreground mt-0.5">
                        قرّر لكل عملية على حدة — تبقى أم تنتقل، ويبقى خبيرها أم يتغيّر.
                      </span>
                    </div>

                    {openOps.map((o) => {
                      const key = openOperationKey(o);
                      const d = ops[key] ?? {};
                      const target = targetBranchOf(o);
                      const hasExpert = operationHasExpertChoice(o);
                      const set = (patch: { move?: boolean; expert?: string }) =>
                        setOps((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
                      return (
                        <div key={key} className="rounded-md border p-2.5 space-y-2"
                          data-testid={`operation-decision-${key}`}>
                          <div className="text-sm font-medium">
                            {SERVICE_LABEL[o.serviceType ?? ""] ?? o.serviceType}
                            {o.requestedItem ? ` — ${o.requestedItem}` : ""}
                            {o.expertName && (
                              <span className="font-normal text-muted-foreground">
                                {" "}— الخبير الحالي: {o.expertName}
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">المسؤولية</label>
                            <Select
                              value={d.move === undefined ? "" : d.move ? "yes" : "no"}
                              onValueChange={(v) => set({ move: v === "yes", expert: undefined })}>
                              <SelectTrigger data-testid={`select-move-${key}`}>
                                <SelectValue placeholder="اختر" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">تنتقل إلى الفرع الجديد</SelectItem>
                                <SelectItem value="no">تبقى في فرعها</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/*  **والخبيرُ قرارٌ مستقلّ** — يُعرَض متى تقرّر مصيرُ
                              العملية، منتقلةً كانت أم باقية. */}
                          {hasExpert && d.move !== undefined && (
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">الخبير</label>
                              <Select value={d.expert ?? ""} onValueChange={(v) => set({ expert: v })}>
                                <SelectTrigger data-testid={`select-expert-${key}`}>
                                  <SelectValue placeholder="اختر" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="keep">
                                    إبقاء الخبير الحالي
                                    {o.expertName ? ` (${o.expertName})` : ""}
                                  </SelectItem>
                                  {expertsOf(target).map((e) => (
                                    <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="block text-xs text-muted-foreground mt-1">
                                {d.move
                                  ? "خبراء الفرع الجديد — لأن مسؤولية العملية تنتقل إليه."
                                  : "خبراء فرع العملية نفسه — لأنها تبقى فيه."}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
