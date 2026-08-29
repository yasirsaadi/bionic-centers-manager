import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/hooks/use-toast";
import { PROSTHETIC_SPECS, SUPPORT_SPECS, buildAmputationSite } from "@shared/case_fields";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { Stethoscope } from "lucide-react";
import { invalidatePatientData } from "@/lib/queryClient";
import { resolveDialogService } from "@/pages/patient_registry_assignment";
import {
  ServiceDiscountFields, EMPTY_DISCOUNT, hasDiscount, discountPayload,
  discountBlocked, type DiscountDraft,
} from "@/components/ServiceDiscountFields";

// Post-exam "تخصيص الطرف/المسند": the doctor decided the device specs and the
// patient agreed to buy, so reception records the specs + the agreed price and
// assigns the expert — all in ONE step. No delivery date here (the expert
// commits to it at the mold stage); the assignment date is automatic.
interface Expert { id: number; displayName: string }
type PatientLite = {
  id: number; branchId: number; name: string;
  isAmputee?: boolean | null; isMedicalSupport?: boolean | null;
  /**
   * الخدمات التي **ما زالت** قابلة للتخصيص — يحسبها السجلّ بطرح ما له
   * أمرُ بناءٍ فعّال. فلا تُعرَض خدمةٌ أُسنِدت فعلاً، ولا يُطلَب اختيارٌ
   * حين لا يبقى إلا واحدة. والخادم يبقى صاحب القرار على أي حال.
   */
  assignableServices?: ("prosthetic" | "medical_support")[];
};


export function AssignExpertDialog({ patient, open, onOpenChange }: {
  patient: PatientLite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useBranchSession();
  const permissions = usePermissions();
  // Same rule as the registration form: clinical fields are the doctor's;
  // branch managers / doctors / admin may still edit the gaps (the legacy
  // escape hatch), reception may not — they get a read-only summary of the
  // doctor's decision plus the two things that are theirs: price and expert.
  const canEditClinicalDetails =
    Boolean(session?.isAdmin) ||
    session?.role === "branch_manager" ||
    session?.role === "doctor" ||
    permissions.canWriteMedicalExam;
  const [expertUserId, setExpertUserId] = useState<number | null>(null);
  const [cost, setCost] = useState<number>(0);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  // A patient can carry BOTH flags (طرف + مسند): the user must pick which
  // service this تخصيص is for; one remaining service skips the choice.
  //  ما يقوله السجلّ يسود على الأعلام: مريضٌ يحمل الاثنين لكن أحدهما
  //  مُسنَد فعلاً ليس صاحب اختيار — خدمةٌ واحدة بقيت له.
  const [serviceChoice, setServiceChoice] = useState<"prosthetic" | "medical_support" | null>(null);
  const [discount, setDiscount] = useState<DiscountDraft>(EMPTY_DISCOUNT);
  const { needsChoice: dualFlag, serviceType } = resolveDialogService({
    offered: patient?.assignableServices,
    isAmputee: patient?.isAmputee,
    isMedicalSupport: patient?.isMedicalSupport,
    choice: serviceChoice,
  });
  const isSupport = serviceType === "medical_support";
  const specFields = isSupport ? SUPPORT_SPECS : PROSTHETIC_SPECS;

  const { data: experts = [], isLoading } = useQuery<Expert[]>({
    queryKey: ["/api/manufacturing/experts", patient?.branchId],
    enabled: open && !!patient,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${patient!.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // The doctor's signed decision for THIS service, if one exists. Reception no
  // longer re-types the specs from a paper note: they arrive pre-filled and
  // attributed, and reception is left with the two things that are actually
  // theirs — the agreed price and the expert.
  const { data: examData } = useQuery<{ exams: any[] }>({
    queryKey: [`/api/medical/patients/${patient?.id}/exams`],
    enabled: open && !!patient,
    queryFn: async () => {
      const res = await fetch(`/api/medical/patients/${patient!.id}/exams`, { credentials: "include" });
      if (!res.ok) return { exams: [] };
      return res.json();
    },
  });
  // Exams come back newest-first, so the first match is the current decision.
  const rxExam = (examData?.exams ?? []).find((e: any) => e.caseType === serviceType);
  const prescribedBy: string | null = rxExam?.doctorName ?? null;
  // The doctor's PROPOSED price. It lives only on the exam until this dialog's
  // save — the one write that books a device sale (case cost + total_cost) —
  // so a patient who never comes back to pay leaves the accounts untouched.
  const proposedCost: number | null =
    typeof rxExam?.deviceCost === "number" && rxExam.deviceCost > 0 ? rxExam.deviceCost : null;
  // No signed exam for this service ⇒ تخصيص is locked. Assigning an expert to
  // an unexamined patient has no clinical basis — the exam is what says which
  // device to build. The server enforces the same rule; this is the courteous
  // version of its 409. (examsLoaded avoids flashing the lock while fetching.)
  // EXCEPT legacy patients (registered before the exam system): the server
  // exempts them, so this dialog opens fully — reception completes specs and
  // enters the cost directly, exactly as the pre-exam workflow worked.
  const examsLoaded = examData !== undefined;
  const legacyExempt = Boolean((examData as any)?.legacyExempt);
  const examMissing = examsLoaded && !rxExam && !legacyExempt;
  // A legacy patient WITH a voluntary exam still follows the doctor's word.
  const legacyOpen = legacyExempt && examsLoaded && !rxExam;
  // What the doctor actually determined, as label/value lines — including the
  // amputation builder's composed site, which lives in the prescription but
  // NOT in the seven spec inputs, so it was invisible here before.
  const rx: Record<string, any> = rxExam?.prescription ?? {};
  const doctorLines: { label: string; value: string }[] = [];
  if (!isSupport && typeof rx.amputationType === "string" && rx.amputationType) {
    const site = buildAmputationSite(rx);
    if (site) doctorLines.push({ label: "موقع البتر", value: site });
  }
  for (const f of specFields) {
    const v = rx[f.key];
    if (typeof v === "string" && v.trim()) doctorLines.push({ label: f.label, value: v });
  }
  if (typeof rx.injurySide === "string" && rx.injurySide.trim()) {
    doctorLines.push({ label: "جهة الإصابة", value: rx.injurySide });
  }

  useEffect(() => {
    if (!open || !rxExam?.prescription) return;
    const seeded: Record<string, string> = {};
    for (const f of specFields) {
      const v = rxExam.prescription[f.key];
      if (typeof v === "string" && v.trim()) seeded[f.key] = v;
    }
    // Only seed fields reception hasn't already typed into.
    if (Object.keys(seeded).length > 0) setSpecs((prev) => ({ ...seeded, ...prev }));
  }, [open, rxExam?.id, serviceType]);

  // Seed the price the same way: the doctor's proposal fills the empty field,
  // and anything reception already typed wins.
  useEffect(() => {
    if (!open || proposedCost == null) return;
    setCost((prev) => (prev > 0 ? prev : proposedCost));
  }, [open, rxExam?.id, serviceType, proposedCost]);

  // …and the expert the doctor suggested. Reception stays free to change it;
  // this only spares them re-picking what the doctor already decided.
  const proposedExpertId: number | null =
    typeof rxExam?.proposedExpertUserId === "number" ? rxExam.proposedExpertUserId : null;
  const proposedExpertName = experts.find((e) => e.id === proposedExpertId)?.displayName ?? null;
  useEffect(() => {
    if (!open || proposedExpertId == null) return;
    setExpertUserId((prev) => prev ?? proposedExpertId);
  }, [open, rxExam?.id, serviceType, proposedExpertId]);

  function resetState() {
    setExpertUserId(null); setCost(0); setSpecs({}); setServiceChoice(null);
    setDiscount(EMPTY_DISCOUNT);
  }

  //  **السعرُ الأصلي هو ما سيحسبه الخادم**: سعرُ الطبيب لمن لا يكتب سريرياً،
  //  والمكتوبُ في الحقل لمن يكتب. فالفرقُ المعروض هو الفرقُ المحفوظ.
  const originalPrice = (canEditClinicalDetails || legacyOpen)
    ? cost : (proposedCost ?? 0);

  const assign = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patient!.id}/assign-manufacturing`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          expertUserId, cost, serviceType, ...specs,
          //  بلا خصمٍ لا يُرسَل الحقل — فالتخصيصُ المعتاد يمرّ كما كان تماماً.
          ...(hasDiscount(discount, originalPrice)
            ? { discount: discountPayload(discount) } : {}),
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.message || "تعذّر التخصيص"); }
      return res.json();
    },
    onSuccess: (data: any) => {
      invalidatePatientData(queryClient, patient!.id);
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      toast({ title: "تم التخصيص وإسناد الخبير", description: "سُجّلت المواصفات والكلفة وأمر التصنيع. يحدّد الخبير تاريخ التسليم عند أخذ القالب." });
      resetState();
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "تعذّر التخصيص", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-primary">تخصيص {isSupport ? "المسند" : "الطرف"} وإسناد الخبير{patient ? ` — ${patient.name}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
            بعد الفحص وموافقة المريض على الشراء: أدخِل ما حدّده الطبيب، الكلفة، والخبير. تاريخ التسليم يحدّده الخبير لاحقاً عند أخذ القالب.
          </p>

          {dualFlag && (
            <div className="space-y-1">
              <label className="text-sm font-semibold">نوع الخدمة <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={serviceChoice === "prosthetic" ? "default" : "outline"} onClick={() => { setServiceChoice("prosthetic"); setSpecs({}); setCost(0); }} data-testid="choose-prosthetic">أطراف صناعية</Button>
                <Button type="button" size="sm" variant={serviceChoice === "medical_support" ? "default" : "outline"} onClick={() => { setServiceChoice("medical_support"); setSpecs({}); setCost(0); }} data-testid="choose-support">مساند طبية</Button>
              </div>
            </div>
          )}

          {examMissing && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="notice-exam-required">
              <b>لا يمكن التخصيص قبل معاينة الطبيب.</b>{" "}
              {isSupport ? "المريض بانتظار معاينة مساند طبية" : "المريض بانتظار معاينة أطراف صناعية"} —
              بعد توقيعها تظهر هنا مواصفات الطبيب وكلفته المقترحة. (صيانة جهازٍ موجود تُفتح
              من نافذة تسجيل الزيارة.)
            </div>
          )}

          {prescribedBy && (
            <div className="rounded-lg border border-teal-300 bg-teal-50/60 p-2.5 text-xs text-teal-900 flex gap-2">
              <Stethoscope className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {canEditClinicalDetails
                  ? <>ما حدّده <b>{prescribedBy}</b> ثابت للقراءة — الحقول الفارغة فقط يمكنك إكمالها عند الحاجة. تبقى الكلفة وإسناد الخبير.</>
                  : <>هذا قرار <b>{prescribedBy}</b> الموقّع. دورك هنا: اعتماد الكلفة وإسناد الخبير.</>}
              </span>
            </div>
          )}

          {/* What the doctor determined — one read-only box for everyone, so
              reception UNDERSTANDS the decision (site, specs, side) without
              being handed clinical inputs that registration already hides
              from them. */}
          {doctorLines.length > 0 && (
            <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 space-y-1" data-testid="doctor-decision-summary">
              <div className="text-xs font-bold text-teal-900 mb-1">
                ما حدّده {prescribedBy ?? "الطبيب"} في المعاينة
              </div>
              {doctorLines.map((l) => (
                <div key={l.label} className="text-sm flex gap-2">
                  <span className="text-muted-foreground shrink-0 min-w-[110px]">{l.label}:</span>
                  <span dir="auto" style={{ unicodeBidi: "plaintext" }}>{l.value}</span>
                </div>
              ))}
            </div>
          )}

          {legacyOpen && (
            <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700" data-testid="notice-legacy-exempt">
              <b>ملف قديم — مسجَّل قبل نظام المعاينة، مستثنى منها.</b>{" "}
              أكمِل المواصفات والكلفة وأسنِد الخبير مباشرة. (ويبقى بإمكان الطبيب معاينته متى لزم.)
            </div>
          )}

          {/* The EDITABLE clinical inputs exist only for the roles that may
              write clinical data anywhere (manager / doctor / admin) — the
              legacy escape for gaps the doctor left blank. Reception never
              sees an editable clinical field here, mirroring the registration
              form; the server enforces the same — EXCEPT on legacy files,
              where there is no doctor decision to protect. */}
          {(canEditClinicalDetails || legacyOpen) && specFields.map((f) => {
            const doctorValue = rx[f.key];
            const fromDoctor = typeof doctorValue === "string" && doctorValue.trim().length > 0;
            if (fromDoctor) return null; // already in the summary above
            return (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-medium">{f.label}</label>
                <Input
                  value={specs[f.key] ?? ""}
                  type={f.numeric ? "number" : "text"}
                  inputMode={f.numeric ? "numeric" : undefined}
                  placeholder={f.placeholder}
                  onChange={(e) => setSpecs((s) => ({ ...s, [f.key]: e.target.value }))}
                  data-testid={`spec-${f.key}`}
                />
              </div>
            );
          })}

          {/* The PRICE follows the clinical-fields split. The doctor proposed
              it; reception CONFIRMS it (read-only — the server ignores any other
              number from a reception session anyway). Managers/doctors/admin may
              still adjust it, and that adjustment is theirs in the audit log. */}
          {(canEditClinicalDetails || legacyOpen) ? (
            <div className="space-y-1">
              <label className="text-sm font-semibold">الكلفة (السعر) <span className="text-red-500">*</span></label>
              <MoneyInput value={cost} onValueChange={setCost} placeholder="0" data-testid="input-assign-cost" />
              {proposedCost != null && (
                <p className="text-xs text-teal-800" data-testid="text-proposed-cost">
                  كلفة مقترحة من معاينة {prescribedBy ?? "الطبيب"}:{" "}
                  <b>{proposedCost.toLocaleString("en-US")} د.ع</b> — لا تدخل الحسابات
                  إلا بحفظ هذه النافذة.
                </p>
              )}
            </div>
          ) : proposedCost != null ? (
            <div className="space-y-1">
              <label className="text-sm font-semibold">الكلفة (سعر الطبيب — تُعتمد بالحفظ)</label>
              <div className="rounded-md border border-teal-200 bg-teal-50/40 px-3 py-2 text-sm font-semibold" data-testid="text-assign-cost-readonly">
                {proposedCost.toLocaleString("en-US")} د.ع
              </div>
              <p className="text-xs text-muted-foreground">
                حدّدها {prescribedBy ?? "الطبيب"} في المعاينة — لا تدخل الحسابات إلا بحفظ هذه النافذة.
              </p>
            </div>
          ) : (
            !examMissing && examsLoaded && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="notice-cost-missing">
                لم يحدّد الطبيب كلفة الجهاز في المعاينة — تُستكمل الكلفة في المعاينة
                أو يعتمد مدير الفرع التخصيص.
              </div>
            )
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold">الخبير المسؤول عن التصنيع <span className="text-red-500">*</span></label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">جارٍ تحميل الخبراء…</div>
            ) : experts.length === 0 ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                لا يوجد خبير متاح لهذا الفرع — أسنِد خبيراً لهذا الفرع من إدارة المستخدمين أولاً.
              </div>
            ) : (
              <Select value={expertUserId ? String(expertUserId) : ""} onValueChange={(v) => setExpertUserId(Number(v))}>
                <SelectTrigger data-testid="select-assign-expert"><SelectValue placeholder="اختر الخبير" /></SelectTrigger>
                <SelectContent>
                  {experts.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>))}
                </SelectContent>
              </Select>
            )}
            {proposedExpertName && (
              <p className="text-xs text-teal-800" data-testid="text-proposed-expert">
                اقترحه {prescribedBy ?? "الطبيب"} في المعاينة: <b>{proposedExpertName}</b> — يمكنك إبقاؤه أو تغييره.
              </p>
            )}
          </div>

          {originalPrice > 0 && (
            <ServiceDiscountFields originalPrice={originalPrice} value={discount}
              onChange={setDiscount} testIdPrefix="assign-discount" />
          )}
        </div>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => assign.mutate()} disabled={!expertUserId || !cost || (dualFlag && !serviceChoice) || examMissing || !examsLoaded || (!canEditClinicalDetails && proposedCost == null && !legacyOpen) || assign.isPending || discountBlocked(discount, originalPrice)} data-testid="button-confirm-assign-expert">
            {assign.isPending ? "جارٍ الحفظ…" : "حفظ وإسناد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
