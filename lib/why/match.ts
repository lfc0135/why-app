import { seeds } from "@/lib/why/seeds"
import type { ScenePlan } from "@/lib/why/schema"

const STOP = new Set([
  "what",
  "whats",
  "is",
  "are",
  "a",
  "an",
  "the",
  "explain",
  "please",
  "me",
  "does",
  "do",
  "mean",
  "means",
  "define",
  "tell",
  "about",
  "how",
  "of",
  "to",
  "for",
  "in",
  "on",
  "my",
  "i",
  "can",
  "you",
  "difference",
  "between",
  "and",
  "or",
  "compare",
  "comparison",
  "work",
  "works",
  "working",
])

export const CACHE_SCORE = 80

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\bversus\b/g, " vs ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map(singular)
    .filter((token) => token && !STOP.has(token))
    .join(" ")
}

function singular(token: string): string {
  if (token.length <= 3) return token
  if (token.endsWith("ss")) return token
  if (token.endsWith("ies")) return `${token.slice(0, -3)}y`
  if (/(ses|xes|ches|shes)$/.test(token)) return token.replace(/es$/, "")
  if (token.endsWith("s")) return token.slice(0, -1)
  return token
}

export function matchSeed(question: string): { plan: ScenePlan; score: number } | null {
  const normalized = normalize(question)
  if (!normalized) return null
  let best: { plan: ScenePlan; score: number } | null = null
  for (const plan of seeds) {
    const score = scorePlan(normalized, plan)
    if (!best || score > best.score) best = { plan, score }
  }
  if (!best || best.score < 55) return null
  return best
}

function scorePlan(normalized: string, plan: ScenePlan): number {
  const keys = [plan.question, ...plan.aliases].map(normalize).filter(Boolean)
  const queryTokens = new Set(normalized.split(" "))
  if (queryTokens.size === 1) {
    return keys.some((key) => key === normalized) ? 100 : 0
  }
  let best = 0
  for (const key of keys) {
    if (key === normalized) return 100
    const keyTokens = key.split(" ")
    if (keyTokens.length >= 2 && keyTokens.every((token) => queryTokens.has(token))) {
      best = Math.max(best, 92)
      continue
    }
    const overlap = keyTokens.filter((token) => queryTokens.has(token)).length
    if (keyTokens.length >= 3 && overlap / keyTokens.length >= 0.75) {
      best = Math.max(best, 86)
    }
    const union = new Set([...keyTokens, ...queryTokens]).size
    best = Math.max(best, Math.round((overlap / union) * 70))
  }
  return best
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function buildTranscript(
  scenes: { narration: string }[],
  jurisdictionNote?: string,
): string {
  const spoken = scenes
    .map((scene) => scene.narration.trim())
    .filter(Boolean)
    .join(" ")
  const note = jurisdictionNote?.trim()
  if (!note) return spoken
  if (spoken.toLowerCase().includes(note.toLowerCase())) return spoken
  return `${spoken} ${note}`
}
