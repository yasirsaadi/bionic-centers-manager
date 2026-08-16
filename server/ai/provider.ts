// Anthropic Claude provider abstraction.
//
// All AI features in the app go through this module. It handles:
// - Graceful degradation when ANTHROPIC_API_KEY isn't set (isAiEnabled() === false)
// - Default model selection (Haiku 4.5 for routine tasks, Sonnet 4.6 for harder ones)
// - Prompt caching via cache_control on the system prompt (kicks in once a system
//   prompt grows past Haiku's 4096-token cache minimum)
// - Typed exception handling so callers can react to rate limits / API errors
//   without string-matching error messages
//
// Single LLM call patterns only — for multi-step / agentic flows we'd reach for
// the SDK's tool runner separately.

import Anthropic from "@anthropic-ai/sdk";

// Lazy initialisation — keeps the module importable even when the key is unset
// (e.g. local dev, CI, before the user configures Render).
let cachedClient: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  cachedClient = apiKey ? new Anthropic({ apiKey }) : null;
  return cachedClient;
}

export function isAiEnabled(): boolean {
  return getClient() !== null;
}

// Model IDs are the exact strings from the Anthropic models catalog. Do not
// append date suffixes — `claude-haiku-4-5` (alias) is what we want.
export const MODEL_HAIKU = "claude-haiku-4-5";
export const MODEL_SONNET = "claude-sonnet-4-6";

export type AiModel = "haiku" | "sonnet";

export interface AiCompleteParams {
  // Reusable Arabic system prompt. Cached automatically when long enough.
  system: string;
  // The per-request user prompt — varies every call, so it stays after the cache breakpoint.
  user: string;
  // "haiku" by default; escalate to "sonnet" only when accuracy outweighs cost.
  model?: AiModel;
  // Output budget. Keep tight for classification / extraction (≤ 100); generous
  // for long-form narrative reports.
  maxTokens?: number;
  // Prefills the assistant's reply with this string. Useful for forcing
  // structured output: setting `prefillAssistant: "{"` makes the model
  // emit JSON directly without preamble. The prefilled prefix is
  // automatically prepended to the returned text.
  prefillAssistant?: string;
}

/**
 * Single-shot completion. Returns the model's text response, trimmed.
 *
 * Throws AiUnavailableError when ANTHROPIC_API_KEY is not configured —
 * callers should either check isAiEnabled() first or catch this.
 *
 * Rate-limit / API errors propagate as the SDK's typed exceptions
 * (Anthropic.RateLimitError, Anthropic.APIError, etc.) so the caller can
 * distinguish them.
 */
export async function aiComplete(params: AiCompleteParams): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new AiUnavailableError("ANTHROPIC_API_KEY is not configured");
  }

  const modelId = params.model === "sonnet" ? MODEL_SONNET : MODEL_HAIKU;

  // System prompt sent as a structured block with cache_control. Once the
  // prompt grows past the model's cache minimum (4096 tokens for Haiku 4.5)
  // subsequent calls with the same system text become ~10x cheaper. Below
  // the minimum the marker is silently a no-op — no error, just no cache hit.
  // If prefillAssistant is set, we add an assistant turn with the prefix —
  // the model continues from that prefix verbatim (Anthropic docs:
  // "Prefilling Claude's response"). On output we re-attach the prefix so
  // the caller sees the full string.
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: params.user },
  ];
  if (params.prefillAssistant) {
    messages.push({ role: "assistant", content: params.prefillAssistant });
  }

  const response = await client.messages.create({
    model: modelId,
    max_tokens: params.maxTokens ?? 1024,
    system: [
      {
        type: "text",
        text: params.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return "";
  const reply = textBlock.text.trim();
  // Re-attach the prefilled prefix so the caller works with the full text
  // it expected to see. We only add it back if the model didn't already
  // include it (it usually doesn't in an assistant prefill, but be safe).
  if (params.prefillAssistant && !reply.startsWith(params.prefillAssistant.trim())) {
    return params.prefillAssistant + reply;
  }
  return reply;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/**
 * Wraps an aiComplete call so route handlers can return a clean shape:
 *   - { ok: true, value }     when the call succeeds
 *   - { ok: false, reason }   when the call fails (AI off, rate limit, etc.)
 *
 * Distinguishes "AI not configured" (503-style) from transient API errors
 * (502-style) so the client can show different messages.
 */
export type AiResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "disabled" | "rate_limit" | "api_error" | "unknown"; message: string };

export async function safeAiComplete(
  params: AiCompleteParams
): Promise<AiResult<string>> {
  if (!isAiEnabled()) {
    return { ok: false, reason: "disabled", message: "خدمة الذكاء الاصطناعي غير مفعّلة" };
  }
  try {
    const value = await aiComplete(params);
    return { ok: true, value };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, reason: "rate_limit", message: "تجاوز حدّ الطلبات، حاول بعد قليل" };
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[ai] Anthropic API error ${err.status}:`, err.message);
      return { ok: false, reason: "api_error", message: "خطأ في خدمة الذكاء الاصطناعي" };
    }
    console.error("[ai] unexpected error:", err);
    return { ok: false, reason: "unknown", message: "خطأ غير متوقع" };
  }
}

// ══ مسارٌ ثانٍ: استكمالٌ بأدوات ═══════════════════════════════════════════
//
// **`aiComplete` أعلاه لم تُمَسّ.** تصنيفُ المصاريف وشرحُ الشذوذ والتقريرُ
// الشهري والتدقيقُ الذكي وردُّ الاستبيان وتلميحاتُ المصاريف كلّها تمرّ بها
// كما كانت، بنفس التوقيع ونفس السلوك. وما تحت هذا السطر مسارٌ منفصل
// للمساعد المحادثي وحده — إضافةٌ لا إعادةَ كتابة.
//
// والحلقة هنا **لا تنفّذ أداةً بنفسها**: تُرجع طلب النموذج إلى المنادي،
// وهو مَن يتحقّق ويُنفّذ. فالمزوّد يبقى جاهلاً بالصلاحيات وبالقاعدة، والحراسة
// في مكانٍ واحدٍ يُختبَر.

export interface AiToolSpec {
  name: string;
  description: string;
  /** JSON Schema كما تطلبه واجهة Anthropic. */
  input_schema: Record<string, unknown>;
}

export type AiConversationBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: any }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface AiTurn {
  role: "user" | "assistant";
  content: string | AiConversationBlock[];
}

export interface AiToolCall {
  id: string;
  name: string;
  input: any;
}

export interface AiToolStep {
  /** نصُّ النموذج في هذه الجولة (قد يكون فارغاً حين يطلب أداةً فقط). */
  text: string;
  /** ما طلبه من أدوات — فارغةٌ تعني أنه انتهى. */
  toolCalls: AiToolCall[];
  /** كتلُ الردّ كما هي، لتُعاد إلى المحادثة في الجولة التالية. */
  blocks: AiConversationBlock[];
}

/**
 * جولةٌ واحدة مع النموذج، بأدوات.
 *
 * تُرجع ما قاله وما طلبه. والمنادي يقرّر: يُنفّذ المسموح، ويُعيد النتائج
 * `tool_result`، وينادي مرّةً أخرى — أو يتوقّف.
 */
export async function aiToolStep(params: {
  system: string;
  messages: AiTurn[];
  tools: AiToolSpec[];
  model?: AiModel;
  maxTokens?: number;
}): Promise<AiToolStep> {
  const client = getClient();
  if (!client) throw new AiUnavailableError("ANTHROPIC_API_KEY is not configured");

  const response = await client.messages.create({
    model: params.model === "sonnet" ? MODEL_SONNET : MODEL_HAIKU,
    max_tokens: params.maxTokens ?? 800,
    system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
    tools: params.tools as any,
    messages: params.messages as any,
  });

  const blocks: AiConversationBlock[] = [];
  const toolCalls: AiToolCall[] = [];
  let text = "";
  for (const b of response.content) {
    if (b.type === "text") {
      text += b.text;
      blocks.push({ type: "text", text: b.text });
    } else if (b.type === "tool_use") {
      toolCalls.push({ id: b.id, name: b.name, input: b.input });
      blocks.push({ type: "tool_use", id: b.id, name: b.name, input: b.input });
    }
  }
  return { text: text.trim(), toolCalls, blocks };
}

/** نفس تصنيف الأخطاء الذي يستعمله `safeAiComplete` — بلا تكرار للمنطق. */
export function classifyAiError(err: unknown): AiResult<never> {
  if (err instanceof AiUnavailableError) {
    return { ok: false, reason: "disabled", message: "خدمة الذكاء الاصطناعي غير مفعّلة" };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { ok: false, reason: "rate_limit", message: "تجاوز حدّ الطلبات، حاول بعد قليل" };
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[ai] Anthropic API error ${err.status}:`, err.message);
    return { ok: false, reason: "api_error", message: "خطأ في خدمة الذكاء الاصطناعي" };
  }
  console.error("[ai] unexpected error:", err);
  return { ok: false, reason: "unknown", message: "خطأ غير متوقع" };
}
