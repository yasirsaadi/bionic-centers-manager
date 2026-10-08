// **نتائجُ العلاج الطبيعي** (§4.cp — المرحلةُ ٦ب، القرار ٥): نسبةُ مَن تحسّن من المرضى (أوّلُ تقييمٍ وآخرُه)، والتخرّجُ والإيقاف، والالتزامُ بعدد الجلسات،
// والمتأخّرون عن التقييم — حسب البروتوكول والفرع والأخصائيّ والمعالج. النطاقُ من الخادم: المسؤولُ والمشرفُ كلُّ الفروع، والمديرُ فرعُه، والأخصائيُّ خططُه.
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { baghdadTodayYmd } from "@shared/visit_date";
import type { OutcomeGroup } from "@shared/physio_assessments";

interface Report {
  scope: "all" | "branches" | "own"; period: { from: string; to: string }; totals: OutcomeGroup;
  byProtocol: OutcomeGroup[]; byBranch: OutcomeGroup[]; bySpecialist: OutcomeGroup[]; byExecutor: OutcomeGroup[];
  overdue: { planId: number; titleAr: string; patientName: string; patientCode: string | null; branchName: string; specialistName: string }[];
  branches: { id: number; name: string }[];
}

const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
const SCOPE_LABEL = { all: "كلُّ الفروع", branches: "فرعك", own: "خططُك" } as const;

function Tile({ label, value, hint, testid }: { label: string; value: string | number; hint?: string; testid?: string }) {
  return (
    <Card className="p-3" data-testid={testid}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

function GroupTable({ rows, first }: { rows: OutcomeGroup[]; first: string }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground p-3">لا خططَ في هذه الفترة.</p>;
  return (
    <div className="overflow-x-auto rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead><tr className="text-muted-foreground text-xs border-b bg-slate-50">
          <th className="text-start p-2">{first}</th><th className="text-start p-2">الخطط</th><th className="text-start p-2">قورنت</th>
          <th className="text-start p-2">تحسّن</th><th className="text-start p-2">ساء</th><th className="text-start p-2">تخرّج</th>
          <th className="text-start p-2">أُوقفت</th><th className="text-start p-2">الالتزام بالجلسات</th><th className="text-start p-2">متأخّرو التقييم</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b last:border-0" data-testid={`outcome-row-${r.key}`}>
              <td className="p-2 font-medium">{r.name}</td><td className="p-2">{r.plans}</td><td className="p-2">{r.compared}</td>
              <td className="p-2"><b>{pct(r.improvedPct)}</b>{r.compared ? <span className="text-xs text-muted-foreground"> ({r.improved})</span> : null}</td>
              <td className="p-2">{r.worse || "—"}</td><td className="p-2">{r.graduated || "—"}</td><td className="p-2">{r.stopped || "—"}</td>
              <td className="p-2">{pct(r.adherence)}</td><td className={`p-2 ${r.overdue ? "text-red-700 font-medium" : ""}`}>{r.overdue || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PhysioOutcomes() {
  const today = baghdadTodayYmd();
  const [from, setFrom] = useState(new Date(Date.parse(`${today}T00:00:00Z`) - 180 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(today);
  const [branchId, setBranchId] = useState("");
  const url = `/api/physio/outcomes?from=${from}&to=${to}${branchId ? `&branchId=${branchId}` : ""}`;
  const q = useQuery<Report>({ queryKey: ["/api/physio/outcomes", from, to, branchId], queryFn: async () => (await apiRequest("GET", url)).json() });
  const r = q.data;
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4" dir="rtl">
      <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-700" /> نتائج العلاج الطبيعي</h1>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">من (يومُ اعتماد الخطّة)<Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="mt-1 bg-white w-40" data-testid="outcomes-from" /></label>
        <label className="text-xs">إلى<Input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} className="mt-1 bg-white w-40" data-testid="outcomes-to" /></label>
        {r?.scope === "all" && (
          <label className="text-xs">الفرع
            <select className="mt-1 h-9 rounded-md border bg-white px-2 text-sm block" value={branchId} onChange={(e) => setBranchId(e.target.value)} data-testid="outcomes-branch">
              <option value="">كلُّ الفروع</option>
              {r.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
        {r && <span className="text-xs text-muted-foreground pb-2">النطاق: {SCOPE_LABEL[r.scope]}</span>}
      </div>
      {q.isLoading || !r ? <Card className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</Card> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Tile label="الخطط" value={r.totals.plans} hint={`نشطة ${r.totals.active}`} testid="tile-plans" />
            <Tile label="تحسّن" value={pct(r.totals.improvedPct)} hint={`${r.totals.improved} من ${r.totals.compared} قورنت`} testid="tile-improved" />
            <Tile label="تخرّج · أُوقفت" value={`${r.totals.graduated} · ${r.totals.stopped}`} testid="tile-closed" />
            <Tile label="الالتزام بالجلسات" value={pct(r.totals.adherence)} hint={`متأخّرو التقييم ${r.totals.overdue}`} testid="tile-adherence" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            «قورنت» = لها تقييمان على الأقلّ. «تحسّن» = ما تحسّن من مقاييسها (والألمِ والأهداف) بين أوّل تقييمٍ وآخره أكثرُ ممّا ساء، باتجاه كلّ مقياس.
            «الالتزام» = الجلساتُ المنفّذة من المتوقَّع حتى اليوم بجرعة الخطّة. «متأخّر» = فات موعدُ تقييمه أكثرَ من أسبوع.
          </p>
          <Tabs defaultValue="protocol">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="protocol">حسب البروتوكول</TabsTrigger>
              {r.scope !== "own" && <TabsTrigger value="branch">حسب الفرع</TabsTrigger>}
              {r.scope !== "own" && <TabsTrigger value="specialist">حسب الأخصائيّ</TabsTrigger>}
              <TabsTrigger value="executor">حسب المعالج</TabsTrigger>
              <TabsTrigger value="overdue">متأخّرو التقييم ({r.overdue.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="protocol"><GroupTable rows={r.byProtocol} first="البروتوكول" /></TabsContent>
            <TabsContent value="branch"><GroupTable rows={r.byBranch} first="الفرع" /></TabsContent>
            <TabsContent value="specialist"><GroupTable rows={r.bySpecialist} first="الأخصائيّ" /></TabsContent>
            <TabsContent value="executor"><GroupTable rows={r.byExecutor} first="المعالج (الأكثرُ جلسات)" /></TabsContent>
            <TabsContent value="overdue">
              {r.overdue.length === 0 ? <p className="text-sm text-muted-foreground p-3">لا متأخّر.</p> : (
                <div className="space-y-1">{r.overdue.map((o) => (
                  <Link key={o.planId} href={`/physio/plans/${o.planId}`} className="block rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50">
                    <b>{o.patientName}</b>{o.patientCode ? ` (${o.patientCode})` : ""} — {o.titleAr}
                    <span className="text-xs text-muted-foreground"> · {o.branchName} · {o.specialistName}</span>
                  </Link>
                ))}</div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
