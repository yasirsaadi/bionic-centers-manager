// **البرنامجُ على مراحل** في صفحة البروتوكول (ترحيل ١١٨، §4.cx): لكلّ مرحلةٍ مدّتُها وأهدافُها وما يُقال للمريض وتمارينُها بجرعتها
// ومعيارُ الانتقال وملاحظاتٌ للمعالج — والتمرينُ يُفتح بطاقةً كاملة بصورها. ومحرّرُ المراحل لكاتبي البروتوكولات.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckCircle2, GraduationCap, Home, ListOrdered, MessageCircle, Pencil, Plus, Stethoscope, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { localizedText, type ProtocolLang } from "@shared/physio_protocols";
import { arDigits, doseLine, mergeDose } from "@shared/physio_exercises";
import { ExerciseDialog, ExerciseImage, type ExerciseCard } from "./ExerciseLibrary";

export interface PhaseExercise {
  exerciseId: number; sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNote: string | null; doseNoteEn: string | null; note: string | null; noteEn: string | null; exercise: ExerciseCard;
}
export interface Phase {
  id: number; position: number; nameAr: string; nameEn: string; exercises: PhaseExercise[]; [k: string]: any;
}

const T = {
  ar: {
    title: "البرنامج على مراحل", phase: "المرحلة", goals: "الأهداف", education: "ما يُقال للمريض", exercises: "التمارين",
    criteria: "معيارُ الانتقال", notes: "ملاحظاتٌ للمعالج", none: "لا مراحلَ مفصّلة بعد لهذا البروتوكول.", edit: "تعديل المراحل",
    add: "إضافة المراحل", draftEx: "غير معتمد", details: "البطاقة", home: "للبيت",
  },
  en: {
    title: "Programme by phase", phase: "Phase", goals: "Goals", education: "What to tell the patient", exercises: "Exercises",
    criteria: "Progression criteria", notes: "Notes for the therapist", none: "No detailed phases for this protocol yet.", edit: "Edit phases",
    add: "Add phases", draftEx: "Not approved", details: "Card", home: "Home",
  },
} as const;

export function ProtocolPhasesSection({ protocolId, phases, canEdit, isArchived, lang }: {
  protocolId: number; phases: Phase[]; canEdit: boolean; isArchived: boolean; lang: ProtocolLang;
}) {
  const t = T[lang];
  const [open, setOpen] = useState<PhaseExercise | null>(null);
  const [editing, setEditing] = useState(false);
  const other = lang === "en" ? "rtl" : "ltr";
  if (!phases.length && !canEdit) return null;
  const block = (ph: Phase, field: string, title: string, icon: React.ReactNode, tone: string) => {
    const v = localizedText(ph, field, lang);
    if (!v.text) return null;
    return (
      <div className={`rounded-md border p-2.5 ${tone}`}>
        <div className="font-semibold text-sm mb-1 flex items-center gap-1.5">{icon}{title}</div>
        <div className="text-sm whitespace-pre-wrap leading-7" dir={v.fallback ? other : undefined}>{v.text}</div>
      </div>
    );
  };
  return (
    <div className="space-y-3" data-testid="protocol-phases">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <h2 className="font-semibold flex items-center gap-1.5"><ListOrdered className="w-4 h-4 text-primary" />{t.title}</h2>
        {canEdit && !isArchived && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditing(true)} data-testid="phases-edit">
            <Pencil className="w-4 h-4" /> {phases.length ? t.edit : t.add}
          </Button>
        )}
      </div>
      {!phases.length && <p className="text-sm text-muted-foreground">{t.none}</p>}
      {phases.map((ph) => {
        const tf = localizedText(ph, "timeframe", lang).text;
        return (
          <section key={ph.id} className="rounded-lg border bg-white overflow-hidden" data-testid={`phase-${ph.position}`}>
            <header className="bg-primary/5 border-b px-3 py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="inline-grid place-items-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                {lang === "en" ? ph.position : arDigits(ph.position)}
              </span>
              <span className="font-semibold">{lang === "en" ? ph.nameEn : ph.nameAr}</span>
              {tf && <span className="text-xs text-muted-foreground">{tf}</span>}
            </header>
            <div className="p-3 space-y-3">
              {block(ph, "goals", t.goals, null, "bg-white")}
              {block(ph, "education", t.education, <MessageCircle className="w-4 h-4 text-sky-700" />, "border-sky-200 bg-sky-50")}
              {ph.exercises.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-semibold text-sm">{t.exercises}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ph.exercises.map((x) => {
                      const e = x.exercise;
                      const note = localizedText(x, "note", lang).text;
                      return (
                        <button key={x.exerciseId} type="button" onClick={() => setOpen(x)}
                          className="text-start rounded-md border hover:border-primary p-2 flex gap-2 min-w-0 bg-white" data-testid={`phase-${ph.position}-exercise-${e.code}`}>
                          <div className="w-20 shrink-0">{e.images[0] ? <ExerciseImage img={e.images[0]} lang={lang} compact /> : <div className="h-16 rounded border border-dashed" />}</div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="font-medium text-sm leading-6">{lang === "en" ? e.nameEn : e.nameAr}</div>
                            <div className="text-xs text-primary leading-5">{doseLine(mergeDose(e, x), e.perSide, lang)}</div>
                            {note && <div className="text-xs text-muted-foreground leading-5">{note}</div>}
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {e.homeSuitable && <Badge variant="outline" className="gap-0.5 px-1.5 py-0"><Home className="w-3 h-3" />{t.home}</Badge>}
                              {e.status !== "approved" && <Badge variant="outline" className="px-1.5 py-0 border-amber-300 text-amber-800">{t.draftEx}</Badge>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {block(ph, "progressCriteria", t.criteria, <CheckCircle2 className="w-4 h-4 text-emerald-700" />, "border-emerald-200 bg-emerald-50")}
              {block(ph, "notes", t.notes, <Stethoscope className="w-4 h-4 text-muted-foreground" />, "bg-muted/30")}
            </div>
          </section>
        );
      })}
      {open && <ExerciseDialog exerciseId={open.exerciseId} lang={lang} phaseDose={open} phaseNote={open} onClose={() => setOpen(null)} />}
      {editing && <PhasesEditor protocolId={protocolId} initial={phases} onClose={() => setEditing(false)} />}
    </div>
  );
}

// ══ محرّرُ المراحل — المراحلُ كلُّها تُحفظ معاً ═════════════════════════════════════════════════════
const PHASE_FIELDS: { k: string; ar: string; en: string; rows: number }[] = [
  { k: "timeframe", ar: "المدّة (مثل: الأسبوع ١–٢)", en: "Timeframe", rows: 1 },
  { k: "goals", ar: "الأهداف", en: "Goals", rows: 2 },
  { k: "education", ar: "ما يُقال للمريض", en: "Patient education", rows: 4 },
  { k: "progressCriteria", ar: "معيارُ الانتقال", en: "Progression criteria", rows: 4 },
  { k: "notes", ar: "ملاحظاتٌ للمعالج", en: "Notes for the therapist", rows: 3 },
];
type EditExercise = { exerciseId: number; sets: string; reps: string; holdSeconds: string; restSeconds: string; doseNote: string; doseNoteEn: string; note: string; noteEn: string };
type EditPhase = { nameAr: string; nameEn: string; exercises: EditExercise[]; [k: string]: any };

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function PhasesEditor({ protocolId, initial, onClose }: { protocolId: number; initial: Phase[]; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const lib = useQuery<{ id: number; nameAr: string; nameEn: string; status: string }[]>({ queryKey: ["/api/physio/exercises"] });
  const nameOf = useMemo(() => new Map((lib.data ?? []).map((e) => [e.id, e.nameAr])), [lib.data]);
  initial.forEach((ph) => ph.exercises.forEach((x) => { if (!nameOf.has(x.exerciseId)) nameOf.set(x.exerciseId, x.exercise.nameAr); }));
  const [phases, setPhases] = useState<EditPhase[]>(() => initial.map((ph) => {
    const p: EditPhase = { nameAr: ph.nameAr, nameEn: ph.nameEn, exercises: ph.exercises.map((x) => ({
      exerciseId: x.exerciseId, sets: s(x.sets), reps: s(x.reps), holdSeconds: s(x.holdSeconds), restSeconds: s(x.restSeconds),
      doseNote: s(x.doseNote), doseNoteEn: s(x.doseNoteEn), note: s(x.note), noteEn: s(x.noteEn) })) };
    for (const f of PHASE_FIELDS) { p[f.k] = s(ph[f.k]); p[`${f.k}En`] = s(ph[`${f.k}En`]); }
    return p;
  }));
  const setPhase = (i: number, patch: Partial<EditPhase>) => setPhases((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setEx = (i: number, k: number, patch: Partial<EditExercise>) =>
    setPhase(i, { exercises: phases[i].exercises.map((x, j) => (j === k ? { ...x, ...patch } : x)) });
  const move = (i: number, k: number, d: -1 | 1) => {
    const xs = [...phases[i].exercises];
    const to = k + d;
    if (to < 0 || to >= xs.length) return;
    [xs[k], xs[to]] = [xs[to], xs[k]];
    setPhase(i, { exercises: xs });
  };
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", `/api/physio/protocols/${protocolId}/phases`, { phases })).json(),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["/api/physio/protocols"] });
      toast({ title: "حُفظت المراحل", description: r?.demoted ? "عُدّل بروتوكولٌ معتمَد فعاد مسوّدةً بانتظار اعتماد المشرف العام." : undefined });
      onClose();
    },
    onError: (e: any) => {
      const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
      let msg = raw; try { msg = JSON.parse(raw)?.error ?? raw; } catch { /* نصٌّ خام */ }
      toast({ title: "تعذّر الحفظ", description: msg, variant: "destructive" });
    },
  });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>مراحل البرنامج</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          {phases.map((ph, i) => (
            <div key={i} className="rounded-md border p-2.5 space-y-2" data-testid={`phase-editor-${i + 1}`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold">المرحلة {arDigits(i + 1)}</span>
                <Button variant="ghost" size="sm" className="ms-auto text-red-700 gap-1" onClick={() => setPhases((xs) => xs.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /> حذف المرحلة</Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid gap-1">اسم المرحلة<Input value={ph.nameAr} onChange={(e) => setPhase(i, { nameAr: e.target.value })} /></label>
                <label className="grid gap-1" dir="ltr">Phase name<Input dir="ltr" value={ph.nameEn} onChange={(e) => setPhase(i, { nameEn: e.target.value })} /></label>
              </div>
              {PHASE_FIELDS.map((f) => (
                <div key={f.k} className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1">{f.ar}<Textarea rows={f.rows} value={ph[f.k]} onChange={(e) => setPhase(i, { [f.k]: e.target.value })} /></label>
                  <label className="grid gap-1" dir="ltr">{f.en}<Textarea dir="ltr" rows={f.rows} value={ph[`${f.k}En`]} onChange={(e) => setPhase(i, { [`${f.k}En`]: e.target.value })} /></label>
                </div>
              ))}
              <div className="space-y-1.5 rounded border p-2 bg-muted/20">
                <p className="font-semibold">تمارينُ المرحلة — الخانةُ الفارغة تأخذ جرعةَ البطاقة</p>
                {ph.exercises.map((x, k) => (
                  <div key={x.exerciseId} className="rounded border bg-white p-1.5 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="font-medium flex-1 min-w-0">{nameOf.get(x.exerciseId) ?? `#${x.exerciseId}`}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, k, -1)} aria-label="أعلى"><ArrowUp className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, k, 1)} aria-label="أسفل"><ArrowDown className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-700" onClick={() => setPhase(i, { exercises: ph.exercises.filter((_, j) => j !== k) })} aria-label="إزالة"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <Input inputMode="numeric" placeholder="مجموعات" value={x.sets} onChange={(e) => setEx(i, k, { sets: e.target.value })} />
                      <Input inputMode="numeric" placeholder="تكرار" value={x.reps} onChange={(e) => setEx(i, k, { reps: e.target.value })} />
                      <Input inputMode="numeric" placeholder="ثبات ث" value={x.holdSeconds} onChange={(e) => setEx(i, k, { holdSeconds: e.target.value })} />
                      <Input inputMode="numeric" placeholder="راحة ث" value={x.restSeconds} onChange={(e) => setEx(i, k, { restSeconds: e.target.value })} />
                    </div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      <Input placeholder="ملاحظةُ الجرعة في هذه المرحلة" value={x.doseNote} onChange={(e) => setEx(i, k, { doseNote: e.target.value })} />
                      <Input dir="ltr" placeholder="Dose note for this phase" value={x.doseNoteEn} onChange={(e) => setEx(i, k, { doseNoteEn: e.target.value })} />
                      <Input placeholder="ملاحظة (لمن، وكيف)" value={x.note} onChange={(e) => setEx(i, k, { note: e.target.value })} />
                      <Input dir="ltr" placeholder="Note" value={x.noteEn} onChange={(e) => setEx(i, k, { noteEn: e.target.value })} />
                    </div>
                  </div>
                ))}
                <Select value="" onValueChange={(v) => setPhase(i, { exercises: [...ph.exercises, { exerciseId: Number(v), sets: "", reps: "", holdSeconds: "", restSeconds: "", doseNote: "", doseNoteEn: "", note: "", noteEn: "" }] })}>
                  <SelectTrigger className="w-72" data-testid={`phase-editor-${i + 1}-add`}><SelectValue placeholder="+ أضف تمريناً من المكتبة" /></SelectTrigger>
                  <SelectContent>
                    {(lib.data ?? []).filter((e) => !ph.exercises.some((x) => x.exerciseId === e.id)).map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.nameAr} — {e.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          <Button variant="outline" className="gap-1" onClick={() => setPhases((xs) => [...xs, { nameAr: "", nameEn: "", exercises: [], ...Object.fromEntries(PHASE_FIELDS.flatMap((f) => [[f.k, ""], [`${f.k}En`, ""]])) }])}>
            <Plus className="w-4 h-4" /> مرحلة
          </Button>
          <p className="text-xs text-amber-800 flex items-center gap-1"><GraduationCap className="w-4 h-4" />تعديلُ مراحل بروتوكولٍ معتمَد يعيده مسوّدةً ما لم تكن المشرفَ العام أو المسؤول.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()} data-testid="phases-save">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
