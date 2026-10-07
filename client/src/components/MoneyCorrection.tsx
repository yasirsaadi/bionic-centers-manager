// **طلبُ تصحيح المال** (قرارُ المالك ٢٠٢٦-١٠-٠٧، §4.ce): تعديلُ المصروف وسطرِ الدفتر وحذفُهما للمسؤول وحده، أو بطلبٍ يعتمده.
//   • `RequestCorrectionDialog` — الموظّفُ يكتب القيمةَ الصحيحة (أو يطلب الحذف) وسببَها.
//   • `CorrectionRequestsPanel` — المسؤولُ يرى المعلَّق فيعتمده أو يرفضه؛ وغيرُه يرى طلباتِه وحالَها.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EXPENSE_CATEGORIES } from "@/lib/expense_categories";
import { cashCategoryLabel } from "@/lib/cash_book_text";

export interface CorrectionTarget {
  type: "expense" | "cash_book_entry";
  id: number;
  amount: number;
  /** وصفُ السطر كما يراه الموظّف — للعنوان وحده. */
  label: string;
  /** الوصفُ الحاليّ كما هو في الصفّ — يُرسَل الجديدُ وحده إن تغيّر. */
  note: string | null;
  category?: string | null;
}

const money = (n: number) => n.toLocaleString("en-US");
/** رسالةُ الخادم بالعربية من «403: {"error":"…"}». */
const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

function invalidateMoney(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["/api/money-corrections"] });
  qc.invalidateQueries({ queryKey: ["/api/cash-book"] });
  qc.invalidateQueries({ queryKey: ["/api/expenses"] });
}

export function RequestCorrectionDialog({ target, onClose }: { target: CorrectionTarget | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [action, setAction] = useState<"update" | "delete">("update");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!target) return;
    setAction("update"); setAmount(String(target.amount)); setNote(target.note ?? ""); setCategory(target.category ?? ""); setReason("");
  }, [target]);
  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/money-corrections", {
      targetType: target!.type, targetId: target!.id, action, reason,
      ...(action === "update" ? {
        amount: amount.replace(/[,\s]/g, ""),
        ...(note !== (target!.note ?? "") ? { note } : {}),
        ...(target!.type === "expense" && category && category !== target!.category ? { category } : {}),
      } : {}),
    })).json(),
    onSuccess: () => {
      invalidateMoney(qc);
      toast({ title: "أُرسل طلبُ التصحيح", description: "يظهر للمسؤول ليعتمده — والسطرُ موسومٌ حتى يقرّر." });
      onClose();
    },
    onError: (e: any) => toast({ title: "تعذّر الإرسال", description: errText(e), variant: "destructive" }),
  });
  const manual = EXPENSE_CATEGORIES.filter((c) => !(c as any).sheetOnly && !(c as any).karbalaOnly);
  return (
    <Dialog open={target !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>طلب تصحيح — يعتمده المسؤول</DialogTitle></DialogHeader>
        {target && (
          <div className="space-y-3 text-sm" data-testid="correction-dialog">
            <p className="rounded-md bg-muted px-3 py-2">{target.label} — <b className="tabular-nums">{money(target.amount)}</b></p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={action === "update" ? "default" : "outline"} onClick={() => setAction("update")}>تعديل</Button>
              <Button type="button" size="sm" variant={action === "delete" ? "destructive" : "outline"} onClick={() => setAction("delete")}
                data-testid="correction-delete">حذف السطر</Button>
            </div>
            {action === "update" && (
              <>
                <label className="grid gap-1">المبلغ الصحيح
                  <Input inputMode="numeric" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="correction-amount" />
                </label>
                {target.type === "expense" && (
                  <label className="grid gap-1">الباب
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="الباب" /></SelectTrigger>
                      <SelectContent>
                        {manual.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        {category && !manual.some((c) => c.value === category) && <SelectItem value={category}>{cashCategoryLabel(category)}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </label>
                )}
                <label className="grid gap-1">الوصف<Input value={note} onChange={(e) => setNote(e.target.value)} /></label>
              </>
            )}
            <label className="grid gap-1">سبب التصحيح (يقرؤه المسؤول)
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً: كتبتُ ٥٠٠٠٠٠ والصحيح ٥٠٠٠٠" data-testid="correction-reason" />
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={send.isPending || reason.trim().length < 3 || (action === "update" && !amount)}
            onClick={() => send.mutate()} data-testid="correction-send">أرسل الطلب</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RequestRow {
  id: number; targetType: "expense" | "cash_book_entry"; targetId: number; action: "update" | "delete"; status: string;
  beforeSnapshot: { amount: number; note: string | null; category: string | null; date: string; kind?: string };
  requestedPatch: { amount?: number; note?: string | null; category?: string } | null;
  reason: string; requestedByName: string | null; requestedAt: string; branchName: string;
  decidedByName: string | null; decisionNote: string | null;
}

const ENTRY_KIND: Record<string, string> = { income_other: "وارد آخر", dr_transfer: "تحويل إلى قاصة الدكتور" };
const targetLabel = (r: RequestRow) => r.targetType === "expense"
  ? `مصروف — ${cashCategoryLabel(r.beforeSnapshot.category)}`
  : ENTRY_KIND[r.beforeSnapshot.kind ?? ""] ?? "سطر في الدفتر";
const dmy = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;

function changeText(r: RequestRow): string {
  if (r.action === "delete") return "حذف السطر";
  const p = r.requestedPatch ?? {};
  const parts: string[] = [];
  if (p.amount !== undefined) parts.push(`المبلغ ${money(r.beforeSnapshot.amount)} ← ${money(p.amount)}`);
  if (p.category !== undefined) parts.push(`الباب ${cashCategoryLabel(r.beforeSnapshot.category)} ← ${cashCategoryLabel(p.category)}`);
  if (p.note !== undefined) parts.push(`الوصف «${r.beforeSnapshot.note ?? ""}» ← «${p.note ?? ""}»`);
  return parts.join(" · ");
}

/** بطاقةُ الطلبات — للمسؤول المعلَّقُ كلُّه بقراره، ولغيره طلباتُه الأخيرة بحالها. لا تظهر إن لم يكن شيء. */
export function CorrectionRequestsPanel({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery<RequestRow[]>({
    queryKey: ["/api/money-corrections", isAdmin ? "pending" : "mine"],
    queryFn: async () => (await apiRequest("GET", `/api/money-corrections${isAdmin ? "?status=pending" : ""}`)).json(),
  });
  const decide = useMutation({
    mutationFn: async (p: { id: number; decision: "approve" | "reject" }) =>
      (await apiRequest("POST", `/api/money-corrections/${p.id}/${p.decision}`, {})).json(),
    onSuccess: (_d, p) => { invalidateMoney(qc); toast({ title: p.decision === "approve" ? "اعتُمد وطُبّق" : "رُفض الطلب" }); },
    onError: (e: any) => toast({ title: "تعذّر", description: errText(e), variant: "destructive" }),
  });
  const rows = (q.data ?? []).filter((r) => isAdmin || r.status === "pending" || Date.now() - Date.parse(r.requestedAt) < 7 * 86_400_000);
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 space-y-2 text-sm" data-testid="correction-panel">
      <p className="font-semibold">{isAdmin ? `طلبات تصحيح المال بانتظارك (${rows.length})` : "طلبات التصحيح التي قدّمتَها"}</p>
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-background px-3 py-2 border" data-testid={`correction-${r.id}`}>
          <span className="font-medium">{targetLabel(r)}</span>
          <span className="text-muted-foreground tabular-nums">{dmy(r.beforeSnapshot.date)}</span>
          {isAdmin && <span className="text-muted-foreground">{r.branchName} · {r.requestedByName ?? "موظّف"}</span>}
          <span className="basis-full">{changeText(r)}</span>
          <span className="basis-full text-muted-foreground">السبب: {r.reason}</span>
          {isAdmin ? (
            <span className="flex gap-2 ms-auto">
              <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, decision: "approve" })}
                data-testid={`correction-approve-${r.id}`}>اعتمد وطبّق</Button>
              <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, decision: "reject" })}
                data-testid={`correction-reject-${r.id}`}>ارفض</Button>
            </span>
          ) : (
            <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="ms-auto">
              {r.status === "approved" ? "اعتُمد" : r.status === "rejected" ? "رُفض" : "بانتظار المسؤول"}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
