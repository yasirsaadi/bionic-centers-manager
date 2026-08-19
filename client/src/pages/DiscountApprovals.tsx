// «اعتماد الخصومات» — **طابورٌ واحدٌ للأقسام الثلاثة**.
//
// ══ لماذا صفحةٌ لا بطاقةٌ في كل شاشة ════════════════════════════════════
// مديرُ الفرع لا يتصفّح ملفّات المرضى بحثاً عمّا ينتظره. فالعملُ يذهب إليه:
// طابورٌ واحد يفتحه صباحاً فيرى كلَّ ما أُوقف بانتظاره — طرفاً كان أو مسنداً
// أو علاجاً طبيعياً. وهو نمطُ «قائمة العمل» نفسُه الذي بُنيت به `/my-exams`
// للطبيب و`/manufacturing` للخبير.
//
// ══ والمعلَّقُ افتراضاً ═════════════════════════════════════════════════
// الشاشةُ عملٌ ينتظر لا أرشيفٌ يُتصفَّح. والمحسومُ يُقرأ بتبديل الفلتر.

import { useState } from "react";
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
import {
  BadgePercent, Loader2, Check, X, Pencil, HeartHandshake, ShieldAlert,
} from "lucide-react";
import {
  canApproveServiceDiscount, discountReasonLabel, computeServiceDiscount,
  DISCOUNT_STATUS_LABELS, FREE_DONATION_LABEL, type DiscountStatus,
} from "@shared/discount";
import { DEPARTMENT_LABELS } from "@shared/service_taxonomy";

interface Row {
  id: number; patientId: number; patientName: string; patientCode: string | null;
  branchId: number | null; branchName: string | null;
  department: string; originalPrice: number; proposedFinalPrice: number;
  discountAmount: number; discountPercentage: number; isFree: boolean;
  reason: string; note: string | null; status: string;
  requestedByName: string | null; requestedAt: string;
  decidedByName: string | null; decidedAt: string | null; decisionNote: string | null;
  approvedFinalPrice: number | null;
}

const FILTERS: Array<{ key: DiscountStatus; label: string }> = [
  { key: "pending", label: "بانتظار الاعتماد" },
  { key: "approved", label: "معتمد" },
  { key: "rejected", label: "مرفوض" },
  { key: "cancelled", label: "ملغى" },
];

const money = (n: number) => Number(n || 0).toLocaleString("en-US");

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });
};

export default function DiscountApprovals() {
  const session = useBranchSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState<DiscountStatus>("pending");
  //  «تعديل واعتماد»: نافذةٌ منفصلة لأنها **قرارٌ آخر** لا ضغطةٌ أسرع.
  const [editing, setEditing] = useState<Row | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editFree, setEditFree] = useState(false);
  const [editNote, setEditNote] = useState("");

  const mayApprove = canApproveServiceDiscount(session as any);

  const { data, isLoading } = useQuery<{ requests: Row[] }>({
    queryKey: ["/api/discounts", status],
    enabled: mayApprove,
    queryFn: async () => {
      const res = await fetch(`/api/discounts?status=${status}`, { credentials: "include" });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
  });
  const rows = data?.requests ?? [];

  const decide = useMutation({
    mutationFn: async (v: { id: number; body: any }) => {
      const res = await apiRequest("POST", `/api/discounts/${v.id}/decide`, v.body);
      return res.json();
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["/api/discounts"] });
      qc.invalidateQueries({ queryKey: ["/api/patients"] });
      qc.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
      toast({
        title: v.body?.decision === "reject" ? "رُفض الطلب" : "اعتُمد الطلب",
        description: v.body?.decision === "reject"
          ? "لم يتغيّر شيء مالياً — يكمل الاستعلامات بالسعر الأصلي أو يغلق الملفّ."
          : "نُفِّذت الخدمة بالسعر المعتمد.",
      });
      setEditing(null);
    },
    onError: (err: any) => toast({
      title: "تعذّر الحفظ", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  if (!mayApprove) {
    return (
      <div className="p-4 md:p-6" dir="rtl">
        <Card><CardContent className="py-10 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground" data-testid="text-discount-forbidden">
            اعتماد الخصومات للمسؤول العام ومدير الفرع والمخوَّل صراحةً.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  const editCalc = editing ? computeServiceDiscount({
    originalPrice: editing.originalPrice,
    finalPrice: editFree ? 0 : editPrice, isFree: editFree,
  }) : null;

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <BadgePercent className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-primary">اعتماد الخصومات</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        كلّ خدمةٍ أُوقفت بانتظار قرارك — أطرافاً ومساندَ وعلاجاً طبيعياً.
        <b> ولا شيء يُنفَّذ ولا دينارَ يُقيَّد قبل الاعتماد.</b>
      </p>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.key} size="sm" variant={status === f.key ? "default" : "outline"}
            onClick={() => setStatus(f.key)} data-testid={`filter-${f.key}`}>
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card><CardContent className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground"
          data-testid="text-discount-empty">
          {status === "pending" ? "لا يوجد خصم بانتظار الاعتماد." : "لا توجد طلبات بهذه الحالة."}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} data-testid={`discount-row-${r.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <span>{r.patientName}</span>
                  {r.patientCode && (
                    <span className="text-xs font-mono text-muted-foreground">{r.patientCode}</span>
                  )}
                  <Badge variant="outline">
                    {DEPARTMENT_LABELS[r.department as keyof typeof DEPARTMENT_LABELS] ?? r.department}
                  </Badge>
                  {r.branchName && <Badge variant="secondary">{r.branchName}</Badge>}
                  {r.isFree ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                      <HeartHandshake className="w-3 h-3" /> مجّاني
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                      خصم {r.discountPercentage}%
                    </Badge>
                  )}
                  {r.status !== "pending" && (
                    <Badge variant="outline">
                      {DISCOUNT_STATUS_LABELS[r.status as DiscountStatus] ?? r.status}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span><span className="text-muted-foreground">السعر الأصلي: </span>
                    <b className="font-mono">{money(r.originalPrice)}</b> د.ع</span>
                  <span><span className="text-muted-foreground">بعد الخصم: </span>
                    <b className="font-mono">{money(r.approvedFinalPrice ?? r.proposedFinalPrice)}</b> د.ع</span>
                  <span><span className="text-muted-foreground">الفرق: </span>
                    <b className="font-mono">{money(r.discountAmount)}</b> د.ع</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <span><span className="text-muted-foreground">السبب: </span>
                    <b>{r.isFree ? FREE_DONATION_LABEL : discountReasonLabel(r.reason)}</b></span>
                  <span><span className="text-muted-foreground">طلبها: </span>
                    {r.requestedByName ?? "—"}</span>
                  <span className="text-muted-foreground">{fmt(r.requestedAt)}</span>
                </div>
                {r.note && (
                  <p className="text-sm bg-muted/40 rounded-md px-3 py-2" dir="auto"
                    style={{ unicodeBidi: "plaintext" }}>{r.note}</p>
                )}
                {r.status !== "pending" && (
                  <p className="text-xs text-muted-foreground">
                    {DISCOUNT_STATUS_LABELS[r.status as DiscountStatus] ?? r.status}
                    {r.decidedByName ? ` — ${r.decidedByName}` : ""} · {fmt(r.decidedAt)}
                    {r.decisionNote ? ` · ${r.decisionNote}` : ""}
                  </p>
                )}

                {r.status === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" disabled={decide.isPending} className="gap-1"
                      data-testid={`approve-${r.id}`}
                      onClick={() => decide.mutate({ id: r.id, body: { decision: "approve" } })}>
                      <Check className="w-4 h-4" /> موافقة
                    </Button>
                    <Button size="sm" variant="outline" disabled={decide.isPending} className="gap-1"
                      data-testid={`modify-${r.id}`}
                      onClick={() => {
                        setEditing(r); setEditPrice(r.proposedFinalPrice);
                        setEditFree(r.isFree); setEditNote("");
                      }}>
                      <Pencil className="w-4 h-4" /> تعديل واعتماد
                    </Button>
                    <Button size="sm" variant="destructive" disabled={decide.isPending} className="gap-1"
                      data-testid={`reject-${r.id}`}
                      onClick={() => decide.mutate({ id: r.id, body: { decision: "reject" } })}>
                      <X className="w-4 h-4" /> رفض
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── تعديل واعتماد ── */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعديل السعر واعتماده</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                السعر الأصلي: <b className="font-mono">{money(editing.originalPrice)}</b> د.ع ·
                المقترَح: <b className="font-mono">{money(editing.proposedFinalPrice)}</b> د.ع
              </p>

              {/*  **والتصفيرُ يحتاج إعلاناً صريحاً**: الصفرُ في هذا النظام
                  يعني «غير مسعَّر»، فلا يُقرأ تبرّعاً بالصمت. */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editFree}
                  onChange={(e) => { setEditFree(e.target.checked); if (e.target.checked) setEditPrice(0); }}
                  data-testid="edit-free" />
                <HeartHandshake className="w-4 h-4 text-emerald-700" />
                <b>مجاني ({FREE_DONATION_LABEL})</b>
              </label>

              {!editFree && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">السعر المعتمد</label>
                  <MoneyInput value={editPrice} onValueChange={setEditPrice}
                    data-testid="edit-price" />
                </div>
              )}

              {editCalc && !editCalc.ok && (
                <p className="text-sm text-destructive" data-testid="edit-error">{editCalc.error}</p>
              )}
              {editCalc?.ok && (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
                  خصم <b className="font-mono">{money(editCalc.discountAmount)}</b> د.ع
                  {" "}(<b>{editCalc.discountPercentage}%</b>).
                </p>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">ملاحظة القرار (اختياري)</label>
                <Input value={editNote} onChange={(e) => setEditNote(e.target.value)}
                  data-testid="edit-note" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button disabled={decide.isPending || !editCalc?.ok}
              data-testid="edit-submit"
              onClick={() => editing && decide.mutate({
                id: editing.id,
                body: {
                  decision: "approve", finalPrice: editFree ? 0 : editPrice,
                  isFree: editFree, note: editNote.trim() || undefined,
                },
              })}>
              {decide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "اعتماد بالسعر المعدَّل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
