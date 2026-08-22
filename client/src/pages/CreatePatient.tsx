import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Branch } from "@shared/schema";
import { SUPPORT_SPECS } from "@shared/case_fields";
import { normalizePhone } from "@shared/phone";
import { useCreatePatient } from "@/hooks/use-patients";
import { useToast } from "@/hooks/use-toast";
import { amputationSiteOf } from "@/components/AmputationBuilder";
import { checkRequiredPatientData, checkAmputationParts } from "@shared/patient_required";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ArrowLeft, Building2, Plus, X } from "lucide-react";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useBranchSession } from "@/components/BranchGate";

const injuryTypeOptions = [
  "التهاب اوتار", "وثي", "قطع اوتار", "تشنج عضلي", "إصابة عصب محيطي", "التهاب اعصاب سكري",
  "سوفان", "انزلاق ديسك", "انزلاق فقرات", "جنف", "جلطة دماغية", "نزف دماغي",
  "التهاب سحايا", "تصلب لويحي", "باركنسون", "غيلان باريه", "ضمور عضلي", "ضمور عصبي",
  "شلل دماغ", "شلل اطفال", "تأخر نفسي حركي", "اصابة حبل شوكي", "التهاب حبل شوكي",
  "شلل العصب الوجهي", "إصابة اربطة", "قطع جزئي في العضلات", "تبديل مفصل", "كسر",
  "نتوء عظمي",
];

const TREATMENT_TYPE_OPTIONS = [
  { value: "استشارة طبية", labelKey: "medicalConsultation" as const },
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
  { value: "أبر صينية", labelKey: "acupuncture" as const },
];

const TREATMENT_PRICES: Record<string, number> = {
  "استشارة طبية": 0,
  "روبوت": 50000,
  "تمارين تأهيلية": 25000,
  "أجهزة علاج طبيعي": 25000,
  "أبر صينية": 25000,
};

const injuryAreaOptions = [
  "الرأس", "الرقبة", "الصدر", "القطن", "العمود الفقري", "الكتف",
  "منطقة الظهر العلوية", "منطقة الظهر السفلية", "العضد", "المرفق", "الساعد", "المعصم",
  "الرسغ", "اليد", "الاصابع", "الحوض", "الورك", "الفخذ",
  "الركبة", "الساق", "الكاحل", "القدم", "اصابع القدم",
];

// الجهة «من شخص آخر» تفتح سؤالاً فرعياً إلزامياً، و«أخرى» فيه تفتح حقلاً نصياً.
const REFERRAL_OTHER_PERSON = "من شخص آخر";
const REFERRAL_SUB_OTHER = "أخرى";

// Form schema with coercion for numbers and optional date
const formSchema = insertPatientSchema.extend({
  age: z.string().min(1, "العمر مطلوب"),
  // رقم الاتصال إلزامي لكل ملف جديد. الرسالة تأتي من المطبّع نفسه ليقرأ
  // الموظف سبب الرفض بالضبط («قصير» ≠ «حروف» ≠ «طول دولي خاطئ») بدل
  // «حقل مطلوب» الغامضة. الخادم يعيد الفحص نفسه — هذا للإرشاد لا للأمان.
  phone: z.string().superRefine((value, ctx) => {
    const result = normalizePhone(value);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.reason ?? "رقم اتصال صالح مطلوب" });
    }
  }),
  totalCost: z.coerce.number().optional(),
  sessionCount: z.coerce.number().optional(),
  injuryDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
  referralSource: z.string().min(1, "املأ هذا الحقل لتتمكن من الحفظ"),
  referralSubSource: z.string().optional().nullable(),
  referralSubSourceOther: z.string().optional(),
  registrationDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
})
  // الفرعي إلزامي حين تكون الجهة «من شخص آخر».
  .refine(
    (v) => v.referralSource !== REFERRAL_OTHER_PERSON || Boolean(v.referralSubSource),
    { path: ["referralSubSource"], message: "املأ هذا الحقل لتتمكن من الحفظ" },
  )
  // والنص إلزامي حين يكون الفرعي «أخرى».
  .refine(
    (v) => v.referralSubSource !== REFERRAL_SUB_OTHER || Boolean(v.referralSubSourceOther?.trim()),
    { path: ["referralSubSourceOther"], message: "املأ هذا الحقل لتتمكن من الحفظ" },
  );

type FormValues = z.infer<typeof formSchema>;

interface InjuryEntry {
  type: string;
  area: string;
  side: string;
}

interface TreatmentEntry {
  treatmentType: string;
  sessionCount: number;
  cost: number;
  isFree?: boolean;
}

export default function CreatePatient() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const branchSession = useBranchSession();
  const { t, dir } = useTranslation();
  const isAdmin = branchSession?.isAdmin || false;
  const userBranchId = branchSession?.branchId;
  // Physiotherapy diagnosis and the support's injury side stay the doctor's:
  // reception registers the service TYPE only, and the patient reaches the
  // doctor's worklist. Enforced again server-side on create.
  const canEditClinicalDetails =
    isAdmin ||
    branchSession?.role === "branch_manager" ||
    branchSession?.role === "doctor" ||
    Boolean((branchSession as any)?.permissions?.canWriteMedicalExam);
  // The amputation builder is the EXCEPTION (owner, 2026-07-31): reception sees
  // the limb in front of them, so recording it here saves the doctor retyping
  // it. The exam opens carrying whatever reception entered, and the doctor
  // remains free to change it — the exam is still what signs the record.
  const canEditAmputationBuilder = true;
  const userRole = branchSession?.role;
  const canBackdateRegistration = userRole !== "reception"; // موظفو الاستقبال لا يمكنهم التسجيل بتاريخ قديم
  
  // Non-admin users always use their branch, admin can select
  const defaultBranchId = !isAdmin && userBranchId ? userBranchId : (Number(searchParams.get("branch")) || 1);
  
  // بغداد (branch 1) وذي قار (branch 3) defaults to physiotherapy since most of their patients are physiotherapy
  const isDhiQarBranch = defaultBranchId === 3 || defaultBranchId === 1;
  
  const { mutate, isPending } = useCreatePatient();
  const { toast } = useToast();
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      //  **مرفوعةٌ افتراضاً** — والقاعدةُ افتراضُها `FALSE`، فالمرضى القدامى
      //  لا يستيقظون على رسالةٍ بعد النشر. الجديدُ وحده يرسل `true`.
      whatsappNotificationsEnabled: true,
      address: "",
      referralSource: "",
      referralSubSource: "",
      referralSubSourceOther: "",
      referralNotes: "",
      age: "",
      weight: "",
      height: "",
      medicalCondition: isDhiQarBranch ? "physiotherapy" : "amputee",
      isAmputee: isDhiQarBranch ? false : true,
      isPhysiotherapy: isDhiQarBranch ? true : false,
      isMedicalSupport: false,
      amputationSite: "",
      diseaseType: "",
      totalCost: 0,
      sessionCount: 0,
      injuryDate: "",
      injuryCause: "",
      registrationDate: (() => { const now = new Date(); const baghdadOffset = 3 * 60 * 60 * 1000; const baghdadNow = new Date(now.getTime() + baghdadOffset); return `${baghdadNow.getUTCFullYear()}-${String(baghdadNow.getUTCMonth() + 1).padStart(2, '0')}-${String(baghdadNow.getUTCDate()).padStart(2, '0')}`; })(),
      patientClassification: "",
      generalNotes: "",
      prostheticType: "",
      siliconType: "",
      siliconSize: "",
      suspensionSystem: "",
      footType: "",
      footSize: "",
      kneeJointType: "",
      treatmentType: "",
      supportType: "",
      injurySide: "",
      injuries: "",
      branchId: defaultBranchId,
    },
  });

  const conditionType = form.watch("medicalCondition");
  const selectedBranchId = form.watch("branchId");
  // Prosthetic (amputee) and medical-support cases must be assigned to an expert.
  const needsExpert = conditionType === "amputee" || conditionType === "medical_support";
  const [expertUserId, setExpertUserId] = useState<number | null>(null);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  // The cost is the commitment signal: cost > 0 → expert + delivery date
  // become visible and mandatory; cost empty → examination-only, no order.
  const totalCostWatch = Number(form.watch("totalCost")) || 0;
  const hasCommitCost = totalCostWatch > 0;

  // Experts allowed for the selected branch — server-filtered. Reception sees
  // only its own branch's experts; when an admin changes the branch the list
  // refetches and a now-disallowed expert selection is cleared.
  const { data: experts = [], isLoading: expertsLoading } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", selectedBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${selectedBranchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: needsExpert && hasCommitCost && !!selectedBranchId,
  });

  useEffect(() => {
    if (expertUserId != null && !experts.some((e) => e.id === expertUserId)) {
      setExpertUserId(null);
    }
  }, [experts, expertUserId]);

  // ══ **ضوابطُ البتر تبدأ فارغة** — الافتراضُ ليس إجابة ═══════════════════
  //  كانت تفتح على «احادي / سفلي / يمين»، فكلُّ مبتورٍ سُجّل بلا سؤالٍ يحمل
  //  هذا التعريفَ بعينه — ويقيس عليه الخبير. فالفراغُ الآن فراغ، والحفظُ
  //  يُردّ حتى يُجاب.
  const [amputationType, setAmputationType] = useState<string>("");
  const [singleLimb, setSingleLimb] = useState<string>("");
  const [singleSide, setSingleSide] = useState<string>("");
  const [singleAmputationDetail, setSingleAmputationDetail] = useState("");

  const [doubleLimbType, setDoubleLimbType] = useState<string>("");
  const [doubleRightDetail, setDoubleRightDetail] = useState("");
  const [doubleLeftDetail, setDoubleLeftDetail] = useState("");
  const [bothRightLimb, setBothRightLimb] = useState<string>("");
  const [bothLeftLimb, setBothLeftLimb] = useState<string>("");
  const [bothRightDetail, setBothRightDetail] = useState("");
  const [bothLeftDetail, setBothLeftDetail] = useState("");
  
  const [injuryEntries, setInjuryEntries] = useState<InjuryEntry[]>([{ type: "", area: "", side: "" }]);
  const [manualCostOverride, setManualCostOverride] = useState(false);
  const canEnterZeroSessions = isAdmin || userRole === "branch_manager";
  const [treatmentEntries, setTreatmentEntries] = useState<TreatmentEntry[]>([{ treatmentType: "", sessionCount: 0, cost: 0 }]);

  // Silicone prosthetics state
  const [siliconePart, setSiliconePart] = useState("");
  const [siliconeSide, setSiliconeSide] = useState<string>("");
  const [siliconeNotes, setSiliconeNotes] = useState("");

  //  أجزاءُ التعريف في كائنٍ واحد — يُمرَّر للباني وللفحص معاً.
  const amputationParts = {
    amputationType, singleLimb, singleSide, singleDetail: singleAmputationDetail,
    doubleLimbType, doubleRightDetail, doubleLeftDetail,
    bothRightLimb, bothLeftLimb, bothRightDetail, bothLeftDetail,
    siliconePart, siliconeSide, siliconeNotes,
  };

  // Build amputationSite string from selections
  useEffect(() => {
    if (conditionType !== "amputee") return;
    // Builder hidden for this role ⇒ its default state must not silently write
    // "احادي - طرف سفلي - يمين" onto every reception-registered amputee.
    if (!canEditAmputationBuilder) return;
    
    //  **تُبنى بالباني المشترك** لا بنسخةٍ ثانية هنا: صيغةٌ واحدة تقرؤها
    //  «تعديل مريض» وأمرُ التصنيع ومعاينةُ الطبيب.
    //
    //  **ولا تُكتب إلّا حين تكتمل**: الباني يكتب «طرف سفلي» و«يمين» افتراضاً
    //  حين لا يُختار شيء (تعبيرٌ ثلاثيّ)، فسلسلةٌ نصفُ مختارة تبدو مكتملةً
    //  للمحلّل وتمرّ على الخادم. فالناقصُ يُرسَل فراغاً — والخادمُ يردّه.
    form.setValue("amputationSite", amputationSiteOf(amputationParts));
  }, [amputationType, singleLimb, singleSide, singleAmputationDetail, doubleLimbType, doubleRightDetail, doubleLeftDetail, bothRightLimb, bothLeftLimb, bothRightDetail, bothLeftDetail, siliconePart, siliconeSide, siliconeNotes, conditionType, canEditAmputationBuilder, form]);

  // Sync boolean flags with string selection, AND clear the fields belonging to
  // the services no longer selected.
  //
  // Clearing matters as much as flagging. Switching the service used to leave
  // the previous one's values behind — the amputationSite builder above bails
  // out early once conditionType is no longer "amputee", so it never erases
  // what it already wrote — and the form starts on أطراف for most branches. A
  // receptionist who clicked through the أطراف fields before correcting to
  // مساند therefore submitted a stale amputationSite, and the server read that
  // leftover as proof the patient needed a limb. Each service now leaves the
  // form as cleanly as physiotherapy always did.
  useEffect(() => {
    const PROSTHETIC_FIELDS = [
      "amputationSite", "prostheticType", "siliconType", "siliconSize",
      "suspensionSystem", "footType", "footSize", "kneeJointType",
    ] as const;
    const SUPPORT_FIELDS = ["supportType"] as const;
    const PHYSIO_FIELDS = ["diseaseType", "injuries", "injuryType", "injuryArea", "treatmentType"] as const;
    const clear = (fields: readonly string[]) =>
      fields.forEach((f) => form.setValue(f as any, "" as any));

    if (conditionType === "amputee") {
      form.setValue("isAmputee", true);
      form.setValue("isPhysiotherapy", false);
      form.setValue("isMedicalSupport", false);
      clear(SUPPORT_FIELDS);
      clear(PHYSIO_FIELDS);
    } else if (conditionType === "physiotherapy") {
      form.setValue("isAmputee", false);
      form.setValue("isPhysiotherapy", true);
      form.setValue("isMedicalSupport", false);
      clear(PROSTHETIC_FIELDS);
      clear(SUPPORT_FIELDS);
    } else if (conditionType === "medical_support") {
      form.setValue("isAmputee", false);
      form.setValue("isPhysiotherapy", false);
      form.setValue("isMedicalSupport", true);
      clear(PROSTHETIC_FIELDS);
      clear(PHYSIO_FIELDS);
    }
  }, [conditionType, form]);

  // Cross-branch duplicate check while the name is typed (owner, 2026-08-06).
  // Reception cannot see other branches, so a returning patient was invisible
  // and a second file got opened for the same person. Debounced so it asks
  // once the typing settles, and it never blocks saving — it informs.
  const typedName = form.watch("name");
  const [otherBranchMatches, setOtherBranchMatches] = useState<
    { id: number; name: string; phone: string | null; branchId: number; branchName: string | null }[]
  >([]);
  useEffect(() => {
    const q = (typedName ?? "").trim();
    if (q.length < 3) {
      setOtherBranchMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients/lookup-by-name?name=${encodeURIComponent(q)}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOtherBranchMatches(data?.matches ?? []);
      } catch {
        // A failed check must never stand between reception and registering.
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [typedName]);

  // Sync injury entries with form fields
  useEffect(() => {
    if (conditionType !== "physiotherapy") return;
    const filtered = injuryEntries.filter(e => e.type || e.area);
    form.setValue("injuries", filtered.length > 0 ? JSON.stringify(filtered) : "");
    form.setValue("injuryType", injuryEntries.map(e => e.type).filter(Boolean).join("، "));
    form.setValue("injuryArea", injuryEntries.map(e => e.area).filter(Boolean).join("، "));
  }, [injuryEntries, conditionType, form]);

  // Ensure branchId is properly set for non-admin users
  useEffect(() => {
    if (!isAdmin && userBranchId && userBranchId > 0) {
      form.setValue("branchId", userBranchId);
    }
  }, [isAdmin, userBranchId, form]);

  // Auto-calculate costs based on treatmentEntries
  useEffect(() => {
    if (conditionType !== "physiotherapy") return;
    if (manualCostOverride) return;

    const updatedEntries = treatmentEntries.map(entry => {
      if (!entry.treatmentType) return { ...entry, cost: 0 };
      const price = TREATMENT_PRICES[entry.treatmentType];
      if (price === undefined) return entry;
      if (entry.treatmentType === "استشارة طبية") {
        return { ...entry, sessionCount: 0, cost: 0 };
      }
      if (entry.isFree) {
        return { ...entry, cost: 0 };
      }
      return { ...entry, cost: price * (entry.sessionCount || 0) };
    });

    const hasChanged = updatedEntries.some((e, i) => e.cost !== treatmentEntries[i].cost || e.sessionCount !== treatmentEntries[i].sessionCount);
    if (hasChanged) {
      setTreatmentEntries(updatedEntries);
    }

    const totalCost = updatedEntries.filter(e => !e.isFree).reduce((sum, e) => sum + e.cost, 0);
    form.setValue("totalCost", totalCost);

    const allTypes = updatedEntries.map(e => e.treatmentType).filter(Boolean).join("، ");
    form.setValue("treatmentType", allTypes);

    const totalSessions = updatedEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0);
    form.setValue("sessionCount", totalSessions);
  }, [treatmentEntries, conditionType, form, manualCostOverride]);

  function onSubmit(values: FormValues) {
    // The classification is now the WORKFLOW SWITCH (owner, 2026-07-29):
    // «مريض جديد» goes to the doctor first, «مريض قديم» goes straight to
    // reception's تخصيص/expert. An unclassified patient would silently take
    // the new-patient path, so the choice must be explicit.
    if (!values.patientClassification) {
      toast({
        title: "اختر تصنيف المريض",
        description: "جديد = معاينة الطبيب أولاً · قديم = تخصيص وإسناد مباشر من الاستعلامات.",
        variant: "destructive",
      });
      return;
    }
    // ══ **البياناتُ التي لا يُصنَع جهازٌ بدونها — تُفحَص هنا لا بعد الردّ** ══
    //  الخادمُ يحرسها، لكنّ انتظارَ ٤٠٠ ليعرف الموظّفُ ما ينقص يعني ملءَ
    //  النموذج كلِّه ثم الاصطدام. والقاعدةُ **مشتركة** فلا تنحرف الشاشةُ عن
    //  الخادم: `checkRequiredPatientData` نفسُها التي تفحص في `routes.ts`.
    {
      const req = checkRequiredPatientData({
        age: values.age, height: (values as any).height, weight: (values as any).weight,
        isAmputee: conditionType === "amputee",
        //  **والفحصُ على الأجزاء لا على السلسلة** حين يكون الباني ظاهراً:
        //  السلسلةُ تحمل افتراضاتِ الباني، والأجزاءُ تحمل ما اختاره الموظّف.
        amputationSite: conditionType === "amputee" && canEditAmputationBuilder
          ? amputationSiteOf(amputationParts)
          : values.amputationSite,
      });
      const ampMissing = conditionType === "amputee" && canEditAmputationBuilder
        ? checkAmputationParts(amputationParts as any).missing : [];
      if (!req.ok) {
        toast({
          title: "بيانات ناقصة",
          description: req.message ?? "أكمل البيانات المطلوبة",
          variant: "destructive",
        });
        return;
      }
      void ampMissing;
    }
    // REGISTRATION IS PRICELESS for every condition type now (owner's flow):
    // - طرف/مسند: priced after the exam via «تخصيص وإسناد خبير».
    // - علاج طبيعي: priced after the exam via «الكلفة والجلسات» in the
    //   registry (the doctor decides the plan; the server computes the cost).
    // Any auto-computed cost/type/sessions left in the form state is stripped.
    // «أخرى» تُحفظ بنصّها المكتوب لا بالكلمة نفسها، وإلا صار العمود يقول
    // «أخرى» في كل مرة ولا يُقرأ منه شيء. والحقل النصّي حقل نموذج لا عمود.
    const { referralSubSourceOther, ...rest } = values as any;
    const subSource =
      values.referralSource === REFERRAL_OTHER_PERSON
        ? (values.referralSubSource === REFERRAL_SUB_OTHER
            ? (referralSubSourceOther || "").trim()
            : values.referralSubSource || null)
        : null;

    const submitData = {
      ...rest,
      referralSubSource: subSource,
      totalCost: 0,
      treatmentType: "",
      sessionCount: 0,
    };
    mutate(submitData as any, {
      onSuccess: (data) => {
        setLocation(`/patients/${data.id}`);
      },
    });
  }

  const BackArrow = dir === "ltr" ? ArrowLeft : ArrowRight;

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 page-transition py-2 md:py-6">
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <Button variant="ghost" onClick={() => setLocation("/patients")} className="p-2 shrink-0">
          <BackArrow className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800">{t.patientForm.createTitle}</h2>
          <p className="text-xs md:text-base text-muted-foreground">{t.patientForm.createSubtitle}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card className="p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border-border/60">
            <h3 className="text-base md:text-lg font-bold text-primary mb-3 md:mb-4 border-b pb-2">{t.patientForm.personalData}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {canBackdateRegistration && (
                <FormField
                  control={form.control}
                  name="registrationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.registrationDate}</FormLabel>
                      <DatePickerIraq 
                        value={field.value || ""}
                        onChange={field.onChange}
                        data-testid="input-registration-date"
                      />
                      <p className="text-xs text-muted-foreground">{t.patientForm.registrationDateNote}</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.fullName}</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white" placeholder={t.patientForm.fullNamePlaceholder} />
                    </FormControl>
                    <FormMessage />
                    {/* Already on file at another centre? Say so BEFORE a second
                        file is opened — the transfer moves his whole history,
                        a new file starts him from zero. */}
                    {otherBranchMatches.length > 0 && (
                      <div
                        className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                        data-testid="notice-patient-other-branch"
                      >
                        <p className="font-semibold mb-1">
                          هذا الاسم مسجَّل في فرع آخر — لا تفتح ملفاً جديداً
                        </p>
                        <ul className="space-y-0.5 mb-2">
                          {otherBranchMatches.map((m) => (
                            <li key={m.id}>
                              {m.name} — <b>{m.branchName || `فرع #${m.branchId}`}</b>
                              {m.phone ? ` — ${m.phone}` : ""}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs">
                          إن كان هو نفسه، اطلب من مدير الفرع نقله إلى فرعك من صفحة المريض
                          («نقل المريض») — فينتقل بكل زياراته ودفعاته وتاريخه. أما فتح ملف
                          جديد فيبدأ به من الصفر ويترك له ملفين.
                        </p>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    {/* النجمة هنا وحدها: الحقل إلزامي عند فتح ملف جديد، أما
                        «تعديل مريض» فيقبل ملفاً قديماً بلا رقم إطلاقاً. */}
                    <FormLabel>{t.patientForm.phone} *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-white" dir="ltr" inputMode="tel" placeholder={t.patientForm.phonePlaceholder} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t.patientForm.phoneHint}</p>
                    <FormMessage />

                    {/* ══ إشعاراتُ واتساب — **مربّعٌ واحد، بلا نافذةٍ ولا اعتماد** ══
                        الموظّفُ يكلّم المريضَ وهو يكتب رقمه، فيسأله في الجملة
                        نفسها. ومربّعٌ مرفوعٌ افتراضاً هو المسلك المتوقَّع في
                        أي مؤسّسةٍ حديثة — ومَن رفض يُطفئه بضغطةٍ واحدة.
                        وحفظُ الملفّ هو الموافقة: لا شاشةَ ثانية ولا توقيع. */}
                    <label
                      className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 cursor-pointer"
                      data-testid="label-whatsapp-consent"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-emerald-600"
                        checked={form.watch("whatsappNotificationsEnabled") !== false}
                        onChange={(e) =>
                          form.setValue("whatsappNotificationsEnabled", e.target.checked)}
                        data-testid="checkbox-whatsapp-consent"
                      />
                      <span className="text-xs leading-relaxed">
                        <span className="font-medium text-emerald-900">
                          إرسال إشعارات وتحديثات المركز عبر واتساب على الرقم المسجل
                        </span>
                        <span className="block text-muted-foreground mt-0.5">
                          بحفظ الملف سيُستخدم الرقم لإرسال رسائل الخدمة وتحديثاتها.
                        </span>
                      </span>
                    </label>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t.patientForm.address}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.addressPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referralSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.referralSource}</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        // تبديل الجهة يُلغي إجابة السؤال الفرعي القديمة.
                        if (v !== REFERRAL_OTHER_PERSON) {
                          form.setValue("referralSubSource", "");
                          form.setValue("referralSubSourceOther", "");
                        }
                        form.trigger("referralSource");
                      }}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="bg-white"
                          data-testid="select-referral-source"
                          onBlur={() => form.trigger("referralSource")}
                        >
                          <SelectValue placeholder={t.patientForm.selectReferralSource} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="طبيبنا">{t.patientForm.refOurDoctor}</SelectItem>
                        <SelectItem value="طبيب خارجي">{t.patientForm.refExternalDoctor}</SelectItem>
                        <SelectItem value="مستشفى">{t.patientForm.refHospital}</SelectItem>
                        <SelectItem value="أطباء مستشفى العين">{t.patientForm.refAinDoctors}</SelectItem>
                        <SelectItem value="جهة حكومية">{t.patientForm.refGovernment}</SelectItem>
                        <SelectItem value="منظمة انسانية">{t.patientForm.refNGO}</SelectItem>
                        <SelectItem value="فيسبوك">{t.patientForm.refFacebook}</SelectItem>
                        <SelectItem value="انستاغرام">{t.patientForm.refInstagram}</SelectItem>
                        <SelectItem value="تيك توك">{t.patientForm.refTikTok}</SelectItem>
                        <SelectItem value="كوكل">{t.patientForm.refGoogle}</SelectItem>
                        <SelectItem value="شاشة إعلان خارجية">{t.patientForm.refOutdoorScreen}</SelectItem>
                        <SelectItem value={REFERRAL_OTHER_PERSON}>{t.patientForm.refOtherPerson}</SelectItem>
                        <SelectItem value="دكتور بيرم">{t.patientForm.refDrBiram}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* «من شخص آخر» يجيب عمّن أرسل المريض، لا عمّا أوصل المركز إلى
                  ذلك الشخص — وهذا السؤال الفرعي الإلزامي يسدّ الفجوة. */}
              {form.watch("referralSource") === REFERRAL_OTHER_PERSON && (
                <FormField
                  control={form.control}
                  name="referralSubSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.refHowPersonKnew}</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (v !== REFERRAL_SUB_OTHER) form.setValue("referralSubSourceOther", "");
                          form.trigger("referralSubSource");
                        }}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="bg-white"
                            data-testid="select-referral-sub-source"
                            onBlur={() => form.trigger("referralSubSource")}
                          >
                            <SelectValue placeholder={t.patientForm.selectHowPersonKnew} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="فيسبوك">{t.patientForm.refSubFacebook}</SelectItem>
                          <SelectItem value="انستاغرام">{t.patientForm.refSubInstagram}</SelectItem>
                          <SelectItem value="تيك توك">{t.patientForm.refSubTikTok}</SelectItem>
                          <SelectItem value="واتس اب">{t.patientForm.refSubWhatsApp}</SelectItem>
                          <SelectItem value="مريض سابق لدينا">{t.patientForm.refSubFormerPatient}</SelectItem>
                          <SelectItem value="شاشة اعلان">{t.patientForm.refSubAdScreen}</SelectItem>
                          <SelectItem value={REFERRAL_SUB_OTHER}>{t.patientForm.refSubOther}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("referralSource") === REFERRAL_OTHER_PERSON &&
                form.watch("referralSubSource") === REFERRAL_SUB_OTHER && (
                <FormField
                  control={form.control}
                  name="referralSubSourceOther"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.refSubOtherLabel}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          className="bg-white"
                          data-testid="input-referral-sub-source-other"
                          onBlur={() => {
                            field.onBlur();
                            form.trigger("referralSubSourceOther");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("referralSource") && (
                <FormField
                  control={form.control}
                  name="referralNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.additionalNotes}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.referralNotesPlaceholder} data-testid="input-referral-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.age}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.weightKg}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.weightPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.heightCm}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.heightPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.branch}</FormLabel>
                    {isAdmin ? (
                      <Select 
                        onValueChange={(val) => field.onChange(Number(val))} 
                        defaultValue={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white" data-testid="select-branch">
                            <SelectValue placeholder={t.patientForm.selectBranch} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches?.map((branch) => (
                            <SelectItem key={branch.id} value={String(branch.id)}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 h-10 px-3 bg-white border border-input rounded-md">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
                          {branchSession?.branchName || branches?.find(b => b.id === userBranchId)?.name}
                        </span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border-border/60">
            <h3 className="text-lg font-bold text-primary mb-4 border-b pb-2">{t.patientForm.medicalDetails}</h3>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="medicalCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t.patientForm.conditionType}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="amputee" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {t.patientForm.amputeeCase}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="physiotherapy" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {t.patientForm.physiotherapyCase}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="medical_support" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {t.patientForm.medicalSupportCase}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="injuryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.injuryDate}</FormLabel>
                    <DatePickerIraq 
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionType === "physiotherapy" && (
                <div className="space-y-4">
                  <FormField control={form.control} name="injuryType" render={({ field }) => (<input type="hidden" {...field} value={field.value || ""} />)} />
                  <FormField control={form.control} name="injuryArea" render={({ field }) => (<input type="hidden" {...field} value={field.value || ""} />)} />
                  <FormField control={form.control} name="injuries" render={({ field }) => (<input type="hidden" {...field} value={field.value || ""} />)} />

                  <div className="space-y-3">
                    <FormLabel className="text-base">{t.patientForm.injuries}</FormLabel>
                    {injuryEntries.map((entry, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-slate-50/50 space-y-3" data-testid={`injury-entry-${index}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium text-muted-foreground">{`${t.patientForm.injuryNum} ${index + 1}`}</span>
                          {injuryEntries.length > 1 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              data-testid={`button-remove-injury-${index}`}
                              onClick={() => {
                                setInjuryEntries(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <FormLabel className="text-xs">{t.patientForm.injuryType}</FormLabel>
                            <Select
                              value={entry.type}
                              onValueChange={(val) => {
                                setInjuryEntries(prev => prev.map((e, i) => i === index ? { ...e, type: val } : e));
                              }}
                            >
                              <SelectTrigger className="bg-white" data-testid={`select-injury-type-${index}`}>
                                <SelectValue placeholder={t.patientForm.selectInjuryType} />
                              </SelectTrigger>
                              <SelectContent>
                                {injuryTypeOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{(t.injuryTypes as Record<string,string>)[opt] || opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <FormLabel className="text-xs">{t.patientForm.injuryArea}</FormLabel>
                            <Select
                              value={entry.area}
                              onValueChange={(val) => {
                                setInjuryEntries(prev => prev.map((e, i) => i === index ? { ...e, area: val } : e));
                              }}
                            >
                              <SelectTrigger className="bg-white" data-testid={`select-injury-area-${index}`}>
                                <SelectValue placeholder={t.patientForm.selectInjuryArea} />
                              </SelectTrigger>
                              <SelectContent>
                                {injuryAreaOptions.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{(t.injuryAreas as Record<string,string>)[opt] || opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <FormLabel className="text-xs">{t.patientForm.injurySide}</FormLabel>
                            <Select
                              value={entry.side}
                              onValueChange={(val) => {
                                setInjuryEntries(prev => prev.map((e, i) => i === index ? { ...e, side: val } : e));
                              }}
                            >
                              <SelectTrigger className="bg-white" data-testid={`select-injury-side-${index}`}>
                                <SelectValue placeholder={t.patientForm.optional} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="يمين">{(t.injurySides as Record<string,string>)["يمين"] || "يمين"}</SelectItem>
                                <SelectItem value="يسار">{(t.injurySides as Record<string,string>)["يسار"] || "يسار"}</SelectItem>
                                <SelectItem value="كلاهما">{(t.injurySides as Record<string,string>)["كلاهما"] || "كلاهما"}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="button-add-injury"
                      onClick={() => setInjuryEntries(prev => [...prev, { type: "", area: "", side: "" }])}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      {t.patientForm.addAnotherInjury}
                    </Button>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="injuryCause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.injuryCause}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.injuryCausePlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionType === "amputee" && !canEditAmputationBuilder && (
                <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3" data-testid="note-doctor-decides">
                  تفاصيل البتر ونوع الطرف يحدّدها الطبيب في المعاينة — سيظهر المريض في قائمة «بانتظار معاينة أطراف صناعية» بعد الحفظ.
                </p>
              )}

              {conditionType === "amputee" && canEditAmputationBuilder && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Amputation Type Selection */}
                  <div className="space-y-4">
                    <FormLabel className="text-base">{t.patientForm.amputationType}</FormLabel>
                    <RadioGroup
                      value={amputationType}
                      onValueChange={(val) => setAmputationType(val as "single" | "double" | "silicone")}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                        <RadioGroupItem value="single" id="single" />
                        <label htmlFor="single" className="font-normal cursor-pointer flex-1">{t.patientForm.singleAmputation}</label>
                      </div>
                      <div className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                        <RadioGroupItem value="double" id="double" />
                        <label htmlFor="double" className="font-normal cursor-pointer flex-1">{t.patientForm.doubleAmputation}</label>
                      </div>
                      <div className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                        <RadioGroupItem value="silicone" id="silicone" />
                        <label htmlFor="silicone" className="font-normal cursor-pointer flex-1">{t.patientForm.siliconeProsthetics}</label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Single Amputation Options */}
                  {amputationType === "single" && (
                    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel>{t.patientForm.limb}</FormLabel>
                          <Select value={singleLimb} onValueChange={(val) => { setSingleLimb(val); setSingleAmputationDetail(""); }}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="اختر الطرف" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upper">{t.patientForm.upperLimb}</SelectItem>
                              <SelectItem value="lower">{t.patientForm.lowerLimb}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>{t.patientForm.side}</FormLabel>
                          <Select value={singleSide} onValueChange={setSingleSide}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="اختر الجهة" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="right">{t.patientForm.right}</SelectItem>
                              <SelectItem value="left">{t.patientForm.left}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {/*  **ولا قائمةَ مستويات قبل اختيار الطرف**: قوائمُ
                          العلويّ غيرُ السفليّ، وعرضُ إحداهما افتراضاً يدعو
                          إلى مستوىً لا ينتمي للطرف المختار. */}
                      {singleLimb && (
                      <div className="space-y-2">
                        <FormLabel>{t.patientForm.amputationDetailType}</FormLabel>
                        {singleLimb === "lower" ? (
                          <Select value={singleAmputationDetail} onValueChange={setSingleAmputationDetail}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder={t.patientForm.selectAmputationType} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="جوبارت">جوبارت</SelectItem>
                              <SelectItem value="سايمز">سايمز</SelectItem>
                              <SelectItem value="تحت الركبة">تحت الركبة</SelectItem>
                              <SelectItem value="خلال الركبة">خلال الركبة</SelectItem>
                              <SelectItem value="فوق الركبة">فوق الركبة</SelectItem>
                              <SelectItem value="خلال الحوض">خلال الحوض</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select value={singleAmputationDetail} onValueChange={setSingleAmputationDetail}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder={t.patientForm.selectAmputationType} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="اصبع">اصبع</SelectItem>
                              <SelectItem value="خلال الكف">خلال الكف</SelectItem>
                              <SelectItem value="خلال الرسغ">خلال الرسغ</SelectItem>
                              <SelectItem value="تحت المرفق">تحت المرفق</SelectItem>
                              <SelectItem value="خلال المرفق">خلال المرفق</SelectItem>
                              <SelectItem value="فوق المرفق">فوق المرفق</SelectItem>
                              <SelectItem value="خلال الكتف">خلال الكتف</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      )}
                    </div>
                  )}

                  {/* Double Amputation Options */}
                  {amputationType === "double" && (
                    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                      <div className="space-y-2">
                        <FormLabel>{t.patientForm.doubleAmputationType}</FormLabel>
                        <Select value={doubleLimbType} onValueChange={(val) => { setDoubleLimbType(val); setDoubleRightDetail(""); setDoubleLeftDetail(""); setBothRightDetail(""); setBothLeftDetail(""); }}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="اختر النمط" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upper">{t.patientForm.upper}</SelectItem>
                            <SelectItem value="lower">{t.patientForm.lower}</SelectItem>
                            <SelectItem value="both">{t.patientForm.upperAndLower}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Upper or Lower double amputation */}
                      {(doubleLimbType === "upper" || doubleLimbType === "lower") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FormLabel>{t.patientForm.rightAmputation}</FormLabel>
                            {doubleLimbType === "lower" ? (
                              <Select value={doubleRightDetail} onValueChange={setDoubleRightDetail}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="جوبارت">جوبارت</SelectItem>
                                  <SelectItem value="سايمز">سايمز</SelectItem>
                                  <SelectItem value="تحت الركبة">تحت الركبة</SelectItem>
                                  <SelectItem value="خلال الركبة">خلال الركبة</SelectItem>
                                  <SelectItem value="فوق الركبة">فوق الركبة</SelectItem>
                                  <SelectItem value="خلال الحوض">خلال الحوض</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select value={doubleRightDetail} onValueChange={setDoubleRightDetail}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="اصبع">اصبع</SelectItem>
                                  <SelectItem value="خلال الكف">خلال الكف</SelectItem>
                                  <SelectItem value="خلال الرسغ">خلال الرسغ</SelectItem>
                                  <SelectItem value="تحت المرفق">تحت المرفق</SelectItem>
                                  <SelectItem value="خلال المرفق">خلال المرفق</SelectItem>
                                  <SelectItem value="فوق المرفق">فوق المرفق</SelectItem>
                                  <SelectItem value="خلال الكتف">خلال الكتف</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="space-y-2">
                            <FormLabel>{t.patientForm.leftAmputation}</FormLabel>
                            {doubleLimbType === "lower" ? (
                              <Select value={doubleLeftDetail} onValueChange={setDoubleLeftDetail}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="جوبارت">جوبارت</SelectItem>
                                  <SelectItem value="سايمز">سايمز</SelectItem>
                                  <SelectItem value="تحت الركبة">تحت الركبة</SelectItem>
                                  <SelectItem value="خلال الركبة">خلال الركبة</SelectItem>
                                  <SelectItem value="فوق الركبة">فوق الركبة</SelectItem>
                                  <SelectItem value="خلال الحوض">خلال الحوض</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select value={doubleLeftDetail} onValueChange={setDoubleLeftDetail}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="اصبع">اصبع</SelectItem>
                                  <SelectItem value="خلال الكف">خلال الكف</SelectItem>
                                  <SelectItem value="خلال الرسغ">خلال الرسغ</SelectItem>
                                  <SelectItem value="تحت المرفق">تحت المرفق</SelectItem>
                                  <SelectItem value="خلال المرفق">خلال المرفق</SelectItem>
                                  <SelectItem value="فوق المرفق">فوق المرفق</SelectItem>
                                  <SelectItem value="خلال الكتف">خلال الكتف</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Both upper and lower double amputation */}
                      {doubleLimbType === "both" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3 p-3 border rounded-lg bg-white">
                            <FormLabel className="text-primary">{t.patientForm.rightSide}</FormLabel>
                            <Select value={bothRightLimb} onValueChange={(val) => { setBothRightLimb(val); setBothRightDetail(""); }}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الطرف" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upper">{t.patientForm.upper}</SelectItem>
                                <SelectItem value="lower">{t.patientForm.lower}</SelectItem>
                              </SelectContent>
                            </Select>
                            {bothRightLimb === "lower" ? (
                              <Select value={bothRightDetail} onValueChange={setBothRightDetail}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="جوبارت">جوبارت</SelectItem>
                                  <SelectItem value="سايمز">سايمز</SelectItem>
                                  <SelectItem value="تحت الركبة">تحت الركبة</SelectItem>
                                  <SelectItem value="خلال الركبة">خلال الركبة</SelectItem>
                                  <SelectItem value="فوق الركبة">فوق الركبة</SelectItem>
                                  <SelectItem value="خلال الحوض">خلال الحوض</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select value={bothRightDetail} onValueChange={setBothRightDetail}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="اصبع">اصبع</SelectItem>
                                  <SelectItem value="خلال الكف">خلال الكف</SelectItem>
                                  <SelectItem value="خلال الرسغ">خلال الرسغ</SelectItem>
                                  <SelectItem value="تحت المرفق">تحت المرفق</SelectItem>
                                  <SelectItem value="خلال المرفق">خلال المرفق</SelectItem>
                                  <SelectItem value="فوق المرفق">فوق المرفق</SelectItem>
                                  <SelectItem value="خلال الكتف">خلال الكتف</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div className="space-y-3 p-3 border rounded-lg bg-white">
                            <FormLabel className="text-primary">{t.patientForm.leftSide}</FormLabel>
                            <Select value={bothLeftLimb} onValueChange={(val) => { setBothLeftLimb(val); setBothLeftDetail(""); }}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الطرف" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upper">{t.patientForm.upper}</SelectItem>
                                <SelectItem value="lower">{t.patientForm.lower}</SelectItem>
                              </SelectContent>
                            </Select>
                            {bothLeftLimb === "lower" ? (
                              <Select value={bothLeftDetail} onValueChange={setBothLeftDetail}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="جوبارت">جوبارت</SelectItem>
                                  <SelectItem value="سايمز">سايمز</SelectItem>
                                  <SelectItem value="تحت الركبة">تحت الركبة</SelectItem>
                                  <SelectItem value="خلال الركبة">خلال الركبة</SelectItem>
                                  <SelectItem value="فوق الركبة">فوق الركبة</SelectItem>
                                  <SelectItem value="خلال الحوض">خلال الحوض</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Select value={bothLeftDetail} onValueChange={setBothLeftDetail}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t.patientForm.selectAmputationType} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="اصبع">اصبع</SelectItem>
                                  <SelectItem value="خلال الكف">خلال الكف</SelectItem>
                                  <SelectItem value="خلال الرسغ">خلال الرسغ</SelectItem>
                                  <SelectItem value="تحت المرفق">تحت المرفق</SelectItem>
                                  <SelectItem value="خلال المرفق">خلال المرفق</SelectItem>
                                  <SelectItem value="فوق المرفق">فوق المرفق</SelectItem>
                                  <SelectItem value="خلال الكتف">خلال الكتف</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Silicone Prosthetics Options */}
                  {amputationType === "silicone" && (
                    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel>{t.patientForm.siliconePartType}</FormLabel>
                          <Select value={siliconePart} onValueChange={setSiliconePart}>
                            <SelectTrigger className="bg-white" data-testid="select-silicone-part">
                              <SelectValue placeholder={t.patientForm.selectSiliconePart} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="اذن">اذن</SelectItem>
                              <SelectItem value="انف">انف</SelectItem>
                              <SelectItem value="محجر عين">محجر عين</SelectItem>
                              <SelectItem value="اصبع">اصبع</SelectItem>
                              <SelectItem value="كف">كف</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {siliconePart && siliconePart !== "انف" && (
                          <div className="space-y-2">
                            <FormLabel>{t.patientForm.amputationSide}</FormLabel>
                            <Select value={siliconeSide} onValueChange={setSiliconeSide}>
                              <SelectTrigger className="bg-white" data-testid="select-silicone-side">
                                <SelectValue placeholder="اختر الجهة" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="right">{t.patientForm.right}</SelectItem>
                                <SelectItem value="left">{t.patientForm.left}</SelectItem>
                                <SelectItem value="both">{t.patientForm.bothSides}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FormLabel>{t.patientForm.generalNotes}</FormLabel>
                        <Input 
                          value={siliconeNotes} 
                          onChange={(e) => setSiliconeNotes(e.target.value)}
                          placeholder={t.patientForm.generalNotesPlaceholder}
                          className="bg-white"
                          data-testid="input-silicone-notes"
                        />
                      </div>
                    </div>
                  )}

                  {/* Device specs (نوع الطرف/السليكون/التعليق/القدم/الحذاء/مفصل الركبة)
                      are NOT collected at registration anymore — the doctor decides
                      them during the exam, so reception fills them AFTER the exam via
                      the «تخصيص الطرف/المسند» step in the patients registry. */}
                  {false && (amputationType === "single" || amputationType === "double") && (
                    <>
                  <FormField
                    control={form.control}
                    name="prostheticType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.prostheticType}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.prostheticTypePlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="siliconType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.patientForm.siliconType}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.siliconTypePlaceholder} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="siliconSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.patientForm.siliconSize}</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" inputMode="numeric" value={field.value || ""} className="bg-white" placeholder={t.patientForm.siliconSizePlaceholder} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="suspensionSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.suspensionSystem}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.suspensionPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="footType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.patientForm.footType}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.footTypePlaceholder} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="footSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t.patientForm.footSize}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.footSizePlaceholder} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="kneeJointType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.kneeJointType}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.kneeJointPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </>
                  )}
                </div>
              )}

              {/* Physiotherapy needs no doctor's exam in any branch (owner,
                  2026-08-01): reception fills everything, and a doctor's exam
                  is a welcome extra rather than a gate. */}
              {conditionType === "physiotherapy" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="diseaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.diagnosisType}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.diagnosisPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Medical supports now work exactly like أطراف (owner,
                  2026-08-06): reception records the preliminary decision it can
                  see, and the doctor's exam opens carrying it and may change it.
                  The label and placeholder come from `shared/case_fields`, the
                  same source the doctor's prescription reads, so a
                  reception-written support is identical to a doctor-written one. */}
              {conditionType === "medical_support" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {SUPPORT_SPECS.map((spec) => (
                    <FormField
                      key={spec.key}
                      control={form.control}
                      name={spec.key as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{spec.label}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              className="bg-white"
                              placeholder={spec.placeholder}
                              data-testid={`input-${spec.key}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormField
                    control={form.control}
                    name="injurySide"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.injurySide}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.injurySidePlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {defaultBranchId && (
                <FormField
                  control={form.control}
                  name="patientClassification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.patientClassification} <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-white" data-testid="select-patient-classification">
                            <SelectValue placeholder={t.patientForm.selectClassification} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">{t.patientForm.newPatient}</SelectItem>
                          <SelectItem value="past">{t.patientForm.pastPatient}</SelectItem>
                        </SelectContent>
                      </Select>
                      {/* The classification routes the whole workflow now. */}
                      <p className="text-xs text-muted-foreground">
                        جديد = معاينة الطبيب أولاً · قديم = تخصيص وإسناد خبير مباشرة من الاستعلامات
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="generalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.generalNotesLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-white" placeholder={t.patientForm.generalNotesExpandedPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Physio pricing (نوع العلاج/الجلسات/الكلفة) moved to the
                  post-exam «الكلفة والجلسات» step in the patients registry —
                  the doctor decides the plan, then reception prices it. */}
              {conditionType === "physiotherapy" && (
                <div className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
                  يُسجَّل المريض الآن <b>دون كلفة أو جلسات</b>. بعد فحص الطبيب، حدِّد الأنواع والجلسات من زر <b>«الكلفة والجلسات»</b> بجانب المريض في سجل المرضى — وتُحسب الكلفة تلقائياً.
                </div>
              )}

              <FormField
                control={form.control}
                name="treatmentType"
                render={({ field }) => <input type="hidden" {...field} value={field.value || ""} />}
              />
              <FormField
                control={form.control}
                name="sessionCount"
                render={({ field }) => <input type="hidden" {...field} value={field.value || 0} />}
              />

              {/* Registration is PRICELESS for every type now: cost is entered
                  after the exam (تخصيص for devices, الكلفة والجلسات for physio). */}
              {false && (
                <FormField
                  control={form.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.estimatedCost}</FormLabel>
                      <FormControl>
                        <MoneyInput
                          value={field.value ?? ""}
                          readOnly={!isAdmin && conditionType === "physiotherapy"}
                          className={`${!isAdmin && conditionType === "physiotherapy" ? "bg-slate-100 cursor-not-allowed" : "bg-white"}`}
                          placeholder="0"
                          data-testid="input-total-cost"
                          onValueChange={(n) => {
                            field.onChange(n);
                            if (isAdmin) {
                              setManualCostOverride(true);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Expert assignment is a separate step: after saving, the patient
                  appears in the registry with a «تحديد خبير» button. The add
                  form never asks for an expert or a delivery date anymore. */}
              {needsExpert && (
                <div className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
                  يُسجَّل المريض الآن <b>دون خبير</b>. بعد الحفظ، حدِّد الخبير من زر <b>«تحديد خبير»</b> بجانب المريض في سجل المرضى. ويحدّد الخبير تاريخ التسليم عند أخذ القالب.
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-4 pt-4">
            <Button type="submit" size="lg" className="w-full md:w-auto min-w-[200px] text-lg h-12" disabled={isPending}>
              {isPending ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : null}
              {t.patientForm.saveAndCreate}
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-12" onClick={() => setLocation("/patients")}>
              {t.patientForm.cancel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
