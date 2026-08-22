import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Search, Eye, Clock, CheckCircle2, ArrowUpDown, ChevronRight, ChevronLeft, ShoppingBag, Undo2 } from "lucide-react";
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
  /**
   * رقمُ طلبِ المراجعة الذي وضع هذا المريضَ في القائمة — **حين يجوز
   * إرجاعُه**. يرسله الخادمُ لمن يملك القدرة الإشرافية وحده، ولا يرسله
   * لمن أنشأ الطلبَ بنفسه. وغيابُه يعني: لا زرّ.
   */
  returnableRequestId?: number | null;
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

  const { data, isLoading } = useQuery<{
    rows: WorklistRow[]; specialties: string[]; canReturnRequests?: boolean;
  }>({
    queryKey: ["/api/medical/worklist"],
    queryFn: async () => {
      const res = await fetch("/api/medical/worklist", { credentials: "include" });
      if (!res.ok) return { rows: [], specialties: [] };
      return res.json();
    },
  });

  //  ══ **بابُ خروجٍ نظيف لطلبٍ أُرسل ببيانٍ خاطئ** ═══════════════════════
  //  كان الطلبُ الخاطئ عالقاً إلى الأبد: لا الطبيبُ يوقّع على خطأ، ولا أحدَ
  //  يسحبه. فكانت الحيلةُ الوحيدة أن يوقّع معاينةً يعرف أنها خطأ ليُخرجها
  //  من قائمته. والآن يُرجَع بسببٍ إلزاميّ — **ولا معاينةَ تُكتب ولا تُحذف،
  //  ولا يُمَسّ ديناراً**. ويرسل الاستعلاماتُ طلباً مصحَّحاً بعده.
  const [returning, setReturning] = useState<WorklistRow | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);
  const { toast: notify } = useToast();
  const qcMy = useQueryClient();

  const submitReturn = async () => {
    const id = returning?.returnableRequestId;
    const reason = returnReason.trim();
    if (!id || !reason) return;
    setReturnBusy(true);
    try {
      const res = await fetch(`/api/medical-review/requests/${id}/return`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "تعذّر إرجاع الطلب");
      qcMy.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      qcMy.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      qcMy.invalidateQueries({ queryKey: ["/api/medical-review/queue"] });
      setReturning(null);
      setReturnReason("");
      notify({
        title: "أُعيد إلى الاستعلامات",
        description: "خرج من قائمتك — ويستطيع الاستعلامات تصحيح البيانات وإرسال طلبٍ جديد.",
      });
    } catch (e: any) {
      notify({ title: "خطأ", description: e?.message, variant: "destructive" });
    } finally {
      setReturnBusy(false);
    }
  };

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

  //  الاختصاص والفرع يُرشَّحان هنا، والترتيبُ كلّه في `rankWorklist`:
  //  بلا بحثٍ الاختصاصُ ثمّ الانتظار، ومع البحث الصلةُ ثمّ الانتظار.
  //  و**قبل التقطيع** في الحالتين، فهو ما يقرّر مَن يقع في أي صفحة.
  //  القاعدة خارج المكوّن لأنها تُكسَر بإعادة ترتيب سطرين، واختبارُها يجب
  //  أن يختبرها هي لا نسخةً منها.
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
      specialtyOf: (r) => r.caseType,
    },
  ), [rows, search, only, onlyBranch, order]);

  // Any change to search / specialty / order / page size sends us back to
  // page 1 — otherwise a narrowed list can leave you stranded on an empty page.
  useEffect(() => {
    setPage(1);
  }, [search, only, onlyBranch, order, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  //  صفحةٌ من القائمة كلّها لا من كل اختصاصٍ على حدة: عشرةٌ في الصفحة،
  //  وعناوينُ الأقسام تبقى فوق كل مقطع. والترتيب حُسم في `rankWorklist`
  //  قبل هذا السطر، فالتقطيع لا يقرّر شيئاً — ينفّذ فقط.
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
    //  ترتيبُ الأقسام هو ترتيبُ الأزرار نفسه.
    //  وهو هنا **بعد التقطيع** عمداً: الشريحة `pageRows` لا تُمَسّ — نفس
    //  المرضى ونفس ترتيبهم — ولا يتغيّر إلّا تسلسلُ العناوين فوقها.
    //  وبلا بحثٍ تكون الشريحة مرتَّبةً بالاختصاص أصلاً (من `rankWorklist`)
    //  فلا يفعل هذا السطر شيئاً؛ ومع البحث تحكم الصلةُ الصفوفَ ويبقى هذا
    //  السطر ليقرأ الطبيبُ عناوين ثابتة لا متبدّلة.
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
                                {r.returnableRequestId != null && (
                                  <Button
                                    size="sm" variant="outline" className="h-8 text-xs gap-1"
                                    onClick={() => { setReturning(r); setReturnReason(""); }}
                                    data-testid={`return-request-${r.patientId}-${r.caseType}`}
                                  >
                                    <Undo2 className="w-3.5 h-3.5" /> إرجاع للاستعلامات
                                  </Button>
                                )}
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

      <RecentPurchases />

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

      {/* ══ إرجاعُ طلبٍ خاطئ إلى الاستعلامات — بسببٍ إلزاميّ ═══════════ */}
      <Dialog open={!!returning} onOpenChange={(o) => { if (!o) { setReturning(null); setReturnReason(""); } }}>
        <DialogContent dir="rtl" className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base">إرجاع الطلب إلى الاستعلامات</DialogTitle>
            <DialogDescription className="text-xs">
              {returning?.patientName} — {returning ? specialtyLabel(returning.caseType) : ""}.
              يخرج من قائمتك، <b>ولا تُكتب معاينةٌ ولا تُحذف</b>، ويستطيع الاستعلامات
              تصحيح البيانات وإرسال طلبٍ جديد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              سبب الإرجاع <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
              rows={3} className="text-sm"
              placeholder="مثال: جهة البتر غير صحيحة — عدّلها وأعد إرسال الطلب"
              data-testid="return-reason"
            />
            <p className="text-[11px] text-muted-foreground">
              يُحفظ في السجلّ مع اسمك ووقته، ويقرؤه موظّف الاستعلامات ليعرف ماذا يصحّح.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm"
              onClick={() => { setReturning(null); setReturnReason(""); }}>
              إلغاء
            </Button>
            <Button size="sm" disabled={!returnReason.trim() || returnBusy}
              onClick={submitReturn} data-testid="return-confirm">
              <Undo2 className="w-3.5 h-3.5 ml-1" /> إرجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PurchaseRow {
  followupId: number;
  patientId: number;
  patientName: string;
  patientCode: string | null;
  branchName: string | null;
  caseType: string;
  finalPrice: number;
  examDeviceCost: number | null;
  priceSource: string;
  purchasedAt: string | null;
  confirmedByName: string | null;
  priceSetByName: string | null;
}

/**
 * **مرضاي الذين اشتروا مؤخّراً — قراءةٌ محضة، بلا فعلٍ مطلوب.**
 *
 * ══ لماذا هنا لا في صندوق تنبيهات ══════════════════════════════════════
 * لا بنيةَ تنبيهاتٍ داخلية في هذا النظام، وبناءُ واحدةٍ لأجل سطرٍ يُقرأ
 * مرّةً في اليوم كلفةٌ لا تُسترَدّ. فالمعلومة توضَع **حيث يقف الطبيب أصلاً**:
 * أسفل قائمة عمله. لا صندوقَ يُقرأ ولا رايةَ تُطفأ ولا زرَّ يُضغَط.
 *
 * وحين لا يكون هناك بيعٌ حديث **لا تظهر البطاقة إطلاقاً**: لا تُشغل مكاناً
 * لتقول «لا شيء».
 */
function RecentPurchases() {
  const { data } = useQuery<{ rows: PurchaseRow[] }>({
    queryKey: ["/api/medical/recent-purchases"],
    queryFn: async () => {
      const res = await fetch("/api/medical/recent-purchases", { credentials: "include" });
      if (!res.ok) return { rows: [] };
      return res.json();
    },
  });
  const rows = data?.rows ?? [];
  if (rows.length === 0) return null;

  return (
    <Card className="mt-8" data-testid="card-recent-purchases">
      <CardContent className="p-4">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
          <ShoppingBag className="w-4 h-4 text-green-600" /> مرضاي الذين اشتروا مؤخراً
        </h2>
        <p className="text-[11px] text-muted-foreground mb-3">
          للعلم فقط — لا إجراء مطلوب منك. السعر التجاري قرارُ الفرع.
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.followupId}
              className="rounded-md border px-3 py-2 text-xs"
              data-testid={`row-recent-purchase-${r.followupId}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/patients/${r.patientId}`}>
                  <span className="font-medium text-sm cursor-pointer hover:underline">
                    {r.patientName}
                  </span>
                </Link>
                <span className="font-medium" data-testid={`text-purchase-price-${r.followupId}`}>
                  {r.finalPrice.toLocaleString()} د.ع
                </span>
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{specialtyLabel(r.caseType)}</span>
                {r.branchName && <span>{r.branchName}</span>}
                {r.purchasedAt && <span>{formatDateTimeIraq(r.purchasedAt)}</span>}
                {r.confirmedByName && <span>أكّد الشراء: {r.confirmedByName}</span>}
                {/*  **ولا يُذكَر إلّا إن غُيِّر فعلاً**: بيعٌ بسعر المعاينة بلا
                    تدخّلٍ لا يحمل هذا السطر أصلاً. */}
                {r.priceSetByName && (
                  <span data-testid={`text-price-setter-${r.followupId}`}>
                    حدّد السعر: {r.priceSetByName}
                  </span>
                )}
                {/*  وسعرُ معاينته هو، فيرى الفرقَ بلا حساب — ولا يُطلَب منه شيء. */}
                {r.examDeviceCost !== null && r.examDeviceCost !== r.finalPrice && (
                  <span data-testid={`text-exam-price-${r.followupId}`}>
                    سعر المعاينة كان: {r.examDeviceCost.toLocaleString()} د.ع
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
