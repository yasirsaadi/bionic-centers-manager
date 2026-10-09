// **«اقترح خطّة» بالمساعد** (§4.co — المرحلةُ الخامسة). المساعدُ يقرأ معاينةَ العلاج الطبيعي وسطرَ الأخصائيّ، ويختار من مكتبتكم وحدها،
// ويعدّل البروتوكولَ لهذا المريض داخل حدوده — والخادمُ يرفض ما خرج عنها ويقوله. والقبولُ يفتح مسوّدةً يعدّلها الأخصائيّ ويرسلها للاعتماد كالعادة.
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UNAPPROVED_PROTOCOL_BADGE, type SuggestionChange } from "@shared/physio_plans";

export interface SuggestInfo {
  enabled: boolean; exam: { date: string; diagnosis: string | null } | null;
  /** التقييمُ الأوّليّ في تلك المعاينة (§4.da المرحلة ٤) — يقرؤه المساعدُ كاملاً. */
  assessment?: { summary: string | null; planItems: string[]; painWorst: number | null } | null;
}
interface Choice { protocolId: number; reasonAr: string | null; reasonEn: string | null; titleAr?: string | null; titleEn?: string | null; status?: string | null }
export interface Suggestion {
  id: number; createdByName: string | null; createdAt: string;
  protocol: Choice; alternatives: Choice[];
  devices: { deviceId: number; minutes: number | null; nameAr: string | null; nameEn: string | null }[];
  dose: { sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null };
  changes: SuggestionChange[]; rejected: { what: string; whyAr: string }[];
  notesAr: string | null; notesEn: string | null; rationaleAr: string | null; rationaleEn: string | null;
}

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};
const DOSE_LABEL: Record<string, string> = { sessionsPerWeek: "جلسات/أسبوع", durationWeeks: "أسابيع", sessionMinutes: "دقيقة/جلسة" };
const DOSE_LABEL_EN: Record<string, string> = { sessionsPerWeek: "sessions/week", durationWeeks: "weeks", sessionMinutes: "min/session" };

/** سطرُ تعديلٍ بسببه — في نافذة الاقتراح وفي صفحة الخطّة. */
export function ChangeLine({ c, lang = "ar" }: { c: SuggestionChange; lang?: "ar" | "en" }) {
  const en = lang === "en";
  const reason = en ? (c.reasonEn ?? c.reasonAr) : c.reasonAr;
  const what = c.kind === "remove" ? (en ? `Removed ${c.nameEn}` : `حُذف ${c.nameAr}`)
    : c.kind === "minutes" ? `${en ? c.nameEn : c.nameAr}: ${c.from ?? "—"} ⟵ ${c.to} ${en ? "min" : "د"}`
    : `${(en ? DOSE_LABEL_EN : DOSE_LABEL)[c.field]}: ${c.from ?? "—"} ⟵ ${c.to}`;
  return <li><b>{what}</b> — {reason}</li>;
}

/** المربّعُ في نافذة «خطة جديدة»: السطرُ، والزرّ، والاقتراحُ ببدائله، و«افتح المسوّدة». */
export function SuggestBox({ patientId, info, onCreated }: { patientId: number; info: SuggestInfo; onCreated: (planId: number) => void }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [sg, setSg] = useState<Suggestion | null>(null);
  const ask = useMutation({
    mutationFn: async (body: { note?: string; protocolId?: number; fromSuggestionId?: number }) =>
      (await apiRequest("POST", `/api/patients/${patientId}/physio-plans/suggest`, body)).json() as Promise<Suggestion>,
    onSuccess: (r) => setSg(r),
    onError: (e) => toast({ title: "تعذّر الاقتراح", description: errText(e), variant: "destructive" }),
  });
  const accept = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/physio/suggestions/${id}/accept`, {})).json(),
    onSuccess: (row: any) => onCreated(row.id),
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  const needNote = !info.exam;
  const busy = ask.isPending || accept.isPending;

  if (!info.enabled) {
    return <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">«اقترح خطّة» يحتاج المساعدَ الذكيّ — غيرُ مفعّلٍ الآن.</div>;
  }
  if (!sg) {
    return (
      <div className="rounded-md border border-violet-200 bg-violet-50/60 p-3 space-y-2" data-testid="suggest-box">
        <div className="text-sm font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-700" /> اقترح خطّة بالمساعد</div>
        <p className="text-[11px] text-muted-foreground">
          {info.exam
            ? <>يقرأ المساعدُ معاينةَ العلاج الطبيعي ({info.exam.date}){info.exam.diagnosis ? <>: <b>{info.exam.diagnosis}</b></> : null}{info.assessment ? <> <b>وتقييمَها الأوّليّ كاملاً</b></> : null} و«سبب المراجعة» والعمر، ويختار من مكتبتكم وحدها ويعدّل البروتوكولَ داخل حدوده. لا يرى اسمَ المريض ولا هاتفه.</>
            : <>لا معاينةَ علاجٍ طبيعيّ في ملفّه — <b>اكتب سطراً عن حالته</b> ليقرأه المساعد مع العمر. لا يرى اسمَ المريض ولا هاتفه.</>}
        </p>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="bg-white"
          placeholder={needNote ? "حالةُ المريض * — مثال: ألمٌ أسفل الظهر منذ شهرين، يمتدّ للساق" : "سطرٌ عن الحالة (اختياري) — مثال: يمشي بمساعدة، تشنّجٌ في الساقين"}
          data-testid="input-suggest-note" />
        <Button size="sm" className="gap-1 bg-violet-700 hover:bg-violet-800" disabled={busy || (needNote && !note.trim())}
          onClick={() => ask.mutate({ note: note.trim() || undefined })} data-testid="button-suggest-plan">
          <Sparkles className="w-4 h-4" /> {ask.isPending ? "يقرأ المساعدُ الحالةَ والمكتبة…" : "اقترح"}
        </Button>
      </div>
    );
  }
  const p = sg.protocol;
  return (
    <div className="rounded-md border border-violet-300 bg-violet-50/60 p-3 space-y-2 text-sm" data-testid="suggest-result">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-4 h-4 text-violet-700" />
        <b data-testid="suggest-protocol">{p.titleAr}</b>
        {p.status !== "approved" && <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">{UNAPPROVED_PROTOCOL_BADGE}</Badge>}
      </div>
      {p.reasonAr && <p className="text-xs">لماذا: {p.reasonAr}</p>}
      {sg.rationaleAr && <p className="text-xs text-muted-foreground">{sg.rationaleAr}</p>}
      <div>
        <div className="text-xs font-medium">الأجهزة</div>
        <ul className="text-xs list-disc ps-5">{sg.devices.map((d) => <li key={d.deviceId}>{d.nameAr} — {d.minutes ?? "—"} د</li>)}</ul>
        <div className="text-xs mt-1">الجرعة: {sg.dose.sessionsPerWeek ?? "—"} جلسات/أسبوع × {sg.dose.durationWeeks ?? "—"} أسابيع × {sg.dose.sessionMinutes ?? "—"} دقيقة</div>
      </div>
      {sg.changes.length > 0 ? (
        <div>
          <div className="text-xs font-medium">ما غيّره عن البروتوكول لهذا المريض</div>
          <ul className="text-xs list-disc ps-5" data-testid="suggest-changes">{sg.changes.map((c, i) => <ChangeLine key={i} c={c} />)}</ul>
        </div>
      ) : <p className="text-xs text-muted-foreground">لم يغيّر شيئاً عن البروتوكول.</p>}
      {sg.notesAr && <p className="text-xs">ملاحظاتٌ لهذا المريض: {sg.notesAr}</p>}
      {sg.rejected.length > 0 && (
        <details className="text-[11px] text-amber-800" data-testid="suggest-rejected">
          <summary>رفض الخادمُ {sg.rejected.length} اقتراحاً خارج حدود البروتوكول</summary>
          <ul className="list-disc ps-5">{sg.rejected.map((r, i) => <li key={i}>{r.what} — {r.whyAr}</li>)}</ul>
        </details>
      )}
      {sg.alternatives.length > 0 && (
        <div className="border-t pt-2 space-y-1">
          <div className="text-xs font-medium">بدائل</div>
          {sg.alternatives.map((a) => (
            <div key={a.protocolId} className="flex items-center gap-2 text-xs">
              <span className="flex-1">{a.titleAr}{a.reasonAr ? ` — ${a.reasonAr}` : ""}</span>
              <Button size="sm" variant="outline" className="h-7" disabled={busy}
                onClick={() => ask.mutate({ note: note.trim() || undefined, protocolId: a.protocolId, fromSuggestionId: sg.id })}
                data-testid={`button-suggest-alt-${a.protocolId}`}>جرّب هذا</Button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">اقتراحٌ من المساعد — راجعه وعدّله في المسوّدة، ولا يُنفَّذ قبل الاعتماد.</p>
      <div className="flex gap-2">
        <Button size="sm" className="bg-violet-700 hover:bg-violet-800" disabled={busy} onClick={() => accept.mutate(sg.id)} data-testid="button-accept-suggestion">
          {accept.isPending ? "جارٍ الفتح…" : "افتح المسوّدة"}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSg(null)}>رجوع</Button>
      </div>
    </div>
  );
}

/** في صفحة الخطّة: «مقترحة بالمساعد» — ما غيّره وأسبابُه، ومَن طلبه ومتى. */
export function SuggestionSummary({ sg, lang }: { sg: Suggestion; lang: "ar" | "en" }) {
  const en = lang === "en";
  const rationale = en ? (sg.rationaleEn ?? sg.rationaleAr) : sg.rationaleAr;
  return (
    <details className="rounded-md border border-violet-200 bg-violet-50/50 p-3 text-sm print:hidden" data-testid="plan-ai-suggestion">
      <summary className="cursor-pointer font-medium">
        <Sparkles className="w-4 h-4 text-violet-700 inline" /> {en ? "Suggested by the assistant" : "مقترحة بالمساعد"}
        <span className="text-xs text-muted-foreground"> — {sg.createdByName ?? "—"} · {new Date(sg.createdAt).toLocaleDateString(en ? "en-GB" : "ar-IQ")}</span>
      </summary>
      {rationale && <p className="text-xs mt-2">{rationale}</p>}
      {sg.changes.length > 0
        ? <ul className="text-xs list-disc ps-5 mt-1">{sg.changes.map((c, i) => <ChangeLine key={i} c={c} lang={lang} />)}</ul>
        : <p className="text-xs text-muted-foreground mt-1">{en ? "No changes from the protocol." : "لم يغيّر شيئاً عن البروتوكول."}</p>}
      <p className="text-[11px] text-muted-foreground mt-1">{en ? "The original suggestion — the plan may have been edited since." : "الاقتراحُ الأصليّ — وقد تكون الخطّةُ عُدّلت بعده."}</p>
    </details>
  );
}
