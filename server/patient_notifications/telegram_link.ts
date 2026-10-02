// ربطُ تلغرام بالمريض وترحيبُه — **في معاملةٍ واحدة** (§4.bl).
//
// مَن يمسح رمز QR ويضغط «ابدأ» في بوت المرضى: تُستهلَك تذكرتُه وتُنشأ جهتُه (`redeemLinkToken`)، ويُستحقّ له ترحيبُ
// التسجيل نفسُه (`registration.welcome`) على جهة تلغرام — فإمّا ربطٌ وترحيبُه، وإمّا لا شيء يُحفظ.
// **ولا شيءَ بأثرٍ رجعيّ**: الصفوفُ تُستحقّ للأحداث القادمة وحدها، فلا يصل المرتبطَ متأخّراً تاريخُ ملفّه.
// والترحيبُ مرّةٌ واحدة لكلّ جهة يحرسها الفهرسُ `uq_pnd_contact_link_type` لا شرطٌ هنا.

import { db } from "../db";
import { redeemLinkToken, type RedeemResult } from "../patient_contacts/store";
import { patientCodeOf } from "../patient_code/store";
import { enqueueForContact } from "./outbox";
import { REGISTRATION_WELCOME } from "./render";

export async function redeemAndWelcome(params: { rawToken: string; externalId: string }): Promise<RedeemResult> {
  return await db.transaction(async (tx) => {
    const result = await redeemLinkToken(params, tx as any);
    const code = await patientCodeOf(result.contact.patientId, tx as any);
    if (code) {
      await enqueueForContact(tx as any, {
        patientId: result.contact.patientId,
        patientContactId: result.contact.id,
        notificationType: REGISTRATION_WELCOME,
        payload: { patientCode: code },
      });
    }
    return result;
  });
}
