export function hashSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rng(seed: string) {
  return mulberry32(hashSeed(seed))
}

export function wobbleLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
  amp = 2.1,
): string {
  const rand = rng(seed)
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const steps = Math.max(2, Math.round(len / 34))
  let d = `M ${x1.toFixed(1)} ${y1.toFixed(1)}`
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const falloff = i === steps ? 0.12 : 1
    const j = (rand() - 0.5) * 2 * amp * falloff
    const x = x1 + dx * t + nx * j
    const y = y1 + dy * t + ny * j
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

export function wobbleCircle(
  cx: number,
  cy: number,
  r: number,
  seed: string,
  amp = 1.6,
): string {
  const rand = rng(seed)
  const steps = 18
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((i % steps) / steps) * Math.PI * 2
    const rr = r + (rand() - 0.5) * 2 * amp
    pts.push([cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr])
  }
  pts[pts.length - 1] = pts[0]
  return polyline(pts, true)
}

export function wobbleEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: string,
  amp = 1.3,
): string {
  const rand = rng(seed)
  const steps = 16
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((i % steps) / steps) * Math.PI * 2
    const jx = (rand() - 0.5) * 2 * amp
    const jy = (rand() - 0.5) * 2 * amp
    pts.push([cx + Math.cos(angle) * rx + jx, cy + Math.sin(angle) * ry + jy])
  }
  pts[pts.length - 1] = pts[0]
  return polyline(pts, true)
}

export function wobbleArc(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  seed: string,
  amp = 1.2,
): string {
  const rand = rng(seed)
  const steps = 12
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const angle = a0 + (a1 - a0) * t
    const rr = r + (rand() - 0.5) * 2 * amp
    pts.push([cx + Math.cos(angle) * rr, cy + Math.sin(angle) * rr])
  }
  return polyline(pts, false)
}

export function wobbleRect(
  x: number,
  y: number,
  w: number,
  h: number,
  seed: string,
  amp = 2,
): string {
  const top = edgePoints(x, y, x + w, y, `${seed}-t`, amp)
  const right = edgePoints(x + w, y, x + w, y + h, `${seed}-r`, amp).slice(1)
  const bottom = edgePoints(x + w, y + h, x, y + h, `${seed}-b`, amp).slice(1)
  const left = edgePoints(x, y + h, x, y, `${seed}-l`, amp).slice(1)
  return polyline([...top, ...right, ...bottom, ...left], true)
}

function edgePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
  amp: number,
): [number, number][] {
  const rand = rng(seed)
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const steps = Math.max(2, Math.round(len / 40))
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const falloff = i === 0 || i === steps ? 0.15 : 1
    const j = (rand() - 0.5) * 2 * amp * falloff
    pts.push([x1 + dx * t + nx * j, y1 + dy * t + ny * j])
  }
  return pts
}

function polyline(pts: [number, number][], close: boolean): string {
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i += 1) {
    d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`
  }
  return close ? `${d} Z` : d
}

export function arrowHead(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
): string[] {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 16
  const spread = 0.55
  const a = angle + Math.PI - spread
  const b = angle + Math.PI + spread
  return [
    wobbleLine(x2, y2, x2 + Math.cos(a) * len, y2 + Math.sin(a) * len, `${seed}-h1`, 0.8),
    wobbleLine(x2, y2, x2 + Math.cos(b) * len, y2 + Math.sin(b) * len, `${seed}-h2`, 0.8),
  ]
}

export function curvedArrow(x1: number, y1: number, x2: number, y2: number, seed: string): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const mx = (x1 + x2) / 2 + (-dy / len) * 42
  const my = (y1 + y2) / 2 + (dx / len) * 42
  const rand = rng(seed)
  const steps = 14
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    const x = u * u * x1 + 2 * u * t * mx + t * t * x2
    const y = u * u * y1 + 2 * u * t * my + t * t * y2
    const j = i === 0 || i === steps ? 0 : (rand() - 0.5) * 2.2
    pts.push([x, y + j])
  }
  return polyline(pts, false)
}

/** Ease-out draw progress for one chalk stroke. Reduced motion snaps on. */
export function drawProgress(
  elapsedMs: number,
  delay: number,
  duration: number,
  reducedMotion = false,
): number {
  if (reducedMotion) return elapsedMs >= delay ? 1 : 0
  if (elapsedMs <= delay) return 0
  const t = Math.min(1, (elapsedMs - delay) / Math.max(1, duration))
  return 1 - (1 - t) ** 3
}

export const CHALK_HEX = {
  white: "#f6f1e4",
  yellow: "#f3e29a",
  blue: "#9fd4e2",
  pink: "#f3c1cf",
  green: "#c6e6b8",
  orange: "#f0c59a",
} as const

export const FONT_PX = {
  sm: 32,
  md: 44,
  lg: 58,
  xl: 76,
} as const
