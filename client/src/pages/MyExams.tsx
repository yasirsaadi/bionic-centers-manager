import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stethoscope, Search, Eye, Clock, CheckCircle2, ArrowUpDown, ChevronRight, ChevronLeft } from "lucide-react";
import { NewExamDialog } from "@/components/medical/NewExamDialog";
import { formatDateTimeIraq } from "@/lib/utils";
import { SPECIALTY_COLORS, isMedicalSpecialty, specialtyLabel, sortBySpecialty } from "@shared/medical";
import { rankWorklist } from "./my_exams_order";

interface WorklistRow {
  patientId: number;
  patientName: string;
  phone: string | null;
  /** الرمز العلني الحالي، ورموزُ ملفّاتٍ دُمجت فيه — كلاهما من النقطة. */
  patientCode: string | null;
  aliasCodes?: string[];
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

const PAGE_SIZE_OPTIONS = [10, 50, 100];

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
  // null = every branch in reach; otherwise just the picked one. A doctor who
  // covers more than one centre reads one queue per centre when they want to.
  const [onlyBranch, setOnlyBranch] = useState<number | null>(null);
  // Ten at a time by default (owner, 2026-07-30): a long queue rendered in one
  // pile is slow to draw and hard to work through.
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ rows: WorklistRow[]; specialties: string[] }>({
    queryKey: ["/api/medical/worklist"],
    queryFn: async () => {
      const res = await fetch("/api/medical/worklist", { credentials: "include" });
      if (!res.ok) return { rows: [], specialties: [] };
      return res.json();
    },
  });

  const rows = data?.rows ?? [];
  //  ترتيبٌ واحدٌ ثابت لأزرار الترشيح ولعناوين الأقسام معاً — أطراف صناعية
  //  ثمّ مساند طبية ثمّ علاج طبيعي. وهو مشتقٌّ من `MEDICAL_SPECIALTIES` لا
  //  مكتوبٌ هنا، فلا ينحرف موضعان عن بعضهما.
  const specialties = useMemo(
    () => sortBySpecialty(data?.specialties ?? [], (s) => s),
    [data?.specialties],
  );

  // The branches actually present in this doctor's queue — derived from the
  // rows rather than the branch table, so the picker never offers a centre
  // with nobody waiting in it.
  const branches = useMemo(() => {
    const seen: Record<number, { id: number; name: string; count: number }> = {};
    for (const r of rows) {
      if (r.branchId == null) continue;
      const b = (seen[r.branchId] ||= {
        id: r.branchId,
        name: r.branchName || `فرع #${r.branchId}`,
        count: 0,
      });
      b.count += 1;
    }
    return Object.keys(seen)
      .map((k) => seen[Number(k)])
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [rows]);

  //  الاختصاص والفرع يُرشَّحان هنا، والصلةُ والانتظار في `rankWorklist` —
  //  الصلةُ أوّلاً والانتظارُ كاسرَ تعادل. القاعدة خارج المكوّن لأنها تُكسَر
  //  بإعادة ترتيب سطرين، واختبارُها يجب أن يختبرها هي لا نسخةً منها.
  const filtered = useMemo(() => rankWorklist(
    rows
      .filter((r) => (only ? r.caseType === only : true))
      .filter((r) => (onlyBranch != null ? r.branchId === onlyBranch : true)),
    {
      order,
      waitingOf: (r) => r.waitingSince,
      search,
      toPatient: (r) => ({
        name: r.patientName, phone: r.phone,
        patientCode: r.patientCode, aliasCodes: r.aliasCodes,
      }),
    },
  ), [rows, search, only, onlyBranch, order]);

  // Any change to search / specialty / order / page size sends us back to
  // page 1 — otherwise a narrowed list can leave you stranded on an empty page.
  useEffect(() => {
    setPage(1);
  }, [search, only, onlyBranch, order, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  // One page of the WHOLE queue (owner's choice): ten patients per page
  // whatever their specialty, with the specialty headings kept over each run.
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Grouped by specialty so a two-specialty doctor reads two queues, not one
  // mixed pile.
  const groups = useMemo(() => {
    // Plain object rather than a Map: the project's tsconfig target predates
    // downlevelIteration, so spreading a Map iterator does not compile.
    const byType: Record<string, WorklistRow[]> = {};
    for (const r of pageRows) {
      (byType[r.caseType] ||= []).push(r);
    }
    // The heading must state how many are WAITING in this specialty, not how
    // many landed on the page being read. Showing the page slice made the
    // heading say «أطراف صناعية (4)» directly under a filter button saying
    // «(8)» — the owner read the difference as patients gone missing, when
    // they were simply on a later page (2026-08-06).
    const totalByType: Record<string, number> = {};
    for (const r of filtered) {
      totalByType[r.caseType] = (totalByType[r.caseType] ?? 0) + 1;
    }
    //  ترتيبُ الأقسام هو ترتيبُ الأزرار نفسه — لا ترتيبُ ظهورها في الصفحة.
    //  ومحلُّ الترتيب هنا **بعد التقطيع**: الشريحة `pageRows` تبقى كما هي
    //  حرفاً بحرف (نفس المرضى ونفس ترتيب الانتظار داخل كل اختصاص)، ولا
    //  يتغيّر إلّا تسلسلُ العناوين الثلاثة فوقها.
    return sortBySpecialty(Object.keys(byType), (t) => t).map((caseType) => ({
      caseType,
      list: byType[caseType],
      total: totalByType[caseType] ?? byType[caseType].length,
    }));
  }, [pageRows, filtered]);

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

      {/* Branch picker — same shape as the specialty one. Shown only when the
          queue actually spans more than one centre, so a doctor working in a
          single branch is never given a chooser with one option. */}
      {branches.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-xs text-muted-foreground ml-1">الفرع:</span>
          <Button
            size="sm"
            variant={onlyBranch === null ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => setOnlyBranch(null)}
            data-testid="filter-branch-all"
          >
            كل الفروع ({rows.length})
          </Button>
          {branches.map((b) => (
            <Button
              key={b.id}
              size="sm"
              variant={onlyBranch === b.id ? "default" : "outline"}
              className="h-8 text-xs"
              onClick={() => setOnlyBranch(onlyBranch === b.id ? null : b.id)}
              data-testid={`filter-branch-${b.id}`}
            >
              {b.name} ({b.count})
            </Button>
          ))}
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
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم المريض أو رقم الهاتف"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
                data-testid="input-search-worklist"
              />
            </div>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[130px]" data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} لكل صفحة</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {groups.map(({ caseType, list, total }) => {
                const a = accent(caseType);
                return (
                  <div key={caseType}>
                    <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${a.dot}`} />
                      {specialtyLabel(caseType)}
                      <span className="text-xs font-normal text-muted-foreground">
                        {list.length === total ? `(${total})` : `(${list.length} من ${total})`}
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
                                      منذ {formatDateTimeIraq(r.waitingSince)}
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

              {/* Pagination footer — only when the queue exceeds one page. */}
              {filtered.length > pageSize && (
                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} من {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      data-testid="button-prev-page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" /> السابق
                    </Button>
                    <span className="text-xs px-2">صفحة {safePage} من {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      data-testid="button-next-page"
                    >
                      التالي <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
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
