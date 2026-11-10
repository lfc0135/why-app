import { mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { produceClaudeScript } from "@/lib/why/claude-script"
import { explain } from "@/lib/why/explain"
import {
  BudgetExceededError,
  ClaudeModelError,
  budgetStatus,
  configuredBudgetUsd,
  HARD_BUDGET_USD,
} from "@/lib/why/ledger"
import { llmConfig, previewMaxCostMicro, streamChat } from "@/lib/why/llm"
import { costMicroUsd, microToUsd } from "@/lib/why/pricing"
import { writeScriptMp4 } from "@/lib/why/script-video"
import { runSmoke } from "@/lib/why/smoke"

const ENV_KEYS = [
  "LLM_PROVIDER",
  "LLM_MODEL",
  "ANTHROPIC_API_KEY",
  "CLAUDE_BUDGET_USD",
  "CLAUDE_LEDGER_PATH",
  "CLAUDE_CACHE_DIR",
  "CLAUDE_RUN_CAP_USD",
] as const

let dir = ""

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "why-budget-"))
  process.env.CLAUDE_LEDGER_PATH = path.join(dir, "ledger.json")
  process.env.CLAUDE_CACHE_DIR = path.join(dir, "cache")
  process.env.ANTHROPIC_API_KEY = "test-key-do-not-leak"
  process.env.LLM_PROVIDER = "anthropic"
  process.env.LLM_MODEL = "claude-haiku-5-5"
  delete process.env.CLAUDE_BUDGET_USD
  delete process.env.CLAUDE_RUN_CAP_USD
})

afterEach(async () => {
  vi.unstubAllGlobals()
  if (dir) await rm(dir, { recursive: true, force: true })
  for (const key of ENV_KEYS) delete process.env[key]
})

const emptyUsage = { cacheWriteTokens: 0, cacheReadTokens: 0 }

function scriptSse(inputTokens: number, outputTokens: number): string {
  const scene = (role: string, kicker: string) => ({
    id: role,
    role,
    kicker,
    durationMs: 6000,
    narration: `A plain spoken line about the ${role} of this idea.`,
    caption: `A plain spoken line about the ${role} of this idea.`,
    elements: [{ type: "text", text: kicker, x: 80, y: 140, size: "md", delay: 0, duration: 400 }],
  })
  const json = JSON.stringify({
    title: "Tide",
    domain: "science",
    jurisdictionNote: "",
    followUps: ["What is a current?", "What is the moon?"],
    scenes: [
      scene("hook", "The idea"),
      scene("analogy", "Picture it"),
      scene("mechanism", "How it works"),
      scene("example", "For example"),
      scene("takeaway", "Remember"),
    ],
  })
  return [
    `event: message_start\ndata: ${JSON.stringify({
      type: "message_start",
      message: { usage: { input_tokens: inputTokens, output_tokens: 1 } },
    })}\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({
      type: "content_block_delta",
      delta: { type: "text_delta", text: json },
    })}\n`,
    `event: message_delta\ndata: ${JSON.stringify({
      type: "message_delta",
      usage: { output_tokens: outputTokens },
    })}\n`,
  ].join("\n")
}

describe("published Claude prices", () => {
  it("prices Haiku 5.5 and Sonnet 5.5 from the published per-million rates", () => {
    const short = { inputTokens: 100_000, outputTokens: 1_000_000, ...emptyUsage }
    expect(microToUsd(costMicroUsd("claude-haiku-5-5", short))).toBe(0.51)
    const longPrompt = { inputTokens: 1_000_000, outputTokens: 1_000_000, ...emptyUsage }
    expect(microToUsd(costMicroUsd("claude-haiku-5-5", longPrompt))).toBe(3)
    expect(microToUsd(costMicroUsd("claude-sonnet-5-5", longPrompt))).toBe(12)
    const long = costMicroUsd("claude-haiku-5-5", { inputTokens: 100_001, outputTokens: 0, ...emptyUsage })
    expect(long).toBe(Math.ceil(100_001 * 0.5))
  })

  it("keeps the hard ceiling at $20", () => {
    process.env.CLAUDE_BUDGET_USD = "100"
    expect(configuredBudgetUsd()).toBe(HARD_BUDGET_USD)
    expect(HARD_BUDGET_USD).toBe(20)
  })
})

describe("Claude budget ledger", () => {
  it("refuses a call that would pass the budget and does not contact Anthropic", async () => {
    process.env.CLAUDE_BUDGET_USD = "0.0001"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    await expect(produceClaudeScript("photosynthesis", "Source: Wikipedia")).rejects.toBeInstanceOf(
      BudgetExceededError,
    )
    expect(fetchMock).not.toHaveBeenCalled()
    const status = await budgetStatus()
    expect(status.calls).toBe(0)
    expect(status.spentUsd).toBe(0)
    expect(status.budgetUsd).toBe(0.0001)
    expect(JSON.stringify(status)).not.toContain("test-key")
    expect(JSON.stringify(status)).not.toContain("do-not-leak")
  })

  it("records tokens and cost, then serves the same term from cache for free", async () => {
    const fetchMock = vi.fn(async () => new Response(scriptSse(2000, 400), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const first = await produceClaudeScript("photosynthesis", "Source: Wikipedia", "Wikipedia (https://example.test)")
    expect(first.fromCache).toBe(false)
    expect(first.script.scenes).toHaveLength(5)
    expect(first.costUsd).toBeCloseTo(0.0004, 6)
    const second = await produceClaudeScript("What is photosynthesis?")
    expect(second.fromCache).toBe(true)
    expect(second.costUsd).toBe(0)
    expect(fetchMock).toHaveBeenCalledOnce()
    const status = await budgetStatus()
    expect(status.calls).toBe(1)
    expect(status.cachedScripts).toBe(1)
    expect(status.spentUsd).toBeCloseTo(0.0004, 6)
    expect(status.remainingUsd).toBeCloseTo(20 - 0.0004, 6)
    expect(status.recent[0]).toMatchObject({
      model: "claude-haiku-5-5",
      inputTokens: 2000,
      outputTokens: 400,
      term: "photosynthesis",
    })
    expect(JSON.stringify(status)).not.toContain("test-key")
  })

  it("refuses Opus before any request", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const config = {
      provider: "anthropic" as const,
      apiKey: "test-key-do-not-leak",
      baseUrl: "https://api.anthropic.com",
      model: "claude-opus-5-5",
    }
    await expect(async () => {
      for await (const chunk of streamChat(config, "tide")) {
        void chunk
      }
    }).rejects.toBeInstanceOf(ClaudeModelError)
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await budgetStatus()).calls).toBe(0)
  })

  it("falls back to the cited source when the app would exceed the budget", async () => {
    process.env.CLAUDE_BUDGET_USD = "0.0001"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const events = []
    for await (const event of explain("What is a tide?", {
      llm: llmConfig(),
      lookup: async () => ({
        entry: {
          word: "tide",
          definition:
            "The periodic rise and fall of sea level caused by the gravitational pull of the moon and the sun on the oceans.",
          related: ["moon"],
          sourceName: "Test",
          sourceUrl: "https://example.test/tide",
        },
        suggestions: [],
      }),
    })) {
      events.push(event)
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expect(events.at(-1)?.event).toBe("done")
    const done = events.at(-1)
    if (done?.event === "done") expect(done.data.source).toContain("example.test/tide")
  })

  it("stops a smoke run before the next term would pass the per-run cap", async () => {
    const fetchMock = vi.fn(async () => new Response(scriptSse(2000, 400), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const config = llmConfig()
    expect(config).not.toBeNull()
    const estimate = previewMaxCostMicro(config!, "alpha")
    // Cap must allow one reserved call (estimate) but not a second after the
    // first call settles for less than the reserve. A 1.2x multiplier is too
    // loose once the output cap is 4096, because actual usage is far below it.
    const report = await runSmoke(["alpha", "beta"], {
      outDir: path.join(dir, "out"),
      runCapUsd: microToUsd(estimate + 1),
      renderVideo: false,
      lookup: async () => ({ entry: null, suggestions: [] }),
      config,
    })
    expect(report.terms).toHaveLength(1)
    expect(report.terms[0]?.term).toBe("alpha")
    expect(report.stopped).toMatch(/run cap/)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(report.runSpentUsd).toBeGreaterThan(0)
    expect(report.runSpentUsd).toBeLessThan(report.runCapUsd)
    const script = await stat(report.terms[0]!.scriptPath)
    expect(script.size).toBeGreaterThan(100)
  })
})

describe("script mp4", () => {
  it("writes a short chalkboard mp4", async () => {
    const dest = path.join(dir, "tide.mp4")
    await writeScriptMp4(
      {
        title: "Tide",
        scenes: [{ kicker: "The idea", narration: "The sea rises and falls.", durationMs: 400 }],
      },
      dest,
    )
    const file = await stat(dest)
    expect(file.size).toBeGreaterThan(1000)
  })
})
