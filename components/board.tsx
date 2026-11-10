"use client"

import { useId } from "react"
import { CHALK_HEX, FONT_PX, arrowHead, curvedArrow, drawProgress, wobbleLine, wobbleRect } from "@/lib/why/geometry"
import { iconStrokes } from "@/lib/why/icons"
import type { ChalkColor, Primitive, Scene } from "@/lib/why/schema"

const SLICE_COLORS = ["#f3e29a", "#9fd4e2", "#f3c1cf", "#c6e6b8", "#f0c59a", "#f6f1e4"]

export function Board({
  scene,
  elapsedMs,
  reducedMotion = false,
  message,
}: {
  scene: Scene | null
  elapsedMs: number
  reducedMotion?: boolean
  message?: string
}) {
  const rawId = useId().replace(/:/g, "")
  const narration = scene?.narration ?? message ?? "Ask in plain words."

  return (
    <svg
      viewBox="0 0 1000 562"
      className="block h-full w-full"
      role="img"
      aria-label={narration}
      data-testid="board"
    >
      <title>{narration}</title>
      <defs>
        <radialGradient id={`${rawId}-bg`} cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#1d4a3c" />
          <stop offset="58%" stopColor="#14382e" />
          <stop offset="100%" stopColor="#0c241c" />
        </radialGradient>
        <filter id={`${rawId}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="1000" height="562" fill={`url(#${rawId}-bg)`} />
      <rect width="1000" height="562" filter={`url(#${rawId}-grain)`} opacity="0.16" />
      <rect x="18" y="18" width="964" height="526" fill="none" stroke="rgba(246,241,228,0.18)" strokeWidth="2" />
      {scene ? (
        scene.elements.map((element, index) => (
          <PrimitiveView
            key={`${scene.id}-${index}`}
            element={element}
            progress={drawProgress(elapsedMs, element.delay, element.duration, reducedMotion)}
            seed={`${scene.id}-${index}`}
          />
        ))
      ) : (
        <IdleCopy message={message ?? "Ask in plain words."} />
      )}
    </svg>
  )
}

function IdleCopy({ message }: { message: string }) {
  return (
    <g>
      <text
        x="500"
        y="250"
        textAnchor="middle"
        fill="#f3e29a"
        fontSize="132"
        className="chalk-display"
      >
        ?
      </text>
      <text
        x="500"
        y="360"
        textAnchor="middle"
        fill="#f6f1e4"
        fontSize="36"
        className="chalk-label"
      >
        {message.length > 42 ? "Not on the shelf yet." : message}
      </text>
    </g>
  )
}

function PrimitiveView({
  element,
  progress,
  seed,
}: {
  element: Primitive
  progress: number
  seed: string
}) {
  const color = chalk(elementColor(element))
  if (element.type === "text") {
    const count = Math.ceil(element.text.length * progress)
    return (
      <text
        x={element.x}
        y={element.y}
        textAnchor={element.anchor ?? "start"}
        fill={color}
        fontSize={FONT_PX[element.size]}
        className={element.size === "lg" || element.size === "xl" ? "chalk-display" : "chalk-label"}
        opacity={progress > 0 ? 0.96 : 0}
      >
        {element.text.slice(0, count)}
      </text>
    )
  }

  if (element.type === "box") {
    return (
      <g>
        <ChalkPath d={wobbleRect(element.x, element.y, element.w, element.h, seed)} progress={progress} color={color} />
        {element.label && progress > 0.55 ? (
          <text
            x={element.x + element.w / 2}
            y={element.y + element.h / 2 + 8}
            textAnchor="middle"
            fill={color}
            fontSize={FONT_PX.sm}
            className="chalk-label"
          >
            {element.label}
          </text>
        ) : null}
      </g>
    )
  }

  if (element.type === "line") {
    return (
      <ChalkPath
        d={wobbleLine(element.x1, element.y1, element.x2, element.y2, seed)}
        progress={progress}
        color={color}
      />
    )
  }

  if (element.type === "arrow") {
    const d = element.curved
      ? curvedArrow(element.x1, element.y1, element.x2, element.y2, seed)
      : wobbleLine(element.x1, element.y1, element.x2, element.y2, seed)
    const head = Math.min(1, Math.max(0, (progress - 0.72) / 0.28))
    return (
      <g>
        <ChalkPath d={d} progress={progress} color={color} />
        {arrowHead(element.x1, element.y1, element.x2, element.y2, seed).map((path) => (
          <ChalkPath key={path} d={path} progress={head} color={color} width={3.2} />
        ))}
        {element.label && progress > 0.6 ? (
          <text
            x={(element.x1 + element.x2) / 2}
            y={(element.y1 + element.y2) / 2 - 14}
            textAnchor="middle"
            fill={color}
            fontSize={28}
            className="chalk-label"
          >
            {element.label}
          </text>
        ) : null}
      </g>
    )
  }

  if (element.type === "icon") {
    const strokes = iconStrokes(element.name, seed)
    return (
      <g>
        <g transform={`translate(${element.x - element.size / 2} ${element.y - element.size / 2}) scale(${element.size / 100})`}>
          {strokes.map((path, index) => (
            <ChalkPath
              key={path}
              d={path}
              progress={Math.min(1, Math.max(0, progress * strokes.length - index))}
              color={color}
              width={4.5}
              scaleStroke
            />
          ))}
        </g>
        {element.label && progress > 0.62 ? (
          <text
            x={element.x}
            y={element.y + element.size / 2 + 28}
            textAnchor="middle"
            fill={color}
            fontSize={30}
            className="chalk-label"
          >
            {element.label}
          </text>
        ) : null}
      </g>
    )
  }

  if (element.type === "counter") {
    const value = element.from + (element.to - element.from) * progress
    const decimals = element.decimals ?? 0
    const shown = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value))
    return (
      <g opacity={progress > 0 ? 1 : 0}>
        <text
          x={element.x}
          y={element.y}
          textAnchor="middle"
          fill={color}
          fontSize={FONT_PX[element.size ?? "xl"]}
          className="chalk-display"
        >
          {element.prefix ?? ""}
          {shown}
          {element.suffix ?? ""}
        </text>
        {element.label ? (
          <text
            x={element.x}
            y={element.y + 48}
            textAnchor="middle"
            fill="#f6f1e4"
            fontSize={30}
            className="chalk-label"
          >
            {element.label}
          </text>
        ) : null}
      </g>
    )
  }

  if (element.type === "flow") {
    return <FlowView element={element} progress={progress} color={color} seed={seed} />
  }
  if (element.type === "tree") {
    return <TreeView element={element} progress={progress} color={color} seed={seed} />
  }
  if (element.type === "pie") {
    return <PieView element={element} progress={progress} seed={seed} />
  }
  return <BarsView element={element} progress={progress} seed={seed} />
}

function FlowView({
  element,
  progress,
  color,
  seed,
}: {
  element: Extract<Primitive, { type: "flow" }>
  progress: number
  color: string
  seed: string
}) {
  const gap = Math.abs(element.nodes[1].x - element.nodes[0].x) || 220
  const width = Math.min(190, Math.max(120, gap - 48))
  const height = 84
  const byId = new Map(element.nodes.map((node) => [node.id, node]))
  return (
    <g>
      {element.edges.map((edge) => {
        const from = byId.get(edge.from)
        const to = byId.get(edge.to)
        if (!from || !to) return null
        const x1 = from.x + width / 2
        const x2 = to.x - width / 2
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <ChalkPath d={wobbleLine(x1, from.y, x2, to.y, `${seed}-${edge.from}`)} progress={progress} color={color} />
            {arrowHead(x1, from.y, x2, to.y, `${seed}-${edge.to}`).map((path) => (
              <ChalkPath key={path} d={path} progress={progress} color={color} width={3} />
            ))}
          </g>
        )
      })}
      {element.nodes.map((node) => (
        <g key={node.id}>
          <ChalkPath
            d={wobbleRect(node.x - width / 2, node.y - height / 2, width, height, `${seed}-${node.id}`)}
            progress={progress}
            color={color}
          />
          {progress > 0.4 ? (
            <text
              x={node.x}
              y={node.y + 8}
              textAnchor="middle"
              fill={color}
              fontSize={28}
              className="chalk-label"
            >
              {node.label}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  )
}

function TreeView({
  element,
  progress,
  color,
  seed,
}: {
  element: Extract<Primitive, { type: "tree" }>
  progress: number
  color: string
  seed: string
}) {
  const count = element.children.length
  const spread = Math.min(760, 220 * count)
  const step = count === 1 ? 0 : spread / (count - 1)
  const childW = Math.min(200, step - 24 || 200)
  const rootW = Math.min(280, Math.max(160, element.root.length * 16 + 48))
  const childY = element.y + 168
  return (
    <g>
      {element.children.map((child, index) => {
        const x = element.x - spread / 2 + index * step
        return (
          <g key={child}>
            <ChalkPath
              d={wobbleLine(element.x, element.y + 58, x, childY, `${seed}-l${index}`)}
              progress={progress}
              color={color}
            />
            <ChalkPath
              d={wobbleRect(x - childW / 2, childY, childW, 72, `${seed}-c${index}`)}
              progress={progress}
              color={color}
            />
            {progress > 0.45 ? (
              <text x={x} y={childY + 44} textAnchor="middle" fill={color} fontSize={26} className="chalk-label">
                {child}
              </text>
            ) : null}
          </g>
        )
      })}
      <ChalkPath
        d={wobbleRect(element.x - rootW / 2, element.y, rootW, 64, `${seed}-root`)}
        progress={progress}
        color="#f3e29a"
      />
      {progress > 0.3 ? (
        <text x={element.x} y={element.y + 40} textAnchor="middle" fill="#f3e29a" fontSize={28} className="chalk-label">
          {element.root}
        </text>
      ) : null}
    </g>
  )
}

function PieView({
  element,
  progress,
  seed,
}: {
  element: Extract<Primitive, { type: "pie" }>
  progress: number
  seed: string
}) {
  const total = element.slices.reduce((sum, slice) => sum + slice.value, 0)
  const starts = element.slices.map((_, index) => {
    const before = element.slices.slice(0, index).reduce((sum, slice) => sum + slice.value, 0)
    return -Math.PI / 2 + (before / total) * Math.PI * 2
  })
  return (
    <g>
      {element.slices.map((slice, index) => {
        const fraction = slice.value / total
        const start = starts[index]
        const local = Math.min(1, Math.max(0, progress * element.slices.length - index))
        const end = start + fraction * Math.PI * 2 * local
        const color = SLICE_COLORS[index % SLICE_COLORS.length]
        const percent = Math.round(fraction * 100)
        return (
          <g key={slice.label}>
            <ChalkPath d={wedge(element.cx, element.cy, element.r, start, Math.max(start + 0.02, end))} progress={1} color={color} width={3} />
            {progress > 0.35 ? (
              <text
                x={element.cx + element.r + 36}
                y={element.cy - element.r + 28 + index * 42}
                fill={color}
                fontSize={28}
                className="chalk-label"
              >
                {slice.label} {percent}%
              </text>
            ) : null}
          </g>
        )
      })}
      <circle cx={element.cx} cy={element.cy} r={element.r * 0.42} fill="#14382e" opacity={progress} />
      <text opacity={0} fontSize={0}>
        {seed}
      </text>
    </g>
  )
}

function BarsView({
  element,
  progress,
  seed,
}: {
  element: Extract<Primitive, { type: "bars" }>
  progress: number
  seed: string
}) {
  const max = element.max ?? Math.max(...element.items.map((item) => item.value)) * 1.15
  const baseline = element.y + element.h - 36
  const innerH = element.h - 64
  const gap = element.w / element.items.length
  const barW = Math.min(84, gap * 0.46)
  return (
    <g>
      <ChalkPath
        d={wobbleLine(element.x, baseline, element.x + element.w, baseline, `${seed}-base`, 1.2)}
        progress={progress}
        color="#f6f1e4"
      />
      {element.items.map((item, index) => {
        const height = (item.value / max) * innerH * progress
        const x = element.x + gap * index + gap / 2 - barW / 2
        const color = SLICE_COLORS[index % SLICE_COLORS.length]
        return (
          <g key={item.label}>
            <ChalkPath
              d={wobbleRect(x, baseline - height, barW, Math.max(8, height), `${seed}-b${index}`)}
              progress={1}
              color={color}
            />
            {progress > 0.4 ? (
              <text
                x={x + barW / 2}
                y={baseline + 28}
                textAnchor="middle"
                fill="#f6f1e4"
                fontSize={26}
                className="chalk-label"
              >
                {item.label}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

function wedge(cx: number, cy: number, r: number, start: number, end: number): string {
  const x1 = cx + Math.cos(start) * r
  const y1 = cy + Math.sin(start) * r
  const x2 = cx + Math.cos(end) * r
  const y2 = cy + Math.sin(end) * r
  const large = end - start > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`
}

function ChalkPath({
  d,
  progress,
  color,
  width = 3.4,
  scaleStroke = false,
}: {
  d: string
  progress: number
  color: string
  width?: number
  scaleStroke?: boolean
}) {
  const offset = 1 - Math.max(0, Math.min(1, progress))
  const shared = {
    d,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: offset,
    vectorEffect: scaleStroke ? ("non-scaling-stroke" as const) : undefined,
  }
  return (
    <g opacity={progress > 0.01 ? 1 : 0}>
      <path {...shared} stroke={color} strokeWidth={width + 2.2} opacity={0.2} />
      <path {...shared} stroke={color} strokeWidth={width} />
    </g>
  )
}

function elementColor(element: Primitive): ChalkColor {
  if ("color" in element && element.color) return element.color
  return "white"
}

function chalk(color: ChalkColor): string {
  return CHALK_HEX[color]
}
