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
import { RefreshCcw, Loader2, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useBranchSession } from "@/components/BranchGate";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface NewServiceModalProps {
  patientId: number;
  branchId: number;
  currentTotalCost: number;
  isPhysiotherapy?: boolean;
}

interface TreatmentEntry {
  treatmentType: string;
  sessionCount: number;
  cost: number;
}

const formSchema = z.object({
  serviceType: z.string().min(1, "اختر نوع الخدمة"),
  serviceCost: z.string().min(1, "أدخل تكلفة الخدمة"),
  sessionCount: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TREATMENT_TYPE_OPTIONS = [
  { value: "استشارة طبية", labelKey: "medicalConsultation" as const },
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
  { value: "أبر صينية", labelKey: "acupuncture" as const },
];

const TREATMENT_PRICES: Record<string, number> = {
  "استشارة طبية": 0,
  "روبوت": 50000,
  "تمارين تأهيلية": 25000,
  "أجهزة علاج طبيعي": 25000,
  "أبر صينية": 25000,
};

export function NewServiceModal({ patientId, branchId, currentTotalCost, isPhysiotherapy }: NewServiceModalProps) {
  const [open, setOpen] = useState(false);
  const [treatmentEntries, setTreatmentEntries] = useState<TreatmentEntry[]>([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
  const [manualCostOverride, setManualCostOverride] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const dir = t.dir;
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;

  const serviceTypes = [
    { value: "maintenance", labelKey: "maintenanceLabel" as const },
    { value: "additional_therapy", labelKey: "additionalTherapyLabel" as const },
    { value: "new_prosthetic", labelKey: "newProstheticLabel" as const },
    { value: "adjustment", labelKey: "adjustmentLabel" as const },
    { value: "consultation", labelKey: "consultationLabel" as const },
    { value: "other", labelKey: "otherServiceLabel" as const },
  ];
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
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
      setTreatmentEntries([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
      setManualCostOverride(false);
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
      sessionCount: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!isPhysiotherapy) return;
    if (manualCostOverride) return;

    const updatedEntries = treatmentEntries.map(entry => {
      if (!entry.treatmentType) return { ...entry, cost: 0 };
      const price = TREATMENT_PRICES[entry.treatmentType];
      if (price === undefined) return entry;
      if (entry.treatmentType === "استشارة طبية") {
        return { ...entry, sessionCount: 1, cost: 0 };
      }
      return { ...entry, cost: price * (entry.sessionCount || 0) };
    });

    const hasChanged = updatedEntries.some((e, i) => e.cost !== treatmentEntries[i].cost || e.sessionCount !== treatmentEntries[i].sessionCount);
    if (hasChanged) {
      setTreatmentEntries(updatedEntries);
    }

    const totalCost = updatedEntries.reduce((sum, e) => sum + e.cost, 0);
    form.setValue("serviceCost", String(totalCost));

    const totalSessions = updatedEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0);
    form.setValue("sessionCount", String(totalSessions));
  }, [treatmentEntries, isPhysiotherapy, form, manualCostOverride]);

  const serviceCostValue = Number(form.watch("serviceCost")) || 0;
  const newTotal = currentTotalCost + serviceCostValue;

  function onSubmit(values: FormValues) {
    const serviceCost = Number(values.serviceCost) || 0;
    
    const validEntries = treatmentEntries.filter(e => e.treatmentType);
    const hasMedicalConsultationOnly = isPhysiotherapy !== false && validEntries.length === 1 && validEntries[0].treatmentType === "استشارة طبية";
    if (!hasMedicalConsultationOnly && serviceCost <= 0) {
      toast({
        title: t.modals.costError,
        description: t.modals.costErrorDesc,
        variant: "destructive",
      });
      return;
    }
    
    mutate({
      serviceType: values.serviceType,
      serviceCost,
      initialPayment: 0,
      notes: values.notes,
      treatmentEntries: isPhysiotherapy !== false ? validEntries : undefined,
      paymentTreatmentType: isPhysiotherapy !== false ? validEntries.map(e => e.treatmentType).filter(Boolean).join("، ") : null,
      sessionCount: isPhysiotherapy !== false ? validEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0) : null,
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
              <div className="space-y-3">
                <FormLabel>{t.modals.treatmentType}</FormLabel>
                {treatmentEntries.map((entry, index) => (
                  <div key={index} className="border border-border/60 rounded-lg p-3 space-y-3 bg-slate-50/50" data-testid={`service-treatment-entry-${index}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-[160px]">
                        <Select
                          value={entry.treatmentType}
                          onValueChange={(val) => {
                            const updated = [...treatmentEntries];
                            updated[index] = { ...updated[index], treatmentType: val, sessionCount: val === "استشارة طبية" ? 1 : updated[index].sessionCount, cost: 0 };
                            setTreatmentEntries(updated);
                            setManualCostOverride(false);
                          }}
                        >
                          <SelectTrigger data-testid={`select-service-treatment-type-${index}`}>
                            <SelectValue placeholder={t.modals.selectTreatmentType} />
                          </SelectTrigger>
                          <SelectContent>
                            {TREATMENT_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {t.modals[option.labelKey]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {entry.treatmentType && entry.treatmentType !== "استشارة طبية" && (
                        <div className="w-[90px]">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={entry.sessionCount || ""}
                            onChange={(e) => {
                              const updated = [...treatmentEntries];
                              updated[index] = { ...updated[index], sessionCount: Number(e.target.value) || 0 };
                              setTreatmentEntries(updated);
                            }}
                            className="text-left font-mono"
                            placeholder={t.modals.sessionCount}
                            data-testid={`input-service-session-count-${index}`}
                          />
                        </div>
                      )}

                      <div className="text-sm font-mono text-muted-foreground">
                        {entry.cost.toLocaleString()}
                      </div>

                      {treatmentEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTreatmentEntries(treatmentEntries.filter((_, i) => i !== index));
                            setManualCostOverride(false);
                          }}
                          data-testid={`button-remove-service-treatment-${index}`}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTreatmentEntries([...treatmentEntries, { treatmentType: "", sessionCount: 0, cost: 0 }])}
                  className="gap-2"
                  data-testid="button-add-service-treatment-entry"
                >
                  <Plus className="w-4 h-4" />
                  {t.modals.addTreatmentType}
                </Button>
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
                      readOnly={!isAdmin}
                      className={`text-left font-mono ${!isAdmin ? "bg-muted" : ""}`}
                      placeholder={t.modals.enterCost}
                      data-testid="input-service-cost"
                      onChange={(e) => {
                        field.onChange(e);
                        if (isAdmin) setManualCostOverride(true);
                      }}
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
