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
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, Calendar, Wrench } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface VisitModalProps {
  patientId: number;
  branchId: number;
  isPhysiotherapy?: boolean;
  // A prosthetic/support patient can come for MAINTENANCE of their device;
  // these enable the "غرض الزيارة: صيانة" path (expert + delivery date).
  isAmputee?: boolean;
  isMedicalSupport?: boolean;
}

const TREATMENT_TYPE_OPTIONS = [
  { value: "استشارة طبية", labelKey: "medicalConsultation" as const },
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
  { value: "أبر صينية", labelKey: "acupuncture" as const },
];

const formSchema = insertVisitSchema.extend({
  treatmentType: z.string().optional().nullable(),
  customDate: z.string().optional().nullable(),
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

export function VisitModal({ patientId, branchId, isPhysiotherapy, isAmputee, isMedicalSupport }: VisitModalProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useAddVisit();
  const { t } = useTranslation();
  const { toast } = useToast();
  const dir = t.dir;

  // Maintenance path — only offered to patients who own a device.
  const hasDevice = !!isAmputee || !!isMedicalSupport;
  const [purpose, setPurpose] = useState<"visit" | "maintenance">("visit");
  const [expertUserId, setExpertUserId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [maintPending, setMaintPending] = useState(false);

  const { data: experts = [] } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", branchId],
    enabled: open && purpose === "maintenance" && hasDevice,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: patientId,
      branchId: branchId,
      notes: "",
      treatmentType: "",
      customDate: getTodayDate(),
    },
  });

  const resetAll = () => {
    setPurpose("visit"); setExpertUserId(""); setExpectedDeliveryDate("");
    form.reset({ patientId, branchId, notes: "", treatmentType: "", customDate: getTodayDate() });
  };

  // Maintenance: create a NEW work order (purpose=maintenance) with an expert +
  // delivery date, then log the visit row so the patient's timeline shows they
  // came for صيانة. The work order goes first — if the patient still has an
  // active build (409), we abort BEFORE writing a visit.
  async function submitMaintenance(values: z.infer<typeof formSchema>) {
    if (!expertUserId) { toast({ title: "اختر الخبير المسؤول عن الصيانة", variant: "destructive" }); return; }
    if (!expectedDeliveryDate) { toast({ title: "تاريخ التسليم المتوقع إلزامي", variant: "destructive" }); return; }
    setMaintPending(true);
    try {
      const res = await fetch("/api/manufacturing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientId, expertUserId: Number(expertUserId), expectedDeliveryDate, purpose: "maintenance" }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast({ title: "تعذّر فتح الصيانة", description: e.error || "خطأ", variant: "destructive" });
        setMaintPending(false);
        return;
      }
      // Work order created — now record the visit row (reason defaults to صيانة).
      mutate({
        patientId, branchId,
        notes: values.notes?.trim() || "صيانة طرف/مسند",
        treatmentType: null,
        customDate: values.customDate || null,
      } as any, {
        onSuccess: () => {
          toast({ title: "تم فتح أمر الصيانة وتسجيل الزيارة" });
          setMaintPending(false); setOpen(false); resetAll();
        },
        onError: () => { setMaintPending(false); },
      });
    } catch {
      toast({ title: "تعذّر فتح الصيانة", variant: "destructive" });
      setMaintPending(false);
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (purpose === "maintenance") { void submitMaintenance(values); return; }
    if (isPhysiotherapy !== false && !values.treatmentType) {
      form.setError("treatmentType", { message: t.modals.treatmentTypeRequired || "يجب اختيار نوع العلاج" });
      return;
    }
    const submitData: any = {
      ...values,
      treatmentType: isPhysiotherapy !== false ? (values.treatmentType || null) : null,
      customDate: values.customDate || null,
    };
    mutate(submitData, {
      onSuccess: () => {
        setOpen(false);
        resetAll();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetAll(); }}>
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
            {/* غرض الزيارة — يظهر لمرضى الطرف/المسند ليختار الاستقبال مراجعة أو صيانة */}
            {hasDevice && (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Wrench className="w-4 h-4" /> غرض الزيارة
                </FormLabel>
                <Select value={purpose} onValueChange={(v) => setPurpose(v as "visit" | "maintenance")}>
                  <SelectTrigger data-testid="select-visit-purpose"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visit">مراجعة / متابعة</SelectItem>
                    <SelectItem value="maintenance">صيانة الطرف/المسند</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}

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
                      dir="auto"
                      style={{ unicodeBidi: "plaintext" }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* نوع العلاج — لمرضى العلاج الطبيعي وفي وضع المراجعة فقط */}
            {isPhysiotherapy !== false && purpose !== "maintenance" && (
              <FormField
                control={form.control}
                name="treatmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.modals.treatmentType} <span className="text-red-500">*</span></FormLabel>
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

            {/* حقول الصيانة — الخبير + تاريخ التسليم المتوقع (إلزاميان) */}
            {purpose === "maintenance" && (
              <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <FormItem>
                  <FormLabel>الخبير المسؤول عن الصيانة <span className="text-red-500">*</span></FormLabel>
                  {experts.length === 0 ? (
                    <p className="text-sm text-red-600">لا يوجد خبير متاح لهذا الفرع.</p>
                  ) : (
                    <Select value={expertUserId} onValueChange={setExpertUserId}>
                      <SelectTrigger data-testid="select-maintenance-expert"><SelectValue placeholder="اختر الخبير" /></SelectTrigger>
                      <SelectContent>
                        {experts.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </FormItem>
                <FormItem>
                  <FormLabel>تاريخ التسليم المتوقع <span className="text-red-500">*</span></FormLabel>
                  <DatePickerIraq value={expectedDeliveryDate} onChange={setExpectedDeliveryDate} data-testid="input-maintenance-delivery" />
                  <p className="text-xs text-muted-foreground">يُبنى عليه نظام التنبيهات قبل التسليم.</p>
                </FormItem>
                <p className="text-[11px] text-muted-foreground">
                  ستُفتح حلقة صيانة مستقلّة بخبيرها وتاريخها. إن كان للمريض أمر بناء جارٍ لم يُسلَّم، تُمنع الصيانة حتى يكتمل.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isPending || maintPending}>
              {(isPending || maintPending) ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {t.modals.savingVisit}
                </>
              ) : (
                purpose === "maintenance" ? "فتح الصيانة وتسجيل الزيارة" : t.modals.saveVisit
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
