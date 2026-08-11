// هوية تواصل المريض — إنشاء تذاكر الربط واستهلاكها.
//
// ══ ما لا يعنيه الربط ═══════════════════════════════════════════════════
// وجود `patient_contact` بقناة `telegram` يعني شيئاً واحداً: **هذا الحساب
// رُبِط بهذا الملفّ.** ولا يعني — ولا واحداً منها:
//
//   • أن رقم هاتف تلغرام يساوي `patients.phone`
//   • أن مالك الحساب هو المريض نفسه
//   • أن ملكية الرقم مُتحقَّق منها
//   • أن تحقّق Telegram Gateway جرى
//   • أن مطابقة مشاركة جهة الاتصال جرت
//
// هذه حقائق مختلفة، ولا حقل هنا يدّعي واحدة منها. ومَن يضيف لاحقاً حقلاً
// اسمه `verified` فليُعرّف أولاً **ماذا** تحقّق وبأي دليل — وإلا صار الاسم
// وحده مصدر ثقة لا تسنده واقعة.
//
// ══ ولا إرسال هنا ═══════════════════════════════════════════════════════
// هذا الملفّ لا يعرف تلغرام ولا يتصل بشبكة. يولّد تذكرة ويستهلكها ويربط
// حساباً — والقناة التي يصل بها الرابط إلى المريض مرحلةٌ أخرى لم تبدأ.

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  patientContacts, patientLinkTokens, patients,
  type PatientContact, type PatientLinkToken,
} from "@shared/schema";
import type { DbTransaction } from "../events/store";

// ══ المفردات ═════════════════════════════════════════════════════════════

/** القنوات المدعومة اليوم. العمود نصّي ليتّسع، والتحقّق هنا. */
export const CONTACT_CHANNELS = ["telegram"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

/**
 * صلة صاحب الحساب بالمريض. تُحسم **عند إنشاء الرابط** لا عند استهلاكه:
 * الموظّف يعرف مَن يعطيه الرابط، والمستهلِك لا يُصدَّق في وصف نفسه.
 */
export const CONTACT_RELATIONS = ["self", "guardian", "family", "caregiver", "other"] as const;
export type ContactRelation = (typeof CONTACT_RELATIONS)[number];

export function isContactChannel(v: unknown): v is ContactChannel {
  return typeof v === "string" && (CONTACT_CHANNELS as readonly string[]).includes(v);
}
export function isContactRelation(v: unknown): v is ContactRelation {
  return typeof v === "string" && (CONTACT_RELATIONS as readonly string[]).includes(v);
}

/** المهلة الافتراضية: خمس عشرة دقيقة. قابلة للتمرير للاختبارات. */
export const DEFAULT_TOKEN_TTL_MS = 15 * 60 * 1000;

// ══ أخطاء مصنَّفة ════════════════════════════════════════════════════════
// نصوصها **لا تحمل النصّ الأصلي للتذكرة أبداً** — رسالة الخطأ تُسجَّل وتُعرَض
// وتُرسَل، فأي تسريب فيها تسريبٌ في كل هذه المواضع.

export type LinkTokenFailure = "not_found" | "expired" | "revoked" | "already_consumed";

export class LinkTokenError extends Error {
  readonly reason: LinkTokenFailure;
  constructor(reason: LinkTokenFailure) {
    super(`patient link token rejected: ${reason}`);
    this.name = "LinkTokenError";
    this.reason = reason;
  }
}

// ══ التذكرة ══════════════════════════════════════════════════════════════

/**
 * بصمة التذكرة. SHA-256 على النصّ الخام.
 *
 * لا مِلح ولا تشديد: النصّ ٣٢ بايت عشوائية من `randomBytes`، فمجاله يفوق
 * أي هجوم قاموس أو جدول جاهز. والتشديد (bcrypt ونحوه) يُبطئ **بحثنا نحن**
 * بلا مكسب — البحث هنا بالبصمة نفسها، والمِلح كان سيمنعه أصلاً.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

/**
 * مقارنة ثابتة الزمن للبصمتين. البحث في القاعدة يتمّ بالبصمة مباشرةً،
 * لكن أي مقارنة في الشيفرة تمرّ من هنا كي لا يتسرّب شيء عبر زمن التنفيذ.
 */
export function tokenHashEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8"), bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export interface CreatedLinkToken {
  /**
   * النصّ الخام — **يُعاد مرّة واحدة فقط ولا يُخزَّن**. مَن يفقده يُصدر
   * غيره؛ ولا سبيل لاستخراجه من القاعدة لأنه ليس فيها.
   */
  rawToken: string;
  token: PatientLinkToken;
}

export interface CreateLinkTokenInput {
  patientId: number;
  channel: ContactChannel;
  relation: ContactRelation;
  createdByUserId?: number | null;
  /** بالمللي ثانية. الافتراض ١٥ دقيقة. */
  ttlMs?: number;
}

/**
 * يولّد تذكرة ربط. ٣٢ بايت عشوائية بترميز base64url — آمنة في المسارات
 * وفي روابط التطبيقات بلا ترميز إضافي.
 */
export async function createLinkToken(
  input: CreateLinkTokenInput,
  tx?: DbTransaction,
): Promise<CreatedLinkToken> {
  if (!Number.isFinite(input.patientId) || input.patientId <= 0) {
    throw new Error(`createLinkToken: invalid patientId ${String(input.patientId)}`);
  }
  if (!isContactChannel(input.channel)) {
    throw new Error(`createLinkToken: unsupported channel "${String(input.channel)}"`);
  }
  if (!isContactRelation(input.relation)) {
    throw new Error(`createLinkToken: unknown relation "${String(input.relation)}"`);
  }

  const rawToken = randomBytes(32).toString("base64url");
  const ttl = input.ttlMs ?? DEFAULT_TOKEN_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  const runner = tx ?? db;
  const [token] = await runner.insert(patientLinkTokens).values({
    patientId: input.patientId,
    channel: input.channel,
    relation: input.relation,
    // البصمة وحدها. النصّ الخام لا يغادر هذه الدالّة إلا في المُخرَج.
    tokenHash: hashToken(rawToken),
    expiresAt,
    createdByUserId: input.createdByUserId ?? null,
  }).returning();

  return { rawToken, token };
}

/**
 * سحب تذكرة **معلَّقة**. تُرجع `false` إن لم يكن هناك ما يُسحَب.
 *
 * والمستهلَكة ليست منها: التذكرة التي أدّت عملها وأنشأت جهة اتصال حدثٌ
 * وقع، وختمها بـ`revoked_at` يقلب معناها في السجل من «رُبِط بها حساب»
 * إلى «أُلغيت» — فيقرأ المدقّق لاحقاً تاريخاً لم يحدث. السحب يُلغي
 * المستقبل ولا يُنكِر الماضي، فمَن أراد فكّ الربط يسحب **جهة الاتصال**
 * (`revokeContact`) لا التذكرة.
 *
 * ولا خطأ يُرمى: «لا يوجد ما يُسحَب» ليس فشلاً — والمسحوبة سلفاً تُرجع
 * `false` أيضاً، فالنداء idempotent.
 */
export async function revokeLinkToken(tokenId: number): Promise<boolean> {
  const rows = await db.update(patientLinkTokens)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(patientLinkTokens.id, tokenId),
      isNull(patientLinkTokens.revokedAt),
      isNull(patientLinkTokens.consumedAt),
    ))
    .returning({ id: patientLinkTokens.id });
  return rows.length > 0;
}

// ══ الاستهلاك والربط — عملية واحدة ذرّية ═════════════════════════════════

export interface RedeemResult {
  contact: PatientContact;
  token: PatientLinkToken;
  /** false تعني: الحساب كان مرتبطاً بهذا المريض **بنفس الصلة**، فأُعيدت جهته. */
  createdContact: boolean;
  /**
   * الجهة السابقة التي خُتمت لأن صلتها اختلفت عن صلة التذكرة — إن حدث.
   * وجودها يعني أن الصلة تغيّرت، وأن الصفّ القديم باقٍ في الجدول تاريخاً.
   */
  supersededContact?: PatientContact;
}

/**
 * يستهلك التذكرة **ويربط الحساب في معاملة واحدة**.
 *
 * ── لماذا القفل ─────────────────────────────────────────────────────────
 * التذكرة لمرّة واحدة، ونقرتان متزامنتان على الرابط نفسه واقعةٌ متوقَّعة لا
 * نادرة. فحص «هل استُهلكت؟» ثم الكتابة بلا قفل هو check-then-act: كلاهما
 * يقرأ «لا» فيمرّان. `SELECT … FOR UPDATE` يسلسلهما، والثاني يجد
 * `consumed_at` مملوءاً فيُردّ — بلا جهة اتصال ثانية.
 *
 * ── والصلة من التذكرة لا من المستهلِك ───────────────────────────────────
 * الموظّف اختار `guardian` قبل إصدار الرابط، فمَن يستهلكه يُربَط
 * `guardian` — ولا سبيل لأن يرسل `self` بدلاً منها، لأن الدالّة **لا
 * تقبل** الصلة معاملاً أصلاً.
 *
 * ── والتكرار المشروع ────────────────────────────────────────────────────
 * الحساب نفسه مرتبطٌ بالمريض نفسه **بنفس الصلة** ⇒ تُعاد جهته الموجودة بلا
 * صفٍّ ثانٍ. فإعادة الضغط لا تُنشئ ازدواجاً، ولا تفشل في وجه المستخدم.
 *
 * ── فإن اختلفت الصلة ────────────────────────────────────────────────────
 * الابن كبر فصار الحساب `self` بعد أن كان `guardian` أبيه. إعادةُ الجهة
 * كما هي هنا **تخالف العقد**: التذكرة تحمل صلةً اختارها الموظّف، فتُستهلَك
 * ولا تُطبَّق. والتعديل في مكانه يمحو أن العلاقة كانت يوماً وصاية.
 * فالقديمة **تُختَم** والجديدة تُنشأ: صفّان، نشِطٌ واحد، وتاريخٌ كامل.
 */
export async function redeemLinkToken(params: {
  rawToken: string;
  /** معرّف الحساب الخارجي — نصّ دائماً. */
  externalId: string;
}): Promise<RedeemResult> {
  const externalId = String(params.externalId ?? "").trim();
  if (!externalId) throw new Error("redeemLinkToken: externalId is required");
  const tokenHash = hashToken(params.rawToken ?? "");

  return await db.transaction(async (tx) => {
    // القفل أولاً: من هنا حتى نهاية المعاملة لا يستطيع مستهلِكٌ آخر أن
    // يقرأ هذه التذكرة غير مستهلَكة.
    const [row] = await tx.select().from(patientLinkTokens)
      .where(eq(patientLinkTokens.tokenHash, tokenHash))
      .for("update");

    // بصمة غير موجودة. الرسالة لا تفرّق بين «لا وجود» و«خطأ في النصّ» —
    // وكلاهما لا يكشف شيئاً عن التذاكر القائمة.
    if (!row) throw new LinkTokenError("not_found");
    if (row.revokedAt) throw new LinkTokenError("revoked");
    if (row.consumedAt) throw new LinkTokenError("already_consumed");
    if (row.expiresAt.getTime() <= Date.now()) throw new LinkTokenError("expired");

    // ── القفل الثاني: صفّ المريض ─────────────────────────────────────────
    // قفل التذكرة يسلسل نقرتين على **الرابط نفسه**، ولا يسلسل تذكرتين
    // مختلفتين لنفس المريض والحساب: بصمتاهما مختلفتان فالصفّان مختلفان،
    // فتمرّ الاثنتان معاً، ولا تجد أيٌّ منهما جهةً قائمة، فتُدرِجان صفّين
    // ينتهكان `uq_patient_contacts_active` — ويصل خطأ Postgres خاماً إلى
    // مستخدمٍ لم يفعل شيئاً خاطئاً.
    //
    // فصفّ المريض هو نقطة التسلسل الطبيعية: كل ما يمسّ هوية تواصله يمرّ
    // من هنا. والترتيب ثابت (تذكرة ثم مريض) فلا دورة انتظار بين مستهلِكَين.
    //
    // و`NO KEY UPDATE` لا `UPDATE`: الأضعف يكفي للتسلسل بيننا، ولا يحجز
    // مفتاح الصفّ فلا يُعطّل إدراج زيارة أو دفعة لنفس المريض في الأثناء.
    await tx.select({ id: patients.id }).from(patients)
      .where(eq(patients.id, row.patientId))
      .for("no key update");

    const now = new Date();
    const [token] = await tx.update(patientLinkTokens)
      .set({ consumedAt: now, consumedByExternalId: externalId })
      .where(eq(patientLinkTokens.id, row.id))
      .returning();

    // جهة نشطة لهذا الحساب على هذا المريض؟
    const [existing] = await tx.select().from(patientContacts)
      .where(and(
        eq(patientContacts.patientId, row.patientId),
        eq(patientContacts.channel, row.channel),
        eq(patientContacts.externalId, externalId),
        isNull(patientContacts.revokedAt),
      ))
      .limit(1);

    // بنفس الصلة ⇒ تُعاد كما هي. لا صفّ ثانٍ ولا خطأ في وجه مَن ضغط مرّتين.
    if (existing && existing.relation === row.relation) {
      return { contact: existing, token, createdContact: false };
    }

    // بصلة مختلفة ⇒ تُختَم القديمة **ولا تُعدَّل**. التعديل في مكانه يجعل
    // الوصاية كأنها لم تكن؛ والختم يُبقيها مقروءة بتاريخها.
    let superseded: PatientContact | undefined;
    if (existing) {
      const [sealed] = await tx.update(patientContacts)
        .set({ revokedAt: now })
        .where(eq(patientContacts.id, existing.id))
        .returning();
      superseded = sealed;
    }

    const [contact] = await tx.insert(patientContacts).values({
      patientId: row.patientId,
      channel: row.channel,
      // **الصلة من التذكرة.** لا من الطلب، ولا من المستهلِك.
      relation: row.relation,
      externalId,
      linkedAt: now,
    }).returning();

    return superseded
      ? { contact, token, createdContact: true, supersededContact: superseded }
      : { contact, token, createdContact: true };
  });
}

// ══ جهات الاتصال ═════════════════════════════════════════════════════════

/** جهات المريض النشطة. «نشِط» = `revoked_at` فارغ — لا عمود حالة ثانٍ. */
export async function listActiveContacts(patientId: number): Promise<PatientContact[]> {
  return db.select().from(patientContacts)
    .where(and(eq(patientContacts.patientId, patientId), isNull(patientContacts.revokedAt)))
    .orderBy(patientContacts.id);
}

/**
 * سحب جهة اتصال. الصفّ يبقى تاريخاً — يُختَم بـ`revoked_at` ولا يُحذف،
 * وإعادة الربط بعده تُنشئ صفّاً نشطاً جديداً بلا تصادم مع الفهرس الجزئي.
 */
export async function revokeContact(contactId: number): Promise<boolean> {
  const rows = await db.update(patientContacts)
    .set({ revokedAt: new Date() })
    .where(and(eq(patientContacts.id, contactId), isNull(patientContacts.revokedAt)))
    .returning({ id: patientContacts.id });
  return rows.length > 0;
}

/**
 * كل المرضى الذين يتابعهم هذا الحساب. الاتجاه المعاكس، وهو المطلوب حين
 * يصل شيءٌ من الحساب ولا نعرف عن أي مريض يتحدّث: أبٌ بحسابٍ واحد يتابع
 * ثلاثة أبناء يُرجع ثلاثة صفوف — وهذا صحيح لا خطأ.
 */
export async function patientsForExternalId(
  channel: ContactChannel,
  externalId: string,
): Promise<PatientContact[]> {
  return db.select().from(patientContacts)
    .where(and(
      eq(patientContacts.channel, channel),
      eq(patientContacts.externalId, externalId),
      isNull(patientContacts.revokedAt),
    ))
    .orderBy(patientContacts.patientId);
}

/**
 * دمج جهات المصدر في الهدف — يُستدعى من `storage.mergePatients`.
 *
 * التصادم المشروع: الحساب نفسه مرتبطٌ ونشِط على **الملفّين**. إعادة توجيه
 * `patient_id` وحدها كانت ستنتهك `uq_patient_contacts_active` وتُسقط الدمج
 * كلّه. فجهة المصدر تُختَم `revoked_at` قبل نقلها: **لا صفّ يُحذف** — يُنقل
 * محفوظاً كتاريخ، ويبقى النشِط واحداً كما ينبغي.
 *
 * (هنا لا في `storage.ts` لأن المعرفة بشكل الجدول وقيده معرفةُ هذه الوحدة.
 * والمعاملة تُمرَّر فيبقى الدمج ذرّياً.)
 */
export async function mergeContactsInto(
  tx: DbTransaction,
  sourceId: number,
  targetId: number,
): Promise<void> {
  await tx.execute(sql`
    UPDATE patient_contacts s
       SET revoked_at = NOW()
     WHERE s.patient_id = ${sourceId}
       AND s.revoked_at IS NULL
       AND EXISTS (
         SELECT 1 FROM patient_contacts t
          WHERE t.patient_id = ${targetId}
            AND t.channel = s.channel
            AND t.external_id = s.external_id
            AND t.revoked_at IS NULL
       )
  `);
  await tx.update(patientContacts)
    .set({ patientId: targetId })
    .where(eq(patientContacts.patientId, sourceId));
}
