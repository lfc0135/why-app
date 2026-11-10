import { sceneSchema, type Scene } from "@/lib/why/schema"

const ROLES: Record<string, Scene["role"]> = {
  hook: "hook",
  intro: "hook",
  definition: "hook",
  analogy: "analogy",
  mechanism: "mechanism",
  example: "example",
  takeaway: "takeaway",
  summary: "takeaway",
}

export function tryScene(raw: unknown, index: number): Scene | null {
  const repaired = repairScene(raw, index)
  const parsed = sceneSchema.safeParse(repaired)
  return parsed.success ? parsed.data : null
}

export function repairScene(raw: unknown, index: number): unknown {
  if (!raw || typeof raw !== "object") return raw
  const scene = { ...(raw as Record<string, unknown>) }
  const role = typeof scene.role === "string" ? ROLES[scene.role] : undefined
  scene.role = role ?? "mechanism"
  scene.id = typeof scene.id === "string" && scene.id.trim() ? scene.id.slice(0, 40) : `scene-${index + 1}`
  scene.kicker =
    typeof scene.kicker === "string" && scene.kicker.trim()
      ? scene.kicker.slice(0, 32)
      : scene.role
  const narration = clip(scene.narration, 320)
  scene.narration = narration || "Here is the plain version."
  const caption = clip(scene.caption, 320)
  scene.caption = caption || scene.narration
  scene.durationMs = clamp(num(scene.durationMs, 6000), 4000, 10000)
  const elements = Array.isArray(scene.elements) ? scene.elements : []
  scene.elements = elements
    .slice(0, 16)
    .map((element, elementIndex) => repairElement(element, elementIndex))
    .filter((element) => element !== null)
  return scene
}

function repairElement(raw: unknown, index: number): unknown | null {
  if (!raw || typeof raw !== "object") return null
  const element = { ...(raw as Record<string, unknown>) }
  if (typeof element.type !== "string") return null
  element.delay = clamp(num(element.delay, index * 280), 0, 9000)
  element.duration = clamp(num(element.duration, 700), 200, 8000)
  for (const key of ["x", "x1", "x2", "cx", "w"] as const) {
    if (key in element) element[key] = clamp(num(element[key], key === "w" ? 160 : 80), 0, 1000)
  }
  for (const key of ["y", "y1", "y2", "cy", "h"] as const) {
    if (key in element) element[key] = clamp(num(element[key], key === "h" ? 90 : 80), 0, 562)
  }
  if (element.type === "text") {
    element.text = clip(element.text, 72)
    if (!element.text) return null
    element.size = ["sm", "md", "lg", "xl"].includes(String(element.size)) ? element.size : "md"
    if (element.anchor && !["start", "middle", "end"].includes(String(element.anchor))) {
      delete element.anchor
    }
  }
  if (element.type === "icon") {
    element.size = clamp(num(element.size, 72), 28, 180)
  }
  if (element.type === "pie" && "r" in element) {
    element.r = clamp(num(element.r, 90), 48, 170)
  }
  if (element.type === "counter") {
    const from = num(element.from, 0)
    element.from = from
    element.to = num(element.to, from)
  }
  return element
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

function num(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
