import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAmputationSite, parseInjuries } from "@shared/case_fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [expertUserId, setExpertUserId] = useState<string>("");
  const [prefilled, setPrefilled] = useState(false);

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

  // Cost belongs to the doctor for a DEVICE only: they specify the prosthesis or
  // the support, so they know its price. Physiotherapy is left exactly as it
  // was — priced per session by reception in «الكلفة والجلسات».
  // Declared above the mutation that reads it, so the dependency is obvious.
  const isDeviceSpecialty = specialty === "prosthetic" || specialty === "medical_support";

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
      onOpenChange(false);
      toast({
        title: isEdit ? "حُفظ التعديل والنسخة السابقة محفوظة" : "حُفظت المعاينة ووُقّعت باسمك",
        // The server could not retire the superseded case (it already carries a
        // work order or tagged payments) — the doctor has to know both are open.
        description: saved?.switchNote ?? undefined,
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
              <Input
                id="exam-device-cost"
                inputMode="numeric"
                placeholder="مثال: 1,500,000"
                value={deviceCost}
                onChange={(e) => setDeviceCost(e.target.value.replace(/[^\d,]/g, ""))}
                className="bg-white"
                data-testid="input-exam-device-cost"
              />
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
                    مسح الاقتراح
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  اقتراح فقط: يظهر لموظف الاستعلامات مملوءاً ويمكنه إبقاؤه أو تغييره.
                  وإن تركته فارغاً يختاره هو.
                </p>
              </div>
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
            onClick={() => save.mutate()}
            disabled={!specialty || !hasContent || save.isPending}
            data-testid="button-save-medical-exam"
          >
            {save.isPending ? "جارٍ الحفظ…" : isEdit ? "حفظ التعديل" : "حفظ وتوقيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
