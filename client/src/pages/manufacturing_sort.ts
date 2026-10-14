// **ترتيبُ قائمة «تصنيع الأطراف والمساند»** (طلبُ المالك ٢٠٢٦-١٠-١٤ — §4.ee).
//
// المالك: «آلية ترتيب الأسماء خلّيها لو حسب التاريخ لو حسب الاسم، بحيث من يجي واحد جديد يطلع أوّل شي، ولو نريد نروح لاسمٍ واحد نروح
// كبل للحرف مالته — مرّات تجي حالة أني عبالي ما محوّليها تطلع بنصّ الأسماء».
//
// كانت القائمةُ بتاريخ إنشاء الأمر وحده (`created_at`) — **والتحويلُ من خبيرٍ إلى خبير لا يغيّره**، فأمرٌ حُوِّل اليوم يبقى في مكانه القديم
// وسطَ القائمة، ولا يراه خبيرُه الجديد أوّلاً. فصار الترتيبُ اختياراً ظاهراً:
//   • «الأحدث أولاً» — بتاريخ وصول الأمر إلى خبيره الحاليّ: الإسنادُ، أو آخرُ تحويلٍ إن وقع بعده (`arrivedAtOf`).
//   • «حسب الاسم» — أبجدياً بالعربية (أ/إ/آ معاً، والتشكيلُ والتطويلُ لا يُحسبان)، وعنوانُ حرفٍ فوق كلّ مجموعة (`nameInitialOf`).
// دوالُّ خالصة — الشاشةُ ترتّب بها ما جاء من الخادم بعد التصفية، فلا ترتيبٌ ثانٍ يختلف عنها.

export const MANUFACTURING_SORTS = ["newest", "name"] as const;
export type ManufacturingSort = (typeof MANUFACTURING_SORTS)[number];

export const MANUFACTURING_SORT_LABELS: Record<ManufacturingSort, string> = {
  newest: "الأحدث أولاً",
  name: "حسب الاسم (أ – ي)",
};

/** القيمةُ المحفوظة على الجهاز — وما لا يُعرف ⟵ «الأحدث أولاً». */
export function readManufacturingSort(raw: unknown): ManufacturingSort {
  return (MANUFACTURING_SORTS as readonly string[]).includes(String(raw)) ? (raw as ManufacturingSort) : "newest";
}

/** مفتاحُ الحفظ لكلّ مستخدمٍ على جهازه — فلا يرث موظّفٌ اختيارَ زميلٍ دخل قبله من الجهاز نفسِه. */
export const manufacturingSortKey = (userId: unknown) => `manufacturing-sort:${userId ?? "anon"}`;

export interface SortableOrder {
  id: number;
  patientName: string;
  assignedAt: string | null;
  reassignedAt?: string | null;
}

const ms = (iso: string | null | undefined): number => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
};

/** **متى وصل الأمرُ إلى خبيره الحاليّ** — آخرُ تحويلٍ إن كان بعد الإسناد، وإلّا الإسناد. */
export function arrivedAtOf(o: SortableOrder): number {
  return Math.max(ms(o.assignedAt), ms(o.reassignedAt));
}

const NAME_COLLATOR = new Intl.Collator("ar", { sensitivity: "base", numeric: true, ignorePunctuation: true });

/** الاسمُ للمقارنة: بلا تطويلٍ ولا تشكيل ولا مسافاتٍ في طرفيه. */
function nameKey(name: string | null | undefined): string {
  return String(name ?? "").replace(/[ـً-ٰٟ]/g, "").trim();
}

/** **أوّلُ حرفٍ للعنوان** — والهمزاتُ على الألف ألفٌ واحدة، فلا تنقسم «أحمد» و«احمد» و«إبراهيم» تحت ثلاثة عناوين. */
export function nameInitialOf(name: string | null | undefined): string {
  const first = nameKey(name).charAt(0);
  if (!first) return "#";
  if ("أإآٱا".includes(first)) return "ا";
  if (first === "ى") return "ي";
  return first.toLocaleUpperCase("ar");
}

/** **يرتّب ولا يُسقط** — نسخةٌ جديدة، والتعادلُ بالأحدث ثمّ بالرقم فلا يتقافز صفّان متساويان بين تحديثٍ وآخر. */
export function sortManufacturingOrders<T extends SortableOrder>(orders: readonly T[], mode: ManufacturingSort): T[] {
  const byNewest = (a: T, b: T) => (arrivedAtOf(b) - arrivedAtOf(a)) || (b.id - a.id);
  const out = orders.slice();
  if (mode === "name") {
    out.sort((a, b) => NAME_COLLATOR.compare(nameKey(a.patientName), nameKey(b.patientName)) || byNewest(a, b));
  } else {
    out.sort(byNewest);
  }
  return out;
}
