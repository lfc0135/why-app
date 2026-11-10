import {
  assertEfficientModel,
  releaseCall,
  reserveCall,
  settleCall,
} from "@/lib/why/ledger"
import { costMicroUsd, estimateTokens, type UsageTokens } from "@/lib/why/pricing"
import { SYSTEM_PROMPT } from "@/lib/why/prompt"

export const DEFAULT_CLAUDE_MODEL = "claude-haiku-5-5"
export const ANTHROPIC_VERSION = "2023-06-01"
export const CLAUDE_MAX_OUTPUT_TOKENS = 2200

export type LlmProvider = "anthropic" | "openai"

export type LlmConfig = {
  provider: LlmProvider
  apiKey: string
  baseUrl: string
  model: string
}

/** Server-only. Returns null when the selected provider has no key. */
export function llmConfig(): LlmConfig | null {
  const provider = normalizeProvider(process.env.LLM_PROVIDER)
  if (provider === "openai") {
    const apiKey = process.env.LLM_API_KEY?.trim() ?? ""
    if (!apiKey) return null
    return {
      provider,
      apiKey,
      baseUrl: (process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.LLM_MODEL?.trim() || "gpt-4o-mini",
    }
  }
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() ?? ""
  if (!apiKey) return null
  return {
    provider: "anthropic",
    apiKey,
    baseUrl: (process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com").replace(/\/$/, ""),
    model: process.env.LLM_MODEL?.trim() || DEFAULT_CLAUDE_MODEL,
  }
}

export function normalizeProvider(value: string | undefined): LlmProvider {
  const provider = value?.trim().toLowerCase()
  if (provider === "openai" || provider === "openai-compatible") return "openai"
  return "anthropic"
}

export async function* streamChat(
  config: LlmConfig,
  question: string,
  signal?: AbortSignal,
  grounding?: string,
  term?: string,
): AsyncGenerator<string> {
  if (config.provider === "anthropic") {
    yield* streamAnthropic(config, question, signal, grounding, term)
    return
  }
  yield* streamOpenAI(config, question, signal, grounding)
}

export function previewMaxCostMicro(config: LlmConfig, question: string, grounding?: string): number {
  const request = anthropicRequest(config, question, grounding)
  const inputTokens = estimateTokens(String(request.init.body ?? ""))
  return costMicroUsd(config.model, {
    inputTokens,
    outputTokens: CLAUDE_MAX_OUTPUT_TOKENS,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
  })
}

export function anthropicRequest(config: LlmConfig, question: string, grounding?: string): {
  url: string
  init: RequestInit
} {
  return {
    url: `${config.baseUrl}/v1/messages`,
    init: {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: CLAUDE_MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent(question, grounding) }],
      }),
    },
  }
}

export function readAnthropicUsage(event: string): Partial<UsageTokens> | null {
  const json = readAnthropicJson(event)
  if (!json) return null
  const usage =
    json.type === "message_start"
      ? json.message?.usage
      : json.type === "message_delta"
        ? json.usage
        : undefined
  if (!usage) return null
  const partial: Partial<UsageTokens> = {}
  if (typeof usage.input_tokens === "number") partial.inputTokens = usage.input_tokens
  if (typeof usage.output_tokens === "number") partial.outputTokens = usage.output_tokens
  if (typeof usage.cache_creation_input_tokens === "number") {
    partial.cacheWriteTokens = usage.cache_creation_input_tokens
  }
  if (typeof usage.cache_read_input_tokens === "number") partial.cacheReadTokens = usage.cache_read_input_tokens
  return partial
}

/** Pull spoken text out of one Anthropic SSE event. Ignores thinking and tool deltas. */
export function readAnthropicEvent(event: string): string {
  const json = readAnthropicJson(event)
  if (!json) return ""
  if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
    return json.delta.text ?? ""
  }
  return ""
}

function readAnthropicJson(event: string): {
  type?: string
  delta?: { type?: string; text?: string }
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  message?: {
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
} | null {
  const data = event
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("")
  if (!data || data === "[DONE]") return null
  try {
    return JSON.parse(data) as ReturnType<typeof readAnthropicJson>
  } catch {
    return null
  }
}

async function* streamAnthropic(
  config: LlmConfig,
  question: string,
  signal: AbortSignal | undefined,
  grounding?: string,
  term?: string,
): AsyncGenerator<string> {
  assertEfficientModel(config.model)
  const maxCostMicro = previewMaxCostMicro(config, question, grounding)
  const hold = await reserveCall({
    model: config.model,
    term: (term ?? question).slice(0, 120),
    maxCostMicro,
  })
  const usage: UsageTokens = {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
  }
  let sawUsage = false
  let accepted = false
  try {
    const request = anthropicRequest(config, question, grounding)
    const response = await fetch(request.url, { ...request.init, signal })
    if (!response.ok || !response.body) {
      throw new Error(`Model request failed (${response.status})`)
    }
    accepted = true
    yield* readAnthropicStream(response.body, usage, () => {
      sawUsage = true
    })
  } finally {
    if (accepted) {
      const estimated = !sawUsage
      await settleCall(hold.id, config.model, estimated ? maxUsage(config, question, grounding) : usage, estimated)
    } else {
      await releaseCall(hold.id)
    }
  }
}

function maxUsage(config: LlmConfig, question: string, grounding?: string): UsageTokens {
  const request = anthropicRequest(config, question, grounding)
  return {
    inputTokens: estimateTokens(String(request.init.body ?? "")),
    outputTokens: CLAUDE_MAX_OUTPUT_TOKENS,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
  }
}

async function* readAnthropicStream(
  body: ReadableStream<Uint8Array>,
  usage: UsageTokens,
  onUsage: () => void,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  const take = (event: string) => {
    const reported = readAnthropicUsage(event)
    if (reported) {
      onUsage()
      if (reported.inputTokens != null) usage.inputTokens = reported.inputTokens
      if (reported.outputTokens != null) usage.outputTokens = reported.outputTokens
      if (reported.cacheWriteTokens != null) usage.cacheWriteTokens = reported.cacheWriteTokens
      if (reported.cacheReadTokens != null) usage.cacheReadTokens = reported.cacheReadTokens
    }
    return readAnthropicEvent(event)
  }
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split("\n\n")
    buffer = events.pop() ?? ""
    for (const event of events) {
      const token = take(event)
      if (token) yield token
    }
  }
  const tail = take(buffer)
  if (tail) yield tail
}

async function* streamOpenAI(
  config: LlmConfig,
  question: string,
  signal: AbortSignal | undefined,
  grounding?: string,
): AsyncGenerator<string> {
  let response = await completeOpenAI(config, question, signal, true, grounding)
  if (response.status === 400) {
    response = await completeOpenAI(config, question, signal, false, grounding)
  }
  if (!response.ok || !response.body) {
    throw new Error(`Model request failed (${response.status})`)
  }
  yield* readSseText(response.body, readOpenAILine)
}

async function completeOpenAI(
  config: LlmConfig,
  question: string,
  signal: AbortSignal | undefined,
  jsonMode: boolean,
  grounding?: string,
): Promise<Response> {
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent(question, grounding) },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  })
}

function userContent(question: string, grounding?: string): string {
  if (!grounding) return question
  return `${question}\n\nGround the explainer in this source when it is relevant. Do not contradict it, and do not invent a different definition.\n${grounding}`
}

async function* readSseText(
  body: ReadableStream<Uint8Array>,
  read: (event: string) => string,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split("\n\n")
    buffer = events.pop() ?? ""
    for (const event of events) {
      const token = read(event)
      if (token) yield token
    }
  }
  const tail = read(buffer)
  if (tail) yield tail
}

function readOpenAILine(event: string): string {
  let text = ""
  for (const line of event.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("data:")) continue
    const data = trimmed.slice(5).trim()
    if (!data || data === "[DONE]") continue
    try {
      const json = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[]
      }
      text += json.choices?.[0]?.delta?.content ?? ""
    } catch {
      // Ignore keepalives.
    }
  }
  return text
}
