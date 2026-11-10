import { describe, expect, it } from "vitest"
import { CACHE_SCORE, matchSeed, normalize } from "@/lib/why/match"

describe("checked-shelf matcher", () => {
  it("normalizes everyday phrasings", () => {
    expect(normalize("What's a liquidity pool?")).toBe("liquidity pool")
    expect(normalize("APR versus APY")).toBe("apr vs apy")
    expect(normalize("tell me about holding companies")).toBe("holding company")
  })

  it("hits the flagship and the holding-company explainer", () => {
    expect(matchSeed("What is a liquidity pool?")?.plan.id).toBe("liquidity-pool")
    expect(matchSeed("what is a liquidity pool")?.score).toBeGreaterThanOrEqual(CACHE_SCORE)
    expect(matchSeed("liquidity pools")?.plan.id).toBe("liquidity-pool")
    expect(matchSeed("explain KYC")?.plan.id).toBe("kyc")
    expect(matchSeed("APR versus APY")?.plan.id).toBe("apr-vs-apy")
    expect(matchSeed("What is a holding company?")?.plan.id).toBe("holding-company")
    expect(matchSeed("UAE mainland vs free zone company")?.plan.id).toBe("uae-mainland-vs-free-zone")
  })

  it("does not pretend an unrelated question is on the shelf", () => {
    expect(matchSeed("What is photosynthesis?")).toBeNull()
    expect(matchSeed("pool")).toBeNull()
  })
})
