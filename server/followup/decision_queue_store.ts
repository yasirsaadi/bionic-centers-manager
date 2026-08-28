// طابورُ «بانتظار الحسم / تم الحسم» — طبقةُ القراءة. (المرحلة الخامسة)
//
// ══ نموذجُ قراءةٍ فوق حقائق قائمة — لا كتابةَ هنا أبداً ═══════════════════
// هذا الملفّ **لا يكتب شيئاً**. الكتابةُ الوحيدة تبقى عبر البابين القائمين
// (`completeReceptionSale`/`completeReceptionNotBought` في `./store.ts`،
// المرحلة الثانية) اللذين يُنادَيان من `/api/followups/:id/complete-sale`
// و`/api/followups/:id/not-bought` — هذا الملفّ يقرأ أثرَهما فقط.
//
// ══ لماذا ملفٌّ مستقلّ لا دوالٌّ تُضاف إلى `store.ts` ═══════════════════════
// `store.ts` (٢٦٠٠+ سطر) طبقةُ الحالة والانتقالات — كلُّ دالّةٍ فيه تقفل
// صفّاً وتكتب. وهذا طابورُ **قراءةٍ فقط**، بشكلٍ مختلف تماماً (فلترةٌ
// بالفرع والتصنيف، ترقيمٌ، عدٌّ دقيق) — فصله يُبقي كلَّ ملفٍّ على مسؤوليةٍ
// واحدة، ويمنع تضخّم `store.ts` أكثر.
//
// ══ مسارُ المعاينة وحده — INNER JOIN لا LEFT ══════════════════════════════
// `isExamPathFollowup` في `store.ts` تنضمّ إلى `patient_device_episodes`
// بـ`JOIN` داخليّ — فمتابعةٌ بلا حلقةٍ (`device_episode_id IS NULL`، ممكنةٌ
// فعلاً: `claimAwaitingEpisodeForExam` قد تُرجع `null`) **ليست** على مسار
// المعاينة بهذا الفحص، رغم أن معاينةً حقيقية وقّعتها. وبما أنّ الأبوابَ
// القانونية (`/complete-sale`, `/not-bought`) لا تقدر أصلاً على حسم صفٍّ
// كهذا (`isExamPathFollowup` تردّه `false`)، فهذا الطابورُ **يطابق الحدَّ
// نفسَه بالضبط**: `JOIN` داخليّ + `service_path = 'exam'` — لا يُعرَض صفٌّ
// كإجراءٍ ممكن إن كانت نقطتُه القانونية ستردّه أصلاً. صفٌّ كهذا يبقى مرئياً
// من ملفّ المريض مباشرةً (المسارُ الموروث لم يُمَسّ).
//
// ══ العدُّ حيٌّ لا مشتقّاً من طول قائمة ═════════════════════════════════════
// كلُّ دالّة عدٍّ هنا `COUNT(*)` من القاعدة. **بلا `LIMIT` افتراضيّ صامت**:
// لو طُلب ترقيمٌ (`limit`/`offset`) يُطبَّق على صفوف العرض فقط، والعدُّ
// الإجماليُّ يبقى استعلاماً مستقلاً لا يتأثّر — فلا يُخفي طابورٌ طويلٌ مريضاً
// عن العدّاد لمجرّد أنه تجاوز صفحةً.

import { sql } from "drizzle-orm";
import { db } from "../db";
import { TERMINAL_STATUSES } from "@shared/followup";
import { parseFieldOwner, type FieldOwner } from "@shared/commercial";

export type DecisionQueueServiceType = "prosthetic" | "medical_support";
export type DecisionQueueResultKind = "bought" | "not_bought";

export interface DecisionQueueScopeFilter {
  /** `null` = مسؤول، كلّ الفروع. مصفوفةٌ فارغة = لا فرعَ يصله (يُردّ صفراً). */
  scope: number[] | null;
  /** فلترةٌ صريحة بفرعٍ واحد — تُفحَص مطابقتُها لـ`scope` في طبقة النقاط. */
  branchId?: number | null;
  serviceType?: DecisionQueueServiceType | null;
  limit?: number;
  offset?: number;
}

const scopeClause = (scope: number[] | null) =>
  scope === null
    ? sql`TRUE`
    : scope.length === 0
      ? sql`FALSE`
      : sql`f.branch_id IN (${sql.join(scope.map((b) => sql`${b}`), sql`, `)})`;

const filterClause = (f: DecisionQueueScopeFilter) => {
  const parts = [scopeClause(f.scope)];
  if (f.branchId != null) parts.push(sql`f.branch_id = ${f.branchId}`);
  if (f.serviceType) parts.push(sql`f.service_type = ${f.serviceType}`);
  return sql.join(parts, sql` AND `);
};

const limitOffsetClause = (f: DecisionQueueScopeFilter) =>
  f.limit != null ? sql`LIMIT ${f.limit} OFFSET ${f.offset ?? 0}` : sql``;

//  «بانتظارٌ» = ليست إحدى الحالات الطرفيّة — نفسُ `isWaitingStatus`
//  (`shared/decision_queue.ts`) لكن كشرطِ SQL: يستحيل تمرير قائمة JS إلى
//  محرّك القاعدة هنا، فتُكتب حرفياً IN (...) بنفس القائمة المصدر الواحد.
const NOT_TERMINAL = sql`f.status NOT IN (${sql.join(
  TERMINAL_STATUSES.map((s) => sql`${s}`), sql`, `,
)})`;

// ── بانتظار الحسم ─────────────────────────────────────────────────────────

export interface DecisionQueueWaitingRow {
  followupId: number;
  patientId: number;
  patientCode: string | null;
  patientName: string;
  branchId: number | null;
  branchName: string | null;
  serviceType: DecisionQueueServiceType;
  examDoctorName: string | null;
  examSignedAt: string | null;
  /** ملاحظاتُ الطبيب من معاينة **هذه المتابعة بعينها** — `null`/فارغة تُخفى. */
  examNotes: string | null;
  // ── تعبئةٌ مسبقة لنافذة «إتمام البيع» — نادرةٌ لكن لا تُطمَس ──────────
  //  صفٌّ لُمس من بابٍ قديم (طلبِ سعرٍ موروث مثلاً) قد يحمل هذه القيم قبل
  //  أن يصل هذا الطابور. **نفسُ حقول `Followup` في `PostExamDecisionCard`**
  //  — لا عقدَ بياناتٍ ثانياً بين الشاشتين اللتين تعرضان الحوارَ نفسَه.
  originalPrice: number | null;
  approvedPrice: number;
  priceKind: string | null;
  selectedExpertUserId: number | null;
  selectedExpertName: string | null;
  // ── لحساب `examPathActions` في طبقة النقاط — **نفسُ الدالّة الحارسة** ──
  //  لا حسابَ ثانياً هنا: هذا الملفّ قراءةٌ خالصة، والحراسةُ تبقى في
  //  `shared/commercial.ts` وحدها. الحقولُ الخام تُمرَّر كما هي.
  status: string;
  purchaseDecisionOwner: FieldOwner | null;
  purchaseDecisionUserId: number | null;
  purchaseDecisionName: string | null;
}

const WAITING_FROM = sql`
    FROM post_exam_followups f
    --  ⚠ JOIN داخليّ عمداً — راجع رأسَ الملفّ.
    JOIN patient_device_episodes de
      ON de.id = f.device_episode_id AND de.service_path = 'exam'
    JOIN patients p ON p.id = f.patient_id AND p.deleted_at IS NULL
    LEFT JOIN branches b ON b.id = f.branch_id
    LEFT JOIN medical_exams e ON e.id = f.medical_exam_id
    LEFT JOIN system_users u ON u.id = f.selected_expert_user_id
`;

const toWaitingRow = (x: any): DecisionQueueWaitingRow => ({
  followupId: Number(x.followup_id),
  patientId: Number(x.patient_id),
  patientCode: x.patient_code ?? null,
  patientName: x.patient_name,
  branchId: x.branch_id === null || x.branch_id === undefined ? null : Number(x.branch_id),
  branchName: x.branch_name ?? null,
  serviceType: x.service_type,
  examDoctorName: x.exam_doctor_name ?? null,
  examSignedAt: x.exam_signed_at ?? null,
  examNotes: x.exam_notes ?? null,
  originalPrice: x.original_price === null || x.original_price === undefined
    ? null : Number(x.original_price),
  approvedPrice: Number(x.approved_price ?? 0),
  priceKind: x.price_kind ?? null,
  selectedExpertUserId: x.selected_expert_user_id === null
    || x.selected_expert_user_id === undefined
    ? null : Number(x.selected_expert_user_id),
  selectedExpertName: x.expert_name ?? null,
  status: x.status,
  purchaseDecisionOwner: parseFieldOwner(x.purchase_decision_owner),
  purchaseDecisionUserId: x.purchase_decision_user_id === null
    || x.purchase_decision_user_id === undefined
    ? null : Number(x.purchase_decision_user_id),
  purchaseDecisionName: x.purchase_decision_name ?? null,
});

/**
 * **طابورُ «بانتظار الحسم»** — الأقدمُ توقيعاً أوّلاً (`f.id` كاسرَ تعادل).
 *
 * والفرزُ من **الحالة الحالية وحدها** (`NOT_TERMINAL`) لا من `purchase_decision`
 * المخزَّنة: صفٌّ أُعيد فتحه بعد «لم يشترِ» يعود بانتظاراً حقيقياً هنا، لا
 * لقطةَ قرارٍ قديمة.
 */
export async function listDecisionQueueWaiting(
  f: DecisionQueueScopeFilter,
): Promise<{ rows: DecisionQueueWaitingRow[]; total: number }> {
  const where = sql`${NOT_TERMINAL} AND ${filterClause(f)}`;
  const countR = await db.execute(sql`SELECT COUNT(*)::int AS n ${WAITING_FROM} WHERE ${where}`);
  const total = Number((countR.rows ?? [])[0]?.n ?? 0);

  const r = await db.execute(sql`
    SELECT f.id AS followup_id, f.patient_id, f.branch_id, f.service_type, f.status,
           p.patient_code, p.name AS patient_name, b.name AS branch_name,
           e.doctor_name AS exam_doctor_name, e.signed_at AS exam_signed_at,
           e.notes AS exam_notes,
           f.original_price, f.approved_price, f.price_kind,
           f.selected_expert_user_id, u.display_name AS expert_name,
           f.purchase_decision_owner, f.purchase_decision_user_id, f.purchase_decision_name
    ${WAITING_FROM}
    WHERE ${where}
    ORDER BY e.signed_at ASC NULLS LAST, f.id ASC
    ${limitOffsetClause(f)}
  `);
  return { rows: (r.rows ?? []).map(toWaitingRow), total };
}

/**
 * **شارةُ الشريط الجانبيّ** — عدٌّ خفيف بلا جلب صفوف، وبلا فلترةٍ محليّة
 * (خدمة/فرع): «عددُ ما ينتظر ضمن نطاقي» فقط — نفسُ نمط شارات المحذوفات
 * والمُعادات للتصحيح.
 */
export async function countDecisionQueueWaiting(scope: number[] | null): Promise<number> {
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS n
      FROM post_exam_followups f
      JOIN patient_device_episodes de
        ON de.id = f.device_episode_id AND de.service_path = 'exam'
      JOIN patients p ON p.id = f.patient_id AND p.deleted_at IS NULL
     WHERE ${NOT_TERMINAL} AND ${scopeClause(scope)}
  `);
  return Number((r.rows ?? [])[0]?.n ?? 0);
}

// ── تم الحسم ──────────────────────────────────────────────────────────────

export interface DecisionQueueResolvedRow {
  followupId: number;
  patientId: number;
  patientCode: string | null;
  patientName: string;
  branchId: number | null;
  branchName: string | null;
  serviceType: DecisionQueueServiceType;
  result: DecisionQueueResultKind;
  /** مَن حسم — **من آخر حدثٍ مطابق**، لا من عمود المالكية المخزَّن. */
  resolvedByName: string | null;
  /** لقطةُ الدور — `null` لحدثٍ سابقٍ للمرحلة الخامسة (تُعرَض «—»). */
  resolvedByRole: string | null;
  resolvedAt: string | null;
  // ── تفاصيلُ «تم الشراء» — `null` لصفٍّ نتيجتُه «لم يشترِ» ─────────────
  originalPrice: number | null;
  approvedPrice: number;
  priceKind: string | null;
  selectedExpertUserId: number | null;
  selectedExpertName: string | null;
  // ── تفاصيلُ «لم يشترِ» ────────────────────────────────────────────────
  notBoughtReasonText: string | null;
}

const RESOLVED_FROM = sql`
    FROM post_exam_followups f
    --  ⚠ JOIN داخليّ عمداً — راجع رأسَ الملفّ.
    JOIN patient_device_episodes de
      ON de.id = f.device_episode_id AND de.service_path = 'exam'
    JOIN patients p ON p.id = f.patient_id AND p.deleted_at IS NULL
    LEFT JOIN branches b ON b.id = f.branch_id
    LEFT JOIN system_users u ON u.id = f.selected_expert_user_id
    --  == الحاسمُ الفعليّ -- آخرُ حدثٍ مطابقٍ للحالة الحالية ==============
    --  لا purchase_decision_owner/purchase_decision_name: تلك تُكتب مرّةً
    --  واحدة بحكم القاعدة (٠٦٦) ولا تتحرّك عند إعادة فتحٍ وحسمٍ ثانٍ --
    --  فتكذب على مَن يقرأ "مَن حسم" بعد إعادة فتح. ونوعُ الحدث يطابق
    --  الحالةَ الحاليّة حرفياً (converted/closed_without_purchase هما
    --  نفسُ نصّ الحالة) فلا حاجةَ لخريطة تحويل.
    LEFT JOIN LATERAL (
      SELECT actor_name, payload, created_at
        FROM post_exam_followup_events
       WHERE followup_id = f.id AND event_type = f.status
       ORDER BY id DESC LIMIT 1
    ) ev ON TRUE
`;

const toResolvedRow = (x: any): DecisionQueueResolvedRow => ({
  followupId: Number(x.followup_id),
  patientId: Number(x.patient_id),
  patientCode: x.patient_code ?? null,
  patientName: x.patient_name,
  branchId: x.branch_id === null || x.branch_id === undefined ? null : Number(x.branch_id),
  branchName: x.branch_name ?? null,
  serviceType: x.service_type,
  result: x.status === "converted" ? "bought" : "not_bought",
  resolvedByName: x.resolved_by_name ?? null,
  resolvedByRole: x.resolved_payload && typeof x.resolved_payload === "object"
    && typeof (x.resolved_payload as any).actorRole === "string"
    ? (x.resolved_payload as any).actorRole
    : null,
  resolvedAt: x.resolved_at ?? null,
  originalPrice: x.original_price === null || x.original_price === undefined
    ? null : Number(x.original_price),
  approvedPrice: Number(x.approved_price ?? 0),
  priceKind: x.price_kind ?? null,
  selectedExpertUserId: x.selected_expert_user_id === null
    || x.selected_expert_user_id === undefined
    ? null : Number(x.selected_expert_user_id),
  selectedExpertName: x.expert_name ?? null,
  notBoughtReasonText: x.not_bought_reason_text ?? null,
});

/**
 * **طابورُ «تم الحسم»** — الأحدثُ حسماً أوّلاً.
 *
 * `converted`/`closed_without_purchase` **حصراً** — لا `closed_exam_cancelled`
 * ولا `closed_admin_void`: تينك واقعتان تاريخيّتان/إداريّتان لا قرارَ شراءٍ
 * من المريض (`shared/decision_queue.ts: RESOLVED_STATUSES`).
 */
export async function listDecisionQueueResolved(
  f: DecisionQueueScopeFilter,
): Promise<{ rows: DecisionQueueResolvedRow[]; total: number }> {
  const where = sql`
    f.status IN ('converted', 'closed_without_purchase') AND ${filterClause(f)}
  `;
  const countR = await db.execute(sql`SELECT COUNT(*)::int AS n ${RESOLVED_FROM} WHERE ${where}`);
  const total = Number((countR.rows ?? [])[0]?.n ?? 0);

  const r = await db.execute(sql`
    SELECT f.id AS followup_id, f.patient_id, f.branch_id, f.service_type, f.status,
           p.patient_code, p.name AS patient_name, b.name AS branch_name,
           f.original_price, f.approved_price, f.price_kind,
           f.selected_expert_user_id, u.display_name AS expert_name,
           f.not_bought_reason_text,
           ev.actor_name AS resolved_by_name, ev.payload AS resolved_payload,
           COALESCE(ev.created_at, f.converted_at, f.closed_at) AS resolved_at
    ${RESOLVED_FROM}
    WHERE ${where}
    ORDER BY COALESCE(ev.created_at, f.converted_at, f.closed_at) DESC, f.id DESC
    ${limitOffsetClause(f)}
  `);
  return { rows: (r.rows ?? []).map(toResolvedRow), total };
}
