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
    case "sun":
      return [
        wobbleCircle(50, 50, 16, `${seed}-c`, 1),
        wobbleLine(50, 14, 50, 26, `${seed}-u`, 0.6),
        wobbleLine(50, 74, 50, 86, `${seed}-d`, 0.6),
        wobbleLine(14, 50, 26, 50, `${seed}-l`, 0.6),
        wobbleLine(74, 50, 86, 50, `${seed}-r`, 0.6),
        wobbleLine(24, 24, 34, 34, `${seed}-a`, 0.5),
        wobbleLine(66, 66, 76, 76, `${seed}-b`, 0.5),
        wobbleLine(76, 24, 66, 34, `${seed}-e`, 0.5),
        wobbleLine(34, 66, 24, 76, `${seed}-f`, 0.5),
      ]
    case "leaf":
      return [
        wobbleEllipse(50, 48, 22, 30, `${seed}-e`, 1),
        wobbleLine(50, 78, 50, 22, `${seed}-v`, 0.7),
        wobbleLine(50, 48, 32, 36, `${seed}-l`, 0.5),
        wobbleLine(50, 48, 68, 36, `${seed}-r`, 0.5),
      ]
    case "drop":
      return [
        wobbleArc(50, 54, 22, Math.PI * 0.15, Math.PI * 0.85, `${seed}-b`, 1),
        wobbleLine(30, 48, 50, 16, `${seed}-l`, 0.8),
        wobbleLine(70, 48, 50, 16, `${seed}-r`, 0.8),
      ]
    case "heart":
      return [
        wobbleArc(36, 40, 14, Math.PI, Math.PI * 2.15, `${seed}-l`, 0.8),
        wobbleArc(64, 40, 14, Math.PI * 0.85, Math.PI * 2, `${seed}-r`, 0.8),
        wobbleLine(22, 44, 50, 80, `${seed}-a`, 0.8),
        wobbleLine(78, 44, 50, 80, `${seed}-b`, 0.8),
      ]
    case "book":
      return [
        wobbleRect(18, 22, 64, 56, `${seed}-p`, 1),
        wobbleLine(50, 22, 50, 78, `${seed}-s`, 0.6),
        wobbleLine(28, 38, 42, 38, `${seed}-l`, 0.4),
        wobbleLine(58, 38, 74, 38, `${seed}-r`, 0.4),
      ]
    case "clock":
      return [
        wobbleCircle(50, 50, 30, `${seed}-c`, 1),
        wobbleLine(50, 50, 50, 28, `${seed}-h`, 0.6),
        wobbleLine(50, 50, 68, 58, `${seed}-m`, 0.6),
      ]
    case "mountain":
      return [
        wobbleLine(10, 78, 38, 28, `${seed}-a`, 0.8),
        wobbleLine(38, 28, 62, 78, `${seed}-b`, 0.8),
        wobbleLine(46, 78, 70, 40, `${seed}-c`, 0.8),
        wobbleLine(70, 40, 92, 78, `${seed}-d`, 0.8),
      ]
    case "flame":
      return [
        wobbleLine(50, 86, 28, 48, `${seed}-l`, 0.9),
        wobbleLine(28, 48, 50, 12, `${seed}-t`, 0.9),
        wobbleLine(50, 12, 74, 50, `${seed}-r`, 0.9),
        wobbleLine(74, 50, 50, 86, `${seed}-b`, 0.9),
        wobbleLine(50, 78, 42, 52, `${seed}-i`, 0.6),
      ]
    case "cloud":
      return [
        wobbleCircle(38, 58, 16, `${seed}-a`, 0.8),
        wobbleCircle(58, 50, 18, `${seed}-b`, 0.8),
        wobbleCircle(74, 60, 12, `${seed}-c`, 0.7),
        wobbleLine(24, 68, 84, 68, `${seed}-d`, 0.6),
      ]
    case "star":
      return [
        wobbleLine(50, 14, 58, 40, `${seed}-a`, 0.6),
        wobbleLine(58, 40, 86, 42, `${seed}-b`, 0.6),
        wobbleLine(86, 42, 64, 58, `${seed}-c`, 0.6),
        wobbleLine(64, 58, 72, 86, `${seed}-d`, 0.6),
        wobbleLine(72, 86, 50, 68, `${seed}-e`, 0.6),
        wobbleLine(50, 68, 28, 86, `${seed}-f`, 0.6),
        wobbleLine(28, 86, 36, 58, `${seed}-g`, 0.6),
        wobbleLine(36, 58, 14, 42, `${seed}-h`, 0.6),
        wobbleLine(14, 42, 42, 40, `${seed}-i`, 0.6),
        wobbleLine(42, 40, 50, 14, `${seed}-j`, 0.6),
      ]
    case "brain":
      return [
        wobbleEllipse(50, 50, 26, 28, `${seed}-o`, 1),
        wobbleLine(50, 26, 50, 76, `${seed}-m`, 0.6),
        wobbleLine(30, 42, 48, 48, `${seed}-a`, 0.5),
        wobbleLine(52, 40, 72, 46, `${seed}-b`, 0.5),
        wobbleLine(32, 60, 48, 58, `${seed}-c`, 0.5),
      ]
    case "eye":
      return [
        wobbleEllipse(50, 50, 32, 16, `${seed}-e`, 0.9),
        wobbleCircle(50, 50, 8, `${seed}-p`, 0.6),
      ]
    case "house":
      return [
        wobbleLine(18, 48, 50, 18, `${seed}-r1`, 0.8),
        wobbleLine(50, 18, 82, 48, `${seed}-r2`, 0.8),
        wobbleRect(28, 48, 44, 34, `${seed}-b`, 0.9),
        wobbleRect(44, 62, 12, 20, `${seed}-d`, 0.5),
      ]
    case "flower":
      return [
        wobbleCircle(50, 50, 8, `${seed}-c`, 0.6),
        wobbleCircle(50, 28, 10, `${seed}-u`, 0.6),
        wobbleCircle(50, 72, 10, `${seed}-d`, 0.6),
        wobbleCircle(28, 50, 10, `${seed}-l`, 0.6),
        wobbleCircle(72, 50, 10, `${seed}-r`, 0.6),
      ]
    case "bolt":
      return [
        wobbleLine(58, 12, 32, 48, `${seed}-a`, 0.7),
        wobbleLine(32, 48, 52, 48, `${seed}-b`, 0.6),
        wobbleLine(52, 48, 36, 88, `${seed}-c`, 0.7),
      ]
    case "wave":
      return [
        wobbleLine(12, 40, 30, 28, `${seed}-a`, 0.7),
        wobbleLine(30, 28, 50, 48, `${seed}-b`, 0.7),
        wobbleLine(50, 48, 70, 28, `${seed}-c`, 0.7),
        wobbleLine(70, 28, 88, 44, `${seed}-d`, 0.7),
        wobbleLine(12, 64, 30, 52, `${seed}-e`, 0.6),
        wobbleLine(30, 52, 50, 72, `${seed}-f`, 0.6),
        wobbleLine(50, 72, 70, 52, `${seed}-g`, 0.6),
        wobbleLine(70, 52, 88, 66, `${seed}-h`, 0.6),
      ]
    default: {
      const _never: never = name
      return _never
    }
  }
}
