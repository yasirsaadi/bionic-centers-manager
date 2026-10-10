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
  COMPONENT_LABELS, FULL_DEVICE, isProstheticComponent, isRequestedItem, requestedItemLabel, requestedParts,
  type ProstheticComponent, type RequestedItem,
} from "./prosthetic_parts";
import { isSlotKey, slotKeyLabel } from "./limb_specs";

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
  /**
   * **طرفُ هذا السطر** (§4.de، المرحلةُ (ب)) — للجهاز الكامل بأكثر من طرفٍ مصنوع حين يُسعَّر كلُّ طرفٍ وحده (`left-lower` …).
   * وغيابُه سطرٌ للجهاز كلِّه أو لجزء.
   */
  limb?: string;
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
/** عنوانُ سطر — الطرفُ باسمه («يسار سفلي»)، والجزءُ باسمه، والجهازُ كلُّه باسمه. */
const lineLabel = (l: { item: RequestedItem; limb?: string }, serviceType?: unknown) =>
  l.limb ? slotKeyLabel(l.limb) : itemLabel(l.item, serviceType);

/**
 * **أسطرُ السعر كما وصلت** — سطرٌ لكلّ بندٍ مطلوب، لا أقلّ ولا أكثر ولا تكرار، وكلٌّ بقاعدة الخصم نفسِها.
 * والخطأُ يسمّي الجزءَ («السليكون: مقدار الخصم لا يمكن أن يتجاوز السعر الأصلي»). والأسطرُ تُرتَّب بترتيب الطلب.
 *
 * **والجهازُ الكاملُ بأكثر من طرفٍ مصنوع** (`limbs` — مفاتيحُ أطرافه المصنوعة في هذا الطلب، §4.de (ب)): **سطرٌ واحدٌ له أو سطرٌ لكلّ طرف**
 * — «أعطِ حرّية ولا تقيّد» — لا الاثنان معاً ولا بعضُ الأطراف. ومجموعُ الأطراف هو سعرُ الجهاز.
 */
export function parseSaleLines(raw: unknown, items: readonly RequestedItem[], serviceType?: unknown, limbs: readonly string[] = []):
  { ok: true; lines: SaleLine[]; totals: SaleTotals } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "أدخل سعر كلّ جزء" };
  if (items.length === 0) return { ok: false, error: "حدّد ما يُباع أوّلاً" };
  const splittable = limbs.length >= 2 && items.includes(FULL_DEVICE);
  const keyOf = (item: RequestedItem, limb?: string) => (limb ? `${item}:${limb}` : item);
  const byKey = new Map<string, SaleLine>();
  for (const x of raw) {
    const item = (x as any)?.item;
    if (!isRequestedItem(item) || !items.includes(item)) {
      return { ok: false, error: "سطرُ سعرٍ لجزءٍ غير مطلوب — حدّث الصفحة" };
    }
    const rawLimb = (x as any)?.limb;
    const limb = typeof rawLimb === "string" && rawLimb ? rawLimb : undefined;
    if (limb !== undefined && (item !== FULL_DEVICE || !splittable || !isSlotKey(limb) || !limbs.includes(limb))) {
      return { ok: false, error: "سطرُ سعرٍ لطرفٍ لا يُصنع في هذا الطلب — حدّث الصفحة" };
    }
    const label = lineLabel({ item, limb }, serviceType);
    if (byKey.has(keyOf(item, limb))) return { ok: false, error: `${label}: سعرُه مكرّر` };
    const offer = deriveOfferFromDiscount({ originalPrice: (x as any)?.originalPrice, discountAmount: (x as any)?.discountAmount ?? 0 });
    if (!offer.ok) return { ok: false, error: `${label}: ${offer.error ?? "سعر غير صالح"}` };
    byKey.set(keyOf(item, limb), {
      item, ...(limb ? { limb } : {}), originalPrice: offer.originalPrice!, discountAmount: offer.discountAmount!, finalPrice: offer.finalPrice!,
    });
  }
  //  الجهازُ الكامل: سطرٌ له **أو** سطرٌ لكلّ طرف — والمختلطُ يُقال.
  const perLimb = splittable && limbs.some((l) => byKey.has(keyOf(FULL_DEVICE, l)));
  if (perLimb && byKey.has(FULL_DEVICE)) {
    return { ok: false, error: "سعرُ الجهاز: سطرٌ واحدٌ له أو سطرٌ لكلّ طرف — لا الاثنان" };
  }
  const wanted: { item: RequestedItem; limb?: string }[] = items.flatMap((i): { item: RequestedItem; limb?: string }[] =>
    (i === FULL_DEVICE && perLimb ? limbs.map((l) => ({ item: i, limb: l })) : [{ item: i }]));
  const missing = wanted.filter((w) => !byKey.has(keyOf(w.item, w.limb)));
  if (missing.length) return { ok: false, error: `أدخل سعر: ${missing.map((w) => lineLabel(w, serviceType)).join("، ")}` };
  const lines = wanted.map((w) => byKey.get(keyOf(w.item, w.limb))!);
  return { ok: true, lines, totals: saleTotalsOf(lines) };
}

/** أسطرٌ مخزَّنة (JSON) ⟵ مقروءة — وما لا يصحّ منها يسقط بصمتٍ في العرض (الكتابةُ وحدها تتحقّق). */
export function storedSaleLines(v: unknown): SaleLine[] {
  if (!Array.isArray(v)) return [];
  return v.filter((l: any) => l && isRequestedItem(l.item)
    && [l.originalPrice, l.discountAmount, l.finalPrice].every((n) => Number.isInteger(n) && n >= 0))
    .map((l: any) => ({
      item: l.item, ...(l.item === FULL_DEVICE && typeof l.limb === "string" && isSlotKey(l.limb) ? { limb: l.limb } : {}),
      originalPrice: l.originalPrice, discountAmount: l.discountAmount, finalPrice: l.finalPrice,
    }));
}

/** **تفصيلٌ يُعرض**: سطران فأكثر ومجموعُ نهائيّها هو المبلغُ الكلّيّ — فسعرٌ صُحِّح بعد البيع لا يُفصَّل بأسطرٍ لم يأتِ منها. */
export function saleLinesMatchTotal(lines: readonly Pick<SaleLine, "finalPrice">[], total: number | null): boolean {
  return lines.length > 1 && total !== null && lines.reduce((n, l) => n + l.finalPrice, 0) === total;
}

/** «القالب ٦٠٠,٠٠٠ · السليكون ٤٠٠,٠٠٠ (خصم ٥٠,٠٠٠)» — و«يسار سفلي ١,٠٠٠,٠٠٠ · يسار علوي ٥٠٠,٠٠٠» للأطراف — سطرٌ يُقرأ في الاستمارة والتدقيق. */
export function saleLinesText(lines: readonly SaleLine[], serviceType?: unknown): string {
  const money = (n: number) => n.toLocaleString("en-US");
  return lines.map((l) => `${lineLabel(l, serviceType)} ${money(l.finalPrice)}`
    + (l.finalPrice === 0 ? " (مجّاني)" : l.discountAmount > 0 ? ` (خصم ${money(l.discountAmount)} من ${money(l.originalPrice)})` : ""))
    .join(" · ");
}

/** للشاشة: نهائيُّ سطرٍ من خانتيه — `null` حين لا يصحّ بعد. */
export function lineFinalPrice(original: string | number, discount: string | number): number | null {
  const o = Number(original); const d = discount === "" ? 0 : Number(discount);
  if (!Number.isInteger(o) || o <= 0 || !Number.isInteger(d) || d < 0 || d > o) return null;
  return o - d;
}

