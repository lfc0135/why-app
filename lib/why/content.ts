export const DISCLAIMER =
  "Educational only, not financial, legal, or tax advice."

export const DOMAINS = [
  {
    id: "fintech",
    label: "Fintech & crypto",
    blurb: "Tokens, fees, and how a trade clears without a cashier.",
  },
  {
    id: "business",
    label: "Business structuring",
    blurb: "Companies, ownership, and how a business is put together.",
  },
] as const

export type DomainId = (typeof DOMAINS)[number]["id"]

export const ASK = {
  pool: "What is a liquidity pool?",
  apr: "APR vs APY",
  stable: "What is a stablecoin?",
  kyc: "What is KYC?",
  il: "What is impermanent loss?",
  amm: "What is an automated market maker?",
  wallet: "What is a crypto wallet?",
  gas: "What is a gas fee?",
  dex: "What is a decentralized exchange?",
  yield: "What is yield farming?",
  holding: "What is a holding company?",
  llc: "LLC vs sole proprietorship",
  uae: "UAE mainland vs free zone company",
  cap: "What is a cap table?",
  equity: "Equity vs debt financing",
  vest: "What is vesting?",
  dilution: "What is dilution?",
  dividend: "What is a dividend?",
  subsidiary: "What is a subsidiary?",
  options: "What is an option pool?",
} as const

export const FEATURED_QUESTIONS = [
  ASK.pool,
  ASK.holding,
  ASK.apr,
  ASK.cap,
  ASK.stable,
  ASK.llc,
  ASK.kyc,
  ASK.uae,
] as const

export const KICKERS = {
  hook: "The idea",
  analogy: "Picture it",
  mechanism: "How it works",
  example: "With numbers",
  takeaway: "Remember",
} as const

const TOPIC_LABELS: Record<string, string> = {
  fintech: "Fintech & crypto",
  business: "Business structuring",
  science: "Science",
  everyday: "Everyday",
  history: "History",
  feeling: "Feelings",
  tech: "Tech",
  general: "General",
}

export const ANY_WORD_PROMPTS = [
  "photosynthesis",
  "nostalgia",
  "gravity",
  "democracy",
  "volcano",
  "serendipity",
  ASK.pool,
  ASK.holding,
] as const

export function domainLabel(id: string): string {
  return TOPIC_LABELS[id] ?? DOMAINS.find((domain) => domain.id === id)?.label ?? "General"
}
