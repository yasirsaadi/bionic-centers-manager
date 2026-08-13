// ترحيبُ الربط ولقطةُ الحالة.
//
// ══ لماذا هنا لا في `patient_telegram/` ═════════════════════════════════
// وحدة تلغرام **لا تعرف التصنيع** — هذا شرطٌ معماري قائم. ولقطةُ الحالة
// تحتاج قراءة أمر التصنيع الحالي. فالوسيط هذه الوحدة: تعرف الطرفين،
// وتُبقي القناة جاهلةً بما يجري في الورشة.
//
// ══ ولا سجلّ رجعي إطلاقاً ═══════════════════════════════════════════════
// مَن يربط حسابه اليوم **لا يستلم أحداث الأمس**. ما يُرسَل هنا ليس تاريخاً
// بل **لقطةٌ واحدة للحاضر**: أين جهازك الآن، ومتى موعده. والفرق جوهري —
// إعادة بثّ سجلٍّ كامل تُغرق المريض بعشر رسائل عن أشياء انتهت، وتكشف
// تسلسلاً قد يحمل رجوعاً لإعادة عمل لا يعنيه.
//
// ولذلك لا تُقرأ `patient_events` هنا إطلاقاً — يُقرأ **صفّ الأمر** وحده.

import { and, desc, eq, isNull, notInArray } from "drizzle-orm";
import { db } from "../db";
import { prostheticWorkOrders as WO } from "@shared/schema";
import { enqueueForContact } from "./outbox";
import { LINK_NOTIFICATION_TYPES } from "./render";
import { redeemLinkToken } from "../patient_contacts/store";
import type { DbTransaction } from "../events/store";

/**
 * الحالات التي تعني «انتهى» — وما عداها أمرٌ حيّ.
 *
 * **قائمة استبعاد لا قائمة قبول**: الأمر الحيّ قد يكون `active` أو
 * `waiting_patient` أو `waiting_materials` أو `medical_hold` أو
 * `technical_rework` — والجهاز في كلّها لا يزال في الورشة وصاحبه ينتظره.
 * فاشتراط `active` وحدها كان يحرم أربعة أخماس المنتظرين من لقطة حالتهم.
 * وحالةٌ تُضاف بعد سنة تُحسَب حيّةً افتراضاً، وهو الصواب هنا.
 */
const FINISHED_STATUSES = ["completed", "cancelled"];

/** ما يجوز أن يعرفه المريض عن أمره الآن — ولا حرف زيادة. */
export interface DeviceSnapshot {
  stage: string;
  expectedDeliveryDate: string | null;
}

/**
 * أمر البناء الأولي **الحيّ** لهذا المريض، إن وُجد.
 *
 * الصيانة مستثناة (`purpose = 'initial_build'` وحده): جهازٌ يُصلَح ليس
 * «حالة جهازك» بالمعنى الذي يفهمه المنتظِر. والملغى والمكتمل مستثنيان
 * كذلك — لقطةُ الحاضر لا معنى لها لأمرٍ انتهى.
 *
 * **ولا يُقرأ منه إلا حقلان.** لا حالة، ولا سبب توقّف، ولا خبير، ولا
 * نتيجة، ولا ملاحظات — والانتقاء هنا في الاستعلام نفسه لا في العرض،
 * فما لا يُقرأ لا يتسرّب.
 */
export async function currentDeviceSnapshot(
  patientId: number,
  runner: DbTransaction | typeof db = db,
): Promise<DeviceSnapshot | null> {
  const [row] = await (runner as any).select({
    stage: WO.currentStage,
    expectedDeliveryDate: WO.expectedDeliveryDate,
  }).from(WO)
    .where(and(
      eq(WO.patientId, patientId),
      eq(WO.purpose, "initial_build"),
      // حيٌّ = ليس منتهياً. والتوقّف وإعادة العمل حالتان حيّتان: الجهاز
      // في مكانه والعمل عليه موقوف مؤقّتاً — والمريض أحوج ما يكون للقطته.
      notInArray(WO.status, FINISHED_STATUSES),
    ))
    .orderBy(desc(WO.id))
    .limit(1);
  if (!row) return null;
  return {
    stage: row.stage,
    expectedDeliveryDate: row.expectedDeliveryDate ?? null,
  };
}

/**
 * يستحقّ رسائل الربط لجهة الاتصال الجديدة: ترحيبٌ دائماً، ثم لقطةُ المرحلة
 * والموعد إن وُجد أمرٌ حيّ.
 *
 * **عبر الصادر لا إرسالاً مباشراً**: فتستفيد من إعادة المحاولة كغيرها —
 * مريضٌ ربط حسابه وتلغرام متعثّر لا يخسر ترحيبه.
 *
 * ولا ترمي: الربط نفسه نجح، وفشلُ استحقاق رسالةٍ بعده لا يجوز أن يُبطله.
 */
export async function enqueueWelcomeIn(
  tx: DbTransaction,
  params: { patientId: number; patientContactId: number },
): Promise<number> {
  const { patientId, patientContactId } = params;
  let queued = 0;

  const welcome = await enqueueForContact(tx, {
    patientId, patientContactId,
    notificationType: LINK_NOTIFICATION_TYPES.WELCOME,
  });
  if (welcome !== null) queued++;

  // اللقطة **داخل المعاملة نفسها**: فما يُقرأ هو ما يُستحقّ، بلا فجوة
  // يتقدّم فيها الأمر بين القراءة والكتابة.
  const snapshot = await currentDeviceSnapshot(patientId, tx);
  if (!snapshot) return queued; // بلا أمر حيّ ⇒ الترحيب وحده

  const stageRow = await enqueueForContact(tx, {
    patientId, patientContactId,
    notificationType: LINK_NOTIFICATION_TYPES.CURRENT_STAGE,
    payload: { stage: snapshot.stage },
  });
  if (stageRow !== null) queued++;

  if (snapshot.expectedDeliveryDate) {
    const dateRow = await enqueueForContact(tx, {
      patientId, patientContactId,
      notificationType: LINK_NOTIFICATION_TYPES.DELIVERY_DATE,
      payload: { expectedDeliveryDate: snapshot.expectedDeliveryDate },
    });
    if (dateRow !== null) queued++;
  }
  return queued;
}

/** معاملتها الخاصّة — لمسارٍ رُبِطت جهته سلفاً. **ولا تبتلع خطأً**. */
export async function enqueueLinkWelcome(params: {
  patientId: number;
  patientContactId: number;
}): Promise<number> {
  return await db.transaction((tx) => enqueueWelcomeIn(tx, params));
}

/**
 * **الاستهلاك ورسائله في معاملة واحدة** — وهذا هو بيت القصيد.
 *
 * قبلها كان الاستهلاك يُحفظ ثم تُستحقّ الرسائل بعده. فلو تعثّرت القاعدة
 * بينهما: التذكرة مستهلَكة، والجهة مربوطة، والـwebhook يردّ 200 —
 * **والترحيب ولقطة الحالة ضائعان إلى الأبد**، لأن التذكرة لا تُستهلَك
 * مرّتين فلا سبيل لإعادة توليدهما. عطلٌ عابر يُنتج مريضاً مربوطاً لا يصله
 * شيء ولا أحد يعلم.
 *
 * الآن: إمّا الكلّ وإمّا لا شيء. وفشلُ الاستحقاق يُرجِع `consumed_at`
 * والجهةَ الجديدة والصفوفَ معاً، فيعيد تلغرام المحاولة على تذكرةٍ ما زالت
 * صالحة. **ولا خطأ يُبتلَع هنا** — الابتلاع هو ما كان يصنع الضياع الصامت.
 *
 * والإرسال يبقى خارجها بالكامل: لا شبكة داخل معاملة.
 */
export async function redeemAndWelcome(params: {
  rawToken: string;
  externalId: string;
}): Promise<{ contactId: number; patientId: number; queued: number }> {
  return await db.transaction(async (tx) => {
    const result = await redeemLinkToken(params, tx);
    const patientId = result.contact.patientId;
    const contactId = result.contact.id;
    const queued = await enqueueWelcomeIn(tx, { patientId, patientContactId: contactId });
    return { contactId, patientId, queued };
  });
}

export { isNull };
