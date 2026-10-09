// **مستطيلُ «استمارة العلاج الطبيعي» في بطاقة القسم، و«عرض الاستمارة»** (§4.da — المرحلةُ الثالثة).
//
// كمستطيل الأجهزة (`DeviceSheetsBox`): سطرٌ مضغوط بما يلزم النظرةَ الأولى — «سبب المراجعة»، وآخرُ معاينةٍ بتشخيصها وسطرِ تقييمها،
// والخطّة — وزرُّ «عرض الاستمارة» يفتح الورقةَ مكتملةً (`PhysioSheetView`)، ومنها «طباعة» (`/physio-sheet/print`).
// والمصدرُ بابُ الخادم الواحد — فلا يختلف المستطيلُ عن الورقة ولا الورقةُ عن المطبوع.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { navigate } from "wouter/use-browser-location";
import { ArrowRight, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { physioPlanLine, type PhysioSheetResponse } from "@shared/physio_sheet_view";
import { PhysioSheetView } from "./PhysioSheetView";
import { formatDateIraq } from "@/lib/utils";

export const physioSheetKey = (patientId: number) => [`/api/patients/${patientId}/physio-sheet`];

export function usePhysioSheet(patientId: number, enabled = true) {
  return useQuery<PhysioSheetResponse>({ queryKey: physioSheetKey(patientId), enabled });
}

/** صفحةُ الطباعة — على الحاسوب في تبويبٍ جديد، وعلى الهاتف والتطبيق المثبَّت في مكانها (كـ`openIntakeSheetPrint`). */
export function openPhysioSheetPrint(patientId: number) {
  const url = `/physio-sheet/print?patient=${patientId}`;
  const mq = (q: string) => typeof window.matchMedia === "function" && window.matchMedia(q).matches;
  const inPlace = mq("(display-mode: standalone)") || (navigator as any).standalone === true || mq("(pointer: coarse)") || mq("(max-width: 767px)");
  if (inPlace) navigate(url);
  else window.open(url, "_blank");
}

export function PhysioSheetBox({ patientId }: { patientId: number }) {
  const { data } = usePhysioSheet(patientId);
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const latest = data.exams[0] ?? null;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-2.5 space-y-1.5" data-testid="physio-sheet-box">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">استمارة العلاج الطبيعي</p>
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpen(true)} data-testid="button-view-physio-sheet">
          <FileText className="w-3.5 h-3.5" /> عرض الاستمارة
        </Button>
      </div>
      <div className="grid gap-1 text-xs">
        <div className="min-w-0" data-testid="physio-box-complaint">
          <span className="text-muted-foreground">سبب المراجعة: </span>
          <span className={data.patient.presentingComplaint ? "font-medium" : "text-slate-400"} dir="auto">{data.patient.presentingComplaint ?? "—"}</span>
        </div>
        <div className="min-w-0" data-testid="physio-box-exam">
          <span className="text-muted-foreground">آخر معاينة: </span>
          {latest
            ? <span className="font-medium" dir="auto">{latest.diagnosis ?? "—"}<span className="text-muted-foreground font-normal"> — {latest.doctorName}{latest.signedAt ? `، ${formatDateIraq(latest.signedAt)}` : ""}</span></span>
            : <span className="text-slate-400">لم تُوقَّع بعد</span>}
        </div>
        {latest?.assessmentSummary && (
          <div className="min-w-0 text-slate-600" data-testid="physio-box-assessment">{latest.assessmentSummary}</div>
        )}
        {data.canViewPlan && (
          <div className="min-w-0" data-testid="physio-box-plan">
            <span className="text-muted-foreground">الخطة: </span>
            {data.plan ? <span className="font-medium">{physioPlanLine(data.plan).main} <span className="text-muted-foreground font-normal">({data.plan.statusLabel})</span></span>
              : <span className="text-slate-400">لم تُكتب بعد</span>}
          </div>
        )}
      </div>

      {/*  **على الهاتف تملأ الشاشة، ورأسُها ثابتٌ تحت الجزيرة بزرّين ظاهرين: «رجوع» و«طباعة»** — كنافذة استمارة الأجهزة (§4.cr). */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent mobileFullScreen hideClose className="grid-cols-1 sm:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden gap-0 p-0 sm:p-0" dir="rtl"
          data-testid="dialog-physio-sheet">
          <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between gap-2 space-y-0 border-b bg-white px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-5 sm:pt-3">
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1" onClick={() => setOpen(false)} data-testid="button-physio-sheet-back">
              <ArrowRight className="w-4 h-4" /> رجوع
            </Button>
            <DialogTitle className="text-base">استمارة مراجع — علاج طبيعي</DialogTitle>
            <Button type="button" size="sm" className="h-9 gap-1" onClick={() => openPhysioSheetPrint(patientId)} data-testid="button-print-physio-sheet">
              <Printer className="w-4 h-4" /> طباعة
            </Button>
          </DialogHeader>
          <div className="p-3 sm:p-5">
            {open && <PhysioSheetView data={data} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
