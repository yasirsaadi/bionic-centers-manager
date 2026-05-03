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

type Branch = { id: number; name: string };
type MonthlyDevice = {
  deviceId: number;
  deviceCode: string;
  deviceNameAr: string;
  deviceNameEn: string;
  target: number;
  actual: number;
};
type MonthlyResponse = { branchId: number; year: number; month: number; devices: MonthlyDevice[] };

const MONTHS_AR = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SessionTargets() {
  const { t } = useTranslation();
  const lang = t.dir === "rtl" ? "ar" : "en";
  const session = useBranchSession();
  const isAdmin = Boolean(session?.isAdmin);

  const today = new Date();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [draft, setDraft] = useState<Record<number, number>>({});

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/session-tracking/branches"],
  });

  useEffect(() => {
    if (branchId !== null) return;
    if (session?.branchId && branches.some((b) => b.id === session.branchId)) {
      setBranchId(session.branchId);
    } else if (branches[0]) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId, session?.branchId]);

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

  useEffect(() => {
    if (!monthlyQ.data) return;
    const next: Record<number, number> = {};
    for (const d of monthlyQ.data.devices) next[d.deviceId] = d.target;
    setDraft(next);
  }, [monthlyQ.data]);

  const qc = useQueryClient();
  const { toast } = useToast();

  const saveMut = useMutation({
    mutationFn: async () => {
      const targets = (monthlyQ.data?.devices ?? []).map((d) => ({
        deviceId: d.deviceId,
        targetCount: draft[d.deviceId] ?? 0,
      }));
      const res = await apiRequest("POST", "/api/session-tracking/targets/upsert", {
        branchId, year, month, targets,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: lang === "ar" ? "تم الحفظ" : "Saved",
        description: lang === "ar" ? "تم حفظ الأهداف الشهرية" : "Monthly targets saved",
      });
      qc.invalidateQueries({ queryKey: ["/api/session-tracking/monthly"] });
    },
    onError: (err: Error) => {
      toast({ title: lang === "ar" ? "تعذّر الحفظ" : "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const copyMut = useMutation({
    mutationFn: async () => {
      const fromMonth = month === 1 ? 12 : month - 1;
      const fromYear = month === 1 ? year - 1 : year;
      const res = await apiRequest("POST", "/api/session-tracking/targets/copy", {
        branchId, fromYear, fromMonth, toYear: year, toMonth: month,
      });
      return res.json();
    },
    onSuccess: (data: { copied: number }) => {
      toast({
        title: lang === "ar" ? "تم النسخ" : "Copied",
        description: lang === "ar" ? `تم نسخ ${data.copied} هدف` : `Copied ${data.copied} targets`,
      });
      qc.invalidateQueries({ queryKey: ["/api/session-tracking/monthly"] });
    },
    onError: (err: Error) => {
      toast({ title: lang === "ar" ? "تعذّر النسخ" : "Copy failed", description: err.message, variant: "destructive" });
    },
  });

  const months = lang === "ar" ? MONTHS_AR : MONTHS_EN;
  const years = useMemo(() => {
    const cur = today.getFullYear();
    return [cur - 1, cur, cur + 1];
  }, [today]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {lang === "ar" ? "الأهداف الشهرية للجلسات" : "Monthly Session Targets"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {lang === "ar"
            ? "حدّد عدد الجلسات المستهدف لكلّ جهاز خلال الشهر، ويمكنك نسخ أهداف الشهر السابق."
            : "Set the target session count per device for the month. You can copy from the previous month."}
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>{lang === "ar" ? "الفرع" : "Branch"}</Label>
            <Select
              value={branchId ? String(branchId) : ""}
              onValueChange={(v) => setBranchId(Number(v))}
              disabled={!isAdmin && !(session.accessibleBranches && session.accessibleBranches.length > 1)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{lang === "ar" ? "السنة" : "Year"}</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{lang === "ar" ? "الشهر" : "Month"}</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => copyMut.mutate()}
              disabled={copyMut.isPending || branchId === null}
            >
              {lang === "ar" ? "نسخ من الشهر السابق" : "Copy previous month"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        {monthlyQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2">
              <div className="col-span-5">{lang === "ar" ? "الجهاز" : "Device"}</div>
              <div className="col-span-3 text-end">{lang === "ar" ? "الفعلي" : "Actual"}</div>
              <div className="col-span-4 text-end">{lang === "ar" ? "الهدف" : "Target"}</div>
            </div>
            {(monthlyQ.data?.devices ?? []).map((d) => (
              <div key={d.deviceId} className="grid grid-cols-12 gap-2 items-center px-2 py-1 border-b">
                <div className="col-span-5">{lang === "ar" ? d.deviceNameAr : d.deviceNameEn}</div>
                <div className="col-span-3 text-end tabular-nums">{d.actual}</div>
                <div className="col-span-4">
                  <Input
                    type="number"
                    min={0}
                    value={draft[d.deviceId] ?? 0}
                    onChange={(e) =>
                      setDraft({ ...draft, [d.deviceId]: Math.max(0, Number(e.target.value || 0)) })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || branchId === null}>
            {saveMut.isPending
              ? lang === "ar" ? "جاري الحفظ..." : "Saving..."
              : lang === "ar" ? "حفظ الأهداف" : "Save targets"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
