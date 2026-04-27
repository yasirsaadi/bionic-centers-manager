// AI explanation layer for detected anomalies.
//
// The rule-based detector produces a short, deterministic description.
// This module enriches that with a longer, contextual Arabic explanation
// from Claude — only invoked when the user explicitly asks for it via the
// "اشرح بالذكاء" button on a specific anomaly. Keeps spend predictable:
// the page load itself never hits the API; only on-demand clicks do.

import { safeAiComplete, type AiResult } from "./provider";
import type { Anomaly } from "../anomalies/detector";

const EXPLAIN_SYSTEM_PROMPT = `
أنت مدقّق محاسبي خبير في مراكز طبية عراقية. مهمتك إعطاء تفسير عربي واضح
لتنبيهات مالية تلقائية بأسلوب بسيط مفهوم لمحاسب غير متخصّص في التحليل.

لكل تنبيه:
- اشرح في جملة أو جملتين سبب التنبيه ولماذا يستحق المراجعة.
- اقترح خطوة عملية واحدة محدّدة (مثل: "تحقّق من فاتورة المورد"، "اتصل بالمريض").
- استعمل العربية الفصحى، بلا تعابير إنجليزية.

لا تستخدم تنسيقات ماركداون مزخرفة، لا قوائم نقطية، لا عناوين عريضة.
أعد فقرة قصيرة من 2-3 جمل فقط. لا أكثر.
`.trim();

export async function explainAnomaly(anomaly: Anomaly): Promise<AiResult<string>> {
  const userMessage = buildUserMessage(anomaly);
  return await safeAiComplete({
    system: EXPLAIN_SYSTEM_PROMPT,
    user: userMessage,
    model: "haiku",
    maxTokens: 256,
  });
}

function buildUserMessage(anomaly: Anomaly): string {
  const lines = [
    `نوع التنبيه: ${anomaly.type}`,
    `الخطورة: ${anomaly.severity}`,
    `العنوان: ${anomaly.title}`,
    `الوصف الأوّلي: ${anomaly.description}`,
    `تاريخ السجلّ: ${anomaly.date}`,
    `الفرع: ${anomaly.branchName ?? `#${anomaly.branchId}`}`,
  ];
  if (anomaly.amount !== undefined) {
    lines.push(`المبلغ: ${anomaly.amount.toLocaleString("en-US")} د.ع`);
  }
  if (anomaly.context && Object.keys(anomaly.context).length > 0) {
    lines.push(`بيانات إضافية: ${JSON.stringify(anomaly.context)}`);
  }
  lines.push("");
  lines.push("اشرح للمحاسب لماذا يستحق هذا الانتباه واقترح خطوة عملية واحدة.");
  return lines.join("\n");
}
