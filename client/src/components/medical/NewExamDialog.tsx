import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
      setSpecialty(exam.caseType as MedicalSpecialty);
      return;
    }
    setForm({ ...EMPTY_FORM });
    setRx({});
    setDeviceCost("");
    const wanted =
      preferSpecialty && specialties.includes(preferSpecialty as MedicalSpecialty)
        ? (preferSpecialty as MedicalSpecialty)
        : specialties.length === 1
          ? specialties[0]
          : "";
    setSpecialty(wanted);
  }, [open, exam?.id, preferSpecialty, specialties.join(",")]);

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
                تحدّدها أنت لأنك مَن يحدّد الجهاز. يبقى القبض وإسناد الخبير على الاستعلامات.
              </p>
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
