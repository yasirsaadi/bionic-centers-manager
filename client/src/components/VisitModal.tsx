import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVisitSchema, InsertVisit } from "@shared/schema";
import { useAddVisit } from "@/hooks/use-patients";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useBranchSession } from "@/components/BranchGate";
import { z } from "zod";

interface VisitModalProps {
  patientId: number;
  branchId: number;
  isPhysiotherapy?: boolean;
}

const TREATMENT_TYPE_OPTIONS = [
  { value: "استشارة طبية", labelKey: "medicalConsultation" as const },
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
];

const TREATMENT_PRICES: Record<string, number> = {
  "استشارة طبية": 0,
  "روبوت": 50000,
  "تمارين تأهيلية": 25000,
  "أجهزة علاج طبيعي": 25000,
};

const formSchema = insertVisitSchema.extend({
  treatmentType: z.string().optional().nullable(),
  customDate: z.string().optional().nullable(),
  sessionCount: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    return Number(val);
  }, z.number().nullable().optional()),
  visitCost: z.coerce.number().optional().nullable(),
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

export function VisitModal({ patientId, branchId, isPhysiotherapy }: VisitModalProps) {
  const [open, setOpen] = useState(false);
  const [manualCostOverride, setManualCostOverride] = useState(false);
  const { mutate, isPending } = useAddVisit();
  const { t } = useTranslation();
  const dir = t.dir;
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: patientId,
      branchId: branchId,
      notes: "",
      treatmentType: "",
      customDate: getTodayDate(),
      sessionCount: "" as any,
      visitCost: 0,
    },
  });

  const watchTreatmentType = form.watch("treatmentType");
  const watchSessionCount = form.watch("sessionCount");

  useEffect(() => {
    setManualCostOverride(false);
  }, [watchTreatmentType]);

  useEffect(() => {
    if (!watchTreatmentType) return;
    if (manualCostOverride) return;
    if (watchTreatmentType === "استشارة طبية") {
      form.setValue("sessionCount", 1);
      form.setValue("visitCost", 0);
    } else {
      const price = TREATMENT_PRICES[watchTreatmentType] || 0;
      const count = typeof watchSessionCount === "number" ? watchSessionCount : 0;
      form.setValue("visitCost", price * count);
    }
  }, [watchTreatmentType, watchSessionCount, form, manualCostOverride]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const submitData: any = {
      ...values,
      treatmentType: isPhysiotherapy !== false ? (values.treatmentType || null) : null,
      customDate: values.customDate || null,
      sessionCount: values.sessionCount || null,
    };
    delete submitData.visitCost;
    mutate(submitData, {
      onSuccess: () => {
        setOpen(false);
        setManualCostOverride(false);
        form.reset({
          patientId: patientId,
          branchId: branchId,
          notes: "",
          treatmentType: "",
          customDate: getTodayDate(),
          sessionCount: "" as any,
          visitCost: 0,
        });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" data-testid="button-add-visit">
          <PlusCircle className="w-4 h-4" />
          {t.modals.registerNewVisit}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] font-body" dir={dir}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-blue-600">{t.modals.visitReason}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="customDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t.modals.visitDate}
                  </FormLabel>
                  <DatePickerIraq 
                    value={field.value || ""}
                    onChange={field.onChange}
                    data-testid="input-visit-date"
                  />
                  <p className="text-xs text-muted-foreground">{t.modals.visitDateNote}</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.visitReason}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""}
                      placeholder={t.modals.visitReasonPlaceholder}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPhysiotherapy !== false && (
              <FormField
                control={form.control}
                name="treatmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.modals.treatmentType}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="border border-slate-300 bg-slate-100" data-testid="select-treatment-type">
                          <SelectValue placeholder={t.modals.selectTreatmentType} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TREATMENT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t.modals[opt.labelKey]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isPhysiotherapy !== false && watchTreatmentType && watchTreatmentType !== "استشارة طبية" && watchTreatmentType !== "" && (
              <FormField
                control={form.control}
                name="sessionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.modals.sessionCount}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder={t.modals.enterSessionCount}
                        value={field.value === null || field.value === undefined ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        data-testid="input-session-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isPhysiotherapy !== false && watchTreatmentType && (
              <FormField
                control={form.control}
                name="visitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.estimatedCost}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        readOnly={!isAdmin}
                        className={!isAdmin ? "bg-muted" : ""}
                        value={field.value ?? 0}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value) || 0);
                          if (isAdmin) setManualCostOverride(true);
                        }}
                        data-testid="input-visit-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {t.modals.savingVisit}
                </>
              ) : (
                t.modals.saveVisit
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
