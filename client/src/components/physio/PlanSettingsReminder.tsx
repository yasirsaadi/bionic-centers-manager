// **إعداداتُ جهازٍ ناقصة في البروتوكول — «ذكّر المشرف»** (§4.dq — قرارُ المالك ٢٠٢٦-١٠-١٢): «لا تُمنع الخطّة، لكن اطلب ممّن يعتمدها أن يذكّر سليم
// بإدخال معلومات جهاز الصدمات». لافتةٌ لمن يبدأ الخطّةَ أو يعتمدها بالجهاز وخاناته، وزرٌّ يُرسل التذكيرَ للمشرف العام؛ والمشرفُ نفسُه يُدَلّ على البروتوكول.
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SettingsBlocker } from "@shared/physio_device_settings";

export interface PlanSettingsGapsView {
  gaps: SettingsBlocker[];
  supervisors: string[];
  youFill: boolean;
  reminder: { count: number; lastByName: string | null; lastAt: string | null };
}

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

const when = (iso: string) => new Date(iso).toLocaleString("ar-IQ", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function PlanSettingsReminder({ planId, protocolId, view, onSent }: { planId: number; protocolId: number | null; view: PlanSettingsGapsView; onSent: () => void }) {
  const { toast } = useToast();
  const names = view.supervisors.length ? view.supervisors.join("، ") : "المشرف العام";
  const remind = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/physio/plans/${planId}/remind-settings`, {})).json(),
    onSuccess: (r: { sent: boolean; to: string[]; viaTelegram: boolean }) => {
      //  ما يُقال هو ما وقع: تلغرامٌ لمن ربطه وفعّل النوع، وإلّا صفحةُ البروتوكول وحدها — فتُذكِّره بنفسك أيضاً.
      toast(r.sent
        ? { title: `سُجّل التذكير لـ${r.to.join("، ")}`, description: r.viaTelegram
          ? "يصله في تلغرام، ويراه في صفحة البروتوكول."
          : "لم يربط تلغرامَ التنبيهات — يراه في صفحة البروتوكول وحدها؛ فأخبره أيضاً." }
        : { title: "ذُكِّر قبل دقائق", description: "لا يُرسَل تذكيرٌ ثانٍ للبروتوكول نفسِه خلال عشر دقائق." });
      onSent();
    },
    onError: (e) => toast({ title: "تعذّر التذكير", description: errText(e), variant: "destructive" }),
  });
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm space-y-1.5 print:hidden" dir="rtl" data-testid="plan-settings-gaps">
      <div className="flex gap-2 font-semibold text-amber-900">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        إعداداتُ الجهاز لم تُدخَل بعد في البروتوكول
      </div>
      {view.gaps.map((g) => (
        <p key={g.code} data-testid={`plan-settings-gap-${g.code}`}><b>{g.nameAr}</b>: {g.missing.map((m) => m.ar).join("، ")}</p>
      ))}
      {view.youFill ? (
        <p className="text-xs text-amber-900/90" data-testid="plan-settings-you-fill">
          الخطّةُ تبدأ وتُنفَّذ — وأدخلها أنت من جهاز المركز في{" "}
          {protocolId ? <Link href={`/physio/protocols/${protocolId}`} className="underline">صفحة البروتوكول</Link> : "صفحة البروتوكول"} ثمّ اعتمده.
        </p>
      ) : (
        <>
          <p className="text-xs text-amber-900/90" data-testid="plan-settings-ask">
            الخطّةُ تبدأ وتُنفَّذ كما هي — <b>وذكّر {names} بإدخالها</b> من جهاز المركز.
          </p>
          <Button size="sm" variant="outline" className="gap-1 border-amber-400 bg-white" disabled={remind.isPending}
            onClick={() => remind.mutate()} data-testid="plan-remind-settings">
            <BellRing className="w-4 h-4" /> ذكّر {view.supervisors[0] ?? "المشرف"} الآن
          </Button>
        </>
      )}
      {view.reminder.count > 0 && view.reminder.lastAt && (
        <p className="text-[11px] text-muted-foreground" data-testid="plan-settings-reminded">
          ذُكِّر {view.reminder.count === 1 ? "مرّةً" : `${view.reminder.count} مرّات`} — آخرُها من {view.reminder.lastByName ?? "—"} · {when(view.reminder.lastAt)}
        </p>
      )}
    </div>
  );
}
