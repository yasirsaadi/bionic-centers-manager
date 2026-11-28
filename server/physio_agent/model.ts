// **مقبسُ النموذج لوكيل Opus** (§4.ha) — كلُّ نداءٍ إلى Claude يمرّ من هنا: الاختباراتُ تضع نموذجاً مزيّفاً (`setAgentModelForTests`) بلا مفتاح،
// والإنتاجُ يبثّ إلى Opus (`streamOpusMessage`). **وحارسٌ أخير** قبل كلّ إرسال: ما كتبه الخادمُ (التعليمات · رسائلُ المستخدم · نتائجُ أدواتنا)
// لا يحمل اسمَ المريض ولا هاتفَه ولا رمزَه — **ولا يُفحص ما كتبه النموذجُ أو نتائجُ البحث** (تُعاد كما هي حرفاً، ولا هويّةَ فيها أصلاً).
import type Anthropic from "@anthropic-ai/sdk";
import { isAiEnabled, streamOpusMessage } from "../ai/provider";
import { findAuthoredLeaks, type IdentifierSet } from "@shared/physio_agent_privacy";
import { JOB_ERROR_TEXTS } from "@shared/physio_agent";

export type AgentRole = "writer" | "reviewer" | "auditor";
export interface AgentModelCall { role: AgentRole; body: Anthropic.MessageCreateParamsNonStreaming; signal: AbortSignal }
export type AgentModel = (call: AgentModelCall) => Promise<Anthropic.Message>;

let testModel: AgentModel | null = null;
export function setAgentModelForTests(m: AgentModel | null): void { testModel = m; }
export const agentEnabled = (): boolean => Boolean(testModel) || isAiEnabled();

/** إخفاقٌ نهائيّ لا يُعاد — بـ`code` من `JOB_ERROR_TEXTS` ونصٍّ عربيّ وتفصيلٍ للسجلّ. */
export class AgentFatal extends Error {
  /** ما جرى حتى الإخفاق (يضعه `runJob`) — فيُحفظ على الوظيفة ولا يُمحى السجلّ. */
  public result: Record<string, any> | undefined;
  constructor(public code: string, message?: string, public detail: string | null = null) { super(message ?? JOB_ERROR_TEXTS[code] ?? code); }
}
/** إيقافٌ (إلغاءٌ أو مهلةٌ أو فقدُ القفل أو إطفاءُ الخادم) — يقرّر العاملُ ما بعده. */
export class AgentStop extends Error {
  constructor(public reason: "cancel" | "deadline" | "lost" | "shutdown") { super(`agent stop: ${reason}`); }
}

/** نصُّ ما كتبه الخادم في الطلب: التعليماتُ ونصوصُ رسائل المستخدم ونتائجُ أدواتنا — لا محتوى المساعد ولا نتائجُ أدوات الخادم. */
export function authoredTextOf(body: Anthropic.MessageCreateParamsNonStreaming): string {
  const parts: string[] = [];
  if (typeof body.system === "string") parts.push(body.system);
  else if (Array.isArray(body.system)) for (const b of body.system) parts.push(b.text);
  for (const m of body.messages) {
    if (m.role !== "user") continue;
    if (typeof m.content === "string") { parts.push(m.content); continue; }
    for (const b of m.content as any[]) {
      if (b.type === "text") parts.push(String(b.text ?? ""));
      else if (b.type === "tool_result") {
        if (typeof b.content === "string") parts.push(b.content);
        else if (Array.isArray(b.content)) for (const c of b.content) if (c?.type === "text") parts.push(String(c.text ?? ""));
      }
    }
  }
  return parts.join("\n");
}

export async function callModel(call: AgentModelCall, ids: IdentifierSet): Promise<Anthropic.Message> {
  const leaks = findAuthoredLeaks(authoredTextOf(call.body), ids);
  if (leaks.length) throw new AgentFatal("identifier_leak", undefined, leaks.join(","));
  return testModel ? testModel(call) : streamOpusMessage(call.body, { signal: call.signal });
}
