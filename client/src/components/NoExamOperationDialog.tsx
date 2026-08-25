// **عمليةٌ بلا معاينة** — نافذةُ الاستقبال الواحدة.
//
// ══ القاعدةُ الحاكمة ═══════════════════════════════════════════════════
// **العمليةُ تمضي. والمالُ لا يدخل المحاسبة حتى يعتمده طبيبٌ مخوَّل.**
//
// ══ وخطواتٌ قليلة عن قصد ═══════════════════════════════════════════════
// ماذا جرى؟ (بيعُ جزءٍ أم صيانة) · على أيّ جهاز · بكم · ثمّ حفظ. خمسون
// مريضاً في اليوم لا يمرّون بنموذجٍ طويل، ونموذجٌ طويل يُملأ بلا قراءة.
//
// ══ ولا قائمةَ أجزاءٍ ثانية ════════════════════════════════════════════
// الأجزاءُ من `shared/prosthetic_parts` وحدها — القائمةُ التي يبيع بها
// النظامُ ويُصان بها منذ ترحيل ٠٦٠. وقائمتان كانتا ستنحرفان: يُضاف
// «الأدابتر» إلى إحداهما فتُصان قطعةٌ لا تُباع. **والمساندُ الطبية بلا
// أجزاء** — لا تُخترَع لها قائمةٌ لم يقلها أحد.
//
// ══ والطرفُ الكاملُ ليس من هذا الباب ═══════════════════════════════════
// الجزءُ بديلٌ لقطعةٍ وُصفت يوماً — قالبٌ يبلى أو ركبةٌ تنكسر. أمّا **الطرفُ
// الكاملُ فقرارٌ سريريٌّ من أوّله**: مستوى البتر والمفصلُ والقدمُ والمقاس.
// فلا يُعرَض هنا إطلاقاً، **والخادمُ يردّه** ولو لُفِّق طلبٌ يتجاوز الشاشة.
// **والمسندُ الكاملُ يبقى** — لا قائمةَ أجزاءٍ قانونيةً للمساند بعد.
//
// ══ ومنشأُ الجهاز ثلاثةٌ لا اثنان ══════════════════════════════════════
// «صنعناه ولم نسجّله» **ليس** «صُنع خارج المركز». وخيارٌ واحد يجمعهما كان
// يصف عملَنا بأنه عملُ غيرنا في كلّ تقريرِ ضمانٍ لاحق.
//
// ══ والصفرُ ليس «مجّاناً» ═══════════════════════════════════════════════
// مربّعُ «بلا أجور» صريحٌ. فالعمليةُ بلا أجرٍ تُحفَظ وتنتهي **بلا صفٍّ
// معلَّق ولا اعتمادٍ مسرحيّ**، والمبلغُ الحاضر موجبٌ دائماً.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Wallet } from "lucide-react";
import {
  PROSTHETIC_COMPONENTS, COMPONENT_LABELS, FULL_DEVICE, FULL_DEVICE_LABELS,
} from "@shared/prosthetic_parts";
import {
  DEVICE_ORIGINS, DEVICE_ORIGIN_LABELS, DEVICE_ORIGIN_HINTS, originHasEpisode,
  type DeviceOrigin,
} from "@shared/device_origin";
import {
  PENDING_CHARGE_KIND_LABELS, SAVED_PENDING_MESSAGE, SAVED_NO_CHARGE_MESSAGE,
  type PendingChargeKind,
} from "@shared/pending_charge";
import { useDeviceEpisodes, describeEpisode } from "./DeviceEpisodeSelect";

type Service = "prosthetic" | "medical_support";
/** نفسُ نوعِ العملية القانونيّ — بلا نسخةٍ محلّية منه. */
type Kind = PendingChargeKind;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  branchId: number;
  serviceType: Service;
  /** حلقةٌ قائمة على مسار «بلا معاينة» — فتُسجَّل عليها هي ولا تُفتَح ثانية. */
  existingEpisodeId?: number | null;
  /** الطلبُ المسجَّل على تلك الحلقة — يُعرَض ولا يُسأل عنه ثانيةً. */
  existingRequestedItem?: string | null;
  /**
   * **«نوع العملية» محسومٌ قبل فتح النافذة** — من مُوجِّه «ما سبب حضور
   * المريض اليوم؟» بعد التسجيل مثلاً. يُعطَّل معه المحدِّدُ فلا يُعاد
   * سؤالٌ أجاب عنه اختيارُ الزرّ بعينه — نفسُ منطق `existingEpisodeId`
   * أدناه بالضبط، لسببٍ مختلف.
   */
  initialKind?: Kind;
}

export function NoExamOperationDialog({
  open, onOpenChange, patientId, branchId, serviceType,
  existingEpisodeId = null, existingRequestedItem = null, initialKind,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(
    initialKind ?? (existingEpisodeId ? "device_sale" : "maintenance"));
  const [requestedItem, setRequestedItem] = useState<string>(
    existingRequestedItem ?? (serviceType === "prosthetic" ? "" : FULL_DEVICE));
  const [component, setComponent] = useState<string>("");
  const [expertId, setExpertId] = useState<string>("");
  /** **بلا افتراض**: المنشأُ يُسأل ولا يُخمَّن — ولا يُقرأ من تاريخ المريض. */
  const [origin, setOrigin] = useState<"" | DeviceOrigin>("");
  const [target, setTarget] = useState<string>("");
  const [charged, setCharged] = useState(true);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  const { data: experts = [] } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", branchId],
    enabled: open && Boolean(branchId),
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${branchId}`,
        { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر تحميل الخبراء");
      return res.json();
    },
  });

  //  أجهزةُ الصيانة: المسلَّمُ وحدَه — وما لم يُسلَّم بعد ليس محلَّ صيانة.
  const { options: devices } = useDeviceEpisodes(
    open ? patientId : undefined, serviceType, ["delivered"]);

  //  ══ **كلُّ ما تغيّر يُحدَّث — لا بعضُه** ═══════════════════════════════
  //  العمليةُ تفتح أمرَ تصنيعٍ فوراً، وبطاقةُ التصنيع في صفحة المريض تقرأ
  //  مفتاحاً **خاصّاً بالمريض** (`/api/manufacturing/patient/:id/orders`).
  //  وكان التحديثُ يمسّ القائمةَ العامّة وحدها، فيحفظ الموظّفُ العمليةَ
  //  ولا يرى أمرَها حتى يحدّث المتصفّح بيده — فيظنّها لم تقع فيعيدها.
  //
  //  والحلقةُ تنتقل من «بانتظار معاينة» إلى التصنيع، فتتغيّر معها شارةُ
  //  الانتظار — ومفتاحُها يُحدَّث كذلك.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/device-episodes`] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/pending-charges`] });
    qc.invalidateQueries({ queryKey: ["/api/no-exam/review"] });
    qc.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
    qc.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/orders`] });
    qc.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/summary`] });
    qc.invalidateQueries({ queryKey: ["/api/medical/pending"] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
    qc.invalidateQueries({ queryKey: ["/api/patients"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const money = charged ? { charged: true, amount } : { charged: false };
      if (kind === "maintenance") {
        const res = await apiRequest("POST", "/api/no-exam/maintenance", {
          patientId, serviceType, expertUserId: Number(expertId),
          maintenanceComponent: serviceType === "prosthetic" ? component : null,
          deviceOrigin: origin,
          deviceEpisodeId: origin === "registered" && target ? Number(target) : null,
          note: note.trim() || null, ...money,
        });
        return res.json();
      }
      //  **بيعٌ بلا معاينة**: يُفتَح الطلبُ بالباب القائم (`device-episodes`)
      //  بمساره الصريح، ثمّ يُسجَّل مبلغُه المعلَّق. **ولا بابَ ثالث** يفتح
      //  حلقةً بنفسه فينحرف عن حُرّاس الأوّل.
      let episodeId = existingEpisodeId;
      if (!episodeId) {
        const ep = await apiRequest("POST", `/api/patients/${patientId}/device-episodes`, {
          serviceType, requestedItem: requestedItem || FULL_DEVICE, servicePath: "no_exam",
        });
        episodeId = (await ep.json())?.id ?? null;
      }
      if (!episodeId) throw new Error("تعذّر فتح طلب الجهاز");
      const res = await apiRequest("POST", "/api/no-exam/device-sale", {
        patientId, serviceType, deviceEpisodeId: episodeId,
        expertUserId: Number(expertId), note: note.trim() || null, ...money,
      });
      return res.json();
    },
    onSuccess: (d: any) => {
      invalidate();
      onOpenChange(false);
      toast({
        title: d?.charge ? SAVED_PENDING_MESSAGE : SAVED_NO_CHARGE_MESSAGE,
        description: d?.charge
          ? "بدأ العمل وأمرُ التصنيع مفتوح. والمبلغ لم يُقيَّد بعد — يظهر الآن في طابور مراجعة الطبيب."
          : "بدأ العمل وأمرُ التصنيع مفتوح، بلا أجور — فلا مبلغ ينتظر مراجعة.",
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر الحفظ", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  const missingItem = kind === "device_sale" && serviceType === "prosthetic"
    && !existingEpisodeId && !requestedItem;
  const missingComponent = kind === "maintenance" && serviceType === "prosthetic" && !component;
  //  المسجَّلُ وحده يحتاج جهازاً بعينه — والآخران بلا حلقة، فلا يُسألان عنها.
  const missingTarget = kind === "maintenance"
    && (!origin || (originHasEpisode(origin) && !target));
  const ready = Boolean(expertId) && !missingItem && !missingComponent && !missingTarget
    && (!charged || amount > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> عملية بلا معاينة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm bg-sky-50 border border-sky-200 rounded-md px-3 py-2"
            data-testid="no-exam-op-rule">
            <b>يبدأ العمل الآن</b> — يُفتَح أمر التصنيع ويُسنَد للخبير فوراً.
            {" "}<b>والمبلغ وحده ينتظر</b> مراجعة طبيبٍ مخوَّل: لا كلفةَ على
            المريض ولا قيدَ ولا تقرير حتى يعتمده.
          </p>

          {/* ── ماذا جرى؟ ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">نوع العملية</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}
              disabled={Boolean(existingEpisodeId) || initialKind !== undefined}>
              <SelectTrigger data-testid="no-exam-op-kind">
                <SelectValue placeholder="اختر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="device_sale">
                  {PENDING_CHARGE_KIND_LABELS.device_sale} — جزء أو جهاز
                </SelectItem>
                <SelectItem value="maintenance">
                  {PENDING_CHARGE_KIND_LABELS.maintenance} — إصلاح جهاز قائم
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── البيع: ما المطلوب؟ ── */}
          {kind === "device_sale" && (
            existingEpisodeId ? (
              <p className="text-sm text-muted-foreground" data-testid="no-exam-op-existing">
                الطلب القائم: <b>{existingRequestedItem
                  && existingRequestedItem !== FULL_DEVICE
                  ? COMPONENT_LABELS[existingRequestedItem as keyof typeof COMPONENT_LABELS]
                  : FULL_DEVICE_LABELS[serviceType]}</b>
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">ما الذي بيع؟</Label>
                {serviceType === "prosthetic" && (
                  <p className="text-xs text-muted-foreground"
                    data-testid="no-exam-op-item-hint">
                    الأجزاء وحدها من هنا — <b>الطرف الصناعي الكامل يحتاج معاينة
                    الطبيب</b> ويُفتَح من «طرف صناعي جديد».
                  </p>
                )}
                <Select value={requestedItem} onValueChange={setRequestedItem}
                  disabled={serviceType !== "prosthetic"}>
                  <SelectTrigger data-testid="no-exam-op-item">
                    <SelectValue placeholder="اختر الجزء أو الجهاز الكامل" />
                  </SelectTrigger>
                  <SelectContent>
                    {/*  **والطرفُ الكاملُ ليس من هذا الباب**: قرارٌ سريريٌّ
                        من أوّله، فيبقى للمساند وحدها حيث لا أجزاءَ لها. */}
                    {serviceType === "medical_support" && (
                      <SelectItem value={FULL_DEVICE}>
                        {FULL_DEVICE_LABELS.medical_support}
                      </SelectItem>
                    )}
                    {/*  **الأجزاءُ للأطراف وحدها** — ولا تُخترَع للمساند. */}
                    {serviceType === "prosthetic" && PROSTHETIC_COMPONENTS.map((c) => (
                      <SelectItem key={c} value={c}>{COMPONENT_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          )}

          {/* ── الصيانة: أيّ جزء وأيّ جهاز؟ ── */}
          {kind === "maintenance" && (
            <>
              {serviceType === "prosthetic" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الجزء المراد صيانته</Label>
                  <Select value={component} onValueChange={setComponent}>
                    <SelectTrigger data-testid="no-exam-op-component">
                      <SelectValue placeholder="اختر الجزء" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROSTHETIC_COMPONENTS.map((c) => (
                        <SelectItem key={c} value={c}>{COMPONENT_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/*  **منشأُ الجهاز — ثلاثُ حقائق لا اثنتان.** «صنعناه ولم
                  نسجّله» ليس «صُنع خارج المركز»، ودمجُهما كان يصف عملَنا
                  بأنه عملُ غيرنا. ولا يُستنتَج من تاريخ المريض. */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">منشأ الجهاز المُصان</Label>
                <Select value={origin}
                  onValueChange={(v) => { setOrigin(v as DeviceOrigin); setTarget(""); }}>
                  <SelectTrigger data-testid="no-exam-op-origin">
                    <SelectValue placeholder="اختر منشأ الجهاز" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_ORIGINS.map((o) => (
                      <SelectItem key={o} value={o}
                        disabled={o === "registered" && devices.length === 0}>
                        {DEVICE_ORIGIN_LABELS[o]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {origin && (
                  <p className="text-xs text-muted-foreground"
                    data-testid={`no-exam-op-origin-hint-${origin}`}>
                    {DEVICE_ORIGIN_HINTS[origin]}
                  </p>
                )}
                {origin !== "registered" && origin !== "" && (
                  <p className="text-xs text-muted-foreground">
                    لا سجلّ لهذا الجهاز عندنا — <b>ولا يُخترَع له أمر تصنيع ولا
                    تسليم لم يقع</b>. تُسجَّل الصيانة وحدها.
                  </p>
                )}
              </div>

              {/*  **والمسجَّلُ وحده يُسأل عن جهازه بعينه.** */}
              {origin === "registered" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الجهاز المسجَّل</Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger data-testid="no-exam-op-target">
                      <SelectValue placeholder="اختر الجهاز" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{describeEpisode(e)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* ── مَن ينفّذ ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">الخبير المسؤول</Label>
            <Select value={expertId} onValueChange={setExpertId}>
              <SelectTrigger data-testid="no-exam-op-expert">
                <SelectValue placeholder="اختر الخبير" />
              </SelectTrigger>
              <SelectContent>
                {experts.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── المبلغ ── */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!charged}
              onChange={(e) => { setCharged(!e.target.checked); if (e.target.checked) setAmount(0); }}
              data-testid="no-exam-op-no-charge" />
            <b>بلا أجور</b>
            <span className="text-muted-foreground">
              — يبدأ العمل ويكتمل تسجيله، بلا مبلغ ولا مراجعة
            </span>
          </label>

          {charged && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">المبلغ (د.ع)</Label>
              <MoneyInput value={amount} onValueChange={setAmount} data-testid="no-exam-op-amount" />
              {!(amount > 0) && (
                <p className="text-xs text-destructive" data-testid="no-exam-op-amount-error">
                  المبلغ يجب أن يكون أكبر من صفر — والعملية بلا أجر تُحفَظ بمربّع «بلا أجور».
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ملاحظة (اختياري)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="ما يحتاج الطبيب أن يعرفه عن المبلغ"
              data-testid="no-exam-op-note" />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!ready || save.isPending} data-testid="no-exam-op-submit"
            onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ العملية"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
