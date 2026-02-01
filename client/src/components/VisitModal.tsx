import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVisitSchema, InsertVisit } from "@shared/schema";
import { useAddVisit } from "@/hooks/use-patients";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

interface VisitModalProps {
  patientId: number;
  branchId: number;
}

const formSchema = insertVisitSchema;

export function VisitModal({ patientId, branchId }: VisitModalProps) {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useAddVisit();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: patientId,
      branchId: branchId,
      details: "",
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutate(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset({
          patientId: patientId,
          branchId: branchId,
          details: "",
          notes: "",
        });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20" data-testid="button-add-visit">
          <PlusCircle className="w-4 h-4" />
          تسجيل زيارة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] font-body" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-blue-600">سبب الزيارة</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سبب الزيارة</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""}
                      placeholder="ما تم خلال الزيارة: فحص، قياسات، تعديلات..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التسجيل...
                </>
              ) : (
                "حفظ الزيارة"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
