// تحقّق تصريف — لا سلوك تشغيلي فيه، ولا يستورده أحد فلا يدخل الحزمة.
//
// وجوده أن يفشل `npm run check` إن ضعُف توقيع `recordPatientEvent` يوماً
// فصار يقبل اتصال قاعدة البيانات العادي بدل معاملة حقيقية. `@ts-expect-error`
// تنقلب على نفسها: لو صار السطر يُصرَّف بنجاح، أعلن TypeScript أن التوجيه
// «غير مستعمَل» وفشل الفحص. فالحارس يصرخ عند إضعافه لا عند تشديده.
//
// اسم الملف `.check.ts` لا `.test.ts` عمداً: ملفات `*.test.ts` مستثناة من
// `tsconfig.json`، وهذا الملف قيمته كلها في أن يُفحَص.

import { db } from "../db";
import { recordPatientEvent } from "./store";
import { PATIENT_EVENT_TYPES } from "@shared/patient_events";

// لا تُستدعى إطلاقاً. الغرض هو ما يقوله المصرِّف عن أسطرها.
async function neverCalled(): Promise<void> {
  const input = {
    patientId: 1,
    eventType: PATIENT_EVENT_TYPES.PATIENT_REGISTERED,
  };

  // ‼ المطلوب: أن يرفض المصرِّف هذا. `db` ليس معاملة.
  // @ts-expect-error - recordPatientEvent must NOT accept the plain db handle
  await recordPatientEvent(db, input);

  // والمسار المشروع: معاملة حقيقية، ويجب أن يُصرَّف بلا شكوى.
  await db.transaction(async (tx) => {
    await recordPatientEvent(tx, input);
  });

  // ‼ ونوع حدث غير معلَن في السجل يجب أن يُرفض عند التصريف أيضاً، لا عند
  // التشغيل فقط.
  await db.transaction(async (tx) => {
    // @ts-expect-error - an ad-hoc event type string is not part of the registry
    await recordPatientEvent(tx, { patientId: 1, eventType: "something.invented" });
  });
}

export const PATIENT_EVENTS_TYPE_GUARD = typeof neverCalled;
