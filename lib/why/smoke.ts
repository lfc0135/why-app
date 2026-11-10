import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { produceClaudeScript } from "@/lib/why/claude-script"
import { lookupTerm, sourceLine, type LookupResult } from "@/lib/why/glossary"
import { BudgetExceededError, budgetStatus, configuredRunCapUsd } from "@/lib/why/ledger"
import { llmConfig, previewMaxCostMicro, type LlmConfig } from "@/lib/why/llm"
import { microToUsd, usdToMicro } from "@/lib/why/pricing"
import { readCachedScript, scriptCacheKey, scriptSlug } from "@/lib/why/script-cache"
import { writeScriptMp4 } from "@/lib/why/script-video"

export type SmokeTermResult = {
  term: string
  fromCache: boolean
  costUsd: number
  scriptPath: string
  videoPath?: string
}

export type SmokeReport = {
  terms: SmokeTermResult[]
  stopped: string | null
  runSpentUsd: number
  lifetimeSpentUsd: number
  remainingUsd: number
  budgetUsd: number
  runCapUsd: number
}

export async function runSmoke(
  terms: string[],
  options?: {
    outDir?: string
    runCapUsd?: number
    renderVideo?: boolean
    lookup?: (question: string) => Promise<LookupResult>
    config?: LlmConfig | null
  },
): Promise<SmokeReport> {
  const lookup = options?.lookup ?? lookupTerm
  const renderVideo = options?.renderVideo ?? true
  const outDir = options?.outDir ?? path.join(process.cwd(), "artifacts", "smoke")
  const runCapUsd = options?.runCapUsd ?? configuredRunCapUsd()
  const runCapMicro = usdToMicro(runCapUsd)
  const config = options?.config === undefined ? llmConfig() : options.config
  await mkdir(outDir, { recursive: true })

  const results: SmokeTermResult[] = []
  let stopped: string | null = null
  let runSpentMicro = 0

  for (const term of terms) {
    const trimmed = term.trim()
    if (!trimmed) continue
    const cached = await readCachedScript(scriptCacheKey(trimmed))
    if (!cached) {
      if (!config || config.provider !== "anthropic") {
        stopped = "ANTHROPIC_API_KEY is not set"
        break
      }
      const estimate = previewMaxCostMicro(config, trimmed)
      if (runSpentMicro + estimate > runCapMicro) {
        stopped = `run cap $${formatUsd(runCapUsd)}`
        break
      }
    }
    let found: LookupResult = { entry: null, suggestions: [] }
    if (!cached) {
      try {
        found = await lookup(trimmed)
      } catch {
        found = { entry: null, suggestions: [] }
      }
    }
    const grounding = found.entry
      ? `Source: ${sourceLine(found.entry)}\nDefinition: ${found.entry.definition}`
      : undefined
    try {
      const produced = await produceClaudeScript(trimmed, grounding, found.entry ? sourceLine(found.entry) : undefined, config)
      runSpentMicro += usdToMicro(produced.costUsd)
      const base = path.join(outDir, scriptSlug(produced.script.key))
      const scriptPath = `${base}.json`
      await writeFile(scriptPath, JSON.stringify(produced.script, null, 2))
      let videoPath: string | undefined
      if (renderVideo) {
        videoPath = `${base}.mp4`
        await writeScriptMp4(
          {
            title: produced.script.title,
            scenes: produced.script.scenes.map((scene) => ({
              kicker: scene.kicker,
              narration: scene.narration,
              durationMs: scene.durationMs,
            })),
          },
          videoPath,
        )
      }
      results.push({
        term: trimmed,
        fromCache: produced.fromCache,
        costUsd: produced.costUsd,
        scriptPath,
        videoPath,
      })
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        stopped = `lifetime budget $${formatUsd(error.status.budgetUsd)}`
        break
      }
      throw error
    }
  }

  const status = await budgetStatus()
  return {
    terms: results,
    stopped,
    runSpentUsd: microToUsd(runSpentMicro),
    lifetimeSpentUsd: status.spentUsd,
    remainingUsd: status.remainingUsd,
    budgetUsd: status.budgetUsd,
    runCapUsd,
  }
}

export function formatUsd(usd: number): string {
  if (usd >= 1) return usd.toFixed(2)
  return usd.toFixed(6)
}

export function formatSmokeReport(report: SmokeReport): string {
  const lines = [
    "Claude smoke",
    `  budget     $${formatUsd(report.budgetUsd)}`,
    `  run cap    $${formatUsd(report.runCapUsd)}`,
  ]
  for (const term of report.terms) {
    const how = term.fromCache ? "cached" : "claude"
    const video = term.videoPath ? `  ${term.videoPath}` : ""
    lines.push(`  ${how.padEnd(6)} $${term.costUsd.toFixed(6)}  ${term.term}  ${term.scriptPath}${video}`)
  }
  if (report.stopped) lines.push(`stopped: ${report.stopped}`)
  lines.push(`this run   $${report.runSpentUsd.toFixed(6)}`)
  lines.push(`lifetime   $${report.lifetimeSpentUsd.toFixed(6)}`)
  lines.push(`remaining  $${report.remainingUsd.toFixed(6)}`)
  return lines.join("\n")
}
