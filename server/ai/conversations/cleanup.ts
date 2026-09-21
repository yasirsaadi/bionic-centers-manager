//  محوُ سجلّ المحادثات بعد النافذة — كرونٌ يوميّ مستقلّ.
//
//  ══ ولماذا ملفٌّ مستقلّ لا سطرٌ في `backup.ts` ═══════════════════════════
//  **النسخةُ الليلية لا تُمَسّ بحرف** (شرطُ المالك صراحةً). ولو وُضع هذا
//  الكرون داخل `initBackupScheduler` لتشارك معها ملفّاً وسجلّاً ومصيرَ
//  فشلٍ واحداً بلا داعٍ. فله جدولُه وسجلُّه، ويُهيَّأ من `server/index.ts`
//  بجوارها لا داخلها. **و`server/backup.ts` بلا حرفٍ واحدٍ يتغيّر.**
//
//  ══ وبلا حجزٍ يوميّ — **المحوُ idempotent بطبعه** ════════════════════════
//  كرونُ النسخة الليلية يحجز (`claimDailyJob`) لأن إرسالَ بريدٍ مرّتين
//  **يُرى**. والمحوُ هنا `DELETE` بشرطٍ ثابت: مثيلان يشغّلانه معاً ⟶ الأوّلُ
//  يمحو والثاني يمحو صفراً، والنتيجةُ واحدة. فحجزٌ هنا تعقيدٌ بلا ثمرة،
//  **ونسخةٌ ثانية من بدائيّة تزامنٍ قائمة** أسوأُ من غيابها.
//
//  ══ ولا يُبنى وعدُ «تسعين يوماً» على نجاح هذا الكرون ════════════════════
//  كلُّ قراءةٍ في `store.ts` مرشَّحةٌ بالنافذة نفسِها — فصفٌّ تجاوزها لا
//  يُعرَض ولو تعطّل الكرون شهراً. وهذا هو المحوُ **الفيزيائيّ**: يحرّر
//  المساحة ويصدق الوعدَ في القاعدة لا في القراءة وحدها.

import cron from "node-cron";
import { AI_CHAT_RETENTION_DAYS } from "@shared/ai_conversations";
import { purgeExpiredConversations } from "./store";

/** يُنادى من الكرون، ومباشرةً في الاختبار. يبتلع فشلَه ولا يُسقط العملية. */
export async function runConversationPurge(now?: Date): Promise<number> {
  try {
    const removed = await purgeExpiredConversations(now);
    if (removed > 0) {
      console.log(`[AiChatLog] purged ${removed} conversation row(s) older than ${AI_CHAT_RETENTION_DAYS} days`);
    }
    return removed;
  } catch (e: any) {
    console.error("[AiChatLog] purge failed:", e?.message ?? e);
    return 0;
  }
}

export function initAiConversationCleanup(): void {
  //  ٠٣:٣٠ UTC = ٠٦:٣٠ بغداد — بعيدةٌ عن ٢٠:٠٠ و٢٠:٥٥ (تقريرُ الوارد
  //  والنسخةُ الليلية)، فلا يزاحم محوٌ عملاً يراه المالك في بريده.
  cron.schedule("30 3 * * *", () => { void runConversationPurge(); }, { timezone: "UTC" });
  console.log(`[AiChatLog] purge scheduled daily at 06:30 Baghdad (retention: ${AI_CHAT_RETENTION_DAYS} days)`);
}
