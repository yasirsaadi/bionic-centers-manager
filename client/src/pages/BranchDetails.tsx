import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowRight, UserPlus, Users, Banknote, CalendarDays, Search, Eye, ChevronRight, ChevronLeft, Calendar } from "lucide-react";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { AdminGate } from "@/components/AdminGate";
import { useState, useMemo } from "react";
import type { Branch, Patient, Visit } from "@shared/schema";
import { formatDateIraq, getTodayIraq } from "@/lib/utils";

type PatientWithVisits = Patient & { visits?: Visit[] };

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getTodayDateString(): string {
  return getTodayIraq();
}

export default function BranchDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const branchId = Number(id);
  const [viewMode, setViewMode] = useState<"date" | "all">("date");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });

  const { data: allPatients, isLoading } = useQuery<PatientWithVisits[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
  });

  const branch = branches?.find(b => b.id === branchId);
  const branchPatients = allPatients?.filter(p => p.branchId === branchId) || [];

  const dateFilteredPatients = useMemo(() => {
    const filterDate = new Date(selectedDate);
    return branchPatients.filter(p => {
      // Check if patient was registered on this date
      if (p.createdAt && isSameDay(new Date(p.createdAt), filterDate)) {
        return true;
      }
      // Check if patient has a visit on this date
      if (p.visits && p.visits.length > 0) {
        return p.visits.some(v => v.visitDate && isSameDay(new Date(v.visitDate), filterDate));
      }
      return false;
    });
  }, [branchPatients, selectedDate]);

  const basePatients = viewMode === "date" ? dateFilteredPatients : branchPatients;
  
  // When searching, search ALL patients (ignore filters)
  const searchResults = searchTerm.trim() 
    ? (allPatients || []).filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.medicalCondition.includes(searchTerm) ||
        (p.phone && p.phone.includes(searchTerm))
      )
    : basePatients;

  const totalPatients = searchResults.length;
  const totalPages = Math.ceil(totalPatients / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPatients = searchResults.slice(startIndex, startIndex + pageSize);

  const handleViewModeChange = (value: string) => {
    setViewMode(value as "date" | "all");
    setCurrentPage(1);
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalCost = branchPatients.reduce((acc, p) => acc + (p.totalCost || 0), 0);
  const amputeeCount = branchPatients.filter(p => p.isAmputee).length;
  const physioCount = branchPatients.filter(p => p.isPhysiotherapy).length;

  return (
    <AdminGate>
    <div className="space-y-4 md:space-y-6 page-transition py-2 md:py-6">
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <Button variant="ghost" onClick={() => setLocation("/branches")} className="p-2 shrink-0">
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </Button>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-display font-bold text-slate-800">
              فرع {branch?.name || "..."}
            </h2>
            <p className="text-xs md:text-base text-muted-foreground">إدارة مرضى الفرع</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-3 md:p-4 rounded-lg md:rounded-xl">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg md:text-2xl font-bold text-slate-800">{branchPatients.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground truncate">إجمالي المرضى</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-3 md:p-4 rounded-lg md:rounded-xl">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg md:text-2xl font-bold text-slate-800">{amputeeCount}</p>
              <p className="text-xs md:text-sm text-muted-foreground truncate">حالات بتر</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 rounded-lg md:rounded-xl">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg md:text-2xl font-bold text-slate-800">{physioCount}</p>
              <p className="text-xs md:text-sm text-muted-foreground truncate">علاج طبيعي</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4 rounded-lg md:rounded-xl">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg md:text-2xl font-bold text-slate-800 truncate">{totalCost.toLocaleString()}</p>
              <p className="text-xs md:text-sm text-muted-foreground truncate">التكاليف (د.ع)</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-base md:text-lg font-bold text-slate-800">مرضى الفرع</h3>
        <Button onClick={() => setLocation(`/patients/new?branch=${branchId}`)} className="gap-2 w-full sm:w-auto text-sm md:text-base h-9 md:h-10">
          <UserPlus className="w-4 h-4" />
          إضافة مريض للفرع
        </Button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-border shadow-sm">
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
              <Badge variant="secondary" className="mr-1 text-xs">{branchPatients.length}</Badge>
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

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم المريض أو الحالة..." 
              className="pr-10 h-10 md:h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm md:text-base"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="input-search-branch-patients"
            />
          </div>
        </div>

        {paginatedPatients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">
              {viewMode === "date" ? `لا يوجد مرضى مسجلين أو لديهم زيارات في ${formatDateIraq(selectedDate)}` : "لا يوجد مرضى في هذا الفرع"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {viewMode === "date" ? "جرب عرض جميع المرضى أو أضف زيارة جديدة" : "ابدأ بإضافة مريض جديد"}
            </p>
            {viewMode === "all" && (
              <Button onClick={() => setLocation(`/patients/new?branch=${branchId}`)}>
                <UserPlus className="w-4 h-4 ml-2" />
                إضافة مريض
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden p-3 space-y-3">
              {paginatedPatients.map((patient, index) => (
                <Card key={patient.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 shrink-0">
                          {startIndex + index + 1}
                        </span>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{patient.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {patient.age} سنة
                          </p>
                        </div>
                      </div>
                      <Badge variant={patient.isAmputee ? "default" : patient.isMedicalSupport ? "outline" : "secondary"} className="font-normal text-xs shrink-0">
                        {patient.isAmputee ? "بتر" : patient.isMedicalSupport ? "مساند طبية" : "علاج طبيعي"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-400 font-mono">
                        {(patient.totalCost || 0).toLocaleString()} د.ع
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
              ))}
            </div>

            {/* Desktop List View */}
            <div className="hidden md:block">
              <div className="divide-y">
                {paginatedPatients.map((patient, index) => (
                  <Link key={patient.id} href={`/patients/${patient.id}`}>
                    <div className="p-4 hover:bg-slate-50/80 cursor-pointer transition-all" data-testid={`card-patient-${patient.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-mono text-slate-400 bg-slate-100 rounded px-2 py-1 shrink-0 min-w-[40px] text-center">
                            {startIndex + index + 1}
                          </span>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{patient.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {patient.age} سنة - {patient.isAmputee ? "بتر" : patient.isMedicalSupport ? "مساند طبية" : "علاج طبيعي"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDateIraq(patient.createdAt)}</span>
                          </div>
                          <Badge variant={patient.isAmputee ? "default" : patient.isMedicalSupport ? "outline" : "secondary"}>
                            {patient.isAmputee ? "بتر" : patient.isMedicalSupport ? "مساند طبية" : "علاج طبيعي"}
                          </Badge>
                          <span className="text-sm font-mono text-muted-foreground">
                            {(patient.totalCost || 0).toLocaleString()} د.ع
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {totalPatients > 0 && (
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
        )}
      </div>
    </div>
    </AdminGate>
  );
}
