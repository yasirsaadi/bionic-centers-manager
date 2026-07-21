import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link, useSearch, useLocation } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Eye, Building2, ChevronRight, ChevronLeft, CalendarDays, Users, Calendar, FileSpreadsheet, FileText, Download, UserCog } from "lucide-react";
import { AssignExpertDialog } from "@/components/manufacturing/AssignExpertDialog";
import { PhysioPricingDialog } from "@/components/PhysioPricingDialog";
import { Activity } from "lucide-react";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import type { Branch } from "@shared/schema";
import { formatDateIraq, formatTimeIraq, getTodayIraq } from "@/lib/utils";
import { useTranslation, useLanguage } from "@/i18n/LanguageContext";

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// A patient can carry more than one case type at once (e.g. أطراف + مساند +
// علاج طبيعي). The list used to show a single badge via an if/else chain, so a
// second type stayed hidden. This renders ONE badge per active type so the
// full picture is visible straight from the search results.
function CaseTypeBadges({ patient, labels }: {
  patient: { isAmputee: boolean | null; isPhysiotherapy: boolean | null; isMedicalSupport: boolean | null };
  labels: { amputee: string; physiotherapy: string; medicalSupport: string };
}) {
  const types: { label: string; variant: "default" | "secondary" | "outline" }[] = [];
  if (patient.isAmputee) types.push({ label: labels.amputee, variant: "default" });
  if (patient.isPhysiotherapy) types.push({ label: labels.physiotherapy, variant: "secondary" });
  if (patient.isMedicalSupport) types.push({ label: labels.medicalSupport, variant: "outline" });
  if (types.length === 0) return <span className="text-slate-400">-</span>;
  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {types.map((tp) => (
        <Badge key={tp.label} variant={tp.variant} className="font-normal text-xs shrink-0">{tp.label}</Badge>
      ))}
    </div>
  );
}

export default function PatientsList() {
  const branchSession = useBranchSession();
  const { t, dir } = useTranslation();
  const { language } = useLanguage();
  const permissions = usePermissions();
  const isAdmin = branchSession?.isAdmin || false;
  const userBranchId = branchSession?.branchId;
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  // "تحديد خبير" — reception / branch manager / admin may assign a manufacturing
  // expert to any أطراف/مساند patient from the registry. A pure expert does not
  // assign experts. This replaces assigning the expert at patient creation.
  const isExpert = branchSession?.role === "prosthetics_expert";
  // Mirrors the server gate: assigning creates a work order (a WRITE), so it
  // needs canAddPatients — view-only users don't get the button.
  const canAssignExpert = !isExpert && (isAdmin || branchSession?.role === "branch_manager"
    || !!permissions.canAddPatients);
  const [assignExpertPatient, setAssignExpertPatient] = useState<{ id: number; branchId: number; name: string; isAmputee?: boolean | null; isMedicalSupport?: boolean | null } | null>(null);
  // «الكلفة والجلسات» — post-exam physiotherapy pricing (same gate: it writes).
  const [physioPricingPatient, setPhysioPricingPatient] = useState<{ id: number; name: string } | null>(null);
  
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = sessionStorage.getItem("patients_pageSize");
    return saved ? Number(saved) : 10;
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const saved = sessionStorage.getItem("patients_currentPage");
    return saved ? Number(saved) : 1;
  });
  const [viewMode, setViewMode] = useState<"date" | "all">(() => {
    const saved = sessionStorage.getItem("patients_viewMode");
    return (saved === "date" || saved === "all") ? saved : "date";
  });
  
  // Get branch from URL query parameter for admin users
  const urlParams = new URLSearchParams(searchString);
  const branchFromUrl = urlParams.get("branch");
  
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    if (!isAdmin && userBranchId) return String(userBranchId);
    if (branchFromUrl) return branchFromUrl;
    const saved = sessionStorage.getItem("patients_selectedBranch");
    if (saved) return saved;
    return "all";
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const saved = sessionStorage.getItem("patients_selectedDate");
    return saved || getTodayDateString();
  });

  useEffect(() => {
    sessionStorage.setItem("patients_pageSize", String(pageSize));
    sessionStorage.setItem("patients_currentPage", String(currentPage));
    sessionStorage.setItem("patients_viewMode", viewMode);
    sessionStorage.setItem("patients_selectedBranch", selectedBranch);
    sessionStorage.setItem("patients_selectedDate", selectedDate);
  }, [pageSize, currentPage, viewMode, selectedBranch, selectedDate]);
  
  // Sync branch from URL for admin users
  useEffect(() => {
    if (isAdmin && branchFromUrl && branchFromUrl !== selectedBranch) {
      setSelectedBranch(branchFromUrl);
    }
  }, [branchFromUrl, isAdmin]);
  
  // Lock branch filter for non-admin users
  useEffect(() => {
    if (!isAdmin && userBranchId) {
      setSelectedBranch(String(userBranchId));
    }
  }, [isAdmin, userBranchId]);
  
  // Update URL when branch changes (for admin users only)
  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
    setCurrentPage(1);
    if (isAdmin) {
      const newUrl = value === "all" ? "/patients" : `/patients?branch=${value}`;
      setLocation(newUrl, { replace: true });
    }
  };

  const getBranchName = (branchId: number) => {
    return branches?.find(b => b.id === branchId)?.name || "-";
  };

  // Server-side registry: search, filters, pagination and payment totals all
  // run in SQL — the browser receives ONE small page instead of every patient
  // with all their visits and payments. This is what makes the registry fast.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const buildRegistryParams = (page: number, size: number) => {
    const p = new URLSearchParams({ page: String(page), pageSize: String(size) });
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (selectedBranch !== "all") p.set("branchId", selectedBranch);
    if (viewMode === "date" && !debouncedSearch) p.set("visitDate", selectedDate);
    return p;
  };

  interface RegistryRow {
    id: number; name: string; phone: string | null; age: string; branchId: number;
    medicalCondition: string; isAmputee: boolean | null; isPhysiotherapy: boolean | null;
    isMedicalSupport: boolean | null; amputationSite: string | null; supportType: string | null;
    diseaseType: string | null; patientClassification: string | null; totalCost: number | null;
    createdAt: string | null; totalPaid: number;
  }
  interface RegistryResponse {
    total: number; page: number; pageSize: number;
    counts: { branch: number; date: number };
    rows: RegistryRow[];
  }

  const { data: registry, isLoading } = useQuery<RegistryResponse>({
    queryKey: ["/api/patients/registry", currentPage, pageSize, debouncedSearch, selectedBranch, viewMode, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/patients/registry?${buildRegistryParams(currentPage, pageSize)}`, { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const paginatedPatients = registry?.rows ?? [];
  const totalPatients = registry?.total ?? 0;
  const branchCount = registry?.counts?.branch ?? 0;
  const dateCount = registry?.counts?.date ?? 0;
  const totalPages = Math.ceil(totalPatients / pageSize);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;

  // Exports need the full filtered list (not just the visible page) — fetch
  // it on demand with the same filters.
  const fetchAllForExport = async (): Promise<RegistryRow[]> => {
    const res = await fetch(`/api/patients/registry?${buildRegistryParams(1, 10000)}`, { credentials: "include" });
    if (!res.ok) return [];
    return (await res.json()).rows;
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value as "date" | "all");
    setCurrentPage(1);
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setCurrentPage(1);
  };

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const dataToExport = await fetchAllForExport();

    if (dataToExport.length === 0) {
      alert("لا يوجد مرضى للتصدير. جرب اختيار تاريخ آخر أو تبويب 'جميع المرضى'");
      return;
    }

    const excelData = dataToExport.map((patient, index) => {
      const totalPaid = patient.totalPaid || 0;
      const remaining = (patient.totalCost || 0) - totalPaid;
      return {
        "#": index + 1,
        "الاسم": patient.name,
        "الهاتف": patient.phone || "",
        "العمر": patient.age,
        "الحالة": [patient.isAmputee ? "بتر" : null, patient.isPhysiotherapy ? "علاج طبيعي" : null, patient.isMedicalSupport ? "مساند طبية" : null].filter(Boolean).join(" + ") || "-",
        "تصنيف المريض": patient.patientClassification === "new" ? "مريض جديد" : patient.patientClassification === "past" ? "مريض قديم" : "",
        "الفرع": getBranchName(patient.branchId),
        "التكلفة الكلية": patient.totalCost || 0,
        "المبلغ المتبقي": remaining > 0 ? remaining : 0,
        "تاريخ التسجيل": patient.createdAt ? formatDateIraq(new Date(patient.createdAt)) : "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المرضى");
    
    const dateStr = viewMode === "date" ? selectedDate : "all";
    XLSX.writeFile(wb, `patients_${dateStr}.xlsx`);
  };

  const exportToPDF = async () => {
    const dataToExport = await fetchAllForExport();

    if (dataToExport.length === 0) {
      alert("لا يوجد مرضى للتصدير. جرب اختيار تاريخ آخر أو تبويب 'جميع المرضى'");
      return;
    }
    
    const dateLabel = viewMode === "date" ? `التاريخ: ${selectedDate}` : "جميع المرضى";
    
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>سجل المرضى</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
          * { font-family: 'Tajawal', Arial, sans-serif; }
          body { padding: 20px; direction: rtl; }
          h1 { text-align: center; color: #1e40af; margin-bottom: 5px; }
          h3 { text-align: center; color: #6b7280; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3b82f6; color: white; padding: 10px; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; text-align: center; }
          tr:nth-child(even) { background: #f5f7fa; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>سجل المرضى - مراكز الدكتور ياسر الساعدي</h1>
        <h3>${dateLabel}</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>الاسم</th>
              <th>الهاتف</th>
              <th>العمر</th>
              <th>الحالة</th>
              <th>التصنيف</th>
              <th>الفرع</th>
              <th>التكلفة</th>
              <th>المتبقي</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            ${dataToExport.map((patient, index) => {
              const totalPaid = patient.totalPaid || 0;
              const remaining = Math.max(0, (patient.totalCost || 0) - totalPaid);
              return `
              <tr>
                <td>${index + 1}</td>
                <td>${patient.name}</td>
                <td>${patient.phone || "-"}</td>
                <td>${patient.age}</td>
                <td>${[patient.isAmputee ? "بتر" : null, patient.isPhysiotherapy ? "علاج طبيعي" : null, patient.isMedicalSupport ? "مساند" : null].filter(Boolean).join(" + ") || "-"}</td>
                <td>${patient.patientClassification === "new" ? "جديد" : patient.patientClassification === "past" ? "قديم" : "-"}</td>
                <td>${getBranchName(patient.branchId)}</td>
                <td>${(patient.totalCost || 0).toLocaleString()}</td>
                <td style="color: ${remaining > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${remaining.toLocaleString()}</td>
                <td>${patient.createdAt ? formatDateIraq(new Date(patient.createdAt)) : ""}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 page-transition" dir={dir}>
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center md:gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-800">{t.patients.title}</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{t.patients.subtitle}</p>
        </div>
        {permissions.canAddPatients && (
          <Link href="/patients/new">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 h-10 md:h-12 px-4 md:px-6 rounded-xl w-full md:w-auto">
              <Plus className="w-5 h-5" />
              {t.patients.addNewPatient}
            </Button>
          </Link>
        )}
      </div>

      {/* Branch Filter + View Mode Tabs */}
      <div className="flex flex-col gap-3 bg-white p-3 md:p-4 rounded-xl border border-border shadow-sm">
        {/* Branch Filter - Admin sees selector, Staff sees their branch badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
            <Building2 className="w-4 h-4 text-primary" />
            <span>{isAdmin ? t.patients.selectBranchLabel : t.patients.branchLabel}</span>
          </div>
          {isAdmin ? (
            <Select value={selectedBranch} onValueChange={handleBranchChange}>
              <SelectTrigger className="w-full sm:w-[200px] h-10" data-testid="select-branch-filter">
                <SelectValue placeholder={t.dashboard.allBranches} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.dashboard.allBranches}</SelectItem>
                {branches?.map(branch => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {t.branches[branch.name as keyof typeof t.branches] || branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="text-sm px-3 py-1.5 bg-primary/5 border-primary/20">
              {(() => { const name = branchSession?.branchName || getBranchName(userBranchId || 0); return t.branches[name as keyof typeof t.branches] || name; })()}
            </Badge>
          )}
          {selectedBranch !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {branchCount} {t.patients.patientsInBranch}
            </Badge>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-slate-100">
          <Tabs value={viewMode} onValueChange={handleViewModeChange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger value="date" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-date-patients">
                <Calendar className="w-4 h-4" />
                <span>{t.patients.datePatients}</span>
                <Badge variant="secondary" className="mr-1 text-xs">{dateCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="tab-all-patients">
                <Users className="w-4 h-4" />
                <span>{t.patients.allPatients}</span>
                <Badge variant="secondary" className="mr-1 text-xs">{branchCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {viewMode === "date" && (
            <div className="flex items-center gap-2">
              <DatePickerIraq
                value={selectedDate}
                onChange={handleDateChange}
                className="h-9"
                data-testid="input-date-filter"
              />
              {selectedDate === getTodayDateString() && (
                <Badge variant="outline" className="text-xs text-primary border-primary">{t.patients.today}</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
              <Input 
                placeholder={t.patients.searchByNameOrCondition}
                className={`${dir === "rtl" ? "pr-10" : "pl-10"} h-10 md:h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm md:text-base`}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                data-testid="input-search-patients"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="gap-2 h-10 md:h-11 text-green-700 border-green-200 hover:bg-green-50"
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="gap-2 h-10 md:h-11 text-red-700 border-red-200 hover:bg-red-50"
                data-testid="button-export-pdf"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 md:p-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 md:h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden p-3 space-y-3">
              {paginatedPatients?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {viewMode === "date" ? `${t.patients.noVisitsOnDate} ${formatDateIraq(selectedDate)}` : t.patients.noPatientsFound}
                </div>
              ) : (
                paginatedPatients?.map((patient, index) => (
                  <Card key={patient.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 shrink-0">
                            {startIndex + index + 1}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base">{patient.name}</h3>
                        </div>
                        <CaseTypeBadges patient={patient} labels={{ amputee: t.patients.amputee, physiotherapy: t.patients.physiotherapy, medicalSupport: t.patients.medicalSupportLabel }} />
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1 mb-2">
                        {patient.isAmputee ? `${t.patients.amputeePrefix} ${patient.amputationSite}` : patient.isMedicalSupport ? patient.supportType : patient.diseaseType || '-'}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDateIraq(patient.createdAt)}
                        </span>
                        <div className="flex items-center gap-1">
                          {canAssignExpert && (patient.isAmputee || patient.isMedicalSupport) && (
                            <Button variant="ghost" size="sm" onClick={() => setAssignExpertPatient({ id: patient.id, branchId: patient.branchId, name: patient.name, isAmputee: patient.isAmputee, isMedicalSupport: patient.isMedicalSupport })} className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1 h-8 text-xs" data-testid={`assign-expert-${patient.id}`}>
                              <UserCog className="w-3.5 h-3.5" />
                              تخصيص
                            </Button>
                          )}
                          {canAssignExpert && patient.isPhysiotherapy && (
                            <Button variant="ghost" size="sm" onClick={() => setPhysioPricingPatient({ id: patient.id, name: patient.name })} className="text-teal-700 hover:text-teal-800 hover:bg-teal-50 gap-1 h-8 text-xs" data-testid={`price-physio-${patient.id}`}>
                              <Activity className="w-3.5 h-3.5" />
                              الكلفة والجلسات
                            </Button>
                          )}
                          <Link href={`/patients/${patient.id}${selectedBranch !== "all" ? `?branch=${selectedBranch}` : ""}`}>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 gap-1 h-8 text-xs">
                              <Eye className="w-3.5 h-3.5" />
                              {t.patients.viewFile}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-center font-bold text-slate-700 py-4 w-12 first:pr-4">#</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t.patients.name}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t.patientDetails.age}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t.patients.branch}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t.patientDetails.condition}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t.patients.diseaseType}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t.patientForm.patientClassification}</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">{t.patients.registrationDate}</TableHead>
                    <TableHead className="text-left font-bold text-slate-700 last:pl-6">{t.patients.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPatients?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        {viewMode === "date" ? `${t.patients.noVisitsOnDate} ${formatDateIraq(selectedDate)}` : t.patients.noPatientsFound}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPatients?.map((patient, index) => (
                      <TableRow key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-mono text-sm text-slate-500 pr-4 py-4">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 py-4">
                          {patient.name}
                        </TableCell>
                        <TableCell className="text-slate-600">{patient.age}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Building2 className="w-3 h-3" />
                            <span className="text-sm">{(() => { const name = getBranchName(patient.branchId); return t.branches[name as keyof typeof t.branches] || name; })()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <CaseTypeBadges patient={patient} labels={{ amputee: t.patients.amputee, physiotherapy: t.patients.physiotherapy, medicalSupport: t.patients.medicalSupportLabel }} />
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {patient.isAmputee ? `${t.patients.amputeePrefix} ${patient.amputationSite}` : patient.isMedicalSupport ? patient.supportType : patient.diseaseType || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {patient.patientClassification === "new" ? t.patientForm.newPatient : patient.patientClassification === "past" ? t.patientForm.pastPatient : "-"}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">
                          <div>{formatDateIraq(patient.createdAt)}</div>
                          <div className="text-xs text-slate-400">{formatTimeIraq(patient.createdAt)}</div>
                        </TableCell>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-1 justify-end">
                            {canAssignExpert && (patient.isAmputee || patient.isMedicalSupport) && (
                              <Button variant="ghost" size="sm" onClick={() => setAssignExpertPatient({ id: patient.id, branchId: patient.branchId, name: patient.name, isAmputee: patient.isAmputee, isMedicalSupport: patient.isMedicalSupport })} className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1.5" data-testid={`assign-expert-${patient.id}`}>
                                <UserCog className="w-4 h-4" />
                                تخصيص وإسناد خبير
                              </Button>
                            )}
                            {canAssignExpert && patient.isPhysiotherapy && (
                              <Button variant="ghost" size="sm" onClick={() => setPhysioPricingPatient({ id: patient.id, name: patient.name })} className="text-teal-700 hover:text-teal-800 hover:bg-teal-50 gap-1.5" data-testid={`price-physio-${patient.id}`}>
                                <Activity className="w-4 h-4" />
                                الكلفة والجلسات
                              </Button>
                            )}
                            <Link href={`/patients/${patient.id}${selectedBranch !== "all" ? `?branch=${selectedBranch}` : ""}`}>
                              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 gap-2">
                                <Eye className="w-4 h-4" />
                                {t.patients.viewFile}
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Pagination Controls */}
        <div className="p-3 md:p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600">
            <span>{t.patients.show}</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-16 md:w-20 h-8 md:h-9 text-xs md:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>{t.patients.ofTotalRecords} {totalPatients} {t.patients.record}</span>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
              className="gap-1 h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline">{t.patients.previous}</span>
            </Button>
            <span className="text-xs md:text-sm text-slate-600 px-1 md:px-2">
              {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage >= totalPages}
              className="gap-1 h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
            >
              <span className="hidden sm:inline">{t.patients.next}</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AssignExpertDialog
        patient={assignExpertPatient}
        open={!!assignExpertPatient}
        onOpenChange={(o) => { if (!o) setAssignExpertPatient(null); }}
      />

      <PhysioPricingDialog
        patient={physioPricingPatient}
        open={!!physioPricingPatient}
        onOpenChange={(o) => { if (!o) setPhysioPricingPatient(null); }}
      />
    </div>
  );
}
