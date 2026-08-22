// ترحيبُ التسجيل — **حفظُ المريض يستحقّ رسالتَه، ولا شيءَ ينتظر أحداً**.
//
// ══ ما استبدلَ هذا الملفُّ ═══════════════════════════════════════════════
// كان `welcome.ts` يستحقّ الترحيبَ **بعد أن يربط المريضُ حسابه بنفسه**:
// تذكرةٌ لمرّة واحدة، ورمزُ QR، ورسالةٌ يرسلها هو، ثم ترحيب. ولقطةُ حالةِ
// الجهاز معه لأن الربط قد يقع بعد شهورٍ من التسجيل.
//
// وقرارُ المنتج ألغى ذلك كلَّه: **حفظُ المريض = واتساب جاهزة**. فالترحيبُ
// يقع لحظةَ فتح الملفّ — ولا جهازَ بعدُ ولا مرحلةَ تُلتقَط، فسقطت اللقطةُ
// معها. وما بقي واحد: رسالةٌ تقول «سُجِّل ملفُّك، وهذا رمزُه».
//
// ══ ولماذا هنا لا في `storage.ts` ═══════════════════════════════════════
// `storage` طبقةُ بيانات لا تعرف الإشعارات، و`patient_whatsapp` ناقلٌ لا
// يعرف المرضى. فالوسيطُ هذه الوحدة: تعرف الطرفين، وتُبقي كلَّ واحدٍ منهما
// جاهلاً بالآخر.
//
// ══ ولا شبكةَ هنا إطلاقاً ═══════════════════════════════════════════════
// تُكتب الجهةُ ويُستحقّ الصفُّ — وكلاهما قاعدةُ بيانات. والإرسالُ بعد
// `COMMIT` بمسافة، في العامل. **فانقطاعُ Meta لا يمكن أن يُفشل تسجيلاً.**

import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { patientContacts } from "@shared/schema";
import { enqueueForContact, PATIENT_CHANNEL } from "./outbox";
import { REGISTRATION_WELCOME } from "./render";
import { whatsappDestination } from "../patient_whatsapp/config";
import type { DbTransaction } from "../events/store";

export interface RegistrationInput {
  patientId: number;
  /** `patients.phone_e164` كما كتبته `normalizePhone` — لا رقمٌ خام. */
  phoneE164: string | null | undefined;
  /** رمزُ المريض القانونيّ من صفّه بعد الإدراج. */
  patientCode: string | null | undefined;
  /** قرارُ الموظّف عند التسجيل. */
  enabled: boolean;
}

export interface RegistrationOutcome {
  contactId: number | null;
  welcomeQueued: boolean;
  /** سببُ عدم الاستحقاق — للتشخيص، وليس خطأً. */
  skipped?: "disabled" | "no_phone" | "no_code";
}

/**
 * جهةُ واتساب للمريض من رقمه المسجَّل — **تُنشأ أو تُعاد**.
 *
 * ══ وما تعنيه هذه الجهة، بصدق ══════════════════════════════════════════
 * تعني شيئاً واحداً: **هذا هو الرقمُ الذي أعطاه المريضُ للاستقبال
 * للتواصل.** ولا تعني — ولا واحدةً منها:
 *
 *   • أن المزوّد أثبت أن الحسابَ لصاحب الرقم
 *   • أن المريضَ راسلنا فأكّد هويّته
 *   • أن ملكيةَ الرقم مُتحقَّق منها
 *
 * وهذا **قرارُ منتجٍ صريح** لا سهو: مؤسّسةٌ تسأل مريضَها رقمَه وترسل عليه
 * تحديثاتِ خدمته — كما يفعل المصرفُ والمستشفى. ولذلك لا يُكتب في أي مكان
 * أن الهويّة «موثَّقة»، ولا يُبنى عليها إذنٌ ولا وصولٌ إلى شيء.
 *
 * ورقمٌ واحد قد يخدم عدّة ملفّات مشروعاً (أبٌ ولداه) — والفهرسُ الفريد
 * جزئيٌّ على (مريض، قناة، معرّف) فلا يمنع ذلك.
 */
export async function ensureWhatsappContact(
  tx: DbTransaction,
  params: { patientId: number; phoneE164: string | null | undefined },
): Promise<number | null> {
  const dest = whatsappDestination(params.phoneE164);
  // **لا تخمينَ لرقمٍ معطوب.** ما لم يُطبَّع صالحاً لا جهةَ ولا رسالة —
  // ووجهةٌ نخترعها تصل غريباً لا مريضاً.
  if (!dest) return null;

  const [existing] = await tx.select({ id: patientContacts.id })
    .from(patientContacts)
    .where(and(
      eq(patientContacts.patientId, params.patientId),
      eq(patientContacts.channel, PATIENT_CHANNEL),
      eq(patientContacts.externalId, dest),
      isNull(patientContacts.revokedAt),
    ))
    .limit(1);
  if (existing) return Number(existing.id);

  const [row] = await tx.insert(patientContacts).values({
    patientId: params.patientId,
    channel: PATIENT_CHANNEL,
    //  المؤسّسةُ تتواصل مع المريض نفسه على رقمه المسجَّل. ومَن أراد وليَّ
    //  أمرٍ برقمٍ آخر يُدخله في الملفّ — ولا نافذةَ صلاتٍ بعد اليوم.
    relation: "self",
    externalId: dest,
    linkedAt: new Date(),
  }).returning({ id: patientContacts.id });
  return row ? Number(row.id) : null;
}

/** يسحب كلَّ جهاتِ واتساب النشطة للمريض — ختمٌ لا حذف، فالتاريخُ يبقى. */
export async function revokeWhatsappContacts(
  tx: DbTransaction,
  patientId: number,
  /** جهةٌ تُستثنى من السحب — الجديدةُ عند تغيير الرقم. */
  keepContactId?: number | null,
): Promise<number> {
  const rows = await tx.select({ id: patientContacts.id })
    .from(patientContacts)
    .where(and(
      eq(patientContacts.patientId, patientId),
      eq(patientContacts.channel, PATIENT_CHANNEL),
      isNull(patientContacts.revokedAt),
    ));
  let revoked = 0;
  for (const r of rows) {
    if (keepContactId != null && Number(r.id) === Number(keepContactId)) continue;
    await tx.update(patientContacts)
      .set({ revokedAt: new Date() })
      .where(eq(patientContacts.id, r.id));
    revoked++;
  }
  return revoked;
}

/**
 * **جهةٌ + ترحيبٌ، في المعاملة نفسها.**
 *
 * ══ لماذا معاً ═════════════════════════════════════════════════════════
 * جهةٌ بلا ترحيبٍ تعني مريضاً مربوطاً لا يصله شيءٌ ولا أحد يعلم. وترحيبٌ
 * بلا جهةٍ صفٌّ يتيم. فإمّا الاثنان وإمّا لا شيء.
 *
 * ══ والمرّةُ الواحدة تحرسها القاعدة ═════════════════════════════════════
 * الفهرسُ `uq_pnd_contact_link_type (contact, type) WHERE event IS NULL`
 * يجعل الترحيبَ **صفّاً واحداً لكلّ جهة** — فإعادةُ طلبِ الإنشاء، أو تكرارُ
 * النداء، أو تغييرُ الرقم ثم عودتُه، لا يُنتج ترحيباً ثانياً. وهذا حكمُ
 * صفٍّ في القاعدة لا شرطٌ في الشيفرة يمكن أن يُنسى.
 */
export async function registerWhatsappWelcome(
  tx: DbTransaction,
  input: RegistrationInput,
): Promise<RegistrationOutcome> {
  if (!input.enabled) return { contactId: null, welcomeQueued: false, skipped: "disabled" };

  const contactId = await ensureWhatsappContact(tx, {
    patientId: input.patientId, phoneE164: input.phoneE164,
  });
  if (contactId === null) return { contactId: null, welcomeQueued: false, skipped: "no_phone" };

  // **ولا ترحيبَ بلا رمز**: `{{1}}` هو الرمزُ وحده، ورسالةٌ تقول «رمز
  // ملفكم: » فارغةً أسوأُ من رسالةٍ لم تصل. والجهةُ تبقى — فتحديثاتُ
  // التصنيع تصله لاحقاً.
  const code = typeof input.patientCode === "string" ? input.patientCode.trim() : "";
  if (!code) return { contactId, welcomeQueued: false, skipped: "no_code" };

  const rowId = await enqueueForContact(tx, {
    patientId: input.patientId,
    patientContactId: contactId,
    notificationType: REGISTRATION_WELCOME,
    payload: { patientCode: code },
  });
  return { contactId, welcomeQueued: rowId !== null };
}

/** معاملتُها الخاصّة — لمن ينادي خارج معاملةٍ قائمة. */
export async function registerWhatsappWelcomeStandalone(
  input: RegistrationInput,
): Promise<RegistrationOutcome> {
  return await db.transaction((tx) => registerWhatsappWelcome(tx as any, input));
}
