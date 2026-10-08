// **«استمارة مراجع» — تسجيلُ مريض الأطراف والمساند** (ترحيل ١١٤، §4.cq — المرحلةُ الأولى).
//
// الورقةُ التي تُملأ باليد في الاستعلامات، بهيئتها: الترويسةُ باسم الفرع وشعاره، والجدولُ بأسطره، وقسمُ الطبيب ظاهرٌ **مقفول**.
// وحقولُ الاستعلامات كلُّها إلزامية إلّا الملاحظات (`checkIntakeSheet` — القاعدةُ نفسُها في الخادم)، وتعريفُ البتر هو بانيه
// القائم كما في صفحة التسجيل (احادي/ثنائي/سليكوني ⟵ الطرف ⟵ الجهة ⟵ المستوى).
// **والحفظُ يرسل المريضَ إلى الطبيب**: يُنشئ الملفّ ثمّ طلبَ المعاينة (`device-episodes` بمسار `exam`) — الطلبُ نفسُه الذي يفتحه
// «يحتاج معاينة طبية»، ومعه زيارةُ «طلب معاينة طبية». وإن تعذّر الطلبُ بعد حفظ الملفّ، تُفتح للموظّف نافذةُ «سبب الحضور» في
// الملفّ (الشريطُ الأحمر «لم يُحدَّد سبب الحضور» شبكةُ أمانٍ قائمة) — فلا مريضَ يضيع بصمت.
import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Loader2, Send } from "lucide-react";
import type { Branch } from "@shared/schema";
import { normalizePhone } from "@shared/phone";
import {
  checkIntakeSheet, INTAKE_DEPARTMENT_LABELS, REFERRAL_OTHER_PERSON, REFERRAL_SOURCES, REFERRAL_SUB_OTHER, REFERRAL_SUB_SOURCES,
  type IntakeDepartment, type InjuryDateStatus,
} from "@shared/intake_sheet";
import { COMPONENT_LABELS, FULL_DEVICE, FULL_DEVICE_LABELS, PROSTHETIC_COMPONENTS } from "@shared/prosthetic_parts";
import { INJURY_SIDE_OPTIONS } from "@shared/case_fields";
import { PRIOR_CENTER_HISTORY_LABEL } from "@shared/service_path";
import { EXAM_SHEET_TEXT_LABEL, SHEET_DEVICE_ROWS } from "@shared/exam_sheet";
import { onlyRoles } from "@shared/user_roles";
import { AmputationBuilder, amputationSiteOf, type AmputationParts } from "@/components/AmputationBuilder";
import { useBranchSession } from "@/components/BranchGate";
import { markReceptionRoutingPending } from "@/components/reception_routing";
import { sessionResumeStore } from "@/components/device_flow_resume";
import { GovernorateSelect, InjuryDateField } from "@/components/intake/IntakeFields";
import {
  IntakeSheetHeader, LockedCell, SheetBand, SheetPair, SheetRow, SheetTable, cellInput,
} from "@/components/intake/IntakeSheetFrame";
import { useNameAvailability, DUPLICATE_NAME_PREFIX_MESSAGE } from "@/hooks/use-name-availability";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const baghdadToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
/** «2026-10-08» ⟵ «08/10/2026» — كما يكتبه منتقي التاريخ. */
const dmy = (iso: string) => iso.split("-").reverse().join("/");

const errBody = (e: any): { message: string; missing: string[] } => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try {
    const j = JSON.parse(raw);
    return { message: j?.message ?? j?.error ?? raw, missing: Array.isArray(j?.missing) ? j.missing : [] };
  } catch { return { message: raw, missing: [] }; }
};

/** حقولُ الاستمارة — بأسماء أعمدة `patients`، إلّا القسمَ و«المطلوب» وتعريفَ البتر بأجزائه. */
interface SheetState {
  branchId: number; registrationDate: string; name: string; phone: string; hadPriorCenterHistory: boolean;
  governorate: string; address: string; referralSource: string; referralSubSource: string; referralSubSourceOther: string;
  department: IntakeDepartment | ""; amp: AmputationParts; requestedItem: string; supportType: string; injurySide: string;
  age: string; weight: string; height: string; injuryCause: string; injuryDate: string; injuryDateStatus: InjuryDateStatus | null;
  generalNotes: string;
}

export default function IntakeSheetCreate({ onBack }: { onBack: () => void }) {
  const [, setLocation] = useLocation();
  const search = new URLSearchParams(useSearch());
  const session = useBranchSession();
  const { toast } = useToast();
  const isAdmin = Boolean(session?.isAdmin);
  //  حصر (§4.ch): موظّفُ استقبالٍ لا دورَ له غيره لا يسجّل بتاريخٍ قديم — كصفحة التسجيل.
  const canBackdate = !onlyRoles(session, ["reception"]);
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ["/api/branches"] });

  const [f, setF] = useState<SheetState>(() => ({
    branchId: !isAdmin && session?.branchId ? session.branchId : (Number(search.get("branch")) || session?.branchId || 0),
    registrationDate: baghdadToday(), name: "", phone: "", hadPriorCenterHistory: false,
    governorate: "", address: "", referralSource: "", referralSubSource: "", referralSubSourceOther: "",
    department: "", amp: {}, requestedItem: "", supportType: "", injurySide: "",
    age: "", weight: "", height: "", injuryCause: "", injuryDate: "", injuryDateStatus: null, generalNotes: "",
  }));
  const set = <K extends keyof SheetState>(k: K, v: SheetState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setMissing((m) => m.filter((x) => x !== k && !(k === "amp" && x === "amputationSite") && !(k === "injuryDateStatus" && x === "injuryDate")));
  };
  const [missing, setMissing] = useState<string[]>([]);
  const miss = (k: string) => missing.includes(k);
  const nameCheck = useNameAvailability(f.name);

  const branchName = isAdmin
    ? branches.find((b) => b.id === f.branchId)?.name
    : (session?.branchName || branches.find((b) => b.id === session?.branchId)?.name);

  const referralSubSource = f.referralSource === REFERRAL_OTHER_PERSON
    ? (f.referralSubSource === REFERRAL_SUB_OTHER ? f.referralSubSourceOther.trim() : f.referralSubSource) : "";
  const amputationSite = f.department === "prosthetic" ? amputationSiteOf(f.amp) : "";
  const values = useMemo(() => ({
    name: f.name.trim(), phone: f.phone.trim(), governorate: f.governorate, address: f.address.trim(),
    referralSource: f.referralSource, referralSubSource, age: f.age.trim(), weight: f.weight.trim(), height: f.height.trim(),
    injuryCause: f.injuryCause.trim(), injuryDate: f.injuryDateStatus ? "" : f.injuryDate, injuryDateStatus: f.injuryDateStatus,
    department: f.department, amputationSite, supportType: f.supportType.trim(), injurySide: f.injurySide.trim(),
    requestedItem: f.department === "prosthetic" ? f.requestedItem : FULL_DEVICE,
  }), [f, referralSubSource, amputationSite]);

  const save = useMutation({
    mutationFn: async () => {
      const dep = f.department as IntakeDepartment;
      const created = await (await apiRequest("POST", "/api/patients", {
        intakeSheet: true, department: dep, requestedItem: values.requestedItem,
        branchId: f.branchId, registrationDate: canBackdate ? f.registrationDate : undefined,
        name: values.name, phone: values.phone, hadPriorCenterHistory: f.hadPriorCenterHistory,
        governorate: values.governorate, address: values.address,
        referralSource: values.referralSource, referralSubSource: values.referralSubSource || null,
        age: values.age, weight: values.weight, height: values.height,
        injuryCause: values.injuryCause, injuryDate: values.injuryDate || null, injuryDateStatus: values.injuryDateStatus,
        amputationSite: values.amputationSite, supportType: values.supportType, injurySide: values.injurySide,
        generalNotes: f.generalNotes.trim(),
        totalCost: 0, whatsappNotificationsEnabled: false,
      })).json();
      //  **وطلبُ المعاينة في الحفظ نفسِه** — كما يفتحه «يحتاج معاينة طبية». فشلُه لا يُلغي ملفّاً حُفظ: يُقال ويُكمَل من الملفّ.
      try {
        await apiRequest("POST", `/api/patients/${created.id}/device-episodes`, {
          serviceType: dep, requestedItem: values.requestedItem, servicePath: "exam",
        });
        return { id: created.id as number, routed: true as const, routeError: null };
      } catch (e) {
        return { id: created.id as number, routed: false as const, routeError: errBody(e).message };
      }
    },
    onSuccess: (r) => {
      if (r.routed) {
        toast({ title: "حُفظت الاستمارة", description: "وأُرسل المراجعُ إلى الطبيب للمعاينة" });
      } else {
        markReceptionRoutingPending(sessionResumeStore(), r.id);
        toast({ title: "حُفظ ملفّ المراجع — ولم يُرسَل إلى الطبيب", description: `${r.routeError} — اختر «يحتاج معاينة طبية» من النافذة`, variant: "destructive" });
      }
      setLocation(`/patients/${r.id}`);
    },
    onError: (e) => {
      const b = errBody(e);
      if (b.missing.length) setMissing(b.missing);
      toast({ title: "لم تُحفظ الاستمارة", description: b.message, variant: "destructive" });
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
    save.mutate();
  }

  const isProsthetic = f.department === "prosthetic";
  return (
    <div className="max-w-4xl mx-auto py-2 md:py-6 space-y-3" dir="rtl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onBack} className="p-2" aria-label="رجوع"><ArrowRight className="w-5 h-5 text-slate-500" /></Button>
        <div className="text-sm text-muted-foreground">إضافة مريض — أطراف صناعية ومساند</div>
      </div>

      {isAdmin && (
        <div className={cn("flex items-center gap-2 rounded-lg border bg-white p-2", miss("branchId") && "border-red-400")}>
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">الفرع</span>
          <Select value={f.branchId ? String(f.branchId) : ""} onValueChange={(v) => set("branchId", Number(v))}>
            <SelectTrigger className="h-9 max-w-xs" data-testid="intake-branch"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
            <SelectContent>
              {branches.filter((b) => !b.temporarilyClosed).map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm p-3 md:p-8" data-testid="intake-sheet">
        <IntakeSheetHeader branchName={branchName} />

        <SheetTable>
          <SheetPair>
            <SheetRow label="اسم المراجع" missing={miss("name")} testId="row-name">
              <Input className={cn(cellInput, nameCheck.status === "conflict" && "text-red-700")} value={f.name}
                onChange={(e) => set("name", e.target.value)} placeholder="الاسم الرباعي" data-testid="intake-name" />
              {nameCheck.status === "conflict" && <p className="text-xs text-red-600 px-1.5" data-testid="intake-name-conflict">{nameCheck.message ?? DUPLICATE_NAME_PREFIX_MESSAGE}</p>}
            </SheetRow>
            <SheetRow label="تاريخ المراجعة">
              {canBackdate
                ? <DatePickerIraq value={f.registrationDate} onChange={(v) => set("registrationDate", v)} data-testid="intake-date" />
                : <div className="h-9 flex items-center px-1.5 text-sm" dir="ltr" data-testid="intake-date-fixed">{dmy(f.registrationDate)}</div>}
            </SheetRow>
          </SheetPair>
          <SheetPair>
            <SheetRow label="رقم الهاتف" missing={miss("phone")} testId="row-phone">
              <Input className={cellInput} value={f.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" inputMode="tel"
                placeholder="07XXXXXXXXX" data-testid="intake-phone" />
            </SheetRow>
            <SheetRow label="المحافظة" missing={miss("governorate")} testId="row-governorate">
              <GovernorateSelect value={f.governorate} onChange={(v) => set("governorate", v)} className={cellInput} testId="intake-governorate" />
            </SheetRow>
          </SheetPair>
          <SheetRow label="العنوان التفصيلي" missing={miss("address")} testId="row-address">
            <Input className={cellInput} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="المنطقة / الحي / أقرب نقطة دالّة" data-testid="intake-address" />
          </SheetRow>
          <SheetRow label="الجهة المحوِّل منها" missing={miss("referralSource") || miss("referralSubSource")} testId="row-referral">
            <div className="flex flex-wrap gap-1.5">
              <Select value={f.referralSource} onValueChange={(v) => { set("referralSource", v); if (v !== REFERRAL_OTHER_PERSON) setF((p) => ({ ...p, referralSubSource: "", referralSubSourceOther: "" })); }}>
                <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid="intake-referral"><SelectValue placeholder="اختر الجهة" /></SelectTrigger>
                <SelectContent>{REFERRAL_SOURCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              {f.referralSource === REFERRAL_OTHER_PERSON && (
                <Select value={f.referralSubSource} onValueChange={(v) => { set("referralSubSource", v); if (v !== REFERRAL_SUB_OTHER) setF((p) => ({ ...p, referralSubSourceOther: "" })); }}>
                  <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid="intake-referral-sub"><SelectValue placeholder="كيف عرف الشخص الآخر بالمركز؟" /></SelectTrigger>
                  <SelectContent>{REFERRAL_SUB_SOURCES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {f.referralSource === REFERRAL_OTHER_PERSON && f.referralSubSource === REFERRAL_SUB_OTHER && (
                <Input className={cn(cellInput, "min-w-[11rem] flex-1 border")} value={f.referralSubSourceOther}
                  onChange={(e) => setF((p) => ({ ...p, referralSubSourceOther: e.target.value }))} placeholder="اكتب الجهة" data-testid="intake-referral-other" />
              )}
            </div>
          </SheetRow>
          <SheetRow label="سبق التعامل مع المركز">
            <label className="flex items-center gap-2 text-xs py-1.5 px-1 cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={f.hadPriorCenterHistory} onChange={(e) => set("hadPriorCenterHistory", e.target.checked)} data-testid="intake-prior" />
              {PRIOR_CENTER_HISTORY_LABEL}
            </label>
          </SheetRow>

          <SheetRow label="نوع الإصابة" missing={miss("department") || miss("amputationSite") || miss("supportType") || miss("injurySide")} testId="row-injury-type">
            <div className="space-y-3 py-1">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(INTAKE_DEPARTMENT_LABELS) as IntakeDepartment[]).map((d) => (
                  <button key={d} type="button" onClick={() => set("department", d)} aria-pressed={f.department === d}
                    className={cn("rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      f.department === d ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-slate-50")}
                    data-testid={`intake-dept-${d}`}>{INTAKE_DEPARTMENT_LABELS[d]}</button>
                ))}
              </div>
              {isProsthetic && <AmputationBuilder value={f.amp} onChange={(v) => set("amp", v)} testIdPrefix="intake-amp" />}
              {f.department === "medical_support" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className={cn("text-xs font-medium", miss("supportType") && "text-red-700")}>نوع المسند</div>
                    <Input className="h-9" value={f.supportType} onChange={(e) => set("supportType", e.target.value)} placeholder="مثال: مشدّ ظهر، جبيرة قدم" data-testid="intake-support-type" />
                  </div>
                  <div className="space-y-1">
                    <div className={cn("text-xs font-medium", miss("injurySide") && "text-red-700")}>جهة الإصابة</div>
                    <Input className="h-9" value={f.injurySide} onChange={(e) => set("injurySide", e.target.value)} placeholder="يمين، يسار، كلاهما…" data-testid="intake-injury-side" />
                    <div className="flex flex-wrap gap-1">
                      {[...INJURY_SIDE_OPTIONS, "لا ينطبق"].map((s) => (
                        <button key={s} type="button" onClick={() => set("injurySide", s)}
                          className={cn("rounded-full border px-2 py-0.5 text-[11px]", f.injurySide === s ? "border-primary bg-primary/10" : "bg-white")}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SheetRow>
          {isProsthetic && (
            <SheetRow label="المطلوب" missing={miss("requestedItem")} testId="row-requested">
              <Select value={f.requestedItem} onValueChange={(v) => set("requestedItem", v)}>
                <SelectTrigger className={cellInput} data-testid="intake-requested"><SelectValue placeholder="طرف كامل أم جزء؟" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={FULL_DEVICE}>{FULL_DEVICE_LABELS.prosthetic}</SelectItem>
                  {PROSTHETIC_COMPONENTS.map((c) => <SelectItem key={c} value={c}>{COMPONENT_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </SheetRow>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_15rem] border-b border-slate-700">
            <div className="md:border-l border-slate-700">
              <SheetRow label="العمر" missing={miss("age")} testId="row-age">
                <Input className={cellInput} value={f.age} onChange={(e) => set("age", e.target.value)} inputMode="numeric" data-testid="intake-age" />
              </SheetRow>
              <SheetRow label="الوزن (كغم)" missing={miss("weight")} testId="row-weight">
                <Input className={cellInput} value={f.weight} onChange={(e) => set("weight", e.target.value)} inputMode="decimal" data-testid="intake-weight" />
              </SheetRow>
              <SheetRow label="الطول (سم)" missing={miss("height")} testId="row-height">
                <Input className={cellInput} value={f.height} onChange={(e) => set("height", e.target.value)} inputMode="decimal" data-testid="intake-height" />
              </SheetRow>
            </div>
            <div className="border-t md:border-t-0 border-slate-700 p-1.5 flex flex-col">
              <div className="text-center text-sm font-semibold py-1">ملاحظات</div>
              <Textarea className="flex-1 min-h-[5rem] border-0 shadow-none resize-none focus-visible:ring-1" value={f.generalNotes}
                onChange={(e) => set("generalNotes", e.target.value)} placeholder="اختيارية" data-testid="intake-notes" />
            </div>
          </div>

          <SheetPair>
            <SheetRow label="سبب الإصابة" missing={miss("injuryCause")} testId="row-cause">
              <Input className={cellInput} value={f.injuryCause} onChange={(e) => set("injuryCause", e.target.value)} placeholder="حادث سير، مرض، ولادة…" data-testid="intake-cause" />
            </SheetRow>
            <SheetRow label="تاريخ الإصابة" missing={miss("injuryDate")} testId="row-injury-date">
              <InjuryDateField date={f.injuryDate} status={f.injuryDateStatus} testIdPrefix="intake-injury-date"
                onChange={(n) => { set("injuryDate", n.injuryDate); set("injuryDateStatus", n.injuryDateStatus); }} />
            </SheetRow>
          </SheetPair>

          <SheetRow label={EXAM_SHEET_TEXT_LABEL}><LockedCell tall text="يُملأ من قبل الطبيب عند المعاينة" testId="locked-exam" /></SheetRow>
          {(isProsthetic || f.department === "") ? (
            SHEET_DEVICE_ROWS.map((r) => (
              <SheetRow key={r.key} label={r.label}><LockedCell text="يُملأ عند المعاينة أو بعدها" /></SheetRow>
            ))
          ) : (
            <SheetRow label="مواصفات المسند"><LockedCell text="يُملأ عند المعاينة أو بعدها" /></SheetRow>
          )}
          <SheetRow label={f.department === "medical_support" ? "المبلغ الكلي للمسند" : "المبلغ الكلي للطرف"}>
            <LockedCell text="يُؤخذ من قرار الحسم: الكلي والمدفوع والمتبقي" testId="locked-cost" />
          </SheetRow>
          <SheetBand>المراجعات</SheetBand>
          <div className="grid grid-cols-[7rem_1fr] sm:grid-cols-[9.5rem_1fr] text-sm">
            <div className="border-b border-l border-slate-700 px-2 py-1.5 font-semibold text-center">التاريخ</div>
            <div className="border-b border-slate-700 px-2 py-1.5 font-semibold text-center">أسباب المراجعة</div>
            <div className="border-l border-slate-700 px-2 py-1.5 text-center text-slate-400" dir="ltr">{dmy(f.registrationDate)}</div>
            <div className="px-2 py-1.5 text-slate-400">طلب معاينة طبية — يُسجَّل عند الحفظ، وتظهر هنا زياراتُه كلُّها من سجلّ الزيارات</div>
          </div>
        </SheetTable>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={save.isPending} className="gap-2 min-w-[12rem]" data-testid="intake-submit">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} حفظ وإرسال للطبيب
          </Button>
          {missing.length > 0 && <span className="text-xs text-red-600" data-testid="intake-missing">الخانات المحدّدة بالأحمر إلزامية</span>}
        </div>
      </div>
    </div>
  );
}
