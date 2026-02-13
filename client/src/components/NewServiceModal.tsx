import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface NewServiceModalProps {
  patientId: number;
  branchId: number;
  currentTotalCost: number;
}

const serviceTypes = [
  { value: "maintenance", label: "صيانة الطرف الصناعي" },
  { value: "additional_therapy", label: "جلسات علاج إضافية" },
  { value: "new_prosthetic", label: "طرف صناعي جديد" },
  { value: "adjustment", label: "تعديل أو ضبط" },
  { value: "consultation", label: "استشارة طبية" },
  { value: "other", label: "خدمة أخرى" },
];

const formSchema = z.object({
  serviceType: z.string().min(1, "اختر نوع الخدمة"),
  serviceCost: z.string().min(1, "أدخل تكلفة الخدمة"),
  initialPayment: z.string().optional(),
  sessionCount: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TREATMENT_TYPE_OPTIONS = [
  { value: "روبوت", label: "روبوت" },
  { value: "تمارين تأهيلية", label: "تمارين تأهيلية" },
  { value: "أجهزة علاج طبيعي", label: "أجهزة علاج طبيعي" },
];

export function NewServiceModal({ patientId, branchId, currentTotalCost }: NewServiceModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTreatmentType, setSelectedTreatmentType] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: { serviceType: string; serviceCost: number; initialPayment: number; notes?: string; paymentTreatmentType?: string | null; sessionCount?: number | null }) => {
      return apiRequest("POST", `/api/patients/${patientId}/new-service`, {
        ...data,
        branchId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, patientId] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({
        title: "تمت إضافة الخدمة بنجاح",
        description: "تم تحديث التكلفة الإجمالية وإضافة الزيارة والدفعة",
      });
      setOpen(false);
      form.reset();
      setSelectedTreatmentType("");
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل في إضافة الخدمة الجديدة",
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceType: "",
      serviceCost: "",
      initialPayment: "",
      sessionCount: "",
      notes: "",
    },
  });

  const serviceCostValue = Number(form.watch("serviceCost")) || 0;
  const selectedServiceType = form.watch("serviceType");
  const newTotal = currentTotalCost + serviceCostValue;

  function onSubmit(values: FormValues) {
    const serviceCost = Number(values.serviceCost) || 0;
    const initialPayment = Number(values.initialPayment) || 0;
    
    if (serviceCost <= 0) {
      toast({
        title: "خطأ",
        description: "تكلفة الخدمة يجب أن تكون أكبر من 0",
        variant: "destructive",
      });
      return;
    }
    
    const paymentTreatmentType = selectedTreatmentType || null;
    
    const sessionCount = values.sessionCount ? Number(values.sessionCount) : null;
    
    mutate({
      serviceType: values.serviceType,
      serviceCost,
      initialPayment,
      notes: values.notes,
      paymentTreatmentType,
      sessionCount,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" data-testid="button-new-service">
          <RefreshCcw className="w-4 h-4" />
          إضافة خدمة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] font-body" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">إضافة خدمة جديدة للمريض</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الخدمة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder="اختر نوع الخدمة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedServiceType === "additional_therapy" && (
              <div className="space-y-2">
                <FormLabel>نوع العلاج</FormLabel>
                <Select value={selectedTreatmentType} onValueChange={setSelectedTreatmentType}>
                  <SelectTrigger data-testid="select-service-treatment-type">
                    <SelectValue placeholder="اختر نوع العلاج" />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`option-service-treatment-${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <FormField
              control={form.control}
              name="serviceCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تكلفة الخدمة الجديدة (د.ع)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      {...field} 
                      className="text-left font-mono" 
                      placeholder="أدخل التكلفة" 
                      data-testid="input-service-cost"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>التكلفة الإجمالية الحالية:</span>
                <span className="font-mono">{currentTotalCost.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between font-semibold text-primary mt-1">
                <span>التكلفة الإجمالية الجديدة:</span>
                <span className="font-mono">{newTotal.toLocaleString()} د.ع</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="initialPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الدفعة الأولية (اختياري)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      {...field} 
                      className="text-left font-mono" 
                      placeholder="0" 
                      data-testid="input-initial-payment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sessionCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عدد الجلسات</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      {...field}
                      className="text-left font-mono" 
                      placeholder="أدخل عدد الجلسات" 
                      data-testid="input-service-session-count"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="مثال: صيانة دورية للطرف الأيمن..." 
                      className="resize-none"
                      data-testid="input-service-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold" 
              disabled={isPending}
              data-testid="button-submit-new-service"
            >
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                "إضافة الخدمة"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
