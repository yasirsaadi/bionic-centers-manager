// وحدة كتابة أحداث المريض — الكاتب الوحيد لجدول `patient_events`.
//
// ── طبقة سفلية بلا معرفة بالأعمال ────────────────────────────────────────
// هذا الملف يستورد `db` و`@shared/schema` و`@shared/patient_events` وأدوات
// Drizzle **فقط**. لا `storage`، ولا `manufacturing`، ولا `accounting`، ولا
// `medical`، ولا `notifications`. وحدة لا تستورد وحدات الأعمال **لا تستطيع**
// استدعاءها — فالضمان بنيوي لا وعد. ويحرسه اختبار آلي:
// `npm run test:events-purity`.
//
// والاتجاه واحد صارم: الوحدات تكتب أحداثاً، والأحداث لا تكتب في الوحدات ولا
// تُقرأ لاتخاذ قرار. لا مال، ولا رصيد، ولا حالة تصنيع، ولا موعد، ولا حالة
// مريض. سجلٌّ لما حدث، لا أكثر.
//
// ── لماذا المعاملة إلزامية في التوقيع ───────────────────────────────────
// الحدث يجب أن يُودَع مع التغيير التجاري الذي يصفه: إمّا ينجحان معاً أو
// يفشلان معاً. كتابته خارج المعاملة تعني سرداً ناقصاً عند أي فشل، أو حدثاً
// يصف تغييراً لم يقع أصلاً — وكلاهما أسوأ من غياب السجل، لأن سجلاً كاذباً
// يُصدَّق.
//
// ولهذا المعامل الأول نوعه **معاملة** لا قاعدة بيانات: `DbTransaction` تحمل
// `rollback()` التي لا يملكها `db`، فتمرير `db` لا يمرّ من `tsc`. لا يوجد
// تحميل زائد يقبل الاتصال العادي. ويحرسه ملف تحقّق تصريف:
// `server/events/type_guard.check.ts`.

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { patientEvents, type PatientEvent } from "@shared/schema";
import {
  isPatientEventType,
  resolveVisibility,
  type PatientEventType,
  type PatientEventVisibility,
} from "@shared/patient_events";

/**
 * نوع معاملة Drizzle لهذا المشروع. مميّز بنيوياً عن `db` لأنه يحمل
 * `rollback()` — وهذا ما يجعل منع الاستدعاء خارج معاملة فحصَ أنواع لا
 * تعليمةً في تعليق.
 */
export type DbTransaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export interface RecordPatientEventInput {
  patientId: number;
  /** من سجل `shared/patient_events.ts` حصراً. */
  eventType: PatientEventType;
  branchId?: number | null;
  caseId?: number | null;
  caseType?: string | null;
  /** الجدول المصدر: 'work_order' | 'payment' | 'visit' | … بلا مفتاح أجنبي. */
  sourceType?: string | null;
  sourceId?: number | null;
  /** كل ما يلزم لعرض الحدث بلا join. */
  payload?: Record<string, unknown>;
  /**
   * يُشتقّ من سياسة النوع حين لا يُمرَّر. وحين يُمرَّر يُفحَص ضدّها ويُرفض
   * إن خالفها — فنوع `internal_only` لا يصير `patient` بتمريرة.
   */
  visibility?: PatientEventVisibility;
  actorUserId?: number | null;
  actorName?: string | null;
  /**
   * الزمن التجاري. **يجب** أن يحمل تاريخ الواقعة لا لحظة الكتابة حين
   * يختلفان — تسجيل بأثر رجعي مثلاً — وإلا ناقض السرد دفتر الكلف.
   */
  occurredAt?: Date | null;
  /** منع التكرار، بنطاق هذا المريض. انظر `eventDedupeKey`. */
  dedupeKey?: string | null;
}

export interface RecordPatientEventResult {
  /** معرّف الصفّ، أو null حين مُنع التكرار فلم يُكتب شيء. */
  id: number | null;
  /** false تعني: المفتاح مُطالَب به سابقاً لهذا المريض — والحدث موجود. */
  inserted: boolean;
}

/**
 * يكتب حدثاً واحداً **داخل معاملة الاستدعاء**.
 *
 * التكرار ليس خطأ: مفتاح مُطالَب به سابقاً يُرجع `inserted: false` بلا
 * استثناء، لأن إعادة تنفيذ معالج أو ضغطة زرّ مكرَّرة حالة طبيعية متوقَّعة
 * — وإفشال المعاملة التجارية بسببها كان سيقلب حارساً إلى عطل.
 */
export async function recordPatientEvent(
  tx: DbTransaction,
  input: RecordPatientEventInput,
): Promise<RecordPatientEventResult> {
  if (!Number.isFinite(input.patientId) || input.patientId <= 0) {
    throw new Error(`recordPatientEvent: invalid patientId ${String(input.patientId)}`);
  }
  // حارس عند الحدود: نوع خارج السجل يعني نصّاً حرّاً تسلّل، وهو ما يجعل
  // التقارير مستحيلة لاحقاً. يُرفض عند الكتابة لا بعد سنة.
  if (!isPatientEventType(input.eventType)) {
    throw new Error(
      `recordPatientEvent: unknown event type "${String(input.eventType)}" — declare it in shared/patient_events.ts`,
    );
  }

  // السياسة تُفرَض هنا، قبل أي كتابة. تمرير `patient` على نوع
  // `internal_only` (معاينة، وصفة، زيارة) يرمي ولا يُكتب شيء — وإلا صار
  // «الأحداث السريرية لا تصل المريض» أمنيةً لا ضماناً.
  const visibility = resolveVisibility(input.eventType, input.visibility ?? null);

  const dedupeKey = input.dedupeKey?.trim() || null;

  const rows = await tx
    .insert(patientEvents)
    .values({
      patientId: input.patientId,
      branchId: input.branchId ?? null,
      caseId: input.caseId ?? null,
      caseType: input.caseType ?? null,
      eventType: input.eventType,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      payload: input.payload ?? {},
      visibility,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      // `occurredAt` يُمرَّر أو يأخذ الآن. و`createdAt` **لا يُمرَّر أبداً**:
      // زمن الصفّ تكتبه القاعدة، فيبقى شاهداً مستقلاً عن الزمن التجاري.
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      dedupeKey,
    })
    // بلا هدف محدَّد: القيد الوحيد القابل للتصادم هو فهرس منع التكرار
    // (المفتاح الأساسي مولَّد فلا يتصادم). وانتهاك مفتاح أجنبي ليس تصادماً
    // فيظلّ يُرمى كما ينبغي.
    .onConflictDoNothing()
    .returning({ id: patientEvents.id });

  const id = rows[0]?.id ?? null;
  return { id, inserted: id !== null };
}

/** قراءة الجدول الزمني لمريض. قراءة فقط — لا نقطة كتابة على الأحداث. */
export async function listPatientEvents(
  patientId: number,
  opts: { limit?: number; visibility?: PatientEventVisibility } = {},
): Promise<PatientEvent[]> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
  const where = opts.visibility
    ? and(eq(patientEvents.patientId, patientId), eq(patientEvents.visibility, opts.visibility))
    : eq(patientEvents.patientId, patientId);
  return db
    .select()
    .from(patientEvents)
    .where(where)
    .orderBy(desc(patientEvents.occurredAt), desc(patientEvents.id))
    .limit(limit);
}
