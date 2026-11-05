// **شرائطُ الدفعة الكبيرة — العقدُ بين الخادم والواجهة** (طلبُ المالك ٢٠٢٦-١١-٠٦، §4.ga).
//
// قولُ المالك: «حين يقوم أيُّ موظّفٍ بإدخال مبلغٍ مدفوع ٣٥٠ ألفاً وما فوقه ويضغط "تم الدفع" تظهر له شرائطُ ملوّنة … تحفيزٌ وبهجة»،
// واختار من المعاينة «انفجاراً من الزرّ»، ولكلّ دفعة، ومن كلّ بابٍ يسجّل مبلغاً مدفوعاً من مريض، وله هو أيضاً.
//
// • كلُّ دفعةٍ جديدة تمرّ بـ`storage.createPayment` — وهي تسجّل مبلغَها الموجب في سياق الطلب (`server/payments/big_payment_notice.ts`).
// • **وعند الردّ الناجح وحده** تُكتب الترويسةُ أدناه إن بلغ ما سُجّل في هذا الطلب الحدّ؛ والواجهةُ (`client/src/main.tsx`) تطلق الشرائط.
//   فدفعةٌ فشلت أو تراجعت معاملتُها لا شرائطَ لها، ولا تحتاج كلُّ شاشةٍ كوداً خاصّاً، ولا يفوت بابٌ جديد.
// • **والضغطةُ الواحدة دفعةٌ واحدة**: ما يقسمه الخادمُ على أكثر من سطرٍ في حفظٍ واحد (بيعُ جهازين مثلاً) يُجمع — فالموظّفُ كتب مبلغاً واحداً.
// • والاسترجاعُ (دفعةٌ سالبة بكاتبها الخاصّ) والتسليمُ والمصروفُ خارجها.

export const BIG_PAYMENT_THRESHOLD = 350_000;
export const BIG_PAYMENT_HEADER = "X-Big-Payment";
/** مدّةُ الشرائط على الشاشة — كما في المعاينة التي اختارها المالك. */
export const BIG_PAYMENT_FX_MS = 3500;

export interface BigPaymentNotice {
  /** مجموعُ ما دُفع في هذا الحفظ. */
  amount: number;
  /** اسمُ الموظّف للتهنئة — من الجلسة. */
  name: string | null;
}

export function isBigPayment(amount: number): boolean {
  return Number.isFinite(amount) && amount >= BIG_PAYMENT_THRESHOLD;
}

/** كلّما كبر المبلغ زادت الشرائط (خيارُ المعاينة الذي أبقاه المالك). */
export function bigPaymentIntensity(amount: number): number {
  return amount >= 2_000_000 ? 1.8 : amount >= 1_000_000 ? 1.4 : 1;
}

/** الترويسةُ نصٌّ لاتينيّ — فالعربيةُ تُرمَّز. */
export function encodeBigPayment(n: BigPaymentNotice): string {
  return encodeURIComponent(JSON.stringify({ amount: Math.round(n.amount), name: n.name }));
}

/** قراءةٌ لا ترمي: ترويسةٌ تالفة أو دون الحدّ ⟵ لا شيء. */
export function decodeBigPayment(raw: string | null | undefined): BigPaymentNotice | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    const amount = Number(v?.amount);
    if (!isBigPayment(amount)) return null;
    const name = typeof v?.name === "string" && v.name.trim() ? v.name.trim().slice(0, 60) : null;
    return { amount, name };
  } catch {
    return null;
  }
}
