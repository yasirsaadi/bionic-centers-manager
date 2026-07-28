import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope, Search, Eye, Clock, CheckCircle2, ArrowUpDown } from "lucide-react";
import { NewExamDialog } from "@/components/medical/NewExamDialog";
import { formatDateIraq } from "@/lib/utils";
import { SPECIALTY_COLORS, isMedicalSpecialty, specialtyLabel } from "@shared/medical";

interface WorklistRow {
  patientId: number;
  patientName: string;
  phone: string | null;
  branchId: number | null;
  branchName: string | null;
  caseType: string;
  waitingSince: string | null;
}

function accent(caseType: string) {
  return isMedicalSpecialty(caseType)
    ? SPECIALTY_COLORS[caseType]
    : { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", ring: "border-slate-200" };
}

function daysWaiting(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return ms > 0 ? Math.floor(ms / 86_400_000) : 0;
}

/**
 * The doctor's landing page — their queue, not the patient registry.
 *
 * Clinical systems put the clinician in front of a worklist rather than a
 * searchable directory: the work comes to them, already filtered to what they
 * are licensed to act on. Every row here is an ACTIVE case in one of this
 * doctor's own specialties that carries no signed exam yet, oldest wait first,
 * with a one-click path into documenting it.
 */
export default function MyExams() {
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<WorklistRow | null>(null);
  // Newest first by default (owner, 2026-07-29): the patient who registered
  // today is the one standing at the door. The doctor can flip to oldest-first
  // when working through the backlog.
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  // null = every specialty this doctor holds; otherwise just the picked one.
  const [only, setOnly] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ rows: WorklistRow[]; specialties: string[] }>({
    queryKey: ["/api/medical/worklist"],
    queryFn: async () => {
      const res = await fetch("/api/medical/worklist", { credentials: "include" });
      if (!res.ok) return { rows: [], specialties: [] };
      return res.json();
    },
  });

  const rows = data?.rows ?? [];
  const specialties = data?.specialties ?? [];

  const filtered = useMemo(() => {
    const q = search.trim();
    const base = rows
      .filter((r) => (only ? r.caseType === only : true))
      .filter((r) => (q ? r.patientName.includes(q) || (r.phone ?? "").includes(q) : true));
    // Sort a COPY: `rows` is react-query's cached array.
    return [...base].sort((a, b) => {
      const ta = a.waitingSince ? new Date(a.waitingSince).getTime() : 0;
      const tb = b.waitingSince ? new Date(b.waitingSince).getTime() : 0;
      return order === "newest" ? tb - ta : ta - tb;
    });
  }, [rows, search, only, order]);

  // Grouped by specialty so a two-specialty doctor reads two queues, not one
  // mixed pile.
  const groups = useMemo(() => {
    // Plain object rather than a Map: the project's tsconfig target predates
    // downlevelIteration, so spreading a Map iterator does not compile.
    const byType: Record<string, WorklistRow[]> = {};
    for (const r of filtered) {
      (byType[r.caseType] ||= []).push(r);
    }
    return Object.keys(byType).map((caseType) => ({ caseType, list: byType[caseType] }));
  }, [filtered]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" /> معايناتي
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            المرضى المنتظرون معاينتك في اختصاصك — {order === "newest" ? "الأحدث أولاً" : "الأقدم أولاً"}.
          </p>
        </div>
        {/* Newest ↔ oldest, one click. */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setOrder((o) => (o === "newest" ? "oldest" : "newest"))}
          data-testid="button-toggle-order"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {order === "newest" ? "الأحدث أولاً" : "الأقدم أولاً"}
        </Button>
      </div>

      {/* Specialty picker. A doctor holding one specialty needs no chooser. */}
      {specialties.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Button
            size="sm"
            variant={only === null ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setOnly(null)}
            data-testid="filter-specialty-all"
          >
            الكل ({rows.length})
          </Button>
          {specialties.map((s) => {
            const count = rows.filter((r) => r.caseType === s).length;
            return (
              <Button
                key={s}
                size="sm"
                variant={only === s ? "default" : "outline"}
                className="h-8 text-xs gap-1.5"
                onClick={() => setOnly(only === s ? null : s)}
                data-testid={`filter-specialty-${s}`}
              >
                <span className={`w-2 h-2 rounded-full ${accent(s).dot}`} />
                {specialtyLabel(s)} ({count})
              </Button>
            );
          })}
        </div>
      )}

      {specialties.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            لا يوجد اختصاص مسجَّل لحسابك — راجع المدير العام لتحديد اختصاصك.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث باسم المريض أو رقم الهاتف"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
              data-testid="input-search-worklist"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium">
                  {search ? "لا نتائج مطابقة." : "لا أحد بانتظار معاينتك."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groups.map(({ caseType, list }) => {
                const a = accent(caseType);
                return (
                  <div key={caseType}>
                    <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${a.dot}`} />
                      {specialtyLabel(caseType)}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({list.length})
                      </span>
                    </h2>
                    <div className="space-y-2">
                      {list.map((r) => {
                        const days = daysWaiting(r.waitingSince);
                        return (
                          <Card key={`${r.patientId}-${r.caseType}`} className={`border ${a.ring}`}>
                            <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                              <div className="min-w-0">
                                <div className="font-semibold text-sm truncate" dir="auto">
                                  {r.patientName}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                  {r.phone && <span dir="ltr">{r.phone}</span>}
                                  {r.branchName && <span>{r.branchName}</span>}
                                  {r.waitingSince && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      منذ {formatDateIraq(r.waitingSince)}
                                      {days !== null && days > 0 && ` (${days} يوم)`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Link href={`/patients/${r.patientId}`}>
                                  <Button size="sm" variant="ghost" className="h-8 text-xs gap-1">
                                    <Eye className="w-3.5 h-3.5" /> الملف
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => setTarget(r)}
                                  data-testid={`write-exam-${r.patientId}-${r.caseType}`}
                                >
                                  <Stethoscope className="w-3.5 h-3.5" /> كتابة معاينة
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {target && (
        <NewExamDialog
          patientId={target.patientId}
          patientName={target.patientName}
          preferSpecialty={target.caseType}
          open={!!target}
          onOpenChange={(o) => !o && setTarget(null)}
          onDone={() => setTarget(null)}
        />
      )}
    </div>
  );
}
