// بطاقة «تواصل المريض» — **واتساب هي قناةُ الروابط الجديدة**.
//
// ══ ما لا تفعله هذه الواجهة ═════════════════════════════════════════════
// **لا تنادي مزوّداً إطلاقاً.** لا Bot API ولا Graph، ولا ترسل رسالة، ولا
// تعرف توكناً. مهمّتها إصدارُ رابطِ ربطٍ فقط — والترحيبُ ولقطةُ الحالة
// يرسلهما صندوقُ الصادر تلقائياً بعد أن يرسل المريضُ رسالةَ الربط بنفسه،
// فيستفيدان من إعادة المحاولة. وزرُّ «رسالة تجريبية» كان سيفتح مساراً
// يتجاوز الصادرَ كلَّه.
//
// ══ وما لا تعرضه ════════════════════════════════════════════════════════
// لا `externalId` — الموظّفُ لا يحتاج رقمَ واتساب صاحبِ الحساب ولا معرّفَ
// تلغرام، **والخادمُ لا يرسلهما أصلاً**. ولا بصمةَ تذكرة. ولا نصَّ التذكرة
// عارياً: الرابطُ يُعرَض **رمزاً ونسخاً** لا نصّاً مقروءاً، ويعيش في حالة
// النافذة وحدها ويُمحى بإغلاقها. ولا يدخل سجلّاً ولا تخزيناً محلّياً ولا
// عنوانَ صفحة.
//
// ══ وتلغرام أثناء الانتقال ══════════════════════════════════════════════
// **لا يُنشأ رابطُ تلغرام جديد من هنا بعد اليوم.** لكنّ المرتبطين به فعلاً
// يظهرون في قسمٍ صغير «ربط قديم» بزرّ سحبِهم — ولا يُسحبون تلقائياً: مريضٌ
// ينتظر طرفَه ويستلم تحديثاته على تلغرام لا يجوز أن ينقطع عنه لأننا بدّلنا
// القناة. التقاعدُ يقع بعد إثبات واتساب على الإنتاج، وفي تغييرٍ صريح.
//
// ══ والصلاحية من الخادم لا من الإخفاء ══════════════════════════════════
// كل نقطة تفحص بنفسها (دور مؤهَّل ثم نطاق فرع المريض). فإن ردّ الخادم 403
// لم تُعرَض أزرارٌ لا تعمل — لا لأننا نثق بالإخفاء، بل كي لا يضغط الموظّف
// زرّاً يُردّ. والمنع الحقيقي هناك.

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { MessageCircle, Copy, Check, ExternalLink, Link2, Loader2, ShieldOff, Clock, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { classifyCommunicationError, hasNewContact } from "./patient_communication_logic";

// ── المفردات ──────────────────────────────────────────────────────────────

/** القناةُ التي تُصدَر بها الروابطُ الجديدة — **في موضعٍ واحد**. */
const LINK_CHANNEL = "whatsapp";
/** القناةُ الموروثة: تُقرأ وتُسحَب، **ولا تُنشأ**. */
const LEGACY_CHANNEL = "telegram";

/** الصلات كما يقرؤها الموظّف ⇒ القيم التي يقبلها الخادم. */
const RELATIONS: { value: string; label: string }[] = [
  { value: "self", label: "المريض نفسه" },
  { value: "guardian", label: "ولي أمر" },
  { value: "family", label: "أحد أفراد العائلة" },
  { value: "caregiver", label: "مقدم رعاية" },
  { value: "other", label: "أخرى" },
];
const RELATION_LABEL: Record<string, string> = Object.fromEntries(
  RELATIONS.map((r) => [r.value, r.label]),
);

interface ActiveContact {
  id: number;
  channel: string;
  relation: string;
  linkedAt: string;
}
interface PendingToken {
  id: number;
  channel: string;
  relation: string;
  expiresAt: string;
  createdAt: string;
}
interface CommunicationState {
  activeContacts: ActiveContact[];
  pendingTokens: PendingToken[];
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ar-IQ", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baghdad",
  });
}

/** «بعد ٧ دقائق» أو «انتهت صلاحيته» — الموظّف يحتاج المدّة لا الطابع. */
function remaining(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "انتهت صلاحيته";
  const minutes = Math.ceil(ms / 60_000);
  return minutes === 1 ? "تبقّت دقيقة واحدة" : `تبقّت ${minutes} دقيقة`;
}

export default function PatientCommunicationCard({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const key = ["/api/patients", patientId, "communication"];

  // ── نافذة الإصدار ───────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [relation, setRelation] = useState("self");
  /**
   * **الرابط في حالة النافذة وحدها.** لا سياق عامّ ولا تخزين محلّي ولا
   * عنوان — فإغلاق النافذة يمحوه، ولا نسخة ثانية منه في مكان يبقى.
   */
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [justLinked, setJustLinked] = useState(false);
  const [confirmRevokeContact, setConfirmRevokeContact] = useState<number | null>(null);

  const state = useQuery<CommunicationState>({
    queryKey: key,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/patients/${patientId}/communication`);
      return res.json();
    },
    // **الاستطلاع أثناء النافذة وحدها** — وبعد إصدار رابط فقط. صفحةُ مريض
    // مفتوحة طوال النهار لا يجوز أن تسأل الخادم كل ثانيتين إلى الأبد.
    refetchInterval: dialogOpen && deepLink && !justLinked ? 2500 : false,
    retry: false, // 403 ليست عطلاً عابراً يُعاد
  });

  // **أي فشل يُغلق البطاقة** — لا 403 وحده. وما دامت الحقيقة لم تصل، لا
  // تُعرَض أزرارٌ تفترضها.
  const failure = state.isError ? classifyCommunicationError(state.error) : null;
  const data = state.data;
  const activeWhatsapp = useMemo(
    () => (data?.activeContacts ?? []).filter((c) => c.channel === LINK_CHANNEL),
    [data],
  );
  const pendingWhatsapp = useMemo(
    () => (data?.pendingTokens ?? []).filter((t) => t.channel === LINK_CHANNEL),
    [data],
  );
  /** المرتبطون بتلغرام فعلاً — **قراءةٌ وسحبٌ فقط، ولا إنشاء**. */
  const legacyTelegram = useMemo(
    () => (data?.activeContacts ?? []).filter((c) => c.channel === LEGACY_CHANNEL),
    [data],
  );

  /**
   * **معرّفات** الجهات النشطة وقت فتح النافذة — لا عددها.
   * تغيّر الصلة يستبدل الجهة ولا يزيدها، فالعدد يبقى واحداً والربط نجح.
   */
  const [baselineIds, setBaselineIds] = useState<number[]>([]);
  const currentIds = useMemo(() => activeWhatsapp.map((c) => c.id), [activeWhatsapp]);
  useEffect(() => {
    if (dialogOpen && deepLink && !justLinked && hasNewContact(baselineIds, currentIds)) {
      setJustLinked(true); // يوقف الاستطلاع (الشرط أعلاه) ويُظهر النجاح
      setDeepLink(null);   // **الرابط يُمحى فور نجاحه** — أدّى عمله
      toast({ title: "تم ربط واتساب بالمريض بنجاح." });
    }
  }, [currentIds, baselineIds, dialogOpen, deepLink, justLinked, toast]);

  function openDialog() {
    setBaselineIds(activeWhatsapp.map((c) => c.id));
    setRelation("self");
    setDeepLink(null);
    setCopied(false);
    setJustLinked(false);
    setDialogOpen(true);
  }
  /** الإغلاق يمحو الرابط من الحالة — بلا استثناء ولا مسار جانبي. */
  function closeDialog(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setDeepLink(null);
      setCopied(false);
      setJustLinked(false);
      queryClient.invalidateQueries({ queryKey: key });
    }
  }

  const issue = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/patients/${patientId}/communication/link-tokens`, {
        channel: LINK_CHANNEL,
        relation,
      });
      return res.json();
    },
    // **العقدُ العامّ `deepLink`** — لا حقلٌ باسم قناته. الخادمُ يقول
    // `channel` بجواره، فالشاشةُ لا تخمّن قناتها من اسم مفتاحٍ في JSON.
    onSuccess: async (payload: { tokenId?: number; deepLink?: string }) => {
      if (!payload.deepLink) {
        // **تذكرةٌ صدرت بلا رابط يُعرَض** — واتساب غير مُعدّ على الخادم.
        // تركُها يُبقي «رابطاً بانتظار المريض» لا وجود له، فيمنع إصدار
        // غيره ويُربك الموظّف. فتُسحَب فوراً «بذل جهد»: فشلُ السحب لا
        // يُخفي الخطأ الأصلي، والصفّ يبقى ظاهراً بزرّ إلغائه.
        if (payload.tokenId) {
          try {
            await apiRequest(
              "POST",
              `/api/patients/${patientId}/communication/link-tokens/${payload.tokenId}/revoke`,
            );
          } catch { /* أفضل جهد — والبطاقة ستعرض المعلَّق وزرّ إلغائه */ }
        }
        queryClient.invalidateQueries({ queryKey: key });
        toast({
          title: "تعذّر إنشاء الرابط",
          description: "تكامل واتساب غير مُفعَّل على الخادم. راجع المسؤول.",
          variant: "destructive",
        });
        return;
      }
      setDeepLink(payload.deepLink);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err: any) =>
      toast({ title: "تعذّر إنشاء رابط الربط", description: err.message, variant: "destructive" }),
  });

  const revokeToken = useMutation({
    mutationFn: async (tokenId: number) => {
      await apiRequest("POST", `/api/patients/${patientId}/communication/link-tokens/${tokenId}/revoke`);
    },
    onSuccess: () => {
      toast({ title: "أُلغي رابط الربط" });
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err: any) =>
      toast({ title: "تعذّر إلغاء الرابط", description: err.message, variant: "destructive" }),
  });

  const revokeContact = useMutation({
    mutationFn: async (contactId: number) => {
      await apiRequest("POST", `/api/patients/${patientId}/communication/contacts/${contactId}/revoke`);
    },
    onSuccess: () => {
      toast({ title: "أُلغي الربط" });
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err: any) =>
      toast({ title: "تعذّر إلغاء الربط", description: err.message, variant: "destructive" }),
  });

  async function copyLink() {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // متصفّح يمنع الحافظة: الرمز قائم، وهو الطريق الأساسي أصلاً.
      toast({ title: "تعذّر النسخ", description: "استخدم رمز QR.", variant: "destructive" });
    }
  }

  // ── فشل القراءة: بطاقة صامتة **بلا زرّ ربط ولا زرّ سحب** ──────────────
  // لا نُخفيها كلّياً كي لا يظنّ الموظّف أن الميزة غير موجودة، ولا نعرض
  // زرّاً يفترض حالةً لم تصل. وزرّ «إعادة المحاولة» للعطل العابر وحده —
  // فالمنع وانتهاء الجلسة لا يُعالَجان بإعادة طلب.
  if (failure) {
    return (
      <Card className="p-6 rounded-2xl shadow-sm border-border/60 bg-slate-50/50" data-testid="card-communication">
        <h3 className="font-bold text-lg flex items-center gap-2 text-sky-700 mb-4">
          <MessageCircle className="w-5 h-5" />
          تواصل المريض — واتساب
        </h3>
        <p
          className="text-sm text-muted-foreground flex items-center gap-2"
          data-testid={`text-communication-${failure.kind}`}
        >
          <ShieldOff className="w-4 h-4 shrink-0" />
          {failure.message}
        </p>
        {failure.canRetry && (
          <Button
            variant="outline" size="sm" className="mt-3"
            onClick={() => state.refetch()}
            data-testid="button-retry-communication"
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            إعادة المحاولة
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-2xl shadow-sm border-border/60 bg-slate-50/50" data-testid="card-communication">
      <h3 className="font-bold text-lg flex items-center gap-2 text-sky-700 mb-4">
        <MessageCircle className="w-5 h-5" />
        تواصل المريض — واتساب
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">واتساب</span>
          {state.isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : activeWhatsapp.length > 0 ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100" data-testid="badge-whatsapp-linked">
              مربوط ✓
            </Badge>
          ) : pendingWhatsapp.length > 0 ? (
            <Badge variant="outline" className="text-amber-700 border-amber-300" data-testid="badge-whatsapp-pending">
              بانتظار المريض
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground" data-testid="badge-whatsapp-unlinked">
              غير مربوط
            </Badge>
          )}
        </div>

        {/* ── المربوط ──────────────────────────────────────────────────── */}
        {activeWhatsapp.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1"
            data-testid={`row-whatsapp-contact-${c.id}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <div className="font-medium text-emerald-900" data-testid={`text-relation-${c.id}`}>
                  {RELATION_LABEL[c.relation] ?? c.relation}
                </div>
                <div className="text-xs text-emerald-800/70">رُبِط في {formatDateTime(c.linkedAt)}</div>
              </div>
              <Button
                variant="ghost" size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                onClick={() => setConfirmRevokeContact(c.id)}
                disabled={revokeContact.isPending}
                data-testid={`button-revoke-contact-${c.id}`}
              >
                إلغاء الربط
              </Button>
            </div>
          </div>
        ))}

        {/* ── رابط معلَّق ──────────────────────────────────────────────── */}
        {/* نصّ الرابط لا يُخزَّن، فلا سبيل لإعادة عرض رابطٍ قديم. المخرج
            الصحيح: إلغاؤه وإصدار غيره — وهذا ما تقوله البطاقة صراحةً. */}
        {pendingWhatsapp.map((tk) => (
          <div
            key={tk.id}
            className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2"
            data-testid={`row-pending-token-${tk.id}`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <Clock className="w-4 h-4" />
              رابط ربط بانتظار المريض
            </div>
            <div className="text-xs text-amber-800/80">
              الصلة: {RELATION_LABEL[tk.relation] ?? tk.relation} — {remaining(tk.expiresAt)}
            </div>
            <p className="text-xs text-muted-foreground">
              لا يمكن عرض الرابط مرّة أخرى. إن فُقد، ألغِه وأصدر رابطاً جديداً.
            </p>
            <Button
              variant="outline" size="sm"
              onClick={() => revokeToken.mutate(tk.id)}
              disabled={revokeToken.isPending}
              data-testid={`button-revoke-token-${tk.id}`}
            >
              إلغاء الرابط
            </Button>
          </div>
        ))}

        {/* رابطٌ معلَّق قائم ⇒ لا إصدار ثانٍ. تذكرتان حيّتان لمريض واحد
            تُربكان الموظّف (أيّهما أعطيته؟) بلا فائدة — والمخرج إلغاء
            القائم، وهو زرٌّ ظاهر فوق. */}
        {pendingWhatsapp.length > 0 ? (
          <p className="text-xs text-center text-muted-foreground" data-testid="text-pending-blocks-issue">
            يوجد رابط ربط بانتظار المريض. ألغِه أولاً لإصدار رابط جديد.
          </p>
        ) : (
          <Button
            onClick={openDialog}
            variant={activeWhatsapp.length > 0 ? "outline" : "default"}
            className="w-full"
            disabled={state.isLoading}
            data-testid="button-link-whatsapp"
          >
            <Link2 className="w-4 h-4 ml-2" />
            {activeWhatsapp.length > 0 ? "ربط رقم آخر" : "ربط واتساب"}
          </Button>
        )}

        {/* ══ تلغرام — ربط قديم ═══════════════════════════════════════════
            **يُقرأ ويُسحَب، ولا يُنشأ.** ولا زرَّ ربطٍ هنا إطلاقاً: القناةُ
            الجديدة واحدة، وإبقاءُ بابٍ ثانٍ مفتوحاً يعني موظّفاً يربط اليوم
            بقناةٍ سنتقاعدها غداً. والسحبُ يبقى متاحاً لمن أراده، ولا يقع
            تلقائياً — الانقطاعُ عن مريضٍ ينتظر جهازه أسوأُ من قناةٍ قديمة. */}
        {legacyTelegram.length > 0 && (
          <div className="pt-3 border-t border-border/60 space-y-2" data-testid="section-legacy-telegram">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Telegram — ربط قديم</span>
              <Badge variant="outline" className="text-[10px] text-slate-600">
                يستمر الإرسال مؤقتاً
              </Badge>
            </div>
            {legacyTelegram.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white/60 p-2 flex items-center justify-between gap-2"
                data-testid={`row-legacy-telegram-${c.id}`}
              >
                <div className="text-xs">
                  <div className="font-medium text-slate-700">
                    {RELATION_LABEL[c.relation] ?? c.relation}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    رُبِط في {formatDateTime(c.linkedAt)}
                  </div>
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 h-7 text-xs"
                  onClick={() => setConfirmRevokeContact(c.id)}
                  disabled={revokeContact.isPending}
                  data-testid={`button-revoke-contact-${c.id}`}
                >
                  إلغاء الربط
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ نافذة الإصدار ══════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl" data-testid="dialog-link-whatsapp">
          <DialogHeader>
            <DialogTitle>ربط واتساب</DialogTitle>
            <DialogDescription>
              {justLinked
                ? "تم الربط بنجاح."
                : deepLink
                  ? "اطلب من المريض مسح رمز QR ثم إرسال الرسالة الجاهزة في واتساب مرة واحدة فقط."
                  : "اختر صلة صاحب الرقم بالمريض، ثم أنشئ الرابط."}
            </DialogDescription>
          </DialogHeader>

          {justLinked ? (
            <div className="py-6 text-center space-y-2" data-testid="text-link-success">
              <Check className="w-10 h-10 mx-auto text-emerald-600" />
              <p className="font-semibold text-emerald-700">تم ربط واتساب بالمريض بنجاح.</p>
            </div>
          ) : !deepLink ? (
            <div className="space-y-3 py-2">
              <label className="text-sm font-medium">صلة صاحب الرقم بالمريض</label>
              <Select value={relation} onValueChange={setRelation}>
                <SelectTrigger data-testid="select-relation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} data-testid={`option-relation-${r.value}`}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* الرمز يُبنى من الرابط مباشرةً — بلا خدمة خارجية ولا صورة
                  تُطلب من الإنترنت، فالرابط لا يغادر المتصفّح. */}
              <div className="flex justify-center rounded-xl bg-white p-4 border" data-testid="qr-deep-link">
                <QRCodeSVG value={deepLink} size={220} level="M" includeMargin />
              </div>
              <p className="text-xs text-center text-amber-700 bg-amber-50 rounded-lg py-2 px-3">
                الرابط صالح لمدة 15 دقيقة ويُستخدم مرة واحدة. يجب أن يرسل المريض
                الرسالة الجاهزة بنفسه من رقمه.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={copyLink} data-testid="button-copy-link">
                  {copied ? <Check className="w-4 h-4 ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
                  {copied ? "نُسخ" : "نسخ الرابط"}
                </Button>
                <Button
                  variant="outline" className="flex-1" asChild
                  data-testid="button-open-whatsapp"
                >
                  <a href={deepLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 ml-2" />
                    فتح واتساب
                  </a>
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                بانتظار إرسال المريض لرسالة الربط…
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {!deepLink && !justLinked && (
              <Button
                onClick={() => issue.mutate()}
                disabled={issue.isPending}
                data-testid="button-create-link"
              >
                {issue.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                إنشاء رابط الربط
              </Button>
            )}
            <Button variant="ghost" onClick={() => closeDialog(false)} data-testid="button-close-dialog">
              {justLinked ? "تم" : "إغلاق"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ تأكيد إلغاء الربط ══════════════════════════════════════════ */}
      <AlertDialog
        open={confirmRevokeContact !== null}
        onOpenChange={(open) => !open && setConfirmRevokeContact(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الربط؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتوقّف إرسال تحديثات جهاز المريض إلى هذا الحساب. السجل التاريخي
              يبقى محفوظاً، ويمكن إعادة الربط برابط جديد في أي وقت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">تراجع</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmRevokeContact !== null) revokeContact.mutate(confirmRevokeContact);
                setConfirmRevokeContact(null);
              }}
              data-testid="button-confirm-revoke"
            >
              إلغاء الربط
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
