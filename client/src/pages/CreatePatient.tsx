import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Branch } from "@shared/schema";
import { useCreatePatient } from "@/hooks/use-patients";
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
import { Button } from "@/components/ui/button";
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
];

const injuryAreaOptions = [
  "الرأس", "الرقبة", "الصدر", "القطن", "العمود الفقري", "الكتف",
  "منطقة الظهر العلوية", "منطقة الظهر السفلية", "العضد", "المرفق", "الساعد", "المعصم",
  "الرسغ", "اليد", "الاصابع", "الحوض", "الورك", "الفخذ",
  "الركبة", "الساق", "الكاحل", "القدم", "اصابع القدم",
];

// Form schema with coercion for numbers and optional date
const formSchema = insertPatientSchema.extend({
  age: z.string().min(1, "العمر مطلوب"),
  totalCost: z.coerce.number().optional(),
  injuryDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
  referralSource: z.string().min(1, "الجهة المحول منها مطلوبة"),
  registrationDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
});

type FormValues = z.infer<typeof formSchema>;

interface InjuryEntry {
  type: string;
  area: string;
  side: string;
}

export default function CreatePatient() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const branchSession = useBranchSession();
  const { t, dir } = useTranslation();
  const isAdmin = branchSession?.isAdmin || false;
  const userBranchId = branchSession?.branchId;
  const userRole = branchSession?.role;
  const canBackdateRegistration = userRole !== "reception"; // موظفو الاستقبال لا يمكنهم التسجيل بتاريخ قديم
  
  // Non-admin users always use their branch, admin can select
  const defaultBranchId = !isAdmin && userBranchId ? userBranchId : (Number(searchParams.get("branch")) || 1);
  
  // ذي قار (branch 3) defaults to physiotherapy since most of their patients are physiotherapy
  const isDhiQarBranch = defaultBranchId === 3;
  
  const { mutate, isPending } = useCreatePatient();
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
      address: "",
      referralSource: "",
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
      injuryDate: "",
      injuryCause: "",
      registrationDate: new Date().toISOString().split('T')[0], // تاريخ اليوم افتراضياً
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

  // Amputation selection state
  const [amputationType, setAmputationType] = useState<"single" | "double" | "silicone">("single");
  const [singleLimb, setSingleLimb] = useState<"upper" | "lower">("lower");
  const [singleSide, setSingleSide] = useState<"right" | "left">("right");
  const [singleAmputationDetail, setSingleAmputationDetail] = useState("");
  
  const [doubleLimbType, setDoubleLimbType] = useState<"upper" | "lower" | "both">("lower");
  const [doubleRightDetail, setDoubleRightDetail] = useState("");
  const [doubleLeftDetail, setDoubleLeftDetail] = useState("");
  const [bothRightLimb, setBothRightLimb] = useState<"upper" | "lower">("upper");
  const [bothLeftLimb, setBothLeftLimb] = useState<"upper" | "lower">("upper");
  const [bothRightDetail, setBothRightDetail] = useState("");
  const [bothLeftDetail, setBothLeftDetail] = useState("");
  
  const [injuryEntries, setInjuryEntries] = useState<InjuryEntry[]>([{ type: "", area: "", side: "" }]);

  // Silicone prosthetics state
  const [siliconePart, setSiliconePart] = useState("");
  const [siliconeSide, setSiliconeSide] = useState<"right" | "left" | "both">("right");
  const [siliconeNotes, setSiliconeNotes] = useState("");

  // Build amputationSite string from selections
  useEffect(() => {
    if (conditionType !== "amputee") return;
    
    let site = "";
    if (amputationType === "single") {
      const limbText = singleLimb === "upper" ? "طرف علوي" : "طرف سفلي";
      const sideText = singleSide === "right" ? "يمين" : "يسار";
      site = `احادي - ${limbText} - ${sideText}`;
      if (singleAmputationDetail) site += ` - ${singleAmputationDetail}`;
    } else if (amputationType === "double") {
      // Double amputation
      if (doubleLimbType === "upper") {
        site = `ثنائي - علوي`;
        if (doubleRightDetail || doubleLeftDetail) {
          site += ` | يمين: ${doubleRightDetail || "-"} | يسار: ${doubleLeftDetail || "-"}`;
        }
      } else if (doubleLimbType === "lower") {
        site = `ثنائي - سفلي`;
        if (doubleRightDetail || doubleLeftDetail) {
          site += ` | يمين: ${doubleRightDetail || "-"} | يسار: ${doubleLeftDetail || "-"}`;
        }
      } else {
        // both upper and lower
        const rightLimbText = bothRightLimb === "upper" ? "علوي" : "سفلي";
        const leftLimbText = bothLeftLimb === "upper" ? "علوي" : "سفلي";
        site = `ثنائي - علوي وسفلي`;
        site += ` | يمين (${rightLimbText}): ${bothRightDetail || "-"}`;
        site += ` | يسار (${leftLimbText}): ${bothLeftDetail || "-"}`;
      }
    } else if (amputationType === "silicone") {
      // Silicone prosthetics
      site = `اطراف سليكونية تعويضية - ${siliconePart || "-"}`;
      // Add side for all parts except nose
      if (siliconePart && siliconePart !== "انف") {
        const sideText = siliconeSide === "right" ? "يمين" : siliconeSide === "left" ? "يسار" : "كلا الجانبين";
        site += ` - ${sideText}`;
      }
      if (siliconeNotes) site += ` | ملاحظات: ${siliconeNotes}`;
    }
    form.setValue("amputationSite", site);
  }, [amputationType, singleLimb, singleSide, singleAmputationDetail, doubleLimbType, doubleRightDetail, doubleLeftDetail, bothRightLimb, bothLeftLimb, bothRightDetail, bothLeftDetail, siliconePart, siliconeSide, siliconeNotes, conditionType, form]);

  // Sync boolean flags with string selection
  useEffect(() => {
    if (conditionType === "amputee") {
      form.setValue("isAmputee", true);
      form.setValue("isPhysiotherapy", false);
      form.setValue("isMedicalSupport", false);
    } else if (conditionType === "physiotherapy") {
      form.setValue("isAmputee", false);
      form.setValue("isPhysiotherapy", true);
      form.setValue("isMedicalSupport", false);
    } else if (conditionType === "medical_support") {
      form.setValue("isAmputee", false);
      form.setValue("isPhysiotherapy", false);
      form.setValue("isMedicalSupport", true);
    }
  }, [conditionType, form]);

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

  function onSubmit(values: FormValues) {
    console.log("Submitting patient with branchId:", values.branchId, "all values:", values);
    mutate(values, {
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
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ""} 
                          className="bg-slate-50" 
                          data-testid="input-registration-date"
                        />
                      </FormControl>
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
                      <Input {...field} className="bg-slate-50" placeholder={t.patientForm.fullNamePlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.phone}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.phonePlaceholder} />
                    </FormControl>
                    <FormMessage />
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
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder={t.patientForm.addressPlaceholder} />
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-50" data-testid="select-referral-source">
                          <SelectValue placeholder={t.patientForm.selectReferralSource} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="طبيبنا">{t.patientForm.refOurDoctor}</SelectItem>
                        <SelectItem value="طبيب خارجي">{t.patientForm.refExternalDoctor}</SelectItem>
                        <SelectItem value="مستشفى">{t.patientForm.refHospital}</SelectItem>
                        <SelectItem value="جهة حكومية">{t.patientForm.refGovernment}</SelectItem>
                        <SelectItem value="منظمة انسانية">{t.patientForm.refNGO}</SelectItem>
                        <SelectItem value="فيسبوك">{t.patientForm.refFacebook}</SelectItem>
                        <SelectItem value="انستاغرام">{t.patientForm.refInstagram}</SelectItem>
                        <SelectItem value="تيك توك">{t.patientForm.refTikTok}</SelectItem>
                        <SelectItem value="كوكل">{t.patientForm.refGoogle}</SelectItem>
                        <SelectItem value="من شخص آخر">{t.patientForm.refOtherPerson}</SelectItem>
                        <SelectItem value="دكتور بيرم">{t.patientForm.refDrBiram}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("referralSource") && (
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
              )}

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
                          <SelectTrigger className="bg-slate-50" data-testid="select-branch">
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
                      <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 border border-input rounded-md">
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
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} className="bg-slate-50" />
                    </FormControl>
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
                      <Input {...field} value={field.value || ""} placeholder={t.patientForm.injuryCausePlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionType === "amputee" && (
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
                          <Select value={singleLimb} onValueChange={(val) => setSingleLimb(val as "upper" | "lower")}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upper">{t.patientForm.upperLimb}</SelectItem>
                              <SelectItem value="lower">{t.patientForm.lowerLimb}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>{t.patientForm.side}</FormLabel>
                          <Select value={singleSide} onValueChange={(val) => setSingleSide(val as "right" | "left")}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="right">{t.patientForm.right}</SelectItem>
                              <SelectItem value="left">{t.patientForm.left}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
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
                    </div>
                  )}

                  {/* Double Amputation Options */}
                  {amputationType === "double" && (
                    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                      <div className="space-y-2">
                        <FormLabel>{t.patientForm.doubleAmputationType}</FormLabel>
                        <Select value={doubleLimbType} onValueChange={(val) => setDoubleLimbType(val as "upper" | "lower" | "both")}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
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
                            <Select value={bothRightLimb} onValueChange={(val) => setBothRightLimb(val as "upper" | "lower")}>
                              <SelectTrigger>
                                <SelectValue />
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
                            <Select value={bothLeftLimb} onValueChange={(val) => setBothLeftLimb(val as "upper" | "lower")}>
                              <SelectTrigger>
                                <SelectValue />
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
                            <Select value={siliconeSide} onValueChange={(val) => setSiliconeSide(val as "right" | "left" | "both")}>
                              <SelectTrigger className="bg-white" data-testid="select-silicone-side">
                                <SelectValue />
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

                  {/* Show prosthetic details only for single/double amputation */}
                  {(amputationType === "single" || amputationType === "double") && (
                    <>
                  <FormField
                    control={form.control}
                    name="prostheticType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.prostheticType}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder={t.patientForm.prostheticTypePlaceholder} />
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
                            <Input {...field} value={field.value || ""} placeholder={t.patientForm.siliconTypePlaceholder} />
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
                            <Input {...field} value={field.value || ""} placeholder={t.patientForm.siliconSizePlaceholder} />
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
                          <Input {...field} value={field.value || ""} placeholder={t.patientForm.suspensionPlaceholder} />
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
                            <Input {...field} value={field.value || ""} placeholder={t.patientForm.footTypePlaceholder} />
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
                            <Input {...field} value={field.value || ""} placeholder={t.patientForm.footSizePlaceholder} />
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
                          <Input {...field} value={field.value || ""} placeholder={t.patientForm.kneeJointPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </>
                  )}
                </div>
              )}

              {conditionType === "physiotherapy" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="diseaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.diagnosisType}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder={t.patientForm.diagnosisPlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {conditionType === "medical_support" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="supportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.patientForm.supportType}</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder={t.patientForm.supportTypePlaceholder} />
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
                          <Input {...field} value={field.value || ""} placeholder={t.patientForm.injurySidePlaceholder} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="generalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.generalNotesLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder={t.patientForm.generalNotesExpandedPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.patientForm.estimatedCost}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="font-mono text-left" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
