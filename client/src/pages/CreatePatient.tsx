import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type Branch } from "@shared/schema";
import { useCreatePatient } from "@/hooks/use-patients";
import { useLocation, useSearch } from "wouter";
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
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";

// Form schema with coercion for numbers and optional date
const formSchema = insertPatientSchema.extend({
  age: z.coerce.number().min(1, "العمر مطلوب"),
  totalCost: z.coerce.number().optional(),
  injuryDate: z.string().optional().nullable().transform(val => val === "" ? null : val),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreatePatient() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const defaultBranchId = Number(searchParams.get("branch")) || 1;
  
  const { mutate, isPending } = useCreatePatient();
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
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
      generalNotes: "",
      prostheticType: "",
      treatmentType: "",
      branchId: defaultBranchId,
    },
  });

  const conditionType = form.watch("medicalCondition");

  // Sync boolean flags with string selection
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
    mutate(values, {
      onSuccess: (data) => {
        setLocation(`/patients/${data.id}`);
      },
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-transition py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setLocation("/patients")} className="p-2">
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </Button>
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">فتح ملف مريض جديد</h2>
          <p className="text-muted-foreground">الرجاء إدخال البيانات بدقة لضمان جودة الخدمة</p>
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
                      defaultValue={String(field.value)}
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
                        defaultValue={field.value}
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

              <FormField
                control={form.control}
                name="injuryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الإصابة</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} className="bg-slate-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {conditionType === "amputee" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="amputationSite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>جهة ومستوى البتر</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="مثال: تحت الركبة - الجهة اليمنى" />
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
                          <Input {...field} value={field.value || ""} placeholder="مثال: طرف سفلي ذكي، ركبة ميكانيكية..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {conditionType === "physiotherapy" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="diseaseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تشخيص الحالة / نوع المرض</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="مثال: شلل نصفي، إصابة عمود فقري..." />
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
                          <Input {...field} value={field.value || ""} placeholder="مثال: علاج طبيعي، تأهيل حركي..." />
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
                    <FormLabel>ملاحظات عامة</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="أي ملاحظات إضافية عن الحالة..." />
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
                    <FormLabel>التكلفة التقديرية للعلاج (د.ع)</FormLabel>
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
              حفظ وإنشاء الملف
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-12" onClick={() => setLocation("/patients")}>
              إلغاء
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
