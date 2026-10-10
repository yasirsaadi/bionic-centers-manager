// **«استمارة مراجع — علاج طبيعي» مكتملةً** (§4.da — المرحلةُ الثالثة) — قراءةٌ محضة، لا كتابةَ هنا.
//
// تجمع ما في الورقة من مصادره، **كلٌّ من مكانه** — لا نسخةَ ثانية:
//   • حقولُ الاستعلامات و«سبب المراجعة» والإصاباتُ من ملفّ المريض.
//   • المعايناتُ الفعّالة للعلاج الطبيعي (`activeExamSql`) — الأحدثُ أوّلاً — بتشخيصها ووصفتها وملاحظاتها وتقييمها الأوّليّ؛
//     والمعاينةُ القديمة (قبل الاستمارة) خاناتُها الأربع بعناوينها في «ملاحظات الفاحص» (`physioSheetNotesOf`) فلا يضيع منها حرف.
//   • الخطّةُ: أحدثُ خطّةٍ يراها السائل (`planVisibleTo`) — ولمن لا يقرأ الخطط (`canReadPlans`) خانتُها مقفولة. والتقدّمُ من تقييماتها.
//   • المالُ (لمن يرى الدفعات — `sheetMoneyVisible`): كلفةُ القسم ودفعاتُه (`payments.case_id`) كبطاقة القسم، والمُهدى والخصومُ المعتمَدة.
//   • الجلساتُ بحساب تبويب الزيارات نفسِه: `resolvePurchasedSessions` ثمّ `physioSessionRows`.
//   • المراجعاتُ من سجلّ الزيارات (زياراتُ القسم وما لا قسمَ له، كتبويب الزيارات؛ وزيارةُ جهازٍ ليست منها)، ومَن سجّلها،
//     وتحت كلٍّ منها ما دُفع للقسم يومها بالقاعدة الواحدة (`attachPaymentsToVisits`)، والدفعةُ في يومٍ بلا زيارة سطرٌ مستقلّ.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { activeExamSql } from "../medical/active_exam";
import { physioSheetNotesOf } from "@shared/exam_sheet";
import { parseInjuries } from "@shared/case_fields";
import { assessmentSummaryAr, readStoredAssessment } from "@shared/physio_initial_assessment";
import { PLAN_REVIEW_LABELS, PLAN_STATUS_LABELS, planVisibleTo, canReadPlans, type PlanReviewState, type PlanStatus } from "@shared/physio_plans";
import { DECISION_LABELS, goalsPct, type AssessmentDecision, type GoalMark } from "@shared/physio_assessments";
import { resolvePurchasedSessions } from "@shared/pricing";
import { attachPaymentsToVisits } from "@shared/visit_payments";
import { baghdadDayOf } from "@shared/intake_sheet_view";
import { physioSessionRows, type PhysioSheetExam, type PhysioSheetPlan, type PhysioSheetProgress, type PhysioSheetResponse, type PhysioSheetVisit } from "@shared/physio_sheet_view";

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
//  تاريخٌ بصيغةٍ قياسية — النصُّ الخامُ من القاعدة لا يقرؤه متصفّحُ آيفون (كـ`intake_sheet/store.ts`).
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const day = (v: unknown): string | null => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

/** `null` = لا قسمَ علاجٍ طبيعيّ لهذا المريض. */
export async function physioSheetFor(patientId: number, opts: { withMoney: boolean; session: any }): Promise<PhysioSheetResponse | null> {
  const pr = await db.execute(sql`
    SELECT p.patient_code, p.name, p.phone, p.governorate, p.address, p.referral_source, p.referral_sub_source, p.referral_notes,
           p.had_prior_center_history, p.age, p.weight, p.height, p.injury_cause, p.injury_date::text AS injury_date,
           p.injury_date_status, p.general_notes, p.presenting_complaint, p.injuries, p.injury_type, p.injury_area,
           p.created_at, p.is_physiotherapy, p.physio_plan, p.treatment_type, p.total_cost, b.name AS branch_name
      FROM patients p LEFT JOIN branches b ON b.id = p.branch_id
     WHERE p.id = ${patientId} AND p.deleted_at IS NULL
  `);
  const p = (pr.rows ?? [])[0] as Record<string, any> | undefined;
  if (!p) return null;
  const cr = await db.execute(sql`SELECT id, cost FROM patient_cases WHERE patient_id = ${patientId} AND case_type = 'physiotherapy' LIMIT 1`);
  const c = (cr.rows ?? [])[0] as Record<string, any> | undefined;
  if (!c && p.is_physiotherapy !== true) return null;
  const caseId = c ? Number(c.id) : null;

  //  الإصاباتُ صفوفاً — وملفٌّ قديمٌ بنصّين مجموعين يُقرأ منهما.
  let injuries = parseInjuries(p.injuries);
  if (!injuries.length && (str(p.injury_type) || str(p.injury_area))) {
    injuries = [{ type: str(p.injury_type) ?? "", area: str(p.injury_area) ?? "", side: "" }];
  }

  // ══ المعايناتُ ══
  const er = await db.execute(sql`
    SELECT me.id, me.version, me.doctor_name, me.signed_at, me.chief_complaint, me.clinical_findings, me.diagnosis, me.plan, me.notes,
           me.prescription, me.assessment
      FROM medical_exams me
     WHERE me.patient_id = ${patientId} AND me.case_type = 'physiotherapy' AND ${activeExamSql("me")}
     ORDER BY me.signed_at DESC, me.id DESC
  `);
  const exams: PhysioSheetExam[] = ((er.rows ?? []) as Record<string, any>[]).map((e) => {
    const assessment = readStoredAssessment(e.assessment);
    const rx = e.prescription && typeof e.prescription === "object" ? (e.prescription as Record<string, any>) : {};
    const treatments = (Array.isArray(rx.treatments) ? rx.treatments : [])
      .filter((t: any) => t && typeof t.treatmentType === "string" && t.treatmentType.trim())
      .map((t: any) => ({ treatmentType: String(t.treatmentType).trim(), sessionCount: num(t.sessionCount) }));
    const notes = assessment
      ? str(e.notes)
      : str(physioSheetNotesOf({ chiefComplaint: e.chief_complaint, clinicalFindings: e.clinical_findings, plan: e.plan, notes: e.notes }));
    return {
      id: Number(e.id), version: Number(e.version ?? 1), doctorName: String(e.doctor_name ?? ""), signedAt: iso(e.signed_at),
      diagnosis: str(e.diagnosis) ?? str(rx.diseaseType), treatments, notes, assessment, assessmentSummary: assessmentSummaryAr(assessment),
    };
  });

  // ══ الخطّةُ والتقدّم — لمن يقرأ الخطط، وبما يراه منها ══
  const canViewPlan = canReadPlans(opts.session);
  let plan: PhysioSheetPlan | null = null;
  let progress: PhysioSheetProgress | null = null;
  if (canViewPlan) {
    const plr = await db.execute(sql`
      SELECT pl.id, pl.title_ar, pl.sessions_per_week, pl.duration_weeks, pl.session_minutes, pl.total_sessions, pl.status, pl.review_status,
             pl.reviewed_by_name, pl.decided_by_name, pl.created_by_name, pl.created_at, pr.title_ar AS protocol_title
        FROM physio_plans pl LEFT JOIN physio_protocols pr ON pr.id = pl.protocol_id
       WHERE pl.patient_id = ${patientId}
       ORDER BY pl.created_at DESC, pl.id DESC
    `);
    const row = ((plr.rows ?? []) as Record<string, any>[]).find((r) => planVisibleTo(opts.session, String(r.status)));
    if (row) {
      const status = String(row.status) as PlanStatus;
      const review = str(row.review_status) as PlanReviewState | null;
      plan = {
        id: Number(row.id), title: String(row.title_ar ?? ""), protocolName: str(row.protocol_title),
        sessionsPerWeek: num(row.sessions_per_week), durationWeeks: num(row.duration_weeks), sessionMinutes: num(row.session_minutes),
        totalSessions: num(row.total_sessions),
        status, statusLabel: PLAN_STATUS_LABELS[status] ?? status,
        reviewLabel: review ? (PLAN_REVIEW_LABELS[review] ?? review) : null, reviewedByName: str(row.reviewed_by_name),
        decidedByName: str(row.decided_by_name), createdByName: str(row.created_by_name), createdAt: iso(row.created_at),
      };
      const ar = await db.execute(sql`
        SELECT assessed_on, pain, goals, decision FROM physio_assessments WHERE plan_id = ${plan.id} ORDER BY assessed_on, id
      `);
      const as = (ar.rows ?? []) as Record<string, any>[];
      if (as.length) {
        const withPain = as.filter((a) => a.pain !== null && a.pain !== undefined);
        const last = as[as.length - 1];
        progress = {
          firstPain: withPain.length ? Number(withPain[0].pain) : null, firstOn: withPain.length ? day(withPain[0].assessed_on) : null,
          lastPain: withPain.length ? Number(withPain[withPain.length - 1].pain) : null,
          lastOn: withPain.length ? day(withPain[withPain.length - 1].assessed_on) : null,
          count: as.length, goalsPct: goalsPct(Array.isArray(last.goals) ? (last.goals as GoalMark[]) : []),
          lastDecision: DECISION_LABELS[String(last.decision) as AssessmentDecision] ?? null,
        };
      }
    }
  }

  // ══ الدفعاتُ (لمن يرى المال) والجلسات (للجميع — حقيقةٌ سريرية بلا مبلغ) ══
  const payr = await db.execute(sql`
    SELECT id, amount, date, visit_id, case_id, device_episode_id, notes, payment_treatment_type, session_count, is_free_sessions
      FROM payments
     WHERE patient_id = ${patientId} AND (case_id = ${caseId ?? -1} OR case_id IS NULL)
     ORDER BY date, id
  `);
  const pays = (payr.rows ?? []) as Record<string, any>[];
  const vr = await db.execute(sql`
    SELECT v.id, v.visit_date, v.treatment_type, v.details, v.notes, v.case_id, su.display_name AS recorded_by
      FROM visits v LEFT JOIN system_users su ON su.id = v.created_by
     WHERE v.patient_id = ${patientId} AND v.deleted_at IS NULL AND v.device_episode_id IS NULL
       AND (v.case_id = ${caseId ?? -1} OR v.case_id IS NULL)
     ORDER BY v.visit_date, v.id
  `);
  const vrows = (vr.rows ?? []) as Record<string, any>[];

  const purchased = resolvePurchasedSessions({
    plan: Array.isArray(p.physio_plan) ? p.physio_plan : null,
    treatmentTypeText: str(p.treatment_type),
    caseCost: c ? Number(c.cost ?? 0) : Number(p.total_cost ?? 0),
    paymentSessions: pays.map((x) => ({ treatmentType: str(x.payment_treatment_type), sessionCount: num(x.session_count), isFree: x.is_free_sessions === true })),
  });
  const sessions = physioSessionRows(purchased.byType,
    vrows.map((v) => ({ treatmentType: str(v.treatment_type), details: str(v.details), notes: str(v.notes) })));

  const visits: PhysioSheetVisit[] = vrows.map((v) => ({
    id: Number(v.id), kind: "visit", date: iso(v.visit_date), type: str(v.treatment_type), details: str(v.details), notes: str(v.notes),
    recordedBy: str(v.recorded_by), paid: null,
  }));

  let money: PhysioSheetResponse["money"] = null;
  if (opts.withMoney) {
    //  **مالُ القسم دفعاتُه** (`case_id`) — كبطاقة القسم في الملفّ؛ فمجموعُ ما تحت المراجعات = «المدفوع».
    const casePays = caseId === null ? [] : pays.filter((x) => Number(x.case_id) === caseId);
    const { byVisit, unattached } = attachPaymentsToVisits(
      visits.map((v) => ({ id: v.id, date: v.date, caseId: vrows.find((r) => Number(r.id) === v.id)?.case_id ?? null, deviceEpisodeId: null })),
      casePays.map((x) => ({ id: Number(x.id), amount: Number(x.amount ?? 0), date: iso(x.date), visitId: num(x.visit_id), caseId, deviceEpisodeId: null, notes: str(x.notes) })),
    );
    for (const v of visits) { const hit = byVisit.get(v.id); if (hit) v.paid = hit.sum; }
    const days = new Map<string, { sum: number; firstId: number; at: string | null; notes: string[] }>();
    for (const x of unattached) {
      const d = baghdadDayOf(x.date) ?? "—";
      const cur = days.get(d) ?? { sum: 0, firstId: x.id, at: x.date, notes: [] };
      cur.sum += x.amount;
      if (x.notes && !cur.notes.includes(x.notes)) cur.notes.push(x.notes);
      days.set(d, cur);
    }
    for (const d of Array.from(days.values())) {
      visits.push({ id: -d.firstId, kind: "payment", date: d.at, type: null, details: "دفعة", notes: d.notes.join(" · ") || null, recordedBy: null, paid: d.sum });
    }
    visits.sort((x, y) => String(x.date ?? "").localeCompare(String(y.date ?? "")) || x.id - y.id);

    const paid = casePays.reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const total = c ? Number(c.cost ?? 0) : 0;
    const dr = await db.execute(sql`
      SELECT original_price, COALESCE(approved_final_price, proposed_final_price) AS final_price, reason FROM service_discount_requests
       WHERE patient_id = ${patientId} AND department = 'physiotherapy' AND status = 'approved'
       ORDER BY decided_at, id
    `);
    money = {
      total, paid, remaining: total - paid,
      freeSessions: casePays.filter((x) => x.is_free_sessions === true).reduce((s, x) => s + (num(x.session_count) ?? 0), 0),
      discounts: ((dr.rows ?? []) as Record<string, any>[]).map((d) => ({
        originalPrice: Number(d.original_price ?? 0), finalPrice: Number(d.final_price ?? 0), reason: str(d.reason),
      })),
    };
  }

  return {
    patient: {
      patientCode: str(p.patient_code), name: str(p.name), phone: str(p.phone), governorate: str(p.governorate), address: str(p.address),
      referralSource: str(p.referral_source), referralSubSource: str(p.referral_sub_source), referralNotes: str(p.referral_notes),
      hadPriorCenterHistory: typeof p.had_prior_center_history === "boolean" ? p.had_prior_center_history : null,
      age: str(p.age), weight: str(p.weight), height: str(p.height), injuryCause: str(p.injury_cause),
      injuryDate: str(p.injury_date), injuryDateStatus: str(p.injury_date_status), generalNotes: str(p.general_notes),
      presentingComplaint: str(p.presenting_complaint), injuries, registeredAt: iso(p.created_at), branchName: str(p.branch_name),
    },
    caseId, exams, plan, progress, canViewPlan, money, canViewMoney: opts.withMoney, sessions, visits,
  };
}
