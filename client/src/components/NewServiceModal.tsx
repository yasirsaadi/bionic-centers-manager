import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { useTranslation } from "@/i18n/LanguageContext";
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
  isPhysiotherapy?: boolean;
}

const formSchema = z.object({
  serviceType: z.string().min(1, "اختر نوع الخدمة"),
  serviceCost: z.string().min(1, "أدخل تكلفة الخدمة"),
  initialPayment: z.string().optional(),
  sessionCount: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TREATMENT_TYPE_OPTIONS = [
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
];

export function NewServiceModal({ patientId, branchId, currentTotalCost, isPhysiotherapy }: NewServiceModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTreatmentType, setSelectedTreatmentType] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const dir = t.dir;

  const serviceTypes = [
    { value: "maintenance", labelKey: "maintenanceLabel" as const },
    { value: "additional_therapy", labelKey: "additionalTherapyLabel" as const },
    { value: "new_prosthetic", labelKey: "newProstheticLabel" as const },
    { value: "adjustment", labelKey: "adjustmentLabel" as const },
    { value: "consultation", labelKey: "consultationLabel" as const },
    { value: "other", labelKey: "otherServiceLabel" as const },
  ];
  
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
        title: t.modals.serviceAddedSuccess,
        description: t.modals.serviceAddedDesc,
      });
      setOpen(false);
      form.reset();
      setSelectedTreatmentType("");
    },
    onError: () => {
      toast({
        title: t.modals.serviceAddError,
        description: t.modals.serviceAddErrorDesc,
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
        title: t.modals.costError,
        description: t.modals.costErrorDesc,
        variant: "destructive",
      });
      return;
    }
    
    const paymentTreatmentType = isPhysiotherapy !== false ? (selectedTreatmentType || null) : null;
    
    const sessionCount = isPhysiotherapy !== false ? (values.sessionCount ? Number(values.sessionCount) : null) : null;
    
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
          {t.modals.addNewService}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] font-body" dir={dir}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">{t.modals.addNewServiceForPatient}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.serviceType}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder={t.modals.selectServiceType} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t.modals[type.labelKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPhysiotherapy !== false && (
              <div className="space-y-2">
                <FormLabel>{t.modals.treatmentType}</FormLabel>
                <Select value={selectedTreatmentType} onValueChange={setSelectedTreatmentType}>
                  <SelectTrigger data-testid="select-service-treatment-type">
                    <SelectValue placeholder={t.modals.selectTreatmentType} />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`option-service-treatment-${option.value}`}>
                        {t.modals[option.labelKey]}
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
                  <FormLabel>{t.modals.serviceCost}</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      {...field} 
                      className="text-left font-mono" 
                      placeholder={t.modals.enterCost}
                      data-testid="input-service-cost"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span>{t.modals.currentTotalCost}</span>
                <span className="font-mono">{currentTotalCost.toLocaleString()} {t.patientDetails.currency}</span>
              </div>
              <div className="flex justify-between gap-2 font-semibold text-primary mt-1">
                <span>{t.modals.newTotalCost}</span>
                <span className="font-mono">{newTotal.toLocaleString()} {t.patientDetails.currency}</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="initialPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.initialPayment}</FormLabel>
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

            {isPhysiotherapy !== false && (
              <FormField
                control={form.control}
                name="sessionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.modals.sessionCount}</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        inputMode="numeric"
                        {...field}
                        className="text-left font-mono" 
                        placeholder={t.modals.enterSessionCount}
                        data-testid="input-service-session-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.additionalNotesOptional}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={t.modals.additionalNotesServicePlaceholder}
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
                  {t.modals.adding}
                </>
              ) : (
                t.modals.addService
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
