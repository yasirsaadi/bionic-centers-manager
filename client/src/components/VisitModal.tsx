import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVisitSchema } from "@shared/schema";
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
import { PlusCircle, Loader2, Calendar } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DeviceEpisodeSelect, useDeviceEpisodes, UNALLOCATED,
} from "./DeviceEpisodeSelect";
import { z } from "zod";
import { ReviewPathPicker } from "@/components/medical/ReviewPathPicker";
import type { ReviewKind, ReviewPath } from "@shared/medical_review";

// تسجيلُ زيارة — **مراجعةٌ ومتابعةٌ فقط**.
//
// ══ ولا صيانةَ من هنا ═══════════════════════════════════════════════════
// كانت النافذةُ تحمل «غرض الزيارة: صيانة الطرف/المسند» ومعه نموذجٌ كامل:
// الجهازُ والخبيرُ والجزءُ والأجورُ والخصم. فصارت الصيانةُ تُفتَح من بابين
// مختلفين — من هنا، ومن «بيع أو صيانة بلا معاينة» — لكلٍّ محاسبتُه: هذا
// يقيّد الأجورَ فوراً، وذاك يُبقيها معلَّقةً حتى يراجعها طبيب. والموظّفُ
// يختار بابَه بالعادة لا بالمعنى.
//
// **فبابُ الصيانة واحد**: «ما سبب حضور المريض اليوم؟» ⟶ «صيانة …».
// **ونقطةُ `/api/manufacturing/maintenance-visit` لم تُحذَف** — تاريخُها
// وحُرّاسُها كما هما، والشاشةُ وحدها توقّفت عن فتح بابٍ ثانٍ إليها.

interface VisitModalProps {
  patientId: number;
  branchId: number;
  isPhysiotherapy?: boolean;
  //  يُقرآن لتحديد خيط الزيارة وحده — ولا صيانةَ هنا تستعملهما.
  isAmputee?: boolean;
  isMedicalSupport?: boolean;
  /** زرّ «تسجيل زيارة جديدة» يبقى كما كان: بلا `open` تعمل النافذة بزرّها. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  open: openProp, onOpenChange, hideTrigger,
}: VisitModalProps) {
  const [openSelf, setOpenSelf] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openSelf;
  const setOpen = (v: boolean) => { if (!controlled) setOpenSelf(v); onOpenChange?.(v); };
  const { mutate, isPending } = useAddVisit();
  const { t } = useTranslation();
  const dir = t.dir;

  /** الجهاز المقصود بالزيارة — فارغٌ حتى يختار الموظّف. */
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
  // والزيارة العامّة تقبل أي جهازٍ قائم أو قيد الصنع — زياراتُ المتابعة
  // تحدث أثناء التصنيع كما تحدث بعده.
  const visitDeviceSvc = !isPhysioVisit && effectiveCase
    && (effectiveCase.caseType === "prosthetic" || effectiveCase.caseType === "medical_support")
    ? (effectiveCase.caseType as "prosthetic" | "medical_support") : null;
  const { options: visitDevices, hasOptions: visitNeedsChoice } = useDeviceEpisodes(
    patientId, visitDeviceSvc,
    ["awaiting_exam", "examined", "in_manufacturing", "delivered"],
  );

  // ── تصنيفُ الاستقبال لمراجعة الطبيب (ترحيل ٠٥٥) ──────────────────────
  //  يُطرَح داخل النموذج لأن ما يُترَك لزرٍّ في شاشةٍ أخرى لا يقع.
  const [reviewPath, setReviewPath] = useState<ReviewPath>("quick");
  const [reviewKind, setReviewKind] = useState<ReviewKind>("follow_up");
  const [reviewNote, setReviewNote] = useState("");
  /** خدمةُ جهاز؟ حين يكون خيطُ الزيارة أطرافاً أو مساند. */
  const needsReview = visitDeviceSvc !== null;

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
    setVisitDevice("");
    setVisitCaseId(null);
    setReviewPath("quick"); setReviewNote(""); setReviewKind("follow_up");
    form.reset({ patientId, branchId, notes: "", treatmentType: "", customDate: getTodayDate() });
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
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
            {/*  **ولا «غرض الزيارة» بعد اليوم**: هذه النافذة للمراجعة
                والمتابعة وحدها، والصيانةُ بابُها «ما سبب حضور المريض
                اليوم؟» — فلا يُسأل الموظّفُ سؤالاً جوابُه واحد. */}
            {(isAmputee || isMedicalSupport) && (
              <p className="text-[11px] text-muted-foreground rounded-md bg-slate-50 border px-3 py-2"
                data-testid="visit-maintenance-hint">
                للصيانة أو شراء جزء: استعمل <b>«ما سبب حضور المريض اليوم؟»</b> من
                صفحة المريض — تُفتَح هناك بخبيرها وأجورها في مسارٍ واحد.
              </p>
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
            {multiCase && (
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

            {/* نوع العلاج — لزيارات العلاج الطبيعي وحدها */}
            {isPhysioVisit && (
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
            {visitNeedsChoice && (
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

            {/* تصنيفُ الاستقبال — لخدمات الأجهزة وحدها. والعلاج الطبيعي لا
                يراه إطلاقاً، فمسارُه لم يتغيّر بحرف. */}
            {needsReview && (
              <ReviewPathPicker
                path={reviewPath} onPathChange={setReviewPath}
                kind={reviewKind} onKindChange={setReviewKind}
                note={reviewNote} onNoteChange={setReviewNote}
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
