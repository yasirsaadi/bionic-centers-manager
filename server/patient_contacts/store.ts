// هويةُ تواصل المريض — قراءةٌ وسحبٌ ودمج.
//
// ══ ما لا يعنيه صفُّ الجهة ══════════════════════════════════════════════
// وجودُ `patient_contact` بقناة `whatsapp` يعني شيئاً واحداً: **هذا هو
// الرقمُ الذي أعطاه المريضُ للاستقبال للتواصل.** ولا يعني — ولا واحدةً
// منها:
//
//   • أن المزوّد أثبت أن الحسابَ لصاحب الرقم
//   • أن المريضَ راسلنا فأكّد هويّته
//   • أن ملكيةَ الرقم مُتحقَّق منها
//
// **وهذا قرارُ منتجٍ صريح**: المؤسّسةُ تسأل مريضَها رقمَه وترسل عليه
// تحديثاتِ خدمته — كما يفعل المصرفُ والمستشفى. ولا حقلَ هنا يدّعي توثيقاً،
// ولا يُبنى على الجهة إذنٌ ولا وصولٌ إلى شيء. ومَن يضيف لاحقاً حقلاً اسمه
// `verified` فليُعرّف أولاً **ماذا** تحقّق وبأي دليل.
//
// ══ وما زال هنا لا إرسال ════════════════════════════════════════════════
// هذا الملفّ لا يعرف Meta ولا يتصل بشبكة. والإنشاءُ نفسُه انتقل إلى
// `patient_notifications/registration.ts` — وهو الوسيطُ الذي يعرف الطرفين.

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  patientContacts,
  type PatientContact,
} from "@shared/schema";
import type { DbTransaction } from "../events/store";

// ══ المفردات ═════════════════════════════════════════════════════════════

/**
 * القناةُ المدعومة. العمودُ نصّيٌّ ليتّسع، والتحقّقُ هنا — **ولا قيدَ في
 * القاعدة**، فتغييرُ القائمة لا يحتاج ترحيلاً.
 *
 * **واتساب وحدها.** وتلغرامُ المرضى تقاعد: لا جهةَ تُنشأ به، ولا صفَّ
 * يُستحقّ له، ولا نقطةَ تستقبله. وصفوفُه التاريخية تبقى في الجدول
 * **خاملةً** — تُقرأ للتدقيق ولا يُرسَل إليها شيء. (والتنبيهاتُ الداخلية
 * للمالك في `server/notifications/telegram.ts` **شأنٌ آخر تماماً** لم
 * يُمَسّ بحرف: تلك رسائلٌ للإدارة لا للمرضى.)
 */
export const CONTACT_CHANNELS = ["whatsapp"] as const;
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

// ══ جهات الاتصال ═════════════════════════════════════════════════════════

/** جهة اتصال بمعرّفها — وبنفس القاعدة: الملكية يفحصها المستدعي. */
export async function getContact(contactId: number): Promise<PatientContact | null> {
  const [row] = await db.select().from(patientContacts)
    .where(eq(patientContacts.id, contactId)).limit(1);
  return row ?? null;
}

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
