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

  // Pagination
  const totalPatients = filteredPatients?.length || 0;
  const totalPages = Math.ceil(totalPatients / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPatients = filteredPatients?.slice(startIndex, startIndex + pageSize);

  // Reset to page 1 when search or page size changes
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 page-transition">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-800">سجل المرضى</h2>
          <p className="text-muted-foreground mt-1">عرض وإدارة ملفات جميع المرضى</p>
        </div>
        <Link href="/patients/new">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 h-12 px-6 rounded-xl">
            <Plus className="w-5 h-5" />
            إضافة مريض جديد
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="بحث باسم المريض أو الحالة..." 
              className="pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 h-11 border-slate-200 text-slate-600">
            <Filter className="w-4 h-4" />
            تصفية
          </Button>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (
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
                      <Badge variant={patient.isAmputee ? "default" : "secondary"} className="font-normal">
                        {patient.medicalCondition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {patient.isAmputee ? `بتر: ${patient.amputationSite}` : patient.diseaseType || '-'}
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
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>عرض</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20 h-9">
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </Button>
            <span className="text-sm text-slate-600 px-2">
              صفحة {currentPage} من {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="gap-1"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
