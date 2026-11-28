// **جلساتُ اليوم** (§4.cn — المرحلةُ الرابعة): الخططُ المعتمَدة في فرع المعالج، المسنَدةُ إليه أوّلاً — وأيُّ منفّذٍ من القسم في الفرع
// يستطيع تنفيذ الخطّة اليدوية (قرارُ المالك: المسنَدُ افتراضيٌّ لا حصر). «تنفيذ» تفتح «إنهاء الجلسة»، و«سُجّلت اليوم» تمنع التكرارَ سهواً لا قسراً.
// **وخطّةُ Bionic AI** (§4.hc — قرارُ المالك ٧): كلُّ جزءٍ لمُسنَده أو بديله المعتمَد — رقائقُ الأجزاء بمَن يسجّلها وما سُجّل اليوم، و«إكمال الجلسة»
// حين سجّل زميلٌ جزءَه، و«خطط زملائك» للقراءة، و«بانتظار الإسناد» للمعتمِد، وطلباتُ البديل و«أنا غائب — اطلب بديلاً».
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarClock, ChevronDown, Play, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ExecuteSessionDialog } from "@/components/physio/ExecuteSession";
import { dayAr, SubstituteRequestDialog, SubstitutionItem, useAssignmentRefresh, type SubstitutionView } from "@/components/physio/OpusAssignment";
import { canApproveProtocols } from "@shared/physio_protocols";
import { PART_LABELS, type PlanPart } from "@shared/physio_plan_assignment";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { arText } from "@/lib/opus_agent";
import { AI_BRAND } from "@shared/ai_brand";

interface TodayPart { part: PlanPart; required: boolean; holderName: string | null; holderEligible: boolean; recordedToday: { byName: string | null; at: string | null } | null }
interface TodayRow {
  planId: number; titleAr: string; branchId: number; branchName: string | null; patientId: number; patientName: string; patientCode: string | null;
  assignedToMe: boolean; assignees: string[]; doneToday: boolean; lastSession: string | null; sessionCount: number;
  origin?: string | null; readOnly?: boolean;
  /** §4.hc — خطّةُ Bionic AI وحدها. */
  parts?: TodayPart[]; myParts?: PlanPart[]; awaitingAssignment?: boolean; awaitingMyPart?: boolean; openSessionId?: number | null; unseen?: boolean;
  substituteFor?: { part: PlanPart | null; assigneeName: string | null; dateTo: string }[];
}
interface TodayResponse { today: string; plans: TodayRow[]; awaitingAssignment?: number[]; mySubstitutions?: (SubstitutionView & { unseen?: boolean })[] }

export default function PhysioToday() {
  const q = useQuery<TodayResponse>({
    queryKey: ["/api/physio/today"],
    queryFn: async () => (await apiRequest("GET", "/api/physio/today")).json(),
  });
  const branchSession = useBranchSession();
  const permissions = usePermissions();
  const approver = canApproveProtocols(branchSession ? { ...branchSession, permissions } as any : null);
  const viewerId = branchSession?.userId ?? null;
  const [search, setSearch] = useState("");
  const [executing, setExecuting] = useState<number | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [othersOpen, setOthersOpen] = useState(false);
  const refresh = useAssignmentRefresh();
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = q.data?.plans ?? [];
    return s ? all.filter((r) => r.patientName.toLowerCase().includes(s) || (r.patientCode ?? "").toLowerCase().includes(s)) : all;
  }, [q.data, search]);
  const awaitingIds = new Set(q.data?.awaitingAssignment ?? []);
  const awaiting = rows.filter((r) => awaitingIds.has(r.planId));
  const mine = rows.filter((r) => r.assignedToMe);
  //  ما في «بانتظار الإسناد» (للمعتمِد) لا يتكرّر في «بقيّة خطط الفرع».
  const others = rows.filter((r) => !r.assignedToMe && !r.readOnly && !(approver && awaitingIds.has(r.planId)));
  const colleagues = rows.filter((r) => !r.assignedToMe && r.readOnly);
  const subs = q.data?.mySubstitutions ?? [];
  //  أُسند إليّ جزءٌ بصفتي مُسنَداً (لا بديلاً فقط) ⟵ «أنا غائب».
  const holdsSomething = (q.data?.plans ?? []).some((r) => r.origin === "opus" && r.assignedToMe && (r.substituteFor ?? []).length < (r.myParts ?? []).length);
  //  قرارٌ وصلني لم أره ⟵ يُعلَّم «رآه» مرّةً حين يظهر هنا.
  const unseenIds = subs.filter((s) => s.unseen).map((s) => s.id);
  const sentSeen = useRef<string>("");
  useEffect(() => {
    const key = unseenIds.join(",");
    if (!key || sentSeen.current === key) return;
    sentSeen.current = key;
    const t = setTimeout(() => { apiRequest("POST", "/api/physio/substitutes/seen", { ids: unseenIds }).catch(() => { sentSeen.current = ""; }); }, 4000);
    return () => clearTimeout(t);
  }, [unseenIds.join(",")]);

  const PartChips = ({ r }: { r: TodayRow }) => (
    <div className="flex flex-wrap gap-1 mt-1" data-testid={`today-parts-${r.planId}`}>
      {(r.parts ?? []).map((p) => (
        <span key={p.part} className={cn("rounded-full border px-2 py-0.5 text-[11px] max-w-full break-words",
          !p.holderEligible ? "bg-amber-50 border-amber-300 text-amber-900"
            : p.recordedToday ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : r.myParts?.includes(p.part) && !approver ? "bg-violet-50 border-violet-300 text-violet-900 font-semibold" : "bg-white border-slate-300 text-slate-700")}
          data-testid={`today-part-${r.planId}-${p.part}`}>
          {PART_LABELS[p.part]}: {!p.holderEligible ? "بانتظار الإسناد" : p.holderName ?? "—"}
          {p.recordedToday ? ` ✓${p.recordedToday.byName && p.recordedToday.byName !== p.holderName ? ` (${p.recordedToday.byName})` : ""}` : p.holderEligible ? " — لم يُسجَّل اليوم" : ""}
        </span>
      ))}
    </div>
  );
  const Row = ({ r }: { r: TodayRow }) => (
    <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5" data-testid={`today-row-${r.planId}`}>
      <Link href={`/physio/plans/${r.planId}`} className="flex-1 min-w-0 hover:underline">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{r.patientName}{r.patientCode ? ` (${r.patientCode})` : ""}</span>
          <span className="text-sm text-muted-foreground min-w-0 break-words">— {r.titleAr}</span>
          {r.doneToday && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300" data-testid={`today-done-${r.planId}`}>سُجّلت اليوم</Badge>}
          {r.unseen && <Badge className="bg-sky-600 hover:bg-sky-600" data-testid={`today-unseen-${r.planId}`}>جديد</Badge>}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {r.branchName ?? "—"} · {arText(r.sessionCount)} جلسة{r.lastSession ? ` · آخرها ${r.lastSession}` : ""}
          {r.origin !== "opus" && (r.assignees.length ? ` · المنفّذون: ${r.assignees.join("، ")}` : " · لم تُسنَد")}
        </div>
        {r.origin === "opus" && <PartChips r={r} />}
        {(r.substituteFor ?? []).map((x, i) => (
          <div key={i} className="text-[11px] text-violet-800 mt-0.5" data-testid={`today-substitute-for-${r.planId}`}>
            بديلٌ عن {x.assigneeName ?? "—"} في {x.part ? PART_LABELS[x.part] : "الأجزاء المُسنَدة كلِّها"} — حتى {dayAr(x.dateTo)}
          </div>
        ))}
      </Link>
      {!r.readOnly && (
        <Button size="sm" variant={r.awaitingMyPart ? "default" : r.doneToday ? "outline" : "default"}
          className={cn("gap-1 shrink-0", r.awaitingMyPart && "bg-sky-700 hover:bg-sky-800")} onClick={() => setExecuting(r.planId)}
          data-testid={`button-today-execute-${r.planId}`}>
          <Play className="w-4 h-4" /> {r.awaitingMyPart ? "إكمال الجلسة" : "تنفيذ"}
        </Button>
      )}
    </div>
  );
  return (
    <div className="max-w-4xl mx-auto space-y-3" dir="rtl">
      <h1 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-green-700" /> جلسات اليوم</h1>
      <p className="text-xs text-muted-foreground">الخططُ المعتمَدة في فرعك. «إنهاء الجلسة» يكتب زيارةَ الجلسة في ملفّ المريض — فلا تُسجَّل زيارتُها ثانيةً من «سبب الحضور».</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute top-2.5 right-2.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث باسم المريض أو رمزه" className="pr-8 bg-white" data-testid="input-today-search" />
        </div>
        {holdsSomething && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setSubOpen(true)} data-testid="button-today-absent">
            <CalendarClock className="w-4 h-4" /> أنا غائب — اطلب بديلاً
          </Button>
        )}
      </div>
      {subs.length > 0 && (
        <div className="space-y-1.5" data-testid="today-substitutions">
          <h2 className="text-sm font-bold">طلباتُ البديل</h2>
          {subs.map((s) => <SubstitutionItem key={s.id} s={s} viewerId={viewerId} approver={approver} testPrefix="today-sub" />)}
        </div>
      )}
      {approver && awaiting.length > 0 && (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 p-2" data-testid="today-awaiting-assignment">
          <h2 className="text-sm font-bold text-amber-950">بانتظار الإسناد ({arText(awaiting.length)})</h2>
          <p className="text-[11px] text-amber-900 m-0">لا ينفّذها أحدٌ قبل إسنادها إلّا المسؤولُ والمشرفُ العام.</p>
          {awaiting.map((r) => (
            <div key={r.planId} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
              <Link href={`/physio/plans/${r.planId}?assign=1`} className="flex flex-1 min-w-0 items-center gap-2 hover:underline" data-testid={`today-assign-${r.planId}`}>
                <span className="flex-1 min-w-0 text-sm"><b>{r.patientName}</b>{r.patientCode ? ` (${r.patientCode})` : ""} <span className="text-muted-foreground">— {r.titleAr}</span></span>
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-violet-800"><UserPlus className="w-4 h-4" /> إسناد</span>
              </Link>
              {/* المعتمِدُ ينفّذها حتى تُسنَد — من هنا، فلا تتكرّر في «بقيّة خطط الفرع». */}
              {!r.readOnly && (
                <Button size="sm" variant={r.doneToday ? "outline" : "default"} className="gap-1 shrink-0" onClick={() => setExecuting(r.planId)}
                  data-testid={`button-today-execute-${r.planId}`}>
                  <Play className="w-4 h-4" /> {r.awaitingMyPart ? "إكمال الجلسة" : "تنفيذ"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {q.isLoading ? <Card className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</Card>
        : q.isError ? <Card className="p-4 text-sm text-red-700">تعذّر التحميل.</Card>
        : rows.length === 0 ? <Card className="p-4 text-sm text-muted-foreground" data-testid="today-empty">لا خطةَ معتمَدة في فرعك.</Card>
        : (
          <div className="space-y-4">
            {mine.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold">المسندة إليّ ({arText(mine.length)})</h2>
                {mine.map((r) => <Row key={r.planId} r={r} />)}
              </div>
            )}
            {others.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-bold">بقيّة خطط الفرع ({arText(others.length)})</h2>
                {others.map((r) => <Row key={r.planId} r={r} />)}
              </div>
            )}
            {colleagues.length > 0 && (
              <div className="space-y-2" data-testid="today-colleagues">
                <button type="button" className="text-sm font-bold flex items-center gap-1" onClick={() => setOthersOpen((v) => !v)} aria-expanded={othersOpen}
                  data-testid="button-today-colleagues">
                  <ChevronDown className={cn("w-4 h-4 transition-transform", othersOpen ? "" : "rotate-90")} /> خطط زملائك ({arText(colleagues.length)})
                </button>
                {othersOpen && (
                  <>
                    <p className="text-[11px] text-muted-foreground m-0">خططُ {AI_BRAND} ليس لك فيها جزء — للاطّلاع. يسجّل كلَّ جزءٍ مُسنَدُه أو بديلٌ معتمَد، وما لم يُسنَد بعدُ ينتظر المسؤولَ أو المشرفَ العام.</p>
                    {colleagues.map((r) => <Row key={r.planId} r={r} />)}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      <ExecuteSessionDialog planId={executing} onClose={() => { setExecuting(null); refresh(null); }} />
      <SubstituteRequestDialog open={subOpen} onClose={() => setSubOpen(false)} approver={false} viewerId={viewerId} />
    </div>
  );
}
