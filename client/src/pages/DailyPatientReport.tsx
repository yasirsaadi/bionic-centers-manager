import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart } from "lucide-react";
import { formatDateIraq, formatTimeIraq, getTodayIraq } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { useBranchSession } from "@/components/BranchGate";
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

  const { data, isLoading, isError } = useQuery<DailyPatientRow[]>({
    queryKey: ["/api/reports/daily-patient-report", { date: selectedDate, branchId: effectiveBranchId }],
    queryFn: async () => {
      const res = await fetch(`/api/reports/daily-patient-report${queryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  const rows = (data ?? []).slice().sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    return ta - tb;
  });

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
        ) : rows.length === 0 ? (
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
      </Card>
    </div>
  );
}
