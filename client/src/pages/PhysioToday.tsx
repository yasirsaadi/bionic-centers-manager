// **جلساتُ اليوم** (§4.cn — المرحلةُ الرابعة): الخططُ المعتمَدة في فرع المعالج، المسنَدةُ إليه أوّلاً — وأيُّ منفّذٍ من القسم في الفرع
// يستطيع التنفيذ (قرارُ المالك: المسنَدُ افتراضيٌّ لا حصر). «تنفيذ» تفتح «إنهاء الجلسة»، و«سُجّلت اليوم» تمنع التكرارَ سهواً لا قسراً.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { ExecuteSessionDialog } from "@/components/physio/ExecuteSession";

interface TodayRow {
  planId: number; titleAr: string; branchId: number; branchName: string | null; patientId: number; patientName: string; patientCode: string | null;
  assignedToMe: boolean; assignees: string[]; doneToday: boolean; lastSession: string | null; sessionCount: number;
}

export default function PhysioToday() {
  const q = useQuery<{ today: string; plans: TodayRow[] }>({
    queryKey: ["/api/physio/today"],
    queryFn: async () => (await apiRequest("GET", "/api/physio/today")).json(),
  });
  const [search, setSearch] = useState("");
  const [executing, setExecuting] = useState<number | null>(null);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = q.data?.plans ?? [];
    return s ? all.filter((r) => r.patientName.toLowerCase().includes(s) || (r.patientCode ?? "").toLowerCase().includes(s)) : all;
  }, [q.data, search]);
  const mine = rows.filter((r) => r.assignedToMe);
  const others = rows.filter((r) => !r.assignedToMe);
  const Row = ({ r }: { r: TodayRow }) => (
    <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5" data-testid={`today-row-${r.planId}`}>
      <Link href={`/physio/plans/${r.planId}`} className="flex-1 min-w-0 hover:underline">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{r.patientName}{r.patientCode ? ` (${r.patientCode})` : ""}</span>
          <span className="text-sm text-muted-foreground truncate">— {r.titleAr}</span>
          {r.doneToday && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300" data-testid={`today-done-${r.planId}`}>سُجّلت اليوم</Badge>}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {r.branchName ?? "—"} · {r.sessionCount} جلسة{r.lastSession ? ` · آخرها ${r.lastSession}` : ""}
          {r.assignees.length ? ` · المنفّذون: ${r.assignees.join("، ")}` : " · لم تُسنَد"}
        </div>
      </Link>
      <Button size="sm" variant={r.doneToday ? "outline" : "default"} className="gap-1 shrink-0" onClick={() => setExecuting(r.planId)} data-testid={`button-today-execute-${r.planId}`}>
        <Play className="w-4 h-4" /> تنفيذ
      </Button>
    </div>
  );
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-3" dir="rtl">
      <h1 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-green-700" /> جلسات اليوم</h1>
      <p className="text-xs text-muted-foreground">الخططُ المعتمَدة في فرعك. «إنهاء الجلسة» يكتب زيارةَ الجلسة في ملفّ المريض — فلا تُسجَّل زيارتُها ثانيةً من «سبب الحضور».</p>
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute top-2.5 right-2.5 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المريض أو رمزه" className="pr-8 bg-white" data-testid="input-today-search" />
      </div>
      {q.isLoading ? <Card className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</Card>
        : q.isError ? <Card className="p-4 text-sm text-red-700">تعذّر التحميل.</Card>
        : rows.length === 0 ? <Card className="p-4 text-sm text-muted-foreground" data-testid="today-empty">لا خطةَ معتمَدة في فرعك.</Card>
        : (
          <div className="space-y-4">
            {mine.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold">المسندة إليّ ({mine.length})</h2>
                {mine.map((r) => <Row key={r.planId} r={r} />)}
              </div>
            )}
            {others.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold">بقيّة خطط الفرع ({others.length})</h2>
                {others.map((r) => <Row key={r.planId} r={r} />)}
              </div>
            )}
          </div>
        )}
      <ExecuteSessionDialog planId={executing} onClose={() => setExecuting(null)} />
    </div>
  );
}
