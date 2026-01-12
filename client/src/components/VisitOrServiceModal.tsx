import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAddVisit } from "@/hooks/use-patients";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Loader2, Activity, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface VisitOrServiceModalProps {
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

const visitFormSchema = z.object({
  details: z.string().min(1, "أدخل تفاصيل الزيارة"),
  notes: z.string().optional(),
});

const serviceFormSchema = z.object({
  serviceType: z.string().min(1, "اختر نوع الخدمة"),
  serviceCost: z.coerce.number().min(1, "تكلفة الخدمة يجب أن تكون أكبر من 0"),
  initialPayment: z.coerce.number().min(0, "الدفعة لا يمكن أن تكون سالبة"),
  notes: z.string().optional(),
});

type VisitFormValues = z.infer<typeof visitFormSchema>;
type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export function VisitOrServiceModal({ patientId, branchId, currentTotalCost }: VisitOrServiceModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"visit" | "service">("visit");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: addVisit, isPending: isAddingVisit } = useAddVisit();
  
  const { mutate: addService, isPending: isAddingService } = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
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
      serviceForm.reset();
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل في إضافة الخدمة الجديدة",
        variant: "destructive",
      });
    },
  });

  const visitForm = useForm<VisitFormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      details: "",
      notes: "",
    },
  });

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceType: "",
      serviceCost: 0,
      initialPayment: 0,
      notes: "",
    },
  });

  const serviceCost = serviceForm.watch("serviceCost") || 0;
  const newTotal = currentTotalCost + serviceCost;

  function onVisitSubmit(values: VisitFormValues) {
    addVisit({
      patientId,
      branchId,
      details: values.details,
      notes: values.notes || "",
    }, {
      onSuccess: () => {
        setOpen(false);
        visitForm.reset();
      },
    });
  }

  function onServiceSubmit(values: ServiceFormValues) {
    addService(values);
  }

  const handleModeChange = (value: string) => {
    setMode(value as "visit" | "service");
  };

  const isPending = isAddingVisit || isAddingService;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" data-testid="button-log-visit-or-service">
          <PlusCircle className="w-4 h-4" />
          تسجيل زيارة / خدمة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] font-body" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">
            {mode === "visit" ? "تسجيل زيارة" : "إضافة خدمة جديدة"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={mode} onValueChange={handleModeChange} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visit" className="gap-2" data-testid="tab-visit">
              <Activity className="w-4 h-4" />
              تسجيل زيارة
            </TabsTrigger>
            <TabsTrigger value="service" className="gap-2" data-testid="tab-service">
              <RefreshCcw className="w-4 h-4" />
              إضافة خدمة
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "visit" ? (
          <Form {...visitForm}>
            <form onSubmit={visitForm.handleSubmit(onVisitSubmit)} className="space-y-5 mt-4">
              <FormField
                control={visitForm.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تفاصيل الزيارة</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        value={field.value || ""}
                        placeholder="ما تم خلال الزيارة: فحص، قياسات، تعديلات..."
                        className="min-h-[100px]"
                        data-testid="input-visit-details"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={visitForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="أي ملاحظات أخرى..." 
                        data-testid="input-visit-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" 
                disabled={isPending}
                data-testid="button-submit-visit"
              >
                {isAddingVisit ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري التسجيل...
                  </>
                ) : (
                  "حفظ الزيارة"
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-5 mt-4">
              <FormField
                control={serviceForm.control}
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

              <FormField
                control={serviceForm.control}
                name="serviceCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تكلفة الخدمة الجديدة (د.ع)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        className="text-left font-mono" 
                        placeholder="0" 
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
                control={serviceForm.control}
                name="initialPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدفعة الأولية (اختياري)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
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
                control={serviceForm.control}
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
                {isAddingService ? (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
