// **مكتبةُ بروتوكولات العلاج الطبيعي** (ترحيل ١٠٦، §4.cj — المرحلةُ الثانية من خطّة العلاج الطبيعي).
//   /physio/protocols       — المكتبة (بحثٌ وفئةٌ وعمرٌ وحالة) + «توفّر الأجهزة بالفروع».
//   /physio/protocols/:id   — البروتوكولُ كاملاً: الأجهزةُ بدرجة دليلها وتوفّرِها، والتمارين، والموانع، والمراجع، والصور.
// العربيةُ للنصّ، والمصطلحُ الطبيّ بالإنكليزية بجانبه (قرارُ المالك). وكلُّ قرار صلاحيةٍ من الخادم (`canEdit`/`canApprove`).
import { useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BookMarked, CheckCircle2, ExternalLink, ImagePlus, Pencil, Plus, Search, Trash2, Archive, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AGE_GROUPS, AGE_GROUP_LABELS, DRY_NEEDLING_DEVICE_CODE, EVIDENCE_LABELS, EVIDENCE_LEVELS, PROTOCOL_CATEGORIES,
  PROTOCOL_CATEGORY_LABELS, PROTOCOL_STATUS_LABELS, canEditProtocols, canReadProtocols,
  type AgeGroup, type EvidenceLevel, type ProtocolCategory, type ProtocolReference,
} from "@shared/physio_protocols";

interface ListRow {
  id: number; code: string; titleAr: string; titleEn: string; category: ProtocolCategory; ageGroup: AgeGroup;
  status: "draft" | "approved"; isArchived: boolean; deviceCount: number; recommendedCount: number;
}
interface DeviceLine {
  id?: number; deviceId: number; evidence: EvidenceLevel; parameters: string | null; minutes: number | null; note: string | null;
  code?: string; nameAr?: string; nameEn?: string; availableBranchIds?: number[];
}
interface Protocol {
  id: number; code: string; titleAr: string; titleEn: string; category: ProtocolCategory; ageGroup: AgeGroup;
  summary: string | null; goals: string | null; assessment: string | null; exercises: string | null;
  contraindications: string | null; precautions: string | null;
  sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null;
  references: ProtocolReference[]; status: "draft" | "approved"; isArchived: boolean;
  approvedByName: string | null; approvedAt: string | null; updatedByName: string | null; updatedAt: string;
  devices: DeviceLine[]; images: { id: number; caption: string | null; sourceUrl: string | null; credit: string | null }[];
  canEdit: boolean; canApprove: boolean;
}
interface Matrix { devices: { id: number; code: string; nameAr: string; nameEn: string }[]; branches: { id: number; name: string }[]; available: string[]; canManage: boolean }

const EVIDENCE_TONE: Record<EvidenceLevel, string> = {
  recommended: "bg-emerald-100 text-emerald-800 border-emerald-300",
  optional: "bg-amber-100 text-amber-800 border-amber-300",
  not_recommended: "bg-red-100 text-red-800 border-red-300",
};
const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

function useSessionLike() {
  const session = useBranchSession();
  const permissions = usePermissions();
  return { ...(session ?? {}), permissions } as any;
}

// ══ المكتبة ═══════════════════════════════════════════════════════════════════
export default function PhysioProtocols() {
  const s = useSessionLike();
  if (!canReadProtocols(s)) {
    return <div className="p-6 text-center text-muted-foreground" dir="rtl">مكتبةُ البروتوكولات لقسم العلاج الطبيعي.</div>;
  }
  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <BookMarked className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-primary">بروتوكولات العلاج الطبيعي</h1>
      </div>
      <Tabs defaultValue="library" dir="rtl">
        <TabsList>
          <TabsTrigger value="library" data-testid="tab-protocols">المكتبة</TabsTrigger>
          <TabsTrigger value="devices" data-testid="tab-devices">توفّر الأجهزة بالفروع</TabsTrigger>
        </TabsList>
        <TabsContent value="library"><Library canEdit={canEditProtocols(s)} /></TabsContent>
        <TabsContent value="devices"><DeviceAvailability /></TabsContent>
      </Tabs>
    </div>
  );
}

function Library({ canEdit }: { canEdit: boolean }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [age, setAge] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (category !== "all") params.set("category", category);
  if (age !== "all") params.set("ageGroup", age);
  if (status !== "all") params.set("status", status);
  if (archived) params.set("archived", "1");
  const url = `/api/physio/protocols${params.toString() ? `?${params}` : ""}`;
  const list = useQuery<ListRow[]>({ queryKey: ["/api/physio/protocols", url], queryFn: async () => (await apiRequest("GET", url)).json() });
  const rows = list.data ?? [];

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالحالة أو المصطلح الإنكليزي" className="pr-8" data-testid="protocol-search" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفئات</SelectItem>
            {PROTOCOL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{PROTOCOL_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={age} onValueChange={setAge}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأعمار</SelectItem>
            {AGE_GROUPS.filter((a) => a !== "all").map((a) => <SelectItem key={a} value={a}>{AGE_GROUP_LABELS[a]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="approved">معتمَدة</SelectItem>
            <SelectItem value="draft">مسوّدات</SelectItem>
          </SelectContent>
        </Select>
        {canEdit && (
          <>
            <label className="flex items-center gap-2 text-sm"><Switch checked={archived} onCheckedChange={setArchived} /> المؤرشفة</label>
            <Button onClick={() => setCreating(true)} className="gap-1" data-testid="protocol-new"><Plus className="w-4 h-4" /> بروتوكول جديد</Button>
          </>
        )}
      </div>

      {list.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground" data-testid="protocols-empty">
            لا بروتوكولات بهذه الشروط{canEdit ? " — أضف أوّلها من «بروتوكول جديد»." : "."}
          </CardContent></Card>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {rows.map((r) => (
              <Link key={r.id} href={`/physio/protocols/${r.id}`}>
                <a className="block rounded-lg border bg-white hover:border-primary p-3 space-y-1" data-testid={`protocol-row-${r.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.titleAr}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{r.titleEn}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <Badge variant="secondary">{PROTOCOL_CATEGORY_LABELS[r.category]}</Badge>
                    <Badge variant="outline">{AGE_GROUP_LABELS[r.ageGroup]}</Badge>
                    <Badge className={r.status === "approved" ? "bg-emerald-600" : "bg-amber-500"}>{r.status === "approved" ? "معتمَد" : "مسوّدة"}</Badge>
                    <span className="text-muted-foreground">{r.deviceCount} جهاز · {r.recommendedCount} موصى به</span>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        )}
      {creating && <ProtocolEditor initial={null} onClose={() => setCreating(false)} />}
    </div>
  );
}

// ══ البروتوكولُ كاملاً ════════════════════════════════════════════════════════
export function PhysioProtocolDetail() {
  const [, params] = useRoute("/physio/protocols/:id");
  const id = Number(params?.id);
  const s = useSessionLike();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [addingImage, setAddingImage] = useState(false);
  const q = useQuery<Protocol>({ queryKey: ["/api/physio/protocols", id], enabled: Number.isInteger(id) && id > 0,
    queryFn: async () => (await apiRequest("GET", `/api/physio/protocols/${id}`)).json() });
  const matrix = useQuery<Matrix>({ queryKey: ["/api/physio/devices"] });
  const branchName = (bid: number) => matrix.data?.branches.find((b) => b.id === bid)?.name ?? `#${bid}`;
  const act = useMutation({
    mutationFn: async (path: string) => (await apiRequest(path.startsWith("DELETE ") ? "DELETE" : "POST", path.replace(/^DELETE /, ""), {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/physio/protocols"] }); toast({ title: "تمّ" }); },
    onError: (e) => toast({ title: "تعذّر", description: errText(e), variant: "destructive" }),
  });

  if (!canReadProtocols(s)) return <div className="p-6 text-center text-muted-foreground" dir="rtl">مكتبةُ البروتوكولات لقسم العلاج الطبيعي.</div>;
  if (q.isLoading) return <div className="p-6" dir="rtl">جارٍ التحميل…</div>;
  if (!q.data) return <div className="p-6" dir="rtl">البروتوكول غير موجود.</div>;
  const p = q.data;
  const activeBranch = Number(s.branchId) || null;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl" dir="rtl" data-testid="protocol-detail">
      <Link href="/physio/protocols"><a className="inline-flex items-center gap-1 text-sm text-primary"><ArrowRight className="w-4 h-4" /> المكتبة</a></Link>
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold">{p.titleAr}</h1>
          <p className="text-muted-foreground" dir="ltr">{p.titleEn}</p>
          <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
            <Badge variant="secondary">{PROTOCOL_CATEGORY_LABELS[p.category]}</Badge>
            <Badge variant="outline">{AGE_GROUP_LABELS[p.ageGroup]}</Badge>
            <Badge className={p.status === "approved" ? "bg-emerald-600" : "bg-amber-500"} data-testid="protocol-status">{PROTOCOL_STATUS_LABELS[p.status]}</Badge>
            {p.isArchived && <Badge variant="destructive">مؤرشف</Badge>}
          </div>
          {p.status === "approved" && p.approvedByName && (
            <p className="text-xs text-muted-foreground mt-1">اعتمده {p.approvedByName}{p.approvedAt ? ` · ${new Date(p.approvedAt).toLocaleDateString("en-GB")}` : ""}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.canApprove && p.status === "draft" && !p.isArchived && (
            <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={act.isPending} onClick={() => act.mutate(`/api/physio/protocols/${p.id}/approve`)} data-testid="protocol-approve">
              <CheckCircle2 className="w-4 h-4" /> اعتماد
            </Button>
          )}
          {p.canEdit && !p.isArchived && <Button variant="outline" className="gap-1" onClick={() => setEditing(true)} data-testid="protocol-edit"><Pencil className="w-4 h-4" /> تعديل</Button>}
          {p.canEdit && !p.isArchived && <Button variant="outline" className="gap-1" onClick={() => setAddingImage(true)}><ImagePlus className="w-4 h-4" /> صورة</Button>}
          {p.canEdit && (p.isArchived
            ? <Button variant="outline" className="gap-1" onClick={() => act.mutate(`/api/physio/protocols/${p.id}/restore`)}><RotateCcw className="w-4 h-4" /> استعادة</Button>
            : <Button variant="ghost" className="gap-1 text-red-700" onClick={() => { if (confirm("أرشفة هذا البروتوكول؟ لا يُمحى، ويُستعاد متى شئت.")) act.mutate(`/api/physio/protocols/${p.id}/archive`); }}><Archive className="w-4 h-4" /> أرشفة</Button>)}
        </div>
      </div>

      {p.status === "draft" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <span>مسوّدةٌ لم يعتمدها المشرفُ العام بعد — تُقرأ مرجعاً لا تعليمات.</span>
        </div>
      )}

      {p.summary && <Section title="نظرة عامة">{p.summary}</Section>}
      <div className="flex flex-wrap gap-4 text-sm">
        {p.sessionsPerWeek && <span><b>{p.sessionsPerWeek}</b> جلسات/أسبوع</span>}
        {p.durationWeeks && <span>لمدة <b>{p.durationWeeks}</b> أسابيع</span>}
        {p.sessionMinutes && <span>الجلسة <b>{p.sessionMinutes}</b> دقيقة</span>}
      </div>
      {p.goals && <Section title="الأهداف">{p.goals}</Section>}
      {p.assessment && <Section title="التقييم والقياسات">{p.assessment}</Section>}

      <div className="space-y-2">
        <h2 className="font-semibold">الأجهزة ودرجةُ الدليل</h2>
        {p.devices.length === 0 ? <p className="text-sm text-muted-foreground">لا أجهزة في هذا البروتوكول.</p> : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>
                <th className="text-right p-2">الجهاز</th><th className="text-right p-2">الدرجة</th><th className="text-right p-2">المعاملات</th>
                <th className="text-right p-2">الدقائق</th><th className="text-right p-2">متوفّر في</th>
              </tr></thead>
              <tbody>
                {p.devices.map((d) => {
                  const here = activeBranch ? (d.availableBranchIds ?? []).includes(activeBranch) : true;
                  return (
                    <tr key={d.deviceId} className="border-t align-top" data-testid={`protocol-device-${d.code}`}>
                      <td className="p-2"><div className="font-medium">{d.nameAr}</div><div className="text-xs text-muted-foreground" dir="ltr">{d.nameEn}</div>
                        {d.code === DRY_NEEDLING_DEVICE_CODE && <div className="text-[11px] text-red-700 mt-0.5">يطبّقها حاملُ «الإبر الجافة» وحده</div>}</td>
                      <td className="p-2"><span className={`inline-block rounded border px-2 py-0.5 text-xs ${EVIDENCE_TONE[d.evidence]}`}>{EVIDENCE_LABELS[d.evidence]}</span></td>
                      <td className="p-2 whitespace-pre-wrap">{d.parameters ?? "—"}{d.note && <div className="text-xs text-muted-foreground mt-1">{d.note}</div>}</td>
                      <td className="p-2">{d.minutes ?? "—"}</td>
                      <td className="p-2 text-xs">
                        {(d.availableBranchIds ?? []).length === 0 ? <span className="text-red-700">غير متوفّر في أيّ فرع</span>
                          : (d.availableBranchIds ?? []).map(branchName).join("، ")}
                        {!here && <div className="text-red-700">غير متوفّر في فرعك</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {p.exercises && <Section title="التمارين والبرنامج المنزلي">{p.exercises}</Section>}
      {p.contraindications && <Section title="موانع الاستعمال" tone="danger">{p.contraindications}</Section>}
      {p.precautions && <Section title="احتياطات" tone="warn">{p.precautions}</Section>}

      {p.images.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">صورٌ توضيحية</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {p.images.map((img) => (
              <figure key={img.id} className="rounded-md border p-2 space-y-1">
                <img src={`/api/physio/protocol-images/${img.id}`} alt={img.caption ?? ""} className="w-full max-h-56 object-contain bg-muted/30" />
                {img.caption && <figcaption className="text-sm">{img.caption}</figcaption>}
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {img.credit && <span>المصدر: {img.credit}</span>}
                  {img.sourceUrl && <a href={img.sourceUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5"><ExternalLink className="w-3 h-3" /> الرابط</a>}
                  {p.canEdit && <button className="mr-auto text-red-700" onClick={() => act.mutate(`DELETE /api/physio/protocols/${p.id}/images/${img.id}`)} aria-label="حذف الصورة"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <h2 className="font-semibold">المراجع</h2>
        {p.references.length === 0 ? <p className="text-sm text-amber-800">لا مراجع بعد — البروتوكولُ بلا مرجعٍ عالميّ لا يُعتمَد.</p> : (
          <ol className="list-decimal pr-5 text-sm space-y-1" dir="ltr" style={{ textAlign: "left" }}>
            {p.references.map((r, i) => (
              <li key={i}>{r.title}{r.org ? ` — ${r.org}` : ""}{r.year ? ` (${r.year})` : ""}
                {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-primary mx-1 inline-flex items-center"><ExternalLink className="w-3 h-3" /></a>}</li>
            ))}
          </ol>
        )}
      </div>
      <p className="text-xs text-muted-foreground">آخرُ تعديل: {p.updatedByName ?? "—"} · {new Date(p.updatedAt).toLocaleString("en-GB")}</p>

      {editing && <ProtocolEditor initial={p} onClose={() => setEditing(false)} />}
      {addingImage && <ImageDialog protocolId={p.id} onClose={() => setAddingImage(false)} />}
    </div>
  );
}

function Section({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "danger" | "warn" }) {
  const cls = tone === "danger" ? "border-red-300 bg-red-50" : tone === "warn" ? "border-amber-300 bg-amber-50" : "bg-white";
  return (
    <div className={`rounded-md border p-3 ${cls}`}>
      <h2 className="font-semibold mb-1">{title}</h2>
      <div className="text-sm whitespace-pre-wrap leading-7">{children}</div>
    </div>
  );
}

// ══ المحرّر ═══════════════════════════════════════════════════════════════════
function ProtocolEditor({ initial, onClose }: { initial: Protocol | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const matrix = useQuery<Matrix>({ queryKey: ["/api/physio/devices"] });
  const [f, setF] = useState(() => ({
    code: initial?.code ?? "", titleAr: initial?.titleAr ?? "", titleEn: initial?.titleEn ?? "",
    category: (initial?.category ?? "spine") as ProtocolCategory, ageGroup: (initial?.ageGroup ?? "adult") as AgeGroup,
    summary: initial?.summary ?? "", goals: initial?.goals ?? "", assessment: initial?.assessment ?? "", exercises: initial?.exercises ?? "",
    contraindications: initial?.contraindications ?? "", precautions: initial?.precautions ?? "",
    sessionsPerWeek: initial?.sessionsPerWeek ? String(initial.sessionsPerWeek) : "", durationWeeks: initial?.durationWeeks ? String(initial.durationWeeks) : "",
    sessionMinutes: initial?.sessionMinutes ? String(initial.sessionMinutes) : "",
  }));
  const [lines, setLines] = useState<DeviceLine[]>(() => (initial?.devices ?? []).map((d) => ({
    deviceId: d.deviceId, evidence: d.evidence, parameters: d.parameters, minutes: d.minutes, note: d.note })));
  const [refs, setRefs] = useState<ProtocolReference[]>(() => initial?.references ?? []);
  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: typeof e === "string" ? e : e.target.value }));
  const unused = useMemo(() => (matrix.data?.devices ?? []).filter((d) => !lines.some((l) => l.deviceId === d.id)), [matrix.data, lines]);
  const nameOf = (id: number) => matrix.data?.devices.find((d) => d.id === id);

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...f, references: refs, devices: lines };
      const r = initial ? await apiRequest("PUT", `/api/physio/protocols/${initial.id}`, body) : await apiRequest("POST", "/api/physio/protocols", body);
      return r.json();
    },
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["/api/physio/protocols"] });
      toast({ title: "حُفظ", description: row?.demoted ? "عُدّل بروتوكولٌ معتمَد فعاد مسوّدةً بانتظار اعتماد المشرف العام." : undefined });
      onClose();
      if (!initial && row?.id) navigate(`/physio/protocols/${row.id}`);
    },
    onError: (e) => toast({ title: "تعذّر الحفظ", description: errText(e), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "تعديل البروتوكول" : "بروتوكول جديد"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1">اسم الحالة بالعربية<Input value={f.titleAr} onChange={set("titleAr")} data-testid="pf-titleAr" /></label>
            <label className="grid gap-1">المصطلح الطبي بالإنكليزية<Input dir="ltr" value={f.titleEn} onChange={set("titleEn")} data-testid="pf-titleEn" /></label>
            <label className="grid gap-1">الرمز (إنكليزي صغير)<Input dir="ltr" value={f.code} onChange={set("code")} placeholder="low-back-pain-adult" data-testid="pf-code" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">الفئة
                <Select value={f.category} onValueChange={set("category")}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROTOCOL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{PROTOCOL_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent></Select>
              </label>
              <label className="grid gap-1">الفئة العمرية
                <Select value={f.ageGroup} onValueChange={set("ageGroup")}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AGE_GROUPS.map((a) => <SelectItem key={a} value={a}>{AGE_GROUP_LABELS[a]}</SelectItem>)}</SelectContent></Select>
              </label>
            </div>
          </div>
          <label className="grid gap-1">نظرة عامة<Textarea rows={2} value={f.summary} onChange={set("summary")} /></label>
          <div className="grid grid-cols-3 gap-2">
            <label className="grid gap-1">جلسات/أسبوع<Input inputMode="numeric" value={f.sessionsPerWeek} onChange={set("sessionsPerWeek")} /></label>
            <label className="grid gap-1">عدد الأسابيع<Input inputMode="numeric" value={f.durationWeeks} onChange={set("durationWeeks")} /></label>
            <label className="grid gap-1">دقائق الجلسة<Input inputMode="numeric" value={f.sessionMinutes} onChange={set("sessionMinutes")} /></label>
          </div>
          <label className="grid gap-1">الأهداف<Textarea rows={3} value={f.goals} onChange={set("goals")} /></label>
          <label className="grid gap-1">التقييم والقياسات<Textarea rows={3} value={f.assessment} onChange={set("assessment")} /></label>

          <div className="space-y-2 rounded-md border p-2">
            <p className="font-semibold">الأجهزة ودرجةُ الدليل</p>
            {lines.map((l, i) => (
              <div key={l.deviceId} className="grid gap-2 sm:grid-cols-[1fr_9rem_5rem_auto] items-start border-b pb-2" data-testid={`pf-device-${i}`}>
                <div><div className="font-medium">{nameOf(l.deviceId)?.nameAr}</div>
                  <Input className="mt-1" placeholder="المعاملات (الشدّة، التردّد، الموضع…)" value={l.parameters ?? ""}
                    onChange={(e) => setLines((xs) => xs.map((x, j) => (j === i ? { ...x, parameters: e.target.value || null } : x)))} />
                  <Input className="mt-1" placeholder="ملاحظة" value={l.note ?? ""}
                    onChange={(e) => setLines((xs) => xs.map((x, j) => (j === i ? { ...x, note: e.target.value || null } : x)))} /></div>
                <Select value={l.evidence} onValueChange={(v) => setLines((xs) => xs.map((x, j) => (j === i ? { ...x, evidence: v as EvidenceLevel } : x)))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVIDENCE_LEVELS.map((e) => <SelectItem key={e} value={e}>{EVIDENCE_LABELS[e]}</SelectItem>)}</SelectContent>
                </Select>
                <Input inputMode="numeric" placeholder="دقائق" value={l.minutes ?? ""}
                  onChange={(e) => setLines((xs) => xs.map((x, j) => (j === i ? { ...x, minutes: e.target.value ? Number(e.target.value) : null } : x)))} />
                <Button variant="ghost" size="icon" onClick={() => setLines((xs) => xs.filter((_, j) => j !== i))} aria-label="إزالة الجهاز"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            {unused.length > 0 && (
              <Select value="" onValueChange={(v) => setLines((xs) => [...xs, { deviceId: Number(v), evidence: "recommended", parameters: null, minutes: null, note: null }])}>
                <SelectTrigger className="w-60" data-testid="pf-add-device"><SelectValue placeholder="+ أضف جهازاً" /></SelectTrigger>
                <SelectContent>{unused.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nameAr} — {d.nameEn}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>

          <label className="grid gap-1">التمارين والبرنامج المنزلي<Textarea rows={4} value={f.exercises} onChange={set("exercises")} /></label>
          <label className="grid gap-1">موانع الاستعمال<Textarea rows={3} value={f.contraindications} onChange={set("contraindications")} /></label>
          <label className="grid gap-1">احتياطات<Textarea rows={2} value={f.precautions} onChange={set("precautions")} /></label>

          <div className="space-y-2 rounded-md border p-2">
            <p className="font-semibold">المراجع العالمية</p>
            {refs.map((r, i) => (
              <div key={i} className="grid gap-1 sm:grid-cols-[1fr_8rem_5rem_1fr_auto] items-center" dir="ltr">
                <Input placeholder="Title" value={r.title} onChange={(e) => setRefs((xs) => xs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Input placeholder="Org" value={r.org ?? ""} onChange={(e) => setRefs((xs) => xs.map((x, j) => (j === i ? { ...x, org: e.target.value } : x)))} />
                <Input placeholder="Year" value={r.year ?? ""} onChange={(e) => setRefs((xs) => xs.map((x, j) => (j === i ? { ...x, year: e.target.value ? Number(e.target.value) : null } : x)))} />
                <Input placeholder="https://…" value={r.url ?? ""} onChange={(e) => setRefs((xs) => xs.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <Button variant="ghost" size="icon" onClick={() => setRefs((xs) => xs.filter((_, j) => j !== i))} aria-label="حذف المرجع"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRefs((xs) => [...xs, { title: "", org: null, year: null, url: null }])}>+ مرجع</Button>
          </div>
          {initial?.status === "approved" && (
            <p className="text-xs text-amber-800">تعديلُ بروتوكولٍ معتمَد يعيده مسوّدةً ما لم تكن المشرفَ العام أو المسؤول.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()} data-testid="pf-save">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImageDialog({ protocolId, onClose }: { protocolId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("file", file!); fd.append("caption", caption); fd.append("credit", credit); fd.append("sourceUrl", sourceUrl);
      const r = await fetch(`/api/physio/protocols/${protocolId}/images`, { method: "POST", body: fd, credentials: "include" });
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/physio/protocols", protocolId] }); toast({ title: "أُضيفت الصورة" }); onClose(); },
    onError: (e) => toast({ title: "تعذّر الرفع", description: errText(e), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>صورة توضيحية</DialogTitle></DialogHeader>
        <div className="grid gap-2 text-sm">
          <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <label className="grid gap-1">الوصف<Input value={caption} onChange={(e) => setCaption(e.target.value)} /></label>
          <label className="grid gap-1">المصدر (مثل BTL أو Physiopedia)<Input value={credit} onChange={(e) => setCredit(e.target.value)} /></label>
          <label className="grid gap-1">رابط المصدر<Input dir="ltr" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
          <p className="text-xs text-muted-foreground">صورٌ من مصادر عالمية بنسبتها — للاستعمال الداخليّ.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={!file || send.isPending} onClick={() => send.mutate()}>رفع</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ توفّرُ الأجهزة بالفروع ═════════════════════════════════════════════════════
function DeviceAvailability() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const m = useQuery<Matrix>({ queryKey: ["/api/physio/devices"] });
  const toggle = useMutation({
    mutationFn: async (v: { deviceId: number; branchId: number; available: boolean }) =>
      (await apiRequest("PUT", `/api/physio/devices/${v.deviceId}/branches/${v.branchId}`, { available: v.available })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/physio/devices"] }); qc.invalidateQueries({ queryKey: ["/api/physio/protocols"] }); },
    onError: (e) => toast({ title: "تعذّر", description: errText(e), variant: "destructive" }),
  });
  if (!m.data) return <p className="text-sm text-muted-foreground pt-3">جارٍ التحميل…</p>;
  const has = (d: number, b: number) => m.data!.available.includes(`${d}:${b}`);
  return (
    <div className="pt-3 space-y-2">
      <p className="text-sm text-muted-foreground">أيُّ جهازٍ موجودٌ في أيّ فرع — يظهر في كلّ بروتوكول، وتُبنى عليه خطّةُ المريض في فرعه.{m.data.canManage ? "" : " (للعرض — يضبطه المشرفُ العام والمسؤول.)"}</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm" data-testid="device-matrix">
          <thead className="bg-muted/50"><tr><th className="text-right p-2">الجهاز</th>{m.data.branches.map((b) => <th key={b.id} className="p-2 text-center whitespace-nowrap">{b.name}</th>)}</tr></thead>
          <tbody>
            {m.data.devices.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-2"><div>{d.nameAr}</div><div className="text-xs text-muted-foreground text-right" dir="ltr">{d.nameEn}</div></td>
                {m.data!.branches.map((b) => (
                  <td key={b.id} className="p-2 text-center">
                    {m.data!.canManage
                      ? <Switch checked={has(d.id, b.id)} disabled={toggle.isPending} onCheckedChange={(v) => toggle.mutate({ deviceId: d.id, branchId: b.id, available: v })} data-testid={`avail-${d.code}-${b.id}`} />
                      : (has(d.id, b.id) ? "✓" : "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
