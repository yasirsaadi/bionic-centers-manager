import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { InsertPatient, InsertPayment, InsertVisit } from "@shared/schema";

// Helper to get branch session from sessionStorage
function getBranchSession() {
  const stored = sessionStorage.getItem("branch_session");
  if (stored) {
    try {
      return JSON.parse(stored) as { branchId: number; branchName: string; isAdmin: boolean };
    } catch {
      return null;
    }
  }
  return null;
}

// Helper to calculate financials client-side for lists if needed, 
// though typically backend would aggregate this.
export type PatientWithDetails = {
  id: number;
  name: string;
  age: number;
  medicalCondition: string;
  totalCost: number;
  payments?: { amount: number }[];
  documents?: any[];
  // ... other fields
};

// GET /api/patients
export function usePatients() {
  return useQuery({
    queryKey: [api.patients.list.path],
    queryFn: async () => {
      const branchSession = getBranchSession();
      const res = await fetch(api.patients.list.path, { 
        credentials: "include",
        headers: branchSession ? { "X-Branch-Id": String(branchSession.branchId) } : {},
      });
      if (!res.ok) throw new Error("فشل في جلب بيانات المرضى");
      const patients = api.patients.list.responses[200].parse(await res.json());
      
      // Filter by branch on client side if not admin
      if (branchSession && !branchSession.isAdmin && branchSession.branchId > 0) {
        return patients.filter(p => p.branchId === branchSession.branchId);
      }
      return patients;
    },
  });
}

// GET /api/patients/:id
export function usePatient(id: number) {
  return useQuery({
    queryKey: [api.patients.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.patients.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("فشل في جلب تفاصيل المريض");
      return api.patients.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/patients
export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertPatient) => {
      const res = await fetch(api.patients.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "فشل في إضافة المريض");
      }
      return api.patients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({
        title: "تمت العملية بنجاح",
        description: "تم إضافة ملف المريض الجديد",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// POST /api/payments
export function useAddPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertPayment) => {
      const res = await fetch(api.payments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("فشل في تسجيل الدفعة");
      return api.payments.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      // Invalidate specific patient query to refresh stats
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, variables.patientId] });
      toast({
        title: "تم تسجيل الدفعة",
        description: "تم تحديث الرصيد المالي للمريض",
      });
    },
  });
}

// POST /api/documents (Upload)
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ patientId, formData }: { patientId: number, formData: FormData }) => {
      formData.append("patientId", patientId.toString());

      const res = await fetch(api.documents.create.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) throw new Error("فشل في رفع المستند");
      return api.documents.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, variables.patientId] });
      toast({
        title: "تم رفع المستند",
        description: "تمت إضافة الملف إلى سجل المريض",
      });
    },
  });
}

// PUT /api/patients/:id
export function useUpdatePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPatient> }) => {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "فشل في تحديث بيانات المريض");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, variables.id] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث بيانات المريض بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// DELETE /api/patients/:id
export function useDeletePatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/patients/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("فشل في حذف المريض");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({
        title: "تم الحذف",
        description: "تم حذف ملف المريض بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// POST /api/visits
export function useAddVisit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertVisit) => {
      const res = await fetch(api.visits.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("فشل في تسجيل الزيارة");
      return api.visits.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, variables.patientId] });
      toast({
        title: "تم تسجيل الزيارة",
        description: "تمت إضافة الزيارة إلى سجل المريض",
      });
    },
  });
}
