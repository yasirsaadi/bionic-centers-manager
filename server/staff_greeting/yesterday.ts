// **إنجازُ الأمس لصاحب التحيّة** (§4.gw — قرارُ المالك ٢٠٢٦-١١-٢٣). قراءةٌ محضة — لا كتابةَ هنا.
//
// كلُّ عددٍ من عمودٍ يقول **مَن فعل** — لا تخمين:
//   registrations   — `audit_log` (`patient`/`create`، `user_id`) والمريضُ خارجَ السلّة. (`patients` بلا عمود مُسجِّل.)
//   payments        — `audit_log` (`payment`/`create`، `user_id`) والدفعةُ قائمةٌ بمبلغٍ موجب (الاسترجاعُ سالب، والمحذوفُ بالتصحيح غائب)،
//                     **وحفظةٌ بأكثر من نوعٍ دفعةٌ واحدة** (سطورُ المريض المتتالية خلال ١٠ ثوانٍ).
//   visits          — `visits.created_by` والزيارةُ والمريضُ غيرُ محذوفين، **بلا زيارات جلسات العلاج الطبيعي**؛ ولحظتُها سطرُ تدقيق
//                     إنشائها إن وُجد (التسجيلُ بتاريخٍ سابق يُكتب اليوم) وإلّا `visit_date` — **وهذا حدٌّ معروف**: أبوابٌ تكتب زيارةً بلا سطر
//                     إنشاء وتقبل يوماً سابقاً (منها «بلا معاينة» — `pending_charges/routes.ts`)، و`visits` بلا `created_at`، فالمؤرَّخةُ
//                     إلى غير يومها تُعدّ ليومها المكتوب (نقصٌ لا عملُ غيره — §4.gw).
//   deliveries · maintenanceDone · stageMoves — `prosthetic_work_history.performed_by` بلحظة السطر، والأمرُ غيرُ ملغى ولا مُبطَل إدارياً.
//   medicalExams · physioExams — `medical_exams.doctor_id` بـ`signed_at`، وبلا الملغاة (`medical_exam_cancellations`).
//   physioSessions  — `physio_plan_sessions.executed_by` بلحظة إنهائها (`created_at`)، وبلا الملغاة.
// والأعمدةُ نوعان (§4.m): `audit_log.created_at` و`visits.visit_date` **بلا منطقة** (قراءةُ UTC)، والباقي `timestamptz` — فلكلٍّ حدّاه.
// ولا يُسأل إلّا عمّا يُعرض لأدوار الحساب (`keys`).
import { sql } from "drizzle-orm";
import { db } from "../db";
import { MAINTENANCE_DONE_STAGES } from "@shared/manufacturing";
import { baghdadDayBounds, EMPTY_YESTERDAY_STATS, type AchievementKey, type YesterdayStats } from "@shared/staff_greeting";

const n = (v: unknown): number => Number(v ?? 0) || 0;

export async function loadDayStats(userId: number, keys: readonly AchievementKey[], ymd: string): Promise<YesterdayStats> {
  const out: YesterdayStats = { ...EMPTY_YESTERDAY_STATS };
  if (!keys.length) return out;
  const { start, end } = baghdadDayBounds(ymd);
  //  حدّا الأعمدة بلا منطقة: لحظةُ UTC مكتوبةً بلا إزاحة.
  const s0 = start.toISOString().slice(0, 23), e0 = end.toISOString().slice(0, 23);
  const sTz = start.toISOString(), eTz = end.toISOString();
  const want = (...ks: AchievementKey[]) => ks.some((k) => keys.includes(k));
  const jobs: Promise<void>[] = [];

  if (want("registrations")) jobs.push((async () => {
    const r = await db.execute(sql`
      SELECT COUNT(DISTINCT a.entity_id)::int AS c
        FROM audit_log a JOIN patients p ON p.id = a.entity_id AND p.deleted_at IS NULL
       WHERE a.entity_type = 'patient' AND a.action = 'create' AND a.user_id = ${userId}
         AND a.created_at >= ${s0}::timestamp AND a.created_at < ${e0}::timestamp`);
    out.registrations = n(r.rows[0]?.c);
  })());

  if (want("payments")) jobs.push((async () => {
    //  **الحفظةُ الواحدة دفعةٌ واحدة**: «إضافة دفعة» بأكثر من نوع علاجٍ طبيعيّ تكتب صفَّ دفعةٍ لكلّ نوع وسطرَ تدقيقٍ لكلٍّ منها
    //  (`POST /api/payments` — `treatmentEntries`) — فسطورُ المريض نفسِه المتتالية للموظّف نفسِه بلا فاصلٍ فوق ١٠ ثوانٍ حفظةٌ واحدة.
    //  والمجموعُ للصفوف كلّها كما هو.
    const r = await db.execute(sql`
      WITH mine AS (
        SELECT DISTINCT ON (pay.id) pay.id, pay.patient_id, pay.amount, a.id AS aid, a.created_at AS at
          FROM audit_log a
          JOIN payments pay ON pay.id = a.entity_id AND pay.amount > 0
          JOIN patients p ON p.id = pay.patient_id AND p.deleted_at IS NULL
         WHERE a.entity_type = 'payment' AND a.action = 'create' AND a.user_id = ${userId}
           AND a.created_at >= ${s0}::timestamp AND a.created_at < ${e0}::timestamp
         ORDER BY pay.id, a.id),
      saves AS (
        SELECT amount, CASE WHEN LAG(patient_id) OVER w = patient_id AND at - LAG(at) OVER w <= interval '10 seconds' THEN 0 ELSE 1 END AS starts
          FROM mine WINDOW w AS (ORDER BY aid))
      SELECT COALESCE(SUM(starts), 0)::int AS c, COALESCE(SUM(amount), 0)::bigint AS total FROM saves`);
    out.payments = n(r.rows[0]?.c);
    out.paymentsSum = n(r.rows[0]?.total);
  })());

  if (want("visits")) jobs.push((async () => {
    //  مجموعتان بلا تداخل (`UNION ALL` — كلٌّ بفهرسه): زيارةٌ لها سطرُ إنشاءٍ أمس ⟵ بلحظته (`idx_audit_entity`)، وزيارةٌ بلا سطر إنشاءٍ
    //  أصلاً ⟵ بـ`visit_date` (`ix_visits_created_by_date`). والزيارةُ بسطرٍ في يومٍ آخر لا تدخل الثانية (`NOT EXISTS` لكلّ صفّ).
    const r = await db.execute(sql`
      WITH ids AS (
        SELECT a.entity_id AS id FROM audit_log a
         WHERE a.entity_type = 'visit' AND a.action = 'create' AND a.user_id = ${userId}
           AND a.created_at >= ${s0}::timestamp AND a.created_at < ${e0}::timestamp
        UNION
        SELECT v.id FROM visits v
         WHERE v.created_by = ${userId} AND v.deleted_at IS NULL
           AND v.visit_date >= ${s0}::timestamp AND v.visit_date < ${e0}::timestamp
           AND NOT EXISTS (SELECT 1 FROM audit_log a2 WHERE a2.entity_type = 'visit' AND a2.entity_id = v.id AND a2.action = 'create'))
      SELECT COUNT(*)::int AS c FROM ids
        JOIN visits v ON v.id = ids.id AND v.created_by = ${userId} AND v.deleted_at IS NULL
        JOIN patients p ON p.id = v.patient_id AND p.deleted_at IS NULL
       WHERE NOT EXISTS (SELECT 1 FROM physio_plan_sessions ps WHERE ps.visit_id = v.id)`);
    out.visits = n(r.rows[0]?.c);
  })());

  if (want("deliveries", "maintenanceDone", "stageMoves")) jobs.push((async () => {
    const done = sql.join(Array.from(MAINTENANCE_DONE_STAGES).map((x) => sql`${x}`), sql`, `);
    const r = await db.execute(sql`
      SELECT COUNT(*) FILTER (WHERE h.action_type = 'delivered')::int AS delivered,
             COUNT(*) FILTER (WHERE h.action_type = 'stage_change' AND h.to_stage IN (${done}))::int AS maint,
             COUNT(*) FILTER (WHERE h.action_type = 'stage_change' AND h.to_stage NOT IN (${done})
                                AND h.to_stage IS DISTINCT FROM h.from_stage)::int AS moves
        FROM prosthetic_work_history h
        JOIN prosthetic_work_orders o ON o.id = h.work_order_id
        JOIN patients p ON p.id = o.patient_id AND p.deleted_at IS NULL
       WHERE h.performed_by = ${userId} AND o.status <> 'cancelled' AND o.admin_void_reversal_id IS NULL
         AND h.created_at >= ${sTz}::timestamptz AND h.created_at < ${eTz}::timestamptz`);
    out.deliveries = n(r.rows[0]?.delivered);
    out.maintenanceDone = n(r.rows[0]?.maint);
    out.stageMoves = n(r.rows[0]?.moves);
  })());

  if (want("medicalExams", "physioExams")) jobs.push((async () => {
    const r = await db.execute(sql`
      SELECT COUNT(*) FILTER (WHERE e.case_type IN ('prosthetic', 'medical_support'))::int AS med,
             COUNT(*) FILTER (WHERE e.case_type = 'physiotherapy')::int AS physio
        FROM medical_exams e JOIN patients p ON p.id = e.patient_id AND p.deleted_at IS NULL
       WHERE e.doctor_id = ${userId}
         AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = e.id)
         AND e.signed_at >= ${sTz}::timestamptz AND e.signed_at < ${eTz}::timestamptz`);
    out.medicalExams = n(r.rows[0]?.med);
    out.physioExams = n(r.rows[0]?.physio);
  })());

  if (want("physioSessions")) jobs.push((async () => {
    //  §4.hc — جلسةُ خطّة Bionic AI بأجزائها: تُعدّ لكلّ مَن سجّل جزءاً منها أمس (مرّةً للجلسة)؛ واليدويةُ لمنفّذها كما كانت.
    const r = await db.execute(sql`
      SELECT COUNT(DISTINCT s.id)::int AS c FROM physio_plan_sessions s
        JOIN patients p ON p.id = s.patient_id AND p.deleted_at IS NULL
       WHERE s.cancelled_at IS NULL
         AND ((s.parts_required IS NULL AND s.executed_by = ${userId} AND s.created_at >= ${sTz}::timestamptz AND s.created_at < ${eTz}::timestamptz)
           OR EXISTS (SELECT 1 FROM physio_plan_session_parts sp WHERE sp.session_id = s.id AND sp.recorded_by = ${userId}
                        AND sp.recorded_at >= ${sTz}::timestamptz AND sp.recorded_at < ${eTz}::timestamptz))`);
    out.physioSessions = n(r.rows[0]?.c);
  })());

  await Promise.all(jobs);
  return out;
}
