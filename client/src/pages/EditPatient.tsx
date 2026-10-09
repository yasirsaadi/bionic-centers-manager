import { useForm } from "react-hook-form";
import { PatientVisibleBadge } from "@/components/patient/PatientVisibleBadge";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Branch } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { normalizePhone } from "@shared/phone";
import { AmputationBuilder, amputationSiteOf, type AmputationParts } from "@/components/AmputationBuilder";
import { parseAmputationSite } from "@shared/case_fields";
import {
  checkRequiredPatientData, isAdministrativeOnlyPatch,
} from "@shared/patient_required";
import {
  PRIOR_CENTER_HISTORY_LABEL, PRIOR_CENTER_HISTORY_HINT,
  PRIOR_CENTER_HISTORY_UNKNOWN_LABEL, parsePriorCenterHistory,
} from "@shared/service_path";
import { usePatient, useUpdatePatient } from "@/hooks/use-patients";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBranchSession } from "@/components/BranchGate";
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
import { ManufacturingEditCard } from "@/components/manufacturing/ManufacturingEditCard";
import { Textarea } from "@/components/ui/textarea";
import { GovernorateSelect, InjuryDateField } from "@/components/intake/IntakeFields";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowRight, ArrowLeft, Plus, X, Lock } from "lucide-react";
import { REFERRAL_OTHER_PERSON, REFERRAL_SUB_SOURCES } from "@shared/intake_sheet";
import { z } from "zod";
import { useEffect, useState } from "react";

const injuryTypeOptions = [
  "التهاب اوتار", "وثي", "قطع اوتار", "تشنج عضلي", "إصابة عصب محيطي", "التهاب اعصاب سكري",
  "سوفان", "انزلاق ديسك", "انزلاق فقرات", "جنف", "جلطة دماغية", "نزف دماغي",
  "التهاب سحايا", "تصلب لويحي", "باركنسون", "غيلان باريه", "ضمور عضلي", "ضمور عصبي",
  "شلل دماغ", "شلل اطفال", "تأخر نفسي حركي", "اصابة حبل شوكي", "التهاب حبل شوكي",
  "شلل العصب الوجهي", "إصابة اربطة", "قطع جزئي في العضلات", "تبديل مفصل", "كسر",
  "نتوء عظمي",
];

const injuryAreaOptions = [
  "الرأس", "الرقبة", "الصدر", "القطن", "العمود الفقري", "الكتف",
  "منطقة الظهر العلوية", "منطقة الظهر السفلية", "العضد", "المرفق", "الساعد", "المعصم",
  "الرسغ", "اليد", "الاصابع", "الحوض", "الورك", "الفخذ",
  "الركبة", "الساق", "الكاحل", "القدم", "اصابع القدم",
];

/**
 * **خانةٌ مقفولة بعد المعاينة** (قرارُ المالك ٢٠٢٦-١٠-٠٩، §4.db) — تُعرَض بقيمتها ولا تُلمَس، وتحتها لماذا ومَن يعدّلها.
 * `fieldset disabled` يعطّل كلَّ ما بداخله (الحقول والمنتقيات والأزرار)، و`pointer-events-none` يمنع فتحَ المنتقيات بالضغط.
 * والخادمُ هو الحَكَم: المقفولُ إن وصل متغيّراً يُردّ (`PUT /api/patients/:id`).
 */
function LockGroup({ reason, field, className, children }: { reason: string | null; field: string; className?: string; children: React.ReactNode }) {
  if (!reason) return <>{children}</>;
  return (
    <fieldset disabled className={`m-0 min-w-0 border-0 p-0 ${className ?? ""}`} data-testid={`locked-${field}`}>
      <div className="pointer-events-none opacity-70">{children}</div>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-700"><Lock className="h-3 w-3 shrink-0" /> {reason}</p>
    </fieldset>
  );
}

interface EditScope {
  privileged: boolean;
  examinedAny: boolean;
  examinedTypes: string[];
  locked: string[];
  reasons: Record<string, string>;
}

const formSchema = insertPatientSchema.extend({
  //  ══ **العمرُ ليس إلزامياً في مخطّط النموذج** ═══════════════════════════
  //  آلافُ الملفّات القديمة بلا عمر، وإلزامُه هنا كان يمنع **تصحيحَ رقم
  //  هاتفٍ** عليها: النموذجُ يُردّ قبل أن يصل الخادم، فالقاعدةُ التي سمحت
  //  بالتصحيح الإداريّ معطَّلةٌ في الشاشة.
  //
  //  والإلزامُ لم يُلغَ بل **صار مشروطاً بما تغيّر**: مَن يلمس العمرَ أو
  //  الطولَ أو الوزنَ أو تعريفَ البتر يُطالَب باكتمالها قبل الإرسال
  //  (`onSubmit` أدناه، بالقاعدة المشتركة نفسها) — والخادمُ هو الحَكَم.
  age: z.string(),
  // أخفّ من نموذج الإنشاء عمداً: مريض قديم قد لا يحمل رقماً إطلاقاً ويجب
  // أن يبقى ملفه قابلاً للتعديل. فالمكتوب يجب أن يكون صحيحاً، والفراغ
  // مسموح. ومنع *حذف* رقم قائم قرار يحتاج معرفة الصفّ المحفوظ، فيفرضه
  // الخادم في PUT /api/patients/:id.
  phone: z.string().nullish().superRefine((value, ctx) => {
    const typed = String(value ?? "").trim();
    if (!typed) return;
    const result = normalizePhone(typed);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.reason ?? "رقم اتصال غير صالح" });
    }
  }),
  totalCost: z.coerce.number().optional(),
  injuryDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
  referralSource: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

interface InjuryEntry {
  type: string;
  area: string;
  side: string;
}

export default function EditPatient() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const sectionParam = new URLSearchParams(searchStr).get("section");
  // «إضافة نوع حالة» lands here to fill the new type's FULL fields — in that
  // mode the aggregate الكلفة الكلية is hidden even from managers: it shows a
  // SUMMED number across cases and confused staff into thinking the new case
  // inherited it. Pricing happens later in the dedicated steps.
  const addingMode = new URLSearchParams(searchStr).get("adding") === "1";
  const searchString = window.location.search;
  const fromBranch = new URLSearchParams(searchString).get("branch");
  const branchParam = fromBranch ? `?branch=${fromBranch}` : "";
  const { t, dir } = useTranslation();
  const branchSession = useBranchSession();
  //  الكلفةُ بمفتاح «تعديل مرضى» لا بالدور (قرارُ المالك ٢٠٢٦-٠٩-٣٠) — كالخادم.
  const canEditCost = !!branchSession?.isAdmin || (branchSession as any)?.permissions?.canEditPatients === true;
  const patientId = Number(id);
  
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  //  **لا يُضاف قسمٌ جديد من هنا** (§4.ar البند ٢): الاختيارُ يرفع العلَمَ وحده بلا قسمٍ ولا طلبِ معاينة، فيعلق
  //  المريض بين «مفعّل أصلاً» و«أضف نوع الحالة أولاً». فالأقسامُ التي ليست على الملفّ معطَّلةٌ، والبابُ «إضافة نوع حالة».
  const hasType: Record<string, boolean> = {
    amputee: !!patient?.isAmputee,
    physiotherapy: !!patient?.isPhysiotherapy,
    medical_support: !!patient?.isMedicalSupport,
  };
  const missingSomeType = !!patient && Object.values(hasType).some((v) => !v);
  const { mutate, isPending } = useUpdatePatient();
  //  **ما يُقفَل على هذا الموظّف الآن** (§4.db): بعد المعاينة بياناتُ الاستعلامات للمسؤول ومدير الفرع، وما يكتبه الفاحصُ ليس للاستعلامات.
  const { data: editScope } = useQuery<EditScope>({ queryKey: [`/api/patients/${patientId}/edit-scope`], enabled: Number.isFinite(patientId) });
  const lockOf = (field: string): string | null => editScope?.reasons?.[field] || null;
  const intakeLockedAfterExam = !!editScope && !editScope.privileged && editScope.examinedAny;
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });

  // True only once the form carries the PATIENT's values rather than the
  // component's placeholder defaults. Effects that write flags must wait for it.
  const [formLoaded, setFormLoaded] = useState(false);

  // ══ **تاريخُ المريض السابق — ثلاثيّ، وخارجَ النموذج عن قصد** ═════════════
  //  النموذجُ يرسل كائنَه **كاملاً** في كل حفظ. فلو كان هذا الحقلُ فيه لكان
  //  ملفٌّ قديمٌ قيمتُه `NULL` («لم يُسأل») يُكتب `FALSE` («نعلم أنه لم
  //  يتعامل معنا») بمجرّد تصحيح رقم هاتفه — جوابٌ يُنسَب إلى موظّفٍ لم يقله.
  //
  //  فحالةٌ محلّيةٌ تحفظ الثلاثيةَ كما هي، **ورايةُ لمسٍ** تقرّر الإرسال:
  //  لم يُلمَس ⟶ الحقلُ **لا يُرسَل أصلاً** · لُمِس ⟶ بوليانٌ صريح.
  //  والخادمُ يعيد فرضَ القاعدة نفسِها (يُسقط ما ليس بولياناً).
  const [priorHistory, setPriorHistory] = useState<boolean | null>(null);
  const [priorTouched, setPriorTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      //  **القيمةُ الابتدائية من صفّ المريض** — تُملأ في `reset` أدناه.
      whatsappNotificationsEnabled: false,
      name: "",
      phone: "",
      address: "",
      governorate: "",
      injuryDateStatus: null,
      age: "",
      weight: "",
      height: "",
      medicalCondition: "amputee",
      isAmputee: true,
      isPhysiotherapy: false,
      isMedicalSupport: false,
      amputationSite: "",
      diseaseType: "",
      totalCost: 0,
      injuryDate: "",
      injuryCause: "",

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
      referralSubSource: "",
      presentingComplaint: "",
      branchId: 1,
    },
  });

  useEffect(() => {
    if (!patient) return;
    //  الثلاثيةُ كما في الصفّ — ولا تُحوَّل `NULL` إلى `false` عند العرض.
    setPriorHistory(parsePriorCenterHistory((patient as any).hadPriorCenterHistory));
    setPriorTouched(false);
  }, [patient]);

  useEffect(() => {
    if (patient) {
      form.reset({
        name: patient.name,
        phone: patient.phone || "",
        //  من بيانات المريض الحالية، لا افتراضاً: ملفٌّ قديمٌ مطفأ يبقى مطفأً
        //  حتى يؤشّرها الموظّف بنفسه — ولا يُرفع بمجرّد فتح النموذج.
        whatsappNotificationsEnabled: (patient as any).whatsappNotificationsEnabled === true,
        address: patient.address || "",
        governorate: (patient as any).governorate || "",
        injuryDateStatus: (patient as any).injuryDateStatus ?? null,
        age: patient.age,
        weight: patient.weight || "",
        height: patient.height || "",
        medicalCondition: (sectionParam === "amputee" || sectionParam === "physiotherapy" || sectionParam === "medical_support")
          ? sectionParam
          : patient.medicalCondition,
        isAmputee: patient.isAmputee,
        isPhysiotherapy: patient.isPhysiotherapy,
        isMedicalSupport: patient.isMedicalSupport,
        amputationSite: patient.amputationSite || "",
        diseaseType: patient.diseaseType || "",
        totalCost: patient.totalCost || 0,
        injuryDate: patient.injuryDate || "",
        injuryCause: patient.injuryCause || "",

        generalNotes: patient.generalNotes || "",
        prostheticType: patient.prostheticType || "",
        siliconType: patient.siliconType || "",
        siliconSize: patient.siliconSize || "",
        suspensionSystem: patient.suspensionSystem || "",
        footType: patient.footType || "",
        footSize: patient.footSize || "",
        kneeJointType: patient.kneeJointType || "",
        treatmentType: patient.treatmentType || "",
        supportType: patient.supportType || "",
        injurySide: patient.injurySide || "",
        injuries: patient.injuries || "",
        branchId: patient.branchId,
        referralSource: patient.referralSource || "",
        //  «كيف عرف الشخص الآخر بالمركز» و«سبب المراجعة» — من الاستمارة، ولم يكن لهما بابُ تصحيح (§4.db).
        referralSubSource: (patient as any).referralSubSource || "",
        presentingComplaint: (patient as any).presentingComplaint || "",
        referralNotes: patient.referralNotes || "",
      });
      // The form now holds the patient's real values instead of the
      // placeholders — only from here may an effect act on the radio.
      setFormLoaded(true);
    }
  }, [patient, form]);

  const { toast } = useToast();
  const conditionType = form.watch("medicalCondition");

  // ══ **تعريفُ البتر: حالةٌ واحدة، وبانٍ واحد** ═══════════════════════════
  //  كانت هنا ثلاثةَ عشرَ متغيّراً بافتراضاتها («احادي/سفلي/يمين»)، ومحلّلٌ
  //  ثانٍ **ناقص**: لا يقرأ تفاصيلَ الثنائيّ إطلاقاً، فمريضٌ مبتورُ الطرفين
  //  يُفتَح ملفُّه فتضيع مستوياتُه ثم تُكتب فوقها شرطاتٌ عند الحفظ.
  //
  //  الآن `parseAmputationSite` نفسُها التي يختبرها `test:amputation-site`،
  //  و`AmputationBuilder` نفسُه المستعمَل في التسجيل وفي «إضافة نوع حالة».
  const [amp, setAmp] = useState<AmputationParts>({});
  //  **ولا تُكتب السلسلةُ ما لم يلمسها أحد**: ملفٌّ قديم بنصٍّ حرٍّ لا يفهمه
  //  المحلّل يجب أن يبقى كما هو حين يُصحَّح هاتفُه — والكتابةُ فوقه بفراغٍ
  //  محوٌ لمعلومةٍ لم يطلب أحدٌ محوَها.
  const [ampTouched, setAmpTouched] = useState(false);

  const [injuryEntries, setInjuryEntries] = useState<InjuryEntry[]>([{ type: "", area: "", side: "" }]);

  useEffect(() => {
    if (patient) {
      if (patient.injuries) {
        try {
          const parsed = JSON.parse(patient.injuries);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInjuryEntries(parsed);
            return;
          }
        } catch {}
      }
      if (patient.injuryType || patient.injuryArea) {
        const types = patient.injuryType?.split(/، |, /).filter(Boolean) || [];
        const areas = patient.injuryArea?.split(/، |, /).filter(Boolean) || [];
        const maxLen = Math.max(types.length, areas.length, 1);
        const entries: InjuryEntry[] = [];
        for (let i = 0; i < maxLen; i++) {
          entries.push({
            type: types[i] || "",
            area: areas[i] || "",
            side: ""
          });
        }
        setInjuryEntries(entries);
      }
    }
  }, [patient]);

  useEffect(() => {
    if (conditionType !== "physiotherapy") return;
    const filtered = injuryEntries.filter(e => e.type || e.area);
    form.setValue("injuries", filtered.length > 0 ? JSON.stringify(filtered) : "");
    form.setValue("injuryType", injuryEntries.map(e => e.type).filter(Boolean).join("، "));
    form.setValue("injuryArea", injuryEntries.map(e => e.area).filter(Boolean).join("، "));
  }, [injuryEntries, conditionType, form]);

  //  يُحمَّل المحفوظُ **بالمحلّل الرسمي** — وما لا يُفهَم لا يُخترَع له بديل.
  //
  //  ولا حارسَ تهيئةٍ بعد اليوم: كان يشترط وجودَ سلسلةٍ محفوظة كي يُفعَّل
  //  الباني، فمريضُ بترٍ قديمٌ **بلا موقعِ بتر** لا يستطيع إكماله إطلاقاً —
  //  الحقولُ معطَّلةٌ عن الكتابة وهو بالضبط مَن يحتاجها.
  useEffect(() => {
    if (!patient) return;
    setAmp(parseAmputationSite(patient.amputationSite));
    setAmpTouched(false);
  }, [patient]);

  //  والكتابةُ **بعد اللمس وحده**، وبالباني المشترك: المكتملُ يُكتب،
  //  والناقصُ يُكتب فراغاً فيردّه الخادم — ولا يُخترَع تعريفٌ لم يُختَر.
  useEffect(() => {
    if (conditionType !== "amputee" || !ampTouched) return;
    form.setValue("amputationSite", amputationSiteOf(amp));
  }, [amp, ampTouched, conditionType, form]);

  // ADDITIVE, never destructive: the radio selects which type's SECTION is
  // open for editing and turns THAT type's flag on — it must never turn the
  // patient's OTHER flags off (saving a dual علاج+أطراف patient used to wipe
  // whichever flag the radio wasn't on, silently deleting a case type).
  //
  // The `formLoaded` gate is what keeps "additive" from meaning "always an
  // amputee". This form's DEFAULT medicalCondition is "amputee", and on the
  // first commit this effect still sees that default — it runs after the reset
  // above, with the stale value — so it raised isAmputee on EVERY patient whose
  // file was merely opened for editing, and being additive nothing ever lowered
  // it again. Saving then made a physiotherapy or support patient an amputee
  // for good, and «بتر» appeared on their file with no amputation behind it
  // (patient امل عويز, reported 2026-08-06). The flag may only follow a radio
  // the user actually chose, never the placeholder shown before loading.
  useEffect(() => {
    if (!formLoaded) return;
    if (conditionType === "amputee") form.setValue("isAmputee", true);
    else if (conditionType === "physiotherapy") form.setValue("isPhysiotherapy", true);
    else if (conditionType === "medical_support") form.setValue("isMedicalSupport", true);
  }, [conditionType, form, formLoaded]);

  function onSubmit(values: FormValues) {
    // ══ **الإلزامُ مشروطٌ بما تغيّر** — لا بما يحمله النموذج ═══════════════
    //  النموذجُ يرسل الكائنَ كاملاً في كل حفظ، فملفٌّ قديمٌ بلا مقاسات كان
    //  يُردّ عند تصحيح هاتفه لو قِيس بحضور المفاتيح. والقاعدةُ هنا **هي
    //  قاعدةُ الخادم نفسُها** (`isAdministrativeOnlyPatch`) فلا تنحرف
    //  الشاشةُ عنه في أيّ اتجاه — لا تشدّداً ولا تساهلاً.
    //
    //  ومَن يلمس المقاساتِ أو تعريفَ البتر يُطالَب باكتمالها قبل الإرسال،
    //  فيعرف ما ينقص وهو أمام الحقول لا بعد ردٍّ من الخادم.
    if (patient && !isAdministrativeOnlyPatch(values as any, patient as any)) {
      const req = checkRequiredPatientData({
        age: values.age, height: (values as any).height, weight: (values as any).weight,
        isAmputee: (values as any).isAmputee,
        amputationSite: (values as any).amputationSite,
      });
      if (!req.ok) {
        toast({
          title: "بيانات ناقصة",
          description: req.message ?? "أكمل البيانات المطلوبة",
          variant: "destructive",
        });
        return;
      }
    }
    //  **الحقلُ لا يُرسَل إلّا إن لمسه الموظّف** — فحفظُ تعديلٍ لا علاقةَ له
    //  بالسؤال يترك الفراغَ فراغاً. (والخادمُ يُسقط ما ليس بولياناً كذلك.)
    const data: any = { ...values };
    if (priorTouched) data.hadPriorCenterHistory = priorHistory === true;
    //  الخانتان الجديدتان (§4.db) فارغتين على ملفٍّ لم يحملهما — لا تُرسَلان، فلا يصير `NULL` نصّاً فارغاً.
    for (const k of ["referralSubSource", "presentingComplaint"] as const) {
      if (!String(data[k] ?? "").trim() && !(patient as any)?.[k]) delete data[k];
    }
    mutate({ id: patientId, data }, {
      //  ══ **ملاحظةُ الكلفة من الخادم — كانت تُقرأ ولا تُعرَض** (تصحيحٌ
      //  لاحقٌ على PR #267، 2026-08-31) ═══════════════════════════════════
      //  `costNote` تصل في استجابة الحفظ حين يُقفَل تعديلُ الكلفة (سعرٌ
      //  معتمَدٌ من طبيب) أو حين يتعذّر تحديد الحالة الواحدة (مريضٌ بأكثر
      //  من حالة) — والصفحةُ كانت تتجاهل جسمَ الاستجابة كلِّياً وتنتقل
      //  بتوستِ النجاح العامّ وحده، فلا يعرف الموظّف أنّ جزءاً من طلبه
      //  لم يُنفَّذ كما كتبه. توستٌ إضافيّ (لا بديلَ عن توست الهوك العامّ)
      //  حين تحضر الملاحظة فقط.
      onSuccess: (result: any) => {
        if (result?.costNote) {
          toast({ title: "ملاحظة حول الكلفة", description: result.costNote });
        }
        //  ══ **وملاحظةُ التصنيف بالمبدأ نفسِه** (CASEDEL-06) ═══════════════
        //  إطفاءُ عَلَم جهازٍ للمريض حالةٌ نشطة من نوعه يُسقَط في الخادم كي
        //  لا يبقى صفُّ حالةٍ شبحاً. وبلا هذا التوست كان يُسقَط **صامتاً**:
        //  توستُ نجاحٍ عامّ، والمربّعُ يعود مؤشَّراً، ولا يعرف الموظّف لماذا.
        if (result?.caseFlagNote) {
          toast({ title: "ملاحظة حول تصنيف الحالة", description: result.caseFlagNote });
        }
        setLocation(`/patients/${patientId}${branchParam}`);
      },
    });
  }

  if (isLoadingPatient) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (!patient) {
    return <div className="p-8 text-center text-muted-foreground">{t.patientForm.patientNotFound}</div>;
  }

  const BackArrowIcon = dir === "ltr" ? ArrowLeft : ArrowRight;

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 page-transition py-2 md:py-6">
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}${branchParam}`)} className="p-2 shrink-0">
          <BackArrowIcon className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800">{t.patientForm.editTitle}</h2>
          <p className="text-xs md:text-base text-muted-foreground">{t.patientForm.editInfo} {patient.name}</p>
        </div>
      </div>

      {/* The card self-hides when there's no active work order. We do NOT gate
          on the patient's case-type flag here: a work order is the source of
          truth, and gating on the flag hid the card whenever the flag was
          missing (e.g. after certain merges/imports). */}
      <ManufacturingEditCard patient={patient} />

      {intakeLockedAfterExam && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="banner-locked-after-exam">
          <p className="font-medium flex items-center gap-1.5"><Lock className="h-4 w-4 shrink-0" /> عُوين المريض — بياناتُ الاستمارة يعدّلها المسؤول أو مدير الفرع.</p>
          <p className="text-xs mt-0.5">يبقى لك: الهاتف، والمحافظة، والعنوان، وإشعارات واتساب.</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card className="p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border-border/60">
            <h3 className="text-base md:text-lg font-bold text-primary mb-3 md:mb-4 border-b pb-2">{t.patientForm.personalData}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <LockGroup reason={lockOf("name")} field="name">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.fullName} <PatientVisibleBadge className="ms-2" /></FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-slate-50" placeholder={t.patientForm.fullNamePlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.phone} <PatientVisibleBadge className="ms-2" /></FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" dir="ltr" inputMode="tel" placeholder={t.patientForm.phonePlaceholder} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{t.patientForm.phoneHint}</p>
                    <FormMessage />

                    {/* ══ إشعاراتُ واتساب — **بجوار الرقم، لا في شاشةٍ ثانية** ══
                        هذا هو البابُ الوحيد لإدارتها بعد التسجيل: البطاقةُ في
                        صفحة المريض تقول الحالةَ ولا تديرها. وإطفاؤها يسحب
                        الجهةَ في الخادم، ورفعُها يُنشئها من الرقم الحالي —
                        **بلا ترحيبٍ ثانٍ وبلا بثٍّ رجعيّ**. */}
                    <label
                      className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 cursor-pointer"
                      data-testid="label-whatsapp-consent"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-emerald-600"
                        checked={form.watch("whatsappNotificationsEnabled") === true}
                        onChange={(e) =>
                          form.setValue("whatsappNotificationsEnabled", e.target.checked)}
                        data-testid="checkbox-whatsapp-consent"
                      />
                      <span className="text-xs leading-relaxed">
                        <span className="font-medium text-emerald-900">
                          إرسال إشعارات وتحديثات المركز عبر واتساب على الرقم المسجل
                        </span>
                        <span className="block text-muted-foreground mt-0.5">
                          عند تغيير الرقم تنتقل الإشعارات إلى الرقم الجديد تلقائياً.
                        </span>
                      </span>
                    </label>

                    {/* ══ **تاريخُ المريض مع المركز** ═══════════════════════
                        المربّعُ نفسُه الذي في التسجيل — وهنا بابُ تصحيحه.
                        **ولا يفعل شيئاً غير ما يقول**: لا يعفي من معاينة،
                        ولا يُنشئ جهازاً ولا شراءً ولا حلقة. */}
                    <LockGroup reason={lockOf("hadPriorCenterHistory")} field="hadPriorCenterHistory">
                    <label
                      className="mt-2 flex items-start gap-2 rounded-lg border bg-muted/30 p-2 cursor-pointer"
                      data-testid="label-prior-center-history"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4"
                        checked={priorHistory === true}
                        onChange={(e) => {
                          //  **اللمسُ هو ما يجعل القيمةَ جواباً.**
                          setPriorTouched(true);
                          setPriorHistory(e.target.checked);
                        }}
                        data-testid="checkbox-prior-center-history"
                      />
                      <span className="text-xs leading-relaxed">
                        <span className="font-medium">{PRIOR_CENTER_HISTORY_LABEL}</span>
                        {/*  ══ **والصفُّ الذي لم يُسأل يقول ذلك** ══════════════
                            «غير مؤشَّر» على ملفٍّ قديم كانت تُقرأ «لم يتعامل
                            معنا»، والحقيقةُ أننا لم نسأله. فيُقال ما هو. */}
                        {priorHistory === null && !priorTouched && (
                          <span
                            className="block mt-0.5 font-medium text-amber-700"
                            data-testid="text-prior-center-history-unknown"
                          >
                            {PRIOR_CENTER_HISTORY_UNKNOWN_LABEL}
                          </span>
                        )}
                        <span className="block text-muted-foreground mt-0.5">
                          {PRIOR_CENTER_HISTORY_HINT}
                        </span>
                      </span>
                    </label>
                    </LockGroup>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>{t.patientForm.address} <PatientVisibleBadge className="ms-2" /></FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.addressPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* المحافظةُ خانةٌ مستقلّة (ترحيل ١١٤، §4.cq) — إلزاميةٌ في «استمارة المراجع» وحدها، واختياريةٌ هنا للملفّات القديمة. */}
              <FormItem>
                <FormLabel>المحافظة</FormLabel>
                <GovernorateSelect value={form.watch("governorate") as any} onChange={(v) => form.setValue("governorate", v)} className="bg-slate-50" testId="edit-governorate" />
              </FormItem>

              <LockGroup reason={lockOf("referralSource")} field="referralSource">
              <FormField
                control={form.control}
                name="referralSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.referralSource}</FormLabel>
                    <Select onValueChange={(v) => {
                      field.onChange(v);
                      //  «كيف عرف» لا معنى لها لغير «من شخص آخر» — تُفرَّغ مع تغيير الجهة.
                      if (v !== REFERRAL_OTHER_PERSON) form.setValue("referralSubSource" as any, "");
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-50" data-testid="select-referral-source">
                          <SelectValue placeholder={t.patientForm.selectReferralSource} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="طبيبنا">{t.patientForm.refOurDoctor}</SelectItem>
                        <SelectItem value="طبيب خارجي">{t.patientForm.refExternalDoctor}</SelectItem>
                        <SelectItem value="مستشفى">{t.patientForm.refHospital}</SelectItem>
                        <SelectItem value="أطباء مستشفى العين">أطباء مستشفى العين</SelectItem>
                        <SelectItem value="جهة حكومية">{t.patientForm.refGovernment}</SelectItem>
                        <SelectItem value="منظمة انسانية">{t.patientForm.refNGO}</SelectItem>
                        <SelectItem value="فيسبوك">{t.patientForm.refFacebook}</SelectItem>
                        <SelectItem value="انستاغرام">{t.patientForm.refInstagram}</SelectItem>
                        <SelectItem value="تيك توك">{t.patientForm.refTikTok}</SelectItem>
                        <SelectItem value="كوكل">{t.patientForm.refGoogle}</SelectItem>
                        <SelectItem value="شاشة إعلان خارجية">شاشة إعلان خارجية</SelectItem>
                        <SelectItem value="من شخص آخر">{t.patientForm.refOtherPerson}</SelectItem>
                        <SelectItem value="دكتور بيرم">{t.patientForm.refDrBiram}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>

              {form.watch("referralSource") === REFERRAL_OTHER_PERSON && (
                <LockGroup reason={lockOf("referralSubSource")} field="referralSubSource">
                  <FormItem>
                    <FormLabel>كيف عرف الشخص الآخر بالمركز</FormLabel>
                    <Select value={(form.watch("referralSubSource" as any) as string) || ""} onValueChange={(v) => form.setValue("referralSubSource" as any, v)}>
                      <SelectTrigger className="bg-slate-50" data-testid="select-referral-sub-source">
                        <SelectValue placeholder="اختر" />
                      </SelectTrigger>
                      <SelectContent>
                        {REFERRAL_SUB_SOURCES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                </LockGroup>
              )}

              {form.watch("referralSource") && (
                <LockGroup reason={lockOf("referralNotes")} field="referralNotes">
                <FormField
                  control={form.control}
                  name="referralNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.additionalNotes}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.referralNotesPlaceholder} data-testid="input-referral-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </LockGroup>
              )}

              <LockGroup reason={lockOf("age")} field="age">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.age}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-slate-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>

              <LockGroup reason={lockOf("weight")} field="weight">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.weightKg}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.weightPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>

              <LockGroup reason={lockOf("height")} field="height">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.heightCm}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.heightPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>

              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.branch}</FormLabel>
                    {/*  فرعُ التسجيل لا يتغيّر إلّا تصحيحاً من المسؤول العامّ — والخادمُ يُسقطه لغيره (§4.bo). */}
                    <Select 
                      onValueChange={(val) => field.onChange(Number(val))} 
                      value={String(field.value)}
                      disabled={!branchSession?.isAdmin}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-50" data-testid="select-branch">
                          <SelectValue placeholder={t.patientForm.selectBranch} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches?.filter((b) => !b.temporarilyClosed || b.id === Number(field.value)).map((branch) => (
                          <SelectItem key={branch.id} value={String(branch.id)}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        value={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent">
                          <FormControl>
                            <RadioGroupItem value="amputee" disabled={!!patient && !hasType.amputee} data-testid="radio-condition-amputee" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {t.patientForm.amputeeCase}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent">
                          <FormControl>
                            <RadioGroupItem value="physiotherapy" disabled={!!patient && !hasType.physiotherapy} data-testid="radio-condition-physiotherapy" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {t.patientForm.physiotherapyCase}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent">
                          <FormControl>
                            <RadioGroupItem value="medical_support" disabled={!!patient && !hasType.medical_support} data-testid="radio-condition-medical_support" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            {t.patientForm.medicalSupportCase}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    {missingSomeType && (
                      <p className="text-xs text-muted-foreground" data-testid="text-add-type-hint">
                        لإضافة قسمٍ جديد للمريض استعمل زرّ «إضافة نوع حالة» في صفحته — فيُنشأ القسمُ ويصل الطبيب.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionType === "amputee" && (
                <>
                  {/*  ══ **الباني المشترك** — لا نسخةٌ ثالثة من القوائم ══
                      كان هنا بانٍ كامل بافتراضاته ومحلّلٍ ناقصٍ لا يقرأ
                      تفاصيلَ الثنائيّ. والآن `AmputationBuilder` نفسُه
                      المستعمَل في التسجيل وفي «إضافة نوع حالة». */}
                  <LockGroup reason={lockOf("amputationSite")} field="amputationSite">
                  <div className="space-y-4">
                    <FormLabel className="text-base">{t.patientForm.amputationType} <PatientVisibleBadge className="ms-2" /></FormLabel>
                    <AmputationBuilder
                      value={amp}
                      onChange={(next) => { setAmp(next); setAmpTouched(true); }}
                      testIdPrefix="edit-amp"
                    />
                    {/*  **ونصٌّ قديم لا يفهمه المحلّل يبقى معروضاً** — فلا
                        يُمحى بصمتٍ حين يُصحَّح هاتفٌ، ويعرف الموظّف ما كان
                        مكتوباً قبل أن يستبدله. */}
                    {!ampTouched && patient?.amputationSite
                      && !parseAmputationSite(patient.amputationSite).amputationType && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2"
                         data-testid="text-legacy-amputation">
                        المسجَّل حالياً نصٌّ قديم: <b>{patient.amputationSite}</b> —
                        يبقى كما هو ما لم تختر تعريفاً منظَّماً أعلاه.
                      </p>
                    )}
                  </div>
                  </LockGroup>

                  {/* Show prosthetic details only for single/double amputation */}
                  {(amp.amputationType === "single" || amp.amputationType === "double") && (
                    <LockGroup reason={lockOf("prostheticType")} field="prostheticType" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="prostheticType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.prostheticType}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.prostheticTypePlaceholderEdit} />
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
                            <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.siliconTypePlaceholder} />
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
                            <Input {...field} type="number" inputMode="numeric" value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.siliconSizePlaceholder} />
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
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.suspensionPlaceholder} />
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
                            <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.footTypePlaceholder} />
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
                            <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.footSizePlaceholder} />
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
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.kneeJointPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </LockGroup>
                  )}
                </>
              )}

              {conditionType === "physiotherapy" && (
                <>
                  {/*  **«سبب المراجعة»** — الشكوى بكلمات المراجع، تكتبها الاستعلاماتُ في الاستمارة (§4.da) وتُصحَّح هنا قبل المعاينة (§4.db). */}
                  <LockGroup reason={lockOf("presentingComplaint")} field="presentingComplaint">
                    <FormItem>
                      <FormLabel>سبب المراجعة</FormLabel>
                      <Textarea value={(form.watch("presentingComplaint" as any) as string) || ""}
                        onChange={(e) => form.setValue("presentingComplaint" as any, e.target.value)}
                        className="bg-slate-50 min-h-[70px]" placeholder="الشكوى بكلمات المراجع" data-testid="input-presenting-complaint" />
                    </FormItem>
                  </LockGroup>
                  <LockGroup reason={lockOf("diseaseType")} field="diseaseType">
                  <FormField
                    control={form.control}
                    name="diseaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.diagnosisType} <PatientVisibleBadge className="ms-2" /></FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.diagnosisPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </LockGroup>
                </>
              )}

              {conditionType === "medical_support" && (
                <LockGroup reason={lockOf("supportType")} field="supportType" className="space-y-6">
                  <FormField
                    control={form.control}
                    name="supportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.supportType} <PatientVisibleBadge className="ms-2" /></FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.supportTypePlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="injurySide"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.injurySide}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.injurySidePlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </LockGroup>
              )}

              <LockGroup reason={lockOf("injuryDate")} field="injuryDate">
              <FormField
                control={form.control}
                name="injuryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.injuryDateOptional}</FormLabel>
                    {/* تاريخٌ أو «منذ الولادة» أو «غير معروف» (ترحيل ١١٤) — والخادمُ يُسقط أحدهما بالآخر. */}
                    <InjuryDateField
                      date={field.value || ""}
                      status={form.watch("injuryDateStatus") as any}
                      onChange={(n) => { field.onChange(n.injuryDate); form.setValue("injuryDateStatus", n.injuryDateStatus); }}
                      testIdPrefix="edit-injury-date"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>

              {conditionType === "physiotherapy" && (
                <div className="space-y-4">
                  <FormField control={form.control} name="injuryType" render={({ field }) => (<input type="hidden" {...field} value={field.value || ""} />)} />
                  <FormField control={form.control} name="injuryArea" render={({ field }) => (<input type="hidden" {...field} value={field.value || ""} />)} />
                  <FormField control={form.control} name="injuries" render={({ field }) => (<input type="hidden" {...field} value={field.value || ""} />)} />

                  <LockGroup reason={lockOf("injuries")} field="injuries">
                  <div className="space-y-3">
                    <FormLabel className="text-base">{t.patientForm.injuries}</FormLabel>
                    {injuryEntries.map((entry, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-slate-50/50 space-y-3" data-testid={`injury-entry-${index}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium text-muted-foreground">{t.patientForm.injuryNum} {index + 1}</span>
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
                  </LockGroup>
                </div>
              )}

              <LockGroup reason={lockOf("injuryCause")} field="injuryCause">
              <FormField
                control={form.control}
                name="injuryCause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.injuryCause}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.injuryCausePlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border-border/60">
            <h3 className="text-lg font-bold text-primary mb-4 border-b pb-2">{t.patientForm.financialAndNotes}</h3>
            <div className="space-y-6">
              {canEditCost && !addingMode && (
                <FormField
                  control={form.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.patientForm.totalCost}</FormLabel>
                      <FormControl>
                        <MoneyInput value={field.value ?? ""} onValueChange={field.onChange} className="bg-slate-50" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <LockGroup reason={lockOf("generalNotes")} field="generalNotes">
              <FormField
                control={form.control}
                name="generalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.generalNotesLabel}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} className="bg-slate-50 min-h-[100px]" placeholder={t.patientForm.generalNotesPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </LockGroup>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending} className="flex-1 h-12 text-lg gap-2">
              {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
              {t.patientForm.saveChanges}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLocation(`/patients/${patientId}${branchParam}`)} className="h-12">
              {t.patientForm.cancel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
