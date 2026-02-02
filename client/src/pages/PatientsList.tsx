import { usePatients } from "@/hooks/use-patients";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, Search, Eye, Building2, ChevronRight, ChevronLeft, CalendarDays, Users, Calendar } from "lucide-react";
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

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function PatientsList() {
  const { data: patients, isLoading } = usePatients();
  const branchSession = useBranchSession();
  const permissions = usePermissions();
  const isAdmin = branchSession?.isAdmin || false;
  const userBranchId = branchSession?.branchId;
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"date" | "all">("date");
  
  // Get branch from URL query parameter for admin users
  const urlParams = new URLSearchParams(searchString);
  const branchFromUrl = urlParams.get("branch");
  
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    // Non-admin users default to their branch
    if (!isAdmin && userBranchId) return String(userBranchId);
    // Admin users: check URL first, then default to "all"
    if (branchFromUrl) return branchFromUrl;
    return "all";
  });
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  
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

  const branchFilteredPatients = useMemo(() => {
    if (!patients) return [];
    if (selectedBranch === "all") return patients;
    return patients.filter(p => p.branchId === Number(selectedBranch));
  }, [patients, selectedBranch]);

  // Helper function to check if patient was registered on the selected date
  const isRegisteredOnDate = (patient: any, filterDate: Date): boolean => {
    if (!patient.registrationDate) return false;
    return isSameDay(new Date(patient.registrationDate), filterDate);
  };

  // Helper function to check if patient has visits on the selected date
  const hasVisitOnDate = (patient: any, filterDate: Date): boolean => {
    const visits = patient.visits as { visitDate: string | null }[] | undefined;
    if (!visits || visits.length === 0) return false;
    return visits.some(v => v.visitDate && isSameDay(new Date(v.visitDate), filterDate));
  };

  const dateFilteredPatients = useMemo(() => {
    const filterDate = new Date(selectedDate);
    return branchFilteredPatients.filter(p => {
      // Include patients registered on this date OR having visits on this date
      return isRegisteredOnDate(p, filterDate) || hasVisitOnDate(p, filterDate);
    });
  }, [branchFilteredPatients, selectedDate]);

  const basePatients = viewMode === "date" ? dateFilteredPatients : branchFilteredPatients;
  
  const filteredPatients = basePatients?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.medicalCondition.includes(searchTerm)
  );

  const totalPatients = filteredPatients?.length || 0;
  const totalPages = Math.ceil(totalPatients / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPatients = filteredPatients?.slice(startIndex, startIndex + pageSize);

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

  return (
    <div className="space-y-4 md:space-y-6 page-transition">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center md:gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-800">سجل المرضى</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">عرض وإدارة ملفات جميع المرضى</p>
        </div>
        {permissions.canAddPatients && (
          <Link href="/patients/new">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 h-10 md:h-12 px-4 md:px-6 rounded-xl w-full md:w-auto">
              <Plus className="w-5 h-5" />
              إضافة مريض جديد
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
            <span>{isAdmin ? "اختر الفرع:" : "الفرع:"}</span>
          </div>
          {isAdmin ? (
            <Select value={selectedBranch} onValueChange={handleBranchChange}>
              <SelectTrigger className="w-full sm:w-[200px] h-10" data-testid="select-branch-filter">
                <SelectValue placeholder="جميع الفروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفروع</SelectItem>
                {branches?.map(branch => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className="text-sm px-3 py-1.5 bg-primary/5 border-primary/20">
              {branchSession?.branchName || getBranchName(userBranchId || 0)}
            </Badge>
          )}
          {selectedBranch !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {branchFilteredPatients.length} مريض في هذا الفرع
            </Badge>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-slate-100">
          <Tabs value={viewMode} onValueChange={handleViewModeChange} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-2 w-full sm:w-auto">
              <TabsTrigger value="date" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white" data-testid="tab-date-patients">
                <Calendar className="w-4 h-4" />
                <span>مرضى التاريخ</span>
                <Badge variant="secondary" className="mr-1 text-xs">{dateFilteredPatients.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white" data-testid="tab-all-patients">
                <Users className="w-4 h-4" />
                <span>جميع المرضى</span>
                <Badge variant="secondary" className="mr-1 text-xs">{branchFilteredPatients.length}</Badge>
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
                <Badge variant="outline" className="text-xs text-primary border-primary">اليوم</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم المريض أو الحالة..." 
              className="pr-10 h-10 md:h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm md:text-base"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="input-search-patients"
            />
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
                  {viewMode === "date" ? `لا يوجد مرضى لديهم زيارات في ${formatDateIraq(selectedDate)}` : "لا يوجد مرضى"}
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
                        <Badge variant={patient.isAmputee ? "default" : patient.isMedicalSupport ? "outline" : "secondary"} className="font-normal text-xs shrink-0">
                          {patient.isAmputee ? "بتر" : patient.isMedicalSupport ? "مساند طبية" : "علاج طبيعي"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1 mb-2">
                        {patient.isAmputee ? `بتر: ${patient.amputationSite}` : patient.isMedicalSupport ? patient.supportType : patient.diseaseType || '-'}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDateIraq(patient.createdAt)}
                        </span>
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 gap-1 h-8 text-xs">
                            <Eye className="w-3.5 h-3.5" />
                            عرض الملف
                          </Button>
                        </Link>
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
                    <TableHead className="text-right font-bold text-slate-700">الاسم</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">العمر</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">الفرع</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">الحالة الطبية</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">نوع المرض</TableHead>
                    <TableHead className="text-right font-bold text-slate-700">تاريخ التسجيل</TableHead>
                    <TableHead className="text-left font-bold text-slate-700 last:pl-6">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPatients?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {viewMode === "date" ? `لا يوجد مرضى مسجلين أو لديهم زيارات في ${formatDateIraq(selectedDate)}` : "لا يوجد مرضى"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPatients?.map((patient, index) => (
                      <TableRow key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="text-center font-mono text-sm text-slate-500 pr-4 py-4">
                          {startIndex + index + 1}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 py-4">
                          <div className="flex flex-col gap-1">
                            <span>{patient.name}</span>
                            {viewMode === "date" && (
                              <div className="flex flex-wrap gap-1">
                                {isRegisteredOnDate(patient, new Date(selectedDate)) && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <Calendar className="w-3 h-3 ml-1" />
                                    مسجل
                                  </Badge>
                                )}
                                {hasVisitOnDate(patient, new Date(selectedDate)) && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <CalendarDays className="w-3 h-3 ml-1" />
                                    زيارة
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{patient.age}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-slate-600">
                            <Building2 className="w-3 h-3" />
                            <span className="text-sm">{getBranchName(patient.branchId)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={patient.isAmputee ? "default" : patient.isMedicalSupport ? "outline" : "secondary"} className="font-normal">
                            {patient.isAmputee ? "بتر" : patient.isMedicalSupport ? "مساند طبية" : "علاج طبيعي"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {patient.isAmputee ? `بتر: ${patient.amputationSite}` : patient.isMedicalSupport ? patient.supportType : patient.diseaseType || '-'}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm">
                          <div>{patient.registrationDate ? formatDateIraq(patient.registrationDate) : formatDateIraq(patient.createdAt)}</div>
                        </TableCell>
                        <TableCell className="pl-6">
                          <Link href={`/patients/${patient.id}`}>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 gap-2">
                              <Eye className="w-4 h-4" />
                              عرض الملف
                            </Button>
                          </Link>
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
            <span>عرض</span>
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
            <span>من أصل {totalPatients} سجل</span>
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
              <span className="hidden sm:inline">السابق</span>
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
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
