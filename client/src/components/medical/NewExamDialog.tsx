import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  onDone,
}: {
  patientId: number;
  patientName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected specialty — normally the one this patient is waiting on. */
  preferSpecialty?: string | null;
  onDone?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { specialties } = useDoctorGrant();

  const [specialty, setSpecialty] = useState<MedicalSpecialty | "">("");
  const [form, setForm] = useState<Record<ExamFieldKey, string>>({ ...EMPTY_FORM });

  // Reset on every open so a dismissed draft never leaks into the next patient —
  // these records are permanent once signed, so a stale field is a real hazard.
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY_FORM });
    const wanted =
      preferSpecialty && specialties.includes(preferSpecialty as MedicalSpecialty)
        ? (preferSpecialty as MedicalSpecialty)
        : specialties.length === 1
          ? specialties[0]
          : "";
    setSpecialty(wanted);
  }, [open, preferSpecialty, specialties.join(",")]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/medical/patients/${patientId}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ caseType: specialty, ...form }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر حفظ المعاينة");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      // The patient just left the doctor's queue — refresh it wherever it shows.
      queryClient.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      onOpenChange(false);
      toast({ title: "حُفظت المعاينة ووُقّعت باسمك" });
      onDone?.();
    },
    onError: (err: any) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const hasContent = Object.values(form).some((v) => v.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Stethoscope className="w-5 h-5" /> معاينة طبية جديدة
          </DialogTitle>
          {patientName && (
            <p className="text-sm text-muted-foreground text-right">{patientName}</p>
          )}
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              بعد الحفظ تُقفل المعاينة باسمك ولا يمكن تعديلها ولا حذفها. أي تصحيح لاحق
              يُضاف كملحق مؤرّخ.
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
            {save.isPending ? "جارٍ الحفظ…" : "حفظ وتوقيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
