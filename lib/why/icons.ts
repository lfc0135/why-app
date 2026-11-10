import type { IconName } from "@/lib/why/schema"
import { wobbleArc, wobbleCircle, wobbleEllipse, wobbleLine, wobbleRect } from "@/lib/why/geometry"

export function iconStrokes(name: IconName, seed: string): string[] {
  switch (name) {
    case "coin":
      return [
        wobbleCircle(50, 50, 34, `${seed}-o`, 1.5),
        wobbleCircle(50, 50, 22, `${seed}-i`, 1.1),
        wobbleLine(50, 34, 50, 66, `${seed}-s`, 0.7),
        wobbleLine(42, 42, 58, 42, `${seed}-t`, 0.5),
        wobbleLine(42, 58, 58, 58, `${seed}-b`, 0.5),
      ]
    case "wallet":
      return [
        wobbleRect(14, 30, 72, 48, `${seed}-w`, 1.2),
        wobbleLine(14, 46, 86, 46, `${seed}-f`, 0.8),
        wobbleCircle(68, 60, 6, `${seed}-c`, 0.6),
      ]
    case "bank":
      return [
        wobbleLine(16, 40, 50, 16, `${seed}-r1`, 1),
        wobbleLine(50, 16, 84, 40, `${seed}-r2`, 1),
        wobbleLine(16, 40, 84, 40, `${seed}-r3`, 0.8),
        wobbleRect(22, 44, 56, 38, `${seed}-b`, 1),
        wobbleLine(34, 50, 34, 76, `${seed}-c1`, 0.6),
        wobbleLine(50, 50, 50, 76, `${seed}-c2`, 0.6),
        wobbleLine(66, 50, 66, 76, `${seed}-c3`, 0.6),
      ]
    case "chart":
      return [
        wobbleLine(16, 84, 16, 18, `${seed}-y`, 0.8),
        wobbleLine(16, 84, 88, 84, `${seed}-x`, 0.8),
        wobbleLine(24, 68, 40, 58, `${seed}-p1`, 0.8),
        wobbleLine(40, 58, 56, 62, `${seed}-p2`, 0.8),
        wobbleLine(56, 62, 80, 28, `${seed}-p3`, 0.9),
      ]
    case "building":
      return [
        wobbleRect(24, 22, 52, 66, `${seed}-b`, 1.1),
        wobbleRect(34, 34, 12, 12, `${seed}-w1`, 0.6),
        wobbleRect(54, 34, 12, 12, `${seed}-w2`, 0.6),
        wobbleRect(34, 54, 12, 12, `${seed}-w3`, 0.6),
        wobbleRect(54, 54, 12, 12, `${seed}-w4`, 0.6),
        wobbleRect(42, 70, 16, 18, `${seed}-d`, 0.6),
      ]
    case "person":
      return [
        wobbleCircle(50, 26, 14, `${seed}-h`, 1),
        wobbleLine(50, 40, 50, 66, `${seed}-b`, 0.8),
        wobbleLine(28, 52, 72, 52, `${seed}-a`, 0.8),
        wobbleLine(50, 66, 34, 92, `${seed}-l`, 0.8),
        wobbleLine(50, 66, 68, 92, `${seed}-r`, 0.8),
      ]
    case "lock":
      return [
        wobbleArc(50, 42, 18, Math.PI, Math.PI * 2, `${seed}-s`, 1),
        wobbleLine(32, 42, 32, 52, `${seed}-l`, 0.5),
        wobbleLine(68, 42, 68, 52, `${seed}-r`, 0.5),
        wobbleRect(26, 50, 48, 36, `${seed}-b`, 1),
      ]
    case "document":
      return [
        wobbleRect(24, 12, 52, 76, `${seed}-p`, 1),
        wobbleLine(56, 12, 76, 30, `${seed}-f`, 0.7),
        wobbleLine(36, 40, 64, 40, `${seed}-a`, 0.5),
        wobbleLine(36, 52, 64, 52, `${seed}-b`, 0.5),
        wobbleLine(36, 64, 56, 64, `${seed}-c`, 0.5),
      ]
    case "percent":
      return [
        wobbleCircle(32, 32, 12, `${seed}-a`, 0.9),
        wobbleCircle(68, 68, 12, `${seed}-b`, 0.9),
        wobbleLine(72, 24, 28, 78, `${seed}-s`, 0.8),
      ]
    case "globe":
      return [
        wobbleCircle(50, 50, 32, `${seed}-g`, 1.2),
        wobbleEllipse(50, 50, 14, 32, `${seed}-m`, 1),
        wobbleEllipse(50, 50, 32, 12, `${seed}-e`, 0.9),
      ]
    case "shield":
      return [
        wobbleLine(50, 12, 82, 26, `${seed}-a`, 0.8),
        wobbleLine(82, 26, 78, 54, `${seed}-b`, 0.8),
        wobbleLine(78, 54, 50, 90, `${seed}-c`, 0.9),
        wobbleLine(50, 90, 22, 54, `${seed}-d`, 0.9),
        wobbleLine(22, 54, 18, 26, `${seed}-e`, 0.8),
        wobbleLine(18, 26, 50, 12, `${seed}-f`, 0.8),
        wobbleLine(50, 32, 50, 70, `${seed}-g`, 0.6),
      ]
    case "cup":
      return [
        wobbleEllipse(50, 34, 26, 8, `${seed}-r`, 0.8),
        wobbleLine(26, 36, 32, 70, `${seed}-l`, 0.8),
        wobbleLine(74, 36, 68, 70, `${seed}-ri`, 0.8),
        wobbleLine(32, 70, 68, 70, `${seed}-b`, 0.8),
        wobbleLine(74, 46, 86, 46, `${seed}-h1`, 0.6),
        wobbleLine(86, 46, 84, 58, `${seed}-h2`, 0.6),
        wobbleLine(84, 58, 74, 58, `${seed}-h3`, 0.6),
      ]
    case "key":
      return [
        wobbleCircle(34, 40, 16, `${seed}-h`, 1),
        wobbleCircle(34, 40, 6, `${seed}-i`, 0.5),
        wobbleLine(48, 40, 86, 40, `${seed}-s`, 0.7),
        wobbleLine(72, 40, 72, 52, `${seed}-t1`, 0.5),
        wobbleLine(82, 40, 82, 54, `${seed}-t2`, 0.5),
      ]
    case "scales":
      return [
        wobbleLine(50, 18, 50, 86, `${seed}-p`, 0.7),
        wobbleLine(18, 32, 82, 32, `${seed}-b`, 0.8),
        wobbleLine(22, 32, 22, 52, `${seed}-s1`, 0.5),
        wobbleLine(78, 32, 78, 52, `${seed}-s2`, 0.5),
        wobbleArc(22, 58, 14, Math.PI, Math.PI * 2, `${seed}-pan1`, 0.8),
        wobbleArc(78, 58, 14, Math.PI, Math.PI * 2, `${seed}-pan2`, 0.8),
        wobbleLine(38, 86, 62, 86, `${seed}-base`, 0.6),
      ]
    default: {
      const _never: never = name
      return _never
    }
  }
}
