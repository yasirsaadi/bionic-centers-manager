//  **تصنيفاتُ لوحة التصنيع** — منطقٌ خالص، بلا React ولا شبكة ولا قاعدة.
//
//  ══ لماذا ملفٌّ مستقلّ ══════════════════════════════════════════════════
//  المشروعُ بلا مشغّل DOM، فقرارٌ يعيش داخل مكوّن React لا يُختبَر إلّا
//  بقراءة نصِّه — وقراءةُ النصّ لا تُمسك انقلاباً في المعنى يعود يوماً
//  بصياغةٍ أخرى (درسُ `manufacturing_view_mode` و`exam_episode_choice`).
//  وهذا القرارُ يستحقّ الاختبار: **تصنيفٌ يُخطئ شرطَه يُخفي عملاً قائماً**
//  أو يعرض على الخبير ما ليس له.
//
//  ══ الواقعة (٢٠٢٦-٠٩-٢٤) ════════════════════════════════════════════════
//  الشرائطُ التسعة أسفلَ المرشِّحات كانت **تعدّ ولا تُضغَط**: يقرأ المالكُ
//  «متأخرون ٢١» ثمّ لا يجد بابًا يفتحهم — فيقلّب الصفحةَ كلَّها بيده.
//  وتعليقٌ في الشيفرة يقول «click to filter» بينما العنصرُ `div` لا يستقبل
//  ضغطة. فصارت أزراراً.
//
//  ══ ولماذا التصفيةُ هنا لا في الخادم ════════════════════════════════════
//  نقطةُ الأوامر **بلا حدٍّ ولا صفحات** (`listOrders` تُرجع كلَّ المطابق
//  مرتَّباً، بلا `LIMIT`)، فالقائمةُ التي بين يدي الشاشة هي المجموعةُ
//  الكاملة بعد مرشِّحات الخادم (البحث · الفرع · **الخبير** · النوع ·
//  المرحلة · الحالة). فتصفيةُ التصنيف فوقها **تتركّب معها حتماً**:
//  «عناد» ثمّ «متأخرون» ⟶ متأخرو عناد وحدهم، بلا معامِلٍ جديد في الخادم
//  وبلا استعلامٍ ثانٍ ينحرف عن الأوّل. **والعددُ المعروضُ على الشريط هو
//  عددُ ما سيظهر بالضبط** — لأن كليهما من المصفوفة نفسِها.
//
//  **ولا سلطةَ هنا**: الخادمُ يحرس النطاقَ والصلاحيةَ من مصدره، وهذا
//  **عرضٌ وترشيح** لا منحُ وصول.

import { FIRST_STAGE } from "@shared/manufacturing";

/** أقلُّ ما يلزم من صفّ الأمر ليُصنَّف — لا أكثر. */
export interface BucketOrderLike {
  currentStage: string;
  status: string;
  completedAt: string | null;
  isOverdue: boolean;
}

/** لونُ الشريط — يتبع معنى الحالة لا ترتيبَها. */
export type BucketTone = "blue" | "amber" | "red" | "green";

export interface BucketDef {
  /** مفتاحٌ داخليٌّ ثابت — **لا يتغيّر بتغيّر النصّ المعروض**، فتبديلُ
   *  صياغةٍ عربية لا يُفقد المستخدمَ تصنيفَه المختار. */
  key: string;
  label: string;
  tone: BucketTone;
  match: (o: BucketOrderLike, nowMonth: string) => boolean;
}

//  ══ الشروطُ التسعة — **منقولةٌ بحرفها** من الصفحة قبل هذه التمريرة ══════
//  فالأعدادُ التي يقرؤها المالكُ اليوم لا يتحرّك منها رقم، والمتبدِّلُ أن
//  الشريطَ صار يُضغَط. وترتيبُها ترتيبُ الشاشة نفسُه فلا يزيح شيءٌ مكانه.
export const BUCKET_DEFS: readonly BucketDef[] = [
  {
    key: "new", label: "أوامر جديدة", tone: "blue",
    match: (o) => o.currentStage === FIRST_STAGE && o.status !== "cancelled",
  },
  {
    key: "active", label: "قيد العمل", tone: "blue",
    match: (o) => o.status === "active" && o.currentStage !== FIRST_STAGE,
  },
  {
    key: "waiting_patient", label: "بانتظار المريض", tone: "amber",
    match: (o) => o.status === "waiting_patient",
  },
  {
    key: "waiting_materials", label: "بانتظار المواد", tone: "amber",
    match: (o) => o.status === "waiting_materials",
  },
  {
    key: "medical_hold", label: "متوقّفون لسبب طبي", tone: "amber",
    match: (o) => o.status === "medical_hold",
  },
  {
    key: "technical_rework", label: "إعادة عمل فني", tone: "red",
    match: (o) => o.status === "technical_rework",
  },
  {
    key: "ready", label: "جاهزون للتجربة والتسليم", tone: "green",
    match: (o) => o.currentStage === "ready_for_fitting",
  },
  {
    key: "completed_month", label: "مكتملون هذا الشهر", tone: "green",
    //  الشهرُ بتقويم بغداد يُحسَب في الشاشة ويُمرَّر، فلا تقرأ دالّةٌ
    //  خالصة ساعةَ الجهاز من تلقائها.
    match: (o, nowMonth) => o.status === "completed"
      && (o.completedAt ?? "").slice(0, 7) === nowMonth,
  },
  {
    key: "overdue", label: "متأخرون", tone: "red",
    match: (o) => o.isOverdue === true,
  },
] as const;

const BY_KEY = new Map(BUCKET_DEFS.map((d) => [d.key, d]));

/** تعريفُ التصنيف بمفتاحه — و`null` لمفتاحٍ لا نعرفه. */
export function bucketDef(key: string | null | undefined): BucketDef | null {
  if (typeof key !== "string" || key === "") return null;
  return BY_KEY.get(key) ?? null;
}

export interface BucketCount { def: BucketDef; count: number; }

/** عددُ كلّ تصنيف **من القائمة المعروضة نفسِها** — فلا يخالف العددُ ما يظهر. */
export function bucketCounts(
  orders: readonly BucketOrderLike[], nowMonth: string,
): BucketCount[] {
  return BUCKET_DEFS.map((def) => ({
    def, count: orders.reduce((n, o) => (def.match(o, nowMonth) ? n + 1 : n), 0),
  }));
}

/**
 *  الأوامرُ التي يعرضها التصنيفُ المختار.
 *
 *  **ومفتاحٌ لا نعرفه يُقرأ «بلا تصنيف» لا «صفر نتائج»**: تبويبٌ بائتٌ
 *  أو تصنيفٌ حُذف يوماً يجب ألّا يُفرغ الشاشةَ على الموظّف بلا سببٍ يراه.
 */
export function ordersInBucket<T extends BucketOrderLike>(
  orders: readonly T[], key: string | null | undefined, nowMonth: string,
): T[] {
  const def = bucketDef(key);
  if (!def) return orders.slice();
  return orders.filter((o) => def.match(o, nowMonth));
}

/**
 *  ضغطةٌ على شريط: يُختار، والضغطةُ عليه ثانيةً تُلغيه.
 *  فالتراجعُ بالزرّ نفسِه — ولا يبحث المستخدمُ عن زرِّ «إلغاء» ثالث.
 */
export function nextBucket(
  current: string | null | undefined, clicked: string,
): string | null {
  if (!bucketDef(clicked)) return current ?? null;
  return current === clicked ? null : clicked;
}
