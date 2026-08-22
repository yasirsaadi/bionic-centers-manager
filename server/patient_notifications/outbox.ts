// صندوق الصادر — بنية تحتية خالصة.
//
// ══ ما لا تعرفه هذه الوحدة ══════════════════════════════════════════════
// لا تعرف التصنيع، ولا واتساب، ولا نصّ رسالةٍ واحدة. تستحقّ صفوفاً،
// وتُسلّمها لمن يرسل، وتسجّل ما جرى. النصوص في `render.ts`، والإرسال في
// `dispatcher.ts`، والمزوّد في `patient_whatsapp/`.
//
// ══ ولماذا لا تكون داخل `events/store.ts` ═══════════════════════════════
// تلك طبقة سفلية لا تكتب إلا في `patient_events` — يحرسه
// `npm run test:events-purity`. فالاستحقاق يُنشأ من **الجسر** (وحدة تعرف
// الطرفين) داخل معاملة الحدث نفسها، لا من داخل سجلّ الأحداث.
//
// ══ الاستحقاق داخل المعاملة، والإرسال خارجها ═══════════════════════════
// الصفّ يُكتب مع الحدث في معاملة واحدة: فإمّا انتقلت المرحلة **وللمريض
// رسالة مستحقّة**، وإمّا لم يقع شيء. ولا حالة ثالثة يكون فيها حدثٌ بلا
// رسالة لجهةٍ كانت نشطة وقته.
//
// أما الإرسال فبعد `COMMIT` بمسافة: شبكةٌ داخل معاملة تُبقي أقفال صفوف
// التصنيع مفتوحةً بطول مهلة Meta — وفشلُها كان سيتراجع عن نقل المرحلة.
//
// ══ وهذا هو الثابتُ الذي يحرس التسجيل ═══════════════════════════════════
// حفظُ المريض يُثبَّت أوّلاً، والرسالةُ تُستحقّ معه في المعاملة نفسها، ثم
// تُرسَل بعدُ. فانقطاعُ Meta لا يُفشل تسجيلَ مريضٍ أبداً — يؤخّر رسالتَه.

import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  patientContacts, patientNotificationDeliveries as PND,
  type PatientNotificationDelivery,
} from "@shared/schema";
import type { DbTransaction } from "../events/store";

/**
 * **قناةُ تواصل المريض اليوم: واتساب وحدها.**
 *
 * ══ ولماذا ثابتٌ واحد لا سجلُّ نواقل ════════════════════════════════════
 * حملت هذه الوحدة سجلَّ نواقلَ لقناتين أثناء تصميمٍ سابق. والقناةُ الثانية
 * (تلغرام المرضى) **تقاعدت**، فبقاءُ السجلّ كان سيبقي طبقةَ اختيارٍ لا
 * تختار شيئاً — وثمنَ تعقيدٍ يُدفَع اليوم لقنواتٍ متخيَّلة.
 *
 * **والعمودُ `channel` يبقى في الجدول** كما هو: صفوفٌ تاريخية تحمل
 * `telegram` وتبقى مقروءةً للمدقّق، وقناةٌ ثالثة يوماً تجد عمودَها جاهزاً.
 * لكنّ **المدعومَ تشغيلياً واحد** — والقائمةُ البيضاء هنا هي مَن يقول ذلك.
 */
export const SUPPORTED_CHANNELS = ["whatsapp"] as const;
export type DeliveryChannel = (typeof SUPPORTED_CHANNELS)[number];

/** القناةُ الوحيدة التي تُنشأ لها صفوفٌ جديدة. */
export const PATIENT_CHANNEL: DeliveryChannel = "whatsapp";

export function isDeliveryChannel(v: unknown): v is DeliveryChannel {
  return typeof v === "string" && (SUPPORTED_CHANNELS as readonly string[]).includes(v);
}

export type DeliveryStatus = "pending" | "processing" | "sent" | "failed" | "skipped";

/**
 * رموز الفشل — **قائمة مغلقة**. نصّ الخطأ الخام ممنوع: خطأ الشبكة قد يحمل
 * عنوان Bot API وفيه التوكن، فيستقرّ في الجدول ثم في النسخة الاحتياطية.
 * وجسمُ خطأ Graph يحمل `fbtrace_id` ومعرّفاتٍ ورقمَ المستقبِل — بنفس الحكم.
 *
 * **ورموزُ تلغرام تبقى مقروءة**: صفوفٌ تاريخية تحملها، وحذفُها من النوع
 * كان سيجعل قارئَ التقرير يرى رمزاً لا يعرفه النظام.
 */
export type DeliveryErrorCode =
  //  رموزُ تلغرام **للصفوف التاريخية وحدها**: لا يكتبها شيءٌ بعد اليوم،
  //  وحذفُها من النوع كان سيجعل قارئَ تقريرٍ قديم يرى رمزاً لا يعرفه النظام.
  | "telegram_timeout"
  | "telegram_network"
  | "telegram_api_error"
  | "telegram_disabled"
  | "whatsapp_timeout"
  | "whatsapp_network"
  | "whatsapp_api_error"
  | "whatsapp_disabled"
  | "whatsapp_template_error"
  | "render_failed";

/**
 * مهلة الحجز. عاملٌ مات وهو يرسل يترك صفّاً `processing`؛ بعد هذه المدّة
 * يستردّه غيره. وهي أطول من مهلة الإرسال (١٠ ثوانٍ) بهامشٍ واسع كي لا
 * يُنتزع صفٌّ من عاملٍ حيّ لا يزال ينتظر Meta.
 */
export const LEASE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * تباعد المحاولات: دقيقة · ٥ · ١٥ · ساعة · ٦ ساعات — ثم يثبت على الأخيرة.
 *
 * والثبات مقصود لا إهمال: عطلٌ طويل عند Meta أو رقمٌ حظر المركز لا يجوز
 * أن يُسقط الرسالة نهائياً، ولا أن يُعاد كل دقيقة. ست ساعات تعني أربع
 * محاولات في اليوم — تكفي للتعافي ولا تُثقل.
 */
export const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000];

export function backoffFor(attemptCount: number): number {
  const i = Math.min(Math.max(attemptCount - 1, 0), BACKOFF_MS.length - 1);
  return BACKOFF_MS[i]!;
}

export interface EnqueueInput {
  patientId: number;
  /** فارغ لترحيب التسجيل — وهو ليس حدثاً في تاريخ الجهاز. */
  patientEventId?: number | null;
  notificationType: string;
  payload?: Record<string, unknown>;
}

/**
 * يستحقّ رسالةً **لكل جهة اتصال نشطة الآن** على هذه القناة.
 *
 * ── لا سجلّ رجعي ────────────────────────────────────────────────────────
 * «النشطة الآن» هي كل القاعدة: مَن يربط حسابه اليوم لا يستلم أحداث الشهر
 * الماضي، لأن صفوفها لم تُنشأ له أصلاً — لا لأن مرشِّحاً يستبعدها لاحقاً.
 * الغياب هنا أمتن من الترشيح.
 *
 * ── والتكرار ممنوع مرّتين ───────────────────────────────────────────────
 * `ON CONFLICT DO NOTHING` على فهرس (حدث، جهة)، ومعه امتناع المستدعي عن
 * النداء حين لا يُدرَج الحدث أصلاً. فإعادة تشغيل مسارٍ ما لا تُنتج رسالة
 * ثانية ولا خطأً.
 */
export async function enqueueForActiveContacts(
  tx: DbTransaction,
  input: EnqueueInput,
): Promise<number> {
  // **كلُّ جهةٍ نشطة بقناتها هي** — والقناةُ تُقرأ من الصفّ لا تُفترَض.
  // ومريضٌ يحمل جهةَ تلغرامٍ تاريخيةً لا تُستحقّ لها رسالة: قناتُها ليست
  // في القائمة البيضاء، فتُسقَط هنا صراحةً لا بالمصادفة.
  const contacts = await tx.select({
    id: patientContacts.id,
    channel: patientContacts.channel,
  })
    .from(patientContacts)
    .where(and(
      eq(patientContacts.patientId, input.patientId),
      isNull(patientContacts.revokedAt),
    ));

  // وقناةٌ غيرُ مدعومة لا يُكتب لها صفٌّ لن يُرسَل أبداً.
  const deliverable = contacts.filter((c) => isDeliveryChannel(c.channel));
  if (deliverable.length === 0) return 0;

  const rows = deliverable.map((c) => ({
    patientId: input.patientId,
    patientEventId: input.patientEventId ?? null,
    patientContactId: c.id,
    // **قناةُ الجهة نفسها** — تُنسَخ إلى الصفّ فيصير هو المرجع بعدها.
    channel: c.channel,
    notificationType: input.notificationType,
    payload: input.payload ?? {},
  }));

  const inserted = await tx.insert(PND).values(rows)
    .onConflictDoNothing()
    .returning({ id: PND.id });
  return inserted.length;
}

/**
 * يستحقّ رسالةً لجهة اتصال **واحدة بعينها** — مسارُ ترحيب التسجيل.
 *
 * **والقناةُ تُقرأ من صفّ الجهة** لا تُمرَّر ولا تُفترَض: المستدعي يعرف أيَّ
 * جهةٍ يخاطب، ولا يجوز أن يقرّر أيّ قناةٍ هي — فتمريرُها كان سيسمح بصفّ
 * واتسابٍ لجهة تلغرام.
 */
export async function enqueueForContact(
  runner: DbTransaction | typeof db,
  input: EnqueueInput & { patientContactId: number },
): Promise<number | null> {
  const [contact] = await (runner as any).select({ channel: patientContacts.channel })
    .from(patientContacts)
    .where(eq(patientContacts.id, input.patientContactId))
    .limit(1);
  if (!contact || !isDeliveryChannel(contact.channel)) return null;

  const [row] = await (runner as any).insert(PND).values({
    patientId: input.patientId,
    patientEventId: input.patientEventId ?? null,
    patientContactId: input.patientContactId,
    channel: contact.channel,
    notificationType: input.notificationType,
    payload: input.payload ?? {},
  }).onConflictDoNothing().returning({ id: PND.id });
  return row?.id ?? null;
}

/**
 * يحجز صفوفاً مستحقّة ويعيدها.
 *
 * ── لماذا `FOR UPDATE SKIP LOCKED` ──────────────────────────────────────
 * عاملان يقرآن الطابور في اللحظة نفسها: بلا هذا يختاران الصفّ نفسه
 * فتُرسَل الرسالة مرّتين. و`SKIP LOCKED` تجعل الثاني **يتخطّى** ما حجزه
 * الأول بدل أن ينتظره — فلا ازدواج ولا توقّف.
 *
 * والحجز والاختيار في جملة واحدة: قراءةٌ ثم تحديثٌ منفصل هو check-then-act،
 * وبينهما تسع نافذةٌ يقرأ فيها عاملٌ آخر الصفّ نفسه.
 *
 * ويشمل الاختيار **المحجوز المنسيّ**: صفٌّ `processing` مضى على ختمه أكثر
 * من المهلة يعني عاملاً مات وهو يرسل — فيُستردّ بدل أن يعلق إلى الأبد.
 *
 * ── ولا يُحجَز ما لا ناقلَ له ────────────────────────────────────────────
 * `channels` هي القنواتُ التي يملك العاملُ ناقلاً مُعدّاً لها الآن. وصفٌّ
 * خارجها **لا يُلمَس**: لا يُحجَز ولا يُخطّى ولا يُعدّ فشلاً — يبقى `pending`
 * حتى يُضبط ناقلُه.
 *
 * ── ولا ما لا قالبَ له — **قبل `LIMIT` لا بعده** ────────────────────────
 * `types` تصفيةُ نوعٍ تدخل **جملة الاختيار نفسَها**، فلا يبلغ الحاجزَ صفٌّ
 * قالبُه غيرُ مُعدّ.
 *
 * ══ ولماذا لا تكفي التصفيةُ بعد الحجز ══════════════════════════════════
 * **تجويعٌ حقيقيّ لا نظريّ.** الدفعةُ عشرون، والترتيبُ بالأقدم. فمركزٌ لم
 * يعتمد قالبَ الترحيب بعدُ وعنده ثلاثون ترحيباً مستحقّاً وتحديثُ تصنيعٍ
 * واحد خلفها: كلُّ دورةٍ تحجز العشرين الأولى (كلُّها ترحيب)، تعيدها، وتنتهي.
 * **وتحديثُ التصنيع لا يبلغ الدفعةَ أبداً** — مريضٌ ينتظر جهازه لا يصله خبر
 * لأن قالبَ ترحيبٍ لا يخصّه لم يُعتمَد.
 *
 * فالتصفيةُ في SQL: الصفوفُ غيرُ المؤهَّلة **لا تُقرأ ولا تُقفَل ولا تستهلك
 * سعةَ الدفعة**، وتبقى `pending` بـ٠ محاولات — والمؤهَّلُ خلفها يُحجَز.
 *
 * و`types` ثلاثةُ أشكال: `null` = بلا تصفية · `{ only }` = هذه وحدها ·
 * `{ except }` = كلُّ ما عداها. والشكلُ الثالث ضروريّ لأن «التحديث» فئةٌ
 * مفتوحة (كلُّ نوعٍ ليس ترحيباً)، فلا تُعدّ أنواعُها ولا تُنسَخ قائمتُها.
 */
export type TypeFilter = { only: readonly string[] } | { except: readonly string[] } | null;

export async function claimDue(
  limit = 20,
  channels: readonly string[] = SUPPORTED_CHANNELS,
  types: TypeFilter = null,
): Promise<PatientNotificationDelivery[]> {
  if (channels.length === 0) return [];
  if (types && "only" in types && types.only.length === 0) return [];
  const staleBefore = new Date(Date.now() - LEASE_TIMEOUT_MS);
  const channelList = sql.join(channels.map((c) => sql`${c}`), sql`, `);
  const typeClause = !types ? sql``
    : "only" in types
      ? sql` AND notification_type IN (${sql.join(types.only.map((t) => sql`${t}`), sql`, `)})`
      : types.except.length === 0 ? sql``
        : sql` AND notification_type NOT IN (${sql.join(types.except.map((t) => sql`${t}`), sql`, `)})`;
  return await db.transaction(async (tx) => {
    // القفل والتحديث في معاملة واحدة: القفل يصمد حتى الحفظ، فلا نافذة بين
    // «اخترتُ» و«حجزتُ» يقرأ فيها عاملٌ آخر الصفّ نفسه.
    const picked = await (tx as any).execute(sql`
      SELECT id FROM patient_notification_deliveries
       WHERE channel IN (${channelList})${typeClause}
         AND ((status IN ('pending', 'failed') AND next_attempt_at <= NOW())
           OR (status = 'processing' AND locked_at < ${staleBefore}))
       ORDER BY next_attempt_at
       FOR UPDATE SKIP LOCKED
       LIMIT ${limit}
    `);
    // `Number` مقصود: الـSQL الخام يعيد BIGINT نصّاً، وDrizzle يعيده رقماً.
    // خلطهما كان يجعل المقارنة تفشل صامتةً.
    const ids = ((picked.rows ?? []) as any[]).map((r) => Number(r.id));
    if (ids.length === 0) return [];

    // والتحديث بـDrizzle لا بالخام: فتعود الصفوف بأسمائها المعروفة وأنواعها
    // الصحيحة (jsonb مفكوكاً، وBIGINT رقماً). صفوفٌ خام هنا كانت تجعل
    // `patientContactId` غير معرَّف فتُخطّى كل رسالة بصمت.
    return await tx.update(PND)
      .set({ status: "processing", lockedAt: new Date(), updatedAt: new Date() })
      .where(inArray(PND.id, ids))
      .returning();
  });
}

export async function markSent(id: number): Promise<void> {
  await db.update(PND).set({
    status: "sent", sentAt: new Date(), lockedAt: null,
    lastErrorCode: null, updatedAt: new Date(),
  }).where(eq(PND.id, id));
}

/** يُخطّى بلا محاولة أخرى — جهةٌ سُحبت مثلاً. ليس فشلاً فلا يُعاد. */
export async function markSkipped(id: number, code?: DeliveryErrorCode | null): Promise<void> {
  await db.update(PND).set({
    status: "skipped", lockedAt: null,
    lastErrorCode: code ?? null, updatedAt: new Date(),
  }).where(eq(PND.id, id));
}

export async function markFailed(
  id: number,
  attemptCount: number,
  code: DeliveryErrorCode,
): Promise<void> {
  const next = attemptCount + 1;
  await db.update(PND).set({
    status: "failed",
    attemptCount: next,
    nextAttemptAt: new Date(Date.now() + backoffFor(next)),
    lockedAt: null,
    lastErrorCode: code,
    updatedAt: new Date(),
  }).where(eq(PND.id, id));
}

/** جهة الاتصال **لحظة الإرسال** — لا نسخة مخزَّنة عنها في الصادر. */
export async function contactForDelivery(contactId: number): Promise<
  { id: number; channel: string; externalId: string; revokedAt: Date | null } | null
> {
  const [row] = await db.select({
    id: patientContacts.id,
    channel: patientContacts.channel,
    externalId: patientContacts.externalId,
    revokedAt: patientContacts.revokedAt,
  }).from(patientContacts).where(eq(patientContacts.id, contactId)).limit(1);
  return row ?? null;
}

/** للاختبارات والتشخيص — لا يُستدعى من مسار إنتاج. */
export async function deliveriesForPatient(patientId: number): Promise<PatientNotificationDelivery[]> {
  return db.select().from(PND).where(eq(PND.patientId, patientId)).orderBy(PND.id);
}

export { PND as deliveriesTable };
export const DELIVERY_STATUSES: DeliveryStatus[] = ["pending", "processing", "sent", "failed", "skipped"];
export { and, eq, inArray, isNull, lte, or };
