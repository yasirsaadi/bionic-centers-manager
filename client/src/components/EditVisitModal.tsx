import { useForm } from "react-hook-form";
import { useUpdateVisit } from "@/hooks/use-patients";
import { useTranslation } from "@/i18n/LanguageContext";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Calendar } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

interface EditVisitModalProps {
  visit: {
    id: number;
    details: string | null;
    notes: string | null;
    treatmentType: string | null;
    sessionCount: number | null;
    cost: number | null;
    visitDate: string | null;
  };
  patientId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

const formSchema = z.object({
  details: z.string().optional(),
  notes: z.string().optional(),
  treatmentType: z.string().optional(),
  sessionCount: z.number().nullable().optional(),
  cost: z.number().nullable().optional(),
  customDate: z.string().optional(),
});

const TREATMENT_TYPE_OPTIONS = [
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
];

export function EditVisitModal({ visit, patientId, open, onOpenChange, isAdmin }: EditVisitModalProps) {
  const { mutate, isPending } = useUpdateVisit();
  const { t } = useTranslation();
  const dir = t.dir;

  const getVisitDateFormatted = () => {
    if (visit.visitDate) {
      return dayjs.utc(visit.visitDate).tz('Asia/Baghdad').format('YYYY-MM-DD');
    }
    return "";
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: visit.details || "",
      notes: visit.notes || "",
      treatmentType: visit.treatmentType || "",
      sessionCount: visit.sessionCount || undefined,
      cost: visit.cost || undefined,
      customDate: getVisitDateFormatted(),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        details: visit.details || "",
        notes: visit.notes || "",
        treatmentType: visit.treatmentType || "",
        sessionCount: visit.sessionCount || undefined,
        cost: visit.cost || undefined,
        customDate: getVisitDateFormatted(),
      });
    }
  }, [open, visit, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate({
      visitId: visit.id,
      patientId: patientId,
      details: values.details || "",
      notes: values.notes || "",
      treatmentType: values.treatmentType || null,
      sessionCount: values.sessionCount || null,
      cost: values.cost || null,
      customDate: values.customDate || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] font-body" dir={dir}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-blue-600">{t.modals.editVisit}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {isAdmin && (
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
                      data-testid="input-edit-visit-date"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.visitDetails}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""}
                      placeholder={t.modals.visitDetailsPlaceholder}
                      className="min-h-[100px]"
                      data-testid="input-edit-visit-details"
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
                  <FormLabel>{t.modals.additionalNotes}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder={t.modals.additionalNotesPlaceholder} data-testid="input-edit-visit-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="treatmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.treatmentTypeOptional}</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-visit-treatment-type">
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

            <FormField
              control={form.control}
              name="sessionCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.sessionCountOptional}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="number" 
                      placeholder={t.modals.sessionCountPlaceholder}
                      value={field.value === null || field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                      data-testid="input-edit-visit-session-count"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {visit.cost ? (
              <FormItem>
                <FormLabel>{t.modals.cost}</FormLabel>
                <Input 
                  type="number" 
                  value={visit.cost}
                  disabled
                  className="bg-slate-100"
                  data-testid="input-edit-visit-cost"
                />
                <p className="text-xs text-muted-foreground">{t.modals.costNotEditable}</p>
              </FormItem>
            ) : null}

            <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isPending} data-testid="button-save-visit-edit">
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {t.modals.savingChanges}
                </>
              ) : (
                t.modals.saveChanges
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
