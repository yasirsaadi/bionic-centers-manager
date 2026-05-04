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
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

type Branch = { id: number; name: string };
type ByDevice = {
  deviceId: number;
  deviceCode: string;
  nameAr: string;
  nameEn: string;
  total: number;
};
type ByDay = { date: string; total: number };
type ByShift = { morning: number; evening: number };
type ByBranch = { branchId: number; name: string; total: number };
type AnalyticsResponse = {
  byDevice: ByDevice[];
  byDay: ByDay[];
  byShift: ByShift;
  byBranch: ByBranch[];
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

function firstOfMonth(today: string): string {
  return today.slice(0, 7) + "-01";
}

export default function SessionAnalytics() {
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

  const analyticsQ = useQuery<AnalyticsResponse>({
    queryKey: ["/api/session-tracking/analytics", branchId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ from, to });
      if (branchId !== "all") params.set("branchId", String(branchId));
      const res = await fetch(`/api/session-tracking/analytics?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
  });

  const grandTotal = useMemo(() => {
    if (!analyticsQ.data) return 0;
    return analyticsQ.data.byDevice.reduce((sum, d) => sum + d.total, 0);
  }, [analyticsQ.data]);

  const topDevice = useMemo(() => {
    if (!analyticsQ.data || analyticsQ.data.byDevice.length === 0) return null;
    return [...analyticsQ.data.byDevice].sort((a, b) => b.total - a.total)[0];
  }, [analyticsQ.data]);

  const peakDay = useMemo(() => {
    if (!analyticsQ.data || analyticsQ.data.byDay.length === 0) return null;
    return [...analyticsQ.data.byDay].sort((a, b) => b.total - a.total)[0];
  }, [analyticsQ.data]);

  const dayCount = analyticsQ.data?.byDay.length ?? 0;
  const dailyAvg = dayCount > 0 ? Math.round(grandTotal / dayCount) : 0;

  const shiftPie = useMemo(() => {
    if (!analyticsQ.data) return [];
    return [
      { name: lang === "ar" ? "صباحية" : "Morning", value: analyticsQ.data.byShift.morning },
      { name: lang === "ar" ? "مسائية" : "Evening", value: analyticsQ.data.byShift.evening },
    ];
  }, [analyticsQ.data, lang]);

  const deviceData = useMemo(() => {
    if (!analyticsQ.data) return [];
    return analyticsQ.data.byDevice.map((d) => ({
      name: lang === "ar" ? d.nameAr : d.nameEn,
      total: d.total,
    }));
  }, [analyticsQ.data, lang]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {lang === "ar" ? "تحليلات الجلسات" : "Session Analytics"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {lang === "ar"
            ? "نظرة معمّقة على أداء الأجهزة، الورديات، والأيام، مع مقارنة بين الفروع للمسؤول."
            : "Deep dive into device, shift, and day performance, with cross-branch comparison for admin."}
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>{lang === "ar" ? "الفرع" : "Branch"}</Label>
            <Select
              value={String(branchId)}
              onValueChange={(v) => setBranchId(v === "all" ? "all" : Number(v))}
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

      {analyticsQ.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">
                {lang === "ar" ? "إجمالي الجلسات" : "Total sessions"}
              </div>
              <div className="text-2xl font-bold mt-1">{grandTotal.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">
                {lang === "ar" ? "متوسّط يومي" : "Daily average"}
              </div>
              <div className="text-2xl font-bold mt-1">{dailyAvg.toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">
                {lang === "ar" ? "أكثر جهاز استخداماً" : "Top device"}
              </div>
              <div className="text-base font-bold mt-1 truncate">
                {topDevice ? (lang === "ar" ? topDevice.nameAr : topDevice.nameEn) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">
                {topDevice ? `${topDevice.total.toLocaleString()} ${lang === "ar" ? "جلسة" : "sessions"}` : ""}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">
                {lang === "ar" ? "اليوم الأعلى" : "Peak day"}
              </div>
              <div className="text-base font-bold mt-1">{peakDay?.date ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {peakDay ? `${peakDay.total.toLocaleString()} ${lang === "ar" ? "جلسة" : "sessions"}` : ""}
              </div>
            </Card>
          </div>

          {/* Devices bar chart */}
          <Card className="p-4">
            <h3 className="font-bold mb-3">
              {lang === "ar" ? "الجلسات لكلّ جهاز" : "Sessions per device"}
            </h3>
            {deviceData.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {lang === "ar" ? "لا بيانات في هذه الفترة" : "No data for this range"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={deviceData} margin={{ top: 10, right: 20, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily trend */}
            <Card className="p-4">
              <h3 className="font-bold mb-3">
                {lang === "ar" ? "الجلسات اليوميّة" : "Daily sessions"}
              </h3>
              {(analyticsQ.data?.byDay.length ?? 0) === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  {lang === "ar" ? "لا بيانات" : "No data"}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsQ.data?.byDay ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Shift breakdown */}
            <Card className="p-4">
              <h3 className="font-bold mb-3">
                {lang === "ar" ? "توزّع الورديات" : "Shift breakdown"}
              </h3>
              {grandTotal === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  {lang === "ar" ? "لا بيانات" : "No data"}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={shiftPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {shiftPie.map((_entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Branch comparison (admin only) */}
          {isAdmin && (analyticsQ.data?.byBranch.length ?? 0) > 0 && (
            <Card className="p-4">
              <h3 className="font-bold mb-3">
                {lang === "ar" ? "مقارنة الفروع" : "Branch comparison"}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsQ.data?.byBranch ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
