// **المحذوفات** — سلّةُ المرضى ومهلةُ الاستعادة (ترحيل ٠٦٨).
//
// ══ ملفٌّ خرج من النظام، ولم يُهدَم ═══════════════════════════════════
// كلُّ صفوفه قائمةٌ كما هي: معايناتُه وأوامرُ تصنيعه ودفعاتُه وقيودُ كلفه
// وفواتيرُه. والصفحةُ تقول أربعةَ أشياء لكلّ ملفّ: **مَن حذفه · متى ·
// لماذا · وكم بقي له من مهلة**.
//
// ══ ولا تُخلَط بالبحث العاديّ ═════════════════════════════════════════
// السجلُّ يعرض الفعّالين وحدهم، والبحثُ هنا **داخل السلّة وحدها**. وخلطُهما
// كان سيعيد المحذوفَ إلى الشاشة التي أُخرج منها.
//
// ══ والحذفُ النهائيُّ قرارٌ ثانٍ ═══════════════════════════════════════
// لا شيءَ يُمحى في اليوم الثلاثين تلقائياً: تسقط **الاستعادةُ** وحدها.
// والمحوُ فعلٌ يقرّره المسؤولُ العام صراحةً بسببٍ مكتوب وتأكيدٍ ثانٍ.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateAfterPatientTrashChange } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import {
  Trash2, Undo2, Loader2, Search, ShieldAlert, AlertTriangle, Clock,
} from "lucide-react";
import {
  TRASH_TITLE, RESTORE_LABEL, PURGE_LABEL, PURGE_REASON_LABEL,
  RESTORE_EXPIRED_MESSAGE, canTrashPatients, canPurgePatients,
} from "@shared/patient_trash";

const money = (n: number) => Number(n || 0).toLocaleString("en-US");

const ROLE_LABELS: Record<string, string> = {
  admin: "المسؤول العام",
  branch_manager: "مدير الفرع",
  doctor: "طبيب",
};

export interface TrashRow {
  id: number;
  patientCode: string | null;
  name: string | null;
  phone: string | null;
  branchId: number | null;
  branchName: string | null;
  deletedAt: string;
  restoreUntil: string | null;
  deletedByName: string | null;
  deletedByRole: string | null;
  deletedReason: string | null;
  totalCost: number;
  totalPaid: number;
  remaining: number;
  pending: Record<string, number> | null;
  neededGlobalAdmin: boolean | null;
  restorable: boolean;
  daysLeft: number;
}

export const fmtStamp = (v: string | null | undefined): string => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-IQ", {
    timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

/** أسطرُ «ما كان معلّقاً يوم الحذف» — من اللقطة، بلا إعادة حساب. */
const PENDING_LABELS: Array<[string, string]> = [
  ["pendingCharges", "مبالغ بلا معاينة"],
  ["pendingDiscounts", "طلبات خصم"],
  ["pendingPriceRequests", "طلبات سعر"],
  ["openFollowups", "متابعات بيع"],
  ["openSettlements", "تسويات معلّقة"],
];

export default function PatientTrash() {
  const session = useBranchSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [purging, setPurging] = useState<TrashRow | null>(null);
  const [purgeReason, setPurgeReason] = useState("");
  const [purgeConfirmed, setPurgeConfirmed] = useState(false);

  const maySee = canTrashPatients(session as any);
  const mayPurge = canPurgePatients(session as any);

  const { data, isLoading } = useQuery<{ rows: TrashRow[]; mayPurge: boolean }>({
    queryKey: ["/api/patient-trash", search],
    enabled: maySee,
    queryFn: async () => {
      const url = search.trim()
        ? `/api/patient-trash?search=${encodeURIComponent(search.trim())}`
        : "/api/patient-trash";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return { rows: [], mayPurge: false };
      return res.json();
    },
  });
  const rows = data?.rows ?? [];

  //  **نفسُ تنظيف الذاكرة في الاتجاهين**: الاستعادةُ تُعيد الملفَّ إلى
  //  القوائم كما أخرجه الحذفُ منها، والحذفُ النهائيُّ يُخرجه من السلّة.
  const refresh = (id: number) => invalidateAfterPatientTrashChange(qc, id);

  const restore = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/patient-trash/${id}/restore`);
      return res.json();
    },
    onSuccess: (_d, id) => {
      refresh(id);
      toast({
        title: "تمت الاستعادة",
        description: "عاد الملف كما كان — بنفس الرمز ونفس الحالات والمعاينات والدفعات.",
      });
    },
    onError: (err: any) => toast({
      title: "تعذّرت الاستعادة", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  const purge = useMutation({
    mutationFn: async (v: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/patient-trash/${v.id}/purge`, { reason: v.reason });
      return res.json();
    },
    onSuccess: (_d, v) => {
      refresh(v.id);
      setPurging(null); setPurgeReason(""); setPurgeConfirmed(false);
      toast({ title: "تم الحذف النهائي", description: "لا رجعة في هذا الإجراء." });
    },
    onError: (err: any) => toast({
      title: "تعذّر الحذف النهائي", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  if (!maySee) {
    return (
      <div className="p-8">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-8 text-center space-y-2">
            <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-medium">هذه الصفحة للمسؤول العام ومدير الفرع والطبيب.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-muted-foreground" />
          {TRASH_TITLE}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
          الملفّات هنا خرجت من النظام الفعّال — من القوائم والبحث والطوابير
          والمحاسبة — <strong>ولم يُحذف منها شيء</strong>. الاستعادة تعيد الملف
          كما كان بنفس الرمز ونفس الحالات والمعاينات وأوامر التصنيع والدفعات.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث داخل المحذوفات — بالاسم أو رمز المريض"
          className="pr-9"
          data-testid="input-trash-search"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحميل…
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {search.trim() ? "لا نتائج في المحذوفات." : "لا ملفات في المحذوفات."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} data-testid={`trash-row-${r.id}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    <span>{r.name ?? "—"}</span>
                    {r.patientCode && (
                      <Badge variant="outline" className="font-mono">{r.patientCode}</Badge>
                    )}
                    {r.branchName && <Badge variant="secondary">{r.branchName}</Badge>}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {r.restorable ? (
                      <Badge className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        <Clock className="w-3 h-3" />
                        يمكن الاستعادة — بقي {r.daysLeft} يوماً
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {RESTORE_EXPIRED_MESSAGE}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {/*  السببُ أوّلُ ما يُقرأ — كما في طابور «مُعادة للتصحيح».  */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">سبب الحذف</div>
                  <div className="font-medium">{r.deletedReason ?? "—"}</div>
                </div>

                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-muted-foreground">
                  <div>حُذف في: <span className="text-foreground">{fmtStamp(r.deletedAt)}</span></div>
                  <div>
                    حذفه: <span className="text-foreground">{r.deletedByName ?? "—"}</span>
                    {r.deletedByRole && ` (${ROLE_LABELS[r.deletedByRole] ?? r.deletedByRole})`}
                  </div>
                  <div>مهلة الاستعادة حتى: <span className="text-foreground">{fmtStamp(r.restoreUntil)}</span></div>
                  {r.phone && <div>الهاتف: <span className="text-foreground">{r.phone}</span></div>}
                </div>

                {/*  اللقطةُ المالية يوم الحذف — للتدقيق والعرض، لا للحساب.  */}
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">الحال المالي يوم الحذف</div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span>الكلفة: <strong>{money(r.totalCost)}</strong> د.ع</span>
                    <span>المدفوع: <strong>{money(r.totalPaid)}</strong> د.ع</span>
                    {r.remaining === 0 ? (
                      <span className="text-emerald-700">الحساب مسدَّد</span>
                    ) : r.remaining > 0 ? (
                      <span className="text-red-600">المتبقي: <strong>{money(r.remaining)}</strong> د.ع</span>
                    ) : (
                      <span className="text-emerald-700">
                        رصيد للمريض: <strong>{money(-r.remaining)}</strong> د.ع
                      </span>
                    )}
                  </div>
                  {r.pending && PENDING_LABELS.some(([k]) => Number(r.pending?.[k] ?? 0) > 0) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {PENDING_LABELS.filter(([k]) => Number(r.pending?.[k] ?? 0) > 0).map(([k, label]) => (
                        <Badge key={k} variant="outline" className="text-amber-700 border-amber-300">
                          {label}: {r.pending?.[k]}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {r.neededGlobalAdmin && (
                    <div className="text-xs text-amber-700">
                      حُذف بقرار المسؤول العام لوجود التزام مالي قائم يوم الحذف.
                    </div>
                  )}
                </div>

                {/*  ══ لا «فتح الملف» من هنا ══════════════════════════════
                      الملفُّ محذوفٌ فعلاً من النظام الفعّال، وصفحتُه العادية
                      `/patients/:id` تُردّ ٤٠٤ عمداً (نقطةُ الخنق
                      `storage.getPatient` تستثني المحذوف بلا استثناء). فزرٌّ
                      يعد بفتحها كان وعداً كاذباً يقود إلى صفحةِ خطأ — والبطاقةُ
                      هنا تحمل أصلاً كلَّ ما يلزم للقرار: مَن حذف ومتى ولماذا
                      واللقطةَ المالية. أرشيفٌ للقراءة يُفتَح منه الملفُّ لاحقاً
                      قرارُ منتجٍ منفصل، لا جزءٌ من هذه المرحلة.  */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    variant="default"
                    className="gap-2"
                    disabled={!r.restorable || restore.isPending}
                    onClick={() => restore.mutate(r.id)}
                    data-testid={`button-restore-${r.id}`}
                  >
                    <Undo2 className="w-4 h-4" />
                    {RESTORE_LABEL}
                  </Button>
                  {/*  ══ والحذفُ النهائيّ لا يُعرَض إلّا بعد انقضاء المهلة ══
                        بابُه المهلةُ المنقضية فقط — الخادمُ يفرض هذا بصرامة
                        (`PURGE_BEFORE_EXPIRY_MESSAGE`، ٤٠٩ ولو كان الطالبُ
                        المسؤولَ العام)، والزرُّ لا يُعرَض أصلاً وهو سيُردّ.  */}
                  {mayPurge && !r.restorable && (
                    <Button
                      variant="outline"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 mr-auto"
                      onClick={() => { setPurging(r); setPurgeReason(""); setPurgeConfirmed(false); }}
                      data-testid={`button-purge-${r.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {PURGE_LABEL}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/*  ══ الحذفُ النهائيّ — تأكيدٌ ثانٍ وسببٌ إلزاميّ ══════════════  */}
      <Dialog open={purging !== null} onOpenChange={(o) => { if (!o) setPurging(null); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {PURGE_LABEL} — لا رجعة
            </DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              سيُحذف ملف <strong>{purging?.name}</strong> وكلُّ ما يتبعه نهائياً:
              الزيارات والدفعات والفواتير والمعاينات وأوامر التصنيع وقيود الكلفة.
              <br />
              <strong>هذا الإجراء لا يمكن التراجع عنه.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{PURGE_REASON_LABEL}</label>
              <Textarea
                value={purgeReason}
                onChange={(e) => setPurgeReason(e.target.value)}
                placeholder="اكتب سبب الحذف النهائي — يُحفظ في سجل التدقيق"
                className="mt-1"
                data-testid="input-purge-reason"
              />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={purgeConfirmed}
                onChange={(e) => setPurgeConfirmed(e.target.checked)}
                className="mt-1"
                data-testid="checkbox-purge-confirm"
              />
              <span>أفهم أن البيانات ستُمحى نهائياً ولا يمكن استعادتها.</span>
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPurging(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              disabled={!purgeConfirmed || purgeReason.trim().length === 0 || purge.isPending}
              onClick={() => purging && purge.mutate({ id: purging.id, reason: purgeReason.trim() })}
              data-testid="button-purge-confirm"
            >
              {purge.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : PURGE_LABEL}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
