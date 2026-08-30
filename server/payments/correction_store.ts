// تصحيحُ الدفعات المحمية — «تحكّمٌ في تصحيح الدفعات: احمِ المال، لا
// الجلسات التشغيلية» (2026-08-29).
//
// ══ التصنيف — قاعدة القسم ب ══════════════════════════════════════════════
// حقولٌ **محمية**: المبلغ، التاريخُ الماليّ، نوعُ العلاج المدفوع، علمُ
// «جلسات مجانية»، وحذفُ الدفعة نفسِها — تغييرُها الفعليّ يفتح تصحيحاً.
// حقلان **مباشران**: الملاحظات وعددُ الجلسات — يبقيان فوريَّين كما كانا،
// ولا يفتحان تصحيحاً ولا يعيدان بناء القيد أبداً، ولو رافقا تغييراً محمياً
// (عندئذٍ يدخلان **نفس** التصحيح لا مساراً منفصلاً — لا حقل يُطبَّق جزئياً
// بينما إخوته المحمية تنتظر).
//
// ══ مَن يطبّق مباشرةً ومَن يقدّم طلباً ═══════════════════════════════════
// المسؤولُ العامّ (`session.isAdmin`) وحده يطبّق فوراً عبر
// `applyPaymentCorrectionDirect`. **كلُّ** مَن سواه يملك صلاحيةَ التعديل أو
// الحذف الحالية (`canEditPayments`/`canDeletePayments`، بما فيهم مديرُ
// الفرع) يقدّم طلباً معلَّقاً عبر `requestPaymentCorrection` — والمديرُ
// **طالبٌ لا معتمِدٌ نهائيّ أبداً**: لا اعتماد ولا رفض إلا للمسؤول العام،
// من `server/payments/correction_routes.ts`.
//
// ══ الكاتبُ الواحد ═══════════════════════════════════════════════════════
// `applyCorrectionWriteTx` هي **الكتابةُ الوحيدة** على صفّ الدفعة تحت هذا
// المسار — ينادِيها البابان: التصحيحُ المباشر للمسؤول، واعتمادُ طلبٍ
// معلَّق. لا نسخةَ ثانية من منطق التحديث أو الحذف أو بناء القيد.
//
// ══ المحاسبة — صارمةٌ لا تُبتلع ═══════════════════════════════════════════
// عكسُ القيدِ القائم (إن وُجد) ثم تطبيقُ الدفعة النهائية ثم إنشاءُ القيد
// الجديد — الثلاثة **داخل معاملةٍ واحدة** عبر `*Tx` من
// `server/accounting/auto_journal.ts`: فشلٌ حقيقيّ يُسقط كلَّ شيء، ويبقى
// الطلبُ معلَّقاً كأن شيئاً لم يقع.
//
// ══ التقادم عند الاعتماد ═════════════════════════════════════════════════
// كلُّ حقلٍ في `beforeSnapshot` (الهويّة والحقول القابلة للتغيير معاً) يُقارَن
// بالحاضر تحت القفل — أيّ انحرافٍ منذ تقديم الطلب ⟶ ٤٠٩ بلا كتابة.
//
// ══ إعادةُ إسناد الحالة — صارمةٌ داخل المعاملة نفسِها (متابعة 2026-08-29)
// ═══════════════════════════════════════════════════════════════════════
// تغييرٌ فعليّ في نوع العلاج المدفوع يعيد إسناد `payments.case_id` **داخل
// نفس معاملة التصحيح** — لا خطوةً بعديةً أطلِق-وانسَ بعد الالتزام. تُنادى
// دالّةُ `storage.reattachPaymentCase` القانونية نفسُها (لا منطقَ إسنادٍ
// موازٍ)، لكن **بتمرير `tx`** فتصير فشلاً صارماً يُسقط المعاملةَ كاملةً —
// القيدَ والدفعةَ وحالةَ الطلب معاً — لا خطأً يُبتلع بصمت. `storage`
// تحتفظ بسلوكها التاريخيّ (أطلِق وانسَ) لكلّ مُستدعٍ آخر لا يمرّر `tx`.

import { db } from "../db";
import { payments, financialCorrectionRequests } from "@shared/schema";
import type { Payment } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { logAudit } from "../accounting/ledger";
import { createJournalForPaymentTx, reverseJournalForPaymentTx } from "../accounting/auto_journal";
import { deviceServiceOfPaymentType } from "@shared/device_attribution";
import { storage } from "../storage";

/** خطأُ عملٍ بحالة HTTP — تُرجعها النقطة كما هي بدل 500. */
export class CorrectionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CorrectionError";
    this.status = status;
  }
}

export type CorrectionActor = {
  userId: number | null;
  userName: string | null;
  role: string | null;
};

/** الحقولُ كما تصل من نافذة التعديل — خامٌّ، `undefined` = «لم يُلمَس». */
export type RawPaymentPatch = {
  amount?: unknown;
  /** YYYY-MM-DD بتوقيت بغداد — نفسُ عقد `customDate` في PATCH القائمة. */
  customDate?: unknown;
  paymentTreatmentType?: unknown;
  isFreeSessions?: unknown;
  notes?: unknown;
  sessionCount?: unknown;
};

/** الحقيبةُ بعد التطبيع — فقط ما وصل وتغيّر فعلاً عن المخزَّن. */
type NormalizedPatch = {
  amount?: number;
  date?: Date;
  paymentTreatmentType?: string | null;
  isFreeSessions?: boolean;
  notes?: string | null;
  sessionCount?: number | null;
};

const PROTECTED_KEYS = ["amount", "date", "paymentTreatmentType", "isFreeSessions"] as const;

function backdatedFromCustomDate(customDate: string): Date {
  // نفسُ حساب PATCH /api/visits/:id و/api/payments/:id القائم حرفياً —
  // لا خوارزميةَ ثانية لتفسير «التاريخ المالي».
  const baghdadOffset = 3 * 60 * 60 * 1000;
  const nowBaghdad = new Date(Date.now() + baghdadOffset);
  const currentHours = nowBaghdad.getUTCHours();
  const currentMinutes = nowBaghdad.getUTCMinutes();
  const currentSeconds = nowBaghdad.getUTCSeconds();
  const [year, month, day] = customDate.split("-").map(Number);
  const backdatedBaghdad = new Date(Date.UTC(year, month - 1, day, currentHours, currentMinutes, currentSeconds));
  return new Date(backdatedBaghdad.getTime() - baghdadOffset);
}

function toBaghdadYMD(d: Date): string {
  const baghdadOffset = 3 * 60 * 60 * 1000;
  return new Date(d.getTime() + baghdadOffset).toISOString().split("T")[0];
}

/**
 * يقارن الحقيبةَ الخام بالمخزَّن **مطبَّعةً**، ويُرجع فقط ما تغيّر فعلاً.
 *
 * «التاريخ الماليّ» يُقارَن بدقّة اليوم ببغداد — إعادةُ إرسال نفس اليوم لا
 * تُنتج قيمةً «متغيّرة» لمجرّد اختلاف وقت اليوم الحاليّ لحظةَ الحساب.
 */
export function diffPaymentPatch(before: Payment, raw: RawPaymentPatch): {
  changed: NormalizedPatch;
  touchesProtected: boolean;
} {
  const changed: NormalizedPatch = {};
  let touchesProtected = false;

  if (raw.amount !== undefined) {
    const n = Number(raw.amount);
    if (!Number.isFinite(n) || n < 0) {
      throw new CorrectionError("المبلغ يجب أن يكون رقماً غير سالب", 400);
    }
    const rounded = Math.round(n);
    if (rounded !== (before.amount ?? 0)) {
      changed.amount = rounded;
      touchesProtected = true;
    }
  }

  if (raw.customDate !== undefined && raw.customDate !== null && String(raw.customDate).trim() !== "") {
    const nextDate = backdatedFromCustomDate(String(raw.customDate));
    const beforeYmd = toBaghdadYMD(before.date ? new Date(before.date as any) : new Date());
    if (toBaghdadYMD(nextDate) !== beforeYmd) {
      changed.date = nextDate;
      touchesProtected = true;
    }
  }

  if (raw.paymentTreatmentType !== undefined) {
    const next = raw.paymentTreatmentType ? String(raw.paymentTreatmentType).trim() || null : null;
    const cur = before.paymentTreatmentType ?? null;
    if (next !== cur) {
      changed.paymentTreatmentType = next;
      touchesProtected = true;
    }
  }

  if (raw.isFreeSessions !== undefined) {
    const next = Boolean(raw.isFreeSessions);
    if (next !== Boolean(before.isFreeSessions)) {
      changed.isFreeSessions = next;
      touchesProtected = true;
    }
  }

  // ── مباشران — يدخلان الحقيبة إن تغيّرا، لكن لا يرفعان `touchesProtected` ─
  if (raw.notes !== undefined) {
    const next = raw.notes ? String(raw.notes).trim() || null : null;
    const cur = before.notes ?? null;
    if (next !== cur) changed.notes = next;
  }
  if (raw.sessionCount !== undefined) {
    const next = raw.sessionCount === null || raw.sessionCount === ""
      ? null
      : Number(raw.sessionCount);
    const cur = before.sessionCount ?? null;
    const normalizedNext = next === null || Number.isNaN(next) ? null : next;
    if (normalizedNext !== cur) changed.sessionCount = normalizedNext;
  }

  return { changed, touchesProtected };
}

/**
 * دفعةٌ مرتبطةٌ بجهاز لا يتغيّر وسمُها إلى خدمةٍ أخرى — نفسُ قاعدة
 * `PATCH /api/payments/:id` القائمة حرفياً (لا إضعافَ لإسناد الجهاز).
 */
export function assertDeviceAttributionCompatible(before: Payment, changed: NormalizedPatch): void {
  if (changed.paymentTreatmentType === undefined) return;
  if (before.deviceEpisodeId == null) return;
  const nextService = deviceServiceOfPaymentType(changed.paymentTreatmentType);
  const currentService = deviceServiceOfPaymentType(before.paymentTreatmentType);
  if (nextService !== currentService) {
    throw new CorrectionError(
      "هذه الدفعة مرتبطة بجهاز محدَّد — لا يمكن تغيير نوعها إلى خدمة أخرى",
      409,
    );
  }
}

function snapshotOf(p: Payment): Record<string, unknown> {
  return {
    patientId: p.patientId,
    branchId: p.branchId,
    amount: p.amount,
    notes: p.notes ?? null,
    paymentTreatmentType: p.paymentTreatmentType ?? null,
    sessionCount: p.sessionCount ?? null,
    isFreeSessions: Boolean(p.isFreeSessions),
    caseId: p.caseId ?? null,
    visitId: (p as any).visitId ?? null,
    invoiceId: (p as any).invoiceId ?? null,
    deviceEpisodeId: p.deviceEpisodeId ?? null,
    date: p.date ? new Date(p.date as any).toISOString() : null,
  };
}

function serializePatch(changed: NormalizedPatch): Record<string, unknown> {
  const out: Record<string, unknown> = { ...changed };
  if (changed.date instanceof Date) out.date = changed.date.toISOString();
  return out;
}

function deserializePatch(raw: Record<string, unknown> | null | undefined): NormalizedPatch {
  const out: NormalizedPatch = { ...(raw ?? {}) } as any;
  if (typeof (raw as any)?.date === "string") out.date = new Date((raw as any).date);
  return out;
}

/** أيّ حقلٍ من اللقطة اختلف عن الحاضر تحت القفل ⟶ تقادمٌ حقيقيّ. */
function isStale(current: Payment, snapshot: Record<string, unknown>): boolean {
  const cur = snapshotOf(current);
  for (const key of Object.keys(snapshot)) {
    if (JSON.stringify((cur as any)[key]) !== JSON.stringify((snapshot as any)[key])) return true;
  }
  return false;
}

/**
 * الكتابةُ الوحيدة على صفّ الدفعة — تحت معاملة المستدعي دائماً.
 * ترتيبٌ ملزَم: (١) عكسُ القيد القائم إن لَمس التصحيحُ حقلاً مالياً · (٢)
 * تطبيقُ الدفعة النهائية · (٣) إعادةُ إسناد الحالة **صارمةً** إن تغيّر
 * نوعُ العلاج فعلاً — تحت نفس `tx`، بلا try يبتلع فشلها · (٤) القيدُ
 * الجديد إن كان المبلغُ موجباً والدفعةُ ليست جلسةً مجانية. فشلٌ حقيقيّ في
 * أيّ خطوةٍ يُسقط المعاملةَ كاملةً — لا نصفَ كتابة.
 */
async function applyCorrectionWriteTx(tx: any, params: {
  before: Payment;
  action: "update" | "delete";
  changed: NormalizedPatch;
  reversedBy: number | null;
}): Promise<{ payment: Payment | null; journalRebuilt: boolean }> {
  const { before, action, changed } = params;
  const touchesJournal = action === "delete"
    || PROTECTED_KEYS.some((k) => (changed as any)[k] !== undefined);

  if (action === "delete") {
    if (touchesJournal) {
      await reverseJournalForPaymentTx(tx, before.id, params.reversedBy, "حذفٌ مصحَّح");
    }
    await tx.delete(payments).where(eq(payments.id, before.id));
    return { payment: null, journalRebuilt: touchesJournal };
  }

  if (touchesJournal) {
    await reverseJournalForPaymentTx(tx, before.id, params.reversedBy, "تصحيحٌ ماليّ");
  }

  const setFields: Record<string, unknown> = {};
  if (changed.amount !== undefined) setFields.amount = changed.amount;
  if (changed.notes !== undefined) setFields.notes = changed.notes;
  if (changed.sessionCount !== undefined) setFields.sessionCount = changed.sessionCount;
  if (changed.paymentTreatmentType !== undefined) setFields.paymentTreatmentType = changed.paymentTreatmentType;
  if (changed.isFreeSessions !== undefined) setFields.isFreeSessions = changed.isFreeSessions;
  if (changed.date !== undefined) setFields.date = changed.date;

  const [updated] = Object.keys(setFields).length > 0
    ? await tx.update(payments).set(setFields).where(eq(payments.id, before.id)).returning()
    : [before];

  // ── إعادةُ إسنادِ الحالة — داخل المعاملة، صارمة ──────────────────────
  // تغييرٌ فعليّ في نوع العلاج المدفوع (لا كلّ لمسٍ للحقل — `changed`
  // موجودةٌ فقط حين اختلفت القيمةُ فعلاً عن المخزَّن، بحكم `diffPaymentPatch`)
  // يستدعي الدالّةَ القانونية نفسَها بتمرير `tx`: لا try هنا، ففشلٌ حقيقيّ
  // يصعد فيُسقط المعاملةَ (القيدَ والدفعةَ وحالةَ الطلب معاً).
  if (changed.paymentTreatmentType !== undefined) {
    await storage.reattachPaymentCase(before.id, before.patientId, changed.paymentTreatmentType, tx);
  }

  if (touchesJournal && updated.amount > 0 && !updated.isFreeSessions) {
    await createJournalForPaymentTx(tx, updated, params.reversedBy);
  }

  return { payment: updated, journalRebuilt: touchesJournal };
}

// ══ الطلبُ المعلَّق — لغير المسؤول العام ═══════════════════════════════

export async function requestPaymentCorrection(params: {
  paymentId: number;
  action: "update" | "delete";
  rawPatch: RawPaymentPatch;
  reason: string;
  actor: CorrectionActor;
  /** `null` = بلا قيدِ فرع (لا يصل هذا المسار عادةً إلا لغير المسؤول). */
  accessibleBranches: number[] | null;
  tx?: any;
}): Promise<{ request: any }> {
  const reason = String(params.reason ?? "").trim();
  if (!reason) throw new CorrectionError("سبب التصحيح مطلوب", 400);

  const body = async (tx: any) => {
    await tx.execute(sql`SELECT id FROM payments WHERE id = ${params.paymentId} FOR UPDATE`);
    const [before] = await tx.select().from(payments).where(eq(payments.id, params.paymentId));
    if (!before) throw new CorrectionError("الدفعة غير موجودة", 404);
    if (params.accessibleBranches !== null && !params.accessibleBranches.includes(before.branchId)) {
      throw new CorrectionError("لا يمكنك تعديل دفعة من فرع آخر", 403);
    }

    let changed: NormalizedPatch = {};
    if (params.action === "update") {
      const diff = diffPaymentPatch(before, params.rawPatch);
      assertDeviceAttributionCompatible(before, diff.changed);
      if (!diff.touchesProtected) {
        throw new CorrectionError("لا يوجد تغييرٌ في حقلٍ محميّ يستدعي تصحيحاً", 400);
      }
      changed = diff.changed;
    }

    const [dup] = await tx.select({ id: financialCorrectionRequests.id })
      .from(financialCorrectionRequests)
      .where(and(
        eq(financialCorrectionRequests.targetType, "payment"),
        eq(financialCorrectionRequests.targetId, params.paymentId),
        eq(financialCorrectionRequests.status, "pending"),
      ));
    if (dup) throw new CorrectionError("يوجد طلبُ تصحيحٍ معلَّق لهذه الدفعة بالفعل", 409);

    const [inserted] = await tx.insert(financialCorrectionRequests).values({
      targetType: "payment",
      targetId: before.id,
      patientId: before.patientId,
      branchId: before.branchId,
      action: params.action,
      beforeSnapshot: snapshotOf(before),
      requestedPatch: params.action === "update" ? serializePatch(changed) : null,
      reason,
      status: "pending",
      requestedBy: params.actor.userId,
      requestedByName: params.actor.userName,
      requestedRole: params.actor.role,
    }).returning();
    return { request: inserted };
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
}

// ══ التطبيقُ المباشر — للمسؤول العامّ وحده ═══════════════════════════════

export async function applyPaymentCorrectionDirect(params: {
  paymentId: number;
  action: "update" | "delete";
  rawPatch: RawPaymentPatch;
  reason: string;
  actor: CorrectionActor;
  tx?: any;
}): Promise<{ payment: Payment | null; before: Payment }> {
  const reason = String(params.reason ?? "").trim();
  if (!reason) throw new CorrectionError("سبب التصحيح مطلوب", 400);

  const body = async (tx: any) => {
    await tx.execute(sql`SELECT id FROM payments WHERE id = ${params.paymentId} FOR UPDATE`);
    const [before] = await tx.select().from(payments).where(eq(payments.id, params.paymentId));
    if (!before) throw new CorrectionError("الدفعة غير موجودة", 404);

    let changed: NormalizedPatch = {};
    if (params.action === "update") {
      const diff = diffPaymentPatch(before, params.rawPatch);
      assertDeviceAttributionCompatible(before, diff.changed);
      if (!diff.touchesProtected) throw new CorrectionError("لا يوجد ما يُصحَّح", 400);
      changed = diff.changed;
    }

    const result = await applyCorrectionWriteTx(tx, {
      before, action: params.action, changed, reversedBy: params.actor.userId,
    });

    await logAudit({
      entityType: "payment",
      entityId: before.id,
      action: params.action,
      userId: params.actor.userId,
      userName: params.actor.userName,
      branchId: before.branchId,
      oldValues: before,
      newValues: result.payment ?? undefined,
      notes: `تصحيحٌ ماليٌّ مباشر من المسؤول العام — ${reason}`,
      tx,
    });

    return { payment: result.payment, before };
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
}

// ══ الاعتماد والرفض — نقاط المسؤول العام في correction_routes.ts ═══════

export async function approveCorrection(params: {
  requestId: number;
  actor: CorrectionActor;
  decisionNote?: string | null;
  tx?: any;
}): Promise<{ request: any; payment: Payment | null }> {
  const body = async (tx: any) => {
    await tx.execute(sql`SELECT id FROM financial_correction_requests WHERE id = ${params.requestId} FOR UPDATE`);
    const [reqRow] = await tx.select().from(financialCorrectionRequests)
      .where(eq(financialCorrectionRequests.id, params.requestId));
    if (!reqRow) throw new CorrectionError("طلب التصحيح غير موجود", 404);
    if (reqRow.status !== "pending") throw new CorrectionError("طلبُ التصحيح لم يعد معلَّقاً", 409);
    if (reqRow.targetType !== "payment") throw new CorrectionError("نوعُ الهدف غير مدعوم", 400);

    await tx.execute(sql`SELECT id FROM payments WHERE id = ${reqRow.targetId} FOR UPDATE`);
    const [current] = await tx.select().from(payments).where(eq(payments.id, reqRow.targetId));
    if (!current) throw new CorrectionError("الدفعة الهدف لم تعد موجودة", 409);

    const snapshot = (reqRow.beforeSnapshot ?? {}) as Record<string, unknown>;
    if (isStale(current, snapshot)) {
      throw new CorrectionError(
        "تغيّرت بيانات الدفعة منذ تقديم الطلب — أُلغي الاعتماد. راجِع الطلب من جديد.",
        409,
      );
    }

    let changed: NormalizedPatch = {};
    if (reqRow.action === "update") {
      changed = deserializePatch(reqRow.requestedPatch as any);
      assertDeviceAttributionCompatible(current, changed);
    }

    const result = await applyCorrectionWriteTx(tx, {
      before: current, action: reqRow.action as "update" | "delete", changed,
      reversedBy: params.actor.userId,
    });

    const [updatedRequest] = await tx.update(financialCorrectionRequests)
      .set({
        status: "approved",
        decidedBy: params.actor.userId,
        decidedByName: params.actor.userName,
        decidedAt: new Date(),
        decisionNote: params.decisionNote ?? null,
        appliedAt: new Date(),
      })
      .where(and(
        eq(financialCorrectionRequests.id, reqRow.id),
        eq(financialCorrectionRequests.status, "pending"),
      ))
      .returning();
    if (!updatedRequest) throw new CorrectionError("تغيّرت حالة الطلب أثناء الاعتماد", 409);

    await logAudit({
      entityType: "payment",
      entityId: current.id,
      action: reqRow.action,
      userId: params.actor.userId,
      userName: params.actor.userName,
      branchId: current.branchId,
      oldValues: current,
      newValues: result.payment ?? undefined,
      notes: `اعتمادُ طلب تصحيحٍ مالي #${reqRow.id} — ${reqRow.reason}`,
      tx,
    });

    return { request: updatedRequest, payment: result.payment };
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
}

export async function rejectCorrection(params: {
  requestId: number;
  actor: CorrectionActor;
  decisionNote?: string | null;
  tx?: any;
}): Promise<{ request: any }> {
  const body = async (tx: any) => {
    await tx.execute(sql`SELECT id FROM financial_correction_requests WHERE id = ${params.requestId} FOR UPDATE`);
    const [reqRow] = await tx.select().from(financialCorrectionRequests)
      .where(eq(financialCorrectionRequests.id, params.requestId));
    if (!reqRow) throw new CorrectionError("طلب التصحيح غير موجود", 404);
    if (reqRow.status !== "pending") throw new CorrectionError("طلبُ التصحيح لم يعد معلَّقاً", 409);

    const [updated] = await tx.update(financialCorrectionRequests)
      .set({
        status: "rejected",
        decidedBy: params.actor.userId,
        decidedByName: params.actor.userName,
        decidedAt: new Date(),
        decisionNote: params.decisionNote ?? null,
      })
      .where(and(
        eq(financialCorrectionRequests.id, reqRow.id),
        eq(financialCorrectionRequests.status, "pending"),
      ))
      .returning();
    if (!updated) throw new CorrectionError("تغيّرت حالة الطلب", 409);
    return { request: updated };
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
}

// ══ قراءةٌ فقط — قائمةُ الاعتماد وشارةُ العدّ ═══════════════════════════

export async function listCorrectionRequests(status?: "pending" | "approved" | "rejected") {
  const q = status
    ? db.select().from(financialCorrectionRequests).where(eq(financialCorrectionRequests.status, status))
    : db.select().from(financialCorrectionRequests);
  return q.orderBy(desc(financialCorrectionRequests.requestedAt));
}

export async function countPendingCorrections(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` })
    .from(financialCorrectionRequests)
    .where(eq(financialCorrectionRequests.status, "pending"));
  return row?.n ?? 0;
}
