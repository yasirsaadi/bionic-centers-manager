// **«متابعة أو تعديل على جهاز قائم»** — خيارٌ في «ما سبب حضور المريض اليوم؟» (فصلُ الزرّين، قرارُ المالك ٢٠٢٦-٠٩-٣٠).
//
// كانت «تسجيل زيارة جديدة» تسجّل زيارةَ مريض الأطراف والمساند وترسلها للطبيب، وفيها «صيانة» بلا خبيرٍ ولا أمرٍ ولا أجور
// تُشبه «صيانة» الحقيقية في «سبب الحضور» — فيظنّ الموظّفُ أنه سجّل صيانةً والورشةُ لا تعلم. فانفصل البابان: كلُّ ما
// يخصّ الجهاز من «سبب الحضور»، و«تسجيل زيارة جلسة علاج طبيعي» للعلاج الطبيعي وحده.
//
// **وما كانت تفعله تلك انتقل إلى هنا بحرفه**: النقطةُ نفسُها (`POST /api/visits`)، والتاريخُ بقاعدته (حتى ٣ أيام
// للموظّف، وأقدمُ للمسؤول)، والجهازُ المقصود، ونوعُ المراجعة (متابعة · تعديل · أخرى)، ومسارُها (سريعة · كاملة)، وملاحظةٌ
// للطبيب. **ولا «صيانة» في أنواعها** — للصيانة خيارُها المستقلّ بأمرها وخبيرها وأجورها.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { Loader2, Calendar } from "lucide-react";
import { useAddVisit } from "@/hooks/use-patients";
import { useBranchSession } from "@/components/BranchGate";
import { DeviceEpisodeSelect, useDeviceEpisodes, UNALLOCATED } from "./DeviceEpisodeSelect";
import { ReviewPathPicker } from "@/components/medical/ReviewPathPicker";
import type { ReviewKind, ReviewPath } from "@shared/medical_review";
import { baghdadTodayYmd, checkVisitDate, VISIT_BACKDATE_STAFF_DAYS } from "@shared/visit_date";
import { DEVICE_FOLLOWUP_LABEL, DEVICE_FOLLOWUP_HINT } from "./reception_routing";
import { ATTENDANCE_REASONS } from "@shared/attendance";

/** أنواعُ المراجعة المتاحة هنا — بلا «صيانة» (خيارُها مستقلّ) ولا «جهاز جديد» ولا «عاد للشراء» (لكلٍّ خيارُه). */
export const DEVICE_FOLLOWUP_REVIEW_KINDS: readonly ReviewKind[] = ["follow_up", "adjustment", "other"];

const SERVICE_LABELS = { prosthetic: "أطراف صناعية", medical_support: "مساند طبية" } as const;

export function DeviceFollowupVisitDialog({
  patientId, branchId, serviceType, open, onOpenChange, mode = "followup",
}: {
  patientId: number;
  branchId: number;
  serviceType: "prosthetic" | "medical_support";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «تدريب على الجهاز» (§4.aw): النافذةُ نفسُها بلا مراجعة طبيب — السببُ «تدريب» يكتبه الخادم. */
  mode?: "followup" | "training";
}) {
  const training = mode === "training";
  const title = training ? ATTENDANCE_REASONS.training : DEVICE_FOLLOWUP_LABEL;
  const { mutate, isPending } = useAddVisit();
  const isAdmin = Boolean((useBranchSession() as any)?.isAdmin);

  const [date, setDate] = useState(baghdadTodayYmd());
  const [notes, setNotes] = useState("");
  const [device, setDevice] = useState("");
  const [reviewPath, setReviewPath] = useState<ReviewPath>("quick");
  const [reviewKind, setReviewKind] = useState<ReviewKind>("follow_up");
  const [reviewNote, setReviewNote] = useState("");
  const [dateError, setDateError] = useState<string | null>(null);

  const { data: cases = [] } = useQuery<{ id: number; caseType: string }[]>({
    queryKey: ["/api/patients/:id", patientId, "cases"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const caseId = cases.find((c) => c.caseType === serviceType)?.id ?? null;

  //  والزيارةُ تقبل أيَّ جهازٍ قائمٍ أو قيد الصنع — المتابعةُ تحدث أثناء التصنيع كما بعده.
  const { options: devices, hasOptions: needsDeviceChoice } = useDeviceEpisodes(
    patientId, serviceType, ["awaiting_exam", "examined", "in_manufacturing", "delivered"],
  );

  function submit() {
    const verdict = checkVisitDate(date || null, isAdmin);
    if (!verdict.ok) { setDateError(verdict.message); return; }
    setDateError(null);
    mutate({
      patientId, branchId,
      notes: notes.trim() || null,
      treatmentType: null,
      caseId,
      customDate: date || null,
      ...(needsDeviceChoice && device && device !== UNALLOCATED ? { deviceEpisodeId: Number(device) } : {}),
      //  **السببُ عنوانُ السطر** في سجلّ الزيارات (§4.aw).
      ...(training
        ? { visitReason: "training" }
        : { details: ATTENDANCE_REASONS.followup, reviewPath, reviewKind, reviewNote: reviewNote.trim() || undefined }),
    } as any, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl" data-testid={training ? "device-training-dialog" : "device-followup-dialog"}>
        <DialogHeader>
          <DialogTitle>{title} — {SERVICE_LABELS[serviceType]}</DialogTitle>
          {!training && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" data-testid="followup-not-expert-warning">
              {DEVICE_FOLLOWUP_HINT}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" /> تاريخ الزيارة</Label>
            <DatePickerIraq value={date} onChange={(v: string) => setDate(v)} data-testid="input-followup-date" />
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">
                زيارةٌ فاتت؟ اختر يومها — حتى {VISIT_BACKDATE_STAFF_DAYS} أيام، وأقدمُ من ذلك يسجّله المسؤول العام.
              </p>
            )}
            {dateError && <p className="text-xs text-destructive" data-testid="followup-date-error">{dateError}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>تفاصيل الزيارة</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="ماذا جرى في الزيارة؟" dir="auto" style={{ unicodeBidi: "plaintext" }}
              data-testid="input-followup-notes" />
          </div>

          {needsDeviceChoice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <DeviceEpisodeSelect
                label="الجهاز الذي تخصّه الزيارة"
                options={devices}
                value={device}
                onChange={setDevice}
                unallocatedLabel="زيارة عامّة / جهاز قديم"
                testId="select-followup-device"
              />
            </div>
          )}

          {!training && (
            <ReviewPathPicker
              path={reviewPath} onPathChange={setReviewPath}
              kind={reviewKind} onKindChange={setReviewKind}
              note={reviewNote} onNoteChange={setReviewNote}
              kinds={DEVICE_FOLLOWUP_REVIEW_KINDS}
            />
          )}

          <p className="text-[11px] text-muted-foreground rounded-md bg-slate-50 border px-3 py-2">
            للصيانة أو شراء جزء: عُد إلى «ما سبب حضور المريض اليوم؟» واختر خيارهما — يُفتح هناك أمرُ العمل بخبيره وأجوره.
          </p>

          <Button type="button" className="w-full" disabled={isPending} onClick={submit}
            data-testid="button-save-followup">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الزيارة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
