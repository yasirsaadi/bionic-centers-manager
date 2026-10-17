// **«استمارة مراجع — علاج طبيعي» — تسجيلُ مريض العلاج الطبيعي** (§4.da — المرحلةُ الثانية، قرارُ المالك ٢٠٢٦-١٠-٠٩).
//
// «تبقى الخطواتُ مثل الأطراف: كلُّ دورٍ له دورُه يملؤه». فهذه ورقةُ الاستعلامات بهيئة استمارة الأطراف (`IntakeSheetCreate`) وإطارِها
// وترويستها، وحقولُها الإلزامية بالقاعدة نفسِها في الخادم (`checkIntakeSheet` بقسم `physiotherapy`): كلُّها إلّا الملاحظاتِ والإصاباتِ
// و«ملاحظة الجهة»، **ومعها «سبب المراجعة»** — الشكوى بكلمات المراجع. **و«التشخيص» للفاحص وحده** — لا خانةَ له هنا.
// وما بعد ذلك ظاهرٌ **مقفول**: التقييمُ الأوّليّ وقرارُ الفاحص يملؤهما الأخصائيّ أو الطبيب في «معاينة جديدة»، والخطّةُ والمالُ والجلساتُ من سجلّاتها.
// **ولا طلبَ يُرسَل بعد الحفظ**: انتظارُ معاينة العلاج الطبيعي مشتقٌّ من الملفّ نفسِه (§4.bi) — فالمريضُ يظهر في «معايناتي» حين يُحفظ.
// **والفرعُ فرعُ علاجٍ طبيعيّ** (بغداد وذي قار اليوم — `offersPhysio` من توفّر أجهزته)، والخادمُ يردّ غيرَه.
//
// **ولمريضٍ قائم** (`existing` — «طلب معاينة جديدة»، §4.el): الورقةُ نفسُها مملوءةً بما في ملفّه، يعدّل الموظّفُ ما شاء (و«سبب المراجعة»
// سببُ هذه المراجعة) ثمّ «إرسال للمعاينة» — ما تغيّر وطلبُ المعاينة في حفظٍ واحد، فيعود المريضُ إلى «معايناتي» حتى يعاينه الفاحص.
import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Building2, Loader2, Send } from "lucide-react";
import type { Branch } from "@shared/schema";
import { normalizePhone } from "@shared/phone";
import {
  checkIntakeSheet, REFERRAL_OTHER_PERSON, REFERRAL_SOURCES, REFERRAL_SUB_OTHER, REFERRAL_SUB_SOURCES, type InjuryDateStatus,
} from "@shared/intake_sheet";
import { injuriesWithLegacyFallback, serializeInjuries, type InjuryEntry } from "@shared/case_fields";
import { NEW_EXAM_REQUEST_LABEL, changedSheetValues, referralSubSourceChoice } from "@shared/new_exam_request";
import { PRIOR_CENTER_HISTORY_LABEL } from "@shared/service_path";
import { PHYSIO_SHEET_NOTES_LABEL } from "@shared/exam_sheet";
import { PT_FORM_CODE, PT_FORM_VERSION } from "@shared/physio_initial_assessment";
import { onlyRoles } from "@shared/user_roles";
import { useBranchSession } from "@/components/BranchGate";
import { GovernorateSelect, InjuryDateField } from "@/components/intake/IntakeFields";
import {
  IntakeSheetHeader, LockedCell, SheetBand, SheetPair, SheetRow, SheetTable, cellInput,
} from "@/components/intake/IntakeSheetFrame";
import { PhysioInjuriesEditor } from "@/components/medical/PrescriptionFields";
import { PHYSIO_SHEET_TITLE } from "@/components/medical/PhysioExamSheetForm";
import { useNameAvailability, DUPLICATE_NAME_PREFIX_MESSAGE } from "@/hooks/use-name-availability";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { SharedPhoneDialog } from "@/components/SharedPhoneDialog";
import { phoneConflictOf } from "@/lib/phone_conflict";
import type { PhoneHolder, SharedPhoneConfirm } from "@shared/shared_phone";
import { cn } from "@/lib/utils";

const baghdadToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
const dmy = (iso: string) => iso.split("-").reverse().join("/");

const errBody = (e: any): { message: string; missing: string[] } => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try {
    const j = JSON.parse(raw);
    return { message: j?.message ?? j?.error ?? raw, missing: Array.isArray(j?.missing) ? j.missing : [] };
  } catch { return { message: raw, missing: [] }; }
};

/** فرعٌ فيه علاجٌ طبيعيّ — الحقلُ يضيفه `GET /api/branches` (§4.da). */
export type BranchWithPhysio = Branch & { offersPhysio?: boolean };

interface SheetState {
  branchId: number; registrationDate: string; name: string; phone: string; hadPriorCenterHistory: boolean;
  governorate: string; address: string; referralSource: string; referralSubSource: string; referralSubSourceOther: string;
  referralNotes: string; presentingComplaint: string; injuries: InjuryEntry[];
  age: string; weight: string; height: string; injuryCause: string; injuryDate: string; injuryDateStatus: InjuryDateStatus | null;
  generalNotes: string;
}

/** **مريضٌ قائم يُرسَل لمعاينةٍ جديدة** — صفُّه كما يقرؤه `GET /api/patients/:id`. */
export interface ExistingPhysioPatient { patient: Record<string, any> & { id: number } }

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** الورقةُ مملوءةً بما في الملفّ — والإصاباتُ من عموديها القديمين إن لم تُكتب قائمةً بعد. */
function stateFromPatient(e: ExistingPhysioPatient): SheetState {
  const p = e.patient;
  const ref = referralSubSourceChoice(p.referralSubSource);
  return {
    branchId: Number(p.branchId) || 0, registrationDate: baghdadToday(), name: str(p.name), phone: str(p.phone),
    hadPriorCenterHistory: p.hadPriorCenterHistory === true, governorate: str(p.governorate), address: str(p.address),
    referralSource: str(p.referralSource), referralSubSource: ref.choice, referralSubSourceOther: ref.other, referralNotes: str(p.referralNotes),
    presentingComplaint: str(p.presentingComplaint), injuries: injuriesWithLegacyFallback(p.injuries, p.injuryType, p.injuryArea),
    age: str(p.age), weight: str(p.weight), height: str(p.height), injuryCause: str(p.injuryCause),
    injuryDate: p.injuryDateStatus ? "" : str(p.injuryDate), injuryDateStatus: p.injuryDateStatus ?? null, generalNotes: str(p.generalNotes),
  };
}

/** خاناتُ الملفّ كما تكتبها الورقة — بأسماء أعمدة `patients`، والإصاباتُ وعموداها معاً. */
function patientFieldsOf(s: SheetState) {
  const sub = s.referralSource === REFERRAL_OTHER_PERSON
    ? (s.referralSubSource === REFERRAL_SUB_OTHER ? s.referralSubSourceOther.trim() : s.referralSubSource) : "";
  return {
    name: s.name.trim(), phone: s.phone.trim(), hadPriorCenterHistory: s.hadPriorCenterHistory,
    governorate: s.governorate, address: s.address.trim(), referralSource: s.referralSource, referralSubSource: sub,
    referralNotes: s.referralNotes.trim(), presentingComplaint: s.presentingComplaint.trim(), ...serializeInjuries(s.injuries),
    age: s.age.trim(), weight: s.weight.trim(), height: s.height.trim(), injuryCause: s.injuryCause.trim(),
    injuryDate: s.injuryDateStatus ? null : (s.injuryDate || null), injuryDateStatus: s.injuryDateStatus,
    generalNotes: s.generalNotes.trim(),
  };
}

export default function PhysioSheetCreate({ onBack, existing }: { onBack: () => void; existing?: ExistingPhysioPatient }) {
  const [, setLocation] = useLocation();
  const search = new URLSearchParams(useSearch());
  const session = useBranchSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = Boolean(session?.isAdmin);
  //  حصر (§4.ch): موظّفُ استقبالٍ لا دورَ له غيره لا يسجّل بتاريخٍ قديم — كصفحة التسجيل. **والمريضُ القائم يُرسَل اليوم.**
  const canBackdate = !existing && !onlyRoles(session, ["reception"]);
  const { data: branches = [] } = useQuery<BranchWithPhysio[]>({ queryKey: ["/api/branches"] });
  //  المسؤولُ يختار من فروع العلاج الطبيعي وحدها؛ والموظّفُ فرعُه — والخادمُ يردّ فرعاً بلا علاجٍ طبيعيّ.
  const physioBranches = branches.filter((b) => b.offersPhysio && !b.temporarilyClosed);

  const [f, setF] = useState<SheetState>(() => existing ? stateFromPatient(existing) : ({
    branchId: !isAdmin && session?.branchId ? session.branchId : (Number(search.get("branch")) || session?.branchId || 0),
    registrationDate: baghdadToday(), name: "", phone: "", hadPriorCenterHistory: false,
    governorate: "", address: "", referralSource: "", referralSubSource: "", referralSubSourceOther: "", referralNotes: "",
    presentingComplaint: "", injuries: [],
    age: "", weight: "", height: "", injuryCause: "", injuryDate: "", injuryDateStatus: null, generalNotes: "",
  }));
  //  ما فُتحت عليه الورقة — يُقارَن به عند الإرسال، فلا يُكتب ما لم يُلمَس.
  const [opened] = useState<SheetState>(f);
  const [missing, setMissing] = useState<string[]>([]);
  const set = <K extends keyof SheetState>(k: K, v: SheetState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setMissing((m) => m.filter((x) => x !== k && !(k === "injuryDateStatus" && x === "injuryDate")));
  };
  const miss = (k: string) => missing.includes(k);
  //  تحقّقُ الاسم للتسجيل الجديد وحده — اسمُ المريض القائم اسمُه.
  const nameCheck = useNameAvailability(existing ? null : f.name);

  //  الترويسةُ فرعُ اليوم — والمريضُ القائم يُرسَل من الفرع النشط (§4.ay).
  const activeBranchId = existing ? (session?.branchId ?? f.branchId) : f.branchId;
  const branchName = isAdmin && !existing
    ? branches.find((b) => b.id === f.branchId)?.name
    : (session?.branchName || branches.find((b) => b.id === (session?.branchId ?? f.branchId))?.name);
  //  فرعُ الموظّف بلا علاجٍ طبيعيّ — يُقال قبل أن يملأ الورقة لا بعد الحفظ.
  const branchLacksPhysio = !isAdmin && branches.length > 0 && Boolean(activeBranchId)
    && !branches.find((b) => b.id === activeBranchId)?.offersPhysio;

  const referralSubSource = f.referralSource === REFERRAL_OTHER_PERSON
    ? (f.referralSubSource === REFERRAL_SUB_OTHER ? f.referralSubSourceOther.trim() : f.referralSubSource) : "";
  const values = useMemo(() => ({
    name: f.name.trim(), phone: f.phone.trim(), governorate: f.governorate, address: f.address.trim(),
    referralSource: f.referralSource, referralSubSource, age: f.age.trim(), weight: f.weight.trim(), height: f.height.trim(),
    injuryCause: f.injuryCause.trim(), injuryDate: f.injuryDateStatus ? "" : f.injuryDate, injuryDateStatus: f.injuryDateStatus,
    department: "physiotherapy" as const, presentingComplaint: f.presentingComplaint.trim(),
  }), [f, referralSubSource]);

  //  ══ **الرقمُ المسجَّل لغيره ⟵ سؤالٌ لا رفض** (§4.ef) ══ «قريب يستعمل الرقم نفسه» يعيد الحفظَ بالتأكيد.
  const [phoneHolders, setPhoneHolders] = useState<PhoneHolder[] | null>(null);
  const save = useMutation({
    mutationFn: async (sharedPhone?: SharedPhoneConfirm) => {
      if (existing) {
        //  **حفظٌ واحد**: ما تغيّر من الملفّ وطلبُ المعاينة معاً (`new-exam-request`) — فلا يُكتب أحدُهما دون الآخر.
        await apiRequest("POST", `/api/patients/${existing.patient.id}/new-exam-request`, {
          department: "physiotherapy", fields: changedSheetValues(patientFieldsOf(opened), patientFieldsOf(f)),
          ...(sharedPhone ? { sharedPhone } : {}),
        });
        return { id: existing.patient.id };
      }
      const created = await (await apiRequest("POST", "/api/patients", {
        intakeSheet: true, department: "physiotherapy",
        branchId: f.branchId, registrationDate: canBackdate ? f.registrationDate : undefined,
        name: values.name, phone: values.phone, hadPriorCenterHistory: f.hadPriorCenterHistory,
        governorate: values.governorate, address: values.address,
        referralSource: values.referralSource, referralSubSource: values.referralSubSource || null,
        referralNotes: f.referralNotes.trim() || null,
        presentingComplaint: values.presentingComplaint, ...serializeInjuries(f.injuries),
        age: values.age, weight: values.weight, height: values.height,
        injuryCause: values.injuryCause, injuryDate: values.injuryDate || null, injuryDateStatus: values.injuryDateStatus,
        generalNotes: f.generalNotes.trim(),
        totalCost: 0, whatsappNotificationsEnabled: false,
        ...(sharedPhone ? { sharedPhone } : {}),
      })).json();
      return { id: created.id as number };
    },
    onSuccess: (r) => {
      setPhoneHolders(null);
      if (existing) {
        invalidatePatientData(queryClient, r.id);
        queryClient.invalidateQueries({ queryKey: [`/api/medical/patients/${r.id}/exams`] });
      }
      toast(existing
        ? { title: "أُرسل المراجعُ لمعاينة العلاج الطبيعي", description: "يظهر في «معايناتي» حتى يعاينه الأخصائيّ أو الطبيب" }
        : { title: "حُفظت الاستمارة", description: "والمراجعُ بانتظار معاينة العلاج الطبيعي" });
      setLocation(`/patients/${r.id}`);
    },
    onError: (e) => {
      const holders = phoneConflictOf(e);
      if (holders) { setPhoneHolders(holders); return; }
      const b = errBody(e);
      if (b.missing.length) setMissing(b.missing);
      toast({ title: existing ? "لم يُرسَل الطلب" : "لم تُحفظ الاستمارة", description: b.message, variant: "destructive" });
    },
  });

  function submit() {
    if (nameCheck.status === "conflict" || nameCheck.status === "checking") {
      toast({ title: "تحقّق من الاسم", description: nameCheck.status === "conflict" ? (nameCheck.message ?? DUPLICATE_NAME_PREFIX_MESSAGE) : "انتظر حتى ينتهي التحقّق من الاسم", variant: "destructive" });
      return;
    }
    const chk = checkIntakeSheet(values);
    const phone = values.phone ? normalizePhone(values.phone) : null;
    const m = [...chk.missing, ...(phone && !phone.ok && !chk.missing.includes("phone") ? ["phone"] : [])];
    if (!f.branchId) m.push("branchId");
    if (m.length) {
      setMissing(m);
      toast({
        title: "أكمل الاستمارة",
        description: phone && !phone.ok ? `رقم الهاتف: ${phone.reason}` : (chk.message ?? "اختر الفرع"),
        variant: "destructive",
      });
      return;
    }
    save.mutate(undefined);
  }

  return (
    <div className="max-w-4xl mx-auto py-2 md:py-6 space-y-3 overflow-x-clip" dir="rtl">
      <SharedPhoneDialog holders={phoneHolders} mode={existing ? "edit" : "create"} pending={save.isPending}
        onCancel={() => setPhoneHolders(null)} onConfirm={(c) => save.mutate(c)} />
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onBack} className="p-2" aria-label="رجوع"><ArrowRight className="w-5 h-5 text-slate-500" /></Button>
        <div className="text-sm text-muted-foreground" data-testid="pt-intake-title">
          {existing ? `${NEW_EXAM_REQUEST_LABEL} — علاج طبيعي` : "إضافة مريض — علاج طبيعي"}
        </div>
      </div>
      {existing && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" data-testid="pt-intake-existing-note">
          بياناتُ المراجع من ملفّه — عدّل ما تغيّر منها، واكتب «سبب المراجعة» لهذه المرّة، ثمّ أرسله للمعاينة. وما تغيّر يُكتب في ملفّه بسطر تدقيق.
        </div>
      )}

      {isAdmin && !existing && (
        <div className={cn("flex items-center gap-2 rounded-lg border bg-white p-2", miss("branchId") && "border-red-400")}>
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">الفرع</span>
          <Select value={f.branchId && physioBranches.some((b) => b.id === f.branchId) ? String(f.branchId) : ""} onValueChange={(v) => set("branchId", Number(v))}>
            <SelectTrigger className="h-9 max-w-xs" data-testid="pt-intake-branch"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
            <SelectContent>
              {physioBranches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">فروعُ العلاج الطبيعي وحدها</span>
        </div>
      )}
      {branchLacksPhysio && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="pt-intake-no-physio">
          العلاج الطبيعي غير متوفّر في فرعك — يُسجَّل مريضُه في فرعٍ فيه علاجٌ طبيعيّ.
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-3 md:p-8" data-testid="pt-intake-sheet">
        <IntakeSheetHeader branchName={branchName} title={PHYSIO_SHEET_TITLE} />

        <SheetTable>
          <SheetPair>
            <SheetRow label="اسم المراجع" missing={miss("name")} testId="pt-intake-row-name">
              <Input className={cn(cellInput, nameCheck.status === "conflict" && "text-red-700")} value={f.name}
                onChange={(e) => set("name", e.target.value)} placeholder="الاسم الرباعي" data-testid="pt-intake-name" />
              {nameCheck.status === "conflict" && <p className="text-xs text-red-600 px-1.5" data-testid="pt-intake-name-conflict">{nameCheck.message ?? DUPLICATE_NAME_PREFIX_MESSAGE}</p>}
            </SheetRow>
            <SheetRow label="تاريخ المراجعة">
              {canBackdate
                ? <DatePickerIraq value={f.registrationDate} onChange={(v) => set("registrationDate", v)} data-testid="pt-intake-date" />
                : <div className="h-9 flex items-center px-1.5 text-sm" dir="ltr" data-testid="pt-intake-date-fixed">{dmy(f.registrationDate)}</div>}
            </SheetRow>
          </SheetPair>
          <SheetPair>
            <SheetRow label="رقم الهاتف" missing={miss("phone")} testId="pt-intake-row-phone">
              <Input className={cellInput} value={f.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" inputMode="tel"
                placeholder="07XXXXXXXXX" data-testid="pt-intake-phone" />
            </SheetRow>
            <SheetRow label="المحافظة" missing={miss("governorate")} testId="pt-intake-row-governorate">
              <GovernorateSelect value={f.governorate} onChange={(v) => set("governorate", v)} className={cellInput} testId="pt-intake-governorate" />
            </SheetRow>
          </SheetPair>
          <SheetRow label="العنوان التفصيلي" missing={miss("address")} testId="pt-intake-row-address">
            <Input className={cellInput} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="المنطقة / الحي / أقرب نقطة دالّة" data-testid="pt-intake-address" />
          </SheetRow>
          <SheetRow label="الجهة المحوِّل منها" missing={miss("referralSource") || miss("referralSubSource")} testId="pt-intake-row-referral">
            <div className="flex flex-wrap gap-1.5">
              <Select value={f.referralSource} onValueChange={(v) => { set("referralSource", v); if (v !== REFERRAL_OTHER_PERSON) setF((p) => ({ ...p, referralSubSource: "", referralSubSourceOther: "" })); }}>
                <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid="pt-intake-referral"><SelectValue placeholder="اختر الجهة" /></SelectTrigger>
                <SelectContent>{REFERRAL_SOURCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              {f.referralSource === REFERRAL_OTHER_PERSON && (
                <Select value={f.referralSubSource} onValueChange={(v) => { set("referralSubSource", v); if (v !== REFERRAL_SUB_OTHER) setF((p) => ({ ...p, referralSubSourceOther: "" })); }}>
                  <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid="pt-intake-referral-sub"><SelectValue placeholder="كيف عرف الشخص الآخر بالمركز؟" /></SelectTrigger>
                  <SelectContent>{REFERRAL_SUB_SOURCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {f.referralSource === REFERRAL_OTHER_PERSON && f.referralSubSource === REFERRAL_SUB_OTHER && (
                <Input className={cn(cellInput, "min-w-[11rem] flex-1 border")} value={f.referralSubSourceOther}
                  onChange={(e) => setF((p) => ({ ...p, referralSubSourceOther: e.target.value }))} placeholder="اكتب الجهة" data-testid="pt-intake-referral-other" />
              )}
              {/*  **«ملاحظة الجهة»** اختيارية — كانت في صفحة التسجيل القديمة، فلا تضيع («لا تضيع أيُّ معلومة»). */}
              <Input className={cn(cellInput, "min-w-[11rem] flex-1 border")} value={f.referralNotes}
                onChange={(e) => set("referralNotes", e.target.value)} placeholder="ملاحظة الجهة (اختيارية): اسم الطبيب، المستشفى…" data-testid="pt-intake-referral-notes" />
            </div>
          </SheetRow>
          <SheetRow label="سبق التعامل مع المركز">
            <label className="flex items-center gap-2 text-xs py-1.5 px-1 cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={f.hadPriorCenterHistory} onChange={(e) => set("hadPriorCenterHistory", e.target.checked)} data-testid="pt-intake-prior" />
              {PRIOR_CENTER_HISTORY_LABEL}
            </label>
          </SheetRow>

          <SheetRow label="سبب المراجعة" missing={miss("presentingComplaint")} testId="pt-intake-row-complaint">
            <Textarea className="min-h-[3.5rem] border-0 shadow-none resize-none focus-visible:ring-1" value={f.presentingComplaint}
              onChange={(e) => set("presentingComplaint", e.target.value)}
              placeholder="الشكوى بكلمات المراجع: ألمٌ في أسفل الظهر منذ شهرين ينزل إلى الساق…" data-testid="pt-intake-complaint" />
          </SheetRow>
          <SheetRow label="الإصابات" testId="pt-intake-row-injuries">
            <div className="py-1.5 space-y-1">
              <PhysioInjuriesEditor rows={f.injuries} onChange={(rows) => set("injuries", rows)} />
              <p className="text-[11px] text-slate-500">اختيارية — يكملها الفاحص عند المعاينة.</p>
            </div>
          </SheetRow>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_15rem] border-b border-slate-700">
            <div className="md:border-l border-slate-700">
              <SheetRow label="العمر" missing={miss("age")} testId="pt-intake-row-age">
                <Input className={cellInput} value={f.age} onChange={(e) => set("age", e.target.value)} inputMode="numeric" data-testid="pt-intake-age" />
              </SheetRow>
              <SheetRow label="الوزن (كغم)" missing={miss("weight")} testId="pt-intake-row-weight">
                <Input className={cellInput} value={f.weight} onChange={(e) => set("weight", e.target.value)} inputMode="decimal" data-testid="pt-intake-weight" />
              </SheetRow>
              <SheetRow label="الطول (سم)" missing={miss("height")} testId="pt-intake-row-height">
                <Input className={cellInput} value={f.height} onChange={(e) => set("height", e.target.value)} inputMode="decimal" data-testid="pt-intake-height" />
              </SheetRow>
            </div>
            <div className="border-t md:border-t-0 border-slate-700 p-1.5 flex flex-col">
              <div className="text-center text-sm font-semibold py-1">ملاحظات</div>
              <Textarea className="flex-1 min-h-[5rem] border-0 shadow-none resize-none focus-visible:ring-1" value={f.generalNotes}
                onChange={(e) => set("generalNotes", e.target.value)} placeholder="اختيارية" data-testid="pt-intake-notes" />
            </div>
          </div>

          <SheetPair>
            <SheetRow label="سبب الإصابة" missing={miss("injuryCause")} testId="pt-intake-row-cause">
              <Input className={cellInput} value={f.injuryCause} onChange={(e) => set("injuryCause", e.target.value)} placeholder="حادث، سقوط، مرض، غير معروف…" data-testid="pt-intake-cause" />
            </SheetRow>
            <SheetRow label="تاريخ الإصابة" missing={miss("injuryDate")} testId="pt-intake-row-injury-date">
              <InjuryDateField date={f.injuryDate} status={f.injuryDateStatus} testIdPrefix="pt-intake-injury-date"
                onChange={(n) => { set("injuryDate", n.injuryDate); set("injuryDateStatus", n.injuryDateStatus); }} />
            </SheetRow>
          </SheetPair>

          <SheetBand>يملؤه الأخصائيّ أو الطبيب عند المعاينة</SheetBand>
          <SheetRow label="التقييم الأوّلي"><LockedCell tall text="استمارةُ التقييم الأوّلي كاملةً — تُملأ عند المعاينة" testId="pt-locked-assessment" /></SheetRow>
          <SheetRow label="التشخيص"><LockedCell text="يُملأ عند المعاينة" testId="pt-locked-diagnosis" /></SheetRow>
          <SheetRow label="العلاج الموصوف وعدد الجلسات"><LockedCell text="يُملأ عند المعاينة" /></SheetRow>
          <SheetRow label={PHYSIO_SHEET_NOTES_LABEL}><LockedCell text="يُملأ عند المعاينة" /></SheetRow>
          <SheetRow label="الخطة العلاجية"><LockedCell text="تُقرأ من خطة العلاج بعد كتابتها" /></SheetRow>
          <SheetRow label="المبلغ الكلي للعلاج الطبيعي">
            <LockedCell text="يُؤخذ من «الكلفة والجلسات»: الكلي والمدفوع والمتبقي" testId="pt-locked-cost" />
          </SheetRow>
          <SheetBand>المراجعات والجلسات</SheetBand>
          <div className="px-2 py-2 text-xs text-slate-400 text-center">تظهر هنا زياراتُ المريض وجلساتُه ودفعاتُه من سجلّاتها</div>
        </SheetTable>
        <p className="mt-2 text-[11px] text-slate-500 text-left" dir="ltr">{PT_FORM_CODE} · v{PT_FORM_VERSION}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={save.isPending || branchLacksPhysio} className="gap-2 min-w-[12rem]" data-testid="pt-intake-submit">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {existing ? "إرسال للمعاينة" : "حفظ وإرسال للمعاينة"}
          </Button>
          {missing.length > 0 && <span className="text-xs text-red-600" data-testid="pt-intake-missing">الخانات المحدّدة بالأحمر إلزامية</span>}
        </div>
      </div>
    </div>
  );
}
