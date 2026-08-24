// **مُعادة للتصحيح** — طابورُ الاستقبال الدائم.
//
// ══ طابورٌ لا رسالة ════════════════════════════════════════════════════
// رسالةٌ تمرّ فتضيع، وموظّفةٌ تنتهي نوبتُها فيبقى المريضُ بلا فاتورة. فما
// أعاده الطبيبُ يبقى **مقروءاً في أيّ وقت** بعددٍ ظاهر على القائمة، حتى
// يُصحَّح ويُعاد إرسالُه.
//
// ══ ورؤيةُ الفرع لا الموظّف ═══════════════════════════════════════════
// مَن أنشأ العملية قد يكون غائباً، وزميلُه يصحّحها. فالطابورُ **للفرع**،
// و«أنشأتها أنت» شارةٌ تُبرِز ما يخصّ القارئ ولا تقفل الباب على غيره.
//
// ══ والسببُ أوّلُ ما يُقرأ ════════════════════════════════════════════
// الصفُّ يبدأ بسبب الإعادة كما كتبه الطبيب — بلا ذلك يعود الموظّفُ إلى
// التخمين الذي جاء هذا المسار لينهيه.

import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import { Undo2, Loader2, Send, ShieldAlert, ExternalLink, AlertTriangle } from "lucide-react";
import { RETURNED_QUEUE_TITLE, RETURN_REASON_LABEL, canCorrectReturned } from "@shared/pending_charge";
import { type ChargeCard, operationLine, fmtStamp } from "./NoExamReview";

const money = (n: number) => Number(n || 0).toLocaleString("en-US");

const SERVICE_LABELS: Record<string, string> = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
};

export default function ReturnedCharges() {
  const session = useBranchSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ChargeCard | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  const mayCorrect = canCorrectReturned(session as any);

  const { data, isLoading } = useQuery<{ rows: ChargeCard[] }>({
    queryKey: ["/api/no-exam/returned"],
    enabled: mayCorrect,
    queryFn: async () => {
      const res = await fetch("/api/no-exam/returned", { credentials: "include" });
      if (!res.ok) return { rows: [] };
      return res.json();
    },
  });
  const rows = data?.rows ?? [];

  const resubmit = useMutation({
    mutationFn: async (v: { id: number; amount: number; note: string | null }) => {
      const res = await apiRequest("POST", `/api/no-exam/charges/${v.id}/resubmit`,
        { amount: v.amount, note: v.note });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/no-exam/returned"] });
      qc.invalidateQueries({ queryKey: ["/api/no-exam/returned/count"] });
      qc.invalidateQueries({ queryKey: ["/api/no-exam/review"] });
      setEditing(null);
      toast({
        title: "أُعيد الإرسال للمراجعة",
        description: "العملية نفسها عادت إلى الطبيب بالمبلغ المصحَّح — ولا صفّ ثانٍ.",
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر الإرسال", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  if (!mayCorrect) {
    return (
      <div className="p-4 md:p-6" dir="rtl">
        <Card><CardContent className="py-10 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground" data-testid="text-returned-forbidden">
            تصحيح العمليات المُعادة للاستقبال ومدير الفرع والمسؤول العام.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Undo2 className="w-6 h-6 text-amber-700" />
        <h1 className="text-xl font-bold text-amber-800">{RETURNED_QUEUE_TITLE}</h1>
        {rows.length > 0 && (
          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100"
            data-testid="returned-count">{rows.length}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        عملياتٌ أعادها الطبيب لتصحيح مبلغها. <b>العملية قائمة ولم تُحذف</b>،
        ولم يُقيَّد منها دينار. صحّح المبلغ ثم أعِد إرسالها للمراجعة.
      </p>

      {isLoading ? (
        <Card><CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"
          data-testid="text-returned-empty">
          لا توجد عملية مُعادة للتصحيح.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="border-amber-300" data-testid={`returned-row-${r.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <span>{r.patientName ?? "—"}</span>
                  {r.patientCode && (
                    <span className="text-xs font-mono text-muted-foreground">{r.patientCode}</span>
                  )}
                  <Badge variant="outline">{SERVICE_LABELS[r.serviceType] ?? r.serviceType}</Badge>
                  {r.branchName && <Badge variant="secondary">{r.branchName}</Badge>}
                  {/*  **ومُنشئُه مُبرَزٌ في الصفّ** فيعرف صاحبُه أنه له —
                      ويعرف غيرُه ممّن يصحّح أنه ليس عمله وحده. */}
                  {session?.userId != null && r.createdByName
                    && session.displayName === r.createdByName && (
                    <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100"
                      data-testid={`returned-mine-${r.id}`}>أنشأتها أنت</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {/*  **السببُ أوّلاً** — هو الغرض من الصفّ كلِّه. */}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-300
                  rounded-md px-3 py-2" data-testid={`returned-reason-${r.id}`}>
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-amber-900 font-medium">{RETURN_REASON_LABEL}: </span>
                    <span dir="auto" style={{ unicodeBidi: "plaintext" }}>{r.returnReason}</span>
                    <div className="text-xs text-amber-800/80 mt-0.5">
                      {r.returnedByName ?? "—"} · {fmtStamp(r.returnedAt)}
                    </div>
                  </div>
                </div>

                <p className="font-medium" dir="auto" style={{ unicodeBidi: "plaintext" }}>
                  {operationLine(r)}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span><span className="text-muted-foreground">المبلغ الحالي: </span>
                    <b className="font-mono">{money(r.amount)}</b> د.ع</span>
                  <span><span className="text-muted-foreground">سجّلها: </span>
                    {r.createdByName ?? "—"}</span>
                  {r.workOrderId && (
                    <span><span className="text-muted-foreground">أمر التصنيع: </span>
                      <span className="font-mono">#{r.workOrderId}</span></span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button size="sm" className="gap-1" data-testid={`returned-correct-${r.id}`}
                    onClick={() => {
                      setEditing(r); setAmount(r.amount); setNote(r.note ?? "");
                    }}>
                    <Send className="w-4 h-4" /> تصحيح وإعادة الإرسال
                  </Button>
                  <Link href={`/patients/${r.patientId}`}>
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                      data-testid={`returned-open-${r.id}`}>
                      <ExternalLink className="w-4 h-4" /> فتح ملف المريض
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تصحيح المبلغ وإعادة الإرسال</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-sm bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                <b>{RETURN_REASON_LABEL}: </b>
                <span dir="auto" style={{ unicodeBidi: "plaintext" }}>{editing.returnReason}</span>
              </p>
              <div className="space-y-1">
                <label className="text-sm font-medium">المبلغ المصحَّح</label>
                <MoneyInput value={amount} onValueChange={setAmount}
                  data-testid="returned-amount" />
                {!(amount > 0) && (
                  <p className="text-xs text-destructive" data-testid="returned-amount-error">
                    المبلغ يجب أن يكون أكبر من صفر.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ملاحظة (اختياري)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)}
                  data-testid="returned-note" />
              </div>
              <p className="text-xs text-muted-foreground">
                يعود الصفّ نفسه إلى مراجعة الطبيب — ولا يُنشأ صفّ ثانٍ ولا
                يُحسَب البيع مرّتين.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button disabled={resubmit.isPending || !(amount > 0)}
              data-testid="returned-submit"
              onClick={() => editing && resubmit.mutate({
                id: editing.id, amount, note: note.trim() || null,
              })}>
              {resubmit.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : "إعادة الإرسال للمراجعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
