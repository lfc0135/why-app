import { describe, expect, it } from "vitest"
import { ASK, DISCLAIMER, DOMAINS } from "@/lib/why/content"
import { drawProgress } from "@/lib/why/geometry"
import { wordCount } from "@/lib/why/match"
import { ICON_NAMES, SCENE_ROLES, primitiveSchema, scenePlanSchema } from "@/lib/why/schema"
import { PRIMITIVE_TYPES, SYSTEM_PROMPT } from "@/lib/why/prompt"
import { seeds, seedById } from "@/lib/why/seeds"
import type { Primitive } from "@/lib/why/schema"

const JURISDICTION_IDS = [
  "holding-company",
  "llc-vs-sole-proprietorship",
  "uae-mainland-vs-free-zone",
  "cap-table",
  "equity-vs-debt",
  "vesting",
  "dilution",
  "dividend",
  "subsidiary",
  "option-pool",
  "kyc",
  "stablecoin",
  "apr-vs-apy",
]

describe("checked explainers", () => {
  it("ships 20 plans across both domains", () => {
    expect(seeds).toHaveLength(20)
    expect(new Set(seeds.map((plan) => plan.id)).size).toBe(20)
    expect(seeds.filter((plan) => plan.domain === "fintech")).toHaveLength(10)
    expect(seeds.filter((plan) => plan.domain === "business")).toHaveLength(10)
    for (const plan of seeds) {
      expect(DOMAINS.some((domain) => domain.id === plan.domain)).toBe(true)
      expect(scenePlanSchema.safeParse(plan).success).toBe(true)
    }
  })

  it("keeps the liquidity pool explainer as the flagship", () => {
    const plan = seedById("liquidity-pool")
    expect(plan?.question).toBe("What is a liquidity pool?")
    expect(plan?.title).toBe("Liquidity pool")
    expect(plan?.scenes.map((scene) => scene.role)).toEqual([...SCENE_ROLES])
    const spoken = plan?.scenes.map((scene) => scene.narration).join(" ") ?? ""
    expect(spoken.toLowerCase()).toContain("shared pot")
    expect(spoken.toLowerCase()).toContain("third of a percent")
    expect(spoken.toLowerCase()).toContain("not guaranteed")
    expect(plan?.scenes[2].elements.some((element) => element.type === "text" && element.text.includes("x · y"))).toBe(
      true,
    )
    expect(plan?.scenes[0].elements.filter((element) => element.type === "icon" && element.name === "coin")).toHaveLength(
      2,
    )
    const total = plan?.scenes.reduce((sum, scene) => sum + scene.durationMs, 0) ?? 0
    expect(total).toBeGreaterThanOrEqual(28000)
    expect(total).toBeLessThanOrEqual(32000)
  })

  it("stays near thirty seconds and in plain words", () => {
    for (const plan of seeds) {
      const words = wordCount(plan.scenes.map((scene) => scene.narration).join(" "))
      expect(words, plan.id).toBeGreaterThanOrEqual(60)
      expect(words, plan.id).toBeLessThanOrEqual(115)
      for (const scene of plan.scenes) {
        expect(scene.caption).toBe(scene.narration)
        for (const element of scene.elements) {
          expect(element.delay + element.duration).toBeLessThanOrEqual(scene.durationMs + 500)
        }
      }
    }
  })

  it("says when the answer depends on a place", () => {
    for (const id of JURISDICTION_IDS) {
      const plan = seedById(id)
      expect(plan?.jurisdictionNote, id).toBeTruthy()
    }
    const uae = seedById("uae-mainland-vs-free-zone")
    const uaeText = `${uae?.scenes.map((scene) => scene.narration).join(" ")} ${uae?.jurisdictionNote}`
    expect(uaeText.toLowerCase()).toContain("corporate tax")
    expect(uaeText.toLowerCase()).not.toContain("always tax free")
    expect(uaeText.toLowerCase()).toContain("strict")
    const kyc = seedById("kyc")
    const kycText = kyc?.scenes.map((scene) => scene.narration).join(" ") ?? ""
    expect(kycText.toLowerCase()).not.toMatch(/avoid kyc|bypass|without kyc/)
  })

  it("points every follow-up at another checked question", () => {
    const questions = new Set(seeds.map((plan) => plan.question))
    for (const plan of seeds) {
      expect(plan.followUps.length).toBeGreaterThanOrEqual(2)
      for (const followUp of plan.followUps) {
        expect(questions.has(followUp), `${plan.id} -> ${followUp}`).toBe(true)
        expect(followUp).not.toBe(plan.question)
      }
    }
    expect(seedById("liquidity-pool")?.followUps).toEqual([
      ASK.il,
      ASK.amm,
      ASK.dex,
    ])
    expect(seedById("holding-company")?.followUps).toContain(ASK.subsidiary)
  })

  it("uses the real APR to APY example", () => {
    const apy = (1 + 0.12 / 12) ** 12 - 1
    expect(apy).toBeCloseTo(0.1268, 3)
    const spoken = seedById("apr-vs-apy")?.scenes.map((scene) => scene.narration).join(" ") ?? ""
    expect(spoken).toContain("12.7")
  })
})

describe("scene plan schema", () => {
  it("rejects a plan that skips the takeaway", () => {
    const plan = structuredClone(seedById("liquidity-pool"))
    plan!.scenes = plan!.scenes.slice(0, 4)
    expect(scenePlanSchema.safeParse(plan).success).toBe(false)
  })

  it("rejects an unknown primitive", () => {
    const parsed = primitiveSchema.safeParse({
      type: "hologram",
      delay: 0,
      duration: 400,
    })
    expect(parsed.success).toBe(false)
  })
})

describe("prompt contract", () => {
  it("names every primitive, icon, and domain", () => {
    for (const type of PRIMITIVE_TYPES) expect(SYSTEM_PROMPT).toContain(type)
    for (const icon of ICON_NAMES) expect(SYSTEM_PROMPT).toContain(icon)
    for (const domain of DOMAINS) expect(SYSTEM_PROMPT).toContain(domain.id)
    expect(DISCLAIMER).toMatch(/not financial, legal, or tax advice/)
  })
})

describe("draw progress", () => {
  it("waits, eases, and finishes", () => {
    expect(drawProgress(0, 100, 400)).toBe(0)
    expect(drawProgress(100, 100, 400)).toBe(0)
    const mid = drawProgress(300, 100, 400)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(drawProgress(500, 100, 400)).toBe(1)
    expect(drawProgress(100, 100, 400, true)).toBe(1)
    expect(drawProgress(50, 100, 400, true)).toBe(0)
  })
})

describe("flagship layout", () => {
  it("keeps chalk text from landing on other chalk text", () => {
    const plan = seedById("liquidity-pool")!
    for (const scene of plan.scenes) {
      const boxes = scene.elements.filter((element) => element.type === "text").map(textBox)
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const overlap = intersection(boxes[i], boxes[j])
          expect(overlap, `${scene.id} text overlap`).toBeLessThan(40)
        }
      }
    }
  })
})

function textBox(element: Extract<Primitive, { type: "text" }>) {
  const font = element.size === "xl" ? 76 : element.size === "lg" ? 58 : element.size === "md" ? 44 : 32
  const width = element.text.length * font * 0.48
  const anchor = element.anchor ?? "start"
  const x = anchor === "middle" ? element.x - width / 2 : anchor === "end" ? element.x - width : element.x
  return { x, y: element.y - font * 0.78, w: width, h: font }
}

function intersection(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  const width = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (width <= 0 || height <= 0) return 0
  return width * height
}
