import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
import { PhoneCall, Phone, History, Pencil, Trash2, Check, X } from "lucide-react";

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
  const [drafts, setDrafts] = useState<Record<number, string>>({});

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

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="gap-2">
            <Phone className="w-4 h-4" />
            التذكيرات النشطة
            {reminders.length > 0 && (
              <Badge variant="secondary" className="ml-1">{reminders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            السجل
          </TabsTrigger>
        </TabsList>

        {/* ===================== Active reminders ===================== */}
        <TabsContent value="active">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل…</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              لا توجد تذكيرات حالياً. كل مرضى العلاج الطبيعي على تواصل. 👍
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
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
          )}
        </TabsContent>

        {/* ===================== History ===================== */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              لا توجد متابعات مسجّلة بعد.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <HistoryRow
                  key={h.id}
                  row={h}
                  onSave={(outcomeNote) => updateNote.mutate({ id: h.id, outcomeNote })}
                  onDelete={() => deleteNote.mutate(h.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// One history row with inline edit + delete confirmation.
function HistoryRow({
  row,
  onSave,
  onDelete,
}: {
  row: FollowUpHistoryRow;
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
