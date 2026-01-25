import { useForm } from "react-hook-form";
import { useUpdateVisit } from "@/hooks/use-patients";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

interface EditVisitModalProps {
  visit: {
    id: number;
    details: string | null;
    notes: string | null;
  };
  patientId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  details: z.string().optional(),
  notes: z.string().optional(),
});

export function EditVisitModal({ visit, patientId, open, onOpenChange }: EditVisitModalProps) {
  const { mutate, isPending } = useUpdateVisit();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      details: visit.details || "",
      notes: visit.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        details: visit.details || "",
        notes: visit.notes || "",
      });
    }
  }, [open, visit, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate({
      visitId: visit.id,
      patientId: patientId,
      details: values.details || "",
      notes: values.notes || "",
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] font-body" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-blue-600">تحرير الزيارة</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تفاصيل الزيارة</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""}
                      placeholder="ما تم خلال الزيارة: فحص، قياسات، تعديلات..."
                      className="min-h-[100px]"
                      data-testid="input-edit-visit-details"
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
                    <Input {...field} value={field.value || ""} placeholder="أي ملاحظات أخرى..." data-testid="input-edit-visit-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isPending} data-testid="button-save-visit-edit">
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ التعديلات"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
