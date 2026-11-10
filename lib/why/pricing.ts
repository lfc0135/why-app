/**
 * Claude API list prices, USD per million tokens.
 * Standard global tier from https://platform.claude.com/docs/en/about-claude/pricing
 * (rate card effective 2026-10-07). Cache writes use the 5-minute price.
 * Haiku 5.5 uses the higher row once the prompt is over 100,000 tokens.
 */
export type TokenRates = {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
  longFrom?: number
  longInput?: number
  longOutput?: number
  longCacheWrite?: number
  longCacheRead?: number
}

export const PUBLISHED_RATES: Record<string, TokenRates> = {
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    cacheWrite: 0.125,
    cacheRead: 0.01,
    longFrom: 100_000,
    longInput: 0.5,
    longOutput: 2.5,
    longCacheWrite: 0.625,
    longCacheRead: 0.05,
  },
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 },
  "claude-sonnet-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4-5": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
}

const HAIKU_FALLBACK = PUBLISHED_RATES["claude-haiku-4-5"]
const SONNET_FALLBACK = PUBLISHED_RATES["claude-sonnet-4-6"]

export type UsageTokens = {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

export function isEfficientModel(model: string): boolean {
  const id = model.trim().toLowerCase()
  return id.startsWith("claude-haiku") || id.startsWith("claude-sonnet")
}

export function ratesFor(model: string): TokenRates {
  const id = model.trim().toLowerCase()
  if (PUBLISHED_RATES[id]) return PUBLISHED_RATES[id]
  if (id.startsWith("claude-haiku")) return HAIKU_FALLBACK
  if (id.startsWith("claude-sonnet")) return SONNET_FALLBACK
  return { input: 10, output: 50, cacheWrite: 12.5, cacheRead: 1 }
}

/** Integer millionths of a dollar. 1 USD = 1_000_000. */
export function costMicroUsd(model: string, usage: UsageTokens): number {
  const rates = ratesFor(model)
  const promptTokens = usage.inputTokens + usage.cacheWriteTokens + usage.cacheReadTokens
  const long = rates.longFrom != null && promptTokens > rates.longFrom
  const input = long ? (rates.longInput ?? rates.input) : rates.input
  const output = long ? (rates.longOutput ?? rates.output) : rates.output
  const cacheWrite = long ? (rates.longCacheWrite ?? rates.cacheWrite) : rates.cacheWrite
  const cacheRead = long ? (rates.longCacheRead ?? rates.cacheRead) : rates.cacheRead
  return (
    ceilCost(usage.inputTokens, input) +
    ceilCost(usage.outputTokens, output) +
    ceilCost(usage.cacheWriteTokens, cacheWrite) +
    ceilCost(usage.cacheReadTokens, cacheRead)
  )
}

export function microToUsd(micro: number): number {
  return Math.round(micro) / 1_000_000
}

export function usdToMicro(usd: number): number {
  return Math.round(usd * 1_000_000)
}

/** Over-estimate so a reservation covers the real tokenizer. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2) + 64
}

function ceilCost(tokens: number, usdPerMillion: number): number {
  if (tokens <= 0 || usdPerMillion <= 0) return 0
  return Math.ceil(tokens * usdPerMillion - 1e-9)
}
