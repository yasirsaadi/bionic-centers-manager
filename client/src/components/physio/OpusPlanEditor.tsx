// **«تعديل الخطّة» لخطّة Opus المعتمَدة** (ترحيل ٢٠٠، §4.hb ١٠.٣ — قرارُ المالك ٦): للمعتمِد وحده، بسببٍ إلزاميّ، وكلُّ حفظٍ نسخةٌ جديدة.
//
// النموذجُ يُملأ مرّةً من النسخة النافذة (`editFromSnapshot`) **ويبقى كما كتبه المعتمِد عبر التحديث الحيّ** — فإن عُدّلت الخطّةُ من غيره قيل ذلك
// ولم يُعَد ملؤه صامتاً. و«راجِع البوّابات والفرق» يسأل الخادمَ (قراءةٌ وحدها): ما يمنع بالأحمر وتصحيحُه المقترح («طبّق تصحيحات البوّابات»)،
// والتنبيهاتُ بالأصفر، والفرقُ عن النسخة النافذة. و«احفظ النسخة ن+١» لا يعمل قبل معاينةٍ طازجةٍ بلا مانعٍ وسببٍ مكتوب — والخادمُ يعيد الفحصَ كلَّه.
// وسطرُ «الأجهزةُ الممنوعة» يركّبه الخادم — يُعرض هنا ولا يُكتب.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ShieldAlert, Save, Search, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { btlModelById, btlModelsFor, unitAr } from "@shared/btl_devices";
import { normalizeSearchText } from "@shared/patient_search";
import { arCount, COUNT_FORMS } from "@shared/physio_agent";
import { canonicalJson, editFromSnapshot, forbiddenLine, type PlanEdit, type PlanEditDevice, type PlanSnapshot } from "@shared/physio_plan_versions";
import type { GateLogEntry } from "@shared/physio_agent_gates";
import { ar, opusGet, opusPost, versionKey, type EditPreviewResponse, type VersionDetail } from "@/lib/opus_agent";
import { GateLogList } from "@/components/physio/OpusProposalView";
import { PlanDiffView } from "@/components/physio/OpusVersions";
import { invalidateOpusPlan } from "@/components/physio/OpusAmend";

interface Matrix { devices: { id: number; code: string; nameAr: string; nameEn: string }[]; available: string[] }
type Lib = { id: number; nameAr: string; nameEn: string; status: string; isArchived?: boolean }[];

const REASON_MIN = 3;
const toNum = (v: string): number | null => {
  const t = v.trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace("٫", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const toInt = (v: string): number | null => { const n = toNum(v); return n === null ? null : Math.trunc(n); };
const txt = (v: string): string | null => (v.trim() ? v : null);
const numStr = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function Box({ title, children, testId, hint }: { title: string; children: React.ReactNode; testId?: string; hint?: string }) {
  return (
    <section className="rounded-md border bg-white p-3 space-y-2 min-w-0" data-testid={testId}>
      <h3 className="m-0 text-sm font-bold">{title}</h3>
      {hint && <p className="m-0 text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}
function NumField({ label, value, onChange, testId, className }: { label: string; value: number | null; onChange: (n: number | null) => void; testId?: string; className?: string }) {
  const [s, setS] = useState(numStr(value));
  useEffect(() => { if (toNum(s) !== value) setS(numStr(value)); }, [value]);
  return (
    <label className={cn("grid gap-1 text-xs min-w-0", className)}>{label}
      <Input inputMode="decimal" value={s} onChange={(e) => { setS(e.target.value); onChange(toNum(e.target.value)); }} className="bg-white h-9" data-testid={testId} />
    </label>
  );
}

export function OpusPlanEditor({ planId, patientId, branchId, opusVersion, sessionsDone, onDone, onCancel, revisionRunning = false, hasPendingProposal = false }: {
  planId: number; patientId: number; branchId: number; opusVersion: number; sessionsDone: number; onDone: () => void; onCancel: () => void;
  /** طلبُ «تعديل» إلى Opus جارٍ / اقتراحُه ينتظر — حفظُك يوقف الأوّلَ ويُسقط الثاني (الخادمُ يفعل ذلك)، فيُقال قبل الحفظ ويُسأل. */
  revisionRunning?: boolean; hasPendingProposal?: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  //  **الأساسُ رقمُ النسخة يومَ فُتح النموذج** — وما يصل بعده بالتحديث الحيّ يُقال ولا يُكتب فوق المسوّدة.
  const [baseVersion, setBaseVersion] = useState(opusVersion);
  const vq = useQuery<VersionDetail>({ queryKey: versionKey(planId, baseVersion), queryFn: () => opusGet(`/api/physio/plans/${planId}/versions/${baseVersion}`) });
  const matrix = useQuery<Matrix>({ queryKey: ["/api/physio/devices"], queryFn: () => opusGet("/api/physio/devices") });
  const lib = useQuery<Lib>({ queryKey: ["/api/physio/exercises"], queryFn: () => opusGet("/api/physio/exercises") });
  const [draft, setDraft] = useState<PlanEdit | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<{ edit: string; r: EditPreviewResponse } | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const base: PlanSnapshot | null = vq.data?.snapshot ?? null;
  useEffect(() => { if (base && !draft) setDraft(editFromSnapshot(base)); }, [base]);
  const changedUnderneath = opusVersion !== baseVersion;

  const draftKey = draft ? canonicalJson(draft) : "";
  const fresh = Boolean(preview && preview.edit === draftKey);
  const runPreview = useMutation({
    mutationFn: (edit: PlanEdit) => opusPost<EditPreviewResponse>(`/api/physio/plans/${planId}/opus-edit/preview`, { baseVersion, edit }),
    onSuccess: (r, edit) => setPreview({ edit: canonicalJson(edit), r }),
    onError: (e: any) => toast({ title: e.code === "version_conflict" ? "عُدّلت الخطّة من غيرك" : "تعذّرت المراجعة", description: e.message, variant: "destructive" }),
  });
  const save = useMutation({
    mutationFn: () => opusPost<{ version: number }>(`/api/physio/plans/${planId}/opus-edit`, { baseVersion, edit: draft, reason: reason.trim(), gateHash: preview!.r.gateHash }),
    onSuccess: (r) => {
      invalidateOpusPlan(qc, planId, patientId);
      toast({ title: `حُفظت النسخة ${ar(r.version)}`, description: "صارت الساريةَ الآن، ونُبّه المعالجون والفاحص بما تغيّر." });
      onDone();
    },
    onError: (e: any) => {
      if (e.code === "gates_changed" && draft) { toast({ title: "تغيّرت البوّابات منذ المراجعة", description: "أُعيدت المراجعة — انظر فيها ثمّ احفظ." }); runPreview.mutate(draft); return; }
      toast({ title: e.code === "version_conflict" ? "عُدّلت الخطّة من غيرك" : "لم تُحفظ", description: e.message, variant: "destructive" });
    },
  });

  if (vq.isLoading || !draft || !base) return <Card><CardContent className="p-4 text-sm text-muted-foreground">جارٍ تحميل النسخة {ar(baseVersion)}…</CardContent></Card>;
  if (vq.isError) return <Card><CardContent className="p-4 text-sm text-red-700">تعذّر تحميل النسخة.</CardContent></Card>;
  const library = base.mode === "library";
  const set = (patch: Partial<PlanEdit>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setDev = (i: number, patch: Partial<PlanEditDevice>) => set({ devices: draft.devices.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const forbiddenCodes = new Map(base.forbidden.map((f) => [f.deviceCode, f.reasonAr]));
  const deviceName = (code: string) => base.devices.find((d) => d.deviceCode === code)?.nameAr ?? matrix.data?.devices.find((d) => d.code === code)?.nameAr ?? code;
  const exName = (id: number) => base.phases.flatMap((p) => p.exercises).find((x) => x.exerciseId === id)?.nameAr ?? lib.data?.find((x) => x.id === id)?.nameAr ?? `تمرين رقم ${ar(id)}`;
  const addable = (matrix.data?.devices ?? []).filter((d) => (matrix.data?.available ?? []).includes(`${d.id}:${branchId}`) && !draft.devices.some((x) => x.deviceCode === d.code));
  const inBasePhase = (pos: number, id: number) => Boolean(base.phases.find((p) => p.position === pos)?.exercises.some((x) => x.exerciseId === id));
  const reasonOf = (pos: number, id: number) => draft.exerciseReasons.find((r) => r.phase === pos && r.exerciseId === id)?.reasonAr ?? "";
  const setReasonOf = (pos: number, id: number, v: string) => set({ exerciseReasons: [...draft.exerciseReasons.filter((r) => !(r.phase === pos && r.exerciseId === id)),
    ...(v.trim() ? [{ phase: pos, exerciseId: id, reasonAr: v }] : [])] });
  const setPhase = (i: number, patch: Partial<PlanEdit["phases"][number]>) => set({ phases: draft.phases.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const fLine = forbiddenLine(base.forbidden);
  //  رابطُ المصدر الموروث بعنوانه من مصادر النسخة (أو اسمِ موقعه) — لا «رابطٌ موروث» بلا اسم.
  const sourceTitle = (url: string) => {
    const s = base.sources.find((x) => x.url === url);
    if (s?.title) return s.title.length > 60 ? `${s.title.slice(0, 60)}…` : s.title;
    try { return new URL(url).hostname; } catch { return url.slice(0, 60); }
  };
  const r = fresh ? preview!.r : null;
  const reasonOk = reason.trim().length >= REASON_MIN;
  const canSave = Boolean(r && !r.blocking.length && !r.noChange && reasonOk && !changedUnderneath);

  return (
    <Card className="border-violet-300" dir="rtl"><CardContent className="p-3 sm:p-4 space-y-3" data-testid="opus-plan-editor">
      <div className="space-y-1">
        <h2 className="m-0 text-base font-bold">تعديل الخطّة — على النسخة {ar(baseVersion)}</h2>
        <p className="m-0 text-xs text-muted-foreground">
          التعديلُ للمسؤول والمشرف العام وحدهما. لا يتغيّر شيءٌ حتى تحفظ، والحفظُ نسخةٌ جديدة باسمك ووقتك وسببك، تمرّ قبله ببوّابات الموانع في الخادم، ويصل المعالجين والفاحص تنبيهٌ بما تغيّر.
        </p>
      </div>
      {(revisionRunning || hasPendingProposal) && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950" data-testid="opus-editor-opus-warning">
          {revisionRunning && "يعدّل Bionic AI هذه الخطّةَ الآن بطلبٍ من معتمِد — حفظُك يوقف طلبَه، ويُقال لطالبه. "}
          {hasPendingProposal && "لـ Bionic AI اقتراحٌ ينتظر قراراً على هذه الخطّة — حفظُك يُسقطه فلا يُحفظ بعدها."}
        </div>
      )}
      {changedUnderneath && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-900 flex flex-wrap items-center gap-2" data-testid="opus-editor-changed">
          <span className="min-w-0">عُدّلت الخطّة من غيرك (النسخة {ar(opusVersion)}) — انسخ ما كتبتَه نصّاً إن أردت، ثمّ أعد التحميل على النسخة الجديدة.</span>
          <Button size="sm" variant="outline" onClick={() => { setDraft(null); setPreview(null); setBaseVersion(opusVersion); }} data-testid="button-opus-editor-reload">أعد التحميل</Button>
        </div>
      )}

      <Box title="الجرعة" testId="opus-editor-dose" hint={sessionsDone ? `نُفّذت ${arCount(sessionsDone, COUNT_FORMS.session)} — لا ينقص العددُ عنها.` : undefined}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <NumField label="عدد الجلسات" value={draft.totalSessions} onChange={(n) => set({ totalSessions: n === null ? null : Math.trunc(n) })} testId="input-opus-edit-total" />
          <NumField label="جلسات في الأسبوع" value={draft.sessionsPerWeek} onChange={(n) => set({ sessionsPerWeek: n === null ? null : Math.trunc(n) })} testId="input-opus-edit-spw" />
          <NumField label="دقائق الجلسة" value={draft.sessionMinutes} onChange={(n) => set({ sessionMinutes: n === null ? null : Math.trunc(n) })} testId="input-opus-edit-minutes" />
          <label className="grid gap-1 text-xs">يبدأ من
            <select className="rounded-md border px-2 h-9 bg-white text-sm w-full min-w-0" value={draft.startingPhase} onChange={(e) => set({ startingPhase: Number(e.target.value) })} data-testid="select-opus-edit-start">
              {draft.phases.map((p) => <option key={p.position} value={p.position}>المرحلة {ar(p.position)}</option>)}
            </select>
          </label>
        </div>
      </Box>

      <Box title="الأجهزة" testId="opus-editor-devices" hint={library ? "من أجهزة البروتوكول المتوفّرة في فرع الخطّة — والبوّاباتُ تقول ما يخالف البروتوكول." : "خطّةٌ خارج المكتبة — من أجهزة الفرع بحدود الشركة."}>
        {draft.devices.length === 0 && <p className="m-0 text-sm text-muted-foreground">لا جهاز — تمارينُ وحدها.</p>}
        {draft.devices.map((d, i) => {
          const models = btlModelsFor(d.deviceCode);
          const model = btlModelById(d.btlModelId);
          return (
            <div key={d.deviceCode} className="rounded-md border p-2 space-y-2 bg-slate-50/50" data-testid={`opus-edit-device-${d.deviceCode}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-sm">{deviceName(d.deviceCode)}</b>
                <div className="flex items-center gap-1">
                  <select className="rounded-md border px-2 py-1 text-xs bg-white" value={d.use} onChange={(e) => setDev(i, { use: e.target.value as "core" | "adjunct" })} data-testid={`select-opus-edit-use-${d.deviceCode}`}>
                    <option value="core">أساسيّ — كلَّ جلسة</option>
                    <option value="adjunct">مساعد — بالتناوب</option>
                  </select>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="احذف الجهاز" onClick={() => set({ devices: draft.devices.filter((_, j) => j !== i) })}
                    data-testid={`button-opus-edit-remove-${d.deviceCode}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <NumField label="الدقائق" value={d.minutes} onChange={(n) => setDev(i, { minutes: n === null ? null : Math.trunc(n) })} testId={`input-opus-edit-dmin-${d.deviceCode}`} />
                <NumField label="كلّ كم يوماً (اختياري)" value={d.everyDays} onChange={(n) => setDev(i, { everyDays: n === null ? null : Math.trunc(n) })} />
                <NumField label="كم مرّة" value={d.times} onChange={(n) => setDev(i, { times: n === null ? null : Math.trunc(n) })} />
              </div>
              {models.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs min-w-0">جهاز BTL
                    <select className="rounded-md border px-2 h-9 bg-white text-sm w-full min-w-0" value={d.btlModelId ?? ""} data-testid={`select-opus-edit-model-${d.deviceCode}`}
                      onChange={(e) => setDev(i, { btlModelId: e.target.value || null, program: null, fallback: [] })}>
                      <option value="">— بلا موديل</option>
                      {models.map((m) => <option key={m.id} value={m.id} title={m.nameAr}>{m.nameAr}</option>)}
                    </select>
                    {model && <span className="text-[11px] text-slate-600 break-words" data-testid={`opus-edit-model-name-${d.deviceCode}`}>{model.nameAr}</span>}
                  </label>
                  <label className="grid gap-1 text-xs min-w-0">البرنامج الجاهز
                    <select className="rounded-md border px-2 h-9 bg-white text-sm w-full min-w-0" disabled={!model?.programs.length} value={d.program ?? ""} onChange={(e) => setDev(i, { program: e.target.value || null })}>
                      <option value="">{model?.programs.length ? "— اختر" : "لم تُسجَّل برامج الجهاز بعد"}</option>
                      {(model?.programs ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                </div>
              )}
              {model && model.params.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700">القيمُ الاحتياطية (إن لم يوجد البرنامج)</div>
                  {model.params.map((p) => {
                    const f = d.fallback.find((x) => x.key === p.key);
                    const inherited = f && f.source !== "protocol" && f.source !== "approver" ? f.source : null;
                    const upd = (patch: Partial<{ value: number | null; source: string }>) => {
                      const rest = d.fallback.filter((x) => x.key !== p.key);
                      const value = patch.value !== undefined ? patch.value : f?.value ?? null;
                      const source = patch.source ?? f?.source ?? "approver";
                      setDev(i, { fallback: value === null ? rest : [...rest, { key: p.key, value, source }] });
                    };
                    return (
                      <div key={p.key} className="grid grid-cols-[1fr_6rem] sm:grid-cols-[12rem_6rem_1fr] gap-2 items-end text-xs" data-testid={`opus-edit-param-${d.deviceCode}-${p.key}`}>
                        <span className="min-w-0 pb-2">{p.labelAr} <span className="text-muted-foreground">({ar(p.min)}–{ar(p.max)} {unitAr(p.unit)})</span></span>
                        <NumField label="" value={f?.value ?? null} onChange={(n) => upd({ value: n })} testId={`input-opus-edit-param-${d.deviceCode}-${p.key}`} />
                        <select className="rounded-md border px-2 h-9 bg-white text-xs col-span-2 sm:col-span-1 w-full min-w-0" value={f?.source ?? "approver"} disabled={!f}
                          onChange={(e) => upd({ source: e.target.value })}>
                          <option value="approver">المصدر: المعتمِد</option>
                          <option value="protocol">المصدر: البروتوكول (بقيمته نفسِها)</option>
                          {inherited && <option value={inherited}>المصدر: {sourceTitle(inherited)}</option>}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
              <label className="grid gap-1 text-xs">ملاحظة للمعالج
                <Textarea rows={2} value={d.noteAr ?? ""} onChange={(e) => setDev(i, { noteAr: txt(e.target.value) })} className="bg-white text-sm" />
              </label>
            </div>
          );
        })}
        <select className="w-full min-w-0 rounded-md border px-2 py-2 text-sm bg-white" value="" data-testid="select-opus-edit-add-device"
          onChange={(e) => {
            const dv = addable.find((x) => x.code === e.target.value);
            if (dv && !forbiddenCodes.has(dv.code)) set({ devices: [...draft.devices, { deviceCode: dv.code, use: "adjunct", minutes: null, everyDays: null, times: null, noteAr: null,
              btlModelId: btlModelsFor(dv.code)[0]?.id ?? null, program: null, fallback: [] }] });
          }}>
          <option value="">+ إضافة جهاز من أجهزة الفرع…</option>
          {addable.map((dv) => <option key={dv.code} value={dv.code} disabled={forbiddenCodes.has(dv.code)}>
            {dv.nameAr}{forbiddenCodes.has(dv.code) ? ` — ممنوع: ${forbiddenCodes.get(dv.code)}` : ""}</option>)}
        </select>
      </Box>

      <Box title="المراحل والتمارين" testId="opus-editor-phases" hint={library ? "مراحلُ البروتوكول بعددها وأسمائها؛ والتمرينُ من خارج مرحلة البروتوكول يُكتب سببُ إضافته." : undefined}>
        {draft.phases.map((p, i) => (
          <PhaseEditor key={p.position} phase={p} library={library} lib={lib.data ?? []} exName={exName}
            onChange={(patch) => setPhase(i, patch)} offProtocol={(id) => library && !inBasePhase(p.position, id)}
            reasonOf={(id) => reasonOf(p.position, id)} setReason={(id, v) => setReasonOf(p.position, id, v)} />
        ))}
      </Box>

      <Box title="الأهداف والاحتياطات وبرنامج البيت" testId="opus-editor-texts">
        {([["goalsAr", "الأهداف"], ["precautionsAr", "الاحتياطات"], ["stopRulesAr", "قواعد التوقّف"], ["homeProgramAr", "برنامج البيت"]] as const).map(([k, label]) => (
          <label key={k} className="grid gap-1 text-xs">{label}
            <Textarea rows={3} value={draft.texts[k] ?? ""} onChange={(e) => set({ texts: { ...draft.texts, [k]: txt(e.target.value) } })} className="bg-white text-sm" data-testid={`input-opus-edit-${k}`} />
          </label>
        ))}
        {fLine && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-950 flex gap-1.5" data-testid="opus-editor-forbidden">
            <ShieldAlert className="w-4 h-4 shrink-0" /><span className="min-w-0">{fLine} — يكتبه الخادمُ من المعاينة واعتماد العلامة الحمراء، ولا يُحذف بتعديل الاحتياطات.</span>
          </div>
        )}
      </Box>

      <MeasuresEditor draft={draft} set={set} />
      <SourcesEditor base={base} draft={draft} set={set} />

      <Box title="سبب التعديل (إلزاميّ)" testId="opus-editor-reason">
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: تحسّنٌ سريع، تقليل الجلسات إلى ١٨" className="bg-white text-sm" data-testid="input-opus-edit-reason" />
        <p className="m-0 text-[11px] text-muted-foreground">يظهر في «سجلّ النسخ» لكلّ قارئ الخطّة: مَن ومتى ولماذا.</p>
      </Box>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="gap-1" disabled={runPreview.isPending || changedUnderneath} onClick={() => runPreview.mutate(draft)} data-testid="button-opus-edit-preview">
          <Search className="w-4 h-4" /> راجِع البوّابات والفرق
        </Button>
        {preview && !fresh && <span className="text-xs text-amber-900" data-testid="opus-edit-preview-stale">عدّلتَ بعد المراجعة — راجِع ثانيةً قبل الحفظ.</span>}
      </div>

      {r && (
        <div className="rounded-md border p-2 space-y-2 bg-white" data-testid="opus-edit-preview">
          {r.blocking.length > 0 ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-2 space-y-1.5" data-testid="opus-edit-blocking">
              <div className="text-sm font-bold text-red-900">ما يمنع الحفظ ({ar(r.blocking.length)})</div>
              <GateLogList entries={r.blocking as GateLogEntry[]} devName={deviceName} exName={(id) => (id === null ? "—" : exName(id))} />
              {r.suggestedEdit && (
                <Button size="sm" variant="outline" className="gap-1 border-red-300 text-red-800" data-testid="button-opus-edit-apply-fixes"
                  onClick={() => { setDraft(r.suggestedEdit); runPreview.mutate(r.suggestedEdit!); }}>
                  <Wand2 className="w-4 h-4" /> طبّق تصحيحات البوّابات
                </Button>
              )}
            </div>
          ) : <div className="text-sm font-semibold text-emerald-800" data-testid="opus-edit-clear">مرّ التعديلُ ببوّابات الموانع في الخادم.</div>}
          {r.warnings.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2" data-testid="opus-edit-warnings">
              <div className="text-xs font-bold text-amber-950 mb-1">تنبيهات — لا تمنع</div>
              <GateLogList entries={r.warnings as GateLogEntry[]} devName={deviceName} exName={(id) => (id === null ? "—" : exName(id))} />
            </div>
          )}
          {r.noChange ? <p className="m-0 text-sm text-muted-foreground" data-testid="opus-edit-nochange">لا تغيير عن النسخة {ar(baseVersion)}.</p> : (
            <div className="space-y-1">
              <div className="text-sm font-bold">الفرق عن النسخة {ar(baseVersion)}</div>
              <PlanDiffView diff={r.diff} testId="opus-edit-diff" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
        {confirmSave ? (
          <>
            <span className="text-xs text-amber-950" data-testid="opus-edit-save-confirm-text">
              {revisionRunning ? "يتوقّف طلبُ Bionic AI الجاري" : "يسقط اقتراحُ Bionic AI المنتظر"} ويُحفظ تعديلُك نسخةً {ar(baseVersion + 1)} — متأكّد؟
            </span>
            <Button className="gap-1 bg-emerald-700 hover:bg-emerald-800" disabled={!canSave || save.isPending} onClick={() => { setConfirmSave(false); save.mutate(); }} data-testid="button-opus-edit-save-confirm">
              <Save className="w-4 h-4" /> نعم، احفظ
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmSave(false)}>لا</Button>
          </>
        ) : (
          <Button className="gap-1 bg-emerald-700 hover:bg-emerald-800" disabled={!canSave || save.isPending}
            onClick={() => (revisionRunning || hasPendingProposal ? setConfirmSave(true) : save.mutate())} data-testid="button-opus-edit-save">
            <Save className="w-4 h-4" /> احفظ النسخة {ar(baseVersion + 1)}
          </Button>
        )}
        <Button variant="ghost" onClick={onCancel} data-testid="button-opus-edit-cancel">إلغاء</Button>
        {!canSave && !changedUnderneath && (
          <span className="text-xs text-muted-foreground">{!r ? "راجِع البوّابات والفرق أوّلاً." : r.blocking.length ? "أصلح ما يمنع أعلاه." : r.noChange ? "لم يتغيّر شيء." : !reasonOk ? "اكتب سببَ التعديل." : ""}</span>
        )}
      </div>
    </CardContent></Card>
  );
}

function PhaseEditor({ phase, library, lib, exName, onChange, offProtocol, reasonOf, setReason }: {
  phase: PlanEdit["phases"][number]; library: boolean; lib: Lib; exName: (id: number) => string;
  onChange: (patch: Partial<PlanEdit["phases"][number]>) => void; offProtocol: (id: number) => boolean; reasonOf: (id: number) => string; setReason: (id: number, v: string) => void;
}) {
  const [q, setQ] = useState("");
  const options = useMemo(() => {
    //  البحثُ بتطبيع التطبيق الواحد (§4.dc): «الم» = «ألم»، والتاء المربوطة والياء.
    const t = normalizeSearchText(q);
    if (!t) return [];
    return lib.filter((x) => x.status === "approved" && !x.isArchived && !phase.exercises.some((y) => y.exerciseId === x.id)
      && (normalizeSearchText(x.nameAr).includes(t) || normalizeSearchText(x.nameEn).includes(t))).slice(0, 8);
  }, [q, lib, phase.exercises]);
  const setEx = (id: number, patch: Partial<PlanEdit["phases"][number]["exercises"][number]>) =>
    onChange({ exercises: phase.exercises.map((x) => (x.exerciseId === id ? { ...x, ...patch } : x)) });
  return (
    <div className="rounded-md border p-2 space-y-2 bg-slate-50/50 min-w-0" data-testid={`opus-edit-phase-${phase.position}`}>
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem]">
        <label className="grid gap-1 text-xs">المرحلة {ar(phase.position)}
          <Input value={phase.nameAr} onChange={(e) => onChange({ nameAr: e.target.value })} disabled={library} className="bg-white h-9" /></label>
        <NumField label="من الجلسة" value={phase.sessionFrom} onChange={(n) => onChange({ sessionFrom: n === null ? null : Math.trunc(n) })} />
        <NumField label="إلى الجلسة" value={phase.sessionTo} onChange={(n) => onChange({ sessionTo: n === null ? null : Math.trunc(n) })} />
      </div>
      <label className="grid gap-1 text-xs">أهداف المرحلة
        <Textarea rows={2} value={phase.goals ?? ""} onChange={(e) => onChange({ goals: txt(e.target.value) })} className="bg-white text-sm" /></label>
      <label className="grid gap-1 text-xs">معاييرُ الانتقال
        <Textarea rows={2} value={phase.progressCriteria ?? ""} onChange={(e) => onChange({ progressCriteria: txt(e.target.value) })} className="bg-white text-sm" /></label>
      <div className="space-y-1.5">
        {phase.exercises.map((x) => (
          <div key={x.exerciseId} className="rounded border bg-white p-1.5 space-y-1" data-testid={`opus-edit-ex-${phase.position}-${x.exerciseId}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm min-w-0">{exName(x.exerciseId)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="احذف التمرين" onClick={() => onChange({ exercises: phase.exercises.filter((y) => y.exerciseId !== x.exerciseId) })}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <NumField label="مجموعات" value={x.sets} onChange={(n) => setEx(x.exerciseId, { sets: n === null ? null : Math.trunc(n) })} />
              <NumField label="تكرار" value={x.reps} onChange={(n) => setEx(x.exerciseId, { reps: n === null ? null : Math.trunc(n) })} />
              <NumField label="ثبات (ث)" value={x.holdSeconds} onChange={(n) => setEx(x.exerciseId, { holdSeconds: n === null ? null : Math.trunc(n) })} />
              <NumField label="راحة (ث)" value={x.restSeconds} onChange={(n) => setEx(x.exerciseId, { restSeconds: n === null ? null : Math.trunc(n) })} />
            </div>
            <Input placeholder="ملاحظة الجرعة" value={x.doseNote ?? ""} onChange={(e) => setEx(x.exerciseId, { doseNote: txt(e.target.value) })} className="bg-white h-8 text-xs" />
            {offProtocol(x.exerciseId) && (
              <Input placeholder="سبب الإضافة (إلزاميّ — ليس في مرحلة البروتوكول)" value={reasonOf(x.exerciseId)} onChange={(e) => setReason(x.exerciseId, e.target.value)}
                className="bg-amber-50 border-amber-300 h-8 text-xs" data-testid={`input-opus-edit-exreason-${phase.position}-${x.exerciseId}`} />
            )}
          </div>
        ))}
        <div className="relative">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="+ أضف تمريناً من البطاقات المعتمَدة — ابحث بالاسم" className="bg-white h-9 text-sm"
            data-testid={`input-opus-edit-exsearch-${phase.position}`} />
          {options.length > 0 && (
            <ul className="absolute z-20 inset-x-0 top-full mt-1 rounded-md border bg-white shadow max-h-56 overflow-y-auto m-0 p-0 list-none">
              {options.map((o) => (
                <li key={o.id}>
                  <button type="button" className="w-full text-right px-2 py-1.5 text-sm hover:bg-slate-50"
                    onClick={() => { onChange({ exercises: [...phase.exercises, { exerciseId: o.id, sets: null, reps: null, holdSeconds: null, restSeconds: null, doseNote: null }] }); setQ(""); }}>
                    {o.nameAr}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function MeasuresEditor({ draft, set }: { draft: PlanEdit; set: (p: Partial<PlanEdit>) => void }) {
  const own = draft.measures !== null;
  const ms = draft.measures ?? [];
  const upd = (i: number, patch: Partial<NonNullable<PlanEdit["measures"]>[number]>) => set({ measures: ms.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <Box title="المقاييس" testId="opus-editor-measures">
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={own} onChange={(e) => set({ measures: e.target.checked ? [] : null })} data-testid="checkbox-opus-edit-own-measures" />
        مقاييسُ خاصّة بهذه الخطّة (وإلّا فمقاييسُ البروتوكول)
      </label>
      {own && ms.map((m, i) => (
        <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_4.5rem_4.5rem_auto] gap-1.5 items-end rounded border bg-white/60 p-1.5 sm:border-0 sm:bg-transparent sm:p-0">
          <label className="grid gap-1 text-xs min-w-0">الاسم<Input value={m.nameAr} onChange={(e) => upd(i, { nameAr: e.target.value })} className="bg-white h-9" data-testid={`input-opus-edit-measure-ar-${i}`} /></label>
          {/* الاسمُ الإنكليزيّ إلزاميٌّ في البوّابة (`measure_dropped`) — فبلا خانته لا يُحفظ مقياسٌ جديد (مراجعةُ Codex على #775). */}
          <label className="grid gap-1 text-xs min-w-0">الاسم بالإنكليزية<Input dir="ltr" value={m.nameEn} onChange={(e) => upd(i, { nameEn: e.target.value })} className="bg-white h-9" data-testid={`input-opus-edit-measure-en-${i}`} /></label>
          {/* الخانةُ الفارغة لا تُكتب صفراً وهي تُمسح — تبقى القيمةُ السابقة حتى يُكتب رقم. */}
          <NumField label="من" value={m.min} onChange={(n) => { if (n !== null) upd(i, { min: n }); }} />
          <NumField label="إلى" value={m.max} onChange={(n) => { if (n !== null) upd(i, { max: n }); }} />
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="احذف المقياس" onClick={() => set({ measures: ms.filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      ))}
      {own && (
        <Button size="sm" variant="outline" className="gap-1" onClick={() => set({ measures: [...ms, { code: `m${Date.now().toString(36)}`, nameAr: "", nameEn: "", unitAr: null, unitEn: null, min: 0, max: 10, higherIsBetter: false }] })}>
          <Plus className="w-4 h-4" /> مقياس
        </Button>
      )}
    </Box>
  );
}

function SourcesEditor({ base, draft, set }: { base: PlanSnapshot; draft: PlanEdit; set: (p: Partial<PlanEdit>) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const keep = new Set(draft.keepSourceUrls);
  return (
    <Box title="المصادر" testId="opus-editor-sources">
      {base.sources.length === 0 && draft.addSources.length === 0 && <p className="m-0 text-xs text-muted-foreground">لا مصدر.</p>}
      {base.sources.map((s) => (
        <label key={s.url} className="flex items-start gap-2 text-xs min-w-0">
          <input type="checkbox" className="mt-0.5" checked={keep.has(s.url)}
            onChange={(e) => set({ keepSourceUrls: e.target.checked ? [...draft.keepSourceUrls, s.url] : draft.keepSourceUrls.filter((u) => u !== s.url) })} />
          <span className="min-w-0 break-words"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{s.title}</span>{s.addedBy === "approver" ? " — أضافه المعتمِد" : ""}</span>
        </label>
      ))}
      {draft.addSources.map((s, i) => (
        <div key={i} className="flex items-center gap-2 text-xs min-w-0">
          <span className="min-w-0 break-words flex-1"><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{s.title}</span> — أضفتَه الآن</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="احذف المصدر" onClick={() => set({ addSources: draft.addSources.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
        </div>
      ))}
      <div className="grid gap-1.5 sm:grid-cols-[1fr_1fr_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان المصدر" className="bg-white h-9 text-sm" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="الرابط (https://…)" dir="ltr" className="bg-white h-9 text-sm" />
        <Button size="sm" variant="outline" disabled={!title.trim() || !/^https?:\/\//i.test(url.trim())}
          onClick={() => { set({ addSources: [...draft.addSources, { title: title.trim(), url: url.trim(), org: null, year: null }] }); setTitle(""); setUrl(""); }}>
          <Plus className="w-4 h-4" /> أضف
        </Button>
      </div>
    </Box>
  );
}
