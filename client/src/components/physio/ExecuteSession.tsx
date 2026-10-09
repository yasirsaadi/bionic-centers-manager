// **«إنهاء الجلسة»** (§4.cn — المرحلةُ الرابعة): المعالجُ يسجّل ما نُفّذ من الخطّة المعتمَدة بنداً بنداً — نُفّذ أم لا، والدقائقُ الفعلية،
// وسببُ ما لم يُنفَّذ — و«ملاحظة للأخصائيّ». لا يضيف جهازاً ولا يحذف بنداً. والحفظُ يكتب زيارةَ الجلسة (تُخصم من المدفوعة).
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchSession } from "@/components/BranchGate";
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { ADJUNCT_OFF_TURN_NOTE, DRY_NEEDLING_DEVICE_CODE } from "@shared/physio_protocols";
import { checkVisitDate, baghdadTodayYmd } from "@shared/visit_date";

interface PlanDevice { deviceId: number; minutes: number | null; code?: string; nameAr?: string; parameters?: string | null; centreUse?: "core" | "adjunct" }
interface PlanLite {
  id: number; patientId: number; titleAr: string; devices: PlanDevice[]; patient?: { name: string; code: string | null } | null;
  /** دورُ المساعد في هذه الجلسة (ترحيل ١٢٢) — يحسبه الخادمُ بالقاعدة نفسِها التي يحكم بها الحفظ. */
  rotation?: { sessionsSoFar: number; turnDeviceId: number | null };
}
interface Line { deviceId: number; done: boolean; minutes: string; note: string }

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

export function ExecuteSessionDialog({ planId, onClose }: { planId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const permissions = usePermissions();
  const isAdmin = Boolean((useBranchSession() as any)?.isAdmin);
  const canNeedle = permissions.canDryNeedle === true;
  const q = useQuery<PlanLite>({
    queryKey: [`/api/physio/plans/${planId}`],
    queryFn: async () => (await apiRequest("GET", `/api/physio/plans/${planId}`)).json(),
    enabled: planId !== null,
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(baghdadTodayYmd());
  useEffect(() => {
    if (!q.data) return;
    //  **المساعدُ يتناوب** (ترحيل ١٢٢، §4.cx): الأساسيُّ مُعلَّمٌ «نُفّذ»، والمساعدُ الذي دورُه هذه الجلسة كذلك، والباقي «ليس دورَه» بلا سببٍ يُطلب.
    const turn = q.data.rotation?.turnDeviceId ?? null;
    setLines(q.data.devices.map((d) => {
      const offTurn = d.centreUse === "adjunct" && d.deviceId !== turn;
      return { deviceId: d.deviceId, done: !offTurn && (d.code !== DRY_NEEDLING_DEVICE_CODE || canNeedle),
        minutes: d.minutes == null ? "" : String(d.minutes), note: "" };
    }));
    setNote(""); setDate(baghdadTodayYmd());
  }, [q.data?.id, planId]);
  const set = (i: number, patch: Partial<Line>) => setLines((p) => p.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const m = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/physio/plans/${planId}/sessions`, {
      date, noteToSpecialist: note.trim() || undefined,
      items: lines.map((l) => ({ deviceId: l.deviceId, done: l.done, minutes: l.minutes === "" ? null : Number(l.minutes), note: l.note.trim() || null })),
    })).json(),
    onSuccess: () => {
      toast({ title: "سُجّلت الجلسة", description: "وكُتبت زيارةُ الجلسة في ملفّ المريض" });
      qc.invalidateQueries({ queryKey: ["/api/physio/today"] });
      qc.invalidateQueries({ queryKey: [`/api/physio/plans/${planId}/sessions`] });
      qc.invalidateQueries({ queryKey: ["/api/physio/deviations"] });
      if (q.data) {
        qc.invalidateQueries({ queryKey: [`/api/patients/${q.data.patientId}/physio-plans`] });
        invalidatePatientData(qc, q.data.patientId);
      }
      onClose();
    },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  const dateVerdict = checkVisitDate(date, isAdmin);
  const turnId = q.data?.rotation?.turnDeviceId ?? null;
  const isOffTurn = (deviceId: number) => q.data?.devices.find((d) => d.deviceId === deviceId)?.centreUse === "adjunct" && deviceId !== turnId;
  const missingReason = lines.some((l) => !l.done && !isOffTurn(l.deviceId) && !l.note.trim());
  const noneDone = !lines.some((l) => l.done);
  return (
    <Dialog open={planId !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>تنفيذ جلسة</DialogTitle></DialogHeader>
        {q.isLoading || !q.data ? <div className="text-sm text-muted-foreground">جارٍ التحميل…</div> : (
          <div className="space-y-3">
            <div className="text-sm"><b>{q.data.patient?.name}</b>{q.data.patient?.code ? ` (${q.data.patient.code})` : ""} — {q.data.titleAr}</div>
            <p className="text-[11px] text-muted-foreground">علّم ما نُفّذ وعدّل دقائقه إن اختلفت، واكتب سببَ ما لم يُنفَّذ. لا يُضاف جهازٌ ولا يُحذف بند — التعديلُ للأخصائيّ.</p>
            {q.data.devices.map((d, i) => {
              const l = lines[i];
              if (!l) return null;
              const needleLocked = d.code === DRY_NEEDLING_DEVICE_CODE && !canNeedle;
              return (
                <div key={d.deviceId} className={`rounded-md border p-2 space-y-2 ${l.done ? "bg-emerald-50/50 border-emerald-200" : "bg-white"}`} data-testid={`exec-line-${d.deviceId}`}>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox checked={l.done} disabled={needleLocked} onCheckedChange={(v) => set(i, { done: v === true })} data-testid={`exec-done-${d.deviceId}`} />
                    {d.nameAr} <span className="text-xs text-muted-foreground">({d.minutes ?? "—"} د في الخطّة)</span>
                  </label>
                  {d.centreUse === "adjunct" && (
                    <p className={`text-[11px] ${d.deviceId === turnId ? "text-violet-800 font-medium" : "text-muted-foreground"}`} data-testid={`exec-turn-${d.deviceId}`}>
                      {d.deviceId === turnId ? "مساعد — دورُه هذه الجلسة" : `${ADJUNCT_OFF_TURN_NOTE} (يُنفَّذ إن أردت)`}
                    </p>
                  )}
                  {needleLocked && <p className="text-[11px] text-amber-700">الإبرُ الجافة يعلّمها حاملُ «يطبّق الإبر الجافة» وحده.</p>}
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" min={0} placeholder="الدقائق" value={l.minutes} disabled={!l.done}
                      onChange={(e) => set(i, { minutes: e.target.value })} data-testid={`exec-minutes-${d.deviceId}`} />
                    <Input className="col-span-2" placeholder={l.done || isOffTurn(d.deviceId) ? "ملاحظة (اختياري)" : "سببُ عدم التنفيذ *"} value={l.note}
                      onChange={(e) => set(i, { note: e.target.value })} data-testid={`exec-note-${d.deviceId}`} />
                  </div>
                </div>
              );
            })}
            <div>
              <label className="text-sm font-medium">ملاحظة للأخصائيّ (اختياري — تصله تنبيهاً)</label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 bg-white"
                placeholder="مثال: يشكو ألماً في الركبة اليسرى" data-testid="exec-note-specialist" />
            </div>
            <div>
              <label className="text-sm font-medium">تاريخ الجلسة</label>
              <Input type="date" value={date} max={baghdadTodayYmd()} onChange={(e) => setDate(e.target.value)} className="mt-1 bg-white" data-testid="exec-date" />
              {!dateVerdict.ok && <p className="text-[11px] text-red-700 mt-1">{dateVerdict.message}</p>}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={m.isPending || !q.data || noneDone || missingReason || !dateVerdict.ok} onClick={() => m.mutate()} data-testid="button-finish-session">
            {m.isPending ? "جارٍ الحفظ…" : "إنهاء الجلسة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ سجلُّ جلسات الخطّة — ما نُفّذ وما لم يُنفَّذ، والإلغاءُ للمسؤول والمشرف العام ═══════════════════════════════
interface SessionItem { deviceId: number; plannedMinutes: number | null; done: boolean; minutes: number | null; note: string | null; nameAr: string; offTurn?: boolean }
interface SessionRow {
  id: number; sessionDate: string; shift: string; executedByName: string | null; visitId: number | null; noteToSpecialist: string | null;
  cancelledAt: string | null; cancelledByName: string | null; cancelReason: string | null; items: SessionItem[];
}

export function PlanSessionsHistory({ planId }: { planId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery<{ sessions: SessionRow[]; canExecute: boolean; canCancel: boolean }>({
    queryKey: [`/api/physio/plans/${planId}/sessions`],
    queryFn: async () => (await apiRequest("GET", `/api/physio/plans/${planId}/sessions`)).json(),
  });
  const [cancelling, setCancelling] = useState<SessionRow | null>(null);
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/physio/sessions/${cancelling!.id}/cancel`, { reason: reason.trim() })).json(),
    onSuccess: () => {
      toast({ title: "أُلغيت الجلسة", description: "وحُذفت زيارتُها وأُعيد العدّاد" });
      qc.invalidateQueries({ queryKey: [`/api/physio/plans/${planId}/sessions`] });
      setCancelling(null); setReason("");
    },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>;
  const rows = q.data?.sessions ?? [];
  if (!rows.length) return <p className="text-sm text-muted-foreground" data-testid="plan-sessions-empty">لم تُنفَّذ جلسةٌ بعد.</p>;
  return (
    <div className="space-y-2" data-testid="plan-sessions">
      {rows.map((s) => (
        <div key={s.id} className={`rounded-md border p-2 text-sm ${s.cancelledAt ? "bg-zinc-50 opacity-70" : "bg-white"}`} data-testid={`plan-session-${s.id}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <b>{s.sessionDate}</b>
            <span className="text-xs text-muted-foreground">{s.shift === "evening" ? "مسائي" : "صباحي"} · {s.executedByName ?? "—"}</span>
            {s.cancelledAt && <span className="text-xs text-red-700">ملغاة — {s.cancelledByName ?? ""}: {s.cancelReason}</span>}
            {!s.cancelledAt && q.data?.canCancel && (
              <Button size="sm" variant="ghost" className="ms-auto h-7 text-destructive print:hidden" onClick={() => { setCancelling(s); setReason(""); }}
                data-testid={`button-cancel-session-${s.id}`}>إلغاء الجلسة</Button>
            )}
          </div>
          <ul className="mt-1 space-y-0.5">
            {s.items.map((i) => (
              <li key={i.deviceId} className={i.done ? "" : i.offTurn ? "text-muted-foreground" : "text-red-700"} data-testid={`session-item-${s.id}-${i.deviceId}`}>
                {i.done ? "✓" : i.offTurn ? "↻" : "✗"} {i.nameAr}
                {i.done && i.minutes != null ? ` — ${i.minutes} د` : ""}
                {i.done && i.plannedMinutes != null && i.minutes != null && i.minutes !== i.plannedMinutes ? ` (الخطّة ${i.plannedMinutes})` : ""}
                {i.note ? ` — ${i.note}` : ""}
              </li>
            ))}
          </ul>
          {s.noteToSpecialist && <div className="mt-1 text-xs rounded bg-amber-50 border border-amber-200 p-1.5">ملاحظة للأخصائيّ: {s.noteToSpecialist}</div>}
        </div>
      ))}
      <Dialog open={cancelling !== null} onOpenChange={(v) => { if (!v) setCancelling(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>إلغاء جلسة {cancelling?.sessionDate}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">تُحذف زيارتُها من ملفّ المريض (فتعود الجلسةُ المدفوعة) ويُنقَص عدّادُ الأجهزة إن كان قد زاد. والجلسةُ تبقى ظاهرةً ملغاةً بسببها.</p>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سببُ الإلغاء *" className="bg-white" data-testid="input-cancel-session-reason" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelling(null)}>رجوع</Button>
            <Button variant="destructive" disabled={!reason.trim() || m.isPending} onClick={() => m.mutate()} data-testid="button-confirm-cancel-session">إلغاء الجلسة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══ ما اختلف عن الخطّة — لكاتبي الخطط (آخر ثلاثين يوماً) ═══════════════════════════════════════════════════
interface DeviationRow {
  id: number; planId: number; sessionDate: string; executedByName: string | null; noteToSpecialist: string | null;
  patientName: string; patientCode: string | null; titleAr: string; branchName: string | null;
  differences: { done: boolean; minutes: number | null; plannedMinutes: number | null; note: string | null; nameAr: string }[];
}

export function DeviationsList() {
  const q = useQuery<{ sessions: DeviationRow[] }>({
    queryKey: ["/api/physio/deviations"],
    queryFn: async () => (await apiRequest("GET", "/api/physio/deviations")).json(),
  });
  if (q.isLoading) return <div className="text-sm text-muted-foreground p-3">جارٍ التحميل…</div>;
  const rows = q.data?.sessions ?? [];
  if (!rows.length) return <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground mt-2" data-testid="deviations-empty">لا اختلافَ عن الخطط في آخر ثلاثين يوماً.</div>;
  return (
    <div className="space-y-2 mt-2" data-testid="deviations-list">
      <p className="text-[11px] text-muted-foreground">جلساتٌ لم يُنفَّذ فيها بند، أو اختلفت دقائقُها عن الخطّة، أو كتب المنفّذُ فيها ملاحظة — آخر ثلاثين يوماً.</p>
      {rows.map((r) => (
        <Link key={r.id} href={`/physio/plans/${r.planId}`} className="block rounded-lg border bg-white px-3 py-2.5 hover:border-primary/40 hover:bg-slate-50" data-testid={`deviation-row-${r.id}`}>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-semibold">{r.patientName}{r.patientCode ? ` (${r.patientCode})` : ""}</span>
            <span>— {r.titleAr}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">{r.sessionDate} · {r.branchName ?? "—"} · نفّذها {r.executedByName ?? "—"}</div>
          <ul className="mt-1 text-sm">
            {r.differences.map((d, i) => (
              <li key={i} className={d.done ? "text-amber-800" : "text-red-700"}>
                {d.done ? `${d.nameAr}: ${d.minutes} د بدل ${d.plannedMinutes}` : `لم يُنفَّذ ${d.nameAr}`}{d.note ? ` — ${d.note}` : ""}
              </li>
            ))}
          </ul>
          {r.noteToSpecialist && <div className="mt-1 text-xs rounded bg-amber-50 border border-amber-200 p-1.5">ملاحظة للأخصائيّ: {r.noteToSpecialist}</div>}
        </Link>
      ))}
    </div>
  );
}
