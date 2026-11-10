import { describe, expect, it } from "vitest"
import { extractTerm, planFromGlossary, lookupTerm, plainText, type GlossaryEntry } from "@/lib/why/glossary"
import { refusalFor, topicCaution } from "@/lib/why/guard"
import { explain } from "@/lib/why/explain"
import { scenePlanSchema } from "@/lib/why/schema"

const WORDS = [
  "photosynthesis",
  "nostalgia",
  "gravity",
  "democracy",
  "serendipity",
  "inflation",
  "volcano",
  "empathy",
  "eclipse",
  "algorithm",
  "friendship",
  "earthquake",
  "molecule",
  "renaissance",
  "courage",
] as const

describe("open dictionary", () => {
  it("quotes a supplied definition instead of inventing one", () => {
    const entry: GlossaryEntry = {
      word: "photosynthesis",
      partOfSpeech: "Noun",
      definition:
        "Any process by which plants and other photoautotrophs convert light energy into chemical energy.",
      example: "The leaf uses photosynthesis.",
      related: ["plant", "chlorophyll"],
      sourceName: "Wiktionary",
      sourceUrl: "https://en.wiktionary.org/wiki/photosynthesis",
    }
    const plan = planFromGlossary(entry, "photosynthesis")
    expect(scenePlanSchema.safeParse(plan).success).toBe(true)
    expect(plan.scenes[0].narration).toContain("plants and other photoautotrophs")
    expect(plan.scenes.map((scene) => scene.narration).join(" ")).toContain("light energy")
    expect(plan.scenes.map((scene) => scene.narration).join(" ")).not.toContain("lemonade")
    expect(plan.followUps.some((item) => item.toLowerCase().includes("plant"))).toBe(true)
  })

  it("refuses hateful and explicit requests", async () => {
    expect(refusalFor("xxx")).toBe("explicit")
    expect(refusalFor("kill all of them")).toBe("hate")
    expect(refusalFor("photosynthesis")).toBeNull()
    const events = []
    for await (const event of explain("xxx", { llm: null, lookup: async () => ({ entry: null, suggestions: [] }) })) {
      events.push(event)
    }
    expect(events[0].event).toBe("error")
    if (events[0].event === "error") expect(events[0].data.hint).toBe("refused")
  })

  it("adds a caution for finance, legal, and medical wording", () => {
    expect(topicCaution("inflation and prices")).toMatch(/not financial, legal, tax, or medical advice/)
    expect(topicCaution("a court and a contract")).toMatch(/medical advice/)
    expect(topicCaution("plants convert light")).toBeUndefined()
  })

  it("strips markup out of a dictionary definition", () => {
    expect(plainText("<b>Courage</b> is a &amp; quality.")).toBe("Courage is a & quality.")
  })

  it("treats a question or a short phrase as one concept", () => {
    expect(extractTerm("private credit")).toBe("private credit")
    expect(extractTerm("What is private credit?")).toBe("private credit")
    expect(extractTerm("What's a black hole?")).toBe("black hole")
    expect(extractTerm("the French Revolution")).toBe("French Revolution")
    expect(extractTerm("What is the French Revolution?")).toBe("French Revolution")
    expect(extractTerm("explain supply chain")).toBe("supply chain")
  })
})

describe("multi-word concepts", () => {
  it(
    "quotes a Wikipedia summary for private credit",
    async () => {
      const found = await lookupTerm("What is private credit?")
      expect(found.entry?.sourceName).toBe("Wikipedia")
      expect(found.entry?.word.toLowerCase()).toContain("private credit")
      expect(found.entry?.definition.toLowerCase()).toMatch(/credit|bank|lend|debt|loan/)
      const plan = planFromGlossary(found.entry!, "What is private credit?")
      expect(scenePlanSchema.safeParse(plan).success).toBe(true)
      const spoken = plan.scenes.map((scene) => scene.narration).join(" ")
      const opening = found.entry!.definition.slice(0, 40)
      expect(spoken.includes(opening) || found.entry!.definition.startsWith(plan.scenes[0].narration.replace(/…$/, ""))).toBe(
        true,
      )
      expect(plan.jurisdictionNote).toMatch(/not financial, legal, tax, or medical advice/)
      const events = []
      for await (const event of explain("private credit", { llm: null, lookup: async () => found })) events.push(event)
      const done = events.find((event) => event.event === "done")
      expect(done?.event).toBe("done")
      if (done?.event === "done") {
        expect(done.data.transcript).toContain("Wikipedia")
        expect(done.data.transcript).toContain("wikipedia.org")
      }
    },
    20_000,
  )

  it(
    "resolves other short phrases on Wikipedia",
    async () => {
      for (const phrase of ["carry trade", "black hole", "supply chain", "the French Revolution"]) {
        const found = await lookupTerm(phrase)
        expect(found.entry?.sourceName, phrase).toBe("Wikipedia")
        expect(found.entry!.definition.length, phrase).toBeGreaterThan(40)
        expect(scenePlanSchema.safeParse(planFromGlossary(found.entry!, phrase)).success, phrase).toBe(true)
      }
    },
    30_000,
  )
})

describe("live sources for everyday words", () => {
  it(
    "builds a sourced chalkboard for fifteen words outside the fintech shelf",
    async () => {
      for (const word of WORDS) {
        const found = await lookupTerm(word)
        expect(found.entry, word).not.toBeNull()
        const entry = found.entry!
        expect(entry.definition.length, word).toBeGreaterThan(30)
        expect(entry.sourceName === "Wiktionary" || entry.sourceName === "Wikipedia" || entry.sourceName === "Free Dictionary").toBe(
          true,
        )
        const plan = planFromGlossary(entry, word)
        const parsed = scenePlanSchema.safeParse(plan)
        expect(parsed.success, `${word} ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.message).join("; ")}`).toBe(
          true,
        )
        const hook = plan.scenes[0].narration.replace(/…$/, "")
        const sourceText = entry.definition.replace(/\s+/g, " ")
        expect(sourceText.startsWith(hook) || sourceText.includes(hook.slice(0, 40)), word).toBe(true)
        const events = []
        for await (const event of explain(word, { llm: null, lookup: async () => found })) events.push(event)
        const done = events.find((event) => event.event === "done")
        expect(done?.event).toBe("done")
        if (done?.event === "done") {
          expect(done.data.transcript).toContain(entry.sourceName)
          expect(done.data.transcript).toContain(entry.sourceUrl)
          expect(done.data.source).toContain(entry.sourceName)
        }
      }
    },
    90_000,
  )
})
