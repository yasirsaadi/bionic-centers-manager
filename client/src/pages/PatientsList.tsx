import { usePatients } from "@/hooks/use-patients";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Plus, Search, Eye, Filter, Building2, ChevronRight, ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Branch } from "@shared/schema";

export default function PatientsList() {
  const { data: patients, isLoading } = usePatients();
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

  const getBranchName = (branchId: number) => {
    return branches?.find(b => b.id === branchId)?.name || "-";
  };

  const filteredPatients = patients?.filter(p => 
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

  return (
    <div className="space-y-4 md:space-y-6 page-transition">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center md:gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-800">سجل المرضى</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">عرض وإدارة ملفات جميع المرضى</p>
        </div>
        <Link href="/patients/new">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 h-10 md:h-12 px-4 md:px-6 rounded-xl w-full md:w-auto">
            <Plus className="w-5 h-5" />
            إضافة مريض جديد
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 border-b border-border flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم المريض أو الحالة..." 
              className="pr-10 h-10 md:h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-sm md:text-base"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="input-search-patients"
            />
          </div>
          <Button variant="outline" className="gap-2 h-10 md:h-11 border-slate-200 text-slate-600 hidden sm:flex">
            <Filter className="w-4 h-4" />
            تصفية
          </Button>
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
                  لا يوجد نتائج مطابقة
                </div>
              ) : (
                paginatedPatients?.map((patient) => (
                  <Card key={patient.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{patient.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span>{patient.age} سنة</span>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>{getBranchName(patient.branchId)}</span>
                            </div>
                          </div>
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
                          {new Date(patient.createdAt || "").toLocaleDateString('en-GB')}
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
                    <TableHead className="text-right font-bold text-slate-700 py-4 first:pr-6">الاسم</TableHead>
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
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        لا يوجد نتائج مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPatients?.map((patient) => (
                      <TableRow key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-medium text-slate-900 pr-6 py-4">
                          {patient.name}
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
                          <div>{new Date(patient.createdAt || "").toLocaleDateString('en-GB')}</div>
                          <div className="text-xs text-slate-400">{new Date(patient.createdAt || "").toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
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
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
