// «تواصل المريض» — سطرُ واتساب، وتلغرامُ برمز QR (§4.bl).
//
// ══ واتساب ═══════════════════════════════════════════════════════════════
// سطرُ حالةٍ يُقرأ لا يُدار: الرقمُ في الملفّ والرايةُ في «تعديل المريض»، والإرسالُ تلقائيّ.
//
// ══ تلغرام — عاد بقرار المالك (٢٠٢٦-١٠-٠٢) قناةً ثانية ══════════════════════
// تلغرامُ لا يسمح لبوتٍ أن يراسل أحداً برقمه، فالمريضُ يربط نفسَه: الموظّفةُ تضغط «رمز ربط تلغرام» فيظهر QR، والمريضُ
// يمسحه ويضغط «ابدأ» في بوت المرضى. **والرابطُ في حالة النافذة وحدها** — لا يُخزَّن ولا يُعاد عرضُه (بصمتُه وحدها في
// القاعدة)، وإصدارُ جديدٍ يسحب القديم. **ولا استطلاعَ دوريّ** (قرارُ المالك ٢٠٢٦-٠٩-٢٣): زرُّ «تحقّق من الربط» يسأل مرّة.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { BellOff, Check, Copy, Link2, Loader2, MessageCircle, RefreshCw, Send, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PatientCardControls } from "@/components/patient/PatientCardControls";

export interface PatientCommunicationCardProps {
  patientId: number;
  /** `patients.whatsapp_notifications_enabled` كما يصل مع صفّ المريض. */
  enabled?: boolean | null;
  /** هل للملفّ رقمٌ مطبَّع صالح؟ بدونه لا وجهةَ مهما رُفعت الراية. */
  hasPhone?: boolean;
  /** مفتاحُ «بطاقة المريض مفعّلة» للمسؤول وحده — والخادمُ يفرضه (§4.bv). */
  isAdmin?: boolean;
}

interface ActiveContact { id: number; channel: string; relation: string; linkedAt: string }
interface CommunicationState { activeContacts: ActiveContact[] }

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-IQ", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Baghdad" });
}

export default function PatientCommunicationCard({ patientId, enabled, hasPhone = true, isAdmin = false }: PatientCommunicationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ["/api/patients", patientId, "communication"];
  const whatsappOn = enabled === true && hasPhone;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  //  **مَن لا يملك إدارةَ التواصل لا يرى قسمَ تلغرام** (٤٠٣ ⟵ يُخفى) — والخادمُ هو الحكم.
  const state = useQuery<CommunicationState>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/communication`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    retry: false,
  });
  const telegram = useMemo(
    () => (state.data?.activeContacts ?? []).filter((c) => c.channel === "telegram"),
    [state.data],
  );

  const issue = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/patients/${patientId}/communication/link-tokens`,
        { channel: "telegram", relation: "self" });
      return res.json() as Promise<{ telegramDeepLink?: string }>;
    },
    onSuccess: (body) => {
      if (!body.telegramDeepLink) {
        toast({ title: "بوت المرضى غير مُعدّ بعد", description: "يُضبط من إعدادات الخادم أوّلاً.", variant: "destructive" });
        return;
      }
      setDeepLink(body.telegramDeepLink);
      setCopied(false);
      setDialogOpen(true);
    },
    onError: () => toast({ title: "تعذّر إصدار رمز الربط", variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (contactId: number) =>
      apiRequest("POST", `/api/patients/${patientId}/communication/contacts/${contactId}/revoke`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({ title: "فُكّ ربط تلغرام" });
    },
    onError: () => toast({ title: "تعذّر فكّ الربط", variant: "destructive" }),
  });

  const checkLinked = async () => {
    const before = telegram.map((c) => c.id);
    const res = await state.refetch();
    const now = (res.data?.activeContacts ?? []).filter((c) => c.channel === "telegram").map((c) => c.id);
    if (now.some((id) => !before.includes(id))) {
      setDialogOpen(false);
      setDeepLink(null);
      toast({ title: "تم ربط تلغرام بالمريض بنجاح" });
    } else {
      toast({ title: "لم يُربط بعد", description: "تأكّد أن المريض ضغط «ابدأ» (Start) في البوت." });
    }
  };

  return (
    <Card className="p-4 rounded-2xl shadow-sm border-border/60 bg-slate-50/50 space-y-3" data-testid="card-communication">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold text-base flex items-center gap-2 text-sky-700">
          <MessageCircle className="w-4 h-4" />
          واتساب
        </h3>
        {whatsappOn ? (
          <span className="text-sm text-emerald-700 flex items-center gap-1.5" data-testid="text-whatsapp-enabled">
            <Check className="w-4 h-4" />
            الإشعارات مفعلة على الرقم المسجل
          </span>
        ) : (
          <span className="text-sm text-muted-foreground flex items-center gap-1.5" data-testid="text-whatsapp-disabled">
            <BellOff className="w-4 h-4" />
            {hasPhone ? "الإشعارات متوقفة" : "لا يوجد رقم صالح"}
          </span>
        )}
      </div>

      {state.isSuccess && (
        <div className="border-t border-dashed pt-3 space-y-2" data-testid="section-telegram">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-base flex items-center gap-2 text-sky-700">
              <Send className="w-4 h-4" />
              تلغرام
            </h3>
            {telegram.length > 0 ? (
              <span className="text-sm text-emerald-700 flex items-center gap-1.5" data-testid="text-telegram-linked">
                <Check className="w-4 h-4" />
                مرتبط منذ {formatDate(telegram[0].linkedAt)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground" data-testid="text-telegram-unlinked">غير مرتبط</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => issue.mutate()}
              disabled={issue.isPending} data-testid="button-telegram-link">
              {issue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {telegram.length > 0 ? "رمز ربط جديد" : "رمز ربط تلغرام"}
            </Button>
            {telegram.map((c) => (
              <Button key={c.id} size="sm" variant="ghost" className="gap-1.5 text-red-600"
                onClick={() => { if (window.confirm("فكّ ربط تلغرام عن هذا المريض؟ لن تصله الرسائل عليه بعد ذلك.")) revoke.mutate(c.id); }}
                disabled={revoke.isPending} data-testid={`button-telegram-revoke-${c.id}`}>
                <ShieldOff className="w-4 h-4" />
                فك الربط
              </Button>
            ))}
          </div>
          <PatientCardControls patientId={patientId} isAdmin={isAdmin} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setDeepLink(null); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>ربط تلغرام</DialogTitle>
            <DialogDescription>
              يمسح المريض الرمز بكاميرا هاتفه (وتلغرام مثبّت)، ثم يضغط «ابدأ» (Start). الرمز صالح ثلاثة أيام ولمرّة واحدة.
            </DialogDescription>
          </DialogHeader>
          {deepLink && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-xl" data-testid="qr-telegram">
                <QRCodeSVG value={deepLink} size={208} />
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 w-full" data-testid="button-telegram-copy"
                onClick={async () => { try { await navigator.clipboard.writeText(deepLink); setCopied(true); } catch { /* ignore */ } }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "نُسخ الرابط" : "نسخ الرابط (لإرساله للمريض)"}
              </Button>
              <Button size="sm" className="gap-1.5 w-full" onClick={checkLinked} disabled={state.isFetching}
                data-testid="button-telegram-check">
                {state.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                تحقّق من الربط
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
