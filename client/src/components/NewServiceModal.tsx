import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { RefreshCcw, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface NewServiceModalProps {
  patientId: number;
  branchId: number;
  currentTotalCost: number;
}

const serviceTypes = [
  { value: "maintenance", label: "صيانة الطرف الصناعي" },
  { value: "additional_therapy", label: "جلسات علاج إضافية" },
  { value: "new_prosthetic", label: "طرف صناعي جديد" },
  { value: "adjustment", label: "تعديل أو ضبط" },
  { value: "consultation", label: "استشارة طبية" },
  { value: "other", label: "خدمة أخرى" },
];

const formSchema = z.object({
  serviceType: z.string().min(1, "اختر نوع الخدمة"),
  serviceCost: z.coerce.number().min(1, "تكلفة الخدمة يجب أن تكون أكبر من 0"),
  initialPayment: z.coerce.number().min(0, "الدفعة لا يمكن أن تكون سالبة"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function NewServiceModal({ patientId, branchId, currentTotalCost }: NewServiceModalProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("POST", `/api/patients/${patientId}/new-service`, {
        ...data,
        branchId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId] });
      toast({
        title: "تمت إضافة الخدمة بنجاح",
        description: "تم تحديث التكلفة الإجمالية وإضافة الزيارة والدفعة",
      });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "حدث خطأ",
        description: "فشل في إضافة الخدمة الجديدة",
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceType: "",
      serviceCost: 0,
      initialPayment: 0,
      notes: "",
    },
  });

  const serviceCost = form.watch("serviceCost") || 0;
  const newTotal = currentTotalCost + serviceCost;

  function onSubmit(values: FormValues) {
    mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" data-testid="button-new-service">
          <RefreshCcw className="w-4 h-4" />
          إضافة خدمة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] font-body" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">إضافة خدمة جديدة للمريض</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الخدمة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder="اختر نوع الخدمة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تكلفة الخدمة الجديدة (د.ع)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      className="text-left font-mono" 
                      placeholder="0" 
                      data-testid="input-service-cost"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>التكلفة الإجمالية الحالية:</span>
                <span className="font-mono">{currentTotalCost.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between font-semibold text-primary mt-1">
                <span>التكلفة الإجمالية الجديدة:</span>
                <span className="font-mono">{newTotal.toLocaleString()} د.ع</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="initialPayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الدفعة الأولية (اختياري)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      className="text-left font-mono" 
                      placeholder="0" 
                      data-testid="input-initial-payment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="مثال: صيانة دورية للطرف الأيمن..." 
                      className="resize-none"
                      data-testid="input-service-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold" 
              disabled={isPending}
              data-testid="button-submit-new-service"
            >
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                "إضافة الخدمة"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
