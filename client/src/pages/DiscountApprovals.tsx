// «خصومات سابقة» — بقيّةٌ من طابورٍ متقاعد، لا عملٌ حيّ.
//
// ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — الطابورُ الحيّ تقاعد ═══════════════════
// كانت هذه الصفحةُ «اعتماد الخصومات»: طابورَ عملٍ حيّاً يفتحه مديرُ الفرع
// صباحاً. اليوم **لا شيء يصله**: كلُّ خصمٍ يُدخله موظّفٌ مخوَّلٌ يُطبَّق
// فوراً عند الحفظ من نافذة الخدمة نفسِها (`applyDiscountImmediately`) —
// لا إرسالَ ولا انتظارَ ولا اعتمادَ لاحق. القاعدةُ: مَن يملك تنفيذ العملية
// بسعرها الكامل يملك تنفيذَها بخصمٍ صحيح أيضاً، فالخصمُ لم يعد باباً ثانياً.
//
// **وما بقي هنا** هو حصراً طلباتٌ أُنشئت **قبل** هذا التغيير ولم تُحسَم —
// بقيّةٌ تاريخية، لا طابورَ يتجدّد. الصفحةُ تبقى لإكمالها فقط، عبر
// `/api/discounts/:id/decide` القانونية نفسِها بلا تعديل. راجع القسم ٤.ل
// في CLAUDE.md لبقيّة مراحل تبسيط بيع الاستعلامات التي بنت عليها هذه.
//
// ══ والمعلَّقُ افتراضاً ═════════════════════════════════════════════════
// الشاشةُ إكمالُ ما تبقّى لا أرشيفٌ يُتصفَّح. والمحسومُ يُقرأ بتبديل الفلتر.

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
  DISCOUNT_HISTORY_TITLE, DISCOUNT_STATUS_LABELS, FREE_DONATION_LABEL,
  type DiscountStatus,
} from "@shared/discount";
import { DEPARTMENT_LABELS, NEW_SERVICE_LABELS } from "@shared/service_taxonomy";
import { PriceTransition } from "@/components/PriceTransition";

interface Row {
  id: number; patientId: number; patientName: string; patientCode: string | null;
  branchId: number | null; branchName: string | null;
  department: string; originalPrice: number; proposedFinalPrice: number;
  discountAmount: number; discountPercentage: number; isFree: boolean;
  reason: string; note: string | null; status: string;
  requestedByName: string | null; requestedAt: string;
  decidedByName: string | null; decidedAt: string | null; decisionNote: string | null;
  approvedFinalPrice: number | null;
  /** حمولةُ الاستئناف — منها يُقرأ **ما اشتراه المريض** لا رقمُه فقط. */
  payload?: {
    kind?: string | null;
    serviceType?: string | null;
    entries?: { treatmentType: string; sessionCount: number }[] | null;
    /** ما دفعه المريضُ فعلاً وقتَ الطلب، إن كان محفوظاً. راجع `needsPaymentEntry`. */
    initialPayment?: number | null;
  } | null;
}

/**
 * **ماذا اشترى المريض؟** — سطرٌ واحد يقرأه المعتمِد بلا فتح ملفّ.
 *
 * بطاقةٌ تقول «٢٥,٠٠٠ ← ١٢,٥٠٠» وحدها تجعل المديرَ يخمّن ما بيع، أو يفتح
 * ملفّ المريض ليعرف — وهو ما يجعله يعتمد بلا قراءة. فالخدمةُ والجلساتُ
 * تُعرَضان معه.
 */
function serviceLine(r: Row): string | null {
  const p = r.payload;
  if (!p || p.kind !== "new_service") return null;
  const head = NEW_SERVICE_LABELS[String(p.serviceType ?? "")] ?? null;
  const parts = (p.entries ?? [])
    .filter((e) => e && e.treatmentType && Number(e.sessionCount) > 0)
    .map((e) => `${e.treatmentType} — ${e.sessionCount} جلسة`);
  if (parts.length === 0) return head;
  return head ? `${head}: ${parts.join(" · ")}` : parts.join(" · ");
}

/**
 * **هل تحتاج هذه البقيّةُ التاريخية مبلغاً يُكتَب الآن؟** (تصحيحٌ لاحق —
 * لا اختراعَ مالٍ) ═══════════════════════════════════════════════════════
 * صفُّ «خدمة جديدة» غيرُ مجّانيّ لا يحمل مبلغاً محفوظاً موجباً أصلاً: لم
 * تُسجَّل هذه الواقعةُ يومَ الطلب، ولا يجوز افتراضُ قبضٍ كاملٍ لم يُثبِته
 * أحد. فالمُنجِز يكتب المبلغَ الفعليّ الآن — نفسُ حارس «خدمة جديدة»
 * المباشرة، على هذا الباب أيضاً. والمجّانيُّ الصريح والمحفوظُ الموجب لا
 * يحتاجان شيئاً.
 */
function needsPaymentEntry(r: Row): boolean {
  if (r.payload?.kind !== "new_service") return false;
  if (r.isFree) return false;
  return !(Number(r.payload?.initialPayment) > 0);
}

//  **قيمُ `key` = حالاتُ القاعدة نفسُها (`DISCOUNT_STATUSES`) بلا تغيير**
//  — لا يُعاد تسميتها هنا؛ التغيير في `label` وحده (نصٌّ للعرض لا قيمةٌ
//  تُرسَل أو تُخزَّن).
const FILTERS: Array<{ key: DiscountStatus; label: string }> = [
  { key: "pending", label: "بانتظار الإكمال" },
  { key: "approved", label: "مكتمل" },
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
  //  **المبلغُ المدفوعُ فعلاً** — لصفوفٍ تاريخية بلا مبلغٍ محفوظ فقط
  //  (`needsPaymentEntry`)، بمفتاح رقم الطلب فلا يتسرّب إدخالُ صفٍّ إلى آخر.
  const [paymentInputs, setPaymentInputs] = useState<Record<number, string>>({});
  const paymentFor = (id: number) => Number(paymentInputs[id]) || 0;

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
        title: v.body?.decision === "reject" ? "أُلغي الطلب" : "اكتمل الطلب",
        description: v.body?.decision === "reject"
          ? "لم يتغيّر شيء مالياً — يكمل الاستعلامات بالسعر الأصلي أو يغلق الملفّ."
          : "نُفِّذت الخدمة بالسعر النهائي.",
      });
      setEditing(null);
      setPaymentInputs((p) => {
        if (!(v.id in p)) return p;
        const next = { ...p };
        delete next[v.id];
        return next;
      });
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
            {DISCOUNT_HISTORY_TITLE} — للمسؤول العام ومدير الفرع والمخوَّل صراحةً.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  const editCalc = editing ? computeServiceDiscount({
    originalPrice: editing.originalPrice,
    finalPrice: editFree ? 0 : editPrice, isFree: editFree,
  }) : null;
  //  **على `editFree` الحيّ لا `editing.isFree` الأصليّ**: لو بدّل المديرُ
  //  الخيارَ هنا إلى «مجّاني»، يُعفى من إدخال المبلغ فوراً — يطابق ما
  //  سيُرسَل فعلاً (`isFree: editFree` أدناه)، لا حالةَ الصفّ الأصلية.
  const editNeedsPayment = editing
    ? editing.payload?.kind === "new_service" && !editFree
      && !(Number(editing.payload?.initialPayment) > 0)
    : false;

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <BadgePercent className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-primary">{DISCOUNT_HISTORY_TITLE}</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        الخصمُ يُطبَّق فوراً عند الحفظ من نافذة الخدمة نفسِها — <b>لا اعتمادَ
        بعد اليوم.</b> هذه الصفحةُ لإكمال ما تبقّى من طلباتٍ سابقةٍ على هذا
        التغيير فقط، أطرافاً كانت أو مسانِدَ أو علاجاً طبيعياً.
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
          {status === "pending" ? "لا توجد طلباتٌ سابقةٌ بانتظار الإكمال." : "لا توجد طلبات بهذه الحالة."}
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
                {/*  **ما اشتراه المريض** — قبل رقمه. */}
                {serviceLine(r) && (
                  <p className="font-medium" data-testid={`discount-${r.id}-service`}
                    dir="auto" style={{ unicodeBidi: "plaintext" }}>{serviceLine(r)}</p>
                )}
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {/*  الأصليُّ ثم النهائيُّ في وحدةٍ معزولة — فلا يقلبها
                      اتجاهُ الصفحة فيبدو الخصمُ زيادةً. */}
                  <span><span className="text-muted-foreground">السعر: </span>
                    <PriceTransition from={r.originalPrice}
                      to={r.approvedFinalPrice ?? r.proposedFinalPrice}
                      testId={`discount-${r.id}-transition`} /> د.ع</span>
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

                {/*  **الإكمالُ والإلغاءُ أوّلاً، والتعديلُ ثانويّ**: هذا
                    صفٌّ من قبل التطبيق الفوريّ — الاتفاقُ أُبرم مع المريض
                    يومَها، فمَن يحسمه اليوم يُقرّه في الغالب بضغطةٍ واحدة.
                    و«تعديل وإكمال» للاستثناء لا للعادة. */}
                {r.status === "pending" && (
                  <div className="space-y-2 pt-1">
                    {/*  ══ **مبلغٌ مدفوعٌ لازم لصفوفٍ لا تحمله محفوظاً**
                        (تصحيحٌ لاحق) ═══════════════════════════════════
                        هذا الطلبُ من قبل تسجيل المبلغ المقبوض حقلاً
                        مستقلّاً — لا يُخترَع من السعر المتَّفق عليه. */}
                    {needsPaymentEntry(r) && (
                      <div className="space-y-1 max-w-[240px]">
                        <label className="text-xs font-medium text-amber-800">
                          المبلغ المُستلَم فعلاً <span className="text-red-500">*</span>
                        </label>
                        <MoneyInput value={paymentInputs[r.id] ?? ""} placeholder="0"
                          onValueChange={(n) =>
                            setPaymentInputs((p) => ({ ...p, [r.id]: String(n) }))}
                          data-testid={`payment-input-${r.id}`} />
                        <p className="text-xs text-muted-foreground">
                          لا مبلغَ محفوظاً لهذا الطلب — اكتب ما استلمه المركزُ فعلاً
                          حينها ليكتمل.
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" disabled={decide.isPending} className="gap-1"
                        data-testid={`approve-${r.id}`}
                        onClick={() => {
                          if (needsPaymentEntry(r) && paymentFor(r.id) <= 0) {
                            toast({ title: "«أدخل المبلغ المدفوع الآن»", variant: "destructive" });
                            return;
                          }
                          decide.mutate({
                            id: r.id,
                            body: {
                              decision: "approve",
                              ...(needsPaymentEntry(r) ? { initialPayment: paymentFor(r.id) } : {}),
                            },
                          });
                        }}>
                        <Check className="w-4 h-4" /> إكمال وتطبيق السعر
                      </Button>
                      <Button size="sm" variant="destructive" disabled={decide.isPending} className="gap-1"
                        data-testid={`reject-${r.id}`}
                        onClick={() => decide.mutate({ id: r.id, body: { decision: "reject" } })}>
                        <X className="w-4 h-4" /> إلغاء الطلب
                      </Button>
                      <Button size="sm" variant="ghost" disabled={decide.isPending}
                        className="gap-1 text-muted-foreground"
                        data-testid={`modify-${r.id}`}
                        onClick={() => {
                          setEditing(r); setEditPrice(r.proposedFinalPrice);
                          setEditFree(r.isFree); setEditNote("");
                        }}>
                        <Pencil className="w-4 h-4" /> تعديل وإكمال
                      </Button>
                    </div>
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
          <DialogHeader><DialogTitle>تعديل السعر وإكماله</DialogTitle></DialogHeader>
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

              {/*  ══ **مبلغٌ مدفوعٌ لازم لصفوفٍ لا تحمله محفوظاً** (تصحيحٌ
                  لاحق) ═══════════════════════════════════════════════
                  يختفي فوراً لو بدّل المديرُ الخيارَ فوق إلى «مجّاني». */}
              {editNeedsPayment && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    المبلغ المُستلَم فعلاً <span className="text-red-500">*</span>
                  </label>
                  <MoneyInput value={paymentInputs[editing.id] ?? ""} placeholder="0"
                    onValueChange={(n) =>
                      setPaymentInputs((p) => ({ ...p, [editing.id]: String(n) }))}
                    data-testid="edit-payment" />
                  <p className="text-xs text-muted-foreground">
                    لا مبلغَ محفوظاً لهذا الطلب — اكتب ما استلمه المركزُ فعلاً حينها.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">ملاحظة القرار (اختياري)</label>
                <Input value={editNote} onChange={(e) => setEditNote(e.target.value)}
                  data-testid="edit-note" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button disabled={decide.isPending || !editCalc?.ok
              || (editNeedsPayment && paymentFor(editing?.id ?? -1) <= 0)}
              data-testid="edit-submit"
              onClick={() => {
                if (!editing) return;
                if (editNeedsPayment && paymentFor(editing.id) <= 0) {
                  toast({ title: "«أدخل المبلغ المدفوع الآن»", variant: "destructive" });
                  return;
                }
                decide.mutate({
                  id: editing.id,
                  body: {
                    decision: "approve", finalPrice: editFree ? 0 : editPrice,
                    isFree: editFree, note: editNote.trim() || undefined,
                    ...(editNeedsPayment ? { initialPayment: paymentFor(editing.id) } : {}),
                  },
                });
              }}>
              {decide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إكمال بالسعر المعدَّل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
