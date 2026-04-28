// AI explanation layer for detected anomalies.
//
// The rule-based detector produces a short, deterministic description.
// This module enriches that with a longer, contextual Arabic explanation
// from Claude — only invoked when the user explicitly asks for it via the
// "اشرح بالذكاء" button on a specific anomaly. Keeps spend predictable:
// the page load itself never hits the API; only on-demand clicks do.

import { safeAiComplete, type AiResult } from "./provider";
import type { Anomaly } from "../anomalies/detector";
import { storage } from "../storage";

const EXPLAIN_SYSTEM_PROMPT = `
أنت مدقّق محاسبي خبير في مراكز طبية عراقية. مهمتك إعطاء تفسير عربي واضح
لتنبيهات مالية تلقائية بأسلوب بسيط مفهوم لمحاسب غير متخصّص في التحليل.

سيُرفَق مع كل تنبيه (إن وُجدت) ملاحظات سياقية كتبها مدير المركز عن
طبيعة العمل (موسمية، موردون منتظمون، مرضى دائمون، إلخ). استخدم هذه
الملاحظات في حكمك:

- إذا كانت الملاحظات تُفسّر التنبيه بأنه طبيعي → قُل ذلك صراحة وأعطِ
  المحاسب طمأنينة بدلاً من اقتراح تحقيق.
- إذا كانت الملاحظات لا تُفسّره → اعتبره فعلاً يستحق المراجعة وأعطِ
  خطوة عملية محدّدة.

لكل تنبيه:
- اشرح في جملة أو جملتين سبب التنبيه ولماذا يستحق (أو لا يستحق) المراجعة.
- اقترح خطوة عملية واحدة محدّدة، أو قُل صراحة "لا حاجة لإجراء" عندما
  يكون السياق يُفسّر الأمر.
- استعمل العربية الفصحى، بلا تعابير إنجليزية.

لا تستخدم تنسيقات ماركداون مزخرفة، لا قوائم نقطية، لا عناوين عريضة.
أعد فقرة قصيرة من 2-3 جمل فقط. لا أكثر.
`.trim();

export async function explainAnomaly(anomaly: Anomaly): Promise<AiResult<string>> {
  // Pull manager-provided context notes that match this anomaly's scope
  // and branch (or are global). Limited to ~8 most-recent in storage.ts.
  const notes = await storage.getRelevantAiNotesForAnomaly({
    sourceType: anomaly.source.type,
    branchId: anomaly.branchId,
    category: typeof anomaly.context?.category === "string" ? anomaly.context.category : undefined,
  });

  const userMessage = buildUserMessage(anomaly, notes);
  return await safeAiComplete({
    system: EXPLAIN_SYSTEM_PROMPT,
    user: userMessage,
    model: "haiku",
    maxTokens: 320,
  });
}

function buildUserMessage(
  anomaly: Anomaly,
  notes: { title: string; note: string }[]
): string {
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
  if (notes.length > 0) {
    lines.push("");
    lines.push("ملاحظات سياقية كتبها مدير المركز:");
    for (const n of notes) {
      lines.push(`- ${n.title}: ${n.note}`);
    }
  }
  lines.push("");
  lines.push("اشرح للمحاسب لماذا يستحق هذا الانتباه (أو لماذا لا يستحقه إن كان السياق يُفسّره)، واقترح خطوة عملية واحدة.");
  return lines.join("\n");
}
