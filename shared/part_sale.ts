// **بيعُ الأجزاء: مَن يصنعها، وسعرُ كلّ جزء** (§4.cu، قرارُ المالك ٢٠٢٦-١٠-٠٨) — منطقٌ خالص، بلا قاعدةٍ ولا شبكة.
//
// ══ الخبيرُ للقالب والغلاف الإسفنجي وحدهما ══════════════════════════════════════════════════════════════════
// القالبُ يُصنع على مقاس الجذع، والغلافُ الإسفنجيّ (التجميليّ) يُنحَت على شكل الساق — فكلاهما عملُ خبيرٍ وأمرُ تصنيع.
// والسليكونُ والقدمُ والركبةُ والتيوبُ والأدابتر وغلافُ القدم **جاهزةٌ** تُختار بمقاسها: يشتريها المريضُ وتُسلَّم يومَها،
// **بلا خبيرٍ ولا أمرِ تصنيع**. وطلبٌ فيه القالبُ أو الغلافُ الإسفنجيّ أمرٌ واحدٌ يسمّي الأجزاءَ كلَّها — الخبيرُ يصنع
// القالبَ ويركّب معه الباقي (والسليكونُ يُلبَس على الجذع حين يُصبّ القالب). والجهازُ الكاملُ — طرفاً أو مسنداً — للخبير دائماً.
//
// ══ سعرٌ لكلّ جزء، والمدفوعُ على المجموع ═══════════════════════════════════════════════════════════════════
// لكلّ جزءٍ سعرُه الأصليّ وخصمُه ونهائيُّه (بقاعدة `deriveOfferFromDiscount` نفسِها، لا حسابٍ ثانٍ)، ثمّ المجموع —
// ومنه وحده «المدفوع الآن» و«المتبقّي»: المريضُ يدفع مبلغاً واحداً.
import { deriveOfferFromDiscount, type PriceKind } from "./commercial";
import {
  COMPONENT_LABELS, isProstheticComponent, isRequestedItem, requestedItemLabel, requestedParts,
  type ProstheticComponent, type RequestedItem,
} from "./prosthetic_parts";

/** الأجزاءُ التي يصنعها الخبير — وما عداها جاهز. */
export const EXPERT_MADE_PARTS: readonly ProstheticComponent[] = ["socket", "foam_cover"];

/**
 * **أيحتاج هذا الطلبُ خبيراً وأمرَ تصنيع؟** — قاعدةٌ واحدة يقرؤها البابان (بلا معاينة · إتمام البيع) والشاشتان.
 * المسندُ والطرفُ الكامل: نعم. والأجزاءُ: نعم إن كان بينها قالبٌ أو غلافٌ إسفنجيّ، وإلّا فلا.
 */
export function needsExpertOrder(serviceType: unknown, requestedItem: unknown, extraComponents?: unknown): boolean {
  if (serviceType !== "prosthetic") return true;
  const parts = requestedParts(requestedItem, extraComponents);
  if (parts.length === 0) return true;
  return parts.some((p) => EXPERT_MADE_PARTS.includes(p));
}

/** والقاعدةُ نفسُها على قائمة أجزاءٍ مختارة في الشاشة (قبل أن تصير طلباً). */
export const partsNeedExpert = (parts: readonly string[]): boolean =>
  parts.length === 0 || parts.some((p) => (EXPERT_MADE_PARTS as readonly string[]).includes(p));

/** سطرٌ يقوله الموظّفُ عن قاعدة الخبير — في نافذتي البيع. */
export const READY_PARTS_HINT =
  "القالب والغلاف الإسفنجي يُصنعان عند الخبير؛ وما عداهما جاهزٌ يُسلَّم اليوم بلا أمر تصنيع.";
export const READY_SALE_SUCCESS_MESSAGE = "تم تسجيل البيع وتسليم الأجزاء — بلا أمر تصنيع";

/** سطرُ سعرٍ واحد — كما يُخزَّن على الجهاز (`patient_device_episodes.sale_lines`) ويُطبَع. */
export interface SaleLine {
  item: RequestedItem;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface SaleTotals {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  /** نوعُ المجموع: صفرٌ نهائيّ ⟵ مجّانيّ، وبلا خصمٍ ⟵ عاديّ، وإلّا بخصم. */
  kind: PriceKind;
}

export function saleTotalsOf(lines: readonly Pick<SaleLine, "originalPrice" | "discountAmount">[]): SaleTotals {
  const originalPrice = lines.reduce((n, l) => n + l.originalPrice, 0);
  const discountAmount = lines.reduce((n, l) => n + l.discountAmount, 0);
  const finalPrice = originalPrice - discountAmount;
  const kind: PriceKind = finalPrice === 0 ? "free" : discountAmount === 0 ? "normal" : "discount";
  return { originalPrice, discountAmount, finalPrice, kind };
}

const itemLabel = (item: RequestedItem, serviceType?: unknown) =>
  isProstheticComponent(item) ? COMPONENT_LABELS[item] : requestedItemLabel(item, serviceType);

/**
 * **أسطرُ السعر كما وصلت** — سطرٌ لكلّ بندٍ مطلوب، لا أقلّ ولا أكثر ولا تكرار، وكلٌّ بقاعدة الخصم نفسِها.
 * والخطأُ يسمّي الجزءَ («السليكون: مقدار الخصم لا يمكن أن يتجاوز السعر الأصلي»). والأسطرُ تُرتَّب بترتيب الطلب.
 */
export function parseSaleLines(raw: unknown, items: readonly RequestedItem[], serviceType?: unknown):
  { ok: true; lines: SaleLine[]; totals: SaleTotals } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "أدخل سعر كلّ جزء" };
  if (items.length === 0) return { ok: false, error: "حدّد ما يُباع أوّلاً" };
  const byItem = new Map<RequestedItem, SaleLine>();
  for (const x of raw) {
    const item = (x as any)?.item;
    if (!isRequestedItem(item) || !items.includes(item)) {
      return { ok: false, error: "سطرُ سعرٍ لجزءٍ غير مطلوب — حدّث الصفحة" };
    }
    if (byItem.has(item)) return { ok: false, error: `${itemLabel(item, serviceType)}: سعرُه مكرّر` };
    const offer = deriveOfferFromDiscount({ originalPrice: (x as any)?.originalPrice, discountAmount: (x as any)?.discountAmount ?? 0 });
    if (!offer.ok) return { ok: false, error: `${itemLabel(item, serviceType)}: ${offer.error ?? "سعر غير صالح"}` };
    byItem.set(item, {
      item, originalPrice: offer.originalPrice!, discountAmount: offer.discountAmount!, finalPrice: offer.finalPrice!,
    });
  }
  const missing = items.filter((i) => !byItem.has(i));
  if (missing.length) return { ok: false, error: `أدخل سعر: ${missing.map((i) => itemLabel(i, serviceType)).join("، ")}` };
  const lines = items.map((i) => byItem.get(i)!);
  return { ok: true, lines, totals: saleTotalsOf(lines) };
}

/** أسطرٌ مخزَّنة (JSON) ⟵ مقروءة — وما لا يصحّ منها يسقط بصمتٍ في العرض (الكتابةُ وحدها تتحقّق). */
export function storedSaleLines(v: unknown): SaleLine[] {
  if (!Array.isArray(v)) return [];
  return v.filter((l: any) => l && isRequestedItem(l.item)
    && [l.originalPrice, l.discountAmount, l.finalPrice].every((n) => Number.isInteger(n) && n >= 0))
    .map((l: any) => ({ item: l.item, originalPrice: l.originalPrice, discountAmount: l.discountAmount, finalPrice: l.finalPrice }));
}

/** «القالب ٦٠٠,٠٠٠ · السليكون ٤٠٠,٠٠٠ (خصم ٥٠,٠٠٠)» — سطرٌ يُقرأ في الاستمارة والتدقيق. */
export function saleLinesText(lines: readonly SaleLine[], serviceType?: unknown): string {
  const money = (n: number) => n.toLocaleString("en-US");
  return lines.map((l) => `${itemLabel(l.item, serviceType)} ${money(l.finalPrice)}`
    + (l.finalPrice === 0 ? " (مجّاني)" : l.discountAmount > 0 ? ` (خصم ${money(l.discountAmount)} من ${money(l.originalPrice)})` : ""))
    .join(" · ");
}

/** للشاشة: نهائيُّ سطرٍ من خانتيه — `null` حين لا يصحّ بعد. */
export function lineFinalPrice(original: string | number, discount: string | number): number | null {
  const o = Number(original); const d = discount === "" ? 0 : Number(discount);
  if (!Number.isInteger(o) || o <= 0 || !Number.isInteger(d) || d < 0 || d > o) return null;
  return o - d;
}

