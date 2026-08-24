import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAmputationSite, parseInjuries } from "@shared/case_fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deviceDiscountRefs } from "@shared/discount";
import { EXAM_FIELDS, SPECIALTY_LABELS, type ExamFieldKey, type MedicalSpecialty } from "@shared/medical";
import { useDoctorGrant } from "./useDoctorGrant";
import { api } from "@shared/routes";
import { PrescriptionFields, type PrescriptionValue } from "./PrescriptionFields";

export interface ExamToEdit {
  id: number;
  caseType: string;
  prescription?: Record<string, any> | null;
  deviceCost?: number | null;
  proposedExpertUserId?: number | null;
  /** الجهازُ الذي فُحص — به تُطابَق المتابعةُ حين يحمل المريضُ أكثر من جهاز. */
  deviceEpisodeId?: number | null;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  plan: string | null;
  notes: string | null;
  version?: number;
}

const EMPTY_FORM: Record<ExamFieldKey, string> = {
  chiefComplaint: "",
  clinicalFindings: "",
  diagnosis: "",
  plan: "",
  notes: "",
};

/**
 * Signing a new exam, standalone.
 *
 * Deliberately decoupled from the patient page: a doctor working through a
 * worklist should be able to open a patient, document, and move on without
 * navigating into a full patient file first. It needs nothing but a patientId,
 * so the registry row, the worklist row and the patient page all open the same
 * dialog.
 */
export function NewExamDialog({
  patientId,
  patientName,
  open,
  onOpenChange,
  preferSpecialty,
  exam,
  onDone,
}: {
  patientId: number;
  patientName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Pre-selected specialty. Normally the one this patient is waiting on — which
   * IS what reception registered — so the doctor opens the form already showing
   * their colleague's determination, and changes it only if they disagree.
   */
  preferSpecialty?: string | null;
  /** Passed to REVISE an existing exam instead of signing a new one. */
  exam?: ExamToEdit | null;
  onDone?: () => void;
}) {
  const isEdit = !!exam;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { specialties } = useDoctorGrant();

  const [specialty, setSpecialty] = useState<MedicalSpecialty | "">("");
  const [form, setForm] = useState<Record<ExamFieldKey, string>>({ ...EMPTY_FORM });
  const [rx, setRx] = useState<PrescriptionValue>({});
  const [deviceCost, setDeviceCost] = useState<string>("");
  //  ══ **التفاصيلُ التجارية** (المرحلة الثانية) ═══════════════════════════
  //  الطبيبُ يقول السعرَ ونوعَه والخبيرَ والقرار — كلُّها **اختيارية**، وما
  //  يقوله يصير مملوكاً له فلا يكتب فوقه استقبالٌ ولا مديرُ فرع.
  //
  //  **والسعرُ حقلٌ واحد لا حقلان**: `deviceCost` أعلاه هو «السعر الأصلي»،
  //  والنوعُ يقول ماذا يُقيَّد منه — فلا سعرَ ثانٍ يُخترَع ولا يُطلب من
  //  الطبيب أن يكتب الرقمَ مرّتين.
  const [priceKind, setPriceKind] = useState<"normal" | "discount" | "free">("normal");
  const [discountFinal, setDiscountFinal] = useState<string>("");
  const [decision, setDecision] = useState<"" | "bought" | "not_bought">("");
  const [notBoughtReason, setNotBoughtReason] = useState<string>("");
  const [expertUserId, setExpertUserId] = useState<string>("");
  const [prefilled, setPrefilled] = useState(false);
  //  تصحيحُ سعرٍ بعد البيع يحرّك مالاً، فيمرّ بتأكيدٍ يقول كم ولماذا.
  const [confirmPrice, setConfirmPrice] = useState(false);
  const [priceCorrectionReason, setPriceCorrectionReason] = useState("");

  // The patient row: prefills what reception already recorded (physiotherapy)
  // and gives the branch whose expert roster this doctor may suggest from.
  const { data: patientRow } = useQuery<any>({
    queryKey: ["/api/patients", patientId, "exam-prefill"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // ══ **هل ما زال السعرُ قابلاً للتصحيح؟** (تحرير فقط) ═══════════════════
  //  الواقعة: كتب الطبيبُ ٦,٠٠٠,٠٠٠ ثم صحّحها — والسعرُ التجاري لم يتبعه،
  //  فاضطرّ المالك إلى «تحديد السعر النهائي» لإصلاح رقم. والتصحيحُ الآن
  //  يتبعه **قبل البيع**، ويُقفل بعده.
  //
  //  والقفلُ هنا **للعرض والشرح**: الخادمُ هو الحارس (يردّ ٤٠٩)، والشاشةُ
  //  تقول للطبيب لماذا قبل أن يكتب رقماً سيُردّ.
  const { data: followupRows } = useQuery<any[]>({
    queryKey: [`/api/followups/patient/${patientId}`],
    enabled: open && isEdit,
    queryFn: async () => {
      const res = await fetch(`/api/followups/patient/${patientId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const { data: discountRows } = useQuery<{ requests?: any[] }>({
    queryKey: [`/api/discounts/patient/${patientId}`],
    enabled: open && isEdit,
    queryFn: async () => {
      const res = await fetch(`/api/discounts/patient/${patientId}`, { credentials: "include" });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
  });
  // ══ **متابعةُ هذه المعاينة بعينها — لا أوّلُ متابعةٍ للمريض** ═══════════
  //  المريضُ العائد يملك أكثر من جهاز: طرفٌ سُلِّم قبل سنتين وطلبٌ ثانٍ اليوم،
  //  ولكلٍّ متابعتُه. وأخذُ `[0]` كان يقفل سعرَ الجهاز الثاني لأن الأول
  //  بِيع — قفلٌ لا علاقةَ له بما يُحرَّر.
  //
  //  والمطابقةُ بالهويّة القانونية: المعاينةُ التي فتحت المتابعة، وإلّا
  //  فالحلقةُ التي تخصّها.
  const activeFollowup = (followupRows ?? []).find((f: any) =>
    (exam?.id != null && Number(f?.medicalExamId) === Number(exam.id))
    || (exam?.deviceEpisodeId != null
      && Number(f?.deviceEpisodeId) === Number(exam.deviceEpisodeId))) ?? null;
  const soldAlready = Boolean(activeFollowup)
    && (activeFollowup.status === "converted" || activeFollowup.convertedWorkOrderId);
  //  **والطلبُ المعلَّق بمرجع هذا الجهاز** — لا بأيّ طلبٍ للمريض. والمراجعُ
  //  من المصدر المشترك نفسِه الذي يكتبها الخادم ويقرأها.
  const deviceRefs = activeFollowup
    ? deviceDiscountRefs({
      followupId: activeFollowup.id,
      deviceEpisodeId: activeFollowup.deviceEpisodeId ?? null,
      serviceType: activeFollowup.serviceType,
    })
    : [];
  const discountPending = (discountRows?.requests ?? []).some(
    (r: any) => r?.status === "pending" && deviceRefs.includes(String(r?.contextRef)));
  //  **مصدرُ السعر القائم** — وهو ما يقرّر ماذا يفعل التصحيح، لا البيعُ.
  const commercialOverride = Boolean(activeFollowup)
    && String(activeFollowup.priceSource ?? "exam") !== "exam";

  // ══ **القفلُ للمانع الحقيقيّ وحده** ════════════════════════════════════
  //  كان البيعُ يقفل الحقلَ قفلاً عامّاً، فمعاينةٌ وُقّعت بـ١,٧٠٠,٠٠٠ وهي
  //  تقصد ١,٧٥٠,٠٠٠ لم يكن لها بابٌ بعد الشراء — فصُحّح الرقمُ من شاشة
  //  تعديل المريض العامّة وتحرّك المجموعُ وحدَه. **إخفاءُ البابِ لم يمنع
  //  التصحيح، منع أن يكون نظيفاً.**
  //
  //  والمانعُ الوحيد الباقي هو الطلبُ المعلَّق: قرارٌ ينتظر إنساناً، وتحريكُ
  //  الأصلِ تحته يغيّر ما سيوقّع عليه. والقرارُ التجاريُّ الصريح **لا يقفل**:
  //  المعاينةُ تُصحَّح ويبقى هو، وتُقال العبارةُ صراحةً قبل الحفظ وبعده.
  const priceLock: null | { why: string } =
    !isEdit ? null
      : discountPending ? {
        why: "يوجد طلب خصم بانتظار الاعتماد محسوبٌ على هذا السعر — احسمه أولاً."
          + " ويمكنك تعديل بقية المعاينة الآن.",
      } : null;

  //  تحذيرٌ يُقال والحقلُ مفتوح: **لا يُعرَض حقلٌ فعّال ويُخفى أثرُه.**
  const priceWarning: string | null =
    !isEdit || priceLock ? null
      : commercialOverride
        ? "السعر التجاري الحالي ناتج عن قرار مستقل؛ تعديل المعاينة لن يغيّر السعر التجاري أو الحسابات."
        : soldAlready
          ? "تم البيع وبدأت إجراءات التصنيع. تصحيح هذا السعر سيحدّث كلفة الجهاز"
            + " وإجمالي حساب المريض، ولن يغيّر الدفعات السابقة."
          : null;

  //  **والتصحيحُ الماليّ بعد البيع يستأذن**: بِيع الجهازُ وسعرُه ما زال سعرَ
  //  المعاينة ⟶ الحفظُ يحرّك مالاً، فيمرّ بتأكيدٍ يقول كم ولماذا.
  const afterSaleCorrection = isEdit && soldAlready && !commercialOverride && !priceLock;
  const priceNow = Number(activeFollowup?.approvedPrice ?? exam?.deviceCost ?? 0);
  const priceNext = deviceCost === "" ? null : Number(deviceCost);
  const priceMoved = afterSaleCorrection
    && priceNext !== null && Number.isFinite(priceNext) && priceNext > 0
    && priceNext !== Number(exam?.deviceCost ?? 0);

  // The manufacturing experts of the patient's branch — the same roster
  // reception picks from, so the doctor's suggestion is always a real option.
  const { data: experts = [] } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", patientRow?.branchId],
    enabled: open && !!patientRow?.branchId,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${patientRow.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Reset on every open so a dismissed draft never leaks into the next patient —
  // these records are permanent once signed, so a stale field is a real hazard.
  useEffect(() => {
    if (!open) return;
    //  سببُ التصحيح لا يُورَّث من فتحةٍ سابقة: سببُ أمسٍ ليس سببَ اليوم.
    setConfirmPrice(false);
    setPriceCorrectionReason("");
    if (exam) {
      setForm({
        chiefComplaint: exam.chiefComplaint ?? "",
        clinicalFindings: exam.clinicalFindings ?? "",
        diagnosis: exam.diagnosis ?? "",
        plan: exam.plan ?? "",
        notes: exam.notes ?? "",
      });
      setRx((exam.prescription ?? {}) as PrescriptionValue);
      setDeviceCost(exam.deviceCost != null ? String(exam.deviceCost) : "");
      setExpertUserId(exam.proposedExpertUserId != null ? String(exam.proposedExpertUserId) : "");
      setSpecialty(exam.caseType as MedicalSpecialty);
      return;
    }
    setForm({ ...EMPTY_FORM });
    setRx({});
    setDeviceCost("");
    setExpertUserId("");
    setPrefilled(false);
    const wanted =
      preferSpecialty && specialties.includes(preferSpecialty as MedicalSpecialty)
        ? (preferSpecialty as MedicalSpecialty)
        : specialties.length === 1
          ? specialties[0]
          : "";
    setSpecialty(wanted);
  }, [open, exam?.id, preferSpecialty, specialties.join(",")]);

  // Physiotherapy prefill: the diagnosis and the injuries are SHARED fields —
  // reception records them at registration (injuries; diagnosis on legacy
  // files), and the doctor's prescription writes the same patient columns
  // back. Starting the form blank made the doctor retype (or lose) what was
  // already on file, so the form opens carrying reception's values for the
  // doctor to complete or correct. Only fields the doctor hasn't touched are
  // filled, and once both are present the effect converges to a no-op.
  // Runs ONCE per opened physiotherapy form. The `prefilled` latch matters:
  // without it the effect re-fired on every keystroke and refilled a field the
  // doctor had deliberately cleared, so the form fought back.
  useEffect(() => {
    if (!open || isEdit || specialty !== "physiotherapy" || !patientRow || prefilled) return;

    const patch: PrescriptionValue = {};
    const hasDisease = typeof rx.diseaseType === "string" && rx.diseaseType.trim().length > 0;
    const hasInjuries = Array.isArray(rx.injuries) && rx.injuries.some((r: any) => r && (r.type || r.area));
    if (!hasDisease && patientRow.diseaseType) patch.diseaseType = patientRow.diseaseType;
    if (!hasInjuries) {
      let rows = parseInjuries(patientRow.injuries);
      if (rows.length === 0 && (patientRow.injuryType || patientRow.injuryArea)) {
        // Legacy files predate the injuries JSON: rebuild rows from the two
        // joined strings the old form kept in sync.
        const types = String(patientRow.injuryType || "").split("، ").filter(Boolean);
        const areas = String(patientRow.injuryArea || "").split("، ").filter(Boolean);
        const n = Math.max(types.length, areas.length);
        rows = Array.from({ length: n }, (_, i) => ({ type: types[i] ?? "", area: areas[i] ?? "", side: "" }));
      }
      if (rows.length > 0) patch.injuries = rows;
    }
    if (Object.keys(patch).length === 0) return;
    setRx((prev) => ({ ...prev, ...patch }));
    setPrefilled(true);
  }, [open, isEdit, specialty, patientRow, prefilled]);

  // Prosthetic prefill, same contract as the physiotherapy one above: reception
  // now records the amputation at registration (owner, 2026-07-31), so the exam
  // opens carrying it instead of making the doctor re-enter what is on file.
  // The doctor stays free to change every part of it — the exam is what signs
  // the record. Only runs when the doctor hasn't already touched the builder,
  // and an unparseable legacy site simply leaves the form blank.
  useEffect(() => {
    if (!open || isEdit || specialty !== "prosthetic" || !patientRow || prefilled) return;
    if (rx.amputationType) return;

    const parts = parseAmputationSite(patientRow.amputationSite);
    if (!parts.amputationType) return;
    setRx((prev) => ({ ...prev, ...parts }));
    setPrefilled(true);
  }, [open, isEdit, specialty, patientRow, prefilled, rx.amputationType]);

  // Medical-support prefill — the same contract as the two above (owner,
  // 2026-08-06): reception records the support type and the injured side at
  // registration, so the exam opens carrying them rather than blank, and the
  // doctor is free to change either. Only fields the doctor hasn't touched.
  useEffect(() => {
    if (!open || isEdit || specialty !== "medical_support" || !patientRow || prefilled) return;

    const patch: PrescriptionValue = {};
    const has = (v: unknown) => typeof v === "string" && v.trim().length > 0;
    if (!has(rx.supportType) && has(patientRow.supportType)) patch.supportType = patientRow.supportType;
    if (!has(rx.injurySide) && has(patientRow.injurySide)) patch.injurySide = patientRow.injurySide;
    if (Object.keys(patch).length === 0) return;
    setRx((prev) => ({ ...prev, ...patch }));
    setPrefilled(true);
  }, [open, isEdit, specialty, patientRow, prefilled, rx.supportType, rx.injurySide]);

  // Cost belongs to the doctor for a DEVICE only: they specify the prosthesis or
  // the support, so they know its price. Physiotherapy is left exactly as it
  // was — priced per session by reception in «الكلفة والجلسات».
  // Declared above the mutation that reads it, so the dependency is obvious.
  const isDeviceSpecialty = specialty === "prosthetic" || specialty === "medical_support";

  //  ما يُرسَل فعلاً — **مبنيٌّ مرّةً ويُقرأ في موضعين** (الإرسالُ والتعطيل).
  const commercialPayload = (() => {
    if (isEdit || !isDeviceSpecialty) return undefined;
    const hasPrice = deviceCost !== "" && Number(deviceCost) > 0;
    if (!hasPrice && !expertUserId && !decision) return undefined;
    return {
      price: hasPrice
        ? {
          kind: priceKind,
          originalPrice: Number(deviceCost),
          finalPrice: priceKind === "discount" && discountFinal !== ""
            ? Number(discountFinal) : undefined,
        }
        : null,
      expertUserId: expertUserId ? Number(expertUserId) : undefined,
      decision: decision || undefined,
      notBoughtReason: decision === "not_bought" ? notBoughtReason.trim() : undefined,
    };
  })();

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        isEdit ? `/api/medical/exams/${exam!.id}` : `/api/medical/patients/${patientId}/exams`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseType: specialty,
            ...form,
            prescription: rx,
            // Sent only where it is meaningful; the server drops it for
            // physiotherapy regardless, whose pricing stays with reception.
            deviceCost: isDeviceSpecialty ? deviceCost : undefined,
            // A SUGGESTION. Reception's «تخصيص» opens with it filled in and
            // may keep or change it; nothing is assigned until they save.
            proposedExpertUserId: isDeviceSpecialty && expertUserId ? Number(expertUserId) : undefined,
            //  سببُ تصحيح سعرٍ بعد البيع — **والخادمُ يفرضه ولا يثق بوجود
            //  الحقل في الشاشة**: من يستدعي النقطةَ مباشرةً يُردّ مثلَ غيره.
            priceCorrectionReason: priceMoved ? priceCorrectionReason.trim() : undefined,
            //  ══ **التفاصيلُ التجارية — للجهاز الجديد وحده** ═══════════════
            //  ولا تُرسَل في التحرير: تصحيحُ سعرِ معاينةٍ بيعت بابُه الخاصّ
            //  (`priceCorrectionReason` أعلاه)، وإرسالُها هنا كان سيفتح
            //  مسارَين لقرارٍ واحد.
            commercial: commercialPayload,
          }),
        },
      );
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر حفظ المعاينة");
      return res.json();
    },
    onSuccess: (saved: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      // The patient just left the doctor's queue — refresh it wherever it shows.
      queryClient.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      // The prescription just rewrote the patient's case details.
      queryClient.invalidateQueries({ queryKey: ["/api/patients/:id", patientId, "cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/registry"] });
      // The prescription also rewrites the PATIENT row itself (isAmputee /
      // isMedicalSupport), and those flags gate the manufacturing card and the
      // «تخصيص» service type. Without this the page keeps rendering the
      // pre-decision shape until a manual reload.
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, patientId] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      // ══ تصحيحُ السعر بعد البيع حرّك أربعةَ أرقامٍ يراها المستخدم ═══════
      //  سعرُ المعاينة (أعلاه) · السعرُ المعتمد في المتابعة · مجموعُ المريض
      //  (أعلاه) · وسعرُ حلقة الجهاز ومتبقّيه. وبلا هذين يبقى نصفُ الشاشة
      //  على الرقم القديم حتى يُحدَّث المتصفّح يدوياً — فيظنّ الموظّفُ أن
      //  التصحيح لم يقع.
      queryClient.invalidateQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/device-episodes`] });
      setConfirmPrice(false);
      setPriceCorrectionReason("");
      onOpenChange(false);
      toast({
        title: isEdit ? "حُفظ التعديل والنسخة السابقة محفوظة" : "حُفظت المعاينة ووُقّعت باسمك",
        // The server could not retire the superseded case (it already carries a
        // work order or tagged payments) — the doctor has to know both are open.
        //  **وملاحظةُ السعر تُقال** — فيعرف الطبيبُ إن لم يتبعه الرقمُ التجاري.
        //  ونتيجةُ التفاصيلِ التجارية تُقال: أتمّ البيعُ؟ أم بقي ناقصٌ؟
        //  أم تعذّر حفظُها فتُدخَل من بطاقة المريض؟ — **ولا يُبتلَع شيء**.
        description: [
          saved?.switchNote, saved?.priceNote,
          saved?.commercial?.converted ? "تم الشراء وبدأ التصنيع" : null,
          saved?.commercial?.closed ? "سُجّل «لم يشترِ» وأُغلق الملفّ" : null,
          saved?.commercial?.missing?.length
            ? `اشترى — بانتظار: ${saved.commercial.missingLabel}` : null,
          saved?.commercialError,
        ].filter(Boolean).join(" · ") || undefined,
      });
      onDone?.();
    },
    onError: (err: any) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // A prescription alone is a real clinical decision, so it counts as content
  // just as the narrative does — the server applies the same rule.
  const hasNarrative = Object.values(form).some((v) => v.trim().length > 0);
  const hasPrescription = Object.entries(rx).some(([, v]) =>
    Array.isArray(v)
      ? v.some((row: any) => row && Object.values(row).some((x) => x !== "" && x !== 0))
      : typeof v === "string" && v.trim().length > 0,
  );
  const hasContent = hasNarrative || hasPrescription;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            {isEdit ? `تعديل المعاينة${exam?.version ? ` — النسخة ${exam.version}` : ""}` : "معاينة طبية جديدة"}
          </DialogTitle>
          {patientName && (
            <p className="text-sm text-muted-foreground text-right">{patientName}</p>
          )}
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isEdit
                ? "سيُحفظ النصّ الحالي كنسخة سابقة يمكن الاطّلاع عليها، ولن يُمحى. لا شيء يضيع."
                : "تُحفظ المعاينة موقّعة باسمك. يمكنك تعديلها لاحقاً، وكل نسخة سابقة تبقى محفوظة ومرئية."}
            </span>
          </div>

          <div className="space-y-2">
            <Label>الاختصاص</Label>
            <Select value={specialty} onValueChange={(v) => setSpecialty(v as MedicalSpecialty)}>
              <SelectTrigger className="bg-white" data-testid="select-exam-specialty">
                <SelectValue placeholder="اختر الاختصاص" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SPECIALTY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {specialty && (
            <PrescriptionFields caseType={specialty} value={rx} onChange={setRx} />
          )}

          {prefilled && specialty === "physiotherapy" && (
            <p className="text-xs text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2" data-testid="note-rx-prefilled">
              التشخيص والإصابات أعلاه مملوءة مما سجّله الاستعلامات — أكمل وعدّل ما يلزم، وما توقّعه هو المعتمد على ملف المريض.
            </p>
          )}

          {isDeviceSpecialty && (
            <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
              <Label htmlFor="exam-device-cost" className="font-semibold">
                كلفة {specialty === "prosthetic" ? "الطرف" : "المسند"} (د.ع)
              </Label>
              {/*  ══ الرقمُ يُقرأ وهو يُكتَب ═══════════════════════════════
                  كان الحقلُ نصّاً خاماً: `2500000` — لا يستطيع الطبيبُ أن
                  يتحقّق منه بنظرةٍ واحدة، وصفرٌ زائدٌ أو ناقصٌ يمرّ. وهذه
                  كلفةُ جهازٍ تدخل حساباتِ المريض حين يعتمدها الاستعلامات.
                  فصار حقلَ المال نفسه المستعمل في كلّ نافذةٍ تقبض أو تسعّر:
                  يُعرَض `2,500,000` ويُرسَل `2500000`.
                  **و`allowEmpty`**: الفارغُ يبقى فارغاً لا يصير صفراً —
                  «لم أحدّد الكلفة» ليست «كلفتُه صفر». */}
              <MoneyInput
                id="exam-device-cost"
                allowEmpty
                placeholder="مثال: 1,500,000"
                value={deviceCost}
                onValueChange={(v) => setDeviceCost(v === null ? "" : String(v))}
                readOnly={Boolean(priceLock)}
                className={priceLock ? "bg-muted" : "bg-white"}
                data-testid="input-exam-device-cost"
              />
              {priceLock && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1"
                  data-testid="text-device-cost-locked">
                  {priceLock.why}
                </p>
              )}
              {/*  **حقلٌ مفتوحٌ يقول أثرَه**: الطبيبُ يعرف قبل أن يكتب هل
                  يتبعه المالُ أم يبقى القرارُ التجاريّ كما هو. */}
              {priceWarning && (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1"
                  data-testid="text-device-cost-after-sale">
                  {priceWarning}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                كلفة <b>مقترحة</b>: تظهر لموظف الاستعلامات ولا تدخل الحسابات إلا حين
                يعتمدها في «تخصيص وإسناد خبير» بعد موافقة المريض. فإن لم يدفع أو
                غيّر رأيه، لا يبقى لها أثر في الأرقام.
              </p>

              {/* The expert follows the same proposal rule as the price. */}
              <div className="space-y-2 pt-1">
                <Label htmlFor="exam-expert" className="font-semibold">الخبير المقترح (اختياري)</Label>
                <Select value={expertUserId} onValueChange={setExpertUserId}>
                  <SelectTrigger className="bg-white" id="exam-expert" data-testid="select-exam-expert">
                    <SelectValue placeholder={experts.length ? "اتركه للاستعلامات أو اقترح خبيراً" : "لا يوجد خبير في هذا الفرع"} />
                  </SelectTrigger>
                  <SelectContent>
                    {experts.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {expertUserId && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => setExpertUserId("")}
                    data-testid="button-clear-exam-expert"
                  >
                    مسح الاختيار
                  </button>
                )}
                {/*  ══ **وما تكتبه هنا يصير لك** (المرحلة الثانية) ═════════
                    كانت العبارةُ «اقتراحٌ يغيّره الموظّف»، وهي لم تبقَ صحيحة:
                    خبيرٌ يسنِده الطبيبُ في معاينته يُقفَل على الاستقبال ومدير
                    الفرع — يبدّله صاحبُه أو المسؤولُ العام. والفارغُ وحده
                    يختاره الموظّف. */}
                <p className="text-xs text-muted-foreground">
                  ما تختاره هنا يُسجَّل باسمك ولا يبدّله الاستقبال ولا مدير الفرع.
                  وإن تركته فارغاً يختاره الموظّف.
                </p>
              </div>

              {/*  ══ **تفاصيلُ البيع — يقولها الطبيبُ إن شاء** (المرحلة ٢) ══
                  ولا شيءَ منها إلزاميّ: المعاينةُ السريرية تُوقَّع ولو تُركت
                  فارغةً كلُّها، والاستقبالُ يُكملها. لكنّ ما يقوله الطبيبُ
                  **يصير مملوكاً له** فلا يكتب فوقه استقبالٌ ولا مديرُ فرع.
                  **ولا اعتمادَ ولا طابورَ موافقات**: ما يُدخله نافذٌ فوراً. */}
              {!isEdit && (
                <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3"
                  data-testid="block-exam-commercial">
                  <p className="text-sm font-bold text-emerald-900">تفاصيل البيع (اختيارية)</p>

                  {/*  نوعُ السعر — والرقمُ أعلاه هو «الأصلي» دائماً. */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">نوع السعر</Label>
                    <div className="flex flex-wrap gap-3 text-sm" data-testid="radio-price-kind">
                      {([
                        ["normal", "السعر كما هو"],
                        ["discount", "بخصم"],
                        ["free", "مجاني"],
                      ] as const).map(([v, label]) => (
                        <label key={v} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio" name="exam-price-kind" value={v}
                            checked={priceKind === v}
                            onChange={() => setPriceKind(v)}
                            data-testid={`radio-price-kind-${v}`}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    {priceKind === "discount" && (
                      <div className="pt-1">
                        <Label htmlFor="exam-discount-final" className="text-xs">
                          السعر بعد الخصم (د.ع)
                        </Label>
                        <MoneyInput
                          id="exam-discount-final"
                          allowEmpty
                          placeholder="أقلّ من السعر الأصلي"
                          value={discountFinal}
                          onValueChange={(v) => setDiscountFinal(v === null ? "" : String(v))}
                          className="bg-white"
                          data-testid="input-exam-discount-final"
                        />
                      </div>
                    )}
                    {/*  **والصفرُ لا يُقال «مجّاناً» ضمناً**: المجّانيّةُ تُختار
                        صراحةً، والسعرُ الأصليُّ يبقى محفوظاً فيُعرَف قدرُ ما
                        تبرّع به المركز. */}
                    {priceKind === "free" && (
                      <p className="text-xs text-emerald-900" data-testid="text-free-note">
                        سيُقيَّد الجهاز بقيمة <b>صفر</b>، ويبقى السعر الأصلي
                        ({deviceCost === "" ? "غير محدد" : Number(deviceCost).toLocaleString()} د.ع)
                        محفوظاً في السجلّ.
                      </p>
                    )}
                  </div>

                  {/*  ══ **القرار: اثنان لا ثالث** ══════════════════════════
                      وتركُه فارغاً مشروعٌ تماماً — يعني «يُكمله الموظّف»، لا
                      «رفض المريض». والصمتُ لا يُقرأ رفضاً في أيّ موضع. */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">قرار المريض</Label>
                    <div className="flex flex-wrap gap-3 text-sm" data-testid="radio-purchase-decision">
                      {([
                        ["", "يكمله الموظّف لاحقاً"],
                        ["bought", "اشترى"],
                        ["not_bought", "لم يشترِ"],
                      ] as const).map(([v, label]) => (
                        <label key={v || "none"} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio" name="exam-decision" value={v}
                            checked={decision === v}
                            onChange={() => setDecision(v)}
                            data-testid={`radio-decision-${v || "none"}`}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    {decision === "not_bought" && (
                      <div className="pt-1">
                        <Label htmlFor="exam-not-bought" className="text-xs">
                          سبب عدم الشراء <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="exam-not-bought"
                          value={notBoughtReason}
                          onChange={(e) => setNotBoughtReason(e.target.value)}
                          placeholder="اكتب ما قاله المريض"
                          className="bg-white min-h-[60px]"
                          data-testid="input-not-bought-reason"
                        />
                      </div>
                    )}
                    {/*  **و«اشترى» تُحفَظ ولو نقص السعرُ أو الخبير** — فلا
                        يُسأل المريضُ مرّتين، ويُتمّ الخادمُ البيعَ عند آخرِ
                        ناقصٍ يُكمله الموظّف. */}
                    {decision === "bought" && (
                      <p className="text-xs text-muted-foreground" data-testid="text-bought-note">
                        إن نقص السعر أو الخبير فالقرار يُحفَظ كما هو، ويُتمّ البيع
                        تلقائياً حين يُكمل الموظّف ما ينقص — بلا سؤالٍ ثانٍ.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {EXAM_FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={`exam-${f.key}`}>{f.label}</Label>
              <Textarea
                id={`exam-${f.key}`}
                rows={f.key === "notes" ? 2 : 3}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                data-testid={`input-exam-${f.key}`}
              />
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            onClick={() => (priceMoved ? setConfirmPrice(true) : save.mutate())}
            disabled={!specialty || !hasContent || save.isPending}
            data-testid="button-save-medical-exam"
          >
            {save.isPending ? "جارٍ الحفظ…" : isEdit ? "حفظ التعديل" : "حفظ وتوقيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* ══ تأكيدُ تصحيحِ سعرٍ بعد البيع ═════════════════════════════════
          الحفظُ هنا يحرّك مالاً مقيَّداً في الدفتر، فلا يقع بضغطةٍ عابرة:
          يُعرض الرقمان والفرقُ وما سيتغيّر وما لن يتغيّر، ويُطلب السبب. */}
      <Dialog open={confirmPrice} onOpenChange={setConfirmPrice}>
        <DialogContent className="sm:max-w-[440px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-amber-900">تصحيح سعر بعد البيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1"
              data-testid="box-price-correction-figures">
              <div className="flex justify-between">
                <span className="text-muted-foreground">السعر الحالي:</span>
                <b>{priceNow.toLocaleString("en-US")} د.ع</b>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">السعر المصحح:</span>
                <b>{(priceNext ?? 0).toLocaleString("en-US")} د.ع</b>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-1">
                <span className="text-muted-foreground">الفرق:</span>
                <b className={(priceNext ?? 0) - priceNow >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {(priceNext ?? 0) - priceNow > 0 ? "+" : ""}
                  {((priceNext ?? 0) - priceNow).toLocaleString("en-US")} د.ع
                </b>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم تحديث كلفة هذا الجهاز وإجمالي حساب المريض. الدفعات السابقة وأمر
              التصنيع لن تتغير.
            </p>
            <div className="space-y-2">
              <Label htmlFor="price-correction-reason">سبب التصحيح *</Label>
              <Textarea
                id="price-correction-reason"
                rows={2}
                placeholder="خطأ في إدخال السعر أثناء المعاينة"
                value={priceCorrectionReason}
                onChange={(e) => setPriceCorrectionReason(e.target.value)}
                data-testid="input-price-correction-reason"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmPrice(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={priceCorrectionReason.trim().length === 0 || save.isPending}
              data-testid="button-confirm-price-correction"
            >
              {save.isPending ? "جارٍ الحفظ…" : "تأكيد التصحيح"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
