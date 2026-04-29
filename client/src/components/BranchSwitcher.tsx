// Header dropdown that lets a multi-branch user (typically a
// branch_manager assigned to several branches) switch the active
// branch without logging out and back in.
//
// Hidden when the user has only one accessible branch — the picker
// would just show one option, which is noise. Admins also see
// nothing here: they're already cross-branch by default.

import { useState, useEffect } from "react";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Branch } from "@shared/schema";

export function BranchSwitcher() {
  const session = useBranchSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // The list of branches the user can switch between. We fetch the
  // full branches list once and filter to accessibleBranches so the
  // labels look right.
  useEffect(() => {
    if (!session?.accessibleBranches || session.accessibleBranches.length < 2) return;
    fetch("/api/branches", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((all: Branch[]) => setBranches(all))
      .catch(() => setBranches([]));
  }, [session?.accessibleBranches]);

  const accessible = session?.accessibleBranches ?? [];
  // Hide the switcher when there's nothing meaningful to switch.
  if (!session || session.isAdmin || accessible.length < 2) return null;

  const accessibleBranchObjs = branches.filter((b) => accessible.includes(b.id));

  const switchTo = async (branchId: number) => {
    if (branchId === session.branchId) {
      setOpen(false);
      return;
    }
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
      // Persist the new active branch in localStorage so subsequent
      // page loads pick up the switch.
      const updated = { ...session, branchId: data.branchId, branchName: data.branchName };
      localStorage.setItem("branch_session", JSON.stringify(updated));
      // Invalidate every cached query so all dashboards/reports
      // refetch with the new branch context. Then reload to wipe
      // any hook state derived from the old branch.
      queryClient.clear();
      toast({ title: `تمّ التبديل إلى فرع ${data.branchName}` });
      setOpen(false);
      // A full reload keeps things straightforward — every page
      // remounts with the new session, no stale state anywhere.
      window.location.reload();
    } catch (err: any) {
      toast({
        title: "تعذّر تبديل الفرع",
        description: err?.message ?? "حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        data-testid="button-branch-switcher"
      >
        <Building2 className="h-4 w-4 text-primary" />
        <span className="font-medium">{session.branchName}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-40 w-56 rounded-md border bg-white shadow-lg overflow-hidden">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30">
              التبديل بين فروعك
            </div>
            {accessibleBranchObjs.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">
                جارٍ جلب القائمة…
              </div>
            ) : (
              accessibleBranchObjs.map((branch) => {
                const isCurrent = branch.id === session.branchId;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => switchTo(branch.id)}
                    disabled={busyId !== null}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-2 ${
                      isCurrent ? "bg-primary/5 font-semibold" : ""
                    }`}
                    data-testid={`button-switch-to-${branch.id}`}
                  >
                    <span>{branch.name}</span>
                    {busyId === branch.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isCurrent ? (
                      <span className="text-xs text-primary">الحالي</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
