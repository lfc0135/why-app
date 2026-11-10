import { describe, expect, it } from "vitest"
import { SceneStreamParser } from "@/lib/why/stream"
import { explain } from "@/lib/why/explain"
import { DISCLAIMER } from "@/lib/why/content"

const sample = JSON.stringify({
  title: "Test coin",
  domain: "fintech",
  jurisdictionNote: "",
  followUps: ["What is a liquidity pool?", "What is a holding company?"],
  scenes: [
    {
      id: "hook",
      role: "hook",
      kicker: "The idea",
      durationMs: 6000,
      narration: "This is a short spoken line for the parser.",
      caption: "This is a short spoken line for the parser.",
      elements: [{ type: "text", text: "Hello", x: 80, y: 120, size: "md", delay: 0, duration: 400 }],
    },
    {
      id: "takeaway",
      role: "takeaway",
      kicker: "Remember",
      durationMs: 5000,
      narration: "And this is the second scene, still plain.",
      elements: [{ type: "text", text: "Remember", x: 80, y: 180, size: "md", delay: 10, duration: 300 }],
    },
  ],
})

describe("scene stream parser", () => {
  it("emits the first scene before the rest of the JSON arrives", () => {
    const parser = new SceneStreamParser()
    const cut = sample.indexOf('"takeaway"')
    const first = parser.push(sample.slice(0, cut))
    expect(first.some((event) => event.type === "meta")).toBe(true)
    expect(first.filter((event) => event.type === "scene")).toHaveLength(1)
    expect(first.some((event) => event.type === "followUps")).toBe(true)
    const second = parser.push(sample.slice(cut))
    expect(second.filter((event) => event.type === "scene")).toHaveLength(1)
  })

  it("survives small chunks and a markdown fence", () => {
    const parser = new SceneStreamParser()
    const fenced = `\`\`\`json\n${sample}\n\`\`\``
    const events = []
    for (let i = 0; i < fenced.length; i += 17) {
      events.push(...parser.push(fenced.slice(i, i + 17)))
    }
    expect(events.filter((event) => event.type === "scene")).toHaveLength(2)
  })
})

describe("explain stream", () => {
  it("plays the liquidity pool from cache before the done event", async () => {
    const events = []
    for await (const event of explain("What is a liquidity pool?")) events.push(event)
    expect(events[0]).toMatchObject({
      event: "meta",
      data: { fromCache: true, id: "liquidity-pool", title: "Liquidity pool" },
    })
    const sceneAt = events.findIndex((event) => event.event === "scene")
    const doneAt = events.findIndex((event) => event.event === "done")
    expect(sceneAt).toBeGreaterThan(0)
    expect(doneAt).toBeGreaterThan(sceneAt)
    expect(events.filter((event) => event.event === "scene")).toHaveLength(5)
    const done = events.at(-1)
    expect(done?.event).toBe("done")
    if (done?.event === "done") {
      expect(done.data.disclaimer).toBe(DISCLAIMER)
      expect(done.data.followUps).toContain("What is impermanent loss?")
      expect(done.data.transcript.toLowerCase()).toContain("shared pot")
    }
  })

  it("does not invent an explainer when the shelf and the model are both absent", async () => {
    const previous = process.env.LLM_API_KEY
    delete process.env.LLM_API_KEY
    const events = []
    for await (const event of explain("What is photosynthesis?")) events.push(event)
    expect(events).toHaveLength(1)
    expect(events[0].event).toBe("error")
    if (previous) process.env.LLM_API_KEY = previous
  })
})
