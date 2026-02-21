import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPaymentSchema } from "@shared/schema";
import { useAddPayment } from "@/hooks/use-patients";
import { useTranslation } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, Calendar, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useBranchSession } from "@/components/BranchGate";
import { z } from "zod";

interface PaymentModalProps {
  patientId: number;
  branchId: number;
  isPhysiotherapy?: boolean;
}

interface TreatmentEntry {
  treatmentType: string;
  sessionCount: number;
  cost: number;
}

const formSchema = insertPaymentSchema.extend({
  amount: z.coerce.number().min(0, "المبلغ يجب أن يكون 0 أو أكبر"),
  date: z.string().optional().nullable(),
  sessionCount: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    return Number(val);
  }, z.number().nullable().optional()),
});

function getTodayDate(): string {
  const today = new Date();
  const baghdadOffset = 3 * 60 * 60 * 1000;
  const baghdadNow = new Date(today.getTime() + baghdadOffset);
  const year = baghdadNow.getUTCFullYear();
  const month = String(baghdadNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(baghdadNow.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

export function PaymentModal({ patientId, branchId, isPhysiotherapy }: PaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [treatmentEntries, setTreatmentEntries] = useState<TreatmentEntry[]>([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
  const [manualCostOverride, setManualCostOverride] = useState(false);
  const { mutate, isPending } = useAddPayment();
  const { toast } = useToast();
  const { t } = useTranslation();
  const dir = t.dir;
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: patientId,
      branchId: branchId,
      amount: "" as any,
      notes: "",
      paymentTreatmentType: "",
      sessionCount: "" as any,
      date: getTodayDate(),
    },
  });

  useEffect(() => {
    if (isPhysiotherapy === false) return;
    if (manualCostOverride) return;

    const updatedEntries = treatmentEntries.map(entry => {
      if (!entry.treatmentType) return { ...entry, cost: 0 };
      const price = TREATMENT_PRICES[entry.treatmentType];
      if (price === undefined) return entry;
      if (entry.treatmentType === "استشارة طبية") {
        return { ...entry, sessionCount: 0, cost: 0 };
      }
      return { ...entry, cost: price * (entry.sessionCount || 0) };
    });

    const hasChanged = updatedEntries.some((e, i) => e.cost !== treatmentEntries[i].cost || e.sessionCount !== treatmentEntries[i].sessionCount);
    if (hasChanged) {
      setTreatmentEntries(updatedEntries);
    }

    const totalCost = updatedEntries.reduce((sum, e) => sum + e.cost, 0);
    form.setValue("amount", totalCost);

    const totalSessions = updatedEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0);
    form.setValue("sessionCount", totalSessions as any);

    const allTypes = updatedEntries.map(e => e.treatmentType).filter(Boolean).join("، ");
    form.setValue("paymentTreatmentType", allTypes);
  }, [treatmentEntries, isPhysiotherapy, form, manualCostOverride]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (isPhysiotherapy !== false) {
      const hasEmptyType = treatmentEntries.some(e => !e.treatmentType);
      if (hasEmptyType) {
        toast({
          title: t.modals.treatmentTypeRequired,
          variant: "destructive",
        });
        return;
      }
    }
    
    let submissionDate = values.date;
    if (submissionDate) {
      const now = new Date();
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadNow = new Date(now.getTime() + baghdadOffset);
      const hours = String(baghdadNow.getUTCHours()).padStart(2, '0');
      const minutes = String(baghdadNow.getUTCMinutes()).padStart(2, '0');
      const seconds = String(baghdadNow.getUTCSeconds()).padStart(2, '0');
      submissionDate = `${submissionDate}T${hours}:${minutes}:${seconds}`;
    }
    
    const validEntries = treatmentEntries.filter(e => e.treatmentType);
    const paymentTreatmentType = isPhysiotherapy !== false ? validEntries.map(e => e.treatmentType).filter(Boolean).join("، ") || null : null;
    const sessionCount = isPhysiotherapy !== false ? validEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0) || null : null;
    
    mutate({
      ...values,
      date: submissionDate,
      paymentTreatmentType,
      sessionCount,
      treatmentEntries: isPhysiotherapy !== false ? validEntries : undefined,
    } as any, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setTreatmentEntries([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
        setManualCostOverride(false);
      },
    });
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTreatmentEntries([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
      setManualCostOverride(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <PlusCircle className="w-4 h-4" />
          {t.modals.registerNewPayment}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] font-body" dir={dir}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">{t.modals.registerPayment}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t.modals.paymentDate}
                  </FormLabel>
                  <DatePickerIraq 
                    value={field.value || getTodayDate()}
                    onChange={field.onChange}
                    data-testid="input-payment-date"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPhysiotherapy !== false && (
              <div className="space-y-3">
                <FormLabel>{t.modals.treatmentType} <span className="text-red-500">*</span></FormLabel>
                {treatmentEntries.map((entry, index) => (
                  <div key={index} className="border border-border/60 rounded-lg p-3 space-y-3 bg-slate-50/50" data-testid={`payment-treatment-entry-${index}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-[140px]">
                        <Select
                          value={entry.treatmentType}
                          onValueChange={(val) => {
                            const updated = [...treatmentEntries];
                            updated[index] = { ...updated[index], treatmentType: val, sessionCount: val === "استشارة طبية" ? 0 : updated[index].sessionCount, cost: 0 };
                            setTreatmentEntries(updated);
                            setManualCostOverride(false);
                          }}
                        >
                          <SelectTrigger data-testid={`select-payment-treatment-type-${index}`}>
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
                        <div className="w-[80px]">
                          <Input 
                            type="number" 
                            className="text-left font-mono" 
                            placeholder={t.modals.sessionCount}
                            data-testid={`input-payment-session-count-${index}`}
                            value={entry.sessionCount || ""}
                            min={0}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              const updated = [...treatmentEntries];
                              updated[index] = { ...updated[index], sessionCount: val };
                              setTreatmentEntries(updated);
                            }}
                          />
                        </div>
                      )}

                      <div className="text-sm font-mono text-muted-foreground">
                        {entry.cost.toLocaleString()}
                      </div>

                      {treatmentEntries.length > 1 && isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTreatmentEntries(treatmentEntries.filter((_, i) => i !== index));
                            setManualCostOverride(false);
                          }}
                          data-testid={`button-remove-payment-treatment-${index}`}
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
                  data-testid="button-add-payment-treatment-entry"
                >
                  <Plus className="w-4 h-4" />
                  {t.modals.addTreatmentType}
                </Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.paidAmount}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      className={`text-left font-mono ${!isAdmin && isPhysiotherapy === true ? "bg-muted" : ""}`}
                      placeholder={t.modals.enterAmount}
                      data-testid="input-payment-amount"
                      readOnly={!isAdmin && isPhysiotherapy === true}
                      value={field.value === 0 ? "" : field.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? "" : Number(val));
                        if (isAdmin) {
                          setManualCostOverride(true);
                        }
                      }}
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
                  <FormLabel>{t.modals.notes}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder={t.modals.notesPlaceholder} data-testid="input-payment-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {t.modals.saving}
                </>
              ) : (
                t.modals.savePayment
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
