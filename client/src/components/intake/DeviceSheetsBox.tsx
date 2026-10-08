// **مستطيلُ أجهزة القسم ومواصفاتها، و«عرض الاستمارة»** (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨).
//
// «معلوماتُ الطرف — نوعُه والسوكيت والقدم وغيرها — التي أدخلتُها أو أدخلها الاستعلاماتُ قبل الحسم لا تظهر في صفحة المريض؛ خصّص لها مستطيلاً
// واضحاً بمساحةٍ ليست كبيرة لمراجعة أنواع أطراف ومساند المرضى بسهولة». و«لا يوجد زرّ معاينة الاستمارة ليشاهدها الموظّفُ والطبيبُ ومديرُ الفرع».
// فلكلّ جهازٍ سطرٌ مضغوط: رقمُه والمطلوبُ وحالُه، ثمّ خاناتُه الخمس (أو نوعُ المسند) كما في ورقته، وزرُّ «عرض الاستمارة» يفتح الورقةَ مكتملةً
// ومنها «طباعة». والمصدرُ بابُ الخادم الواحد — الطبيبُ أوّلاً وما ملأه الاستعلاماتُ يسدّ الفراغ — فلا يختلف المستطيلُ عن الورقة.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { navigate } from "wouter/use-browser-location";
import { ArrowRight, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import { SHEET_STATUS_LABELS, sheetSpecRows, type IntakeSheet, type IntakeSheetsResponse } from "@shared/intake_sheet_view";
import { IntakeSheetView } from "./IntakeSheetView";
import { useBranchSession } from "@/components/BranchGate";
import { AdministrativeReversalDialog } from "@/components/AdministrativeReversalDialog";
import { hasRole } from "@shared/user_roles";
import { ADMIN_VOID_BADGE } from "@shared/administrative_reversal";

export const intakeSheetsKey = (patientId: number) => [`/api/patients/${patientId}/intake-sheets`];

export function useIntakeSheets(patientId: number, enabled = true) {
  return useQuery<IntakeSheetsResponse>({ queryKey: intakeSheetsKey(patientId), enabled });
}

/**
 * **صفحةُ الطباعة** — الورقةُ وحدها بلا إطار التطبيق.
 * على الحاسوب في تبويبٍ جديد (ملفُّ المريض باقٍ خلفه). **وعلى الهاتف أو التطبيق المثبَّت في النافذة نفسِها**: التبويبُ الجديد هناك
 * يُفتح داخل التطبيق بلا شريط متصفّحٍ ولا رجوع (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨) — فتُفتح في مكانها و«رجوع» فيها يعيد إلى الملفّ.
 */
function openPrintPage(url: string) {
  const mq = (q: string) => typeof window.matchMedia === "function" && window.matchMedia(q).matches;
  const inPlace = mq("(display-mode: standalone)") || (navigator as any).standalone === true || mq("(pointer: coarse)") || mq("(max-width: 767px)");
  if (inPlace) navigate(url);
  else window.open(url, "_blank");
}

export function openIntakeSheetPrint(patientId: number, episodeId: number) {
  openPrintPage(`/intake-sheet/print?patient=${patientId}&episode=${episodeId}`);
}

/** **«طباعة السجلّ الكامل»** (§4.cv) — بالقاعدة نفسِها. */
export function openPatientRecordPrint(patientId: number) {
  openPrintPage(`/patient-record/print?patient=${patientId}`);
}

export function DeviceSheetsBox({ patientId, caseType }: { patientId: number; caseType: string }) {
  const { data } = useIntakeSheets(patientId);
  //  **الورقةُ المفتوحة برقم جهازها لا بصورتها** (§4.cv) — فإن تحرّكت بياناتُها وهي مفتوحة (دفعةٌ أو زيارةٌ أو تصحيح) قُرئت من الاستعلام
  //  المحدَّث، لا من لقطةٍ أُخذت لحظةَ الضغط.
  const [openId, setOpenId] = useState<number | null>(null);
  //  ══ **بيعُ الأجزاء الجاهزة «بلا معاينة» يُصحَّح من هنا** (§4.cu) — لا أمرَ تصنيعٍ يحمل زرَّه. والحجبُ عرضٌ لا إذن: الخادمُ يفحص. ══
  const session = useBranchSession();
  const mayReverse = Boolean((session as any)?.isAdmin) || hasRole(session as any, "branch_manager");
  const [reverseEpisodeId, setReverseEpisodeId] = useState<number | null>(null);
  const sheets = (data?.sheets ?? []).filter((s) => s.serviceType === caseType);
  const open: IntakeSheet | null = sheets.find((s) => s.episodeId === openId) ?? null;
  if (!data || sheets.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.03] p-2.5 space-y-2" data-testid={`device-sheets-${caseType}`}>
      <p className="text-sm font-semibold text-primary">{caseType === "prosthetic" ? "الأطراف ومواصفاتها" : "المساند ومواصفاتها"}</p>
      {sheets.map((s) => (
        <div key={s.episodeId} className="rounded-lg bg-white border p-2" data-testid={`device-sheet-row-${s.episodeId}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              الجهاز #{s.sequenceNumber} — {requestedItemLabel(s.requestedItem, s.serviceType, s.extraComponents)}
              <span className="text-xs text-muted-foreground font-normal"> · {SHEET_STATUS_LABELS[s.status] ?? s.status}</span>
              {s.soldReady && <span className="text-xs text-emerald-700 font-normal" data-testid={`device-sold-ready-${s.episodeId}`}> · جاهز بلا أمر تصنيع</span>}
              {s.adminVoided && <span className="text-xs text-red-700 font-normal"> · {ADMIN_VOID_BADGE}</span>}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mayReverse && s.readyReversible && (
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-800"
                  onClick={() => setReverseEpisodeId(s.episodeId)} data-testid={`button-reverse-ready-${s.episodeId}`}>
                  تصحيح / إلغاء العملية
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setOpenId(s.episodeId)}
                data-testid={`button-view-sheet-${s.episodeId}`}>
                <FileText className="w-3.5 h-3.5" /> عرض الاستمارة
              </Button>
            </div>
          </div>
          {(s.amputationSite || s.injurySide) && (
            <p className="text-xs text-muted-foreground mt-0.5" data-testid={`device-site-${s.episodeId}`}>
              {s.amputationSite ? `موقع البتر: ${s.amputationSite}` : `الجهة: ${s.injurySide}`}
            </p>
          )}
          <div className={`mt-1.5 grid gap-x-3 gap-y-1 text-xs ${s.serviceType === "prosthetic" ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-1"}`}>
            {sheetSpecRows(s).map((r) => (
              <div key={r.key} className="min-w-0" data-testid={`device-spec-${s.episodeId}-${r.key}`}>
                <span className="text-muted-foreground">{r.label}: </span>
                <span className={r.value ? "font-medium" : "text-slate-400"} dir="auto">{r.value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <AdministrativeReversalDialog
        open={reverseEpisodeId !== null}
        onOpenChange={(v) => { if (!v) setReverseEpisodeId(null); }}
        patientId={patientId}
        target={{ episodeId: reverseEpisodeId }}
      />

      {/*  **على الهاتف تملأ الشاشة، ورأسُها ثابتٌ تحت الجزيرة بزرّين ظاهرين: «رجوع» و«طباعة»** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨: «لا يوجد
          زرّ عودة، والإغلاقُ في الأعلى في حافّة الهاتف») — بدل «X» صغيرةٍ في الزاوية. وعلى الحاسوب الرأسُ نفسُه أعلى النافذة. */}
      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        <DialogContent mobileFullScreen hideClose className="grid-cols-1 sm:max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden gap-0 p-0 sm:p-0" dir="rtl"
          data-testid="dialog-intake-sheet">
          <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between gap-2 space-y-0 border-b bg-white px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-5 sm:pt-3">
            <Button type="button" variant="outline" size="sm" className="h-9 gap-1" onClick={() => setOpenId(null)} data-testid="button-sheet-back">
              <ArrowRight className="w-4 h-4" /> رجوع
            </Button>
            <DialogTitle className="text-base">استمارة المراجع</DialogTitle>
            <Button type="button" size="sm" className="h-9 gap-1" disabled={!open}
              onClick={() => { if (open) openIntakeSheetPrint(patientId, open.episodeId); }} data-testid="button-print-sheet">
              <Printer className="w-4 h-4" /> طباعة
            </Button>
          </DialogHeader>
          <div className="p-3 sm:p-5">
            {open && data && <IntakeSheetView patient={data.patient} sheet={open} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
