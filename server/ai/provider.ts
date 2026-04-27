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
    messages: [{ role: "user", content: params.user }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return "";
  return textBlock.text.trim();
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
