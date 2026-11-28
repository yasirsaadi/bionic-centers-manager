// **«الخطّة المقترحة» — ما كتبه Opus للمعتمِد وحده** (§4.ha الفقرة ١١.٢ — خطوةُ «الخطّة المقترحة» في النموذج الذي وافق عليه المالك).
//
// بترتيب النموذج: من المكتبة أم «خارج المكتبة» ولماذا، والجرعةُ والمسارُ والمراحل، وقيودُ المعتمِدين بجانب الأجهزة، والأجهزةُ بموديل BTL
// وبرنامجه («—» حتى تُسجَّل البرامج) وقيمه الاحتياطية بوحداتها ومصدرها وإعدادات البروتوكول المكتوبة، وما حُذف وسببُه، والتمارين، وما وجده
// المراجعُ والمدقّق، **وكلُّ ملاحظةٍ كبيرة لم تُحلّ بمربّع إقرارٍ إلزاميّ**، وسجلُّ البوّابات، والمصادر. و«اعتماد» لا يعمل قبل الإقرار ولا لخطّةٍ قدُمت.
// والخادمُ يعيد الفحصَ كلَّه عند الاعتماد (`fromProposal` · `acknowledgedIssueIds`).
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, CheckCircle2, Trash2, ShieldAlert, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDateIraq } from "@/lib/utils";
import { EVIDENCE_LABELS } from "@shared/physio_protocols";
import { DEVICE_PARAM_LABELS } from "@shared/physio_exercises";
import { btlModelById, btlModelsFor, unitAr } from "@shared/btl_devices";
import { arCount, COUNT_FORMS, OPUS_OUT_OF_LIBRARY_LABEL, normalizeSourceUrl, type Issue } from "@shared/physio_agent";
import { GATE_REASONS, type BuiltDevice, type GateKind, type GateLogEntry } from "@shared/physio_agent_gates";
import { ar, arText, opusGet, opusPost, opusProposalKey, OPUS_PLANS_KEY, type OpusProposal } from "@/lib/opus_agent";

const SEVERITY_AR: Record<string, string> = { critical: "حرجة", major: "كبيرة", minor: "صغيرة" };
const KIND_AR: Record<GateKind, { t: string; c: string }> = {
  blocking: { t: "مانع", c: "bg-red-100 text-red-800" },
  removed: { t: "حُذف", c: "bg-red-100 text-red-800" },
  clamped: { t: "عُدّل", c: "bg-amber-100 text-amber-900" },
  warning: { t: "تنبيه", c: "bg-amber-100 text-amber-900" },
  info: { t: "للعلم", c: "bg-slate-100 text-slate-700" },
};

const Ltr = ({ children }: { children: React.ReactNode }) => <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="break-words">{children}</span>;

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="space-y-1.5 min-w-0" data-testid={testId}>
      <h3 className="text-sm font-bold text-slate-900 m-0">{title}</h3>
      {children}
    </section>
  );
}

function Txt({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return <div className="text-sm min-w-0"><span className="text-muted-foreground text-xs">{label}: </span><span dir="auto" className="whitespace-pre-line break-words">{value}</span></div>;
}

export function OpusProposalView({ planId }: { planId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const q = useQuery<OpusProposal>({ queryKey: opusProposalKey(planId), queryFn: () => opusGet(`/api/physio/plans/${planId}/opus-proposal`), retry: false });
  const [acks, setAcks] = useState<Set<string>>(new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const refresh = (patientId?: number) => {
    qc.invalidateQueries({ queryKey: opusProposalKey(planId) });
    qc.invalidateQueries({ queryKey: [`/api/physio/plans/${planId}`] });
    qc.invalidateQueries({ queryKey: [OPUS_PLANS_KEY] });
    qc.invalidateQueries({ queryKey: ["/api/physio/red-flag-reviews"] });
    qc.invalidateQueries({ queryKey: ["/api/physio/plans"] });
    if (patientId) {
      qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/physio-plans`] });
      qc.invalidateQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
    }
  };
  const approve = useMutation({
    mutationFn: () => opusPost<{ draftProtocolId?: number | null }>(`/api/physio/plans/${planId}/approve`, { fromProposal: true, acknowledgedIssueIds: Array.from(acks) }),
    onSuccess: (r) => {
      refresh(q.data?.plan.patientId);
      toast({ title: "اعتُمدت خطّةُ Opus", description: r?.draftProtocolId ? "وحُفظت مسوّدةَ بروتوكولٍ جديد في المكتبة لحالاتٍ مشابهة — تعتمدها من «البروتوكولات»." : "نزلت في ملفّ المريض ويراها المعالجون الآن." });
    },
    onError: (e: any) => { refresh(q.data?.plan.patientId); toast({ title: "لم تُعتمد", description: e.message, variant: "destructive" }); },
  });
  const discard = useMutation({
    mutationFn: () => opusPost(`/api/physio/plans/${planId}/opus-discard`, {}),
    onSuccess: () => { const pid = q.data?.plan.patientId; refresh(pid); toast({ title: "حُذفت الخطّة", description: "تستطيع أن تطلب من Opus كتابتَها من جديد من بطاقة المعاينة." }); if (pid) navigate(`/patients/${pid}`); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const p = q.data;
  const issuesById = useMemo(() => {
    const m = new Map<string, Issue & { from: "reviewer" | "auditor" }>();
    for (const i of p?.unresolved.reviewer ?? []) m.set(i.id, { ...i, from: "reviewer" });
    for (const i of p?.unresolved.auditor ?? []) m.set(i.id, { ...i, from: "auditor" });
    return m;
  }, [p]);
  if (q.isLoading) return <Card className="p-4 text-sm text-muted-foreground">جارٍ تحميل الخطّة المقترحة…</Card>;
  if (q.isError || !p) return <Card className="p-4 text-sm text-red-700">تعذّر تحميل الخطّة المقترحة.</Card>;
  const f = p.final;
  const out = p.plan.outOfLibrary;
  const devName = (code: string) => p.deviceNames[code]?.nameAr ?? code;
  const exName = (id: number | null) => (id === null ? "—" : p.exerciseNames[id]?.nameAr ?? `تمرين رقم ${ar(id)}`);
  const fetched = new Set(p.fetchedUrls.map(normalizeSourceUrl));
  const missingAcks = p.majorsToAcknowledge.filter((id) => !acks.has(id));
  const canApprove = !p.examStale && missingAcks.length === 0 && Boolean(f);
  const weeks = f?.totalSessions && f?.sessionsPerWeek ? Math.ceil(f.totalSessions / f.sessionsPerWeek) : null;
  const constraints = p.approverConstraints.filter((c) => c.note || c.forbiddenDevices.length);
  const auditorUnresolved = p.unresolved.auditor;
  //  **سجلُّ البوّابات**: المرّةُ الأخيرة قبل الحفظ (`saving`) هي ما في الخطّة؛ وجولاتُ الكتابة قبلها للعلم مطويّة.
  const lastAt = p.gateLog.some((g) => g.at === "saving") ? "saving" : p.gateLog.at(-1)?.at;
  const finalLog = p.gateLog.filter((g) => g.at === lastAt);
  const earlierLog = p.gateLog.filter((g) => g.at !== lastAt);

  return (
    <Card dir="rtl" className="p-3 sm:p-4 space-y-4 min-w-0 border-violet-300" style={{ boxShadow: "inset 0 3px 0 rgb(109 40 217)" }} data-testid="opus-proposal">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold m-0 flex items-center gap-1.5"><Sparkles className="w-5 h-5 text-violet-700" /> الخطّة المقترحة</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", out ? "bg-violet-100 text-violet-800" : "bg-teal-100 text-teal-800")} data-testid="opus-proposal-mode">
          {out ? `${OPUS_OUT_OF_LIBRARY_LABEL} — بناها Opus` : `من المكتبة: ${p.plan.protocolTitleAr ?? "—"}`}
        </span>
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        كتبها Opus من معاينة {p.plan.createdByName ?? "الفاحص"}{p.job?.finishedAt ? ` في ${arText(formatDateIraq(p.job.finishedAt))}` : ""}. لا يراها المعالجون ولا تُنفَّذ قبل اعتمادك.
      </p>

      {p.examStale && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900" data-testid="opus-proposal-stale">
          <b>قدُمت هذه الخطّة:</b> {p.staleText} — لا تُعتمد. احذفها وأعد الكتابة من بطاقة المعاينة.
        </div>
      )}

      {(f?.rationaleAr || p.alternatives.length > 0) && (
        <div className={cn("rounded-md p-2 text-sm space-y-1", out ? "bg-violet-50 text-violet-950" : "bg-emerald-50 text-emerald-950")}>
          {out && <div>لا يوجد في المكتبة بروتوكولٌ يناسب هذه الحالة؛ بُنيت من الإرشادات ومن بطاقات المكتبة، وراجعها مدقّقٌ ثالث. وعند الاعتماد تُحفظ مسوّدةَ بروتوكولٍ جديد.</div>}
          {f?.rationaleAr && <div dir="auto" className="whitespace-pre-line">{f.rationaleAr}</div>}
          {p.alternatives.length > 0 && (
            <ul className="m-0 ps-5 list-disc text-xs">{p.alternatives.map((a) => <li key={a.protocolId}>بديلٌ استُبعد: {a.whyNotAr}</li>)}</ul>
          )}
        </div>
      )}

      {f && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="opus-proposal-dose">
          <Fact label="الجلسات" value={`${f.totalSessions ? arCount(f.totalSessions, COUNT_FORMS.session) : "—"}${f.sessionsPerWeek ? `، ${ar(f.sessionsPerWeek)} في الأسبوع` : ""}${weeks ? `، نحو ${arCount(weeks, COUNT_FORMS.week)}` : ""}`} />
          <Fact label="مدّة الجلسة" value={f.sessionMinutes ? arCount(f.sessionMinutes, COUNT_FORMS.minute) : "—"} />
          <Fact label="المسار" value={f.track?.nameAr ?? "—"} />
          <Fact label="يبدأ من" value={`المرحلة ${ar(f.startingPhase)}`} />
        </div>
      )}

      {f && f.phases.length > 0 && (
        <Section title="المراحل" testId="opus-proposal-phases">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {f.phases.map((ph) => {
              const notes = f.phaseNotes.filter((n) => n.phase === ph.position);
              return (
                <div key={ph.position} className="rounded-md bg-slate-50 border p-2 text-sm min-w-0">
                  <b className="block">{ph.nameAr}</b>
                  {ph.sessionFrom && ph.sessionTo ? <div className="text-[11px] text-muted-foreground">الجلسات من {ar(ph.sessionFrom)} إلى {ar(ph.sessionTo)}</div> : null}
                  {ph.goals && <div className="text-xs text-slate-700 whitespace-pre-line" dir="auto">{ph.goals}</div>}
                  {notes.map((n, i) => <div key={i} className="mt-1 text-xs rounded bg-violet-100 text-violet-900 px-1.5 py-0.5">ملاحظة Opus: {n.noteAr}</div>)}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {constraints.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-950 space-y-1" data-testid="opus-proposal-constraints">
          <div className="font-bold flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> قيودُ المعتمِدين — ملزمةٌ للخطّة</div>
          {constraints.map((c, i) => (
            <div key={i} className="text-xs">
              {c.note && <div>«{c.note}»{c.examIsThis ? "" : " (على معاينةٍ سابقة)"}</div>}
              {c.forbiddenDevices.length > 0 && <div>أجهزةٌ ممنوعة بهذا الاعتماد: {c.forbiddenDevices.map(devName).join("، ")}</div>}
            </div>
          ))}
        </div>
      )}

      {f && (
        <Section title="الأجهزة — ما يضبطه المعالج" testId="opus-proposal-devices">
          {f.devices.length === 0 ? <p className="m-0 text-sm text-muted-foreground">لا جهازَ في هذه الخطّة — تمارينُ وحدها.</p> : (
            <div className="grid gap-2">
              {f.devices.map((d) => <DeviceCard key={d.deviceCode} d={d} name={devName(d.deviceCode)}
                noSettings={finalLog.some((g) => g.code === "no_settings" && g.target === `device:${d.deviceCode}`)} />)}
            </div>
          )}
          <p className="m-0 text-[11px] text-muted-foreground">أسماءُ البرامج تُختار من قائمة برامج كلّ جهاز المسجَّلة في التطبيق — ولم تُسجَّل بعد، فيضبط المعالجُ القيمَ الاحتياطية.</p>
        </Section>
      )}

      {p.removed.length > 0 && (
        <Section title="ما حُذف من الأجهزة" testId="opus-proposal-removed">
          <ul className="m-0 p-0 list-none space-y-1">
            {p.removed.map((r, i) => (
              <li key={i} className="text-sm flex flex-wrap items-center gap-1.5 rounded border border-red-200 bg-red-50/60 px-2 py-1">
                <span className="line-through text-slate-600">{devName(r.deviceCode)}</span>
                <span className="rounded-full bg-red-100 text-red-800 px-2 text-[11px] font-semibold">{r.by === "gate" ? "حذفته البوّابة" : "حذفه Opus"}</span>
                <span className="text-xs text-red-900">{r.reasonAr}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {f && f.phases.some((ph) => ph.exercises.length > 0) && (
        <Section title="التمارين" testId="opus-proposal-exercises">
          <div className="space-y-2">
            {f.phases.filter((ph) => ph.exercises.length > 0).map((ph) => (
              <div key={ph.position} className="min-w-0">
                <div className="text-xs font-semibold text-slate-700">المرحلة {ar(ph.position)}: {ph.nameAr}</div>
                <ul className="m-0 ps-5 list-disc text-sm">
                  {ph.exercises.map((x, i) => (
                    <li key={i}>{x.exerciseId !== null ? exName(x.exerciseId) : `بطاقةٌ جديدة: ${f.proposedCards.find((c) => c.key === x.proposedKey)?.nameAr ?? x.proposedKey}`}
                      <span className="text-xs text-muted-foreground"> — {doseText(x)}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {f.exerciseChanges.length > 0 && (
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-slate-700">ما بدّله Opus في تمارين البروتوكول:</div>
              {f.exerciseChanges.map((c, i) => (
                <div key={i}>المرحلة {ar(c.phase)}: {c.fromExerciseId !== null ? exName(c.fromExerciseId) : "—"} ⟵ {c.toExerciseId !== null ? exName(c.toExerciseId) : "أُزيل"}{c.reasonAr ? ` — ${c.reasonAr}` : ""}</div>
              ))}
            </div>
          )}
        </Section>
      )}

      {f && f.proposedCards.length > 0 && (
        <Section title="بطاقاتُ تمارين جديدة يقترحها Opus" testId="opus-proposal-cards">
          <p className="m-0 text-[11px] text-muted-foreground">تُحفظ مسوّداتٍ في مكتبة التمارين عند الاعتماد، ويعتمدها المشرف بعد ذلك.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {f.proposedCards.map((c) => (
              <div key={c.key} className="rounded-md border p-2 text-sm min-w-0">
                <b>{c.nameAr}</b> <span className="text-xs text-muted-foreground"><Ltr>{c.nameEn}</Ltr></span>
                {c.stepsAr && <div className="text-xs whitespace-pre-line mt-1" dir="auto">{c.stepsAr}</div>}
                {c.stopIfAr && <div className="text-xs text-red-800 mt-1">توقّف إذا: {c.stopIfAr}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {f && (f.precautionsAr || f.stopRulesAr || f.homeProgramAr || f.goalsAr) && (
        <Section title="الأهداف والاحتياطات وبرنامج البيت">
          <Txt label="الأهداف" value={f.goalsAr} />
          <Txt label="الاحتياطات" value={f.precautionsAr} />
          <Txt label="قواعد التوقّف" value={f.stopRulesAr} />
          <Txt label="برنامج البيت" value={f.homeProgramAr} />
        </Section>
      )}
      {f && f.measures.length > 0 && (
        <Section title="المقاييس">
          <ul className="m-0 ps-5 list-disc text-sm">{f.measures.map((m) => <li key={m.code}>{m.nameAr} ({ar(m.min)}–{ar(m.max)}{m.unitAr ? ` ${m.unitAr}` : ""})</li>)}</ul>
        </Section>
      )}

      {(p.reviews.length > 0 || p.audits.length > 0) && (
        <Section title="ما وجده المراجع والمدقّق" testId="opus-proposal-reviews">
          {p.reviews.map((r, i) => (
            <div key={`r${i}`} className="text-sm rounded border p-2 space-y-1">
              <div className="text-xs font-semibold">المراجع — الجولة {ar(r.round)}: {r.verdict === "pass" ? "قبلها" : "طلب تعديلاً"}</div>
              {r.summaryAr && <div className="text-xs">{r.summaryAr}</div>}
              {r.issues.length > 0 && <IssueList issues={r.issues} />}
            </div>
          ))}
          {p.audits.map((a, i) => (
            <div key={`a${i}`} className="text-sm rounded border border-violet-200 p-2 space-y-1">
              <div className="text-xs font-semibold">المدقّق (خارج المكتبة) — الجولة {ar(a.round)}: {a.verdict === "pass" ? "لا ملاحظة" : "عنده ملاحظات"}</div>
              {a.summaryAr && <div className="text-xs">{a.summaryAr}</div>}
              {a.issues.length > 0 && <IssueList issues={a.issues} />}
            </div>
          ))}
        </Section>
      )}

      {auditorUnresolved.length > 0 && (
        <div className="rounded-md border-2 border-red-400 bg-red-50 p-2 text-sm text-red-950" data-testid="opus-proposal-auditor-unresolved">
          <div className="font-bold">ما بقي عند المدقّق ولم يُحلّ</div>
          <IssueList issues={auditorUnresolved} />
        </div>
      )}

      {p.majorsToAcknowledge.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 space-y-1.5" data-testid="opus-proposal-acks">
          <div className="text-sm font-bold text-amber-950">ملاحظاتٌ كبيرة لم تُحلّ — أقرّ بكلٍّ منها قبل الاعتماد</div>
          {p.majorsToAcknowledge.map((id) => {
            const i = issuesById.get(id);
            return (
              <label key={id} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={acks.has(id)} className="mt-0.5" data-testid={`opus-ack-${id}`}
                  onCheckedChange={(v) => setAcks((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; })} />
                <span className="min-w-0">{i ? `${i.from === "auditor" ? "المدقّق" : "المراجع"}: ${i.problemAr}` : id}</span>
              </label>
            );
          })}
        </div>
      )}

      {finalLog.length > 0 && (
        <Section title={`ما فعلته البوّاباتُ في الشيفرة (${ar(finalLog.length)})`} testId="opus-proposal-gatelog">
          <GateLogList entries={finalLog} devName={devName} exName={exName} />
          {earlierLog.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-700">الجولاتُ السابقة ({ar(earlierLog.length)})</summary>
              <div className="mt-1"><GateLogList entries={earlierLog} devName={devName} exName={exName} /></div>
            </details>
          )}
        </Section>
      )}

      {p.sources.length > 0 && (
        <Section title="المصادر" testId="opus-proposal-sources">
          <ul className="m-0 ps-5 list-disc text-xs space-y-0.5">
            {p.sources.map((s, i) => (
              <li key={i} className="break-words">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                  <Ltr>{s.title}{s.org ? ` — ${s.org}` : ""}{s.year ? ` (${s.year})` : ""}</Ltr><ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                {fetched.has(normalizeSourceUrl(s.url)) && <span className="text-emerald-700"> ✓ فتحه Opus</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {out && p.libraryProtocol && (
        <Section title="ما يُحفظ مسوّدةَ بروتوكول عند الاعتماد" testId="opus-proposal-library">
          <div className="rounded-md bg-slate-50 border p-2 space-y-1">
            <Txt label="العنوان" value={p.libraryProtocol.titleAr} />
            <Txt label="الملخّص" value={p.libraryProtocol.summaryAr} />
            <Txt label="الأهداف" value={p.libraryProtocol.goalsAr} />
            <Txt label="الموانع" value={p.libraryProtocol.contraindicationsAr} />
          </div>
        </Section>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
        <Button className="gap-1 bg-emerald-700 hover:bg-emerald-800" disabled={!canApprove || approve.isPending} onClick={() => approve.mutate()} data-testid="button-opus-approve">
          <CheckCircle2 className="w-4 h-4" /> اعتماد
        </Button>
        {!confirmDiscard ? (
          <Button variant="outline" className="gap-1 text-red-700 border-red-300" onClick={() => setConfirmDiscard(true)} data-testid="button-opus-discard">
            <Trash2 className="w-4 h-4" /> احذف الخطّة
          </Button>
        ) : (
          <>
            <span className="text-xs text-red-800">تُحذف ولا تُستعاد — متأكّد؟</span>
            <Button size="sm" variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate()} data-testid="button-opus-discard-confirm">نعم، احذفها</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDiscard(false)}>لا</Button>
          </>
        )}
        {!canApprove && !p.examStale && missingAcks.length > 0 && <span className="text-xs text-amber-900">أقرّ بالملاحظات الكبيرة أعلاه أوّلاً.</span>}
      </div>
    </Card>
  );
}

function GateLogList({ entries, devName, exName }: { entries: OpusProposal["gateLog"]; devName: (c: string) => string; exName: (id: number | null) => string }) {
  return (
    <ul className="m-0 p-0 list-none space-y-1">
      {entries.map((g, i) => (
        <li key={i} className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={cn("rounded-full px-2 font-semibold", KIND_AR[g.kind]?.c)}>{KIND_AR[g.kind]?.t ?? g.kind}</span>
          <span className="min-w-0">{g.reasonAr || GATE_REASONS[g.code] || g.code}</span>
          {g.target && <span className="text-muted-foreground">{targetText(g.target, devName, exName)}</span>}
          {changeText(g) && <span className="text-slate-800" data-testid="opus-gatelog-change">{changeText(g)}</span>}
        </li>
      ))}
    </ul>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-slate-50 border px-2 py-1.5 min-w-0"><div className="text-[11px] text-muted-foreground">{label}</div><div className="text-sm font-semibold break-words">{value}</div></div>;
}

function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="m-0 ps-5 list-disc text-xs space-y-0.5">
      {issues.map((i) => <li key={i.id}><b>{SEVERITY_AR[i.severity] ?? i.severity}:</b> {i.problemAr}</li>)}
    </ul>
  );
}

function doseText(x: { sets: number | null; reps: number | null; holdSeconds: number | null; doseNote: string | null }): string {
  const parts: string[] = [];
  if (x.sets) parts.push(arCount(x.sets, COUNT_FORMS.set));
  if (x.reps) parts.push(arCount(x.reps, COUNT_FORMS.rep));
  if (x.holdSeconds) parts.push(`ثباتٌ ${arCount(x.holdSeconds, COUNT_FORMS.second)}`);
  if (x.doseNote) parts.push(x.doseNote);
  return parts.join("، ") || "الجرعةُ من البطاقة";
}

/** هدفُ سطر البوّابة بالعربية — «device:laser» ⟵ اسمُ الجهاز. */
function targetText(t: string, devName: (c: string) => string, exName: (id: number | null) => string): string {
  const [k, v, key] = t.split(":");
  if (k === "device" && v) {
    //  «device:<الجهاز>:<المفتاح>» ⟵ الجهازُ ثمّ اسمُ القيمة العربيّ من الكتالوج.
    if (!key) return devName(v);
    const label = btlModelsFor(v).flatMap((m) => m.params).find((p) => p.key === key)?.labelAr;
    return `${devName(v)} — ${label ?? key}`;
  }
  if (k === "exercise" && v) return /^\d+$/.test(v) ? exName(Number(v)) : "";
  if (k === "phase") return `المرحلة ${v ? arText(v) : ""}`;
  if (k === "dose.total_sessions") return "عددُ الجلسات";
  if (k === "dose.sessions_per_week") return "جلساتُ الأسبوع";
  if (k === "dose.session_minutes") return "دقائقُ الجلسة";
  if (k === "starting_phase") return "مرحلةُ البدء";
  return "";
}

/** «كتب Opus: X ⟵ صار: Y» حين يحمل السطرُ قيمتين بسيطتين (العدد، الدقائق، المرحلة، الأساسيّ/المساعد…). */
const VALUE_AR: Record<string, string> = { core: "أساسيّ", adjunct: "مساعد" };
function simpleValue(v: unknown): string | null {
  if (typeof v === "number") return ar(v);
  if (typeof v === "string") return VALUE_AR[v] ?? (v.length <= 30 ? arText(v) : null);
  if (v && typeof v === "object" && "value" in (v as any) && typeof (v as any).value === "number") return `${ar((v as any).value)} ${unitAr((v as any).unit)}`.trim();
  return null;
}
function changeText(g: GateLogEntry): string | null {
  const b = g.before === undefined ? null : simpleValue(g.before);
  const a = g.after === undefined ? null : simpleValue(g.after);
  if (b && a) return `كتب Opus: ${b} ⟵ صار: ${a}`;
  if (b && (g.kind === "removed" || g.kind === "clamped")) return `كتب Opus: ${b}`;
  return null;
}

/** إعداداتُ الجهاز المكتوبة بلا سطر BTL (يُعرض في خاناته). */
function writtenParams(t: string | null): string | null {
  const v = (t ?? "").split("\n").filter((l) => !l.trim().startsWith("BTL:")).join("\n").trim();
  return v || null;
}

function DeviceCard({ d, name, noSettings = false }: { d: BuiltDevice; name: string; noSettings?: boolean }) {
  const differs = new Set(d.btl?.flags ?? []);
  const proto = Object.entries(d.protocolParams ?? {}).filter(([, v]) => v);
  return (
    <div className="rounded-md border p-2 text-sm min-w-0 space-y-1" data-testid={`opus-device-${d.deviceCode}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <b>{name}</b>
        <span className={cn("rounded-full px-2 text-[11px] font-semibold", d.use === "core" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800")}>{d.use === "core" ? "أساسيّ" : "مساعد"}</span>
        {d.minutes ? <span className="text-xs text-slate-700">{arCount(d.minutes, COUNT_FORMS.minute)}</span> : null}
        {d.everyDays ? <span className="text-xs text-slate-700">{d.everyDays === 1 ? "كلّ يوم" : `كلّ ${arCount(d.everyDays, COUNT_FORMS.day)}`}{d.times ? ` × ${arCount(d.times, COUNT_FORMS.time)}` : ""}</span> : null}
        {d.evidence && <span className="text-[11px] text-muted-foreground">الدليل: {EVIDENCE_LABELS[d.evidence as keyof typeof EVIDENCE_LABELS] ?? d.evidence}</span>}
      </div>
      <div className="grid gap-1 sm:grid-cols-[9rem_1fr] text-xs">
        {d.btl && (<>
          <span className="text-muted-foreground">جهاز BTL</span><span>{d.btl.modelNameAr ?? btlModelById(d.btl.modelId)?.nameAr ?? <Ltr>{d.btl.modelNameEn}</Ltr>}</span>
          <span className="text-muted-foreground">البرنامج الجاهز</span><span>{d.btl.program ? <Ltr>{d.btl.program}</Ltr> : "— (لم تُسجَّل برامج الجهاز بعد)"}</span>
        </>)}
        <span className="text-muted-foreground">{d.btl ? "إن لم يوجد البرنامج" : "الإعدادات"}</span>
        <span>{d.btl && d.btl.fallback.length ? (
          <ul className="m-0 p-0 list-none space-y-0.5">
            {d.btl.fallback.map((v) => (
              <li key={v.key} className={cn(differs.has(`param_differs_from_protocol:${v.key}`) ? "text-red-700" : "")}>
                {v.labelAr ?? btlModelById(d.btl!.modelId)?.params.find((x) => x.key === v.key)?.labelAr ?? v.labelEn}: {ar(v.value)} {unitAr(v.unit)}{" "}
                <span className="text-[10px] text-muted-foreground">({v.source === "protocol" ? "من البروتوكول" : <Ltr>{v.source}</Ltr>})</span>
              </li>
            ))}
          </ul>
        ) : (writtenParams(d.parameters) || "—")}</span>
        {proto.length > 0 && (<><span className="text-muted-foreground">إعداداتُ البروتوكول</span><span className="space-y-0.5">{proto.map(([k, v]) => { const l = (DEVICE_PARAM_LABELS as Record<string, { ar: string; unit: string }>)[k];
          return <div key={k}>{l?.ar ?? k}: <Ltr>{v}{l?.unit ? ` ${l.unit}` : ""}</Ltr></div>; })}</span></>)}
      </div>
      {noSettings && (
        <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900" data-testid={`opus-device-nosettings-${d.deviceCode}`}>
          ⚠ {GATE_REASONS.no_settings}
        </div>
      )}
      {d.reasonAr && <div className="text-xs text-slate-700">لماذا: {d.reasonAr}</div>}
    </div>
  );
}
