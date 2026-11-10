import { spentMicro } from "@/lib/why/ledger"
import { llmConfig, streamChat, type LlmConfig } from "@/lib/why/llm"
import { microToUsd } from "@/lib/why/pricing"
import { readCachedScript, scriptCacheKey, writeCachedScript, type SavedScript } from "@/lib/why/script-cache"
import type { Scene } from "@/lib/why/schema"
import { SceneStreamParser } from "@/lib/why/stream"

export async function produceClaudeScript(
  question: string,
  grounding?: string,
  source?: string,
  config?: LlmConfig | null,
): Promise<{ script: SavedScript; fromCache: boolean; costUsd: number }> {
  const key = scriptCacheKey(question)
  const cached = await readCachedScript(key)
  if (cached) return { script: cached, fromCache: true, costUsd: 0 }
  const resolved = config === undefined ? llmConfig() : config
  if (!resolved || resolved.provider !== "anthropic") {
    throw new Error("ANTHROPIC_API_KEY is not set. Export it in the environment. It is not read from the repo.")
  }

  const before = await spentMicro()
  const parser = new SceneStreamParser()
  let title = key
  let domain = "general"
  let jurisdictionNote: string | undefined
  let followUps: string[] = []
  const scenes: Scene[] = []
  for await (const chunk of streamChat(resolved, question, undefined, grounding, key)) {
    for (const parsed of parser.push(chunk)) {
      if (parsed.type === "meta") {
        title = parsed.title
        domain = parsed.domain || "general"
        jurisdictionNote = parsed.jurisdictionNote
      } else if (parsed.type === "followUps") {
        followUps = parsed.followUps
      } else if (parsed.type === "scene") {
        scenes.push(parsed.scene)
      }
    }
  }
  if (scenes.length < 4) {
    throw new Error("Claude did not return a full chalkboard script.")
  }
  const script: SavedScript = {
    key,
    question,
    model: resolved.model,
    title,
    domain,
    jurisdictionNote,
    scenes,
    followUps,
    source,
    savedAt: new Date().toISOString(),
  }
  await writeCachedScript(script)
  const after = await spentMicro()
  return { script, fromCache: false, costUsd: microToUsd(Math.max(0, after - before)) }
}
