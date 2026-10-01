// **مبدِّلُ الفرع** — ظاهرٌ جداً (قرارُ المالك ٢٠٢٦-١٠-٠١، §4.ay).
//
// الموظّفُ متعدّدُ الفروع يُعامَل **بالفرع الذي اختاره وحده**: يرى مرضاه ويعمل فيه، وكلُّ ما يسجّله يُكتب له. فإن أراد
// مريضاً من فرعٍ آخر يبدّل الفرعَ من هنا بلا خروج. ولذلك لا يُخفى في زاويةٍ: بطاقةٌ ملوّنة تقول «تعمل الآن في …»
// وزرٌّ «تبديل الفرع»، ونسخةٌ مختصرة في شريط الهاتف.
//
// **والمسؤولُ العامّ** يراه كذلك: لمريضٍ له أكثرُ من فرع تُطلَب العمليةُ بفرعٍ مختار (الخادمُ يردّ إن لم يُختَر)،
// ومعه خيارُ «كل الفروع» للعرض.

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Loader2, ArrowLeftRight } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Branch } from "@shared/schema";

/** فروعُ المبدِّل: فروعُ الحساب كلُّها (لا النطاقُ المُضيَّق على الفرع النشط). */
function assignedOf(session: any): number[] {
  if (Array.isArray(session?.assignedBranches)) return session.assignedBranches;
  return Array.isArray(session?.accessibleBranches) ? session.accessibleBranches : [];
}

export function BranchSwitcher({ compact = false }: { compact?: boolean }) {
  const session = useBranchSession() as any;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  const isAdmin = Boolean(session?.isAdmin);
  const assigned = assignedOf(session);
  const visible = Boolean(session) && (isAdmin || assigned.length > 1);

  useEffect(() => {
    if (!visible) return;
    fetch("/api/branches", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((all: Branch[]) => setBranches(Array.isArray(all) ? all : []))
      .catch(() => setBranches([]));
  }, [visible]);

  if (!visible) return compact ? <div className="w-10" /> : null;

  const options = isAdmin ? branches : branches.filter((b) => assigned.includes(b.id));
  const currentId = Number(session.branchId ?? 0);
  const currentName = currentId > 0
    ? (branches.find((b) => b.id === currentId)?.name ?? session.branchName ?? "—")
    : "كل الفروع";

  const switchTo = async (branchId: number) => {
    if (branchId === currentId) { setOpen(false); return; }
    setBusyId(branchId);
    try {
      const res = await fetch("/api/auth/switch-branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ branchId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "تعذّر التبديل");
      }
      const data = await res.json();
      const updated = {
        ...session, branchId: data.branchId, branchName: data.branchName,
        ...(isAdmin ? {} : { accessibleBranches: data.branchId > 0 ? [data.branchId] : [], assignedBranches: assigned }),
      };
      localStorage.setItem("branch_session", JSON.stringify(updated));
      //  كلُّ ما في الذاكرة بُني على الفرع القديم — يُمحى ويُعاد التحميل.
      queryClient.clear();
      toast({ title: `تمّ التبديل إلى ${data.branchName}` });
      setOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast({ title: "تعذّر تبديل الفرع", description: err?.message ?? "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const list = open && (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
      <div className={`absolute ${compact ? "left-0" : "right-0 left-0"} mt-1 z-40 min-w-56 rounded-md border bg-white shadow-lg overflow-hidden`}
        data-testid="branch-switcher-list">
        <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30">اختر الفرع الذي تعمل فيه الآن</div>
        {options.length === 0 ? (
          <div className="px-3 py-3 text-sm text-muted-foreground">جارٍ جلب القائمة…</div>
        ) : (
          [...(isAdmin ? [{ id: 0, name: "كل الفروع" } as any] : []), ...options].map((branch: any) => {
            const isCurrent = branch.id === currentId;
            return (
              <button key={branch.id} type="button" onClick={() => switchTo(branch.id)} disabled={busyId !== null}
                className={`w-full text-right px-3 py-2.5 text-sm hover:bg-accent flex items-center justify-between gap-2 ${isCurrent ? "bg-amber-50 font-bold" : ""}`}
                data-testid={`button-switch-to-${branch.id}`}>
                <span>{branch.name}</span>
                {busyId === branch.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : isCurrent ? <span className="text-xs text-amber-700">الحالي</span> : null}
              </button>
            );
          })
        )}
      </div>
    </>
  );

  if (compact) {
    return (
      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 rounded-full border-2 border-amber-400 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 max-w-[9rem]"
          data-testid="button-branch-switcher-compact" aria-label="تبديل الفرع">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{currentName}</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
        {list}
      </div>
    );
  }

  return (
    <div className="relative" data-testid="branch-switcher">
      <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-2.5">
        <div className="flex items-center gap-2 text-amber-900">
          <Building2 className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] leading-tight">تعمل الآن في</div>
            <div className="text-base font-bold leading-tight truncate" data-testid="text-active-branch">{currentName}</div>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2"
          data-testid="button-branch-switcher">
          <ArrowLeftRight className="h-4 w-4" />
          تبديل الفرع
        </button>
        <p className="mt-1.5 text-[11px] leading-snug text-amber-800">
          {isAdmin
            ? "لمريضٍ له أكثر من فرع اختر فرعه هنا قبل الحفظ."
            : "ترى وتعمل على مرضى هذا الفرع فقط — ولمريضٍ من فرعٍ آخر بدّل الفرع."}
        </p>
      </div>
      {list}
    </div>
  );
}
