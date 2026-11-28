// **حلقةُ محادثة Opus** (§4.ha، الفقرتان ٣.٢ و٣.٣) — طلبٌ بالبثّ، والتفكيرُ `adaptive` بلا عرض، والعمقُ `high` للكاتب و`xhigh` للمراجع والمدقّق
// (و`xhigh` يلزمه `max_tokens` ≥ ٦٤ ألفاً)، و`tool_choice: auto` (القسريُّ ٤٠٠ على Opus 5.5)، والأدواتُ ثابتة. ومحتوى المساعد يُعاد **كما هو حرفاً**
// (التفكيرُ ونتائجُ البحث)، و`pause_turn` يُكمَل بلا رسالة مستخدمٍ زائدة، و`refusal` نهائيٌّ لا يُعاد ولا تُنفَّذ أداتُه، و`max_tokens` يُعاد مرّةً بسقفٍ أعلى.
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_OPUS } from "../ai/provider";
import { findQueryLeaks, type IdentifierSet } from "@shared/physio_agent_privacy";
import { CONTEXT_SOFT_LIMIT_TOKENS, normalizeSourceUrl, WEB_FETCH_BUDGET, WEB_SEARCH_BUDGET } from "@shared/physio_agent";
import { AgentFatal, AgentStop, callModel, type AgentRole } from "./model";
import { SYSTEM, NUDGE, BUDGET_NOTE, MULTI_TERMINAL_ERROR, TRUNCATION_NOTE } from "./prompts";
import { READ_TOOLS, runReadTool, TERMINALS, TOOLS } from "./tools";

export const MAX_TURNS = 80;
export const MAX_PAUSES = 20;
export const MAX_NUDGES = 2;

/** مهلُ الإعادة داخل التشغيل (٢٠ ث · دقيقة · ٣ د · ٨ د ±١٠٪) — تُستبدل في الاختبار. */
let retryDelaysMs = [20_000, 60_000, 180_000, 480_000];
export function setRetryDelaysForTests(d: number[] | null): void { retryDelaysMs = d ?? [20_000, 60_000, 180_000, 480_000]; }
export const retryDelays = () => retryDelaysMs;

const NET_CODE = /^(ECONNRESET|ETIMEDOUT|ECONNREFUSED|ECONNABORTED|EPIPE|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|UND_ERR_)/;
/** سلسلةُ الأسباب كلُّها (`cause` بعد `cause`) — انقطاعُ المقبس في منتصف البثّ يصل ملفوفاً مرّتين (`AnthropicError("terminated")` ⟵ `TypeError` ⟵ `SocketError`). */
function causeChain(e: unknown): any[] {
  const out: any[] = [];
  for (let c: any = e, i = 0; c && i < 8; c = c.cause, i++) out.push(c);
  return out;
}
/** «الطلبُ أطول من النافذة» — ٤٠٠ لا يُعاد، وله رمزُه (`context_too_long`). */
export function isPromptTooLong(e: unknown): boolean {
  return e instanceof Anthropic.APIError && (e as any).status === 400 && /prompt is too long|too many tokens|context (window|length)/i.test(String((e as Error).message ?? ""));
}

/** **العابرُ يُعاد، والباقي نهائيّ** — ومنه خطأُ SSE في منتصف البثّ (`APIError` بلا `status`، من نوع الحِمل الزائد)، وانقطاعُ الاتّصال في منتصف البثّ
 *  (`AnthropicError` ليس `APIError`: «terminated» و«request ended without sending any chunks» و«stream ended without producing a Message»)،
 *  و٤٠٨ و٤٠٩ كما يعيدهما الـSDK نفسُه، و`x-should-retry` حين يُرسَل يغلب. */
export function isTransient(e: unknown): boolean {
  if (e instanceof Anthropic.APIUserAbortError) return false;
  if (e instanceof AgentFatal || e instanceof AgentStop) return false;
  if (e instanceof Anthropic.APIConnectionError) return true;
  if (e instanceof Anthropic.APIError) {
    const sr = (e as any).headers?.get?.("x-should-retry") ?? (e as any).headers?.["x-should-retry"];
    if (sr === "true") return true;
    if (sr === "false") return false;
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) return true;
    const st = (e as any).status as number | undefined;
    if (st !== undefined && st !== null) return [408, 409, 429, 500, 502, 503, 504, 529].includes(st);
    const t = (e as any).error?.error?.type ?? (e as any).error?.type;
    return ["overloaded_error", "api_error", "rate_limit_error", "timeout_error"].includes(String(t));
  }
  //  خطأُ الـSDK بلا استجابة (انقطاعُ البثّ) — عابر.
  if (e instanceof Anthropic.AnthropicError) return true;
  //  خطأُ شبكةٍ من خارج الـSDK، في أيّ حلقةٍ من سلسلة الأسباب.
  return causeChain(e).some((c) => (typeof c?.code === "string" && NET_CODE.test(c.code)) || (c instanceof Error && /^terminated$|socket hang up|other side closed/i.test(c.message)));
}
export class TransientExhausted extends Error {
  constructor(public last: unknown) { super(`transient error after retries: ${(last as any)?.message ?? last}`); }
}

export interface Usage { in: number; out: number; cacheRead: number; cacheWrite: number; turns: number }
export interface TraceEntry { role: AgentRole; turn: number; stop: string | null; tools: string[]; queries: string[]; urls: string[] }

export interface RunCtx {
  ids: IdentifierSet;
  signal: AbortSignal;
  /** يرمي `AgentStop` إن أُلغيت أو انتهت المهلة. */
  checkpoint(): void;
  sleep(ms: number): Promise<void>;
  usage: Record<AgentRole, Usage>;
  /** عدّادُ البحث **لكلّ دور** — فلا يأكل الكاتبُ ميزانيةَ المراجع والمدقّق. */
  web: Record<AgentRole, { searches: number; fetches: number }>;
  fetched: Set<string>;
  searched: Set<string>;
  trace: TraceEntry[];
  onResearch(): void;
  onRetry(role: AgentRole, attempt: number, e: unknown): void;
  /** رصدُ استعلام بحثٍ فيه هويّة — يُسجَّل ثمّ تفشل الوظيفة. */
  onPrivacyStop(kinds: string[]): Promise<void>;
  /** رفضٌ أوّل يُعاد — يُسجَّل في الأثر. */
  onRefusal?(role: AgentRole, details: unknown): void;
}

export type TerminalResult =
  | { kind: "continue"; content: string; isError: boolean }
  | { kind: "done"; outcome: unknown };
export type TerminalHandler = (name: string, input: unknown, ctx: RunCtx) => Promise<TerminalResult>;

/** الطلب: التعليماتُ بعلامة تخزينٍ صريحة ساعةً (الأطولُ أوّلاً)، والذيلُ المتنامي بالتخزين التلقائيّ خمسَ دقائق — فكتابةُ أدوات الخادم (خمسُ دقائق)
 *  لا تأتي قبل علامةٍ أطول منها. وبعد انقطاعٍ (`max_tokens`): المراجعُ والمدقّقُ بسقفٍ مضاعف، والكاتبُ في سقفه الأعلى أصلاً — فيُضاف له «اختصر». */
export function requestBody(role: AgentRole, messages: Anthropic.MessageParam[], truncRetry: boolean): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: MODEL_OPUS,
    max_tokens: role === "writer" ? 128000 : 64000 * (truncRetry ? 2 : 1),
    thinking: { type: "adaptive", display: "omitted" },
    output_config: { effort: role === "writer" ? "high" : "xhigh" },
    cache_control: { type: "ephemeral" },
    system: [{ type: "text", text: SYSTEM[role], cache_control: { type: "ephemeral", ttl: "1h" } }],
    tools: TOOLS[role],
    tool_choice: { type: "auto" },
    messages: truncRetry ? withTruncationNote(messages) : messages,
  };
}
/** «اختصر» في آخر رسالة مستخدمٍ لم يُجَب عنها بعد — لا يمسّ ما قبلها (ربطُ التفكير بما سبق باقٍ). */
function withTruncationNote(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return messages;
  const content = typeof last.content === "string" ? [{ type: "text" as const, text: last.content }] : [...(last.content as any[])];
  return [...messages.slice(0, -1), { role: "user", content: [...content, { type: "text", text: TRUNCATION_NOTE }] }];
}

async function callWithRetry(role: AgentRole, body: Anthropic.MessageCreateParamsNonStreaming, ctx: RunCtx): Promise<Anthropic.Message> {
  const delays = retryDelays();
  for (let attempt = 0; ; attempt++) {
    ctx.checkpoint();
    try {
      return await callModel({ role, body, signal: ctx.signal }, ctx.ids);
    } catch (e) {
      if (e instanceof Anthropic.APIUserAbortError || ctx.signal.aborted) {
        const r = (ctx.signal as any).reason;
        throw r instanceof AgentStop ? r : new AgentStop("cancel");
      }
      if (!isTransient(e)) {
        if (e instanceof AgentFatal) throw e;
        if (isPromptTooLong(e)) throw new AgentFatal("context_too_long", undefined, String((e as Error).message).slice(0, 2000));
        if (e instanceof Anthropic.APIError) throw new AgentFatal("api_error", undefined, `${(e as any).status ?? ""} ${(e as Error).message}`.slice(0, 2000));
        throw e;
      }
      if (attempt >= delays.length) throw new TransientExhausted(e);
      ctx.onRetry(role, attempt + 1, e);
      const ra = Number((e as any)?.headers?.get?.("retry-after") ?? (e as any)?.headers?.["retry-after"]);
      const base = delays[attempt] * (0.9 + Math.random() * 0.2);
      await ctx.sleep(Number.isFinite(ra) && ra * 1000 > base ? ra * 1000 : base);
    }
  }
}

function scanServerBlocks(role: AgentRole, msg: Anthropic.Message, ctx: RunCtx, turn: number): { queries: string[]; urls: string[]; sawServerTool: boolean } {
  const queries: string[] = [];
  const urls: string[] = [];
  let sawServerTool = false;
  for (const b of msg.content as any[]) {
    if (b.type === "server_tool_use") {
      sawServerTool = true;
      if (b.name === "web_search" && typeof b.input?.query === "string") queries.push(b.input.query);
      else if (b.name === "web_fetch" && typeof b.input?.url === "string") queries.push(b.input.url);
      //  أيُّ أداة خادمٍ أخرى (تنفيذُ شيفرةٍ يستدعي البحث) — مدخلُها كلُّه يُفحص للهويّة. (`allowed_callers: ["direct"]` يمنعها أصلاً.)
      else queries.push(JSON.stringify(b.input ?? null));
    } else if (b.type === "web_fetch_tool_result") {
      if (b.content?.type === "web_fetch_result" && typeof b.content.url === "string") { const u = normalizeSourceUrl(b.content.url); ctx.fetched.add(u); urls.push(u); }
    } else if (b.type === "web_search_tool_result") {
      if (Array.isArray(b.content)) for (const r of b.content) if (typeof r?.url === "string") ctx.searched.add(normalizeSourceUrl(r.url));
    }
  }
  void role; void turn;
  return { queries, urls, sawServerTool };
}

/** **محادثةٌ واحدة حتى أداة إنهاء** — `outcome` ما أرجعه معالجُ الإنهاء. */
export async function runConversation(role: AgentRole, initialUser: string, ctx: RunCtx, onTerminal: TerminalHandler): Promise<unknown> {
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: [{ type: "text", text: initialUser }] }];
  let pauses = 0, trunc = 0, nudges = 0, refusals = 0;
  for (let turn = 0; ; turn++) {
    if (turn >= MAX_TURNS) throw new AgentFatal("too_many_turns");
    ctx.checkpoint();
    const msg = await callWithRetry(role, requestBody(role, messages, trunc > 0), ctx);
    const u = ctx.usage[role];
    u.in += msg.usage?.input_tokens ?? 0; u.out += msg.usage?.output_tokens ?? 0; u.turns += 1;
    u.cacheRead += msg.usage?.cache_read_input_tokens ?? 0; u.cacheWrite += msg.usage?.cache_creation_input_tokens ?? 0;
    const web = ctx.web[role];
    web.searches += msg.usage?.server_tool_use?.web_search_requests ?? 0;
    web.fetches += msg.usage?.server_tool_use?.web_fetch_requests ?? 0;
    //  ما أُرسل في هذه الجولة كلُّه (المدخلُ غيرُ المخزَّن والمقروءُ والمكتوبُ من التخزين) — والسياقُ يكبر بكلّ صفحةٍ تُفتح.
    const contextTokens = (msg.usage?.input_tokens ?? 0) + (msg.usage?.cache_read_input_tokens ?? 0) + (msg.usage?.cache_creation_input_tokens ?? 0);
    const scan = scanServerBlocks(role, msg, ctx, turn);
    if (scan.sawServerTool) ctx.onResearch();
    const toolNames = (msg.content as any[]).filter((b) => b.type === "tool_use").map((b) => b.name);
    if (ctx.trace.length < 400) ctx.trace.push({ role, turn, stop: msg.stop_reason ?? null, tools: toolNames, queries: scan.queries.slice(0, 10), urls: scan.urls.slice(0, 10) });
    for (const q of scan.queries) {
      const kinds = findQueryLeaks(q, ctx.ids);
      if (kinds.length) { await ctx.onPrivacyStop(kinds); throw new AgentFatal("identifier_in_query", undefined, kinds.join(",")); }
    }
    if (web.searches > WEB_SEARCH_BUDGET * 1.5 || web.fetches > WEB_FETCH_BUDGET * 1.5) throw new AgentFatal("research_budget", undefined, role);
    const budgetReached = web.searches >= WEB_SEARCH_BUDGET || web.fetches >= WEB_FETCH_BUDGET || contextTokens >= CONTEXT_SOFT_LIMIT_TOKENS;

    if (msg.stop_reason === "refusal") {
      //  المصنِّفُ قد يخطئ في النصّ الطبيّ — يُعاد الطلبُ نفسُه مرّةً، ثمّ نهائيّ بفئته.
      const details = (msg as any).stop_details ?? null;
      if (refusals++ < 1) { ctx.onRefusal?.(role, details); continue; }
      throw new AgentFatal("refusal", undefined, JSON.stringify({ role, category: details?.category ?? null, details }).slice(0, 2000));
    }
    if (msg.stop_reason === "pause_turn") {
      if (++pauses > MAX_PAUSES) throw new AgentFatal("paused_too_long");
      messages = [...messages, { role: "assistant", content: msg.content as any }];
      continue;
    }
    if (msg.stop_reason === "max_tokens") {
      if (trunc++ < 1) continue;
      throw new AgentFatal("output_truncated", undefined, role);
    }
    trunc = 0;
    const toolUses = (msg.content as any[]).filter((b) => b.type === "tool_use") as Anthropic.ToolUseBlock[];
    messages = [...messages, { role: "assistant", content: msg.content as any }];
    if (!toolUses.length) {
      if (nudges++ >= MAX_NUDGES) throw new AgentFatal("no_submission");
      messages = [...messages, { role: "user", content: [{ type: "text", text: budgetReached ? `${NUDGE[role]} ${BUDGET_NOTE}` : NUDGE[role] }] }];
      continue;
    }
    const terminals = toolUses.filter((t) => TERMINALS[role].includes(t.name));
    if (terminals.length > 1 || (terminals.length === 1 && toolUses.length > 1)) {
      messages = [...messages, { role: "user", content: toolUses.map((tu) => ({ type: "tool_result" as const, tool_use_id: tu.id, is_error: true, content: MULTI_TERMINAL_ERROR })) }];
      continue;
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      let content: string; let isError: boolean;
      if (TERMINALS[role].includes(tu.name)) {
        const r = await onTerminal(tu.name, tu.input, ctx);
        if (r.kind === "done") return r.outcome;
        content = r.content; isError = r.isError;
      } else if ((READ_TOOLS as readonly string[]).includes(tu.name)) {
        const r = await runReadTool(tu.name, tu.input);
        content = r.content; isError = r.isError;
      } else {
        content = `Unknown tool ${tu.name}.`; isError = true;
      }
      if (budgetReached) content = `${content}\n${BUDGET_NOTE}`;
      results.push({ type: "tool_result", tool_use_id: tu.id, content, ...(isError ? { is_error: true } : {}) });
    }
    messages = [...messages, { role: "user", content: results }];
  }
}
