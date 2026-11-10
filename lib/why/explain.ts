import { ASK, DISCLAIMER, FEATURED_QUESTIONS } from "@/lib/why/content"
import { lookupTerm, planFromGlossary, sourceLine, type LookupResult } from "@/lib/why/glossary"
import { refusalFor } from "@/lib/why/guard"
import { BudgetExceededError } from "@/lib/why/ledger"
import { llmConfig, streamChat, type LlmConfig } from "@/lib/why/llm"
import { buildTranscript, CACHE_SCORE, matchSeed } from "@/lib/why/match"
import { readCachedScript, scriptCacheKey, writeCachedScript, type SavedScript } from "@/lib/why/script-cache"
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
        cache?: "script"
        id?: string
        source?: string
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
        source?: string
      }
    }
  | { event: "error"; data: { message: string; suggestions: string[]; hint?: "spelling" | "refused" | "invalid" } }

export type ExplainDeps = {
  lookup?: (question: string) => Promise<LookupResult>
  llm?: LlmConfig | null
}

const suggestions = [...FEATURED_QUESTIONS].slice(0, 3)

export async function* explain(question: string, deps?: ExplainDeps): AsyncGenerator<ExplainEvent> {
  const trimmed = question.trim().replace(/\s+/g, " ")
  if (!trimmed) {
    yield error("Type a question first.", suggestions, "invalid")
    return
  }
  if (trimmed.length > 240) {
    yield error("Ask it in one short sentence.", suggestions, "invalid")
    return
  }
  if (refusalFor(trimmed)) {
    yield error("I won't draw that. Try a different word.", [], "refused")
    return
  }

  const hit = matchSeed(trimmed)
  if (hit && hit.score >= CACHE_SCORE) {
    yield* fromPlan(hit.plan)
    return
  }

  const lookup = deps?.lookup ?? lookupTerm
  const found = await lookup(trimmed)
  const config = deps && "llm" in deps ? deps.llm : llmConfig()

  if (config) {
    yield* fromLlm(trimmed, config, found)
    return
  }

  if (hit) {
    yield* fromPlan(hit.plan)
    return
  }

  if (found.entry) {
    const plan = planFromGlossary(found.entry, trimmed)
    yield* fromPlan(plan, sourceLine(found.entry))
    return
  }

  yield error(
    found.suggestions.length
      ? `I couldn't find “${trimmed}” in the dictionary or encyclopedia.`
      : `I couldn't find “${trimmed}”. Check the spelling, or try another word.`,
    found.suggestions,
    "spelling",
  )
}

async function* fromPlan(plan: ScenePlan, source?: string): AsyncGenerator<ExplainEvent> {
  yield {
    event: "meta",
    data: {
      question: plan.question,
      title: plan.title,
      domain: plan.domain,
      jurisdictionNote: plan.jurisdictionNote,
      fromCache: !source,
      id: plan.id,
      source,
    },
  }
  for (let index = 0; index < plan.scenes.length; index += 1) {
    yield { event: "scene", data: { ...plan.scenes[index], index } }
  }
  const spoken = buildTranscript(plan.scenes, plan.jurisdictionNote)
  yield {
    event: "done",
    data: {
      followUps: plan.followUps,
      transcript: source ? `${spoken} Source: ${source}.` : spoken,
      disclaimer: plan.jurisdictionNote ?? DISCLAIMER,
      jurisdictionNote: plan.jurisdictionNote,
      source,
    },
  }
}

async function* fromLlm(question: string, config: LlmConfig, found?: LookupResult): AsyncGenerator<ExplainEvent> {
  if (config.provider === "anthropic") {
    const saved = await readCachedScript(scriptCacheKey(question))
    if (saved) {
      yield* fromSaved(saved)
      return
    }
  }
  const grounding = found?.entry
    ? `Source: ${sourceLine(found.entry)}\nDefinition: ${found.entry.definition}\nExample: ${found.entry.example ?? "none given"}`
    : found?.suggestions.length
      ? `No dictionary entry. Possible spellings: ${found.suggestions.join(", ")}. Do not pretend a spelling you were not given.`
      : "No dictionary entry was found. Only say what you are sure of, and say when you are not."
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
    for await (const chunk of streamChat(config, question, undefined, grounding, scriptCacheKey(question))) {
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
  } catch (err) {
    if (!metaSent && found?.entry) {
      yield* fromPlan(planFromGlossary(found.entry, question), sourceLine(found.entry))
      return
    }
    if (err instanceof BudgetExceededError) {
      yield error(
        `Claude is paused. The $${err.status.budgetUsd.toFixed(2)} budget is used up.`,
        suggestions,
      )
      return
    }
    yield error("The sketching model did not answer. A dictionary chalk drawing may still work.", suggestions)
    return
  }

  if (scenes.length < 4) {
    if (!metaSent && found?.entry) {
      yield* fromPlan(planFromGlossary(found.entry, question), sourceLine(found.entry))
      return
    }
    yield error("I could not finish a full chalkboard for that.", suggestions)
    return
  }

  const usableFollowUps =
    followUps.length >= 2 ? followUps.slice(0, 3) : [ASK.pool, ASK.holding, ASK.apr]
  const source = found?.entry ? sourceLine(found.entry) : undefined
  if (config.provider === "anthropic" && scenes.length >= 4) {
    await writeCachedScript({
      key: scriptCacheKey(question),
      question,
      model: config.model,
      title,
      domain,
      jurisdictionNote,
      scenes,
      followUps: usableFollowUps,
      source,
      savedAt: new Date().toISOString(),
    })
  }
  const spoken = buildTranscript(scenes, jurisdictionNote)
  yield {
    event: "done",
    data: {
      followUps: usableFollowUps,
      transcript: source ? `${spoken} Source: ${source}.` : spoken,
      disclaimer: jurisdictionNote ?? DISCLAIMER,
      jurisdictionNote,
      source,
    },
  }
}

async function* fromSaved(script: SavedScript): AsyncGenerator<ExplainEvent> {
  yield {
    event: "meta",
    data: {
      question: script.question,
      title: script.title,
      domain: script.domain,
      jurisdictionNote: script.jurisdictionNote,
      fromCache: true,
      cache: "script",
      source: script.source,
    },
  }
  for (let index = 0; index < script.scenes.length; index += 1) {
    yield { event: "scene", data: { ...script.scenes[index], index } }
  }
  const spoken = buildTranscript(script.scenes, script.jurisdictionNote)
  yield {
    event: "done",
    data: {
      followUps: script.followUps,
      transcript: script.source ? `${spoken} Source: ${script.source}.` : spoken,
      disclaimer: script.jurisdictionNote ?? DISCLAIMER,
      jurisdictionNote: script.jurisdictionNote,
      source: script.source,
    },
  }
}

function error(
  message: string,
  items: string[],
  hint?: "spelling" | "refused" | "invalid",
): ExplainEvent {
  return { event: "error", data: { message, suggestions: items, hint } }
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
