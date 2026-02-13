import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPaymentSchema, InsertPayment } from "@shared/schema";
import { useAddPayment } from "@/hooks/use-patients";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Loader2, Calendar } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

interface PaymentModalProps {
  patientId: number;
  branchId: number;
}

const formSchema = insertPaymentSchema.extend({
  amount: z.coerce.number().min(1, "المبلغ يجب أن يكون أكبر من 0"),
  date: z.string().optional().nullable(),
});

// Get today's date in YYYY-MM-DD format for the date input
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const TREATMENT_TYPE_OPTIONS = [
  { value: "روبوت", label: "روبوت" },
  { value: "تمارين تأهيلية", label: "تمارين تأهيلية" },
  { value: "أجهزة علاج طبيعي", label: "أجهزة علاج طبيعي" },
];

export function PaymentModal({ patientId, branchId }: PaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTreatmentTypes, setSelectedTreatmentTypes] = useState<string[]>([]);
  const { mutate, isPending } = useAddPayment();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: patientId,
      branchId: branchId,
      amount: "" as any,
      notes: "",
      paymentTreatmentType: "",
      date: getTodayDate(),
    },
  });

  const handleTreatmentTypeToggle = (value: string, checked: boolean) => {
    setSelectedTreatmentTypes(prev => 
      checked ? [...prev, value] : prev.filter(t => t !== value)
    );
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    let submissionDate = values.date;
    if (submissionDate) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      submissionDate = `${submissionDate}T${hours}:${minutes}:${seconds}`;
    }
    
    const paymentTreatmentType = selectedTreatmentTypes.length > 0 
      ? selectedTreatmentTypes.join(",") 
      : null;
    
    mutate({ ...values, date: submissionDate, paymentTreatmentType }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setSelectedTreatmentTypes([]);
      },
    });
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedTreatmentTypes([]);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <PlusCircle className="w-4 h-4" />
          تسجيل دفعة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] font-body" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">تسجيل دفعة مالية</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    تاريخ الدفعة
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value || getTodayDate()}
                      className="text-left"
                      data-testid="input-payment-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>نوع العلاج</FormLabel>
              <div className="space-y-2">
                {TREATMENT_TYPE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`treatment-${option.value}`}
                      checked={selectedTreatmentTypes.includes(option.value)}
                      onCheckedChange={(checked) => handleTreatmentTypeToggle(option.value, !!checked)}
                      data-testid={`checkbox-treatment-${option.value}`}
                    />
                    <label
                      htmlFor={`treatment-${option.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ المدفوع (د.ع)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      className="text-left font-mono" 
                      placeholder="أدخل المبلغ" 
                      data-testid="input-payment-amount"
                      value={field.value === 0 ? "" : field.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? "" : Number(val));
                      }}
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
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="مثال: دفعة أولى نقداً" data-testid="input-payment-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التسجيل...
                </>
              ) : (
                "حفظ الدفعة"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
