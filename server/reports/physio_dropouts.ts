//  ══ المنقطعون عن العلاج الطبيعي بعد جلسةٍ أو جلستين أو ثلاث (طلبُ المالك ٢٠٢٦-١٠-٣١، §4.fs) ══════════════════════
//
//  «عدد المرضى الذين أُجريت لهم جلسة أو جلستان أو ثلاث جلسات فقط وتوقّفوا عن متابعة الجلسات — درّب الوكيل داخل التطبيق
//  على هذه المعلومات». فالجوابُ **يُحسب في الخادم حيّاً** لا يُحفَظ رقماً يشيخ: نقطةُ قراءةٍ واحدة يناديها المساعدُ بجلسة
//  السائل (`DESCRIBED` في `server/ai/capabilities/catalog.ts`) بصلاحية التقارير وحدود فرعه.
//
//  ══ التعريفُ — مكتوبٌ في الجواب نفسِه (`rule`) كي يقوله المساعدُ ولا يخترعه ══════════════════════════════════════
//  • **الجلسةُ** زيارةٌ على قسم العلاج الطبيعيّ (`patient_cases.case_type = 'physiotherapy'`) غيرُ محذوفة ولا على جهاز،
//    بقاعدة تبويب الزيارات نفسِها (`isNonSessionVisit`): لا «خدمة جديدة» ولا «استشارة طبية»، ولا علامةُ «إضافة نوع حالة».
//    وزيارةٌ بلا قسمٍ (قديمة) تُحسب لمريضٍ قسمُه الوحيد العلاجُ الطبيعيّ — لا لمريض أطرافٍ أو مساند.
//  • **المنقطعُ**: مريضٌ غيرُ محذوف له من ١ إلى `maxSessions` (٣) جلسة، وآخرُها قبل `inactiveDays` (٣٠) يوماً فأكثر بيوم بغداد.
//  • **وتُستبعد الخطّةُ المغلقة بقرار** — «تخرّج» أو «إيقاف» من الأخصائيّ (`isPlanClosed`) — فتلك نهايةٌ لا انقطاع؛ وعددُها يُقال.
//  • **والفرعُ فرعُ آخر جلسة** — حيث انقطع، فمنه يُتابَع.
//  • **و«اشترى أكثر ممّا حضر»** بحساب ملفّ المريض نفسِه (`resolvePurchasedSessions` ثمّ `physioSessionRows`): جلساتٌ مدفوعةٌ لم تُحضَر.
import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { resolvePurchasedSessions } from "@shared/pricing";
import { physioSessionRows } from "@shared/physio_sheet_view";
import { isPlanClosed } from "@shared/physio_plans";
import { baghdadTodayYmd } from "@shared/visit_date";

export const DROPOUT_DEFAULT_INACTIVE_DAYS = 30;
export const DROPOUT_DEFAULT_MAX_SESSIONS = 3;

export interface DropoutQuery {
  inactiveDays: number;
  maxSessions: number;
  /** يومُ أوّل جلسةٍ من … إلى (يوما بغداد، شاملان) — اختياريّان. */
  from: string | null;
  to: string | null;
  list: boolean;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** قراءةُ الاستعلام — خالصة. خطأٌ ⟵ نصٌّ عربيّ يُردّ ٤٠٠. */
export function parseDropoutQuery(q: Record<string, unknown>): DropoutQuery | { error: string } {
  const int = (v: unknown, def: number, min: number, max: number, label: string): number | string => {
    if (v === undefined || v === null || v === "") return def;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) return `${label} بين ${min} و${max}`;
    return n;
  };
  const inactiveDays = int(q.inactiveDays, DROPOUT_DEFAULT_INACTIVE_DAYS, 7, 730, "أيام الانقطاع");
  if (typeof inactiveDays === "string") return { error: inactiveDays };
  const maxSessions = int(q.maxSessions, DROPOUT_DEFAULT_MAX_SESSIONS, 1, 10, "أكثر عدد جلسات");
  if (typeof maxSessions === "string") return { error: maxSessions };
  const day = (v: unknown): string | null | false => (v === undefined || v === null || v === "" ? null : YMD.test(String(v)) ? String(v) : false);
  const from = day(q.from), to = day(q.to);
  if (from === false || to === false) return { error: "التاريخ بصيغة YYYY-MM-DD" };
  if (from && to && from > to) return { error: "بداية الفترة بعد نهايتها" };
  return { inactiveDays, maxSessions, from, to, list: q.list === "1" || q.list === "true" };
}

export interface DropoutPatient {
  patientId: number;
  patientCode: string;
  name: string;
  branchName: string | null;
  /** عددُ جلساته (١ إلى `maxSessions`). */
  sessions: number;
  firstSessionDay: string;
  lastSessionDay: string;
  daysSinceLastSession: number;
  /** ما اشتراه من جلسات (`null` = لا يُعرف من الملفّ) وما بقي له منها. */
  purchasedSessions: number | null;
  remainingSessions: number;
  /** حالُ آخر خطّةٍ له إن وُجدت (draft · pending · approved · returned) — والمغلقةُ مستبعدة. */
  planStatus: string | null;
}

/** عدٌّ بعدد الجلسات: { "1": … , "2": … , "3": … } والمجموع. */
export function countBySessions(rows: { sessions: number }[], maxSessions: number) {
  const bySessions: Record<string, number> = {};
  for (let k = 1; k <= maxSessions; k++) bySessions[String(k)] = 0;
  for (const r of rows) if (bySessions[String(r.sessions)] !== undefined) bySessions[String(r.sessions)] += 1;
  return { bySessions, total: rows.length };
}

const ymd = (v: unknown): string => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10));
const daysBetween = (a: string, b: string) =>
  Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);
const minusDays = (d: string, n: number) =>
  new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - n * 86_400_000).toISOString().slice(0, 10);

/** الحسابُ كلُّه — `branchId` = `null` لكلّ الفروع (المسؤول وحده). */
export async function physioDropouts(q: DropoutQuery, branchId: number | null, today = baghdadTodayYmd()) {
  const cutoff = minusDays(today, q.inactiveDays);
  const r = await db.execute(sql`
    WITH pcs AS (
      SELECT pc.id AS case_id, pc.patient_id, pc.cost AS case_cost,
             NOT EXISTS (SELECT 1 FROM patient_cases o WHERE o.patient_id = pc.patient_id AND o.case_type <> 'physiotherapy') AS only_physio
        FROM patient_cases pc
        JOIN patients p ON p.id = pc.patient_id AND p.deleted_at IS NULL
       WHERE pc.case_type = 'physiotherapy'
    ), s AS (
      SELECT pcs.patient_id, pcs.case_id, pcs.case_cost, v.id, v.branch_id, COALESCE(v.treatment_type, '') AS treatment_type,
             ((v.visit_date AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Baghdad')::date AS day
        FROM pcs JOIN visits v ON v.patient_id = pcs.patient_id
       WHERE v.deleted_at IS NULL AND v.device_episode_id IS NULL
         AND (v.case_id = pcs.case_id OR (v.case_id IS NULL AND pcs.only_physio))
         AND COALESCE(v.details, '') NOT IN ('خدمة جديدة', 'إضافة نوع حالة')
         AND COALESCE(v.notes, '') NOT LIKE ${"خدمة جديدة:%"}
         AND COALESCE(v.treatment_type, '') <> 'استشارة طبية'
    ), agg AS (
      SELECT patient_id, case_id, max(case_cost) AS case_cost, count(*)::int AS sessions, min(day) AS first_day, max(day) AS last_day,
             (array_agg(branch_id ORDER BY day DESC, id DESC))[1] AS branch_id,
             array_agg(treatment_type ORDER BY day, id) AS types
        FROM s GROUP BY patient_id, case_id
    )
    SELECT a.*, p.name, p.patient_code, p.physio_plan, p.treatment_type AS plan_text, p.total_cost, b.name AS branch_name,
           (SELECT pl.status FROM physio_plans pl WHERE pl.patient_id = a.patient_id ORDER BY pl.id DESC LIMIT 1) AS plan_status
      FROM agg a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN branches b ON b.id = a.branch_id
     WHERE a.sessions BETWEEN 1 AND ${q.maxSessions}
       AND a.last_day <= ${cutoff}::date
       ${branchId !== null ? sql`AND a.branch_id = ${branchId}` : sql``}
       ${q.from ? sql`AND a.first_day >= ${q.from}::date` : sql``}
       ${q.to ? sql`AND a.first_day <= ${q.to}::date` : sql``}
     ORDER BY a.last_day DESC, a.patient_id DESC
  `);
  const rows = (r.rows ?? []) as Record<string, any>[];
  const closed = rows.filter((x) => x.plan_status && isPlanClosed(String(x.plan_status)));
  const open = rows.filter((x) => !(x.plan_status && isPlanClosed(String(x.plan_status))));

  //  ══ ما اشتراه وما بقي — بحساب ملفّ المريض نفسِه ══ (دفعاتُ القسم والبلا قسم، كاستمارة العلاج الطبيعي)
  const pays = new Map<number, { treatmentType: string | null; sessionCount: number | null; isFree: boolean }[]>();
  if (open.length > 0) {
    const pr = await db.execute(sql`
      SELECT patient_id, payment_treatment_type, session_count, is_free_sessions
        FROM payments
       WHERE patient_id IN (${sql.join(open.map((x) => sql`${Number(x.patient_id)}`), sql`, `)})
         AND (case_id IN (${sql.join(open.map((x) => sql`${Number(x.case_id)}`), sql`, `)}) OR case_id IS NULL)
    `);
    for (const x of (pr.rows ?? []) as Record<string, any>[]) {
      const list = pays.get(Number(x.patient_id)) ?? [];
      list.push({ treatmentType: x.payment_treatment_type ?? null, sessionCount: x.session_count == null ? null : Number(x.session_count), isFree: x.is_free_sessions === true });
      pays.set(Number(x.patient_id), list);
    }
  }

  const patients: DropoutPatient[] = open.map((x) => {
    const bought = resolvePurchasedSessions({
      plan: Array.isArray(x.physio_plan) ? x.physio_plan : null,
      treatmentTypeText: x.plan_text ?? null,
      caseCost: x.case_cost != null ? Number(x.case_cost) : Number(x.total_cost ?? 0),
      paymentSessions: pays.get(Number(x.patient_id)) ?? [],
    });
    const types: string[] = Array.isArray(x.types) ? x.types : [];
    const remaining = physioSessionRows(bought.byType, types.map((t) => ({ treatmentType: t || null })))
      .reduce((n, row) => n + Math.max(0, row.remaining), 0);
    const last = ymd(x.last_day);
    return {
      patientId: Number(x.patient_id),
      patientCode: String(x.patient_code ?? ""),
      name: String(x.name ?? ""),
      branchName: x.branch_name ?? null,
      sessions: Number(x.sessions),
      firstSessionDay: ymd(x.first_day),
      lastSessionDay: last,
      daysSinceLastSession: daysBetween(last, today),
      purchasedSessions: bought.source === "none" ? null : bought.total,
      remainingSessions: remaining,
      planStatus: x.plan_status ?? null,
    };
  });

  //  ══ الملخّص بلا مصفوفة ══ طبقةُ القدرات تأخذ أطولَ مصفوفةٍ وتُسقط ما حولها (`shape.ts`)، فالفروعُ كائنٌ لا مصفوفة،
  //  والقائمةُ بـ`list=1` وحدها — فنداءُ الأعداد يصل المساعدَ كاملاً.
  const byBranch: Record<string, ReturnType<typeof countBySessions>> = {};
  for (const name of Array.from(new Set(patients.map((p) => p.branchName ?? "غير محدد")))) {
    byBranch[name] = countBySessions(patients.filter((p) => (p.branchName ?? "غير محدد") === name), q.maxSessions);
  }
  const paidMore = patients.filter((p) => p.remainingSessions > 0);
  const summary = {
    asOf: today,
    rule: {
      maxSessions: q.maxSessions,
      inactiveDays: q.inactiveDays,
      lastSessionOnOrBefore: cutoff,
      firstSessionFrom: q.from,
      firstSessionTo: q.to,
      text: `مرضى العلاج الطبيعي الذين حضروا من 1 إلى ${q.maxSessions} جلسات فقط، وآخرُ جلسةٍ لهم قبل ${q.inactiveDays} يوماً فأكثر`
        + ` (يوم ${cutoff} أو قبله) — بلا المحذوفين، وبلا من أُغلقت خطّتُه بقرار الأخصائيّ (تخرّج أو إيقاف)، والفرعُ فرعُ آخر جلسة.`,
    },
    counts: countBySessions(patients, q.maxSessions),
    paidForMoreThanAttended: { patients: paidMore.length, unattendedSessions: paidMore.reduce((n, p) => n + p.remainingSessions, 0) },
    excludedClosedPlans: closed.length,
    byBranch,
  };
  return q.list ? { ...summary, patients } : summary;
}

export function registerPhysioDropoutRoutes(app: Express, isAuthenticated: any) {
  app.get("/api/reports/physio-dropouts", isAuthenticated, async (req: any, res) => {
    try {
      const s = req.session?.branchSession;
      const isAdmin = Boolean(s?.isAdmin);
      //  بصلاحية «التقرير اليومي للمرضى» نفسِها — عرضُ التقارير.
      if (!isAdmin && !s?.permissions?.canViewReports) {
        return res.status(403).json({ message: "ليس لديك صلاحية عرض التقارير" });
      }
      const q = parseDropoutQuery(req.query ?? {});
      if ("error" in q) return res.status(400).json({ message: q.error });
      let branchId: number | null = null;
      if (isAdmin) {
        const qb = req.query.branchId;
        if (qb !== undefined && qb !== "") {
          branchId = Number(qb);
          if (!Number.isInteger(branchId)) return res.status(400).json({ message: "معرف الفرع غير صالح" });
        }
      } else {
        if (!s?.branchId) return res.status(403).json({ message: "لا يوجد فرع مرتبط بالمستخدم" });
        branchId = Number(s.branchId);
      }
      res.json(await physioDropouts(q, branchId));
    } catch (err) {
      console.error("[physio-dropouts] failed:", err);
      res.status(500).json({ message: "تعذّر حساب المنقطعين عن العلاج الطبيعي" });
    }
  });
}
