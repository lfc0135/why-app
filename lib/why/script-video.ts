import { spawn } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

export type VideoScene = {
  kicker: string
  narration: string
  durationMs: number
}

export async function writeScriptMp4(
  script: { title: string; scenes: VideoScene[] },
  dest: string,
): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), "why-mp4-"))
  const parts: string[] = []
  try {
    for (let index = 0; index < script.scenes.length; index += 1) {
      const scene = script.scenes[index]
      const svg = path.join(dir, `scene-${index}.svg`)
      const clip = path.join(dir, `scene-${index}.mp4`)
      await writeFile(svg, sceneSvg(script.title, scene))
      const seconds = Math.max(0.4, scene.durationMs / 1000)
      await ffmpeg([
        "-y",
        "-loop",
        "1",
        "-i",
        svg,
        "-t",
        seconds.toFixed(3),
        "-r",
        "30",
        "-vf",
        "scale=1280:720,format=yuv420p",
        "-movflags",
        "+faststart",
        clip,
      ])
      parts.push(clip)
    }
    const list = path.join(dir, "list.txt")
    await writeFile(list, parts.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"))
    await ffmpeg(["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", dest])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function sceneSvg(title: string, scene: VideoScene): string {
  const lines = wrap(scene.narration, 46).slice(0, 8)
  const body = lines
    .map(
      (line, index) =>
        `<text x="72" y="${250 + index * 46}" fill="#f6f1e4" font-family="Inter, Noto Sans, sans-serif" font-size="32">${escapeXml(line)}</text>`,
    )
    .join("")
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#14382e"/>
  <rect x="28" y="28" width="1224" height="664" fill="none" stroke="#f6f1e4" stroke-opacity="0.25" stroke-width="3"/>
  <text x="72" y="92" fill="#f3e29a" font-family="Inter, Noto Sans, sans-serif" font-size="22">${escapeXml(scene.kicker.toUpperCase())}</text>
  <text x="72" y="170" fill="#f3e29a" font-family="Inter, Noto Sans, sans-serif" font-size="54">${escapeXml(title.slice(0, 42))}</text>
  ${body}
</svg>`
}

function wrap(text: string, width: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > width && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] })
    let err = ""
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString()
      if (err.length > 4000) err = err.slice(-4000)
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-400)}`))
    })
  })
}
