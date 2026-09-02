import { usePatient, useUploadDocument, useDeleteVisit, useDeletePayment, useDeleteDocument, useUpdateVisit } from "@/hooks/use-patients";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { DeletePatientDialog } from "@/components/DeletePatientDialog";
import { canTrashPatients } from "@shared/patient_trash";
import { PatientWorkOrderCard } from "@/components/manufacturing/PatientWorkOrderCard";
import { CaseDetailSections } from "@/components/patient/CaseDetailSections";
import { PatientCaseChips, PatientCasePanel, type CaseRow } from "@/components/patient/PatientCasesTabs";
import { PatientDepartmentBadges } from "@/components/PatientDepartmentBadges";
import { MoneyInput } from "@/components/ui/money-input";
import { PatientCodeBadge } from "@/components/PatientCodeBadge";
import { MergePatientDialog } from "@/components/MergePatientDialog";
import { StartManufacturingDialog } from "@/components/manufacturing/StartManufacturingDialog";
import { SendToDoctorReviewDialog } from "@/components/medical/SendToDoctorReviewDialog";
import { PatientMedicalExams } from "@/components/medical/PatientMedicalExams";
import { formatDateIraq, formatDateTimeIraq, formatTimeIraq, toEnglishDigits } from "@/lib/utils";
import { invalidatePatientData } from "@/lib/queryClient";
import { resolvePurchasedSessions } from "@shared/pricing";
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
  ArrowLeftRight,
  Plus,
  X,
  HelpCircle
} from "lucide-react";
import { PaymentModal } from "@/components/PaymentModal";
import { VisitModal } from "@/components/VisitModal";
import { EditVisitModal } from "@/components/EditVisitModal";
import { PatientServiceLauncher } from "@/components/PatientServiceLauncher";
import { RECEPTION_ROUTING_QUESTION } from "@/components/reception_routing";
import { PhysioPlanDialog } from "@/components/PhysioPlanDialog";
import { Input } from "@/components/ui/input";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { useRef, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import PatientCommunicationCard from "@/components/PatientCommunicationCard";
import { PostExamDecisionCard } from "@/components/PostExamDecisionCard";
import { PendingChargesCard } from "@/components/PendingChargesCard";
import { PendingDiscountBanner } from "@/components/PendingDiscountBanner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Branch, TreatmentPlan } from "@shared/schema";

const TREATMENT_TYPE_OPTIONS = [
  { value: "استشارة طبية", label: "استشارة طبية" },
  { value: "روبوت", label: "روبوت" },
  { value: "تمارين تأهيلية", label: "تمارين تأهيلية" },
  { value: "أجهزة علاج طبيعي", label: "أجهزة علاج طبيعي" },
  { value: "أبر صينية", label: "أبر صينية" },
];

// When EDITING a payment we must be able to (re)classify it into ANY service —
// including أطراف صناعية / مساند طبية — so a payment recorded under the wrong
// service (e.g. a طرف paid but tagged as physio) can be moved to its real case.
// Picking one of these tags makes the server create/attach the matching case.
const PAYMENT_TYPE_OPTIONS = [
  ...TREATMENT_TYPE_OPTIONS,
  { value: "أطراف صناعية", label: "أطراف صناعية" },
  { value: "مساند طبية", label: "مساند طبية" },
];

const injuryTypeOptions = [
  "التهاب اوتار", "وثي", "قطع اوتار", "تشنج عضلي", "إصابة عصب محيطي", "التهاب اعصاب سكري",
  "سوفان", "انزلاق ديسك", "انزلاق فقرات", "جنف", "جلطة دماغية", "نزف دماغي",
  "التهاب سحايا", "تصلب لويحي", "باركنسون", "غيلان باريه", "ضمور عضلي", "ضمور عصبي",
  "شلل دماغ", "شلل اطفال", "تأخر نفسي حركي", "اصابة حبل شوكي", "التهاب حبل شوكي",
  "شلل العصب الوجهي", "إصابة اربطة", "قطع جزئي في العضلات", "تبديل مفصل", "كسر",
  "ورم حميد", "ورم خبيث", "استئصال اورام", "حروق", "أخرى"
];

const injuryAreaOptions = [
  "الرأس", "الرقبة", "الصدر", "القطن", "العمود الفقري", "الكتف",
  "منطقة الظهر العلوية", "منطقة الظهر السفلية", "العضد", "المرفق", "الساعد", "المعصم",
  "الرسغ", "اليد", "الاصابع", "الحوض", "الورك", "الفخذ",
  "الركبة", "الساق", "الكاحل", "القدم", "اصابع القدم",
];

interface TreatmentInjuryEntry {
  type: string;
  area: string;
  side: string;
}

export default function PatientDetails() {
  const { t, dir } = useTranslation();
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const searchString = window.location.search;
  const fromBranch = new URLSearchParams(searchString).get("branch");
  const backUrl = fromBranch ? `/patients?branch=${fromBranch}` : "/patients";
  const branchSession = useBranchSession();
  const permissions = usePermissions();
  //  ══ **مُوجِّهُ «سبب الحضور» يُفتَح من رأس الصفحة كذلك** ═══════════════
  //  الحالةُ هنا لأنّ الزرَّ في الرأس والحوارَ داخل الموزِّع أسفلَ الصفحة —
  //  فتُمرَّر إليه إدارةً بدل أن يُبنى حوارٌ ثانٍ بنسخةٍ ثانية من الخيارات.
  const [routingOpen, setRoutingOpen] = useState(false);
  //  والتبويبُ صار مُداراً لسببٍ واحد: الموزِّعُ (وحوارُه) يعيش داخل تبويب
  //  «الزيارات»، وتبويبُ Radix غيرُ النشط **يُفكَّك**. فزرُّ الرأس يعيد
  //  التبويبَ إلى مكانه ثمّ يفتح الحوار — وإلّا ضُغط الزرُّ من «المدفوعات»
  //  فلا يظهر شيء. ولا حوارَ ثانٍ يُبنى لأجل ذلك.
  const [tab, setTab] = useState("visits");
  const isAdmin = branchSession?.isAdmin || false;
  // Branch managers should be able to perform "admin-style" actions
  // within their own branch (delete visit, edit visit, etc.). The
  // server already enforces branch isolation; the UI just needs to
  // expose the buttons.
  const isAdminOrManager = isAdmin || branchSession?.role === "branch_manager";
  const { data: patient, isLoading } = usePatient(Number(id));
  const { mutate: uploadFile, isPending: isUploading } = useUploadDocument();
  const { mutate: deleteDocument } = useDeleteDocument();
  const { mutate: deleteVisit, isPending: isDeletingVisit } = useDeleteVisit();
  const { mutate: deletePayment, isPending: isDeletingPayment } = useDeletePayment();
  const [editingPlan, setEditingPlan] = useState(false);
  const [editingVisit, setEditingVisit] = useState<{ id: number; details: string | null; notes: string | null; treatmentType: string | null; sessionCount: number | null; cost: number | null; visitDate: string | null } | null>(null);
  const [editingPaymentSession, setEditingPaymentSession] = useState<{id: number, sessionCount: number | null, paymentTreatmentType: string | null} | null>(null);
  const [editSessionCount, setEditSessionCount] = useState<string>("");
  const [editTreatmentType, setEditTreatmentType] = useState<string>("");
  const [editingPayment, setEditingPayment] = useState<{id: number, amount: number, notes: string | null, sessionCount: number | null, paymentTreatmentType: string | null, date: string | null, isFreeSessions?: boolean | null} | null>(null);
  const [editPaymentDate, setEditPaymentDate] = useState<string>("");
  const [editPaymentAmount, setEditPaymentAmount] = useState<string>("");
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>("");
  const [editPaymentSessionCount, setEditPaymentSessionCount] = useState<string>("");
  const [editPaymentTreatmentType, setEditPaymentTreatmentType] = useState<string>("");
  const [editPaymentFreeSessions, setEditPaymentFreeSessions] = useState(false);
  // سببُ تصحيحٍ ماليّ — يُطلَب فقط حين يمسّ الحفظُ حقلاً محمياً فعلاً
  // (تحكّمُ تصحيح الدفعات، القسم ب، 2026-08-29).
  const [editPaymentReason, setEditPaymentReason] = useState<string>("");
  // تأكيدُ حذف دفعة — بسببٍ إلزاميّ دائماً، محميٌّ كان الحذفُ أم مباشراً.
  const [deletingPayment, setDeletingPayment] = useState<{ id: number } | null>(null);
  const [deletePaymentReason, setDeletePaymentReason] = useState<string>("");

  // Independent cases (Phase 2, relocated): chips in the header + a full panel
  // per case. Each case is its own view (details / cost / visits / payments).
  // Key it UNDER the patient-detail key (["/api/patients/:id", id, "cases"]) so
  // it shares a prefix with the main patient query. EVERY payment/visit mutation
  // already invalidates ["/api/patients/:id", id] (the detail page depends on it),
  // so those invalidations now ALSO refresh these per-case paid/remaining/cost
  // cards — they can never again disagree with the payment list below. Otherwise a
  // payment re-tag moved money on the server but the cards stayed stale ("الجمع لا يتغير").
  const { data: patientCasesList = [] } = useQuery<CaseRow[]>({
    queryKey: ["/api/patients/:id", Number(id), "cases"],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${id}/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  // selectedCaseId: a case id, or null = «الكل» (all rows, no case filter).
  // "ALL" sentinel distinguishes the user explicitly picking الكل from the
  // initial not-yet-selected state (which auto-selects the first case).
  const ALL_CASES = -1;
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  useEffect(() => {
    if (patientCasesList.length > 0 && (selectedCaseId == null || (selectedCaseId !== ALL_CASES && !patientCasesList.some((c) => c.id === selectedCaseId)))) {
      setSelectedCaseId(patientCasesList[0].id);
    }
  }, [patientCasesList, selectedCaseId]);
  const selectedCase = selectedCaseId === ALL_CASES ? null : (patientCasesList.find((c) => c.id === selectedCaseId) || null);
  const CASE_SHORT_LABELS: Record<string, string> = { physiotherapy: "علاج", prosthetic: "أطراف", medical_support: "مساند" };
  // Human corrector for mis-attributed visits: moves a visit to another of the
  // SAME patient's cases (server re-validates ownership + audits).
  const moveVisitCase = useMutation({
    mutationFn: async ({ visitId, caseId }: { visitId: number; caseId: number }) => {
      const res = await fetch(`/api/visits/${visitId}/case`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ caseId }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "تعذّر النقل"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/:id", Number(id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "نُقلت الزيارة إلى الحالة الصحيحة" });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedTransferBranch, setSelectedTransferBranch] = useState<string>("");
  const [editCreatedAtOpen, setEditCreatedAtOpen] = useState(false);
  const [newCreatedAtDate, setNewCreatedAtDate] = useState<string>("");
  const [newCreatedAtTime, setNewCreatedAtTime] = useState<string>("");
  const [showTreatmentPlanDialog, setShowTreatmentPlanDialog] = useState(false);
  const [editingTreatmentPlan, setEditingTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [deletingTreatmentPlanId, setDeletingTreatmentPlanId] = useState<number | null>(null);
  const [tpInjuryEntries, setTpInjuryEntries] = useState<TreatmentInjuryEntry[]>([{ type: "", area: "", side: "" }]);
  const [treatmentPlanForm, setTreatmentPlanForm] = useState({
    diagnosis: "",
    injuryType: "",
    injuryLocation: "",
    diseaseHistory: "",
    mmtAssessment: "",
    spasticity: "",
    sensation: "",
    painLevel: "",
    adl: "",
    sessionCount: "",
    sessionFrequency: "",
    deviceType: "",
    goalType: "",
    notes: "",
  });
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
        throw new Error(error.message || t.patientDetails.failedToTransfer);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setTransferDialogOpen(false);
      setSelectedTransferBranch("");
      toast({
        title: t.patientDetails.transferSuccess,
        description: t.patientDetails.transferSuccessDesc,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.patientDetails.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateCreatedAtMutation = useMutation({
    mutationFn: async ({ patientId, createdAt }: { patientId: number; createdAt: string }) => {
      const res = await fetch(`/api/patients/${patientId}/created-at`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdAt }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "فشل في تعديل التاريخ");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setEditCreatedAtOpen(false);
      toast({
        title: t.patientDetails.changeFileDateSuccess,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t.patientDetails.error,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: treatmentPlans = [], isLoading: isLoadingTreatmentPlans } = useQuery<TreatmentPlan[]>({
    queryKey: ["/api/patients", Number(id), "treatment-plans"],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${id}/treatment-plans`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch treatment plans");
      return res.json();
    },
    enabled: !!patient?.isPhysiotherapy,
  });

  const createTreatmentPlanMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await fetch(`/api/patients/${id}/treatment-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t.patientDetails.failedToCreate);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id), "treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id)] });
      setShowTreatmentPlanDialog(false);
      resetTreatmentPlanForm();
      toast({ title: t.patientDetails.savedSuccess, description: t.patientDetails.planCreated });
    },
    onError: (error: Error) => {
      toast({ title: t.patientDetails.error, description: error.message, variant: "destructive" });
    },
  });

  const updateTreatmentPlanMutation = useMutation({
    mutationFn: async ({ planId, data }: { planId: number; data: Record<string, any> }) => {
      const res = await fetch(`/api/treatment-plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t.patientDetails.failedToUpdate);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id), "treatment-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id)] });
      setShowTreatmentPlanDialog(false);
      setEditingTreatmentPlan(null);
      resetTreatmentPlanForm();
      toast({ title: t.patientDetails.updated, description: t.patientDetails.planUpdated });
    },
    onError: (error: Error) => {
      toast({ title: t.patientDetails.error, description: error.message, variant: "destructive" });
    },
  });

  const deleteTreatmentPlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const res = await fetch(`/api/treatment-plans/${planId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t.patientDetails.failedToDelete);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", Number(id), "treatment-plans"] });
      setDeletingTreatmentPlanId(null);
      toast({ title: t.patientDetails.deleted, description: t.patientDetails.planDeleted });
    },
    onError: (error: Error) => {
      toast({ title: t.patientDetails.error, description: error.message, variant: "destructive" });
    },
  });

  const resetTreatmentPlanForm = () => {
    setTreatmentPlanForm({
      diagnosis: "", injuryType: "", injuryLocation: "", diseaseHistory: "",
      mmtAssessment: "", spasticity: "", sensation: "", painLevel: "",
      adl: "", sessionCount: "", sessionFrequency: "",
      deviceType: "", goalType: "", notes: "",
    });
    if (patient?.injuries) {
      try {
        const parsed = JSON.parse(patient.injuries);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTpInjuryEntries(parsed.map((e: any) => ({ type: e.type || "", area: e.area || "", side: e.side || "" })));
          return;
        }
      } catch {}
    }
    if (patient?.injuryType || patient?.injuryArea) {
      const types = patient.injuryType?.split(/، |, /).filter(Boolean) || [];
      const areas = patient.injuryArea?.split(/، |, /).filter(Boolean) || [];
      const maxLen = Math.max(types.length, areas.length, 1);
      const entries: TreatmentInjuryEntry[] = [];
      for (let i = 0; i < maxLen; i++) {
        entries.push({ type: types[i] || "", area: areas[i] || "", side: "" });
      }
      setTpInjuryEntries(entries);
      return;
    }
    setTpInjuryEntries([{ type: "", area: "", side: "" }]);
  };

  const openEditTreatmentPlan = (plan: TreatmentPlan) => {
    setEditingTreatmentPlan(plan);
    setTreatmentPlanForm({
      diagnosis: plan.diagnosis || "",
      injuryType: plan.injuryType || "",
      injuryLocation: plan.injuryLocation || "",
      diseaseHistory: plan.diseaseHistory || "",
      mmtAssessment: plan.mmtAssessment || "",
      spasticity: plan.spasticity || "",
      sensation: plan.sensation || "",
      painLevel: plan.painLevel || "",
      adl: plan.adl || "",
      sessionCount: plan.sessionCount ? String(plan.sessionCount) : "",
      sessionFrequency: plan.sessionFrequency || "",
      deviceType: plan.deviceType || "",
      goalType: plan.goalType || "",
      notes: plan.notes || "",
    });
    if (plan.injuryType) {
      try {
        const parsed = JSON.parse(plan.injuryType);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTpInjuryEntries(parsed.map((e: any) => ({ type: e.type || "", area: e.area || "", side: e.side || "" })));
          setShowTreatmentPlanDialog(true);
          return;
        }
      } catch {}
      setTpInjuryEntries([{ type: plan.injuryType, area: plan.injuryLocation || "", side: "" }]);
    } else if (patient?.injuries) {
      try {
        const parsed = JSON.parse(patient.injuries);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTpInjuryEntries(parsed.map((e: any) => ({ type: e.type || "", area: e.area || "", side: e.side || "" })));
          setShowTreatmentPlanDialog(true);
          return;
        }
      } catch {}
      setTpInjuryEntries([{ type: "", area: "", side: "" }]);
    } else {
      setTpInjuryEntries([{ type: "", area: "", side: "" }]);
    }
    setShowTreatmentPlanDialog(true);
  };

  const handleSaveTreatmentPlan = () => {
    const filteredInjuries = tpInjuryEntries.filter(e => e.type || e.area);
    const injuriesJson = JSON.stringify(filteredInjuries.length > 0 ? filteredInjuries : []);
    const data = {
      ...treatmentPlanForm,
      injuryType: injuriesJson,
      injuryLocation: filteredInjuries.map(e => e.area).filter(Boolean).join("، "),
      sessionCount: treatmentPlanForm.sessionCount ? Number(toEnglishDigits(treatmentPlanForm.sessionCount)) : null,
      painLevel: toEnglishDigits(treatmentPlanForm.painLevel),
      spasticity: toEnglishDigits(treatmentPlanForm.spasticity),
      sessionFrequency: toEnglishDigits(treatmentPlanForm.sessionFrequency),
      injuries: injuriesJson,
    };
    if (editingTreatmentPlan) {
      updateTreatmentPlanMutation.mutate({ planId: editingTreatmentPlan.id, data });
    } else {
      createTreatmentPlanMutation.mutate(data);
    }
  };

  const updatePaymentSession = useMutation({
    mutationFn: async (data: {paymentId: number, sessionCount: number | null, paymentTreatmentType: string | null}) => {
      const res = await fetch(`/api/payments/${data.paymentId}/session-info`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ sessionCount: data.sessionCount, paymentTreatmentType: data.paymentTreatmentType }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(t.patientDetails.failedToUpdateSession);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/:id", Number(id)] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setEditingPaymentSession(null);
    }
  });

  const openEditPaymentSession = (payment: { id: number, sessionCount: number | null, paymentTreatmentType: string | null }) => {
    setEditSessionCount(payment.sessionCount ? String(payment.sessionCount) : "");
    setEditTreatmentType(payment.paymentTreatmentType?.split(",")[0]?.trim() || "");
    setEditingPaymentSession(payment);
  };

  // تعديلٌ مباشرٌ للملاحظات/عدد الجلسات، ومحميٌّ لغيرهما (تحكّمُ تصحيح
  // الدفعات، القسم ب، 2026-08-29): تغييرٌ محميّ يعود ٢٠٢ («طلبٌ معلَّق») لا
  // يُطبَّق فوراً — **ولا تحديثَ تفاؤليّاً** لبيانات الدفعة في تلك الحالة.
  const updatePaymentFull = useMutation({
    mutationFn: async (data: {paymentId: number, amount: number, notes: string | null, sessionCount: number | null, paymentTreatmentType: string | null, customDate?: string, isFreeSessions?: boolean, reason?: string}) => {
      const res = await fetch(`/api/payments/${data.paymentId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          amount: data.amount, notes: data.notes, sessionCount: data.sessionCount,
          paymentTreatmentType: data.paymentTreatmentType, customDate: data.customDate,
          isFreeSessions: data.isFreeSessions, reason: data.reason,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.message || t.patientDetails.failedToUpdateSession);
      }
      return { pending: res.status === 202 };
    },
    //  ══ **٢٠٢ لا يوهم بأنّ المال تغيّر — والتطبيقُ الفوريّ يستحقّ الإبطالَ
    //  الكامل** (تحكّمُ الذاكرة، 2026-08-30) ═══════════════════════════════
    //  طلبُ التصحيح المعلَّق (٢٠٢) يبقى بلا أيّ إبطال — لم يتغيّر شيءٌ فعلاً
    //  حتى يعتمده المسؤول (كما كان). والتطبيقُ المباشر (المسؤولُ العام نفسُه)
    //  كان يُبطل مفتاحين فقط؛ `invalidatePatientData` تضيف السجلَّ وشارةَ
    //  المعاينات والمحاسبةَ — نفسُ الدالّة التي يستعملها كلُّ بابٍ ماليّ آخر.
    onSuccess: ({ pending }) => {
      setEditingPayment(null);
      if (pending) {
        toast({
          title: "أُرسل طلبُ التصحيح",
          description: "أُرسل تصحيحُ الدفعة إلى المسؤول العام للاعتماد — لم تتغيّر الدفعة بعد",
        });
        return;
      }
      invalidatePatientData(queryClient, Number(id));
      toast({ title: "تم الحفظ", description: "تم تصحيح الدفعة مباشرةً" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const openEditPayment = (payment: { id: number, amount: number, notes: string | null, sessionCount: number | null, paymentTreatmentType: string | null, date: string | null, isFreeSessions?: boolean | null }) => {
    setEditPaymentAmount(String(payment.amount));
    setEditPaymentNotes(payment.notes || "");
    setEditPaymentSessionCount(payment.sessionCount ? String(payment.sessionCount) : "");
    setEditPaymentTreatmentType(payment.paymentTreatmentType?.split(",")[0]?.trim() || "");
    setEditPaymentFreeSessions(!!payment.isFreeSessions);
    setEditPaymentReason("");
    if (payment.date) {
      const d = new Date(payment.date);
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadDate = new Date(d.getTime() + baghdadOffset);
      setEditPaymentDate(baghdadDate.toISOString().split('T')[0]);
    } else {
      setEditPaymentDate("");
    }
    setEditingPayment(payment);
  };

  // هل يمسّ الحفظُ حقلاً محمياً فعلاً؟ (تحكّمُ تصحيح الدفعات، القسم ب) —
  // مقارنةٌ مطبَّعة بلقطة `editingPayment` الأصلية، نفسُ تصنيف الخادم
  // حرفياً (المبلغ · التاريخ الماليّ · نوع العلاج المدفوع · الجلسات
  // المجانية). الملاحظاتُ وعددُ الجلسات لا يدخلان هذه المقارنة أبداً.
  const paymentEditTouchesProtected = (() => {
    if (!editingPayment) return false;
    const nextAmount = editPaymentAmount === "" ? NaN : Math.round(Number(editPaymentAmount));
    if (Number.isFinite(nextAmount) && nextAmount !== (editingPayment.amount ?? 0)) return true;
    if (Boolean(editPaymentFreeSessions) !== Boolean(editingPayment.isFreeSessions)) return true;
    const nextTag = editPaymentTreatmentType || null;
    const curTag = editingPayment.paymentTreatmentType?.split(",")[0]?.trim() || null;
    if (nextTag !== curTag) return true;
    if (editPaymentDate) {
      const origYmd = editingPayment.date
        ? (() => {
            const d = new Date(editingPayment.date as any);
            const baghdadOffset = 3 * 60 * 60 * 1000;
            return new Date(d.getTime() + baghdadOffset).toISOString().split("T")[0];
          })()
        : "";
      if (editPaymentDate !== origYmd) return true;
    }
    return false;
  })();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getBranchName = (branchId: number) => {
    const name = branches?.find(b => b.id === branchId)?.name || "-";
    return (t.branches as Record<string, string>)[name] || name;
  };

  const translateInjuryType = (type: string): string => {
    return (t.injuryTypes as Record<string, string>)[type] || type;
  };

  const translateInjuryArea = (area: string): string => {
    return (t.injuryAreas as Record<string, string>)[area] || area;
  };

  const translateInjurySide = (side: string): string => {
    return (t.injurySides as Record<string, string>)[side] || side;
  };

  const translateTreatmentType = (type: string | null | undefined): string => {
    if (!type) return "-";
    const map: Record<string, string> = {
      "استشارة طبية": t.patientDetails.treatmentTypeMedicalConsultation,
      "روبوت": t.patientDetails.treatmentTypeRobot,
      "تمارين تأهيلية": t.patientDetails.treatmentTypeRehab,
      "أجهزة علاج طبيعي": t.patientDetails.treatmentTypePhysioDevices,
      "جهاز علاج طبيعي": t.patientDetails.treatmentTypePhysioDevices,
    };
    return map[type] || type;
  };

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full rounded-3xl" /></div>;
  if (!patient) return <div className="p-8 text-center text-muted-foreground">{t.patientDetails.patientNotFound}</div>;

  // Case isolation: when a case is selected (chips), the visits/payments tabs
  // show that case's rows PLUS any rows not yet attributed to a case
  // (caseId null) — a row must never vanish from every tab just because the
  // background sync hasn't attributed it yet. «الكل» (ALL_CASES) shows all.
  const allVisits = patient.visits || [];
  const allPayments = patient.payments || [];
  //  ══ ملخّصُ جلساتٍ للمرضى القدامى — يعمل بلا `canViewPayments` (إصلاحٌ
  //  2026-09-03) ═══════════════════════════════════════════════════════════
  //  `patient.payments` تغيب عن مَن لا يملك `canViewPayments` (إصلاحٌ
  //  2026-09-02)، فيغيب معها عدّادُ جلسات العلاج الطبيعي القديم لمرضى بلا
  //  `physioPlan` مخزَّن — الدفعاتُ ذاكرتُهم الوحيدة (قسم «خطة الجلسات
  //  المشتراة» في CLAUDE.md). فيرسل الخادمُ بدلاً من الصفوف الخام
  //  `paymentSessionsSummary` — لقطةً غيرَ ماليّة (نوعٌ وعددٌ فقط، بلا مبلغٍ
  //  ولا تاريخ ولا معرّف). هذا مصدرُ بادج الرأس وبطاقة «ملخّص الجلسات»
  //  أدناه فقط؛ الجدولُ الزمنيُّ التفصيليّ (تبويب الزيارات) يبقى يعتمد
  //  `casePayments` كما كان — فارغاً لمن لا يملك الصلاحية، بلا رقمٍ مزيَّفٍ
  //  هناك أيضاً، إذ يحتاج تواريخَ حقيقية لا تصل هذا المستخدم أصلاً.
  const legacyPaymentSessions: { treatmentType: string | null; sessionCount: number | null }[] =
    patient.payments
      ? patient.payments.map((p) => ({
          treatmentType: p.paymentTreatmentType ?? null, sessionCount: p.sessionCount ?? null,
        }))
      : ((patient as any).paymentSessionsSummary ?? []);
  const showAll = selectedCaseId == null || selectedCaseId === ALL_CASES;
  const caseVisits = showAll ? allVisits : allVisits.filter((v: any) => v.caseId === selectedCaseId || v.caseId == null);
  const casePayments = showAll ? allPayments : allPayments.filter((p: any) => p.caseId === selectedCaseId || p.caseId == null);
  // Sessions are a PHYSIOTHERAPY concept only (owner's rule): the remaining-
  // sessions counter must never appear for a prosthetic/support case — device
  // visits are not "sessions" and showing a decreasing number there confused
  // staff into thinking data was misplaced.
  const sessionsContext = !!patient.isPhysiotherapy && (showAll || selectedCase?.caseType === "physiotherapy");

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
        {isAdmin && (
          <MergePatientDialog patientId={patient.id} patientName={patient.name} patientCreatedAt={patient.createdAt as any} />
        )}
        {permissions.canEditPatients && (
          <Link href={`/patients/${patient.id}/edit${fromBranch ? `?branch=${fromBranch}` : ""}`}>
            <Button variant="outline" className="gap-2" data-testid="button-edit-patient">
              <Pencil className="w-4 h-4" />
              {t.patientDetails.edit}
            </Button>
          </Link>
        )}
        {/*  ══ **الحذفُ صار سلّةً** (ترحيل ٠٦٨) ═════════════════════════
              والصلاحيةُ روليّةٌ صريحة لا عَلَمُ `canDeletePatients`: ذاك
              عَلَمُ هدمٍ لا رجعةَ فيه، وهذا فعلٌ يُرَدّ بضغطة. والنافذةُ
              تقرأ الأثرَ من الخادم قبل أن تعرض زرّاً.  */}
        {canTrashPatients(branchSession as any) && (
          <DeletePatientDialog
            patientId={patient.id}
            patientName={patient.name}
            onDeleted={() => setLocation(backUrl)}
          />
        )}
        
        {/* Transfer Patient Button — admin or branch manager */}
        {isAdminOrManager && (
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-transfer-patient">
                <ArrowLeftRight className="w-4 h-4" />
                {t.patientDetails.transferToBranch}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t.patientDetails.transferTitle}</DialogTitle>
                <DialogDescription>
                  {t.patientDetails.transferDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">{t.patientDetails.selectNewBranch}</label>
                <Select value={selectedTransferBranch} onValueChange={setSelectedTransferBranch}>
                  <SelectTrigger data-testid="select-transfer-branch">
                    <SelectValue placeholder={t.patientDetails.selectBranch} />
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
                  {t.common.cancel}
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
                  {transferMutation.isPending ? t.patientDetails.transferring : t.patientDetails.transferPatient}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {isAdminOrManager && (
          <Dialog open={editCreatedAtOpen} onOpenChange={setEditCreatedAtOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (patient?.createdAt) {
                    const d = new Date(patient.createdAt);
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    setNewCreatedAtDate(dateStr);
                    setNewCreatedAtTime(timeStr);
                  }
                }}
                data-testid="button-edit-created-at"
              >
                <Calendar className="w-4 h-4" />
                {t.patientDetails.changeFileDate}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t.patientDetails.changeFileDate}</DialogTitle>
                <DialogDescription>
                  {t.patientDetails.changeFileDateDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <Label className="mb-2 block">{t.patientDetails.newDate}</Label>
                  <DatePickerIraq
                    value={newCreatedAtDate}
                    onChange={(val) => setNewCreatedAtDate(val)}
                    className="w-full"
                    data-testid="input-new-created-at-date"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{t.patientDetails.newTime}</Label>
                  <Input
                    type="time"
                    value={newCreatedAtTime}
                    onChange={(e) => setNewCreatedAtTime(e.target.value)}
                    className="w-full"
                    data-testid="input-new-created-at-time"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEditCreatedAtOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={() => {
                    if (patient && newCreatedAtDate) {
                      const time = newCreatedAtTime || "00:00";
                      const createdAt = `${newCreatedAtDate}T${time}:00`;
                      updateCreatedAtMutation.mutate({ patientId: patient.id, createdAt });
                    }
                  }}
                  disabled={!newCreatedAtDate || updateCreatedAtMutation.isPending}
                  data-testid="button-confirm-change-date"
                >
                  {updateCreatedAtMutation.isPending ? "..." : t.common.save}
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
          {t.patientDetails.exportPdf}
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex items-start gap-3 md:gap-4">
          <Button variant="ghost" onClick={() => setLocation(backUrl)} className="h-9 w-9 md:h-10 md:w-10 p-0 rounded-full border print:hidden shrink-0">
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <h1 className="text-xl md:text-3xl font-display font-bold text-slate-900">{patient.name}</h1>
              {/*  الهوية العلنية بجانب الاسم — هي ما يُقال ويُطبع ويُبحث به،
                  أمّا رقم الصفّ الداخلي فيبقى داخلياً. */}
              <PatientCodeBadge code={(patient as any).patientCode} />
              {/*  ══ **بابُ عمليات الأجهزة، بجوار الاسم** ═════════════════
                  السؤالُ الأول الذي يُطرَح على كل مريض أطرافٍ أو مساند —
                  فمكانُه حيث تقع العينُ أوّلاً، لا داخل تبويبٍ وقائمة.
                  **والحوارُ هو حوارُ الموزِّع بعينه** (`routingOpen` تُمرَّر
                  إليه أدناه)، لا نسخةٌ ثانية تنحرف عنه.
                  والبوّابةُ `canAddPatients` نفسُها بلا توسيع.
                  ويلتفّ تحت الاسم في الشاشات الصغيرة بحكم `flex-wrap`. */}
              {permissions.canAddPatients
                && (!!patient.isAmputee || !!patient.isMedicalSupport) && (
                <Button
                  size="sm"
                  className="gap-1.5 h-8 print:hidden"
                  onClick={() => { setTab("visits"); setRoutingOpen(true); }}
                  data-testid="button-header-reception-routing"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {RECEPTION_ROUTING_QUESTION}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3 mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3 md:w-4 md:h-4" /> {t.patientDetails.age}: {patient.age}</span>
              {patient.phone && (
                <>
                  <span className="w-1 h-1 bg-slate-300 rounded-full self-center hidden md:block"></span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 md:w-4 md:h-4" /> {patient.phone}</span>
                </>
              )}
              <span className="w-1 h-1 bg-slate-300 rounded-full self-center hidden md:block"></span>
              <span className="hidden md:inline">{t.patientDetails.fileDate}: {formatDateIraq(patient.createdAt)} - {formatTimeIraq(patient.createdAt)}</span>
            </div>
            {patient.address && (
              <div className="flex items-center gap-1 mt-1 text-xs md:text-sm text-muted-foreground">
                <MapPin className="w-3 h-3 md:w-4 md:h-4" /> {patient.address}
              </div>
            )}
            {patient.referralSource && (
              <div className="flex items-center gap-1 mt-1 text-xs md:text-sm text-muted-foreground">
                <span className="font-medium">{t.patientDetails.referralSource}:</span> {patient.referralSource}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center">
          <Badge variant="outline" className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 h-auto gap-1">
            <Building2 className="w-3 h-3" />
            {getBranchName(patient.branchId)}
          </Badge>
          {/* Case chips: one per specialty. Click → that case's page below.
              Falls back to the legacy single badge until cases are loaded. */}
          {patientCasesList.length > 0 ? (
            <PatientCaseChips cases={patientCasesList} selectedId={selectedCaseId} onSelect={setSelectedCaseId} />
          ) : (
            <PatientDepartmentBadges patient={patient} className="text-xs md:text-base px-2 md:px-4 py-1 md:py-1.5 h-auto" />
          )}
          {(() => {
            const totalSessions = legacyPaymentSessions.reduce((sum, p) => sum + (p.sessionCount || 0), 0) || 0;
            if (totalSessions > 0) {
              return (
                <Badge variant="outline" className="text-xs md:text-sm px-2 md:px-3 py-1 md:py-1.5 h-auto gap-1 bg-blue-50 text-blue-700 border-blue-200">
                  <Activity className="w-3 h-3" />
                  {totalSessions} {t.patientDetails.session}
                </Badge>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Selected case's header (finances + details). Its visits/payments show
          in the tabs below, filtered to this case — not duplicated here. */}
      {/* key: switching chips must remount the panel so an OPEN cost editor's
          draft can never be saved onto the newly-selected case. */}
      {selectedCase && <PatientCasePanel key={selectedCase.id} caseRow={selectedCase} patientId={patient.id} />}

      {(patient.isAmputee || patient.isMedicalSupport) && (
        <div className="mb-6 space-y-3">
          <PatientWorkOrderCard patientId={patient.id} />
          <div className="flex flex-wrap gap-2 items-center">
            <StartManufacturingDialog patient={patient} />
            {/*  بابُ الاستقبال إلى الطبيب — للأطراف والمساند وحدهما.
                والعلاج الطبيعي لا يمرّ من هنا إطلاقاً (شرط الإظهار نفسه). */}
            <SendToDoctorReviewDialog
              patientId={patient.id}
              services={[
                patient.isAmputee ? "prosthetic" as const : null,
                patient.isMedicalSupport ? "medical_support" as const : null,
              ].filter(Boolean) as ("prosthetic" | "medical_support")[]}
            />
          </div>
        </div>
      )}

      {/* The doctor's signed clinical thread — read-only for everyone except a
          doctor granted the matching specialty. */}
      <div className="mb-6">
        <PatientMedicalExams
          patientId={patient.id}
          patientName={patient.name}
          branchName={branches?.find((b) => b.id === patient.branchId)?.name ?? null}
        />
      </div>

      {/*  وخصمٌ ينتظر الاعتماد يُقال **قبل** كلّ شيء: هو تفسيرُ سكونِ الملفّ
          (لا كلفة ولا تصنيع)، ولولاه لأعاد الموظّف الإدخال ظنّاً أن حفظه ضاع. */}
      <div className="mb-4">
        <PendingDiscountBanner patientId={patient.id} />
      </div>

      {/*  قرارُ المريض بعد المعاينة — تحت السجلّ السريري مباشرةً، فالقرار
          يُقرأ في سياق ما قرّره الطبيب. والبطاقة تختفي وحدها حين لا متابعة. */}
      <div className="mb-6">
        <PostExamDecisionCard patientId={patient.id} />
      </div>

      {/*  ومبالغُ «بلا معاينة» تُقال صراحةً: المعلَّقُ **ليس على حساب
          المريض بعد**، فلا يُظنّ مسجَّلاً ولا يُطالَب به مرّتين. والبطاقة
          تختفي وحدها حين لا صفَّ للمريض. */}
      <div className="mb-6">
        <PendingChargesCard patientId={patient.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Info & Stats */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6 rounded-2xl shadow-sm border-border/60 space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
              <Activity className="w-5 h-5" />
              {t.patientDetails.medicalData}
            </h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed">
                <div>
                  <p className="text-muted-foreground mb-1">{t.patientDetails.weight}</p>
                  <p className="font-semibold text-lg">{patient.weight || "--"} {t.patientDetails.weightUnit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">{t.patientDetails.height}</p>
                  <p className="font-semibold text-lg">{patient.height || "--"} {t.patientDetails.heightUnit}</p>
                </div>
              </div>
              {(patient.injuryDate || patient.injuryCause) && (
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-dashed">
                  {patient.injuryDate && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t.patientDetails.injuryDate}</p>
                      <p className="font-semibold text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDateIraq(patient.injuryDate)}
                      </p>
                    </div>
                  )}
                  {patient.injuryCause && (
                    <div>
                      <p className="text-muted-foreground mb-1">{t.patientDetails.injuryCause}</p>
                      <p className="font-semibold text-base flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        {patient.injuryCause}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* أقسام الحالات منفصلة — كل حالة يحملها المريض تظهر بتفاصيلها الكاملة */}
              <CaseDetailSections
                patient={patient}
                t={t}
                translateInjurySide={translateInjurySide}
                translateInjuryType={translateInjuryType}
                translateInjuryArea={translateInjuryArea}
                translateTreatmentType={translateTreatmentType}
              />
              {patient.patientClassification && (
                <div className="pt-4 border-t border-dashed">
                  <p className="text-muted-foreground mb-1">{t.patientForm.patientClassification}</p>
                  <p className="text-slate-700">{patient.patientClassification === "new" ? t.patientForm.newPatient : t.patientForm.pastPatient}</p>
                </div>
              )}
              {patient.generalNotes && (
                <div className="pt-4 border-t border-dashed">
                  <p className="text-muted-foreground mb-1">{t.patientDetails.generalNotes}</p>
                  <p className="text-slate-700">{patient.generalNotes}</p>
                </div>
              )}
            </div>
          </Card>

          {patient.isPhysiotherapy && (() => {
            // Same rule as the counter below: the stored plan is the truth when
            // it exists (new flow), payments are the truth when it doesn't (old
            // flow). This card used to read payments only, so a priced patient
            // saw no session card at all.
            const physioCaseCost = patientCasesList.find((c) => c.caseType === "physiotherapy")?.cost ?? patient.totalCost ?? 0;
            //  `legacyPaymentSessions` — الدفعاتُ الخام حين تصل، وإلّا
            //  ملخّصُ الجلسات غيرُ الماليّ من الخادم (إصلاحٌ 2026-09-03).
            const purchased = resolvePurchasedSessions({
              plan: (patient as any).physioPlan,
              treatmentTypeText: patient.treatmentType,
              caseCost: physioCaseCost,
              paymentSessions: legacyPaymentSessions,
            });
            const sessionsByType = purchased.byType;
            const totalSessions = purchased.total;
            // The card now shows even at zero: a physiotherapy patient with no
            // recorded sessions is exactly the case that needs fixing, and
            // hiding the card hid the problem (and its remedy) from view.
            return (
              <Card className="p-6 rounded-2xl shadow-sm border-border/60 bg-slate-50/50">
                <h3 className="font-bold text-lg flex items-center gap-2 text-blue-600 mb-6">
                  <Activity className="w-5 h-5" />
                  {t.patientDetails.sessionSummary}
                  {permissions.canAddPatients && (
                    <Button
                      variant="ghost" size="sm"
                      className="mr-auto h-7 text-xs gap-1 text-blue-700 hover:bg-blue-50"
                      onClick={() => setEditingPlan(true)}
                      data-testid="button-edit-physio-plan"
                    >
                      <Pencil className="w-3.5 h-3.5" /> تعديل
                    </Button>
                  )}
                </h3>
                {totalSessions === 0 && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                    لم تُسجَّل جلسات لهذا المريض بعد. اضغط «تعديل» وأدخل عدد الجلسات المتفق عليها —
                    لا تتأثر الكلفة ولا المدفوعات.
                  </p>
                )}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-muted-foreground">{t.patientDetails.totalSessionsCount}</span>
                    <span className="font-bold text-xl text-blue-600">{totalSessions} {t.patientDetails.session}</span>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-dashed">
                    {Object.entries(sessionsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-sm">{translateTreatmentType(type)}</span>
                        <span className="font-semibold text-slate-700">{count} {t.patientDetails.session}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/*  ══ `canViewPayments` — الملخّصُ الماليّ كاملاً محجوبٌ عمّن لا
              يملك عرضَ الدفعات (إصلاحٌ 2026-09-02) ═══════════════════════
              `patient.payments` غائبةٌ من الخادم لهذا المستخدم أصلاً
              (`GET /api/patients/:id`)، فـ`totalPaid`/`remaining`/`progress`
              أعلاه تُحسَب من مصفوفةٍ فارغة — «مدفوعٌ صفر، متبقٍّ كامل
              الكلفة» رقمٌ ماليٌّ كاذب لا حالةَ صلاحية. تبقى «التكلفة الكلية»
              وحدها — ليست دفعةً — لكن هذه البطاقةُ تمزجها بالمدفوع والمتبقي
              في تصميمٍ واحد متماسك، فتُحجَب معاً بدل تفكيكها. */}
          {permissions.canViewPayments && (
          <Card className="p-6 rounded-2xl shadow-sm border-border/60 bg-slate-50/50">
            <h3 className="font-bold text-lg flex items-center gap-2 text-emerald-600 mb-6">
              <Banknote className="w-5 h-5" />
              {t.patientDetails.financialSummary}
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-muted-foreground">{t.patientDetails.treatmentCost}</span>
                <span className="font-bold text-xl">{patient.totalCost?.toLocaleString('ar-IQ')} {t.patientDetails.currency}</span>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${progress}%` }} 
                />
              </div>

              <div className="flex justify-between text-sm pt-2">
                <div>
                  <p className="text-muted-foreground">{t.patientDetails.paidAmount}</p>
                  <p className="font-bold text-emerald-600">{totalPaid.toLocaleString('ar-IQ')} {t.patientDetails.currency}</p>
                </div>
                {/*  ══ **الرصيدُ السالب يُقال رصيداً** (ترحيل ٠٦٤) ═══════════
                    بعد تصحيحٍ إداريّ يُعكَس فيه بيعٌ دُفع جزءٌ منه، يصير
                    المدفوعُ أكبرَ من المستحقّ. و«المتبقي: −٣٠٠,٠٠٠» بالأحمر
                    سطرٌ يقرأه الموظّف فيظنّ عطباً في الحساب. والحقيقةُ أبسط
                    وأنفع: **للمريض رصيدٌ يحتاج تسوية.** */}
                <div className="text-left" data-testid="box-patient-remaining">
                  {remaining < 0 ? (
                    <>
                      <p className="text-muted-foreground">رصيد للمريض</p>
                      <p className="font-bold text-emerald-600">
                        {Math.abs(remaining).toLocaleString('ar-IQ')} {t.patientDetails.currency}
                      </p>
                      <p className="text-[11px] text-muted-foreground">يحتاج تسوية مالية</p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground">{t.patientDetails.remainingAmount}</p>
                      <p className="font-bold text-red-500">{remaining.toLocaleString('ar-IQ')} {t.patientDetails.currency}</p>
                    </>
                  )}
                </div>
              </div>

              {permissions.canAddPayments && (
              <div className="pt-4 border-t border-dashed">
                <PaymentModal patientId={patient.id} branchId={patient.branchId} isPhysiotherapy={!!patient.isPhysiotherapy} isAmputee={!!patient.isAmputee} isMedicalSupport={!!patient.isMedicalSupport} />
              </div>
              )}
            </div>
          </Card>
          )}

          {/* قنوات تواصل المريض — الصلاحية يفرضها الخادم، والبطاقة تصمت
              بلا أزرار حين يردّ 403. */}
          <PatientCommunicationCard
            enabled={(patient as any).whatsappNotificationsEnabled}
            hasPhone={Boolean((patient as any).phoneE164)}
          />
        </div>

        {/* Right Column: Tabs (Payments, Documents) */}
        <div className="lg:col-span-2">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start h-12 bg-white border border-border/60 p-1 rounded-xl mb-6 shadow-sm flex-wrap gap-1">
              <TabsTrigger value="visits" className="flex-1 max-w-[130px] data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all">
                {t.patientDetails.visitHistory}
              </TabsTrigger>
              {permissions.canViewPayments && (
              <TabsTrigger value="payments" className="flex-1 max-w-[130px] data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
                {t.patientDetails.paymentHistory}
              </TabsTrigger>
              )}
              <TabsTrigger value="documents" className="flex-1 max-w-[130px] data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg transition-all">
                {t.patientDetails.documents}
              </TabsTrigger>
              {patient.isPhysiotherapy && (
                <TabsTrigger value="treatment-plans" className="flex-1 max-w-[130px] data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-lg transition-all" data-testid="tab-treatment-plans">
                  {t.patientDetails.treatmentPlans}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="visits" className="space-y-4">
              {/* زرّان لا ثلاثة: الزيارة كما كانت، وباب واحد لكل ما عداها.
                  «إضافة نوع حالة» لم يعد زرّاً مستقلّاً — صار خياراً داخل
                  الموزِّع باسمه الذي يعرفه الموظّف («أطراف صناعية»…) بدل
                  مصطلحٍ داخليّ لا يميّزه أحد عن «خدمة جديدة».
                  والبوّابة كما كانت: `canAddPatients` بلا توسيع. */}
              {permissions.canAddPatients && (
              <div className="flex justify-end gap-2 mb-4 flex-wrap">
                <VisitModal patientId={patient.id} branchId={patient.branchId} isPhysiotherapy={!!patient.isPhysiotherapy} isAmputee={!!patient.isAmputee} isMedicalSupport={!!patient.isMedicalSupport} />
                <PatientServiceLauncher
                  patient={patient}
                  routingOpen={routingOpen}
                  onRoutingOpenChange={setRoutingOpen}
                />
              </div>
              )}

              {patient.isPhysiotherapy && (() => {
                // Purchased sessions come from the stored PLAN — what reception
                // priced (and what «جلسات علاج إضافية» added). Patients from the
                // old flow have no plan; for them the sessions really do live on
                // their payments, so that stays the fallback. Never both, or a
                // patient who was priced AND paid would read double.
                const physioCost = patientCasesList.find((c) => c.caseType === "physiotherapy")?.cost ?? patient.totalCost ?? 0;
                const sessionsByType = resolvePurchasedSessions({
                  plan: (patient as any).physioPlan,
                  treatmentTypeText: patient.treatmentType,
                  caseCost: physioCost,
                  paymentSessions: (casePayments ?? []).map((p) => ({
                    treatmentType: p.paymentTreatmentType ?? null, sessionCount: p.sessionCount ?? null,
                  })),
                }).byType;
                const visitsByType: Record<string, number> = {};
                caseVisits?.forEach((v) => {
                  const isServiceVisit = v.details === "خدمة جديدة" || (v.notes && v.notes.startsWith("خدمة جديدة:"));
                  const isConsultation = v.treatmentType === "استشارة طبية";
                  if (isServiceVisit || isConsultation) return;
                  const type = v.treatmentType || t.patientDetails.unspecified;
                  visitsByType[type] = (visitsByType[type] || 0) + 1;
                });
                const allTypes = new Set([...Object.keys(sessionsByType), ...Object.keys(visitsByType)]);
                const typesWithData = Array.from(allTypes).filter(t => (sessionsByType[t] || 0) > 0 || (visitsByType[t] || 0) > 0);

                if (typesWithData.length > 0) {
                  return (
                    <div className="flex flex-wrap gap-3 mb-4" data-testid="sessions-summary">
                      {typesWithData.map((type) => {
                        const paid = sessionsByType[type] || 0;
                        const used = visitsByType[type] || 0;
                        const rem = paid - used;
                        return (
                          <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-md border ${rem <= 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`} data-testid={`summary-${type}`}>
                            <span className="text-sm font-medium text-slate-700">{translateTreatmentType(type)}:</span>
                            <span className={`font-bold text-sm ${rem <= 0 ? "text-red-600" : "text-emerald-600"}`}>{rem}</span>
                            <span className="text-xs text-slate-400">({paid} {t.patientDetails.paidSessions} - {used} {t.patientDetails.usedSessions})</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="overflow-x-auto rounded-md border border-slate-300">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700" style={{ width: sessionsContext ? "15%" : "20%" }}>{t.patientDetails.date}</th>
                      {sessionsContext && (
                        <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700" style={{ width: "17%" }}>{t.patientDetails.treatmentType}</th>
                      )}
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700" style={{ width: sessionsContext ? "33%" : "50%" }}>{t.patientDetails.visitDetails}</th>
                      {sessionsContext && (
                        <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700" style={{ width: "18%" }}>{t.patientDetails.remainingSessions}</th>
                      )}
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700" style={{ width: sessionsContext ? "17%" : "30%" }}>{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseVisits?.length === 0 ? (
                      <tr><td colSpan={patient.isPhysiotherapy ? 5 : 3} className="border border-slate-300 p-8 text-center text-muted-foreground">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        {t.patientDetails.noVisits}
                      </td></tr>
                    ) : (
                      (() => {
                        const sessionsByType: Record<string, number> = {};
                        casePayments?.forEach((p) => {
                          const type = p.paymentTreatmentType || t.patientDetails.unspecified;
                          sessionsByType[type] = (sessionsByType[type] || 0) + (p.sessionCount || 0);
                        });
                        const remainingMap: Record<number, number> = {};
                        const visitCountByType: Record<string, number> = {};
                        const paidByType: Record<string, number> = {};
                        // With a stored plan the whole course is bought up front,
                        // so seed the credit and skip the payment walk entirely —
                        // otherwise every row would count down from zero.
                        const physioCostRows = patientCasesList.find((c) => c.caseType === "physiotherapy")?.cost ?? patient.totalCost ?? 0;
                        const purchasedRows = resolvePurchasedSessions({
                          plan: (patient as any).physioPlan,
                          treatmentTypeText: patient.treatmentType,
                          caseCost: physioCostRows,
                          paymentSessions: (casePayments ?? []).map((p) => ({
                            treatmentType: p.paymentTreatmentType ?? null, sessionCount: p.sessionCount ?? null,
                          })),
                        });
                        // Anything but the old payment-by-payment flow means the
                        // whole course was bought up front: seed the credit and
                        // skip the chronological payment walk below.
                        const usePlan = purchasedRows.source !== "payments" && purchasedRows.total > 0;
                        if (usePlan) Object.assign(paidByType, purchasedRows.byType);
                        const visitsOldestFirst = [...(caseVisits || [])].sort((a, b) => new Date(a.visitDate || 0).getTime() - new Date(b.visitDate || 0).getTime());
                        const paymentsSorted = usePlan ? [] : [...(casePayments || [])].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
                        let paymentIdx = 0;
                        visitsOldestFirst.forEach((v) => {
                          const isServiceVisit = v.details === "خدمة جديدة" || (v.notes && v.notes.startsWith("خدمة جديدة:"));
                          const isConsultation = v.treatmentType === "استشارة طبية";
                          const type = v.treatmentType || t.patientDetails.unspecified;
                          const visitTime = new Date(v.visitDate || 0).getTime();
                          while (paymentIdx < paymentsSorted.length) {
                            const pTime = new Date(paymentsSorted[paymentIdx].date || 0).getTime();
                            if (pTime <= visitTime) {
                              const pType = paymentsSorted[paymentIdx].paymentTreatmentType || t.patientDetails.unspecified;
                              paidByType[pType] = (paidByType[pType] || 0) + (paymentsSorted[paymentIdx].sessionCount || 0);
                              paymentIdx++;
                            } else {
                              break;
                            }
                          }
                          if (!isServiceVisit && !isConsultation) {
                            visitCountByType[type] = (visitCountByType[type] || 0) + 1;
                          }
                          if (isConsultation || isServiceVisit || !v.treatmentType) {
                            remainingMap[v.id] = -999;
                          } else {
                            remainingMap[v.id] = (paidByType[type] || sessionsByType[type] || 0) - (visitCountByType[type] || 0);
                          }
                        });
                        return caseVisits?.map((visit) => {
                          const remaining = remainingMap[visit.id] ?? 0;
                          return (
                        <tr key={visit.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">
                            <div>{formatDateTimeIraq(visit.visitDate)}</div>
                            <div className="text-xs text-slate-400">{formatTimeIraq(visit.visitDate)}</div>
                          </td>
                          {sessionsContext && (
                            <td className="border border-slate-300 px-3 py-2 text-center text-slate-700">{translateTreatmentType(visit.treatmentType)}</td>
                          )}
                          <td className="border border-slate-300 px-3 py-2 text-center text-slate-600" dir="auto" style={{ unicodeBidi: "plaintext" }}>
                            {visit.details || visit.notes || "-"}
                            {visit.details && visit.notes && (
                              <div className="text-xs text-slate-400 mt-1" dir="auto" style={{ unicodeBidi: "plaintext" }}>{visit.notes}</div>
                            )}
                            {patientCasesList.length > 1 && (
                              (permissions.canEditVisits || isAdminOrManager) ? (
                                <select
                                  className="mt-1 text-xs border border-slate-200 rounded px-1 py-0.5 bg-slate-50 text-slate-600"
                                  value={(visit as any).caseId ?? ""}
                                  onChange={(e) => { const v = Number(e.target.value); if (v) moveVisitCase.mutate({ visitId: visit.id, caseId: v }); }}
                                  data-testid={`visit-case-switch-${visit.id}`}
                                >
                                  {(visit as any).caseId == null && <option value="">بلا حالة</option>}
                                  {patientCasesList.map((c) => (
                                    <option key={c.id} value={c.id}>{CASE_SHORT_LABELS[c.caseType] ?? c.caseType}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="mt-1 text-[10px] text-slate-400">
                                  {CASE_SHORT_LABELS[patientCasesList.find((c) => c.id === (visit as any).caseId)?.caseType ?? ""] ?? "—"}
                                </div>
                              )
                            )}
                          </td>
                          {sessionsContext && (
                            <td className="border border-slate-300 px-3 py-2 text-center">
                              {remaining === -999 ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : (
                                <span className={`font-bold ${remaining <= 0 ? "text-red-600" : "text-emerald-600"}`}>
                                  {remaining}
                                </span>
                              )}
                            </td>
                          )}
                          <td className="border border-slate-300 px-3 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              {(permissions.canEditVisits || isAdminOrManager) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setEditingVisit({ id: visit.id, details: visit.details, notes: visit.notes, treatmentType: visit.treatmentType, sessionCount: visit.sessionCount, cost: visit.cost, visitDate: visit.visitDate ? String(visit.visitDate) : null })}
                                data-testid={`button-edit-visit-${visit.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              )}
                              {(permissions.canDeleteVisits || isAdminOrManager) && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                      disabled={isDeletingVisit}
                                      data-testid={`button-delete-visit-${visit.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>حذف الزيارة؟</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        ستختفي هذه الزيارة من السجلّ التشغيلي (سجلّ الزيارات) فقط. كلفتُها وأيّ
                                        دفعةٍ مرتبطة بها تبقيان كما هما دون أيّ تغيير — لا تُحذفان ولا تُعدَّلان.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteVisit({ visitId: visit.id, patientId: patient.id })}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={isDeletingVisit}
                                        data-testid={`confirm-delete-visit-${visit.id}`}
                                      >
                                        نعم، احذف
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </td>
                        </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
              
              {editingVisit && (
                <EditVisitModal
                  visit={editingVisit}
                  patientId={patient.id}
                  open={!!editingVisit}
                  onOpenChange={(open) => !open && setEditingVisit(null)}
                  // The "isAdmin" prop in the modal gates the date
                  // editor specifically. Treat anyone with the new
                  // canEditVisits permission as having that power
                  // too — that's the whole point of the new flag.
                  isAdmin={isAdminOrManager || permissions.canEditVisits}
                  isPhysiotherapy={patient.isPhysiotherapy || false}
                />
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {/*  `canViewPayments` — نفسُ حجب بطاقة «الملخّص الماليّ» أعلاه
                  (إصلاحٌ 2026-09-02). ولا مجرّدَ إخفاء تبويبٍ من الشريط:
                  التبويبُ نفسُه محروسٌ هنا أيضاً، فلا صفوفَ دفعاتٍ خامٍ
                  تصل مَن لا يملك عرضَها ولو صار `tab` القيمة «payments»
                  بطريقةٍ لا تمرّ بالنقر على تبويبٍ لم يعد ظاهراً. */}
              {!permissions.canViewPayments ? (
                <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-muted-foreground">
                  ليس لديك صلاحية عرض الدفعات
                </div>
              ) : (
              <div className="overflow-x-auto rounded-md border border-slate-300">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">{t.patientDetails.amount}</th>
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">{t.patientDetails.date}</th>
                      {patient.isPhysiotherapy && (
                        <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">{t.patientDetails.treatmentType}</th>
                      )}
                      {patient.isPhysiotherapy && (
                        <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">{t.patientDetails.sessionCount}</th>
                      )}
                      <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">{t.patientDetails.notes}</th>
                      {(permissions.canEditPayments || permissions.canDeletePayments) && <th className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-700">{t.common.actions}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {casePayments?.length === 0 ? (
                      <tr><td colSpan={isAdmin ? (patient.isPhysiotherapy ? 6 : 4) : (patient.isPhysiotherapy ? 5 : 3)} className="border border-slate-300 p-8 text-center text-muted-foreground">{t.patientDetails.noPayments}</td></tr>
                    ) : (
                      casePayments?.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-3 py-2 text-center font-bold text-emerald-600">
                            {payment.amount.toLocaleString('ar-IQ')} {t.patientDetails.currency}
                            {(payment as any).isFreeSessions && (
                              <Badge variant="secondary" className="mr-1 text-xs" data-testid={`badge-free-session-${payment.id}`}>{t.modals.freeSessions}</Badge>
                            )}
                          </td>
                          <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">
                            <div>{formatDateTimeIraq(payment.date)}</div>
                            <div className="text-xs text-slate-400">{formatTimeIraq(payment.date)}</div>
                          </td>
                          {patient.isPhysiotherapy && (
                            <td className="border border-slate-300 px-3 py-2 text-center" data-testid={`text-payment-treatment-${payment.id}`}>
                              {payment.paymentTreatmentType 
                                ? payment.paymentTreatmentType.split(",").map((tt: string, i: number) => (
                                    <span key={i} className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-xs mx-0.5 mb-0.5">{translateTreatmentType(tt.trim())}</span>
                                  ))
                                : <span className="text-slate-400">-</span>
                              }
                            </td>
                          )}
                          {patient.isPhysiotherapy && (
                            <td className="border border-slate-300 px-3 py-2 text-center font-mono" data-testid={`text-payment-sessions-${payment.id}`}>
                              {payment.sessionCount ? payment.sessionCount : <span className="text-slate-400">-</span>}
                            </td>
                          )}
                          <td className="border border-slate-300 px-3 py-2 text-center text-slate-600" dir="auto" style={{ unicodeBidi: "plaintext" }}>{(payment as any).displayDescription || payment.notes || "-"}</td>
                          {(permissions.canEditPayments || permissions.canDeletePayments) && (
                            <td className="border border-slate-300 px-3 py-2 text-center">
                              <div className="flex gap-1 justify-center">
                                {permissions.canEditPayments && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => openEditPayment({ id: payment.id, amount: payment.amount, notes: payment.notes, sessionCount: payment.sessionCount, paymentTreatmentType: payment.paymentTreatmentType, date: payment.date ? String(payment.date) : null, isFreeSessions: (payment as any).isFreeSessions })}
                                  data-testid={`button-edit-payment-${payment.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                )}
                                {permissions.canDeletePayments && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => { setDeletePaymentReason(""); setDeletingPayment({ id: payment.id }); }}
                                  disabled={isDeletingPayment}
                                  data-testid={`button-delete-payment-${payment.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                  <h4 className="font-bold text-blue-900">{t.patientDetails.uploadNewDoc}</h4>
                  <p className="text-sm text-blue-700">{t.patientDetails.uploadDocDesc}</p>
                </div>
                <Button variant="outline" className="border-blue-200 hover:bg-white text-blue-700 gap-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Upload className="w-4 h-4" />
                  {isUploading ? t.patientDetails.uploading : t.patientDetails.chooseFile}
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
                    <p className="text-slate-500">{t.patientDetails.noDocumentsAttached}</p>
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
                          {formatDateTimeIraq(doc.uploadedAt)}
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

            {patient.isPhysiotherapy && (
              <TabsContent value="treatment-plans" className="space-y-4">
                {permissions.canManageTreatmentPlans && (
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => {
                        resetTreatmentPlanForm();
                        setEditingTreatmentPlan(null);
                        setShowTreatmentPlanDialog(true);
                      }}
                      data-testid="button-add-treatment-plan"
                    >
                      <ClipboardList className="w-4 h-4 ml-2" />
                      {t.patientDetails.addTreatmentPlan}
                    </Button>
                  </div>
                )}

                {isLoadingTreatmentPlans ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : treatmentPlans.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    {t.patientDetails.noTreatmentPlans}
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {treatmentPlans.map((plan) => (
                      <Card key={plan.id} className="p-4 space-y-3" data-testid={`card-treatment-plan-${plan.id}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {plan.therapistName && (
                              <Badge variant="secondary" data-testid={`text-therapist-${plan.id}`}>
                                {plan.therapistName}
                              </Badge>
                            )}
                            {plan.createdAt && (
                              <span className="text-xs text-muted-foreground" data-testid={`text-plan-date-${plan.id}`}>
                                {formatDateTimeIraq(plan.createdAt)}
                              </span>
                            )}
                            {plan.goalType && (
                              <Badge variant={plan.goalType === "short_term" ? "outline" : "default"} data-testid={`badge-goal-type-${plan.id}`}>
                                {plan.goalType === "short_term" ? t.treatmentPlan.shortTerm : t.treatmentPlan.longTerm}
                              </Badge>
                            )}
                          </div>
                          {permissions.canManageTreatmentPlans && (
                            <div className="flex items-center gap-1" style={{ visibility: "visible" }}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditTreatmentPlan(plan)}
                                data-testid={`button-edit-treatment-plan-${plan.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingTreatmentPlanId(plan.id)}
                                data-testid={`button-delete-treatment-plan-${plan.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {plan.diagnosis && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.diagnosis}:</span>
                              <p data-testid={`text-diagnosis-${plan.id}`}>{plan.diagnosis}</p>
                            </div>
                          )}
                          {plan.injuryType && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.injuryType}:</span>
                              <p data-testid={`text-injury-type-${plan.id}`}>{plan.injuryType}</p>
                            </div>
                          )}
                          {plan.injuryLocation && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.injuryArea}:</span>
                              <p data-testid={`text-injury-location-${plan.id}`}>{plan.injuryLocation}</p>
                            </div>
                          )}
                          {plan.diseaseHistory && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.diseaseHistory}:</span>
                              <p data-testid={`text-disease-history-${plan.id}`}>{plan.diseaseHistory}</p>
                            </div>
                          )}
                          {plan.mmtAssessment && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.mmtAssessment}:</span>
                              <p data-testid={`text-mmt-${plan.id}`}>{plan.mmtAssessment}</p>
                            </div>
                          )}
                          {plan.spasticity && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.spasticity}:</span>
                              <p data-testid={`text-spasticity-${plan.id}`}>{plan.spasticity}</p>
                            </div>
                          )}
                          {plan.sensation && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.sensation}:</span>
                              <p data-testid={`text-sensation-${plan.id}`}>{plan.sensation}</p>
                            </div>
                          )}
                          {plan.painLevel && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.painLevel}:</span>
                              <p data-testid={`text-pain-level-${plan.id}`}>{plan.painLevel}</p>
                            </div>
                          )}
                          {plan.adl && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.adl}:</span>
                              <p data-testid={`text-adl-${plan.id}`}>{plan.adl}</p>
                            </div>
                          )}
                          {plan.sessionCount && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.sessionCount}:</span>
                              <p data-testid={`text-session-count-${plan.id}`}>{plan.sessionCount}</p>
                            </div>
                          )}
                          {plan.sessionFrequency && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.sessionFrequency}:</span>
                              <p data-testid={`text-session-frequency-${plan.id}`}>{plan.sessionFrequency}</p>
                            </div>
                          )}
                          {plan.deviceType && (
                            <div>
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.deviceType}:</span>
                              <p data-testid={`text-device-type-${plan.id}`}>{plan.deviceType}</p>
                            </div>
                          )}
                          {plan.notes && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-muted-foreground">{t.treatmentPlan.notes}:</span>
                              <p data-testid={`text-notes-${plan.id}`}>{plan.notes}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Treatment Plan Dialog */}
      <Dialog open={showTreatmentPlanDialog} onOpenChange={(open) => {
        if (!open) {
          setShowTreatmentPlanDialog(false);
          setEditingTreatmentPlan(null);
          resetTreatmentPlanForm();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto font-body" dir={dir}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">
              {editingTreatmentPlan ? t.treatmentPlan.edit : t.treatmentPlan.addNew}
            </DialogTitle>
            <DialogDescription>
              {editingTreatmentPlan ? t.treatmentPlan.editDesc : t.treatmentPlan.addNewDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="tp-diagnosis">{t.treatmentPlan.diagnosis}</Label>
              <Textarea
                id="tp-diagnosis"
                value={treatmentPlanForm.diagnosis}
                onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                data-testid="input-tp-diagnosis"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-base">{t.treatmentPlan.injuries}</Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setTpInjuryEntries(prev => [...prev, { type: "", area: "", side: "" }])}
                  data-testid="button-tp-add-injury">
                  <Plus className="w-4 h-4 ml-1" />
                  {t.treatmentPlan.addInjury}
                </Button>
              </div>
              {tpInjuryEntries.map((entry, index) => (
                <div key={index} className="border rounded-lg p-3 bg-slate-50/50 space-y-3" data-testid={`tp-injury-entry-${index}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground">{t.treatmentPlan.injuryNum} {index + 1}</span>
                    {tpInjuryEntries.length > 1 && (
                      <Button type="button" size="icon" variant="ghost"
                        data-testid={`button-tp-remove-injury-${index}`}
                        onClick={() => setTpInjuryEntries(prev => prev.filter((_, i) => i !== index))}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t.treatmentPlan.injuryType}</Label>
                      <Select value={entry.type}
                        onValueChange={(val) => setTpInjuryEntries(prev => prev.map((e, i) => i === index ? { ...e, type: val } : e))}>
                        <SelectTrigger className="bg-white" data-testid={`select-tp-injury-type-${index}`}>
                          <SelectValue placeholder={t.treatmentPlan.selectInjuryType} />
                        </SelectTrigger>
                        <SelectContent>
                          {injuryTypeOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{translateInjuryType(opt)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.treatmentPlan.injuryArea}</Label>
                      <Select value={entry.area}
                        onValueChange={(val) => setTpInjuryEntries(prev => prev.map((e, i) => i === index ? { ...e, area: val } : e))}>
                        <SelectTrigger className="bg-white" data-testid={`select-tp-injury-area-${index}`}>
                          <SelectValue placeholder={t.treatmentPlan.selectInjuryArea} />
                        </SelectTrigger>
                        <SelectContent>
                          {injuryAreaOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{translateInjuryArea(opt)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t.treatmentPlan.injurySide}</Label>
                      <Select value={entry.side}
                        onValueChange={(val) => setTpInjuryEntries(prev => prev.map((e, i) => i === index ? { ...e, side: val } : e))}>
                        <SelectTrigger className="bg-white" data-testid={`select-tp-injury-side-${index}`}>
                          <SelectValue placeholder={t.treatmentPlan.optional} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="يمين">{t.treatmentPlan.right}</SelectItem>
                          <SelectItem value="يسار">{t.treatmentPlan.left}</SelectItem>
                          <SelectItem value="كلاهما">{t.treatmentPlan.both}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-diseaseHistory">{t.treatmentPlan.diseaseHistory}</Label>
              <Input
                id="tp-diseaseHistory"
                value={treatmentPlanForm.diseaseHistory}
                onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, diseaseHistory: e.target.value }))}
                data-testid="input-tp-diseaseHistory"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-mmtAssessment">{t.treatmentPlan.mmtAssessment}</Label>
              <Textarea
                id="tp-mmtAssessment"
                value={treatmentPlanForm.mmtAssessment}
                onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, mmtAssessment: e.target.value }))}
                data-testid="input-tp-mmtAssessment"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tp-spasticity">{t.treatmentPlan.spasticity}</Label>
                <Input
                  id="tp-spasticity"
                  value={treatmentPlanForm.spasticity}
                  onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, spasticity: e.target.value }))}
                  data-testid="input-tp-spasticity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tp-sensation">{t.treatmentPlan.sensation}</Label>
                <Input
                  id="tp-sensation"
                  value={treatmentPlanForm.sensation}
                  onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, sensation: e.target.value }))}
                  data-testid="input-tp-sensation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tp-painLevel">{t.treatmentPlan.painLevel}</Label>
                <Input
                  id="tp-painLevel"
                  value={treatmentPlanForm.painLevel}
                  onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, painLevel: e.target.value }))}
                  data-testid="input-tp-painLevel"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-adl">{t.treatmentPlan.adl}</Label>
              <Textarea
                id="tp-adl"
                value={treatmentPlanForm.adl}
                onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, adl: e.target.value }))}
                data-testid="input-tp-adl"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tp-sessionCount">{t.treatmentPlan.sessionCount}</Label>
                <Input
                  id="tp-sessionCount"
                  type="number"
                  className="text-left font-mono"
                  value={treatmentPlanForm.sessionCount}
                  onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, sessionCount: e.target.value }))}
                  data-testid="input-tp-sessionCount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tp-sessionFrequency">{t.treatmentPlan.sessionFrequency}</Label>
                <Input
                  id="tp-sessionFrequency"
                  placeholder={t.treatmentPlan.sessionFrequencyPlaceholder}
                  value={treatmentPlanForm.sessionFrequency}
                  onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, sessionFrequency: e.target.value }))}
                  data-testid="input-tp-sessionFrequency"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tp-deviceType">{t.treatmentPlan.deviceType}</Label>
                <Input
                  id="tp-deviceType"
                  value={treatmentPlanForm.deviceType}
                  onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, deviceType: e.target.value }))}
                  data-testid="input-tp-deviceType"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tp-goalType">{t.treatmentPlan.goalType}</Label>
                <Select value={treatmentPlanForm.goalType} onValueChange={(value) => setTreatmentPlanForm(prev => ({ ...prev, goalType: value }))}>
                  <SelectTrigger data-testid="select-tp-goalType">
                    <SelectValue placeholder={t.treatmentPlan.selectGoalType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_term">{t.treatmentPlan.shortTerm}</SelectItem>
                    <SelectItem value="long_term">{t.treatmentPlan.longTerm}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tp-notes">{t.treatmentPlan.notes}</Label>
              <Textarea
                id="tp-notes"
                value={treatmentPlanForm.notes}
                onChange={(e) => setTreatmentPlanForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-tp-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setShowTreatmentPlanDialog(false);
              setEditingTreatmentPlan(null);
              resetTreatmentPlanForm();
            }} data-testid="button-cancel-treatment-plan">
              {t.treatmentPlan.cancel}
            </Button>
            <Button
              onClick={handleSaveTreatmentPlan}
              disabled={createTreatmentPlanMutation.isPending || updateTreatmentPlanMutation.isPending}
              data-testid="button-save-treatment-plan"
            >
              {(createTreatmentPlanMutation.isPending || updateTreatmentPlanMutation.isPending)
                ? t.treatmentPlan.saving
                : t.treatmentPlan.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Treatment Plan Confirmation */}
      <AlertDialog open={!!deletingTreatmentPlanId} onOpenChange={(open) => { if (!open) setDeletingTreatmentPlanId(null); }}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {t.patientDetails.confirmDeletePlan}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.patientDetails.confirmDeletePlanDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete-treatment-plan">{t.common.no}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTreatmentPlanId && deleteTreatmentPlanMutation.mutate(deletingTreatmentPlanId)}
              disabled={deleteTreatmentPlanMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              data-testid="button-confirm-delete-treatment-plan"
            >
              {deleteTreatmentPlanMutation.isPending ? t.patientDetails.deleting : t.common.yes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingPaymentSession} onOpenChange={(open) => { if (!open) setEditingPaymentSession(null); }}>
        <DialogContent className="sm:max-w-[425px] font-body" dir={dir}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">{t.patientDetails.editSessionData}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.patientDetails.treatmentType}</label>
              <Select value={editTreatmentType} onValueChange={setEditTreatmentType}>
                <SelectTrigger data-testid="select-edit-treatment-type">
                  <SelectValue placeholder={t.patientDetails.selectTreatmentType} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {translateTreatmentType(option.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {patient.isPhysiotherapy && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.patientDetails.sessionCount}</label>
                <Input
                  type="number"
                  className="text-left font-mono"
                  placeholder={t.patientDetails.enterSessionCount}
                  value={editSessionCount}
                  onChange={(e) => setEditSessionCount(e.target.value)}
                  data-testid="input-edit-session-count"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingPaymentSession(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => {
                if (editingPaymentSession) {
                  updatePaymentSession.mutate({
                    paymentId: editingPaymentSession.id,
                    sessionCount: patient.isPhysiotherapy ? (editSessionCount ? Number(editSessionCount) : null) : null,
                    paymentTreatmentType: editTreatmentType || null,
                  });
                }
              }}
              disabled={updatePaymentSession.isPending}
              data-testid="button-save-session-edit"
            >
              {updatePaymentSession.isPending ? t.patientDetails.saving : t.patientDetails.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingPayment} onOpenChange={(open) => { if (!open) setEditingPayment(null); }}>
        <DialogContent className="sm:max-w-[425px] font-body" dir={dir}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary">{t.patientDetails.editPayment}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {permissions.canEditPayments && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t.modals.paymentDate}
                </label>
                <DatePickerIraq 
                  value={editPaymentDate}
                  onChange={(val) => setEditPaymentDate(val)}
                  data-testid="input-edit-payment-date"
                />
              </div>
            )}
            {(isAdmin || branchSession?.role === "branch_manager") && patient.isPhysiotherapy && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <Checkbox 
                  id="editFreeSessions"
                  checked={editPaymentFreeSessions}
                  onCheckedChange={(checked) => {
                    setEditPaymentFreeSessions(!!checked);
                    if (checked) {
                      setEditPaymentAmount("0");
                    }
                  }}
                  data-testid="checkbox-edit-free-sessions"
                />
                <Label htmlFor="editFreeSessions" className="text-sm font-medium cursor-pointer">
                  {t.modals.freeSessions}
                </Label>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.patientDetails.amountCurrency}</label>
              <MoneyInput
                className="text-left font-mono"
                placeholder={t.patientDetails.enterAmount}
                value={editPaymentAmount}
                onValueChange={(n) => setEditPaymentAmount(n ? String(n) : "")}
                readOnly={editPaymentFreeSessions}
                data-testid="input-edit-payment-amount"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.patientDetails.treatmentType}</label>
              <Select value={editPaymentTreatmentType} onValueChange={setEditPaymentTreatmentType}>
                <SelectTrigger data-testid="select-edit-pay-treatment-type">
                  <SelectValue placeholder={t.patientDetails.selectTreatmentType} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {translateTreatmentType(option.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {patient.isPhysiotherapy && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t.patientDetails.sessionCount}</label>
                <Input 
                  type="number" 
                  className="text-left font-mono" 
                  placeholder={t.patientDetails.enterSessionCount}
                  value={editPaymentSessionCount}
                  onChange={(e) => setEditPaymentSessionCount(e.target.value)}
                  data-testid="input-edit-payment-session-count"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.patientDetails.notes}</label>
              <Input
                className="text-right"
                placeholder={t.patientDetails.enterNotes}
                value={editPaymentNotes}
                onChange={(e) => setEditPaymentNotes(e.target.value)}
                data-testid="input-edit-payment-notes"
              />
            </div>
            {/* سببُ التصحيح — يظهر ويُلزَم فقط حين يمسّ الحفظُ حقلاً محمياً
                فعلاً (تحكّمُ تصحيح الدفعات، القسم ب). تعديلٌ للملاحظات أو
                عدد الجلسات وحدهما يبقى فورياً بلا هذا الحقل إطلاقاً. */}
            {paymentEditTouchesProtected && (
              <div className="space-y-2 rounded-lg border border-dashed border-amber-400/60 bg-amber-50 p-3">
                <label className="text-sm font-medium flex items-center gap-1">
                  سبب التصحيح <span className="text-red-500">*</span>
                </label>
                <Textarea
                  className="text-right bg-white"
                  placeholder="اكتب سبب تصحيح المبلغ/التاريخ/نوع العلاج/الجلسات المجانية"
                  value={editPaymentReason}
                  onChange={(e) => setEditPaymentReason(e.target.value)}
                  data-testid="input-edit-payment-reason"
                />
                <p className="text-xs text-muted-foreground">
                  {isAdmin
                    ? "تعديلٌ لبياناتٍ محمية — سيُطبَّق مباشرةً بصفتك المسؤول العام."
                    : "تعديلٌ لبياناتٍ محمية — سيُرسَل طلبُ تصحيحٍ إلى المسؤول العام للاعتماد، ولن تتغيّر الدفعة قبل ذلك."}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingPayment(null)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => {
                if (editingPayment) {
                  updatePaymentFull.mutate({
                    paymentId: editingPayment.id,
                    amount: editPaymentFreeSessions ? 0 : Number(editPaymentAmount),
                    notes: editPaymentNotes || null,
                    sessionCount: patient.isPhysiotherapy ? (editPaymentSessionCount ? Number(editPaymentSessionCount) : null) : null,
                    paymentTreatmentType: editPaymentTreatmentType || null,
                    customDate: editPaymentDate || undefined,
                    // بوليانٌ صريحٌ دائماً — `|| undefined` كان يُسقط
                    // `false` (حقيقةٌ لا غياب) فيبتلع الخادمُ الانتقال
                    // من مجّانيّ إلى غير مجّانيّ صامتاً (متابعةُ تحكّم
                    // تصحيح الدفعات، القسم ج، 2026-08-29).
                    isFreeSessions: editPaymentFreeSessions,
                    reason: paymentEditTouchesProtected ? editPaymentReason : undefined,
                  } as any);
                }
              }}
              disabled={
                updatePaymentFull.isPending || !editPaymentAmount
                || (paymentEditTouchesProtected && !editPaymentReason.trim())
              }
              data-testid="button-save-payment-edit"
            >
              {updatePaymentFull.isPending ? t.patientDetails.saving : t.patientDetails.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيدُ حذف دفعة — سببٌ إلزاميّ دائماً؛ حذفٌ مباشر للمسؤول العام،
          وطلبٌ معلَّق (٢٠٢) لغيره (تحكّمُ تصحيح الدفعات، القسم ب). */}
      <AlertDialog open={!!deletingPayment} onOpenChange={(open) => { if (!open) setDeletingPayment(null); }}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAdmin ? "حذف الدفعة؟" : "إرسال طلب حذف الدفعة؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin
                ? "سيُحذَف صفّ الدفعة فوراً ويُعكَس قيدُها المحاسبي. هذا حذفٌ مباشر بصفتك المسؤول العام."
                : "لن تُحذَف الدفعة الآن — سيُرسَل طلبٌ إلى المسؤول العام، ويبقى صفّ الدفعة كما هو حتى يُعتمد الطلب."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium flex items-center gap-1">
              سبب الحذف <span className="text-red-500">*</span>
            </label>
            <Textarea
              className="text-right"
              placeholder="اكتب سبب حذف هذه الدفعة"
              value={deletePaymentReason}
              onChange={(e) => setDeletePaymentReason(e.target.value)}
              data-testid="input-delete-payment-reason"
            />
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingPayment) {
                  deletePayment({ paymentId: deletingPayment.id, patientId: patient.id, reason: deletePaymentReason });
                  setDeletingPayment(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingPayment || !deletePaymentReason.trim()}
              data-testid="confirm-delete-payment"
            >
              {isAdmin ? "نعم، احذف" : "إرسال الطلب"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session-count correction — counts only, never money. */}
      <PhysioPlanDialog
        patient={patient ? { id: patient.id, name: patient.name, physioPlan: (patient as any).physioPlan } : null}
        open={editingPlan}
        onOpenChange={setEditingPlan}
      />
    </div>
  );
}
