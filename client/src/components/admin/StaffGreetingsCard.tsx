// **عباراتُ الترحيب اليومية** (§4.dp) — بطاقةُ المسؤول في «تنبيهات الموظفين». منذ ٢٠٢٦-١١-٢٣ (§4.gw) تقول التحيّةُ لكلّ موظّفٍ إنجازَه أمس،
// والعباراتُ هنا **احتياطٌ** لمن لا إنجازَ له؛ و**سطرُ المالك** يظهر للجميع تحت الإنجاز. والتذكيرُ الشهريّ بتغييرها تقاعد.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudRain, MessageSquareText, Plus, Smile, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { WeatherFxLayer } from "@/components/WeatherFxLayer";
import { weatherGreetingLine, type WeatherFx } from "@shared/weather_greeting_fx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  EMPTY_YESTERDAY_STATS, GREETING_MAX_CHARS, GREETING_NOTE_MAX_CHARS, GREETINGS_MAX, achievementGreetingText, achievementLines, greetingText,
} from "@shared/staff_greeting";

interface Config { phrases: string[]; updatedAt: string; updatedByName: string | null; note?: string | null; weatherFx?: boolean }

/** مثالُ إنجاز الأمس في البطاقة — كما يراه موظّفُ استقبال. */
const ACHIEVEMENT_EXAMPLE = achievementGreetingText("صباح الخير", "زهراء", achievementLines(["registrations", "payments", "visits"],
  { ...EMPTY_YESTERDAY_STATS, registrations: 9, payments: 14, paymentsSum: 1_250_000, visits: 23 }));

/** أزرارُ معاينة المؤثّر للمالك — فالتحيّةُ لا تظهر لحسابه (§4.dp)، ويرى هنا ما يراه موظّفوه. */
const FX_PREVIEW: { fx: WeatherFx; label: string }[] = [
  { fx: "drizzle", label: "رذاذ" }, { fx: "rain", label: "مطر" }, { fx: "heavy", label: "مطر غزير" },
  { fx: "thunder", label: "رعد" }, { fx: "dust", label: "غبار" }, { fx: "storm", label: "عاصفة ترابية" },
];

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

export default function StaffGreetingsCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const q = useQuery<Config>({ queryKey: ["/api/admin/greeting"], queryFn: async () => (await apiRequest("GET", "/api/admin/greeting")).json() });
  const [rows, setRows] = useState<string[] | null>(null);
  //  **ما حُمّل آخرَ مرّة** — أساسُ «هل عدّلتُ شيئاً؟» (مراجعةُ Codex): إن تغيّرت العباراتُ من جلسةٍ أخرى (التحديثُ الحيّ يعيد جلبَها) والبطاقةُ
  //  بلا تعديل تُعرض الجديدة في الحال؛ وإن كان فيها تعديلٌ لم يُحفظ لا يُمحى — بل يُقال إنّ نسخةً أحدث وصلت، ويُختار.
  const [base, setBase] = useState<string[] | null>(null);
  const same = (a: string[] | null, b: string[] | null) => JSON.stringify(a) === JSON.stringify(b);
  const dirty = rows !== null && !same(rows, base);
  useEffect(() => {
    if (!q.data) return;
    if (rows === null || !dirty) { setRows([...q.data.phrases]); setBase([...q.data.phrases]); }
  }, [q.data]);
  const newerElsewhere = Boolean(q.data && base && dirty && !same(q.data.phrases, base));
  const done = (c: Config, title: string) => {
    //  ويبقى المفتاحُ على ما كان إن غاب عن الجواب (مراجعةُ Codex).
    qc.setQueryData<Config>(["/api/admin/greeting"], (old) => ({ ...c, weatherFx: c.weatherFx ?? old?.weatherFx }));
    qc.invalidateQueries({ queryKey: ["/api/greeting"] });
    setRows([...c.phrases]);
    setBase([...c.phrases]);
    toast({ title });
  };
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", "/api/admin/greeting", { phrases: rows ?? [] })).json(),
    onSuccess: (c: Config) => done(c, "حُفظت العبارات"),
    onError: (e) => toast({ title: "تعذّر الحفظ", description: errText(e), variant: "destructive" }),
  });
  //  **سطرُ المالك** (§4.gw): خانةٌ واحدة تُحفظ وحدها — والعباراتُ لا تُمسّ. وما لم يُعدَّل هنا يتبع المحفوظ (جهازٌ آخر حفظ ⟵ يظهر).
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const noteValue = noteDraft ?? q.data?.note ?? "";
  const noteDirty = noteDraft !== null && noteDraft.replace(/\s+/g, " ").trim() !== (q.data?.note ?? "");
  const saveNote = useMutation({
    mutationFn: async () => (await apiRequest("PUT", "/api/admin/greeting/note", { note: noteValue })).json(),
    onSuccess: (c: Config) => {
      qc.setQueryData<Config>(["/api/admin/greeting"], (old) => ({ ...c, weatherFx: c.weatherFx ?? old?.weatherFx }));
      qc.invalidateQueries({ queryKey: ["/api/greeting"] });
      setNoteDraft(null);
      toast({ title: c.note ? "حُفظ السطر — يظهر للجميع تحت إنجاز الأمس" : "مُحي السطر — لا شيء يظهر تحت الإنجاز" });
    },
    onError: (e) => toast({ title: "تعذّر الحفظ", description: errText(e), variant: "destructive" }),
  });
  //  **مؤثّرُ الطقس مع التحيّة** (§4.fw): مفتاحٌ للجميع، ومعاينةٌ على هذه الشاشة.
  //  `n` يتزايد مع كلّ ضغطة — فالزرُّ نفسُه مرّتين يعيد المعاينةَ من أوّلها (لمستُه توقف السابقة، والمفتاحُ الجديد يركّب غيرها).
  const [preview, setPreview] = useState<{ fx: WeatherFx; n: number } | null>(null);
  const fxSwitch = useMutation({
    mutationFn: async (enabled: boolean) => (await apiRequest("PUT", "/api/admin/greeting/weather-fx", { enabled })).json(),
    onSuccess: (r: { weatherFx: boolean }) => {
      qc.setQueryData<Config>(["/api/admin/greeting"], (old) => (old ? { ...old, weatherFx: r.weatherFx } : old));
      qc.invalidateQueries({ queryKey: ["/api/greeting"] });
      toast({ title: r.weatherFx ? "مؤثّرُ الطقس مفعّل مع التحيّة" : "أُطفئ مؤثّرُ الطقس — التحيّةُ وحدها" });
    },
    onError: (e) => toast({ title: "تعذّر الحفظ", description: errText(e), variant: "destructive" }),
  });
  const c = q.data;
  const list = rows ?? [];
  const changed = c ? JSON.stringify(list.map((x) => x.trim()).filter(Boolean)) !== JSON.stringify(c.phrases) : false;
  return (
    <Card className="p-6 space-y-3" dir="rtl" data-testid="staff-greetings-card">
      <div className="flex items-center gap-2 flex-wrap">
        <Smile className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold">تحيّة الموظّفين اليومية</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-7">
        تظهر لكلّ موظّفٍ مرّةً كلَّ يوم عند دخوله الأوّل: «صباح الخير» حتى الثانية عشرة ظهراً و«مساء الخير» بعدها، ثمّ اسمُه، ثمّ <b>إنجازُه أمس</b> من
        سجلّات النظام — أرقامُه وحده، بلا مقارنةٍ بزملائه — وشكرُك. ومَن لم يُسجَّل له عملٌ أمس (أو كان أمسِ عطلة) يرى بدلَها عبارةً من العبارات أدناه،
        تتناوب يوماً بعد يوم.
      </p>
      <p className="text-xs rounded border bg-amber-50/60 p-2 leading-6" data-testid="greeting-achievement-example">مثال: {ACHIEVEMENT_EXAMPLE}</p>
      {c && (
        <div className="space-y-1" data-testid="greeting-note-settings">
          <label htmlFor="greeting-note" className="text-sm font-semibold flex items-center gap-1">
            <MessageSquareText className="w-4 h-4 text-amber-600" /> سطرٌ منك يظهر للجميع تحت الإنجاز (اختياري)
          </label>
          <div className="flex gap-2 flex-wrap">
            <Input id="greeting-note" className="bg-white flex-1 min-w-[200px]" value={noteValue} maxLength={GREETING_NOTE_MAX_CHARS}
              placeholder="فارغٌ ⟵ لا يظهر شيء" onChange={(e) => setNoteDraft(e.target.value)} data-testid="greeting-note-input" />
            <Button size="sm" disabled={!noteDirty || saveNote.isPending} onClick={() => saveNote.mutate()} data-testid="greeting-note-save">حفظ السطر</Button>
          </div>
        </div>
      )}
      <h4 className="font-semibold text-sm pt-1">العبارات — لمن لا إنجازَ له أمس</h4>
      {q.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
      {newerElsewhere && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs flex items-center gap-2 flex-wrap" data-testid="greetings-newer">
          عُدّلت العباراتُ من جهازٍ آخر بعد أن بدأتَ التعديل هنا — حفظُك يكتب فوقها.
          <Button size="sm" variant="outline" className="h-7" onClick={() => { setRows([...q.data!.phrases]); setBase([...q.data!.phrases]); }}
            data-testid="greetings-load-newer">اعرض الأحدث واترك تعديلي</Button>
        </div>
      )}
      <div className="space-y-2">
        {list.map((p, i) => (
          <div key={i} className="flex gap-2 items-start" data-testid={`greeting-row-${i}`}>
            <span className="text-xs text-muted-foreground w-5 pt-2 text-center">{i + 1}</span>
            <Textarea rows={2} value={p} maxLength={GREETING_MAX_CHARS} className="bg-white"
              onChange={(e) => setRows((xs) => (xs ?? []).map((x, j) => (j === i ? e.target.value : x)))} data-testid={`greeting-input-${i}`} />
            <Button variant="ghost" size="icon" aria-label="حذف" onClick={() => setRows((xs) => (xs ?? []).filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      {list[0]?.trim() && (
        <p className="text-xs rounded border bg-amber-50/60 p-2 leading-6" data-testid="greeting-preview">
          مثال: {greetingText("صباح الخير", "سليم", list[0].trim())}
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        {list.length < GREETINGS_MAX && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setRows((xs) => [...(xs ?? []), ""])} data-testid="greeting-add">
            <Plus className="w-4 h-4" /> عبارة
          </Button>
        )}
        <Button size="sm" disabled={!changed || save.isPending} onClick={() => save.mutate()} data-testid="greeting-save">حفظ العبارات</Button>
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => setRows(base ? [...base] : null)} data-testid="greeting-undo">تراجع عن تعديلي</Button>
        )}
      </div>
      {dirty && (
        <p className="text-[11px] text-amber-800" data-testid="greeting-unsaved">في العبارات تعديلٌ لم يُحفظ — احفظه، أو تراجع عنه لتُبقيها كما هي.</p>
      )}
      {c && (
        <p className="text-[11px] text-muted-foreground">
          آخرُ تغيير: {new Date(c.updatedAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" })}
          {c.updatedByName ? ` — ${c.updatedByName}` : " — العباراتُ الأولى"}
        </p>
      )}
      {c && (
        <div className="border-t pt-3 space-y-2" data-testid="weather-fx-settings">
          <div className="flex items-center gap-2 flex-wrap">
            <CloudRain className="w-5 h-5 text-sky-500" />
            <label htmlFor="weather-fx-switch" className="font-semibold text-sm">مطر وغبار مع التحيّة</label>
            <Switch id="weather-fx-switch" checked={c.weatherFx !== false} disabled={fxSwitch.isPending}
              onCheckedChange={(v) => fxSwitch.mutate(v)} data-testid="weather-fx-switch" />
          </div>
          <p className="text-xs text-muted-foreground leading-6">
            حين يكون طقسُ مدينة الفرع ممطراً أو مغبرّاً فعلاً، تنزل مع تحيّة الموظّف قطراتُ مطرٍ أو غبارٌ سبعَ ثوانٍ ثمّ تتلاشى، وسطرٌ في التحيّة
            مثل «{weatherGreetingLine("rain", "بغداد")}». لا يحجب زرّاً، ولمسةٌ توقفه، ومَن ضبط جهازَه على «تقليل الحركة» يرى السطرَ وحده.
          </p>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-muted-foreground">معاينة:</span>
            {FX_PREVIEW.map((p) => (
              <Button key={p.fx} size="sm" variant="outline" className="h-7" onClick={() => setPreview((old) => ({ fx: p.fx, n: (old?.n ?? 0) + 1 }))} data-testid={`weather-fx-preview-${p.fx}`}>
                {p.label}
              </Button>
            ))}
          </div>
          {preview && <WeatherFxLayer key={preview.n} fx={preview.fx} onDone={() => setPreview((cur) => (cur?.n === preview.n ? null : cur))} />}
        </div>
      )}
    </Card>
  );
}
