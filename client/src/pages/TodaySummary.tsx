// «ملخص مرضى اليوم» (§4.gy) — بطاقةٌ لكلّ مريضٍ جرى له شيءٌ في الفرع في يومٍ من أيام بغداد، بالنموذج الذي وافق عليه المالك ٢٠٢٦-١١-٢٧.
// البطاقاتُ والمجاميعُ من الخادم (`buildTodayCards`) — لا حسابَ هنا؛ والمرشِّحاتُ وExcel والطباعة من البطاقات نفسِها (`filterCards` · `exportRows`).
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, ChevronLeft, ChevronRight, FileSpreadsheet, Printer, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { useBranchSession } from "@/components/BranchGate";
import { formatTimeIraq, getTodayIraq } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Branch } from "@shared/schema";
import { sortBranchesForDisplay } from "@shared/branch_order";
import {
  TODAY_SUMMARY_API, TODAY_SUMMARY_TITLE, arabicDayLabel, exportRows, filterCards,
  type NewFilter, type TodayCard, type TodaySummaryTotals, type StatusTone,
} from "@shared/today_summary";

interface SummaryResponse {
  day: string; branchId: number | null; branchName: string | null; withMoney: boolean;
  totals: TodaySummaryTotals; cards: TodayCard[];
}

const DEPARTMENTS = ["أطراف صناعية", "مساند طبية", "علاج طبيعي"] as const;
const DEPT_SHORT: Record<string, string> = { "أطراف صناعية": "أطراف", "مساند طبية": "مساند", "علاج طبيعي": "علاج طبيعي" };
const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const money = (n: number) => `${(n || 0).toLocaleString("en-US")} د.ع`;
const shiftDay = (ymd: string, by: number) => {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
};
const weekday = (ymd: string) => WEEKDAYS[new Date(`${ymd}T00:00:00Z`).getUTCDay()];

const TONE: Record<StatusTone, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  mid: "bg-teal-50 text-teal-700",
};

function PatientCard({ c, withMoney, showBranch }: { c: TodayCard; withMoney: boolean; showBranch: boolean }) {
  const first = c.events[0];
  return (
    <Card className="p-4" data-testid={`today-card-${c.patientId}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <a href={`/patients/${c.patientId}`} className="font-bold text-base text-slate-900 hover:underline" data-testid="today-card-name">{c.name}</a>
        <span className="text-xs text-muted-foreground">{[c.code, c.age ? `${c.age} سنة` : null].filter(Boolean).join(" · ")}</span>
        <span className={cn("text-xs font-bold rounded-full px-2 py-0.5", c.isNew ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600")}
          data-testid="today-card-new">{c.newLabel}</span>
        {c.departments.map((d) => (
          <span key={d} className="text-xs rounded-full px-2 py-0.5 bg-teal-50 text-teal-700">{d}</span>
        ))}
        {showBranch && c.branchName && <span className="text-xs rounded-full px-2 py-0.5 border">{c.branchName}</span>}
        <span className="text-xs text-muted-foreground md:ms-auto w-full md:w-auto">
          {c.attended ? `وصل ${formatTimeIraq(first.at)}` : formatTimeIraq(first.at)}
          {c.registeredBy ? ` · سجّله ${c.registeredBy}` : ""}
        </span>
      </div>
      <div className="grid gap-3 mt-3 md:grid-cols-[1.1fr_1.6fr_1.1fr]">
        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground">سبب الحضور</div>
            <div className="font-bold" data-testid="today-card-reason">{c.reasons.join(" · ")}</div>
          </div>
          {c.problem && (
            <div>
              <div className="text-xs text-muted-foreground">شنو عنده</div>
              <div data-testid="today-card-problem">{c.problem}</div>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">ما جرى اليوم</div>
          <ol className="space-y-1" data-testid="today-card-events">
            {c.events.map((e, i) => (
              <li key={i} className="relative ps-5 text-sm leading-relaxed">
                <span className="absolute start-1 top-2 w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground tabular-nums me-1.5">{formatTimeIraq(e.at)}</span>
                {e.text}
                {e.amount != null && <b className={cn("ms-1 tabular-nums", e.kind === "refund" ? "text-rose-700" : "text-emerald-700")}>{money(e.amount)}</b>}
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">حالته الآن</div>
          <div className="flex flex-wrap gap-1" data-testid="today-card-status">
            {c.statuses.length ? c.statuses.map((s, i) => (
              <span key={i} className={cn("text-sm font-bold rounded-md px-2 py-0.5", TONE[s.tone])}>{s.text}</span>
            )) : <span className="text-sm text-muted-foreground">—</span>}
          </div>
          {withMoney && c.money && (
            <div className="text-sm leading-7" data-testid="today-card-money">
              {c.money.paid > 0 ? <div className="text-emerald-700">دفع اليوم <b className="tabular-nums">{money(c.money.paid)}</b></div>
                : <div>لم يدفع اليوم</div>}
              {c.money.refunded > 0 && <div className="text-rose-700">استرجع <b className="tabular-nums">{money(c.money.refunded)}</b></div>}
              <div>المتبقي عليه <b className={cn("tabular-nums", c.money.remaining > 0 && "text-rose-700")}>{money(c.money.remaining)}</b></div>
              {c.money.credit > 0 && <div className="text-amber-700">له رصيد <b className="tabular-nums">{money(c.money.credit)}</b></div>}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function TodaySummary() {
  const branchSession = useBranchSession();
  const isAdmin = !!branchSession?.isAdmin;
  const today = getTodayIraq();
  const [day, setDay] = useState(today);
  //  المسؤولُ يبدأ بفرعه النشط (٠ = كلّ الفروع)، وغيرُه مقفولٌ على فرع جلسته في الخادم.
  const [adminBranch, setAdminBranch] = useState<string>(() =>
    isAdmin && branchSession?.branchId && branchSession.branchId > 0 ? String(branchSession.branchId) : "0");
  const [who, setWho] = useState<NewFilter>("all");
  const [depts, setDepts] = useState<string[]>([...DEPARTMENTS]);
  const [search, setSearch] = useState("");

  const { data: branches } = useQuery<Branch[]>({ queryKey: ["/api/branches"], enabled: isAdmin });
  const branchId = isAdmin ? adminBranch : String(branchSession?.branchId ?? "");
  const { data, isLoading, isError, error } = useQuery<SummaryResponse>({
    queryKey: [TODAY_SUMMARY_API, { day, branchId }],
    queryFn: async () => {
      const qs = new URLSearchParams({ date: day });
      if (isAdmin && branchId !== "0") qs.set("branchId", branchId);
      const res = await fetch(`${TODAY_SUMMARY_API}?${qs}`, { credentials: "include" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || "تعذّر تحميل الملخص");
      return j;
    },
  });

  const allCards = data?.cards ?? [];
  const withMoney = Boolean(data?.withMoney);
  const showBranch = isAdmin && branchId === "0";
  const deptFilter = depts.length === DEPARTMENTS.length ? null : depts;
  const visible = useMemo(() => filterCards(allCards, { who, departments: deptFilter, search }), [allCards, who, deptFilter, search]);
  const attended = visible.filter((c) => c.attended);
  const paymentOnly = visible.filter((c) => !c.attended);
  const t = data?.totals;
  const scopeName = showBranch ? "كل الفروع" : (data?.branchName ?? branchSession?.branchName ?? "");
  const dayLine = `${weekday(day)} ${arabicDayLabel(day)}`;

  const toggleDept = (d: string) =>
    setDepts((cur) => (cur.includes(d) ? (cur.length > 1 ? cur.filter((x) => x !== d) : cur) : [...cur, d]));

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(exportRows(visible, withMoney, formatTimeIraq)), "ملخص مرضى اليوم");
    XLSX.writeFile(wb, `today_patients_${day}.xlsx`);
  };

  const printSummary = () => {
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const [head, ...rows] = exportRows(visible, withMoney, formatTimeIraq);
    const totalsLine = t ? `المرضى ${t.patients} · جدد ${t.newCount} · قدامى ${t.oldCount}${withMoney && t.paidToday != null ? ` · المقبوض ${money(t.paidToday)}` : ""}` : "";
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${esc(TODAY_SUMMARY_TITLE)} — ${esc(day)}</title>
<style>*{font-family:Tajawal,Arial,sans-serif}body{padding:16px;direction:rtl}h1{text-align:center;color:#0f766e;font-size:19px;margin:0 0 4px}
h3{text-align:center;color:#6b7280;font-size:12px;font-weight:normal;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:10.5px}
th{background:#0f766e;color:#fff;padding:6px 4px;border:1px solid #cbd5e1}td{padding:5px 4px;border:1px solid #cbd5e1;vertical-align:top;white-space:pre-line}
tr:nth-child(even) td{background:#f8fafc}@page{size:A4 landscape;margin:10mm}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body><h1>${esc(TODAY_SUMMARY_TITLE)} — مراكز د. ياسر الساعدي</h1><h3>${esc(scopeName)} · ${esc(dayLine)} · ${esc(totalsLine)}</h3>
<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html); win.document.close();
    win.onload = () => win.print();
  };

  const chip = (on: boolean) => cn("text-sm rounded-full border px-3 py-1 transition-colors",
    on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted");

  //  «كل الفروع»: عنوانٌ لكلّ فرعٍ بترتيبه — والبطاقاتُ مرتّبةٌ به من الخادم.
  const renderList = (list: TodayCard[]) => list.map((c, i) => (
    <div key={c.key}>
      {showBranch && (i === 0 || list[i - 1].branchId !== c.branchId) && (
        <div className="text-sm font-bold text-muted-foreground mt-4 mb-2">{c.branchName ?? "بلا فرع"}</div>
      )}
      <PatientCard c={c} withMoney={withMoney} showBranch={false} />
    </div>
  ));

  return (
    <div className="space-y-3" data-testid="page-today-summary">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-slate-900" data-testid="text-page-title">{TODAY_SUMMARY_TITLE}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ms-auto">
          {isAdmin ? (
            <Select value={adminBranch} onValueChange={setAdminBranch}>
              <SelectTrigger className="w-full md:w-48" data-testid="today-branch"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">كل الفروع</SelectItem>
                {sortBranchesForDisplay(branches ?? []).map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : <span className="font-semibold text-sm">{branchSession?.branchName}</span>}
          <Button variant="outline" size="icon" aria-label="اليوم السابق" onClick={() => setDay((d) => shiftDay(d, -1))} data-testid="today-prev">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <DatePickerIraq value={day} onChange={(v) => setDay(v > today ? today : v)} data-testid="today-date" />
          <Button variant="outline" size="icon" aria-label="اليوم التالي" disabled={day >= today} onClick={() => setDay((d) => shiftDay(d, 1))} data-testid="today-next">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={printSummary} disabled={!visible.length} data-testid="today-print"><Printer className="w-4 h-4 me-1" />طباعة / PDF</Button>
          <Button onClick={exportExcel} disabled={!visible.length} data-testid="today-excel"><FileSpreadsheet className="w-4 h-4 me-1" />Excel</Button>
        </div>
      </div>

      {t && (
        <div className="flex flex-wrap rounded-xl border bg-card overflow-hidden" data-testid="today-totals">
          {[
            { v: t.patients, l: day === today ? "مريضاً اليوم" : `مريضاً يوم ${dayLine}`, cls: "" },
            { v: t.newCount, l: "جدد", cls: "text-violet-700" },
            { v: t.oldCount, l: "قدامى", cls: "" },
            ...(withMoney && t.paidToday != null ? [
              { v: money(t.paidToday), l: "المقبوض", cls: "text-emerald-700" },
              { v: t.unpaid ?? 0, l: "حضروا ولم يدفعوا", cls: "" },
            ] : []),
          ].map((x, i) => (
            <div key={i} className="flex-1 min-w-[33%] md:min-w-[120px] px-4 py-2 border-s first:border-s-0 border-t md:border-t-0">
              <b className={cn("block text-lg tabular-nums", x.cls)}>{x.v}</b>
              <span className="text-xs text-muted-foreground">{x.l}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {([["all", `الكل ${t ? t.patients + t.paymentOnly : ""}`], ["new", `جدد ${t?.newCount ?? ""}`], ["old", `قدامى ${t?.oldCount ?? ""}`]] as const).map(([k, l]) => (
          <button key={k} type="button" className={chip(who === k)} onClick={() => setWho(k)} data-testid={`today-who-${k}`}>{l}</button>
        ))}
        <span className="w-px h-5 bg-border mx-1" />
        {DEPARTMENTS.map((d) => (
          <button key={d} type="button" className={chip(depts.includes(d))} onClick={() => toggleDept(d)} data-testid={`today-dept-${d}`}>{DEPT_SHORT[d]}</button>
        ))}
        <label className="relative flex-1 min-w-[160px]">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الرمز"
            className="w-full rounded-full border bg-background ps-9 pe-3 py-1.5 text-sm" data-testid="today-search" />
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
      ) : isError ? (
        <Card className="p-6 text-center text-rose-700">{(error as Error)?.message || "تعذّر تحميل الملخص"}</Card>
      ) : !visible.length ? (
        <Card className="p-8 text-center text-muted-foreground" data-testid="today-empty">
          {allCards.length ? "لا مريضَ بهذه التصفية" : `لم يحضر أحدٌ ${day === today ? "اليوم" : `يوم ${dayLine}`} بعد`}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {renderList(attended)}
          {paymentOnly.length > 0 && (
            <>
              <div className="text-sm font-bold text-muted-foreground pt-3" data-testid="today-payment-only">دفعوا دون أن يحضروا (قسط أو دَين قديم)</div>
              {renderList(paymentOnly)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
