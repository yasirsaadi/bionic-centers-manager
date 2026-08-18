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
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2, Calendar, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DeviceEpisodeSelect, useDeviceEpisodes, UNALLOCATED,
} from "./DeviceEpisodeSelect";
import { z } from "zod";
import { invalidatePatientData } from "@/lib/queryClient";
import { ReviewPathPicker } from "@/components/medical/ReviewPathPicker";
import type { ReviewKind, ReviewPath } from "@shared/medical_review";
import {
  needsMaintenanceChoice, ownedDeviceTypes, resolveMaintenanceServiceType,
  MAINTENANCE_TYPE_LABELS,
} from "./patient_service_launcher_logic";

interface VisitModalProps {
  patientId: number;
  branchId: number;
  isPhysiotherapy?: boolean;
  // A prosthetic/support patient can come for MAINTENANCE of their device;
  // these enable the "غرض الزيارة: صيانة" path (expert + delivery date).
  isAmputee?: boolean;
  isMedicalSupport?: boolean;
  /**
   * فتحٌ **موجَّه** من موزِّع الخدمات — على «صيانة» مباشرةً.
   *
   * والصيانة تبقى **هنا** عمداً: هي زيارةٌ وأمرُ صيانة وخبيرٌ وأجورٌ تُنشأ
   * معاً في معاملة واحدة عبر `maintenance-visit`. تمريرها بـ`new-service`
   * كان سيفصل المال عن أمره — والخادم يرفضها هناك أصلاً، وهو محقّ.
   *
   * وزرّ «تسجيل زيارة جديدة» يبقى كما كان: بلا `open` تعمل النافذة بزرّها.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialPurpose?: "visit" | "maintenance";
  hideTrigger?: boolean;
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

export function VisitModal({
  patientId, branchId, isPhysiotherapy, isAmputee, isMedicalSupport,
  open: openProp, onOpenChange, initialPurpose, hideTrigger,
}: VisitModalProps) {
  const [openSelf, setOpenSelf] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openSelf;
  const setOpen = (v: boolean) => { if (!controlled) setOpenSelf(v); onOpenChange?.(v); };
  const { mutate, isPending } = useAddVisit();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dir = t.dir;

  // Maintenance path — only offered to patients who own a device.
  const hasDevice = !!isAmputee || !!isMedicalSupport;
  const [purpose, setPurpose] = useState<"visit" | "maintenance">(initialPurpose ?? "visit");
  // أيّ جهاز يُصان — لمن يحمل الاثنين وحده. وصاحبُ نوعٍ واحد لا يُسأل.
  const [maintServiceType, setMaintServiceType] = useState<string>("");
  const [maintCost, setMaintCost] = useState<number>(0);
  /** الجهاز المقصود — بالصيانة أو بالزيارة العامّة. فارغٌ حتى يختار الموظّف. */
  const [maintDevice, setMaintDevice] = useState<string>("");
  const [visitDevice, setVisitDevice] = useState<string>("");
  // Which of the patient's cases this visit belongs to. Multi-case patients
  // pick explicitly — the form used to FORCE a physio treatment type, so a
  // prosthetic-related visit always landed under the physio case.
  const [visitCaseId, setVisitCaseId] = useState<number | null>(null);
  const { data: patientCasesList = [] } = useQuery<{ id: number; caseType: string }[]>({
    queryKey: ["/api/patients/:id", patientId, "cases"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const CASE_LABELS: Record<string, string> = { physiotherapy: "علاج طبيعي", prosthetic: "أطراف صناعية", medical_support: "مساند طبية" };
  const multiCase = patientCasesList.length > 1;
  const selectedCase = patientCasesList.find((c) => c.id === visitCaseId) ?? null;
  const effectiveCase = selectedCase ?? patientCasesList.find((c) => c.caseType === "physiotherapy") ?? patientCasesList[0] ?? null;
  const isPhysioVisit = !multiCase ? isPhysiotherapy !== false : effectiveCase?.caseType === "physiotherapy";
  // الصيانة تستهدف جهازاً **مسلَّماً** وحده: الجديد قيد التصنيع ليس محلّاً
  // لصيانةٍ لم يُسلَّم بعد.
  const maintSvc = resolveMaintenanceServiceType({ isAmputee, isMedicalSupport }, maintServiceType);
  const { options: maintDevices, hasOptions: maintNeedsChoice } = useDeviceEpisodes(
    patientId, purpose === "maintenance" ? (maintSvc as any) : null, ["delivered"],
  );
  // والزيارة العامّة تقبل أي جهازٍ قائم أو قيد الصنع — زياراتُ المتابعة
  // تحدث أثناء التصنيع كما تحدث بعده.
  const visitDeviceSvc = !isPhysioVisit && effectiveCase
    && (effectiveCase.caseType === "prosthetic" || effectiveCase.caseType === "medical_support")
    ? (effectiveCase.caseType as "prosthetic" | "medical_support") : null;
  const { options: visitDevices, hasOptions: visitNeedsChoice } = useDeviceEpisodes(
    patientId, purpose === "visit" ? visitDeviceSvc : null,
    ["awaiting_exam", "examined", "in_manufacturing", "delivered"],
  );

  const [expertUserId, setExpertUserId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [maintPending, setMaintPending] = useState(false);

  // ── تصنيفُ الاستقبال لمراجعة الطبيب (ترحيل ٠٥٥) ──────────────────────
  //  يُطرَح داخل النموذج لأن ما يُترَك لزرٍّ في شاشةٍ أخرى لا يقع. والصيانة
  //  خاصّةً كانت لا تصل الطبيب إطلاقاً — وهي أكثر ما يعود به المريض.
  const [reviewPath, setReviewPath] = useState<ReviewPath>("quick");
  const [reviewKind, setReviewKind] = useState<ReviewKind>("maintenance");
  const [reviewNote, setReviewNote] = useState("");
  /** خدمةُ جهاز؟ الصيانة دائماً، والزيارة حين يكون خيطُها أطرافاً أو مساند. */
  const needsReview = purpose === "maintenance" || visitDeviceSvc !== null;

  // Do NOT swallow fetch errors as an empty list — a transient 403/500 would
  // otherwise be cached as "no experts" and block the maintenance path. Throw
  // so React Query records it as an error we can surface.
  const { data: experts = [], isError: expertsError, isLoading: expertsLoading } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", branchId],
    enabled: open && purpose === "maintenance" && hasDevice,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${branchId}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
  });

  // الغرض الموجَّه يُثبَّت عند كل فتح، لا مرّةً واحدة عند التركيب.
  useEffect(() => {
    if (open && initialPurpose) setPurpose(initialPurpose);
  }, [open, initialPurpose]);

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
    setPurpose(initialPurpose ?? "visit"); setExpertUserId(""); setExpectedDeliveryDate("");
    setMaintDevice(""); setVisitDevice("");
    setVisitCaseId(null); setMaintCost(0); setMaintServiceType("");
    setReviewPath("quick"); setReviewNote("");
    setReviewKind(initialPurpose === "maintenance" ? "maintenance" : "follow_up");
    form.reset({ patientId, branchId, notes: "", treatmentType: "", customDate: getTodayDate() });
  };

  // Maintenance: ONE atomic call creates the maintenance work order AND the
  // visit row together (server transaction). Either both are recorded or
  // neither — no orphaned order, no half-recorded visit. If the patient still
  // has an open build, the server returns 409 and nothing is written.
  async function submitMaintenance(values: z.infer<typeof formSchema>) {
    if (!expertUserId) { toast({ title: "اختر الخبير المسؤول عن الصيانة", variant: "destructive" }); return; }
    // مريضٌ يحمل طرفاً ومسنداً: النوع **قرارُ الموظّف** لا أوّلُ شرطٍ في
    // تعبير. وبلا تحديدٍ لا يُبنى طلبٌ نعلم أن الخادم سيردّه.
    const svc = resolveMaintenanceServiceType({ isAmputee, isMedicalSupport }, maintServiceType);
    if (!svc) { toast({ title: "حدّد نوع الجهاز المراد صيانته", variant: "destructive" }); return; }
    setMaintPending(true);
    try {
      const res = await fetch("/api/manufacturing/maintenance-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId, expertUserId: Number(expertUserId),
          serviceType: svc,
          cost: maintCost,
          ...(maintNeedsChoice
            ? (maintDevice === UNALLOCATED
                ? { legacyUnrecordedDevice: true }
                : maintDevice ? { deviceEpisodeId: Number(maintDevice) } : {})
            : {}),
          notes: values.notes?.trim() || undefined, customDate: values.customDate || undefined,
          reviewPath, reviewKind, reviewNote: reviewNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast({ title: "تعذّر فتح الصيانة", description: e.error || "خطأ", variant: "destructive" });
        setMaintPending(false);
        return;
      }
      // Refresh the patient's visits, payments and manufacturing views.
      invalidatePatientData(queryClient, patientId);
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/notifications"] });
      toast({ title: "تم فتح أمر الصيانة وتسجيل الزيارة" });
      setMaintPending(false); setOpen(false); resetAll();
    } catch {
      toast({ title: "تعذّر فتح الصيانة", variant: "destructive" });
      setMaintPending(false);
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (purpose === "maintenance") { void submitMaintenance(values); return; }
    if (isPhysioVisit && !values.treatmentType) {
      form.setError("treatmentType", { message: t.modals.treatmentTypeRequired || "يجب اختيار نوع العلاج" });
      return;
    }
    const submitData: any = {
      ...values,
      treatmentType: isPhysioVisit ? (values.treatmentType || null) : null,
      caseId: effectiveCase?.id ?? null,
      customDate: values.customDate || null,
      ...(visitNeedsChoice && visitDevice && visitDevice !== UNALLOCATED
        ? { deviceEpisodeId: Number(visitDevice) } : {}),
      //  التصنيف يُرسَل مع زيارة الجهاز وحدها — والعلاج الطبيعي لا يحمله.
      ...(visitDeviceSvc ? { reviewPath, reviewKind, reviewNote: reviewNote.trim() || undefined } : {}),
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
      {!hideTrigger && (
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" data-testid="button-add-visit">
          <PlusCircle className="w-4 h-4" />
          {t.modals.registerNewVisit}
        </Button>
      </DialogTrigger>
      )}
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

            {/* لأي حالة تعود هذه الزيارة؟ — للمريض متعدد الحالات (علاج + طرف/مسند)
                حتى لا تُجبَر زيارة الطرف على حمل نوع علاج فتظهر تحت العلاج. */}
            {multiCase && purpose !== "maintenance" && (
              <FormItem>
                <FormLabel>هذه الزيارة تخصّ <span className="text-red-500">*</span></FormLabel>
                <div className="flex flex-wrap gap-2">
                  {patientCasesList.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      size="sm"
                      variant={effectiveCase?.id === c.id ? "default" : "outline"}
                      onClick={() => setVisitCaseId(c.id)}
                      data-testid={`visit-case-${c.caseType}`}
                    >
                      {CASE_LABELS[c.caseType] ?? c.caseType}
                    </Button>
                  ))}
                </div>
              </FormItem>
            )}

            {/* نوع العلاج — لزيارات العلاج الطبيعي وفي وضع المراجعة فقط */}
            {isPhysioVisit && purpose !== "maintenance" && (
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

            {/* زيارةٌ عامّة على حالة جهاز: أيّ جهازٍ تخصّ؟ اختياريّ — الزيارة
                العامّة أو جهازُ الإرث يبقيان بلا هوية. */}
            {purpose === "visit" && visitNeedsChoice && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                <DeviceEpisodeSelect
                  label="الجهاز الذي تخصّه الزيارة"
                  options={visitDevices}
                  value={visitDevice}
                  onChange={setVisitDevice}
                  unallocatedLabel="زيارة عامّة / جهاز قديم"
                  testId="select-visit-device"
                />
              </div>
            )}

            {/* حقول الصيانة — الخبير فقط؛ تاريخ التسليم يحدّده الخبير عند أخذ القالب */}
            {purpose === "maintenance" && (
              <div className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
                {/* أيّ جهازٍ مسلَّم يُصان. والجديد قيد التصنيع لا يُعرَض:
                    جهازٌ لم يُسلَّم بعد ليس محلّاً لصيانة. */}
                {maintNeedsChoice && (
                  <DeviceEpisodeSelect
                    label="الجهاز المراد صيانته"
                    options={maintDevices}
                    value={maintDevice}
                    onChange={setMaintDevice}
                    unallocatedLabel="جهاز قديم غير مسجَّل"
                    testId="select-maintenance-device"
                  />
                )}
                {/* أيّ جهاز يُصان — لمن يحمل الاثنين وحده. وصاحبُ نوعٍ واحد
                    لا يرى هذا الحقل ولا يتغيّر عنده شيء. */}
                {needsMaintenanceChoice({ isAmputee, isMedicalSupport }) && (
                  <FormItem>
                    <FormLabel>الجهاز المراد صيانته <span className="text-red-500">*</span></FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {ownedDeviceTypes({ isAmputee, isMedicalSupport }).map((tpe) => (
                        <Button
                          key={tpe}
                          type="button"
                          size="sm"
                          variant={maintServiceType === tpe ? "default" : "outline"}
                          onClick={() => setMaintServiceType(tpe)}
                          data-testid={`maintenance-service-${tpe}`}
                        >
                          {MAINTENANCE_TYPE_LABELS[tpe]}
                        </Button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      للمريض طرفٌ ومسند معاً — تُقيَّد الصيانة على الجهاز الذي تختاره.
                    </p>
                  </FormItem>
                )}
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
                  <FormLabel>أجور الصيانة (د.ع)</FormLabel>
                  <MoneyInput value={maintCost} onValueChange={setMaintCost} placeholder="0" data-testid="input-maintenance-cost" />
                  <p className="text-[11px] text-muted-foreground">
                    تُقيَّد على حساب المريض فور الحفظ ويُسجَّل الدفع كالمعتاد. المبلغ قراركم — صفر أو أي مبلغ، بغضّ النظر عن الضمان.
                  </p>
                </FormItem>
                <p className="text-[11px] text-muted-foreground">
                  ستُفتح حلقة صيانة مستقلّة بخبيرها — يحدّد الخبير تاريخ التسليم عند أخذ القالب. إن كان للمريض أمر صيانة/بناء جارٍ لنفس الخدمة لم يُسلَّم، تُمنع حتى يكتمل.
                </p>
              </div>
            )}

            {/* تصنيفُ الاستقبال — لخدمات الأجهزة وحدها. والعلاج الطبيعي لا
                يراه إطلاقاً، فمسارُه لم يتغيّر بحرف. */}
            {needsReview && (
              <ReviewPathPicker
                path={reviewPath} onPathChange={setReviewPath}
                kind={reviewKind} onKindChange={setReviewKind}
                note={reviewNote} onNoteChange={setReviewNote}
              />
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
