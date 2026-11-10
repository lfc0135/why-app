import { ASK, DISCLAIMER, FEATURED_QUESTIONS } from "@/lib/why/content"
import { llmConfig, streamChat, type LlmConfig } from "@/lib/why/llm"
import { buildTranscript, CACHE_SCORE, matchSeed } from "@/lib/why/match"
import { SceneStreamParser } from "@/lib/why/stream"
import type { Scene, ScenePlan } from "@/lib/why/schema"

export type ExplainEvent =
  | {
      event: "meta"
      data: {
        question: string
        title: string
        domain: string
        jurisdictionNote?: string
        fromCache: boolean
        id?: string
      }
    }
  | { event: "scene"; data: Scene & { index: number } }
  | {
      event: "done"
      data: {
        followUps: string[]
        transcript: string
        disclaimer: string
        jurisdictionNote?: string
      }
    }
  | { event: "error"; data: { message: string; suggestions: string[] } }

const suggestions = [...FEATURED_QUESTIONS].slice(0, 3)

export async function* explain(question: string): AsyncGenerator<ExplainEvent> {
  const trimmed = question.trim().replace(/\s+/g, " ")
  if (!trimmed) {
    yield error("Type a question first.", suggestions)
    return
  }
  if (trimmed.length > 240) {
    yield error("Ask it in one short sentence.", suggestions)
    return
  }

  const hit = matchSeed(trimmed)
  if (hit && hit.score >= CACHE_SCORE) {
    yield* fromPlan(hit.plan)
    return
  }

  const config = llmConfig()
  if (config) {
    yield* fromLlm(trimmed, config)
    return
  }

  if (hit) {
    yield* fromPlan(hit.plan)
    return
  }

  yield error(
    "That one is not on the checked shelf yet. Pick a question below, or add an LLM key to sketch new ones.",
    suggestions,
  )
}

async function* fromPlan(plan: ScenePlan): AsyncGenerator<ExplainEvent> {
  yield {
    event: "meta",
    data: {
      question: plan.question,
      title: plan.title,
      domain: plan.domain,
      jurisdictionNote: plan.jurisdictionNote,
      fromCache: true,
      id: plan.id,
    },
  }
  for (let index = 0; index < plan.scenes.length; index += 1) {
    yield { event: "scene", data: { ...plan.scenes[index], index } }
  }
  yield {
    event: "done",
    data: {
      followUps: plan.followUps,
      transcript: buildTranscript(plan.scenes, plan.jurisdictionNote),
      disclaimer: DISCLAIMER,
      jurisdictionNote: plan.jurisdictionNote,
    },
  }
}

async function* fromLlm(question: string, config: LlmConfig): AsyncGenerator<ExplainEvent> {
  const parser = new SceneStreamParser()
  let title = "A quick chalkboard"
  let domain = "general"
  let jurisdictionNote: string | undefined
  let followUps: string[] = []
  const scenes: Scene[] = []
  let metaSent = false

  const emitMeta = function* (): Generator<ExplainEvent> {
    if (metaSent) return
    metaSent = true
    yield {
      event: "meta",
      data: { question, title, domain, jurisdictionNote, fromCache: false },
    }
  }

  try {
    for await (const chunk of streamChat(config, question)) {
      for (const parsed of parser.push(chunk)) {
        if (parsed.type === "meta") {
          title = parsed.title
          domain = parsed.domain || "general"
          jurisdictionNote = parsed.jurisdictionNote
          yield* emitMeta()
        } else if (parsed.type === "followUps") {
          followUps = parsed.followUps
        } else if (parsed.type === "scene") {
          yield* emitMeta()
          scenes.push(parsed.scene)
          yield { event: "scene", data: { ...parsed.scene, index: parsed.index } }
        }
      }
    }
  } catch {
    yield error("The sketching model did not answer. The checked shelf still works.", suggestions)
    return
  }

  if (scenes.length < 4) {
    yield error("I could not finish a full chalkboard for that. Try a checked question.", suggestions)
    return
  }

  const usableFollowUps =
    followUps.length >= 2 ? followUps.slice(0, 3) : [ASK.pool, ASK.holding, ASK.apr]
  yield {
    event: "done",
    data: {
      followUps: usableFollowUps,
      transcript: buildTranscript(scenes, jurisdictionNote),
      disclaimer: DISCLAIMER,
      jurisdictionNote,
    },
  }
}

function error(message: string, items: string[]): ExplainEvent {
  return { event: "error", data: { message, suggestions: items } }
}

export function toSse(events: AsyncGenerator<ExplainEvent>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const item of events) {
          controller.enqueue(
            encoder.encode(`event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`),
          )
        }
      } catch {
        const fallback = error("Something went wrong while sketching.", suggestions)
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify(fallback.data)}\n\n`),
        )
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
