import { usePatient, useUploadDocument } from "@/hooks/use-patients";
import { useParams, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  FileText, 
  Banknote, 
  Activity, 
  User, 
  Upload, 
  Download,
  Calendar,
  FileDown,
  ClipboardList
} from "lucide-react";
import { PaymentModal } from "@/components/PaymentModal";
import { VisitModal } from "@/components/VisitModal";
import { useRef } from "react";

export default function PatientDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: patient, isLoading } = usePatient(Number(id));
  const { mutate: uploadFile, isPending: isUploading } = useUploadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full rounded-3xl" /></div>;
  if (!patient) return <div className="p-8 text-center text-muted-foreground">المريض غير موجود</div>;

  // Calculate totals
  const totalPaid = patient.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remaining = (patient.totalCost || 0) - totalPaid;
  const progress = patient.totalCost ? Math.min((totalPaid / patient.totalCost) * 100, 100) : 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const formData = new FormData();
      formData.append("file", e.target.files[0]);
      // You might want to add documentType select in a proper dialog, 
      // but for simplicity we default to 'report' or infer from backend logic
      formData.append("documentType", "report"); 
      
      uploadFile({ patientId: patient.id, formData });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8 page-transition pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-6 items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/patients")} className="h-10 w-10 p-0 rounded-full border">
            <ArrowRight className="w-5 h-5 text-slate-500" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">{patient.name}</h1>
            <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-4 h-4" /> العمر: {patient.age}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full self-center"></span>
              <span>تاريخ الملف: {new Date(patient.createdAt || "").toLocaleDateString('ar-SA')}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Badge variant={patient.isAmputee ? "default" : "secondary"} className="text-base px-4 py-1.5 h-auto">
            {patient.isAmputee ? "بتر" : "علاج طبيعي"}
          </Badge>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => window.print()}
            data-testid="button-export-pdf"
          >
            <FileDown className="w-4 h-4" />
            تصدير PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Info & Stats */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6 rounded-2xl shadow-sm border-border/60 space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
              <Activity className="w-5 h-5" />
              البيانات الطبية
            </h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed">
                <div>
                  <p className="text-muted-foreground mb-1">الوزن</p>
                  <p className="font-semibold text-lg">{patient.weight || "--"} كجم</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">الطول</p>
                  <p className="font-semibold text-lg">{patient.height || "--"} سم</p>
                </div>
              </div>
              {patient.injuryDate && (
                <div className="pb-4 border-b border-dashed">
                  <p className="text-muted-foreground mb-1">تاريخ الإصابة</p>
                  <p className="font-semibold text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {new Date(patient.injuryDate).toLocaleDateString('ar-IQ')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">التشخيص / الحالة</p>
                <p className="font-semibold text-base">
                  {patient.isAmputee ? patient.amputationSite : patient.diseaseType}
                </p>
              </div>
              {patient.isAmputee && patient.prostheticType && (
                <div>
                  <p className="text-muted-foreground mb-1">نوع الطرف الصناعي</p>
                  <p className="font-semibold text-base">{patient.prostheticType}</p>
                </div>
              )}
              {patient.isPhysiotherapy && patient.treatmentType && (
                <div>
                  <p className="text-muted-foreground mb-1">نوع العلاج</p>
                  <p className="font-semibold text-base">{patient.treatmentType}</p>
                </div>
              )}
              {patient.generalNotes && (
                <div className="pt-4 border-t border-dashed">
                  <p className="text-muted-foreground mb-1">ملاحظات عامة</p>
                  <p className="text-slate-700">{patient.generalNotes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border-border/60 bg-slate-50/50">
            <h3 className="font-bold text-lg flex items-center gap-2 text-emerald-600 mb-6">
              <Banknote className="w-5 h-5" />
              الملخص المالي
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground">التكلفة الكلية</span>
                <span className="font-bold text-xl">{patient.totalCost?.toLocaleString('ar-IQ')} د.ع</span>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${progress}%` }} 
                />
              </div>

              <div className="flex justify-between text-sm pt-2">
                <div>
                  <p className="text-muted-foreground">المدفوع</p>
                  <p className="font-bold text-emerald-600">{totalPaid.toLocaleString('ar-IQ')} د.ع</p>
                </div>
                <div className="text-left">
                  <p className="text-muted-foreground">المتبقي</p>
                  <p className="font-bold text-red-500">{remaining.toLocaleString('ar-IQ')} د.ع</p>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed">
                <PaymentModal patientId={patient.id} branchId={patient.branchId} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Tabs (Payments, Documents) */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="visits" className="w-full">
            <TabsList className="w-full justify-start h-12 bg-white border border-border/60 p-1 rounded-xl mb-6 shadow-sm flex-wrap gap-1">
              <TabsTrigger value="visits" className="flex-1 max-w-[130px] data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all">
                سجل الزيارات
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 max-w-[130px] data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
                سجل المدفوعات
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex-1 max-w-[130px] data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
                المستندات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visits" className="space-y-4">
              <div className="flex justify-end mb-4">
                <VisitModal patientId={patient.id} branchId={patient.branchId} />
              </div>
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right p-4 font-semibold text-slate-600">التاريخ</th>
                      <th className="text-right p-4 font-semibold text-slate-600">التفاصيل</th>
                      <th className="text-right p-4 font-semibold text-slate-600">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {patient.visits?.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        لا يوجد زيارات مسجلة
                      </td></tr>
                    ) : (
                      patient.visits?.map((visit) => (
                        <tr key={visit.id} className="hover:bg-slate-50/50">
                          <td className="p-4 text-slate-500">{new Date(visit.visitDate || "").toLocaleDateString('ar-IQ')}</td>
                          <td className="p-4 text-slate-700">{visit.details || "-"}</td>
                          <td className="p-4 text-slate-600">{visit.notes || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right p-4 font-semibold text-slate-600">المبلغ</th>
                      <th className="text-right p-4 font-semibold text-slate-600">التاريخ</th>
                      <th className="text-right p-4 font-semibold text-slate-600">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {patient.payments?.length === 0 ? (
                      <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">لا يوجد دفعات مسجلة</td></tr>
                    ) : (
                      patient.payments?.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-emerald-600">{payment.amount.toLocaleString('ar-IQ')} د.ع</td>
                          <td className="p-4 text-slate-500">{new Date(payment.date || "").toLocaleDateString('ar-IQ')}</td>
                          <td className="p-4 text-slate-600">{payment.notes || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                  <h4 className="font-bold text-blue-900">رفع مستند جديد</h4>
                  <p className="text-sm text-blue-700">تقارير طبية، أشعة، هوية، تعهدات</p>
                </div>
                <Button variant="outline" className="border-blue-200 hover:bg-white text-blue-700 gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Upload className="w-4 h-4" />
                  {isUploading ? "جاري الرفع..." : "اختر ملف"}
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {patient.documents?.length === 0 ? (
                  <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">لا يوجد مستندات مرفقة</p>
                  </div>
                ) : (
                  patient.documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-md transition-all bg-white group">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold truncate text-slate-800">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(doc.uploadedAt || "").toLocaleDateString('ar-SA')}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-primary">
                        <Download className="w-5 h-5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
