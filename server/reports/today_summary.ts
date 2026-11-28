// «ملخص مرضى اليوم» — القراءةُ الخام (§4.gy). قراءةٌ محضة، لا كتابةَ هنا؛ والبناءُ في `shared/today_summary.ts`.
//
// كلُّ حدثٍ بفرع صفّه ويوم بغداد، ومريضُ السلّة غائب. والأعمدةُ نوعان (§4.m): بلا منطقة (`patients.created_at` · `visits.visit_date` ·
// `payments.date` · `audit_log.created_at`) تُقارَن بلحظة UTC مكتوبةً بلا إزاحة، والباقي `timestamptz`؛ وجلسةُ الخطّة بيومها (`session_date`).
// وتخرج اللحظاتُ كلُّها نصّاً ISO بـ`Z` من القاعدة نفسِها — فلا يتوقّف المعنى على منطقة الخادم.
import { PART_LABELS, type PlanPart } from "@shared/physio_plan_assignment";
import { pool } from "../db";
import { storage } from "../storage";
import { baghdadDayBounds } from "@shared/staff_greeting";
import { NON_ATTENDANCE_VISIT_DETAILS } from "@shared/daily_report_scope";
import { sortBranchesForDisplay } from "@shared/branch_order";
import { baghdadTodayYmd } from "@shared/visit_date";
import {
  buildTodayCards, mayViewTodaySummary, parseSummaryDay, type BuildInput, type RawBalance, type RawStatus, type TodayCard, type TodaySummaryTotals,
} from "@shared/today_summary";

const ISO_NAIVE = (col: string) => `to_char(${col}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const ISO_TZ = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const num = (v: unknown): number => Number(v ?? 0) || 0;
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

export interface TodaySummaryResult {
  day: string;
  branchId: number | null;
  branchName: string | null;
  withMoney: boolean;
  totals: TodaySummaryTotals;
  cards: TodayCard[];
}

export async function loadTodaySummary(opts: { day: string; branchId: number | null; withMoney: boolean }): Promise<TodaySummaryResult> {
  const { day, branchId, withMoney } = opts;
  const { start, end } = baghdadDayBounds(day);
  const s0 = start.toISOString().slice(0, 23), e0 = end.toISOString().slice(0, 23);
  const sTz = start.toISOString(), eTz = end.toISOString();
  //  $1 $2 حدّا الأعمدة بلا منطقة · $3 $4 حدّا timestamptz · $5 الفرع (NULL = الكلّ).
  const P = [s0, e0, sTz, eTz, branchId];
  const B = (col: string) => `($5::int IS NULL OR ${col} = $5::int)`;
  const q = async (text: string, params: unknown[] = P) => (await pool.query(text, params)).rows as any[];

  const branchRows = await q(`SELECT id, name, temporarily_closed FROM branches`, []);
  const branchNames: Record<number, string> = Object.fromEntries(branchRows.map((b) => [Number(b.id), String(b.name)]));
  const branchOrder = sortBranchesForDisplay(branchRows.map((b) => ({ id: Number(b.id), name: String(b.name), temporarilyClosed: Boolean(b.temporarily_closed) })))
    .map((b) => b.id);

  const nonAttendance = NON_ATTENDANCE_VISIT_DETAILS as readonly string[];

  const [registrations, visits, sessions, exams, decisions, works, devices, payments] = await Promise.all([
    q(`SELECT p.id AS pid, p.branch_id AS bid, ${ISO_NAIVE("p.created_at")} AS at,
              (SELECT u.display_name FROM audit_log a JOIN system_users u ON u.id = a.user_id
                WHERE a.entity_type = 'patient' AND a.action = 'create' AND a.entity_id = p.id ORDER BY a.id LIMIT 1) AS by
         FROM patients p
        WHERE p.deleted_at IS NULL AND p.created_at >= $1::timestamp AND p.created_at < $2::timestamp AND ${B("p.branch_id")}
          AND $3::text IS NOT NULL AND $4::text IS NOT NULL`),
    q(`SELECT v.patient_id AS pid, v.branch_id AS bid, ${ISO_NAIVE("v.visit_date")} AS at, v.details, v.treatment_type, pc.case_type,
              EXISTS (SELECT 1 FROM physio_plan_sessions ps WHERE ps.visit_id = v.id AND ps.cancelled_at IS NULL) AS is_session
         FROM visits v
         JOIN patients p ON p.id = v.patient_id AND p.deleted_at IS NULL
         LEFT JOIN patient_cases pc ON pc.id = v.case_id
        WHERE v.deleted_at IS NULL AND v.visit_date >= $1::timestamp AND v.visit_date < $2::timestamp AND ${B("v.branch_id")}
          AND COALESCE(v.details, '') <> ALL($6::text[])
          AND $3::text IS NOT NULL AND $4::text IS NOT NULL`, [...P, nonAttendance]),
    //  رقمُ الجلسة في خطّتها: الجلساتُ القائمة حتى هذه (باليوم ثمّ الترتيب) — كما يعدّها التنفيذ.
    //  §4.hc — جلسةُ خطّة Bionic AI بجزأين حدثان: لكلّ جزءٍ ساعتُه ومسجِّلُه.
    q(`SELECT s.patient_id AS pid, s.branch_id AS bid, ${ISO_TZ("COALESCE(sp.recorded_at, s.created_at)")} AS at,
              COALESCE(sp.recorded_by_name, s.executed_by_name) AS executed_by_name, sp.part,
              pl.title_ar, pl.total_sessions,
              (SELECT COUNT(*) FROM physio_plan_sessions s2
                WHERE s2.plan_id = s.plan_id AND s2.cancelled_at IS NULL
                  AND (s2.session_date < s.session_date OR (s2.session_date = s.session_date AND s2.id <= s.id)))::int AS n
         FROM physio_plan_sessions s
         JOIN patients p ON p.id = s.patient_id AND p.deleted_at IS NULL
         LEFT JOIN physio_plans pl ON pl.id = s.plan_id
         LEFT JOIN physio_plan_session_parts sp ON sp.session_id = s.id
        WHERE s.cancelled_at IS NULL AND s.session_date = $6::date AND ${B("s.branch_id")}
          AND $1::text IS NOT NULL AND $2::text IS NOT NULL AND $3::text IS NOT NULL AND $4::text IS NOT NULL`, [...P, day]),
    q(`SELECT e.patient_id AS pid, e.branch_id AS bid, ${ISO_TZ("e.signed_at")} AS at, e.case_type, e.doctor_name,
              e.diagnosis, e.plan, e.chief_complaint
         FROM medical_exams e
         JOIN patients p ON p.id = e.patient_id AND p.deleted_at IS NULL
        WHERE NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = e.id)
          AND e.signed_at >= $3::timestamptz AND e.signed_at < $4::timestamptz AND ${B("e.branch_id")}
          AND $1::text IS NOT NULL AND $2::text IS NOT NULL`),
    q(`SELECT ev.patient_id AS pid, ev.branch_id AS bid, ${ISO_TZ("ev.created_at")} AS at, ev.event_type, ev.reason,
              f.service_type, f.not_bought_reason_text, f.approved_price
         FROM post_exam_followup_events ev
         JOIN post_exam_followups f ON f.id = ev.followup_id
         JOIN patients p ON p.id = ev.patient_id AND p.deleted_at IS NULL
        WHERE ev.event_type IN ('converted','closed_without_purchase','sale_price_corrected','administrative_reversal',
                                'closed_request_cancelled','closed_exam_cancelled')
          AND ev.created_at >= $3::timestamptz AND ev.created_at < $4::timestamptz AND ${B("ev.branch_id")}
          AND $1::text IS NOT NULL AND $2::text IS NOT NULL`),
    q(`SELECT o.patient_id AS pid, o.branch_id AS bid, ${ISO_TZ("h.created_at")} AS at, h.action_type, h.to_stage, h.from_stage, h.notes,
              o.purpose, o.service_type, o.maintenance_component, pu.display_name AS performer, xu.display_name AS expert
         FROM prosthetic_work_history h
         JOIN prosthetic_work_orders o ON o.id = h.work_order_id
         JOIN patients p ON p.id = o.patient_id AND p.deleted_at IS NULL
         LEFT JOIN system_users pu ON pu.id = h.performed_by
         LEFT JOIN system_users xu ON xu.id = o.expert_user_id
        WHERE o.status <> 'cancelled' AND o.admin_void_reversal_id IS NULL
          AND h.created_at >= $3::timestamptz AND h.created_at < $4::timestamptz AND ${B("o.branch_id")}
          AND $1::text IS NOT NULL AND $2::text IS NOT NULL`),
    //  طلبُ الجهاز وبيعُ الجاهز وإلغاءُ الطلب — كلٌّ بلحظته.
    q(`SELECT e.patient_id AS pid, e.branch_id AS bid, x.what, ${ISO_TZ("x.at")} AS at, pc.case_type, e.requested_item, e.component, e.extra_components
         FROM patient_device_episodes e
         JOIN patients p ON p.id = e.patient_id AND p.deleted_at IS NULL
         LEFT JOIN patient_cases pc ON pc.id = e.case_id
         CROSS JOIN LATERAL (VALUES ('opened', e.created_at), ('sold_ready', e.sold_ready_at), ('cancelled', e.cancelled_at)) AS x(what, at)
        WHERE x.at IS NOT NULL AND x.at >= $3::timestamptz AND x.at < $4::timestamptz AND ${B("e.branch_id")}
          AND e.admin_void_reversal_id IS NULL
          AND (x.what = 'cancelled' OR e.cancelled_at IS NULL)
          AND $1::text IS NOT NULL AND $2::text IS NOT NULL`),
    withMoney
      ? q(`SELECT y.patient_id AS pid, y.branch_id AS bid, ${ISO_NAIVE("y.date")} AS at, y.amount, y.is_free_sessions,
                  y.session_count, y.payment_treatment_type, pc.case_type
             FROM payments y
             JOIN patients p ON p.id = y.patient_id AND p.deleted_at IS NULL
             LEFT JOIN patient_cases pc ON pc.id = y.case_id
            WHERE y.date >= $1::timestamp AND y.date < $2::timestamp AND ${B("y.branch_id")}
              AND $3::text IS NOT NULL AND $4::text IS NOT NULL`)
      : Promise.resolve([] as any[]),
  ]);

  const ids = new Set<number>();
  for (const rows of [registrations, visits, sessions, exams, decisions, works, devices, payments]) for (const r of rows) ids.add(Number(r.pid));
  const idList = Array.from(ids);

  const [patients, epRows, maintRows, planRows] = idList.length ? await Promise.all([
    q(`SELECT p.id, p.name, p.patient_code, p.age, ${ISO_NAIVE("p.created_at")} AS created_at,
              (COALESCE(p.had_prior_center_history, false) OR p.patient_classification = 'past') AS prior,
              p.medical_condition, p.amputation_site, p.disease_type, p.support_type, p.injury_type, p.injury_area,
              p.is_amputee, p.is_medical_support, p.is_physiotherapy,
              COALESCE((SELECT array_agg(DISTINCT pc.case_type) FROM patient_cases pc WHERE pc.patient_id = p.id), '{}') AS case_types
         FROM patients p WHERE p.id = ANY($1::int[])`, [idList]),
    //  آخرُ جهازٍ قائم لكلّ (مريض، قسم)، ومعه آخرُ متابعةٍ وأمرُ التصنيع المفتوح.
    q(`SELECT DISTINCT ON (e.patient_id, pc.case_type) e.patient_id AS pid, pc.case_type, e.status,
              (e.sold_ready_at IS NOT NULL) AS sold_ready, f.status AS followup_status, f.not_bought_reason_text,
              o.current_stage AS order_stage, o.status AS order_status
         FROM patient_device_episodes e
         JOIN patient_cases pc ON pc.id = e.case_id
         LEFT JOIN LATERAL (SELECT status, not_bought_reason_text FROM post_exam_followups f
                             WHERE f.device_episode_id = e.id ORDER BY f.id DESC LIMIT 1) f ON true
         LEFT JOIN LATERAL (SELECT current_stage, status FROM prosthetic_work_orders o
                             WHERE o.device_episode_id = e.id AND o.purpose = 'initial_build'
                               AND o.status NOT IN ('cancelled','completed') AND o.admin_void_reversal_id IS NULL
                             ORDER BY o.id DESC LIMIT 1) o ON true
        WHERE e.patient_id = ANY($1::int[]) AND e.cancelled_at IS NULL AND e.admin_void_reversal_id IS NULL
          AND pc.case_type IN ('prosthetic','medical_support')
        ORDER BY e.patient_id, pc.case_type, e.id DESC`, [idList]),
    q(`SELECT o.patient_id AS pid, o.service_type, o.current_stage, o.expected_delivery_date::text AS expected
         FROM prosthetic_work_orders o
        WHERE o.patient_id = ANY($1::int[]) AND o.purpose = 'maintenance'
          AND o.status NOT IN ('cancelled','completed') AND o.admin_void_reversal_id IS NULL
        ORDER BY o.id`, [idList]),
    q(`SELECT DISTINCT ON (pl.patient_id) pl.patient_id AS pid, pl.status, pl.total_sessions,
              (SELECT COUNT(*) FROM physio_plan_sessions s WHERE s.plan_id = pl.id AND s.cancelled_at IS NULL)::int AS done
         FROM physio_plans pl WHERE pl.patient_id = ANY($1::int[])
          AND NOT (pl.origin = 'opus' AND pl.status IN ('draft','pending','returned'))
        ORDER BY pl.patient_id, pl.id DESC`, [idList]),
  ]) : [[], [], [], []];

  const statuses: RawStatus[] = idList.map((pid) => {
    const plan = planRows.find((r) => Number(r.pid) === pid);
    return {
      patientId: pid,
      episodes: epRows.filter((r) => Number(r.pid) === pid).map((r) => ({
        caseType: String(r.case_type), status: String(r.status), followupStatus: strOrNull(r.followup_status),
        notBoughtReason: strOrNull(r.not_bought_reason_text), orderStage: strOrNull(r.order_stage), orderStatus: strOrNull(r.order_status),
        soldReady: Boolean(r.sold_ready),
      })),
      maintenance: maintRows.filter((r) => Number(r.pid) === pid).map((r) => ({
        serviceType: strOrNull(r.service_type), stage: strOrNull(r.current_stage), expected: strOrNull(r.expected),
      })),
      plan: plan ? { status: String(plan.status), total: numOrNull(plan.total_sessions), done: num(plan.done) } : null,
    };
  });

  //  «المتبقي عليه» بفرع البطاقة — مصدرُ «الديون» الرسميّ نفسُه (`getPatientBranchBalances`، §4.bc).
  const balances: RawBalance[] = [];
  if (withMoney && idList.length) {
    const want = new Set(idList);
    const branchesSeen = new Set<number | null>();
    for (const rows of [registrations, visits, sessions, exams, decisions, works, devices, payments]) for (const r of rows) branchesSeen.add(r.bid == null ? null : Number(r.bid));
    for (const b of Array.from(branchesSeen)) {
      const list = await storage.getPatientBranchBalances(b ?? undefined);
      for (const x of list) if (want.has(x.patientId)) balances.push({ patientId: x.patientId, branchId: b, cost: x.cost, paid: x.paid });
    }
  }

  const input: BuildInput = {
    day, withMoney, branchNames, branchOrder,
    patients: patients.map((p) => ({
      id: Number(p.id), name: String(p.name), code: strOrNull(p.patient_code), age: strOrNull(p.age),
      createdAt: String(p.created_at), priorHistory: Boolean(p.prior), caseTypes: (p.case_types ?? []).map(String),
      medicalCondition: p.medical_condition, amputationSite: p.amputation_site, diseaseType: p.disease_type, supportType: p.support_type,
      injuryType: p.injury_type, injuryArea: p.injury_area,
      isAmputee: p.is_amputee, isMedicalSupport: p.is_medical_support, isPhysiotherapy: p.is_physiotherapy,
    })),
    registrations: registrations.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), by: strOrNull(r.by) })),
    visits: visits.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), details: strOrNull(r.details),
      treatmentType: strOrNull(r.treatment_type), caseType: strOrNull(r.case_type), isPlanSession: Boolean(r.is_session) })),
    sessions: sessions.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), number: num(r.n),
      total: numOrNull(r.total_sessions),
      title: r.part ? `${strOrNull(r.title_ar) ?? ""} — جزءُ «${PART_LABELS[r.part as PlanPart] ?? r.part}»` : strOrNull(r.title_ar), executedBy: strOrNull(r.executed_by_name) })),
    exams: exams.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), caseType: strOrNull(r.case_type),
      doctor: strOrNull(r.doctor_name), diagnosis: strOrNull(r.diagnosis), plan: strOrNull(r.plan), complaint: strOrNull(r.chief_complaint) })),
    decisions: decisions.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), eventType: String(r.event_type),
      serviceType: strOrNull(r.service_type), notBoughtReason: strOrNull(r.not_bought_reason_text), reason: strOrNull(r.reason),
      price: numOrNull(r.approved_price) })),
    works: works.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), actionType: String(r.action_type),
      toStage: strOrNull(r.to_stage), fromStage: strOrNull(r.from_stage), notes: strOrNull(r.notes), purpose: strOrNull(r.purpose),
      serviceType: strOrNull(r.service_type), component: strOrNull(r.maintenance_component), performer: strOrNull(r.performer), expert: strOrNull(r.expert) })),
    devices: devices.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), what: r.what,
      caseType: strOrNull(r.case_type), requestedItem: strOrNull(r.requested_item), component: strOrNull(r.component), extras: r.extra_components })),
    payments: payments.map((r) => ({ patientId: Number(r.pid), branchId: numOrNull(r.bid), at: String(r.at), amount: num(r.amount),
      free: Boolean(r.is_free_sessions), sessions: numOrNull(r.session_count), treatmentType: strOrNull(r.payment_treatment_type),
      caseType: strOrNull(r.case_type) })),
    statuses, balances,
  };
  const { cards, totals } = buildTodayCards(input);
  return { day, branchId, branchName: branchId != null ? branchNames[branchId] ?? null : null, withMoney, totals, cards };
}

/**
 * `GET /api/reports/today-summary?date=YYYY-MM-DD&branchId=` — للمسؤول ولمن يحمل مفتاح «ملخص مرضى اليوم» وحده (`mayViewTodaySummary`).
 * غيرُ المسؤول مقفولٌ على فرع جلسته (كالتقرير اليومي)، والمسؤولُ يختار فرعاً أو الكلّ. والمالُ بـ«عرض المدفوعات» (قرارُ المالك ٢٠٢٦-٠٩-٣٠):
 * بلاه لا مبلغَ ولا حدثَ دفعةٍ ولا بطاقةَ «دفعة فقط» — يُحذف لا يُصفَّر.
 */
export function registerTodaySummaryRoutes(app: import("express").Express, isAuthenticated: any) {
  app.get("/api/reports/today-summary", isAuthenticated, async (req: any, res) => {
    try {
      const s = req.session?.branchSession;
      const isAdmin = Boolean(s?.isAdmin);
      if (!mayViewTodaySummary(s)) {
        return res.status(403).json({ message: "ليس لديك صلاحية «ملخص مرضى اليوم» — يمنحها المسؤول" });
      }
      const day = parseSummaryDay(req.query?.date, baghdadTodayYmd());
      if (typeof day !== "string") return res.status(400).json({ message: day.error });
      let branchId: number | null = null;
      if (isAdmin) {
        const qb = req.query?.branchId;
        if (qb !== undefined && qb !== "" && qb !== "0") {
          branchId = Number(qb);
          if (!Number.isInteger(branchId) || branchId <= 0) return res.status(400).json({ message: "معرف الفرع غير صالح" });
        }
      } else {
        if (!s?.branchId) return res.status(403).json({ message: "لا يوجد فرع مرتبط بالمستخدم" });
        branchId = Number(s.branchId);
      }
      const withMoney = isAdmin || s?.permissions?.canViewPayments === true;
      res.json(await loadTodaySummary({ day, branchId, withMoney }));
    } catch (err) {
      console.error("[today-summary] failed:", err);
      res.status(500).json({ message: "تعذّر بناء ملخص مرضى اليوم" });
    }
  });
}
