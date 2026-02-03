import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Branch } from "@shared/schema";
import { usePatient, useUpdatePatient } from "@/hooks/use-patients";
import { useBranchSession } from "@/components/BranchGate";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ArrowRight } from "lucide-react";
import { z } from "zod";
import { useEffect, useState } from "react";

// Get today's date in YYYY-MM-DD format for Iraq timezone
function getTodayDateString(): string {
  const now = new Date();
  const iraqTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
  const year = iraqTime.getFullYear();
  const month = String(iraqTime.getMonth() + 1).padStart(2, '0');
  const day = String(iraqTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const formSchema = insertPatientSchema.extend({
  age: z.string().min(1, "العمر مطلوب"),
  totalCost: z.coerce.number().optional(),
  injuryDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
  referralSource: z.string().min(1, "نوع الجهة المحول منها مطلوب"),
  referralSourceName: z.string().optional(),
  registrationDate: z.string().min(1, "تاريخ الإضافة مطلوب"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditPatient() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const patientId = Number(id);
  const branchSession = useBranchSession();
  const isReception = branchSession?.role === "reception";
  
  const { data: patient, isLoading: isLoadingPatient } = usePatient(patientId);
  const { mutate, isPending } = useUpdatePatient();
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
      registrationDate: getTodayDateString(),
      name: "",
      phone: "",
      address: "",
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
      branchId: 1,
    },
  });

  useEffect(() => {
    if (patient) {
      form.reset({
        registrationDate: patient.registrationDate || getTodayDateString(),
        name: patient.name,
        phone: patient.phone || "",
        address: patient.address || "",
        age: patient.age,
        weight: patient.weight || "",
        height: patient.height || "",
        medicalCondition: patient.medicalCondition,
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
        branchId: patient.branchId,
      });
    }
  }, [patient, form]);

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
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Silicone prosthetics state
  const [siliconePart, setSiliconePart] = useState("");
  const [siliconeSide, setSiliconeSide] = useState<"right" | "left" | "both">("right");
  const [siliconeNotes, setSiliconeNotes] = useState("");

  // Parse existing amputationSite when patient loads
  useEffect(() => {
    if (patient?.amputationSite && !isInitialized) {
      const site = patient.amputationSite;
      if (site.startsWith("احادي")) {
        setAmputationType("single");
        if (site.includes("طرف علوي")) setSingleLimb("upper");
        else setSingleLimb("lower");
        if (site.includes("يسار")) setSingleSide("left");
        else setSingleSide("right");
        const parts = site.split(" - ");
        if (parts.length >= 4) setSingleAmputationDetail(parts[3]);
      } else if (site.startsWith("ثنائي")) {
        setAmputationType("double");
        if (site.includes("علوي وسفلي")) {
          setDoubleLimbType("both");
        } else if (site.includes("علوي")) {
          setDoubleLimbType("upper");
        } else {
          setDoubleLimbType("lower");
        }
      } else if (site.startsWith("اطراف سليكونية")) {
        setAmputationType("silicone");
        // Parse silicone part, side and notes
        const mainParts = site.split(" | ملاحظات: ");
        const siliconeInfo = mainParts[0].replace("اطراف سليكونية تعويضية - ", "");
        const infoParts = siliconeInfo.split(" - ");
        setSiliconePart(infoParts[0] || "");
        if (infoParts.length >= 2) {
          if (infoParts[1] === "يسار") setSiliconeSide("left");
          else if (infoParts[1] === "كلا الجانبين") setSiliconeSide("both");
          else setSiliconeSide("right");
        }
        if (mainParts.length >= 2) setSiliconeNotes(mainParts[1] || "");
      }
      setIsInitialized(true);
    }
  }, [patient, isInitialized]);

  // Build amputationSite string from selections
  useEffect(() => {
    if (conditionType !== "amputee" || !isInitialized) return;
    
    let site = "";
    if (amputationType === "single") {
      const limbText = singleLimb === "upper" ? "طرف علوي" : "طرف سفلي";
      const sideText = singleSide === "right" ? "يمين" : "يسار";
      site = `احادي - ${limbText} - ${sideText}`;
      if (singleAmputationDetail) site += ` - ${singleAmputationDetail}`;
    } else if (amputationType === "double") {
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
  }, [amputationType, singleLimb, singleSide, singleAmputationDetail, doubleLimbType, doubleRightDetail, doubleLeftDetail, bothRightLimb, bothLeftLimb, bothRightDetail, bothLeftDetail, siliconePart, siliconeSide, siliconeNotes, conditionType, form, isInitialized]);

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

  function onSubmit(values: FormValues) {
    mutate({ id: patientId, data: values }, {
      onSuccess: () => {
        setLocation(`/patients/${patientId}`);
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
    return <div className="p-8 text-center text-muted-foreground">المريض غير موجود</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 page-transition py-2 md:py-6">
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}`)} className="p-2 shrink-0">
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800">تحرير بيانات المريض</h2>
          <p className="text-xs md:text-base text-muted-foreground">تعديل معلومات {patient.name}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card className="p-4 md:p-6 rounded-xl md:rounded-2xl shadow-sm border-border/60">
            <h3 className="text-base md:text-lg font-bold text-primary mb-3 md:mb-4 border-b pb-2">البيانات الشخصية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {!isReception && (
                <FormField
                  control={form.control}
                  name="registrationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الإضافة *</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-slate-50" 
                          max={getTodayDateString()}
                          data-testid="input-registration-date"
                        />
                      </FormControl>
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
                    <FormLabel>اسم المريض الكامل</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-slate-50" placeholder="الاسم الرباعي" />
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
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: 07701234567" />
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
                    <FormLabel>العنوان</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="المحافظة / المنطقة / الحي" />
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
                    <FormLabel>نوع الجهة المحول منها *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-50" data-testid="select-referral-source">
                          <SelectValue placeholder="اختر نوع الجهة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="طبيب">طبيب</SelectItem>
                        <SelectItem value="مستشفى">مستشفى</SelectItem>
                        <SelectItem value="جهة حكومية">جهة حكومية</SelectItem>
                        <SelectItem value="منظمة انسانية">منظمة انسانية</SelectItem>
                        <SelectItem value="مركز طبي">مركز طبي</SelectItem>
                        <SelectItem value="فيسبوك">فيسبوك</SelectItem>
                        <SelectItem value="انستاغرام">انستاغرام</SelectItem>
                        <SelectItem value="تيكتوك">تيكتوك</SelectItem>
                        <SelectItem value="كوكل">كوكل</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referralSourceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الجهة المحولة</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: د. أحمد / مستشفى الكرامة" data-testid="input-referral-source-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العمر</FormLabel>
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
                    <FormLabel>الوزن (كجم)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: 70" />
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
                    <FormLabel>الطول (سم)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: 175" />
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
                    <FormLabel>الفرع</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(Number(val))} 
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-50" data-testid="select-branch">
                          <SelectValue placeholder="اختر الفرع" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border-border/60">
            <h3 className="text-lg font-bold text-primary mb-4 border-b pb-2">تفاصيل الحالة الطبية</h3>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="medicalCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">نوع الحالة</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="amputee" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            حالة بتر (أطراف صناعية)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="physiotherapy" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            علاج طبيعي / تأهيل
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="medical_support" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer flex-1">
                            مساند طبية
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionType === "amputee" && (
                <>
                  {/* Amputation Type Selection */}
                  <div className="space-y-4">
                    <FormLabel className="text-base">نوع البتر</FormLabel>
                    <RadioGroup
                      value={amputationType}
                      onValueChange={(val) => setAmputationType(val as "single" | "double" | "silicone")}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                        <RadioGroupItem value="single" id="edit-single" />
                        <label htmlFor="edit-single" className="font-normal cursor-pointer flex-1">احادي</label>
                      </div>
                      <div className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                        <RadioGroupItem value="double" id="edit-double" />
                        <label htmlFor="edit-double" className="font-normal cursor-pointer flex-1">ثنائي</label>
                      </div>
                      <div className="flex items-center space-x-3 space-x-reverse space-y-0 border rounded-xl p-4 flex-1 cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                        <RadioGroupItem value="silicone" id="edit-silicone" />
                        <label htmlFor="edit-silicone" className="font-normal cursor-pointer flex-1">اطراف سليكونية تعويضية</label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Single Amputation Options */}
                  {amputationType === "single" && (
                    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel>الطرف</FormLabel>
                          <Select value={singleLimb} onValueChange={(val) => setSingleLimb(val as "upper" | "lower")}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="upper">طرف علوي</SelectItem>
                              <SelectItem value="lower">طرف سفلي</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>الجهة</FormLabel>
                          <Select value={singleSide} onValueChange={(val) => setSingleSide(val as "right" | "left")}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="right">يمين</SelectItem>
                              <SelectItem value="left">يسار</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FormLabel>نوع البتر</FormLabel>
                        <Input 
                          value={singleAmputationDetail} 
                          onChange={(e) => setSingleAmputationDetail(e.target.value)}
                          placeholder="مثال: تحت الركبة، فوق الركبة، تحت المرفق..."
                          className="bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Double Amputation Options */}
                  {amputationType === "double" && (
                    <div className="space-y-4 p-4 border rounded-xl bg-slate-50/50">
                      <div className="space-y-2">
                        <FormLabel>نوع البتر الثنائي</FormLabel>
                        <Select value={doubleLimbType} onValueChange={(val) => setDoubleLimbType(val as "upper" | "lower" | "both")}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upper">علوي</SelectItem>
                            <SelectItem value="lower">سفلي</SelectItem>
                            <SelectItem value="both">علوي وسفلي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(doubleLimbType === "upper" || doubleLimbType === "lower") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FormLabel>البتر اليمين</FormLabel>
                            <Input 
                              value={doubleRightDetail} 
                              onChange={(e) => setDoubleRightDetail(e.target.value)}
                              placeholder="نوع البتر..."
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <FormLabel>البتر اليسار</FormLabel>
                            <Input 
                              value={doubleLeftDetail} 
                              onChange={(e) => setDoubleLeftDetail(e.target.value)}
                              placeholder="نوع البتر..."
                              className="bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {doubleLimbType === "both" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3 p-3 border rounded-lg bg-white">
                            <FormLabel className="text-primary">اليمين</FormLabel>
                            <Select value={bothRightLimb} onValueChange={(val) => setBothRightLimb(val as "upper" | "lower")}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upper">علوي</SelectItem>
                                <SelectItem value="lower">سفلي</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              value={bothRightDetail} 
                              onChange={(e) => setBothRightDetail(e.target.value)}
                              placeholder="نوع البتر..."
                            />
                          </div>
                          <div className="space-y-3 p-3 border rounded-lg bg-white">
                            <FormLabel className="text-primary">اليسار</FormLabel>
                            <Select value={bothLeftLimb} onValueChange={(val) => setBothLeftLimb(val as "upper" | "lower")}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="upper">علوي</SelectItem>
                                <SelectItem value="lower">سفلي</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              value={bothLeftDetail} 
                              onChange={(e) => setBothLeftDetail(e.target.value)}
                              placeholder="نوع البتر..."
                            />
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
                          <FormLabel>نوع الطرف السليكوني</FormLabel>
                          <Select value={siliconePart} onValueChange={setSiliconePart}>
                            <SelectTrigger className="bg-white" data-testid="select-silicone-part-edit">
                              <SelectValue placeholder="اختر نوع الطرف" />
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
                            <FormLabel>جهة البتر</FormLabel>
                            <Select value={siliconeSide} onValueChange={(val) => setSiliconeSide(val as "right" | "left" | "both")}>
                              <SelectTrigger className="bg-white" data-testid="select-silicone-side-edit">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="right">يمين</SelectItem>
                                <SelectItem value="left">يسار</SelectItem>
                                <SelectItem value="both">كلا الجانبين</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FormLabel>ملاحظات عامة</FormLabel>
                        <Input 
                          value={siliconeNotes} 
                          onChange={(e) => setSiliconeNotes(e.target.value)}
                          placeholder="أي ملاحظات إضافية..."
                          className="bg-white"
                          data-testid="input-silicone-notes-edit"
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
                        <FormLabel>نوع الطرف الصناعي</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: طرف كربون فايبر" />
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
                          <FormLabel>نوع السليكون</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: سليكون طبي..." />
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
                          <FormLabel>حجم السليكون</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: M، L، XL..." />
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
                        <FormLabel>نظام التعليق</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: حزام، فاكيوم، سليكون..." />
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
                          <FormLabel>نوع القدم</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: قدم كربون، قدم مرنة..." />
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
                          <FormLabel>حجم القدم</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: 42، 43..." />
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
                        <FormLabel>نوع مفصل الركبة</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: مفصل هيدروليكي، مفصل ميكانيكي..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </>
                  )}
                </>
              )}

              {conditionType === "physiotherapy" && (
                <>
                  <FormField
                    control={form.control}
                    name="diseaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الإصابة / المرض</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: إصابة الرباط الصليبي" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="treatmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع العلاج</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: جلسات علاج طبيعي" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {conditionType === "medical_support" && (
                <>
                  <FormField
                    control={form.control}
                    name="supportType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع المسند</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: مسند ظهر، مسند رقبة، مسند يد..." />
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
                        <FormLabel>جهة الإصابة</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: يمين، يسار، كلا الجانبين..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="injuryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الإصابة (اختياري)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} className="bg-slate-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="injuryCause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سبب الإصابة</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: حادث سير، إصابة عمل، مرض..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-sm border-border/60">
            <h3 className="text-lg font-bold text-primary mb-4 border-b pb-2">المعلومات المالية والملاحظات</h3>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="totalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة الكلية (د.ع)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-slate-50" placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="generalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات عامة</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} className="bg-slate-50 min-h-[100px]" placeholder="أي ملاحظات إضافية..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={isPending} className="flex-1 h-12 text-lg gap-2">
              {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
              حفظ التغييرات
            </Button>
            <Button type="button" variant="outline" onClick={() => setLocation(`/patients/${patientId}`)} className="h-12">
              إلغاء
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
