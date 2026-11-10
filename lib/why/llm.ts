import { SYSTEM_PROMPT } from "@/lib/why/prompt"

export type LlmConfig = {
  apiKey: string
  baseUrl: string
  model: string
}

export function llmConfig(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY?.trim() ?? ""
  if (!apiKey) return null
  const baseUrl = (process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "")
  const model = process.env.LLM_MODEL?.trim() || "gpt-4o-mini"
  return { apiKey, baseUrl, model }
}

export async function* streamChat(
  config: LlmConfig,
  question: string,
  signal?: AbortSignal,
  grounding?: string,
): AsyncGenerator<string> {
  let response = await complete(config, question, signal, true, grounding)
  if (response.status === 400) {
    response = await complete(config, question, signal, false, grounding)
  }
  if (!response.ok || !response.body) {
    throw new Error(`Model request failed (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      const token = readDelta(line)
      if (token) yield token
    }
  }
  const tail = readDelta(buffer)
  if (tail) yield tail
}

async function complete(
  config: LlmConfig,
  question: string,
  signal: AbortSignal | undefined,
  jsonMode: boolean,
  grounding?: string,
): Promise<Response> {
  const sourced = grounding
    ? `${question}\n\nGround the explainer in this source when it is relevant. Do not contradict it, and do not invent a different definition.\n${grounding}`
    : question
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
        { role: "user", content: sourced },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  })
}

function readDelta(line: string): string {
  const trimmed = line.trim()
  if (!trimmed.startsWith("data:")) return ""
  const data = trimmed.slice(5).trim()
  if (!data || data === "[DONE]") return ""
  try {
    const json = JSON.parse(data) as {
      choices?: { delta?: { content?: string } }[]
    }
    return json.choices?.[0]?.delta?.content ?? ""
  } catch {
    return ""
  }
}
