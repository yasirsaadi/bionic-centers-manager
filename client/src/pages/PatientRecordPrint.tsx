// **«طباعة السجلّ الكامل»** (طلبُ المالك ٢٠٢٦-١٠-٠٨، §4.cv) — `/patient-record/print?patient=`.
//
// «نعمل قابليةَ طباعة سجلّ الزيارات إن لزمنا، مع اسم المريض وعمره وبتره أو علّته ومعلوماته الشخصية، لأننا ربما يُطلب منّا مستقبلاً
// سجلٌّ كامل بما فعل وأتى وعالج» — و«المدفوعاتُ واجبٌ أن تظهر، فهذه الورقةُ حين يطلبها المريض أو تُعطى له ستكون مرجعَه لكلّ ما حدث
// معه في مجموعة مراكز الدكتور ياسر الساعدي بالتفصيل». فالورقةُ ثلاثةُ أقسام: بياناتُه، ثمّ أجهزتُه، ثمّ زياراتُه كلُّها من أوّل يوم
// وتحت كلٍّ منها ما دُفع يومها — والدفعةُ بلا زيارةٍ سطرُ «دفعة» (`patientRecordRows`). والمالُ بقاعدة الاستمارة (`recordPayments`).
// والبياناتُ من البابين اللذين تقرؤهما صفحةُ المريض نفسُها (`/api/patients/:id` و`intake-sheets`) — شاشةٌ لا تحسب شيئاً يُعتمد.
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { useBranchSession } from "@/components/BranchGate";
import { usePatient } from "@/hooks/use-patients";
import { useIntakeSheets } from "@/components/intake/DeviceSheetsBox";
import { IntakeSheetHeader, SheetBand, SheetPair, SheetRow, SheetTable } from "@/components/intake/IntakeSheetFrame";
import { injuryDateDisplay } from "@shared/intake_sheet";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import { SHEET_STATUS_LABELS, sheetMoneyLine, sheetVisitPaidLine } from "@shared/intake_sheet_view";
import { patientRecordRows, recordPayments, visitDevicesFromSheets } from "@shared/visit_payments";
import { formatDateIraq, formatTimeIraq, cn } from "@/lib/utils";

const stamp = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const money = (n: number) => `${n.toLocaleString("en-US")} د.ع`;

function V({ children, testId }: { children: ReactNode; testId?: string }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn("min-h-[2.1rem] print:min-h-[1.5rem] flex items-center px-1.5 text-sm min-w-0 [overflow-wrap:anywhere]", empty && "text-slate-400")}
      dir="auto" style={{ unicodeBidi: "plaintext" }} data-testid={testId}>
      {empty ? "—" : children}
    </div>
  );
}

export default function PatientRecordPrint() {
  const session = useBranchSession() as any;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const patientId = Number(params.get("patient") ?? 0);
  const { data: patient, isLoading, error } = usePatient(patientId);
  const sheetsQ = useIntakeSheets(patientId, patientId > 0);
  const sheets = sheetsQ.data?.sheets ?? [];
  const ready = Boolean(patient) && !sheetsQ.isLoading;
  const printed = useRef(false);
  const printedAt = useMemo(() => stamp(new Date()), [patient, sheetsQ.data]);

  const goBack = () => {
    if (window.opener && !window.opener.closed) { window.close(); return; }
    if (window.history.length > 1) { window.history.back(); return; }
    navigate(patientId > 0 ? `/patients/${patientId}` : "/");
  };

  const record = useMemo(() => {
    if (!patient) return null;
    const p = patient as any;
    const deviceLabels = new Map(sheets.map((s) => [s.episodeId,
      `الجهاز #${s.sequenceNumber} — ${requestedItemLabel(s.requestedItem, s.serviceType, s.extraComponents)}`]));
    return patientRecordRows({
      visits: (p.visits ?? []).map((v: any) => ({
        id: v.id, date: v.visitDate ? String(v.visitDate) : null, details: v.details, notes: v.notes,
        treatmentType: v.treatmentType, deviceEpisodeId: v.deviceEpisodeId ?? null, caseId: v.caseId ?? null,
      })),
      payments: recordPayments(p.payments, sheetsQ.data?.canViewMoney)?.map((x: any) => ({
        id: x.id, amount: Number(x.amount ?? 0), date: x.date ? String(x.date) : null, visitId: x.visitId ?? null,
        deviceEpisodeId: x.deviceEpisodeId ?? null, caseId: x.caseId ?? null, notes: x.notes,
        description: x.displayDescription ?? null, treatmentType: x.paymentTreatmentType ?? null,
      })) ?? null,
      deviceLabels, visitDevices: visitDevicesFromSheets(sheets),
    });
  }, [patient, sheets, sheetsQ.data?.canViewMoney]);

  useEffect(() => {
    if (!ready || !record || printed.current) return;
    printed.current = true;
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); }))))
      .then(() => setTimeout(() => window.print(), 300));
  }, [ready, record]);

  const p = patient as any;
  const departments = p ? [p.isAmputee && "أطراف صناعية", p.isMedicalSupport && "مساند طبية", p.isPhysiotherapy && "علاج طبيعي"].filter(Boolean).join(" · ") : "";
  //  حالةُ العلاج الطبيعي من حقوله — لا `medicalCondition` (رمزُ القسم الداخليّ «amputee»/«physiotherapy» لا يُطبع للمريض).
  const has = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
  const condition = p ? [has(p.diseaseType) ? p.diseaseType : null, has(p.injuryType) ? `نوع الإصابة: ${p.injuryType}` : null,
    has(p.injuryArea) ? `منطقة الإصابة: ${p.injuryArea}` : null].filter(Boolean).join(" — ") : "";
  const support = p ? [p.supportType, p.injurySide && `الجهة: ${p.injurySide}`].filter(Boolean).join(" — ") : "";
  const referral = p ? [p.referralSource, p.referralSubSource].filter(Boolean).join(" — ") : "";
  const withMoney = record?.totalPaid !== null && record?.totalPaid !== undefined;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
@page { size: A4 portrait; margin: 9mm; }
@media print {
  html, body { background: #fff !important; }
  .no-print { display: none !important; }
  .sheet-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`}</style>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 bg-white border-b px-3 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }} data-testid="record-print-toolbar">
        <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-record-back">
          <ArrowRight className="w-4 h-4" /> رجوع
        </Button>
        <Button size="sm" className="h-9 gap-1" onClick={() => window.print()} disabled={!ready} data-testid="button-record-print-now">
          <Printer className="w-4 h-4" /> طباعة
        </Button>
      </div>
      {(isLoading || (patient && sheetsQ.isLoading)) && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
      {!isLoading && (error || !patient) && (
        <p className="text-center text-sm text-red-700 py-20" data-testid="record-print-missing">تعذّر تحميل ملفّ المريض</p>
      )}
      {ready && p && record && (
        <div className="sheet-page mx-auto my-4 w-[210mm] max-w-full bg-white shadow p-[9mm]" data-testid="record-print-page">
          <IntakeSheetHeader branchName={sheetsQ.data?.patient.branchName ?? null} title="السجلّ الكامل للمريض" />
          <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600 mb-2 px-0.5">
            <span>رقم الملف: <b dir="ltr">{p.patientCode ?? "—"}</b></span>
            <span>تاريخ التسجيل: <bdi dir="ltr">{p.createdAt ? formatDateIraq(p.createdAt) : "—"}</bdi></span>
          </div>

          <SheetTable>
            <SheetBand>البيانات الشخصية</SheetBand>
            <SheetPair>
              <SheetRow label="الاسم"><V testId="record-v-name">{p.name}</V></SheetRow>
              <SheetRow label="العمر"><V testId="record-v-age">{p.age}</V></SheetRow>
            </SheetPair>
            <SheetPair>
              <SheetRow label="رقم الهاتف"><V><span dir="ltr">{p.phone}</span></V></SheetRow>
              <SheetRow label="المحافظة"><V>{p.governorate}</V></SheetRow>
            </SheetPair>
            <SheetRow label="العنوان"><V>{p.address}</V></SheetRow>
            <SheetPair>
              <SheetRow label="الوزن (كغم)"><V>{p.weight}</V></SheetRow>
              <SheetRow label="الطول (سم)"><V>{p.height}</V></SheetRow>
            </SheetPair>
            <SheetPair>
              <SheetRow label="سبب الإصابة"><V>{p.injuryCause}</V></SheetRow>
              <SheetRow label="تاريخ الإصابة"><V>{p.injuryDate ? formatDateIraq(p.injuryDate) : injuryDateDisplay(null, p.injuryDateStatus)}</V></SheetRow>
            </SheetPair>
            <SheetRow label="الأقسام"><V testId="record-v-departments">{departments}</V></SheetRow>
            {p.isAmputee && <SheetRow label="البتر"><V testId="record-v-amputation">{p.amputationSite}</V></SheetRow>}
            {p.isMedicalSupport && <SheetRow label="المسند"><V>{support}</V></SheetRow>}
            {p.isPhysiotherapy && <SheetRow label="الحالة المرضية"><V testId="record-v-condition">{condition}</V></SheetRow>}
            <SheetRow label="الجهة المحوِّلة"><V>{referral}</V></SheetRow>
          </SheetTable>

          {sheets.length > 0 && (
            <SheetTable className="mt-3">
              <SheetBand>الأجهزة</SheetBand>
              {sheets.map((s) => (
                <div key={s.episodeId} className="border-b border-slate-700 last:border-b-0 px-2 py-1.5 text-sm print:break-inside-avoid" data-testid={`record-device-${s.episodeId}`}>
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <b>الجهاز #{s.sequenceNumber} — {requestedItemLabel(s.requestedItem, s.serviceType, s.extraComponents)}</b>
                    <span className="text-xs text-slate-600">
                      {SHEET_STATUS_LABELS[s.status] ?? s.status}{s.soldReady ? " · جاهز بلا أمر تصنيع" : ""}
                      {s.openedAt ? <> · طُلب في <bdi dir="ltr">{formatDateIraq(s.openedAt)}</bdi></> : null}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700" data-testid={`record-device-money-${s.episodeId}`}>{sheetMoneyLine(s)}</div>
                </div>
              ))}
            </SheetTable>
          )}

          <SheetTable className="mt-3">
            <SheetBand>سجلّ الزيارات{withMoney ? " والمدفوعات" : ""}</SheetBand>
            <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8.5rem_1fr] print:grid-cols-[8.5rem_1fr] text-sm" data-testid="record-rows">
              <div className="border-b border-l border-slate-700 px-2 py-1.5 font-semibold text-center">التاريخ</div>
              <div className="border-b border-slate-700 px-2 py-1.5 font-semibold text-center">ما حدث</div>
              {record.rows.length === 0 ? (
                <div className="col-span-2 px-2 py-2 text-center text-slate-400">لا زيارات مسجّلة</div>
              ) : record.rows.map((r, i) => (
                <div key={r.key} className="contents" data-testid={`record-row-${r.key}`}>
                  <div className={cn("border-l border-slate-700 px-2 py-1 text-center text-xs print:break-inside-avoid", i < record.rows.length - 1 && "border-b")}>
                    <div dir="ltr">{r.date ? formatDateIraq(r.date) : "—"}</div>
                    {r.date && <div className="text-slate-500">{formatTimeIraq(r.date)}</div>}
                  </div>
                  <div className={cn("px-2 py-1 min-w-0 [overflow-wrap:anywhere] print:break-inside-avoid", i < record.rows.length - 1 && "border-b border-slate-700", r.kind === "payment" && "bg-slate-50")}
                    dir="auto" style={{ unicodeBidi: "plaintext" }}>
                    <div className="font-medium">{r.title}</div>
                    {r.notes && <div className="text-xs text-slate-600">{r.notes}</div>}
                    {r.device && <div className="text-xs text-slate-500">{r.device}</div>}
                    {sheetVisitPaidLine({ paid: r.paid }) && (
                      <div className={cn("text-xs font-semibold", (r.paid ?? 0) < 0 ? "text-red-700" : "text-emerald-700")} data-testid={`record-paid-${r.key}`}>
                        {sheetVisitPaidLine({ paid: r.paid })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {withMoney && (
              <div className="border-t-2 border-slate-700 px-2 py-1.5 text-sm font-semibold" data-testid="record-total-paid">
                مجموع ما دُفع: {money(record.totalPaid ?? 0)}
              </div>
            )}
          </SheetTable>

          <div className="mt-3 flex justify-between text-[11px] text-slate-500" data-testid="record-print-footer">
            <span>طُبع في <bdi dir="ltr">{printedAt}</bdi>{session?.displayName ? ` — بواسطة ${session.displayName}` : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
