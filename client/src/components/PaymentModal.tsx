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
import { MoneyInput } from "@/components/ui/money-input";
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
  // When the patient also carries these case types, offer them in the
  // treatment-type dropdown so a returning patient paying a prosthetics /
  // medical-support balance is tagged to the right case.
  isAmputee?: boolean;
  isMedicalSupport?: boolean;
}

interface TreatmentEntry {
  treatmentType: string;
  sessionCount: number;
  cost: number;
  isFree?: boolean;
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

const TREATMENT_TYPE_OPTIONS: { value: string; labelKey?: string; label?: string }[] = [
  { value: "استشارة طبية", labelKey: "medicalConsultation" as const },
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
  { value: "أبر صينية", labelKey: "acupuncture" as const },
];

// Prosthetics / medical-support payment types: a single balance, entered
// manually, with NO per-session pricing or session count.
const AMPUTEE_TYPE = { value: "أطراف صناعية", label: "أطراف صناعية" };
const SUPPORT_TYPE = { value: "مساند طبية", label: "مساند طبية" };
// Types that take a MANUAL amount (no auto pricing) and have no sessions.
const MANUAL_AMOUNT_TYPES = new Set<string>([AMPUTEE_TYPE.value, SUPPORT_TYPE.value]);
// Types with no session-count input at all.
const NON_SESSION_TYPES = new Set<string>(["استشارة طبية", AMPUTEE_TYPE.value, SUPPORT_TYPE.value]);

const TREATMENT_PRICES: Record<string, number> = {
  "استشارة طبية": 0,
  "روبوت": 50000,
  "تمارين تأهيلية": 25000,
  "أجهزة علاج طبيعي": 25000,
  "أبر صينية": 25000,
};

export function PaymentModal({ patientId, branchId, isPhysiotherapy, isAmputee, isMedicalSupport }: PaymentModalProps) {
  const [open, setOpen] = useState(false);

  // Physio types (from i18n) plus أطراف/مساند when the patient carries those
  // case types — so a returning patient can pay a prosthetics/support balance
  // and have it tagged correctly.
  const treatmentOptions = [
    // Physio types only for physiotherapy patients.
    ...(isPhysiotherapy !== false ? TREATMENT_TYPE_OPTIONS : []),
    // أطراف / مساند are ALWAYS offered (owner's choice): a returning patient
    // may pay a prosthetics/support balance regardless of which case flags are
    // currently set on their record, so the staff can always tag it correctly.
    AMPUTEE_TYPE,
    SUPPORT_TYPE,
  ];
  // With أطراف/مساند always present, the treatment-type picker always shows and
  // a type is required on every payment (keeps every payment tagged).
  const showTreatmentSection = treatmentOptions.length > 0;
  const [treatmentEntries, setTreatmentEntries] = useState<TreatmentEntry[]>([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
  const [manualCostOverride, setManualCostOverride] = useState(false);
  const { mutate, isPending } = useAddPayment();
  const { toast } = useToast();
  const { t } = useTranslation();
  const dir = t.dir;
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  const canEnterZeroSessions = isAdmin || branchSession?.role === "branch_manager";
  
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
    if (!showTreatmentSection) return;
    if (manualCostOverride) return;

    const updatedEntries = treatmentEntries.map(entry => {
      if (!entry.treatmentType) return { ...entry, cost: 0 };
      // أطراف / مساند: manual amount, no sessions — leave the cost alone.
      if (MANUAL_AMOUNT_TYPES.has(entry.treatmentType)) return { ...entry, sessionCount: 0 };
      const price = TREATMENT_PRICES[entry.treatmentType];
      if (price === undefined) return entry;
      if (entry.treatmentType === "استشارة طبية") {
        return { ...entry, sessionCount: 0, cost: 0 };
      }
      if (entry.isFree) {
        return { ...entry, cost: 0 };
      }
      return { ...entry, cost: price * (entry.sessionCount || 0) };
    });

    const hasChanged = updatedEntries.some((e, i) => e.cost !== treatmentEntries[i].cost || e.sessionCount !== treatmentEntries[i].sessionCount);
    if (hasChanged) {
      setTreatmentEntries(updatedEntries);
    }

    const allTypes = updatedEntries.map(e => e.treatmentType).filter(Boolean).join("، ");
    form.setValue("paymentTreatmentType", allTypes);

    // For a prosthetics / medical-support balance the staff types the amount
    // themselves; never auto-compute or zero it out. No sessions either.
    const hasManualType = updatedEntries.some(e => MANUAL_AMOUNT_TYPES.has(e.treatmentType));
    if (hasManualType) {
      form.setValue("sessionCount", 0 as any);
      return;
    }

    const totalCost = updatedEntries.filter(e => !e.isFree).reduce((sum, e) => sum + e.cost, 0);
    form.setValue("amount", totalCost);

    const totalSessions = updatedEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0);
    form.setValue("sessionCount", totalSessions as any);
  }, [treatmentEntries, isPhysiotherapy, form, manualCostOverride]);

  // Whether any selected entry is a manual-amount (أطراف/مساند) type — used to
  // keep the amount field editable and hide session inputs.
  const hasManualType = treatmentEntries.some(e => MANUAL_AMOUNT_TYPES.has(e.treatmentType));

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (showTreatmentSection) {
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
    const paymentTreatmentType = showTreatmentSection ? validEntries.map(e => e.treatmentType).filter(Boolean).join("، ") || null : null;
    const sessionCount = showTreatmentSection ? validEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0) || null : null;

    // أطراف/مساند بمبلغ يدوي: كلفة الإدخال = 0 والمبلغ الحقيقي في `amount`.
    // نُرسله كدفعة واحدة (بدون treatmentEntries) فيأخذ الخادم المبلغ اليدوي
    // مباشرة مع وسم النوع — بدل حلقة الإدخالات التي تتجاهل المبلغ اليدوي.
    const sendEntries = showTreatmentSection && !hasManualType;

    mutate({
      ...values,
      date: submissionDate,
      paymentTreatmentType,
      sessionCount,
      treatmentEntries: sendEntries ? validEntries : undefined,
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

            {showTreatmentSection && (
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
                            updated[index] = { ...updated[index], treatmentType: val, sessionCount: NON_SESSION_TYPES.has(val) ? 0 : updated[index].sessionCount, cost: 0 };
                            setTreatmentEntries(updated);
                            // Manual types (أطراف/مساند): fully hand the amount to
                            // the staff — the auto-pricing effect backs off entirely
                            // so it can never zero/overwrite the typed amount. The
                            // type tag is still computed at submit from the entries.
                            // Physio types resume auto-pricing (override = false).
                            setManualCostOverride(MANUAL_AMOUNT_TYPES.has(val));
                          }}
                        >
                          <SelectTrigger data-testid={`select-payment-treatment-type-${index}`}>
                            <SelectValue placeholder={t.modals.selectTreatmentType} />
                          </SelectTrigger>
                          <SelectContent>
                            {treatmentOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {(option as any).label ?? (t.modals as any)[(option as any).labelKey]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {entry.isFree && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {t.modals.freeSessions}
                        </span>
                      )}

                      {entry.treatmentType && !NON_SESSION_TYPES.has(entry.treatmentType) && (
                        <div className="w-[80px]">
                          <Input
                            type="number"
                            className="text-left font-mono" 
                            placeholder={t.modals.sessionCount}
                            data-testid={`input-payment-session-count-${index}`}
                            value={entry.sessionCount === 0 ? "0" : entry.sessionCount || ""}
                            min={entry.isFree || canEnterZeroSessions ? 0 : 1}
                            onChange={(e) => {
                              const minVal = entry.isFree || canEnterZeroSessions ? 0 : 1;
                              const val = Math.max(minVal, Number(e.target.value) || 0);
                              const updated = [...treatmentEntries];
                              updated[index] = { ...updated[index], sessionCount: val };
                              setTreatmentEntries(updated);
                            }}
                          />
                        </div>
                      )}

                      {!entry.isFree && !MANUAL_AMOUNT_TYPES.has(entry.treatmentType) && (
                        <div className="text-sm font-mono text-muted-foreground">
                          {entry.cost.toLocaleString()}
                        </div>
                      )}

                      {treatmentEntries.length > 1 && (isAdmin || entry.isFree) && (
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
                <div className="flex flex-wrap gap-2">
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
                  {canEnterZeroSessions && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTreatmentEntries([...treatmentEntries, { treatmentType: "", sessionCount: 0, cost: 0, isFree: true }])}
                      className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                      data-testid="button-add-free-treatment-entry"
                    >
                      <Plus className="w-4 h-4" />
                      {t.modals.addFreeSessions}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.paidAmount}</FormLabel>
                  <FormControl>
                    <MoneyInput
                      className={`${!isAdmin && isPhysiotherapy === true && !hasManualType ? "bg-muted" : ""}`}
                      placeholder={t.modals.enterAmount}
                      data-testid="input-payment-amount"
                      readOnly={!isAdmin && isPhysiotherapy === true && !hasManualType}
                      value={field.value === 0 ? "" : field.value}
                      onValueChange={(n) => {
                        field.onChange(n);
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
                    <Input {...field} value={field.value || ""} placeholder={t.modals.notesPlaceholder} dir="auto" style={{ unicodeBidi: "plaintext" }} data-testid="input-payment-notes" />
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
