// **«اضغطه يا سليم»** (§4.dy — ترحيل ١٣٩): زرٌّ واضح في صفحة البروتوكول يجمع كلَّ ما ينتظر قرارَ المشرف العام — المحسوبَ من البيانات الآن
// (الاعتماد، وإعداداتُ الأجهزة، والبطاقات، والمقاييس، والصورُ للعلم) والبنودَ المكتوبة التي كان المساعدُ يمرّرها عبر المالك، وسليم يعلّم كلّاً منها «تمّ» بقراره.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, ClipboardCheck, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  CHECKLIST_NOTE_MAX, CHECKLIST_TOPIC_LABELS, liveChecks, openItemsCount, supervisorTodoCount,
  type ChecklistItem, type ChecklistTopic, type LiveCheck,
} from "@shared/physio_supervisor_checklist";
import type { ProtocolLang } from "@shared/physio_protocols";

type ProtocolLike = Parameters<typeof liveChecks>[0] & { id: number; titleAr: string; titleEn: string; checklist?: ChecklistItem[] };

const T = {
  ar: {
    button: "اضغطه يا سليم", title: "ما ينتظرك يا سليم في هذا البروتوكول", now: "من البيانات الآن", asked: "ما يسألك عنه المساعد",
    nothingAsked: "لا أسئلةَ مكتوبة لهذا البروتوكول — يكفي ما في «من البيانات الآن».", done: "تمّ", reopen: "إعادته مفتوحاً",
    decision: "قرارُك (اختياريّ) — مثلاً: «أبقيتُه مساعداً» أو «صار ١٨»", save: "تمّ — احفظ", cancel: "إلغاء", by: "علّمه",
    allDone: "لا شيءَ ينتظرك هنا الآن.", left: (n: number) => `ينتظرك: ${n.toLocaleString("ar-IQ")}`, todo: "ينتظرك", ok: "تمّ", info: "للعلم",
    open: (o: number, all: number) => `(مفتوحٌ ${o.toLocaleString("ar-IQ")} من ${all.toLocaleString("ar-IQ")})`,
  },
  en: {
    button: "Saleem, press here", title: "What awaits you in this protocol, Saleem", now: "From the data now", asked: "What the assistant asks you",
    nothingAsked: "No written questions for this protocol — 'From the data now' is enough.", done: "Done", reopen: "Reopen",
    decision: "Your decision (optional) — e.g. 'kept as an adjunct' or 'now 18'", save: "Done — save", cancel: "Cancel", by: "Marked by",
    allDone: "Nothing awaits you here now.", left: (n: number) => `${n} waiting`, todo: "Waiting", ok: "Done", info: "FYI",
    open: (o: number, all: number) => `(${o} of ${all} open)`,
  },
};

const LIVE_TONE: Record<LiveCheck["state"], string> = {
  todo: "border-amber-300 bg-amber-50 text-amber-950",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-slate-200 bg-slate-50 text-slate-700",
};

export function SupervisorChecklistButton({ protocol, lang }: { protocol: ProtocolLike; lang: ProtocolLang }) {
  const [open, setOpen] = useState(false);
  const t = T[lang];
  const todo = supervisorTodoCount(protocol);
  return (
    <>
      <Button onClick={() => setOpen(true)} data-testid="saleem-button"
        className="gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold shadow-md ring-2 ring-indigo-300">
        <ClipboardCheck className="w-4 h-4" /> {t.button}
        <span className={`rounded-full px-2 py-0.5 text-xs ${todo ? "bg-amber-400 text-amber-950" : "bg-emerald-400 text-emerald-950"}`} data-testid="saleem-button-count">
          {todo ? t.left(todo) : "✓"}
        </span>
      </Button>
      {open && <SupervisorChecklistDialog protocol={protocol} lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
}

function SupervisorChecklistDialog({ protocol, lang, onClose }: { protocol: ProtocolLike; lang: ProtocolLang; onClose: () => void }) {
  const t = T[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  const live = liveChecks(protocol);
  const items = protocol.checklist ?? [];
  const todo = supervisorTodoCount(protocol);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={dir} data-testid="saleem-dialog">
        <DialogHeader>
          <DialogTitle className={lang === "en" ? "text-left" : "text-right"}>{t.title}</DialogTitle>
          <p className="text-sm font-semibold text-indigo-800" dir="auto">{lang === "en" ? protocol.titleEn : protocol.titleAr}</p>
          <p className="text-xs text-muted-foreground" data-testid="saleem-dialog-summary">{todo ? t.left(todo) : t.allDone}</p>
        </DialogHeader>

        <section className="space-y-1.5">
          <h3 className="font-semibold text-sm">{t.now}</h3>
          {live.map((c) => (
            <div key={c.key} className={`flex gap-2 rounded-md border px-3 py-2 text-sm ${LIVE_TONE[c.state]}`} data-testid={`saleem-live-${c.key}`} data-state={c.state}>
              {c.state === "done" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : c.state === "todo" ? <Circle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
              <span className="flex-1">{lang === "en" ? c.en : c.ar}</span>
              <span className="text-[11px] font-semibold shrink-0">{c.state === "todo" ? t.todo : c.state === "done" ? t.ok : t.info}</span>
            </div>
          ))}
        </section>

        <section className="space-y-1.5 pt-2">
          <h3 className="font-semibold text-sm">{t.asked} {items.length ? t.open(openItemsCount(items), items.length) : ""}</h3>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">{t.nothingAsked}</p>
            : items.map((it) => <ChecklistRow key={it.key} protocolId={protocol.id} item={it} lang={lang} />)}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistRow({ protocolId, item, lang }: { protocolId: number; item: ChecklistItem; lang: ProtocolLang }) {
  const t = T[lang];
  const qc = useQueryClient();
  const { toast } = useToast();
  const [deciding, setDeciding] = useState(false);
  const [note, setNote] = useState("");
  const save = useMutation({
    mutationFn: async (body: { done: boolean; note?: string }) =>
      (await apiRequest("POST", `/api/physio/protocols/${protocolId}/checklist/${item.key}`, body)).json(),
    onSuccess: () => { setDeciding(false); setNote(""); qc.invalidateQueries({ queryKey: ["/api/physio/protocols"] }); },
    onError: (e: any) => toast({ title: "تعذّر", description: String(e?.message ?? e), variant: "destructive" }),
  });
  const topic = CHECKLIST_TOPIC_LABELS[item.topic as ChecklistTopic];
  const done = Boolean(item.doneAt);
  return (
    <div className={`rounded-md border px-3 py-2 text-sm space-y-1.5 ${done ? "border-emerald-200 bg-emerald-50/60" : "border-indigo-200 bg-white"}`}
      data-testid={`saleem-item-${item.key}`} data-done={done ? "1" : "0"}>
      <div className="flex gap-2">
        {done ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" /> : <Circle className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600" />}
        <div className="flex-1 space-y-0.5">
          {topic && <span className="inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-900">{lang === "en" ? topic.en : topic.ar}</span>}
          <p className={done ? "text-slate-600" : ""}>{lang === "en" ? item.textEn : item.textAr}</p>
          {done && (
            <p className="text-xs text-emerald-900" data-testid={`saleem-item-done-${item.key}`}>
              {t.by} {item.doneByName ?? "—"} · {new Date(item.doneAt as string).toLocaleDateString("en-GB")}
              {item.note ? <> — <b>{item.note}</b></> : null}
            </p>
          )}
        </div>
      </div>
      {deciding ? (
        <div className="space-y-1.5">
          <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, CHECKLIST_NOTE_MAX))} placeholder={t.decision} rows={2}
            data-testid={`saleem-item-note-${item.key}`} />
          <div className="flex gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={save.isPending}
              onClick={() => save.mutate({ done: true, note })} data-testid={`saleem-item-save-${item.key}`}>{t.save}</Button>
            <Button size="sm" variant="ghost" onClick={() => setDeciding(false)}>{t.cancel}</Button>
          </div>
        </div>
      ) : done ? (
        <Button size="sm" variant="ghost" className="gap-1 text-slate-600" disabled={save.isPending}
          onClick={() => save.mutate({ done: false })} data-testid={`saleem-item-reopen-${item.key}`}><RotateCcw className="w-3.5 h-3.5" /> {t.reopen}</Button>
      ) : (
        <Button size="sm" className="gap-1 bg-indigo-700 hover:bg-indigo-800" onClick={() => setDeciding(true)} data-testid={`saleem-item-done-btn-${item.key}`}>
          <CheckCircle2 className="w-3.5 h-3.5" /> {t.done}</Button>
      )}
    </div>
  );
}
