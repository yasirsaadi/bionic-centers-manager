import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Branch } from "@shared/schema";
import { usePatient, useUpdatePatient } from "@/hooks/use-patients";
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
import { useEffect } from "react";

const formSchema = insertPatientSchema.extend({
  age: z.coerce.number().min(1, "العمر مطلوب"),
  totalCost: z.coerce.number().optional(),
  injuryDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditPatient() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const patientId = Number(id);
  
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
      name: "",
      phone: "",
      address: "",
      age: 0,
      weight: "",
      height: "",
      medicalCondition: "amputee",
      isAmputee: true,
      isPhysiotherapy: false,
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
      branchId: 1,
    },
  });

  useEffect(() => {
    if (patient) {
      form.reset({
        name: patient.name,
        phone: patient.phone || "",
        address: patient.address || "",
        age: patient.age,
        weight: patient.weight || "",
        height: patient.height || "",
        medicalCondition: patient.medicalCondition,
        isAmputee: patient.isAmputee,
        isPhysiotherapy: patient.isPhysiotherapy,
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
        branchId: patient.branchId,
      });
    }
  }, [patient, form]);

  const conditionType = form.watch("medicalCondition");

  useEffect(() => {
    if (conditionType === "amputee") {
      form.setValue("isAmputee", true);
      form.setValue("isPhysiotherapy", false);
    } else {
      form.setValue("isAmputee", false);
      form.setValue("isPhysiotherapy", true);
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
    <div className="max-w-3xl mx-auto space-y-6 page-transition py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setLocation(`/patients/${patientId}`)} className="p-2">
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">تحرير بيانات المريض</h2>
          <p className="text-muted-foreground">تعديل معلومات {patient.name}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card className="p-6 rounded-2xl shadow-sm border-border/60">
            <h3 className="text-lg font-bold text-primary mb-4 border-b pb-2">البيانات الشخصية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionType === "amputee" && (
                <>
                  <FormField
                    control={form.control}
                    name="amputationSite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>موقع البتر</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="bg-slate-50" placeholder="مثال: الطرف الأيمن تحت الركبة" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
