// تقاريرُ المساعد التشغيلية والمالية — **الأرقامُ من الخادم دائماً**.
//
// ══ المبدأ الحاكم (القسم د من المهمّة) ═══════════════════════════════════
// كلُّ حسابٍ رقميّ — عدٌّ، مجموعٌ، مقارنةُ فترتين — يقع **في هذا الملفّ**
// لا في النموذج. النموذج يُلخِّص حقائق جاهزة، ولا يُطلَب منه حسابُ شيء.
// وفشلُ قراءةٍ يُعاد صراحةً `{ ok:false }` — لا يُحوَّل صمتاً إلى صفر.
//
// ══ النطاقُ يُحسم هنا لا في التسجيل ═══════════════════════════════════════
// `requestedBranchId` (من مدخل النموذج) لا يُعتمَد إلا حين يكون المستخدم
// مسؤولاً فعلاً — وإلا يبقى محصوراً بـ`operationalBranches`/`financeBranchId`
// من الجلسة، بصرف النظر عمّا طلبه. نفسُ قاعدة `enforceBranchAccess` تماماً.

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { storage } from "../../storage";
import { patients, visits, branches } from "@shared/schema";
import { activePatientDrizzle } from "../../patients/active_patient";
import * as medical from "../../medical/store";

// ══ نطاقُ التاريخ — حدٌّ أقصى، لا افتراضَ صامت لمدىً غير مطلوب ═══════════

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayInBaghdad(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
}

export type DateRangeResult =
  | { ok: true; start: string; end: string }
  | { ok: false; error: string };

/**
 * يحسم `start`/`end`: تاريخٌ واحدٌ فقط ⟶ يوماً واحداً. لا شيء ⟶ اليوم
 * (بتقويم بغداد). **ومدىً أطول من `maxDays` يُرفَض صراحةً** — لا يُقصَّر
 * صامتاً فيبدو تقريراً كاملاً وهو جزءٌ منه فقط.
 */
export function resolveDateRange(
  input: { startDate?: unknown; endDate?: unknown }, maxDays: number,
): DateRangeResult {
  const today = todayInBaghdad();
  const startRaw = typeof input.startDate === "string" && DATE_RE.test(input.startDate) ? input.startDate : null;
  const endRaw = typeof input.endDate === "string" && DATE_RE.test(input.endDate) ? input.endDate : null;
  const start = startRaw ?? endRaw ?? today;
  const end = endRaw ?? startRaw ?? today;
  if (start > end) return { ok: false, error: "تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه" };
  const days = Math.floor(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86400000,
  ) + 1;
  if (days > maxDays) {
    return { ok: false, error: `المدى الزمنيّ المطلوب (${days} يوماً) أطول من الحدّ المسموح (${maxDays} يوماً) — اطلب فترةً أضيق` };
  }
  return { ok: true, start, end };
}

/** الفترةُ السابقة **بنفس الطول تماماً** — للمقارنة، تُحسب لا تُخمَّن. */
export function previousPeriod(start: string, end: string): { start: string; end: string } {
  const startMs = new Date(`${start}T00:00:00Z`).getTime();
  const endMs = new Date(`${end}T00:00:00Z`).getTime();
  const days = Math.floor((endMs - startMs) / 86400000) + 1;
  const prevEndMs = startMs - 86400000;
  const prevStartMs = prevEndMs - (days - 1) * 86400000;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: iso(prevStartMs), end: iso(prevEndMs) };
}

/** فرعٌ واحدٌ يُعتمَد فقط للمسؤول — غيرُه يبقى على نطاقه دائماً. */
function effectiveScope(params: {
  operationalBranches: number[] | null; isAdmin: boolean; requestedBranchId: number | null;
}): number[] | null {
  if (params.isAdmin && params.requestedBranchId != null) return [params.requestedBranchId];
  return params.operationalBranches;
}

// ══ ١. المُلخَّص التشغيليّ (D2) ═══════════════════════════════════════════

export interface OperationalBranchBreakdown {
  branchId: number;
  branchName: string;
  newPatients: number;
  visits: number;
}

export interface OperationalSummaryResult {
  start: string;
  end: string;
  newPatients: number;
  visits: number;
  physiotherapySessions: number;
  awaitingExamNow: number;
  manufacturingNow: { activeBuilds: number; activeMaintenance: number; readyForFitting: number };
  byBranch: OperationalBranchBreakdown[] | null;
}

function branchScopeSql(col: string, scope: number[] | null) {
  if (scope === null) return sql`TRUE`;
  if (scope.length === 0) return sql`FALSE`;
  return sql`${sql.raw(col)} IN (${sql.join(scope.map((b) => sql`${b}`), sql`, `)})`;
}

/**
 * حدَّا مدىً بتوقيت بغداد — **نفسُ إزاحة `storage.getAccountingSummary`
 * بالحرف** (٣ ساعات، `baghdadDays: true`)، لا حسابٌ ثانٍ ينحرف عنه يوماً.
 *
 * ══ لماذا لازمة (تصحيحٌ — مراجعةٌ حيّة، مُثبَتٌ حيّاً) ═══════════════════
 * `patients.created_at` و`visits.visit_date` كلاهما `TIMESTAMP WITHOUT
 * TIME ZONE` يُكتَبان بـ`NOW()` على جلسةٍ توقيتُها `UTC` (لا `SET
 * timezone` في `server/db.ts`، ومُتحقَّقٌ منه حيّاً على القاعدة). فمقارنةُ
 * العمود مباشرةً بـ`'YYYY-MM-DD'::date` (بلا إزاحة، كما كانت هذه الدالّة
 * تفعل) تحسب حدودَ اليوم **بتوقيت UTC** لا بغداد — فحدثٌ وقع بين ٢١:٠٠
 * و٢٣:٥٩ بتوقيت UTC (= منتصف الليل حتى ٠٢:٥٩ بتوقيت بغداد، اليوم التالي)
 * يُنسَب إلى يومٍ خطأ. مريضٌ سُجّل ٠٠:٣٠ بتوقيت بغداد كان يظهر ضمن «الأمس»
 * لا «اليوم» — `test:ai-tools-reports` يثبت الفرق بمريضٍ حقيقيّ عند هذه
 * اللحظة بعينها.
 */
function baghdadRangeBounds(start: string, end: string): { startTs: Date; endExclusiveTs: Date } {
  const BAGHDAD_MS = 3 * 60 * 60 * 1000;
  return {
    startTs: new Date(new Date(start).getTime() - BAGHDAD_MS),
    endExclusiveTs: new Date(new Date(end).getTime() + 24 * 60 * 60 * 1000 - BAGHDAD_MS),
  };
}

export async function getOperationalSummary(params: {
  operationalBranches: number[] | null;
  isAdmin: boolean;
  requestedBranchId: number | null;
  start: string;
  end: string;
}): Promise<OperationalSummaryResult> {
  const scope = effectiveScope(params);
  const { start, end } = params;
  //  ══ حدَّا بغداد — **لا `::date` خامة بعد اليوم** على هذين العمودين ══
  const { startTs, endExclusiveTs } = baghdadRangeBounds(start, end);

  const [newPatientsR, visitsR, physioR, awaitingExamRows, manufacturingR] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*)::int AS n FROM patients
       WHERE deleted_at IS NULL AND ${branchScopeSql("branch_id", scope)}
         AND created_at >= ${startTs} AND created_at < ${endExclusiveTs}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS n FROM visits
       WHERE deleted_at IS NULL AND ${branchScopeSql("branch_id", scope)}
         AND visit_date >= ${startTs} AND visit_date < ${endExclusiveTs}
    `),
    //  **نفسُ تعريف `patient_lookup` للجلسة**: زيارةُ خيط العلاج الطبيعي
    //  وحده، بلا «خدمة جديدة» (قيدٌ ماليّ لا جلسة) ولا «استشارة طبية».
    db.execute(sql`
      SELECT COUNT(*)::int AS n
        FROM visits v
        JOIN patients p ON p.id = v.patient_id AND p.deleted_at IS NULL AND p.is_physiotherapy = TRUE
        JOIN patient_cases pc ON pc.id = v.case_id AND pc.case_type = 'physiotherapy'
       WHERE v.deleted_at IS NULL AND ${branchScopeSql("v.branch_id", scope)}
         AND v.visit_date >= ${startTs} AND v.visit_date < ${endExclusiveTs}
         --  ══ NULL-آمن — لا صيغة NOT(details = x OR notes LIKE y) ══
         --  زيارةٌ عاديةٌ بلا details/notes (الحالة الغالبة) تجعل تلك
         --  المقارنةَ NULL لا FALSE، وNOT NULL يبقى NULL — أي أن WHERE
         --  يستبعدها رغم أنها زيارةٌ حقيقية. أُمسكت حيّاً في
         --  test:ai-tools-reports (فحصٌ ب.٧) قبل أن تصل الإنتاج.
         AND COALESCE(v.details, '') <> 'خدمة جديدة'
         AND COALESCE(v.notes, '') NOT LIKE 'خدمة جديدة:%'
         AND v.treatment_type IS DISTINCT FROM 'استشارة طبية'
    `),
    //  ══ طابورٌ حيّ لا فترةٌ زمنية ══ — «الآن» لا «خلال المدى المطلوب».
    medical.getPendingExams(scope),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE COALESCE(purpose, 'initial_build') = 'initial_build')::int AS active_builds,
        COUNT(*) FILTER (WHERE purpose = 'maintenance')::int AS active_maintenance,
        COUNT(*) FILTER (WHERE current_stage = 'ready_for_fitting')::int AS ready_for_fitting
      FROM prosthetic_work_orders
      WHERE status NOT IN ('completed','cancelled') AND ${branchScopeSql("branch_id", scope)}
    `),
  ]);

  let byBranch: OperationalBranchBreakdown[] | null = null;
  if (params.isAdmin && params.requestedBranchId == null) {
    const allBranches = await storage.getBranches();
    const [newByBranch, visitsByBranch] = await Promise.all([
      db.execute(sql`
        SELECT branch_id, COUNT(*)::int AS n FROM patients
         WHERE deleted_at IS NULL AND created_at >= ${startTs} AND created_at < ${endExclusiveTs}
         GROUP BY branch_id
      `),
      db.execute(sql`
        SELECT branch_id, COUNT(*)::int AS n FROM visits
         WHERE deleted_at IS NULL AND visit_date >= ${startTs} AND visit_date < ${endExclusiveTs}
         GROUP BY branch_id
      `),
    ]);
    const newMap = new Map<number, number>((newByBranch.rows ?? []).map((r: any) => [Number(r.branch_id), Number(r.n)]));
    const visitMap = new Map<number, number>((visitsByBranch.rows ?? []).map((r: any) => [Number(r.branch_id), Number(r.n)]));
    byBranch = allBranches.map((b) => ({
      branchId: b.id, branchName: b.name,
      newPatients: newMap.get(b.id) ?? 0, visits: visitMap.get(b.id) ?? 0,
    }));
  }

  const mfg = (manufacturingR.rows ?? [])[0] as any;
  return {
    start, end,
    newPatients: Number((newPatientsR.rows ?? [])[0]?.n ?? 0),
    visits: Number((visitsR.rows ?? [])[0]?.n ?? 0),
    physiotherapySessions: Number((physioR.rows ?? [])[0]?.n ?? 0),
    awaitingExamNow: awaitingExamRows.length,
    manufacturingNow: {
      activeBuilds: Number(mfg?.active_builds ?? 0),
      activeMaintenance: Number(mfg?.active_maintenance ?? 0),
      readyForFitting: Number(mfg?.ready_for_fitting ?? 0),
    },
    byBranch,
  };
}

// ══ ٢. المُلخَّص الماليّ (D3) — `storage.getAccountingSummary` وحدها ══════
//
// ══ المبيعاتُ ليست إيراداً حتى تُقبض (تصحيحٌ لاحق، مراجعةٌ حيّة) ══════════
// `storage.getAccountingSummary().totalRevenue` اسمٌ موروث مضلِّل: قيمتُه
// من دفتر الكلف (`cost_entries`) — أي **ما بِيع أو التزم به المريض**، ولو
// لم يُقبض ديناراً واحداً بعد. والمالُ المقبوضُ فعلاً هو `totalPaid`.
// والتقريرُ اليوميّ يطبّق هذه القاعدة أصلاً («الوارد» = كل المقبوض). فلا
// يجوز أن تُسمَّى قيمةُ `totalRevenue` «إيراداً» هنا — الاسمُ الموروث في
// `storage.ts` **لا يُعاد تسميته** (خارج نطاق هذه المهمّة)، لكنّ محوِّل
// المساعد يُصحِّح الدلالة عند الخروج فقط:
//   salesValue = totalRevenue   (قيمةُ المبيعات/الكلفة المسجَّلة، وليست نقداً)
//   revenue    = totalPaid      (الإيرادُ الفعليّ = النقد المقبوض فعلاً)
// فلا حقلَ اسمُه «revenue» يحمل قيمة `totalRevenue` بعد اليوم.
export interface FinancialPeriodFigures {
  start: string;
  end: string;
  /** قيمةُ المبيعات — قيودُ الكلفة المؤرَّخة في الفترة. **ليست نقداً مقبوضاً.** */
  salesValue: number;
  /** الإيرادُ الفعليّ — النقدُ المقبوضُ فعلاً في الفترة. القاعدة: لا إيراد بلا قبضٍ فعليّ. */
  revenue: number;
  expenses: number;
  /** الصافي = الإيرادُ الفعليّ (النقد المقبوض) ناقص المصاريف. */
  net: number;
  collectionRateLifetime: number; // **ليست فترةً** — نسبةٌ إجمالية حتى الآن (توثيقٌ صريح للحقل)
  outstandingLifetime: number; // **ليست فترةً** — رصيدٌ إجماليّ مستحقّ حتى الآن
}

export interface FinancialSummaryResult {
  current: FinancialPeriodFigures;
  comparison: FinancialPeriodFigures | null;
  byBranch: (FinancialPeriodFigures & { branchId: number; branchName: string })[] | null;
}

async function summaryFor(branchId: number | undefined, start: string, end: string): Promise<FinancialPeriodFigures> {
  const s = await storage.getAccountingSummary(branchId, start, end, { baghdadDays: true });
  return {
    start, end,
    //  ══ لا تُبدَّل — `totalRevenue` (مبيعات/كلفة) و`totalPaid` (نقدٌ
    //  مقبوض) حقيقتان مختلفتان في `storage.ts` نفسِه (راجع تعليقه هناك:
    //  "totalPaid الوارد = payments … / totalRevenue المبيعات = cost-ledger
    //  entries …"). المحوِّلُ هنا يسمّيهما بصدقٍ للنموذج فقط.
    salesValue: s.totalRevenue,
    revenue: s.totalPaid,
    expenses: s.totalExpenses,
    net: s.netProfit,
    collectionRateLifetime: s.collectionRate, outstandingLifetime: s.totalRemaining,
  };
}

export async function getFinancialSummary(params: {
  isAdmin: boolean;
  /** نطاقُ الجلسة المالي — `null` = كلّ الفروع (مسؤولٌ بلا اختيار). */
  accessBranchId: number | null;
  requestedBranchId: number | null;
  start: string;
  end: string;
  compare: boolean;
}): Promise<FinancialSummaryResult> {
  //  **غيرُ المسؤول محصورٌ بفرعه الماليّ دائماً** — `requestedBranchId` لا
  //  يُقرأ له إطلاقاً، مطابقةً لـ`patient_finance`/`enforceBranchAccess`.
  const branchId = params.isAdmin
    ? (params.requestedBranchId ?? (params.accessBranchId ?? undefined))
    : (params.accessBranchId ?? undefined);

  const current = await summaryFor(branchId ?? undefined, params.start, params.end);

  let comparison: FinancialPeriodFigures | null = null;
  if (params.compare) {
    const prev = previousPeriod(params.start, params.end);
    comparison = await summaryFor(branchId ?? undefined, prev.start, prev.end);
  }

  let byBranch: FinancialSummaryResult["byBranch"] = null;
  if (params.isAdmin && params.requestedBranchId == null) {
    const allBranches = await storage.getBranches();
    byBranch = await Promise.all(allBranches.map(async (b) => ({
      branchId: b.id, branchName: b.name,
      ...(await summaryFor(b.id, params.start, params.end)),
    })));
  }

  return { current, comparison, byBranch };
}
