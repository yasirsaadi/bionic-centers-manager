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

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { prostheticWorkOrders as WO } from "@shared/schema";
import { enqueueForContact } from "./outbox";
import { LINK_NOTIFICATION_TYPES } from "./render";

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
export async function currentDeviceSnapshot(patientId: number): Promise<DeviceSnapshot | null> {
  const [row] = await db.select({
    stage: WO.currentStage,
    expectedDeliveryDate: WO.expectedDeliveryDate,
  }).from(WO)
    .where(and(
      eq(WO.patientId, patientId),
      eq(WO.purpose, "initial_build"),
      eq(WO.status, "active"),
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
export async function enqueueLinkWelcome(params: {
  patientId: number;
  patientContactId: number;
}): Promise<number> {
  const { patientId, patientContactId } = params;
  let queued = 0;
  try {
    const welcome = await enqueueForContact(db, {
      patientId, patientContactId,
      notificationType: LINK_NOTIFICATION_TYPES.WELCOME,
    });
    if (welcome !== null) queued++;

    const snapshot = await currentDeviceSnapshot(patientId);
    if (!snapshot) return queued; // بلا أمر تصنيع ⇒ الترحيب وحده

    const stageRow = await enqueueForContact(db, {
      patientId, patientContactId,
      notificationType: LINK_NOTIFICATION_TYPES.CURRENT_STAGE,
      payload: { stage: snapshot.stage },
    });
    if (stageRow !== null) queued++;

    if (snapshot.expectedDeliveryDate) {
      const dateRow = await enqueueForContact(db, {
        patientId, patientContactId,
        notificationType: LINK_NOTIFICATION_TYPES.DELIVERY_DATE,
        payload: { expectedDeliveryDate: snapshot.expectedDeliveryDate },
      });
      if (dateRow !== null) queued++;
    }
    return queued;
  } catch {
    // لا نصّ خطأ: قد يحمل ما لا يجوز طبعه.
    console.error("[patient-notifications] link welcome enqueue failed");
    return queued;
  }
}

export { isNull };
