import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { extractTerm } from "@/lib/why/glossary"
import { scriptCacheDir } from "@/lib/why/ledger"
import type { Scene } from "@/lib/why/schema"

export type SavedScript = {
  key: string
  question: string
  model: string
  title: string
  domain: string
  jurisdictionNote?: string
  scenes: Scene[]
  followUps: string[]
  source?: string
  savedAt: string
}

export function scriptCacheKey(input: string): string {
  return extractTerm(input).toLowerCase()
}

export function scriptSlug(key: string): string {
  const slug = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return slug || "term"
}

export async function readCachedScript(key: string): Promise<SavedScript | null> {
  try {
    const raw = await readFile(cacheFile(key), "utf8")
    const parsed = JSON.parse(raw) as SavedScript
    if (parsed.key !== key || !Array.isArray(parsed.scenes) || parsed.scenes.length < 4) return null
    return parsed
  } catch {
    return null
  }
}

export async function writeCachedScript(script: SavedScript): Promise<void> {
  const dest = cacheFile(script.key)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, JSON.stringify(script, null, 2))
}

function cacheFile(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 8)
  return path.join(scriptCacheDir(), `${scriptSlug(key)}-${hash}.json`)
}
