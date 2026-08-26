import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck, Eye, CheckCircle2, Stethoscope, Undo2, Clock, Building2,
} from "lucide-react";
import { formatDateTimeIraq } from "@/lib/utils";
import { SPECIALTY_COLORS, isMedicalSpecialty, specialtyLabel, sortBySpecialty } from "@shared/medical";
import { componentLabel } from "@shared/prosthetic_parts";
import {
  REVIEW_KIND_LABELS,
  type ReviewDecision, type ReviewKind, type ReviewPath,
} from "@shared/medical_review";

interface ReviewCard {
  id: number;
  patientId: number;
  serviceType: string;
  patientName: string;
  patientCode: string | null;
  patientPhone: string | null;
  branchId: number | null;
  branchName: string | null;
  patientClassification: string | null;
  requestedPath: ReviewPath;
  reviewKind: ReviewKind;
  receptionNote: string | null;
  createdByName: string | null;
  createdAt: string;
  caseDetails: Record<string, any> | null;
  episode: {
    id: number; sequenceNumber: number; status: string;
    /** ما طُلب في الحلقة (ترحيل ٠٦٠) — تُسمّى به الحركةُ بلغة الأرض. */
    requestedItem: string | null;
  } | null;
  workOrder: {
    id: number; purpose: string; status: string; currentStage: string;
    expertUserId: number | null; expertName: string | null;
  } | null;
  visit: { id: number; visitDate: string | null; notes: string | null } | null;
  lastExam: {
    id: number; doctorName: string; createdAt: string;
    diagnosis: string | null; plan: string | null;
  } | null;
}

type Win = "today" | "older";

function accent(caseType: string) {
  return isMedicalSpecialty(caseType)
    ? SPECIALTY_COLORS[caseType]
    : { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", ring: "border-slate-200" };
}

/**
 * **ماذا جرى؟** — سطرٌ واحدٌ بلغة الأرض، لا حالةٌ داخلية.
 *
 * البطاقةُ كانت تعرض `awaiting_exam` و`in_production` كما هي في القاعدة.
 * والمشرفُ الذي يقرأ ذلك لا يعرف ما جرى للمريض — يعرف كيف خزّنه النظام.
 */
function actionLine(r: ReviewCard): string {
  const kind = REVIEW_KIND_LABELS[r.reviewKind] ?? "زيارة";
  if (r.workOrder) {
    if (r.workOrder.purpose === "maintenance") return `${kind} — أمر صيانة`;
    //  ══ **وبيعُ الجزء يُسمّى بيعَ جزء** ═══════════════════════════════════
    //  بيعُ جزءٍ بلا معاينة يُخزَّن `reviewKind = "other"` — وهو الصادقُ في
    //  القاعدة (ليس جهازاً جديداً ولا صيانةً ولا تعديلاً، ولا قيمةَ تُخترَع
    //  له). لكنّ عرضَه «أخرى — أمر تصنيع» لا يقول للمشرف شيئاً.
    //
    //  فالاسمُ يُشتقّ من **العمود المحروس على حلقة الجهاز** المرساة نفسِها
    //  (`patient_device_episodes.requested_item`، ترحيل ٠٦٠) وبالعناوين
    //  المشتركة — **لا من نصٍّ حرٍّ يُنتزَع منه الجزء**. و`componentLabel`
    //  تُرجع `null` للجهاز الكامل، فالبناءُ الكاملُ يبقى على صيغته حرفاً.
    const part = componentLabel(r.episode?.requestedItem);
    if (part) return `بيع جزء من طرف صناعي — ${part}`;
    return `${kind} — أمر تصنيع`;
  }
  if (r.visit) return `${kind} — زيارة`;
  if (r.episode) return `${kind} — طلب جهاز`;
  return kind;
}

/** مَن تولّاه: الخبيرُ المسنَد إن وُجد، وإلّا مَن سجّل الحركة. */
function handledBy(r: ReviewCard): string | null {
  return r.workOrder?.expertName || r.createdByName || null;
}

/**
 * **مراجعة حركة مرضى الأطراف والمساند** — سطحُ إشرافٍ خفيف.
 *
 * ══ ما هذه الصفحة، وما ليست ═══════════════════════════════════════════
 * كانت تُسمّى «مراجعة الطبيب» وتُسمّي فعلَها «موافقة». وهذا **وصفٌ لشيءٍ لا
 * يحدث**: الطلبُ السريع يُنشَأ **بعد** أن تقع الخدمةُ فعلاً — تُفتَح صيانةٌ
 * أو تُسجَّل زيارةٌ ثمّ يُوجَّه الطلب. فلا شيء كان ينتظر إذناً، والكلمةُ
 * «موافقة» تجعل القارئَ يظنّ أنه يفتح باباً مغلقاً.
 *
 * فهي **مراجعةٌ بأثرٍ رجعي**: مَن جاء · وماذا جرى · ومتى · ومَن تولّاه.
 * والمسؤولُ يمرّ على حركة يومه فيؤشّر أنه اطّلع، أو يُعيد ما بياناتُه خطأ.
 *
 * **وبوّابةُ المعاينة الكاملة لم تُمَسّ**: الجهازُ الجديد يستوجب معاينةً
 * موقّعة كما كان، ومكانُها «معايناتي».
 *
 * ══ والبطاقةُ خفيفة عن قصد ═════════════════════════════════════════════
 * كانت تسكب ملفَّ المريض كلَّه: مواصفات الجهاز، ومرحلة الأمر، وتشخيصَ آخر
 * معاينةٍ وخطّتَها. ومَن يمرّ على ثلاثين بطاقةً كهذه لا يقرأ شيئاً. فبقي
 * ما يلزم للتأشير — والتفصيلُ خلف «فتح ملف المريض» بضغطة.
 */
export default function MedicalReview() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [only, setOnly] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [note, setNote] = useState("");
  //  **اليومُ افتراضاً**: شاشةُ عملٍ لا أرشيف. وكومةٌ تاريخيةٌ بلا نهاية
  //  تجعل الصفحةَ تُهجَر، فيضيع المتروكُ فيها.
  const [win, setWin] = useState<Win>("today");

  const { data, isLoading } = useQuery<{
    rows: ReviewCard[]; awaitingFull?: ReviewCard[]; specialties: string[];
    canSupervise: boolean; canDecide: boolean;
  }>({
    queryKey: ["/api/medical-review/queue", win],
    queryFn: async () => {
      const res = await fetch(`/api/medical-review/queue?window=${win}`, { credentials: "include" });
      if (!res.ok) return { rows: [], specialties: [], canSupervise: false, canDecide: false };
      return res.json();
    },
  });

  const rows = data?.rows ?? [];
  const awaitingFull = data?.awaitingFull ?? [];

  //  ══ إرجاعُ طلبِ معاينةٍ كاملة — بسببٍ إلزاميّ ═══════════════════════
  const [returning, setReturning] = useState<ReviewCard | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);

  const submitReturn = async () => {
    const reason = returnReason.trim();
    if (!returning || !reason) return;
    setReturnBusy(true);
    try {
      const res = await fetch(`/api/medical-review/requests/${returning.id}/return`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "تعذّر إرجاع الطلب");
      qc.invalidateQueries({ queryKey: ["/api/medical-review/queue"] });
      qc.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      qc.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      setReturning(null);
      setReturnReason("");
      toast({
        title: "أُعيد إلى الاستعلامات",
        description: "خرج من قائمة الطبيب — ويستطيع الاستعلامات تصحيح البيانات وإرسال طلبٍ جديد.",
      });
    } catch (e: any) {
      toast({ title: "خطأ", description: e?.message, variant: "destructive" });
    } finally {
      setReturnBusy(false);
    }
  };
  const canSupervise = data?.canSupervise === true;
  const canDecide = data?.canDecide === true;
  const specialties = useMemo(
    () => sortBySpecialty(data?.specialties ?? [], (s) => s),
    [data?.specialties],
  );

  const filtered = useMemo(
    () => sortBySpecialty(
      rows.filter((r) => (only ? r.serviceType === only : true)),
      (r) => r.serviceType,
    ),
    [rows, only],
  );

  const decide = useMutation({
    mutationFn: async (v: { id: number; decision: ReviewDecision; doctorNote?: string }) => {
      const res = await fetch(`/api/medical-review/requests/${v.id}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision: v.decision, doctorNote: v.doctorNote ?? null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "تعذّر حفظ القرار");
      return body;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["/api/medical-review/queue"] });
      //  الإحالة تُدخل الملفّ طابورَ المعاينة القائم، فتُحدَّث شاشاته أيضاً.
      qc.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      qc.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      setOpenNote(null);
      setNote("");
      toast({
        title: v.decision === "approve" ? "تمت المراجعة"
          : v.decision === "require_full_exam" ? "أُحيل إلى معاينة كاملة"
            : "أُعيد إلى الاستعلامات",
      });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message, variant: "destructive" }),
  });

  const act = (id: number, decision: ReviewDecision) =>
    decide.mutate({ id, decision, doctorNote: openNote === id ? note.trim() || undefined : undefined });

  //  **والإرجاعُ لا يقع بلا سبب**: البطاقةُ التي ترجع بلا سببٍ تُقرأ
  //  «أُعيدت» ولا يعرف الموظّفُ ماذا يصحّح. والخادمُ يفرضها أيضاً.
  const askReturn = (id: number) => {
    if (openNote !== id || !note.trim()) {
      setOpenNote(id);
      toast({
        title: "اكتب سبب الإرجاع",
        description: "ما الذي يصحّحه الاستعلامات قبل إعادة الإرسال؟",
      });
      return;
    }
    act(id, "return_to_reception");
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> مراجعة حركة مرضى الأطراف والمساند
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          مَن جاء، وماذا جرى، ومتى، ومَن تولّاه — للاطّلاع والتأشير.
          <span className="font-medium"> ليست موافقةً سابقةً لتنفيذ الخدمة</span>: الحركةُ
          وقعت، وهذه مراجعتُها.
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          أمّا الجهازُ الجديد وكلُّ ما يستوجب معاينةً كاملة فيصل
          <span className="font-medium"> «معايناتي» </span>وينتهي بتوقيع معاينة — بلا تغيير.
        </p>
      </div>

      {/* ══ اليومُ أوّلاً، وبابٌ واحدٌ للمتروك قبله ═══════════════════════ */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Button
          size="sm" variant={win === "today" ? "default" : "outline"} className="h-8 text-xs"
          onClick={() => { setWin("today"); setOnly(null); }} data-testid="review-window-today"
        >
          اليوم
        </Button>
        <Button
          size="sm" variant={win === "older" ? "default" : "outline"} className="h-8 text-xs"
          onClick={() => { setWin("older"); setOnly(null); }} data-testid="review-window-older"
        >
          غير مراجعة سابقة
        </Button>
      </div>

      {specialties.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Button
            size="sm" variant={only === null ? "default" : "outline"} className="h-8 text-xs"
            onClick={() => setOnly(null)} data-testid="filter-review-all"
          >
            الكل ({rows.length})
          </Button>
          {specialties.map((sp) => (
            <Button
              key={sp} size="sm" variant={only === sp ? "default" : "outline"}
              className="h-8 text-xs gap-1.5"
              onClick={() => setOnly(only === sp ? null : sp)}
              data-testid={`filter-review-${sp}`}
            >
              <span className={`w-2 h-2 rounded-full ${accent(sp).dot}`} />
              {specialtyLabel(sp)} ({rows.filter((r) => r.serviceType === sp).length})
            </Button>
          ))}
        </div>
      )}

      {/* ══ **طلباتُ معاينةٍ كاملة بانتظار الطبيب** ═══════════════════════
          قسمٌ صغير للإشراف: مديرُ الفرع لا تصله «معايناتي» (تُبنى من
          اختصاصات الطبيب فتخرج فارغةً له)، فكان يملك قدرةَ الإرجاع بلا بابٍ
          يصله. وفتحُ «معايناتي» له كان سيضعه أمام زرِّ «كتابة معاينة» — وهو
          ما لا يجوز. **فلا زرَّ معاينةٍ هنا ولا توقيع**: قراءةٌ وإرجاعٌ فقط. */}
      {canSupervise && awaitingFull.length > 0 && (
        <div className="mb-5" data-testid="awaiting-full-section">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-muted-foreground" />
            طلبات معاينة كاملة بانتظار الطبيب
            <span className="text-xs font-normal text-muted-foreground">({awaitingFull.length})</span>
          </h2>
          <div className="space-y-2">
            {awaitingFull.map((r) => (
              <Card key={r.id} className="border-slate-200" data-testid={`awaiting-full-${r.id}`}>
                <CardContent className="p-3 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Link href={`/patients/${r.patientId}`}>
                      <span className="font-medium text-sm hover:underline cursor-pointer">
                        {r.patientName}
                      </span>
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-muted-foreground">
                      {r.patientCode && <span className="font-mono">{r.patientCode}</span>}
                      {r.branchName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{r.branchName}
                        </span>
                      )}
                      <span>{specialtyLabel(r.serviceType)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDateTimeIraq(r.createdAt)}
                      </span>
                      {r.createdByName && <span>أرسله {r.createdByName}</span>}
                    </div>
                    {r.receptionNote && (
                      <p className="text-[11px] text-muted-foreground mt-1" dir="auto"
                        style={{ unicodeBidi: "plaintext" }}>{r.receptionNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/patients/${r.patientId}`}>
                      <Button size="sm" variant="ghost" className="h-8 text-xs gap-1"
                        data-testid={`awaiting-open-${r.id}`}>
                        <Eye className="w-3.5 h-3.5" /> فتح ملف المريض
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                      onClick={() => { setReturning(r); setReturnReason(""); }}
                      data-testid={`awaiting-return-${r.id}`}>
                      <Undo2 className="w-3.5 h-3.5" /> إرجاع للاستعلامات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
          {win === "today" ? "لا حركة بانتظار المراجعة اليوم." : "لا متروكَ من الأيام السابقة."}
        </CardContent></Card>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => {
            const a = accent(r.serviceType);
            const who = handledBy(r);
            return (
              <Card key={r.id} className={`border ${a.ring}`} data-testid={`review-card-${r.id}`}>
                <CardContent className="p-3.5 space-y-2">
                  {/* ── مَن · ماذا · متى · مَن تولّاه ────────────────── */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link href={`/patients/${r.patientId}`}>
                        <span className="font-bold text-sm hover:underline cursor-pointer">
                          {r.patientName}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-muted-foreground">
                        {r.patientCode && <span className="font-mono">{r.patientCode}</span>}
                        {r.branchName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{r.branchName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDateTimeIraq(r.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded border shrink-0 ${a.badge}`}>
                      {specialtyLabel(r.serviceType)}
                    </span>
                  </div>

                  <div className="text-xs" data-testid={`review-action-${r.id}`}>
                    <span className="font-medium">{actionLine(r)}</span>
                    {who && <span className="text-muted-foreground"> · {who}</span>}
                  </div>

                  {r.receptionNote && (
                    <p className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1"
                      dir="auto" style={{ unicodeBidi: "plaintext" }}>
                      {r.receptionNote}
                    </p>
                  )}

                  {/* ── التأشير ─────────────────────────────────────── */}
                  {canSupervise ? (
                    <div className="border-t pt-2.5 space-y-2">
                      {openNote === r.id && (
                        <Textarea
                          value={note} onChange={(e) => setNote(e.target.value)}
                          placeholder="ملاحظة — وسببُ الإرجاع إن كنت تُرجِع (مثال: جهة البتر غير صحيحة، عدّلها وأعد الإرسال)"
                          rows={2} className="text-xs"
                          data-testid={`review-note-${r.id}`}
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm" className="h-8 text-xs gap-1.5" disabled={decide.isPending}
                          onClick={() => act(r.id, "approve")}
                          data-testid={`review-approve-${r.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> تمت المراجعة
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                          disabled={decide.isPending}
                          onClick={() => { setOpenNote(openNote === r.id ? null : r.id); setNote(""); }}
                          data-testid={`review-note-toggle-${r.id}`}
                        >
                          {openNote === r.id ? "إخفاء الملاحظة" : "إضافة ملاحظة"}
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                          disabled={decide.isPending}
                          onClick={() => askReturn(r.id)}
                          data-testid={`review-return-${r.id}`}
                        >
                          <Undo2 className="w-3.5 h-3.5" /> إرجاع للاستعلامات
                        </Button>
                        <Link href={`/patients/${r.patientId}`}>
                          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5"
                            data-testid={`review-open-${r.id}`}>
                            <Eye className="w-3.5 h-3.5" /> فتح ملف المريض
                          </Button>
                        </Link>
                        {/*  **قرارٌ سريريّ لا إشرافيّ**: يقول إن هذه الحالة
                            تحتاج فحصَ طبيب. فيبقى لمن يملك التوقيع وحده —
                            والمشرفُ الإداريّ لا يراه ولا يستطيعه. */}
                        {canDecide && (
                          <Button
                            size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-muted-foreground"
                            disabled={decide.isPending}
                            onClick={() => act(r.id, "require_full_exam")}
                            data-testid={`review-escalate-${r.id}`}
                          >
                            <Stethoscope className="w-3.5 h-3.5" /> يتطلّب معاينة كاملة
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-2 text-[11px] text-muted-foreground">
                      المراجعة الإشرافية للمسؤول أو مدير الفرع أو طبيب الاختصاص — يمكنك القراءة فقط.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══ إرجاعُ طلبِ معاينةٍ كاملة — بسببٍ إلزاميّ ═══════════════════ */}
      <Dialog open={!!returning} onOpenChange={(o) => { if (!o) { setReturning(null); setReturnReason(""); } }}>
        <DialogContent dir="rtl" className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base">إرجاع الطلب إلى الاستعلامات</DialogTitle>
            <DialogDescription className="text-xs">
              {returning?.patientName} — {returning ? specialtyLabel(returning.serviceType) : ""}.
              يخرج من قائمة الطبيب، <b>ولا تُكتب معاينةٌ ولا تُحذف</b>، ويستطيع
              الاستعلامات تصحيح البيانات وإرسال طلبٍ جديد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              سبب الإرجاع <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={returnReason} onChange={(e) => setReturnReason(e.target.value)}
              rows={3} className="text-sm"
              placeholder="مثال: جهة البتر غير صحيحة — عدّلها وأعد إرسال الطلب"
              data-testid="awaiting-return-reason"
            />
            <p className="text-[11px] text-muted-foreground">
              يُحفظ في السجلّ مع اسمك ووقته، ويقرؤه موظّف الاستعلامات ليعرف ماذا يصحّح.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm"
              onClick={() => { setReturning(null); setReturnReason(""); }}>
              إلغاء
            </Button>
            <Button size="sm" disabled={!returnReason.trim() || returnBusy}
              onClick={submitReturn} data-testid="awaiting-return-confirm">
              <Undo2 className="w-3.5 h-3.5 ml-1" /> إرجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
