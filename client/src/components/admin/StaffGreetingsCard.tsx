// **عباراتُ الترحيب اليومية** (§4.dp) — بطاقةُ المسؤول في «تنبيهات الموظفين»: العباراتُ التي تتناوب على موظّفيه كلَّ يوم، وعمرُها، وتغييرُها،
// و«أبقِها شهراً آخر». والتذكيرُ يصله بعد ثلاثين يوماً في تلغرام وفي نافذةٍ عند دخوله.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudRain, Plus, Smile, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { WeatherFxLayer } from "@/components/WeatherFxLayer";
import { weatherGreetingLine, type WeatherFx } from "@shared/weather_greeting_fx";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GREETING_MAX_CHARS, GREETINGS_MAX, greetingText } from "@shared/staff_greeting";

interface Config { phrases: string[]; updatedAt: string; updatedByName: string | null; keptAt?: string | null; days: number; due: boolean; weatherFx?: boolean }

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
    qc.setQueryData(["/api/admin/greeting"], c);
    qc.invalidateQueries({ queryKey: ["/api/greeting"] });
    setRows([...c.phrases]);
    setBase([...c.phrases]);
    toast({ title });
  };
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PUT", "/api/admin/greeting", { phrases: rows ?? [] })).json(),
    onSuccess: (c: Config) => done(c, "حُفظت العبارات — ويُعدّ الشهرُ من اليوم"),
    onError: (e) => toast({ title: "تعذّر الحفظ", description: errText(e), variant: "destructive" }),
  });
  const keep = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/greeting/keep", {})).json(),
    onSuccess: (c: Config) => done(c, "أُبقيت العبارات شهراً آخر"),
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
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
    <Card className="p-6 space-y-3" data-testid="staff-greetings-card">
      <div className="flex items-center gap-2 flex-wrap">
        <Smile className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold">عبارات الترحيب اليومية</h3>
        {c && (c.due
          ? <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300" data-testid="greetings-due">حان التغيير — مضى {c.days} يوماً</Badge>
          : <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300" data-testid="greetings-age">مضى {c.days} يوماً من ٣٠</Badge>)}
      </div>
      <p className="text-sm text-muted-foreground leading-7">
        تظهر لكلّ موظّفٍ مرّةً كلَّ يوم عند دخوله الأوّل: «صباح الخير» حتى الثانية عشرة ظهراً و«مساء الخير» بعدها، ثمّ اسمُه، ثمّ عبارةٌ من هذه —
        تتناوب يوماً بعد يوم. وبعد ثلاثين يوماً يصلك تذكيرٌ في تلغرام وعند دخولك لتغييرها.
      </p>
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
        {/*  «أبقِها» تُبقي المحفوظ — **فلا تُضغط وفي البطاقة تعديلٌ لم يُحفظ** (مراجعةُ Codex): كانت تمحوه بصمت. احفظه أو تراجع عنه أوّلاً. */}
        <Button size="sm" variant="ghost" disabled={keep.isPending || dirty} onClick={() => keep.mutate()} data-testid="greeting-keep">أبقِها شهراً آخر</Button>
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => setRows(base ? [...base] : null)} data-testid="greeting-undo">تراجع عن تعديلي</Button>
        )}
      </div>
      {dirty && (
        <p className="text-[11px] text-amber-800" data-testid="greeting-unsaved">في البطاقة تعديلٌ لم يُحفظ — احفظه، أو تراجع عنه لتُبقي العباراتِ كما هي.</p>
      )}
      {c && (
        <p className="text-[11px] text-muted-foreground">
          آخرُ تغيير: {new Date(c.updatedAt).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" })}
          {c.updatedByName ? ` — ${c.updatedByName}` : " — العباراتُ الأولى"}
          {c.keptAt ? ` · أُبقيت في ${new Date(c.keptAt).toLocaleDateString("ar-IQ", { month: "short", day: "numeric" })}` : ""}
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
