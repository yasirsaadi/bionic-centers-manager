import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { normalizeArabic } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PhoneCall, Phone, History, Pencil, Trash2, Check, X, Search,
  ChevronRight, ChevronLeft, ArrowDownUp,
} from "lucide-react";

// Sort by the relevant date of each list: last visit for active reminders,
// the logged-call date for history. "newest" = most recent first.
type SortOrder = "newest" | "oldest";

// Active reminder shape returned by GET /api/follow-ups
interface ReminderItem {
  patientId: number;
  name: string;
  phone: string | null;
  branchId: number;
  branchName?: string;
  lastVisitDate: string;
  daysSince: number;
}

// Handled record returned by GET /api/follow-ups/history
interface FollowUpHistoryRow {
  id: number;
  patientId: number;
  branchId: number;
  lastVisitAnchor: string;
  outcomeNote: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  patientName: string | null;
  createdByName: string | null;
}

interface BranchOption {
  id: number;
  name: string;
}

const PAGE_SIZE_OPTIONS = [10, 50, 100];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function FollowUps() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useBranchSession();
  const isAdmin = !!session?.isAdmin;
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  // Shared controls (search is the primary filter; branch filter is admin-only).
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  // Any change to search / branch / page size / sort resets both lists to page 1.
  useEffect(() => {
    setActivePage(1);
    setHistoryPage(1);
  }, [search, branchFilter, pageSize, sortOrder]);

  const { data: reminders = [], isLoading } = useQuery<ReminderItem[]>({
    queryKey: ["/api/follow-ups"],
    queryFn: async () => {
      const res = await fetch("/api/follow-ups", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const { data: history = [] } = useQuery<FollowUpHistoryRow[]>({
    queryKey: ["/api/follow-ups/history"],
    queryFn: async () => {
      const res = await fetch("/api/follow-ups/history", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Branch list for the admin filter + history branch-name display.
  const { data: branches = [] } = useQuery<BranchOption[]>({
    queryKey: ["/api/branches"],
    enabled: isAdmin,
  });
  const branchNameById = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
    queryClient.invalidateQueries({ queryKey: ["/api/follow-ups/history"] });
  };

  const saveOutcome = useMutation({
    mutationFn: async ({ patientId, outcomeNote }: { patientId: number; outcomeNote: string }) => {
      const res = await apiRequest("POST", "/api/follow-ups", { patientId, outcomeNote });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      setDrafts((d) => {
        const next = { ...d };
        delete next[vars.patientId];
        return next;
      });
      invalidate();
      toast({ title: "تم تسجيل المتابعة" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err?.message ?? "تعذّر الحفظ", variant: "destructive" });
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, outcomeNote }: { id: number; outcomeNote: string }) => {
      const res = await apiRequest("PATCH", `/api/follow-ups/${id}`, { outcomeNote });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "تم تعديل الملاحظة" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err?.message ?? "تعذّر التعديل", variant: "destructive" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/follow-ups/${id}`);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "تم حذف الملاحظة" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err?.message ?? "تعذّر الحذف", variant: "destructive" });
    },
  });

  const q = normalizeArabic(search.trim());
  const branchId = branchFilter === "all" ? null : Number(branchFilter);

  // Active list: filter by branch (admin) + search (name or phone),
  // Arabic-normalized so ة/ه etc. variants still match.
  const filteredActive = useMemo(
    () =>
      reminders.filter((r) => {
        if (branchId !== null && r.branchId !== branchId) return false;
        if (!q) return true;
        return (
          normalizeArabic(r.name).includes(q) ||
          (r.phone ?? "").includes(q)
        );
      }),
    [reminders, branchId, q]
  );

  // History list: filter by branch (admin) + search (patient name).
  const filteredHistory = useMemo(
    () =>
      history.filter((h) => {
        if (branchId !== null && h.branchId !== branchId) return false;
        if (!q) return true;
        return normalizeArabic(h.patientName ?? "").includes(q);
      }),
    [history, branchId, q]
  );

  const dir = sortOrder === "newest" ? -1 : 1;

  // Active sorted by last visit date; history by the logged-call date.
  const sortedActive = useMemo(
    () =>
      [...filteredActive].sort(
        (a, b) =>
          dir * (new Date(a.lastVisitDate).getTime() - new Date(b.lastVisitDate).getTime())
      ),
    [filteredActive, dir]
  );
  const sortedHistory = useMemo(
    () =>
      [...filteredHistory].sort(
        (a, b) =>
          dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      ),
    [filteredHistory, dir]
  );

  const activeSlice = sortedActive.slice((activePage - 1) * pageSize, activePage * pageSize);
  const historySlice = sortedHistory.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PhoneCall className="w-6 h-6 text-primary" />
          متابعة المرضى
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تذكير بالاتصال بمرضى العلاج الطبيعي الذين توقّفوا عن المراجعة منذ ٧ أيام أو أكثر.
          سجّل نتيجة الاتصال لإنهاء المتابعة.
        </p>
      </div>

      {/* Shared controls: search (primary), branch filter (admin), page size */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف…"
            className="pr-9"
          />
        </div>

        {isAdmin && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="الفرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفروع</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
          <SelectTrigger className="w-[160px]">
            <ArrowDownUp className="w-4 h-4 ml-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">الأحدث أولاً</SelectItem>
            <SelectItem value="oldest">الأقدم أولاً</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>{n} لكل صفحة</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="gap-2">
            <Phone className="w-4 h-4" />
            التذكيرات النشطة
            {filteredActive.length > 0 && (
              <Badge variant="secondary" className="ml-1">{filteredActive.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            السجل
            {filteredHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1">{filteredHistory.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===================== Active reminders ===================== */}
        <TabsContent value="active">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل…</div>
          ) : filteredActive.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {reminders.length === 0
                ? "لا توجد تذكيرات حالياً. كل مرضى العلاج الطبيعي على تواصل. 👍"
                : "لا توجد نتائج مطابقة للبحث."}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {activeSlice.map((r) => (
                  <Card key={r.patientId}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                        <div className="min-w-0">
                          <Link
                            href={`/patients/${r.patientId}`}
                            className="font-semibold text-base text-primary hover:underline"
                          >
                            {r.name}
                          </Link>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            {r.phone && <span>📞 {r.phone}</span>}
                            <span>آخر زيارة: {formatDate(r.lastVisitDate)}</span>
                            {r.branchName && <span>الفرع: {r.branchName}</span>}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-200 whitespace-nowrap"
                        >
                          متوقّف منذ {r.daysSince} يوماً
                        </Badge>
                      </div>

                      <Textarea
                        placeholder="نتيجة الاتصال: ماذا تحدّثنا مع المريض؟"
                        value={drafts[r.patientId] ?? ""}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [r.patientId]: e.target.value }))
                        }
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          disabled={
                            !(drafts[r.patientId] ?? "").trim() ||
                            (saveOutcome.isPending && saveOutcome.variables?.patientId === r.patientId)
                          }
                          onClick={() =>
                            saveOutcome.mutate({
                              patientId: r.patientId,
                              outcomeNote: (drafts[r.patientId] ?? "").trim(),
                            })
                          }
                        >
                          <Check className="w-4 h-4 ml-1" />
                          تسجيل المتابعة
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Pagination
                page={activePage}
                pageSize={pageSize}
                total={filteredActive.length}
                onPage={setActivePage}
              />
            </>
          )}
        </TabsContent>

        {/* ===================== History ===================== */}
        <TabsContent value="history">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {history.length === 0
                ? "لا توجد متابعات مسجّلة بعد."
                : "لا توجد نتائج مطابقة للبحث."}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {historySlice.map((h) => (
                  <HistoryRow
                    key={h.id}
                    row={h}
                    branchName={isAdmin ? branchNameById.get(h.branchId) : undefined}
                    onSave={(outcomeNote) => updateNote.mutate({ id: h.id, outcomeNote })}
                    onDelete={() => deleteNote.mutate(h.id)}
                  />
                ))}
              </div>
              <Pagination
                page={historyPage}
                pageSize={pageSize}
                total={filteredHistory.length}
                onPage={setHistoryPage}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Pagination footer — shown only when the list exceeds one page.
function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-2 mt-4 text-sm">
      <span className="text-muted-foreground">
        عرض {from}–{to} من {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronRight className="w-4 h-4 ml-1" />
          السابق
        </Button>
        <span className="text-muted-foreground whitespace-nowrap">
          صفحة {page} من {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          التالي
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}

// One history row with inline edit + delete confirmation.
function HistoryRow({
  row,
  branchName,
  onSave,
  onDelete,
}: {
  row: FollowUpHistoryRow;
  branchName?: string;
  onSave: (outcomeNote: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(row.outcomeNote);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <Link
            href={`/patients/${row.patientId}`}
            className="font-semibold text-primary hover:underline"
          >
            {row.patientName ?? `#${row.patientId}`}
          </Link>
          <div className="text-xs text-muted-foreground">
            {branchName && <span>{branchName} • </span>}
            {row.createdByName ?? "—"} • {formatDate(row.createdAt)}
          </div>
        </div>

        {editing ? (
          <>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setText(row.outcomeNote);
                  setEditing(false);
                }}
              >
                <X className="w-4 h-4 ml-1" />
                إلغاء
              </Button>
              <Button
                size="sm"
                disabled={!text.trim()}
                onClick={() => {
                  onSave(text.trim());
                  setEditing(false);
                }}
              >
                <Check className="w-4 h-4 ml-1" />
                حفظ
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{row.outcomeNote}</p>
            <div className="flex justify-end gap-1 mt-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف الملاحظة؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيُحذف سجل المتابعة، وقد يعود المريض للتذكيرات النشطة إن بقي متوقّفاً.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      حذف
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
