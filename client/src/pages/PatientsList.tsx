import { usePatients } from "@/hooks/use-patients";
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
import { Plus, Search, Eye, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function PatientsList() {
  const { data: patients, isLoading } = usePatients();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatients = patients?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.medicalCondition.includes(searchTerm)
  );

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
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <TableHead className="text-right font-bold text-slate-700">الحالة الطبية</TableHead>
                <TableHead className="text-right font-bold text-slate-700">نوع المرض</TableHead>
                <TableHead className="text-right font-bold text-slate-700">تاريخ التسجيل</TableHead>
                <TableHead className="text-left font-bold text-slate-700 last:pl-6">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    لا يوجد نتائج مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients?.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-900 pr-6 py-4">
                      {patient.name}
                    </TableCell>
                    <TableCell className="text-slate-600">{patient.age}</TableCell>
                    <TableCell>
                      <Badge variant={patient.isAmputee ? "default" : "secondary"} className="font-normal">
                        {patient.medicalCondition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {patient.isAmputee ? `بتر: ${patient.amputationSite}` : patient.diseaseType || '-'}
                    </TableCell>
                    <TableCell className="text-slate-500 font-mono text-sm">
                      {new Date(patient.createdAt || "").toLocaleDateString('ar-SA')}
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
      </div>
    </div>
  );
}
