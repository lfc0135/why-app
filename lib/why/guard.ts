export type Refusal = "hate" | "explicit"

const EXPLICIT =
  /\b(porn|porno|pornography|xxx|hentai|nude|nudes|fetish|erotica|blowjob|handjob|cumshot|orgasm)\b/i

const HATE =
  /\b(kill all|hate all|gas the|racial slur|white power|ethnic cleansing)\b/i

/** Slurs and explicit requests are refused before any lookup. */
const BLOCKED_TOKENS = new Set([
  "nigger",
  "niggers",
  "faggot",
  "faggots",
  "kike",
  "kikes",
  "spic",
  "spics",
  "chink",
  "chinks",
  "retard",
  "retards",
])

export function refusalFor(input: string): Refusal | null {
  const normalized = input.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  if (EXPLICIT.test(normalized) || HATE.test(normalized)) {
    return EXPLICIT.test(normalized) ? "explicit" : "hate"
  }
  const tokens = normalized.split(/\s+/).filter(Boolean)
  if (tokens.some((token) => BLOCKED_TOKENS.has(token))) return "hate"
  return null
}

const FINANCE =
  /\b(inflation|tax|taxes|loan|loans|stock|stocks|invest|investment|debt|money|bank|banks|interest|salary|crypto|financ|apr|apy)\b/i
const LEGAL = /\b(law|legal|court|crime|criminal|contract|lawsuit|attorney|statute|illegal)\b/i
const MEDICAL =
  /\b(medic|disease|cancer|symptom|vaccine|diagnos|virus|infect|therapy|depression|anxiety|illness|tumor|diabetes|dose)\b/i

export function topicCaution(text: string): string | undefined {
  if (FINANCE.test(text) || LEGAL.test(text) || MEDICAL.test(text)) {
    return "Educational only, not financial, legal, tax, or medical advice."
  }
  return undefined
}
