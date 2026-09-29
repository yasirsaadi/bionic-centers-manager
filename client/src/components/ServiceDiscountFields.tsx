import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgePercent, HeartHandshake } from "lucide-react";
import {
  computeServiceDiscount, DISCOUNT_REASONS, DISCOUNT_REASON_LABELS,
  FREE_DONATION_LABEL, type DiscountReason,
} from "@shared/discount";
import {
  EMPTY_DISCOUNT, discountBlocked, discountPayload, hasDiscount, paymentEntryRequired,
  type DiscountDraft,
} from "@/components/service_discount_ui";

//  تُصدَّر من هنا كذلك فلا تتغيّر مساراتُ الاستيراد في الشاشات الثلاث.
export { EMPTY_DISCOUNT, discountBlocked, discountPayload, hasDiscount, paymentEntryRequired };
export type { DiscountDraft };

// حقولُ الخصم والتبرّع — **مكوِّنٌ واحدٌ للشاشات الثلاث**.
//
// ══ لماذا واحدٌ لا ثلاثة ════════════════════════════════════════════════
// «الكلفة والجلسات» و«تخصيص وإسناد خبير» و«تأكيد الشراء» ثلاثُ شاشاتٍ
// مختلفة، لكنّ السؤال فيها واحد: **بكم نبيع ولماذا خفّضنا؟** ونسخُ الحقول
// ثلاث مرّات كان يعني أن تصحيحاً في إحداها يُنسى في الأخريين — وقد وقع في
// هذا الريبو من قبل مع حقول المواصفات (٦ ملفّات) حتى جُمعت في
// `shared/case_fields`.
//
// ══ والحسابُ ليس هنا ════════════════════════════════════════════════════
// `computeServiceDiscount` في `shared/` هي الحاكمة، والخادمُ يناديها نفسَها
// على الطلب. فما يراه الموظّف هو ما يُحفَظ بالضبط — لا حسابٌ في الشاشة
// وآخرُ في الخادم ينحرفان يوماً.

export function ServiceDiscountFields({
  originalPrice, value, onChange, disabled, testIdPrefix = "discount",
}: {
  /** السعرُ قبل الخصم — يحسبه صاحبُ الشاشة، والخادمُ يعيد حسابه. */
  originalPrice: number;
  value: DiscountDraft;
  onChange: (next: DiscountDraft) => void;
  disabled?: boolean;
  testIdPrefix?: string;
}) {
  const set = (patch: Partial<DiscountDraft>) => onChange({ ...value, ...patch });
  const active = hasDiscount(value, originalPrice);
  const calc = computeServiceDiscount({
    originalPrice, finalPrice: value.finalPrice, isFree: value.isFree,
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2.5"
      data-testid={`${testIdPrefix}-block`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <BadgePercent className="w-4 h-4" />
        خصم أو خدمة مجّانية <span className="text-xs font-normal text-muted-foreground">(اختياري)</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">السعر الأصلي</span>
        <span className="font-mono font-semibold" data-testid={`${testIdPrefix}-original`}>
          {originalPrice.toLocaleString("en-US")} د.ع
        </span>
      </div>

      {/* **المجّانيُّ صريحٌ لا مستنتَج**: الصفرُ في هذا النظام يعني «غير
          مسعَّر» في مسارات الأجهزة، فلا يُقرأ تبرّعاً بالصمت. */}
      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input type="checkbox" className="mt-1" checked={value.isFree} disabled={disabled}
          onChange={(e) => set({ isFree: e.target.checked, finalPrice: e.target.checked ? 0 : null })}
          data-testid={`${testIdPrefix}-free`} />
        <span className="flex items-center gap-1.5">
          <HeartHandshake className="w-4 h-4 text-emerald-700" />
          <b>مجاني ({FREE_DONATION_LABEL})</b>
        </span>
      </label>

      {!value.isFree && (
        <div className="space-y-1">
          <label className="text-sm font-medium">السعر بعد الخصم</label>
          <MoneyInput
            value={value.finalPrice ?? originalPrice}
            onValueChange={(v) => set({ finalPrice: v })}
            placeholder={String(originalPrice)}
            data-testid={`${testIdPrefix}-final`}
          />
          <p className="text-xs text-muted-foreground">
            اتركه كما هو إن لم يكن هناك خصم — يمضي البيع مباشرةً بلا اعتماد.
          </p>
        </div>
      )}

      {active && (
        <>
          {calc.ok ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              data-testid={`${testIdPrefix}-summary`}>
              {value.isFree ? (
                <>خدمة <b>مجّانية</b> — تبرّع بقيمة{" "}
                  <b className="font-mono">{originalPrice.toLocaleString("en-US")}</b> د.ع.</>
              ) : (
                <>خصم <b className="font-mono">{calc.discountAmount.toLocaleString("en-US")}</b> د.ع
                  {" "}(<b>{calc.discountPercentage}%</b>) — السعر النهائي{" "}
                  <b className="font-mono">{calc.finalPrice.toLocaleString("en-US")}</b> د.ع.</>
              )}
              {" "}يُطبَّق السعر المتفق عليه مباشرةً عند الحفظ.
            </div>
          ) : (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
              data-testid={`${testIdPrefix}-error`}>
              {calc.error}
            </div>
          )}

          {/* **سببٌ منظَّم لا نصٌّ حرّ**: تقريرُ «كم خصمنا ولماذا» لا يُجمَع
              من عشرين صياغةً كتبها عشرون موظّفاً. والتبرّعُ سببُه ثابتٌ
              يكتبه النظام، فلا يُسأل عنه هنا. */}
          {!value.isFree && (
            <div className="space-y-1">
              <label className="text-sm font-medium">سبب الخصم <span className="text-red-500">*</span></label>
              <Select value={value.reason} disabled={disabled}
                onValueChange={(v) => set({ reason: v as DiscountReason })}>
                <SelectTrigger data-testid={`${testIdPrefix}-reason`}>
                  <SelectValue placeholder="اختر السبب" />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{DISCOUNT_REASON_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">ملاحظة (اختياري)</label>
            <Input value={value.note} disabled={disabled}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="تفصيلٌ إضافيّ (اختياري)"
              data-testid={`${testIdPrefix}-note`} />
          </div>
        </>
      )}
    </div>
  );
}

