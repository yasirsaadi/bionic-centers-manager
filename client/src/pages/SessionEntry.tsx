import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import { useTranslation } from "@/i18n/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { getTodayIraq } from "@/lib/utils";

type Branch = { id: number; name: string };
type Device = { id: number; code: string; nameAr: string; nameEn: string; displayOrder: number };
type Shift = "morning" | "evening";

type DailyResponse = {
  session: { id: number; branchId: number; sessionDate: string; shift: Shift } | null;
  counts: { deviceId: number; count: number }[];
};

type MonthlyDevice = {
  deviceId: number;
  deviceCode: string;
  deviceNameAr: string;
  deviceNameEn: string;
  target: number;
  actual: number;
};
type MonthlyResponse = { branchId: number; year: number; month: number; devices: MonthlyDevice[] };

function progressColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-rose-500";
}

export default function SessionEntry() {
  const { t } = useTranslation();
  const lang = t.dir === "rtl" ? "ar" : "en";
  const session = useBranchSession();
  const isReception = session?.role === "reception";
  const isAdmin = Boolean(session?.isAdmin);
  const today = getTodayIraq();

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/session-tracking/branches"],
  });
  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["/api/session-tracking/devices"],
  });

  const [branchId, setBranchId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(today);
  const [shift, setShift] = useState<Shift>("morning");
  const [counts, setCounts] = useState<Record<number, number>>({});

  // Pick a sensible default branch once the list loads.
  useEffect(() => {
    if (branchId !== null) return;
    if (session?.branchId && branches.some((b) => b.id === session.branchId)) {
      setBranchId(session.branchId);
    } else if (branches[0]) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId, session?.branchId]);

  // Reception is locked to today.
  useEffect(() => {
    if (isReception && date !== today) setDate(today);
  }, [isReception, date, today]);

  const dailyQ = useQuery<DailyResponse>({
    queryKey: ["/api/session-tracking/daily", branchId ?? "", date, shift],
    queryFn: async () => {
      const res = await fetch(
        `/api/session-tracking/daily?branchId=${branchId}&date=${date}&shift=${shift}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    enabled: branchId !== null,
  });

  // Reset the input grid whenever the loaded session changes.
  useEffect(() => {
    if (!dailyQ.data) return;
    const next: Record<number, number> = {};
    for (const c of dailyQ.data.counts) next[c.deviceId] = c.count;
    setCounts(next);
  }, [dailyQ.data]);

  const month = Number(date.slice(5, 7));
  const year = Number(date.slice(0, 4));
  const monthlyQ = useQuery<MonthlyResponse>({
    queryKey: ["/api/session-tracking/monthly", branchId ?? "", year, month],
    queryFn: async () => {
      const res = await fetch(
        `/api/session-tracking/monthly?branchId=${branchId}&year=${year}&month=${month}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    enabled: branchId !== null,
  });

  const monthlyByDevice = useMemo(() => {
    const m = new Map<number, MonthlyDevice>();
    for (const d of monthlyQ.data?.devices ?? []) m.set(d.deviceId, d);
    return m;
  }, [monthlyQ.data]);

  const qc = useQueryClient();
  const { toast } = useToast();

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        branchId,
        sessionDate: date,
        shift,
        counts: devices.map((d) => ({ deviceId: d.id, count: counts[d.id] ?? 0 })),
      };
      const res = await apiRequest("POST", "/api/session-tracking/daily/upsert", body);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: lang === "ar" ? "تم الحفظ" : "Saved",
        description: lang === "ar" ? "تم حفظ جلسة اليوم بنجاح" : "Daily session saved",
      });
      qc.invalidateQueries({ queryKey: ["/api/session-tracking/daily"] });
      qc.invalidateQueries({ queryKey: ["/api/session-tracking/monthly"] });
    },
    onError: (err: Error) => {
      toast({
        title: lang === "ar" ? "تعذّر الحفظ" : "Save failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {lang === "ar" ? "إدخال الجلسات اليومية" : "Daily Session Entry"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {lang === "ar"
            ? "سجّل عدد جلسات كلّ جهاز للوردية المحدّدة، ولاحظ التقدّم الشهري لكلّ جهاز."
            : "Enter device session counts for the selected shift and watch monthly progress."}
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>{lang === "ar" ? "الفرع" : "Branch"}</Label>
            <Select
              value={branchId ? String(branchId) : ""}
              onValueChange={(v) => setBranchId(Number(v))}
              disabled={!isAdmin && !(session.accessibleBranches && session.accessibleBranches.length > 1)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{lang === "ar" ? "التاريخ" : "Date"}</Label>
            <Input
              type="date"
              value={date}
              min={isReception ? today : undefined}
              max={isReception ? today : undefined}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label>{lang === "ar" ? "الوردية" : "Shift"}</Label>
            <Select value={shift} onValueChange={(v) => setShift(v as Shift)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">{lang === "ar" ? "صباحية" : "Morning"}</SelectItem>
                <SelectItem value="evening">{lang === "ar" ? "مسائية" : "Evening"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        {dailyQ.isLoading || monthlyQ.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {devices.map((d) => {
              const monthly = monthlyByDevice.get(d.id);
              const target = monthly?.target ?? 0;
              const actual = monthly?.actual ?? 0;
              const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
              const visualPct = Math.min(pct, 100);
              return (
                <div key={d.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{lang === "ar" ? d.nameAr : d.nameEn}</div>
                    <div className="text-xs text-muted-foreground">
                      {actual} / {target || "—"} {target > 0 ? `(${pct}%)` : ""}
                    </div>
                  </div>
                  {target > 0 && (
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${progressColor(pct)}`}
                        style={{ width: `${visualPct}%` }}
                      />
                    </div>
                  )}
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={counts[d.id] ?? 0}
                    onChange={(e) =>
                      setCounts({ ...counts, [d.id]: Math.max(0, Number(e.target.value || 0)) })
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || branchId === null}
          >
            {saveMut.isPending
              ? lang === "ar" ? "جاري الحفظ..." : "Saving..."
              : lang === "ar" ? "حفظ" : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
