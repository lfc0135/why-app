import { SYSTEM_PROMPT } from "@/lib/why/prompt"

export const DEFAULT_CLAUDE_MODEL = "claude-haiku-5-5"
export const ANTHROPIC_VERSION = "2023-06-01"

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
): AsyncGenerator<string> {
  if (config.provider === "anthropic") {
    yield* streamAnthropic(config, question, signal, grounding)
    return
  }
  yield* streamOpenAI(config, question, signal, grounding)
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
        max_tokens: 4096,
        temperature: 0.2,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent(question, grounding) }],
      }),
    },
  }
}

/** Pull spoken text out of one Anthropic SSE event. Ignores thinking and tool deltas. */
export function readAnthropicEvent(event: string): string {
  const data = event
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("")
  if (!data || data === "[DONE]") return ""
  try {
    const json = JSON.parse(data) as {
      type?: string
      delta?: { type?: string; text?: string }
    }
    if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
      return json.delta.text ?? ""
    }
    return ""
  } catch {
    return ""
  }
}

async function* streamAnthropic(
  config: LlmConfig,
  question: string,
  signal: AbortSignal | undefined,
  grounding?: string,
): AsyncGenerator<string> {
  const request = anthropicRequest(config, question, grounding)
  const response = await fetch(request.url, { ...request.init, signal })
  if (!response.ok || !response.body) {
    throw new Error(`Model request failed (${response.status})`)
  }
  yield* readSseText(response.body, readAnthropicEvent)
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
