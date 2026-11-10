import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ANTHROPIC_VERSION,
  DEFAULT_CLAUDE_MODEL,
  anthropicRequest,
  llmConfig,
  readAnthropicEvent,
  streamChat,
} from "@/lib/why/llm"
import { publicConfig } from "@/lib/why/tts"

const ENV_KEYS = ["LLM_PROVIDER", "LLM_MODEL", "LLM_API_KEY", "LLM_BASE_URL", "ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "TTS_PROVIDER", "TTS_API_KEY"] as const

afterEach(() => {
  vi.unstubAllGlobals()
  for (const key of ENV_KEYS) delete process.env[key]
})

describe("Claude provider selection", () => {
  it("defaults to Anthropic and a fast Claude model when that key is set", () => {
    process.env.ANTHROPIC_API_KEY = "server-side-key"
    const config = llmConfig()
    expect(config).toMatchObject({
      provider: "anthropic",
      apiKey: "server-side-key",
      model: DEFAULT_CLAUDE_MODEL,
      baseUrl: "https://api.anthropic.com",
    })
    expect(DEFAULT_CLAUDE_MODEL).toBe("claude-haiku-5-5")
  })

  it("uses a configured Claude model id", () => {
    process.env.LLM_PROVIDER = "anthropic"
    process.env.ANTHROPIC_API_KEY = "server-side-key"
    process.env.LLM_MODEL = "claude-sonnet-5-5"
    expect(llmConfig()?.model).toBe("claude-sonnet-5-5")
  })

  it("does not treat an OpenAI key as a Claude key", () => {
    process.env.LLM_PROVIDER = "anthropic"
    process.env.LLM_API_KEY = "openai-key"
    expect(llmConfig()).toBeNull()
  })

  it("keeps the OpenAI-compatible path", () => {
    process.env.LLM_PROVIDER = "openai"
    process.env.LLM_API_KEY = "openai-key"
    expect(llmConfig()).toMatchObject({
      provider: "openai",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com/v1",
    })
  })

  it("tells the browser only whether a model is configured", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-secret-value"
    const config = publicConfig()
    expect(config).toEqual({ llm: true, tts: false })
    expect(JSON.stringify(config)).not.toContain("sk-ant")
    expect(JSON.stringify(config)).not.toContain("secret")
  })
})

describe("Anthropic Messages stream", () => {
  it("reads text deltas and ignores other event types", () => {
    const text = readAnthropicEvent(
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        delta: { type: "text_delta", text: "hello" },
      })}`,
    )
    const thinking = readAnthropicEvent(
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        delta: { type: "thinking_delta", thinking: "hidden" },
      })}`,
    )
    expect(text).toBe("hello")
    expect(thinking).toBe("")
  })

  it("streams a mocked Messages API response without sending the key to the page", async () => {
    const sse = [
      `event: message_start\ndata: ${JSON.stringify({ type: "message_start" })}\n`,
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        delta: { type: "text_delta", text: '{"title":' },
      })}\n`,
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        delta: { type: "text_delta", text: '"Photosynthesis"}' },
      })}\n`,
      `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n`,
    ].join("\n")

    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.anthropic.com/v1/messages")
      const headers = new Headers(init.headers)
      expect(headers.get("x-api-key")).toBe("test-key")
      expect(headers.get("anthropic-version")).toBe(ANTHROPIC_VERSION)
      const body = JSON.parse(String(init.body)) as {
        model: string
        stream: boolean
        system: string
        messages: { role: string; content: string }[]
      }
      expect(body.model).toBe("claude-haiku-5-5")
      expect(body.stream).toBe(true)
      expect(body.system.toLowerCase()).toContain("chalkboard")
      expect(body.messages[0]?.role).toBe("user")
      expect(body.messages[0]?.content).toContain("photosynthesis")
      expect(body.messages[0]?.content).toContain("Wiktionary")
      return new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } })
    })
    vi.stubGlobal("fetch", fetchMock)

    const config = {
      provider: "anthropic" as const,
      apiKey: "test-key",
      baseUrl: "https://api.anthropic.com",
      model: "claude-haiku-5-5",
    }
    const built = anthropicRequest(config, "photosynthesis", "Source: Wiktionary")
    expect(built.url).toBe("https://api.anthropic.com/v1/messages")
    expect(JSON.stringify(built.init.headers)).toContain("test-key")

    const chunks: string[] = []
    for await (const chunk of streamChat(config, "photosynthesis", undefined, "Source: Wiktionary")) {
      chunks.push(chunk)
    }
    expect(chunks.join("")).toBe('{"title":"Photosynthesis"}')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
