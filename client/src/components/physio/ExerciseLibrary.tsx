// **مكتبةُ التمارين** (ترحيل ١١٨، §4.cx) — بطاقةُ التمرين بصورها وخطواتها، ونافذتُها، ومحرّرُها، وتبويبا «مكتبة التمارين» و«الصور المطلوبة».
// ملاحظةُ المشرف العام: «لكلّ تمرينٍ صورٌ وطريقةُ أدائه حتى يُعمل صحيحاً». فالبطاقةُ تقول الهدفَ والبداية والخطواتِ مرقّمة والجرعة
// والأخطاءَ الشائعة والأسهلَ والأصعب ومتى يتوقّف — وصورةٌ لم تصل تُعرض «صورة منتظرة» برمزها وكلمات بحثها، لا فراغاً ولا رابطاً مكسوراً.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Copy, Home, ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { localizedText, type ProtocolLang } from "@shared/physio_protocols";
import {
  BODY_REGIONS, BODY_REGION_LABELS, BODY_REGION_LABELS_EN, EXERCISE_KINDS, EXERCISE_KIND_LABELS, EXERCISE_KIND_LABELS_EN,
  doseLine, mergeDose, textLines, type BodyRegion, type Dose, type ExerciseKind,
} from "@shared/physio_exercises";

export interface ExerciseImageView {
  key: string; captionAr: string; captionEn: string; search: string; url: string | null; credit: string | null; sourceUrl: string | null;
}
export interface ExerciseCard {
  id: number; code: string; nameAr: string; nameEn: string; kind: ExerciseKind; region: BodyRegion;
  sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  perSide: boolean; homeSuitable: boolean; images: ExerciseImageView[]; status: "draft" | "approved"; isArchived: boolean;
  approvedByName?: string | null; [k: string]: any;
}

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

const L = {
  ar: {
    purpose: "الهدف", start: "وضعيةُ البداية", steps: "طريقةُ الأداء", dose: "الجرعة", cues: "أخطاءٌ شائعة وتصحيحُها", easier: "أسهل",
    harder: "أصعب", stopIf: "توقّف إذا", equipment: "الأدوات", home: "يصلح للبيت", waiting: "صورة منتظرة", search: "كلمات البحث",
    draft: "تمرينٌ غير معتمد بعد", approvedBy: "اعتمده", usedIn: "يُستعمل في", phase: "المرحلة", fallback: "لم تُكتب العربيةُ بعد — المعروضُ الإنكليزية",
    source: "المصدر",
  },
  en: {
    purpose: "Purpose", start: "Starting position", steps: "How to perform", dose: "Dose", cues: "Common errors and corrections", easier: "Easier",
    harder: "Harder", stopIf: "Stop if", equipment: "Equipment", home: "Home-suitable", waiting: "Image pending", search: "Search words",
    draft: "Exercise not yet approved", approvedBy: "Approved by", usedIn: "Used in", phase: "Phase", fallback: "English not written yet — Arabic shown",
    source: "Source",
  },
} as const;
export const exerciseLabels = (lang: ProtocolLang) => L[lang];
const kindLabel = (k: ExerciseKind, lang: ProtocolLang) => (lang === "en" ? EXERCISE_KIND_LABELS_EN : EXERCISE_KIND_LABELS)[k] ?? k;
const regionLabel = (r: BodyRegion, lang: ProtocolLang) => (lang === "en" ? BODY_REGION_LABELS_EN : BODY_REGION_LABELS)[r] ?? r;

// ══ الصورة — أو «صورة منتظرة» برمزها وكلمات بحثها ═══════════════════════════════════════════════
export function ExerciseImage({ img, lang, compact = false }: { img: ExerciseImageView; lang: ProtocolLang; compact?: boolean }) {
  const caption = lang === "en" ? img.captionEn || img.captionAr : img.captionAr || img.captionEn;
  if (img.url) {
    return (
      <figure className="space-y-1" data-testid={`exercise-image-${img.key}`}>
        <img src={img.url} alt={caption} loading="lazy" className={`w-full ${compact ? "h-16" : "aspect-[4/3]"} object-contain bg-white rounded border`} />
        {!compact && <figcaption className="text-xs text-muted-foreground">{caption}{img.credit ? ` — ${L[lang].source}: ${img.credit}` : ""}</figcaption>}
      </figure>
    );
  }
  if (compact) {
    return <div className="h-16 w-full rounded border border-dashed grid place-items-center text-muted-foreground bg-muted/30" aria-label={L[lang].waiting}><ImageOff className="w-5 h-5" /></div>;
  }
  return (
    <figure className="rounded border border-dashed bg-muted/30 p-2 space-y-1 text-xs" data-testid={`exercise-image-waiting-${img.key}`}>
      <div className="aspect-[4/3] grid place-items-center text-muted-foreground"><div className="text-center space-y-1"><ImageOff className="w-6 h-6 mx-auto" /><div>{L[lang].waiting}</div></div></div>
      <figcaption className="space-y-0.5">
        <div>{caption}</div>
        <div className="font-mono text-[11px] text-muted-foreground break-all" dir="ltr">{img.key} · {img.search}</div>
      </figcaption>
    </figure>
  );
}

// ══ البطاقةُ كاملة ════════════════════════════════════════════════════════════════════════════
export function ExerciseCardBody({ e, phaseDose, phaseNote, lang }: {
  e: ExerciseCard; phaseDose?: Partial<Dose> | null; phaseNote?: { note: string | null; noteEn: string | null } | null; lang: ProtocolLang;
}) {
  const t = L[lang];
  const txt = (field: string) => localizedText(e, field, lang);
  const other = lang === "en" ? "rtl" : "ltr";
  const block = (field: string, title: string, mode: "text" | "steps" | "list" = "text", tone?: "danger") => {
    const v = txt(field);
    if (!v.text) return null;
    const items = mode === "text" ? [] : textLines(v.text);
    return (
      <div className={`rounded-md border p-2.5 ${tone === "danger" ? "border-red-300 bg-red-50" : "bg-white"}`}>
        <div className="font-semibold text-sm mb-1">{title}{v.fallback && <span className="ms-2 text-[11px] font-normal text-muted-foreground">({t.fallback})</span>}</div>
        <div dir={v.fallback ? other : undefined}>
          {mode === "text" && <p className="text-sm whitespace-pre-wrap leading-7">{v.text}</p>}
          {mode === "steps" && <ol className="list-decimal ps-5 space-y-1 text-sm leading-7">{items.map((s, i) => <li key={i}>{s}</li>)}</ol>}
          {mode === "list" && <ul className="list-disc ps-5 space-y-1 text-sm leading-7">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>}
        </div>
      </div>
    );
  };
  const dose = doseLine(mergeDose(e, phaseDose ?? null), e.perSide, lang);
  const note = phaseNote ? localizedText(phaseNote, "note", lang).text : null;
  return (
    <div className="space-y-3" data-testid={`exercise-card-${e.code}`}>
      {e.images.length > 0 && (
        <div className={`grid gap-2 ${e.images.length > 1 ? "grid-cols-2" : "grid-cols-1 max-w-sm"}`}>
          {e.images.map((img) => <ExerciseImage key={img.key} img={img} lang={lang} />)}
        </div>
      )}
      {(dose || note) && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-sm">
          <span className="font-semibold">{t.dose}: </span><span data-testid="exercise-dose">{dose || "—"}</span>
          {note && <div className="text-xs mt-1">{note}</div>}
        </div>
      )}
      {block("purpose", t.purpose)}
      {block("startPosition", t.start)}
      {block("steps", t.steps, "steps")}
      {block("cues", t.cues, "list")}
      <div className="grid gap-3 sm:grid-cols-2">
        {block("easier", t.easier)}
        {block("harder", t.harder)}
      </div>
      {block("stopIf", t.stopIf, "text", "danger")}
      {block("equipment", t.equipment)}
    </div>
  );
}

// ══ نافذةُ التمرين: البطاقة، والاعتماد والتعديل لمن يملكهما ═══════════════════════════════════════
export function ExerciseDialog({ exerciseId, lang, phaseDose, phaseNote, onClose }: {
  exerciseId: number; lang: ProtocolLang; phaseDose?: Partial<Dose> | null; phaseNote?: { note: string | null; noteEn: string | null } | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const q = useQuery<ExerciseCard & { canEdit: boolean; canApprove: boolean; usedIn: any[] }>({
    queryKey: ["/api/physio/exercises", exerciseId],
    queryFn: async () => (await apiRequest("GET", `/api/physio/exercises/${exerciseId}`)).json(),
  });
  const approve = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/physio/exercises/${exerciseId}/approve`, {})).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/physio/exercises"] }); qc.invalidateQueries({ queryKey: ["/api/physio/protocols"] }); toast({ title: "اعتُمد التمرين" }); },
    onError: (e) => toast({ title: "تعذّر", description: errText(e), variant: "destructive" }),
  });
  const t = L[lang];
  const e = q.data;
  if (editing && e) return <ExerciseEditor initial={e} onClose={() => setEditing(false)} />;
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir={lang === "en" ? "ltr" : "rtl"} className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-start pr-10 leading-8">{e ? (lang === "en" ? e.nameEn : e.nameAr) : "…"}</DialogTitle>
        </DialogHeader>
        {!e ? <p className="text-sm text-muted-foreground">…</p> : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground" dir={lang === "en" ? "rtl" : "ltr"}>{lang === "en" ? e.nameAr : e.nameEn}</span>
              <Badge variant="secondary">{kindLabel(e.kind, lang)}</Badge>
              <Badge variant="outline">{regionLabel(e.region, lang)}</Badge>
              {e.homeSuitable && <Badge variant="outline" className="gap-1"><Home className="w-3 h-3" />{t.home}</Badge>}
              <Badge className={e.status === "approved" ? "bg-emerald-600" : "bg-amber-500"} data-testid="exercise-status">
                {e.status === "approved" ? (lang === "en" ? "Approved" : "معتمَد") : (lang === "en" ? "Draft" : "مسوّدة")}
              </Badge>
              {e.status === "approved" && e.approvedByName && <span className="text-muted-foreground">{t.approvedBy} {e.approvedByName}</span>}
            </div>
            {e.status === "draft" && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />{t.draft}</div>
            )}
            <ExerciseCardBody e={e} phaseDose={phaseDose} phaseNote={phaseNote} lang={lang} />
            {e.usedIn?.length > 0 && (
              <p className="text-xs text-muted-foreground">{t.usedIn}: {e.usedIn.map((u: any) => `${lang === "en" ? u.titleEn : u.titleAr} (${t.phase} ${u.phasePosition})`).join("، ")}</p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2" dir="rtl">
          {e?.canApprove && e.status === "draft" && !e.isArchived && (
            <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={approve.isPending} onClick={() => approve.mutate()} data-testid="exercise-approve">
              <CheckCircle2 className="w-4 h-4" /> اعتماد التمرين
            </Button>
          )}
          {e?.canEdit && !e.isArchived && <Button variant="outline" className="gap-1" onClick={() => setEditing(true)} data-testid="exercise-edit"><Pencil className="w-4 h-4" /> تعديل</Button>}
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ المحرّر — كلُّ نصٍّ بنسختيه جنباً إلى جنب ══════════════════════════════════════════════════
const BI_FIELDS: { k: string; ar: string; en: string; rows: number }[] = [
  { k: "purpose", ar: "الهدف", en: "Purpose", rows: 2 },
  { k: "startPosition", ar: "وضعيةُ البداية", en: "Starting position", rows: 2 },
  { k: "steps", ar: "الخطوات — سطرٌ لكلّ خطوة", en: "Steps — one per line", rows: 5 },
  { k: "cues", ar: "الأخطاءُ الشائعة — سطرٌ لكلّ خطأ", en: "Common errors — one per line", rows: 3 },
  { k: "easier", ar: "أسهل", en: "Easier", rows: 2 },
  { k: "harder", ar: "أصعب", en: "Harder", rows: 2 },
  { k: "stopIf", ar: "توقّف إذا", en: "Stop if", rows: 2 },
  { k: "equipment", ar: "الأدوات", en: "Equipment", rows: 1 },
  { k: "doseNote", ar: "ملاحظةُ الجرعة (عدد المرّات يومياً…)", en: "Dose note (frequency…)", rows: 1 },
];

export function ExerciseEditor({ initial, onClose }: { initial: ExerciseCard | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [f, setF] = useState<Record<string, any>>(() => {
    const base: Record<string, any> = {
      code: initial?.code ?? "", nameAr: initial?.nameAr ?? "", nameEn: initial?.nameEn ?? "",
      kind: initial?.kind ?? "strength", region: initial?.region ?? "lumbar",
      sets: initial?.sets ?? "", reps: initial?.reps ?? "", holdSeconds: initial?.holdSeconds ?? "", restSeconds: initial?.restSeconds ?? "",
      perSide: initial?.perSide ?? false, homeSuitable: initial?.homeSuitable ?? true,
    };
    for (const b of BI_FIELDS) { base[b.k] = initial?.[b.k] ?? ""; base[`${b.k}En`] = initial?.[`${b.k}En`] ?? ""; }
    return base;
  });
  const [images, setImages] = useState(() => (initial?.images ?? []).map((i) => ({ key: i.key, captionAr: i.captionAr, captionEn: i.captionEn, search: i.search })));
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: typeof e === "string" || typeof e === "boolean" ? e : e.target.value }));
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...f, images };
      const r = initial ? await apiRequest("PUT", `/api/physio/exercises/${initial.id}`, body) : await apiRequest("POST", "/api/physio/exercises", body);
      return r.json();
    },
    onSuccess: (row: any) => {
      qc.invalidateQueries({ queryKey: ["/api/physio/exercises"] });
      qc.invalidateQueries({ queryKey: ["/api/physio/protocols"] });
      toast({ title: "حُفظ التمرين", description: row?.demoted ? "عُدّل تمرينٌ معتمَد فعاد مسوّدةً بانتظار اعتماد المشرف العام." : undefined });
      onClose();
    },
    onError: (e) => toast({ title: "تعذّر الحفظ", description: errText(e), variant: "destructive" }),
  });
  const num = (k: string, label: string) => (
    <label className="grid gap-1">{label}<Input inputMode="numeric" value={f[k]} onChange={set(k)} data-testid={`ef-${k}`} /></label>
  );
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "تعديل التمرين" : "تمرين جديد"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1">اسم التمرين بالعربية<Input value={f.nameAr} onChange={set("nameAr")} data-testid="ef-nameAr" /></label>
            <label className="grid gap-1">Name in English<Input dir="ltr" value={f.nameEn} onChange={set("nameEn")} data-testid="ef-nameEn" /></label>
            <label className="grid gap-1">الرمز (إنكليزي صغير)<Input dir="ltr" value={f.code} onChange={set("code")} placeholder="bird-dog" data-testid="ef-code" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">النوع
                <Select value={f.kind} onValueChange={set("kind")}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXERCISE_KINDS.map((k) => <SelectItem key={k} value={k}>{EXERCISE_KIND_LABELS[k]}</SelectItem>)}</SelectContent></Select>
              </label>
              <label className="grid gap-1">المنطقة
                <Select value={f.region} onValueChange={set("region")}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BODY_REGIONS.map((r) => <SelectItem key={r} value={r}>{BODY_REGION_LABELS[r]}</SelectItem>)}</SelectContent></Select>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {num("sets", "المجموعات")}{num("reps", "التكرارات")}{num("holdSeconds", "الثبات (ثانية)")}{num("restSeconds", "الراحة (ثانية)")}
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><Switch checked={f.perSide} onCheckedChange={set("perSide")} /> لكلّ جانب</label>
            <label className="flex items-center gap-2"><Switch checked={f.homeSuitable} onCheckedChange={set("homeSuitable")} /> يصلح للبيت</label>
          </div>
          {BI_FIELDS.map((b) => (
            <div key={b.k} className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">{b.ar}<Textarea rows={b.rows} value={f[b.k]} onChange={set(b.k)} data-testid={`ef-${b.k}`} /></label>
              <label className="grid gap-1" dir="ltr">{b.en}<Textarea rows={b.rows} dir="ltr" value={f[`${b.k}En`]} onChange={set(`${b.k}En`)} data-testid={`ef-${b.k}En`} /></label>
            </div>
          ))}
          <div className="space-y-2 rounded-md border p-2">
            <p className="font-semibold">الصور المطلوبة — رمزٌ ثابت لكلّ صورة، وما تُظهره، وكلماتُ البحث</p>
            {images.map((img, i) => (
              <div key={i} className="grid gap-1 sm:grid-cols-[10rem_1fr_1fr_10rem_auto] items-center">
                <Input dir="ltr" placeholder="bird-dog-1" value={img.key} onChange={(e) => setImages((xs) => xs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                <Input placeholder="ما تُظهره الصورة" value={img.captionAr} onChange={(e) => setImages((xs) => xs.map((x, j) => (j === i ? { ...x, captionAr: e.target.value } : x)))} />
                <Input dir="ltr" placeholder="What it shows" value={img.captionEn} onChange={(e) => setImages((xs) => xs.map((x, j) => (j === i ? { ...x, captionEn: e.target.value } : x)))} />
                <Input dir="ltr" placeholder="search words" value={img.search} onChange={(e) => setImages((xs) => xs.map((x, j) => (j === i ? { ...x, search: e.target.value } : x)))} />
                <Button variant="ghost" size="icon" onClick={() => setImages((xs) => xs.filter((_, j) => j !== i))} aria-label="حذف الصورة"><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setImages((xs) => [...xs, { key: "", captionAr: "", captionEn: "", search: "" }])}>+ صورة</Button>
          </div>
          {initial?.status === "approved" && <p className="text-xs text-amber-800">تعديلُ تمرينٍ معتمَد يعيده مسوّدةً ما لم تكن المشرفَ العام أو المسؤول.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()} data-testid="ef-save">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ تبويبُ «مكتبة التمارين» ════════════════════════════════════════════════════════════════════
interface ExerciseRow { id: number; code: string; nameAr: string; nameEn: string; kind: ExerciseKind; region: BodyRegion; status: "draft" | "approved"; homeSuitable: boolean; images: ExerciseImageView[]; protocolCount: number }

export function ExerciseLibraryTab({ lang, canEdit }: { lang: ProtocolLang; canEdit: boolean }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (region !== "all") params.set("region", region);
  if (status !== "all") params.set("status", status);
  const url = `/api/physio/exercises${params.toString() ? `?${params}` : ""}`;
  const list = useQuery<ExerciseRow[]>({ queryKey: ["/api/physio/exercises", url], queryFn: async () => (await apiRequest("GET", url)).json() });
  const rows = list.data ?? [];
  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم التمرين بالعربية أو الإنكليزية" className="pr-8" data-testid="exercise-search" />
        </div>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">كل المناطق</SelectItem>{BODY_REGIONS.map((r) => <SelectItem key={r} value={r}>{BODY_REGION_LABELS[r]}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="approved">معتمَدة</SelectItem><SelectItem value="draft">مسوّدات</SelectItem></SelectContent>
        </Select>
        {canEdit && <Button onClick={() => setCreating(true)} className="gap-1" data-testid="exercise-new"><Plus className="w-4 h-4" /> تمرين جديد</Button>}
      </div>
      {list.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        : rows.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">لا تمارين بهذه الشروط.</CardContent></Card>
        : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <button key={r.id} type="button" onClick={() => setOpen(r.id)} className="text-start rounded-lg border bg-white hover:border-primary p-2 flex gap-2 min-w-0" data-testid={`exercise-row-${r.code}`}>
                <div className="w-20 shrink-0">{r.images[0] ? <ExerciseImage img={r.images[0]} lang={lang} compact /> : <div className="h-16 rounded border border-dashed" />}</div>
                <div className="min-w-0 space-y-1">
                  <div className="font-semibold text-sm leading-6">{lang === "en" ? r.nameEn : r.nameAr}</div>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    <Badge variant="secondary">{kindLabel(r.kind, lang)}</Badge>
                    <Badge className={r.status === "approved" ? "bg-emerald-600" : "bg-amber-500"}>{r.status === "approved" ? "معتمَد" : "مسوّدة"}</Badge>
                    {r.images.some((i) => !i.url) && <Badge variant="outline" className="gap-1"><ImageOff className="w-3 h-3" />{r.images.filter((i) => !i.url).length}</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      {open !== null && <ExerciseDialog exerciseId={open} lang={lang} onClose={() => setOpen(null)} />}
      {creating && <ExerciseEditor initial={null} onClose={() => setCreating(false)} />}
    </div>
  );
}

// ══ تبويبُ «الصور المطلوبة» — للمحرّرين: ما يُبحث عنه، ورمزُ تسمية الملفّ ══════════════════════════
interface MissingRow { key: string; exerciseId: number; exerciseCode: string; nameAr: string; nameEn: string; captionAr: string; captionEn: string; search: string; protocols: string[] }

export function MissingImagesTab() {
  const { toast } = useToast();
  const q = useQuery<MissingRow[]>({ queryKey: ["/api/physio/exercises/missing-images"] });
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "نُسخ" }); } catch { toast({ title: text }); }
  };
  if (!q.data) return <p className="text-sm text-muted-foreground pt-3">جارٍ التحميل…</p>;
  if (!q.data.length) return <p className="text-sm text-muted-foreground pt-3">وصلت كلُّ الصور المخطَّطة.</p>;
  return (
    <div className="pt-3 space-y-2">
      <p className="text-sm text-muted-foreground">
        لكلّ صورةٍ كلماتُ بحث، وما يجب أن تُظهره. سمِّ ملفَّ الصورة برمزها كما هو، فيعرف النظامُ مكانها. الصورُ المستعملة في بروتوكولٍ أوّلاً.
      </p>
      <div className="grid gap-2 md:grid-cols-2" data-testid="missing-images">
        {q.data.map((m) => (
          <div key={m.key} className="rounded-md border bg-white p-2.5 space-y-1 text-sm min-w-0">
            <div className="font-semibold">{m.nameAr}</div>
            <div>{m.captionAr}</div>
            <div className="flex flex-wrap items-center gap-2 text-xs" dir="ltr">
              <button type="button" onClick={() => copy(m.search)} className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5"><Copy className="w-3 h-3" />{m.search}</button>
              <button type="button" onClick={() => copy(m.key)} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono"><Copy className="w-3 h-3" />{m.key}</button>
            </div>
            {m.protocols.length > 0 && <div className="text-[11px] text-muted-foreground">{m.protocols.join("، ")}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
