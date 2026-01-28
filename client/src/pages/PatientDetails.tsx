import { usePatient, useUploadDocument, useDeletePatient, useDeleteVisit, useDeletePayment, useDeleteDocument, useUpdateVisit } from "@/hooks/use-patients";
import { useBranchSession } from "@/components/BranchGate";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ClipboardList,
  Pencil,
  Trash2,
  Building2,
  Phone,
  MapPin,
  AlertCircle,
  ArrowLeftRight
} from "lucide-react";
import { PaymentModal } from "@/components/PaymentModal";
import { VisitModal } from "@/components/VisitModal";
import { EditVisitModal } from "@/components/EditVisitModal";
import { NewServiceModal } from "@/components/NewServiceModal";
import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "@shared/schema";

export default function PatientDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  const { data: patient, isLoading } = usePatient(Number(id));
  const { mutate: uploadFile, isPending: isUploading } = useUploadDocument();
  const { mutate: deleteDocument } = useDeleteDocument();
  const { mutate: deletePatient, isPending: isDeleting } = useDeletePatient();
  const { mutate: deleteVisit, isPending: isDeletingVisit } = useDeleteVisit();
  const { mutate: deletePayment, isPending: isDeletingPayment } = useDeletePayment();
  const [editingVisit, setEditingVisit] = useState<{ id: number; details: string | null; notes: string | null } | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransferBranch, setSelectedTransferBranch] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });
  
  const transferMutation = useMutation({
    mutationFn: async ({ patientId, branchId }: { patientId: number; branchId: number }) => {
      const res = await fetch(`/api/patients/${patientId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "فشل في نقل المريض");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setTransferDialogOpen(false);
      setSelectedTransferBranch("");
      toast({
        title: "تم النقل بنجاح",
        description: "تم نقل المريض مع جميع سجلاته إلى الفرع الجديد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getBranchName = (branchId: number) => {
    return branches?.find(b => b.id === branchId)?.name || "-";
  };

  const handleDelete = () => {
    deletePatient(Number(id), {
      onSuccess: () => {
        setLocation("/patients");
      },
    });
  };

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
      {/* Action Buttons - Print at top */}
      <div className="flex flex-wrap gap-3 items-center justify-end print:hidden">
        <Link href={`/patients/${patient.id}/edit`}>
          <Button variant="outline" className="gap-2" data-testid="button-edit-patient">
            <Pencil className="w-4 h-4" />
            تحرير
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50" data-testid="button-delete-patient">
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذا المريض؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف جميع بيانات المريض بما في ذلك سجل الدفعات والزيارات والمستندات. هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? "جاري الحذف..." : "نعم، احذف المريض"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Transfer Patient Button - Admin Only */}
        {isAdmin && (
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-transfer-patient">
                <ArrowLeftRight className="w-4 h-4" />
                نقل لفرع آخر
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>نقل المريض إلى فرع آخر</DialogTitle>
                <DialogDescription>
                  سيتم نقل المريض مع جميع سجلاته (الزيارات والمدفوعات والمستندات) إلى الفرع المحدد.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">اختر الفرع الجديد</label>
                <Select value={selectedTransferBranch} onValueChange={setSelectedTransferBranch}>
                  <SelectTrigger data-testid="select-transfer-branch">
                    <SelectValue placeholder="اختر الفرع" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.filter(b => b.id !== patient?.branchId).map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button 
                  onClick={() => {
                    if (patient && selectedTransferBranch) {
                      transferMutation.mutate({ 
                        patientId: patient.id, 
                        branchId: parseInt(selectedTransferBranch) 
                      });
                    }
                  }}
                  disabled={!selectedTransferBranch || transferMutation.isPending}
                  data-testid="button-confirm-transfer"
                >
                  {transferMutation.isPending ? "جاري النقل..." : "نقل المريض"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        
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

      {/* Header */}
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-start gap-3 md:gap-4">
          <Button variant="ghost" onClick={() => setLocation("/patients")} className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-full border print:hidden shrink-0">
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-display font-bold text-slate-900">{patient.name}</h1>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3 md:w-4 md:h-4" /> العمر: {patient.age}</span>
              {patient.phone && (
                <>
                  <span className="w-1 h-1 bg-slate-300 rounded-full self-center hidden md:block"></span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 md:w-4 md:h-4" /> {patient.phone}</span>
                </>
              )}
              <span className="w-1 h-1 bg-slate-300 rounded-full self-center hidden md:block"></span>
              <span className="hidden md:inline">تاريخ الملف: {new Date(patient.createdAt || "").toLocaleDateString('en-GB')} - {new Date(patient.createdAt || "").toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {patient.address && (
              <div className="flex items-center gap-1 mt-1 text-xs md:text-sm text-muted-foreground">
                <MapPin className="w-3 h-3 md:w-4 md:h-4" /> {patient.address}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center">
          <Badge variant="outline" className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 h-auto gap-1">
            <Building2 className="w-3 h-3" />
            {getBranchName(patient.branchId)}
          </Badge>
          <Badge variant={patient.isAmputee ? "default" : patient.isMedicalSupport ? "outline" : "secondary"} className="text-xs md:text-base px-2 md:px-4 py-1 md:py-1.5 h-auto">
            {patient.isAmputee ? "بتر" : patient.isMedicalSupport ? "مساند طبية" : "علاج طبيعي"}
          </Badge>
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
              {(patient.injuryDate || patient.injuryCause) && (
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed">
                  {patient.injuryDate && (
                    <div>
                      <p className="text-muted-foreground mb-1">تاريخ الإصابة</p>
                      <p className="font-semibold text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(patient.injuryDate).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  )}
                  {patient.injuryCause && (
                    <div>
                      <p className="text-muted-foreground mb-1">سبب الإصابة</p>
                      <p className="font-semibold text-base flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        {patient.injuryCause}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">التشخيص / الحالة</p>
                <p className="font-semibold text-base">
                  {patient.isAmputee ? patient.amputationSite : patient.isMedicalSupport ? patient.supportType : patient.diseaseType}
                </p>
              </div>
              {patient.isMedicalSupport && patient.injurySide && (
                <div>
                  <p className="text-muted-foreground mb-1">جهة الإصابة</p>
                  <p className="font-semibold text-base">{patient.injurySide}</p>
                </div>
              )}
              {patient.isAmputee && patient.prostheticType && (
                <div>
                  <p className="text-muted-foreground mb-1">نوع الطرف الصناعي</p>
                  <p className="font-semibold text-base">{patient.prostheticType}</p>
                </div>
              )}
              {patient.isAmputee && (patient.siliconType || patient.siliconSize || patient.suspensionSystem) && (
                <div className="grid grid-cols-3 gap-4">
                  {patient.siliconType && (
                    <div>
                      <p className="text-muted-foreground mb-1">نوع السليكون</p>
                      <p className="font-semibold text-base">{patient.siliconType}</p>
                    </div>
                  )}
                  {patient.siliconSize && (
                    <div>
                      <p className="text-muted-foreground mb-1">حجم السليكون</p>
                      <p className="font-semibold text-base">{patient.siliconSize}</p>
                    </div>
                  )}
                  {patient.suspensionSystem && (
                    <div>
                      <p className="text-muted-foreground mb-1">نظام التعليق</p>
                      <p className="font-semibold text-base">{patient.suspensionSystem}</p>
                    </div>
                  )}
                </div>
              )}
              {patient.isAmputee && patient.footType && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground mb-1">نوع القدم</p>
                    <p className="font-semibold text-base">{patient.footType}</p>
                  </div>
                  {patient.footSize && (
                    <div>
                      <p className="text-muted-foreground mb-1">حجم القدم</p>
                      <p className="font-semibold text-base">{patient.footSize}</p>
                    </div>
                  )}
                </div>
              )}
              {patient.isAmputee && patient.kneeJointType && (
                <div>
                  <p className="text-muted-foreground mb-1">نوع مفصل الركبة</p>
                  <p className="font-semibold text-base">{patient.kneeJointType}</p>
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
              <div className="flex justify-end gap-2 mb-4">
                <VisitModal patientId={patient.id} branchId={patient.branchId} />
                <NewServiceModal 
                  patientId={patient.id} 
                  branchId={patient.branchId} 
                  currentTotalCost={patient.totalCost || 0} 
                />
              </div>
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right p-4 font-semibold text-slate-600">التاريخ</th>
                      <th className="text-right p-4 font-semibold text-slate-600">التفاصيل</th>
                      <th className="text-right p-4 font-semibold text-slate-600">ملاحظات</th>
                      <th className="text-right p-4 font-semibold text-slate-600">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {patient.visits?.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        لا يوجد زيارات مسجلة
                      </td></tr>
                    ) : (
                      patient.visits?.map((visit) => (
                        <tr key={visit.id} className="hover:bg-slate-50/50">
                          <td className="p-4 text-slate-500">
                            <div>{new Date(visit.visitDate || "").toLocaleDateString('en-GB')}</div>
                            <div className="text-xs text-slate-400">
                              {(() => {
                                const d = new Date(visit.visitDate || "");
                                const hours = d.getUTCHours();
                                const minutes = d.getUTCMinutes();
                                const seconds = d.getUTCSeconds();
                                if (hours === 0 && minutes === 0 && seconds === 0) {
                                  return "وقت غير محدد";
                                }
                                return d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', hour12: true });
                              })()}
                            </div>
                          </td>
                          <td className="p-4 text-slate-700">{visit.details || "-"}</td>
                          <td className="p-4 text-slate-600">{visit.notes || "-"}</td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setEditingVisit({ id: visit.id, details: visit.details, notes: visit.notes })}
                                data-testid={`button-edit-visit-${visit.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteVisit({ visitId: visit.id, patientId: patient.id })}
                                  disabled={isDeletingVisit}
                                  data-testid={`button-delete-visit-${visit.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card>
              
              {editingVisit && (
                <EditVisitModal
                  visit={editingVisit}
                  patientId={patient.id}
                  open={!!editingVisit}
                  onOpenChange={(open) => !open && setEditingVisit(null)}
                />
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-right p-4 font-semibold text-slate-600">المبلغ</th>
                      <th className="text-right p-4 font-semibold text-slate-600">التاريخ</th>
                      <th className="text-right p-4 font-semibold text-slate-600">ملاحظات</th>
                      {isAdmin && <th className="text-right p-4 font-semibold text-slate-600">إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {patient.payments?.length === 0 ? (
                      <tr><td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-muted-foreground">لا يوجد دفعات مسجلة</td></tr>
                    ) : (
                      patient.payments?.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-emerald-600">{payment.amount.toLocaleString('ar-IQ')} د.ع</td>
                          <td className="p-4 text-slate-500">
                            <div>{new Date(payment.date || "").toLocaleDateString('en-GB')}</div>
                            <div className="text-xs text-slate-400">
                              {(() => {
                                const d = new Date(payment.date || "");
                                const hours = d.getUTCHours();
                                const minutes = d.getUTCMinutes();
                                const seconds = d.getUTCSeconds();
                                if (hours === 0 && minutes === 0 && seconds === 0) {
                                  return "وقت غير محدد";
                                }
                                return d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', hour12: true });
                              })()}
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">{payment.notes || "-"}</td>
                          {isAdmin && (
                            <td className="p-4">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deletePayment({ paymentId: payment.id, patientId: patient.id })}
                                disabled={isDeletingPayment}
                                data-testid={`button-delete-payment-${payment.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          )}
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
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 break-words" title={doc.fileName}>{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.uploadedAt || "").toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-400 hover:text-primary"
                        onClick={() => window.open(doc.fileUrl, '_blank')}
                        data-testid={`button-download-doc-${doc.id}`}
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-400 hover:text-red-500"
                        onClick={() => deleteDocument({ documentId: doc.id, patientId: patient.id })}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="w-5 h-5" />
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
