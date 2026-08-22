// «تواصل المريض» — **سطرُ حالةٍ يُقرأ، لا شاشةُ إعدادٍ تُدار**.
//
// ══ ما كانت وما صارت ════════════════════════════════════════════════════
// كانت بطاقةً كاملة: منتقي صلة، ورمزُ QR، ونسخُ رابط، وفتحُ تطبيق، ومهلةٌ
// تُعدّ، واستطلاعٌ ينتظر أن يضغط المريضُ زرّاً في تطبيقٍ آخر. وكلُّ ذلك كان
// خدمةً لتصميمٍ ألغاه قرارُ المنتج: **حفظُ المريض = واتساب جاهزة**.
//
// فلم يبقَ ما يُدار هنا. الرقمُ في الملفّ، والرايةُ في نموذج التسجيل
// والتعديل، والإرسالُ تلقائيّ. فبقي سطرٌ واحد يجيب سؤالاً واحداً يسأله
// الموظّف فعلاً: **«هل تصله الرسائل؟»**
//
// ولم تُحذف البطاقةُ كلّياً لأن الجواب مطلوب: موظّفٌ يفتح ملفّاً ولا يجد
// ذكراً لواتساب يظنّ الميزةَ غير موجودة، فيتّصل هاتفياً بلا داعٍ.
//
// ══ ولا معرّفَ خارجيّ يُعرَض ════════════════════════════════════════════
// الرقمُ ظاهرٌ أصلاً في بيانات المريض فوق. وإعادةُ عرضه هنا بصيغةٍ دولية
// تُوهم بأنه «رقمُ واتساب» مستقلٌّ عن رقم الملفّ — وهو هو.

import { MessageCircle, Check, BellOff } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface PatientCommunicationCardProps {
  /** `patients.whatsapp_notifications_enabled` كما يصل مع صفّ المريض. */
  enabled?: boolean | null;
  /** هل للملفّ رقمٌ مطبَّع صالح؟ بدونه لا وجهةَ مهما رُفعت الراية. */
  hasPhone?: boolean;
}

export default function PatientCommunicationCard({
  enabled, hasPhone = true,
}: PatientCommunicationCardProps) {
  const on = enabled === true && hasPhone;
  return (
    <Card
      className="p-4 rounded-2xl shadow-sm border-border/60 bg-slate-50/50"
      data-testid="card-communication"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-base flex items-center gap-2 text-sky-700">
          <MessageCircle className="w-4 h-4" />
          واتساب
        </h3>
        {on ? (
          <span
            className="text-sm text-emerald-700 flex items-center gap-1.5"
            data-testid="text-whatsapp-enabled"
          >
            <Check className="w-4 h-4" />
            الإشعارات مفعلة على الرقم المسجل
          </span>
        ) : (
          <span
            className="text-sm text-muted-foreground flex items-center gap-1.5"
            data-testid="text-whatsapp-disabled"
          >
            <BellOff className="w-4 h-4" />
            {hasPhone ? "الإشعارات متوقفة" : "لا يوجد رقم صالح"}
          </span>
        )}
      </div>
      {/* والإدارةُ من مكانٍ واحد: نموذجُ تعديل المريض. فلا زرَّ ثانٍ هنا
          يفعل ما يفعله حقلٌ هناك — وتكرارُ بابِ التعديل يجعل الموظّف
          يتساءل أيُّهما الصحيح. */}
      <p className="text-xs text-muted-foreground mt-2">
        تُدار من «تعديل المريض» مع رقم الاتصال.
      </p>
    </Card>
  );
}
