import { tryScene } from "@/lib/why/repair"
import type { Scene } from "@/lib/why/schema"

export type ParserEvent =
  | { type: "meta"; title: string; domain: string; jurisdictionNote?: string }
  | { type: "scene"; scene: Scene; index: number }
  | { type: "followUps"; followUps: string[] }

/**
 * Pulls a scene plan out of a streaming JSON object.
 * Scenes are emitted as soon as each object in `scenes` is complete,
 * so playback can start before the model finishes.
 */
export class SceneStreamParser {
  private buffer = ""
  private metaSent = false
  private followSent = false
  private consumed = 0
  private produced = 0

  push(chunk: string): ParserEvent[] {
    this.buffer += chunk
    const text = stripFence(this.buffer)
    const events: ParserEvent[] = []

    if (!this.metaSent) {
      const title = readString(text, "title")
      const domain = readString(text, "domain")
      if (title && domain) {
        this.metaSent = true
        const jurisdictionNote = readString(text, "jurisdictionNote")
        events.push({
          type: "meta",
          title,
          domain,
          jurisdictionNote: jurisdictionNote || undefined,
        })
      }
    }

    if (!this.followSent) {
      const followUps = readStringArray(text, "followUps")
      if (followUps && followUps.length >= 2) {
        this.followSent = true
        events.push({ type: "followUps", followUps: followUps.slice(0, 3) })
      }
    }

    const arrayStart = findArrayStart(text, "scenes")
    if (arrayStart >= 0) {
      const objects = completeObjects(text, arrayStart)
      for (let i = this.consumed; i < objects.length; i += 1) {
        this.consumed += 1
        const scene = tryScene(objects[i], this.produced)
        if (!scene) continue
        events.push({ type: "scene", scene, index: this.produced })
        this.produced += 1
      }
    }

    return events
  }

  get sceneCount(): number {
    return this.produced
  }
}

function stripFence(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "")
}

function readString(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`))
  if (!match) return undefined
  try {
    return JSON.parse(`"${match[1]}"`) as string
  } catch {
    return match[1]
  }
}

function readStringArray(text: string, key: string): string[] | undefined {
  const keyAt = findKey(text, key)
  if (keyAt < 0) return undefined
  const bracket = text.indexOf("[", keyAt)
  if (bracket < 0) return undefined
  const end = matchBracket(text, bracket)
  if (end === null) return undefined
  try {
    const parsed = JSON.parse(text.slice(bracket, end)) as unknown
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) return undefined
    return parsed
  } catch {
    return undefined
  }
}

function findArrayStart(text: string, key: string): number {
  const keyAt = findKey(text, key)
  if (keyAt < 0) return -1
  return text.indexOf("[", keyAt)
}

function findKey(text: string, key: string): number {
  const needle = `"${key}"`
  let inString = false
  let escaped = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      if (text.startsWith(needle, i) && /^\s*:/.test(text.slice(i + needle.length))) return i
      inString = true
    }
  }
  return -1
}

function completeObjects(text: string, arrayStart: number): unknown[] {
  const objects: unknown[] = []
  let i = arrayStart + 1
  while (i < text.length) {
    while (i < text.length && /[\s,]/.test(text[i])) i += 1
    if (i >= text.length || text[i] === "]") break
    if (text[i] !== "{") break
    const end = matchBracket(text, i)
    if (end === null) break
    try {
      objects.push(JSON.parse(text.slice(i, end)))
    } catch {
      objects.push(null)
    }
    i = end
  }
  return objects
}

function matchBracket(text: string, start: number): number | null {
  const open = text[start]
  const close = open === "{" ? "}" : "]"
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const char = text[i]
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === "\\") {
        escaped = true
        continue
      }
      if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === "{" || char === "[") depth += 1
    else if (char === "}" || char === "]") {
      depth -= 1
      if (depth === 0 && char === close) return i + 1
    }
  }
  return null
}
