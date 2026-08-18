import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@shared/routes";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { filterAndRank } from "@shared/patient_search";
import { GitMerge, Loader2, AlertTriangle } from "lucide-react";

interface PatientLite {
  id: number; name: string; branchId: number; createdAt?: string | null;
  phone?: string | null;
  /** الرمز الحالي ورموزُ ملفّاتٍ دُمجت فيه — من `/api/patients` دفعةً واحدة. */
  patientCode?: string | null;
  aliasCodes?: string[];
}
interface Branch { id: number; name: string; }

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "بلا تاريخ";
  return new Date(d).toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric" });
}

// Admin-only tool for cleaning up duplicate patient records: merges THIS
// (duplicate) record into an original one. Registration dates with clear
// الأقدم/الأحدث labels drive the choice — the convention is to KEEP the
// older (original) file and merge the newer duplicate into it.
export function MergePatientDialog({
  patientId, patientName, patientCreatedAt,
}: { patientId: number; patientName: string; patientCreatedAt?: string | Date | null }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Pre-fill the search with the patient's name so their duplicates show
  // up immediately.
  useEffect(() => {
    if (open) setSearch(patientName);
  }, [open, patientName]);

  const { data: patients = [] } = useQuery<PatientLite[]>({
    queryKey: [api.patients.list.path],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/patients", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: open,
  });
  const branchName = (id: number) => branches.find((b) => b.id === id)?.name ?? `#${id}`;

  const currentTime = patientCreatedAt ? new Date(patientCreatedAt).getTime() : null;

  // Relative label vs the OPEN (duplicate) file: الأقدم wears the "original"
  // suggestion, الأحدث is likely the duplicate.
  const relative = (p: PatientLite): "أقدم" | "أحدث" | null => {
    if (!currentTime || !p.createdAt) return null;
    const t = new Date(p.createdAt).getTime();
    if (t === currentTime) return null;
    return t < currentTime ? "أقدم" : "أحدث";
  };

  const candidates = useMemo(
    () => filterAndRank(
      patients.filter((p) => p.id !== patientId),
      search, (p) => ({
        name: p.name, phone: p.phone,
        patientCode: p.patientCode, aliasCodes: p.aliasCodes,
      }),
    )
      .sort((a, b) => {
        // Exact same-name matches first (the actual duplicates), then oldest first.
        const aExact = a.name.trim() === patientName.trim() ? 0 : 1;
        const bExact = b.name.trim() === patientName.trim() ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
      })
      .slice(0, 50),
    [patients, patientId, search, patientName],
  );
  const target = patients.find((p) => String(p.id) === targetId);
  const targetRel = target ? relative(target) : null;
  // The open file gets deleted. Convention keeps the OLDER file — warn when
  // the admin is about to delete the older one instead.
  const deletingOlder = targetRel === "أحدث";

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/patients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceId: patientId, targetId: Number(targetId) }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "فشل الدمج");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      const moved = data.moved || {};
      const summary = [
        moved.visits ? `${moved.visits} زيارة` : null,
        moved.payments ? `${moved.payments} دفعة` : null,
        moved.workOrders ? `${moved.workOrders} أمر تصنيع` : null,
      ].filter(Boolean).join("، ");
      toast({ title: "تم الدمج بنجاح", description: summary ? `انتقل للملف الأصلي: ${summary}.` : "اكتمل الدمج." });
      setOpen(false);
      setLocation(`/patients/${targetId}`);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const confirmed = confirmText.trim() === "دمج";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTargetId(""); setSearch(""); setConfirmText(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-purple-700 border-purple-200 hover:bg-purple-50" data-testid="button-merge-patient">
          <GitMerge className="w-4 h-4" />
          دمج مع ملف آخر
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">دمج ملف مكرّر</DialogTitle>
        </DialogHeader>

        {/* This (open) file = the one that gets DELETED */}
        <div className="text-sm bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
          <span>
            الملف المفتوح الآن: <b>{patientName}</b> — مسجَّل بتاريخ <b>{fmtDate(patientCreatedAt)}</b>.
            سيُنقل كل ما فيه (الزيارات، الدفعات، أوامر التصنيع…) إلى الملف الذي تختاره، ثم <b>يُحذف هو نهائياً</b>. لا يمكن التراجع.
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          المعتاد: يبقى الملف <b>الأقدم</b> (الأصلي) ويُدمج فيه الملف <b>الأحدث</b> المكرّر.
        </p>

        <div className="space-y-3 mt-1">
          <div>
            <label className="text-sm font-medium">الملف الذي سيبقى</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم…" className="mt-1 mb-2" />
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger data-testid="select-merge-target">
                <SelectValue placeholder="اختر الملف" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((p) => {
                  const rel = relative(p);
                  return (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} — ملف {p.id} — {branchName(p.branchId)} — {fmtDate(p.createdAt)}
                      {rel ? (rel === "أقدم" ? " (الأقدم ✓)" : " (الأحدث)") : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {target && (
            <>
              {/* Side-by-side date comparison so old vs new is unmistakable */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="border border-red-200 bg-red-50 rounded-md p-2">
                  <div className="text-xs text-red-700 font-semibold mb-1">سيُحذف (المفتوح الآن)</div>
                  <div className="font-medium">{patientName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{fmtDate(patientCreatedAt)}</div>
                  {targetRel && (
                    <Badge variant="outline" className="mt-1 text-[11px] bg-white">
                      {targetRel === "أحدث" ? "هذا هو الأقدم" : "هذا هو الأحدث"}
                    </Badge>
                  )}
                </div>
                <div className="border border-green-200 bg-green-50 rounded-md p-2">
                  <div className="text-xs text-green-700 font-semibold mb-1">سيبقى (يستلم كل شيء)</div>
                  <div className="font-medium">{target.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{fmtDate(target.createdAt)}</div>
                  {targetRel && (
                    <Badge variant="outline" className="mt-1 text-[11px] bg-white">
                      {targetRel === "أقدم" ? "الأقدم — الأصلي غالباً ✓" : "الأحدث"}
                    </Badge>
                  )}
                </div>
              </div>

              {deletingOlder && (
                <div className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2">
                  تنبيه: أنت على وشك حذف الملف <b>الأقدم</b> وإبقاء الأحدث — عكس المعتاد.
                  إن كان قصدك إبقاء الأقدم، أغلق هذه النافذة وافتح الملف الأحدث ثم ادمجه في هذا.
                  (البيانات لا تضيع في الحالتين — يتغيّر فقط أي الملفين يبقى برقمه وتاريخه.)
                </div>
              )}

              <div>
                <label className="text-sm font-medium">للتأكيد اكتب: دمج</label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1" placeholder="دمج" data-testid="input-merge-confirm" />
              </div>
            </>
          )}

          <Button
            className="w-full h-11 font-semibold bg-purple-700 hover:bg-purple-800"
            disabled={!targetId || !confirmed || isPending}
            onClick={() => mutate()}
            data-testid="button-confirm-merge"
          >
            {isPending ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الدمج…</>) : `دمج في ملف ${target?.name ?? ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
