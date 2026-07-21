import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBranchSession } from "@/components/BranchGate";
import { useTranslation } from "@/i18n/LanguageContext";
import { getTodayIraq } from "@/lib/utils";

type Branch = { id: number; name: string };
type Device = { id: number; nameAr: string; nameEn: string; displayOrder: number };
type Session = { id: number; branchId: number; sessionDate: string; shift: "morning" | "evening" };
type Count = { dailySessionId: number; deviceId: number; count: number };
type ListResponse = { sessions: Session[]; counts: Count[]; devices: Device[] };

function firstOfMonth(today: string): string {
  return today.slice(0, 7) + "-01";
}

export default function SessionsList() {
  const { t } = useTranslation();
  const lang = t.dir === "rtl" ? "ar" : "en";
  const session = useBranchSession();
  const isAdmin = Boolean(session?.isAdmin);

  const today = getTodayIraq();
  const [branchId, setBranchId] = useState<number | "all">("all");
  const [from, setFrom] = useState<string>(firstOfMonth(today));
  const [to, setTo] = useState<string>(today);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/session-tracking/branches"],
  });

  useEffect(() => {
    if (branchId !== "all") return;
    if (!isAdmin && session?.branchId) setBranchId(session.branchId);
  }, [isAdmin, session?.branchId, branchId]);

  const listQ = useQuery<ListResponse>({
    queryKey: ["/api/session-tracking/list", branchId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (branchId !== "all") params.set("branchId", String(branchId));
      const res = await fetch(`/api/session-tracking/list?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
  });

  const branchName = useMemo(() => {
    const m = new Map(branches.map((b) => [b.id, b.name]));
    return (id: number) => m.get(id) ?? `#${id}`;
  }, [branches]);

  const pivot = useMemo(() => {
    const data = listQ.data;
    if (!data) return null;
    const countByPair = new Map<string, number>();
    for (const c of data.counts) {
      countByPair.set(`${c.dailySessionId}:${c.deviceId}`, c.count);
    }
    const rows = data.sessions.map((s) => {
      const cells = data.devices.map((d) => countByPair.get(`${s.id}:${d.id}`) ?? 0);
      const total = cells.reduce((a, b) => a + b, 0);
      return { session: s, cells, total };
    });
    const colTotals = data.devices.map((_, i) =>
      rows.reduce((sum, r) => sum + (r.cells[i] ?? 0), 0),
    );
    const grandTotal = colTotals.reduce((a, b) => a + b, 0);
    return { rows, colTotals, grandTotal, devices: data.devices };
  }, [listQ.data]);

  function buildExportRows(): { headers: string[]; rows: (string | number)[][]; totals: (string | number)[] } | null {
    if (!pivot) return null;
    const headers = [
      lang === "ar" ? "التاريخ" : "Date",
      lang === "ar" ? "الفرع" : "Branch",
      lang === "ar" ? "الوردية" : "Shift",
      ...pivot.devices.map((d) => (lang === "ar" ? d.nameAr : d.nameEn)),
      lang === "ar" ? "المجموع" : "Total",
    ];
    const rows = pivot.rows.map((r) => [
      r.session.sessionDate,
      branchName(r.session.branchId),
      r.session.shift === "morning"
        ? (lang === "ar" ? "صباحية" : "Morning")
        : (lang === "ar" ? "مسائية" : "Evening"),
      ...r.cells,
      r.total,
    ]);
    const totals = [lang === "ar" ? "المجموع" : "Total", "", "", ...pivot.colTotals, pivot.grandTotal];
    return { headers, rows, totals };
  }

  function exportCsv(): void {
    const data = buildExportRows();
    if (!data) return;
    const lines = [data.headers.map(escapeCsv).join(",")];
    for (const r of data.rows) lines.push(r.map((c) => escapeCsv(String(c))).join(","));
    lines.push(data.totals.map((c) => escapeCsv(String(c))).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sessions-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportExcel(): Promise<void> {
    const data = buildExportRows();
    if (!data) return;
    // xlsx is ~200KB gzipped — load it only when the user actually exports.
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows, data.totals]);
    // Set RTL on the sheet so Arabic flows correctly when opened in Excel
    sheet["!view"] = [{ RTL: lang === "ar" }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, lang === "ar" ? "الجلسات" : "Sessions");
    XLSX.writeFile(wb, `sessions-${from}-to-${to}.xlsx`);
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">
            {lang === "ar" ? "تقرير الجلسات" : "Sessions Report"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "اعرض الجلسات اليومية مفصّلة حسب الجهاز ضمن نطاق زمني."
              : "Browse daily sessions broken down per device for a date range."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!pivot || pivot.rows.length === 0}>
            {lang === "ar" ? "تصدير CSV" : "Export CSV"}
          </Button>
          <Button onClick={exportExcel} disabled={!pivot || pivot.rows.length === 0}>
            {lang === "ar" ? "تصدير Excel" : "Export Excel"}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>{lang === "ar" ? "الفرع" : "Branch"}</Label>
            <Select
              value={String(branchId)}
              onValueChange={(v) => setBranchId(v === "all" ? "all" : Number(v))}
              disabled={!isAdmin}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="all">{lang === "ar" ? "كلّ الفروع" : "All branches"}</SelectItem>}
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{lang === "ar" ? "من" : "From"}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>{lang === "ar" ? "إلى" : "To"}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-4 overflow-x-auto">
        {listQ.isLoading ? (
          <Skeleton className="h-64" />
        ) : !pivot || pivot.rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {lang === "ar" ? "لا توجد جلسات في هذه الفترة" : "No sessions in this range"}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-start whitespace-nowrap">{lang === "ar" ? "التاريخ" : "Date"}</th>
                <th className="p-2 text-start whitespace-nowrap">{lang === "ar" ? "الفرع" : "Branch"}</th>
                <th className="p-2 text-start whitespace-nowrap">{lang === "ar" ? "الوردية" : "Shift"}</th>
                {pivot.devices.map((d) => (
                  <th key={d.id} className="p-2 text-end whitespace-nowrap">
                    {lang === "ar" ? d.nameAr : d.nameEn}
                  </th>
                ))}
                <th className="p-2 text-end whitespace-nowrap font-bold">
                  {lang === "ar" ? "المجموع" : "Total"}
                </th>
              </tr>
            </thead>
            <tbody>
              {pivot.rows.map((r) => (
                <tr key={r.session.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 whitespace-nowrap">{r.session.sessionDate}</td>
                  <td className="p-2 whitespace-nowrap">{branchName(r.session.branchId)}</td>
                  <td className="p-2 whitespace-nowrap">
                    {r.session.shift === "morning"
                      ? (lang === "ar" ? "صباحية" : "Morning")
                      : (lang === "ar" ? "مسائية" : "Evening")}
                  </td>
                  {r.cells.map((c, i) => (
                    <td key={i} className="p-2 text-end tabular-nums">{c}</td>
                  ))}
                  <td className="p-2 text-end tabular-nums font-bold">{r.total}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className="p-2" colSpan={3}>{lang === "ar" ? "المجموع" : "Total"}</td>
                {pivot.colTotals.map((t, i) => (
                  <td key={i} className="p-2 text-end tabular-nums">{t}</td>
                ))}
                <td className="p-2 text-end tabular-nums">{pivot.grandTotal}</td>
              </tr>
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function escapeCsv(s: string): string {
  if (/[,"\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
