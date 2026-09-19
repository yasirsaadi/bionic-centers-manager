// ══ عدُّ الأطراف المباعة — من السجلّ البنيويّ وحده ═══════════════════════
//
// سؤالُ المالك الذي وُلدت لأجله هذه الأداة:
//   «كم طرف تم بيعه في مركز بغداد خلال آخر عشرة أيام؟»
//
// ══ مصدرُ الحقيقة — مُتحقَّقٌ منه في الكود قبل كتابة حرفٍ هنا ═════════════
// البيعُ الحقيقيُّ لطرفٍ صناعيٍّ كامل يُنتج **أمرَ بناءٍ أوّليّ** مرتبطاً
// بحلقة جهازه، ويُكتب في **معاملة تأكيد البيع نفسِها**:
//
//   `followup/store.ts: confirmPurchase`  ⟶ يمرّر `tx` إلى
//   `storage.assignManufacturing`         ⟶ `startDeviceSaleOperationallyTx`
//                                            (أمرُ العمل وسجلُّه، بلا دينار)
//                                         ⟶ `applyDeviceSaleFinancialsTx`
//
// فـ`prosthetic_work_orders.created_at` (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`،
// ترحيل ٠١٣) هو **لحظةُ البيع** لا تقديراً: القاعدةُ تكتبه بنفسها عند
// الإدراج داخل تلك المعاملة، فلا مسارَ تطبيقٍ ينساه ولا يزوّره.
//
// **وهو غيرُ مُعلَنٍ في نموذج Drizzle** (`shared/schema.ts` يعلن `started_at`
// و`completed_at` فقط) — موجودٌ في القاعدة منذ ٠١٣ ولم يُصرَّح به في
// النموذج. ولذلك تُقرأ هنا بـSQL خامّة صريحة لا بـDrizzle.
//
// ══ وتعريفُ «بِيع» بالضبط ═══════════════════════════════════════════════
//   ① `prosthetic_work_orders.service_type = 'prosthetic'`  — أطرافٌ لا مساند
//   ② `COALESCE(purpose,'initial_build') = 'initial_build'` — بناءٌ أوّليّ
//      (نفسُ صيغة `operational_summary` بحرفها، لا قراءةٌ ثانية تنحرف)
//   ③ `patient_device_episodes.requested_item = 'full_device'` — **ضمٌّ
//      داخليّ**: أمرٌ بلا هويّة جهاز لا يُمكن إثباتُ أنه طرفٌ كامل، فلا
//      يُعَدّ ولا يُخمَّن (ويُقال عددُه صراحةً في `unclassifiedLegacyOrders`)
//   ④ `wo.admin_void_reversal_id IS NULL` و`ep.admin_void_reversal_id IS NULL`
//      — المُبطَلُ إدارياً (ترحيل ٠٦٤) ليس بيعاً
//
// **فالصيانةُ خارجةٌ بالبند ②** (`purpose = 'maintenance'`)، **وبيعُ الجزء
// خارجٌ بالبند ③** (`requested_item` = `socket`/`knee`/`foot`/…). ولا
// يُقرأ نصُّ مريضٍ ولا وصفُ دفعةٍ ولا ملاحظةُ أمرٍ — بنيويٌّ محض.
//
// ══ ولا رقمَ ماليٌّ يخرج من هنا إطلاقاً ═════════════════════════════════
// عددٌ فقط. لا `agreed_cost` ولا `approved_price` ولا دفعة — ولا اسمَ مريضٍ
// ولا هاتفَ ولا ملاحظة. الأداةُ تُجيب «كم»، لا «بكم» ولا «لمن».

import { sql } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import { normalizeSearchText } from "@shared/patient_search";
import { FULL_DEVICE } from "@shared/prosthetic_parts";

/** الحدُّ الأقصى للمدى — نفسُ حدّ `operational_summary` (٩٢ يوماً). */
export const MAX_SALES_DAYS = 92;

/** الافتراضُ حين لا يُذكر مدى — ويُعلَن دائماً في `startDate`/`endDate`. */
export const DEFAULT_SALES_DAYS = 30;

export interface DeviceSalesBranchCount {
  branchId: number;
  branchName: string;
  sold: number;
}

export interface DeviceSalesSummaryResult {
  startDate: string;
  endDate: string;
  days: number;
  totalSold: number;
  scopeLabel: string;
  /** تفصيلٌ لكلّ فرع — للمسؤول العام حين لا يحدّد فرعاً، وإلّا `null`. */
  byBranch: DeviceSalesBranchCount[] | null;
  /**
   * أوامرُ بناءٍ أوّليّ (أطراف) في المدى والنطاق **بلا هويّة حلقة**، فلا
   * يمكن إثباتُ أنها طرفٌ كامل أو جزء. صفرٌ في المسار الحيّ؛ وغيرُ الصفر
   * سجلٌّ قديمٌ سابقٌ لحقبة هويّة الجهاز — يُقال ولا يُضاف إلى العدّ.
   */
  unclassifiedLegacyOrders: number;
}

// ══ حدَّا مدىً بتقويم بغداد ═══════════════════════════════════════════════
// نفسُ إزاحة `ai/tools/reports.ts: baghdadRangeBounds` و
// `storage.getAccountingSummary` (٣ ساعات) — لا حسابٌ ثالث ينحرف عنهما.
// و`created_at` هنا `TIMESTAMPTZ`، فالمقارنةُ بلحظةٍ مطلقة دقيقةٌ بذاتها.
function baghdadBounds(start: string, end: string): { startTs: Date; endExclusiveTs: Date } {
  const BAGHDAD_MS = 3 * 60 * 60 * 1000;
  return {
    startTs: new Date(new Date(start).getTime() - BAGHDAD_MS),
    endExclusiveTs: new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000 - BAGHDAD_MS),
  };
}

/** اليومُ بتقويم بغداد — لا بتقويم الخادم. */
export function todayBaghdad(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
}

export type DaysResult = { ok: true; days: number } | { ok: false; error: string };

/**
 * **الخادمُ يحسب المدى، لا النموذج.** «آخر ١٠ أيام» تصل رقماً واحداً،
 * فيُترجَم هنا إلى تاريخين بتقويم بغداد — فلا يُطلَب من النموذج حسابُ
 * تقويمٍ يخطئ فيه.
 *
 * والغيابُ (`undefined`/`null`) افتراضٌ معلَن؛ **وكلُّ حضورٍ لا يصلح عدداً
 * صحيحاً موجباً يُرفَض صراحةً** — لا يُقرأ غياباً فيتحوّل سؤالٌ عن عشرة
 * أيام إلى ثلاثين بصمت (نفسُ درس `resolveDateRange`).
 */
export function resolveDays(raw: unknown): DaysResult {
  if (raw === undefined || raw === null) return { ok: true, days: DEFAULT_SALES_DAYS };
  if (typeof raw !== "number" && typeof raw !== "string") {
    return { ok: false, error: "عدد الأيام (days) غير صالح." };
  }
  if (typeof raw === "string" && raw.trim() === "") {
    return { ok: false, error: "عدد الأيام (days) لا يمكن أن يكون فارغاً." };
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { ok: false, error: "عدد الأيام (days) يجب أن يكون عدداً صحيحاً موجباً." };
  }
  if (n > MAX_SALES_DAYS) {
    return {
      ok: false,
      error: `المدى المطلوب (${n} يوماً) أطول من الحدّ المسموح (${MAX_SALES_DAYS} يوماً) — اطلب مدىً أقصر.`,
    };
  }
  return { ok: true, days: n };
}

/** `days` ⟶ تاريخان شاملان، آخرُهما اليوم بتقويم بغداد. */
export function rangeForDays(days: number): { start: string; end: string } {
  const end = todayBaghdad();
  const startMs = new Date(`${end}T00:00:00Z`).getTime() - (days - 1) * 86400000;
  return { start: new Date(startMs).toISOString().slice(0, 10), end };
}

// ══ حلُّ اسم الفرع — داخل النطاق المسموح وحده ════════════════════════════

export type BranchNameResult =
  | { ok: true; branchId: number; branchName: string }
  | { ok: false; error: string };

/**
 * «بغداد» ⟶ الفرعُ الوحيد **ضمن نطاق هذا المستخدم** الذي يحوي الكلمة.
 *
 * ① التطابقُ التامّ بعد التطبيع يسبق دائماً — فرعٌ اسمُه «بغداد» بالضبط
 *    يفوز على «بغداد الجديدة» ولو كان الاثنان في النطاق.
 * ② وإلّا الاحتواء. ③ وصفرٌ أو أكثرُ من واحد ⟶ **يُقال ولا يُخمَّن**.
 *
 * ══ والنطاقُ يُفرَض على **قائمة المرشَّحين** لا على النتيجة ══════════════
 * غيرُ المسؤول يرى فروعَه وحدها في القائمة، فاسمُ فرعٍ خارج نطاقه يُنتج
 * **صفرَ مطابقات** — والرسالةُ محايدة: «لا يوجد فرعٌ بهذا الاسم ضمن
 * نطاقك»، لا «موجودٌ لكنّك ممنوع». فلا يُستدَلّ من الردّ على وجود فرعٍ
 * آخر ولا على اسمه.
 *
 * والتطبيعُ من `normalizeSearchText` القائمة (نفسُ مطبِّع أسماء المرضى):
 * الألفُ بأشكالها، والتاءُ المربوطة، والتشكيل، والتطويل — فلا مطبِّعَ
 * عربيٌّ ثانٍ في المستودع.
 */
export async function resolveBranchByName(params: {
  name: string;
  isAdmin: boolean;
  operationalBranches: number[] | null;
}): Promise<BranchNameResult> {
  const needle = normalizeSearchText(params.name);
  if (!needle) return { ok: false, error: "اسم الفرع فارغ." };

  const all = await storage.getBranches();
  //  النطاقُ أوّلاً — قبل أيّ مطابقةٍ نصّية.
  const scope = params.isAdmin ? null : params.operationalBranches;
  const candidates = scope === null ? all : all.filter((b) => scope.includes(b.id));
  if (candidates.length === 0) {
    return { ok: false, error: "لا توجد فروع ضمن نطاقك." };
  }

  const exact = candidates.filter((b) => normalizeSearchText(b.name) === needle);
  const pool = exact.length > 0 ? exact : candidates.filter((b) => normalizeSearchText(b.name).includes(needle));

  if (pool.length === 0) {
    return { ok: false, error: `لا يوجد فرعٌ بالاسم «${params.name}» ضمن نطاقك.` };
  }
  if (pool.length > 1) {
    return {
      ok: false,
      error: `الاسم «${params.name}» يطابق أكثر من فرع ضمن نطاقك (${pool.map((b) => b.name).join("، ")}) — حدِّد الاسم بدقّة.`,
    };
  }
  return { ok: true, branchId: pool[0].id, branchName: pool[0].name };
}

// ══ العدّ ═════════════════════════════════════════════════════════════════

function branchScopeSql(col: string, scope: number[] | null) {
  if (scope === null) return sql`TRUE`;
  if (scope.length === 0) return sql`FALSE`;
  return sql`${sql.raw(col)} IN (${sql.join(scope.map((b) => sql`${b}`), sql`, `)})`;
}

/**
 * الشرطُ المشترك لِـ«طرفٌ كاملٌ بِيع» — **تعريفٌ واحد** يستعمله العدُّ
 * الكلّيُّ وتفصيلُ الفروع معاً، فلا ينحرف أحدُهما عن الآخر يوماً.
 */
const SOLD_FULL_DEVICE_SQL = sql`
  wo.service_type = 'prosthetic'
  AND COALESCE(wo.purpose, 'initial_build') = 'initial_build'
  AND wo.admin_void_reversal_id IS NULL
  AND ep.requested_item = ${FULL_DEVICE}
  AND ep.admin_void_reversal_id IS NULL
`;

export async function getDeviceSalesSummary(params: {
  operationalBranches: number[] | null;
  isAdmin: boolean;
  /** فرعٌ محلولٌ بالاسم — أو `null` فيُستعمل نطاقُ المستخدم كما هو. */
  branchId: number | null;
  branchName: string | null;
  start: string;
  end: string;
  days: number;
}): Promise<DeviceSalesSummaryResult> {
  //  فرعٌ محدَّد ⟶ هو النطاق. وإلّا نطاقُ الجلسة كما هو (المسؤولُ `null`
  //  أي كلُّ الفروع). والحلُّ بالاسم فرض النطاقَ سلفاً، فلا هروبَ منه هنا.
  const scope = params.branchId != null ? [params.branchId] : params.operationalBranches;
  const { startTs, endExclusiveTs } = baghdadBounds(params.start, params.end);

  const [totalR, unclassifiedR] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*)::int AS n
        FROM prosthetic_work_orders wo
        JOIN patient_device_episodes ep ON ep.id = wo.device_episode_id
       WHERE ${SOLD_FULL_DEVICE_SQL}
         AND ${branchScopeSql("wo.branch_id", scope)}
         AND wo.created_at >= ${startTs} AND wo.created_at < ${endExclusiveTs}
    `),
    //  أوامرُ بناءٍ أوّليّ (أطراف) بلا هويّة حلقة — تُقال ولا تُعَدّ.
    db.execute(sql`
      SELECT COUNT(*)::int AS n
        FROM prosthetic_work_orders wo
       WHERE wo.service_type = 'prosthetic'
         AND COALESCE(wo.purpose, 'initial_build') = 'initial_build'
         AND wo.admin_void_reversal_id IS NULL
         AND wo.device_episode_id IS NULL
         AND ${branchScopeSql("wo.branch_id", scope)}
         AND wo.created_at >= ${startTs} AND wo.created_at < ${endExclusiveTs}
    `),
  ]);

  //  ══ تفصيلُ الفروع — للمسؤول العام حين لا يحدّد فرعاً، لا لغيره ══
  //  (نفسُ شرط `operational_summary` بالحرف.)
  let byBranch: DeviceSalesBranchCount[] | null = null;
  if (params.isAdmin && params.branchId == null) {
    const [rows, allBranches] = await Promise.all([
      db.execute(sql`
        SELECT wo.branch_id AS branch_id, COUNT(*)::int AS n
          FROM prosthetic_work_orders wo
          JOIN patient_device_episodes ep ON ep.id = wo.device_episode_id
         WHERE ${SOLD_FULL_DEVICE_SQL}
           AND wo.created_at >= ${startTs} AND wo.created_at < ${endExclusiveTs}
         GROUP BY wo.branch_id
      `),
      storage.getBranches(),
    ]);
    const m = new Map<number, number>();
    for (const r of (rows.rows ?? []) as any[]) m.set(Number(r.branch_id), Number(r.n));
    byBranch = allBranches.map((b) => ({ branchId: b.id, branchName: b.name, sold: m.get(b.id) ?? 0 }));
  }

  const scopeLabel = params.branchName
    ? `فرع ${params.branchName}`
    : params.isAdmin
      ? "كل الفروع"
      : "الفروع المصرّح لك بها";

  return {
    startDate: params.start,
    endDate: params.end,
    days: params.days,
    totalSold: Number((totalR.rows ?? [])[0]?.n ?? 0),
    scopeLabel,
    byBranch,
    unclassifiedLegacyOrders: Number((unclassifiedR.rows ?? [])[0]?.n ?? 0),
  };
}
