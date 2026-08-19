import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileBarChart, FileSpreadsheet, Printer } from "lucide-react";
import { formatDateIraq, formatTimeIraq, getTodayIraq } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { useBranchSession } from "@/components/BranchGate";
import {
  DEPARTMENT_LABELS, DEVICES_ROLLUP_LABEL, GRAND_TOTAL_LABEL, REPORT_ROW_LABELS,
} from "@shared/service_taxonomy";
import type { Branch } from "@shared/schema";

interface DailyPatientRow {
  visitId: number;
  patientId: number;
  date: string;
  patientName: string;
  age: number | null;
  phone: string | null;
  problem: string | null;
  actionToday: string | null;
  treatment: string | null;
  notes: string | null;
  branchId: number | null;
  branchName: string | null;
  employeeId: number | null;
  employeeName: string | null;
}


/** استجابةُ التقرير: جدولُ الزيارات كما كان، ومعه ملخّصٌ مالي محسوبٌ في الخادم. */
interface DepartmentMoneyRow { revenue: number; paid: number }
interface DailyReportResponse {
  date: string;
  branchId: number | null;
  visits: DailyPatientRow[];
  /** `null` لمن لا يملك صلاحية المحاسبة — الجدولُ يبقى، والمال يُحجب. */
  financial: {
    byDepartment: {
      prosthetic: DepartmentMoneyRow;
      medical_support: DepartmentMoneyRow;
      physiotherapy: DepartmentMoneyRow;
      /** أجهزةٌ قديمة مؤكَّدة لم يُثبَت نوعُها — مبيعاتٌ فقط. */
      legacyDevicesUnsplit: { revenue: number };
      unclassified: DepartmentMoneyRow;
    };
    rollups: {
      devicesCombined: DepartmentMoneyRow;
      classifiedTotal: DepartmentMoneyRow;
      grandTotal: DepartmentMoneyRow;
    };
    expenses: number;
    netCash: number;
  } | null;
}
type DailyFinancial = NonNullable<DailyReportResponse["financial"]>;

/**
 * صفوفُ الملخّص بترتيبها — **مصدرٌ واحد للشاشة وللتصدير وللطباعة**.
 *
 * لو بنى كلُّ مخرجٍ صفوفَه لنفسه لانحرف المطبوعُ عن المعروض أوّلَ تعديل،
 * والورقةُ المطبوعة تُوقَّع وتُحفظ — فخلافُها للشاشة أسوأُ من غيابها.
 */
function financialRows(f: DailyFinancial) {
  type Row = { key: string; label: string; m: { revenue: number; paid: number | null }; strong?: boolean };
  const legacy = f.byDepartment.legacyDevicesUnsplit?.revenue || 0;
  const unclassified = f.byDepartment.unclassified;
  const rows: Row[] = [
    { key: "prosthetic", label: DEPARTMENT_LABELS.prosthetic, m: f.byDepartment.prosthetic },
    { key: "medical_support", label: DEPARTMENT_LABELS.medical_support, m: f.byDepartment.medical_support },
  ];
  //  قبل مجموع الأجهزة مباشرة، فيرى القارئ لماذا يزيد المجموعُ على الصفّين
  //  فوقه. و`paid: null` لا صفر: لا نظيرَ له في المقبوض، والصفرُ ادّعاءُ قياس.
  if (legacy !== 0) {
    rows.push({ key: "legacyDevicesUnsplit", label: REPORT_ROW_LABELS.legacyDevicesUnsplit,
      m: { revenue: legacy, paid: null } });
  }
  rows.push(
    { key: "devices", label: DEVICES_ROLLUP_LABEL, m: f.rollups.devicesCombined, strong: true },
    { key: "physiotherapy", label: DEPARTMENT_LABELS.physiotherapy, m: f.byDepartment.physiotherapy },
  );
  //  «مجموع الأقسام المعروفة» يُعرَض فقط حين يختلف عن الإجمالي — وإلّا
  //  فهو صفٌّ مكرَّر يشوّش بلا أن يضيف.
  const hasGap = legacy !== 0 || (unclassified.revenue || 0) !== 0 || (unclassified.paid || 0) !== 0;
  if (hasGap) {
    rows.push({ key: "classifiedTotal", label: REPORT_ROW_LABELS.classifiedTotal, m: f.rollups.classifiedTotal });
    rows.push({ key: "unclassified", label: REPORT_ROW_LABELS.unclassified, m: unclassified });
  }
  rows.push({ key: "grand", label: GRAND_TOTAL_LABEL, m: f.rollups.grandTotal, strong: true });
  return rows;
}

/**
 * الملخّصُ المالي لليوم — **عرضٌ محض**.
 *
 * ولا حسابَ فيه إطلاقاً: كلُّ رقمٍ يصل محسوباً من مصدر الحقيقة المحاسبي
 * في الخادم. وحسابُ الأقسام هنا كان سينتج رقماً ثانياً يخالف صفحة
 * المحاسبة أوّلَ يومٍ يختلف فيه تعريفٌ بينهما.
 *
 * و**المقبوض والمبيعات عمودان منفصلان**: «الوارد» نقدٌ وصل، و«المبيعات»
 * كلفةٌ قُيِّدت. وقد كانا يُسمَّيان باسمٍ واحد فيُقرأ أحدهما مكان الآخر.
 */
function DailyFinancialSummary({ f, isAr }: {
  f: DailyFinancial; isAr: boolean;
}) {
  const money = (n: number | null) =>
    n === null ? "—" : `${(n || 0).toLocaleString("en-US")} ${isAr ? "د.ع" : "IQD"}`;
  const rows = financialRows(f);

  return (
    <div className="mb-5 rounded-lg border bg-slate-50/60 p-4" data-testid="card-daily-financial">
      <div className="mb-3 text-sm font-semibold">الملخّص المالي لليوم</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="p-2 text-right font-medium">القسم</th>
              <th className="p-2 text-right font-medium">الوارد (المقبوض)</th>
              <th className="p-2 text-right font-medium">المبيعات (كلفة مسجَّلة)</th>
            </tr>
          </thead>
          <tbody>
            {/*  الصفوفُ غيرُ المحسومة كهرمانية: مشكلةُ جودةِ بياناتٍ مرئية
                خيرٌ من رقمِ قسمٍ يكذب. */}
            {rows.map((r) => (
              <tr key={r.key}
                className={`border-t ${r.strong ? "font-semibold" : ""} ${
                  r.key === "unclassified" || r.key === "legacyDevicesUnsplit" ? "text-amber-700" : ""}`}
                data-testid={`row-daily-${r.key}`}>
                <td className="p-2">{r.label}</td>
                <td className="p-2" data-testid={`paid-${r.key}`}>{money(r.m.paid)}</td>
                <td className="p-2 text-slate-600" data-testid={`revenue-${r.key}`}>{money(r.m.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>المصاريف: <b data-testid="daily-expenses">{money(f.expenses)}</b></span>
        <span>الصافي النقدي: <b data-testid="daily-net">{money(f.netCash)}</b></span>
      </div>
    </div>
  );
}

export default function DailyPatientReport() {
  const { language } = useTranslation();
  const isAr = language === "ar";

  const [selectedDate, setSelectedDate] = useState<string>(getTodayIraq());
  const branchSession = useBranchSession();
  const isAdmin = !!branchSession?.isAdmin;
  const userBranchId = branchSession?.branchId;
  const userBranchName = branchSession?.branchName;

  // For admin: branch selector (empty = all). For non-admin: locked to their branch.
  const [adminBranchId, setAdminBranchId] = useState<string>("");
  const effectiveBranchId = isAdmin
    ? (adminBranchId || null)
    : (userBranchId ? String(userBranchId) : null);

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isAdmin,
  });

  const params = new URLSearchParams({ date: selectedDate });
  if (effectiveBranchId) params.set("branchId", effectiveBranchId);
  const queryString = `?${params.toString()}`;

  const { data, isLoading, isError } = useQuery<DailyReportResponse>({
    queryKey: ["/api/reports/daily-patient-report", { date: selectedDate, branchId: effectiveBranchId }],
    queryFn: async () => {
      const res = await fetch(`/api/reports/daily-patient-report${queryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  //  الأرقامُ تأتي محسوبةً من الخادم — **لا حسابَ مالياً في هذه الصفحة**.
  //  حسابُ الأقسام هنا كان سينتج رقماً ثانياً يخالف صفحة المحاسبة يوماً.
  const financial = data?.financial ?? null;

  const rows = (data?.visits ?? []).slice().sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    return ta - tb;
  });

  // The branch column earns its place only when the list actually mixes
  // branches — i.e. an admin viewing "all branches". Otherwise every row would
  // repeat the same name.
  const showBranchColumn = isAdmin && !adminBranchId;

  const labels = isAr
    ? {
        title: "التقرير اليومي للمرضى",
        subtitle: "زيارات اليوم المختار مرتبة حسب الوقت",
        patientName: "اسم المريض",
        age: "العمر",
        phone: "الهاتف",
        problem: "المشكلة",
        actionToday: "الإجراء اليوم",
        treatment: "العلاج",
        notes: "ملاحظات",
        date: "التاريخ",
        branch: "الفرع",
        allBranches: "كل الفروع",
        assignedBranch: "الفرع المعتمد",
        empty: "لا توجد زيارات في هذا اليوم",
        error: "تعذّر تحميل التقرير",
        rowsCount: (n: number) => `إجمالي الزيارات: ${n}`,
        print: "طباعة / PDF",
        excel: "إكسل",
        financialTitle: "الملخّص المالي لليوم",
        department: "القسم",
        paidColumn: "الوارد (المقبوض)",
        revenueColumn: "المبيعات (كلفة مسجَّلة)",
        expenses: "المصاريف",
        netCash: "الصافي النقدي",
      }
    : {
        title: "Daily Patient Report",
        subtitle: "Visits for the selected day sorted by time",
        patientName: "Patient Name",
        age: "Age",
        phone: "Phone",
        problem: "Problem",
        actionToday: "Action Today",
        treatment: "Treatment",
        notes: "Notes",
        date: "Date",
        branch: "Branch",
        allBranches: "All branches",
        assignedBranch: "Assigned branch",
        empty: "No visits on this day",
        error: "Failed to load report",
        rowsCount: (n: number) => `Total visits: ${n}`,
        print: "Print / PDF",
        excel: "Excel",
        //  أسماءُ الأقسام تبقى عربيةً في الحالين: هي قيمُ التصنيف نفسُها
        //  في `service_taxonomy`، وترجمتُها هنا تُنشئ اسماً ثانياً للقسم.
        financialTitle: "Daily financial summary",
        department: "Department",
        paidColumn: "Collected",
        revenueColumn: "Booked (cost entries)",
        expenses: "Expenses",
        netCash: "Net cash",
      };

  // The heading that names the scope of the exported list, so a printed sheet
  // is never ambiguous about which day and which branch it covers.
  const scopeLabel = showBranchColumn
    ? labels.allBranches
    : (isAdmin
        ? ((branches ?? []).find((b) => String(b.id) === adminBranchId)?.name ?? labels.allBranches)
        : (userBranchName || "-"));

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const sheetRows = rows.map((row, index) => {
      const base: Record<string, string | number> = { "#": index + 1 };
      base[labels.patientName] = row.patientName || "";
      base[labels.age] = row.age ?? "";
      base[labels.phone] = row.phone || "";
      base[labels.problem] = row.problem || "";
      base[labels.actionToday] = row.actionToday || "";
      base[labels.treatment] = row.treatment || "";
      base[labels.notes] = row.notes || "";
      if (showBranchColumn) base[labels.branch] = row.branchName || "";
      base[labels.date] = `${formatDateIraq(row.date)} ${formatTimeIraq(row.date)}`;
      return base;
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير اليومي");

    //  ورقةٌ ثانية للملخّص المالي لا أعمدةٌ مُقحَمة في جدول الزيارات:
    //  الجدولُ صفٌّ لكلّ زيارة، والملخّصُ صفٌّ لكلّ قسم — خلطهما يفسدهما معاً.
    if (financial) {
      //  خليةٌ فارغة لا صفر حين لا مقبوضَ يُقاس أصلاً (الأجهزة القديمة).
      const summarySheet = financialRows(financial).map((r) => ({
        [labels.department]: r.label,
        [labels.paidColumn]: r.m.paid === null ? ("" as unknown as number) : (r.m.paid || 0),
        [labels.revenueColumn]: r.m.revenue || 0,
      }));
      summarySheet.push({
        [labels.department]: labels.expenses,
        [labels.paidColumn]: financial.expenses || 0,
        [labels.revenueColumn]: "" as unknown as number,
      });
      summarySheet.push({
        [labels.department]: labels.netCash,
        [labels.paidColumn]: financial.netCash || 0,
        [labels.revenueColumn]: "" as unknown as number,
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), "الملخص المالي");
    }

    XLSX.writeFile(wb, `daily_patients_${selectedDate}.xlsx`);
  };

  // One window serves both "print" and "save as PDF" — the browser's own print
  // dialog offers PDF, which is how every other export in this app works.
  const printReport = () => {
    const esc = (v: unknown) =>
      String(v ?? "-").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

    const head = [
      "#", labels.patientName, labels.age, labels.phone, labels.problem,
      labels.actionToday, labels.treatment, labels.notes,
      ...(showBranchColumn ? [labels.branch] : []),
      labels.date,
    ];

    const body = rows.map((row, index) => [
      index + 1,
      row.patientName || "-",
      row.age ?? "-",
      row.phone || "-",
      row.problem || "-",
      row.actionToday || "-",
      row.treatment || "-",
      row.notes || "-",
      ...(showBranchColumn ? [row.branchName || "-"] : []),
      `${formatDateIraq(row.date)} ${formatTimeIraq(row.date)}`,
    ]);

    //  الملخّصُ يُطبَع فوق الجدول لا تحته: مَن يستلم الورقة يقرأ الأرقامَ
    //  أوّلاً، والتفصيلُ بعدها. ونفسُ `financialRows` فلا ينحرف عن الشاشة.
    const fmt = (n: number) => `${(n || 0).toLocaleString("en-US")} د.ع`;
    const summaryHtml = financial
      ? `<h2 class="sec">${esc(labels.financialTitle)}</h2>
  <table class="summary">
    <thead><tr>
      <th>${esc(labels.department)}</th><th>${esc(labels.paidColumn)}</th><th>${esc(labels.revenueColumn)}</th>
    </tr></thead>
    <tbody>${financialRows(financial).map((r) =>
        `<tr class="${r.strong ? "strong" : ""}${
          r.key === "unclassified" || r.key === "legacyDevicesUnsplit" ? " warn" : ""}">
        <td>${esc(r.label)}</td><td>${esc(r.m.paid === null ? "—" : fmt(r.m.paid))}</td>
        <td>${esc(fmt(r.m.revenue))}</td></tr>`).join("")}
    </tbody>
  </table>
  <p class="totals">${esc(labels.expenses)}: <b>${esc(fmt(financial.expenses))}</b>
     &nbsp;·&nbsp; ${esc(labels.netCash)}: <b>${esc(fmt(financial.netCash))}</b></p>`
      : "";

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${esc(labels.title)} - ${esc(selectedDate)}</title>
  <style>
    * { font-family: Tajawal, Arial, sans-serif; }
    body { padding: 20px; direction: rtl; }
    h1 { text-align: center; color: #0f766e; margin-bottom: 4px; font-size: 20px; }
    h3 { text-align: center; color: #6b7280; margin-top: 0; font-size: 13px; font-weight: normal; }
    h2.sec { color: #0f766e; font-size: 14px; margin: 18px 0 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
    th { background: #0f766e; color: #fff; padding: 7px 5px; border: 1px solid #cbd5e1; }
    td { padding: 6px 5px; border: 1px solid #cbd5e1; text-align: center; }
    tr:nth-child(even) td { background: #f8fafc; }
    table.summary { margin-top: 4px; width: auto; min-width: 60%; }
    table.summary tr.strong td { font-weight: bold; background: #ecfdf5; }
    table.summary tr.warn td { color: #b45309; }
    p.totals { font-size: 12px; margin: 6px 0 0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>${esc(labels.title)} — مراكز د. ياسر الساعدي</h1>
  <h3>${esc(formatDateIraq(selectedDate))} · ${esc(scopeLabel)} · ${esc(labels.rowsCount(rows.length))}</h3>
  ${summaryHtml}
  <table>
    <thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  return (
    <div className="space-y-6" data-testid="page-daily-patient-report">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileBarChart className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900" data-testid="text-page-title">
            {labels.title}
          </h1>
          <p className="text-sm text-slate-500">{labels.subtitle}</p>
        </div>
      </div>

      <Card className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4" data-testid="filters-bar">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">{labels.date}</label>
            <DatePickerIraq
              value={selectedDate}
              onChange={setSelectedDate}
              data-testid="input-report-date"
            />
          </div>

          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-sm font-medium text-slate-700">
              {isAdmin ? labels.branch : labels.assignedBranch}
            </label>
            {isAdmin ? (
              <Select value={adminBranchId || "all"} onValueChange={(v) => setAdminBranchId(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="select-report-branch">
                  <SelectValue placeholder={labels.allBranches} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-branch-all">{labels.allBranches}</SelectItem>
                  {(branches ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)} data-testid={`option-branch-${b.id}`}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div
                className="h-10 px-3 flex items-center rounded-md border border-input bg-slate-50 text-sm text-slate-700"
                data-testid="text-assigned-branch"
              >
                {userBranchName || "-"}
              </div>
            )}
          </div>

          {/* Exports act on exactly what the table shows — same day, same
              branch scope, same columns. */}
          <div className="flex gap-2 sm:mr-auto">
            <Button
              variant="outline"
              className="gap-2"
              onClick={printReport}
              disabled={rows.length === 0}
              data-testid="button-print-report"
            >
              <Printer className="w-4 h-4" />
              {labels.print}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={exportToExcel}
              disabled={rows.length === 0}
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {labels.excel}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3" data-testid="state-loading">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-destructive" data-testid="state-error">
            {labels.error}
          </div>
        ) : (
          <>
          {/*  الملخّصُ المالي — **يظهر ولو لم تكن ثمّة زيارات**: يومٌ بلا
              زيارةٍ قد يحمل قبضاً من مريضٍ سابق، وإخفاؤه كان يُضيّع المال
              من التقرير. وأرقامُه كلُّها محسوبةٌ في الخادم. */}
          {financial && <DailyFinancialSummary f={financial} isAr={isAr} />}
          {rows.length === 0 ? (
          <div className="py-12 text-center text-slate-500" data-testid="state-empty">
            {labels.empty}
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-slate-600" data-testid="text-rows-count">
              {labels.rowsCount(rows.length)}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.patientName}</TableHead>
                    <TableHead>{labels.age}</TableHead>
                    <TableHead>{labels.phone}</TableHead>
                    <TableHead>{labels.problem}</TableHead>
                    <TableHead>{labels.actionToday}</TableHead>
                    <TableHead>{labels.treatment}</TableHead>
                    <TableHead>{labels.notes}</TableHead>
                    {showBranchColumn && <TableHead>{labels.branch}</TableHead>}
                    <TableHead>{labels.date}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.visitId} data-testid={`row-visit-${row.visitId}`}>
                      <TableCell className="font-medium" data-testid={`text-patient-name-${row.visitId}`}>
                        {row.patientName || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-age-${row.visitId}`}>
                        {row.age ?? "-"}
                      </TableCell>
                      <TableCell data-testid={`text-phone-${row.visitId}`}>
                        {row.phone || "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap" data-testid={`text-problem-${row.visitId}`}>
                        {row.problem || "-"}
                      </TableCell>
                      <TableCell className="max-w-[260px] whitespace-pre-wrap" data-testid={`text-action-${row.visitId}`}>
                        {row.actionToday || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-treatment-${row.visitId}`}>
                        {row.treatment || "-"}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap" data-testid={`text-notes-${row.visitId}`}>
                        {row.notes || "-"}
                      </TableCell>
                      {showBranchColumn && (
                        <TableCell className="whitespace-nowrap" data-testid={`text-branch-${row.visitId}`}>
                          {row.branchName || "-"}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap" data-testid={`text-date-${row.visitId}`}>
                        {formatDateIraq(row.date)} {formatTimeIraq(row.date)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
          </>
        )}
      </Card>
    </div>
  );
}
