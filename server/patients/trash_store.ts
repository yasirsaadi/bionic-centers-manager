/**
 * **سلّةُ المرضى** — الحذفُ والاستعادةُ والحذفُ النهائيّ (ترحيل ٠٦٨).
 *
 * ══ القاعدةُ الحاكمة ═══════════════════════════════════════════════════
 * **الحذفُ العاديّ لم يعد يهدم شيئاً.** يُكتب على صفّ المريض ختمُ حذفٍ
 * ومهلةُ استعادةٍ ثلاثين يوماً، **ولا يُمَسّ صفٌّ تابعٌ واحد**: المعايناتُ
 * بأختامها · أوامرُ التصنيع بسجلّها ومراحلها · الدفعاتُ وقيودُ الكلف ·
 * الفواتيرُ والأقساط · المبالغُ المعلَّقة · الحلقاتُ والمتابعات · جهاتُ
 * الاتصال ورمزُ المريض. **ولا نسخةَ أرشيفٍ تُبنى** — الصفوفُ الأصلية هي
 * الحقيقة، وجدولٌ يعيد بناءها يصير مصدرَ حقيقةٍ ثانياً ينحرف عن الأوّل.
 *
 * والاستعادةُ **لا تُعيد بناء شيء**: تمسح حالةَ الحذف، فتعود الصفوفُ
 * نفسُها بمعرّفاتها ومبالغها ورمزِ مريضها.
 *
 * ══ والكاسكيدُ المُختبَر باقٍ كما هو ═════════════════════════════════════
 * `storage.deletePatient` — الهدمُ الحقيقيّ بترتيب مفاتيحه — **لم يُعَد
 * كتابتُه ولا صار حذفاً ناعماً**. صار له بابٌ واحد: «حذف نهائي» للمسؤول
 * العام، من داخل السلّة، بسببٍ مكتوب. فما اختُبر يبقى مختبَراً، ويُنادى
 * حيث يُقصَد الهدمُ فعلاً.
 */

import { sql } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { logAudit } from "../accounting/ledger";
import {
  RESTORE_WINDOW_DAYS, RESTORE_EXPIRED_MESSAGE, GLOBAL_ADMIN_REQUIRED_MESSAGE,
  canTrashPatients, canPurgePatients, canRestorePatients,
  requiresGlobalAdmin, globalAdminReasons, parseReason,
  type TrashFinancialSnapshot, type TrashSessionLike,
} from "@shared/patient_trash";

export class TrashError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export interface TrashActor extends TrashSessionLike {
  displayName?: string | null;
  /** فروعُ الفاعل — `null` للمسؤول العام (كلُّ الفروع). */
  scope: number[] | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ── ① اللقطةُ المالية ────────────────────────────────────────────────────

/**
 * **حالُ الملفّ الماليُّ الآن** — تُحسَب من الجداول الحيّة لا من عمودٍ
 * مخزَّن، وتُعاد داخل معاملة التنفيذ فلا يُنفَّذ قرارٌ على أرقامٍ بائتة.
 *
 * ══ والرصيدُ هو الحسابُ القائم في النظام ═══════════════════════════════
 * `patients.total_cost − SUM(payments.amount)` — نفسُ الصيغة التي يقرأ بها
 * `getAccountingSummary` «الديون المستحقّة» وتقرأ بها صفحةُ المريض
 * «المتبقّي». **ولا صيغةَ تُخترَع لهذه المرحلة**، وإلّا صار للمريض رصيدان.
 *
 * ══ والأعمالُ المالية الحيّة الخمسة ════════════════════════════════════
 * كلٌّ منها **مسارٌ حيٌّ في هذا النظام اليوم** — قُرئ من شيفرته لا خُمِّن:
 *  ① `pending_service_charges` بحالة `pending_review` أو `returned` (٠٦٧).
 *  ② `service_discount_requests` بحالة `pending` (٠٥٨).
 *  ③ `price_change_requests` بحالة `pending` (٠٥٣).
 *  ④ `post_exam_followups` بحالةٍ غير طرفيّة — قرارُ بيعٍ لم يُحسَم (٠٥٣).
 *  ⑤ `administrative_operation_reversals.requires_financial_settlement`
 *     — رصيدٌ للمريض لم يُسوَّ بعد تصحيحٍ إداريّ (٠٦٤).
 */
export async function computeSnapshot(
  patientId: number, tx?: any,
): Promise<TrashFinancialSnapshot> {
  const h = tx ?? db;
  const r = await h.execute(sql`
    SELECT
      COALESCE((SELECT total_cost FROM patients WHERE id = ${patientId}), 0)::int AS total_cost,
      COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = ${patientId}), 0)::int AS total_paid,
      (SELECT COUNT(*) FROM pending_service_charges
        WHERE patient_id = ${patientId} AND status IN ('pending_review', 'returned'))::int AS pending_charges,
      (SELECT COUNT(*) FROM service_discount_requests
        WHERE patient_id = ${patientId} AND status = 'pending')::int AS pending_discounts,
      (SELECT COUNT(*) FROM price_change_requests r
         JOIN post_exam_followups f ON f.id = r.followup_id
        WHERE f.patient_id = ${patientId} AND r.status = 'pending')::int AS pending_price_requests,
      (SELECT COUNT(*) FROM post_exam_followups
        WHERE patient_id = ${patientId}
          AND status NOT IN ('closed_without_purchase', 'converted',
                             'closed_exam_cancelled', 'closed_admin_void'))::int AS open_followups,
      (SELECT COUNT(*) FROM administrative_operation_reversals
        WHERE patient_id = ${patientId} AND requires_financial_settlement IS TRUE)::int AS open_settlements
  `);
  const x: any = (r.rows ?? [])[0] ?? {};
  const totalCost = Number(x.total_cost ?? 0);
  const totalPaid = Number(x.total_paid ?? 0);
  return {
    totalCost, totalPaid, remaining: totalCost - totalPaid,
    pendingCharges: Number(x.pending_charges ?? 0),
    pendingDiscounts: Number(x.pending_discounts ?? 0),
    pendingPriceRequests: Number(x.pending_price_requests ?? 0),
    openFollowups: Number(x.open_followups ?? 0),
    openSettlements: Number(x.open_settlements ?? 0),
  };
}

// ── ② الإذن ──────────────────────────────────────────────────────────────

/** أهذا الفرعُ في نطاق الفاعل؟ `null` = المسؤول العام، فكلُّ الفروع. */
function inScope(actor: TrashActor, branchId: number | null): boolean {
  if (actor.scope === null) return true;
  if (branchId === null) return false;
  return actor.scope.includes(branchId);
}

/**
 * **القرارُ الكامل**: أيستطيع هذا الفاعلُ حذفَ هذا الملفّ بهذه اللقطة؟
 *
 * دالّةٌ واحدة تقرؤها الشاشةُ (لتُظهر أو تشرح) ويقرؤها الخادمُ تحت القفل
 * (ليسمح أو يردّ). **وخيارٌ تعرضه الشاشةُ ثمّ يردّه الخادمُ ليس خياراً بل
 * فخّ** — نفسُ درس نوايا التصحيح الإداريّ.
 */
export function deleteDecision(
  actor: TrashActor, branchId: number | null, snap: TrashFinancialSnapshot,
): { allowed: true } | { allowed: false; status: number; message: string } {
  if (!canTrashPatients(actor)) {
    return { allowed: false, status: 403, message: "حذف الملفات صلاحية إدارية — للمسؤول العام أو مدير الفرع أو الطبيب" };
  }
  if (!inScope(actor, branchId)) {
    return { allowed: false, status: 403, message: "لا يمكنك حذف ملف في فرع آخر" };
  }
  //  **والمسؤولُ العام لا يُمنَع أبداً** — هو المخرجُ لا الحاجز.
  if (actor.isAdmin !== true && requiresGlobalAdmin(snap)) {
    return { allowed: false, status: 409, message: GLOBAL_ADMIN_REQUIRED_MESSAGE };
  }
  return { allowed: true };
}

// ── ③ المعاينةُ قبل الحذف ────────────────────────────────────────────────

export interface TrashPreview {
  patientId: number;
  patientCode: string | null;
  name: string | null;
  branchId: number | null;
  snapshot: TrashFinancialSnapshot;
  needsGlobalAdmin: boolean;
  reasons: string[];
  mayDelete: boolean;
  blockedMessage: string | null;
  restoreWindowDays: number;
}

/**
 * **الأرقامُ من الخادم لا من العميل.** الشاشةُ تعرض ما تقرؤه هنا، والتنفيذُ
 * يعيد حسابَها **تحت القفل** ولا يقبل رقماً من جسم الطلب أبداً.
 */
export async function previewDelete(
  patientId: number, actor: TrashActor,
): Promise<TrashPreview> {
  const p = await storage.getPatient(patientId);
  if (!p) throw new TrashError("المريض غير موجود", 404);
  if (!inScope(actor, p.branchId ?? null)) {
    throw new TrashError("لا يمكنك الاطلاع على ملف في فرع آخر", 403);
  }
  const snapshot = await computeSnapshot(patientId);
  const decision = deleteDecision(actor, p.branchId ?? null, snapshot);
  return {
    patientId, patientCode: p.patientCode ?? null, name: p.name ?? null,
    branchId: p.branchId ?? null,
    snapshot,
    needsGlobalAdmin: requiresGlobalAdmin(snapshot),
    reasons: globalAdminReasons(snapshot),
    mayDelete: decision.allowed,
    blockedMessage: decision.allowed ? null : decision.message,
    restoreWindowDays: RESTORE_WINDOW_DAYS,
  };
}

// ── ④ الحذفُ الناعم ──────────────────────────────────────────────────────

/**
 * **معاملةٌ واحدة**: قفلُ الصفّ · تأكيدُ أنه فعّال · حسابُ اللقطة · قرارُ
 * «أيلزم المسؤولُ العام؟» · إعادةُ فحص الفرع من الصفّ المقفول · الكتابةُ ·
 * التدقيق. فضغطتان متزامنتان تُنتجان حذفاً واحداً، والثانيةُ تُردّ ٤٠٩.
 *
 * **والفرعُ يُقرأ من الصفّ المقفول** لا من قراءةٍ سابقة: قد يُنقَل المريضُ
 * بين المعاينة والتنفيذ، فيحذف مديرُ فرعٍ ملفّاً خرج من نطاقه.
 */
export async function softDeletePatient(params: {
  patientId: number; reason: unknown; actor: TrashActor;
}): Promise<{ patientId: number; deletedAt: string; restoreUntil: string; snapshot: TrashFinancialSnapshot }> {
  const parsed = parseReason(params.reason);
  if (!parsed.ok) throw new TrashError(parsed.error, 400);
  const reason = parsed.value;
  const { patientId, actor } = params;

  return await db.transaction(async (tx: any) => {
    const locked = await tx.execute(sql`
      SELECT id, name, patient_code, branch_id, total_cost, deleted_at
        FROM patients WHERE id = ${patientId} FOR UPDATE
    `);
    const row: any = (locked.rows ?? [])[0];
    if (!row) throw new TrashError("المريض غير موجود", 404);
    //  **الضغطةُ الثانية تُردّ برسالةٍ تقول ما جرى** لا بـ«غير موجود» عارية.
    if (row.deleted_at) throw new TrashError("هذا الملف محذوف بالفعل", 409);

    const branchId = row.branch_id === null || row.branch_id === undefined
      ? null : Number(row.branch_id);
    const snapshot = await computeSnapshot(patientId, tx);
    const decision = deleteDecision(actor, branchId, snapshot);
    if (!decision.allowed) throw new TrashError(decision.message, decision.status);

    //  **المهلةُ يولّدها الخادمُ من ختم الحذف** — لا تُقبل من العميل ولا من
    //  ساعته، وتُقارَن بـ`NOW()` في القاعدة عند الاستعادة.
    const written = await tx.execute(sql`
      UPDATE patients SET
        deleted_at = NOW(),
        restore_until = NOW() + ${`${RESTORE_WINDOW_DAYS} days`}::interval,
        deleted_by_user_id = ${actor.userId ?? null},
        deleted_by_name = ${actor.displayName ?? null},
        deleted_by_role = ${actor.isAdmin === true ? "admin" : (actor.role ?? null)},
        deleted_reason = ${reason},
        deleted_total_cost = ${snapshot.totalCost},
        deleted_total_paid = ${snapshot.totalPaid},
        deleted_remaining = ${snapshot.remaining},
        deleted_pending_json = ${JSON.stringify({
          pendingCharges: snapshot.pendingCharges,
          pendingDiscounts: snapshot.pendingDiscounts,
          pendingPriceRequests: snapshot.pendingPriceRequests,
          openFollowups: snapshot.openFollowups,
          openSettlements: snapshot.openSettlements,
        })}::jsonb,
        deleted_needed_admin = ${requiresGlobalAdmin(snapshot)}
      WHERE id = ${patientId} AND deleted_at IS NULL
      RETURNING deleted_at, restore_until
    `);
    const out: any = (written.rows ?? [])[0];
    //  شرطُ الحالة في `UPDATE` حزامُ أمانٍ فوق القفل — لا نصفَ كتابة.
    if (!out) throw new TrashError("تغيّرت حالة الملف — حدّث الصفحة", 409);

    await logAudit({
      entityType: "patient", entityId: patientId, action: "soft_delete",
      userId: actor.userId ?? null, userName: actor.displayName ?? null,
      branchId, tx,
      oldValues: {
        name: row.name, patientCode: row.patient_code, branchId,
        totalCost: snapshot.totalCost, totalPaid: snapshot.totalPaid,
        remaining: snapshot.remaining,
        pendingCharges: snapshot.pendingCharges,
        pendingDiscounts: snapshot.pendingDiscounts,
        pendingPriceRequests: snapshot.pendingPriceRequests,
        openFollowups: snapshot.openFollowups,
        openSettlements: snapshot.openSettlements,
      },
      newValues: {
        deletedAt: out.deleted_at, restoreUntil: out.restore_until,
        neededGlobalAdmin: requiresGlobalAdmin(snapshot),
      },
      ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null,
      notes: `نقل إلى المحذوفات — ${reason}`,
    });

    return {
      patientId,
      deletedAt: String(out.deleted_at),
      restoreUntil: String(out.restore_until),
      snapshot,
    };
  });
}

// ── ⑤ الاستعادة ──────────────────────────────────────────────────────────

/**
 * **تمسح حالةَ الحذف ولا تبني شيئاً.** المعرّفُ نفسُه · الرمزُ نفسُه ·
 * الحالاتُ والمعايناتُ وأوامرُ التصنيع والحلقاتُ والدفعاتُ وقيودُ الكلف
 * والفواتيرُ واليوميةُ **كلُّها الصفوفُ نفسُها** — لم تُلمَس أصلاً.
 *
 * **والمهلةُ تُقاس بساعة القاعدة**: `NOW() <= restore_until` داخل المعاملة.
 * فساعةُ المتصفّح لا تُستعاد بها ملفّ ولا يُمنَع بها.
 */
export async function restorePatient(params: {
  patientId: number; actor: TrashActor;
}): Promise<{ patientId: number; restoredAt: string }> {
  const { patientId, actor } = params;
  if (!canRestorePatients(actor)) {
    throw new TrashError("استعادة الملفات صلاحية إدارية — للمسؤول العام أو مدير الفرع أو الطبيب", 403);
  }
  return await db.transaction(async (tx: any) => {
    const locked = await tx.execute(sql`
      SELECT id, name, patient_code, branch_id, deleted_at, restore_until,
             deleted_reason, deleted_by_name, deleted_needed_admin,
             (NOW() <= restore_until) AS still_restorable
        FROM patients WHERE id = ${patientId} FOR UPDATE
    `);
    const row: any = (locked.rows ?? [])[0];
    if (!row) throw new TrashError("المريض غير موجود", 404);
    if (!row.deleted_at) throw new TrashError("هذا الملف غير محذوف", 409);
    const branchId = row.branch_id === null || row.branch_id === undefined
      ? null : Number(row.branch_id);
    if (!inScope(actor, branchId)) {
      throw new TrashError("لا يمكنك استعادة ملف في فرع آخر", 403);
    }
    //  **انقضاءُ المدّة يُسقط الاستعادةَ وحدها** — والصفُّ يبقى كما هو،
    //  وبابُه بعدها قرارٌ صريح: «حذف نهائي» أو تركُه.
    if (row.still_restorable !== true) {
      throw new TrashError(RESTORE_EXPIRED_MESSAGE, 409);
    }

    const written = await tx.execute(sql`
      UPDATE patients SET
        deleted_at = NULL, restore_until = NULL,
        deleted_by_user_id = NULL, deleted_by_name = NULL, deleted_by_role = NULL,
        deleted_reason = NULL,
        deleted_total_cost = NULL, deleted_total_paid = NULL, deleted_remaining = NULL,
        deleted_pending_json = NULL, deleted_needed_admin = NULL
      WHERE id = ${patientId} AND deleted_at IS NOT NULL
      RETURNING id
    `);
    if ((written.rows ?? []).length === 0) {
      throw new TrashError("تغيّرت حالة الملف — حدّث الصفحة", 409);
    }

    await logAudit({
      entityType: "patient", entityId: patientId, action: "restore",
      userId: actor.userId ?? null, userName: actor.displayName ?? null,
      branchId, tx,
      //  **سياقُ الحذف السابق يُحفَظ في سطر الاستعادة** — وإلّا ضاع مَن حذف
      //  ولماذا لحظةَ مسحِ الأعمدة، فلا يُقرأ القراران معاً بعد شهور.
      oldValues: {
        deletedAt: row.deleted_at, restoreUntil: row.restore_until,
        deletedReason: row.deleted_reason, deletedByName: row.deleted_by_name,
        neededGlobalAdmin: row.deleted_needed_admin,
      },
      newValues: { name: row.name, patientCode: row.patient_code, branchId },
      ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null,
      notes: `استعادة من المحذوفات (كان سبب الحذف: ${row.deleted_reason ?? "—"})`,
    });

    return { patientId, restoredAt: new Date().toISOString() };
  });
}

// ── ⑥ الحذفُ النهائيّ ────────────────────────────────────────────────────

/**
 * **الفعلُ الوحيدُ في هذا المسار الذي لا رجعةَ فيه** — للمسؤول العام وحده،
 * من داخل السلّة، بسببٍ مكتوب.
 *
 * ولا يُنفَّذ على ملفٍّ فعّال: بابُ الإخراج هو السلّة، ثمّ الهدمُ بقرارٍ
 * ثانٍ منفصل. فلا ضغطةٌ واحدة تمحو ملفّاً حيّاً.
 *
 * **والتدقيقُ يُكتب قبل الهدم**، لأن الكاسكيد يمحو كلَّ ما يمكن أن يُقرأ
 * بعده. و`storage.deletePatient` تفتح معاملتَها — فسطرُ التدقيق مستقلٌّ
 * سابقٌ لها عمداً، وهو ترتيبُ نقطة الحذف القائمة نفسُه.
 */
export async function purgePatient(params: {
  patientId: number; reason: unknown; actor: TrashActor;
}): Promise<{ patientId: number }> {
  const { patientId, actor } = params;
  if (!canPurgePatients(actor)) {
    throw new TrashError("الحذف النهائي للمسؤول العام حصراً", 403);
  }
  const parsed = parseReason(params.reason);
  if (!parsed.ok) throw new TrashError("سبب الحذف النهائي مطلوب", 400);

  const row = await storage.getPatientAnyState(patientId);
  if (!row) throw new TrashError("المريض غير موجود", 404);
  if (!row.deletedAt) {
    throw new TrashError("الحذف النهائي من المحذوفات فقط — انقل الملف إلى المحذوفات أولاً", 409);
  }

  const snapshot = await computeSnapshot(patientId);
  await logAudit({
    entityType: "patient", entityId: patientId, action: "purge",
    userId: actor.userId ?? null, userName: actor.displayName ?? null,
    branchId: row.branchId ?? null,
    oldValues: {
      patient: row,
      financialAtPurge: snapshot,
      deletedAt: row.deletedAt, deletedReason: row.deletedReason,
      deletedByName: row.deletedByName,
    },
    ipAddress: actor.ipAddress ?? null, userAgent: actor.userAgent ?? null,
    notes: `حذف نهائي — ${parsed.value}`,
  });

  //  **الكاسكيدُ المُختبَر نفسُه بلا حرفٍ يتغيّر.**
  await storage.deletePatient(patientId);
  return { patientId };
}

// ── ⑦ قراءةُ السلّة ──────────────────────────────────────────────────────

export interface TrashRow {
  id: number;
  patientCode: string | null;
  name: string | null;
  phone: string | null;
  branchId: number | null;
  branchName: string | null;
  deletedAt: string;
  restoreUntil: string | null;
  deletedByName: string | null;
  deletedByRole: string | null;
  deletedReason: string | null;
  totalCost: number;
  totalPaid: number;
  remaining: number;
  pending: Record<string, number> | null;
  neededGlobalAdmin: boolean | null;
  /** **من ساعة القاعدة** — والخادمُ يعيد الفحص عند الاستعادة. */
  restorable: boolean;
  daysLeft: number;
}

/**
 * **صفوفُ السلّة** — الأحدثُ حذفاً أوّلاً، ضمن نطاق الفاعل.
 *
 * والبحثُ **باسمٍ أو رمزٍ داخل السلّة وحدها** — لا يُخلَط بالبحث العاديّ:
 * السجلُّ يعرض الفعّالين، والسلّةُ تعرض المحذوفين، وخلطُهما يعيد المحذوفَ
 * إلى الشاشة التي أُخرج منها.
 */
export async function listTrash(params: {
  actor: TrashActor; search?: string | null; limit?: number;
}): Promise<TrashRow[]> {
  const { actor } = params;
  if (!canTrashPatients(actor)) throw new TrashError("غير مصرح", 403);
  const scope = actor.scope;
  const scopeClause = scope === null ? sql`TRUE`
    : scope.length === 0 ? sql`FALSE`
      : sql`p.branch_id IN (${sql.join(scope.map((b) => sql`${b}`), sql`, `)})`;
  const q = typeof params.search === "string" ? params.search.trim() : "";
  //  بحثٌ بسيطٌ مقصود: الاسمُ والرمزُ والهاتف. **ولا رتبةَ تشابهٍ ولا
  //  فهارسُ البحث الثقيلة** — السلّةُ عشراتُ صفوفٍ لا عشراتُ آلاف.
  const searchClause = q === "" ? sql`TRUE` : sql`(
    p.name ILIKE ${"%" + q + "%"}
    OR p.patient_code ILIKE ${"%" + q + "%"}
    OR COALESCE(p.phone, '') ILIKE ${"%" + q + "%"}
  )`;
  const limit = Math.min(500, Math.max(1, params.limit ?? 200));

  const r = await db.execute(sql`
    SELECT p.id, p.patient_code, p.name, p.phone, p.branch_id, b.name AS branch_name,
           p.deleted_at, p.restore_until, p.deleted_by_name, p.deleted_by_role,
           p.deleted_reason, p.deleted_total_cost, p.deleted_total_paid,
           p.deleted_remaining, p.deleted_pending_json, p.deleted_needed_admin,
           (NOW() <= p.restore_until) AS restorable,
           GREATEST(0, CEIL(EXTRACT(EPOCH FROM (p.restore_until - NOW())) / 86400))::int AS days_left
      FROM patients p
      LEFT JOIN branches b ON b.id = p.branch_id
     WHERE p.deleted_at IS NOT NULL AND ${scopeClause} AND ${searchClause}
     ORDER BY p.deleted_at DESC
     LIMIT ${limit}
  `);
  return (r.rows ?? []).map((x: any) => ({
    id: Number(x.id),
    patientCode: x.patient_code ?? null,
    name: x.name ?? null,
    phone: x.phone ?? null,
    branchId: x.branch_id === null || x.branch_id === undefined ? null : Number(x.branch_id),
    branchName: x.branch_name ?? null,
    deletedAt: String(x.deleted_at),
    restoreUntil: x.restore_until ? String(x.restore_until) : null,
    deletedByName: x.deleted_by_name ?? null,
    deletedByRole: x.deleted_by_role ?? null,
    deletedReason: x.deleted_reason ?? null,
    totalCost: Number(x.deleted_total_cost ?? 0),
    totalPaid: Number(x.deleted_total_paid ?? 0),
    remaining: Number(x.deleted_remaining ?? 0),
    pending: x.deleted_pending_json ?? null,
    neededGlobalAdmin: x.deleted_needed_admin === null || x.deleted_needed_admin === undefined
      ? null : Boolean(x.deleted_needed_admin),
    restorable: x.restorable === true,
    daysLeft: Number(x.days_left ?? 0),
  }));
}

/** عددُ ما في السلّة — لشارةٍ على القائمة. */
export async function trashCount(actor: TrashActor): Promise<number> {
  if (!canTrashPatients(actor)) return 0;
  const rows = await listTrash({ actor, limit: 500 });
  return rows.length;
}
