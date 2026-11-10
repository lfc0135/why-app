import { randomUUID } from "node:crypto"
import { mkdir, open, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  costMicroUsd,
  isEfficientModel,
  microToUsd,
  usdToMicro,
  type UsageTokens,
} from "@/lib/why/pricing"

export const HARD_BUDGET_USD = 20
const STALE_RESERVATION_MS = 3 * 60 * 1000

export type BudgetStatus = {
  budgetUsd: number
  hardCapUsd: number
  spentUsd: number
  reservedUsd: number
  remainingUsd: number
  calls: number
  cachedScripts: number
  refusing: boolean
  model: string
  ledgerPath: string
  recent: {
    at: string
    model: string
    term: string
    inputTokens: number
    outputTokens: number
    costUsd: number
    estimated: boolean
  }[]
}

type Reservation = {
  id: string
  at: string
  model: string
  term: string
  maxCostMicro: number
}

type Entry = {
  id: string
  at: string
  model: string
  term: string
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
  costMicro: number
  estimated: boolean
}

type LedgerFile = {
  version: 1
  entries: Entry[]
  reservations: Reservation[]
}

export class BudgetExceededError extends Error {
  readonly code = "budget_exceeded" as const
  constructor(readonly status: BudgetStatus) {
    super(
      `Claude budget reached. Spent $${status.spentUsd.toFixed(6)} of $${status.budgetUsd.toFixed(2)}. Remaining $${status.remainingUsd.toFixed(6)}.`,
    )
    this.name = "BudgetExceededError"
  }
}

export class ClaudeModelError extends Error {
  readonly code = "model_not_allowed" as const
  constructor(model: string) {
    super(
      `Claude model ${model} is outside the Haiku and Sonnet tier. Set LLM_MODEL to claude-haiku-5-5 or claude-sonnet-5-5.`,
    )
    this.name = "ClaudeModelError"
  }
}

export function assertEfficientModel(model: string): void {
  if (!isEfficientModel(model)) throw new ClaudeModelError(model)
}

export function configuredBudgetUsd(): number {
  const raw = process.env.CLAUDE_BUDGET_USD?.trim()
  if (!raw) return HARD_BUDGET_USD
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return HARD_BUDGET_USD
  return Math.min(parsed, HARD_BUDGET_USD)
}

export function configuredRunCapUsd(): number {
  const raw = process.env.CLAUDE_RUN_CAP_USD?.trim()
  const parsed = raw ? Number(raw) : 2
  if (!Number.isFinite(parsed) || parsed <= 0) return 2
  return Math.min(parsed, HARD_BUDGET_USD)
}

export function ledgerPath(): string {
  const override = process.env.CLAUDE_LEDGER_PATH?.trim()
  if (override) return override
  return path.join(process.cwd(), "data", "claude-ledger.json")
}

export function scriptCacheDir(): string {
  const override = process.env.CLAUDE_CACHE_DIR?.trim()
  if (override) return override
  return path.join(process.cwd(), "data", "script-cache")
}

export async function budgetStatus(): Promise<BudgetStatus> {
  return withLock(async () => {
    const ledger = await loadLedger()
    return publicStatus(ledger)
  })
}

export async function spentMicro(): Promise<number> {
  return withLock(async () => {
    const ledger = await loadLedger()
    return ledger.entries.reduce((sum, entry) => sum + entry.costMicro, 0)
  })
}

export async function reserveCall(input: {
  model: string
  term: string
  maxCostMicro: number
}): Promise<{ id: string }> {
  assertEfficientModel(input.model)
  return withLock(async () => {
    const ledger = await loadLedger()
    const status = await publicStatus(ledger)
    const budgetMicro = usdToMicro(status.budgetUsd)
    const used = sumMicro(ledger)
    if (used + input.maxCostMicro > budgetMicro) {
      throw new BudgetExceededError(status)
    }
    const reservation: Reservation = {
      id: randomUUID(),
      at: new Date().toISOString(),
      model: input.model,
      term: input.term.slice(0, 120),
      maxCostMicro: input.maxCostMicro,
    }
    ledger.reservations.push(reservation)
    await persist(ledger)
    return { id: reservation.id }
  })
}

export async function settleCall(id: string, model: string, usage: UsageTokens, estimated: boolean): Promise<number> {
  return withLock(async () => {
    const ledger = await loadLedger()
    const reservation = ledger.reservations.find((item) => item.id === id)
    ledger.reservations = ledger.reservations.filter((item) => item.id !== id)
    const costMicro = costMicroUsd(model, usage)
    ledger.entries.push({
      id,
      at: new Date().toISOString(),
      model,
      term: reservation?.term ?? "",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      cacheReadTokens: usage.cacheReadTokens,
      costMicro,
      estimated,
    })
    await persist(ledger)
    return costMicro
  })
}

export async function releaseCall(id: string): Promise<void> {
  await withLock(async () => {
    const ledger = await loadLedger()
    ledger.reservations = ledger.reservations.filter((item) => item.id !== id)
    await persist(ledger)
  })
}

async function publicStatus(ledger: LedgerFile): Promise<BudgetStatus> {
  const budgetUsd = configuredBudgetUsd()
  const spent = ledger.entries.reduce((sum, entry) => sum + entry.costMicro, 0)
  const reserved = ledger.reservations.reduce((sum, item) => sum + item.maxCostMicro, 0)
  const remaining = Math.max(0, usdToMicro(budgetUsd) - spent - reserved)
  return {
    budgetUsd,
    hardCapUsd: HARD_BUDGET_USD,
    spentUsd: microToUsd(spent),
    reservedUsd: microToUsd(reserved),
    remainingUsd: microToUsd(remaining),
    calls: ledger.entries.length,
    cachedScripts: await countScripts(),
    refusing: remaining <= 0,
    model: process.env.LLM_MODEL?.trim() || "claude-haiku-5-5",
    ledgerPath: ledgerPath(),
    recent: ledger.entries.slice(-8).reverse().map((entry) => ({
      at: entry.at,
      model: entry.model,
      term: entry.term,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      costUsd: microToUsd(entry.costMicro),
      estimated: entry.estimated,
    })),
  }
}

function sumMicro(ledger: LedgerFile): number {
  return (
    ledger.entries.reduce((sum, entry) => sum + entry.costMicro, 0) +
    ledger.reservations.reduce((sum, item) => sum + item.maxCostMicro, 0)
  )
}

async function countScripts(): Promise<number> {
  try {
    const names = await readdir(scriptCacheDir())
    return names.filter((name) => name.endsWith(".json")).length
  } catch {
    return 0
  }
}

async function loadLedger(): Promise<LedgerFile> {
  let ledger: LedgerFile
  try {
    const raw = await readFile(ledgerPath(), "utf8")
    const parsed = JSON.parse(raw) as LedgerFile
    if (parsed.version !== 1 || !Array.isArray(parsed.entries) || !Array.isArray(parsed.reservations)) {
      throw new Error("Claude ledger is not a version 1 file.")
    }
    ledger = parsed
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      ledger = { version: 1, entries: [], reservations: [] }
    } else {
      throw error
    }
  }
  const now = Date.now()
  ledger.reservations = ledger.reservations.filter((item) => now - Date.parse(item.at) < STALE_RESERVATION_MS)
  return ledger
}

async function persist(ledger: LedgerFile): Promise<void> {
  const dest = ledgerPath()
  await mkdir(path.dirname(dest), { recursive: true })
  const tmp = `${dest}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(ledger, null, 2))
  await rename(tmp, dest)
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const lock = `${ledgerPath()}.lock`
  await mkdir(path.dirname(lock), { recursive: true })
  const started = Date.now()
  let handle: Awaited<ReturnType<typeof open>> | undefined
  while (!handle) {
    try {
      handle = await open(lock, "wx")
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      if (Date.now() - started > 8000) throw new Error("Claude ledger is locked.")
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  try {
    return await fn()
  } finally {
    await handle.close()
    await unlink(lock).catch(() => undefined)
  }
}
