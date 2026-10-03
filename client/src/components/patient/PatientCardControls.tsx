// «بطاقة المريض» في قسم التواصل (§4.bv، الدفعة ٣): معاينةُ ما يراه المريض لكلّ مَن يدير التواصل،
// ومفتاحُ «بطاقة المريض مفعّلة» للمسؤول وحده (التجربةُ بمرضى يختارهم المالك). والخادمُ هو الحكم في الاثنين.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, IdCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PatientCard } from "@shared/patient_card";
import { PatientCardView, PatientCardBackdrop } from "./PatientCardView";

interface CardPreview { enabled: boolean; enabledAt: string | null; telegramLinked: boolean; card: PatientCard | null }

export function PatientCardControls({ patientId, isAdmin }: { patientId: number; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ["/api/patients", patientId, "patient-card"];
  const [open, setOpen] = useState(false);

  const preview = useQuery<CardPreview>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/patient-card`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    retry: false,
  });

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) =>
      (await apiRequest("POST", `/api/patients/${patientId}/patient-card`, { enabled })).json() as Promise<{ enabled: boolean; notified: number }>,
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({
        title: r.enabled ? "فُعّلت بطاقة المريض" : "أُطفئت بطاقة المريض",
        description: r.enabled
          ? (r.notified > 0 ? "وصلته رسالة في تلغرام بزرّ فتح البطاقة." : "يفتحها بكتابة «بطاقتي» في بوت المرضى بعد ربط تلغرام.")
          : "لن يستطيع فتحها حتى تُفعَّل ثانيةً.",
      });
    },
    onError: () => toast({ title: "تعذّر حفظ حالة البطاقة", variant: "destructive" }),
  });

  if (!preview.isSuccess) return null;
  const { enabled, telegramLinked, card } = preview.data;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-1" data-testid="section-patient-card">
      <span className="text-sm flex items-center gap-1.5">
        <IdCard className="w-4 h-4 text-sky-700" />
        بطاقة المريض:
        <span className={enabled ? "text-emerald-700" : "text-muted-foreground"} data-testid="text-patient-card-state">
          {enabled ? "مفعّلة" : "غير مفعّلة"}
        </span>
      </span>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)} disabled={!card}
          data-testid="button-patient-card-preview">
          <Eye className="w-4 h-4" />
          معاينة ما يراه المريض
        </Button>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            {toggle.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Switch checked={enabled} disabled={toggle.isPending} data-testid="switch-patient-card"
              onCheckedChange={(v) => {
                const msg = v
                  ? `تفعيل بطاقة المريض؟ سيرى في تلغرام ما في المعاينة بالضبط${telegramLinked ? "، وتصله رسالة بزرّ فتحها." : "."}`
                  : "إطفاء بطاقة المريض؟ لن يستطيع فتحها بعد ذلك.";
                if (window.confirm(msg)) toggle.mutate(v);
              }} />
            مفعّلة
          </label>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>ما يراه المريض في تلغرام</DialogTitle>
            <DialogDescription>
              {enabled ? "البطاقة مفعّلة — هذا ما يظهر له الآن." : "البطاقة غير مفعّلة — هذا ما سيظهر له حين تُفعَّل."}
            </DialogDescription>
          </DialogHeader>
          {card && <PatientCardBackdrop><PatientCardView card={card} /></PatientCardBackdrop>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
