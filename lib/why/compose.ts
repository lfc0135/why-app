import type { ChalkColor, IconName, Primitive, Scene, SceneRole } from "@/lib/why/schema"
import { KICKERS } from "@/lib/why/content"

export type Beat =
  | { kind: "title"; text: string; color?: ChalkColor }
  | { kind: "note"; text: string; color?: ChalkColor }
  | { kind: "formula"; text: string }
  | {
      kind: "icons"
      items: { icon: IconName; label?: string; color?: ChalkColor }[]
    }
  | { kind: "flow"; steps: { label: string; color?: ChalkColor }[]; edge?: string }
  | {
      kind: "pair"
      left: string
      right: string
      leftIcon?: IconName
      rightIcon?: IconName
      mark?: string
    }
  | {
      kind: "counters"
      items: {
        to: number
        from?: number
        prefix?: string
        suffix?: string
        label?: string
        decimals?: number
        color?: ChalkColor
      }[]
    }
  | {
      kind: "compare"
      leftTitle: string
      leftBody: string
      rightTitle: string
      rightBody: string
    }
  | { kind: "pie"; slices: { label: string; value: number }[] }
  | { kind: "tree"; root: string; children: string[] }
  | { kind: "bars"; items: { label: string; value: number }[]; max?: number }

const HEIGHT: Record<Beat["kind"], number> = {
  title: 72,
  note: 58,
  formula: 78,
  icons: 148,
  flow: 150,
  pair: 176,
  counters: 132,
  compare: 236,
  pie: 268,
  tree: 236,
  bars: 230,
}

const TOP = 108
const BOTTOM = 524

export function beatsToElements(beats: Beat[], durationMs = 6000): Primitive[] {
  const heights = beats.map((beat) => HEIGHT[beat.kind])
  const total = heights.reduce((sum, height) => sum + height, 0)
  const gapCount = beats.length + 1
  const gap = Math.max(6, (BOTTOM - TOP - total) / gapCount)
  let y = TOP + gap
  const placed: Primitive[] = []
  beats.forEach((beat, index) => {
    placed.push(...renderBeat(beat, y, heights[index]))
    y += heights[index] + gap
  })
  return retime(placed, durationMs)
}

export function retime(elements: Primitive[], durationMs: number): Primitive[] {
  if (elements.length === 0) return elements
  const start = 90
  const end = Math.max(start + 500, durationMs * 0.7)
  const span = end - start
  return elements.map((element, index) => {
    const delay = Math.round(start + (span * index) / elements.length)
    const duration = Math.min(1100, Math.max(280, Math.round(span / Math.max(3, elements.length))))
    return { ...element, delay, duration }
  })
}

function renderBeat(beat: Beat, top: number, height: number): Primitive[] {
  const base = { delay: 0, duration: 600 }
  if (beat.kind === "title" || beat.kind === "note" || beat.kind === "formula") {
    const size = beat.kind === "formula" ? "xl" : textSize(beat.text, beat.kind === "title" ? "lg" : "md")
    const color =
      beat.kind === "formula" ? "yellow" : beat.kind === "note" ? (beat.color ?? "white") : (beat.color ?? "yellow")
    return [
      {
        type: "text",
        text: beat.text,
        x: 500,
        y: top + height * 0.72,
        size,
        anchor: "middle" as const,
        color,
        ...base,
      },
    ]
  }

  if (beat.kind === "icons") {
    const count = beat.items.length
    const size = Math.min(108, height - 36)
    return beat.items.map((item, itemIndex) => ({
      type: "icon" as const,
      name: item.icon,
      x: 500 + (itemIndex - (count - 1) / 2) * 210,
      y: top + height * 0.42,
      size,
      label: item.label,
      color: item.color ?? "white",
      ...base,
    }))
  }

  if (beat.kind === "flow") {
    const count = beat.steps.length
    const boxW = count > 3 ? 150 : 180
    const gap = 78
    const total = count * boxW + (count - 1) * gap
    const start = (1000 - total) / 2
    const y = top + Math.max(8, (height - 96) / 2)
    const nodes = beat.steps.map((step, stepIndex) => ({
      id: `n${stepIndex}`,
      label: step.label,
      x: start + stepIndex * (boxW + gap) + boxW / 2,
      y: y + 48,
    }))
    const edges = nodes.slice(0, -1).map((node, edgeIndex) => ({
      from: node.id,
      to: nodes[edgeIndex + 1].id,
      ...(beat.edge ? { label: beat.edge } : {}),
    }))
    return [
      {
        type: "flow",
        nodes,
        edges,
        color: "white",
        ...base,
      },
    ]
  }

  if (beat.kind === "pair") {
    const y = top + 16
    const elements: Primitive[] = [
      { type: "box", x: 90, y, w: 320, h: height - 20, color: "yellow", ...base },
      { type: "box", x: 590, y, w: 320, h: height - 20, color: "blue", ...base },
      {
        type: "text",
        text: beat.left,
        x: 250,
        y: y + height * 0.62,
        size: "md",
        anchor: "middle",
        color: "yellow",
        ...base,
      },
      {
        type: "text",
        text: beat.right,
        x: 750,
        y: y + height * 0.62,
        size: "md",
        anchor: "middle",
        color: "blue",
        ...base,
      },
    ]
    if (beat.leftIcon) {
      elements.push({
        type: "icon",
        name: beat.leftIcon,
        x: 250,
        y: y + 58,
        size: 64,
        color: "yellow",
        ...base,
      })
    }
    if (beat.rightIcon) {
      elements.push({
        type: "icon",
        name: beat.rightIcon,
        x: 750,
        y: y + 58,
        size: 64,
        color: "blue",
        ...base,
      })
    }
    if (beat.mark) {
      elements.push({
        type: "text",
        text: beat.mark,
        x: 500,
        y: y + height * 0.55,
        size: "lg",
        anchor: "middle",
        color: "white",
        ...base,
      })
    }
    return elements
  }

  if (beat.kind === "counters") {
    const count = beat.items.length
    return beat.items.map((item, itemIndex) => ({
      type: "counter" as const,
      x: 500 + (itemIndex - (count - 1) / 2) * 320,
      y: top + height * 0.55,
      from: item.from ?? 0,
      to: item.to,
      prefix: item.prefix,
      suffix: item.suffix,
      label: item.label,
      decimals: item.decimals,
      size: "xl" as const,
      color: item.color ?? (itemIndex === 0 ? "yellow" : "blue"),
      ...base,
    }))
  }

  if (beat.kind === "compare") {
    const y = top + 8
    const h = height - 12
    return [
      { type: "box", x: 70, y, w: 400, h, ...base },
      { type: "box", x: 530, y, w: 400, h, color: "blue", ...base },
      {
        type: "text",
        text: beat.leftTitle,
        x: 270,
        y: y + 70,
        size: "lg",
        anchor: "middle",
        color: "yellow",
        ...base,
      },
      {
        type: "text",
        text: beat.leftBody,
        x: 270,
        y: y + h * 0.62,
        size: "sm",
        anchor: "middle",
        ...base,
      },
      {
        type: "text",
        text: beat.rightTitle,
        x: 730,
        y: y + 70,
        size: "lg",
        anchor: "middle",
        color: "blue",
        ...base,
      },
      {
        type: "text",
        text: beat.rightBody,
        x: 730,
        y: y + h * 0.62,
        size: "sm",
        anchor: "middle",
        ...base,
      },
    ]
  }

  if (beat.kind === "pie") {
    return [
      {
        type: "pie",
        cx: 300,
        cy: top + height / 2,
        r: Math.min(112, height / 2 - 8),
        slices: beat.slices,
        ...base,
      },
    ]
  }

  if (beat.kind === "tree") {
    return [
      {
        type: "tree",
        root: beat.root,
        children: beat.children,
        x: 500,
        y: top + 10,
        ...base,
      },
    ]
  }

  return [
    {
      type: "bars",
      x: 160,
      y: top + 8,
      w: 680,
      h: height - 16,
      items: beat.items,
      max: beat.max,
      ...base,
    },
  ]
}

function textSize(text: string, prefer: "lg" | "md"): "sm" | "md" | "lg" | "xl" {
  if (text.length <= 22 && prefer === "lg") return "lg"
  if (text.length <= 36) return "md"
  return "sm"
}

export function makeScene(input: {
  id: string
  role: SceneRole
  narration: string
  durationMs: number
  beats: Beat[]
  kicker?: string
}): Scene {
  return {
    id: input.id,
    role: input.role,
    kicker: input.kicker ?? KICKERS[input.role],
    durationMs: input.durationMs,
    narration: input.narration,
    caption: input.narration,
    elements: beatsToElements(input.beats, input.durationMs),
  }
}
